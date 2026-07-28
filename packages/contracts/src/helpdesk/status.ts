// Helpdesk ticket lifecycle-state set — Story 10.1 (Task 1; AC4).
//
// ⚠ RATIFIED UNION (BigDev 2026-07-28). PRD FR-52 and epics.md 10.1 each declare an
// INCOMPLETE state set, and each omits a state its own prose requires:
//   · FR-52 enum:  open · in_progress · awaiting_member · resolved · reopened   (omits `closed`,
//                  yet its "auto-close on resolved after 7 days" prose needs it)
//   · epics 10.1:  open · in_progress · awaiting_member · resolved · closed      (omits `reopened`,
//                  yet the "reopen within 30 days post-close" path is a committed FR-52 consequence)
// The ratified set is the UNION the requirements structurally need — the exact
// `rbac/scope.ts` scope-dimension resolution recorded in ADR-0008. Recorded for this
// story in the decision log; do NOT silently follow either single source.
// [[feedback_architecture_vs_prd_boundary]].
//
// This tuple is re-declared (not imported) for the same bundle-boundary reason as
// category.ts — `packages/domain/src/schema/helpdesk_tickets.ts` owns the pgEnum source;
// the tests/helpdesk.test.ts sync-guard asserts they match.

import { z } from 'zod';

/**
 * The ratified six-state lifecycle (AC4). Transitions (authored in full by the domain
 * reducer; only the genesis `open` is emitted this story):
 *   open → in_progress                       (assignee picks up)
 *   open|in_progress → awaiting_member       (needs member input; resolution SLA pauses)
 *   awaiting_member → in_progress            (member replies)
 *   in_progress|awaiting_member → resolved   (assignee resolves)
 *   resolved → closed                        (auto, 7 days no member reply)
 *   resolved|closed → reopened → in_progress (member reopens within 30 days post-close)
 */
export const HELPDESK_TICKET_STATES = [
  'open',
  'in_progress',
  'awaiting_member',
  'resolved',
  'closed',
  'reopened',
] as const;

/** The lifecycle-state literal union — projector-derived on the ticket (AC4). */
export const HelpdeskTicketState = z.enum(HELPDESK_TICKET_STATES);
export type HelpdeskTicketState = z.output<typeof HelpdeskTicketState>;
