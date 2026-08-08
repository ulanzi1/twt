// Restoration-discipline read surfaces — Story 10.23 (Task 2).
//
// ⚠ THESE READS ARE THE HISTORY, NOT THE STATUS. The member's restoration standing is DERIVED by
// folding the event stream (`overlay.ts`), never by reading this table — a row here says "an
// imposition was recorded", and whether it is still IN FORCE is a function of `expires_at` and the
// instant you are asking about (AC4). Anything that needs the standing calls
// `getMemberRestorationDiscipline` (bounded, replay-correct) or
// `getCurrentMemberRestorationDiscipline` (unbounded, write-path legality).
//
// The table exists because version pinning is not derivable (D1) and because a per-member history is
// worth an index. This module serves that history and nothing else.

import { and, desc, eq } from 'drizzle-orm';

import type { Db } from '../../db.js';
import type { MemberId, PariwarId } from '../../ids/index.js';
import { clampLimit } from '../../pagination.js';
import { memberRestorationImpositions } from '../../schema/member_restoration_impositions.js';

/** One recorded imposition, as the per-member history renders it. NON-PII throughout (D5). */
export interface RestorationImpositionEntry {
  readonly restorationImpositionId: string;
  readonly clauseId: string;
  readonly clauseVersionId: string;
  readonly policyClauseVersionId: string;
  readonly lockInMonths: number;
  readonly concurrencyRule: string;
  readonly episodeKey: string;
  readonly imposedAt: Date;
  readonly expiresAt: Date;
}

/** Default / maximum page size for the per-member history (the domain limit-clamp gate applies). */
const HISTORY_PAGE = { default: 50, cap: 200 } as const;

/**
 * The member's recorded impositions, newest first — the per-member history (AC1's read surface).
 *
 * Tenant-scoped by BOTH the RLS policy and an explicit `pariwar_id` predicate: the policy is the
 * enforcement, the predicate is what keeps the composite index
 * `(pariwar_id, member_id, imposed_at)` usable.
 *
 * ⚠ `clampLimit` is mandatory on every dynamic `.limit()` — the domain-accessor invariant gate
 * (`scripts/domain-accessor-invariants/check.ts`) clamps EVERY one and fails CI otherwise
 * ([[project_domain_limit_clamp_and_savepoint_retry]]).
 */
export async function listRestorationImpositionsForMember(
  db: Db,
  pariwarId: PariwarId,
  memberId: MemberId,
  options: { limit?: number } = {},
): Promise<RestorationImpositionEntry[]> {
  const rows = await db
    .select()
    .from(memberRestorationImpositions)
    .where(
      and(
        eq(memberRestorationImpositions.pariwarId, pariwarId),
        eq(memberRestorationImpositions.memberId, memberId),
      ),
    )
    .orderBy(desc(memberRestorationImpositions.imposedAt))
    .limit(clampLimit(options.limit, HISTORY_PAGE));

  return rows.map((r) => ({
    restorationImpositionId: String(r.restorationImpositionId),
    clauseId: r.clauseId,
    clauseVersionId: String(r.clauseVersionId),
    policyClauseVersionId: String(r.policyClauseVersionId),
    lockInMonths: r.lockInMonths,
    concurrencyRule: r.concurrencyRule,
    episodeKey: r.episodeKey,
    imposedAt: r.imposedAt,
    expiresAt: r.expiresAt,
  }));
}
