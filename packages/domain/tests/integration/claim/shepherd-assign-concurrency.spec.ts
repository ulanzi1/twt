// Shepherd assignment CONCURRENCY — true two-connection races (Story 6.12, Review Finding).
//
// The sequential shepherd-assign.spec proves latest-wins BEHAVIOUR on a single connection. This spec
// proves the level the review flagged as unverified: ACTUAL multi-connection race behaviour — that the
// (pariwarId, claimCaseId)-scoped advisory lock `reassignShepherd`/`assignShepherd` take fully SERIALIZES
// genuinely concurrent reassignment attempts, so the partial-unique `(claim_case_id) WHERE superseded_at
// IS NULL` invariant (AC5/AC9 — at most ONE live shepherd, ever) holds even under real concurrent load:
// exactly one live row survives, the full supersession chain is traceable, and NO attempt errors.
//
// Why `ShepherdReassignmentConflictError` is NOT observed here: the advisory lock is held for the writer's
// ENTIRE read-live → atomically-supersede → insert sequence, so a genuinely concurrent second caller
// BLOCKS until the first COMMITs, then re-reads the live row FRESH (under READ COMMITTED) — it always sees
// the winner's just-committed row, so its own conditional UPDATE always matches 1 row, never 0. The 0-row
// conflict branch is a defense-in-depth backstop for the partial-unique constraint, not a path reachable
// through concurrent calls to the public reassignShepherd entry point (mirrors the nominee-bank/
// ground-inspection concurrency specs' own framing — the lock serializes, no writer ever errors).
//
// ⚠ Own-committing (NOT setupLiveDb): a real race needs REAL concurrent COMMITs on SEPARATE pool clients.
// Cleanup is by the specific claim ids this suite creates — [[project_live_db_test_gotchas]].

import { randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { setPariwarScope } from '../../../src/db.js';
import { claimId as toClaimId, memberId as toMemberId, pariwarId as toPariwarId } from '../../../src/ids/index.js';
import type { ClaimId, MemberId } from '../../../src/ids/index.js';
import { assignShepherd, projectClaimState, reassignShepherd } from '../../../src/claim/index.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);
// A DEDICATED pariwarId (NOT the shared `_helpers.ts` PARIWAR_A) — this spec seeds real, COMMITTED
// district_admin role_grants at (pariwarId, DISTRICT), which would otherwise leak into the sequential
// shepherd-assign.spec.ts's candidate-pool queries when both files run concurrently (own-committing,
// no per-test ROLLBACK).
const PARIWAR_A = toPariwarId('c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c0c0c0');
const DISTRICT = 'Jaipur';
const TIMEOUT = 20_000;

// Deterministic distinct actor ids — one per concurrent reassign attempt (tag embedded in the id itself
// so the surviving row's writer is unambiguous, mirroring nominee-bank-concurrency's tag convention).
const N = 5;
const TARGETS = Array.from({ length: N }, (_, i) => `6${i}6${i}6${i}6${i}-6${i}6${i}-6${i}6${i}-6${i}6${i}-6${i}6${i}6${i}6${i}6${i}6${i}`);
const FIRST_SHEPHERD = 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a0a0a0';

describe.skipIf(!hasDatabase)('shepherd reassignment — two-connection concurrency (own-committing)', () => {
  let pool: pg.Pool;
  const createdClaims: string[] = [];
  const seededUsers: string[] = [FIRST_SHEPHERD, ...TARGETS];

  async function onOwnTx<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SET LOCAL ROLE twt_app');
      await setPariwarScope(client, PARIWAR_A);
      const out = await fn(client);
      await client.query('COMMIT');
      return out;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  }

  /** A stable, purely-numeric E.164 tail derived from `id` (a UUID may contain hex letters a-f, which
   *  would violate the users.contact_phone_e164_check DB constraint — Review Finding). */
  function e164PhoneFor(id: string): string {
    const digitsOnly = id.replace(/\D/g, '').padEnd(4, '0').slice(0, 4);
    return `+91900000${digitsOnly}`;
  }

  async function seedUser(id: string, displayName: string): Promise<void> {
    await pool.query(
      `INSERT INTO users (id, identity_type, status, display_name, contact_phone)
       VALUES ($1, 'admin', 'active', $2, $3)`,
      [id, displayName, e164PhoneFor(id)],
    );
  }

  /** The AUTO path's candidate resolver (`resolveShepherdCandidates`) reads `role_grants`, so only the
   *  ONE admin meant to win the initial auto-assign gets a `district_admin` grant here — the N reassign
   *  TARGETS are plain `users` rows (the domain `reassignShepherd` writer takes an already-resolved
   *  target and does not itself re-check role_grants; that scope check lives at the API layer). */
  async function seedAdmin(id: string, displayName: string): Promise<void> {
    await seedUser(id, displayName);
    await pool.query(
      `INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value)
       VALUES ($1, $2, 'district_admin', 'district', $3)`,
      [id, PARIWAR_A, DISTRICT],
    );
  }

  async function seedClaimInVerification(): Promise<{ claimCaseId: ClaimId; deceasedMemberId: MemberId }> {
    const cid = toClaimId(randomUUID());
    const mid: MemberId = toMemberId(randomUUID());
    createdClaims.push(cid);
    await onOwnTx(async (client) => {
      const emit = (from: string | null, to: string, eventType: string, extra: Record<string, unknown> = {}) =>
        projectClaimState(client, {
          claimCaseId: cid,
          pariwarId: PARIWAR_A,
          deceasedMemberId: mid,
          intakeChannels: ['member_app'],
          claimantActorId: null,
          eventType: eventType as never,
          payload: { from_state: from, to_state: to, trigger: 'test', actor: 'system', ...extra },
          actorId: null,
        });
      await emit(null, 'intake_pending', 'claim.intake_initiated', {
        deceased_member_id: mid,
        intake_channel: 'member_app',
        claimant_actor_id: null,
      });
      await emit('intake_pending', 'intake_converged', 'claim.intake_converged');
      await emit('intake_converged', 'documents_pending', 'claim.documents_received');
      await emit('documents_pending', 'verification_in_progress', 'claim.peer_mesh_pinged', {
        selected_member_ids: [randomUUID()],
        metric_id: 'district_cohort_v1',
        metric_version: 1,
      });
    });
    return { claimCaseId: cid, deceasedMemberId: mid };
  }

  async function countRows(sql: string, params: unknown[]): Promise<number> {
    const r = await pool.query(sql, params);
    return Number((r.rows[0] as { n: string }).n);
  }

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 16, ssl: false, connectionTimeoutMillis: 5000 });
    pool.on('error', (err) => console.error('[shepherd-assign-concurrency.spec] idle client error:', err.message));
    if (hasDatabase) {
      await seedAdmin(FIRST_SHEPHERD, 'First Shepherd');
      for (const [i, id] of TARGETS.entries()) {
        await seedUser(id, `Target ${i}`);
      }
    }
  });

  afterAll(async () => {
    if (createdClaims.length > 0) {
      await pool
        .query('DELETE FROM claims WHERE claim_case_id = ANY($1)', [createdClaims])
        .catch((e: Error) => console.error('[shepherd-assign-concurrency.spec] claims cleanup:', e.message));
      const c = await pool.connect();
      try {
        await c.query('BEGIN');
        await c.query("SET LOCAL session_replication_role = 'replica'");
        await c.query('DELETE FROM events_log WHERE stream_id = ANY($1)', [createdClaims]);
        await c.query('COMMIT');
      } catch (e) {
        await c.query('ROLLBACK').catch(() => undefined);
        console.error('[shepherd-assign-concurrency.spec] events_log cleanup:', (e as Error).message);
      } finally {
        c.release();
      }
    }
    if (seededUsers.length > 0) {
      await pool
        .query('DELETE FROM users WHERE id = ANY($1)', [seededUsers])
        .catch((e: Error) => console.error('[shepherd-assign-concurrency.spec] users cleanup:', e.message));
    }
    await pool.end();
  });

  it(
    'N concurrent reassignments on ONE claim → the advisory lock serializes them; exactly one live row survives, no writer errors',
    async () => {
      const { claimCaseId } = await seedClaimInVerification();
      await onOwnTx((client) =>
        assignShepherd(client, { claimCaseId, pariwarId: PARIWAR_A, district: DISTRICT }),
      );
      const initialRows = (
        await pool.query(
          'SELECT shepherd_actor_id FROM claim_shepherd_assignments WHERE claim_case_id = $1 AND superseded_at IS NULL',
          [claimCaseId],
        )
      ).rows as Array<{ shepherd_actor_id: string }>;
      expect(initialRows[0]?.shepherd_actor_id).toBe(FIRST_SHEPHERD);

      const results = await Promise.allSettled(
        TARGETS.map((targetId, i) =>
          onOwnTx((client) =>
            reassignShepherd(client, {
              claimCaseId,
              pariwarId: PARIWAR_A,
              district: DISTRICT,
              targetShepherdActorId: targetId,
              targetDisplay: `Target ${i}`,
              targetContactPhone: '+91900000' + targetId.slice(-4),
              targetContactWhatsapp: null,
              assignmentReason: 'reassignment',
              actor: 'operator',
              actorId: FIRST_SHEPHERD,
            }),
          ),
        ),
      );

      // Every attempt SUCCEEDS — the advisory lock serializes them; each re-reads the live row fresh
      // under lock, so none hits a 0-row conditional-UPDATE conflict.
      const rejected = results.flatMap((r) => (r.status === 'rejected' ? [r.reason] : []));
      expect(rejected).toEqual([]);

      // Exactly ONE live row remains (the last committer's) — the partial-unique invariant (AC5/AC9)
      // holds under real concurrency.
      expect(
        await countRows(
          'SELECT count(*)::text AS n FROM claim_shepherd_assignments WHERE claim_case_id = $1 AND superseded_at IS NULL',
          [claimCaseId],
        ),
      ).toBe(1);

      // The full chain is traceable: 1 initial + N reassignments, ALL superseded except the live one.
      expect(
        await countRows('SELECT count(*)::text AS n FROM claim_shepherd_assignments WHERE claim_case_id = $1', [
          claimCaseId,
        ]),
      ).toBe(1 + N);
      expect(
        await countRows(
          'SELECT count(*)::text AS n FROM claim_shepherd_assignments WHERE claim_case_id = $1 AND superseded_at IS NOT NULL',
          [claimCaseId],
        ),
      ).toBe(N);

      // One claim.shepherd_assigned event per successful (re)assignment (1 initial + N reassignments).
      expect(
        await countRows(
          "SELECT count(*)::text AS n FROM events_log WHERE stream_id = $1 AND event_type = 'claim.shepherd_assigned'",
          [claimCaseId],
        ),
      ).toBe(1 + N);

      // The final live row's shepherd is one of the N racing targets (whichever acquired the lock last).
      const finalLive = (
        await pool.query(
          'SELECT shepherd_actor_id FROM claim_shepherd_assignments WHERE claim_case_id = $1 AND superseded_at IS NULL',
          [claimCaseId],
        )
      ).rows as Array<{ shepherd_actor_id: string }>;
      expect(TARGETS).toContain(finalLive[0]!.shepherd_actor_id);
    },
    TIMEOUT,
  );

  it(
    'N concurrent AUTO-assign redeliveries on a FRESH claim (pg-boss at-least-once) → the advisory lock ' +
      'serializes them; exactly one live row + one event; every attempt succeeds (no raw unique-violation)',
    async () => {
      const { claimCaseId } = await seedClaimInVerification();

      // Simulates N concurrent pg-boss redeliveries of the SAME CLAIM_SHEPHERD_ASSIGN job for a claim that
      // has NO shepherd yet (Review Finding — only sequential idempotency was previously proven; this
      // proves the SAME advisory lock that serializes reassignment also serializes the auto path under
      // genuine concurrent load, so a real at-least-once redelivery race never surfaces the raw 23505
      // unique-violation the pre-write check exists to prevent).
      const results = await Promise.allSettled(
        Array.from({ length: N }, () =>
          onOwnTx((client) => assignShepherd(client, { claimCaseId, pariwarId: PARIWAR_A, district: DISTRICT })),
        ),
      );

      const rejected = results.flatMap((r) => (r.status === 'rejected' ? [r.reason] : []));
      expect(rejected).toEqual([]);

      const fulfilled = results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));
      // Exactly ONE call actually wrote (idempotentNoop: false); every other call saw the pre-write
      // check find the just-committed row and no-op'd — never a second event, never a second row.
      expect(fulfilled.filter((r) => !r.idempotentNoop)).toHaveLength(1);
      expect(fulfilled.filter((r) => r.idempotentNoop)).toHaveLength(N - 1);
      expect(fulfilled.every((r) => r.assignment.shepherdActorId === FIRST_SHEPHERD)).toBe(true);

      expect(
        await countRows(
          'SELECT count(*)::text AS n FROM claim_shepherd_assignments WHERE claim_case_id = $1 AND superseded_at IS NULL',
          [claimCaseId],
        ),
      ).toBe(1);
      expect(
        await countRows(
          "SELECT count(*)::text AS n FROM events_log WHERE stream_id = $1 AND event_type = 'claim.shepherd_assigned'",
          [claimCaseId],
        ),
      ).toBe(1);
    },
    TIMEOUT,
  );
});
