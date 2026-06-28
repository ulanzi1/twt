// Member-facing T&C read/accept E2E (live DB :5433) — Story 3.6a (Task 8; AC3).
//
// The SECOND consent-registry consumer (after Story 3.5 medical), copying its audit-or-throw chain.
// Drives the surface through `app.inject`:
//   · GET /member/terms → the current effective version (tcVersionId + precomputed HTML + effective
//     window); no effective T&C → 503 terms.unavailable.
//   · POST /member/terms/accept → ONE consent_records row (tc_acceptance, consent_artifact_ref =
//     tcVersionId, audit_id non-null pointing at a real chain line), inside the scope-tx.
//   · the highest-value test (mirrors 3.5 AC6): no-effective-T&C → GET 503 AND accept 409 with NO
//     partial writes (no consent, no orphan audit line — audit-or-throw atomicity).
//   · terminal-state member → 409; no token → 401.
//
// Member creation is exercised by signup-create.spec.ts; here the harness SEEDS a member (committed)
// + an approved/effective T&C version in the member's Pariwar (the per-Pariwar registry provisioning
// dependency R3 flags).

import { randomUUID } from 'node:crypto';

import { ids, member as memberDomain } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import { signAccessToken } from '../../../src/modules/auth/member/tokens.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { createTestApp, hasDatabase, teardown, type TestApp } from '../_setup.js';

type Json = Record<string, unknown>;
const ACCESS_TTL_MS = 15 * 60 * 1000;
const TC_HTML = '<h1>Terms</h1><p>The membership terms &amp; conditions.</p>';
const TC_MARKDOWN = '# Terms\n\nThe membership terms & conditions.';

/** Seed a member in `pending-kyc` (signup_initiated), committed. */
async function seedMember(t: TestApp): Promise<{ memberId: string; pariwarId: string }> {
  const memberId = randomUUID();
  const pariwarId = randomUUID();
  const scopeTx = await openScopeTx(t.deps, pariwarId);
  try {
    await memberDomain.projectMemberState(scopeTx.client, {
      memberId: ids.memberId(memberId),
      pariwarId: ids.pariwarId(pariwarId),
      eventType: 'member.signup_initiated',
      actorId: memberId,
      payload: { from_state: null, to_state: 'pending-kyc', trigger: 'signup', actor: 'member' },
    });
    await closeScopeTx(scopeTx, true);
  } catch (err) {
    await closeScopeTx(scopeTx, false);
    throw err;
  }
  return { memberId, pariwarId };
}

/** Seed a WITHDRAWN (terminal) member. */
async function seedWithdrawnMember(t: TestApp): Promise<{ memberId: string; pariwarId: string }> {
  const memberId = randomUUID();
  const pariwarId = randomUUID();
  const scopeTx = await openScopeTx(t.deps, pariwarId);
  const mid = ids.memberId(memberId);
  const pid = ids.pariwarId(pariwarId);
  try {
    await memberDomain.projectMemberState(scopeTx.client, {
      memberId: mid, pariwarId: pid, eventType: 'member.signup_initiated', actorId: memberId,
      payload: { from_state: null, to_state: 'pending-kyc', trigger: 'signup', actor: 'member' },
    });
    await memberDomain.projectMemberState(scopeTx.client, {
      memberId: mid, pariwarId: pid, eventType: 'member.kyc_manual_fallback', actorId: memberId,
      payload: { from_state: 'pending-kyc', to_state: 'pending-fee', trigger: 'kyc_manual', actor: 'member', reason: 'manual' },
    });
    await memberDomain.projectMemberState(scopeTx.client, {
      memberId: mid, pariwarId: pid, eventType: 'member.vyawastha_shulk_paid', actorId: memberId,
      payload: { from_state: 'pending-fee', to_state: 'lock-in', trigger: 'payment', actor: 'member', utr: 'T-0', amount_inr: 1000 },
    });
    await memberDomain.projectMemberState(scopeTx.client, {
      memberId: mid, pariwarId: pid, eventType: 'member.lock_in_expired', actorId: null,
      payload: { from_state: 'lock-in', to_state: 'active', trigger: 'lock_in_expiry', actor: 'system', kyc_verified: true },
    });
    await memberDomain.projectMemberState(scopeTx.client, {
      memberId: mid, pariwarId: pid, eventType: 'member.withdrawal_completed', actorId: memberId,
      payload: { from_state: 'active', to_state: 'withdrawn', trigger: 'withdrawal', actor: 'member' },
    });
    await closeScopeTx(scopeTx, true);
  } catch (err) {
    await closeScopeTx(scopeTx, false);
    throw err;
  }
  return { memberId, pariwarId };
}

/** Seed an approved + currently-effective T&C version in the Pariwar (committed; superuser bypass). */
async function seedEffectiveTc(t: TestApp, pariwarId: string): Promise<string> {
  const tcVersionId = randomUUID();
  await t.pool.query(
    `INSERT INTO terms_and_conditions_versions
       (tc_version_id, pariwar_id, version, body_markdown, body_html_rendered,
        effective_from, effective_until, legal_review_status, authored_at)
     VALUES ($1, $2, 1, $3, $4, now() - interval '1 day', NULL, 'approved', now() - interval '1 day')`,
    [tcVersionId, pariwarId, TC_MARKDOWN, TC_HTML],
  );
  return tcVersionId;
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
    method,
    url,
    payload: opts.payload,
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

async function consentRows(t: TestApp, memberId: string): Promise<Json[]> {
  const r = await t.pool.query<Json>(
    `SELECT consent_type, consent_artifact_ref, audit_id, consent_payload, granted_via_actor
       FROM consent_records WHERE subject_id = $1 AND consent_type = 'tc_acceptance'`,
    [memberId],
  );
  return r.rows;
}

async function acceptAuditCount(t: TestApp, memberId: string): Promise<number> {
  const r = await t.pool.query<{ n: number }>(
    `SELECT count(*)::int AS n FROM audit_log_entries
       WHERE actor_id = $1 AND action = 'member_terms.accepted'`,
    [memberId],
  );
  return r.rows[0]?.n ?? 0;
}

describe.skipIf(!hasDatabase)('Member T&C read/accept — E2E (:5433)', () => {
  it('AC3: GET returns the current effective T&C (precomputed HTML); accept records a tc_acceptance consent (audit-or-throw)', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedMember(t);
      const tcVersionId = await seedEffectiveTc(t, pariwarId);
      const tok = token(t, memberId, pariwarId);

      // GET → the effective version + the PRECOMPUTED HTML (server emits body_html_rendered verbatim).
      const get = await inject(t, 'GET', '/api/v1/member/terms?locale=en', { token: tok });
      expect(get.status).toBe(200);
      expect(get.body.tcVersionId).toBe(tcVersionId);
      expect(get.body.html).toBe(TC_HTML);
      expect(get.body.locale).toBe('en');

      // Accept → a clean ack; the server-resolved tcVersionId wins.
      const accept = await inject(t, 'POST', '/api/v1/member/terms/accept', {
        payload: { tcVersionId, locale: 'en' },
        token: tok,
      });
      expect(accept.status).toBe(200);
      expect(accept.body).toMatchObject({ accepted: true, tcVersionId });
      expect(String(accept.body.consentId)).toMatch(/^[0-9a-f-]{36}$/);

      // ONE consent_records row: tc_acceptance, ref = tcVersionId, member_self, audit_id non-null.
      const consents = await consentRows(t, memberId);
      expect(consents).toHaveLength(1);
      expect(consents[0]).toMatchObject({
        consent_type: 'tc_acceptance',
        consent_artifact_ref: tcVersionId,
        granted_via_actor: 'member_self',
      });
      expect(consents[0]?.audit_id).not.toBeNull();
      expect(JSON.stringify(consents[0]?.consent_payload)).toContain(tcVersionId);

      // The consent's audit_id points at a REAL chain line written by writeAuditEntry.
      const auditId = (consents[0] as { audit_id: string }).audit_id;
      const auditLine = await t.pool.query<{ action: string }>(
        `SELECT action FROM audit_log_entries WHERE audit_id = $1`,
        [auditId],
      );
      expect(auditLine.rows[0]?.action).toBe('member_terms.accepted');

      // The fire-and-forget audit fired.
      expect(t.auditSink.ofType('member_terms.accepted').length).toBeGreaterThanOrEqual(1);
    } finally {
      await teardown(t);
    }
  });

  it("AC3 (server resolves): a stale client tcVersionId is ignored — the consent records the server's effective version", async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedMember(t);
      const tcVersionId = await seedEffectiveTc(t, pariwarId);

      const accept = await inject(t, 'POST', '/api/v1/member/terms/accept', {
        payload: { tcVersionId: randomUUID(), locale: 'hi' }, // a stale/wrong client version
        token: token(t, memberId, pariwarId),
      });
      expect(accept.status).toBe(200);
      expect(accept.body.tcVersionId).toBe(tcVersionId); // server-resolved version wins
      const consents = await consentRows(t, memberId);
      expect(consents[0]?.consent_artifact_ref).toBe(tcVersionId);
    } finally {
      await teardown(t);
    }
  });

  it('AC3 atomicity (highest value): no effective T&C → GET 503 AND accept 409 with NO partial writes', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedMember(t);
      const tok = token(t, memberId, pariwarId);
      // No T&C version seeded for the Pariwar.

      const get = await inject(t, 'GET', '/api/v1/member/terms', { token: tok });
      expect(get.status).toBe(503);
      expect(String((get.body.error as Json)?.code)).toBe('terms.unavailable');

      const accept = await inject(t, 'POST', '/api/v1/member/terms/accept', {
        payload: { tcVersionId: randomUUID(), locale: 'en' },
        token: tok,
      });
      expect(accept.status).toBe(409);
      expect(String((accept.body.error as Json)?.code)).toBe('terms.unavailable');

      // NO partial writes — no consent AND no orphan audit line (the artifact resolves BEFORE the
      // audit write, so a missing T&C throws before any chain line is committed).
      expect(await consentRows(t, memberId)).toHaveLength(0);
      expect(await acceptAuditCount(t, memberId)).toBe(0);
    } finally {
      await teardown(t);
    }
  });

  it('rejects acceptance for a member in a terminal state (409)', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedWithdrawnMember(t);
      const tcVersionId = await seedEffectiveTc(t, pariwarId);

      const accept = await inject(t, 'POST', '/api/v1/member/terms/accept', {
        payload: { tcVersionId, locale: 'en' },
        token: token(t, memberId, pariwarId),
      });
      expect(accept.status).toBe(409);
      expect(String((accept.body.error as Json)?.code)).toBe('terms.member_terminal');
      expect(await consentRows(t, memberId)).toHaveLength(0);
    } finally {
      await teardown(t);
    }
  });

  it('requires a member session (401 without a token)', async () => {
    const t = await createTestApp();
    try {
      const get = await inject(t, 'GET', '/api/v1/member/terms');
      expect(get.status).toBe(401);
      const accept = await inject(t, 'POST', '/api/v1/member/terms/accept', {
        payload: { tcVersionId: randomUUID(), locale: 'en' },
      });
      expect(accept.status).toBe(401);
    } finally {
      await teardown(t);
    }
  });
});
