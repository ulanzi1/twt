// Story 6.24b (Task 5.5; AC9b, invariant 7) — the suspicion notices ⛔ never refuse, close, approve or decide a claim, and
// ⛔ never emit a claim event. 6.19d's form (`claim-certificate-reminder-no-decision.test.ts`): a runtime spy CANNOT see
// this (an ESM namespace export is ⛔ interceptable — the sweep calls the domain module-internally), so the fence reads the
// SOURCE of every module of this story — the jobs sweep + child, the shared send core, the sibling registry and the
// domain's notice module — and refuses any decision writer's or event emitter's NAME, 6.24a's writers included, AND a
// WRITE to a decision / event / claim table in the forms this codebase writes (the domain module writes raw SQL — a name
// fence alone would pass an `INSERT INTO events_log`): raw `INSERT INTO` / `UPDATE [ONLY]` / `DELETE FROM [ONLY]` /
// `MERGE INTO` / `TRUNCATE`, schema-qualified or quoted, a Drizzle `.insert(` / `.update(` / `.delete(` on the table
// through ANY namespace, and ANY write whose table is INTERPOLATED (`${…}` — it cannot be checked, so it is refused).
// ⚠ Its LIMIT, stated (code review round 2): it reads these four modules only — ⛔ the helpers they call (each is that
// helper's own story's fence) — and a write hidden behind a string the module builds at runtime is ⛔ seen.
// Comments stripped: the doc-blocks name them to forbid them.
// ⭐ POSITIVE CONTROL: the child's claiming transaction IS referenced (⛔ a vacuous fence); a writer PLANTED into a copy of
// each REAL module — one per pattern, each asserted caught BY THAT PATTERN — IS caught by the same `violationsOf`; and the
// table list is checked against the schema's exports (⛔ a misspelt table that matches nothing).

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { schema } from '@twt/domain';
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

/** The tables a notice must ⛔ write: the claim, every decision / vote / appeal / review / determination table, the event log. */
const DECISION_TABLE_NAMES = [
  'claims',
  'claim_verifier_decisions',
  'claim_appeals',
  'claim_appeal_decisions',
  'claim_appeal_panel_sessions',
  'claim_appeal_panel_votes',
  'claim_state_trustee_decisions',
  'claim_r9_voting_sessions',
  'claim_r9_votes',
  'claim_death_certificate_reviews',
  'claim_correction_closures',
  'claim_ground_inspections',
  'cycle_freeze_commits',
  'nominee_determinations',
  'nominee_determination_items',
  'events_log',
] as const;
const camel = (t: string) => t.replace(/_([a-z0-9])/g, (_m, c: string) => c.toUpperCase());
const TABLES = DECISION_TABLE_NAMES.join('|');
const TABLES_TS = DECISION_TABLE_NAMES.map(camel).join('|');
/** `[schema.]table`, either part optionally quoted — `public.events_log`, `"public"."claims"`, `claims`. */
const QUALIFIED = `(?:"?\\w+"?\\.)?"?(?:${TABLES})"?\\b`;
const FORBIDDEN_WRITES = {
  insert: new RegExp(`\\bINSERT\\s+INTO\\s+${QUALIFIED}`, 'i'),
  update: new RegExp(`\\bUPDATE\\s+(?:ONLY\\s+)?${QUALIFIED}`, 'i'), // ⚠ `… FOR UPDATE` (the claim-row lock) does ⛔ match
  delete: new RegExp(`\\bDELETE\\s+FROM\\s+(?:ONLY\\s+)?${QUALIFIED}`, 'i'),
  merge: new RegExp(`\\bMERGE\\s+INTO\\s+${QUALIFIED}`, 'i'),
  truncate: new RegExp(`\\bTRUNCATE\\s+(?:TABLE\\s+)?(?:ONLY\\s+)?${QUALIFIED}`, 'i'),
  drizzle: new RegExp(`\\.(?:insert|update|delete)\\(\\s*(?:[\\w$]+\\.)?(?:${TABLES_TS})\\b`),
  interpolated: /\b(?:INSERT\s+INTO|UPDATE(?:\s+ONLY)?|DELETE\s+FROM(?:\s+ONLY)?|MERGE\s+INTO|TRUNCATE(?:\s+TABLE)?)\s+\$\{/i,
} as const;
type WriteForm = keyof typeof FORBIDDEN_WRITES;

/** Every forbidden NAME or WRITE form in `src` (comments stripped) — ONE function for the fence and its positive control. */
function violationsOf(src: string): string[] {
  const code = stripComments(src);
  const forms = (Object.keys(FORBIDDEN_WRITES) as WriteForm[]).filter((k) => FORBIDDEN_WRITES[k].test(code));
  return [...FORBIDDEN.filter((name) => code.includes(name)), ...forms];
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
    // ONE plant per form — and each must be caught BY ITS OWN pattern (⛔ incidentally by another).
    const plants: readonly (readonly [string, string])[] = [
      ['closeClaimsHeldBySuspicionAppeal', 'await claim.closeClaimsHeldBySuspicionAppeal(client, input);'],
      ['insert', 'await client.query(`INSERT INTO public.events_log (stream_id) VALUES ($1)`, [id]);'],
      ['update', "await client.query(`UPDATE ONLY \"public\".\"claims\" SET current_state = 'closed' WHERE claim_case_id = $1`, [id]);"],
      ['delete', 'await client.query(`DELETE FROM claim_appeal_panel_votes WHERE claim_case_id = $1`, [id]);'],
      ['merge', 'await client.query(`MERGE INTO claim_verifier_decisions d USING x ON true WHEN MATCHED THEN DO NOTHING`);'],
      ['truncate', 'await client.query(`TRUNCATE TABLE nominee_determinations`);'],
      ['drizzle', 'await db.insert(s.claimVerifierDecisions).values(row);'],
      ['drizzle', 'await tx.update(claims).set({ currentState: "closed" });'],
      ['drizzle', 'await db.delete(schema.eventsLog);'],
      ['interpolated', 'await db.execute(sql`UPDATE ${schema.claims} SET current_state = ${s}`);'],
    ];
    for (const rel of NOTICE_MODULES) {
      for (const [form, plant] of plants) {
        expect(violationsOf(`${read(rel)}\n${plant}\n`), `${rel} + ${plant}`).toContain(form);
      }
      // …and a COMMENTED plant is ⛔ caught (the doc-blocks may name what they forbid).
      expect(violationsOf(`${read(rel)}\n// ${plants[1]![1]}\n`)).toEqual([]);
    }
  });

  it('⭐ the table list is REAL — every name is a table the schema exports (⛔ a misspelling that silently matches nothing)', () => {
    for (const t of DECISION_TABLE_NAMES) {
      expect(Object.keys(schema), t).toContain(camel(t));
    }
  });
});
