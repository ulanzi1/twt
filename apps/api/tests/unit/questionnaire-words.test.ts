// Story 6.33 (Task 4.3; AC6; QE4) — THE ONE word function: a copy key through the REAL `t()`, stored text in both languages,
// `{member}` substituted with `t()`'s own single-pass semantics, and D11 FIXED — an empty member name (the `''` a failed
// decrypt or ⛔ recorded name yields) is filled with the HUMAN-REVIEWED fallback word through the real `t()` (en "the member",
// hi "सदस्य"), logged `questionnaire.member_name_fallback` ONCE with ids only — and ⛔ for a read whose words have ⛔ slot.

import { questionnaires } from '@twt/domain';
import { t } from '@twt/i18n';
import { describe, expect, it, vi } from 'vitest';

import { toWireQuestionnaire } from '../../src/modules/claims/peer-request-core.js';
import { MEMBER_FALLBACK_COPY_KEY, questionnaireWord, questionnaireWordsFor } from '../../src/modules/claims/questionnaire-words.js';

const stored = { text: { en: 'Did {member} farm?', hi: 'क्या {member} खेती करते थे?' } };
const hasDied = { copyKey: 'peer_request_questions.has_died.question' };

describe('the ONE word function (QE4)', () => {
  it('the fallback copy key exists in en AND hi with the reviewed words (the REAL t())', () => {
    expect(t(MEMBER_FALLBACK_COPY_KEY, undefined, { locale: 'en', namespace: 'claim' })).toBe('the member');
    expect(t(MEMBER_FALLBACK_COPY_KEY, undefined, { locale: 'hi', namespace: 'claim' })).toBe('सदस्य');
  });

  it('a copy key resolves through t(); stored text in each language; {member} interpolated', () => {
    expect(questionnaireWord(hasDied, 'Ram K.', 'en')).toBe(t(hasDied.copyKey, { member: 'Ram K.' }, { locale: 'en', namespace: 'claim' }));
    expect(questionnaireWord(stored, 'Ram K.', 'en')).toBe('Did Ram K. farm?');
    expect(questionnaireWord(stored, 'Ram K.', 'hi')).toBe('क्या Ram K. खेती करते थे?');
  });

  it("{member} with t()'s semantics: a SINGLE pass, ⛔ escaping — a name containing {member} is ⛔ re-scanned", () => {
    expect(questionnaireWord(stored, 'A {member} B', 'en')).toBe('Did A {member} B farm?');
    expect(questionnaireWord(stored, '<b>&', 'en')).toBe('Did <b>& farm?');
    expect(questionnaireWord(stored, '', 'en')).toBe('Did  farm?');
  });

  it('⭐ D11 — an empty name ⇒ the reviewed fallback word (copy key AND stored text), logged ONCE, ids only', () => {
    const warn = vi.fn();
    const words = questionnaireWordsFor('', { log: { warn }, ids: { pariwarId: 'p-1', pingId: 'g-1' } });
    expect(words.both(stored)).toEqual({ en: 'Did the member farm?', hi: 'क्या सदस्य खेती करते थे?' });
    expect(words.en(hasDied)).toBe(t(hasDied.copyKey, { member: 'the member' }, { locale: 'en', namespace: 'claim' }));
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith({ pariwarId: 'p-1', pingId: 'g-1' }, 'questionnaire.member_name_fallback');
  });

  it('a name ⇒ ⛔ log; an empty name whose words carry ⛔ {member} slot (an option) ⇒ ⛔ log', () => {
    const warn = vi.fn();
    questionnaireWordsFor('Ram K.', { log: { warn }, ids: {} }).both(stored);
    const optionOnly = questionnaireWordsFor('', { log: { warn }, ids: {} });
    optionOnly.both({ copyKey: 'peer_request_questions.has_died.died' });
    optionOnly.both({ text: { en: 'A well', hi: 'कुआँ' } });
    expect(warn).not.toHaveBeenCalled();
  });

  it('toWireQuestionnaire — v4 served with an EMPTY name reads "the member" / "सदस्य", ⛔ a hole (the 6.32 D11 shape)', () => {
    const warn = vi.fn();
    const wire = toWireQuestionnaire(questionnaires.PEER_MESH_QUESTIONNAIRE_V4, '', { log: { warn }, ids: { pariwarId: 'p-1' } });
    const q = wire.pages[0]!.questions[0]!;
    expect(q.words.en).toContain('the member');
    expect(q.words.hi).toContain('सदस्य');
    expect(JSON.stringify(wire)).not.toMatch(/ {2}|\{member\}/);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]![0]).toEqual({ pariwarId: 'p-1', versionId: 'peer_mesh.v4' });
  });
});
