// "Someone has named you as their nominee" — the home card AND the Panchayat notice-strip item (Story 6.36e, Task 5; AC5;
// `2026-10-24-397` NE6).
//
// ⚠ RENDERS NOTHING unless at least one mark naming the member is OPEN (⛔ answered) — and only for a member who may answer
// (`active` / `active-in-grace`, ⛔ named by a claim): the server answers anyone else with ONE 403, which the query keeps AS
// DATA ⇒ `null` (`nomineeLinkEntryVisible`). ⛔ SMS, ⛔ push, ⛔ WhatsApp — the request is shown in the app ONLY (NE6).
// `KnownPeopleRequestEntry`'s shape: on the home AFTER it (BEFORE the prompt cards — the My Pool card stays topmost, G14),
// and in the notice strip beside it.

import { useRouter } from 'expo-router'
import { Button, Text, YStack } from 'tamagui'

import { nomineeLinkEntryVisible } from '../../lib/nominee-links'
import { useNomineeLinkT } from '../../lib/nominee-link-i18n'
import { errorCodeOf, useNomineeLinkRequestsQuery } from './useNomineeLinkQueries'

export function NomineeLinkRequestEntry(): React.ReactElement | null {
  const t = useNomineeLinkT()
  const router = useRouter()
  const q = useNomineeLinkRequestsQuery()
  const visible = nomineeLinkEntryVisible({ pages: q.data?.pages, errorCode: errorCodeOf(q.error) })
  if (!visible) return null
  return (
    <Button
      unstyled
      onPress={() => router.push('/(life-events)/nominee-link-requests')}
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
