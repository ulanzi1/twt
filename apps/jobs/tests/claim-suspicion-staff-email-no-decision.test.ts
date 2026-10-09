// Story 6.25 (Task 5.3; AC9; Invariant 4) — the STAFF EMAIL ⛔ never refuses, closes, approves or decides a claim, ⛔ never emits
// a claim event, and ⛔ never writes an IDENTITY table. 6.24b's form (`claim-suspicion-notice-no-decision.test.ts`): a runtime spy
// CANNOT see this (an ESM namespace export is ⛔ interceptable), so the fence reads the SOURCE of every module of this story — the
// jobs sweep + child, the email port and its config, the template, and the domain's two modules — and refuses any decision writer's
// or event emitter's NAME AND a WRITE to a decision / event / claim / identity table in every form this codebase writes: raw
// `INSERT INTO` / `UPDATE [ONLY]` / `DELETE FROM [ONLY]` / `MERGE INTO` / `TRUNCATE`, schema-qualified or quoted, a Drizzle
// `.insert(` / `.update(` / `.delete(` through ANY namespace, and ANY write whose table is INTERPOLATED.
// ⭐ The table list is 6.24b's EXTENDED with `role_grants`, `users` and `admin_credentials` (Invariant 4 — the sweep READS identity
// data through ADR-0040's Q1 / Q2 and writes ⛔ of it). ⚠ LIMIT: it reads these modules only — ⛔ the helpers they call.
// Comments stripped. ⭐ POSITIVE CONTROL: the claiming transaction IS referenced; one plant per form into a copy of each REAL
// module IS caught by its own pattern; a commented plant is ⛔; and the table list is checked against the schema's exports.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { schema } from '@twt/domain';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const read = (rel: string) => readFileSync(path.join(repoRoot, rel), 'utf-8');
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\s\/\/.*$/gm, '');

const STAFF_EMAIL_MODULES = [
  'apps/jobs/src/scheduler/claim-suspicion-staff-emails.ts',
  'apps/jobs/src/scheduler/staff-email-client.ts',
  'apps/jobs/src/scheduler/staff-email-config.ts',
  'apps/jobs/src/scheduler/suspicion-staff-email-templates.ts',
  'packages/domain/src/claim/suspicion-staff-email.ts',
  'packages/domain/src/claim/staff-email-identity-read.ts',
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

/** The tables the staff email must ⛔ write: the claim, every decision / vote / appeal / review / determination table, the event log, the identity family. */
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
  // ⭐ Story 6.25 — the IDENTITY family the staff email reads (Q1 / Q2) and must ⛔ write.
  'role_grants',
  'users',
  'admin_credentials',
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

describe('⛔ Invariant 4 — the staff email calls ⛔ decision writer, emits ⛔ claim event, writes ⛔ identity table', () => {
  for (const rel of STAFF_EMAIL_MODULES) {
    it(`${rel} names ⛔ decision writer or event emitter and WRITES ⛔ decision / event table (comments stripped)`, () => {
      expect(violationsOf(read(rel)), `${rel} must not decide or emit`).toEqual([]);
    });
  }

  it('⭐ POSITIVE CONTROL — the fence is ⛔ vacuous: the child references its claiming transaction, and a writer planted into each REAL module IS caught', () => {
    expect(stripComments(read('apps/jobs/src/scheduler/claim-suspicion-staff-emails.ts'))).toContain('beginSuspicionStaffEmail(');
    expect(stripComments(read('packages/domain/src/claim/suspicion-staff-email.ts'))).toContain('export async function beginSuspicionStaffEmail(');
    // ONE plant per form — and each must be caught BY ITS OWN pattern (⛔ incidentally by another).
    const plants: readonly (readonly [string, string])[] = [
      ['closeClaimsHeldBySuspicionAppeal', 'await claim.closeClaimsHeldBySuspicionAppeal(client, input);'],
      ['insert', 'await client.query(`INSERT INTO public.events_log (stream_id) VALUES ($1)`, [id]);'],
      ['update', "await client.query(`UPDATE ONLY \"public\".\"claims\" SET current_state = 'closed' WHERE claim_case_id = $1`, [id]);"],
      ['delete', 'await client.query(`DELETE FROM claim_appeal_panel_votes WHERE claim_case_id = $1`, [id]);'],
      ['merge', 'await client.query(`MERGE INTO claim_verifier_decisions d USING x ON true WHEN MATCHED THEN DO NOTHING`);'],
      ['truncate', 'await client.query(`TRUNCATE TABLE nominee_determinations`);'],
      ['insert', "await client.query(`INSERT INTO admin_credentials (user_id) VALUES ($1)`, [id]);"],
      ['update', "await client.query(`UPDATE users SET status = 'active' WHERE id = $1`, [id]);"],
      ['delete', 'await client.query(`DELETE FROM role_grants WHERE user_id = $1`, [id]);'],
      ['drizzle', 'await db.update(schema.adminCredentials).set({ failedAttempts: 0 });'],
      ['drizzle', 'await db.insert(s.claimVerifierDecisions).values(row);'],
      ['drizzle', 'await tx.update(claims).set({ currentState: "closed" });'],
      ['drizzle', 'await db.delete(schema.eventsLog);'],
      ['interpolated', 'await db.execute(sql`UPDATE ${schema.claims} SET current_state = ${s}`);'],
    ];
    for (const rel of STAFF_EMAIL_MODULES) {
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
