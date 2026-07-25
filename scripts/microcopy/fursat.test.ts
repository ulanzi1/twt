// scripts/microcopy/fursat.test.ts
//
// Story 9.1 — TEETH for the `fursat-pressure` tone rule, proven against the REAL config.
//
// Like out-of-band.test.ts (and unlike lib.test.ts, which unit-tests the pure engine against an INLINE
// SAMPLE_YAML), this file loads the ACTUAL microcopy.yaml + the ACTUAL locale files off disk and runs the
// real `checkTone` over them.
//
// The "fursat" cadence invariant (epics.md:3156-3162) requires Sunita's Nominee Console to stay grief-paced
// and unhurried — NO gamification (streaks/badges/achievements/%-complete), NO urgency / falling-behind
// framing, NO pre-threshold escalation pressure. Green on introduction is NOT the deliverable
// ([[feedback_gate_scope_semantic_coverage]] — a green scan over the newly-scanned nominee-console files
// proves nothing); the teeth are the PLANTED prohibited frames below that the rule FIRES on, in BOTH
// locales, PLUS the recorded narrowings that keep it from over-reaching onto the reassuring copy the
// console legitimately ships ("there is no hurry" / "कोई जल्दी नहीं है") and admin UI-component identifiers.
//
// SELF-GREEN: this file lives under scripts/microcopy/**, which is excluded from the gate's own scan scope —
// the prohibited phrases below are fixtures, never member copy.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { type MicrocopyConfig, checkTone, parseMicrocopyConfig } from './lib.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const readRepo = (rel: string): string => readFileSync(path.join(repoRoot, rel), 'utf8');

/** The REAL, committed gate config — the rule under test. */
const config: MicrocopyConfig = parseMicrocopyConfig(readRepo('microcopy.yaml'));

const EN_CONSOLE = 'packages/i18n/locales/en/nominee-console.json';
const HI_CONSOLE = 'packages/i18n/locales/hi/nominee-console.json';

/** Resolve the real locale strings (values only) — the copy a consumer surface renders. */
function resolvedStrings(rel: string): string[] {
  return Object.values(JSON.parse(readRepo(rel)) as Record<string, string>);
}

/** The findings THIS rule (and only this rule) produced. */
function fursatFindings(file: string, text: string): ReturnType<typeof checkTone> {
  return checkTone(file, text, config).filter((f) => f.replacement.includes('fursat-pressure'));
}

// ─── (a) planted violations in BOTH locales are flagged (the load-bearing proof) ─────────────────

describe('fursat-pressure — planted prohibited frames bite in both locales', () => {
  const planted: Array<[string, string, string]> = [
    // (1) gamification — streaks / badges / achievements / %-complete / leaderboard
    ['en: earned a badge', EN_CONSOLE, 'You earned a badge for uploading today!'],
    ['en: keep your streak', EN_CONSOLE, 'Keep your streak going — upload every day.'],
    ['en: N-day streak', EN_CONSOLE, "You're on a 5-day streak!"],
    ['en: achievement unlocked', EN_CONSOLE, 'Achievement unlocked: first reconciliation.'],
    ['en: % complete', EN_CONSOLE, 'You are 40% complete for this cycle.'],
    ['en: leaderboard', EN_CONSOLE, 'See where you rank on the leaderboard.'],
    // (2) urgency / falling-behind
    ["en: you're behind", EN_CONSOLE, "Sunita, you're behind on uploads — please act."],
    ['en: falling behind', EN_CONSOLE, 'You are falling behind on your daily reconciliation.'],
    ['en: act now', EN_CONSOLE, 'Act now to keep the pool on track.'],
    ['en: hurry up', EN_CONSOLE, 'Please hurry up and finish today’s uploads.'],
    ["en: don't delay", EN_CONSOLE, "Don't delay — the cycle closes soon."],
    // (3) pre-threshold escalation pressure
    ['en: last chance', EN_CONSOLE, 'Last chance to upload before we escalate.'],
    ['en: final reminder', EN_CONSOLE, 'This is your final reminder to reconcile.'],
    // Hindi arms (urgency / falling-behind / escalation)
    ['hi: aap peeche', HI_CONSOLE, 'सुनीता, आप पीछे हैं — कृपया अभी करें।'],
    ['hi: jaldi keejiye', HI_CONSOLE, 'कृपया जल्दी कीजिए, समय कम है।'],
    ['hi: turant karo', HI_CONSOLE, 'आज का मिलान तुरंत करें।'],
    ['hi: der na karo', HI_CONSOLE, 'देर न करें, चक्र बंद होने वाला है।'],
  ];

  for (const [label, file, line] of planted) {
    it(`flags "${label}"`, () => {
      const findings = fursatFindings(file, line);
      expect(findings.length, `expected the fursat-pressure rule to fire on: ${line}`).toBeGreaterThan(0);
      expect(findings[0].kind).toBe('tone');
    });
  }
});

// ─── (b) the recorded narrowings hold (no over-reach) ────────────────────────────────────────────

describe('fursat-pressure — the recorded narrowings hold (no over-reach)', () => {
  const permitted: Array<[string, string, string]> = [
    // The fursat register's OWN reassurance is "there is no hurry" / "कोई जल्दी नहीं" — the bare urgency
    // words must stay usable in their NEGATED, reassuring form (the very copy the console ships).
    ['en: no hurry (shipped intro)', EN_CONSOLE, 'Take your time. There is no hurry, and nothing is due.'],
    ['hi: koi jaldi nahi (shipped intro)', HI_CONSOLE, 'यहाँ अपना समय लीजिए। कोई जल्दी नहीं है।'],
    // "badge" as a bare admin UI-component identifier is NOT gamification member copy (the arm binds to a
    // gamification verb/possessive) — the 6 admin `code_globs` `badge` identifiers must stay clean.
    ['admin: SLA-breach badge comment', 'apps/admin/src/modules/claim-appeal/AppealAuditLookup.tsx', '// the D-H SLA-breach badge per row'],
    ['admin: read-only-badge testid', 'apps/admin/src/modules/claim-verification/VerificationConsoleShell.tsx', 'data-testid="read-only-badge"'],
    ['admin: clause_version_id badge', 'apps/admin/src/modules/r9-voting/R9CasePanel.tsx', '// clause_version_id badge +'],
    // "complete" without the completion-percentage frame is an ordinary, permitted word.
    ['en: complete your details (no %)', EN_CONSOLE, 'When you are ready, you can complete your details.'],
  ];

  for (const [label, file, line] of permitted) {
    it(`does NOT flag "${label}"`, () => {
      expect(fursatFindings(file, line), `unexpected fursat-pressure finding on: ${line}`).toEqual([]);
    });
  }
});

// ─── (c) the load-bearing invariant — the REAL shipped console copy is clean ──────────────────────

describe('the real nominee-console surface carries no fursat-pressure frame', () => {
  for (const [label, file] of [
    ['en nominee-console', EN_CONSOLE],
    ['hi nominee-console', HI_CONSOLE],
  ] as const) {
    it(`checkTone over every ${label} string returns empty`, () => {
      for (const s of resolvedStrings(file)) {
        expect(checkTone(file, s, config), `prohibited frame in ${label}: "${s}"`).toEqual([]);
      }
    });
  }

  it('the copy files are actually populated (an empty catalog would make the above vacuously green)', () => {
    expect(resolvedStrings(EN_CONSOLE).length).toBeGreaterThanOrEqual(10);
    expect(resolvedStrings(HI_CONSOLE).length).toBeGreaterThanOrEqual(10);
  });
});
