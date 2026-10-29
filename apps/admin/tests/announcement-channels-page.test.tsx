// The Trust's announcement channels on the admin channel-config page (Story 5.14, Task 6; AC2; `2026-10-29-417` FS3 (a), FS4 (a), as
// amended by `-419` item 6). The form carries AC2's switch label and bot hint VERBATIM, validates with the server's contract (the
// Telegram link and the channel id together), PUTs the config and re-syncs to fresh server data without clobbering an edit (G2-P16);
// the "Posts" list shows states and their reasons (G2-P5), hides words and Copy while OFF whatever the payload carries (G2-P12), shows
// the exact words with a Copy button while ON (`navigator.clipboard` is stubbed — jsdom has none) whose outcome is announced (G2-P10)
// and which never throws without a clipboard (G2-P9), and is ⛔ re-read on a window focus or a reconnect (G2-P1). The api-client module
// is mocked (the degraded-mode page precedent); the real hooks and components run.

import { QueryClientProvider, focusManager, onlineManager } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AnnouncementPostEntry, AnnouncementPostsResponse } from '@twt/contracts';
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
const api = await import('../src/api/client.js');
const { announcementChannelsConfigKey, createQueryClient } = await import('../src/api/hooks.js');

const PARIWAR = '22222222-2222-4222-8222-222222222222';
const ALERT = '33333333-3333-4333-8333-333333333333';
const POOL = '44444444-4444-4444-8444-444444444444';
const WORDS = 'पूल A अब खुल गया है।\n\nPool A is now open, in support of Ramesh Kumar Sharma\'s family.';

/** One "Posts" entry — a pool opening, state `posted`, no words; override any field. */
const entry = (over: Partial<AnnouncementPostEntry> = {}): AnnouncementPostEntry => ({
  occasion: 'pool_open',
  alertId: ALERT,
  subjectId: POOL,
  poolLabel: 'A',
  lastDate: null,
  telegramState: 'posted',
  reason: null,
  words: null,
  wordsUnavailable: false,
  ...over,
});

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
      posts: [entry({ telegramState: 'skipped', reason: 'switch_off' })],
    } satisfies AnnouncementPostsResponse;
    renderWithClient(<ChannelConfigPage pariwarId={PARIWAR} />);
    const s = await section();
    const item = await s.findByTestId('announcement-post');
    expect(within(item).getByText('Pool A opened')).toBeInTheDocument();
    expect(within(item).getByText('Not posted', { exact: false })).toBeInTheDocument();
    expect(within(item).getByTestId('announcement-post-reason')).toHaveTextContent('The channels were switched off');
    expect(within(item).queryByRole('button', { name: 'Copy' })).toBeNull();
    expect(s.getByText(/the channels are off/i)).toBeInTheDocument();
  });

  it('⭐ G2-P12 — switch OFF hides words and Copy on the PAGE too, even when the payload carries words', async () => {
    h.posts = { enabled: false, posts: [entry({ words: WORDS }), entry({ subjectId: '55555555-5555-4555-8555-555555555555', poolLabel: 'B', wordsUnavailable: true })] } satisfies AnnouncementPostsResponse;
    renderWithClient(<ChannelConfigPage pariwarId={PARIWAR} />);
    const s = await section();
    const items = await s.findAllByTestId('announcement-post');
    expect(items).toHaveLength(2);
    for (const item of items) {
      expect(item.querySelector('pre')).toBeNull();
      expect(within(item).queryByRole('button', { name: 'Copy' })).toBeNull();
      expect(within(item).queryByRole('alert')).toBeNull();
    }
    expect(s.queryByText(/Ramesh/)).toBeNull();
  });

  it('⭐ G2-P5 — each row states its recorded reason in plain words (⛔ one "Telegram refused it" for every cause)', async () => {
    const id = (n: number) => `5555555${String(n)}-5555-4555-8555-555555555555`;
    h.posts = {
      enabled: false,
      posts: [
        entry({ subjectId: id(1), telegramState: 'refused', reason: 'secret_unresolved' }),
        entry({ subjectId: id(2), telegramState: 'refused', reason: 'identity_unavailable' }),
        entry({ subjectId: id(3), telegramState: 'refused', reason: 'tg_403' }),
        entry({ subjectId: id(4), telegramState: 'refused', reason: 'tg_429_expired' }),
        entry({ subjectId: id(5), telegramState: 'skipped', reason: 'bot_not_configured' }),
        entry({ subjectId: id(6), telegramState: 'unknown', reason: 'stale_lease' }),
        entry({ subjectId: id(7), telegramState: 'refused', reason: 'stale', occasion: 'last_day', poolLabel: null, lastDate: '13-11-2026' }),
        entry({ subjectId: id(8), telegramState: 'deferred', reason: 'tg_429' }),
      ],
    } satisfies AnnouncementPostsResponse;
    renderWithClient(<ChannelConfigPage pariwarId={PARIWAR} />);
    const s = await section();
    const items = await s.findAllByTestId('announcement-post');
    const reasonOf = (i: number) => within(items[i]!).queryByTestId('announcement-post-reason')?.textContent ?? null;
    expect(reasonOf(0)).toBe(" — The bot's token could not be read");
    expect(reasonOf(1)).toBe(" — The deceased member's name could not be read");
    expect(reasonOf(2)).toBe(' — Telegram refused it (error 403)');
    expect(reasonOf(3)).toBe(' — Telegram kept asking us to wait, so the post was given up');
    expect(reasonOf(4)).toBe(" — This Pariwar's Telegram bot is not set up");
    expect(reasonOf(5)).toBe(' — The attempt did not finish');
    expect(reasonOf(6)).toBe(' — Too late to post — the moment had passed');
    expect(reasonOf(7)).toBeNull(); // a `deferred` row's state label already says why
    expect(within(items[7]!).getByText('Waiting — Telegram asked us to slow down')).toBeInTheDocument();
    expect(s.queryByText('Telegram refused it')).toBeNull();
  });

  it('⭐ FS4 — switch ON: the exact words and a Copy button that copies them and says "Copied"; an unavailable row says why', async () => {
    h.posts = {
      enabled: true,
      posts: [
        entry({ words: WORDS }),
        entry({ subjectId: '55555555-5555-4555-8555-555555555555', poolLabel: 'B', telegramState: 'not_attempted', wordsUnavailable: true }),
        entry({ occasion: 'last_day', subjectId: ALERT, poolLabel: null, lastDate: '13-11-2026', telegramState: 'unknown', reason: 'timeout_or_network', words: 'आज, 13-11-2026 …\n\nToday, 13-11-2026 …' }),
        entry({ subjectId: '66666666-6666-4666-8666-666666666666', poolLabel: 'C', telegramState: 'skipped', reason: 'stale' }),
      ],
    } satisfies AnnouncementPostsResponse;
    const user = setupUser();
    renderWithClient(<ChannelConfigPage pariwarId={PARIWAR} />);
    const s = await section();
    const items = await s.findAllByTestId('announcement-post');
    expect(items).toHaveLength(4);
    expect(within(items[0]!).getByText('Posted to Telegram')).toBeInTheDocument();
    expect(items[0]!.querySelector('pre')?.textContent).toBe(WORDS);
    // G2-P10 — the live region exists (empty) BEFORE the outcome, so the change is announced
    expect(within(items[0]!).getByRole('status')).toHaveTextContent('');
    await user.click(within(items[0]!).getByRole('button', { name: 'Copy' }));
    expect(writeText).toHaveBeenCalledWith(WORDS);
    expect(await within(items[0]!).findByRole('button', { name: 'Copied' })).toBeInTheDocument();
    expect(within(items[0]!).getByRole('status')).toHaveAttribute('aria-live', 'polite');
    expect(within(items[0]!).getByRole('status')).toHaveTextContent('Copied');
    expect(within(items[1]!).getByRole('alert')).toHaveTextContent(/could not be built/);
    expect(within(items[2]!).getByText('Last day — 13-11-2026')).toBeInTheDocument();
    expect(within(items[2]!).getByText('May have posted — check the channel', { exact: false })).toBeInTheDocument();
    expect(within(items[2]!).getByTestId('announcement-post-reason')).toHaveTextContent('Telegram did not answer in time');
    // `-419` item 6 (b) — ON, but the server sent no words (the alert is not live — not yet, or no longer; or a last day past its
    // deadline): the row says so, true for each case (review FS-5), with no Copy
    expect(within(items[3]!).queryByRole('button', { name: 'Copy' })).toBeNull();
    expect(within(items[3]!).getByText('No words to post — this cycle is not open.')).toBeInTheDocument();
  });

  it('a clipboard failure says so, and announces it (the admin can still select the text)', async () => {
    writeText.mockRejectedValue(new Error('denied'));
    h.posts = { enabled: true, posts: [entry({ words: WORDS })] } satisfies AnnouncementPostsResponse;
    const user = setupUser();
    renderWithClient(<ChannelConfigPage pariwarId={PARIWAR} />);
    const s = await section();
    await user.click(await s.findByRole('button', { name: 'Copy' }));
    expect(await s.findByRole('button', { name: /Copy failed/ })).toBeInTheDocument();
    expect(s.getByRole('status')).toHaveTextContent(/Copy failed/);
  });

  it('⭐ G2-P9 — with NO `navigator.clipboard` (an insecure context) Copy says "Copy failed", ⛔ an uncaught throw', async () => {
    h.posts = { enabled: true, posts: [entry({ words: WORDS })] } satisfies AnnouncementPostsResponse;
    const user = userEvent.setup();
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
    renderWithClient(<ChannelConfigPage pariwarId={PARIWAR} />);
    const s = await section();
    await user.click(await s.findByRole('button', { name: 'Copy' }));
    expect(await s.findByRole('button', { name: /Copy failed/ })).toBeInTheDocument();
  });

  it('⭐ G2-P1 — the audited, name-decrypting "Posts" read is ⛔ re-fetched on a window focus or a reconnect', async () => {
    h.posts = { enabled: true, posts: [entry({ words: WORDS })] } satisfies AnnouncementPostsResponse;
    renderWithClient(<ChannelConfigPage pariwarId={PARIWAR} />);
    const s = await section();
    await s.findByTestId('announcement-post');
    const postsCalls = vi.mocked(api.getAnnouncementPosts).mock.calls.length;
    const configCalls = vi.mocked(api.getAnnouncementChannelsConfig).mock.calls.length;
    await act(async () => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
      onlineManager.setOnline(false);
      onlineManager.setOnline(true);
    });
    // the control: the (un-audited) config query DOES refetch on focus — so the event reached the client
    await waitFor(() => expect(vi.mocked(api.getAnnouncementChannelsConfig).mock.calls.length).toBeGreaterThan(configCalls));
    expect(vi.mocked(api.getAnnouncementPosts).mock.calls.length).toBe(postsCalls);
    focusManager.setFocused(undefined);
  });

  it('⭐ G2-P16 — the form re-syncs to fresh server data, but ⛔ over an edit in progress', async () => {
    const client = createQueryClient();
    const user = setupUser();
    render(
      <QueryClientProvider client={client}>
        <ChannelConfigPage pariwarId={PARIWAR} />
      </QueryClientProvider>,
    );
    const s = await section();
    const enabledBox = await s.findByTestId('announcement-enabled');
    expect(enabledBox).not.toBeChecked();
    // another admin switched the channels on: a refetch reaches the (untouched) form
    h.config = { configured: true, config: { enabled: true, telegramChannelChatId: null, telegramInviteUrl: null, whatsappChannelUrl: 'https://whatsapp.com/channel/0029Va' } };
    await act(async () => {
      await client.invalidateQueries({ queryKey: announcementChannelsConfigKey(PARIWAR) });
    });
    await waitFor(() => expect(s.getByTestId('announcement-enabled')).toBeChecked());
    expect(s.getByLabelText('WhatsApp Channel link')).toHaveValue('https://whatsapp.com/channel/0029Va');
    // now the admin edits; a further server change must ⛔ wipe the typing
    await user.clear(s.getByLabelText('WhatsApp Channel link'));
    await user.type(s.getByLabelText('WhatsApp Channel link'), 'https://whatsapp.com/channel/0029Vb');
    h.config = { configured: true, config: { enabled: false, telegramChannelChatId: null, telegramInviteUrl: null, whatsappChannelUrl: null } };
    const reads = vi.mocked(api.getAnnouncementChannelsConfig).mock.calls.length;
    await act(async () => {
      await client.invalidateQueries({ queryKey: announcementChannelsConfigKey(PARIWAR) });
    });
    expect(vi.mocked(api.getAnnouncementChannelsConfig).mock.calls.length).toBeGreaterThan(reads);
    expect(s.getByLabelText('WhatsApp Channel link')).toHaveValue('https://whatsapp.com/channel/0029Vb');
    expect(s.getByTestId('announcement-enabled')).toBeChecked();
  });

  it('⭐ FS-2 — after a save that BLANKS or TRIMS a field, the form is in step with the server again, so a later server change still re-syncs it', async () => {
    h.config = { configured: true, config: { enabled: true, telegramChannelChatId: null, telegramInviteUrl: null, whatsappChannelUrl: 'https://whatsapp.com/channel/0029Va' } };
    const client = createQueryClient();
    const user = setupUser();
    render(
      <QueryClientProvider client={client}>
        <ChannelConfigPage pariwarId={PARIWAR} />
      </QueryClientProvider>,
    );
    const s = await section();
    await waitFor(() => expect(s.getByLabelText('WhatsApp Channel link')).toHaveValue('https://whatsapp.com/channel/0029Va'));
    const serverChange = async (config: Record<string, unknown>) => {
      h.config = { configured: true, config };
      await act(async () => {
        await client.invalidateQueries({ queryKey: announcementChannelsConfigKey(PARIWAR) });
      });
    };
    // (1) blank the link and save — the server stores null
    await user.clear(s.getByLabelText('WhatsApp Channel link'));
    await user.click(s.getByTestId('announcement-config-submit'));
    await waitFor(() => expect(h.puts).toHaveLength(1));
    expect(h.puts[0]).toMatchObject({ whatsappChannelUrl: null });
    await serverChange({ enabled: false, telegramChannelChatId: null, telegramInviteUrl: null, whatsappChannelUrl: null });
    await waitFor(() => expect(s.getByTestId('announcement-enabled')).not.toBeChecked());
    // (2) type a link with stray spaces and save — the server stores it TRIMMED
    await user.type(s.getByLabelText('WhatsApp Channel link'), '  https://whatsapp.com/channel/0029Vc  ');
    await user.click(s.getByTestId('announcement-config-submit'));
    await waitFor(() => expect(h.puts).toHaveLength(2));
    expect(h.puts[1]).toMatchObject({ whatsappChannelUrl: 'https://whatsapp.com/channel/0029Vc' });
    await serverChange({ enabled: true, telegramChannelChatId: null, telegramInviteUrl: null, whatsappChannelUrl: 'https://whatsapp.com/channel/0029Vd' });
    await waitFor(() => expect(s.getByTestId('announcement-enabled')).toBeChecked());
    expect(s.getByLabelText('WhatsApp Channel link')).toHaveValue('https://whatsapp.com/channel/0029Vd');
  });
});
