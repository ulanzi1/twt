// Story 6.35 (Task 2.5; AC2, AC9, I1, I7) — GET / PUT /api/v1/member/language, E2E on a live DB (own-committing seeds; random ids).
//   · GET with ⛔ choice ⇒ `{ chosenLocale: null, pariwarDefaultLocale }`, and a member who only GETs stays NULL (AC9 / I1);
//   · PUT `en` ⇒ recorded + `set_at` set; a repeat ⇒ 200, ⛔ second audit line, `set_at` unchanged; PUT `hi` ⇒ changes, audits once;
//   · ⛔ token ⇒ 401; `fr` or an extra key ⇒ 400; a member of Pariwar B ⛔ reaches Pariwar A's row;
//   · the audit context is EXACTLY `{ locale }` (the in-memory sink stores it RAW) and is emitted AFTER the commit (a forced COMMIT
//     failure ⇒ 5xx and ⛔ line — the channel-webhooks-msg91 precedent); ⛔ passport ⇒ 503.

import { randomUUID } from 'node:crypto';

import { ids, member as memberDomain } from '@twt/domain';
import type pg from 'pg';
import { describe, expect, it } from 'vitest';

import type { AppDeps } from '../../../src/context.js';
import { signAccessToken } from '../../../src/modules/auth/member/tokens.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { buildServer } from '../../../src/server.js';
import { createTestApp, hasDatabase, teardown, type TestApp } from '../_setup.js';

const ACCESS_TTL_MS = 15 * 60 * 1000;
const PATH = '/api/v1/member/language';
type Json = Record<string, unknown>;

async function seedPassport(t: TestApp, pariwarId: string, localeDefault: 'hi' | 'en'): Promise<void> {
  await t.pool.query(
    `INSERT INTO pariwar_passport (pariwar_id, display_name_en, display_name_hi, legal_name, branding_bundle, locale_default)
     VALUES ($1, 'P', 'प', 'P Trust', $2, $3) ON CONFLICT (pariwar_id) DO NOTHING`,
    [pariwarId, JSON.stringify({ logo_url: 'https://x/l.png', primary_color: '#0A3D62', secondary_color: '#FFFFFF' }), localeDefault],
  );
}

async function seedMember(t: TestApp, pariwarId: string): Promise<string> {
  const memberId = randomUUID();
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
  return memberId;
}

async function call(
  app: TestApp['app'],
  method: 'GET' | 'PUT',
  opts: { payload?: Json; token?: string } = {},
): Promise<{ status: number; body: Json }> {
  const res = await app.inject({
    method,
    url: PATH,
    ...(opts.payload !== undefined ? { payload: opts.payload } : {}),
    headers: opts.token ? { authorization: `Bearer ${opts.token}` } : {},
  });
  let body: Json = {};
  try {
    body = res.json();
  } catch {
    body = {};
  }
  return { status: res.statusCode, body };
}

async function rowOf(t: TestApp, memberId: string) {
  return (
    await t.pool.query<{ preferred_locale: string | null; preferred_locale_set_at: Date | null }>(
      `SELECT preferred_locale::text AS preferred_locale, preferred_locale_set_at FROM members WHERE member_id = $1`,
      [memberId],
    )
  ).rows[0]!;
}

async function world(t: TestApp, localeDefault: 'hi' | 'en' = 'hi') {
  const pariwarId = randomUUID();
  await seedPassport(t, pariwarId, localeDefault);
  const memberId = await seedMember(t, pariwarId);
  return { pariwarId, memberId, tok: signAccessToken(t.app, { memberId, pariwarId, deviceId: 'test-device' }, ACCESS_TTL_MS) };
}

const changedLines = (t: TestApp) => t.auditSink.ofType('member.language_changed') as { context?: Json }[];

describe.skipIf(!hasDatabase)('Story 6.35 — the member language routes (E2E, live DB)', { timeout: 30000 }, () => {
  it('⭐ AC9 / I1 — GET with ⛔ choice ⇒ null + the Pariwar\'s default; a member who only GETs stays NULL; ⛔ audit line', async () => {
    const t = await createTestApp();
    try {
      const w = await world(t, 'en');
      for (let i = 0; i < 3; i += 1) {
        const r = await call(t.app, 'GET', { token: w.tok });
        expect(r).toEqual({ status: 200, body: { chosenLocale: null, pariwarDefaultLocale: 'en' } });
      }
      expect(await rowOf(t, w.memberId)).toEqual({ preferred_locale: null, preferred_locale_set_at: null });
      expect(changedLines(t)).toHaveLength(0);
    } finally {
      await teardown(t);
    }
  });

  it('⭐ PUT en ⇒ recorded + audited `{ locale }` once; a repeat ⇒ 200, ⛔ second line, `set_at` unchanged; PUT hi ⇒ changes, audits once', async () => {
    const t = await createTestApp();
    try {
      const w = await world(t);
      const first = await call(t.app, 'PUT', { token: w.tok, payload: { locale: 'en' } });
      expect(first).toEqual({ status: 200, body: { chosenLocale: 'en', pariwarDefaultLocale: 'hi' } });
      const row1 = await rowOf(t, w.memberId);
      expect(row1.preferred_locale).toBe('en');
      expect(row1.preferred_locale_set_at).not.toBeNull();
      expect(changedLines(t)).toHaveLength(1);
      // I7 — the context is EXACTLY the locale (the in-memory sink stores it raw; the hash happens in the real sink).
      expect(changedLines(t).at(-1)!.context).toEqual({ locale: 'en' });
      // A repeat (a separate request — a separate transaction, T11): ⛔ write, ⛔ line.
      const again = await call(t.app, 'PUT', { token: w.tok, payload: { locale: 'en' } });
      expect(again).toEqual({ status: 200, body: { chosenLocale: 'en', pariwarDefaultLocale: 'hi' } });
      expect((await rowOf(t, w.memberId)).preferred_locale_set_at?.toISOString()).toBe(row1.preferred_locale_set_at?.toISOString());
      expect(changedLines(t)).toHaveLength(1);
      expect((await call(t.app, 'GET', { token: w.tok })).body).toEqual({ chosenLocale: 'en', pariwarDefaultLocale: 'hi' });
      const back = await call(t.app, 'PUT', { token: w.tok, payload: { locale: 'hi' } });
      expect(back.body).toEqual({ chosenLocale: 'hi', pariwarDefaultLocale: 'hi' });
      expect((await rowOf(t, w.memberId)).preferred_locale).toBe('hi');
      expect(changedLines(t)).toHaveLength(2);
      expect(changedLines(t).at(-1)!.context).toEqual({ locale: 'hi' });
    } finally {
      await teardown(t);
    }
  });

  it('⛔ token ⇒ 401 (both routes); `fr` / an extra key / ⛔ body ⇒ 400 and ⛔ write', async () => {
    const t = await createTestApp();
    try {
      const w = await world(t);
      expect((await call(t.app, 'GET')).status).toBe(401);
      expect((await call(t.app, 'PUT', { payload: { locale: 'en' } })).status).toBe(401);
      expect((await call(t.app, 'PUT', { token: w.tok, payload: { locale: 'fr' } })).status).toBe(400);
      expect((await call(t.app, 'PUT', { token: w.tok, payload: { locale: 'en', memberId: randomUUID() } })).status).toBe(400);
      expect((await call(t.app, 'PUT', { token: w.tok, payload: {} })).status).toBe(400);
      expect((await rowOf(t, w.memberId)).preferred_locale).toBeNull();
      expect(changedLines(t)).toHaveLength(0);
    } finally {
      await teardown(t);
    }
  });

  it('a member of Pariwar B ⛔ reaches Pariwar A\'s row (a token naming B\'s Pariwar with A\'s member ⇒ 409, A untouched)', async () => {
    const t = await createTestApp();
    try {
      const a = await world(t);
      const b = await world(t);
      const forged = signAccessToken(t.app, { memberId: a.memberId, pariwarId: b.pariwarId, deviceId: 'test-device' }, ACCESS_TTL_MS);
      const r = await call(t.app, 'PUT', { token: forged, payload: { locale: 'en' } });
      expect(r.status).toBe(409);
      expect((r.body.error as { code?: string }).code).toBe('member_language.member_missing');
      expect((await rowOf(t, a.memberId)).preferred_locale).toBeNull();
      // B's own member is unaffected too
      expect((await rowOf(t, b.memberId)).preferred_locale).toBeNull();
    } finally {
      await teardown(t);
    }
  });

  it('⛔ passport ⇒ 503 (T7 — ⛔ a bare 500)', async () => {
    const t = await createTestApp();
    try {
      const pariwarId = randomUUID();
      const memberId = await seedMember(t, pariwarId);
      const tok = signAccessToken(t.app, { memberId, pariwarId, deviceId: 'test-device' }, ACCESS_TTL_MS);
      const r = await call(t.app, 'GET', { token: tok });
      expect(r.status).toBe(503);
      expect((r.body.error as { code?: string }).code).toBe('member_language.passport_missing');
      expect((await call(t.app, 'PUT', { token: tok, payload: { locale: 'en' } })).status).toBe(503);
    } finally {
      await teardown(t);
    }
  });

  it('the PUT is rate-limited PER MEMBER: the N+1th PUT of one member is 429; another member in the same Pariwar is untouched', async () => {
    // 6.35 second review — asserted by construction only before: `perMemberKey` + `hook: 'preHandler'` ⇒ the bucket is the
    // member's actorId, ⛔ the shared IP (the 6.36a `workplace.spec.ts` shape, a LOW ceiling by env override).
    const t = await createTestApp({ env: { WRITE_RATE_MAX: '2' } });
    try {
      const w = await world(t);
      const other = await seedMember(t, w.pariwarId);
      const tokOther = signAccessToken(t.app, { memberId: other, pariwarId: w.pariwarId, deviceId: 'test-device' }, ACCESS_TTL_MS);
      const codes: number[] = [];
      for (const locale of ['en', 'hi', 'en'] as const) codes.push((await call(t.app, 'PUT', { token: w.tok, payload: { locale } })).status);
      expect(codes).toEqual([200, 200, 429]);
      expect((await rowOf(t, w.memberId)).preferred_locale).toBe('hi');
      expect(changedLines(t)).toHaveLength(2);
      expect((await call(t.app, 'PUT', { token: tokOther, payload: { locale: 'en' } })).status).toBe(200);
      expect(t.auditSink.ofType('rate_limit.exceeded').length).toBeGreaterThanOrEqual(1);
    } finally {
      await teardown(t);
    }
  });

  it('⭐ the audit is AFTER the commit — a FAILED COMMIT ⇒ 5xx, ⛔ write and ⛔ audit line', async () => {
    const t = await createTestApp();
    try {
      const w = await world(t);
      const failing = new Proxy(t.deps.pool, {
        get(target, prop, receiver) {
          if (prop !== 'connect') return Reflect.get(target, prop, receiver) as unknown;
          return async () => {
            const client = (await target.connect()) as pg.PoolClient;
            const query = client.query.bind(client) as (...a: unknown[]) => Promise<unknown>;
            (client as unknown as { query: unknown }).query = (text: unknown, ...rest: unknown[]) =>
              text === 'COMMIT' ? (query('ROLLBACK'), Promise.reject(new Error('commit failed'))) : query(text, ...rest);
            const release = client.release.bind(client);
            (client as unknown as { release: unknown }).release = (err?: unknown) => {
              (client as unknown as { query: unknown }).query = query;
              release(err as Error | boolean | undefined);
            };
            return client;
          };
        },
      });
      const app = await buildServer({ ...t.deps, pool: failing } as AppDeps);
      try {
        const tok = signAccessToken(app, { memberId: w.memberId, pariwarId: w.pariwarId, deviceId: 'test-device' }, ACCESS_TTL_MS);
        const r = await call(app, 'PUT', { token: tok, payload: { locale: 'en' } });
        expect(r.status).toBeGreaterThanOrEqual(500);
        expect((await rowOf(t, w.memberId)).preferred_locale).toBeNull();
        expect(changedLines(t)).toHaveLength(0);
      } finally {
        await app.close();
      }
    } finally {
      await teardown(t);
    }
  });
});
