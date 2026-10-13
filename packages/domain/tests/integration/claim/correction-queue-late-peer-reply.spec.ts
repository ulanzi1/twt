// Story 6.27b (Task 2; AC5; PM10; `-303` Q2 A, `-279` A4, `-324` A; BF13) — the District Admin's correction queue lists
// a claim a NEIGHBOUR answered after their approval, in SEPARATE COMMITTED TRANSACTIONS.
//
// ⚠⚠ WHY OWN-COMMITTING ([[project_db_clock_ordering_tests_tie]]): inside one BEGIN/ROLLBACK every `now()` is the
// transaction START, so the approval's `decided_at` and an answer's `saved_at` (`clock_timestamp()`) are ordered by
// CONSTRUCTION. Every step below runs on its own pooled connection — the `correction-queue-late-inspection.spec.ts`
// construction — under a FRESH Pariwar per test; the answers go through the REAL writer (`_peer-reply-fixtures.ts`).
//
// ⚠ A candidate with ⛔ uncovered key is DROPPED on the normal path, so "⛔ a candidate" (a) is asserted on the FAULT
// path (the late-arm read forced to fail ⇒ every candidate lists as "may wait"), beside a CONTROL that IS one.
//
// The legs: (a) answered THEN approved ⇒ ⛔ candidate; (b) approved THEN answered ⇒ listed + the final vote waits;
// (c) an EDIT after the approval of an answer covered at it ⇒ listed; (c′) `not_died` after the approval, then edited
// to `died` ⇒ ⛔ listed; (d) BF13 — a certificate re-review from EQUAL to differing, then a re-determination ⇒ listed
// through arm (1); (e) leg (b) on an R9-routed `state_trustee_approved` claim ⇒ listed; (e′) its routing superseded ⇒
// ⛔ listed.
//
// Cleanup: every row of this suite's Pariwars, table by table, in replica mode — fixture cleanup ONLY.

import { randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { addCalendarDays } from '../../../src/cycle-calendar/holiday-resolver.js';
import { bindScopedDb, setPariwarScope } from '../../../src/db.js';
import {
  LateWarningReasonRequiredError,
  adjudicateClaim,
  listClaimsUnderCorrection,
  readClaimApprovalWarnings,
  routeToR9,
  voteOnFrozenClaim,
} from '../../../src/claim/index.js';
import { claimId as toClaimId, pariwarId as toPariwarId } from '../../../src/ids/index.js';
import type { ClaimId, PariwarId } from '../../../src/ids/index.js';
import {
  driveClaimTo,
  fixtureCurrentAcceptedDate,
  seedAcceptedDeathCertificate,
  seedClauseVersion,
  seedGroundInspection,
  seedNomineeDetermination,
  seedNomineeNameCheck,
  seedRoleGrant,
} from '../_helpers.js';
import { attachTextedPings, liveAnswerId, savePeerFixtureAnswer, type TextedPing } from './_peer-reply-fixtures.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);
const TIMEOUT = 60_000;
const DA = 'd7d7d7d7-0000-4000-8000-000000000001';
const PA = 'a7a7a7a7-0000-4000-8000-000000000002';
const R9_CLAUSE = 'niy.special-death.r9';
const GENERIC = 'warnings_reviewed';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe.skipIf(!hasDatabase)('Story 6.27b — the queue lists a claim a neighbour answered AFTER its approval (own-committing)', () => {
  let pool: pg.Pool;
  const pariwars: string[] = [];

  beforeAll(() => {
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 6, ssl: false, connectionTimeoutMillis: 5000 });
  });

  afterAll(async () => {
    if (pariwars.length > 0) {
      const c = await pool.connect();
      try {
        await c.query('BEGIN');
        await c.query("SET LOCAL session_replication_role = 'replica'");
        const { rows } = await c.query<{ table_name: string }>(
          `SELECT c.table_name FROM information_schema.columns c
             JOIN information_schema.tables t ON t.table_schema = c.table_schema AND t.table_name = c.table_name
            WHERE c.table_schema = 'public' AND c.column_name = 'pariwar_id' AND t.table_type = 'BASE TABLE'`,
        );
        for (const { table_name } of rows) {
          await c.query(`DELETE FROM "${table_name}" WHERE pariwar_id::text = ANY($1)`, [pariwars]);
        }
        await c.query('COMMIT');
      } catch (e) {
        await c.query('ROLLBACK').catch(() => undefined);
        console.error('[correction-queue-late-peer-reply.spec] cleanup:', (e as Error).message);
      } finally {
        c.release();
      }
    }
    await pool.end();
  });

  function freshPariwar(): PariwarId {
    const pid = toPariwarId(randomUUID());
    pariwars.push(pid);
    return pid;
  }

  /** `fn` on its own pooled connection, in its OWN committed transaction — as `twt_app` under `pid`, or the superuser. */
  async function onOwnTx<T>(pid: PariwarId, fn: (client: pg.PoolClient) => Promise<T>, superuser = false): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      if (!superuser) {
        await client.query('SET LOCAL ROLE twt_app');
        await setPariwarScope(client, pid);
      }
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

  interface World {
    pid: PariwarId;
    cid: ClaimId;
    ping: TextedPing;
  }

  /** tx1 — an approvable claim in `verifier_review` (the default fixtures), COMMITTED; tx2 — ONE texted neighbour. */
  async function world(pid: PariwarId, opts: { inspection?: 'skip' } = {}): Promise<World> {
    const cid = toClaimId(randomUUID());
    const mid = randomUUID();
    await onOwnTx(pid, async (c) => {
      await driveClaimTo(c, pid, cid, mid, 'verifier_review');
      await seedNomineeNameCheck(c, pid, cid, opts.inspection ? { inspection: opts.inspection } : {});
    });
    const [ping] = await onOwnTx(pid, (c) => attachTextedPings(c, pid, cid, mid, 1), true);
    return { pid, cid, ping: ping! };
  }

  const approve = (w: World, warningReasonCode: string | null = null) =>
    onOwnTx(w.pid, (c) =>
      adjudicateClaim(c, {
        claimCaseId: w.cid, pariwarId: w.pid, outcome: 'approved', reasonCode: 'r5_d_natural_death', rationaleCiphertext: 'enc:v1:why',
        warningReasonCode, actorId: DA, actorDisplay: 'Anita (District Admin)', actor: 'operator',
      }),
    );
  /** ONE answer, COMMITTED in its own transaction. */
  const answer = (w: World, key: string, value: { codes: string[] } | { date: string }) =>
    onOwnTx(w.pid, (c) => savePeerFixtureAnswer(c, w.pid, w.ping, key, value));
  const acceptedDate = (w: World) => onOwnTx(w.pid, async (c) => (await fixtureCurrentAcceptedDate(c, w.pid, w.cid))!);
  const list = (pid: PariwarId) => onOwnTx(pid, (c) => listClaimsUnderCorrection(bindScopedDb(c), pid));
  const peerKeysOf = (w: World) =>
    onOwnTx(w.pid, async (c) => (await readClaimApprovalWarnings(bindScopedDb(c), w.pid, w.cid)).keys.filter((k) => k.startsWith('peer_')));

  /** The queue on its FAULT path: the late-arm statement gets its UUID parameters corrupted ⇒ every candidate "may wait". */
  async function listOnFault(pid: PariwarId) {
    let told = 0;
    const rows = await onOwnTx(pid, async (c) => {
      const realQuery = c.query.bind(c) as (...a: unknown[]) => unknown;
      const textOf = (q: unknown) => (typeof q === 'string' ? q : ((q as { text?: string })?.text ?? ''));
      c.query = ((...a: unknown[]) => {
        if (!textOf(a[0]).includes('discarded_member_version_ids')) return realQuery(...a);
        const params = Array.isArray(a[1]) ? a[1].map((v) => (typeof v === 'string' && UUID_RE.test(v) ? 'not-a-uuid' : v)) : a[1];
        return realQuery(a[0], params);
      }) as never;
      try {
        return await listClaimsUnderCorrection(bindScopedDb(c), pid, { onLateWarningsUnavailable: () => (told += 1) });
      } finally {
        c.query = realQuery as never;
      }
    });
    return { rows, told };
  }

  /** The final vote WAITS (`LateWarningReasonRequiredError`) — in its own transaction, rolled back. */
  async function finalVoteWaits(w: World): Promise<void> {
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      await c.query('SET LOCAL ROLE twt_app');
      await setPariwarScope(c, w.pid);
      await expect(
        voteOnFrozenClaim(c, {
          claimCaseId: w.cid, pariwarId: w.pid, outcome: 'approved', reasonCode: null, rationaleCiphertext: 'enc:v1:final-why',
          warningReasonCode: GENERIC, actorId: PA, actorDisplay: 'Pariwar Admin', actor: 'trustee',
        }),
      ).rejects.toBeInstanceOf(LateWarningReasonRequiredError);
    } finally {
      await c.query('ROLLBACK').catch(() => undefined);
      c.release();
    }
  }

  it('(a) answered, COMMITTED, THEN approved, COMMITTED ⇒ ⛔ a late-warning candidate (the FAULT path, with a control that IS one)', { timeout: TIMEOUT }, async () => {
    const pid = freshPariwar();
    const before = await world(pid);
    await answer(before, 'has_died', { codes: ['not_died'] });
    await approve(before, GENERIC);
    const control = await world(pid);
    await approve(control);
    await answer(control, 'has_died', { codes: ['not_died'] });

    const { rows, told } = await listOnFault(pid);
    expect(told).toBe(1);
    expect(rows.map((r) => r.claimCaseId)).toEqual([control.cid]);
    expect(rows[0]).toMatchObject({ lateWarningAwaitingReason: true, lateWarningUncoveredCount: null });
    expect((await list(pid)).map((r) => r.claimCaseId)).toEqual([control.cid]);
  });

  it('(b) approved, COMMITTED, THEN `not_died` / a differing date, COMMITTED ⇒ listed, and the final vote waits', { timeout: TIMEOUT }, async () => {
    const pid = freshPariwar();
    const notDied = await world(pid);
    await approve(notDied);
    await answer(notDied, 'has_died', { codes: ['not_died'] });
    const dated = await world(pid);
    await approve(dated);
    await answer(dated, 'has_died', { codes: ['died'] });
    await answer(dated, 'death_date', { date: addCalendarDays(await acceptedDate(dated), -3) });

    const rows = await list(pid);
    expect(rows.map((r) => r.claimCaseId).sort()).toEqual([notDied.cid, dated.cid].sort());
    for (const r of rows) {
      expect(r).toMatchObject({ currentState: 'verifier_approved', lateWarningAwaitingReason: true, lateWarningUncoveredCount: 1, returnedAt: null });
    }
    await finalVoteWaits(notDied);
    await finalVoteWaits(dated);
  });

  it('(c) an EDIT after the approval of a date the approval covered ⇒ a NEW key ⇒ listed', { timeout: TIMEOUT }, async () => {
    const pid = freshPariwar();
    const w = await world(pid);
    const d = await acceptedDate(w);
    await answer(w, 'has_died', { codes: ['died'] });
    await answer(w, 'death_date', { date: addCalendarDays(d, -5) });
    await approve(w, GENERIC);
    expect(await list(pid)).toEqual([]);
    await answer(w, 'death_date', { date: addCalendarDays(d, -6) });
    const rows = await list(pid);
    expect(rows).toEqual([expect.objectContaining({ claimCaseId: w.cid, lateWarningAwaitingReason: true, lateWarningUncoveredCount: 1 })]);
  });

  it('(c′) `not_died` saved AFTER the approval, then edited to `died` ⇒ ⛔ listed on the normal path', { timeout: TIMEOUT }, async () => {
    const pid = freshPariwar();
    const w = await world(pid);
    await approve(w);
    await answer(w, 'has_died', { codes: ['not_died'] });
    expect((await list(pid)).map((r) => r.claimCaseId)).toEqual([w.cid]);
    await answer(w, 'has_died', { codes: ['died'] });
    expect(await list(pid)).toEqual([]);
  });

  it('(d) BF13 — a re-review from EQUAL to differing, then a re-determination ⇒ listed through arm (1), the key a neighbour\'s', { timeout: TIMEOUT }, async () => {
    const pid = freshPariwar();
    // ⛔ the default visit (its date would differ after the move — its OWN late key, and the leg would pass with the peer
    // kind deleted): the claim's only visit records the NEW date.
    const w = await world(pid, { inspection: 'skip' });
    const before = await acceptedDate(w);
    const moved = addCalendarDays(before, -10);
    await onOwnTx(pid, (c) => seedGroundInspection(c, pid, w.cid, { force: true, deathDate: moved }));
    await answer(w, 'has_died', { codes: ['died'] });
    await answer(w, 'death_date', { date: before }); // EQUAL to today's certificate ⇒ ⛔ key
    expect(await peerKeysOf(w)).toEqual([]);
    await approve(w, GENERIC); // covers the visit's (now differing) key
    await onOwnTx(pid, async (c) => {
      await seedAcceptedDeathCertificate(c, { pariwarId: pid, claimCaseId: w.cid, date: moved });
      await seedNomineeDetermination(c, pid, w.cid, { certificateDate: moved });
      await seedNomineeNameCheck(c, pid, w.cid, { reuseAccounts: true });
    });
    const answerId = (await onOwnTx(pid, (c) => liveAnswerId(c, pid, w.cid, w.ping.pingId, 'death_date'), true))!.toLowerCase();
    expect(await peerKeysOf(w)).toEqual([`peer_death_date_differs:${answerId}`]);
    const rows = await list(pid);
    expect(rows).toEqual([expect.objectContaining({ claimCaseId: w.cid, lateWarningAwaitingReason: true, lateWarningUncoveredCount: 1 })]);
  });

  it('(e) `-324` A — leg (b) on an R9-routed claim in `state_trustee_approved` ⇒ listed; (e′) its routing superseded ⇒ ⛔ listed', { timeout: TIMEOUT }, async () => {
    const pid = freshPariwar();
    await onOwnTx(pid, async (c) => {
      const tx = bindScopedDb(c);
      await seedClauseVersion(tx, pid, {
        clauseId: R9_CLAUSE,
        payload: { rule_code: 'R9', voting_required: true, majority_required: true, on_pass: 'route_r9_voting' },
      });
      await seedRoleGrant(tx, pid, { userId: PA, role: 'pariwar_admin', scopeDimension: 'pariwar', scopeValue: pid });
    }, true);
    const w = await world(pid);
    await approve(w);
    await onOwnTx(pid, (c) =>
      voteOnFrozenClaim(c, {
        claimCaseId: w.cid, pariwarId: pid, outcome: 'approved', reasonCode: null, rationaleCiphertext: null,
        actorId: PA, actorDisplay: 'Pariwar Admin', actor: 'trustee',
      }),
    );
    await onOwnTx(pid, (c) =>
      routeToR9(c, {
        claimCaseId: w.cid, pariwarId: pid, reasonCode: 'r9_special_case', rationaleCiphertext: null,
        actorId: PA, actorDisplay: 'Pariwar Admin', actor: 'trustee',
      }),
    );
    await answer(w, 'has_died', { codes: ['not_died'] }); // in the window: `state_trustee_approved` under a live routing

    const rows = await list(pid);
    expect(rows).toEqual([
      expect.objectContaining({ claimCaseId: w.cid, currentState: 'state_trustee_approved', lateWarningAwaitingReason: true, lateWarningUncoveredCount: 1 }),
    ]);
    await onOwnTx(pid, (c) =>
      c.query(
        `UPDATE claim_state_trustee_decisions SET superseded_at = now()
          WHERE claim_case_id = $1 AND phase = 'routing' AND superseded_at IS NULL`,
        [w.cid],
      ), true);
    expect(await list(pid)).toEqual([]);
  });
});
