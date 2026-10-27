// Story 11b.4 (AC2 / AC3) — the INTRO: *"Would you like to share a few words about {name}?"* with *"Not now"* as an EQUAL
// choice. A family with a draft on this phone is offered *resume / start again*; a family whose Send already landed (a kept
// key that the latest version carries — AC3, Z2) goes to the outcome. R20 — no view (the GET failed, or there is no drive) ⇒ the header, a
// gentle line, a retry and the helpline (never a blank screen in a stack with no header); the home entry is the normal way in.
// Y — the landed check STAYS although the server now replays a kept key at any age: it is the one way to show the outcome
// WITHOUT sending again. A resend would replay the first result only after the step-up — a lapsed elevation (any resume
// after 5 minutes) answers 403 first and texts the nominee just to learn what this view already says — and until then the
// intro would offer "resume" over words that are already with the Trust.

import { useEffect } from 'react'
import { ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { Button, H2, Paragraph, XStack, YStack } from 'tamagui'

import { MemorialHeader } from '../../components/memorial-authorship/MemorialHeader'
import { MemorialViewMissing } from '../../components/memorial-authorship/MemorialViewMissing'
import { useMemorialScreenAnnounce } from '../../components/memorial-authorship/useMemorialAnnounce'
import { useMemorialViewQuery } from '../../components/memorial-authorship/useMemorialQueries'
import {
  clearMemorialDraft,
  loadMemorialDraft,
  memorialDraftHasContent,
  memorialSendLanded,
} from '../../lib/memorial-draft'
import { useMemorialT } from '../../lib/memorial-i18n'
import { useSession } from '../../lib/session-context'

export default function MemorialIntroScreen(): React.ReactElement {
  const t = useMemorialT()
  const router = useRouter()
  const { session } = useSession()
  const query = useMemorialViewQuery({ refetchOnMount: 'always' })
  const view = query.data?.memorial ?? null
  const memberId = session?.memberId ?? null
  const draft = view && memberId ? loadMemorialDraft(memberId, view.driveId) : {}
  // Z2 — landed ⇔ the latest version's own key is the key kept here (⛔ a submission id: a stale view could misread it).
  const landed = view !== null && draft.pending !== undefined && memorialSendLanded(draft.pending, view.idempotencyKey)

  useEffect(() => {
    // AC3 / Z2 — the latest version carries the kept key ⇒ the Send landed (an app kill after commit): clear and show the outcome.
    if (landed && view && memberId) {
      clearMemorialDraft(memberId, view.driveId)
      router.replace('/(memorial)/outcome')
    }
  }, [landed])

  // T1 (TalkBack device session 2026-10-27) — the question is the screen's heading: SPOKEN on arrival (the stack has no title).
  const prompt =
    view === null ? null : view.deceasedName === null ? t('intro.prompt_no_name') : t('intro.prompt', { name: view.deceasedName })
  const asksPrompt = view !== null && memberId !== null && !landed && (view.memorialState === 'none' || memorialDraftHasContent(draft))
  useMemorialScreenAnnounce(asksPrompt ? prompt : null)

  // P3 — the intro cannot know whether a draft is still on this phone (its key needs `view.driveId`), and after a Send has
  // landed the draft is cleared: so it makes NO claim about the phone (the `outcome` variant of the line).
  if (!view || !memberId)
    return (
      <MemorialViewMissing
        loading={query.isPending}
        fetching={query.isError && query.isFetching}
        onRetry={() => query.refetch()}
        variant="outcome"
      />
    )
  // Landed ⇒ the effect above is already on its way to the outcome (the draft is cleared there).
  if (landed) return <MemorialViewMissing loading onRetry={() => query.refetch()} variant="outcome" />
  const hasDraft = memorialDraftHasContent(draft)
  if (view.memorialState !== 'none' && !hasDraft) {
    // Something was sent before — the outcome screen tells the family where it stands.
    return (
      <YStack flex={1}>
        <MemorialHeader showSaved={false} />
        <YStack px="$4" gap="$3">
          <Button style={{ minHeight: 44 }} accessibilityRole="button" onPress={() => router.replace('/(memorial)/outcome')}>
            {t('outcome.title')}
          </Button>
        </YStack>
      </YStack>
    )
  }
  return (
    <YStack flex={1}>
      <MemorialHeader showSaved={hasDraft} />
      <ScrollView>
        <YStack px="$4" py="$4" gap="$4">
          <H2 accessibilityRole="header">{prompt}</H2>
          <Paragraph>{t('intro.body')}</Paragraph>
          <Paragraph size="$2">{t('draft.kept_on_phone')}</Paragraph>
          {hasDraft ? (
            <YStack gap="$3">
              <Paragraph>{t('draft.resume_title')}</Paragraph>
              <XStack gap="$3" flexWrap="wrap">
                <Button style={{ minHeight: 44 }} accessibilityRole="button" onPress={() => router.push('/(memorial)/write')}>
                  {t('draft.resume')}
                </Button>
                <Button
                  style={{ minHeight: 44 }}
                  accessibilityRole="button"
                  onPress={() => {
                    clearMemorialDraft(memberId, view.driveId)
                    router.push('/(memorial)/write')
                  }}
                >
                  {t('draft.start_again')}
                </Button>
              </XStack>
            </YStack>
          ) : (
            // ⭐ Two EQUAL choices — the same size and weight (⛔ a primary "yes" and a muted "no").
            <XStack gap="$3" flexWrap="wrap">
              <Button style={{ minHeight: 44 }} accessibilityRole="button" onPress={() => router.push('/(memorial)/write')}>
                {t('intro.start')}
              </Button>
              <Button style={{ minHeight: 44 }} accessibilityRole="button" onPress={() => router.replace('/(tabs)')}>
                {t('intro.not_now')}
              </Button>
            </XStack>
          )}
        </YStack>
      </ScrollView>
    </YStack>
  )
}
