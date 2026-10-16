// The ONE confirm question for a Pariwar Admin's suggested workplace (Story 6.36c, Task 6.2 / 6.5; AC4, AC6 (c); RV10).
//
// *"We think your workplace is {name}, {district}. Is that right?"* with *"Yes"* / *"No"* — asked on the home (card (c))
// and at the top of Life Events → Workplace, both driven by the PROMPTS' `suggestedWorkplace` (RV1 (i) — ⛔ the history's
// ungated `request.suggested`). ⭐ The member's own act: *"Yes"* writes a posting; a suggestion alone changes nothing.
// The Idempotency-Key: minted when the question is SHOWN (the caller remounts it — `key` — for a new suggestion), reused
// ONLY for a retry of the same press (`answerKeyFor`). Each press is its own `mutateAsync`-free call (⛔ `mutate()`
// callbacks — only the latest call's fire). A success refetches the prompts, the history and the Life Events summary.

import { useRef, useState } from 'react'

import { useQueryClient } from '@tanstack/react-query'
import { Button, Text, XStack, YStack } from 'tamagui'

import { newIdempotencyKey } from '../../lib/idempotency-key'
import { memberAuth } from '../../lib/member-api'
import { answerKeyFor, answerKeySettled, freshAnswerKeyState, refusalCopyKey, type AnswerKeyState } from '../../lib/workplace'
import { useWorkplaceT } from '../../lib/workplace-i18n'
import { invalidateKnownPeoplePrompts } from '../known-people/known-people-cache'
import { AnnouncedText } from '../peer-request/announce'
import { workplaceKeys } from './useWorkplaceQueries'

export interface SuggestedWorkplace {
  readonly requestId: string
  readonly workplaceId: string
  readonly name: string
  readonly district: string
}

export function WorkplaceSuggestionQuestion({ suggestion, onAnswered }: { suggestion: SuggestedWorkplace; onAnswered?: (answer: 'yes' | 'no') => void }) {
  const t = useWorkplaceT()
  const queryClient = useQueryClient()
  // Lazily — `useRef(x)` evaluates `x` on EVERY render; the key is minted once, when the question is shown.
  const keys = useRef<AnswerKeyState | null>(null)
  if (keys.current === null) keys.current = freshAnswerKeyState(newIdempotencyKey)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ text: string; kind: 'status' | 'error' } | null>(null)

  async function answer(a: 'yes' | 'no'): Promise<void> {
    const next = answerKeyFor(keys.current!, a, newIdempotencyKey)
    keys.current = next.state
    setBusy(true)
    setMessage(null)
    try {
      await memberAuth.answerWorkplaceSuggestion(suggestion.requestId, a, next.key)
      keys.current = answerKeySettled(keys.current!, true)
      setMessage({ text: a === 'yes' ? t('question.saved_yes', { name: suggestion.name }) : t('question.saved_no'), kind: 'status' })
      onAnswered?.(a)
    } catch (e) {
      keys.current = answerKeySettled(keys.current!, false)
      setMessage({ text: t(refusalCopyKey(e)), kind: 'error' })
    } finally {
      setBusy(false)
      // Every outcome may have moved the request (a stale suggestion went back for review; a closed one is gone).
      await Promise.all([
        invalidateKnownPeoplePrompts(queryClient),
        queryClient.invalidateQueries({ queryKey: workplaceKeys.all }),
        queryClient.invalidateQueries({ queryKey: ['member', 'life-events'] }),
      ]).catch(() => undefined)
    }
  }

  return (
    <YStack gap="$3">
      <Text accessible accessibilityRole="text" fontFamily="$body" fontSize="$4">
        {t('question.text', { name: suggestion.name, district: suggestion.district })}
      </Text>
      <XStack gap="$3">
        <Button flex={1} theme="accent" height={56} accessibilityRole="button" disabled={busy} accessibilityState={{ disabled: busy }} onPress={() => void answer('yes')}>
          {busy ? t('question.saving') : t('question.yes')}
        </Button>
        <Button flex={1} height={56} accessibilityRole="button" disabled={busy} accessibilityState={{ disabled: busy }} onPress={() => void answer('no')}>
          {t('question.no')}
        </Button>
      </XStack>
      {message ? <AnnouncedText text={message.text} {...(message.kind === 'error' ? { kind: 'error' as const, color: '#C0392B' } : {})} /> : null}
    </YStack>
  )
}
