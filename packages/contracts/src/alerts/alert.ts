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
// ── Discriminated union (AC1), refined (Story 5.8b) ───────────────────────────────────────────────────
// `Alert` is a `z.discriminatedUnion('alert_category', [...])` wrapped in ONE `.superRefine`: every variant is a
// `.strict()` object carrying the common envelope fields PLUS an `alert_category` literal and a per-category
// `payload_data` shape. Keying the union on `alert_category` makes each category's `payload_data` shape STATICALLY
// known (narrowing on `alert.alert_category` narrows `alert.payload_data`) and lets Zod reject a wrong-shape
// payload for a given category at parse time. The refinement (Story 5.8b, FS7 (a), Decision `2026-10-28-415`) is
// cross-field: an `alert_published` may carry an `sms` block ONLY when its envelope `time_critical` is true — the
// degraded-mode cycle-open bridge — so news, surveys, moderation and the staff push (all `time_critical: false`)
// stay refused exactly as before. It also PAIRS the message with the category (code review 2026-10-28 (second
// pass)): an `alert_published` block's message is `cycle_open_bridge`, and `cycle_open_bridge` rides no other
// category. The refinement leaves the output type unchanged; `Alert.options` is gone (no consumer reads it).

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
 * The contribution messages that have FIXED, registrable SMS wording. Each value is a message key of the jobs-side
 * registry (`contribution-sms-templates.ts`).
 *  - The three per-member notices — Story 5.11 (FS1 (d), Decision `2026-10-23-389`): day 10 "not recorded yet", a
 *    payment not matched, a payment still not confirmed.
 *  - ONE bridge message — Story 5.8b (FS1 (a), Decision `2026-10-28-415`; Panel `2026-10-28-414`): `cycle_open_bridge`,
 *    the cycle-open text of the degraded-mode SMS bridge (architecture §3.4's carve-out). It rides ONLY an
 *    `alert_published` whose `time_critical` is true, and an `alert_published` block carries ONLY it (both by the
 *    refinement on `Alert`; the send record's own CHECK pairs it with the occasion `cycle_open`, migration 0188). It
 *    is texted ONLY when the fan-out bridges that alert. ⚠ The three notices are NOT paired with their categories
 *    here — which of them a `deadline_reminder` or `contribution_mismatch` carries is the producer's choice.
 * ⛔ A pool opening on an undeclared Pariwar and the last day — those are for the Trust's announcement channels — and
 * ⛔ any other broadcast.
 */
export const AlertSmsMessage = z.enum([
  'deadline_not_recorded',
  'payment_not_matched',
  'payment_not_confirmed',
  'cycle_open_bridge',
]);
export type AlertSmsMessage = z.output<typeof AlertSmsMessage>;

/**
 * The OPTIONAL `sms` block a lit producer puts on its payload (Story 5.11, FS7 (a)): which registered message, and
 * the value of each slot by slot NAME, built from the SAME locals as the push params. Absent ⇒ the message is not
 * SMS-eligible (FS15 — the fan-out's SMS rung ends `sms_message_not_lit`). Carried by the two variants a lit
 * notice rides (`deadline_reminder`, `contribution_mismatch`) and — Story 5.8b — by `alert_published` ONLY when it is
 * `time_critical` and names `cycle_open_bridge` (the bridged cycle-open; the refinement on `Alert` refuses it on every other
 * broadcast, and refuses `cycle_open_bridge` on the two lit variants). The values
 * are checked against the registry's slots at send time (Story 5.11b — the alert SMS seam's prepare step), ⛔ here.
 *
 * `locale` is the language the VALUES were built for (review round 2, P2 — checklist family 4): `{pool}` is the curated
 * name in a hi text and usually the letter code in an en text (FS13, `-394` item 2), so a sender must either send in
 * this locale or rebuild the values — ⛔ put them in the other locale's template. ⭐ Story 5.11b (FS5 (a), `-404`): it is the
 * RECIPIENT'S language — the producer resolves each member's own choice, else their Pariwar's default (⛔ the producer's push
 * locale) — and the sender texts in exactly this locale (⛔ the other one when its template is unusable — I3).
 */
export const AlertSmsLocale = z.enum(['hi', 'en']);
export type AlertSmsLocale = z.output<typeof AlertSmsLocale>;

export const AlertSmsBlock = z
  .object({
    message: AlertSmsMessage,
    locale: AlertSmsLocale,
    values: z.record(z.string().min(1), z.string().min(1)),
  })
  .strict();
export type AlertSmsBlock = z.output<typeof AlertSmsBlock>;

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
export const Alert = z
  .discriminatedUnion('alert_category', [
    // Broadcast announcement — admin-authored title/body (the primary escaping-discipline surface, AC6). `sms` is
    // OPTIONAL (Story 5.8b): only the time-critical cycle-open alert carries it — the refinement below.
    alertVariant('alert_published', {
      title: z.string().min(1),
      body: z.string().min(1),
      sms: AlertSmsBlock.optional(),
    }),
    // Per-member deadline reminder (renewal/lock-in cadence, Epic 3 consumer). `deadline_at` is the machine
    // timestamp (provenance/scheduling); `deadline_display` is the PRODUCER-formatted human-readable string
    // the renderers substitute — render stays a pure function of the payload (AC5: no locale/clock formatting
    // at render time), so the producer owns timezone + wording. `pool_id` is OPTIONAL (Story 9.10): the day-5/
    // 10/13/14 cadence reminders carry no pool identity (their `deepLinkTargetForAlert` case falls through to
    // the generic `renewals` landing, unchanged), but the pending-match RETRY reminder (a DISTINCT, non-
    // deadline copy the same category dispatches, AC4) carries the member's own pool so the deep link can
    // route to `contributions/:pool_id` instead. `sms` is OPTIONAL (Story 5.11): only day 10 and the escalated
    // pending-match retry carry it.
    alertVariant('deadline_reminder', {
      subject: z.string().min(1),
      deadline_at: Iso8601Datetime,
      deadline_display: z.string().min(1),
      pool_id: UuidString.optional(),
      sms: AlertSmsBlock.optional(),
    }),
    // Epic 8 — contribution recorded.
    alertVariant('contribution_confirmed', {
      pool_id: UuidString,
      amount_paise: Paise,
      period_label: z.string().min(1),
    }),
    // Epic 8 (reserved) / Story 9.7 (wired) — a reconciliation mismatch the member is notified about.
    // `expected_paise`/`actual_paise` are OPTIONAL (Story 9.7): the `contribution.reconciliation-mismatch`
    // verdict carries a reason-code, NOT an amount comparison, and the `wrong_pool` reason has no amounts to
    // report at all — the producer fills them only when derivable and omits them otherwise (never fabricated).
    // `body` is the producer-resolved, locale-correct, DIGNIFIED line the push renders (mapped from the machine
    // reason-code, never the raw enum, never "Error/Failed") — the same producer-owns-the-copy pattern as the
    // confirmed alert's `period_label` (render stays a pure function of the payload). `sms` is OPTIONAL (Story 5.11).
    alertVariant('contribution_mismatch', {
      pool_id: UuidString,
      expected_paise: Paise.optional(),
      actual_paise: Paise.optional(),
      body: z.string().min(1).optional(),
      sms: AlertSmsBlock.optional(),
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
  ])
  // Story 5.8b (FS7 (a), I2): an `alert_published` carries an `sms` block ONLY when it is time-critical — the bridged
  // cycle-open. News, surveys, moderation and the staff push hard-code `time_critical: false`, so they stay refused.
  // Code review 2026-10-28 (second pass) — and the message is PAIRED with the category: `cycle_open_bridge` is the
  // only message an `alert_published` block may name, and no other category may name it.
  .superRefine((alert, ctx) => {
    if (alert.alert_category === 'alert_published' && alert.payload_data.sms !== undefined) {
      if (!alert.time_critical) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['payload_data', 'sms'],
          message: 'an alert_published may carry an sms block only when time_critical is true',
        });
      }
      if (alert.payload_data.sms.message !== 'cycle_open_bridge') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['payload_data', 'sms', 'message'],
          message: 'an alert_published sms block may name only cycle_open_bridge',
        });
      }
      return;
    }
    const sms = 'sms' in alert.payload_data ? alert.payload_data.sms : undefined;
    if (sms?.message === 'cycle_open_bridge') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['payload_data', 'sms', 'message'],
        message: `cycle_open_bridge rides only a time-critical alert_published (not ${alert.alert_category})`,
      });
    }
  });
export type Alert = z.output<typeof Alert>;
