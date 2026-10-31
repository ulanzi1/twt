// Story 6.38 (AC14, AC15; DL18, DL19; `2026-10-31-424` Q2 (a) / (b)) — once a claim is filed for the member's death the
// account can ⛔ withdraw and can ⛔ change the record directly; each refusal has ONE calm line. The keys resolve through the
// REAL `t()` in BOTH locales ([[feedback_stub_must_call_not_transcribe]]); the screens are source-fenced (⛔ a mounted
// screen — the `refile-copy-resolves.test.ts` pattern).

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { t } from '@twt/i18n'
import { describe, expect, it } from 'vitest'

import {
  DEATH_REPORTED_COPY,
  LIFE_EVENTS_DEATH_REPORTED_CODE,
  MEDICAL_DEATH_REPORTED_CODE,
  WITHDRAWAL_DEATH_REPORTED_CODE,
  lifeEventsDeathReportedKey,
  withdrawalErrorKey,
} from '../../lib/death-report-copy'

const LOCALES = ['en', 'hi'] as const
const mobileRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const read = (rel: string): string => readFileSync(path.join(mobileRoot, rel), 'utf8')
const stripComments = (src: string): string => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

describe('Story 6.38 — the after-death refusals on the member\'s own account', () => {
  for (const locale of LOCALES) {
    it(`[${locale}] both lines resolve to non-empty copy in the common namespace`, () => {
      for (const key of Object.values(DEATH_REPORTED_COPY)) {
        expect(t(key, undefined, { locale }).trim().length, `${locale}/common :: ${key}`).toBeGreaterThan(0)
      }
    })
  }

  it('the en lines say a claim was filed and send the family to the helpline', () => {
    expect(t(DEATH_REPORTED_COPY.withdrawal, undefined, { locale: 'en' })).toMatch(/claim has been filed.*cannot be withdrawn.*helpline/i)
    expect(t(DEATH_REPORTED_COPY.lifeEvents, undefined, { locale: 'en' })).toMatch(/claim has been filed.*can no longer be changed.*correction.*helpline/i)
  })

  it('the codes map to their keys; anything else keeps the screen\'s own words', () => {
    expect(withdrawalErrorKey({ code: WITHDRAWAL_DEATH_REPORTED_CODE })).toBe(DEATH_REPORTED_COPY.withdrawal)
    expect(withdrawalErrorKey({ code: 'withdrawal.invalid_state' })).toBe('withdrawal.error_generic')
    expect(withdrawalErrorKey(new Error('network'))).toBe('withdrawal.error_generic')
    expect(lifeEventsDeathReportedKey({ code: LIFE_EVENTS_DEATH_REPORTED_CODE })).toBe(DEATH_REPORTED_COPY.lifeEvents)
    expect(lifeEventsDeathReportedKey({ code: MEDICAL_DEATH_REPORTED_CODE })).toBe(DEATH_REPORTED_COPY.lifeEvents)
    expect(lifeEventsDeathReportedKey({ code: 'workplace.not_found' })).toBeNull()
    expect(lifeEventsDeathReportedKey(null)).toBeNull()
  })

  it('the codes are the API\'s own', () => {
    const api = (rel: string) => readFileSync(path.join(mobileRoot, '../api/src/modules', rel), 'utf8')
    expect(api('withdrawal/handlers.ts')).toContain(`'${WITHDRAWAL_DEATH_REPORTED_CODE}'`)
    expect(api('life-events/handlers.ts')).toContain(`'${LIFE_EVENTS_DEATH_REPORTED_CODE}'`)
    expect(api('medical/medical.handlers.ts')).toContain(`'${MEDICAL_DEATH_REPORTED_CODE}'`)
  })

  it('every screen that writes routes its failure through the map', () => {
    expect(stripComments(read('app/(withdrawal)/index.tsx')).match(/t\(withdrawalErrorKey\(e\)\)/g)).toHaveLength(2)
    expect(stripComments(read('app/(life-events)/address.tsx'))).toContain('lifeEventsDeathReportedKey(e)')
    expect(stripComments(read('app/(life-events)/medical.tsx')).match(/lifeEventsDeathReportedKey\(e\)/g)).toHaveLength(2)
    expect(stripComments(read('components/workplace/WorkplacePicker.tsx'))).toContain('lifeEventsDeathReportedKey(e)')
    const question = stripComments(read('components/workplace/WorkplaceSuggestionQuestion.tsx'))
    expect(question).toContain('lifeEventsDeathReportedKey(err)')
    expect(question).not.toContain('t(refusalCopyKey(e))')
  })
})
