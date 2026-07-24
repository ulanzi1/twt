// packages/contracts/src/alerts/contribution-loop-templates.ts
//
// The contribution-loop notification COPY CONTRACT — Story 8.8 (Task 2; AC2, AC4, AC5).
//
// Epic 8 owns triggers + copy; Epic 5 owns delivery (the FR-23 seam split). This module is the copy
// half's pure, transport-free core: the cycle-day arithmetic, the day → tone-band map, the per-send-day
// i18n key registry, and the payload builders that produce the exact `payload_data` shape each
// `alert_category` declares. Everything here is a PURE function of already-resolved
// strings/numbers/instants — no clock, no locale lookup, no I/O.
//
// ── Why the producer resolves EVERYTHING member-facing (AC5, the Story 5.1 render boundary) ─────────
// `@twt/channels`' renderers are pure functions of the frozen payload: no clock read, no locale lookup,
// no template selection. So every string whose value depends on locale, the clock, or the tone band is
// resolved HERE (by the producer) and carried IN the payload — the same reason `deadline_display`
// exists alongside the machine `deadline_at` (render.ts:83-89).
//
// ── Why the tone-gradient authority lives in @twt/contracts (D1) ────────────────────────────────────
// Story 8.2 put the band selector in `apps/mobile`, which the server cannot import. Rather than
// duplicate it behind a sync-guard test, it MOVED here and
// `apps/mobile/components/active-contribution/toneGradient.ts` became a thin re-export. Contracts is
// already a mobile dependency, so no boundary is crossed and no `@twt/domain` leak occurs
// ([[project_contracts_domain_bundle_boundary]] — this module imports nothing but `zod`). One
// authority beats a guarded duplicate when there is no boundary reason to duplicate.
//
// ── OpenAPI posture ────────────────────────────────────────────────────────────────────────────────
// Internal queue seam, NOT an HTTP endpoint → NO `.openapi()` registration, so `openapi/v1.yaml` stays
// byte-identical (the `alerts/` directory posture).

import { z } from 'zod';

// ── The 15-day contribution window + cycle-day arithmetic (D5 SEAM) ─────────────────────────────────

/**
 * The bounded contribution-window length in days (D5 SEAM) — and it is the REAL deadline, not a
 * placeholder. FR-22 makes the alert's `live → closed` transition a HARD, mechanical Day-15 close.
 *
 * Story 8.9 (calendar-aware close-of-cycle — UX-DR77) adds a reconciliation-TAIL window; the
 * contribution close stays a hard Day-15 close (FR-22) — the tail is POST-CLOSE reconciliation timing
 * only (see alerts/reconciliation-tail.ts). Nothing about a holiday calendar may move this constant:
 * the epics AC prose at L3022 describing an extended contribution window is a RATIFIED drafting error
 * (BigDev, 2026-07-24). Holiday-awareness belongs to the tail, never to the member's deadline.
 */
export const CYCLE_WINDOW_DAYS = 15;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Days-remaining in the bounded contribution window (D5 SEAM) — PURE. `committedAt +
 * CYCLE_WINDOW_DAYS` using UTC-safe fixed-ms arithmetic (UTC has no DST/leap-seconds, so adding whole
 * days in milliseconds is calendar-equivalent to a calendar-day add — unlike local-timezone
 * `setDate`/`getDate`, which would silently disagree with a server not running in UTC), then
 * `ceil((windowEnd − now)/day)`, clamped to `[0, CYCLE_WINDOW_DAYS]`. Story 8.9 adds a
 * reconciliation-TAIL window; the contribution close stays a hard Day-15 close (FR-22) — this helper is
 * byte-unchanged by it and remains the ONE authority for "where in the window is this member".
 *
 * Moved here from `apps/api/src/modules/member-pool/handlers.ts` by Story 8.8 (Task 6) so the My Pool
 * card and the deadline-reminder sweep compute the cycle position from ONE helper and cannot drift —
 * the coherence invariant depends on it. `handlers.ts` re-exports it; behaviour is identical.
 */
export function computeDaysRemaining(committedAt: Date, now: Date): number {
  const windowEnd = committedAt.getTime() + CYCLE_WINDOW_DAYS * MS_PER_DAY;
  const daysRemaining = Math.ceil((windowEnd - now.getTime()) / MS_PER_DAY);
  return Math.min(CYCLE_WINDOW_DAYS, Math.max(0, daysRemaining));
}

/**
 * Derive the DAY OF CYCLE (0-based days elapsed since the pool opened) from `daysRemaining` and the
 * window length. Clamped to `[0, windowDays]` — a stale/over-run `daysRemaining` can never push the
 * cycle-day outside the window. Pure.
 */
export function cycleDayFromDaysRemaining(
  daysRemaining: number,
  windowDays: number = CYCLE_WINDOW_DAYS,
): number {
  const cycleDay = windowDays - daysRemaining;
  if (cycleDay < 0) return 0;
  if (cycleDay > windowDays) return windowDays;
  return cycleDay;
}

/** The cycle-day for an instant, straight from the cycle-freeze `committed_at`. Pure composition of
 *  the two helpers above — the form the server-side sweep uses (it holds the freeze instant, not a
 *  precomputed days-remaining). */
export function cycleDayFromCommittedAt(
  committedAt: Date,
  now: Date,
  windowDays: number = CYCLE_WINDOW_DAYS,
): number {
  return cycleDayFromDaysRemaining(computeDaysRemaining(committedAt, now), windowDays);
}

// ── The tone gradient (Story 8.2's SHIPPED authority — moved here verbatim, D1) ─────────────────────

/** The three tone ranges, in gradient order (calm → factual → gently-urgent). Each maps 1:1 to an i18n
 *  template family (`active_contribution.tone.{calm|factual|closing}`). */
export type ToneRangeKey = 'calm' | 'factual' | 'closing';

/**
 * Select the tone-gradient template key for a given DAY OF CYCLE (Story 8.2 AC3):
 *   · Day 0–10  → `calm`    ("Your pool is open — contribute when you can")
 *   · Day 11–13 → `factual` ("N days remaining")
 *   · Day 14+   → `closing` ("Last day — please contribute…"; gently urgent, never panicked)
 * Clamps a negative cycle-day to `calm`. Pure + total + deterministic (no clock, no IO). Boundary
 * behavior IS the contract — unit-tested at {0, 10, 11, 13, 14, 15}.
 *
 * (The `closing` key is deliberately NOT named "urgent": the `microcopy` gate's panic pattern
 * `\bURGENT\b` scans this namespace, so the literal word is banned even as an internal key — the tone
 * is gently urgent, the key name is neutral.)
 */
export function selectToneGradientKey(cycleDay: number): ToneRangeKey {
  if (cycleDay >= 14) return 'closing';
  if (cycleDay >= 11) return 'factual';
  return 'calm';
}

/** Convenience: select the tone directly from the server's `daysRemaining` (the composition the My Pool
 *  card uses). Kept as a thin wrapper so the pure `selectToneGradientKey` boundary contract stays on the
 *  day-of-cycle domain the AC3 labels are written against. */
export function toneKeyForDaysRemaining(
  daysRemaining: number,
  windowDays: number = CYCLE_WINDOW_DAYS,
): ToneRangeKey {
  return selectToneGradientKey(cycleDayFromDaysRemaining(daysRemaining, windowDays));
}

// ── The deadline-reminder cadence + its per-send-day template registry (AC2, AC4) ───────────────────

/**
 * The four cycle-days a deadline reminder fires on (epics.md:3006). Four SENDS with four distinct
 * messages — but their TONE ESCALATION is derived, never positional (D2).
 */
export const DEADLINE_REMINDER_SEND_DAYS = [5, 10, 13, 14] as const;
export type DeadlineReminderSendDay = (typeof DEADLINE_REMINDER_SEND_DAYS)[number];

/** Narrowing guard: is this cycle-day one the reminder cadence fires on? */
export function isDeadlineReminderSendDay(cycleDay: number): cycleDay is DeadlineReminderSendDay {
  return (DEADLINE_REMINDER_SEND_DAYS as readonly number[]).includes(cycleDay);
}

/** The i18n keys one send-day's copy resolves through, plus the tone band it renders in. */
export interface ContributionLoopTemplateEntry {
  /** The `contribution` namespace key for the reminder's `subject` (the payload's headline line). */
  readonly subjectKey: string;
  /** The `contribution` namespace key for the producer-formatted `deadline_display` string. */
  readonly displayKey: string;
  /**
   * The tone band this send-day renders in — DERIVED from Story 8.2's shipped
   * {@link selectToneGradientKey}, never read positionally off the epic's four labels (D2). The
   * coherence invariant (`templateBandFor(D) === selectToneGradientKey(D)`) is unit-asserted.
   */
  readonly band: ToneRangeKey;
}

/**
 * The per-send-day template registry (AC4). `satisfies Record<DeadlineReminderSendDay, …>` so adding a
 * send-day without its copy — or removing one — is a COMPILE error, not a silent blank push.
 *
 * ── D2, the reconciliation worth reading before changing a `band` ───────────────────────────────────
 * `epics.md:3006` lists "Day 5 / Day 10 / Day 13 / Day 14 with copy matching the UX-DR25 tone gradient
 * (calm / factual / gently urgent / last day)". Read POSITIONALLY that pairs day 10 with *factual* —
 * but Story 8.2's SHIPPED gradient puts day 10 in the *calm* band (0–10 calm, 11–13 factual, 14+
 * closing). Positional reading would push a member a "days remaining" nudge on day 10 and then show
 * them "Your pool is open — contribute when you can" when they open the app: an incoherent, slightly
 * alarming mismatch. So the band is DERIVED from the one shipped authority, and the copy still differs
 * per send day (four distinct templates), preserving the epic's "four sends, four messages" intent.
 *
 * `band` is DERIVED from `selectToneGradientKey(day)` below, not hand-typed — the one shipped authority
 * is the only place the day→band mapping is written, so there is nothing to keep in sync by hand.
 */
export const CONTRIBUTION_LOOP_TEMPLATE_KEYS = {
  5: {
    subjectKey: 'notify.deadline.day_5.subject',
    displayKey: 'notify.deadline.day_5.display',
    band: selectToneGradientKey(5),
  },
  10: {
    subjectKey: 'notify.deadline.day_10.subject',
    displayKey: 'notify.deadline.day_10.display',
    band: selectToneGradientKey(10),
  },
  13: {
    subjectKey: 'notify.deadline.day_13.subject',
    displayKey: 'notify.deadline.day_13.display',
    band: selectToneGradientKey(13),
  },
  14: {
    subjectKey: 'notify.deadline.day_14.subject',
    displayKey: 'notify.deadline.day_14.display',
    band: selectToneGradientKey(14),
  },
} as const satisfies Record<DeadlineReminderSendDay, ContributionLoopTemplateEntry>;

/** The i18n keys the cycle-open announcement copy resolves through (the `{title, body}` shape). */
export const CYCLE_OPEN_TEMPLATE_KEYS = {
  titleKey: 'notify.cycle_open.title',
  bodyKey: 'notify.cycle_open.body',
} as const;

/** The i18n key the contribution-confirmed `period_label` resolves through. */
export const CONTRIBUTION_CONFIRMED_TEMPLATE_KEYS = {
  periodLabelKey: 'notify.confirmed.period_label',
} as const;

/** The i18n namespace every `notify.*` key above lives in (already inside `microcopy.yaml` scope). */
export const CONTRIBUTION_LOOP_I18N_NAMESPACE = 'contribution';

/** The tone band a send-day's copy renders in — the registry read, for the coherence assertion. */
export function templateBandFor(day: DeadlineReminderSendDay): ToneRangeKey {
  const entry: ContributionLoopTemplateEntry | undefined = CONTRIBUTION_LOOP_TEMPLATE_KEYS[day];
  if (!entry) {
    // Only reachable via an unsafe cast or an unvalidated caller — `isDeadlineReminderSendDay` narrows
    // this at every internal call site. A clear error beats a `TypeError` reading `.band` of `undefined`.
    throw new Error(`[contracts] templateBandFor: no contribution-loop template for cycle-day ${String(day)}`);
  }
  return entry.band;
}

// ── The pure payload builders (AC5) ─────────────────────────────────────────────────────────────────
//
// Each takes ALREADY-RESOLVED strings/numbers (the caller did the locale lookup, the clock read and the
// currency formatting) and returns the exact `payload_data` shape its `alertVariant` declares in
// alert.ts. Each parses through a `.strict()` schema so a wrong-shaped payload fails HERE, at the
// producer, rather than deep inside `dispatch`'s `Alert.parse` with a whole batch already in flight.

/** `alert_published` payload_data — the cycle-open announcement (alert.ts:112). */
export const CycleOpenPayloadData = z
  .object({ title: z.string().min(1), body: z.string().min(1) })
  .strict();
export type CycleOpenPayloadData = z.output<typeof CycleOpenPayloadData>;

/** `deadline_reminder` payload_data — the tone-graded nudge (alert.ts:117-121). `deadline_at` requires
 *  the canonical UTC `Z` form (no `offset: true`) — `buildDeadlineReminderPayloadData` only ever emits
 *  `.toISOString()` output, so a hand-built payload with a non-`Z` offset is a shape violation, not a
 *  legitimate alternate encoding. */
export const DeadlineReminderPayloadData = z
  .object({
    subject: z.string().min(1),
    deadline_at: z.string().datetime(),
    deadline_display: z.string().min(1),
  })
  .strict();
export type DeadlineReminderPayloadData = z.output<typeof DeadlineReminderPayloadData>;

/** `contribution_confirmed` payload_data — Epic 9's producer seam (alert.ts:123-127). `amount_paise` is
 *  `.positive()`, never `.nonnegative()` — a ₹0.00 "confirmed contribution" push doesn't correspond to a
 *  real product scenario, so a zero amount is a producer bug rejected at the boundary, not delivered. */
export const ContributionConfirmedPayloadData = z
  .object({
    pool_id: z.string().uuid(),
    amount_paise: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    period_label: z.string().min(1),
  })
  .strict();
export type ContributionConfirmedPayloadData = z.output<typeof ContributionConfirmedPayloadData>;

/**
 * Build the cycle-open `payload_data` (AC1). `title`/`body` are the FULLY RESOLVED, locale-correct
 * announcement strings — the caller has already substituted the pool letter code, the curated pool
 * name, the deceased family's first-name + last-initial, and the formatted fixed amount.
 */
export function buildCycleOpenPayloadData(input: {
  readonly title: string;
  readonly body: string;
}): CycleOpenPayloadData {
  return CycleOpenPayloadData.parse({ title: input.title, body: input.body });
}

/**
 * Build the deadline-reminder `payload_data` (AC2). `subject` + `deadlineDisplay` are the FULLY
 * RESOLVED per-send-day strings; `deadlineAt` is the machine instant (ISO-8601 with offset) the
 * renderers never format — `deadline_display` exists precisely so the producer owns the wording and
 * the timezone.
 */
export function buildDeadlineReminderPayloadData(input: {
  readonly subject: string;
  readonly deadlineAt: Date;
  readonly deadlineDisplay: string;
}): DeadlineReminderPayloadData {
  return DeadlineReminderPayloadData.parse({
    subject: input.subject,
    deadline_at: input.deadlineAt.toISOString(),
    deadline_display: input.deadlineDisplay,
  });
}

/**
 * Build the contribution-confirmed `payload_data` (AC3). `periodLabel` is the FULLY RESOLVED,
 * locale-correct cycle label; `amountPaise` is the confirmed amount in paise (the renderer formats it
 * to rupees itself — that arm of `render` is a pure integer→string map with no locale dependence).
 */
export function buildContributionConfirmedPayloadData(input: {
  readonly poolId: string;
  readonly amountPaise: number;
  readonly periodLabel: string;
}): ContributionConfirmedPayloadData {
  return ContributionConfirmedPayloadData.parse({
    pool_id: input.poolId,
    amount_paise: input.amountPaise,
    period_label: input.periodLabel,
  });
}
