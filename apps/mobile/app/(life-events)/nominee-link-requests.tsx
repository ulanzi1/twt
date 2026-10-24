// "Named as a nominee" — the marked member's side (Story 6.36e, Task 5; AC4, AC5; `2026-10-24-397` NE6).
//
// Each mark naming the member, newest first, OPEN ones first: *"[Declarer's registered name] has named you as their nominee
// in TWT and marked you as a member. Is that you?"*, then *"[Name] will see your answer."* and the consequence — *"While this
// stands, you will not be asked about [Name]'s death."* (V14) — above the two answers. ONE answer (NE6): ⛔ lapse, ⛔ withdraw;
// an answered mark stays listed with what the member said. ⛔ SMS, push or WhatsApp — the app only. Every state (loading,
// empty, refused, failed) renders OUTSIDE the list ([[project_fabric_flatlist_empty_populated_crash]]); each answer is a
// per-call `mutateAsync` with its OWN Idempotency-Key, and its outcome is SHOWN AND SPOKEN.

import { useState } from 'react'
import { ScrollView } from 'react-native'

import { Stack } from 'expo-router'
import { Button, H2, Paragraph, Spinner, Text, XStack, YStack } from 'tamagui'

import { AnnouncedText } from '../../components/peer-request/announce'
import { errorCodeOf, useNomineeLinkAnswer, useNomineeLinkRequestsQuery } from '../../components/nominee-links/useNomineeLinkQueries'
import { newIdempotencyKey } from '../../lib/idempotency-key'
import { useNomineeLinkT } from '../../lib/nominee-link-i18n'
import { answerRefusalCopyKey, flattenNomineeLinkPages } from '../../lib/nominee-links'

export default function NomineeLinkRequestsScreen() {
  const t = useNomineeLinkT()
  const q = useNomineeLinkRequestsQuery()
  const answer = useNomineeLinkAnswer()
  const [busyLink, setBusyLink] = useState<string | null>(null)
  const [message, setMessage] = useState<{ text: string; kind: 'status' | 'error'; seq: number } | null>(null)
  const pages = q.data?.pages
  const denied = errorCodeOf(q.error) === 'nominee_link.not_available' || (pages ?? []).some((p) => 'denied' in p && p.denied === true)
  const items = flattenNomineeLinkPages(pages)

  async function onAnswer(linkId: string, value: 'yes' | 'not_me'): Promise<void> {
    setBusyLink(linkId)
    setMessage(null)
    try {
      await answer.mutateAsync({ linkId, answer: value, idempotencyKey: newIdempotencyKey() })
      setMessage({ text: t('request.done'), kind: 'status', seq: Date.now() })
    } catch (err) {
      setMessage({ text: t(answerRefusalCopyKey(errorCodeOf(err))), kind: 'error', seq: Date.now() })
    } finally {
      setBusyLink(null)
    }
  }

  const named = (key: string, name: string | null) => (name ? t(key, { name }) : t(`${key}_no_name`))

  return (
    <>
      <Stack.Screen options={{ title: t('request.title') }} />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <YStack gap="$4" px="$6" py="$6" bg="$background">
          <H2 accessibilityRole="header">{t('request.title')}</H2>
          {message ? <AnnouncedText key={message.seq} text={message.text} kind={message.kind} /> : null}
          {q.isLoading ? <Spinner accessibilityLabel={t('request.title')} /> : null}
          {denied ? <Text testID="nominee-requests-denied">{t('request.not_available')}</Text> : null}
          {!denied && q.isError && items.length === 0 ? (
            <YStack gap="$2" testID="nominee-requests-error">
              <Text accessibilityRole="alert">{t('error.load')}</Text>
              <Button chromeless height={40} accessibilityRole="button" accessibilityLabel={t('retry')} onPress={() => void q.refetch()}>
                {t('retry')}
              </Button>
            </YStack>
          ) : null}
          {!denied && q.isSuccess && items.length === 0 ? <Text testID="nominee-requests-empty">{t('request.empty')}</Text> : null}
          {!denied && items.length > 0 ? (
            <YStack gap="$5" accessibilityRole="list">
              {items.map((r) => (
                <YStack key={r.linkId} gap="$2" testID={`nominee-request-${r.linkId}`}>
                  <Paragraph accessibilityRole="text">{named('request.question', r.name)}</Paragraph>
                  {r.answer === null ? (
                    <>
                      <Text>{named('request.will_see', r.name)}</Text>
                      <Text>{named('request.consequence', r.name)}</Text>
                      <XStack gap="$2" flexWrap="wrap">
                        <Button
                          theme="accent"
                          height={48}
                          disabled={busyLink !== null}
                          accessibilityRole="button"
                          accessibilityLabel={t('request.yes')}
                          accessibilityState={{ disabled: busyLink !== null, busy: busyLink === r.linkId }}
                          onPress={() => void onAnswer(r.linkId, 'yes')}
                        >
                          {t('request.yes')}
                        </Button>
                        <Button
                          height={48}
                          disabled={busyLink !== null}
                          accessibilityRole="button"
                          accessibilityLabel={t('request.no')}
                          accessibilityState={{ disabled: busyLink !== null, busy: busyLink === r.linkId }}
                          onPress={() => void onAnswer(r.linkId, 'not_me')}
                        >
                          {t('request.no')}
                        </Button>
                      </XStack>
                    </>
                  ) : (
                    <>
                      <Text>{r.answer === 'confirmed' ? t('request.answered_yes') : t('request.answered_no')}</Text>
                      <Text>{named('request.consequence', r.name)}</Text>
                    </>
                  )}
                </YStack>
              ))}
            </YStack>
          ) : null}
          {!denied && q.hasNextPage ? (
            <Button
              chromeless
              height={40}
              disabled={q.isFetchingNextPage}
              accessibilityRole="button"
              accessibilityLabel={t('request.load_more')}
              onPress={() => void q.fetchNextPage()}
            >
              {t('request.load_more')}
            </Button>
          ) : null}
        </YStack>
      </ScrollView>
    </>
  )
}
