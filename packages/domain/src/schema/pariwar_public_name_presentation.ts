// `pariwar_public_name_presentation` — the per-Pariwar PUBLIC-NAME PRESENTATION config
// (Story 11a.1, Task 8; AC5, ruling D1(a)).
//
// ── Why a TABLE and not a constant ──────────────────────────────────────────────────────────
// Decision `2026-08-19-136` cl.1: the implementation *"must not hard-code full-name publication
// as permanent"*, and ⭐ *"a build in which the public name form cannot be changed without a code
// change FAILS this clause."* A constant cannot be flipped; a stored row can. This table IS the
// discharge of that clause — with no row to flip, the owed configurability test would be
// asserting about a literal.
//
// D1 ruled the substrate ships HERE rather than at Story 11a.3, so the directory-render story
// does not carry a DB migration on its critical path and `136`'s owed proof is dischargeable now.
//
// ── Shape: the `pariwar_appeal_config` precedent ────────────────────────────────────────────
// One row per Pariwar (`UNIQUE (pariwar_id)`), tenant-isolated RLS, and an ABSENT row means the
// ruled default (`full_name`), exactly as an absent appeal-config row means the fail-closed
// legal-review default. No generic per-Pariwar key-value config store exists in the substrate.
//
// ⚠ THE DEFAULT IS THE RULED POSTURE, NOT THE CLOSED ONE — and the difference is deliberate.
// Everywhere else in this codebase an absent config falls back fail-closed. Here fail-closed
// would mean SHIELDING, which would silently contradict a ratified Panel ruling whenever a row
// was missing. The safe default is the ruled one. See `kyc/public-name.ts` for the full note.
//
// ⛔ THIS TABLE NEVER HOLDS A NAME. It holds a MODE. The stored KYC name lives in
// `member_kyc_profiles.name_ciphertext` (Tier-1) and is never written by this path — `-136` cl.2
// forbids creating a second identity system, and a `public_display_name` column here would BE one.
//
// ⛔ NO PII TIER CHANGES (`-136` cl.6). Member name remains Tier-1 ciphertext + Tier-2 blind index.
//
// Naming discipline per architecture L3663-3677: DB columns snake_case, TS camelCase.

import { index, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import {
  DEFAULT_PUBLIC_NAME_PRESENTATION_MODE,
  PUBLIC_NAME_PRESENTATION_MODES,
} from '../kyc/public-name.js';
import type { PariwarId, UserId } from '../ids/index.js';

/**
 * The mode pgEnum — generated FROM the `kyc/public-name.ts` tuple, which is the one spelling
 * authority (the `news_posts` discipline). The DB value domain and the TS union cannot drift
 * because there is only one place either is written.
 */
export const publicNamePresentationModeEnum = pgEnum(
  'public_name_presentation_mode',
  PUBLIC_NAME_PRESENTATION_MODES,
);

export const pariwarPublicNamePresentation = pgTable(
  'pariwar_public_name_presentation',
  {
    // Per-row address (UUID). Server-side default. Keyed logically by pariwar_id (UNIQUE below).
    id: uuid('id').defaultRandom().primaryKey(),

    // Multi-tenant scope (RLS predicate column; branded). One config row per Pariwar.
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // The ruled presentation mode. Default = the LAUNCH POSTURE (`-136` cl.1) — ⛔ a default, not
    // a constant: the whole point of this column is that it moves, in BOTH directions (cl.3).
    mode: publicNamePresentationModeEnum('mode')
      .notNull()
      .default(DEFAULT_PUBLIC_NAME_PRESENTATION_MODE),

    // ── Governance attribution ───────────────────────────────────────────────────────────────
    // Changing the mode is a GOVERNED ACT, not a tenant preference (`-136` cl.3), so the row
    // carries WHO changed it, under what NAME, and WHY. `rationale` is REQUIRED at the write path
    // (the feature_flag.flip precedent): a visibility change to every member's name on an
    // unauthenticated page must not be recordable as a bare value swap.
    changedByActor: uuid('changed_by_actor').$type<UserId>(),
    // The acting admin's `users.display_name`, SNAPSHOT at write time — controlled staff data,
    // never email-derived ([[project_admin_display_name_attribution]]).
    changedByDisplay: text('changed_by_display'),
    rationale: text('rationale'),
    // The pre-generated §1.5 hash-chain audit anchor. The audit LINE is the CALLER's obligation
    // (the 10.12 narrow-write posture); this column is the join back to it.
    auditId: uuid('audit_id'),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    index('pariwar_public_name_presentation_pariwar_id_idx').on(t.pariwarId),
    uniqueIndex('pariwar_public_name_presentation_pariwar_id_uq').on(t.pariwarId),
  ],
);

export type PariwarPublicNamePresentationRow = typeof pariwarPublicNamePresentation.$inferSelect;
export type PariwarPublicNamePresentationInsert = typeof pariwarPublicNamePresentation.$inferInsert;
