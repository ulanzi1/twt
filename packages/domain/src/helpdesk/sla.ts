// Helpdesk SLA + severity derivations — Story 10.4 (Task 2; AC4).
//
// PURE, DB-free presentation derivations off a ticket's `current_state` + its two materialized SLA
// due instants (`sla_first_response_due` / `sla_resolution_due`, both computed at creation by
// `computeTicketSlaDueDates`, routing.ts). 10.4 adds NO SLA storage and NO new column — the "timer
// stops on awaiting_member/resolved" behaviour is a DERIVATION, not a persisted field. This is the
// [[project_yogdaan_status_derivation_convention]] discipline: a pure, zero-read-side-write
// presentation derivation the console + the member surface render, never a lifecycle write.
//
// ── The running/stopped rule (AC4) ─────────────────────────────────────────────────────────────
// The SLA timer is RUNNING only while the ticket awaits staff action — `open` / `in_progress` /
// `reopened` — and is STOPPED once `current_state ∈ { awaiting_member, resolved, closed }` (the
// reducer already encodes `awaiting_member` as "resolution SLA pauses"; a resolved/closed ticket
// needs no more staff action). A breach can only occur while the timer is running.
//
// ── Severity (AC4) ─────────────────────────────────────────────────────────────────────────────
// breached ≻ due-soon ≻ on-track. Breached = a running timer whose due instant is in the past;
// due-soon = a running timer within {@link SLA_DUE_SOON_WINDOW_MS} of its due instant; on-track =
// everything else (INCLUDING a stopped timer — a resolved ticket is never "breached"). Computed
// across BOTH timers (either breaching → breached), so the console can sort breached rows first.

import type { HelpdeskTicketState } from '../schema/helpdesk_tickets.js';

/** The derived per-ticket severity band (AC4). `breached` ≻ `due_soon` ≻ `on_track`. */
export type HelpdeskTicketSeverity = 'breached' | 'due_soon' | 'on_track';

/** The severity precedence, most-severe first — the console sorts/filters by this. */
export const HELPDESK_SEVERITY_ORDER: readonly HelpdeskTicketSeverity[] = ['breached', 'due_soon', 'on_track'];

/** The "due soon" lead window (AC4). A running timer within this window of its due instant (but not
 *  yet past it) is `due_soon`. 4 hours — a quarter of the 24h first-response budget; a reasonable
 *  "act now" lead for the tighter of the two timers. Operations policy, overridable per call. */
export const SLA_DUE_SOON_WINDOW_MS = 4 * 60 * 60 * 1000;

/** The states in which a ticket awaits staff action → the SLA timer is RUNNING (AC4). */
const RUNNING_STATES: ReadonlySet<HelpdeskTicketState> = new Set<HelpdeskTicketState>([
  'open',
  'in_progress',
  'reopened',
]);

/**
 * Is the SLA timer running for a ticket in this state (AC4)? Running iff the ticket awaits staff
 * action (`open` / `in_progress` / `reopened`); stopped once `awaiting_member` / `resolved` /
 * `closed`. Both the first-response and the resolution timer share this predicate (the reducer's
 * "awaiting_member pauses the resolution SLA" rule, generalized to both timers).
 */
export function slaTimerRunning(state: HelpdeskTicketState): boolean {
  return RUNNING_STATES.has(state);
}

/**
 * Has a timer BREACHED (AC4)? True iff the timer is running AND its due instant is strictly in the
 * past. A stopped timer (awaiting_member / resolved / closed) never breaches — a resolved ticket is
 * never surfaced as breached even if `now` is past its original due instant.
 */
export function slaBreached(due: Date, now: Date, state: HelpdeskTicketState): boolean {
  return slaTimerRunning(state) && due.getTime() < now.getTime();
}

/** One timer's derived status. `msRemaining` is `due - now` (NEGATIVE once past due); `running`
 *  reflects the ticket's state; `breached` is `running && msRemaining < 0`. */
export interface HelpdeskSlaTimer {
  dueAt: Date;
  running: boolean;
  breached: boolean;
  /** `due - now` in ms; negative when past due. Meaningful for display regardless of `running`. */
  msRemaining: number;
}

/** Derive one timer's status from its due instant + the ticket state + `now`. */
export function slaTimerStatus(due: Date, now: Date, state: HelpdeskTicketState): HelpdeskSlaTimer {
  const running = slaTimerRunning(state);
  const msRemaining = due.getTime() - now.getTime();
  return { dueAt: due, running, breached: running && msRemaining < 0, msRemaining };
}

/** The minimal ticket shape the derivations read (a subset of `HelpdeskTicketRow`; DB-free). */
export interface TicketSlaInput {
  currentState: HelpdeskTicketState;
  slaFirstResponseDue: Date;
  slaResolutionDue: Date;
}

/** The composite SLA status the console + member surface render (AC4). */
export interface HelpdeskSlaStatus {
  firstResponse: HelpdeskSlaTimer;
  resolution: HelpdeskSlaTimer;
  severity: HelpdeskTicketSeverity;
}

/** Is a running timer within the "due soon" window of its due instant (but not yet past it)? */
function isDueSoon(timer: HelpdeskSlaTimer, dueSoonWindowMs: number): boolean {
  return timer.running && !timer.breached && timer.msRemaining <= dueSoonWindowMs;
}

/**
 * Derive a ticket's severity band (AC4) from its two timer statuses. `breached` ≻ `due_soon` ≻
 * `on_track`, taken across BOTH timers (either breaching → breached; else either due-soon →
 * due_soon; else on_track).
 */
export function ticketSeverity(
  firstResponse: HelpdeskSlaTimer,
  resolution: HelpdeskSlaTimer,
  dueSoonWindowMs: number = SLA_DUE_SOON_WINDOW_MS,
): HelpdeskTicketSeverity {
  if (firstResponse.breached || resolution.breached) return 'breached';
  if (isDueSoon(firstResponse, dueSoonWindowMs) || isDueSoon(resolution, dueSoonWindowMs)) return 'due_soon';
  return 'on_track';
}

/**
 * Derive the full SLA status (both timers + the overall severity) for a ticket at instant `now`
 * (AC4). PURE — the console maps the two due columns + `current_state` straight into this; the
 * member surface can reuse it. No read-side state write.
 */
export function deriveSlaStatus(
  ticket: TicketSlaInput,
  now: Date,
  dueSoonWindowMs: number = SLA_DUE_SOON_WINDOW_MS,
): HelpdeskSlaStatus {
  const firstResponse = slaTimerStatus(ticket.slaFirstResponseDue, now, ticket.currentState);
  const resolution = slaTimerStatus(ticket.slaResolutionDue, now, ticket.currentState);
  return { firstResponse, resolution, severity: ticketSeverity(firstResponse, resolution, dueSoonWindowMs) };
}
