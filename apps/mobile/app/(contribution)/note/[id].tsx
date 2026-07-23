// The Yogdaan Pratigya (Contribution Note) screen — Story 8.7 (Task 5; AC3/AC7).
//
// Fills the route Story 8.6 reserved as a placeholder. The route path (`/(contribution)/note/[id]`)
// and the `YogdaanBahiRow` press handler that reaches it are UNCHANGED — 8.6 reserved both
// deliberately.
//
// ── What this screen is, and what it deliberately is not ──────────────────────────────────────────
// It is a fetch → save → share affordance, not a viewer. The artifact itself is composed
// SERVER-SIDE (AC2 — the client never composes it) and arrives as PDF bytes; the screen writes them
// to the app cache and hands them to the OS share sheet, which opens the member's own PDF reader,
// saves to Files, or forwards on WhatsApp. There is NO PDF-viewer library and NO signed-URL flow —
// there is no object storage here at all; the Note is regenerated on demand and persisted nowhere (D2).
//
// ── Why the screen can be this thin (AC3 / D3) ────────────────────────────────────────────────────
// Because a PDF ESCAPES the self-view boundary the moment it is forwarded, the honesty lives ON THE
// ARTIFACT — the status block, the green-only UTR, the green-only सत्यापित stamp — not on this screen.
// The screen therefore renders no status of its own, and must never be tempted to: any status
// rendering here would be a second derivation, and a divergence between what the screen says and what
// the document says is exactly the failure the invariant exists to prevent.
//
// States mirror the passbook's conventions (`YogdaanBahi.tsx` gained a real error branch in the 8.6
// review — this does the same rather than regressing to a silent empty state). All targets ≥44pt.

import { useRef, useState } from 'react'

import { ApiError } from '@twt/api-client'
import { useT } from '@twt/i18n/react'
import { Stack, useLocalSearchParams } from 'expo-router'
import { Button, Paragraph, Spinner, Text, YStack } from 'tamagui'

import { memberAuth } from '../../../lib/member-api'
import { saveAndShareContributionNote } from '../../../lib/save-note'

const NS = { namespace: 'contribution' } as const

/** The ≥44pt touch floor (UX a11y) — the CTA is the screen's only interactive target. */
const MIN_TOUCH_TARGET = 44

type Phase = 'idle' | 'preparing' | 'error' | 'not_found' | 'saved_no_share'

export default function ContributionNoteScreen() {
  const t = useT()
  const { id } = useLocalSearchParams<{ id: string }>()
  const [phase, setPhase] = useState<Phase>('idle')
  // A `ref`, not state: guards against a rapid double-tap firing `onDownload` twice before React
  // commits the re-render that would otherwise disable the button (state updates are not synchronous).
  const downloadingRef = useRef(false)

  const contributionId = typeof id === 'string' ? id : ''

  async function onDownload(): Promise<void> {
    if (downloadingRef.current) return
    if (contributionId === '') {
      setPhase('not_found')
      return
    }
    downloadingRef.current = true
    setPhase('preparing')
    try {
      const bytes = await memberAuth.memberContributionNote(contributionId)
      const { shared } = await saveAndShareContributionNote(contributionId, bytes)
      setPhase(shared ? 'idle' : 'saved_no_share')
    } catch (err) {
      // A 404 is its own message: the contribution is not in the member's records (it is also what an
      // id belonging to someone else returns — the two are deliberately indistinguishable). Everything
      // else is the calm generic retry.
      const notFound = err instanceof ApiError && err.status === 404
      setPhase(notFound ? 'not_found' : 'error')
    } finally {
      downloadingRef.current = false
    }
  }

  const busy = phase === 'preparing'

  return (
    <>
      <Stack.Screen options={{ title: t('note.title', undefined, NS) }} />
      <YStack flex={1} px="$5" py="$6" gap="$4" bg="$background">
        <Paragraph fontFamily="$body" fontSize="$4" color="$color">
          {t('note.ready', undefined, NS)}
        </Paragraph>

        {phase === 'error' ? (
          <Text fontFamily="$body" fontSize="$3" color="$red11" accessibilityRole="alert">
            {t('note.load_failed', undefined, NS)}
          </Text>
        ) : null}

        {phase === 'not_found' ? (
          <Text fontFamily="$body" fontSize="$3" color="$colorPress" accessibilityRole="alert">
            {t('note.not_found', undefined, NS)}
          </Text>
        ) : null}

        {phase === 'saved_no_share' ? (
          <Text fontFamily="$body" fontSize="$3" color="$colorPress" accessibilityRole="alert">
            {t('note.saved_no_share', undefined, NS)}
          </Text>
        ) : null}

        {busy ? (
          <YStack items="center" gap="$2" accessibilityRole="text" accessibilityLabel={t('note.preparing', undefined, NS)}>
            <Spinner size="small" />
            <Text fontFamily="$body" fontSize="$3" color="$colorPress">
              {t('note.preparing', undefined, NS)}
            </Text>
          </YStack>
        ) : null}

        <Button
          height={MIN_TOUCH_TARGET}
          disabled={busy}
          opacity={busy ? 0.6 : 1}
          accessibilityRole="button"
          accessibilityLabel={t('note.download_cta_a11y', undefined, NS)}
          accessibilityHint={t('note.download_cta_hint', undefined, NS)}
          accessibilityState={{ disabled: busy, busy }}
          onPress={() => {
            void onDownload()
          }}
        >
          <Text fontFamily="$body" fontSize="$4" color="$color">
            {phase === 'error' || phase === 'not_found'
              ? t('note.retry', undefined, NS)
              : t('note.download_cta', undefined, NS)}
          </Text>
        </Button>
      </YStack>
    </>
  )
}
