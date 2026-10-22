// ⭐ STORY 3.3c — THE MANUAL KYC NAME's MESSAGE KEYS, and their copy through the REAL `t()`.
//
// `-227` cl.1 / `-378` decision 6 (`-382`): the member's own name typed in the manual KYC fallback is
// English-only at input. The screen picks its message with two PURE functions
// (`lib/kyc-manual-name.ts`), so this file pins the EXACT key per input FIRST — a test that only
// resolved whatever keys came back would pass vacuously when a mutant returned `null` — and THEN puts
// every non-null key to the real resolver in both locales ([[feedback_stub_must_call_not_transcribe]];
// the `nominee-name-copy-resolves.test.ts` pattern).

import { ApiError } from '@twt/api-client'
import { t } from '@twt/i18n'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { manualNameMessageKey, manualSubmitErrorKey } from '../../lib/kyc-manual-name'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..')
const read = (rel: string): string => readFileSync(path.join(repoRoot, rel), 'utf8')
const stripComments = (src: string): string =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

const LOCALES = ['en', 'hi'] as const

/** A `request.validation` 400 as the api-client raises it — `details.issues` from the error mapper. */
const validation400 = (instancePath: string, keyword: string): ApiError =>
  new ApiError(400, 'request.validation', 'Request failed schema validation', {
    issues: [{ keyword, instancePath, schemaPath: `#${instancePath}/${keyword}`, params: {}, message: 'x' }],
  })

describe('Story 3.3c — manualNameMessageKey: the EXACT key per typed name', () => {
  it.each([
    ['', 'kyc.manual_name_required'],
    ['   ', 'kyc.manual_name_required'],
    ['आशा देवी', 'kyc.manual_name_english'],
    ['Asha देवी', 'kyc.manual_name_english'],
    ['Asha Devi', null],
    ['D’Souza', null],
  ] as const)('%j → %s', (name, key) => {
    expect(manualNameMessageKey(name)).toBe(key)
  })
})

describe('Story 3.3c — manualSubmitErrorKey: ONLY a script refusal on /name is the English-name message', () => {
  it.each([
    ['400 /name invalid_string', validation400('/name', 'invalid_string'), 'kyc.manual_name_english'],
    // ⚠ An English name over 200 is ⛔ a script problem — today's mapping, ⛔ "write it in English".
    ['400 /name too_big', validation400('/name', 'too_big'), null],
    ['400 /dob too_big', validation400('/dob', 'too_big'), null],
    ['409 kyc.not_pending', new ApiError(409, 'kyc.not_pending', 'not pending'), null],
    ['400 with malformed details', new ApiError(400, 'request.validation', 'bad', { issues: 'nope' }), null],
    ['a non-ApiError', new Error('network down'), null],
  ] as const)('%s → %s', (_label, err, key) => {
    expect(manualSubmitErrorKey(err)).toBe(key)
  })
})

describe('Story 3.3c — every selected key resolves through the REAL t(), both locales', () => {
  const KEYS = ['kyc.manual_name', 'kyc.manual_name_required', 'kyc.manual_name_english'] as const

  for (const locale of LOCALES) {
    it(`[${locale}] each key resolves — ⛔ no throw, ⛔ no empty string`, () => {
      for (const key of KEYS) {
        expect(t(key, undefined, { locale }).trim().length, `${locale} :: ${key}`).toBeGreaterThan(0)
      }
    })
  }

  it('the two locales are genuinely different copy', () => {
    for (const key of KEYS) {
      expect(t(key, undefined, { locale: 'hi' }), key).not.toBe(t(key, undefined, { locale: 'en' }))
    }
  })

  it('the keys the functions return are the keys resolved here', () => {
    const returned = new Set([
      manualNameMessageKey(''),
      manualNameMessageKey('आशा देवी'),
      manualSubmitErrorKey(validation400('/name', 'invalid_string')),
    ])
    for (const key of returned) expect(KEYS as readonly unknown[]).toContain(key)
  })

  it('the screen and the module still ask for them — ⛔ drift', () => {
    // A key returned by a function never appears as a literal `t('<key>')` at the call site, so the
    // screen is checked for its label call and its use of BOTH functions, and the module for its literals.
    const screen = stripComments(read('apps/mobile/app/(signup)/kyc.tsx'))
    expect(screen).toContain(`t('kyc.manual_name')`)
    expect(screen).toMatch(/import \{[^}]*manualNameMessageKey[^}]*\} from '\.\.\/\.\.\/lib\/kyc-manual-name'/)
    expect(screen).toMatch(/import \{[^}]*manualSubmitErrorKey[^}]*\} from '\.\.\/\.\.\/lib\/kyc-manual-name'/)
    const lib = stripComments(read('apps/mobile/lib/kyc-manual-name.ts'))
    expect(lib).toContain(`'kyc.manual_name_required'`)
    expect(lib).toContain(`'kyc.manual_name_english'`)
  })
})
