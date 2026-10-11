// Story 6.28 — the warning (OP5), live DB (:5433), own-committing. `2026-10-11-318` Q1 A (the wait included), `-319` OP5.
//
//   AC5 — with two OPEN claims of one death (⛔ a suspicion pair) BOTH show `other_claim_for_death:<other id>`; approving
//         needs FQ12's reason and note; a claim filed AFTER the District Admin approved X makes X's final approval WAIT for
//         the District Admin's reason (6.23b) AND lists X in the District Admin's correction queue (the normal path AND the
//         fault path — the `lateWarningCandidate` column); a `denied` other claim's key VANISHES and REAPPEARS when it is
//         appealed, and X is listed again; the key vanishes when the other claim becomes terminal or passes the final vote
//         and ⛔ no coverage then requires it; single read = bulk read.
//
// ⚠ WHY OWN-COMMITTING: "filed AFTER the approval" is an ordering — inside one BEGIN/ROLLBACK every `now()` ties
// ([[project_db_clock_ordering_tests_tie]]). A FRESH Pariwar per test; fixture cleanup in replica mode only.

import { randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { bindScopedDb, setPariwarScope } from '../../../src/db.js';
import {
  ApprovalWarningReasonRequiredError,
  LateWarningReasonRequiredError,
  adjudicateClaim,
  initiateAppeal,
  lateWarningKeys,
  listClaimsUnderCorrection,
  readClaimApprovalWarnings,
  readClaimApprovalWarningsBulk,
  uncoveredKeys,
  voteOnFrozenClaim,
} from '../../../src/claim/index.js';
import { claimId as toClaimId, memberId as toMemberId, pariwarId as toPariwarId } from '../../../src/ids/index.js';
import type { ClaimId, MemberId, PariwarId } from '../../../src/ids/index.js';
import { driveClaimTo, seedNomineeNameCheck } from '../_helpers.js';
import { claimAt, emitClaim } from './_one-payment-fixtures.js';
import { refusedClaim } from './_suspicion-refusal-fixtures.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);
const TIMEOUT = 60_000;
const DA = 'd6d6d6d6-0000-4000-8000-000000000081';
const PA = 'a6a6a6a6-0000-4000-8000-000000000082';
const GENERIC = 'warnings_reviewed';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const key = (other: string) => `other_claim_for_death:${other.toLowerCase()}`;

describe.skipIf(!hasDatabase)('Story 6.28 — the `other_claim_for_death` warning (OP5, own-committing)', () => {
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
        // Replica mode disables triggers — the append-only ones AND the RI cascades — for fixture cleanup ONLY.
        await c.query("SET LOCAL session_replication_role = 'replica'");
        const { rows } = await c.query<{ table_name: string }>(
          `SELECT c.table_name FROM information_schema.columns c
             JOIN information_schema.tables t ON t.table_schema = c.table_schema AND t.table_name = c.table_name
            WHERE c.table_schema = 'public' AND c.column_name = 'pariwar_id' AND t.table_type = 'BASE TABLE'`,
        );
        for (const { table_name } of rows) {
          await c.query(`DELETE FROM "${table_name}" WHERE pariwar_id::text = ANY($1)`, [pariwars]);
        }
        await c.query(`DELETE FROM idempotency_keys WHERE ${pariwars.map((_, i) => `key LIKE '%' || $${i + 1} || '%'`).join(' OR ')}`, pariwars);
        await c.query('COMMIT');
      } catch (e) {
        await c.query('ROLLBACK').catch(() => undefined);
        console.error('[one-payment-per-death-warning.spec] cleanup:', (e as Error).message);
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

  /** `fn` on its own pooled connection, in its OWN committed transaction as `twt_app` under `pid`. */
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

  const warningsOf = (pid: PariwarId, cid: ClaimId) => onOwnTx(pid, (c) => readClaimApprovalWarnings(bindScopedDb(c), pid, cid));
  const bulkOf = (pid: PariwarId, cids: ClaimId[]) => onOwnTx(pid, (c) => readClaimApprovalWarningsBulk(bindScopedDb(c), pid, cids));
  const list = (pid: PariwarId) => onOwnTx(pid, (c) => listClaimsUnderCorrection(bindScopedDb(c), pid));
  const listed = async (pid: PariwarId, cid: ClaimId) => (await list(pid)).some((r) => r.claimCaseId === cid);

  /** A fully approvable claim of death `mid` in `verifier_review` (the default fixtures), COMMITTED. */
  const inReview = (pid: PariwarId, mid: MemberId) =>
    onOwnTx(pid, async (c) => {
      const id = toClaimId(randomUUID());
      await driveClaimTo(c, pid, id, mid, 'verifier_review');
      await seedNomineeNameCheck(c, pid, id);
      return id;
    });
  /** An OPEN, approvable claim of death `mid` past the District Admin (`verifier_approved`), COMMITTED. */
  const reviewable = (pid: PariwarId, mid: MemberId) => onOwnTx(pid, (c) => claimAt(c, pid, mid, 'verifier_approved'));

  const approve = (pid: PariwarId, cid: ClaimId, warningReasonCode: string | null) =>
    onOwnTx(pid, (c) =>
      adjudicateClaim(c, {
        claimCaseId: cid, pariwarId: pid, outcome: 'approved', reasonCode: 'r5_d_natural_death', rationaleCiphertext: 'enc:v1:why',
        warningReasonCode, actorId: DA, actorDisplay: 'Anita (District Admin)', actor: 'operator',
      }),
    );

  /** RD25 — the queue on its FAULT path: the late-arm statement (the one carrying `discarded_member_version_ids`) gets
   *  every UUID parameter corrupted, so it fails at execution; every CANDIDATE then lists as "may wait". */
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

  /** The final vote on `cid` — run in its own transaction, ROLLED BACK; returns the error (or `null`). */
  async function finalVote(pid: PariwarId, cid: ClaimId, warningReasonCode: string | null = GENERIC): Promise<unknown> {
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      await c.query('SET LOCAL ROLE twt_app');
      await setPariwarScope(c, pid);
      await voteOnFrozenClaim(c, {
        claimCaseId: cid, pariwarId: pid, outcome: 'approved', reasonCode: null, rationaleCiphertext: 'enc:v1:final-why',
        warningReasonCode, actorId: PA, actorDisplay: 'Pariwar Admin', actor: 'trustee',
      });
      return null;
    } catch (err) {
      return err;
    } finally {
      await c.query('ROLLBACK').catch(() => undefined);
      c.release();
    }
  }

  it('two OPEN claims of one death ⇒ BOTH carry the other\'s key; single read = bulk read; approving needs the reason and the note', { timeout: TIMEOUT }, async () => {
    const pid = freshPariwar();
    const mid = toMemberId(randomUUID());
    const a = await reviewable(pid, mid);
    const b = await reviewable(pid, mid);
    const wa = await warningsOf(pid, a);
    const wb = await warningsOf(pid, b);
    expect(wa.keys).toContain(key(b));
    expect(wa.kinds).toContain('other_claim_for_death');
    expect(wb.keys).toContain(key(a));
    expect(wa.keys.filter((k) => k.startsWith('other_claim_for_death:'))).toEqual([key(b)]);
    const bulk = await bulkOf(pid, [a, b]);
    expect(bulk.get(a)!.keys).toEqual(wa.keys);
    expect(bulk.get(b)!.keys).toEqual(wb.keys);
    expect(bulk.get(a)!.kinds).toEqual(wa.kinds);
    // FQ12 (`-264`) — ⛔ no reason ⇒ refused; the reason (and the strip's note on the console) ⇒ approves.
    const y = await inReview(pid, mid);
    await expect(approve(pid, y, null)).rejects.toBeInstanceOf(ApprovalWarningReasonRequiredError);
    await expect(approve(pid, y, GENERIC)).resolves.toMatchObject({ claimState: 'verifier_approved' });
  });

  it('⭐ a claim filed AFTER the District Admin approved X ⇒ X\'s final vote WAITS (6.23b) and X is LISTED in the queue — normal path AND fault path', { timeout: TIMEOUT }, async () => {
    const pid = freshPariwar();
    const mid = toMemberId(randomUUID());
    const x = await inReview(pid, mid);
    await approve(pid, x, null); // ⛔ any warning yet — approved plainly
    expect(await listed(pid, x)).toBe(false);
    expect(await finalVote(pid, x, null)).toBeNull(); // ⛔ any warning ⇒ the vote passes with ⛔ no reason
    // Y — filed AFTER the approval, COMMITTED.
    const y = await reviewable(pid, mid);
    expect((await warningsOf(pid, x)).keys).toContain(key(y));
    expect(await finalVote(pid, x)).toBeInstanceOf(LateWarningReasonRequiredError);
    expect(await listed(pid, x)).toBe(true);
    const fault = await listOnFault(pid);
    expect(fault.told).toBe(1);
    expect(fault.rows.map((r) => r.claimCaseId)).toContain(x);
  });

  it('a `denied` other claim\'s key VANISHES and REAPPEARS when it is appealed — X listed again; terminal / finally approved ⇒ gone and ⛔ required', { timeout: TIMEOUT }, async () => {
    const pid = freshPariwar();
    const mid = toMemberId(randomUUID());
    const x = await inReview(pid, mid);
    await approve(pid, x, null);
    // Y — refused for an ordinary reason AFTER X's approval.
    const y = await onOwnTx(pid, (c) => refusedClaim(c, pid, mid, { reason: 'other' }));
    let w = await warningsOf(pid, x);
    expect(w.keys).not.toContain(key(y));
    // Y appealed ⇒ open again ⇒ the key REAPPEARS (⛔ no row of X moved) and X is listed.
    await onOwnTx(pid, (c) => initiateAppeal(c, { claimCaseId: y, pariwarId: pid, initiatedByActor: randomUUID(), initiatedOnBehalf: true, actor: 'operator' }));
    w = await warningsOf(pid, x);
    expect(w.keys).toContain(key(y));
    expect(lateWarningKeys(w)).toContain(key(y));
    expect(await listed(pid, x)).toBe(true);
    // Y passes its final vote (direct events — the claim is ⛔ the subject) ⇒ the key VANISHES; ⛔ coverage requires it.
    const z = await reviewable(pid, mid);
    await onOwnTx(pid, async (c) => {
      await emitClaim(c, pid, z, mid, 'verifier_approved', 'state_trustee_freeze', 'claim.state_trustee_frozen');
      await emitClaim(c, pid, z, mid, 'state_trustee_freeze', 'state_trustee_approved', 'claim.state_trustee_approved');
    });
    w = await warningsOf(pid, x);
    expect(w.keys).not.toContain(key(z));
    // Y closed (terminal) ⇒ its key vanishes too; nothing then remains uncovered for X.
    await onOwnTx(pid, (c) =>
      emitClaim(c, pid, y, mid, 'appeal_stage_1', 'closed', 'claim.closed', {
        trigger: 'death_already_finally_approved', held_by_claim_case_id: z, deceased_member_id: mid,
      }),
    );
    w = await warningsOf(pid, x);
    expect(w.keys.filter((k) => k.startsWith('other_claim_for_death:'))).toEqual([]);
    expect(uncoveredKeys(w)).toEqual([]);
  });

  it('⛔ no key on EITHER claim of a standing suspicion-refusal pair (Invariant 3)', { timeout: TIMEOUT }, async () => {
    const pid = freshPariwar();
    const mid = toMemberId(randomUUID());
    const s = await onOwnTx(pid, (c) => refusedClaim(c, pid, mid));
    const r = await reviewable(pid, mid);
    expect((await warningsOf(pid, s)).kinds).not.toContain('other_claim_for_death');
    expect((await warningsOf(pid, r)).kinds).not.toContain('other_claim_for_death');
  });
});
