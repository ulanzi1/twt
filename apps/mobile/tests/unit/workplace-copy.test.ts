// Story 6.36a (Task 6; AC10) — EVERY `workplace` key the picker, the signup step and the Workplace screen use resolves
// through the REAL `t()`, in BOTH locales, with its parameters substituted (⛔ a stray brace) — the fixture blind spot
// that shipped `members.json` unregistered (`packages/i18n/tests/catalog-registration.test.ts`) and `₹₹`
// ([[feedback_stub_must_call_not_transcribe]]).
// ⭐ The keys are READ FROM THE SOURCE (every literal `t('…')` in the workplace files), plus the keys the pure helpers
// produce (`refusalCopyKey`, `historyRowView`) — so a key added to a screen without its copy fails HERE.

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { WORKPLACE_REFUSAL_CODES } from '@twt/contracts'
import { t } from '@twt/i18n'
import { describe, expect, it } from 'vitest'

import { historyRowView, refusalCopyKey } from '../../lib/workplace'

const here = path.dirname(fileURLToPath(import.meta.url))
const APP = path.resolve(here, '../..')
const SOURCES = ['components/workplace/WorkplacePicker.tsx', 'app/(life-events)/posting.tsx', 'app/(signup)/workplace.tsx']

/** Every literal key passed to the workplace `t` in the source (`t('key'` / `t("key"`). */
function literalKeys(): string[] {
  const keys = new Set<string>()
  for (const f of SOURCES) {
    const src = readFileSync(path.join(APP, f), 'utf8')
    for (const m of src.matchAll(/\bt\(\s*'([a-z_.]+)'/g)) keys.add(m[1]!)
    // The option table names keys as string literals in objects.
    for (const m of src.matchAll(/key: '([a-z_.]+)'/g)) keys.add(m[1]!)
  }
  return [...keys].sort()
}

/** Keys chosen by a TERNARY (`t(retired ? 'retired_label' : 'started_label')`) or by the phase-title switch — a literal
 *  scan cannot tell them from the phase / kind names beside them, so they are listed. */
const COMPUTED_KEYS = ['search_label_office', 'search_label_school', 'retired_label', 'started_label', 'step_title', 'kind_prompt', 'not_listed']

/** The keys the PURE helpers produce. */
function producedKeys(): string[] {
  const keys = new Set<string>(['error_generic', 'kind_school_short', 'kind_office_short', 'row_not_listed', 'row_retired', 'row_district_only', 'row_since', 'row_on', 'request_pending', 'request_suggested'])
  for (const code of WORKPLACE_REFUSAL_CODES) keys.add(refusalCopyKey({ status: 422, code }))
  const v = historyRowView({
    postingId: '9b2e7c1a-1111-4111-8111-111111111111',
    recordedAt: '2026-01-01T00:00:00.000000Z',
    district: 'Patna',
    startedOn: '2019-06-01',
    isRetirement: true,
    workplace: null,
    request: null,
  })
  if (v.titleKey) keys.add(v.titleKey)
  if (v.dateKey) keys.add(v.dateKey)
  return [...keys].sort()
}

const PARAMS = { district: 'Patna', date: '01-06-2019', name: 'GMS RAMPUR' }

describe('AC10 — the workplace copy resolves through the REAL t()', () => {
  it('the source scan is NON-VACUOUS (it finds the screens\' keys)', () => {
    const keys = literalKeys()
    expect(keys.length).toBeGreaterThan(25)
    expect(keys).toEqual(expect.arrayContaining(['step_title', 'not_listed', 'transferred', 'kind_prompt', 'typed_name_label', 'date_hint']))
    // Every computed key is really in a source file (⛔ a stale list).
    const src = SOURCES.map((f) => readFileSync(path.join(APP, f), 'utf8')).join('\n')
    for (const k of COMPUTED_KEYS) expect(src, k).toContain(`'${k}'`)
  })

  for (const locale of ['en', 'hi'] as const) {
    it(`[${locale}] every key used resolves to real copy, its parameters substituted (⛔ throw, ⛔ empty, ⛔ stray brace)`, () => {
      for (const key of [...new Set([...literalKeys(), ...COMPUTED_KEYS, ...producedKeys()])]) {
        const value = t(key, PARAMS, { locale, namespace: 'workplace' })
        expect(value.trim().length, `${locale}/workplace :: ${key}`).toBeGreaterThan(0)
        expect(value, `${locale}/workplace :: ${key}`).not.toMatch(/[{}]/)
      }
    })

    it(`[${locale}] the interpolated lines carry their data`, () => {
      expect(t('kind_prompt', PARAMS, { locale, namespace: 'workplace' })).toContain('Patna')
      expect(t('row_since', PARAMS, { locale, namespace: 'workplace' })).toContain('01-06-2019')
      expect(t('row_on', PARAMS, { locale, namespace: 'workplace' })).toContain('01-06-2019')
      expect(t('request_suggested', PARAMS, { locale, namespace: 'workplace' })).toContain('GMS RAMPUR')
    })

    it(`[${locale}] the Life Events hub card reads "Workplace" (the old posting keys are gone from common)`, () => {
      expect(t('hub_label', undefined, { locale, namespace: 'workplace' }).trim()).not.toBe('')
      expect(() => t('lifeEvents.posting_label', undefined, { locale })).toThrow(/missing key/)
    })
  }

  it('the Hindi differs from the English for every key (⛔ an English string shipped as Hindi)', () => {
    for (const key of [...literalKeys(), ...COMPUTED_KEYS].filter((k) => k !== 'date_hint')) {
      expect(t(key, PARAMS, { locale: 'hi', namespace: 'workplace' }), key).not.toBe(t(key, PARAMS, { locale: 'en', namespace: 'workplace' }))
    }
  })
})
