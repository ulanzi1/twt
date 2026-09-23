// The nominee NAME CHECK — live-DB integration (Story 6.18; AC3, AC4, AC5, AC6).
//
// Drives `recordNomineeNameCheck` and the three approval gates (P1 `adjudicateClaim`, P3
// `voteOnFrozenClaim`, P4 `finalizeR9Outcome`) against real Postgres under PARIWAR_A scope, inside
// the per-test BEGIN/ROLLBACK. Asserts MEMBERSHIP / explicit values, never DROP SCHEMA
// ([[project_live_db_test_gotchas]]).
//
// ⭐ THE PROPERTY THIS FILE EXISTS TO PROVE, and it runs through every test below: the system NEVER
// ACTS ON A NAME (`2026-09-19-226` cl.5). A claim whose names the District Admin says do not match
// is not denied, not escalated, not moved — it simply cannot be APPROVED until someone fixes it.
// A test that ever asserts an automatic denial here would be asserting a ruling violation.

import { createHash, randomUUID } from 'node:crypto';

import { and, eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { claimId as toClaimId, memberId as toMemberId } from '../../../src/ids/index.js';
import type { ClaimId, MemberId } from '../../../src/ids/index.js';
import {
  NomineeBankAccountsRequiredError,
  NomineeNameCheckNotRecordableError,
  NomineeNameCheckRequiredError,
  NomineeNameCheckStaleError,
  adjudicateClaim,
  getLatestNomineeNameCheck,
  projectClaimState,
  recordNomineeNameCheck,
  returnToDistrictAdmin,
  voteOnFrozenClaim,
} from '../../../src/claim/index.js';
import { getEffectiveNomineeDeclaration } from '../../../src/claim/nominee-effective.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import {
  PARIWAR_A,
  enterAppScope,
  seedMember,
  seedNomineeDeclaration,
  seedNomineeDetermination,
  seedNomineeNameCheck,
} from '../_helpers.js';

const DISTRICT_ADMIN = 'c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3';
const TRUSTEE = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1';

type Client = ReturnType<typeof getTx>['client'];
type Tx = ReturnType<typeof getTx>['tx'];

/** Drive a fresh claim to `target` WITHOUT seeding any bank accounts or name check. */
async function driveTo(
  client: Client,
  claimCaseId: ClaimId,
  deceasedMemberId: MemberId,
  target: 'documents_pending' | 'verification_in_progress' | 'verifier_review' | 'verifier_approved',
): Promise<void> {
  const emit = (from: string | null, to: string, eventType: string, extra: Record<string, unknown> = {}) =>
    projectClaimState(client, {
      claimCaseId,
      pariwarId: PARIWAR_A,
      deceasedMemberId,
      intakeChannels: ['member_app'],
      claimantActorId: null,
      eventType: eventType as never,
      payload: { from_state: from, to_state: to, trigger: 'test', actor: 'system', ...extra },
      actorId: null,
    });
  await emit(null, 'intake_pending', 'claim.intake_initiated', {
    deceased_member_id: deceasedMemberId,
    intake_channel: 'member_app',
    claimant_actor_id: null,
  });
  await emit('intake_pending', 'intake_converged', 'claim.intake_converged');
  await emit('intake_converged', 'documents_pending', 'claim.documents_received');
  if (target === 'documents_pending') return;
  await emit('documents_pending', 'verification_in_progress', 'claim.peer_mesh_pinged', {
    selected_member_ids: [randomUUID()],
    metric_id: 'district_cohort_v1',
    metric_version: 1,
  });
  if (target === 'verification_in_progress') return;
  await emit('verification_in_progress', 'verifier_review', 'claim.verifier_reviewing');
  if (target === 'verifier_approved') {
    await emit('verifier_review', 'verifier_approved', 'claim.verifier_approved');
  }
}

/** Seed two live bank accounts WITHOUT recording any check. */
async function seedAccountsOnly(tx: Tx, claimCaseId: ClaimId, ranks: readonly number[] = [1, 2]): Promise<void> {
  // ⭐ `ranks` defaults to BOTH. Passing `[1]` builds the ONE-ACCOUNT fixture, which had ⛔ no test
  // at any gate: `-226` cl.7 makes both mandatory, and "one account" is the realistic partial — a
  // filer who typed the primary and was interrupted — whereas "zero accounts" fails earlier, on a
  // different guard, which is why the existing `accounts: []` test never reached this rule.
  await tx.insert(schema.claimNomineeBankAccounts).values(
    ranks.map((rank) => ({
      claimCaseId,
      pariwarId: PARIWAR_A,
      accountRank: rank,
      accountHolderNameCiphertext: `enc:v1:holder-${rank}`,
      accountNumberCiphertext: `enc:v1:acct-${rank}`,
      ifscCiphertext: `enc:v1:ifsc-${rank}`,
      bankName: rank === 1 ? 'State Bank of India' : 'HDFC Bank',
      ifscValidated: true,
    })),
  );
}

/**
 * Story 6.20 (AC5, T16) — the accounts AND an as-at-death DETERMINATION, but ⛔ no name check. Since
 * 6.20 the gate asks for the determination BEFORE the check, so "nobody checked" is only reachable on a
 * DETERMINED claim — otherwise the 409 is `nominee_determination_required`, a different fact.
 */
async function seedAccountsAndDetermination(client: Client, tx: Tx, claimCaseId: ClaimId): Promise<void> {
  await seedAccountsOnly(tx, claimCaseId);
  const [row] = await tx
    .select({ deceasedMemberId: schema.claims.deceasedMemberId })
    .from(schema.claims)
    .where(and(eq(schema.claims.pariwarId, PARIWAR_A), eq(schema.claims.claimCaseId, claimCaseId)));
  await seedNomineeDeclaration(tx, PARIWAR_A, row!.deceasedMemberId);
  await seedNomineeDetermination(client, PARIWAR_A, claimCaseId);
}

async function liveAccountStamps(tx: Tx, claimCaseId: ClaimId) {
  return tx
    .select({
      accountRank: schema.claimNomineeBankAccounts.accountRank,
      updatedAt: schema.claimNomineeBankAccounts.updatedAt,
    })
    .from(schema.claimNomineeBankAccounts)
    .where(
      and(
        eq(schema.claimNomineeBankAccounts.pariwarId, PARIWAR_A),
        eq(schema.claimNomineeBankAccounts.claimCaseId, claimCaseId),
      ),
    );
}

/** Story 6.20 (AC5) — the token of the EFFECTIVE as-at-death declaration, keyed by the CLAIM. */
async function tokenFor(tx: Tx, claimCaseId: ClaimId): Promise<string> {
  return (await getEffectiveNomineeDeclaration(tx, PARIWAR_A, claimCaseId)).token;
}

async function claimState(tx: Tx, claimCaseId: ClaimId): Promise<string | undefined> {
  const rows = await tx
    .select({ s: schema.claims.currentState })
    .from(schema.claims)
    .where(and(eq(schema.claims.pariwarId, PARIWAR_A), eq(schema.claims.claimCaseId, claimCaseId)));
  return rows[0]?.s;
}

const adjudicateBase = (claimCaseId: ClaimId) => ({
  claimCaseId,
  pariwarId: PARIWAR_A,
  actorId: DISTRICT_ADMIN,
  actorDisplay: 'Anita (District Admin)',
  actor: 'operator' as const,
  rationaleCiphertext: null,
});

// ⚠ SUITE-LEVEL TIMEOUT, matching every sibling live spec. `packages/domain/vitest.config.ts` sets
// ⛔ NO `testTimeout` (apps/api's does), and these suites do many `projectClaimState` round trips
// under full-suite parallelism — the exact shape recorded in
// [[project_known_livedb_test_failures]] as the cause of the timeout flakes, and `{ timeout: 20000 }`
// as their fix.
describe.skipIf(!hasDatabase)('Story 6.18 — the nominee name check (:5433)', () => {
  setupLiveDb();

  // ── AC3 — recording the check ────────────────────────────────────────────────────────────
  describe('AC3 — the District Admin records the check', () => {
    it('records a check, emits ONE identity event, and leaves the claim state UNMOVED', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const cid = toClaimId(randomUUID());
      const mid = toMemberId(randomUUID());
      await driveTo(client, cid, mid, 'verifier_review');
      await seedAccountsOnly(tx, cid);

      const stamps = await liveAccountStamps(tx, cid);
      const result = await recordNomineeNameCheck(client, {
        claimCaseId: cid,
        pariwarId: PARIWAR_A,
        nomineeDeclarationToken: await tokenFor(tx, cid),
        accounts: stamps.map((s) => ({
          accountRank: s.accountRank as 1 | 2,
          accountUpdatedAt: s.updatedAt.toISOString(),
          verdict: 'matches' as const,
          clericalReason: null,
        })),
        actorId: DISTRICT_ADMIN,
        actorDisplay: 'Anita (District Admin)',
        actor: 'operator',
      });

      expect(result.claimState).toBe('verifier_review');
      expect(await claimState(tx, cid)).toBe('verifier_review');
      expect(result.check.accounts).toHaveLength(2);

      const events = await tx
        .select({ t: schema.eventsLog.eventType })
        .from(schema.eventsLog)
        .where(and(eq(schema.eventsLog.pariwarId, PARIWAR_A), eq(schema.eventsLog.streamId, cid)));
      expect(events.filter((e) => e.t === 'claim.nominee_name_checked')).toHaveLength(1);
    });

    it('⛔ refuses a claim WITHOUT two live accounts — and that is a WAIT, never a denial (cl.7)', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const cid = toClaimId(randomUUID());
      const mid = toMemberId(randomUUID());
      await driveTo(client, cid, mid, 'verifier_review');

      await expect(
        recordNomineeNameCheck(client, {
          claimCaseId: cid,
          pariwarId: PARIWAR_A,
          nomineeDeclarationToken: await tokenFor(tx, cid),
          accounts: [],
          actorId: DISTRICT_ADMIN,
          actorDisplay: 'Anita (District Admin)',
          actor: 'operator',
        }),
      ).rejects.toBeInstanceOf(NomineeBankAccountsRequiredError);
      // ⭐ The claim is untouched — not denied, not moved.
      expect(await claimState(tx, cid)).toBe('verifier_review');
    });

    it('⛔ refuses a claim outside the recordable window', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const cid = toClaimId(randomUUID());
      const mid = toMemberId(randomUUID());
      // ⭐ Reached legitimately through the projector — `claims.current_state` is projector-only, so
      // a test that forced it with an UPDATE would be testing a state the system cannot produce.
      await driveTo(client, cid, mid, 'documents_pending');
      await seedAccountsOnly(tx, cid);

      await expect(
        recordNomineeNameCheck(client, {
          claimCaseId: cid,
          pariwarId: PARIWAR_A,
          nomineeDeclarationToken: await tokenFor(tx, cid),
          accounts: (await liveAccountStamps(tx, cid)).map((s) => ({
            accountRank: s.accountRank as 1 | 2,
            accountUpdatedAt: s.updatedAt.toISOString(),
            verdict: 'matches' as const,
            clericalReason: null,
          })),
          actorId: DISTRICT_ADMIN,
          actorDisplay: 'Anita (District Admin)',
          actor: 'operator',
        }),
      ).rejects.toBeInstanceOf(NomineeNameCheckNotRecordableError);
    });

    it('⛔ refuses a STALE account stamp — a judgement about data that has since changed (D1)', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const cid = toClaimId(randomUUID());
      const mid = toMemberId(randomUUID());
      await driveTo(client, cid, mid, 'verifier_review');
      await seedAccountsOnly(tx, cid);

      const stamps = await liveAccountStamps(tx, cid);
      await expect(
        recordNomineeNameCheck(client, {
          claimCaseId: cid,
          pariwarId: PARIWAR_A,
          nomineeDeclarationToken: await tokenFor(tx, cid),
          accounts: stamps.map((s) => ({
            accountRank: s.accountRank as 1 | 2,
            // An instant that is not the live one — exactly what a concurrent correction produces.
            accountUpdatedAt: new Date(s.updatedAt.getTime() - 60_000).toISOString(),
            verdict: 'matches' as const,
            clericalReason: null,
          })),
          actorId: DISTRICT_ADMIN,
          actorDisplay: 'Anita (District Admin)',
          actor: 'operator',
        }),
      ).rejects.toBeInstanceOf(NomineeNameCheckStaleError);
    });

    it('⛔ refuses a STALE declaration token', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const cid = toClaimId(randomUUID());
      const mid = toMemberId(randomUUID());
      await driveTo(client, cid, mid, 'verifier_review');
      await seedAccountsOnly(tx, cid);

      await expect(
        recordNomineeNameCheck(client, {
          claimCaseId: cid,
          pariwarId: PARIWAR_A,
          nomineeDeclarationToken: 'a-token-from-an-older-declaration',
          accounts: (await liveAccountStamps(tx, cid)).map((s) => ({
            accountRank: s.accountRank as 1 | 2,
            accountUpdatedAt: s.updatedAt.toISOString(),
            verdict: 'matches' as const,
            clericalReason: null,
          })),
          actorId: DISTRICT_ADMIN,
          actorDisplay: 'Anita (District Admin)',
          actor: 'operator',
        }),
      ).rejects.toBeInstanceOf(NomineeNameCheckStaleError);
    });

    it('⛔ a check is NEVER back-filled — a claim that was never checked reads back null', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const cid = toClaimId(randomUUID());
      await driveTo(client, cid, toMemberId(randomUUID()), 'verifier_approved');
      expect(await getLatestNomineeNameCheck(tx, PARIWAR_A, cid)).toBeNull();
    });
  });

  // ── AC9 — the PII posture ────────────────────────────────────────────────────────────────
  describe('AC9 — the names and the note reach no EVENT PAYLOAD (this file scans `events_log`)', () => {
    it('⚠⚠ plants both names and a note as SENTINELS and finds them in no event payload', async () => {
      // ⚠⚠ THE DESCRIBE WAS RE-TITLED 2026-09-22, because it claimed more than it scans. It read
      // *"reach NO log, event, audit line or error body"* while the body queries ⛔ only
      // `events_log`. ⭐ And this layer ⛔ NEVER DECRYPTS, so what it can prove is that stored
      // CIPHERTEXT STRINGS are not copied into the stream — ⛔ not that a decrypted plaintext stays
      // out of a log, an audit line or an error body, which are three different claims about three
      // different sinks.
      // ⇒ those legs live where the decryption happens:
      //   · `apps/api/.../nominee-name-check.spec.ts` — *"⛔ NO plaintext reaches the audit trail"*,
      //     with SEVEN real envelopes the handler genuinely decrypts, plus a non-vacuity block
      //     proving it decrypted them; and its sibling scanning the WRITE path's own audit lines.
      // ⭐ Between them the claim the OLD title made is covered; ⛔ neither file makes it alone.
      //
      // ⚠ AC9 says it plainly: ⛔ NO CI script scans admin DTOs for PII, so this test is the ONLY
      // guard on the EVENT sink. If it is deleted or weakened, nothing else in the repo notices a
      // name leaking into `events_log` — which is append-only, so a leak there is PERMANENT and
      // unerasable.
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const cid = toClaimId(randomUUID());
      const mid = toMemberId(randomUUID());
      await driveTo(client, cid, mid, 'verifier_review');

      // Distinctive, searchable sentinels — a holder name, a NOMINEE name and a filer's note.
      const HOLDER = 'ZZHOLDERSENTINELZZ';
      const NOTE = 'ZZNOTESENTINELZZ';
      // ⚠⚠ THE NOMINEE NAME WAS MISSING (code review 2026-09-20). The describe title promised
      // "both names" while the body planted ⛔ no `member_nominees` row at all — so `tokenFor` ran
      // over an EMPTY declaration and the nominee half of the claim was never exercised. The
      // nominee is the SECOND, LIVING Tier-1 subject Trap 4 is mostly about; leaving their name out
      // of the only guard that exists was the gap most worth closing.
      const NOMINEE = 'ZZNOMINEESENTINELZZ';
      // ⚠ The nominee row FKs to `members`, so the deceased member must exist as a row — `driveTo`
      // only mints claim EVENTS. Seeded here rather than in `driveTo` so the other tests in this
      // file keep exercising the "declared nobody" path, which is its own first-class state (AC2).
      // ⭐ Story 6.20 (T16): seeded THE WAY A DECLARE WRITES IT — projection AND version — then
      // DETERMINED, so the nominee sentinel sits in the EFFECTIVE declaration the check now reads. A raw
      // `member_nominees` INSERT would be UNVERSIONED (D1 fails it closed) and never reached at all,
      // which would make this leak test pass vacuously.
      await seedMember(tx, PARIWAR_A, { memberId: mid });
      await seedNomineeDeclaration(tx, PARIWAR_A, mid, {
        nominees: [{ nameCiphertext: NOMINEE, mobileCiphertext: 'ZZNOMINEEMOBILEZZ' }],
      });
      await seedNomineeDetermination(client, PARIWAR_A, cid);
      await tx.insert(schema.claimNomineeBankAccounts).values(
        ([1, 2] as const).map((rank) => ({
          claimCaseId: cid,
          pariwarId: PARIWAR_A,
          accountRank: rank,
          accountHolderNameCiphertext: `${HOLDER}-${rank}`,
          accountNumberCiphertext: 'ZZACCTSENTINELZZ',
          ifscCiphertext: 'ZZIFSCSENTINELZZ',
          nameDifferenceNoteCiphertext: `${NOTE}-${rank}`,
          bankName: 'State Bank of India',
          ifscValidated: true,
        })),
      );

      const stamps = await liveAccountStamps(tx, cid);
      await recordNomineeNameCheck(client, {
        claimCaseId: cid,
        pariwarId: PARIWAR_A,
        nomineeDeclarationToken: await tokenFor(tx, cid),
        accounts: stamps.map((s2) => ({
          accountRank: s2.accountRank as 1 | 2,
          accountUpdatedAt: s2.updatedAt.toISOString(),
          verdict: 'clerical_difference' as const,
          clericalReason: 'married_name' as const,
        })),
        actorId: DISTRICT_ADMIN,
        actorDisplay: 'Anita (District Admin)',
        actor: 'operator',
      });

      // ⭐ The WHOLE stream, not just this story's event — a leak could land on any payload.
      const events = await tx
        .select({ t: schema.eventsLog.eventType, p: schema.eventsLog.payload })
        .from(schema.eventsLog)
        .where(and(eq(schema.eventsLog.pariwarId, PARIWAR_A), eq(schema.eventsLog.streamId, cid)));
      const dump = JSON.stringify(events);
      for (const sentinel of [HOLDER, NOMINEE, NOTE, 'ZZACCTSENTINELZZ', 'ZZIFSCSENTINELZZ', 'ZZNOMINEEMOBILEZZ']) {
        expect(dump, `sentinel ${sentinel} leaked into events_log`).not.toContain(sentinel);
      }

      // ⭐ And no HASH of a name either — the plausible "compromise" Trap 4 names explicitly. A name
      // hash is a stable identifier for a living person and a confirmation oracle for a guess.
      const hashes = [
        createHash('sha256').update(HOLDER).digest('hex'),
        createHash('sha256').update(`${HOLDER}-1`).digest('hex'),
        createHash('sha256').update(NOMINEE).digest('hex'),
        createHash('sha256').update(NOTE).digest('hex'),
      ];
      for (const h of hashes) {
        expect(dump, 'a NAME HASH leaked into events_log').not.toContain(h);
        expect(dump, 'a truncated name hash leaked into events_log').not.toContain(h.slice(0, 16));
      }

      // The check event carries the NON-PII shape and nothing else.
      const checkEvent = events.find((e) => e.t === 'claim.nominee_name_checked');
      expect(checkEvent).toBeDefined();
      expect(Object.keys(checkEvent!.p as Record<string, unknown>).sort()).toEqual([
        'accounts',
        'actor',
        // ⭐ D3 — the acting District Admin's display name, SNAPSHOT at the check. STAFF identity,
        // which this codebase treats as controlled-but-recordable (the same field rides
        // `claim.verifier_*` and the trustee decisions). ⛔ It is NOT the member's or the nominee's
        // name — both of those are sentinel-checked above and appear nowhere.
        'checked_by_actor_display',
        'from_state',
        'nominee_declaration_token',
        'to_state',
        'trigger',
      ]);
      // ⛔ … AND THE ATTRIBUTION IS REAL. Before D3 this field did not exist and every check read
      // back with `''`, so no judgement was ever attributed to anybody.
      expect((checkEvent!.p as Record<string, unknown>).checked_by_actor_display).toBe(
        'Anita (District Admin)',
      );
    });
  });

  // ── AC4 — the approval gates ─────────────────────────────────────────────────────────────
  describe('AC4 — every approving path requires a current, passing check', () => {
    it('P1 — adjudicateClaim APPROVE is refused without a check, and the claim does NOT move', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const cid = toClaimId(randomUUID());
      const mid = toMemberId(randomUUID());
      await driveTo(client, cid, mid, 'verifier_review');
      await seedAccountsAndDetermination(client, tx, cid);

      await expect(
        adjudicateClaim(client, {
          ...adjudicateBase(cid),
          outcome: 'approved',
          reasonCode: 'r8_90pct_met',
        }),
      ).rejects.toBeInstanceOf(NomineeNameCheckRequiredError);
      expect(await claimState(tx, cid)).toBe('verifier_review');
    });

    it('P1 — the SAME claim is DENIABLE without any check (cl.6/cl.7 — a claim is never refused over a name)', async () => {
      const { client } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const cid = toClaimId(randomUUID());
      await driveTo(client, cid, toMemberId(randomUUID()), 'verifier_review');
      // ⭐ NO accounts, NO check — and the deny path must still work. This is the asymmetry the
      // ruling demands: the gate protects APPROVAL, never the ability to decide against a claim.
      const res = await adjudicateClaim(client, {
        ...adjudicateBase(cid),
        outcome: 'denied',
        reasonCode: 'concealment_flag_uphold',
      });
      expect(res.claimState).toBe('denied');
    });

    it('P1 — APPROVE succeeds once a passing check exists', async () => {
      const { client } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const cid = toClaimId(randomUUID());
      const mid = toMemberId(randomUUID());
      await driveTo(client, cid, mid, 'verifier_review');
      await seedNomineeNameCheck(client, PARIWAR_A, cid);

      const res = await adjudicateClaim(client, {
        ...adjudicateBase(cid),
        outcome: 'approved',
        reasonCode: 'r8_90pct_met',
      });
      expect(res.claimState).toBe('verifier_approved');
    });

    it('⭐ P1 — a does_not_match claim is REFUSED approval, NEVER denied, and stays exactly where it was (AC5)', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const cid = toClaimId(randomUUID());
      const mid = toMemberId(randomUUID());
      await driveTo(client, cid, mid, 'verifier_review');
      await seedNomineeNameCheck(client, PARIWAR_A, cid, { verdicts: ['matches', 'does_not_match'] });

      await expect(
        adjudicateClaim(client, { ...adjudicateBase(cid), outcome: 'approved', reasonCode: 'r8_90pct_met' }),
      ).rejects.toMatchObject({ name: 'NomineeNameCheckRequiredError', reason: 'does_not_match' });

      // ⛔⛔ THE RULING, ASSERTED: the claim is NOT denied and NOT moved. Nothing happened to it.
      expect(await claimState(tx, cid)).toBe('verifier_review');
      const events = await tx
        .select({ t: schema.eventsLog.eventType })
        .from(schema.eventsLog)
        .where(and(eq(schema.eventsLog.pariwarId, PARIWAR_A), eq(schema.eventsLog.streamId, cid)));
      expect(events.map((e) => e.t)).not.toContain('claim.verifier_denied');
    });

    it('⭐ P1 — a LATER check supersedes a sending-back one, so the same claim approves (AC5, AC6)', async () => {
      // ⚠⚠ RE-TITLED 2026-09-22. It read *"after the accounts are CORRECTED and re-checked"* and
      // ⛔ nothing here is corrected: both `seedNomineeNameCheck` calls run inside ONE transaction,
      // where Postgres `now()` is frozen at transaction start, so the re-inserted account rows come
      // back with the IDENTICAL `updated_at`. ⇒ what this proves is **latest-check-wins**, which is
      // a real and separate invariant — ⛔ not the corrected-and-re-checked chain the title claimed.
      // ⭐ That chain needs two COMMITTED transactions and is proved in
      // `nominee-name-check-write-concurrency.spec.ts` (*"…that ALONE stales a recorded PASSING
      // check — D5 end to end"*).
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const cid = toClaimId(randomUUID());
      const mid = toMemberId(randomUUID());
      await driveTo(client, cid, mid, 'verifier_review');
      await seedNomineeNameCheck(client, PARIWAR_A, cid, { verdicts: ['matches', 'does_not_match'] });
      const before = (await liveAccountStamps(tx, cid)).map((s) => s.updatedAt.toISOString()).sort();

      // The District Admin looks again and records a passing verdict.
      await seedNomineeNameCheck(client, PARIWAR_A, cid, { verdicts: ['matches', 'clerical_difference'], clericalReasons: [null, 'married_name'] });

      // ⭐ PINNED, so the re-title cannot quietly drift back: the stamps did ⛔ NOT move. If this
      // ever fails, this test became the corrected-and-re-checked case and should be renamed again.
      expect(
        (await liveAccountStamps(tx, cid)).map((s) => s.updatedAt.toISOString()).sort(),
        'the stamps moved inside one transaction — this test is now proving something else',
      ).toEqual(before);

      const res = await adjudicateClaim(client, {
        ...adjudicateBase(cid),
        outcome: 'approved',
        reasonCode: 'r8_90pct_met',
      });
      expect(res.claimState).toBe('verifier_approved');
    });

    it('⭐ P3 — a D5 post-approval correction makes the check STALE, so the Pariwar Admin cannot approve (`-227` cl.12)', async () => {
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const cid = toClaimId(randomUUID());
      const mid = toMemberId(randomUUID());
      await driveTo(client, cid, mid, 'verifier_approved');
      await seedNomineeNameCheck(client, PARIWAR_A, cid);

      // ⚠⚠ THE STAMP IS MOVED BY HAND, AND THE COMMENT USED TO HIDE THAT (code review 2026-09-22).
      // It read *"the delete-then-insert writer moves `updated_at`"* — but the writer is ⛔ never
      // called here; the line below is a bare UPDATE. ⇒ this test proves the COMPARISON (a moved
      // stamp stales a check and the vote is refused), and ⛔ NOT the premise that the real writer
      // moves it. An upsert that preserved the timestamp would disable D5 with this test still
      // green.
      // ⭐ The premise is proved separately, on the own-committing harness, by
      // `nominee-name-check-write-concurrency.spec.ts` — *"the REAL writer moves `updated_at`
      // across two COMMITTED transactions"*. It ⛔ cannot be proved here: `now()` is frozen for the
      // whole of this transaction, so the writer's own rewrite would return the SAME stamp.
      await tx
        .update(schema.claimNomineeBankAccounts)
        .set({ updatedAt: new Date(Date.now() + 60_000) })
        .where(
          and(
            eq(schema.claimNomineeBankAccounts.pariwarId, PARIWAR_A),
            eq(schema.claimNomineeBankAccounts.claimCaseId, cid),
          ),
        );

      await expect(
        voteOnFrozenClaim(client, {
          claimCaseId: cid,
          pariwarId: PARIWAR_A,
          outcome: 'approved',
          reasonCode: null,
          rationaleCiphertext: null,
          actorId: TRUSTEE,
          actorDisplay: 'Trustee One',
          actor: 'trustee',
        }),
      ).rejects.toMatchObject({ name: 'NomineeNameCheckRequiredError', reason: 'stale' });

      expect(await claimState(tx, cid)).toBe('verifier_approved');
    });

    // ── THE GATE MATRIX — every DEFICIENCY against every APPROVING path ────────────────────
    //
    // ⚠⚠ TASK 7 TICKED *"P1/P3/P4 refused without a current passing check and without two
    // accounts"*, and the truth was **three cells of fifteen**: P1 had no-check and
    // `does_not_match`; P3 had stale ⛔ only; P4 had accounts-deleted ⛔ only. ⭐ Every other
    // combination was a claim with ⛔ nothing under it — including the ONE-ACCOUNT case at every
    // gate, which the existing `accounts: []` test ⛔ never reached because zero accounts fails
    // earlier, on a different guard.
    //
    // ⭐ TABLE-DRIVEN ON PURPOSE: the property is *"EVERY approving path refuses EVERY deficiency"*,
    // and writing it as a table makes a missing cell visible as a missing row rather than as a test
    // nobody happened to write ([[feedback_gate_scope_semantic_coverage]]).
    const DEFICIENCIES = [
      {
        key: 'no check at all',
        error: 'NomineeNameCheckRequiredError',
        seed: async (client: Client, tx: Tx, cid: ClaimId) => {
          await seedAccountsAndDetermination(client, tx, cid);
        },
      },
      {
        // ⭐ Story 6.20 (AC5, D15) — two accounts but ⛔ NO DETERMINATION: the claim WAITS for the
        // District Admin to say which declaration stands. ⛔ Never a denial.
        key: 'no as-at-death determination (Story 6.20)',
        error: 'NomineeDeterminationRequiredError',
        seed: async (client: Client, tx: Tx, cid: ClaimId) => {
          await seedAccountsOnly(tx, cid);
        },
      },
      {
        key: 'no accounts at all (cl.7 — the claim WAITS)',
        error: 'NomineeBankAccountsRequiredError',
        seed: async () => {
          /* ⛔ nothing seeded — neither accounts nor a check. */
        },
      },
      {
        key: 'ONE account only (cl.7 makes BOTH mandatory)',
        error: 'NomineeBankAccountsRequiredError',
        seed: async (client: Client, tx: Tx, cid: ClaimId) => {
          await seedAccountsOnly(tx, cid, [1]);
        },
      },
      {
        key: 'a STALE check (D5 — the accounts moved under it)',
        error: 'NomineeNameCheckRequiredError',
        seed: async (client: Client, tx: Tx, cid: ClaimId) => {
          await seedNomineeNameCheck(client, PARIWAR_A, cid);
          await tx
            .update(schema.claimNomineeBankAccounts)
            .set({ updatedAt: new Date(Date.now() + 60_000) })
            .where(
              and(
                eq(schema.claimNomineeBankAccounts.pariwarId, PARIWAR_A),
                eq(schema.claimNomineeBankAccounts.claimCaseId, cid),
              ),
            );
        },
      },
      {
        key: 'a `does_not_match` verdict (cl.5 — it WAITS, it is ⛔ never a denial)',
        error: 'NomineeNameCheckRequiredError',
        seed: async (client: Client, tx: Tx, cid: ClaimId) => {
          await seedNomineeNameCheck(client, PARIWAR_A, cid, { verdicts: ['matches', 'does_not_match'] });
        },
      },
    ] as const;

    for (const d of DEFICIENCIES) {
      it(`⭐ P1 (adjudicateClaim) refuses APPROVE — ${d.key}`, async () => {
        const { client, tx } = getTx();
        await enterAppScope(client, PARIWAR_A);
        const cid = toClaimId(randomUUID());
        await driveTo(client, cid, toMemberId(randomUUID()), 'verifier_review');
        await d.seed(client, tx, cid);

        await expect(
          adjudicateClaim(client, { ...adjudicateBase(cid), outcome: 'approved', reasonCode: 'r8_90pct_met' }),
        ).rejects.toMatchObject({ name: d.error });
        // ⭐ AND THE CLAIM IS EXACTLY WHERE IT WAS — asserted as EQUALITY, ⛔ not as
        // `not.toBe('verifier_approved')`, which passes for a claim that moved somewhere else
        // entirely (the defect the P4 test carried).
        expect(await claimState(tx, cid)).toBe('verifier_review');
      });

      it(`⭐ P3 (voteOnFrozenClaim) refuses APPROVE — ${d.key}`, async () => {
        const { client, tx } = getTx();
        await enterAppScope(client, PARIWAR_A);
        const cid = toClaimId(randomUUID());
        await driveTo(client, cid, toMemberId(randomUUID()), 'verifier_approved');
        await d.seed(client, tx, cid);

        await expect(
          voteOnFrozenClaim(client, {
            claimCaseId: cid,
            pariwarId: PARIWAR_A,
            outcome: 'approved',
            reasonCode: null,
            rationaleCiphertext: null,
            actorId: TRUSTEE,
            actorDisplay: 'Trustee One',
            actor: 'trustee',
          }),
        ).rejects.toMatchObject({ name: d.error });
        expect(await claimState(tx, cid)).toBe('verifier_approved');
      });
    }

    it('⭐⭐ cl.5 — a recorded `does_not_match` mints ⛔ NO escalation event, and ⛔ no denial', async () => {
      // ⚠ *"The system never acts"* has THREE limbs and ⛔ only the denial one was pinned. An
      // ESCALATION is the other way a well-meaning implementation "acts" on a mismatch — it feels
      // helpful, it routes the case to someone senior, and it is exactly what cl.5 forbids.
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const cid = toClaimId(randomUUID());
      await driveTo(client, cid, toMemberId(randomUUID()), 'verifier_review');
      await seedNomineeNameCheck(client, PARIWAR_A, cid, { verdicts: ['matches', 'does_not_match'] });

      const types = await tx
        .select({ t: schema.eventsLog.eventType })
        .from(schema.eventsLog)
        .where(and(eq(schema.eventsLog.pariwarId, PARIWAR_A), eq(schema.eventsLog.streamId, cid)));
      const seen = types.map((r) => r.t);
      // ⛔ NON-VACUITY: the check itself WAS recorded, so "no escalation" is a property of the
      // system's response and ⛔ not of an empty stream.
      expect(seen).toContain('claim.nominee_name_checked');
      expect(seen).not.toContain('claim.verifier_escalated');
      expect(seen).not.toContain('claim.verifier_denied');
      expect(seen).not.toContain('claim.state_trustee_denied');
      expect(await claimState(tx, cid)).toBe('verifier_review');
    });

    it('⚠ AC3 — a check cannot be recorded against ONE account either (cl.7, at the WRITER)', async () => {
      // ⚠ The existing AC3 refusal test passes `accounts: []`, which fails on "no live accounts" —
      // a DIFFERENT guard. This is the partial the rule is actually about.
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const cid = toClaimId(randomUUID());
      const mid = toMemberId(randomUUID());
      await driveTo(client, cid, mid, 'verifier_review');
      await seedAccountsOnly(tx, cid, [1]);

      const stamps = await liveAccountStamps(tx, cid);
      expect(stamps).toHaveLength(1);
      await expect(
        recordNomineeNameCheck(client, {
          claimCaseId: cid,
          pariwarId: PARIWAR_A,
          nomineeDeclarationToken: await tokenFor(tx, cid),
          accounts: stamps.map((s) => ({
            accountRank: s.accountRank as 1 | 2,
            accountUpdatedAt: s.updatedAt.toISOString(),
            verdict: 'matches' as const,
            clericalReason: null,
          })),
          actorId: DISTRICT_ADMIN,
          actorDisplay: 'Anita (District Admin)',
          actor: 'operator',
        }),
      ).rejects.toBeInstanceOf(NomineeBankAccountsRequiredError);
    });

    it('P3 — a DENY vote is never gated, even with no accounts and no check', async () => {
      const { client } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const cid = toClaimId(randomUUID());
      await driveTo(client, cid, toMemberId(randomUUID()), 'verifier_approved');

      const res = await voteOnFrozenClaim(client, {
        claimCaseId: cid,
        pariwarId: PARIWAR_A,
        outcome: 'denied',
        reasonCode: 'standing_not_met',
        rationaleCiphertext: null,
        actorId: TRUSTEE,
        actorDisplay: 'Trustee One',
        actor: 'trustee',
      });
      expect(res.claimState).toBe('denied');
    });

    it('⚠⚠ D2 — a DENY *IS* refused while a RETURN is live: the ONE place "never gated" does ⛔ not hold', async () => {
      // ⭐⭐ THIS TEST PINS CURRENT BEHAVIOUR AND ⛔ DOES NOT ENDORSE IT. It exists so that if the
      // Panel rules the other way, exactly ONE named test flips and somebody reads this comment —
      // rather than the change landing as a silent surprise (the review's own words).
      //
      // ⚠ THE TENSION IS INSIDE ONE FUNCTION, fifteen lines apart, in `voteOnFrozenClaim`:
      //   · the NAME-CHECK gate is outcome-conditional and says so —
      //     *"⛔ A DENY IS NEVER GATED (cl.6/cl.7 — a claim is never refused over a name or a
      //     missing account)"* — it runs ⛔ only `if (input.outcome === 'approved')`;
      //   · the LIVE-RETURN guard above it is ⛔ NOT outcome-conditional. It throws
      //     `ClaimAwaitingCorrectionError` before the outcome is ever looked at.
      // ⇒ so a claim the Pariwar Admin sent back over BANK DETAILS cannot be DENIED — on standing,
      //   on concealment, on anything — until the bank details are corrected and re-checked.
      //
      // ⭐ WHY IT IS ⛔ NOT OBVIOUSLY WRONG, which is exactly why it needs a ruling and not a patch:
      // the return is a live instruction from the cl.4 authority, and letting a second trustee
      // resolve the claim underneath it would make the return silently disappear (the vote is what
      // supersedes the row). ⚠ But the cl.6/cl.7 reasoning cuts the other way: a denial needs ⛔ no
      // correct bank account, and a family waiting on a correction to receive a refusal is the
      // slower of the two bad outcomes.
      const { client, tx } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const cid = toClaimId(randomUUID());
      const mid = toMemberId(randomUUID());
      await driveTo(client, cid, mid, 'verifier_approved');
      await seedNomineeNameCheck(client, PARIWAR_A, cid);

      // ⭐ POSITIVE CONTROL FIRST, on a SEPARATE claim seeded identically: without a return the very
      // same deny lands. So the refusal below is the return row and ⛔ nothing else about this setup.
      const control = toClaimId(randomUUID());
      await driveTo(client, control, toMemberId(randomUUID()), 'verifier_approved');
      await seedNomineeNameCheck(client, PARIWAR_A, control);
      expect(
        (
          await voteOnFrozenClaim(client, {
            claimCaseId: control,
            pariwarId: PARIWAR_A,
            outcome: 'denied',
            reasonCode: 'standing_not_met',
            rationaleCiphertext: null,
            actorId: TRUSTEE,
            actorDisplay: 'Trustee One',
            actor: 'trustee',
          })
        ).claimState,
      ).toBe('denied');

      await returnToDistrictAdmin(client, {
        claimCaseId: cid,
        pariwarId: PARIWAR_A,
        reasonCode: 'other',
        rationaleCiphertext: 'enc:v1:the-holder-name-is-not-the-nominee',
        actorId: TRUSTEE,
        actorDisplay: 'Pariwar Admin One',
        actor: 'trustee',
      });

      await expect(
        voteOnFrozenClaim(client, {
          claimCaseId: cid,
          pariwarId: PARIWAR_A,
          outcome: 'denied',
          reasonCode: 'standing_not_met',
          rationaleCiphertext: null,
          actorId: TRUSTEE,
          actorDisplay: 'Trustee One',
          actor: 'trustee',
        }),
        'a DENY passed through a live return — if this is now intended, this test is the ruling record',
      ).rejects.toMatchObject({ name: 'ClaimAwaitingCorrectionError' });

      // ⭐ And the claim did ⛔ not move: a refused vote must leave ⛔ no trace.
      expect(await claimState(tx, cid)).toBe('verifier_approved');
    });
  });
}, { timeout: 20000 });
