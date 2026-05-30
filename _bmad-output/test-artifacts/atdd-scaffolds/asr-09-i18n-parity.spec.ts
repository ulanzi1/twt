/**
 * ASR-9 — Hindi/English i18n parity: every key present in BOTH `hi` and `en`;
 * no inline formatting outside `packages/i18n`.
 *
 * Target story: Story 2.1 (`packages/i18n` Centralized Utility + Bilingual
 *                          Surface Contract)
 * Target final location: packages/i18n/__tests__/parity.spec.ts
 *                       + apps/*/eslint config (inline-string lint)
 * Risks burned down: BUS-8 (Niyamavali parity drift), NFR-23 launch blocker
 *
 * RED-PHASE STATUS: test.skip(). No upstream blocker — can begin as soon as
 * `packages/i18n` is bootstrapped.
 *
 * Lane: PR (CI gate — sub-second).
 *
 * Execution:  pnpm vitest --grep "@P0 @Bilingual"
 */

import { describe, expect, test } from 'vitest';

// Imports do NOT exist yet — they land with Story 2.1.
// import en from '@twt/i18n/en.json';
// import hi from '@twt/i18n/hi.json';
// import { listInlineStringViolations } from '@twt/i18n/lint';

declare const en: Record<string, string>;
declare const hi: Record<string, string>;
declare function listInlineStringViolations(globs: string[]): Promise<
  Array<{ file: string; line: number; snippet: string }>
>;

describe('@P0 @Bilingual @I18n key parity across hi and en', () => {
  test.skip('every key in en exists in hi', () => {
    const enKeys = Object.keys(en).sort();
    const hiKeys = Object.keys(hi).sort();
    const missingInHi = enKeys.filter((k) => !(k in hi));
    expect(missingInHi, `keys missing in hi: ${missingInHi.join(', ')}`).toEqual([]);
  });

  test.skip('every key in hi exists in en', () => {
    const enKeys = Object.keys(en);
    const hiKeys = Object.keys(hi).sort();
    const missingInEn = hiKeys.filter((k) => !(k in en));
    expect(missingInEn, `keys missing in en: ${missingInEn.join(', ')}`).toEqual([]);
  });

  test.skip('no key has empty value in either locale', () => {
    for (const [k, v] of Object.entries(en)) {
      expect(v.trim().length, `en[${k}] is empty`).toBeGreaterThan(0);
    }
    for (const [k, v] of Object.entries(hi)) {
      expect(v.trim().length, `hi[${k}] is empty`).toBeGreaterThan(0);
    }
  });

  test.skip('interpolation placeholders match between locales', () => {
    // `{name}`, `{amount}` etc. — every placeholder must appear identically.
    const placeholderRegex = /\{(\w+)\}/g;
    for (const k of Object.keys(en)) {
      const enPh = new Set(en[k].match(placeholderRegex) ?? []);
      const hiPh = new Set(hi[k].match(placeholderRegex) ?? []);
      expect(enPh, `${k}: en placeholders ${[...enPh].join(',')} ≠ hi ${[...hiPh].join(',')}`).toEqual(hiPh);
    }
  });
});

describe('@P0 @Bilingual @I18n no inline formatting outside packages/i18n', () => {
  test.skip('repo-wide lint finds zero inline date/currency/number formatting outside utility', async () => {
    const violations = await listInlineStringViolations([
      'apps/**/*.{ts,tsx}',
      'packages/**/*.{ts,tsx}',
      '!packages/i18n/**',
      '!**/__tests__/**',
    ]);

    // Allowable callers: only `@twt/i18n/formatCurrency`, `formatDate`, etc.
    // Any inline `new Intl.NumberFormat(...)`, `'₹' + n`, `toLocaleString()`
    // outside the utility is a violation.
    expect(
      violations,
      `inline formatting violations:\n${violations.map((v) => `${v.file}:${v.line} → ${v.snippet}`).join('\n')}`,
    ).toEqual([]);
  });
});
