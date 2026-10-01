// Story 6.19c (AC6, AC11c "Jobs" — "the day-90 reminder job NEVER calls a writer") — invariant 1: ⛔ no job, sweep or
// timer may call any decision writer. ⚠ A runtime spy CANNOT see this: the sweep's per-claim work calls the domain's
// functions module-INTERNALLY (an ESM namespace export is ⛔ interceptable), so a spy on `@twt/domain` would pass while a
// planner called a writer directly. ⇒ the fence reads the SOURCE of every module the sweep and the child run — the jobs
// module and the domain's job steps — and refuses any decision writer's NAME (comments stripped: the doc-blocks name
// them in order to forbid them). The ONE record the day-90 job writes, `escalateStaffCase`, is asserted PRESENT (⛔ a
// vacuous fence). The live suite proves the other half: the sweep moves ⛔ no claim state and opens ⛔ no closures row on
// a family claim.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const read = (rel: string) => readFileSync(path.join(repoRoot, rel), 'utf-8');
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\s\/\/.*$/gm, '');

const SWEEP_MODULES = [
  'apps/jobs/src/scheduler/claim-correction-closure.ts',
  'packages/domain/src/claim/correction-closure-jobs.ts',
] as const;

/** Every writer that DECIDES (or asks for a decision on) a claim — ⛔ in the sweep's reach. */
const DECISION_WRITERS = [
  'requestCorrectionClosure',
  'decideCorrectionClosure',
  'decideEscalatedClosure',
  'approveNoCorrectionNeeded',
  'keepNoCorrectionNeeded',
  'recordNoCorrectionNeeded',
  'placeClosureUnderReview',
  'recordClosureDirection',
  'voteOnFrozenClaim',
  'returnToDistrictAdmin',
  'routeToR9',
  'resolveEscalation',
  'adjudicateClaim',
  'finalizeR9Outcome',
  'commitCycleFreeze',
  'writeCorrectionMark',
  'projectClaimState',
] as const;

describe('⛔ invariant 1 — the closure sweep and its child call ⛔ decision writer', () => {
  for (const rel of SWEEP_MODULES) {
    it(`${rel} names ⛔ decision writer (comments stripped)`, () => {
      const code = stripComments(read(rel));
      for (const writer of DECISION_WRITERS) {
        expect(code.includes(writer), `${rel} must not reference ${writer}`).toBe(false);
      }
    });
  }

  it('⭐ POSITIVE CONTROL — the fence is ⛔ vacuous: the ONE record the day-90 job writes IS referenced, and a planted writer name WOULD be caught', () => {
    expect(stripComments(read('packages/domain/src/claim/correction-closure-jobs.ts'))).toContain('escalateStaffCase(');
    const planted = stripComments(`// decideCorrectionClosure is forbidden\nawait claim.decideCorrectionClosure(client, input);`);
    expect(planted.includes('decideCorrectionClosure')).toBe(true);
  });
});
