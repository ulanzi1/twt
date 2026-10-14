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
  PeerMeshAnswerView,
  PeerMeshPingView,
  PEER_MESH_SEND_STATUSES,
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
        // Story 6.27a (PM13) — the 72-hour line and the per-neighbour views.
        outcome: 'pending' as const,
        windowExpiresAt: '2026-10-15T00:00:00.000Z',
        pings: [
          {
            pingId: 'p-a',
            memberId: 'a',
            responderName: { status: 'shown' as const, text: 'Asha' },
            sendStatus: 'accepted' as const,
            noTargetReason: null,
            reply: {
              submitted: false,
              answers: [
                { questionKey: 'has_died', question: 'Has Suresh died?', value: { kind: 'codes' as const, codes: ['died'], labels: ['Yes, they have died'] }, savedVia: 'member_app' as const, savedAt: '2026-10-12T00:00:00.000Z', changeCount: 0, warningFlag: false },
              ],
            },
            callbackMobile: { status: 'none' as const },
            callbackBasis: null,
          },
        ],
        // Story 6.27d (R5) — REQUIRED: the claim's recorded inspector discrepancies, with their notes.
        inspectionDiscrepancies: [
          {
            groundInspectionId: 'gi-1',
            completedAt: '2026-10-12T00:00:00.000Z',
            shownAt: '2026-10-12T00:00:01.000Z',
            questionKeys: ['has_died' as const],
            notes: [{ questionKey: 'has_died' as const, note: 'They said he died at home.', notedAt: '2026-10-12T00:05:00.000Z', authorDisplay: 'Anita Sharma' }],
          },
        ],
      },
    },
    groundInspection: { status: 'empty' as const },
    priorVerifierComments: { status: 'not_available_yet' as const },
    recentPrecedents: { status: 'not_available_yet' as const },
    // Story 6.12 — the live-shepherd section (AC6). `empty` = no live shepherd yet (pre-verification).
    shepherd: { status: 'empty' as const },
    // Story 6.18 (AC4/AC8) — the NON-PII name-check status. ⛔ Carries no name and no note: the
    // names live behind `claim.view_nominee_name_check` on their own route, read on demand.
    nomineeNameCheck: {
      // ⭐ `available` — could the section be READ at all, a different question from "is anything
      // missing". Without it a transient failure rendered as "bank details missing" (code review
      // 2026-09-20).
      available: true,
      accountsComplete: true,
      currentAndPassing: true,
      differenceReasons: [] as ('initial' | 'married_name' | 'bank_shortened_name')[],
    },
    // Story 6.26a (GI9) — why the approval waits for the ground inspection: NON-PII.
    groundInspectionGate: {
      available: true,
      complete: false,
      waitReason: 'certificate_check_required' as 'no_completed_inspection' | 'certificate_check_required' | null,
    },
    suspicionRefusal: { available: true, keptApartFrom: [], finalApprovalWaits: null },
    otherClaimsForDeath: { available: true, total: 0, claims: [] },
    finallyApprovedElsewhere: null,
    // Story 6.23a (NW8) — the nominee-change warnings: NON-PII (kinds, counts, the reason list).
    approvalWarnings: {
      available: true,
      kinds: [] as ('post_death_version' | 'recent_nominee_change')[],
      postDeath: 'evaluated' as const,
      uncoveredSinceApproval: 0,
      reviseBlocked: null as 'warning_approval_final' | 'warnings_not_current' | null,
      viewerCanRecordLateReason: false,
      lateKeysUncoveredForViewer: 0,
      ownVisitPending: false,
      reasonOptions: [
        {
          code: 'warnings_reviewed',
          reasonId: null as string | null,
          label: 'Warnings reviewed — approved despite them',
          whenToUse: 'Use when you have read every warning shown and still approve. Your note must say why.',
          addedByDisplay: null as string | null,
          addedAt: null as string | null,
          replacesLabel: null as string | null,
        },
      ],
    },
  };

  it('parses a full packet and preserves array order', () => {
    const parsed = VerifierConsolePacket.parse(PACKET);
    expect(parsed.peerMesh?.status).toBe('present');
    if (parsed.peerMesh?.status === 'present') {
      expect(parsed.peerMesh.transcript.pingedMemberIds).toEqual(['a', 'b', 'c']);
      expect(parsed.peerMesh.transcript.responses.map((r) => r.responderMemberId)).toEqual(['a', 'b']);
    }
  });

  it('the response envelope wraps the packet', () => {
    expect(VerifierConsoleResponse.safeParse({ packet: PACKET }).success).toBe(true);
  });

  it('Story 6.23a (NW8) — `approvalWarnings` is REQUIRED and STRICT: ⛔ a date of death or a name can ⛔ never ride it', () => {
    const { approvalWarnings, ...without } = PACKET;
    expect(VerifierConsolePacket.safeParse(without).success).toBe(false);
    for (const smuggled of [{ deathDate: '2026-05-10' }, { nomineeName: 'X' }]) {
      expect(VerifierConsolePacket.safeParse({ ...PACKET, approvalWarnings: { ...approvalWarnings, ...smuggled } }).success).toBe(false);
    }
    expect(
      VerifierConsolePacket.safeParse({ ...PACKET, approvalWarnings: { ...approvalWarnings, reviseBlocked: 'nope' } }).success,
    ).toBe(false);
  });

  it('Story 6.26a (GI9) — `groundInspectionGate` is REQUIRED and STRICT, and its wait reason is a closed set', () => {
    const { groundInspectionGate, ...without } = PACKET;
    expect(VerifierConsolePacket.safeParse(without).success).toBe(false);
    expect(VerifierConsolePacket.safeParse({ ...PACKET, groundInspectionGate: { ...groundInspectionGate, deathDate: '2026-05-10' } }).success).toBe(false);
    expect(VerifierConsolePacket.safeParse({ ...PACKET, groundInspectionGate: { ...groundInspectionGate, waitReason: 'refused' } }).success).toBe(false);
    expect(
      VerifierConsolePacket.safeParse({ ...PACKET, groundInspectionGate: { available: false, complete: false, waitReason: null } }).success,
    ).toBe(true);
  });

  it('Story 6.28 (OP14 (a)) — `otherClaimsForDeath` is REQUIRED', () => {
    const { otherClaimsForDeath, ...without } = PACKET;
    expect(VerifierConsolePacket.safeParse(without).success).toBe(false);
    expect(VerifierConsolePacket.safeParse({ ...PACKET, otherClaimsForDeath: { ...otherClaimsForDeath, total: -1 } }).success).toBe(false);
  });

  it('Story 6.24a (RF10) — `suspicionRefusal` is REQUIRED and STRICT: the other claim by REFERENCE (⛔ not an id field, ⛔ not a name), closed sets', () => {
    const { suspicionRefusal, ...without } = PACKET;
    expect(VerifierConsolePacket.safeParse(without).success).toBe(false);
    const kept = { reference: 'ABC-1234', appeal: 'not_filed', appealUntil: '2026-12-30' };
    expect(
      VerifierConsolePacket.safeParse({ ...PACKET, suspicionRefusal: { available: true, keptApartFrom: [kept], finalApprovalWaits: 'appeal_not_filed' } }).success,
    ).toBe(true);
    expect(VerifierConsolePacket.safeParse({ ...PACKET, suspicionRefusal: { ...suspicionRefusal, keptApartFrom: [{ ...kept, name: 'X' }] } }).success).toBe(false);
    expect(VerifierConsolePacket.safeParse({ ...PACKET, suspicionRefusal: { ...suspicionRefusal, keptApartFrom: [{ ...kept, appeal: 'reversed' }] } }).success).toBe(false);
    expect(VerifierConsolePacket.safeParse({ ...PACKET, suspicionRefusal: { ...suspicionRefusal, finalApprovalWaits: 'refused' } }).success).toBe(false);
  });

  it('Story 6.26a (GI10) — a ground-inspection assignment carries the inspector\'s record; the photo carries its kind', () => {
    const assignment = {
      groundInspectionId: 'gi-1',
      district: 'Patna',
      inspectionStage: 'certificate_check',
      inspectionSiteType: 'school_or_office',
      inspectorActorId: 'inspector-1',
      scheduledAt: '2026-05-01T06:00:00.000Z',
      status: 'completed',
      refusalReason: null,
      completedAt: '2026-05-02T06:00:00.000Z',
      notes: null,
      notesWithheld: null,
      structuredFindings: null,
      photos: [{ photoId: 'p1', contentType: 'image/jpeg', byteSize: 1, caption: null, captionWithheld: null, signedUrl: 'u', photoKind: 'original_certificate' }],
      originalCertificateVerdict: 'does_not_match',
      comparedAgainst: 'current',
      deathDateSource: 'original_certificate',
      deathDate: '2026-04-30',
      deathTime: null,
      deathDateUnreadable: false,
      deathTimeUnreadable: false,
      inherited: false,
      // Story 6.26b (GI10 [b]; RD18) — the per-assignment comparison and the two warning flags.
      dateComparison: 'differs',
      dateDiffersWarning: true,
      originalMismatchWarning: true,
    };
    const ok = { ...PACKET, groundInspection: { status: 'present' as const, assignments: [assignment] } };
    expect(VerifierConsolePacket.safeParse(ok).success).toBe(true);
    // Story 6.26b — `null` ("could not be checked just now") is representable on all three; ⛔ absent is not.
    const unknown = { ...assignment, dateComparison: null, dateDiffersWarning: null, originalMismatchWarning: null };
    expect(VerifierConsolePacket.safeParse({ ...PACKET, groundInspection: { status: 'present', assignments: [unknown] } }).success).toBe(true);
    const noComparison: Record<string, unknown> = { ...assignment };
    delete noComparison.dateComparison;
    // ⛔ An unknown verdict, comparison or photo kind is refused — and (6.26b) a missing comparison or an unknown one.
    for (const bad of [
      { ...assignment, originalCertificateVerdict: 'unclear' },
      { ...assignment, comparedAgainst: 'later' },
      { ...assignment, photos: [{ ...assignment.photos[0], photoKind: 'selfie' }] },
      noComparison,
      { ...assignment, dateComparison: 'later' },
    ]) {
      expect(VerifierConsolePacket.safeParse({ ...PACKET, groundInspection: { status: 'present', assignments: [bad] } }).success).toBe(false);
    }
  });

  it('a non-response is never representable as a denial by absence (responses are explicit)', () => {
    // The transcript only carries explicit responses; an absent responder simply is not in the array.
    const parsed = VerifierConsolePacket.parse(PACKET);
    if (parsed.peerMesh?.status === 'present') {
      expect(parsed.peerMesh.transcript.responses.find((r) => r.responderMemberId === 'c')).toBeUndefined();
    }
  });

  it("AC2c verifier annotations are explicitly not_available_yet — no owning producer story exists (2026-07-11 decision)", () => {
    const parsed = VerifierConsolePacket.parse(PACKET);
    if (parsed.peerMesh?.status === 'present') {
      expect(parsed.peerMesh.transcript.verifierAnnotations).toEqual({ status: 'not_available_yet' });
    }
    // The schema only admits `not_available_yet` today — a fabricated `present` variant must be rejected.
    expect(PeerMeshVerifierAnnotations.safeParse({ status: 'present' }).success).toBe(false);
  });

  // ── Story 6.27a (PM13, PM25 (c)) ──────────────────────────────────────────────────────────────────────────────────
  it('6.27a — `peerMesh` is OPTIONAL (absent for an inspector before their full visit) — ⛔ a new "hidden" variant', () => {
    const withoutPeerMesh: Record<string, unknown> = { ...PACKET };
    delete withoutPeerMesh['peerMesh'];
    expect(VerifierConsolePacket.safeParse(withoutPeerMesh).success).toBe(true);
    expect(VerifierConsolePacket.safeParse({ ...PACKET, peerMesh: { status: 'hidden' } }).success).toBe(false);
  });

  it('6.27a — every send status has a value; a decrypt failure is `unavailable`, ⛔ a blank', () => {
    expect([...PEER_MESH_SEND_STATUSES]).toEqual(['not_sent', 'attempting', 'accepted', 'rejected_invalid_number', 'rejected_unreachable', 'no_target', 'error', 'skipped_superseded']);
    expect(PEER_MESH_SEND_STATUSES).not.toContain('recorded');
    const ping = (PACKET.peerMesh.transcript.pings[0]!);
    expect(PeerMeshPingView.safeParse({ ...ping, responderName: { status: 'unavailable' } }).success).toBe(true);
    expect(PeerMeshPingView.safeParse({ ...ping, responderName: { status: 'shown', text: '' }, sendStatus: 'recorded' }).success).toBe(false);
    expect(PeerMeshAnswerView.safeParse({ ...ping.reply!.answers[0]!, value: { kind: 'unavailable' } }).success).toBe(true);
  });

  // Code review round 2 (S9) — `shown` ⇔ a basis, on every status the producer emits.
  it('6.27b — `callbackBasis` is PAIRED with `callbackMobile`: shown ⇔ a basis; `none` / `unavailable` carry `null`', () => {
    const ping = PACKET.peerMesh.transcript.pings[0]!;
    const parse = (callbackMobile: unknown, callbackBasis: unknown) => PeerMeshPingView.safeParse({ ...ping, callbackMobile, callbackBasis }).success;
    expect(parse({ status: 'shown', text: '+919876543210' }, 'consented')).toBe(true);
    expect(parse({ status: 'shown', text: '+919876543210' }, 'super_admin')).toBe(true);
    expect(parse({ status: 'none' }, null)).toBe(true);
    expect(parse({ status: 'unavailable' }, null)).toBe(true);
    expect(parse({ status: 'shown', text: '+919876543210' }, null)).toBe(false);
    expect(parse({ status: 'none' }, 'consented')).toBe(false);
    expect(parse({ status: 'unavailable' }, 'super_admin')).toBe(false);
  });
});
