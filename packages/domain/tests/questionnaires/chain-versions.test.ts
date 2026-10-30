// Story 6.33 (Task 1; AC1 / AC12) — the validator admits CHAIN versions (database-stored, `2026-10-10-304` Q7 / Q8) and
// nothing else new: the origin input, the server-stamped chain record, the ruled-question lock against the RECORDED
// ruled base (QE5 / TR11), QE8's checklist C1–C8 and C10 (one leg each), the C9 warnings, QE10's counsel basis, QE3's
// floor; and the pure chain helpers (`derive.ts` — the stage by `seq`, the live candidates with the revert rule, the
// change markers, the server-side ruled replacement, the counsel-basis overlay).

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  CHAIN_RESERVED_QUESTION_KEYS,
  COUNSEL_BASIS_DECISIONS,
  GROUND_INSPECTION_QUESTIONNAIRE_V1,
  PEER_MESH_QUESTIONNAIRE_V3,
  PEER_MESH_QUESTIONNAIRE_V4,
  QUESTIONNAIRE_REGISTRY,
  canTakeStep,
  changeMarkers,
  forbiddenTopicMatch,
  hasUnstorableText,
  liveCandidates,
  newestCodeVersion,
  overlayCounselBasis,
  questionnaireDefinitionProblems,
  questionnaireDefinitionWarnings,
  questionsOf,
  replaceRuledQuestions,
  ruledQuestionKeysFor,
  versionStage,
  type QuestionDefinition,
  type QuestionnaireDefinition,
  type QuestionnaireValidationContext,
} from '../../src/questionnaires/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.resolve(here, '../../src');

const CHAIN_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const CHAIN = `chain:${CHAIN_ID}`;
const P1 = '11111111-1111-4111-8111-111111111111';
const P2 = '22222222-2222-4222-8222-222222222222';

/** A chain question (QE8 C1–C8 / C10 all satisfied). */
function chainQ(over: Partial<QuestionDefinition> & Record<string, unknown> = {}): QuestionDefinition {
  return {
    key: 'water_source',
    kind: 'single',
    text: { en: 'Where did {member} get water?', hi: '{member} पानी कहाँ से लाते थे?' },
    options: [
      { code: 'well', text: { en: 'A well', hi: 'कुआँ' } },
      { code: 'tap', text: { en: 'A tap', hi: 'नल' } },
    ],
    optional: true,
    showIf: null,
    sensitive: true,
    warning: false,
    approvedBy: [CHAIN],
    health: false,
    counselBasis: null,
    ...over,
  } as QuestionDefinition;
}

/** A DB version: the ruled base's pages + the chain questions, one per page. */
function dbVersion(base: QuestionnaireDefinition, extra: readonly QuestionDefinition[] = [chainQ()], version = 1000): QuestionnaireDefinition {
  return {
    ...base,
    versionId: `${base.kind}.v${version}`,
    version,
    approvedBy: [...base.approvedBy, CHAIN],
    pages: [...base.pages, ...extra.map((q) => ({ questions: [q] }))],
  };
}
const db = (ruledBase: QuestionnaireDefinition = PEER_MESH_QUESTIONNAIRE_V4, chainId = CHAIN_ID): QuestionnaireValidationContext => ({
  origin: 'db',
  chainId,
  ruledBase,
});
const problems = (d: QuestionnaireDefinition, ctx: QuestionnaireValidationContext = db()) => questionnaireDefinitionProblems(d, ctx).join(' | ');
const mapQ = (d: QuestionnaireDefinition, key: string, f: (q: QuestionDefinition) => QuestionDefinition): QuestionnaireDefinition => ({
  ...d,
  pages: d.pages.map((p) => ({ questions: p.questions.map((q) => (q.key === key ? f(q) : q)) })),
});

describe('AC1 — the origin input; every code version still validates', () => {
  it('every registered code version validates as { origin: code } (the default)', () => {
    for (const def of QUESTIONNAIRE_REGISTRY) {
      expect(questionnaireDefinitionProblems(def)).toEqual([]);
      expect(questionnaireDefinitionProblems(def, { origin: 'code' })).toEqual([]);
    }
  });
  it('a DB peer_mesh version with one chain question on the v4 ruled base is valid; a ground_inspection one on v1 too', () => {
    expect(problems(dbVersion(PEER_MESH_QUESTIONNAIRE_V4))).toBe('');
    expect(problems(dbVersion(GROUND_INSPECTION_QUESTIONNAIRE_V1), db(GROUND_INSPECTION_QUESTIONNAIRE_V1))).toBe('');
  });
  it('a CODE version citing a chain record is refused — at the version and on a question', () => {
    const v = { ...PEER_MESH_QUESTIONNAIRE_V4, approvedBy: [...PEER_MESH_QUESTIONNAIRE_V4.approvedBy, CHAIN] };
    expect(problems(v, { origin: 'code' })).toMatch(/chain record/);
    const q = mapQ(PEER_MESH_QUESTIONNAIRE_V4, 'how_known', (x) => ({ ...x, approvedBy: [CHAIN] }));
    expect(problems(q, { origin: 'code' })).toMatch(/chain record/);
  });
  it('QE3 — a CODE version >= 1000 is refused; a DB version < 1000 is refused', () => {
    const code = { ...PEER_MESH_QUESTIONNAIRE_V4, versionId: 'peer_mesh.v1000', version: 1000 };
    expect(problems(code, { origin: 'code' })).toMatch(/below 1000/);
    expect(problems(dbVersion(PEER_MESH_QUESTIONNAIRE_V4, [chainQ()], 999))).toMatch(/from 1000/);
  });
  it('the VERSION-level approvedBy is exactly the ruled base\'s Panel ids + chain:<this id>', () => {
    const ok = dbVersion(PEER_MESH_QUESTIONNAIRE_V4);
    expect(problems({ ...ok, approvedBy: PEER_MESH_QUESTIONNAIRE_V4.approvedBy })).toMatch(/version.*approvedBy/);
    expect(problems({ ...ok, approvedBy: [...ok.approvedBy, '2026-10-10-310'] })).toMatch(/version.*approvedBy/);
    expect(problems({ ...ok, approvedBy: [...PEER_MESH_QUESTIONNAIRE_V4.approvedBy, 'chain:bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'] })).toMatch(
      /approvedBy/,
    );
  });
  it('the chain record is a uuid — a context id that is not one is refused (the regex is ⛔ "any string")', () => {
    const bad = 'not-a-uuid';
    const v = { ...dbVersion(PEER_MESH_QUESTIONNAIRE_V4, [chainQ({ approvedBy: [`chain:${bad}`] })]), approvedBy: [...PEER_MESH_QUESTIONNAIRE_V4.approvedBy, `chain:${bad}`] };
    expect(problems(v, db(PEER_MESH_QUESTIONNAIRE_V4, bad))).toMatch(/chain record/);
    const upper = CHAIN_ID.toUpperCase();
    const u = { ...dbVersion(PEER_MESH_QUESTIONNAIRE_V4, [chainQ({ approvedBy: [`chain:${upper}`] })]), approvedBy: [...PEER_MESH_QUESTIONNAIRE_V4.approvedBy, `chain:${upper}`] };
    expect(problems(u, db(PEER_MESH_QUESTIONNAIRE_V4, upper))).toMatch(/chain record/);
  });
  it('a ruled base of another kind, or a DB version as the ruled base, is refused', () => {
    expect(problems(dbVersion(PEER_MESH_QUESTIONNAIRE_V4), db(GROUND_INSPECTION_QUESTIONNAIRE_V1))).toMatch(/ruled base/);
    const dbBase = dbVersion(PEER_MESH_QUESTIONNAIRE_V4);
    expect(problems(dbVersion(PEER_MESH_QUESTIONNAIRE_V4), db(dbBase))).toMatch(/ruled base/);
  });
});

describe('AC1 / QE4 — words: exactly one of copyKey / text, by typeof; stored text', () => {
  it('a chain question with a copy key (⛔ text) is refused; so is an option with a copy key', () => {
    const noText = Object.fromEntries(Object.entries(chainQ()).filter(([k]) => k !== 'text'));
    expect(problems(dbVersion(PEER_MESH_QUESTIONNAIRE_V4, [{ ...noText, copyKey: 'peer_request_questions.has_died.question' } as QuestionDefinition]))).toMatch(/stored text/);
    const opt = chainQ({ options: [{ code: 'well', copyKey: 'peer_request_questions.has_died.died' }, { code: 'tap', text: { en: 'A tap', hi: 'नल' } }] });
    expect(problems(dbVersion(PEER_MESH_QUESTIONNAIRE_V4, [opt]))).toMatch(/option 'well'.*stored text/);
  });
  it('BOTH copyKey and text, or NEITHER, is refused (code versions too)', () => {
    expect(problems(dbVersion(PEER_MESH_QUESTIONNAIRE_V4, [chainQ({ copyKey: 'a.b' })]))).toMatch(/exactly one of copyKey \/ text/);
    const neither = Object.fromEntries(Object.entries(chainQ()).filter(([k]) => k !== 'text'));
    expect(problems(dbVersion(PEER_MESH_QUESTIONNAIRE_V4, [neither as QuestionDefinition]))).toMatch(/exactly one of copyKey \/ text/);
    const code = mapQ(PEER_MESH_QUESTIONNAIRE_V4, 'how_known', (q) => ({ ...q, text: { en: 'x', hi: 'y' } }));
    expect(problems(code, { origin: 'code' })).toMatch(/exactly one of copyKey \/ text/);
  });
  it('text: both languages, non-empty, trimmed, ≤ 500 — checked by typeof', () => {
    const bad = (text: unknown) => problems(dbVersion(PEER_MESH_QUESTIONNAIRE_V4, [chainQ({ text } as never)]));
    expect(bad({ en: '', hi: 'क' })).toMatch(/text/);
    expect(bad({ en: 'x', hi: ' क' })).toMatch(/text/);
    expect(bad({ en: 'x'.repeat(501), hi: 'क' })).toMatch(/text/);
    expect(bad({ en: 'x' })).toMatch(/text/);
    expect(bad({ en: 'x', hi: 5 })).toMatch(/text/);
    expect(bad('Where?')).toMatch(/exactly one of copyKey \/ text/);
    expect(bad({ en: 'x'.repeat(500), hi: 'क' })).toBe('');
  });
  it('C10 — every {…} in stored text is exactly {member}', () => {
    const bad = (en: string, hi = 'क') => problems(dbVersion(PEER_MESH_QUESTIONNAIRE_V4, [chainQ({ text: { en, hi } })]));
    expect(bad('Did {name} farm?')).toMatch(/\{member\}/);
    expect(bad('Did {member} farm?', '{सदस्य} खेती करते थे?')).toMatch(/\{member\}/);
    expect(bad('Did { member } farm?')).toMatch(/\{member\}/);
    expect(bad('Did {member} farm? {}')).toMatch(/\{member\}/);
    expect(bad('Did {member} farm, {member}?')).toBe('');
    const opt = chainQ({ options: [{ code: 'well', text: { en: '{x}', hi: 'क' } }, { code: 'tap', text: { en: 'A tap', hi: 'नल' } }] });
    expect(problems(dbVersion(PEER_MESH_QUESTIONNAIRE_V4, [opt]))).toMatch(/\{member\}/);
  });
});

describe('AC1 / QE4 — a chain question is decided by ORIGIN, ⛔ by approvedBy', () => {
  it("a DB question citing a Panel id escapes ⛔ chain rule (approvedBy is exactly ['chain:<id>'])", () => {
    const sneaky = chainQ({ key: 'habits', approvedBy: ['2026-10-10-304'], sensitive: false });
    const p = problems(dbVersion(PEER_MESH_QUESTIONNAIRE_V4, [sneaky]));
    expect(p).toMatch(/approvedBy is exactly \['chain:/);
    expect(p).toMatch(/sensitive/);
    expect(problems(dbVersion(PEER_MESH_QUESTIONNAIRE_V4, [chainQ({ approvedBy: [CHAIN, '2026-10-10-304'] })]))).toMatch(/approvedBy is exactly/);
  });
});

describe('AC1 / QE5 — the ruled questions are LOCKED to the recorded ruled base (TR11)', () => {
  const v = dbVersion(PEER_MESH_QUESTIONNAIRE_V4);
  it.each([
    ['copyKey', (q: QuestionDefinition) => ({ ...q, copyKey: 'peer_request_questions.how_known.other' })],
    ['an option dropped', (q: QuestionDefinition) => ({ ...q, options: q.options.slice(1) })],
    ['approvedBy', (q: QuestionDefinition) => ({ ...q, approvedBy: ['2026-10-10-310'] })],
    ['showIf', (q: QuestionDefinition) => ({ ...q, showIf: { key: 'has_died', anyOf: ['died'] } })],
    ['stored text instead of the copy key', (q: QuestionDefinition) => ({ ...q, copyKey: undefined, text: { en: 'How?', hi: 'कैसे?' } })],
  ])('a ruled question with a changed %s is refused', (_label, f) => {
    expect(problems(mapQ(v, 'how_known', f))).toMatch(/ruled question 'how_known' is locked/);
  });
  // Review RV31 — the lock is GENERIC over both kinds (`ruledQuestionKeysFor(kind)`), but only `peer_mesh` was exercised.
  it.each(['head_letter', 'death_cause', 'death_illness'])('ground_inspection — a ruled question %s with a dropped option is refused too', (key) => {
    const g = dbVersion(GROUND_INSPECTION_QUESTIONNAIRE_V1);
    expect(problems(g, db(GROUND_INSPECTION_QUESTIONNAIRE_V1))).toBe('');
    expect(problems(mapQ(g, key, (q) => ({ ...q, options: q.options.slice(1) })), db(GROUND_INSPECTION_QUESTIONNAIRE_V1))).toMatch(new RegExp(`ruled question '${key}' is locked`));
  });
  it("ground_inspection — the ruled HEALTH questions' counselBasis is EXCLUDED from the lock too (overlaid at read), the other fields are not", () => {
    const g = dbVersion(GROUND_INSPECTION_QUESTIONNAIRE_V1);
    const ctx = db(GROUND_INSPECTION_QUESTIONNAIRE_V1);
    expect(problems(mapQ(g, 'death_cause', (q) => ({ ...q, counselBasis: '2026-11-01-500' })), ctx)).toBe('');
    expect(problems(mapQ(g, 'death_cause', (q) => ({ ...q, counselBasis: '2026-11-01-500', sensitive: false })), ctx)).toMatch(/locked/);
  });
  it('the closing note and the thank-you are part of the lock', () => {
    expect(problems({ ...v, closingNoteCopyKey: 'peer_request_questions.thank_you' })).toMatch(/closing note/);
    expect(problems({ ...v, thankYouCopyKey: 'peer_request_questions.closing_note' })).toMatch(/thank-you/);
  });
  it("the ruled HEALTH questions' counselBasis is EXCLUDED from the lock (overlaid at read — R3)", () => {
    const recorded = mapQ(v, 'death_cause', (q) => ({ ...q, counselBasis: '2026-11-01-500' }));
    expect(problems(recorded)).toBe('');
  });
  it('a version on an OLDER ruled base validates against ITS OWN recorded base (⛔ the newest code at read)', () => {
    const onV3 = dbVersion(PEER_MESH_QUESTIONNAIRE_V3);
    expect(problems(onV3, db(PEER_MESH_QUESTIONNAIRE_V3))).toBe('');
    expect(problems(onV3, db(PEER_MESH_QUESTIONNAIRE_V4))).toMatch(/locked/);
  });
});

describe('AC1 / QE8 — the checklist, one leg per VALIDATOR line', () => {
  const pm = (q: QuestionDefinition) => problems(dbVersion(PEER_MESH_QUESTIONNAIRE_V4, [q]));
  const gi = (q: QuestionDefinition) => problems(dbVersion(GROUND_INSPECTION_QUESTIONNAIRE_V1, [q]), db(GROUND_INSPECTION_QUESTIONNAIRE_V1));
  it('C1 — ⛔ a reserved key of EITHER kind; ≤ 64 chars', () => {
    expect(pm(chainQ({ key: 'head_letter' }))).toMatch(/C1/);
    expect(gi(chainQ({ key: 'has_died' }))).toMatch(/C1/);
    expect(gi(chainQ({ key: 'callback_consent' }))).toMatch(/C1/);
    expect(gi(chainQ({ key: 'how_known' }))).toMatch(/C1/);
    expect(pm(chainQ({ key: `k${'x'.repeat(64)}` }))).toMatch(/C1/);
    expect(pm(chainQ({ key: `k${'x'.repeat(63)}` }))).toBe('');
    for (const k of ['has_died', 'death_date', 'death_cause', 'death_illness', 'head_letter', 'callback_consent', 'how_known', 'relationship']) {
      expect(CHAIN_RESERVED_QUESTION_KEYS).toContain(k);
    }
  });
  it('C2 — ⛔ a date question', () => {
    expect(pm(chainQ({ kind: 'date', options: [{ code: 'unknown', text: { en: "I don't know", hi: 'पता नहीं' } }] }))).toMatch(/C2/);
  });
  it('C3 — ≤ 20 options; ground_inspection ≤ 10', () => {
    const opts = (n: number) => Array.from({ length: n }, (_, i) => ({ code: `o${i}`, text: { en: `Option ${i}`, hi: `विकल्प ${i}` } }));
    expect(pm(chainQ({ options: opts(21) }))).toMatch(/C3/);
    expect(pm(chainQ({ options: opts(20) }))).toBe('');
    expect(gi(chainQ({ options: opts(11) }))).toMatch(/C3/);
    expect(gi(chainQ({ options: opts(10) }))).toBe('');
  });
  it('C4 — optional; ⛔ warning; ⛔ callbackAudience', () => {
    expect(pm(chainQ({ optional: false }))).toMatch(/C4/);
    expect(pm(chainQ({ warning: true }))).toMatch(/C4/);
    expect(pm(chainQ({ callbackAudience: 'admin' }))).toMatch(/C4/);
    expect(gi(chainQ({ optional: 'true' } as never))).toMatch(/C4/);
  });
  it('C5 — sensitive ALWAYS, checked === true (⛔ truthy)', () => {
    expect(pm(chainQ({ sensitive: false }))).toMatch(/C5/);
    expect(pm(chainQ({ sensitive: 'true' } as never))).toMatch(/C5/);
    expect(pm(chainQ({ sensitive: 1 } as never))).toMatch(/C5/);
  });
  it('C6 — ⛔ alcohol in stored words, English AND Hindi, question AND option; the "drinking water" false positive is refused (stated)', () => {
    expect(pm(chainQ({ text: { en: 'Did {member} drink alcohol?', hi: 'क' } }))).toMatch(/alcohol/);
    expect(pm(chainQ({ text: { en: 'Habits', hi: 'क्या {member} शराब पीते थे?' } }))).toMatch(/alcohol/);
    for (const term of ['दारू', 'मदिरा', 'नशा', 'ठर्रा']) expect(pm(chainQ({ text: { en: 'Habits', hi: term } }))).toMatch(/alcohol/);
    const opt = chainQ({ options: [{ code: 'well', text: { en: 'Liquor shop', hi: 'क' } }, { code: 'tap', text: { en: 'A tap', hi: 'नल' } }] });
    expect(pm(opt)).toMatch(/alcohol/);
    expect(pm(chainQ({ text: { en: 'Where did {member} get drinking water?', hi: 'क' } }))).toMatch(/alcohol/);
  });
  it('review RV27 / RP1 — the variant spellings are refused and an INVISIBLE character inside a term does not evade the match; ⛔ innocent bereavement wording is refused', () => {
    for (const term of ['daru', 'daaru', 'Daru', 'sharaab', 'दारु', 'दारू']) expect(pm(chainQ({ text: { en: 'Habits', hi: term } })), term).toMatch(/alcohol/);
    // built with fromCharCode — ⛔ an escape sequence in source
    const zwj = String.fromCharCode(0x200d);
    const zwsp = String.fromCharCode(0x200b);
    const shy = String.fromCharCode(0x00ad);
    const invisiblePlus = String.fromCharCode(0x2061);
    const rlo = String.fromCharCode(0x202e);
    const vs16 = String.fromCharCode(0xfe0f);
    const cgj = String.fromCharCode(0x034f);
    expect(pm(chainQ({ text: { en: 'Habits', hi: `क्या शरा${zwj}ब पीते थे?` } }))).toMatch(/alcohol/);
    expect(pm(chainQ({ text: { en: `Did {member} take alco${zwsp}hol?`, hi: 'क' } }))).toMatch(/alcohol/);
    expect(pm(chainQ({ text: { en: `Did {member} take li${shy}quor?`, hi: 'क' } }))).toMatch(/alcohol/);
    expect(pm(chainQ({ text: { en: `Did {member} take alco${invisiblePlus}hol?`, hi: 'क' } }))).toMatch(/alcohol/);
    expect(pm(chainQ({ text: { en: `Did {member} take al${rlo}cohol?`, hi: 'क' } }))).toMatch(/alcohol/);
    expect(pm(chainQ({ text: { en: `Did {member} take alco${vs16}hol?`, hi: 'क' } }))).toMatch(/alcohol/);
    expect(pm(chainQ({ text: { en: `Did {member} take alco${cgj}hol?`, hi: 'क' } }))).toMatch(/alcohol/);
    // full-width Latin folds under NFKC (NFC left it alone)
    expect(pm(chainQ({ text: { en: 'Did {member} take ＡＬＣＯＨＯＬ?', hi: 'क' } }))).toMatch(/alcohol/);
    expect(forbiddenTopicMatch(`sha${zwj}raab`)).toBe('sharaab');
    // ⭐ the REGRESSION the first widening made: the commonest condolence word and an ordinary place name are ⛔ refused
    for (const innocent of ['इस दारुण घटना के बाद', 'दारुण दुःख', 'दारूण', 'Daruka village', 'darumaa', 'Dara', 'Where did {member} get water?']) {
      expect(forbiddenTopicMatch(innocent), innocent).toBeNull();
      expect(pm(chainQ({ text: { en: 'Habits', hi: innocent } })), innocent).not.toMatch(/alcohol/);
    }
    // stated: a substring term still over-blocks "drinking water" (CF3 (c) is a prohibition)
    expect(forbiddenTopicMatch('drinking water')).toBe('drink');
    // ⚠ NOT the whole control: a spelling it does not list passes — the approver's classification tick is the other half (QE10)
    expect(forbiddenTopicMatch('sura')).toBeNull();
  });
  it('review RV22 — a NUL or a LONE surrogate in stored words is a PROBLEM (a 422), ⛔ a Postgres 22P05 on insert; a valid surrogate PAIR is fine', () => {
    const nul = String.fromCharCode(0);
    const lone = String.fromCharCode(0xd800);
    const stray = String.fromCharCode(0xdc00);
    const pair = String.fromCharCode(0xd83d, 0xde00);
    expect(hasUnstorableText(`Water${nul}`)).toBe(true);
    expect(hasUnstorableText(`Water${lone}`)).toBe(true);
    expect(hasUnstorableText(`${stray}Water`)).toBe(true);
    expect(hasUnstorableText(`${lone}${lone}`)).toBe(true);
    expect(hasUnstorableText(`Water ${pair}`)).toBe(false);
    expect(hasUnstorableText('पानी')).toBe(false);
    expect(pm(chainQ({ text: { en: `Where did {member} get water${nul}?`, hi: 'क' } }))).toMatch(/cannot be stored/);
    expect(pm(chainQ({ text: { en: 'Where did {member} get water?', hi: `क${lone}` } }))).toMatch(/cannot be stored/);
    expect(pm(chainQ({ options: [{ code: 'well', text: { en: `A well${nul}`, hi: 'कुआँ' } }, { code: 'tap', text: { en: 'A tap', hi: 'नल' } }] }))).toMatch(/cannot be stored/);
    expect(pm(chainQ({ text: { en: `Where did {member} get water ${pair}?`, hi: 'क' } }))).toBe('');
  });
  it("C7 / QE10 — a chain health question: 'pending' admitted (held, ⛔ served); a basis only from COUNSEL_BASIS_DECISIONS (empty)", () => {
    expect(COUNSEL_BASIS_DECISIONS).toEqual([]);
    expect(pm(chainQ({ health: true, counselBasis: 'pending' }))).toBe('');
    expect(pm(chainQ({ health: true, counselBasis: '2026-10-10-304' }))).toMatch(/COUNSEL_BASIS_DECISIONS/);
    expect(pm(chainQ({ health: true, counselBasis: null }))).toMatch(/counselBasis/);
    expect(pm(chainQ({ health: 'yes' } as never))).toMatch(/health/);
  });
  it('C8 — ≤ 20 questions IN TOTAL, the ruled ones included', () => {
    const many = (n: number) => Array.from({ length: n }, (_, i) => chainQ({ key: `extra_${i}` }));
    expect(questionsOf(PEER_MESH_QUESTIONNAIRE_V4)).toHaveLength(7);
    expect(problems(dbVersion(PEER_MESH_QUESTIONNAIRE_V4, many(13)))).toBe('');
    expect(problems(dbVersion(PEER_MESH_QUESTIONNAIRE_V4, many(14)))).toMatch(/C8/);
  });
});

describe('AC1 / QE8 C9 — the warnings (⛔ refusals)', () => {
  it('a chain question whose showIf parent is a pending health question is a WARNING; the version still validates', () => {
    const dep = chainQ({ key: 'which_hospital', showIf: { key: 'death_cause', anyOf: ['illness_long'] } });
    const v = dbVersion(PEER_MESH_QUESTIONNAIRE_V4, [dep]);
    expect(problems(v)).toBe('');
    expect(questionnaireDefinitionWarnings(v).join(' ')).toMatch(/which_hospital/);
    expect(questionnaireDefinitionWarnings(dbVersion(PEER_MESH_QUESTIONNAIRE_V4))).toEqual([]);
    for (const def of QUESTIONNAIRE_REGISTRY) expect(questionnaireDefinitionWarnings(def)).toEqual([]);
  });
});

describe('derive.ts — the chain helpers (pure)', () => {
  it('ruledQuestionKeysFor + newestCodeVersion = the highest all-Pariwar CODE version of the kind', () => {
    expect(ruledQuestionKeysFor('peer_mesh')).toHaveLength(7);
    expect(ruledQuestionKeysFor('ground_inspection')).toEqual(['head_letter', 'death_cause', 'death_illness']);
    expect(newestCodeVersion('peer_mesh').versionId).toBe('peer_mesh.v4');
    expect(newestCodeVersion('ground_inspection').versionId).toBe('ground_inspection.v1');
  });
  it('replaceRuledQuestions — the server REPLACES the submitted ruled questions and the closing / thank-you keys', () => {
    const tampered = {
      ...mapQ(dbVersion(PEER_MESH_QUESTIONNAIRE_V3), 'how_known', (q) => ({ ...q, copyKey: 'x.y' })),
      closingNoteCopyKey: 'x.z',
    };
    const out = replaceRuledQuestions(tampered, PEER_MESH_QUESTIONNAIRE_V4);
    expect(questionsOf(out).find((q) => q.key === 'how_known')).toEqual(questionsOf(PEER_MESH_QUESTIONNAIRE_V4).find((q) => q.key === 'how_known'));
    expect(questionsOf(out).find((q) => q.key === 'relationship')).toEqual(questionsOf(PEER_MESH_QUESTIONNAIRE_V4).find((q) => q.key === 'relationship'));
    expect(out.closingNoteCopyKey).toBe(PEER_MESH_QUESTIONNAIRE_V4.closingNoteCopyKey);
    expect(questionsOf(out).find((q) => q.key === 'water_source')).toEqual(chainQ());
  });
  it("overlayCounselBasis — the ruled health questions' basis comes from the newest code version (R3); chain questions untouched", () => {
    const recordedCode = mapQ(PEER_MESH_QUESTIONNAIRE_V4, 'death_cause', (q) => ({ ...q, counselBasis: '2026-11-01-500' }));
    const v = dbVersion(PEER_MESH_QUESTIONNAIRE_V4, [chainQ({ key: 'diet', health: true, counselBasis: 'pending' })]);
    const out = overlayCounselBasis(v, recordedCode);
    expect(questionsOf(out).find((q) => q.key === 'death_cause')?.counselBasis).toBe('2026-11-01-500');
    expect(questionsOf(out).find((q) => q.key === 'death_illness')?.counselBasis).toBe('pending');
    expect(questionsOf(out).find((q) => q.key === 'diet')?.counselBasis).toBe('pending');
  });
  it('versionStage — by seq, ⛔ by array order', () => {
    expect(versionStage([])).toBeNull();
    expect(versionStage([{ step: 'approved', seq: 2 }, { step: 'proposed', seq: 1 }])).toBe('approved');
    expect(versionStage([{ step: 'made_live', seq: 3 }, { step: 'proposed', seq: 1 }, { step: 'approved', seq: 2 }])).toBe('published');
    expect(versionStage([{ step: 'proposed', seq: 1 }, { step: 'returned', seq: 2 }])).toBe('returned');
    expect(versionStage([{ step: 'withdrawn', seq: 5 }, { step: 'proposed', seq: 1 }, { step: 'approved', seq: 3 }])).toBe('withdrawn');
  });
  it('canTakeStep — the AC8 state machine', () => {
    expect(canTakeStep('proposed', 'approved')).toBe(true);
    expect(canTakeStep('proposed', 'returned')).toBe(true);
    expect(canTakeStep('proposed', 'withdrawn')).toBe(true);
    expect(canTakeStep('proposed', 'made_live')).toBe(false);
    expect(canTakeStep('approved', 'made_live')).toBe(true);
    expect(canTakeStep('approved', 'withdrawn')).toBe(true);
    expect(canTakeStep('approved', 'approved')).toBe(false);
    expect(canTakeStep('approved', 'returned')).toBe(false);
    expect(canTakeStep('published', 'made_live')).toBe(true);
    expect(canTakeStep('published', 'withdrawn')).toBe(false);
    for (const s of ['approved', 'returned', 'withdrawn', 'made_live'] as const) {
      expect(canTakeStep('returned', s)).toBe(false);
      expect(canTakeStep('withdrawn', s)).toBe(false);
    }
    expect(canTakeStep(null, 'approved')).toBe(false);
  });
  it("liveCandidates — R2: P's own (newest made_live for P by seq, unless a later revert of P), else the all level", () => {
    const s = (versionId: string, step: 'made_live' | 'pariwar_reverted', targetPariwarId: string | null, seq: number) => ({ versionId, step, targetPariwarId, seq });
    expect(liveCandidates([], P1)).toEqual({ own: null, all: null });
    const steps = [s('peer_mesh.v1000', 'made_live', null, 1), s('peer_mesh.v1001', 'made_live', P1, 2)];
    expect(liveCandidates(steps, P1)).toEqual({ own: 'peer_mesh.v1001', all: 'peer_mesh.v1000' });
    expect(liveCandidates(steps, P2)).toEqual({ own: null, all: 'peer_mesh.v1000' });
    // ordered by seq, ⛔ by array position
    expect(liveCandidates([s('peer_mesh.v1002', 'made_live', null, 9), s('peer_mesh.v1000', 'made_live', null, 3)], P1).all).toBe('peer_mesh.v1002');
    // a revert of P ends P's own; the revert is keyed on the PARIWAR (it names the version it ends, but any later revert of P counts)
    const reverted = [...steps, s('peer_mesh.v1001', 'pariwar_reverted', P1, 3)];
    expect(liveCandidates(reverted, P1)).toEqual({ own: null, all: 'peer_mesh.v1000' });
    const revertedOther = [...steps, s('peer_mesh.v1001', 'pariwar_reverted', P2, 3)];
    expect(liveCandidates(revertedOther, P1).own).toBe('peer_mesh.v1001');
    // re-made live after a revert
    expect(liveCandidates([...reverted, s('peer_mesh.v1001', 'made_live', P1, 4)], P1).own).toBe('peer_mesh.v1001');
    // a revert recorded against another version id still ends P's own (keyed on P, ⛔ the version)
    expect(liveCandidates([...steps, s('peer_mesh.v1999', 'pariwar_reverted', P1, 3)], P1).own).toBeNull();
  });
  it('changeMarkers — by key against the base: new / changed / unchanged, and the removed keys', () => {
    const base = dbVersion(PEER_MESH_QUESTIONNAIRE_V4, [chainQ(), chainQ({ key: 'gone' })]);
    const next = dbVersion(PEER_MESH_QUESTIONNAIRE_V4, [chainQ({ text: { en: 'Changed {member}', hi: 'बदला' } }), chainQ({ key: 'fresh' })]);
    const m = changeMarkers(base, next);
    expect(m.markers.get('water_source')).toBe('changed');
    expect(m.markers.get('fresh')).toBe('new');
    expect(m.markers.get('has_died')).toBe('unchanged');
    expect(m.removed).toEqual(['gone']);
    expect(changeMarkers(null, next).markers.get('has_died')).toBe('new');
  });
  it('changeMarkers — review RT1: a staff question carried into a NEW version (its own, different chain record) is unchanged', () => {
    // Every version re-stamps its chain questions with ITS OWN id, so base and next never share a `chain:<id>`.
    const baseId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    const nextId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
    const base = dbVersion(PEER_MESH_QUESTIONNAIRE_V4, [chainQ({ approvedBy: [`chain:${baseId}`] }), chainQ({ key: 'kept', approvedBy: [`chain:${baseId}`] })]);
    const next = dbVersion(PEER_MESH_QUESTIONNAIRE_V4, [
      chainQ({ approvedBy: [`chain:${nextId}`], text: { en: 'Changed {member}', hi: 'बदला' } }),
      chainQ({ key: 'kept', approvedBy: [`chain:${nextId}`] }),
    ]);
    const m = changeMarkers(base, next);
    expect(m.markers.get('kept')).toBe('unchanged');
    expect(m.markers.get('water_source')).toBe('changed');
    // a ruled question keeps its Panel ids in the comparison — only a question's OWN chain record is set aside
    const ruled = questionsOf(PEER_MESH_QUESTIONNAIRE_V4)[0]!;
    const reRuled = { ...PEER_MESH_QUESTIONNAIRE_V4, pages: [{ questions: [{ ...ruled, approvedBy: [`chain:${nextId}`] }] }] };
    expect(changeMarkers({ ...PEER_MESH_QUESTIONNAIRE_V4, pages: [{ questions: [ruled] }] }, reRuled).markers.get(ruled.key)).toBe('changed');
  });
});

describe('the G13 fence reaches derive.ts (re-exported from index.ts)', () => {
  it('questionnaires/index.ts re-exports derive.js', () => {
    expect(readFileSync(path.join(srcRoot, 'questionnaires/index.ts'), 'utf8')).toMatch(/export \* from '\.\/derive\.js'/);
  });
});
