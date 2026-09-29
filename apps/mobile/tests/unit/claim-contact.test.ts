// Story 6.19a (AC1, AC8a) — the member's contact step: the pure body builder (the member's FULL record, by rank)
// and the screen's PII-free / announcement / direction discipline, pinned on its source.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { t } from '@twt/i18n'
import { describe, expect, it } from 'vitest'

import { buildMemberContactBody } from '../../lib/claim-contact'

const base = {
  nominees: [{ rank: 1 as const }, { rank: 2 as const }],
  addresses: { 1: ' 12 Station Road ', 2: '4 Mall Road' },
  claimant: { kind: 'rank' as const, rank: 1 as const },
  block: { name: '', mobile: '', address: '' },
  relationships: {},
  agreed: true,
  locale: 'hi' as const,
}

describe('buildMemberContactBody', () => {
  it('the claimant IS a nominee — every rank’s address (trimmed), the rank, the agreement', () => {
    expect(buildMemberContactBody(base)).toEqual({
      ok: true,
      body: {
        locale: 'hi',
        nominees: [
          { rank: 1, address: '12 Station Road' },
          { rank: 2, address: '4 Mall Road' },
        ],
        claimantNomineeRank: 1,
        agreed: true,
      },
    })
  })

  it('someone else — the block AND a relationship per nominee', () => {
    const out = buildMemberContactBody({
      ...base,
      claimant: { kind: 'someone_else' },
      block: { name: 'सुनीता देवी', mobile: '9876543210', address: 'Kanpur' },
      relationships: { 1: 'son', 2: 'brother_in_law' },
    })
    expect(out).toMatchObject({ ok: true, body: { claimant: { name: 'सुनीता देवी' }, nominees: [{ relationship: 'son' }, { relationship: 'brother_in_law' }] } })
  })

  it('⭐ no declared nominee — zero ranks, the claimant block required, and it can finish', () => {
    const out = buildMemberContactBody({
      ...base,
      nominees: [],
      addresses: {},
      claimant: null,
      block: { name: 'Ravi', mobile: '9876543210', address: 'Kanpur' },
    })
    expect(out).toEqual({
      ok: true,
      body: { locale: 'hi', nominees: [], claimant: { name: 'Ravi', mobile: '9876543210', address: 'Kanpur' }, agreed: true },
    })
  })

  it('names what is missing — an address, the claimant, a relationship; and the agreement separately', () => {
    expect(buildMemberContactBody({ ...base, addresses: { 1: 'x' } })).toEqual({ ok: false, reason: 'incomplete' })
    expect(buildMemberContactBody({ ...base, claimant: null })).toEqual({ ok: false, reason: 'incomplete' })
    expect(
      buildMemberContactBody({ ...base, claimant: { kind: 'someone_else' }, block: { name: 'a', mobile: '9876543210', address: 'b' }, relationships: { 1: 'son' } }),
    ).toEqual({ ok: false, reason: 'incomplete' })
    expect(buildMemberContactBody({ ...base, agreed: false })).toEqual({ ok: false, reason: 'agreement_required' })
  })
})

describe('the contact screen (source pins)', () => {
  const src = readFileSync(join(__dirname, '../../app/(claim)/contact.tsx'), 'utf8')

  it('⛔ PII-free draft — only the step marker is saved on the device', () => {
    expect(src).toContain("saveClaimDraft(memberId, { lastStep: 'contact' })")
    expect(src).not.toMatch(/saveClaimDraft\([^)]*(address|mobile|name)/)
    expect(src).not.toMatch(/mmkv/i)
  })

  it('advances to the acknowledgement after a save, behind the unmount guard', () => {
    const tail = src.slice(src.indexOf('SAVED_ANNOUNCEMENT_DELAY_MS))'))
    expect(tail.indexOf('if (!mountedRef.current) return')).toBeLessThan(tail.indexOf("router.push('/(claim)/acknowledgement')"))
  })

  it('⭐ every reachable state is announced (a live region + the iOS call)', () => {
    for (const phase of ['saved', 'incomplete', 'agreement_required', 'not_writable', 'error']) expect(src).toContain(`${phase}:`)
    expect(src).toContain('accessibilityLiveRegion="polite"')
    expect(src).toContain('AccessibilityInfo.announceForAccessibility')
  })

  it('⭐ the choices are explicit accessibility elements with a role and a state (family 13(a))', () => {
    expect(src).toContain('accessible={true}')
    expect(src).toContain('accessibilityState={{ checked: props.checked, disabled: !!props.disabled }}')
  })

  it('the relationships offered are the DERIVED nineteen (⛔ never a local list)', () => {
    expect(src).toContain('CLAIMANT_NOMINEE_RELATIONSHIP_CODES.map')
  })
})

describe('the relationship question fixes its DIRECTION in both locales', () => {
  for (const locale of ['en', 'hi'] as const) {
    it(`[${locale}] names the claimant as the subject, with an example`, () => {
      const q = t('contact.relationship_question', { rank: 1 }, { locale, namespace: 'claim' })
      expect(q).toMatch(locale === 'en' ? /^The claimant is nominee 1's/ : /^दावेदार, नॉमिनी 1 के\/की/)
      expect(q).toMatch(locale === 'en' ? /the claimant is their son/ : /दावेदार उनका बेटा है/)
    })
  }

  it('every contact key resolves through the REAL t() in both locales', () => {
    for (const locale of ['en', 'hi'] as const) {
      for (const key of ['contact.title', 'contact.agreement', 'contact.no_nominees', 'contact.not_writable', 'contact.saved']) {
        expect(t(key, undefined, { locale, namespace: 'claim' }).trim().length, `${locale} :: ${key}`).toBeGreaterThan(0)
      }
    }
  })
})
