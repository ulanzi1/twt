// Story 11b.4 — the family memorial's integration fixture. ONE Pariwar per world: the DECEASED member (the Ravi-mode
// session member), their declared nominee, a KYC name, an approved claim and its pool in the requested state. Explicit
// values only; every world is its own Pariwar, so no assertion counts over shared rows.

import { randomUUID } from 'node:crypto';

import { encryption, ids, member as memberDomain, pool as poolDomain, schema } from '@twt/domain';
import { expect } from 'vitest';

import { signAccessToken } from '../../../src/modules/auth/member/tokens.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import type { TestApp } from '../_setup.js';

const ACCESS_TTL_MS = 15 * 60 * 1000;
export type Json = Record<string, unknown>;

export interface MemorialWorld {
  readonly pariwarId: string;
  readonly memberId: string;
  readonly claimCaseId: string;
  readonly poolId: string;
  readonly token: string;
}

export function memberToken(t: TestApp, memberId: string, pariwarId: string): string {
  return signAccessToken(t.app, { memberId, pariwarId, deviceId: 'test-device' }, ACCESS_TTL_MS);
}

export async function memberInject(
  t: TestApp,
  method: 'GET' | 'POST',
  url: string,
  opts: { payload?: Json | string | Buffer; token?: string; headers?: Record<string, string> } = {},
): Promise<{ status: number; body: Json; raw: string }> {
  const res = await t.app.inject({
    method,
    url,
    payload: opts.payload,
    headers: {
      origin: 'http://localhost:3001',
      ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}),
      ...opts.headers,
    },
  });
  let body: Json = {};
  try {
    body = res.json();
  } catch {
    body = {};
  }
  return { status: res.statusCode, body, raw: res.body };
}

/** Seed one world. `nominee: false` ⇒ ⛔ nominee declared (the `nominee_unresolved` leg). */
export async function seedMemorialWorld(
  t: TestApp,
  opts: { poolState?: 'spawned' | 'live' | 'closed' | 'settled'; nominee?: boolean; legalName?: string | null } = {},
): Promise<MemorialWorld> {
  const pariwarId = randomUUID();
  const memberId = randomUUID();
  const claimCaseId = randomUUID();
  const poolId = randomUUID();
  const cycleId = randomUUID();
  const pid = ids.pariwarId(pariwarId);
  const mid = ids.memberId(memberId);

  const scopeTx = await openScopeTx(t.deps, pariwarId);
  try {
    await memberDomain.projectMemberState(scopeTx.client, {
      memberId: mid,
      pariwarId: pid,
      eventType: 'member.signup_initiated',
      actorId: memberId,
      payload: { from_state: null, to_state: 'pending-kyc', trigger: 'signup', actor: 'member' },
    });
    await memberDomain.projectMemberState(scopeTx.client, {
      memberId: mid,
      pariwarId: pid,
      eventType: 'member.kyc_manual_fallback',
      actorId: memberId,
      payload: { from_state: 'pending-kyc', to_state: 'pending-fee', trigger: 'kyc_manual', actor: 'member', reason: 'manual_fallback' },
    });
    await closeScopeTx(scopeTx, true);
  } catch (err) {
    await closeScopeTx(scopeTx, false);
    throw err;
  }

  // The nominee is declared BEFORE the claim exists (a filed claim locks the declaration — `nominee.locked_claim_filed`).
  const token = memberToken(t, memberId, pariwarId);
  if (opts.nominee !== false) {
    const res = await memberInject(t, 'POST', '/api/v1/member/nominees', {
      payload: { nominees: [{ name: 'Asha Devi', relationship: 'spouse', mobile: '+91 98765 43210' }] },
      token,
    });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
  }

  const seedTx = await openScopeTx(t.deps, pariwarId);
  try {
    const scopeTx = seedTx;
    if (opts.legalName !== null) {
      await scopeTx.tx.insert(schema.memberKycProfiles).values({
        memberId: mid,
        pariwarId: pid,
        nameCiphertext: await encryption.encryptKycField(opts.legalName ?? 'Shanti Devi', pariwarId, t.deps.encryption),
        dobCiphertext: await encryption.encryptKycField('1960-03-01', pariwarId, t.deps.encryption),
        photoCiphertext: null,
        aadhaarMaskedId: 'XXXX4321',
        verificationStrength: 'aadhaar_kyc',
        source: 'digilocker',
      });
    }
    await scopeTx.client.query(
      `INSERT INTO cycle_freeze_commits (commit_id, pariwar_id, actor_id, actor_display, committed_claim_ids, committed_at)
       VALUES ($1, $2, $3, $4, $5, now())`,
      [cycleId, pariwarId, randomUUID(), 'Test Trustee', [claimCaseId]],
    );
    await scopeTx.client.query("SET LOCAL app.claim_state_writer = 'on'");
    await scopeTx.client.query(
      `INSERT INTO claims (claim_case_id, pariwar_id, deceased_member_id, intake_channels, current_state, state_event_version)
       VALUES ($1, $2, $3, ARRAY['member_app']::claim_intake_channel[], 'approved', 1)`,
      [claimCaseId, pariwarId, memberId],
    );
    await scopeTx.client.query("SET LOCAL app.claim_state_writer = 'off'");
    await scopeTx.client.query("SET LOCAL app.pool_state_writer = 'on'");
    await scopeTx.tx.insert(schema.pools).values({
      poolId: ids.poolId(poolId),
      pariwarId: pid,
      cycleId: ids.cycleFreezeCommitId(cycleId),
      claimCaseId: ids.claimId(claimCaseId),
      poolIndex: 0,
      poolCanonicalIdentifier: `P-2026-10-${poolId.slice(0, 6)}`,
      supportCategory: 'death_support',
      benefitMechanism: 'pool',
      fixedAmount: 500,
      currentState: opts.poolState ?? 'closed',
      stateEventVersion: 1,
      publicToken: poolDomain.mintPoolPublicToken(),
    });
    await scopeTx.client.query("SET LOCAL app.pool_state_writer = 'off'");
    await closeScopeTx(seedTx, true);
  } catch (err) {
    await closeScopeTx(seedTx, false);
    throw err;
  }
  return { pariwarId, memberId, claimCaseId, poolId, token };
}

/** The nominee's handover code — through the NOMINEE route (the only one that mints `claim_handover` after MA19). */
export async function handover(t: TestApp, w: MemorialWorld): Promise<void> {
  const send = await memberInject(t, 'POST', '/api/v1/member/claims/handover-otp', { payload: {}, token: w.token });
  expect(send.status).toBe(200);
  const code = t.stepUpDelivery.last?.code as string;
  const verify = await memberInject(t, 'POST', '/api/v1/member/claims/handover-otp/verify', { payload: { code }, token: w.token });
  expect(verify.body).toMatchObject({ verified: true });
}

export type Part =
  | { kind: 'field'; name: string; value: string }
  | { kind: 'file'; name: string; filename: string; contentType: string; bytes: Buffer };

/** A multipart/form-data body from ordered parts (the helpdesk spec's builder). */
export function multipart(parts: readonly Part[]): { body: Buffer; ct: string } {
  const boundary = `----twt${randomUUID().replace(/-/g, '')}`;
  const chunks: Buffer[] = [];
  for (const p of parts) {
    if (p.kind === 'field') {
      chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${p.name}"\r\n\r\n`));
      chunks.push(Buffer.from(p.value, 'utf-8'));
      chunks.push(Buffer.from('\r\n'));
    } else {
      chunks.push(
        Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="${p.name}"; filename="${p.filename}"\r\n` +
            `Content-Type: ${p.contentType}\r\n\r\n`,
        ),
      );
      chunks.push(p.bytes);
      chunks.push(Buffer.from('\r\n'));
    }
  }
  chunks.push(Buffer.from(`--${boundary}--\r\n`));
  return { body: Buffer.concat(chunks), ct: `multipart/form-data; boundary=${boundary}` };
}

export const CURRENT_VERSION = '2026-10-23.v1-pending-hi-review';

/** The Send's standard fields (override per test). */
export function sendFields(over: Partial<Record<'body' | 'altText' | 'authorisationCopyVersion' | 'authorisationLocale' | 'keepPreviousPhoto', string>> = {}): Part[] {
  const f: Record<string, string> = {
    body: 'माँ हमेशा हमारे साथ रहेंगी।',
    authorisationCopyVersion: CURRENT_VERSION,
    authorisationLocale: 'hi',
    ...over,
  };
  return Object.entries(f).map(([name, value]) => ({ kind: 'field', name, value }));
}

export async function send(
  t: TestApp,
  w: MemorialWorld,
  parts: readonly Part[],
  opts: { key?: string | null } = {},
): Promise<{ status: number; body: Json }> {
  const { body, ct } = multipart(parts);
  const headers: Record<string, string> = { 'content-type': ct };
  if (opts.key !== null) headers['idempotency-key'] = opts.key ?? randomUUID();
  const r = await memberInject(t, 'POST', '/api/v1/member/memorial/submissions', { payload: body, token: w.token, headers });
  return { status: r.status, body: r.body };
}

/** A tiny valid JPEG carrying a planted GPS EXIF block (the stripper must remove it). */
export function jpegWithGps(): Buffer {
  const seg = (marker: number, payload: number[]): number[] => {
    const len = payload.length + 2;
    return [0xff, marker, (len >> 8) & 0xff, len & 0xff, ...payload];
  };
  const ascii = (s: string): number[] => [...s].map((c) => c.charCodeAt(0));
  return Buffer.from([
    0xff, 0xd8,
    ...seg(0xe0, [...ascii('JFIF'), 0, 1, 1, 0, 0, 1, 0, 1, 0, 0]),
    ...seg(0xe1, [...ascii('Exif'), 0, 0, ...ascii('GPS-26.8467N-80.9462E')]),
    ...seg(0xdb, [0, ...new Array<number>(64).fill(1)]),
    ...seg(0xc0, [8, 0, 1, 0, 1, 1, 1, 0x11, 0]),
    ...seg(0xda, [1, 1, 0, 0, 0x3f, 0]),
    0x12, 0x34, 0xff, 0x00, 0x56,
    0xff, 0xd9,
  ]);
}

/** Read rows with the service pool (BYPASSRLS) — assertions only. */
export async function rows<T extends Record<string, unknown>>(t: TestApp, text: string, params: unknown[]): Promise<T[]> {
  const c = await t.pool.connect();
  try {
    return (await c.query<T>(text, params)).rows;
  } finally {
    c.release();
  }
}
