// The Trust's announcement channels on the admin channel-config page (Story 5.14, Task 6; AC2; `2026-10-29-417` FS3 (a), FS4 (a)). The
// form carries AC2's switch label and bot hint VERBATIM, validates with the server's contract (the Telegram link and the channel id
// together), and PUTs the config; the "Posts" list shows states only while OFF, and while ON the exact words with a Copy button
// (`navigator.clipboard` is stubbed — jsdom has none). The api-client module is mocked (the degraded-mode page precedent); the real
// hooks and components run.

import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AnnouncementPostsResponse } from '@twt/contracts';
import { renderWithClient } from './_helpers.js';

const h = vi.hoisted(() => ({
  config: { configured: false, config: { enabled: false, telegramChannelChatId: null, telegramInviteUrl: null, whatsappChannelUrl: null } } as Record<string, unknown>,
  posts: { enabled: false, posts: [] } as unknown,
  puts: [] as unknown[],
}));

vi.mock('../src/api/client.js', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    getWaConfig: vi.fn(async () => ({ configured: false, config: { enabled: false, displayPhoneNumber: null, phoneNumberId: null, wabaId: null, accessTokenSecretName: null, graphApiVersion: 'v21.0', appSecretSecretName: null, webhookVerifyTokenSecretName: null } })),
    getWaTemplates: vi.fn(async () => ({ templates: [] })),
    getTelegramConfig: vi.fn(async () => ({ configured: false, config: { enabled: false, botUsername: null, botTokenSecretName: null, webhookSecretTokenSecretName: null } })),
    getAnnouncementChannelsConfig: vi.fn(async () => h.config),
    getAnnouncementPosts: vi.fn(async () => h.posts),
    putAnnouncementChannelsConfig: vi.fn(async (_p: string, body: Record<string, unknown>) => {
      h.puts.push(body);
      h.config = { configured: true, config: body };
      return h.config;
    }),
  };
});

const { ChannelConfigPage } = await import('../src/modules/channel-config/ChannelConfigPage.js');
const { ANNOUNCEMENT_BOT_HINT, ANNOUNCEMENT_SWITCH_LABEL } = await import('../src/modules/channel-config/AnnouncementChannelsForm.js');

const PARIWAR = '22222222-2222-4222-8222-222222222222';
const ALERT = '33333333-3333-4333-8333-333333333333';
const POOL = '44444444-4444-4444-8444-444444444444';
const WORDS = 'पूल A अब खुल गया है।\n\nPool A is now open, in support of Ramesh Kumar Sharma\'s family.';

const writeText = vi.fn<(s: string) => Promise<void>>();

beforeEach(() => {
  h.config = { configured: false, config: { enabled: false, telegramChannelChatId: null, telegramInviteUrl: null, whatsappChannelUrl: null } };
  h.posts = { enabled: false, posts: [] };
  h.puts = [];
  writeText.mockReset();
  writeText.mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
});

/** user-event's `setup()` installs ITS OWN clipboard stub on `navigator` — attach ours after it. */
function setupUser(): ReturnType<typeof userEvent.setup> {
  const user = userEvent.setup();
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  return user;
}

const section = async () => within(await screen.findByRole('region', { name: 'Announcement channels' }));

describe('Story 5.14 — the announcement channels section (AC2)', () => {
  it('⭐ the switch label and the bot hint are AC2\'s words, verbatim', async () => {
    renderWithClient(<ChannelConfigPage pariwarId={PARIWAR} />);
    const s = await section();
    expect(await s.findByText(ANNOUNCEMENT_SWITCH_LABEL)).toBeInTheDocument();
    expect(s.getByText(ANNOUNCEMENT_BOT_HINT)).toBeInTheDocument();
    expect(ANNOUNCEMENT_SWITCH_LABEL).toBe(
      'When on: members see these links in the app, and the system posts pool openings and last days to the Telegram channel. Post the same words to the WhatsApp Channel by hand from the list below.',
    );
    expect(ANNOUNCEMENT_BOT_HINT).toBe(
      "Posts go out through this Pariwar's Telegram bot (the bot-token name in the Telegram config above), even while Telegram mirror delivery is off; add the bot to the channel as an admin with 'Post messages'.",
    );
  });

  it('PUTs the config (blank fields as null); a Telegram link without the channel id is refused before any request', async () => {
    const user = setupUser();
    renderWithClient(<ChannelConfigPage pariwarId={PARIWAR} />);
    const s = await section();
    await user.type(await s.findByLabelText('Telegram channel link'), 'https://t.me/twt_bihar_notices');
    await user.click(s.getByTestId('announcement-config-submit'));
    expect(await s.findByText(/set together/)).toBeInTheDocument();
    expect(h.puts).toHaveLength(0);
    await user.type(s.getByLabelText('Telegram channel id'), '@twt_bihar_notices');
    await user.type(s.getByLabelText('WhatsApp Channel link'), 'https://whatsapp.com/channel/0029Va');
    await user.click(s.getByTestId('announcement-enabled'));
    await user.click(s.getByTestId('announcement-config-submit'));
    await waitFor(() => expect(h.puts).toHaveLength(1));
    expect(h.puts[0]).toEqual({ enabled: true, telegramChannelChatId: '@twt_bihar_notices', telegramInviteUrl: 'https://t.me/twt_bihar_notices', whatsappChannelUrl: 'https://whatsapp.com/channel/0029Va' });
  });

  it('⭐ FS4 — switch OFF: the list shows states only (⛔ words, ⛔ Copy)', async () => {
    h.posts = {
      enabled: false,
      posts: [{ occasion: 'pool_open', alertId: ALERT, subjectId: POOL, poolLabel: 'A', lastDate: null, telegramState: 'skipped', words: null, wordsUnavailable: false }],
    } satisfies AnnouncementPostsResponse;
    renderWithClient(<ChannelConfigPage pariwarId={PARIWAR} />);
    const s = await section();
    const item = await s.findByTestId('announcement-post');
    expect(within(item).getByText('Pool A opened')).toBeInTheDocument();
    expect(within(item).getByText('Not posted (the channels were off or not set up)')).toBeInTheDocument();
    expect(within(item).queryByRole('button', { name: 'Copy' })).toBeNull();
    expect(s.getByText(/the channels are off/i)).toBeInTheDocument();
  });

  it('⭐ FS4 — switch ON: the exact words and a Copy button that copies them and says "Copied"; an unavailable row says why', async () => {
    h.posts = {
      enabled: true,
      posts: [
        { occasion: 'pool_open', alertId: ALERT, subjectId: POOL, poolLabel: 'A', lastDate: null, telegramState: 'posted', words: WORDS, wordsUnavailable: false },
        { occasion: 'pool_open', alertId: ALERT, subjectId: '55555555-5555-4555-8555-555555555555', poolLabel: 'B', lastDate: null, telegramState: 'not_attempted', words: null, wordsUnavailable: true },
        { occasion: 'last_day', alertId: ALERT, subjectId: ALERT, poolLabel: null, lastDate: '13-11-2026', telegramState: 'unknown', words: 'आज, 13-11-2026 …\n\nToday, 13-11-2026 …', wordsUnavailable: false },
      ],
    } satisfies AnnouncementPostsResponse;
    const user = setupUser();
    renderWithClient(<ChannelConfigPage pariwarId={PARIWAR} />);
    const s = await section();
    const items = await s.findAllByTestId('announcement-post');
    expect(items).toHaveLength(3);
    expect(within(items[0]!).getByText('Posted to Telegram')).toBeInTheDocument();
    expect(items[0]!.querySelector('pre')?.textContent).toBe(WORDS);
    await user.click(within(items[0]!).getByRole('button', { name: 'Copy' }));
    expect(writeText).toHaveBeenCalledWith(WORDS);
    expect(await within(items[0]!).findByRole('button', { name: 'Copied' })).toBeInTheDocument();
    expect(within(items[1]!).getByRole('alert')).toHaveTextContent(/could not be built/);
    expect(within(items[2]!).getByText('Last day — 13-11-2026')).toBeInTheDocument();
    expect(within(items[2]!).getByText('May have posted — check the channel')).toBeInTheDocument();
  });

  it('a clipboard failure says so (the admin can still select the text)', async () => {
    writeText.mockRejectedValue(new Error('denied'));
    h.posts = {
      enabled: true,
      posts: [{ occasion: 'pool_open', alertId: ALERT, subjectId: POOL, poolLabel: 'A', lastDate: null, telegramState: 'posted', words: WORDS, wordsUnavailable: false }],
    } satisfies AnnouncementPostsResponse;
    const user = setupUser();
    renderWithClient(<ChannelConfigPage pariwarId={PARIWAR} />);
    const s = await section();
    await user.click(await s.findByRole('button', { name: 'Copy' }));
    expect(await s.findByRole('button', { name: /Copy failed/ })).toBeInTheDocument();
  });
});
