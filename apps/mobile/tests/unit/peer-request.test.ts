// Story 6.27a (Task 5; AC5's mobile half) — the neighbours' answer screens. DB-free and RN-render-free (the harness
// renders ⛔ no screen — `vitest.config.ts`), so this proves what a pure test CAN:
//   1. the PURE logic (`lib/peer-request.ts`): showIf against the current answers, page skipping, the required
//      question, the option toggle (multi + exclusive), the date field (real, ⛔ future, ⛔ before 1900), the failure map
//      (404 not-openable; 409 no-longer-open / submitted; 422 invalid; anything else RETRIES), the backoff;
//   2. the CHROME through the REAL `t()` in en AND hi (⛔ a stub — [[feedback_stub_must_call_not_transcribe]]), with
//      the PM8 no-longer-open words verbatim;
//   3. source scans: ⛔ a claim, a family or an amount on any peer-request screen; the not-openable state carries the
//      helpline; ⛔ a FlatList; memos depend on `locale`, ⛔ `t`; the home card and the notice-strip item are mounted;
//      ⛔ a Turnstile; the Idempotency-Key reused on a retry.

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { PeerRequestQuestion } from '@twt/contracts'
import { t } from '@twt/i18n'
import { describe, expect, it } from 'vitest'

import {
  answersToMap,
  canLeavePage,
  classifyFailure,
  isShown,
  newIdempotencyKey,
  parseDisplayDate,
  retryDelayMs,
  toDisplayDate,
  todayInIst,
  toggleOption,
  visiblePages,
  wordsIn,
} from '../../lib/peer-request'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const read = (rel: string): string => readFileSync(path.join(root, rel), 'utf8')
const strip = (src: string): string => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
const w = (s: string) => ({ en: s, hi: `hi:${s}` })

const HAS_DIED: PeerRequestQuestion = {
  key: 'has_died',
  kind: 'single',
  words: w('Has A died?'),
  options: ['died', 'not_died', 'not_sure', 'did_not_know'].map((code) => ({ code, words: w(code), exclusive: false })),
  optional: false,
  showIf: null,
}
const DATE: PeerRequestQuestion = {
  key: 'death_date',
  kind: 'date',
  words: w('When?'),
  options: [{ code: 'unknown', words: w('unknown'), exclusive: false }],
  optional: true,
  showIf: { key: 'has_died', anyOf: ['died'] },
}
const ILLNESS: PeerRequestQuestion = {
  key: 'death_illness',
  kind: 'multi',
  words: w('Which?'),
  options: [
    { code: 'cancer', words: w('cancer'), exclusive: false },
    { code: 'tb', words: w('tb'), exclusive: false },
    { code: 'dont_know', words: w('dont_know'), exclusive: true },
  ],
  optional: true,
  showIf: null,
}
const CALLBACK: PeerRequestQuestion = { ...HAS_DIED, key: 'callback_consent', kind: 'yes_no', optional: true, options: [{ code: 'yes', words: w('yes'), exclusive: false }, { code: 'no', words: w('no'), exclusive: false }] }

describe('the pure logic', () => {
  it('showIf: the date only after "died"; a page whose questions are all hidden is skipped', () => {
    expect(isShown(DATE, new Map())).toBe(false)
    expect(isShown(DATE, new Map([['has_died', { codes: ['not_sure'] }]]))).toBe(false)
    expect(isShown(DATE, new Map([['has_died', { codes: ['died'] }]]))).toBe(true)
    const detail = { questionnaire: { versionId: 'v', pages: [{ questions: [HAS_DIED] }, { questions: [DATE] }, { questions: [CALLBACK] }], closingNote: w('n'), thankYou: w('t') } }
    expect(visiblePages(detail, new Map()).map((p) => p.map((q) => q.key))).toEqual([['has_died'], ['callback_consent']])
    expect(visiblePages(detail, new Map([['has_died', { codes: ['died'] }]])).map((p) => p.map((q) => q.key))).toEqual([['has_died'], ['death_date'], ['callback_consent']])
  })

  it('only an unanswered REQUIRED question holds the member on a page', () => {
    expect(canLeavePage([HAS_DIED, DATE], new Map())).toBe(false)
    expect(canLeavePage([HAS_DIED, DATE], new Map([['has_died', { codes: ['died'] }]]))).toBe(true)
    expect(canLeavePage([CALLBACK], new Map())).toBe(true)
  })

  it('the option toggle: single replaces; multi toggles; an exclusive option stands alone', () => {
    expect(toggleOption(HAS_DIED, { codes: ['died'] }, 'not_died')).toEqual({ codes: ['not_died'] })
    expect(toggleOption(ILLNESS, undefined, 'cancer')).toEqual({ codes: ['cancer'] })
    expect(toggleOption(ILLNESS, { codes: ['cancer'] }, 'tb')).toEqual({ codes: ['cancer', 'tb'] })
    expect(toggleOption(ILLNESS, { codes: ['cancer', 'tb'] }, 'cancer')).toEqual({ codes: ['tb'] })
    expect(toggleOption(ILLNESS, { codes: ['cancer'] }, 'dont_know')).toEqual({ codes: ['dont_know'] })
    expect(toggleOption(ILLNESS, { codes: ['dont_know'] }, 'tb')).toEqual({ codes: ['tb'] })
    expect(toggleOption(ILLNESS, { codes: ['tb'] }, 'tb')).toBeNull()
  })

  it('the date field: DD-MM-YYYY on screen, YYYY-MM-DD on the wire; real, ⛔ future, ⛔ before 1900', () => {
    expect(parseDisplayDate('5-10-2026', '2026-10-12')).toBe('2026-10-05')
    expect(parseDisplayDate('29-02-2024', '2026-10-12')).toBe('2024-02-29')
    expect(parseDisplayDate('29-02-2026', '2026-10-12')).toBeNull()
    expect(parseDisplayDate('13-10-2026', '2026-10-12')).toBeNull()
    expect(parseDisplayDate('31-12-1899', '2026-10-12')).toBeNull()
    expect(parseDisplayDate('2026-10-05', '2026-10-12')).toBeNull()
    expect(toDisplayDate('2026-10-05')).toBe('05-10-2026')
    expect(todayInIst(new Date('2026-10-11T19:00:00Z'))).toBe('2026-10-12') // 00:30 IST
  })

  it('the failure map: 404 not-openable; 409 no-longer-open / submitted; 422 invalid; everything else RETRIES', () => {
    expect(classifyFailure({ status: 404, code: 'peer_request.not_found' })).toBe('not_openable')
    expect(classifyFailure({ status: 409, code: 'peer_request.no_longer_open' })).toBe('no_longer_open')
    expect(classifyFailure({ status: 409, code: 'peer_request.submitted' })).toBe('submitted')
    expect(classifyFailure({ status: 422, code: 'peer_request.invalid_answer' })).toBe('invalid')
    expect(classifyFailure({ status: 409, code: 'peer_request.stale' })).toBe('retry')
    expect(classifyFailure({ status: 503 })).toBe('retry')
    expect(classifyFailure(new TypeError('Network request failed'))).toBe('retry')
    expect([1, 2, 3, 10].map(retryDelayMs)).toEqual([1000, 2000, 4000, 30000])
  })

  it('answersToMap, wordsIn, a fresh v4-shaped Idempotency-Key', () => {
    expect(answersToMap([{ questionKey: 'has_died', value: { codes: ['died'] }, savedAt: 'x' }]).get('has_died')).toEqual({ codes: ['died'] })
    expect(wordsIn(w('Hello'), 'en')).toBe('Hello')
    expect(wordsIn(w('Hello'), 'hi')).toBe('hi:Hello')
    const a = newIdempotencyKey()
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    expect(newIdempotencyKey()).not.toBe(a)
  })
})

describe('the chrome — the REAL t() in en AND hi', () => {
  const KEYS = [
    'card_title', 'card_body', 'title', 'list_empty', 'list_item_unnamed', 'loading', 'load_error', 'try_again', 'not_openable',
    'no_longer_open', 'saving', 'saved', 'not_saved_retrying', 'next', 'back', 'submit', 'done', 'required', 'date_hint',
    'date_invalid', 'date_save', 'invalid',
  ]
  for (const locale of ['en', 'hi'] as const) {
    it(locale, () => {
      for (const k of KEYS) expect(t(`peer_request.${k}`, undefined, { locale, namespace: 'claim' }).length, k).toBeGreaterThan(0)
      expect(t('peer_request.list_item', { member: 'A B' }, { locale, namespace: 'claim' })).toContain('A B')
      expect(t('peer_request.page_of', { page: '1', pages: '4' }, { locale, namespace: 'claim' })).toMatch(/1/)
    })
  }
  it('PM8 — the no-longer-open words, VERBATIM (en); ⛔ why', () => {
    expect(t('peer_request.no_longer_open', undefined, { locale: 'en', namespace: 'claim' })).toBe('Thank you — this request is no longer open.')
  })
  it('⛔ a claim, a family or an amount in any chrome string', () => {
    for (const k of KEYS) {
      const en = t(`peer_request.${k}`, { member: 'X', date: 'Y' }, { locale: 'en', namespace: 'claim' })
      expect(en, k).not.toMatch(/claim|family|nominee|₹|rupee|amount|payment/i)
    }
  })
})

describe('source scans', () => {
  const files = [
    'components/peer-request/PeerRequestSlot.tsx',
    'components/peer-request/PeerRequestList.tsx',
    'components/peer-request/PeerQuestionnaire.tsx',
    'components/peer-request/PeerRequestEntry.tsx',
    'components/peer-request/PeerRequestNotOpenable.tsx',
  ]
  const src = Object.fromEntries(files.map((f) => [f, strip(read(f))]))

  it('⛔ a FlatList (≤ 5 requests — a plain stack; empty / loading / error are whole states)', () => {
    for (const f of files) expect(src[f], f).not.toMatch(/FlatList/)
  })
  it('⛔ a Turnstile anywhere on these screens', () => {
    for (const f of files) expect(src[f], f).not.toMatch(/turnstile/i)
  })
  it('the not-openable state carries the shared helpline CTA and both messages', () => {
    const s = src['components/peer-request/PeerRequestNotOpenable.tsx']!
    expect(s).toContain('<CallHelplineCTA />')
    expect(s).toContain("'peer_request.not_openable'")
    expect(s).toContain("'peer_request.no_longer_open'")
  })
  it('memos and callbacks depend on `locale`, ⛔ on `t`', () => {
    const s = src['components/peer-request/PeerQuestionnaire.tsx']!
    for (const deps of s.matchAll(/\n {4}\[([^\]]*)\],\n {2}\)/g)) expect(`${deps[1]}`).not.toMatch(/\bt\b/)
    expect(s).toContain('[save.mutateAsync, locale]')
  })
  it('a retried save reuses ITS key (the key is minted once per save, outside the retry loop)', () => {
    const s = src['components/peer-request/PeerQuestionnaire.tsx']!
    const keyAt = s.indexOf('const idempotencyKey = newIdempotencyKey()')
    const loopAt = s.indexOf('for (let attempt = 1;')
    expect(keyAt).toBeGreaterThan(0)
    expect(keyAt).toBeLessThan(loopAt)
  })
  it('the closing note and the Thank-you are the SERVER\'s words (⛔ app copy)', () => {
    const s = src['components/peer-request/PeerQuestionnaire.tsx']!
    expect(s).toContain('wordsIn(detail.questionnaire.closingNote, locale)')
    expect(s).toContain('wordsIn(detail.questionnaire.thankYou, locale)')
  })
  it('the home card and the notice-strip item are mounted (PM2) — beside, ⛔ inside, <PollsEntry />', () => {
    expect(read('app/(tabs)/index.tsx')).toContain('<PeerRequestEntry />')
    const nb = read('components/panchayat/PanchayatNoticeboard.tsx')
    expect(nb).toMatch(/<PeerRequestEntry \/>\s*<PollsEntry \/>/)
    // the banner lane is untouched — ONE source
    expect(nb).not.toMatch(/bannerNotice:\s*\[/)
  })
  it('the entry renders nothing until a TEXTED request is open (the server list) and calls nothing before the session', () => {
    const s = src['components/peer-request/PeerRequestEntry.tsx']!
    expect(s).toContain('if (!data || data.items.length === 0) return null')
    expect(s).toContain('usePeerRequestsQuery(isLoading ? undefined : session?.pariwarId)')
  })
})
