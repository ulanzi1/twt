// Life Events — nominee update (Story 3.9, Task 8; AC1/AC2/AC4). STEP-UP gated ('nominee_change').
// Reuses the shared NomineeForm (extracted from the signup step) + re-runs the 3.4 declare service
// via lifeEventsUpdateNominees. A grief-paced flow (nominee changes after a death) — save-and-resume
// (UX-DR50) persists the in-progress form; the step-up OTP loop (403 auth.step_up_required → request
// → verify → retry) is driven by useStepUpGate. On success the panel + nominee queries are invalidated.

import { useEffect, useState } from 'react'
import { ScrollView } from 'react-native'

import { ApiError } from '@twt/api-client'
import { useT } from '@twt/i18n/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Stack, useRouter } from 'expo-router'
import { Button, H2, Input, Paragraph, Spinner, Text, YStack } from 'tamagui'

import { memberAuth } from '../../lib/member-api'
import {
  NomineeForm,
  type NomineeFormEntry,
  type NomineeSubmitEntry,
} from '../../components/life-events/NomineeForm'
import { SaveAndResumeAffordance } from '../../components/life-events/SaveAndResumeAffordance'
import { clearDraft, loadDraft, saveDraft } from '../../components/life-events/draft-store'
import { useStepUpGate } from '../../components/life-events/useStepUpGate'
import { useSession } from '../../lib/session-context'

const DRAFT_KEY = 'nominees'

export default function LifeEventsNomineesScreen() {
  const t = useT()
  const router = useRouter()
  const queryClient = useQueryClient()
  const stepUp = useStepUpGate('nominee_change')
  const { session } = useSession()
  const memberId = session?.memberId ?? ''

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<NomineeSubmitEntry[] | null>(null)
  const [initialForms, setInitialForms] = useState<NomineeFormEntry[] | undefined>(undefined)
  const [resumeAvailable, setResumeAvailable] = useState(false)
  // Story 6.20 (AC2, AC8) — the declaration LOCKS at the first claim. The status read says so up front;
  // a 409 `nominee.locked_claim_filed` on submit (a claim filed while the screen was open) says so too.
  const status = useQuery({ queryKey: ['member', 'nominees'], queryFn: () => memberAuth.nomineesStatus() })
  const [lockedBySubmit, setLockedBySubmit] = useState(false)
  const locked = lockedBySubmit || status.data?.locked === true

  /** A claim was filed while the screen was open — lock, and drop the now-unsendable draft. */
  function lockOnSubmit(): void {
    clearDraft(memberId, DRAFT_KEY)
    setLockedBySubmit(true)
  }

  useEffect(() => {
    const draft = loadDraft<NomineeFormEntry[]>(memberId, DRAFT_KEY)
    if (draft && draft.length > 0 && draft.some((f) => f.name.trim())) setResumeAvailable(true)
  }, [memberId])

  async function invalidateAndLeave(): Promise<void> {
    clearDraft(memberId, DRAFT_KEY)
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['member', 'nominees'] }),
      queryClient.invalidateQueries({ queryKey: ['member', 'life-events'] }),
    ])
    router.back()
  }

  async function onSubmit(nominees: NomineeSubmitEntry[]): Promise<void> {
    setBusy(true)
    setError(null)
    setPending(nominees)
    try {
      const result = await stepUp.guard(() => memberAuth.lifeEventsUpdateNominees({ nominees }))
      // undefined ⇒ step-up was requested; the OTP input is now shown (do NOT leave yet).
      if (result !== undefined) await invalidateAndLeave()
    } catch (err) {
      if (err instanceof ApiError && err.code === 'nominee.locked_claim_filed') lockOnSubmit()
      else setError(t('lifeEvents.error_generic'))
    } finally {
      setBusy(false)
    }
  }

  async function onVerifyOtp(): Promise<void> {
    if (!pending) return
    setBusy(true)
    setError(null)
    try {
      await stepUp.verifyAndRetry(() => memberAuth.lifeEventsUpdateNominees({ nominees: pending }))
      await invalidateAndLeave()
    } catch (err) {
      if (err instanceof ApiError && err.code === 'nominee.locked_claim_filed') lockOnSubmit()
      else setError(t('lifeEvents.error_generic'))
    } finally {
      setBusy(false)
    }
  }

  function onContinueDraft(): void {
    const draft = loadDraft<NomineeFormEntry[]>(memberId, DRAFT_KEY)
    if (draft) setInitialForms(draft)
    setResumeAvailable(false)
  }

  function onStartFresh(): void {
    clearDraft(memberId, DRAFT_KEY)
    setResumeAvailable(false)
  }

  const stepUpFooter = stepUp.needsOtp ? (
    <YStack gap="$3">
      <Text accessibilityRole="text" accessibilityLiveRegion="polite">
        {t('lifeEvents.step_up_required')}
      </Text>
      <Input
        value={stepUp.otp}
        onChangeText={stepUp.setOtp}
        keyboardType="number-pad"
        maxLength={6}
        height={48}
        accessibilityLabel={t('lifeEvents.step_up_required')}
        accessibilityHint={t('lifeEvents.step_up_hint')}
      />
      <Button
        theme="accent"
        height={56}
        disabled={busy || !stepUp.otp.trim()}
        accessibilityRole="button"
        accessibilityLabel={t('auth.verify')}
        onPress={onVerifyOtp}
      >
        {busy ? <Spinner /> : t('auth.verify')}
      </Button>
      <Button
        chromeless
        height={40}
        accessibilityRole="button"
        accessibilityLabel={t('lifeEvents.step_up_cancel')}
        onPress={stepUp.reset}
      >
        {t('lifeEvents.step_up_cancel')}
      </Button>
    </YStack>
  ) : null

  // ⭐ Until the status read answers, ⛔ no editable form (code review 2026-09-24): it used to flash the
  // form — the very "form that 409s on submit" the locked state exists to avoid.
  if (status.isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: t('lifeEvents.nominees_label') }} />
        <YStack flex={1} items="center" justify="center" bg="$background" testID="nominees-status-loading">
          <Spinner accessibilityLabel={t('lifeEvents.nominees_label')} />
        </YStack>
      </>
    )
  }

  if (locked) {
    // ⭐ The LOCKED state — what happened, what the member can do, and the helpline (the three-part
    // grammar). ⛔ Never a form that 409s on submit. Announced when it appears.
    return (
      <>
        <Stack.Screen options={{ title: t('lifeEvents.nominees_label') }} />
        {/* ⛔ NOT `accessible={true}` (family 13(a), code review 2026-09-24): a grouped container is ONE
            element to a screen reader, which swallowed the correction Button — the screen's only action. */}
        <YStack gap="$4" px="$6" py="$6" bg="$background" testID="nominees-locked">
          <H2 accessibilityRole="header">{t('nominees.locked_title')}</H2>
          <Paragraph accessibilityRole="text" accessibilityLiveRegion="polite">
            {t('nominees.locked_body')}
          </Paragraph>
          <Button
            theme="accent"
            height={56}
            accessibilityRole="button"
            accessibilityLabel={t('nominees.locked_correction_cta')}
            onPress={() => router.push('/(life-events)/nominee-correction')}
          >
            {t('nominees.locked_correction_cta')}
          </Button>
        </YStack>
      </>
    )
  }

  return (
    <>
      <Stack.Screen options={{ title: t('lifeEvents.nominees_label') }} />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {/* ⭐ A failed status read is SAID, ⛔ not swallowed. The form stays usable — a submit after a claim
            was filed is still refused and turns into the locked state. */}
        {status.isError ? (
          <YStack px="$6" pt="$6" gap="$2" testID="nominees-status-error">
            <Text accessibilityRole="alert" accessibilityLiveRegion="polite">
              {t('lifeEvents.error_generic')}
            </Text>
            <Button
              chromeless
              height={40}
              accessibilityRole="button"
              accessibilityLabel={t('medical.retry')}
              onPress={() => void status.refetch()}
            >
              {t('medical.retry')}
            </Button>
          </YStack>
        ) : null}
        {resumeAvailable ? (
          <YStack px="$6" pt="$6">
            <SaveAndResumeAffordance onContinue={onContinueDraft} onStartFresh={onStartFresh} />
          </YStack>
        ) : null}
        <NomineeForm
          key={initialForms ? 'restored' : 'fresh'}
          title={t('lifeEvents.nominees_label')}
          intro={t('nominees.intro')}
          submitLabel={t('nominees.submit')}
          busy={busy}
          error={error}
          onSubmit={onSubmit}
          initialForms={initialForms}
          onFormsChange={(forms) => saveDraft(memberId, DRAFT_KEY, forms)}
          onEdit={() => setError(null)}
          footer={stepUpFooter}
        />
      </ScrollView>
    </>
  )
}
