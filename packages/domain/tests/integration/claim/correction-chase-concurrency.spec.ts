// Story 6.19b — the correction chase under TRUE two-connection races (AC2, AC16; AC11b "runs", "races and crashes",
// "the mark"). Own-committing (⛔ NOT `setupLiveDb`): a race needs REAL concurrent COMMITs on SEPARATE pool clients,
// with RLS applying (`SET LOCAL ROLE twt_app`). Cleanup by our own claim AND deceased-member ids — every row the
// fixtures commit (the claim and its cascade, its event stream, the deceased's `members` row with its nominees and
// versions, the contact agreement's consent) is deleted and then COUNTED — and it FAILS LOUDLY (a swallowed cleanup
// error leaves committed rows in the shared DB for every later suite); assertions key on our OWN ids.
// ⭐ A DEDICATED PARIWAR (`PARIWAR_RACE`): the claims committed here are RETURNED, and a committed returned claim in the
// shared `PARIWAR_A` could take a Pariwar-wide queue's `limit: 1` slot in another spec's per-test transaction. ⛔ No
// per-test spec queries this Pariwar. Nothing to seed for it: `pariwar_id` carries ⛔ no FK, and every row the claim
// needs is seeded per claim by the helpers (`seedNomineeNameCheck` — accounts, certificate, determination, contact).
// ⭐ BOUNDED: every transaction here (racers, holder, setup) runs under `SET LOCAL lock_timeout` + `statement_timeout`,
// and the racers' settlement has a DEADLINE that TERMINATES their backends — ⛔ a wedged racer never outlives its test.
//
// ⭐ THE OVERLAP IS FORCED, ⛔ never hoped for. Two `Promise.all`ed transactions on separate clients may simply run one
// after the other — a "race" that never raced. So each race here: a THIRD client takes the claim's trustee advisory
// lock and holds it; the racers are launched one at a time, each confirmed WAITING on that lock in `pg_locks` before
// the next starts; then the holder commits. Postgres grants a contended exclusive lock to its waiters in QUEUE order,
// so the launch order is the order they run — and each test asserts the outcome FOR the order that ran.
// ⭐ The racers SETTLE before `overlapped` returns or throws, on every path (⛔ a racer committing after the cleanup),
// and a racer that fails BEFORE it queues surfaces with ITS OWN error (⛔ a 10 s "never queued" timeout hiding it).
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
/** ⭐ This file's OWN Pariwar — ⛔ the shared `PARIWAR_A` (see the header). */
const PARIWAR_RACE = toPariwarId('6190b0c0-6190-4b19-8b19-000000006190');
/** A racer waits on the holder's lock while the NEXT racer is launched and confirmed (≤ 10 s each) — so its bound sits
 * above that, and below the settlement deadline. */
const RACER_LOCK_TIMEOUT = '20s';
const RACER_STATEMENT_TIMEOUT = '25s';
/** The holder only TAKES the lock (free — the claim is ours) and commits. */
const HOLDER_LOCK_TIMEOUT = '5s';
const HOLDER_STATEMENT_TIMEOUT = '10s';
/** After the holder lets go, every racer must SETTLE within this — else their backends are terminated. */
const SETTLE_DEADLINE_MS = 30_000;
const TRUSTEE = '88888888-8888-8888-8888-888888888888';
const DA = '99999999-9999-9999-9999-999999999999';
const ENC: FieldCryptoDeps = {
  kms: createFakeKmsProvider({ kekBytes: new Uint8Array(32).fill(7), hmacKeyBytes: new Uint8Array(32).fill(9) }),
  kekRef: { resourceName: 'fake:correction-chase-concurrency-kek' },
  hmacKeyRef: { resourceName: 'fake:correction-chase-concurrency-hmac' },
};

// ⚠ The test timeout sits ABOVE every internal bound (two racers queued ≤ 10 s each + the 30 s settlement deadline): a
// vitest timeout abandons the test's promises — exactly what the bounds exist to prevent.
describe.skipIf(!hasDatabase)('Story 6.19b — the correction chase under two-connection races (own-committing)', { timeout: 60000 }, () => {
  let pool: pg.Pool;
  const createdClaims: string[] = [];
  const createdMembers: string[] = [];

  /** The backend pids of the transactions in flight — what the settlement deadline terminates. */
  const livePids = new Set<number>();

  async function onOwnTx<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    let pid: number | undefined;
    let broken: Error | undefined;
    try {
      await client.query('BEGIN');
      // ⭐ BOUNDED: ⛔ a lock wait or a statement that never returns (the racers wait on the holder's lock on purpose).
      await client.query(`SET LOCAL lock_timeout = '${RACER_LOCK_TIMEOUT}'`);
      await client.query(`SET LOCAL statement_timeout = '${RACER_STATEMENT_TIMEOUT}'`);
      pid = (await client.query<{ pid: number }>('SELECT pg_backend_pid() AS pid')).rows[0]!.pid;
      livePids.add(pid);
      await client.query('SET LOCAL ROLE twt_app');
      await setPariwarScope(client, PARIWAR_RACE);
      const out = await fn(client);
      await client.query('COMMIT');
      return out;
    } catch (err) {
      // A terminated backend cannot even roll back — ⛔ back to the pool then (`release(err)` destroys the client).
      await client.query('ROLLBACK').catch((e: unknown) => {
        broken = e as Error;
      });
      throw err;
    } finally {
      if (pid !== undefined) livePids.delete(pid);
      client.release(broken);
    }
  }

  /** A committed claim at `verifier_approved` with accounts, a passing check, a determination and a contact record. */
  async function seedClaim(): Promise<{ cid: ClaimId; mid: MemberId }> {
    const cid = toClaimId(randomUUID());
    const mid = toMemberId(randomUUID());
    createdClaims.push(cid);
    createdMembers.push(mid); // `seedNomineeNameCheck` declares the deceased's nominees — their `members` row is ours too
    await onOwnTx(async (client) => {
      const emit = (from: string | null, to: string, eventType: string, extra: Record<string, unknown> = {}) =>
        projectClaimState(client, {
          claimCaseId: cid,
          pariwarId: PARIWAR_RACE,
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
      await seedNomineeNameCheck(client, PARIWAR_RACE, cid);
    });
    return { cid, mid };
  }

  const returnInput = (claimCaseId: ClaimId) => ({
    claimCaseId,
    pariwarId: PARIWAR_RACE,
    reasonCode: 'other' as const,
    rationaleCiphertext: 'enc:v1:note',
    actorId: TRUSTEE,
    actorDisplay: 'Pariwar Admin One',
    actor: 'trustee' as const,
  });

  const returnMark = (claimCaseId: ClaimId, mustAct: 'family' | 'staff') => ({
    pariwarId: PARIWAR_RACE,
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
      return { returnId: r.decision.decisionId as string, runId: m.openedRun!.runId, day0: m.openedRun!.day0 };
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
    const key = BigInt.asUintN(64, stateTrusteeDecisionAdvisoryLockKey(PARIWAR_RACE, cid));
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

  /** The pid HOLDING the claim's trustee lock (granted), or `null` — ties the polled key to the lock really taken. */
  async function holderOf(cid: string): Promise<number | null> {
    const { hi, lo } = lockKeyParts(cid);
    const { rows } = await pool.query<{ pid: number }>(
      `SELECT pid FROM pg_locks
        WHERE locktype = 'advisory' AND granted AND classid::bigint = $1 AND objid::bigint = $2 AND objsubid = 1`,
      [hi, lo],
    );
    return rows[0]?.pid ?? null;
  }

  type Outcome<T> = PromiseSettledResult<T> | null;

  /**
   * Poll until `n` racers wait on the claim's lock. ⭐ RACED against the racers' own settlement: a racer that settles
   * while we wait never queued (it failed before the lock, or never took it) — its OWN error is rethrown (⛔ masked by
   * the 10 s "never queued"), and one that returned is a race that never raced.
   */
  async function untilWaiters<T>(cid: string, n: number, outcomes: readonly Outcome<T>[]): Promise<void> {
    const deadline = Date.now() + 10_000;
    while ((await waitersOn(cid)) < n) {
      const settled = outcomes.findIndex((o) => o !== null);
      if (settled >= 0) {
        const o = outcomes[settled]!;
        if (o.status === 'rejected') throw o.reason;
        throw new Error(`[correction-chase-concurrency.spec] racer ${settled} COMPLETED without queuing on the trustee lock of ${cid} — the overlap was not forced`);
      }
      if (Date.now() > deadline) throw new Error(`[correction-chase-concurrency.spec] ${n} racer(s) never queued on the trustee lock of ${cid}`);
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }

  /**
   * ⭐ Every racer SETTLES within `SETTLE_DEADLINE_MS`. Past it, the racers' backends still in flight are TERMINATED
   * (`pg_terminate_backend` — the pending query rejects, the transaction never commits) and their settlement is
   * awaited once more (bounded too), then it THROWS — ⛔ an unbounded `allSettled` that hangs the suite, ⛔ a racer
   * left to commit after its test moved on.
   */
  async function settleWithin<T>(running: readonly Promise<T>[]): Promise<PromiseSettledResult<T>[]> {
    const bounded = async (ms: number): Promise<PromiseSettledResult<T>[] | 'deadline'> => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const deadline = new Promise<'deadline'>((resolve) => {
        timer = setTimeout(() => resolve('deadline'), ms);
      });
      try {
        return await Promise.race([Promise.allSettled(running), deadline]);
      } finally {
        clearTimeout(timer);
      }
    };
    const first = await bounded(SETTLE_DEADLINE_MS);
    if (first !== 'deadline') return first;
    const pids = [...livePids];
    await pool.query('SELECT pg_terminate_backend(pid) FROM unnest($1::int[]) AS pid', [pids]);
    const second = await bounded(5_000);
    throw new Error(
      `[correction-chase-concurrency.spec] racers did not settle within ${SETTLE_DEADLINE_MS} ms — backends ${JSON.stringify(pids)} terminated${second === 'deadline' ? ', and still unsettled 5 s later' : ''}`,
    );
  }

  /**
   * ⭐ Run `racers` GENUINELY concurrently: a third client holds the claim's trustee lock; each racer is launched and
   * confirmed WAITING on it before the next starts (so the queue order is the launch order); then the lock is released.
   * ⭐ On EVERY exit path the holder lets go and every launched racer SETTLES before this returns or rethrows — ⛔ a
   * racer left running would commit after the test (and its cleanup) moved on.
   */
  async function overlapped<T>(cid: string, racers: readonly (() => Promise<T>)[]): Promise<PromiseSettledResult<T>[]> {
    const holder = await pool.connect();
    const running: Promise<T>[] = [];
    const outcomes: Outcome<T>[] = [];
    let holderBroken: Error | undefined;
    let settled: PromiseSettledResult<T>[] | undefined;
    let settleError: unknown;
    try {
      await holder.query('BEGIN');
      await holder.query(`SET LOCAL lock_timeout = '${HOLDER_LOCK_TIMEOUT}'`);
      await holder.query(`SET LOCAL statement_timeout = '${HOLDER_STATEMENT_TIMEOUT}'`);
      await acquireCorrectionChaseLock(holder, PARIWAR_RACE, cid);
      // ⭐ The key we poll IS the lock the holder took (⛔ two derivations that could drift apart).
      const { rows } = await holder.query<{ pid: number }>('SELECT pg_backend_pid() AS pid');
      expect(await holderOf(cid)).toBe(rows[0]!.pid);
      for (const [i, start] of racers.entries()) {
        const p = start();
        outcomes.push(null);
        p.then(
          (value) => {
            outcomes[i] = { status: 'fulfilled', value };
          },
          (reason: unknown) => {
            outcomes[i] = { status: 'rejected', reason };
          },
        );
        running.push(p);
        await untilWaiters(cid, i + 1, outcomes);
      }
      expect(await waitersOn(cid)).toBe(racers.length); // ⭐ all of them were blocked at once — the overlap is real
    } finally {
      try {
        await holder.query('COMMIT');
      } catch (err) {
        holderBroken = err as Error; // ⛔ never back to the pool — a destroyed client's session (and lock) ends
      }
      holder.release(holderBroken);
      // ⭐ EVERY path: the racers settle (or are terminated past the deadline) before we return or rethrow. When the
      // body threw, ITS error wins.
      try {
        settled = await settleWithin(running);
      } catch (err) {
        settleError = err;
      }
    }
    if (settleError !== undefined) throw settleError;
    // ⛔ A holder that could not COMMIT let go of the lock by losing its session — the queue order is then unproven.
    if (holderBroken !== undefined) throw holderBroken;
    return settled!;
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
  // ORDER: the claims first (their ON DELETE cascade takes the trustee decisions, the runs / marks / reminders /
  // letters, the accounts, the certificate, the determination and the CONTACT RECORD with its nominee rows — which
  // releases the agreement consent's FK), then the
  // agreement consents, then the deceased members (their cascade takes `member_nominees` and the append-only
  // `member_nominee_versions` — its delete trigger lets a cascade through), then the event streams (append-only by
  // trigger ⇒ `replica` for that one statement).
  afterAll(async () => {
    const errors: string[] = [];
    const step = async (what: string, sql: string, params: unknown[]): Promise<void> => {
      try {
        await pool.query(sql, params);
      } catch (e) {
        errors.push(`${what}: ${(e as Error).message}`);
      }
    };
    try {
      if (createdClaims.length > 0) {
        // The determinations' ids BEFORE the cascade — their items carry ⛔ no claim id to count them by afterwards.
        let determinationIds: string[] = [];
        try {
          determinationIds = (
            await pool.query<{ id: string }>('SELECT determination_id AS id FROM nominee_determinations WHERE claim_case_id = ANY($1)', [
              createdClaims,
            ])
          ).rows.map((r) => r.id);
        } catch (e) {
          errors.push(`determination ids: ${(e as Error).message}`);
        }
        await step('claims', 'DELETE FROM claims WHERE claim_case_id = ANY($1)', [createdClaims]);
        await step(
          'consent_records',
          "DELETE FROM consent_records WHERE consent_type = 'claim_contact_agreement' AND consent_artifact_ref = ANY($1::text[])",
          [createdClaims],
        );
        await step('members', 'DELETE FROM members WHERE member_id = ANY($1)', [createdMembers]);
        const streams = [...createdClaims, ...createdMembers];
        const c = await pool.connect();
        try {
          await c.query('BEGIN');
          await c.query("SET LOCAL session_replication_role = 'replica'");
          await c.query('DELETE FROM events_log WHERE stream_id = ANY($1)', [streams]);
          await c.query('COMMIT');
        } catch (e) {
          await c.query('ROLLBACK').catch(() => undefined);
          errors.push(`events_log: ${(e as Error).message}`);
        } finally {
          c.release();
        }
        // ⭐ EVERY table the fixtures and the races write — ⛔ a subset that would pass while (say) the reminders or the
        // decisions stayed behind.
        const left = await pool.query<Record<string, number>>(
          `SELECT (SELECT count(*) FROM claims WHERE claim_case_id = ANY($1))::int AS claims,
                  (SELECT count(*) FROM claim_state_trustee_decisions WHERE claim_case_id = ANY($1))::int AS decisions,
                  (SELECT count(*) FROM claim_correction_runs WHERE claim_case_id = ANY($1))::int AS runs,
                  (SELECT count(*) FROM claim_correction_marks WHERE claim_case_id = ANY($1))::int AS marks,
                  (SELECT count(*) FROM claim_correction_reminders WHERE claim_case_id = ANY($1))::int AS reminders,
                  (SELECT count(*) FROM claim_correction_letters WHERE claim_case_id = ANY($1))::int AS letters,
                  (SELECT count(*) FROM claim_nominee_bank_accounts WHERE claim_case_id = ANY($1))::int AS bank_accounts,
                  (SELECT count(*) FROM claim_documents WHERE claim_case_id = ANY($1))::int AS claim_documents,
                  (SELECT count(*) FROM claim_death_certificate_uploads WHERE claim_case_id = ANY($1))::int AS certificate_uploads,
                  (SELECT count(*) FROM claim_death_certificate_reviews WHERE claim_case_id = ANY($1))::int AS certificate_reviews,
                  (SELECT count(*) FROM nominee_determinations WHERE claim_case_id = ANY($1))::int AS determinations,
                  (SELECT count(*) FROM nominee_determination_items WHERE determination_id = ANY($5::uuid[]))::int AS determination_items,
                  (SELECT count(*) FROM claim_contacts WHERE claim_case_id = ANY($1))::int AS claim_contacts,
                  (SELECT count(*) FROM claim_contact_nominees WHERE claim_case_id = ANY($1))::int AS contact_nominees,
                  (SELECT count(*) FROM consent_records
                    WHERE consent_artifact_ref = ANY($4::text[]) OR subject_id = ANY($2))::int AS consent_records,
                  (SELECT count(*) FROM members WHERE member_id = ANY($2))::int AS members,
                  (SELECT count(*) FROM member_nominees WHERE member_id = ANY($2))::int AS member_nominees,
                  (SELECT count(*) FROM member_nominee_versions WHERE member_id = ANY($2))::int AS member_nominee_versions,
                  (SELECT count(*) FROM events_log WHERE stream_id = ANY($3))::int AS events`,
          [createdClaims, createdMembers, streams, createdClaims, determinationIds],
        );
        const l = left.rows[0]!;
        if (Object.values(l).some((n) => n > 0)) errors.push(`rows remain: ${JSON.stringify(l)}`);
      }
    } finally {
      await pool.end();
    }
    if (errors.length > 0) throw new Error(`[correction-chase-concurrency.spec] cleanup FAILED — ${errors.join('; ')}`);
  });

  it('⭐ two sends racing ONE slot (forced overlap) ⇒ exactly one `send` and exactly one row', async () => {
    const { cid, runId } = await returned('family');
    const personKey = await onOwnTx(async (client) => (await readCorrectionRecipients(bindScopedDb(client), PARIWAR_RACE, cid)).people[0]!.personKey);
    const now = new Date();
    const attempt = (jobId: string) => () =>
      onOwnTx((client) =>
        beginCorrectionFamilySend(client, {
          pariwarId: PARIWAR_RACE,
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
    const { cid, returnId, runId, day0 } = await returned('family');
    const open = () => () =>
      onOwnTx((client) =>
        openCorrectionRun(client, {
          pariwarId: PARIWAR_RACE,
          claimCaseId: cid,
          returnDecisionId: returnId,
          kind: 'direction',
          anchorId: randomUUID(),
          day0, // the return's own day 0 (⛔ a fixed calendar date — a date bomb)
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
          pariwarId: PARIWAR_RACE,
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
      await onOwnTx((client) => seedNomineeNameCheck(client, PARIWAR_RACE, cid, { reuseAccounts: true }));

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
            pariwarId: PARIWAR_RACE,
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
