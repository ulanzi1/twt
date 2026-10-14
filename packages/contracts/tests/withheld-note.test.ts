// Story 6.27b code review round 2 (X2) — ONE explicit "withheld" for a staff note a hidden reader may not see: the `state`
// variant on the note unions, and the REQUIRED `…_withheld` / `…Withheld` sibling on plain-string note fields.

import { describe, expect, it } from 'vitest';

import {
  AppealPanelVoteView,
  GroundInspectionPhotoItem,
  NOTE_WITHHELD_REASONS,
  PriorVerifierComment,
  R9PanelVote,
  R9VotesByTrusteeItem,
  RecentPrecedent,
  ReadableErasableNote,
  ReadableNote,
  StaffNoteDto,
} from '../src/index.js';

describe('X2 — the withheld note', () => {
  it('the two reasons — and nothing else', () => {
    expect([...NOTE_WITHHELD_REASONS]).toEqual(['own_visit', 'check_failed']);
  });

  it('every note union admits `{ state: withheld, reason }`, STRICT, with a known reason only', () => {
    for (const schema of [ReadableNote, ReadableErasableNote, StaffNoteDto]) {
      for (const reason of NOTE_WITHHELD_REASONS) expect(schema.safeParse({ state: 'withheld', reason }).success).toBe(true);
      expect(schema.safeParse({ state: 'withheld' }).success).toBe(false);
      expect(schema.safeParse({ state: 'withheld', reason: 'hidden' }).success).toBe(false);
      expect(schema.safeParse({ state: 'withheld', reason: 'own_visit', value: '' }).success).toBe(false);
      expect(schema.safeParse({ state: 'readable', value: 'n' }).success).toBe(true);
    }
  });

  it('the plain-string sibling is REQUIRED (`null` ⇔ ⛔ withheld) and carries a known reason only', () => {
    const vote = { vote_id: '11111111-1111-4111-8111-111111111111', voter_actor_id: 'v', voter_display: 'V', vote: 'approve', cast_at: 'x', clause_version_id: '22222222-2222-4222-8222-222222222222', rationale: '', covers_current_warnings: null };
    expect(R9PanelVote.safeParse(vote).success).toBe(false);
    expect(R9PanelVote.safeParse({ ...vote, rationale_withheld: 'own_visit' }).success).toBe(true);
    expect(R9PanelVote.safeParse({ ...vote, rationale_withheld: 'nope' }).success).toBe(false);
    const comment = { outcome: 'approved', reasonCode: 'x', rationale: '', actorDisplay: 'A', decidedAt: 'x', claimCaseId: 'c' };
    expect(PriorVerifierComment.safeParse(comment).success).toBe(false);
    expect(PriorVerifierComment.safeParse({ ...comment, rationaleWithheld: 'check_failed' }).success).toBe(true);
    const appealVote = { vote_id: '11111111-1111-4111-8111-111111111111', voter_actor_id: 'v', voter_display: 'V', vote: 'deny', cast_at: 'x', rationale: null };
    expect(AppealPanelVoteView.safeParse(appealVote).success).toBe(false);
    expect(AppealPanelVoteView.safeParse({ ...appealVote, rationale_withheld: null }).success).toBe(true);
  });

  // Y5 (a) — every Pattern-B DTO pairs the flag with an EMPTY text (`''` non-nullable, `null` nullable).
  it('a set flag ⇒ the text is EMPTY, on every Pattern-B DTO', () => {
    const vote = { vote_id: '11111111-1111-4111-8111-111111111111', voter_actor_id: 'v', voter_display: 'V', vote: 'approve', cast_at: 'x', clause_version_id: '22222222-2222-4222-8222-222222222222', covers_current_warnings: null };
    expect(R9PanelVote.safeParse({ ...vote, rationale: '', rationale_withheld: 'own_visit' }).success).toBe(true);
    expect(R9PanelVote.safeParse({ ...vote, rationale: 'words', rationale_withheld: 'own_visit' }).success).toBe(false);
    const byTrustee = {
      vote_id: '11111111-1111-4111-8111-111111111111', session_id: '11111111-1111-4111-8111-111111111111', claim_case_id: '11111111-1111-4111-8111-111111111111',
      vote: 'deny', cast_at: 'x', superseded_at: null, clause_id: 'c', clause_version_id: '22222222-2222-4222-8222-222222222222', rule_code: 'R9',
      voting_requirement: 'majority', panel_actor_ids: [], session_outcome: null,
    };
    expect(R9VotesByTrusteeItem.safeParse({ ...byTrustee, rationale: '', rationale_withheld: 'check_failed' }).success).toBe(true);
    expect(R9VotesByTrusteeItem.safeParse({ ...byTrustee, rationale: 'words', rationale_withheld: 'check_failed' }).success).toBe(false);
    const appealVote = { vote_id: '11111111-1111-4111-8111-111111111111', voter_actor_id: 'v', voter_display: 'V', vote: 'deny', cast_at: 'x' };
    expect(AppealPanelVoteView.safeParse({ ...appealVote, rationale: null, rationale_withheld: 'own_visit' }).success).toBe(true);
    expect(AppealPanelVoteView.safeParse({ ...appealVote, rationale: 'words', rationale_withheld: 'own_visit' }).success).toBe(false);
    const comment = { outcome: 'approved', reasonCode: 'x', actorDisplay: 'A', decidedAt: 'x', claimCaseId: 'c' };
    expect(PriorVerifierComment.safeParse({ ...comment, rationale: '', rationaleWithheld: 'own_visit' }).success).toBe(true);
    expect(PriorVerifierComment.safeParse({ ...comment, rationale: 'words', rationaleWithheld: 'own_visit' }).success).toBe(false);
    const precedent = { claimCaseId: 'c', outcome: 'approved', reasonCode: 'x', actorDisplay: null, decidedAt: 'x' };
    expect(RecentPrecedent.safeParse({ ...precedent, rationale: null, rationaleWithheld: 'own_visit' }).success).toBe(true);
    expect(RecentPrecedent.safeParse({ ...precedent, rationale: '', rationaleWithheld: 'own_visit' }).success).toBe(false);
    const photo = { photoId: 'p', contentType: 'image/jpeg', byteSize: 1, signedUrl: 'u', photoKind: 'site' };
    expect(GroundInspectionPhotoItem.safeParse({ ...photo, caption: null, captionWithheld: 'own_visit' }).success).toBe(true);
    expect(GroundInspectionPhotoItem.safeParse({ ...photo, caption: 'front gate', captionWithheld: 'own_visit' }).success).toBe(false);
  });
});
