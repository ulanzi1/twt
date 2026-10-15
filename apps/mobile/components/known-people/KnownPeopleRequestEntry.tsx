// "Someone has named you" — the home card AND the Panchayat notice-strip item (Story 6.36b, Task 4; AC6; 6.36a SW14).
//
// ⚠ RENDERS NOTHING unless at least one request naming the member is OPEN (`asked`, within its 30 days) — and only for an
// `active` member: the server answers every other member with ONE 403, which the query keeps AS DATA (a denied page —
// sticky until the next success, `fetchKnownPeopleRequestsPage`) ⇒ `null`. ⭐ That DENIAL is checked
// (`requestEntryVisible`): TanStack keeps the previous pages when a refetch fails, so reading the open requests alone kept
// showing a member who had left `active` their old one (review 2026-10-15 R4; fix-diff review E1).
// ⛔ No SMS, ⛔ no push, ⛔ no WhatsApp — the request is shown in the app ONLY (SW14). `PeerRequestEntry`'s shape: on the
// home beside it, and in the notice strip a DELEGATED sibling in the `'polls'` case (⛔ a banner row — the banner lane stays
// ONE source, Story 11a.5). ⛔ No call before the session has loaded (the query is disabled until it has).

import { useRouter } from 'expo-router'
import { Button, Text, YStack } from 'tamagui'

import { requestEntryVisible } from '../../lib/known-people'
import { useKnownPeopleT } from '../../lib/known-people-i18n'
import { errorCodeOf, useKnownPeopleRequestsQuery } from './useKnownPeopleQueries'

export function KnownPeopleRequestEntry(): React.ReactElement | null {
  const t = useKnownPeopleT()
  const router = useRouter()
  const q = useKnownPeopleRequestsQuery()
  const visible = requestEntryVisible({ pages: q.data?.pages, errorCode: errorCodeOf(q.error) })
  if (!visible) return null
  return (
    <Button
      unstyled
      onPress={() => router.push('/(life-events)/known-people')}
      accessibilityRole="button"
      accessibilityLabel={`${t('request.card_title')}. ${t('request.card_body')}`}
      px={16}
      py={12}
    >
      <YStack gap={4} width="100%">
        <Text fontFamily="$body" fontSize="$4" fontWeight="500" color="$color">
          {t('request.card_title')}
        </Text>
        <Text fontFamily="$body" fontSize="$2" color="$colorPress">
          {t('request.card_body')}
        </Text>
      </YStack>
    </Button>
  )
}
