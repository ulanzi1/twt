// Signup nominee step — declare 1–2 nominees with a fixed 75/25 split (Story 3.4, Task 7;
// AC1–AC3, AC6). Story 3.9 extracted the form body into the shared components/life-events/NomineeForm
// (reused by the Life Events nominee UPDATE screen) — this screen owns only the signup submit
// semantics + the two signup-specific reassurance blocks (no nominee Aadhaar/KYC + no bank/IFSC at
// signup — AC2/AC3) + the "next wizard step" navigation. NO step-up at signup (R3).
//
// Bilingual (Hindi-default) + accessible; mobile build/test are repo no-ops → verified by typecheck + lint.

import { useState } from 'react'

import { useT } from '@twt/i18n/react'
import { useRouter } from 'expo-router'
import { Button, H2, Paragraph, Text, YStack } from 'tamagui'

import { memberAuth } from '../../lib/member-api'
import { NomineeForm, type NomineeSubmitEntry } from '../../components/life-events/NomineeForm'

export default function NomineesScreen() {
  const t = useT()
  const router = useRouter()

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function onSubmit(nominees: NomineeSubmitEntry[]): Promise<void> {
    setBusy(true)
    setError(null)
    try {
      // The 75/25 split is NOT sent — the server derives it from the count (R4).
      await memberAuth.nomineesDeclare({ nominees })
      setDone(true)
    } catch {
      setError(t('nominees.error_generic'))
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <YStack flex={1} justify="center" gap="$4" px="$6" bg="$background">
        <H2>{t('nominees.done')}</H2>
        <Text color="#1E8E3E" accessibilityLiveRegion="polite">
          {t('nominees.done')}
        </Text>
        <Button
          theme="accent"
          height={56}
          accessibilityRole="button"
          accessibilityLabel={t('nominees.done')}
          onPress={() => router.replace('/(signup)/medical')}
        >
          {t('nominees.done')}
        </Button>
      </YStack>
    )
  }

  // AC2 — no nominee KYC at signup; AC3 — no nominee bank at signup. Both announced, above the CTA.
  const reassurance = (
    <>
      <Paragraph color="$colorPress" accessibilityRole="text">
        {t('nominees.no_kyc_reassurance')}
      </Paragraph>
      <Paragraph color="$colorPress" accessibilityRole="text">
        {t('nominees.no_bank_reassurance')}
      </Paragraph>
    </>
  )

  return (
    <NomineeForm
      title={t('nominees.title')}
      intro={t('nominees.intro')}
      submitLabel={t('nominees.submit')}
      busy={busy}
      error={error}
      onSubmit={onSubmit}
      onEdit={() => setError(null)}
      footer={reassurance}
    />
  )
}
