// `member_attribution` — the Reference Code PORT SEAM (Story 3.6b, Task 1/2; D2 / R5).
//
// At signup a member may optionally paste a 6-digit Reference Code from a field-worker introducer
// (FR-82). Epic 13's field-worker allocation registry is NOT built, so v1 CAPTURES-AND-DEFERS: the
// code is format-checked (6 numeric digits, at the contract) and stored here as `attribution_source`
// with NO validation against an allocation registry (none exists), NO `attributed_to_fieldworker_id`
// resolution, and NO rejection of "unknown" codes. The eventual Epic-13 validation + adopter-chain
// attribution + commission flow (FR-87, v2) backfill/consume `attribution_source` when that epic
// activates. NO `member.reference_code.captured` lifecycle event is minted (the 14-event member
// vocabulary is frozen — R5); the capture is recorded via a Story 1.10 audit line only.
//
// ── NO FK to any field-worker / Epic-13 table (D2) ────────────────────────────────────────────────
// There is deliberately no FK on `attribution_source` — the registry it would reference does not
// exist. The only FK is member_id → members (RTBF cascade, Story 3.12).
//
// TENANT-ISOLATED (mirrors member_medical_disclosures). One row per capture (a member captures once at
// signup; latest-wins is unnecessary). GRANT SELECT, INSERT only; RLS in the migration policies.
//
// Naming discipline per architecture L3663-3677: DB columns snake_case, TS camelCase.

import { index, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

import type { MemberAttributionId, MemberId, PariwarId } from '../ids/index.js';
import { members } from './members.js';

export const memberAttribution = pgTable(
  'member_attribution',
  {
    // Per-row address (UUID). Server-side gen_random_uuid() default. Branded.
    attributionId: uuid('attribution_id')
      .defaultRandom()
      .primaryKey()
      .$type<MemberAttributionId>(),

    // The captured-for member. FK → members.member_id (RTBF cascade, Story 3.12).
    memberId: uuid('member_id')
      .$type<MemberId>()
      .notNull()
      .references(() => members.memberId, { onDelete: 'cascade' }),

    // Multi-tenant scope (RLS predicate column; branded).
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // The captured 6-digit Reference Code, verbatim — NO field-worker FK, NO registry validation (D2).
    // Epic 13 backfills attribution/commission from this when it activates.
    attributionSource: text('attribution_source').notNull(),

    // DB-authoritative capture instant (§1.11).
    capturedAt: timestamp('captured_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    index('member_attribution_pariwar_member_idx').on(t.pariwarId, t.memberId),
    // One capture per member at signup (Epic 13 attribution chain assumes one row).
    unique('member_attribution_member_uq').on(t.memberId),
  ],
);

export type MemberAttributionRow = typeof memberAttribution.$inferSelect;
export type MemberAttributionInsert = typeof memberAttribution.$inferInsert;
