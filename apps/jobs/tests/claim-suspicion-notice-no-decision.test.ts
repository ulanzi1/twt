// Story 6.24b (Task 5.5; AC9b, invariant 7) — the suspicion notices ⛔ never refuse, close, approve or decide a claim, and
// ⛔ never emit a claim event. 6.19d's form (`claim-certificate-reminder-no-decision.test.ts`): a runtime spy CANNOT see
// this (an ESM namespace export is ⛔ interceptable — the sweep calls the domain module-internally), so the fence reads the
// SOURCE of every module of this story — the jobs sweep + child, the shared send core, the sibling registry and the
// domain's notice module — and refuses any decision writer's or event emitter's NAME, 6.24a's writers included (comments
// stripped: the doc-blocks name them to forbid them).
// ⭐ POSITIVE CONTROL: the child's claiming transaction IS referenced (⛔ a vacuous fence), and a planted writer WOULD be caught.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const read = (rel: string) => readFileSync(path.join(repoRoot, rel), 'utf-8');
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\s\/\/.*$/gm, '');

const NOTICE_MODULES = [
  'apps/jobs/src/scheduler/claim-suspicion-notices.ts',
  'apps/jobs/src/scheduler/claim-dlt-sms-send.ts',
  'apps/jobs/src/scheduler/suspicion-notice-sms-templates.ts',
  'packages/domain/src/claim/suspicion-notice.ts',
] as const;

/** Every writer that DECIDES (or asks for a decision on) a claim, every claim-event emitter, and 6.24a's writers. */
const FORBIDDEN = [
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
  'reviseDecision',
  'finalizeR9Outcome',
  'commitCycleFreeze',
  'writeCorrectionMark',
  'recordDeathCertificateReview',
  'recordNomineeDetermination',
  'projectClaimState',
  'appendEvent',
  // ⭐ 6.24a — the closure, the appeal writers and the reversal key (the notices READ RF1 and the closing event, ⛔ more).
  'closeClaimsHeldBySuspicionAppeal',
  'acquireSuspicionReversalLock',
  'initiateAppeal',
  'reviewAppealStage1',
  'finalizeAppealOutcome',
  'decideAppealStage3',
  'acquireIntakeLock',
  'intakeAdvisoryLockKey',
] as const;

describe('⛔ invariant 7 — the suspicion notices call ⛔ decision writer and emit ⛔ claim event', () => {
  for (const rel of NOTICE_MODULES) {
    it(`${rel} names ⛔ decision writer or event emitter (comments stripped)`, () => {
      const code = stripComments(read(rel));
      for (const name of FORBIDDEN) {
        expect(code.includes(name), `${rel} must not reference ${name}`).toBe(false);
      }
    });
  }

  it('⭐ POSITIVE CONTROL — the fence is ⛔ vacuous: the child references its claiming transaction, and a planted writer WOULD be caught', () => {
    expect(stripComments(read('apps/jobs/src/scheduler/claim-suspicion-notices.ts'))).toContain('beginSuspicionNotice(');
    expect(stripComments(read('packages/domain/src/claim/suspicion-notice.ts'))).toContain('export async function beginSuspicionNotice(');
    const planted = stripComments(`// closeClaimsHeldBySuspicionAppeal is forbidden\nawait claim.closeClaimsHeldBySuspicionAppeal(client, input);`);
    expect(planted.includes('closeClaimsHeldBySuspicionAppeal')).toBe(true);
  });
});
