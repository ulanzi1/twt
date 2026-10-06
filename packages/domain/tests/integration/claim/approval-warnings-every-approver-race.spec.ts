// Story 6.23b (Trap 11; Testing) — a reason REPLACED between the page load and a LATER approver's submit, on TWO real
// connections (own-committing, :5433 — the 6.23a round-3 race shape). Every later writer runs ONE helper for THE ONE RULE —
// `checkLaterApprovalWarningReason` (the final vote, the escalation, the R9 vote, both 6.19c approvals) — so the race is
// proved on it: its `FOR SHARE` lock WAITS on the uncommitted replace, then sees the row replaced and refuses
// `WarningReasonUnavailableError` — ⛔ never silently mapped to the replacement. A FRESH Pariwar per test; committed rows
// are left behind (assert membership, ⛔ counts).

import { randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  WarningReasonUnavailableError,
  addApprovalWarningReason,
  checkLaterApprovalWarningReason,
  replaceApprovalWarningReason,
} from '../../../src/claim/index.js';
import { bindScopedDb, setPariwarScope } from '../../../src/db.js';
import { claimId as toClaimId, pariwarId as toPariwarId, type ClaimId, type PariwarId } from '../../../src/ids/index.js';
import { seedClaim, seedNomineeDeclaration } from '../_helpers.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);
const DAY = 86_400_000;

describe.skipIf(!hasDatabase)('Story 6.23b — a reason replaced under a later approver (two connections, :5433)', { timeout: 20000 }, () => {
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

  async function openTx(pid: PariwarId): Promise<{ client: pg.PoolClient; backendPid: number }> {
    const client = await pool.connect();
    await client.query('BEGIN');
    await client.query('SET LOCAL ROLE twt_app');
    await setPariwarScope(client, pid);
    const { rows } = await client.query<{ pid: number }>('SELECT pg_backend_pid() AS pid');
    return { client, backendPid: rows[0]!.pid };
  }

  /** Wait until `backendPid` is BLOCKED on a lock — proof the race is real, ⛔ never a sleep. */
  async function waitUntilBlocked(backendPid: number): Promise<void> {
    for (let i = 0; i < 200; i += 1) {
      const { rows } = await pool.query<{ n: number }>(
        `SELECT count(*)::int AS n FROM pg_stat_activity WHERE pid = $1 AND wait_event_type = 'Lock'`,
        [backendPid],
      );
      if (rows[0]!.n === 1) return;
      await new Promise((r) => setTimeout(r, 25));
    }
    throw new Error(`backend ${backendPid} never blocked on a lock`);
  }

  /** A claim filed now whose deceased named a nominee 30 days ago ⇒ a `recent_nominee_change` warning shows. */
  async function warnedClaim(pid: PariwarId): Promise<ClaimId> {
    return onOwnTx(pid, async (client) => {
      const tx = bindScopedDb(client);
      const mid = randomUUID();
      await seedNomineeDeclaration(tx, pid, mid, { declaredAt: new Date(Date.now() - 30 * DAY) });
      return toClaimId(await seedClaim(tx, pid, { deceasedMemberId: mid, currentState: 'verifier_approved' }));
    });
  }

  const write = { actorId: 'sa-1', actorDisplay: 'Super Admin One' };

  it('⭐ the later approver\'s `FOR SHARE` WAITS on an uncommitted replace, then refuses `unavailable` (⛔ mapped to the new words)', async () => {
    const pid = toPariwarId(randomUUID());
    const cid = await warnedClaim(pid);
    const old = await onOwnTx(pid, (c) => addApprovalWarningReason(c, { pariwarId: pid, label: 'Seen in person', whenToUse: 'When seen.', ...write }));
    const replacer = await openTx(pid);
    const approver = await openTx(pid);
    try {
      await replaceApprovalWarningReason(replacer.client, { pariwarId: pid, reasonId: old.reasonId, label: 'Seen at home', whenToUse: 'When visited.', ...write });
      const checking = checkLaterApprovalWarningReason(bindScopedDb(approver.client), pid, cid, old.code, 'enc:v1:note');
      // CI fix (2026-10-06): under a loaded suite, `checking` can reject before the `await expect(checking).rejects…`
      // below attaches its handler — Node then reports a false "Unhandled Rejection" (the job fails even though every
      // test passes). A no-op `.catch` here marks the rejection handled immediately without affecting the real
      // assertion below, which still observes the same promise's rejection normally.
      checking.catch(() => undefined);
      await waitUntilBlocked(approver.backendPid);
      await replacer.client.query('COMMIT');
      await expect(checking).rejects.toBeInstanceOf(WarningReasonUnavailableError);
    } finally {
      await approver.client.query('ROLLBACK');
      await replacer.client.query('ROLLBACK').catch(() => undefined);
      approver.client.release();
      replacer.client.release();
    }
  });

  it('⭐ a replace WAITS on the later approver\'s lock, so the words it chose cannot change under its record', async () => {
    const pid = toPariwarId(randomUUID());
    const cid = await warnedClaim(pid);
    const old = await onOwnTx(pid, (c) => addApprovalWarningReason(c, { pariwarId: pid, label: 'Held', whenToUse: 'Held.', ...write }));
    const approver = await openTx(pid);
    const replacer = await openTx(pid);
    try {
      const rule = await checkLaterApprovalWarningReason(bindScopedDb(approver.client), pid, cid, old.code, 'enc:v1:note');
      expect(rule.reason).toEqual({ code: old.code, reasonId: old.reasonId });
      expect(rule.kinds).toEqual(['recent_nominee_change']);
      const replacing = replaceApprovalWarningReason(replacer.client, { pariwarId: pid, reasonId: old.reasonId, label: 'Later', whenToUse: 'Later.', ...write });
      await waitUntilBlocked(replacer.backendPid);
      // Code review 2026-10-06 (P7): this test proves `checkLaterApprovalWarningReason`'s lock on the reason row is
      // held until THIS commit — the precondition any later `insertClaimWarningApprovalRecord` call relies on to
      // snapshot `rule.reason` safely. The insert itself (a real decision/vote/closure row + the record) is covered
      // by the step-specific writer tests, not re-proven here; this test's scope is the reason-lock race alone.
      await approver.client.query('COMMIT');
      const { replaced } = await replacing;
      expect(replaced.reasonId).toBe(old.reasonId);
      await replacer.client.query('COMMIT');
    } finally {
      await approver.client.query('ROLLBACK').catch(() => undefined);
      await replacer.client.query('ROLLBACK').catch(() => undefined);
      approver.client.release();
      replacer.client.release();
    }
  });
});
