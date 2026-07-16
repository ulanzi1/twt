// Appeal contract tests — Story 6.16 (Task 11). The wire DTOs' validation + the DRIFT LOCKSTEP pinning the
// re-declared wire enums against the @twt/domain canonical pgEnum tuples (contracts tests MAY import domain).

import { claim } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import {
  AppealDispositionCategory,
  AppealFinalDecision,
  AppealPanelOutcome,
  AppealPanelVote,
  AppealReviewDecision,
  AppealStage,
  AppealStage1ReviewRequest,
  AppealStage2FinalizeRequest,
  AppealStage2OpenRequest,
  AppealStage3DecideRequest,
  APPEAL_PANEL_MAX_MEMBERS,
  APPEAL_PANEL_MIN_MEMBERS,
} from '../src/claims/appeal.js';

describe('AppealStage1ReviewRequest — disposition required iff reversed (D-A)', () => {
  it('accepts reverse + disposition', () => {
    expect(AppealStage1ReviewRequest.safeParse({ decision: 'reversed', rationale: 'new docs', disposition_category: 'new_evidence_presented' }).success).toBe(true);
  });
  it('rejects reverse WITHOUT disposition', () => {
    expect(AppealStage1ReviewRequest.safeParse({ decision: 'reversed', rationale: 'x' }).success).toBe(false);
  });
  it('accepts advance without disposition', () => {
    expect(AppealStage1ReviewRequest.safeParse({ decision: 'advance', rationale: 'stands' }).success).toBe(true);
  });
  it('rejects advance WITH a disposition (only reversed carries one)', () => {
    expect(AppealStage1ReviewRequest.safeParse({ decision: 'advance', rationale: 'x', disposition_category: 'procedural_correction' }).success).toBe(false);
  });
  it('rejects an empty rationale + a >500-char rationale', () => {
    expect(AppealStage1ReviewRequest.safeParse({ decision: 'advance', rationale: '' }).success).toBe(false);
    expect(AppealStage1ReviewRequest.safeParse({ decision: 'advance', rationale: 'a'.repeat(501) }).success).toBe(false);
  });
});

describe('AppealStage3DecideRequest — upheld|reversed (no advance, D-C)', () => {
  it('rejects an `advance` decision (Stage 3 is final)', () => {
    expect(AppealStage3DecideRequest.safeParse({ decision: 'advance', rationale: 'x' }).success).toBe(false);
  });
  it('accepts uphold without disposition; reverse requires it', () => {
    expect(AppealStage3DecideRequest.safeParse({ decision: 'upheld', rationale: 'stands' }).success).toBe(true);
    expect(AppealStage3DecideRequest.safeParse({ decision: 'reversed', rationale: 'x' }).success).toBe(false);
  });
});

describe('AppealStage2OpenRequest — panel roster (≥2, de-dup, ≤max)', () => {
  const uuid = (n: number) => `00000000-0000-0000-0000-00000000000${n}`;
  it('rejects a single-member roster (D-B minimum 2)', () => {
    expect(AppealStage2OpenRequest.safeParse({ panel_actor_ids: [uuid(1)] }).success).toBe(false);
  });
  it('accepts a two-member roster', () => {
    expect(AppealStage2OpenRequest.safeParse({ panel_actor_ids: [uuid(1), uuid(2)] }).success).toBe(true);
  });
  it('rejects a duplicate roster', () => {
    expect(AppealStage2OpenRequest.safeParse({ panel_actor_ids: [uuid(1), uuid(1)] }).success).toBe(false);
  });
});

describe('AppealStage2FinalizeRequest — disposition optional (server computes the outcome)', () => {
  it('accepts finalize with just a rationale (disposition supplied only when it will reverse)', () => {
    expect(AppealStage2FinalizeRequest.safeParse({ rationale: 'panel decision' }).success).toBe(true);
  });
});

describe('DRIFT LOCKSTEP — appeal wire vocabulary matches @twt/domain canonical sources', () => {
  it('AppealStage options === domain APPEAL_STAGES', () => {
    expect(AppealStage.options).toEqual([...claim.APPEAL_STAGES]);
  });
  it('AppealPanelVote options === domain APPEAL_PANEL_VOTES', () => {
    expect(AppealPanelVote.options).toEqual([...claim.APPEAL_PANEL_VOTES]);
  });
  it('AppealPanelOutcome options === domain APPEAL_PANEL_OUTCOMES', () => {
    expect(AppealPanelOutcome.options).toEqual([...claim.APPEAL_PANEL_OUTCOMES]);
  });
  it('AppealDispositionCategory options === domain APPEAL_DISPOSITION_CATEGORIES', () => {
    expect(AppealDispositionCategory.options).toEqual([...claim.APPEAL_DISPOSITION_CATEGORIES]);
  });
  it('the Stage-1/2 review-decision set is the reverse|advance subset of the domain APPEAL_DECISIONS', () => {
    expect(AppealReviewDecision.options).toEqual(['reversed', 'advance']);
    expect(AppealFinalDecision.options).toEqual(['reversed', 'upheld']);
    // Every wire literal is a member of the domain decision enum.
    for (const v of [...AppealReviewDecision.options, ...AppealFinalDecision.options]) {
      expect(claim.APPEAL_DECISIONS as readonly string[]).toContain(v);
    }
  });
  it('the panel bounds match the domain constants', () => {
    expect(APPEAL_PANEL_MIN_MEMBERS).toBe(claim.APPEAL_PANEL_MIN_MEMBERS);
    expect(APPEAL_PANEL_MAX_MEMBERS).toBe(claim.APPEAL_PANEL_MAX_MEMBERS);
  });
});
