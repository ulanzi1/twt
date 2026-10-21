// Story 5.10 (AC7; SB5; Decision 2026-10-21-375 decision 5) — the signup WhatsApp step's words. Every literal key the step and
// the "WhatsApp on another phone?" hint call EXISTS in `common` and resolves through the REAL `t()` in BOTH locales (⛔ a
// hand-built fixture — [[feedback_stub_must_call_not_transcribe]]), with `{number}` substituted (the resolver throws on a
// token with no param). The scanned key set must EQUAL the expected list, so a key the regex cannot see (a template literal)
// fails it. The words never threaten (R10(B): the app is the channel of record), never say "Settings" (the app has none —
// F14), and never call WhatsApp something a member "also" gets (it is a fallback rung, ⛔ a mirror — T12).
// The wa-notifications-copy-keys.test.ts shape (camelCase-capable regex) + the workplace-copy.test.ts `PARAMS` precedent.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { getCatalog, t } from '@twt/i18n'
import { describe, expect, it } from 'vitest'

const MOBILE = join(__dirname, '..', '..')
const FILES = ['app/(signup)/whatsapp.tsx', 'components/notifications/OtherPhoneHint.tsx']
const LOCALES = ['en', 'hi'] as const
const PARAMS = { number: '+91 98765 43210' }

const EXPECTED = [
  'loading',
  'waNotifications.pending_resend',
  'waOtherPhone.desc',
  'waOtherPhone.link',
  'waOtherPhone.note',
  'waSignup.box_hint',
  'waSignup.box_label',
  'waSignup.continue',
  'waSignup.intro',
  'waSignup.link_failed',
  'waSignup.popup_a11y',
  'waSignup.popup_back',
  'waSignup.popup_body',
  'waSignup.popup_proceed',
  'waSignup.popup_title',
  'waSignup.request_failed',
  'waSignup.sent_desc',
  'waSignup.sent_title',
  'waSignup.title',
]

/**
 * The literal keys passed to `t('…')` in a source file (camelCase segments AND digits allowed — the 5.12 precedent's
 * `[A-Za-z_]` cannot see `waSignup.popup_a11y`; the set-equality below caught it).
 */
function literalKeys(src: string): string[] {
  return [...src.matchAll(/\bt\(\s*'([A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)*)'/g)].map((m) => m[1]!)
}

const sources = FILES.map((f) => readFileSync(join(MOBILE, f), 'utf8'))
const keys = [...new Set(sources.flatMap(literalKeys))].sort()

describe('the signup WhatsApp step\'s words (Story 5.10, AC7)', () => {
  it('the scan finds the keys (a positive control), every key is LITERAL, and the set EQUALS the expected list', () => {
    expect(literalKeys("t('waSignup.box_label')")).toEqual(['waSignup.box_label'])
    expect(literalKeys("t('waSignup.popup_a11y')")).toEqual(['waSignup.popup_a11y'])
    expect(literalKeys("t('waOtherPhone.desc', { number })")).toEqual(['waOtherPhone.desc'])
    for (const src of sources) expect(src).not.toMatch(/\bt\(\s*`/)
    expect(keys).toEqual(EXPECTED)
  })

  for (const locale of LOCALES) {
    it(`[${locale}] every key resolves to real copy through the real t(), its {number} substituted (⛔ throw, ⛔ empty, ⛔ stray brace)`, () => {
      const catalog = getCatalog(locale, 'common')!
      for (const key of keys) {
        expect(catalog[key], `${locale}:${key}`).toBeDefined()
        const value = t(key, PARAMS, { locale, namespace: 'common' })
        expect(value.trim().length, `${locale}:${key}`).toBeGreaterThan(0)
        expect(value, `${locale}:${key}`).not.toMatch(/[{}]/)
      }
      expect(t('waOtherPhone.desc', PARAMS, { locale, namespace: 'common' })).toContain('+91 98765 43210')
    })
  }

  it('all 17 waSignup.* / waOtherPhone.* keys exist in en AND hi (the parity gate walks en keys only)', () => {
    const fam = (locale: 'en' | 'hi') =>
      Object.keys(getCatalog(locale, 'common')!).filter((k) => k.startsWith('waSignup.') || k.startsWith('waOtherPhone.')).sort()
    expect(fam('en')).toHaveLength(17)
    expect(fam('hi')).toEqual(fam('en'))
  })

  it('⛔ a threat, ⛔ "Settings", ⛔ "also gets WhatsApp" — in either locale; the sender is TWT', () => {
    for (const locale of LOCALES) {
      const catalog = getCatalog(locale, 'common')!
      for (const [key, value] of Object.entries(catalog)) {
        if (!key.startsWith('waSignup.') && !key.startsWith('waOtherPhone.')) continue
        expect(value, `${locale}:${key}`).not.toMatch(/\bmiss|settings|सेटिंग/i)
        expect(value, `${locale}:${key}`).not.toMatch(/also (get|receive|send)/i)
      }
    }
    expect(getCatalog('en', 'common')!['waSignup.box_label']).toBe('Send me WhatsApp messages from TWT')
    expect(getCatalog('hi', 'common')!['waSignup.box_label']).toContain('TWT')
  })
})
