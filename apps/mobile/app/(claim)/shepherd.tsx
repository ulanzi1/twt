// Point-of-contact re-entry screen (Story 6.12, Task 5; AC3 / R3).
//
// The persistent, re-reachable shepherd view opened from the home-surface <ClaimPointOfContactEntry>
// (R3 — the acknowledgement card alone is a one-shot end-of-wizard terminal; this makes the point-of-
// contact view reachable AFTER filing). Reads the filed `claimCaseId` from the route params and renders
// the SAME <ShepherdContactCard>. Read-only; grief-mode.

import { useLocalSearchParams, useRouter } from 'expo-router'
import { Button, H2, Paragraph, YStack } from 'tamagui'

import { ShepherdContactCard } from '../../components/claim/ShepherdContactCard'
import { useClaimT } from '../../lib/claim-i18n'

export default function ShepherdScreen(): React.ReactElement {
  const t = useClaimT()
  const router = useRouter()
  const params = useLocalSearchParams<{ claimCaseId?: string }>()
  const claimCaseId = typeof params.claimCaseId === 'string' ? params.claimCaseId : undefined

  return (
    <YStack flex={1} p="$4" gap="$4" pt="$6">
      <H2>{t('shepherd.screen_title')}</H2>
      {claimCaseId ? (
        <ShepherdContactCard claimCaseId={claimCaseId} />
      ) : (
        <Paragraph color="$colorPress">{t('shepherd.not_assigned')}</Paragraph>
      )}
      <Button size="$4" chromeless onPress={() => router.replace('/(tabs)')}>
        {t('shepherd.back_home')}
      </Button>
    </YStack>
  )
}
