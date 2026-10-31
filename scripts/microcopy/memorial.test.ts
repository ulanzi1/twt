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

import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import * as ts from 'typescript';
import { describe, expect, it } from 'vitest';

import { t as translate } from '../../packages/i18n/src/index.js';
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
  // Story 11b.5a — the family list.
  'apps/mobile/app/(memorial)/family.tsx',
  'apps/mobile/components/memorial-authorship/memorial-kinship.ts',
  'apps/mobile/components/memorial-authorship/MemorialEntry.tsx',
  'apps/mobile/components/memorial-authorship/MemorialHeader.tsx',
  'apps/mobile/components/memorial-authorship/MemorialText.tsx',
  'apps/mobile/components/memorial-authorship/HandoverCodePanel.tsx',
  'apps/mobile/components/memorial-authorship/memorial-copy.ts',
  'apps/mobile/components/memorial-authorship/MemorialKeptPhoto.tsx',
  'apps/mobile/components/memorial-authorship/MemorialViewMissing.tsx',
  'apps/mobile/components/memorial-authorship/useMemorialAnnounce.ts',
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

  // The list above is typed by hand — a NEW memorial file would be unscanned copy wearing a green check. So the directories
  // themselves are listed from disk: every source file in the memorial route group and component folder must be in scope.
  it('EVERY source file in the memorial route group and component folder is in scope.code_globs (a new file cannot slip by)', () => {
    const onDisk = ['apps/mobile/app/(memorial)', 'apps/mobile/components/memorial-authorship'].flatMap((dir) =>
      readdirSync(path.join(repoRoot, dir))
        .filter((f) => /\.tsx?$/.test(f))
        .map((f) => `${dir}/${f}`),
    );
    expect(onDisk.length).toBeGreaterThanOrEqual(MOBILE_FILES.filter((f) => !f.includes('/lib/')).length);
    for (const f of onDisk) expect(config.scope.codeGlobs, f).toContain(f);
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

  // Third review pass (T1) — the keys this pass added or reworded, each run DIRECTLY (register, tone, no-deadline), in both
  // locales. ⚠ Both are agent-drafted and UN-ATTESTED: the AC14 non-author (Hindi) review owes them, like the rest. (T3's
  // `send.still_sending` was REMOVED with the row-held key — a retry now always replays, so nothing is ever "still being sent".)
  describe('T1 — the new and reworded keys', () => {
    // `outcome.title` reworded after the device run (2026-10-24) — see the pin below.
    const NEW_OR_CHANGED = ['outcome.earlier_approval_stands', 'outcome.earlier_approval_stands_helpline_only', 'outcome.title'];
    it.each([EN_FILE, HI_FILE])('%s — present, register + tone clean, no deadline frame', (file) => {
      const keys = Object.fromEntries(copyEntries(file));
      for (const key of NEW_OR_CHANGED) {
        const value = keys[key];
        expect(value?.length, key).toBeGreaterThan(0);
        expect(checkVocabulary(file, value!, config, { includeMemberOnly: true }), key).toEqual([]);
        expect(checkTone(file, value!, config), key).toEqual([]);
        expect(deadlineFrames(value!), key).toEqual([]);
      }
    });

    it('T1 — beside "Write again" the earlier-approval sentence offers a NEW VERSION (or the helpline); without it, the helpline alone', () => {
      const en = Object.fromEntries(copyEntries(EN_FILE));
      const hi = Object.fromEntries(copyEntries(HI_FILE));
      expect(en['outcome.earlier_approval_stands']).toMatch(/new version/i);
      expect(en['outcome.earlier_approval_stands']).toMatch(/helpline/i);
      expect(hi['outcome.earlier_approval_stands']).toMatch(/नया संस्करण/);
      expect(hi['outcome.earlier_approval_stands']).toMatch(/हेल्पलाइन/);
      expect(en['outcome.earlier_approval_stands_helpline_only']).not.toMatch(/new version|write/i);
      expect(hi['outcome.earlier_approval_stands_helpline_only']).not.toMatch(/नया संस्करण|लिख/);
      expect(en['outcome.earlier_approval_stands_helpline_only']).toMatch(/helpline/i);
      expect(hi['outcome.earlier_approval_stands_helpline_only']).toMatch(/हेल्पलाइन/);
    });

    // Device run (2026-10-24): the outcome heading read "What you sent" while the screen — rightly, AC10: `with_the_trust`
    // shows a calm line, not the text — showed no words. The heading now promises nothing the screen does not show.
    it('outcome.title promises no words the screen does not show (en + hi)', () => {
      const en = Object.fromEntries(copyEntries(EN_FILE))['outcome.title'];
      const hi = Object.fromEntries(copyEntries(HI_FILE))['outcome.title'];
      expect(en).toBe('About your words');
      expect(hi).toBe('आपके शब्दों के बारे में');
      expect(en).not.toMatch(/what you sent/i);
      expect(hi).not.toMatch(/आपने जो भेजा/);
    });

    it('send.still_sending is GONE (the row-held key: nothing is ever "still being sent")', () => {
      expect(Object.fromEntries(copyEntries(EN_FILE))['send.still_sending']).toBeUndefined();
      expect(Object.fromEntries(copyEntries(HI_FILE))['send.still_sending']).toBeUndefined();
    });
  });
});

// ─── (b2) Z0 (A) — "Send a new code" (final review of the Y round, BigDev 2026-10-24) ──────────────────────────────────────
// ⚠ Agent-drafted and UN-ATTESTED: the AC14 non-author (Hindi) review owes both keys, like the rest.

describe('Z0 (A) — the "Send a new code" keys', () => {
  const RESEND_KEYS = ['handover.resend', 'handover.resend_note'];

  it.each([EN_FILE, HI_FILE])('%s — present, register + tone clean, no deadline frame', (file) => {
    const keys = Object.fromEntries(copyEntries(file));
    for (const key of RESEND_KEYS) {
      const value = keys[key];
      expect(value?.length, key).toBeGreaterThan(0);
      expect(checkVocabulary(file, value!, config, { includeMemberOnly: true }), key).toEqual([]);
      expect(checkTone(file, value!, config), key).toEqual([]);
      expect(deadlineFrames(value!), key).toEqual([]);
    }
  });

  it('calm and plain: no time, no count, no urgency in either language (the wait is the app\'s, ⛔ the family\'s)', () => {
    for (const file of [EN_FILE, HI_FILE]) {
      const keys = Object.fromEntries(copyEntries(file));
      for (const key of RESEND_KEYS) {
        expect(keys[key], `${file}:${key}`).not.toMatch(/\d|second|minute|सेकंड|मिनट|जल्दी|अभी|now|quick|hurry/i);
      }
    }
    // the button says what it does
    expect(Object.fromEntries(copyEntries(EN_FILE))['handover.resend']).toMatch(/new code/i);
    expect(Object.fromEntries(copyEntries(HI_FILE))['handover.resend']).toMatch(/नया कोड/);
  });

  it('the button label is collected by the role scan below (it is a real Button in HandoverCodePanel.tsx)', () => {
    expect(buttonLabelKeys(readRepo('apps/mobile/components/memorial-authorship/HandoverCodePanel.tsx')).keys).toContain('handover.resend');
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

/**
 * ⚠ Story 11b.5a — the ONE named exception to (d) and (e) — CONFIRMED by BigDev 2026-10-31 ("agreed"; re-wording the approved copy
 * was declined) — and it is ⛔ a take-down: copy 2.13–2.15 (APPROVED by BigDev 2026-10-31)
 * label the family screen's control that removes ONE LINE from the family's own UNSENT list, on the phone (nothing is published;
 * nothing the Trust holds changes). Exact keys, and — in (e) — ONLY inside `family.tsx`; the same key on any other screen, or any
 * other remove / delete / take-down label, still fails (the planted legs below prove it).
 */
const FAMILY_LIST_ROW_KEYS: ReadonlySet<string> = new Set(['family.remove', 'family.remove_a11y', 'family.remove_empty_a11y']);
const FAMILY_SCREEN = 'apps/mobile/app/(memorial)/family.tsx';

describe('the namespace holds ⛔ take-down / remove / delete button key', () => {
  it.each([EN_FILE, HI_FILE])('%s', (file) => {
    for (const [key] of copyEntries(file)) {
      if (FAMILY_LIST_ROW_KEYS.has(key)) continue;
      expect(key).not.toMatch(/take[_-]?down|remove|delete|unpublish/i);
    }
  });

  it('the exception is exactly the three family-list row keys (a fourth "remove" key fails)', () => {
    const removeKeys = copyEntries(EN_FILE)
      .map(([k]) => k)
      .filter((k) => /take[_-]?down|remove|delete|unpublish/i.test(k));
    expect(removeKeys.sort()).toEqual([...FAMILY_LIST_ROW_KEYS].sort());
  });
});

// ─── (e) no take-down BUTTON on the mobile screens — by ROLE and by VALUE, not by key name (R16) ─────────────────────────
//
// (d) reads key NAMES, so a button labelled with an innocently named key whose VALUE says "take it down" would pass. This
// walks the five memorial screens + their components, finds every Button (the `Button` element, or any element with
// `accessibilityRole="button"`), collects the copy keys its label is built from (`t('…')` anywhere inside it, including its
// `accessibilityLabel`), resolves each through the REAL `t()` in en and hi, and refuses a value that offers a take-down.
// `outcome.helpline_for_changes` MAY say "taken down" — it is a sentence the nominee reads, not a button.

const TAKE_DOWN_VALUE: Record<'en' | 'hi', RegExp> = {
  en: /\b(take[- ]?(it[- ])?down|taken[- ]down|remov\w*|delet\w*|unpublish\w*|eras\w*)\b/i,
  hi: /(हटा|हटव|मिटा|डिलीट|टेक[- ]?डाउन)/u,
};

interface ButtonLabels {
  readonly keys: string[];
  /** A `t(…)` inside a Button whose key is not a string literal — it cannot be resolved here, so it is reported. */
  readonly dynamic: number;
  readonly buttons: number;
}

/** Every Button in `source` (role-based) and the literal copy keys its label is made from. */
function buttonLabelKeys(source: string): ButtonLabels {
  const file = ts.createSourceFile('x.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const keys: string[] = [];
  let dynamic = 0;
  let buttons = 0;
  const isButton = (opening: ts.JsxOpeningElement | ts.JsxSelfClosingElement): boolean =>
    opening.tagName.getText(file) === 'Button' ||
    opening.attributes.properties.some(
      (p) =>
        ts.isJsxAttribute(p) &&
        p.name.getText(file) === 'accessibilityRole' &&
        p.initializer !== undefined &&
        ts.isStringLiteral(p.initializer) &&
        p.initializer.text === 'button',
    );
  const collect = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 't') {
      const first = node.arguments[0];
      if (first !== undefined && (ts.isStringLiteral(first) || ts.isNoSubstitutionTemplateLiteral(first))) keys.push(first.text);
      else dynamic += 1;
    }
    ts.forEachChild(node, collect);
  };
  const visit = (node: ts.Node): void => {
    if (ts.isJsxElement(node) && isButton(node.openingElement)) {
      buttons += 1;
      collect(node);
    } else if (ts.isJsxSelfClosingElement(node) && isButton(node)) {
      buttons += 1;
      collect(node);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return { keys, dynamic, buttons };
}

/** The (locale, key, value) of every button label that offers a take-down, resolved through the real `t()`. */
function takeDownButtons(source: string, resolve: (key: string, locale: 'en' | 'hi') => string): string[] {
  const out: string[] = [];
  for (const key of buttonLabelKeys(source).keys) {
    for (const locale of ['en', 'hi'] as const) {
      const value = resolve(key, locale);
      if (TAKE_DOWN_VALUE[locale].test(value)) out.push(`${locale}:${key} = ${value}`);
    }
  }
  return out;
}

/**
 * Story 11b.5a — a Button label may now interpolate (`family.remove_a11y` — *"Remove {name} from the list"*): every `{param}` is
 * filled with its own placeholder, so the VALUE scan reads the label's own words and ⛔ a family's name.
 */
const PLACEHOLDER_PARAMS = new Proxy({} as Record<string, string>, { get: (_t, p) => `{${String(p)}}` });
const realCopy = (key: string, locale: 'en' | 'hi'): string =>
  translate(key, PLACEHOLDER_PARAMS, { locale, namespace: 'memorial' });

describe('no memorial Button offers a take-down — by role and by VALUE, in en and hi (AC4 / AC12, R16)', () => {
  const SCREEN_AND_COMPONENT_FILES = MOBILE_FILES.filter((f) => f.endsWith('.tsx'));

  it('scans real Buttons (the scan is not vacuous) and every Button label resolves through the real t()', () => {
    const all = SCREEN_AND_COMPONENT_FILES.map((f) => buttonLabelKeys(readRepo(f)));
    const keys = new Set(all.flatMap((b) => b.keys));
    expect(all.reduce((n, b) => n + b.buttons, 0)).toBeGreaterThanOrEqual(15);
    for (const known of ['intro.start', 'intro.not_now', 'write.next', 'photo.use_previous', 'preview.send', 'outcome.withdraw', 'outcome.write_again', 'view_missing.retry']) {
      expect(keys.has(known), known).toBe(true);
    }
    // A `t(dynamicKey)` inside a Button could hide a take-down label from this scan — none is allowed.
    expect(all.reduce((n, b) => n + b.dynamic, 0)).toBe(0);
    // Every collected key exists in both locales (the real `t()` throws on a missing key).
    for (const key of keys) for (const locale of ['en', 'hi'] as const) expect(realCopy(key, locale).length, `${locale}:${key}`).toBeGreaterThan(0);
  });

  it.each(SCREEN_AND_COMPONENT_FILES)('%s — no Button label says taken down / take down / remove', (f) => {
    // Story 11b.5a — the family screen's row control removes a line of the UNSENT list (the named exception above), ⛔ elsewhere.
    const exempt = (hit: string): boolean => f === FAMILY_SCREEN && FAMILY_LIST_ROW_KEYS.has(hit.slice(3, hit.indexOf(' = ')));
    expect(takeDownButtons(readRepo(f), realCopy).filter((hit) => !exempt(hit))).toEqual([]);
  });

  it('Story 11b.5a — the family-list row keys ARE flagged by the value scan (so the exception is real), and ⛔ exempt outside family.tsx', () => {
    const src = `const A = () => <Button accessibilityLabel={t('family.remove_a11y', { name })}>{t('family.remove')}</Button>`;
    expect(takeDownButtons(src, realCopy).length).toBeGreaterThan(0);
    expect(takeDownButtons(readRepo(FAMILY_SCREEN), realCopy).length).toBeGreaterThan(0);
    // Every hit on the family screen is one of the three named keys — ⛔ anything else.
    for (const hit of takeDownButtons(readRepo(FAMILY_SCREEN), realCopy)) {
      expect(FAMILY_LIST_ROW_KEYS.has(hit.slice(3, hit.indexOf(' = '))), hit).toBe(true);
    }
  });

  describe('PLANTED — the scan can fail', () => {
    const fake = (key: string, locale: 'en' | 'hi'): string =>
      ({
        'x.innocent': locale === 'en' ? 'Take it down' : 'इसे हटाएँ',
        'x.fine': locale === 'en' ? 'Send' : 'भेजें',
      })[key] ?? '';

    it('a Button whose innocently NAMED key says "Take it down" / "इसे हटाएँ" is flagged', () => {
      const src = `export const A = () => <Button onPress={go}>{t('x.innocent')}</Button>`;
      const hits = takeDownButtons(src, fake);
      expect(hits.some((h) => h.startsWith('en:x.innocent'))).toBe(true);
      expect(hits.some((h) => h.startsWith('hi:x.innocent'))).toBe(true);
    });

    it('so is an element that is a button by ROLE (a Pressable with accessibilityRole="button") and one labelled by accessibilityLabel', () => {
      expect(takeDownButtons(`const A = () => <Pressable accessibilityRole="button">{t('x.innocent')}</Pressable>`, fake)).not.toEqual([]);
      expect(takeDownButtons(`const A = () => <Button accessibilityLabel={t('x.innocent')} />`, fake)).not.toEqual([]);
    });

    it('a sentence that is NOT a button (the nominee reads it) is not flagged — role-based, not a blanket ban', () => {
      expect(takeDownButtons(`const A = () => <Paragraph>{t('x.innocent')}</Paragraph>`, fake)).toEqual([]);
      expect(takeDownButtons(`const A = () => <Button>{t('x.fine')}</Button>`, fake)).toEqual([]);
    });

    it('a dynamic key inside a Button is reported (it could hide a take-down label)', () => {
      expect(buttonLabelKeys(`const A = () => <Button>{t(someKey)}</Button>`).dynamic).toBe(1);
    });

    it('the real "taken down" sentence exists and is NOT a button label (the scan is not simply blind to it)', () => {
      expect(realCopy('outcome.helpline_for_changes', 'en')).toMatch(TAKE_DOWN_VALUE.en);
      const outcomeKeys = buttonLabelKeys(readRepo('apps/mobile/app/(memorial)/outcome.tsx')).keys;
      expect(outcomeKeys).not.toContain('outcome.helpline_for_changes');
    });
  });
});
