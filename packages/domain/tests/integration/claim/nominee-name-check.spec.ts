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
  deriveNomineeDeclarationToken,
  getLatestNomineeNameCheck,
  projectClaimState,
  recordNomineeNameCheck,
  voteOnFrozenClaim,
} from '../../../src/claim/index.js';
import { getMemberNomineeDeclarationRefs } from '../../../src/nominee/declaration-ref.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, enterAppScope, seedMember, seedNomineeNameCheck } from '../_helpers.js';

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
async function seedAccountsOnly(tx: Tx, claimCaseId: ClaimId): Promise<void> {
  await tx.insert(schema.claimNomineeBankAccounts).values(
    [1, 2].map((rank) => ({
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

async function tokenFor(tx: Tx, memberId: MemberId): Promise<string> {
  return deriveNomineeDeclarationToken(await getMemberNomineeDeclarationRefs(tx, PARIWAR_A, memberId));
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
        nomineeDeclarationToken: await tokenFor(tx, mid),
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
          nomineeDeclarationToken: await tokenFor(tx, mid),
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
          nomineeDeclarationToken: await tokenFor(tx, mid),
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
          nomineeDeclarationToken: await tokenFor(tx, mid),
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
  describe('AC9 — the names and the note reach NO log, event, audit line or error body', () => {
    it('⛔⛔ plants both names and a note as SENTINELS and finds them in no event payload', async () => {
      // ⚠ AC9 says it plainly: ⛔ NO CI script scans admin DTOs for PII, so this test is the ONLY
      // guard. If it is deleted or weakened, nothing else in the repo notices a name leaking into
      // `events_log` — which is append-only, so a leak there is PERMANENT and unerasable.
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
      await seedMember(tx, PARIWAR_A, { memberId: mid });
      await tx.insert(schema.memberNominees).values({
        memberId: mid,
        pariwarId: PARIWAR_A,
        rank: 1,
        nameCiphertext: NOMINEE,
        relationship: 'spouse',
        splitPct: 100,
        mobileCiphertext: 'ZZNOMINEEMOBILEZZ',
      });
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
        nomineeDeclarationToken: await tokenFor(tx, mid),
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
      await seedAccountsOnly(tx, cid);

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

    it('⭐ P1 — after the accounts are CORRECTED and re-checked, the same claim approves (AC5, AC6)', async () => {
      const { client } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const cid = toClaimId(randomUUID());
      const mid = toMemberId(randomUUID());
      await driveTo(client, cid, mid, 'verifier_review');
      await seedNomineeNameCheck(client, PARIWAR_A, cid, { verdicts: ['matches', 'does_not_match'] });

      // The helpline corrects, the District Admin looks again — the whole point of "sent back".
      await seedNomineeNameCheck(client, PARIWAR_A, cid, { verdicts: ['matches', 'clerical_difference'], clericalReasons: [null, 'married_name'] });

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

      // A helpline correction after the District Admin's approval: the delete-then-insert writer
      // moves `updated_at`, which is exactly what makes the recorded judgement no longer current.
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
  });
}, { timeout: 20000 });
