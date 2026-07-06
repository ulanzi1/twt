// `pariwar_wa_templates` — the per-Pariwar, per-category WA UTILITY template registry (Story 5.3, Task 1;
// AC3).
//
// One row per `(pariwar_id, alert_category)`: the Meta-registered UTILITY `template_name` + `language_code`
// + `approval_status`. A category with NO `approved` row is NOT WA-eligible (`resolveApprovedTemplate`
// returns null → the delivery seam skips WA for that category). This is the seam the architecture's
// "per-Pariwar template approval workflow" (§3.4) + "mid-cycle template suspension fallback" (§3.4) attach
// to — v1 ships the table + the status field; the suspension-fallback SELECTION is flagged
// (deferred-work.md:714), NOT built here.
//
// ── FK cascade + RLS ───────────────────────────────────────────────────────────────────────────────────
// `pariwar_id` FK → pariwar_wa_config.pariwar_id ON DELETE CASCADE: a Pariwar's templates never orphan the
// config, and dropping the config sweeps its templates. Standard inline tenant-isolated RLS on `pariwar_id`
// (the 0037/0025 shape), same as pariwar_wa_config.
//
// Naming discipline per architecture L3663-3677: DB columns snake_case, TS fields camelCase.

import { check, index, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

import type { PariwarId, WaTemplateId } from '../ids/index.js';
import { pariwarWaConfig } from './pariwar_wa_config.js';

/** The Meta template lifecycle states (mirrors Meta's template approval lifecycle). CHECK-constrained. */
export const WA_TEMPLATE_APPROVAL_STATUSES = ['pending', 'approved', 'rejected', 'paused'] as const;
export type WaTemplateApprovalStatus = (typeof WA_TEMPLATE_APPROVAL_STATUSES)[number];

export const pariwarWaTemplates = pgTable(
  'pariwar_wa_templates',
  {
    // Per-row address (UUID). The natural key is (pariwar_id, alert_category) — enforced by the UNIQUE
    // below — but the row is addressed by this opaque id (member_device_tokens precedent).
    templateId: uuid('template_id').defaultRandom().primaryKey().$type<WaTemplateId>(),

    // Tenant scope (RLS predicate column; branded) + FK → pariwar_wa_config.pariwar_id ON DELETE CASCADE
    // (dropping a Pariwar's config sweeps its templates; declared in the migration too — 0038).
    pariwarId: uuid('pariwar_id')
      .notNull()
      .$type<PariwarId>()
      .references(() => pariwarWaConfig.pariwarId, { onDelete: 'cascade' }),

    // The alert category this template serves. Plain text constrained by a CHECK to the 9 AlertCategory
    // values (data quality; the kyc_transactions "text for the swap seam" posture — NOT a pgEnum, so a new
    // category is a CHECK edit, not an enum migration). WA is UTILITY-only in practice; a category with no
    // approved row is simply not WA-eligible.
    alertCategory: text('alert_category').notNull(),

    // The Meta-registered UTILITY template name (trustee registers with Meta out-of-band; we store the NAME).
    templateName: text('template_name').notNull(),

    // The template language code (e.g. 'en', 'hi') — sent in the Meta template.language.code field.
    languageCode: text('language_code').notNull(),

    // The Meta template lifecycle state. Default 'pending'; only 'approved' rows are WA-eligible.
    approvalStatus: text('approval_status').notNull().default('pending'),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    // One template mapping per (Pariwar, category). Upsert (upsertWaTemplate) conflicts on this key.
    unique('pariwar_wa_templates_pariwar_category_uq').on(t.pariwarId, t.alertCategory),
    // Constrain approval_status to the Meta lifecycle set (mirrors member_device_tokens status CHECK).
    check(
      'pariwar_wa_templates_approval_status_ck',
      sql`${t.approvalStatus} IN ('pending', 'approved', 'rejected', 'paused')`,
    ),
    // Constrain alert_category to the 9 AlertCategory values (data quality — kept in lockstep with
    // @twt/contracts AlertCategory; a new category is a one-line CHECK edit in the owning story).
    check(
      'pariwar_wa_templates_alert_category_ck',
      sql`${t.alertCategory} IN ('alert_published', 'deadline_reminder', 'contribution_confirmed', 'contribution_mismatch', 'claim_status_change', 'helpdesk_reply', 'module_new', 'step_up_otp', 'niyamavali_amended')`,
    ),
    // Backs resolveApprovedTemplate's (pariwar_id, alert_category, approval_status) lookup.
    index('pariwar_wa_templates_resolve_idx').on(t.pariwarId, t.alertCategory, t.approvalStatus),
  ],
);

export type PariwarWaTemplateRow = typeof pariwarWaTemplates.$inferSelect;
export type PariwarWaTemplateInsert = typeof pariwarWaTemplates.$inferInsert;
