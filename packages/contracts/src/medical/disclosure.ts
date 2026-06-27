// packages/contracts/src/medical/disclosure.ts
//
// The signup medical-disclosure transport DTOs (Story 3.5, Task 5). The request/response shapes
// for `POST /member/medical-disclosure` (submit), `GET /member/medical-disclosure` (status), and
// `GET /member/medical-disclosure/ima-list` (the catalog + concealment-ack copy) — the fourth
// signup-wizard SURFACE (between nominees 3.4 and payment 3.6).
//
// ── Contracts discipline ──────────────────────────────────────────────────────────────────
// A contracts SOURCE file MUST NOT import `@twt/domain` (the browser-bundle rule — the domain
// barrel re-exports `encryption` → `node:async_hooks`). So these use `_common` primitives
// (`Iso8601Datetime`) + plain `string`, and the IMA condition codes / labels are plain strings
// (the catalog is resolved server-side from the `niy.medical.ima-list` clause). ALL objects
// `.strict()`.
//
// ── PII discipline (no-PII echo-back) ─────────────────────────────────────────────────────
// The submit REQUEST body carries Tier-1 PII (selected condition codes + free-text additional
// context) — it is a REQUEST body (never logged; the audit trail + event carry count + version
// only). The status RESPONSE (`MedicalDisclosureSummary`) NEVER round-trips the raw condition
// codes / free-text back — it exposes the version, count, a presence flag, and locale only
// (mirrors `NomineeSummaryEntry`'s presence-flag discipline). The ima-list RESPONSE carries the
// catalog + the concealment-ack copy (both sourced from the clause payloads), NO member PII.

import { z } from 'zod';

import { Iso8601Datetime } from '../_common/primitives.js';

/** The locale the concealment-ack text was shown in (mirrors the clause payload's two locales). */
export const MedicalAckLocale = z.enum(['en', 'hi']);
export type MedicalAckLocale = z.output<typeof MedicalAckLocale>;

// ── submit ──────────────────────────────────────────────────────────────────────────────────

/**
 * `POST /member/medical-disclosure` — submit a medical disclosure. `conditionCodes` is the set of
 * selected IMA condition codes (**0..N — zero is valid**; most members disclose nothing); the
 * server validates each against the resolved `niy.medical.ima-list` catalog (unknown code → 400).
 * `additionalContext` is the OPTIONAL free-text (Tier-1 PII — REQUEST-only). `imaListVersion` is
 * the catalog version the client rendered (the server's resolved version wins — staleness check
 * only). `acknowledged` is `z.literal(true)` so the contract itself rejects a false/absent ack
 * (defense-in-depth; the server STILL re-checks per AC2/AC6).
 */
export const MedicalDiscloseRequest = z
  .object({
    conditionCodes: z
      .array(z.string().min(1).max(64))
      .max(50)
      .refine((codes) => new Set(codes).size === codes.length, {
        message: 'conditionCodes must be unique',
      }),
    additionalContext: z.string().trim().min(1).max(2000).optional(),
    imaListVersion: z.string().min(1).max(128),
    acknowledged: z.literal(true),
    ackLocale: MedicalAckLocale,
  })
  .strict();
export type MedicalDiscloseRequest = z.output<typeof MedicalDiscloseRequest>;

// ── status (member-facing; NO PII echo-back) ─────────────────────────────────────────────────

/**
 * One disclosure in the status view — NON-PII only. `disclosedAt`, the `imaListVersion` the
 * member saw, the `conditionCount`, a presence flag for the optional free-text, and the ack
 * locale. NEVER the raw condition codes / free-text bytes (Tier-1 echo-back discipline).
 */
export const MedicalDisclosureSummary = z
  .object({
    disclosedAt: Iso8601Datetime,
    imaListVersion: z.string(),
    conditionCount: z.number().int().nonnegative(),
    hasAdditionalContext: z.boolean(),
    ackLocale: MedicalAckLocale,
  })
  .strict();
export type MedicalDisclosureSummary = z.output<typeof MedicalDisclosureSummary>;

/**
 * `GET /member/medical-disclosure` — the latest disclosure (or null when none) + the total
 * history count. An object WRAPPER (NOT a bare array — follows the `KycStatusResponse` /
 * `NomineeStatusResponse` object-wrapper convention). `latest` is the head of the APPEND-ONLY
 * history; `historyCount` is the full count (Epic 4 walks the whole history).
 */
export const MedicalDisclosureStatusResponse = z
  .object({
    latest: MedicalDisclosureSummary.nullable(),
    historyCount: z.number().int().nonnegative(),
  })
  .strict();
export type MedicalDisclosureStatusResponse = z.output<typeof MedicalDisclosureStatusResponse>;

// ── ima-list (catalog + concealment-ack copy) ────────────────────────────────────────────────

/** One IMA condition in the catalog the screen renders (bilingual labels from the clause payload). */
export const ImaListCondition = z
  .object({
    code: z.string().min(1),
    labelEn: z.string().min(1),
    labelHi: z.string().min(1),
  })
  .strict();
export type ImaListCondition = z.output<typeof ImaListCondition>;

/**
 * `GET /member/medical-disclosure/ima-list` — the resolved IMA catalog (`version` = the
 * `niy.medical.ima-list` clause_version_id + its bilingual conditions) plus the concealment-ack
 * copy (`ackText.en` / `ackText.hi` sourced from the `niy.concealment.r14` payload — the exact
 * wording the screen renders and the server records as `consent_payload.checkboxTextShown`).
 */
export const ImaListResponse = z
  .object({
    version: z.string(),
    conditions: z.array(ImaListCondition),
    ackText: z
      .object({
        en: z.string().min(1),
        hi: z.string().min(1),
      })
      .strict(),
  })
  .strict();
export type ImaListResponse = z.output<typeof ImaListResponse>;
