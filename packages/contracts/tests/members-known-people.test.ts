// Story 6.36b — the people-who-know-me transport DTOs (Task 3; AC3–AC8).
//   · matching: 1–1,000 entries, each ≤ 32 characters; the response carries POSITIONS only;
//   · ⛔ a member id or a number on any response (the views' key sets are exact);
//   · `.strict()` everywhere; the label enum is `asked | accepted | not_accepted | unavailable`.

import { describe, expect, it } from 'vitest';

import {
  KNOWN_PEOPLE_ERROR_CODES,
  KnownPeopleAnswerRequest,
  KnownPeopleContactMatchRequest,
  KnownPeopleContactMatchResponse,
  KnownPeopleListQuery,
  KnownPeopleRequestView,
  KnownPeopleWriteResponse,
  KnownPersonAskRequest,
  KnownPersonLabelWire,
  KnownPersonView,
  MyKnownPeopleResponse,
  ProfileSection,
} from '../src/index.js';

const LINK = '0b9f6c1e-1d2a-4c3b-8e4f-5a6b7c8d9e0f';
const AT = '2026-10-14T10:00:00.000Z';

describe('KnownPeopleContactMatchRequest', () => {
  it('admits 1–1,000 entries of ≤ 32 characters', () => {
    expect(KnownPeopleContactMatchRequest.safeParse({ numbers: ['+919876543210'] }).success).toBe(true);
    expect(KnownPeopleContactMatchRequest.safeParse({ numbers: Array.from({ length: 1000 }, () => '+919876543210') }).success).toBe(true);
  });

  it('refuses an empty list, a 1,001st entry, an entry over 32 characters, an extra key', () => {
    expect(KnownPeopleContactMatchRequest.safeParse({ numbers: [] }).success).toBe(false);
    expect(KnownPeopleContactMatchRequest.safeParse({ numbers: Array.from({ length: 1001 }, () => '9') }).success).toBe(false);
    expect(KnownPeopleContactMatchRequest.safeParse({ numbers: ['9'.repeat(33)] }).success).toBe(false);
    expect(KnownPeopleContactMatchRequest.safeParse({ numbers: ['9'], names: ['x'] }).success).toBe(false);
  });

  it('⛔ a schema failure echoes a submitted value in its issues (the 400\'s `details.issues`)', () => {
    const planted = '+917012345678';
    for (const body of [
      { numbers: Array.from({ length: 1001 }, () => planted) },
      { numbers: [planted.repeat(3)] },
      { numbers: [planted, 7012345678] },
    ]) {
      const r = KnownPeopleContactMatchRequest.safeParse(body);
      expect(r.success).toBe(false);
      expect(JSON.stringify(r.success ? null : r.error.issues)).not.toMatch(/7012345678/);
    }
  });

  it('the response is positions only', () => {
    expect(KnownPeopleContactMatchResponse.parse({ matched: [0, 4] })).toEqual({ matched: [0, 4] });
    expect(KnownPeopleContactMatchResponse.safeParse({ matched: [0], memberIds: [LINK] }).success).toBe(false);
    expect(KnownPeopleContactMatchResponse.safeParse({ matched: [-1] }).success).toBe(false);
  });
});

describe('asking and the lists', () => {
  it('the ask: a mobile ≤ 32 characters and HOW it was found', () => {
    expect(KnownPersonAskRequest.safeParse({ mobile: '9876543210', foundBy: 'typed' }).success).toBe(true);
    expect(KnownPersonAskRequest.safeParse({ mobile: '9876543210', foundBy: 'directory' }).success).toBe(false);
    expect(KnownPersonAskRequest.safeParse({ mobile: '', foundBy: 'typed' }).success).toBe(false);
    expect(KnownPersonAskRequest.safeParse({ mobile: '9'.repeat(33), foundBy: 'typed' }).success).toBe(false);
  });

  it('the label enum is exactly asked | accepted | not_accepted | unavailable', () => {
    expect(KnownPersonLabelWire.options).toEqual(['asked', 'accepted', 'not_accepted', 'unavailable']);
  });

  it('a view carries ⛔ a member id, ⛔ a number — its key set is exact', () => {
    expect(Object.keys(KnownPersonView.shape).sort()).toEqual(['askedAt', 'label', 'linkId', 'name']);
    expect(Object.keys(KnownPeopleRequestView.shape).sort()).toEqual(['askedAt', 'linkId', 'name', 'state']);
    expect(KnownPersonView.safeParse({ linkId: LINK, label: 'asked', name: null, askedAt: AT, memberId: LINK }).success).toBe(false);
  });

  it('freeSlots is 0–3; the list declares a bounded limit', () => {
    expect(MyKnownPeopleResponse.safeParse({ items: [], freeSlots: 3 }).success).toBe(true);
    expect(MyKnownPeopleResponse.safeParse({ items: [], freeSlots: 4 }).success).toBe(false);
    expect(KnownPeopleListQuery.safeParse({ limit: '51' }).success).toBe(false);
    expect(KnownPeopleListQuery.parse({ limit: '20' })).toEqual({ limit: 20 });
  });

  it('answer and write results', () => {
    expect(KnownPeopleAnswerRequest.safeParse({ answer: 'accept' }).success).toBe(true);
    expect(KnownPeopleAnswerRequest.safeParse({ answer: 'maybe' }).success).toBe(false);
    expect(KnownPeopleWriteResponse.safeParse({ linkId: LINK, state: 'asked' }).success).toBe(false);
    expect(KnownPeopleWriteResponse.safeParse({ linkId: LINK, state: 'withdrawn' }).success).toBe(true);
  });

  it('the data export\'s knownPeople lists: the seen name or null, ⛔ a member id (strict)', () => {
    const shape = (ProfileSection.shape.knownPeople as unknown as { shape: { named: { element: { safeParse: (v: unknown) => { success: boolean } } } } }).shape.named.element;
    const link = { name: null, state: 'declined', foundBy: 'picker', askedAt: AT, respondedAt: AT, endedAt: AT };
    expect(shape.safeParse(link).success).toBe(true);
    expect(shape.safeParse({ ...link, otherMemberId: LINK }).success).toBe(false);
    expect(shape.safeParse({ ...link, state: 'ended' }).success).toBe(false);
  });

  it('every error code is in the known_people namespace', () => {
    for (const code of Object.values(KNOWN_PEOPLE_ERROR_CODES)) expect(code).toMatch(/^known_people\.[a-z_]+$/);
  });
});
