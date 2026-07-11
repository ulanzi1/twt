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

  type SeedTarget = 'intake_converged' | 'verifier_approved' | 'state_trustee_freeze';

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
    const body = after.json<{ accounts: Array<{ rank: number; bankName: string; ifscValidated: boolean; holderNamePresent: boolean }> }>();
    expect(body.accounts).toEqual([
      { rank: 1, bankName: 'State Bank of India', ifscValidated: true, holderNamePresent: true },
      { rank: 2, bankName: 'HDFC Bank', ifscValidated: true, holderNamePresent: true },
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
});
