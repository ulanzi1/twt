// `memorial_submissions` — every version of the family's memorial, as sent (Story 11b.4, migration 0182;
// `#decision-2026-10-24-398` MA5 / MA8 / MA9 / MA15).
//
// ── One row per Send ────────────────────────────────────────────────────────────────────────────────────────────────
// A Send is the act of authorisation (`-162` cl.3): the row carries the words, the optional photo, and the permission
// the nominee gave AT SEND (`authorisation_*`, `handover_*` — MA5), in ONE row written in ONE transaction. A new Send
// creates a NEW row that supersedes the chain head (MA9) — `UNIQUE (supersedes_submission_id)`, a partial unique on
// `(pool_id) WHERE supersedes_submission_id IS NULL` and a composite FK `(pool_id, supersedes_submission_id)` keep the
// chain linear and inside one pool; every writer takes the pool-keyed advisory lock FIRST (the unique indexes are a
// backstop an unlocked insert can reach — Trap 12).
//
// ── APPEND-ONLY, save the erasure grant (MA15, Trap 10) ─────────────────────────────────────────────────────────────
// `GRANT SELECT, INSERT` plus a COLUMN-level `GRANT UPDATE (body_ciphertext, alt_text_ciphertext)` used ONLY by
// `anonymizeMember` (the `0092` lesson: append-only made a Tier-1 note "STRUCTURALLY UN-ERASABLE"). ⛔ No CHECK on a
// ciphertext column (a CHECK re-runs on the scrub's UPDATE). ⛔ No mutable status column — the state is DERIVED (MA10).
//
// ── PII ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
//   · body_ciphertext / alt_text_ciphertext → Tier-1 (`piiColumn(1, MEMORIAL_FIELD_CLASS)`), the family's words
//     VERBATIM (Trap 6 — ⛔ no trim, ⛔ no normalisation); encrypted in the API layer (`memorial-crypto.ts`).
//   · photo_object_key → an opaque storage key, ⛔ never on the wire; the bytes are metadata-stripped at ingest (MA8).
//   · handover_nominee_ref → the `member_nominee_versions.version_id` the handover code was addressed to (an id, ⛔ PII).
//   · idempotency_key → the phone's `Idempotency-Key` for the Send that wrote this row (a random client id, ⛔ PII).
//
// ── The Send's idempotency lives ON the row (migration 0183 — the Y-server round, BigDev 2026-10-24) ──────────────────
// `UNIQUE (pool_id, idempotency_key) WHERE idempotency_key IS NOT NULL`, written in the insert's own transaction under
// the pool lock: a same-key retry finds this row and replays it at ANY age, and a crash rolls the key back with the row
// (⛔ a pending claim, ⛔ a TTL). NULL only for rows written before 0183. ⛔ No UPDATE grant — immutable once written.

import { sql } from 'drizzle-orm';
import { check, foreignKey, index, pgTable, text, timestamp, unique, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { MEMORIAL_FIELD_CLASS } from '../encryption/field-classes.js';
import { piiColumn } from '../encryption/column.js';
import type { ClaimId, MemberId, PariwarId, PoolId } from '../ids/index.js';
import type { MemorialHandoverRecipient, MemorialPhotoMime } from '../memorial/vocab.js';
import { claims } from './claims.js';
import { members } from './members.js';
import { localeEnum } from './pariwar_passport.js';
import { pools } from './pools.js';

export const memorialSubmissions = pgTable(
  'memorial_submissions',
  {
    submissionId: uuid('submission_id').primaryKey().defaultRandom(),
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),
    // The drive this memorial is about — v1 is one death → one claim → one pool (the handler logs `> 1`).
    poolId: uuid('pool_id').notNull().$type<PoolId>(),
    claimCaseId: uuid('claim_case_id').notNull().$type<ClaimId>(),
    // The member who died — the Ravi-mode session member. The erasure key (MA15).
    deceasedMemberId: uuid('deceased_member_id').notNull().$type<MemberId>(),
    // The chain head this version replaced; NULL for the first version of the pool's memorial.
    supersedesSubmissionId: uuid('supersedes_submission_id'),
    bodyCiphertext: piiColumn(1, MEMORIAL_FIELD_CLASS)('body_ciphertext').notNull(),
    // Present iff a photo is (alt text is required with a photo — enforced by the writer, ⛔ a ciphertext CHECK).
    altTextCiphertext: piiColumn(1, MEMORIAL_FIELD_CLASS)('alt_text_ciphertext'),
    photoObjectKey: text('photo_object_key'),
    // Story 11b.5a (KL5, migration 0194) — the family list, `JSON.stringify(entries)` encrypted (Tier-1; relation codes INSIDE).
    // NULL ⇔ ⛔ no list (an empty array is ⛔ never stored). ⛔ No CHECK (the scrub's UPDATE). Used for NOTHING but the memorial
    // (`-428` PQ1 A — the AC10 source pin).
    kinshipCiphertext: piiColumn(1, MEMORIAL_FIELD_CLASS)('kinship_ciphertext'),
    // ⚠ text + CHECK, ⛔ a pgEnum: `-398` mints exactly three enums, and these two values carry ⛔ authority.
    photoMime: text('photo_mime').$type<MemorialPhotoMime>(),
    // MA5 — the permission given at Send. The registry version id (⛔ the text) and the locale actually shown.
    authorisationCopyVersion: text('authorisation_copy_version').notNull(),
    authorisationLocale: localeEnum('authorisation_locale').notNull(),
    handoverRecipient: text('handover_recipient').$type<MemorialHandoverRecipient>().notNull(),
    handoverNomineeRef: uuid('handover_nominee_ref').notNull(),
    // 0183 — the Send's Idempotency-Key (shape: `MEMORIAL_SEND_IDEMPOTENCY_KEY_PATTERN`, `memorial/vocab.ts` — LOCKSTEP
    // with the CHECK). Nullable for the pre-0183 rows only; `insertMemorialSubmission` always writes it.
    idempotencyKey: text('idempotency_key'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .default(sql`clock_timestamp()`),
  },
  (t) => [
    unique('memorial_submissions_pariwar_submission_uq').on(t.pariwarId, t.submissionId),
    unique('memorial_submissions_pool_submission_uq').on(t.poolId, t.submissionId),
    unique('memorial_submissions_supersedes_uq').on(t.supersedesSubmissionId),
    uniqueIndex('memorial_submissions_pool_root_uq')
      .on(t.poolId)
      .where(sql`supersedes_submission_id IS NULL`),
    uniqueIndex('memorial_submissions_pool_idempotency_key_uq')
      .on(t.poolId, t.idempotencyKey)
      .where(sql`idempotency_key IS NOT NULL`),
    foreignKey({
      name: 'memorial_submissions_supersedes_fk',
      columns: [t.poolId, t.supersedesSubmissionId],
      foreignColumns: [t.poolId, t.submissionId],
    }),
    foreignKey({ name: 'memorial_submissions_pool_fk', columns: [t.poolId], foreignColumns: [pools.poolId] }),
    foreignKey({
      name: 'memorial_submissions_deceased_member_fk',
      columns: [t.deceasedMemberId],
      foreignColumns: [members.memberId],
    }),
    foreignKey({
      name: 'memorial_submissions_claim_case_fk',
      columns: [t.pariwarId, t.claimCaseId],
      foreignColumns: [claims.pariwarId, claims.claimCaseId],
    }),
    index('memorial_submissions_pariwar_created_idx').on(t.pariwarId, t.createdAt),
    index('memorial_submissions_deceased_idx').on(t.deceasedMemberId),
    check('memorial_submissions_photo_mime_check', sql`photo_mime IS NULL OR photo_mime IN ('image/jpeg', 'image/png')`),
    check('memorial_submissions_photo_pair_check', sql`(photo_object_key IS NULL) = (photo_mime IS NULL)`),
    check('memorial_submissions_handover_recipient_check', sql`handover_recipient IN ('latest', 'at_death')`),
    check('memorial_submissions_copy_version_check', sql`length(btrim(authorisation_copy_version)) > 0`),
    check(
      'memorial_submissions_idempotency_key_check',
      sql`idempotency_key IS NULL OR idempotency_key ~ '^[A-Za-z0-9_-]{1,128}$'`,
    ),
  ],
);

export type MemorialSubmissionRow = typeof memorialSubmissions.$inferSelect;
export type MemorialSubmissionInsert = typeof memorialSubmissions.$inferInsert;
