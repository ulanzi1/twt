// Story 6.27a (PM11, PM23 (a); AC2 / AC5) — the peer-request wire shape and its lockstep with the domain questionnaire
// engine (test-only — contracts never imports `@twt/domain` in a shipped file).

import { questionnaires } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import {
  PEER_REQUEST_QUESTION_KINDS,
  PeerRequestAnswerValue,
  PeerRequestListQuery,
  PeerRequestLiveAnswer,
  PeerRequestQuestionnaire,
  PeerRequestSaveAnswerRequest,
} from '../src/index.js';

/**
 * The domain's served definition rendered onto the wire with dummy words — the SHAPE the API handler produces. ⚠ A copy:
 * the REAL mapper (`toWireQuestionnaire`) is held to the contract in `apps/api/tests/unit/peer-request-wire-lockstep.test.ts`
 * (second-pass review S27 (b) — a copy alone would drift with the handler unnoticed).
 */
function toWire(def: questionnaires.QuestionnaireDefinition) {
  const words = (k: string) => ({ en: `en:${k}`, hi: `hi:${k}` });
  return {
    versionId: def.versionId,
    pages: def.pages.map((p) => ({
      questions: p.questions.map((q) => ({
        key: q.key,
        kind: q.kind,
        words: words(q.copyKey),
        options: q.options.map((o) => ({ code: o.code, words: words(o.copyKey), exclusive: o.exclusive === true })),
        optional: q.optional,
        showIf: q.showIf === null ? null : { key: q.showIf.key, anyOf: [...q.showIf.anyOf] },
      })),
    })),
    closingNote: words(def.closingNoteCopyKey),
    thankYou: words(def.thankYouCopyKey),
  };
}

describe('Story 6.27a — contracts ↔ domain lockstep (the questionnaire wire shape)', () => {
  it('PEER_REQUEST_QUESTION_KINDS', () => {
    expect([...PEER_REQUEST_QUESTION_KINDS]).toEqual([...questionnaires.QUESTION_KINDS]);
  });
  it('every registered version, served, parses as the wire questionnaire', () => {
    for (const def of questionnaires.QUESTIONNAIRE_REGISTRY) {
      const r = PeerRequestQuestionnaire.safeParse(toWire(questionnaires.servedDefinition(def)));
      expect(r.success, def.versionId).toBe(true);
    }
  });
});

describe('the wire shapes', () => {
  it('an unavailable saved answer is a response state, never an accepted write value', () => {
    const value = { unavailable: true };
    expect(PeerRequestLiveAnswer.safeParse({ questionKey: 'death_date', value, savedAt: 'now' }).success).toBe(true);
    expect(PeerRequestSaveAnswerRequest.safeParse({ value }).success).toBe(false);
  });
  it('an answer value is codes OR a date — never both, never extra fields', () => {
    expect(PeerRequestAnswerValue.safeParse({ codes: ['died'] }).success).toBe(true);
    expect(PeerRequestAnswerValue.safeParse({ date: '2026-10-01' }).success).toBe(true);
    expect(PeerRequestAnswerValue.safeParse({ codes: [] }).success).toBe(false);
    expect(PeerRequestAnswerValue.safeParse({ date: '1-10-2026' }).success).toBe(false);
    expect(PeerRequestAnswerValue.safeParse({ codes: ['died'], date: '2026-10-01' }).success).toBe(false);
    expect(PeerRequestSaveAnswerRequest.safeParse({ value: { codes: ['yes'] }, extra: 1 }).success).toBe(false);
  });
  it('the list limit is bounded (1–5, default 5)', () => {
    expect(PeerRequestListQuery.parse({})).toEqual({ limit: 5 });
    expect(PeerRequestListQuery.safeParse({ limit: '6' }).success).toBe(false);
    expect(PeerRequestListQuery.safeParse({ limit: '0' }).success).toBe(false);
  });
});
