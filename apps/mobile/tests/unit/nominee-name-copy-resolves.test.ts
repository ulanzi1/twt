// ⭐⭐ STORY 6.18's MEMBER COPY **RESOLVES** — the real-`t()` leg, in both locales.
//
// ⚠⚠ WHY THIS FILE EXISTS (code review 2026-09-22). The review's finding was precise: *"chunk 3's
// real-`t()` leg for `nominee.bank.holder_english`, `.note`, `.note_help`, `.correction_needed` and
// `nominees.name_english` does not exist — the stub rule is MET for admin and UNMET for mobile"*
// ([[feedback_stub_must_call_not_transcribe]]).
//
// ⭐ THE RULE, AND WHY A TRANSCRIPTION WOULD ⛔ NOT SATISFY IT: a test that hard-codes the expected
// STRING is a SECOND COPY of the copy. It passes when the key is deleted, renamed, or never
// registered — because the assertion never asks the resolver anything. ⇒ the leg has to CALL the
// real `t()`, which THROWS on a missing key, so an unregistered namespace or a typo fails HERE
// rather than on a bereaved family's phone.
//
// ⚠ `i18n-parity` (the CI script) checks only that each `hi` key is NON-EMPTY. It ⛔ cannot tell
// whether a key is ever USED, and it ⛔ cannot tell whether the key a COMPONENT asks for exists at
// all — which is the failure this file covers and that one does not.

import { t } from '@twt/i18n'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..')
const read = (rel: string): string => readFileSync(path.join(repoRoot, rel), 'utf8')
const stripComments = (src: string): string =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

const LOCALES = ['en', 'hi'] as const

/** The `claim`-namespace keys Story 6.18 mints on the member claim screen. */
const CLAIM_KEYS = [
  'nominee.bank.holder_english', // AC12 — the English-script message, shown as the family types
  'nominee.bank.note', // AC7 — the optional note's placeholder
  'nominee.bank.note_help', // AC7 — what the note is for
  'nominee.bank.correction_needed', // AC5 — the filer-facing "these need correcting"
  'nominee.bank.correction_needed_staff', // AC5 — the same, when the member may ⛔ not edit
  'nominee.bank.status_unavailable', // 2026-09-23b — the status read failed; ⛔ never silently "nothing to correct"
  'nominee.bank.locked', // 2026-09-23c — the form is locked and nothing needs correcting: say WHY
] as const

/** The `common`-namespace key the life-events nominee form mints. */
const COMMON_KEYS = ['nominees.name_english'] as const

describe('Story 6.18 member copy resolves through the REAL t() — both locales', () => {
  for (const locale of LOCALES) {
    it(`[${locale}] every claim-namespace key resolves — ⛔ no throw, ⛔ no empty string`, () => {
      for (const key of CLAIM_KEYS) {
        // ⚠ `t()` THROWS on a missing key. That is the whole mechanism: this is a QUESTION put to
        // the resolver, ⛔ not a restatement of the answer.
        const value = t(key, undefined, { locale, namespace: 'claim' })
        expect(value.trim().length, `${locale}/claim :: ${key}`).toBeGreaterThan(0)
      }
    })

    it(`[${locale}] the life-events nominee key resolves in \`common\``, () => {
      for (const key of COMMON_KEYS) {
        const value = t(key, undefined, { locale })
        expect(value.trim().length, `${locale}/common :: ${key}`).toBeGreaterThan(0)
      }
    })
  }

  it('⭐⭐ the two locales are genuinely DIFFERENT copy — ⛔ not `hi` left as the English string', () => {
    // ⚠ `i18n-parity` accepts any non-empty `hi` value, so an untranslated key that was copy-pasted
    // from `en` passes it. ⭐ These are member-facing sentences a grieving family reads; an English
    // string sitting under `hi` is a silent failure of the bilingual promise, ⛔ not a typo.
    for (const key of CLAIM_KEYS) {
      const en = t(key, undefined, { locale: 'en', namespace: 'claim' })
      const hi = t(key, undefined, { locale: 'hi', namespace: 'claim' })
      expect(hi, `${key} is identical in both locales — \`hi\` was never translated`).not.toBe(en)
    }
  })

  it('⭐⭐ the SCREEN asks for exactly these keys — the test and the component ⛔ cannot drift apart', () => {
    // ⚠⚠ THE HALF THAT MAKES THE REST WORTH ANYTHING. Proving a key RESOLVES says ⛔ nothing about
    // whether the screen still asks for it: delete the `t()` call and every assertion above still
    // passes, because the catalogue entry is untouched. ⇒ this reads the component and requires
    // each key to be live at a call site.
    const src = stripComments(read('apps/mobile/app/(claim)/nominee-review.tsx'))
    for (const key of CLAIM_KEYS) {
      expect(src, `${key} resolves but the screen no longer asks for it`).toContain(`t('${key}')`)
    }
    const form = stripComments(read('apps/mobile/components/life-events/NomineeForm.tsx'))
    for (const key of COMMON_KEYS) {
      // ⚠ TIGHTENED 2026-09-22 (code review) — this used to check only that the BARE key string
      // `key` appeared anywhere in the file, weaker than the `CLAIM_KEYS` loop above (which requires
      // the exact call-site syntax `t('key')`) despite this file's whole stated purpose being to
      // prevent exactly this kind of drift. A bare-string match could pass on an incidental
      // occurrence — a comment, an unrelated identifier — rather than a live `t()` call.
      expect(form, `${key} resolves but NomineeForm no longer asks for it`).toContain(`t('${key}')`)
    }
  })

  it('⭐⭐ the mechanism actually WORKS — `t()` really does throw on a missing key', () => {
    // ⚠⚠ ADDED 2026-09-22 (code review). The file's header claims this is "the whole mechanism"
    // that makes every check above non-vacuous, but nothing here had ever actually demonstrated it.
    // If `t()` silently returned a fallback instead of throwing, every `expect(value.trim().length)
    // .toBeGreaterThan(0)` above could be passing against a placeholder string for a key that does
    // not exist, and a missing/renamed key would go undetected by this entire file.
    // ⚠ ANCHORED to the missing-KEY message (code review 2026-09-23) — a bare `.toThrow()` also passed
    // on a throw for any other reason (a wrong argument shape, an unknown namespace), which would
    // leave the premise above undemonstrated.
    expect(() => t('nominee.bank.__does_not_exist__', undefined, { locale: 'en', namespace: 'claim' })).toThrow(
      "[i18n] missing key 'nominee.bank.__does_not_exist__' in 'en/claim'",
    )
    expect(() => t('__does_not_exist__', undefined, { locale: 'en' })).toThrow("[i18n] missing key '__does_not_exist__'")
  })
})
