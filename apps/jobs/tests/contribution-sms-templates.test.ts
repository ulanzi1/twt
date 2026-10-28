// The contribution notice SMS copy ↔ the registered DLT text — the LOCKSTEP (Story 5.11, Task 1; AC1, AC2; I1, I5, I6;
// `2026-10-23-389` FS1 (d), FS4 (a), FS13 (a), FS16 (b)). The peer-mesh / suspicion tests' shape, leg for leg: in both locales the
// REAL `t()` (⛔ never a stub) renders EXACTLY the registered text with each variable as `{#var#}`; each slot is named as the i18n
// param, in order; the registration sheet carries the same text, key, types and MSG91 form; only the three notices FS1 (d) names
// exist (⛔ a pool opening, ⛔ the last day, ⛔ a broadcast); `$comment.sms` sits in BOTH catalogues; and FS13's pool label.
// ⭐ Story 5.8b (FS1 (a), FS7 (a), `2026-10-28-415`; Panel `2026-10-28-414`) REWROTE the "only the three" legs to what is now true:
// the three per-member notices PLUS ONE bridge message, `cycle_open_bridge` (templates 23–24), which names the family in the two
// shared name boxes. Each rewritten leg says what it replaced.

import { AlertSmsMessage } from '@twt/contracts';
import { DLT_VAR, checkDltTemplateShape, needsUnicode } from '@twt/channels';
import { t } from '@twt/i18n';
import { describe, expect, it } from 'vitest';

import { MEMBER_BOX_SLOTS } from '../src/scheduler/sms-member-boxes.js';
import {
  CONTRIBUTION_SMS_LOCALES,
  CONTRIBUTION_SMS_MESSAGES,
  CONTRIBUTION_SMS_TEMPLATES,
  DATE_SLOT,
  POOL_SLOT,
  contributionSmsDltConfigKey,
  renderContributionSms,
  smsPoolLabel,
  type ContributionSmsLocale,
} from '../src/scheduler/contribution-sms-templates.js';

import {
  CONTRIBUTION_CATALOG,
  SHEET,
  expectRegisteredTextRow,
  i18nParamNames,
  msg91Form,
  sheetRowByConfigKey,
} from './_dlt-template-sheet.js';

/** Every (message, locale) pair — the eight templates (six notices + the two bridge texts). */
const ENTRIES = CONTRIBUTION_SMS_MESSAGES.flatMap((message) =>
  CONTRIBUTION_SMS_LOCALES.map((locale) => [message, locale] as const),
);

/** The sheet ordinals 5.11 took (the next free at Task 5 — 17 to 22), Hindi first as 13 / 14; 5.8b took 23 / 24 (Task 0.4). */
const ORDINAL: Readonly<Record<AlertSmsMessage, Readonly<Record<ContributionSmsLocale, number>>>> = {
  deadline_not_recorded: { hi: 17, en: 18 },
  payment_not_matched: { hi: 19, en: 20 },
  payment_not_confirmed: { hi: 21, en: 22 },
  cycle_open_bridge: { hi: 23, en: 24 },
};

/** The three per-member notices (Story 5.11) — every message but the bridge's. */
const NOTICES: readonly AlertSmsMessage[] = ['deadline_not_recorded', 'payment_not_matched', 'payment_not_confirmed'];

/** I1 — a catalogue string as its registered text: each `{param}` becomes the variable marker. */
const asRegistered = (value: string): string => value.replace(/\{\w+\}/g, DLT_VAR);

/**
 * THE catalogue ↔ registry lockstep, as one function so the PLANTED leg exercises the same code as the "holds for all six" leg
 * (review round 2, P10). ⚠ It reads the catalogue JSON DIRECTLY — the real-`t()` render is a separate leg (the first in the AC2
 * describe below), which a plant cannot reach (`t()` reads the shipped catalogue); together they cover I1 (patch review, Q6; F5):
 * every (message, locale) whose catalogue string does not register as the registry's text, or whose params are not its slots.
 */
function lockstepMismatches(catalog: Readonly<Record<'hi' | 'en', Readonly<Record<string, string>>>>): string[] {
  return ENTRIES.filter(([message, locale]) => {
    const template = CONTRIBUTION_SMS_TEMPLATES[message][locale];
    const value = catalog[locale][template.copyKey];
    return (
      typeof value !== 'string' ||
      asRegistered(value) !== template.registeredText ||
      i18nParamNames(value).join(',') !== template.slots.map((slot) => slot.name).join(',')
    );
  }).map(([message, locale]) => `${message}/${locale}`);
}

describe('AC1 — the registry holds the three notices of FS1 (d) and the ONE bridge message (5.8b), × hi / en', () => {
  // Story 5.8b replaced: "the messages are … day 10, payment not matched, payment not confirmed — and ⛔ nothing else" (three).
  it('⭐ the messages are the contract enum — the three notices, then the bridge — and ⛔ nothing else', () => {
    expect([...CONTRIBUTION_SMS_MESSAGES]).toEqual([...NOTICES, 'cycle_open_bridge']);
    expect(CONTRIBUTION_SMS_MESSAGES).toEqual(AlertSmsMessage.options);
    expect(Object.keys(CONTRIBUTION_SMS_TEMPLATES).sort()).toEqual([...CONTRIBUTION_SMS_MESSAGES].sort());
  });

  // Story 5.8b replaced: "⛔ I5 — no broadcast and no general notice has a key" — a substring check over EVERY key that listed
  // `cycle_open`. Now: the ONLY key naming a cycle opening is the bridge's, and ⛔ other key names a general notice or a broadcast.
  it('⛔ no general notice or broadcast has a key — the ONLY cycle-open key is the bridge\'s (`cycle_open_bridge`)', () => {
    const keys = Object.keys(CONTRIBUTION_SMS_TEMPLATES);
    expect(keys.filter((k) => /cycle_open|pool_open/.test(k))).toEqual(['cycle_open_bridge']);
    const others = keys.filter((k) => k !== 'cycle_open_bridge').join(' ');
    for (const word of ['pool_open', 'last_day', 'cycle_open', 'news', 'survey', 'moderation', 'alert_published']) {
      expect(others).not.toContain(word);
    }
    for (const word of ['last_day', 'news', 'survey', 'moderation', 'alert_published']) {
      expect(keys.join(' ')).not.toContain(word);
    }
    // … and ⛔ catalogue `sms.*` key exists beyond the registry's (the last-day channel draft stays in 5.11's story, ⛔ in the catalogue).
    for (const locale of CONTRIBUTION_SMS_LOCALES) {
      const smsKeys = Object.keys(CONTRIBUTION_CATALOG[locale]).filter((k) => k.startsWith('sms.')).sort();
      expect(smsKeys).toEqual(CONTRIBUTION_SMS_MESSAGES.map((m) => `sms.${m}`).sort());
    }
  });

  it.each(ENTRIES)('⭐ %s / %s — passes the shape check, typed slots, the family config key', (message, locale) => {
    const template = CONTRIBUTION_SMS_TEMPLATES[message][locale];
    expect(checkDltTemplateShape(template.registeredText, template.slots)).toEqual([]);
    expect(template.dltTemplateIdConfigKey).toBe(`sms.dlt.template_id.contribution.${message}.${locale}`);
    expect(template.dltTemplateIdConfigKey).toBe(contributionSmsDltConfigKey(message, locale));
    expect(template.copyKey).toBe(`sms.${message}`);
    // Story 5.8b replaced: "⛔ no name box — no 5.11 text carries a member's name" (for every entry). Per message now: a notice
    // carries ⛔ name box; the bridge carries the pool, then the SAME two box objects (`sms-member-boxes.ts` — the ONLY 30).
    if (message === 'cycle_open_bridge') {
      expect(template.slots).toHaveLength(3);
      expect(template.slots[1]).toBe(MEMBER_BOX_SLOTS[0]);
      expect(template.slots[2]).toBe(MEMBER_BOX_SLOTS[1]);
    } else {
      expect(template.slots.map((s) => s.name)).not.toContain('member1');
    }
  });

  it('the slots, per message — {pool}{date} on day 10, none on not-matched, {pool} on not-confirmed, {pool}{member1}{member2} on the bridge', () => {
    expect(CONTRIBUTION_SMS_TEMPLATES.deadline_not_recorded.en.slots).toEqual([POOL_SLOT, DATE_SLOT]);
    expect(CONTRIBUTION_SMS_TEMPLATES.payment_not_matched.en.slots).toEqual([]);
    expect(CONTRIBUTION_SMS_TEMPLATES.payment_not_confirmed.en.slots).toEqual([POOL_SLOT]);
    expect(CONTRIBUTION_SMS_TEMPLATES.cycle_open_bridge.en.slots).toEqual([POOL_SLOT, ...MEMBER_BOX_SLOTS]);
    expect(CONTRIBUTION_SMS_TEMPLATES.cycle_open_bridge.hi.slots).toEqual([POOL_SLOT, ...MEMBER_BOX_SLOTS]);
    expect(POOL_SLOT).toEqual({ name: 'pool', type: 'alphanumeric', maxLength: 30, label: 'pool name or letter code' });
    expect(DATE_SLOT).toEqual({ name: 'date', type: 'alphanumeric', maxLength: 10, label: 'cycle close date, DD-MM-YYYY' });
  });

  it.each(ENTRIES)('%s / %s — the SMS type follows the text: hi Unicode, en GSM-7 (FS16 (b): "TWT:" only)', (message, locale) => {
    const text = CONTRIBUTION_SMS_TEMPLATES[message][locale].registeredText;
    expect(needsUnicode(text)).toBe(locale === 'hi');
    expect(text.startsWith('TWT: ')).toBe(true);
    expect(text.split('TWT')).toHaveLength(2); // ⛔ "the TWT app" — the app is not named
  });
});

describe('AC2 — registered text = catalogue text (I1): the REAL t() render, and the catalogue lockstep', () => {
  it.each(ENTRIES)('⭐ %s / %s — the real t() renders EXACTLY the registered text', (message, locale) => {
    const template = CONTRIBUTION_SMS_TEMPLATES[message][locale];
    // ⭐ DISTINCT markers per slot — one shared token would let a swap pass.
    const marker = (name: string): string => `\u0001${name.toUpperCase()}\u0001`;
    const values = Object.fromEntries(template.slots.map((s) => [s.name, marker(s.name)]));
    let rendered = renderContributionSms(message, locale, values);
    const positions = template.slots.map((s) => rendered.indexOf(marker(s.name)));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions); // the slots land in text order
    for (const s of template.slots) rendered = rendered.replace(marker(s.name), DLT_VAR);
    expect(rendered).toBe(template.registeredText);
  });

  it.each(ENTRIES)('⭐ %s / %s — the slot names ARE the i18n params, in order (TV13)', (message, locale) => {
    const template = CONTRIBUTION_SMS_TEMPLATES[message][locale];
    const value = CONTRIBUTION_CATALOG[locale][template.copyKey];
    expect(value, `${locale}/contribution.json ${template.copyKey}`).toBeTypeOf('string');
    expect(i18nParamNames(value as string)).toEqual(template.slots.map((s) => s.name));
    expect(asRegistered(value as string)).toBe(template.registeredText);
  });

  it('a slot value is required — the real t() THROWS on a missing param (never a blank in a sent text)', () => {
    expect(() => renderContributionSms('payment_not_confirmed', 'en', {})).toThrow();
  });

  it('a filled day-10 text in both locales — no marker or brace left', () => {
    for (const locale of CONTRIBUTION_SMS_LOCALES) {
      const body = renderContributionSms('deadline_not_recorded', locale, { pool: 'C', date: '05-11-2026' });
      expect(body).toContain('05-11-2026');
      expect(body).not.toMatch(/\{\w+\}|\{#var#\}/);
    }
  });

  it('⭐ the lockstep holds for all eight templates', () => {
    expect(lockstepMismatches(CONTRIBUTION_CATALOG)).toEqual([]);
  });

  it('⭐ PLANTED — the SAME lockstep check catches a one-word drift, and a renamed param, in exactly that template', () => {
    const value = CONTRIBUTION_CATALOG.en['sms.payment_not_confirmed'] as string;
    expect(value).toContain('retry'); // the plant must actually change the text
    const drifted = { ...CONTRIBUTION_CATALOG, en: { ...CONTRIBUTION_CATALOG.en, 'sms.payment_not_confirmed': value.replace('retry', 'try again') } };
    expect(lockstepMismatches(drifted)).toEqual(['payment_not_confirmed/en']);
    const dayTen = CONTRIBUTION_CATALOG.hi['sms.deadline_not_recorded'] as string;
    const renamed = { ...CONTRIBUTION_CATALOG, hi: { ...CONTRIBUTION_CATALOG.hi, 'sms.deadline_not_recorded': dayTen.replace('{date}', '{day}') } };
    expect(lockstepMismatches(renamed)).toEqual(['deadline_not_recorded/hi']);
  });

  it('I6 — `$comment.sms` is in BOTH catalogues, naming the review state and the byte-for-byte rule', () => {
    for (const locale of CONTRIBUTION_SMS_LOCALES) {
      const comment = CONTRIBUTION_CATALOG[locale]['$comment.sms'];
      expect(comment, `${locale} $comment.sms`).toBeTypeOf('string');
      expect(comment).toMatch(/reviewed and corrected by BigDev on 2026-10-23/);
      expect(comment).toMatch(/re-opens it/);
      expect(comment).toMatch(/byte for byte/);
      // Story 5.8b — the comment covers the bridge text. REPLACED 2026-10-28 (was: `/Row 43 \(b\), not assumed/` — the leg was open):
      // BigDev reviewed the Hindi in session (Story 5.8b Debug Log (i)), so the comment now names that review, dated, and re-opens on change.
      expect(comment).toMatch(/sms\.cycle_open_bridge/);
      expect(comment).toMatch(/BigDev reviewed its Hindi on 2026-10-28 and go-live gate Row 43 \(b\) records that review/);
    }
  });

  it('⭐ Story 5.8b — a filled bridge text in both locales: the name boxes sit side by side, ⛔ marker or brace left', () => {
    for (const locale of CONTRIBUTION_SMS_LOCALES) {
      const body = renderContributionSms('cycle_open_bridge', locale, { pool: 'C', member1: 'Rajesh Kumar Shar', member2: 'ma' });
      expect(body).toContain('Rajesh Kumar Sharma');
      expect(body).not.toMatch(/\{\w+\}|\{#var#\}/);
    }
    expect(renderContributionSms('cycle_open_bridge', 'en', { pool: 'C', member1: 'Rajesh S.', member2: '' })).toBe(
      "TWT: your pool C is open, in support of Rajesh S.'s family. Please open the app to contribute.",
    );
  });

  it('parity — every `sms.*` key in en is in hi and the reverse', () => {
    const en = Object.keys(CONTRIBUTION_CATALOG.en).filter((k) => k.startsWith('sms.')).sort();
    const hi = Object.keys(CONTRIBUTION_CATALOG.hi).filter((k) => k.startsWith('sms.')).sort();
    expect(hi).toEqual(en);
    expect(en).toHaveLength(4); // Story 5.8b replaced `3` — the three notices + `sms.cycle_open_bridge`
  });
});

describe('AC2 — the registration sheet carries the same text, types and MSG91 form', () => {
  it.each(ENTRIES)('⭐ %s / %s — its row, found by config key', (message, locale) => {
    const template = CONTRIBUTION_SMS_TEMPLATES[message][locale];
    const row = sheetRowByConfigKey(template.dltTemplateIdConfigKey);
    expect(row.number).toBe(ORDINAL[message][locale]);
    expect(row.types).toEqual(template.slots.map((s) => s.type));
    expect(row.msg91).toBe(msg91Form(template.registeredText, template.slots));
    expectRegisteredTextRow(row.number, template.registeredText);
  });

  it('the sheet names the registry file and the 5.11 section', () => {
    expect(SHEET).toContain('apps/jobs/src/scheduler/contribution-sms-templates.ts');
    expect(SHEET).toContain('## The wording of templates 17–22 (Story 5.11');
    expect(SHEET).toContain('## The wording of templates 23–24 (Story 5.8b');
  });

  it('Story 5.8b (FS15 (a)) — the sheet provisions BOTH bridge templates Unicode (a family name may be Devanagari)', () => {
    expect(SHEET).toContain('**Unicode for BOTH 23 and 24**');
  });

  it('a zero-slot template reads cleanly: its MSG91 form is its text', () => {
    const t20 = CONTRIBUTION_SMS_TEMPLATES.payment_not_matched.en;
    expect(msg91Form(t20.registeredText, t20.slots)).toBe(t20.registeredText);
  });
});

describe('FS13 (a) — the {pool} value of a text', () => {
  const HINDI_NAME = 'अर्जुन';

  it('a curated name that fits and is GSM-7 ⇒ the name, in both locales', () => {
    expect(smsPoolLabel({ poolName: 'Arjun', poolLetterCode: 'C' }, 'en')).toBe('Arjun');
    expect(smsPoolLabel({ poolName: 'Arjun', poolLetterCode: 'C' }, 'hi')).toBe('Arjun');
  });

  it('a Devanagari curated name ⇒ the name in hi, the LETTER CODE in en (⛔ an en text turned Unicode — T5)', () => {
    expect(smsPoolLabel({ poolName: HINDI_NAME, poolLetterCode: 'C' }, 'hi')).toBe(HINDI_NAME);
    expect(smsPoolLabel({ poolName: HINDI_NAME, poolLetterCode: 'C' }, 'en')).toBe('C');
  });

  it('a name over 30 UTF-16 units ⇒ the letter code (30 fits, 31 does not — `-394` item 2)', () => {
    expect(smsPoolLabel({ poolName: 'a'.repeat(30), poolLetterCode: 'C' }, 'en')).toBe('a'.repeat(30));
    expect(smsPoolLabel({ poolName: 'a'.repeat(31), poolLetterCode: 'C' }, 'en')).toBe('C');
    expect(smsPoolLabel({ poolName: 'अ'.repeat(31), poolLetterCode: 'C' }, 'hi')).toBe('C');
  });

  it('no curated name ⇒ the letter code', () => {
    expect(smsPoolLabel({ poolName: null, poolLetterCode: 'C' }, 'hi')).toBe('C');
  });

  // Story 5.11b (FS21 (a), `-404` — `-394` item 2 superseded in part): built with `String.fromCodePoint` so ⛔ invisible character
  // sits raw in this file.
  const ch = (cp: number): string => String.fromCodePoint(cp);
  it.each([
    ['ZWSP U+200B (Cf)', 0x200b],
    ['LRM U+200E (Cf, bidi)', 0x200e],
    ['RLO U+202E (Cf, bidi override)', 0x202e],
    ['WORD JOINER U+2060 (Cf)', 0x2060],
    ['BOM U+FEFF (Cf)', 0xfeff],
    ['LINE SEPARATOR U+2028 (Zl)', 0x2028],
    ['PARAGRAPH SEPARATOR U+2029 (Zp)', 0x2029],
    ['a control U+0007 (Cc)', 0x07],
  ])('⭐ FS21 — a curated name carrying %s ⇒ the LETTER CODE, in both locales', (_label, cp) => {
    expect(smsPoolLabel({ poolName: `अर्${ch(cp)}जुन`, poolLetterCode: 'C' }, 'hi')).toBe('C');
    expect(smsPoolLabel({ poolName: `Arj${ch(cp)}un`, poolLetterCode: 'C' }, 'en')).toBe('C');
  });

  it('⭐ review C3-P24 — a clean Latin name IS returned for `en` (so the `⇒ C` legs above are not a constant function), and an ASTRAL format character (U+E0041, a tag character: Cf in a surrogate PAIR) is refused for `hi` — a filter that looked at UTF-16 units would pass it', () => {
    expect(smsPoolLabel({ poolName: 'Arjun', poolLetterCode: 'C' }, 'en')).toBe('Arjun');
    expect(smsPoolLabel({ poolName: `अर्जुन${ch(0xe0041)}`, poolLetterCode: 'C' }, 'hi')).toBe('C');
    // (In `en` the new rule is unobservable BY DESIGN: every Zl / Zp / Cf character is non-GSM-7, so the older GSM-7 filter already refuses it.)
  });

  it('⭐ FS21 — ZWNJ U+200C and ZWJ U+200D (Devanagari shaping) are KEPT in a hi name', () => {
    const shaped = `क्${ch(0x200d)}ष${ch(0x200c)}त्र`;
    expect(smsPoolLabel({ poolName: shaped, poolLetterCode: 'C' }, 'hi')).toBe(shaped);
  });

  it('⭐ FS21 — a LONE surrogate (either half) ⇒ the letter code; a well-formed astral character is ⛔ refused for it', () => {
    expect(smsPoolLabel({ poolName: `Arj${String.fromCharCode(0xd800)}un`, poolLetterCode: 'C' }, 'hi')).toBe('C');
    expect(smsPoolLabel({ poolName: `Arj${String.fromCharCode(0xdc00)}un`, poolLetterCode: 'C' }, 'hi')).toBe('C');
    expect(smsPoolLabel({ poolName: `अर्जुन${ch(0x1f64f)}`, poolLetterCode: 'C' }, 'hi')).toBe(`अर्जुन${ch(0x1f64f)}`);
  });

  it('the push copy is untouched — `notify.*` still renders the curated name in an en push', () => {
    const subject = t('notify.pending_match.escalated.subject', { pool: HINDI_NAME }, { locale: 'en', namespace: 'contribution' });
    expect(subject).toContain(HINDI_NAME);
  });
});
