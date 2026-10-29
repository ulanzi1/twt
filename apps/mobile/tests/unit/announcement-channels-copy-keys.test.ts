// Story 5.14 (Task 7; AC9; `2026-10-29-417` FS8 (a) "The words") — the ask's words. Every literal `announcementChannels.*` key the card,
// the entry, the screen, the join buttons and the body chooser use EXISTS in `common` and resolves through the REAL `t()` in BOTH
// locales (⛔ a hand-built fixture — [[feedback_stub_must_call_not_transcribe]]); the scanned set must EQUAL the approved list, so a
// key the regex cannot see fails it. The words never say a member must join, that something is required, or that a member will miss
// anything, and never say "Settings" (the app has none) — G9, I7 (the wa-signup-copy-keys shape).
// ⚠ Code review G3-P8 ([[feedback_gate_scope_semantic_coverage]]) — the banned list now covers the spellings a writer actually uses:
// ज़रूर with the nukta as TWO code points (ज + ़) AND precomposed (U+095B), जरूर with ⛔ nukta, आवश्यक, अनिवार्य; Hindi "lose / miss"
// (खो — ⛔ खोलें, "open", which the join buttons say —, छूट, चूक) and English "lose / miss". Each pattern is proven to catch a planted
// phrase, and the approved words still pass. Fix-diff review FM-4 — the short-u spellings (जरुर / ज़रुर, both nukta forms), and
// "should / will have to / certainly" (चाहिए, पड़ेगा in both nukta forms, अवश्य).

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
  'components/announcement-channels/ChannelLinkError.tsx',
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
/** ज़ precomposed (U+095B) — built from its code point so the file shows which form it is. */
const ZA_PRECOMPOSED = String.fromCodePoint(0x095b)
/** ड़ precomposed (U+095C) — likewise. */
const DDA_PRECOMPOSED = String.fromCodePoint(0x095c)
const BANNED = [
  /\bmust\b/i,
  /\brequired?\b/i,
  /\bmiss/i,
  /\blos(e|es|ing|t)\b/i,
  /\bsettings\b/i,
  /सेटिंग/,
  /ज़रूर/, // ज + nukta (U+091C U+093C) — ज़रूरी, ज़रूरत
  new RegExp(`${ZA_PRECOMPOSED}रूर`), // the same word, precomposed
  /जरूर/, // ⛔ nukta — the common typed form
  /ज\u093c?रुर/, // the short-u spelling, ⛔ nukta or ज + nukta (U+093C) — जरुरी / ज़रुरी
  new RegExp(`${ZA_PRECOMPOSED}रुर`), // the short-u spelling, precomposed
  /चाहिए/, // "should"
  /पड़ेगा/, // "will have to" — ड + nukta (U+0921 U+093C)
  new RegExp(`प${DDA_PRECOMPOSED}ेगा`), // the same word, precomposed
  /अवश्य/, // "certainly / must"
  /आवश्यक/,
  /अनिवार्य/,
  /खो(?!ल)/, // खो देंगे / खोना — "lose"; ⛔ खोलें ("open")
  /छूट/, // छूट जाएगी — "will be missed"
  /चूक/, // चूक जाएँगे — "will miss"
]
/** One planted phrase per pattern (same order) — each MUST be caught, or that pattern guards nothing. */
const PLANTED = [
  'You must join',
  'Joining is required',
  'You will miss a notice',
  'You may lose a notice',
  'Open Settings',
  'सेटिंग में जाएँ',
  'जुड़ना ज़रूरी है',
  `जुड़ना ${ZA_PRECOMPOSED}रूरी है`,
  'जुड़ना जरूरी है',
  'जुड़ना जरुरी है',
  `जुड़ना ${ZA_PRECOMPOSED}रुरी है`,
  'आपको जुड़ना चाहिए',
  'आपको जुड़ना पड़ेगा',
  `आपको जुड़ना प${DDA_PRECOMPOSED}ेगा`,
  'अवश्य जुड़ें',
  'जुड़ना आवश्यक है',
  'जुड़ना अनिवार्य है',
  'आप सूचना खो देंगे',
  'आपकी सूचना छूट जाएगी',
  'आप सूचना से चूक जाएँगे',
]

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

  it('⭐ G3-P8 — every banned pattern catches its planted phrase; ⛔ one catches the approved "open" (खोलें)', () => {
    expect(PLANTED).toHaveLength(BANNED.length)
    BANNED.forEach((re, i) => expect(PLANTED[i], String(re)).toMatch(re))
    expect(ZA_PRECOMPOSED).not.toBe('ज़') // the two-code-point form is a DIFFERENT string
    expect('जुड़ना ज़रुरी है').toMatch(BANNED.find((re) => re.source.includes('u093c?'))!) // the short-u pattern also catches ज + nukta
    for (const s of ['व्हाट्सएप चैनल खोलें', 'टेलीग्राम चैनल खोलें', 'Open the Telegram channel']) for (const re of BANNED) expect(s).not.toMatch(re)
  })

  it('⭐ G4 / R10(B) — every body keeps the app the place for every notice, and says joining is a choice', () => {
    for (const key of ['announcementChannels.body_both', 'announcementChannels.body_whatsapp', 'announcementChannels.body_telegram']) {
      expect(t(key, undefined, { locale: 'en' })).toMatch(/is your choice — every notice is always in this app\.$/)
      expect(t(key, undefined, { locale: 'hi' })).toMatch(/आपकी इच्छा है — हर सूचना हमेशा इस ऐप में रहती है।$/)
    }
  })
})
