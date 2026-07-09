// packages/contracts/src/claims/helpline.ts
//
// Helpline-mediated claim-filing transport DTOs (Story 6.3, Task 2). The request/response
// wire shapes for the operator-console (Priya-path) intake:
//   · POST /api/v1/p/:pariwarId/admin/claims/intake — operator files a claim on a bereaved
//     caller's behalf → emit claim.intake_initiated (→ freeze), idempotently + convergently.
//
// This is the operator-path TWIN of the member-app (Ravi-mode) intake in ./filing.ts. The two
// channels emit the SAME `claim.intake_initiated` domain event (differing only in
// `intake_channel` + `actor` + the audit actor) and dedup against the SAME
// `getClaimByDeceasedMember` accessor — a death that already has a live claim never mints a
// second (crude cross-channel convergence; the RICH ICP visibility/override is Story 6.4).
//
// ── Contracts discipline ──────────────────────────────────────────────────────────────
// A contracts SOURCE file MUST NOT import `@twt/domain` (the browser-bundle rule). The claim-
// lifecycle state literal + the claimant-relationship enum are REUSED from ./filing.ts (both
// re-declared there, value-aligned with @twt/domain). This file describes ONLY the REST wire
// shape — it does NOT shadow the `claim.*` event payloads (those live in @twt/domain). ALL
// objects `.strict()`.
//
// ── Two intake differences vs the member-app request ──────────────────────────────────
// 1. `deceasedMemberId` is on the WIRE (the operator is NOT the deceased — the member-app path
//    derives the deceased from the Ravi-mode session; here it comes from the lookup result).
// 2. `identityReadBackConfirmed: z.literal(true)` — the wire itself asserts AC2's HARD gate
//    (the intake is refused unless the caller's verbal identity read-back was confirmed). This
//    is the operator-path analogue of Ravi-mode's handover-trust OTP. Nominee confirmation is
//    deliberately NOT a wire field — the nominee-summary read-back is advisory and does NOT
//    gate intake (AC2).
//
// ── `lookupMethod` is audit metadata, NOT a domain fact (AC3) ──────────────────────────
// The search dimension the operator used to find the member is a NON-PII operational-insight
// field carried on the wire so the server can record it in the `helpline_claim.*` audit
// context. It is NEVER written into the `claim.intake_initiated` domain payload (that stays
// `.strict()` and unchanged) — it is a wire+audit field only.
//
// ── PII discipline ────────────────────────────────────────────────────────────────────
// No caller/nominee PII on any helpline wire shape — only ids + relationship + the read-back
// confirmation flag + the (non-PII) lookup method.

import { z } from 'zod';

import { UuidString } from '../_common/primitives.js';
import { ClaimLifecycleState, ClaimantRelationship } from './filing.js';

// ── lookup method (AC3 audit metadata) ─────────────────────────────────────────────────

/**
 * The search dimension the operator used to find the deceased member (Story 4.7 exact-match
 * search: by memberId, by mobile blind-index, or browse the active Pariwar). Carried on the
 * intake request as NON-PII operational-insight AUDIT metadata — recorded in the
 * `helpline_claim.*` audit context, NEVER in the `claim.intake_initiated` domain payload.
 */
export const HelplineLookupMethod = z.enum(['memberId', 'mobile', 'pariwar']);
export type HelplineLookupMethod = z.output<typeof HelplineLookupMethod>;

// ── intake (AC2/AC3/AC4) ────────────────────────────────────────────────────────────────

/**
 * `POST /api/v1/p/:pariwarId/admin/claims/intake` — the operator files a claim on the
 * deceased member's behalf. Unlike the member-app request, `deceasedMemberId` is on the wire
 * (resolved from the operator's member lookup; the server re-guards it is a real member in
 * this Pariwar). `identityReadBackConfirmed` is a literal `true` so the wire ITSELF enforces
 * AC2's HARD identity gate (a `false`/absent value is rejected at validation — the intake can
 * never fire without the caller's verbal identity confirmation). Nominee confirmation is
 * intentionally absent (advisory, non-gating). `lookupMethod` is audit-only metadata.
 */
export const HelplineClaimIntakeRequest = z
  .object({
    deceasedMemberId: UuidString,
    relationship: ClaimantRelationship,
    identityReadBackConfirmed: z.literal(true),
    lookupMethod: HelplineLookupMethod,
  })
  .strict();
export type HelplineClaimIntakeRequest = z.output<typeof HelplineClaimIntakeRequest>;

/**
 * The helpline intake response — the minted (or, on an idempotent/convergent hit, the
 * EXISTING) canonical claim id + its lifecycle state + a `created` discriminator. Unlike the
 * member-app response, `created` is surfaced so the operator console can distinguish a fresh
 * filing (`created: true`) from a "claim already exists for this member" convergence hit
 * (`created: false` — a prior app OR helpline filing for the same death; no second freeze).
 */
export const HelplineClaimIntakeResponse = z
  .object({
    claimCaseId: z.string().uuid(),
    state: ClaimLifecycleState,
    created: z.boolean(),
  })
  .strict();
export type HelplineClaimIntakeResponse = z.output<typeof HelplineClaimIntakeResponse>;

// ── operator-event audit (Review Finding — AC4/AC5) ────────────────────────────────────
//
// AC4 requires "every operator action (search, read-back-confirm, intake, idempotent-hit,
// escalation) writes a NON-PII audit line". The intake/idempotent/failed lines are covered by
// the intake endpoint above; `search` is covered by the reused Story 4.7 member-search audit.
// `readback_confirmed` and `escalated` had no audit line at all — this DTO covers both with
// ONE narrowly-scoped, non-freezing endpoint (no step-up: neither mutates claim/member state,
// they only record that the action happened). This is deliberately NOT the fuller Story 0.7
// fallback-handler ledger (AC5: "the ledger is referenced, not re-implemented") — just the
// AC4-mandated audit line.

/** The non-freezing operator actions this audit-only endpoint covers. */
export const HelplineOperatorEvent = z.enum(['readback_confirmed', 'escalated']);
export type HelplineOperatorEvent = z.output<typeof HelplineOperatorEvent>;

/**
 * `POST /api/v1/p/:pariwarId/admin/claims/operator-event` — record a NON-PII audit line for a
 * read-back confirmation or an AR-61 supervisor escalation. `deceasedMemberId` is required (the
 * event is scoped to a specific lookup result); a no-match escalation — where no member was
 * ever selected — has nothing to attribute the audit line to and is not covered by this
 * endpoint (AC5's "or not yet minted, for a no-match").
 */
export const HelplineOperatorEventRequest = z
  .object({
    deceasedMemberId: UuidString,
    event: HelplineOperatorEvent,
    lookupMethod: HelplineLookupMethod,
  })
  .strict();
export type HelplineOperatorEventRequest = z.output<typeof HelplineOperatorEventRequest>;

export const HelplineOperatorEventResponse = z.object({ recorded: z.literal(true) }).strict();
export type HelplineOperatorEventResponse = z.output<typeof HelplineOperatorEventResponse>;
