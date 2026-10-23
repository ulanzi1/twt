// Story 11b.4 (AC2 / AC3) — the INTRO: *"Would you like to share a few words about {name}?"* with *"Not now"* as an EQUAL
// choice. A family with a draft on this phone is offered *resume / start again*; a family whose Send already landed (a kept
// key, a newer submission — AC3) goes to the outcome. ⛔ No drive ⇒ nothing is rendered (⛔ placeholder).

import { useEffect } from 'react'
import { ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { Button, H2, Paragraph, XStack, YStack } from 'tamagui'

import { MemorialHeader } from '../../components/memorial-authorship/MemorialHeader'
import { useMemorialViewQuery } from '../../components/memorial-authorship/useMemorialQueries'
import {
  clearMemorialDraft,
  loadMemorialDraft,
  memorialDraftHasContent,
  memorialSendLanded,
} from '../../lib/memorial-draft'
import { useMemorialT } from '../../lib/memorial-i18n'
import { useSession } from '../../lib/session-context'

export default function MemorialIntroScreen(): React.ReactElement | null {
  const t = useMemorialT()
  const router = useRouter()
  const { session } = useSession()
  const query = useMemorialViewQuery({ refetchOnMount: 'always' })
  const view = query.data?.memorial ?? null
  const memberId = session?.memberId ?? null
  const draft = view && memberId ? loadMemorialDraft(memberId, view.driveId) : {}
  const landed = view !== null && draft.pending !== undefined && memorialSendLanded(draft.pending, view.submissionId)

  useEffect(() => {
    // AC3 — a kept key and a NEWER submission ⇒ the Send landed (an app kill after commit): clear and show the outcome.
    if (landed && view && memberId) {
      clearMemorialDraft(memberId, view.driveId)
      router.replace('/(memorial)/outcome')
    }
  }, [landed])

  if (!view || !memberId || landed) return null
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
  const prompt = view.deceasedName === null ? t('intro.prompt_no_name') : t('intro.prompt', { name: view.deceasedName })
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
