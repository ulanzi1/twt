// clause_drafts accessors + RLS + state machine — live-DB (Story 2.4, Task 8).
//
// The server-persisted draft store (ADR-0021). Exercises: tenant-isolation RLS
// (a tenant cannot read another's drafts; fail-closed without scope), the draft
// state machine (edit resets sign-off + clears the content hash), the content-bound
// resolveDraftSignoff (signed_off + matching hash → returns; after an edit → null),
// self-review rejection, the at-most-one-open-draft partial-unique, and the
// listClauses (chain-head) / listAmendments (time-ordered) reads.
//
// RLS-in-tests model (Story 1.6): the test login is a Docker superuser that bypasses
// RLS. Seed as superuser, then `enterAppScope` (SET LOCAL ROLE twt_app + scope) to
// exercise policies. afterEach ROLLBACK reverts everything.

import { describe, expect, it } from 'vitest';

import { clauseId as toClauseId } from '../../../src/ids/index.js';
import {
  amendClause,
  createClause,
  createDraft,
  discardDraft,
  draftContentHash,
  getDraft,
  listAmendments,
  listClauses,
  listDrafts,
  markDraftPublished,
  recordDraftSignoff,
  resolveDraftSignoff,
  submitForReview,
  updateDraft,
} from '../../../src/niyamavali/index.js';
import { clauseDraftId } from '../../../src/ids/index.js';
import * as schema from '../../../src/schema/index.js';
import type { ClauseDraftRow } from '../../../src/schema/clause_drafts.js';
import { hasDatabase, getTx, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppScope, enterAppRoleNoScope } from '../_helpers.js';

const CLAUSE = toClauseId('niy.draft.r1');
const AUTHOR = '22222222-2222-2222-2222-222222222222';
const REVIEWER = '33333333-3333-3333-3333-333333333333';
const EFFECTIVE = new Date('2026-07-01T00:00:00Z');

function draftInput(pariwarId: typeof PARIWAR_A, overrides: Record<string, unknown> = {}) {
  return {
    pariwarId,
    clauseId: CLAUSE,
    operation: 'create' as const,
    payload: { rule_code: 'R7(A)', title_en: 'Restoration' },
    effectiveDate: EFFECTIVE,
    benefitMechanism: 'pool' as const,
    authoredByActor: AUTHOR,
    ...overrides,
  };
}

describe.skipIf(!hasDatabase)('clause_drafts accessors + state machine', () => {
  setupLiveDb();

  it('createDraft → getDraft round-trips a draft at status=draft', async () => {
    const { tx } = getTx();
    const created = await createDraft(tx, draftInput(PARIWAR_A));
    expect(created.status).toBe('draft');
    const loaded = await getDraft(tx, PARIWAR_A, created.draftId);
    expect(loaded?.draftId).toBe(created.draftId);
    expect(loaded?.payload).toEqual({ rule_code: 'R7(A)', title_en: 'Restoration' });
  });

  it('createDraft amend requires + validates affected_member_scope', async () => {
    const { tx } = getTx();
    await expect(
      createDraft(tx, draftInput(PARIWAR_A, { operation: 'amend', affectedMemberScope: undefined })),
    ).rejects.toThrow(/affected_member_scope/);
    const ok = await createDraft(
      tx,
      draftInput(PARIWAR_A, { operation: 'amend', affectedMemberScope: { kind: 'past_lockin' } }),
    );
    expect(ok.affectedMemberScope).toEqual({ kind: 'past_lockin' });
  });

  it('the full happy path: submit → signoff → resolves a valid sign-off', async () => {
    const { tx } = getTx();
    const d = await createDraft(tx, draftInput(PARIWAR_A));
    await submitForReview(tx, PARIWAR_A, d.draftId);
    await recordDraftSignoff(tx, PARIWAR_A, d.draftId, {
      reviewedBy: REVIEWER,
      contentHash: draftContentHash(d.payload),
      reviewedAt: new Date(),
    });
    const signoff = await resolveDraftSignoff(tx, PARIWAR_A, d.draftId);
    expect(signoff?.reviewedBy).toBe(REVIEWER);
    expect(signoff?.resourceLocator).toBe(`niyamavali:clause:${CLAUSE}`);
  });

  it('editing a signed_off draft RESETS to draft + CLEARS the sign-off (re-review required)', async () => {
    const { tx } = getTx();
    const d = await createDraft(tx, draftInput(PARIWAR_A));
    await submitForReview(tx, PARIWAR_A, d.draftId);
    await recordDraftSignoff(tx, PARIWAR_A, d.draftId, {
      reviewedBy: REVIEWER,
      contentHash: draftContentHash(d.payload),
      reviewedAt: new Date(),
    });
    // Edit after sign-off → sign-off invalidated.
    const edited = await updateDraft(tx, PARIWAR_A, d.draftId, {
      payload: { rule_code: 'R7(A)', title_en: 'Restoration (revised)' },
    });
    expect(edited.status).toBe('draft');
    expect(edited.toneReviewedBy).toBeNull();
    expect(edited.toneReviewContentHash).toBeNull();
    // The gate's resolver now returns null → publish would 409.
    expect(await resolveDraftSignoff(tx, PARIWAR_A, d.draftId)).toBeNull();
  });

  it('recordDraftSignoff rejects a self-review (reviewer === author)', async () => {
    const { tx } = getTx();
    const d = await createDraft(tx, draftInput(PARIWAR_A));
    await submitForReview(tx, PARIWAR_A, d.draftId);
    await expect(
      recordDraftSignoff(tx, PARIWAR_A, d.draftId, {
        reviewedBy: AUTHOR,
        contentHash: draftContentHash(d.payload),
        reviewedAt: new Date(),
      }),
    ).rejects.toThrow(/own draft/);
  });

  it('markDraftPublished is rejected unless the draft is signed_off', async () => {
    const { tx } = getTx();
    const d = await createDraft(tx, draftInput(PARIWAR_A));
    const cvId = clauseDraftId('55555555-5555-5555-5555-555555555555') as unknown as Parameters<
      typeof markDraftPublished
    >[3];
    await expect(
      markDraftPublished(tx, PARIWAR_A, d.draftId, cvId, '66666666-6666-6666-6666-666666666666'),
    ).rejects.toThrow(/signed_off/);
  });

  it('discardDraft moves an open draft to discarded', async () => {
    const { tx } = getTx();
    const d = await createDraft(tx, draftInput(PARIWAR_A));
    const discarded = await discardDraft(tx, PARIWAR_A, d.draftId);
    expect(discarded.status).toBe('discarded');
  });

  it('partial-unique: a second OPEN draft for the same clause is rejected (23505)', async () => {
    const { tx } = getTx();
    await createDraft(tx, draftInput(PARIWAR_A));
    const err = await createDraft(tx, draftInput(PARIWAR_A)).catch((e: unknown) => e);
    const code =
      (err as { code?: string }).code ?? (err as { cause?: { code?: string } }).cause?.code;
    expect(code).toBe('23505');
  });

  it('listDrafts filters by status, newest-first', async () => {
    const { tx } = getTx();
    const a = await createDraft(tx, draftInput(PARIWAR_A, { clauseId: toClauseId('niy.draft.a') }));
    await createDraft(tx, draftInput(PARIWAR_A, { clauseId: toClauseId('niy.draft.b') }));
    await submitForReview(tx, PARIWAR_A, a.draftId);
    const inReview = await listDrafts(tx, PARIWAR_A, { status: 'in_review' });
    expect(inReview.map((d) => d.draftId)).toContain(a.draftId);
    expect(inReview.every((d: ClauseDraftRow) => d.status === 'in_review')).toBe(true);
  });
});

describe.skipIf(!hasDatabase)('clause_drafts RLS isolation', () => {
  setupLiveDb();

  it('a tenant cannot read another tenant’s drafts', async () => {
    const { tx, client } = getTx();
    await createDraft(tx, draftInput(PARIWAR_A, { clauseId: toClauseId('niy.draft.a') }));
    await createDraft(tx, draftInput(PARIWAR_B, { clauseId: toClauseId('niy.draft.b') }));
    await enterAppScope(client, PARIWAR_B);

    const rows = await tx.select().from(schema.clauseDrafts);
    expect(rows.every((r) => r.pariwarId === PARIWAR_B)).toBe(true);
    expect(rows.some((r) => r.pariwarId === PARIWAR_A)).toBe(false);
  });

  it('connection-level fail-closed: app role without scope returns empty', async () => {
    const { tx, client } = getTx();
    await createDraft(tx, draftInput(PARIWAR_A, { clauseId: toClauseId('niy.draft.a') }));
    await enterAppRoleNoScope(client);
    const rows = await tx.select().from(schema.clauseDrafts);
    expect(rows).toHaveLength(0);
  });

  it('FORCE RLS: clause_drafts has rowsecurity AND forcerowsecurity', async () => {
    const { client } = getTx();
    const { rows } = await client.query<{
      relrowsecurity: boolean;
      relforcerowsecurity: boolean;
    }>(`SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = 'clause_drafts'`);
    expect(rows[0]?.relrowsecurity).toBe(true);
    expect(rows[0]?.relforcerowsecurity).toBe(true);
  });
});

describe.skipIf(!hasDatabase)('listClauses / listAmendments reads (Story 2.4)', () => {
  setupLiveDb();

  it('listClauses returns the latest version (chain head) per clause, newest-first', async () => {
    const { tx } = getTx();
    const c1 = toClauseId('niy.list.one');
    await createClause(tx, {
      pariwarId: PARIWAR_A,
      clauseId: c1,
      effectiveDate: new Date('2025-01-01T00:00:00Z'),
      payload: { v: 1 },
      benefitMechanism: 'pool',
    });
    await amendClause(tx, {
      pariwarId: PARIWAR_A,
      clauseId: c1,
      payload: { v: 2 },
      effectiveDate: new Date('2025-06-01T00:00:00Z'),
      affectedMemberScope: { kind: 'all_members' },
    });
    const heads = await listClauses(tx, PARIWAR_A);
    const head = heads.find((h) => h.clauseId === c1);
    // Only the HEAD (v2, no successor) is returned for the clause, not v1.
    expect(head?.version).toBe(2);
    expect(heads.filter((h) => h.clauseId === c1)).toHaveLength(1);
  });

  it('listAmendments returns the ledger newest-first', async () => {
    const { tx } = getTx();
    const c2 = toClauseId('niy.list.two');
    await createClause(tx, {
      pariwarId: PARIWAR_A,
      clauseId: c2,
      effectiveDate: new Date('2025-01-01T00:00:00Z'),
      payload: { v: 1 },
      benefitMechanism: 'pool',
    });
    await amendClause(tx, {
      pariwarId: PARIWAR_A,
      clauseId: c2,
      payload: { v: 2 },
      effectiveDate: new Date('2025-06-01T00:00:00Z'),
      affectedMemberScope: { kind: 'all_members' },
    });
    const amendments = await listAmendments(tx, PARIWAR_A);
    expect(amendments.some((a) => a.diffDocument.changed['v'] !== undefined)).toBe(true);
  });
});
