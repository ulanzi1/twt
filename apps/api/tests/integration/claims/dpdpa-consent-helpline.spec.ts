// Claim-time DPDPA consent — helpline operator E2E (live DB :5433) — Story 6.9 (Task 6).
//
// Drives the operator consent read-back through the REAL admin guard chains via a cookie-threading client:
//   · RECORD gate: [adminSession, scope, requirePermissionHook(claim.file), requireStepUp('claim_file')]
//     — consent capture is part of FILING, so it reuses the intake chain (no catalog bump);
//   · REVOKE gate: [adminSession, scope, requirePermissionHook(claim.manage_dpdpa_consent)] — a LATER
//     withdrawal/management action, gated on the DEDICATED D5a key (NOT claim.file);
//   · staff_assisted grant channel (D4) + the operator claim event actor.
//
// ⚠ Own-committing (scope tx commits on 2xx). Fresh random pariwarId per test.
//
// NOTE on the RECORD-vs-REVOKE permission split: no SEEDED role holds claim.file WITHOUT
// claim.manage_dpdpa_consent (helpline_operator holds both — the 6.8 rationale preserves the operator's
// functional capability), so the "claim.file alone is insufficient for revoke" negative is demonstrated
// via an admin who lacks the manage key entirely (denied), while the positive (helpline_operator can
// revoke) proves the dedicated grant works.

import { randomUUID } from 'node:crypto';

import { claim, ids } from '@twt/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { AppDeps } from '../../../src/context.js';
import * as service from '../../../src/modules/auth/admin/admin-auth.service.js';
import { resolveDpdpaConsentCopy } from '../../../src/modules/claims/dpdpa-consent-copy.js';
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

describe.skipIf(!hasDatabase)('Claim-time DPDPA consent — helpline E2E (:5433)', () => {
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
    const email = `dp-${randomUUID()}@example.test`;
    const password = 'CorrectHorseBatteryStaple9';
    const userId = await service.createAdminAccount(deps, { email, password });
    createdUserIds.push(userId);
    const credentialId = `cred-${userId}`;
    fakeWebauthn.nextRegistration = { verified: true, credential: { id: credentialId, publicKey: 'pk', counter: 0 } };
    fakeWebauthn.nextAuthentication = { verified: true, newCounter: 1 };
    const client = makeClient(app);
    const enrollToken = service.mintEnrollmentToken(deps, userId);
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/register/options', payload: { enrollmentToken: enrollToken } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/register/verify', payload: { response: { id: 'b' }, enrollmentToken: enrollToken } });
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

  /** Seed a committed claim at intake_converged (a pre-adjudication, recordable state). */
  async function seedConvergedClaim(pariwarId: string): Promise<{ claimCaseId: string; deceasedMemberId: string }> {
    const claimCaseId = ids.claimId(randomUUID());
    const deceasedMemberId = ids.memberId(randomUUID());
    const scopeTx = await openScopeTx(deps, pariwarId);
    const base = { claimCaseId, pariwarId: ids.pariwarId(pariwarId), deceasedMemberId, intakeChannels: ['helpline'] as const, claimantActorId: null, actorId: null };
    try {
      await claim.projectClaimState(scopeTx.client, { ...base, eventType: 'claim.intake_initiated', payload: { from_state: null, to_state: 'intake_pending', trigger: 'seed', actor: 'operator', deceased_member_id: String(deceasedMemberId), intake_channel: 'helpline', claimant_actor_id: null } });
      await claim.projectClaimState(scopeTx.client, { ...base, eventType: 'claim.intake_converged', payload: { from_state: 'intake_pending', to_state: 'intake_converged', trigger: 'seed', actor: 'operator' } });
      await closeScopeTx(scopeTx, true);
    } catch (err) {
      await closeScopeTx(scopeTx, false);
      throw err;
    }
    return { claimCaseId: String(claimCaseId), deceasedMemberId: String(deceasedMemberId) };
  }

  const recordUrl = (pariwarId: string, claimCaseId: string) => `/api/v1/p/${pariwarId}/admin/claims/${claimCaseId}/dpdpa-consent`;
  const revokeUrl = (pariwarId: string, claimCaseId: string) => `${recordUrl(pariwarId, claimCaseId)}/revoke`;

  /**
   * ⭐ Seed a PRE-11b.9 publication grant directly — the row `2026-08-28-160` cl.5 preserves.
   *
   * ⛔ It can no longer be created through the record route on EITHER surface: `-162` cl.2 retired
   * the boxes, and the helpline shares the SAME `createDpdpaConsentHandlers` core as the member app,
   * so the operator-assisted path retired with the member one. ⇒ what the revoke cases below still
   * prove is the D7(a) property: an operator can still WITHDRAW on behalf of a family who granted
   * before the retirement. ⛔ Preserving a row means preserving what can be DONE with it.
   */
  async function seedLegacyPublicationGrant(
    pariwarId: string,
    deceasedMemberId: string,
    claimCaseId: string,
  ): Promise<void> {
    await td.pool.query(
      `INSERT INTO consent_records (pariwar_id, subject_id, consent_type, consent_artifact_ref,
                                    granted_via_actor, consent_payload, granted_at)
       VALUES ($1, $2, 'sahyog_vivran_publication', $3, 'staff_assisted', '{}'::jsonb,
               now() - interval '1 hour')`,
      [pariwarId, deceasedMemberId, claimCaseId],
    );
  }

  it('RECORD gate: an admin WITHOUT claim.file is denied (not 201), no rows written', async () => {
    const pariwarId = randomUUID();
    const { client } = await authenticate();
    const { claimCaseId } = await seedConvergedClaim(pariwarId);
    const res = await client.inject({
      method: 'POST', url: recordUrl(pariwarId, claimCaseId),
      payload: { claimTimeDpdpa: true, locale: 'en' } as unknown as object,
    });
    expect([403, 404]).toContain(res.statusCode);
    const rows = await td.pool.query(`SELECT 1 FROM consent_records WHERE consent_artifact_ref = $1`, [claimCaseId]);
    expect(rows.rows).toHaveLength(0);
  });

  it('RECORD happy path: claim.file + fresh elevation → 201, staff_assisted rows, operator event, audit NON-PII', async () => {
    const pariwarId = randomUUID();
    const { client, userId } = await authenticate();
    await grantRole(userId, pariwarId, 'helpline_operator');
    await elevateClaimFile(client);
    const { claimCaseId, deceasedMemberId } = await seedConvergedClaim(pariwarId);

    const res = await client.inject({
      method: 'POST', url: recordUrl(pariwarId, claimCaseId),
      payload: { claimTimeDpdpa: true, locale: 'hi' } as unknown as object,
    });
    expect(res.statusCode).toBe(201);
    expect(res.json<{ granted: string[] }>().granted).toEqual(['claim_time_dpdpa']);

    // ⭐ ONE row since Story 11b.9 — subject = deceased member, granted_via = staff_assisted (D4).
    const rows = await td.pool.query<{
      subject_id: string;
      granted_via_actor: string;
      consent_type: string;
      consent_payload: { checkboxTextShown: string; locale: string };
    }>(
      `SELECT subject_id, granted_via_actor, consent_type, consent_payload FROM consent_records WHERE consent_artifact_ref = $1`, [claimCaseId],
    );
    expect(rows.rows).toHaveLength(1);
    for (const r of rows.rows) {
      expect(r.subject_id).toBe(deceasedMemberId);
      expect(r.granted_via_actor).toBe('staff_assisted');
    }
    // Code review gap-closure: this request used locale:'hi' — assert the STORED evidence copy is
    // the actual Hindi canonical text (not just "some server copy, not the English one"). Locale
    // selection, not just locale-vs-client-forgery, is what's under test here.
    // ⭐⛔ AND THIS READ-BACK IS THE LIVE EVIDENCE FOR `DPDPA_CONSENT_COPY`'s PRESERVATION (11b.9 T7).
    // The copy map is the OTHER thing called "copy": the UI LABELS for the retired boxes are gone,
    // but this server-resolved canonical text STAYS, because it is what makes an already-written row
    // explicable. ⛔ Do not delete this assertion, and ⛔ do not narrow the map to make it pass.
    for (const r of rows.rows) {
      expect(r.consent_payload.locale).toBe('hi');
      expect(r.consent_payload.checkboxTextShown).toBe(
        resolveDpdpaConsentCopy(r.consent_type as 'claim_time_dpdpa', 'hi'),
      );
    }

    // One event, actor = operator, NON-PII.
    const ev = await td.pool.query<{ payload: Record<string, unknown> }>(
      `SELECT payload FROM events_log WHERE stream_id = $1 AND event_type = 'claim.dpdpa_consent_recorded'`, [claimCaseId],
    );
    expect(ev.rows).toHaveLength(1);
    expect(ev.rows[0]?.payload).toMatchObject({ actor: 'operator', consent_types_granted: ['claim_time_dpdpa'] });

    expect(td.auditSink.ofType('helpline_claim.dpdpa_consent_recorded').length).toBeGreaterThanOrEqual(1);
  });

  it('REVOKE gate: helpline_operator (holds claim.manage_dpdpa_consent) can revoke → 200; consentExists flips false', async () => {
    const pariwarId = randomUUID();
    const { client, userId } = await authenticate();
    await grantRole(userId, pariwarId, 'helpline_operator');
    await elevateClaimFile(client);
    const { claimCaseId, deceasedMemberId } = await seedConvergedClaim(pariwarId);

    const record = await client.inject({
      method: 'POST', url: recordUrl(pariwarId, claimCaseId),
      payload: { claimTimeDpdpa: true, locale: 'en' } as unknown as object,
    });
    expect(record.statusCode).toBe(201);
    // ⭐ The preserved pre-11b.9 grant — see `seedLegacyPublicationGrant` (D7(a)).
    await seedLegacyPublicationGrant(pariwarId, deceasedMemberId, claimCaseId);

    // Revoke needs NO step-up (not a financial action) — just the dedicated permission.
    const revoke = await client.inject({
      method: 'POST', url: revokeUrl(pariwarId, claimCaseId),
      payload: { consentType: 'sahyog_vivran_publication', reason: 'family requested takedown' } as unknown as object,
    });
    expect(revoke.statusCode).toBe(200);
    expect(revoke.json<{ granted: string[] }>().granted).toEqual(['claim_time_dpdpa']);

    const rows = await td.pool.query<{ revoked_at: string | null }>(
      `SELECT revoked_at FROM consent_records WHERE consent_artifact_ref = $1 AND consent_type = 'sahyog_vivran_publication'`, [claimCaseId],
    );
    expect(rows.rows[0]?.revoked_at).not.toBeNull();
  });

  it('REVOKE gate: an admin WITHOUT claim.manage_dpdpa_consent is denied revoke (403/404)', async () => {
    const pariwarId = randomUUID();
    // First, an operator records (a), and a pre-11b.9 publication grant is seeded alongside it.
    const op = await authenticate();
    await grantRole(op.userId, pariwarId, 'helpline_operator');
    await elevateClaimFile(op.client);
    const { claimCaseId, deceasedMemberId } = await seedConvergedClaim(pariwarId);
    const record = await op.client.inject({
      method: 'POST', url: recordUrl(pariwarId, claimCaseId),
      payload: { claimTimeDpdpa: true, locale: 'en' } as unknown as object,
    });
    expect(record.statusCode).toBe(201);
    // ⭐ The preserved pre-11b.9 grant the unauthorized caller tries to reach (D7(a)).
    await seedLegacyPublicationGrant(pariwarId, deceasedMemberId, claimCaseId);

    // A different admin with NO grant (no claim.manage_dpdpa_consent) tries to revoke → denied.
    const other = await authenticate();
    const res = await other.client.inject({
      method: 'POST', url: revokeUrl(pariwarId, claimCaseId),
      payload: { consentType: 'sahyog_vivran_publication', reason: 'unauthorized attempt' } as unknown as object,
    });
    expect([403, 404]).toContain(res.statusCode);
    // The consent is still active (not revoked by the unauthorized caller).
    const rows = await td.pool.query<{ revoked_at: string | null }>(
      `SELECT revoked_at FROM consent_records WHERE consent_artifact_ref = $1 AND consent_type = 'sahyog_vivran_publication'`, [claimCaseId],
    );
    expect(rows.rows[0]?.revoked_at).toBeNull();
  });
});
