// Story 6.27b — two PURE halves of the neighbours' section:
//   · `stitchPeerAnswerFlags` (PM13's flags; AC8; Invariant 8) — every branch × both warning questions × a non-warning
//     question: `false` for a question that can ⛔ never warn; `null` on a FAILED read and for an answer the read did ⛔
//     see; else the read's own flag — and `answerId` ⛔ on the wire;
//   · `callbackBasisFor` (`-328` read with `-329`) — the call-back number's FOUR rules, in order.

import { describe, expect, it } from 'vitest';

import {
  callbackBasisFor,
  stitchPeerAnswerFlags,
  type UnstitchedPeerMeshAnswerView,
  type UnstitchedPeerMeshSection,
} from '../../src/modules/claims/peer-answers-assembler.js';

const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const answer = (questionKey: string, answerId: string): UnstitchedPeerMeshAnswerView => ({
  answerId,
  questionKey,
  question: 'q',
  value: { kind: 'codes', codes: ['x'], labels: ['x'] },
  savedVia: 'member_app',
  savedAt: '2026-10-12T00:00:00.000Z',
  changeCount: 0,
});
const section = (...answers: UnstitchedPeerMeshAnswerView[]): UnstitchedPeerMeshSection => ({
  status: 'present',
  transcript: {
    selectionId: 's',
    distinctResponderCount: 0,
    pingedMemberIds: [],
    responses: [],
    verifierAnnotations: { status: 'not_available_yet' },
    outcome: 'pending',
    windowExpiresAt: '2026-10-15T00:00:00.000Z',
    pings: [
      {
        pingId: 'p',
        memberId: 'm',
        responderName: { status: 'none' },
        sendStatus: 'accepted',
        noTargetReason: null,
        reply: { submitted: false, answers },
        callbackMobile: { status: 'none' },
        callbackBasis: null,
      },
    ],
    // Story 6.27d (R5) — REQUIRED, possibly empty; the stitch passes it through by spread.
    inspectionDiscrepancies: [],
  },
});
const flags = (s: ReturnType<typeof stitchPeerAnswerFlags>) =>
  s.status === 'present' ? s.transcript.pings.flatMap((p) => p.reply?.answers.map((a) => a.warningFlag) ?? []) : [];

describe('stitchPeerAnswerFlags (AC8)', () => {
  for (const key of ['has_died', 'death_date'] as const) {
    it(`\`${key}\`: the read's flag (\`true\` / \`false\`), \`null\` when the read FAILED, \`null\` when the read did ⛔ see it`, () => {
      const upper = A.toUpperCase();
      expect(flags(stitchPeerAnswerFlags(section(answer(key, upper)), { peerAnswerFlags: new Map([[A, true]]) }))).toEqual([true]);
      expect(flags(stitchPeerAnswerFlags(section(answer(key, A)), { peerAnswerFlags: new Map([[A, false]]) }))).toEqual([false]);
      expect(flags(stitchPeerAnswerFlags(section(answer(key, A)), { peerAnswerFlags: null }))).toEqual([null]);
      expect(flags(stitchPeerAnswerFlags(section(answer(key, A)), { peerAnswerFlags: new Map() }))).toEqual([null]);
    });
  }

  it('a question that can ⛔ never warn is `false` — whatever the read (even a failed one)', () => {
    for (const read of [null, new Map<string, boolean>(), new Map([[A, true]])]) {
      expect(flags(stitchPeerAnswerFlags(section(answer('callback_consent', A)), { peerAnswerFlags: read }))).toEqual([false]);
    }
  });

  it('`answerId` ⛔ reaches the wire; a non-present section and a ping with ⛔ reply pass through', () => {
    const out = stitchPeerAnswerFlags(section(answer('has_died', A)), { peerAnswerFlags: new Map([[A, true]]) });
    expect(JSON.stringify(out)).not.toContain(A);
    expect(stitchPeerAnswerFlags({ status: 'unavailable' }, { peerAnswerFlags: null })).toEqual({ status: 'unavailable' });
    const noReply = section();
    if (noReply.status === 'present') noReply.transcript.pings[0] = { ...noReply.transcript.pings[0]!, reply: null };
    const stitched = stitchPeerAnswerFlags(noReply, { peerAnswerFlags: null });
    expect(stitched.status === 'present' && stitched.transcript.pings[0]!.reply).toBeNull();
  });
});

describe('callbackBasisFor — the four rules, in order (`-328` read with `-329`)', () => {
  const ping = (texted: boolean, consented: boolean, audience: 'district_admin' | 'admin' | null) => ({ texted, consented, audience });

  it('(1) a ping ⛔ never texted ⇒ ⛔ shown, for EVERY viewer, whatever the answer', () => {
    for (const viewer of ['district', 'pariwar_admin', 'super_admin'] as const) {
      expect(callbackBasisFor(viewer, ping(false, true, 'admin')), viewer).toBeNull();
    }
  });

  it('(2) the Super Admin ⇒ shown whatever the answer — `consented` on a "Yes", else `super_admin`', () => {
    expect(callbackBasisFor('super_admin', ping(true, true, 'district_admin'))).toBe('consented');
    expect(callbackBasisFor('super_admin', ping(true, false, 'admin'))).toBe('super_admin');
    expect(callbackBasisFor('super_admin', ping(true, false, null))).toBe('super_admin'); // ⛔ reply at all
  });

  it('(3) the District Admin\'s side ⇒ a "Yes" of EITHER version, ⛔ else', () => {
    expect(callbackBasisFor('district', ping(true, true, 'district_admin'))).toBe('consented');
    expect(callbackBasisFor('district', ping(true, true, 'admin'))).toBe('consented');
    expect(callbackBasisFor('district', ping(true, false, 'admin'))).toBeNull();
  });

  it('(4) the Pariwar Admin ⇒ ONLY a "Yes" to v3\'s words (`admin`); a v2 "Yes" or an unresolved version ⇒ ⛔ (fail CLOSED)', () => {
    expect(callbackBasisFor('pariwar_admin', ping(true, true, 'admin'))).toBe('consented');
    expect(callbackBasisFor('pariwar_admin', ping(true, true, 'district_admin'))).toBeNull();
    expect(callbackBasisFor('pariwar_admin', ping(true, true, null))).toBeNull();
    expect(callbackBasisFor('pariwar_admin', ping(true, false, 'admin'))).toBeNull();
  });
});
