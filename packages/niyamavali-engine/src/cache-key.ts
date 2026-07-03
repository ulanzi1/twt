// Idempotency memo key composition — Story 4.1 (Task 6; AC3.1).
//
// The key binds an evaluation to EVERYTHING that could change its result, so an
// identical re-evaluation memoizes and a changed input misses:
//   rule-eval:v1:{pariwarId}:{memberId}:{clauseId}:{tsIso}:{memberStateHash}:{niyamavaliVersionHash}
//
// `memberStateHash` covers the member's replayed state-at-timestamp AND the `facts`
// used; `niyamavaliVersionHash` covers the resolved clause version(s). Both are
// canonical-JSON + SHA-256 (the single system canonicalizer — NEVER a bespoke
// JSON.stringify). The keyed store commits its OWN tx (AR-58) — integration tests
// assert idempotent behaviour / membership, never global row counts.

import { canonicalJsonStringify, type CanonicalJsonValue, type ids } from '@twt/domain';

import { sha256Hex } from './hash.js';
import type { Facts } from './types.js';

/** SHA-256 over the member's state-at-timestamp + the facts consumed by the evaluation. */
export function memberStateHash(memberState: string, facts: Facts): string {
  return sha256Hex(canonicalJsonStringify({ state: memberState, facts } as CanonicalJsonValue));
}

/**
 * The Niyamavali version component: the single resolved `clause_version_id` when only
 * one clause is resolved, else a SHA-256 over ALL resolved version ids (sorted, stable).
 * The >1 case is the snapshot-resolution path (primary clause + snapshotted policy).
 */
export function niyamavaliVersionHash(
  clauseVersionIds: readonly ids.ClauseVersionId[],
): string {
  if (clauseVersionIds.length === 1) return clauseVersionIds[0]!;
  const sorted = [...clauseVersionIds].sort();
  return sha256Hex(canonicalJsonStringify(sorted as CanonicalJsonValue));
}

export interface CacheKeyParts {
  pariwarId: ids.PariwarId;
  memberId: ids.MemberId;
  clauseId: ids.ClauseId;
  evaluationTimestampIso: string;
  memberStateHash: string;
  niyamavaliVersionHash: string;
}

/** Compose the stable idempotency key (AC3.1). */
export function buildCacheKey(p: CacheKeyParts): string {
  return `rule-eval:v1:${p.pariwarId}:${p.memberId}:${p.clauseId}:${p.evaluationTimestampIso}:${p.memberStateHash}:${p.niyamavaliVersionHash}`;
}
