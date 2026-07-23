// scripts/microcopy/contribution-note.test.ts
//
// Story 8.7 — TEETH over the Yogdaan Pratigya (Contribution Note) artifact, proven against the REAL
// config. Mirrors contribution.test.ts (8.2) and close-of-cycle.test.ts (7.8): it loads the ACTUAL
// microcopy.yaml + the ACTUAL template/resolver/locale files off disk and runs the real checks over
// them.
//
// The deliverable is NOT "a green scan". Story 8.7 EXTENDED `scope.code_globs` to cover the Note's
// template + resolver — the first non-admin files in that scope — and a green scan over newly-scanned
// files proves nothing on its own ([[feedback_gate_scope_semantic_coverage]]). What must be shown is
// that ≥1 invariant has MEANINGFUL semantic coverage of the new surface. So this file proves:
//
//   (a) the vocabulary register BITES a planted transactional noun in a Note-template-shaped fixture —
//       the specific failure the artifact's whole identity depends on preventing (FR-33: the document
//       is a Contribution Note, never a transactional instrument, and the prohibition binds the
//       document title, the filename and the Content-Disposition, not only the visible copy);
//   (b) the FM-14 #2 colour check BITES a planted hex literal in the template's CSS — the second
//       invariant with real semantic coverage here, and one that already caught two live findings when
//       the scope was extended (the branding defaults, fixed to `@twt/tokens` roles rather than
//       allow-listed);
//   (c) the REAL authored template + resolver + `note.*` copy are clean under every check.
//
// REVERT-SANITY (recorded in the Dev Agent Record): with the two `code_globs` entries removed, the
// planted violation in the real template file goes UNFLAGGED by `pnpm microcopy:check` — which is what
// makes the scope extension load-bearing rather than decorative.
//
// SELF-GREEN: this file lives under scripts/microcopy/**, excluded from the gate's own scan scope —
// the planted prohibited terms below are fixtures, never member copy.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  type MicrocopyConfig,
  checkMagicNumberColors,
  checkNumerals,
  checkTone,
  checkVocabulary,
  parseMicrocopyConfig,
} from './lib.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const readRepo = (rel: string): string => readFileSync(path.join(repoRoot, rel), 'utf8');

/** The REAL, committed gate config. */
const config: MicrocopyConfig = parseMicrocopyConfig(readRepo('microcopy.yaml'));

const TEMPLATE_FILE = 'apps/api/src/modules/member-pool/note-template.ts';
const RESOLVER_FILE = 'apps/api/src/modules/member-pool/contribution-note.ts';
const EN_FILE = 'packages/i18n/locales/en/contribution.json';
const HI_FILE = 'packages/i18n/locales/hi/contribution.json';

/** The code files Story 8.7 added to `scope.code_globs`. */
const SCANNED_CODE_FILES = [TEMPLATE_FILE, RESOLVER_FILE] as const;

/** Only the `note.*` keys — the copy this story authored. */
function noteStrings(rel: string): Array<[string, string]> {
  const all = JSON.parse(readRepo(rel)) as Record<string, string>;
  return Object.entries(all).filter(([key]) => key.startsWith('note.'));
}

// ─── (0) the scope extension is REAL — the files are actually in the config ───────────────

describe('the scope extension exists in the committed config (not just in this test)', () => {
  it('microcopy.yaml code_globs names the Note template AND its resolver', () => {
    const raw = readRepo('microcopy.yaml');
    for (const file of SCANNED_CODE_FILES) {
      expect(raw, `${file} must be in scope.code_globs`).toContain(file);
    }
  });
});

// ─── (a) the vocabulary register BITES a planted transactional noun on this surface ───────

describe('vocabulary — a transactional noun planted in the Note template is FLAGGED (AC1 teeth)', () => {
  const planted: Array<[string, string]> = [
    ['a document title', `<title>${'Contribution Receipt'}</title>`],
    ['a heading', `<h1>Payment receipt for your contribution</h1>`],
    ['a filename helper', `return \`contribution-invoice-\${id}.pdf\`;`],
    ['a Content-Disposition', `'content-disposition', 'attachment; filename="receipt.pdf"'`],
    ['a label constant', `const TITLE = 'Contribution Invoice';`],
  ];
  for (const [label, line] of planted) {
    it(`flags ${label}`, () => {
      const findings = checkVocabulary(TEMPLATE_FILE, line, config, { includeMemberOnly: false });
      expect(findings.length, `"${line}" must be flagged`).toBeGreaterThan(0);
      expect(findings[0].kind).toBe('vocabulary');
      expect(findings[0].replacement).toContain('Contribution Note (Yogdaan Pratigya)');
    });
  }

  it('the CANONICAL name itself passes — the rule replaces a term, it does not ban naming the artifact', () => {
    const clean = `<h1>Yogdaan Pratigya — Contribution Note</h1>`;
    expect(checkVocabulary(TEMPLATE_FILE, clean, config, { includeMemberOnly: false })).toEqual([]);
  });
});

// ─── (b) the FM-14 #2 colour check BITES a planted literal in the template's CSS ──────────

describe('FM-14 #2 — a hardcoded colour planted in the Note stylesheet is FLAGGED', () => {
  it('flags a hex literal in the sheet CSS (the template must use @twt/tokens roles)', () => {
    const dirty = `  .status-title { color: #a23b2e; }`;
    const findings = checkMagicNumberColors(TEMPLATE_FILE, dirty, config);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].kind).toBe('magic-number');
  });

  it('flags an rgba() literal too', () => {
    expect(checkMagicNumberColors(TEMPLATE_FILE, `  .watermark { color: rgba(0,0,0,0.06); }`, config).length).toBeGreaterThan(0);
  });

  it('the token-sourced form passes', () => {
    const clean = "  .status-title { color: ${color['stamp-mudra']}; }";
    expect(checkMagicNumberColors(TEMPLATE_FILE, clean, config)).toEqual([]);
  });
});

// ─── (c) the REAL authored artifact + copy are clean under every check ────────────────────

describe('the REAL Note template + resolver carry no prohibited term, frame, digit or colour literal', () => {
  for (const file of SCANNED_CODE_FILES) {
    const source = readRepo(file);
    it(`checkVocabulary over ${path.basename(file)} returns empty`, () => {
      expect(checkVocabulary(file, source, config, { includeMemberOnly: false })).toEqual([]);
    });
    it(`checkMagicNumberColors over ${path.basename(file)} returns empty`, () => {
      expect(checkMagicNumberColors(file, source, config)).toEqual([]);
    });
    it(`checkNumerals over ${path.basename(file)} returns empty (Latin operational numerals)`, () => {
      expect(checkNumerals(file, source, config, { isCeremonial: false })).toEqual([]);
    });
    it(`checkTone over ${path.basename(file)} returns empty`, () => {
      expect(checkTone(file, source, config)).toEqual([]);
    });
  }
});

describe('AC1/AC6 — the authored note.* copy is clean in BOTH locales', () => {
  for (const [locale, file] of [
    ['en', EN_FILE],
    ['hi', HI_FILE],
  ] as const) {
    it(`no prohibited transactional term in any ${locale} note.* string`, () => {
      for (const [key, value] of noteStrings(file)) {
        expect(
          checkVocabulary(file, value, config, { includeMemberOnly: false }),
          `prohibited term in ${locale}/${key}: "${value}"`,
        ).toEqual([]);
      }
    });
    it(`no pressure/comparison frame in any ${locale} note.* string`, () => {
      for (const [key, value] of noteStrings(file)) {
        expect(checkTone(file, value, config), `prohibited frame in ${locale}/${key}`).toEqual([]);
      }
    });
    it(`no Devanagari operational digit in any ${locale} note.* string (amendment A2)`, () => {
      for (const [key, value] of noteStrings(file)) {
        expect(
          checkNumerals(file, value, config, { isCeremonial: false }),
          `Devanagari digit in ${locale}/${key}`,
        ).toEqual([]);
      }
    });
  }

  it('the copy actually exists in both locales (a vacuously-empty key set would pass every check above)', () => {
    // The trap this guards: if `note.*` were mis-prefixed, every loop above would iterate zero strings
    // and report green. Assert the corpus is real before trusting its cleanliness.
    expect(noteStrings(EN_FILE).length).toBeGreaterThan(25);
    expect(noteStrings(HI_FILE).length).toEqual(noteStrings(EN_FILE).length);
  });
});
