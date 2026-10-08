// Story 6.24a (`2026-10-07-292` RF12 v1.3) — the CLOSED claim's "please call the helpline" screen: its copy resolves
// through the REAL `t()`, in BOTH locales ([[feedback_stub_must_call_not_transcribe]] — no render harness exists, so the
// pure key table stands in for the screen), it says ⛔ nothing about suspicion, a changed nominee, fraud or anyone, and
// the screen and its one route in are source-fenced (the `refile-copy-resolves.test.ts` pattern).

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { t } from '@twt/i18n'
import { describe, expect, it } from 'vitest'

import { CLOSED_HELPLINE_COPY } from '../../lib/closed-helpline-copy'
import { certificateNoticeCopy } from '../../lib/death-certificate-view'

const LOCALES = ['en', 'hi'] as const
const mobileRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const read = (rel: string): string => readFileSync(path.join(mobileRoot, rel), 'utf8')
const stripComments = (src: string): string => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

describe('Story 6.24a — the closed claim', () => {
  for (const locale of LOCALES) {
    it(`[${locale}] every closed.* key resolves to non-empty copy`, () => {
      for (const key of Object.values(CLOSED_HELPLINE_COPY)) {
        const value = t(key, undefined, { locale, namespace: 'claim' })
        expect(value.trim().length, `${locale}/claim :: ${key}`).toBeGreaterThan(0)
      }
    })
  }

  it('the English is RF12\'s words exactly — and ⛔ no member-facing word mentions suspicion, fraud, a changed nominee or a reason', () => {
    expect(t('closed.body', undefined, { locale: 'en', namespace: 'claim' })).toBe('This claim has been closed. Please call the helpline.')
    const en = Object.values(CLOSED_HELPLINE_COPY).map((k) => t(k, undefined, { locale: 'en', namespace: 'claim' })).join(' ')
    expect(en).not.toMatch(/suspicio|fraud|chang|nominee|appeal|refus|after the death/i)
    const hi = Object.values(CLOSED_HELPLINE_COPY).map((k) => t(k, undefined, { locale: 'hi', namespace: 'claim' })).join(' ')
    // Symmetric with the English check above: suspicion, fraud, nominee, appeal, changed, refused/refusal, after-the-death.
    // अस्वीक — the stem shared by both this app's OWN inflections for "refused" (अस्वीकार — see `claim.json`'s
    // `certificate.not_refused` / `nominee.bank.correction_needed_staff`, the actual in-namespace usage — and
    // अस्वीकृत), so either leaking in is caught.
    expect(hi).not.toMatch(/संदेह|धोखा|नामांकित|अपील|बदल|अस्वीक|इनकार|मृत्यु के बाद/)
  })

  it('the family-status view renders a `closed` claim with the SAME words and the helpline (⛔ no upload)', () => {
    const copy = certificateNoticeCopy({ status: 'closed', replacementReason: null, uploadAllowed: false, reassurance: null } as never)
    expect(copy).toMatchObject({ titleKey: 'closed.title', bodyKey: 'closed.body', showUpload: false, showHelpline: true })
  })

  it('the screen renders <CallHelplineCTA>, an accessible labelled container, an announcement and a real back handler', () => {
    const src = stripComments(read('app/(claim)/closed-helpline.tsx'))
    expect(src).toContain('<CallHelplineCTA')
    expect(src).toContain('accessible={true}')
    expect(src).toContain('announceForAccessibility')
    expect(src).toMatch(/onPress=\{\(\) => router\.replace\('\/\(tabs\)'\)\}/)
  })

  it('its route in is wired: the server\'s `claim_closed` bit → the `closed` outcome → the entry gate\'s screen (⛔ not the wizard)', () => {
    const fetcher = stripComments(read('lib/fetch-claim-entry-outcome.ts'))
    expect(fetcher).toContain("if (data.claim_closed) return { kind: 'closed' }")
    // The closed bit is read BEFORE the death's re-file bit (it is a fact of THIS claim).
    expect(fetcher.indexOf('data.claim_closed')).toBeLessThan(fetcher.indexOf('data.refile_requires_confirmation'))
    const entry = stripComments(read('app/(claim)/index.tsx'))
    expect(entry).toContain("decision.kind === 'closed_helpline'")
    expect(entry).toContain("router.replace('/(claim)/closed-helpline')")
  })
})
