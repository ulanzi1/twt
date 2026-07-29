// Helpdesk ticket read accessors — Story 10.1 (Task 5).
//
// The `helpdesk_tickets` hot projection (current_state) is written ONLY by the projector; these are
// the READ counterparts the create-ticket route (and the 10.2/10.4 surfaces) consume. Transport-free
// PRIMITIVES: NO HTTP, NO decryption — the apps/api boundary maps rows → wire DTOs. Reads the cached
// `current_state` projection (the "presentation, not lifecycle" rule); never advances it.

import { and, asc, desc, eq } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { HelpdeskTicketId, MemberId, PariwarId } from '../ids/index.js';
import { clampLimit } from '../pagination.js';
import { eventsLog } from '../schema/events_log.js';
import { HELPDESK_CATEGORIES, helpdeskTickets, type HelpdeskTicketRow } from '../schema/helpdesk_tickets.js';
import { routingPolicyVersionInForce } from './registry.js';

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
    .limit(clampLimit(LIST_TICKETS_FOR_PARIWAR_LIMIT, { default: LIST_TICKETS_FOR_PARIWAR_LIMIT, cap: LIST_TICKETS_FOR_PARIWAR_LIMIT }));
}

// ── Story 10.2 — member-scoped reads (AC3) ──────────────────────────────────────────────────────
//
// OWNERSHIP is enforced IN THE SQL (`subject_member_id = memberId AND pariwar_id = pariwarId`), never
// by a client-side filter (AC3). A ticket not owned by the caller is simply absent from the result —
// the API layer maps that to a 404 (never a 403), so a not-owned ticket is indistinguishable from a
// non-existent one (no enumeration oracle).

/** The member-inbox scan cap. A member's own ticket volume is small; the cap bounds a pathological
 *  scan the same way {@link LIST_TICKETS_FOR_PARIWAR_LIMIT} does. */
const LIST_TICKETS_FOR_MEMBER_LIMIT = 200;

/** List the caller member's OWN tickets, newest first (AC3). Ownership + tenancy in the WHERE clause. */
export async function listTicketsForMember(
  db: Db,
  pariwarId: PariwarId,
  memberId: MemberId,
): Promise<HelpdeskTicketRow[]> {
  return db
    .select()
    .from(helpdeskTickets)
    .where(and(eq(helpdeskTickets.pariwarId, pariwarId), eq(helpdeskTickets.subjectMemberId, memberId)))
    .orderBy(desc(helpdeskTickets.createdAt))
    .limit(clampLimit(LIST_TICKETS_FOR_MEMBER_LIMIT, { default: LIST_TICKETS_FOR_MEMBER_LIMIT, cap: LIST_TICKETS_FOR_MEMBER_LIMIT }));
}

/** Load ONE of the caller member's OWN tickets (AC3), or null if it is absent OR owned by another
 *  member. Ownership + tenancy in the WHERE clause — the null↔not-owned collapse IS the design. */
export async function getTicketForMember(
  db: Db,
  pariwarId: PariwarId,
  memberId: MemberId,
  ticketId: HelpdeskTicketId,
): Promise<HelpdeskTicketRow | null> {
  const rows = await db
    .select()
    .from(helpdeskTickets)
    .where(
      and(
        eq(helpdeskTickets.pariwarId, pariwarId),
        eq(helpdeskTickets.ticketId, ticketId),
        eq(helpdeskTickets.subjectMemberId, memberId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** The ticket's ordered event stream (PK order == event_version asc) — the input to
 *  {@link replayTicketThread}. Tenant-scoped by RLS; `stream_id = ticket_id`. */
export async function listTicketEvents(db: Db, ticketId: HelpdeskTicketId): Promise<HelpdeskEventRow[]> {
  return db
    .select()
    .from(eventsLog)
    .where(eq(eventsLog.streamId, ticketId))
    .orderBy(asc(eventsLog.eventVersion))
    // A single ticket's stream is tiny (genesis + a handful of replies); the literal cap is a
    // pathological-stream backstop, not real pagination (the domain-invariants limit-clamp rule).
    .limit(500);
}

// ── The read-only reply-thread reader (AC3) ─────────────────────────────────────────────────────
//
// ONE forward-compatible function that turns a ticket's `helpdesk.*` event stream into an ordered
// thread. It handles BOTH shapes with NO branching special-case:
//   (a) genesis-only  — the LIVE 10.2 stream (`helpdesk.ticket_created` alone) → a single opening entry;
//   (b) genesis + reply events — the 10.4 stream, where message-bearing reply events append → the same
//       function surfaces them as thread entries with ZERO change here.
// The rule is uniform and total: the GENESIS becomes the opening entry (its `body`); ANY OTHER event
// that carries a non-empty `message` string becomes a reply entry; a pure lifecycle transition (a
// `picked_up`/`resolved`/… with no message) contributes NOTHING to the thread. So when 10.4 adds
// message-bearing reply events, they light up here for free. The AUTHOR is a ROLE label only —
// `member` vs `staff` — NEVER a named individual (AC2 / [[project_admin_display_name_attribution]]).

/** The live-DB event row shape (Drizzle camelCase). Derived locally so the reader has no
 *  `@twt/events` dependency (domain↔events would cycle — the state.ts precedent). */
export type HelpdeskEventRow = typeof eventsLog.$inferSelect;

/** A member-safe thread entry (domain camelCase; the apps/api boundary maps it to the snake_case
 *  `HelpdeskThreadEntry` wire DTO). NEVER carries a named individual (AC2). */
export interface HelpdeskThreadEntryData {
  kind: 'opening' | 'member_reply' | 'staff_reply';
  author: 'member' | 'staff';
  body: string;
  occurredAt: Date;
}

/** Map the §1.14 audit-shape actor to a member-safe author label. Only the member is ever surfaced
 *  as `member`; every staff/operator/system actor collapses to `staff` (no identity leak). */
function threadAuthor(actor: unknown): 'member' | 'staff' {
  return actor === 'member' ? 'member' : 'staff';
}

/** Extract the (optional) message text a reply event carries. Tolerant by design: 10.4 has not yet
 *  fixed the reply payload's field name, so BOTH `message` and `body` are accepted; a non-string /
 *  empty value means "no thread message" (a pure lifecycle transition). Never throws. */
function replyMessageText(payload: unknown): string | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const record = payload as Record<string, unknown>;
  const candidate = record['message'] ?? record['body'];
  if (typeof candidate !== 'string') return null;
  const trimmed = candidate.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Replay a ticket's ordered `helpdesk.*` event stream to its read-only reply thread (AC3). PURE +
 * DB-free (unit-testable). Forward-compatible: see the header — appending message-bearing reply
 * events in 10.4 requires ZERO change here.
 */
export function replayTicketThread(rows: readonly HelpdeskEventRow[]): HelpdeskThreadEntryData[] {
  const entries: HelpdeskThreadEntryData[] = [];
  for (const row of rows) {
    const payload = row.payload as Record<string, unknown> | null;
    if (row.eventType === 'helpdesk.ticket_created') {
      const body = typeof payload?.['body'] === 'string' ? (payload['body'] as string) : '';
      if (body.length > 0) {
        entries.push({ kind: 'opening', author: threadAuthor(payload?.['actor']), body, occurredAt: row.occurredAt });
      }
      continue;
    }
    // Any non-genesis event with a message becomes a reply entry (10.4 forward-compat); a lifecycle-
    // only transition contributes nothing. The kind mirrors WHO authored it.
    const message = replyMessageText(payload);
    if (message !== null) {
      const author = threadAuthor(payload?.['actor']);
      entries.push({
        kind: author === 'member' ? 'member_reply' : 'staff_reply',
        author,
        body: message,
        occurredAt: row.occurredAt,
      });
    }
  }
  return entries;
}

// ── "subject" encoded within the single `body` column (no migration — AC1) ──────────────────────
//
// The 10.1 substrate has ONLY a `body` column. The member form collects a short subject + a longer
// body (AC1); the create route JOINS them (subject, a blank line, then the body) and the reads SPLIT
// them back. Because a member only ever sees their OWN member_app-created tickets — all joined by
// this exact route — the split is EXACT for every ticket the member reads. Both helpers are PURE.

const SUBJECT_BODY_DELIMITER = '\n\n';

/** Join a member's subject + body into the single stored `body` (AC1). */
export function joinMemberTicketSubjectBody(subject: string, body: string): string {
  return `${subject}${SUBJECT_BODY_DELIMITER}${body}`;
}

/** Split a stored `body` back into `{ subject, body }` (AC1). Splits on the FIRST blank line: the
 *  part before is the subject, everything after (which may itself contain blank lines) is the body.
 *  A stored body with no delimiter (e.g. a helpline/admin-created ticket) yields the whole text as
 *  the body and a bounded first-line preview as the subject — a graceful, never-throwing fallback. */
export function splitMemberTicketSubjectBody(stored: string): { subject: string; body: string } {
  const idx = stored.indexOf(SUBJECT_BODY_DELIMITER);
  if (idx >= 0) {
    const subject = stored.slice(0, idx).trim();
    const body = stored.slice(idx + SUBJECT_BODY_DELIMITER.length).trim();
    if (subject.length > 0 && body.length > 0) return { subject, body };
  }
  // Fallback: derive a first-line preview as the subject; keep the whole text as the body.
  const firstLine = stored.split('\n')[0]?.trim() ?? '';
  const subject = (firstLine.length > 0 ? firstLine : stored.trim()).slice(0, 150) || 'Support request';
  return { subject, body: stored.trim() };
}

// ── The registry-driven category picker set (AC5) ───────────────────────────────────────────────

/** One category + the distinct non-null subcategory tokens the in-force policy recognizes for it. */
export interface HelpdeskCategoryOption {
  category: (typeof HELPDESK_CATEGORIES)[number];
  subCategories: string[];
}

export interface HelpdeskCategoriesForPariwar {
  policyVersion: number;
  categories: HelpdeskCategoryOption[];
}

/**
 * The category (+ subcategory) set from the Pariwar's IN-FORCE routing policy (AC5), at instant
 * `at`. Categories are the DISTINCT categories the policy's rules can route (preserving first-match
 * order), each with its distinct non-null subcategories. For the v1 default policy this is exactly
 * the nine FR-52 categories, each with an empty subcategory list (all default rules are
 * `sub_category: null` catch-alls). The server returns RAW category keys; member-friendly labels are
 * resolved client-side from the `helpdesk` i18n namespace.
 */
export async function categoriesForPariwar(
  db: Db,
  pariwarId: PariwarId,
  at: Date,
): Promise<HelpdeskCategoriesForPariwar> {
  const inForce = await routingPolicyVersionInForce(db, pariwarId, at);
  const order: HelpdeskCategoryOption['category'][] = [];
  const subsByCategory = new Map<string, Set<string>>();
  for (const rule of inForce.document.rules) {
    if (!subsByCategory.has(rule.category)) {
      subsByCategory.set(rule.category, new Set());
      order.push(rule.category);
    }
    if (rule.sub_category !== null) subsByCategory.get(rule.category)?.add(rule.sub_category);
  }
  const categories = order.map((category) => ({
    category,
    subCategories: [...(subsByCategory.get(category) ?? new Set<string>())],
  }));
  return { policyVersion: inForce.version, categories };
}
