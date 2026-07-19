// Close-of-cycle framing policy — DB-free unit suite (Story 7.8, Task 5; AC3/AC4).
//
// Covers the PURE domain internals: selector exhaustiveness + the no-dangling-key invariant
// (every selector-returned key EXISTS in the real close-of-cycle.json, en + hi — the selector
// and catalog cannot drift), `classifyCycleOutcome` purity / equal-greater-less branches /
// input guards, and the STRUCTURAL Pool-Reality #2 property (the under_funded + partial
// framings select celebration keys, and no framing carries a target/shortfall param).
//
// The "no prohibited FRAME in the resolved COPY" assertion (AC2/AC10) lives in
// scripts/microcopy/close-of-cycle.test.ts — that is where `checkTone` + the real
// microcopy.yaml pattern live natively (same-package import). See the story's cross-package
// note: packages/domain cannot import across the non-workspace scripts/ boundary, and
// re-implementing the tone regex here would risk silent drift from the real gate pattern.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  CLOSE_OF_CYCLE_NAMESPACE,
  CLOSE_OF_CYCLE_REQUIRED_PARAMS,
  CLOSE_OF_CYCLE_TEMPLATE_KEYS,
  CYCLE_FUNDING_OUTCOMES,
  type CycleFundingOutcome,
  classifyCycleOutcome,
  selectCloseOfCycleFraming,
} from '../../src/close-of-cycle/index.js';

/** Read a real locale catalog off disk (the parity-enforced source of truth). */
function readCatalog(locale: 'en' | 'hi'): Record<string, string> {
  const p = fileURLToPath(
    new URL(`../../../i18n/locales/${locale}/close-of-cycle.json`, import.meta.url),
  );
  return JSON.parse(readFileSync(p, 'utf8')) as Record<string, string>;
}

// The frames the strengthened `microcopy` tone gate + tone-review forbid on EVERY branch
// (Pool-Reality #2). Used here only as a structural guard on the PARAM contract, not the copy.
const TARGET_QUARANTINE_FORBIDDEN_PARAMS = ['target', 'shortfall', 'expected', 'percent', 'goal'];

describe('selectCloseOfCycleFraming (AC3.9)', () => {
  it('returns a defined framing for every canonical outcome (exhaustive)', () => {
    for (const outcome of CYCLE_FUNDING_OUTCOMES) {
      const framing = selectCloseOfCycleFraming(outcome);
      expect(framing.outcome).toBe(outcome);
      expect(framing.namespace).toBe(CLOSE_OF_CYCLE_NAMESPACE);
      expect(framing.titleKey).toBe(CLOSE_OF_CYCLE_TEMPLATE_KEYS[outcome].titleKey);
      expect(framing.bodyKey).toBe(CLOSE_OF_CYCLE_TEMPLATE_KEYS[outcome].bodyKey);
      expect(framing.requiredParams).toEqual(CLOSE_OF_CYCLE_REQUIRED_PARAMS);
    }
  });

  it('is deterministic (same outcome → identical framing)', () => {
    for (const outcome of CYCLE_FUNDING_OUTCOMES) {
      expect(selectCloseOfCycleFraming(outcome)).toEqual(selectCloseOfCycleFraming(outcome));
    }
  });

  it('throws on an out-of-union outcome forced past the type system (runtime guard)', () => {
    expect(() => selectCloseOfCycleFraming('bankrupt' as CycleFundingOutcome)).toThrow(
      /unhandled cycle-funding outcome/,
    );
  });

  it('quarantines the target: no framing carries a target/shortfall/percentage param (AC4)', () => {
    for (const outcome of CYCLE_FUNDING_OUTCOMES) {
      const { requiredParams } = selectCloseOfCycleFraming(outcome);
      for (const forbidden of TARGET_QUARANTINE_FORBIDDEN_PARAMS) {
        expect(requiredParams.some((p) => p.toLowerCase().includes(forbidden))).toBe(false);
      }
    }
  });
});

describe('no dangling keys — every selector key exists in the real catalog (both locales)', () => {
  for (const locale of ['en', 'hi'] as const) {
    it(`${locale}/close-of-cycle.json defines every selector-returned key`, () => {
      const catalog = readCatalog(locale);
      for (const outcome of CYCLE_FUNDING_OUTCOMES) {
        const { titleKey, bodyKey } = selectCloseOfCycleFraming(outcome);
        expect(catalog[titleKey], `${locale}:${titleKey}`).toBeTruthy();
        expect(catalog[bodyKey], `${locale}:${bodyKey}`).toBeTruthy();
      }
    });
  }

  it('the catalog defines EXACTLY the selector keys (no extra / no missing) in both locales', () => {
    const selectorKeys = CYCLE_FUNDING_OUTCOMES.flatMap((o) => {
      const f = selectCloseOfCycleFraming(o);
      return [f.titleKey, f.bodyKey];
    }).sort();
    for (const locale of ['en', 'hi'] as const) {
      expect(Object.keys(readCatalog(locale)).sort()).toEqual(selectorKeys);
    }
  });
});

describe('classifyCycleOutcome (AC3.11 / D2 — target quarantine)', () => {
  it('delivered > expected → fully_funded (over-delivered still fully funded)', () => {
    expect(classifyCycleOutcome({ expectedTotal: 100, deliveredTotal: 140 })).toBe('fully_funded');
  });

  it('delivered === expected → fully_funded (met the expected amount)', () => {
    expect(classifyCycleOutcome({ expectedTotal: 100, deliveredTotal: 100 })).toBe('fully_funded');
  });

  it('delivered < expected → under_funded (the grief-correlated case)', () => {
    expect(classifyCycleOutcome({ expectedTotal: 100, deliveredTotal: 40 })).toBe('under_funded');
  });

  it('zero delivered against a positive expected → under_funded', () => {
    expect(classifyCycleOutcome({ expectedTotal: 100, deliveredTotal: 0 })).toBe('under_funded');
  });

  it('zero expected → fully_funded (nothing owed, nothing short — never a shortfall)', () => {
    expect(classifyCycleOutcome({ expectedTotal: 0, deliveredTotal: 0 })).toBe('fully_funded');
  });

  it('is deterministic (same totals → same enum)', () => {
    const input = { expectedTotal: 500, deliveredTotal: 300 };
    expect(classifyCycleOutcome(input)).toBe(classifyCycleOutcome(input));
  });

  it('returns ONLY an opaque enum, never a ratio/number (the target never escapes)', () => {
    const out = classifyCycleOutcome({ expectedTotal: 100, deliveredTotal: 37 });
    expect(CYCLE_FUNDING_OUTCOMES).toContain(out);
    expect(typeof out).toBe('string');
  });

  for (const bad of [
    { expectedTotal: Number.NaN, deliveredTotal: 100 },
    { expectedTotal: 100, deliveredTotal: Number.POSITIVE_INFINITY },
    { expectedTotal: -1, deliveredTotal: 100 },
    { expectedTotal: 100, deliveredTotal: -5 },
    { expectedTotal: 100.5, deliveredTotal: 100 },
    { expectedTotal: 100, deliveredTotal: 40.2 },
  ]) {
    it(`throws on invalid input ${JSON.stringify(bad)} rather than silently classifying`, () => {
      expect(() => classifyCycleOutcome(bad)).toThrow(/finite non-negative integers/);
    });
  }
});

describe('load-bearing invariant: an internal under-funded fact yields CELEBRATION keys (AC3.10)', () => {
  it('under-funded totals → classify → select resolves the under_funded celebration template, never a comparison', () => {
    // The reconciled fact: delivered LESS than expected (the shortfall is real, internal).
    const outcome = classifyCycleOutcome({ expectedTotal: 500_000, deliveredTotal: 320_000 });
    expect(outcome).toBe('under_funded');
    const framing = selectCloseOfCycleFraming(outcome);
    // The framing reaching the family is the under_funded family's keys — celebration, not a
    // shortfall/comparison frame (there is no comparison template in the shape to reach).
    expect(framing.titleKey).toBe('under_funded.title');
    expect(framing.bodyKey).toBe('under_funded.body');
    expect(framing.namespace).toBe(CLOSE_OF_CYCLE_NAMESPACE);
    // The target figures (500_000 / 320_000) are NOT in the param contract — quarantined.
    expect(framing.requiredParams).toEqual(['poolLabel', 'contributorCount', 'familyName', 'amount']);
  });
});
