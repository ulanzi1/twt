// The dignified "could not be opened" state of the neighbours' screens (Story 6.27a PM11) — ⛔ never a hard error. ONE
// state for every 404 (⛔ yours / unknown / another Pariwar / ⛔ texted — the server answers them alike) and reused by
// 6.27c for a link code that does not resolve. Also the "no longer open" thank-you (PM8 — ⛔ never why). With the shared
// helpline CTA and a way home.

import { useRouter } from 'expo-router'
import { Button, Paragraph, YStack } from 'tamagui'

import { useClaimT } from '../../lib/claim-i18n'
import { CallHelplineCTA } from '../common/CallHelplineCTA'
import { useAnnounceOnChange } from './announce'

export function PeerRequestNotOpenable({ messageKey }: { readonly messageKey: 'peer_request.not_openable' | 'peer_request.no_longer_open' }): React.ReactElement {
  const t = useClaimT()
  const router = useRouter()
  // SPOKEN when it replaces the questions mid-flow (a refused save) — ⛔ a silent swap (second-pass review S29).
  useAnnounceOnChange(t(messageKey))
  return (
    <YStack flex={1} p="$4" gap="$4" justify="center">
      <Paragraph size="$5" accessibilityRole="text">
        {t(messageKey)}
      </Paragraph>
      <CallHelplineCTA />
      <Button onPress={() => router.replace('/(tabs)')} accessibilityRole="button">
        {t('peer_request.done')}
      </Button>
    </YStack>
  )
}
