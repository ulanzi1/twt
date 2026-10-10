// The `/peer-request` consumer slot — a 6.30 PLACEHOLDER (Story 6.30, `2026-10-10-312` AL16; N17).
//
// Until Story 6.27a fills it, the slot shows ONE bilingual line and the helpline: ⛔ no API call, ⛔ no
// data, ⛔ nothing about anyone — whatever `code` is. This component is a 6.30 implementation detail:
// 6.27a may replace or remove it (⛔ no seam is defined here). The Hindi is agent-authored; a person
// reviews it before go-live (roster Row 28, via Row 29 (h)).

import { useT } from '@twt/i18n/react'
import { Stack } from 'expo-router'
import { Paragraph, YStack } from 'tamagui'

import { CallHelplineCTA } from '../common/CallHelplineCTA'

export interface PeerRequestSlotProps {
  /** The parsed link code, or `null` (missing / malformed / repeated). 6.27c wires it to the resolver. */
  readonly code: string | null
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- the placeholder ignores `code` until 6.27a / 6.27c fill the slot.
export function PeerRequestSlot(_props: PeerRequestSlotProps): React.ReactElement {
  const t = useT()
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <YStack flex={1} p="$4" gap="$4" justify="center">
        <Paragraph size="$5">{t('peer_request.placeholder')}</Paragraph>
        <CallHelplineCTA />
      </YStack>
    </>
  )
}
