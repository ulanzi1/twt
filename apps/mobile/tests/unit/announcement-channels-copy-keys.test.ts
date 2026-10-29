// Story 5.14 (Task 7; AC9; `2026-10-29-417` FS8 (a) "The words") — the ask's words. Every literal `announcementChannels.*` key the card,
// the entry, the screen, the join buttons and the body chooser use EXISTS in `common` and resolves through the REAL `t()` in BOTH
// locales (⛔ a hand-built fixture — [[feedback_stub_must_call_not_transcribe]]); the scanned set must EQUAL the approved list, so a
// key the regex cannot see fails it. The words never say a member must join, that something is required, or that a member will miss
// anything, and never say "Settings" (the app has none) — G9, I7 (the wa-signup-copy-keys shape).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { getCatalog, t } from '@twt/i18n'
import { describe, expect, it } from 'vitest'

const MOBILE = join(__dirname, '..', '..')
const FILES = [
  'components/home/AnnouncementChannelsCard.tsx',
  'components/notifications/AnnouncementChannelsEntry.tsx',
  'app/(settings)/announcement-channels.tsx',
  'components/announcement-channels/ChannelLinkButtons.tsx',
  'components/announcement-channels/useAnnouncementChannelsQuery.ts',
]
/** `-417` FS8 — the eleven approved keys (the Hindi reviewed by BigDev, 2026-10-29). */
const EXPECTED = [
  'announcementChannels.body_both',
  'announcementChannels.body_telegram',
  'announcementChannels.body_whatsapp',
  'announcementChannels.card_title',
  'announcementChannels.entry_hint',
  'announcementChannels.entry_label',
  'announcementChannels.join_telegram',
  'announcementChannels.join_whatsapp',
  'announcementChannels.link_error',
  'announcementChannels.not_now',
  'announcementChannels.screen_title',
]
const BANNED = [/\bmust\b/i, /\brequired\b/i, /\bmiss/i, /\bsettings\b/i, /सेटिंग/, /ज़रूरी/, /अनिवार्य/]

const used = (): string[] => {
  const keys = new Set<string>()
  for (const f of FILES) for (const m of readFileSync(join(MOBILE, f), 'utf8').matchAll(/'(announcementChannels\.[a-z_]+)'/g)) keys.add(m[1]!)
  return [...keys].sort()
}

describe('the announcement channels ask — its words (AC9)', () => {
  it('the scanned key set EQUALS the approved list, and the catalogue holds no other announcementChannels key', () => {
    expect(used()).toEqual(EXPECTED)
    for (const locale of ['en', 'hi'] as const) {
      const keys = Object.keys(getCatalog(locale, 'common')).filter((k) => k.startsWith('announcementChannels.')).sort()
      expect(keys).toEqual(EXPECTED)
    }
  })

  it.each(['en', 'hi'] as const)('every key resolves through the real t() in %s, and ⛔ a banned word', (locale) => {
    for (const key of EXPECTED) {
      const s = t(key, undefined, { locale })
      expect(s.length, key).toBeGreaterThan(0)
      for (const re of BANNED) expect(s, `${locale}:${key}`).not.toMatch(re)
    }
  })

  it('⭐ G4 / R10(B) — every body keeps the app the place for every notice, and says joining is a choice', () => {
    for (const key of ['announcementChannels.body_both', 'announcementChannels.body_whatsapp', 'announcementChannels.body_telegram']) {
      expect(t(key, undefined, { locale: 'en' })).toMatch(/is your choice — every notice is always in this app\.$/)
      expect(t(key, undefined, { locale: 'hi' })).toMatch(/आपकी इच्छा है — हर सूचना हमेशा इस ऐप में रहती है।$/)
    }
  })
})
