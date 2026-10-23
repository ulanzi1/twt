// Story 6.35 (AC10; LS7, LS13, LS14 (b)) — the words of the in-app language choice. Every literal key the new / edited files
// pass to `t('…')` EXISTS and resolves through the REAL `t()` in BOTH locales (⛔ a hand-built fixture —
// [[feedback_stub_must_call_not_transcribe]]); `(claim)/contact.tsx`'s `t` is `useClaimT()` ⇒ resolved with
// `namespace: 'claim'`. A key with `{param}` tokens is resolved WITH them (`t(key, undefined)` throws on one).
// The approved strings are pinned verbatim (BigDev, Decision 2026-10-23-387 LS14 (b)).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { getCatalog, t } from '@twt/i18n'
import { describe, expect, it } from 'vitest'

const MOBILE = join(__dirname, '..', '..')
const LOCALES = ['en', 'hi'] as const
const FILES: ReadonlyArray<readonly [string, 'common' | 'claim']> = [
  ['app/(settings)/language.tsx', 'common'],
  ['components/settings/LanguageSettingsEntry.tsx', 'common'],
  ['lib/app-language.ts', 'common'],
  ['app/(auth)/login.tsx', 'common'],
  ['app/(claim)/contact.tsx', 'claim'],
]

/** The literal keys passed to `t('…')` in a source file (camelCase segments allowed). */
function literalKeys(src: string): string[] {
  return [...src.matchAll(/\bt\(\s*'([A-Za-z_]+(?:\.[A-Za-z_]+)*)'/g)].map((m) => m[1]!)
}

/** Placeholder values for every `{param}` the value carries in either locale. */
function paramsFor(key: string, namespace: 'common' | 'claim'): Record<string, string> | undefined {
  const names = new Set<string>()
  for (const locale of LOCALES) {
    const v = getCatalog(locale, namespace)?.[key]
    if (typeof v === 'string') for (const m of v.matchAll(/\{(\w+)\}/g)) names.add(m[1]!)
  }
  return names.size === 0 ? undefined : Object.fromEntries([...names].map((n) => [n, 'x']))
}

describe('the keys the language choice uses (Story 6.35, AC10)', () => {
  it('the scan finds the keys (a positive control) and every key resolves in en AND hi through the real t()', () => {
    expect(literalKeys("t('language.title')")).toEqual(['language.title'])
    let total = 0
    const seen = new Set<string>()
    for (const [file, namespace] of FILES) {
      const keys = literalKeys(readFileSync(join(MOBILE, file), 'utf8'))
      total += keys.length
      for (const key of keys) {
        seen.add(key)
        for (const locale of LOCALES) {
          expect(getCatalog(locale, namespace)![key], `${file} ${locale}:${namespace}:${key}`).toBeDefined()
          expect(t(key, paramsFor(key, namespace), { locale, namespace }).length, `${locale}:${key}`).toBeGreaterThan(0)
        }
      }
    }
    for (const k of ['language.entry', 'language.title', 'language.intro', 'language.option_hi', 'language.option_en', 'language.error_not_recorded', 'language.switch_hint']) {
      expect(seen, k).toContain(k)
    }
    expect(seen).toContain('contact.agreement')
    expect(total).toBeGreaterThanOrEqual(30)
  })

  it('the approved words, verbatim (LS13; the Hindi approved by BigDev — LS14 (b))', () => {
    const en = getCatalog('en', 'common')!
    const hi = getCatalog('hi', 'common')!
    expect(en['language.entry']).toBe('भाषा / Language')
    expect(hi['language.entry']).toBe('भाषा / Language')
    expect(en['language.title']).toBe('Language')
    expect(hi['language.title']).toBe('भाषा')
    expect(en['language.intro']).toBe('Choose the language for this app. Some messages from the Trust (SMS and WhatsApp) will also come in this language.')
    expect(hi['language.intro']).toBe('इस ऐप की भाषा चुनें। ट्रस्ट के कुछ संदेश (SMS और WhatsApp) भी इसी भाषा में आएँगे।')
    for (const c of [en, hi]) {
      expect(c['language.option_hi']).toBe('हिन्दी')
      expect(c['language.option_en']).toBe('English')
    }
    expect(en['language.error_not_recorded']).toBe('Your choice is saved on this phone, but we could not record it on your account yet. We will try again.')
    expect(hi['language.error_not_recorded']).toBe('आपकी पसंद इस फ़ोन पर सहेज ली गई है, पर अभी आपके खाते में दर्ज नहीं हो सकी। हम फिर कोशिश करेंगे।')
    expect(en['language.switch_hint']).toBe('Change the app language')
    expect(hi['language.switch_hint']).toBe('ऐप की भाषा बदलें')
    expect(en['$comment.language']).toBeDefined()
    expect(hi['$comment.language']).toMatch(/BigDev/)
    expect(hi['$comment.language']).toMatch(/2026-10-23-387 LS14 \(b\)/)
  })

  it('⛔ `language.entry_hint` — the entry carries ⛔ accessibilityHint, by choice (AC10)', () => {
    for (const locale of LOCALES) expect(getCatalog(locale, 'common')!['language.entry_hint']).toBeUndefined()
    expect(readFileSync(join(MOBILE, 'components/settings/LanguageSettingsEntry.tsx'), 'utf8')).not.toContain('accessibilityHint=')
  })
})
