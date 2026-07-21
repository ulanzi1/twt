// Claim-time nominee bank — live-DB integration (Story 6.8, Task 7; AC1/AC3/AC5).
//
// Drives the domain writer (recordClaimNomineeBankAccounts) + the read accessor
// (getClaimNomineeBankAccountsCiphertext) against real Postgres under PARIWAR_A scope, inside the per-test
// BEGIN/ROLLBACK (nothing persists). Asserts MEMBERSHIP / explicit values, never DROP SCHEMA; per
// [[project_live_db_test_gotchas]]. The Tier-1 PII columns hold caller-supplied ciphertext (the
// route encrypts before insert — here we pass opaque `enc:…` markers and assert they store as-is).

import { randomUUID } from 'node:crypto';

import { and, eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { claimId as toClaimId, memberId as toMemberId } from '../../../src/ids/index.js';
import type { ClaimId, MemberId } from '../../../src/ids/index.js';
import {
  NomineeBankAccountSetError,
  NomineeBankClaimNotCollectableError,
  NomineeBankCorrectionReasonRequiredError,
  getClaimNomineeBankAccountsCiphertext,
  projectClaimState,
  recordClaimNomineeBankAccounts,
} from '../../../src/claim/index.js';
import type { NomineeBankAccountInput } from '../../../src/claim/nominee-bank-persist.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppScope } from '../_helpers.js';

const MEMBER_ACTOR = '99999999-9999-9999-9999-999999999999';

/** Two well-formed accounts (PII already-encrypted markers; bank_name/branch plaintext). */
const accountsFixture = (over: Partial<NomineeBankAccountInput> = {}): NomineeBankAccountInput[] => [
  {
    accountRank: 1,
    accountHolderNameCiphertext: 'enc:v1:holder-1',
    accountNumberCiphertext: 'enc:v1:acct-1',
    ifscCiphertext: 'enc:v1:ifsc-1',
    // Story 8.13 — optional VPA ciphertext; null by default (fixture stays behaviour-compatible).
    vpaCiphertext: null,
    bankName: 'State Bank of India',
    branch: 'Nariman Point, Mumbai',
    ifscValidated: true,
    ...over,
  },
  {
    accountRank: 2,
    accountHolderNameCiphertext: 'enc:v1:holder-2',
    accountNumberCiphertext: 'enc:v1:acct-2',
    ifscCiphertext: 'enc:v1:ifsc-2',
    vpaCiphertext: null,
    bankName: 'HDFC Bank',
    branch: 'Worli, Mumbai',
    ifscValidated: true,
  },
];

/** Emit one claim lifecycle event through the real projector (so replay is correct). */
function emitter(client: ReturnType<typeof getTx>['client'], cid: ClaimId, mid: MemberId) {
  return (from: string | null, to: string, eventType: string, extra: Record<string, unknown> = {}) =>
    projectClaimState(client, {
      claimCaseId: cid,
      pariwarId: PARIWAR_A,
      deceasedMemberId: mid,
      intakeChannels: ['member_app'],
      claimantActorId: null,
      eventType: eventType as never,
      payload: { from_state: from, to_state: to, trigger: 'test', actor: 'system', ...extra },
      actorId: null,
    });
}

async function driveTo(
  client: ReturnType<typeof getTx>['client'],
  cid: ClaimId,
  mid: MemberId,
  target:
    | 'intake_pending'
    | 'intake_converged'
    | 'documents_pending'
    | 'verification_in_progress'
    | 'verifier_review'
    | 'verifier_approved'
    | 'state_trustee_freeze',
): Promise<void> {
  const emit = emitter(client, cid, mid);
  await emit(null, 'intake_pending', 'claim.intake_initiated', {
    deceased_member_id: mid,
    intake_channel: 'member_app',
    claimant_actor_id: null,
  });
  if (target === 'intake_pending') return;
  await emit('intake_pending', 'intake_converged', 'claim.intake_converged');
  if (target === 'intake_converged') return;
  await emit('intake_converged', 'documents_pending', 'claim.documents_received');
  if (target === 'documents_pending') return;
  await emit('documents_pending', 'verification_in_progress', 'claim.peer_mesh_pinged', {
    selected_member_ids: [randomUUID()],
    metric_id: 'district_cohort_v1',
    metric_version: 1,
  });
  if (target === 'verification_in_progress') return;
  await emit('verification_in_progress', 'verifier_review', 'claim.verifier_reviewing');
  if (target === 'verifier_review') return;
  await emit('verifier_review', 'verifier_approved', 'claim.verifier_approved');
  if (target === 'verifier_approved') return;
  await emit('verifier_approved', 'state_trustee_freeze', 'claim.state_trustee_frozen');
}

/** Drive a claim down the DENIAL → APPEAL branch to `appeal_stage_1` or `reversed` (v1-closed tier-3
 *  states — neither a nominee edit nor a routine admin correction is permitted there). */
async function driveAppeal(
  client: ReturnType<typeof getTx>['client'],
  cid: ClaimId,
  mid: MemberId,
  target: 'appeal_stage_1' | 'reversed',
): Promise<void> {
  const emit = emitter(client, cid, mid);
  await emit(null, 'intake_pending', 'claim.intake_initiated', { deceased_member_id: mid, intake_channel: 'member_app', claimant_actor_id: null });
  await emit('intake_pending', 'intake_converged', 'claim.intake_converged');
  await emit('intake_converged', 'documents_pending', 'claim.documents_received');
  await emit('documents_pending', 'verification_in_progress', 'claim.peer_mesh_pinged', { selected_member_ids: [randomUUID()], metric_id: 'district_cohort_v1', metric_version: 1 });
  await emit('verification_in_progress', 'verifier_review', 'claim.verifier_reviewing');
  await emit('verifier_review', 'denied', 'claim.verifier_denied');
  await emit('denied', 'appeal_stage_1', 'claim.appeal_stage1_initiated');
  if (target === 'appeal_stage_1') return;
  await emit('appeal_stage_1', 'reversed', 'claim.appeal_stage1_reviewed', { decision: 'reversed' });
}

async function countEvents(tx: ReturnType<typeof getTx>['tx'], streamId: string): Promise<number> {
  const rows = await tx
    .select()
    .from(schema.eventsLog)
    .where(and(eq(schema.eventsLog.streamId, streamId), eq(schema.eventsLog.eventType, 'claim.nominee_bank_recorded')));
  return rows.length;
}

describe.skipIf(!hasDatabase)('claim-time nominee bank (PARIWAR_A scope)', () => {
  setupLiveDb();

  it('AC1: records both accounts (PII ciphertext as-stored, ranked #1/#2) + appends the identity event; state unchanged', async () => {
    const { client, tx } = getTx();
    const cid = toClaimId(randomUUID());
    const mid = toMemberId(randomUUID());
    await enterAppScope(client, PARIWAR_A);
    await driveTo(client, cid, mid, 'verification_in_progress');

    const { accounts } = await recordClaimNomineeBankAccounts(client, {
      claimCaseId: cid,
      pariwarId: PARIWAR_A,
      accounts: accountsFixture(),
      recordedByActor: MEMBER_ACTOR,
      actor: 'member',
    });
    expect(accounts).toHaveLength(2);

    const stored = await getClaimNomineeBankAccountsCiphertext(tx, PARIWAR_A, cid);
    expect(stored.map((a) => a.accountRank)).toEqual([1, 2]);
    // PII stored as the ciphertext the caller supplied (never plaintext).
    expect(stored[0]?.accountHolderNameCiphertext).toBe('enc:v1:holder-1');
    expect(stored[0]?.accountNumberCiphertext).toBe('enc:v1:acct-1');
    expect(stored[0]?.ifscCiphertext).toBe('enc:v1:ifsc-1');
    // Tier-3 plaintext preserved.
    expect(stored[0]?.bankName).toBe('State Bank of India');
    expect(stored[1]?.bankName).toBe('HDFC Bank');
    expect(stored[0]?.ifscValidated).toBe(true);

    // Exactly one identity event; the claim stayed in verification.
    expect(await countEvents(tx, cid)).toBe(1);
    const claimRow = await tx.select().from(schema.claims).where(eq(schema.claims.claimCaseId, cid));
    expect(claimRow[0]?.currentState).toBe('verification_in_progress');
  });

  it('AC1: latest-wins replace — re-recording swaps the pair, no orphan rows', async () => {
    const { client, tx } = getTx();
    const cid = toClaimId(randomUUID());
    const mid = toMemberId(randomUUID());
    await enterAppScope(client, PARIWAR_A);
    await driveTo(client, cid, mid, 'verification_in_progress');

    await recordClaimNomineeBankAccounts(client, {
      claimCaseId: cid,
      pariwarId: PARIWAR_A,
      accounts: accountsFixture(),
      recordedByActor: MEMBER_ACTOR,
      actor: 'member',
    });
    // Re-record with a different #1 holder ciphertext.
    await recordClaimNomineeBankAccounts(client, {
      claimCaseId: cid,
      pariwarId: PARIWAR_A,
      accounts: accountsFixture({ accountHolderNameCiphertext: 'enc:v1:holder-1-EDITED' }),
      recordedByActor: MEMBER_ACTOR,
      actor: 'member',
    });

    const stored = await getClaimNomineeBankAccountsCiphertext(tx, PARIWAR_A, cid);
    // Still exactly two rows (delete-then-insert, composite PK) — the old #1 is gone, not orphaned.
    expect(stored).toHaveLength(2);
    expect(stored[0]?.accountHolderNameCiphertext).toBe('enc:v1:holder-1-EDITED');
    // Two events (one per recording — both identity annotations).
    expect(await countEvents(tx, cid)).toBe(2);
  });

  it('AC1: collection is allowed from intake_converged (early in the window)', async () => {
    const { client, tx } = getTx();
    const cid = toClaimId(randomUUID());
    const mid = toMemberId(randomUUID());
    await enterAppScope(client, PARIWAR_A);
    await driveTo(client, cid, mid, 'intake_converged');

    await recordClaimNomineeBankAccounts(client, {
      claimCaseId: cid,
      pariwarId: PARIWAR_A,
      accounts: accountsFixture(),
      recordedByActor: MEMBER_ACTOR,
      actor: 'operator',
    });
    expect(await getClaimNomineeBankAccountsCiphertext(tx, PARIWAR_A, cid)).toHaveLength(2);
    const claimRow = await tx.select().from(schema.claims).where(eq(schema.claims.claimCaseId, cid));
    expect(claimRow[0]?.currentState).toBe('intake_converged');
  });

  it('D3 guard: recording on a pre-converged (intake_pending) claim throws + persists NO row/event', async () => {
    const { client, tx } = getTx();
    const cid = toClaimId(randomUUID());
    const mid = toMemberId(randomUUID());
    await enterAppScope(client, PARIWAR_A);
    await driveTo(client, cid, mid, 'intake_pending');

    await expect(
      recordClaimNomineeBankAccounts(client, {
        claimCaseId: cid,
        pariwarId: PARIWAR_A,
        accounts: accountsFixture(),
        recordedByActor: MEMBER_ACTOR,
        actor: 'member',
      }),
    ).rejects.toBeInstanceOf(NomineeBankClaimNotCollectableError);

    expect(await getClaimNomineeBankAccountsCiphertext(tx, PARIWAR_A, cid)).toEqual([]);
    expect(await countEvents(tx, cid)).toBe(0);
  });

  it('D3 tier-1: the nominee window now extends through verifier_review (before verifier_approved)', async () => {
    const { client, tx } = getTx();
    const cid = toClaimId(randomUUID());
    const mid = toMemberId(randomUUID());
    await enterAppScope(client, PARIWAR_A);
    await driveTo(client, cid, mid, 'verifier_review');

    await recordClaimNomineeBankAccounts(client, {
      claimCaseId: cid,
      pariwarId: PARIWAR_A,
      accounts: accountsFixture(),
      recordedByActor: MEMBER_ACTOR,
      actor: 'member',
    });
    expect(await getClaimNomineeBankAccountsCiphertext(tx, PARIWAR_A, cid)).toHaveLength(2);
  });

  it('D3 tier-1: a NON-admin (nominee) can NOT record once the claim is verifier_approved (read-only after approval)', async () => {
    const { client } = getTx();
    const cid = toClaimId(randomUUID());
    const mid = toMemberId(randomUUID());
    await enterAppScope(client, PARIWAR_A);
    await driveTo(client, cid, mid, 'verifier_approved');

    await expect(
      recordClaimNomineeBankAccounts(client, {
        claimCaseId: cid,
        pariwarId: PARIWAR_A,
        accounts: accountsFixture(),
        recordedByActor: MEMBER_ACTOR,
        actor: 'member',
        // allowCorrection omitted (nominee) → not editable at verifier_approved.
      }),
    ).rejects.toBeInstanceOf(NomineeBankClaimNotCollectableError);
  });

  it('D3 tier-2: an authorized admin CAN correct at verifier_approved with a reason (event carries corrected=true)', async () => {
    const { client, tx } = getTx();
    const cid = toClaimId(randomUUID());
    const mid = toMemberId(randomUUID());
    await enterAppScope(client, PARIWAR_A);
    await driveTo(client, cid, mid, 'verifier_approved');

    const { corrected } = await recordClaimNomineeBankAccounts(client, {
      claimCaseId: cid,
      pariwarId: PARIWAR_A,
      accounts: accountsFixture(),
      recordedByActor: MEMBER_ACTOR,
      actor: 'operator',
      allowCorrection: true,
      correctionReason: 'account #1 was closed by the bank',
    });
    expect(corrected).toBe(true);
    expect(await getClaimNomineeBankAccountsCiphertext(tx, PARIWAR_A, cid)).toHaveLength(2);
    const events = await tx
      .select()
      .from(schema.eventsLog)
      .where(and(eq(schema.eventsLog.streamId, cid), eq(schema.eventsLog.eventType, 'claim.nominee_bank_recorded')));
    expect(events[0]?.payload).toMatchObject({ corrected: true });
    // The reason NEVER lands in the events_log payload (it belongs to the audit sink).
    expect(JSON.stringify(events[0]?.payload)).not.toContain('closed by the bank');
  });

  it('D3 tier-2: an admin correction at verifier_approved WITHOUT a reason throws', async () => {
    const { client } = getTx();
    const cid = toClaimId(randomUUID());
    const mid = toMemberId(randomUUID());
    await enterAppScope(client, PARIWAR_A);
    await driveTo(client, cid, mid, 'verifier_approved');

    await expect(
      recordClaimNomineeBankAccounts(client, {
        claimCaseId: cid,
        pariwarId: PARIWAR_A,
        accounts: accountsFixture(),
        recordedByActor: MEMBER_ACTOR,
        actor: 'operator',
        allowCorrection: true,
        // correctionReason missing
      }),
    ).rejects.toBeInstanceOf(NomineeBankCorrectionReasonRequiredError);
  });

  it('D3 tier-3: after the claim/cycle freeze, even an admin-with-reason is rejected (emergency workflow only)', async () => {
    const { client } = getTx();
    const cid = toClaimId(randomUUID());
    const mid = toMemberId(randomUUID());
    await enterAppScope(client, PARIWAR_A);
    await driveTo(client, cid, mid, 'state_trustee_freeze');

    await expect(
      recordClaimNomineeBankAccounts(client, {
        claimCaseId: cid,
        pariwarId: PARIWAR_A,
        accounts: accountsFixture(),
        recordedByActor: MEMBER_ACTOR,
        actor: 'operator',
        allowCorrection: true,
        correctionReason: 'too late — should be rejected',
      }),
    ).rejects.toBeInstanceOf(NomineeBankClaimNotCollectableError);
  });

  it('rejects an account set that is not exactly {1, 2}', async () => {
    const { client } = getTx();
    const cid = toClaimId(randomUUID());
    const mid = toMemberId(randomUUID());
    await enterAppScope(client, PARIWAR_A);
    await driveTo(client, cid, mid, 'verification_in_progress');

    await expect(
      recordClaimNomineeBankAccounts(client, {
        claimCaseId: cid,
        pariwarId: PARIWAR_A,
        accounts: [accountsFixture()[0]!],
        recordedByActor: MEMBER_ACTOR,
        actor: 'member',
      }),
    ).rejects.toBeInstanceOf(NomineeBankAccountSetError);
  });

  it('DB-level CHECK backstops the {1, 2} rank invariant even bypassing the app writer (0057)', async () => {
    const { client } = getTx();
    const cid = toClaimId(randomUUID());
    const mid = toMemberId(randomUUID());
    await enterAppScope(client, PARIWAR_A);
    await driveTo(client, cid, mid, 'verification_in_progress');

    await expect(
      client.query(
        `INSERT INTO claim_nominee_bank_accounts
           (claim_case_id, pariwar_id, account_rank, account_holder_name_ciphertext, account_number_ciphertext, ifsc_ciphertext, bank_name)
         VALUES ($1, $2, 3, 'enc:v1:x', 'enc:v1:y', 'enc:v1:z', 'Test Bank')`,
        [cid, PARIWAR_A],
      ),
    ).rejects.toMatchObject({ code: '23514' });
  });

  it.each(['appeal_stage_1', 'reversed'] as const)(
    'D3 tier-3 (v1-closed): %s rejects even an authorized admin correction with a reason (appeal-remediation only)',
    async (target) => {
      const { client } = getTx();
      const cid = toClaimId(randomUUID());
      const mid = toMemberId(randomUUID());
      await enterAppScope(client, PARIWAR_A);
      await driveAppeal(client, cid, mid, target);

      await expect(
        recordClaimNomineeBankAccounts(client, {
          claimCaseId: cid,
          pariwarId: PARIWAR_A,
          accounts: accountsFixture(),
          recordedByActor: MEMBER_ACTOR,
          actor: 'operator',
          allowCorrection: true,
          correctionReason: 'should be rejected — appeal/reversed is out of scope in v1',
        }),
      ).rejects.toBeInstanceOf(NomineeBankClaimNotCollectableError);
    },
  );

  it('AC3: read accessor returns [] for a claim with no accounts', async () => {
    const { client, tx } = getTx();
    const cid = toClaimId(randomUUID());
    const mid = toMemberId(randomUUID());
    await enterAppScope(client, PARIWAR_A);
    await driveTo(client, cid, mid, 'verification_in_progress');
    expect(await getClaimNomineeBankAccountsCiphertext(tx, PARIWAR_A, cid)).toEqual([]);
  });

  it('AC5: tenant isolation — a cross-Pariwar read resolves to empty', async () => {
    const { client, tx } = getTx();
    const cid = toClaimId(randomUUID());
    const mid = toMemberId(randomUUID());
    await enterAppScope(client, PARIWAR_A);
    await driveTo(client, cid, mid, 'verification_in_progress');
    await recordClaimNomineeBankAccounts(client, {
      claimCaseId: cid,
      pariwarId: PARIWAR_A,
      accounts: accountsFixture(),
      recordedByActor: MEMBER_ACTOR,
      actor: 'member',
    });
    // PARIWAR_A reads its two accounts…
    expect(await getClaimNomineeBankAccountsCiphertext(tx, PARIWAR_A, cid)).toHaveLength(2);
    // …but a PARIWAR_B-scoped read of the SAME claim id sees nothing (explicit predicate + RLS).
    expect(await getClaimNomineeBankAccountsCiphertext(tx, PARIWAR_B, cid)).toEqual([]);
  });
});
