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
    },
  },
};

describe('ClaimPeerAnswersResponse (Story 6.27b, PM24)', () => {
  it('`peerMesh` ABSENT (hidden), `empty`, `unavailable` and `present` are all valid', () => {
    expect(ClaimPeerAnswersResponse.safeParse({}).success).toBe(true);
    expect(ClaimPeerAnswersResponse.safeParse({ peerMesh: { status: 'empty' } }).success).toBe(true);
    expect(ClaimPeerAnswersResponse.safeParse({ peerMesh: { status: 'unavailable' } }).success).toBe(true);
    expect(ClaimPeerAnswersResponse.safeParse(present).success).toBe(true);
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
