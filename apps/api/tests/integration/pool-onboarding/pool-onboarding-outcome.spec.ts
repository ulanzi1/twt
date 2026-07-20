// Pool-onboarding tutorial outcome E2E (live DB :5433) — Story 7.10 (Task 5; AC4).
//
// Drives POST /api/v1/member/pool-onboarding-tutorial through `app.inject` and asserts:
//   · completed → 204 + ONE member.pool_onboarding_tutorial_completed audit line (correct resourceLocator,
//     non-PII request_payload_hash === sha256({outcome}), response_status 204).
//   · skipped   → 204 + ONE member.pool_onboarding_tutorial_skipped audit line.
//   · an unknown outcome → 400 (contract rejects), NO audit line written.
//   · no token → 401 (member-session-gated).
//
// writeAuditEntry commits on its OWN service-pool tx (NOT rolled back by the harness), and the global
// chain accumulates rows across tests — so we assert MEMBERSHIP for a per-test random member id, never a
// global count ([[project_live_db_test_gotchas]]).

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { poolOnboardingAuditPayloadHash } from '../../../src/modules/pool-onboarding/handlers.js';
import { signAccessToken } from '../../../src/modules/auth/member/tokens.js';
import { createTestApp, hasDatabase, teardown, type TestApp } from '../_setup.js';

const ACCESS_TTL_MS = 15 * 60 * 1000;
type Json = Record<string, unknown>;

function token(t: TestApp, memberId: string, pariwarId: string): string {
  return signAccessToken(t.app, { memberId, pariwarId, deviceId: 'test-device' }, ACCESS_TTL_MS);
}

async function inject(
  t: TestApp,
  opts: { payload?: Json; token?: string } = {},
): Promise<{ status: number; body: Json }> {
  const res = await t.app.inject({
    method: 'POST',
    url: '/api/v1/member/pool-onboarding-tutorial',
    payload: opts.payload,
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

async function auditLinesForActor(t: TestApp, actorId: string): Promise<Json[]> {
  const r = await t.pool.query<Json>(
    `SELECT action, resource_locator, request_payload_hash, response_status
       FROM audit_log_entries WHERE actor_id = $1 ORDER BY seq`,
    [actorId],
  );
  return r.rows;
}

describe.skipIf(!hasDatabase)('Pool-onboarding tutorial outcome — E2E (:5433)', () => {
  it('AC4: completed → 204 + one completion audit line (non-PII hash, correct locator)', async () => {
    const t = await createTestApp();
    try {
      const memberId = randomUUID();
      const pariwarId = randomUUID();

      const res = await inject(t, { payload: { outcome: 'completed' }, token: token(t, memberId, pariwarId) });
      expect(res.status).toBe(204);

      const lines = await auditLinesForActor(t, memberId);
      expect(lines).toHaveLength(1);
      expect(lines[0]).toMatchObject({
        action: 'member.pool_onboarding_tutorial_completed',
        resource_locator: `pariwar/${pariwarId}/member/${memberId}/pool-onboarding-tutorial`,
        request_payload_hash: poolOnboardingAuditPayloadHash({ outcome: 'completed' }),
        response_status: 204,
      });
    } finally {
      await teardown(t);
    }
  });

  it('AC4: skipped → 204 + one skip audit line (distinct action from completion)', async () => {
    const t = await createTestApp();
    try {
      const memberId = randomUUID();
      const pariwarId = randomUUID();

      const res = await inject(t, { payload: { outcome: 'skipped' }, token: token(t, memberId, pariwarId) });
      expect(res.status).toBe(204);

      const lines = await auditLinesForActor(t, memberId);
      expect(lines).toHaveLength(1);
      expect(lines[0]).toMatchObject({
        action: 'member.pool_onboarding_tutorial_skipped',
        resource_locator: `pariwar/${pariwarId}/member/${memberId}/pool-onboarding-tutorial`,
        request_payload_hash: poolOnboardingAuditPayloadHash({ outcome: 'skipped' }),
        response_status: 204,
      });
    } finally {
      await teardown(t);
    }
  });

  it('rejects an unknown outcome (400) with NO audit line written', async () => {
    const t = await createTestApp();
    try {
      const memberId = randomUUID();
      const pariwarId = randomUUID();

      const res = await inject(t, { payload: { outcome: 'dismissed' }, token: token(t, memberId, pariwarId) });
      expect(res.status).toBe(400);
      expect(await auditLinesForActor(t, memberId)).toHaveLength(0);
    } finally {
      await teardown(t);
    }
  });

  it('requires a member session (401 without a token)', async () => {
    const t = await createTestApp();
    try {
      const res = await inject(t, { payload: { outcome: 'completed' } });
      expect(res.status).toBe(401);
    } finally {
      await teardown(t);
    }
  });
});
