// Claim-time nominee bank collection — helpline operator E2E (live DB :5433) — Story 6.8 (Task 7).
//
// Drives the operator dual-account collection through the REAL admin guard chain
// [adminSession, scope, requirePermissionHook(claim.file), requireStepUp('claim_file')] via a
// cookie-threading client:
//   · permission gate: an admin WITHOUT claim.file → 403 (the route is permission-gated);
//   · happy path: claim.file holder + a fresh 'claim_file' elevation → 201, 2 encrypted rows +
//     the identity event, the helpline audit line is NON-PII;
//   · IFSC lookup: the helpline twin resolves a known IFSC (200).
//
// ⚠ Own-committing (scope tx commits on 2xx). Fresh random pariwarId per test.

import { randomUUID } from 'node:crypto';

import { claim, ids } from '@twt/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { AppDeps } from '../../../src/context.js';
import * as service from '../../../src/modules/auth/admin/admin-auth.service.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { seedNomineeNameCheck } from '../_nominee-name-check-fixture.js';
import { buildServer } from '../../../src/server.js';
import {
  buildTestDeps,
  hasDatabase,
  makeClient,
  type CapturingStepUpDelivery,
  type TestDeps,
} from '../_setup.js';
import { FakeWebAuthnProvider } from '../_webauthn-fake.js';

type Client = ReturnType<typeof makeClient>;

const account = (over: Partial<{ accountHolderName: string; accountNumber: string; ifsc: string }> = {}) => ({
  accountHolderName: 'Ravi Kumar',
  accountNumber: '123456789012',
  ifsc: 'SBIN0000001',
  ...over,
});

describe.skipIf(!hasDatabase)('Claim-time nominee bank — helpline E2E (:5433)', () => {
  let td: TestDeps;
  let deps: AppDeps;
  let fakeWebauthn: FakeWebAuthnProvider;
  let adminStepUp: CapturingStepUpDelivery;
  let app: Awaited<ReturnType<typeof buildServer>>;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    fakeWebauthn = new FakeWebAuthnProvider();
    td = buildTestDeps({ webauthn: fakeWebauthn });
    deps = td.deps;
    adminStepUp = td.adminStepUpDelivery;
    app = await buildServer(deps);
  });

  afterAll(async () => {
    await app.close();
    const c = await td.pool.connect();
    try {
      if (createdUserIds.length > 0) {
        await c.query(`DELETE FROM admin_sessions WHERE sess ->> 'userId' = ANY($1)`, [createdUserIds]);
        await c.query(`DELETE FROM role_grants WHERE user_id = ANY($1)`, [createdUserIds]);
        await c.query(`DELETE FROM users WHERE id = ANY($1)`, [createdUserIds]);
      }
    } finally {
      c.release();
    }
    await td.pool.end();
  });

  async function authenticate(): Promise<{ client: Client; userId: string }> {
    const email = `nb-${randomUUID()}@example.test`;
    const password = 'CorrectHorseBatteryStaple9';
    const userId = await service.createAdminAccount(deps, { email, password });
    createdUserIds.push(userId);
    const credentialId = `cred-${userId}`;
    fakeWebauthn.nextRegistration = { verified: true, credential: { id: credentialId, publicKey: 'pk', counter: 0 } };
    fakeWebauthn.nextAuthentication = { verified: true, newCounter: 1 };
    const client = makeClient(app);
    const token = service.mintEnrollmentToken(deps, userId);
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/register/options', payload: { enrollmentToken: token } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/register/verify', payload: { response: { id: 'b' }, enrollmentToken: token } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email, password } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/authenticate/options', payload: {} });
    const verify = await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/authenticate/verify', payload: { response: { id: credentialId } } });
    expect(verify.statusCode).toBe(200);
    return { client, userId };
  }

  async function grantRole(userId: string, pariwarId: string, role: string): Promise<void> {
    const c = await td.pool.connect();
    try {
      await c.query(
        `INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value)
           VALUES ($1, $2, $3, 'pariwar', $4)`,
        [userId, pariwarId, role, pariwarId],
      );
    } finally {
      c.release();
    }
  }

  async function elevateClaimFile(client: Client): Promise<void> {
    const req = await client.inject({ method: 'POST', url: '/api/v1/auth/step-up/request', payload: { actionContext: 'claim_file' } });
    expect(req.statusCode).toBe(200);
    const code = adminStepUp.last?.code as string;
    const ver = await client.inject({ method: 'POST', url: '/api/v1/auth/step-up/verify', payload: { otp: code } });
    expect(ver.statusCode).toBe(200);
  }

  // ⭐ `reversed` ADDED 2026-09-22 (code review): ⛔ no API test could reach it, and it is one of
  // the two states AC5's correction exception exists FOR — tier-2 excludes it, so a write there is
  // authorised by the governance record ALONE.
  type SeedTarget = 'intake_converged' | 'verifier_approved' | 'state_trustee_freeze' | 'reversed';

  /** Seed a committed claim driven to `target` (a collectable state, or a post-approval / frozen state). */
  async function seedClaimAt(pariwarId: string, target: SeedTarget): Promise<string> {
    const claimCaseId = ids.claimId(randomUUID());
    const deceasedMemberId = ids.memberId(randomUUID());
    const scopeTx = await openScopeTx(deps, pariwarId);
    const base = { pariwarId: ids.pariwarId(pariwarId), deceasedMemberId, intakeChannels: ['helpline'] as const, claimantActorId: null };
    const emit = (from: string | null, to: string, eventType: string, extra: Record<string, unknown> = {}) =>
      claim.projectClaimState(scopeTx.client, {
        claimCaseId, ...base, eventType: eventType as never,
        payload: { from_state: from, to_state: to, trigger: 'seed', actor: 'system', ...extra }, actorId: null,
      });
    try {
      await emit(null, 'intake_pending', 'claim.intake_initiated', { deceased_member_id: String(deceasedMemberId), intake_channel: 'helpline', claimant_actor_id: null, actor: 'operator' });
      await emit('intake_pending', 'intake_converged', 'claim.intake_converged');
      if (target !== 'intake_converged') {
        await emit('intake_converged', 'documents_pending', 'claim.documents_received');
        await emit('documents_pending', 'verification_in_progress', 'claim.peer_mesh_pinged', { selected_member_ids: [randomUUID()], metric_id: 'district_cohort_v1', metric_version: 1 });
        await emit('verification_in_progress', 'verifier_review', 'claim.verifier_reviewing');
        await emit('verifier_review', 'verifier_approved', 'claim.verifier_approved');
      }
      if (target === 'state_trustee_freeze') {
        await emit('verifier_approved', 'state_trustee_freeze', 'claim.state_trustee_frozen');
      }
      if (target === 'reversed') {
        // ⚠ The ONLY route the state machine offers: a denial, then an appeal that overturns it.
        // `decision` is REQUIRED on the stage-1 review and is the reducer's branch key — the same
        // event type also reaches `appeal_stage_2` and `denied`.
        await emit('verifier_approved', 'state_trustee_freeze', 'claim.state_trustee_frozen');
        // ⚠ `claim.state_trustee_denied`'s payload is `.strict()` and carries ⛔ no `reason_code` —
        // the reason lives on the DECISION ROW, ⛔ not the event.
        await emit('state_trustee_freeze', 'denied', 'claim.state_trustee_denied');
        await emit('denied', 'appeal_stage_1', 'claim.appeal_stage1_initiated');
        await emit('appeal_stage_1', 'reversed', 'claim.appeal_stage1_reviewed', { decision: 'reversed' });
      }
      await closeScopeTx(scopeTx, true);
    } catch (err) {
      await closeScopeTx(scopeTx, false);
      throw err;
    }
    return String(claimCaseId);
  }
  const seedConvergedClaim = (pariwarId: string) => seedClaimAt(pariwarId, 'intake_converged');

  const recordUrl = (pariwarId: string, claimCaseId: string): string =>
    `/api/v1/p/${pariwarId}/admin/claims/${claimCaseId}/nominee-bank`;
  const statusUrl = recordUrl;

  it('permission gate: an admin WITHOUT claim.file is denied (not 201)', async () => {
    const pariwarId = randomUUID();
    const { client } = await authenticate();
    // No grantRole — the scope/permission chain must reject. An admin with no grant in the pariwar
    // resolves to 404 (existence-defense) rather than 403; either way the write is denied + nothing persists.
    const claimCaseId = await seedConvergedClaim(pariwarId);
    const res = await client.inject({
      method: 'POST', url: recordUrl(pariwarId, claimCaseId),
      payload: { accounts: [account(), account({ accountNumber: '987654321098', ifsc: 'HDFC0000001' })] } as unknown as object,
    });
    expect([403, 404]).toContain(res.statusCode);
    const rows = await td.pool.query(`SELECT 1 FROM claim_nominee_bank_accounts WHERE claim_case_id = $1`, [claimCaseId]);
    expect(rows.rows).toHaveLength(0);
  });

  it('happy path: claim.file + fresh elevation → 201, 2 encrypted rows + identity event, audit NON-PII', async () => {
    const pariwarId = randomUUID();
    const { client, userId } = await authenticate();
    await grantRole(userId, pariwarId, 'helpline_operator');
    await elevateClaimFile(client);
    const claimCaseId = await seedConvergedClaim(pariwarId);

    const res = await client.inject({
      method: 'POST', url: recordUrl(pariwarId, claimCaseId),
      payload: { accounts: [account({ ifsc: 'SBIN0000001' }), account({ accountNumber: '987654321098', ifsc: 'HDFC0000001' })] } as unknown as object,
    });
    expect(res.statusCode).toBe(201);
    const body = res.json<{ accounts: Array<{ rank: number; bankName: string }> }>();
    expect(body.accounts.map((a) => a.rank)).toEqual([1, 2]);
    expect(body.accounts[0]?.bankName).toBe('State Bank of India');

    const rows = await td.pool.query<{ n: string }>(
      `SELECT count(*)::text AS n FROM claim_nominee_bank_accounts WHERE claim_case_id = $1`, [claimCaseId],
    );
    expect(Number(rows.rows[0]?.n)).toBe(2);

    const events = await td.pool.query<{ n: string }>(
      `SELECT count(*)::text AS n FROM events_log WHERE stream_id = $1 AND event_type = 'claim.nominee_bank_recorded'`, [claimCaseId],
    );
    expect(Number(events.rows[0]?.n)).toBe(1);

    expect(td.auditSink.ofType('helpline_claim.nominee_bank_recorded').length).toBe(1);
    const auditStr = JSON.stringify(td.auditSink.events);
    expect(auditStr).not.toContain('123456789012');
    expect(auditStr).not.toContain('Ravi Kumar');
  });

  it("⭐⭐ AC7 — the filer's NOTE survives POST → ciphertext → the AC2 read, and rides nowhere else", async () => {
    // ⚠⚠ THIS PATH WAS UNEXERCISED AT EVERY LAYER (code review 2026-09-22). `grep
    // nameDifferenceNote|name_difference_note` over `apps/api/tests` matched ⛔ ONLY
    // `nameDifferenceNoteCiphertext: null` seeds, and `seedAccountsWithNames` never set the column
    // — so the handler's note-DECRYPT branch had ⛔ never been run by anything, at any level (the
    // admin card and panel tests are against mocks).
    //
    // ⭐ THE NOTE IS THE ONE NAMED EXCEPTION to nominee-bank.ts's "never echo" rule (`-226` cl.2):
    // the filer may explain a clerical difference — *"the bank shortened her name"* — and the
    // District Admin must be able to READ that explanation. So the assertions run both ways: it
    // comes BACK on the AC2 read, and it does ⛔ NOT appear in the audit trail.
    const NOTE = 'the bank shortened her name to A. Devi';
    const pariwarId = randomUUID();
    const { client, userId } = await authenticate();
    await grantRole(userId, pariwarId, 'helpline_operator');
    await elevateClaimFile(client);
    const claimCaseId = await seedConvergedClaim(pariwarId);
    td.auditSink.events.length = 0;

    const res = await client.inject({
      method: 'POST', url: recordUrl(pariwarId, claimCaseId),
      payload: {
        accounts: [
          { ...account({ ifsc: 'SBIN0000001' }), nameDifferenceNote: NOTE },
          account({ accountNumber: '987654321098', ifsc: 'HDFC0000001' }),
        ],
      } as unknown as object,
    });
    expect(res.statusCode, res.body).toBe(201);

    // (1) STORED AS CIPHERTEXT — ⛔ never as plaintext, on rank 1 only.
    const rows = await td.pool.query<{ rank: number; note: string | null }>(
      `SELECT account_rank AS rank, name_difference_note_ciphertext AS note
         FROM claim_nominee_bank_accounts WHERE claim_case_id = $1 ORDER BY account_rank`,
      [claimCaseId],
    );
    expect(rows.rows).toHaveLength(2);
    expect(rows.rows[0]!.note, 'the note was not stored at all').toBeTruthy();
    expect(rows.rows[0]!.note, 'the note was stored as PLAINTEXT').not.toContain('shortened');
    // ⭐ And rank 2 carries NULL — the column is per-account, ⛔ not per-claim.
    expect(rows.rows[1]!.note).toBeNull();

    // ⚠⚠ (2) THE READ-BACK HALF IS ⛔ NOT HERE, AND THE REASON IS A REAL CONSTRAINT, ⛔ not a
    //     shortcut. The AC2 read resolves the caller's scope from the DECEASED MEMBER'S POSTING
    //     DISTRICT, and this spec's `seedClaimAt` creates a claim against a bare member UUID with
    //     ⛔ no `members` row and ⛔ no posting — so the district target is `null` and the read is
    //     403 for EVERY role, `super_admin` included (the carried residual in `deferred-work.md`).
    //     ⭐ The read-back leg therefore lives in `nominee-name-check.spec.ts`, which seeds the
    //     posting: *"AC7 — the filer's note comes BACK on the AC2 read"*. Between them the path is
    //     covered end to end; ⛔ neither file claims to cover it alone.

    // (3) ⭐ IT IS ⛔ NOT IN THE AUDIT TRAIL. The note is a permitted DISCLOSURE to a named reader,
    //     ⛔ not a thing to scatter into logs — the same rule the holder name lives under.
    expect(JSON.stringify(td.auditSink.events)).not.toContain('shortened');
  });

  it('review finding (2026-07-11): GET status is [] before recording, the presence view after', async () => {
    const pariwarId = randomUUID();
    const { client, userId } = await authenticate();
    await grantRole(userId, pariwarId, 'helpline_operator');
    const claimCaseId = await seedConvergedClaim(pariwarId);

    const before = await client.inject({ method: 'GET', url: statusUrl(pariwarId, claimCaseId) });
    expect(before.statusCode).toBe(200);
    expect(before.json<{ accounts: unknown[] }>().accounts).toEqual([]);

    await elevateClaimFile(client);
    const record = await client.inject({
      method: 'POST', url: recordUrl(pariwarId, claimCaseId),
      payload: { accounts: [account({ ifsc: 'SBIN0000001' }), account({ accountNumber: '987654321098', ifsc: 'HDFC0000001' })] } as unknown as object,
    });
    expect(record.statusCode).toBe(201);

    const after = await client.inject({ method: 'GET', url: statusUrl(pariwarId, claimCaseId) });
    expect(after.statusCode).toBe(200);
    const body = after.json<{ accounts: Array<{ rank: number; bankName: string; ifscValidated: boolean; holderNamePresent: boolean; vpaPresent: boolean }> }>();
    expect(body.accounts).toEqual([
      { rank: 1, bankName: 'State Bank of India', ifscValidated: true, holderNamePresent: true, vpaPresent: false },
      { rank: 2, bankName: 'HDFC Bank', ifscValidated: true, holderNamePresent: true, vpaPresent: false },
    ]);
    const afterStr = JSON.stringify(body);
    expect(afterStr).not.toContain('123456789012');
    expect(afterStr).not.toContain('Ravi Kumar');
  });

  it('D3 tier-2 correction: verifier_approved + reason → 201 (corrected event flag + audited reason)', async () => {
    const pariwarId = randomUUID();
    const { client, userId } = await authenticate();
    await grantRole(userId, pariwarId, 'helpline_operator');
    await elevateClaimFile(client);
    const claimCaseId = await seedClaimAt(pariwarId, 'verifier_approved');

    const res = await client.inject({
      method: 'POST', url: recordUrl(pariwarId, claimCaseId),
      payload: { accounts: [account(), account({ accountNumber: '987654321098', ifsc: 'HDFC0000001' })], correctionReason: 'account #1 closed by the bank' } as unknown as object,
    });
    expect(res.statusCode).toBe(201);

    // The event carries corrected=true; the reason is NOT in the events_log payload.
    const ev = await td.pool.query<{ payload: Record<string, unknown> }>(
      `SELECT payload FROM events_log WHERE stream_id = $1 AND event_type = 'claim.nominee_bank_recorded'`, [claimCaseId],
    );
    expect(ev.rows[0]?.payload).toMatchObject({ corrected: true });
    expect(JSON.stringify(ev.rows[0]?.payload)).not.toContain('closed by the bank');

    // The audit line for THIS correction carries corrected + the operator justification (the
    // auditSink accumulates across the shared app, so filter by the unique reason string).
    const withReason = td.auditSink
      .ofType('helpline_claim.nominee_bank_recorded')
      .filter((a) => JSON.stringify(a).includes('closed by the bank'));
    expect(withReason.length).toBe(1);
    expect(JSON.stringify(withReason[0])).toContain('"corrected":true');
    const auditStr = JSON.stringify(td.auditSink.events);
    expect(auditStr).not.toContain('123456789012'); // still no account number
  });

  it('D3 tier-2 correction: verifier_approved WITHOUT a reason → 400 correction_reason_required', async () => {
    const pariwarId = randomUUID();
    const { client, userId } = await authenticate();
    await grantRole(userId, pariwarId, 'helpline_operator');
    await elevateClaimFile(client);
    const claimCaseId = await seedClaimAt(pariwarId, 'verifier_approved');

    const res = await client.inject({
      method: 'POST', url: recordUrl(pariwarId, claimCaseId),
      payload: { accounts: [account(), account({ accountNumber: '987654321098', ifsc: 'HDFC0000001' })] } as unknown as object,
    });
    expect(res.statusCode).toBe(400);
    expect(res.json<{ error: { code: string } }>().error.code).toBe('nominee_bank.correction_reason_required');
  });

  // ── AC12 — the ENGLISH-SCRIPT gate, at the BOUNDARY ────────────────────────────────────────
  //
  // ⚠⚠ ⛔ NO API TEST REFUSED A DEVANAGARI NAME ON ANY BOUND ROUTE (code review 2026-09-22). The
  // admin card refuses it in the CLIENT and so ⛔ never reaches the server — which means the
  // SERVER-side rule, the one that actually protects the data, was asserted ⛔ nowhere.
  //
  // ⭐ `2026-09-20-227` cl.9: *"Please use English Name everywhere to avoid this"* — the script
  // problem is solved at CAPTURE, ⛔ never by tolerating it at the check. ⇒ the boundary is where
  // that lives, and a client-only guard is a guard a second client ⛔ does not have.
  it('⚠⚠ AC12 — a DEVANAGARI holder name is refused at the BOUNDARY (400), ⛔ not only in the client', async () => {
    const pariwarId = randomUUID();
    const { client, userId } = await authenticate();
    await grantRole(userId, pariwarId, 'helpline_operator');
    await elevateClaimFile(client);
    const claimCaseId = await seedConvergedClaim(pariwarId);

    const res = await client.inject({
      method: 'POST', url: recordUrl(pariwarId, claimCaseId),
      payload: {
        accounts: [account({ accountHolderName: 'आशा देवी' }), account({ accountNumber: '987654321098', ifsc: 'HDFC0000001' })],
      } as unknown as object,
    });
    expect(res.statusCode, res.body).toBe(400);

    // ⭐ And ⛔ NOTHING persisted — a refusal that still wrote would be the worst outcome.
    const rows = await td.pool.query(`SELECT 1 FROM claim_nominee_bank_accounts WHERE claim_case_id = $1`, [claimCaseId]);
    expect(rows.rows).toHaveLength(0);
  });

  it('⭐⭐ AC12 — the gate ACCEPTS the real-world English forms it must ⛔ never refuse', async () => {
    // ⚠⚠ THE HALF THAT MATTERS MOST, AND IT HAD ⛔ NO TEST. A gate that is merely STRICT is easy;
    // a gate that refuses `A. Devi`, `Mary-Anne` or `D'Souza` would send a helpline operator into
    // a loop they ⛔ cannot escape, on a call with a bereaved family, over a name that is correct.
    // ⭐ Each of these is a name a real Indian bank account carries.
    const names = ['A. Devi', 'Mary-Anne Fernandes', "Priya D'Souza", 'Ravi Kumar Singh'];
    for (const [i, holder] of names.entries()) {
      const pariwarId = randomUUID();
      const { client, userId } = await authenticate();
      await grantRole(userId, pariwarId, 'helpline_operator');
      await elevateClaimFile(client);
      const claimCaseId = await seedConvergedClaim(pariwarId);

      const res = await client.inject({
        method: 'POST', url: recordUrl(pariwarId, claimCaseId),
        payload: {
          accounts: [
            account({ accountHolderName: holder }),
            account({ accountHolderName: holder, accountNumber: '987654321098', ifsc: 'HDFC0000001' }),
          ],
        } as unknown as object,
      });
      expect(res.statusCode, `"${holder}" (case ${i}) was refused: ${res.body}`).toBe(201);
    }
  });

  it('⭐ AC12 — the NOTE is ⛔ NOT script-gated: a family may explain in their own language', async () => {
    // ⭐⭐ THE DISTINCTION cl.9 ACTUALLY DRAWS, and getting it backwards would be the cruel version
    // of this rule. The HOLDER NAME must be English because it has to match a bank record. The
    // filer's NOTE is prose ABOUT that name — *"the bank shortened her name"* — and demanding it in
    // English would mean a grieving family cannot explain themselves at all.
    // ⚠ Pinned because the two fields sit side by side in the same payload, and a future edit that
    // "consistently" applied `EnglishScriptName` to both would pass every other test in this file.
    const pariwarId = randomUUID();
    const { client, userId } = await authenticate();
    await grantRole(userId, pariwarId, 'helpline_operator');
    await elevateClaimFile(client);
    const claimCaseId = await seedConvergedClaim(pariwarId);

    const res = await client.inject({
      method: 'POST', url: recordUrl(pariwarId, claimCaseId),
      payload: {
        accounts: [
          { ...account(), nameDifferenceNote: 'बैंक ने नाम छोटा कर दिया' },
          account({ accountNumber: '987654321098', ifsc: 'HDFC0000001' }),
        ],
      } as unknown as object,
    });
    expect(res.statusCode, res.body).toBe(201);
  });

  // ── AC5 — THE CORRECTION EXCEPTION, OVER HTTP ──────────────────────────────────────────────
  //
  // ⚠⚠ THE TWO EXISTING TESTS ARE ⛔ NOT PINS, and the review said exactly why: the tier-3 test
  // below (`state_trustee_freeze`, ⛔ no return) and its member-route sibling assert
  // `nominee_bank.not_collectable` where refusal is correct **both today and after the fix**. A
  // test that passes before and after the change it is supposed to guard is ⛔ not guarding it.
  // ⭐ The pin is the POSITIVE case: the SAME state, the SAME payload, with the governance record
  // live ⇒ the write must now SUCCEED. That is the only assertion chunk 2's fix can move.

  /**
   * Give the claim its two accounts and a recorded check with `verdicts`, through the REAL domain
   * writers — ⛔ never by stubbing the gate, so these specs keep exercising the production path.
   *
   * ⚠ The shared fixture DELETE-then-INSERTs the accounts on every call, so a second call moves
   * `updated_at` and then records the new verdict against the NEW stamps — which is what makes a
   * re-check current rather than instantly stale.
   */
  const seedCheck = (
    pariwarId: string,
    claimCaseId: string,
    verdicts: readonly ['matches' | 'does_not_match', 'matches' | 'does_not_match'],
  ): Promise<void> => seedNomineeNameCheck(deps, pariwarId, claimCaseId, { verdicts });

  /** Open a live `correction_return` row through the real domain writer. */
  async function returnTheClaim(pariwarId: string, claimCaseId: string): Promise<void> {
    const scopeTx = await openScopeTx(deps, pariwarId);
    try {
      await claim.returnToDistrictAdmin(scopeTx.client, {
        claimCaseId: ids.claimId(claimCaseId),
        pariwarId: ids.pariwarId(pariwarId),
        reasonCode: 'other',
        rationaleCiphertext: 'enc:v1:the-holder-name-is-not-the-nominee',
        actorId: '88888888-8888-8888-8888-888888888888',
        actorDisplay: 'Pariwar Admin One',
        actor: 'trustee',
      });
      await closeScopeTx(scopeTx, true);
    } catch (err) {
      await closeScopeTx(scopeTx, false);
      throw err;
    }
  }

  const correctionPayload = {
    accounts: [account(), account({ accountNumber: '987654321098', ifsc: 'HDFC0000001' })],
    correctionReason: 'corrected after the Pariwar Admin sent it back',
  } as unknown as object;

  for (const state of ['state_trustee_freeze', 'reversed'] as const) {
    it(`⭐⭐ AC5 — a LIVE RETURN unlocks the helpline correction at \`${state}\` (over HTTP)`, async () => {
      const pariwarId = randomUUID();
      const { client, userId } = await authenticate();
      await grantRole(userId, pariwarId, 'helpline_operator');
      await elevateClaimFile(client);
      const claimCaseId = await seedClaimAt(pariwarId, state);

      // ⭐ NEGATIVE CONTROL FIRST — refused with ⛔ no return. Without this the success below could
      // mean the state was writable all along.
      const before = await client.inject({
        method: 'POST', url: recordUrl(pariwarId, claimCaseId), payload: correctionPayload,
      });
      expect(before.statusCode, before.body).toBe(409);
      expect(before.json<{ error: { code: string } }>().error.code).toBe('nominee_bank.not_collectable');

      await returnTheClaim(pariwarId, claimCaseId);

      // ⭐ THE PIN: the SAME call, the SAME state, now PERMITTED on the strength of the live
      // governance row alone. ⚠ This is the assertion chunk 2's fix moves; the refusals above and
      // below it are correct before AND after, so ⛔ only this one guards the change.
      const after = await client.inject({
        method: 'POST', url: recordUrl(pariwarId, claimCaseId), payload: correctionPayload,
      });
      expect(after.statusCode, after.body).toBe(201);

      const rows = await td.pool.query<{ n: string }>(
        `SELECT count(*)::text AS n FROM claim_nominee_bank_accounts WHERE claim_case_id = $1`, [claimCaseId],
      );
      expect(Number(rows.rows[0]?.n)).toBe(2);
    });
  }

  it("⭐⭐ AC5 — the DA's `does_not_match` ALONE unlocks it too — the OTHER half of `correctionNeeded`", async () => {
    // ⚠⚠ `underCorrection` is a DISJUNCTION: a live RETURN **or** a current check that sends the
    // claim back. ⛔ Nothing over HTTP covered the second half — and it is AC5's own worked
    // example, the case where the District Admin has seen the names and said they differ.
    const pariwarId = randomUUID();
    const { client, userId } = await authenticate();
    await grantRole(userId, pariwarId, 'helpline_operator');
    await elevateClaimFile(client);
    const claimCaseId = await seedClaimAt(pariwarId, 'state_trustee_freeze');

    // Give the claim its accounts + a PASSING check first, through the real domain writer, and
    // confirm the correction is refused — the negative control for the verdict.
    await seedCheck(pariwarId, claimCaseId, ['matches', 'matches']);
    const before = await client.inject({
      method: 'POST', url: recordUrl(pariwarId, claimCaseId), payload: correctionPayload,
    });
    expect(before.statusCode, before.body).toBe(409);

    // ⭐ Now the District Admin records `does_not_match`. ⛔ No return row exists.
    await seedCheck(pariwarId, claimCaseId, ['matches', 'does_not_match']);
    const after = await client.inject({
      method: 'POST', url: recordUrl(pariwarId, claimCaseId), payload: correctionPayload,
    });
    expect(after.statusCode, after.body).toBe(201);
  });

  it('⭐ AC5 — the STATUS read reports `correctionNeeded` from BOTH halves (return AND verdict)', async () => {
    // ⚠ The filer-facing banner (chunk 3) reads `correctionNeeded`. ⛔ Nothing asserted it over
    // HTTP for EITHER half.
    // ⚠⚠ SCOPE, STATED SO IT IS ⛔ NOT OVERCLAIMED: `memberEditable` lives on the MEMBER route
    // (`claims.nominee-bank.handlers.ts`), ⛔ not this helpline one, so the property *"the member
    // stays shut while the banner says correct it"* is ⛔ NOT asserted here. It belongs with the
    // member-route spec and is recorded as still owed.
    const pariwarId = randomUUID();
    const { client, userId } = await authenticate();
    await grantRole(userId, pariwarId, 'helpline_operator');
    await elevateClaimFile(client);

    const viaReturn = await seedClaimAt(pariwarId, 'state_trustee_freeze');
    await seedCheck(pariwarId, viaReturn, ['matches', 'matches']);
    const quiet = await client.inject({ method: 'GET', url: statusUrl(pariwarId, viaReturn) });
    // ⛔ NON-VACUITY: it is FALSE before either half is true.
    expect(quiet.json<{ correctionNeeded: boolean }>().correctionNeeded).toBe(false);

    await returnTheClaim(pariwarId, viaReturn);
    const flagged = await client.inject({ method: 'GET', url: statusUrl(pariwarId, viaReturn) });
    expect(flagged.json<{ correctionNeeded: boolean }>().correctionNeeded, 'the RETURN half').toBe(true);

    const viaVerdict = await seedClaimAt(pariwarId, 'state_trustee_freeze');
    await seedCheck(pariwarId, viaVerdict, ['matches', 'does_not_match']);
    const flagged2 = await client.inject({ method: 'GET', url: statusUrl(pariwarId, viaVerdict) });
    expect(flagged2.json<{ correctionNeeded: boolean }>().correctionNeeded, 'the VERDICT half').toBe(true);
  });

  it('D3 tier-3: after the claim/cycle freeze → 409 not_collectable (emergency workflow only)', async () => {
    const pariwarId = randomUUID();
    const { client, userId } = await authenticate();
    await grantRole(userId, pariwarId, 'helpline_operator');
    await elevateClaimFile(client);
    const claimCaseId = await seedClaimAt(pariwarId, 'state_trustee_freeze');

    const res = await client.inject({
      method: 'POST', url: recordUrl(pariwarId, claimCaseId),
      payload: { accounts: [account(), account({ accountNumber: '987654321098', ifsc: 'HDFC0000001' })], correctionReason: 'too late' } as unknown as object,
    });
    expect(res.statusCode).toBe(409);
    expect(res.json<{ error: { code: string } }>().error.code).toBe('nominee_bank.not_collectable');
  });

  it('IFSC lookup twin resolves a known IFSC (200)', async () => {
    const pariwarId = randomUUID();
    const { client, userId } = await authenticate();
    await grantRole(userId, pariwarId, 'helpline_operator');
    const res = await client.inject({ method: 'GET', url: `/api/v1/p/${pariwarId}/admin/claims/ifsc/HDFC0000001` });
    expect(res.statusCode).toBe(200);
    expect(res.json<{ bankName: string }>().bankName).toBe('HDFC Bank');
  });
  // ── Checklist family 3 (API) — cross-PARIWAR denial on the helpline bank route ───────────
  //
  // ⚠⚠ `grep -ciE 'pariwarB|cross-pariwar'` over this spec returned **0**. This is the route D4's
  // third branch made STATE-INDEPENDENT — a helpline operator may correct accounts on a claim that
  // is already deep in the trustee flow — so it is the one place where a tenant-scoping slip would
  // let an operator rewrite payout destinations on another Pariwar's claim. It had ⛔ no
  // cross-tenant test at all.
  //
  // ⭐ 404, ⛔ NOT 403, and that is deliberate: `middleware/scope-resolution` collapses "Pariwar
  // doesn't exist" and "no membership" into **not found** so no route becomes an enumeration oracle
  // for tenant ids. Asserting 403 here would pin the wrong contract.
  describe('checklist family 3 — a helpline operator of Pariwar B cannot touch Pariwar A', () => {
    /** A converged claim in Pariwar A, and a REAL helpline admin whose only grant is in Pariwar B. */
    async function claimInA_operatorInB(): Promise<{
      intruder: Client;
      owner: Client;
      pariwarA: string;
      claimInA: string;
    }> {
      const pariwarA = randomUUID();
      const pariwarB = randomUUID();
      const claimInA = await seedConvergedClaim(pariwarA);

      const intruderAuth = await authenticate();
      await grantRole(intruderAuth.userId, pariwarB, 'helpline_operator');

      // ⭐ The legitimate operator of the SAME claim, so each denial pairs with the identical call
      // being reachable — without it a 404 proves only "unreachable", ⛔ not "unreachable BECAUSE
      // of the tenant".
      const ownerAuth = await authenticate();
      await grantRole(ownerAuth.userId, pariwarA, 'helpline_operator');

      return { intruder: intruderAuth.client, owner: ownerAuth.client, pariwarA, claimInA };
    }

    function expectNotFound(res: { statusCode: number; body: string }): void {
      // ⭐ A SINGLE code. ⚠ Several older tests in this file assert `[403, 404]`; a range passes
      // whether the caller was stopped by authz or merely lost, and those are different guarantees.
      expect(res.statusCode).toBe(404);
      for (const leak of ['membership', 'grant', 'forbidden', 'permission']) {
        expect(res.body.toLowerCase(), `the 404 body leaked '${leak}' — it must not say WHY`).not.toContain(leak);
      }
    }

    it("⛔ GET the bank status — a Pariwar B operator is refused at Pariwar A's claim", async () => {
      const { intruder, owner, pariwarA, claimInA } = await claimInA_operatorInB();
      expectNotFound(await intruder.inject({ method: 'GET', url: statusUrl(pariwarA, claimInA) }));
      // ⭐ THE SAME URL is reachable for the tenant that owns it (⛔ not 404).
      expect((await owner.inject({ method: 'GET', url: statusUrl(pariwarA, claimInA) })).statusCode).not.toBe(404);
    });

    it("⛔⛔ POST the accounts — a Pariwar B operator cannot write payout destinations onto Pariwar A's claim", async () => {
      const { intruder, pariwarA, claimInA } = await claimInA_operatorInB();
      // ⚠ A structurally VALID body: Fastify validates BEFORE preHandler, so a malformed payload
      // would 400 ahead of scope-resolution and pass this test for entirely the wrong reason.
      const res = await intruder.inject({
        method: 'POST',
        url: recordUrl(pariwarA, claimInA),
        payload: {
          accounts: [account(), account({ accountNumber: '987654321098', ifsc: 'HDFC0000001' })],
        } as unknown as object,
      });
      expectNotFound(res);

      // ⭐⭐ AND NOTHING WAS WRITTEN — for this route that is the assertion that matters: a refusal
      // that still persisted an account would have handed another tenant's money a new destination.
      const rows = await td.pool.query(
        `SELECT 1 FROM claim_nominee_bank_accounts WHERE claim_case_id = $1`,
        [claimInA],
      );
      expect(rows.rows, 'a cross-tenant POST persisted account rows').toHaveLength(0);
    });
  });
});
