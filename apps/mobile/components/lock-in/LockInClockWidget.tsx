// Lock-in clock widget — the topmost home-screen element for members in `lock-in` (Story 3.7;
// AC1/AC2/AC4). A read-only, conditionally-rendered strip showing the day-granular countdown, the
// unlock date, the policy clause reference, the rationale, and a deep-link tap-target into the public
// Niyamavali clause that explains lock-in.
//
// ── Self-suppression (AC1 "ONLY for members in lock-in" + AC3 expiry) ───────────────────────────────
// Renders ONLY when the server reports state === 'lock-in' with a present `lockIn` block; otherwise
// returns null. Fail-soft: a loading/error/absent status renders nothing (never error-walls the home —
// the existing home content stays). Once the member leaves lock-in the widget stops rendering (the
// implementable half of AC3; the Epic-8 "My Pool" hand-off is forward-compat, not built yet).
//
// ── Numeral discipline (AC4; amendment-A2) ──────────────────────────────────────────────────────────
// The days-remaining counter + the unlock date are OPERATIONAL figures → LATIN numerals even in Hindi
// (i18n/number.ts:3-15). The number is interpolated by `t()` (already Latin); the date is formatted with
// an explicit `-u-nu-latn` numbering override. NEVER toHindiNumeral here. The Hindi WORDS around the
// number are Devanagari; the number itself is Latin (never two numeral systems at one hierarchy level).
//
// ── Tone (UX spec lines 299/313/973/977-979) ────────────────────────────────────────────────────────
// Calm passbook strip: full-width, hairline rules, no shadow, no rounded card, NO red, NO per-second
// tick, NO urgency theater. "Here is why you wait and when you're covered," not "act now."
//
// ── Accessibility (AC4 / P0-2c) ─────────────────────────────────────────────────────────────────────
// The countdown is announced via accessibilityLiveRegion="polite" (calm ambient status — never
// "assertive", which is for errors). The deep-link tap-target is ≥44pt with accessibilityRole="link",
// an action-NAMING accessibilityLabel (WCAG 2.5.3 Label-in-Name), and a hint. Text carries role="text".

import { Linking } from 'react-native'

import { useLocale, useT } from '@twt/i18n/react'
import { Button, Paragraph, Text, YStack } from 'tamagui'

import { niyamavaliClauseUrl } from '../../lib/niyamavali-link'
import { useLockInClockQuery } from './useLockInClockQuery'

/** Format the unlock date per locale, ALWAYS in Latin numerals (operational figure; amendment-A2). */
function formatUnlockDate(iso: string, locale: string): string {
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

export function LockInClockWidget() {
  const t = useT()
  const { locale } = useLocale()
  const { data } = useLockInClockQuery()

  // Self-suppress unless the member is in lock-in with clock figures (AC1/AC3). Fail-soft on
  // loading/error/absent — render nothing, leave the home content untouched.
  if (!data || data.state !== 'lock-in' || !data.lockIn) {
    return null
  }
  const { daysRemaining, unlockDate, clauseId } = data.lockIn

  async function onOpenClause(): Promise<void> {
    try {
      await Linking.openURL(niyamavaliClauseUrl(clauseId, locale))
    } catch {
      // No browser / the OS rejected the link — fail quietly; the rationale copy still stands.
    }
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
        {t('lock_in.title')}
      </Text>

      {/* Countdown — calm, day-granular, Latin numerals. Announced politely (ambient status). */}
      <Text
        fontFamily="$tabular"
        fontSize="$8"
        fontWeight="600"
        color="$color"
        accessibilityRole="text"
        accessibilityLiveRegion="polite"
        accessibilityLabel={t('lock_in.days_remaining_a11y', { count: daysRemaining })}
      >
        {t('lock_in.days_remaining', { count: daysRemaining })}
      </Text>

      {/* Unlock date — operational figure, Latin numerals. */}
      <Text
        fontFamily="$body"
        fontSize="$3"
        color="$color"
        accessibilityRole="text"
        accessibilityLabel={t('lock_in.unlock_date_a11y', { date: formatUnlockDate(unlockDate, locale) })}
      >
        {`${t('lock_in.unlock_date_label')} ${formatUnlockDate(unlockDate, locale)}`}
      </Text>

      <Paragraph fontFamily="$body" fontSize="$2" color="$colorPress" accessibilityRole="text">
        {t('lock_in.rationale')}
      </Paragraph>

      {/* Policy clause reference (server-authoritative clauseId). */}
      <Text fontFamily="$body" fontSize="$1" color="$colorPress" accessibilityRole="text">
        {`${t('lock_in.clause_ref_label')}: ${clauseId}`}
      </Text>

      {/* Deep-link tap-target into the Niyamavali clause — ≥44pt, role=link, action-naming label. */}
      <Button
        chromeless
        height={44}
        justify="flex-start"
        accessibilityRole="link"
        accessibilityLabel={t('lock_in.clause_link')}
        accessibilityHint={t('lock_in.clause_link_hint')}
        onPress={onOpenClause}
      >
        {t('lock_in.clause_link')}
      </Button>
    </YStack>
  )
}
