// Story 6.19b — the correction chase under TRUE two-connection races (AC2, AC16; AC11b "runs", "races and crashes",
// "the mark"). Own-committing (⛔ NOT `setupLiveDb`): a race needs REAL concurrent COMMITs on SEPARATE pool clients,
// with RLS applying (`SET LOCAL ROLE twt_app`). Cleanup by our own claim ids; assertions key on our OWN ids.
//
// ⭐ WHY THE OUTCOMES ARE DETERMINISTIC: every writer here takes the claim's TRUSTEE advisory lock first, so Postgres
// serialises them — the second acquires it only after the first COMMITS and reads the first's rows.
//   (1) Two SENDS racing one slot (two sweeps enqueued the same child; two pg-boss jobs) ⇒ exactly ONE `send`, ONE row.
//   (2) Two OPENERS racing one claim ⇒ exactly ONE open run (`-267` §1).
//   (3) A District Admin CHANGE racing a SECOND RETURN ⇒ the change lands on whichever return was live under the lock,
//       and the claim ends with exactly one open run, on the LIVE return (⛔ never a run of a superseded return).

import { randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  beginCorrectionFamilySend,
  openCorrectionRun,
  projectClaimState,
  readCorrectionRecipients,
  recordClaimNomineeBankAccounts,
  returnToDistrictAdmin,
  writeCorrectionMark,
} from '../../../src/claim/index.js';
import { bindScopedDb, setPariwarScope } from '../../../src/db.js';
import { claimId as toClaimId, memberId as toMemberId, pariwarId as toPariwarId } from '../../../src/ids/index.js';
import type { ClaimId, MemberId } from '../../../src/ids/index.js';
import { seedNomineeNameCheck } from '../_helpers.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);
const PARIWAR_A = toPariwarId('11111111-1111-1111-1111-111111111111');
const TRUSTEE = '88888888-8888-8888-8888-888888888888';
const DA = '99999999-9999-9999-9999-999999999999';

describe.skipIf(!hasDatabase)('Story 6.19b — the correction chase under two-connection races (own-committing)', { timeout: 20000 }, () => {
  let pool: pg.Pool;
  const createdClaims: string[] = [];

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

  /** A committed claim at `verifier_approved` with accounts, a passing check, a determination and a contact record. */
  async function seedClaim(): Promise<{ cid: ClaimId; mid: MemberId }> {
    const cid = toClaimId(randomUUID());
    const mid = toMemberId(randomUUID());
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
      await emit(null, 'intake_pending', 'claim.intake_initiated', { deceased_member_id: mid, intake_channel: 'member_app', claimant_actor_id: null });
      await emit('intake_pending', 'intake_converged', 'claim.intake_converged');
      await emit('intake_converged', 'documents_pending', 'claim.documents_received');
      await emit('documents_pending', 'verification_in_progress', 'claim.peer_mesh_pinged', {
        selected_member_ids: [randomUUID()],
        metric_id: 'district_cohort_v1',
        metric_version: 1,
      });
      await emit('verification_in_progress', 'verifier_review', 'claim.verifier_reviewing');
      await emit('verifier_review', 'verifier_approved', 'claim.verifier_approved');
      await seedNomineeNameCheck(client, PARIWAR_A, cid);
    });
    return { cid, mid };
  }

  const returnInput = (claimCaseId: ClaimId) => ({
    claimCaseId,
    pariwarId: PARIWAR_A,
    reasonCode: 'other' as const,
    rationaleCiphertext: 'enc:v1:note',
    actorId: TRUSTEE,
    actorDisplay: 'Pariwar Admin One',
    actor: 'trustee' as const,
  });

  const returnMark = (claimCaseId: ClaimId, mustAct: 'family' | 'staff') => ({
    pariwarId: PARIWAR_A,
    claimCaseId,
    mustAct,
    actorId: TRUSTEE,
    actorDisplay: 'Pariwar Admin One',
    setByRole: 'pariwar_admin' as const,
    noteCiphertext: null,
    isReturnMark: true,
  });

  async function returned(mustAct: 'family' | 'staff') {
    const { cid, mid } = await seedClaim();
    const out = await onOwnTx(async (client) => {
      const r = await returnToDistrictAdmin(client, returnInput(cid));
      const m = await writeCorrectionMark(client, returnMark(cid, mustAct));
      return { returnId: r.decision.decisionId as string, runId: m.openedRun!.runId };
    });
    return { cid, mid, ...out };
  }

  async function openRuns(cid: string) {
    const { rows } = await pool.query<{ run_id: string; return_decision_id: string; kind: string }>(
      'SELECT run_id, return_decision_id, kind FROM claim_correction_runs WHERE claim_case_id = $1 AND ended_at IS NULL',
      [cid],
    );
    return rows;
  }

  beforeAll(() => {
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 8, ssl: false, connectionTimeoutMillis: 5000 });
    pool.on('error', (err) => console.error('[correction-chase-concurrency.spec] idle client error:', err.message));
  });

  afterAll(async () => {
    if (createdClaims.length > 0) {
      await pool
        .query('DELETE FROM claims WHERE claim_case_id = ANY($1)', [createdClaims])
        .catch((e: Error) => console.error('[correction-chase-concurrency.spec] claims cleanup:', e.message));
      const c = await pool.connect();
      try {
        await c.query('BEGIN');
        await c.query("SET LOCAL session_replication_role = 'replica'");
        await c.query('DELETE FROM events_log WHERE stream_id = ANY($1)', [createdClaims]);
        await c.query('COMMIT');
      } catch (e) {
        await c.query('ROLLBACK').catch(() => undefined);
        console.error('[correction-chase-concurrency.spec] events_log cleanup:', (e as Error).message);
      } finally {
        c.release();
      }
    }
    await pool.end();
  });

  it('⭐ two sends racing ONE slot ⇒ exactly one `send` and exactly one row', async () => {
    const { cid, runId } = await returned('family');
    const personKey = await onOwnTx(async (client) => (await readCorrectionRecipients(bindScopedDb(client), PARIWAR_A, cid)).people[0]!.personKey);
    const now = new Date();
    const attempt = (jobId: string) =>
      onOwnTx((client) =>
        beginCorrectionFamilySend(client, {
          pariwarId: PARIWAR_A,
          claimCaseId: cid,
          runId,
          slotDay: 1,
          personKey,
          sentOn: '2026-11-02',
          late: false,
          jobId,
          now,
        }),
      );
    const results = await Promise.all([attempt('job-a'), attempt('job-b')]);
    expect(results.filter((r) => r.kind === 'send')).toHaveLength(1);
    expect(results.filter((r) => r.kind === 'noop')).toEqual([{ kind: 'noop', reason: 'held_by_other' }]);
    const { rows } = await pool.query('SELECT outcome FROM claim_correction_reminders WHERE claim_case_id = $1', [cid]);
    expect(rows).toEqual([{ outcome: 'attempting' }]);
  });

  it('⭐ two openers racing one claim ⇒ exactly ONE open run (`-267` §1)', async () => {
    const { cid, returnId } = await returned('family');
    const open = () =>
      onOwnTx((client) =>
        openCorrectionRun(client, {
          pariwarId: PARIWAR_A,
          claimCaseId: cid,
          returnDecisionId: returnId,
          kind: 'direction',
          anchorId: randomUUID(),
          day0: '2026-11-01',
        }),
      );
    const settled = await Promise.allSettled([open(), open()]);
    expect(settled.every((s) => s.status === 'fulfilled')).toBe(true);
    expect(await openRuns(cid)).toHaveLength(1);
  });

  it('⭐ a District Admin change racing a SECOND return ⇒ one open run, on the LIVE return', async () => {
    const { cid, returnId: firstReturn } = await returned('family');
    // Resubmit the first return in SEPARATE transactions (distinct `now()`s): the family's rewrite, then the re-check.
    await onOwnTx((client) =>
      recordClaimNomineeBankAccounts(client, {
        claimCaseId: cid,
        pariwarId: PARIWAR_A,
        accounts: ([1, 2] as const).map((rank) => ({
          accountRank: rank,
          accountHolderNameCiphertext: `enc:v1:h2-${rank}`,
          accountNumberCiphertext: `enc:v1:a2-${rank}`,
          ifscCiphertext: `enc:v1:i2-${rank}`,
          vpaCiphertext: null,
          nameDifferenceNoteCiphertext: null,
          bankName: 'HDFC Bank',
          branch: null,
          ifscValidated: true,
        })),
        recordedByActor: 'd4d4d4d4-d4d4-d4d4-d4d4-d4d4d4d4d4d4',
        actor: 'operator',
        allowCorrection: true,
        correctionReason: 'the family gave the corrected details by phone',
      } as never),
    );
    await onOwnTx((client) => seedNomineeNameCheck(client, PARIWAR_A, cid, { reuseAccounts: true }));

    const secondReturn = onOwnTx(async (client) => {
      const r = await returnToDistrictAdmin(client, returnInput(cid));
      await writeCorrectionMark(client, returnMark(cid, 'family'));
      return r.decision.decisionId as string;
    });
    const change = onOwnTx((client) =>
      writeCorrectionMark(client, {
        pariwarId: PARIWAR_A,
        claimCaseId: cid,
        mustAct: 'staff',
        actorId: DA,
        actorDisplay: 'District Admin One',
        setByRole: 'district_admin',
        noteCiphertext: 'enc:v1:change',
      }),
    );
    const [second, changed] = await Promise.all([secondReturn, change]);
    expect([firstReturn, second]).toContain(changed.mark.returnDecisionId);
    const open = await openRuns(cid);
    expect(open).toHaveLength(1);
    expect(open[0]!.return_decision_id).toBe(second);
  });
});
