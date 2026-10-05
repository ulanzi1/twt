// `approval_warning_reasons` — the per-Pariwar WARNING-REASON LIST (Story 6.23a, Task 1; NW16, NW17; migration 0142).
//
// An approver who approves a claim while a nominee-change warning shows picks a WARNING REASON from this list (`-262`
// FQ2, `-264` FQ12; `2026-10-04-278` NW5, NW16). The Super Admin ADDS reasons and REPLACES them — ⛔ never edits, ⛔
// never deletes: a replaced row stays (with `replaced_at`), so every past approval still shows the words chosen.
// ⭐ The BUILT-IN GENERIC (`APPROVAL_WARNING_GENERIC_REASON`, claim/approval-warning-reasons.ts) is a CODE CONSTANT,
// ⛔ never a row — every Pariwar has it on day one, and it can ⛔ never be replaced.
//
// PII: ⛔ none. `label_en` / `when_to_use` are STAFF POLICY TEXT (Tier-3) — ⛔ not in the anonymizer (Trap 14).
// `created_by_display` is a snapshotted staff display name ([[project_admin_display_name_attribution]]).
// Append-only by grant (SELECT, INSERT + UPDATE on `replaced_at` only) and by trigger (0142). TENANT-ISOLATED; RLS in
// policies/approval-warning-reasons-rls.ts.

import { sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  check,
  foreignKey,
  index,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

import type { PariwarId } from '../ids/index.js';

/**
 * A stored reason's code: `awr_` + 8 lower-case hex, server-generated, immutable, ⛔ never reused.
 * ⚠ LOCKSTEP with 0142's `approval_warning_reasons_code_check`. The generic's `warnings_reviewed` can ⛔ never match.
 */
export const APPROVAL_WARNING_REASON_CODE_PATTERN = /^awr_[0-9a-f]{8}$/;
/** ⚠ LOCKSTEP with 0142's CHECKs and the contracts' DTO limits. */
export const APPROVAL_WARNING_REASON_LABEL_MAX = 120;
export const APPROVAL_WARNING_REASON_WHEN_TO_USE_MAX = 1000;

export const approvalWarningReasons = pgTable(
  'approval_warning_reasons',
  {
    reasonId: uuid('reason_id').defaultRandom().primaryKey(),
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),
    code: text('code').notNull(),
    labelEn: text('label_en').notNull(),
    whenToUse: text('when_to_use').notNull(),
    /** The reason THIS one replaced (a composite self-FK — same Pariwar; `-279` A9). UNIQUE — replaced at most once. */
    replacesReasonId: uuid('replaces_reason_id'),
    /** NULL while active; set ONCE, by the replacement's own transaction (one-way trigger + deferred check). */
    replacedAt: timestamp('replaced_at', { withTimezone: true, mode: 'date' }),
    createdByActor: text('created_by_actor').notNull(),
    createdByDisplay: text('created_by_display').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().default(sql`clock_timestamp()`),
  },
  (t) => [
    unique('approval_warning_reasons_pariwar_reason_uq').on(t.pariwarId, t.reasonId),
    unique('approval_warning_reasons_pariwar_code_uq').on(t.pariwarId, t.code),
    unique('approval_warning_reasons_replaces_uq').on(t.replacesReasonId),
    foreignKey({
      name: 'approval_warning_reasons_replaces_fk',
      columns: [t.pariwarId, t.replacesReasonId],
      foreignColumns: [t.pariwarId as AnyPgColumn, t.reasonId as AnyPgColumn],
    }),
    index('approval_warning_reasons_active_idx').on(t.pariwarId, t.createdAt).where(sql`replaced_at IS NULL`),
    check('approval_warning_reasons_code_check', sql`${t.code} ~ '^awr_[0-9a-f]{8}$'`),
    check(
      'approval_warning_reasons_label_check',
      sql`length(btrim(${t.labelEn})) > 0 AND char_length(${t.labelEn}) <= 120`,
    ),
    check(
      'approval_warning_reasons_when_to_use_check',
      sql`length(btrim(${t.whenToUse})) > 0 AND char_length(${t.whenToUse}) <= 1000`,
    ),
    check(
      'approval_warning_reasons_created_by_check',
      sql`length(btrim(${t.createdByActor})) > 0 AND length(btrim(${t.createdByDisplay})) > 0`,
    ),
    check(
      'approval_warning_reasons_not_self_check',
      sql`${t.replacesReasonId} IS NULL OR ${t.replacesReasonId} <> ${t.reasonId}`,
    ),
  ],
);

export type ApprovalWarningReasonRow = typeof approvalWarningReasons.$inferSelect;
