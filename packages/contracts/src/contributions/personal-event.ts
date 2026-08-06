// packages/contracts/src/contributions/personal-event.ts
//
// The personal-event ASSERTION transport DTOs — Story 10.26 (Task 5; AC1, AC7, AC8(c)).
//
// ⚖ WHAT THIS ENDPOINT IS, and what its SHAPE must never imply.
// The ratified Niyamavali §3.1 (`docs/legal/niyamavali.md:81`, Trustee Panel 2026-08-06) settles the
// semantics before any field is named: "No exemption. Personal events do not excuse a missed
// contribution; the assertion is recorded on the member's own record but grants no restoration relief
// and carries no consequence of its own."
//
// So this is a RECORD, not a REQUEST. There is no counterparty, no reviewer, no approval, no denial
// and nothing to reverse. AC1's strongest failure mode is not a copy slip — it is a route named
// `.../excuse-requests` or a response field named `status`, which makes a FALSE PROMISE STRUCTURAL:
// the member is told, in the shape of the API itself, that something might come of asserting.
// Nothing will. Hence: `POST .../contributions/personal-events`, and a response that echoes only
// what was recorded plus the Niyamavali's answer. NO `status`, NO `approved`, NO `decision`.
//
// ── NO FREE TEXT (D3) ────────────────────────────────────────────────────────────────────────────
// A member describing a death or an illness would be Tier-1 PII of the most sensitive kind landing in
// `events_log`, which is append-only plaintext JSONB and is never redacted. It would need KMS
// envelope encryption, an RTBF path and a PII-scrape-gate exemption — and it would earn NOTHING,
// because nothing reads it: R7(G) is declarative, there is no reviewer, and the engine fact is a
// boolean. A free-text box with no reader is a false promise that someone is listening. Members who
// need a human have the Helpdesk (Epic 10.1–10.4), which has real people on the other end.
//
// ── Contracts discipline ─────────────────────────────────────────────────────────────────────────
// A contracts SOURCE file MUST NOT import `@twt/domain` ([[project_contracts_domain_bundle_boundary]]
// — the domain barrel re-exports `encryption` → `node:async_hooks`, which would leak `pg` into the RN
// Metro bundle). So `PersonalEventKind` below is a LOCAL wire-enum, value-aligned with the domain's
// `PERSONAL_EVENT_KINDS`, on the `LifeEventsLocale` precedent (`life-events/address.ts:22`). The two
// are held in LOCKSTEP by a test (`tests/personal-event.test.ts`), which is a TEST-ONLY cross-package
// import and therefore safe. All objects `.strict()`; NO `.openapi()` (the nominee/medical/life-events
// posture — keeps `openapi/v1.yaml` path-stable).

import { z } from 'zod';

import { Iso8601Datetime, UuidString } from '../_common/primitives.js';

/**
 * The BOUNDED vocabulary an assertion may name — the wire mirror of `@twt/domain`'s
 * `PERSONAL_EVENT_KINDS`. Value-aligned and lockstep-tested; never imported across the boundary.
 *
 * ⚠ `other` is retained deliberately despite carrying no information: removing it would force a
 * member whose situation is not on this list to mis-categorise their own life, which is worse than a
 * coarse bucket.
 */
export const PersonalEventKind = z.enum([
  'bereavement',
  'illness',
  'caregiving',
  'displacement',
  'financial_hardship',
  'other',
]);
export type PersonalEventKind = z.output<typeof PersonalEventKind>;

/**
 * `POST /api/v1/p/:pariwarId/member/contributions/personal-events` — record that a personal event
 * affected the member's ability to contribute.
 *
 * ⚠ Note what the request CANNOT carry: no free text of any kind (D3), and no member id — the
 * subject is the authenticated member, resolved from the session, never client-supplied. The
 * `Idempotency-Key` and Turnstile token ride HEADERS, not this body (the Story 10.2 member-surface
 * pattern).
 *
 * `cycleRef` is OPTIONAL provenance and is UNPOPULATED by any surface today. That is a recorded gap,
 * not an oversight: NO member surface lists a MISSED cycle (the Yogdaan Bahi lists ATTESTED
 * contributions, and a missed cycle produces no attestation and therefore no row), so the member has
 * nothing to point at. It ships now so a future cycle-scoped surface needs no new event type
 * (D5; Escalation 5).
 */
export const PersonalEventAssertionRequest = z
  .object({
    kind: PersonalEventKind,
    cycleRef: UuidString.optional(),
  })
  .strict();
export type PersonalEventAssertionRequest = z.output<typeof PersonalEventAssertionRequest>;

/**
 * The response. It echoes WHAT WAS RECORDED and states the Niyamavali's answer — nothing more.
 *
 * ⚠ `grantsRelief` is hard `false` on the wire, and it is a `z.literal(false)` rather than a boolean
 * on purpose: the wire itself asserts the invariant, so a future handler cannot ship a `true` without
 * a contract change and a review. It exists so a client cannot mistake a 201 for an approval — the
 * one misreading this whole surface is designed against.
 *
 * There is deliberately NO `status`, `approved`, `decision`, `reviewedBy` or `expiresAt`. A member
 * has nothing to wait for and nothing to check back on.
 */
export const PersonalEventAssertionResponse = z
  .object({
    /** The `events_log` event id of the recorded assertion — an audit anchor, not a case number. */
    eventId: UuidString,
    kind: PersonalEventKind,
    recordedAt: Iso8601Datetime,
    /** ⚖ Always `false`. The ratified §3.1: the assertion "grants no restoration relief". */
    grantsRelief: z.literal(false),
  })
  .strict();
export type PersonalEventAssertionResponse = z.output<typeof PersonalEventAssertionResponse>;
