// Member WhatsApp opt-in surface — E2E (live DB :5433) — Story 5.4 (Task 6; AC1/AC4).
//
// Drives the member-session-gated opt-in routes through app.inject:
//   · POST mint → 200 { state: PENDING, deepLink, verificationPhrase }; a re-tap re-uses the SAME PENDING.
//   · GET status → reflects PENDING (with deep-link) / null (never opted in).
//   · DELETE revoke → 409 only when there is NOTHING to end (Story 5.12, LY7: ⛔ ACTIVE row, ⛔ open consent).
//   · Story 5.12 (`-364` conditions 3 + 4; AC3, AC5) — DELETE ends EVERY yes (a legacy yes + a re-opt-in ⇒ ⛔ open consent, ONE
//     audit line on both rows); a legacy EXPIRED-with-consent ⇒ 200, state unchanged; POST refuses ANY ACTIVE row; the lost-race
//     arm ⇒ 409 + a compensating `_rolled_back` line.
//   · channel unavailable (WA disabled / no number) → 409, no PENDING minted.
//   · fail-closed — no member session ⇒ 401.

import { randomUUID } from 'node:crypto';

import { consent, ids, member as memberDomain, waOptIn } from '@twt/domain';
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

  // 2026-10-21 Story 5.12 (LY7) — re-titled: still 409 (a PENDING is ⛔ a yes — nothing to end).
  it('DELETE with only a PENDING (nothing to end: ⛔ ACTIVE row, ⛔ open consent) ⇒ 409', async () => {
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

// ── Story 5.12 — a yes lasts until withdrawn; a withdrawal ends EVERY yes (AC3, AC5; LY4, LY5, LY7) ─────────────────────────────

const SKIP_PREFIX = 't512_skip_';

/** A legacy yes: an open consent granted two days ago + an EXPIRED row carrying it — INSERTed (⛔ UPDATE: the LY4 trigger — T8). */
async function seedLegacyYes(t: TestApp, pariwarId: string, memberId: string): Promise<void> {
  const consentId = randomUUID();
  await t.deps.pool.query(
    `INSERT INTO consent_records (consent_id, subject_id, pariwar_id, consent_type, granted_at, granted_via_actor, consent_payload)
     VALUES ($1, $2, $3, 'whatsapp_opt_in', now() - interval '2 days', 'member_self', '{}'::jsonb)`,
    [consentId, memberId, pariwarId],
  );
  await t.deps.pool.query(
    `INSERT INTO member_wa_opt_in (pariwar_id, member_id, state, verification_phrase, mobile_blind_index, window_expires_at, consent_id,
                                   matched_at, created_at, updated_at)
     VALUES ($1, $2, 'EXPIRED_24H_WINDOW', $3, $4, now() - interval '1 day', $5, now() - interval '2 days', now() - interval '2 days',
             now() - interval '1 day')`,
    [pariwarId, memberId, waOptIn.generateVerificationPhrase(), `blind-${memberId}`, consentId],
  );
}

/** Opt in through the real mint (POST), then the worker's match writes (recordConsent + activateOptIn) on a scope tx. */
async function optInThroughMint(t: TestApp, memberId: string, pariwarId: string, tok: string): Promise<string> {
  const minted = await inject(t, 'POST', '/api/v1/member/wa-opt-in', { token: tok });
  expect(minted.status).toBe(200);
  const scopeTx = await openScopeTx(t.deps, pariwarId);
  try {
    const pid = ids.pariwarId(pariwarId);
    const pending = await waOptIn.getOptInForMember(scopeTx.tx, { pariwarId: pid, memberId: ids.memberId(memberId) });
    const consentId = ids.consentId(randomUUID());
    await consent.recordConsent(scopeTx.tx, {
      pariwarId: pid,
      subjectId: memberId,
      consentType: 'whatsapp_opt_in',
      grantedViaActor: 'member_self',
      consentPayload: { source: 'meta_webhook_inbound' },
      consentId,
    });
    await waOptIn.activateOptIn(scopeTx.tx, {
      pariwarId: pid,
      optInId: pending!.optInId,
      windowExpiresAt: new Date(Date.now() + 24 * 3600 * 1000),
      consentId,
    });
    await closeScopeTx(scopeTx, true);
    return pending!.optInId;
  } catch (err) {
    await closeScopeTx(scopeTx, false);
    throw err;
  }
}

const stateOf = async (t: TestApp, optInId: string) =>
  (await t.deps.pool.query<{ state: string }>(`SELECT state FROM member_wa_opt_in WHERE opt_in_id = $1`, [optInId])).rows[0]!.state;
const consentRows = async (t: TestApp, pariwarId: string, memberId: string) =>
  (
    await t.deps.pool.query<{ revoked_at: Date | null; revoked_audit_id: string | null }>(
      `SELECT revoked_at, revoked_audit_id FROM consent_records WHERE pariwar_id = $1 AND subject_id = $2 AND consent_type = 'whatsapp_opt_in' ORDER BY granted_at`,
      [pariwarId, memberId],
    )
  ).rows;
const auditIds = async (t: TestApp, pariwarId: string, action: string) =>
  (
    await t.deps.pool.query<{ audit_id: string }>(`SELECT audit_id FROM audit_log_entries WHERE pariwar_id = $1 AND action = $2 ORDER BY seq`, [
      pariwarId,
      action,
    ])
  ).rows.map((r) => r.audit_id);

describe.skipIf(!hasDatabase)('Story 5.12 — member WhatsApp withdrawal ends every yes (:5433)', () => {
  it('⭐ AC3 / AC5 — legacy yes + a re-opt-in, then DELETE ⇒ 200 REVOKED; ⛔ open consent, ⛔ yes; ONE audit line, its id on BOTH rows', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedMemberWithConfig(t);
      const tok = token(t, memberId, pariwarId);
      await seedLegacyYes(t, pariwarId, memberId);
      const optInId = await optInThroughMint(t, memberId, pariwarId, tok);

      const res = await inject(t, 'DELETE', '/api/v1/member/wa-opt-in', { token: tok });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ state: 'REVOKED' });

      expect(await stateOf(t, optInId)).toBe('REVOKED');
      const lines = await auditIds(t, pariwarId, 'member.wa_opt_in_revoked');
      expect(lines).toHaveLength(1);
      const rows = await consentRows(t, pariwarId, memberId);
      expect(rows).toHaveLength(2);
      for (const row of rows) {
        expect(row.revoked_at).not.toBeNull();
        expect(row.revoked_audit_id).toBe(lines[0]);
      }
      const pid = ids.pariwarId(pariwarId);
      const mid = ids.memberId(memberId);
      expect(await consent.consentExists(t.deps.db, pid, mid, 'whatsapp_opt_in')).toBe(false);
      expect(await waOptIn.isPeerMeshWaReminderOptedIn(t.deps.db, { pariwarId: pid, memberId: mid })).toBe(false);
      expect(await waOptIn.isOptInActive(t.deps.db, { pariwarId: pid, memberId: mid })).toBe(false);
    } finally {
      await teardown(t);
    }
  });

  it('⭐ AC5 — newest row EXPIRED with an open consent ⇒ 200 { state: EXPIRED_24H_WINDOW } and the consent closed', async () => {
    const t = await createTestApp();
    try {
      const { memberId, pariwarId } = await seedMemberWithConfig(t);
      const tok = token(t, memberId, pariwarId);
      await seedLegacyYes(t, pariwarId, memberId);
      const res = await inject(t, 'DELETE', '/api/v1/member/wa-opt-in', { token: tok });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ state: 'EXPIRED_24H_WINDOW' });
      expect((await consentRows(t, pariwarId, memberId)).map((r) => r.revoked_at !== null)).toEqual([true]);
      // Nothing left to end ⇒ a second DELETE is the 409.
      expect((await inject(t, 'DELETE', '/api/v1/member/wa-opt-in', { token: tok })).status).toBe(409);
    } finally {
      await teardown(t);
    }
  });

  it('⭐ AC5 / LY4 — POST with ANY ACTIVE row ⇒ 409 already_active: an ACTIVE row past its window, and an ACTIVE row that is ⛔ the newest', async () => {
    const t = await createTestApp();
    try {
      const pastWindow = await seedMemberWithConfig(t);
      await t.deps.pool.query(
        `INSERT INTO member_wa_opt_in (pariwar_id, member_id, state, verification_phrase, mobile_blind_index, window_expires_at, matched_at)
         VALUES ($1, $2, 'ACTIVE', $3, $4, now() - interval '7 days', now() - interval '8 days')`,
        [pastWindow.pariwarId, pastWindow.memberId, waOptIn.generateVerificationPhrase(), `blind-${pastWindow.memberId}`],
      );
      const r1 = await inject(t, 'POST', '/api/v1/member/wa-opt-in', { token: token(t, pastWindow.memberId, pastWindow.pariwarId) });
      expect(r1.status).toBe(409);
      expect((r1.body.error as Json).code).toBe('wa_opt_in.already_active');

      const notNewest = await seedMemberWithConfig(t);
      await t.deps.pool.query(
        `INSERT INTO member_wa_opt_in (pariwar_id, member_id, state, verification_phrase, mobile_blind_index, created_at)
         VALUES ($1, $2, 'ACTIVE', $3, $4, now() - interval '3 days'), ($1, $2, 'REVOKED', $5, $4, now() - interval '1 day')`,
        [notNewest.pariwarId, notNewest.memberId, waOptIn.generateVerificationPhrase(), `blind-${notNewest.memberId}`, waOptIn.generateVerificationPhrase()],
      );
      const r2 = await inject(t, 'POST', '/api/v1/member/wa-opt-in', { token: token(t, notNewest.memberId, notNewest.pariwarId) });
      expect(r2.status).toBe(409);
      expect((r2.body.error as Json).code).toBe('wa_opt_in.already_active');
    } finally {
      await teardown(t);
    }
  });

  it('⭐ LY5 lost race — the ACTIVE row moves elsewhere between the plan and the write (⛔ open consent) ⇒ 409 not_active + a compensating `_rolled_back` line', async () => {
    const t = await createTestApp();
    // A COMMITTED test trigger that SKIPS the row update (a BEFORE trigger returning NULL) makes `endEveryWaYes` return
    // `{ null, 0 }` — the shape a concurrent STOP leaves. Its own connection, a lock_timeout, a prefix sweep (cycle-freeze.spec.ts).
    async function ddl(sql: string): Promise<void> {
      const c = await t.deps.pool.connect();
      try {
        await c.query("SET lock_timeout = '5s'");
        await c.query(sql);
      } finally {
        await c.query('RESET lock_timeout').catch(() => undefined);
        c.release();
      }
    }
    try {
      const leaked = await t.deps.pool.query<{ tgname: string }>(
        `SELECT tgname FROM pg_trigger WHERE tgrelid = 'member_wa_opt_in'::regclass AND NOT tgisinternal AND starts_with(tgname, $1)`,
        [SKIP_PREFIX],
      );
      for (const { tgname } of leaked.rows) {
        await ddl(`DROP TRIGGER IF EXISTS ${tgname} ON member_wa_opt_in`);
        await ddl(`DROP FUNCTION IF EXISTS ${tgname}()`);
      }
      const { memberId, pariwarId } = await seedMemberWithConfig(t);
      const { rows } = await t.deps.pool.query<{ opt_in_id: string }>(
        `INSERT INTO member_wa_opt_in (pariwar_id, member_id, state, verification_phrase, mobile_blind_index) VALUES ($1, $2, 'ACTIVE', $3, $4) RETURNING opt_in_id`,
        [pariwarId, memberId, waOptIn.generateVerificationPhrase(), `blind-${memberId}`],
      );
      const optInId = rows[0]!.opt_in_id;
      const fn = `${SKIP_PREFIX}${randomUUID().replace(/-/g, '')}`;
      await ddl(`CREATE FUNCTION ${fn}() RETURNS trigger LANGUAGE plpgsql AS $fn$ BEGIN RETURN NULL; END $fn$`);
      let res: { status: number; body: Json };
      try {
        await ddl(`CREATE TRIGGER ${fn} BEFORE UPDATE ON member_wa_opt_in FOR EACH ROW WHEN (OLD.opt_in_id = '${optInId}'::uuid) EXECUTE FUNCTION ${fn}()`);
        res = await inject(t, 'DELETE', '/api/v1/member/wa-opt-in', { token: token(t, memberId, pariwarId) });
      } finally {
        await ddl(`DROP TRIGGER IF EXISTS ${fn} ON member_wa_opt_in`);
        await ddl(`DROP FUNCTION IF EXISTS ${fn}()`);
      }
      expect(res.status).toBe(409);
      expect((res.body.error as Json).code).toBe('wa_opt_in.not_active');
      expect(await stateOf(t, optInId)).toBe('ACTIVE');
      expect(await auditIds(t, pariwarId, 'member.wa_opt_in_revoked')).toHaveLength(1);
      expect(await auditIds(t, pariwarId, 'member.wa_opt_in_revoked_rolled_back')).toHaveLength(1);
    } finally {
      await teardown(t);
    }
  });
});
