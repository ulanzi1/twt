// packages/contracts/src/terms/member-terms.ts
//
// Member-facing Terms & Conditions transport DTOs (Story 3.6a, AC3) — the read + accept the signup
// wizard's `tc` step uses. This is the MEMBER surface; the existing `terms-and-conditions/` admin
// contracts are the trustee AUTHORING surface (create/approve versions). Two routes:
//   · `GET  /api/v1/member/terms`        → the current effective T&C version for the member's
//     Pariwar (the PRECOMPUTED sanitized HTML, never re-rendered at read time); 503 when the
//     registry is unprovisioned for the Pariwar (a server-side gap, not a client error).
//   · `POST /api/v1/member/terms/accept` → records a `tc_acceptance` consent via the audit-or-throw
//     chain (the server resolves the effective version server-side; the client value is advisory).
//
// ── Contracts discipline ──────────────────────────────────────────────────────────────────────
// A contracts SOURCE file MUST NOT import `@twt/domain` (the browser-bundle rule). So these use
// `_common` primitives + plain `string`; the rendered T&C body is a plain `html` string (sanitized
// server-side at write time by `renderTcMarkdown`). ALL objects `.strict()`.

import { z } from 'zod';

import { Iso8601Datetime, UuidString } from '../_common/primitives.js';

/** The UI locale the member viewed / accepted the T&C in (the consent payload records it). */
export const MemberTermsLocale = z.enum(['en', 'hi']);
export type MemberTermsLocale = z.output<typeof MemberTermsLocale>;

/**
 * `GET /api/v1/member/terms` — the current effective T&C for the member's Pariwar. `html` is the
 * server-precomputed sanitized render (`terms_and_conditions_versions.body_html_rendered`), emitted
 * verbatim (the screen does NO markdown rendering). `locale` echoes the requested UI locale so the
 * client records which language it presented (the legal body itself is single-canonical per Pariwar).
 */
export const MemberTermsResponse = z
  .object({
    tcVersionId: UuidString,
    effectiveFrom: Iso8601Datetime,
    html: z.string().min(1),
    locale: MemberTermsLocale,
  })
  .strict();
export type MemberTermsResponse = z.output<typeof MemberTermsResponse>;

/**
 * `POST /api/v1/member/terms/accept` — accept the current effective T&C. `tcVersionId` is the
 * version the client rendered (the server's resolved effective version WINS — this is a staleness
 * signal only); `locale` is the UI locale the member accepted in (recorded in the consent payload).
 */
export const MemberTermsAcceptRequest = z
  .object({
    tcVersionId: UuidString,
    locale: MemberTermsLocale,
  })
  .strict();
export type MemberTermsAcceptRequest = z.output<typeof MemberTermsAcceptRequest>;

/** The accept ack — `consentId` is the `tc_acceptance` consent_records row the chain minted. */
export const MemberTermsAcceptResponse = z
  .object({
    accepted: z.literal(true),
    consentId: UuidString,
    tcVersionId: UuidString,
  })
  .strict();
export type MemberTermsAcceptResponse = z.output<typeof MemberTermsAcceptResponse>;
