// Renewal-status widget — a home-screen strip for members at/past their renewal-due date (Story 3.8;
// AC2/AC4). A read surface showing the renewal state + a "Renew membership" CTA that opens the UPI Intent.
//
// ── Self-suppression ────────────────────────────────────────────────────────────────────────────────
// Renders ONLY for a PAID member whose renewal is due — `paid_through` present AND `days_until_lapse ≤ 91`
// (⇔ now ≥ valid_through, i.e. the renewal-due Day 0 has been reached; a far-from-renewal member has
// days_until_lapse > 91 and is suppressed). Never-paid / pre-lock-in members (paid_through null) and
// freshly-renewed members (valid_through ~ +365d) render nothing. Fail-soft: a loading/error/absent
// status renders nothing — the home content below stays untouched (mirrors the 3.7 widget).
//
// ── Tone (UX spec lines 973/977-979) ────────────────────────────────────────────────────────────────
// Calm passbook strip, same register as the 3.7 lock-in widget: hairline rules, no red, NO urgency
// theater. FR-1A's 3-month grace exists PRECISELY so a brief lapse doesn't penalize a long-tenure member
// (PRD line 256) — the copy reads "renew when ready" / "N days of grace", never "act now or lose cover".
//
// ── Numeral discipline (amendment-A2) ───────────────────────────────────────────────────────────────
// `grace_remaining_days` is an OPERATIONAL figure → LATIN numerals even in Hindi (i18n/number.ts:3-15).
// `t()` interpolates the count already-Latin; NEVER toHindiNumeral here. The paid-through date is
// formatted with an explicit `-u-nu-latn` numbering override (same as the 3.7 unlock date).

import { useLocale, useT } from '@twt/i18n/react'
import { useRouter } from 'expo-router'
import { Button, Paragraph, Text, YStack } from 'tamagui'

import { useRenewalStatusQuery } from './useRenewalStatusQuery'

/** The renewal-due window: once now ≥ valid_through, days_until_lapse ≤ 91 (the grace span). */
const RENEWAL_DUE_THRESHOLD_DAYS = 91

/** Format a date per locale, ALWAYS in Latin numerals (operational figure; amendment-A2). */
function formatDate(iso: string, locale: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso.slice(0, 10)
  try {
    return d.toLocaleDateString(locale === 'hi' ? 'hi-IN-u-nu-latn' : 'en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return iso.slice(0, 10)
  }
}

export function RenewalStatusWidget() {
  const t = useT()
  const { locale } = useLocale()
  const { data } = useRenewalStatusQuery()
  const router = useRouter()

  // Self-suppress unless the member has paid AND renewal is due (AC2/AC4). Fail-soft on
  // loading/error/absent — render nothing, leave the home content untouched.
  if (
    !data ||
    data.paid_through === null ||
    data.days_until_lapse === null ||
    data.days_until_lapse > RENEWAL_DUE_THRESHOLD_DAYS
  ) {
    return null
  }

  const lapsed = !data.in_renewal_grace && data.days_until_lapse === 0
  // Primary status line: lapsed → restore copy; in grace → grace-days copy; due (Day 0, pre-grace) → due.
  const statusLine = lapsed
    ? t('renewal.lapsed')
    : data.in_renewal_grace && data.grace_remaining_days !== null
      ? t('renewal.grace_remaining', { count: data.grace_remaining_days })
      : t('renewal.due_soon')

  function onRenew(): void {
    router.push('/(renewal)/payment')
  }

  return (
    <YStack
      bg="$background"
      px="$5"
      py="$4"
      gap="$2"
      borderTopWidth={1}
      borderBottomWidth={1}
      borderColor="$borderColor"
    >
      <Text fontFamily="$body" fontSize="$2" color="$colorPress" accessibilityRole="text">
        {t('renewal.title')}
      </Text>

      {/* Status line — calm, announced politely (ambient status, never assertive). */}
      <Paragraph
        fontFamily="$body"
        fontSize="$4"
        color="$color"
        accessibilityRole="text"
        accessibilityLiveRegion="polite"
        accessibilityLabel={
          data.in_renewal_grace && data.grace_remaining_days !== null
            ? t('renewal.grace_remaining_a11y', { count: data.grace_remaining_days })
            : statusLine
        }
      >
        {statusLine}
      </Paragraph>

      {/* Covered-through date — operational figure, Latin numerals. */}
      <Text fontFamily="$body" fontSize="$2" color="$colorPress" accessibilityRole="text">
        {`${t('renewal.paid_through_label')} ${formatDate(data.paid_through, locale)}`}
      </Text>

      {/* Renew CTA — navigates to the renewal payment screen. ≥44pt, role=button (WCAG 2.5.3). */}
      <Button
        height={44}
        justify="flex-start"
        accessibilityRole="button"
        accessibilityLabel={t('renewal.renew_cta_a11y')}
        accessibilityHint={t('renewal.renew_cta_hint')}
        onPress={onRenew}
      >
        {t('renewal.renew_cta')}
      </Button>
    </YStack>
  )
}
