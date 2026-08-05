// scripts/microcopy/moderation-advice.test.ts
//
// Story 10.11 — TEETH for the `moderation-advice` tone rule, proven against the REAL config.
//
// Like fursat.test.ts / out-of-band.test.ts (and unlike lib.test.ts, which unit-tests the pure engine
// against an INLINE SAMPLE_YAML), this file loads the ACTUAL microcopy.yaml + the ACTUAL Trustee-Lite
// module files off disk and runs the real `checkTone` over them.
//
// ── What must be proven, and why a green run is not it ─────────────────────────────────────────
// `apps/admin/src/**/*.{ts,tsx}` was ALREADY in `scope.code_globs`, so Story 10.11 added no new scan
// surface — it added a new RULE over an existing one. Either way the deliverable is the same: ≥1
// invariant with MEANINGFUL semantic coverage of the governance property, demonstrated by a violation
// that FIRES ([[feedback_gate_scope_semantic_coverage]] — a green scan proves nothing on its own).
//
// So this file proves four things:
//   (a) the rule BITES each prohibited advice frame `epics.md:3582-3587` names, planted in
//       Trustee-Lite-shaped fixtures — the specific failure the detection-only invariant depends on
//       preventing;
//   (b) the recorded NARROWINGS hold, so the rule does not over-reach onto legitimate shipped copy
//       (the Story 9.1 nominee-console reassurance is the real finding that forced one of them);
//   (c) the REAL authored Trustee-Lite module (copy + shell + cross-links + the API/domain surfaces
//       that carry its prose) is clean under the rule;
//   (d) the rule ACTUALLY EXISTS in the committed config — so (a) cannot pass against a rule that
//       lives only in this test's imagination.
//
// REVERT-SANITY (recorded in the Dev Agent Record): delete the `moderation-advice` entry from
// microcopy.yaml and every planted fixture in (a) goes UNFLAGGED while `pnpm microcopy:check` stays
// green — which is what makes the rule load-bearing rather than decorative.
//
// SELF-GREEN: this file lives under scripts/microcopy/**, excluded from the gate's own scan scope —
// the prohibited phrases below are fixtures, never console copy.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { type MicrocopyConfig, checkTone, checkVocabulary, parseMicrocopyConfig } from './lib.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const readRepo = (rel: string): string => readFileSync(path.join(repoRoot, rel), 'utf8');

/** The REAL, committed gate config — the rule under test. */
const config: MicrocopyConfig = parseMicrocopyConfig(readRepo('microcopy.yaml'));

const I18N_FILE = 'apps/admin/src/modules/trustee-lite/i18n-en.ts';
const SHELL_FILE = 'apps/admin/src/modules/trustee-lite/TrusteeLiteShell.tsx';
const CROSSLINKS_FILE = 'apps/admin/src/modules/trustee-lite/crossLinks.ts';
const PAGE_FILE = 'apps/admin/src/modules/trustee-lite/TrusteeLitePage.tsx';
const ROUTE_FILE = 'apps/admin/src/routes/TrusteeLiteRoute.tsx';

/** Every authored file of the Trustee-Lite admin surface (all inside `scope.code_globs`). */
const TRUSTEE_LITE_FILES = [I18N_FILE, SHELL_FILE, CROSSLINKS_FILE, PAGE_FILE, ROUTE_FILE] as const;

/** The findings THIS rule (and only this rule) produced. */
function adviceFindings(file: string, text: string): ReturnType<typeof checkTone> {
  return checkTone(file, text, config).filter((f) => f.replacement.includes('moderation-advice'));
}

// ─── (d) the rule EXISTS in the committed config (not just in this test) ─────────────────────────

describe('the moderation-advice rule exists in the committed config', () => {
  it('microcopy.yaml declares a tone rule labelled moderation-advice', () => {
    const labels = config.tone.map((entry) => entry.label);
    expect(labels, 'microcopy.yaml must carry the Story 10.11 tone rule').toContain('moderation-advice');
  });

  it('the admin slice is in scope.code_globs, so the rule actually binds this module', () => {
    const raw = readRepo('microcopy.yaml');
    expect(raw).toContain('apps/admin/src/**/*.tsx');
    expect(raw).toContain('apps/admin/src/**/*.ts');
  });
});

// ─── (a) planted violations bite (the load-bearing proof) ────────────────────────────────────────

describe('moderation-advice — planted advice frames bite in Trustee-Lite-shaped copy', () => {
  const planted: Array<[string, string]> = [
    // (1) VERDICT BY COPY — the phrasing epics.md:3585 names first.
    ['should be suspended', "'trustee.violator.hint': 'This member should be suspended.',"],
    ['should be terminated', "'trustee.violator.hint': 'Members at R7(E) should be terminated.',"],
    ['should be removed', "'trustee.moderation.hint': 'This member should be removed from the roster.',"],
    ['must be suspended', "'trustee.violator.hint': 'Under R7(F) the member must be suspended.',"],
    ['ought to be suspended', "'trustee.violator.hint': 'This member ought to be suspended.',"],
    // (2) IMPERATIVE DEMAND.
    ['action required', "'trustee.section.violator_flag': 'Contribution discipline — action required',"],
    ['action is required', "'trustee.violator.hint': 'Trustee action is required on these members.',"],
    ['requires your action', "'trustee.moderation.hint': 'This row requires your action.',"],
    ['needs action', "'trustee.violator.hint': 'This member needs action from a trustee.',"],
    ['need immediate action', "'trustee.violator.hint': 'These members need immediate action.',"],
    // (3) LATENESS AS JUDGEMENT.
    ['overdue for review', "'trustee.moderation.hint': 'This member is overdue for review.',"],
    ['overdue for action', "'trustee.violator.hint': 'Three members are overdue for action.',"],
    ['overdue for a decision', "'trustee.violator.hint': 'This case is overdue for a decision.',"],
    // (4) EXPLICIT RECOMMENDATION.
    ['recommend suspension', "'trustee.violator.hint': 'We recommend suspension for this member.',"],
    ['recommended termination', "'trustee.violator.hint': 'Recommended termination under R7(E).',"],
    ['recommends moderation', "'trustee.violator.hint': 'The system recommends moderation here.',"],
    ['recommended action', "'trustee.col.next': 'Recommended action',"],
    // (5) CANDIDACY FRAMING — naming a member a candidate IS the recommendation.
    ['candidates for suspension', "'trustee.section.violator_flag': 'Candidates for suspension',"],
    ['candidate for termination', "'trustee.violator.hint': 'This member is a candidate for termination.',"],
    ['eligible for suspension', "'trustee.violator.hint': 'This member is eligible for suspension.',"],
    // (6) HINDI mirrors of (1)/(2)/(4).
    ['hi: nilambit kiya jana chahiye', "'trustee.violator.hint': 'इस सदस्य को निलंबित किया जाना चाहिए।',"],
    ['hi: samapt kiya jana chahiye', "'trustee.violator.hint': 'इस सदस्य की सदस्यता समाप्त की जाना चाहिए।',"],
    ['hi: karrwai aavashyak', "'trustee.violator.hint': 'इस पंक्ति पर कार्रवाई आवश्यक है।',"],
    ['hi: karrwai zaroori', "'trustee.violator.hint': 'ट्रस्टी की कार्रवाई ज़रूरी है।',"],
    ['hi: nilamban ki sifarish', "'trustee.violator.hint': 'इस सदस्य के निलंबन की सिफारिश की जाती है।',"],
  ];

  for (const [label, line] of planted) {
    it(`flags "${label}"`, () => {
      const findings = adviceFindings(I18N_FILE, line);
      expect(findings.length, `expected the moderation-advice rule to fire on: ${line}`).toBeGreaterThan(0);
      expect(findings[0].kind).toBe('tone');
    });
  }
});

// ─── (b) the recorded narrowings hold (no over-reach) ────────────────────────────────────────────

describe('moderation-advice — the recorded narrowings hold (no over-reach)', () => {
  const permitted: Array<[string, string, string]> = [
    // THE narrowing that a real finding forced: the Story 9.1 nominee-console reassurance to a
    // grieving nominee is the NEGATED form, in both languages, and must stay usable. This is the
    // same discipline the fursat-pressure rule applies to जल्दी.
    [
      'hi: shipped nominee-console reassurance',
      'packages/i18n/locales/hi/nominee-console.json',
      'आपकी ओर से कोई कार्रवाई ज़रूरी नहीं है।',
    ],
    [
      'en: no action required (symmetric guard — parity with the Hindi arm)',
      'packages/i18n/locales/en/nominee-console.json',
      'No action required from you.',
    ],
    // The negation guards only checked IMMEDIATELY adjacent "no"/नहीं (review finding,
    // 2026-08-05) — a single intervening qualifier still tripped the rule as a false
    // positive. Both arms now tolerate up to 3 intervening words/tokens.
    [
      'en: no action required, with an intervening qualifier',
      'packages/i18n/locales/en/nominee-console.json',
      'No further action is required from you.',
    ],
    [
      'hi: karrwai zaroori nahi, with an intervening word',
      'packages/i18n/locales/hi/nominee-console.json',
      'कार्रवाई ज़रूरी बिलकुल नहीं है।',
    ],
    // A bare "should be" has ordinary uses that are not verdicts about a member — the arm binds to
    // the moderation OUTCOME verbs on purpose.
    ['en: ordinary should-be', I18N_FILE, "'trustee.col.deadline.hint': 'The deadline should be visible in this row.',"],
    // The shipped severity copy states a FACT about a deadline; it is not a judgement about a person.
    ['en: past deadline (shipped severity label)', I18N_FILE, "'trustee.severity.breached': 'Past deadline',"],
    // Descriptive section + state copy the module actually ships.
    ['en: moderation on record (shipped heading)', I18N_FILE, "'trustee.section.moderation': 'Moderation on record',"],
    ['en: nothing waiting (shipped empty state)', I18N_FILE, "'trustee.state.empty': 'Nothing here is waiting on you.',"],
    // `suspended` as a bare STATUS value is the member's recorded standing, not advice.
    ['en: suspended as a status', I18N_FILE, "const STATUS_LABELS = { suspended: 'Suspended', terminated: 'Terminated' };"],
  ];

  for (const [label, file, line] of permitted) {
    it(`does NOT flag "${label}"`, () => {
      expect(adviceFindings(file, line), `unexpected moderation-advice finding on: ${line}`).toEqual([]);
    });
  }
});

// ─── (c) the REAL authored Trustee-Lite surface is clean ─────────────────────────────────────────

describe('the real Trustee-Lite admin surface carries no advice frame', () => {
  for (const file of TRUSTEE_LITE_FILES) {
    it(`checkTone over ${file} returns no moderation-advice finding`, () => {
      expect(adviceFindings(file, readRepo(file))).toEqual([]);
    });
  }

  // AC5 also states the `report → Sahyog Vivran` vocabulary rule binds this module. It is enforced by
  // the same `pnpm microcopy:check` run, but pinned here too so a future edit to this module's copy
  // fails in the story's own test file rather than only in the aggregate gate output.
  for (const file of TRUSTEE_LITE_FILES) {
    it(`checkVocabulary over ${file} returns empty`, () => {
      // `includeMemberOnly: false` — the admin code slice, matching how check.ts scans code_globs.
      expect(checkVocabulary(file, readRepo(file), config, { includeMemberOnly: false })).toEqual([]);
    });
  }

  it('the module files are actually populated (an empty file would make the above vacuously green)', () => {
    for (const file of TRUSTEE_LITE_FILES) {
      expect(readRepo(file).length, `${file} must be substantive`).toBeGreaterThan(500);
    }
  });
});
