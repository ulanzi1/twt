// Niyamavali admin pure view-logic tests — Story 2.4 (Task 8). No DOM.

import { describe, expect, it } from 'vitest';

import type { ClauseDraftResponse } from '@twt/contracts';

import {
  buildDraftBody,
  buildDraftPatch,
  draftToFormFields,
  draftStatusLabel,
  isEditable,
  isPublishable,
  publishErrorGuidance,
} from '../src/modules/niyamavali-admin/derive.js';

describe('draftStatusLabel', () => {
  it('maps lifecycle states to human labels', () => {
    expect(draftStatusLabel('in_review')).toBe('In review');
    expect(draftStatusLabel('signed_off')).toBe('Signed off');
    expect(draftStatusLabel('weird')).toBe('weird');
  });
});

describe('isPublishable', () => {
  it('is true only for signed_off', () => {
    expect(isPublishable('signed_off')).toBe(true);
    expect(isPublishable('in_review')).toBe(false);
    expect(isPublishable('draft')).toBe(false);
  });
});

describe('isEditable', () => {
  it('is true only for non-terminal draft states', () => {
    expect(isEditable('draft')).toBe(true);
    expect(isEditable('in_review')).toBe(true);
    expect(isEditable('signed_off')).toBe(true);
    expect(isEditable('published')).toBe(false);
    expect(isEditable('discarded')).toBe(false);
  });
});

describe('publishErrorGuidance (AC4 UI)', () => {
  it('gives the resolution path for tone_review.required', () => {
    expect(publishErrorGuidance('tone_review.required')).toMatch(/non-author/i);
    expect(publishErrorGuidance('tone_review.required')).toMatch(/sign off/i);
  });

  it('explains a self-review rejection', () => {
    expect(publishErrorGuidance('niyamavali.draft_self_review')).toMatch(/cannot tone-review/i);
  });

  it('returns null for an unknown code', () => {
    expect(publishErrorGuidance('http.500')).toBeNull();
  });
});

describe('buildDraftBody', () => {
  it('builds a create body with display fields → opaque payload', () => {
    const body = buildDraftBody({
      operation: 'create',
      clauseId: 'niy.a.b',
      ruleCode: 'R1',
      titleEn: 'Title',
      effectiveDate: '2026-08-01',
      benefitMechanism: 'pool',
    });
    expect(body).toMatchObject({
      operation: 'create',
      clauseId: 'niy.a.b',
      benefitMechanism: 'pool',
      payload: { rule_code: 'R1', title_en: 'Title' },
    });
    expect(body.effectiveDate).toBe('2026-08-01T00:00:00.000Z');
    // No title_hi key when blank.
    expect('title_hi' in (body.payload as object)).toBe(false);
  });

  it('builds an amend body with the affected-member scope', () => {
    const body = buildDraftBody({
      operation: 'amend',
      clauseId: 'niy.a.b',
      ruleCode: 'R1',
      titleEn: 'Title',
      titleHi: 'शीर्षक',
      effectiveDate: '2026-08-01',
      benefitMechanism: 'pool',
      affectedMemberScopeKind: 'past_lockin',
    });
    expect(body).toMatchObject({
      operation: 'amend',
      affectedMemberScope: { kind: 'past_lockin' },
      payload: { rule_code: 'R1', title_en: 'Title', title_hi: 'शीर्षक' },
    });
  });
});

describe('buildDraftPatch', () => {
  it('builds an edit patch without operation or clause id', () => {
    const patch = buildDraftPatch({
      operation: 'create',
      clauseId: 'niy.a.b',
      ruleCode: 'R1',
      titleEn: 'Updated',
      effectiveDate: '2026-08-01',
      benefitMechanism: 'reserve',
    });
    expect(patch).toEqual({
      payload: { rule_code: 'R1', title_en: 'Updated' },
      effectiveDate: '2026-08-01T00:00:00.000Z',
      benefitMechanism: 'reserve',
    });
  });
});

describe('draftToFormFields', () => {
  it('hydrates the guided form from a persisted draft', () => {
    const draft = {
      draftId: '44444444-4444-4444-4444-444444444444',
      pariwarId: '11111111-1111-1111-1111-111111111111',
      clauseId: 'niy.a.b',
      operation: 'amend',
      payload: { rule_code: 'R1', title_en: 'Title', title_hi: 'शीर्षक' },
      effectiveDate: '2026-08-01T00:00:00.000Z',
      benefitMechanism: 'pool',
      affectedMemberScope: { kind: 'past_lockin' },
      status: 'draft',
      authoredByActor: '22222222-2222-2222-2222-222222222222',
      toneReviewedBy: null,
      toneReviewedAt: null,
      toneReviewContentHash: null,
      publishedClauseVersionId: null,
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
      auditId: null,
    } as unknown as ClauseDraftResponse;
    expect(draftToFormFields(draft)).toMatchObject({
      operation: 'amend',
      clauseId: 'niy.a.b',
      ruleCode: 'R1',
      titleEn: 'Title',
      titleHi: 'शीर्षक',
      effectiveDate: '2026-08-01',
      affectedMemberScopeKind: 'past_lockin',
    });
  });
});
