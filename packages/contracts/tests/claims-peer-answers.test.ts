// Story 6.27b (PM24; Task 3.7) — the approvers' read response: STRICT; `peerMesh` ABSENT is valid (the section hidden
// from this reader — PM25 (c), ⛔ a variant); the section is the console's own (a ping without `callbackBasis`, or an
// answer without `warningFlag`, is refused — both REQUIRED, BF6).

import { describe, expect, it } from 'vitest';

import { ClaimPeerAnswersResponse } from '../src/index.js';

const answer = {
  questionKey: 'has_died',
  question: 'Has Ram K. died?',
  value: { kind: 'codes', codes: ['not_died'], labels: ['No, they have not died'] },
  savedVia: 'member_app',
  savedAt: '2026-10-12T05:00:00.000Z',
  changeCount: 0,
  warningFlag: true,
};
const ping = {
  pingId: 'p',
  memberId: 'm',
  responderName: { status: 'shown', text: 'Asha Devi' },
  sendStatus: 'accepted',
  noTargetReason: null,
  reply: { submitted: true, answers: [answer] },
  callbackMobile: { status: 'shown', text: '+919876543210' },
  callbackBasis: 'consented',
  // Story 6.36 (SW24) — REQUIRED on the wire.
  source: 'workplace',
};
const present = {
  peerMesh: {
    status: 'present',
    transcript: {
      selectionId: 's',
      distinctResponderCount: 1,
      pingedMemberIds: ['m'],
      responses: [],
      verifierAnnotations: { status: 'not_available_yet' },
      outcome: 'sufficient',
      windowExpiresAt: '2026-10-15T00:00:00.000Z',
      pings: [ping],
      // Story 6.27d (R5) — REQUIRED, possibly empty.
      inspectionDiscrepancies: [],
      // Story 6.36 (SW20) — REQUIRED; `null` for `district_cohort_v1`.
      recentChangeBeforeFiling: true,
    },
    // ⭐ Story 6.32 (IQ7) — REQUIRED on the section, possibly empty.
    familyAccount: [] as unknown[],
  },
};

describe('ClaimPeerAnswersResponse (Story 6.27b, PM24)', () => {
  it('`peerMesh` ABSENT (hidden), `empty`, `unavailable` and `present` are all valid', () => {
    expect(ClaimPeerAnswersResponse.safeParse({}).success).toBe(true);
    expect(ClaimPeerAnswersResponse.safeParse({ peerMesh: { status: 'empty', familyAccount: [] } }).success).toBe(true); // Story 6.32
    expect(ClaimPeerAnswersResponse.safeParse({ peerMesh: { status: 'empty' } }).success).toBe(false); // ⛔ optional — REQUIRED
    expect(ClaimPeerAnswersResponse.safeParse({ peerMesh: { status: 'unavailable' } }).success).toBe(true);
    expect(ClaimPeerAnswersResponse.safeParse(present).success).toBe(true);
  });

  it('Story 6.27d (R5) — `inspectionDiscrepancies` is REQUIRED; ⛔ a value, ⛔ a name, ⛔ a count field; a note is text or `unavailable`', () => {
    const withD = (d: unknown) => ({ peerMesh: { ...present.peerMesh, transcript: { ...present.peerMesh.transcript, inspectionDiscrepancies: d } } });
    const item = {
      groundInspectionId: 'gi',
      completedAt: '2026-10-12T00:00:00.000Z',
      shownAt: '2026-10-12T00:00:01.000Z',
      questionKeys: ['has_died', 'death_date'],
      notes: [
        { questionKey: 'has_died', note: 'They said he died at home.', notedAt: '2026-10-12T00:05:00.000Z', authorDisplay: 'Anita Sharma' },
        { questionKey: 'death_date', note: { status: 'unavailable' }, notedAt: '2026-10-12T00:06:00.000Z', authorDisplay: 'Anita Sharma' },
      ],
    };
    expect(ClaimPeerAnswersResponse.safeParse(withD([item])).success).toBe(true);
    expect(ClaimPeerAnswersResponse.safeParse(withD([{ ...item, questionKeys: [] }])).success).toBe(true);
    const missing: Record<string, unknown> = { ...present.peerMesh.transcript };
    delete missing['inspectionDiscrepancies'];
    expect(ClaimPeerAnswersResponse.safeParse({ peerMesh: { ...present.peerMesh, transcript: missing } }).success).toBe(false);
    for (const extra of [{ valueCodes: ['not_died'] }, { neighbourName: 'Asha' }, { neighbourCount: 2 }]) {
      expect(ClaimPeerAnswersResponse.safeParse(withD([{ ...item, ...extra }])).success, JSON.stringify(extra)).toBe(false);
    }
    // ⭐ Story 6.32 (AC6 — RED BY DESIGN): ③ / ④ are compared keys now; a key outside the FOUR is still refused.
    expect(ClaimPeerAnswersResponse.safeParse(withD([{ ...item, questionKeys: ['death_cause', 'death_illness'] }])).success).toBe(true);
    expect(ClaimPeerAnswersResponse.safeParse(withD([{ ...item, questionKeys: ['how_known'] }])).success).toBe(false);
    expect(ClaimPeerAnswersResponse.safeParse(withD([{ ...item, notes: [{ ...item.notes[0], note: null }] }])).success).toBe(false);
    expect(ClaimPeerAnswersResponse.safeParse(withD([{ ...item, notes: [{ ...item.notes[0], authorActorId: 'x' }] }])).success).toBe(false);
  });

  it('Story 6.36 (SW24, SW20) — `source` on each ping and `recentChangeBeforeFiling` on the transcript are REQUIRED (nullable); ⛔ another value', () => {
    const withPing = (p: object) => ({ peerMesh: { ...present.peerMesh, transcript: { ...present.peerMesh.transcript, pings: [p] } } });
    const withLine = (v: unknown) => ({ peerMesh: { ...present.peerMesh, transcript: { ...present.peerMesh.transcript, recentChangeBeforeFiling: v } } });
    for (const source of ['workplace', 'named_by_member', null]) expect(ClaimPeerAnswersResponse.safeParse(withPing({ ...ping, source })).success).toBe(true);
    expect(ClaimPeerAnswersResponse.safeParse(withPing({ ...ping, source: 'district' })).success).toBe(false);
    const noSource: Record<string, unknown> = { ...ping };
    delete noSource['source'];
    expect(ClaimPeerAnswersResponse.safeParse(withPing(noSource)).success).toBe(false);
    for (const v of [true, false, null]) expect(ClaimPeerAnswersResponse.safeParse(withLine(v)).success).toBe(true);
    expect(ClaimPeerAnswersResponse.safeParse(withLine('yes')).success).toBe(false);
    const noLine: Record<string, unknown> = { ...present.peerMesh.transcript };
    delete noLine['recentChangeBeforeFiling'];
    expect(ClaimPeerAnswersResponse.safeParse({ peerMesh: { ...present.peerMesh, transcript: noLine } }).success).toBe(false);
  });

  it('STRICT — ⛔ a `hidden` variant, ⛔ an extra field', () => {
    expect(ClaimPeerAnswersResponse.safeParse({ peerMesh: { status: 'hidden' } }).success).toBe(false);
    expect(ClaimPeerAnswersResponse.safeParse({ ...present, step: 'final_vote' }).success).toBe(false);
  });

  it('`warningFlag` (`true` / `false` / `null`) and `callbackBasis` (`consented` / `super_admin` / `null`) are REQUIRED', () => {
    const withAnswer = (a: object) => ({ peerMesh: { ...present.peerMesh, transcript: { ...present.peerMesh.transcript, pings: [{ ...ping, reply: { submitted: true, answers: [a] } }] } } });
    const withPing = (p: object) => ({ peerMesh: { ...present.peerMesh, transcript: { ...present.peerMesh.transcript, pings: [p] } } });
    for (const flag of [true, false, null]) expect(ClaimPeerAnswersResponse.safeParse(withAnswer({ ...answer, warningFlag: flag })).success).toBe(true);
    const noFlag: Record<string, unknown> = { ...answer };
    delete noFlag['warningFlag'];
    expect(ClaimPeerAnswersResponse.safeParse(withAnswer(noFlag)).success).toBe(false);
    for (const basis of ['consented', 'super_admin']) expect(ClaimPeerAnswersResponse.safeParse(withPing({ ...ping, callbackBasis: basis })).success).toBe(true);
    // Code review round 2 (S9) — `null` is the basis of a number ⛔ shown (a shown number with ⛔ basis is refused).
    expect(ClaimPeerAnswersResponse.safeParse(withPing({ ...ping, callbackMobile: { status: 'none' }, callbackBasis: null })).success).toBe(true);
    expect(ClaimPeerAnswersResponse.safeParse(withPing({ ...ping, callbackBasis: null })).success).toBe(false);
    expect(ClaimPeerAnswersResponse.safeParse(withPing({ ...ping, callbackBasis: 'district' })).success).toBe(false);
    const noBasis: Record<string, unknown> = { ...ping };
    delete noBasis['callbackBasis'];
    expect(ClaimPeerAnswersResponse.safeParse(withPing(noBasis)).success).toBe(false);
  });
});

describe('Story 6.32 (IQ7; AC8) — the family account on the section', () => {
  const visit = (answers: unknown[]) => ({ groundInspectionId: 'g', completedAt: null, answers });
  const answer = (value: unknown) => ({ questionKey: 'head_letter', question: 'q', value, savedAt: 'x' });
  const withF = (f: unknown) => ({ peerMesh: { ...present.peerMesh, familyAccount: f } });
  it('REQUIRED on `present`; a value is codes + labels or `unavailable`; ⛔ a flag, ⛔ a warning, ⛔ an extra field (strict)', () => {
    expect(ClaimPeerAnswersResponse.safeParse(withF([visit([answer({ kind: 'codes', codes: ['collected'], labels: ['Yes'] })])])).success).toBe(true);
    expect(ClaimPeerAnswersResponse.safeParse(withF([visit([answer({ kind: 'unavailable' })])])).success).toBe(true);
    const { familyAccount: _omit, ...without } = present.peerMesh;
    expect(ClaimPeerAnswersResponse.safeParse({ peerMesh: without }).success).toBe(false);
    expect(ClaimPeerAnswersResponse.safeParse(withF([visit([{ ...answer({ kind: 'unavailable' }), warningFlag: false }])])).success).toBe(false);
    expect(ClaimPeerAnswersResponse.safeParse(withF([{ ...visit([]), neighbourCount: 3 }])).success).toBe(false);
  });
});
