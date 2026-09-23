// packages/contracts/src/nominee/declaration.ts
//
// The signup nominee-declaration transport DTOs (Story 3.4, Task 4). The request/response
// shapes for `POST /member/nominees` (declare) + `GET /member/nominees` (status) — the third
// signup-wizard SURFACE (between KYC 3.3b and medical 3.5).
//
// ── Contracts discipline ──────────────────────────────────────────────────────────────
// A contracts SOURCE file MUST NOT import `@twt/domain` (the browser-bundle rule — the domain
// barrel re-exports `encryption` → `node:async_hooks`). So these use `_common` primitives
// (`MobileNumber`) + plain `string`, and the `relationship` value set is re-declared here as a
// wire enum (value-aligned with the `member_nominees.relationship` constraint). ALL objects
// `.strict()` (the kyc/ directory discipline).
//
// ── PII discipline (Dev Notes §"PII echo-back discipline") ────────────────────────────
// The declare REQUEST body carries Tier-1 PII (nominee name / mobile / address) — it is a
// REQUEST body (never logged; the audit trail + event carry count/split only). The status
// RESPONSE (`NomineeStatusResponse`) NEVER round-trips raw name/mobile/address bytes back —
// it exposes `rank`/`relationship`/`splitPct` + presence flags only (mirrors
// `KycProfileSummaryResponse`'s presence-flag discipline). NO nominee Aadhaar/KYC and NO
// nominee bank/IFSC are collected at signup (AC2/AC3 — claim-time only, Epic 6).

import { z } from 'zod';

import { EnglishScriptName, MobileNumber } from '../_common/primitives.js';

// ── Wire enum (re-declared; value-aligned with member_nominees.relationship) ───────────

/**
 * Nominee relationship-to-member. Constrained HERE (data quality) rather than at the DB,
 * where `relationship` is plain Tier-3 text (the kyc_transactions.status "text for the swap
 * seam" posture). The server stores the validated label verbatim.
 *
 * ⭐ STORY 6.20 (AC12) — FIFTEEN values replace the shipped five (`2026-09-21-237` cl.1, Trustee-
 * ratified): spouse, mother, father, son, daughter, brother, sister, uncle, aunt, cousin,
 * niece/nephew, grandchild, sister-in-law, daughter-in-law, other.
 * ⚠ THESE ARE WIRE CODES, ⛔ NOT THE RATIFIED LABELS: `NomineeForm.tsx` builds its copy key as
 * `nominees.relationship_${code}`, so a code of `niece/nephew` would produce an i18n key with a slash.
 * The codes are snake_case identifiers; the ratified wording lives in the en/hi label values.
 * ⚠ `other` FORECLOSES a later correction (`-237` cl.2 — *"we cannot really establish relationship and
 * therefore no correction will be allowed"*) — the member is told so at the picker.
 * ⛔ No migration and ⛔ no backfill: the DB column is plain text and nothing is in production (`-232`).
 * ⛔ `ClaimantRelationship` (claims/filing.ts) is a DIFFERENT list — the claimant's relationship to the
 * deceased — and stays five values.
 * ⚠ Still OPEN, recorded in `-237`: ⛔ no brother-in-law / son-in-law / mother-in-law / father-in-law /
 * grandparent — a member naming one falls to `other`. Kept as ratified (BigDev, 2026-09-21).
 */
export const NOMINEE_RELATIONSHIP_CODES = [
  'spouse',
  'mother',
  'father',
  'son',
  'daughter',
  'brother',
  'sister',
  'uncle',
  'aunt',
  'cousin',
  'niece_nephew',
  'grandchild',
  'sister_in_law',
  'daughter_in_law',
  'other',
] as const;
export const NomineeRelationship = z.enum(NOMINEE_RELATIONSHIP_CODES);
export type NomineeRelationship = z.output<typeof NomineeRelationship>;

// ── declare ───────────────────────────────────────────────────────────────────────────

/**
 * One nominee in the declare body. `name` is the member's typed value (Tier-1 PII —
 * REQUEST-only). `mobile` reuses the lenient member `MobileNumber` shape. `address` is
 * OPTIONAL (AC1). NO bank/IFSC and NO Aadhaar/KYC fields here — claim-time only (AC2/AC3).
 */
export const NomineeDeclareEntry = z
  .object({
    // Story 6.18 (AC12), `2026-09-20-227` cl.9 — captured in ENGLISH script so the District
    // Admin's name check is a comparison and ⛔ not an ad-hoc transliteration. INPUT-only.
    name: EnglishScriptName,
    relationship: NomineeRelationship,
    mobile: MobileNumber,
    address: z.string().trim().min(1).max(500).optional(),
  })
  .strict();
export type NomineeDeclareEntry = z.output<typeof NomineeDeclareEntry>;

/**
 * `POST /member/nominees` — declare 1 or 2 nominees. The 75/25 split is NOT in the wire
 * shape: the server DERIVES it from the count (R4 — never trust a client percentage), so the
 * client cannot override it. 1 nominee → sole (100%); 2 nominees → primary 75% / secondary 25%.
 */
export const NomineeDeclareRequest = z
  .object({
    nominees: z.array(NomineeDeclareEntry).min(1).max(2),
  })
  .strict();
export type NomineeDeclareRequest = z.output<typeof NomineeDeclareRequest>;

// ── status (member-facing; NO PII echo-back) ──────────────────────────────────────────

/**
 * One nominee in the status view — NON-PII only. `rank` (1 primary / 2 secondary),
 * `relationship`, the server-stamped `splitPct`, and presence flags for the encrypted
 * fields. NEVER the raw name/mobile/address bytes (Tier-1 echo-back discipline).
 */
export const NomineeSummaryEntry = z
  .object({
    rank: z.union([z.literal(1), z.literal(2)]),
    relationship: NomineeRelationship,
    splitPct: z.union([z.literal(100), z.literal(75), z.literal(25)]),
    mobilePresent: z.boolean(),
    addressPresent: z.boolean(),
  })
  .strict();
export type NomineeSummaryEntry = z.output<typeof NomineeSummaryEntry>;

/**
 * `GET /member/nominees` — the current effective declaration. An object WRAPPER around the
 * array (NOT a bare array — follows the `KycStatusResponse` object-wrapper convention), so
 * the shape is extensible (e.g. adding a `declaredAt` later) without a breaking wire change.
 */
export const NomineeStatusResponse = z
  .object({
    nominees: z.array(NomineeSummaryEntry),
    /**
     * Story 6.20 (AC2) — the declaration is LOCKED: a claim was filed for this member as the deceased
     * (`2026-09-20-234` V), and ⛔ no innocence finding has released it. A declare is then refused with
     * 409 `nominee.locked_claim_filed`; a genuine mistake goes through the correction route instead.
     */
    locked: z.boolean(),
  })
  .strict();
export type NomineeStatusResponse = z.output<typeof NomineeStatusResponse>;
