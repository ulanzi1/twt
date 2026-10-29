// Story 5.14 (Task 2; AC2, AC3, AC4, AC7) — the Trust's announcement channels contract: the post builder through the REAL `t()` (a
// devDependency — F17), the name-mode pin to `2026-10-29-416`, the DTO refinements equal to migration 0190's CHECKs (and the patterns
// pinned to the domain constants — a TEST-only cross-package import, so `pg` never reaches the mobile bundle), and the moved
// `operationalDate` / new `cycleDeadlineAt` (one date for the day-14 reminder, the last-day post and the admin list). Fixtures are
// hand-built ([[project_contracts_tests_outside_tsc]]).

import { schema } from '@twt/domain';
import { t } from '@twt/i18n';
import { describe, expect, it } from 'vitest';

import {
  ANNOUNCEMENT_CHANNEL_URL_MAX_LENGTH,
  ANNOUNCEMENT_POST_KEYS,
  ANNOUNCEMENT_POST_NAME_MODE,
  ANNOUNCEMENT_TELEGRAM_CHAT_ID_REGEX,
  ANNOUNCEMENT_TELEGRAM_INVITE_URL_REGEX,
  ANNOUNCEMENT_WHATSAPP_CHANNEL_URL_REGEX,
  AnnouncementChannelsConfigDto,
  AnnouncementChannelsMemberResponse,
  AnnouncementPostsResponse,
  CYCLE_WINDOW_DAYS,
  buildAnnouncementPost,
  cycleDeadlineAt,
  operationalDate,
  type AnnouncementPostInput,
} from '../src/index.js';

const NS = { namespace: 'contribution' } as const;

describe('Story 5.14 — buildAnnouncementPost (AC4, AC7)', () => {
  it('⭐ FS6 — the name mode is pinned to `2026-10-29-416` (Trustee-ratified: "option A, full name")', () => {
    expect(ANNOUNCEMENT_POST_NAME_MODE).toBe('full_name');
  });

  it('⭐ FS8 — ONE bilingual post: the Hindi, a blank line, the English — exactly the catalogue words through the real t()', () => {
    const post = buildAnnouncementPost(t, { occasion: 'pool_open', poolLabel: 'A', deceasedName: 'Ramesh Kumar Singh' });
    const hi = t(ANNOUNCEMENT_POST_KEYS.poolOpenNamed, { pool: 'A', deceasedName: 'Ramesh Kumar Singh' }, { ...NS, locale: 'hi' });
    const en = t(ANNOUNCEMENT_POST_KEYS.poolOpenNamed, { pool: 'A', deceasedName: 'Ramesh Kumar Singh' }, { ...NS, locale: 'en' });
    expect(post).toBe(`${hi}\n\n${en}`);
    expect(en).toBe(
      "Pool A is now open, in support of Ramesh Kumar Singh's family. If you are assigned to this pool, please open the app to contribute.",
    );
    expect(hi).toBe('पूल A अब खुल गया है, Ramesh Kumar Singh के परिवार के सहयोग हेतु। यदि आप इस पूल से जुड़े हैं, तो सुविधानुसार ऐप खोलकर योगदान करें।');
    // plain text — ⛔ markup, ⛔ a link (T10); well under Telegram's 4096 cap (T11)
    expect(post).not.toMatch(/<|https?:|\*\*/);
    expect(post.length).toBeLessThan(600);
  });

  it('⭐ I5 — the name is the whole stored name, a one-word name in full; ⛔ a member field in the post', () => {
    const mononym = buildAnnouncementPost(t, { occasion: 'pool_open', poolLabel: 'B', deceasedName: 'Sunita' });
    expect(mononym).toContain("in support of Sunita's family");
    expect(mononym).toContain('Sunita के परिवार');
    const long = 'Shri Ramchandra Prasad Yadav Vishwakarma Chaurasiya';
    expect(buildAnnouncementPost(t, { occasion: 'pool_open', poolLabel: 'C', deceasedName: long })).toContain(long);
  });

  it('⭐ I5 — full_name mode REFUSES a missing name (the caller writes refused:identity_unavailable); ⛔ an unnamed post', () => {
    expect(() => buildAnnouncementPost(t, { occasion: 'pool_open', poolLabel: 'A', deceasedName: null })).toThrow(/identity_unavailable/);
    expect(() => buildAnnouncementPost(t, { occasion: 'pool_open', poolLabel: 'A', deceasedName: '  ' })).toThrow(/identity_unavailable/);
  });

  it('the `none` variant stays built: no name, whatever is passed', () => {
    const post = buildAnnouncementPost(t, { occasion: 'pool_open', poolLabel: 'A', deceasedName: 'Ramesh' }, 'none');
    expect(post).not.toContain('Ramesh');
    expect(post).toBe(
      `${t(ANNOUNCEMENT_POST_KEYS.poolOpenUnnamed, { pool: 'A' }, { ...NS, locale: 'hi' })}\n\n${t(ANNOUNCEMENT_POST_KEYS.poolOpenUnnamed, { pool: 'A' }, { ...NS, locale: 'en' })}`,
    );
  });

  it('FS5 — the last day names no pool and no one; its date is the day-14 reminder\'s', () => {
    const post = buildAnnouncementPost(t, { occasion: 'last_day', lastDate: '13-11-2026' });
    expect(post).toBe(
      'आज, 13-11-2026, इस चक्र का अंतिम दिन है। यदि संभव हो, तो कृपया ऐप में योगदान करें।\n\nToday, 13-11-2026, is the last day of this cycle. If you are able, please contribute in the app.',
    );
    // ⭐ AC4 — the SAME date string the member's day-14 reminder shows ("Today, {date}").
    const committedAt = new Date('2026-10-29T03:00:00.000Z');
    const date = operationalDate(cycleDeadlineAt(committedAt));
    expect(t('notify.deadline.day_14.display', { date }, { ...NS, locale: 'en' })).toBe(`Today, ${date}`);
    expect(buildAnnouncementPost(t, { occasion: 'last_day', lastDate: date })).toContain(`Today, ${date}, is the last day`);
  });

  it('⭐ I4 — the input type has NO member field', () => {
    const ok: AnnouncementPostInput = { occasion: 'pool_open', poolLabel: 'A', deceasedName: 'X' };
    expect(ok.occasion).toBe('pool_open');
    // @ts-expect-error — a member's name / mobile / status is not part of a post
    const bad: AnnouncementPostInput = { occasion: 'pool_open', poolLabel: 'A', deceasedName: 'X', memberName: 'Y' };
    expect(bad).toBeDefined();
  });

  it('catalogue parity: every channel_post key resolves in BOTH languages', () => {
    for (const key of Object.values(ANNOUNCEMENT_POST_KEYS)) {
      for (const locale of ['hi', 'en'] as const) {
        expect(t(key, { pool: 'A', deceasedName: 'X', date: '01-01-2027' }, { ...NS, locale })).not.toBe('');
      }
    }
  });
});

describe('Story 5.14 — operationalDate (moved unchanged) and cycleDeadlineAt (AC4)', () => {
  it('operationalDate is the deadline\'s UTC calendar date, DD-MM-YYYY', () => {
    expect(operationalDate(new Date('2026-11-13T00:30:00.000Z'))).toBe('13-11-2026');
    expect(operationalDate(new Date('2026-11-12T23:59:59.999Z'))).toBe('12-11-2026');
  });

  it('cycleDeadlineAt = committedAt + CYCLE_WINDOW_DAYS whole days in ms', () => {
    const c = new Date('2026-10-29T10:00:00.000Z');
    expect(cycleDeadlineAt(c).getTime() - c.getTime()).toBe(CYCLE_WINDOW_DAYS * 86_400_000);
  });

  it('⚠ the ACCEPTED band (`-418` item 2): a cycle frozen 05:30–09:30 IST has its deadline date one day after the day-14 sweep', () => {
    // frozen 2026-10-29 07:00 IST = 01:30Z; the day-14 sweep is 2026-11-12 09:30 IST = 04:00Z; the deadline is 2026-11-13 01:30Z
    const deadline = cycleDeadlineAt(new Date('2026-10-29T01:30:00.000Z'));
    expect(operationalDate(deadline)).toBe('13-11-2026');
  });
});

describe('Story 5.14 — the DTOs (AC2, AC3)', () => {
  const base = { enabled: true, telegramChannelChatId: '@twt_bihar_notices', telegramInviteUrl: 'https://t.me/twt_bihar_notices', whatsappChannelUrl: 'https://whatsapp.com/channel/0029Va' };

  it('⭐ LOCKSTEP — the contract patterns equal the domain constants (and so migration 0190\'s CHECKs)', () => {
    expect(ANNOUNCEMENT_TELEGRAM_CHAT_ID_REGEX.source).toBe(new RegExp(schema.ANNOUNCEMENT_TELEGRAM_CHAT_ID_PATTERN).source);
    expect(ANNOUNCEMENT_TELEGRAM_INVITE_URL_REGEX.source).toBe(new RegExp(schema.ANNOUNCEMENT_TELEGRAM_INVITE_URL_PATTERN).source);
    expect(ANNOUNCEMENT_WHATSAPP_CHANNEL_URL_REGEX.source).toBe(new RegExp(schema.ANNOUNCEMENT_WHATSAPP_CHANNEL_URL_PATTERN).source);
    expect(ANNOUNCEMENT_CHANNEL_URL_MAX_LENGTH).toBe(schema.ANNOUNCEMENT_CHANNEL_URL_MAX_LENGTH);
  });

  it('the config accepts the CHECKs\' accept cases and a blank field as "not set"', () => {
    expect(AnnouncementChannelsConfigDto.parse(base)).toEqual(base);
    expect(AnnouncementChannelsConfigDto.parse({ ...base, telegramChannelChatId: '-1001234567890' }).telegramChannelChatId).toBe('-1001234567890');
    expect(AnnouncementChannelsConfigDto.parse({ enabled: false, telegramChannelChatId: '', telegramInviteUrl: '  ', whatsappChannelUrl: null })).toEqual({
      enabled: false,
      telegramChannelChatId: null,
      telegramInviteUrl: null,
      whatsappChannelUrl: null,
    });
  });

  it('the refinements equal the CHECKs: chat id, link prefixes, length, ⭐ the Telegram pairing (I7), .strict()', () => {
    const bad: Array<Record<string, unknown>> = [
      { ...base, telegramChannelChatId: '@abcd' },
      { ...base, telegramChannelChatId: '12345678' },
      { ...base, telegramInviteUrl: 'tg://resolve?domain=x' },
      { ...base, telegramInviteUrl: 'http://t.me/x' },
      { ...base, whatsappChannelUrl: 'https://chat.whatsapp.com/abc' },
      { ...base, whatsappChannelUrl: `https://whatsapp.com/channel/${'a'.repeat(300)}` },
      { ...base, telegramInviteUrl: null },
      { ...base, telegramChannelChatId: null },
      { ...base, botTokenSecretName: 'projects/x' },
    ];
    for (const b of bad) expect(AnnouncementChannelsConfigDto.safeParse(b).success, JSON.stringify(b)).toBe(false);
  });

  it('the member response and the posts list are .strict() (⛔ a stray field — e.g. a bot secret name)', () => {
    expect(AnnouncementChannelsMemberResponse.safeParse({ whatsappChannelUrl: null, telegramChannelUrl: null }).success).toBe(true);
    expect(AnnouncementChannelsMemberResponse.safeParse({ whatsappChannelUrl: null, telegramChannelUrl: null, botTokenSecretName: 'x' }).success).toBe(false);
    const entry = {
      occasion: 'pool_open',
      alertId: '11111111-1111-4111-8111-111111111111',
      subjectId: '22222222-2222-4222-8222-222222222222',
      poolLabel: 'A',
      lastDate: null,
      telegramState: 'not_attempted',
      words: null,
      wordsUnavailable: false,
    };
    expect(AnnouncementPostsResponse.safeParse({ enabled: false, posts: [entry] }).success).toBe(true);
    expect(AnnouncementPostsResponse.safeParse({ enabled: false, posts: [{ ...entry, memberName: 'x' }] }).success).toBe(false);
    expect(AnnouncementPostsResponse.safeParse({ enabled: false, posts: [{ ...entry, telegramState: 'delivered' }] }).success).toBe(false);
  });
});
