// Story 6.36e (Task 3; AC2, AC4) — the nominee-member-link wire shapes, every one `.strict()`:
//   · `NomineeDeclareEntry.memberLink` is OPTIONAL — a 6.36d-era body (⛔ mark) still parses; a NEW mark carries a number and
//     how it was found; a KEEP carries a link id; ⛔ a member id from the client, ⛔ an unknown kind, ⛔ an extra key;
//   · the declarer's read and the marked member's requests — the name nullable, ⛔ a number or a member id on either;
//   · the answer body is `yes` / `not_me` (⛔ the stored words); the requests cursor's bound fits a real worst case;
//   · the contact-matches `purpose` (NE3) is OPTIONAL and one of two values.

import { describe, expect, it } from 'vitest';

import {
  KnownPeopleContactMatchRequest,
  NOMINEE_LINK_REQUESTS_CURSOR_MAX,
  NomineeDeclareEntry,
  NomineeDeclareRequest,
  NomineeLinkAnswerRequest,
  NomineeLinkAnswerResponse,
  NomineeLinkParams,
  NomineeLinkRequestsQuery,
  NomineeLinkRequestsResponse,
  NomineeLinksView,
  NomineeMemberLink,
} from '../src/index.js';

const LINK = '44444444-4444-4444-8444-444444444444';
const AT = '2026-10-24T10:00:00.000Z';
const entry = (over: Record<string, unknown> = {}) => ({ name: 'Asha Devi', relationship: 'spouse', mobile: '9876543210', ...over });

describe('NomineeDeclareEntry.memberLink (AC2, NE2)', () => {
  it('is OPTIONAL — a body without a mark parses unchanged', () => {
    expect(NomineeDeclareRequest.parse({ nominees: [entry()] }).nominees[0]).not.toHaveProperty('memberLink');
  });

  it('a NEW mark: a number + how it was found; a KEEP: a link id', () => {
    for (const foundBy of ['contacts', 'picker', 'typed']) {
      expect(NomineeDeclareEntry.safeParse(entry({ memberLink: { kind: 'new', mobile: '+91 98765 43210', foundBy } })).success).toBe(true);
    }
    expect(NomineeDeclareEntry.safeParse(entry({ memberLink: { kind: 'keep', linkId: LINK } })).success).toBe(true);
  });

  it('refuses ⛔ a member id from the client, an unknown kind, a bad number, a missing field, an extra key', () => {
    const bad = [
      { kind: 'new', memberId: LINK, foundBy: 'typed' },
      { kind: 'new', mobile: '9876543210', foundBy: 'typed', memberId: LINK },
      { kind: 'new', mobile: '9876543210' },
      { kind: 'new', mobile: 'abc', foundBy: 'typed' },
      { kind: 'new', mobile: '9876543210', foundBy: 'search' },
      { kind: 'keep', linkId: 'not-a-uuid' },
      { kind: 'keep', linkId: LINK, mobile: '9876543210' },
      { kind: 'member', linkId: LINK },
    ];
    for (const memberLink of bad) expect(NomineeMemberLink.safeParse(memberLink).success, JSON.stringify(memberLink)).toBe(false);
  });
});

describe('the declarer read and the marked member side (AC2, AC4)', () => {
  it('NomineeLinksView — rank 1 | 2, three labels, the name nullable, at most two; strict', () => {
    const link = { rank: 1, linkId: LINK, label: 'asked', name: null };
    expect(NomineeLinksView.safeParse({ links: [link, { ...link, rank: 2, label: 'confirmed', name: 'Asha Devi' }] }).success).toBe(true);
    expect(NomineeLinksView.safeParse({ links: [{ ...link, label: 'not_me' }] }).success).toBe(true);
    expect(NomineeLinksView.safeParse({ links: [{ ...link, rank: 3 }] }).success).toBe(false);
    expect(NomineeLinksView.safeParse({ links: [{ ...link, label: 'declined' }] }).success).toBe(false);
    expect(NomineeLinksView.safeParse({ links: [link, link, link] }).success).toBe(false);
    expect(NomineeLinksView.safeParse({ links: [{ ...link, memberId: LINK }] }).success).toBe(false);
  });

  it('NomineeLinkRequestsResponse — open (answer null) and answered; the page fields required; strict', () => {
    const item = { linkId: LINK, answer: null, name: 'Ravi Kumar', askedAt: AT };
    expect(NomineeLinkRequestsResponse.safeParse({ items: [item, { ...item, answer: 'not_me', name: null }], nextCursor: null, hasMore: false }).success).toBe(true);
    expect(NomineeLinkRequestsResponse.safeParse({ items: [] }).success).toBe(false);
    expect(NomineeLinkRequestsResponse.safeParse({ items: [{ ...item, answer: 'yes' }], nextCursor: null, hasMore: false }).success).toBe(false);
    expect(NomineeLinkRequestsResponse.safeParse({ items: [{ ...item, mobile: '9876543210' }], nextCursor: null, hasMore: false }).success).toBe(false);
  });

  it('the requests list pages by an opaque cursor; a real worst-case cursor fits its bound', () => {
    expect(NomineeLinkRequestsQuery.parse({ limit: '20', cursor: 'abc' })).toEqual({ limit: 20, cursor: 'abc' });
    expect(NomineeLinkRequestsQuery.safeParse({ limit: '51' }).success).toBe(false);
    expect(NomineeLinkRequestsQuery.safeParse({ cursor: ' ' }).success).toBe(false);
    // the domain's encoding — `[kind, asked_at µs, link_id]` base64url — at its longest kind
    const worst = Buffer.from(JSON.stringify(['answered', '2026-10-24T10:00:00.123456Z', LINK]), 'utf8').toString('base64url');
    expect(worst.length).toBeLessThan(NOMINEE_LINK_REQUESTS_CURSOR_MAX);
    expect(NomineeLinkRequestsQuery.safeParse({ cursor: worst }).success).toBe(true);
    expect(NomineeLinkRequestsQuery.safeParse({ cursor: 'x'.repeat(NOMINEE_LINK_REQUESTS_CURSOR_MAX + 1) }).success).toBe(false);
  });

  it('the answer: `yes` / `not_me` in; `confirmed` / `not_me` out; the path param a uuid; strict', () => {
    expect(NomineeLinkAnswerRequest.safeParse({ answer: 'yes' }).success).toBe(true);
    expect(NomineeLinkAnswerRequest.safeParse({ answer: 'not_me' }).success).toBe(true);
    expect(NomineeLinkAnswerRequest.safeParse({ answer: 'confirmed' }).success).toBe(false);
    expect(NomineeLinkAnswerRequest.safeParse({ answer: 'yes', note: 'x' }).success).toBe(false);
    expect(NomineeLinkAnswerResponse.safeParse({ linkId: LINK, answer: 'confirmed' }).success).toBe(true);
    expect(NomineeLinkAnswerResponse.safeParse({ linkId: LINK, answer: 'yes' }).success).toBe(false);
    expect(NomineeLinkParams.safeParse({ linkId: 'x' }).success).toBe(false);
  });
});

describe('contact matching `purpose` (NE3, V12)', () => {
  it('is OPTIONAL — the 6.36b body parses unchanged — and one of `known_people` / `nominee_link`', () => {
    expect(KnownPeopleContactMatchRequest.parse({ numbers: ['1'] })).toEqual({ numbers: ['1'] });
    expect(KnownPeopleContactMatchRequest.safeParse({ numbers: ['1'], purpose: 'nominee_link' }).success).toBe(true);
    expect(KnownPeopleContactMatchRequest.safeParse({ numbers: ['1'], purpose: 'known_people' }).success).toBe(true);
    expect(KnownPeopleContactMatchRequest.safeParse({ numbers: ['1'], purpose: 'marketing' }).success).toBe(false);
  });
});
