// Story 6.36c — the transport DTOs (Task 4.6; AC2–AC5, AC7).
//   · the staff add: trimmed, 1–200, ⛔ a control character; a UDISE code only for a school; the shapes of the codes;
//   · the queue item's key set carries ⛔ member data (⛔ a name, a mobile, a member id);
//   · the answer: `yes | no`; ONE discriminated response (a "Yes" carries the summary, a "No" nothing more);
//   · the prompts: the exact key set, ⛔ a name or a count; the campaign request is two IST dates;
//   · every response `.strict()`.

import { describe, expect, it } from 'vitest';

import {
  AdminWorkplaceAddRequest,
  AdminWorkplaceRenameRequest,
  AdminWorkplacesQuery,
  KNOWN_PEOPLE_CAMPAIGN_REFUSAL_CODES,
  KnownPeopleCampaignStartRequest,
  KnownPeopleCampaignWire,
  KnownPeoplePromptsResponse,
  WORKPLACE_ADMIN_REFUSAL_CODES,
  WORKPLACE_ANSWER_REFUSAL_CODES,
  WORKPLACE_MANAGE_STEP_UP_CONTEXT,
  WORKPLACE_REVIEW_STEP_UP_CONTEXT,
  WorkplaceAnswerRequest,
  WorkplaceAnswerResponse,
  WorkplaceRequestQueueItemWire,
  WorkplaceSuggestRequest,
} from '../src/index.js';

const ID = '0b9f6c1e-1d2a-4c3b-8e4f-5a6b7c8d9e0f';
const SUMMARY = {
  nominees: { declared: false, count: 0 },
  address: { recorded: false },
  posting: { recorded: true, is_retirement: false },
  medical: { disclosed: false, disclosure_count: 0 },
};

describe('the staff add / rename (AC2)', () => {
  it('trims the name; refuses blank, > 200, a control character', () => {
    expect(AdminWorkplaceAddRequest.parse({ kind: 'office', name: '  BEO Office  ', district: 'Patna' }).name).toBe('BEO Office');
    for (const name of ['   ', 'x'.repeat(201), 'Bad\u0007Name', 'Tab\tName']) {
      expect(AdminWorkplaceAddRequest.safeParse({ kind: 'office', name, district: 'Patna' }).success, JSON.stringify(name)).toBe(false);
    }
    expect(AdminWorkplaceAddRequest.safeParse({ kind: 'office', name: '𝒜'.repeat(200), district: 'Patna' }).success).toBe(true);
    expect(AdminWorkplaceRenameRequest.safeParse({ name: ' New Name ' }).success).toBe(true);
    expect(AdminWorkplaceRenameRequest.safeParse({ name: 'x', extra: 1 }).success).toBe(false);
  });

  it('a UDISE code only for a school, 11 digits; a block code 6 digits; a village ≤ 120', () => {
    expect(AdminWorkplaceAddRequest.safeParse({ kind: 'school', name: 'S', district: 'Patna', udiseSchoolCode: '10280100101' }).success).toBe(true);
    expect(AdminWorkplaceAddRequest.safeParse({ kind: 'office', name: 'O', district: 'Patna', udiseSchoolCode: '10280100101' }).success).toBe(false);
    expect(AdminWorkplaceAddRequest.safeParse({ kind: 'school', name: 'S', district: 'Patna', udiseSchoolCode: '1028' }).success).toBe(false);
    expect(AdminWorkplaceAddRequest.safeParse({ kind: 'office', name: 'O', district: 'Patna', blockCode: '10280' }).success).toBe(false);
    expect(AdminWorkplaceAddRequest.safeParse({ kind: 'office', name: 'O', district: 'Patna', villageName: 'v'.repeat(121) }).success).toBe(false);
  });

  it('the list query: every filter optional, the limit bounded', () => {
    expect(AdminWorkplacesQuery.safeParse({}).success).toBe(true);
    expect(AdminWorkplacesQuery.safeParse({ limit: '101' }).success).toBe(false);
    expect(AdminWorkplacesQuery.safeParse({ status: 'gone' }).success).toBe(false);
  });
});

describe('the queue (AC3)', () => {
  it('an item carries ⛔ member data — the exact key set', () => {
    expect(Object.keys(WorkplaceRequestQueueItemWire.shape).sort()).toEqual(
      ['createdAt', 'district', 'requestId', 'sameNameCount', 'startedOn', 'state', 'suggested', 'typedName', 'typedPlace'].sort(),
    );
    expect(Object.keys(WorkplaceRequestQueueItemWire.shape).some((k) => /member|mobile|phone|name$/i.test(k) && k !== 'typedName')).toBe(false);
  });

  it('suggest takes a uuid', () => {
    expect(WorkplaceSuggestRequest.safeParse({ workplaceId: ID }).success).toBe(true);
    expect(WorkplaceSuggestRequest.safeParse({ workplaceId: 'x' }).success).toBe(false);
  });

  it('the codes and the step-up contexts', () => {
    expect(WORKPLACE_ADMIN_REFUSAL_CODES).toContain('workplace.import_managed');
    expect(WORKPLACE_ANSWER_REFUSAL_CODES).toEqual(['workplace.request_not_found', 'workplace.request_closed', 'workplace.suggestion_stale', 'workplace.start_date_invalid']);
    expect(WORKPLACE_MANAGE_STEP_UP_CONTEXT).not.toBe(WORKPLACE_REVIEW_STEP_UP_CONTEXT);
  });
});

describe('the answer (AC4)', () => {
  it('`yes | no` only', () => {
    expect(WorkplaceAnswerRequest.safeParse({ answer: 'yes' }).success).toBe(true);
    expect(WorkplaceAnswerRequest.safeParse({ answer: 'maybe' }).success).toBe(false);
  });

  it('ONE response: "Yes" carries the summary, "No" nothing more', () => {
    expect(WorkplaceAnswerResponse.safeParse({ answer: 'yes', summary: SUMMARY }).success).toBe(true);
    expect(WorkplaceAnswerResponse.safeParse({ answer: 'no' }).success).toBe(true);
    expect(WorkplaceAnswerResponse.safeParse({ answer: 'no', summary: SUMMARY }).success).toBe(false);
    expect(WorkplaceAnswerResponse.safeParse({ answer: 'yes' }).success).toBe(false);
  });
});

describe('the prompts (AC5) and the campaign (AC7)', () => {
  it('the prompts: the exact key set; strict', () => {
    expect(Object.keys(KnownPeoplePromptsResponse.shape).sort()).toEqual(
      ['campaign', 'canNamePeople', 'hasWorkplace', 'noWorkplace', 'replaceNeeded', 'suggestedWorkplace', 'transferReview'].sort(),
    );
    const ok = {
      noWorkplace: false,
      hasWorkplace: true,
      suggestedWorkplace: null,
      transferReview: false,
      replaceNeeded: true,
      canNamePeople: true,
      campaign: { campaignId: ID },
    };
    expect(KnownPeoplePromptsResponse.safeParse(ok).success).toBe(true);
    expect(KnownPeoplePromptsResponse.safeParse({ ...ok, replaceCount: 1 }).success).toBe(false);
  });

  it('the campaign: two dates; the codes; the wire', () => {
    expect(KnownPeopleCampaignStartRequest.safeParse({ startsOn: '2026-11-01', endsOn: '2026-11-30' }).success).toBe(true);
    expect(KnownPeopleCampaignStartRequest.safeParse({ startsOn: '1 Nov', endsOn: '2026-11-30' }).success).toBe(false);
    expect(KNOWN_PEOPLE_CAMPAIGN_REFUSAL_CODES).toHaveLength(4);
    expect(
      KnownPeopleCampaignWire.safeParse({ campaignId: ID, startsOn: '2026-11-01', endsOn: '2026-11-02', status: 'live', endedAt: null, createdAt: '2026-10-16T00:00:00.000000Z' }).success,
    ).toBe(true);
  });
});
