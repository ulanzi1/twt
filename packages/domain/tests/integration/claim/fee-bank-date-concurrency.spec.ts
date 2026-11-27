// Story 6.39a — TWO-CONNECTION concurrency for the bank date (own-committing). Code review 2026-11-27 (checklist family 2 —
// "true two-connection races proven live"): the claim-row `FOR UPDATE` lock serialises the finance officer's writer with a
// second finance officer AND with the District Admin's membership check; the loser of each race is a TYPED refusal from the
// token it carries — ⛔ a raw 23505, ⛔ a silent overwrite.
//   · two finance officers record at once, each having seen ⛔ live record ⇒ the second WAITS, then `stale` — ONE live record;
//   · a finance officer records (holder) while a District Admin's check computed against ⛔ record waits ⇒ `bank_date_changed`;
//   · a District Admin's re-check (holder) while a finance officer's write against the OLD check waits ⇒ `stale`.
// The HOLDER / WAITER harness is 6.39's (`membership-check-concurrency.spec.ts`), copied: "it WAITS" is proved from the server
// (`pg_blocking_pids`). A FRESH tenant per file.

import { randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  FeeBankDateRefusedError,
  MembershipCheckRefusedError,
  projectClaimState,
  recordFeeBankDate,
  recordMembershipCheck,
} from '../../../src/claim/index.js';
import { istDateOf } from '../../../src/cycle-calendar/holiday-resolver.js';
import { bindScopedDb, setPariwarScope } from '../../../src/db.js';
import { claimId as toClaimId, memberId as toMemberId, pariwarId as toPariwarId } from '../../../src/ids/index.js';
import type { ClaimId } from '../../../src/ids/index.js';
import { seedAcceptedDeathCertificate, seedEvent, seedMember } from '../_helpers.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);
const PARIWAR = toPariwarId(randomUUID());
const TIMEOUT = 20_000;

describe.skipIf(!hasDatabase)('Story 6.39a — bank date two-connection concurrency (own-committing)', () => {
  let pool: pg.Pool;
  const claims: string[] = [];
  const members: string[] = [];

  async function begin(): Promise<pg.PoolClient> {
    const client = await pool.connect();
    await client.query('BEGIN');
    await client.query('SET LOCAL ROLE twt_app');
    await setPariwarScope(client, PARIWAR);
    return client;
  }
  async function end(client: pg.PoolClient, commit: boolean): Promise<void> {
    try {
      await client.query(commit ? 'COMMIT' : 'ROLLBACK');
    } finally {
      client.release();
    }
  }
  const pidOf = async (c: pg.PoolClient): Promise<number> =>
    Number((await c.query<{ pid: number }>('SELECT pg_backend_pid() AS pid')).rows[0]!.pid);
  async function blockedBy(waiter: number, holder: number, withinMs = 5000): Promise<boolean> {
    const deadline = Date.now() + withinMs;
    while (Date.now() < deadline) {
      const r = await pool.query<{ blockers: number[] }>('SELECT pg_blocking_pids($1) AS blockers', [waiter]);
      if ((r.rows[0]?.blockers ?? []).map(Number).includes(holder)) return true;
      await new Promise((res) => setTimeout(res, 25));
    }
    return false;
  }

  /** The holder writes and stays open; the waiter must BLOCK on it; then the holder commits. */
  async function holderWaiter<T>(
    hold: (holder: pg.PoolClient) => Promise<unknown>,
    wait: (waiter: pg.PoolClient) => Promise<T>,
  ): Promise<{ waited: boolean; outcome: PromiseSettledResult<T> }> {
    let holder: pg.PoolClient | undefined;
    let holderOpen = false;
    let pending: Promise<T> | undefined;
    try {
      holder = await begin();
      holderOpen = true;
      await hold(holder);
      const holderPid = await pidOf(holder);
      const waiter = await begin();
      let waiterPid: number;
      try {
        waiterPid = await pidOf(waiter);
      } catch (err) {
        await end(waiter, false).catch(() => undefined);
        throw err;
      }
      pending = wait(waiter).then(
        async (v) => {
          await end(waiter, true).catch(() => undefined);
          return v;
        },
        async (e: unknown) => {
          await end(waiter, false).catch(() => undefined);
          throw e;
        },
      );
      const waited = await blockedBy(waiterPid, holderPid);
      await end(holder, true);
      holderOpen = false;
      const [outcome] = await Promise.allSettled([pending]);
      return { waited, outcome: outcome! };
    } finally {
      if (holderOpen && holder) await end(holder, false).catch(() => undefined);
      if (pending) await pending.catch(() => undefined);
    }
  }

  /**
   * A claim in `verifier_review` whose deceased has a real joining receipt (the `pending-fee → lock-in` event + its
   * receipt) and ONE current accepted certificate review — ⛔ membership check yet. Seeded as the superuser (the
   * receipt and the member's event are ⛔ the app role's to write raw), committed.
   */
  async function claimReadyForCheck(): Promise<{ cid: ClaimId; mid: string; reviewId: string; receiptId: string; utr: string }> {
    const cid = toClaimId(randomUUID());
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await setPariwarScope(client, PARIWAR);
      const tx = bindScopedDb(client);
      const mid = await seedMember(tx, PARIWAR, { state: 'lock-in' });
      members.push(mid);
      claims.push(cid);
      const utr = `${Math.floor(1e11 + Math.random() * 9e11)}`;
      await seedEvent(tx, PARIWAR, {
        streamId: mid,
        eventType: 'member.vyawastha_shulk_paid',
        eventVersion: 3,
        payload: { from_state: 'pending-fee', to_state: 'lock-in', trigger: 'vyawastha_shulk_paid', actor: 'member', utr, amount_inr: 100 },
      });
      const receipt = await client.query<{ receipt_id: string }>(
        `INSERT INTO vyawastha_shulk_receipts (member_id, pariwar_id, tr, utr, amount_inr, payment_method, paid_at, valid_through)
         VALUES ($1, $2, $3, $4, 100, 'upi', '2026-01-09T06:00:00Z', '2099-01-01T00:00:00Z') RETURNING receipt_id`,
        [mid, PARIWAR, `TR-${randomUUID()}`, utr],
      );
      const emit = (from: string | null, to: string, eventType: string, extra: Record<string, unknown> = {}) =>
        projectClaimState(client, {
          claimCaseId: cid,
          pariwarId: PARIWAR,
          deceasedMemberId: toMemberId(mid),
          intakeChannels: ['member_app'],
          claimantActorId: null,
          eventType: eventType as never,
          payload: { from_state: from, to_state: to, trigger: 'test', actor: 'system', ...extra } as never,
          actorId: null,
        });
      await emit(null, 'intake_pending', 'claim.intake_initiated', { deceased_member_id: mid, intake_channel: 'member_app', claimant_actor_id: null });
      await emit('intake_pending', 'intake_converged', 'claim.intake_converged');
      await emit('intake_converged', 'documents_pending', 'claim.documents_received');
      await emit('documents_pending', 'verification_in_progress', 'claim.peer_mesh_pinged', {
        selected_member_ids: [randomUUID()],
        metric_id: 'district_cohort_v1',
        metric_version: 1,
      });
      await emit('verification_in_progress', 'verifier_review', 'claim.verifier_reviewing');
      const reviewId = await seedAcceptedDeathCertificate(client, { pariwarId: PARIWAR, claimCaseId: cid, date: '2026-03-10' });
      await client.query('COMMIT');
      return { cid, mid, reviewId, receiptId: receipt.rows[0]!.receipt_id, utr };
    } catch (err) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  }

  beforeAll(() => {
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 8, ssl: false, connectionTimeoutMillis: 5000 });
  });

  afterAll(async () => {
    // `DELETE FROM claims` cascades to the documents, reviews and checks (the append-only triggers exempt a cascade,
    // pg_trigger_depth > 1). `events_log` needs replica mode, as in every sibling spec.
    await pool.query('DELETE FROM claims WHERE claim_case_id = ANY($1)', [claims]).catch((e: Error) => console.error('[fee-bank-date-concurrency.spec] claims cleanup:', e.message));
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      await c.query("SET LOCAL session_replication_role = 'replica'");
      await c.query('DELETE FROM events_log WHERE stream_id = ANY($1)', [[...claims, ...members]]);
      await c.query('COMMIT');
    } catch (e) {
      await c.query('ROLLBACK').catch(() => undefined);
      console.error('[fee-bank-date-concurrency.spec] events_log cleanup:', (e as Error).message);
    } finally {
      c.release();
    }
    await pool.end();
  });


  type Ready = Awaited<ReturnType<typeof claimReadyForCheck>>;

  /** A committed live check holding the claim on its fee (`after_death`), naming the joining payment. */
  async function heldClaim(): Promise<Ready & { checkId: string }> {
    const ready = await claimReadyForCheck();
    const c = await begin();
    try {
      const r = await recordMembershipCheck(c, checkInput(ready, null, null, 'after_death'));
      await end(c, true);
      return { ...ready, checkId: r.checkId as string };
    } catch (err) {
      await end(c, false);
      throw err;
    }
  }

  const checkInput = (ready: Ready, expectedLiveCheckId: string | null, computedAgainstFeeBankDateId: string | null, feeOutcome: 'before_death' | 'after_death' = 'before_death') => ({
    claimCaseId: ready.cid,
    pariwarId: PARIWAR,
    computedAgainstReviewId: ready.reviewId,
    feeReceiptId: ready.receiptId,
    expectedLiveCheckId,
    computedAgainstFeeBankDateId,
    feeOutcome,
    identityOutcome: 'confirmed' as const,
    identityReason: null,
    noteCiphertext: null,
    actorId: randomUUID(),
    actorDisplay: 'A District Admin',
    actor: 'operator' as const,
  });
  const bankInput = (ready: Ready & { checkId: string }, expectedLiveRecordId: string | null) => ({
    claimCaseId: ready.cid,
    pariwarId: PARIWAR,
    statementReference: ready.utr,
    bankCreditDate: istDateOf(new Date()),
    reasonCode: 'recorded_by_family_after_death' as const,
    noteCiphertext: 'enc:v1:note',
    expectedLiveCheckId: ready.checkId,
    expectedLiveRecordId,
    actorId: randomUUID(),
    actorDisplay: 'A finance officer',
    actor: 'operator' as const,
    now: new Date(),
  });
  const liveRecords = async (cid: string) =>
    (await pool.query<{ record_id: string }>('SELECT record_id FROM claim_fee_bank_dates WHERE claim_case_id = $1 AND superseded_at IS NULL', [cid])).rows;

  it('⭐ two finance officers record a bank date on the SAME claim at once: the second WAITS on the claim row, then is a typed `stale` — ONE live record, ONE event', { timeout: TIMEOUT }, async () => {
    const ready = await heldClaim();
    const { waited, outcome } = await holderWaiter(
      (holder) => recordFeeBankDate(holder, bankInput(ready, null)),
      (waiter) => recordFeeBankDate(waiter, bankInput(ready, null)),
    );
    expect(waited, 'the second record did not wait for the first').toBe(true);
    expect(outcome.status).toBe('rejected');
    const reason = (outcome as PromiseRejectedResult).reason;
    expect(reason instanceof FeeBankDateRefusedError && reason.reason === 'stale', String(reason)).toBe(true);
    expect(await liveRecords(ready.cid)).toHaveLength(1);
    const events = await pool.query<{ n: string }>(
      `SELECT count(*)::text AS n FROM events_log WHERE stream_id = $1 AND event_type = 'claim.fee_bank_date_recorded'`,
      [ready.cid],
    );
    expect(events.rows[0]!.n).toBe('1');
  });

  it('⭐ a finance officer records (holder) while a District Admin\'s re-check computed against ⛔ record waits: the check is a typed `bank_date_changed` — the record stands, the old check stays live', { timeout: TIMEOUT }, async () => {
    const ready = await heldClaim();
    const { waited, outcome } = await holderWaiter(
      (holder) => recordFeeBankDate(holder, bankInput(ready, null)),
      (waiter) => recordMembershipCheck(waiter, checkInput(ready, ready.checkId, null)),
    );
    expect(waited, 'the check did not wait for the bank date').toBe(true);
    expect(outcome.status).toBe('rejected');
    const reason = (outcome as PromiseRejectedResult).reason;
    expect(reason instanceof MembershipCheckRefusedError && reason.reason === 'bank_date_changed', String(reason)).toBe(true);
    expect(await liveRecords(ready.cid)).toHaveLength(1);
    const live = await pool.query<{ check_id: string }>('SELECT check_id FROM claim_membership_checks WHERE claim_case_id = $1 AND superseded_at IS NULL', [ready.cid]);
    expect(live.rows.map((r) => r.check_id)).toEqual([ready.checkId]);
  });

  it('⭐ a District Admin re-checks (holder) while a finance officer\'s write against the OLD check waits: the write is a typed `stale` — ⛔ record', { timeout: TIMEOUT }, async () => {
    const ready = await heldClaim();
    const { waited, outcome } = await holderWaiter(
      (holder) => recordMembershipCheck(holder, checkInput(ready, ready.checkId, null, 'after_death')),
      (waiter) => recordFeeBankDate(waiter, bankInput(ready, null)),
    );
    expect(waited, 'the bank date did not wait for the check').toBe(true);
    expect(outcome.status).toBe('rejected');
    const reason = (outcome as PromiseRejectedResult).reason;
    expect(reason instanceof FeeBankDateRefusedError && reason.reason === 'stale', String(reason)).toBe(true);
    expect(await liveRecords(ready.cid)).toEqual([]);
  });
});
