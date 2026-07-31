// Reports registry — unknown-type fail-closed + duplicate guard (Story 10.7, AC1/AC6).

import { describe, expect, it } from 'vitest';

import {
  DuplicateReportTemplateError,
  createDefaultReportRegistry,
  createReportRegistry,
} from '../../src/reports/index.js';
import { fixtureAlpha, fixtureBeta } from './fixtures.js';

describe('createReportRegistry', () => {
  it('resolves a registered template and returns undefined for an unknown type (fail-closed)', () => {
    const registry = createReportRegistry([fixtureAlpha, fixtureBeta]);
    expect(registry.get('fixture_alpha')?.reportType).toBe('fixture_alpha');
    expect(registry.get('fixture_beta')?.reportType).toBe('fixture_beta');
    expect(registry.get('nope')).toBeUndefined();
  });

  it('reportTypes() lists every registered id', () => {
    const registry = createReportRegistry([fixtureAlpha, fixtureBeta]);
    expect(registry.reportTypes().sort()).toEqual(['fixture_alpha', 'fixture_beta']);
  });

  it('throws DuplicateReportTemplateError on a second registration of the same reportType', () => {
    const registry = createReportRegistry([fixtureAlpha]);
    expect(() => registry.register(fixtureAlpha)).toThrow(DuplicateReportTemplateError);
    // Seeding with a duplicate array also fails loudly.
    expect(() => createReportRegistry([fixtureAlpha, fixtureAlpha])).toThrow(
      DuplicateReportTemplateError,
    );
  });
});

describe('createDefaultReportRegistry — the v1 seed set', () => {
  it('ships the three representative templates (Decision 1: NOT all ~10 FR-58A reports)', () => {
    const registry = createDefaultReportRegistry();
    expect(registry.reportTypes().sort()).toEqual([
      'audit_log_query',
      'contribution_rate_by_district',
      'member_roster',
    ]);
  });
});
