// Story 11b.4a — the take-down's domain half against the LIVE database (Task 3.4; AC1, AC6, AC7, AC12, AC13; Traps 1, 4, 18,
// 19). Every chain shape of AC7 runs through the REAL writer (`recordMemorialTakedownRequest` → `decideMemorialTakedown`) and is
// read back through the REAL readers: the public pick (`readPublicMemorial`, `readPublicMemorialPhotoTarget`), the family's state
// (`deriveMemorialChainState`), the review queue and the withdraw-approval target.
// Fixtures pin `created_at` / `withdrawn_at` / `decided_at` explicitly in the past, so the `created_at > withdrawn_at` leg never
// rides a same-transaction clock tie ([[project_db_clock_ordering_tests_tie]]). A fresh Pariwar per test (⛔ PARIWAR_A).
// Live DB only — skips when DATABASE_URL is unset. Per-test BEGIN/ROLLBACK (setupLiveDb).

import { randomUUID } from 'node:crypto';

import { sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import type { MemberId, PariwarId, PoolId, UserId } from '../../../src/ids/index.js';
import {
  countOverdueMemorialTakedownRequests,
  decideMemorialTakedown,
  deriveMemorialChainState,
  latestApprovedIndex,
  listMemberMemorialDrives,
  listMemorialReviewQueue,
  listOpenMemorialTakedownRequests,
  memorialWithdrawApprovalTargetId,
  readMemorialChain,
  readMemorialTakedownDrive,
  readPublicMemorial,
  readPublicMemorialPhotoTarget,
  recordMemorialTakedownRequest,
} from '../../../src/memorial/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { enterAppScope, seedClaim, seedMember, seedPool, seedUser } from '../_helpers.js';

type Code = 'A' | 'A-omit' | 'N' | 'pending' | 'F' | 'A(T)';

interface Drive {
  readonly pariwarId: PariwarId;
  readonly memberId: MemberId;
  readonly poolId: PoolId;
  readonly publicToken: string;
  readonly versions: string[];
  readonly operator: UserId;
}

const BASE = Date.parse('2026-09-01T00:00:00Z');
let minute = 0;
const at = (): Date => new Date(BASE + (minute += 1) * 60_000);

/** As the superuser: a deceased member, a claim, a pool (`closed` by default), and the chain `codes`, oldest first. */
async function seedDrive(codes: readonly Code[], opts: { pariwarId?: string; memberId?: string; poolState?: 'closed' | 'spawned'; photo?: boolean } = {}): Promise<Drive> {
  const { tx } = getTx();
  const pariwarId = (opts.pariwarId ?? randomUUID()) as PariwarId;
  const memberId = (opts.memberId ?? (await seedMember(tx, pariwarId, { state: 'active' }))) as MemberId;
  const claimCaseId = await seedClaim(tx, pariwarId, { deceasedMemberId: memberId });
  const poolId = randomUUID() as PoolId;
  const publicToken = `tok-${randomUUID()}`;
  await seedPool(tx, pariwarId, {
    poolId,
    claimCaseId,
    currentState: opts.poolState ?? 'closed',
    poolCanonicalIdentifier: `P-2026-09-${poolId.slice(0, 8)}`,
    publicToken,
  });
  const operator = (await seedUser(tx)) as UserId;
  const drive: Drive = { pariwarId, memberId, poolId, publicToken, versions: [], operator };
  for (const code of codes) await appendVersion(drive, code, { photo: opts.photo });
  return drive;
}

/** Append one version (superseding the head) with its decision / withdrawal, every timestamp pinned. */
async function appendVersion(d: Drive, code: Code, opts: { photo?: boolean; createdAt?: Date } = {}): Promise<string> {
  const { client } = getTx();
  const id = randomUUID();
  const claim = await client.query<{ claim_case_id: string }>(`SELECT claim_case_id FROM pools WHERE pool_id = $1`, [d.poolId]);
  await client.query(
    `INSERT INTO memorial_submissions (submission_id, pariwar_id, pool_id, claim_case_id, deceased_member_id, supersedes_submission_id,
       body_ciphertext, alt_text_ciphertext, photo_object_key, photo_mime, authorisation_copy_version, authorisation_locale,
       handover_recipient, handover_nominee_ref, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, 'enc:v1:body', $7, $8, $9, '2026-10-25.v3-pending-hi-review', 'hi', 'latest', $10, $11)`,
    [
      id,
      d.pariwarId,
      d.poolId,
      claim.rows[0]!.claim_case_id,
      d.memberId,
      d.versions.at(-1) ?? null,
      opts.photo ? 'enc:v1:alt' : null,
      opts.photo ? `pariwar/${d.pariwarId}/memorial/${id}.jpg` : null,
      opts.photo ? 'image/jpeg' : null,
      randomUUID(),
      opts.createdAt ?? at(),
    ],
  );
  const action = code === 'A' || code === 'A(T)' ? 'approved' : code === 'A-omit' ? 'approved_with_omissions' : code === 'N' ? 'not_approved' : null;
  if (action !== null) {
    await client.query(
      `INSERT INTO memorial_review_decisions (submission_id, pariwar_id, action, omissions, reason_code, actor_id, actor_display, decided_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'Panel Member', $7)`,
      [
        id,
        d.pariwarId,
        action,
        action === 'approved_with_omissions' ? '[{"field":"body","start":0,"end":3,"reason":"against_the_law"}]' : '[]',
        action === 'not_approved' ? 'against_the_law' : null,
        randomUUID(),
        at(),
      ],
    );
  }
  if (code === 'F' || code === 'A(T)') {
    await client.query(
      `INSERT INTO memorial_withdrawals (submission_id, pariwar_id, withdrawn_by, reason_code, actor_id, actor_display, withdrawn_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, d.pariwarId, code === 'F' ? 'family' : 'trust', code === 'F' ? null : 'against_the_law', randomUUID(), code === 'F' ? null : 'Panel Member', at()],
    );
  }
  d.versions.push(id);
  return id;
}

const ago = (hours: number): Date => {
  const d = new Date(Date.now() - hours * 3600 * 1000);
  d.setMilliseconds(0);
  return d;
};

async function record(d: Drive) {
  return recordMemorialTakedownRequest(getTx().tx, {
    pariwarId: d.pariwarId,
    poolId: d.poolId,
    firstContactAt: ago(30),
    actorId: d.operator,
    actorDisplay: 'Helpline Operator',
  });
}

async function decide(d: Drive, requestId: string, outcome: 'taken_down' | 'kept' | 'superseded') {
  return decideMemorialTakedown(getTx().tx, { pariwarId: d.pariwarId, requestId, outcome, actorId: d.operator, actorDisplay: 'Helpline Operator' });
}

describe.skipIf(!hasDatabase)('Story 11b.4a — the memorial take-down (domain, live DB)', { timeout: 30000 }, () => {
  setupLiveDb();

  describe('AC7 — every reachable chain shape through the REAL writer (Traps 1, 18)', () => {
    it.each<[string, readonly Code[], number]>([
      ['[A]', ['A'], 0],
      ['[A-omit]', ['A-omit'], 0],
      ['[A-omit, A] — Trap 1', ['A-omit', 'A'], 1],
      ['[N, A]', ['N', 'A'], 1],
      ['[A-omit, pending]', ['A-omit', 'pending'], 0],
      ['[A-omit, not_approved]', ['A-omit', 'N'], 0],
      ['[A-omit, family-withdrawn] — Trap 18', ['A-omit', 'F'], 0],
      ['[A-omit, not_approved, A]', ['A-omit', 'N', 'A'], 2],
      ['[A-omit, trust-withdrawn(A)]', ['A-omit', 'A(T)'], 0],
      ['[A-omit, trust-withdrawn(A), pending]', ['A-omit', 'A(T)', 'pending'], 0],
    ])('%s — the shown version is the request\'s; after `taken_down` NOTHING is shown and the family reads `taken_down`', async (_n, codes, shown) => {
      const d = await seedDrive(codes);
      const { tx, client } = getTx();
      await enterAppScope(client, d.pariwarId);
      const before = await readMemorialChain(tx, d);
      expect(latestApprovedIndex(before)).toBe(shown);
      expect((await readPublicMemorial(tx, d))?.submissionId).toBe(d.versions[shown]);
      const unwithdrawn = before.filter((l) => l.withdrawal === null).map((l) => l.submission.submissionId);

      const req = await record(d);
      expect(req.ok).toBe(true);
      if (!req.ok) return;
      expect(req.request.submissionId).toBe(d.versions[shown]);
      expect(req.request.dueAt.getTime() - req.request.firstContactAt.getTime()).toBe(7 * 24 * 3600 * 1000);
      const out = await decide(d, req.request.requestId, 'taken_down');
      expect(out.ok).toBe(true);
      if (!out.ok) return;
      // MP8 (a) — EVERY version without a withdrawal got one; ⛔ none other.
      expect([...out.withdrawnSubmissionIds].sort()).toEqual([...unwithdrawn].sort());

      const after = await readMemorialChain(tx, d);
      expect(latestApprovedIndex(after)).toBe(-1);
      expect(deriveMemorialChainState(after)).toBe('taken_down');
      expect(memorialWithdrawApprovalTargetId(after)).toBeNull();
      expect(await readPublicMemorial(tx, d)).toBeNull();
      expect(await readPublicMemorialPhotoTarget(tx, d.pariwarId, d.publicToken)).toBeNull();
      for (const l of after.filter((x) => unwithdrawn.includes(x.submission.submissionId))) {
        expect(l.withdrawal).toMatchObject({ withdrawnBy: 'helpline', reasonCode: null, internalNoteCiphertext: null, takedownRequestId: req.request.requestId });
      }
    });

    it('`[A(T)]` — nothing is shown ⇒ the request is the neutral `not_found`', async () => {
      const d = await seedDrive(['A(T)']);
      await enterAppScope(getTx().client, d.pariwarId);
      expect(await record(d)).toEqual({ ok: false, refusal: 'not_found' });
    });

    it('a re-send after a take-down `[H, H, A′]` shows A′; a SECOND take-down takes it down again; `[H, F′]` derives `withdrawn`', async () => {
      const d = await seedDrive(['A-omit', 'A']);
      const { tx, client } = getTx();
      await enterAppScope(client, d.pariwarId);
      const r1 = await record(d);
      if (!r1.ok) throw new Error('record');
      expect((await decide(d, r1.request.requestId, 'taken_down')).ok).toBe(true);
      // The nominee writes again AFTER the take-down (created_at > withdrawn_at); the Trust approves.
      await client.query('RESET ROLE');
      await appendVersion(d, 'A', { createdAt: new Date(Date.now() + 60_000) });
      await enterAppScope(client, d.pariwarId);
      let chain = await readMemorialChain(tx, d);
      expect(latestApprovedIndex(chain)).toBe(2);
      expect(deriveMemorialChainState(chain)).toBe('approved');
      const r2 = await record(d);
      if (!r2.ok) throw new Error('record 2');
      expect(r2.request.submissionId).toBe(d.versions[2]);
      const out2 = await decide(d, r2.request.requestId, 'taken_down');
      expect(out2.ok && out2.withdrawnSubmissionIds).toEqual([d.versions[2]]);
      chain = await readMemorialChain(tx, d);
      expect(deriveMemorialChainState(chain)).toBe('taken_down');

      await client.query('RESET ROLE');
      const e = await seedDrive(['A']);
      await enterAppScope(client, e.pariwarId);
      const r3 = await record(e);
      if (!r3.ok) throw new Error('record 3');
      await decide(e, r3.request.requestId, 'taken_down');
      await client.query('RESET ROLE');
      await appendVersion(e, 'F', { createdAt: new Date(Date.now() + 60_000) });
      await enterAppScope(client, e.pariwarId);
      expect(deriveMemorialChainState(await readMemorialChain(tx, e))).toBe('withdrawn');
    });
  });

  describe('AC6 / AC7 — the request and its outcome', () => {
    it('one open request per drive (`request_open`); `kept` closes it and changes nothing public; a new request may follow', async () => {
      const d = await seedDrive(['A-omit']);
      const { tx, client } = getTx();
      await enterAppScope(client, d.pariwarId);
      const r1 = await record(d);
      if (!r1.ok) throw new Error('record');
      expect(await record(d)).toEqual({ ok: false, refusal: 'request_open' });
      const kept = await decide(d, r1.request.requestId, 'kept');
      expect(kept.ok && kept.withdrawnSubmissionIds).toEqual([]);
      expect((await readPublicMemorial(tx, d))?.submissionId).toBe(d.versions[0]);
      expect(await decide(d, r1.request.requestId, 'taken_down')).toEqual({ ok: false, refusal: 'already_decided' });
      expect((await record(d)).ok).toBe(true);
    });

    it('MP8 (c): the shown version changed between request and outcome ⇒ `taken_down` is `shown_changed` and `superseded` closes it; unchanged ⇒ `superseded` is `shown_unchanged`', async () => {
      const d = await seedDrive(['A-omit']);
      const { tx, client } = getTx();
      await enterAppScope(client, d.pariwarId);
      const r = await record(d);
      if (!r.ok) throw new Error('record');
      expect(await decide(d, r.request.requestId, 'superseded')).toEqual({ ok: false, refusal: 'shown_unchanged' });
      // A newer version is approved meanwhile (possibly under another nominee).
      await client.query('RESET ROLE');
      await appendVersion(d, 'A', { createdAt: new Date(Date.now() + 60_000) });
      await enterAppScope(client, d.pariwarId);
      expect(await decide(d, r.request.requestId, 'taken_down')).toEqual({ ok: false, refusal: 'shown_changed' });
      const sup = await decide(d, r.request.requestId, 'superseded');
      expect(sup.ok && sup.withdrawnSubmissionIds).toEqual([]);
      expect((await readPublicMemorial(tx, d))?.submissionId).toBe(d.versions[1]);
    });

    it('an unknown request is `not_found`; the open list is oldest first and carries the drive identifier', async () => {
      const d = await seedDrive(['A']);
      const e = await seedDrive(['A'], { pariwarId: d.pariwarId });
      const { tx, client } = getTx();
      await enterAppScope(client, d.pariwarId);
      expect(await decide(d, randomUUID(), 'kept')).toEqual({ ok: false, refusal: 'not_found' });
      const rd = await recordMemorialTakedownRequest(tx, { pariwarId: d.pariwarId, poolId: d.poolId, firstContactAt: ago(10), actorId: d.operator, actorDisplay: 'Op' });
      const re = await recordMemorialTakedownRequest(tx, { pariwarId: e.pariwarId, poolId: e.poolId, firstContactAt: ago(40), actorId: e.operator, actorDisplay: 'Op' });
      if (!rd.ok || !re.ok) throw new Error('record');
      const open = await listOpenMemorialTakedownRequests(tx, { pariwarId: d.pariwarId });
      expect(open.map((o) => o.request.requestId)).toEqual([re.request.requestId, rd.request.requestId]);
      expect(open[0]!.poolCanonicalIdentifier).toBe(`P-2026-09-${e.poolId.slice(0, 8)}`);
    });

    it('MP14 — the overdue count per Pariwar (cross-tenant) counts OPEN requests past `due_at` only', async () => {
      const d = await seedDrive(['A']);
      const { client } = getTx();
      const r = randomUUID();
      // As the superuser: a request recorded 9 days ago, first contact 10 days ago ⇒ due 3 days ago.
      await client.query(
        `INSERT INTO memorial_takedown_requests (request_id, pariwar_id, pool_id, submission_id, handover_nominee_ref, verified_by, first_contact_at, received_at, due_at, actor_id, actor_display)
         VALUES ($1, $2, $3, $4, $5, 'called_back', $6, $7, $6::timestamptz + interval '168 hours', $8, 'Op')`,
        [r, d.pariwarId, d.poolId, d.versions[0], randomUUID(), ago(240), ago(216), d.operator],
      );
      expect(await countOverdueMemorialTakedownRequests(client, { now: new Date(), allow: [d.pariwarId] })).toEqual([{ pariwarId: d.pariwarId, count: 1 }]);
      await client.query(`INSERT INTO memorial_takedown_outcomes (request_id, pariwar_id, outcome, actor_id, actor_display) VALUES ($1, $2, 'kept', $3, 'Op')`, [r, d.pariwarId, d.operator]);
      expect(await countOverdueMemorialTakedownRequests(client, { now: new Date(), allow: [d.pariwarId] })).toEqual([]);
    });
  });

  describe('MP12 / AC13 — finding the memorial, and erasure', () => {
    it('the member\'s drives with a SHOWN memorial only; after a take-down the drive leaves the list but its history stays readable', async () => {
      const d = await seedDrive(['A']);
      const none = await seedDrive(['A(T)'], { pariwarId: d.pariwarId, memberId: d.memberId });
      const { tx, client } = getTx();
      await enterAppScope(client, d.pariwarId);
      expect((await listMemberMemorialDrives(tx, d)).map((x) => x.poolId)).toEqual([d.poolId]);
      expect(await readMemorialTakedownDrive(tx, { pariwarId: d.pariwarId, poolId: none.poolId })).toBeNull();
      const r = await record(d);
      if (!r.ok) throw new Error('record');
      expect((await listMemberMemorialDrives(tx, d))[0]?.hasOpenRequest).toBe(true);
      await decide(d, r.request.requestId, 'taken_down');
      expect(await listMemberMemorialDrives(tx, d)).toEqual([]);
      const view = await readMemorialTakedownDrive(tx, d);
      expect(view?.shown).toBeNull();
      expect(view?.requests.map((x) => x.outcome?.outcome)).toEqual(['taken_down']);
    });

    it('Trap 4 — an ERASED deceased: ⛔ listed, the drive view `null`, the request `not_found`, the photo route `null`', async () => {
      const d = await seedDrive(['A'], { photo: true });
      const { tx, client } = getTx();
      await enterAppScope(client, d.pariwarId);
      expect(await readPublicMemorialPhotoTarget(tx, d.pariwarId, d.publicToken)).toMatchObject({ mime: 'image/jpeg' });
      await client.query('RESET ROLE');
      await tx.execute(sql.raw("SET LOCAL app.member_state_writer = 'on'"));
      await client.query(`UPDATE members SET state = 'anonymized' WHERE member_id = $1`, [d.memberId]);
      await enterAppScope(client, d.pariwarId);
      expect(await listMemberMemorialDrives(tx, d)).toEqual([]);
      expect(await readMemorialTakedownDrive(tx, d)).toBeNull();
      expect(await record(d)).toEqual({ ok: false, refusal: 'not_found' });
      expect(await readPublicMemorialPhotoTarget(tx, d.pariwarId, d.publicToken)).toBeNull();
    });
  });

  describe('MP2 / MP4 — the public reads (AC1, Trap 19)', () => {
    it('`[A-omit, pending]` shows v1 with its omissions — ⛔ keyed on the head; a photo the Trust left out is ⛔ public; a hidden pool or an unknown token is `null`', async () => {
      const d = await seedDrive(['A-omit', 'pending'], { photo: true });
      const hidden = await seedDrive(['A'], { pariwarId: d.pariwarId, photo: true, poolState: 'spawned' });
      const { tx, client } = getTx();
      await client.query(`UPDATE memorial_review_decisions SET photo_left_out_reason = NULL WHERE submission_id = $1`, [d.versions[0]]);
      await enterAppScope(client, d.pariwarId);
      const shown = await readPublicMemorial(tx, d);
      expect(shown?.submissionId).toBe(d.versions[0]);
      expect(shown?.omissions).toEqual([{ field: 'body', start: 0, end: 3, reason: 'against_the_law' }]);
      expect(shown?.photo?.objectKey).toContain(d.versions[0]);
      expect(await readPublicMemorialPhotoTarget(tx, d.pariwarId, d.publicToken)).toEqual(shown?.photo);
      expect(await readPublicMemorialPhotoTarget(tx, d.pariwarId, hidden.publicToken)).toBeNull();
      expect(await readPublicMemorialPhotoTarget(tx, d.pariwarId, 'no-such-token')).toBeNull();
      await client.query('RESET ROLE');
      await client.query(`UPDATE memorial_review_decisions SET photo_left_out_reason = 'identifies_a_child' WHERE submission_id = $1`, [d.versions[0]]);
      await enterAppScope(client, d.pariwarId);
      expect((await readPublicMemorial(tx, d))?.photo).toBeNull();
      expect(await readPublicMemorialPhotoTarget(tx, d.pariwarId, d.publicToken)).toBeNull();
    });
  });

  describe('AC12 — the review surface', () => {
    it('a `helpline`-withdrawn head is ⛔ pending, IS decided (withdrawnBy `helpline`), and the withdraw-approval target skips it', async () => {
      const d = await seedDrive(['A-omit', 'pending']);
      const { tx, client } = getTx();
      await enterAppScope(client, d.pariwarId);
      expect((await listMemorialReviewQueue(tx, { pariwarId: d.pariwarId, view: 'pending', limit: 50 })).rows.map((r) => r.submissionId)).toEqual([d.versions[1]]);
      const r = await record(d);
      if (!r.ok) throw new Error('record');
      await decide(d, r.request.requestId, 'taken_down');
      expect((await listMemorialReviewQueue(tx, { pariwarId: d.pariwarId, view: 'pending', limit: 50 })).rows).toEqual([]);
      const decided = (await listMemorialReviewQueue(tx, { pariwarId: d.pariwarId, view: 'decided', limit: 50 })).rows;
      expect(decided.map((x) => [x.submissionId, x.withdrawnBy])).toEqual([[d.versions[1], 'helpline']]);
      expect(memorialWithdrawApprovalTargetId(await readMemorialChain(tx, d))).toBeNull();
    });
  });
});
