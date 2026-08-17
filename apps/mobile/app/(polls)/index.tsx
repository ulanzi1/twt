// Polls list — the member's open, in-audience surveys (Story 10.15, Task 9; AC6).
//
// Lists the polls this member may answer, each flagged with whether THEY have already answered.
// ⭐ Answered polls stay in the list rather than disappearing: a member who answered yesterday must
// see that they did, not an empty screen that reads as "nothing was ever asked".
//
// Empty / loading / error render as their OWN branch OUTSIDE the FlatList so the list mounts ONLY
// when populated (the Fabric empty→populated remount crash guard,
// [[project_fabric_flatlist_empty_populated_crash]]).
//
// ⚠ Nothing on this surface shows a threshold, a tally, or how anyone else answered — the member DTO
// carries none of it, deliberately (LBD-1): a target count invites the member to read a poll as a
// vote that passes or fails, which is precisely what a poll is not.

import { useCallback, type ComponentType } from 'react'
import { FlatList, RefreshControl } from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { Button, Text, XStack, YStack } from 'tamagui'

import type { MemberSurveyResponse } from '@twt/contracts'

import { useSession } from '../../lib/session-context'
import { usePollT } from '../../lib/poll-i18n'
import { useLocale } from '@twt/i18n/react'
import { selectSurveyCopy } from '../../components/polls/copy'
import { usePollsQuery } from '../../components/polls/usePollQueries'

function PollRow({
  survey,
  locale,
  onPress,
}: {
  survey: MemberSurveyResponse
  locale: string
  onPress: () => void
}): React.ReactElement {
  const t = usePollT()
  // The poll's OWN copy is authored content — Hindi-first, with a fallback to the other language
  // rather than a blank line.
  const { title, body } = selectSurveyCopy(survey, locale)
  return (
    <Button
      unstyled
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={survey.answered ? `${title}. ${t('answered_badge')}` : title}
      px="$5"
      py="$4"
      borderBottomWidth={1}
      borderBottomColor="$borderColor"
    >
      <YStack gap="$1.5" width="100%">
        <Text fontSize="$4" fontWeight="500" color="$color" numberOfLines={2}>
          {title}
        </Text>
        {body !== '' && (
          <Text fontSize="$2" color="$colorPress" numberOfLines={2}>
            {body}
          </Text>
        )}
        <XStack items="center" justify="space-between">
          {survey.answered ? (
            <XStack bg="$backgroundPress" px="$2" py="$1" rounded="$3" self="flex-start">
              <Text fontSize="$1" color="$colorPress">
                {t('answered_badge')}
              </Text>
            </XStack>
          ) : (
            <Text fontSize="$1" color="$colorPress">
              {t('open_survey')}
            </Text>
          )}
          <Text fontSize="$1" color="$colorPress">
            {t('closes_on')}: {new Date(survey.valid_until).toLocaleDateString()}
          </Text>
        </XStack>
      </YStack>
    </Button>
  )
}

export default function PollsListScreen(): React.ReactElement {
  const t = usePollT()
  const router = useRouter()
  const { locale } = useLocale()
  const { session } = useSession()
  const pariwarId = session?.pariwarId
  const { data, isLoading, isError, isFetching, refetch } = usePollsQuery(pariwarId)

  const polls = data?.items ?? []

  const renderItem = useCallback(
    ({ item }: { item: MemberSurveyResponse }) => (
      <PollRow survey={item} locale={locale} onPress={() => router.push(`/(polls)/${item.survey_id}`)} />
    ),
    [router, locale],
  )
  const keyExtractor = useCallback((item: MemberSurveyResponse) => item.survey_id, [])

  // React 19 + RN new-arch FlatList prop-typing wrinkle — widen props (the helpdesk precedent).
  const FlatListAny = FlatList as unknown as ComponentType<Record<string, unknown>>

  const header = (
    <YStack px="$5" pt="$6" pb="$4" gap="$2">
      <Text fontSize="$7" fontWeight="600" color="$color">
        {t('title')}
      </Text>
      {/* ⭐ LBD-1, in the member's own words. A poll informs; it does not decide. */}
      <Text fontSize="$3" color="$colorPress">
        {t('advisory_notice')}
      </Text>
    </YStack>
  )

  // Empty / loading / error branch — rendered OUTSIDE the FlatList (Fabric remount-crash guard).
  if (polls.length === 0) {
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
            accessibilityLabel={isLoading ? t('loading') : isError ? t('list_error') : t('list_empty')}
          >
            {isLoading ? t('loading') : isError ? t('list_error') : t('list_empty')}
          </Text>
          {isError && (
            <Button size="$3" onPress={() => void refetch()} accessibilityRole="button">
              {t('back')}
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
        data={polls}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={header}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={() => void refetch()} />}
      />
    </YStack>
  )
}
