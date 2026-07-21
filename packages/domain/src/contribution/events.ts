// Contribution event vocabulary + Zod payload schemas — Story 8.4 (Task 1; AC3/AC4).
//
// The FIRST `contribution.*` WRITE event: `contribution.utr-attested` — a member's SELF-ATTESTED
// payment CLAIM (the yellow pill). It is appended on the ALERT's `events_log` stream (stream_id =
// alert_id; the alert is 1:1 with the cycle) and carries the pool + member scope + the deterministic
// `tr` + the raw pasted `utr` + the load-bearing `attestation_only: true` flag. These schemas validate
// the event PAYLOAD; `occurred_at` + `pariwar_id` + `actor_id` are columns on `events_log` and are NOT
// duplicated here.
//
// ── Yellow, NOT green — the load-bearing invariant (AC3/AC4, epics.md:2935-2941) ────────────────────
// This event is a member-declared payment CLAIM only — NOT a reconciliation-confirmed contribution,
// NOT fund receipt, NOT payout eligibility. Green (`contribution.confirmed`) is Epic 9's EXCLUSIVE
// producer (epics.md:2855). The `attestation_only: z.literal(true)` flag is a REQUIRED literal so a
// downstream `.strict()` consumer can never mistake a yellow event for a confirmed one; an event that
// omits or negates it does not validate. Story 8.3's confirmed-only read (`contribution/read.ts`) hard-
// filters `event_type = 'contribution.confirmed'`, so this yellow event is STRUCTURALLY unable to reach
// any confirmed surface — the yellow-never-confirmed teeth bite against THIS real producer.
//
// ── Payload keys mirror 8.3's forward confirmed contract (D2) ───────────────────────────────────────
// `poolId` + `memberId` match `CONFIRMED_PAYLOAD_POOL_KEY` / `CONFIRMED_PAYLOAD_MEMBER_KEY`
// (contribution/read.ts:54-57) so the yellow event is queryable on the SAME scope keys the confirmed
// read filters — that symmetry is exactly what lets the exclusion test bite (the yellow event is right
// there on events_log, scoped to the pool, yet the confirmed read still returns []).
//
// ── The raw `utr` is load-bearing for Epic 9 (AC3, epics.md:3163 / PRD FR-30) ───────────────────────
// Story 9.4's reconciliation matcher PRIMARY-matches this event's `utr` field exact-equal against
// `BankStatementEntry.transaction_id_utr` (Story 9.2). Omitting it would force every contribution onto
// the weaker secondary (amount + VPA + timestamp) path. So the PERSISTED payload carries the real UTR;
// masking (last-4, the vyawastha-shulk `maskUtr` precedent) is applied ONLY at the audit/log boundary,
// never here.
//
// ── Why these live in @twt/domain (not @twt/contracts) ──────────────────────────────────────────────
// `@twt/events` depends on @twt/domain; the registry (packages/events/src/registry.ts) imports these
// schemas. Putting them in @twt/contracts would reverse the legal import direction (contracts→domain).
// Same rationale as alert/events.ts + pool/events.ts.

import { z } from 'zod';

import { CONTRIBUTION_REF_MAX_LENGTH } from '../pool/contribution-reference.js';

/**
 * The permissive UTR format (AC3/D8) — 12-digit numeric (IMPS/UPI typical) OR 22-char alphanumeric
 * (NEFT/RTGS fallback), matching PRD FR-28's stated shape exactly. MIRRORS the shipped
 * `packages/contracts/src/payments/vyawastha-shulk.ts:58` regex verbatim — @twt/domain cannot import
 * @twt/contracts (the legal import direction is contracts→domain), so the pattern is duplicated here as
 * the domain-layer authority; the two MUST stay in sync. This validates SHAPE only — semantic/existence
 * verification against a real bank statement is Epic 9's reconciliation matcher, never 8.4's.
 */
export const CONTRIBUTION_UTR_REGEX = /^\d{12}$|^[A-Za-z0-9]{22}$/;

/**
 * `contribution.utr-attested` payload (AC3/AC4). A member-declared payment CLAIM (yellow). There is NO
 * contribution state machine, so this is modelled as an ANNOTATION-style payload (the claim-annotation
 * precedent) rather than a `from_state`/`to_state` transition: the minimal audit analogue is `actor`
 * (always the member — a member alone self-attests their own payment) + `trigger` (a freeform audit note,
 * the alert/claim trigger-field decision). `.strict()`: an unknown key is a defect.
 *
 *   · `poolId`  — the assigned pool the contribution belongs to (the scope key; poolId is 1:1 with a
 *                 cycle). Mirrors 8.3's CONFIRMED_PAYLOAD_POOL_KEY (D2).
 *   · `memberId`— the attesting member (mirrors CONFIRMED_PAYLOAD_MEMBER_KEY, D2).
 *   · `tr`      — the DETERMINISTIC `deriveContributionReference({ memberId, alertId })` (Story 7.7),
 *                 the idempotency spine (same member+alert → same tr → one valid attestation). Bounded
 *                 by the NPCI ceiling (CONTRIBUTION_REF_MAX_LENGTH).
 *   · `utr`     — the RAW member-pasted UTR (load-bearing for Epic 9's primary match — persisted in full).
 *   · `attestation_only` — the REQUIRED `true` literal (the load-bearing yellow-not-green guard).
 */
export const ContributionUtrAttestedPayloadSchema = z
  .object({
    // Minimal audit analogue (no contribution state machine — annotation-style, D-Task1).
    actor: z.literal('member'),
    trigger: z.string().min(1),
    poolId: z.string().uuid(),
    memberId: z.string().uuid(),
    tr: z.string().min(1).max(CONTRIBUTION_REF_MAX_LENGTH),
    utr: z.string().regex(CONTRIBUTION_UTR_REGEX, 'UTR must be 12 digits or 22 alphanumerics'),
    // The load-bearing flag: a downstream consumer can never mistake a yellow claim for a confirmed
    // contribution, and an event that omits/negates it does not validate (AC3/AC4).
    attestation_only: z.literal(true),
  })
  .strict();
export type ContributionUtrAttestedPayload = z.infer<typeof ContributionUtrAttestedPayloadSchema>;

// ── The contribution-event vocabulary + the type→schema map (single source) ──────────────────────────

export const CONTRIBUTION_EVENT_TYPES = ['contribution.utr-attested'] as const;

/** The dotted `contribution.*` WRITE event-type literal union (8.4 lands the first; green is Epic 9's). */
export type ContributionEventType = (typeof CONTRIBUTION_EVENT_TYPES)[number];

/**
 * type → payload-schema map. The ONE place the contribution WRITE events bind to their schemas;
 * `EVENT_TYPE_REGISTRY` (packages/events) + the write primitive consume it. The `satisfies` keeps it
 * exhaustive — adding a `ContributionEventType` without a schema is a compile error. `contribution.confirmed`
 * (green) is DELIBERATELY absent: Epic 9 owns that producer exclusively (D11).
 */
export const CONTRIBUTION_EVENT_PAYLOAD_SCHEMAS = {
  'contribution.utr-attested': ContributionUtrAttestedPayloadSchema,
} as const satisfies Record<ContributionEventType, z.ZodTypeAny>;
