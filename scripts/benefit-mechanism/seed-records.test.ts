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
  it('extracts the structurally-real clause records from the seed (Story 2.3 + Story 3.5 + Story 3.6b + Story 4.2 + Story 4.3)', () => {
    const { records } = loadSeedRecords();
    // 3 Story-2.3 clauses + 2 Story-3.5 medical clauses + 1 Story-3.6b lock-in policy clause
    // + 6 Story-4.2 R7(B–G) restoration-ladder clauses (r7-a was pre-existing from Story 2.3)
    // + 2 Story-4.3 R8(A)/R8(B) clauses (r8 base was pre-existing from Story 2.3, upgraded in place).
    expect(records).toHaveLength(14);
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
      'niy.ninety-percent-rule.r8',
      'niy.ninety-percent-rule.r8-a',
      'niy.ninety-percent-rule.r8-b',
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
