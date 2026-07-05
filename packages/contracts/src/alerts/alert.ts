// packages/contracts/src/alerts/alert.ts
//
// The structured `alert` payload — the Epic 5 channel-primitive contract (Story 5.1, AC1).
//
// This is the SHAPE that Epic 6 (claim notifications), Epic 8 (contribution notifications), and Epic 3's
// renewal-lock-in reminder cadence all publish into. The central dispatcher (`@twt/channels`) consumes it,
// deep-freezes it, and fans it out across the three-tier channel ladder. It is the eventual target shape
// the FR-23 `RenewalReminderNudge` seam (../notifications/renewal-reminder.ts) maps into.
//
// ── PII posture (mirrors ../notifications/renewal-reminder.ts) ────────────────────────────────────────
// The payload carries IDs, provenance refs, and ADMIN-AUTHORED display strings (announcement titles,
// module titles, amendment summaries) — never a member name / mobile / address. The dispatcher resolves
// contact details from the member record at delivery time. Admin-authored strings ARE rendered, so the
// channel renderers escape them at substitution (Story 5.1 AC6) — an admin who types markdown / template
// syntax must render as inert text.
//
// ── OpenAPI posture ───────────────────────────────────────────────────────────────────────────────────
// Internal queue seam, NOT an HTTP endpoint → NO `.openapi()` registration, so `openapi/v1.yaml` stays
// byte-identical. Same posture as the `notifications/` and `consent/` modules.
//
// ── Discriminated union (AC1) ─────────────────────────────────────────────────────────────────────────
// `Alert` is a `z.discriminatedUnion('alert_category', [...])`: every variant is a `.strict()` object
// carrying the common envelope fields PLUS an `alert_category` literal and a per-category `payload_data`
// shape. Keying the union on `alert_category` makes each category's `payload_data` shape STATICALLY known
// (narrowing on `alert.alert_category` narrows `alert.payload_data`) and lets Zod reject a wrong-shape
// payload for a given category at parse time.

import { z } from 'zod';

import { Iso8601Datetime, UuidString } from '../_common/primitives.js';

/**
 * A money amount in paise. Bounded to a safe integer — Zod's `.int()` alone accepts any integer-valued
 * double (`1e21`), which would render as scientific notation (`₹1e+19`) in a member-facing message.
 */
const Paise = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);

/**
 * The 9 alert categories (AC1). A SUPERSET of the 7 push-primary categories (FR-71 / Story 5.2 renders its
 * 7-category subset): `step_up_otp` delivers via SMS (Story 5.9) and `niyamavali_amended` is a broadcast,
 * so neither is push-primary. Spelling is snake_case authoritative (FR-71 prose's hyphenated names are a
 * pre-existing epics.md prose/schema mismatch — the schema wins).
 */
export const AlertCategory = z.enum([
  'alert_published',
  'deadline_reminder',
  'contribution_confirmed',
  'contribution_mismatch',
  'claim_status_change',
  'helpdesk_reply',
  'module_new',
  'step_up_otp',
  'niyamavali_amended',
]);
export type AlertCategory = z.output<typeof AlertCategory>;

/**
 * Traceability into the source events/records that produced this alert (AC1). Every field is optional — a
 * given category populates the refs that apply to it (a claim alert carries `claim_id`; a niyamavali
 * amendment carries `clause_id`; etc.). `.strict()` so an unknown ref key is rejected. `clause_id` is a
 * dotted registry id (`niy.retirement.…`), NOT a UUID — the others are UUIDs.
 */
export const ProvenanceRefs = z
  .object({
    clause_id: z.string().min(1).optional(),
    claim_id: UuidString.optional(),
    pool_id: UuidString.optional(),
    audit_id: UuidString.optional(),
    event_id: UuidString.optional(),
  })
  .strict();
export type ProvenanceRefs = z.output<typeof ProvenanceRefs>;

/**
 * The common envelope fields every category shares. Spread into each discriminated-union variant (Zod's
 * `discriminatedUnion` needs the discriminant literal DIRECTLY on each option object, so a shared base
 * object cannot be `.merge()`d without losing the literal — spreading the raw shape keeps it a plain
 * `ZodObject`). `created_by_actor` is an actor identifier (`system` or a UUID), never a display name.
 */
const alertEnvelope = {
  alert_id: UuidString,
  pariwar_id: UuidString,
  member_id: UuidString,
  /** Overrides cost-optimization (AR-18 / Story 5.7): a time-critical alert is never delayed to batch. */
  time_critical: z.boolean(),
  provenance_refs: ProvenanceRefs,
  created_at: Iso8601Datetime,
  created_by_actor: z.string().min(1).max(128),
} as const;

/**
 * Build one discriminated-union variant: the shared envelope + the `alert_category` literal + this
 * category's `payload_data` shape. Every variant (and its `payload_data`) is `.strict()`.
 */
function alertVariant<C extends AlertCategory, P extends z.ZodRawShape>(category: C, payloadData: P) {
  return z
    .object({
      ...alertEnvelope,
      alert_category: z.literal(category),
      payload_data: z.object(payloadData).strict(),
    })
    .strict();
}

/**
 * The `Alert` payload — a discriminated union on `alert_category`. Parsing narrows `payload_data` to the
 * category's shape and rejects a mismatched payload. Per-category `payload_data` shapes are intentionally
 * minimal for this primitive; downstream stories (5.2–5.9, Epic 6/8) refine copy from these fields.
 */
export const Alert = z.discriminatedUnion('alert_category', [
  // Broadcast announcement — admin-authored title/body (the primary escaping-discipline surface, AC6).
  alertVariant('alert_published', { title: z.string().min(1), body: z.string().min(1) }),
  // Per-member deadline reminder (renewal/lock-in cadence, Epic 3 consumer). `deadline_at` is the machine
  // timestamp (provenance/scheduling); `deadline_display` is the PRODUCER-formatted human-readable string
  // the renderers substitute — render stays a pure function of the payload (AC5: no locale/clock formatting
  // at render time), so the producer owns timezone + wording.
  alertVariant('deadline_reminder', {
    subject: z.string().min(1),
    deadline_at: Iso8601Datetime,
    deadline_display: z.string().min(1),
  }),
  // Epic 8 — contribution recorded.
  alertVariant('contribution_confirmed', {
    pool_id: UuidString,
    amount_paise: Paise,
    period_label: z.string().min(1),
  }),
  // Epic 8 — declared vs recorded contribution mismatch.
  alertVariant('contribution_mismatch', {
    pool_id: UuidString,
    expected_paise: Paise,
    actual_paise: Paise,
  }),
  // Epic 6 — claim moved to a new lifecycle state.
  alertVariant('claim_status_change', { claim_id: UuidString, new_status: z.string().min(1) }),
  // Helpdesk agent replied to a member ticket.
  alertVariant('helpdesk_reply', { ticket_id: UuidString }),
  // A new learning module was published.
  alertVariant('module_new', { module_id: UuidString, module_title: z.string().min(1) }),
  // Step-up OTP (delivers via SMS, Story 5.9). Carries a reference, NOT the code itself.
  alertVariant('step_up_otp', { purpose: z.string().min(1), ttl_seconds: z.number().int().positive() }),
  // Niyamavali clause amended — a broadcast.
  alertVariant('niyamavali_amended', { clause_id: z.string().min(1), amendment_summary: z.string().min(1) }),
]);
export type Alert = z.output<typeof Alert>;
