// `member_nominee_versions` — the APPEND-ONLY history of a member's nominee declaration
// (Story 6.20, Task 1; D1, D2, D7, D16; AC1).
//
// ⭐ WHY THIS TABLE EXISTS. Before 6.20 `replaceMemberNominees` DELETEd the member's `member_nominees`
// rows on every re-declaration, so the earlier declaration was DESTROYED and the as-at-death rule
// (`2026-09-20-235` Y — *"a change done before a day of death will be assumed to be done by member,
// everything else will be discarded"*) had nothing to read. Every declare now appends ONE version per
// submitted rank here, in the SAME transaction as the `member_nominees` write.
//
// ⛔ `member_nominees` IS NOT REPLACED. It stays the CURRENT projection — always the LATEST version by
// `version_no` per rank, ⛔ never the effective set (D16) — because six current-row readers assume
// latest-wins (T4) and widening its PK would silently break all six.
//
// ── Shape ────────────────────────────────────────────────────────────────────────────────────────
//   · PER RANK: one row is one rank's version (`rank` 1 | 2). `version_no` is monotone per
//     `(member_id, rank)`, and the UNIQUE index is the race backstop (*"the index is the backstop, the
//     typed error is the interface"*) — the D3 advisory lock is what normally serializes writers.
//   · `declaration_id` groups the ranks written by ONE submit (or one correction).
//   · `kind`: `declared` carries the nominee; `vacated` is the TOMBSTONE a 2→1 change writes for rank 2
//     (T9) — without it "revert rank 2 to its earlier version" would be undefined, and per-nominee
//     reversion (invariant 4) would break. ⚠ "vacated" is an AUTHOR reading, ⛔ not a ruling.
//   · `source`: `member` (the member's own declare) | `correction` (a DA→PA-approved genuine mistake,
//     D7). A correction carries `corrects_version_id` and INHERITS that version's `effective_at` and
//     `split_pct` (invariant 5, D17(b)).
//   · `recorded_at`: database wall-clock time taken with `clock_timestamp()` AFTER the D3 advisory lock
//     (D2) — ⛔ not `now()` (transaction START: a transaction that waits on the lock could be stamped
//     before midnight and commit after it) and ⛔ not an application clock (arch §1.11).
//   · `effective_at`: the version's POSITION IN TIME for the as-at-death cutoff (D6). For a member's own
//     change it equals `recorded_at`; for a correction it is inherited. ⛔ The cutoff never reads
//     `recorded_at`.
//   · `event_version`: the `member.nominees_declared` event this version was written with.
//
// ── PII discipline ───────────────────────────────────────────────────────────────────────────────
//   · name / mobile / address → Tier-1 envelope ciphertext (`piiColumn(1, 'member_nominee')`), exactly
//     as on `member_nominees`. NULL on a `vacated` tombstone (the coherence CHECK in migration 0119).
//   · relationship → Tier-3 plaintext; the value set is constrained in the CONTRACTS enum, ⛔ NOT at the
//     DB (the `member_nominees` convention — there is no DB enum to reuse, AC12).
//
// ── Append-only, by grant AND by trigger ─────────────────────────────────────────────────────────
// `twt_app` holds SELECT + INSERT and a COLUMN-LEVEL UPDATE on the three ciphertext columns ONLY — for
// the DPDPA-RTBF scrub (0034's discipline applied at birth). A column-aware trigger additionally
// rejects any UPDATE that touches another column, and every direct DELETE / TRUNCATE (the 0001 idiom).
// ⛔ Nothing is ever deleted (invariant 2): a discard is a determination RECORD on top of a version.

import {
  type AnyPgColumn,
  bigint,
  index,
  integer,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { piiColumn } from '../encryption/column.js';
import type { MemberId, NomineeVersionId, PariwarId } from '../ids/index.js';
import { members } from './members.js';

/** A version either names a nominee or vacates the rank (the T9 tombstone). */
export const NOMINEE_VERSION_KINDS = ['declared', 'vacated'] as const;
export type NomineeVersionKind = (typeof NOMINEE_VERSION_KINDS)[number];

/** Who wrote the version: the member's own declare, or an approved correction (D7). */
export const NOMINEE_VERSION_SOURCES = ['member', 'correction'] as const;
export type NomineeVersionSource = (typeof NOMINEE_VERSION_SOURCES)[number];

export const memberNomineeVersions = pgTable(
  'member_nominee_versions',
  {
    versionId: uuid('version_id').defaultRandom().primaryKey().$type<NomineeVersionId>(),

    // The declaring member. FK → members (cascade: a HARD delete only; RTBF is the column scrub).
    memberId: uuid('member_id')
      .$type<MemberId>()
      .notNull()
      .references(() => members.memberId, { onDelete: 'cascade' }),

    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // 1 = primary, 2 = secondary (CHECK in the migration).
    rank: smallint('rank').notNull(),

    // Monotone per (member_id, rank); UNIQUE below.
    versionNo: integer('version_no').notNull(),

    // Groups the ranks of ONE submit (or one correction).
    declarationId: uuid('declaration_id').notNull(),

    kind: text('kind').notNull().$type<NomineeVersionKind>(),
    source: text('source').notNull().$type<NomineeVersionSource>(),

    // Tier-1 — NULL only on a `vacated` tombstone.
    nameCiphertext: piiColumn(1, 'member_nominee')('name_ciphertext'),
    // Tier-3 plaintext — NULL only on a `vacated` tombstone.
    relationship: text('relationship'),
    // Tier-1 — NULL only on a `vacated` tombstone.
    mobileCiphertext: piiColumn(1, 'member_nominee')('mobile_ciphertext'),
    // Tier-1 — optional on a declared version; NULL on a tombstone.
    addressCiphertext: piiColumn(1, 'member_nominee')('address_ciphertext'),
    // What was DECLARED (100 | 75 | 25) — a record, ⛔ never the authority for what the effective set
    // pays: the effective split is derived from the post-determination rank set (D17(a)).
    splitPct: smallint('split_pct'),

    // D2 — `clock_timestamp()` after the D3 advisory lock. No default: the writer supplies it.
    recordedAt: timestamp('recorded_at', { withTimezone: true, mode: 'date' }).notNull(),
    // D6 — the position in time the as-at-death cutoff reads. = recorded_at for `member`; inherited
    // from the corrected version for `correction` (invariant 5).
    effectiveAt: timestamp('effective_at', { withTimezone: true, mode: 'date' }).notNull(),

    // The `member.nominees_declared` event version written in the same transaction.
    eventVersion: bigint('event_version', { mode: 'number' }),

    // Set iff source = 'correction' — the version this one corrects (self-FK).
    correctsVersionId: uuid('corrects_version_id')
      .$type<NomineeVersionId>()
      .references((): AnyPgColumn => memberNomineeVersions.versionId),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    // The race backstop for D3 and the per-rank chain order.
    uniqueIndex('member_nominee_versions_member_rank_version_uq').on(t.memberId, t.rank, t.versionNo),
    index('member_nominee_versions_pariwar_member_idx').on(t.pariwarId, t.memberId),
    index('member_nominee_versions_declaration_id_idx').on(t.declarationId),
  ],
);

export type MemberNomineeVersionRow = typeof memberNomineeVersions.$inferSelect;
export type MemberNomineeVersionInsert = typeof memberNomineeVersions.$inferInsert;

