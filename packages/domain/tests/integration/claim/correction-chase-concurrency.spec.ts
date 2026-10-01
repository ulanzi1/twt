// Story 6.19b — the correction chase under TRUE two-connection races (AC2, AC16; AC11b "runs", "races and crashes",
// "the mark"). Own-committing (⛔ NOT `setupLiveDb`): a race needs REAL concurrent COMMITs on SEPARATE pool clients,
// with RLS applying (`SET LOCAL ROLE twt_app`). Cleanup by our own claim ids — and it FAILS LOUDLY (a swallowed
// cleanup error leaves committed rows in the shared DB for every later suite); assertions key on our OWN ids.
//
// ⭐ THE OVERLAP IS FORCED, ⛔ never hoped for. Two `Promise.all`ed transactions on separate clients may simply run one
// after the other — a "race" that never raced. So each race here: a THIRD client takes the claim's trustee advisory
// lock and holds it; the racers are launched one at a time, each confirmed WAITING on that lock in `pg_locks` before
// the next starts; then the holder commits. Postgres grants a contended exclusive lock to its waiters in QUEUE order,
// so the launch order is the order they run — and each test asserts the outcome FOR the order that ran.
//   (1) Two SENDS racing one slot (two sweeps enqueued the same child; two pg-boss jobs) ⇒ exactly ONE `send`, ONE row.
//   (2) Two OPENERS racing one claim ⇒ exactly ONE open run (`-267` §1), and the full history says why.
//   (3) A District Admin CHANGE racing a SECOND RETURN, in BOTH orders ⇒ the change lands on whichever return was live
//       under the lock, the run history is exactly that order's, and the claim ends with exactly one open run — on the
//       LIVE return (⛔ never a run of a superseded return).

import { randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  acquireCorrectionChaseLock,
  beginCorrectionFamilySend,
  openCorrectionRun,
  projectClaimState,
  readCorrectionRecipients,
  recordClaimNomineeBankAccounts,
  returnToDistrictAdmin,
  stateTrusteeDecisionAdvisoryLockKey,
  writeCorrectionMark,
} from '../../../src/claim/index.js';
import { bindScopedDb, setPariwarScope } from '../../../src/db.js';
import { createFakeKmsProvider, type FieldCryptoDeps } from '../../../src/encryption/index.js';
import { claimId as toClaimId, memberId as toMemberId, pariwarId as toPariwarId } from '../../../src/ids/index.js';
import type { ClaimId, MemberId } from '../../../src/ids/index.js';
import { seedNomineeNameCheck } from '../_helpers.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);
const PARIWAR_A = toPariwarId('11111111-1111-1111-1111-111111111111');
const TRUSTEE = '88888888-8888-8888-8888-888888888888';
const DA = '99999999-9999-9999-9999-999999999999';
const ENC: FieldCryptoDeps = {
  kms: createFakeKmsProvider({ kekBytes: new Uint8Array(32).fill(7), hmacKeyBytes: new Uint8Array(32).fill(9) }),
  kekRef: { resourceName: 'fake:correction-chase-concurrency-kek' },
  hmacKeyRef: { resourceName: 'fake:correction-chase-concurrency-hmac' },
};

describe.skipIf(!hasDatabase)('Story 6.19b — the correction chase under two-connection races (own-committing)', { timeout: 30000 }, () => {
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

  async function runHistory(cid: string) {
    const { rows } = await pool.query<{ run_id: string; return_decision_id: string; kind: string; end_reason: string | null }>(
      'SELECT run_id, return_decision_id, kind, end_reason FROM claim_correction_runs WHERE claim_case_id = $1 ORDER BY opened_at, run_id',
      [cid],
    );
    return rows;
  }

  // ── The forced overlap ─────────────────────────────────────────────────────────────────────────────────────────

  /** The claim's trustee advisory lock as `pg_locks` shows it (a bigint key: classid = high 32 bits, objid = low). */
  function lockKeyParts(cid: string): { readonly hi: string; readonly lo: string } {
    const key = BigInt.asUintN(64, stateTrusteeDecisionAdvisoryLockKey(PARIWAR_A, cid));
    return { hi: String(key >> 32n), lo: String(key & 0xffffffffn) };
  }

  async function waitersOn(cid: string): Promise<number> {
    const { hi, lo } = lockKeyParts(cid);
    const { rows } = await pool.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM pg_locks
        WHERE locktype = 'advisory' AND NOT granted AND classid::bigint = $1 AND objid::bigint = $2 AND objsubid = 1`,
      [hi, lo],
    );
    return rows[0]!.n;
  }

  async function untilWaiters(cid: string, n: number): Promise<void> {
    const deadline = Date.now() + 10_000;
    while ((await waitersOn(cid)) < n) {
      if (Date.now() > deadline) throw new Error(`[correction-chase-concurrency.spec] ${n} racer(s) never queued on the trustee lock of ${cid}`);
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }

  /**
   * ⭐ Run `racers` GENUINELY concurrently: a third client holds the claim's trustee lock; each racer is launched and
   * confirmed WAITING on it before the next starts (so the queue order is the launch order); then the lock is released.
   */
  async function overlapped<T>(cid: string, racers: readonly (() => Promise<T>)[]): Promise<PromiseSettledResult<T>[]> {
    const holder = await pool.connect();
    const running: Promise<T>[] = [];
    try {
      await holder.query('BEGIN');
      await acquireCorrectionChaseLock(holder, PARIWAR_A, cid);
      for (const [i, start] of racers.entries()) {
        const p = start();
        p.catch(() => undefined); // observed below by `allSettled` — ⛔ an unhandled rejection while we wait
        running.push(p);
        await untilWaiters(cid, i + 1);
      }
      expect(await waitersOn(cid)).toBe(racers.length); // ⭐ all of them were blocked at once — the overlap is real
    } finally {
      await holder.query('COMMIT').catch(() => undefined);
      holder.release();
    }
    return Promise.allSettled(running);
  }

  const fulfilled = <T>(s: PromiseSettledResult<T>): T => {
    if (s.status !== 'fulfilled') throw s.reason;
    return s.value;
  };

  beforeAll(() => {
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 8, ssl: false, connectionTimeoutMillis: 5000 });
    pool.on('error', (err) => console.error('[correction-chase-concurrency.spec] idle client error:', err.message));
  });

  // ⭐ FAILS LOUDLY: every cleanup step's error is collected (⛔ never `.catch(() => undefined)`), the remaining rows are
  // COUNTED, and the hook throws if anything is left — committed rows must ⛔ never silently outlive this suite.
  afterAll(async () => {
    const errors: string[] = [];
    try {
      if (createdClaims.length > 0) {
        try {
          await pool.query('DELETE FROM claims WHERE claim_case_id = ANY($1)', [createdClaims]);
        } catch (e) {
          errors.push(`claims: ${(e as Error).message}`);
        }
        const c = await pool.connect();
        try {
          await c.query('BEGIN');
          await c.query("SET LOCAL session_replication_role = 'replica'");
          await c.query('DELETE FROM events_log WHERE stream_id = ANY($1)', [createdClaims]);
          await c.query('COMMIT');
        } catch (e) {
          await c.query('ROLLBACK').catch(() => undefined);
          errors.push(`events_log: ${(e as Error).message}`);
        } finally {
          c.release();
        }
        const left = await pool.query<{ claims: number; runs: number; events: number }>(
          `SELECT (SELECT count(*) FROM claims WHERE claim_case_id = ANY($1))::int AS claims,
                  (SELECT count(*) FROM claim_correction_runs WHERE claim_case_id = ANY($1))::int AS runs,
                  (SELECT count(*) FROM events_log WHERE stream_id = ANY($1))::int AS events`,
          [createdClaims],
        );
        const l = left.rows[0]!;
        if (l.claims + l.runs + l.events > 0) errors.push(`rows remain: ${JSON.stringify(l)}`);
      }
    } finally {
      await pool.end();
    }
    if (errors.length > 0) throw new Error(`[correction-chase-concurrency.spec] cleanup FAILED — ${errors.join('; ')}`);
  });

  it('⭐ two sends racing ONE slot (forced overlap) ⇒ exactly one `send` and exactly one row', async () => {
    const { cid, runId } = await returned('family');
    const personKey = await onOwnTx(async (client) => (await readCorrectionRecipients(bindScopedDb(client), PARIWAR_A, cid)).people[0]!.personKey);
    const now = new Date();
    const attempt = (jobId: string) => () =>
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
          crypto: ENC,
        }),
      );
    const results = (await overlapped(cid, [attempt('job-a'), attempt('job-b')])).map(fulfilled);
    // The first in the queue claims; the second reads its committed row and stands down.
    expect(results[0]).toMatchObject({ kind: 'send' });
    expect(results[1]).toEqual({ kind: 'noop', reason: 'held_by_other' });
    const { rows } = await pool.query('SELECT outcome, claimed_by_job FROM claim_correction_reminders WHERE claim_case_id = $1', [cid]);
    expect(rows).toEqual([{ outcome: 'attempting', claimed_by_job: 'job-a' }]);
  });

  it('⭐ two openers racing one claim (forced overlap) ⇒ exactly ONE open run, and the full history: each opener superseded the run before it', async () => {
    const { cid, returnId, runId } = await returned('family');
    const open = () => () =>
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
    const [a, b] = (await overlapped(cid, [open(), open()])).map(fulfilled);
    expect((await runHistory(cid)).map((r) => [r.run_id, r.kind, r.end_reason])).toEqual([
      [runId, 'family', 'superseded'],
      [a!.runId, 'direction', 'superseded'],
      [b!.runId, 'direction', null],
    ]);
  });

  for (const order of ['change first', 'second return first'] as const) {
    it(`⭐ a District Admin change racing a SECOND return (${order}) ⇒ the history of THAT order, one open run, on the LIVE return`, async () => {
      const { cid, returnId: firstReturn, runId: firstRun } = await returned('family');
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

      const secondReturn = () =>
        onOwnTx(async (client) => {
          const r = await returnToDistrictAdmin(client, returnInput(cid));
          await writeCorrectionMark(client, returnMark(cid, 'family'));
          return { kind: 'return' as const, decisionId: r.decision.decisionId as string };
        });
      const change = () =>
        onOwnTx(async (client) => ({
          kind: 'change' as const,
          result: await writeCorrectionMark(client, {
            pariwarId: PARIWAR_A,
            claimCaseId: cid,
            mustAct: 'staff',
            actorId: DA,
            actorDisplay: 'District Admin One',
            setByRole: 'district_admin',
            noteCiphertext: 'enc:v1:change',
          }),
        }));
      const settled = (await overlapped<{ kind: 'return'; decisionId: string } | { kind: 'change'; result: Awaited<ReturnType<typeof writeCorrectionMark>> }>(
        cid,
        order === 'change first' ? [change, secondReturn] : [secondReturn, change],
      )).map(fulfilled);
      const ret = settled.find((s) => s.kind === 'return');
      const chg = settled.find((s) => s.kind === 'change');
      if (ret?.kind !== 'return' || chg?.kind !== 'change') throw new Error('both racers must complete');
      const second = ret.decisionId;
      const history = (await runHistory(cid)).map((r) => [r.kind, r.end_reason, r.return_decision_id]);

      if (order === 'change first') {
        // The change landed on the FIRST return (live under the lock): family → staff on it; then the second return
        // superseded that staff run and opened its own family run.
        expect(chg.result.mark.returnDecisionId).toBe(firstReturn);
        expect(chg.result.endedRun).toMatchObject({ runId: firstRun, endReason: 'mark_changed' });
        expect(history).toEqual([
          ['family', 'mark_changed', firstReturn],
          ['staff', 'superseded', firstReturn],
          ['family', null, second],
        ]);
      } else {
        // The second return landed first (its family run superseded the first's); the change then switched THE
        // SECOND return to staff.
        expect(chg.result.mark.returnDecisionId).toBe(second);
        expect(history).toEqual([
          ['family', 'superseded', firstReturn],
          ['family', 'mark_changed', second],
          ['staff', null, second],
        ]);
      }
      const open = history.filter((h) => h[1] === null);
      expect(open).toHaveLength(1);
      expect(open[0]![2]).toBe(second);
    });
  }
});
