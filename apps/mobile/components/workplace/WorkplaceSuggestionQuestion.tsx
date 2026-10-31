// The ONE confirm question for a Pariwar Admin's suggested workplace (Story 6.36c, Task 6.2 / 6.5; AC4, AC6 (c); RV10).
//
// *"We think your workplace is {name}, {district}. Is that right?"* with *"Yes"* / *"No"* — asked on the home (card (c))
// and at the top of Life Events → Workplace, both driven by the PROMPTS' `suggestedWorkplace` (RV1 (i) — ⛔ the history's
// ungated `request.suggested`). ⭐ The member's own act: *"Yes"* writes a posting; a suggestion alone changes nothing.
// The Idempotency-Key: minted on the FIRST press for a `requestId` and reused ONLY for a retry of the SAME press
// (`answerKeyFor`) — held in a SHARED module cache keyed by `(requestId, workplaceId)` (`suggestion-answer-key-cache.ts`),
// ⛔ a per-mount `useRef`: the SAME suggestion can mount independently on the home card AND the Workplace screen at once,
// and two `useRef`s would each mint their OWN key for what is the same logical press (fix-review). Each press is its own
// `mutateAsync`-free call (⛔ `mutate()` callbacks — only the latest call's fire). A success refetches the prompts, the
// history and the Life Events summary.
// ⚠ Fix-review:
//   · `busy` (for render) is backed by a synchronous `useRef` LOCK (`inFlight`) — two rapid taps (Yes then No) before
//     React re-renders could both read `busy === false` and both fire; the ref is checked-and-set in the same tick,
//     reset in a `finally`.
//   · `pendingAnswer` tracks WHICH button was pressed, so *"Saving…"* shows on that one only — the other keeps its
//     normal label and is merely disabled.
//   · `answered` stays `true` once a press lands 200 — both buttons stay disabled so an already-accepted answer can
//     ⛔ be resent.
//   · `onBusyChange` lets a parent (the home card, the Workplace screen) track whether an answer is in flight, so IT
//     can guard its OWN concurrent actions ("Not now"; "I have been transferred") while this one settles.
// ⚠ Code review round 2:
//   · the OUTCOME line (saved yes / thank-you no / every refusal) is ⛔ rendered here any more — it is handed to the
//     parent (`onOutcome`), which renders it with `<SuggestionOutcomeLine>`. Every outcome refetches the prompts, and
//     the refetch that drops the suggestion UNMOUNTS this question: a line rendered here showed for one round trip and
//     TalkBack may have said nothing. In the parent it stays mounted (and so announced once, ⛔ cut off) until the
//     member moves on.
//   · the answer names the workplace it was SHOWN (`workplaceId` in the body): a stale screen can ⛔ confirm or decline
//     a later suggestion the member never saw — the server refuses a mismatch with 409 `workplace.suggestion_changed`
//     (its own line, `refusal.suggestion_changed`), and the prompts refetch below shows the new one.
//   · the POST is RACED against `ANSWER_TIMEOUT_MS` (`withAnswerTimeout`) — the transport has ⛔ timeout, and a hung
//     answer held "Saving…" (and the parent's guarded actions) for good. A timeout reads as the generic "could not
//     save" line and releases busy (so "Not now" / "I have been transferred" are free again); the key is KEPT
//     (`ok: false`), so a retry of the SAME answer is idempotent; and when the abandoned request does settle, the
//     prompts / history are refetched once more (a late "Yes" may have landed).
//   · (fix-diff review) until that abandoned POST settles, ONLY the SAME answer may be pressed again — the OTHER button
//     stays DISABLED (`abandoned`). Its press would mint a FRESH key and send two concurrent opposite answers from ONE
//     mount (W7's race, which the timeout had made reachable without a second screen).
//   · (fix-diff review) when the abandoned POST settles, its REAL outcome replaces the timeout's "could not save" line
//     — the saved / thank-you line on a 200, the refusal's own line on a refusal, ⛔ line on a transport error — but
//     ONLY while the parent still shows THAT timeout line (a functional `onOutcome` update compared by identity): a
//     newer outcome (a retry, a dismissal, moving on) is ⛔ overwritten.
//   · the shared key cache follows the prompts (`useEvictStaleAnswerKeys`, called by both parents); a failure updates
//     its entry only if it still exists (⛔ a resurrection — `suggestion-answer-key-cache.ts`).

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'

import { useQueryClient } from '@tanstack/react-query'
import { Button, Text, XStack, YStack } from 'tamagui'

import { newIdempotencyKey } from '../../lib/idempotency-key'
import { memberAuth } from '../../lib/member-api'
import { AnswerTimeout, answerKeyFor, answerKeySettled, refusalCopyKey, withAnswerTimeout } from '../../lib/workplace'
import { useWorkplaceT } from '../../lib/workplace-i18n'
import { lifeEventsDeathReportedKey } from '../../lib/death-report-copy'
import { invalidateKnownPeoplePrompts } from '../known-people/known-people-cache'
import { AnnouncedText } from '../peer-request/announce'
import {
  evictAnswerKey,
  evictAnswerKeysExcept,
  getOrCreateAnswerKeyState,
  setAnswerKeyState,
  updateAnswerKeyStateIfPresent,
} from './suggestion-answer-key-cache'
import { workplaceKeys } from './useWorkplaceQueries'

export interface SuggestedWorkplace {
  readonly requestId: string
  readonly workplaceId: string
  readonly name: string
  readonly district: string
}

/** The answer's outcome line — what the PARENT shows (code review round 2: it must outlive this question). */
export interface SuggestionOutcome {
  readonly text: string
  readonly kind: 'status' | 'error'
}

/** The outcome line, SHOWN and SPOKEN (`AnnouncedText`) — rendered by the parent, ⛔ by the question (header above). */
export function SuggestionOutcomeLine({ outcome }: { outcome: SuggestionOutcome }): React.ReactElement {
  return <AnnouncedText text={outcome.text} {...(outcome.kind === 'error' ? { kind: 'error' as const, color: '#C0392B' } : {})} />
}

/**
 * Keep the shared answer-key cache in step with the PROMPTS (code review round 2): whenever the suggestion they show
 * changes — including to none — drop every key that is ⛔ for it (`evictAnswerKeysExcept`). `data === undefined` (⛔
 * read yet) says nothing, so it evicts nothing. Called by BOTH screens that read the prompts (Home, the Workplace
 * screen).
 */
export function useEvictStaleAnswerKeys(data: { readonly suggestedWorkplace: SuggestedWorkplace | null } | undefined): void {
  const known = data !== undefined
  // Primitives (⛔ the suggestion object itself — a new object on every refetch).
  const requestId = data?.suggestedWorkplace?.requestId ?? null
  const workplaceId = data?.suggestedWorkplace?.workplaceId ?? null
  useEffect(() => {
    if (!known) return
    evictAnswerKeysExcept(requestId !== null && workplaceId !== null ? { requestId, workplaceId } : null)
  }, [known, requestId, workplaceId])
}

export function WorkplaceSuggestionQuestion({
  suggestion,
  onAnswered,
  onBusyChange,
  onOutcome,
}: {
  suggestion: SuggestedWorkplace
  onAnswered?: (answer: 'yes' | 'no') => void
  /** Fix-review — told whenever `answer()` starts or settles, so a parent can guard its own concurrent action. */
  onBusyChange?: (busy: boolean) => void
  /**
   * Code review round 2 — the outcome line, for the PARENT to show (`<SuggestionOutcomeLine>`): `null` when a press
   * starts (the previous line is cleared, so a repeat of the same line is spoken again), then the saved / refusal line.
   * A state SETTER (it may be called with an updater — the late settlement of a timed-out POST, header above).
   */
  onOutcome: Dispatch<SetStateAction<SuggestionOutcome | null>>
}) {
  const t = useWorkplaceT()
  // Story 6.38 (DL19): a claim filed for this member's death refuses the answer — the `common` line (⛔ a workplace word).
  const refusalText = (err: unknown): string => {
    const deathKey = lifeEventsDeathReportedKey(err)
    return deathKey !== null ? t(deathKey, undefined, { namespace: 'common' }) : t(refusalCopyKey(err))
  }
  const queryClient = useQueryClient()
  const [busy, setBusy] = useState(false)
  // WHICH answer is in flight — "Saving…" belongs on that button alone (fix-review: it used to show ⛔ on "Yes").
  const [pendingAnswer, setPendingAnswer] = useState<'yes' | 'no' | null>(null)
  // Once a press lands 200 this stays `true` — ⛔ a resend of an already-accepted answer (fix-review).
  const [answered, setAnswered] = useState(false)
  // A synchronous lock: `busy` (React state) has NOT necessarily applied yet when a second tap's handler runs in the
  // SAME tick (two rapid taps before a re-render) — checked-and-set here with no re-render in between (fix-review).
  const inFlight = useRef(false)
  // Fix-diff review — a TIMED-OUT POST that has ⛔ settled yet: its answer, and how many of them are still out (a retry
  // of the same answer can time out too). While set, ONLY that answer may be pressed (header above). The ref is the
  // synchronous guard; the state renders the other button disabled.
  const abandoned = useRef<{ readonly answer: 'yes' | 'no'; readonly pending: number } | null>(null)
  const [abandonedAnswer, setAbandonedAnswer] = useState<'yes' | 'no' | null>(null)

  function setBusyState(v: boolean): void {
    setBusy(v)
    onBusyChange?.(v)
  }

  // Every outcome may have moved the request (a stale suggestion went back for review; a closed one is gone; a changed
  // one shows its new workplace).
  function refresh(): Promise<unknown> {
    return Promise.all([
      invalidateKnownPeoplePrompts(queryClient),
      queryClient.invalidateQueries({ queryKey: workplaceKeys.all }),
      queryClient.invalidateQueries({ queryKey: ['member', 'life-events'] }),
    ]).catch(() => undefined)
  }

  function savedLine(a: 'yes' | 'no'): SuggestionOutcome {
    return { text: a === 'yes' ? t('question.saved_yes', { name: suggestion.name }) : t('question.saved_no'), kind: 'status' }
  }

  /** One abandoned POST has settled — the other answer is free again once the LAST of them has (fix-diff review). */
  function abandonedSettled(): void {
    const left = (abandoned.current?.pending ?? 1) - 1
    abandoned.current = left > 0 && abandoned.current !== null ? { answer: abandoned.current.answer, pending: left } : null
    if (abandoned.current === null) setAbandonedAnswer(null)
  }

  /**
   * The timed-out POST of `a` (shown as `timeoutLine`) has settled after all — report what REALLY happened, but only
   * while the parent still shows `timeoutLine` (⛔ a newer outcome is overwritten; fix-diff review).
   */
  function watchAbandoned(write: Promise<unknown>, a: 'yes' | 'no', timeoutLine: SuggestionOutcome): void {
    const prev = abandoned.current
    abandoned.current = { answer: a, pending: (prev !== null && prev.answer === a ? prev.pending : 0) + 1 }
    setAbandonedAnswer(a)
    void write.then(
      () => {
        abandonedSettled()
        // It landed 200: resolved, exactly as an in-time 200 is.
        evictAnswerKey(suggestion.requestId, suggestion.workplaceId)
        setAnswered(true)
        onOutcome((cur) => (cur === timeoutLine ? savedLine(a) : cur))
        onAnswered?.(a)
        return refresh()
      },
      (err: unknown) => {
        abandonedSettled()
        // A refusal (an HTTP status) has its own words; a transport error says nothing new — the line is dropped.
        const refused = typeof (err as { status?: unknown } | null)?.status === 'number'
        onOutcome((cur) => (cur === timeoutLine ? (refused ? { text: refusalText(err), kind: 'error' } : null) : cur))
        return refresh()
      },
    )
  }

  async function answer(a: 'yes' | 'no'): Promise<void> {
    if (inFlight.current) return
    // Fix-diff review — ⛔ the OTHER answer while a timed-out POST is still out (W7's race from ONE mount).
    if (abandoned.current !== null && abandoned.current.answer !== a) return
    inFlight.current = true
    // Read the SHARED state fresh (⛔ a snapshot captured at mount / render time) — a concurrent mount of the same
    // suggestion may have just written to it.
    const current = getOrCreateAnswerKeyState(suggestion.requestId, suggestion.workplaceId, newIdempotencyKey)
    const next = answerKeyFor(current, a, newIdempotencyKey)
    setAnswerKeyState(suggestion.requestId, suggestion.workplaceId, next.state)
    setPendingAnswer(a)
    setBusyState(true)
    onOutcome(null)
    let write: Promise<unknown> | undefined
    try {
      // Code review round 2 — the answer names the workplace it was shown; raced against a bound (header above).
      write = memberAuth.answerWorkplaceSuggestion(suggestion.requestId, a, suggestion.workplaceId, next.key)
      await withAnswerTimeout(write)
      // Answered 200 — this suggestion is resolved; forget its key so nothing (a stale concurrent mount) reuses it.
      evictAnswerKey(suggestion.requestId, suggestion.workplaceId)
      setAnswered(true)
      onOutcome(savedLine(a))
      onAnswered?.(a)
    } catch (e) {
      // ⛔ `setAnswerKeyState`: an entry a sibling's 200 (or the prompts) evicted meanwhile stays gone (round 2).
      updateAnswerKeyStateIfPresent(suggestion.requestId, suggestion.workplaceId, answerKeySettled(next.state, false))
      const line: SuggestionOutcome = { text: refusalText(e), kind: 'error' }
      onOutcome(line)
      // A timed-out POST was only abandoned — when it does settle, report what really happened and look again.
      if (e instanceof AnswerTimeout && write !== undefined) watchAbandoned(write, a, line)
    } finally {
      setBusyState(false)
      setPendingAnswer(null)
      inFlight.current = false
      // Every outcome may have moved the request — incl. `suggestion_changed`, whose refetch shows the NEW suggestion.
      await refresh()
    }
  }

  const disabled = busy || answered
  // Fix-diff review — while a timed-out POST is out, the OTHER answer is disabled too (⛔ an enabled no-op).
  const yesDisabled = disabled || (abandonedAnswer !== null && abandonedAnswer !== 'yes')
  const noDisabled = disabled || (abandonedAnswer !== null && abandonedAnswer !== 'no')

  return (
    <YStack gap="$3">
      <Text accessible accessibilityRole="text" fontFamily="$body" fontSize="$4">
        {t('question.text', { name: suggestion.name, district: suggestion.district })}
      </Text>
      <XStack gap="$3">
        <Button
          flex={1}
          theme="accent"
          height={56}
          accessibilityRole="button"
          disabled={yesDisabled}
          accessibilityState={{ disabled: yesDisabled }}
          onPress={() => void answer('yes')}
        >
          {pendingAnswer === 'yes' ? t('question.saving') : t('question.yes')}
        </Button>
        <Button
          flex={1}
          height={56}
          accessibilityRole="button"
          disabled={noDisabled}
          accessibilityState={{ disabled: noDisabled }}
          onPress={() => void answer('no')}
        >
          {pendingAnswer === 'no' ? t('question.saving') : t('question.no')}
        </Button>
      </XStack>
    </YStack>
  )
}
