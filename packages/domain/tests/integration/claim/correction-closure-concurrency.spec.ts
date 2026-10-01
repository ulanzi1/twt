// Story 6.19c — the correction closure under TRUE two-connection races (AC11c "Two-connection races": each race ⇒
// EXACTLY one outcome, the loser a typed refusal). Own-committing (⛔ NOT `setupLiveDb`) — a race needs REAL concurrent
// COMMITs on SEPARATE pool clients with RLS applying. The machinery is `correction-chase-concurrency.spec.ts`'s (its
// header is the reference): a DEDICATED Pariwar, BOUNDED racers (`lock_timeout` / `statement_timeout`, a settlement
// deadline that TERMINATES their backends), a cleanup that DELETES and then COUNTS every row it wrote and FAILS LOUDLY.
//
// ⭐ THE OVERLAP IS FORCED. A third client HOLDS the claim's locks — the trustee ADVISORY lock, and (for a race against
// a family correction, whose bank writer takes ONLY the claim ROW lock — S-T2) the claim ROW lock too — and each racer
// is launched and confirmed BLOCKED (any ungranted lock of its backend, in `pg_locks`) before the next starts. Where
// both racers queue on the same lock the queue order is the launch order; where one queues on the row lock and the
// other on the advisory lock, the row-lock racer runs first (the advisory racer then queues on the row lock behind it)
// — each test asserts the outcome FOR the order that runs.
//   (1) Two closure DECISIONS (approve × decline) ⇒ the first decides, the second is refused.
//   (2) A RETURN racing a closure (the claim corrected after the request) ⇒ the return lands; the approval is refused
//       (`claim_corrected` / `request_lapsed`), in BOTH orders.
//   (3) A closure REQUEST racing a family correction ⇒ the correction lands first; the request is `claim_corrected`.
//   (4) A Super Admin CLOSE racing a family correction ⇒ the same.
//   (5) D27's APPROVE racing a mark change, in BOTH orders, and racing a family correction ⇒ exactly one.
//   (6) A DECLINE racing a VOTE (the route's guard + the vote, one tx) on a resubmitted claim ⇒ exactly one, both orders.

import { randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  acquireCorrectionChaseLock,
  approveNoCorrectionNeeded,
  assertCorrectionClaimNotHeld,
  claimCorrectionReminder,
  currentCorrectionNumberHash,
  decideCorrectionClosure,
  decideEscalatedClosure,
  finaliseCorrectionReminder,
  isCorrectionClaimHeld,
  noCorrectionHold,
  projectClaimState,
  readCorrectionRecipients,
  recordClaimNomineeBankAccounts,
  recordNoCorrectionNeeded,
  requestCorrectionClosure,
  returnToDistrictAdmin,
  voteOnFrozenClaim,
  writeCorrectionMark,
} from '../../../src/claim/index.js';
import { addCalendarDays } from '../../../src/cycle-calendar/holiday-resolver.js';
import { bindScopedDb, setPariwarScope } from '../../../src/db.js';
import {
  MEMBER_NOMINEE_FIELD_CLASS,
  createFakeKmsProvider,
  encryptTier1,
  serializeEnvelope,
  type FieldCryptoDeps,
} from '../../../src/encryption/index.js';
import { claimId as toClaimId, memberId as toMemberId, pariwarId as toPariwarId } from '../../../src/ids/index.js';
import type { ClaimId, MemberId } from '../../../src/ids/index.js';
import { seedNomineeDeclaration, seedNomineeNameCheck } from '../_helpers.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);
/** ⭐ This file's OWN Pariwar — ⛔ the shared `PARIWAR_A`. */
const PARIWAR_RACE = toPariwarId('619c0c10-619c-4c19-8c19-00000000619c');
const RACER_LOCK_TIMEOUT = '20s';
const RACER_STATEMENT_TIMEOUT = '25s';
const HOLDER_LOCK_TIMEOUT = '5s';
const HOLDER_STATEMENT_TIMEOUT = '10s';
const SETTLE_DEADLINE_MS = 30_000;
const TRUSTEE = '7a7a7a7a-7a7a-4a7a-8a7a-7a7a7a7a7a7a';
const DA = '7b7b7b7b-7b7b-4b7b-8b7b-7b7b7b7b7b7b';
const SA = '7c7c7c7c-7c7c-4c7c-8c7c-7c7c7c7c7c7c';
const KMS = createFakeKmsProvider({ kekBytes: new Uint8Array(32).fill(7), hmacKeyBytes: new Uint8Array(32).fill(9) });
const ENC: FieldCryptoDeps = {
  kms: KMS,
  kekRef: { resourceName: 'fake:correction-closure-concurrency-kek' },
  hmacKeyRef: { resourceName: 'fake:correction-closure-concurrency-hmac' },
};
const tenAmIst = (date: string) => new Date(`${date}T04:30:00.000Z`);

describe.skipIf(!hasDatabase)('Story 6.19c — the correction closure under two-connection races (own-committing)', { timeout: 60000 }, () => {
  let pool: pg.Pool;
  const createdClaims: string[] = [];
  const createdMembers: string[] = [];
  const livePids = new Set<number>();

  async function onOwnTx<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    let pid: number | undefined;
    let broken: Error | undefined;
    try {
      await client.query('BEGIN');
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
      await client.query('ROLLBACK').catch((e: unknown) => {
        broken = e as Error;
      });
      throw err;
    } finally {
      if (pid !== undefined) livePids.delete(pid);
      client.release(broken);
    }
  }

  async function encryptNomineeMobile(plaintext: string): Promise<string> {
    return serializeEnvelope(
      await encryptTier1(Buffer.from(plaintext, 'utf-8'), { pariwarId: PARIWAR_RACE, fieldClass: MEMBER_NOMINEE_FIELD_CLASS }, KMS, ENC.kekRef),
    );
  }

  /** A committed RETURNED family claim (one nominee with a REAL mobile) whose nominee was REACHED. */
  async function reached(): Promise<{ cid: ClaimId; mid: MemberId; returnId: string; day0: string; day: (n: number) => Date }> {
    const cid = toClaimId(randomUUID());
    const mid = toMemberId(randomUUID());
    createdClaims.push(cid);
    createdMembers.push(mid);
    const mobile = await encryptNomineeMobile('9812345678');
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
      await seedNomineeDeclaration(bindScopedDb(client), PARIWAR_RACE, mid, { nominees: [{ mobileCiphertext: mobile }] });
      await seedNomineeNameCheck(client, PARIWAR_RACE, cid);
    });
    // The return in its OWN transaction (a later rewrite then lands AFTER it — `>` on transaction instants).
    const out = await onOwnTx(async (client) => {
      const r = await returnToDistrictAdmin(client, {
        claimCaseId: cid, pariwarId: PARIWAR_RACE, reasonCode: 'other', rationaleCiphertext: 'enc:v1:note',
        actorId: TRUSTEE, actorDisplay: 'Pariwar Admin One', actor: 'trustee',
      });
      const m = await writeCorrectionMark(client, {
        pariwarId: PARIWAR_RACE, claimCaseId: cid, mustAct: 'family', actorId: TRUSTEE, actorDisplay: 'Pariwar Admin One',
        setByRole: 'pariwar_admin', noteCiphertext: null, isReturnMark: true, hold: noCorrectionHold,
      });
      const db = bindScopedDb(client);
      const person = (await readCorrectionRecipients(db, PARIWAR_RACE, cid)).people[0]!;
      const claimed = await claimCorrectionReminder(db, {
        pariwarId: PARIWAR_RACE, claimCaseId: cid, runId: m.openedRun!.runId, slotDay: 1, recipientKey: person.personKey,
        purpose: 'family_sms', subjectKey: '', sentOn: addCalendarDays(m.openedRun!.day0, 1), late: false, jobId: 'j', now: new Date(),
      });
      if (claimed.status !== 'claimed') throw new Error('claim');
      await finaliseCorrectionReminder(db, {
        pariwarId: PARIWAR_RACE, reminderId: claimed.reminderId, jobId: 'j', outcome: 'accepted', recipientVersionId: person.versionId,
        recipientNumberHash: await currentCorrectionNumberHash(person.mobileCiphertext, person.mobileSource, PARIWAR_RACE, ENC),
      });
      return { returnId: r.decision.decisionId as string, day0: m.openedRun!.day0 };
    });
    return { cid, mid, ...out, day: (n: number) => tenAmIst(addCalendarDays(out.day0, n)) };
  }

  type Reached = Awaited<ReturnType<typeof reached>>;

  const request = (c: Reached) => () =>
    onOwnTx((client) =>
      requestCorrectionClosure(client, {
        pariwarId: PARIWAR_RACE, claimCaseId: c.cid, actorId: DA, actorDisplay: 'District Admin', now: c.day(95),
        noteCiphertext: 'enc:v1:r', crypto: ENC,
      }),
    );
  const approve = (c: Reached) => () =>
    onOwnTx((client) =>
      decideCorrectionClosure(client, {
        pariwarId: PARIWAR_RACE, claimCaseId: c.cid, actorId: TRUSTEE, actorDisplay: 'Pariwar Admin', now: c.day(96),
        decision: 'approve', noteCiphertext: null, decisionRationaleCiphertext: 'enc:v1:x', crypto: ENC,
      }),
    );
  const decline = (c: Reached) => () =>
    onOwnTx((client) =>
      decideCorrectionClosure(client, {
        pariwarId: PARIWAR_RACE, claimCaseId: c.cid, actorId: TRUSTEE, actorDisplay: 'Pariwar Admin', now: c.day(96),
        decision: 'decline', noteCiphertext: 'enc:v1:d',
      }),
    );
  /** The family's corrected accounts (the helpline taking them by phone) — the bank writer takes ONLY the row lock. */
  const rewrite = (c: Reached) => () =>
    onOwnTx((client) =>
      recordClaimNomineeBankAccounts(client, {
        claimCaseId: c.cid,
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
        recordedByActor: DA,
        actor: 'operator',
        allowCorrection: true,
        correctionReason: 'the family gave the corrected details by phone',
      } as never),
    );

  // ── The forced overlap ─────────────────────────────────────────────────────────────────────────────────────────

  /** How many of the racers' backends are BLOCKED on any lock right now. */
  async function blockedRacers(): Promise<number> {
    const pids = [...livePids];
    if (pids.length === 0) return 0;
    const { rows } = await pool.query<{ n: number }>(
      'SELECT count(DISTINCT pid)::int AS n FROM pg_locks WHERE NOT granted AND pid = ANY($1::int[])',
      [pids],
    );
    return rows[0]!.n;
  }

  type Outcome<T> = PromiseSettledResult<T> | null;

  async function untilBlocked<T>(n: number, outcomes: readonly Outcome<T>[]): Promise<void> {
    const deadline = Date.now() + 10_000;
    while ((await blockedRacers()) < n) {
      const settled = outcomes.findIndex((o) => o !== null);
      if (settled >= 0) {
        const o = outcomes[settled]!;
        if (o.status === 'rejected') throw o.reason;
        throw new Error(`[correction-closure-concurrency.spec] racer ${settled} COMPLETED without blocking — the overlap was not forced`);
      }
      if (Date.now() > deadline) throw new Error(`[correction-closure-concurrency.spec] ${n} racer(s) never blocked`);
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }

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
    await bounded(5_000);
    throw new Error(`[correction-closure-concurrency.spec] racers did not settle within ${SETTLE_DEADLINE_MS} ms — backends ${JSON.stringify(pids)} terminated`);
  }

  /**
   * Run `racers` GENUINELY concurrently: a holder takes the claim's trustee advisory lock (and, with `rowLock`, the claim
   * ROW lock — as the twt_app role, in scope); each racer is launched and confirmed BLOCKED before the next; then the
   * holder commits. Every racer SETTLES before this returns or rethrows.
   */
  async function overlapped<T>(
    cid: string,
    racers: readonly (() => Promise<T>)[],
    opts: { readonly rowLock?: boolean } = {},
  ): Promise<PromiseSettledResult<T>[]> {
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
      await holder.query('SET LOCAL ROLE twt_app');
      await setPariwarScope(holder, PARIWAR_RACE);
      await acquireCorrectionChaseLock(holder, PARIWAR_RACE, cid);
      if (opts.rowLock === true) {
        const r = await holder.query('SELECT 1 FROM claims WHERE claim_case_id = $1 FOR UPDATE', [cid]);
        expect(r.rowCount).toBe(1);
      }
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
        await untilBlocked(i + 1, outcomes);
      }
      expect(await blockedRacers()).toBe(racers.length);
    } finally {
      try {
        await holder.query('COMMIT');
      } catch (err) {
        holderBroken = err as Error;
      }
      holder.release(holderBroken);
      try {
        settled = await settleWithin(running);
      } catch (err) {
        settleError = err;
      }
    }
    if (settleError !== undefined) throw settleError;
    if (holderBroken !== undefined) throw holderBroken;
    return settled!;
  }

  const refusalOf = (s: PromiseSettledResult<unknown>): string => {
    if (s.status === 'fulfilled') return 'fulfilled';
    const r = s.reason as { refusal?: string; name?: string };
    return r.refusal ?? r.name ?? 'unknown';
  };

  async function stateOf(cid: string): Promise<string> {
    return (await pool.query<{ s: string }>('SELECT current_state AS s FROM claims WHERE claim_case_id = $1', [cid])).rows[0]!.s;
  }

  beforeAll(() => {
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 10, ssl: false, connectionTimeoutMillis: 5000 });
    pool.on('error', (err) => console.error('[correction-closure-concurrency.spec] idle client error:', err.message));
  });

  // ⭐ FAILS LOUDLY — as the exemplar: delete, then COUNT every table the fixtures and the races write.
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
        let determinationIds: string[] = [];
        try {
          determinationIds = (
            await pool.query<{ id: string }>('SELECT determination_id AS id FROM nominee_determinations WHERE claim_case_id = ANY($1)', [createdClaims])
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
        const left = await pool.query<Record<string, number>>(
          `SELECT (SELECT count(*) FROM claims WHERE claim_case_id = ANY($1))::int AS claims,
                  (SELECT count(*) FROM claim_state_trustee_decisions WHERE claim_case_id = ANY($1))::int AS decisions,
                  (SELECT count(*) FROM claim_correction_runs WHERE claim_case_id = ANY($1))::int AS runs,
                  (SELECT count(*) FROM claim_correction_marks WHERE claim_case_id = ANY($1))::int AS marks,
                  (SELECT count(*) FROM claim_correction_reminders WHERE claim_case_id = ANY($1))::int AS reminders,
                  (SELECT count(*) FROM claim_correction_closures WHERE claim_case_id = ANY($1))::int AS closures,
                  (SELECT count(*) FROM claim_correction_no_correction_records WHERE claim_case_id = ANY($1))::int AS no_correction_records,
                  (SELECT count(*) FROM claim_nominee_bank_accounts WHERE claim_case_id = ANY($1))::int AS bank_accounts,
                  (SELECT count(*) FROM claim_death_certificate_uploads WHERE claim_case_id = ANY($1))::int AS certificate_uploads,
                  (SELECT count(*) FROM claim_death_certificate_reviews WHERE claim_case_id = ANY($1))::int AS certificate_reviews,
                  (SELECT count(*) FROM nominee_determinations WHERE claim_case_id = ANY($1))::int AS determinations,
                  (SELECT count(*) FROM nominee_determination_items WHERE determination_id = ANY($4::uuid[]))::int AS determination_items,
                  (SELECT count(*) FROM claim_contacts WHERE claim_case_id = ANY($1))::int AS claim_contacts,
                  (SELECT count(*) FROM consent_records WHERE consent_artifact_ref = ANY($1::text[]) OR subject_id = ANY($2))::int AS consent_records,
                  (SELECT count(*) FROM members WHERE member_id = ANY($2))::int AS members,
                  (SELECT count(*) FROM member_nominee_versions WHERE member_id = ANY($2))::int AS member_nominee_versions,
                  (SELECT count(*) FROM events_log WHERE stream_id = ANY($3))::int AS events`,
          [createdClaims, createdMembers, streams, determinationIds],
        );
        const l = left.rows[0]!;
        if (Object.values(l).some((n) => n > 0)) errors.push(`rows remain: ${JSON.stringify(l)}`);
      }
    } finally {
      await pool.end();
    }
    if (errors.length > 0) throw new Error(`[correction-closure-concurrency.spec] cleanup FAILED — ${errors.join('; ')}`);
  });

  it('⭐ (1) two closure DECISIONS — approve × decline ⇒ the first decides, the second is refused', async () => {
    const c = await reached();
    await request(c)();
    const [a, d] = await overlapped(c.cid, [approve(c), decline(c)]);
    expect(refusalOf(a!)).toBe('fulfilled');
    // The approval DECIDED the request (its row is `closed`, the return superseded) ⇒ the decline finds ⛔ no pending one.
    expect(refusalOf(d!)).toBe('no_pending_request');
    expect(await stateOf(c.cid)).toBe('denied');
  });

  it('⭐ (2) a RETURN racing a closure approval (the claim corrected after the request) ⇒ the return lands, the approval is refused — BOTH orders', async () => {
    for (const order of ['approve_first', 'return_first'] as const) {
      const c = await reached();
      await request(c)();
      await rewrite(c)();
      await onOwnTx((client) => seedNomineeNameCheck(client, PARIWAR_RACE, c.cid, { reuseAccounts: true }));
      const secondReturn = () =>
        onOwnTx((client) =>
          returnToDistrictAdmin(client, {
            claimCaseId: c.cid, pariwarId: PARIWAR_RACE, reasonCode: 'other', rationaleCiphertext: 'enc:v1:again',
            actorId: TRUSTEE, actorDisplay: 'Pariwar Admin One', actor: 'trustee',
          }),
        );
      const racers = order === 'approve_first' ? [approve(c), secondReturn] : [secondReturn, approve(c)];
      const settled = await overlapped(c.cid, racers as readonly (() => Promise<unknown>)[]);
      const ap = order === 'approve_first' ? settled[0]! : settled[1]!;
      const rt = order === 'approve_first' ? settled[1]! : settled[0]!;
      expect(refusalOf(rt)).toBe('fulfilled');
      expect(refusalOf(ap)).toBe(order === 'approve_first' ? 'claim_corrected' : 'request_lapsed');
      expect(await stateOf(c.cid)).toBe('verifier_approved');
    }
  });

  it('⭐ (3) a closure REQUEST racing a family correction ⇒ the correction lands first (the row lock), the request is claim_corrected', async () => {
    const c = await reached();
    const [req, rw] = await overlapped(c.cid, [request(c), rewrite(c)] as readonly (() => Promise<unknown>)[], { rowLock: true });
    expect(refusalOf(rw!)).toBe('fulfilled');
    expect(refusalOf(req!)).toBe('claim_corrected');
  });

  it('⭐ (4) a Super Admin CLOSE racing a family correction ⇒ the correction lands, the close is claim_corrected; the claim stays held', async () => {
    const c = await reached();
    await request(c)();
    await decline(c)();
    const close = () =>
      onOwnTx((client) =>
        decideEscalatedClosure(client, {
          pariwarId: PARIWAR_RACE, claimCaseId: c.cid, actorId: SA, actorDisplay: 'Super Admin', now: c.day(100),
          decision: 'close', reason: 'family_silent_after_reached', noteCiphertext: 'enc:v1:n', decisionRationaleCiphertext: 'enc:v1:r', crypto: ENC,
        }),
      );
    const [cl, rw] = await overlapped(c.cid, [close, rewrite(c)] as readonly (() => Promise<unknown>)[], { rowLock: true });
    expect(refusalOf(rw!)).toBe('fulfilled');
    expect(refusalOf(cl!)).toBe('claim_corrected');
    expect(await onOwnTx((client) => isCorrectionClaimHeld(bindScopedDb(client), PARIWAR_RACE, c.cid))).toBe(true);
  });

  it('⭐ (5) D27\'s APPROVE racing a mark change — BOTH orders ⇒ exactly one; and racing a family correction ⇒ the gate refuses (stale)', async () => {
    for (const order of ['approve_first', 'mark_first'] as const) {
      const c = await reached();
      await onOwnTx((client) =>
        recordNoCorrectionNeeded(client, {
          pariwarId: PARIWAR_RACE, claimCaseId: c.cid, actorId: DA, actorDisplay: 'District Admin', now: c.day(3),
          markNoteCiphertext: 'enc:v1:m', noteCiphertext: 'enc:v1:n', setByRole: 'district_admin', hold: isCorrectionClaimHeld,
        }),
      );
      await onOwnTx((client) => seedNomineeNameCheck(client, PARIWAR_RACE, c.cid, { reuseAccounts: true }));
      const approveD27 = () =>
        onOwnTx((client) =>
          approveNoCorrectionNeeded(client, {
            pariwarId: PARIWAR_RACE, claimCaseId: c.cid, actorId: TRUSTEE, actorDisplay: 'Pariwar Admin', now: c.day(4), decisionRationaleCiphertext: 'enc:v1:x',
          }),
        );
      const toFamily = () =>
        onOwnTx((client) =>
          writeCorrectionMark(client, {
            pariwarId: PARIWAR_RACE, claimCaseId: c.cid, mustAct: 'family', actorId: DA, actorDisplay: 'District Admin',
            setByRole: 'district_admin', noteCiphertext: 'enc:v1:change', now: c.day(4), hold: isCorrectionClaimHeld,
          }),
        );
      const racers = order === 'approve_first' ? [approveD27, toFamily] : [toFamily, approveD27];
      const settled = await overlapped(c.cid, racers as readonly (() => Promise<unknown>)[]);
      const ap = order === 'approve_first' ? settled[0]! : settled[1]!;
      const mk = order === 'approve_first' ? settled[1]! : settled[0]!;
      if (order === 'approve_first') {
        expect(refusalOf(ap)).toBe('fulfilled');
        expect(refusalOf(mk)).toBe('CorrectionMarkNoLiveReturnError');
        expect(await stateOf(c.cid)).toBe('state_trustee_approved');
      } else {
        expect(refusalOf(mk)).toBe('fulfilled');
        expect(refusalOf(ap)).toBe('no_record');
        expect(await stateOf(c.cid)).toBe('verifier_approved');
      }
    }
    const c = await reached();
    await onOwnTx((client) =>
      recordNoCorrectionNeeded(client, {
        pariwarId: PARIWAR_RACE, claimCaseId: c.cid, actorId: DA, actorDisplay: 'District Admin', now: c.day(3),
        markNoteCiphertext: 'enc:v1:m', noteCiphertext: 'enc:v1:n', setByRole: 'district_admin', hold: isCorrectionClaimHeld,
      }),
    );
    await onOwnTx((client) => seedNomineeNameCheck(client, PARIWAR_RACE, c.cid, { reuseAccounts: true }));
    const approveD27 = () =>
      onOwnTx((client) =>
        approveNoCorrectionNeeded(client, {
          pariwarId: PARIWAR_RACE, claimCaseId: c.cid, actorId: TRUSTEE, actorDisplay: 'Pariwar Admin', now: c.day(4), decisionRationaleCiphertext: 'enc:v1:x',
        }),
      );
    const [ap, rw] = await overlapped(c.cid, [approveD27, rewrite(c)] as readonly (() => Promise<unknown>)[], { rowLock: true });
    expect(refusalOf(rw!)).toBe('fulfilled');
    expect(refusalOf(ap!)).toBe('NomineeNameCheckRequiredError');
  });

  it('⭐ (6) a DECLINE racing a VOTE (the route\'s guard + the vote) on a resubmitted claim ⇒ exactly one wins — BOTH orders', async () => {
    for (const order of ['decline_first', 'vote_first'] as const) {
      const c = await reached();
      await request(c)();
      await rewrite(c)();
      await onOwnTx((client) => seedNomineeNameCheck(client, PARIWAR_RACE, c.cid, { reuseAccounts: true }));
      const vote = () =>
        onOwnTx(async (client) => {
          await assertCorrectionClaimNotHeld(client, PARIWAR_RACE, c.cid);
          return voteOnFrozenClaim(client, {
            claimCaseId: c.cid, pariwarId: PARIWAR_RACE, outcome: 'approved', reasonCode: null, rationaleCiphertext: null,
            actorId: TRUSTEE, actorDisplay: 'Pariwar Admin', actor: 'trustee',
          });
        });
      const racers = order === 'decline_first' ? [decline(c), vote] : [vote, decline(c)];
      const settled = await overlapped(c.cid, racers as readonly (() => Promise<unknown>)[]);
      const dc = order === 'decline_first' ? settled[0]! : settled[1]!;
      const vt = order === 'decline_first' ? settled[1]! : settled[0]!;
      if (order === 'decline_first') {
        expect(refusalOf(dc)).toBe('fulfilled');
        expect(refusalOf(vt)).toBe('cycle_freeze_escalated');
        expect(await stateOf(c.cid)).toBe('verifier_approved');
      } else {
        expect(refusalOf(vt)).toBe('fulfilled');
        expect(refusalOf(dc)).toBe('request_lapsed');
        expect(await stateOf(c.cid)).toBe('state_trustee_approved');
      }
    }
  });
});
