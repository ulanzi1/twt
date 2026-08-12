// Niyamavali seed ↔ benefit-mechanism gate seam test — Story 2.3 (Task 8.3).
//
// Demonstrates the DOCUMENTED importable seam (README §"The validators are
// importable so Epic 2's seed-loader / registry tests reuse them"): the Story 2.3
// rule seed is read, extracted via `extractFromSqlInserts`, and validated via
// `validateRuleRecords` — exactly as the gate does — asserting every seeded
// record carries a v1-permitted `benefit_mechanism` (`pool`).
//
// Lives in scripts/benefit-mechanism/ (NOT packages/domain/tests/) because the
// domain tsconfig `rootDir: .` would reject a cross-root import of this lib; here
// the lib imports cleanly and the suite is collected by `pnpm benefit:test`.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  extractFromSqlInserts,
  parseBenefitMechanismConfig,
  validateRuleRecords,
} from './lib.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SEED_PATH = 'packages/domain/seed/niyamavali-v1-clauses.sql';

function loadConfig() {
  return parseBenefitMechanismConfig(
    fs.readFileSync(path.join(repoRoot, 'benefit-mechanism.yaml'), 'utf8'),
  );
}

function loadSeedRecords() {
  const config = loadConfig();
  const text = fs.readFileSync(path.join(repoRoot, SEED_PATH), 'utf8');
  return { config, records: extractFromSqlInserts([{ path: SEED_PATH, text }], config) };
}

describe('Niyamavali v1 seed × benefit-mechanism gate (the importable seam)', () => {
  it('extracts the structurally-real clause records from the seed (Story 2.3 + Story 3.5 + Story 3.6b + Story 4.2 + Story 4.3 + Story 4.4 + Story 4.5)', () => {
    const { records } = loadSeedRecords();
    // 3 Story-2.3 clauses + 2 Story-3.5 medical clauses + 1 Story-3.6b lock-in policy clause
    // + 6 Story-4.2 R7(B–G) restoration-ladder clauses (r7-a was pre-existing from Story 2.3)
    // + 2 Story-4.3 R8(A)/R8(B) clauses (r8 base was pre-existing from Story 2.3, upgraded in place)
    // + 6 Story-4.4 R5/R9 special-death clauses (r5-c-2/r5-d/r5-e/r5-f/r9/r9-a NET-new; the Mar-2025
    //   r9-suicide-murder stub + the r14 concealment clause were both upgraded/amended IN PLACE per
    //   D1/D2, so they add NO new rows)
    // + 1 Story-4.5 R12 retirement-coverage clause (niy.retirement-coverage.r12 NET-new — the first
    //   `rule_kind:'computed'` clause)
    // + 1 Story-10.23 restoration-discipline INSTRUMENT policy clause
    //   (niy.restoration-discipline.policy NET-new). ⚠ It carries NO `lock_in_months`: §3.1 puts the
    //   durations on the RUNG, so the R7 clauses above keep them and this clause supplies only what
    //   no R7 clause can express — the month-counting convention and the concurrency rule (D2).
    // + 1 Story-10.20 moderation-dwell policy clause (niy.moderation.dwell NET-new) — the SEVEN-DAY
    //   dwell between suspension and termination, ratified as versioned registry data by Decision
    //   `2026-08-12-099` (Q4) rather than a code constant (review follow-up: this seed addition
    //   shipped without updating this gate's expected count/id-list, which the live CI-local
    //   pre-push run caught).
    expect(records).toHaveLength(23);
    const ids = records.map((r) => r.id).sort();
    expect(ids).toEqual([
      'niy.concealment.r14',
      'niy.contribution-discipline.r7-a',
      'niy.contribution-discipline.r7-b',
      'niy.contribution-discipline.r7-c',
      'niy.contribution-discipline.r7-d',
      'niy.contribution-discipline.r7-e',
      'niy.contribution-discipline.r7-f',
      'niy.contribution-discipline.r7-g',
      'niy.lock-in.policy',
      'niy.medical.ima-list',
      'niy.moderation.dwell',
      'niy.ninety-percent-rule.r8',
      'niy.ninety-percent-rule.r8-a',
      'niy.ninety-percent-rule.r8-b',
      // ⚠ Story 10.23 — deliberately NOT `niy.…lock-in…` (AC11). `@twt/ui`'s
      // `member-status/presenter.ts:145` finds the JOIN lock-in clause by substring
      // (`clauseId.includes('lock-in')`), so a colliding id would hijack the admin panel's
      // join-lock-in section and show a trustee the wrong clause on a member's record.
      'niy.restoration-discipline.policy',
      'niy.retirement-coverage.r12',
      'niy.special-death.r5-c-2',
      'niy.special-death.r5-d',
      'niy.special-death.r5-e',
      'niy.special-death.r5-f',
      'niy.special-death.r9',
      'niy.special-death.r9-a',
      'niy.special-death.r9-suicide-murder',
    ]);
  });

  it('every seeded record is tagged pool', () => {
    const { records } = loadSeedRecords();
    expect(records.every((r) => r.benefit_mechanism === 'pool')).toBe(true);
  });

  it('validateRuleRecords returns NO findings for the seed (check (a) green with teeth)', () => {
    const { config, records } = loadSeedRecords();
    expect(validateRuleRecords(records, config)).toEqual([]);
  });

  it('teeth proof: a reserve-tagged record WOULD be a finding while v1_only', () => {
    const { config } = loadSeedRecords();
    const findings = validateRuleRecords(
      [{ id: 'niy.test.reserve', benefit_mechanism: 'reserve', _source: SEED_PATH }],
      config,
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.kind).toBe('rule-tag');
  });
});
