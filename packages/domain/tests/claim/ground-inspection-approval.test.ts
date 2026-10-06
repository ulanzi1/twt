// Story 6.26a — AC2: "complete" is ONE pure predicate (`groundInspectionApprovalState`, GI2 + `-283` A2 / A7). DB-free.
//
// The scenario table is the story's AC2 table, row for row. ⭐ The two `compared = null` rows are UNIT-ONLY: 0147's
// completed-row CHECK refuses to INSERT a completed row without its FQ11 record, so only a pre-6.26 row can carry a null
// comparison — the predicate is pure, and this table is their proof.

import { describe, expect, it } from 'vitest';

import {
  type GroundInspectionApprovalAssignment,
  type GroundInspectionApprovalFacts,
  groundInspectionApprovalState,
} from '../../src/claim/ground-inspection-approval.js';
import { DEATH_TIME_PATTERN } from '../../src/claim/ground-inspection-persist.js';
import type { ClaimId } from '../../src/ids/index.js';

const U1 = '11111111-1111-4111-8111-111111111111';
const U2 = '22222222-2222-4222-8222-222222222222';
const SOURCE = '99999999-9999-4999-8999-999999999999' as ClaimId;

let n = 0;
const a = (
  status: string,
  inspectionStage: string,
  comparedCertificateUploadId: string | null = null,
): GroundInspectionApprovalAssignment => ({ groundInspectionId: `gi-${(n += 1)}`, status, inspectionStage, comparedCertificateUploadId });

const facts = (
  ownAssignments: GroundInspectionApprovalAssignment[],
  inherits: boolean,
  currentUploadId: string | null,
): GroundInspectionApprovalFacts => ({ ownAssignments, inheritedSourceClaimId: inherits ? SOURCE : null, currentUploadId });

const COMPLETE = { complete: true, waitReason: null };
const NO_VISIT = { complete: false, waitReason: 'no_completed_inspection' };
const CHECK = { complete: false, waitReason: 'certificate_check_required' };

describe('AC2 — groundInspectionApprovalState (the ONE definition of "complete")', () => {
  const rows: [string, GroundInspectionApprovalFacts, object][] = [
    ['none, ⛔ inherits', facts([], false, U1), NO_VISIT],
    ...(['scheduled', 'photo_refused', 'evidence_unavailable', 'superseded'] as const).map(
      (status): [string, GroundInspectionApprovalFacts, object] => [
        `a full \`${status}\` only (counts for ⛔ nothing — the claim waits, FQ9)`,
        facts([a(status, 'initial', status === 'scheduled' ? null : U1)], false, U1),
        NO_VISIT,
      ],
    ),
    ['a full `completed`, compared U1, current U1', facts([a('completed', 'initial', U1)], false, U1), COMPLETE],
    ['a full `completed`, compared U1, current U2 (replaced after — `-281` Q2 A)', facts([a('completed', 'corroboration', U1)], false, U2), CHECK],
    [
      'a full `completed` U1 + a `certificate_check` `completed` U2, current U2',
      facts([a('completed', 'initial', U1), a('completed', 'certificate_check', U2)], false, U2),
      COMPLETE,
    ],
    ['a `certificate_check` `completed` U1 only (⛔ never a visit)', facts([a('completed', 'certificate_check', U1)], false, U1), NO_VISIT],
    ['none, inherits (the refile — FQ13)', facts([], true, U1), CHECK],
    ['a `certificate_check` `completed` U1, inherits', facts([a('completed', 'certificate_check', U1)], true, U1), COMPLETE],
    // `-283` A2 — a source whose only completed assignment is a certificate check is ⛔ not returned by the shared
    // inheritance fragment, so the facts say "⛔ inherits" (the live-DB half is in nominee-refusal-inheritance.spec).
    ['none, ⛔ inherits (the only refused source held a certificate check)', facts([], false, U1), NO_VISIT],
    ['a pre-6.26 full `completed` with ⛔ no FQ11 record (compared null), current U1', facts([a('completed', 'initial', null)], false, U1), CHECK],
    [
      'a full `completed` with compared null, ⛔ no current upload — null never matches (`-283` A7)',
      facts([a('completed', 'initial', null)], false, null),
      CHECK,
    ],
  ];

  for (const [label, f, expected] of rows) {
    it(label, () => {
      expect(groundInspectionApprovalState(f)).toEqual(expected);
    });
  }

  it('the comparison is case-insensitive (branded ids are lower-case; a client may echo upper-case)', () => {
    expect(groundInspectionApprovalState(facts([a('completed', 'initial', U1.toUpperCase())], false, U1))).toEqual(COMPLETE);
  });

  it('a completed check against a NON-current upload does ⛔ not satisfy ORIGINAL_SEEN on an inheriting claim', () => {
    expect(groundInspectionApprovalState(facts([a('completed', 'certificate_check', U1)], true, U2))).toEqual(CHECK);
  });

  it('a superseded or refused certificate check never satisfies ORIGINAL_SEEN', () => {
    for (const status of ['superseded', 'evidence_unavailable', 'photo_refused', 'scheduled']) {
      expect(groundInspectionApprovalState(facts([a(status, 'certificate_check', U1)], true, U1))).toEqual(CHECK);
    }
  });
});

describe('GI5 — the time-of-death pattern (`HH:MM`, 24h), defined ONCE', () => {
  it('admits every real time and nothing else', () => {
    for (const ok of ['00:00', '09:05', '12:30', '19:59', '23:59']) expect(DEATH_TIME_PATTERN.test(ok)).toBe(true);
    for (const bad of ['24:00', '23:60', '9:05', '09:5', '0905', '09:05:00', ' 09:05', '09:05 ', 'ab:cd', '']) {
      expect(DEATH_TIME_PATTERN.test(bad), bad).toBe(false);
    }
  });
});
