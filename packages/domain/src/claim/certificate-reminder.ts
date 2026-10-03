// The REPLACEMENT-CERTIFICATE REMINDER — the runs, the planner, the recipients and a person's state — Story 6.19d
// (Task 2.2–2.4; AC1–AC3, AC5; `2026-10-03-276` CR2–CR8; `-275` Q2–Q4). Transport-free: ⛔ no HTTP, ⛔ no audit; the only
// crypto is an explicit `FieldCryptoDeps` (the number hash), and the plaintext ⛔ never leaves the helper.
//
// ── The runs (CR1–CR3) ──────────────────────────────────────────────────────────────────────────────────────────
// A run is ONE wait for a certificate, in its OWN table (⛔ never a kind on `claim_correction_runs` — `-276` CR1):
// `rejected` (the CURRENT certificate's live review rejected it — anchored on that upload + review; day 0 = the review's
// IST date) or `missing` (⛔ no certificate once the claim is being checked — day 0 = the IST date of the claim's
// EARLIEST `claim.peer_mesh_pinged`, the only edge into checking). ⭐ ONE open run per claim; ONE run per rejected
// upload (a re-review of the same upload ⛔ never restarts — Trap 4); ONE `missing` run per claim, ever.
// ⭐ DISCOVERY IS THE SWEEP'S (CR2): ⛔ no edit to the review writer, the upload handlers or the OCR job.
//
// ── The planner (CR2, CR5) — PURE ──────────────────────────────────────────────────────────────────────────────
// For a sweep decision, precedence is: open ≻ `completed` ≻ `certificate_received` ≻ pause ≻ continue.
//   · open      — in the window, a rejected current certificate with ⛔ no run on it, or ⛔ no certificate and ⛔ no
//                 `missing` run. It ends the claim's open run `superseded` in the same transaction (a second rejection
//                 between two sweeps still gets its day 1 the next morning). A run whose day 0 is already more than 180
//                 days back is opened AND completed at once, ⛔ no send (`-275` Q2: ⛔ never re-dated).
//   · completed — the run's day is PAST 180 (`> 180`) — checked BEFORE pause, so a run paused past 180 ends.
//   · received  — the anchor is no longer the current certificate (`rejected`), or the claim is no longer `missing`.
//   · pause     — the claim is outside the review window (`-275` Q2), or the anchor stands accepted on a re-review
//                 (`-275` Q4). ⛔ No send, ⛔ no record; the calendar runs on; ⛔ never re-dated.
// ⚠ ⛔ Not paused by a live correction return, the "who must act" mark or a Super Admin hold (ours — `-274` 1b governs the
// correction run's 90 days, ⛔ not `-259`'s schedule).
//
// ── The recipients (CR6) ────────────────────────────────────────────────────────────────────────────────────────
// ⭐ The people on the CONTACT RECORD (`-259` detail 2: *"the same people the family agreed at filing may be
// contacted"*; `-253` cl.1). The shared spec's T12 continues to govern 6.19b; it does ⛔ not define 6.19d's recipient
// population — ⛔ never `readCorrectionRecipients`, ⛔ never the effective declaration (it needs an ACCEPTED certificate,
// so on a certificate wait it would text nobody). One person per correction-chain ROOT, texted at the mobile of the
// HEAD of that chain; the claimant BLOCK at its own mobile.
//
// ⛔⛔ This module decides NOTHING about a claim (invariant 1): ⛔ no decision writer, ⛔ no claim event.
// ⛔ IMPORT DISCIPLINE: nothing in 6.19b / 6.19c / 6.21a imports this module.

import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm';
import type pg from 'pg';

import { bindScopedDb, type Db } from '../db.js';
import type { FieldCryptoDeps } from '../encryption/field-classes.js';
import type { ClaimId, DeathCertificateReviewId, DeathCertificateUploadId, MemberId, PariwarId } from '../ids/index.js';
import { listNomineeDeclarationVersions } from '../nominee/declaration-history.js';
import { clampLimit } from '../pagination.js';
import {
  type CertificateReminderOutcome,
  type CertificateRunCause,
  type CertificateRunEndReason,
  type ClaimCertificateReminderRunRow,
  claimCertificateReminderLetters,
  claimCertificateReminderRuns,
  claimCertificateReminders,
} from '../schema/claim_certificate_reminder.js';
import { claims } from '../schema/claims.js';
import { eventsLog } from '../schema/events_log.js';
import { addCalendarDays } from '../cycle-calendar/holiday-resolver.js';
import { certificateRunDay, isCertificateRunPastHorizon } from './certificate-reminder-schedule.js';
import { readClaimContact, readClaimContactAgreementState } from './claim-contact-check.js';
import {
  type PersonLetterRow,
  type PersonReminderRow,
  type PersonRunState,
  evaluatePersonRunState,
} from './correction-chase.js';
import { type CorrectionMobileSource, currentCorrectionNumberHash } from './correction-crypto.js';
import { calendarDaysBetween, istDateOf } from './correction-schedule.js';
import {
  type DeathCertificateStatus,
  deathCertificateStatus,
  isInDeathCertificateReviewWindow,
  readDeathCertificateSnapshot,
} from './death-certificate-approval.js';
import { CLAIM_REVIEW_WINDOW_STATES } from './review-window.js';

// ── The run view ─────────────────────────────────────────────────────────────────────────────────────────────

export interface CertificateRunView {
  readonly runId: string;
  readonly claimCaseId: string;
  readonly pariwarId: string;
  readonly cause: CertificateRunCause;
  readonly anchorUploadId: string | null;
  readonly anchorReviewId: string | null;
  /** IST calendar date. ⛔ Nothing is sent on it. */
  readonly day0: string;
  readonly openedAt: Date;
  readonly endedAt: Date | null;
  readonly endReason: CertificateRunEndReason | null;
}

function runView(r: ClaimCertificateReminderRunRow): CertificateRunView {
  return {
    runId: r.runId,
    claimCaseId: r.claimCaseId as string,
    pariwarId: r.pariwarId as string,
    cause: r.cause,
    anchorUploadId: (r.anchorUploadId as string | null) ?? null,
    anchorReviewId: (r.anchorReviewId as string | null) ?? null,
    day0: r.day0,
    openedAt: r.openedAt,
    endedAt: r.endedAt,
    endReason: r.endReason ?? null,
  };
}

/** Every run of a claim, oldest first (open or ended). */
export async function readClaimCertificateRuns(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
): Promise<CertificateRunView[]> {
  const rows = await db
    .select()
    .from(claimCertificateReminderRuns)
    .where(
      and(eq(claimCertificateReminderRuns.pariwarId, pariwarId), eq(claimCertificateReminderRuns.claimCaseId, claimCaseId)),
    )
    .orderBy(asc(claimCertificateReminderRuns.openedAt), asc(claimCertificateReminderRuns.runId));
  return rows.map(runView);
}

/** One run by id (tenant-scoped), or `null`. */
export async function readCertificateRun(db: Db, pariwarId: PariwarId, runId: string): Promise<CertificateRunView | null> {
  const [row] = await db
    .select()
    .from(claimCertificateReminderRuns)
    .where(and(eq(claimCertificateReminderRuns.pariwarId, pariwarId), eq(claimCertificateReminderRuns.runId, runId)))
    .limit(1);
  return row ? runView(row) : null;
}

/**
 * CR3 — the claim's EARLIEST `claim.peer_mesh_pinged` (the only edge `documents_pending → verification_in_progress`),
 * or `null`. `claims` has ⛔ no state-entry column; this follows `computeStageSlaStatus`'s events_log read.
 */
export async function readCertificateWindowEnteredAt(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
): Promise<Date | null> {
  const [row] = await db
    .select({ occurredAt: eventsLog.occurredAt })
    .from(eventsLog)
    .where(
      and(
        eq(eventsLog.pariwarId, pariwarId),
        eq(eventsLog.streamId, claimCaseId),
        eq(eventsLog.eventType, 'claim.peer_mesh_pinged'),
      ),
    )
    .orderBy(asc(eventsLog.occurredAt))
    .limit(1);
  return row?.occurredAt ?? null;
}

// ── The planner (CR2, CR5) — PURE ─────────────────────────────────────────────────────────────────────────────

/** Everything the planner needs about ONE claim, read in one scope transaction. */
export interface CertificatePlanFacts {
  readonly claimState: string;
  /** `deathCertificateStatus(readDeathCertificateSnapshot(…))` — ⛔ never a second definition. */
  readonly status: DeathCertificateStatus;
  readonly currentUploadId: string | null;
  /** The live review iff it judged the current upload. */
  readonly currentReview: { readonly reviewId: string; readonly decidedAt: Date } | null;
  readonly openRun: Pick<CertificateRunView, 'runId' | 'cause' | 'anchorUploadId' | 'day0'> | null;
  /** A run (open OR ended) is anchored on the CURRENT upload. */
  readonly runForCurrentUpload: boolean;
  readonly missingRunExists: boolean;
  /** The claim's earliest `claim.peer_mesh_pinged` (CR3), or `null`. */
  readonly windowEnteredAt: Date | null;
}

export type CertificatePauseReason = 'outside_window' | 'certificate_accepted' | 'certificate_not_rejected';

export type CertificateRunPlan =
  | {
      readonly kind: 'open';
      readonly cause: CertificateRunCause;
      readonly anchorUploadId: string | null;
      readonly anchorReviewId: string | null;
      readonly day0: string;
      /** The claim's open run, ended `superseded` in the same transaction (CR2 — open wins). */
      readonly supersedeRunId: string | null;
      /** Day 0 already more than 180 days back ⇒ opened and ended `completed` at once, ⛔ no send (`-275` Q2). */
      readonly completeAtOnce: boolean;
    }
  | { readonly kind: 'end'; readonly runId: string; readonly reason: 'completed' | 'certificate_received' }
  | { readonly kind: 'pause'; readonly runId: string; readonly runDay: number; readonly reason: CertificatePauseReason }
  | { readonly kind: 'continue'; readonly runId: string; readonly runDay: number }
  /** ⛔ Nothing to do. `alarm: 'no_window_entry'` — a `missing` run was due but the claim has ⛔ no window-entry event. */
  | { readonly kind: 'none'; readonly alarm?: 'no_window_entry' };

/**
 * ⭐ THE PLAN for one claim today — CR2's opening rule, then CR5's stop / pause / continue for its open run. For a sweep
 * decision, precedence is: open ≻ `completed` ≻ `certificate_received` ≻ pause ≻ continue. Pure.
 */
export function planCertificateRun(f: CertificatePlanFacts, today: string): CertificateRunPlan {
  const inWindow = isInDeathCertificateReviewWindow(f.claimState);
  let alarm: 'no_window_entry' | undefined;

  // ── open (CR2) ──
  if (inWindow && f.status === 'rejected' && f.currentUploadId !== null && f.currentReview !== null && !f.runForCurrentUpload) {
    const day0 = istDateOf(f.currentReview.decidedAt);
    return {
      kind: 'open',
      cause: 'rejected',
      anchorUploadId: f.currentUploadId,
      anchorReviewId: f.currentReview.reviewId,
      day0,
      supersedeRunId: f.openRun?.runId ?? null,
      completeAtOnce: isCertificateRunPastHorizon(certificateRunDay(day0, today)),
    };
  }
  if (inWindow && f.status === 'missing' && !f.missingRunExists) {
    if (f.windowEnteredAt === null) {
      alarm = 'no_window_entry';
    } else {
      const day0 = istDateOf(f.windowEnteredAt);
      return {
        kind: 'open',
        cause: 'missing',
        anchorUploadId: null,
        anchorReviewId: null,
        day0,
        supersedeRunId: f.openRun?.runId ?? null,
        completeAtOnce: isCertificateRunPastHorizon(certificateRunDay(day0, today)),
      };
    }
  }

  const run = f.openRun;
  if (run === null) return alarm === undefined ? { kind: 'none' } : { kind: 'none', alarm };
  const runDay = certificateRunDay(run.day0, today);

  // ── completed (CR4 — BEFORE pause) ──
  if (isCertificateRunPastHorizon(runDay)) return { kind: 'end', runId: run.runId, reason: 'completed' };

  // ── certificate_received ──
  const received =
    run.cause === 'rejected' ? f.currentUploadId !== run.anchorUploadId : f.status !== 'missing';
  if (received) return { kind: 'end', runId: run.runId, reason: 'certificate_received' };

  // ── pause ──
  if (!inWindow) return { kind: 'pause', runId: run.runId, runDay, reason: 'outside_window' };
  if (run.cause === 'rejected' && f.status !== 'rejected') {
    return {
      kind: 'pause',
      runId: run.runId,
      runDay,
      reason: f.status === 'accepted' ? 'certificate_accepted' : 'certificate_not_rejected',
    };
  }
  return { kind: 'continue', runId: run.runId, runDay };
}

/**
 * Read the planner's facts for ONE claim (scope-tx). `null` when the claim is gone. The window-entry event is read only
 * when a `missing` run could open. ⭐ The status is `deathCertificateStatus(readDeathCertificateSnapshot(…))` — the ONE
 * definition (⛔ never a bulk SQL classifier).
 */
export async function readCertificatePlanFacts(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
): Promise<CertificatePlanFacts | null> {
  const [claimRow] = await db
    .select({ currentState: claims.currentState })
    .from(claims)
    .where(and(eq(claims.pariwarId, pariwarId), eq(claims.claimCaseId, claimCaseId)))
    .limit(1);
  if (!claimRow) return null;
  const snapshot = await readDeathCertificateSnapshot(db, pariwarId, claimCaseId);
  const status = deathCertificateStatus(snapshot);
  const runs = await readClaimCertificateRuns(db, pariwarId, claimCaseId);
  const open = runs.find((r) => r.endedAt === null) ?? null;
  const missingRunExists = runs.some((r) => r.cause === 'missing');
  const claimState = claimRow.currentState as string;
  const windowEnteredAt =
    status === 'missing' && !missingRunExists && isInDeathCertificateReviewWindow(claimState)
      ? await readCertificateWindowEnteredAt(db, pariwarId, claimCaseId)
      : null;
  return {
    claimState,
    status,
    currentUploadId: (snapshot.currentUploadId as string | null) ?? null,
    currentReview:
      snapshot.currentReview === null
        ? null
        : { reviewId: snapshot.currentReview.reviewId as string, decidedAt: snapshot.currentReview.decidedAt },
    openRun: open,
    runForCurrentUpload:
      snapshot.currentUploadId !== null && runs.some((r) => r.anchorUploadId === (snapshot.currentUploadId as string)),
    missingRunExists,
    windowEnteredAt,
  };
}

// ── The claim-row lock (CR7) ──────────────────────────────────────────────────────────────────────────────────

/**
 * ⭐ THE CLAIM-ROW LOCK (`SELECT … FOR UPDATE` on `claims`) — it serialises with the 6.21a review writer, the OCR job's
 * pointer move and the determination writer (each locks the claim row first) — ⛔ never the correction chase's trustee
 * advisory lock. ⚠ The CALLER sets `SET LOCAL lock_timeout` BEFORE it, and takes ⛔ no KMS call and ⛔ no second pool
 * checkout while holding it. Returns the locked claim's state, or `null` when it is gone.
 */
export async function lockCertificateClaim(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
): Promise<{ readonly currentState: string; readonly deceasedMemberId: string } | null> {
  const [row] = await db
    .select({ currentState: claims.currentState, deceasedMemberId: claims.deceasedMemberId })
    .from(claims)
    .where(and(eq(claims.pariwarId, pariwarId), eq(claims.claimCaseId, claimCaseId)))
    .for('update')
    .limit(1);
  return row ? { currentState: row.currentState as string, deceasedMemberId: row.deceasedMemberId as string } : null;
}

// ── The opener and the end (CR2, CR5) ─────────────────────────────────────────────────────────────────────────

export type OpenCertificateRunResult =
  | { readonly status: 'opened'; readonly run: CertificateRunView; readonly superseded: string | null }
  /** The facts moved since the plan (a newer run, another sweep) — ⛔ nothing written; the next sweep re-plans. */
  | { readonly status: 'stale' }
  /** A UNIQUE fired (another sweep opened it first) — ⛔ nothing written. */
  | { readonly status: 'exists' };

function samePlan(a: CertificateRunPlan, b: CertificateRunPlan): boolean {
  if (a.kind !== 'open' || b.kind !== 'open') return false;
  return (
    a.cause === b.cause &&
    a.anchorUploadId === b.anchorUploadId &&
    a.anchorReviewId === b.anchorReviewId &&
    a.day0 === b.day0 &&
    a.supersedeRunId === b.supersedeRunId
  );
}

function isUniqueViolation(err: unknown): boolean {
  const code = (e: unknown): unknown => (typeof e === 'object' && e !== null ? (e as { code?: unknown }).code : undefined);
  return code(err) === '23505' || code((err as { cause?: unknown } | null)?.cause) === '23505';
}

/**
 * ⭐ THE OPENER, under the CLAIM-ROW lock (the caller holds it — `lockCertificateClaim`). It RE-READS the facts under the
 * lock and re-plans: if the plan differs from the one the sweep made (a newer run, a moved pointer, another sweep) it
 * returns `stale` — ⛔ no write. Then a raw `SAVEPOINT` BEFORE ending the old run: it ends EXACTLY the planned run
 * (compare-and-set, `moved` checked) and inserts the new one (ended `completed` at once when its day 0 is more than 180
 * days back — `-275` Q2); a 23505 ⇒ `ROLLBACK TO SAVEPOINT` (the end AND the insert) ⇒ `exists`. ⛔ Never an old run
 * ended without its successor ([[project_domain_limit_clamp_and_savepoint_retry]]).
 */
export async function openCertificateRun(
  client: pg.PoolClient,
  input: {
    readonly pariwarId: PariwarId;
    readonly claimCaseId: ClaimId;
    readonly plan: Extract<CertificateRunPlan, { kind: 'open' }>;
    readonly today: string;
  },
): Promise<OpenCertificateRunResult> {
  const db = bindScopedDb(client);
  const facts = await readCertificatePlanFacts(db, input.pariwarId, input.claimCaseId);
  if (facts === null) return { status: 'stale' };
  const replanned = planCertificateRun(facts, input.today);
  if (!samePlan(replanned, input.plan)) return { status: 'stale' };
  const plan = input.plan;

  await client.query('SAVEPOINT certificate_run_open');
  try {
    if (plan.supersedeRunId !== null) {
      const ended = await db
        .update(claimCertificateReminderRuns)
        .set({ endedAt: sql`clock_timestamp()`, endReason: 'superseded' })
        .where(
          and(
            eq(claimCertificateReminderRuns.pariwarId, input.pariwarId),
            eq(claimCertificateReminderRuns.claimCaseId, input.claimCaseId),
            eq(claimCertificateReminderRuns.runId, plan.supersedeRunId),
            isNull(claimCertificateReminderRuns.endedAt),
          ),
        )
        .returning({ runId: claimCertificateReminderRuns.runId });
      if (ended.length === 0) {
        await client.query('ROLLBACK TO SAVEPOINT certificate_run_open');
        return { status: 'stale' };
      }
    }
    const [row] = await db
      .insert(claimCertificateReminderRuns)
      .values({
        claimCaseId: input.claimCaseId,
        pariwarId: input.pariwarId,
        cause: plan.cause,
        anchorUploadId: plan.anchorUploadId as DeathCertificateUploadId | null,
        anchorReviewId: plan.anchorReviewId as DeathCertificateReviewId | null,
        day0: plan.day0,
        ...(plan.completeAtOnce ? { endedAt: sql`clock_timestamp()` as never, endReason: 'completed' as const } : {}),
      })
      .returning();
    await client.query('RELEASE SAVEPOINT certificate_run_open');
    return { status: 'opened', run: runView(row!), superseded: plan.supersedeRunId };
  } catch (err) {
    if (isUniqueViolation(err)) {
      await client.query('ROLLBACK TO SAVEPOINT certificate_run_open');
      return { status: 'exists' };
    }
    throw err;
  }
}

/**
 * END a run (compare-and-set on `ended_at IS NULL`, keyed on the claim as well as the run). Returns whether it moved —
 * an already-ended run is a no-op. ⛔ Never re-opens a run. The caller holds the claim-row lock.
 */
export async function endCertificateRun(
  db: Db,
  input: {
    readonly pariwarId: PariwarId;
    readonly claimCaseId: ClaimId;
    readonly runId: string;
    readonly reason: Exclude<CertificateRunEndReason, 'superseded'>;
  },
): Promise<boolean> {
  const rows = await db
    .update(claimCertificateReminderRuns)
    .set({ endedAt: sql`clock_timestamp()`, endReason: input.reason })
    .where(
      and(
        eq(claimCertificateReminderRuns.pariwarId, input.pariwarId),
        eq(claimCertificateReminderRuns.claimCaseId, input.claimCaseId),
        eq(claimCertificateReminderRuns.runId, input.runId),
        isNull(claimCertificateReminderRuns.endedAt),
      ),
    )
    .returning({ runId: claimCertificateReminderRuns.runId });
  return rows.length > 0;
}

// ── The sweep's two cross-tenant pages (BYPASSRLS pool, keyset, clamped) ──────────────────────────────────────

/** The sweep's page size cap. */
export const CERTIFICATE_SWEEP_PAGE_CAP = 1000;

type Queryable = Pick<pg.Pool, 'query'> | Pick<pg.PoolClient, 'query'>;

/**
 * (a) Every OPEN certificate run, in or out of the window (so it can end, complete or pause), keyset-paged on `run_id`.
 * ⚠ CROSS-TENANT — the BYPASSRLS pool only; `allow` (tests) narrows it to some Pariwars.
 */
export async function listOpenCertificateRunsPage(
  q: Queryable,
  input: { readonly afterRunId: string | null; readonly limit: number; readonly allow: readonly string[] | null },
): Promise<{ readonly runId: string; readonly claimCaseId: string; readonly pariwarId: string }[]> {
  const size = clampLimit(input.limit, { default: CERTIFICATE_SWEEP_PAGE_CAP, cap: CERTIFICATE_SWEEP_PAGE_CAP });
  const { rows } = await q.query<{ run_id: string; claim_case_id: string; pariwar_id: string }>(
    `SELECT run_id, claim_case_id, pariwar_id FROM claim_certificate_reminder_runs
      WHERE ended_at IS NULL
        AND ($1::uuid IS NULL OR run_id > $1::uuid)
        AND ($3::uuid[] IS NULL OR pariwar_id = ANY($3::uuid[]))
      ORDER BY run_id ASC
      LIMIT $2`,
    [input.afterRunId, size, input.allow === null ? null : [...input.allow]],
  );
  return rows.map((r) => ({ runId: r.run_id, claimCaseId: r.claim_case_id, pariwarId: r.pariwar_id }));
}

/**
 * (b) Every claim in `CLAIM_REVIEW_WINDOW_STATES` with ⛔ no OPEN certificate run — the CANDIDATES (the per-claim status
 * read decides whether a run opens). Keyset-paged on `claim_case_id`. ⚠ CROSS-TENANT — the BYPASSRLS pool only.
 */
export async function listCertificateCandidateClaimsPage(
  q: Queryable,
  input: { readonly afterClaimCaseId: string | null; readonly limit: number; readonly allow: readonly string[] | null },
): Promise<{ readonly claimCaseId: string; readonly pariwarId: string }[]> {
  const size = clampLimit(input.limit, { default: CERTIFICATE_SWEEP_PAGE_CAP, cap: CERTIFICATE_SWEEP_PAGE_CAP });
  const { rows } = await q.query<{ claim_case_id: string; pariwar_id: string }>(
    `SELECT c.claim_case_id, c.pariwar_id FROM claims c
      WHERE c.current_state = ANY($4::text[])
        AND NOT EXISTS (SELECT 1 FROM claim_certificate_reminder_runs r
                         WHERE r.claim_case_id = c.claim_case_id AND r.ended_at IS NULL)
        AND ($1::uuid IS NULL OR c.claim_case_id > $1::uuid)
        AND ($3::uuid[] IS NULL OR c.pariwar_id = ANY($3::uuid[]))
      ORDER BY c.claim_case_id ASC
      LIMIT $2`,
    [input.afterClaimCaseId, size, input.allow === null ? null : [...input.allow], [...CLAIM_REVIEW_WINDOW_STATES]],
  );
  return rows.map((r) => ({ claimCaseId: r.claim_case_id, pariwarId: r.pariwar_id }));
}

// ── The recipients (CR6) ──────────────────────────────────────────────────────────────────────────────────────

/** Why the family cannot be reminded (CR6 — D30's shape, its OWN reason type; ⛔ never `undetermined`). */
export type CertificateCannotRemindReason = 'no_contact_record' | 'agreement_not_live';

/** One person on the contact record. ⛔ No name. */
export interface CertificatePerson {
  /** `nominee:<correction-chain ROOT>` | `claimant` — the SAME key 6.19b's `nomineePersonKey` gives. */
  readonly personKey: string;
  readonly role: 'nominee' | 'claimant';
  /** Display position among the record's nominees (`A`, `B`, …) — ⛔ never an assumed rank; `null` for the claimant. */
  readonly position: string | null;
  /** The HEAD of the person's correction chain (nominees), or `null` (the claimant block). */
  readonly versionId: string | null;
  /** ⛔ Ciphertext AS STORED (`null` = a vacated head: ⛔ no sendable number). */
  readonly mobileCiphertext: string | null;
  readonly mobileSource: CorrectionMobileSource;
}

export interface CertificateRecipients {
  /** `null` when the family can be reminded; else the reason (⛔ no family send at all). */
  readonly cannotRemind: CertificateCannotRemindReason | null;
  /** Empty when `cannotRemind` is set. Ordered by `personKey` (the claimant last). */
  readonly people: readonly CertificatePerson[];
  /** `hi` | `en` — the SMS language. */
  readonly contactLocale: 'hi' | 'en';
}

/** A version as `chainHeadOf` needs it. */
export interface ChainVersion {
  readonly versionId: string;
  readonly correctsVersionId: string | null;
  readonly versionNo: number;
}

/**
 * ⭐ The HEAD of `versionId`'s correction chain: the descendant (through `corrects_version_id`, child → parent) with ⛔ no
 * child of its own. On a FORK (`corrects_version_id` carries ⛔ no UNIQUE) the highest `version_no` AMONG THAT CHAIN'S
 * DESCENDANTS — ⚠ ⛔ never "the member's highest `version_no`" (footgun #31(b)). A version with ⛔ no descendant is its
 * own head. Pure; a cycle (impossible by construction) is cut.
 */
export function chainHeadOf(versionId: string, versions: readonly ChainVersion[]): string {
  const children = new Map<string, string[]>();
  for (const v of versions) {
    if (v.correctsVersionId === null) continue;
    const list = children.get(v.correctsVersionId) ?? [];
    list.push(v.versionId);
    children.set(v.correctsVersionId, list);
  }
  const byId = new Map(versions.map((v) => [v.versionId, v]));
  const seen = new Set<string>();
  const stack = [versionId];
  const leaves: string[] = [];
  while (stack.length > 0) {
    const at = stack.pop()!;
    if (seen.has(at)) continue;
    seen.add(at);
    const kids = (children.get(at) ?? []).filter((k) => !seen.has(k));
    if ((children.get(at) ?? []).length === 0) leaves.push(at);
    stack.push(...kids);
  }
  if (leaves.length === 0) return versionId;
  return leaves.sort((a, b) => {
    const na = byId.get(a)?.versionNo ?? -1;
    const nb = byId.get(b)?.versionNo ?? -1;
    return nb - na || (a < b ? -1 : a > b ? 1 : 0);
  })[0]!;
}

/** The ROOT of `versionId`'s correction chain (the version it was first declared as). Pure. */
function chainRootOf(versionId: string, byId: ReadonlyMap<string, ChainVersion>): string {
  const seen = new Set<string>();
  let at = versionId;
  while (!seen.has(at)) {
    seen.add(at);
    const parent = byId.get(at)?.correctsVersionId ?? null;
    if (parent === null) return at;
    at = parent;
  }
  return at;
}

/** `A`, `B`, … `Z`, `AA`, … — a display position. Pure. */
function positionLabel(i: number): string {
  let n = i;
  let s = '';
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}

/**
 * ⭐ WHO IS REMINDED (CR6): each nominee person on the contact record — one per distinct correction-chain ROOT among the
 * child rows' `nominee_version_id`s and `claimant_nominee_version_id` (when set) — at the mobile of the HEAD of that
 * chain; and the claimant BLOCK (when the claimant is none of the nominees). ⛔ No contact record, or an agreement ⛔ not
 * `live` ⇒ nobody. Reads only; ⛔ nothing decrypted. ⛔ Never the effective declaration.
 */
export async function readCertificateRecipients(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
): Promise<CertificateRecipients> {
  const snapshot = await readClaimContact(db, pariwarId, claimCaseId);
  const locale = snapshot.contact?.contactLocale ?? 'hi';
  if (snapshot.contact === null) return { cannotRemind: 'no_contact_record', people: [], contactLocale: locale };
  const agreement = await readClaimContactAgreementState(db, pariwarId, snapshot.contact.agreementConsentId);
  if (agreement !== 'live') return { cannotRemind: 'agreement_not_live', people: [], contactLocale: locale };

  const rows = await listNomineeDeclarationVersions(db, pariwarId, snapshot.contact.deceasedMemberId as MemberId);
  const versions: ChainVersion[] = rows.map((r) => ({
    versionId: r.versionId as string,
    correctsVersionId: (r.correctsVersionId as string | null) ?? null,
    versionNo: r.versionNo,
  }));
  const byId = new Map(versions.map((v) => [v.versionId, v]));
  const mobileOf = new Map(rows.map((r) => [r.versionId as string, (r.mobileCiphertext as string | null) ?? null]));

  const recordVersions = [
    ...snapshot.nominees.map((n) => n.nomineeVersionId as string),
    ...(snapshot.contact.claimantNomineeVersionId === null ? [] : [snapshot.contact.claimantNomineeVersionId as string]),
  ];
  const roots = [...new Set(recordVersions.map((v) => chainRootOf(v, byId)))].sort();
  const people: CertificatePerson[] = roots.map((root, i) => {
    const head = chainHeadOf(root, versions);
    return {
      personKey: `nominee:${root}`,
      role: 'nominee' as const,
      position: positionLabel(i),
      versionId: head,
      mobileCiphertext: mobileOf.get(head) ?? null,
      mobileSource: 'member_nominee' as const,
    };
  });
  if (snapshot.contact.claimantNomineeVersionId === null) {
    people.push({
      personKey: 'claimant',
      role: 'claimant',
      position: null,
      versionId: null,
      mobileCiphertext: snapshot.contact.claimantMobileCiphertext ?? null,
      mobileSource: 'claim_contact',
    });
  }
  return { cannotRemind: null, people, contactLocale: locale };
}

/** A person's CURRENT number hash (`null` = ⛔ no sendable number), or `failed` (an unreadable envelope, a KMS blip). */
export type CertificateNumberHash = { readonly hash: string | null } | { readonly failed: true };

/**
 * ⭐ Hash EVERY person's current number — BEFORE any claim-row lock (CR7: ⛔ no KMS call while holding it). The plaintext
 * ⛔ never leaves `currentCorrectionNumberHash`. A failure is PER PERSON (⛔ never thrown out of the set).
 */
export async function hashCertificateRecipients(
  people: readonly CertificatePerson[],
  pariwarId: string,
  crypto: FieldCryptoDeps,
): Promise<Map<string, CertificateNumberHash>> {
  const out = new Map<string, CertificateNumberHash>();
  for (const p of people) {
    try {
      out.set(p.personKey, { hash: await currentCorrectionNumberHash(p.mobileCiphertext, p.mobileSource, pariwarId, crypto) });
    } catch {
      // ⛔ Not logged here (it may carry envelope detail) — the caller alarms by ids.
      out.set(p.personKey, { failed: true });
    }
  }
  return out;
}

/** Does the person's version (or the claimant's ciphertext) still match what was hashed before the lock? Pure. */
export function samePersonSource(a: CertificatePerson, b: CertificatePerson | undefined): boolean {
  return b !== undefined && a.versionId === b.versionId && a.mobileCiphertext === b.mobileCiphertext;
}

// ── A person's state across the claim's runs (CR8) — an ADAPTER onto 6.19b's pure helpers ───────────────────────

/** One `family_sms` row of the claim (any run). */
export interface CertificateFamilyRow extends PersonReminderRow {
  readonly runId: string;
  readonly recipientKey: string;
  readonly late: boolean;
}

/** Every `family_sms` row of the claim's certificate runs. */
export async function readClaimCertificateFamilyRows(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
): Promise<CertificateFamilyRow[]> {
  const rows = await db
    .select({
      runId: claimCertificateReminders.runId,
      recipientKey: claimCertificateReminders.recipientKey,
      slotDay: claimCertificateReminders.slotDay,
      sentOn: claimCertificateReminders.sentOn,
      outcome: claimCertificateReminders.outcome,
      recipientVersionId: claimCertificateReminders.recipientVersionId,
      recipientNumberHash: claimCertificateReminders.recipientNumberHash,
      createdAt: claimCertificateReminders.createdAt,
      late: claimCertificateReminders.late,
    })
    .from(claimCertificateReminders)
    .where(
      and(
        eq(claimCertificateReminders.pariwarId, pariwarId),
        eq(claimCertificateReminders.claimCaseId, claimCaseId),
        eq(claimCertificateReminders.purpose, 'family_sms'),
      ),
    )
    .orderBy(asc(claimCertificateReminders.sentOn), asc(claimCertificateReminders.createdAt));
  return rows.map((r) => ({
    ...r,
    outcome: r.outcome as CertificateReminderOutcome,
    recipientVersionId: (r.recipientVersionId as string | null) ?? null,
  }));
}

/** One certificate letter of the claim, as the state and the list need it (⛔ no tracking number). */
export interface CertificateLetterFact {
  readonly letterId: string;
  readonly runId: string;
  readonly personKey: string;
  readonly postedOn: string;
  readonly deliveredOn: string | null;
  readonly createdAt: Date;
  readonly hasScreenshot: boolean;
}

/** Every certificate letter of the claim, oldest first. */
export async function readClaimCertificateLetters(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
): Promise<CertificateLetterFact[]> {
  const rows = await db
    .select({
      letterId: claimCertificateReminderLetters.letterId,
      runId: claimCertificateReminderLetters.runId,
      personKey: claimCertificateReminderLetters.personKey,
      postedOn: claimCertificateReminderLetters.postedOn,
      deliveredOn: claimCertificateReminderLetters.deliveredOn,
      createdAt: claimCertificateReminderLetters.createdAt,
      screenshotStorageKey: claimCertificateReminderLetters.screenshotStorageKey,
    })
    .from(claimCertificateReminderLetters)
    .where(
      and(
        eq(claimCertificateReminderLetters.pariwarId, pariwarId),
        eq(claimCertificateReminderLetters.claimCaseId, claimCaseId),
      ),
    )
    .orderBy(asc(claimCertificateReminderLetters.createdAt));
  return rows.map(({ screenshotStorageKey, ...r }) => ({ ...r, hasScreenshot: screenshotStorageKey !== null }));
}

/** A person's certificate-reminder state (CR8). */
export interface CertificatePersonState {
  readonly personKey: string;
  /** 6.19b's evaluation over the claim's rows — the found-dead day, the delivered-letter stop, the epoch. */
  readonly track: PersonRunState;
  /** The hash of the number this state is about — the current one when known, else the epoch's. */
  readonly numberHash: string | null;
  /** The person's ONE letter on the claim, if any (`-275` Q1). */
  readonly letter: CertificateLetterFact | null;
  /** ⭐ A letter DELIVERED to ANY person at this number stops this person's SMS (CR6 — per NUMBER). */
  readonly numberLetterDelivered: boolean;
  /** Letter-eligible: a dead / unreachable / no-target outcome of the CURRENT number (CR8). */
  readonly letterEligible: boolean;
}

/**
 * ⭐ Each person's state across the claim's certificate runs (CR8) — 6.19b's `evaluatePersonRunState` through a thin
 * adapter (a letter needs a placeholder `sequence`), ⛔ never a copy of "what dead means". Rows of several runs are
 * ordered by TIME. `hashes` are the persons' CURRENT number hashes, computed before the lock (`undefined` / `failed` ⇒
 * the latest row's number stands). The delivered-letter stop is per NUMBER: a letter delivered to any person whose
 * epoch number equals this person's stops this person too. Pure.
 */
export function evaluateCertificatePersonStates(
  people: readonly Pick<CertificatePerson, 'personKey'>[],
  rows: readonly CertificateFamilyRow[],
  letters: readonly CertificateLetterFact[],
  hashes: ReadonlyMap<string, CertificateNumberHash>,
): CertificatePersonState[] {
  const base = people.map((p) => {
    const mine = rows.filter((r) => r.recipientKey === p.personKey);
    const myLetters = letters.filter((l) => l.personKey === p.personKey);
    const h = hashes.get(p.personKey);
    const current = h !== undefined && !('failed' in h) ? h.hash : undefined;
    const asLetters: PersonLetterRow[] = myLetters.map((l) => ({
      sequence: 1,
      postedOn: l.postedOn,
      deliveredOn: l.deliveredOn,
      createdAt: l.createdAt,
    }));
    const track = evaluatePersonRunState(mine, asLetters, current);
    const epochHash = current !== undefined ? current : (track.epochRows.at(-1)?.recipientNumberHash ?? null);
    return { personKey: p.personKey, track, numberHash: epochHash, letter: myLetters[0] ?? null };
  });
  return base.map((s) => ({
    ...s,
    numberLetterDelivered:
      s.track.letterDelivered ||
      (s.numberHash !== null && base.some((o) => o.track.letterDelivered && o.numberHash === s.numberHash)),
    letterEligible: s.track.foundDeadOn !== null,
  }));
}

/** The recorded-day set of ONE run for one person — that run's rows, ANY outcome (⛔ never `epochRows`). Pure. */
export function certificateRecordedDays(rows: readonly CertificateFamilyRow[], runId: string, personKey: string): Set<number> {
  return new Set(rows.filter((r) => r.runId === runId && r.recipientKey === personKey).map((r) => r.slotDay));
}

/** Every reminder row (family and staff) of the claim's certificate runs, as the list and the chase read them. */
export async function readClaimCertificateStaffRows(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
): Promise<{ readonly runId: string; readonly purpose: string; readonly recipientKey: string; readonly subjectKey: string; readonly sentOn: string; readonly outcome: string }[]> {
  return db
    .select({
      runId: claimCertificateReminders.runId,
      purpose: claimCertificateReminders.purpose,
      recipientKey: claimCertificateReminders.recipientKey,
      subjectKey: claimCertificateReminders.subjectKey,
      sentOn: claimCertificateReminders.sentOn,
      outcome: claimCertificateReminders.outcome,
    })
    .from(claimCertificateReminders)
    .where(
      and(
        eq(claimCertificateReminders.pariwarId, pariwarId),
        eq(claimCertificateReminders.claimCaseId, claimCaseId),
        inArray(claimCertificateReminders.purpose, ['letter_chase', 'letter_escalation']),
      ),
    )
    .orderBy(asc(claimCertificateReminders.sentOn), asc(claimCertificateReminders.createdAt));
}

// ── The District Admin's letter chase (CR10) — PURE ─────────────────────────────────────────────────────────────

/** One staff row the sweep writes (`recorded`, or `no_target` for `staff:unassigned`). */
export interface CertificateStaffRowPlan {
  readonly purpose: 'letter_chase' | 'letter_escalation';
  readonly recipientKey: string;
  /** The chased person. */
  readonly subjectKey: string;
  readonly slotDay: number;
  readonly late: boolean;
}

/**
 * ⭐ CR10 — the District Admin is chased for the LETTER only: from a person's found-dead day, day 7, daily through day
 * 12 (6.19b's `LETTER_CHASE_*` offsets — D20), then on day 13 an escalation RECORD naming every Pariwar Admin (⚠ in v1
 * it reaches ⛔ no Pariwar Admin: ⛔ no push, ⛔ no Pariwar-Admin surface). Only for a letter-eligible person with ⛔ no
 * letter on the claim, while the run is OPEN and ⛔ not paused (the caller plans this only on `continue`). The dedup reads
 * the person's `letter_chase` / `letter_escalation` rows across ALL the claim's runs dated AFTER the current found-dead
 * day (a row of an old number's epoch ⛔ never suppresses the new one). D3's catch-up over DATES: the latest due chase
 * date once. A due date before the run's day 0 is written at TODAY's slot (6.19b's K2 clamp) — ⛔ never a negative slot,
 * ⛔ never skipped; a late chase and a late escalation may fall on one morning (both are records). Pure.
 */
export function planCertificateStaffChase(input: {
  readonly day0: string;
  readonly today: string;
  readonly people: readonly Pick<CertificatePersonState, 'personKey' | 'track' | 'letter' | 'letterEligible'>[];
  /** The claim's staff rows (every run). */
  readonly staffRows: readonly { readonly purpose: string; readonly subjectKey: string; readonly sentOn: string }[];
  /** `staff:<shepherd>` or `staff:unassigned`. */
  readonly districtAdminKey: string;
  /** `staff:<id>` per active Pariwar Admin, or `['staff:unassigned']`. */
  readonly pariwarAdminKeys: readonly string[];
  readonly chase: { readonly first: number; readonly last: number; readonly escalation: number };
}): CertificateStaffRowPlan[] {
  const todayDay = certificateRunDay(input.day0, input.today);
  const slotForDate = (date: string): number => {
    const s = certificateRunDay(input.day0, date);
    return s >= 0 ? s : Math.max(0, todayDay);
  };
  const out: CertificateStaffRowPlan[] = [];
  for (const p of input.people) {
    const foundDeadOn = p.track.foundDeadOn;
    if (!p.letterEligible || foundDeadOn === null || p.letter !== null) continue;
    const fd = calendarDaysBetween(foundDeadOn, input.today);
    const mine = input.staffRows.filter((r) => r.subjectKey === p.personKey && r.sentOn > foundDeadOn);
    if (fd >= input.chase.first) {
      const latestDue = addCalendarDays(foundDeadOn, Math.min(fd, input.chase.last));
      const covered = mine.some((r) => r.purpose === 'letter_chase' && r.sentOn >= latestDue);
      if (!covered) {
        out.push({
          purpose: 'letter_chase',
          recipientKey: input.districtAdminKey,
          subjectKey: p.personKey,
          slotDay: slotForDate(latestDue),
          late: latestDue < input.today,
        });
      }
    }
    if (fd >= input.chase.escalation && !mine.some((r) => r.purpose === 'letter_escalation')) {
      const escDate = addCalendarDays(foundDeadOn, input.chase.escalation);
      for (const key of input.pariwarAdminKeys) {
        out.push({
          purpose: 'letter_escalation',
          recipientKey: key,
          subjectKey: p.personKey,
          slotDay: slotForDate(escDate),
          late: escDate < input.today,
        });
      }
    }
  }
  return out;
}
