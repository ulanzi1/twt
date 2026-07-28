// Helpdesk ticket read accessors — Story 10.1 (Task 5).
//
// The `helpdesk_tickets` hot projection (current_state) is written ONLY by the projector; these are
// the READ counterparts the create-ticket route (and the 10.2/10.4 surfaces) consume. Transport-free
// PRIMITIVES: NO HTTP, NO decryption — the apps/api boundary maps rows → wire DTOs. Reads the cached
// `current_state` projection (the "presentation, not lifecycle" rule); never advances it.

import { and, desc, eq } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { HelpdeskTicketId, PariwarId } from '../ids/index.js';
import { helpdeskTickets, type HelpdeskTicketRow } from '../schema/helpdesk_tickets.js';

/** Load a single ticket by id (tenant-scoped by RLS + the explicit pariwar predicate). Null if absent
 *  or out of the caller's tenant. */
export async function getTicketById(
  db: Db,
  pariwarId: PariwarId,
  ticketId: HelpdeskTicketId,
): Promise<HelpdeskTicketRow | null> {
  const rows = await db
    .select()
    .from(helpdeskTickets)
    .where(and(eq(helpdeskTickets.pariwarId, pariwarId), eq(helpdeskTickets.ticketId, ticketId)))
    .limit(1);
  return rows[0] ?? null;
}

/** The `listTicketsForPariwar` bound — a diagnostic/primitive read, NOT the paginated admin queue
 *  (Story 10.4, which adds real pagination + state/scope filters). Caps the scan so a Pariwar with
 *  a large ticket volume cannot turn this into an unbounded per-tenant scan. */
const LIST_TICKETS_FOR_PARIWAR_LIMIT = 200;

/** List a Pariwar's tickets, newest first (a bounded diagnostic/primitive read, capped at
 *  {@link LIST_TICKETS_FOR_PARIWAR_LIMIT}; the paginated admin queue with state/scope filters is
 *  Story 10.4). Tenant-scoped. */
export async function listTicketsForPariwar(db: Db, pariwarId: PariwarId): Promise<HelpdeskTicketRow[]> {
  return db
    .select()
    .from(helpdeskTickets)
    .where(eq(helpdeskTickets.pariwarId, pariwarId))
    .orderBy(desc(helpdeskTickets.createdAt))
    .limit(LIST_TICKETS_FOR_PARIWAR_LIMIT);
}
