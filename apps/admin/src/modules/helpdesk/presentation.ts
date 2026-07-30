// Pure presentation helpers for the helpdesk responder console (Story 10.4, Task 7).
//
// DB-free, framework-free formatters the queue/detail shells render — unit-testable in isolation.
// The SLA/severity VALUES are derived server-side (helpdesk/sla.ts); these turn them into copy.

import type { HelpdeskSeverity } from '@twt/contracts';

/**
 * The default-routing-policy target roles (Story 10.4 AC6 / `roles.ts` `helpdesk.respond` grant set;
 * `super_admin` auto-derives and is not a routing target). Used for the queue's manual "my queue"
 * role-match filter (AC1) — the admin session carries no per-pariwar role (only global-scope grants,
 * `auth/session.ts`), so the responder picks their own role rather than it being auto-detected.
 */
export const HELPDESK_RESPONDER_ROLES = ['helpline_operator', 'finance_officer', 'it_cell', 'pariwar_admin'] as const;

/** Sort rank for a severity band, lowest-first (AC4: breached ≻ due_soon ≻ on_track). */
export function severityRank(severity: HelpdeskSeverity): number {
  switch (severity) {
    case 'breached':
      return 0;
    case 'due_soon':
      return 1;
    case 'on_track':
      return 2;
  }
}

/** The English label for a derived severity band. */
export function severityLabel(severity: HelpdeskSeverity): string {
  switch (severity) {
    case 'breached':
      return 'Breached';
    case 'due_soon':
      return 'Due soon';
    case 'on_track':
      return 'On track';
  }
}

/** A tone class for a severity chip (breached → red, due-soon → amber, on-track → green). */
export function severityToneClass(severity: HelpdeskSeverity): string {
  switch (severity) {
    case 'breached':
      return 'text-red-700';
    case 'due_soon':
      return 'text-amber-700';
    case 'on_track':
      return 'text-green-700';
  }
}

/**
 * Format one SLA timer for display. A stopped timer reads "Paused" (awaiting_member / resolved /
 * closed); a running timer reads "3h 20m left" or "Overdue 1h 5m" (past due). Pure — the `ms_remaining`
 * the server derived is the sole input (no clock read here, so the shell test is deterministic).
 */
export function formatSlaRemaining(msRemaining: number, running: boolean): string {
  if (!running) return 'Paused';
  const abs = Math.abs(msRemaining);
  const hours = Math.floor(abs / 3_600_000);
  const mins = Math.floor((abs % 3_600_000) / 60_000);
  const label = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  return msRemaining < 0 ? `Overdue ${label}` : `${label} left`;
}

/** A human label for a lifecycle state (title-cased, underscores → spaces). */
export function stateLabel(state: string): string {
  return state
    .split('_')
    .map((w) => (w.length > 0 ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(' ');
}
