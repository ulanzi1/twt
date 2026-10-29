// The Trust's announcement channels — API, E2E on the live DB (Story 5.14, Task 5; AC2, AC3; `2026-10-29-417` FS3, FS4, FS12, FS15;
// `-418` item 9). Drives the real Fastify app via inject:
//   · the admin config GET / PUT — 401 / 403 / 400, the OFF defaults with no row (⛔ a 404), the audited upsert, ⛔ a secret field;
//   · the admin "Posts" list — states only while OFF; the words (the FULL name, a `shielded_name` Pariwar included) only while ON; a
//     decrypt failure and a THROWING name read on one row make THAT row unavailable while the next still builds (its own savepoint);
//     the shown states (an `attempting` row past the lease ⇒ unknown, a `deferred` one past its max age ⇒ refused, no row ⇒
//     not_attempted); a last day only from day 14, with the member reminder's date; ONE `admin_announcement_channels.posts_read` line;
//   · the member read — both null while OFF; Telegram only with a bot token NAME; a member of A never sees B's links; 401.
// Own-committing writes ⇒ a FRESH random Pariwar per test ([[project_live_db_test_gotchas]]).

import { randomUUID } from 'node:crypto';

import { buildAnnouncementPost, cycleDeadlineAt, operationalDate } from '@twt/contracts';
import { claim, encryption, ids, member as memberDomain, pool as poolDomain, schema } from '@twt/domain';
import { t } from '@twt/i18n';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import type { AppDeps } from '../../src/context.js';
import * as service from '../../src/modules/auth/admin/admin-auth.service.js';
import { signAccessToken } from '../../src/modules/auth/member/tokens.js';
import { closeScopeTx, openScopeTx } from '../../src/modules/multi-tenant/scope-tx.js';
import { buildServer } from '../../src/server.js';
import { buildTestDeps, hasDatabase, makeClient, type TestDeps } from './_setup.js';
import { FakeWebAuthnProvider } from './_webauthn-fake.js';

// A THROWING name read for chosen claims — and a real SQL error first, so the savepoint is what keeps the transaction usable.
const { throwFor } = vi.hoisted(() => ({ throwFor: new Set<string>() }));
vi.mock('../../src/modules/member-pool/pool-identity.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/modules/member-pool/pool-identity.js')>();
  return {
    ...actual,
    resolvePoolIdentity: async (...args: Parameters<typeof actual.resolvePoolIdentity>) => {
      const [, , request, , , input] = args;
      if (throwFor.has(input.claimCaseId)) {
        await request.scopeTx!.client.query('SELECT 1 / 0');
      }
      return actual.resolvePoolIdentity(...args);
    },
  };
});

type Client = ReturnType<typeof makeClient>;
const NAME = 'Ramesh Kumar Sharma';
const TG = 'https://t.me/twt_bihar_notices';
const WA = 'https://whatsapp.com/channel/0029VaTwt';
const base = (p: string) => `/api/v1/p/${p}/admin/announcement-channels`;

describe.skipIf(!hasDatabase)('Story 5.14 — the announcement channels API (AC2, AC3)', { timeout: 30_000 }, () => {
  let td: TestDeps;
  let deps: AppDeps;
  let fakeWebauthn: FakeWebAuthnProvider;
  let app: Awaited<ReturnType<typeof buildServer>>;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    fakeWebauthn = new FakeWebAuthnProvider();
    td = buildTestDeps({ webauthn: fakeWebauthn });
    deps = td.deps;
    app = await buildServer(deps);
  });

  afterAll(async () => {
    await app.close();
    const c = await td.pool.connect();
    try {
      if (createdUserIds.length > 0) {
        await c.query(`DELETE FROM admin_sessions WHERE sess ->> 'userId' = ANY($1)`, [createdUserIds]);
        await c.query(`DELETE FROM role_grants WHERE user_id = ANY($1)`, [createdUserIds]);
        await c.query(`DELETE FROM users WHERE id = ANY($1)`, [createdUserIds]);
      }
    } finally {
      c.release();
      await td.pool.end();
    }
  });

  async function authenticate(): Promise<{ client: Client; userId: string }> {
    const email = `ac-${randomUUID()}@example.test`;
    const password = 'CorrectHorseBatteryStaple9';
    const userId = await service.createAdminAccount(deps, { email, password });
    createdUserIds.push(userId);
    const client = makeClient(app);
    fakeWebauthn.nextRegistration = { verified: true, credential: { id: `cred-${userId}`, publicKey: Buffer.from(userId).toString('base64url'), counter: 0 } };
    const credentialId = fakeWebauthn.nextRegistration.credential!.id;
    const token = service.mintEnrollmentToken(deps, userId);
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/register/options', payload: { enrollmentToken: token } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/register/verify', payload: { response: { id: 'browser' }, enrollmentToken: token } });
    fakeWebauthn.nextAuthentication = { verified: true, newCounter: 1 };
    await client.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email, password } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/authenticate/options', payload: {} });
    const verify = await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/authenticate/verify', payload: { response: { id: credentialId } } });
    expect(verify.statusCode).toBe(200);
    return { client, userId };
  }

  async function grant(userId: string, pariwarId: string, role: 'pariwar_admin' | 'state_trustee'): Promise<void> {
    await td.pool.query(`INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value) VALUES ($1, $2, $3, 'pariwar', $4)`, [userId, pariwarId, role, pariwarId]);
  }

  async function admin(pariwarId: string): Promise<Client> {
    const { client, userId } = await authenticate();
    await grant(userId, pariwarId, 'pariwar_admin');
    return client;
  }

  /** A claim for a deceased member with a REAL KYC envelope (or a corrupt one); returns the claim id. */
  async function seedClaim(pariwarId: string, o: { readonly corrupt?: boolean } = {}): Promise<string> {
    const deceased = randomUUID();
    const claimCaseId = randomUUID();
    const scopeTx = await openScopeTx(deps, pariwarId);
    try {
      const p = ids.pariwarId(pariwarId);
      await scopeTx.tx.insert(schema.members).values({ memberId: ids.memberId(deceased), pariwarId: p, state: 'active', stateEventVersion: 1 });
      await scopeTx.tx.insert(schema.memberKycProfiles).values({
        memberId: ids.memberId(deceased),
        pariwarId: p,
        nameCiphertext: o.corrupt ? 'enc:v1:not-a-real-envelope' : await encryption.encryptKycField(NAME, pariwarId, deps.encryption),
        dobCiphertext: await encryption.encryptKycField('1950-01-01', pariwarId, deps.encryption),
        verificationStrength: 'self_declared',
        source: 'manual',
      });
      await claim.projectClaimState(scopeTx.client, {
        claimCaseId: ids.claimId(claimCaseId),
        pariwarId: p,
        deceasedMemberId: ids.memberId(deceased),
        intakeChannels: ['member_app'],
        claimantActorId: null,
        eventType: 'claim.intake_initiated' as never,
        payload: { from_state: null, to_state: 'intake_pending', trigger: 'test', actor: 'system', deceased_member_id: deceased, intake_channel: 'member_app', claimant_actor_id: null } as never,
        actorId: null,
      });
      await closeScopeTx(scopeTx, true);
    } catch (err) {
      await closeScopeTx(scopeTx, false);
      throw err;
    }
    return claimCaseId;
  }

  /** A cycle frozen `daysAgo` days ago with its live alert and one pool per claim. */
  async function seedCycle(pariwarId: string, claimIds: string[], daysAgo: number) {
    const cycleId = randomUUID();
    const alertId = randomUUID();
    const poolIds: string[] = [];
    const c = await td.pool.connect();
    try {
      await c.query('BEGIN');
      await c.query(
        `INSERT INTO cycle_freeze_commits (commit_id, pariwar_id, actor_id, actor_display, committed_claim_ids, committed_at)
         VALUES ($1, $2, 'system', 'System', $3::uuid[], clock_timestamp() - ($4::numeric * interval '1 day'))`,
        [cycleId, pariwarId, claimIds, daysAgo],
      );
      await c.query("SET LOCAL app.alert_state_writer = 'on'");
      await c.query(
        `INSERT INTO alerts (alert_id, cycle_id, pariwar_id, pool_count, current_state, state_event_version, created_by_actor) VALUES ($1, $2, $3, $4, 'live', 3, 'system')`,
        [alertId, cycleId, pariwarId, claimIds.length],
      );
      await c.query("SET LOCAL app.pool_state_writer = 'on'");
      for (const [i, claimCaseId] of claimIds.entries()) {
        const poolId = randomUUID();
        poolIds.push(poolId);
        await c.query(
          `INSERT INTO pools (pool_id, pariwar_id, cycle_id, claim_case_id, pool_index, pool_canonical_identifier, support_category, benefit_mechanism, fixed_amount, current_state, state_event_version, public_token)
           VALUES ($1, $2, $3, $4, $5, $6, 'death_support', 'pool', 500, 'spawned', 1, $7)`,
          [poolId, pariwarId, cycleId, claimCaseId, i, `P-2026-10-${poolId.slice(0, 3)}`, poolDomain.mintPoolPublicToken()],
        );
      }
      await c.query('COMMIT');
    } catch (err) {
      await c.query('ROLLBACK');
      throw err;
    } finally {
      c.release();
    }
    const committedAt = (await td.pool.query<{ committed_at: Date }>(`SELECT committed_at FROM cycle_freeze_commits WHERE commit_id = $1`, [cycleId])).rows[0]!.committed_at;
    return { cycleId, alertId, poolIds, committedAt };
  }

  async function configure(pariwarId: string, enabled: boolean, botName: string | null = 'projects/twt/secrets/tg-bot'): Promise<void> {
    await td.pool.query(
      `INSERT INTO pariwar_announcement_channels (pariwar_id, enabled, telegram_channel_chat_id, telegram_invite_url, whatsapp_channel_url) VALUES ($1, $2, '@twt_bihar_notices', $3, $4)
       ON CONFLICT (pariwar_id) DO UPDATE SET enabled = EXCLUDED.enabled`,
      [pariwarId, enabled, TG, WA],
    );
    if (botName !== undefined) {
      await td.pool.query(
        `INSERT INTO pariwar_telegram_config (pariwar_id, enabled, bot_username, bot_token_secret_name) VALUES ($1, false, 'twt_bot', $2)
         ON CONFLICT (pariwar_id) DO UPDATE SET bot_token_secret_name = EXCLUDED.bot_token_secret_name`,
        [pariwarId, botName],
      );
    }
  }

  // ── the admin config ──

  it('⭐ AC2 — 401 without a session; 403 without pariwar.configure_channels; refused for another Pariwar', async () => {
    const pariwarId = randomUUID();
    expect((await makeClient(app).inject({ method: 'GET', url: base(pariwarId) })).statusCode).toBe(401);
    const { client, userId } = await authenticate();
    await grant(userId, pariwarId, 'state_trustee');
    expect((await client.inject({ method: 'GET', url: base(pariwarId) })).statusCode).toBe(403);
    expect((await client.inject({ method: 'GET', url: `${base(pariwarId)}/posts` })).statusCode).toBe(403);
    const a = await admin(pariwarId);
    // another Pariwar: scope resolution refuses before the handler (the channel-config spec's `[403, 404]`) — ⛔ ever a 200
    expect([403, 404]).toContain((await a.inject({ method: 'GET', url: base(randomUUID()) })).statusCode);
    expect([403, 404]).toContain((await a.inject({ method: 'GET', url: `${base(randomUUID())}/posts` })).statusCode);
  });

  it('⭐ AC2 — the OFF defaults with no row (⛔ a 404); the PUT upserts, reads back and is AUDITED; ⛔ a bot secret field anywhere', async () => {
    const pariwarId = randomUUID();
    await configure(randomUUID(), true); // an unrelated Pariwar's bot row must not leak in
    const client = await admin(pariwarId);
    const initial = await client.inject({ method: 'GET', url: base(pariwarId) });
    expect(initial.statusCode).toBe(200);
    expect(initial.json()).toEqual({ configured: false, config: { enabled: false, telegramChannelChatId: null, telegramInviteUrl: null, whatsappChannelUrl: null } });
    const payload = { enabled: true, telegramChannelChatId: '-1001234567890', telegramInviteUrl: TG, whatsappChannelUrl: WA };
    const put = await client.inject({ method: 'PUT', url: base(pariwarId), payload });
    expect(put.statusCode).toBe(200);
    expect(put.json()).toEqual({ configured: true, config: payload });
    expect((await client.inject({ method: 'GET', url: base(pariwarId) })).json()).toEqual({ configured: true, config: payload });
    expect(JSON.stringify(put.json())).not.toMatch(/secret/i);
    const audit = await td.pool.query(`SELECT 1 FROM audit_log_entries WHERE pariwar_id = $1 AND action = 'pariwar.announcement_channels_update'`, [pariwarId]);
    expect(audit.rowCount).toBeGreaterThanOrEqual(1);
  });

  it('⭐ AC2 — 400: the refinements equal the CHECKs (pairing, link prefixes, chat id) and the body is .strict()', async () => {
    const pariwarId = randomUUID();
    const client = await admin(pariwarId);
    const ok = { enabled: true, telegramChannelChatId: '@twt_bihar_notices', telegramInviteUrl: TG, whatsappChannelUrl: WA };
    for (const bad of [
      { ...ok, telegramInviteUrl: null },
      { ...ok, telegramInviteUrl: 'tg://resolve?domain=x' },
      { ...ok, whatsappChannelUrl: 'https://chat.whatsapp.com/x' },
      { ...ok, telegramChannelChatId: '12345' },
      { ...ok, botTokenSecretName: 'projects/x' },
    ]) {
      expect((await client.inject({ method: 'PUT', url: base(pariwarId), payload: bad })).statusCode, JSON.stringify(bad)).toBe(400);
    }
  });

  // ── the "Posts" list ──

  it('⭐ AC2 / FS4 — switch OFF: states only (⛔ words), every pool listed `not_attempted`; ONE audited-read line, counts only', async () => {
    const pariwarId = randomUUID();
    const claimId = await seedClaim(pariwarId);
    const cyc = await seedCycle(pariwarId, [claimId], 2);
    await configure(pariwarId, false);
    const client = await admin(pariwarId);
    const before = td.auditSink.ofType('admin_announcement_channels.posts_read').length;
    const res = await client.inject({ method: 'GET', url: `${base(pariwarId)}/posts` });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      enabled: false,
      posts: [{ occasion: 'pool_open', alertId: cyc.alertId, subjectId: cyc.poolIds[0], poolLabel: 'A', lastDate: null, telegramState: 'not_attempted', words: null, wordsUnavailable: false }],
    });
    const lines = td.auditSink.ofType('admin_announcement_channels.posts_read').slice(before);
    expect(lines).toHaveLength(1);
    expect(lines[0]!.context).toEqual({ enabled: false, entries: 1, words_built: 0, words_unavailable: 0 });
    expect(JSON.stringify(lines[0])).not.toContain('Ramesh');
  });

  it('⭐ FS15 / `-416` — switch ON: the words with the FULL name for a `shielded_name` Pariwar; a corrupt envelope and a THROWING read each make only THAT row unavailable', async () => {
    const pariwarId = randomUUID();
    await td.pool.query(`INSERT INTO pariwar_public_name_presentation (pariwar_id, mode) VALUES ($1, 'shielded_name')`, [pariwarId]);
    const good = await seedClaim(pariwarId);
    const corrupt = await seedClaim(pariwarId, { corrupt: true });
    const throwing = await seedClaim(pariwarId);
    const after = await seedClaim(pariwarId);
    throwFor.add(throwing);
    const cyc = await seedCycle(pariwarId, [good, corrupt, throwing, after], 1);
    await configure(pariwarId, true);
    const client = await admin(pariwarId);
    const before = td.auditSink.ofType('admin_announcement_channels.posts_read').length;
    const res = await client.inject({ method: 'GET', url: `${base(pariwarId)}/posts` });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { enabled: boolean; posts: Array<{ subjectId: string; words: string | null; wordsUnavailable: boolean; poolLabel: string }> };
    expect(body.enabled).toBe(true);
    const byPool = (i: number) => body.posts.find((p) => p.subjectId === cyc.poolIds[i])!;
    expect(byPool(0).words).toBe(buildAnnouncementPost(t, { occasion: 'pool_open', poolLabel: 'A', deceasedName: NAME }));
    expect(byPool(1)).toMatchObject({ words: null, wordsUnavailable: true });
    expect(byPool(2)).toMatchObject({ words: null, wordsUnavailable: true });
    expect(byPool(3).words).toBe(buildAnnouncementPost(t, { occasion: 'pool_open', poolLabel: 'D', deceasedName: NAME }));
    expect(td.auditSink.ofType('admin_announcement_channels.posts_read').slice(before)[0]!.context).toEqual({ enabled: true, entries: 4, words_built: 2, words_unavailable: 2 });
    throwFor.delete(throwing);
  });

  it('AC2 — the shown states: posted, a stale `attempting` ⇒ unknown, an expired `deferred` ⇒ refused, skipped; a last day only from day 14, with the reminder\'s date', async () => {
    const pariwarId = randomUUID();
    const claims = [await seedClaim(pariwarId), await seedClaim(pariwarId), await seedClaim(pariwarId), await seedClaim(pariwarId)];
    const old = await seedCycle(pariwarId, claims, 14 + 1 / 24);
    const recent = await seedCycle(pariwarId, [await seedClaim(pariwarId)], 2);
    await configure(pariwarId, false);
    const ins = (subjectId: string, state: string, extra: string, ageSql = '0 seconds') =>
      td.pool.query(
        `INSERT INTO announcement_channel_posts (pariwar_id, occasion, subject_id, alert_id, pool_label, state, claim_token, updated_at)
         VALUES ($1, 'pool_open', $2, $3, 'A', 'attempting', 'seed', clock_timestamp() - interval '${ageSql}')`,
        [pariwarId, subjectId, old.alertId],
      ).then(() => (state === 'attempting' ? undefined : td.pool.query(`UPDATE announcement_channel_posts SET state = $3, ${extra} WHERE pariwar_id = $1 AND subject_id = $2`, [pariwarId, subjectId, state])));
    await ins(old.poolIds[0]!, 'posted', "telegram_message_id = '11'");
    await ins(old.poolIds[1]!, 'attempting', '', '3 minutes');
    await ins(old.poolIds[2]!, 'deferred', "detail = 'tg_429'");
    await td.pool.query(`UPDATE announcement_channel_posts SET updated_at = clock_timestamp() - interval '31 minutes' WHERE pariwar_id = $1 AND subject_id = $2`, [pariwarId, old.poolIds[2]]);
    await ins(old.poolIds[3]!, 'skipped', "detail = 'switch_off'");
    const client = await admin(pariwarId);
    const body = (await client.inject({ method: 'GET', url: `${base(pariwarId)}/posts` })).json() as { posts: Array<Record<string, unknown>> };
    const state = (subjectId: string) => body.posts.find((p) => p['subjectId'] === subjectId)?.['telegramState'];
    expect([0, 1, 2, 3].map((i) => state(old.poolIds[i]!))).toEqual(['posted', 'unknown', 'refused', 'skipped']);
    expect(state(recent.poolIds[0]!)).toBe('not_attempted');
    const lastDays = body.posts.filter((p) => p['occasion'] === 'last_day');
    expect(lastDays).toEqual([
      {
        occasion: 'last_day',
        alertId: old.alertId,
        subjectId: old.alertId,
        poolLabel: null,
        lastDate: operationalDate(cycleDeadlineAt(old.committedAt)),
        telegramState: 'not_attempted',
        words: null,
        wordsUnavailable: false,
      },
    ]);
  });

  // ── the member read ──

  async function member(pariwarId: string): Promise<string> {
    const memberId = randomUUID();
    const scopeTx = await openScopeTx(deps, pariwarId);
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
    return signAccessToken(app, { memberId, pariwarId, deviceId: 'test-device' }, 15 * 60 * 1000);
  }
  const memberGet = (token?: string) =>
    app.inject({ method: 'GET', url: '/api/v1/member/announcement-channels', headers: { origin: 'http://localhost:3001', ...(token ? { authorization: `Bearer ${token}` } : {}) } });

  it('⭐ AC3 — 401 without a session; both null with no row and while OFF; both links while ON with a bot token NAME', async () => {
    expect((await memberGet()).statusCode).toBe(401);
    const pariwarId = randomUUID();
    const tok = await member(pariwarId);
    expect((await memberGet(tok)).json()).toEqual({ whatsappChannelUrl: null, telegramChannelUrl: null });
    await configure(pariwarId, false);
    expect((await memberGet(tok)).json()).toEqual({ whatsappChannelUrl: null, telegramChannelUrl: null });
    await configure(pariwarId, true);
    expect((await memberGet(tok)).json()).toEqual({ whatsappChannelUrl: WA, telegramChannelUrl: TG });
  });

  it('⭐ AC3 / I7 — a BLANK bot token name ⇒ telegramChannelUrl null, the WhatsApp link still returned', async () => {
    const pariwarId = randomUUID();
    const tok = await member(pariwarId);
    await configure(pariwarId, true, '  ');
    expect((await memberGet(tok)).json()).toEqual({ whatsappChannelUrl: WA, telegramChannelUrl: null });
  });

  it('⭐ AC3 / I6 — a member of A never receives B\'s links', async () => {
    const a = randomUUID();
    const b = randomUUID();
    const tokA = await member(a);
    await configure(b, true);
    expect((await memberGet(tokA)).json()).toEqual({ whatsappChannelUrl: null, telegramChannelUrl: null });
  });
});
