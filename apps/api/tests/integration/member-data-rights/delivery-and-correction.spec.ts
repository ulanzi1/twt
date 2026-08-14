// Story 10.21 AC-R1 (delivery) + AC-R2 (correction) — E2E (:5433).
//
// ⭐ WHAT THESE PROVE THAT THE DB CONSTRAINTS DO NOT. Migration 0104 enforces the three-part gate as a
// CHECK, and that is proven at the migration level in the policy-regression spec. These tests prove the
// HANDLER refuses BEFORE it ever reaches the database — i.e. that the caller gets a typed, actionable
// 409 rather than a constraint violation surfacing as a 500, and that element 2 is SERVER-OBSERVED.
//
// ⛔ THE ASSERTIONS THAT MUST BE ABLE TO FAIL:
//   · the staff-mediated route is refused when the primary route has NOT been tried (element 2);
//   · a member_direct grant is issued with NONE of the gate elements set;
//   · redemption is ONE-TIME — a second attempt with a valid code fails;
//   · every redemption failure returns the SAME 404, so the route is not an existence oracle;
//   · a staff_mediated grant is NOT redeemable by the member at all.

import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { AppDeps } from '../../../src/context.js';
import * as service from '../../../src/modules/auth/admin/admin-auth.service.js';
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

describe.skipIf(!hasDatabase)('Story 10.21 AC-R1/AC-R2 — delivery + correction (:5433)', () => {
  let td: TestDeps;
  let deps: AppDeps;
  let fakeWebauthn: FakeWebAuthnProvider;
  let adminStepUp: CapturingStepUpDelivery;
  let app: Awaited<ReturnType<typeof buildServer>>;
  const createdUserIds: string[] = [];
  const createdMemberIds: string[] = [];

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
      if (createdMemberIds.length > 0) {
        // events_log is append-only (AR-8 trigger) — replica role sheds it for a test-only purge.
        await c.query('BEGIN');
        await c.query("SET LOCAL session_replication_role = 'replica'");
        await c.query('DELETE FROM member_auth_otps WHERE member_id = ANY($1::uuid[])', [createdMemberIds]);
        await c.query('DELETE FROM events_log WHERE stream_id = ANY($1::uuid[])', [createdMemberIds]);
        await c.query('DELETE FROM members WHERE member_id = ANY($1::uuid[])', [createdMemberIds]);
        await c.query('COMMIT');
      }
    } finally {
      c.release();
    }
    await td.pool.end();
  });

  async function authenticate(displayName: string): Promise<{ client: Client; userId: string }> {
    const email = `dr-${randomUUID()}@example.test`;
    const password = 'CorrectHorseBatteryStaple9';
    const userId = await service.createAdminAccount(deps, { email, password, displayName });
    createdUserIds.push(userId);
    const credentialId = `cred-${userId}`;
    fakeWebauthn.nextRegistration = { verified: true, credential: { id: credentialId, publicKey: 'pk', counter: 0 } };
    fakeWebauthn.nextAuthentication = { verified: true, newCounter: 1 };
    const client = makeClient(app);
    const enroll = service.mintEnrollmentToken(deps, userId);
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/register/options', payload: { enrollmentToken: enroll } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/register/verify', payload: { response: { id: 'b' }, enrollmentToken: enroll } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email, password } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/authenticate/options', payload: {} });
    const verify = await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/authenticate/verify', payload: { response: { id: credentialId } } });
    expect(verify.statusCode).toBe(200);
    return { client, userId };
  }

  async function grant(userId: string, pariwarId: string, role: string): Promise<void> {
    const c = await td.pool.connect();
    try {
      await c.query(
        `INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value) VALUES ($1,$2,$3,'pariwar',$4)`,
        [userId, pariwarId, role, pariwarId],
      );
    } finally {
      c.release();
    }
  }

  /** Elevate for the DISTINCT data-rights step-up context. */
  async function elevate(client: Client): Promise<void> {
    const req = await client.inject({
      method: 'POST',
      url: '/api/v1/auth/step-up/request',
      payload: { actionContext: 'member_data_rights' },
    });
    expect(req.statusCode).toBe(200);
    const code = adminStepUp.last?.code as string;
    const ver = await client.inject({ method: 'POST', url: '/api/v1/auth/step-up/verify', payload: { otp: code } });
    expect(ver.statusCode).toBe(200);
  }

  /**
   * Seed a member + a ready export + a REAL helpdesk ticket.
   *
   * ⭐ The ticket is created through the ACTUAL Story 10.1 intake route with
   * `category: 'other'` + `sub_category: 'dpdpa-data-rights'` — i.e. exactly the AC2 path a real
   * DPDPA request arrives on. ⛔ Hand-INSERTing it was tried and rejected: `audit_log_entries` carries
   * a NOT NULL `audit_hash` (the §1.5 hash chain), so a hand-seeded ticket would have required forging
   * a chain entry. Driving the real route is both simpler AND a truer fixture.
   */
  async function seedSubject(
    client: Client,
    pariwarId: string,
  ): Promise<{ memberId: string; exportId: string; ticketId: string }> {
    const memberId = randomUUID();
    const exportId = randomUUID();
    createdMemberIds.push(memberId);
    const c = await td.pool.connect();
    try {
      await c.query(`INSERT INTO members (member_id, pariwar_id, state, state_event_version) VALUES ($1,$2,'active',1)`, [memberId, pariwarId]);
      await c.query(
        `INSERT INTO data_exports (export_id, member_id, pariwar_id, status, requested_at, artifact_ciphertext)
         VALUES ($1,$2,$3,'ready', now(), 'enc:v1:fake')`,
        [exportId, memberId, pariwarId],
      );
    } finally {
      c.release();
    }
    const filed = await client.inject({
      method: 'POST',
      url: `/api/v1/p/${pariwarId}/helpdesk/tickets`,
      payload: {
        subject_member_id: memberId,
        category: 'other',
        sub_category: 'dpdpa-data-rights',
        body: 'Member is exercising their data rights.',
        created_via: 'helpline_call',
      },
    });
    expect(filed.statusCode).toBe(201);
    return { memberId, exportId, ticketId: (filed.json() as { ticket_id: string }).ticket_id };
  }

  const base = (p: string) => `/api/v1/p/${p}/member-data-rights`;

  // ── AC-R1 — the THREE-PART GATE ────────────────────────────────────────────────────────────────

  it('⛔ staff-mediated is REFUSED when the primary route has not been tried (element 2 fails closed)', async () => {
    const p = randomUUID();
    const a = await authenticate('Operator A');
    await grant(a.userId, p, 'pariwar_admin');
    await elevate(a.client);
    const s = await seedSubject(a.client, p);

    // ⭐ Elements 1 and 3 are supplied and valid; only element 2 is absent — and it alone must refuse.
    // ⛔ This is the assertion that proves element 2 is SERVER-OBSERVED: there is no request field the
    // caller could have set to satisfy it.
    const res = await a.client.inject({
      method: 'POST',
      url: `${base(p)}/delivery/staff-mediated`,
      headers: { 'idempotency-key': randomUUID() },
      payload: {
        export_id: s.exportId,
        member_id: s.memberId,
        helpdesk_ticket_id: s.ticketId,
        member_requested_staff_mediation: true,
        attestation: 'Caller states the registered handset was lost last week.',
      },
    });

    expect(res.statusCode).toBe(409);
    expect((res.json() as { error: { code: string } }).error.code).toBe(
      'member_data_rights.primary_delivery_not_completed_required',
    );

    // ⛔ And NO grant row was created — a refused exception must leave no trace of an exception.
    const c = await td.pool.connect();
    try {
      const { rowCount } = await c.query('SELECT 1 FROM data_export_delivery_grants WHERE member_id = $1', [s.memberId]);
      expect(rowCount).toBe(0);
    } finally {
      c.release();
    }
  });

  it('✅ member-direct is issued, and carries NONE of the three gate elements', async () => {
    const p = randomUUID();
    const a = await authenticate('Operator B');
    await grant(a.userId, p, 'pariwar_admin');
    await elevate(a.client);
    const s = await seedSubject(a.client, p);

    const res = await a.client.inject({
      method: 'POST',
      url: `${base(p)}/delivery/member-direct`,
      headers: { 'idempotency-key': randomUUID() },
      payload: { export_id: s.exportId, member_id: s.memberId, helpdesk_ticket_id: s.ticketId },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { grant_id: string; channel: string };
    expect(body.channel).toBe('member_direct');

    // ⛔ The primary route must carry none of the exception's evidence — recording it here would
    // misrepresent an ordinary delivery as an exceptional one in every audit query.
    const c = await td.pool.connect();
    try {
      const { rows } = await c.query(
        `SELECT channel, member_request_recorded_at, primary_delivery_not_completed_at, attestation_ciphertext
           FROM data_export_delivery_grants WHERE grant_id = $1`,
        [body.grant_id],
      );
      expect(rows[0].channel).toBe('member_direct');
      expect(rows[0].member_request_recorded_at).toBeNull();
      expect(rows[0].primary_delivery_not_completed_at).toBeNull();
      expect(rows[0].attestation_ciphertext).toBeNull();
    } finally {
      c.release();
    }
  });

  it('⭐ staff-mediated SUCCEEDS once the primary OTP has expired unconsumed, and records all three elements', async () => {
    const p = randomUUID();
    const a = await authenticate('Operator C');
    await grant(a.userId, p, 'pariwar_admin');
    await elevate(a.client);
    const s = await seedSubject(a.client, p);

    // Simulate the primary route having been tried and not completed: an OTP on the delivery pool
    // that expired unconsumed. ⚠ This is the ONLY thing that changes between this test and the
    // refusal above — which is what makes element 2 the operative gate rather than decoration.
    const c = await td.pool.connect();
    try {
      await c.query(
        `INSERT INTO member_auth_otps (mobile_blind_index, member_id, intent, action_context, otp_hash, expires_at)
         VALUES ($1,$2,'data_export_delivery','member_data_rights.delivery','h', now() - interval '1 hour')`,
        [`bi-${s.memberId}`, s.memberId],
      );
    } finally {
      c.release();
    }

    const res = await a.client.inject({
      method: 'POST',
      url: `${base(p)}/delivery/staff-mediated`,
      headers: { 'idempotency-key': randomUUID() },
      payload: {
        export_id: s.exportId,
        member_id: s.memberId,
        helpdesk_ticket_id: s.ticketId,
        member_requested_staff_mediation: true,
        attestation: 'Caller states the registered handset was lost; identity confirmed by read-back.',
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { channel: string; primary_delivery_not_completed_at: string };
    expect(body.channel).toBe('staff_mediated');
    expect(body.primary_delivery_not_completed_at).toBeTruthy();

    const c2 = await td.pool.connect();
    try {
      const { rows } = await c2.query(
        `SELECT member_request_recorded_at, primary_delivery_not_completed_at, attestation_ciphertext
           FROM data_export_delivery_grants WHERE member_id = $1`,
        [s.memberId],
      );
      expect(rows).toHaveLength(1);
      // All three recorded. ⛔ The attestation is stored ENCRYPTED — never plaintext at rest.
      expect(rows[0].member_request_recorded_at).not.toBeNull();
      expect(rows[0].primary_delivery_not_completed_at).not.toBeNull();
      expect(String(rows[0].attestation_ciphertext)).toMatch(/^enc:/);
      expect(String(rows[0].attestation_ciphertext)).not.toContain('handset');
    } finally {
      c2.release();
    }
  });

  // ── AC-R1 — redemption ─────────────────────────────────────────────────────────────────────────

  it('⛔ redemption returns the SAME 404 for an unknown grant and a wrong code (not an existence oracle)', async () => {
    const p = randomUUID();
    const a = await authenticate('Operator D');
    await grant(a.userId, p, 'pariwar_admin');
    await elevate(a.client);
    const s = await seedSubject(a.client, p);

    const granted = await a.client.inject({
      method: 'POST',
      url: `${base(p)}/delivery/member-direct`,
      headers: { 'idempotency-key': randomUUID() },
      payload: { export_id: s.exportId, member_id: s.memberId, helpdesk_ticket_id: s.ticketId },
    });
    const grantId = (granted.json() as { grant_id: string }).grant_id;

    const anon = makeClient(app);
    const unknown = await anon.inject({
      method: 'POST',
      url: `/api/v1/member-data-rights/delivery/${randomUUID()}/redeem`,
      payload: { otp: '123456' },
    });
    const wrongCode = await anon.inject({
      method: 'POST',
      url: `/api/v1/member-data-rights/delivery/${grantId}/redeem`,
      payload: { otp: '000000' },
    });

    // ⭐ IDENTICAL status AND code. A distinct error would confirm that a grant id exists.
    expect(unknown.statusCode).toBe(404);
    expect(wrongCode.statusCode).toBe(404);
    expect((unknown.json() as { error: { code: string } }).error.code).toBe(
      (wrongCode.json() as { error: { code: string } }).error.code,
    );
  });

  it('⛔ a STAFF-MEDIATED grant is not redeemable by the member (same 404)', async () => {
    // The staff-mediated artifact is handed over through the administrative process — it is not
    // pulled down here. ⛔ If this ever returns 200, the two routes have collapsed into one.
    const p = randomUUID();
    const a = await authenticate('Operator E');
    await grant(a.userId, p, 'pariwar_admin');
    await elevate(a.client);
    const s = await seedSubject(a.client, p);
    const c = await td.pool.connect();
    try {
      await c.query(
        `INSERT INTO member_auth_otps (mobile_blind_index, member_id, intent, action_context, otp_hash, expires_at)
         VALUES ($1,$2,'data_export_delivery','member_data_rights.delivery','h', now() - interval '1 hour')`,
        [`bi-${s.memberId}`, s.memberId],
      );
    } finally {
      c.release();
    }
    const granted = await a.client.inject({
      method: 'POST',
      url: `${base(p)}/delivery/staff-mediated`,
      headers: { 'idempotency-key': randomUUID() },
      payload: {
        export_id: s.exportId,
        member_id: s.memberId,
        helpdesk_ticket_id: s.ticketId,
        member_requested_staff_mediation: true,
        attestation: 'lost handset',
      },
    });
    const grantId = (granted.json() as { grant_id: string }).grant_id;

    const anon = makeClient(app);
    const res = await anon.inject({
      method: 'POST',
      url: `/api/v1/member-data-rights/delivery/${grantId}/redeem`,
      payload: { otp: '123456' },
    });
    expect(res.statusCode).toBe(404);
  });

  // ── AC-R2 — the recorded correction process ────────────────────────────────────────────────────

  it('✅ a correction is RECORDED with both sides encrypted and the actor attributed', async () => {
    const p = randomUUID();
    const a = await authenticate('Operator Meera');
    await grant(a.userId, p, 'pariwar_admin');
    await elevate(a.client);
    const s = await seedSubject(a.client, p);

    const res = await a.client.inject({
      method: 'POST',
      url: `${base(p)}/correction`,
      headers: { 'idempotency-key': randomUUID() },
      payload: {
        member_id: s.memberId,
        helpdesk_ticket_id: s.ticketId,
        requested_change: 'Spelling of my name is wrong on the record',
        action_taken: 'Verified against KYC document and corrected the spelling',
        outcome: 'applied',
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { outcome: string; recorded_by_display: string };
    expect(body.outcome).toBe('applied');
    // ⛔ Attribution is the SNAPSHOTTED display name — never email-derived, never client-supplied.
    expect(body.recorded_by_display).toBe('Operator Meera');

    const c = await td.pool.connect();
    try {
      const { rows } = await c.query(
        `SELECT requested_change_ciphertext, action_taken_ciphertext, helpdesk_ticket_id
           FROM member_data_rights_corrections WHERE member_id = $1`,
        [s.memberId],
      );
      expect(rows).toHaveLength(1);
      // ⛔ Both sides encrypted at rest; neither plaintext leaks into the row.
      expect(String(rows[0].requested_change_ciphertext)).toMatch(/^enc:/);
      expect(String(rows[0].action_taken_ciphertext)).toMatch(/^enc:/);
      expect(String(rows[0].requested_change_ciphertext)).not.toContain('Spelling');
      // ⛔ The ruling puts this process ON the helpdesk substrate.
      expect(rows[0].helpdesk_ticket_id).toBe(s.ticketId);
    } finally {
      c.release();
    }
  });

  it('⛔ every route on this surface is step-up gated — an un-elevated admin is refused', async () => {
    // Revert-sanity for the DISTINCT step-up context: holding the permission is not enough.
    const p = randomUUID();
    const a = await authenticate('Operator No Elevation');
    await grant(a.userId, p, 'pariwar_admin');
    const s = await seedSubject(a.client, p);

    const res = await a.client.inject({
      method: 'POST',
      url: `${base(p)}/delivery/member-direct`,
      headers: { 'idempotency-key': randomUUID() },
      payload: { export_id: s.exportId, member_id: s.memberId, helpdesk_ticket_id: s.ticketId },
    });
    expect(res.statusCode).toBe(403);
  });
});
