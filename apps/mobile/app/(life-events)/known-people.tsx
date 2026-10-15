// Life Events → "People who know me" (Story 6.36b, Task 4; AC6–AC9; 6.36a SW10 / SW14).
//
// TWO sections:
//   · the people the member NAMED — each row under the name the member SAVED (an `asked` link — kept only on this phone)
//     or the registered name (once `accepted`); *"Not accepted"* for 30 days after a decline, a withdrawal or a lapse;
//     *"Can no longer be asked"* (⛔ named, ⛔ why). Remove (the person is ⛔ told). *"Find members in my contacts"* while
//     a slot is free;
//   · the requests NAMING the member — *"[Name] has named you as someone who knows them. Do you know him/her?"* with
//     *"[Name] will see your answer."* ABOVE the answers; an accepted one stays here with *"I don't know them"* and
//     *"[Name] will see that you withdrew."* (6.36a SW14).
// Only an `active` member may use it — every other member gets ONE plain message (AC10). Calm register; bilingual; every
// control labelled. Empty / loading / error states render OUTSIDE any list ([[project_fabric_flatlist_empty_populated_crash]]).

import { useEffect, useState } from 'react'
import { ScrollView } from 'react-native'

import { Stack, useRouter } from 'expo-router'
import { Button, H2, H3, Paragraph, Spinner, Text, XStack, YStack } from 'tamagui'

import { errorCodeOf, useKnownPeopleRequestsQuery, useKnownPeopleWrites, useMyKnownPeopleQuery } from '../../components/known-people/useKnownPeopleQueries'
import { labelCopyKey, refusalCopyKey, rowName } from '../../lib/known-people'
import { useKnownPeopleT } from '../../lib/known-people-i18n'
import { loadSavedNames, pruneSavedNames } from '../../lib/known-people-saved-names'
import { newIdempotencyKey } from '../../lib/idempotency-key'
import { useSession } from '../../lib/session-context'

export default function KnownPeopleScreen() {
  const t = useKnownPeopleT()
  const router = useRouter()
  const { session } = useSession()
  const mine = useMyKnownPeopleQuery()
  const requests = useKnownPeopleRequestsQuery()
  const { remove, answer, withdraw } = useKnownPeopleWrites()
  const [busyLink, setBusyLink] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const memberId = session?.memberId
  const savedNames = memberId ? loadSavedNames(memberId) : {}

  // A removed or vanished link's saved name is dropped (it is ⛔ needed again).
  useEffect(() => {
    if (memberId && mine.data) pruneSavedNames(memberId, mine.data.items.map((i) => i.linkId))
  }, [memberId, mine.data])

  const notAvailable = errorCodeOf(mine.error) === 'known_people.not_available' || errorCodeOf(requests.error) === 'known_people.not_available'

  /** One write at a time per link; a refusal shows its own plain message. */
  async function run(linkId: string, write: () => Promise<unknown>): Promise<void> {
    setBusyLink(linkId)
    setMessage(null)
    try {
      await write()
    } catch (err) {
      setMessage(t(refusalCopyKey(errorCodeOf(err))))
    } finally {
      setBusyLink(null)
    }
  }

  const fallbacks = { saved: t('list.saved_name_unknown'), unavailable: t('list.unavailable_name') }

  return (
    <>
      <Stack.Screen options={{ title: t('title') }} />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <YStack gap="$4" px="$6" py="$6" bg="$background">
          <H2 accessibilityRole="header">{t('title')}</H2>
          <Paragraph color="$colorPress">{t('intro')}</Paragraph>

          {notAvailable ? (
            <Text accessibilityRole="alert">{t('error.not_available')}</Text>
          ) : (
            <>
              {message ? (
                <Text color="#C0392B" accessibilityRole="alert" accessibilityLiveRegion="assertive">
                  {message}
                </Text>
              ) : null}

              {/* ── The people the member named ── */}
              <H3 accessibilityRole="header">{t('list.heading')}</H3>
              {mine.isLoading ? (
                <Spinner accessibilityLabel={t('loading')} />
              ) : mine.isError ? (
                <YStack gap="$2">
                  <Text>{t('error.load')}</Text>
                  <Button onPress={() => void mine.refetch()} accessibilityRole="button">
                    {t('retry')}
                  </Button>
                </YStack>
              ) : mine.data && mine.data.items.length === 0 ? (
                <Text>{t('list.empty')}</Text>
              ) : (
                mine.data?.items.map((item) => {
                  const name = rowName(item, savedNames, fallbacks)
                  const live = item.label === 'asked' || item.label === 'accepted' || item.label === 'unavailable'
                  return (
                    <XStack key={item.linkId} gap="$3" items="center" justify="space-between">
                      <YStack flex={1} gap="$1">
                        <Text fontWeight="600">{name}</Text>
                        <Text color="$colorPress" fontSize="$2" accessibilityLiveRegion="polite">
                          {t(labelCopyKey(item.label))}
                        </Text>
                      </YStack>
                      {live ? (
                        <Button
                          size="$3"
                          disabled={busyLink !== null}
                          accessibilityRole="button"
                          accessibilityLabel={t('action.remove_a11y', { name })}
                          onPress={() => void run(item.linkId, () => remove.mutateAsync({ linkId: item.linkId, idempotencyKey: newIdempotencyKey() }))}
                        >
                          {busyLink === item.linkId ? <Spinner /> : t('action.remove')}
                        </Button>
                      ) : null}
                    </XStack>
                  )
                })
              )}

              {mine.data ? (
                mine.data.freeSlots > 0 ? (
                  <YStack gap="$2">
                    <Text>{t('list.free_slots', { count: mine.data.freeSlots })}</Text>
                    <Button
                      theme="accent"
                      height={56}
                      accessibilityRole="button"
                      accessibilityLabel={t('action.find')}
                      onPress={() => router.push('/(life-events)/known-people-find')}
                    >
                      {t('action.find')}
                    </Button>
                  </YStack>
                ) : (
                  <Text>{t('list.full')}</Text>
                )
              ) : null}

              {/* ── The requests naming the member ── */}
              <H3 accessibilityRole="header">{t('requests.heading')}</H3>
              {requests.isLoading ? (
                <Spinner accessibilityLabel={t('loading')} />
              ) : requests.isError ? (
                <YStack gap="$2">
                  <Text>{t('error.load')}</Text>
                  <Button onPress={() => void requests.refetch()} accessibilityRole="button">
                    {t('retry')}
                  </Button>
                </YStack>
              ) : requests.data && requests.data.items.length === 0 ? (
                <Text>{t('requests.empty')}</Text>
              ) : (
                requests.data?.items.map((r) => {
                  const name = r.name ?? t('request.unknown_name')
                  return (
                    <YStack key={r.linkId} gap="$2" py="$2">
                      {r.state === 'asked' ? (
                        <>
                          <Text fontWeight="600">{t('request.question', { name })}</Text>
                          <Paragraph color="$colorPress" fontSize="$2">
                            {t('request.will_see', { name })}
                          </Paragraph>
                          <XStack gap="$3">
                            <Button
                              theme="accent"
                              flex={1}
                              disabled={busyLink !== null}
                              accessibilityRole="button"
                              accessibilityLabel={t('request.yes')}
                              onPress={() =>
                                void run(r.linkId, () => answer.mutateAsync({ linkId: r.linkId, answer: 'accept', idempotencyKey: newIdempotencyKey() }))
                              }
                            >
                              {t('request.yes')}
                            </Button>
                            <Button
                              flex={1}
                              disabled={busyLink !== null}
                              accessibilityRole="button"
                              accessibilityLabel={t('request.no')}
                              onPress={() =>
                                void run(r.linkId, () => answer.mutateAsync({ linkId: r.linkId, answer: 'decline', idempotencyKey: newIdempotencyKey() }))
                              }
                            >
                              {t('request.no')}
                            </Button>
                          </XStack>
                        </>
                      ) : (
                        <>
                          <Text>{t('request.accepted', { name })}</Text>
                          <Paragraph color="$colorPress" fontSize="$2">
                            {t('request.withdraw_notice', { name })}
                          </Paragraph>
                          <Button
                            size="$3"
                            disabled={busyLink !== null}
                            accessibilityRole="button"
                            accessibilityLabel={t('request.withdraw')}
                            onPress={() => void run(r.linkId, () => withdraw.mutateAsync({ linkId: r.linkId, idempotencyKey: newIdempotencyKey() }))}
                          >
                            {busyLink === r.linkId ? <Spinner /> : t('request.withdraw')}
                          </Button>
                        </>
                      )}
                    </YStack>
                  )
                })
              )}
            </>
          )}
        </YStack>
      </ScrollView>
    </>
  )
}
