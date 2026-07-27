// <ActiveContributionCard> — the My Pool home-screen card (Story 8.2; the FIRST Epic-8 SURFACE).
// The topmost home element: for an `active` member assigned to a pool whose cycle alert is `live` it
// renders the pool shortform + the DECEASED member's family (the family being supported) + the
// snapshotted fixed amount + a days-remaining countdown + a confirmed-only progress meter + a 15-day
// tone-gradient nudge + a ≥56pt contribute CTA. For every other case it self-suppresses (renders null).
//
// ── Self-suppression + fail-soft (AC1) ────────────────────────────────────────────────────────────
// Renders ONLY when the server returns `{ assigned: true, … }`. `{ assigned: false }`, a loading/error/
// absent read → null (the home content below stays untouched — the RenewalStatusWidget/LockInClock
// posture). The server resolves ALL eligibility/policy; the client resolves nothing (D2).
//
// ── Tone gradient (AC3) ────────────────────────────────────────────────────────────────────────────
// The nudge copy is selected PURELY from the day-of-cycle (derived from the server's days-remaining) by
// `selectToneGradientKey` — calm → factual → gently-closing. Scarcity/panic copy is prohibited (the
// microcopy gate scans this namespace) and the tone keys carry hi+en parity.
//
// ── Numeral discipline (amendment-A2 / D6) ─────────────────────────────────────────────────────────
// days-remaining, amount, and the progress counts are OPERATIONAL figures → LATIN numerals even in
// Hindi (the RenewalStatusWidget posture). `t()` interpolates already-Latin values; the amount uses
// `en-IN` grouping; the upcoming-change date uses an explicit `-u-nu-latn` override. NEVER toHindiNumeral.
//
// ── Accessibility (AC5) ────────────────────────────────────────────────────────────────────────────
// Every atom is semantically labeled; the tone-gradient nudge is the card's SINGLE ambient status
// announced `accessibilityLiveRegion="polite"` (never assertive) — the days-remaining Text carries its
// own label but is not a second live region (one live region per surface, the RenewalStatusWidget
// posture — avoids a double announcement of the day count); the contribute CTA is a ≥56pt touch target
// with role=button + label + hint. Devanagari uses the $heading serif for the deceased name.

import { useLocale, useT } from '@twt/i18n/react'
import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { StyleSheet } from 'react-native'
import { Button, Paragraph, Text, View, YStack } from 'tamagui'

import { CallHelplineCTA } from '../common/CallHelplineCTA'
import { SelfVerifySurface } from '../self-verify/SelfVerifySurface'
import { StatusPill } from '../status-pill/StatusPill'
import { markCtaTap, markLoopPhase } from '../../lib/loop-timing-session'
import { cycleDayFromDaysRemaining, selectToneGradientKey } from './toneGradient'
import { useActiveContributionQuery } from './useActiveContributionQuery'

/** The contribution i18n namespace (the `contribution` catalog). */
const NS = { namespace: 'contribution' } as const

/** Format a whole-INR amount as ₹X,XX,XXX — Latin numerals, Indian grouping (amendment-A2 / D6). */
function formatInr(amountInr: number): string {
  return `₹${amountInr.toLocaleString('en-IN')}`
}

/** Format an ISO date per locale, ALWAYS in Latin numerals (operational figure; amendment-A2). */
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

export function ActiveContributionCard() {
  const t = useT()
  const { locale } = useLocale()
  const { data } = useActiveContributionQuery()
  const router = useRouter()
  // Story 9.7 — the inline <SelfVerifySurface> disclosure (opened by the red "Fix this" affordance or the
  // yellow "Trouble with UTR?" disclosure). Kept local so the card stays the single Journey-1 entry.
  const [showSelfVerify, setShowSelfVerify] = useState(false)

  // Story 8.12 — the `card_render` mark for the 90-second-loop measurement (AC1). Fires exactly ONCE per
  // session, only when the assigned live pool paints (dep is `data?.assigned` + `once` — never on the
  // loading/suppressed states, never on a re-render of the resolved data). Debug-gated → inert in prod.
  useEffect(() => {
    if (data?.assigned) {
      markLoopPhase('card_render', { once: true })
    }
  }, [data?.assigned])

  // Self-suppress on absence / loading / error (AC1). Fail-soft — render nothing, leave the home below.
  if (!data || !data.assigned) {
    return null
  }

  // The deceased member's family label (PII-shielded first-name + last-initial) — the family being
  // supported (AC2). Used in the parichay line + the tone copy interpolation.
  const family = data.deceasedLastInitial
    ? `${data.deceasedFirstName} ${data.deceasedLastInitial}`
    : data.deceasedFirstName

  // Tone gradient (AC3) — a PURE function of the server's days-remaining (via day-of-cycle).
  const toneKey = selectToneGradientKey(cycleDayFromDaysRemaining(data.daysRemaining))
  const toneParams = { days: String(data.daysRemaining), family }
  const statusLine = t(`active_contribution.tone.${toneKey}`, toneParams, NS)
  const statusA11y = t(`active_contribution.tone.${toneKey}_a11y`, toneParams, NS)

  const confirmed = String(data.progress.confirmedCount)
  const total = String(data.progress.rosterSize)
  // Confirmed-only meter fill (AC4) — confirmed / roster. NEVER a "danger" red; a low meter is not an
  // error. 0 today (Epic 9's producer is unbuilt) → an empty bar, honestly (0 of N).
  const fillPct =
    data.progress.rosterSize > 0
      ? Math.min(100, Math.round((data.progress.confirmedCount / data.progress.rosterSize) * 100))
      : 0

  function onContribute(): void {
    // Story 8.12 — the `cta_tap` mark (AC1): the member decided to pay. Segment (b) = intent_fire − cta_tap
    // starts here (the /pay nav + intent fetch is inside the TWT-portion). Debug-gated → inert in prod.
    // markCtaTap (not the generic markLoopPhase) re-arms a stale session on a genuine retry and ignores a
    // rapid double-press of the same attempt (Review finding, 2026-07-25 code review).
    markCtaTap()
    // Story 8.4 — open the UPI Intent contribution flow (server-authoritative upi://pay build + UTR
    // self-attestation → the yellow pill). The pay route owns the <UPIIntentButton> + UTR paste + the
    // no-VPA/failure fail-soft states.
    router.push('/(contribution)/pay')
  }

  // Story 8.4 (AC4) — the MEMBER'S OWN yellow-pill state. `attested` → the pending-reconciliation pill
  // (told-us-they-paid, still verifying) REPLACES the contribute CTA; `none` → the contribute CTA. A
  // per-member self-state — NEVER "confirmed/received/success/paid ✓", and it never touches the meter above.
  const hasAttested = data.myContribution === 'attested'
  // Story 9.7 (AC1) — the member's OWN unresolved-mismatch (red) state. The card flips to the red pill and
  // offers a DIRECT "Fix this" → <SelfVerifySurface> entry (Decision D7, confirmed by BigDev), never the
  // alarming "expected X" line. A per-member self-state — it never touches the confirmed-only meter above.
  const isMismatch = data.myContribution === 'mismatch'

  return (
    <YStack
      bg="$background"
      px="$5"
      py="$4"
      gap="$2"
      borderTopWidth={1}
      borderBottomWidth={1}
      borderColor="$borderColor"
      accessibilityRole="summary"
    >
      {/* Card label (passbook register — hairline rules above/below, no shadow, no rounded corners). */}
      <Text fontFamily="$body" fontSize="$2" color="$colorPress" accessibilityRole="text">
        {t('active_contribution.title', undefined, NS)}
      </Text>

      {/* Pool shortform — the curated Mahabharata name when configured, else "Pool <letter>" (AC2). */}
      <Text fontFamily="$body" fontSize="$7" color="$color" accessibilityRole="header">
        {data.poolName ?? `Pool ${data.poolLetterCode}`}
      </Text>

      {/* The deceased member being supported (Devanagari serif) + the family-parichay dignity line. */}
      <Text fontFamily="$heading" fontSize="$6" color="$color" accessibilityRole="text">
        {family}
      </Text>
      <Text fontFamily="$body" fontSize="$3" color="$colorPress" accessibilityRole="text">
        {t('active_contribution.family_parichay', { family }, NS)}
      </Text>

      {/* Fixed amount — the SNAPSHOTTED pools.fixed_amount (D3), tabular monospace (passbook, §977). */}
      <Text fontFamily="$body" fontSize="$2" color="$colorPress" accessibilityRole="text">
        {t('active_contribution.amount_label', undefined, NS)}
      </Text>
      <Text
        fontFamily="$tabular"
        fontSize="$8"
        color="$color"
        style={styles.tabularNums}
        accessibilityRole="text"
        accessibilityLabel={formatInr(data.fixedAmount)}
      >
        {formatInr(data.fixedAmount)}
      </Text>

      {/* AC6 — the upcoming fixed-amount transition, surfaced gently (no banner; additive context). */}
      {data.upcomingAmountChange ? (
        <Text fontFamily="$body" fontSize="$2" color="$colorPress" accessibilityRole="text">
          {t(
            'active_contribution.upcoming_amount',
            {
              date: formatDate(data.upcomingAmountChange.effectiveFrom, locale),
              amount: data.upcomingAmountChange.newAmount.toLocaleString('en-IN'),
            },
            NS,
          )}
        </Text>
      ) : null}

      {/* Days-remaining countdown — visible + labeled, but NOT its own live region: the tone-gradient
          Paragraph below is the card's single ambient live-announced status (the RenewalStatusWidget
          posture — one live region per surface avoids a screen reader hearing the day count twice). */}
      <Text
        fontFamily="$tabular"
        fontSize="$5"
        color="$colorPress"
        style={styles.tabularNums}
        accessibilityRole="text"
        accessibilityLabel={t('active_contribution.days_a11y', { days: String(data.daysRemaining) }, NS)}
      >
        {t('active_contribution.days_a11y', { days: String(data.daysRemaining) }, NS)}
      </Text>

      {/* Tone-gradient nudge (calm → factual → gently-closing). Polite ambient status. */}
      <Paragraph
        fontFamily="$body"
        fontSize="$4"
        color="$color"
        accessibilityRole="text"
        accessibilityLiveRegion="polite"
        accessibilityLabel={statusA11y}
      >
        {statusLine}
      </Paragraph>

      {/* Progress meter — confirmed-only (AC4). NO red "danger" styling; a low meter is not an error. */}
      <Text fontFamily="$body" fontSize="$2" color="$colorPress" accessibilityRole="text">
        {t('active_contribution.progress', { confirmed, total }, NS)}
      </Text>
      <View
        bg="$borderColor"
        height={8}
        overflow="hidden"
        accessibilityRole="progressbar"
        accessibilityLabel={t('active_contribution.progress_a11y', { confirmed, total }, NS)}
      >
        <View bg="$color" height={8} width={`${fillPct}%`} />
      </View>

      {/* Story 8.4 (AC4) — the member's OWN state. Attested → the yellow pending-reconciliation pill
          (ambient polite status, NEVER "confirmed/success"); otherwise the ≥56pt contribute CTA.
          Story 9.6: the hand-rolled yellow pill is replaced by the DS <StatusPill status="yellow">. The
          pre-9.6 pill set `accessibilityLiveRegion="polite"` on its View (a SECOND live region alongside
          the tone-gradient paragraph, contradicting the file header's "single live region" claim). We
          PRESERVE that behavior deliberately via the pill's `live` prop rather than silently drop it —
          the attested confirmation is a genuine state change worth announcing; the tone-gradient nudge
          and this attested-status announcement carry different content (Story 9.6 Completion Notes). */}
      {isMismatch ? (
        // Story 9.7 (AC1/D7) — the RED mismatch state: the red pill + a DIRECT "Fix this" self-serve entry
        // to the recovery surface (revealed inline). NEVER the alarming "expected X, recorded Y" line.
        <YStack gap="$2">
          {/* `live` only while the surface is COLLAPSED — once expanded, <SelfVerifySurface>'s own
              accessibilityLiveRegion takes over announcing this state, so the pill doesn't double up as a
              second concurrent live region alongside it (preserving the single-ambient-region discipline
              this file documents above; code review, 2026-07-27). */}
          <StatusPill status="red" size="default" live={!showSelfVerify} />
          <Button
            height={56}
            theme="red"
            justify="flex-start"
            accessibilityRole="button"
            accessibilityLabel={t('selfVerify.fix_this_a11y', undefined, NS)}
            accessibilityState={{ expanded: showSelfVerify }}
            onPress={() => setShowSelfVerify((v) => !v)}
          >
            {t('selfVerify.fix_this', undefined, NS)}
          </Button>
          {showSelfVerify ? <SelfVerifySurface poolId={data.poolId} /> : null}
        </YStack>
      ) : hasAttested ? (
        // Yellow (still-verifying). The pill + the FR-32 HIDDEN "Trouble with UTR?" disclosure — a member
        // who paid but sees no confirmation can self-serve (fallback=true) without waiting for a red flip.
        <YStack gap="$2">
          {/* Same "surface owns the live announcement once expanded" rule as the red pill above. */}
          <StatusPill status="yellow" size="default" live={!showSelfVerify} />
          <Button
            height={56}
            chromeless
            justify="flex-start"
            accessibilityRole="button"
            accessibilityLabel={t('selfVerify.trouble_with_utr_a11y', undefined, NS)}
            accessibilityState={{ expanded: showSelfVerify }}
            onPress={() => setShowSelfVerify((v) => !v)}
          >
            {t('selfVerify.trouble_with_utr', undefined, NS)}
          </Button>
          {showSelfVerify ? <SelfVerifySurface poolId={data.poolId} fallback /> : null}
        </YStack>
      ) : (
        // Contribute CTA — a ≥56pt touch target (AC5/UX-DR26), warm-red accent (§1094: one accent per
        // surface), role=button + label + hint. Opens the Story 8.4 UPI Intent flow.
        <Button
          height={56}
          theme="red"
          justify="flex-start"
          accessibilityRole="button"
          accessibilityLabel={t('active_contribution.contribute_cta_a11y', undefined, NS)}
          accessibilityHint={t('active_contribution.contribute_cta_hint', undefined, NS)}
          onPress={onContribute}
        >
          {t('active_contribution.contribute_cta', undefined, NS)}
        </Button>
      )}

      {/* Cross-cutting helpline fallback (Story 8.11; UX-DR49 + AR-61). Present in BOTH the attested
          and contribute branches — human help is one tap away whether or not the member has paid. It
          is the THIRD tier of the recovery ladder (UX-DR62: self-recovery → in-flow help → helpline),
          so it renders ≥56pt for touch (AC3) but visually SUBORDINATE — chromeless, no warm-red accent
          (that accent is spent on the Contribute CTA above). It is a `button`, not a live region, so
          the card's single polite live region (the tone-gradient Paragraph) is unbroken. */}
      <CallHelplineCTA height={56} />
    </YStack>
  )
}

const styles = StyleSheet.create({
  tabularNums: {
    fontVariant: ['tabular-nums'],
  },
})
