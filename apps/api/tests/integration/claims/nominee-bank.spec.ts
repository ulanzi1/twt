// Claim-time nominee bank collection — member-app E2E (live DB :5433) — Story 6.8 (Task 7).
//
// Drives the member-app dual-account collection through the REAL guard chain
// [requireMemberSession, requireMemberStepUp('claim_handover')] via `app.inject`:
//   · happy path: 2 valid accounts → 201, encrypted rows persisted, the identity event emitted,
//     the audit line is NON-PII (no account number / holder name / raw IFSC);
//   · an unknown IFSC → 400 nominee_bank.ifsc_unrecognized (dignified; the account is NOT persisted);
//   · claim ownership: a member cannot write onto ANOTHER member's claim → 404;
//   · the IFSC-lookup read: a known IFSC → 200 bank/branch, an unknown IFSC → 404;
//   · the member-session guard: no token → 401.
//
// The claim is driven to `intake_converged` via the real intake flow (a collectable state, D3).

import { randomUUID } from 'node:crypto';

import { claim, ids, member as memberDomain } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import { signAccessToken } from '../../../src/modules/auth/member/tokens.js';
import { decryptNomineeBankField } from '../../../src/modules/claims/nominee-bank-crypto.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { createTestApp, hasDatabase, teardown, type TestApp } from '../_setup.js';

const ACCESS_TTL_MS = 15 * 60 * 1000;
type Json = Record<string, unknown>;

const account = (over: Partial<{ accountHolderName: string; accountNumber: string; ifsc: string; vpa: string }> = {}) => ({
  accountHolderName: 'Ravi Kumar',
  accountNumber: '123456789012',
  ifsc: 'SBIN0000001',
  ...over,
});

async function seedMember(t: TestApp): Promise<{ memberId: string; pariwarId: string }> {
  const memberId = randomUUID();
  const pariwarId = randomUUID();
  const scopeTx = await openScopeTx(t.deps, pariwarId);
  try {
    const mid = ids.memberId(memberId);
    const pid = ids.pariwarId(pariwarId);
    await memberDomain.projectMemberState(scopeTx.client, {
      memberId: mid, pariwarId: pid, eventType: 'member.signup_initiated', actorId: memberId,
      payload: { from_state: null, to_state: 'pending-kyc', trigger: 'signup', actor: 'member' },
    });
    await memberDomain.projectMemberState(scopeTx.client, {
      memberId: mid, pariwarId: pid, eventType: 'member.kyc_manual_fallback', actorId: memberId,
      payload: { from_state: 'pending-kyc', to_state: 'pending-fee', trigger: 'kyc_manual', actor: 'member', reason: 'manual_fallback' },
    });
    await closeScopeTx(scopeTx, true);
  } catch (err) {
    await closeScopeTx(scopeTx, false);
    throw err;
  }
  return { memberId, pariwarId };
}

function token(t: TestApp, memberId: string, pariwarId: string): string {
  return signAccessToken(t.app, { memberId, pariwarId, deviceId: 'test-device' }, ACCESS_TTL_MS);
}

async function inject(
  t: TestApp,
  method: 'GET' | 'POST',
  url: string,
  opts: { payload?: Json; token?: string } = {},
): Promise<{ status: number; body: Json }> {
  const res = await t.app.inject({
    method, url, payload: opts.payload,
    headers: { origin: 'http://localhost:3001', ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}) },
  });
  let body: Json = {};
  try {
    body = res.json();
  } catch {
    body = {};
  }
  return { status: res.statusCode, body };
}

async function declareNominee(t: TestApp, memberId: string, pariwarId: string): Promise<void> {
  const res = await inject(t, 'POST', '/api/v1/member/nominees', {
    payload: { nominees: [{ name: 'Asha Devi', relationship: 'spouse', mobile: '+91 98765 43210' }] },
    token: token(t, memberId, pariwarId),
  });
  expect(res.status).toBe(200);
}

/** Establish handover-trust (the claim_handover step-up the intake + nominee-bank routes require). */
async function establishHandoverTrust(t: TestApp, memberId: string, pariwarId: string): Promise<void> {
  const tok = token(t, memberId, pariwarId);
  const send = await inject(t, 'POST', '/api/v1/member/claims/handover-otp', { payload: {}, token: tok });
  expect(send.status).toBe(200);
  const code = t.stepUpDelivery.last?.code as string;
  const verify = await inject(t, 'POST', '/api/v1/member/claims/handover-otp/verify', { payload: { code }, token: tok });
  expect(verify.body).toMatchObject({ verified: true });
}

/** Full member setup → an intake_converged claim; returns the member + claim ids. */
async function setupClaim(t: TestApp): Promise<{ memberId: string; pariwarId: string; claimCaseId: string }> {
  const { memberId, pariwarId } = await seedMember(t);
  await declareNominee(t, memberId, pariwarId);
  await establishHandoverTrust(t, memberId, pariwarId);
  const intake = await inject(t, 'POST', '/api/v1/member/claims/intake', {
    payload: { relationship: 'spouse' }, token: token(t, memberId, pariwarId),
  });
  expect(intake.status).toBe(200);
  expect(intake.body.state).toBe('intake_converged');
  return { memberId, pariwarId, claimCaseId: intake.body.claimCaseId as string };
}

describe.skipIf(!hasDatabase)('Claim-time nominee bank — member-app E2E (:5433)', () => {
  it('AC1/AC2: 2 valid accounts → 201, encrypted rows persisted, identity event emitted, audit NON-PII', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId, claimCaseId } = await setupClaim(t);

      const res = await inject(t, 'POST', `/api/v1/member/claims/${claimCaseId}/nominee-bank`, {
        payload: { accounts: [account({ ifsc: 'SBIN0000001' }), account({ accountHolderName: 'Asha Devi', accountNumber: '987654321098', ifsc: 'HDFC0000001' })] },
        token: token(t, memberId, pariwarId),
      });
      expect(res.status).toBe(201);
      // NON-PII presence view — rank + public bank name + validated flag + holder-name-present + vpa-present.
      // No VPA supplied → vpaPresent:false on both accounts (Story 8.13).
      expect(res.body.accounts).toEqual([
        { rank: 1, bankName: 'State Bank of India', ifscValidated: true, holderNamePresent: true, vpaPresent: false },
        { rank: 2, bankName: 'HDFC Bank', ifscValidated: true, holderNamePresent: true, vpaPresent: false },
      ]);

      // Two encrypted rows persisted; the ciphertext is NOT the plaintext.
      const rows = await t.pool.query<{ account_rank: number; account_number_ciphertext: string; bank_name: string; ifsc_validated: boolean }>(
        `SELECT account_rank, account_number_ciphertext, bank_name, ifsc_validated FROM claim_nominee_bank_accounts WHERE claim_case_id = $1 ORDER BY account_rank`,
        [claimCaseId],
      );
      expect(rows.rows.map((r) => r.account_rank)).toEqual([1, 2]);
      expect(rows.rows[0]?.account_number_ciphertext).not.toBe('123456789012');
      expect(rows.rows[0]?.account_number_ciphertext).not.toContain('123456789012');
      expect(rows.rows[0]?.bank_name).toBe('State Bank of India');
      expect(rows.rows[0]?.ifsc_validated).toBe(true);

      // Exactly one identity annotation event; NO PII in its payload.
      const events = await t.pool.query<{ payload: Json }>(
        `SELECT payload FROM events_log WHERE stream_id = $1 AND event_type = 'claim.nominee_bank_recorded'`,
        [claimCaseId],
      );
      expect(events.rows).toHaveLength(1);
      expect(events.rows[0]?.payload).toMatchObject({
        account_ranks_present: [1, 2], ifsc_validated: true,
        from_state: 'intake_converged', to_state: 'intake_converged',
      });
      const eventStr = JSON.stringify(events.rows[0]?.payload);
      expect(eventStr).not.toContain('123456789012');
      expect(eventStr).not.toContain('Ravi');
      expect(eventStr).not.toContain('SBIN0000001');

      // The audit line is NON-PII.
      const audits = t.auditSink.ofType('member_claim.nominee_bank_recorded');
      expect(audits.length).toBe(1);
      const auditStr = JSON.stringify(t.auditSink.events);
      expect(auditStr).not.toContain('123456789012');
      expect(auditStr).not.toContain('Ravi Kumar');
      expect(auditStr).not.toContain('SBIN0000001');
    } finally {
      await teardown(t);
    }
  });

  it('Story 8.13: an optional VPA round-trips — vpa_ciphertext persisted (not plaintext), vpaPresent reflects it', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId, claimCaseId } = await setupClaim(t);
      const tok = token(t, memberId, pariwarId);

      // Record #1 WITH a VPA, #2 WITHOUT.
      const res = await inject(t, 'POST', `/api/v1/member/claims/${claimCaseId}/nominee-bank`, {
        payload: {
          accounts: [
            account({ ifsc: 'SBIN0000001', vpa: 'nominee@okhdfc' }),
            account({ accountNumber: '987654321098', ifsc: 'HDFC0000001' }),
          ],
        },
        token: tok,
      });
      expect(res.status).toBe(201);
      // vpaPresent reflects which account carried a VPA (NON-PII presence view — the VPA itself is never echoed).
      expect(res.body.accounts).toEqual([
        { rank: 1, bankName: 'State Bank of India', ifscValidated: true, holderNamePresent: true, vpaPresent: true },
        { rank: 2, bankName: 'HDFC Bank', ifscValidated: true, holderNamePresent: true, vpaPresent: false },
      ]);
      // The VPA is stored as ciphertext (NOT the plaintext); #2 has a NULL vpa_ciphertext.
      const rows = await t.pool.query<{ account_rank: number; vpa_ciphertext: string | null }>(
        `SELECT account_rank, vpa_ciphertext FROM claim_nominee_bank_accounts WHERE claim_case_id = $1 ORDER BY account_rank`,
        [claimCaseId],
      );
      expect(rows.rows[0]?.vpa_ciphertext).not.toBeNull();
      expect(rows.rows[0]?.vpa_ciphertext).not.toContain('nominee@okhdfc');
      expect(rows.rows[1]?.vpa_ciphertext).toBeNull();

      // decrypt-at-intent round-trip (Task 7): the payment intent handler decrypts this exact stored
      // ciphertext via decryptNomineeBankField (its FIRST caller in the repo) under the same
      // CLAIM_NOMINEE_BANK_FIELD_CLASS — assert it yields back the original plaintext VPA.
      const decrypted = await decryptNomineeBankField(rows.rows[0]!.vpa_ciphertext!, pariwarId, t.deps.encryption);
      expect(decrypted).toBe('nominee@okhdfc');

      // Neither the response nor the identity event leaks the VPA plaintext.
      expect(JSON.stringify(res.body)).not.toContain('nominee@okhdfc');
      const events = await t.pool.query<{ payload: Json }>(
        `SELECT payload FROM events_log WHERE stream_id = $1 AND event_type = 'claim.nominee_bank_recorded'`,
        [claimCaseId],
      );
      expect(JSON.stringify(events.rows[0]?.payload)).not.toContain('nominee@okhdfc');
      expect(JSON.stringify(t.auditSink.events)).not.toContain('nominee@okhdfc');

      // A malformed VPA is rejected at the wire (the contract's NOMINEE_BANK_VPA_REGEX gates the body
      // before the handler; prepareAccount re-asserts as defense-in-depth). The account is not persisted.
      const bad = await inject(t, 'POST', `/api/v1/member/claims/${claimCaseId}/nominee-bank`, {
        payload: {
          accounts: [account({ ifsc: 'SBIN0000001', vpa: 'not-a-vpa' }), account({ accountNumber: '987654321098', ifsc: 'HDFC0000001' })],
        },
        token: tok,
      });
      expect(bad.status).toBe(400);
      expect((bad.body.error as { code: string }).code).toBe('request.validation');
    } finally {
      await teardown(t);
    }
  });

  it('review finding (2026-07-11): GET status is [] before recording, the presence view after', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId, claimCaseId } = await setupClaim(t);
      const tok = token(t, memberId, pariwarId);

      const before = await inject(t, 'GET', `/api/v1/member/claims/${claimCaseId}/nominee-bank`, { token: tok });
      expect(before.status).toBe(200);
      expect(before.body.accounts).toEqual([]);

      const record = await inject(t, 'POST', `/api/v1/member/claims/${claimCaseId}/nominee-bank`, {
        payload: { accounts: [account({ ifsc: 'SBIN0000001' }), account({ accountNumber: '987654321098', ifsc: 'HDFC0000001' })] },
        token: tok,
      });
      expect(record.status).toBe(201);

      const after = await inject(t, 'GET', `/api/v1/member/claims/${claimCaseId}/nominee-bank`, { token: tok });
      expect(after.status).toBe(200);
      // Same NON-PII presence view as the POST response — no account number / holder name / raw IFSC.
      expect(after.body.accounts).toEqual([
        { rank: 1, bankName: 'State Bank of India', ifscValidated: true, holderNamePresent: true, vpaPresent: false },
        { rank: 2, bankName: 'HDFC Bank', ifscValidated: true, holderNamePresent: true, vpaPresent: false },
      ]);
      const afterStr = JSON.stringify(after.body);
      expect(afterStr).not.toContain('123456789012');
      expect(afterStr).not.toContain('Ravi Kumar');
      expect(afterStr).not.toContain('SBIN0000001');
    } finally {
      await teardown(t);
    }
  });

  it('review finding (2026-07-11): GET status onto ANOTHER member’s claim → 404, no cross-member oracle', async () => {
    const t = await createTestApp();
    try {
      const a = await setupClaim(t);
      const b = await seedMember(t);
      await declareNominee(t, b.memberId, b.pariwarId);
      await establishHandoverTrust(t, b.memberId, b.pariwarId);

      const res = await inject(t, 'GET', `/api/v1/member/claims/${a.claimCaseId}/nominee-bank`, {
        token: token(t, b.memberId, b.pariwarId),
      });
      expect(res.status).toBe(404);
    } finally {
      await teardown(t);
    }
  });

  it('AC2: an unknown IFSC → 400 nominee_bank.ifsc_unrecognized, no rows persisted', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId, claimCaseId } = await setupClaim(t);
      const res = await inject(t, 'POST', `/api/v1/member/claims/${claimCaseId}/nominee-bank`, {
        payload: { accounts: [account({ ifsc: 'SBIN0000001' }), account({ accountNumber: '987654321098', ifsc: 'ZZZZ0000000' })] }, // #2 unknown to the stub
        token: token(t, memberId, pariwarId),
      });
      expect(res.status).toBe(400);
      expect((res.body as { error: { code: string } }).error.code).toBe('nominee_bank.ifsc_unrecognized');
      const rows = await t.pool.query(`SELECT 1 FROM claim_nominee_bank_accounts WHERE claim_case_id = $1`, [claimCaseId]);
      expect(rows.rows).toHaveLength(0);
    } finally {
      await teardown(t);
    }
  });

  it('AC5: a member cannot record bank details onto ANOTHER member’s claim → 404', async () => {
    const t = await createTestApp();
    try {
      const a = await setupClaim(t);
      // A second member (own session + handover trust) tries to write onto A's claim.
      const b = await seedMember(t);
      await declareNominee(t, b.memberId, b.pariwarId);
      await establishHandoverTrust(t, b.memberId, b.pariwarId);

      const res = await inject(t, 'POST', `/api/v1/member/claims/${a.claimCaseId}/nominee-bank`, {
        payload: { accounts: [account(), account({ accountNumber: '987654321098', ifsc: 'HDFC0000001' })] },
        token: token(t, b.memberId, b.pariwarId),
      });
      expect(res.status).toBe(404);
      const rows = await t.pool.query(`SELECT 1 FROM claim_nominee_bank_accounts WHERE claim_case_id = $1`, [a.claimCaseId]);
      expect(rows.rows).toHaveLength(0);
    } finally {
      await teardown(t);
    }
  });

  it('AC2: IFSC lookup — a known IFSC → 200 bank/branch; an unknown IFSC → 404', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedMember(t);
      const tok = token(t, memberId, pariwarId);
      const ok = await inject(t, 'GET', '/api/v1/member/claims/ifsc/SBIN0000001', { token: tok });
      expect(ok.status).toBe(200);
      expect(ok.body).toMatchObject({ ifsc: 'SBIN0000001', bankName: 'State Bank of India' });

      const miss = await inject(t, 'GET', '/api/v1/member/claims/ifsc/ZZZZ0000000', { token: tok });
      expect(miss.status).toBe(404);
      expect((miss.body as { error: { code: string } }).error.code).toBe('nominee_bank.ifsc_unrecognized');
    } finally {
      await teardown(t);
    }
  });

  it('D3 tier-1: the nominee is read-only after verifier_approved → member record → 409', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId, claimCaseId } = await setupClaim(t);
      // Drive the claim past approval via the domain projector (verifier actions are admin-side).
      const scopeTx = await openScopeTx(t.deps, pariwarId);
      const cid = ids.claimId(claimCaseId);
      const base = { claimCaseId: cid, pariwarId: ids.pariwarId(pariwarId), deceasedMemberId: ids.memberId(memberId), intakeChannels: ['member_app'] as const, claimantActorId: null, actorId: null };
      await claim.projectClaimState(scopeTx.client, { ...base, eventType: 'claim.documents_received', payload: { from_state: 'intake_converged', to_state: 'documents_pending', trigger: 't', actor: 'system' } });
      await claim.projectClaimState(scopeTx.client, { ...base, eventType: 'claim.peer_mesh_pinged', payload: { from_state: 'documents_pending', to_state: 'verification_in_progress', trigger: 't', actor: 'system', selected_member_ids: [randomUUID()], metric_id: 'district_cohort_v1', metric_version: 1 } });
      await claim.projectClaimState(scopeTx.client, { ...base, eventType: 'claim.verifier_reviewing', payload: { from_state: 'verification_in_progress', to_state: 'verifier_review', trigger: 't', actor: 'system' } });
      await claim.projectClaimState(scopeTx.client, { ...base, eventType: 'claim.verifier_approved', payload: { from_state: 'verifier_review', to_state: 'verifier_approved', trigger: 't', actor: 'system' } });
      await closeScopeTx(scopeTx, true);

      const res = await inject(t, 'POST', `/api/v1/member/claims/${claimCaseId}/nominee-bank`, {
        payload: { accounts: [account(), account({ accountNumber: '987654321098', ifsc: 'HDFC0000001' })] },
        token: token(t, memberId, pariwarId),
      });
      expect(res.status).toBe(409);
      expect((res.body as { error: { code: string } }).error.code).toBe('nominee_bank.not_collectable');
    } finally {
      await teardown(t);
    }
  });

  it('AC4: the member-session guard rejects an unauthenticated record (401)', async () => {
    const t = await createTestApp();
    try {
      const res = await inject(t, 'POST', `/api/v1/member/claims/${randomUUID()}/nominee-bank`, {
        payload: { accounts: [account(), account({ accountNumber: '987654321098', ifsc: 'HDFC0000001' })] },
      });
      expect(res.status).toBe(401);
    } finally {
      await teardown(t);
    }
  });
});
