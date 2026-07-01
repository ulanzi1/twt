// Life Events — address update (Story 3.9, Task 8; AC1/AC3). NO step-up. A simple form: the member
// types a new address; on submit the SDK posts to /member/life-events/address → append-only Tier-1
// write + member.address_updated. The prior address is preserved as history (nothing is lost). On
// success the panel summary is invalidated and the member is returned to the panel.
//
// Save-and-resume is NOT offered for the address form: the server classifies address_line as Tier-1
// PII (envelope-encrypted); storing the raw string client-side would undermine that posture. Members
// re-enter their address if they leave mid-flow (review D1). Dignified validation (UX-DR55 Pattern 4)
// — a calm prompt, never aggressive. Bilingual via @twt/i18n; accessible.

import { useState } from 'react'
import { ScrollView } from 'react-native'

import { useLocale, useT } from '@twt/i18n/react'
import { useQueryClient } from '@tanstack/react-query'
import { Stack, useRouter } from 'expo-router'
import { Button, H2, Input, Paragraph, Spinner, Text, YStack } from 'tamagui'

import { memberAuth } from '../../lib/member-api'

export default function AddressScreen() {
  const t = useT()
  const { locale } = useLocale()
  const router = useRouter()
  const queryClient = useQueryClient()

  const [addressLine, setAddressLine] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function onChange(v: string): void {
    setError(null)
    setAddressLine(v)
  }

  async function onSubmit(): Promise<void> {
    if (!addressLine.trim()) {
      setError(t('lifeEvents.address_required'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      await memberAuth.lifeEventsUpdateAddress({ addressLine: addressLine.trim(), locale })
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
      <Stack.Screen options={{ title: t('lifeEvents.address_label') }} />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <YStack gap="$4" px="$6" py="$6" bg="$background">
          <H2 accessibilityRole="header">{t('lifeEvents.address_title')}</H2>

          <Text accessibilityRole="text">{t('lifeEvents.address_field_label')}</Text>
          <Input
            value={addressLine}
            onChangeText={onChange}
            multiline
            height={88}
            maxLength={500}
            accessibilityLabel={t('lifeEvents.address_field_label')}
            accessibilityHint={t('lifeEvents.address_field_help')}
          />
          <Paragraph color="$colorPress" fontSize="$2" accessibilityRole="text">
            {t('lifeEvents.address_field_help')}
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
            accessibilityLabel={t('lifeEvents.address_submit')}
            accessibilityState={{ disabled: busy }}
            onPress={onSubmit}
          >
            {busy ? <Spinner /> : t('lifeEvents.address_submit')}
          </Button>
        </YStack>
      </ScrollView>
    </>
  )
}
