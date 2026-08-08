// The restoration-discipline instrument-policy clause — Story 10.23 (AC3, AC11; D2). PURE, DB-free.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  RESTORATION_DISCIPLINE_POLICY_CLAUSE_ID,
  RestorationDisciplinePolicyPayloadSchema,
} from '../../src/member/restoration-discipline/policy.js';

const SEED = readFileSync(
  fileURLToPath(new URL('../../seed/niyamavali-v1-clauses.sql', import.meta.url)),
  'utf8',
);

/**
 * The raw JSON payload literal seeded for a clause id — everything between the `'{` and the `}'`
 * that precedes `::jsonb`. One helper, so a slicing slip cannot make an assertion pass vacuously
 * against an empty string (it did exactly that on the first run of this file).
 */
function seededPayloadJson(clauseIdLiteral: string): string {
  const at = SEED.indexOf(`'${clauseIdLiteral}'`);
  expect(at, `clause ${clauseIdLiteral} is not seeded`).toBeGreaterThan(-1);
  const block = SEED.slice(at);
  const start = block.indexOf("'{");
  const end = block.indexOf("}'::jsonb");
  expect(start, 'payload literal not found').toBeGreaterThan(-1);
  expect(end, 'payload literal not terminated').toBeGreaterThan(start);
  return block.slice(start + 1, end + 1);
}

/** Every `clause_id` literal this story introduces (currently exactly one). */
const CLAUSE_IDS_INTRODUCED_BY_10_23 = [String(RESTORATION_DISCIPLINE_POLICY_CLAUSE_ID)];

describe('Story 10.23 — ⛔ AC11: no clause id this story introduces may contain `lock-in`', () => {
  it('the instrument-policy clause id does NOT match /lock-in/', () => {
    // ⚠ NOT hypothetical. `@twt/ui`'s `member-status/presenter.ts:145` finds the JOIN lock-in clause
    // with `clauseId.includes('lock-in')` — a documented known simplification (2026-07-04 review)
    // matching by SUBSTRING because `applicableNiyamavaliClauses` carries no stable category field,
    // and whose recorded risk is precisely "a future clause whose id contains 'lock-in' would
    // false-match". `niy.lock-in.policy`'s resolved version already reaches
    // `resolvedClauseVersionIds` through the engine seam, so a colliding id would HIJACK the admin
    // panel's join-lock-in section and its deep link — showing a trustee the wrong clause and the
    // wrong version on a member's record.
    for (const id of CLAUSE_IDS_INTRODUCED_BY_10_23) {
      expect(id, `clause id "${id}" would false-match ui/member-status/presenter.ts:145`).not.toMatch(
        /lock-in/,
      );
    }
  });

  it('is still recognisably the restoration-discipline instrument (not renamed into meaninglessness)', () => {
    expect(String(RESTORATION_DISCIPLINE_POLICY_CLAUSE_ID)).toBe('niy.restoration-discipline.policy');
    // The frozen registry id format `niy.<section-slug>.<clause-slug>` (epics.md:1453).
    expect(String(RESTORATION_DISCIPLINE_POLICY_CLAUSE_ID)).toMatch(/^niy\.[a-z0-9-]+\.[a-z0-9-]+$/);
  });
});

describe('Story 10.23 — the clause seed (D2, AC3, AC5)', () => {
  it('is seeded with a `pool` benefit_mechanism (frozen row 12 — required on every v1 rule)', () => {
    expect(SEED).toContain("'niy.restoration-discipline.policy'");
    const block = SEED.slice(SEED.indexOf("'niy.restoration-discipline.policy'"));
    expect(block).toContain("'pool'");
  });

  it("⭐ does NOT carry `lock_in_months` — the DURATION stays on the RUNG, where §3.1 puts it (D2)", () => {
    // The single most likely misimplementation of this story's registry half. Duplicating the months
    // here would create TWO REGISTRY SOURCES FOR ONE CONSTITUTIONAL NUMBER, and the Trustee Panel
    // would have to amend two instruments to change one.
    const payload = seededPayloadJson('niy.restoration-discipline.policy');
    expect(payload).not.toContain('lock_in_months');
    // …while the R7 clauses that DO own the durations still carry them, untouched.
    expect(SEED).toContain('"lock_in_months":3');
    expect(SEED).toContain('"lock_in_months":5');
  });

  it('⚖ carries the RATIFIED concurrency rule as REGISTRY DATA, not a code constant (AC5)', () => {
    // Decision 2026-08-07-088 clause 1 ratified BOTH the `max_over_live` reading and its PLACEMENT:
    // it lives in this clause payload so the Panel can amend it as a governance act. A `Math.max` at
    // the fold with no clause backing does not satisfy AC5 even though it computes the same answer.
    const payload = seededPayloadJson('niy.restoration-discipline.policy');
    expect(payload).toContain('"concurrency_rule":"max_over_live"');
    expect(payload).toContain('"month_counting":"calendar_end_of_month_clamped"');
  });

  it('the seeded payload parses under the resolver schema', () => {
    const parsed = RestorationDisciplinePolicyPayloadSchema.safeParse(
      JSON.parse(seededPayloadJson('niy.restoration-discipline.policy')),
    );
    expect(parsed.success).toBe(true);
  });

  it('rejects a payload whose concurrency rule is not a declared one — no silent guessing', () => {
    expect(
      RestorationDisciplinePolicyPayloadSchema.safeParse({
        month_counting: 'calendar_end_of_month_clamped',
        concurrency_rule: 'min_over_live',
      }).success,
    ).toBe(false);
    // A missing rule is equally unusable: the caller treats `null` as "do not impose" (AC3).
    expect(
      RestorationDisciplinePolicyPayloadSchema.safeParse({
        month_counting: 'calendar_end_of_month_clamped',
      }).success,
    ).toBe(false);
  });
});
