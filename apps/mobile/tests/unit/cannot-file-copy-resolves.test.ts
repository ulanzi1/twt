// Story 6.38 (AC7, DL10; `2026-10-30-423` Q3 B, `2026-10-31-424` Q3 B) — the "a claim cannot be filed" state's copy resolves
// through the REAL `t()`, in BOTH locales ([[feedback_stub_must_call_not_transcribe]]; the `refile-copy-resolves.test.ts`
// pattern — ⛔ a mounted screen). The screen is source-fenced; the body gives ONE general reason and ⛔ the specific one.

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { CLAIM_INTAKE_REFUSED_CODE as CANONICAL_CLAIM_INTAKE_REFUSED_CODE } from '@twt/contracts'
import { t } from '@twt/i18n'
import { describe, expect, it } from 'vitest'

import { CANNOT_FILE_COPY, CLAIM_INTAKE_REFUSED_CODE } from '../../lib/cannot-file-copy'

const LOCALES = ['en', 'hi'] as const
const mobileRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const read = (rel: string): string => readFileSync(path.join(mobileRoot, rel), 'utf8')
const stripComments = (src: string): string => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

describe('Story 6.38 — the "a claim cannot be filed" state', () => {
  for (const locale of LOCALES) {
    it(`[${locale}] every cannot_file.* key resolves to non-empty copy`, () => {
      for (const key of Object.values(CANNOT_FILE_COPY)) {
        const value = t(key, undefined, { locale, namespace: 'claim' })
        expect(value.trim().length, `${locale}/claim :: ${key}`).toBeGreaterThan(0)
      }
    })
  }

  it('the body carries the ONE general reason (`-424` Q3 B) and ⛔ a specific one', () => {
    const body = t(CANNOT_FILE_COPY.body, undefined, { locale: 'en', namespace: 'claim' })
    expect(body).toContain('the person was not a member of the Trust when they died')
    expect(body).not.toMatch(/left|removed|erased|identity|KYC|fee|member (id|number)/i)
    const all = Object.values(CANNOT_FILE_COPY).map((k) => t(k, undefined, { locale: 'en', namespace: 'claim' })).join(' ')
    expect(all).not.toMatch(/appeal/i)
  })

  it('the code literal is the contracts package\'s canonical one', () => {
    expect(CLAIM_INTAKE_REFUSED_CODE).toBe(CANONICAL_CLAIM_INTAKE_REFUSED_CODE)
  })

  it('the screen renders <CallHelplineCTA>, an accessible labelled container, an announcement and a real back handler', () => {
    const src = stripComments(read('app/(claim)/cannot-file.tsx'))
    expect(src).toContain('<CallHelplineCTA')
    expect(src).toContain('accessible={true}')
    expect(src).toContain('announceForAccessibility')
    expect(src).toContain('[title, body]')
    expect(src).toMatch(/onPress=\{\(\) => router\.replace\('\/\(tabs\)'\)\}/)
  })

  it('the wizard submit routes the 409 here — ⛔ a draft saved, ⛔ the generic error', () => {
    const wizard = stripComments(read('app/(claim)/relationship.tsx'))
    expect(wizard).toContain('e.code === CLAIM_INTAKE_REFUSED_CODE')
    expect(wizard).toContain("router.replace('/(claim)/cannot-file')")
    const branch = wizard.slice(wizard.indexOf('e.code === CLAIM_INTAKE_REFUSED_CODE'))
    expect(branch.slice(0, branch.indexOf('return'))).not.toContain('saveClaimDraft')
    expect(wizard.indexOf('e.code === CLAIM_INTAKE_REFUSED_CODE')).toBeLessThan(wizard.indexOf("setError(t('relationship.error'))"))
  })
})
