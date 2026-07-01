// Life Events — medical disclosure update (Story 3.9, Task 8; AC1/AC2/AC4). STEP-UP gated
// ('medical_change'). Reuses the shared MedicalForm (extracted from the signup step) + re-runs the
// 3.5 submit service via lifeEventsUpdateMedical (append-only history — Epic 4 walks the full
// history). A grief-paced flow — save-and-resume (UX-DR50) persists the selection; the step-up OTP
// loop (403 auth.step_up_required → request → verify → retry) is driven by useStepUpGate. On success
// the panel + medical queries are invalidated.

import { useEffect, useState } from 'react'
import { ScrollView } from 'react-native'

import { useT } from '@twt/i18n/react'
import { useQueryClient } from '@tanstack/react-query'
import { Stack, useRouter } from 'expo-router'
import { Button, Input, Spinner, Text, YStack } from 'tamagui'

import type { MedicalDiscloseRequest } from '@twt/contracts'

import { memberAuth } from '../../lib/member-api'
import {
  MedicalForm,
  type MedicalSubmitPayload,
} from '../../components/life-events/MedicalForm'
import { SaveAndResumeAffordance } from '../../components/life-events/SaveAndResumeAffordance'
import { clearDraft, loadDraft, saveDraft } from '../../components/life-events/draft-store'
import { useStepUpGate } from '../../components/life-events/useStepUpGate'
import { useSession } from '../../lib/session-context'

const DRAFT_KEY = 'medical'

interface MedicalDraft {
  selected: string[]
  additionalContext: string
}

export default function LifeEventsMedicalScreen() {
  const t = useT()
  const router = useRouter()
  const queryClient = useQueryClient()
  const stepUp = useStepUpGate('medical_change')
  const { session } = useSession()
  const memberId = session?.memberId ?? ''

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<MedicalDiscloseRequest | null>(null)
  const [restored, setRestored] = useState<MedicalDraft | null>(null)
  const [resumeAvailable, setResumeAvailable] = useState(false)

  useEffect(() => {
    const draft = loadDraft<MedicalDraft>(memberId, DRAFT_KEY)
    if (draft && (draft.selected.length > 0 || draft.additionalContext.trim())) {
      setResumeAvailable(true)
    }
  }, [memberId])

  async function invalidateAndLeave(): Promise<void> {
    clearDraft(memberId, DRAFT_KEY)
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['member', 'medical'] }),
      queryClient.invalidateQueries({ queryKey: ['member', 'life-events'] }),
    ])
    router.back()
  }

  async function onSubmit(payload: MedicalSubmitPayload): Promise<void> {
    // The form guarantees the ack was checked before calling onSubmit; stamp acknowledged:true for
    // the wire contract (the server re-enforces it).
    const req: MedicalDiscloseRequest = {
      conditionCodes: payload.conditionCodes,
      ...(payload.additionalContext ? { additionalContext: payload.additionalContext } : {}),
      imaListVersion: payload.imaListVersion,
      acknowledged: true,
      ackLocale: payload.ackLocale,
    }
    setBusy(true)
    setError(null)
    setPending(req)
    try {
      const result = await stepUp.guard(() => memberAuth.lifeEventsUpdateMedical(req))
      if (result !== undefined) await invalidateAndLeave()
    } catch {
      setError(t('lifeEvents.error_generic'))
    } finally {
      setBusy(false)
    }
  }

  async function onVerifyOtp(): Promise<void> {
    if (!pending) return
    setBusy(true)
    setError(null)
    try {
      await stepUp.verifyAndRetry(() => memberAuth.lifeEventsUpdateMedical(pending))
      await invalidateAndLeave()
    } catch {
      setError(t('lifeEvents.error_generic'))
    } finally {
      setBusy(false)
    }
  }

  function onContinueDraft(): void {
    setRestored(loadDraft<MedicalDraft>(memberId, DRAFT_KEY))
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

  return (
    <>
      <Stack.Screen options={{ title: t('lifeEvents.medical_label') }} />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {resumeAvailable ? (
          <YStack px="$6" pt="$6">
            <SaveAndResumeAffordance onContinue={onContinueDraft} onStartFresh={onStartFresh} />
          </YStack>
        ) : null}
        <MedicalForm
          key={restored ? 'restored' : 'fresh'}
          title={t('lifeEvents.medical_label')}
          submitLabel={t('medical.submit')}
          busy={busy}
          error={error}
          onSubmit={onSubmit}
          initialSelected={restored?.selected}
          initialContext={restored?.additionalContext}
          onDraftChange={(draft) => saveDraft<MedicalDraft>(memberId, DRAFT_KEY, draft)}
          onEdit={() => setError(null)}
          footer={stepUpFooter}
        />
      </ScrollView>
    </>
  )
}
