// The neighbours' requests ENTRY — the home-screen card AND the Panchayat notice-strip item (Story 6.27a PM2 / PM11;
// `2026-10-10-311` PM2: "the member sees it inside the app — the home-screen card AND an item in the app's notice strip").
//
// ⚠ RENDERS NOTHING unless at least one request is OPEN — and a request is open only once the Trust has TEXTED the member
// (the server lists `send_outcome = 'accepted'` only) ⇒ ⭐ DARK until 6.27c texts anyone; ⛔ a named death is never shown
// to a member the Trust has ⛔ not texted. ⛔ No push, ⛔ no WhatsApp, ⛔ no second SMS (PM2).
// ⭐ The notice-strip item follows `<NoticeboardStrip>`'s ONE-SOURCE BANNER-LANE rule (Story 11a.5): it is ⛔ never a
// banner row and ⛔ never widens the presenter's `bannerNotice` — it is a DELEGATED addition beside `<PollsEntry>`, which
// owns its own render-nothing-when-empty behaviour, exactly as Story 10.15's entry does.
// ⛔ No call before the session has loaded (the query is disabled until `pariwarId` is a string).

import { useRouter } from 'expo-router'
import { Button, Text, YStack } from 'tamagui'

import { useClaimT } from '../../lib/claim-i18n'
import { useSession } from '../../lib/session-context'
import { usePeerRequestsQuery } from './usePeerRequestQueries'

export function PeerRequestEntry(): React.ReactElement | null {
  const t = useClaimT()
  const router = useRouter()
  const { session, isLoading } = useSession()
  const { data } = usePeerRequestsQuery(isLoading ? undefined : session?.pariwarId)
  if (!data || data.items.length === 0) return null
  return (
    <Button
      unstyled
      onPress={() => router.push('/peer-request')}
      accessibilityRole="button"
      accessibilityLabel={t('peer_request.card_title')}
      px={16}
      py={12}
    >
      <YStack gap={4} width="100%">
        <Text fontFamily="$body" fontSize="$4" fontWeight="500" color="$color">
          {t('peer_request.card_title')}
        </Text>
        <Text fontFamily="$body" fontSize="$2" color="$colorPress">
          {t('peer_request.card_body')}
        </Text>
      </YStack>
    </Button>
  )
}
