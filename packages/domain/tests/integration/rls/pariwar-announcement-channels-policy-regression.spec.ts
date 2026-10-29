// pariwar_announcement_channels — migration 0190 + RLS policy regression (Story 5.14, Task 1; AC1, AC3; `2026-10-29-417` FS1 (a),
// FS3 (a), FS12 (a)). Positive / negative RLS, the connection-level fail-closed probe, FORCE RLS, ⛔ DELETE for `twt_app` (the row is
// switched off, never deleted), per-command policies, cross-tenant WITH CHECK, ⭐ `enabled` DEFAULT false (I1), the four CHECKs as
// written + the pairing CHECK (I7) pinned to the TS patterns, and the accessors: the OFF default with no row, the upsert, the state
// read with the bot's token NAME, and the member-visible links (FS12 (a)) — incl. an explicit-predicate read as the superuser (I6).
// Live DB only; per-test ROLLBACK (setupLiveDb).

import { describe, expect, it } from 'vitest';

import {
  ANNOUNCEMENT_CHANNELS_DEFAULT_CONFIG,
  getAnnouncementChannelsConfig,
  memberVisibleAnnouncementLinks,
  readAnnouncementChannelsState,
  upsertAnnouncementChannelsConfig,
} from '../../../src/announcement-channels/index.js';
import {
  ANNOUNCEMENT_TELEGRAM_CHAT_ID_PATTERN,
  ANNOUNCEMENT_TELEGRAM_INVITE_URL_PATTERN,
  ANNOUNCEMENT_WHATSAPP_CHANNEL_URL_PATTERN,
} from '../../../src/schema/pariwar_announcement_channels.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppRoleNoScope, enterAppScope } from '../_helpers.js';

type Client = ReturnType<typeof getTx>['client'];

const TABLE = 'pariwar_announcement_channels';
const TG = 'https://t.me/twt_bihar_notices';
const WA = 'https://whatsapp.com/channel/0029VaTwtBihar';

async function seedConfig(client: Client, pariwarId: string, over: Record<string, unknown> = {}) {
  const v: Record<string, unknown> = { pariwar_id: pariwarId, enabled: true, telegram_channel_chat_id: '@twt_bihar_notices', telegram_invite_url: TG, whatsapp_channel_url: WA, ...over };
  const cols = Object.keys(v);
  await client.query(`INSERT INTO ${TABLE} (${cols.join(', ')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')})`, Object.values(v));
}

async function seedBot(client: Client, pariwarId: string, botTokenSecretName: string | null) {
  await client.query(
    `INSERT INTO pariwar_telegram_config (pariwar_id, enabled, bot_username, bot_token_secret_name)
     VALUES ($1, false, 'twt_bot', $2)
     ON CONFLICT (pariwar_id) DO UPDATE SET bot_token_secret_name = EXCLUDED.bot_token_secret_name`,
    [pariwarId, botTokenSecretName],
  );
}

async function expectPgError(client: Client, run: () => Promise<unknown>, expected: { readonly code: string; readonly constraint?: string; readonly message?: unknown }): Promise<void> {
  await client.query('SAVEPOINT expect_pg_error');
  await expect(run()).rejects.toMatchObject(expected);
  await client.query('ROLLBACK TO SAVEPOINT expect_pg_error');
}

async function expectAccepted(client: Client, run: () => Promise<unknown>): Promise<void> {
  await client.query('SAVEPOINT expect_ok');
  await run();
  await client.query('ROLLBACK TO SAVEPOINT expect_ok');
}

const CHECK = (constraint: string) => ({ code: '23514', constraint });

describe.skipIf(!hasDatabase)('the Trust announcement channels config — migration 0190 + RLS policy regression', { timeout: 20000 }, () => {
  setupLiveDb();

  it('positive + negative: under scope A only A\'s row; the app role with no scope sees ⛔ row', async () => {
    const { client } = getTx();
    await seedConfig(client, PARIWAR_A);
    await seedConfig(client, PARIWAR_B);
    await enterAppScope(client, PARIWAR_A);
    const a = await client.query<{ pariwar_id: string }>(`SELECT pariwar_id FROM ${TABLE}`);
    expect(a.rows.map((r) => r.pariwar_id)).toEqual([PARIWAR_A]);
    await enterAppRoleNoScope(client);
    await client.query(`SELECT set_config('app.pariwar_id', '', true)`);
    expect((await client.query(`SELECT 1 FROM ${TABLE}`)).rows).toHaveLength(0);
  });

  it('FORCE RLS; per-command policies; ⛔ DELETE for twt_app; table grants SELECT / INSERT / UPDATE', async () => {
    const { client } = getTx();
    const { rows } = await client.query<{ relrowsecurity: boolean; relforcerowsecurity: boolean }>(
      `SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = $1 AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = current_schema())`,
      [TABLE],
    );
    expect(rows[0]!.relrowsecurity && rows[0]!.relforcerowsecurity).toBe(true);
    const pol = await client.query<{ cmd: string }>(`SELECT cmd FROM pg_policies WHERE schemaname = current_schema() AND tablename = $1`, [TABLE]);
    expect(pol.rows.map((r) => r.cmd).sort()).toEqual(['INSERT', 'SELECT', 'UPDATE']);
    const grants = await client.query<{ privilege_type: string }>(
      `SELECT privilege_type FROM information_schema.table_privileges WHERE table_name = $1 AND grantee = 'twt_app' ORDER BY privilege_type`,
      [TABLE],
    );
    expect(grants.rows.map((r) => r.privilege_type)).toEqual(['INSERT', 'SELECT', 'UPDATE']);
    await seedConfig(client, PARIWAR_A);
    await enterAppScope(client, PARIWAR_A);
    await expectPgError(client, () => client.query(`DELETE FROM ${TABLE} WHERE pariwar_id = $1`, [PARIWAR_A]), { code: '42501', message: expect.stringMatching(/permission denied/) });
  });

  it('cross-tenant: under scope A, a row for B is refused (WITH CHECK) and B\'s row is invisible to an UPDATE', async () => {
    const { client } = getTx();
    await seedConfig(client, PARIWAR_B);
    await enterAppScope(client, PARIWAR_A);
    await expectPgError(client, () => seedConfig(client, PARIWAR_B, { pariwar_id: PARIWAR_B }), { code: '42501', message: expect.stringMatching(/row-level security/) });
    expect((await client.query(`UPDATE ${TABLE} SET enabled = false WHERE pariwar_id = $1`, [PARIWAR_B])).rowCount).toBe(0);
    await expectAccepted(client, () => seedConfig(client, PARIWAR_A));
  });

  it('⭐ I1 — `enabled` starts OFF: a row inserted with nothing set is switched off', async () => {
    const { client } = getTx();
    await client.query(`INSERT INTO ${TABLE} (pariwar_id) VALUES ($1)`, [PARIWAR_A]);
    const { rows } = await client.query<{ enabled: boolean }>(`SELECT enabled FROM ${TABLE} WHERE pariwar_id = $1`, [PARIWAR_A]);
    expect(rows).toEqual([{ enabled: false }]);
  });

  it('⭐ the CHECKs as written (chat id, the two link prefixes, the pairing, the length) — each with an accept / reject pair; LOCKSTEP with the TS patterns', async () => {
    const { client } = getTx();
    const cases: Array<[over: Record<string, unknown>, constraint: string | null]> = [
      [{ telegram_channel_chat_id: '@abcde' }, null],
      [{ telegram_channel_chat_id: '-1001234567890' }, null],
      [{ telegram_channel_chat_id: '@abcd' }, 'pariwar_announcement_channels_chat_id_check'],
      [{ telegram_channel_chat_id: '1234567' }, 'pariwar_announcement_channels_chat_id_check'],
      [{ telegram_channel_chat_id: '-1234567' }, 'pariwar_announcement_channels_chat_id_check'],
      [{ telegram_channel_chat_id: '@1abcde' }, 'pariwar_announcement_channels_chat_id_check'],
      [{ telegram_invite_url: 'https://t.me/+AbCdEf123' }, null],
      [{ telegram_invite_url: 'tg://resolve?domain=x' }, 'pariwar_announcement_channels_telegram_url_check'],
      [{ telegram_invite_url: 'http://t.me/x' }, 'pariwar_announcement_channels_telegram_url_check'],
      [{ telegram_invite_url: 'https://tXme/x' }, 'pariwar_announcement_channels_telegram_url_check'],
      [{ whatsapp_channel_url: 'https://www.whatsapp.com/channel/0029Va' }, null],
      [{ whatsapp_channel_url: 'https://chat.whatsapp.com/abc' }, 'pariwar_announcement_channels_whatsapp_url_check'],
      [{ whatsapp_channel_url: 'whatsapp://channel/abc' }, 'pariwar_announcement_channels_whatsapp_url_check'],
      [{ whatsapp_channel_url: null }, null],
      // I7 — a Telegram link only with a chat id, and a chat id only with a link.
      [{ telegram_invite_url: null, telegram_channel_chat_id: null }, null],
      [{ telegram_invite_url: null }, 'pariwar_announcement_channels_telegram_pairing_check'],
      [{ telegram_channel_chat_id: null }, 'pariwar_announcement_channels_telegram_pairing_check'],
      [{ whatsapp_channel_url: `https://whatsapp.com/channel/${'a'.repeat(300)}` }, 'pariwar_announcement_channels_url_length_check'],
    ];
    for (const [over, constraint] of cases) {
      if (constraint === null) await expectAccepted(client, () => seedConfig(client, PARIWAR_A, over));
      else await expectPgError(client, () => seedConfig(client, PARIWAR_A, over), CHECK(constraint));
    }
    const def = async (conname: string) =>
      (await client.query<{ def: string }>(`SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = $1`, [conname])).rows[0]!.def;
    expect((await def('pariwar_announcement_channels_chat_id_check')).match(/~ '(.*)'::text/)?.[1]).toBe(ANNOUNCEMENT_TELEGRAM_CHAT_ID_PATTERN);
    expect((await def('pariwar_announcement_channels_telegram_url_check')).match(/~ '(.*)'::text/)?.[1]).toBe(ANNOUNCEMENT_TELEGRAM_INVITE_URL_PATTERN);
    expect((await def('pariwar_announcement_channels_whatsapp_url_check')).match(/~ '(.*)'::text/)?.[1]).toBe(ANNOUNCEMENT_WHATSAPP_CHANNEL_URL_PATTERN);
  });

  describe('the accessors', () => {
    it('⛔ a 404 — no row reads as the OFF default; the upsert writes, re-writes and bumps updated_at (as `twt_app`)', async () => {
      const { client } = getTx();
      await enterAppScope(client, PARIWAR_A);
      expect(await getAnnouncementChannelsConfig(client, PARIWAR_A)).toEqual(ANNOUNCEMENT_CHANNELS_DEFAULT_CONFIG);
      const written = await upsertAnnouncementChannelsConfig(client, {
        pariwarId: PARIWAR_A,
        enabled: true,
        telegramChannelChatId: '-1001234567890',
        telegramInviteUrl: TG,
        whatsappChannelUrl: WA,
        updatedByActor: null,
      });
      expect(written).toEqual({ enabled: true, telegramChannelChatId: '-1001234567890', telegramInviteUrl: TG, whatsappChannelUrl: WA });
      const off = await upsertAnnouncementChannelsConfig(client, { ...written, pariwarId: PARIWAR_A, enabled: false, telegramChannelChatId: null, telegramInviteUrl: null, updatedByActor: null });
      expect(off).toEqual({ enabled: false, telegramChannelChatId: null, telegramInviteUrl: null, whatsappChannelUrl: WA });
      expect(await getAnnouncementChannelsConfig(client, PARIWAR_A)).toEqual(off);
    });

    it('⭐ FS12 (a) / I1 / I7 — the member-visible links: both null while off; Telegram only with a chat id AND a non-blank bot token NAME', async () => {
      const { client } = getTx();
      // as the superuser (the job's BYPASSRLS pool): the explicit predicate is the isolation — B's bot does not count for A (I6)
      await seedConfig(client, PARIWAR_A);
      await seedBot(client, PARIWAR_B, 'projects/x/secrets/b-bot');
      const none = await readAnnouncementChannelsState(client, PARIWAR_A);
      expect(none.botTokenSecretName).toBeNull();
      expect(memberVisibleAnnouncementLinks(none)).toEqual({ whatsappChannelUrl: WA, telegramChannelUrl: null });
      await seedBot(client, PARIWAR_A, '   ');
      expect(memberVisibleAnnouncementLinks(await readAnnouncementChannelsState(client, PARIWAR_A))).toEqual({ whatsappChannelUrl: WA, telegramChannelUrl: null });
      await seedBot(client, PARIWAR_A, 'projects/x/secrets/a-bot');
      const lit = await readAnnouncementChannelsState(client, PARIWAR_A);
      expect(memberVisibleAnnouncementLinks(lit)).toEqual({ whatsappChannelUrl: WA, telegramChannelUrl: TG });
      await client.query(`UPDATE ${TABLE} SET enabled = false WHERE pariwar_id = $1`, [PARIWAR_A]);
      expect(memberVisibleAnnouncementLinks(await readAnnouncementChannelsState(client, PARIWAR_A))).toEqual({ whatsappChannelUrl: null, telegramChannelUrl: null });
      // a Pariwar with no row at all
      const empty = await readAnnouncementChannelsState(client, PARIWAR_B);
      expect(empty.config).toEqual(ANNOUNCEMENT_CHANNELS_DEFAULT_CONFIG);
      expect(memberVisibleAnnouncementLinks(empty)).toEqual({ whatsappChannelUrl: null, telegramChannelUrl: null });
    });

    it('the state read works as `twt_app` under scope (the member read path) and never returns another Pariwar\'s row', async () => {
      const { client } = getTx();
      await seedConfig(client, PARIWAR_B);
      await seedBot(client, PARIWAR_A, 'projects/x/secrets/a-bot');
      await enterAppScope(client, PARIWAR_A);
      const s = await readAnnouncementChannelsState(client, PARIWAR_A);
      expect(s.config).toEqual(ANNOUNCEMENT_CHANNELS_DEFAULT_CONFIG);
      expect(s.botTokenSecretName).toBe('projects/x/secrets/a-bot');
      expect((await readAnnouncementChannelsState(client, PARIWAR_B)).config).toEqual(ANNOUNCEMENT_CHANNELS_DEFAULT_CONFIG);
    });
  });
});
