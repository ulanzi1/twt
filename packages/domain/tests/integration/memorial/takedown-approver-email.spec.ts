// Story 11b.4a — the memorial take-down APPROVER EMAIL's domain half against the LIVE database (Task 8.3; AC9; `2026-10-27-412`
// MP10 (b) / MP11; ADR-0043). The selector (who is due), Q3 (who is eligible), the claiming transaction (`begun` / `not_due` /
// `expired` / `no_target` / `already_final` / `held_by_other`) and the detail grammar's lockstep with 0187.
// Each take-down runs through the REAL writer (`recordMemorialTakedownRequest` → `decideMemorialTakedown`) over a chain whose
// approvals carry REAL staff users as `actor_id`. A fresh Pariwar per test (⛔ never PARIWAR_A). Live DB only; per-test ROLLBACK.

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import type { MemberId, PariwarId, PoolId, UserId } from '../../../src/ids/index.js';
import {
  MEMORIAL_TAKEDOWN_APPROVER_EMAIL_PARKED_BY,
  MEMORIAL_TAKEDOWN_APPROVER_EMAIL_RECHECK_REASONS,
  beginMemorialTakedownApproverEmail,
  decideMemorialTakedown,
  isMemorialTakedownApproverEmailDetail,
  memorialTakedownApproverEmailDetail,
  recordMemorialTakedownRequest,
  selectDueMemorialTakedownApproverEmails,
} from '../../../src/memorial/index.js';
import { MEMORIAL_TAKEDOWN_APPROVER_EMAIL_DETAIL_PATTERN } from '../../../src/schema/memorial_takedown_approver_emails.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { seedClaim, seedMember, seedPool } from '../_helpers.js';

type Client = ReturnType<typeof getTx>['client'];

let minute = 0;
const at = (): Date => new Date(Date.parse('2026-09-01T00:00:00Z') + (minute += 1) * 60_000);

/** As the superuser: a staff user, optionally with admin credentials (the ONLY place the address is held). */
async function staff(client: Client, o: { status?: 'active' | 'suspended' | 'disabled'; credentials?: boolean } = {}): Promise<UserId> {
  const id = randomUUID();
  await client.query(`INSERT INTO users (id, identity_type, status, display_name) VALUES ($1, 'admin', $2, 'Panel Member')`, [id, o.status ?? 'active']);
  if (o.credentials !== false) {
    await client.query(
      `INSERT INTO admin_credentials (user_id, email_ciphertext, email_blind_index, password_hash) VALUES ($1, 'enc:v1:x', $2, 'hash')`,
      [id, `bidx-11b4a-${id}`],
    );
  }
  return id as UserId;
}

interface World {
  readonly pariwarId: PariwarId;
  readonly poolId: PoolId;
  readonly versions: string[];
}

/** A deceased member's closed drive with one version per approver in `approvers` (oldest first, each approved by that user). */
async function drive(approvers: readonly (UserId | 'pending')[]): Promise<World> {
  const { tx, client } = getTx();
  const pariwarId = randomUUID() as PariwarId;
  const memberId = (await seedMember(tx, pariwarId, { state: 'active' })) as MemberId;
  const claimCaseId = await seedClaim(tx, pariwarId, { deceasedMemberId: memberId });
  const poolId = randomUUID() as PoolId;
  await seedPool(tx, pariwarId, { poolId, claimCaseId, currentState: 'closed', poolCanonicalIdentifier: `P-2026-09-${poolId.slice(0, 8)}` });
  const versions: string[] = [];
  for (const [i, approver] of approvers.entries()) {
    const id = randomUUID();
    await client.query(
      `INSERT INTO memorial_submissions (submission_id, pariwar_id, pool_id, claim_case_id, deceased_member_id, supersedes_submission_id,
         body_ciphertext, authorisation_copy_version, authorisation_locale, handover_recipient, handover_nominee_ref, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'enc:v1:body', '2026-10-25.v3-pending-hi-review', 'hi', 'latest', $7, $8)`,
      [id, pariwarId, poolId, claimCaseId, memberId, versions[i - 1] ?? null, randomUUID(), at()],
    );
    if (approver !== 'pending') {
      // ⭐ All but the last `approved_with_omissions`, so a later version could be sent (11b.4 MA13).
      const action = i < approvers.length - 1 ? 'approved_with_omissions' : 'approved';
      await client.query(
        `INSERT INTO memorial_review_decisions (submission_id, pariwar_id, action, omissions, actor_id, actor_display, decided_at)
         VALUES ($1, $2, $3, $4, $5, 'Panel Member', $6)`,
        [id, pariwarId, action, action === 'approved' ? '[]' : '[{"field":"body","start":0,"end":3,"reason":"against_the_law"}]', approver, at()],
      );
    }
    versions.push(id);
  }
  return { pariwarId, poolId, versions };
}

/** Record + decide a request through the REAL writer. Returns its id. */
async function takeDown(w: World, outcome: 'taken_down' | 'kept' = 'taken_down'): Promise<string> {
  const { tx } = getTx();
  const operator = randomUUID() as UserId;
  const req = await recordMemorialTakedownRequest(tx, {
    pariwarId: w.pariwarId,
    poolId: w.poolId,
    firstContactAt: new Date(Date.now() - 3_600_000),
    actorId: operator,
    actorDisplay: 'Helpline Operator',
  });
  if (!req.ok) throw new Error(req.refusal);
  const out = await decideMemorialTakedown(tx, { pariwarId: w.pariwarId, requestId: req.request.requestId, outcome, actorId: operator, actorDisplay: 'Helpline Operator' });
  if (!out.ok) throw new Error(out.refusal);
  return req.request.requestId;
}

async function due(allow: readonly string[]) {
  const page = await selectDueMemorialTakedownApproverEmails(getTx().client, { after: null, limit: 100, allow });
  return page.due.map((d) => [d.requestId, d.recipientUserId, d.hasAttemptingRow] as const);
}

async function outbox(requestId: string) {
  const { rows } = await getTx().client.query<{ recipient_user_id: string | null; outcome: string; detail: string | null; claimed_by_job: string | null }>(
    `SELECT recipient_user_id, outcome, detail, claimed_by_job FROM memorial_takedown_approver_emails WHERE request_id = $1 ORDER BY recipient_user_id NULLS FIRST`,
    [requestId],
  );
  return rows;
}

describe.skipIf(!hasDatabase)('Story 11b.4a — the take-down approver email (domain, live DB)', { timeout: 30000 }, () => {
  setupLiveDb();

  it('the detail builder emits ONLY the 0187 grammar, for every kind (lockstep with the CHECK pattern)', () => {
    const built = [
      memorialTakedownApproverEmailDetail({ kind: 'no_approver' }),
      memorialTakedownApproverEmailDetail({ kind: 'transient', name: 'timeout' }),
      memorialTakedownApproverEmailDetail({ kind: 'transient', name: 'user@example.com said no' }),
      memorialTakedownApproverEmailDetail({ kind: 'held', name: 'AccountSuspendedException' }),
      memorialTakedownApproverEmailDetail({ kind: 'pre_call', step: 'decrypt_failed' }),
      memorialTakedownApproverEmailDetail({ kind: 'rejected', http: 400, name: 'MessageRejected' }),
      memorialTakedownApproverEmailDetail({ kind: 'error', reason: 'invalid_address' }),
      memorialTakedownApproverEmailDetail({ kind: 'exhausted_three_days' }),
      ...MEMORIAL_TAKEDOWN_APPROVER_EMAIL_RECHECK_REASONS.map((reason) => memorialTakedownApproverEmailDetail({ kind: 'recheck', reason })),
    ];
    for (const d of built) expect(isMemorialTakedownApproverEmailDetail(d), d).toBe(true);
    // An address ⛔ never survives into a detail (a provider message can echo one).
    expect(built.join(' ')).not.toContain('@');
    expect(isMemorialTakedownApproverEmailDetail('no_pariwar_admin')).toBe(false);
    expect(MEMORIAL_TAKEDOWN_APPROVER_EMAIL_PARKED_BY).toBe('sweep:held');
    expect(MEMORIAL_TAKEDOWN_APPROVER_EMAIL_DETAIL_PATTERN).toContain('no_approver');
  });

  it('⭐ MP10 (b) — EVERY distinct eligible approver of EVERY withdrawn approval is due; ⛔ not an approver who left (suspended / no login); ⛔ not a `kept` request', async () => {
    const { client } = getTx();
    const u1 = await staff(client);
    const u2 = await staff(client);
    const gone = await staff(client, { status: 'suspended' });
    const noLogin = await staff(client, { credentials: false });
    const w = await drive([u1, u2, gone, noLogin, u1]);
    const r = await takeDown(w);
    const kept = await drive([u1]);
    await takeDown(kept, 'kept');
    expect(await due([w.pariwarId, kept.pariwarId])).toEqual([[r, u1, false], [r, u2, false]].sort((a, b) => String(a[1]).localeCompare(String(b[1]))));
  });

  it('⭐ MP11 — ⛔ no eligible approver ⇒ the `(request, NULL)` pair; once ANY row exists the request is ⛔ never due again (only an `attempting` row is re-derived)', async () => {
    const { client } = getTx();
    const gone = await staff(client, { status: 'disabled' });
    const w = await drive([gone]);
    const r = await takeDown(w);
    expect(await due([w.pariwarId])).toEqual([[r, null, false]]);
    expect(await beginMemorialTakedownApproverEmail(client, { pariwarId: w.pariwarId, requestId: r, recipientUserId: null, jobId: 'j1', now: new Date() })).toEqual({
      kind: 'no_target',
    });
    expect(await outbox(r)).toEqual([{ recipient_user_id: null, outcome: 'no_target', detail: 'no_approver', claimed_by_job: null }]);
    expect(await due([w.pariwarId])).toEqual([]);
    // A second NULL child ⇒ `already_final`, ⛔ no second row.
    expect((await beginMemorialTakedownApproverEmail(client, { pariwarId: w.pariwarId, requestId: r, recipientUserId: null, jobId: 'j2', now: new Date() })).kind).toBe('already_final');
    expect(await outbox(r)).toHaveLength(1);
  });

  it('the claiming transaction: `begun` (an attempting row) → `held_by_other` for another job inside the lease; the selector re-derives the attempting pair', async () => {
    const { client } = getTx();
    const u1 = await staff(client);
    const w = await drive([u1]);
    const r = await takeDown(w);
    const begun = await beginMemorialTakedownApproverEmail(client, { pariwarId: w.pariwarId, requestId: r, recipientUserId: u1, jobId: 'job-a', now: new Date() });
    expect(begun).toMatchObject({ kind: 'begun', recipientUserId: u1, attemptCount: 1, mayHaveSent: false });
    expect(await outbox(r)).toEqual([{ recipient_user_id: u1, outcome: 'attempting', detail: null, claimed_by_job: 'job-a' }]);
    expect((await beginMemorialTakedownApproverEmail(client, { pariwarId: w.pariwarId, requestId: r, recipientUserId: u1, jobId: 'job-b', now: new Date() })).kind).toBe(
      'held_by_other',
    );
    expect(await due([w.pariwarId])).toEqual([[r, u1, true]]);
  });

  it('⭐ the ONE re-check: a FRESH pair whose approver left ⇒ `not_due` and ⛔ no row; an EXISTING attempting row ⇒ `expired` (`error`, recheck_recipient_not_eligible)', async () => {
    const { client } = getTx();
    const u1 = await staff(client);
    const u2 = await staff(client);
    const w = await drive([u1, u2]);
    const r = await takeDown(w);
    // u1 leaves BEFORE its child runs (fresh pair).
    await client.query(`UPDATE users SET status = 'disabled' WHERE id = $1`, [u1]);
    expect(await beginMemorialTakedownApproverEmail(client, { pariwarId: w.pariwarId, requestId: r, recipientUserId: u1, jobId: 'j', now: new Date() })).toEqual({
      kind: 'not_due',
      reason: 'recipient_not_eligible',
    });
    expect(await outbox(r)).toEqual([]);
    // u2 is claimed, then leaves; a take-over past the lease re-checks and finishes the row `error`.
    const now = new Date();
    expect((await beginMemorialTakedownApproverEmail(client, { pariwarId: w.pariwarId, requestId: r, recipientUserId: u2, jobId: 'j2', now })).kind).toBe('begun');
    await client.query(`DELETE FROM admin_credentials WHERE user_id = $1`, [u2]);
    const later = new Date(now.getTime() + 31 * 60_000);
    expect(await beginMemorialTakedownApproverEmail(client, { pariwarId: w.pariwarId, requestId: r, recipientUserId: u2, jobId: 'j3', now: later })).toEqual({
      kind: 'expired',
      detail: 'exhausted:recheck_recipient_not_eligible',
    });
    expect((await outbox(r))[0]).toMatchObject({ recipient_user_id: u2, outcome: 'error', detail: 'exhausted:recheck_recipient_not_eligible' });
    // A user who was ⛔ never an approver of this request is ⛔ not due, eligible or not.
    const stranger = await staff(client);
    expect((await beginMemorialTakedownApproverEmail(client, { pariwarId: w.pariwarId, requestId: r, recipientUserId: stranger, jobId: 'j4', now })).kind).toBe('not_due');
  });

  it('a NULL pair while an approver IS eligible ⇒ `not_due` (recipients_exist); a request ⛔ not taken down ⇒ `not_due` (not_taken_down)', async () => {
    const { client } = getTx();
    const u1 = await staff(client);
    const w = await drive([u1]);
    const r = await takeDown(w);
    expect(await beginMemorialTakedownApproverEmail(client, { pariwarId: w.pariwarId, requestId: r, recipientUserId: null, jobId: 'j', now: new Date() })).toEqual({
      kind: 'not_due',
      reason: 'recipients_exist',
    });
    const kept = await drive([u1]);
    const rk = await takeDown(kept, 'kept');
    expect(await beginMemorialTakedownApproverEmail(client, { pariwarId: kept.pariwarId, requestId: rk, recipientUserId: u1, jobId: 'j', now: new Date() })).toEqual({
      kind: 'not_due',
      reason: 'not_taken_down',
    });
  });
});
