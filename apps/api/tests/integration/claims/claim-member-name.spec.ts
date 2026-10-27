// `2026-10-27-409` — GET /api/v1/member/claims/member-name: the SESSION member's registered name for the claim-filing screens,
// in the Pariwar's member-facing form (the memorial intro's resolver, shared). Live DB, own-committing: each test mints a fresh
// Pariwar. Legs: the name; ⛔ KYC profile ⇒ null; an unreadable ciphertext ⇒ null (a 200, ⛔ a 500); the erasure sentinel ⇒
// null; each session reads ITS OWN member (a query parameter is ignored); ⛔ session ⇒ 401; the audit line carries counts only
// and ⛔ log line, audit line or KMS line carries the name.

import { randomUUID } from 'node:crypto';
import { Writable } from 'node:stream';

import { encryption, member as memberDomain } from '@twt/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { signAccessToken } from '../../../src/modules/auth/member/tokens.js';
import { createTestApp, hasDatabase, teardown, type TestApp } from '../_setup.js';

const ROUTE = '/api/v1/member/claims/member-name';

describe.skipIf(!hasDatabase)('2026-10-27-409 — the claim screens\' member name', { timeout: 60000 }, () => {
  let t: TestApp;
  const logLines: string[] = [];

  beforeAll(async () => {
    const logStream = new Writable({
      write(chunk: Buffer, _enc, done) {
        logLines.push(chunk.toString('utf-8'));
        done();
      },
    });
    t = await createTestApp({ logStream });
  });
  afterAll(async () => {
    await teardown(t);
  });

  /** A member of `pariwarId` with a KYC name (`null` ⇒ ⛔ KYC profile), committed. */
  async function member(pariwarId: string, name: string | null): Promise<string> {
    const id = randomUUID();
    await t.pool.query(`INSERT INTO members (member_id, pariwar_id, state, state_event_version) VALUES ($1, $2, 'active', 1)`, [id, pariwarId]);
    if (name !== null) {
      await t.pool.query(
        `INSERT INTO member_kyc_profiles (member_id, pariwar_id, name_ciphertext, dob_ciphertext, verification_strength, source)
         VALUES ($1, $2, $3, $4, 'aadhaar_kyc', 'digilocker')`,
        [id, pariwarId, await encryption.encryptKycField(name, pariwarId, t.deps.encryption), await encryption.encryptKycField('1960-03-01', pariwarId, t.deps.encryption)],
      );
    }
    return id;
  }

  const token = (memberId: string, pariwarId: string) => signAccessToken(t.app, { memberId, pariwarId, deviceId: 'test-device' }, 15 * 60 * 1000);

  async function read(tok?: string, url = ROUTE) {
    const res = await t.app.inject({ method: 'GET', url, headers: { origin: 'http://localhost:3001', ...(tok ? { authorization: `Bearer ${tok}` } : {}) } });
    return { status: res.statusCode, body: res.json() as Record<string, unknown> };
  }

  it('the session member\'s registered name, in the member-facing form; the audit line carries counts only', async () => {
    const p = randomUUID();
    const m = await member(p, 'Shanti Devi');
    t.auditSink.events.length = 0;
    logLines.length = 0;
    const r = await read(token(m, p));
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ name: 'Shanti Devi' });
    const lines = t.auditSink.ofType('member_claim.member_name_read');
    expect(lines).toHaveLength(1);
    expect(lines[0]!.context).toEqual({ fields_decrypted: 1, named: true });
    expect(JSON.stringify(t.auditSink.events)).not.toContain('Shanti');
    expect(logLines.join('')).not.toContain('Shanti');
  });

  it('⛔ KYC profile ⇒ { name: null } (the screens keep member_fallback), ⛔ a decrypt', async () => {
    const p = randomUUID();
    const m = await member(p, null);
    t.auditSink.events.length = 0;
    const r = await read(token(m, p));
    expect(r).toEqual({ status: 200, body: { name: null } });
    expect(t.auditSink.ofType('member_claim.member_name_read')[0]!.context).toEqual({ fields_decrypted: 0, named: false });
  });

  it('an unreadable name ⇒ { name: null }, a 200 (⛔ a 500 — the claim screens must still open)', async () => {
    const p = randomUUID();
    const m = await member(p, 'Shanti Devi');
    await t.pool.query(`UPDATE member_kyc_profiles SET name_ciphertext = 'enc:v1:garbage' WHERE member_id = $1`, [m]);
    expect(await read(token(m, p))).toEqual({ status: 200, body: { name: null } });
  });

  it('an ERASED member (the anonymisation sentinel) ⇒ { name: null }', async () => {
    const p = randomUUID();
    const m = await member(p, memberDomain.ANONYMIZED_SENTINEL);
    expect(await read(token(m, p))).toEqual({ status: 200, body: { name: null } });
  });

  it('each session reads ITS OWN member — two members of one Pariwar; a query parameter naming the other is ignored', async () => {
    const p = randomUUID();
    const a = await member(p, 'Shanti Devi');
    const b = await member(p, 'Kamla Bai');
    expect((await read(token(a, p))).body).toEqual({ name: 'Shanti Devi' });
    expect((await read(token(b, p))).body).toEqual({ name: 'Kamla Bai' });
    expect((await read(token(a, p), `${ROUTE}?memberId=${b}`)).body).toEqual({ name: 'Shanti Devi' });
  });

  it('⛔ session ⇒ 401', async () => {
    expect((await read()).status).toBe(401);
  });
});
