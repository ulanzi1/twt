// packages/contracts/src/claims/nominee-declaration.ts
//
// Story 6.20 — the nominee declaration's HISTORY on the District Admin's console: the TIMELINE, the
// on-demand decrypted SNAPSHOTS, the DETERMINATION, the genuine-mistake CORRECTION (raise + two
// approvals), and the Pariwar Admin's read surface of `-239` REFUSALS.
//
// ── Contracts discipline ──────────────────────────────────────────────────────────────────────
// ⛔ Never imports `@twt/domain` (the browser-bundle rule). ALL objects `.strict()`.
// ⛔⛔ T13 — the English-script gate is INPUT-ONLY, by ruling. `EnglishScriptName` appears ONLY on the
// correction's PROPOSED name (an INPUT); every decrypted name in a RESPONSE is a plain string inside a
// `Readable*` union. Attaching the predicate to an output would turn every already-stored non-Latin name
// (and both RTBF sentinels) into a 500 at read time.
// ⛔⛔ Invariant 1 / invariant 6 — ⛔ no response carries a "changed after death" flag, a highlight, a
// pre-selected mark or a name diff. The timeline shows each version's `recorded_at` AND `effective_at`
// beside the District Admin's own certificate-date field, and the District Admin decides.

import { z } from 'zod';

import { EnglishScriptName, MobileNumber } from '../_common/primitives.js';
import { NomineeRelationship } from '../nominee/declaration.js';
import { ReadableName, ReadableNomineeName } from './nominee-name-check.js';

const Rank = z.union([z.literal(1), z.literal(2)]);
const IsoInstant = z.string();
const CalendarDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'a YYYY-MM-DD calendar date');

/** The effective as-at-death declaration's status (mirrors the domain accessor's). */
export const NomineeDeclarationStatus = z.enum(['effective', 'undetermined', 'unversioned', 'empty', 'incoherent']);
export type NomineeDeclarationStatus = z.output<typeof NomineeDeclarationStatus>;

// ── The timeline (AC3; D10, D12) — METADATA only ─────────────────────────────────────────────────

/**
 * One version of one rank. ⭐ BOTH `recorded_at` AND `effective_at` (AC3): a genuine correction is
 * recorded after the claim but inherits an earlier position, so showing only "when" would make it look
 * like a post-death change. ⛔ No name, mobile or address — those are on-demand (`…/snapshots`).
 */
export const NomineeDeclarationVersionView = z
  .object({
    version_id: z.string().uuid(),
    rank: Rank,
    version_no: z.number().int().min(1),
    kind: z.enum(['declared', 'vacated']),
    source: z.enum(['member', 'correction']),
    relationship: z.string().nullable(),
    split_pct: z.number().int().nullable(),
    recorded_at: IsoInstant,
    effective_at: IsoInstant,
    corrects_version_id: z.string().uuid().nullable(),
  })
  .strict();
export type NomineeDeclarationVersionView = z.output<typeof NomineeDeclarationVersionView>;

/** The live determination, as the timeline shows it. ⛔ The Tier-1 date and note are on-demand. */
export const NomineeDeterminationView = z
  .object({
    determination_id: z.string().uuid(),
    decided_at: IsoInstant,
    decided_by_display: z.string(),
    marks: z.array(z.object({ version_id: z.string().uuid(), mark: z.enum(['stands', 'discarded']) }).strict()),
  })
  .strict();
export type NomineeDeterminationView = z.output<typeof NomineeDeterminationView>;

/**
 * D17 — an EARLIER claim's live determination for the same death, shown READ-ONLY on a later claim (its
 * form pre-fills nothing from it). ⛔ No Tier-1 data: ids, marks, an instant and the snapshotted name.
 */
export const EarlierClaimNomineeDeterminationView = z
  .object({
    claim_case_id: z.string().uuid(),
    claim_state: z.string(),
    determination_id: z.string().uuid(),
    decided_at: IsoInstant,
    decided_by_display: z.string(),
    marks: z.array(z.object({ version_id: z.string().uuid(), mark: z.enum(['stands', 'discarded']) }).strict()),
  })
  .strict();
export type EarlierClaimNomineeDeterminationView = z.output<typeof EarlierClaimNomineeDeterminationView>;

/**
 * `GET …/admin/members/:memberId/nominee-corrections/claims` — the SELECTED deceased member's live claims,
 * for the helpline raise (code review 2026-09-24b). ⛔ No PII: ids, state, instants.
 */
export const NomineeCorrectionRaisableClaimsResponse = z
  .object({
    member_id: z.string().uuid(),
    claims: z.array(z.object({ claim_case_id: z.string().uuid(), claim_state: z.string(), created_at: IsoInstant }).strict()),
  })
  .strict();
export type NomineeCorrectionRaisableClaimsResponse = z.output<typeof NomineeCorrectionRaisableClaimsResponse>;

/** `GET …/admin/claims/:claimCaseId/nominee-declaration` — the on-demand timeline (⛔ not in the console packet). */
export const NomineeDeclarationTimelineResponse = z
  .object({
    claim_case_id: z.string().uuid(),
    claim_state: z.string(),
    deceased_member_id: z.string().uuid(),
    versions: z.array(NomineeDeclarationVersionView),
    /** Each rank's highest version_no NOW — echoed back on the determination write (D17). */
    watermark: z.object({ rank1: z.number().int().nullable(), rank2: z.number().int().nullable() }).strict(),
    live_determination: NomineeDeterminationView.nullable(),
    /** D17 — the EARLIER claims' live determinations for the same death, READ-ONLY (newest first). */
    earlier_determinations: z.array(EarlierClaimNomineeDeterminationView),
    declaration_status: NomineeDeclarationStatus,
    /** Is the claim in a state a determination can be recorded in? */
    determination_recordable: z.boolean(),
    /**
     * What THIS viewer may do here, judged server-side against their grants at the deceased's district
     * (code review 2026-09-24b): the admin session carries only national grants, so the client cannot tell
     * a verifier from a District Admin. ⛔ UI only — the route's key check stays the boundary.
     */
    viewer: z.object({ can_determine: z.boolean(), can_decide_district: z.boolean() }).strict(),
    /**
     * How many correction requests wait at each step — METADATA ONLY (code review 2026-09-24b): the list
     * itself decrypts names and numbers (D10), and "is one waiting?" must not cost that reveal.
     */
    pending_corrections: z
      .object({ da_pending: z.number().int().nonnegative(), pa_pending: z.number().int().nonnegative() })
      .strict(),
  })
  .strict();
export type NomineeDeclarationTimelineResponse = z.output<typeof NomineeDeclarationTimelineResponse>;

// ── The on-demand decrypted snapshots (D10) ──────────────────────────────────────────────────────

/** One version's decrypted details. ⭐ OUTPUT — plain strings in `Readable*`, ⛔ never `EnglishScriptName`. */
export const NomineeVersionSnapshot = z
  .object({
    version_id: z.string().uuid(),
    name: ReadableNomineeName.nullable(),
    mobile: ReadableName.nullable(),
    address: ReadableName.nullable(),
  })
  .strict();
export type NomineeVersionSnapshot = z.output<typeof NomineeVersionSnapshot>;

/** `GET …/nominee-declaration/snapshots` — decrypt-after-authorize, audited with ids only. */
export const NomineeDeclarationSnapshotsResponse = z
  .object({
    claim_case_id: z.string().uuid(),
    snapshots: z.array(NomineeVersionSnapshot),
    /** The live determination's Tier-1 certificate date and note (`null` when none is live). */
    live_determination: z
      .object({ determination_id: z.string().uuid(), certificate_date: ReadableName, note: ReadableName })
      .strict()
      .nullable(),
  })
  .strict();
export type NomineeDeclarationSnapshotsResponse = z.output<typeof NomineeDeclarationSnapshotsResponse>;

// ── The determination (AC4; D4, D6, D17) ─────────────────────────────────────────────────────────

/**
 * The most marks one determination may carry. Every version must be marked and the history is unbounded,
 * so the old cap of 64 made a long history PERMANENTLY undeterminable — and so never approvable (code
 * review 2026-09-24, BigDev option (a)). ⚠ LOCKSTEP with the domain writer's
 * `NOMINEE_DETERMINATION_MAX_VERSIONS` (contracts never import `@twt/domain`, so the value is repeated and
 * a lockstep test holds the two equal); past it the writer refuses with `too_many_versions`.
 */
export const NOMINEE_DETERMINATION_MAX_MARKS = 1000;

/**
 * `POST …/nominee-determination`. ⭐ The form PRE-SELECTS NOTHING: every version carries the District
 * Admin's own mark. The server VALIDATES the marks against the certificate date (D6) and refuses an
 * inconsistent set with a typed 409 — ⛔ it never fills one in.
 */
export const NomineeDeterminationRequest = z
  .object({
    certificate_date: CalendarDate,
    marks: z
      .array(z.object({ version_id: z.string().uuid(), mark: z.enum(['stands', 'discarded']) }).strict())
      .max(NOMINEE_DETERMINATION_MAX_MARKS),
    note: z.string().trim().min(1).max(2000),
    watermark: z.object({ rank1: z.number().int().nullable(), rank2: z.number().int().nullable() }).strict(),
    expected_live_determination_id: z.string().uuid().nullable(),
  })
  .strict();
export type NomineeDeterminationRequest = z.output<typeof NomineeDeterminationRequest>;

export const NomineeDeterminationWriteResponse = z
  .object({
    claim_case_id: z.string().uuid(),
    determination_id: z.string().uuid(),
    superseded_determination_id: z.string().uuid().nullable(),
    stands_count: z.number().int(),
    discarded_count: z.number().int(),
    declaration_status: NomineeDeclarationStatus,
    event_version: z.number().int(),
  })
  .strict();
export type NomineeDeterminationWriteResponse = z.output<typeof NomineeDeterminationWriteResponse>;

// ── The correction (AC7; D7) ─────────────────────────────────────────────────────────────────────

/**
 * Raise a genuine-mistake correction — by the helpline operator (admin route) or by the family through
 * the app (member route). The `proposed` details are an INPUT, so the name carries the English-script
 * gate (`-227` cl.9). ⚠ `other` is refused by the DOMAIN (a typed 409, ⛔ not a wire 400) for the TARGET
 * (`-237` cl.2) and for the PROPOSAL — the latter an ENGINEERING READING of cl.2, ⛔ not a ratified rule
 * (BigDev 2026-09-24).
 * `target_version_id` is optional: when omitted the server uses the rank's currently STANDING version,
 * and when given it must BE that version.
 */
export const NomineeCorrectionRaiseRequest = z
  .object({
    rank: Rank,
    target_version_id: z.string().uuid().optional(),
    proposed: z
      .object({
        name: EnglishScriptName,
        relationship: NomineeRelationship,
        mobile: MobileNumber,
        address: z.string().trim().min(1).max(500).optional(),
      })
      .strict(),
    note: z.string().trim().min(1).max(1000),
  })
  .strict();
export type NomineeCorrectionRaiseRequest = z.output<typeof NomineeCorrectionRaiseRequest>;

/** A step decision — District Admin first, then Pariwar Admin; a note is required at EACH (CC3). */
export const NomineeCorrectionDecisionRequest = z
  .object({
    outcome: z.enum(['approve', 'decline']),
    note: z.string().trim().min(1).max(2000),
  })
  .strict();
export type NomineeCorrectionDecisionRequest = z.output<typeof NomineeCorrectionDecisionRequest>;

const CorrectionStepAct = z
  .object({ actor_display: z.string(), decided_at: IsoInstant, note: ReadableName.nullable() })
  .strict();

/**
 * One correction as the approvers see it. ⭐ The TARGET's declared relationship is shown BESIDE the
 * PROPOSED one — a difference is SHOWN, ⛔ never blocked, and the system compares ⛔ no names (T15: the
 * two human approvals are the only defence against back-dating a different person).
 */
export const NomineeCorrectionView = z
  .object({
    correction_id: z.string().uuid(),
    claim_case_id: z.string().uuid(),
    rank: Rank,
    target_version_id: z.string().uuid(),
    target: z
      .object({
        relationship: z.string().nullable(),
        name: ReadableNomineeName.nullable(),
        mobile: ReadableName.nullable(),
        // AC7 "beside the old and new details" — the target's address beside the proposed one.
        address: ReadableName.nullable(),
      })
      .strict(),
    proposed: z
      .object({
        relationship: z.string(),
        name: ReadableNomineeName,
        mobile: ReadableName,
        address: ReadableName.nullable(),
      })
      .strict(),
    raised_via: z.enum(['helpline', 'member_app']),
    raised_at: IsoInstant,
    raise_note: ReadableName,
    step: z.enum(['da_pending', 'pa_pending', 'applied', 'declined']),
    district_admin: CorrectionStepAct.nullable(),
    pariwar_admin: CorrectionStepAct.nullable(),
    declined_at_step: z.enum(['district_admin', 'pariwar_admin']).nullable(),
    applied_version_id: z.string().uuid().nullable(),
  })
  .strict();
export type NomineeCorrectionView = z.output<typeof NomineeCorrectionView>;

/** `GET …/nominee-corrections` — every correction on the claim, newest first. */
export const NomineeCorrectionListResponse = z
  .object({ claim_case_id: z.string().uuid(), corrections: z.array(NomineeCorrectionView) })
  .strict();
export type NomineeCorrectionListResponse = z.output<typeof NomineeCorrectionListResponse>;

/** The write responses — ⛔ no PII: ids and the step. */
export const NomineeCorrectionWriteResponse = z
  .object({
    correction_id: z.string().uuid(),
    claim_case_id: z.string().uuid(),
    step: z.enum(['da_pending', 'pa_pending', 'applied', 'declined']),
    applied_version_id: z.string().uuid().nullable(),
  })
  .strict();
export type NomineeCorrectionWriteResponse = z.output<typeof NomineeCorrectionWriteResponse>;

/** `GET …/admin/nominee-corrections/pending` — the Pariwar Admin's queue of corrections awaiting STEP 2. ⛔ No PII. */
export const NomineeCorrectionPendingListResponse = z
  .object({
    items: z.array(
      z
        .object({
          correction_id: z.string().uuid(),
          claim_case_id: z.string().uuid(),
          rank: Rank,
          raised_via: z.enum(['helpline', 'member_app']),
          raised_at: IsoInstant,
        })
        .strict(),
    ),
  })
  .strict();
export type NomineeCorrectionPendingListResponse = z.output<typeof NomineeCorrectionPendingListResponse>;

// ── The Pariwar Admin's read surface of `-239` refusals (D14) ─────────────────────────────────────

/**
 * One `-239` refusal — the District Admin's live verifier denial with the `post_death_nominee_change`
 * reason code. ⭐ A NOTIFICATION surface, ⛔ not an approval step (`-239` consequence 3): the Pariwar
 * Admin SEES the refusal, the note and the reason, and is ⛔ never asked to approve it.
 */
export const NomineeRefusalItem = z
  .object({
    claim_case_id: z.string().uuid(),
    deceased_member_id: z.string().uuid(),
    claim_state: z.string(),
    refused_at: IsoInstant,
    refused_by_display: z.string().nullable(),
    rationale: ReadableName.nullable(),
  })
  .strict();
export type NomineeRefusalItem = z.output<typeof NomineeRefusalItem>;

/** `GET /api/v1/p/:pariwarId/admin/nominee-refusals` — newest first, bounded. */
export const NomineeRefusalListResponse = z.object({ items: z.array(NomineeRefusalItem) }).strict();
export type NomineeRefusalListResponse = z.output<typeof NomineeRefusalListResponse>;
