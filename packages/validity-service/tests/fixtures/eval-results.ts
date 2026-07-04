// Synthetic engine-result fixtures — Story 4.6 pure tests.
//
// Builds `EvaluationResult` objects directly (they are plain data) so the payload assembly / hash /
// ordering / redaction can be tested WITHOUT a DB or the real engine. Mirrors the shapes the engine
// emits (types.ts) — in particular the Story 4.5 `computed.values` channel R12 rides.

import { ids } from '@twt/domain';
import {
  R12_CLAUSE_ID,
  R12_GRANTED_YEARS_KEY,
  R12_IS_RETIRED_KEY,
  RETIREMENT_COVERAGE_COMPUTED,
  RETIREMENT_COVERAGE_NOT_APPLICABLE,
  type EvaluationResult,
} from '@twt/niyamavali-engine';

import type { ClauseEvalSlot } from '../../src/rules.js';

export const R12_VERSION_ID = '0e1c0015-0000-4000-8000-000000000001';
export const AT_ISO = '2025-06-01T00:00:00.000Z';

/** Build a synthetic R12 computed EvaluationResult. */
export function r12Result(opts: {
  grantedYears: number;
  isRetired: boolean;
  clauseVersionId?: string;
  evaluatedAt?: string;
  specialFlags?: string[];
}): EvaluationResult {
  const applicable = opts.grantedYears > 0 && opts.isRetired;
  const decision = applicable ? RETIREMENT_COVERAGE_COMPUTED : RETIREMENT_COVERAGE_NOT_APPLICABLE;
  return {
    result: {
      decision,
      specialFlags: opts.specialFlags ?? [],
      computed: {
        // Keys emitted in explicitly sorted order (granted_years < is_retired) — mirror the engine.
        values: {
          [R12_GRANTED_YEARS_KEY]: opts.grantedYears,
          [R12_IS_RETIRED_KEY]: opts.isRetired,
        },
      },
    },
    provenance: {
      clauseId: ids.clauseId(R12_CLAUSE_ID),
      clauseVersionId: ids.clauseVersionId(opts.clauseVersionId ?? R12_VERSION_ID),
      payloadHash: 'a'.repeat(64),
      evaluatedAt: opts.evaluatedAt ?? AT_ISO,
      inputsSummary: { state: 'active' },
      benefitMechanism: 'pool',
    },
    subClauseResults: [],
    reasonCode: `rule.${decision}`,
  };
}

/** Wrap an R12 result in its ordered slot (the single Epic-4 member-standing clause). */
export function r12Slot(result: EvaluationResult | null): ClauseEvalSlot {
  return { clauseId: ids.clauseId(R12_CLAUSE_ID), result };
}
