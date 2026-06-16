// scripts/microcopy/lib.test.ts
//
// Fixture-driven unit tests for the microcopy gate's pure core (lib.ts). No fs / git —
// a DB-free, fs-free story. Run via `pnpm microcopy:test` (root package.json); the
// `microcopy` CI job runs these before `pnpm microcopy:check`. NOT discovered by
// `pnpm turbo run test` (scripts/microcopy/ is not a pnpm workspace).
//
// NOTE (self-green): the prohibited terms / Devanagari digits / color literals below
// are in-test fixtures BY DESIGN — this is exactly why scripts/microcopy/** is excluded
// from the gate's scan scope. They prove the engine's teeth; they are not member copy.

import { describe, expect, it } from 'vitest';

import {
  type MicrocopyConfig,
  checkMagicNumberColors,
  checkNumerals,
  checkTone,
  checkVocabulary,
  formatFinding,
  isAllowed,
  parseMicrocopyConfig,
} from './lib.js';

const SAMPLE_YAML = `
version: 1
vocabulary:
  - term: passbook
    canonical: Yogdaan Bahi
  - term: receipt
    canonical: Contribution Note
  - term: report
    canonical: Sahyog Vivran
  - term: user
    canonical: colleague
    member_only: true
  - term: Late Teacher
    canonical: Deceased Member
    member_only: true
  - term: invoice
    canonical: Contribution Note (Yogdaan Pratigya)
  - term: customer
    canonical: colleague
    member_only: true
  - term: donor
    canonical: colleague
    member_only: true
tone:
  - label: scarcity
    pattern: 'only\\s+\\d+\\s+days?\\s+left'
  - label: panic
    pattern: '\\bURGENT\\b'
  - label: pool-reality-comparison
    pattern: 'fell\\s+short|target\\s+missed'
numerals:
  flag_devanagari_digits: true
  flag_inline_locale_formatting: true
  ceremonial_globs: []
magic_number:
  flag_color_literals: true
scope:
  code_globs:
    - apps/admin/src/**/*.tsx
  copy_globs: []
allow:
  - file: apps/admin/src/modules/pariwar-provisioning/AddPariwarForm.tsx
    pattern: 'primary_color|secondary_color|accent_color'
    reason: Pariwar brand-color form data, not styling.
  - pattern: 'passbook[ -]row'
    reason: Internal CSS pattern name.
  - pattern: '\\(passbook\\)'
    reason: Documentation gloss.
`;

const config: MicrocopyConfig = parseMicrocopyConfig(SAMPLE_YAML);

// ─── parseMicrocopyConfig ────────────────────────────────────────────────────

describe('parseMicrocopyConfig', () => {
  it('parses a valid config into a typed shape', () => {
    expect(config.version).toBe(1);
    expect(config.vocabulary).toHaveLength(8);
    expect(config.vocabulary[0]).toEqual({
      term: 'passbook',
      canonical: 'Yogdaan Bahi',
      memberOnly: false,
    });
    expect(config.vocabulary[3]).toEqual({
      term: 'user',
      canonical: 'colleague',
      memberOnly: true,
    });
    expect(config.tone).toHaveLength(3);
    expect(config.numerals.flagDevanagariDigits).toBe(true);
    expect(config.flagColorLiterals).toBe(true);
    expect(config.scope.codeGlobs).toEqual(['apps/admin/src/**/*.tsx']);
    expect(config.scope.copyGlobs).toEqual([]);
    expect(config.allow).toHaveLength(3);
  });

  it('throws on an unknown top-level key (strict parsing)', () => {
    expect(() => parseMicrocopyConfig(SAMPLE_YAML + '\nmagic_numbr: typo')).toThrow(
      /unknown key 'magic_numbr'/,
    );
  });

  it('throws when version is non-numeric', () => {
    expect(() =>
      parseMicrocopyConfig(
        'version: one\nvocabulary: []\ntone: []\nnumerals: {flag_devanagari_digits: true, flag_inline_locale_formatting: true}\nmagic_number: {flag_color_literals: true}\nscope: {}',
      ),
    ).toThrow(/`version` must be a number/);
  });

  it('throws when a vocabulary entry is missing its canonical', () => {
    expect(() =>
      parseMicrocopyConfig(
        'version: 1\nvocabulary:\n  - term: passbook\ntone: []\nnumerals: {flag_devanagari_digits: true, flag_inline_locale_formatting: true}\nmagic_number: {flag_color_literals: true}\nscope: {}',
      ),
    ).toThrow(/vocabulary\[0\].canonical must be a non-empty string/);
  });

  it('throws on an unknown key inside a vocabulary entry', () => {
    expect(() =>
      parseMicrocopyConfig(
        'version: 1\nvocabulary:\n  - term: passbook\n    canonical: Yogdaan Bahi\n    membr_only: true\ntone: []\nnumerals: {flag_devanagari_digits: true, flag_inline_locale_formatting: true}\nmagic_number: {flag_color_literals: true}\nscope: {}',
      ),
    ).toThrow(/unknown key 'membr_only' in vocabulary\[0\]/);
  });

  it('throws on an invalid tone regex', () => {
    expect(() =>
      parseMicrocopyConfig(
        'version: 1\nvocabulary: []\ntone:\n  - label: bad\n    pattern: "([unclosed"\nnumerals: {flag_devanagari_digits: true, flag_inline_locale_formatting: true}\nmagic_number: {flag_color_literals: true}\nscope: {}',
      ),
    ).toThrow(/tone\[0\].pattern is not a valid regex/);
  });

  it('throws when numerals.flag_devanagari_digits is not a boolean', () => {
    expect(() =>
      parseMicrocopyConfig(
        'version: 1\nvocabulary: []\ntone: []\nnumerals: {flag_devanagari_digits: yep, flag_inline_locale_formatting: true}\nmagic_number: {flag_color_literals: true}\nscope: {}',
      ),
    ).toThrow(/numerals.flag_devanagari_digits` must be a boolean/);
  });
});

// ─── check (c): checkVocabulary ──────────────────────────────────────────────

describe('checkVocabulary (c)', () => {
  it('flags a prohibited noun, naming file+line+canonical', () => {
    const findings = checkVocabulary('apps/admin/src/x.tsx', 'Print the receipt now', config, {
      includeMemberOnly: false,
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      kind: 'vocabulary',
      file: 'apps/admin/src/x.tsx',
      line: 1,
      match: 'receipt',
    });
    expect(findings[0].replacement).toMatch(/Contribution Note/);
  });

  it('reports the correct line number for a multi-line file', () => {
    const text = 'line one\nline two\nopen the passbook here';
    const findings = checkVocabulary('f.tsx', text, config, { includeMemberOnly: false });
    expect(findings).toHaveLength(1);
    expect(findings[0].line).toBe(3);
    expect(findings[0].replacement).toMatch(/Yogdaan Bahi/);
  });

  it('matches whole words only — does NOT flag a substring (reportError)', () => {
    expect(
      checkVocabulary('f.tsx', 'const reportError = 1;', config, { includeMemberOnly: false }),
    ).toEqual([]);
  });

  it('EXCLUDES member_only terms (user) when includeMemberOnly is false (code scope)', () => {
    expect(
      checkVocabulary('f.tsx', 'the user clicked', config, { includeMemberOnly: false }),
    ).toEqual([]);
  });

  it('INCLUDES member_only terms (user, Late Teacher) when includeMemberOnly is true (copy scope)', () => {
    const findings = checkVocabulary('locale.json', 'Dear user, the Late Teacher', config, {
      includeMemberOnly: true,
    });
    expect(findings.map((f) => f.match).sort()).toEqual(['Late Teacher', 'user'].sort());
  });

  it('allow-lists the internal "passbook row" CSS pattern name (false-positive guard)', () => {
    expect(
      checkVocabulary('f.tsx', 'className="passbook-row border"', config, {
        includeMemberOnly: false,
      }),
    ).toEqual([]);
  });

  it('allow-lists the "Yogdaan Bahi (passbook)" documentation gloss', () => {
    expect(
      checkVocabulary('f.tsx', 'the Yogdaan Bahi (passbook) shows entries', config, {
        includeMemberOnly: false,
      }),
    ).toEqual([]);
  });

  it('STILL flags a real prohibited use of passbook (allow-list is not blanket)', () => {
    const findings = checkVocabulary('f.tsx', 'open your passbook to pay', config, {
      includeMemberOnly: false,
    });
    expect(findings).toHaveLength(1);
    expect(findings[0].match).toBe('passbook');
  });

  it('does NOT suppress an unrelated prohibited term on the same line as an allow-listed pattern (P1 regression)', () => {
    // "passbook-row" allow-list suppresses the passbook match (positional overlap),
    // but "receipt" elsewhere on the same line must still be flagged.
    const findings = checkVocabulary(
      'f.tsx',
      'className="passbook-row" — download your receipt here',
      config,
      { includeMemberOnly: false },
    );
    expect(findings).toHaveLength(1);
    expect(findings[0].match).toBe('receipt');
  });

  it('flags "invoice" as a prohibited term, requiring Contribution Note', () => {
    const findings = checkVocabulary('f.tsx', 'Please download your invoice', config, {
      includeMemberOnly: false,
    });
    expect(findings).toHaveLength(1);
    expect(findings[0].match).toBe('invoice');
    expect(findings[0].replacement).toMatch(/Contribution Note/);
  });

  it('flags "customer" and "donor" as member-only prohibited terms in copy scope', () => {
    const findings = checkVocabulary(
      'locale.json',
      'Dear customer, thank you dear donor',
      config,
      { includeMemberOnly: true },
    );
    expect(findings.map((f) => f.match).sort()).toEqual(['customer', 'donor'].sort());
    findings.forEach((f) => expect(f.replacement).toMatch(/colleague/));
  });

  it('EXCLUDES customer and donor in code scope (member_only: true)', () => {
    expect(
      checkVocabulary('f.tsx', 'const customer = await getCustomer()', config, {
        includeMemberOnly: false,
      }),
    ).toEqual([]);
  });
});

// ─── tone ────────────────────────────────────────────────────────────────────

describe('checkTone', () => {
  it('flags scarcity framing', () => {
    const findings = checkTone('f.tsx', 'Hurry — only 2 days left!', config);
    expect(findings).toHaveLength(1);
    expect(findings[0].kind).toBe('tone');
    expect(findings[0].replacement).toMatch(/scarcity/);
  });

  it('flags panic framing (URGENT)', () => {
    expect(checkTone('f.tsx', 'URGENT: act now', config)[0].replacement).toMatch(/panic/);
  });

  it('flags Pool-Reality comparison-to-target framing', () => {
    expect(checkTone('f.tsx', 'we fell short of the goal', config)[0].replacement).toMatch(
      /comparison/,
    );
  });

  it('does NOT flag neutral copy', () => {
    expect(checkTone('f.tsx', 'Your contribution has been recorded.', config)).toEqual([]);
  });
});

// ─── check (d): checkNumerals ─────────────────────────────────────────────────

describe('checkNumerals (d)', () => {
  it('flags Devanagari digits on an operational surface, advising Latin', () => {
    const findings = checkNumerals('f.tsx', 'Amount: ४५८८', config, { isCeremonial: false });
    expect(findings).toHaveLength(1);
    expect(findings[0].kind).toBe('numeral');
    expect(findings[0].match).toBe('४५८८');
    expect(findings[0].replacement).toMatch(/Latin numerals/);
  });

  it('does NOT flag Latin numerals on an operational surface', () => {
    expect(
      checkNumerals('f.tsx', 'Amount: 4588 on 2026-06-16', config, { isCeremonial: false }),
    ).toEqual([]);
  });

  it('does NOT flag Devanagari digits on a ceremonial (Shradhanjali) surface', () => {
    expect(
      checkNumerals('shradhanjali.tsx', '३४ वर्षों की सेवा', config, { isCeremonial: true }),
    ).toEqual([]);
  });

  it('flags inline Hindi locale formatting (must route through packages/i18n)', () => {
    const findings = checkNumerals('f.tsx', "n.toLocaleString('hi-IN')", config, {
      isCeremonial: false,
    });
    expect(findings).toHaveLength(1);
    expect(findings[0].replacement).toMatch(/packages\/i18n/);
  });

  it('flags an explicit Devanagari numberingSystem option', () => {
    const findings = checkNumerals(
      'f.tsx',
      "new Intl.NumberFormat('en', { numberingSystem: 'deva' })",
      config,
      {
        isCeremonial: false,
      },
    );
    expect(findings.some((f) => f.replacement.includes('packages/i18n'))).toBe(true);
  });

  it('still flags inline formatting even on a ceremonial surface (only digits are exempt there)', () => {
    expect(
      checkNumerals('shradhanjali.tsx', "x.toLocaleString('hi')", config, { isCeremonial: true }),
    ).toHaveLength(1);
  });
});

// ─── check (b): checkMagicNumberColors ────────────────────────────────────────

describe('checkMagicNumberColors (b / FM-14 #2)', () => {
  it('flags a hex color literal in component code', () => {
    const findings = checkMagicNumberColors('apps/admin/src/x.tsx', "color: '#ff0000'", config);
    expect(findings).toHaveLength(1);
    expect(findings[0].kind).toBe('magic-number');
    expect(findings[0].match).toBe('#ff0000');
    expect(findings[0].replacement).toMatch(/@twt\/tokens/);
  });

  it('flags an rgb()/rgba() functional color', () => {
    expect(checkMagicNumberColors('f.tsx', 'background: rgba(0,0,0,0.5)', config)).toHaveLength(1);
  });

  it('does NOT flag a Tailwind arbitrary-value spacing utility (px is not a color)', () => {
    expect(checkMagicNumberColors('f.tsx', 'className="min-h-[65px] w-[28rem]"', config)).toEqual(
      [],
    );
  });

  it('does NOT flag a non-color "#" (anchor / fragment with non-hex chars)', () => {
    // "#section-overview" contains non-hex chars — no match. Note: an all-hex anchor
    // like href="#abcdef" WOULD be flagged (indistinguishable from a hex color literal);
    // add an allow-list entry in microcopy.yaml if such an anchor exists in scope.
    expect(checkMagicNumberColors('f.tsx', 'href="#section-overview"', config)).toEqual([]);
  });

  it('does NOT flag a method call ending in rgba/hsl (e.g. color.rgba(…)) (P3)', () => {
    // (?<!\.) lookbehind excludes "color.rgba(" — a utility call, not a color literal.
    expect(
      checkMagicNumberColors('f.tsx', 'const c = color.rgba(255, 0, 0, 0.5)', config),
    ).toEqual([]);
  });

  it('allow-lists Pariwar brand-color form data (file-scoped)', () => {
    const line = "primary_color: '#0A3D62',";
    const file = 'apps/admin/src/modules/pariwar-provisioning/AddPariwarForm.tsx';
    expect(checkMagicNumberColors(file, line, config)).toEqual([]);
    // but the SAME literal in a different file is still flagged.
    expect(
      checkMagicNumberColors('apps/admin/src/other.tsx', "x = '#0A3D62'", config),
    ).toHaveLength(1);
  });

  it('allow-lists accent_color form data in the file-scoped entry (P7)', () => {
    const file = 'apps/admin/src/modules/pariwar-provisioning/AddPariwarForm.tsx';
    expect(checkMagicNumberColors(file, "accent_color: '#3C1F8D',", config)).toEqual([]);
  });

  it('no-ops when flag_color_literals is false', () => {
    const off = parseMicrocopyConfig(
      SAMPLE_YAML.replace('flag_color_literals: true', 'flag_color_literals: false'),
    );
    expect(checkMagicNumberColors('f.tsx', "color: '#ff0000'", off)).toEqual([]);
  });
});

// ─── isAllowed + formatFinding ────────────────────────────────────────────────

describe('isAllowed', () => {
  it('matches a pattern-only allow entry on any file', () => {
    expect(isAllowed('any/file.tsx', 'the passbook row pattern', config)).toBe(true);
  });

  it('honors a file-scoped allow entry only on the named file', () => {
    const file = 'apps/admin/src/modules/pariwar-provisioning/AddPariwarForm.tsx';
    expect(isAllowed(file, "primary_color: '#0A3D62'", config)).toBe(true);
    expect(isAllowed('apps/admin/src/x.tsx', "primary_color: '#0A3D62'", config)).toBe(false);
  });
});

describe('formatFinding', () => {
  it('renders kind + file:line + match + replacement', () => {
    expect(
      formatFinding({
        kind: 'vocabulary',
        file: 'a.tsx',
        line: 7,
        match: 'receipt',
        replacement: 'use "Contribution Note"',
      }),
    ).toBe('[vocabulary] a.tsx:7 — "receipt" → use "Contribution Note"');
  });
});
