// Story 5.12 (Task 1; AC3; LY5, LY6) — `-364` condition 4: a withdrawal ends EVERY earlier yes. Live DB; per-test ROLLBACK.
//   · revokeOpenConsentsOfType — set-based, returns the count, ⛔ throws on zero; touches ⛔ other type / subject.
//   · endEveryWaYes — moves the ACTIVE row and revokes every open `whatsapp_opt_in` consent row; twice ⇒ `{ null, 0 }`.
//   · the state reads the withdrawal paths use (⛔ `isOptInActive` — T4): hasActiveOptIn, hasAnythingToEnd,
//     listMemberIdsByOptInMobile.
// The LEGACY yes (an opt-in the 24-hour sweep expired before the ruling, its consent still granted) is seeded by INSERT — ⛔ an
// UPDATE of an ACTIVE row (the LY4 trigger refuses it) — with explicit timestamps (T8: one BEGIN/ROLLBACK ⇒ one `now()`).
// The one leg proving the audit id lands on BOTH consent rows writes a real audit line on a service pool (it COMMITS — under a
// fresh random tenant, ⛔ PARIWAR_A / B, the pool-name-mutation.spec.ts discipline); the consent rows still roll back.

import { randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { writeAuditEntry } from '../../../src/audit/write.js';
import { consentExists } from '../../../src/consent/read.js';
import { recordConsent, revokeOpenConsentsOfType } from '../../../src/consent/write.js';
import type { Db } from '../../../src/db.js';
import { consentId as toConsentId, memberId as toMemberId, type MemberId } from '../../../src/ids/index.js';
import {
  activateOptIn,
  createPendingOptIn,
  endEveryWaYes,
  hasActiveOptIn,
  hasAnythingToEnd,
  isOptInActive,
  isPeerMeshWaReminderOptedIn,
  listMemberIdsByOptInMobile,
} from '../../../src/wa-opt-in/index.js';
import { DATABASE_URL, getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppScope } from '../_helpers.js';

const member = (): MemberId => toMemberId(randomUUID());
const phrase = (): string => `TWT-${randomUUID().slice(0, 8).toUpperCase()}`;

/** A legacy yes: an open consent granted two days ago + an EXPIRED_24H_WINDOW row carrying it — INSERTed (⛔ UPDATE — T8). */
async function seedLegacyYes(client: pg.PoolClient, memberId: MemberId, blindIndex: string): Promise<string> {
  const consentId = randomUUID();
  await client.query(
    `INSERT INTO consent_records (consent_id, subject_id, pariwar_id, consent_type, granted_at, granted_via_actor, consent_payload)
     VALUES ($1, $2, $3, 'whatsapp_opt_in', now() - interval '2 days', 'member_self', '{"source":"meta_webhook_inbound"}')`,
    [consentId, memberId, PARIWAR_A],
  );
  await client.query(
    `INSERT INTO member_wa_opt_in (pariwar_id, member_id, state, verification_phrase, mobile_blind_index, window_expires_at, consent_id,
                                   matched_at, created_at, updated_at)
     VALUES ($1, $2, 'EXPIRED_24H_WINDOW', $3, $4, now() - interval '1 day', $5, now() - interval '2 days', now() - interval '2 days',
             now() - interval '1 day')`,
    [PARIWAR_A, memberId, phrase(), blindIndex, consentId],
  );
  return consentId;
}

/** 5.4's activation as the worker does it: consent minted, then PENDING → ACTIVE carrying its id. */
async function optInAgain(tx: Db, memberId: MemberId, blindIndex: string) {
  const pending = await createPendingOptIn(tx, { pariwarId: PARIWAR_A, memberId, mobileBlindIndex: blindIndex });
  const consentId = toConsentId(randomUUID());
  await recordConsent(tx, {
    pariwarId: PARIWAR_A,
    subjectId: memberId,
    consentType: 'whatsapp_opt_in',
    grantedViaActor: 'member_self',
    consentPayload: { source: 'meta_webhook_inbound' },
    consentId,
  });
  const row = await activateOptIn(tx, {
    pariwarId: PARIWAR_A,
    optInId: pending.optInId,
    windowExpiresAt: new Date(Date.now() + 24 * 3600 * 1000),
    consentId,
  });
  return { optInId: row.optInId, consentId };
}

async function openConsents(client: pg.PoolClient, subjectId: string, type = 'whatsapp_opt_in'): Promise<number> {
  const r = await client.query<{ n: string }>(
    `SELECT count(*)::text AS n FROM consent_records WHERE pariwar_id = $1 AND subject_id = $2 AND consent_type = $3 AND revoked_at IS NULL`,
    [PARIWAR_A, subjectId, type],
  );
  return Number(r.rows[0]!.n);
}

describe.skipIf(!hasDatabase)('Story 5.12 — ending every WhatsApp yes (condition 4; LY5)', () => {
  setupLiveDb();

  let servicePool: pg.Pool;
  beforeAll(() => {
    servicePool = new pg.Pool({ connectionString: DATABASE_URL, max: 2, ssl: false });
  });
  afterAll(() => servicePool.end());

  it('revokeOpenConsentsOfType: ⛔ open row ⇒ 0 and ⛔ throw; it touches ⛔ other consent type and ⛔ other member', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const m = member();
    const other = member();
    const revoke = (subjectId: string) =>
      revokeOpenConsentsOfType(tx, { pariwarId: PARIWAR_A, subjectId, consentType: 'whatsapp_opt_in', reason: 'test', revokedAuditId: null });

    expect(await revoke(m)).toBe(0);

    for (const [subjectId, consentType] of [[m, 'whatsapp_opt_in'], [m, 'whatsapp_opt_in'], [m, 'marketing'], [other, 'whatsapp_opt_in']] as const) {
      await recordConsent(tx, { pariwarId: PARIWAR_A, subjectId, consentType, grantedViaActor: 'member_self', consentPayload: {} });
    }
    expect(await revoke(m)).toBe(2);
    expect(await openConsents(client, m)).toBe(0);
    expect(await openConsents(client, m, 'marketing')).toBe(1);
    expect(await openConsents(client, other)).toBe(1);
    // A second pass finds nothing open — ⛔ a throw (the race a concurrent STOP + DELETE makes is benign — T2).
    expect(await revoke(m)).toBe(0);
  });

  it('opt in, expire (legacy), opt in again, withdraw ⇒ ⛔ open consent, ⛔ yes; ONE audit id on BOTH consent rows', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const m = member();
    const blind = `blind-${randomUUID()}`;
    const legacyConsentId = await seedLegacyYes(client, m, blind);
    const { optInId, consentId } = await optInAgain(tx, m, blind);
    expect(await openConsents(client, m)).toBe(2);
    expect(await isPeerMeshWaReminderOptedIn(tx, { pariwarId: PARIWAR_A, memberId: m })).toBe(true);

    // The one withdrawal audit line (committed on its own connection, like every caller) — under a fresh tenant.
    const auditLine = await writeAuditEntry(servicePool, {
      pariwarId: randomUUID(),
      actorId: m,
      actorRole: null,
      action: 'member.wa_opt_in_revoked',
      resourceLocator: `test/5-12/${m}`,
      requestPayloadHash: 'a'.repeat(64),
      responseStatus: 200,
      traceId: null,
    });

    const result = await endEveryWaYes(tx, {
      pariwarId: PARIWAR_A,
      memberId: m,
      toState: 'REVOKED',
      reason: 'test withdrawal',
      revokedAuditId: auditLine.auditId,
    });
    expect(result).toEqual({ movedOptInId: optInId, consentsRevoked: 2 });

    expect(await openConsents(client, m)).toBe(0);
    expect(await consentExists(tx, PARIWAR_A, m, 'whatsapp_opt_in')).toBe(false);
    expect(await isPeerMeshWaReminderOptedIn(tx, { pariwarId: PARIWAR_A, memberId: m })).toBe(false);
    expect(await isOptInActive(tx, { pariwarId: PARIWAR_A, memberId: m })).toBe(false);
    const revoked = await client.query<{ consent_id: string; revoked_audit_id: string; revocation_reason: string }>(
      `SELECT consent_id, revoked_audit_id, revocation_reason FROM consent_records WHERE consent_id = ANY($1::uuid[]) ORDER BY consent_id`,
      [[legacyConsentId, consentId]],
    );
    expect(revoked.rows).toHaveLength(2);
    for (const row of revoked.rows) {
      expect(row.revoked_audit_id).toBe(auditLine.auditId);
      expect(row.revocation_reason).toBe('test withdrawal');
    }
    const state = await client.query<{ state: string }>(`SELECT state FROM member_wa_opt_in WHERE opt_in_id = $1`, [optInId]);
    expect(state.rows[0]!.state).toBe('REVOKED');
  });

  it('toState BLOCKED_BY_META moves the ACTIVE row there and still ends every consent', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const m = member();
    const blind = `blind-${randomUUID()}`;
    await seedLegacyYes(client, m, blind);
    const { optInId } = await optInAgain(tx, m, blind);
    const result = await endEveryWaYes(tx, { pariwarId: PARIWAR_A, memberId: m, toState: 'BLOCKED_BY_META', reason: 'meta 131050', revokedAuditId: null });
    expect(result).toEqual({ movedOptInId: optInId, consentsRevoked: 2 });
    const state = await client.query<{ state: string }>(`SELECT state FROM member_wa_opt_in WHERE opt_in_id = $1`, [optInId]);
    expect(state.rows[0]!.state).toBe('BLOCKED_BY_META');
  });

  it('a legacy EXPIRED yes alone: the consent closes, the row stays EXPIRED (⛔ ACTIVE moved)', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const m = member();
    await seedLegacyYes(client, m, `blind-${randomUUID()}`);
    expect(await hasAnythingToEnd(tx, { pariwarId: PARIWAR_A, memberId: m })).toBe(true);
    const result = await endEveryWaYes(tx, { pariwarId: PARIWAR_A, memberId: m, toState: 'REVOKED', reason: 'stop', revokedAuditId: null });
    expect(result).toEqual({ movedOptInId: null, consentsRevoked: 1 });
    const state = await client.query<{ state: string }>(`SELECT state FROM member_wa_opt_in WHERE member_id = $1`, [m]);
    expect(state.rows.map((r) => r.state)).toEqual(['EXPIRED_24H_WINDOW']);
    expect(await hasAnythingToEnd(tx, { pariwarId: PARIWAR_A, memberId: m })).toBe(false);
  });

  it('double operation (F25): endEveryWaYes twice ⇒ the second returns { movedOptInId: null, consentsRevoked: 0 } and ⛔ throws', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const m = member();
    await optInAgain(tx, m, `blind-${randomUUID()}`);
    const args = { pariwarId: PARIWAR_A, memberId: m, toState: 'REVOKED' as const, reason: 'twice', revokedAuditId: null };
    expect((await endEveryWaYes(tx, args)).consentsRevoked).toBe(1);
    expect(await endEveryWaYes(tx, args)).toEqual({ movedOptInId: null, consentsRevoked: 0 });
  });

  it('endEveryWaYes touches ⛔ other member and ⛔ other Pariwar', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const m = member();
    const other = member();
    await optInAgain(tx, m, `blind-${randomUUID()}`);
    const { optInId: otherOptIn } = await optInAgain(tx, other, `blind-${randomUUID()}`);
    await endEveryWaYes(tx, { pariwarId: PARIWAR_A, memberId: m, toState: 'REVOKED', reason: 'x', revokedAuditId: null });
    expect(await openConsents(client, other)).toBe(1);
    const state = await client.query<{ state: string }>(`SELECT state FROM member_wa_opt_in WHERE opt_in_id = $1`, [otherOptIn]);
    expect(state.rows[0]!.state).toBe('ACTIVE');
    // The same member id under Pariwar B: nothing there to end.
    await enterAppScope(client, PARIWAR_B);
    expect(await endEveryWaYes(tx, { pariwarId: PARIWAR_B, memberId: other, toState: 'REVOKED', reason: 'x', revokedAuditId: null })).toEqual({
      movedOptInId: null,
      consentsRevoked: 0,
    });
  });

  it('hasAnythingToEnd / hasActiveOptIn: ACTIVE ⇒ true; PENDING-only, EXPIRED without consent, ⛔ row ⇒ false', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const active = member();
    await optInAgain(tx, active, `blind-${randomUUID()}`);
    expect(await hasActiveOptIn(tx, { pariwarId: PARIWAR_A, memberId: active })).toBe(true);
    expect(await hasAnythingToEnd(tx, { pariwarId: PARIWAR_A, memberId: active })).toBe(true);

    const pendingOnly = member();
    await createPendingOptIn(tx, { pariwarId: PARIWAR_A, memberId: pendingOnly, mobileBlindIndex: `blind-${randomUUID()}` });
    const expiredNoConsent = member();
    await client.query(
      `INSERT INTO member_wa_opt_in (pariwar_id, member_id, state, verification_phrase, mobile_blind_index) VALUES ($1, $2, 'EXPIRED_24H_WINDOW', $3, $4)`,
      [PARIWAR_A, expiredNoConsent, phrase(), `blind-${randomUUID()}`],
    );
    for (const m of [pendingOnly, expiredNoConsent, member()]) {
      expect(await hasActiveOptIn(tx, { pariwarId: PARIWAR_A, memberId: m })).toBe(false);
      expect(await hasAnythingToEnd(tx, { pariwarId: PARIWAR_A, memberId: m })).toBe(false);
    }
  });

  it('hasActiveOptIn reads ANY ACTIVE row — an ACTIVE row that is ⛔ the newest (hand-seeded) still counts', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const m = member();
    const blind = `blind-${randomUUID()}`;
    await client.query(
      `INSERT INTO member_wa_opt_in (pariwar_id, member_id, state, verification_phrase, mobile_blind_index, created_at)
       VALUES ($1, $2, 'ACTIVE', $3, $4, now() - interval '3 days'), ($1, $2, 'REVOKED', $5, $4, now() - interval '1 day')`,
      [PARIWAR_A, m, phrase(), blind, phrase()],
    );
    expect(await hasActiveOptIn(tx, { pariwarId: PARIWAR_A, memberId: m })).toBe(true);
  });

  it('listMemberIdsByOptInMobile: every member whose rows (ANY state) carry the number in the Pariwar — ⛔ another Pariwar', async () => {
    const { tx, client } = getTx();
    const blind = `blind-${randomUUID()}`;
    const [a, b, c] = [member(), member(), member()];
    // Seeded as superuser BEFORE entering app scope (both tenants' rows land). Two members on one number is ⛔ reachable
    // today (F10b) — DEFENSIVE.
    await client.query(
      `INSERT INTO member_wa_opt_in (pariwar_id, member_id, state, verification_phrase, mobile_blind_index)
       VALUES ($1, $2, 'EXPIRED_24H_WINDOW', $5, $4), ($1, $2, 'REVOKED', $6, $4), ($1, $3, 'PENDING', $7, $4),
              ($8, $9, 'ACTIVE', $10, $4), ($1, $9, 'ACTIVE', $11, 'blind-other')`,
      [PARIWAR_A, a, b, blind, phrase(), phrase(), phrase(), PARIWAR_B, c, phrase(), phrase()],
    );
    await enterAppScope(client, PARIWAR_A);
    const found = await listMemberIdsByOptInMobile(tx, { pariwarId: PARIWAR_A, mobileBlindIndex: blind });
    expect([...found].sort()).toEqual([a, b].sort());
    expect(await listMemberIdsByOptInMobile(tx, { pariwarId: PARIWAR_A, mobileBlindIndex: `blind-${randomUUID()}` })).toEqual([]);
  });
});
