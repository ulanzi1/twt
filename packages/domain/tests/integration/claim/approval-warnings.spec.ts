// Story 6.23a — the nominee-change WARNINGS, the ONE approval rule, its record, the final words and the late reason, at
// the DOMAIN, on real rows (Task 10; AC1, AC3, AC4, AC7). Each test in its own rolled-back transaction, under a FRESH
// Pariwar (Trap 18). Fixture dates are RELATIVE to now (Trap 5): a recent change `now − 30 days`, an old one ≥ 200 days
// back; the exact 90 / 91 boundary is the pure test's.
//
//   · AC1 — the date and the determination derivations agree on a post-death claim; `-239`'s ground holds / refuses;
//           a stale determination ⇒ `awaiting_determination`; the anchor (a refile's; a released claim excluded);
//   · AC3 — NW6's four refusals in order, ⛔ nothing written; the approval keeps its REAL reason + ONE record row with
//           exactly the current keys; ⛔ no row with ⛔ no warning; atomic; deny / escalate unchanged; Trap 16;
//   · AC4 — NW7's arms (a record row, a warning now, a late reason whose warning has gone; awaiting); others unchanged;
//   · AC7 — NW14 in `verifier_approved`, `reversed` (fact 3's path) and `state_trustee_approved` (`-280`); two late
//           reasons ⇒ two rows; every refusal; `nothing_uncovered` judged per recorder (`-279` A1).

import { randomUUID } from 'node:crypto';

import { and, eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { addCalendarDays, istDateOf } from '../../../src/cycle-calendar/holiday-resolver.js';
import {
  ApprovalWarningReasonRequiredError,
  ClaimDecisionNotRevisableError,
  DeathCertificateAcceptanceRequiredError,
  LateWarningReasonRefusedError,
  PostDeathRefusalUngroundedError,
  WarningReasonUnavailableError,
  WarningReasonUngroundedError,
  addApprovalWarningReason,
  adjudicateClaim,
  escalateClaim,
  getClaimWarningAnchor,
  isPostDeathVersion,
  lateKeysUncoveredFor,
  projectClaimState,
  readClaimApprovalWarnings,
  recordLateWarningReason,
  replaceApprovalWarningReason,
  reviseDecision,
  uncoveredKeys,
  versionStandsAt,
} from '../../../src/claim/index.js';
import { claimId as toClaimId, memberId as toMemberId, pariwarId as toPariwarId, type ClaimId, type PariwarId } from '../../../src/ids/index.js';
import { listNomineeDeclarationVersions } from '../../../src/nominee/declaration-history.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import {
  driveClaimTo,
  enterAppScope,
  seedAcceptedDeathCertificate,
  seedClaim,
  seedNomineeDeclaration,
  seedNomineeDetermination,
  seedNomineeNameCheck,
} from '../_helpers.js';

const DA = 'd1d1d1d1-0000-4000-8000-000000000001';
const PA = 'a1a1a1a1-0000-4000-8000-000000000002';
const SA = '5a5a5a5a-0000-4000-8000-000000000003';
const DAY = 86_400_000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY);
const istDaysAgo = (n: number) => addCalendarDays(istDateOf(new Date()), -n);
const GENERIC = 'warnings_reviewed';

type Client = ReturnType<typeof getTx>['client'];
type Tx = ReturnType<typeof getTx>['tx'];

interface Ctx {
  client: Client;
  tx: Tx;
  pid: PariwarId;
  cid: ClaimId;
  mid: string;
}

/**
 * A claim in `verifier_review` for a deceased whose nominee declarations were made at `declaredAt` (each a
 * two-nominee declaration — a NEW version per rank each time), with an accepted certificate, a determination against
 * `certificateDate` (marks computed per D6), a passing name check and a contact record.
 */
async function claimWith(opts: { declaredAt: Date[]; certificateDate?: string }): Promise<Ctx> {
  const { client, tx } = getTx();
  const pid = toPariwarId(randomUUID());
  await enterAppScope(client, pid);
  const cid = toClaimId(randomUUID());
  const mid = randomUUID();
  await driveClaimTo(client, pid, cid, mid, 'verifier_review');
  for (const at of opts.declaredAt) {
    await seedNomineeDeclaration(tx, pid, mid, { declaredAt: at, nominees: [{}, {}] });
  }
  await determine({ client, tx, pid, cid, mid }, opts.certificateDate);
  await seedNomineeNameCheck(client, pid, cid);
  return { client, tx, pid, cid, mid };
}

/** (Re-)accept the certificate with `date` and record a determination whose marks agree with it (D6). */
async function determine(ctx: Ctx, date: string = addCalendarDays(istDateOf(new Date()), 1)): Promise<void> {
  await seedAcceptedDeathCertificate(ctx.client, { pariwarId: ctx.pid, claimCaseId: ctx.cid, date });
  const versions = await listNomineeDeclarationVersions(ctx.tx, ctx.pid, toMemberId(ctx.mid));
  await seedNomineeDetermination(ctx.client, ctx.pid, ctx.cid, {
    certificateDate: date,
    marks: versions.map((v) => ({
      versionId: v.versionId,
      mark: versionStandsAt(v.effectiveAt, date) ? ('stands' as const) : ('discarded' as const),
    })),
  });
}

/** Re-review the certificate to `date` ⛔ without redetermining — the determination goes STALE. */
const rereviewOnly = (ctx: Ctx, date: string) =>
  seedAcceptedDeathCertificate(ctx.client, { pariwarId: ctx.pid, claimCaseId: ctx.cid, date });

const approve = (ctx: Ctx, over: Partial<Parameters<typeof adjudicateClaim>[1]> = {}) =>
  adjudicateClaim(ctx.client, {
    claimCaseId: ctx.cid,
    pariwarId: ctx.pid,
    outcome: 'approved',
    reasonCode: 'r5_d_natural_death',
    rationaleCiphertext: 'enc:v1:why',
    actorId: DA,
    actorDisplay: 'Anita (District Admin)',
    actor: 'operator',
    ...over,
  });

const lateReason = (ctx: Ctx, actorId = DA, over: Partial<Parameters<typeof recordLateWarningReason>[1]> = {}) =>
  recordLateWarningReason(ctx.client, {
    claimCaseId: ctx.cid,
    pariwarId: ctx.pid,
    warningReasonCode: GENERIC,
    noteCiphertext: 'enc:v1:late-note',
    actorId,
    actorDisplay: actorId === DA ? 'Anita (District Admin)' : 'Pariwar Admin',
    ...over,
  });

async function emit(ctx: Ctx, from: string, to: string, eventType: string, extra: Record<string, unknown> = {}) {
  await projectClaimState(ctx.client, {
    claimCaseId: ctx.cid,
    pariwarId: ctx.pid,
    deceasedMemberId: toMemberId(ctx.mid),
    intakeChannels: ['member_app'],
    claimantActorId: null,
    eventType: eventType as never,
    payload: { from_state: from, to_state: to, trigger: 'test', actor: 'system', ...extra } as never,
    actorId: null,
  });
}

async function records(ctx: Ctx) {
  return ctx.tx
    .select()
    .from(schema.claimWarningApprovals)
    .where(and(eq(schema.claimWarningApprovals.pariwarId, ctx.pid), eq(schema.claimWarningApprovals.claimCaseId, ctx.cid)));
}

async function decisions(ctx: Ctx) {
  return ctx.tx
    .select()
    .from(schema.claimVerifierDecisions)
    .where(and(eq(schema.claimVerifierDecisions.pariwarId, ctx.pid), eq(schema.claimVerifierDecisions.claimCaseId, ctx.cid)));
}

async function claimState(ctx: Ctx): Promise<string> {
  const [row] = await ctx.tx
    .select({ s: schema.claims.currentState })
    .from(schema.claims)
    .where(and(eq(schema.claims.pariwarId, ctx.pid), eq(schema.claims.claimCaseId, ctx.cid)));
  return row!.s;
}

async function eventCount(ctx: Ctx): Promise<number> {
  const { rows } = await ctx.client.query<{ n: number }>('SELECT count(*)::int AS n FROM events_log WHERE stream_id = $1', [ctx.cid]);
  return rows[0]!.n;
}

/** Run `fn` in a savepoint and roll it back — a refusal must leave ⛔ nothing. */
async function refused(ctx: Ctx, fn: () => Promise<unknown>, match: (e: unknown) => boolean): Promise<void> {
  await ctx.client.query('SAVEPOINT refused');
  await expect(fn()).rejects.toSatisfy(match);
  await ctx.client.query('ROLLBACK TO SAVEPOINT refused');
}

// Post-death: old declaration (stands), a change 30 days ago, a certificate dated 45 days ago ⇒ the change is
// BOTH post-death AND recent. ⛔ Old: 300 + 250 days back, a certificate tomorrow ⇒ ⛔ no warning.
const postDeathClaim = () => claimWith({ declaredAt: [daysAgo(300), daysAgo(30)], certificateDate: istDaysAgo(45) });
const quietClaim = () => claimWith({ declaredAt: [daysAgo(400), daysAgo(300), daysAgo(200)] });

describe.skipIf(!hasDatabase)('Story 6.23a — the nominee-change warnings at the domain (:5433)', { timeout: 20000 }, () => {
  setupLiveDb();

  // ── AC1 ─────────────────────────────────────────────────────────────────────────────────────────────────────
  describe('AC1 — the warnings, defined once', () => {
    it('⭐ on a post-death claim the DATE and the DETERMINATION derivations flag the SAME versions, and `-239`\'s ground holds', async () => {
      const ctx = await postDeathClaim();
      const w = await readClaimApprovalWarnings(ctx.tx, ctx.pid, ctx.cid);
      expect(w.postDeath).toBe('evaluated');
      const versions = await listNomineeDeclarationVersions(ctx.tx, ctx.pid, toMemberId(ctx.mid));
      const byDate = versions
        .filter((v) => isPostDeathVersion({ source: v.source as 'member', effectiveAt: v.effectiveAt }, istDaysAgo(45)))
        .map((v) => `post_death_version:${v.versionId}`)
        .sort();
      expect(byDate).toHaveLength(2);
      expect(w.keys.filter((k) => k.startsWith('post_death_version:'))).toEqual(byDate);
      expect(w.kinds).toEqual(['post_death_version', 'recent_nominee_change']);
      // `-239`'s refusal is grounded on the same claim (a deny with its code passes the ground check).
      await approveOrDenyPostDeath(ctx);
    });

    it('on a pre-death claim neither derivation flags, and the `-239` grounding refuses', async () => {
      const ctx = await quietClaim();
      const w = await readClaimApprovalWarnings(ctx.tx, ctx.pid, ctx.cid);
      expect(w).toMatchObject({ postDeath: 'evaluated', kinds: [], keys: [] });
      await refused(
        ctx,
        () => adjudicateClaim(ctx.client, { ...denyInput(ctx), reasonCode: 'post_death_nominee_change' }),
        (e) => e instanceof PostDeathRefusalUngroundedError,
      );
    });

    it('`-279` A3 — a determination made against an EARLIER review ⇒ `awaiting_determination`, ⛔ no post-death key', async () => {
      const ctx = await quietClaim();
      await rereviewOnly(ctx, istDaysAgo(250)); // would discard the 200-day version — but ⛔ nobody redetermined
      const w = await readClaimApprovalWarnings(ctx.tx, ctx.pid, ctx.cid);
      expect(w.postDeath).toBe('awaiting_determination');
      expect(w.keys.some((k) => k.startsWith('post_death_version:'))).toBe(false);
    });

    it('the reasons ride the same read — the generic first, then the Pariwar\'s active rows', async () => {
      const ctx = await quietClaim();
      const added = await addApprovalWarningReason(ctx.client, {
        pariwarId: ctx.pid,
        label: 'Family confirmed in person',
        whenToUse: 'Use when the inspector met the family.',
        actorId: SA,
        actorDisplay: 'Super Admin',
      });
      const w = await readClaimApprovalWarnings(ctx.tx, ctx.pid, ctx.cid);
      expect(w.reasonOptions[0]).toMatchObject({ code: GENERIC, reasonId: null, addedByDisplay: null });
      expect(w.reasonOptions.map((o) => o.code)).toContain(added.code);
    });

    it('⭐ Trap 3 — a refile anchors on the FIRST claim; a released earlier claim moves ⛔ nothing', async () => {
      const { client, tx } = getTx();
      const pid = toPariwarId(randomUUID());
      await enterAppScope(client, pid);
      const mid = randomUUID();
      await seedNomineeDeclaration(tx, pid, mid, { declaredAt: daysAgo(150) });
      const first = await seedClaim(tx, pid, { deceasedMemberId: mid, currentState: 'denied' });
      await client.query(`UPDATE claims SET created_at = now() - interval '100 days' WHERE claim_case_id = $1`, [first]);
      const cid = toClaimId(randomUUID());
      await driveClaimTo(client, pid, cid, mid, 'verifier_review');
      // 150 days back is 50 days before the FIRST claim ⇒ recent.
      const w = await readClaimApprovalWarnings(tx, pid, cid);
      expect(w.anchorFiledAt.getTime()).toBeLessThan(Date.now() - 99 * DAY);
      expect(w.kinds).toEqual(['recent_nominee_change']);
      // Code review round 3 — the timeline's anchor read is a THIRD copy of this predicate: held EQUAL, both arms.
      expect((await getClaimWarningAnchor(tx, pid, cid)).getTime()).toBe(w.anchorFiledAt.getTime());
      // The first claim released by an innocence finding ⇒ the anchor is this claim ⇒ ⛔ not recent.
      await tx.insert(schema.claimNomineeFindings).values({
        findingId: randomUUID() as never,
        claimCaseId: toClaimId(first),
        pariwarId: pid,
        kind: 'member_found_innocent',
        rank: null,
        recordedByActorId: 'investigator',
        recordedByDisplay: 'Investigator',
      });
      const after = await readClaimApprovalWarnings(tx, pid, cid);
      expect(after.kinds).toEqual([]);
      expect((await getClaimWarningAnchor(tx, pid, cid)).getTime()).toBe(after.anchorFiledAt.getTime());
      expect(after.anchorFiledAt.getTime()).toBeGreaterThan(w.anchorFiledAt.getTime());
    });
  });

  // ── AC3 ─────────────────────────────────────────────────────────────────────────────────────────────────────
  describe('AC3 — the rule at the District Admin\'s approval, and its record', () => {
    it('NW6 (2) a warning + ⛔ no warning reason ⇒ `warning_reason_required` (reason), ⛔ nothing written', async () => {
      const ctx = await postDeathClaim();
      const events = await eventCount(ctx);
      // A JS-level refusal leaves the transaction usable — so "⛔ nothing written" is checked IN it, ⛔ not after a rollback.
      await expect(approve(ctx)).rejects.toSatisfy(
        (e: unknown) => e instanceof ApprovalWarningReasonRequiredError && e.missing === 'reason' && e.kinds.length === 2,
      );
      expect(await decisions(ctx)).toHaveLength(0);
      expect(await records(ctx)).toHaveLength(0);
      expect(await eventCount(ctx)).toBe(events);
      expect(await claimState(ctx)).toBe('verifier_review');
    });

    it('NW6 (1) ⛔ no warning + a warning reason ⇒ `warning_reason_ungrounded`', async () => {
      const ctx = await quietClaim();
      await refused(ctx, () => approve(ctx, { warningReasonCode: GENERIC }), (e) => e instanceof WarningReasonUngroundedError);
    });

    it('NW6 (3) an unknown code, or one REPLACED since the page loaded (Trap 16) ⇒ `warning_reason_unavailable`', async () => {
      const ctx = await postDeathClaim();
      await refused(ctx, () => approve(ctx, { warningReasonCode: 'awr_00000000' }), (e) => e instanceof WarningReasonUnavailableError);
      const r = await addApprovalWarningReason(ctx.client, { pariwarId: ctx.pid, label: 'Old words', whenToUse: 'Old.', actorId: SA, actorDisplay: 'Super Admin' });
      const seen = (await readClaimApprovalWarnings(ctx.tx, ctx.pid, ctx.cid)).reasonOptions.map((o) => o.code);
      expect(seen).toContain(r.code);
      await replaceApprovalWarningReason(ctx.client, { pariwarId: ctx.pid, reasonId: r.reasonId, label: 'New words', whenToUse: 'New.', actorId: SA, actorDisplay: 'Super Admin' });
      await refused(ctx, () => approve(ctx, { warningReasonCode: r.code }), (e) => e instanceof WarningReasonUnavailableError);
    });

    it('NW6 (4) an active reason + ⛔ no note ⇒ `warning_reason_required` (note)', async () => {
      const ctx = await postDeathClaim();
      await refused(
        ctx,
        () => approve(ctx, { warningReasonCode: GENERIC, rationaleCiphertext: null }),
        (e) => e instanceof ApprovalWarningReasonRequiredError && e.missing === 'note',
      );
    });

    it('⭐ a warning + the generic + a note ⇒ approved with its REAL reason, and ONE record row with exactly the current keys', async () => {
      const ctx = await postDeathClaim();
      const keys = (await readClaimApprovalWarnings(ctx.tx, ctx.pid, ctx.cid)).keys;
      const result = await approve(ctx, { warningReasonCode: GENERIC });
      expect(result.approvalWarningKinds).toEqual(['post_death_version', 'recent_nominee_change']);
      expect(result.decision.reasonCode).toBe('r5_d_natural_death');
      const rows = await records(ctx);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        step: 'district_admin_approval',
        verifierDecisionId: result.decision.decisionId,
        reasonCode: GENERIC,
        reasonId: null,
        noteCiphertext: null,
        recordedByActor: DA,
        recordedByDisplay: 'Anita (District Admin)',
        deceasedMemberId: ctx.mid,
      });
      expect([...rows[0]!.coveredKeys].sort()).toEqual([...keys]);
      expect(keys).toHaveLength(4); // two ranks × two kinds — ONE reason, ONE note
    });

    it('a Super Admin\'s reason is recorded with its id', async () => {
      const ctx = await postDeathClaim();
      const r = await addApprovalWarningReason(ctx.client, { pariwarId: ctx.pid, label: 'Seen in person', whenToUse: 'Use when seen.', actorId: SA, actorDisplay: 'Super Admin' });
      await approve(ctx, { warningReasonCode: r.code });
      expect((await records(ctx))[0]).toMatchObject({ reasonCode: r.code, reasonId: r.reasonId });
    });

    it('⛔ no record row when ⛔ no warning shows', async () => {
      const ctx = await quietClaim();
      await approve(ctx);
      expect(await records(ctx)).toHaveLength(0);
    });

    it('atomic: a failure AFTER the record insert leaves ⛔ neither the decision nor the record', async () => {
      const ctx = await postDeathClaim();
      await ctx.client.query('RESET ROLE');
      await ctx.client.query(`CREATE FUNCTION pg_temp.fail_cwa() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'forced'; END; $$`);
      await ctx.client.query('CREATE TRIGGER cwa_forced_failure AFTER INSERT ON claim_warning_approvals FOR EACH ROW EXECUTE FUNCTION pg_temp.fail_cwa()');
      await enterAppScope(ctx.client, ctx.pid);
      await refused(ctx, () => approve(ctx, { warningReasonCode: GENERIC }), (e) => /forced/.test(String((e as { cause?: Error }).cause?.message ?? (e as Error).message)));
      expect(await decisions(ctx)).toHaveLength(0);
      expect(await records(ctx)).toHaveLength(0);
    });

    it('a deny (incl. `post_death_nominee_change`) and an escalate on a warned claim are ⛔ never gated', async () => {
      const a = await postDeathClaim();
      await adjudicateClaim(a.client, { ...denyInput(a), reasonCode: 'post_death_nominee_change' });
      expect(await claimState(a)).toBe('denied');
      const b = await postDeathClaim();
      await escalateClaim(b.client, { ...denyInput(b), outcome: 'escalated', reasonCode: 'r9_routed_to_voting' });
      expect((await decisions(b))[0]!.outcome).toBe('escalated');
      expect(await records(b)).toHaveLength(0);
    });

    it('a warning reason on a DENY is refused (the contract\'s 400 is the real enforcement)', async () => {
      const ctx = await postDeathClaim();
      await refused(ctx, () => adjudicateClaim(ctx.client, { ...denyInput(ctx), warningReasonCode: GENERIC }), (e) => e instanceof WarningReasonUngroundedError);
    });
  });

  // ── AC4 ─────────────────────────────────────────────────────────────────────────────────────────────────────
  describe('AC4 — an approval on a warned claim is never revised', () => {
    const revise = (ctx: Ctx) =>
      reviseDecision(ctx.client, {
        claimCaseId: ctx.cid,
        pariwarId: ctx.pid,
        outcome: 'approved',
        reasonCode: 'r8_90pct_met',
        rationaleCiphertext: 'enc:v1:new',
        actorId: DA,
        actorDisplay: 'Anita (District Admin)',
        actor: 'operator',
      });
    const notRevisable = (reason: string) => (e: unknown) => e instanceof ClaimDecisionNotRevisableError && e.reason === reason;

    it('a claim with a District Admin record row ⇒ `warning_approval_final`', async () => {
      const ctx = await postDeathClaim();
      await approve(ctx, { warningReasonCode: GENERIC });
      await refused(ctx, () => revise(ctx), notRevisable('warning_approval_final'));
    });

    it('a warning NOW after an un-warned approval ⇒ `warning_approval_final`', async () => {
      const ctx = await quietClaim();
      await approve(ctx);
      await determine(ctx, istDaysAgo(250)); // the 200-day versions are now post-death
      await refused(ctx, () => revise(ctx), notRevisable('warning_approval_final'));
    });

    it('`-279` A8 — a late reason whose warning has since GONE still makes the approval final', async () => {
      const ctx = await quietClaim();
      await approve(ctx);
      await determine(ctx, istDaysAgo(250));
      await lateReason(ctx);
      await determine(ctx); // back to tomorrow — ⛔ no warning shows now
      expect((await readClaimApprovalWarnings(ctx.tx, ctx.pid, ctx.cid)).kinds).toEqual([]);
      await refused(ctx, () => revise(ctx), notRevisable('warning_approval_final'));
    });

    it('`-279` A3 — a stale determination ⇒ `warnings_not_current`', async () => {
      const ctx = await quietClaim();
      await approve(ctx);
      // ⚠ Story 6.26b (RD19 (iii)) — a SAME-date re-review (only the register check moves): a new review id makes the
      // determination stale with ⛔ no key. A re-review to ANOTHER date would now raise `inspection_death_date_differs`
      // (the family's date stays the old one), and `reviseDecision` would answer `warning_approval_final` FIRST —
      // deleting this test's coverage instead of amending it.
      await seedAcceptedDeathCertificate(ctx.client, {
        pariwarId: ctx.pid,
        claimCaseId: ctx.cid,
        date: addCalendarDays(istDateOf(new Date()), 1),
        registerCheck: 'could_not_check',
      });
      expect((await readClaimApprovalWarnings(ctx.tx, ctx.pid, ctx.cid)).kinds).toEqual([]);
      await refused(ctx, () => revise(ctx), notRevisable('warnings_not_current'));
    });

    it('every other revise is unchanged — an un-warned approval with a current determination, and a denial', async () => {
      const ctx = await quietClaim();
      await approve(ctx);
      const r = await revise(ctx);
      expect(r.decision.reasonCode).toBe('r8_90pct_met');
      const d = await quietClaim();
      await adjudicateClaim(d.client, denyInput(d));
      const rd = await reviseDecision(d.client, { ...denyInput(d), outcome: 'denied', reasonCode: 'other', rationaleCiphertext: 'enc:v1:other' });
      expect(rd.decision.outcome).toBe('denied');
    });
  });

  // ── AC7 ─────────────────────────────────────────────────────────────────────────────────────────────────────
  describe('AC7 — the District Admin answers a late warning (NW14)', () => {
    it('⭐ in `verifier_approved`: ONE row covering ALL current keys, ⛔ no event, ⛔ no state change; a second late warning ⇒ a SECOND row', async () => {
      const ctx = await quietClaim();
      await approve(ctx);
      await determine(ctx, istDaysAgo(250));
      const w1 = await readClaimApprovalWarnings(ctx.tx, ctx.pid, ctx.cid);
      // Two post-death versions + (Story 6.26b, RD19 (i)) the inspection's family date (tomorrow) now differs from the
      // re-reviewed certificate ⇒ `inspection_death_date_differs` — the correct behaviour.
      expect(uncoveredKeys(w1)).toHaveLength(3);
      expect(w1.kinds).toEqual(['post_death_version', 'inspection_death_date_differs']);
      const events = await eventCount(ctx);
      const r1 = await lateReason(ctx);
      expect(r1.coveredKeyCount).toBe(3);
      expect(await eventCount(ctx)).toBe(events);
      expect(await claimState(ctx)).toBe('verifier_approved');
      expect(uncoveredKeys(await readClaimApprovalWarnings(ctx.tx, ctx.pid, ctx.cid))).toEqual([]);
      const [row] = await records(ctx);
      expect(row).toMatchObject({ step: 'district_admin_late_reason', noteCiphertext: 'enc:v1:late-note', recordedByDisplay: 'Anita (District Admin)' });
      // A second late warning (an earlier date discards the 300-day versions too).
      await determine(ctx, istDaysAgo(350));
      const r2 = await lateReason(ctx, DA, { noteCiphertext: 'enc:v1:second-note' });
      // Four post-death versions + the SAME date key (per inspection — `-288` K4).
      expect(r2.coveredKeyCount).toBe(5);
      const rows = await records(ctx);
      expect(rows).toHaveLength(2);
      expect(rows.find((r) => r.recordId === r1.recordId)?.noteCiphertext).toBe('enc:v1:late-note');
    });

    it('⭐ fact 3 — in `reversed` (approved → final vote denied → appeal reversed → re-reviewed and redetermined)', async () => {
      const ctx = await quietClaim();
      await approve(ctx);
      await emit(ctx, 'verifier_approved', 'state_trustee_freeze', 'claim.state_trustee_frozen');
      await emit(ctx, 'state_trustee_freeze', 'denied', 'claim.state_trustee_denied');
      await emit(ctx, 'denied', 'appeal_stage_1', 'claim.appeal_stage1_initiated');
      await emit(ctx, 'appeal_stage_1', 'reversed', 'claim.appeal_stage1_reviewed', { decision: 'reversed' });
      expect(await claimState(ctx)).toBe('reversed');
      await determine(ctx, istDaysAgo(250));
      await lateReason(ctx);
      expect(await records(ctx)).toHaveLength(1);
    });

    it('⭐ `-280` — in `state_trustee_approved`, a late key covered ONLY by an R9 voter\'s own reason is still the District Admin\'s to answer', async () => {
      const ctx = await quietClaim();
      await approve(ctx);
      await determine(ctx, istDaysAgo(250));
      await lateReason(ctx, PA); // the Pariwar Admin (an R9 voter) records the only late reason
      await emit(ctx, 'verifier_approved', 'state_trustee_freeze', 'claim.state_trustee_frozen');
      await emit(ctx, 'state_trustee_freeze', 'state_trustee_approved', 'claim.state_trustee_approved');
      const w = await readClaimApprovalWarnings(ctx.tx, ctx.pid, ctx.cid);
      expect(uncoveredKeys(w)).toEqual([]); // covered for everyone …
      // Two post-death versions + (Story 6.26b, RD19 (i)) the inspection's differing family date.
      expect(lateKeysUncoveredFor(w, DA)).toHaveLength(3); // … but ⛔ by the District Admin's own record
      expect(uncoveredKeys(w, { excludeLateReasonsRecordedBy: PA })).toHaveLength(3); // ⛔ for the PA's own approval
      await lateReason(ctx, DA);
      expect(await records(ctx)).toHaveLength(2);
    });

    it('`-279` A1 — per recorder: another person\'s late reason does ⛔ not block; the recorder\'s OWN earlier row does', async () => {
      const ctx = await quietClaim();
      await approve(ctx);
      await determine(ctx, istDaysAgo(250));
      await lateReason(ctx, PA);
      await lateReason(ctx, SA); // a THIRD person is ⛔ blocked by the PA's row
      await refused(ctx, () => lateReason(ctx, PA), refusedLate('nothing_uncovered'));
    });

    it('each refusal answers its own code', async () => {
      // ⛔ no late key at all
      const quiet = await quietClaim();
      await approve(quiet);
      await refused(quiet, () => lateReason(quiet), refusedLate('nothing_uncovered'));
      // a stale determination — the certificate gate's own 409
      await rereviewOnly(quiet, istDaysAgo(250));
      await refused(quiet, () => lateReason(quiet), (e) => e instanceof DeathCertificateAcceptanceRequiredError && e.reason === 'determination_stale');
      // ⛔ no live determination (as after an applied correction) — `determination_required`
      await quiet.client.query(
        `UPDATE nominee_determinations SET superseded_at = now(), superseded_reason = 'correction_applied' WHERE claim_case_id = $1 AND superseded_at IS NULL`,
        [quiet.cid],
      );
      await refused(quiet, () => lateReason(quiet), refusedLate('determination_required'));

      // an inactive reason
      const c = await quietClaim();
      await approve(c);
      await determine(c, istDaysAgo(250));
      await refused(c, () => lateReason(c, DA, { warningReasonCode: 'awr_00000000' }), (e) => e instanceof WarningReasonUnavailableError);

      // ⛔ no District Admin approval — a claim the District Admin DENIED, then reversed on appeal
      const d = await quietClaim();
      await adjudicateClaim(d.client, denyInput(d));
      await emit(d, 'denied', 'appeal_stage_1', 'claim.appeal_stage1_initiated');
      await emit(d, 'appeal_stage_1', 'reversed', 'claim.appeal_stage1_reviewed', { decision: 'reversed' });
      await refused(d, () => lateReason(d), refusedLate('no_district_admin_approval'));

      // a state outside the four — `approved` (the cycle commit)
      const e = await quietClaim();
      await approve(e);
      await determine(e, istDaysAgo(250));
      await emit(e, 'verifier_approved', 'state_trustee_freeze', 'claim.state_trustee_frozen');
      await emit(e, 'state_trustee_freeze', 'state_trustee_approved', 'claim.state_trustee_approved');
      await emit(e, 'state_trustee_approved', 'approved', 'claim.approved');
      await refused(e, () => lateReason(e), refusedLate('not_recordable_state'));
    });
  });
});

const refusedLate = (reason: string) => (e: unknown) => e instanceof LateWarningReasonRefusedError && e.reason === reason;

function denyInput(ctx: Ctx) {
  return {
    claimCaseId: ctx.cid,
    pariwarId: ctx.pid,
    outcome: 'denied' as const,
    reasonCode: 'other' as const,
    rationaleCiphertext: 'enc:v1:deny',
    actorId: DA,
    actorDisplay: 'Anita (District Admin)',
    actor: 'operator' as const,
  };
}

async function approveOrDenyPostDeath(ctx: Ctx): Promise<void> {
  await ctx.client.query('SAVEPOINT grounded');
  await adjudicateClaim(ctx.client, { ...denyInput(ctx), reasonCode: 'post_death_nominee_change' });
  await ctx.client.query('ROLLBACK TO SAVEPOINT grounded');
}
