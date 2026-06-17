// Unit tests for the @twt/tokens registry + the semantic CSS generator (Story 1.17,
// AC1/AC2). Asserts: token SHAPE (the required semantic aliases + exact UX-DR9 role
// names), the "no color-N slug" invariant (FM-14 #1), the FIRM admin status values
// (no subsumption regression), and that renderThemeCss is deterministic + emits no
// shadow variables (FM-3).

import { describe, expect, it } from 'vitest';

import { border, color, font, renderThemeCss, space } from '../src/index.js';

// Semantic-role naming: lowercase words joined by hyphens, NO digits anywhere
// (rejects `color-1`, `gray-100`, arbitrary indices). FM-14 #1.
const SEMANTIC_NAME = /^[a-z]+(-[a-z]+)*$/;

describe('color tokens (AC1 (i))', () => {
  it('exports the §8 semantic role aliases', () => {
    for (const name of [
      'ink-primary',
      'surface-base',
      'surface-accent',
      'rule-hairline',
      'rule-heavy',
      'stamp-mudra',
      'status-pending',
      'status-confirmed',
      'status-mismatch',
      'status-grey-takeover',
    ]) {
      expect(color, `missing semantic color alias ${name}`).toHaveProperty(name);
    }
  });

  it('exports the general aliases', () => {
    for (const name of ['bg', 'surface', 'text', 'accent', 'danger', 'success', 'warning']) {
      expect(color).toHaveProperty(name);
    }
  });

  it('preserves the FIRM admin status palette EXACTLY (no subsumption regression, §4.10)', () => {
    expect(color['status-ok-bg']).toBe('#e7f6ec');
    expect(color['status-ok-fg']).toBe('#0f5132');
    expect(color['status-ok-border']).toBe('#198754');
    expect(color['status-fail-bg']).toBe('#fdecec');
    expect(color['status-fail-fg']).toBe('#842029');
    expect(color['status-fail-border']).toBe('#dc3545');
    expect(color['status-muted-bg']).toBe('#f3f4f6');
    expect(color['status-muted-fg']).toBe('#374151');
  });

  it('every color name is a SEMANTIC role, never an arbitrary index (FM-14 #1)', () => {
    for (const name of Object.keys(color)) {
      expect(name, `non-semantic color token name: ${name}`).toMatch(SEMANTIC_NAME);
    }
  });

  it('every color value is a CSS color literal', () => {
    for (const value of Object.values(color)) {
      expect(value).toMatch(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/);
    }
  });
});

describe('typography tokens (AC1 (iii))', () => {
  it('exports EXACTLY the five UX-DR9 type-role names — no invented alternatives', () => {
    expect(Object.keys(font).sort()).toEqual(
      [
        'body-ledger',
        'caption-stamp',
        'display-name',
        'display-parichay',
        'numeric-tabular',
      ].sort(),
    );
  });

  it('maps each role to its canonical Devanagari face with a Latin pairing (FM-2)', () => {
    expect(font['display-name']).toContain('Tiro Devanagari Hindi');
    expect(font['display-parichay']).toContain('Tiro Devanagari Hindi');
    expect(font['body-ledger']).toContain('Noto Sans Devanagari');
    expect(font['caption-stamp']).toContain('Noto Sans Devanagari');
    expect(font['numeric-tabular']).toContain('IBM Plex Mono Devanagari');
    // Latin pairing present (a non-Devanagari fallback face after the canonical one).
    expect(font['display-name']).toContain('serif');
    expect(font['numeric-tabular']).toContain('monospace');
  });

  it('type-role names are semantic (FM-14 #1)', () => {
    for (const name of Object.keys(font)) expect(name).toMatch(SEMANTIC_NAME);
  });
});

describe('spacing tokens (AC1 (ii))', () => {
  it('exports EXACTLY the four UX-DR9 named spacing tokens (discrete named set)', () => {
    expect(Object.keys(space).sort()).toEqual(
      ['space-block', 'space-hairline', 'space-page-gutter', 'space-row'].sort(),
    );
  });

  it('the hairline primitive is the firm 1px', () => {
    expect(space['space-hairline']).toBe('1px');
  });

  it('spacing names are semantic (FM-14 #1)', () => {
    for (const name of Object.keys(space)) expect(name).toMatch(SEMANTIC_NAME);
  });
});

describe('border tokens (AC1 (iv))', () => {
  it('exports EXACTLY the four UX-DR9 border tokens', () => {
    expect(Object.keys(border).sort()).toEqual(
      ['border-double-rule', 'border-funeral-frame', 'border-hairline', 'border-rule'].sort(),
    );
  });

  it('declares NO shadow token (FM-3: separation is hairline-based)', () => {
    for (const name of Object.keys(border)) expect(name).not.toContain('shadow');
  });

  it('border names are semantic (FM-14 #1)', () => {
    for (const name of Object.keys(border)) expect(name).toMatch(SEMANTIC_NAME);
  });
});

describe('renderThemeCss (AC2)', () => {
  const css = renderThemeCss();

  it('emits a Tailwind v4 @theme block', () => {
    expect(css).toContain('@theme {');
    expect(css.trimEnd().endsWith('}')).toBe(true);
  });

  it('emits the FIRM admin status palette under the --color- namespace (admin utilities survive)', () => {
    expect(css).toContain('--color-status-ok-bg: #e7f6ec;');
    expect(css).toContain('--color-status-fail-fg: #842029;');
    expect(css).toContain('--color-status-muted-fg: #374151;');
  });

  it('emits faces under --font-, named spacing as --space-, borders as --border-', () => {
    expect(css).toContain('--font-display-name:');
    expect(css).toContain('--space-hairline: 1px;');
    expect(css).toContain('--border-funeral-frame:');
  });

  it('emits NO shadow variable / property (FM-3) — the explanatory comment aside', () => {
    // Assert the absence of an actual shadow declaration (`--…shadow…` custom prop
    // or a `box-shadow`), not the word "shadow" which legitimately appears in the
    // group's "NO shadows (FM-3)" rationale comment.
    expect(css).not.toMatch(/(?:--|box-)[a-z-]*shadow/i);
  });

  it('is deterministic — same source renders byte-identical output (FM-4)', () => {
    expect(renderThemeCss()).toBe(css);
  });
});
