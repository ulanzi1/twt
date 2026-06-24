// T&C version-registry behaviour — live-DB integration (Story 2.6, Task 3).
//
// Drives the domain accessors against real Postgres under PARIWAR_A scope, inside
// the per-test BEGIN/ROLLBACK (the accessors run on the caller's transaction — see
// write.ts §"Transaction contract" — so nothing persists). Covers: effective-window
// selection (genesis open vs staged) + approve→supersede flips the prior (AC6) +
// resolveByTcVersionId recovers a superseded version (AC8) + version monotonicity +
// pin validation incl. the cross-tenant guard. Assert MEMBERSHIP, not counts
// (own-committing writers in sibling suites accumulate rows); never DROP SCHEMA.

import { describe, expect, it } from 'vitest';

import { clauseVersionId as toClauseVersionId } from '../../../src/ids/index.js';
import {
  TcPinnedClauseNotFoundError,
  TcStateError,
  approveTcVersion,
  createTcVersion,
  getEffectiveTc,
  listPinnedClauses,
  resolveByTcVersionId,
  supersedeTcVersion,
} from '../../../src/terms-and-conditions/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppScope, seedClauseVersion } from '../_helpers.js';

const D1 = new Date('2025-01-01T00:00:00Z');
const D2 = new Date('2025-06-01T00:00:00Z');
const TRUSTEE = '99999999-9999-9999-9999-999999999999';

describe.skipIf(!hasDatabase)('T&C version registry (PARIWAR_A scope)', () => {
  setupLiveDb();

  /** Seed a clause version in A (before scope), enter A scope, return its branded id. */
  async function scopeAWithClause(clauseSlug = 'niy.tc.r1') {
    const { tx, client } = getTx();
    const clauseVersionId = toClauseVersionId(
      await seedClauseVersion(tx, PARIWAR_A, { clauseId: clauseSlug }),
    );
    await enterAppScope(client, PARIWAR_A);
    return { tx, clauseVersionId };
  }

  it('createTcVersion: genesis is open-ended + pending + effective; pins recorded', async () => {
    const { tx, clauseVersionId } = await scopeAWithClause();
    const v1 = await createTcVersion(tx, {
      pariwarId: PARIWAR_A,
      bodyMarkdown: '# Terms\n\nBe excellent to each other.',
      pinnedClauseVersionIds: [clauseVersionId],
      effectiveFrom: D1,
    });

    expect(v1.version).toBe(1);
    expect(v1.legalReviewStatus).toBe('pending');
    expect(v1.effectiveUntil).toBeNull(); // genesis is open-ended
    expect(v1.bodyHtmlRendered).toContain('<h1>Terms</h1>'); // precomputed sanitized render

    // getEffectiveTc (DB now()) returns the genesis even while pending.
    const eff = await getEffectiveTc(tx, PARIWAR_A);
    expect(eff?.tcVersionId).toBe(v1.tcVersionId);

    // listPinnedClauses returns the pinned clause version (membership, not count).
    const pins = await listPinnedClauses(tx, PARIWAR_A, v1.tcVersionId);
    expect(new Set(pins)).toContain(clauseVersionId);
  });

  it('version increments monotonically; a second version is staged (not effective)', async () => {
    const { tx, clauseVersionId } = await scopeAWithClause();
    const v1 = await createTcVersion(tx, {
      pariwarId: PARIWAR_A,
      bodyMarkdown: '# v1',
      pinnedClauseVersionIds: [clauseVersionId],
      effectiveFrom: D1,
    });
    const v2 = await createTcVersion(tx, {
      pariwarId: PARIWAR_A,
      bodyMarkdown: '# v2',
      pinnedClauseVersionIds: [clauseVersionId],
      effectiveFrom: D2,
    });

    expect(v2.version).toBe(2);
    // v2 is staged (v1 still open) → not the effective version yet.
    expect(v2.effectiveUntil).not.toBeNull();
    const eff = await getEffectiveTc(tx, PARIWAR_A);
    expect(eff?.tcVersionId).toBe(v1.tcVersionId);
  });

  it('approve→supersede flips the prior; superseded version stays recoverable (AC6/AC8)', async () => {
    const { tx, clauseVersionId } = await scopeAWithClause();
    const v1 = await createTcVersion(tx, {
      pariwarId: PARIWAR_A,
      bodyMarkdown: '# v1',
      pinnedClauseVersionIds: [clauseVersionId],
      effectiveFrom: D1,
    });
    await approveTcVersion(tx, {
      pariwarId: PARIWAR_A,
      tcVersionId: v1.tcVersionId,
      legalReviewerActorId: TRUSTEE,
    });

    const v2 = await createTcVersion(tx, {
      pariwarId: PARIWAR_A,
      bodyMarkdown: '# v2',
      pinnedClauseVersionIds: [clauseVersionId],
      effectiveFrom: D2,
    });

    // Route order: close prior FIRST, then open the target (partial-unique safe).
    await supersedeTcVersion(tx, { pariwarId: PARIWAR_A, tcVersionId: v1.tcVersionId });
    const approved = await approveTcVersion(tx, {
      pariwarId: PARIWAR_A,
      tcVersionId: v2.tcVersionId,
      legalReviewerActorId: TRUSTEE,
    });

    expect(approved.legalReviewStatus).toBe('approved');
    expect(approved.legalReviewerActorId).toBe(TRUSTEE);
    expect(approved.effectiveUntil).toBeNull(); // v2 is now the open/in-force one

    // The prior flipped to superseded + closed, and is STILL recoverable by id (AC8).
    const priorReloaded = await resolveByTcVersionId(tx, PARIWAR_A, v1.tcVersionId);
    expect(priorReloaded?.legalReviewStatus).toBe('superseded');
    expect(priorReloaded?.effectiveUntil).not.toBeNull();

    // getEffectiveTc now resolves to v2.
    const eff = await getEffectiveTc(tx, PARIWAR_A);
    expect(eff?.tcVersionId).toBe(v2.tcVersionId);
  });

  it('approveTcVersion on an already-superseded version throws TcStateError', async () => {
    const { tx, clauseVersionId } = await scopeAWithClause();
    const v1 = await createTcVersion(tx, {
      pariwarId: PARIWAR_A,
      bodyMarkdown: '# v1',
      pinnedClauseVersionIds: [clauseVersionId],
      effectiveFrom: D1,
    });
    await supersedeTcVersion(tx, { pariwarId: PARIWAR_A, tcVersionId: v1.tcVersionId });
    await expect(
      approveTcVersion(tx, {
        pariwarId: PARIWAR_A,
        tcVersionId: v1.tcVersionId,
        legalReviewerActorId: TRUSTEE,
      }),
    ).rejects.toBeInstanceOf(TcStateError);
  });

  it('approveTcVersion on an already-approved version throws TcStateError', async () => {
    const { tx, clauseVersionId } = await scopeAWithClause('niy.tc.r5');
    const v1 = await createTcVersion(tx, {
      pariwarId: PARIWAR_A,
      bodyMarkdown: '# v1',
      pinnedClauseVersionIds: [clauseVersionId],
      effectiveFrom: D1,
    });
    await approveTcVersion(tx, {
      pariwarId: PARIWAR_A,
      tcVersionId: v1.tcVersionId,
      legalReviewerActorId: TRUSTEE,
    });
    // Second approve on an already-approved version must reject (different TcStateError path from superseded).
    await expect(
      approveTcVersion(tx, {
        pariwarId: PARIWAR_A,
        tcVersionId: v1.tcVersionId,
        legalReviewerActorId: TRUSTEE,
      }),
    ).rejects.toBeInstanceOf(TcStateError);
  });

  it('createTcVersion rejects an empty pinnedClauseVersionIds array (domain guard)', async () => {
    const { tx } = await scopeAWithClause('niy.tc.r6');
    await expect(
      createTcVersion(tx, {
        pariwarId: PARIWAR_A,
        bodyMarkdown: '# x',
        pinnedClauseVersionIds: [],
        effectiveFrom: D1,
      }),
    ).rejects.toBeInstanceOf(TcPinnedClauseNotFoundError);
  });

  it('createTcVersion rejects a non-existent pinned clause version (pre-check)', async () => {
    const { tx } = await scopeAWithClause();
    const ghost = toClauseVersionId('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
    await expect(
      createTcVersion(tx, {
        pariwarId: PARIWAR_A,
        bodyMarkdown: '# x',
        pinnedClauseVersionIds: [ghost],
        effectiveFrom: D1,
      }),
    ).rejects.toBeInstanceOf(TcPinnedClauseNotFoundError);
  });

  it('createTcVersion rejects a CROSS-TENANT pinned clause version (cross-tenant guard)', async () => {
    const { tx, client } = getTx();
    // Seed a clause version in PARIWAR_B as the (RLS-bypassing) superuser BEFORE scope.
    const bClauseVersionId = toClauseVersionId(
      await seedClauseVersion(tx, PARIWAR_B, { clauseId: 'niy.tc.foreign' }),
    );
    await enterAppScope(client, PARIWAR_A);

    // The FK targets the global PK and would happily link B's clause; the
    // resolveByClauseVersionId pre-check (same-Pariwar) is the guard that rejects it.
    await expect(
      createTcVersion(tx, {
        pariwarId: PARIWAR_A,
        bodyMarkdown: '# x',
        pinnedClauseVersionIds: [bClauseVersionId],
        effectiveFrom: D1,
      }),
    ).rejects.toBeInstanceOf(TcPinnedClauseNotFoundError);
  });
});
