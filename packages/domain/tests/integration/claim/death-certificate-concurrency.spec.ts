// Story 6.21a — TWO-CONNECTION concurrency for the death-certificate review (own-committing). AC8(viii).
//
// ⭐ A real race needs real concurrent COMMITs on SEPARATE pool clients (the `*-concurrency.spec.ts` family).
// Built HOLDER / WAITER (`nominee-history-concurrency.spec.ts`): the holder runs its write and keeps its
// transaction open; the waiter starts, and "it WAITS" is PROVED from the server (`pg_blocking_pids`), ⛔ not
// inferred from a timer. Then the holder commits and the waiter's outcome is asserted.
//   · two District Admins reviewing the same certificate at once ⇒ they serialise on the claim row, and the
//     second is a typed `stale_supersession` 409 — exactly ONE live review, ⛔ never a raw 23505.
// (The review-vs-OCR-job race is proved in `apps/jobs/tests/claim-ocr-parity-death-certificate.test.ts`,
// beside the job.)
//
// A FRESH tenant per file — committed rows ⛔ never pollute PARIWAR_A ([[project_known_livedb_test_failures]]).

import { randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  DeathCertificateReviewRefusedError,
  projectClaimState,
  recordDeathCertificateReview,
  type RecordDeathCertificateReviewInput,
} from '../../../src/claim/index.js';
import { setPariwarScope } from '../../../src/db.js';
import { claimId as toClaimId, memberId as toMemberId, pariwarId as toPariwarId } from '../../../src/ids/index.js';
import type { ClaimId } from '../../../src/ids/index.js';
import { fixtureAcceptedDateCiphertext, seedDeathCertificate } from '../_helpers.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);
const PARIWAR = toPariwarId(randomUUID());
const TIMEOUT = 20_000;

describe.skipIf(!hasDatabase)('Story 6.21a — death-certificate review two-connection concurrency (own-committing)', () => {
  let pool: pg.Pool;
  const claims: string[] = [];

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
  async function onOwnTx<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
    const client = await begin();
    try {
      const out = await fn(client);
      await end(client, true);
      return out;
    } catch (err) {
      await end(client, false).catch(() => undefined);
      throw err;
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

  /** A claim in `verifier_review` with ONE current, unreviewed certificate. */
  async function claimWithCertificate(): Promise<{ cid: ClaimId; uploadId: string }> {
    const cid = toClaimId(randomUUID());
    const mid = toMemberId(randomUUID());
    claims.push(cid);
    return onOwnTx(async (client) => {
      const emit = (from: string | null, to: string, eventType: string, extra: Record<string, unknown> = {}) =>
        projectClaimState(client, {
          claimCaseId: cid,
          pariwarId: PARIWAR,
          deceasedMemberId: mid,
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
      const { uploadId } = await seedDeathCertificate(client, { pariwarId: PARIWAR, claimCaseId: cid });
      return { cid, uploadId };
    });
  }

  const input = (cid: ClaimId, uploadId: string, verdict: 'accepted' | 'rejected'): RecordDeathCertificateReviewInput => ({
    claimCaseId: cid,
    pariwarId: PARIWAR,
    verdict,
    certificateToken: uploadId,
    acceptedDate: verdict === 'accepted' ? '2026-03-10' : null,
    acceptedDateCiphertext: verdict === 'accepted' ? fixtureAcceptedDateCiphertext('2026-03-10') : null,
    rejectionReason: verdict === 'rejected' ? 'no_date_of_death' : null,
    noteCiphertext: 'enc:v1:n',
    expectedLiveReviewId: null,
    actorId: randomUUID(),
    actorDisplay: 'A District Admin',
    actor: 'operator',
  });

  beforeAll(() => {
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 8, ssl: false, connectionTimeoutMillis: 5000 });
  });

  afterAll(async () => {
    // `DELETE FROM claims` cascades to the documents, uploads and reviews (the append-only triggers exempt a
    // cascade, pg_trigger_depth > 1). `events_log` needs replica mode, as in every sibling spec.
    await pool.query('DELETE FROM claims WHERE claim_case_id = ANY($1)', [claims]).catch((e: Error) => console.error('[death-certificate-concurrency.spec] claims cleanup:', e.message));
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      await c.query("SET LOCAL session_replication_role = 'replica'");
      await c.query('DELETE FROM events_log WHERE stream_id = ANY($1)', [claims]);
      await c.query('COMMIT');
    } catch (e) {
      await c.query('ROLLBACK').catch(() => undefined);
      console.error('[death-certificate-concurrency.spec] events_log cleanup:', (e as Error).message);
    } finally {
      c.release();
    }
    await pool.end();
  });

  it('⭐ two District Admins review the SAME certificate at once: the second WAITS on the claim row, then is a typed `stale_supersession` — ONE live review', { timeout: TIMEOUT }, async () => {
    const { cid, uploadId } = await claimWithCertificate();
    const { waited, outcome } = await holderWaiter(
      (holder) => recordDeathCertificateReview(holder, input(cid, uploadId, 'accepted')),
      (waiter) => recordDeathCertificateReview(waiter, input(cid, uploadId, 'rejected')),
    );
    expect(waited, 'the second review did not wait for the first').toBe(true);
    expect(outcome.status).toBe('rejected');
    const reason = (outcome as PromiseRejectedResult).reason;
    expect(reason instanceof DeathCertificateReviewRefusedError && reason.reason === 'stale_supersession', String(reason)).toBe(true);
    const live = await pool.query<{ verdict: string }>(
      'SELECT verdict FROM claim_death_certificate_reviews WHERE claim_case_id = $1 AND superseded_at IS NULL',
      [cid],
    );
    expect(live.rows).toEqual([{ verdict: 'accepted' }]);
  });
});
