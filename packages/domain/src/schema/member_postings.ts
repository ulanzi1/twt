// `member_postings` — the member's posting / transfer-in-out history (Story 3.9, Task 3).
//
// The posting district a member updates through the Life Events panel (FR-5 transfer-in/out).
// Unlike addresses, a posting district is a GEOGRAPHIC location — NOT sensitive identity data — so
// it is non-PII plaintext, safe in BOTH the column and the `member.posting_updated` event payload
// (Dev Notes §"Posting PII tier"). Contrast the eHRMS ID (architecture §2.7 Tier-2 blind index) —
// but eHRMS ID is NOT changed by a transfer (it is the employee identity), so it is out of scope.
//
// ── Transfer scope (v1-S — read before consuming) ────────────────────────────────────────
// This records the posting/district change as a member ATTRIBUTE + event ONLY. It does NOT mutate
// `members.pariwar_id` or move the member across tenants — the whole stack is per-Pariwar
// RLS-isolated, and a true cross-Pariwar migration is a distinct, much larger capability (out of
// scope for v1-S). `pariwar_ref` is an OPTIONAL forward-compat reference for a future tenant move.
//
// ── APPEND-ONLY history — "prior value preserved" (AC1) ──────────────────────────────────
// AC1 requires the prior posting be PRESERVED as history. So this table is APPEND-ONLY (mirror
// member_medical_disclosures / member_addresses): PER-ROW PK `posting_id`, a NEW row per update,
// GRANT SELECT + INSERT only. The "current" posting is the newest row by `created_at`.
//
// ── is_retirement (Epic 4 Story 4.5 anchor — non-negotiable) ─────────────────────────────
// `is_retirement boolean NOT NULL DEFAULT false` — Epic 4 Story 4.5 computes `retired_at` from the
// FIRST posting row where `is_retirement = true`. Omitting it now would force adding a column to an
// append-only history table + an event-vocabulary extension in Epic 4. Non-PII boolean marker.
//
// TENANT-ISOLATED (mirrors member_addresses / members). RLS in policies/member-postings-rls.ts.
// Naming discipline per architecture L3663-3677: DB columns snake_case, TS camelCase.

import { sql } from 'drizzle-orm';
import { boolean, date, foreignKey, index, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { pgTable } from 'drizzle-orm/pg-core';

import type { MemberId, PariwarId, PostingId, WorkplaceId, WorkplaceRequestId } from '../ids/index.js';
import { members } from './members.js';
import { workplaceRequests } from './workplace_requests.js';
import { workplaces } from './workplaces.js';

export const memberPostings = pgTable(
  'member_postings',
  {
    // Per-row address (UUID). Server-side gen_random_uuid() default. Branded `PostingId`. A NEW id
    // per update — multiple rows over time are BY DESIGN (append-only history).
    postingId: uuid('posting_id').defaultRandom().primaryKey().$type<PostingId>(),

    // The member whose posting this is. FK → members.member_id (cascade for RTBF, Story 3.12).
    memberId: uuid('member_id')
      .$type<MemberId>()
      .notNull()
      .references(() => members.memberId, { onDelete: 'cascade' }),

    // Multi-tenant scope (RLS predicate column; branded).
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // The new posting district. PLAINTEXT — a geographic location, non-PII (safe in column + event).
    district: text('district').notNull(),

    // OPTIONAL forward-compat reference to a destination Pariwar (a true cross-Pariwar tenant move
    // is out of scope for v1-S; recorded here for forward-compat only). NULLABLE.
    pariwarRef: text('pariwar_ref'),

    // Epic 4 Story 4.5 retirement anchor: retired_at = first row where is_retirement = true. Non-PII.
    isRetirement: boolean('is_retirement').notNull().default(false),

    // ── Story 6.36a (0161; `2026-10-14-330` SW2, SW5, SW6, SW9) — where the member works, and since when ──────────
    // At most ONE of the two (a CHECK); a retirement row names ⛔ neither. Legacy rows keep NULLs (⛔ no backfill).
    // The posting's `district` above is the WORKPLACE's mapped district when one is named (SW5).
    /** The listed school or office (FK `(pariwar_id, workplace_id)` → `workplaces`). */
    workplaceId: uuid('workplace_id').$type<WorkplaceId>(),
    /** An *"isn't listed"* answer's request (FK `(pariwar_id, workplace_request_id)` → `workplace_requests`). */
    workplaceRequestId: uuid('workplace_request_id').$type<WorkplaceRequestId>(),
    /** The date the member started there (`YYYY-MM-DD`), or retired; ≥ 1950-01-01 (a CHECK). */
    startedOn: date('started_on', { mode: 'string' }),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    // The history-read lookup key (walk a member's postings within a Pariwar, newest first).
    index('member_postings_pariwar_member_idx').on(t.pariwarId, t.memberId),
    // Story 6.36 (0163) — "who is at workplace W" (the peer mesh's colleague read).
    index('member_postings_pariwar_workplace_idx').on(t.pariwarId, t.workplaceId).where(sql`${t.workplaceId} IS NOT NULL`),
    foreignKey({
      name: 'member_postings_workplace_fk',
      columns: [t.pariwarId, t.workplaceId],
      foreignColumns: [workplaces.pariwarId, workplaces.workplaceId],
    }),
    foreignKey({
      name: 'member_postings_workplace_request_fk',
      columns: [t.pariwarId, t.workplaceRequestId],
      foreignColumns: [workplaceRequests.pariwarId, workplaceRequests.requestId],
    }),
  ],
);

export type MemberPostingRow = typeof memberPostings.$inferSelect;
export type MemberPostingInsert = typeof memberPostings.$inferInsert;
