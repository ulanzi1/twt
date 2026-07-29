// Helpdesk inbox — the member's own support requests (Story 10.2, Task 7; AC3/AC4).
//
// Lists the member's OWN tickets (newest-first) with a dignified status label + expected-reply line.
// Empty / loading / error render as their OWN branch OUTSIDE the FlatList so the list mounts ONLY
// when populated (the Fabric empty->populated remount crash guard,
// [[project_fabric_flatlist_empty_populated_crash]]). "Ask for help" routes to the filing form.

import { useCallback, type ComponentType } from 'react'
import { FlatList, RefreshControl } from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { Button, Text, XStack, YStack } from 'tamagui'

import { useSession } from '../../lib/session-context'
import { useHelpdeskT } from '../../lib/helpdesk-i18n'
import { useHelpdeskInboxQuery } from '../../components/helpdesk/useHelpdeskQueries'

interface TicketRow {
  ticket_id: string
  category: string
  subject: string
  current_state: string
  routed_to_role: string
  sla_first_response_due: string
  created_at: string
}

function StatusPill({ state }: { state: string }): React.ReactElement {
  const t = useHelpdeskT()
  return (
    <XStack bg="$backgroundPress" px="$2" py="$1" rounded="$3" self="flex-start">
      <Text fontSize="$1" color="$colorPress">
        {t(`status.${state}`)}
      </Text>
    </XStack>
  )
}

function InboxRow({ row, onPress }: { row: TicketRow; onPress: () => void }): React.ReactElement {
  const t = useHelpdeskT()
  const categoryLabel = t(`category.${row.category}.label`)
  return (
    <Button
      unstyled
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${row.subject}. ${t(`status.${row.current_state}`)}`}
      px="$5"
      py="$4"
      borderBottomWidth={1}
      borderBottomColor="$borderColor"
    >
      <YStack gap="$1.5" width="100%">
        <Text fontSize="$2" color="$colorPress">
          {categoryLabel}
        </Text>
        <Text fontSize="$4" fontWeight="500" color="$color" numberOfLines={1}>
          {row.subject}
        </Text>
        <XStack items="center" justify="space-between">
          <StatusPill state={row.current_state} />
          <Text fontSize="$1" color="$colorPress">
            {t('inbox.filed_on', { date: new Date(row.created_at).toLocaleDateString() })}
          </Text>
        </XStack>
      </YStack>
    </Button>
  )
}

export default function HelpdeskInboxScreen(): React.ReactElement {
  const t = useHelpdeskT()
  const router = useRouter()
  const { session } = useSession()
  const pariwarId = session?.pariwarId
  const { data, isLoading, isError, isFetching, refetch } = useHelpdeskInboxQuery(pariwarId)

  const tickets = (data?.tickets ?? []) as TicketRow[]

  const renderItem = useCallback(
    ({ item }: { item: TicketRow }) => (
      <InboxRow row={item} onPress={() => router.push(`/(helpdesk)/${item.ticket_id}`)} />
    ),
    [router],
  )
  const keyExtractor = useCallback((item: TicketRow) => item.ticket_id, [])

  // React 19 + RN new-arch FlatList prop-typing wrinkle — widen props (the YogdaanBahi precedent).
  const FlatListAny = FlatList as unknown as ComponentType<Record<string, unknown>>

  const header = (
    <YStack px="$5" pt="$6" pb="$4" gap="$2">
      <Text fontSize="$7" fontWeight="600" color="$color">
        {t('inbox.title')}
      </Text>
      <Text fontSize="$3" color="$colorPress">
        {t('inbox.intro')}
      </Text>
      <Button
        mt="$3"
        theme="accent"
        onPress={() => router.push('/(helpdesk)/new')}
        accessibilityRole="button"
        accessibilityLabel={t('inbox.new_ticket')}
      >
        {t('inbox.new_ticket')}
      </Button>
    </YStack>
  )

  // Empty / loading / error branch — rendered OUTSIDE the FlatList (Fabric remount-crash guard).
  if (tickets.length === 0) {
    return (
      <YStack flex={1} bg="$background">
        <Stack.Screen options={{ headerShown: false }} />
        {header}
        <YStack flex={1} items="center" justify="center" px="$6" gap="$3">
          <Text
            fontSize="$4"
            color="$colorPress"
            text="center"
            accessibilityRole="text"
            accessibilityLabel={
              isLoading ? t('inbox.loading_a11y') : isError ? t('inbox.error_title') : t('inbox.empty_title')
            }
          >
            {isLoading ? t('inbox.loading_a11y') : isError ? t('inbox.error_body') : t('inbox.empty_body')}
          </Text>
          {isError && (
            <Button size="$3" onPress={() => void refetch()} accessibilityRole="button">
              {t('inbox.retry')}
            </Button>
          )}
        </YStack>
      </YStack>
    )
  }

  return (
    <YStack flex={1} bg="$background">
      <Stack.Screen options={{ headerShown: false }} />
      <FlatListAny
        data={tickets}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={header}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={() => void refetch()} />}
      />
    </YStack>
  )
}
