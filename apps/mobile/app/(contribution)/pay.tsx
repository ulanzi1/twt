// Contribution payment step — pay the pool contribution via UPI Intent + self-attest the UTR → the
// yellow pill (Story 8.4, Task 5; AC1/AC2/AC3/AC5/AC6). Reached from the My Pool card's contribute CTA.
//
// Flow: fetch the server-built UPI Intent on mount (the amount + VPA + tr are server-authoritative — the
// client never names them; R4). Three shapes:
//   · { available: true }  → the ≥56pt <UPIIntentButton> opens the OS UPI app (Linking.openURL) → on
//                            return the member pastes the UTR (permissive; the server format-validates) →
//                            "Confirm" posts /attest → the yellow pill (a member CLAIM, never green).
//   · { available: false, reason: vpa_not_collected | accounts_not_collected } → the calm "UPI contribution
//                            isn't available for this pool yet — tap Get help" state (the D1 shipped v1
//                            path; the VPA-collection substrate is deferred to a dedicated story).
//   · { available: false, reason: unassigned } → a calm "no live pool right now" placeholder.
// No-UPI-app / returned-without-UTR / invalid-UTR → per-app guidance + the Story 8.5 failure-coach seam
// (the "Get help" helpline dial-out); the member can still attest a payment made out-of-band.
//
// ── Accessibility (AC6 / Story 0.10 P0-2c) ──────────────────────────────────────────────────────────
// Every control carries accessibilityLabel + hint (action-named — WCAG 2.5.3); the yellow-pill status is
// announced polite (never assertive); errors are role=alert; the UTR field has a clear ARIA label; amount
// + UTR are Latin operational numerals (amendment-A2). Mobile build/test are repo no-ops → verified by
// typecheck + lint + the domain/contracts/handler suites.

import { ApiError } from '@twt/api-client'
import type { ContributionIntentResponse } from '@twt/contracts'
import { ContributionUtr } from '@twt/contracts'
import { useT } from '@twt/i18n/react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { ScrollView } from 'react-native'
import { Button, H2, Input, Paragraph, Spinner, Text, View, YStack } from 'tamagui'

import { UPIIntentButton } from '../../components/active-contribution/UPIIntentButton'
import { UpiFailureCoach } from '../../components/active-contribution/UpiFailureCoach'
import { CallHelplineCTA } from '../../components/claim/CallHelplineCTA'
import { memberAuth } from '../../lib/member-api'

const NS = { namespace: 'contribution' } as const

// The wire type IS the contract — no hand-duplicated local shape to drift out of sync (review finding).
type Intent = ContributionIntentResponse

/** Errors the server distinguishes as recoverable by re-fetching a fresh intent (the pool assignment
 * changed mid-flow) — review finding: these used to be dead-end retries on a stale `tr`. */
function isStalePoolError(e: unknown): boolean {
  return e instanceof ApiError && (e.code === 'contribution.tr_mismatch' || e.code === 'contribution.unassigned')
}

/** Format a whole-INR amount as ₹X,XX,XXX — Latin numerals, Indian grouping (amendment-A2). */
function formatInr(amountInr: number): string {
  return `₹${amountInr.toLocaleString('en-IN')}`
}

export default function ContributionPayScreen() {
  const t = useT()
  const router = useRouter()
  const queryClient = useQueryClient()

  const [intent, setIntent] = useState<Intent | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [launched, setLaunched] = useState(false)
  const [noApp, setNoApp] = useState(false)
  const [launchError, setLaunchError] = useState(false)
  const [utr, setUtr] = useState('')
  const [busy, setBusy] = useState(false)
  const [switching, setSwitching] = useState(false)
  const [switchError, setSwitchError] = useState(false)
  const [attested, setAttested] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Set while a <UpiFailureCoach> instance has a mode selected (guidance showing) — hides this screen's own
  // outer helpline/retry affordances so the coach's own embedded versions aren't duplicated (review finding).
  const [coachGuidanceShowing, setCoachGuidanceShowing] = useState(false)

  /** Shared by both coach instances: a successful in-coach retry re-launch clears the stale failure flags
   * that triggered the coach in the first place, so it doesn't keep rendering alongside the UTR step
   * (review finding). */
  function onCoachRetryLaunched(): void {
    setLaunched(true)
    setNoApp(false)
    setLaunchError(false)
    // The coach instance that triggered this unmounts on the state flip above — its embedded helpline goes
    // with it, so un-hide this screen's own outer helpline for whatever renders next (review finding).
    setCoachGuidanceShowing(false)
  }

  useEffect(() => {
    let active = true
    setLoadFailed(false)
    void (async () => {
      try {
        const data = (await memberAuth.memberContributionIntent()) as Intent
        if (!active) return
        // Already attested (even out-of-band, 8.10) — route straight to confirmation, never re-run the
        // launch flow (review finding).
        if (data.myContribution === 'attested') {
          setAttested(true)
        } else {
          setIntent(data)
        }
      } catch (e) {
        console.error('[pay] intent load failed', e)
        if (active) setLoadFailed(true)
      }
    })()
    return () => {
      active = false
    }
  }, [retryCount])

  const utrValid = ContributionUtr.safeParse(utr.trim()).success

  /** FR-27 "Switch account" (Story 8.13): re-request the intent for the OTHER nominee account. The
   * server returns `account_not_found` (→ unavailable) if the other account has no VPA — never a
   * silent substitution — so we only replace `intent` on a fresh `available` response. A network error
   * or an unexpectedly-unavailable response surfaces `switchError` (review finding — this used to fail
   * silently, leaving the spinner stop with no explanation). A response with `myContribution:'attested'`
   * (the member attested elsewhere mid-flow, e.g. another device) routes straight to the yellow-pill
   * confirmation instead of re-showing the pay flow for the new account (review finding). On a genuine
   * switch, the stale per-account launch state (launched/noApp/launchError/utr/coach) is reset so the
   * previous account's failure-coach/UTR box doesn't render over the freshly switched account. */
  async function onSwitchAccount(): Promise<void> {
    if (!intent || !intent.available || switching) return
    setSwitching(true)
    setSwitchError(false)
    try {
      const next = (await memberAuth.memberContributionIntent({
        account: intent.account === 1 ? 2 : 1,
      })) as Intent
      if (next.myContribution === 'attested') {
        setAttested(true)
      } else if (next.available) {
        setIntent(next)
        setLaunched(false)
        setNoApp(false)
        setLaunchError(false)
        setUtr('')
        setCoachGuidanceShowing(false)
      } else {
        setSwitchError(true)
      }
    } catch (e) {
      console.error('[pay] switch account failed', e)
      setSwitchError(true)
    } finally {
      setSwitching(false)
    }
  }

  async function onConfirm(): Promise<void> {
    if (!intent || !intent.available || !utrValid) return
    setBusy(true)
    setError(null)
    try {
      await memberAuth.memberContributionAttest({ tr: intent.tr, utr: utr.trim() })
      setAttested(true)
      // Refresh the My Pool card so its yellow pill renders on return (AC4).
      await queryClient.invalidateQueries({ queryKey: ['member', 'active-contribution'] })
    } catch (e) {
      console.error('[pay] attest failed', e)
      if (isStalePoolError(e)) {
        // The pool assignment changed mid-flow (the intent's tr is stale) — auto-refetch a FRESH intent
        // and retry the attest exactly ONCE with the new tr. Never loop (review finding).
        try {
          const fresh = (await memberAuth.memberContributionIntent()) as Intent
          if (fresh.available) {
            setIntent(fresh)
            await memberAuth.memberContributionAttest({ tr: fresh.tr, utr: utr.trim() })
            setAttested(true)
            await queryClient.invalidateQueries({ queryKey: ['member', 'active-contribution'] })
            return
          }
          setError(t('upi_intent.pool_changed_error', undefined, NS))
        } catch (retryErr) {
          console.error('[pay] attest retry failed', retryErr)
          setError(t('upi_intent.pool_changed_error', undefined, NS))
        }
      } else if (e instanceof ApiError && e.isUnauthorized) {
        setError(t('upi_intent.session_expired_error', undefined, NS))
      } else {
        setError(t('upi_intent.attest_error', undefined, NS))
      }
    } finally {
      setBusy(false)
    }
  }

  // ── The attested (yellow-pill) confirmation ───────────────────────────────────────────────────────
  if (attested) {
    return (
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <YStack gap="$3">
          <View
            bg="$yellow4"
            px="$4"
            py="$4"
            borderWidth={1}
            borderColor="$yellow8"
            accessibilityRole="text"
            accessibilityLiveRegion="polite"
            accessibilityLabel={t('upi_intent.yellow_pill_a11y', undefined, NS)}
          >
            <Text fontFamily="$body" fontSize="$5" color="$yellow11">
              {t('upi_intent.yellow_pill', undefined, NS)}
            </Text>
          </View>
          <Button
            height={56}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel={t('upi_intent.done_cta', undefined, NS)}
          >
            {t('upi_intent.done_cta', undefined, NS)}
          </Button>
        </YStack>
      </ScrollView>
    )
  }

  // ── Loading / load-failed ─────────────────────────────────────────────────────────────────────────
  if (!intent && !loadFailed) {
    return (
      <YStack flex={1} items="center" justify="center">
        <Spinner accessibilityLabel={t('upi_intent.loading', undefined, NS)} />
      </YStack>
    )
  }
  if (loadFailed || intent === null) {
    return (
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <YStack gap="$3">
          <Paragraph accessibilityRole="alert">{t('upi_intent.load_failed', undefined, NS)}</Paragraph>
          <Button height={48} onPress={() => setRetryCount((n) => n + 1)} accessibilityRole="button">
            {t('upi_intent.retry', undefined, NS)}
          </Button>
          <CallHelplineCTA label={t('upi_intent.get_help', undefined, NS)} />
        </YStack>
      </ScrollView>
    )
  }

  // ── The first-class no-VPA / unassigned fail-soft (AC2 / D1) ───────────────────────────────────────
  if (!intent.available) {
    const copyKey =
      intent.reason === 'unassigned' ? 'upi_intent.unassigned' : 'upi_intent.unavailable'
    return (
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <YStack gap="$3">
          <H2>{t('upi_intent.title', undefined, NS)}</H2>
          <Paragraph accessibilityRole="text" accessibilityLiveRegion="polite">
            {t(copyKey, undefined, NS)}
          </Paragraph>
          {intent.reason !== 'unassigned' ? (
            <CallHelplineCTA
              label={t('upi_intent.get_help', undefined, NS)}
              chromeless={false}
              theme="red"
              height={56}
            />
          ) : null}
        </YStack>
      </ScrollView>
    )
  }

  // ── The available intent — pay + attest ────────────────────────────────────────────────────────────
  return (
    <ScrollView contentContainerStyle={{ padding: 20 }}>
      <YStack gap="$3">
        <H2>{t('upi_intent.title', undefined, NS)}</H2>

        <Text fontFamily="$body" fontSize="$2" color="$colorPress">
          {t('upi_intent.amount_label', undefined, NS)}
        </Text>
        <Text
          fontFamily="$tabular"
          fontSize="$8"
          color="$color"
          accessibilityLabel={formatInr(intent.amountInr)}
        >
          {formatInr(intent.amountInr)}
        </Text>

        {/* Hidden while the coach below is showing guidance — its own embedded retry takes over, so the
            member never sees two "pay again" affordances at once (review finding). Disabled while a switch
            request is in flight — a tap here would launch the SOON-TO-BE-STALE intent (review finding). */}
        {!coachGuidanceShowing ? (
          <UPIIntentButton
            upiUrl={intent.upiUrl}
            disabled={switching}
            onLaunched={() => setLaunched(true)}
            onNoUpiApp={() => setNoApp(true)}
            onLaunchError={() => setLaunchError(true)}
          />
        ) : null}

        {/* Story 8.13 — FR-27 "Switch account" (#1 ⇄ #2). Only shown when the other nominee account also
            carries a VPA (canSwitchAccount); hidden while the coach owns the screen. */}
        {intent.canSwitchAccount && !coachGuidanceShowing ? (
          <YStack gap="$1">
            <Button
              height={48}
              chromeless
              disabled={switching}
              onPress={() => void onSwitchAccount()}
              accessibilityRole="button"
              accessibilityLabel={t('upi_intent.switch_account_a11y', undefined, NS)}
            >
              {switching ? <Spinner /> : t('upi_intent.switch_account', undefined, NS)}
            </Button>
            {/* Announced politely so a screen-reader member knows the switch started/finished/failed
                (review finding — previously silent both on success and failure). */}
            <Text accessibilityLiveRegion="polite" fontSize="$1" color="$colorPress">
              {switching ? t('upi_intent.switch_account_in_progress', undefined, NS) : ''}
            </Text>
            {switchError ? (
              <Paragraph accessibilityRole="alert" color="$red10">
                {t('upi_intent.switch_account_error', undefined, NS)}
              </Paragraph>
            ) : null}
          </YStack>
        ) : null}

        {/* Story 8.5 — the failure coach REPLACES the ad-hoc no-app / launch-error paragraphs. It helps the
            member name what went wrong + guides a next step (retry / switch app / call helpline / contact
            bank). A no-app / launch error pre-highlights "app issue" (the member still confirms). Diagnostic
            ONLY — it never attests / emits an event / creates a yellow pill (AC4). */}
        {noApp || launchError ? (
          <UpiFailureCoach
            upiUrl={intent.upiUrl}
            onRetryLaunched={onCoachRetryLaunched}
            onModeSelected={(m) => setCoachGuidanceShowing(m !== null)}
            suggestedMode="app_issue"
          />
        ) : null}

        {/* The UTR-paste step — shown after a launch (or a no-app / launch-error, so an out-of-band payer
            can still attest). The server recomputes tr; the client just supplies the UTR it was given. This
            is the escape hatch the coach must preserve (AC4). */}
        {launched || noApp || launchError ? (
          <YStack gap="$2">
            <Text fontFamily="$body" fontSize="$3" color="$color">
              {t('upi_intent.utr_prompt', undefined, NS)}
            </Text>
            <Input
              value={utr}
              onChangeText={setUtr}
              autoCapitalize="characters"
              accessibilityLabel={t('upi_intent.utr_aria', undefined, NS)}
              placeholder={t('upi_intent.utr_placeholder', undefined, NS)}
            />
            {utr.length > 0 && !utrValid ? (
              <Paragraph accessibilityRole="alert" color="$red10">
                {t('upi_intent.utr_invalid', undefined, NS)}
              </Paragraph>
            ) : null}
            {error ? (
              <Paragraph accessibilityRole="alert" color="$red10">
                {error}
              </Paragraph>
            ) : null}
            <Button
              height={56}
              theme="red"
              disabled={!utrValid || busy}
              onPress={onConfirm}
              accessibilityRole="button"
              accessibilityLabel={t('upi_intent.confirm_cta_a11y', undefined, NS)}
            >
              {busy ? <Spinner /> : t('upi_intent.confirm_cta', undefined, NS)}
            </Button>
            {/* Hidden while the coach below is showing guidance — it offers its own helpline CTA (review
                finding: avoid two "Call us" buttons on screen at once). */}
            {!coachGuidanceShowing ? (
              <CallHelplineCTA label={t('upi_intent.get_help', undefined, NS)} />
            ) : null}

            {/* A member who launched but RETURNED WITHOUT A UTR (the payment failed) or pasted an INVALID
                one is not stranded — the coach lets them say what happened (AC1). Not rendered for the
                no-app / launch-error paths, which already show the coach above. */}
            {launched && !noApp && !launchError ? (
              <UpiFailureCoach
                upiUrl={intent.upiUrl}
                onRetryLaunched={onCoachRetryLaunched}
                onModeSelected={(m) => setCoachGuidanceShowing(m !== null)}
              />
            ) : null}
          </YStack>
        ) : null}
      </YStack>
    </ScrollView>
  )
}
