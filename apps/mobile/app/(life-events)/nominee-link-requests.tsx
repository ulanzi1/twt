// "Named as a nominee" — the marked member's side (Story 6.36e, Task 5; AC4, AC5; `2026-10-24-397` NE6).
//
// Each mark naming the member, newest first, OPEN ones first: *"[Declarer's registered name] has named you as their nominee
// in TWT and marked you as a member. Is that you?"*, then *"[Name] will see your answer."* and the name note, above the two answers.
// ⛔ A line saying what a yes or a no leads to (*"you will not be asked about … death"*, V14): removed by `2026-10-24-401` — the screen
// must not describe how the five are chosen. ONE answer (NE6): ⛔ lapse, ⛔ withdraw;
// an answered mark stays listed with what the member said. ⛔ SMS, push or WhatsApp — the app only. Every state (loading,
// empty, refused, failed) renders OUTSIDE the list ([[project_fabric_flatlist_empty_populated_crash]]); each answer is a
// per-call `mutateAsync` with its OWN Idempotency-Key, and its outcome is SHOWN AND SPOKEN.
// Code review 2026-10-24: a failure is SAID whenever it happens (a first load, a refetch behind rows, a failed *Show more*), with
// a Retry that stays mounted while it runs (TanStack v5 resets an errored query to pending); each row's Yes / No name the
// declarer in their accessible label; the spinner says it is loading. A request the member has JUST answered renders as answered
// at once (`answeredNow`) and one the server called closed / changed has its buttons off (`closedNow`) until the list reloads —
// the reload is ⛔ waited on (a stalled one held every button busy forever), so without these the row would offer Yes / No again
// and a second tap would be refused "can no longer be answered" straight after "saved" (fix-diff review 2026-10-24).
// Round 3 (2026-10-24): the answered row shows what the server RECORDED (a replay returns the first answer), the cache is marked
// answered at once (the home card), the answer POST is BOUNDED (`withTimeout` — a stalled one held every Yes / No disabled for
// good), a closed / changed row says so and drops its buttons, and the page spinner is hidden while *Retry* runs its own.
// Round 4: ONE answer in flight (a ref — `busyLink` state disables nothing until a re-render), and the Idempotency-Key is kept per
// (request, answer) across a non-final failure, so a retry of the SAME answer after the bound replays the first outcome instead of
// meeting a 409; the closed row's own line is always the PERMANENT one (`request.closed`) — "being reloaded" lives in the alert only.

import { useRef, useState } from 'react'
import { ScrollView } from 'react-native'

import { Stack } from 'expo-router'
import { Button, H2, Paragraph, Spinner, Text, XStack, YStack } from 'tamagui'

import { AnnouncedText } from '../../components/peer-request/announce'
import { errorCodeOf, useNomineeLinkAnswer, useNomineeLinkRequestsQuery } from '../../components/nominee-links/useNomineeLinkQueries'
import { newIdempotencyKey } from '../../lib/idempotency-key'
import { useNomineeLinkT } from '../../lib/nominee-link-i18n'
import { answerRefusalCopyKey, flattenNomineeLinkPages, shownRequestAnswer } from '../../lib/nominee-links'
import { CALL_TIMEOUT_MS, withTimeout } from '../../lib/with-timeout'

export default function NomineeLinkRequestsScreen() {
  const t = useNomineeLinkT()
  const q = useNomineeLinkRequestsQuery()
  const answer = useNomineeLinkAnswer()
  const [busyLink, setBusyLink] = useState<string | null>(null)
  const [message, setMessage] = useState<{ text: string; kind: 'status' | 'error'; seq: number } | null>(null)
  const [retrying, setRetrying] = useState(false)
  // What the server RECORDED, per request, until the reload replaces the row; and the copy key of a request it called closed / changed.
  const [answeredNow, setAnsweredNow] = useState<Readonly<Record<string, 'confirmed' | 'not_me'>>>({})
  const [closedNow, setClosedNow] = useState<ReadonlySet<string>>(new Set())
  const answering = useRef(false)
  /** The Idempotency-Key of an answer that has not reached a final outcome, per request — reused for a retry of the SAME answer. */
  const keys = useRef(new Map<string, { answer: 'yes' | 'not_me'; key: string }>())
  const pages = q.data?.pages
  const denied = errorCodeOf(q.error) === 'nominee_link.not_available' || (pages ?? []).some((p) => 'denied' in p && p.denied === true)
  const items = flattenNomineeLinkPages(pages)

  async function onAnswer(linkId: string, value: 'yes' | 'not_me'): Promise<void> {
    if (answering.current) return // ONE answer at a time: two taps in one batch would send two POSTs
    answering.current = true
    const held = keys.current.get(linkId)
    const idempotencyKey = held !== undefined && held.answer === value ? held.key : newIdempotencyKey()
    keys.current.set(linkId, { answer: value, key: idempotencyKey })
    setBusyLink(linkId)
    setMessage(null)
    try {
      // BOUNDED: the API client has no transport timeout. The POST may still land after the bound — the retry carries the SAME key.
      const recorded = await withTimeout(answer.mutateAsync({ linkId, answer: value, idempotencyKey }), CALL_TIMEOUT_MS)
      keys.current.delete(linkId)
      setAnsweredNow((prev) => ({ ...prev, [linkId]: recorded.answer }))
      setMessage({ text: t('request.done'), kind: 'status', seq: Date.now() })
    } catch (err) {
      const code = errorCodeOf(err)
      // Closed or changed under the member: the row is dead — no second tap, until the reload (already asked for) replaces it.
      if (code === 'nominee_link.request_closed' || code === 'nominee_link.not_found') {
        keys.current.delete(linkId) // a final outcome: the next answer, if any, is a new act
        setClosedNow((prev) => new Set(prev).add(linkId))
      }
      setMessage({ text: t(answerRefusalCopyKey(code)), kind: 'error', seq: Date.now() })
    } finally {
      answering.current = false
      setBusyLink(null)
    }
  }

  /** Retry what failed: a failed *Show more* asks for the next page again, anything else reloads. */
  async function retry(): Promise<void> {
    setRetrying(true)
    try {
      await (q.isFetchNextPageError ? q.fetchNextPage() : q.refetch())
    } finally {
      setRetrying(false)
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
          {q.isLoading && !retrying ? <Spinner accessibilityLabel={t('loading')} /> : null}
          {denied ? <Text testID="nominee-requests-denied">{t('request.not_available')}</Text> : null}
          {!denied && (q.isError || retrying) ? (
            <YStack gap="$2" testID="nominee-requests-error">
              {/* Keyed by the last failure: the line stays mounted through a retry, so a SECOND failure is spoken again. */}
              <AnnouncedText key={q.errorUpdatedAt} text={t('error.load')} kind="error" color="#C0392B" />
              <Button
                chromeless
                height={40}
                disabled={retrying}
                accessibilityRole="button"
                accessibilityLabel={t('retry')}
                accessibilityState={{ disabled: retrying, busy: retrying }}
                onPress={() => void retry()}
              >
                {retrying ? <Spinner /> : t('retry')}
              </Button>
            </YStack>
          ) : null}
          {!denied && q.isSuccess && !q.isError && items.length === 0 ? <Text testID="nominee-requests-empty">{t('request.empty')}</Text> : null}
          {!denied && items.length > 0 ? (
            <YStack gap="$5" accessibilityRole="list">
              {items.map((r) => {
                const shown = shownRequestAnswer(r.answer, answeredNow[r.linkId])
                const closed = closedNow.has(r.linkId)
                const off = busyLink !== null
                return (
                <YStack key={r.linkId} gap="$2" testID={`nominee-request-${r.linkId}`}>
                  <Paragraph accessibilityRole="text">{named('request.question', r.name)}</Paragraph>
                  {shown === null && closed ? (
                    // Closed or changed under the member: no Yes / No, and no "while this stands …" about a request that does not. The
                    // line is the PERMANENT one — "being reloaded" is a moment, said in the alert above, ⛔ left on a row that may stand.
                    <Text testID={`nominee-request-closed-${r.linkId}`}>{t('request.closed')}</Text>
                  ) : shown === null ? (
                    <>
                      <Text>{named('request.will_see', r.name)}</Text>
                      <Text>{t('request.name_note')}</Text>
                      <XStack gap="$2" flexWrap="wrap">
                        <Button
                          theme="accent"
                          height={48}
                          disabled={off}
                          accessibilityRole="button"
                          accessibilityLabel={r.name ? `${t('request.yes')} — ${r.name}` : t('request.yes')}
                          accessibilityState={{ disabled: off, busy: busyLink === r.linkId }}
                          onPress={() => void onAnswer(r.linkId, 'yes')}
                        >
                          {t('request.yes')}
                        </Button>
                        <Button
                          height={48}
                          disabled={off}
                          accessibilityRole="button"
                          accessibilityLabel={r.name ? `${t('request.no')} — ${r.name}` : t('request.no')}
                          accessibilityState={{ disabled: off, busy: busyLink === r.linkId }}
                          onPress={() => void onAnswer(r.linkId, 'not_me')}
                        >
                          {t('request.no')}
                        </Button>
                      </XStack>
                    </>
                  ) : (
                    <>
                      <Text>{shown === 'confirmed' ? t('request.answered_yes') : t('request.answered_no')}</Text>
                    </>
                  )}
                </YStack>
                )
              })}
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
