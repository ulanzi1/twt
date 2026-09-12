// The mobile pay-screen UPI-ID row — Story 8.17 (Task 3/Task 7; AC1/AC2/AC6). DB-free, RN-render-free.
//
// ── What is being fenced, and why the properties below are the ones that matter ──────────────────────
// `#decision-2026-09-10-212` cl.2 (Trustee-ratified, DR + KB), applying `2026-09-04-191` cl.1, puts the
// nominee's UPI ID on THE PAYMENT SCREEN — so a member can pay from whichever app or device they actually
// use, rather than being locked to one screen at one moment. Three properties carry that ruling, and each
// one is a way the row could ship LOOKING right while being wrong:
//   1. the row is INSIDE the coordinates block (the `:447` ternary's ELSE-branch) — placing it in the
//      decrypt-failure branch would show a UPI ID exactly where the screen is saying it has nothing
//      trustworthy to show;
//   2. absence renders NOTHING — no placeholder, no error, no "not collected" copy. For most nominees
//      there IS no UPI ID (it is optional at claim-time intake), so this is the ORDINARY path;
//   3. `selectedAccountAllFieldsUnavailable` stays a THREE-field test — adding `vpa` to that conjunction
//      would let a missing UPI ID blank the entire coordinates block.
// And the label is resolved through `t(` from a minted key, never inlined.
//
// `apps/mobile` has no component-mount capability (`vitest.config.ts` is `environment: 'node'` with
// `include: ['tests/unit/**/*.test.ts']` — `.ts` only, so a `.tsx` mount test is not even collected). The
// comment-stripped SOURCE scan is the shipped idiom; this file follows its direct siblings
// `pay-screen-disclosure-render.test.ts` and `pay-screen-choice-render.test.ts`.
// ⚠ A source scan cannot prove visual placement or runtime reachability — so it scans for the ANATOMY
// that encodes those properties, not for the mere presence of a key.

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

// apps/mobile/tests/unit → repo root is four levels up.
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..')
const read = (rel: string): string => readFileSync(path.join(repoRoot, rel), 'utf8')
const stripComments = (src: string): string =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

const PAY = 'apps/mobile/app/(contribution)/pay.tsx'
const EN = 'packages/i18n/locales/en/contribution.json'
const HI = 'packages/i18n/locales/hi/contribution.json'

describe('pay screen — the nominee UPI-ID row (`-212` cl.2)', () => {
  const src = stripComments(read(PAY))

  it('renders the UPI ID through a minted i18n key — ⛔ never an inlined literal', () => {
    expect(src).toContain("t('upi_intent.vpa_label', undefined, NS)")
    // ⛔ No hand-written English label anywhere in the component — any quoting style (single/double/
    // backtick-template, or bare inside a JSX text node) is checked, not just a quote-adjacent literal
    // (code review, Story 8.17: the original regex missed a template literal or JSX-text form).
    expect(src).not.toMatch(/["'`>]\s*UPI ID\s*["'`<]/)
  })

  it('reads the VPA from the SELECTED account — the one the member chose to pay', () => {
    expect(src).toContain('selectedAccount.vpa')
  })

  it('⭐ sits INSIDE the coordinates block, beside IFSC — ⛔ not in the decrypt-failure branch', () => {
    // The coordinates block is the ternary's else-branch, anchored by `paying_to_label` and closed before
    // the intent section. The VPA row must fall between the IFSC row and the end of that block.
    const ifscAt = src.indexOf("t('upi_intent.ifsc_label'")
    const vpaAt = src.indexOf("t('upi_intent.vpa_label'")
    const payingToAt = src.indexOf("t('upi_intent.paying_to_label'")
    const warningAt = src.indexOf("t('upi_intent.account_details_unavailable_warning'")
    expect(ifscAt).toBeGreaterThan(-1)
    expect(vpaAt).toBeGreaterThan(-1)
    expect(payingToAt).toBeGreaterThan(-1)
    expect(warningAt).toBeGreaterThan(-1)
    // Beside IFSC, inside the block that opens at `paying_to_label`.
    expect(vpaAt).toBeGreaterThan(ifscAt)
    expect(vpaAt).toBeGreaterThan(payingToAt)
    // ⛔ And AFTER the decrypt-failure warning branch — i.e. not inside it. The warning branch is the
    // FIRST arm of the ternary and closes before `paying_to_label` opens the else-branch.
    expect(payingToAt).toBeGreaterThan(warningAt)
  })

  it('⛔ ABSENT ⇒ NO ROW — a guarded render, ⛔ no placeholder and ⛔ no fallback string', () => {
    // The row must be conditional on the VPA's presence. A `?? '—'`-style fallback, or an unguarded
    // FieldRow, would put a placeholder where the ruling says nothing belongs.
    expect(src).toMatch(/selectedAccount\.vpa === undefined \? null :/)
    // ⛔ No `??` / `||` fallback feeding the VPA row.
    expect(src).not.toMatch(/selectedAccount\.vpa\s*(\?\?|\|\|)/)
  })

  it('⛔⛔ `selectedAccountAllFieldsUnavailable` stays a THREE-field test (Trap 7)', () => {
    const start = src.indexOf('const selectedAccountAllFieldsUnavailable')
    expect(start).toBeGreaterThan(-1)
    // The declaration runs to the next blank-line-separated statement.
    const decl = src.slice(start, start + 600)
    const body = decl.slice(0, decl.indexOf('\n\n') === -1 ? decl.length : decl.indexOf('\n\n'))
    const sentinelComparisons = body.match(/NOMINEE_BANK_DECRYPT_FAILED_SENTINEL/g) ?? []
    expect(sentinelComparisons).toHaveLength(3)
    // ⛔ Specifically: the VPA is NOT one of them. A missing UPI ID must never be able to blank the
    // coordinates block — and the server never puts the sentinel in the VPA's place to begin with.
    expect(body).not.toContain('vpa')
  })
})

describe('pay screen — the minted UPI-ID label (AC6)', () => {
  const en = JSON.parse(read(EN)) as Record<string, string>
  const hi = JSON.parse(read(HI)) as Record<string, string>

  it('is minted FLAT and in BOTH locales, beside its four siblings', () => {
    expect(en['upi_intent.vpa_label']).toBeDefined()
    expect(hi['upi_intent.vpa_label']).toBeDefined()
    // The siblings it joins — proving it landed in the right family of keys.
    for (const k of [
      'upi_intent.account_holder_label',
      'upi_intent.account_number_label',
      'upi_intent.ifsc_label',
      'upi_intent.bank_label',
    ]) {
      expect(en[k]).toBeDefined()
      expect(hi[k]).toBeDefined()
    }
  })

  it('⭐ keeps "UPI ID" in LATIN script in Hindi — exactly as `IFSC` is kept', () => {
    // `-212` Consequence 5 orders a label minted; the WORDING is not a free choice. `claim.json` already
    // ships "UPI ID" / "UPI ID (ज़रूरी नहीं)" in both locales — match that treatment. The "(optional)"
    // qualifier is dropped: this is a DISPLAY label, not a form field.
    expect(en['upi_intent.vpa_label']).toBe('UPI ID')
    expect(hi['upi_intent.vpa_label']).toBe('UPI ID')
    // The IFSC precedent this follows.
    expect(hi['upi_intent.ifsc_label']).toBe('IFSC')
    // ⛔ Not a form-field label — the "(optional)" of the intake screen must not travel here.
    expect(en['upi_intent.vpa_label']).not.toContain('optional')
    expect(hi['upi_intent.vpa_label']).not.toContain('ज़रूरी')
  })
})
