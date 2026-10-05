// The NOMINEE-CHANGE WARNINGS and the ONE approval rule over them — Story 6.23a (Task 2; NW1–NW4, NW6, NW13, NW15;
// AC1). Transport-free.
//
// The rulings: `2026-09-28-261` D1 (*"the system shows a warning on any nominee version dated on or after the death"*),
// `-262` FQ1 (an approved correction is LABELLED, ⛔ not warned), FQ8 A (*"any nominee change made within 90 days
// before the claim was filed gets a warning, whatever the certificate says"*), `-264` FQ12 (approving while ANY
// warning shows needs a reason and a note), `-277` Q1 A (a member's FIRST naming is warned too) and Q3 B (a warning
// that appears after the District Admin approved needs their reason and note too). The author's decisions: `-278`
// NW1–NW18, as amended by `-279` (A1, A3, A6, A12) and `-280`.
//
// ⭐ The system still REFUSES NOTHING, MARKS NOTHING and pays no one differently (invariant 1): a warning is
// information on the console and a condition on the FORM of an approval — ⛔ never a refusal, ⛔ never a
// determination mark. ⛔ No name is compared (invariant 6) — ranks, version ids, instants and marks only.
//
// ── KINDS and KEYS (NW1) ─────────────────────────────────────────────────────────────────────────────────────────
// A warning KEY is `${kind}:${subjectId}` — 6.23a's subjects are `member_nominee_versions.version_id`s. Rows 6-26 /
// 6-27 ADD a kind, its key and a producer; the assertion below is ⛔ never edited (`-264` Consequence 2). ⛔ No future
// kind is pre-minted. `APPROVAL_WARNING_KINDS` is pinned by a test (`-279` A6).
//
// ── TWO DERIVATIONS of "dated on or after the death", ONE definition (Trap 1; fact 2) ──────────────────────────
// The definition (`-261`'s reading): a `source = 'member'` version (declared OR vacated) whose `effective_at` is ≥ the
// IST start of the claim's CURRENT ACCEPTED certificate date — `!versionStandsAt(effectiveAt, acceptedDate)`.
//   · BY DATE — the pure `isPostDeathVersion`, used ONLY by the audited timeline read, which already holds the
//     decrypted accepted date. ⛔ No other caller decrypts (invariant 7).
//   · BY DETERMINATION — `readClaimApprovalWarnings`: the LIVE determination's `discarded` items whose version is
//     `source = 'member'`, ⛔ no decrypt. EXACT only when the live determination is CURRENT — made against the claim's
//     current accepted review: then 6.21a D7 makes its date the accepted date and 6.20 D6 makes every mark agree with
//     that date (the writer refuses any other), so "discarded" IS "dated on or after the death". Otherwise (no live
//     determination, or one made against an earlier review — a re-review leaves it live but out of date,
//     `isDeathCertificateDeterminationStale`) `postDeath` is `awaiting_determination` and ⛔ no `post_death_version`
//     key is derived — ⛔ never from the old date (`-279` A3). At the approval gate `assertClaimApprovable` has already
//     refused both cases (Trap 2).
// ⭐ This is `-239`'s refusal ground too (`assertPostDeathRefusalGrounded` — a live determination with a `discarded`
// item). It has ⛔ no `source` filter and needs none: a correction inherits its target's `effective_at`
// (`nominee-effective.ts`), so a discarded correction implies its discarded member-source target — the two agree at
// CLAIM level. ⛔ Never add a third derivation.
//
// ── The 90-day ANCHOR (Trap 3, Trap 4) ───────────────────────────────────────────────────────────────────────────
// The earliest `claims.created_at` among the deceased's claims in this Pariwar that ⛔ no innocence finding released
// (the SAME predicate `isNomineeDeclarationLocked` uses — COPIED below, ⛔ never imported: `nominee-lock.ts` reaches
// `nominee-name-check.ts` through `project.ts` → `events.ts`, and 6.23b makes `nominee-name-check.ts` import THIS
// module — a runtime cycle typecheck cannot see). All released ⇒ this claim's own `created_at`. The window is
// ONE-SIDED: `istDateOf(effectiveAt) >= istDateOf(anchor) − 90` — ⛔ never `effectiveAt <= anchor` (a nominee edit that
// held the intake lock first can stamp `clock_timestamp()` a few ms after the claim's transaction-start `now()`).
//
// ⚠⚠ IMPORT DISCIPLINE (NW1; `-279` A12): ⛔ never import `events.ts`, `nominee-name-check.ts`, `nominee-lock.ts`,
// `project.ts`, or anything that reaches them — TRANSITIVELY (a source-scan test follows relative imports to a
// fixpoint). Safe leaves: `death-certificate-approval.ts`, `nominee-effective.ts`, `review-window.ts`, `errors.ts`,
// `approval-warning-reasons.ts`, `cycle-calendar/holiday-resolver.ts`.

import { sql } from 'drizzle-orm';

import { addCalendarDays, istDateOf } from '../cycle-calendar/holiday-resolver.js';
import type { Db } from '../db.js';
import type { ClaimId, MemberId, PariwarId, VerifierDecisionId } from '../ids/index.js';
import {
  type ClaimWarningApprovalStep,
  claimWarningApprovals,
  DISTRICT_ADMIN_WARNING_STEPS,
} from '../schema/claim_warning_approvals.js';
import {
  type ApprovalWarningReasonOption,
  activeReasonOptions,
  type RawActiveReason,
  type ResolvedApprovalWarningReason,
} from './approval-warning-reasons.js';
import {
  ApprovalWarningReasonRequiredError,
  WarningReasonUnavailableError,
  WarningReasonUngroundedError,
} from './errors.js';
import { versionStandsAt } from './nominee-effective.js';

// ── Kinds, keys, the window ─────────────────────────────────────────────────────────────────────────────────────

/** The warning kinds (NW1). ⚠ A new kind enters 6.23b's WAIT (`-277` Q3 B) — its producer row decides that first. */
export const APPROVAL_WARNING_KINDS = ['post_death_version', 'recent_nominee_change'] as const;
export type ApprovalWarningKind = (typeof APPROVAL_WARNING_KINDS)[number];

/** `-262` FQ8 A — *"within 90 days before the claim was filed"* (amended by the Panel from 30). */
export const RECENT_NOMINEE_CHANGE_WINDOW_DAYS = 90;

/** A warning's KEY — `${kind}:${subjectId}`. Per WARNING, ⛔ not per kind (fact 4). */
export function approvalWarningKey(kind: ApprovalWarningKind, subjectId: string): string {
  return `${kind}:${subjectId.toLowerCase()}`;
}

// ── The pure per-version classifier (NW2–NW4) ───────────────────────────────────────────────────────────────────

export interface ClassifiableNomineeVersion {
  readonly source: 'member' | 'correction';
  readonly effectiveAt: Date;
}

/** NW2 BY DATE — a member-source version dated on or after the accepted date. Unknown date ⇒ ⛔ never. */
export function isPostDeathVersion(version: ClassifiableNomineeVersion, acceptedDate: string | null): boolean {
  if (version.source !== 'member' || acceptedDate === null) return false;
  return !versionStandsAt(version.effectiveAt, acceptedDate);
}

/** NW3 — an instant within the 90 IST calendar days before the anchor's day, or after it (Trap 4 — one-sided). */
export function isRecentNomineeChange(effectiveAt: Date, anchorFiledAt: Date): boolean {
  // `YYYY-MM-DD` strings compare lexicographically.
  return istDateOf(effectiveAt) >= addCalendarDays(istDateOf(anchorFiledAt), -RECENT_NOMINEE_CHANGE_WINDOW_DAYS);
}

/**
 * The kinds ONE version carries. A `correction` is ⛔ never warned (`-262` FQ1 — it carries the label instead; its
 * TARGET is warned, if dated so). The member's FIRST declaration is warned like any other (`-277` Q1 A).
 */
export function classifyNomineeVersion(
  version: ClassifiableNomineeVersion,
  basis: { readonly acceptedDate: string | null; readonly anchorFiledAt: Date },
): ApprovalWarningKind[] {
  if (version.source !== 'member') return [];
  const kinds: ApprovalWarningKind[] = [];
  if (isPostDeathVersion(version, basis.acceptedDate)) kinds.push('post_death_version');
  if (isRecentNomineeChange(version.effectiveAt, basis.anchorFiledAt)) kinds.push('recent_nominee_change');
  return kinds;
}

/**
 * Trap 3 — the anchor: the earliest filing among the deceased's claims ⛔ released by an innocence finding; when every
 * claim is released, this claim's own filing. Pure — the SQL below computes the same thing.
 */
export function pickWarningAnchor(
  claims: readonly { readonly createdAt: Date; readonly released: boolean }[],
  ownCreatedAt: Date,
): Date {
  const unreleased = claims.filter((c) => !c.released).map((c) => c.createdAt.getTime());
  return unreleased.length === 0 ? ownCreatedAt : new Date(Math.min(...unreleased));
}

// ── The claim-level read (ONE statement) ────────────────────────────────────────────────────────────────────────

/** One row of the claim's approval-over-warning record, as the coverage needs it (⛔ no note). */
export interface WarningRecordSummary {
  readonly step: string;
  readonly recordedByActor: string;
  readonly keys: readonly string[];
}

export interface ClaimApprovalWarnings {
  readonly claimCaseId: ClaimId;
  readonly deceasedMemberId: MemberId;
  readonly claimState: string;
  /** The kinds currently shown, in `APPROVAL_WARNING_KINDS` order. */
  readonly kinds: readonly ApprovalWarningKind[];
  /** The current warning keys, sorted. */
  readonly keys: readonly string[];
  /** `evaluated` ⇔ a live determination exists AND was made against the claim's current accepted review. */
  readonly postDeath: 'evaluated' | 'awaiting_determination';
  readonly anchorFiledAt: Date;
  readonly liveDecision: { readonly decisionId: VerifierDecisionId; readonly outcome: string } | null;
  readonly coverage: {
    /** The claim's live verifier decision is an APPROVAL (Trap 13 — a decision ROW, ⛔ not a state). */
    readonly districtAdminApproved: boolean;
    /** The union of `covered_keys` over the District Admin's rows — empty unless `districtAdminApproved`. */
    readonly coveredKeys: readonly string[];
    /** The keys the District Admin's APPROVAL row covered (⛔ late reasons) — a key outside it is LATE. */
    readonly approvalKeys: readonly string[];
    /** Every District Admin row (`district_admin_*` steps ONLY — 6.23b's later rows ⛔ never count). */
    readonly records: readonly WarningRecordSummary[];
  };
  /** The Pariwar's ACTIVE reasons — the built-in generic first (NW16). */
  readonly reasonOptions: readonly ApprovalWarningReasonOption[];
}

/** The claim was not found in this Pariwar. */
export class ApprovalWarningsClaimNotFoundError extends Error {
  public readonly name = 'ApprovalWarningsClaimNotFoundError';
  public constructor(public readonly claimCaseId: string) {
    super(`[approval-warnings] claim ${claimCaseId} not found in this Pariwar`);
  }
}

type RawWarningsRow = {
  deceased_member_id: string;
  current_state: string;
  created_at: string | Date;
  first_filed_at: string | Date | null;
  current_review_id: string | null;
  determination_id: string | null;
  determination_review_id: string | null;
  member_versions: { version_id: string; effective_at: string }[] | null;
  discarded_member_version_ids: string[] | null;
  live_decision_id: string | null;
  live_decision_outcome: string | null;
  records: { step: string; actor: string; keys: string[] }[] | null;
  reasons: RawActiveReason[] | null;
};

/**
 * NW1 — the claim-level warnings in ONE statement: the anchor (Trap 3), the member-source versions' ids and
 * `effective_at`, the live determination's `discarded` member-source ids, whether that determination is CURRENT, the
 * live verifier decision, the District Admin's record rows, and the Pariwar's active reasons. ⛔ No ciphertext is
 * selected; ⛔ no decrypt. Tenant-scoped (RLS + the explicit `pariwar_id` on every table).
 * ⚠ Raw SQL with explicit aliases — ⛔ never a Drizzle correlated subquery ([[project_epic6_drizzle_correlated_subquery_bug]]).
 */
export async function readClaimApprovalWarnings(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
): Promise<ClaimApprovalWarnings> {
  const daSteps = [...DISTRICT_ADMIN_WARNING_STEPS];
  const result = await db.execute<RawWarningsRow>(sql`
    WITH c AS (
      SELECT cl.pariwar_id, cl.claim_case_id, cl.deceased_member_id, cl.current_state, cl.created_at
        FROM claims cl
       WHERE cl.pariwar_id = ${pariwarId}
         AND cl.claim_case_id = ${claimCaseId}
    ),
    cur AS (
      SELECT r.review_id
        FROM c
        JOIN claim_documents cd
          ON cd.pariwar_id = c.pariwar_id
         AND cd.claim_case_id = c.claim_case_id
         AND cd.document_type = 'death_certificate'
        JOIN claim_death_certificate_uploads u
          ON u.pariwar_id = cd.pariwar_id
         AND u.claim_case_id = cd.claim_case_id
         AND u.storage_object_key = cd.storage_object_key
        JOIN claim_death_certificate_reviews r
          ON r.pariwar_id = c.pariwar_id
         AND r.claim_case_id = c.claim_case_id
         AND r.superseded_at IS NULL
         AND r.upload_id = u.upload_id
         AND r.verdict = 'accepted'
    ),
    det AS (
      SELECT d.determination_id, d.death_certificate_review_id
        FROM c
        JOIN nominee_determinations d
          ON d.pariwar_id = c.pariwar_id
         AND d.claim_case_id = c.claim_case_id
         AND d.superseded_at IS NULL
    ),
    vd AS (
      SELECT v.decision_id, v.outcome::text AS outcome
        FROM c
        JOIN claim_verifier_decisions v
          ON v.pariwar_id = c.pariwar_id
         AND v.claim_case_id = c.claim_case_id
         AND v.superseded_at IS NULL
    )
    SELECT c.deceased_member_id,
           c.current_state,
           c.created_at,
           (SELECT min(c2.created_at)
              FROM claims c2
             WHERE c2.pariwar_id = c.pariwar_id
               AND c2.deceased_member_id = c.deceased_member_id
               AND NOT EXISTS (
                 SELECT 1
                   FROM claim_nominee_findings f
                  WHERE f.pariwar_id = c2.pariwar_id
                    AND f.claim_case_id = c2.claim_case_id
                    AND f.kind = 'member_found_innocent'
               )) AS first_filed_at,
           (SELECT cur.review_id FROM cur LIMIT 1) AS current_review_id,
           det.determination_id,
           det.death_certificate_review_id AS determination_review_id,
           (SELECT json_agg(json_build_object('version_id', mv.version_id, 'effective_at', mv.effective_at)
                            ORDER BY mv.effective_at, mv.version_id)
              FROM member_nominee_versions mv
             WHERE mv.pariwar_id = c.pariwar_id
               AND mv.member_id = c.deceased_member_id
               AND mv.source = 'member') AS member_versions,
           (SELECT json_agg(i.version_id ORDER BY i.version_id)
              FROM nominee_determination_items i
              JOIN member_nominee_versions iv
                ON iv.pariwar_id = i.pariwar_id
               AND iv.version_id = i.version_id
               AND iv.source = 'member'
             WHERE i.pariwar_id = c.pariwar_id
               AND i.determination_id = det.determination_id
               AND i.mark = 'discarded') AS discarded_member_version_ids,
           (SELECT vd.decision_id FROM vd LIMIT 1) AS live_decision_id,
           (SELECT vd.outcome FROM vd LIMIT 1) AS live_decision_outcome,
           (SELECT json_agg(json_build_object('step', w.step, 'actor', w.recorded_by_actor, 'keys', w.covered_keys)
                            ORDER BY w.recorded_at, w.record_id)
              FROM claim_warning_approvals w
             WHERE w.pariwar_id = c.pariwar_id
               AND w.claim_case_id = c.claim_case_id
               AND w.step IN (${sql.join(daSteps.map((step) => sql`${step}`), sql`, `)})) AS records,
           (SELECT json_agg(json_build_object(
                     'reason_id', r.reason_id, 'code', r.code, 'label_en', r.label_en, 'when_to_use', r.when_to_use,
                     'created_by_display', r.created_by_display, 'created_at', r.created_at,
                     'replaces_label', prev.label_en)
                            ORDER BY r.created_at, r.reason_id)
              FROM approval_warning_reasons r
              LEFT JOIN approval_warning_reasons prev
                ON prev.pariwar_id = r.pariwar_id
               AND prev.reason_id = r.replaces_reason_id
             WHERE r.pariwar_id = c.pariwar_id
               AND r.replaced_at IS NULL) AS reasons
      FROM c
      LEFT JOIN det ON true
  `);
  const row = (result.rows ?? [])[0];
  if (!row) throw new ApprovalWarningsClaimNotFoundError(claimCaseId);
  return deriveClaimApprovalWarnings(claimCaseId, row);
}

/**
 * JUST the 90-day anchor (`first_filed_at ?? created_at`) — for a caller that needs no other field of
 * `readClaimApprovalWarnings`'s full read (code review 2026-10-05; `claims.nominee-declaration.handlers.ts`'s
 * `getTimeline`, which re-derives its own per-version warnings via `classifyNomineeVersion` and only needed the
 * anchor). A THIRD copy of Trap 3's predicate (`isNomineeDeclarationLocked`'s WHERE, adapted to `min(created_at)`)
 * — ⛔ still never imported, for the same leaf discipline (NW1; the header comment above).
 */
export async function getClaimWarningAnchor(db: Db, pariwarId: PariwarId, claimCaseId: ClaimId): Promise<Date> {
  const result = await db.execute<{ created_at: string | Date; first_filed_at: string | Date | null }>(sql`
    SELECT c.created_at,
           (SELECT min(c2.created_at)
              FROM claims c2
             WHERE c2.pariwar_id = c.pariwar_id
               AND c2.deceased_member_id = c.deceased_member_id
               AND NOT EXISTS (
                 SELECT 1
                   FROM claim_nominee_findings f
                  WHERE f.pariwar_id = c2.pariwar_id
                    AND f.claim_case_id = c2.claim_case_id
                    AND f.kind = 'member_found_innocent'
               )) AS first_filed_at
      FROM claims c
     WHERE c.pariwar_id = ${pariwarId}
       AND c.claim_case_id = ${claimCaseId}
  `);
  const row = (result.rows ?? [])[0];
  if (!row) throw new ApprovalWarningsClaimNotFoundError(claimCaseId);
  return new Date(row.first_filed_at ?? row.created_at);
}

/** The pure half of the read (6.23b's bulk form reuses it). */
function deriveClaimApprovalWarnings(claimCaseId: ClaimId, row: RawWarningsRow): ClaimApprovalWarnings {
  const anchorFiledAt = new Date(row.first_filed_at ?? row.created_at);
  const currentReview = row.current_review_id?.toLowerCase() ?? null;
  const determinationReview = row.determination_review_id?.toLowerCase() ?? null;
  const postDeath: ClaimApprovalWarnings['postDeath'] =
    row.determination_id !== null && currentReview !== null && determinationReview === currentReview
      ? 'evaluated'
      : 'awaiting_determination';

  const keys = new Set<string>();
  const kinds = new Set<ApprovalWarningKind>();
  if (postDeath === 'evaluated') {
    for (const versionId of row.discarded_member_version_ids ?? []) {
      keys.add(approvalWarningKey('post_death_version', versionId));
      kinds.add('post_death_version');
    }
  }
  for (const v of row.member_versions ?? []) {
    if (isRecentNomineeChange(new Date(v.effective_at), anchorFiledAt)) {
      keys.add(approvalWarningKey('recent_nominee_change', v.version_id));
      kinds.add('recent_nominee_change');
    }
  }

  const liveDecision =
    row.live_decision_id !== null
      ? { decisionId: row.live_decision_id as VerifierDecisionId, outcome: row.live_decision_outcome ?? '' }
      : null;
  const districtAdminApproved = liveDecision?.outcome === 'approved';
  const records: WarningRecordSummary[] = (row.records ?? []).map((r) => ({
    step: r.step,
    recordedByActor: r.actor,
    keys: r.keys,
  }));
  const coveredKeys = districtAdminApproved ? [...new Set(records.flatMap((r) => r.keys))].sort() : [];
  const approvalKeys = districtAdminApproved
    ? [...new Set(records.filter((r) => r.step === 'district_admin_approval').flatMap((r) => r.keys))].sort()
    : [];

  return {
    claimCaseId,
    deceasedMemberId: row.deceased_member_id as MemberId,
    claimState: row.current_state,
    kinds: APPROVAL_WARNING_KINDS.filter((k) => kinds.has(k)),
    keys: [...keys].sort(),
    postDeath,
    anchorFiledAt,
    liveDecision,
    coverage: { districtAdminApproved, coveredKeys, approvalKeys, records },
    reasonOptions: activeReasonOptions(row.reasons ?? []),
  };
}

// ── Coverage (NW8, NW14, NW15 — ONE copy, 6.23b reads it) ───────────────────────────────────────────────────────

/**
 * The current keys ⛔ covered by the District Admin's record — only while the live verifier decision is an approval
 * (else ⛔ none: there is ⛔ no District Admin approval to cover anything — Trap 13). `excludeLateReasonsRecordedBy`
 * drops the late reasons THAT person recorded (`-279` A1: a late reason does ⛔ not count for an approval its own
 * recorder makes — 6.23b's wait). NW8's `uncoveredSinceApproval` is this list's length.
 */
export function uncoveredKeys(
  warnings: Pick<ClaimApprovalWarnings, 'keys' | 'coverage'>,
  opts: { readonly excludeLateReasonsRecordedBy?: string } = {},
): string[] {
  if (!warnings.coverage.districtAdminApproved) return [];
  const covered = new Set(
    warnings.coverage.records
      .filter(
        (r) =>
          !(r.step === 'district_admin_late_reason' && opts.excludeLateReasonsRecordedBy !== undefined && r.recordedByActor === opts.excludeLateReasonsRecordedBy),
      )
      .flatMap((r) => r.keys),
  );
  return warnings.keys.filter((k) => !covered.has(k));
}

/** The current keys the District Admin's APPROVAL did ⛔ not cover — the LATE warnings (Q3 B). */
export function lateWarningKeys(warnings: Pick<ClaimApprovalWarnings, 'keys' | 'coverage'>): string[] {
  const approved = new Set(warnings.coverage.approvalKeys);
  return warnings.keys.filter((k) => !approved.has(k));
}

/** The keys `actorId`'s OWN `district_admin_*` rows cover. */
function keysCoveredBy(warnings: Pick<ClaimApprovalWarnings, 'coverage'>, actorId: string): Set<string> {
  return new Set(warnings.coverage.records.filter((r) => r.recordedByActor === actorId).flatMap((r) => r.keys));
}

/** NW8's `lateKeysUncoveredForViewer` — the late keys ⛔ covered by this person's own District Admin rows. */
export function lateKeysUncoveredFor(warnings: Pick<ClaimApprovalWarnings, 'keys' | 'coverage'>, actorId: string): string[] {
  const own = keysCoveredBy(warnings, actorId);
  return lateWarningKeys(warnings).filter((k) => !own.has(k));
}

/**
 * NW14's `nothing_uncovered`, ⭐ judged FOR THE RECORDER (`-279` A1): ⛔ no current key is late, OR every current key
 * is covered by rows THIS person recorded. ⇒ a second person can ALWAYS answer a late warning that only the
 * approver's own row covers.
 */
export function lateWarningNothingUncoveredFor(
  warnings: Pick<ClaimApprovalWarnings, 'keys' | 'coverage'>,
  actorId: string,
): boolean {
  if (lateWarningKeys(warnings).length === 0) return true;
  const own = keysCoveredBy(warnings, actorId);
  return warnings.keys.every((k) => own.has(k));
}

// ── THE ONE RULE (NW6; `-262` FQ2, `-264` FQ12) — every approver calls it ──────────────────────────────────────

/**
 * Approving while ANY warning shows needs a WARNING REASON from the Pariwar's ACTIVE list and a NOTE — ONE reason and
 * ONE note per approval, ⛔ not per warning. In NW6's order:
 *   (1) ⛔ no warning, a reason sent        ⇒ `WarningReasonUngroundedError`;
 *   (2) a warning, ⛔ no reason             ⇒ `ApprovalWarningReasonRequiredError` (`missing: 'reason'`);
 *   (3) the reason ⛔ active                ⇒ `WarningReasonUnavailableError`;
 *   (4) a warning, ⛔ no note               ⇒ `ApprovalWarningReasonRequiredError` (`missing: 'note'`) — the backstop
 *       (the contract's 400 is the real enforcement).
 * `resolvedReason` is the caller's `lockActiveApprovalWarningReason` result (`null` ⇔ ⛔ active). Returns the reason
 * to record, or `null` when ⛔ no warning shows. ⛔ A refusal or an escalation is ⛔ never gated (invariant 4).
 */
export function assertApprovalReasonCoversWarnings(input: {
  readonly claimCaseId: string;
  readonly kinds: readonly ApprovalWarningKind[];
  readonly warningReasonCode: string | null;
  readonly resolvedReason: ResolvedApprovalWarningReason | null;
  readonly note: string | null;
}): ResolvedApprovalWarningReason | null {
  if (input.kinds.length === 0) {
    if (input.warningReasonCode !== null) throw new WarningReasonUngroundedError(input.claimCaseId);
    return null;
  }
  if (input.warningReasonCode === null) {
    throw new ApprovalWarningReasonRequiredError(input.claimCaseId, input.kinds, 'reason');
  }
  if (input.resolvedReason === null || input.resolvedReason.code !== input.warningReasonCode) {
    throw new WarningReasonUnavailableError(input.warningReasonCode);
  }
  if (input.note === null || input.note.trim() === '') {
    throw new ApprovalWarningReasonRequiredError(input.claimCaseId, input.kinds, 'note');
  }
  return input.resolvedReason;
}

// ── The record (NW13) ───────────────────────────────────────────────────────────────────────────────────────────

/**
 * Append ONE row to the approval-over-warning record (NW13) — the chosen reason and EXACTLY the current keys, in the
 * caller's transaction (the approval's own, or NW14's). Append-only by grant and trigger (0143): ⛔ no writer edits
 * a row (NW18).
 */
export async function insertClaimWarningApprovalRecord(
  db: Db,
  input: {
    readonly pariwarId: PariwarId;
    readonly claimCaseId: ClaimId;
    readonly deceasedMemberId: MemberId;
    readonly step: ClaimWarningApprovalStep;
    readonly verifierDecisionId: VerifierDecisionId;
    readonly reason: ResolvedApprovalWarningReason;
    readonly keys: readonly string[];
    /** Tier-1 ciphertext — NW14's late reason ONLY (0143's step ⇔ note CHECK). */
    readonly noteCiphertext: string | null;
    readonly actorId: string;
    readonly actorDisplay: string;
  },
): Promise<{ recordId: string }> {
  const [row] = await db
    .insert(claimWarningApprovals)
    .values({
      pariwarId: input.pariwarId,
      claimCaseId: input.claimCaseId,
      deceasedMemberId: input.deceasedMemberId,
      step: input.step,
      verifierDecisionId: input.verifierDecisionId,
      reasonCode: input.reason.code,
      reasonId: input.reason.reasonId,
      coveredKeys: [...input.keys],
      noteCiphertext: input.noteCiphertext,
      recordedByActor: input.actorId,
      recordedByDisplay: input.actorDisplay,
    })
    .returning({ recordId: claimWarningApprovals.recordId });
  return { recordId: row!.recordId };
}

// ── The FQ1 label (NW4) ─────────────────────────────────────────────────────────────────────────────────────────

/** An applied correction's label — the two approvers' SNAPSHOTTED display names (0119's step-coherence CHECK makes
 *  both NOT NULL on `step = 'applied'`). ⛔ Never re-resolved (Trap 12). */
export interface CorrectionLabel {
  readonly districtAdminDisplay: string;
  readonly pariwarAdminDisplay: string;
}

/**
 * NW4 (`-262` FQ1) — every APPLIED correction of the deceased's declaration, across ALL their claims, keyed by the
 * version it wrote (`applied_version_id`). ONE statement; ⛔ no ciphertext. The label is ⛔ never a warning kind and ⛔
 * never triggers the rule (invariant 3).
 */
export async function listAppliedCorrectionLabels(
  db: Db,
  pariwarId: PariwarId,
  deceasedMemberId: MemberId,
): Promise<Map<string, CorrectionLabel>> {
  const result = await db.execute<{ applied_version_id: string; da_display: string; pa_display: string }>(sql`
    SELECT nc.applied_version_id, nc.da_display, nc.pa_display
      FROM nominee_corrections nc
     WHERE nc.pariwar_id = ${pariwarId}
       AND nc.member_id = ${deceasedMemberId}
       AND nc.step = 'applied'
       AND nc.applied_version_id IS NOT NULL
  `);
  return new Map(
    (result.rows ?? []).map((r) => [
      r.applied_version_id.toLowerCase(),
      { districtAdminDisplay: r.da_display, pariwarAdminDisplay: r.pa_display },
    ]),
  );
}
