// Story 11b.4 (AC14 / AC4 / AC12) — the family memorial's copy is IN SCOPE and the gate has TEETH on it.
//
// ⚠ Two gaps the gate alone would leave, closed here:
//   (1) `code_globs` SKIP `member_only` terms (`check.ts`), and the permission REGISTRY lives in a code file — so this test
//       runs the FULL register (`includeMemberOnly: true`), `checkTone` and the no-deadline scan DIRECTLY over every
//       `MEMORIAL_SUBMISSION_AUTHORISATION_VERSIONS` hi / en string;
//   (2) the tone rules have ⛔ `deadline` arm and ⛔ per-rule scope (widening one would fire on shipped `claim.json` /
//       `contribution.json` copy) — so "no deadline" is pinned by the scan below: it FORBIDS deadline FRAMES (a date, *"by"*
//       + a date or time, *"within N days"*, *"expires"*) and ALLOWS negated reassurance (*"there is no hurry"* — the
//       `claim.json` `appeal.no_deadline` precedent), skipping `$comment.*` keys. Its negative cases include *"approved by
//       the Trust"* and *"जब तक"* (else it fires on this story's own copy).
// ⛔ Tone review is ⛔ ever applied to the family's OWN words (invariant (f)) — only to the copy around them.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { MEMORIAL_SUBMISSION_AUTHORISATION_VERSIONS } from '../../packages/domain/src/memorial/authorisation-copy.js';
import { type MicrocopyConfig, checkTone, checkVocabulary, parseMicrocopyConfig } from './lib.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const readRepo = (rel: string): string => readFileSync(path.join(repoRoot, rel), 'utf8');
const config: MicrocopyConfig = parseMicrocopyConfig(readRepo('microcopy.yaml'));

const EN_FILE = 'packages/i18n/locales/en/memorial.json';
const HI_FILE = 'packages/i18n/locales/hi/memorial.json';
const REGISTRY_FILE = 'packages/domain/src/memorial/authorisation-copy.ts';
const MOBILE_FILES = [
  'apps/mobile/app/(memorial)/_layout.tsx',
  'apps/mobile/app/(memorial)/index.tsx',
  'apps/mobile/app/(memorial)/write.tsx',
  'apps/mobile/app/(memorial)/photo.tsx',
  'apps/mobile/app/(memorial)/preview.tsx',
  'apps/mobile/app/(memorial)/outcome.tsx',
  'apps/mobile/components/memorial-authorship/MemorialEntry.tsx',
  'apps/mobile/components/memorial-authorship/MemorialHeader.tsx',
  'apps/mobile/components/memorial-authorship/MemorialText.tsx',
  'apps/mobile/components/memorial-authorship/HandoverCodePanel.tsx',
  'apps/mobile/components/memorial-authorship/memorial-copy.ts',
  'apps/mobile/components/memorial-authorship/useMemorialQueries.ts',
  'apps/mobile/lib/memorial-draft.ts',
  'apps/mobile/lib/memorial-i18n.ts',
  'apps/mobile/lib/memorial-api.ts',
  'apps/mobile/lib/use-memorial-send.ts',
];

/** The namespace's member-facing strings (⛔ `$comment.*`). */
function copyEntries(rel: string): Array<[string, string]> {
  return Object.entries(JSON.parse(readRepo(rel)) as Record<string, string>).filter(([k]) => !k.startsWith('$comment'));
}

const REGISTRY_STRINGS = Object.values(MEMORIAL_SUBMISSION_AUTHORISATION_VERSIONS).flatMap((v) => [v.en, v.hi]);

// ── The no-deadline scan ────────────────────────────────────────────────────────────────────────────────────────────────

const MONTHS = 'january|february|march|april|may|june|july|august|september|october|november|december';
const DEADLINE_FRAMES: readonly RegExp[] = [
  /\b\d{1,2}[/-]\d{1,2}([/-]\d{2,4})?\b/,
  /\b\d{4}-\d{2}-\d{2}\b/,
  new RegExp(`\\b(${MONTHS})\\s+\\d{1,2}\\b|\\b\\d{1,2}\\s+(${MONTHS})\\b`, 'i'),
  new RegExp(`\\bby\\s+(\\d|today|tomorrow|tonight|the\\s+end|next\\s+\\w+|monday|tuesday|wednesday|thursday|friday|saturday|sunday|${MONTHS})`, 'i'),
  /\bwithin\s+(\d+|a|one|two|three|seven)\s+(minutes?|hours?|days?|weeks?|months?)\b/i,
  /\bexpir(e|es|ed|y|ing)\b/i,
  /(?<!\bno\s)\bdeadline\b/i,
  /\blast\s+(day|date|chance)\b/i,
  /\d+\s*(दिन|दिनों|घंटे|घंटों|हफ़्ते)\s*(में|के\s*भीतर|के\s*अंदर)/,
  /अंतिम\s*(तिथि|तारीख|दिन)/,
  /समय-?सीमा(?![^।]*नहीं)/,
  /तारीख\s*तक/,
  /(?<!जब\s)तक\s*(भेज|जमा|पूरा)/,
];

function deadlineFrames(text: string): RegExp[] {
  return DEADLINE_FRAMES.filter((re) => re.test(text));
}

// ─── (0) the scope claim itself ────────────────────────────────────────────────────────────────────────────────────────

describe('the memorial copy is IN SCOPE — ⛔ the premise of every test below', () => {
  it('both locale files are in scope.copy_globs', () => {
    expect(config.scope.copyGlobs).toContain(EN_FILE);
    expect(config.scope.copyGlobs).toContain(HI_FILE);
  });

  it('the registry and EACH new mobile file are in scope.code_globs, by name', () => {
    expect(config.scope.codeGlobs).toContain(REGISTRY_FILE);
    for (const f of MOBILE_FILES) expect(config.scope.codeGlobs).toContain(f);
  });
});

// ─── (a) planted violations — one per rule family, both locales ─────────────────────────────────────────────────────────

describe('the tone rules bite the memorial copy (planted)', () => {
  const planted: Array<[string, string, string]> = [
    ['fursat — "hurry up" (en)', EN_FILE, '{ "write.hint": "Please hurry up and finish writing." }'],
    ['fursat — "जल्दी कीजिए" (hi)', HI_FILE, '{ "write.hint": "कृपया जल्दी कीजिए।" }'],
    ['fursat — "50% complete" (en)', EN_FILE, '{ "write.hint": "Your memorial is 50% complete." }'],
    ['fursat — "अभी करें" (hi)', HI_FILE, '{ "preview.before_publish": "बदलाव अभी करें।" }'],
    ['fursat — "act now" (en)', EN_FILE, '{ "preview.before_publish": "Act now before it is published." }'],
  ];
  for (const [label, file, line] of planted) {
    it(`flags ${label}`, () => {
      const findings = checkTone(file, line, config);
      expect(findings.length).toBeGreaterThan(0);
      expect(findings[0]!.replacement).toMatch(/fursat-pressure/);
    });
  }

  it('the member_only register bites (donor / user / Late Teacher)', () => {
    for (const line of ['{ "entry.body": "A note from the donor." }', '{ "entry.body": "The user may write." }', '{ "intro.prompt": "About the Late Teacher" }']) {
      expect(checkVocabulary(EN_FILE, line, config, { includeMemberOnly: true }).length).toBeGreaterThan(0);
    }
  });
});

// ─── (b) the REAL copy is clean ─────────────────────────────────────────────────────────────────────────────────────────

describe('the real memorial copy is clean', () => {
  it.each([EN_FILE, HI_FILE])('%s — register + tone', (file) => {
    const text = readRepo(file);
    expect(checkVocabulary(file, text, config, { includeMemberOnly: true })).toEqual([]);
    expect(checkTone(file, text, config)).toEqual([]);
  });

  it('⭐ the permission REGISTRY strings — the FULL register, tone and the no-deadline scan, run DIRECTLY', () => {
    expect(REGISTRY_STRINGS.length).toBeGreaterThan(0);
    for (const s of REGISTRY_STRINGS) {
      expect(checkVocabulary(REGISTRY_FILE, s, config, { includeMemberOnly: true })).toEqual([]);
      expect(checkTone(REGISTRY_FILE, s, config)).toEqual([]);
      expect(deadlineFrames(s)).toEqual([]);
    }
  });

  it('⭐ M3′ and M2 are present in both locales (AC4)', () => {
    for (const file of [EN_FILE, HI_FILE]) {
      const keys = Object.fromEntries(copyEntries(file));
      expect(keys['preview.before_publish']?.length).toBeGreaterThan(0);
      expect(keys['outcome.helpline_for_changes']?.length).toBeGreaterThan(0);
    }
    // ⚠ The Hindi M3′ avoids the imperative `अभी कर…` (fursat-pressure fires on it).
    expect(Object.fromEntries(copyEntries(HI_FILE))['preview.before_publish']).not.toMatch(/अभी\s*कर/);
  });
});

// ─── (c) ⛔ deadline anywhere in the namespace ─────────────────────────────────────────────────────────────────────────

describe('the no-deadline scan (AC2 / AC14)', () => {
  it.each([EN_FILE, HI_FILE])('%s carries ⛔ deadline frame', (file) => {
    for (const [key, value] of copyEntries(file)) expect(deadlineFrames(value), key).toEqual([]);
  });

  it.each([
    'Please send it by 30 October.',
    'Send by tomorrow.',
    'You must finish within 7 days.',
    'This draft expires soon.',
    'The deadline is near.',
    '3 दिन में भेजें।',
    'अंतिम तिथि पास है।',
    'समय-सीमा पास है।',
    'तारीख तक भेजें।',
    '12/10 तक',
  ])('FIRES on the frame %j', (frame) => {
    expect(deadlineFrames(frame).length).toBeGreaterThan(0);
  });

  it.each([
    'The Trust approved by the Trust Panel.',
    'approved by the Trust',
    'There is no hurry.',
    'There is no deadline.',
    'जब तक आप चाहें, लिखते रहें।',
    'कोई समय-सीमा नहीं है।',
    'Room for about 5000 more letters',
  ])('ALLOWS %j', (ok) => {
    expect(deadlineFrames(ok)).toEqual([]);
  });

  it('`$comment` keys are skipped', () => {
    expect(copyEntries(EN_FILE).some(([k]) => k.startsWith('$comment'))).toBe(false);
  });
});

// ─── (d) ⛔ take-down button anywhere (AC4 / AC12 — a take-down goes through the helpline, `-393`) ──────────────────────

describe('the namespace holds ⛔ take-down / remove / delete button key', () => {
  it.each([EN_FILE, HI_FILE])('%s', (file) => {
    for (const [key] of copyEntries(file)) expect(key).not.toMatch(/take[_-]?down|remove|delete|unpublish/i);
  });
});
