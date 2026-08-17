// Poll answer screen — Story 10.15 (Task 9; AC6).
//
// Renders one poll's questions and collects the member's answers. Every non-trivial decision lives in
// `components/polls/copy.ts` (pure, unit-tested) rather than here, because the mobile harness is pure
// Vitest with NO RN mount renderer — a `.tsx` cannot be tested, so it must not hold logic.
//
// ── ONE ANSWER, FINAL (LBD-6) ────────────────────────────────────────────────────────────────
// The screen says so BEFORE the member submits, not after. A member who answers by mistake has no
// undo — the honest thing is to tell them while it is still a choice. A second submission is a typed
// 409 from the server; a network RETRY carries the same `Idempotency-Key` and replays the original
// success, which is why that key is generated once per mount and never per tap.
//
// ⚠ The draft is component state only — deliberately NOT persisted to MMKV (see copy.ts): a
// half-finished draft resumed days later would submit against a poll that has since closed, and
// free-text answers are PII tier 3 with no reason to sit in device storage.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ScrollView } from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { Button, Text, TextArea, XStack, YStack } from 'tamagui'
import { useLocale } from '@twt/i18n/react'

import type { SurveyQuestion } from '@twt/contracts'

import { ApiError } from '@twt/api-client'
import { useSession } from '../../lib/session-context'
import { usePollT } from '../../lib/poll-i18n'
import { getTurnstileToken } from '../../lib/turnstile'
import {
  canSubmit,
  isOptionSelected,
  newIdempotencyKey,
  selectOptionText,
  selectQuestionText,
  selectSurveyCopy,
  setText,
  textValue,
  toSubmitPayload,
  toggleOption,
  unansweredQuestionIds,
  type AnswerDraft,
} from '../../components/polls/copy'
import { flattenPolls, usePollsQuery, useSubmitPollResponse } from '../../components/polls/usePollQueries'

export default function PollAnswerScreen(): React.ReactElement {
  const t = usePollT()
  const router = useRouter()
  const { locale } = useLocale()
  const { session } = useSession()
  const pariwarId = session?.pariwarId
  const { surveyId } = useLocalSearchParams<{ surveyId: string }>()

  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } = usePollsQuery(pariwarId)
  const submit = useSubmitPollResponse(pariwarId)

  const [draft, setDraft] = useState<AnswerDraft>({})
  const [notice, setNotice] = useState<string | null>(null)
  const [showMissing, setShowMissing] = useState(false)
  // [Review][Patch] — code review of 10-15-survey-poll (2026-08-17): `setNotice(t('submitted'));
  // router.back()` used to fire back-to-back on success — `router.back()` unmounts this screen
  // before the member has any chance to see the notice render, so the one confirmation that matters
  // most (a FINAL, un-undoable submission — LBD-6) was never actually visible. `submitted` now gates
  // a static confirmation view (mirroring the `alreadyAnswered` branch below) with its own explicit
  // Back button, instead of auto-navigating away.
  const [submitted, setSubmitted] = useState(false)

  // ⭐ ONCE per mount, never per tap. A key regenerated on each attempt would turn a network retry
  // into a second submission the server 409s; a stable key replays the original 201.
  const idempotencyKey = useMemo(() => newIdempotencyKey(), [])

  const polls = flattenPolls(data)
  const survey = polls.find((s) => s.survey_id === surveyId) ?? null
  // [Review][Patch] — code review of 10-15-survey-poll (2026-08-17): the member surface is now
  // paginated (see `usePollsQuery`) — a poll opened via a deep link/notification rather than a tap
  // on an already-loaded list row could be sitting past the first page. Keep fetching while the
  // target isn't found and more pages remain, rather than reporting "not found" for a poll that
  // genuinely exists just past page 1.
  useEffect(() => {
    if (!survey && hasNextPage && !isFetchingNextPage && !isLoading) void fetchNextPage()
  }, [survey, hasNextPage, isFetchingNextPage, isLoading, fetchNextPage])

  const questions: SurveyQuestion[] = survey?.questions ?? []
  const missing = useMemo(() => new Set(unansweredQuestionIds(questions, draft)), [questions, draft])

  // [Review][Patch] — code review of 10-15-survey-poll (2026-08-17): a member could tap Back while
  // `onSubmit`'s async flow was still in flight (only Submit was disabled during `isPending`,
  // Back never was), unmounting the screen before `mutateAsync` settled — its `then`/`catch`
  // continuation then calls `setNotice`/`setSubmitted` against an unmounted component. Guarded via a
  // mounted ref rather than disabling Back outright, so backing out mid-submit still works instantly.
  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const onSubmit = useCallback(async () => {
    if (!survey) return
    if (!canSubmit(questions, draft)) {
      // Surfaced per question rather than as one blanket error — the member needs to know WHICH
      // question they missed. (The server's own check is still the authority; this is an affordance.)
      setShowMissing(true)
      return
    }
    setNotice(null)
    try {
      await submit.mutateAsync({
        surveyId: survey.survey_id,
        answers: toSubmitPayload(questions, draft),
        turnstileToken: await getTurnstileToken(),
        idempotencyKey,
      })
      if (!mountedRef.current) return
      setNotice(t('submitted'))
      setSubmitted(true)
    } catch (err) {
      if (!mountedRef.current) return
      if (err instanceof ApiError) {
        // The two 409s mean different things to the member and must read differently.
        if (err.code === 'survey.already_responded') setNotice(t('already_answered'))
        else if (err.code === 'survey.invalid_state') setNotice(t('closed_now'))
        else setNotice(t('submit_error'))
        return
      }
      setNotice(t('submit_error'))
    }
  }, [survey, questions, draft, submit, idempotencyKey, t])

  // [Review][Patch] — code review of 10-15-survey-poll (2026-08-17): `enabled: !!pariwarId` (see
  // `usePollsQuery`) means `isLoading` is FALSE while the session is still resolving `pariwarId` —
  // this used to fall straight to `list_error`, a false "couldn't load" for a poll that hasn't been
  // asked for yet. `pending` distinguishes the two.
  const pending = isLoading || !pariwarId

  // Loading / error / not-found — plain branches; there is no FlatList on this screen, but the same
  // "render the empty state as its own branch" discipline keeps the populated tree simple.
  // ⚠ Still fetching further pages looking for `survey` (see the effect above) counts as pending too.
  if (pending || isError || (!survey && (hasNextPage || isFetchingNextPage))) {
    return (
      <YStack flex={1} bg="$background" items="center" justify="center" px="$6" gap="$3">
        <Stack.Screen options={{ headerShown: false }} />
        <Text fontSize="$4" color="$colorPress" text="center" accessibilityRole="text">
          {pending || isFetchingNextPage ? t('loading') : t('list_error')}
        </Text>
        <Button size="$3" onPress={() => router.back()} accessibilityRole="button">
          {t('back')}
        </Button>
      </YStack>
    )
  }

  if (!survey) {
    return (
      <YStack flex={1} bg="$background" items="center" justify="center" px="$6" gap="$3">
        <Stack.Screen options={{ headerShown: false }} />
        <Text fontSize="$4" color="$colorPress" text="center" accessibilityRole="text">
          {t('list_error')}
        </Text>
        <Button size="$3" onPress={() => router.back()} accessibilityRole="button">
          {t('back')}
        </Button>
      </YStack>
    )
  }

  if (submitted) {
    return (
      <YStack flex={1} bg="$background" items="center" justify="center" px="$6" gap="$3">
        <Stack.Screen options={{ headerShown: false }} />
        <Text fontSize="$4" color="$color" text="center" accessibilityRole="alert">
          {notice}
        </Text>
        <Button size="$3" onPress={() => router.back()} accessibilityRole="button">
          {t('back')}
        </Button>
      </YStack>
    )
  }

  const { title, body } = selectSurveyCopy(survey, locale)
  const alreadyAnswered = survey.answered

  return (
    <YStack flex={1} bg="$background">
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <Text fontSize="$7" fontWeight="600" color="$color">
          {title}
        </Text>
        {body !== '' && (
          <Text fontSize="$3" color="$colorPress">
            {body}
          </Text>
        )}
        {/* ⭐ LBD-1 + LBD-6, stated BEFORE the member commits. */}
        <Text fontSize="$2" color="$colorPress">
          {t('advisory_notice')}
        </Text>
        <Text fontSize="$2" color="$colorPress">
          {t('one_answer_notice')}
        </Text>

        {alreadyAnswered ? (
          <YStack gap="$3">
            <Text fontSize="$4" color="$color" accessibilityRole="text">
              {t('view_answered')}
            </Text>
            <Button onPress={() => router.back()} accessibilityRole="button">
              {t('back')}
            </Button>
          </YStack>
        ) : (
          <>
            {questions.map((q) => (
              <YStack key={q.question_id} gap="$2">
                <Text fontSize="$4" fontWeight="500" color="$color">
                  {selectQuestionText(q, locale)}
                </Text>
                <Text fontSize="$1" color="$colorPress">
                  {q.type === 'single_choice'
                    ? t('choose_one')
                    : q.type === 'multi_choice'
                      ? t('choose_any')
                      : t('write_answer')}
                </Text>

                {q.type === 'free_text' ? (
                  <TextArea
                    value={textValue(draft, q.question_id)}
                    onChangeText={(text) => setDraft((d) => setText(d, q.question_id, text))}
                    accessibilityLabel={selectQuestionText(q, locale)}
                  />
                ) : (
                  (q.options ?? []).map((o) => {
                    const selected = isOptionSelected(draft, q.question_id, o.option_id)
                    return (
                      <Button
                        key={o.option_id}
                        theme={selected ? 'accent' : undefined}
                        onPress={() => setDraft((d) => toggleOption(d, q, o.option_id))}
                        accessibilityRole={q.type === 'single_choice' ? 'radio' : 'checkbox'}
                        accessibilityState={{ selected }}
                        accessibilityLabel={selectOptionText(o, locale)}
                      >
                        {selectOptionText(o, locale)}
                      </Button>
                    )
                  })
                )}

                {showMissing && missing.has(q.question_id) && (
                  <Text fontSize="$1" color="$red10" accessibilityRole="alert">
                    {t('unanswered_question')}
                  </Text>
                )}
              </YStack>
            ))}

            {notice && (
              <Text fontSize="$3" color="$color" accessibilityRole="alert">
                {notice}
              </Text>
            )}

            <XStack gap="$3">
              <Button
                theme="accent"
                disabled={submit.isPending}
                onPress={() => void onSubmit()}
                accessibilityRole="button"
                accessibilityLabel={t('submit')}
              >
                {submit.isPending ? t('submitting') : t('submit')}
              </Button>
              <Button onPress={() => router.back()} accessibilityRole="button">
                {t('back')}
              </Button>
            </XStack>
          </>
        )}
      </ScrollView>
    </YStack>
  )
}
