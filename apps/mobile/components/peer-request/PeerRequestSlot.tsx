// The `/peer-request` consumer slot — FILLED by Story 6.27a (PM11; it replaces 6.30's placeholder, AL16 / N17).
//
// 6.30's shell (`app/(peer-request)/peer-request.tsx`) parses `c` and renders this slot; ⭐ the split, stated once (6.30
// and 6.27 PM11): 6.30 owns the shell, the parse and the login that returns here; 6.27a fills THIS slot — the list, the
// questionnaire (its pages, the save line, the closing note and the Thank-you are IN-SCREEN STATE — ⛔ never a new route
// file), the not-openable state and ⭐ ⛔ NO API CALL BEFORE THE SESSION HAS LOADED (the root guard renders the Stack while
// `isLoading` — `app/_layout.tsx` — so this slot gates on `useSession()` itself); 6.27c wires `code` to the by-link
// resolver (its 404 reuses `PeerRequestNotOpenable`). Until then a present `c` renders the list.
// ⭐ THE HEADER: the group's inner `<Stack />` would show a default header titled with the raw route name, so the slot
// HIDES it and the in-screen pages carry their own Back (a cold-start link has ⛔ nothing behind it).
// ⛔ Never log the code (PM21 (e)).

import { useState } from 'react'
import { Stack } from 'expo-router'
import { Paragraph, YStack } from 'tamagui'

import { useClaimT } from '../../lib/claim-i18n'
import { useSession } from '../../lib/session-context'
import { PeerQuestionnaire } from './PeerQuestionnaire'
import { PeerRequestList } from './PeerRequestList'

export interface PeerRequestSlotProps {
  /** The parsed link code, or `null` (missing / malformed / repeated). 6.27c wires it to the resolver. */
  readonly code: string | null
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- `code` is 6.27c's to wire (the resolver); 6.27a renders the list.
export function PeerRequestSlot(_props: PeerRequestSlotProps): React.ReactElement {
  const t = useClaimT()
  const { session, isLoading } = useSession()
  const [openPingId, setOpenPingId] = useState<string | null>(null)
  const pariwarId = isLoading ? undefined : session?.pariwarId

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <YStack flex={1} bg="$background">
        {pariwarId === undefined ? (
          // ⛔ No API call before the session has loaded (or while the guard sends a signed-out member to login).
          <Paragraph p="$4">{t('peer_request.loading')}</Paragraph>
        ) : openPingId !== null ? (
          <PeerQuestionnaire pariwarId={pariwarId} pingId={openPingId} onBack={() => setOpenPingId(null)} />
        ) : (
          <PeerRequestList pariwarId={pariwarId} onOpen={setOpenPingId} />
        )}
      </YStack>
    </>
  )
}
