// packages/contracts/src/notifications/renewal-reminder.ts
//
// The renewal-reminder nudge SEAM (Story 3.8, Task 5 / Decision 5; FR-23). Epic 3 owns the renewal
// reminder TRIGGER SCHEDULE; Epic 5 (Story 5-1 central dispatcher + channel-provider abstraction) owns
// DELIVERY (in-app / WhatsApp / Telegram mirror / SMS — PRD line 250). Epic 5 is `backlog` (not built),
// so this story produces the PRODUCING half of the seam: the renewal-lifecycle scheduler publishes this
// nudge intent to a reserved pg-boss queue consumed by a no-op/log sink until Epic 5 lands its worker
// (the 3.7 forward-compat discipline — build the producing half cleanly; the consuming half is later).
//
// ── NON-PII (R1 / PII-scrape gate) ──────────────────────────────────────────────────────────────────
// Carries only the non-PII facts a dispatcher needs to resolve the recipient + render copy: ids, the
// reminder offset, the renewal anchor, and the grace-remaining count. NEVER a name / mobile / address —
// the dispatcher resolves contact details from the member record at delivery time (same discipline as
// the 3.4/3.5 marker payloads). No `.openapi()` registration — this is an internal queue seam, not an
// HTTP endpoint, so openapi/v1.yaml stays byte-identical.

import { z } from 'zod';

import { Iso8601Datetime } from '../_common/primitives.js';

/** The four renewal-reminder offsets (days past `valid_through`) — the FR-1A cadence (AC1). */
export const RenewalReminderOffsetDays = z.union([
  z.literal(30),
  z.literal(60),
  z.literal(75),
  z.literal(89),
]);
export type RenewalReminderOffsetDays = z.output<typeof RenewalReminderOffsetDays>;

/**
 * The renewal-reminder nudge intent the scheduler publishes to the FR-23 seam. `member_id` /
 * `pariwar_id` let the dispatcher resolve the recipient + tenant; `reminder_offset_days` selects the
 * copy variant; `valid_through` is the renewal-due anchor (also the reminder cycle key); and
 * `grace_remaining_days` lets the dispatcher render the calm "you have N days of grace" framing.
 */
export const RenewalReminderNudge = z
  .object({
    member_id: z.string().uuid(),
    pariwar_id: z.string().uuid(),
    reminder_offset_days: RenewalReminderOffsetDays,
    valid_through: Iso8601Datetime,
    grace_remaining_days: z.number().int().nonnegative(),
  })
  .strict();
export type RenewalReminderNudge = z.output<typeof RenewalReminderNudge>;
