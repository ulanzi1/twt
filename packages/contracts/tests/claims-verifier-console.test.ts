// Verifier-console contract tests — Story 6.10 (Task 6; AC2/AC7).
//
// The VerifierConsolePacket wire shape. Focus:
//   · the four-state section vocabulary is a DISCRIMINATED union that accepts each valid state and
//     rejects a state a section does not admit (e.g. (c)/(d) never `not_available_yet`);
//   · the concealment tri-state accepts flagged|not_flagged|not_evaluated and its detail_visibility;
//   · the three non-present states parse DISTINCTLY (never collapsed);
//   · a full present packet round-trips; arrays are preserved in order.

import { describe, expect, it } from 'vitest';

import {
  ConcealmentSignal,
  DocumentReviewSection,
  GroundInspectionSection,
  PeerMeshSection,
  PeerMeshVerifierAnnotations,
  PriorVerifierCommentsSection,
  RecentPrecedentsSection,
  ValiditySection,
  VerifierConsolePacket,
  VerifierConsoleResponse,
} from '../src/claims/index.js';

describe('VerifierConsolePacket — four-state section vocabulary (AC7)', () => {
  it('the three non-present states parse DISTINCTLY and are never collapsed', () => {
    expect(PriorVerifierCommentsSection.parse({ status: 'empty' }).status).toBe('empty');
    expect(PriorVerifierCommentsSection.parse({ status: 'unavailable' }).status).toBe('unavailable');
    expect(PriorVerifierCommentsSection.parse({ status: 'not_available_yet' }).status).toBe('not_available_yet');
  });

  it('sections (c)/(d) do NOT admit not_available_yet (they never gain a future producer)', () => {
    expect(PeerMeshSection.safeParse({ status: 'not_available_yet' }).success).toBe(false);
    expect(GroundInspectionSection.safeParse({ status: 'not_available_yet' }).success).toBe(false);
    // …but they DO admit empty + unavailable.
    expect(PeerMeshSection.safeParse({ status: 'empty' }).success).toBe(true);
    expect(GroundInspectionSection.safeParse({ status: 'unavailable' }).success).toBe(true);
  });

  it('sections (e)/(f) admit not_available_yet (until Story 6.11)', () => {
    expect(PriorVerifierCommentsSection.safeParse({ status: 'not_available_yet' }).success).toBe(true);
    expect(RecentPrecedentsSection.safeParse({ status: 'not_available_yet' }).success).toBe(true);
  });

  it('validity admits only present|unavailable (a service is either there or transiently down)', () => {
    expect(ValiditySection.safeParse({ status: 'unavailable' }).success).toBe(true);
    expect(ValiditySection.safeParse({ status: 'empty' }).success).toBe(false);
    expect(ValiditySection.safeParse({ status: 'not_available_yet' }).success).toBe(false);
  });

  it('a document-review present section requires the reviews array; empty carries nothing', () => {
    expect(DocumentReviewSection.safeParse({ status: 'present' }).success).toBe(false);
    expect(DocumentReviewSection.safeParse({ status: 'present', reviews: [] }).success).toBe(true);
    expect(DocumentReviewSection.safeParse({ status: 'empty' }).success).toBe(true);
  });
});

describe('ConcealmentSignal tri-state (D10)', () => {
  it('accepts flagged|not_flagged|not_evaluated with a detail visibility', () => {
    for (const status of ['flagged', 'not_flagged', 'not_evaluated'] as const) {
      expect(ConcealmentSignal.parse({ status, detailVisibility: 'indicator_only' }).status).toBe(status);
    }
    expect(ConcealmentSignal.parse({ status: 'not_evaluated', detailVisibility: 'full' }).detailVisibility).toBe('full');
  });

  it('rejects a bare boolean/clear substitute (never collapse to a green flag)', () => {
    expect(ConcealmentSignal.safeParse({ status: 'clear', detailVisibility: 'indicator_only' }).success).toBe(false);
    expect(ConcealmentSignal.safeParse({ status: true }).success).toBe(false);
  });
});

describe('VerifierConsolePacket — full round-trip + ordering', () => {
  const PACKET = {
    claimCaseId: 'c1',
    pariwarId: 'p1',
    claimState: 'verification_in_progress',
    deceasedMemberId: 'm1',
    identity: { deceasedName: 'Suresh', deceasedDateOfBirth: '1955-03-01' },
    validity: { status: 'unavailable' as const },
    concealment: { status: 'not_evaluated' as const, detailVisibility: 'indicator_only' as const },
    documentReview: { status: 'empty' as const },
    peerMesh: {
      status: 'present' as const,
      transcript: {
        selectionId: 's1',
        distinctResponderCount: 2,
        pingedMemberIds: ['a', 'b', 'c'],
        responses: [
          { responderMemberId: 'a', response: 'confirmed' as const },
          { responderMemberId: 'b', response: 'unknown' as const },
        ],
        verifierAnnotations: { status: 'not_available_yet' as const },
      },
    },
    groundInspection: { status: 'empty' as const },
    priorVerifierComments: { status: 'not_available_yet' as const },
    recentPrecedents: { status: 'not_available_yet' as const },
  };

  it('parses a full packet and preserves array order', () => {
    const parsed = VerifierConsolePacket.parse(PACKET);
    expect(parsed.peerMesh.status).toBe('present');
    if (parsed.peerMesh.status === 'present') {
      expect(parsed.peerMesh.transcript.pingedMemberIds).toEqual(['a', 'b', 'c']);
      expect(parsed.peerMesh.transcript.responses.map((r) => r.responderMemberId)).toEqual(['a', 'b']);
    }
  });

  it('the response envelope wraps the packet', () => {
    expect(VerifierConsoleResponse.safeParse({ packet: PACKET }).success).toBe(true);
  });

  it('a non-response is never representable as a denial by absence (responses are explicit)', () => {
    // The transcript only carries explicit responses; an absent responder simply is not in the array.
    const parsed = VerifierConsolePacket.parse(PACKET);
    if (parsed.peerMesh.status === 'present') {
      expect(parsed.peerMesh.transcript.responses.find((r) => r.responderMemberId === 'c')).toBeUndefined();
    }
  });

  it("AC2c verifier annotations are explicitly not_available_yet — no owning producer story exists (2026-07-11 decision)", () => {
    const parsed = VerifierConsolePacket.parse(PACKET);
    if (parsed.peerMesh.status === 'present') {
      expect(parsed.peerMesh.transcript.verifierAnnotations).toEqual({ status: 'not_available_yet' });
    }
    // The schema only admits `not_available_yet` today — a fabricated `present` variant must be rejected.
    expect(PeerMeshVerifierAnnotations.safeParse({ status: 'present' }).success).toBe(false);
  });
});
