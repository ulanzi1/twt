// Member WhatsApp opt-in surface — E2E (live DB :5433) — Story 5.4 (Task 6; AC1/AC4).
//
// Drives the member-session-gated opt-in routes through app.inject:
//   · POST mint → 200 { state: PENDING, deepLink, verificationPhrase }; a re-tap re-uses the SAME PENDING.
//   · GET status → reflects PENDING (with deep-link) / null (never opted in).
//   · DELETE revoke → 409 when there is no ACTIVE opt-in (nothing to revoke).
//   · channel unavailable (WA disabled / no number) → 409, no PENDING minted.
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
  method: 'GET' | 'POST' | 'DELETE',
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

/** Seed a member (committed) + its member_identities row with a known blind index + a WA config row. */
async function seedMemberWithConfig(
  t: TestApp,
  opts: { enabled?: boolean; displayNumber?: string | null } = {},
): Promise<{ memberId: string; pariwarId: string }> {
  const memberId = randomUUID();
  const pariwarId = randomUUID();
  const scopeTx = await openScopeTx(t.deps, pariwarId);
  try {
    const mid = ids.memberId(memberId);
    const pid = ids.pariwarId(pariwarId);
    await memberDomain.projectMemberState(scopeTx.client, {
      memberId: mid,
      pariwarId: pid,
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
      `INSERT INTO member_identities (member_id, pariwar_id, mobile_ciphertext, mobile_blind_index)
         VALUES ($1, $2, 'enc:v1:dummy', $3)`,
      [memberId, pariwarId, `blind-${memberId}`],
    );
    await c.query(
      `INSERT INTO pariwar_wa_config (pariwar_id, enabled, display_phone_number)
         VALUES ($1, $2, $3)`,
      [
        pariwarId,
        opts.enabled ?? true,
        opts.displayNumber === undefined ? '+91 98765 43210' : opts.displayNumber,
      ],
    );
  } finally {
    c.release();
  }
  return { memberId, pariwarId };
}

describe.skipIf(!hasDatabase)('Member WhatsApp opt-in — E2E (:5433)', () => {
  it('no member session ⇒ 401', async () => {
    const t = await createTestApp();
    try {
      const res = await inject(t, 'POST', '/api/v1/member/wa-opt-in');
      expect(res.status).toBe(401);
    } finally {
      await teardown(t);
    }
  });

  it('POST mints a PENDING with a deep-link; a re-tap re-uses the same PENDING; GET reflects it', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedMemberWithConfig(t);
      const tok = token(t, memberId, pariwarId);

      const first = await inject(t, 'POST', '/api/v1/member/wa-opt-in', { token: tok });
      expect(first.status).toBe(200);
      expect(first.body.state).toBe('PENDING');
      expect(String(first.body.deepLink)).toContain('https://wa.me/919876543210?text=');
      expect(String(first.body.verificationPhrase)).toMatch(/^TWT-/);

      // Re-tap → SAME PENDING (no duplicate).
      const second = await inject(t, 'POST', '/api/v1/member/wa-opt-in', { token: tok });
      expect(second.status).toBe(200);
      expect(second.body.verificationPhrase).toBe(first.body.verificationPhrase);

      const status = await inject(t, 'GET', '/api/v1/member/wa-opt-in', { token: tok });
      expect(status.status).toBe(200);
      expect(status.body.state).toBe('PENDING');
      expect(status.body.verificationPhrase).toBe(first.body.verificationPhrase);
    } finally {
      await teardown(t);
    }
  });

  it('DELETE with no ACTIVE opt-in ⇒ 409 (nothing to revoke)', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedMemberWithConfig(t);
      const tok = token(t, memberId, pariwarId);
      await inject(t, 'POST', '/api/v1/member/wa-opt-in', { token: tok }); // PENDING, not ACTIVE
      const res = await inject(t, 'DELETE', '/api/v1/member/wa-opt-in', { token: tok });
      expect(res.status).toBe(409);
    } finally {
      await teardown(t);
    }
  });

  it('WA disabled ⇒ POST 409 (channel unavailable); no PENDING minted', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedMemberWithConfig(t, { enabled: false });
      const tok = token(t, memberId, pariwarId);
      const res = await inject(t, 'POST', '/api/v1/member/wa-opt-in', { token: tok });
      expect(res.status).toBe(409);

      const status = await inject(t, 'GET', '/api/v1/member/wa-opt-in', { token: tok });
      expect(status.body.state).toBeNull();
    } finally {
      await teardown(t);
    }
  });
});
