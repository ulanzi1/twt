// Story 6.32 (AC4 (a), AC10; I1) — the approval state is `complete` whatever the questionnaire holds. 6.26a's ONE definition of
// "complete" (`groundInspectionApprovalState`) takes ⛔ answer as input — so the scenarios below differ ONLY in what the
// family said, and every one is `complete`; and the INPUT SHAPE is pinned (a field added to feed it an answer — the shape
// that made 6.26a's invariant 2 necessary — turns this red).

import { describe, expect, it } from 'vitest';

import {
  groundInspectionApprovalState,
  type GroundInspectionApprovalAssignment,
  type GroundInspectionApprovalFacts,
} from '../../src/claim/ground-inspection-approval.js';

const UPLOAD = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const visit: GroundInspectionApprovalAssignment = { groundInspectionId: 'g1', status: 'completed', inspectionStage: 'initial', comparedCertificateUploadId: UPLOAD };
const facts: GroundInspectionApprovalFacts = { ownAssignments: [visit], inheritedSourceClaimId: null, currentUploadId: UPLOAD };

describe('AC4 (a) — `complete` whatever the questionnaire holds (I1)', () => {
  it.each([
    ['a completed full visit with ZERO answers'],
    ['a completed full visit WITH answers (letter collected, a cause, an illness)'],
    ['a completed full visit whose pinned version\'s cause / illness are `pending` (the shipped v1)'],
    ['⭐ AC10 — a no-one-asked claim (⛔ selection), the head\'s letter NOT collected (IQ13 (A))'],
    ['a no-one-asked claim, the letter NOT RECORDED at all'],
    ['the family\'s account in total disagreement with every neighbour (③ / ④ shown)'],
  ])('%s ⇒ complete', () => {
    // The inputs are the SAME in every row: the predicate cannot see the questionnaire, by construction.
    expect(groundInspectionApprovalState(facts)).toEqual({ complete: true, waitReason: null });
  });

  it('the predicate\'s INPUT is exactly the four non-PII assignment facts + the inherited claim + the current upload — ⛔ an answer', () => {
    expect(Object.keys(facts).sort()).toEqual(['currentUploadId', 'inheritedSourceClaimId', 'ownAssignments']);
    expect(Object.keys(visit).sort()).toEqual(['comparedCertificateUploadId', 'groundInspectionId', 'inspectionStage', 'status']);
    // a type-level pin: an extra field on the facts is a compile error here (excess property check on the exact shape)
    const exact: Required<GroundInspectionApprovalFacts> = { ownAssignments: [], inheritedSourceClaimId: null, currentUploadId: null };
    expect(Object.keys(exact)).toHaveLength(3);
  });

  it('⭐ TEETH — the SAME predicate still WAITS without a completed full visit (the gate is real)', () => {
    expect(groundInspectionApprovalState({ ...facts, ownAssignments: [{ ...visit, status: 'scheduled' }] })).toEqual({ complete: false, waitReason: 'no_completed_inspection' });
  });
});
