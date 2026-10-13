// Story 6.27a (PM23, Task 1; AC2) — the versioned questionnaire engine: every validator rule (CF3 (a)–(d)), v1 registered
// AND exempt, v2 live, the served definition's `'pending'` skip, `resolveLiveVersion`, the answer check, the dependants,
// the date window across month / year / leap boundaries, the copy keys present in en AND hi, and the reachability fence
// (the module reaches ⛔ no `db.ts`, `pg` or `drizzle-orm`).

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { isRealCalendarDate as leafIsReal } from '../../src/cycle-calendar/holiday-resolver.js';
import { isRealCalendarDate as persistIsReal } from '../../src/claim/nominee-determination-persist.js';
import {
  COMPARABLE_QUESTION_KEYS,
  PEER_MESH_QUESTIONNAIRE_V1,
  PEER_MESH_QUESTIONNAIRE_V2,
  PEER_MESH_HEALTH_QUESTION_KEYS,
  PEER_MESH_RULED_QUESTION_KEYS,
  PEER_MESH_SENSITIVE_QUESTION_KEYS,
  PEER_MESH_WARNING_QUESTION_KEYS,
  QUESTIONNAIRE_KINDS,
  QUESTIONNAIRE_REGISTRY,
  QuestionnaireDefinitionInvalidError,
  assertValidQuestionnaireDefinition,
  checkAnswer,
  deathDateWindow,
  dependantsToSupersede,
  getQuestionnaireVersion,
  pendingCounselBasisKeys,
  questionnaireDefinitionProblems,
  questionsOf,
  resolveLiveVersion,
  servedDefinition,
  type QuestionDefinition,
  type QuestionnaireDefinition,
} from '../../src/questionnaires/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.resolve(here, '../../src');
const PARIWAR = '11111111-1111-4111-8111-111111111111';

/** v2 with one question replaced (or removed when `next` is null). */
function withQuestion(def: QuestionnaireDefinition, key: string, next: ((q: QuestionDefinition) => QuestionDefinition | null)): QuestionnaireDefinition {
  return {
    ...def,
    pages: def.pages
      .map((p) => ({ questions: p.questions.flatMap((q) => (q.key === key ? [next(q)].filter((x): x is QuestionDefinition => x !== null) : [q])) }))
      .filter((p) => p.questions.length > 0),
  };
}
function withExtra(def: QuestionnaireDefinition, q: QuestionDefinition): QuestionnaireDefinition {
  return { ...def, pages: [...def.pages, { questions: [q] }] };
}
const extra: QuestionDefinition = {
  key: 'extra',
  kind: 'yes_no',
  copyKey: 'peer_request_questions.extra.question',
  options: [
    { code: 'yes', copyKey: 'peer_request_questions.extra.yes' },
    { code: 'no', copyKey: 'peer_request_questions.extra.no' },
  ],
  optional: true,
  showIf: null,
  sensitive: false,
  warning: false,
  approvedBy: ['2026-10-10-304'],
  health: false,
  counselBasis: null,
};
const problems = (d: QuestionnaireDefinition) => questionnaireDefinitionProblems(d).join(' | ');

describe('the registry (PM23 (a) / (b))', () => {
  it('QUESTIONNAIRE_KINDS is peer_mesh + ground_inspection', () => {
    expect([...QUESTIONNAIRE_KINDS]).toEqual(['peer_mesh', 'ground_inspection']);
  });
  it('v1 and v2 are registered and valid; v2 is LIVE; v1 is historical and ⛔ never returned by resolveLiveVersion', () => {
    expect(QUESTIONNAIRE_REGISTRY.map((d) => d.versionId)).toEqual(['peer_mesh.v1', 'peer_mesh.v2']);
    for (const d of QUESTIONNAIRE_REGISTRY) expect(questionnaireDefinitionProblems(d)).toEqual([]);
    expect(getQuestionnaireVersion('peer_mesh.v1')).toBe(PEER_MESH_QUESTIONNAIRE_V1);
    expect(PEER_MESH_QUESTIONNAIRE_V1.status).toBe('historical');
    expect(resolveLiveVersion('peer_mesh', PARIWAR)).toBe(PEER_MESH_QUESTIONNAIRE_V2);
    expect(getQuestionnaireVersion('peer_mesh.v9')).toBeNull();
    expect(resolveLiveVersion('ground_inspection', PARIWAR)).toBeNull();
  });
  it('v1 is EXEMPT from the seven-key rule (it lacks five of them and is still valid)', () => {
    const keys = questionsOf(PEER_MESH_QUESTIONNAIRE_V1).map((q) => q.key);
    expect(keys).toEqual(['has_died', 'death_date']);
    expect(questionnaireDefinitionProblems(PEER_MESH_QUESTIONNAIRE_V1)).toEqual([]);
    // …while the SAME pages as a v2 are refused.
    const asV2 = { ...PEER_MESH_QUESTIONNAIRE_V1, version: 2, versionId: 'peer_mesh.v2' };
    expect(problems(asV2)).toContain(`the ruled question 'how_known' is missing`);
  });
  it("v2's DEFINITION holds all seven ruled keys, in the ruled pages, and ⛔ no alcohol question", () => {
    const pages = PEER_MESH_QUESTIONNAIRE_V2.pages.map((p) => p.questions.map((q) => q.key));
    expect(pages).toEqual([['has_died', 'death_date'], ['how_known', 'relationship'], ['death_cause', 'death_illness'], ['callback_consent']]);
    expect(pages.flat().sort()).toEqual([...PEER_MESH_RULED_QUESTION_KEYS].sort());
    expect(questionsOf(PEER_MESH_QUESTIONNAIRE_V2).filter((q) => q.warning).map((q) => q.key)).toEqual([...PEER_MESH_WARNING_QUESTION_KEYS]);
    expect(questionsOf(PEER_MESH_QUESTIONNAIRE_V2).filter((q) => q.sensitive).map((q) => q.key)).toEqual(['death_date', 'death_cause', 'death_illness']);
  });
  it('resolveLiveVersion prefers a Pariwar version over the all-Pariwar one', () => {
    const own: QuestionnaireDefinition = { ...PEER_MESH_QUESTIONNAIRE_V2, version: 3, versionId: 'peer_mesh.v3', scope: { kind: 'pariwar', pariwarId: PARIWAR } };
    const registry = [PEER_MESH_QUESTIONNAIRE_V1, PEER_MESH_QUESTIONNAIRE_V2, own];
    expect(resolveLiveVersion('peer_mesh', PARIWAR, registry)).toBe(own);
    expect(resolveLiveVersion('peer_mesh', '22222222-2222-4222-8222-222222222222', registry)).toBe(PEER_MESH_QUESTIONNAIRE_V2);
    expect(() => resolveLiveVersion('peer_mesh', 'x', [PEER_MESH_QUESTIONNAIRE_V2, { ...PEER_MESH_QUESTIONNAIRE_V2, versionId: 'peer_mesh.v3', version: 3 }])).toThrow(/more than one live/);
  });
  it('COMPARABLE_QUESTION_KEYS', () => {
    expect([...COMPARABLE_QUESTION_KEYS]).toEqual(['has_died', 'death_date', 'death_cause', 'death_illness']);
  });
});

describe('the validator refuses (PM23 (a); CF3 (a)–(d))', () => {
  it('a v2+ peer_mesh definition missing ANY of the seven ruled keys', () => {
    for (const key of PEER_MESH_RULED_QUESTION_KEYS.filter((k) => k !== 'has_died')) {
      // drop the key (and anything conditional on it, so only the missing-key rule fires)
      let d = withQuestion(PEER_MESH_QUESTIONNAIRE_V2, key, () => null);
      if (key === 'death_cause') d = withQuestion(d, 'death_illness', () => null);
      expect(problems(d), key).toContain(`the ruled question '${key}' is missing`);
    }
  });
  it("a `warning` on any key but has_died / death_date (a chain-added question is ⛔ never a warning)", () => {
    expect(problems(withQuestion(PEER_MESH_QUESTIONNAIRE_V2, 'how_known', (q) => ({ ...q, warning: true })))).toContain(`question 'how_known': 'warning' is refused`);
    expect(problems(withExtra(PEER_MESH_QUESTIONNAIRE_V2, { ...extra, warning: true }))).toContain(`question 'extra': 'warning' is refused`);
    // the ground_inspection kind admits ⛔ no warning until its own story rules one
    const gi: QuestionnaireDefinition = { ...PEER_MESH_QUESTIONNAIRE_V1, kind: 'ground_inspection', versionId: 'ground_inspection.v1', status: 'historical' };
    expect(problems(gi)).toContain(`'warning' is refused`);
  });
  it('a v2+ version that RECLASSIFIES a ruled question: a health question made non-health, a warning dropped (review S2)', () => {
    for (const key of PEER_MESH_HEALTH_QUESTION_KEYS) {
      const d = withQuestion(PEER_MESH_QUESTIONNAIRE_V2, key, (q) => ({ ...q, health: false, sensitive: false, counselBasis: null }));
      expect(problems(d), key).toContain(`the ruled health question '${key}' is health: true`);
    }
    for (const key of PEER_MESH_WARNING_QUESTION_KEYS) {
      expect(problems(withQuestion(PEER_MESH_QUESTIONNAIRE_V2, key, (q) => ({ ...q, warning: false }))), key).toContain(`the ruled question '${key}' carries its warning`);
    }
    // an OMITTED flag is refused too (U12 — a JSON-backed version may simply leave it out)
    const omitted = withQuestion(PEER_MESH_QUESTIONNAIRE_V2, 'death_cause', (q) => { const rest = { ...q } as Record<string, unknown>; delete rest['health']; return rest as unknown as QuestionDefinition; });
    expect(problems(omitted)).toContain(`the ruled health question 'death_cause' is health: true`);
    // a Tier-1 question made non-sensitive is refused in EVERY version, v1 included (U12)
    expect(problems(withQuestion(PEER_MESH_QUESTIONNAIRE_V1, 'death_date', (q) => ({ ...q, sensitive: false })))).toContain(`the Tier-1 question 'death_date' is sensitive`);
    // v1 stays EXEMPT from the v2-onward rules (the seven keys, the health / warning classification) — but ⛔ from the
    // Tier-1 SENSITIVE rule, which holds in EVERY version (U12; v1's date is sensitive, so v1 is valid); the sensitive
    // set is the date + the health questions
    expect(problems(PEER_MESH_QUESTIONNAIRE_V1)).toBe('');
    expect([...PEER_MESH_SENSITIVE_QUESTION_KEYS]).toEqual(['death_date', 'death_cause', 'death_illness']);
    for (const key of PEER_MESH_SENSITIVE_QUESTION_KEYS) {
      expect(questionsOf(PEER_MESH_QUESTIONNAIRE_V2).find((q) => q.key === key)?.sensitive, key).toBe(true);
    }
  });
  it('a question (or a version) without a valid approvedBy — ⛔ no v3 before 6-33 except a Panel decision id', () => {
    expect(problems(withExtra(PEER_MESH_QUESTIONNAIRE_V2, { ...extra, approvedBy: [] }))).toContain(`question 'extra': approvedBy is empty`);
    expect(problems(withExtra(PEER_MESH_QUESTIONNAIRE_V2, { ...extra, approvedBy: ['2026-10-12-999'] }))).toContain('not a Trustee-ratified questionnaire decision');
    expect(problems({ ...PEER_MESH_QUESTIONNAIRE_V2, approvedBy: [] })).toContain('the version: approvedBy is empty');
  });
  it('an alcohol question — by key, option code or copy key (-304 Q5 A)', () => {
    expect(problems(withExtra(PEER_MESH_QUESTIONNAIRE_V2, { ...extra, key: 'drank_alcohol' }))).toContain('an alcohol question or option is refused');
    expect(problems(withExtra(PEER_MESH_QUESTIONNAIRE_V2, { ...extra, copyKey: 'peer_request_questions.drink.question' }))).toContain('alcohol');
    expect(problems(withQuestion(PEER_MESH_QUESTIONNAIRE_V2, 'death_cause', (q) => ({ ...q, options: [...q.options, { code: 'liquor', copyKey: 'peer_request_questions.death_cause.liquor' }] })))).toContain('alcohol');
  });
  it('a `health: true` question without a counselBasis; a malformed basis; a basis on a non-health question', () => {
    expect(problems(withQuestion(PEER_MESH_QUESTIONNAIRE_V2, 'death_illness', (q) => ({ ...q, counselBasis: null })))).toContain('a health question needs a counselBasis');
    expect(problems(withQuestion(PEER_MESH_QUESTIONNAIRE_V2, 'death_illness', (q) => ({ ...q, counselBasis: 'yes' })))).toContain(`counselBasis is 'pending' or a decision id`);
    expect(problems(withExtra(PEER_MESH_QUESTIONNAIRE_V2, { ...extra, counselBasis: 'pending' }))).toContain('counselBasis only on a health question');
    // a later health question, added with a recorded basis id, passes
    expect(problems(withQuestion(PEER_MESH_QUESTIONNAIRE_V2, 'death_illness', (q) => ({ ...q, counselBasis: '2026-11-01-400' })))).toBe('');
  });
  it('a forward (or unknown) showIf, a showIf code that is not an option, a duplicate code, a duplicate key', () => {
    const forward = withQuestion(PEER_MESH_QUESTIONNAIRE_V2, 'how_known', (q) => ({ ...q, showIf: { key: 'callback_consent', anyOf: ['yes'] } }));
    expect(problems(forward)).toContain(`showIf refers to 'callback_consent', which is not an EARLIER question`);
    expect(problems(withQuestion(PEER_MESH_QUESTIONNAIRE_V2, 'death_date', (q) => ({ ...q, showIf: { key: 'has_died', anyOf: ['maybe'] } })))).toContain(`showIf code 'maybe'`);
    const dupCode = withQuestion(PEER_MESH_QUESTIONNAIRE_V2, 'relationship', (q) => ({ ...q, options: [...q.options, q.options[0]!] }));
    expect(problems(dupCode)).toContain('duplicate option code');
    expect(problems(withExtra(PEER_MESH_QUESTIONNAIRE_V2, { ...extra, key: 'how_known' }))).toContain(`question 'how_known': duplicate key`);
  });
  it('has_died first, required, with the four mapped codes; every other question optional; pages of 1–3', () => {
    expect(problems(withQuestion(PEER_MESH_QUESTIONNAIRE_V2, 'has_died', (q) => ({ ...q, optional: true })))).toContain(`'has_died' is required`);
    expect(problems(withQuestion(PEER_MESH_QUESTIONNAIRE_V2, 'how_known', (q) => ({ ...q, optional: false })))).toContain('every question but');
    expect(problems(withQuestion(PEER_MESH_QUESTIONNAIRE_V2, 'has_died', (q) => ({ ...q, options: q.options.slice(0, 3) })))).toContain(`'has_died' is single with codes`);
    const crowded = { ...PEER_MESH_QUESTIONNAIRE_V2, pages: [{ questions: questionsOf(PEER_MESH_QUESTIONNAIRE_V2).slice(0, 4) }, ...PEER_MESH_QUESTIONNAIRE_V2.pages.slice(2)] };
    expect(problems(crowded)).toContain('page 1: 1–3 questions');
  });
  it('assertValidQuestionnaireDefinition throws the typed error', () => {
    expect(() => assertValidQuestionnaireDefinition({ ...PEER_MESH_QUESTIONNAIRE_V2, approvedBy: [] })).toThrow(QuestionnaireDefinitionInvalidError);
    expect(() => assertValidQuestionnaireDefinition(PEER_MESH_QUESTIONNAIRE_V2)).not.toThrow();
  });
});

describe("the SERVED definition skips a `'pending'` question (PM23 (a); AC2)", () => {
  it("v2's served definition skips death_cause and death_illness while their counselBasis is 'pending'", () => {
    expect(pendingCounselBasisKeys(PEER_MESH_QUESTIONNAIRE_V2)).toEqual(['death_cause', 'death_illness']);
    const served = servedDefinition(PEER_MESH_QUESTIONNAIRE_V2);
    expect(served.pages.map((p) => p.questions.map((q) => q.key))).toEqual([['has_died', 'death_date'], ['how_known', 'relationship'], ['callback_consent']]);
  });
  it('a recorded basis on death_cause serves it; death_illness (still pending) stays skipped', () => {
    const d = withQuestion(PEER_MESH_QUESTIONNAIRE_V2, 'death_cause', (q) => ({ ...q, counselBasis: '2026-11-01-400' }));
    expect(questionsOf(servedDefinition(d)).map((q) => q.key)).toContain('death_cause');
    expect(questionsOf(servedDefinition(d)).map((q) => q.key)).not.toContain('death_illness');
    expect(pendingCounselBasisKeys(d)).toEqual(['death_illness']);
  });
  it("a question whose showIf parent is skipped is skipped too", () => {
    const d = withQuestion(PEER_MESH_QUESTIONNAIRE_V2, 'death_illness', (q) => ({ ...q, counselBasis: '2026-11-01-400' }));
    expect(questionsOf(servedDefinition(d)).map((q) => q.key)).not.toContain('death_illness');
  });
});

describe('the answer check (PM7 (b))', () => {
  const served = servedDefinition(PEER_MESH_QUESTIONNAIRE_V2);
  const full = withQuestion(withQuestion(PEER_MESH_QUESTIONNAIRE_V2, 'death_cause', (q) => ({ ...q, counselBasis: '2026-11-01-400' })), 'death_illness', (q) => ({ ...q, counselBasis: '2026-11-01-400' }));
  const today = '2026-10-12';
  const died = new Map([['has_died', ['died']]]);

  it('has_died: one known code, stored as plaintext codes', () => {
    const r = checkAnswer(served, 'has_died', { codes: ['not_died'] }, new Map(), today);
    expect(r).toMatchObject({ ok: true, codes: ['not_died'], storage: { form: 'codes', codes: ['not_died'] } });
    expect(checkAnswer(served, 'has_died', { codes: ['died', 'not_died'] }, new Map(), today)).toEqual({ ok: false, reason: 'invalid_value' });
    expect(checkAnswer(served, 'has_died', { codes: ['dead'] }, new Map(), today)).toEqual({ ok: false, reason: 'invalid_value' });
    expect(checkAnswer(served, 'has_died', { date: '2026-10-01' }, new Map(), today)).toEqual({ ok: false, reason: 'invalid_value' });
  });
  it('death_date: only after "died"; a real date, ⛔ never future, ⛔ never before 1900; encrypted with its ±1 window', () => {
    expect(checkAnswer(served, 'death_date', { date: '2026-10-01' }, new Map([['has_died', ['not_sure']]]), today)).toEqual({ ok: false, reason: 'condition_not_met' });
    expect(checkAnswer(served, 'death_date', { date: '2026-10-01' }, new Map(), today)).toEqual({ ok: false, reason: 'condition_not_met' });
    expect(checkAnswer(served, 'death_date', { date: '2026-02-30' }, died, today)).toEqual({ ok: false, reason: 'date_not_real' });
    expect(checkAnswer(served, 'death_date', { date: '2026-10-13' }, died, today)).toEqual({ ok: false, reason: 'date_in_future' });
    expect(checkAnswer(served, 'death_date', { date: '1899-12-31' }, died, today)).toEqual({ ok: false, reason: 'date_too_early' });
    expect(checkAnswer(served, 'death_date', { date: today }, died, today)).toMatchObject({ ok: true, codes: null, storage: { form: 'encrypted', plaintext: today, dateWindow: ['2026-10-11', today, '2026-10-13'] } });
  });
  it('a date question on any OTHER key is encrypted with ⛔ no window — the indexes are death_date\'s alone (review S2)', () => {
    const otherDate: QuestionDefinition = {
      ...extra,
      key: 'funeral_date',
      kind: 'date',
      options: [{ code: 'unknown', copyKey: 'peer_request_questions.extra.unknown' }],
      sensitive: true,
    };
    const d = servedDefinition(withExtra(PEER_MESH_QUESTIONNAIRE_V2, otherDate));
    expect(checkAnswer(d, 'funeral_date', { date: '2026-10-01' }, died, today)).toMatchObject({ ok: true, storage: { form: 'encrypted', plaintext: '2026-10-01', dateWindow: null } });
  });
  it('death_date: "I don\'t know the date" is a plaintext code — ⛔ no ciphertext, ⛔ no window', () => {
    expect(checkAnswer(served, 'death_date', { codes: ['unknown'] }, died, today)).toMatchObject({ ok: true, storage: { form: 'codes', codes: ['unknown'] } });
  });
  it("a 'pending' question cannot be answered (unknown_question); once served, a sensitive single is encrypted", () => {
    expect(checkAnswer(served, 'death_cause', { codes: ['old_age'] }, died, today)).toEqual({ ok: false, reason: 'unknown_question' });
    const sf = servedDefinition(full);
    expect(checkAnswer(sf, 'death_cause', { codes: ['old_age'] }, died, today)).toMatchObject({ ok: true, storage: { form: 'encrypted', plaintext: '["old_age"]', dateWindow: null } });
  });
  it('death_illness: multi, after an illness cause; "I don\'t know" stands alone; codes normalised to option order', () => {
    const sf = servedDefinition(full);
    const ill = new Map([['has_died', ['died']], ['death_cause', ['illness_long']]]);
    expect(checkAnswer(sf, 'death_illness', { codes: ['tb', 'cancer'] }, ill, today)).toMatchObject({ ok: true, codes: ['cancer', 'tb'], storage: { plaintext: '["cancer","tb"]' } });
    expect(checkAnswer(sf, 'death_illness', { codes: ['cancer', 'dont_know'] }, ill, today)).toEqual({ ok: false, reason: 'invalid_value' });
    expect(checkAnswer(sf, 'death_illness', { codes: ['cancer', 'cancer'] }, ill, today)).toEqual({ ok: false, reason: 'invalid_value' });
    expect(checkAnswer(sf, 'death_illness', { codes: ['cancer'] }, new Map([['has_died', ['died']], ['death_cause', ['accident']]]), today)).toEqual({ ok: false, reason: 'condition_not_met' });
  });
  it('callback_consent: yes / no', () => {
    expect(checkAnswer(served, 'callback_consent', { codes: ['yes'] }, new Map(), today)).toMatchObject({ ok: true, storage: { form: 'codes', codes: ['yes'] } });
    expect(checkAnswer(served, 'unknown_key', { codes: ['yes'] }, new Map(), today)).toEqual({ ok: false, reason: 'unknown_question' });
  });
});

describe('the dependants a changed answer supersedes (PM7 (b))', () => {
  const live = new Map<string, readonly string[] | null>([['has_died', ['died']], ['death_date', null], ['death_cause', ['illness_long']], ['death_illness', ['cancer']], ['how_known', ['family_told']]]);
  it('"died" → "not sure" supersedes the date, the cause AND (transitively) the illness — never how_known', () => {
    expect(dependantsToSupersede(PEER_MESH_QUESTIONNAIRE_V2, 'has_died', ['not_sure'], live)).toEqual(['death_date', 'death_cause', 'death_illness']);
  });
  it('an illness cause → "accident" supersedes only the illness', () => {
    expect(dependantsToSupersede(PEER_MESH_QUESTIONNAIRE_V2, 'death_cause', ['accident'], live)).toEqual(['death_illness']);
  });
  it('a change that keeps the condition supersedes nothing; an unanswered dependant is never listed', () => {
    expect(dependantsToSupersede(PEER_MESH_QUESTIONNAIRE_V2, 'death_cause', ['illness_sudden'], live)).toEqual([]);
    expect(dependantsToSupersede(PEER_MESH_QUESTIONNAIRE_V2, 'has_died', ['not_died'], new Map([['has_died', ['died']]]))).toEqual([]);
  });
});

describe('the date window helper — month / year / leap boundaries (±1 inside, ±2 outside)', () => {
  it.each([
    ['2026-03-01', ['2026-02-28', '2026-03-01', '2026-03-02']],
    ['2024-03-01', ['2024-02-29', '2024-03-01', '2024-03-02']],
    ['2024-02-29', ['2024-02-28', '2024-02-29', '2024-03-01']],
    ['2026-01-01', ['2025-12-31', '2026-01-01', '2026-01-02']],
    ['2025-12-31', ['2025-12-30', '2025-12-31', '2026-01-01']],
  ])('%s', (d, window) => {
    expect(deathDateWindow(d)).toEqual(window);
  });
  it('two calendar days apart is never in the window', () => {
    expect(deathDateWindow('2024-03-01')).not.toContain('2024-02-28');
    expect(deathDateWindow('2025-12-31')).not.toContain('2026-01-02');
  });
});

describe('isRealCalendarDate — moved to the import-free leaf (F38)', () => {
  it('the old home re-exports the SAME function', () => {
    expect(persistIsReal).toBe(leafIsReal);
    expect(leafIsReal('2024-02-29')).toBe(true);
    expect(leafIsReal('2026-02-29')).toBe(false);
    expect(leafIsReal('2026-2-1')).toBe(false);
  });
});

describe('the copy keys exist in en AND hi (server-resolved words)', () => {
  const load = (locale: string) =>
    JSON.parse(readFileSync(path.resolve(here, `../../../i18n/locales/${locale}/claim.json`), 'utf8')) as Record<string, string>;
  for (const locale of ['en', 'hi']) {
    it(locale, () => {
      const catalog = load(locale);
      for (const def of QUESTIONNAIRE_REGISTRY) {
        const keys = [def.closingNoteCopyKey, def.thankYouCopyKey, ...questionsOf(def).flatMap((q) => [q.copyKey, ...q.options.map((o) => o.copyKey)])];
        for (const k of keys) expect(catalog[k], `${locale}: ${k}`).toEqual(expect.any(String));
      }
    });
  }
  it('the closing note and the Thank-you are VERBATIM as put under -304 Q6 A (en)', () => {
    const en = load('en');
    expect(en['peer_request_questions.closing_note']).toBe(
      "Your answers are saved as you go. Only the Trust's staff who check this claim will see them — never the family. Please answer only what you know. Press Submit when you are done.",
    );
    expect(en['peer_request_questions.thank_you']).toBe('Thank you. Your answers have been sent to the Trust.');
  });
});

describe('reachability — the engine is pg-free (AC2)', () => {
  function reachable(entry: string): Set<string> {
    const seen = new Set<string>();
    const queue = [entry];
    while (queue.length > 0) {
      const file = queue.pop()!;
      if (seen.has(file)) continue;
      seen.add(file);
      for (const m of readFileSync(file, 'utf8').matchAll(/(?:import|export)[^'"]*?from\s+['"]([^'"]+)['"]/g)) {
        const spec = m[1]!;
        if (spec.startsWith('.')) queue.push(path.resolve(path.dirname(file), spec.replace(/\.js$/, '.ts')));
        else seen.add(`pkg:${spec}`);
      }
    }
    return seen;
  }
  it('questionnaires/index.ts reaches ⛔ no db.ts, pg or drizzle-orm', () => {
    const files = [...reachable(path.join(srcRoot, 'questionnaires/index.ts'))].map((f) => (f.startsWith('pkg:') ? f : path.relative(srcRoot, f)));
    expect(files).not.toContain('db.ts');
    expect(files.filter((f) => f.startsWith('pkg:'))).toEqual([]);
  });
  it('the scan has teeth: claim/answer-window.ts reaches drizzle-orm', () => {
    const files = [...reachable(path.join(srcRoot, 'claim/answer-window.ts'))];
    expect(files).toContain('pkg:drizzle-orm');
  });
});
