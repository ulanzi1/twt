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

import {
  DATA_RIGHTS_STEP_UP_CONTEXT,
  DPDPA_DATA_RIGHTS_SUBCATEGORY,
} from '@twt/contracts';
import { encryption } from '@twt/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { encryptMobile, mobileBlindIndex, normalizeMobile } from '../../../src/modules/auth/shared/mobile-index.js';
import { signAccessToken } from '../../../src/modules/auth/member/tokens.js';

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
        //
        // ⛔ EVERY CHILD ROW IS DELETED EXPLICITLY, AND THAT IS NOT BELT-AND-BRACES (round-2 review).
        // `session_replication_role = 'replica'` disables ALL triggers — and PostgreSQL implements
        // referential actions (`ON DELETE CASCADE`, `RESTRICT`) AS SYSTEM TRIGGERS. So under replica
        // role the member cascade DOES NOT FIRE: this suite's `data_exports`,
        // `data_export_delivery_grants` and `member_data_rights_corrections` rows were being orphaned
        // into the shared test database on every run, accumulating across runs — exactly the residue
        // class that produced the date-bomb this same change set fixes elsewhere.
        // ⛔ Order matters: children before parents, deepest first.
        await c.query('BEGIN');
        await c.query("SET LOCAL session_replication_role = 'replica'");
        await c.query('DELETE FROM member_data_rights_corrections WHERE member_id = ANY($1::uuid[])', [createdMemberIds]);
        await c.query('DELETE FROM data_export_delivery_grants WHERE member_id = ANY($1::uuid[])', [createdMemberIds]);
        await c.query('DELETE FROM data_exports WHERE member_id = ANY($1::uuid[])', [createdMemberIds]);
        await c.query('DELETE FROM member_identities WHERE member_id = ANY($1::uuid[])', [createdMemberIds]);
        await c.query('DELETE FROM member_auth_otps WHERE member_id = ANY($1::uuid[])', [createdMemberIds]);
        await c.query('DELETE FROM events_log WHERE stream_id = ANY($1::uuid[])', [createdMemberIds]);
        await c.query('DELETE FROM members WHERE member_id = ANY($1::uuid[])', [createdMemberIds]);
        await c.query('COMMIT');
      }
      // ⚠ Helpdesk tickets are created through the REAL intake route (see `seedSubject`) and carry
      // hash-chained `audit_log_entries`; they are left in place deliberately — deleting them would
      // mean unpicking the §1.5 chain, and they are tenant-scoped test fixtures that no assertion
      // counts globally.
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

  /** A fresh 10-digit mobile per call — avoids blind-index collisions across parallel-ish tests. */
  function randomMobile(): string {
    let n = String(6 + Math.floor(Math.random() * 4));
    for (let i = 0; i < 9; i++) n += Math.floor(Math.random() * 10);
    return n;
  }

  /** Elevate for the DISTINCT data-rights step-up context. */
  async function elevate(client: Client): Promise<void> {
    const req = await client.inject({
      method: 'POST',
      url: '/api/v1/auth/step-up/request',
      payload: { actionContext: DATA_RIGHTS_STEP_UP_CONTEXT },
    });
    expect(req.statusCode).toBe(200);
    const code = adminStepUp.last?.code as string;
    const ver = await client.inject({ method: 'POST', url: '/api/v1/auth/step-up/verify', payload: { otp: code } });
    expect(ver.statusCode).toBe(200);
  }

  /**
   * Seed a member + a REAL helpdesk ticket, and an export at the given status (default `ready`).
   *
   * ⭐ The ticket is created through the ACTUAL Story 10.1 intake route with
   * `category: 'other'` + `sub_category: DPDPA_DATA_RIGHTS_SUBCATEGORY` — i.e. exactly the AC2 path a
   * real
   * DPDPA request arrives on. ⛔ The tokens are IMPORTED, never written as literals — AC2's
   * single-literal rule now binds the test trees too, and a typo'd fixture would silently stop
   * exercising the AC2 path while still passing. ⛔ Hand-INSERTing it was tried and rejected: `audit_log_entries` carries
   * a NOT NULL `audit_hash` (the §1.5 hash chain), so a hand-seeded ticket would have required forging
   * a chain entry. Driving the real route is both simpler AND a truer fixture.
   *
   * ⚠ CODE-REVIEW FIX — a `ready` export now carries a REAL envelope-encrypted artifact (the same
   * `encryptTier1`/`kekRef` shape `data-export.spec.ts` uses), not the placeholder `'enc:v1:fake'`
   * string. The placeholder made a genuine successful-redemption test impossible: `decryptExportArtifact`
   * would fail on it, so no test could ever exercise the full member-direct → redeem → 200 path.
   * ⚠ CODE-REVIEW FIX — the member now carries a REAL `member_identities` row (mobile ciphertext +
   * blind index), not NONE. Without one, `getMemberMobileBlindIndex` returns null and
   * `grantMemberDirectDelivery` silently skips issuing an OTP at all (this is `P3`'s own finding) —
   * which made a real member-direct → redeem or member-direct → (stale) → staff-mediated sequence
   * untestable end-to-end. The two PRE-EXISTING gate tests that hand-insert an OTP row under a fake
   * `bi-${memberId}` blind index are UNAFFECTED — `primaryDeliveryNotCompletedAt` filters on
   * `member_id`, never the blind index.
   */
  async function seedSubject(
    client: Client,
    pariwarId: string,
    opts: { status?: 'pending' | 'ready'; memberRequestedStaffMediation?: boolean } = {},
  ): Promise<{ memberId: string; exportId: string; ticketId: string }> {
    const status = opts.status ?? 'ready';
    const memberId = randomUUID();
    const exportId = randomUUID();
    createdMemberIds.push(memberId);
    const c = await td.pool.connect();
    try {
      await c.query(`INSERT INTO members (member_id, pariwar_id, state, state_event_version) VALUES ($1,$2,'active',1)`, [memberId, pariwarId]);
      const mobile = randomMobile();
      const mobileCiphertext = await encryptMobile(normalizeMobile(mobile) as string, deps.encryption);
      const blindIndex = await mobileBlindIndex(mobile, deps.encryption);
      await c.query(
        `INSERT INTO member_identities (member_id, pariwar_id, mobile_ciphertext, mobile_blind_index) VALUES ($1,$2,$3,$4)`,
        [memberId, pariwarId, mobileCiphertext, blindIndex],
      );
      if (status === 'ready') {
        const ct = await encryption.encryptTier1(
          Buffer.from('fake zip bytes'),
          { pariwarId, fieldClass: 'data_export' },
          deps.encryption.kms,
          deps.encryption.kekRef,
        );
        await c.query(
          // ⛔ `requested_via` is EXPLICIT — the surface is gated on `off_portal_admin`
          // (Decision `2026-08-15-117` cl.7) and the column DEFAULTS to `member_portal`, so a fixture
          // that omits it silently stops exercising the routes it is written for.
          // ⛔ `expires_at` is set: `findActiveExport` counts a `ready` row only while
          // `consumed_at IS NULL AND expires_at > now()`. A NULL expiry makes that predicate NULL —
          // never true — so the fixture's export would not be "active" and the reuse path could not be
          // exercised at all.
          `INSERT INTO data_exports (export_id, member_id, pariwar_id, status, requested_at, artifact_ciphertext, requested_via, expires_at)
           VALUES ($1,$2,$3,'ready', now(), $4, 'off_portal_admin', now() + interval '1 day')`,
          [exportId, memberId, pariwarId, encryption.serializeEnvelope(ct)],
        );
      } else {
        await c.query(
          `INSERT INTO data_exports (export_id, member_id, pariwar_id, status, requested_at, requested_via)
           VALUES ($1,$2,$3,'pending', now(), 'off_portal_admin')`,
          [exportId, memberId, pariwarId],
        );
      }
    } finally {
      c.release();
    }
    const filed = await client.inject({
      method: 'POST',
      url: `/api/v1/p/${pariwarId}/helpdesk/tickets`,
      payload: {
        subject_member_id: memberId,
        category: 'other',
        sub_category: DPDPA_DATA_RIGHTS_SUBCATEGORY,
        body: 'Member is exercising their data rights.',
        created_via: 'helpline_call',
        // ── Story 10.29 — ELEMENT 1, CAPTURED AT INTAKE THROUGH THE REAL ROUTE ─────────────────────
        // ⛔ DELIBERATELY OPT-IN AND DEFAULTED OFF. Every pre-existing caller of `seedSubject` gets a
        // ticket with NO captured request, which is what makes the polarity pair below meaningful:
        // the two arms differ in this one flag and in nothing else.
        // ⛔ The ticket is filed through the REAL create route, so the instant is stamped by the
        // SERVER at genesis — never hand-inserted, and never a fixture-authored timestamp.
        ...(opts.memberRequestedStaffMediation === true
          ? { member_requested_staff_mediated_delivery: true }
          : {}),
      },
    });
    expect(filed.statusCode).toBe(201);
    return { memberId, exportId, ticketId: (filed.json() as { ticket_id: string }).ticket_id };
  }

  const base = (p: string) => `/api/v1/p/${p}/member-data-rights`;

  /**
   * Drive the REAL primary route and then let its OTP lapse — the only honest way to make element 2 true.
   *
   * ⛔ THIS REPLACES A HAND-INSERTED OTP ROW, AND THE DIFFERENCE IS THE WHOLE POINT (round-2 review).
   * Element 2 is now scoped to the export's own `member_direct` grant (Decision `2026-08-15-117` cl.3),
   * so an OTP with no grant behind it no longer satisfies it — which is exactly the hole the old fixture
   * was papering over: it proved the gate opened for an OTP that no delivery attempt had produced.
   * ⚠ The grant is deliberately NOT expired here: after migration 0105 a pending `member_direct` grant
   * no longer blocks a `staff_mediated` insert, so the real sequence needs no fixture surgery at all.
   */
  async function primaryTriedAndLapsed(
    client: Client,
    p: string,
    s: { memberId: string; exportId: string; ticketId: string },
  ): Promise<void> {
    const issued = await client.inject({
      method: 'POST',
      url: `${base(p)}/delivery/member-direct`,
      headers: { 'idempotency-key': randomUUID() },
      payload: { export_id: s.exportId, member_id: s.memberId, helpdesk_ticket_id: s.ticketId },
    });
    expect(issued.statusCode, 'the PRIMARY route must succeed before the fallback can be reached').toBe(200);

    // Let the delivered code lapse. ⛔ Only the OTP is aged — nothing else is touched.
    const c = await td.pool.connect();
    try {
      const { rowCount } = await c.query(
        `UPDATE member_auth_otps SET expires_at = now() - interval '1 minute'
          WHERE member_id = $1 AND intent = 'data_export_delivery' AND consumed_at IS NULL`,
        [s.memberId],
      );
      // ⛔ Guard: if the route stopped minting an OTP this would silently age nothing and the test
      // below would fail for the wrong reason.
      expect(rowCount, 'the primary route must have minted a delivery OTP').toBeGreaterThan(0);
    } finally {
      c.release();
    }
  }

  /**
   * Story 10.29 (AC2) — file a DPDPA ticket through the REAL Story 10.2 MEMBER route.
   *
   * ⭐ Why the member route matters here: on the operator route element 1 is OPERATOR-TRANSCRIBED
   * (`2026-08-15-120` cl.6), so proving the gate only there would prove it on the weaker of the two
   * intake paths. ⛔ AC2 requires BOTH.
   *
   * ⚠ MULTIPART, with Turnstile + Idempotency-Key riding HEADERS (the 10.2 harness posture — they are
   * NOT multipart fields). The staff-mediation flag arrives as a FIELD, as a STRING, which is exactly
   * the normalization the handler has to get right.
   */
  async function fileMemberTicket(
    pariwarId: string,
    memberId: string,
    opts: { staffMediation: boolean },
  ): Promise<string> {
    const boundary = `----twt${randomUUID().replace(/-/g, '')}`;
    const fields: ReadonlyArray<readonly [string, string]> = [
      ['category', 'other'],
      ['sub_category', DPDPA_DATA_RIGHTS_SUBCATEGORY],
      ['subject', 'I want a copy of my records'],
      ['body', 'Please send me everything you hold about me.'],
      // ⛔ Sent only when ticked — the mobile client appends it conditionally, and the absent case is
      // what the negative arm exercises.
      ...(opts.staffMediation ? ([['member_requested_staff_mediated_delivery', 'true']] as const) : []),
    ];
    const body = Buffer.concat([
      ...fields.map(([name, value]) =>
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`),
      ),
      Buffer.from(`--${boundary}--\r\n`),
    ]);

    const token = signAccessToken(app, { memberId, pariwarId, deviceId: 'test-device' }, 15 * 60 * 1000);
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/p/${pariwarId}/member/helpdesk/tickets`,
      payload: body as unknown as object,
      headers: {
        'content-type': `multipart/form-data; boundary=${boundary}`,
        origin: 'http://localhost:3001',
        authorization: `Bearer ${token}`,
        'x-turnstile-token': 'test-turnstile-token',
        'idempotency-key': randomUUID(),
      },
    });
    expect(res.statusCode, 'the member intake route must accept the filing').toBe(201);
    return (res.json() as { ticket_id: string }).ticket_id;
  }

  // ── AC-R1 — the THREE-PART GATE ────────────────────────────────────────────────────────────────

  it('⛔ staff-mediated is REFUSED when the primary route has not been tried (element 2 fails closed)', async () => {
    const p = randomUUID();
    const a = await authenticate('Operator A');
    await grant(a.userId, p, 'pariwar_admin');
    await elevate(a.client);
    // ⭐ Story 10.29 — element 1 IS captured, so element 2 remains the operative gate this test names.
    // ⛔ Without it the route would refuse for element 1's reason and this test would silently stop
    // proving anything about element 2 — passing green on the wrong refusal.
    const s = await seedSubject(a.client, p, { memberRequestedStaffMediation: true });

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
    // ⭐ Story 10.29 — element 1 is captured AT INTAKE, on the ticket, by the real create route.
    // ⛔ There is no request field that could supply it: the only way to make this route succeed is to
    // have filed a ticket that recorded the member's request.
    const s = await seedSubject(a.client, p, { memberRequestedStaffMediation: true });

    // The primary route is genuinely TRIED, through the real route, and its code then lapses. ⚠ This is
    // the ONLY thing that changes between this test and the refusal above — which is what makes
    // element 2 the operative gate rather than decoration.
    await primaryTriedAndLapsed(a.client, p, s);

    const res = await a.client.inject({
      method: 'POST',
      url: `${base(p)}/delivery/staff-mediated`,
      headers: { 'idempotency-key': randomUUID() },
      payload: {
        export_id: s.exportId,
        member_id: s.memberId,
        helpdesk_ticket_id: s.ticketId,
        attestation: 'Caller states the registered handset was lost; identity confirmed by read-back.',
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { channel: string; primary_delivery_not_completed_at: string };
    expect(body.channel).toBe('staff_mediated');
    expect(body.primary_delivery_not_completed_at).toBeTruthy();

    const c2 = await td.pool.connect();
    try {
      // ⛔ FILTERED BY CHANNEL, not asserted by COUNT. The real sequence necessarily leaves TWO grants
      // on this member — the member_direct attempt that made element 2 true, and the staff_mediated
      // exception it justified. Asserting a count here would break the moment the fixture became
      // honest, which is exactly what happened.
      const { rows } = await c2.query(
        `SELECT member_request_recorded_at, primary_delivery_not_completed_at, attestation_ciphertext
           FROM data_export_delivery_grants WHERE member_id = $1 AND channel = 'staff_mediated'`,
        [s.memberId],
      );
      expect(rows).toHaveLength(1);
      // All three recorded. ⛔ The attestation is stored ENCRYPTED — never plaintext at rest.
      expect(rows[0].member_request_recorded_at).not.toBeNull();
      expect(rows[0].primary_delivery_not_completed_at).not.toBeNull();
      expect(String(rows[0].attestation_ciphertext)).toMatch(/^enc:/);
      expect(String(rows[0].attestation_ciphertext)).not.toContain('handset');

      // ⛔ And the CONVERSE still holds on the primary grant in the same table — the two channels must
      // stay distinguishable, or `member_direct_clean_check` has quietly stopped meaning anything.
      const { rows: direct } = await c2.query(
        `SELECT member_request_recorded_at, primary_delivery_not_completed_at, attestation_ciphertext
           FROM data_export_delivery_grants WHERE member_id = $1 AND channel = 'member_direct'`,
        [s.memberId],
      );
      expect(direct).toHaveLength(1);
      expect(direct[0].member_request_recorded_at).toBeNull();
      expect(direct[0].primary_delivery_not_completed_at).toBeNull();
      expect(direct[0].attestation_ciphertext).toBeNull();
    } finally {
      c2.release();
    }
  });

  // ── Story 10.29 — ELEMENT 1 IS MEMBER-AUTHORED, NOT MERELY PRESENT (AC3/AC4/AC5/AC6) ────────────
  //
  // ⛔ WHY A POLARITY PAIR AND NOT AN ASSERTION. `expect(row.member_request_recorded_at).not.toBeNull()`
  // was ALREADY TRUE under the deleted `z.literal(true)` — it is in this very suite, in the
  // "records all three elements" test above. An assertion that was true before the change cannot
  // distinguish the fix from the defect. What CAN: the same route, the same operator, the same export,
  // REFUSED against a ticket with no captured request and PERMITTED against one with it.
  //
  // ⛔ BOTH ARMS RUN `primaryTriedAndLapsed`, and that is load-bearing. Element 2 is genuinely true in
  // both, so it cannot be the thing doing the refusing — leaving element 1 as provably the ONLY
  // difference between the two outcomes.

  it('⭐ AC6 (a) — REFUSED when the originating ticket records NO member request, and no grant row is created', async () => {
    const p = randomUUID();
    const a = await authenticate('Operator M1');
    await grant(a.userId, p, 'pariwar_admin');
    await elevate(a.client);
    // ⛔ The ONLY difference from arm (b): this ticket carries no captured request.
    const s = await seedSubject(a.client, p);

    // Element 2 is made GENUINELY true through the real routes — so a refusal here cannot be element
    // 2's refusal wearing element 1's name.
    await primaryTriedAndLapsed(a.client, p, s);

    const res = await a.client.inject({
      method: 'POST',
      url: `${base(p)}/delivery/staff-mediated`,
      headers: { 'idempotency-key': randomUUID() },
      payload: {
        export_id: s.exportId,
        member_id: s.memberId,
        helpdesk_ticket_id: s.ticketId,
        attestation: 'Caller states the registered handset was lost last week.',
      },
    });

    expect(res.statusCode).toBe(409);
    expect((res.json() as { error: { code: string } }).error.code).toBe(
      'member_data_rights.member_request_not_captured',
    );

    // ⛔ AC5 — REFUSED BEFORE ANY ROW EXISTS. A refused exception must leave no trace of an exception.
    // ⚠ Filtered by CHANNEL, not asserted by count: the honest sequence necessarily leaves the
    // member_direct grant that made element 2 true.
    const c = await td.pool.connect();
    try {
      const { rowCount } = await c.query(
        `SELECT 1 FROM data_export_delivery_grants WHERE member_id = $1 AND channel = 'staff_mediated'`,
        [s.memberId],
      );
      expect(rowCount, 'a refused staff-mediated grant must not exist at all').toBe(0);
    } finally {
      c.release();
    }
  });

  it('⭐ AC6 (b) + AC4 — PERMITTED when the ticket records the request, and the grant carries the MEMBER’s instant', async () => {
    const p = randomUUID();
    const a = await authenticate('Operator M2');
    await grant(a.userId, p, 'pariwar_admin');
    await elevate(a.client);
    // ⭐ THE ONLY DIFFERENCE FROM ARM (a): a fact recorded at INTAKE, by the intake route, on a ticket
    // this delivery route cannot create. ⛔ There is no request field that could substitute for it.
    const s = await seedSubject(a.client, p, { memberRequestedStaffMediation: true });
    await primaryTriedAndLapsed(a.client, p, s);

    const res = await a.client.inject({
      method: 'POST',
      url: `${base(p)}/delivery/staff-mediated`,
      headers: { 'idempotency-key': randomUUID() },
      payload: {
        export_id: s.exportId,
        member_id: s.memberId,
        helpdesk_ticket_id: s.ticketId,
        attestation: 'Caller states the registered handset was lost; identity confirmed by read-back.',
      },
    });
    expect(res.statusCode).toBe(200);
    expect((res.json() as { channel: string }).channel).toBe('staff_mediated');

    const c = await td.pool.connect();
    try {
      // ── AC4 — THE INSTANT IS THE MEMBER'S, NOT THE OPERATOR'S ────────────────────────────────────
      // ⛔ `not.toBeNull()` cannot tell the fix from the defect: `memberRequestRecordedAt: now` was
      // non-null too. THESE TWO ASSERTIONS CAN.
      //   (1) EQUALITY with the ticket's captured instant — it is the same fact, copied, not a new
      //       timestamp minted at staff-submit time;
      //   (2) STRICTLY EARLIER than the grant's own created_at — the invariant that makes the two
      //       instants distinguishable to every later reader of the column.
      // ⚠ (1) IS THE DISCRIMINATOR, not (2). Under the defect `memberRequestRecordedAt: now`, the
      // handler's clock still precedes the DB's insert-time `created_at`, so (2) would pass anyway.
      // Verified by revert-sanity: restoring the defect fails (1) with a ~26ms delta and leaves (2)
      // green. ⛔ Do not "simplify" this to the ordering check alone — it would stop proving AC4.
      const { rows } = await c.query(
        `SELECT g.member_request_recorded_at, g.created_at, t.member_staff_mediation_requested_at
           FROM data_export_delivery_grants g
           JOIN helpdesk_tickets t ON t.ticket_id = g.helpdesk_ticket_id
          WHERE g.member_id = $1 AND g.channel = 'staff_mediated'`,
        [s.memberId],
      );
      expect(rows).toHaveLength(1);
      const row = rows[0] as {
        member_request_recorded_at: Date;
        created_at: Date;
        member_staff_mediation_requested_at: Date;
      };

      expect(row.member_staff_mediation_requested_at, 'the ticket must carry the capture').not.toBeNull();
      expect(
        row.member_request_recorded_at.getTime(),
        'the grant must carry the TICKET’s instant — not a `now` minted when staff submitted',
      ).toBe(row.member_staff_mediation_requested_at.getTime());
      expect(
        row.member_request_recorded_at.getTime(),
        'the member’s request must strictly PRECEDE the staff grant — equality is the defect',
      ).toBeLessThan(row.created_at.getTime());
    } finally {
      c.release();
    }
  });

  it('⭐ AC2 — a ticket filed through the MEMBER app (10.2, multipart) is equally sufficient', async () => {
    // ⛔ WITHOUT THIS, AC2 IS MET ON ONE ROUTE AND UNPROVEN ON THE OTHER — the exact failure the AC
    // names. The two arms above both file through the OPERATOR route, where the field is
    // operator-transcribed (`2026-08-15-120` cl.6). ⭐ THIS is the route on which element 1's
    // authorship is genuine: the member is the authenticated actor filing for themselves.
    const p = randomUUID();
    const a = await authenticate('Operator M3');
    await grant(a.userId, p, 'pariwar_admin');
    await elevate(a.client);
    const s = await seedSubject(a.client, p);

    // File a SECOND ticket — this time through the real member route, with the capture set.
    const memberTicketId = await fileMemberTicket(p, s.memberId, { staffMediation: true });

    await primaryTriedAndLapsed(a.client, p, s);

    const res = await a.client.inject({
      method: 'POST',
      url: `${base(p)}/delivery/staff-mediated`,
      headers: { 'idempotency-key': randomUUID() },
      payload: {
        export_id: s.exportId,
        member_id: s.memberId,
        // ⭐ The MEMBER-filed ticket, not the operator-filed one seeded above.
        helpdesk_ticket_id: memberTicketId,
        attestation: 'Member filed the request themselves in the app; handset since lost.',
      },
    });
    expect(res.statusCode, 'a member-filed capture must be equally sufficient').toBe(200);

    const c = await td.pool.connect();
    try {
      const { rows } = await c.query(
        `SELECT g.member_request_recorded_at, t.member_staff_mediation_requested_at, t.created_via
           FROM data_export_delivery_grants g
           JOIN helpdesk_tickets t ON t.ticket_id = g.helpdesk_ticket_id
          WHERE g.member_id = $1 AND g.channel = 'staff_mediated'`,
        [s.memberId],
      );
      expect(rows).toHaveLength(1);
      const row = rows[0] as {
        member_request_recorded_at: Date;
        member_staff_mediation_requested_at: Date;
        created_via: string;
      };
      // ⭐ The grant rests on a ticket the MEMBER filed — `member_app`, not `helpline_call`.
      expect(row.created_via).toBe('member_app');
      expect(row.member_request_recorded_at.getTime()).toBe(row.member_staff_mediation_requested_at.getTime());
    } finally {
      c.release();
    }
  });

  it('⛔ AC2 — the member route WITHOUT the field records nothing, and the same grant is refused', async () => {
    // ⚠ The converse of the arm above, on the member route: the multipart field's absence must mean
    // "did not ask", not "defaulted to true". ⛔ Without this, a permissive multipart parse (every
    // non-empty string is truthy) would pass the arm above and still manufacture element 1.
    const p = randomUUID();
    const a = await authenticate('Operator M4');
    await grant(a.userId, p, 'pariwar_admin');
    await elevate(a.client);
    const s = await seedSubject(a.client, p);
    const memberTicketId = await fileMemberTicket(p, s.memberId, { staffMediation: false });

    const c = await td.pool.connect();
    try {
      const { rows } = await c.query(
        'SELECT member_staff_mediation_requested_at FROM helpdesk_tickets WHERE ticket_id = $1',
        [memberTicketId],
      );
      expect(rows[0].member_staff_mediation_requested_at, 'an unticked box must record NOTHING').toBeNull();
    } finally {
      c.release();
    }

    await primaryTriedAndLapsed(a.client, p, s);
    const res = await a.client.inject({
      method: 'POST',
      url: `${base(p)}/delivery/staff-mediated`,
      headers: { 'idempotency-key': randomUUID() },
      payload: {
        export_id: s.exportId,
        member_id: s.memberId,
        helpdesk_ticket_id: memberTicketId,
        attestation: 'x',
      },
    });
    expect(res.statusCode).toBe(409);
    expect((res.json() as { error: { code: string } }).error.code).toBe(
      'member_data_rights.member_request_not_captured',
    );
  });

  it('⭐ staff-mediated succeeds on the SAME export once the member-direct grant itself has gone stale (lazy-expire-on-read, code-review fix)', async () => {
    // ⛔ THE SEQUENCE THIS PROVES, THAT THE TEST ABOVE DOES NOT: this drives the REAL
    // member-direct → (stale) → staff-mediated path on the SAME export, via the actual routes —
    // rather than hand-inserting an OTP row with no member-direct grant ever having existed. Before
    // the fix, the stale `pending` member-direct grant still occupied migration 0104's
    // `one_pending_per_export` partial unique index, so the second insert collided and the caller saw
    // a MISLEADING 409 `delivery_grant_already_live` (misleading because the grant that was "live" per
    // the index was, in fact, dead and unredeemable).
    const p = randomUUID();
    const a = await authenticate('Operator F');
    await grant(a.userId, p, 'pariwar_admin');
    await elevate(a.client);
    // ⭐ Story 10.29 — element 1 captured at intake (see the sibling test above).
    const s = await seedSubject(a.client, p, { memberRequestedStaffMediation: true });

    const primary = await a.client.inject({
      method: 'POST',
      url: `${base(p)}/delivery/member-direct`,
      headers: { 'idempotency-key': randomUUID() },
      payload: { export_id: s.exportId, member_id: s.memberId, helpdesk_ticket_id: s.ticketId },
    });
    expect(primary.statusCode).toBe(200);
    const primaryGrantId = (primary.json() as { grant_id: string }).grant_id;

    // The primary route's OTP AND the grant itself both go stale (the member never redeemed).
    const c = await td.pool.connect();
    try {
      await c.query(
        `UPDATE member_auth_otps SET expires_at = now() - interval '1 hour'
           WHERE member_id = $1 AND intent = 'data_export_delivery'`,
        [s.memberId],
      );
      await c.query(
        `UPDATE data_export_delivery_grants SET expires_at = now() - interval '1 hour' WHERE grant_id = $1`,
        [primaryGrantId],
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
        attestation: 'Member asked for staff-mediated delivery after the primary route went stale.',
      },
    });
    expect(res.statusCode).toBe(200);
    expect((res.json() as { channel: string }).channel).toBe('staff_mediated');

    // The stale member-direct grant was transitioned to `expired`, not left `pending` — the exact
    // transition `expireStaleGrantForExport` makes, proven at the row level.
    const c2 = await td.pool.connect();
    try {
      const { rows } = await c2.query(
        'SELECT grant_id, channel, status FROM data_export_delivery_grants WHERE member_id = $1 ORDER BY created_at',
        [s.memberId],
      );
      expect(rows).toHaveLength(2);
      expect(rows[0]).toMatchObject({ grant_id: primaryGrantId, channel: 'member_direct', status: 'expired' });
      expect(rows[1]).toMatchObject({ channel: 'staff_mediated', status: 'pending' });
    } finally {
      c2.release();
    }
  });

  it('⛔ delivery is REFUSED when the export is not ready (still building)', async () => {
    const p = randomUUID();
    const a = await authenticate('Operator H');
    await grant(a.userId, p, 'pariwar_admin');
    await elevate(a.client);
    const s = await seedSubject(a.client, p, { status: 'pending' });

    const res = await a.client.inject({
      method: 'POST',
      url: `${base(p)}/delivery/member-direct`,
      headers: { 'idempotency-key': randomUUID() },
      payload: { export_id: s.exportId, member_id: s.memberId, helpdesk_ticket_id: s.ticketId },
    });
    expect(res.statusCode).toBe(409);
    expect((res.json() as { error: { code: string } }).error.code).toBe(
      'member_data_rights.export_not_ready',
    );
  });

  // ── AC-R1 — redemption ─────────────────────────────────────────────────────────────────────────

  it('✅ the FULL member-direct → redeem sequence succeeds and returns the decrypted artifact (tenant-scoped)', async () => {
    // ⛔ THE COVERAGE GAP THIS CLOSES (code-review addition). No existing test exercised a genuinely
    // SUCCESSFUL redemption — every other redemption test asserts a 404. `redeemDelivery`'s tenant
    // comes from `findLiveGrantUnscoped`'s DB-derived `grant.pariwarId`, never from caller input,
    // which is what makes the route's cross-tenant surface non-existent by construction; this test
    // proves that path end-to-end, not just by inspection: if a future change ever scoped the
    // redemption tx to the WRONG pariwar, `decryptExportArtifact` would fail (Tier-1 envelopes are
    // KEK-scoped per Pariwar) and this test would catch it immediately.
    const p = randomUUID();
    const a = await authenticate('Operator I');
    await grant(a.userId, p, 'pariwar_admin');
    await elevate(a.client);
    const s = await seedSubject(a.client, p);

    const granted = await a.client.inject({
      method: 'POST',
      url: `${base(p)}/delivery/member-direct`,
      headers: { 'idempotency-key': randomUUID() },
      payload: { export_id: s.exportId, member_id: s.memberId, helpdesk_ticket_id: s.ticketId },
    });
    expect(granted.statusCode).toBe(200);
    const grantId = (granted.json() as { grant_id: string }).grant_id;
    // ⚠ `td.stepUpDelivery` (the MEMBER-facing port), NOT `adminStepUp` — `grantMemberDirectDelivery`
    // delivers the member's OTP through `deps.stepUpDelivery`, a DISTINCT capturing instance from the
    // `deps.adminStepUpDelivery` the operator's OWN elevation OTP rides (see `elevate()` above).
    const code = td.stepUpDelivery.last?.code as string;
    expect(code).toBeTruthy();

    // ⚠ Raw `app.inject` here, not the `makeClient` cookie-jar wrapper (used elsewhere in this file)
    // — the wrapper's `InjectResult` deliberately exposes only `statusCode`/`json()`/`body`, and this
    // assertion needs the raw headers + binary payload `data-export.spec.ts`'s own `injectRaw` helper
    // reads the same way. The route is unauthenticated, so no cookie jar is needed anyway.
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/member-data-rights/delivery/${grantId}/redeem`,
      payload: { otp: code },
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('application/zip');
    expect(res.rawPayload.toString('utf8')).toBe('fake zip bytes');

    const c = await td.pool.connect();
    try {
      const { rows } = await c.query('SELECT status, consumed_at FROM data_export_delivery_grants WHERE grant_id = $1', [grantId]);
      expect(rows[0].status).toBe('consumed');
      expect(rows[0].consumed_at).not.toBeNull();
    } finally {
      c.release();
    }

    // ⛔ ONE-TIME — a second redemption with the SAME (now-burned) code gets the same 404 as unknown.
    const second = await app.inject({
      method: 'POST',
      url: `/api/v1/member-data-rights/delivery/${grantId}/redeem`,
      payload: { otp: code },
    });
    expect(second.statusCode).toBe(404);
  });

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
    // ⭐ Story 10.29 — element 1 captured at intake, so the grant is actually issued here.
    const s = await seedSubject(a.client, p, { memberRequestedStaffMediation: true });
    await primaryTriedAndLapsed(a.client, p, s);
    const granted = await a.client.inject({
      method: 'POST',
      url: `${base(p)}/delivery/staff-mediated`,
      headers: { 'idempotency-key': randomUUID() },
      payload: {
        export_id: s.exportId,
        member_id: s.memberId,
        helpdesk_ticket_id: s.ticketId,
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

  // ══════════════════════════════════════════════════════════════════════════════════════════════════
  // ROUND-2 CODE REVIEW — the routes and cross-cutting guards that had NO test at all.
  //
  // ⛔ WHAT WAS MISSING AND WHY IT MATTERED. Nine Task-9 checkboxes were marked `[x]` for work that did
  // not exist: `…/erasure` — the IRREVERSIBLE route — appeared in no test file tree-wide; `requestExport`
  // and `getActiveExport` were never injected; AC12's terminal guard was proven on the member
  // self-service caller only, though AC12 states in terms that "one caller is not enough"; and there was
  // no test for cross-Pariwar denial, permission denial, a missing `users.display_name`, or an
  // `Idempotency-Key` replay. The step-up test asserted "every route on this surface" while exercising
  // ONE of six.
  // ══════════════════════════════════════════════════════════════════════════════════════════════════

  /** A member whose LIFECYCLE is `active` but whose moderation overlay reads `terminated`. */
  async function seedTerminatedSubject(
    client: Client,
    pariwarId: string,
  ): Promise<{ memberId: string; ticketId: string }> {
    const s = await seedSubject(client, pariwarId, { status: 'pending' });
    const c = await td.pool.connect();
    try {
      // ⛔ TWO events, and the pair is not padding: `nextModerationStatus` refuses `terminate` from
      // `none` — the overlay only reaches `terminated` via `suspended`. A single terminate event folds
      // to a no-op and the erasure is then (correctly) refused as `rtbf.invalid_state`, which is a
      // confusing way to discover that the fixture, not the code, was wrong.
      await c.query(
        `INSERT INTO events_log (stream_id, event_type, payload, event_version, occurred_at, pariwar_id)
         VALUES ($1, 'member.moderation.suspended', $2, 1, now() - interval '2 days', $4),
                ($1, 'member.moderation.terminated', $3, 2, now() - interval '1 day', $4)`,
        [
          s.memberId,
          JSON.stringify({ reason_code: 'conduct', actor: 'trustee' }),
          JSON.stringify({ reason_code: 'conduct', actor: 'trustee' }),
          pariwarId,
        ],
      );
    } finally {
      c.release();
    }
    return { memberId: s.memberId, ticketId: s.ticketId };
  }

  // ── AC7 — the erasure route, end to end ─────────────────────────────────────────────────────────

  it('⭐ AC7 — a TERMINATED member is erased off-portal, and `from_state` records the REAL replayed state', async () => {
    // ⛔ THE CENTRAL AC7 CLAIM, and it was asserted nowhere. The member's LIFECYCLE label is `active`;
    // it is the moderation OVERLAY that reads `terminated`. Before 10.21 an erasure was legal only from
    // `withdrawn`, so this case was impossible — and the shipped exemplar hardcoded
    // `from_state: 'withdrawn'`, which would be a FALSE audit record on exactly the event whose `from`
    // set this story widened. This is the test that would catch that hardcode coming back.
    const p = randomUUID();
    const a = await authenticate('Operator Erasure');
    await grant(a.userId, p, 'pariwar_admin');
    await elevate(a.client);
    const s = await seedTerminatedSubject(a.client, p);

    const res = await a.client.inject({
      method: 'POST',
      url: `${base(p)}/erasure`,
      headers: { 'idempotency-key': randomUUID() },
      payload: { member_id: s.memberId, helpdesk_ticket_id: s.ticketId },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { state: string; from_state: string };
    expect(body.state).toBe('anonymized');
    // ⛔ THE POINT OF AC7: `from_state` is the state the reducer actually REPLAYS, not a hardcoded
    // 'withdrawn'. ⚠ The replayed value here is `pending-kyc` — `members.state` is projector-only and
    // this fixture appends no lifecycle events, so the reducer's initial state is what it replays to.
    // That is precisely why the assertion is written against the replayed value and NOT against the
    // `members` row: the shipped member-path exemplar hardcodes `from_state: 'withdrawn'`, and copying
    // it here would write a FALSE audit record on the one event whose `from` set this story widened.
    expect(body.from_state).toBe('pending-kyc');
    expect(body.from_state, 'the hardcoded exemplar value must never reappear here').not.toBe('withdrawn');

    const c = await td.pool.connect();
    try {
      const { rows } = await c.query(
        `SELECT payload FROM events_log
          WHERE stream_id = $1 AND event_type = 'member.rtbf_anonymized'`,
        [s.memberId],
      );
      expect(rows).toHaveLength(1);
      const payload = rows[0].payload as Record<string, unknown>;
      // ⛔ The three pinned provenance fields. `actor` is what distinguishes an operator-executed
      // erasure from a member self-service one; `helpdesk_ticket_id` records WHICH request caused it.
      expect(payload.actor).toBe('trustee');
      expect(payload.trigger).toBe('member_data_rights.rtbf_fulfilled');
      expect(payload.helpdesk_ticket_id).toBe(s.ticketId);
      expect(payload.from_state).toBe('pending-kyc');
      // ⛔ `.strict()` still holds — no free text, no cleared PII rode along.
      expect(Object.keys(payload).sort()).toEqual(
        ['actor', 'from_state', 'helpdesk_ticket_id', 'to_state', 'trigger'].sort(),
      );
    } finally {
      c.release();
    }
  });

  it('⛔ AC3 — an erasure with NO helpdesk_ticket_id is refused (the schema cannot enforce this; the caller must)', async () => {
    // ⚠ The EVENT payload's `helpdesk_ticket_id` is OPTIONAL — it must be, or the member self-service
    // path's four-field payload breaks at runtime. So an off-portal erasure that omitted it would
    // validate CLEANLY and become indistinguishable from a member's own. The guarantee lives in the
    // request contract and the handler, and this is what holds them to it.
    const p = randomUUID();
    const a = await authenticate('Operator NoTicket');
    await grant(a.userId, p, 'pariwar_admin');
    await elevate(a.client);
    const s = await seedTerminatedSubject(a.client, p);

    const res = await a.client.inject({
      method: 'POST',
      url: `${base(p)}/erasure`,
      headers: { 'idempotency-key': randomUUID() },
      payload: { member_id: s.memberId },
    });
    expect(res.statusCode).toBe(400);

    // ⛔ And nothing happened: no event, no state change.
    const c = await td.pool.connect();
    try {
      const { rows } = await c.query(
        `SELECT 1 FROM events_log WHERE stream_id = $1 AND event_type = 'member.rtbf_anonymized'`,
        [s.memberId],
      );
      expect(rows).toHaveLength(0);
    } finally {
      c.release();
    }
  });

  it('⛔ AC3 — a redelivered erasure with the SAME Idempotency-Key is refused, and appends no second event', async () => {
    // ⛔ An off-portal erasure is IRREVERSIBLE and operator-initiated. A double-submit must not append a
    // second `member.rtbf_anonymized`. ⚠ Every other call in this file passes a fresh randomUUID(), so
    // the replay branch was never entered before this test.
    const p = randomUUID();
    const a = await authenticate('Operator Replay');
    await grant(a.userId, p, 'pariwar_admin');
    await elevate(a.client);
    const s = await seedTerminatedSubject(a.client, p);
    const key = randomUUID();

    const first = await a.client.inject({
      method: 'POST',
      url: `${base(p)}/erasure`,
      headers: { 'idempotency-key': key },
      payload: { member_id: s.memberId, helpdesk_ticket_id: s.ticketId },
    });
    expect(first.statusCode).toBe(200);

    const replay = await a.client.inject({
      method: 'POST',
      url: `${base(p)}/erasure`,
      headers: { 'idempotency-key': key },
      payload: { member_id: s.memberId, helpdesk_ticket_id: s.ticketId },
    });
    expect(replay.statusCode).toBe(409);
    expect((replay.json() as { error: { code: string } }).error.code).toBe(
      'member_data_rights.idempotency_replay',
    );

    const c = await td.pool.connect();
    try {
      const { rows } = await c.query(
        `SELECT 1 FROM events_log WHERE stream_id = $1 AND event_type = 'member.rtbf_anonymized'`,
        [s.memberId],
      );
      // ⛔ Exactly ONE. A replay that re-executed would show two.
      expect(rows).toHaveLength(1);
    } finally {
      c.release();
    }
  });

  // ── AC5 / AC12 — the off-portal BUILD route ─────────────────────────────────────────────────────

  it('⭐ AC12 — the off-portal build refuses a member in a TERMINAL lifecycle state (the SECOND caller)', async () => {
    // ⛔ AC12 states it explicitly: "one caller is not enough … guarding only the new route would leave
    // the older, already-reachable one open". The member self-service caller had a test; this one did
    // not, so the guard that actually matters — the route that does NOT require a member session — was
    // unproven. Without it a fresh dossier row could be created for a member just erased.
    const p = randomUUID();
    const a = await authenticate('Operator Terminal');
    await grant(a.userId, p, 'pariwar_admin');
    await elevate(a.client);
    const s = await seedTerminatedSubject(a.client, p);

    // Erase first, so the member's lifecycle state is genuinely terminal.
    const erased = await a.client.inject({
      method: 'POST',
      url: `${base(p)}/erasure`,
      headers: { 'idempotency-key': randomUUID() },
      payload: { member_id: s.memberId, helpdesk_ticket_id: s.ticketId },
    });
    expect(erased.statusCode).toBe(200);

    const res = await a.client.inject({
      method: 'POST',
      url: `${base(p)}/export`,
      headers: { 'idempotency-key': randomUUID() },
      payload: { member_id: s.memberId, helpdesk_ticket_id: s.ticketId },
    });
    expect(res.statusCode).toBe(409);
    expect((res.json() as { error: { code: string } }).error.code).toBe('data_export.member_terminal');
  });

  it('⭐ the build REUSES an existing off-portal export rather than assembling a second dossier', async () => {
    // ⛔ `data_exports_one_pending_per_member` is predicated on `status = 'pending'`, so a `ready`,
    // unconsumed export does NOT collide — the route would have built a SECOND complete Tier-1 dossier.
    const p = randomUUID();
    const a = await authenticate('Operator Reuse');
    await grant(a.userId, p, 'pariwar_admin');
    await elevate(a.client);
    const s = await seedSubject(a.client, p);

    const res = await a.client.inject({
      method: 'POST',
      url: `${base(p)}/export`,
      headers: { 'idempotency-key': randomUUID() },
      payload: { member_id: s.memberId, helpdesk_ticket_id: s.ticketId },
    });
    expect(res.statusCode).toBe(200);
    // The fixture's `ready` off-portal export is returned, not a new one.
    expect((res.json() as { export_id: string }).export_id).toBe(s.exportId);

    const c = await td.pool.connect();
    try {
      const { rows } = await c.query(`SELECT count(*)::int AS n FROM data_exports WHERE member_id = $1`, [
        s.memberId,
      ]);
      expect(rows[0].n).toBe(1);
    } finally {
      c.release();
    }
  });

  it("⛔ the active-export read does NOT surface a member's own SELF-SERVICE portal export", async () => {
    // ⛔ Decision `2026-08-15-117` cl.7. Without the `requested_via` gate an ACTIVE member's own
    // portal-built dossier could be surfaced to an operator and routed staff-mediated to them.
    const p = randomUUID();
    const a = await authenticate('Operator Via');
    await grant(a.userId, p, 'pariwar_admin');
    await elevate(a.client);
    const s = await seedSubject(a.client, p);

    const c = await td.pool.connect();
    try {
      await c.query(`UPDATE data_exports SET requested_via = 'member_portal' WHERE export_id = $1`, [
        s.exportId,
      ]);
    } finally {
      c.release();
    }

    const res = await a.client.inject({
      method: 'GET',
      url: `${base(p)}/export/active?member_id=${s.memberId}`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toBeNull();

    // …and neither delivery route will touch it either — 404, not an existence oracle.
    const deliver = await a.client.inject({
      method: 'POST',
      url: `${base(p)}/delivery/member-direct`,
      headers: { 'idempotency-key': randomUUID() },
      payload: { export_id: s.exportId, member_id: s.memberId, helpdesk_ticket_id: s.ticketId },
    });
    expect(deliver.statusCode).toBe(404);
  });

  it('⛔ member-direct delivery is REFUSED when the member has no mobile on file', async () => {
    // ⭐ A CORRUPT-DATA BACKSTOP, NOT A SERVED CASE (Decision `2026-08-15-119`). ⛔ Note what this
    // test has to DO to reach the state: delete the member's identity row. That is the point — a
    // persisted member with no mobile is unreachable in production (one member writer, one first
    // event, identity written in the same scope-tx, both mobile columns NOT NULL, never deleted, and
    // RTBF retains the blind index). The assertion is that CORRUPT DATA fails closed and loudly
    // instead of minting a grant and returning 200 for a delivery that never happened.
    // ⚠ This was briefly escalated as a statutory gap (Escalation 12) and is WITHDRAWN on that
    // evidence. ⛔ The `DELETE` below is the fixture ADMITTING the state is fabricated — do not read it
    // as a supported scenario.
    const p = randomUUID();
    const a = await authenticate('Operator NoMobile');
    await grant(a.userId, p, 'pariwar_admin');
    await elevate(a.client);
    const s = await seedSubject(a.client, p);

    const c = await td.pool.connect();
    try {
      await c.query(`DELETE FROM member_identities WHERE member_id = $1`, [s.memberId]);
    } finally {
      c.release();
    }

    const res = await a.client.inject({
      method: 'POST',
      url: `${base(p)}/delivery/member-direct`,
      headers: { 'idempotency-key': randomUUID() },
      payload: { export_id: s.exportId, member_id: s.memberId, helpdesk_ticket_id: s.ticketId },
    });
    expect(res.statusCode).toBe(409);
    expect((res.json() as { error: { code: string } }).error.code).toBe(
      'member_data_rights.no_mobile_on_file',
    );

    // ⛔ AND NO GRANT ROW EXISTS. A 409 that still left a row would be the same defect wearing a
    // different status code.
    const c2 = await td.pool.connect();
    try {
      const { rows } = await c2.query(
        `SELECT count(*)::int AS n FROM data_export_delivery_grants WHERE member_id = $1`,
        [s.memberId],
      );
      expect(rows[0].n).toBe(0);
    } finally {
      c2.release();
    }
  });

  // ── Cross-cutting guards (AC3) ──────────────────────────────────────────────────────────────────

  /** Every mutating route on this surface, with a minimally-valid body. */
  function allMutatingRoutes(
    p: string,
    s: { memberId: string; exportId: string; ticketId: string },
  ): ReadonlyArray<{ readonly name: string; readonly url: string; readonly payload: Record<string, unknown> }> {
    return [
      { name: 'export', url: `${base(p)}/export`, payload: { member_id: s.memberId, helpdesk_ticket_id: s.ticketId } },
      { name: 'erasure', url: `${base(p)}/erasure`, payload: { member_id: s.memberId, helpdesk_ticket_id: s.ticketId } },
      {
        name: 'delivery/member-direct',
        url: `${base(p)}/delivery/member-direct`,
        payload: { export_id: s.exportId, member_id: s.memberId, helpdesk_ticket_id: s.ticketId },
      },
      {
        name: 'delivery/staff-mediated',
        url: `${base(p)}/delivery/staff-mediated`,
        payload: {
          export_id: s.exportId, member_id: s.memberId, helpdesk_ticket_id: s.ticketId,
          attestation: 'x',
        },
      },
      {
        name: 'correction',
        url: `${base(p)}/correction`,
        payload: {
          member_id: s.memberId, helpdesk_ticket_id: s.ticketId,
          requested_change: 'x', action_taken: 'y', outcome: 'recorded',
        },
      },
    ];
  }

  it('⛔ EVERY mutating route on this surface is step-up gated — an un-elevated admin is refused', async () => {
    // ⛔ THE TITLE IS NOW TRUE. It previously exercised ONE of the routes while claiming all of them —
    // so dropping `stepUp` from the `/erasure` preHandler chain, the IRREVERSIBLE one, would have left
    // this green while its name asserted the opposite.
    const p = randomUUID();
    const a = await authenticate('Operator NoStepUp');
    await grant(a.userId, p, 'pariwar_admin');
    // ⛔ Deliberately NOT elevated.
    const seeder = await authenticate('Seeder StepUp');
    await grant(seeder.userId, p, 'pariwar_admin');
    await elevate(seeder.client);
    const s = await seedSubject(seeder.client, p);

    for (const route of allMutatingRoutes(p, s)) {
      const res = await a.client.inject({
        method: 'POST',
        url: route.url,
        headers: { 'idempotency-key': randomUUID() },
        payload: route.payload,
      });
      expect(res.statusCode, `${route.name} must require step-up`).toBe(403);
      expect((res.json() as { error: { code: string } }).error.code).toBe('auth.step_up_required');
    }

    // The READ route is gated too.
    const read = await a.client.inject({
      method: 'GET',
      url: `${base(p)}/export/active?member_id=${s.memberId}`,
    });
    expect(read.statusCode).toBe(403);
  });

  it('⛔ an admin WITHOUT `member.data_rights` is refused on every mutating route', async () => {
    // `helpline_operator` FILES data-rights requests and may not EXECUTE them — "filing a request and
    // executing it on a member with no session are different authorities" (AC3). Nothing asserted it.
    const p = randomUUID();
    const a = await authenticate('Helpline Operator');
    await grant(a.userId, p, 'helpline_operator');
    const seeder = await authenticate('Seeder Perm');
    await grant(seeder.userId, p, 'pariwar_admin');
    await elevate(seeder.client);
    const s = await seedSubject(seeder.client, p);

    for (const route of allMutatingRoutes(p, s)) {
      const res = await a.client.inject({
        method: 'POST',
        url: route.url,
        headers: { 'idempotency-key': randomUUID() },
        payload: route.payload,
      });
      // 403 either way — the permission gate runs before the step-up gate.
      expect(res.statusCode, `${route.name} must refuse an operator without member.data_rights`).toBe(403);
    }
  });

  it('⛔ GENUINE cross-Pariwar denial — a ticket from Pariwar B cannot be used in Pariwar A', async () => {
    // ⛔ A SECOND REAL PARIWAR, not a same-tenant non-owner wearing the name (the Story 1.19 finding).
    // ⚠ This is the SOLE compensating control for migration 0103's deliberately TENANCY-BLIND
    // `helpdesk_ticket_id` FK — PostgreSQL referential integrity bypasses RLS, so the FK alone would
    // happily accept another tenant's ticket. `requireTicketInScope` is what refuses it, and nothing
    // exercised it.
    const pA = randomUUID();
    const pB = randomUUID();
    const a = await authenticate('Operator Tenant A');
    await grant(a.userId, pA, 'pariwar_admin');
    await elevate(a.client);
    const b = await authenticate('Operator Tenant B');
    await grant(b.userId, pB, 'pariwar_admin');
    await elevate(b.client);

    const sA = await seedSubject(a.client, pA);
    const sB = await seedSubject(b.client, pB);

    // A's own member, but B's ticket.
    const res = await a.client.inject({
      method: 'POST',
      url: `${base(pA)}/export`,
      headers: { 'idempotency-key': randomUUID() },
      payload: { member_id: sA.memberId, helpdesk_ticket_id: sB.ticketId },
    });
    expect(res.statusCode).toBe(404);

    // …and the symmetric case: B's member, under A's scope.
    const res2 = await a.client.inject({
      method: 'POST',
      url: `${base(pA)}/export`,
      headers: { 'idempotency-key': randomUUID() },
      payload: { member_id: sB.memberId, helpdesk_ticket_id: sA.ticketId },
    });
    expect(res2.statusCode).toBe(404);
  });

  it('⛔ a missing `users.display_name` BLOCKS the action — attribution is not optional here', async () => {
    // ⛔ Six sibling surfaces each carry this assertion; this surface — whose whole subject is a staff
    // actor exercising a member's statutory rights — was the one that skipped it. An unattributable act
    // here is not acceptable, and the check must fail closed BEFORE any row or audit line exists.
    const p = randomUUID();
    const a = await authenticate('Operator Nameless');
    await grant(a.userId, p, 'pariwar_admin');
    await elevate(a.client);
    const s = await seedSubject(a.client, p);

    const c = await td.pool.connect();
    try {
      await c.query(`UPDATE users SET display_name = NULL WHERE id = $1`, [a.userId]);
    } finally {
      c.release();
    }

    const res = await a.client.inject({
      method: 'POST',
      url: `${base(p)}/correction`,
      headers: { 'idempotency-key': randomUUID() },
      payload: {
        member_id: s.memberId, helpdesk_ticket_id: s.ticketId,
        requested_change: 'x', action_taken: 'y', outcome: 'recorded',
      },
    });
    expect(res.statusCode).toBeGreaterThanOrEqual(400);

    // ⛔ Nothing was recorded.
    const c2 = await td.pool.connect();
    try {
      const { rows } = await c2.query(
        `SELECT count(*)::int AS n FROM member_data_rights_corrections WHERE member_id = $1`,
        [s.memberId],
      );
      expect(rows[0].n).toBe(0);
    } finally {
      c2.release();
    }
  });


  it('⛔ AC5 — a member with a PENDING self-service export gets a typed 409, never a silent reuse', async () => {
    // ⛔ THE RULE IS STATED, NOT IMPROVISED. The member's own in-flight request is not the operator's to
    // discard, and reusing it would MISATTRIBUTE the build in every audit query filtering on
    // `requested_via`. So the collision is refused with a typed 409 naming it.
    // ⚠ 23505 rides `err.cause.code` as well as `err.code`; a direct-only check misses the wrapped case
    // (the defect that made the RTBF handler's catch inert). This is what proves the catch is live.
    const p = randomUUID();
    const a = await authenticate('Operator Collision');
    await grant(a.userId, p, 'pariwar_admin');
    await elevate(a.client);
    const s = await seedSubject(a.client, p, { status: 'pending' });

    const c = await td.pool.connect();
    try {
      // The member's own portal request, in flight.
      await c.query(`UPDATE data_exports SET requested_via = 'member_portal' WHERE export_id = $1`, [
        s.exportId,
      ]);
    } finally {
      c.release();
    }

    const res = await a.client.inject({
      method: 'POST',
      url: `${base(p)}/export`,
      headers: { 'idempotency-key': randomUUID() },
      payload: { member_id: s.memberId, helpdesk_ticket_id: s.ticketId },
    });
    expect(res.statusCode).toBe(409);
    expect((res.json() as { error: { code: string } }).error.code).toBe(
      'member_data_rights.export_already_pending',
    );

    // ⛔ And the member's own row is untouched — not reused, not cancelled.
    const c2 = await td.pool.connect();
    try {
      const { rows } = await c2.query(
        `SELECT requested_via, status FROM data_exports WHERE export_id = $1`,
        [s.exportId],
      );
      expect(rows[0].requested_via).toBe('member_portal');
      expect(rows[0].status).toBe('pending');
    } finally {
      c2.release();
    }
  });

  it('⭐ AC4 — the subject view is MEMBER-scoped, not ticket-scoped: two tickets, one export', async () => {
    // ⛔ AC4's minted clause. Every read on this surface keys on `member_id`, never on the ticket — a
    // member with two open data-rights tickets must not end up with two divergent subject views. This
    // proves it at the route: the same member, a DIFFERENT originating ticket, the SAME export.
    const p = randomUUID();
    const a = await authenticate('Operator TwoTickets');
    await grant(a.userId, p, 'pariwar_admin');
    await elevate(a.client);
    const s = await seedSubject(a.client, p);

    // A SECOND, independent data-rights ticket for the same member.
    const second = await a.client.inject({
      method: 'POST',
      url: `/api/v1/p/${p}/helpdesk/tickets`,
      payload: {
        subject_member_id: s.memberId,
        category: 'other',
        sub_category: DPDPA_DATA_RIGHTS_SUBCATEGORY,
        body: 'Member is chasing the same request through a second call.',
        created_via: 'helpline_call',
      },
    });
    expect(second.statusCode).toBe(201);
    const secondTicketId = (second.json() as { ticket_id: string }).ticket_id;
    expect(secondTicketId).not.toBe(s.ticketId);

    const viaFirst = await a.client.inject({
      method: 'POST',
      url: `${base(p)}/export`,
      headers: { 'idempotency-key': randomUUID() },
      payload: { member_id: s.memberId, helpdesk_ticket_id: s.ticketId },
    });
    const viaSecond = await a.client.inject({
      method: 'POST',
      url: `${base(p)}/export`,
      headers: { 'idempotency-key': randomUUID() },
      payload: { member_id: s.memberId, helpdesk_ticket_id: secondTicketId },
    });
    expect(viaFirst.statusCode).toBe(200);
    expect(viaSecond.statusCode).toBe(200);
    expect((viaFirst.json() as { export_id: string }).export_id).toBe(
      (viaSecond.json() as { export_id: string }).export_id,
    );

    // ⛔ ONE dossier row, not one per ticket.
    const c = await td.pool.connect();
    try {
      const { rows } = await c.query(`SELECT count(*)::int AS n FROM data_exports WHERE member_id = $1`, [
        s.memberId,
      ]);
      expect(rows[0].n).toBe(1);
    } finally {
      c.release();
    }
  });

});
