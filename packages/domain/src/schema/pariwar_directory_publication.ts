// `pariwar_directory_publication` — the per-Pariwar DIRECTORY-PUBLICATION kill switch.
//
// Code-review finding, Story 11a.3 (2026-08-21, D3): the public Member Directory route
// (`apps/api/src/modules/public-pages/handlers.ts`) unconditionally serves any resolvable
// `pariwarId`'s real KYC names, with no enablement flag — while DPDPA legal counsel has not yet
// been engaged (`-136` cl.5) and a Niyamavali amendment addressing an explicit privacy-inference
// risk on this exact surface is still in draft, awaiting ratification. RESOLVED (BigDev,
// 2026-08-21): add a PER-PARIWAR flag, not a single global switch — needed for gradual rollout and
// to pull one Pariwar without redeploying.
//
// ── Shape: the `pariwar_public_name_presentation` precedent (Story 11a.1) ──────────────────────
// Same governance posture as the presentation-mode table this mirrors: one row per Pariwar
// (`UNIQUE (pariwar_id)`), tenant-isolated RLS, a governed write (rationale + actor + display
// snapshot + §1.5 audit anchor) — because disabling a legally-sensitive public surface for one
// Pariwar must be traceable, not a silent flag flip. ⛔ A SEPARATE table from
// `pariwar_public_name_presentation`, deliberately: that table's own header scopes it narrowly to
// the PUBLIC-NAME PRESENTATION MODE specifically ("no generic per-Pariwar key-value config store
// exists in the substrate") — bolting an unrelated "is the directory even on" flag onto it would
// violate that documented narrow scope.
//
// ⚠ THE DEFAULT IS ENABLED — an absent row means "this Pariwar has not been individually
// disabled", mirroring the presentation-mode table's "absent row = the ruled posture" asymmetry.
// The directory being ON by default is the existing shipped posture (`2026-08-19-135`/`-136`);
// this table is a targeted OFF switch, not a fail-closed gate that would flip every Pariwar's
// directory dark on a missing row.
//
// Naming discipline per architecture L3663-3677: DB columns snake_case, TS camelCase.

import { boolean, index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import type { PariwarId, UserId } from '../ids/index.js';

export const pariwarDirectoryPublication = pgTable(
  'pariwar_directory_publication',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    // Multi-tenant scope (RLS predicate column; branded). One config row per Pariwar.
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // The kill switch. Default TRUE — an absent row means "not individually disabled", the same
    // asymmetry `pariwar_public_name_presentation` uses for its own default.
    enabled: boolean('enabled').notNull().default(true),

    // ── Governance attribution — mirrors `pariwar_public_name_presentation` exactly ─────────────
    changedByActor: uuid('changed_by_actor').$type<UserId>(),
    changedByDisplay: text('changed_by_display'),
    rationale: text('rationale'),
    auditId: uuid('audit_id'),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    index('pariwar_directory_publication_pariwar_id_idx').on(t.pariwarId),
    uniqueIndex('pariwar_directory_publication_pariwar_id_uq').on(t.pariwarId),
  ],
);

export type PariwarDirectoryPublicationRow = typeof pariwarDirectoryPublication.$inferSelect;
export type PariwarDirectoryPublicationInsert = typeof pariwarDirectoryPublication.$inferInsert;
