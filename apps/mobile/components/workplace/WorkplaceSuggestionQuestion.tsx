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

import { useRef, useState } from 'react'

import { useQueryClient } from '@tanstack/react-query'
import { Button, Text, XStack, YStack } from 'tamagui'

import { newIdempotencyKey } from '../../lib/idempotency-key'
import { memberAuth } from '../../lib/member-api'
import { answerKeyFor, answerKeySettled, refusalCopyKey } from '../../lib/workplace'
import { useWorkplaceT } from '../../lib/workplace-i18n'
import { invalidateKnownPeoplePrompts } from '../known-people/known-people-cache'
import { AnnouncedText } from '../peer-request/announce'
import { evictAnswerKey, getOrCreateAnswerKeyState, setAnswerKeyState } from './suggestion-answer-key-cache'
import { workplaceKeys } from './useWorkplaceQueries'

export interface SuggestedWorkplace {
  readonly requestId: string
  readonly workplaceId: string
  readonly name: string
  readonly district: string
}

export function WorkplaceSuggestionQuestion({
  suggestion,
  onAnswered,
  onBusyChange,
}: {
  suggestion: SuggestedWorkplace
  onAnswered?: (answer: 'yes' | 'no') => void
  /** Fix-review — told whenever `answer()` starts or settles, so a parent can guard its own concurrent action. */
  onBusyChange?: (busy: boolean) => void
}) {
  const t = useWorkplaceT()
  const queryClient = useQueryClient()
  const [busy, setBusy] = useState(false)
  // WHICH answer is in flight — "Saving…" belongs on that button alone (fix-review: it used to show ⛔ on "Yes").
  const [pendingAnswer, setPendingAnswer] = useState<'yes' | 'no' | null>(null)
  // Once a press lands 200 this stays `true` — ⛔ a resend of an already-accepted answer (fix-review).
  const [answered, setAnswered] = useState(false)
  const [message, setMessage] = useState<{ text: string; kind: 'status' | 'error' } | null>(null)
  // A synchronous lock: `busy` (React state) has NOT necessarily applied yet when a second tap's handler runs in the
  // SAME tick (two rapid taps before a re-render) — checked-and-set here with no re-render in between (fix-review).
  const inFlight = useRef(false)

  function setBusyState(v: boolean): void {
    setBusy(v)
    onBusyChange?.(v)
  }

  async function answer(a: 'yes' | 'no'): Promise<void> {
    if (inFlight.current) return
    inFlight.current = true
    // Read the SHARED state fresh (⛔ a snapshot captured at mount / render time) — a concurrent mount of the same
    // suggestion may have just written to it.
    const current = getOrCreateAnswerKeyState(suggestion.requestId, suggestion.workplaceId, newIdempotencyKey)
    const next = answerKeyFor(current, a, newIdempotencyKey)
    setAnswerKeyState(suggestion.requestId, suggestion.workplaceId, next.state)
    setPendingAnswer(a)
    setBusyState(true)
    setMessage(null)
    try {
      await memberAuth.answerWorkplaceSuggestion(suggestion.requestId, a, next.key)
      // Answered 200 — this requestId is resolved; forget its key so nothing (a stale concurrent mount) reuses it.
      evictAnswerKey(suggestion.requestId)
      setAnswered(true)
      setMessage({ text: a === 'yes' ? t('question.saved_yes', { name: suggestion.name }) : t('question.saved_no'), kind: 'status' })
      onAnswered?.(a)
    } catch (e) {
      setAnswerKeyState(suggestion.requestId, suggestion.workplaceId, answerKeySettled(next.state, false))
      setMessage({ text: t(refusalCopyKey(e)), kind: 'error' })
    } finally {
      setBusyState(false)
      setPendingAnswer(null)
      inFlight.current = false
      // Every outcome may have moved the request (a stale suggestion went back for review; a closed one is gone).
      await Promise.all([
        invalidateKnownPeoplePrompts(queryClient),
        queryClient.invalidateQueries({ queryKey: workplaceKeys.all }),
        queryClient.invalidateQueries({ queryKey: ['member', 'life-events'] }),
      ]).catch(() => undefined)
    }
  }

  const disabled = busy || answered

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
          disabled={disabled}
          accessibilityState={{ disabled }}
          onPress={() => void answer('yes')}
        >
          {pendingAnswer === 'yes' ? t('question.saving') : t('question.yes')}
        </Button>
        <Button
          flex={1}
          height={56}
          accessibilityRole="button"
          disabled={disabled}
          accessibilityState={{ disabled }}
          onPress={() => void answer('no')}
        >
          {pendingAnswer === 'no' ? t('question.saving') : t('question.no')}
        </Button>
      </XStack>
      {message ? <AnnouncedText text={message.text} {...(message.kind === 'error' ? { kind: 'error' as const, color: '#C0392B' } : {})} /> : null}
    </YStack>
  )
}
