// Story 3.13a (Task 3; AC4, AC6; DL1, DL3, DL6) — the card's words AS APPROVED (`2026-11-26-508`: the Panel note's table, by
// reading — ⛔ change given), the reason → how-key map AS RULED (Q2 (ii)), the words' bans, and the source pins: where the card is
// mounted and where its cache is cleared. The words resolve through the REAL `t()` ([[feedback_stub_must_call_not_transcribe]]).
// ⭐ A ruling that changes a word changes ONE table below and the two JSON files together (Trap 8).

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { getCatalog, t } from '@twt/i18n'
import { describe, expect, it } from 'vitest'

import {
  IDENTITY_CHECK_HOW_KEY_BY_REASON,
  IDENTITY_CHECK_REASON_KEY_BY_REASON,
} from '../../components/identity-check/identity-check-notice-keys'

const ROOT = resolve(__dirname, '../..')
const read = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf8')
const commonT = (key: string, locale: 'en' | 'hi') => t(key, undefined, { locale, namespace: 'common' })

/** ⭐ `-508` — the approved words, word for word (the Panel note's table; the story's PQ1 table). */
const APPROVED = {
  en: {
    "identity_check.notice.title":
      "We could not confirm your identity yet",
    "identity_check.notice.reason.details_do_not_match":
      "Reason: the details on your photo ID did not match the details you gave when you joined.",
    "identity_check.notice.reason.photo_does_not_match":
      "Reason: the photo did not match.",
    "identity_check.notice.reason.no_document_shown":
      "Reason: no photo ID was shown.",
    "identity_check.notice.reason.member_not_reached":
      "Reason: we could not reach you.",
    "identity_check.notice.how":
      "To finish this, show an original government photo ID (for example your Aadhaar card, PAN card or voter ID card) to the Trust's staff, in person or on a video call. Staff may phone you to arrange it, or you can ask for help here.",
    "identity_check.notice.how_not_reached":
      "To finish this, show an original government photo ID (for example your Aadhaar card, PAN card or voter ID card) to the Trust's staff, in person or on a video call. You can ask for help here to arrange it.",
    "identity_check.notice.how_details":
      "To finish this, show the Trust's staff an original government photo ID whose details match the ones you gave when you joined (for example your Aadhaar card, PAN card or voter ID card), in person or on a video call. You can ask for help here to arrange it. If a detail you gave was wrong, ask for help here too.",
    "identity_check.notice.ask_help":
      "Ask for help",
  },
  hi: {
    "identity_check.notice.title":
      "आपकी पहचान की पुष्टि अभी नहीं हो सकी",
    "identity_check.notice.reason.details_do_not_match":
      "कारण: आपके फ़ोटो पहचान पत्र का विवरण, जुड़ते समय दिए गए आपके विवरण से मेल नहीं खाया।",
    "identity_check.notice.reason.photo_does_not_match":
      "कारण: फ़ोटो मेल नहीं खाई।",
    "identity_check.notice.reason.no_document_shown":
      "कारण: कोई फ़ोटो पहचान पत्र नहीं दिखाया गया।",
    "identity_check.notice.reason.member_not_reached":
      "कारण: हम आपसे संपर्क नहीं कर सके।",
    "identity_check.notice.how":
      "इसे पूरा करने के लिए, अपना कोई मूल सरकारी फ़ोटो पहचान पत्र (जैसे आधार कार्ड, पैन कार्ड या वोटर आईडी कार्ड) ट्रस्ट के कर्मचारियों को आमने-सामने या वीडियो कॉल पर दिखाएँ। कर्मचारी समय तय करने के लिए आपको फ़ोन कर सकते हैं, या आप यहाँ मदद माँग सकते हैं।",
    "identity_check.notice.how_not_reached":
      "इसे पूरा करने के लिए, अपना कोई मूल सरकारी फ़ोटो पहचान पत्र (जैसे आधार कार्ड, पैन कार्ड या वोटर आईडी कार्ड) ट्रस्ट के कर्मचारियों को आमने-सामने या वीडियो कॉल पर दिखाएँ। समय तय करने के लिए आप यहाँ मदद माँग सकते हैं।",
    "identity_check.notice.how_details":
      "इसे पूरा करने के लिए, ट्रस्ट के कर्मचारियों को आमने-सामने या वीडियो कॉल पर अपना कोई ऐसा मूल सरकारी फ़ोटो पहचान पत्र (जैसे आधार कार्ड, पैन कार्ड या वोटर आईडी कार्ड) दिखाएँ, जिसका विवरण जुड़ते समय दिए गए आपके विवरण से मेल खाता हो। समय तय करने के लिए आप यहाँ मदद माँग सकते हैं। अगर आपका दिया कोई विवरण गलत था, तो उसके लिए भी यहाँ मदद माँगें।",
    "identity_check.notice.ask_help":
      "मदद माँगें",
  },
} as const

/** ⭐ `-508` Q2 (ii) — the how line BY THE REASON. A LITERAL (⛔ read back from the export). */
const HOW_KEY = {
  details_do_not_match: 'identity_check.notice.how_details',
  photo_does_not_match: 'identity_check.notice.how',
  no_document_shown: 'identity_check.notice.how',
  member_not_reached: 'identity_check.notice.how_not_reached',
}

describe('AC6 — the words are the approved words, through the real `t()`', () => {
  for (const locale of ['en', 'hi'] as const) {
    it(`[${locale}] each key resolves to the approved line`, () => {
      for (const [key, line] of Object.entries(APPROVED[locale])) expect(commonT(key, locale)).toBe(line)
    })

    it(`[${locale}] \`identity_check.notice.*\` in common is EXACTLY the approved key set (⛔ an extra, ⛔ a missing line)`, () => {
      const keys = Object.keys(getCatalog(locale, 'common') as Record<string, string>).filter((k) => k.startsWith('identity_check.'))
      expect(keys.sort()).toEqual(Object.keys(APPROVED[locale]).sort())
    })
  }

  it('the reason → how-key map is the ruled one; every reason has its own reason line', () => {
    expect(IDENTITY_CHECK_HOW_KEY_BY_REASON).toEqual(HOW_KEY)
    for (const reason of Object.keys(HOW_KEY)) {
      expect(IDENTITY_CHECK_REASON_KEY_BY_REASON[reason as keyof typeof HOW_KEY]).toBe(`identity_check.notice.reason.${reason}`)
    }
    expect(Object.keys(IDENTITY_CHECK_REASON_KEY_BY_REASON).sort()).toEqual(Object.keys(HOW_KEY).sort())
  })

  // ⛔ a promise nothing builds (Trap 5): ⛔ "submit again", ⛔ lock-in / cover (row 3-14's), ⛔ a time limit or a number.
  const BANS: [string, RegExp, string][] = [
    ['submit', /submit/i, 'Please submit it'],
    ['again', /again/i, 'try again'],
    ['lock-in', /lock-in/i, 'your lock-in ends'],
    ['cover', /cover/i, 'cover begins'],
    ['फिर', /फिर/, 'फिर से'],
    ['दोबारा', /दोबारा/, 'दोबारा भेजें'],
    ['लॉक-इन', /लॉक-इन/, 'लॉक-इन अवधि'],
    ['कवर (also catches कवरेज)', /कवर/, 'कवरेज प्रारंभ'],
    ['a Latin digit', /[0-9]/, 'within 7 days'],
    ['a Devanagari digit', /[०-९]/, '७ दिन में'],
  ]
  it.each(BANS)('⛔ %s in any line, either locale — with the control that the pattern bites', (_label, pattern, control) => {
    expect(control).toMatch(pattern)
    for (const locale of ['en', 'hi'] as const) {
      for (const key of Object.keys(APPROVED[locale])) expect(commonT(key, locale)).not.toMatch(pattern)
    }
  })
})

describe('AC4 — the source pins: the mount and the clears', () => {
  const home = read('app/(tabs)/index.tsx')
  const session = read('lib/session-context.tsx')

  it('⭐ the card is mounted directly between `<AnnouncementChannelsCard />` and `<LockInClockWidget />` (only a comment between), BELOW `<ActiveContributionCard />`', () => {
    expect(home).toMatch(/<AnnouncementChannelsCard \/>\s*(?:\{\/\*[\s\S]*?\*\/\}\s*)?<IdentityCheckNoticeCard \/>\s*<LockInClockWidget \/>/)
    expect(home.match(/<IdentityCheckNoticeCard \/>/g)).toHaveLength(1)
    expect(home.indexOf('<ActiveContributionCard />')).toBeGreaterThan(-1)
    expect(home.indexOf('<ActiveContributionCard />')).toBeLessThan(home.indexOf('<IdentityCheckNoticeCard />'))
  })

  it('⭐ `clearIdentityCheckNoticeCache(queryClient)` follows EACH of the four `clearAnnouncementChannelsCache(queryClient)` (⛔ between the known-people and announcement clears)', () => {
    const pairs = [...session.matchAll(/clearAnnouncementChannelsCache\(queryClient\)\s*\n\s*clearIdentityCheckNoticeCache\(queryClient\)/g)]
    expect(pairs).toHaveLength(4)
    expect(session.match(/clearAnnouncementChannelsCache\(queryClient\)/g)).toHaveLength(4)
    expect(session.match(/clearIdentityCheckNoticeCache\(queryClient\)/g)).toHaveLength(4)
  })
})
