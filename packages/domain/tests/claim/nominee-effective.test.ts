// The EFFECTIVE nominee declaration — pure unit tests (Story 6.20, Task 3/9; D5, D6, D17; AC4, AC5, AC6).
//
// `resolveEffectiveNomineeDeclaration` is the selection rule the live accessor applies to its one-query
// raw row, and `versionStandsAt` is the D6 cutoff the determination writer VALIDATES marks against.
// Both are pure, so the boundary, the per-rank rule, the tombstone, the re-rank and every fail-closed
// state are pinned here DB-free; the live specs prove the SQL feeds them the right rows.

import { describe, expect, it } from 'vitest';

import {
  resolveEffectiveNomineeDeclaration,
  versionStandsAt,
} from '../../src/claim/nominee-effective.js';

const CLAIM = '00000000-0000-4000-8000-0000000000c1';
const MEMBER = '00000000-0000-4000-8000-0000000000a1';
const DET = '00000000-0000-4000-8000-0000000000d1';
const V = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const T = new Date('2026-03-01T06:00:00.000Z');

function resolve(over: Partial<Parameters<typeof resolveEffectiveNomineeDeclaration>[0]> = {}) {
  return resolveEffectiveNomineeDeclaration({
    claimCaseId: CLAIM,
    deceasedMemberId: MEMBER,
    determinationId: DET,
    standing: [{ rank: 1, versionId: V(1), versionNo: 1, kind: 'declared', effectiveAt: T }],
    projectionRanks: [1],
    versionedRanks: [1],
    disqualifiedRanks: [],
    disqualificationIds: [],
    ...over,
  });
}

describe('versionStandsAt — the D6 cutoff (IST start of the certificate day)', () => {
  it('⭐ a change at 23:59:59.999 IST the day BEFORE the death STANDS', () => {
    // 2026-03-10 00:00 IST == 2026-03-09T18:30:00Z; one millisecond earlier is the day before.
    expect(versionStandsAt(new Date('2026-03-09T18:29:59.999Z'), '2026-03-10')).toBe(true);
  });

  it('⭐ a change at 00:00:00.000 IST ON the day of death is DISCARDED', () => {
    expect(versionStandsAt(new Date('2026-03-09T18:30:00.000Z'), '2026-03-10')).toBe(false);
  });

  it('a change the day AFTER is discarded; a change a month before stands', () => {
    expect(versionStandsAt(new Date('2026-03-11T06:00:00.000Z'), '2026-03-10')).toBe(false);
    expect(versionStandsAt(new Date('2026-02-10T06:00:00.000Z'), '2026-03-10')).toBe(true);
  });

  it('⚠ a UTC-midnight instant is NOT the cutoff: 2026-03-10T00:00Z is already 05:30 IST on the day', () => {
    expect(versionStandsAt(new Date('2026-03-10T00:00:00.000Z'), '2026-03-10')).toBe(false);
  });
});

describe('resolveEffectiveNomineeDeclaration — the fail-closed states (D1, D5, D15, D17)', () => {
  it('no live determination ⇒ `undetermined`, no entries', () => {
    const e = resolve({ determinationId: null });
    expect(e.status).toBe('undetermined');
    expect(e.entries).toEqual([]);
  });

  it('⭐ a projection rank with NO version ⇒ `unversioned` (⛔ no backfill) — even with a determination', () => {
    expect(resolve({ projectionRanks: [1, 2], versionedRanks: [1] }).status).toBe('unversioned');
  });

  it('nobody stands ⇒ `empty` (recordable, but can never approve)', () => {
    expect(resolve({ standing: [] }).status).toBe('empty');
  });

  it('a lone rank-2 survivor WITHOUT a disqualification ⇒ `incoherent`', () => {
    const e = resolve({
      standing: [{ rank: 2, versionId: V(2), versionNo: 1, kind: 'declared', effectiveAt: T }],
      projectionRanks: [2],
      versionedRanks: [2],
    });
    expect(e.status).toBe('incoherent');
  });

  it('every fail-closed state has its OWN token, distinct from the effective one', () => {
    const tokens = new Set([
      resolve({ determinationId: null }).token,
      resolve({ projectionRanks: [1, 2], versionedRanks: [1] }).token,
      resolve({ standing: [] }).token,
      resolve({
        standing: [{ rank: 2, versionId: V(2), versionNo: 1, kind: 'declared', effectiveAt: T }],
        projectionRanks: [2],
        versionedRanks: [2],
      }).token, // incoherent
      resolve().token,
    ]);
    expect(tokens.size).toBe(5);
  });

  it('⭐⭐ the `undetermined` token MOVES when a version is added — an old name check never revives (code review 2026-09-24)', () => {
    // Before any determination: rank 1 head is v1. A correction later supersedes a determination AND
    // appends v2 — the claim is `undetermined` again, but it must ⛔ not match the pre-determination token.
    const before = resolve({ determinationId: null, versionHeads: ['1:1'] });
    const afterCorrection = resolve({ determinationId: null, versionHeads: ['1:2'] });
    expect(before.status).toBe('undetermined');
    expect(afterCorrection.status).toBe('undetermined');
    expect(afterCorrection.token).not.toBe(before.token);
    // …and the heads are order-independent.
    expect(resolve({ determinationId: null, versionHeads: ['1:1', '2:3'] }).token).toBe(
      resolve({ determinationId: null, versionHeads: ['2:3', '1:1'] }).token,
    );
  });
});

describe('resolveEffectiveNomineeDeclaration — the selection rule and the splits (D5, D17(a))', () => {
  it('a sole standing nominee is rank 1 at 100%', () => {
    const e = resolve();
    expect(e.status).toBe('effective');
    expect(e.entries).toEqual([
      { rank: 1, declaredRank: 1, versionId: V(1), versionNo: 1, effectiveAt: T, splitPct: 100 },
    ]);
  });

  it('two standing nominees are 75 / 25', () => {
    const e = resolve({
      standing: [
        { rank: 1, versionId: V(1), versionNo: 1, kind: 'declared', effectiveAt: T },
        { rank: 2, versionId: V(2), versionNo: 1, kind: 'declared', effectiveAt: T },
      ],
      projectionRanks: [1, 2],
      versionedRanks: [1, 2],
    });
    expect(e.entries.map((x) => [x.rank, x.splitPct])).toEqual([
      [1, 75],
      [2, 25],
    ]);
  });

  it('⭐ T9 — a standing TOMBSTONE empties its rank: rank 2 reverts to VACATED, ⛔ not to its v1', () => {
    // The SQL picks the HIGHEST standing version per rank; for rank 2 on a 2 → 1 before the death that
    // is the tombstone, and the rank is empty. Rank 1 alone ⇒ 100% (the split is DERIVED).
    const e = resolve({
      standing: [
        { rank: 1, versionId: V(3), versionNo: 2, kind: 'declared', effectiveAt: T },
        { rank: 2, versionId: V(4), versionNo: 2, kind: 'vacated', effectiveAt: T },
      ],
      projectionRanks: [1],
      versionedRanks: [1, 2],
    });
    expect(e.status).toBe('effective');
    expect(e.entries.map((x) => [x.rank, x.versionId, x.splitPct])).toEqual([[1, V(3), 100]]);
  });
});

describe('resolveEffectiveNomineeDeclaration — the disqualified primary (D17(c), `-240` cl.4)', () => {
  const two = {
    standing: [
      { rank: 1, versionId: V(1), versionNo: 1, kind: 'declared', effectiveAt: T },
      { rank: 2, versionId: V(2), versionNo: 1, kind: 'declared', effectiveAt: T },
    ],
    projectionRanks: [1, 2],
    versionedRanks: [1, 2],
  };

  it('⭐ rank 1 disqualified ⇒ the survivor is RE-RANKED to rank 1 at 100% (⛔ never a lone {2})', () => {
    const e = resolve({ ...two, disqualifiedRanks: [1], disqualificationIds: ['f1'] });
    expect(e.status).toBe('effective');
    expect(e.entries).toEqual([
      { rank: 1, declaredRank: 2, versionId: V(2), versionNo: 1, effectiveAt: T, splitPct: 100 },
    ]);
  });

  it('rank 2 disqualified ⇒ rank 1 alone at 100% (a secondary named at 25% would otherwise be the rest)', () => {
    const e = resolve({ ...two, disqualifiedRanks: [2], disqualificationIds: ['f2'] });
    expect(e.entries.map((x) => [x.rank, x.versionId, x.splitPct])).toEqual([[1, V(1), 100]]);
  });

  it('both disqualified ⇒ `empty` (the succession path is the fraud register\'s, ⛔ not 6.20\'s)', () => {
    expect(resolve({ ...two, disqualifiedRanks: [1, 2], disqualificationIds: ['a', 'b'] }).status).toBe('empty');
  });
});

describe('the token (AC5) — ⛔ never a name', () => {
  it('is deterministic', () => {
    expect(resolve().token).toBe(resolve().token);
  });

  it('⭐ moves on a NEW DETERMINATION (AC4 — "a new determination stales any earlier name check")', () => {
    expect(resolve({ determinationId: '00000000-0000-4000-8000-0000000000d2' }).token).not.toBe(resolve().token);
  });

  it('⭐ moves when a DIFFERENT version stands (a correction, a redetermination)', () => {
    const other = resolve({
      standing: [{ rank: 1, versionId: V(9), versionNo: 2, kind: 'declared', effectiveAt: T }],
    });
    expect(other.token).not.toBe(resolve().token);
  });

  it('moves on a disqualification finding', () => {
    const two = {
      standing: [
        { rank: 1, versionId: V(1), versionNo: 1, kind: 'declared', effectiveAt: T },
        { rank: 2, versionId: V(2), versionNo: 1, kind: 'declared', effectiveAt: T },
      ],
      projectionRanks: [1, 2],
      versionedRanks: [1, 2],
    };
    expect(resolve({ ...two, disqualifiedRanks: [2], disqualificationIds: ['f'] }).token).not.toBe(
      resolve(two).token,
    );
  });

  it('is 32 hex characters and carries no id verbatim', () => {
    const t = resolve().token;
    expect(t).toMatch(/^[0-9a-f]{32}$/);
    for (const id of [V(1), DET, CLAIM, MEMBER]) expect(t).not.toContain(id.slice(-12));
  });

  it('⭐ is ORDER-INDEPENDENT — the SQL pins no row order for `standing` or the findings', () => {
    const r1 = { rank: 1, versionId: V(1), versionNo: 1, kind: 'declared', effectiveAt: T };
    const r2 = { rank: 2, versionId: V(2), versionNo: 1, kind: 'declared', effectiveAt: T };
    const base = { projectionRanks: [1, 2], versionedRanks: [1, 2] };
    expect(resolve({ ...base, standing: [r2, r1] }).token).toBe(resolve({ ...base, standing: [r1, r2] }).token);
    expect(resolve({ ...base, standing: [r2, r1] }).entries.map((e) => e.rank)).toEqual([1, 2]);
    const x = { ...base, standing: [r1, r2], disqualifiedRanks: [2] };
    expect(resolve({ ...x, disqualificationIds: ['b', 'a'] }).token).toBe(resolve({ ...x, disqualificationIds: ['a', 'b'] }).token);
  });

  it('⭐ a nominee ADDED or REMOVED moves it ({1} vs {1,2})', () => {
    const one = resolve();
    const two = resolve({
      standing: [
        { rank: 1, versionId: V(1), versionNo: 1, kind: 'declared', effectiveAt: T },
        { rank: 2, versionId: V(2), versionNo: 1, kind: 'declared', effectiveAt: T },
      ],
      projectionRanks: [1, 2],
      versionedRanks: [1, 2],
    });
    expect(two.token).not.toBe(one.token);
  });
});
