// Member Telegram opt-in surface — E2E (live DB :5433) — Story 5.5 (Task 6/11; AC4/AC10).
//
// Drives the member-session-gated opt-in routes through app.inject:
//   · POST mint → 200 { state: PENDING, deepLink }; a re-tap re-uses the SAME PENDING (same code in the link).
//   · GET status → reflects PENDING (with deep-link) / null (never opted in).
//   · POST revoke → 409 when there is no ACTIVE opt-in (nothing to revoke).
//   · channel unavailable (Telegram disabled / no bot) → 409, no PENDING minted.
//   · fail-closed — no member session ⇒ 401.

import { randomUUID } from 'node:crypto';

import { ids, member as memberDomain } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import { signAccessToken } from '../../../src/modules/auth/member/tokens.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { createTestApp, hasDatabase, teardown, type TestApp } from '../_setup.js';

const ACCESS_TTL_MS = 15 * 60 * 1000;
type Json = Record<string, unknown>;

function token(t: TestApp, memberId: string, pariwarId: string): string {
  return signAccessToken(t.app, { memberId, pariwarId, deviceId: 'test-device' }, ACCESS_TTL_MS);
}

async function inject(
  t: TestApp,
  method: 'GET' | 'POST',
  url: string,
  opts: { token?: string } = {},
): Promise<{ status: number; body: Json }> {
  const res = await t.app.inject({
    method,
    url,
    headers: {
      origin: 'http://localhost:3001',
      ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}),
    },
  });
  let body: Json = {};
  try {
    body = res.json();
  } catch {
    body = {};
  }
  return { status: res.statusCode, body };
}

/** Seed a member (committed) + a Telegram config row. No member_identities needed (Telegram shares no phone). */
async function seedMemberWithConfig(
  t: TestApp,
  opts: { enabled?: boolean; botUsername?: string | null } = {},
): Promise<{ memberId: string; pariwarId: string }> {
  const memberId = randomUUID();
  const pariwarId = randomUUID();
  const scopeTx = await openScopeTx(t.deps, pariwarId);
  try {
    await memberDomain.projectMemberState(scopeTx.client, {
      memberId: ids.memberId(memberId),
      pariwarId: ids.pariwarId(pariwarId),
      eventType: 'member.signup_initiated',
      payload: { from_state: null, to_state: 'pending-kyc', trigger: 'signup', actor: 'member' },
      actorId: memberId,
    });
    await closeScopeTx(scopeTx, true);
  } catch (err) {
    await closeScopeTx(scopeTx, false);
    throw err;
  }

  const c = await t.deps.pool.connect();
  try {
    await c.query(
      `INSERT INTO pariwar_telegram_config (pariwar_id, enabled, bot_username)
         VALUES ($1, $2, $3)`,
      [
        pariwarId,
        opts.enabled ?? true,
        opts.botUsername === undefined ? 'twt_pariwar_bot' : opts.botUsername,
      ],
    );
  } finally {
    c.release();
  }
  return { memberId, pariwarId };
}

describe.skipIf(!hasDatabase)('Member Telegram opt-in — E2E (:5433)', () => {
  it('no member session ⇒ 401', async () => {
    const t = await createTestApp();
    try {
      const res = await inject(t, 'POST', '/api/v1/member/telegram-opt-in');
      expect(res.status).toBe(401);
    } finally {
      await teardown(t);
    }
  });

  it('POST mints a PENDING with a t.me deep-link; a re-tap re-uses the same PENDING; GET reflects it', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedMemberWithConfig(t);
      const tok = token(t, memberId, pariwarId);

      const first = await inject(t, 'POST', '/api/v1/member/telegram-opt-in', { token: tok });
      expect(first.status).toBe(200);
      expect(first.body.state).toBe('PENDING');
      expect(String(first.body.deepLink)).toContain('https://t.me/twt_pariwar_bot?start=TWT-');

      // Re-tap → SAME PENDING (same code in the deep-link).
      const second = await inject(t, 'POST', '/api/v1/member/telegram-opt-in', { token: tok });
      expect(second.status).toBe(200);
      expect(second.body.deepLink).toBe(first.body.deepLink);

      const status = await inject(t, 'GET', '/api/v1/member/telegram-opt-in', { token: tok });
      expect(status.status).toBe(200);
      expect(status.body.state).toBe('PENDING');
      expect(status.body.deepLink).toBe(first.body.deepLink);
    } finally {
      await teardown(t);
    }
  });

  it('POST revoke with no ACTIVE opt-in ⇒ 409 (nothing to revoke)', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedMemberWithConfig(t);
      const tok = token(t, memberId, pariwarId);
      await inject(t, 'POST', '/api/v1/member/telegram-opt-in', { token: tok }); // PENDING, not ACTIVE
      const res = await inject(t, 'POST', '/api/v1/member/telegram-opt-in/revoke', { token: tok });
      expect(res.status).toBe(409);
    } finally {
      await teardown(t);
    }
  });

  it('Telegram disabled ⇒ POST 409 (channel unavailable); no PENDING minted', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedMemberWithConfig(t, { enabled: false });
      const tok = token(t, memberId, pariwarId);
      const res = await inject(t, 'POST', '/api/v1/member/telegram-opt-in', { token: tok });
      expect(res.status).toBe(409);

      const status = await inject(t, 'GET', '/api/v1/member/telegram-opt-in', { token: tok });
      expect(status.body.state).toBeNull();
    } finally {
      await teardown(t);
    }
  });
});
