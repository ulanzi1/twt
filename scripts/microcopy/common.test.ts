// scripts/microcopy/common.test.ts
//
// Story 8.11 — TEETH for the `common` namespace's newly-scanned member copy, proven against the REAL
// config. Story 8.11 is the FIRST story to land real member-facing copy in `common.json` (the
// cross-cutting <CallHelplineCTA> default label `call_helpline.label`) and to add `common.json` to
// microcopy.yaml's `scope.copy_globs`. Per [[feedback_gate_scope_semantic_coverage]], a green
// `microcopy:check` over a file the gate never read before proves nothing — so this file loads the
// ACTUAL microcopy.yaml + the ACTUAL common.json locale files off disk, runs the real `checkTone`,
// and proves the gate BITES with planted violations + revert-sanity.
//
// Like out-of-band.test.ts / close-of-cycle.test.ts (and unlike lib.test.ts, which unit-tests the
// pure engine against an INLINE SAMPLE_YAML), this file exercises the real committed config.
//
// SELF-GREEN: this file lives under scripts/microcopy/**, which is excluded from the gate's own scan
// scope — the prohibited phrases below are fixtures, never member copy.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { type MicrocopyConfig, checkTone, parseMicrocopyConfig } from './lib.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const readRepo = (rel: string): string => readFileSync(path.join(repoRoot, rel), 'utf8');

/** The REAL, committed gate config — the rules under test. */
const config: MicrocopyConfig = parseMicrocopyConfig(readRepo('microcopy.yaml'));

const EN_COMMON = 'packages/i18n/locales/en/common.json';
const HI_COMMON = 'packages/i18n/locales/hi/common.json';

/** Resolve the real locale strings (values only) — the copy a consumer surface renders. */
function resolvedStrings(rel: string): string[] {
  return Object.values(JSON.parse(readRepo(rel)) as Record<string, string>);
}

// ─── (a) common.json IS in copy_globs (the scope actually grew — not a vacuous scan) ─────────────

describe('common.json is a scanned copy surface (Story 8.11 added it)', () => {
  it('both locale files appear in scope.copy_globs', () => {
    expect(config.scope.copyGlobs, 'en/common.json must be scanned').toContain(EN_COMMON);
    expect(config.scope.copyGlobs, 'hi/common.json must be scanned').toContain(HI_COMMON);
  });
});

// ─── (b) the real committed common.json copy is clean in BOTH locales (the load-bearing invariant) ─

describe('the real common namespace carries no prohibited frame', () => {
  for (const [label, file] of [
    ['en common', EN_COMMON],
    ['hi common', HI_COMMON],
  ] as const) {
    it(`checkTone over every ${label} string returns empty`, () => {
      for (const s of resolvedStrings(file)) {
        expect(checkTone(file, s, config), `prohibited frame in ${label}: "${s}"`).toEqual([]);
      }
    });
  }

  it('the new call_helpline.label key EXISTS and reads clean in both locales (non-vacuous)', () => {
    const en = JSON.parse(readRepo(EN_COMMON)) as Record<string, string>;
    const hi = JSON.parse(readRepo(HI_COMMON)) as Record<string, string>;
    // The key must exist — an absent key would make the clean-scan assertions vacuously green.
    expect(en['call_helpline.label'], 'en call_helpline.label').toBeTypeOf('string');
    expect(hi['call_helpline.label'], 'hi call_helpline.label').toBeTypeOf('string');
    expect(checkTone(EN_COMMON, en['call_helpline.label'], config), 'en call_helpline.label').toEqual([]);
    expect(checkTone(HI_COMMON, hi['call_helpline.label'], config), 'hi call_helpline.label').toEqual([]);
  });
});

// ─── (c) planted violations bite — the gate is LIVE over common.json (revert-sanity, in-test) ────
//
// These strings are what a naïve author might write for a helpline fallback under pressure to drive
// action ("call now or lose your spot"). Each trips a real tone rule; the assertions confirm the gate
// fires on them THROUGH common.json's scope. If a future edit silently dropped common.json from
// copy_globs, section (b)'s scan would still pass but the affordance's register would go ungoverned —
// so these plants + section (a) together keep the coverage honest.

describe('planted violations on common copy bite (the scope has teeth)', () => {
  const planted: Array<[string, string, string]> = [
    ['scarcity — only N days left', EN_COMMON, 'Call us now — only 2 days left to keep your place.'],
    ['panic — URGENT', EN_COMMON, 'URGENT: call the helpline immediately.'],
    ['out-of-band-blame — outside the app', EN_COMMON, 'If you paid outside the app, call us.'],
    ['out-of-band-blame hi — सिस्टम के बाहर', HI_COMMON, 'अगर आपने सिस्टम के बाहर भुगतान किया है तो कॉल करें।'],
  ];

  for (const [label, file, line] of planted) {
    it(`flags "${label}"`, () => {
      const findings = checkTone(file, line, config);
      expect(findings.length, `expected a tone finding on: ${line}`).toBeGreaterThan(0);
    });
  }

  it('the shipped call_helpline.label copy does NOT trip those rules (no over-reach)', () => {
    // The real, warm-neighbour affordance copy stays usable — the plants above fail for their frame,
    // not merely for containing "call".
    expect(checkTone(EN_COMMON, "Call us — we'll help", config)).toEqual([]);
    expect(checkTone(HI_COMMON, 'सहायता के लिए कॉल करें', config)).toEqual([]);
  });
});
