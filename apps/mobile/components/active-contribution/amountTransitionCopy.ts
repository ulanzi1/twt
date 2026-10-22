// The My Pool card's staged fixed-amount transition line — stage → copy. Story 8.15 (AC4; UX-DR25).
//
// A PLAIN `.ts` module (⛔ no `react`/`react-native`/`tamagui`/`@twt/i18n/react` import) so the mapping can
// be proven through the REAL `t()` in both locales — nothing in this repo's node-only Vitest harness can
// mount the card (Trap 7; the `drive-list/format.ts` precedent).
//
// The SERVER resolves the stage (8.2 D2 — the client resolves nothing); this only picks the words:
//   · `{amount}` is the bare `en-IN` figure — the ₹ sits inside the copy, so a pre-formatted `₹` would ship
//     `₹₹`. Latin numerals (amendment-A2). ⛔ Never `toHindiNumeral`.
//   · `{date}` is built from the wire's IST CALENDAR DATE parts (`new Date(y, m − 1, d)`, a LOCAL date) and
//     printed in the device's zone — so the printed day is always the IST calendar day, wherever the
//     device is (Trap 6). ⛔ No instant is parsed.

import type { AmountTransition } from '@twt/contracts'

/** The keys + params for one transition line. `params` is absent when the copy interpolates nothing. */
export interface AmountTransitionCopy {
  readonly key: string
  readonly a11yKey: string
  readonly params?: Readonly<Record<string, string>>
}

/** Print an IST `YYYY-MM-DD` as day + long month + year, ALWAYS in Latin numerals. */
export function formatEffectiveOn(effectiveOn: string, locale: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(effectiveOn)
  if (!m) return effectiveOn
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  if (Number.isNaN(d.getTime())) return effectiveOn
  try {
    return d.toLocaleDateString(locale === 'hi' ? 'hi-IN-u-nu-latn' : 'en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return effectiveOn
  }
}

/** The copy for a resolved stage. Exhaustive: a widened stage union fails at BUILD time here. */
export function amountTransitionCopy(transition: AmountTransition, locale: string): AmountTransitionCopy {
  switch (transition.stage) {
    case 'scheduled':
      return {
        key: 'active_contribution.transition.scheduled',
        a11yKey: 'active_contribution.transition.scheduled_a11y',
        params: {
          date: formatEffectiveOn(transition.effectiveOn, locale),
          amount: transition.newAmount.toLocaleString('en-IN'),
        },
      }
    case 'next_month':
      return {
        key: 'active_contribution.transition.next_month',
        a11yKey: 'active_contribution.transition.next_month_a11y',
        params: { amount: transition.newAmount.toLocaleString('en-IN') },
      }
    case 'next_cycle':
      return {
        key: 'active_contribution.transition.next_cycle',
        a11yKey: 'active_contribution.transition.next_cycle_a11y',
        params: { amount: transition.newAmount.toLocaleString('en-IN') },
      }
    case 'first_cycle':
      return {
        key: 'active_contribution.transition.first_cycle',
        a11yKey: 'active_contribution.transition.first_cycle_a11y',
      }
    default: {
      const _never: never = transition
      throw new Error(`[ActiveContributionCard] unhandled amount-transition stage: ${String(_never)}`)
    }
  }
}
