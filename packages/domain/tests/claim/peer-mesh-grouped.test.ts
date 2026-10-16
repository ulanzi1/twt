// The grouped peer-mesh engine — pure, DB-free unit tests (Story 6.36, Task 2; AC2, AC3; I7).
//
// `workplace_named_v1`: the workplace group (the previous workplace's people first, when it counts, then the current
// one's; within each, the SETTLED first) ⇒ otherwise the people the member named ⇒ otherwise nobody. Each part is ordered
// by ascending sha256(anchorClaimCaseId + ':' + memberId) hex — the ANCHOR claim (`2026-10-16-340` call 1), so every claim
// anchored on the same filing ranks the same pool the same way. ⛔ Never two groups mixed. The stored ranking is the winning
// group's first 500. A duplicate member id throws. Plus the registry (a NEW id — the v1 entry keeps its literal id) and
// the ONE dispatch (`runPeerMeshMetric`) the job AND replay use.

import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { claimId, memberId, type MemberId } from '../../src/ids/index.js';
import {
  replayPeerMeshSelection,
  runPeerMeshMetric,
  selectPeerMeshGrouped,
  type PeerMeshGroupedSelectionInput,
} from '../../src/claim/peer-mesh.js';
import {
  DEFAULT_PEER_MESH_METRIC_ID,
  PEER_MESH_METRIC_REGISTRY,
  resolvePeerMeshMetric,
  type PeerMeshCandidateGroup,
  type PeerMeshGroupedCandidate,
  type PeerMeshGroupedMetricConfig,
} from '../../src/claim/peer-mesh-metric-registry.js';
import type { ClaimPeerMeshSelectionRow } from '../../src/schema/claim_peer_mesh_selections.js';

const CLAIM = '11111111-1111-1111-1111-11111111aaaa';
const DECEASED = memberId('00000000-0000-0000-0000-0000000000ff');

const mid = (n: number): MemberId => memberId(`00000000-0000-0000-0000-${String(n).padStart(12, '0')}`);
const hash = (m: string): string => createHash('sha256').update(`${CLAIM}:${m}`).digest('hex');
const byHash = (ms: readonly MemberId[]): MemberId[] => [...ms].sort((a, b) => (hash(a) < hash(b) ? -1 : 1));

function grouped(): PeerMeshGroupedMetricConfig {
  const m = resolvePeerMeshMetric('workplace_named_v1');
  if (m.kind !== 'grouped') throw new Error('workplace_named_v1 must be grouped');
  return m;
}

function c(n: number, group: PeerMeshCandidateGroup, settled = false): PeerMeshGroupedCandidate {
  return { memberId: mid(n), group, settled };
}

function input(candidates: readonly PeerMeshGroupedCandidate[]): PeerMeshGroupedSelectionInput {
  return { anchorClaimCaseId: CLAIM, candidates, metric: grouped() };
}

describe('the registry (AC3)', () => {
  it('the default is the NEW id workplace_named_v1 (grouped); district_cohort_v1 keeps its literal id and its comparator', () => {
    expect(DEFAULT_PEER_MESH_METRIC_ID).toBe('workplace_named_v1');
    const d = resolvePeerMeshMetric();
    expect(d.kind).toBe('grouped');
    expect(d.metricId).toBe('workplace_named_v1');
    expect(d.metricVersion).toBe(1);
    const v1 = resolvePeerMeshMetric('district_cohort_v1');
    expect(v1.kind).toBe('ranked');
    expect(v1.metricId).toBe('district_cohort_v1');
    expect(v1.metricVersion).toBe(1);
    // keyed by id — ⛔ a version bump of district_cohort_v1 (SF6)
    expect(Object.keys(PEER_MESH_METRIC_REGISTRY).sort()).toEqual(['district_cohort_v1', 'workplace_named_v1']);
    for (const [id, m] of Object.entries(PEER_MESH_METRIC_REGISTRY)) expect(m.metricId).toBe(id);
  });
});

describe('selectPeerMeshGrouped — the groups (AC2)', () => {
  it('the workplace group wins; the 6th colleague is ranked but ⛔ selected; ⛔ fill-up from named', () => {
    const cands = [1, 2, 3, 4, 5, 6].map((n) => c(n, 'workplace_current')).concat([c(7, 'named'), c(8, 'named')]);
    const r = selectPeerMeshGrouped(input(cands));
    expect(r.source).toBe('workplace');
    expect(r.rankedMemberIds).toEqual(byHash([1, 2, 3, 4, 5, 6].map(mid)));
    expect(r.selectedMemberIds).toEqual(r.rankedMemberIds.slice(0, 5));
    expect(r.selectedMemberIds).toHaveLength(5);
    expect(r.metricId).toBe('workplace_named_v1');
    expect(r.metricVersion).toBe(1);
  });

  it('two colleagues ⇒ two selected — ⛔ no fill-up from named', () => {
    const r = selectPeerMeshGrouped(input([c(1, 'workplace_current'), c(2, 'workplace_current'), c(3, 'named'), c(4, 'named')]));
    expect(r.source).toBe('workplace');
    expect(r.selectedMemberIds).toEqual(byHash([mid(1), mid(2)]));
    expect(r.rankedMemberIds).toEqual(r.selectedMemberIds);
  });

  it('the previous workplace\'s people rank FIRST, then the current one\'s; settled first within each', () => {
    const cands = [
      c(1, 'workplace_current', true),
      c(2, 'workplace_current', false),
      c(3, 'workplace_previous', false),
      c(4, 'workplace_previous', true),
      c(5, 'workplace_current', true),
      c(6, 'workplace_previous', true),
      c(7, 'workplace_current', false),
    ];
    const r = selectPeerMeshGrouped(input(cands));
    expect(r.rankedMemberIds).toEqual([
      ...byHash([mid(4), mid(6)]),
      mid(3),
      ...byHash([mid(1), mid(5)]),
      ...byHash([mid(2), mid(7)]),
    ]);
    expect(r.selectedMemberIds).toEqual(r.rankedMemberIds.slice(0, 5));
  });

  it('⛔ colleagues + named ⇒ the named (≤ 3), source named_by_member, ordered by the hash only', () => {
    const r = selectPeerMeshGrouped(input([c(9, 'named'), c(8, 'named'), c(7, 'named')]));
    expect(r.source).toBe('named_by_member');
    expect(r.selectedMemberIds).toEqual(byHash([mid(7), mid(8), mid(9)]));
    expect(r.rankedMemberIds).toEqual(r.selectedMemberIds);
  });

  it('neither ⇒ nobody: source null, ⛔ selected, an empty ranking', () => {
    const r = selectPeerMeshGrouped(input([]));
    expect(r).toEqual({ source: null, selectedMemberIds: [], rankedMemberIds: [], metricId: 'workplace_named_v1', metricVersion: 1 });
  });

  it('a 600-person group ⇒ 500 ranked, the first 5 selected', () => {
    const cands = Array.from({ length: 600 }, (_, i) => c(i + 1, 'workplace_current', i % 3 === 0));
    const r = selectPeerMeshGrouped(input(cands));
    expect(r.rankedMemberIds).toHaveLength(500);
    expect(r.selectedMemberIds).toEqual(r.rankedMemberIds.slice(0, 5));
    // the settled third (200) come first
    const settled = new Set(cands.filter((x) => x.settled).map((x) => x.memberId));
    expect(r.rankedMemberIds.slice(0, 200).every((m) => settled.has(m))).toBe(true);
  });

  it('a duplicate member id in the input throws', () => {
    expect(() => selectPeerMeshGrouped(input([c(1, 'workplace_current'), c(1, 'workplace_current')]))).toThrow(/duplicate/);
    expect(() => selectPeerMeshGrouped(input([c(1, 'workplace_previous'), c(1, 'named')]))).toThrow(/duplicate/);
  });
});

describe('selectPeerMeshGrouped — determinism (AC2; I7)', () => {
  const cands = [
    c(11, 'workplace_current', true),
    c(12, 'workplace_current'),
    c(13, 'workplace_previous'),
    c(14, 'workplace_current', true),
    c(15, 'workplace_current'),
    c(16, 'workplace_current'),
    c(17, 'named'),
  ];

  it('byte-identical on replay and across input order; the input is ⛔ mutated', () => {
    const before = cands.map((x) => x.memberId);
    const a = selectPeerMeshGrouped(input(cands));
    const b = selectPeerMeshGrouped(input([...cands].reverse()));
    const reloaded = (JSON.parse(JSON.stringify(cands)) as { memberId: string; group: PeerMeshCandidateGroup; settled: boolean }[]).map(
      (x) => ({ ...x, memberId: memberId(x.memberId) }),
    );
    const replay = selectPeerMeshGrouped(input(reloaded));
    expect(JSON.stringify(b)).toBe(JSON.stringify(a));
    expect(JSON.stringify(replay)).toBe(JSON.stringify(a));
    expect(cands.map((x) => x.memberId)).toEqual(before);
  });

  it('the hash is over the BRANDED (lower-case) ids — an upper-case input ranks as its lower-case twin', () => {
    const upper = '0000000A-0000-0000-0000-00000000000B';
    const r = selectPeerMeshGrouped(input([{ memberId: memberId(upper), group: 'workplace_current', settled: false }, c(1, 'workplace_current')]));
    expect(r.rankedMemberIds).toEqual(byHash([memberId(upper.toLowerCase()), mid(1)]));
  });

  it('a different ANCHOR ranks the same people differently (the hash is salted by the anchor claim — `-340` call 1)', () => {
    const many = Array.from({ length: 20 }, (_, i) => c(i + 1, 'workplace_current'));
    const a = selectPeerMeshGrouped(input(many)).rankedMemberIds;
    const b = selectPeerMeshGrouped({ ...input(many), anchorClaimCaseId: '22222222-2222-2222-2222-22222222bbbb' }).rankedMemberIds;
    expect(b).not.toEqual(a);
  });

  it('`-340` call 1: given the same ANCHOR, two claims rank the same pool identically — the claim\'s own id is ⛔ read (the anchor itself is resolved by `resolvePeerMeshFilingCut`, tested live)', () => {
    const many = Array.from({ length: 12 }, (_, i) => c(i + 1, 'workplace_current', i % 2 === 0));
    const run = (claimCaseId: string) =>
      runPeerMeshMetric({
        metric: resolvePeerMeshMetric('workplace_named_v1'),
        claimCaseId,
        anchorClaimCaseId: CLAIM,
        deceasedMemberId: DECEASED,
        deceased: { district: null, createdAt: new Date(0) },
        candidates: many,
      });
    const first = run(CLAIM);
    const refile = run('22222222-2222-2222-2222-22222222bbbb');
    expect(refile.selectedMemberIds).toEqual(first.selectedMemberIds);
    expect(refile.rankedMemberIds).toEqual(first.rankedMemberIds);
    expect(first.selectedMemberIds).toHaveLength(5);
  });
});

describe('runPeerMeshMetric — the ONE dispatch (AC3)', () => {
  it('a grouped metric runs the grouped engine; a ranked metric runs selectPeerMesh with ⛔ ranking or source', () => {
    const g = runPeerMeshMetric({
      metric: resolvePeerMeshMetric('workplace_named_v1'),
      claimCaseId: CLAIM,
      anchorClaimCaseId: CLAIM,
      deceasedMemberId: DECEASED,
      deceased: { district: 'Pune', createdAt: new Date('2020-01-01T00:00:00Z') },
      candidates: [c(1, 'workplace_current'), c(2, 'named')],
    });
    expect(g).toEqual({ metricId: 'workplace_named_v1', metricVersion: 1, source: 'workplace', selectedMemberIds: [mid(1)], rankedMemberIds: [mid(1)] });
    const d = runPeerMeshMetric({
      metric: resolvePeerMeshMetric('district_cohort_v1'),
      claimCaseId: CLAIM,
      anchorClaimCaseId: CLAIM,
      deceasedMemberId: DECEASED,
      deceased: { district: 'Pune', createdAt: new Date('2020-01-01T00:00:00Z') },
      candidates: [
        { memberId: mid(2), district: 'Delhi', createdAt: new Date('2020-01-01T00:00:00Z') },
        { memberId: mid(1), district: 'Pune', createdAt: new Date('2021-01-01T00:00:00Z') },
      ],
    });
    expect(d).toEqual({ metricId: 'district_cohort_v1', metricVersion: 1, source: null, selectedMemberIds: [mid(1), mid(2)], rankedMemberIds: null });
  });

  it('a candidate of the other metric\'s shape throws (⛔ silently ranked)', () => {
    const base = { claimCaseId: CLAIM, anchorClaimCaseId: CLAIM, deceasedMemberId: DECEASED, deceased: { district: null, createdAt: new Date(0) } };
    expect(() =>
      runPeerMeshMetric({ ...base, metric: resolvePeerMeshMetric('workplace_named_v1'), candidates: [{ memberId: mid(1), district: null, createdAt: new Date(0) }] }),
    ).toThrow(/shape/);
    expect(() => runPeerMeshMetric({ ...base, metric: resolvePeerMeshMetric('district_cohort_v1'), candidates: [c(1, 'named')] })).toThrow(/shape/);
  });
});

describe('replayPeerMeshSelection — from the PERSISTED row alone (I7)', () => {
  function row(over: Partial<ClaimPeerMeshSelectionRow>): ClaimPeerMeshSelectionRow {
    return {
      selectionId: '00000000-0000-0000-0000-00000000aaaa',
      claimCaseId: CLAIM,
      pariwarId: '00000000-0000-0000-0000-00000000bbbb',
      deceasedMemberId: DECEASED,
      deceasedDistrict: 'Pune',
      deceasedCreatedAt: new Date('2020-01-01T00:00:00Z'),
      metricId: 'workplace_named_v1',
      metricVersion: 1,
      selectedMemberIds: [],
      candidateSnapshot: [],
      responseWindowExpiresAt: new Date(0),
      outcome: 'pending',
      skipReason: null,
      createdAt: new Date(0),
      source: null,
      previousWorkplaceCounted: false,
      recentChangeBeforeFiling: false,
      deceasedWorkplaceId: null,
      deceasedPreviousWorkplaceId: null,
      rankedMemberIds: [],
      anchorClaimCaseId: CLAIM,
      ...over,
    } as ClaimPeerMeshSelectionRow;
  }

  it('a grouped row replays to its stored ranking, selection and source', () => {
    const snap = [c(3, 'workplace_current', true), c(4, 'workplace_current'), c(5, 'named')];
    const first = selectPeerMeshGrouped(input(snap));
    const r = row({ candidateSnapshot: JSON.parse(JSON.stringify(snap)), selectedMemberIds: [...first.selectedMemberIds], rankedMemberIds: [...first.rankedMemberIds], source: first.source });
    const replay = replayPeerMeshSelection(r);
    expect(replay.selectedMemberIds).toEqual(r.selectedMemberIds);
    expect(replay.rankedMemberIds).toEqual(r.rankedMemberIds);
    expect(replay.source).toBe('workplace');
  });

  it('a refile\'s row replays by its STORED anchor (⛔ its own claim id, ⛔ a live re-derivation — `-340` call 1)', () => {
    const many = Array.from({ length: 12 }, (_, i) => c(i + 1, 'workplace_current'));
    const ANCHOR = '33333333-3333-3333-3333-33333333cccc';
    const first = selectPeerMeshGrouped({ ...input(many), anchorClaimCaseId: ANCHOR });
    const r = row({
      anchorClaimCaseId: claimId(ANCHOR),
      candidateSnapshot: JSON.parse(JSON.stringify(many)),
      selectedMemberIds: [...first.selectedMemberIds],
      rankedMemberIds: [...first.rankedMemberIds],
      source: first.source,
    });
    const replay = replayPeerMeshSelection(r);
    expect(replay.rankedMemberIds).toEqual(first.rankedMemberIds);
    expect(replay.selectedMemberIds).toEqual(first.selectedMemberIds);
    // salted by the row's OWN claim id it would differ — the stored anchor is load-bearing
    expect(selectPeerMeshGrouped(input(many)).rankedMemberIds).not.toEqual(first.rankedMemberIds);
  });

  it('a GROUPED row with ⛔ anchor THROWS (⛔ silently re-salted by its own claim) — 0163\'s CHECK forbids it', () => {
    const snap = [c(3, 'workplace_current', true), c(4, 'workplace_current')];
    expect(() => replayPeerMeshSelection(row({ candidateSnapshot: JSON.parse(JSON.stringify(snap)), anchorClaimCaseId: null }))).toThrow(/no anchor claim/);
    const partial = row({ candidateSnapshot: JSON.parse(JSON.stringify(snap)) }) as { anchorClaimCaseId?: unknown };
    delete partial.anchorClaimCaseId;
    expect(() => replayPeerMeshSelection(partial as ClaimPeerMeshSelectionRow)).toThrow(/no anchor claim/);
  });

  it('a district_cohort_v1 row replays through the old comparator', () => {
    const r = row({
      metricId: 'district_cohort_v1',
      candidateSnapshot: [
        { memberId: mid(2), district: 'Delhi', createdAt: '2020-01-01T00:00:00.000Z' },
        { memberId: mid(1), district: 'Pune', createdAt: '2025-01-01T00:00:00.000Z' },
      ],
      rankedMemberIds: null,
      previousWorkplaceCounted: null,
      recentChangeBeforeFiling: null,
      anchorClaimCaseId: null,
    });
    expect(replayPeerMeshSelection(r).selectedMemberIds).toEqual([mid(1), mid(2)]);
  });
});
