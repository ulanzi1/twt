// Story 12.2 (Task 8.4; AC11, AC12) — the partner-offer derivations and their copy, through the REAL resolver.
//
// TWO kinds of assertion: (1) the story's quoted sentences are pinned VERBATIM against `resolveEn` (the story is the
// contract — a drift in the chrome must fail here); (2) every derivation returns exactly what the resolver says (the
// derivations are never compared with a transcribed copy — [[feedback_stub_must_call_not_transcribe]]).

import type { ModuleDetailResponse } from '@twt/contracts';
import { describe, expect, it } from 'vitest';

import { attemptKey, type AttemptKey } from '../src/api/hooks.js';
import {
  codeToStep,
  describeEligibility,
  describePublication,
  eligibilityStatesOf,
  formatIst,
  issueFieldName,
  issueMessage,
  describeInstant,
  describePlaces,
  describeScope,
  emptyWizardState,
  firstInvalidStep,
  fromModule,
  issueToStep,
  leadWarning,
  moduleErrorGuidance,
  normaliseDisplayText,
  reachesNoMemberYet,
  scopeUnknownMessage,
  toAuthorRequest,
  toIsoOrNull,
  validateStep,
  WIZARD_STEPS,
  type WizardState,
} from '../src/modules/marketplace/derive.js';
import { MODULE_EN_KEYS, resolveEn as t } from '../src/modules/marketplace/i18n-en.js';

const step = (s: (typeof WIZARD_STEPS)[number]): number => WIZARD_STEPS.indexOf(s);

describe('the story’s sentences, verbatim (AC11 / AC12 / Policy meaning / QE11 / QE15 / QE17 / G18)', () => {
  it.each([
    ['module.wizard.opening', 'Your answers stay on this page until you press Create draft. Reloading or leaving the page loses them.'],
    ['module.audience.membersAll', 'Offered to: every member of the Pariwar'],
    ['module.eligibility.none', 'No status restriction — every member in the audience'],
    ['module.eligibility.leftOrErased', 'When the offer shelf opens, it will also refuse members who have left the Pariwar or whose data was erased.'],
    ['module.audience.noDistrict', 'Members with no recorded workplace district are not reached by a state or district audience.'],
    ['module.audience.matchesNobody', 'An audience that matches no member reaches nobody.'],
    [
      'module.audience.unlistedDistrict',
      'Members whose recorded workplace district is not one of the places listed here are not reached by a district audience.',
    ],
    [
      'module.eligibility.noMemberYet',
      'No member can be in these statuses yet: Lock-in over — waiting for a trustee to check identity; Active; Active (grace period); Lapsed (unpaid). The step that ends the lock-in period is not built yet.',
    ],
    ['module.eligibility.reachesNoMember', 'This offer reaches no member for now.'],
    ['module.scope.roleCohort', 'Targeting by role or cohort is not available.'],
    ['module.secret.copy', 'The Secret Manager secret must exist before leads are sent (a later release). This is its NAME, never the key.'],
    ['module.detail.membersCannotSee', 'Members cannot see offers yet. The member offer shelf comes in a later release.'],
    [
      'module.detail.tick.tone',
      'I have reviewed this copy against every section of the TWT tone-review checklist (voice; register; prohibited frames; grief context; reviewer attestation), and I am not its author',
    ],
    ['module.detail.tick.hindi', 'I have reviewed the Hindi text'],
    ['module.detail.tick.partner', 'The partner agreement for this offer is signed and includes TWT’s visual-discipline term'],
    ['module.detail.authorCannotPublish', 'Another admin must review and publish this offer — you wrote it.'],
    [
      'module.detail.singleAdmin',
      'A Pariwar with only one admin cannot publish an offer: another admin, or a super admin granted in this Pariwar, must review and publish it.',
    ],
  ])('%s', (key, text) => {
    expect(t(key)).toBe(text);
  });

  it('the seven status labels (AC11 step (b))', () => {
    expect(
      ['pending-kyc', 'pending-fee', 'pending-valid', 'lock-in', 'active', 'active-in-grace', 'lapsed-unpaid'].map((s) => t(`module.status.${s}`)),
    ).toEqual([
      'Waiting for KYC',
      'Waiting for the joining fee',
      'Lock-in over — waiting for a trustee to check identity',
      'In the lock-in period',
      'Active',
      'Active (grace period)',
      'Lapsed (unpaid)',
    ]);
  });

  it('the parameterised audience lines and the C10 warning, with their tokens filled', () => {
    expect(t('module.audience.state', { places: 'Bihar' })).toBe('Only members whose state is one of: Bihar');
    expect(t('module.audience.district', { places: 'Patna; Gaya' })).toBe('Only members whose district is one of: Patna; Gaya');
    expect(t('module.detail.leadWarning', { n: 3 })).toBe(
      '3 members registered interest in this offer. A corrected copy starts with all places free; those members can register again, and the partner may receive a second lead for the same member.',
    );
  });

  it('every key resolves, a missing parameter or key throws, and no brace survives', () => {
    for (const key of MODULE_EN_KEYS) {
      const params: Record<string, string> = {};
      // Fill every `{token}` the raw text names (read through a failing call's message).
      for (;;) {
        try {
          const out = t(key, params);
          expect(out).not.toMatch(/[{}]/);
          break;
        } catch (e) {
          const m = /needs the parameter '(\w+)'/.exec((e as Error).message);
          expect(m, `${key}: ${(e as Error).message}`).not.toBeNull();
          params[m![1]!] = 'x';
        }
      }
    }
    expect(() => t('module.nope')).toThrow(/unknown key/);
    expect(() => t('module.detail.leadWarning')).toThrow(/needs the parameter 'n'/);
  });
});

describe('the derivations speak only through the resolver', () => {
  it('describeScope — members-all / state / district (the district one adds the unlisted-district line)', () => {
    expect(describeScope({ version: 1, scope: 'members-all' })).toEqual([t('module.audience.membersAll'), t('module.audience.matchesNobody')]);
    expect(describeScope({ version: 1, scope: 'state', values: ['Bihar', 'Assam'] })).toEqual([
      t('module.audience.state', { places: 'Bihar; Assam' }),
      t('module.audience.noDistrict'),
      t('module.audience.matchesNobody'),
    ]);
    expect(describeScope({ version: 1, scope: 'district', values: ['Patna'] })).toEqual([
      t('module.audience.district', { places: 'Patna' }),
      t('module.audience.noDistrict'),
      t('module.audience.unlistedDistrict'),
      t('module.audience.matchesNobody'),
    ]);
  });

  it('describeEligibility — zero clauses is "no status restriction"; the left-or-erased line always follows', () => {
    expect(describeEligibility({ version: 1, clauses: [] })).toEqual([t('module.eligibility.none'), t('module.eligibility.leftOrErased')]);
    expect(describeEligibility({ version: 1, clauses: [{ kind: 'member_state_in', states: ['lock-in', 'active'] }] })).toEqual([
      t('module.eligibility.onlyThese', { statuses: `${t('module.status.lock-in')}; ${t('module.status.active')}` }),
      t('module.eligibility.leftOrErased'),
    ]);
  });

  it('G18 — "reaches no member" only when EVERY ticked status is one of the four no-member statuses', () => {
    expect(reachesNoMemberYet([])).toBe(false);
    expect(reachesNoMemberYet(['active'])).toBe(true);
    expect(reachesNoMemberYet(['pending-valid', 'active', 'active-in-grace', 'lapsed-unpaid'])).toBe(true);
    expect(reachesNoMemberYet(['active', 'lock-in'])).toBe(false);
    expect(reachesNoMemberYet(['pending-kyc'])).toBe(false);
  });

  it('describePlaces and the C10 warning (none at 0)', () => {
    expect(describePlaces(null)).toBe(t('module.places.unlimited'));
    expect(describePlaces(1)).toBe(t('module.places.one'));
    expect(describePlaces(25)).toBe(t('module.places.count', { n: 25 }));
    expect(leadWarning(0)).toBeNull();
    expect(leadWarning(3)).toBe(t('module.detail.leadWarning', { n: 3 }));
  });

  it('describeInstant shows India time and the browser zone', () => {
    const r = describeInstant('2026-11-01T00:00:00.000Z', 'UTC');
    expect(r.ist).toMatch(/^India time: .*5:30/);
    expect(r.browser).toMatch(/^Your computer’s time: .*12:00/);
  });

  it('moduleErrorGuidance — known codes have their own sentence; tone_review.required is the author sentence', () => {
    expect(moduleErrorGuidance('tone_review.required')).toBe(t('module.detail.authorCannotPublish'));
    expect(moduleErrorGuidance('module.scope_value_unknown')).toBe(t('module.error.scope_value_unknown'));
    expect(moduleErrorGuidance('something.else')).toBe(t('module.error.generic'));
  });
});

describe('time, the request and the 422 mapping', () => {
  it('toIsoOrNull never reaches new Date(""): empty / blank / invalid → null; a value → a UTC Z string', () => {
    expect(toIsoOrNull('')).toBeNull();
    expect(toIsoOrNull('   ')).toBeNull();
    expect(toIsoOrNull('not a date')).toBeNull();
    expect(toIsoOrNull('2026-11-05T10:30')).toMatch(/^2026-11-0\dT\d\d:\d\d:00\.000Z$/);
  });

  const full = (): WizardState => ({
    ...emptyWizardState(),
    partnerId: '0f8fad5b-d9cb-469f-a165-70867728950e',
    nameEn: 'Home loan',
    nameHi: 'गृह ऋण',
    descriptionEn: 'Line one\r\nLine two\rLine three',
    descriptionHi: 'पहली\r\nदूसरी',
    eligibilityMode: 'only',
    eligibilityStates: ['active', 'lock-in'],
    scopeKind: 'district',
    scopeValues: ['Patna ', 'Gaya'],
    validFrom: '2026-11-05T10:30',
    validUntil: '2026-12-05T10:30',
    placesMode: 'fixed',
    places: '25',
    leadHandoffUrl: 'https://leads.partner.example/hdfc',
    secretName: 'hdfc-signing-key',
  });

  it('toAuthorRequest — CRLF / CR → LF, scope values EXACT (TR7), statuses in catalogue order, ⛔ module_id / branding', () => {
    const r = toAuthorRequest(full());
    expect(r.description_en).toBe('Line one\nLine two\nLine three');
    expect(r.description_hi).toBe('पहली\nदूसरी');
    expect(r.scope_filter).toEqual({ version: 1, scope: 'district', values: ['Patna ', 'Gaya'] });
    expect(r.eligibility_filter).toEqual({ version: 1, clauses: [{ kind: 'member_state_in', states: ['lock-in', 'active'] }] });
    expect(r.slot_capacity).toBe(25);
    expect(r.valid_from).toMatch(/Z$/);
    expect(Object.keys(r)).not.toContain('module_id');
    expect(Object.keys(r)).not.toContain('branding_bundle');
    expect(toAuthorRequest({ ...full(), eligibilityMode: 'all', placesMode: 'unlimited', scopeKind: 'members-all' })).toMatchObject({
      eligibility_filter: { version: 1, clauses: [] },
      scope_filter: { version: 1, scope: 'members-all' },
      slot_capacity: null,
    });
  });

  // DN3 (`-435` item 2): the client cleans pasted text so the server's refusals (non-NFC, a space other than U+0020, a
  // doubled space in a name) are not met by an ordinary paste. Built from code points — no invisible character in source.
  it('DN3: normaliseDisplayText — NFC, every other space separator → U+0020, a run of spaces → one in a NAME only', () => {
    const cp = (n: number): string => String.fromCodePoint(n);
    const pasted = `Cafe${cp(0x0301)}${cp(0x00a0)}Care${cp(0x202f)}${cp(0x3000)}plan  2026\r\nnext`;
    expect(normaliseDisplayText(pasted, 'description')).toBe(`Caf${cp(0x00e9)} Care  plan  2026\nnext`);
    expect(normaliseDisplayText(`LIC${cp(0x00a0)}Housing  Finance`, 'name')).toBe('LIC Housing Finance');
    // The precomposed nukta letters are not NFC-stable; NFC writes letter + U+093C (`-435` Consequence 1).
    expect(normaliseDisplayText(`${cp(0x095e)}ायदा`, 'name')).toBe(`${cp(0x092b)}${cp(0x093c)}ायदा`);
    const r = toAuthorRequest({ ...full(), nameEn: `HDFC${cp(0x00a0)}home  loan`, nameHi: `गृह${cp(0x2009)}ऋण` });
    expect(r.name_en).toBe('HDFC home loan');
    expect(r.name_hi).toBe('गृह ऋण');
  });

  // DN5 (`-436` item 1, BigDev "1" read as DN5 1): the other invisible paste artefacts are cleaned too.
  it('DN5: a tab → space; U+2028 / U+2029 / U+0085 → LF in a description, space in a name; soft hyphen, ZWSP, BOM, word joiner removed', () => {
    const cp = (n: number): string => String.fromCodePoint(n);
    const pasted = `LIC${cp(0x09)}Hou${cp(0x00ad)}sing${cp(0x2028)}Fi${cp(0x200b)}nance${cp(0x2029)}Pl${cp(0xfeff)}an${cp(0x0085)}Go${cp(0x2060)}ld`;
    expect(normaliseDisplayText(pasted, 'description')).toBe('LIC Housing\nFinance\nPlan\nGold');
    expect(normaliseDisplayText(pasted, 'name')).toBe('LIC Housing Finance Plan Gold');
    // Removed BEFORE the collapse: a soft hyphen between two spaces cannot leave a doubled space in a name.
    expect(normaliseDisplayText(`LIC ${cp(0x00ad)} Housing${cp(0x09)} ${cp(0x2028)}Plan`, 'name')).toBe('LIC Housing Plan');
  });

  it('DN3: the wizard sends its DESCRIPTIONS cleaned too — other spaces → U+0020, NFC — and keeps their doubled spaces', () => {
    const cp = (n: number): string => String.fromCodePoint(n);
    const r = toAuthorRequest({
      ...full(),
      descriptionEn: `One.${cp(0x00a0)} Two.  Cafe${cp(0x0301)}`,
      descriptionHi: `पहली।${cp(0x202f)} दूसरी ${cp(0x095e)}ायदा`,
    });
    expect(r.description_en).toBe(`One.  Two.  Caf${cp(0x00e9)}`);
    expect(r.description_hi).toBe(`पहली।  दूसरी ${cp(0x092b)}${cp(0x093c)}ायदा`);
  });

  it('DN5: step (a) treats a value made only of characters the cleaning removes as EMPTY', () => {
    const cp = (n: number): string => String.fromCodePoint(n);
    expect(validateStep(step('a'), { ...full(), nameEn: `${cp(0x200b)}${cp(0x00ad)}` })).toBe(t('module.reason.nameEn'));
    expect(validateStep(step('a'), { ...full(), nameHi: `${cp(0x00ad)}${cp(0x2060)}` })).toBe(t('module.reason.nameHi'));
    expect(validateStep(step('a'), { ...full(), descriptionEn: `${cp(0x200b)}${cp(0xfeff)}` })).toBe(t('module.reason.descriptionEn'));
    expect(validateStep(step('a'), { ...full(), descriptionHi: `${cp(0x2060)}${cp(0xfeff)}` })).toBe(t('module.reason.descriptionHi'));
  });

  it('step (a) judges length on the SENT text: NFC can lengthen a Hindi name, collapsing spaces can shorten a name', () => {
    const cp = (n: number): string => String.fromCodePoint(n);
    // 120 precomposed nukta letters are 120 code units as typed and 240 once sent (NFC: letter + U+093C).
    expect(validateStep(step('a'), { ...full(), nameHi: cp(0x095e).repeat(120) })).toBe(t('module.reason.nameTooLong'));
    // 123 as typed, 83 once its doubled spaces collapse — the server would accept it, so the wizard must too.
    const spaced = `LIC${'  x'.repeat(40)}`;
    expect(spaced.length).toBe(123);
    expect(validateStep(step('a'), { ...full(), nameEn: spaced })).toBeNull();
  });

  it('validateStep — each step’s reasons; a complete state has no invalid step', () => {
    const s = emptyWizardState();
    expect(validateStep(step('a'), s)).toBe(t('module.reason.partner'));
    expect(validateStep(step('b'), s)).toBe(t('module.reason.eligibilityMode'));
    expect(validateStep(step('b'), { ...s, eligibilityMode: 'only' })).toBe(t('module.reason.eligibilityStates'));
    expect(validateStep(step('c'), s)).toBe(t('module.reason.scopeKind'));
    expect(validateStep(step('c'), { ...s, scopeKind: 'state' })).toBe(t('module.reason.scopeValues'));
    expect(validateStep(step('c'), { ...s, scopeKind: 'members-all' })).toBeNull();
    expect(validateStep(step('d'), s)).toBe(t('module.reason.validFrom'));
    expect(validateStep(step('d'), { ...s, validFrom: '2026-11-05T10:30', validUntil: '2026-11-05T10:30' })).toBe(t('module.reason.windowOrder'));
    expect(validateStep(step('d'), { ...s, validFrom: '1999-11-05T10:30', validUntil: '2026-11-05T10:30' })).toBe(t('module.reason.windowYear'));
    expect(validateStep(step('e'), s)).toBe(t('module.reason.placesMode'));
    for (const bad of ['0', '-1', '2.5', 'ten', '']) {
      expect(validateStep(step('e'), { ...s, placesMode: 'fixed', places: bad })).toBe(t('module.reason.places'));
    }
    expect(validateStep(step('f'), { ...s, leadHandoffUrl: 'http://x' })).toBe(t('module.reason.leadUrlHttps'));
    expect(validateStep(step('f'), { ...s, leadHandoffUrl: 'https://x', secretName: 'a b' })).toBe(t('module.reason.secretNameShape'));
    expect(firstInvalidStep(full())).toBeNull();
    expect(firstInvalidStep({ ...full(), places: '0' })).toBe(step('e'));
  });

  it('issueToStep / codeToStep — every manifest field maps to the step that owns it', () => {
    expect(issueToStep(['name_hi'])).toBe(step('a'));
    expect(issueToStep(['partner_id'])).toBe(step('a'));
    expect(issueToStep(['eligibility_filter', 'clauses', 0])).toBe(step('b'));
    expect(issueToStep(['scope_filter', 'values', 3])).toBe(step('c'));
    expect(issueToStep(['valid_until'])).toBe(step('d'));
    expect(issueToStep(['slot_capacity'])).toBe(step('e'));
    expect(issueToStep(['lead_handoff_url'])).toBe(step('f'));
    expect(issueToStep(['lead_handoff_signing_key_secret_name'])).toBe(step('f'));
    expect(issueToStep([])).toBe(step('summary'));
    expect(codeToStep('module.scope_value_unknown')).toBe(step('c'));
    expect(codeToStep('module.partner_unknown')).toBe(step('a'));
    expect(codeToStep('module.window_ended')).toBe(step('d'));
    expect(codeToStep('module.manifest_invalid')).toBeNull();
  });

  it('fromModule pre-fills every answer of a module (the corrected copy)', () => {
    const m = {
      partner_id: '0f8fad5b-d9cb-469f-a165-70867728950e',
      name_en: 'Home loan',
      name_hi: 'गृह ऋण',
      description_en: 'd',
      description_hi: 'द',
      eligibility_filter: { version: 1, clauses: [{ kind: 'member_state_in', states: ['active'] }] },
      scope_filter: { version: 1, scope: 'state', values: ['Bihar'] },
      valid_from: '2026-11-05T05:00:00.000Z',
      valid_until: '2026-12-05T05:00:00.000Z',
      slot_capacity: null,
      lead_handoff_url: 'https://x.example/y',
      lead_handoff_signing_key_secret_name: 'k',
    } as unknown as ModuleDetailResponse;
    const s = fromModule(m);
    expect(s).toMatchObject({
      partnerId: m.partner_id,
      eligibilityMode: 'only',
      eligibilityStates: ['active'],
      scopeKind: 'state',
      scopeValues: ['Bihar'],
      placesMode: 'unlimited',
      leadHandoffUrl: 'https://x.example/y',
      secretName: 'k',
    });
    expect(toIsoOrNull(s.validFrom)).toBe('2026-11-05T05:00:00.000Z');
  });
});

// ── Code review round 1, chunk C ──────────────────────────────────────────────────────────────────────

describe('review round 1 (chunk C) — derivations', () => {
  it('RP22: the API’s permission-denied code `authz.forbidden` has its own sentence (it was keyed `auth.forbidden`, which nothing emits)', () => {
    expect(moduleErrorGuidance('authz.forbidden')).toBe(t('module.error.forbidden'));
    expect(moduleErrorGuidance('authz.forbidden', 'detail')).toBe(t('module.error.forbidden'));
    expect(moduleErrorGuidance('auth.forbidden')).toBe(t('module.error.generic')); // the old, dead key is gone
  });

  it('RP24: `module.window_ended` has two sentences — the wizard can edit a closing time, the detail page cannot', () => {
    expect(moduleErrorGuidance('module.window_ended')).toBe(t('module.error.window_ended'));
    expect(moduleErrorGuidance('module.window_ended', 'wizard')).toBe(t('module.error.window_ended'));
    expect(moduleErrorGuidance('module.window_ended', 'detail')).toBe(t('module.error.window_ended_detail'));
    expect(moduleErrorGuidance('module.window_ended', 'detail')).not.toBe(moduleErrorGuidance('module.window_ended'));
    // Every other code reads the same on both surfaces.
    expect(moduleErrorGuidance('module.not_draft', 'detail')).toBe(moduleErrorGuidance('module.not_draft'));
  });

  it('RP26: the lead address is capped at the DTO’s 4096 characters, with its own reason', () => {
    const base = { ...emptyWizardState(), secretName: 'k' };
    const url = (n: number): string => `https://x.example/${'a'.repeat(n - 'https://x.example/'.length)}`;
    expect(validateStep(step('f'), { ...base, leadHandoffUrl: url(4096) })).toBeNull();
    expect(validateStep(step('f'), { ...base, leadHandoffUrl: url(4097) })).toBe(t('module.reason.leadUrlTooLong'));
  });

  it('RP28: `eligibilityStatesOf` reads the statuses a filter names (none for "no restriction")', () => {
    expect(eligibilityStatesOf({ version: 1, clauses: [] })).toEqual([]);
    expect(eligibilityStatesOf({ version: 1, clauses: [{ kind: 'member_state_in', states: ['active', 'lock-in'] }] })).toEqual(['active', 'lock-in']);
    expect(reachesNoMemberYet(eligibilityStatesOf({ version: 1, clauses: [{ kind: 'member_state_in', states: ['active'] }] }))).toBe(true);
    expect(reachesNoMemberYet(eligibilityStatesOf({ version: 1, clauses: [] }))).toBe(false);
  });

  it('RP31: a 422 issue on a single-input field is named in the banner; any other path gets the plain sentence', () => {
    expect(issueFieldName(['name_hi'])).toBe('name_hi');
    expect(issueFieldName(['lead_handoff_signing_key_secret_name'])).toBe('lead_handoff_signing_key_secret_name');
    expect(issueFieldName(['scope_filter', 'values', 3])).toBeNull(); // several inputs — no single field to mark
    expect(issueFieldName([])).toBeNull();
    expect(issueFieldName(undefined)).toBeNull();
    expect(issueMessage(['name_hi'], 'must contain Hindi')).toBe(t('module.wizard.issueField', { field: t('module.field.nameHi'), message: 'must contain Hindi' }));
    expect(issueMessage(['eligibility_filter'], 'bad')).toBe(t('module.wizard.issue', { message: 'bad' }));
  });

  it('RP18: `attemptKey` keeps its key for an unchanged body, mints a new one for a changed body or a cleared attempt', () => {
    const ref: { current: AttemptKey | null } = { current: null };
    const first = attemptKey(ref, { a: 1, b: 'x' });
    expect(first).toEqual(expect.any(String));
    expect(attemptKey(ref, { a: 1, b: 'x' })).toBe(first); // a genuine retry replays
    expect(attemptKey(ref, { a: 2, b: 'x' })).not.toBe(first); // an edit is a new attempt…
    const second = ref.current!.key;
    expect(attemptKey(ref, { a: 2, b: 'x' })).toBe(second); // …which then keeps ITS key
    ref.current = null; // cleared after a success or a cancel
    expect(attemptKey(ref, { a: 2, b: 'x' })).not.toBe(second);
  });

  it('RP35: `toIsoOrNull` reads a datetime-local value in the BROWSER zone (a UTC-parsing regression changes the instant)', () => {
    const was = process.env['TZ'];
    try {
      process.env['TZ'] = 'Asia/Kolkata'; // UTC+05:30, no DST
      expect(toIsoOrNull('2026-11-05T10:30')).toBe('2026-11-05T05:00:00.000Z');
      process.env['TZ'] = 'America/New_York'; // UTC-05:00 on this date
      expect(toIsoOrNull('2026-11-05T10:30')).toBe('2026-11-05T15:30:00.000Z');
      process.env['TZ'] = 'UTC';
      expect(toIsoOrNull('2026-11-05T10:30')).toBe('2026-11-05T10:30:00.000Z');
    } finally {
      if (was === undefined) delete process.env['TZ'];
      else process.env['TZ'] = was;
    }
  });
});

describe('review round 2 (chunk C) — derivations', () => {
  it('RC16: leadWarning says "1 member" for one, "{n} members" for more', () => {
    expect(leadWarning(1)).toBe(t('module.detail.leadWarningOne'));
    expect(leadWarning(2)).toBe(t('module.detail.leadWarning', { n: 2 }));
  });

  it('RC16: the publication line says "goes live at its opening time" only while the offer is scheduled', () => {
    const p = { published_event_type: 'module.scheduled' as const, reviewer_display_name: 'Ravi', reviewed_at: '2026-11-02T05:00:00.000Z' };
    const at = formatIst(p.reviewed_at);
    expect(describePublication(null, 'draft')).toBe(t('module.detail.notPublished'));
    expect(describePublication(p, 'scheduled')).toBe(t('module.detail.publishedScheduled', { name: 'Ravi', at }));
    expect(describePublication(p, 'active')).toBe(t('module.detail.publishedActive', { name: 'Ravi', at }));
    expect(describePublication(p, 'archived')).toBe(t('module.detail.publishedActive', { name: 'Ravi', at }));
  });

  it('RC8: a scope_value_unknown refusal names the refused places; without usable values, the fixed sentence', () => {
    expect(scopeUnknownMessage({ scope: 'district', values: ['Patna', 'Gaya'] })).toBe(
      t('module.error.scope_value_unknown_named', { places: 'Patna; Gaya' }),
    );
    expect(t('module.error.scope_value_unknown_named', { places: 'Patna; Gaya' })).toBe(
      'These chosen places are not recorded for this Pariwar any more: Patna; Gaya. Remove them, then choose again.',
    );
    expect(scopeUnknownMessage({ values: [] })).toBe(t('module.error.scope_value_unknown'));
    expect(scopeUnknownMessage(undefined)).toBe(t('module.error.scope_value_unknown'));
    expect(scopeUnknownMessage({ values: [1, 2] })).toBe(t('module.error.scope_value_unknown'));
  });

  it('RC1 / RC5: the new sentences', () => {
    expect(t('module.detail.created')).toBe('Draft created.');
    expect(t('module.partner.notListed')).toBe('The chosen partner (not in the list shown here)');
    expect(t('module.list.moreError')).toBe('Could not load more offers. Try again.');
  });
});

describe('patch-diff review of round 2 (PT) — derivations', () => {
  it('PT14: the scope_value_unknown banner names the first five places, then "and n more"', () => {
    const seven = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
    expect(scopeUnknownMessage({ values: seven })).toBe(
      t('module.error.scope_value_unknown_named', { places: t('module.error.placesAndMore', { places: 'A; B; C; D; E', n: 2 }) }),
    );
    expect(t('module.error.placesAndMore', { places: 'A; B; C; D; E', n: 2 })).toBe('A; B; C; D; E; and 2 more');
    expect(scopeUnknownMessage({ values: seven.slice(0, 5) })).toBe(t('module.error.scope_value_unknown_named', { places: 'A; B; C; D; E' }));
  });
});
