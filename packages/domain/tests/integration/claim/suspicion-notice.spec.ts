// Story 6.24b — the SUSPICION NOTICES' domain half, live DB (:5433). `2026-10-08-295` RB2, RB3, RB7, RB10, RB13, RB15, RB18.
//
//   · the three selectors (RB10) — the predicate, "⛔ FINISHED row" (⛔ "⛔ row"), a claim with an `attempting` row ALWAYS
//     returned, (b) by the EVENT's trigger (⛔ the state alone), (c)'s prefilter + the TS 90 days, `allow`, the page cap;
//   · the locked re-check and RB10's ONE rule AS AMENDED BY `2026-10-09-297` §2 (a FRESH claim ⇒ ⛔ row; ANY existing
//     `attempting` row ⇒ `error` / `exhausted:recheck_<reason>` — a NULL `detail` too, ⛔ `skipped_superseded`; another
//     job's row past the lease taken over, within it `held_by_other`; the lease ± 1 ms); once-ever; the give-up's lease
//     guard; (c) after an UPHELD appeal and a revision away and back ⇒ ⛔ text. The TRUE two-connection races are in
//     `suspicion-notice-concurrency.spec.ts`;
//   · the recipients — (a) RF9's rank 1; (b) RB15's as-of read (the half-open boundary, a later re-determination of S, a
//     corrected entry's chain head, ⛔ effective ⇒ a finished `no_target` row) and RB18's exclusion under the lock; (c)
//     RB7's refused filer on both claimant sides, a corrected head and a FORKED chain, ⛔ contact ⇒ unresolved.
// Every refusal / appeal stage through 6.24a's fixtures (the REAL writers — Trap 19).

import { randomUUID } from 'node:crypto';

import { and, eq, sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import {
  CORRECTION_SEND_LEASE_MS,
  SUSPICION_NOTICE_PAGE_CAP,
  beginSuspicionNotice,
  expireExhaustedSuspicionNotices,
  finaliseSuspicionNotice,
  getEffectiveNomineeDeclarationAsOf,
  noteSuspicionNoticeTransient,
  projectClaimState,
  readRefusedFilerRecipient,
  selectDueSuspicionNotices,
  suspicionNoticeReclaimCutoff,
  suspicionRefusalAppealUntil,
} from '../../../src/claim/index.js';
import { bindScopedDb } from '../../../src/db.js';
import { claimId as toClaimId, memberId as toMemberId, pariwarId as toPariwarId, type ClaimId } from '../../../src/ids/index.js';
import { listNomineeDeclarationVersions } from '../../../src/nominee/declaration-history.js';
import * as schema from '../../../src/schema/index.js';
import type { SuspicionNoticePurpose } from '../../../src/schema/claim_suspicion_notices.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import {
  PARIWAR_A,
  PARIWAR_B,
  driveClaimTo,
  enterAppScope,
  seedClaim,
  seedNomineeDeclaration,
} from '../_helpers.js';
import { appealAtStage, openAppeal, refusedClaim, reverseAtStage1, seedAppealPanel, stage3 } from './_suspicion-refusal-fixtures.js';

type Client = ReturnType<typeof getTx>['client'];

const DAY = 86_400_000;
const pid = toPariwarId(PARIWAR_A);
const ALLOW = [PARIWAR_A];
const PRE_DEATH = Date.parse('2026-05-01T00:00:00Z');

/** Every due claim id of `purpose` (all pages), as the sweep sees them (superuser = the BYPASSRLS pool). */
async function dueIds(client: Client, purpose: SuspicionNoticePurpose, allow: readonly string[] | null = ALLOW): Promise<Map<string, boolean>> {
  const out = new Map<string, boolean>();
  let after: string | null = null;
  for (;;) {
    const page = await selectDueSuspicionNotices(client, { purpose, after, limit: SUSPICION_NOTICE_PAGE_CAP, allow });
    for (const d of page.due) out.set(d.claimCaseId, d.hasAttemptingRow);
    if (page.scanned < SUSPICION_NOTICE_PAGE_CAP || page.lastClaimCaseId === null) break;
    after = page.lastClaimCaseId;
  }
  return out;
}

/** Run the claiming transaction under the app role + scope (production's RLS), then back to the superuser. */
async function begin(client: Client, cid: string, purpose: SuspicionNoticePurpose, opts: { jobId?: string; now?: Date } = {}) {
  await enterAppScope(client, PARIWAR_A);
  try {
    return await beginSuspicionNotice(client, {
      pariwarId: pid,
      claimCaseId: cid as ClaimId,
      purpose,
      jobId: opts.jobId ?? 'job-1',
      now: opts.now ?? new Date(),
    });
  } finally {
    await client.query('RESET ROLE');
  }
}

async function noticeOf(client: Client, cid: string, purpose: SuspicionNoticePurpose) {
  const { rows } = await client.query<{ outcome: string; detail: string | null; first_detail: string | null; attempt_count: number; claimed_by_job: string | null }>(
    `SELECT outcome, detail, first_detail, attempt_count, claimed_by_job FROM claim_suspicion_notices WHERE claim_case_id = $1 AND purpose = $2`,
    [cid, purpose],
  );
  return rows;
}

async function attemptingRow(client: Client, cid: string, purpose: SuspicionNoticePurpose, opts: { job?: string; claimedAt?: Date; detail?: string | null; createdAt?: Date } = {}) {
  await client.query(
    `INSERT INTO claim_suspicion_notices (pariwar_id, claim_case_id, purpose, outcome, claimed_at, claimed_by_job, detail, created_at)
     VALUES ($1, $2, $3, 'attempting', $4, $5, $6, $7)`,
    [PARIWAR_A, cid, purpose, opts.claimedAt ?? new Date(), opts.job ?? 'job-1', opts.detail ?? null, opts.createdAt ?? new Date()],
  );
}

/** Revise S's live decision OFF `-239` (supersede + a new live row with another reason). */
async function reviseOff(client: Client, cid: string): Promise<void> {
  const { rows } = await client.query<{ decision_id: string }>(
    `UPDATE claim_verifier_decisions SET superseded_at = clock_timestamp() WHERE claim_case_id = $1 AND superseded_at IS NULL RETURNING decision_id`,
    [cid],
  );
  await client.query(
    `INSERT INTO claim_verifier_decisions (claim_case_id, pariwar_id, outcome, reason_code, rationale_ciphertext, actor_id, actor_display, supersedes_decision_id)
     VALUES ($1, $2, 'denied', 'other', 'enc:v1:r', $3, 'Anita (District Admin)', $4)`,
    [cid, PARIWAR_A, randomUUID(), rows[0]!.decision_id],
  );
}

/** The death's versions: v1 = pre-death, v2 = post-death (6.24a's grounding fixture). */
async function versionsOf(mid: string) {
  const all = await listNomineeDeclarationVersions(getTx().tx, pid, toMemberId(mid));
  const v1 = all.find((v) => v.effectiveAt.getTime() < PRE_DEATH)!;
  const v2 = all.find((v) => v.effectiveAt.getTime() > PRE_DEATH && v.correctsVersionId === null)!;
  return { all, v1: v1.versionId as string, v2: v2.versionId as string };
}

/** A 6.20 CORRECTION version of `target` (the claim-contact spec's shape) — ⛔ determination superseded here. */
async function correctionOf(mid: string, target: string, mobile: string): Promise<string> {
  const { tx } = getTx();
  const versions = await listNomineeDeclarationVersions(tx, pid, toMemberId(mid));
  const t = versions.find((v) => v.versionId === target)!;
  const head = Math.max(...versions.filter((v) => v.rank === t.rank).map((v) => v.versionNo));
  const [row] = await tx
    .insert(schema.memberNomineeVersions)
    .values({
      memberId: toMemberId(mid),
      pariwarId: pid,
      rank: t.rank,
      versionNo: head + 1,
      declarationId: randomUUID(),
      kind: 'declared',
      source: 'correction',
      nameCiphertext: 'enc:v1:corrected-name',
      relationship: t.relationship,
      mobileCiphertext: mobile,
      addressCiphertext: null,
      splitPct: t.splitPct,
      recordedAt: new Date(),
      effectiveAt: t.effectiveAt,
      correctsVersionId: t.versionId,
    })
    .returning();
  return row!.versionId as string;
}

/** A contact record for `cid`: a nominee-claimant linked to `claimantVersionId`, or the claimant block. */
async function contact(client: Client, cid: string, mid: string, opts: { claimantVersionId?: string | null; locale?: 'hi' | 'en' } = {}) {
  const tx = bindScopedDb(client);
  const [agreement] = await tx
    .insert(schema.consentRecords)
    .values({
      subjectId: toMemberId(mid),
      pariwarId: pid,
      consentType: 'claim_contact_agreement',
      consentArtifactRef: cid,
      grantedViaActor: 'member_self',
      consentPayload: { checkboxTextShown: 'fixture', locale: 'en' },
      grantedAt: new Date(Date.now() - 60_000),
    })
    .returning({ consentId: schema.consentRecords.consentId });
  const linked = opts.claimantVersionId ?? null;
  await tx.insert(schema.claimContacts).values({
    claimCaseId: toClaimId(cid),
    pariwarId: pid,
    deceasedMemberId: toMemberId(mid),
    claimantNomineeVersionId: linked as never,
    claimantNameCiphertext: linked === null ? 'enc:v1:claimant-name' : null,
    claimantMobileCiphertext: linked === null ? 'enc:v1:claimant-mobile' : null,
    claimantAddressCiphertext: linked === null ? 'enc:v1:claimant-address' : null,
    agreementConsentId: agreement!.consentId,
    contactLocale: opts.locale ?? 'hi',
    recordedByActor: 'fixture',
    recordedVia: 'member_app',
  });
}

/** Drive a NEW claim of the death to `documents_pending` (`driveClaimTo` stops at `intake_pending`) — events only. */
async function documentsPending(client: Client, mid: string): Promise<ClaimId> {
  const cid = toClaimId(randomUUID());
  await driveClaimTo(client, PARIWAR_A, cid, mid, 'intake_pending');
  for (const [from, to, eventType] of [
    ['intake_pending', 'intake_converged', 'claim.intake_converged'],
    ['intake_converged', 'documents_pending', 'claim.documents_received'],
  ] as const) {
    await projectClaimState(client, {
      claimCaseId: cid,
      pariwarId: pid,
      deceasedMemberId: toMemberId(mid),
      intakeChannels: ['member_app'],
      claimantActorId: null,
      eventType,
      payload: { from_state: from, to_state: to, trigger: 'test', actor: 'system' } as never,
      actorId: null,
    });
  }
  return cid;
}

/** The exact `timestamptz` text of `expr` (microseconds kept — a JS `Date` truncates them). */
async function instant(client: Client, expr: string, params: unknown[] = []): Promise<string> {
  const { rows } = await client.query<{ t: string }>(
    `SELECT to_char((${expr}) AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS t`,
    params,
  );
  return rows[0]!.t;
}

/**
 * Re-determine S at a LATER instant (`now() + 1 minute`): every `now()` of one test transaction TIES, so the real writer
 * would stamp the supersession AT the closure's own instant. A raw supersession + a new live row with `marks` (the
 * subject here is the AS-OF read, ⛔ the writer — 6.20's specs prove it). Returns the supersession instant (exact text).
 */
async function redetermineLater(client: Client, s: string, marks: readonly { versionId: string; mark: 'stands' | 'discarded' }[]): Promise<string> {
  const at = await instant(client, `now() + interval '1 minute'`);
  const { rows } = await client.query<{ determination_id: string }>(
    `UPDATE nominee_determinations SET superseded_at = $2::timestamptz, superseded_reason = 'redetermined'
      WHERE claim_case_id = $1 AND superseded_at IS NULL RETURNING determination_id`,
    [s, at],
  );
  const { rows: fresh } = await client.query<{ determination_id: string }>(
    `INSERT INTO nominee_determinations (claim_case_id, pariwar_id, deceased_member_id, certificate_date_ciphertext, note_ciphertext,
       decided_by_actor_id, decided_by_display, decided_at, supersedes_determination_id)
     SELECT claim_case_id, pariwar_id, deceased_member_id, certificate_date_ciphertext, note_ciphertext, decided_by_actor_id,
            decided_by_display, $2::timestamptz, determination_id
       FROM nominee_determinations WHERE determination_id = $1
     RETURNING determination_id`,
    [rows[0]!.determination_id, at],
  );
  for (const m of marks) {
    await client.query(
      `INSERT INTO nominee_determination_items (determination_id, version_id, pariwar_id, mark) VALUES ($1, $2, $3, $4)`,
      [fresh[0]!.determination_id, m.versionId, PARIWAR_A, m.mark],
    );
  }
  return at;
}

/** R in `documents_pending` (⛔ determination of its own) CLOSED by S's allowed appeal; S grounded (v1 stands, v2 discarded). */
async function closedR(client: Client, opts: { groundS?: boolean } = {}) {
  const mid = randomUUID();
  if (opts.groundS === false) {
    await seedNomineeDeclaration(getTx().tx, PARIWAR_A, mid, { declaredAt: new Date('2026-01-10T06:00:00.000Z') });
    await seedNomineeDeclaration(getTx().tx, PARIWAR_A, mid, { declaredAt: new Date('2026-06-01T06:00:00.000Z'), ensureMember: false });
  }
  const s = await refusedClaim(client, PARIWAR_A, mid, { ground: opts.groundS !== false });
  const r = await documentsPending(client, mid);
  await openAppeal(client, PARIWAR_A, s);
  await reverseAtStage1(client, PARIWAR_A, s);
  return { mid, s, r };
}

describe.skipIf(!hasDatabase)('Story 6.24b — the suspicion notices, domain (:5433)', { timeout: 30000 }, () => {
  setupLiveDb();

  // ── the selectors ───────────────────────────────────────────────────────────────────────────────────────────────
  describe('RB10 — the selectors', () => {
    it('(a) a standing refusal is due; a reversed one is ⛔; a FINISHED row ⇒ ⛔; an `attempting` row ⇒ ALWAYS (predicate bypassed)', async () => {
      const { client } = getTx();
      const standing = await refusedClaim(client, PARIWAR_A, randomUUID(), { ground: true });
      const finished = await refusedClaim(client, PARIWAR_A, randomUUID(), { ground: true });
      await client.query(`INSERT INTO claim_suspicion_notices (pariwar_id, claim_case_id, purpose, outcome) VALUES ($1, $2, 'suspicion_refusal', 'accepted')`, [PARIWAR_A, finished]);
      const reversedMid = randomUUID();
      const reversed = await refusedClaim(client, PARIWAR_A, reversedMid, { ground: true });
      await openAppeal(client, PARIWAR_A, reversed);
      await reverseAtStage1(client, PARIWAR_A, reversed);
      const stranded = await refusedClaim(client, PARIWAR_A, randomUUID(), { ground: true });
      await reviseOff(client, stranded);
      await attemptingRow(client, stranded, 'suspicion_refusal');
      const crashed = await refusedClaim(client, PARIWAR_A, randomUUID(), { ground: true });
      await attemptingRow(client, crashed, 'suspicion_refusal');
      const due = await dueIds(client, 'suspicion_refusal');
      expect(due.get(crashed)).toBe(true);
      expect(due.get(standing)).toBe(false);
      expect(due.has(finished)).toBe(false);
      expect(due.has(reversed)).toBe(false);
      expect(due.get(stranded)).toBe(true);
    });

    it('(b) a claim CLOSED by the appeal trigger is due; a `closed` state with ⛔ such event is ⛔ (F25); the reversed S is ⛔', async () => {
      const { client, tx } = getTx();
      const { s, r } = await closedR(client);
      const fake = await seedClaim(tx, PARIWAR_A, { currentState: 'closed' });
      const due = await dueIds(client, 'closed_after_appeal');
      expect(due.get(r)).toBe(false);
      expect(due.has(fake)).toBe(false);
      expect(due.has(s)).toBe(false);
    });

    it('(c) within 90 days + ⛔ appeal ⇒ due; an appeal filed ⇒ ⛔ (prefilter); 100 days ago ⇒ ⛔ (TS 90 days); 89 days ⇒ due', async () => {
      const { client } = getTx();
      const fresh = await refusedClaim(client, PARIWAR_A, randomUUID());
      const appealed = await refusedClaim(client, PARIWAR_A, randomUUID());
      await openAppeal(client, PARIWAR_A, appealed);
      const passed = await refusedClaim(client, PARIWAR_A, randomUUID(), { decidedAt: new Date(Date.now() - 100 * DAY) });
      const nearly = await refusedClaim(client, PARIWAR_A, randomUUID(), { decidedAt: new Date(Date.now() - 89 * DAY) });
      const due = await dueIds(client, 'refusal_appeal_notice');
      expect(due.get(fresh)).toBe(false);
      expect(due.has(appealed)).toBe(false);
      expect(due.has(passed)).toBe(false);
      expect(due.get(nearly)).toBe(false);
      // ⭐ …but an `attempting` row bypasses the 90 days and the prefilter (so the lock can finish it).
      await attemptingRow(client, passed, 'refusal_appeal_notice');
      expect((await dueIds(client, 'refusal_appeal_notice')).get(passed)).toBe(true);
    });

    it('`allow` narrows to the listed Pariwars (F31)', async () => {
      const { client } = getTx();
      const s = await refusedClaim(client, PARIWAR_A, randomUUID(), { ground: true });
      expect((await dueIds(client, 'suspicion_refusal', [PARIWAR_B])).has(s)).toBe(false);
      expect((await dueIds(client, 'suspicion_refusal', null)).has(s)).toBe(true);
    });

    it('the page cap — a raw-SQL `LIMIT` the AST gate cannot see is CLAMPED (5000 ⇒ 1000), and the keyset pages', async () => {
      const seen: string[] = [];
      const fake = { query: async (text: string) => (seen.push(text), { rows: [] }) } as never;
      await selectDueSuspicionNotices(fake, { purpose: 'suspicion_refusal', after: null, limit: 5000, allow: null });
      expect(seen[0]).toMatch(/LIMIT 1000\b/);
      const { client } = getTx();
      const a = await refusedClaim(client, PARIWAR_A, randomUUID(), { ground: true });
      const b = await refusedClaim(client, PARIWAR_A, randomUUID(), { ground: true });
      // Page ONE claim at a time to the end: every page holds one, the cursor strictly rises, and BOTH claims are seen.
      const seenIds: string[] = [];
      let after: string | null = null;
      for (;;) {
        const page = await selectDueSuspicionNotices(client, { purpose: 'suspicion_refusal', after, limit: 1, allow: ALLOW });
        if (page.lastClaimCaseId === null) break;
        expect(page.scanned).toBe(1);
        if (after !== null) expect(page.lastClaimCaseId > after).toBe(true);
        seenIds.push(...page.due.map((d) => d.claimCaseId as string));
        after = page.lastClaimCaseId;
      }
      expect(seenIds).toEqual(expect.arrayContaining([a, b]));
      expect(new Set(seenIds).size).toBe(seenIds.length);
    });
  });

  // ── the locked re-check + RB10's one rule ───────────────────────────────────────────────────────────────────────
  describe('RB10 — the claiming transaction and the ONE re-check rule', () => {
    it('⭐ (a) begun: the rank-1 EFFECTIVE version (pre-death), its OWN mobile, Hindi; a second begin by another job ⇒ held_by_other; finished ⇒ already_final', async () => {
      const { client } = getTx();
      const mid = randomUUID();
      const s = await refusedClaim(client, PARIWAR_A, mid, { ground: true });
      const { v1 } = await versionsOf(mid);
      const begun = await begin(client, s, 'suspicion_refusal');
      expect(begun).toMatchObject({
        kind: 'begun',
        attemptCount: 1,
        deceasedMemberId: mid,
        locale: 'hi',
        appealUntil: null,
        recipient: { versionId: v1, mobileCiphertext: 'enc:v1:nominee-mobile-1', source: 'member_nominee', unresolved: null },
      });
      expect(await begin(client, s, 'suspicion_refusal', { jobId: 'job-2' })).toEqual({ kind: 'held_by_other' });
      // The SAME job's retry re-claims its own row at once.
      expect(await begin(client, s, 'suspicion_refusal')).toMatchObject({ kind: 'begun', attemptCount: 2 });
      const db = bindScopedDb(client);
      expect(await finaliseSuspicionNotice(db, { pariwarId: pid, noticeId: (begun as { noticeId: string }).noticeId, jobId: 'job-2', outcome: 'accepted' })).toBe(false);
      expect(await finaliseSuspicionNotice(db, { pariwarId: pid, noticeId: (begun as { noticeId: string }).noticeId, jobId: 'job-1', outcome: 'accepted', recipientVersionId: v1, recipientNumberHash: 'h' })).toBe(true);
      expect(await begin(client, s, 'suspicion_refusal', { jobId: 'job-3' })).toEqual({ kind: 'already_final' });
      expect(await noticeOf(client, s, 'suspicion_refusal')).toEqual([
        { outcome: 'accepted', detail: null, first_detail: null, attempt_count: 2, claimed_by_job: 'job-1' },
      ]);
    });

    it('(a) a determination ⛔ effective ⇒ begun with an UNRESOLVED recipient (the child records `no_target`)', async () => {
      const { client } = getTx();
      const s = await refusedClaim(client, PARIWAR_A, randomUUID());
      expect(await begin(client, s, 'suspicion_refusal')).toMatchObject({
        kind: 'begun',
        recipient: { versionId: null, mobileCiphertext: null, unresolved: 'not_effective' },
      });
    });

    it('⭐ a refusal revised away between selection and the lock ⇒ `not_due`, ⛔ row written (a FRESH claim)', async () => {
      const { client } = getTx();
      const s = await refusedClaim(client, PARIWAR_A, randomUUID(), { ground: true });
      expect((await dueIds(client, 'suspicion_refusal')).has(s)).toBe(true);
      await reviseOff(client, s);
      expect(await begin(client, s, 'suspicion_refusal')).toEqual({ kind: 'not_due' });
      expect(await noticeOf(client, s, 'suspicion_refusal')).toEqual([]);
    });

    it('⭐ `-297` §2 — own `attempting` row whose re-check fails ⇒ ALWAYS `error` / `exhausted:recheck_…` — a NULL detail too (a crash after the gateway\'s accept leaves it NULL)', async () => {
      const { client } = getTx();
      const quiet = await refusedClaim(client, PARIWAR_A, randomUUID(), { ground: true });
      await reviseOff(client, quiet);
      await attemptingRow(client, quiet, 'suspicion_refusal');
      expect(await begin(client, quiet, 'suspicion_refusal')).toEqual({ kind: 'expired', detail: 'exhausted:recheck_not_standing' });
      expect(await noticeOf(client, quiet, 'suspicion_refusal')).toMatchObject([{ outcome: 'error', detail: 'exhausted:recheck_not_standing', first_detail: null }]);

      const tried = await refusedClaim(client, PARIWAR_A, randomUUID(), { ground: true });
      await reviseOff(client, tried);
      await attemptingRow(client, tried, 'suspicion_refusal', { detail: 'api_unavailable:timeout' });
      expect(await begin(client, tried, 'suspicion_refusal')).toEqual({ kind: 'expired', detail: 'exhausted:recheck_not_standing' });
      expect(await noticeOf(client, tried, 'suspicion_refusal')).toMatchObject([
        { outcome: 'error', detail: 'exhausted:recheck_not_standing', first_detail: 'api_unavailable:timeout' },
      ]);
    });

    it('⭐ another job\'s row: WITHIN the lease ⇒ held_by_other (even on a failed re-check); PAST it ⇒ taken over and judged', async () => {
      const { client } = getTx();
      const now = new Date();
      const within = await refusedClaim(client, PARIWAR_A, randomUUID(), { ground: true });
      await reviseOff(client, within);
      await attemptingRow(client, within, 'suspicion_refusal', { job: 'other', claimedAt: new Date(now.getTime() - CORRECTION_SEND_LEASE_MS) });
      expect(await begin(client, within, 'suspicion_refusal', { now })).toEqual({ kind: 'held_by_other' });

      const past = await refusedClaim(client, PARIWAR_A, randomUUID(), { ground: true });
      await reviseOff(client, past);
      await attemptingRow(client, past, 'suspicion_refusal', { job: 'other', claimedAt: new Date(now.getTime() - CORRECTION_SEND_LEASE_MS - 1) });
      expect(await begin(client, past, 'suspicion_refusal', { now })).toEqual({ kind: 'expired', detail: 'exhausted:recheck_not_standing' });
      expect(await noticeOf(client, past, 'suspicion_refusal')).toMatchObject([{ outcome: 'error', claimed_by_job: 'job-1' }]);

      // A HELD predicate + another job's row past the lease ⇒ re-claimed (attempt 2, the transient detail kept).
      const live = await refusedClaim(client, PARIWAR_A, randomUUID(), { ground: true });
      await attemptingRow(client, live, 'suspicion_refusal', { job: 'other', claimedAt: new Date(now.getTime() - CORRECTION_SEND_LEASE_MS - 1), detail: 'rate_limited:x' });
      expect(await begin(client, live, 'suspicion_refusal', { now })).toMatchObject({ kind: 'begun', attemptCount: 2 });
      expect(await noticeOf(client, live, 'suspicion_refusal')).toMatchObject([
        { outcome: 'attempting', first_detail: 'rate_limited:x', claimed_by_job: 'job-1', attempt_count: 2 },
      ]);
    });

    it('the transient note keeps the row `attempting` for THIS job only', async () => {
      const { client } = getTx();
      const s = await refusedClaim(client, PARIWAR_A, randomUUID(), { ground: true });
      const begun = (await begin(client, s, 'suspicion_refusal')) as { noticeId: string };
      const db = bindScopedDb(client);
      await noteSuspicionNoticeTransient(db, { pariwarId: pid, noticeId: begun.noticeId, jobId: 'job-9', detail: 'x' });
      expect((await noticeOf(client, s, 'suspicion_refusal'))[0]!.detail).toBeNull();
      await noteSuspicionNoticeTransient(db, { pariwarId: pid, noticeId: begun.noticeId, jobId: 'job-1', detail: 'api_unavailable:timeout' });
      expect(await noticeOf(client, s, 'suspicion_refusal')).toMatchObject([{ outcome: 'attempting', detail: 'api_unavailable:timeout' }]);
    });

    it('⭐ RB3 — the give-up: `attempting` past three IST days ⇒ `error` (`exhausted:attempting_three_days`); a younger row stays', async () => {
      const { client } = getTx();
      const now = new Date();
      const cutoff = suspicionNoticeReclaimCutoff(now);
      const old = await refusedClaim(client, PARIWAR_A, randomUUID(), { ground: true });
      const young = await refusedClaim(client, PARIWAR_A, randomUUID(), { ground: true });
      const leased = await refusedClaim(client, PARIWAR_A, randomUUID(), { ground: true });
      const stale = new Date(now.getTime() - CORRECTION_SEND_LEASE_MS - 1);
      await attemptingRow(client, old, 'suspicion_refusal', { createdAt: new Date(cutoff.getTime() - 1), claimedAt: stale, detail: 'api_unavailable:x' });
      await attemptingRow(client, young, 'suspicion_refusal', { createdAt: cutoff, claimedAt: stale });
      // ⭐ Old enough, but RE-CLAIMED within the send lease (a live child may be sending it) ⇒ left to that child.
      await attemptingRow(client, leased, 'suspicion_refusal', { createdAt: new Date(cutoff.getTime() - 1), claimedAt: new Date(now.getTime() - CORRECTION_SEND_LEASE_MS + 1000) });
      const done = await expireExhaustedSuspicionNotices(client, { cutoff, now, allow: ALLOW });
      expect(done).toContainEqual({ claimCaseId: old, purpose: 'suspicion_refusal' });
      expect(done.map((d) => d.claimCaseId)).not.toContain(young);
      expect(done.map((d) => d.claimCaseId)).not.toContain(leased);
      expect(await noticeOf(client, leased, 'suspicion_refusal')).toMatchObject([{ outcome: 'attempting' }]);
      expect(await noticeOf(client, old, 'suspicion_refusal')).toMatchObject([{ outcome: 'error', detail: 'exhausted:attempting_three_days', first_detail: 'api_unavailable:x' }]);
      // Three IST days: a row created today is given up on the day after tomorrow's next day — ⛔ before.
      expect(cutoff.getTime()).toBeLessThan(now.getTime() - DAY);
      expect(cutoff.getTime()).toBeGreaterThan(now.getTime() - 3 * DAY);
    });
  });

  // ── (b) — RB15 / RB18 ───────────────────────────────────────────────────────────────────────────────────────────
  describe('(b) `closed_after_appeal` — RB15 (S as of the closure) and RB18 (⛔ the post-death nominee\'s claim)', () => {
    it('⭐ R closed in `documents_pending` (⛔ determination of its own) ⇒ S\'s as-of rank 1 (v1), in Hindi', async () => {
      const { client } = getTx();
      const { mid, r } = await closedR(client);
      const { v1 } = await versionsOf(mid);
      expect(await begin(client, r, 'closed_after_appeal')).toMatchObject({
        kind: 'begun',
        locale: 'hi',
        recipient: { versionId: v1, mobileCiphertext: 'enc:v1:nominee-mobile-1', source: 'member_nominee', unresolved: null },
      });
    });

    it('⭐ S RE-DETERMINED after the closure so its LIVE rank 1 is the post-death nominee ⇒ STILL v1 (the as-of read)', async () => {
      const { client } = getTx();
      const { mid, s, r } = await closedR(client);
      const { v1, v2 } = await versionsOf(mid);
      await redetermineLater(client, s, [{ versionId: v1, mark: 'stands' }, { versionId: v2, mark: 'stands' }]);
      // S's LIVE rank 1 is now v2 (the higher `version_no` standing) — the closure text must ⛔ follow it.
      expect((await getEffectiveNomineeDeclarationAsOf(getTx().tx, pid, s, await instant(client, `now() + interval '2 minutes'`))).entries.find((e) => e.rank === 1)?.versionId).toBe(v2);
      expect(await begin(client, r, 'closed_after_appeal')).toMatchObject({ kind: 'begun', recipient: { versionId: v1 } });
    });

    it('the as-of read is HALF-OPEN at the supersession instant (microsecond-exact)', async () => {
      const { client, tx } = getTx();
      const mid = randomUUID();
      const s = await refusedClaim(client, PARIWAR_A, mid, { ground: true });
      const { v1, v2 } = await versionsOf(mid);
      const t = await redetermineLater(client, s, [{ versionId: v1, mark: 'stands' }, { versionId: v2, mark: 'stands' }]);
      const at = async (d: string) => (await getEffectiveNomineeDeclarationAsOf(tx, pid, s, d)).entries.find((e) => e.rank === 1)?.versionId;
      expect(await at(await instant(client, `$1::timestamptz - interval '1 microsecond'`, [t]))).toBe(v1);
      expect(await at(t)).toBe(v2);
      const [old] = await tx
        .select({ decidedAt: sql<string>`to_char(${schema.nomineeDeterminations.decidedAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')` })
        .from(schema.nomineeDeterminations)
        .where(and(eq(schema.nomineeDeterminations.claimCaseId, s), sql`superseded_at IS NOT NULL`));
      expect(await at(old!.decidedAt)).toBe(v1);
      expect((await getEffectiveNomineeDeclarationAsOf(tx, pid, s, await instant(client, `$1::timestamptz - interval '1 microsecond'`, [old!.decidedAt]))).status).toBe('undetermined');
    });

    it('a CORRECTED rank-1 entry ⇒ the chain head\'s number (RB7, root first)', async () => {
      const { client } = getTx();
      const { mid, r } = await closedR(client);
      const { v1 } = await versionsOf(mid);
      const fixed = await correctionOf(mid, v1, 'enc:v1:corrected-mobile');
      expect(await begin(client, r, 'closed_after_appeal')).toMatchObject({ kind: 'begun', recipient: { versionId: fixed, mobileCiphertext: 'enc:v1:corrected-mobile' } });
    });

    it('⭐ R and S both ⛔ effective ⇒ a FINISHED `no_target:closed_no_determination` row + `{ kind: no_target }`; a duplicate child ⇒ already_final', async () => {
      const { client } = getTx();
      const { r } = await closedR(client, { groundS: false });
      expect(await begin(client, r, 'closed_after_appeal')).toEqual({ kind: 'no_target', reason: 'closed_no_determination' });
      expect(await noticeOf(client, r, 'closed_after_appeal')).toMatchObject([{ outcome: 'no_target', detail: 'no_target:closed_no_determination' }]);
      expect(await begin(client, r, 'closed_after_appeal', { jobId: 'job-2' })).toEqual({ kind: 'already_final' });
      expect((await dueIds(client, 'closed_after_appeal')).has(r)).toBe(false);
    });

    it('⭐ RB18 — R filed by the POST-DEATH nominee (linked to v2, discarded) ⇒ a finished `excluded:…` row, ⛔ text; the true nominee\'s claim ⇒ texted', async () => {
      const { client } = getTx();
      const { mid, r } = await closedR(client);
      const { v2 } = await versionsOf(mid);
      await contact(client, r, mid, { claimantVersionId: v2 });
      expect(await begin(client, r, 'closed_after_appeal')).toEqual({ kind: 'no_target', reason: 'excluded_claimant' });
      expect(await noticeOf(client, r, 'closed_after_appeal')).toMatchObject([{ outcome: 'no_target', detail: 'excluded:claimant_discarded_version' }]);
      expect(await begin(client, r, 'closed_after_appeal')).toEqual({ kind: 'already_final' });
      // A second closed claim of the same death, filed by the TRUE nominee (linked to v1) — texted.
      const mid2 = randomUUID();
      const s2 = await refusedClaim(client, PARIWAR_A, mid2, { ground: true });
      const r2 = await documentsPending(client, mid2);
      const v = await versionsOf(mid2);
      await contact(client, r2, mid2, { claimantVersionId: v.v1 });
      await openAppeal(client, PARIWAR_A, s2);
      await reverseAtStage1(client, PARIWAR_A, s2);
      expect(await begin(client, r2, 'closed_after_appeal')).toMatchObject({ kind: 'begun', recipient: { versionId: v.v1 } });
    });

    it('RB18 residual (i) — a NON-nominee claimant ⇒ texted', async () => {
      const { client } = getTx();
      const { mid, r } = await closedR(client);
      await contact(client, r, mid, { claimantVersionId: null });
      expect(await begin(client, r, 'closed_after_appeal')).toMatchObject({ kind: 'begun' });
    });

    it('RB15 AND RB18 both apply ⇒ ONE row, `no_target:closed_no_determination` (RB18 ⛔ evaluated)', async () => {
      const { client } = getTx();
      const { mid, r } = await closedR(client, { groundS: false });
      const { v2 } = await versionsOf(mid);
      await contact(client, r, mid, { claimantVersionId: v2 });
      expect(await begin(client, r, 'closed_after_appeal')).toEqual({ kind: 'no_target', reason: 'closed_no_determination' });
      expect(await noticeOf(client, r, 'closed_after_appeal')).toMatchObject([{ detail: 'no_target:closed_no_determination' }]);
    });
  });

  // ── (c) — the refused filer ─────────────────────────────────────────────────────────────────────────────────────
  describe('(c) `refusal_appeal_notice` — RB13 and RB7', () => {
    it('⭐ a NON-nominee claimant ⇒ their contact mobile, the claim\'s `contact_locale`, the appeal date from the SAME row', async () => {
      const { client } = getTx();
      const mid = randomUUID();
      const decidedAt = new Date(Date.now() - 5 * DAY);
      const s = await refusedClaim(client, PARIWAR_A, mid, { decidedAt });
      await contact(client, s, mid, { claimantVersionId: null, locale: 'en' });
      expect(await begin(client, s, 'refusal_appeal_notice')).toMatchObject({
        kind: 'begun',
        locale: 'en',
        appealUntil: suspicionRefusalAppealUntil(decidedAt),
        recipient: { versionId: null, mobileCiphertext: 'enc:v1:claimant-mobile', source: 'claim_contact', unresolved: null },
      });
    });

    it('⭐ a nominee-claimant ⇒ the HEAD of their linked version\'s chain (a corrected number; a FORK resolves through the ROOT)', async () => {
      const { client } = getTx();
      const mid = randomUUID();
      const s = await refusedClaim(client, PARIWAR_A, mid, { ground: true });
      const { v2 } = await versionsOf(mid);
      // A fork of v2: two corrections of the SAME root; the claimant is linked to the LOWER one.
      const forkLow = await correctionOf(mid, v2, 'enc:v1:fork-low');
      const forkHigh = await correctionOf(mid, v2, 'enc:v1:fork-high');
      await contact(client, s, mid, { claimantVersionId: forkLow });
      const got = await readRefusedFilerRecipient(bindScopedDb(client), pid, s);
      // The linked version's OWN head is itself; the ROOT's head is the highest descendant.
      expect(got.recipient).toEqual({ versionId: forkHigh, mobileCiphertext: 'enc:v1:fork-high', source: 'member_nominee', unresolved: null });
      expect(got.locale).toBe('hi');
    });

    it('⛔ contact record ⇒ unresolved `no_contact_record`', async () => {
      const { client } = getTx();
      const s = await refusedClaim(client, PARIWAR_A, randomUUID());
      expect(await begin(client, s, 'refusal_appeal_notice')).toMatchObject({
        kind: 'begun',
        recipient: { mobileCiphertext: null, unresolved: 'no_contact_record' },
      });
    });

    it('⭐ RB13 — an appeal FILED ⇒ `not_due` (⛔ row); 90 days passed ⇒ `not_due`', async () => {
      const { client } = getTx();
      const appealed = await refusedClaim(client, PARIWAR_A, randomUUID());
      await openAppeal(client, PARIWAR_A, appealed);
      expect(await begin(client, appealed, 'refusal_appeal_notice')).toEqual({ kind: 'not_due' });
      const passed = await refusedClaim(client, PARIWAR_A, randomUUID(), { decidedAt: new Date(Date.now() - 100 * DAY) });
      expect(await begin(client, passed, 'refusal_appeal_notice')).toEqual({ kind: 'not_due' });
      expect(await noticeOf(client, appealed, 'refusal_appeal_notice')).toEqual([]);
      expect(await noticeOf(client, passed, 'refusal_appeal_notice')).toEqual([]);
    });

    it('an own `attempting` row whose appeal was filed since ⇒ `error` / `exhausted:recheck_appeal_open` (`-297` §2)', async () => {
      const { client } = getTx();
      const s = await refusedClaim(client, PARIWAR_A, randomUUID());
      await attemptingRow(client, s, 'refusal_appeal_notice');
      await openAppeal(client, PARIWAR_A, s);
      expect(await begin(client, s, 'refusal_appeal_notice')).toEqual({ kind: 'expired', detail: 'exhausted:recheck_appeal_open' });
      expect(await noticeOf(client, s, 'refusal_appeal_notice')).toMatchObject([{ outcome: 'error', detail: 'exhausted:recheck_appeal_open' }]);
    });

    it('⭐ AC7b — an appeal UPHELD at stage 3, then a revision away and BACK (a new chain) ⇒ ⛔ text: ⛔ selected, `not_due`, ⛔ row', async () => {
      const { client } = getTx();
      const panel = await seedAppealPanel(client, PARIWAR_A);
      const s = await refusedClaim(client, PARIWAR_A, randomUUID());
      await appealAtStage(client, PARIWAR_A, s, 3, panel);
      await stage3(client, PARIWAR_A, s, 'upheld');
      await client.query('RESET ROLE'); // `seedAppealPanel` left the app scope on — the raw rows + the selector are the superuser's
      await reviseOff(client, s);
      // Back ONTO `-239` — a NEW chain (and a new 90 days); the claim's appeal anchor is still the upheld one.
      const { rows } = await client.query<{ decision_id: string }>(
        `UPDATE claim_verifier_decisions SET superseded_at = clock_timestamp() WHERE claim_case_id = $1 AND superseded_at IS NULL RETURNING decision_id`,
        [s],
      );
      await client.query(
        `INSERT INTO claim_verifier_decisions (claim_case_id, pariwar_id, outcome, reason_code, rationale_ciphertext, actor_id, actor_display, supersedes_decision_id)
         VALUES ($1, $2, 'denied', 'post_death_nominee_change', 'enc:v1:r', $3, 'Anita (District Admin)', $4)`,
        [s, PARIWAR_A, randomUUID(), rows[0]!.decision_id],
      );
      expect((await dueIds(client, 'suspicion_refusal')).has(s)).toBe(true); // it stands again …
      expect((await dueIds(client, 'refusal_appeal_notice')).has(s)).toBe(false); // … but (c) is ⛔ selected
      expect(await begin(client, s, 'refusal_appeal_notice')).toEqual({ kind: 'not_due' });
      expect(await noticeOf(client, s, 'refusal_appeal_notice')).toEqual([]);
    });
  });
});
