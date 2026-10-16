// The `/peer-request` consumer slot — FILLED by Story 6.27a (PM11; it replaces 6.30's placeholder, AL16 / N17).
//
// 6.30's shell (`app/(peer-request)/peer-request.tsx`) parses `c` and renders this slot; ⭐ the split, stated once (6.30
// and 6.27 PM11): 6.30 owns the shell, the parse and the login that returns here; 6.27a fills THIS slot — the list, the
// questionnaire (its pages, the save line, the closing note and the Thank-you are IN-SCREEN STATE — ⛔ never a new route
// file), the not-openable state and ⭐ ⛔ NO API CALL BEFORE THE SESSION HAS LOADED (the root guard renders the Stack while
// `isLoading` — `app/_layout.tsx` — so this slot gates on `useSession()` itself).
// ⭐ Story 6.27c (AC6; R14) wires `code`: once the session has loaded and a code is present, ONE by-link call — `{ pingId }`
// opens that request's questionnaire (its 409s show the existing "no longer open"); a 404 or a failed call shows
// `PeerRequestNotOpenable` (`not_openable`) with the helpline CTA — ⛔ a hard error. Back from the link's request shows the
// list (the code is dismissed — ⛔ a second call). ⛔ A code (missing / malformed / repeated) ⇒ the list. The decision is
// `peerRequestSlotView` (pure, `lib/peer-request.ts`).
// ⭐ THE HEADER: the group's inner `<Stack />` would show a default header titled with the raw route name, so the slot
// HIDES it and the in-screen pages carry their own Back (a cold-start link has ⛔ nothing behind it).
// ⛔ Never log the code (PM21 (e)).

import { useState } from 'react'
import { Stack } from 'expo-router'
import { Paragraph, YStack } from 'tamagui'

import { useClaimT } from '../../lib/claim-i18n'
import { peerRequestSlotView } from '../../lib/peer-request'
import { useSession } from '../../lib/session-context'
import { PeerQuestionnaire } from './PeerQuestionnaire'
import { PeerRequestList } from './PeerRequestList'
import { PeerRequestNotOpenable } from './PeerRequestNotOpenable'
import { usePeerRequestByLinkQuery } from './usePeerRequestQueries'

export interface PeerRequestSlotProps {
  /** The parsed link code, or `null` (missing / malformed / repeated). */
  readonly code: string | null
}

export function PeerRequestSlot({ code }: PeerRequestSlotProps): React.ReactElement {
  const t = useClaimT()
  const { session, isLoading } = useSession()
  const [openPingId, setOpenPingId] = useState<string | null>(null)
  const [linkDismissed, setLinkDismissed] = useState(false)
  const pariwarId = isLoading ? undefined : session?.pariwarId
  const linkCode = linkDismissed ? null : code
  // ⛔ No call before the session has loaded (the hook is `enabled` only once `pariwarId` is the session's) or without a code.
  const byLink = usePeerRequestByLinkQuery(pariwarId, linkCode)
  const view = peerRequestSlotView({
    pariwarId,
    openPingId,
    code: linkCode,
    byLink: { status: byLink.status, pingId: byLink.data?.pingId ?? null },
  })
  const back = (): void => {
    setOpenPingId(null)
    setLinkDismissed(true)
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <YStack flex={1} bg="$background">
        {view.kind === 'loading' ? (
          // ⛔ No API call before the session has loaded (or while the guard sends a signed-out member to login).
          <Paragraph p="$4">{t('peer_request.loading')}</Paragraph>
        ) : view.kind === 'questionnaire' ? (
          <PeerQuestionnaire pariwarId={pariwarId as string} pingId={view.pingId} onBack={back} />
        ) : view.kind === 'not_openable' ? (
          <PeerRequestNotOpenable messageKey="peer_request.not_openable" />
        ) : (
          <PeerRequestList pariwarId={pariwarId as string} onOpen={setOpenPingId} />
        )}
      </YStack>
    </>
  )
}
