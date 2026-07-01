// Life Events — posting / transfer-in-out update (Story 3.9, Task 8; AC1/AC3). NO step-up. The
// member records a new posting district and, optionally, that this change marks their retirement.
// On submit the SDK posts to /member/life-events/posting → append-only write + member.posting_updated.
// Records the district change as a member attribute + event ONLY (no cross-Pariwar tenant move; v1-S).
//
// The "Is this a retirement posting?" toggle (default false) maps to PostingUpdateRequest.isRetirement
// — Epic 4 Story 4.5 reads the retirement anchor from it. Calm register — this is a life-change
// acknowledgment, not a gate (no urgency theater). Bilingual via @twt/i18n; accessible.

import { useState } from 'react'
import { ScrollView } from 'react-native'

import { useT } from '@twt/i18n/react'
import { useQueryClient } from '@tanstack/react-query'
import { Stack, useRouter } from 'expo-router'
import { Button, H2, Input, Paragraph, Spinner, Text, YStack } from 'tamagui'

import { memberAuth } from '../../lib/member-api'

export default function PostingScreen() {
  const t = useT()
  const router = useRouter()
  const queryClient = useQueryClient()

  const [district, setDistrict] = useState('')
  const [isRetirement, setIsRetirement] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(): Promise<void> {
    if (!district.trim()) {
      setError(t('lifeEvents.posting_district_required'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      await memberAuth.lifeEventsUpdatePosting({ district: district.trim(), isRetirement })
      await queryClient.invalidateQueries({ queryKey: ['member', 'life-events'] })
      router.back()
    } catch {
      setError(t('lifeEvents.error_generic'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: t('lifeEvents.posting_label') }} />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <YStack gap="$4" px="$6" py="$6" bg="$background">
          <H2 accessibilityRole="header">{t('lifeEvents.posting_title')}</H2>

          <Text accessibilityRole="text">{t('lifeEvents.posting_district_label')}</Text>
          <Input
            value={district}
            onChangeText={(v) => {
              setError(null)
              setDistrict(v)
            }}
            height={48}
            maxLength={200}
            accessibilityLabel={t('lifeEvents.posting_district_label')}
            accessibilityHint={t('lifeEvents.posting_district_help')}
          />
          <Paragraph color="$colorPress" fontSize="$2" accessibilityRole="text">
            {t('lifeEvents.posting_district_help')}
          </Paragraph>

          {/* Retirement toggle — default false; a calm acknowledgment, not a gate. */}
          <Button
            size="$3"
            theme={isRetirement ? 'accent' : undefined}
            chromeless={!isRetirement}
            justify="flex-start"
            accessibilityRole="checkbox"
            accessibilityLabel={t('lifeEvents.posting_retirement_label')}
            accessibilityHint={t('lifeEvents.posting_retirement_help')}
            accessibilityState={{ checked: isRetirement }}
            onPress={() => setIsRetirement((v) => !v)}
          >
            {(isRetirement ? '☑  ' : '☐  ') + t('lifeEvents.posting_retirement_label')}
          </Button>
          <Paragraph color="$colorPress" fontSize="$2" accessibilityRole="text">
            {t('lifeEvents.posting_retirement_help')}
          </Paragraph>

          {error ? (
            <Text color="#C0392B" accessibilityRole="alert" accessibilityLiveRegion="assertive">
              {error}
            </Text>
          ) : null}

          <Button
            theme="accent"
            height={56}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={t('lifeEvents.posting_submit')}
            accessibilityState={{ disabled: busy }}
            onPress={onSubmit}
          >
            {busy ? <Spinner /> : t('lifeEvents.posting_submit')}
          </Button>
        </YStack>
      </ScrollView>
    </>
  )
}
