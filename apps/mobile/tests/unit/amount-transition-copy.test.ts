// Story 8.15 (AC4/AC5/AC7) — the My Pool card's staged fixed-amount transition line resolves through the
// REAL `t()`, in BOTH locales ([[feedback_stub_must_call_not_transcribe]]). Nothing mounts the card (no RN
// render harness — Trap 7), so the pure stage → copy module stands in for the line, and the card itself is
// source-fenced at the bottom (the `self-verify-surface-render.test.ts` comment-stripped scan).

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { AmountTransition } from '@twt/contracts'
import { t } from '@twt/i18n'
import { describe, expect, it } from 'vitest'

import { amountTransitionCopy, formatEffectiveOn } from '../../components/active-contribution/amountTransitionCopy'

const LOCALES = ['en', 'hi'] as const
const NS = { namespace: 'contribution' } as const

const STAGES: ReadonlyArray<{
  readonly transition: AmountTransition
  readonly rupees: number
  readonly amount: boolean
  readonly date: boolean
}> = [
  { transition: { stage: 'scheduled', effectiveOn: '2027-04-14', newAmount: 1200 }, rupees: 1, amount: true, date: true },
  { transition: { stage: 'next_month', effectiveOn: '2027-04-14', newAmount: 1200 }, rupees: 1, amount: true, date: false },
  { transition: { stage: 'next_cycle', newAmount: 1200 }, rupees: 1, amount: true, date: false },
  { transition: { stage: 'first_cycle' }, rupees: 0, amount: false, date: false },
]

function resolve(transition: AmountTransition, locale: 'en' | 'hi'): { line: string; a11y: string } {
  const copy = amountTransitionCopy(transition, locale)
  return {
    line: t(copy.key, copy.params, { locale, ...NS }),
    a11y: t(copy.a11yKey, copy.params, { locale, ...NS }),
  }
}

const count = (s: string, ch: string): number => s.split(ch).length - 1

describe('Story 8.15 — the transition line resolves through the real t()', () => {
  for (const locale of LOCALES) {
    for (const { transition, rupees, amount, date } of STAGES) {
      it(`[${locale}] ${transition.stage}: non-empty, no braces left, ₹×${String(rupees)}, amount ${amount ? 'present' : 'absent'}, date ${date ? 'present' : 'absent'}`, () => {
        const { line, a11y } = resolve(transition, locale)
        for (const out of [line, a11y]) {
          expect(out.trim().length).toBeGreaterThan(0)
          // A planted `{{amount}}` renders `₹{1,200}` WITHOUT throwing — only this assertion catches it.
          expect(out).not.toMatch(/[{}]/)
          expect(count(out, '₹')).toBe(rupees)
          expect(out.includes('1,200')).toBe(amount)
          // en-IN "14 April 2027"; hi-IN with Latin digits → "14 अप्रैल 2027".
          expect(out.includes('2027')).toBe(date)
          // ⛔ Never Devanagari digits on an operational figure (amendment-A2).
          expect(out).not.toMatch(/[०-९]/)
        }
      })
    }
  }

  it('the four stages map to four distinct keys, each with its own _a11y variant', () => {
    const keys = STAGES.map((s) => amountTransitionCopy(s.transition, 'en'))
    expect(new Set(keys.map((k) => k.key)).size).toBe(4)
    for (const k of keys) {
      expect(k.key).toMatch(/^active_contribution\.transition\./)
      expect(k.a11yKey).toBe(`${k.key}_a11y`)
    }
  })

  it('next_month never names a date; next_cycle never names a date; first_cycle carries no params', () => {
    expect(amountTransitionCopy(STAGES[1]!.transition, 'en').params).not.toHaveProperty('date')
    expect(amountTransitionCopy(STAGES[2]!.transition, 'en').params).not.toHaveProperty('date')
    expect(amountTransitionCopy(STAGES[3]!.transition, 'en').params).toBeUndefined()
  })

  it('⛔ Decision -383: the stages an EMERGENCY can reach never say "from next month" — en or hi, line or a11y', () => {
    // An emergency is dated (`scheduled`), "from the next cycle", or the first-pool note — never `next_month`
    // (the step that implies notice). The selector pins the STAGE; this pins the WORDS, so a copy edit that
    // slips "next month" into a stage an emergency reaches cannot pass every gate with AC6 as its only catch.
    const NEXT_MONTH = /next month|अगले महीने/i
    // Control: the regex bites on the one stage that legitimately says it (a vacuous pattern proves nothing).
    for (const locale of LOCALES) {
      const { line, a11y } = resolve(STAGES[1]!.transition, locale)
      expect(line).toMatch(NEXT_MONTH)
      expect(a11y).toMatch(NEXT_MONTH)
    }
    for (const locale of LOCALES) {
      for (const { transition } of STAGES.filter((s) => s.transition.stage !== 'next_month')) {
        const { line, a11y } = resolve(transition, locale)
        expect(line, `${locale} ${transition.stage} line`).not.toMatch(NEXT_MONTH)
        expect(a11y, `${locale} ${transition.stage} a11y`).not.toMatch(NEXT_MONTH)
      }
    }
  })

  it('{amount} is the bare en-IN figure — the ₹ lives in the copy (a pre-formatted ₹ would ship ₹₹)', () => {
    expect(amountTransitionCopy({ stage: 'next_cycle', newAmount: 125000 }, 'hi').params).toEqual({ amount: '1,25,000' })
  })
})

describe('Story 8.15 — formatEffectiveOn prints the IST calendar day, whatever the device time zone (Trap 6)', () => {
  it.each([
    ['en', '2027-04-14', '14 April 2027'],
    ['hi', '2027-04-14', '14 अप्रैल 2027'],
    ['en', '2027-01-01', '1 January 2027'],
  ] as const)('[%s] %s → %s', (locale, iso, expected) => {
    expect(formatEffectiveOn(iso, locale)).toBe(expected)
  })

  it('a device far WEST of IST still prints the same calendar day (no instant is parsed)', () => {
    const before = process.env.TZ
    try {
      process.env.TZ = 'America/Los_Angeles'
      expect(formatEffectiveOn('2027-03-01', 'en')).toBe('1 March 2027')
      process.env.TZ = 'Pacific/Kiritimati'
      expect(formatEffectiveOn('2027-03-01', 'en')).toBe('1 March 2027')
    } finally {
      if (before === undefined) delete process.env.TZ
      else process.env.TZ = before
    }
  })

  it('an unparseable value falls back to itself rather than throwing in render', () => {
    expect(formatEffectiveOn('not-a-date', 'en')).toBe('not-a-date')
  })
})

// ── The card, source-fenced (comment-stripped) ─────────────────────────────────────────────────────────
const mobileRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const stripComments = (src: string): string => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
const CARD = stripComments(readFileSync(path.join(mobileRoot, 'components/active-contribution/ActiveContributionCard.tsx'), 'utf8'))

describe('Story 8.15 — the card renders the resolved stage and nothing of the retired line', () => {
  it('no longer references the retired field, key or local date formatter', () => {
    expect(CARD).not.toMatch(/upcomingAmountChange/)
    expect(CARD).not.toMatch(/upcoming_amount/)
    expect(CARD).not.toMatch(/\bformatDate\b/)
  })

  it('renders through amountTransitionCopy and t(…, NS)', () => {
    expect(CARD).toMatch(/amountTransitionCopy\(data\.amountTransition, locale\)/)
    expect(CARD).toMatch(/t\(transitionCopy\.key, transitionCopy\.params, NS\)/)
    expect(CARD).toMatch(/accessibilityLabel=\{t\(transitionCopy\.a11yKey, transitionCopy\.params, NS\)\}/)
  })

  it('the transition line is ⛔ NOT a live region (Trap 8 — scoped to its own element)', () => {
    const at = CARD.indexOf('t(transitionCopy.key')
    expect(at).toBeGreaterThan(-1)
    const open = CARD.lastIndexOf('<Text', at)
    const close = CARD.indexOf('</Text>', at)
    const element = CARD.slice(open, close)
    expect(element).toMatch(/accessibilityRole="text"/)
    expect(element).not.toMatch(/accessibilityLiveRegion/)
  })
})
