// Deterministic peer-mesh selection engine — pure, DB-free unit tests (Story 6.6, Task 1; AC1/AC5).
//
// Covers the LOAD-BEARING determinism contract: same input → same ordered 5 (twice,
// deep-equal); byte-identical REPLAY across a serialize→deserialize round-trip (the
// persisted-snapshot path); district-primary then cohort-secondary then member_id-tiebreak
// ordering; the total-order tiebreak resolving equal district+cohort; the <5-candidate
// degenerate case; and a null deceased district degrading to cohort+tiebreak. Plus the
// metric registry's default-resolve + unknown-id-throws.

import { describe, expect, it } from 'vitest';

import { memberId, type MemberId } from '../../src/ids/index.js';
import {
  DEFAULT_PEER_MESH_COUNT,
  selectPeerMesh,
  type PeerMeshSelectionInput,
} from '../../src/claim/peer-mesh.js';
import {
  DEFAULT_PEER_MESH_METRIC_ID,
  UnknownPeerMeshMetricError,
  resolvePeerMeshMetric,
  type PeerMeshCandidate,
} from '../../src/claim/peer-mesh-metric-registry.js';

const metric = resolvePeerMeshMetric(); // district_cohort_v1

/** Build a branded MemberId from a short numeric suffix (control member_id ordering). */
const mid = (n: number): MemberId =>
  memberId(`00000000-0000-0000-0000-${String(n).padStart(12, '0')}`);

const DECEASED = memberId('00000000-0000-0000-0000-0000000000ff');
const CLAIM = '11111111-1111-1111-1111-111111111111';

function cand(n: number, district: string | null, createdAtIso: string): PeerMeshCandidate {
  return { memberId: mid(n), district, createdAt: new Date(createdAtIso) };
}

function input(
  candidates: readonly PeerMeshCandidate[],
  deceased: { district: string | null; createdAt: Date },
  count?: number,
): PeerMeshSelectionInput {
  return {
    deceasedMemberId: DECEASED,
    claimCaseId: CLAIM,
    deceased,
    candidates,
    metric,
    ...(count !== undefined ? { count } : {}),
  };
}

const DECEASED_ATTRS = { district: 'Pune', createdAt: new Date('2020-01-01T00:00:00Z') };

describe('selectPeerMesh — determinism (AC1)', () => {
  it('default count is 5 (FR-39)', () => {
    expect(DEFAULT_PEER_MESH_COUNT).toBe(5);
  });

  it('same input → same ordered 5, twice (deep-equal)', () => {
    const candidates = [
      cand(5, 'Pune', '2020-06-01T00:00:00Z'),
      cand(2, 'Pune', '2020-02-01T00:00:00Z'),
      cand(9, 'Mumbai', '2020-01-05T00:00:00Z'),
      cand(1, 'Pune', '2020-03-01T00:00:00Z'),
      cand(7, 'Pune', '2020-01-10T00:00:00Z'),
      cand(3, 'Delhi', '2020-01-02T00:00:00Z'),
    ];
    const a = selectPeerMesh(input(candidates, DECEASED_ATTRS));
    const b = selectPeerMesh(input(candidates, DECEASED_ATTRS));
    expect(a.selectedMemberIds).toEqual(b.selectedMemberIds);
    expect(a.selectedMemberIds).toHaveLength(5);
    expect(a.metricId).toBe(DEFAULT_PEER_MESH_METRIC_ID);
    expect(a.metricVersion).toBe(1);
  });

  it('does NOT mutate the caller snapshot (replay-safe)', () => {
    const candidates = [cand(5, 'Pune', '2020-06-01T00:00:00Z'), cand(2, 'Pune', '2020-02-01T00:00:00Z')];
    const before = candidates.map((c) => c.memberId);
    selectPeerMesh(input(candidates, DECEASED_ATTRS));
    expect(candidates.map((c) => c.memberId)).toEqual(before);
  });
});

describe('selectPeerMesh — ordering (AC1)', () => {
  it('district-match ranks ahead of a non-match, even with worse cohort proximity', () => {
    const candidates = [
      // Non-matching district but PERFECT cohort proximity (same createdAt as deceased).
      cand(1, 'Mumbai', '2020-01-01T00:00:00Z'),
      // Matching district but FAR cohort — must still rank first (district is primary).
      cand(2, 'Pune', '2021-01-01T00:00:00Z'),
    ];
    const r = selectPeerMesh(input(candidates, DECEASED_ATTRS, 2));
    expect(r.selectedMemberIds).toEqual([mid(2), mid(1)]);
  });

  it('within the same district, nearer cohort (smaller |Δcreated_at|) ranks first', () => {
    const candidates = [
      cand(1, 'Pune', '2020-12-01T00:00:00Z'), // ~11 months from deceased
      cand(2, 'Pune', '2020-02-01T00:00:00Z'), // ~1 month
      cand(3, 'Pune', '2020-06-01T00:00:00Z'), // ~5 months
    ];
    const r = selectPeerMesh(input(candidates, DECEASED_ATTRS, 3));
    expect(r.selectedMemberIds).toEqual([mid(2), mid(3), mid(1)]);
  });

  it('cohort proximity is absolute (before OR after the deceased ranks the same)', () => {
    const candidates = [
      cand(1, 'Pune', '2020-03-01T00:00:00Z'), // +2 months
      cand(2, 'Pune', '2019-11-01T00:00:00Z'), // −2 months (same |Δ| roughly) but nearer? compute below
    ];
    // Deceased 2020-01-01. cand1 = +60d, cand2 = −61d → cand1 slightly nearer → first.
    const r = selectPeerMesh(input(candidates, DECEASED_ATTRS, 2));
    expect(r.selectedMemberIds).toEqual([mid(1), mid(2)]);
  });

  it('member_id ascending is the total-order tiebreak for equal district + cohort', () => {
    const candidates = [
      cand(9, 'Pune', '2020-02-01T00:00:00Z'),
      cand(2, 'Pune', '2020-02-01T00:00:00Z'),
      cand(5, 'Pune', '2020-02-01T00:00:00Z'),
    ];
    const r = selectPeerMesh(input(candidates, DECEASED_ATTRS, 3));
    // Identical district + createdAt → strictly member_id ascending.
    expect(r.selectedMemberIds).toEqual([mid(2), mid(5), mid(9)]);
  });
});

describe('selectPeerMesh — degenerate cases', () => {
  it('fewer than 5 candidates returns all + honest selectedCount', () => {
    const candidates = [cand(1, 'Pune', '2020-02-01T00:00:00Z'), cand(2, 'Pune', '2020-03-01T00:00:00Z')];
    const r = selectPeerMesh(input(candidates, DECEASED_ATTRS));
    expect(r.selectedCount).toBe(2);
    expect(r.selectedMemberIds).toHaveLength(2);
  });

  it('zero candidates returns empty + selectedCount 0 (does not throw)', () => {
    const r = selectPeerMesh(input([], DECEASED_ATTRS));
    expect(r.selectedCount).toBe(0);
    expect(r.selectedMemberIds).toEqual([]);
  });

  it('deceased district null → no candidate can district-match → cohort+tiebreak only', () => {
    const candidates = [
      cand(1, 'Pune', '2020-06-01T00:00:00Z'), // 5 months
      cand(2, 'Mumbai', '2020-02-01T00:00:00Z'), // 1 month — nearer cohort, wins despite district
      cand(3, null, '2020-02-01T00:00:00Z'), // 1 month, null district; tiebreak vs cand2 → member_id
    ];
    const r = selectPeerMesh(input(candidates, { district: null, createdAt: new Date('2020-01-01T00:00:00Z') }, 3));
    expect(r.selectedMemberIds).toEqual([mid(2), mid(3), mid(1)]);
  });

  it('candidate district null is never treated as matching a non-null deceased district', () => {
    const candidates = [
      cand(1, null, '2020-01-05T00:00:00Z'), // null district, great cohort
      cand(2, 'Pune', '2020-08-01T00:00:00Z'), // matches deceased 'Pune', worse cohort
    ];
    const r = selectPeerMesh(input(candidates, DECEASED_ATTRS, 2));
    // District match (cand2) beats null-district cand1 regardless of cohort.
    expect(r.selectedMemberIds).toEqual([mid(2), mid(1)]);
  });
});

describe('selectPeerMesh — byte-identical replay (AC5)', () => {
  it('serialize snapshot → deserialize → re-run yields identical ordered ids', () => {
    const candidates = [
      cand(5, 'Pune', '2020-06-01T00:00:00Z'),
      cand(2, 'Pune', '2020-02-01T00:00:00Z'),
      cand(9, 'Mumbai', '2020-01-05T00:00:00Z'),
      cand(1, 'Pune', '2020-03-01T00:00:00Z'),
      cand(7, 'Pune', '2020-01-10T00:00:00Z'),
      cand(3, 'Delhi', '2020-01-02T00:00:00Z'),
    ];
    const first = selectPeerMesh(input(candidates, DECEASED_ATTRS));

    // The persisted-snapshot path: JSON round-trip (createdAt → ISO string → Date).
    const serialized = JSON.stringify(
      candidates.map((c) => ({ memberId: c.memberId, district: c.district, createdAt: c.createdAt.toISOString() })),
    );
    const reloaded: PeerMeshCandidate[] = (
      JSON.parse(serialized) as { memberId: string; district: string | null; createdAt: string }[]
    ).map((r) => ({ memberId: memberId(r.memberId), district: r.district, createdAt: new Date(r.createdAt) }));

    const replay = selectPeerMesh(input(reloaded, DECEASED_ATTRS));
    expect(replay.selectedMemberIds).toEqual(first.selectedMemberIds);
    // Byte-identical: the JSON of the two results matches exactly.
    expect(JSON.stringify(replay.selectedMemberIds)).toBe(JSON.stringify(first.selectedMemberIds));
  });
});

describe('resolvePeerMeshMetric — registry (AC1, Decision D3)', () => {
  it('defaults to district_cohort_v1 (v1)', () => {
    const m = resolvePeerMeshMetric();
    expect(m.metricId).toBe(DEFAULT_PEER_MESH_METRIC_ID);
    expect(m.metricVersion).toBe(1);
  });

  it('resolves an explicit known id', () => {
    expect(resolvePeerMeshMetric(DEFAULT_PEER_MESH_METRIC_ID).metricId).toBe(DEFAULT_PEER_MESH_METRIC_ID);
  });

  it('throws on an unknown id (a typo must fail loudly, never silently default)', () => {
    expect(() => resolvePeerMeshMetric('does_not_exist_v9')).toThrow(UnknownPeerMeshMetricError);
  });
});
