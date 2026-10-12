// The session member's OPEN requests (Story 6.27a PM11) — at most five, so a plain stack (⛔ a FlatList); loading, error
// and empty are rendered as whole states (⛔ inside any list — [[project_fabric_flatlist_empty_populated_crash]]).
// ⛔ No claim, ⛔ no family, ⛔ no amount — the member's NAME and the IST date asked only.

import { Button, Paragraph, Text, YStack } from 'tamagui'

import { useClaimT } from '../../lib/claim-i18n'
import { CallHelplineCTA } from '../common/CallHelplineCTA'
import { usePeerRequestsQuery } from './usePeerRequestQueries'

export function PeerRequestList({ pariwarId, onOpen }: { readonly pariwarId: string; readonly onOpen: (pingId: string) => void }): React.ReactElement {
  const t = useClaimT()
  const { data, isLoading, isError, refetch } = usePeerRequestsQuery(pariwarId)

  if (isLoading) return <Paragraph p="$4">{t('peer_request.loading')}</Paragraph>
  if (isError || !data) {
    return (
      <YStack p="$4" gap="$3">
        <Paragraph>{t('peer_request.load_error')}</Paragraph>
        <Button onPress={() => void refetch()} accessibilityRole="button">
          {t('peer_request.try_again')}
        </Button>
        <CallHelplineCTA />
      </YStack>
    )
  }
  if (data.items.length === 0) {
    return (
      <YStack p="$4" gap="$3">
        <Paragraph>{t('peer_request.list_empty')}</Paragraph>
        <CallHelplineCTA />
      </YStack>
    )
  }
  return (
    <YStack p="$4" gap="$3">
      <Text fontSize="$6" fontWeight="600" accessibilityRole="header">
        {t('peer_request.title')}
      </Text>
      {data.items.map((item) => (
        <Button key={item.pingId} onPress={() => onOpen(item.pingId)} accessibilityRole="button" height="auto" py="$3">
          <YStack gap={2} width="100%">
            <Text fontSize="$4">
              {item.memberName === '' ? t('peer_request.list_item_unnamed') : t('peer_request.list_item', { member: item.memberName })}
            </Text>
            {item.askedOn !== '' && (
              <Text fontSize="$2" color="$colorPress">
                {t('peer_request.asked_on', { date: item.askedOn.split('-').reverse().join('-') })}
              </Text>
            )}
          </YStack>
        </Button>
      ))}
      <CallHelplineCTA />
    </YStack>
  )
}
