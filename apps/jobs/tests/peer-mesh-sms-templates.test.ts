// The peer mesh request SMS copy ↔ the registered DLT text — the LOCKSTEP (Story 6.27c, Task 1.3; AC2, AC8; `2026-10-10-303`
// Q1 A as amended by `2026-10-10-304` Q6 A; `2026-10-10-311` PM3). 6.24b's suspicion test, leg for leg: in both locales the
// REAL `t()` (⛔ never a stub) renders EXACTLY the registered text with each variable as `{#var#}`; each variable lands once, in
// the order of the Panel's words; the request sheet carries the same text and key; the en words are the Panel's, byte for
// byte; ⛔ no deadline word (RB16); the slots are typed (6.34 TV4) and named as the i18n params (TV13); the sheet row lists the
// same types and the MSG91 form; and `$comment.peer_mesh_sms` carries the NOT-YET-HUMAN-REVIEWED marker in BOTH locales.
// ⭐ Story 6.37e rework (`2026-10-22-379` Q1 A / Q2 A): the name is TWO boxes, `{member1}{member2}` (the shared slots of
// `sms-member-boxes.ts`); ⛔ helpline (*"…[link], or call us."* — the dash a comma, so the English is GSM-7); "short" dropped
// (BigDev's words, ratified by `2026-10-22-381` PQ1 A). R9's 40 / 41 legs moved to `sms-member-name.test.ts` (60 / 61, astral included).

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { checkDltTemplateShape, needsUnicode } from '@twt/channels';
import { t } from '@twt/i18n';
import { describe, expect, it } from 'vitest';

import {
  DLT_VAR,
  PEER_MESH_REQUEST_SMS_LOCALES,
  PEER_MESH_REQUEST_SMS_TEMPLATES,
  fitsDltUrl,
  peerMeshRequestDltConfigKey,
  renderPeerMeshRequest,
} from '../src/scheduler/peer-mesh-sms-templates.js';
import { MEMBER_BOX_SLOTS } from '../src/scheduler/sms-member-boxes.js';

import { expectRegisteredTextRow, i18nParamNames, msg91Form, sheetRowByConfigKey } from './_dlt-template-sheet.js';

const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf-8');
const SHEET = read('../../../docs/launch-gate-inventory/dlt-template-requests-6-19.md');
const CLAIM_JSON = {
  en: JSON.parse(read('../../../packages/i18n/locales/en/claim.json')) as Record<string, string>,
  hi: JSON.parse(read('../../../packages/i18n/locales/hi/claim.json')) as Record<string, string>,
};

/** RB16 — the 6.19 deny-list, COPIED WHOLE (as 6.24b's test copies it). Substrings, ⛔ never `\b`. */
const HINDI_DEADLINE_TERMS = [
  'दिन',
  'भीतर',
  'के अंदर',
  'अंतिम',
  'आखिरी',
  'आख़िरी',
  'तुरंत',
  'अत्यावश्यक',
  'जल्द से जल्द',
  'समय सीमा',
  'समय-सीमा',
  'अन्यथा',
  'वरना',
] as const;

/** THE deadline-threat assertion (T6, S4) — 6.19's helper, copied whole. Throws on a threat. */
function assertNoDeadlineThreat(body: string, label: string): void {
  expect(body.toLowerCase(), label).not.toMatch(/\bdays?\b|urgent|last chance|within|deadline/);
  expect(body, label).not.toMatch(/[०-९]/); // UX-DR73 — ⛔ Devanagari digits
  for (const term of HINDI_DEADLINE_TERMS) expect(body, `"${term}" in ${label}`).not.toContain(term);
}

/** The Panel's words (`-379` Q2 A — `-303` Q1 A as amended by `-304` Q6 A and narrowed), `[member]` as two `{#var#}`, `[link]` as
 * one — EXCEPT "a few questions" for the ratified "a few short questions" (BigDev's words, ratified by `-381` PQ1 A). */
const PANEL_EN = 'We have been told that {#var#}{#var#} has died. If you knew them, please answer a few questions: {#var#}, or call us.';

const MEMBER1 = '\u0001MEMBER1\u0001';
const MEMBER2 = '\u0004MEMBER2\u0004';
const LINK = '\u0003LINK\u0003';

describe('the peer mesh request SMS templates (PM3 — one message × both locales)', () => {
  it.each(PEER_MESH_REQUEST_SMS_LOCALES)('⭐ %s — the real t() renders EXACTLY the registered DLT text', (locale) => {
    const template = PEER_MESH_REQUEST_SMS_TEMPLATES[locale];
    // ⭐ DISTINCT markers per variable — one shared token would let a swap pass.
    const rendered = renderPeerMeshRequest(locale, { member1: MEMBER1, member2: MEMBER2, link: LINK });
    // The two boxes side by side, box 1 first, nothing between them; then the link.
    expect(rendered.split(MEMBER1 + MEMBER2)).toHaveLength(2);
    expect(rendered.split(LINK)).toHaveLength(2);
    expect(rendered.indexOf(MEMBER2)).toBeLessThan(rendered.indexOf(LINK));
    expect(rendered.replace(MEMBER1, DLT_VAR).replace(MEMBER2, DLT_VAR).replace(LINK, DLT_VAR)).toBe(template.registeredText);
    expect(template.registeredText.split(DLT_VAR)).toHaveLength(4);
  });

  it.each(PEER_MESH_REQUEST_SMS_LOCALES)('⭐ %s — the request sheet carries the SAME registered text', (locale) => {
    const template = PEER_MESH_REQUEST_SMS_TEMPLATES[locale];
    const { number } = sheetRowByConfigKey(template.dltTemplateIdConfigKey);
    expect(number).toBe(locale === 'hi' ? 13 : 14);
    expectRegisteredTextRow(number, template.registeredText);
  });

  it.each(PEER_MESH_REQUEST_SMS_LOCALES)("%s — the config key is the sheet's (RB4)", (locale) => {
    const key = PEER_MESH_REQUEST_SMS_TEMPLATES[locale].dltTemplateIdConfigKey;
    expect(key).toBe(`sms.dlt.template_id.peer_mesh.request.${locale}`);
    expect(key).toBe(peerMeshRequestDltConfigKey(locale));
    expect(SHEET).toContain(key);
  });

  it("⭐ en — the Panel's words, byte for byte (⛔ \"TWT:\", ⛔ the dash, ⛔ the helpline)", () => {
    expect(PEER_MESH_REQUEST_SMS_TEMPLATES.en.registeredText).toBe(PANEL_EN);
    expect(PEER_MESH_REQUEST_SMS_TEMPLATES.en.registeredText).not.toContain('TWT');
    expect(PEER_MESH_REQUEST_SMS_TEMPLATES.en.registeredText).not.toContain('—');
  });

  it('⛔ hi — ⛔ the `-303` routing block\'s "two" (Trap 19): "a few" is कुछ', () => {
    const hi = PEER_MESH_REQUEST_SMS_TEMPLATES.hi.registeredText;
    expect(hi).not.toContain('दो');
    expect(hi).toContain('कुछ');
  });

  it.each(PEER_MESH_REQUEST_SMS_LOCALES)('⛔ %s — every variable filled, ⛔ no deadline threat (RB16)', (locale) => {
    const body = renderPeerMeshRequest(locale, {
      member1: 'Ramesh ',
      member2: 'Kumar',
      link: 'https://example.org/peer-request?c=ABCDEFGHJKLM',
    });
    expect(body).toContain('Ramesh Kumar');
    expect(body).toContain('https://example.org/peer-request?c=ABCDEFGHJKLM');
    expect(body).not.toMatch(/\{\w+\}/);
    assertNoDeadlineThreat(body.replace('https://example.org/peer-request?c=ABCDEFGHJKLM', 'LINK'), `the ${locale} request`);
  });

  it.each([
    ['a Hindi "within N days"', ' 7 दिनों के भीतर उत्तर दें।'],
    ['a Hindi "immediately"', ' तुरंत संपर्क करें।'],
    ['Devanagari digits', ' ७'],
    ['an English "within 7 days"', ' Reply within 7 days.'],
  ])('the deny-list is LIVE — the SAME assertion THROWS on %s written into a real Hindi body', (_label, threat) => {
    const clean = renderPeerMeshRequest('hi', { member1: 'X', member2: 'W', link: 'L' });
    assertNoDeadlineThreat(clean, 'clean');
    expect(() => assertNoDeadlineThreat(`${clean}${threat}`, 'threatened')).toThrow();
  });

  it.each(PEER_MESH_REQUEST_SMS_LOCALES)('⭐ Story 6.34 — %s declares typed slots (TV4) and passes the shape check', (locale) => {
    const template = PEER_MESH_REQUEST_SMS_TEMPLATES[locale];
    expect(template.slots).toEqual([...MEMBER_BOX_SLOTS, { name: 'link', type: 'url', maxLength: 120, label: 'app link to the questions' }]);
    expect(checkDltTemplateShape(template.registeredText, template.slots)).toEqual([]);
    // the SMS type follows the TEXT — template 14 (en) lost its em dash, so it is GSM-7; the Hindi is Unicode
    expect(needsUnicode(template.registeredText)).toBe(locale === 'hi');
  });

  it.each(PEER_MESH_REQUEST_SMS_LOCALES)('⭐ Story 6.34 — %s: the slot names ARE the i18n params, in order (TV13)', (locale) => {
    const template = PEER_MESH_REQUEST_SMS_TEMPLATES[locale];
    const value = CLAIM_JSON[locale][template.copyKey];
    expect(value, `${locale}/claim.json ${template.copyKey}`).toBeTypeOf('string');
    expect(i18nParamNames(value as string)).toEqual(template.slots.map((s) => s.name));
    // The real t(), params keyed by SLOT NAME — a wrong name throws (a missing param); the markers land in slot order.
    const marker = (name: string): string => `\u0001${name}\u0001`;
    const params = Object.fromEntries(template.slots.map((s) => [s.name, marker(s.name)]));
    const rendered = t(template.copyKey, params, { locale, namespace: 'claim' });
    const positions = template.slots.map((s) => rendered.indexOf(marker(s.name)));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    const back = template.slots.reduce((out, s) => out.replace(marker(s.name), DLT_VAR), rendered);
    expect(back).toBe(template.registeredText);
  });

  it.each(PEER_MESH_REQUEST_SMS_LOCALES)('⭐ Story 6.34 — %s: the sheet row lists the same types in order and the MSG91 form (TV8)', (locale) => {
    const template = PEER_MESH_REQUEST_SMS_TEMPLATES[locale];
    const row = sheetRowByConfigKey(template.dltTemplateIdConfigKey);
    expect(row.types).toEqual(template.slots.map((s) => s.type));
    expect(row.msg91).toBe(msg91Form(template.registeredText, template.slots));
  });

  it.each(['en', 'hi'] as const)('⭐ `$comment.peer_mesh_sms` carries the NOT-YET-HUMAN-REVIEWED marker and Row 28 — %s', (locale) => {
    const comment = CLAIM_JSON[locale]['$comment.peer_mesh_sms'];
    expect(comment).toContain('NOT YET HUMAN-REVIEWED');
    expect(comment).toContain('Row 28');
    expect(comment).toContain('must match the registered DLT content byte for byte');
  });
});

describe('fitsDltUrl — 6.27c review F6: the `{link}` slot\'s url ceiling, ≤ 120', () => {
  it.each([
    ['120 characters', `https://${'a'.repeat(112)}`, true],
    ['121 characters', `https://${'a'.repeat(113)}`, false],
  ])('%s ⇒ %s', (_label, value, fits) => {
    expect(fitsDltUrl(value)).toBe(fits);
  });
});
