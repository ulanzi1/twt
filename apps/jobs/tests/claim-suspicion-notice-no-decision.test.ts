// Story 6.24b (Task 5.5; AC9b, invariant 7) — the suspicion notices ⛔ never refuse, close, approve or decide a claim, and
// ⛔ never emit a claim event. 6.19d's form (`claim-certificate-reminder-no-decision.test.ts`): a runtime spy CANNOT see
// this (an ESM namespace export is ⛔ interceptable — the sweep calls the domain module-internally), so the fence reads the
// SOURCE of every module of this story — the jobs sweep + child, the shared send core, the sibling registry and the
// domain's notice module — and refuses any decision writer's or event emitter's NAME, 6.24a's writers included, AND any
// RAW-SQL or Drizzle WRITE to a decision / event / claim table (the domain module writes raw SQL — a name fence alone would
// pass an `INSERT INTO events_log`). Comments stripped: the doc-blocks name them to forbid them.
// ⭐ POSITIVE CONTROL: the child's claiming transaction IS referenced (⛔ a vacuous fence), and a writer PLANTED into a copy
// of each REAL module — a name and a raw write — IS caught by the same `violationsOf` the fence runs.

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

/** The tables a notice must ⛔ write: the claim, its decisions / appeal / determination, and the event log. */
const DECISION_TABLES = 'claims|claim_verifier_decisions|claim_appeals|nominee_determinations|nominee_determination_items|events_log';
const DECISION_TABLES_TS = 'claims|claimVerifierDecisions|claimAppeals|nomineeDeterminations|nomineeDeterminationItems|eventsLog';
const FORBIDDEN_WRITES: readonly RegExp[] = [
  new RegExp(`\\bINSERT\\s+INTO\\s+"?(${DECISION_TABLES})"?\\b`, 'i'),
  new RegExp(`\\bUPDATE\\s+"?(${DECISION_TABLES})"?\\b`, 'i'), // ⚠ `… FOR UPDATE` (the claim-row lock) does ⛔ match
  new RegExp(`\\bDELETE\\s+FROM\\s+"?(${DECISION_TABLES})"?\\b`, 'i'),
  new RegExp(`\\.(insert|update|delete)\\(\\s*(schema\\.)?(${DECISION_TABLES_TS})\\b`),
];

/** Every forbidden NAME or WRITE in `src` (comments stripped) — ONE function for the fence and its positive control. */
function violationsOf(src: string): string[] {
  const code = stripComments(src);
  return [...FORBIDDEN.filter((name) => code.includes(name)), ...FORBIDDEN_WRITES.filter((re) => re.test(code)).map(String)];
}

describe('⛔ invariant 7 — the suspicion notices call ⛔ decision writer and emit ⛔ claim event', () => {
  for (const rel of NOTICE_MODULES) {
    it(`${rel} names ⛔ decision writer or event emitter and WRITES ⛔ decision / event table (comments stripped)`, () => {
      expect(violationsOf(read(rel)), `${rel} must not decide or emit`).toEqual([]);
    });
  }

  it('⭐ POSITIVE CONTROL — the fence is ⛔ vacuous: the child references its claiming transaction, and a writer planted into each REAL module IS caught', () => {
    expect(stripComments(read('apps/jobs/src/scheduler/claim-suspicion-notices.ts'))).toContain('beginSuspicionNotice(');
    expect(stripComments(read('packages/domain/src/claim/suspicion-notice.ts'))).toContain('export async function beginSuspicionNotice(');
    const plants = [
      'await claim.closeClaimsHeldBySuspicionAppeal(client, input);',
      "await client.query(`INSERT INTO events_log (stream_id) VALUES ($1)`, [id]);",
      "await client.query(`UPDATE claims SET current_state = 'closed' WHERE claim_case_id = $1`, [id]);",
      'await db.insert(schema.claimVerifierDecisions).values(row);',
    ];
    for (const rel of NOTICE_MODULES) {
      for (const plant of plants) {
        expect(violationsOf(`${read(rel)}\n${plant}\n`), `${rel} + ${plant}`).not.toEqual([]);
      }
      // …and a COMMENTED plant is ⛔ caught (the doc-blocks may name what they forbid).
      expect(violationsOf(`${read(rel)}\n// ${plants[1]!}\n`)).toEqual([]);
    }
  });
});
