// The restoration-discipline INSTRUMENT policy clause — Story 10.23 (Task 3; AC3, AC11; D2).
//
// The single seam to `niy.restoration-discipline.policy`, mirroring `member/lock-in.ts`'s
// `resolveLockInPolicy` (the FR-8 precedent this instrument follows twice over).
//
// ── ⚠ THIS CLAUSE DOES NOT SUPPLY THE DURATION (D2) ─────────────────────────────────────────────
// §3.1's table puts the months on THE RUNG — 3 for R7(B)/(C)/(D), 5 for R7(E)/(F) — and the R7
// clauses already carry them. Duplicating `lock_in_months` here would create TWO REGISTRY SOURCES FOR
// ONE CONSTITUTIONAL NUMBER, forcing the Trustee Panel to amend two instruments to change one, and a
// single policy clause cannot express a per-rung table without re-encoding the whole ladder anyway.
//
// So: **the R7 clause supplies the DURATION; this clause supplies the INSTRUMENT** — the parameters
// no R7 clause can express. Both `clause_version_id`s are pinned onto every imposition (AC3), which
// is what satisfies the epic AC literally (a new clause; FR-8 version pinning) without duplicating
// governance data.
//
// ── ⚠ THE RESOLVER YOU USE DEPENDS ON WHEN YOU ASK, AND GETTING IT WRONG SILENTLY RE-LOCKS ───────
//   · **At IMPOSITION** → `resolveByClauseId` (below). You want whatever is in force NOW; its
//     `clause_version_id` becomes the pin.
//   · **At every LATER READ of an existing imposition** → `resolveByClauseVersionId`, using the
//     PINNED id. ⛔ NEVER `resolveByClauseId` there: it returns the CURRENT version, so a Trustee
//     re-tune would retroactively move every existing member's unlock date — precisely what FR-8
//     exists to prevent. `niyamavali-engine/src/evaluate.ts:62-84` states this in terms for the join
//     lock-in; the same trap applies here.
//
// In practice this instrument avoids the second call entirely on the hot path: the pinned
// `concurrency_rule` rides the imposition EVENT payload (see `events.ts`), so the fold never
// re-resolves a clause to combine expiries. `resolveByClauseVersionId` remains the correct accessor
// for any audit/history surface that wants to show the clause a member was locked under.

import { z } from 'zod';

import type { Db } from '../../db.js';
import { clauseId, type ClauseId, type ClauseVersionId, type PariwarId } from '../../ids/index.js';
import { resolveByClauseId } from '../../niyamavali/read.js';
import {
  asRestorationCombinationRule,
  RESTORATION_COMBINATION_RULES,
  type RestorationCombinationRule,
} from './status.js';

/**
 * The stable clause id for the restoration-discipline instrument policy.
 *
 * ⚠ **IT MUST NOT CONTAIN THE SUBSTRING `lock-in` (AC11).** `@twt/ui`'s
 * `member-status/presenter.ts:145` finds the JOIN lock-in clause with
 * `payload.applicableNiyamavaliClauses.find((c) => c.clauseId.includes('lock-in'))` — a documented
 * known simplification (2026-07-04 review) that matches by SUBSTRING because
 * `applicableNiyamavaliClauses` has no stable category field, and whose recorded risk is exactly
 * that "a future clause whose id contains 'lock-in' would false-match". A colliding id here would
 * hijack the admin panel's join-lock-in section and its deep link, showing a trustee the wrong
 * clause and the wrong version on a member's record. Pinned by test.
 */
export const RESTORATION_DISCIPLINE_POLICY_CLAUSE_ID: ClauseId = clauseId(
  'niy.restoration-discipline.policy',
);

/**
 * The `niy.restoration-discipline.policy` payload. `.passthrough()` tolerates the structural
 * `rule_code` / `title_en` / `provisional` keys the seed carries — the registry payload is OPAQUE to
 * the niyamavali layer (frozen row 14), and this resolver validates only the fields it consumes.
 */
export const RestorationDisciplinePolicyPayloadSchema = z
  .object({
    /** How a "month" is counted (AC4). One value today; a genuine registry parameter regardless. */
    month_counting: z.literal('calendar_end_of_month_clamped'),
    /** ⚖ The AC5 concurrency rule — RATIFIED registry data, not a code constant (2026-08-07-088 §1). */
    concurrency_rule: z.enum(RESTORATION_COMBINATION_RULES),
  })
  .passthrough();
export type RestorationDisciplinePolicyPayload = z.output<
  typeof RestorationDisciplinePolicyPayloadSchema
>;

/** The resolved instrument policy + the clause version it came from (the AC3 pin, half two). */
export interface ResolvedRestorationDisciplinePolicy {
  readonly concurrencyRule: RestorationCombinationRule;
  readonly policyClauseVersionId: ClauseVersionId;
}

/**
 * Resolve the effective instrument policy for a Pariwar at `at`, or `null` when it is unprovisioned
 * (or its payload is malformed). `.safeParse` keeps a malformed payload non-throwing.
 *
 * ── ⛔ `null` MEANS DO NOT IMPOSE — ratified, not an implementer's choice (AC3) ───────────────────
 * Decision `2026-08-07-088` clause 2 (routing-note Q2, Option (a)): on a Pariwar with no effective
 * clause, **do NOT impose; surface the gap as a named sentinel** (the
 * `R7_REGISTRY_UNPROVISIONED_PRODUCER` pattern). **Imposing under a code default is EXPLICITLY
 * REJECTED.** The Panel's ground: it is not a fallback but coverage removal under a duration and
 * month-counting convention NO PARIWAR RATIFIED — an unratified sanction imposed by a machine.
 *
 * ⚠ The sibling `niy.lock-in.policy` states its provisioning failure mode as a member-facing 503
 * (`niyamavali-v1-clauses.sql:132-134`). **That does not transfer here**: this is a background
 * imposition with no request to fail. The caller skips the Pariwar and reports the sentinel.
 */
export async function resolveRestorationDisciplinePolicy(
  db: Db,
  pariwarId: PariwarId,
  at?: Date,
): Promise<ResolvedRestorationDisciplinePolicy | null> {
  const row = await resolveByClauseId(db, pariwarId, RESTORATION_DISCIPLINE_POLICY_CLAUSE_ID, at);
  if (!row) return null;
  const parsed = RestorationDisciplinePolicyPayloadSchema.safeParse(row.payload);
  if (!parsed.success) return null;
  const rule = asRestorationCombinationRule(parsed.data.concurrency_rule);
  if (rule === null) return null;
  return { concurrencyRule: rule, policyClauseVersionId: row.clauseVersionId };
}
