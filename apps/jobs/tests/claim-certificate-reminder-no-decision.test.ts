// Story 6.19d (AC6; `2026-10-03-276` CR12) — invariant 1: the replacement-certificate reminder ⛔ never refuses, closes,
// approves or time-limits a claim, and ⛔ never emits a claim event. ⚠ A runtime spy CANNOT see this (an ESM namespace
// export is ⛔ interceptable — the sweep calls the domain module-internally), so the fence reads the SOURCE of every
// module of this story — the jobs sweep + child and the domain's runs, record, schedule, letter and list modules — and
// refuses any decision writer's or event emitter's NAME (comments stripped: the doc-blocks name them to forbid them).
// ⭐ POSITIVE CONTROL: the sweep's own run opener IS referenced (⛔ a vacuous fence), and a planted writer WOULD be caught.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const read = (rel: string) => readFileSync(path.join(repoRoot, rel), 'utf-8');
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\s\/\/.*$/gm, '');

const CERTIFICATE_MODULES = [
  'apps/jobs/src/scheduler/claim-certificate-reminders.ts',
  'packages/domain/src/claim/certificate-reminder.ts',
  'packages/domain/src/claim/certificate-reminder-record.ts',
  'packages/domain/src/claim/certificate-reminder-schedule.ts',
  'packages/domain/src/claim/certificate-letter.ts',
  'packages/domain/src/claim/certificate-reminder-read.ts',
] as const;

/** Every writer that DECIDES (or asks for a decision on) a claim, and every claim-event emitter. */
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
  'finalizeR9Outcome',
  'commitCycleFreeze',
  'writeCorrectionMark',
  'recordDeathCertificateReview',
  'recordNomineeDetermination',
  'projectClaimState',
  'appendEvent',
] as const;

describe('⛔ invariant 1 — the certificate reminder calls ⛔ decision writer and emits ⛔ claim event', () => {
  for (const rel of CERTIFICATE_MODULES) {
    it(`${rel} names ⛔ decision writer or event emitter (comments stripped)`, () => {
      const code = stripComments(read(rel));
      for (const name of FORBIDDEN) {
        expect(code.includes(name), `${rel} must not reference ${name}`).toBe(false);
      }
    });
  }

  it('⭐ POSITIVE CONTROL — the fence is ⛔ vacuous: the sweep references its run opener, and a planted writer WOULD be caught', () => {
    expect(stripComments(read('apps/jobs/src/scheduler/claim-certificate-reminders.ts'))).toContain('openCertificateRun(');
    const planted = stripComments(`// adjudicateClaim is forbidden\nawait claim.adjudicateClaim(client, input);`);
    expect(planted.includes('adjudicateClaim')).toBe(true);
  });
});
