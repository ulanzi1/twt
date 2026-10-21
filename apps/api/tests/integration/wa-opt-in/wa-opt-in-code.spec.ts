// The WhatsApp CODE — E2E (live DB :5433) — Story 5.13 (Task 4.6; AC1's API legs, AC2, AC3's HTTP concurrency leg, AC4, AC5, AC6,
// AC8, AC11, the route limit; WC1–WC5, WC9, WC10, WC15–WC17; Decision 2026-10-21-374 option A, build decisions -376).
//
// Every member is created through the REAL signup path (OTP → continuation → signup/create → KYC manual ⇒ `pending-fee`, 5.10 AC9's
// helpers) in a FRESH random Pariwar per test, so its `member_identities` row carries a REAL Tier-1 mobile ciphertext and the send's
// decrypt is the production one. ⭐ The ONLY fakes: the RECORDING Meta fetch (`RecordingWaCodeFetch` — requests captured, responses
// scripted, the abort test-controlled) and the per-spec `resolveChannelSecret` override (⚠ the `_setup` default FAILS
// `TEMPLATE_NAME_FORM` — T18). The resolution, the request body and the classification under test are the production ones.
// ⚠ The guard trigger freezes `created_at` / `expires_at` (I3): the wait / expiry legs move them on ONE superuser connection with
// `session_replication_role = replica` (a test-only bypass of the trigger — ⛔ a production path).

import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { consent, ids, waOptIn } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import { createTestApp, hasDatabase, teardown, type TestApp, type TestDepsOverrides } from '../_setup.js';

type Json = Record<string, unknown>;
const AUTH = '/api/v1/member/auth';
const CODE = '/api/v1/member/wa-opt-in/code';
const VERIFY = '/api/v1/member/wa-opt-in/code/verify';
const TOKEN_NAME = 'wa-token-5-13';
const here = path.dirname(fileURLToPath(import.meta.url));
const src = (rel: string): string => readFileSync(path.resolve(here, '../../../src', rel), 'utf8');

async function inject(
  t: TestApp,
  method: 'GET' | 'POST' | 'DELETE',
  url: string,
  opts: { token?: string; payload?: Json } = {},
): Promise<{ status: number; body: Json; raw: string }> {
  const res = await t.app.inject({
    method,
    url,
    ...(opts.payload ? { payload: opts.payload } : {}),
    headers: { origin: 'http://localhost:3001', ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}) },
  });
  let body: Json = {};
  try {
    body = res.json();
  } catch {
    body = {};
  }
  return { status: res.statusCode, body, raw: res.body };
}

const errOf = (r: { body: Json }): { code: string; details?: Json } => r.body.error as { code: string; details?: Json };

function randomMobile(): string {
  let n = String(6 + Math.floor(Math.random() * 4));
  for (let i = 0; i < 9; i++) n += Math.floor(Math.random() * 10);
  return n;
}

/** The Secret Manager the spec controls: names → values; a missing name THROWS (not provisioned); `hang` never answers. */
interface Secrets {
  values: Map<string, string>;
  hang: boolean;
  onRead?: (name: string) => Promise<void>;
}

interface Ctx {
  t: TestApp;
  pariwarId: string;
  memberId: string;
  mobile: string;
  session: string;
  secrets: Secrets;
  decrypts: { n: number };
}

/** A provisioned Pariwar + a real signup to `pending-fee`; `mint` (default) mints the PENDING through the real route. */
async function setup(
  opts: {
    provision?: 'both' | 'hi' | 'en' | 'none';
    token?: boolean;
    config?: { enabled?: boolean; phoneNumberId?: string | null; tokenName?: string | null };
    mint?: boolean;
    overrides?: TestDepsOverrides;
    env?: NodeJS.ProcessEnv;
  } = {},
): Promise<Ctx> {
  const pariwarId = randomUUID();
  const secrets: Secrets = { values: new Map(), hang: false };
  const provision = opts.provision ?? 'both';
  if (provision === 'both' || provision === 'hi') secrets.values.set(`wa.template.wa_opt_in.code.hi.${pariwarId}`, 'wa_opt_in_code_hi');
  if (provision === 'both' || provision === 'en') secrets.values.set(`wa.template.wa_opt_in.code.en.${pariwarId}`, 'wa_opt_in_code_en');
  if (opts.token !== false) secrets.values.set(TOKEN_NAME, 'meta-system-user-token');
  const t = await createTestApp({
    env: { DEFAULT_SIGNUP_PARIWAR_ID: pariwarId, ...opts.env },
    resolveChannelSecret: async (name: string): Promise<string> => {
      if (secrets.onRead) await secrets.onRead(name);
      if (secrets.hang) await new Promise(() => undefined);
      const v = secrets.values.get(name);
      if (v === undefined) throw new Error('secret not found');
      return v;
    },
    ...opts.overrides,
  });
  const cfg = opts.config ?? {};
  await t.deps.pool.query(
    `INSERT INTO pariwar_wa_config (pariwar_id, enabled, display_phone_number, phone_number_id, access_token_secret_name, graph_api_version)
     VALUES ($1, $2, '+91 98765 43210', $3, $4, 'v21.0')`,
    [pariwarId, cfg.enabled ?? true, cfg.phoneNumberId === undefined ? '1234567890' : cfg.phoneNumberId, cfg.tokenName === undefined ? TOKEN_NAME : cfg.tokenName],
  );
  const mobile = randomMobile();
  const req = await inject(t, 'POST', `${AUTH}/otp/request`, { payload: { mobile } });
  expect(req.status).toBe(200);
  const otp = t.stepUpDelivery.last?.code as string;
  const verify = await inject(t, 'POST', `${AUTH}/otp/verify`, { payload: { mobile, otp, deviceId: 'device-513' } });
  const created = await inject(t, 'POST', `${AUTH}/signup/create`, {
    payload: { mobile, deviceId: 'device-513' },
    token: verify.body.signupContinuationToken as string,
  });
  expect(created.status).toBe(200);
  const session = created.body.accessToken as string;
  const kyc = await inject(t, 'POST', '/api/v1/member/kyc/manual', { payload: { name: 'Asha Devi', dob: '1990-01-01' }, token: session });
  expect(kyc.body.lifecycleState).toBe('pending-fee');
  const { rows } = await t.deps.pool.query<{ member_id: string }>(`SELECT member_id FROM member_identities WHERE pariwar_id = $1`, [pariwarId]);
  const decrypts = { n: 0 };
  t.deps.encryption.kms.auditHook = (op) => {
    if (op === 'decryptDek') decrypts.n += 1;
  };
  const ctx: Ctx = { t, pariwarId, memberId: rows[0]!.member_id, mobile, session, secrets, decrypts };
  if (opts.mint !== false) {
    const m = await mint(ctx);
    expect(m.status).toBe(200);
  }
  decrypts.n = 0;
  return ctx;
}

const mint = (c: Ctx) => inject(c.t, 'POST', '/api/v1/member/wa-opt-in', { token: c.session });
const send = (c: Ctx) => inject(c.t, 'POST', CODE, { token: c.session, payload: {} });
const verifyCode = (c: Ctx, code: string) => inject(c.t, 'POST', VERIFY, { token: c.session, payload: { code } });

/** The code the n-th recorded Meta call carried (the body `{{1}}`). */
const sentCode = (c: Ctx, i: number): string => c.t.waCodeFetch.bodyOf(i).template.components[0]!.parameters[0]!.text;

interface CodeRow {
  code_id: string;
  member_id: string;
  send_seq: number;
  code_hash: string;
  send_outcome: string;
  detail: string | null;
  provider_message_id: string | null;
  attempts: number;
  consumed: boolean;
  invalidated: boolean;
  ttl: number;
}

/** The Pariwar's code rows — read on a SEPARATE connection (the pool), so only COMMITTED state is seen. */
async function codeRows(c: Ctx): Promise<CodeRow[]> {
  const { rows } = await c.t.deps.pool.query<CodeRow>(
    `SELECT code_id, member_id, send_seq, code_hash, send_outcome, detail, provider_message_id, attempts,
            consumed_at IS NOT NULL AS consumed, invalidated_at IS NOT NULL AS invalidated,
            extract(epoch FROM expires_at - created_at)::int AS ttl
       FROM member_wa_opt_in_codes WHERE pariwar_id = $1 ORDER BY created_at, send_seq`,
    [c.pariwarId],
  );
  return rows;
}

async function auditActions(c: Ctx): Promise<{ action: string; actor_id: string; resource_locator: string }[]> {
  const { rows } = await c.t.deps.pool.query<{ action: string; actor_id: string; resource_locator: string }>(
    `SELECT action, actor_id, resource_locator FROM audit_log_entries WHERE pariwar_id = $1 AND action LIKE 'member.wa_opt_in%' ORDER BY seq`,
    [c.pariwarId],
  );
  return rows;
}

/** Shift the Pariwar's code rows back in time (the wait / the expiry) — the test-only trigger bypass (header). */
async function backdate(c: Ctx, seconds: number): Promise<void> {
  const client = await c.t.deps.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SET LOCAL session_replication_role = replica');
    await client.query(
      `UPDATE member_wa_opt_in_codes SET created_at = created_at - make_interval(secs => $2), expires_at = expires_at - make_interval(secs => $2)
        WHERE pariwar_id = $1`,
      [c.pariwarId, seconds],
    );
    await client.query('COMMIT');
  } finally {
    client.release();
  }
}

const metaError = (status: number, code?: number) => ({ status, body: code === undefined ? {} : { error: { code, message: 'x' } } });
const refused = (code: string) => Object.assign(new Error('fetch failed'), { cause: { code } });

describe.skipIf(!hasDatabase)('Story 5.13 — the WhatsApp code (E2E, :5433)', { timeout: 60_000 }, () => {
  // ── AC1 — what the mint tells the app ──────────────────────────────────────────────────────────────────────────────────────

  it('AC1 — a provisioned Pariwar: the mint says codeAvailable, 2 codes, ⛔ live code; the re-used PENDING after a send says 1 + live `sent`', async () => {
    const c = await setup({ mint: false });
    try {
      const first = await mint(c);
      expect(first.body).toMatchObject({ state: 'PENDING', codeAvailable: true, codesRemaining: 2, liveCode: false, liveCodeDelivery: null });
      expect((await send(c)).status).toBe(200);
      // Inside the wait the code is still OFFERED (the wait is the form's — `too_soon` ⛔ closes the route).
      expect((await mint(c)).body).toMatchObject({ codeAvailable: true, codesRemaining: 1, liveCode: true, liveCodeDelivery: 'sent' });
      await backdate(c, 61);
      expect((await send(c)).status).toBe(200);
      // Two spent, both live ⇒ ⛔ codeAvailable, the newest decides the line.
      expect((await mint(c)).body).toMatchObject({ codeAvailable: false, codesRemaining: 0, liveCode: true, liveCodeDelivery: 'sent' });
    } finally {
      await teardown(c.t);
    }
  });

  it('AC1 — liveCodeDelivery: a newest `may_have_sent` or a stranded `sending` ⇒ `uncertain` (an older `accepted` does ⛔ decide)', async () => {
    const m = await setup();
    try {
      m.t.waCodeFetch.script(metaError(503));
      expect((await send(m)).body).toMatchObject({ delivery: 'uncertain' });
      expect((await mint(m)).body).toMatchObject({ liveCode: true, liveCodeDelivery: 'uncertain', codesRemaining: 1 });
    } finally {
      await teardown(m.t);
    }
    const c = await setup();
    try {
      expect((await send(c)).status).toBe(200);
      expect((await mint(c)).body).toMatchObject({ liveCodeDelivery: 'sent' });
      // A stranded `sending` row (a crash between tx 1 and tx 2) — seeded as the newest.
      const { rows } = await c.t.deps.pool.query<{ opt_in_id: string }>(`SELECT opt_in_id FROM member_wa_opt_in WHERE pariwar_id = $1 AND state = 'PENDING'`, [c.pariwarId]);
      await backdate(c, 61);
      await c.t.deps.pool.query(
        `INSERT INTO member_wa_opt_in_codes (pariwar_id, opt_in_id, member_id, send_seq, code_hash, expires_at) VALUES ($1, $2, $3, 2, $4, clock_timestamp() + interval '10 minutes')`,
        [c.pariwarId, rows[0]!.opt_in_id, c.memberId, 'a'.repeat(64)],
      );
      expect((await mint(c)).body).toMatchObject({ codeAvailable: false, codesRemaining: 0, liveCode: true, liveCodeDelivery: 'uncertain' });
    } finally {
      await teardown(c.t);
    }
  });

  it.each([
    ['⛔ template name (neither hi nor en)', { provision: 'none' as const }],
    ['⛔ token', { token: false }],
    ['⛔ phone number id', { config: { phoneNumberId: null } }],
    ['⛔ access-token secret name', { config: { tokenName: null } }],
  ])('AC1 / AC8 — unprovisioned (%s) ⇒ the mint says codeAvailable false (the 5.10 hint); a send is 503, ⛔ row, ⛔ fetch, ⛔ audit line, ⛔ decrypt', async (_name, opts) => {
    const c = await setup(opts);
    try {
      expect((await mint(c)).body).toMatchObject({ codeAvailable: false, codesRemaining: 2, liveCode: false });
      const r = await send(c);
      expect(r.status).toBe(503);
      expect(errOf(r)).toMatchObject({ code: 'wa_opt_in.code_unavailable', details: { codesRemaining: 2, liveCode: false } });
      expect(c.t.waCodeFetch.calls).toHaveLength(0);
      expect(await codeRows(c)).toHaveLength(0);
      expect((await auditActions(c)).map((a) => a.action)).toEqual(['member.wa_opt_in_requested']);
    } finally {
      await teardown(c.t);
    }
  });

  it('AC1 — `en` only resolves ⇒ available; the send uses the `en` template under language `en`', async () => {
    const c = await setup({ provision: 'en' });
    try {
      expect((await mint(c)).body).toMatchObject({ codeAvailable: true });
      expect((await send(c)).status).toBe(200);
      expect(c.t.waCodeFetch.bodyOf(0).template).toMatchObject({ name: 'wa_opt_in_code_en', language: { code: 'en' } });
    } finally {
      await teardown(c.t);
    }
  });

  it('AC1 / AC13 — a Secret Manager read that HANGS: the mint answers inside the bound, codeAvailable false, the database fields kept', async () => {
    const c = await setup();
    try {
      expect((await send(c)).status).toBe(200);
      c.secrets.hang = true;
      const t0 = Date.now();
      const m = await mint(c);
      expect(Date.now() - t0).toBeLessThan(4_000);
      expect(m.body).toMatchObject({ codeAvailable: false, codesRemaining: 1, liveCode: true, liveCodeDelivery: 'sent' });
    } finally {
      await teardown(c.t);
    }
  });

  it('AC1 / AC2 (WC17) — a member past signup (`lock-in`) ⇒ codeAvailable false and the send 409 code_not_offered (⛔ Secret Manager read at the mint)', async () => {
    const c = await setup();
    try {
      await c.t.deps.pool.query(
        `INSERT INTO events_log (stream_id, pariwar_id, event_type, event_version, payload, actor_id)
         SELECT $1, $2, 'member.vyawastha_shulk_paid', max(event_version) + 1, '{}'::jsonb, $1 FROM events_log WHERE stream_id = $1`,
        [c.memberId, c.pariwarId],
      );
      const reads: string[] = [];
      c.secrets.onRead = async (name) => {
        reads.push(name);
      };
      expect((await mint(c)).body).toMatchObject({ codeAvailable: false });
      expect(reads).toHaveLength(0);
      const r = await send(c);
      expect(r.status).toBe(409);
      expect(errOf(r).code).toBe('wa_opt_in.code_not_offered');
      expect(c.decrypts.n).toBe(0);
    } finally {
      await teardown(c.t);
    }
  });

  it('AC1 / AC2 / AC5 (WC15) — a member with a REVOKED row ⇒ codeAvailable false, the send 409 code_not_offered', async () => {
    const c = await setup();
    try {
      await c.t.deps.pool.query(
        `INSERT INTO member_wa_opt_in (pariwar_id, member_id, state, verification_phrase, mobile_blind_index, created_at)
         VALUES ($1, $2, 'REVOKED', $3, 'old', now() - interval '3 days')`,
        [c.pariwarId, c.memberId, waOptIn.generateVerificationPhrase()],
      );
      expect((await mint(c)).body).toMatchObject({ codeAvailable: false });
      const r = await send(c);
      expect(errOf(r).code).toBe('wa_opt_in.code_not_offered');
      expect(c.t.waCodeFetch.calls).toHaveLength(0);
    } finally {
      await teardown(c.t);
    }
  });

  // ── AC2 — a send ──────────────────────────────────────────────────────────────────────────────────────────────────────────

  it('⭐ AC2 / AC7 — the happy path: to the identity\'s REAL decrypted mobile (⛔ `+`), the body + button carry the code, ONLY its hash stored, 10 minutes', async () => {
    const c = await setup();
    try {
      const r = await send(c);
      expect(r.status).toBe(200);
      expect(r.body).toMatchObject({ delivery: 'sent', codesRemaining: 1 });
      expect(r.body.retryAfterSeconds).toBeGreaterThanOrEqual(58);
      expect(c.t.waCodeFetch.calls).toHaveLength(1);
      expect(c.t.waCodeFetch.calls[0]!.url).toBe('https://graph.facebook.com/v21.0/1234567890/messages');
      expect(c.t.waCodeFetch.calls[0]!.init.headers.Authorization).toBe('Bearer meta-system-user-token');
      const body = c.t.waCodeFetch.bodyOf(0);
      expect(body.to).toBe(`91${c.mobile}`);
      const code = sentCode(c, 0);
      expect(code).toMatch(/^\d{6}$/);
      expect(body.template).toEqual({
        name: 'wa_opt_in_code_hi',
        language: { code: 'hi' },
        components: [
          { type: 'body', parameters: [{ type: 'text', text: code }] },
          { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: code }] },
        ],
      });
      const [row] = await codeRows(c);
      expect(row).toMatchObject({ send_seq: 1, send_outcome: 'accepted', provider_message_id: 'wamid.TEST-1', attempts: 0, ttl: 600, member_id: c.memberId });
      expect(row!.code_hash).toMatch(/^[0-9a-f]{64}$/);
      expect(row!.code_hash).not.toContain(code);
      expect(c.decrypts.n).toBe(1);
      expect(r.raw).not.toContain(code);
    } finally {
      await teardown(c.t);
    }
  });

  it('AC2 — step-0 refusals answer with ⛔ fetch, ⛔ audit line, ⛔ decrypt: not_pending, channel_unavailable, too_soon, limit', async () => {
    const none = await setup({ mint: false });
    try {
      const r = await send(none);
      expect(r.status).toBe(409);
      expect(errOf(r)).toMatchObject({ code: 'wa_opt_in.not_pending', details: { codesRemaining: 0, liveCode: false } });
      expect(none.decrypts.n).toBe(0);
      expect(await auditActions(none)).toHaveLength(0);
    } finally {
      await teardown(none.t);
    }
    const c = await setup();
    try {
      expect((await send(c)).status).toBe(200);
      c.decrypts.n = 0;
      const soon = await send(c);
      expect(soon.status).toBe(409);
      expect(errOf(soon)).toMatchObject({ code: 'wa_opt_in.code_resend_too_soon', details: { codesRemaining: 1, liveCode: true } });
      expect(errOf(soon).details!.retryAfterSeconds).toBeGreaterThan(50);
      await backdate(c, 61);
      expect((await send(c)).status).toBe(200);
      c.decrypts.n = 0;
      const spent = await send(c);
      expect(errOf(spent)).toMatchObject({ code: 'wa_opt_in.code_limit_reached', details: { codesRemaining: 0, liveCode: true } });
      await c.t.deps.pool.query(`UPDATE pariwar_wa_config SET enabled = false WHERE pariwar_id = $1`, [c.pariwarId]);
      expect(errOf(await send(c)).code).toBe('wa_opt_in.channel_unavailable');
      expect(c.decrypts.n).toBe(0);
      expect(c.t.waCodeFetch.calls).toHaveLength(2);
      expect((await auditActions(c)).filter((a) => a.action === 'member.wa_opt_in_code_sent')).toHaveLength(2);
    } finally {
      await teardown(c.t);
    }
  });

  it('⭐ AC2 — the ORDER: unprovisioned + two codes spent ⇒ 409 code_limit_reached (⛔ 503); ACTIVE + WhatsApp off ⇒ channel_unavailable', async () => {
    const c = await setup();
    try {
      expect((await send(c)).status).toBe(200);
      await backdate(c, 61);
      expect((await send(c)).status).toBe(200);
      c.secrets.values.clear();
      expect(errOf(await send(c)).code).toBe('wa_opt_in.code_limit_reached');
      c.secrets.values.set(`wa.template.wa_opt_in.code.hi.${c.pariwarId}`, 'wa_opt_in_code_hi');
      expect((await verifyCode(c, sentCode(c, 1))).status).toBe(200);
      expect(errOf(await send(c)).code).toBe('wa_opt_in.already_active');
      await c.t.deps.pool.query(`UPDATE pariwar_wa_config SET enabled = false WHERE pariwar_id = $1`, [c.pariwarId]);
      expect(errOf(await send(c)).code).toBe('wa_opt_in.channel_unavailable');
    } finally {
      await teardown(c.t);
    }
  });

  it('AC2 — WhatsApp switched OFF between step 0 and tx 1 ⇒ channel_unavailable, ⛔ row, ⛔ fetch, exactly ONE decrypt (step 1 ran)', async () => {
    const c = await setup();
    try {
      c.secrets.onRead = async (name) => {
        if (name === TOKEN_NAME) await c.t.deps.pool.query(`UPDATE pariwar_wa_config SET enabled = false WHERE pariwar_id = $1`, [c.pariwarId]);
      };
      const r = await send(c);
      expect(r.status).toBe(409);
      expect(errOf(r).code).toBe('wa_opt_in.channel_unavailable');
      expect(await codeRows(c)).toHaveLength(0);
      expect(c.t.waCodeFetch.calls).toHaveLength(0);
      expect(c.decrypts.n).toBe(1);
      expect((await auditActions(c)).map((a) => a.action)).toEqual(['member.wa_opt_in_requested']);
    } finally {
      await teardown(c.t);
    }
  });

  it('AC2 / AC8 — a name that resolved at the mint and fails at the send ⇒ 503, ⛔ row, ⛔ audit line, ⛔ fetch; a resolve that hangs ⇒ 503 inside the bound', async () => {
    const c = await setup();
    try {
      expect((await mint(c)).body).toMatchObject({ codeAvailable: true });
      c.secrets.values.delete(`wa.template.wa_opt_in.code.hi.${c.pariwarId}`);
      c.secrets.values.delete(`wa.template.wa_opt_in.code.en.${c.pariwarId}`);
      const r = await send(c);
      expect(r.status).toBe(503);
      expect(errOf(r).code).toBe('wa_opt_in.code_unavailable');
      c.secrets.values.set(`wa.template.wa_opt_in.code.hi.${c.pariwarId}`, 'wa_opt_in_code_hi');
      c.secrets.hang = true;
      const t0 = Date.now();
      const hung = await send(c);
      expect(Date.now() - t0).toBeLessThan(5_000);
      expect(errOf(hung).code).toBe('wa_opt_in.code_unavailable');
      expect(await codeRows(c)).toHaveLength(0);
      expect(c.t.waCodeFetch.calls).toHaveLength(0);
      expect((await auditActions(c)).map((a) => a.action)).toEqual(['member.wa_opt_in_requested']);
      expect(c.t.waCodeFetch.logLines.map((l) => l.detail)).toEqual(expect.arrayContaining(['template_unresolved', 'resolve_timeout']));
    } finally {
      await teardown(c.t);
    }
  });

  // ⭐ WC3's table, driven by the recorded transport.
  it.each<[string, Parameters<TestApp['waCodeFetch']['script']>[0], { status: number; code?: string; outcome: string; detail: string | null; counted: boolean; waits: boolean }]>([
    ['429 (no code)', metaError(429), { status: 502, code: 'wa_opt_in.code_send_failed', outcome: 'released', detail: 'rate_limited:none', counted: false, waits: true }],
    ['connection refused', { reject: refused('ECONNREFUSED') }, { status: 502, code: 'wa_opt_in.code_send_failed', outcome: 'released', detail: 'api_unavailable:000', counted: false, waits: false }],
    ['503', metaError(503), { status: 200, outcome: 'may_have_sent', detail: 'api_unavailable:503', counted: true, waits: true }],
    ['502 (a gateway)', metaError(502), { status: 200, outcome: 'may_have_sent', detail: 'may_have_sent:gateway_502', counted: true, waits: true }],
    ['131026 (not on WhatsApp)', metaError(400, 131026), { status: 502, code: 'wa_opt_in.code_send_failed', outcome: 'refused', detail: 'recipient:meta_131026', counted: true, waits: false }],
    ['⭐ 131048 on a 429 (scope, F12 order)', metaError(429, 131048), { status: 503, code: 'wa_opt_in.code_unavailable', outcome: 'released', detail: 'scope:meta_131048', counted: false, waits: false }],
    ['401 (the token)', metaError(401, 190), { status: 503, code: 'wa_opt_in.code_unavailable', outcome: 'released', detail: 'scope:auth', counted: false, waits: false }],
    ['an unknown refusal', metaError(400, 100), { status: 502, code: 'wa_opt_in.code_send_failed', outcome: 'refused', detail: 'unknown_scope:meta_100', counted: true, waits: false }],
    ['a 2xx without a wamid', { status: 200, body: {} }, { status: 200, outcome: 'may_have_sent', detail: 'may_have_sent:no_wamid', counted: true, waits: true }],
  ])('⭐ AC2 / WC3 — %s', async (_name, answer, want) => {
    const c = await setup();
    try {
      c.t.waCodeFetch.script(answer);
      const r = await send(c);
      expect(r.status).toBe(want.status);
      if (want.code) expect(errOf(r).code).toBe(want.code);
      // ⭐ Read on a SEPARATE connection AFTER the answer — the outcome was COMMITTED before the error (T14).
      const [row] = await codeRows(c);
      expect(row).toMatchObject({ send_outcome: want.outcome, detail: want.detail });
      const remaining = want.counted ? 1 : 2;
      if (want.status === 200) expect(r.body).toMatchObject({ delivery: 'uncertain', codesRemaining: 1 });
      else expect(errOf(r).details).toMatchObject({ codesRemaining: remaining });
      const wait = want.status === 200 ? r.body.retryAfterSeconds : errOf(r).details!.retryAfterSeconds;
      if (want.waits) expect(wait).toBeGreaterThan(50);
      else expect(wait).toBeNull();
      const actions = (await auditActions(c)).map((a) => a.action);
      expect(actions.filter((a) => a === 'member.wa_opt_in_code_released')).toHaveLength(want.outcome === 'released' ? 1 : 0);
      expect(actions.some((a) => a.endsWith('_rolled_back'))).toBe(false);
    } finally {
      await teardown(c.t);
    }
  });

  it('⭐ AC2 — a released first send ⇒ codesRemaining 2 and an immediate retry takes seq 1 again', async () => {
    const c = await setup();
    try {
      c.t.waCodeFetch.script({ reject: refused('ENOTFOUND') });
      const r = await send(c);
      expect(errOf(r).details).toMatchObject({ codesRemaining: 2, liveCode: false, retryAfterSeconds: null });
      const again = await send(c);
      expect(again.status).toBe(200);
      expect((await codeRows(c)).map((x) => [x.send_seq, x.send_outcome])).toEqual([[1, 'released'], [1, 'accepted']]);
    } finally {
      await teardown(c.t);
    }
  });

  it('⭐ AC2 — a REAL timeout abort (the test-controlled signal) ⇒ counted, 200 `uncertain`', async () => {
    const c = await setup();
    try {
      c.t.waCodeFetch.script({ hang: true });
      const pending = send(c);
      for (let i = 0; i < 200 && c.t.waCodeFetch.calls.length === 0; i++) await new Promise((r) => setTimeout(r, 10));
      c.t.waCodeFetch.abortAll();
      const r = await pending;
      expect(r.status).toBe(200);
      expect(r.body).toMatchObject({ delivery: 'uncertain', codesRemaining: 1 });
      expect((await codeRows(c))[0]).toMatchObject({ send_outcome: 'may_have_sent', detail: 'may_have_sent:timeout' });
    } finally {
      await teardown(c.t);
    }
  });

  it('AC2 — another member\'s PENDING is never used (two members, one Pariwar)', async () => {
    const c = await setup();
    try {
      // A second member in the same Pariwar mints but never sends.
      const mobile = randomMobile();
      await inject(c.t, 'POST', `${AUTH}/otp/request`, { payload: { mobile } });
      const otp = c.t.stepUpDelivery.last?.code as string;
      const v = await inject(c.t, 'POST', `${AUTH}/otp/verify`, { payload: { mobile, otp, deviceId: 'd2' } });
      const created = await inject(c.t, 'POST', `${AUTH}/signup/create`, { payload: { mobile, deviceId: 'd2' }, token: v.body.signupContinuationToken as string });
      const other = created.body.accessToken as string;
      await inject(c.t, 'POST', '/api/v1/member/kyc/manual', { payload: { name: 'Ram Devi', dob: '1990-01-01' }, token: other });
      expect((await inject(c.t, 'POST', '/api/v1/member/wa-opt-in', { token: other })).status).toBe(200);
      expect((await send(c)).status).toBe(200);
      const rows = await codeRows(c);
      expect(rows).toHaveLength(1);
      expect(rows[0]!.member_id).toBe(c.memberId);
      expect(c.t.waCodeFetch.bodyOf(0).to).toBe(`91${c.mobile}`);
    } finally {
      await teardown(c.t);
    }
  });

  it('⭐ AC3 — three CONCURRENT sends for one PENDING ⇒ EXACTLY one counted row, two 409 code_resend_too_soon (the lock)', async () => {
    const c = await setup();
    try {
      const results = await Promise.all([send(c), send(c), send(c)]);
      expect(results.map((r) => r.status).sort()).toEqual([200, 409, 409]);
      expect(results.filter((r) => r.status === 409).map((r) => errOf(r).code)).toEqual(['wa_opt_in.code_resend_too_soon', 'wa_opt_in.code_resend_too_soon']);
      expect(await codeRows(c)).toHaveLength(1);
      expect(c.t.waCodeFetch.calls).toHaveLength(1);
    } finally {
      await teardown(c.t);
    }
  });

  // ── AC4 / AC5 — a typed code ─────────────────────────────────────────────────────────────────────────────────────────────

  it('⭐ AC4 / AC5 / AC11 — a correct code: consumed, ONE consent row (member_self, the signup context), PENDING → ACTIVE with ⛔ window; the same yes everywhere', async () => {
    const c = await setup();
    try {
      expect((await send(c)).status).toBe(200);
      const code = sentCode(c, 0);
      const r = await verifyCode(c, code);
      expect(r.status).toBe(200);
      expect(r.body).toEqual({ state: 'ACTIVE' });
      const [row] = await codeRows(c);
      expect(row).toMatchObject({ consumed: true, attempts: 0 });
      const opt = await c.t.deps.pool.query<{ state: string; window_expires_at: Date | null; consent_id: string | null }>(
        `SELECT state, window_expires_at, consent_id FROM member_wa_opt_in WHERE pariwar_id = $1 AND member_id = $2`, [c.pariwarId, c.memberId],
      );
      expect(opt.rows).toHaveLength(1);
      expect(opt.rows[0]).toMatchObject({ state: 'ACTIVE', window_expires_at: null });
      const cons = await c.t.deps.pool.query<{ consent_id: string; granted_via_actor: string; consent_payload: Json; audit_id: string }>(
        `SELECT consent_id, granted_via_actor, consent_payload, audit_id FROM consent_records WHERE pariwar_id = $1 AND subject_id = $2 AND consent_type = 'whatsapp_opt_in'`,
        [c.pariwarId, c.memberId],
      );
      expect(cons.rows).toHaveLength(1);
      expect(cons.rows[0]!.consent_id).toBe(opt.rows[0]!.consent_id);
      expect(cons.rows[0]).toMatchObject({
        granted_via_actor: 'member_self',
        consent_payload: { source: 'member_app_wa_code', uiContext: 'signup', memberState: 'pending-fee', codeId: row!.code_id },
      });
      // The audit line is the consent's (audit-first).
      const audits = await auditActions(c);
      expect(audits.map((a) => a.action)).toEqual(['member.wa_opt_in_requested', 'member.wa_opt_in_code_sent', 'member.wa_opt_in_activated']);
      expect(audits.every((a) => a.actor_id === c.memberId && a.resource_locator === `pariwar/${c.pariwarId}/member/${c.memberId}/wa-opt-in`)).toBe(true);
      // AC5 — the same yes.
      const status = await inject(c.t, 'GET', '/api/v1/member/wa-opt-in', { token: c.session });
      expect(status.body).toMatchObject({ state: 'ACTIVE', windowExpiresAt: null });
      const scope = { pariwarId: ids.pariwarId(c.pariwarId), memberId: ids.memberId(c.memberId) };
      expect(await waOptIn.isOptInActive(c.t.deps.db, scope)).toBe(true);
      expect(await consent.consentExists(c.t.deps.db, scope.pariwarId, c.memberId, 'whatsapp_opt_in')).toBe(true);
      expect(errOf(await mint(c)).code).toBe('wa_opt_in.already_active');
      expect(errOf(await verifyCode(c, code)).code).toBe('wa_opt_in.already_active');
      // The in-app withdraw ends it; a new request after it is ⛔ offered a code (WC15).
      expect((await inject(c.t, 'DELETE', '/api/v1/member/wa-opt-in', { token: c.session })).body).toEqual({ state: 'REVOKED' });
      expect(await waOptIn.isOptInActive(c.t.deps.db, scope)).toBe(false);
      expect((await mint(c)).body).toMatchObject({ state: 'PENDING', codeAvailable: false });
      expect(errOf(await send(c)).code).toBe('wa_opt_in.code_not_offered');
    } finally {
      await teardown(c.t);
    }
  });

  it('⭐ AC4 / AC11 — a wrong code: the attempt COMMITTED (separate connection), 409 code_wrong, ⛔ activated line; the second wrong try kills it', async () => {
    const c = await setup();
    try {
      expect((await send(c)).status).toBe(200);
      const code = sentCode(c, 0);
      const wrong = code === '000000' ? '111111' : '000000';
      const first = await verifyCode(c, wrong);
      expect(first.status).toBe(409);
      expect(errOf(first)).toMatchObject({ code: 'wa_opt_in.code_wrong', details: { attemptsRemaining: 1, codesRemaining: 1, liveCode: true } });
      expect((await codeRows(c))[0]).toMatchObject({ attempts: 1, invalidated: false });
      const actions = (await auditActions(c)).map((a) => a.action);
      expect(actions).toContain('member.wa_opt_in_code_rejected');
      expect(actions.some((a) => a.startsWith('member.wa_opt_in_activated'))).toBe(false);
      expect(actions.some((a) => a.endsWith('_rolled_back'))).toBe(false);
      const second = await verifyCode(c, wrong);
      expect(errOf(second)).toMatchObject({ code: 'wa_opt_in.code_wrong', details: { attemptsRemaining: 0, codesRemaining: 1, liveCode: false } });
      expect((await codeRows(c))[0]).toMatchObject({ attempts: 2, invalidated: true });
      // The right code is dead now; ⛔ live code ⇒ code_no_longer_valid (and the try is still audited).
      const late = await verifyCode(c, code);
      expect(errOf(late)).toMatchObject({ code: 'wa_opt_in.code_no_longer_valid', details: { codesRemaining: 1, liveCode: false } });
      expect((await auditActions(c)).filter((a) => a.action === 'member.wa_opt_in_code_rejected')).toHaveLength(3);
      // A malformed code is a 400 and spends ⛔ attempt.
      const bad = await verifyCode(c, '12345');
      expect(bad.status).toBe(400);
      expect(errOf(bad).code).toBe('request.validation');
      expect((await codeRows(c))[0]!.attempts).toBe(2);
    } finally {
      await teardown(c.t);
    }
  });

  it('⭐ AC4 (WC16) — two live codes: a wrong guess increments BOTH; code #1 typed after an accepted send #2 ⇒ 200', async () => {
    const c = await setup();
    try {
      expect((await send(c)).status).toBe(200);
      await backdate(c, 61);
      expect((await send(c)).status).toBe(200);
      const [one, two] = [sentCode(c, 0), sentCode(c, 1)];
      const wrong = ['000000', '111111', '222222'].find((x) => x !== one && x !== two)!;
      expect(errOf(await verifyCode(c, wrong))).toMatchObject({ code: 'wa_opt_in.code_wrong', details: { attemptsRemaining: 1, codesRemaining: 0, liveCode: true } });
      expect((await codeRows(c)).map((r) => r.attempts)).toEqual([1, 1]);
      expect((await verifyCode(c, one)).status).toBe(200);
      const rows = await codeRows(c);
      expect(rows.map((r) => r.consumed)).toEqual([true, false]);
    } finally {
      await teardown(c.t);
    }
  });

  it('AC4 — ⛔ PENDING ⇒ not_pending; an expired code ⇒ code_no_longer_valid; two concurrent correct verifies ⇒ one 200, one 409', async () => {
    const none = await setup({ mint: false });
    try {
      expect(errOf(await verifyCode(none, '123456')).code).toBe('wa_opt_in.not_pending');
    } finally {
      await teardown(none.t);
    }
    const c = await setup();
    try {
      expect((await send(c)).status).toBe(200);
      const code = sentCode(c, 0);
      await backdate(c, 601);
      expect(errOf(await verifyCode(c, code))).toMatchObject({ code: 'wa_opt_in.code_no_longer_valid', details: { liveCode: false, codesRemaining: 1 } });
      expect((await send(c)).status).toBe(200);
      const fresh = sentCode(c, 1);
      const both = await Promise.all([verifyCode(c, fresh), verifyCode(c, fresh)]);
      expect(both.map((r) => r.status).sort()).toEqual([200, 409]);
      expect(errOf(both.find((r) => r.status === 409)!).code).toBe('wa_opt_in.already_active');
    } finally {
      await teardown(c.t);
    }
  });

  it('⭐ AC4 — activateOptIn loses (the named seam): 409 invalid_state, the whole tx rolled back (the code NOT consumed, ⛔ consent row), a `_rolled_back` line', async () => {
    const c = await setup({
      overrides: {
        waOptInActivate: async (_db, input) => {
          throw new waOptIn.WaOptInStateError(input.optInId, 'not PENDING — cannot activate');
        },
      },
    });
    try {
      expect((await send(c)).status).toBe(200);
      const r = await verifyCode(c, sentCode(c, 0));
      expect(r.status).toBe(409);
      expect(errOf(r).code).toBe('wa_opt_in.invalid_state');
      expect((await codeRows(c))[0]).toMatchObject({ consumed: false });
      const cons = await c.t.deps.pool.query(`SELECT 1 FROM consent_records WHERE pariwar_id = $1 AND subject_id = $2`, [c.pariwarId, c.memberId]);
      expect(cons.rows).toHaveLength(0);
      const actions = (await auditActions(c)).map((a) => a.action);
      expect(actions.slice(-2)).toEqual(['member.wa_opt_in_activated', 'member.wa_opt_in_activated_rolled_back']);
    } finally {
      await teardown(c.t);
    }
  });

  // ── AC6 / AC11 — nothing leaks; every line through the wrapper ───────────────────────────────────────────────────────────────

  it('⭐ AC6 — across send → wrong → correct: ⛔ response, audit row or log line holds the code or its hash; the log ⛔ a secret name / the mobile', async () => {
    const c = await setup();
    try {
      const bodies: string[] = [];
      const s = await send(c);
      bodies.push(s.raw);
      const code = sentCode(c, 0);
      const hash = (await codeRows(c))[0]!.code_hash;
      bodies.push((await verifyCode(c, code === '000000' ? '111111' : '000000')).raw);
      bodies.push((await verifyCode(c, code)).raw);
      bodies.push((await mint(c)).raw);
      const audits = await c.t.deps.pool.query<{ row: string }>(`SELECT to_jsonb(a)::text AS row FROM audit_log_entries a WHERE pariwar_id = $1`, [c.pariwarId]);
      for (const text of [...bodies, ...audits.rows.map((r) => r.row), ...c.t.waCodeFetch.logLines.map((l) => JSON.stringify(l))]) {
        expect(text).not.toContain(code);
        expect(text).not.toContain(hash);
      }
      for (const l of c.t.waCodeFetch.logLines) {
        const line = JSON.stringify(l);
        expect(line).not.toContain(c.mobile);
        expect(line).not.toContain(TOKEN_NAME);
        expect(line).not.toContain('meta-system-user-token');
        expect(line).not.toContain('wa.template.');
      }
    } finally {
      await teardown(c.t);
    }
  });

  it('WC10 — the per-member route limit (writeRateMax / minute) answers 429 on top of the database caps', async () => {
    // WRITE_RATE_MAX gates only member WRITE routes — ⛔ the OTP / signup / KYC / mint routes the setup drives.
    const c = await setup({ env: { WRITE_RATE_MAX: '2' } });
    try {
      const max = c.t.deps.config.writeRateMax;
      const answers: { status: number; body: Json }[] = [];
      for (let i = 0; i <= max; i++) answers.push(await verifyCode(c, '000000'));
      expect(answers.slice(0, max).every((a) => a.status === 409)).toBe(true);
      expect(answers[max]!.status).toBe(429);
      // The app's 429 arm keys on this code (AC9) — it carries ⛔ WaOptInCodeErrorDetails.
      expect(errOf(answers[max]!).code).toBe('rate_limit.exceeded');
      // The send route has its OWN budget (per route): 200, then the database's 409 (the wait), then 429.
      expect([(await send(c)).status, (await send(c)).status, (await send(c)).status]).toEqual([200, 409, 429]);
    } finally {
      await teardown(c.t);
    }
  });
});

// ── Source legs — what CI's superuser and the invariant gate cannot see (T19, F18 (f), AC6, AC8) ─────────────────────────────────

/** Comments stripped (a cite in a comment is ⛔ code). */
const code = (rel: string): string => src(rel).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

describe('Story 5.13 — source legs', () => {
  it('⭐ AC2 / T19 — ⛔ `deps.db` / `deps.pool` handed to a domain read in the code handlers, the delivery or the mint (every read is in a scope tx)', () => {
    for (const f of ['modules/wa-opt-in/code-handlers.ts', 'modules/wa-opt-in/code-delivery.ts', 'modules/wa-opt-in/handlers.ts']) {
      expect(code(f), f).not.toMatch(/\(\s*deps\.(db|pool|serviceDb)\b/);
    }
  });

  it('⭐ AC4 / F18 — the verify compare is constant-time: `timingSafeHashCompare(` present; ⛔ `===` / `!==` touching a code hash', () => {
    const h = code('modules/wa-opt-in/code-handlers.ts');
    expect(h).toContain('timingSafeHashCompare(');
    expect(h).not.toMatch(/codeHash\s*[!=]==|[!=]==\s*\w*\.?codeHash/);
  });

  it('⭐ AC6 (I4) — the module imports ⛔ member-otp.service or the auth repo (only the otp.ts primitives); ⛔ member_auth_otps', () => {
    for (const f of ['modules/wa-opt-in/code-handlers.ts', 'modules/wa-opt-in/code-delivery.ts', 'modules/wa-opt-in/handlers.ts', 'modules/wa-opt-in/routes.ts']) {
      const s = code(f);
      expect(s, f).not.toMatch(/member-otp\.service|auth\/member\/repo|auth\/.*repo\.js|member_auth_otps|memberAuthOtps/);
    }
    expect(code('modules/wa-opt-in/code-handlers.ts')).toContain("from '../auth/shared/otp.js'");
  });

  it('⭐ AC8 (T9) — ⛔ fixture / stand-in: code-delivery.ts and deps.ts\'s code wiring select ⛔ `createFixtureWhatsappProvider`', () => {
    expect(code('modules/wa-opt-in/code-delivery.ts')).not.toMatch(/[Ff]ixture/);
    const deps = code('deps.ts');
    const wiring = deps.slice(deps.indexOf('waCodeTransport:'), deps.indexOf('waOptInActivate:'));
    expect(wiring).toContain('fetch(url, init');
    expect(wiring).not.toMatch(/[Ff]ixture|reveal|isProd/);
  });
});
