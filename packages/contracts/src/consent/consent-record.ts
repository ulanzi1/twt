// packages/contracts/src/consent/consent-record.ts
//
// Transport contracts for the consent registry (Story 2.7, AC6). These DTOs exist
// for Epic 3 (signup tc_acceptance / medical_disclosure_ack / nominee_share_split)
// and Epic 6 (claim_time_dpdpa) to import — Story 2.7 itself ships NO endpoint, so
// there is NO `.openapi()` registration and `openapi/v1.yaml` does NOT change. The
// DTOs also back the dual `z.enum` ↔ `pgEnum` lockstep guard (tests/consent.test.ts).
//
// camelCase top-level fields mirror the domain Drizzle row
// (packages/domain/src/schema/consent_records.ts) per the contracts convention;
// timestamps are Iso8601 strings (the consumer serialises Date at the transport
// boundary). The two `z.enum`s are value-aligned with the domain `consent_type` /
// `consent_granted_via` pgEnums; `@twt/domain` cannot import this package
// (browser-bundle constraint), so tests/consent.test.ts asserts the lockstep (the
// TcLegalReviewStatus / BenefitMechanism precedent — contracts→domain is the legal
// import direction).

import { z } from 'zod';

import { Iso8601Datetime, UuidString } from '../_common/primitives.js';

/** Per-row consent-record address (UUID), branded `ConsentId`. */
export const ConsentIdSchema = z.string().uuid().brand<'ConsentId'>();
export type ConsentIdSchema = z.output<typeof ConsentIdSchema>;

/**
 * The consent category (AC1) — the SEVEN AC1 values only. Value-aligned with the
 * domain `consent_type` pgEnum; the lockstep test is the anti-drift guard. New types
 * are added by their own consumer epic via an additive `ALTER TYPE` (and here).
 */
export const ConsentTypeSchema = z.enum([
  'tc_acceptance',
  'dpdpa_data_processing',
  'dpdpa_data_sharing',
  'marketing',
  'medical_disclosure_ack',
  'nominee_share_split',
  'claim_time_dpdpa',
  // Story 5.4 — member WhatsApp opt-in consent (lockstep with the domain `consent_type`
  // pgEnum; the tests/consent.test.ts equality assertion is the anti-drift guard).
  'whatsapp_opt_in',
  // Story 5.5 — member Telegram opt-in consent (a separate first-class consent type mirroring
  // whatsapp_opt_in; consent is independent of transport policy — see the Story 5.5 "Consent vs.
  // operational delivery state" invariant). Lockstep with the domain `consent_type` pgEnum.
  'telegram_opt_in',
  // Story 6.9 (D2) — the two claim-time public-transparency consents (captured at claim-time, consumed
  // by Epic 11b's render gate). Lockstep with the domain `consent_type` pgEnum (migration 0058).
  'sahyog_vivran_publication',
  'in_memoriam_listing',
]);
export type ConsentTypeSchema = z.output<typeof ConsentTypeSchema>;

/**
 * How a consent was granted (AC1). Value-aligned with the domain
 * `consent_granted_via` pgEnum; lockstep-asserted in tests/consent.test.ts.
 */
export const ConsentGrantedViaSchema = z.enum(['member_self', 'staff_assisted', 'inherited']);
export type ConsentGrantedViaSchema = z.output<typeof ConsentGrantedViaSchema>;

/**
 * The documented `consent_payload` shape — operational context a consumer SHOULD
 * populate at consent time. `.passthrough()` (NOT `.strict()`) mirrors the permissive
 * jsonb column: extra keys are allowed so a consumer can attach further context.
 * NEVER place Tier-1 PII here (see the domain schema header).
 */
export const ConsentPayloadSchema = z
  .object({
    checkboxTextShown: z.string().optional(),
    locale: z.string().optional(),
    ip: z.string().optional(),
    userAgent: z.string().optional(),
  })
  .passthrough();
export type ConsentPayloadSchema = z.output<typeof ConsentPayloadSchema>;

/**
 * The consent-record response DTO — mirrors the domain `consent_records` row,
 * including the two variance columns (`revocationReason`, `revokedAuditId`).
 * `.strict()` rejects unknown keys (architecture §Format L3824-3826). `subjectId` is
 * an un-branded `UuidString` (the column is polymorphic — member OR pre-member
 * applicant — so a brand would mis-describe it).
 */
export const ConsentRecordResponse = z
  .object({
    consentId: ConsentIdSchema,
    subjectId: UuidString,
    pariwarId: UuidString.brand<'PariwarId'>(),
    consentType: ConsentTypeSchema,
    consentArtifactRef: z.string().nullable(),
    grantedAt: Iso8601Datetime,
    revokedAt: Iso8601Datetime.nullable(),
    grantedViaActor: ConsentGrantedViaSchema,
    consentPayload: ConsentPayloadSchema,
    auditId: UuidString.nullable(),
    revocationReason: z.string().nullable(),
    revokedAuditId: UuidString.nullable(),
  })
  .strict();
export type ConsentRecordResponse = z.output<typeof ConsentRecordResponse>;

/**
 * Record a consent grant (consumed by the Epic 3/6 route). The server derives
 * `grantedAt` (DB now()), mints the `consentId`, and threads the audit id from the
 * audit-or-throw step — the client sends only the consent's substance. Omit
 * `consentArtifactRef` for consents with no versioned artifact (e.g. `marketing`).
 */
export const RecordConsentRequest = z
  .object({
    subjectId: UuidString,
    consentType: ConsentTypeSchema,
    consentArtifactRef: z.string().min(1).optional(),
    grantedViaActor: ConsentGrantedViaSchema,
    consentPayload: ConsentPayloadSchema,
  })
  .strict();
export type RecordConsentRequest = z.output<typeof RecordConsentRequest>;

/**
 * Revoke a consent (consumed by the Epic 3/6 route). The `consentId` is a future
 * path param (NOT in the body); the body carries only the required `reason`.
 */
export const RevokeConsentRequest = z
  .object({
    reason: z.string().min(1),
  })
  .strict();
export type RevokeConsentRequest = z.output<typeof RevokeConsentRequest>;
