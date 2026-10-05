// The WARNING-REASON LIST — Story 6.23a (Task 11; NW16, NW17, NW18; AC12). Transport-free.
//
// An approver who approves a claim while a nominee-change warning shows picks a WARNING REASON from the Pariwar's
// list (`-262` FQ2, `-264` FQ12) — in its OWN field, beside the approval's real reason (NW5). The list is:
//   · ⭐ the BUILT-IN GENERIC (`APPROVAL_WARNING_GENERIC_REASON`) — a code constant, offered FIRST in every Pariwar,
//     ⛔ never stored, ⛔ never replaceable (Trap 15);
//   · then the Super Admin's own reasons (`approval_warning_reasons`, migration 0142), oldest first.
// The Super Admin ADDS a reason or REPLACES one with a newer one — ⛔ never edits, ⛔ never deletes (BigDev,
// 2026-10-04): the replaced row stays, so every approval that chose it keeps its words (invariant 10). Every approver
// sees who added each reason, when, and its "when to use" note — so the list teaches (BigDev's (b)).
//
// ⭐ The re-delegation (`-278`): `-264` left the reasons' wording to the author; the author RE-DELEGATED it to the Super
// Admin at runtime. The entries the Super Admin types are runtime DATA, ⛔ not author-commits — and ⛔ not member-facing.
// ⚠ Their words are checked only against the microcopy gate's ACTIVE vocabulary terms (a deny-list, lockstep-tested
// against `microcopy.yaml`) — ⛔ not the full gate (Trap 11; recorded in `deferred-work.md`).
//
// ⚠⚠ A LEAF for `approval-warnings.ts` (NW1's import discipline): ⛔ never import `events.ts`, `nominee-name-check.ts`,
// `nominee-lock.ts` or anything that reaches them.

import { randomBytes } from 'node:crypto';

import { and, eq, isNotNull, isNull, sql } from 'drizzle-orm';
import type pg from 'pg';

import { bindScopedDb, type Db } from '../db.js';
import type { PariwarId } from '../ids/index.js';
import {
  APPROVAL_WARNING_REASON_LABEL_MAX,
  APPROVAL_WARNING_REASON_WHEN_TO_USE_MAX,
  type ApprovalWarningReasonRow,
  approvalWarningReasons,
} from '../schema/approval_warning_reasons.js';

export type { ApprovalWarningReasonRow } from '../schema/approval_warning_reasons.js';
import { ApprovalWarningReasonWriteRefusedError } from './errors.js';

/**
 * ⭐ The BUILT-IN GENERIC reason (NW16) — every Pariwar has it, first. ⚠ LOCKSTEP with `@twt/contracts`'s copy and
 * with 0143's `claim_warning_approvals_generic_reason_check` (a NULL `reason_id` ⇔ this code).
 */
export const APPROVAL_WARNING_GENERIC_REASON = {
  code: 'warnings_reviewed',
  label: 'Warnings reviewed — approved despite them',
  whenToUse: 'Use when you have read every warning shown and still approve. Your note must say why.',
} as const;

/**
 * The microcopy gate's ACTIVE vocabulary terms (`microcopy.yaml` `vocabulary` entries ⛔ marked `member_only`) — a
 * Super Admin's label or note must ⛔ not carry one (Trap 11). ⚠ LOCKSTEP with the yaml (a test reads it).
 */
export const APPROVAL_WARNING_REASON_DENIED_TERMS = ['passbook', 'receipt', 'invoice', 'report'] as const;

/** One option on the picker — the generic carries `null` provenance (*"built in"*). ⛔ No member data. */
export interface ApprovalWarningReasonOption {
  readonly code: string;
  /** NULL ⇔ the built-in generic. */
  readonly reasonId: string | null;
  readonly label: string;
  readonly whenToUse: string;
  readonly addedByDisplay: string | null;
  readonly addedAt: Date | null;
  /** The label of the reason this one replaced, if any. */
  readonly replacesLabel: string | null;
}

/** A replaced reason, kept in the history with what replaced it. */
export interface ReplacedApprovalWarningReason {
  readonly code: string;
  readonly reasonId: string;
  readonly label: string;
  readonly whenToUse: string;
  readonly addedByDisplay: string;
  readonly addedAt: Date;
  readonly replacedAt: Date;
  readonly replacedByLabel: string | null;
  readonly replacedByDisplay: string | null;
}

export const GENERIC_APPROVAL_WARNING_REASON_OPTION: ApprovalWarningReasonOption = {
  code: APPROVAL_WARNING_GENERIC_REASON.code,
  reasonId: null,
  label: APPROVAL_WARNING_GENERIC_REASON.label,
  whenToUse: APPROVAL_WARNING_GENERIC_REASON.whenToUse,
  addedByDisplay: null,
  addedAt: null,
  replacesLabel: null,
};

/** The raw active-row shape the ONE warnings statement aggregates (`approval-warnings.ts`) — shared mapping. */
export interface RawActiveReason {
  readonly reason_id: string;
  readonly code: string;
  readonly label_en: string;
  readonly when_to_use: string;
  readonly created_by_display: string;
  readonly created_at: string | Date;
  readonly replaces_label: string | null;
}

/** The active list: the generic first, then the stored active rows oldest first. */
export function activeReasonOptions(rows: readonly RawActiveReason[]): ApprovalWarningReasonOption[] {
  return [
    GENERIC_APPROVAL_WARNING_REASON_OPTION,
    ...rows.map((r) => ({
      code: r.code,
      reasonId: r.reason_id,
      label: r.label_en,
      whenToUse: r.when_to_use,
      addedByDisplay: r.created_by_display,
      addedAt: new Date(r.created_at),
      replacesLabel: r.replaces_label,
    })),
  ];
}

/**
 * The Pariwar's list — the ACTIVE options (the generic first) and, with `history`, every REPLACED reason with what
 * replaced it. ONE statement. Tenant-scoped (RLS + the explicit predicate).
 */
export async function listApprovalWarningReasons(
  db: Db,
  pariwarId: PariwarId,
  opts: { readonly history?: boolean } = {},
): Promise<{ active: ApprovalWarningReasonOption[]; history: ReplacedApprovalWarningReason[] }> {
  const result = await db.execute<{
    reason_id: string;
    code: string;
    label_en: string;
    when_to_use: string;
    created_by_display: string;
    created_at: string | Date;
    replaced_at: string | Date | null;
    replaces_label: string | null;
    replaced_by_label: string | null;
    replaced_by_display: string | null;
  }>(sql`
    SELECT r.reason_id, r.code, r.label_en, r.when_to_use, r.created_by_display, r.created_at, r.replaced_at,
           prev.label_en AS replaces_label,
           nxt.label_en AS replaced_by_label,
           nxt.created_by_display AS replaced_by_display
      FROM approval_warning_reasons r
      LEFT JOIN approval_warning_reasons prev
        ON prev.pariwar_id = r.pariwar_id AND prev.reason_id = r.replaces_reason_id
      LEFT JOIN approval_warning_reasons nxt
        ON nxt.pariwar_id = r.pariwar_id AND nxt.replaces_reason_id = r.reason_id
     WHERE r.pariwar_id = ${pariwarId}
       ${opts.history === true ? sql`` : sql`AND r.replaced_at IS NULL`}
     ORDER BY r.created_at ASC, r.reason_id ASC
  `);
  const rows = result.rows ?? [];
  const active = activeReasonOptions(rows.filter((r) => r.replaced_at === null));
  const history: ReplacedApprovalWarningReason[] = rows
    .filter((r) => r.replaced_at !== null)
    .map((r) => ({
      code: r.code,
      reasonId: r.reason_id,
      label: r.label_en,
      whenToUse: r.when_to_use,
      addedByDisplay: r.created_by_display,
      addedAt: new Date(r.created_at),
      replacedAt: new Date(r.replaced_at!),
      replacedByLabel: r.replaced_by_label,
      replacedByDisplay: r.replaced_by_display,
    }));
  return { active, history };
}

/** A chosen reason, resolved against the ACTIVE list. `reasonId` NULL ⇔ the generic. */
export interface ResolvedApprovalWarningReason {
  readonly code: string;
  readonly reasonId: string | null;
}

/**
 * Trap 16 — resolve a chosen code against the ACTIVE list, LOCKING the row `FOR SHARE` so a replacement cannot commit
 * between this check and the caller's insert (the replacement's `UPDATE … SET replaced_at` waits on the share lock).
 * The generic resolves with ⛔ no read. A replaced or unknown code ⇒ `null` (the caller refuses — ⛔ never mapped to
 * its replacement). ⚠ `FOR SHARE` needs 0142's UPDATE grant + per-command UPDATE policy (`-279` A12).
 */
export async function lockActiveApprovalWarningReason(
  db: Db,
  pariwarId: PariwarId,
  code: string,
): Promise<ResolvedApprovalWarningReason | null> {
  if (code === APPROVAL_WARNING_GENERIC_REASON.code) return { code, reasonId: null };
  const rows = await db
    .select({ reasonId: approvalWarningReasons.reasonId, code: approvalWarningReasons.code })
    .from(approvalWarningReasons)
    .where(
      and(
        eq(approvalWarningReasons.pariwarId, pariwarId),
        eq(approvalWarningReasons.code, code),
        isNull(approvalWarningReasons.replacedAt),
      ),
    )
    .for('share');
  const row = rows[0];
  return row ? { code: row.code, reasonId: row.reasonId } : null;
}

// ── The Super Admin's two writers (NW17) ──────────────────────────────────────────────────────────────

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** The microcopy vocabulary term a text carries, if any (word-boundary, case-insensitive — the gate's own rule). */
export function deniedVocabularyTerm(text: string): string | null {
  for (const term of APPROVAL_WARNING_REASON_DENIED_TERMS) {
    if (new RegExp(`\\b${escapeRegExp(term)}\\b`, 'i').test(text)) return term;
  }
  return null;
}

/** Server validation of a reason's words: non-blank, within the 0142 bounds, ⛔ no vocabulary term (Trap 11). */
export function assertApprovalWarningReasonText(label: string, whenToUse: string): void {
  const fields = [
    ['label', label, APPROVAL_WARNING_REASON_LABEL_MAX],
    ['when_to_use', whenToUse, APPROVAL_WARNING_REASON_WHEN_TO_USE_MAX],
  ] as const;
  for (const [field, value, max] of fields) {
    if (value.trim() === '') {
      throw new ApprovalWarningReasonWriteRefusedError('invalid_text', `${field} is blank`, { field, problem: 'blank' });
    }
    // Codepoints, ⛔ not UTF-16 code units (re-review 2026-10-05) — matches the DB's `char_length()`
    // (0142's CHECK constraints): `value.length` would overcount an astral character (e.g. emoji) as 2,
    // rejecting text the DB's own check would have accepted.
    if ([...value].length > max) {
      throw new ApprovalWarningReasonWriteRefusedError('invalid_text', `${field} is longer than ${max}`, { field, problem: 'too_long', max });
    }
    const term = deniedVocabularyTerm(value);
    if (term !== null) {
      throw new ApprovalWarningReasonWriteRefusedError('invalid_text', `${field} uses a word the Trust does not use`, {
        field,
        problem: 'vocabulary',
        term,
      });
    }
  }
}

export interface ApprovalWarningReasonWriteInput {
  readonly pariwarId: PariwarId;
  readonly label: string;
  readonly whenToUse: string;
  readonly actorId: string;
  /** The Super Admin's display name, resolved server-side ([[project_admin_display_name_attribution]]). */
  readonly actorDisplay: string;
}

const newReasonCode = (): string => `awr_${randomBytes(4).toString('hex')}`;

function isUniqueViolationOn(err: unknown, constraint: string): boolean {
  const e = err as { code?: string; constraint?: string; cause?: { code?: string; constraint?: string } };
  return (e.code === '23505' && e.constraint === constraint) || (e.cause?.code === '23505' && e.cause.constraint === constraint);
}

/** Insert one reason row with a fresh server code, retrying a code collision under a raw SAVEPOINT. */
async function insertReasonRow(
  client: pg.PoolClient,
  input: ApprovalWarningReasonWriteInput,
  replacesReasonId: string | null,
): Promise<ApprovalWarningReasonRow> {
  const db = bindScopedDb(client);
  for (let attempt = 1; ; attempt++) {
    await client.query('SAVEPOINT approval_warning_reason_insert');
    try {
      const [row] = await db
        .insert(approvalWarningReasons)
        .values({
          pariwarId: input.pariwarId,
          code: newReasonCode(),
          labelEn: input.label,
          whenToUse: input.whenToUse,
          replacesReasonId,
          createdByActor: input.actorId,
          createdByDisplay: input.actorDisplay,
        })
        .returning();
      await client.query('RELEASE SAVEPOINT approval_warning_reason_insert');
      return row!;
    } catch (err) {
      await client.query('ROLLBACK TO SAVEPOINT approval_warning_reason_insert');
      if (isUniqueViolationOn(err, 'approval_warning_reasons_pariwar_code_uq')) {
        if (attempt < 5) continue;
        throw new ApprovalWarningReasonWriteRefusedError('code_exhausted', 'could not generate a unique reason code after 5 attempts');
      }
      if (isUniqueViolationOn(err, 'approval_warning_reasons_replaces_uq')) {
        throw new ApprovalWarningReasonWriteRefusedError('already_replaced', 'this reason was already replaced');
      }
      throw err;
    }
  }
}

function assertWriter(input: ApprovalWarningReasonWriteInput): void {
  if (input.actorDisplay.trim() === '') {
    throw new ApprovalWarningReasonWriteRefusedError('missing_display', 'a reason is attributed to a named person');
  }
  assertApprovalWarningReasonText(input.label, input.whenToUse);
}

/** NW17 — ADD a reason. Active at once; its code is server-generated. Runs in the caller's scope-tx. */
export async function addApprovalWarningReason(
  client: pg.PoolClient,
  input: ApprovalWarningReasonWriteInput,
): Promise<ApprovalWarningReasonRow> {
  assertWriter(input);
  return insertReasonRow(client, input, null);
}

/**
 * NW17 — REPLACE a reason with a newer one, in ONE transaction: a conditional `UPDATE … SET replaced_at WHERE
 * reason_id AND replaced_at IS NULL` (0 rows ⇒ `already_replaced`, or `not_found`), then the new row naming it.
 * 0142's deferred trigger proves both halves at COMMIT. The old row, its note and every approval that chose it are
 * untouched. ⛔ The generic is ⛔ never a row, so it can ⛔ never be replaced (`not_found`).
 */
export async function replaceApprovalWarningReason(
  client: pg.PoolClient,
  input: ApprovalWarningReasonWriteInput & { readonly reasonId: string },
): Promise<{ replaced: ApprovalWarningReasonRow; created: ApprovalWarningReasonRow }> {
  assertWriter(input);
  const db = bindScopedDb(client);
  const [replaced] = await db
    .update(approvalWarningReasons)
    .set({ replacedAt: sql`clock_timestamp()` })
    .where(
      and(
        eq(approvalWarningReasons.pariwarId, input.pariwarId),
        eq(approvalWarningReasons.reasonId, input.reasonId),
        isNull(approvalWarningReasons.replacedAt),
      ),
    )
    .returning();
  if (!replaced) {
    const [exists] = await db
      .select({ id: approvalWarningReasons.reasonId })
      .from(approvalWarningReasons)
      .where(
        and(
          eq(approvalWarningReasons.pariwarId, input.pariwarId),
          eq(approvalWarningReasons.reasonId, input.reasonId),
          isNotNull(approvalWarningReasons.replacedAt),
        ),
      );
    if (exists) throw new ApprovalWarningReasonWriteRefusedError('already_replaced', 'this reason was already replaced');
    throw new ApprovalWarningReasonWriteRefusedError('not_found', 'no such reason in this Pariwar');
  }
  const created = await insertReasonRow(client, input, replaced.reasonId);
  return { replaced, created };
}
