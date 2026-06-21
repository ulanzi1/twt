// Niyamavali registry behaviour — live-DB integration (Story 2.3, Task 9).
//
// Drives the domain accessors against real Postgres under PARIWAR_A scope, inside
// the per-test BEGIN/ROLLBACK (the accessors run on the caller's transaction — see
// write.ts §"Transaction contract" — so nothing persists). Covers AC3 (create +
// conflict), AC4 (amend: version increment + predecessor + supersededBy + diff
// row), AC5 (split/merge lineage forward+backward), AC6 (deprecation), AC7 (dual
// resolution by clause_id [effective-date + non-deprecated] vs clause_version_id).

import { describe, expect, it } from 'vitest';

import { clauseId as toClauseId } from '../../../src/ids/index.js';
import { ClauseIdConflictError, ClauseNotFoundError } from '../../../src/niyamavali/errors.js';
import {
  amendClause,
  createClause,
  deprecateClause,
  lineageBackward,
  lineageForward,
  mergeClauses,
  resolveByClauseId,
  resolveByClauseVersionId,
  splitClause,
} from '../../../src/niyamavali/index.js';
import { hasDatabase, getTx, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, enterAppScope } from '../_helpers.js';

const R7 = toClauseId('niy.contribution-discipline.r7-a');
const D1 = new Date('2025-01-01T00:00:00Z');
const D2 = new Date('2025-06-01T00:00:00Z');

describe.skipIf(!hasDatabase)('Niyamavali registry behaviour (PARIWAR_A scope)', () => {
  setupLiveDb();

  async function scopeA() {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    return tx;
  }

  it('createClause inserts version 1 with empty predecessors (AC3)', async () => {
    const tx = await scopeA();
    const row = await createClause(tx, {
      pariwarId: PARIWAR_A,
      clauseId: R7,
      effectiveDate: D1,
      payload: { rule_code: 'R7(A)', window_days: 30 },
      benefitMechanism: 'pool',
    });
    expect(row.version).toBe(1);
    expect(row.clauseId).toBe(R7);
    expect(row.predecessorClauseIds).toEqual([]);
    expect(row.supersededByVersion).toBeNull();
    expect(row.deprecatedAt).toBeNull();
  });

  it('re-creating the same clause_id for the Pariwar throws ClauseIdConflictError (AC3 / 409 seam)', async () => {
    const tx = await scopeA();
    await createClause(tx, {
      pariwarId: PARIWAR_A,
      clauseId: R7,
      effectiveDate: D1,
      payload: {},
      benefitMechanism: 'pool',
    });
    await expect(
      createClause(tx, {
        pariwarId: PARIWAR_A,
        clauseId: R7,
        effectiveDate: D1,
        payload: {},
        benefitMechanism: 'pool',
      }),
    ).rejects.toBeInstanceOf(ClauseIdConflictError);
  });

  it('amendClause inserts v2, wires predecessor + supersededBy, and writes a diff row (AC4)', async () => {
    const tx = await scopeA();
    const v1 = await createClause(tx, {
      pariwarId: PARIWAR_A,
      clauseId: R7,
      effectiveDate: D1,
      payload: { rule_code: 'R7(A)', window_days: 30 },
      benefitMechanism: 'pool',
    });

    const { version: v2, amendment } = await amendClause(tx, {
      pariwarId: PARIWAR_A,
      clauseId: R7,
      payload: { rule_code: 'R7(A)', window_days: 45 },
      effectiveDate: D2,
      affectedMemberScope: { kind: 'all_members' },
    });

    expect(v2.version).toBe(2);
    expect(v2.predecessorClauseIds).toEqual([v1.clauseVersionId]);
    // The new version carries the prior mechanism by default.
    expect(v2.benefitMechanism).toBe('pool');

    // Prior row now points forward (AC4).
    const priorReloaded = await resolveByClauseVersionId(tx, PARIWAR_A, v1.clauseVersionId);
    expect(priorReloaded?.supersededByVersion).toBe(v2.clauseVersionId);

    // The amendment ledger row links from→to + carries the structured diff.
    expect(amendment.fromClauseVersionId).toBe(v1.clauseVersionId);
    expect(amendment.toClauseVersionId).toBe(v2.clauseVersionId);
    expect(amendment.diffDocument.changed).toEqual({ window_days: { from: 30, to: 45 } });
    expect(amendment.affectedMemberScope).toEqual({ kind: 'all_members' });
  });

  it('amendClause rejects a malformed affected_member_scope (architecture §1.10)', async () => {
    const tx = await scopeA();
    await createClause(tx, {
      pariwarId: PARIWAR_A,
      clauseId: R7,
      effectiveDate: D1,
      payload: {},
      benefitMechanism: 'pool',
    });
    await expect(
      amendClause(tx, {
        pariwarId: PARIWAR_A,
        clauseId: R7,
        payload: { x: 1 },
        effectiveDate: D2,
        // @ts-expect-error — deliberately malformed scope
        affectedMemberScope: { kind: 'everyone' },
      }),
    ).rejects.toThrow(/affected_member_scope/);
  });

  it('amendClause on a non-existent clause throws ClauseNotFoundError', async () => {
    const tx = await scopeA();
    await expect(
      amendClause(tx, {
        pariwarId: PARIWAR_A,
        clauseId: toClauseId('niy.does-not.exist'),
        payload: {},
        effectiveDate: D2,
        affectedMemberScope: { kind: 'all_members' },
      }),
    ).rejects.toBeInstanceOf(ClauseNotFoundError);
  });

  it('AC7: resolveByClauseId returns the latest effective non-deprecated version; asOf rewinds', async () => {
    const tx = await scopeA();
    const v1 = await createClause(tx, {
      pariwarId: PARIWAR_A,
      clauseId: R7,
      effectiveDate: D1,
      payload: { v: 1 },
      benefitMechanism: 'pool',
    });
    const { version: v2 } = await amendClause(tx, {
      pariwarId: PARIWAR_A,
      clauseId: R7,
      payload: { v: 2 },
      effectiveDate: D2,
      affectedMemberScope: { kind: 'all_members' },
    });

    // "current rule" now → the latest effective version (v2).
    const current = await resolveByClauseId(tx, PARIWAR_A, R7);
    expect(current?.clauseVersionId).toBe(v2.clauseVersionId);

    // "rule as of 2025-03-01" → v2 not yet effective → v1.
    const asOf = await resolveByClauseId(tx, PARIWAR_A, R7, new Date('2025-03-01T00:00:00Z'));
    expect(asOf?.clauseVersionId).toBe(v1.clauseVersionId);

    // Exact historical resolution is immutable + first-class.
    const exact = await resolveByClauseVersionId(tx, PARIWAR_A, v1.clauseVersionId);
    expect(exact?.version).toBe(1);
  });

  it('AC6: deprecation removes a clause from current resolution but it still resolves by version id', async () => {
    const tx = await scopeA();
    const v1 = await createClause(tx, {
      pariwarId: PARIWAR_A,
      clauseId: R7,
      effectiveDate: D1,
      payload: { v: 1 },
      benefitMechanism: 'pool',
    });

    await deprecateClause(tx, { pariwarId: PARIWAR_A, clauseId: R7 });

    // No non-deprecated version remains → current resolution is null.
    expect(await resolveByClauseId(tx, PARIWAR_A, R7)).toBeNull();
    // But the exact historical row is preserved + resolvable (audit history).
    const exact = await resolveByClauseVersionId(tx, PARIWAR_A, v1.clauseVersionId);
    expect(exact?.clauseVersionId).toBe(v1.clauseVersionId);
    expect(exact?.deprecatedAt).not.toBeNull();
  });

  it('AC5: splitClause wires children to the source; lineage is bidirectional', async () => {
    const tx = await scopeA();
    const source = await createClause(tx, {
      pariwarId: PARIWAR_A,
      clauseId: R7,
      effectiveDate: D1,
      payload: {},
      benefitMechanism: 'pool',
    });
    const childAId = toClauseId('niy.contribution-discipline.r7-a-part1');
    const childBId = toClauseId('niy.contribution-discipline.r7-a-part2');

    const children = await splitClause(tx, {
      pariwarId: PARIWAR_A,
      sourceClauseId: R7,
      newClauses: [
        { clauseId: childAId, effectiveDate: D2, payload: {}, benefitMechanism: 'pool' },
        { clauseId: childBId, effectiveDate: D2, payload: {}, benefitMechanism: 'pool' },
      ],
    });

    expect(children).toHaveLength(2);
    expect(children.every((c) => c.predecessorClauseIds[0] === source.clauseVersionId)).toBe(true);

    const forward = await lineageForward(tx, PARIWAR_A, R7);
    expect(new Set(forward)).toEqual(new Set([childAId, childBId]));

    const backA = await lineageBackward(tx, PARIWAR_A, childAId);
    expect(backA).toEqual([R7]);
  });

  it('D2: amendClause on a deprecated clause throws ClauseNotFoundError', async () => {
    const tx = await scopeA();
    await createClause(tx, {
      pariwarId: PARIWAR_A,
      clauseId: R7,
      effectiveDate: D1,
      payload: { v: 1 },
      benefitMechanism: 'pool',
    });
    await deprecateClause(tx, { pariwarId: PARIWAR_A, clauseId: R7 });
    await expect(
      amendClause(tx, {
        pariwarId: PARIWAR_A,
        clauseId: R7,
        payload: { v: 2 },
        effectiveDate: D2,
        affectedMemberScope: { kind: 'all_members' },
      }),
    ).rejects.toBeInstanceOf(ClauseNotFoundError);
  });

  it('D3: deprecateClause on an already-deprecated clause throws', async () => {
    const tx = await scopeA();
    await createClause(tx, {
      pariwarId: PARIWAR_A,
      clauseId: R7,
      effectiveDate: D1,
      payload: { v: 1 },
      benefitMechanism: 'pool',
    });
    await deprecateClause(tx, { pariwarId: PARIWAR_A, clauseId: R7 });
    await expect(deprecateClause(tx, { pariwarId: PARIWAR_A, clauseId: R7 })).rejects.toThrow(
      /already deprecated/,
    );
  });

  it('AC5: mergeClauses records many predecessors; backward lineage lists all sources', async () => {
    const tx = await scopeA();
    const srcAId = toClauseId('niy.a.one');
    const srcBId = toClauseId('niy.b.two');
    const mergedId = toClauseId('niy.merged.combined');

    const srcA = await createClause(tx, {
      pariwarId: PARIWAR_A,
      clauseId: srcAId,
      effectiveDate: D1,
      payload: {},
      benefitMechanism: 'pool',
    });
    const srcB = await createClause(tx, {
      pariwarId: PARIWAR_A,
      clauseId: srcBId,
      effectiveDate: D1,
      payload: {},
      benefitMechanism: 'pool',
    });

    const merged = await mergeClauses(tx, {
      pariwarId: PARIWAR_A,
      sourceClauseIds: [srcAId, srcBId],
      newClause: { clauseId: mergedId, effectiveDate: D2, payload: {}, benefitMechanism: 'pool' },
    });

    expect(new Set(merged.predecessorClauseIds)).toEqual(
      new Set([srcA.clauseVersionId, srcB.clauseVersionId]),
    );

    const back = await lineageBackward(tx, PARIWAR_A, mergedId);
    expect(new Set(back)).toEqual(new Set([srcAId, srcBId]));

    expect(await lineageForward(tx, PARIWAR_A, srcAId)).toEqual([mergedId]);
  });
});
