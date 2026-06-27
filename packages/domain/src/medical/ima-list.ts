// IMA-list registry resolver — Story 3.5 (Task 2; AC1).
//
// **Registry-backed (Option A, BigDev-confirmed 2026-06-27), PRD-literal.** The IMA list is NOT
// a code-level static catalog — it is a Niyamavali clause `niy.medical.ima-list` whose payload is
// the curated, bilingual condition catalog, resolved per-Pariwar via the niyamavali registry
// (PRD FR-5 line 288: "configured in the rule registry (FR-7) so the list can be updated
// centrally"). Central catalog updates flow through the Story 2.4 amend workflow (no code
// deploy). The recorded `ima_list_version` is the resolved clause's `clause_version_id`.
//
// This module is the SINGLE seam to the catalog source: `medical/` may import `niyamavali`
// accessors (both are `@twt/domain`-internal — no turbo cycle). The handler (Task 6) calls
// `resolveImaList` once and never touches `resolveByClauseId` for the catalog directly.

import { z } from 'zod';

import type { Db } from '../db.js';
import { type ClauseId, type ClauseVersionId, type PariwarId, clauseId } from '../ids/index.js';
import { resolveByClauseId } from '../niyamavali/read.js';

/** The stable clause id for the curated IMA condition catalog (→ `ima_list_version`). */
export const IMA_LIST_CLAUSE_ID: ClauseId = clauseId('niy.medical.ima-list');

/**
 * One IMA condition in the resolved catalog. Bilingual labels come straight from the clause
 * payload (snake_case keys) — so the condition labels are NOT i18n keys; the screen renders
 * `label_en` / `label_hi` directly (Task 9 NOTE). `.strict()` so an unexpected payload key is a
 * defect, not silently tolerated.
 */
export const ImaConditionSchema = z
  .object({
    code: z.string().min(1),
    label_en: z.string().min(1),
    label_hi: z.string().min(1),
  })
  .strict();
export type ImaCondition = z.output<typeof ImaConditionSchema>;

/**
 * The `niy.medical.ima-list` clause payload shape. `.passthrough()` tolerates the structural
 * `rule_code` / `title_en` / `provisional` keys the seed carries (the registry payload is opaque
 * to the niyamavali layer; this resolver validates only the condition catalog it consumes).
 */
export const ImaListPayloadSchema = z
  .object({
    conditions: z.array(ImaConditionSchema).min(1),
  })
  .passthrough();
export type ImaListPayload = z.output<typeof ImaListPayloadSchema>;

/** The resolved catalog: the clause's `clause_version_id` (→ `ima_list_version`) + its conditions. */
export interface ResolvedImaList {
  version: ClauseVersionId;
  conditions: ImaCondition[];
}

/**
 * Resolve the curated IMA list for a Pariwar: resolve the current non-deprecated effective
 * `niy.medical.ima-list` clause version, parse + validate its payload, and return the version
 * (the `clause_version_id` recorded as `ima_list_version`, SERVER-authoritative) + the condition
 * catalog. Returns `null` when the clause is not resolvable in the Pariwar (the registry is
 * unprovisioned) — the caller turns that into the AC6 atomic failure / the GET 503 (Task 6).
 *
 * Tenant-scoped: the caller has set `app.pariwar_id` (RLS) AND passes `pariwarId` explicitly
 * (the niyamavali module convention).
 */
export async function resolveImaList(
  db: Db,
  pariwarId: PariwarId,
): Promise<ResolvedImaList | null> {
  const row = await resolveByClauseId(db, pariwarId, IMA_LIST_CLAUSE_ID);
  if (!row) return null;
  const parsed = ImaListPayloadSchema.safeParse(row.payload);
  if (!parsed.success) return null;
  return { version: row.clauseVersionId, conditions: parsed.data.conditions };
}

/**
 * Pure membership helper over a resolved condition set — is `code` a known IMA condition? The
 * submit handler validates every submitted code against the resolved catalog (reject unknown
 * codes all-at-once with a 400, Task 6).
 */
export function isKnownImaCode(conditions: readonly ImaCondition[], code: string): boolean {
  return conditions.some((c) => c.code === code);
}
