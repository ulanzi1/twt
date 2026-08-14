// RTBF CONCURRENCY — a true two-connection race on the member erasure path (Story 10.21, AC13).
//
// ⛔ WHAT THIS EXISTS TO DISPROVE. Before Story 10.21 the erasure path claimed protection it did not
// have. `rtbf/handlers.ts` caught `err.code === '23505'` and mapped it to a clean 409 — but
// `projectMemberState` wraps the violation in `MemberStreamConcurrencyError`, which carries NO `code`
// property, so the branch could never match. And under READ COMMITTED the loser usually never reaches
// 23505 at all: it blocks on the winner's row locks inside `anonymizeMember`, then `projectMemberState`
// re-reads the stream head AFTER the winner commits, computes a valid `nextVersion`, and appends a
// SECOND `member.rtbf_anonymized` — returning 200. The live failure mode was a DUPLICATE EVENT.
//
// ⭐ THE FIX IS THE ADVISORY LOCK, AND THIS FILE IS THE PROOF. Both erasure callers now take
// `pg_advisory_xact_lock(rtbfAdvisoryLockKey(pariwarId, memberId))` BEFORE the legality read. This spec
// drives the caller sequence directly on TWO SEPARATE POOL CLIENTS and asserts: exactly one erasure
// commits, exactly one `member.rtbf_anonymized` event exists, and the loser observes the member already
// terminal (which is what the handler maps onto the shipped 409 `rtbf.already_anonymized`).
//
// ⚠ THE TEST MUST BE ABLE TO FAIL, AND THIS IS THE HARD PART. Two concurrent calls that merely start at
// "the same time" serialize BY CHANCE and pass with or without the lock — the vacuity this AC exists to
// prevent. So the race is FORCED: the winner's transaction is held open past the point where the loser
// has already attempted its lock acquisition, and only then committed. Without the lock the loser would
// proceed on stale state and append a second event; with it, the loser blocks until the winner commits
// and then sees the true terminal state.
//
// ⚠ Own-committing (NOT setupLiveDb): a real race needs REAL concurrent COMMITs on SEPARATE pool
// clients. Cleanup is by the specific ids this suite creates ([[project_live_db_test_gotchas]]).

import { randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { setPariwarScope } from '../../../src/db.js';
import { memberId as toMemberId, pariwarId as toPariwarId } from '../../../src/ids/index.js';
import type { MemberId } from '../../../src/ids/index.js';
import { projectMemberState } from '../../../src/member/project.js';
import { rtbfAdvisoryLockKey } from '../../../src/member/rtbf-legality.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);
const PARIWAR = toPariwarId('ab11ab11-ab11-ab11-ab11-ab11ab11ab11');
const TIMEOUT = 20_000;

describe.skipIf(!hasDatabase)('RTBF — two-connection erasure race (own-committing)', () => {
  let pool: pg.Pool;
  const createdMembers: string[] = [];

  beforeAll(() => {
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 6 });
  });

  afterAll(async () => {
    if (createdMembers.length > 0) {
      const client = await pool.connect();
      try {
        // `events_log` is append-only (the AR-8 trigger) and `members.state` is projector-only — both
        // trigger-enforced, so a plain DELETE is refused even as the owner. `session_replication_role
        // = 'replica'` sheds the triggers for this test-only purge; it is the shipped idiom
        // (`alert-stream-concurrency.spec.ts`, `flag-flip-concurrency.spec.ts`).
        // ⛔ Delete ONLY the ids this suite created — never a truncate, never a DROP SCHEMA
        // ([[project_live_db_test_gotchas]]).
        await client.query('BEGIN');
        await client.query("SET LOCAL session_replication_role = 'replica'");
        await client.query('DELETE FROM events_log WHERE stream_id = ANY($1::uuid[])', [createdMembers]);
        await client.query('DELETE FROM members WHERE member_id = ANY($1::uuid[])', [createdMembers]);
        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK').catch(() => undefined);
        console.error('[rtbf-concurrency.spec] cleanup:', (e as Error).message);
      } finally {
        client.release();
      }
    }
    await pool.end();
  });

  /** Seed a `withdrawn` member — the lifecycle route on which erasure is legal. */
  async function seedWithdrawnMember(): Promise<MemberId> {
    const memberId = toMemberId(randomUUID());
    createdMembers.push(memberId);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SET LOCAL ROLE twt_app');
      await setPariwarScope(client, PARIWAR);
      // ⛔ The projector is the ONLY writer of `members.state` and `events_log` is append-only — BOTH
      // enforced by DB triggers. Hand-rolled INSERT/UPDATE SQL is rejected at the database, which is
      // why this seed drives the real `projectMemberState` rather than writing rows directly. That
      // also makes the fixture faithful: the race runs against the same writer the handlers use.
      // ⚠ The FULL lifecycle chain, not a shortcut. `member.withdrawal_completed` is IDENTITY from
      // `pending-kyc` (it is legal only from active / active-in-grace / lapsed-unpaid), so a two-event
      // seed leaves the member at `pending-kyc` and the fixture silently tests the wrong thing.
      const chain: { eventType: string; payload: Record<string, unknown> }[] = [
        { eventType: 'member.signup_initiated', payload: { from_state: null, to_state: 'pending-kyc', trigger: 'seed', actor: 'system' } },
        { eventType: 'member.kyc_completed', payload: { from_state: 'pending-kyc', to_state: 'pending-fee', trigger: 'seed', actor: 'system' } },
        { eventType: 'member.vyawastha_shulk_paid', payload: { from_state: 'pending-fee', to_state: 'lock-in', trigger: 'seed', actor: 'system', utr: 'SEED', amount_inr: 1 } },
        { eventType: 'member.lock_in_expired', payload: { from_state: 'lock-in', to_state: 'active', trigger: 'seed', actor: 'system', kyc_verified: true } },
        { eventType: 'member.withdrawal_completed', payload: { from_state: 'active', to_state: 'withdrawn', trigger: 'seed', actor: 'member' } },
      ];
      for (const step of chain) {
        await projectMemberState(client, {
          memberId,
          pariwarId: PARIWAR,
          eventType: step.eventType as never,
          payload: step.payload as never,
          actorId: null,
        });
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
    return memberId;
  }

  /** Open a scoped transaction on its OWN client and return it (caller commits/rolls back). */
  async function beginScoped(): Promise<pg.PoolClient> {
    const client = await pool.connect();
    await client.query('BEGIN');
    await client.query('SET LOCAL ROLE twt_app');
    await setPariwarScope(client, PARIWAR);
    return client;
  }

  /** The caller sequence, in the order both shipped handlers use it: LOCK → read → write → append. */
  async function takeLock(client: pg.PoolClient, memberId: MemberId): Promise<void> {
    await client.query('SELECT pg_advisory_xact_lock($1)', [
      rtbfAdvisoryLockKey(PARIWAR, memberId).toString(),
    ]);
  }

  async function readState(client: pg.PoolClient, memberId: MemberId): Promise<string> {
    const { rows } = await client.query<{ state: string }>(
      'SELECT state FROM members WHERE member_id = $1',
      [memberId],
    );
    return rows[0]!.state;
  }

  /** The erasure's state-moving half, through the REAL projector (the part a duplicate double-appends). */
  async function eraseAndAppend(client: pg.PoolClient, memberId: MemberId, fromState: string): Promise<void> {
    await projectMemberState(client, {
      memberId,
      pariwarId: PARIWAR,
      eventType: 'member.rtbf_anonymized',
      payload: {
        from_state: fromState as never,
        to_state: 'anonymized',
        trigger: 'rtbf_request',
        actor: 'member',
      },
      actorId: null,
    });
  }

  it(
    '⭐ FORCED RACE: exactly ONE erasure commits and exactly ONE rtbf event exists',
    async () => {
      const memberId = await seedWithdrawnMember();

      const winner = await beginScoped();
      const loser = await beginScoped();
      try {
        // Winner takes the lock and does its work, but does NOT commit yet.
        await takeLock(winner, memberId);
        const winnerState = await readState(winner, memberId);
        expect(winnerState).toBe('withdrawn');
        await eraseAndAppend(winner, memberId, winnerState);

        // ⭐ THE FORCED INTERLEAVE. The loser attempts the SAME lock while the winner still holds it.
        // ⛔ This promise must NOT be awaited yet — that would deadlock the test rather than race it.
        // Without the lock, this call would return immediately, the loser would read the STALE
        // 'withdrawn' state, and append a second event. With the lock, it cannot proceed until commit.
        let loserAcquired = false;
        const loserLock = takeLock(loser, memberId).then(() => {
          loserAcquired = true;
        });

        // Give the loser a real opportunity to acquire. If the lock were absent or session-scoped on
        // the wrong client, it WOULD acquire here — so this is the assertion that can fail.
        await new Promise((r) => setTimeout(r, 250));
        expect(
          loserAcquired,
          'the loser acquired the advisory lock while the winner held it — the lock is not serializing',
        ).toBe(false);

        await winner.query('COMMIT');
        await loserLock; // now it acquires
        expect(loserAcquired).toBe(true);

        // ⭐ The loser now reads the TRUE post-commit state and must refuse. This is exactly what the
        // handlers map onto the shipped 409 `rtbf.already_anonymized` — ⛔ NOT an idempotent 200.
        const loserState = await readState(loser, memberId);
        expect(loserState).toBe('anonymized');
        await loser.query('COMMIT');
      } finally {
        await winner.query('ROLLBACK').catch(() => undefined);
        await loser.query('ROLLBACK').catch(() => undefined);
        winner.release();
        loser.release();
      }

      // ⭐ THE INVARIANT: one write, ONE event. A duplicate here is the exact live failure mode the
      // inert 23505 catch left open.
      const check = await pool.connect();
      try {
        const { rows } = await check.query<{ n: string }>(
          `SELECT count(*)::text AS n FROM events_log
           WHERE stream_id = $1 AND event_type = 'member.rtbf_anonymized'`,
          [memberId],
        );
        expect(rows[0]?.n).toBe('1');
        const { rows: state } = await check.query<{ state: string }>(
          'SELECT state FROM members WHERE member_id = $1',
          [memberId],
        );
        expect(state[0]?.state).toBe('anonymized');
      } finally {
        check.release();
      }
    },
    TIMEOUT,
  );

  it('the lock key is NAMESPACED — it does not collide with a bare member-id hash', () => {
    // ⛔ A bare `hashtext(member_id)` collides with the device-binding lock in
    // `auth/member/member-auth.service.ts` — a different subsystem sharing one key space. Two
    // subsystems locking the same key would deadlock or serialize unrelated work.
    const memberId = toMemberId('cc33cc33-cc33-cc33-cc33-cc33cc33cc33');
    const other = toMemberId('dd44dd44-dd44-dd44-dd44-dd44dd44dd44');

    // Distinct members → distinct keys.
    expect(rtbfAdvisoryLockKey(PARIWAR, memberId)).not.toBe(rtbfAdvisoryLockKey(PARIWAR, other));
    // Same member in a different Pariwar → a distinct key (the key is tenant-qualified).
    expect(rtbfAdvisoryLockKey(PARIWAR, memberId)).not.toBe(
      rtbfAdvisoryLockKey(toPariwarId('ef11ef11-ef11-ef11-ef11-ef11ef11ef11'), memberId),
    );
    // Deterministic — the same inputs must always yield the same lock.
    expect(rtbfAdvisoryLockKey(PARIWAR, memberId)).toBe(rtbfAdvisoryLockKey(PARIWAR, memberId));
  });
});
