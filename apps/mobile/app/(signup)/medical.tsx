// Signup medical-disclosure step — disclose IMA-listed illnesses + the mandatory concealment-denial
// acknowledgment (Story 3.5, Task 8; AC1, AC2, AC5). Story 3.9 extracted the catalog-loading form
// body into the shared components/life-events/MedicalForm (reused by the Life Events medical UPDATE
// screen) — this screen owns only the signup submit semantics (medicalDisclose → member.medical_disclosed)
// + the "next wizard step" navigation. NO step-up at signup (R3).
//
// Bilingual (Hindi-default) + accessible; mobile build/test are repo no-ops → verified by typecheck + lint.

import { useState } from 'react'

import { useT } from '@twt/i18n/react'
import { useRouter } from 'expo-router'
import { Button, H2, YStack } from 'tamagui'

import { memberAuth } from '../../lib/member-api'
import { MedicalForm, type MedicalSubmitPayload } from '../../components/life-events/MedicalForm'

export default function MedicalScreen() {
  const t = useT()
  const router = useRouter()

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function onSubmit(payload: MedicalSubmitPayload): Promise<void> {
    setBusy(true)
    setError(null)
    try {
      await memberAuth.medicalDisclose({
        conditionCodes: payload.conditionCodes,
        ...(payload.additionalContext ? { additionalContext: payload.additionalContext } : {}),
        imaListVersion: payload.imaListVersion,
        acknowledged: true,
        ackLocale: payload.ackLocale,
      })
      setDone(true)
    } catch {
      setError(t('medical.error_generic'))
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <YStack flex={1} justify="center" gap="$4" px="$6" bg="$background">
        <H2>{t('medical.done')}</H2>
        <Button
          theme="accent"
          height={56}
          accessibilityRole="button"
          accessibilityLabel={t('medical.done')}
          onPress={() => router.replace('/(signup)/payment')}
        >
          {t('medical.done')}
        </Button>
      </YStack>
    )
  }

  return (
    <MedicalForm
      title={t('medical.title')}
      submitLabel={t('medical.submit')}
      busy={busy}
      error={error}
      onSubmit={onSubmit}
      onEdit={() => setError(null)}
    />
  )
}
