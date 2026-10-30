// Story 6.32 (Task 1; AC1) — the engine's `ground_inspection` rule and v1 (`2026-10-28-413` IQ1): the three ruled keys
// in every version (I4); every question OPTIONAL (I1 lives IN the validator so row 6-33 inherits it — TR11); the health
// questions sensitive and health, their CODES equal to the neighbours' (PM23 (a)); the letter ⛔ sensitive / health; ⛔ a
// warning; v1 registered LIVE; the served definition is the letter ALONE while counsel's basis is pending (TR7).

import { describe, expect, it } from 'vitest';

import {
  DEATH_CAUSE_CODES,
  DEATH_ILLNESS_CODES,
  GROUND_INSPECTION_QUESTIONNAIRE_V1,
  GROUND_INSPECTION_RULED_QUESTION_KEYS,
  GROUND_INSPECTION_SENSITIVE_QUESTION_KEYS,
  PANEL_RATIFIED_QUESTIONNAIRE_DECISIONS,
  PEER_MESH_QUESTIONNAIRE_V4,
  QUESTIONNAIRE_REGISTRY,
  checkAnswer,
  pendingCounselBasisKeys,
  questionnaireDefinitionProblems,
  questionsOf,
  resolveLiveVersion,
  servedDefinition,
  type QuestionDefinition,
  type QuestionnaireDefinition,
} from '../../src/questionnaires/index.js';

const V1 = GROUND_INSPECTION_QUESTIONNAIRE_V1;
const PARIWAR = '11111111-1111-4111-8111-111111111111';
const problems = (d: QuestionnaireDefinition) => questionnaireDefinitionProblems(d).join(' | ');

function withQuestion(def: QuestionnaireDefinition, key: string, next: (q: QuestionDefinition) => QuestionDefinition | null): QuestionnaireDefinition {
  return {
    ...def,
    pages: def.pages
      .map((p) => ({ questions: p.questions.flatMap((q) => (q.key === key ? [next(q)].filter((x): x is QuestionDefinition => x !== null) : [q])) }))
      .filter((p) => p.questions.length > 0),
  };
}
const codesOf = (def: QuestionnaireDefinition, key: string) => questionsOf(def).find((q) => q.key === key)!.options.map((o) => o.code);

describe('ground_inspection v1 (IQ1)', () => {
  it('is registered, valid and LIVE for every Pariwar', () => {
    expect(QUESTIONNAIRE_REGISTRY).toContain(V1);
    expect(problems(V1)).toBe('');
    expect(V1).toMatchObject({ kind: 'ground_inspection', versionId: 'ground_inspection.v1', version: 1, scope: { kind: 'all' }, status: 'live' });
    expect(resolveLiveVersion('ground_inspection', PARIWAR)).toBe(V1);
    expect(V1.approvedBy).toEqual(['2026-10-10-304', '2026-10-10-310']);
  });
  it('carries ONLY the ruled questions, one per page: the letter, the cause, the illness', () => {
    expect(V1.pages.map((p) => p.questions.map((q) => q.key))).toEqual([['head_letter'], ['death_cause'], ['death_illness']]);
    expect([...GROUND_INSPECTION_RULED_QUESTION_KEYS]).toEqual(['head_letter', 'death_cause', 'death_illness']);
  });
  it('every question is optional, ⛔ a warning; the letter is ⛔ sensitive / health; cause and illness are', () => {
    for (const q of questionsOf(V1)) {
      expect(q.optional, q.key).toBe(true);
      expect(q.warning, q.key).toBe(false);
    }
    const letter = questionsOf(V1).find((q) => q.key === 'head_letter')!;
    expect(letter).toMatchObject({ kind: 'single', sensitive: false, health: false, counselBasis: null, showIf: null, approvedBy: ['2026-10-10-310'] });
    expect(letter.options.map((o) => o.code)).toEqual(['collected', 'not_collected']);
    for (const key of GROUND_INSPECTION_SENSITIVE_QUESTION_KEYS) {
      expect(questionsOf(V1).find((q) => q.key === key), key).toMatchObject({ sensitive: true, health: true, counselBasis: 'pending', approvedBy: ['2026-10-10-304'] });
    }
  });
  it("the family's codes EQUAL the neighbours' (PM23 (a) — the same codes wherever both sides answer)", () => {
    expect(codesOf(V1, 'death_cause')).toEqual(codesOf(PEER_MESH_QUESTIONNAIRE_V4, 'death_cause'));
    expect(codesOf(V1, 'death_illness')).toEqual(codesOf(PEER_MESH_QUESTIONNAIRE_V4, 'death_illness'));
    expect(codesOf(V1, 'death_cause')).toEqual([...DEATH_CAUSE_CODES]);
    expect(codesOf(V1, 'death_illness')).toEqual([...DEATH_ILLNESS_CODES]);
    const ill = questionsOf(V1).find((q) => q.key === 'death_illness')!;
    expect(ill.options.filter((o) => o.exclusive === true).map((o) => o.code)).toEqual(['dont_know']);
    expect(ill.showIf).toEqual({ key: 'death_cause', anyOf: ['illness_long', 'illness_sudden'] });
    // the cause has ⛔ showIf (the family has no `has_died`)
    expect(questionsOf(V1).find((q) => q.key === 'death_cause')!.showIf).toBeNull();
  });
  it("uses the inspector's OWN copy keys — ⛔ the neighbours' words", () => {
    for (const q of questionsOf(V1)) {
      expect(q.copyKey?.startsWith('inspector_questions.'), q.key).toBe(true);
      for (const o of q.options) expect(o.copyKey?.startsWith(`inspector_questions.${q.key}.`), o.code).toBe(true);
    }
    expect(V1.closingNoteCopyKey).toBe('inspector_questions.closing_note');
    expect(V1.thankYouCopyKey).toBe('inspector_questions.thank_you');
  });
  it("`2026-10-10-310` is a Panel-ratified questionnaire decision (CF4 A (3))", () => {
    expect(PANEL_RATIFIED_QUESTIONNAIRE_DECISIONS).toContain('2026-10-10-310');
  });
});

describe('the SHIPPED state is dark (TR7)', () => {
  it("the served definition is the letter question ALONE while cause and illness are 'pending'", () => {
    expect(pendingCounselBasisKeys(V1)).toEqual(['death_cause', 'death_illness']);
    expect(servedDefinition(V1).pages.map((p) => p.questions.map((q) => q.key))).toEqual([['head_letter']]);
  });
  it('a recorded basis (an INJECTED copy) serves all three; the cause is encrypted, the letter stored as codes', () => {
    const recorded = withQuestion(withQuestion(V1, 'death_cause', (q) => ({ ...q, counselBasis: '2026-11-01-400' })), 'death_illness', (q) => ({ ...q, counselBasis: '2026-11-01-400' }));
    const served = servedDefinition(recorded);
    expect(questionsOf(served).map((q) => q.key)).toEqual(['head_letter', 'death_cause', 'death_illness']);
    expect(checkAnswer(served, 'head_letter', { codes: ['not_collected'] }, new Map(), '2026-10-28')).toMatchObject({ ok: true, storage: { form: 'codes', codes: ['not_collected'] } });
    expect(checkAnswer(served, 'death_cause', { codes: ['accident'] }, new Map(), '2026-10-28')).toMatchObject({ ok: true, codes: ['accident'], storage: { form: 'encrypted', plaintext: '["accident"]' } });
    expect(checkAnswer(served, 'death_illness', { codes: ['tb'] }, new Map([['death_cause', ['accident']]]), '2026-10-28')).toEqual({ ok: false, reason: 'condition_not_met' });
  });
});

describe('the validator — the ground_inspection rule (AC1; TR11: the rules live in validator.ts)', () => {
  it('refuses a version missing ANY ruled key (I4)', () => {
    for (const key of GROUND_INSPECTION_RULED_QUESTION_KEYS) {
      let d = withQuestion(V1, key, () => null);
      if (key === 'death_cause') d = withQuestion(d, 'death_illness', () => null);
      expect(problems(d), key).toContain(`the ruled question '${key}' is missing`);
    }
  });
  it('refuses a REQUIRED question — every ground_inspection question is optional (I1)', () => {
    for (const key of GROUND_INSPECTION_RULED_QUESTION_KEYS) {
      expect(problems(withQuestion(V1, key, (q) => ({ ...q, optional: false }))), key).toContain(`question '${key}': every ground_inspection question is optional`);
    }
  });
  it('refuses a non-health or non-sensitive cause / illness', () => {
    for (const key of GROUND_INSPECTION_SENSITIVE_QUESTION_KEYS) {
      expect(problems(withQuestion(V1, key, (q) => ({ ...q, health: false, counselBasis: null }))), key).toContain(`the ruled health question '${key}' is health: true`);
      // health: false AND sensitive: false — the generic "health ⇒ sensitive" rule no longer fires; this one must
      expect(problems(withQuestion(V1, key, (q) => ({ ...q, health: false, sensitive: false, counselBasis: null }))), key).toContain(`the Tier-1 question '${key}' is sensitive`);
    }
  });
  it("refuses cause / illness codes that differ from the neighbours'", () => {
    expect(problems(withQuestion(V1, 'death_cause', (q) => ({ ...q, options: q.options.slice(1) })))).toContain(`'death_cause' has the ruled codes`);
    expect(
      problems(withQuestion(V1, 'death_illness', (q) => ({ ...q, options: [...q.options, { code: 'malaria', copyKey: 'inspector_questions.death_illness.malaria' }] }))),
    ).toContain(`'death_illness' has the ruled codes`);
  });
  it('refuses a sensitive or health letter, and a letter with other codes', () => {
    expect(problems(withQuestion(V1, 'head_letter', (q) => ({ ...q, sensitive: true })))).toContain(`'head_letter' is ⛔ sensitive`);
    expect(problems(withQuestion(V1, 'head_letter', (q) => ({ ...q, health: true, sensitive: true, counselBasis: 'pending' })))).toContain(`'head_letter' is ⛔ sensitive`);
    expect(problems(withQuestion(V1, 'head_letter', (q) => ({ ...q, options: q.options.slice(0, 1).concat([{ code: 'refused', copyKey: 'inspector_questions.head_letter.refused' }]) })))).toContain(
      `'head_letter' is single with codes collected, not_collected`,
    );
  });
  it('refuses a warning on ANY ground_inspection key', () => {
    for (const key of GROUND_INSPECTION_RULED_QUESTION_KEYS) {
      expect(problems(withQuestion(V1, key, (q) => ({ ...q, warning: true }))), key).toContain(`question '${key}': 'warning' is refused`);
    }
  });
  it('a chain-added key named after an Object.prototype member (`constructor`) is a QUESTION, ⛔ a crash (second review S17)', () => {
    const extra: QuestionDefinition = { ...questionsOf(V1).find((q) => q.key === 'head_letter')!, key: 'constructor', showIf: null, approvedBy: ['2026-10-10-310'] };
    const d: QuestionnaireDefinition = { ...V1, pages: [...V1.pages, { questions: [extra] }] };
    expect(() => questionnaireDefinitionProblems(d)).not.toThrow();
    expect(problems(d)).not.toContain(`'constructor' has the ruled codes`);
  });
  it("the peer_mesh rules are ⛔ applied (no `has_died` first, no seven keys)", () => {
    expect(problems(V1)).not.toContain('has_died');
    expect(problems(V1)).not.toContain('how_known');
  });
});
