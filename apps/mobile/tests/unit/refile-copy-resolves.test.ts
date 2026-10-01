// Story 6.19c (AC15, AC8c, `-273` §9) — the re-file "please call the helpline" state's copy resolves through the REAL
// `t()`, in BOTH locales. ⛔ `t()` throws on a missing key — a question put to the resolver, ⛔ a restatement of the answer
// ([[feedback_stub_must_call_not_transcribe]]; the `certificate-copy-resolves.test.ts` pattern — no render harness exists,
// so the pure key table stands in for the screen). The screen itself is source-fenced: it renders <CallHelplineCTA>, ONE
// labelled `accessible={true}` container that is announced, and both routes into it map the SAME code.

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { t } from '@twt/i18n'
import { describe, expect, it } from 'vitest'

import { REFILE_HELPLINE_COPY, REFILE_REQUIRES_CONFIRMATION_CODE } from '../../lib/refile-helpline-copy'

const LOCALES = ['en', 'hi'] as const
const mobileRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const read = (rel: string): string => readFileSync(path.join(mobileRoot, rel), 'utf8')
const stripComments = (src: string): string => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

describe('Story 6.19c — the re-file state', () => {
  for (const locale of LOCALES) {
    it(`[${locale}] every refile.* key resolves to non-empty copy`, () => {
      for (const key of Object.values(REFILE_HELPLINE_COPY)) {
        const value = t(key, undefined, { locale, namespace: 'claim' })
        expect(value.trim().length, `${locale}/claim :: ${key}`).toBeGreaterThan(0)
      }
    })
  }

  it('the copy names ⛔ no reason code, date or appeal — and says a NEW claim goes through the helpline', () => {
    const en = Object.values(REFILE_HELPLINE_COPY).map((k) => t(k, undefined, { locale: 'en', namespace: 'claim' })).join(' ')
    expect(en).toMatch(/helpline/i)
    expect(en).not.toMatch(/appeal/i)
    expect(en).not.toMatch(/\d{4}-\d{2}-\d{2}/)
  })

  it('the screen renders <CallHelplineCTA>, an accessible labelled container, an announcement and a real back handler', () => {
    const src = stripComments(read('app/(claim)/refile-helpline.tsx'))
    expect(src).toContain('<CallHelplineCTA')
    expect(src).toContain('accessible={true}')
    expect(src).toContain('announceForAccessibility')
    expect(src).toMatch(/onPress=\{\(\) => router\.replace\('\/\(tabs\)'\)\}/)
  })

  it('BOTH routes into it are wired: the entry gate decision and the wizard submit\'s 409 code', () => {
    expect(REFILE_REQUIRES_CONFIRMATION_CODE).toBe('claim.refile_requires_confirmation')
    const entry = stripComments(read('app/(claim)/index.tsx'))
    expect(entry).toContain("decision.kind === 'refile_helpline'")
    expect(entry).toContain("router.replace('/(claim)/refile-helpline')")
    const wizard = stripComments(read('app/(claim)/relationship.tsx'))
    expect(wizard).toContain('e.code === REFILE_REQUIRES_CONFIRMATION_CODE')
    expect(wizard).toContain("router.replace('/(claim)/refile-helpline')")
    const fetcher = stripComments(read('lib/fetch-claim-entry-outcome.ts'))
    expect(fetcher).toContain('data.refile_requires_confirmation')
  })
})
