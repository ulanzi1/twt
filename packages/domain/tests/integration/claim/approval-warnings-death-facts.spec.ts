// Story 6.26b — the three DEATH-FACT warning kinds at the DOMAIN, on real rows (Task 10; AC8; GI6, GI17, GI18 as
// amended by `-283` A3, `-288` K1/K4, `-289` L1/L3; RD4, RD6, RD9; Traps 2, 4, 5, 8, 16, 17). Each test in its own
// rolled-back transaction under a FRESH Pariwar.
//   · each kind: present / absent, its currency (a replaced upload), both readers agreeing (the live bulk-vs-single
//     parity — Trap 2), and the approval it asks a reason of — from the District Admin AND a later approver;
//   · the LATE wait for GI6, GI17 and GI18 (`-277` Q3 B) — the wait is a key comparison, ⛔ not an order of timestamps,
//     so it is provable inside one transaction (the queue's ORDERING legs are `correction-queue-late-inspection.spec.ts`);
//   · `-288` K4 (a pinned behaviour, ⛔ a defect): a re-review to ANOTHER differing date keeps GI6's key covered;
//   · `-289` L3: an inherited visit's differing family date warns while the claim has ⛔ no own full visit, and leaves
//     the set once it has one;
//   · RD4 / `-285`: a key that appears during R9 makes every earlier approve vote short — after the District Admin's
//     wait where they approved, ALONE on the R9-first path.

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { addCalendarDays, istDateOf } from '../../../src/cycle-calendar/holiday-resolver.js';
import {
  ApprovalWarningReasonRequiredError,
  LateWarningReasonRequiredError,
  R9ApproveVotesNeedWarningReasonError,
  adjudicateClaim,
  castR9Vote,
  finalizeR9Outcome,
  lateWarningKeys,
  openR9VotingSession,
  prepareR9VoteCiphertext,
  readClaimApprovalWarnings,
  readClaimApprovalWarningsBulk,
  recordLateWarningReason,
  voteOnFrozenClaim,
} from '../../../src/claim/index.js';
import { claimId as toClaimId, pariwarId as toPariwarId, type ClaimId, type PariwarId } from '../../../src/ids/index.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import {
  currentUploadIdOf,
  driveClaimTo,
  enterAppScope,
  fixtureCurrentAcceptedDate,
  seedAcceptedDeathCertificate,
  seedClauseVersion,
  seedDeathCertificate,
  seedGroundInspection,
  seedNomineeDetermination,
  seedNomineeNameCheck,
  seedRoleGrant,
} from '../_helpers.js';

const DA = 'd2d2d2d2-0000-4000-8000-000000000001';
const PA = 'a2a2a2a2-0000-4000-8000-000000000002';
const V1 = 'b2b2b2b2-0000-4000-8000-000000000011';
const V2 = 'b2b2b2b2-0000-4000-8000-000000000012';
const V3 = 'b2b2b2b2-0000-4000-8000-000000000013';
const PANEL = [V1, V2, V3];
const R9_CLAUSE = 'niy.special-death.r9';
const GENERIC = 'warnings_reviewed';
const istDaysAgo = (n: number) => addCalendarDays(istDateOf(new Date()), -n);

type Client = ReturnType<typeof getTx>['client'];
type Tx = ReturnType<typeof getTx>['tx'];
interface Ctx {
  client: Client;
  tx: Tx;
  pid: PariwarId;
  cid: ClaimId;
  mid: string;
}

/** As the superuser, before scope: the R9 clause and the panel's grants in `pid`. */
async function seedR9(tx: Tx, pid: PariwarId): Promise<void> {
  await seedClauseVersion(tx, pid, {
    clauseId: R9_CLAUSE,
    payload: { rule_code: 'R9', voting_required: true, majority_required: true, on_pass: 'route_r9_voting' },
  });
  for (const uid of PANEL) await seedRoleGrant(tx, pid, { userId: uid, role: 'pariwar_admin', scopeDimension: 'pariwar', scopeValue: pid });
}

/** A fully approvable claim in `verifier_review` under a FRESH Pariwar: the default fixtures (an accepted certificate
 *  — register `matches` unless given — a determination, a passing name check, a contact, and a completed inspection
 *  whose family date EQUALS the accepted date) ⇒ ⛔ no warning (GI15 [b]). */
async function claim(
  opts: { registerCheck?: 'matches' | 'does_not_match' | 'could_not_check'; r9?: boolean; inspection?: 'skip' } = {},
): Promise<Ctx> {
  const { client, tx } = getTx();
  const pid = toPariwarId(randomUUID());
  if (opts.r9) {
    await client.query('RESET ROLE');
    await seedR9(tx, pid);
  }
  await enterAppScope(client, pid);
  const cid = toClaimId(randomUUID());
  const mid = randomUUID();
  await driveClaimTo(client, pid, cid, mid, 'verifier_review');
  await seedNomineeNameCheck(client, pid, cid, {
    ...(opts.registerCheck ? { registerCheck: opts.registerCheck } : {}),
    ...(opts.inspection ? { inspection: opts.inspection } : {}),
  });
  return { client, tx, pid, cid, mid };
}

const warnings = (ctx: Ctx) => readClaimApprovalWarnings(ctx.tx, ctx.pid, ctx.cid);
const acceptedDate = async (ctx: Ctx) => (await fixtureCurrentAcceptedDate(ctx.client, ctx.pid, ctx.cid))!;

/** A second, completed assignment (the fixture's `force`), returning its id. */
async function inspect(
  ctx: Ctx,
  opts: { deathDate?: string; verdict?: 'matches' | 'does_not_match'; stage?: 'initial' | 'certificate_check' } = {},
): Promise<string> {
  return (await seedGroundInspection(ctx.client, ctx.pid, ctx.cid, { force: true, ...opts }))!;
}

/** Replace the certificate (a NEW current upload — the fixture's direct path) and accept it with the SAME date. */
async function replaceCertificate(ctx: Ctx): Promise<string> {
  const date = await acceptedDate(ctx);
  await seedDeathCertificate(ctx.client, { pariwarId: ctx.pid, claimCaseId: ctx.cid });
  await seedAcceptedDeathCertificate(ctx.client, { pariwarId: ctx.pid, claimCaseId: ctx.cid, date });
  return (await currentUploadIdOf(ctx.client, ctx.pid, ctx.cid))!;
}

/** Re-review the certificate (date / register check) and re-determine + re-check, so the gate is current again. */
async function rereviewAndRedetermine(
  ctx: Ctx,
  opts: { date?: string; registerCheck?: 'matches' | 'does_not_match' | 'could_not_check' },
): Promise<void> {
  const date = opts.date ?? (await acceptedDate(ctx));
  await seedAcceptedDeathCertificate(ctx.client, {
    pariwarId: ctx.pid,
    claimCaseId: ctx.cid,
    date,
    ...(opts.registerCheck ? { registerCheck: opts.registerCheck } : {}),
  });
  await seedNomineeDetermination(ctx.client, ctx.pid, ctx.cid, { certificateDate: date });
  await seedNomineeNameCheck(ctx.client, ctx.pid, ctx.cid, { reuseAccounts: true });
}

const approve = (ctx: Ctx, warningReasonCode: string | null = null) =>
  adjudicateClaim(ctx.client, {
    claimCaseId: ctx.cid, pariwarId: ctx.pid, outcome: 'approved', reasonCode: 'r5_d_natural_death',
    rationaleCiphertext: 'enc:v1:why', warningReasonCode, actorId: DA, actorDisplay: 'Anita (District Admin)', actor: 'operator',
  });
const vote = (ctx: Ctx, warningReasonCode: string | null = null) =>
  voteOnFrozenClaim(ctx.client, {
    claimCaseId: ctx.cid, pariwarId: ctx.pid, outcome: 'approved', reasonCode: null,
    rationaleCiphertext: warningReasonCode ? 'enc:v1:final-why' : null, warningReasonCode,
    actorId: PA, actorDisplay: 'Pariwar Admin', actor: 'trustee',
  });
const lateReason = (ctx: Ctx) =>
  recordLateWarningReason(ctx.client, {
    claimCaseId: ctx.cid, pariwarId: ctx.pid, warningReasonCode: GENERIC, noteCiphertext: 'enc:v1:late-note',
    actorId: DA, actorDisplay: 'Anita (District Admin)',
  });

async function routeAndOpen(ctx: Ctx): Promise<void> {
  await ctx.tx.insert(schema.claimStateTrusteeDecisions).values({
    claimCaseId: ctx.cid, pariwarId: ctx.pid, phase: 'routing', outcome: 'routed_to_r9', reasonCode: 'r9_special_case',
    rationaleCiphertext: null, actorId: PA, actorDisplay: 'Pariwar Admin',
  });
  await openR9VotingSession(ctx.client, {
    claimCaseId: ctx.cid, pariwarId: ctx.pid, clauseId: R9_CLAUSE, panelActorIds: PANEL,
    actorId: PA, actorDisplay: 'Pariwar Admin', actor: 'trustee',
  });
}
const cast = (ctx: Ctx, voter: string, warningReasonCode: string | null = null) =>
  castR9Vote(ctx.client, {
    claimCaseId: ctx.cid, pariwarId: ctx.pid, vote: 'approve',
    rationaleCiphertext: prepareR9VoteCiphertext(`enc:v1:vote-${voter.slice(-2)}`), warningReasonCode,
    actorId: voter, actorDisplay: `Panelist ${voter.slice(-2)}`, actor: 'trustee',
  });
const finalize = (ctx: Ctx) =>
  finalizeR9Outcome(ctx.client, { claimCaseId: ctx.cid, pariwarId: ctx.pid, actorId: V3, actorDisplay: 'Finalizer', actor: 'trustee' });

/** Run `fn` in a savepoint and roll it back — a refusal / wait must leave ⛔ nothing. */
async function refused(ctx: Ctx, fn: () => Promise<unknown>, match: (e: unknown) => boolean): Promise<void> {
  await ctx.client.query('SAVEPOINT refused');
  await expect(fn()).rejects.toSatisfy(match);
  await ctx.client.query('ROLLBACK TO SAVEPOINT refused');
}
const needsReason = (e: unknown) => e instanceof ApprovalWarningReasonRequiredError && e.missing === 'reason';
const waitsFor = (kinds: string[]) => (e: unknown) =>
  e instanceof LateWarningReasonRequiredError && [...e.kinds].join() === kinds.join();

/** Trap 2 — both readers derive the SAME keys, kinds and comparisons (`reasonOptions` is `[]` in bulk by design). */
async function expectParity(ctx: Ctx): Promise<void> {
  const single = await warnings(ctx);
  const bulk = (await readClaimApprovalWarningsBulk(ctx.tx, ctx.pid, [ctx.cid])).get(ctx.cid.toLowerCase())!;
  expect(bulk.keys).toEqual(single.keys);
  expect(bulk.kinds).toEqual(single.kinds);
  expect([...bulk.inspectionComparisons.entries()].sort()).toEqual([...single.inspectionComparisons.entries()].sort());
}

describe.skipIf(!hasDatabase)('Story 6.26b — the death-fact warnings at the domain (:5433)', { timeout: 30000 }, () => {
  setupLiveDb();

  it('GI15 [b] — the default fixtures raise ⛔ no warning, and the fixture inspection compares `same`', async () => {
    const ctx = await claim();
    const w = await warnings(ctx);
    expect(w.kinds).toEqual([]);
    expect([...w.inspectionComparisons.values()]).toEqual(['same']);
    await expectParity(ctx);
  });

  // ── GI6 ─────────────────────────────────────────────────────────────────────────────────────────────────────────
  describe('GI6 — inspection_death_date_differs', () => {
    it('a full visit whose family date ≠ the accepted date ⇒ the key (per inspection); = ⇒ ⛔ none; both readers agree; the District Admin AND a later approver each give a reason', async () => {
      const ctx = await claim();
      const same = await inspect(ctx, { deathDate: await acceptedDate(ctx) });
      const gid = await inspect(ctx, { deathDate: istDaysAgo(3) });
      const w = await warnings(ctx);
      expect(w.kinds).toEqual(['inspection_death_date_differs']);
      expect(w.keys).toEqual([`inspection_death_date_differs:${gid}`]);
      expect(w.inspectionComparisons.get(gid)).toBe('differs');
      expect(w.inspectionComparisons.get(same)).toBe('same');
      await expectParity(ctx);
      await refused(ctx, () => approve(ctx), needsReason);
      expect((await approve(ctx, GENERIC)).claimState).toBe('verifier_approved');
      await refused(ctx, () => vote(ctx), needsReason);
      expect((await vote(ctx, GENERIC)).claimState).toBe('state_trustee_approved');
    });

    it('⛔ no accepted certificate ⇒ ⛔ key and `not_compared`; a pre-6.26b accepted review (⛔ index) ⇒ ⛔ key and `not_indexed` (Trap 5)', async () => {
      const { client, tx } = getTx();
      const pid = toPariwarId(randomUUID());
      await enterAppScope(client, pid);
      const bare: Ctx = { client, tx, pid, cid: toClaimId(randomUUID()), mid: randomUUID() };
      await driveClaimTo(client, pid, bare.cid, bare.mid, 'verifier_review');
      await seedDeathCertificate(client, { pariwarId: pid, claimCaseId: bare.cid });
      const g = await inspect(bare, { deathDate: istDaysAgo(3) });
      expect((await warnings(bare)).keys).toEqual([]);
      expect((await warnings(bare)).inspectionComparisons.get(g)).toBe('not_compared');

      const old = await claim();
      const gid = await inspect(old, { deathDate: istDaysAgo(3) });
      await old.client.query('RESET ROLE');
      await old.client.query(
        'UPDATE claim_death_certificate_reviews SET accepted_date_index = NULL WHERE claim_case_id = $1 AND superseded_at IS NULL',
        [old.cid],
      );
      await enterAppScope(old.client, old.pid);
      const w = await warnings(old);
      expect(w.keys).toEqual([]);
      expect(w.inspectionComparisons.get(gid)).toBe('not_indexed');
      await expectParity(old);
    });

    it('⭐ `-283` A3 / Trap 8 — a certificate check\'s PRINTED date ≠ ⇒ the key; once its original is replaced ⇒ ⛔ key (`not_compared`)', async () => {
      const ctx = await claim();
      const gid = await inspect(ctx, { stage: 'certificate_check', deathDate: istDaysAgo(3) });
      expect((await warnings(ctx)).keys).toEqual([`inspection_death_date_differs:${gid}`]);
      await replaceCertificate(ctx);
      const w = await warnings(ctx);
      expect(w.keys).toEqual([]);
      expect(w.inspectionComparisons.get(gid)).toBe('not_compared');
      await expectParity(ctx);
    });

    it('⭐ `-288` K4 (pinned, ⛔ a defect) — after the District Admin approved over the key, a re-review to ANOTHER differing date keeps it covered: ⛔ no late key', async () => {
      // The claim's ONLY inspection is the differing one (a default fixture visit would ALSO differ after the move —
      // a NEW key, correctly late, which is ⛔ K4's case).
      const ctx = await claim({ inspection: 'skip' });
      await inspect(ctx, { deathDate: istDaysAgo(3) });
      await approve(ctx, GENERIC);
      await rereviewAndRedetermine(ctx, { date: istDaysAgo(5) });
      const w = await warnings(ctx);
      expect(w.kinds).toEqual(['inspection_death_date_differs']);
      expect(lateWarningKeys(w)).toEqual([]);
      expect((await vote(ctx, GENERIC)).claimState).toBe('state_trustee_approved');
    });

    it('a differing completion AFTER the District Admin approved ⇒ the final vote WAITS for their late reason, then proceeds', async () => {
      const ctx = await claim();
      await approve(ctx);
      await inspect(ctx, { deathDate: istDaysAgo(3) });
      await refused(ctx, () => vote(ctx, GENERIC), waitsFor(['inspection_death_date_differs']));
      await lateReason(ctx);
      expect((await vote(ctx, GENERIC)).claimState).toBe('state_trustee_approved');
    });
  });

  // ── GI17 ────────────────────────────────────────────────────────────────────────────────────────────────────────
  describe('GI17 — original_certificate_mismatch', () => {
    it('an own `does_not_match` against the CURRENT upload ⇒ the key; a reason from every approver; a replaced upload ⇒ ⛔ key (Trap 4)', async () => {
      const ctx = await claim();
      const gid = await inspect(ctx, { verdict: 'does_not_match' });
      expect((await warnings(ctx)).keys).toEqual([`original_certificate_mismatch:${gid}`]);
      await expectParity(ctx);
      await refused(ctx, () => approve(ctx), needsReason);
      await ctx.client.query('SAVEPOINT replaced');
      await replaceCertificate(ctx);
      expect((await warnings(ctx)).keys).toEqual([]);
      await ctx.client.query('ROLLBACK TO SAVEPOINT replaced');
      await approve(ctx, GENERIC);
      await refused(ctx, () => vote(ctx), needsReason);
    });

    it('a `does_not_match` completed AFTER the District Admin approved ⇒ the final vote WAITS', async () => {
      const ctx = await claim();
      await approve(ctx);
      await inspect(ctx, { verdict: 'does_not_match' });
      await refused(ctx, () => vote(ctx, GENERIC), waitsFor(['original_certificate_mismatch']));
      await lateReason(ctx);
      expect((await vote(ctx, GENERIC)).claimState).toBe('state_trustee_approved');
    });
  });

  // ── GI18 ────────────────────────────────────────────────────────────────────────────────────────────────────────
  describe('GI18 — register_check_mismatch (keyed by UPLOAD — `-288` K1, `-289` L1/L2)', () => {
    it('a `does_not_match` on the current upload ⇒ ONE key; a later `matches` re-review of the SAME upload ⛔ erases it; a second `does_not_match` is the SAME key; a replaced upload ⇒ ⛔ key', async () => {
      const ctx = await claim({ registerCheck: 'does_not_match' });
      const upload = (await currentUploadIdOf(ctx.client, ctx.pid, ctx.cid))!;
      expect((await warnings(ctx)).keys).toEqual([`register_check_mismatch:${upload}`]);
      await expectParity(ctx);
      await refused(ctx, () => approve(ctx), needsReason);
      // K1 — the District Admin re-checks the SAME certificate and records `matches`: the recorded mismatch STAYS.
      await rereviewAndRedetermine(ctx, { registerCheck: 'matches' });
      expect((await warnings(ctx)).keys).toEqual([`register_check_mismatch:${upload}`]);
      // L1 — re-stating the mismatch is the SAME single key.
      await rereviewAndRedetermine(ctx, { registerCheck: 'does_not_match' });
      expect((await warnings(ctx)).keys).toEqual([`register_check_mismatch:${upload}`]);
      await expectParity(ctx);
      // Only a replaced upload stops it.
      await replaceCertificate(ctx);
      expect((await warnings(ctx)).keys).toEqual([]);
    });

    it('a reason from every approver — the District Admin AND a later approver (code review round 2)', async () => {
      const ctx = await claim({ registerCheck: 'does_not_match' });
      await refused(ctx, () => approve(ctx), needsReason);
      expect((await approve(ctx, GENERIC)).claimState).toBe('verifier_approved');
      await refused(ctx, () => vote(ctx), needsReason);
      expect((await vote(ctx, GENERIC)).claimState).toBe('state_trustee_approved');
    });

    it('`could_not_check` / `matches` alone ⇒ ⛔ key', async () => {
      expect((await warnings(await claim({ registerCheck: 'could_not_check' }))).keys).toEqual([]);
      expect((await warnings(await claim({ registerCheck: 'matches' }))).keys).toEqual([]);
    });

    it('a FIRST `does_not_match` after the District Admin approved ⇒ late (the vote waits); a SECOND one after their answer ⇒ the same key, still covered (⛔ new wait)', async () => {
      const ctx = await claim();
      await approve(ctx);
      await rereviewAndRedetermine(ctx, { registerCheck: 'does_not_match' });
      await refused(ctx, () => vote(ctx, GENERIC), waitsFor(['register_check_mismatch']));
      await lateReason(ctx);
      await rereviewAndRedetermine(ctx, { registerCheck: 'does_not_match' });
      expect(lateWarningKeys(await warnings(ctx))).toHaveLength(1); // late against the APPROVAL row …
      expect((await vote(ctx, GENERIC)).claimState).toBe('state_trustee_approved'); // … but covered by the late reason
    });
  });

  // ── `-289` L3 — an inherited visit ──────────────────────────────────────────────────────────────────────────────
  describe('`-289` L3 — an INHERITED visit\'s differing family date', () => {
    /** A `-239`-refused SOURCE with a full visit whose family date is `familyDate`, and a REFILE with ⛔ own visit (its
     *  own certificate check completes it — FQ13), accepted with the fixture's date (tomorrow). */
    async function refile(familyDate: string): Promise<{ ctx: Ctx; sourceGid: string }> {
      const { client, tx } = getTx();
      const pid = toPariwarId(randomUUID());
      await enterAppScope(client, pid);
      const mid = randomUUID();
      const source = toClaimId(randomUUID());
      await driveClaimTo(client, pid, source, mid, 'verification_in_progress');
      await seedDeathCertificate(client, { pariwarId: pid, claimCaseId: source });
      const sourceGid = (await seedGroundInspection(client, pid, source, { deathDate: familyDate }))!;
      await client.query(
        `INSERT INTO claim_verifier_decisions (claim_case_id, pariwar_id, outcome, reason_code, rationale_ciphertext, actor_id, actor_display)
         VALUES ($1, $2, 'denied', 'post_death_nominee_change', 'enc:v1:r', $3, 'Anita (District Admin)')`,
        [source, pid, DA],
      );
      const ctx: Ctx = { client, tx, pid, cid: toClaimId(randomUUID()), mid };
      await driveClaimTo(client, pid, ctx.cid, mid, 'verifier_review');
      await seedNomineeNameCheck(client, pid, ctx.cid, { inspection: 'skip' });
      await seedGroundInspection(client, pid, ctx.cid, { stage: 'certificate_check' });
      return { ctx, sourceGid };
    }

    it('it warns while the refile has ⛔ own full visit; an own visit with the certificate\'s date ⇒ the inherited key LEAVES the set', async () => {
      const { ctx, sourceGid } = await refile(istDaysAgo(3));
      const w = await warnings(ctx);
      expect(w.keys).toEqual([`inspection_death_date_differs:${sourceGid}`]);
      expect(w.inspectionComparisons.get(sourceGid)).toBe('differs');
      await expectParity(ctx);
      await refused(ctx, () => approve(ctx), needsReason);
      await approve(ctx, GENERIC);
      await inspect(ctx, { deathDate: await acceptedDate(ctx) });
      const after = await warnings(ctx);
      expect(after.keys).toEqual([]);
      expect(after.inspectionComparisons.has(sourceGid)).toBe(false);
    });

    it('⚠ an own visit recording the SAME differing date is a NEW own key — late, so the District Admin answers again (GI6 / K4\'s per-inspection key — correct)', async () => {
      const { ctx, sourceGid } = await refile(istDaysAgo(3));
      await approve(ctx, GENERIC);
      const own = await inspect(ctx, { deathDate: istDaysAgo(3) });
      const w = await warnings(ctx);
      expect(w.keys).toEqual([`inspection_death_date_differs:${own}`]);
      expect(w.keys).not.toContain(`inspection_death_date_differs:${sourceGid}`);
      expect(lateWarningKeys(w)).toEqual([`inspection_death_date_differs:${own}`]);
    });

    it('an inherited `does_not_match` raises ⛔ GI17 key (its compared upload is the OTHER claim\'s)', async () => {
      const { client, tx } = getTx();
      const pid = toPariwarId(randomUUID());
      await enterAppScope(client, pid);
      const mid = randomUUID();
      const source = toClaimId(randomUUID());
      await driveClaimTo(client, pid, source, mid, 'verification_in_progress');
      await seedDeathCertificate(client, { pariwarId: pid, claimCaseId: source });
      const sourceGid = (await seedGroundInspection(client, pid, source, {
        deathDate: addCalendarDays(istDateOf(new Date()), 1),
        verdict: 'does_not_match',
      }))!;
      await client.query(
        `INSERT INTO claim_verifier_decisions (claim_case_id, pariwar_id, outcome, reason_code, rationale_ciphertext, actor_id, actor_display)
         VALUES ($1, $2, 'denied', 'post_death_nominee_change', 'enc:v1:r', $3, 'Anita (District Admin)')`,
        [source, pid, DA],
      );
      const ctx: Ctx = { client, tx, pid, cid: toClaimId(randomUUID()), mid };
      await driveClaimTo(client, pid, ctx.cid, mid, 'verifier_review');
      await seedNomineeNameCheck(client, pid, ctx.cid, { inspection: 'skip' });
      await seedGroundInspection(client, pid, ctx.cid, { stage: 'certificate_check' });
      const w = await warnings(ctx);
      // Non-vacuity (code review round 2): the inherited row WAS read — an empty `inspections` aggregate would also
      // give `kinds: []`. Its family date is the fixture's accepted date ⇒ `same`, so only GI17 is under test.
      expect(w.inspectionComparisons.get(sourceGid)).toBe('same');
      expect(w.kinds).toEqual([]);
    });
  });

  // ── RD4 / `-285` — a key that appears DURING R9 ─────────────────────────────────────────────────────────────────
  describe('RD4 — a key that appears during R9 makes every earlier approve vote short', () => {
    it('the District Admin approved: finalize waits for THEIR late reason first, then each approve vote revises', async () => {
      const ctx = await claim({ r9: true });
      await approve(ctx);
      await routeAndOpen(ctx);
      const a = await cast(ctx, V1);
      const b = await cast(ctx, V2);
      await inspect(ctx, { deathDate: istDaysAgo(3) }); // `-283` A1 — writable while R9-routed
      await refused(ctx, () => finalize(ctx), waitsFor(['inspection_death_date_differs']));
      await lateReason(ctx);
      await refused(ctx, () => finalize(ctx), (e) =>
        e instanceof R9ApproveVotesNeedWarningReasonError && [...e.voteIds].sort().join() === [a.vote.voteId, b.vote.voteId].sort().join());
      await cast(ctx, V1, GENERIC);
      await cast(ctx, V2, GENERIC);
      expect((await finalize(ctx)).claimState).toBe('state_trustee_approved');
    });

    it('⭐ `-285` R9-first (⛔ District Admin approval): ⛔ late wait — only the votes\' revision', async () => {
      const ctx = await claim({ r9: true });
      await routeAndOpen(ctx);
      await cast(ctx, V1);
      await cast(ctx, V2);
      await inspect(ctx, { verdict: 'does_not_match' });
      await refused(ctx, () => finalize(ctx), (e) => e instanceof R9ApproveVotesNeedWarningReasonError);
      await cast(ctx, V1, GENERIC);
      await cast(ctx, V2, GENERIC);
      expect((await finalize(ctx)).claimState).toBe('state_trustee_approved');
    });
  });
});
