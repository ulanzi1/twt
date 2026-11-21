// Story 6.39 — TWO-CONNECTION concurrency for the membership check (own-committing). Code review 2026-11-21 (checklist
// family 2 — "true two-connection races proven live"; family 12 (c) — a re-check never supersedes a check its writer
// never saw).
//
// ⭐ A real race needs real concurrent COMMITs on SEPARATE pool clients (the `*-concurrency.spec.ts` family). Built
// HOLDER / WAITER, as `death-certificate-concurrency.spec.ts`: the holder records its check and keeps its transaction
// open; the waiter starts, and "it WAITS" is PROVED from the server (`pg_blocking_pids`), ⛔ not inferred from a timer.
// Then the holder commits and the waiter's outcome is asserted.
//   · two District Admins recording a check on the same claim at once, each having seen ⛔ live check ⇒ they
//     serialise on the claim row, and the second is a typed `check_changed` refusal — exactly ONE live check, ONE
//     `claim.membership_checked` event, ⛔ never a raw 23505 on the one-live-row index.
//
// A FRESH tenant per file — committed rows ⛔ never pollute PARIWAR_A ([[project_known_livedb_test_failures]]).

import { randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  MembershipCheckRefusedError,
  projectClaimState,
  recordMembershipCheck,
  type RecordMembershipCheckInput,
} from '../../../src/claim/index.js';
import { bindScopedDb, setPariwarScope } from '../../../src/db.js';
import { claimId as toClaimId, memberId as toMemberId, pariwarId as toPariwarId } from '../../../src/ids/index.js';
import type { ClaimId } from '../../../src/ids/index.js';
import { seedAcceptedDeathCertificate, seedEvent, seedMember } from '../_helpers.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);
const PARIWAR = toPariwarId(randomUUID());
const TIMEOUT = 20_000;

describe.skipIf(!hasDatabase)('Story 6.39 — membership check two-connection concurrency (own-committing)', () => {
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
  async function claimReadyForCheck(): Promise<{ cid: ClaimId; reviewId: string; receiptId: string }> {
    const cid = toClaimId(randomUUID());
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await setPariwarScope(client, PARIWAR);
      const tx = bindScopedDb(client);
      const mid = await seedMember(tx, PARIWAR, { state: 'lock-in' });
      members.push(mid);
      claims.push(cid);
      const utr = `UTR-${randomUUID()}`;
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
      return { cid, reviewId, receiptId: receipt.rows[0]!.receipt_id };
    } catch (err) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  }

  const input = (
    c: { cid: ClaimId; reviewId: string; receiptId: string },
    identityOutcome: 'confirmed' | 'not_confirmed',
  ): RecordMembershipCheckInput => ({
    claimCaseId: c.cid,
    pariwarId: PARIWAR,
    computedAgainstReviewId: c.reviewId,
    feeReceiptId: c.receiptId,
    feeOutcome: 'before_death',
    // Each District Admin opened the check BEFORE either recorded — each saw ⛔ live check.
    expectedLiveCheckId: null,
    identityOutcome,
    identityReason: identityOutcome === 'not_confirmed' ? 'document_unreadable' : null,
    noteCiphertext: identityOutcome === 'not_confirmed' ? 'enc:v1:n' : null,
    actorId: randomUUID(),
    actorDisplay: 'A District Admin',
    actor: 'operator',
  });

  beforeAll(() => {
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 8, ssl: false, connectionTimeoutMillis: 5000 });
  });

  afterAll(async () => {
    // `DELETE FROM claims` cascades to the documents, reviews and checks (the append-only triggers exempt a cascade,
    // pg_trigger_depth > 1). `events_log` needs replica mode, as in every sibling spec.
    await pool.query('DELETE FROM claims WHERE claim_case_id = ANY($1)', [claims]).catch((e: Error) => console.error('[membership-check-concurrency.spec] claims cleanup:', e.message));
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      await c.query("SET LOCAL session_replication_role = 'replica'");
      await c.query('DELETE FROM events_log WHERE stream_id = ANY($1)', [[...claims, ...members]]);
      await c.query('COMMIT');
    } catch (e) {
      await c.query('ROLLBACK').catch(() => undefined);
      console.error('[membership-check-concurrency.spec] events_log cleanup:', (e as Error).message);
    } finally {
      c.release();
    }
    await pool.end();
  });

  it('⭐ two District Admins record a check on the SAME claim at once: the second WAITS on the claim row, then is a typed `check_changed` — ONE live check, ONE event', { timeout: TIMEOUT }, async () => {
    const ready = await claimReadyForCheck();
    const { waited, outcome } = await holderWaiter(
      (holder) => recordMembershipCheck(holder, input(ready, 'not_confirmed')),
      (waiter) => recordMembershipCheck(waiter, input(ready, 'confirmed')),
    );
    expect(waited, 'the second check did not wait for the first').toBe(true);
    expect(outcome.status).toBe('rejected');
    const reason = (outcome as PromiseRejectedResult).reason;
    expect(reason instanceof MembershipCheckRefusedError && reason.reason === 'check_changed', String(reason)).toBe(true);

    // The FIRST writer's hold stands — the second did ⛔ supersede a check it never saw.
    const rows = await pool.query<{ identity_outcome: string; superseded_at: Date | null }>(
      'SELECT identity_outcome, superseded_at FROM claim_membership_checks WHERE claim_case_id = $1',
      [ready.cid],
    );
    expect(rows.rows).toEqual([{ identity_outcome: 'not_confirmed', superseded_at: null }]);
    const events = await pool.query<{ n: string }>(
      `SELECT count(*)::text AS n FROM events_log WHERE stream_id = $1 AND event_type = 'claim.membership_checked'`,
      [ready.cid],
    );
    expect(events.rows[0]!.n).toBe('1');
  });
});
