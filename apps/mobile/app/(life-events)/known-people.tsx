// Life Events → "People who know me" (Story 6.36b, Task 4; AC6–AC9; 6.36a SW10 / SW14).
//
// TWO sections:
//   · the people the member NAMED — each row under the name the member SAVED (an `asked` link — kept only on this phone)
//     or the registered name (once `accepted`); *"Not accepted"* for 30 days after a decline, a withdrawal or a lapse;
//     *"No longer available"* (⛔ named, ⛔ why; `2026-10-24-403`). Remove (the person is ⛔ told). *"Find members in my contacts"* while
//     a slot is free;
//   · the requests NAMING the member — *"[Name] has named you as someone who knows them. Do you know him/her?"* with
//     *"[Name] will see your answer."* ABOVE the answers; an accepted one stays here with *"I don't know them"* and
//     *"[Name] will see that you withdrew."* (6.36a SW14).
// Only an `active` member may use it — every other member gets ONE plain message (AC10). Calm register; bilingual; every
// control labelled. Empty / loading / error states render OUTSIDE any list ([[project_fabric_flatlist_empty_populated_crash]]).
// ⭐ Every action's outcome is SHOWN AND SPOKEN (`AnnouncedText` — the live region on Android, the announce call on iOS):
// a success says what was done (an accept swaps the controls for text; a decline, removal or withdrawal removes the row —
// silent before, review 2026-10-15 R5), a refusal its own plain message. The requests naming the member load PAGE BY PAGE
// (*"Show more"* — R3); a failed *"Show more"* keeps the rows and reports beside the button (6.36a's posting precedent).
// ⭐ Review round 2: the find screen's success is SHOWN AND SPOKEN here (it goes back at once — `handKnownPeopleNotice`,
// P2); a REFUSED action refreshes both lists, so a row that changed elsewhere loses its stale controls (P3); a failed
// refetch of the named list keeps its rows and says so beside them (P9); each answer button names the person (P11).

import { useCallback, useEffect, useRef, useState } from 'react'
import { InteractionManager, ScrollView } from 'react-native'

import { Stack, useFocusEffect, useRouter } from 'expo-router'
import { Button, H2, H3, Paragraph, Spinner, Text, XStack, YStack } from 'tamagui'

import {
  errorCodeOf,
  useKnownPeopleRequestsQuery,
  useKnownPeopleWrites,
  useMyKnownPeopleQuery,
  useRestartKnownPeopleLists,
} from '../../components/known-people/useKnownPeopleQueries'
import { AnnouncedText } from '../../components/peer-request/announce'
import {
  flattenRequestPages,
  isDenied,
  labelCopyKey,
  refusalCopyKey,
  requestsDenied,
  rowName,
  savedNameLinkIdsToKeep,
  successCopyKey,
  type KnownPeopleAction,
} from '../../lib/known-people'
import { useKnownPeopleT } from '../../lib/known-people-i18n'
import { takeKnownPeopleNotice } from '../../lib/known-people-notice'
import { loadSavedNames, pruneSavedNames } from '../../lib/known-people-saved-names'
import { newIdempotencyKey } from '../../lib/idempotency-key'
import { useSession } from '../../lib/session-context'

export default function KnownPeopleScreen() {
  const t = useKnownPeopleT()
  const router = useRouter()
  const { session } = useSession()
  const mine = useMyKnownPeopleQuery()
  const requests = useKnownPeopleRequestsQuery()
  const { remove, answer, withdraw, refresh } = useKnownPeopleWrites()
  const [busyLink, setBusyLink] = useState<string | null>(null)
  // `seq` (a counter — ⛔ derived from the previous notice, which `run` has just cleared: fix-diff review F6) remounts the
  // line, so the SAME words twice in a row are spoken twice.
  const [notice, setNotice] = useState<{ kind: 'status' | 'error'; text: string; seq: number } | null>(null)
  const noticeSeq = useRef(0)

  // The find screen's success, parked as it went back (P2) — taken when this screen is FOCUSED again, after the running
  // interactions settle (`runAfterInteractions` — `PoolOnboardingTutorial`'s precedent), then shown and spoken. ⚠ Focus
  // fires as the pop BEGINS; whether VoiceOver's screen-change announcement still cuts "Asked." off on a native-stack
  // pop is ⛔ demonstrated — FD-4's device check (fix-diff reviews rounds 1–2; recorded, ⛔ claimed solved).
  useFocusEffect(
    useCallback(() => {
      const task = InteractionManager.runAfterInteractions(() => {
        const text = takeKnownPeopleNotice()
        if (text !== null) setNotice({ kind: 'status', text, seq: (noticeSeq.current += 1) })
      })
      return () => task.cancel()
    }, []),
  )

  const memberId = session?.memberId
  const savedNames = memberId ? loadSavedNames(memberId) : {}

  // A removed or vanished link's saved name is dropped (it is ⛔ needed again) — ONLY against a list that can say so
  // (`savedNameLinkIdsToKeep`): ⛔ a denial's empty list (it erased every name the member saved, unrecoverably — they are
  // kept ONLY on this phone; fix-diff review round 4, H1), ⛔ a history at its bound (round 5).
  useEffect(() => {
    const keep = savedNameLinkIdsToKeep(mine.data)
    if (memberId && keep !== null) pruneSavedNames(memberId, keep)
  }, [memberId, mine.data])

  // The not-available message's Retry reloads BOTH lists from nothing (`useRestartKnownPeopleLists` — any fetch in flight,
  // a hung first one included, is cancelled; round-6 review; and every read is bounded by `KNOWN_PEOPLE_READ_TIMEOUT_MS`,
  // round 7). "Loading…" is spoken at once (the tapped button unmounts with the message); then the screen's own branches
  // say how it went, each SPOKEN on mount: refused again ⇒ the message re-mounts; a list failed ⇒ its "could not load";
  // access back ⇒ "Loaded.". Only the LATEST tap's outcome counts, and ⛔ over a write's notice that landed meanwhile —
  // both by ONE check: the notice is still this tap's "Loading…".
  const restartLists = useRestartKnownPeopleLists()
  async function retryAfterDenial(): Promise<void> {
    const loadingSeq = (noticeSeq.current += 1)
    setNotice({ kind: 'status', text: t('loading'), seq: loadingSeq })
    const { restored } = await restartLists()
    if (noticeSeq.current !== loadingSeq) return
    setNotice(restored ? { kind: 'status', text: t('loaded'), seq: (noticeSeq.current += 1) } : null)
  }

  // Both queries keep the server's denial AS DATA — sticky until a success (fix-diff review E1, G3); the message offers a
  // Retry (a member active again whose next fetch failed would otherwise have no way out).
  const notAvailable =
    isDenied(mine.data) ||
    requestsDenied(requests.data?.pages) ||
    errorCodeOf(mine.error) === 'known_people.not_available' ||
    errorCodeOf(requests.error) === 'known_people.not_available'
  // ⚠ *"Show more"* waits for a write in flight (its refetch would CANCEL the page — fix-diff review G1). The converse —
  // a write started while a page loads cancels that page; the button comes back, the member taps again — is ACCEPTED:
  // blocking every answer behind a page fetch that has ⛔ timeout could lock them all (G2, superseding E2's block).
  const writeInFlight = busyLink !== null

  // A notice from BEFORE a denial (a write's "Done…") is dropped — it would be spoken again when the lists come back.
  useEffect(() => {
    if (notAvailable) setNotice(null)
  }, [notAvailable])

  /** One write at a time per link; the outcome is shown and spoken — what was done, or the refusal's own message. */
  async function run(linkId: string, action: KnownPeopleAction, name: string, write: () => Promise<unknown>): Promise<void> {
    setBusyLink(linkId)
    setNotice(null)
    try {
      await write()
      setNotice({ kind: 'status', text: t(successCopyKey(action), { name }), seq: (noticeSeq.current += 1) })
    } catch (err) {
      setNotice({ kind: 'error', text: t(refusalCopyKey(errorCodeOf(err))), seq: (noticeSeq.current += 1) })
      // A refusal means the row is out of date (closed, removed or withdrawn elsewhere — or this member's own earlier tap
      // landed and its answer was lost): both lists reload, so its stale controls go (review round 2, P3). ⛔ Awaited — the
      // refusal is spoken at once; a failed reload reports in its own place.
      void refresh().catch(() => undefined)
    } finally {
      setBusyLink(null)
    }
  }

  const requestItems = flattenRequestPages(requests.data?.pages)

  const fallbacks = { saved: t('list.saved_name_unknown'), unavailable: t('list.unavailable_name') }

  return (
    <>
      <Stack.Screen options={{ title: t('title') }} />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <YStack gap="$4" px="$6" py="$6" bg="$background">
          <H2 accessibilityRole="header">{t('title')}</H2>
          <Paragraph color="$colorPress">{t('intro')}</Paragraph>

          {notAvailable ? (
            <YStack gap="$2">
              {/* ⛔ re-keyed: the two lists answer separately, and a key on their answers spoke it twice (round 8). A Retry's
                  reset empties both lists, so a refusal again RE-MOUNTS this line — spoken once more. */}
              <AnnouncedText text={t('error.not_available')} kind="error" color="$color" />
              <Button accessibilityRole="button" onPress={() => void retryAfterDenial()}>
                {t('retry')}
              </Button>
            </YStack>
          ) : (
            <>
              {notice ? (
                <AnnouncedText
                  key={notice.seq}
                  text={notice.text}
                  kind={notice.kind}
                  {...(notice.kind === 'error' ? { color: '#C0392B' } : {})}
                />
              ) : null}

              {/* ── The people the member named ── */}
              <H3 accessibilityRole="header">{t('list.heading')}</H3>
              {mine.isLoading ? (
                <Spinner accessibilityLabel={t('loading')} />
              ) : mine.isError && !mine.data ? (
                <YStack gap="$2">
                  <AnnouncedText key={mine.errorUpdatedAt} text={t('error.load')} kind="error" color="#C0392B" />
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
                          disabled={writeInFlight}
                          accessibilityRole="button"
                          accessibilityLabel={t('action.remove_a11y', { name })}
                          onPress={() =>
                            void run(item.linkId, 'remove', name, () => remove.mutateAsync({ linkId: item.linkId, idempotencyKey: newIdempotencyKey() }))
                          }
                        >
                          {busyLink === item.linkId ? <Spinner /> : t('action.remove')}
                        </Button>
                      ) : null}
                    </XStack>
                  )
                })
              )}

              {/* A failed REFETCH keeps the rows (and their Remove controls) and says so beside them — ⛔ every row behind
                  "Could not load" (review round 2, P9; the requests section's rule). */}
              {mine.data && mine.isError && !mine.isFetching ? (
                <YStack gap="$2">
                  <AnnouncedText key={mine.errorUpdatedAt} text={t('error.load')} kind="error" color="#C0392B" />
                  <Button accessibilityRole="button" onPress={() => void mine.refetch()}>
                    {t('retry')}
                  </Button>
                </YStack>
              ) : null}

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
              ) : requests.isError && !requests.data ? (
                <YStack gap="$2">
                  <AnnouncedText key={requests.errorUpdatedAt} text={t('error.load')} kind="error" color="#C0392B" />
                  <Button onPress={() => void requests.refetch()} accessibilityRole="button">
                    {t('retry')}
                  </Button>
                </YStack>
              ) : requests.data && requestItems.length === 0 ? (
                <Text>{t('requests.empty')}</Text>
              ) : (
                requestItems.map((r) => {
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
                              disabled={writeInFlight}
                              accessibilityRole="button"
                              accessibilityLabel={t('request.yes_a11y', { name })}
                              onPress={() =>
                                void run(r.linkId, 'accept', name, () =>
                                  answer.mutateAsync({ linkId: r.linkId, answer: 'accept', idempotencyKey: newIdempotencyKey() }),
                                )
                              }
                            >
                              {t('request.yes')}
                            </Button>
                            <Button
                              flex={1}
                              disabled={writeInFlight}
                              accessibilityRole="button"
                              accessibilityLabel={t('request.no_a11y', { name })}
                              onPress={() =>
                                void run(r.linkId, 'decline', name, () =>
                                  answer.mutateAsync({ linkId: r.linkId, answer: 'decline', idempotencyKey: newIdempotencyKey() }),
                                )
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
                            disabled={writeInFlight}
                            accessibilityRole="button"
                            accessibilityLabel={t('request.withdraw_a11y', { name })}
                            onPress={() =>
                              void run(r.linkId, 'withdraw', name, () => withdraw.mutateAsync({ linkId: r.linkId, idempotencyKey: newIdempotencyKey() }))
                            }
                          >
                            {busyLink === r.linkId ? <Spinner /> : t('request.withdraw')}
                          </Button>
                        </>
                      )}
                    </YStack>
                  )
                })
              )}

              {/* A failed REFETCH of page 1 keeps the rows but SAYS so; a failed *"Show more"* reports in the button's place
                  with its own Retry — ⛔ the whole section flipping into the error branch (6.36a's posting precedent). Each
                  NEW failure remounts its line (`errorUpdatedAt`), so a second failure is spoken too (fix-diff review F4).
                  *"Show more"* waits for ANY fetch in flight and never cancels one: a write's refetch, cancelled by it,
                  left the written row on screen under a spoken "Done" (F1). */}
              {requests.data && requests.isError && !requests.isFetchNextPageError && !requests.isFetching ? (
                <YStack gap="$2">
                  <AnnouncedText key={requests.errorUpdatedAt} text={t('error.load')} kind="error" color="#C0392B" />
                  <Button accessibilityRole="button" onPress={() => void requests.refetch()}>
                    {t('retry')}
                  </Button>
                </YStack>
              ) : null}
              {requests.hasNextPage && requests.isFetchNextPageError ? (
                <YStack gap="$2">
                  <AnnouncedText key={requests.errorUpdatedAt} text={t('error.load')} kind="error" color="#C0392B" />
                  <Button
                    accessibilityRole="button"
                    disabled={requests.isFetching || writeInFlight}
                    accessibilityState={{ disabled: requests.isFetching || writeInFlight }}
                    onPress={() => void requests.fetchNextPage({ cancelRefetch: false })}
                  >
                    {t('retry')}
                  </Button>
                </YStack>
              ) : requests.hasNextPage ? (
                <Button
                  accessibilityRole="button"
                  accessibilityLabel={t('requests.show_more')}
                  disabled={requests.isFetching || requests.isError || writeInFlight}
                  accessibilityState={{ disabled: requests.isFetching || requests.isError || writeInFlight, busy: requests.isFetchingNextPage }}
                  onPress={() => void requests.fetchNextPage({ cancelRefetch: false })}
                >
                  {requests.isFetchingNextPage ? <Spinner /> : t('requests.show_more')}
                </Button>
              ) : null}
            </>
          )}
        </YStack>
      </ScrollView>
    </>
  )
}
