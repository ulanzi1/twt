// The DATABASE-AWARE questionnaire reader — Story 6.33 (`2026-10-30-421` QE12 R1–R4, R8). THE live resolver and THE
// version lookup every consumer uses (I6 — the sync `resolveLiveVersion` / `getQuestionnaireVersion` are called ONLY
// here and in the code registry's own module: R6, a fence test).
//
// · `getQuestionnaireDefinition(db, versionId)` — a CODE id from the code registry; a DATABASE id from its row, parsed
//   (R1). A row that parses but fails validation is returned READ-ONLY (`writable: false` — R7 (v)) + the R8 alarm.
// · `resolveLiveQuestionnaire(db, kind, pariwarId)` — R2: the Pariwar's OWN version (the newest `made_live` for it by `seq`,
//   unless a later `pariwar_reverted` of it), else the newest all-Pariwar one, else the code registry's live version. A
//   candidate that fails R1 OR is on a STALE ruled base (≠ the newest code version of its kind — QE5) is SKIPPED, the
//   next level used, and the skip alarmed (R8).
// · R4 — every query names the Pariwar in SQL: the jobs' pool is BYPASSRLS, so ⛔ query here relies on RLS to filter.
// · Every call runs on the caller's handle, inside its transaction (R5).

import { and, eq, inArray, isNull, or } from 'drizzle-orm';

import type { Db } from '../db.js';
import {
  liveCandidates,
  findNewestCodeVersion,
  QUESTIONNAIRE_REGISTRY,
  getQuestionnaireVersion,
  resolveLiveVersion,
  type QuestionnaireDefinition,
  type QuestionnaireKind,
} from '../questionnaires/index.js';
import { questionnaireVersionSteps, questionnaireVersions } from '../schema/questionnaire_versions.js';
import { parseVersionRow, type VersionRowForParse } from './parse.js';

export type SkipReason = 'invalid' | 'stale';

export interface SkippedVersion {
  readonly versionId: string;
  readonly level: 'own' | 'all';
  readonly reason: SkipReason;
}

export interface LiveQuestionnaire {
  /** The version in force — `null` when ⛔ level has one (6.32 IQ12: the inspector's screen shows ⛔ panel). */
  readonly def: QuestionnaireDefinition | null;
  readonly source: 'own' | 'all' | 'code' | null;
  /** R8 — what R2 passed over, and why (the admin page's *"failed validation / out of date, serving Y"*). */
  readonly skipped: readonly SkippedVersion[];
}

export type DefinitionRead =
  | { readonly status: 'found'; readonly def: QuestionnaireDefinition; readonly writable: boolean; readonly origin: 'code' | 'db' }
  /** The row exists but its definition does ⛔ parse — ⛔ servable at all. */
  | { readonly status: 'unparseable'; readonly versionId: string }
  | { readonly status: 'missing'; readonly versionId: string };

/** R8 — an ops alarm, ids only (⛔ question text). The signal is the action name. */
export function questionnaireAlarm(action: string, ids: Readonly<Record<string, string | null>>): void {
  console.error(`[alarm] ${action}`, JSON.stringify(ids));
}

async function readRow(db: Db, versionId: string): Promise<VersionRowForParse | null> {
  const rows = await db
    .select({
      id: questionnaireVersions.id,
      kind: questionnaireVersions.kind,
      versionId: questionnaireVersions.versionId,
      ruledBaseCodeVersionId: questionnaireVersions.ruledBaseCodeVersionId,
      definition: questionnaireVersions.definition,
    })
    .from(questionnaireVersions)
    .where(eq(questionnaireVersions.versionId, versionId))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * A version by id — code first, then the database (R1). `registry` = the CODE registry (a TEST seam — the shipped one by
 * default).
 */
export async function readQuestionnaireDefinition(
  db: Db,
  versionId: string,
  registry: readonly QuestionnaireDefinition[] = QUESTIONNAIRE_REGISTRY,
): Promise<DefinitionRead> {
  const code = getQuestionnaireVersion(versionId, registry);
  if (code !== null) return { status: 'found', def: code, writable: true, origin: 'code' };
  const row = await readRow(db, versionId);
  if (row === null) return { status: 'missing', versionId };
  const parsed = parseVersionRow(row, registry);
  if (parsed.ok) return { status: 'found', def: parsed.def, writable: true, origin: 'db' };
  questionnaireAlarm('questionnaire.version_unreadable', { versionId, kind: row.kind });
  return parsed.def === null ? { status: 'unparseable', versionId } : { status: 'found', def: parsed.def, writable: false, origin: 'db' };
}

/** A version's definition for READING (a pin's words) — `null` when it cannot be served at all. */
export async function getQuestionnaireDefinition(
  db: Db,
  versionId: string,
  registry: readonly QuestionnaireDefinition[] = QUESTIONNAIRE_REGISTRY,
): Promise<QuestionnaireDefinition | null> {
  const r = await readQuestionnaireDefinition(db, versionId, registry);
  return r.status === 'found' ? r.def : null;
}

/** The ids among `versionIds` that are NOT code versions — the only ones whose definition costs a query (review RV24). */
export function databaseVersionIds(
  versionIds: readonly string[],
  registry: readonly QuestionnaireDefinition[] = QUESTIONNAIRE_REGISTRY,
): string[] {
  return [...new Set(versionIds)].filter((id) => getQuestionnaireVersion(id, registry) === null);
}

/**
 * Many versions' definitions for READING, the DATABASE ones in ONE query (review RV24 — one read per pinned version was N+1 on
 * the console's counted path). A CODE id comes from the code registry (no query); a DATABASE id from its row, parsed (R1).
 * `null` ⇔ cannot be served at all (missing or unparseable); a row that parses but fails validation is returned (read-only),
 * exactly as `getQuestionnaireDefinition`. `queried` says whether a query ran — 0 for a code-only set — so a COUNTED read
 * budget stays honest.
 */
export async function getQuestionnaireDefinitions(
  db: Db,
  versionIds: readonly string[],
  registry: readonly QuestionnaireDefinition[] = QUESTIONNAIRE_REGISTRY,
): Promise<{ readonly defs: ReadonlyMap<string, QuestionnaireDefinition | null>; readonly queried: boolean }> {
  const defs = new Map<string, QuestionnaireDefinition | null>();
  const dbIds: string[] = [];
  for (const id of new Set(versionIds)) {
    const code = getQuestionnaireVersion(id, registry);
    if (code !== null) defs.set(id, code);
    else dbIds.push(id);
  }
  if (dbIds.length === 0) return { defs, queried: false };
  const rows = await db
    .select({
      id: questionnaireVersions.id,
      kind: questionnaireVersions.kind,
      versionId: questionnaireVersions.versionId,
      ruledBaseCodeVersionId: questionnaireVersions.ruledBaseCodeVersionId,
      definition: questionnaireVersions.definition,
    })
    .from(questionnaireVersions)
    .where(inArray(questionnaireVersions.versionId, dbIds));
  const byId = new Map(rows.map((r) => [r.versionId, r] as const));
  for (const id of dbIds) {
    const row = byId.get(id);
    if (row === undefined) {
      defs.set(id, null);
      continue;
    }
    const parsed = parseVersionRow(row, registry);
    if (!parsed.ok) questionnaireAlarm('questionnaire.version_unreadable', { versionId: id, kind: row.kind });
    defs.set(id, parsed.def);
  }
  return { defs, queried: true };
}

/**
 * QE12 R2 — the RAW candidates for `pariwarId` (⛔ validated): its own (the newest `made_live` for it, unless a later revert of
 * it) and the all-Pariwar one. `pariwarId: null` = the ALL level only (the Super Admin's make-live for all). The revert route
 * reads `own` raw — a skipped own version is still revertable (QE7 (d)).
 */
export async function rawLiveCandidates(
  db: Db,
  kind: QuestionnaireKind,
  pariwarId: string | null,
): Promise<{ own: string | null; all: string | null }> {
  const s = questionnaireVersionSteps;
  const steps = await db
    .select({ versionId: s.versionId, step: s.step, targetPariwarId: s.targetPariwarId, seq: s.seq })
    .from(s)
    .innerJoin(questionnaireVersions, eq(questionnaireVersions.versionId, s.versionId))
    .where(
      and(
        eq(questionnaireVersions.kind, kind),
        inArray(s.step, ['made_live', 'pariwar_reverted']),
        // R4 — the Pariwar named in SQL (⛔ RLS): a BYPASSRLS pool would otherwise see every Pariwar's own versions.
        pariwarId === null ? isNull(s.targetPariwarId) : or(eq(s.targetPariwarId, pariwarId as never), isNull(s.targetPariwarId)),
      ),
    );
  const rows = steps.map((r) => ({ ...r, seq: Number(r.seq) }));
  if (pariwarId === null) return { own: null, all: liveCandidates(rows, 'all-level').all };
  return liveCandidates(rows, pariwarId);
}

/** QE12 R2 — the version in force for `pariwarId` (`null` = the ALL level: what a Pariwar with ⛔ own version is served). */
export async function resolveLiveQuestionnaire(
  db: Db,
  kind: QuestionnaireKind,
  pariwarId: string | null,
  registry: readonly QuestionnaireDefinition[] = QUESTIONNAIRE_REGISTRY,
): Promise<LiveQuestionnaire> {
  const candidates = await rawLiveCandidates(db, kind, pariwarId);
  const newest = findNewestCodeVersion(kind, registry)?.versionId ?? null;
  const skipped: SkippedVersion[] = [];
  for (const level of ['own', 'all'] as const) {
    const versionId = candidates[level];
    if (versionId === null) continue;
    const row = await readRow(db, versionId);
    const parsed = row === null ? null : parseVersionRow(row, registry);
    const reason: SkipReason | null =
      parsed === null || !parsed.ok ? 'invalid' : newest === null || row!.ruledBaseCodeVersionId !== newest ? 'stale' : null;
    if (reason === null) return { def: parsed!.ok ? parsed!.def : null, source: level, skipped };
    skipped.push({ versionId, level, reason });
    questionnaireAlarm('questionnaire.version_skipped', { versionId, kind, pariwarId, level, reason });
  }
  // The code registry's all-Pariwar version (⛔ code per-Pariwar version exists — QE5): the ALL level asks for a Pariwar no
  // code version names.
  const code = resolveLiveVersion(kind, pariwarId ?? '00000000-0000-0000-0000-000000000000', registry);
  return { def: code, source: code === null ? null : 'code', skipped };
}

/**
 * QE3 — the BOOT check (wired into `apps/api` `main()` and `apps/jobs` `main()`): ⛔ code `versionId` may exist as a
 * database row, else a reply pinned to it would be read under the wrong questions. A migration cannot see the code
 * registry, so this runs at boot.
 */
export async function assertNoCodeVersionInDatabase(db: Db): Promise<void> {
  const ids = QUESTIONNAIRE_REGISTRY.map((d) => d.versionId);
  const clash = await db
    .select({ versionId: questionnaireVersions.versionId })
    .from(questionnaireVersions)
    .where(inArray(questionnaireVersions.versionId, ids));
  if (clash.length > 0) {
    throw new Error(`[questionnaire-versions] code version id(s) also in questionnaire_versions: ${clash.map((r) => r.versionId).join(', ')}`);
  }
}
