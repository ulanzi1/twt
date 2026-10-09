// Story 6.25 — the STAFF EMAIL's domain half, live DB (:5433). `2026-10-09-299` RE1–RE5, RE5-bis, RE11.
//
//   · WHO (AC1, RE3 — Q1): a Pariwar-wide `pariwar_admin` (the TEXT compare), granted at or before the CURRENT `-239` chain start,
//     active, with credentials — a blank / NULL display name INCLUDED; ⛔ super_admin, state/district-scoped, NULL scope value,
//     a scope value ⛔ byte-equal to the Pariwar id, district_admin, suspended / disabled, a later grant, ⛔ credentials, another Pariwar's admin
//     (positive control in the same run); duplicate grants ⇒ ONE pair; the FREEZE legs (a note-only revision does ⛔ move the
//     chain start; away and back starts a new chain) and RE3's two accepted edges;
//   · WHEN (AC2, RE1): standing only — another reason, revised off, revised ONTO `-239`, an open appeal, an `upheld_final` appeal,
//     a reversed appeal (a no-admin claim's NULL pair included);
//   · the claiming transaction (AC4, AC5): every kind and re-check reason; `-297` §2 (an existing `attempting` row whose re-check
//     fails ⇒ `error`, at `attempt_count` 1 too); the lease (± 1 ms) and the take-over; `may_have_sent` set by a NULL-detail
//     re-claim and by a transient note, ⛔ by a held note; `previousDetail`; the NULL pair's `no_target` (RE4) and its once-ever;
//     the compare-and-set; the give-up (BOTH bounds, ⛔ a parked row); a missing claim THROWS; the HELD-run park (round 3);
//   · the selector's keyset (NULLS FIRST, every pair once across pages of 1) and the `detail` vocabulary.
// Every instant that the freeze compares is set EXPLICITLY (one per-test transaction ⇒ every `now()` is equal —
// [[project_db_clock_ordering_tests_tie]]). The TRUE two-connection races are in `suspicion-staff-email-concurrency.spec.ts`.

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  STAFF_EMAIL_SEND_LEASE_MS,
  SUSPICION_STAFF_EMAIL_PAGE_CAP,
  SUSPICION_STAFF_EMAIL_ERROR_REASONS,
  SUSPICION_STAFF_EMAIL_PARKED_BY,
  SUSPICION_STAFF_EMAIL_PRE_CALL_STEPS,
  SUSPICION_STAFF_EMAIL_RECHECK_REASONS,
  beginSuspicionStaffEmail,
  expireExhaustedSuspicionStaffEmails,
  finaliseSuspicionStaffEmail,
  isSuspicionStaffEmailDetail,
  noteSuspicionStaffEmailTransient,
  parkHeldSuspicionStaffEmails,
  readAdminEmailCiphertext,
  sanitizeProviderErrorName,
  selectDueSuspicionStaffEmails,
  suspicionStaffEmailDetail,
  suspicionStaffEmailReclaimCutoff,
  type SuspicionStaffEmailCursor,
} from '../../../src/claim/index.js';
import { bindScopedDb } from '../../../src/db.js';
import { pariwarId as toPariwarId, type ClaimId, type UserId } from '../../../src/ids/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppScope } from '../_helpers.js';
import { appealAtStage, openAppeal, refusedClaim, reverseAtStage1, seedAppealPanel, stage3 } from './_suspicion-refusal-fixtures.js';

type Client = ReturnType<typeof getTx>['client'];

const MIN = 60_000;
const pid = toPariwarId(PARIWAR_A);
const ALLOW = [PARIWAR_A, PARIWAR_B];
/** The refusal instant every freeze leg is measured against. */
const REFUSED_AT = new Date('2026-09-01T06:00:00.000Z');
const BEFORE = new Date(REFUSED_AT.getTime() - 60 * MIN);
const AFTER = new Date(REFUSED_AT.getTime() + 60 * MIN);

interface AdminOpts {
  readonly pariwarId?: string;
  readonly grantedAt?: Date;
  readonly status?: 'active' | 'suspended' | 'disabled';
  readonly credentials?: boolean;
  readonly role?: string;
  readonly scopeDimension?: string;
  /** Default `pariwarId` as written (lower-case); `null` ⇒ NULL. */
  readonly scopeValue?: string | null;
  readonly displayName?: string | null;
  readonly userId?: string;
  readonly grants?: number;
}

/** A staff user + role grant(s) + (optionally) credentials — RAW inserts so `created_at` is EXPLICIT (as the superuser). */
async function admin(client: Client, o: AdminOpts = {}): Promise<UserId> {
  const pariwarId = o.pariwarId ?? PARIWAR_A;
  const uid = o.userId ?? randomUUID();
  await client.query(
    `INSERT INTO users (id, identity_type, status, display_name) VALUES ($1, 'admin', $2, $3) ON CONFLICT (id) DO NOTHING`,
    [uid, o.status ?? 'active', o.displayName === undefined ? 'Priya (Pariwar Admin)' : o.displayName],
  );
  for (let i = 0; i < (o.grants ?? 1); i += 1) {
    await client.query(
      `INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value, created_at)
       VALUES ($1, $2, $3, $4::scope_dimension, $5, $6)`,
      [
        uid,
        pariwarId,
        o.role ?? 'pariwar_admin',
        o.scopeDimension ?? 'pariwar',
        o.scopeValue === undefined ? pariwarId : o.scopeValue,
        o.grantedAt ?? BEFORE,
      ],
    );
  }
  if (o.credentials !== false) {
    await client.query(
      `INSERT INTO admin_credentials (user_id, email_ciphertext, email_blind_index, password_hash)
       VALUES ($1, 'enc:v1:staff-email', $2, 'hash') ON CONFLICT (user_id) DO NOTHING`,
      [uid, `bidx-6-25-${uid}`],
    );
  }
  return uid as UserId;
}

/** A claim of a fresh death refused (`-239` unless `reason`) at `REFUSED_AT` unless `decidedAt`. */
async function refused(client: Client, o: { pariwarId?: string; reason?: 'post_death_nominee_change' | 'other'; decidedAt?: Date } = {}): Promise<ClaimId> {
  return refusedClaim(client, o.pariwarId ?? PARIWAR_A, randomUUID(), { reason: o.reason, decidedAt: o.decidedAt ?? REFUSED_AT });
}

/** Revise C's live decision — supersede it and insert a new live row with `reason` at `at` (explicit). */
async function revise(client: Client, cid: string, reason: string, at: Date): Promise<void> {
  const { rows } = await client.query<{ decision_id: string; pariwar_id: string }>(
    `UPDATE claim_verifier_decisions SET superseded_at = $2 WHERE claim_case_id = $1 AND superseded_at IS NULL RETURNING decision_id, pariwar_id`,
    [cid, at],
  );
  await client.query(
    `INSERT INTO claim_verifier_decisions (claim_case_id, pariwar_id, outcome, reason_code, rationale_ciphertext, actor_id, actor_display, supersedes_decision_id, decided_at)
     VALUES ($1, $2, 'denied', $3, 'enc:v1:r2', $4, 'Anita (District Admin)', $5, $6)`,
    [cid, rows[0]!.pariwar_id, reason, randomUUID(), rows[0]!.decision_id, at],
  );
}

/** Every due pair (all pages), keyed `claim|recipient` (recipient `-` for NULL) ⇒ hasAttemptingRow. */
async function duePairs(client: Client, limit = SUSPICION_STAFF_EMAIL_PAGE_CAP): Promise<Map<string, boolean>> {
  const out = new Map<string, boolean>();
  let after: SuspicionStaffEmailCursor | null = null;
  for (;;) {
    const page = await selectDueSuspicionStaffEmails(client, { after, limit, allow: ALLOW });
    for (const d of page.due) {
      const key = `${d.claimCaseId}|${d.recipientUserId ?? '-'}`;
      expect(out.has(key), `pair ${key} returned twice`).toBe(false);
      out.set(key, d.hasAttemptingRow);
    }
    if (page.scanned < limit || page.last === null) break;
    after = page.last;
  }
  return out;
}

/** The recipients due for claim `cid` (⛔ the NULL pair). */
async function recipientsDue(client: Client, cid: string): Promise<string[]> {
  return [...(await duePairs(client)).keys()].filter((k) => k.startsWith(`${cid}|`) && !k.endsWith('|-')).map((k) => k.split('|')[1]!).sort();
}

/** Run the claiming transaction under the app role + scope (production's RLS), then back to the superuser. */
async function begin(client: Client, cid: string, recipient: string | null, o: { jobId?: string; now?: Date; pariwarId?: string } = {}) {
  await enterAppScope(client, o.pariwarId ?? PARIWAR_A);
  try {
    return await beginSuspicionStaffEmail(client, {
      pariwarId: toPariwarId(o.pariwarId ?? PARIWAR_A),
      claimCaseId: cid as ClaimId,
      recipientUserId: recipient as UserId | null,
      jobId: o.jobId ?? 'job-1',
      now: o.now ?? new Date(),
    });
  } finally {
    await client.query('RESET ROLE');
  }
}

async function rowsOf(client: Client, cid: string) {
  const { rows } = await client.query<{
    notice_id: string;
    recipient_user_id: string | null;
    outcome: string;
    detail: string | null;
    first_detail: string | null;
    attempt_count: number;
    may_have_sent: boolean;
    claimed_by_job: string | null;
  }>(
    `SELECT notice_id, recipient_user_id, outcome, detail, first_detail, attempt_count, may_have_sent, claimed_by_job
       FROM claim_suspicion_staff_emails WHERE claim_case_id = $1 ORDER BY recipient_user_id NULLS FIRST`,
    [cid],
  );
  return rows;
}

/** A crash-left `attempting` row (as the superuser). */
/** `createdAt` also sets `aging_since` (the give-up's anchor — 0153). */
async function attemptingRow(client: Client, cid: string, recipient: string, o: { job?: string; claimedAt?: Date; createdAt?: Date; detail?: string | null } = {}) {
  await client.query(
    `INSERT INTO claim_suspicion_staff_emails (pariwar_id, claim_case_id, recipient_user_id, outcome, claimed_at, claimed_by_job, created_at, detail, aging_since)
     VALUES ($1, $2, $3, 'attempting', $4, $5, $6, $7, $6)`,
    [PARIWAR_A, cid, recipient, o.claimedAt ?? new Date(), o.job ?? 'job-crashed', o.createdAt ?? new Date(), o.detail ?? null],
  );
}

describe.skipIf(!hasDatabase)('Story 6.25 — the staff email: who, when, and the claiming transaction', { timeout: 20000 }, () => {
  setupLiveDb();

  describe('AC1 — WHO (RE3, Q1)', () => {
    it('⭐ every eligible Pariwar Admin — a blank AND a NULL display name INCLUDED; every excluded shape is ⛔ due; B\'s admin is due for B only', async () => {
      const { client } = getTx();
      const c = await refused(client);
      const named = await admin(client);
      const blank = await admin(client, { displayName: '   ' });
      const nameless = await admin(client, { displayName: null });
      const dup = await admin(client, { grants: 2 });
      const excluded = [
        await admin(client, { role: 'super_admin', scopeDimension: 'global', scopeValue: null }),
        await admin(client, { scopeDimension: 'state', scopeValue: 'Bihar' }),
        await admin(client, { scopeDimension: 'district', scopeValue: 'Patna' }),
        await admin(client, { scopeValue: null }),
        // ⚠ PARIWAR_A is all digits (an upper-cased copy is IDENTICAL) — a trailing space is the non-byte-equal value here.
        await admin(client, { scopeValue: `${PARIWAR_A} ` }),
        await admin(client, { role: 'district_admin', scopeDimension: 'district', scopeValue: 'Patna' }),
        await admin(client, { status: 'suspended' }),
        await admin(client, { status: 'disabled' }),
        await admin(client, { grantedAt: AFTER }),
        await admin(client, { credentials: false }),
      ];
      // POSITIVE CONTROL in the same run — B's admin, B's refusal.
      const cb = await refused(client, { pariwarId: PARIWAR_B });
      const bAdmin = await admin(client, { pariwarId: PARIWAR_B });

      expect(await recipientsDue(client, c)).toEqual([named, blank, nameless, dup].sort());
      for (const u of [...excluded, bAdmin]) expect(await recipientsDue(client, c)).not.toContain(u);
      expect(await recipientsDue(client, cb)).toEqual([bAdmin]);
      // ⛔ A claim-level NULL pair while anyone is eligible.
      expect((await duePairs(client)).has(`${c}|-`)).toBe(false);
    });

    it('⭐ a grant created EXACTLY at the chain start is included (`<=`); one microsecond later is ⛔', async () => {
      const { client } = getTx();
      const c = await refused(client);
      const at = await admin(client, { grantedAt: REFUSED_AT });
      const late = await admin(client);
      await client.query(`UPDATE role_grants SET created_at = $2::timestamptz + interval '1 microsecond' WHERE user_id = $1`, [late, REFUSED_AT]);
      expect(await recipientsDue(client, c)).toEqual([at]);
    });

    it('⭐ FREEZE (i) — L granted AFTER the refusal, then a NOTE-ONLY revision that keeps `-239` ⇒ ⛔ L (the chain start did ⛔ move)', async () => {
      const { client } = getTx();
      const c = await refused(client);
      const early = await admin(client);
      const l = await admin(client, { grantedAt: AFTER });
      await revise(client, c, 'post_death_nominee_change', new Date(AFTER.getTime() + 60 * MIN));
      expect(await recipientsDue(client, c)).toEqual([early]);
      expect(await recipientsDue(client, c)).not.toContain(l);
    });

    it('⭐ FREEZE (ii) — revised AWAY and BACK after L\'s grant ⇒ L IS due (a new chain); an admin already emailed is ⛔ due again (RE2)', async () => {
      const { client } = getTx();
      const c = await refused(client);
      const early = await admin(client);
      const l = await admin(client, { grantedAt: AFTER });
      // `early` was emailed on the first chain.
      await client.query(
        `INSERT INTO claim_suspicion_staff_emails (pariwar_id, claim_case_id, recipient_user_id, outcome) VALUES ($1, $2, $3, 'accepted')`,
        [PARIWAR_A, c, early],
      );
      await revise(client, c, 'other', new Date(AFTER.getTime() + 60 * MIN));
      expect(await recipientsDue(client, c)).toEqual([]);
      await revise(client, c, 'post_death_nominee_change', new Date(AFTER.getTime() + 120 * MIN));
      expect(await recipientsDue(client, c)).toEqual([l]);
    });

    it('RE3 edge (i) ACCEPTED — an admin suspended at the refusal and reactivated later IS due (status is judged at the send)', async () => {
      const { client } = getTx();
      const c = await refused(client);
      const u = await admin(client, { status: 'suspended' });
      expect(await recipientsDue(client, c)).toEqual([]);
      await client.query(`UPDATE users SET status = 'active' WHERE id = $1`, [u]);
      expect(await recipientsDue(client, c)).toEqual([u]);
    });

    it('RE3 edge (ii) ACCEPTED — a revoke + re-grant after the refusal ⇒ ⛔ due (the new grant is later than the chain start)', async () => {
      const { client } = getTx();
      const c = await refused(client);
      const u = await admin(client);
      await client.query(`DELETE FROM role_grants WHERE user_id = $1`, [u]);
      await admin(client, { userId: u, grantedAt: AFTER });
      expect(await recipientsDue(client, c)).toEqual([]);
    });
  });

  describe('AC2 — WHEN (RE1): the refusal STANDS', () => {
    it('another reason ⇒ ⛔ pair; `-239` revised off ⇒ ⛔ pair; a revision ONTO `-239` ⇒ due (its chain starts at the revision)', async () => {
      const { client } = getTx();
      const u = await admin(client, { grantedAt: AFTER });
      const other = await refused(client, { reason: 'other' });
      const off = await refused(client);
      await revise(client, off, 'other', AFTER);
      const onto = await refused(client, { reason: 'other' });
      await revise(client, onto, 'post_death_nominee_change', new Date(AFTER.getTime() + 60 * MIN));
      expect(await recipientsDue(client, other)).toEqual([]);
      expect(await recipientsDue(client, off)).toEqual([]);
      // ⭐ u was granted AFTER the original denial but BEFORE the revision onto `-239` ⇒ eligible for that chain.
      expect(await recipientsDue(client, onto)).toEqual([u]);
      expect((await duePairs(client)).has(`${other}|-`)).toBe(false);
    });

    it('an OPEN appeal ⇒ still due; a REVERSED appeal ⇒ ⛔ due (and a no-admin claim\'s NULL pair goes too)', async () => {
      const { client } = getTx();
      const u = await admin(client);
      const appealed = await refused(client);
      await openAppeal(client, PARIWAR_A, appealed);
      expect(await recipientsDue(client, appealed)).toEqual([u]);
      await reverseAtStage1(client, PARIWAR_A, appealed);
      expect(await recipientsDue(client, appealed)).toEqual([]);
      // A claim with ⛔ eligible admin (Pariwar B — this spec seeds ⛔ admin there): its NULL pair is due while the appeal is open
      // and goes with the reversal.
      const lonely = await refused(client, { pariwarId: PARIWAR_B });
      await openAppeal(client, PARIWAR_B, lonely);
      expect((await duePairs(client)).has(`${lonely}|-`)).toBe(true);
      await reverseAtStage1(client, PARIWAR_B, lonely);
      expect((await duePairs(client)).has(`${lonely}|-`)).toBe(false);
    });

    it('⭐ AC2 (vi) — an `upheld_final` appeal ⇒ STILL due (the refusal stands — RE1, RF1)', async () => {
      const { client } = getTx();
      const u = await admin(client);
      const panel = await seedAppealPanel(client, PARIWAR_A);
      const upheld = await refused(client);
      await appealAtStage(client, PARIWAR_A, upheld, 3, panel);
      await stage3(client, PARIWAR_A, upheld, 'upheld');
      await client.query('RESET ROLE'); // `seedAppealPanel` left the app scope on — the selector is the superuser's (6.24b's pattern)
      // `upheld_final` is the APPEAL's status (the claim itself stays `denied`).
      expect((await client.query<{ s: string }>('SELECT status AS s FROM claim_appeals WHERE claim_case_id = $1', [upheld])).rows[0]!.s).toBe('upheld_final');
      expect(await recipientsDue(client, upheld)).toEqual([u]);
    });

    it('a FINISHED row ends the pair; an `attempting` row is ALWAYS returned (flagged), even once the refusal no longer stands', async () => {
      const { client } = getTx();
      const c = await refused(client);
      const done = await admin(client);
      const crashed = await admin(client);
      await client.query(
        `INSERT INTO claim_suspicion_staff_emails (pariwar_id, claim_case_id, recipient_user_id, outcome) VALUES ($1, $2, $3, 'accepted')`,
        [PARIWAR_A, c, done],
      );
      await attemptingRow(client, c, crashed);
      let pairs = await duePairs(client);
      expect(pairs.has(`${c}|${done}`)).toBe(false);
      expect(pairs.get(`${c}|${crashed}`)).toBe(true);
      await revise(client, c, 'other', AFTER);
      pairs = await duePairs(client);
      expect(pairs.get(`${c}|${crashed}`)).toBe(true);
    });
  });

  describe('AC5 — nobody to email (RE4)', () => {
    it('⭐ ⛔ eligible admin ⇒ the NULL pair is due; begin writes ONE `no_target` row; again ⇒ `already_final`, ⛔ second row, ⛔ due', async () => {
      const { client } = getTx();
      const c = await refused(client);
      expect((await duePairs(client)).get(`${c}|-`)).toBe(false);
      expect(await begin(client, c, null)).toEqual({ kind: 'no_target' });
      expect(await rowsOf(client, c)).toMatchObject([{ recipient_user_id: null, outcome: 'no_target', detail: 'no_pariwar_admin' }]);
      expect(await begin(client, c, null, { jobId: 'job-2' })).toEqual({ kind: 'already_final' });
      expect(await rowsOf(client, c)).toHaveLength(1);
      expect((await duePairs(client)).has(`${c}|-`)).toBe(false);
    });

    it('a claim with an admin who already has a row ⇒ ⛔ NULL pair even after that admin is DISABLED (`claim_has_rows`)', async () => {
      const { client } = getTx();
      const c = await refused(client);
      const u = await admin(client);
      await client.query(
        `INSERT INTO claim_suspicion_staff_emails (pariwar_id, claim_case_id, recipient_user_id, outcome) VALUES ($1, $2, $3, 'accepted')`,
        [PARIWAR_A, c, u],
      );
      await client.query(`UPDATE users SET status = 'disabled' WHERE id = $1`, [u]);
      expect((await duePairs(client)).has(`${c}|-`)).toBe(false);
      expect(await begin(client, c, null)).toEqual({ kind: 'not_due', reason: 'claim_has_rows' });
      expect(await rowsOf(client, c)).toHaveLength(1);
    });

    it('a NULL pair whose claim now HAS an eligible admin ⇒ `not_due` / `recipients_exist`, ⛔ row', async () => {
      const { client } = getTx();
      const c = await refused(client);
      await admin(client);
      expect(await begin(client, c, null)).toEqual({ kind: 'not_due', reason: 'recipients_exist' });
      expect(await rowsOf(client, c)).toHaveLength(0);
    });
  });

  describe('AC4 — the claiming transaction (RE11)', () => {
    it('⭐ fresh ⇒ `begun` (attempt 1, ⛔ may_have_sent); another job within the lease ⇒ `held_by_other`; the own retry re-claims', async () => {
      const { client } = getTx();
      const c = await refused(client);
      const u = await admin(client);
      const now = new Date();
      const first = await begin(client, c, u, { now });
      expect(first).toMatchObject({ kind: 'begun', recipientUserId: u, attemptCount: 1, previousDetail: null, mayHaveSent: false });
      expect(await begin(client, c, u, { jobId: 'job-2', now })).toEqual({ kind: 'held_by_other' });
      // ⭐ The own retry with ⛔ note in between: the previous attempt ended with NO detail ⇒ it MAY have sent (RE5).
      const retry = await begin(client, c, u, { now: new Date(now.getTime() + MIN) });
      expect(retry).toMatchObject({ kind: 'begun', attemptCount: 2, mayHaveSent: true });
      expect(await rowsOf(client, c)).toMatchObject([{ outcome: 'attempting', attempt_count: 2, may_have_sent: true, claimed_by_job: 'job-1' }]);
    });

    it('⭐ a HELD note ⇒ the re-claim does ⛔ set may_have_sent, hands back `previousDetail`, moves it to first_detail and CLEARS detail', async () => {
      const { client, tx } = getTx();
      const c = await refused(client);
      const u = await admin(client);
      const now = new Date();
      const b = await begin(client, c, u, { now });
      if (b.kind !== 'begun') throw new Error('expected begun');
      const held = suspicionStaffEmailDetail({ kind: 'held', name: 'SendingPausedException' });
      await enterAppScope(client, PARIWAR_A);
      expect(await noteSuspicionStaffEmailTransient(tx, { pariwarId: pid, noticeId: b.noticeId, jobId: 'job-1', detail: held, mayHaveSent: false, now })).toBe(1);
      await client.query('RESET ROLE');
      const again = await begin(client, c, u, { now });
      expect(again).toMatchObject({ kind: 'begun', attemptCount: 2, previousDetail: 'held:SendingPausedException', mayHaveSent: false });
      expect(await rowsOf(client, c)).toMatchObject([{ detail: null, first_detail: 'held:SendingPausedException', may_have_sent: false }]);
    });

    it('⭐ RE5-bis — a transient note that MAY have sent (a 5xx) sets may_have_sent, NEVER back; the note refreshes claimed_at (the lease)', async () => {
      const { client, tx } = getTx();
      const c = await refused(client);
      const u = await admin(client);
      const t0 = new Date(Date.now() - 2 * STAFF_EMAIL_SEND_LEASE_MS);
      const b = await begin(client, c, u, { now: t0 });
      if (b.kind !== 'begun') throw new Error('expected begun');
      const t1 = new Date();
      await enterAppScope(client, PARIWAR_A);
      await noteSuspicionStaffEmailTransient(tx, { pariwarId: pid, noticeId: b.noticeId, jobId: 'job-1', detail: 'transient:InternalFailure', mayHaveSent: true, now: t1 });
      await noteSuspicionStaffEmailTransient(tx, { pariwarId: pid, noticeId: b.noticeId, jobId: 'job-1', detail: 'transient:TooManyRequestsException', mayHaveSent: false, now: t1 });
      // A note by ANOTHER job is a no-op (0 rows).
      expect(await noteSuspicionStaffEmailTransient(tx, { pariwarId: pid, noticeId: b.noticeId, jobId: 'job-x', detail: 'transient:network', mayHaveSent: false, now: t1 })).toBe(0);
      await client.query('RESET ROLE');
      expect(await rowsOf(client, c)).toMatchObject([{ may_have_sent: true, detail: 'transient:TooManyRequestsException' }]);
      // The note at t1 refreshed the lease ⇒ another job is held off although the CLAIM (t0) is two leases old.
      expect(await begin(client, c, u, { jobId: 'job-2', now: new Date(t1.getTime() + STAFF_EMAIL_SEND_LEASE_MS - 1) })).toEqual({ kind: 'held_by_other' });
    });

    it('the lease ± 1 ms — another job\'s row is held at exactly the lease, taken over 1 ms past it (attempt + 1, first_detail kept)', async () => {
      const { client } = getTx();
      const c = await refused(client);
      const u = await admin(client);
      const claimedAt = new Date(Date.now() - 60 * MIN);
      await attemptingRow(client, c, u, { claimedAt, detail: 'transient:network' });
      expect(await begin(client, c, u, { jobId: 'job-2', now: new Date(claimedAt.getTime() + STAFF_EMAIL_SEND_LEASE_MS) })).toEqual({ kind: 'held_by_other' });
      const taken = await begin(client, c, u, { jobId: 'job-2', now: new Date(claimedAt.getTime() + STAFF_EMAIL_SEND_LEASE_MS + 1) });
      expect(taken).toMatchObject({ kind: 'begun', attemptCount: 2, previousDetail: 'transient:network', mayHaveSent: false });
      expect(await rowsOf(client, c)).toMatchObject([{ claimed_by_job: 'job-2', first_detail: 'transient:network', detail: null }]);
    });

    it('⭐ `-297` §2 — an existing `attempting` row whose re-check FAILS ⇒ `error` / `exhausted:recheck_<reason>` (attempt 1 too); a fresh pair ⇒ `not_due`, ⛔ row', async () => {
      const { client } = getTx();
      const c = await refused(client);
      const u = await admin(client);
      const fresh = await admin(client);
      await attemptingRow(client, c, u, { job: 'job-1' });
      await revise(client, c, 'other', AFTER);
      expect(await begin(client, c, u)).toEqual({ kind: 'expired', detail: 'exhausted:recheck_refusal_not_standing' });
      expect(await begin(client, c, fresh)).toEqual({ kind: 'not_due', reason: 'refusal_not_standing' });
      expect(await rowsOf(client, c)).toMatchObject([{ recipient_user_id: u, outcome: 'error', detail: 'exhausted:recheck_refusal_not_standing', attempt_count: 1, may_have_sent: true }]);
    });

    it('a recipient who is ⛔ eligible at the lock ⇒ `not_due` / `recipient_not_eligible` (fresh), `exhausted:recheck_recipient_not_eligible` (existing)', async () => {
      const { client } = getTx();
      const c = await refused(client);
      const suspended = await admin(client);
      const crashed = await admin(client);
      await attemptingRow(client, c, crashed, { job: 'job-1' });
      await client.query(`UPDATE users SET status = 'suspended' WHERE id = ANY($1::uuid[])`, [[suspended, crashed]]);
      expect(await begin(client, c, suspended)).toEqual({ kind: 'not_due', reason: 'recipient_not_eligible' });
      expect(await begin(client, c, crashed)).toEqual({ kind: 'expired', detail: 'exhausted:recheck_recipient_not_eligible' });
    });

    it('the compare-and-set — another job ⇒ null; the holder ⇒ its may_have_sent; a second finalise ⇒ null (rowCount asserted)', async () => {
      const { client, tx } = getTx();
      const c = await refused(client);
      const u = await admin(client);
      const b = await begin(client, c, u);
      if (b.kind !== 'begun') throw new Error('expected begun');
      await enterAppScope(client, PARIWAR_A);
      const base = { pariwarId: pid, noticeId: b.noticeId, outcome: 'accepted' as const, providerMessageId: 'msg-1' };
      expect(await finaliseSuspicionStaffEmail(tx, { ...base, jobId: 'job-x' })).toBeNull();
      expect(await finaliseSuspicionStaffEmail(tx, { ...base, jobId: 'job-1' })).toEqual({ mayHaveSent: false });
      expect(await finaliseSuspicionStaffEmail(tx, { ...base, jobId: 'job-1' })).toBeNull();
      await client.query('RESET ROLE');
      expect(await rowsOf(client, c)).toMatchObject([{ outcome: 'accepted', detail: null }]);
      expect(await begin(client, c, u, { jobId: 'job-9' })).toEqual({ kind: 'already_final' });
    });

    it('a MISSING claim THROWS (a data fault — ⛔ a `not_due`)', async () => {
      const { client } = getTx();
      const u = await admin(client);
      await expect(begin(client, randomUUID(), u)).rejects.toThrow(/is missing under Pariwar/);
      await client.query('RESET ROLE');
    });
  });

  describe('the give-up (RE11) — BOTH bounds', () => {
    it('⭐ created before 00:00 IST of (today − 2) AND claimed past the lease ⇒ `error`; a fresh row or one inside the lease is ⛔ touched', async () => {
      const { client } = getTx();
      const c = await refused(client);
      const [old, live, young] = [await admin(client), await admin(client), await admin(client)];
      const now = new Date();
      const cutoff = suspicionStaffEmailReclaimCutoff(now);
      await attemptingRow(client, c, old, { createdAt: new Date(cutoff.getTime() - 1), claimedAt: new Date(now.getTime() - STAFF_EMAIL_SEND_LEASE_MS - 1), detail: 'held:SendingPausedException' });
      await attemptingRow(client, c, live, { createdAt: new Date(cutoff.getTime() - 1), claimedAt: new Date(now.getTime() - STAFF_EMAIL_SEND_LEASE_MS + MIN) });
      await attemptingRow(client, c, young, { createdAt: cutoff, claimedAt: new Date(now.getTime() - 10 * STAFF_EMAIL_SEND_LEASE_MS) });
      const gone = await expireExhaustedSuspicionStaffEmails(client, { cutoff, now, allow: [PARIWAR_A] });
      expect(gone).toEqual([{ claimCaseId: c, recipientUserId: old }]);
      const rows = await rowsOf(client, c);
      expect(rows.find((r) => r.recipient_user_id === old)).toMatchObject({ outcome: 'error', detail: 'exhausted:attempting_three_days', first_detail: 'held:SendingPausedException', may_have_sent: true });
      expect(rows.filter((r) => r.outcome === 'attempting').map((r) => r.recipient_user_id).sort()).toEqual([live, young].sort());
    });

    it('the cutoff is 00:00 IST of (today − 2)', () => {
      expect(suspicionStaffEmailReclaimCutoff(new Date('2026-10-09T20:00:00.000Z')).toISOString()).toBe('2026-10-07T18:30:00.000Z');
    });
  });

  describe('the selector keyset and Q2', () => {
    it('⭐ pages of ONE return every pair EXACTLY once — the NULL pair FIRST within its claim', async () => {
      const { client } = getTx();
      const lonely = await refused(client, { pariwarId: PARIWAR_B });
      const c = await refused(client);
      const [u1, u2] = [await admin(client), await admin(client)];
      const all = await duePairs(client);
      const paged = await duePairs(client, 1);
      expect([...paged.keys()].sort()).toEqual([...all.keys()].sort());
      expect(paged.has(`${lonely}|-`)).toBe(true);
      expect(paged.has(`${c}|${u1}`) && paged.has(`${c}|${u2}`)).toBe(true);
      // The cap DOWN (`clampLimit`'s range) is unit-tested in `tests/pagination.test.ts`; an over-cap limit still pages cleanly.
      const capped = await selectDueSuspicionStaffEmails(client, { after: null, limit: 1_000_000, allow: ALLOW });
      expect(capped.scanned).toBe(all.size);
      // ⭐ Pariwar B now holds TWO due NULL pairs ⇒ a 0 limit returning exactly ONE proves the clamp UP to 1 (⛔ 0, ⛔ unbounded).
      await refused(client, { pariwarId: PARIWAR_B });
      const first = await selectDueSuspicionStaffEmails(client, { after: null, limit: 0, allow: [PARIWAR_B] });
      expect(first.scanned).toBe(1);
    });

    it('Q2 reads ONE admin\'s ciphertext AS STORED under the app scope; ⛔ credentials ⇒ null', async () => {
      const { client, tx } = getTx();
      const u = await admin(client);
      const none = await admin(client, { credentials: false });
      await enterAppScope(client, PARIWAR_A);
      expect(await readAdminEmailCiphertext(bindScopedDb(client), u)).toBe('enc:v1:staff-email');
      expect(await readAdminEmailCiphertext(tx, none)).toBeNull();
      await client.query('RESET ROLE');
    });
  });

  describe('the `detail` vocabulary (RE5)', () => {
    it('every value is fixed; a provider name that is ⛔ a bare identifier becomes `unknown` (an address can ⛔ leak through it)', () => {
      expect(suspicionStaffEmailDetail({ kind: 'no_pariwar_admin' })).toBe('no_pariwar_admin');
      expect(suspicionStaffEmailDetail({ kind: 'transient', name: 'network' })).toBe('transient:network');
      expect(suspicionStaffEmailDetail({ kind: 'held', name: 'TM_4001.SM_111' })).toBe('held:TM_4001.SM_111');
      expect(suspicionStaffEmailDetail({ kind: 'pre_call', step: 'decrypt_failed' })).toBe('transient:decrypt_failed');
      expect(suspicionStaffEmailDetail({ kind: 'rejected', http: 400, name: 'TM_4001.SM_113' })).toBe('rejected:400:TM_4001.SM_113');
      expect(suspicionStaffEmailDetail({ kind: 'error', reason: 'invalid_address' })).toBe('error:invalid_address');
      expect(suspicionStaffEmailDetail({ kind: 'recheck', reason: 'claim_has_rows' })).toBe('exhausted:recheck_claim_has_rows');
      expect(suspicionStaffEmailDetail({ kind: 'exhausted_three_days' })).toBe('exhausted:attempting_three_days');
      for (const leak of ['priya@example.com is not verified', 'a b', 'x'.repeat(65), '', 'Message rejected: admin@x.in']) {
        expect(sanitizeProviderErrorName(leak)).toBe('unknown');
      }
      expect(suspicionStaffEmailDetail({ kind: 'held', name: 'admin@example.com' })).toBe('held:unknown');
    });

    it('⭐ round 3 — every builder output matches the grammar 0153 CHECKs; free text / an address does ⛔; a writer refuses it BEFORE the UPDATE', async () => {
      const built = [
        suspicionStaffEmailDetail({ kind: 'no_pariwar_admin' }),
        suspicionStaffEmailDetail({ kind: 'transient', name: 'x'.repeat(64) }),
        suspicionStaffEmailDetail({ kind: 'held', name: 'priya@example.com' }),
        suspicionStaffEmailDetail({ kind: 'rejected', http: 999, name: 'TM_4001.SM_113' }),
        suspicionStaffEmailDetail({ kind: 'exhausted_three_days' }),
        // ⭐ Round 4 — the EXPORTED reason arrays the types derive from (a new reason is iterated here, ⛔ hand-listed).
        ...SUSPICION_STAFF_EMAIL_PRE_CALL_STEPS.map((step) => suspicionStaffEmailDetail({ kind: 'pre_call', step })),
        ...SUSPICION_STAFF_EMAIL_ERROR_REASONS.map((reason) => suspicionStaffEmailDetail({ kind: 'error', reason })),
        ...SUSPICION_STAFF_EMAIL_RECHECK_REASONS.map((reason) => suspicionStaffEmailDetail({ kind: 'recheck', reason })),
      ];
      for (const d of built) expect(isSuspicionStaffEmailDetail(d), d).toBe(true);
      for (const bad of ['x', 'held:priya@example.com', 'transient:a b', 'Message rejected: admin@x.in', 'error:other', 'transient:', '']) {
        expect(isSuspicionStaffEmailDetail(bad), bad).toBe(false);
      }
      const { client, tx } = getTx();
      const c = await refused(client);
      const u = await admin(client);
      const b = await begin(client, c, u);
      if (b.kind !== 'begun') throw new Error('expected begun');
      await enterAppScope(client, PARIWAR_A);
      const leak = 'Message rejected: priya@example.com';
      await expect(
        noteSuspicionStaffEmailTransient(tx, { pariwarId: pid, noticeId: b.noticeId, jobId: 'job-1', detail: leak, mayHaveSent: false, now: new Date() }),
      ).rejects.toThrow(/outside the fixed vocabulary/);
      await expect(
        finaliseSuspicionStaffEmail(tx, { pariwarId: pid, noticeId: b.noticeId, jobId: 'job-1', outcome: 'error', detail: leak }),
      ).rejects.toThrow(/outside the fixed vocabulary/);
      await client.query('RESET ROLE');
      expect(await rowsOf(client, c)).toMatchObject([{ outcome: 'attempting', detail: null }]);
    });
  });

  describe('⭐ round 3 (Decision 1 A) — a HELD run PARKS a stale row; the give-up skips it; the first child after the hold re-claims it', () => {
    it('park: past the lease ⇒ parked; inside the lease, finished or already parked ⇒ ⛔ touched (claimed_at / detail / may_have_sent kept)', async () => {
      const { client } = getTx();
      const c = await refused(client);
      const [stale, live, done] = [await admin(client), await admin(client), await admin(client)];
      const now = new Date();
      const staleAt = new Date(now.getTime() - STAFF_EMAIL_SEND_LEASE_MS - 1);
      await attemptingRow(client, c, stale, { claimedAt: staleAt, detail: 'held:SendingPausedException' });
      await attemptingRow(client, c, live, { claimedAt: new Date(now.getTime() - STAFF_EMAIL_SEND_LEASE_MS + MIN), job: 'job-live' });
      await client.query(
        `INSERT INTO claim_suspicion_staff_emails (pariwar_id, claim_case_id, recipient_user_id, outcome) VALUES ($1, $2, $3, 'accepted')`,
        [PARIWAR_A, c, done],
      );
      expect(await parkHeldSuspicionStaffEmails(client, { now, allow: [PARIWAR_A] })).toBe(1);
      expect(await parkHeldSuspicionStaffEmails(client, { now, allow: [PARIWAR_A] })).toBe(0);
      const rows = await rowsOf(client, c);
      expect(rows.find((r) => r.recipient_user_id === stale)).toMatchObject({
        outcome: 'attempting',
        claimed_by_job: SUSPICION_STAFF_EMAIL_PARKED_BY,
        detail: 'held:SendingPausedException',
        may_have_sent: false,
      });
      const { rows: at } = await client.query<{ claimed_at: Date }>(
        `SELECT claimed_at FROM claim_suspicion_staff_emails WHERE claim_case_id = $1 AND recipient_user_id = $2`,
        [c, stale],
      );
      expect(at[0]!.claimed_at.getTime()).toBe(staleAt.getTime());
      expect(rows.find((r) => r.recipient_user_id === live)).toMatchObject({ claimed_by_job: 'job-live' });
      expect(rows.find((r) => r.recipient_user_id === done)).toMatchObject({ outcome: 'accepted' });
    });

    it('⭐ the give-up SKIPS a parked row past BOTH bounds; the first child re-claims it AT ONCE (⛔ lease wait) and the give-up then may', async () => {
      const { client } = getTx();
      const c = await refused(client);
      const u = await admin(client);
      const now = new Date();
      const cutoff = suspicionStaffEmailReclaimCutoff(now);
      await attemptingRow(client, c, u, {
        createdAt: new Date(cutoff.getTime() - 1),
        claimedAt: new Date(now.getTime() - 10 * STAFF_EMAIL_SEND_LEASE_MS),
        detail: 'held:SendingPausedException',
        job: SUSPICION_STAFF_EMAIL_PARKED_BY,
      });
      expect(await expireExhaustedSuspicionStaffEmails(client, { cutoff, now, allow: [PARIWAR_A] })).toEqual([]);
      // ⭐ A fresh job re-claims the parked row at once — the HELD note means ⛔ may_have_sent.
      const taken = await begin(client, c, u, { jobId: 'job-after-hold', now });
      expect(taken).toMatchObject({ kind: 'begun', attemptCount: 2, previousDetail: 'held:SendingPausedException', mayHaveSent: false });
      expect(await rowsOf(client, c)).toMatchObject([{ claimed_by_job: 'job-after-hold', first_detail: 'held:SendingPausedException' }]);
      // ⭐ Round 4 (`-300` §2 (ii)) — the re-claim RESTARTED its three IST days: its ONE post-hold child failing (past the lease again)
      // does ⛔ burn it under today's cutoff …
      const later = new Date(now.getTime() + STAFF_EMAIL_SEND_LEASE_MS + 1);
      expect(await expireExhaustedSuspicionStaffEmails(client, { cutoff, now: later, allow: [PARIWAR_A] })).toEqual([]);
      // … and three IST days after the re-claim it is given up like any row.
      const threeDays = new Date(now.getTime() + 3 * 24 * 60 * MIN);
      expect(
        await expireExhaustedSuspicionStaffEmails(client, { cutoff: suspicionStaffEmailReclaimCutoff(threeDays), now: threeDays, allow: [PARIWAR_A] }),
      ).toEqual([{ claimCaseId: c, recipientUserId: u }]);
    });

    it('⭐ round 4 — ONLY a PARKED row\'s re-claim restarts `aging_since`; another job\'s take-over past the lease keeps it', async () => {
      const { client } = getTx();
      const c = await refused(client);
      const [parked, crashed] = [await admin(client), await admin(client)];
      const now = new Date();
      const old = new Date(now.getTime() - 4 * 24 * 60 * MIN);
      const stale = new Date(now.getTime() - 2 * STAFF_EMAIL_SEND_LEASE_MS);
      await attemptingRow(client, c, parked, { createdAt: old, claimedAt: stale, job: SUSPICION_STAFF_EMAIL_PARKED_BY, detail: 'held:x' });
      await attemptingRow(client, c, crashed, { createdAt: old, claimedAt: stale, job: 'job-crashed', detail: 'held:x' });
      expect(await begin(client, c, parked, { jobId: 'job-p', now })).toMatchObject({ kind: 'begun' });
      expect(await begin(client, c, crashed, { jobId: 'job-c', now })).toMatchObject({ kind: 'begun' });
      const { rows } = await client.query<{ recipient_user_id: string; aging_since: Date }>(
        `SELECT recipient_user_id, aging_since FROM claim_suspicion_staff_emails WHERE claim_case_id = $1`,
        [c],
      );
      expect(rows.find((r) => r.recipient_user_id === parked)!.aging_since.getTime()).toBe(now.getTime());
      expect(rows.find((r) => r.recipient_user_id === crashed)!.aging_since.getTime()).toBe(old.getTime());
    });

    it('⭐ round 4 — a parked row INSIDE the lease (clock skew) is still re-claimed by another job — the `parked` bypass, ⛔ the lease, admits it', async () => {
      const { client } = getTx();
      const c = await refused(client);
      const u = await admin(client);
      const now = new Date();
      await attemptingRow(client, c, u, { claimedAt: now, job: SUSPICION_STAFF_EMAIL_PARKED_BY, detail: 'held:x' });
      expect(await begin(client, c, u, { jobId: 'job-other', now })).toMatchObject({ kind: 'begun', attemptCount: 2 });
      expect(await rowsOf(client, c)).toMatchObject([{ claimed_by_job: 'job-other' }]);
    });
  });
});
