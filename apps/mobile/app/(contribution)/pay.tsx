// Contribution payment step — choose the nominee bank account, pay via UPI Intent + self-attest the UTR →
// the yellow pill (Story 8.4 + Story 9.9). Reached from the My Pool card's contribute CTA.
//
// ── Story 9.9: donor CHOICE, not routing ────────────────────────────────────────────────────────────
// The nominee provides up to two EQUAL bank accounts. On mount we fetch the donor-facing nominee-accounts
// read (bank-name labels + nominee name + full account#/IFSC + vpaPresent). The donor picks WHICH account to
// pay (no preselect when two exist; auto-select when one) — there is NO primary/secondary/default. On
// selection we show that account's banking info (nominee-NAME match confidence + a manual/NEFT fallback) and
// build the server-authoritative UPI Intent FOR THAT ACCOUNT (the `account` param carries the choice). On
// failure the donor can choose the OTHER account or retry the SAME — a purely donor-driven action, never a
// server re-route. The amount + tr stay server-authoritative (R4); the choice changes only the destination.
//
// Flow, once an account is chosen:
//   · { available: true }  → the ≥56pt <UPIIntentButton> opens the OS UPI app → on return the member pastes
//                            the UTR → "Confirm" posts /attest → the yellow pill (a member CLAIM, never green).
//   · { available: false, reason: vpa_not_collected | accounts_not_collected } → the calm "UPI isn't available
//                            for this account yet — you can still transfer using the details above / Get help"
//                            state (the D1 shipped v1 path; the nominee-VPA substrate is still deferred).
// No-UPI-app / returned-without-UTR / invalid-UTR → the Story 8.5 failure-coach seam; an out-of-band payer
// can still attest.
//
// ── Accessibility (AC6 / Story 0.10 P0-2c) ──────────────────────────────────────────────────────────
// Every control carries accessibilityLabel + hint (action-named — WCAG 2.5.3); the yellow-pill status is
// announced polite; errors are role=alert; the account-choice options are radio-semantic; amount + UTR +
// account numbers are Latin operational numerals (amendment-A2). Mobile build/test are repo no-ops → verified
// by typecheck + lint + the domain/contracts/handler suites + the source-scan render fence.

import { ApiError } from '@twt/api-client'
import type { ContributionIntentResponse, NomineeAccountsResponse, NomineeBankAccountView } from '@twt/contracts'
import { ContributionUtr, NOMINEE_BANK_DECRYPT_FAILED_SENTINEL } from '@twt/contracts'
import { useT } from '@twt/i18n/react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { AppState, ScrollView } from 'react-native'
import { Button, H2, Input, Paragraph, Spinner, Text, XStack, YStack } from 'tamagui'

import { UPIIntentButton } from '../../components/active-contribution/UPIIntentButton'
import { UpiFailureCoach } from '../../components/active-contribution/UpiFailureCoach'
import { CallHelplineCTA } from '../../components/common/CallHelplineCTA'
import { StatusPill } from '../../components/status-pill/StatusPill'
import { memberAuth } from '../../lib/member-api'
import { finalizeLoopSession, markLoopPhase, markUpiReturn } from '../../lib/loop-timing-session'
import { loopTimingEnabled } from '../../lib/loop-timing-store'

const NS = { namespace: 'contribution' } as const

// The wire types ARE the contract — no hand-duplicated local shape to drift out of sync (review finding).
type Intent = ContributionIntentResponse
type Accounts = NomineeAccountsResponse

/** Errors the server distinguishes as recoverable by re-fetching a fresh intent (the pool assignment
 * changed mid-flow) — review finding: these used to be dead-end retries on a stale `tr`. */
function isStalePoolError(e: unknown): boolean {
  return e instanceof ApiError && (e.code === 'contribution.tr_mismatch' || e.code === 'contribution.unassigned')
}

/** Format a whole-INR amount as ₹X,XX,XXX — Latin numerals, Indian grouping (amendment-A2). */
function formatInr(amountInr: number): string {
  return `₹${amountInr.toLocaleString('en-IN')}`
}

/** A labeled banking-info row (Story 9.9, AC3). The account number + IFSC use the tabular face (Latin
 * operational numerals, amendment-A2). Module-level (not a render-nested component) so it never remounts. */
function FieldRow({ label, value, tabular }: { label: string; value: string; tabular?: boolean }) {
  return (
    <XStack gap="$2" justify="space-between">
      <Text fontFamily="$body" fontSize="$3" color="$colorPress">
        {label}
      </Text>
      <Text fontFamily={tabular ? '$tabular' : '$body'} fontSize="$3" color="$color" flex={1} text="right">
        {value}
      </Text>
    </XStack>
  )
}

/** The "choose the other account" affordance (Story 9.9, AC4) — equal choice, never "switch back to primary".
 * Module-level; takes its copy + handler as props. */
function ChooseOtherAccountButton({ label, a11yLabel, onPress }: { label: string; a11yLabel: string; onPress: () => void }) {
  return (
    <Button height={48} chromeless onPress={onPress} accessibilityRole="button" accessibilityLabel={a11yLabel}>
      {label}
    </Button>
  )
}

export default function ContributionPayScreen() {
  const t = useT()
  const router = useRouter()
  const queryClient = useQueryClient()

  // Story 9.9 — the nominee-accounts read (the donor's choice list) drives the screen.
  const [accounts, setAccounts] = useState<Accounts | null>(null)
  const [accountsLoadFailed, setAccountsLoadFailed] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  // The donor's chosen account rank (identity 1|2), or null while awaiting a choice (two-account case).
  const [selectedRank, setSelectedRank] = useState<1 | 2 | null>(null)
  // Bumped to force an intent re-fetch for the SAME account ("Retry this account").
  const [intentReload, setIntentReload] = useState(0)

  const [intent, setIntent] = useState<Intent | null>(null)
  const [intentLoading, setIntentLoading] = useState(false)
  const [intentLoadFailed, setIntentLoadFailed] = useState(false)

  const [launched, setLaunched] = useState(false)
  const [noApp, setNoApp] = useState(false)
  const [launchError, setLaunchError] = useState(false)
  const [utr, setUtr] = useState('')
  const [busy, setBusy] = useState(false)
  const [attested, setAttested] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Set while a <UpiFailureCoach> instance has a mode selected (guidance showing) — hides this screen's own
  // outer helpline/retry affordances so the coach's own embedded versions aren't duplicated (review finding).
  const [coachGuidanceShowing, setCoachGuidanceShowing] = useState(false)

  /** Reset the per-account launch state so a stale coach/UTR box never renders over a freshly chosen account. */
  function resetLaunchState(): void {
    setLaunched(false)
    setNoApp(false)
    setLaunchError(false)
    setUtr('')
    setError(null)
    setCoachGuidanceShowing(false)
  }

  /** Shared by both coach instances: a successful in-coach retry re-launch clears the stale failure flags
   * that triggered the coach in the first place, so it doesn't keep rendering alongside the UTR step. */
  function onCoachRetryLaunched(): void {
    setLaunched(true)
    setNoApp(false)
    setLaunchError(false)
    setCoachGuidanceShowing(false)
  }

  // (1) Load the nominee-accounts choice list on mount / retry. An already-attested member (even out-of-band,
  // 8.10) routes straight to confirmation, never through a needless account choice (the intent-shortcut
  // precedent, now on the accounts read which carries myContribution too).
  useEffect(() => {
    let active = true
    setAccountsLoadFailed(false)
    void (async () => {
      try {
        const data = (await memberAuth.memberNomineeAccounts()) as Accounts
        if (!active) return
        if (data.myContribution === 'attested') {
          setAttested(true)
          return
        }
        setAccounts(data)
        // Auto-select when exactly one account exists (no needless choice).
        if (data.available && data.accounts.length === 1) {
          setSelectedRank(data.accounts[0]!.rank)
        }
      } catch (e) {
        console.error('[pay] nominee-accounts load failed', e)
        if (active) setAccountsLoadFailed(true)
      }
    })()
    return () => {
      active = false
    }
  }, [retryCount])

  // (2) Build the UPI Intent for the chosen account whenever the selection changes or a same-account retry is
  // requested. The server names the payee/amount/tr (R4); the `account` param carries the donor's choice. A
  // response with myContribution:'attested' (attested elsewhere mid-flow) routes to the yellow-pill confirm.
  useEffect(() => {
    if (selectedRank === null) return
    let active = true
    setIntentLoading(true)
    setIntentLoadFailed(false)
    void (async () => {
      try {
        const next = (await memberAuth.memberContributionIntent({ account: selectedRank })) as Intent
        if (!active) return
        if (next.myContribution === 'attested') {
          setAttested(true)
          return
        }
        setIntent(next)
      } catch (e) {
        console.error('[pay] intent load failed', e)
        if (active) setIntentLoadFailed(true)
      } finally {
        if (active) setIntentLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [selectedRank, intentReload])

  // Story 8.12 — the FIRST scoped AppState listener (D2): timestamps the background→active return from the
  // UPI app as `upi_return` (AC1). Debug-gated — a production build never registers the listener.
  const appStateRef = useRef(AppState.currentState)
  useEffect(() => {
    if (!loopTimingEnabled()) return
    const sub = AppState.addEventListener('change', (next) => {
      const wasBackground = appStateRef.current === 'background' || appStateRef.current === 'inactive'
      if (wasBackground && next === 'active') {
        markUpiReturn()
      }
      appStateRef.current = next
    })
    return () => sub.remove()
  }, [])

  // Story 8.12 — the `yellow_pill` mark + loop finalize (AC1). Debug-gated → inert in production.
  useEffect(() => {
    if (attested) {
      markLoopPhase('yellow_pill')
      finalizeLoopSession()
    }
  }, [attested])

  const utrValid = ContributionUtr.safeParse(utr.trim()).success
  const accountList: NomineeBankAccountView[] = accounts?.available ? accounts.accounts : []
  const selectedAccount = accountList.find((a) => a.rank === selectedRank) ?? null
  const hasOtherAccount = accountList.length > 1
  // Story 9.9 (AC6, review finding) — a TOTAL decrypt failure (every Tier-1 field on this account
  // degraded to the sentinel, e.g. a KMS outage) must not read as ordinary banking data. A single bad
  // field still renders fine (mixed with real values) — this only fires when ALL three failed.
  const selectedAccountAllFieldsUnavailable =
    selectedAccount !== null &&
    selectedAccount.accountHolderName === NOMINEE_BANK_DECRYPT_FAILED_SENTINEL &&
    selectedAccount.accountNumber === NOMINEE_BANK_DECRYPT_FAILED_SENTINEL &&
    selectedAccount.ifsc === NOMINEE_BANK_DECRYPT_FAILED_SENTINEL

  /** Story 9.9 (AC4) — choose the OTHER nominee account (both equal). Switches the rank; the effect refetches
   * the intent. The stale per-account launch state is reset so the previous account's coach/UTR box doesn't
   * render over the newly chosen account. */
  function onChooseOtherAccount(): void {
    const other = accountList.find((a) => a.rank !== selectedRank)
    if (!other) return
    resetLaunchState()
    setIntent(null)
    setSelectedRank(other.rank)
  }

  /** Story 9.9 (AC4) — retry the SAME account (re-fetch its intent; reset the stale launch state). */
  function onRetryThisAccount(): void {
    resetLaunchState()
    setIntent(null)
    setIntentReload((n) => n + 1)
  }

  // Story 8.12 — the `utr_confirm` mark (AC1) + post-attest bookkeeping, shared by the main attest call and
  // the stale-pool retry branch (a single helper means a future edit can't miss one).
  async function markAttestedAndRefresh(): Promise<void> {
    markLoopPhase('utr_confirm')
    setAttested(true)
    await queryClient.invalidateQueries({ queryKey: ['member', 'active-contribution'] })
  }

  async function onConfirm(): Promise<void> {
    if (!intent || !intent.available || !utrValid) return
    setBusy(true)
    setError(null)
    try {
      await memberAuth.memberContributionAttest({ tr: intent.tr, utr: utr.trim() })
      await markAttestedAndRefresh()
    } catch (e) {
      console.error('[pay] attest failed', e)
      if (isStalePoolError(e)) {
        // The pool assignment changed mid-flow (the intent's tr is stale) — auto-refetch a FRESH intent for
        // the SAME account and retry the attest exactly ONCE with the new tr. Never loop (review finding).
        try {
          const fresh = (await memberAuth.memberContributionIntent(
            selectedRank !== null ? { account: selectedRank } : undefined,
          )) as Intent
          if (fresh.available) {
            setIntent(fresh)
            await memberAuth.memberContributionAttest({ tr: fresh.tr, utr: utr.trim() })
            await markAttestedAndRefresh()
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

  // ── The attested (yellow-pill) confirmation (Story 9.6 <StatusPill>) ───────────────────────────────
  if (attested) {
    return (
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <YStack gap="$3">
          <StatusPill status="yellow" size="default" live />
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

  // ── Loading / load-failed (the accounts read) ──────────────────────────────────────────────────────
  if (!accounts && !accountsLoadFailed) {
    return (
      <YStack flex={1} items="center" justify="center">
        <Spinner accessibilityLabel={t('upi_intent.loading', undefined, NS)} />
      </YStack>
    )
  }
  if (accountsLoadFailed || accounts === null) {
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

  // ── The first-class absence: unassigned / no accounts collected (AC1) ──────────────────────────────
  if (!accounts.available) {
    const copyKey = accounts.reason === 'unassigned' ? 'upi_intent.unassigned' : 'upi_intent.unavailable'
    return (
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <YStack gap="$3">
          <H2>{t('upi_intent.title', undefined, NS)}</H2>
          <Paragraph accessibilityRole="text" accessibilityLiveRegion="polite">
            {t(copyKey, undefined, NS)}
          </Paragraph>
          {accounts.reason !== 'unassigned' ? (
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

  // ── Two accounts, no choice made yet — the EQUAL-choice selection list (AC2) ────────────────────────
  if (selectedRank === null) {
    return (
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <YStack gap="$3">
          <H2>{t('upi_intent.choose_account_title', undefined, NS)}</H2>
          <Paragraph accessibilityRole="text" color="$colorPress">
            {t('upi_intent.choose_account_hint', undefined, NS)}
          </Paragraph>
          {/* Radio-semantic options — no preselect (both accounts are equal payment destinations; the donor
              chooses). Rendered as plain buttons (≤2 items → no virtualized/sticky list, so the Fabric
              empty→populated FlatList crash does not apply). */}
          {accountList.map((acc) => (
            <Button
              key={acc.rank}
              height={56}
              accessibilityRole="radio"
              accessibilityState={{ checked: false }}
              accessibilityLabel={t('upi_intent.choose_account_option_a11y', { bank: acc.bankName }, NS)}
              onPress={() => {
                resetLaunchState()
                setIntent(null)
                setSelectedRank(acc.rank)
              }}
            >
              {acc.bankName}
            </Button>
          ))}
        </YStack>
      </ScrollView>
    )
  }

  // ── An account is chosen — banking-info panel + the pay/attest sub-flow ─────────────────────────────
  return (
    <ScrollView contentContainerStyle={{ padding: 20 }}>
      <YStack gap="$3">
        <H2>{t('upi_intent.title', undefined, NS)}</H2>

        {/* AC3 — the chosen account's nominee NAME + bank + full account# + IFSC, so the donor can confirm the
            payment is going to the correct nominee (name match) and can transfer manually/NEFT if UPI is dark.
            A TOTAL decrypt failure (review finding) gets a distinct warning instead of a normal-looking card —
            it must never read as ordinary banking data the donor could act on. */}
        {selectedAccount && selectedAccountAllFieldsUnavailable ? (
          <YStack gap="$2" borderColor="$red10" borderWidth={1} rounded="$4" p="$3" accessibilityRole="alert">
            <Paragraph accessibilityRole="alert" accessibilityLiveRegion="polite" color="$red10">
              {t('upi_intent.account_details_unavailable_warning', undefined, NS)}
            </Paragraph>
            {hasOtherAccount ? (
              <ChooseOtherAccountButton
                label={t('upi_intent.choose_other_account', undefined, NS)}
                a11yLabel={t('upi_intent.choose_other_account_a11y', undefined, NS)}
                onPress={onChooseOtherAccount}
              />
            ) : null}
            <CallHelplineCTA label={t('upi_intent.get_help', undefined, NS)} chromeless={false} theme="red" />
          </YStack>
        ) : selectedAccount ? (
          <YStack
            gap="$1"
            borderColor="$borderColor"
            borderWidth={1}
            rounded="$4"
            p="$3"
            accessibilityRole="summary"
          >
            <Text fontFamily="$body" fontSize="$2" color="$colorPress">
              {t('upi_intent.paying_to_label', undefined, NS)}
            </Text>
            <FieldRow label={t('upi_intent.account_holder_label', undefined, NS)} value={selectedAccount.accountHolderName} />
            <FieldRow label={t('upi_intent.bank_label', undefined, NS)} value={selectedAccount.bankName} />
            <FieldRow
              label={t('upi_intent.account_number_label', undefined, NS)}
              value={selectedAccount.accountNumber}
              tabular
            />
            <FieldRow label={t('upi_intent.ifsc_label', undefined, NS)} value={selectedAccount.ifsc} tabular />
          </YStack>
        ) : null}

        {/* The intent for the chosen account. */}
        {intentLoading || intent === null ? (
          <YStack items="center" justify="center" p="$3">
            <Spinner accessibilityLabel={t('upi_intent.loading', undefined, NS)} />
          </YStack>
        ) : intentLoadFailed ? (
          <YStack gap="$2">
            <Paragraph accessibilityRole="alert">{t('upi_intent.load_failed', undefined, NS)}</Paragraph>
            <Button
              height={48}
              onPress={onRetryThisAccount}
              accessibilityRole="button"
              accessibilityLabel={t('upi_intent.retry_this_account_a11y', undefined, NS)}
            >
              {t('upi_intent.retry_this_account', undefined, NS)}
            </Button>
            {hasOtherAccount ? <ChooseOtherAccountButton
                label={t('upi_intent.choose_other_account', undefined, NS)}
                a11yLabel={t('upi_intent.choose_other_account_a11y', undefined, NS)}
                onPress={onChooseOtherAccount}
              /> : null}
            <CallHelplineCTA label={t('upi_intent.get_help', undefined, NS)} />
          </YStack>
        ) : !intent.available ? (
          // UPI isn't available for THIS account yet — but the banking details above still enable a manual/NEFT
          // transfer, and the donor can choose the other account or retry (AC4).
          <YStack gap="$3">
            <Paragraph accessibilityRole="text" accessibilityLiveRegion="polite">
              {t('upi_intent.manual_transfer_hint', undefined, NS)}
            </Paragraph>
            {hasOtherAccount ? <ChooseOtherAccountButton
                label={t('upi_intent.choose_other_account', undefined, NS)}
                a11yLabel={t('upi_intent.choose_other_account_a11y', undefined, NS)}
                onPress={onChooseOtherAccount}
              /> : null}
            <CallHelplineCTA
              label={t('upi_intent.get_help', undefined, NS)}
              chromeless={false}
              theme="red"
              height={56}
            />
          </YStack>
        ) : (
          // ── The available intent — pay + attest ──────────────────────────────────────────────────────
          <YStack gap="$3">
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

            {!coachGuidanceShowing ? (
              <UPIIntentButton
                upiUrl={intent.upiUrl}
                onLaunched={() => setLaunched(true)}
                onNoUpiApp={() => setNoApp(true)}
                onLaunchError={() => setLaunchError(true)}
              />
            ) : null}

            {/* Story 9.9 (AC4) — choose the OTHER nominee account (both equal). Replaces the Story 8.13
                "Switch account" affordance; shown whenever a second account exists, hidden while the coach
                owns the screen. */}
            {hasOtherAccount && !coachGuidanceShowing ? <ChooseOtherAccountButton
                label={t('upi_intent.choose_other_account', undefined, NS)}
                a11yLabel={t('upi_intent.choose_other_account_a11y', undefined, NS)}
                onPress={onChooseOtherAccount}
              /> : null}

            {/* Story 8.5 — the failure coach. Diagnostic ONLY — it never attests / emits an event / creates a
                yellow pill (AC4). */}
            {noApp || launchError ? (
              <UpiFailureCoach
                upiUrl={intent.upiUrl}
                onRetryLaunched={onCoachRetryLaunched}
                onModeSelected={(m) => setCoachGuidanceShowing(m !== null)}
                suggestedMode="app_issue"
              />
            ) : null}

            {/* The UTR-paste step — shown after a launch (or a no-app / launch-error, so an out-of-band payer
                can still attest). The server recomputes tr; the client just supplies the UTR it was given. */}
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
                {!coachGuidanceShowing ? (
                  <CallHelplineCTA label={t('upi_intent.get_help', undefined, NS)} />
                ) : null}

                {/* A member who launched but RETURNED WITHOUT A UTR or pasted an INVALID one is not stranded —
                    the coach lets them say what happened (AC1). Not rendered for the no-app / launch-error
                    paths, which already show the coach above. */}
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
        )}
      </YStack>
    </ScrollView>
  )
}
