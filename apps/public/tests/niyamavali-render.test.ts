// Unit tests for the pure Niyamavali render module (Story 2.5, Task 5).
//
// The `.astro` page is a thin wrapper (architecture component-test carve-out), so the
// display contract is proven HERE. Fixtures are minimal `clause_versions` rows — the
// render only reads clauseId / version / effectiveDate / payload / benefitMechanism.
import { detectNakedPii } from '@twt/contracts';
import type { schema } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import {
  renderDiff,
  renderNiyamavaliClauses,
} from '../src/lib/niyamavali-render.js';

/** Build a minimal clause-version row fixture (unused columns get inert defaults). */
function clause(partial: {
  clauseId: string;
  version: number;
  effectiveDate: Date;
  payload: Record<string, unknown>;
  benefitMechanism?: 'pool' | 'reserve';
  deprecatedAt?: Date | null;
}): schema.ClauseVersionRow {
  return {
    clauseVersionId: '00000000-0000-4000-8000-000000000000',
    pariwarId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    benefitMechanism: partial.benefitMechanism ?? 'pool',
    predecessorClauseIds: [],
    supersededByVersion: null,
    deprecatedAt: partial.deprecatedAt ?? null,
    authoredByActor: null,
    authoredAt: new Date('2025-01-01T00:00:00Z'),
    auditId: null,
    clauseId: partial.clauseId,
    version: partial.version,
    effectiveDate: partial.effectiveDate,
    payload: partial.payload,
  } as unknown as schema.ClauseVersionRow;
}

const R7 = clause({
  clauseId: 'niy.contribution-discipline.r7-a',
  version: 2,
  effectiveDate: new Date('2025-03-01T00:00:00Z'),
  payload: {
    rule_code: 'R7(A)',
    title_en: 'Restoration after contribution lapse',
    title_hi: 'अंशदान चूक के बाद पुनर्स्थापन',
    restoration_window_days: 30,
    provisional: true,
  },
});

const R8 = clause({
  clauseId: 'niy.ninety-percent-rule.r8',
  version: 1,
  effectiveDate: new Date('2025-01-01T00:00:00Z'),
  payload: { rule_code: 'R8', title_en: 'Ninety-percent contribution rule', threshold_percent: 90 },
});

describe('renderNiyamavaliClauses', () => {
  it('renders title Hindi-primary on the member surface, with rule_code + effective date', () => {
    const model = renderNiyamavaliClauses([R7], { locale: 'hi' });
    const [c] = model.clauses;
    expect(c?.title).toBe('अंशदान चूक के बाद पुनर्स्थापन');
    expect(c?.ruleCode).toBe('R7(A)');
    expect(c?.clauseId).toBe('niy.contribution-discipline.r7-a');
    expect(c?.version).toBe(2);
    expect(c?.effectiveDate).toBe('2025-03-01'); // Gregorian/Latin (amendment-A2)
    expect(c?.benefitMechanism).toBe('pool');
  });

  it('renders the English title for the en locale', () => {
    const model = renderNiyamavaliClauses([R7], { locale: 'en' });
    expect(model.clauses[0]?.title).toBe('Restoration after contribution lapse');
  });

  it('falls back to the clause_id handle when no title field exists', () => {
    const bare = clause({
      clauseId: 'niy.special-death.r9',
      version: 1,
      effectiveDate: new Date('2025-03-01T00:00:00Z'),
      payload: { provisional: true },
    });
    expect(renderNiyamavaliClauses([bare], { locale: 'hi' }).clauses[0]?.title).toBe(
      'niy.special-death.r9',
    );
  });

  it('is deterministic: sorts clauses by clause_id and generic fields by key', () => {
    const model = renderNiyamavaliClauses([R8, R7], { locale: 'en' });
    // R7 sorts before R8 by clause_id, regardless of input order.
    expect(model.clauses.map((c) => c.clauseId)).toEqual([
      'niy.contribution-discipline.r7-a',
      'niy.ninety-percent-rule.r8',
    ]);
    // Generic fields exclude title_*/rule_code and are sorted by key.
    expect(model.clauses[0]?.fields.map((f) => f.key)).toEqual([
      'provisional',
      'restoration_window_days',
    ]);
    expect(model.clauses[0]?.fields).toContainEqual({ key: 'restoration_window_days', value: '30' });
  });

  it('produces no naked PII in the rendered model (unit smoke — AC6a)', () => {
    const model = renderNiyamavaliClauses([R7, R8], { locale: 'hi' });
    expect(detectNakedPii(JSON.stringify(model))).toEqual([]);
  });
});

describe('renderDiff', () => {
  it('renders added/removed/changed buckets over two versions (structural only)', () => {
    const v1 = clause({
      clauseId: 'niy.contribution-discipline.r7-a',
      version: 1,
      effectiveDate: new Date('2025-01-01T00:00:00Z'),
      payload: { rule_code: 'R7(A)', window_days: 30, removed_field: 'x' },
    });
    const v2 = clause({
      clauseId: 'niy.contribution-discipline.r7-a',
      version: 2,
      effectiveDate: new Date('2025-03-01T00:00:00Z'),
      payload: { rule_code: 'R7(A)', window_days: 45, added_field: 'y' },
    });
    const diff = renderDiff(v1, v2);
    expect(diff.changed).toContainEqual({ key: 'window_days', from: '30', to: '45' });
    expect(diff.added).toContainEqual({ key: 'added_field', value: 'y' });
    expect(diff.removed).toContainEqual({ key: 'removed_field', value: 'x' });
  });
});
