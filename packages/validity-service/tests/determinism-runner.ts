// Determinism-replay RUN BODY — Story 4.6 (Task 6; the AC2 P0 gate composition).
//
// The real service COMPOSITION LAYER (ordered multi-clause evaluation → payload assembly → hash),
// exercised with DELIBERATELY SCRAMBLED async completion order. Kept as a TS module (type-checked, the
// real `evaluateOrderedClauses` + `assemblePayload`) that the thin `determinism.worker.mjs` dynamic-
// imports under a tsx-registered worker (Node 22's native type-stripping doesn't remap `.js`→`.ts`, so
// the worker registers tsx at runtime and imports this). Pure — no DB.

import { ids } from '@twt/domain';
import type { EvaluationResult } from '@twt/niyamavali-engine';

import { assemblePayload } from '../src/payload.js';
import { evaluateOrderedClauses, type RuleDescriptor } from '../src/rules.js';

const MEMBER = ids.memberId('22222222-2222-2222-2222-222222222222');
const PARIWAR = ids.pariwarId('11111111-1111-1111-1111-111111111111');
const AT = new Date('2025-06-01T00:00:00.000Z');

/** N synthetic clauses (distinct ids + version ids + outcomes) — enough to make ordering observable. */
const SYNTHETIC_CLAUSES = Array.from({ length: 6 }, (_v, i) => ({
  clauseId: `niy.synthetic.clause-${i}`,
  clauseVersionId: `0e1c00${(i + 10).toString(16).padStart(2, '0')}-0000-4000-8000-000000000001`,
  grantedYears: i,
}));

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** A synthetic clause result mirroring the engine's computed-channel shape. */
function syntheticResult(c: (typeof SYNTHETIC_CLAUSES)[number]): EvaluationResult {
  return {
    result: {
      decision: `synthetic_${c.grantedYears}`,
      specialFlags: c.grantedYears % 2 === 0 ? [`flag_${c.grantedYears}`] : [],
      computed: { values: { granted_years: c.grantedYears, is_retired: true } },
    },
    provenance: {
      clauseId: ids.clauseId(c.clauseId),
      clauseVersionId: ids.clauseVersionId(c.clauseVersionId),
      payloadHash: 'b'.repeat(64),
      evaluatedAt: AT.toISOString(),
      inputsSummary: { state: 'active' },
      benefitMechanism: 'pool',
    },
    subClauseResults: [],
    reasonCode: `rule.synthetic_${c.grantedYears}`,
  };
}

/**
 * Build descriptors whose evaluators resolve in SCRAMBLED order: clause i waits a jittered delay that
 * differs per clause (+ real thread scheduling), so `Promise.all` settles them out of declared order.
 * The harness must still assemble them in `VALIDITY_RULE_ORDER` (index-preserving).
 */
function scrambledDescriptors(seed: number): RuleDescriptor[] {
  return SYNTHETIC_CLAUSES.map((c, i) => ({
    clauseId: ids.clauseId(c.clauseId),
    facts: {},
    evaluateAt: async () => {
      await delay(((seed + (SYNTHETIC_CLAUSES.length - i) * 3) % 7) + 1);
      return syntheticResult(c);
    },
  }));
}

/** Run ONE composition and return its validity_payload_hash. */
async function computeHash(seed: number): Promise<string> {
  const slots = await evaluateOrderedClauses(
    { db: null as never, keyedStore: null as never, servicePool: null as never },
    { pariwarId: PARIWAR, memberId: MEMBER },
    scrambledDescriptors(seed),
    AT,
  );
  const payload = assemblePayload({
    memberId: MEMBER,
    evaluatedAt: AT,
    memberState: 'active',
    lockInStatus: { daysAtJoin: null, unlockDate: null, state: 'never-entered' },
    vyawasthaShulkStatus: { paidThrough: null, daysUntilLapse: null, inRenewalGrace: false, graceRemainingDays: null },
    medicalDisclosureFlags: { hasDisclosureOnRecord: false, declaredConditionCount: null, imaListVersion: null, pendingConcealmentFlag: false },
    retirementCoverage: { status: 'clause_unavailable' },
    slots,
  });
  return payload.validityPayloadHash;
}

/** Run `runs` compositions and return their hashes (the worker collects these). */
export async function runBatch(runs: number, baseSeed: number): Promise<string[]> {
  const hashes: string[] = [];
  for (let i = 0; i < runs; i++) hashes.push(await computeHash(baseSeed + i));
  return hashes;
}
