// Real SMS-DLT step-up / login OTP delivery — integration (Story 5.9, AC1/AC3; Task 6). DB-gated
// (twt-test-pg :5433); skips without DATABASE_URL.
//
// Wires the REAL `createSmsDltStepUpDelivery` adapter (with a FAKE gateway — no network) into the member
// `stepUpDelivery` seam and drives the two member call sites end-to-end:
//   · login-OTP request      → gateway receives the login template + code; member_login.otp_send carries
//                              otp_audit_tag + delivery_channel:'sms' + delivery_status:'accepted'.
//   · step-up request+verify → the member's Tier-1 mobile is DECRYPTED to the recipient; member_step_up.send
//                              carries the delivery metadata; the consume carries the MATCHING otp_audit_tag.
//   · a gateway REJECT       → member_step_up.failure (reason:'otp_delivery_failed') fires + a retriable
//                              error propagates (the member is NOT told sent:true).
// Assert membership/behavior, not raw counts (own-committing writers accumulate — [[project_live_db_test_gotchas]]).

import { randomInt, randomUUID } from 'node:crypto';

import type { SmsGatewayMessage, SmsMessagingHandle } from '@twt/channels';
import { describe, expect, it } from 'vitest';

import type { AppDeps } from '../../src/context.js';
import { createSmsDltStepUpDelivery } from '../../src/modules/auth/shared/sms-step-up-delivery.js';
import { SmsSendError } from '@twt/channels';
import { encryptMobile, mobileBlindIndex, normalizeMobile } from '../../src/modules/auth/shared/mobile-index.js';
import { buildServer } from '../../src/server.js';
import { buildTestDeps, hasDatabase, type CapturingAuditSink } from './_setup.js';

type Json = Record<string, unknown>;

const BASE = '/api/v1/member/auth';

/** A fake gateway handle: records sends; can be primed to reject the next send. */
class FakeGateway implements SmsMessagingHandle {
  public readonly sent: SmsGatewayMessage[] = [];
  public failWith: unknown = null;
  public async send(message: SmsGatewayMessage): Promise<string> {
    if (this.failWith) {
      const e = this.failWith;
      throw e;
    }
    this.sent.push(message);
    return `gw-${this.sent.length}`;
  }
  public get last(): SmsGatewayMessage | undefined {
    return this.sent.at(-1);
  }
}

/** A crypto-random 10-digit Indian mobile core (mirrors `randomUUID()`'s collision safety — Story 5.9 review). */
function randomMobile(): string {
  return `${randomInt(6, 10)}${randomInt(0, 1_000_000_000).toString().padStart(9, '0')}`;
}

/** Build a server whose MEMBER `stepUpDelivery` is the real SMS-DLT adapter over a fake gateway. */
function buildRealAdapterDeps(gateway: SmsMessagingHandle): {
  deps: AppDeps;
  audit: CapturingAuditSink;
  pool: AppDeps['pool'];
} {
  const td = buildTestDeps();
  const realAdapter = createSmsDltStepUpDelivery({
    messaging: gateway,
    db: td.deps.serviceDb,
    encryption: td.deps.encryption,
    resolveConfig: async (k: string) => `TRAI::${k}`,
  });
  return { deps: { ...td.deps, stepUpDelivery: realAdapter }, audit: td.auditSink, pool: td.pool };
}

async function seedMember(
  deps: AppDeps,
  pool: AppDeps['pool'],
  mobile: string,
): Promise<{ memberId: string; pariwarId: string }> {
  const memberId = randomUUID();
  const pariwarId = randomUUID();
  const blindIndex = await mobileBlindIndex(mobile, deps.encryption);
  const ciphertext = await encryptMobile(normalizeMobile(mobile) as string, deps.encryption);
  await pool.query(
    `INSERT INTO pariwar_passport
       (pariwar_id, display_name_en, display_name_hi, legal_name, branding_bundle, locale_default)
       VALUES ($1, $2, $2, $3, $4, 'hi') ON CONFLICT (pariwar_id) DO NOTHING`,
    [pariwarId, 'Test Pariwar', 'Test Trust', JSON.stringify({ logo_url: 'https://x/l.png', primary_color: '#0A3D62', secondary_color: '#FFFFFF' })],
  );
  await pool.query(
    `INSERT INTO members (member_id, pariwar_id, state, state_event_version) VALUES ($1, $2, 'active', 1)`,
    [memberId, pariwarId],
  );
  await pool.query(
    `INSERT INTO member_identities (member_id, pariwar_id, mobile_ciphertext, mobile_blind_index)
       VALUES ($1, $2, $3, $4)`,
    [memberId, pariwarId, ciphertext, blindIndex],
  );
  return { memberId, pariwarId };
}

async function post(
  app: Awaited<ReturnType<typeof buildServer>>,
  url: string,
  payload: Json,
  token?: string,
): Promise<{ status: number; body: Json }> {
  const res = await app.inject({
    method: 'POST',
    url,
    payload,
    headers: { origin: 'http://localhost:3001', ...(token ? { authorization: `Bearer ${token}` } : {}) },
  });
  let body: Json = {};
  try {
    body = res.json();
  } catch {
    body = {};
  }
  return { status: res.statusCode, body };
}

describe.skipIf(!hasDatabase)('SMS-DLT OTP delivery (Story 5.9, DB)', () => {
  it('login-OTP request → gateway sends the login template + code; send audit carries delivery metadata', async () => {
    const gw = new FakeGateway();
    const { deps, audit, pool } = buildRealAdapterDeps(gw);
    const app = await buildServer(deps);
    try {
      const mobile = randomMobile();
      await seedMember(deps, pool, mobile);
      const canonical = normalizeMobile(mobile) as string;

      const r = await post(app, `${BASE}/otp/request`, { mobile });
      expect(r.status).toBe(200);
      expect(r.body.sent).toBe(true);

      // Gateway received the login OTP send to the canonical E.164, with the code in the body.
      expect(gw.last?.to).toBe(canonical);
      expect(gw.last?.dltTemplateId).toBe('TRAI::sms.dlt.template_id.otp_login');
      expect(gw.last?.body).toContain('login code');

      // The send audit records HOW it was delivered (Task 3) + the HMAC tag (never the code).
      const send = audit.ofType('member_login.otp_send').at(-1);
      expect(send?.context?.['delivery_channel']).toBe('sms');
      expect(send?.context?.['delivery_status']).toBe('accepted');
      expect(typeof send?.context?.['otp_audit_tag']).toBe('string');
      // The plaintext code never appears in the audit trail.
      expect(JSON.stringify(audit.events)).not.toContain(gw.last?.body?.slice(0, 6) ?? 'NO_CODE');
    } finally {
      await app.close();
      await pool.end().catch(() => undefined);
    }
  });

  it('step-up request decrypts the member mobile; send+consume link via the matching otp_audit_tag', async () => {
    const gw = new FakeGateway();
    const { deps, audit, pool } = buildRealAdapterDeps(gw);
    const app = await buildServer(deps);
    try {
      const mobile = randomMobile();
      await seedMember(deps, pool, mobile);
      const canonical = normalizeMobile(mobile) as string;

      // Login to get an authenticated member session.
      await post(app, `${BASE}/otp/request`, { mobile });
      const loginCode = codeFromBody(gw.last);
      const login = await post(app, `${BASE}/otp/verify`, { mobile, otp: loginCode, deviceId: 'd' });
      const access = login.body.accessToken as string;
      expect(access).toBeTruthy();

      // Step-up request → the adapter decrypts the member's Tier-1 mobile to the recipient.
      const sreq = await post(app, `${BASE}/step-up/request`, { actionContext: 'member.demo' }, access);
      expect(sreq.status).toBe(200);
      expect(gw.last?.to).toBe(canonical);
      expect(gw.last?.dltTemplateId).toBe('TRAI::sms.dlt.template_id.otp_step_up');

      const send = audit.ofType('member_step_up.send').at(-1);
      expect(send?.context?.['delivery_channel']).toBe('sms');
      expect(send?.context?.['delivery_status']).toBe('accepted');
      const sendTag = send?.context?.['otp_audit_tag'];
      expect(typeof sendTag).toBe('string');

      // Verify → the consume carries the MATCHING HMAC tag (send↔consume linkage).
      const stepCode = codeFromBody(gw.last);
      const sver = await post(app, `${BASE}/step-up/verify`, { otp: stepCode }, access);
      expect(sver.status).toBe(200);
      const consume = audit.ofType('member_step_up.consume').at(-1);
      expect(consume?.context?.['otp_audit_tag']).toBe(sendTag);
    } finally {
      await app.close();
      await pool.end().catch(() => undefined);
    }
  });

  it('a gateway reject on step-up → failure audit + retriable error (member is NOT told sent:true)', async () => {
    const gw = new FakeGateway();
    const { deps, audit, pool } = buildRealAdapterDeps(gw);
    const app = await buildServer(deps);
    try {
      const mobile = randomMobile();
      await seedMember(deps, pool, mobile);

      await post(app, `${BASE}/otp/request`, { mobile });
      const loginCode = codeFromBody(gw.last);
      const login = await post(app, `${BASE}/otp/verify`, { mobile, otp: loginCode, deviceId: 'd' });
      const access = login.body.accessToken as string;

      // Prime the gateway to reject the next send.
      gw.failWith = new SmsSendError('carrier said no', 'CARRIER_REJECT', 400);
      const sreq = await post(app, `${BASE}/step-up/request`, { actionContext: 'member.demo' }, access);
      // Retriable error — NOT a { sent: true } success.
      expect(sreq.status).toBeGreaterThanOrEqual(500);
      expect(sreq.body.sent).toBeUndefined();

      const failure = audit.ofType('member_step_up.failure').at(-1);
      expect(failure?.context?.['reason']).toBe('otp_delivery_failed');
    } finally {
      await app.close();
      await pool.end().catch(() => undefined);
    }
  });
});

/** Extract the 6-digit code the fake gateway received in the OTP body (tests only). */
function codeFromBody(message: SmsGatewayMessage | undefined): string {
  const m = message?.body.match(/\b(\d{6})\b/);
  if (!m) throw new Error('no 6-digit code found in gateway body');
  return m[1] as string;
}
