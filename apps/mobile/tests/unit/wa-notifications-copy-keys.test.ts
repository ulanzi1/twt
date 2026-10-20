// Story 5.12 (AC6; `-364` condition 1; LY10) — the WhatsApp notification screen's words. Every literal `waNotifications.*` key the
// screen and the settings entry call EXISTS in `common` and resolves through the REAL `t()` in BOTH locales (⛔ a hand-built
// fixture — [[feedback_stub_must_call_not_transcribe]]), and ⛔ `waNotifications.*` value in EITHER locale says the yes
// "expired" (the parity gate walks en keys only, so the hi absence of `expired_*` is asserted here EXPLICITLY — F14).
// The known-people-copy-keys.test.ts shape, with a camelCase-capable regex: its `[a-z_]+` matches ZERO of these keys (F14).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { getCatalog, t } from '@twt/i18n'
import { describe, expect, it } from 'vitest'

const MOBILE = join(__dirname, '..', '..')
const FILES = ['app/(settings)/notifications.tsx', 'components/notifications/NotificationSettingsEntry.tsx']
const LOCALES = ['en', 'hi'] as const

/** The literal keys passed to `t('…')` in a source file (camelCase segments allowed). */
function literalKeys(src: string): string[] {
  return [...src.matchAll(/\bt\(\s*'([A-Za-z_]+(?:\.[A-Za-z_]+)*)'/g)].map((m) => m[1]!)
}

describe('the waNotifications keys the app uses (Story 5.12, AC6)', () => {
  const keys = new Set(FILES.flatMap((f) => literalKeys(readFileSync(join(MOBILE, f), 'utf8'))))
  const waKeys = [...keys].filter((k) => k.startsWith('waNotifications.'))

  it('the scan finds the screen\'s keys (a positive control) and every key resolves in en AND hi through the real t()', () => {
    expect(literalKeys("t('waNotifications.unconfirmed_title')")).toEqual(['waNotifications.unconfirmed_title'])
    expect(waKeys.length).toBeGreaterThanOrEqual(18)
    expect(waKeys).toContain('waNotifications.unconfirmed_title')
    expect(waKeys).toContain('waNotifications.unconfirmed_desc')
    expect(waKeys).toContain('waNotifications.revoke_cta')
    for (const key of keys) {
      for (const locale of LOCALES) {
        expect(getCatalog(locale, 'common')![key], `${locale}:${key}`).toBeDefined()
        expect(t(key, undefined, { locale, namespace: 'common' }).length, `${locale}:${key}`).toBeGreaterThan(0)
      }
    }
  })

  it('⛔ waNotifications value in EITHER locale says "expired" / समाप्त, and expired_title / expired_desc are ABSENT in en AND hi', () => {
    for (const locale of LOCALES) {
      const catalog = getCatalog(locale, 'common')!
      const wa = Object.entries(catalog).filter(([k]) => k.startsWith('waNotifications.'))
      expect(wa.length, locale).toBeGreaterThanOrEqual(18)
      for (const [key, value] of wa) {
        expect(value, `${locale}:${key}`).not.toMatch(/expir/i)
        expect(value, `${locale}:${key}`).not.toContain('समाप्त')
      }
      expect(catalog['waNotifications.expired_title'], locale).toBeUndefined()
      expect(catalog['waNotifications.expired_desc'], locale).toBeUndefined()
    }
  })

  it('the LY10 words: unconfirmed_*, the new active_desc (how long it lasts, how to stop) and the reworded blocked_*', () => {
    const en = getCatalog('en', 'common')!
    const hi = getCatalog('hi', 'common')!
    expect(en['waNotifications.unconfirmed_title']).toBe('WhatsApp notifications are not on')
    expect(en['waNotifications.active_desc']).toContain('until you turn them off here or reply STOP on WhatsApp')
    expect(hi['waNotifications.active_desc']).toContain('STOP')
    expect(en['waNotifications.blocked_desc']).not.toMatch(/you blocked/i)
    expect(en['waNotifications.blocked_title']).toBe('WhatsApp notifications were turned off')
  })
})
