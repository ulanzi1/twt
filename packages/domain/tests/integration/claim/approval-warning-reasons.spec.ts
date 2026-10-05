// Story 6.23a — the WARNING-REASON LIST at the domain, OWN-COMMITTING (Task 11; NW16, NW17; AC12). Each test uses a
// FRESH Pariwar (Trap 18 — a reason row can ⛔ never be deleted, so committed rows accumulate) and asserts MEMBERSHIP
// on that Pariwar only. The deferred replacement trigger fires only at a real COMMIT — which is why this spec commits.
//   · add ⇒ a server code, the snapshotted name and time, active at once; the active list order (the generic first);
//   · replace ⇒ the old row stamped once, the new row naming it; the old words kept; a second replace ⇒ already_replaced;
//   · two Super Admins replacing at once (two connections) ⇒ EXACTLY one wins;
//   · the generic can ⛔ never be replaced; a vocabulary term / blank / over-long ⇒ invalid_text.

import { randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  APPROVAL_WARNING_GENERIC_REASON,
  ApprovalWarningReasonWriteRefusedError,
  addApprovalWarningReason,
  listApprovalWarningReasons,
  replaceApprovalWarningReason,
} from '../../../src/claim/index.js';
import { bindScopedDb, setPariwarScope } from '../../../src/db.js';
import { pariwarId as toPariwarId, type PariwarId } from '../../../src/ids/index.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);

describe.skipIf(!hasDatabase)('Story 6.23a — the warning-reason list (own-committing, :5433)', { timeout: 20000 }, () => {
  let pool: pg.Pool;

  beforeAll(() => {
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 4 });
  });
  afterAll(async () => {
    await pool.end();
  });

  async function onOwnTx<T>(pid: PariwarId, fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SET LOCAL ROLE twt_app');
      await setPariwarScope(client, pid);
      const out = await fn(client);
      await client.query('COMMIT');
      return out;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  }

  const write = { actorId: 'sa-1', actorDisplay: 'Super Admin One' };
  const list = (pid: PariwarId) => onOwnTx(pid, (c) => listApprovalWarningReasons(bindScopedDb(c), pid, { history: true }));

  it('a FRESH Pariwar\'s active list is exactly the built-in generic', async () => {
    const pid = toPariwarId(randomUUID());
    const { active, history } = await list(pid);
    expect(active.map((o) => o.code)).toEqual([APPROVAL_WARNING_GENERIC_REASON.code]);
    expect(active[0]).toMatchObject({ reasonId: null, addedByDisplay: null, addedAt: null, label: APPROVAL_WARNING_GENERIC_REASON.label });
    expect(history).toEqual([]);
  });

  it('⭐ add ⇒ a server-generated code, the snapshotted name and the time, active at once, after the generic (oldest first)', async () => {
    const pid = toPariwarId(randomUUID());
    const a = await onOwnTx(pid, (c) => addApprovalWarningReason(c, { pariwarId: pid, label: 'Seen in person', whenToUse: 'Use when seen.', ...write }));
    const b = await onOwnTx(pid, (c) => addApprovalWarningReason(c, { pariwarId: pid, label: 'Inspector confirmed', whenToUse: 'Use when inspected.', ...write }));
    expect(a.code).toMatch(/^awr_[0-9a-f]{8}$/);
    expect(a.createdByDisplay).toBe('Super Admin One');
    const { active } = await list(pid);
    expect(active.map((o) => o.code)).toEqual([APPROVAL_WARNING_GENERIC_REASON.code, a.code, b.code]);
    expect(active[1]).toMatchObject({ label: 'Seen in person', whenToUse: 'Use when seen.', addedByDisplay: 'Super Admin One' });
  });

  it('⭐ replace ⇒ the old row stamped ONCE and kept with its words; the new row names it; a second replace ⇒ already_replaced', async () => {
    const pid = toPariwarId(randomUUID());
    const old = await onOwnTx(pid, (c) => addApprovalWarningReason(c, { pariwarId: pid, label: 'Old words', whenToUse: 'Old note.', ...write }));
    const { created } = await onOwnTx(pid, (c) =>
      replaceApprovalWarningReason(c, { pariwarId: pid, reasonId: old.reasonId, label: 'New words', whenToUse: 'New note.', actorId: 'sa-2', actorDisplay: 'Super Admin Two' }),
    );
    expect(created.replacesReasonId).toBe(old.reasonId);
    const { active, history } = await list(pid);
    expect(active.map((o) => o.code)).toEqual([APPROVAL_WARNING_GENERIC_REASON.code, created.code]);
    expect(active[1]).toMatchObject({ replacesLabel: 'Old words' });
    expect(history).toEqual([
      expect.objectContaining({ code: old.code, label: 'Old words', whenToUse: 'Old note.', replacedByLabel: 'New words', replacedByDisplay: 'Super Admin Two' }),
    ]);
    await expect(
      onOwnTx(pid, (c) => replaceApprovalWarningReason(c, { pariwarId: pid, reasonId: old.reasonId, label: 'Again', whenToUse: 'Again.', ...write })),
    ).rejects.toSatisfy((e: unknown) => e instanceof ApprovalWarningReasonWriteRefusedError && e.code === 'already_replaced');
  });

  it('⭐ two Super Admins replacing the SAME reason at once (two connections) ⇒ exactly one wins', async () => {
    const pid = toPariwarId(randomUUID());
    const old = await onOwnTx(pid, (c) => addApprovalWarningReason(c, { pariwarId: pid, label: 'Contested', whenToUse: 'Contested.', ...write }));
    const attempt = (label: string) =>
      onOwnTx(pid, (c) => replaceApprovalWarningReason(c, { pariwarId: pid, reasonId: old.reasonId, label, whenToUse: `${label}.`, ...write }));
    const settled = await Promise.allSettled([attempt('First'), attempt('Second')]);
    expect(settled.filter((s) => s.status === 'fulfilled')).toHaveLength(1);
    const loser = settled.find((s) => s.status === 'rejected') as PromiseRejectedResult;
    expect(loser.reason).toBeInstanceOf(ApprovalWarningReasonWriteRefusedError);
    expect((loser.reason as ApprovalWarningReasonWriteRefusedError).code).toBe('already_replaced');
    const { active } = await list(pid);
    expect(active).toHaveLength(2);
  });

  it('the generic can ⛔ never be replaced; an unknown or another Pariwar\'s reason ⇒ not_found', async () => {
    const pid = toPariwarId(randomUUID());
    const other = toPariwarId(randomUUID());
    const foreign = await onOwnTx(other, (c) => addApprovalWarningReason(c, { pariwarId: other, label: 'Theirs', whenToUse: 'Theirs.', ...write }));
    for (const reasonId of [randomUUID(), foreign.reasonId]) {
      await expect(
        onOwnTx(pid, (c) => replaceApprovalWarningReason(c, { pariwarId: pid, reasonId, label: 'X', whenToUse: 'X.', ...write })),
      ).rejects.toSatisfy((e: unknown) => e instanceof ApprovalWarningReasonWriteRefusedError && e.code === 'not_found');
    }
  });

  it('a vocabulary term, a blank or an over-long field ⇒ invalid_text (⛔ nothing written)', async () => {
    const pid = toPariwarId(randomUUID());
    for (const [label, whenToUse] of [
      ['Report checked', 'ok'],
      ['ok', 'Check the passbook first'],
      ['  ', 'ok'],
      ['x'.repeat(121), 'ok'],
    ] as const) {
      await expect(onOwnTx(pid, (c) => addApprovalWarningReason(c, { pariwarId: pid, label, whenToUse, ...write }))).rejects.toSatisfy(
        (e: unknown) => e instanceof ApprovalWarningReasonWriteRefusedError && e.code === 'invalid_text',
      );
    }
    expect((await list(pid)).active).toHaveLength(1);
  });
});
