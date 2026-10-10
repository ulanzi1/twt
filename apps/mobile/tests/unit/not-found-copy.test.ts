// Story 6.30 AC7 — the dignified "not found" and the route-shell placeholder (`2026-10-10-312` AL14 /
// AL16). Every new `common.json` key resolves through the REAL `t()` in en AND hi (⛔ never a stub — the
// `catalog.ts` ask); the screen uses those keys and the shared `CallHelplineCTA`, and the template's
// English "Oops!" is gone.

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { t } from '@twt/i18n'
import { describe, expect, it } from 'vitest'

const NEW_KEYS = ['not_found.title', 'not_found.body', 'not_found.go_home', 'peer_request.placeholder'] as const

describe('the new common keys resolve through the real t()', () => {
  for (const locale of ['en', 'hi'] as const) {
    it.each(NEW_KEYS)(`[${locale}] %s`, (key) => {
      const value = t(key, undefined, { locale, namespace: 'common' })
      expect(value.trim().length).toBeGreaterThan(0)
      expect(value).not.toBe(key)
    })
  }

  it('the Hindi is Hindi (Devanagari), not a copy of the English', () => {
    for (const key of NEW_KEYS) {
      const hi = t(key, undefined, { locale: 'hi', namespace: 'common' })
      expect(hi).toMatch(/[ऀ-ॿ]/)
      expect(hi).not.toBe(t(key, undefined, { locale: 'en', namespace: 'common' }))
    }
  })
})

describe('+not-found.tsx', () => {
  const src = readFileSync(
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../app/+not-found.tsx'),
    'utf8',
  ).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

  it('renders the three keys and the shared CallHelplineCTA', () => {
    for (const key of ['not_found.title', 'not_found.body', 'not_found.go_home']) {
      expect(src).toContain(`t('${key}')`)
    }
    expect(src).toContain('<CallHelplineCTA />')
    expect(src).toContain("from '../components/common/CallHelplineCTA'")
  })

  it('"Go to home" replaces to /(tabs)', () => {
    expect(src).toContain("router.replace('/(tabs)')")
  })

  it('carries no hard-coded English copy (the template is gone)', () => {
    expect(src).not.toMatch(/Oops|doesn't exist|Go to home screen/)
  })
})
