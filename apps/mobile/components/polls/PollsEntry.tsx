// The Panchayat-tab entry point into the polls surface — Story 10.15 (Task 9; AC6).
//
// ⛔ A 4th bottom tab was NOT added: the tab bar is at three and the UX spec does not add one. Polls
// enter from the Panchayat noticeboard, which is where a member already goes for "what the Pariwar is
// saying" — and the entry is an ADDITION to that noticeboard, never a restructuring of it.
//
// ⚠ RENDERS NOTHING when there is nothing to answer. A permanently visible "0 polls" row would be
// noise on a screen whose whole design is a quiet noticeboard, and it would train members to ignore
// the one place a real question appears.
//
// The count is of OPEN, IN-AUDIENCE polls — including ones the member has already answered, which is
// consistent with the list itself (a member who answered must still see that the question was asked).

import { useRouter } from 'expo-router'
import { Button, Text, XStack, YStack } from 'tamagui'

import { useSession } from '../../lib/session-context'
import { usePollT } from '../../lib/poll-i18n'
import { usePollsQuery } from './usePollQueries'

export function PollsEntry(): React.ReactElement | null {
  const t = usePollT()
  const router = useRouter()
  const { session } = useSession()
  const { data } = usePollsQuery(session?.pariwarId)

  const polls = data?.items ?? []
  // Nothing to answer and nothing answered → render nothing at all (see the header).
  if (polls.length === 0) return null

  const unanswered = polls.filter((p) => !p.answered).length

  return (
    <Button
      unstyled
      onPress={() => router.push('/(polls)')}
      accessibilityRole="button"
      accessibilityLabel={t('title')}
      px={16}
      py={12}
    >
      <YStack gap={4} width="100%">
        <XStack items="center" justify="space-between">
          <Text fontFamily="$body" fontSize="$4" fontWeight="500" color="$color">
            {t('title')}
          </Text>
          <Text fontFamily="$tabular" fontSize="$3" color="$colorPress">
            {unanswered > 0 ? unanswered : polls.length}
          </Text>
        </XStack>
        {/* ⭐ LBD-1 reaches the member here too, at the first place they see polls exist. */}
        <Text fontFamily="$body" fontSize="$2" color="$colorPress">
          {t('advisory_notice')}
        </Text>
      </YStack>
    </Button>
  )
}
