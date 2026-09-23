// `planDeclarationVersions` — pure unit tests (Story 6.20, Task 2/9; D1, D2, T9; AC1).
//
// The plan is what a declare writes to `member_nominee_versions` and what `member.nominees_declared`
// announces, so it is pinned DB-free: one version per SUBMITTED rank (⛔ no dedup — T3), a `vacated`
// TOMBSTONE for a rank the submit dropped (T9), and ⛔ never a second tombstone on an already-vacated rank.

import { describe, expect, it } from 'vitest';

import { planDeclarationVersions } from '../../src/nominee/declaration-history.js';

describe('planDeclarationVersions', () => {
  it('the FIRST declaration starts every submitted rank at version 1', () => {
    expect(planDeclarationVersions([], [1, 2])).toEqual([
      { rank: 1, versionNo: 1, kind: 'declared' },
      { rank: 2, versionNo: 1, kind: 'declared' },
    ]);
  });

  it('⭐ T3 — an IDENTICAL resubmit still appends (⛔ no dedup: ciphertext cannot be compared, a name hash is forbidden)', () => {
    expect(planDeclarationVersions([{ rank: 1, versionNo: 1, kind: 'declared' }], [1])).toEqual([
      { rank: 1, versionNo: 2, kind: 'declared' },
    ]);
  });

  it('⭐ T9 — a 2 → 1 change writes a TOMBSTONE for rank 2', () => {
    expect(
      planDeclarationVersions(
        [
          { rank: 1, versionNo: 1, kind: 'declared' },
          { rank: 2, versionNo: 1, kind: 'declared' },
        ],
        [1],
      ),
    ).toEqual([
      { rank: 1, versionNo: 2, kind: 'declared' },
      { rank: 2, versionNo: 2, kind: 'vacated' },
    ]);
  });

  it('⛔ an ALREADY-vacated rank gets no second tombstone on a further 1-nominee declare', () => {
    expect(
      planDeclarationVersions(
        [
          { rank: 1, versionNo: 2, kind: 'declared' },
          { rank: 2, versionNo: 2, kind: 'vacated' },
        ],
        [1],
      ),
    ).toEqual([{ rank: 1, versionNo: 3, kind: 'declared' }]);
  });

  it('a 1 → 2 after a vacancy RE-OCCUPIES rank 2 at its next version (the chain never restarts)', () => {
    expect(
      planDeclarationVersions(
        [
          { rank: 1, versionNo: 2, kind: 'declared' },
          { rank: 2, versionNo: 2, kind: 'vacated' },
        ],
        [1, 2],
      ),
    ).toEqual([
      { rank: 1, versionNo: 3, kind: 'declared' },
      { rank: 2, versionNo: 3, kind: 'declared' },
    ]);
  });
});
