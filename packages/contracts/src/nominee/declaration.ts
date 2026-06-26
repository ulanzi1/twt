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

import { MobileNumber } from '../_common/primitives.js';

// ── Wire enum (re-declared; value-aligned with member_nominees.relationship) ───────────

/**
 * Nominee relationship-to-member. Constrained HERE (data quality) rather than at the DB,
 * where `relationship` is plain Tier-3 text (the kyc_transactions.status "text for the swap
 * seam" posture). The server stores the validated label verbatim.
 */
export const NomineeRelationship = z.enum(['spouse', 'child', 'parent', 'sibling', 'other']);
export type NomineeRelationship = z.output<typeof NomineeRelationship>;

// ── declare ───────────────────────────────────────────────────────────────────────────

/**
 * One nominee in the declare body. `name` is the member's typed value (Tier-1 PII —
 * REQUEST-only). `mobile` reuses the lenient member `MobileNumber` shape. `address` is
 * OPTIONAL (AC1). NO bank/IFSC and NO Aadhaar/KYC fields here — claim-time only (AC2/AC3).
 */
export const NomineeDeclareEntry = z
  .object({
    name: z.string().trim().min(1).max(200),
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
  })
  .strict();
export type NomineeStatusResponse = z.output<typeof NomineeStatusResponse>;
