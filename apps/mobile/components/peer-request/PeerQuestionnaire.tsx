// ONE request's questionnaire — the in-screen pages, the save line, the closing note and the Thank-you (Story 6.27a PM7,
// PM11; BigDev 2026-10-10: *"Ask 2 or 3 questions at a time on screen with auto save feature, A note at the end before
// Submit. Also, Submit button just redirect user to Thank You page, because answers were already saved"*).
//
// ⭐ IN-SCREEN STATE, ⛔ never a new route file (6.30 AL16 — 6.27a's choice, narrower than AL16). A GENERIC renderer per
// question `kind`, driven by the SERVER's definition: the question words come from the server in en AND hi (a new
// version needs ⛔ no app release); only the chrome is in the app's catalog. Each answer is SAVED the moment it is chosen;
// the line under the page says Saved / Saving / *"Not saved — retrying"* — a failed save RETRIES with the same
// Idempotency-Key (⛔ never lost silently). The closing note and the Thank-you are the server's words (VERBATIM, `-304`
// Q6 A). ⛔ No claim, ⛔ no family, ⛔ no amount — the member's name only. Pure decisions live in `lib/peer-request.ts`.
// ⚠ Memos depend on `locale`, ⛔ never on `t` (`useT()` is a fresh closure every render — [[project_uset_fresh_closure_memo_trap]]).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { Button, Input, Paragraph, Text, XStack, YStack } from 'tamagui'
import { useLocale } from '@twt/i18n/react'

import type { PeerRequestAnswerValue, PeerRequestDetailResponse, PeerRequestQuestion } from '@twt/contracts'

import { useClaimT } from '../../lib/claim-i18n'
import {
  answersToMap,
  canLeavePage,
  classifyFailure,
  newIdempotencyKey,
  parseDisplayDate,
  retryDelayMs,
  toDisplayDate,
  todayInIst,
  toggleOption,
  visiblePages,
  wordsIn,
  type SaveLine,
} from '../../lib/peer-request'
import { CallHelplineCTA } from '../common/CallHelplineCTA'
import { PeerRequestNotOpenable } from './PeerRequestNotOpenable'
import { usePeerRequestQuery, useSavePeerAnswer, useSubmitPeerReply } from './usePeerRequestQueries'

type Phase = 'pages' | 'closing' | 'thanks' | 'not_openable' | 'no_longer_open'

export function PeerQuestionnaire({
  pariwarId,
  pingId,
  onBack,
}: {
  readonly pariwarId: string
  readonly pingId: string
  readonly onBack: () => void
}): React.ReactElement {
  const t = useClaimT()
  const { data, isLoading, error, refetch } = usePeerRequestQuery(pariwarId, pingId)

  if (isLoading) return <Paragraph p="$4">{t('peer_request.loading')}</Paragraph>
  if (error || !data) {
    const failure = classifyFailure(error)
    if (failure === 'not_openable') return <PeerRequestNotOpenable messageKey="peer_request.not_openable" />
    if (failure === 'no_longer_open' || failure === 'submitted') return <PeerRequestNotOpenable messageKey="peer_request.no_longer_open" />
    return (
      <YStack p="$4" gap="$3">
        <Paragraph>{t('peer_request.load_error')}</Paragraph>
        <Button onPress={() => void refetch()} accessibilityRole="button">
          {t('peer_request.try_again')}
        </Button>
        <CallHelplineCTA />
      </YStack>
    )
  }
  return <Questionnaire pariwarId={pariwarId} pingId={pingId} detail={data} onBack={onBack} />
}

function Questionnaire({
  pariwarId,
  pingId,
  detail,
  onBack,
}: {
  readonly pariwarId: string
  readonly pingId: string
  readonly detail: PeerRequestDetailResponse
  readonly onBack: () => void
}): React.ReactElement {
  const t = useClaimT()
  const router = useRouter()
  const { locale } = useLocale()
  const save = useSavePeerAnswer(pariwarId, pingId)
  const submit = useSubmitPeerReply(pariwarId, pingId)

  const [answers, setAnswers] = useState<Map<string, PeerRequestAnswerValue>>(() => answersToMap(detail.answers))
  const [pageIndex, setPageIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('pages')
  const [saveLine, setSaveLine] = useState<SaveLine>('idle')
  const [notice, setNotice] = useState<string | null>(null)
  const pending = useRef(0)
  const mounted = useRef(true)
  const submitKey = useRef(newIdempotencyKey())
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const pages = useMemo(() => visiblePages(detail, answers), [detail, answers])
  const page = pages[Math.min(pageIndex, Math.max(0, pages.length - 1))] ?? []

  /** Save ONE answer; retry with the SAME key until it lands or the request turns out closed. */
  const saveAnswer = useCallback(
    async (questionKey: string, value: PeerRequestAnswerValue) => {
      setAnswers((prev) => new Map(prev).set(questionKey, value))
      setNotice(null)
      pending.current += 1
      setSaveLine('saving')
      const idempotencyKey = newIdempotencyKey()
      for (let attempt = 1; mounted.current; attempt += 1) {
        try {
          const res = await save.mutateAsync({ questionKey, value, idempotencyKey })
          if (!mounted.current) return
          // The server's live answers are authoritative (a changed condition drops its dependants).
          setAnswers(answersToMap(res.answers))
          break
        } catch (err) {
          const failure = classifyFailure(err)
          if (failure === 'retry') {
            setSaveLine('retrying')
            await new Promise((r) => setTimeout(r, retryDelayMs(attempt)))
            continue
          }
          if (failure === 'not_openable') setPhase('not_openable')
          else if (failure === 'no_longer_open' || failure === 'submitted') setPhase('no_longer_open')
          else setNotice(t('peer_request.invalid'))
          break
        }
      }
      pending.current -= 1
      if (mounted.current) setSaveLine(pending.current > 0 ? 'saving' : 'saved')
    },
    // `t` is deliberately absent — it is a fresh closure each render; `locale` drives re-resolution.
    [save.mutateAsync, locale],
  )

  if (phase === 'not_openable') return <PeerRequestNotOpenable messageKey="peer_request.not_openable" />
  if (phase === 'no_longer_open') return <PeerRequestNotOpenable messageKey="peer_request.no_longer_open" />

  if (phase === 'thanks') {
    return (
      <YStack flex={1} p="$4" gap="$4" justify="center">
        <Paragraph size="$6" accessibilityRole="header">
          {wordsIn(detail.questionnaire.thankYou, locale)}
        </Paragraph>
        <Button theme="accent" onPress={() => router.replace('/(tabs)')} accessibilityRole="button">
          {t('peer_request.done')}
        </Button>
      </YStack>
    )
  }

  const busy = saveLine === 'saving' || saveLine === 'retrying'

  if (phase === 'closing') {
    return (
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <Paragraph size="$5">{wordsIn(detail.questionnaire.closingNote, locale)}</Paragraph>
        <SaveLineText line={saveLine} />
        <XStack gap="$3">
          <Button onPress={() => setPhase('pages')} accessibilityRole="button">
            {t('peer_request.back')}
          </Button>
          <Button
            theme="accent"
            disabled={busy || submit.isPending}
            accessibilityRole="button"
            onPress={() =>
              void submit
                .mutateAsync(submitKey.current)
                .then(() => mounted.current && setPhase('thanks'))
                .catch((err: unknown) => {
                  const failure = classifyFailure(err)
                  if (failure === 'submitted') setPhase('thanks')
                  else if (failure === 'no_longer_open') setPhase('no_longer_open')
                  else if (failure === 'not_openable') setPhase('not_openable')
                  else setSaveLine('retrying')
                })
            }
          >
            {t('peer_request.submit')}
          </Button>
        </XStack>
      </ScrollView>
    )
  }

  const isLast = pageIndex >= pages.length - 1
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      <Text fontSize="$6" fontWeight="600" accessibilityRole="header">
        {t('peer_request.title')}
      </Text>
      <Text fontSize="$2" color="$colorPress">
        {t('peer_request.page_of', { page: String(Math.min(pageIndex, pages.length - 1) + 1), pages: String(pages.length) })}
      </Text>
      {page.map((q) => (
        <QuestionField key={q.key} question={q} value={answers.get(q.key)} locale={locale} onAnswer={(v) => void saveAnswer(q.key, v)} />
      ))}
      {notice !== null && (
        <Text fontSize="$2" color="$red10" accessibilityRole="alert">
          {notice}
        </Text>
      )}
      <SaveLineText line={saveLine} />
      <XStack gap="$3">
        <Button onPress={() => (pageIndex === 0 ? onBack() : setPageIndex(pageIndex - 1))} accessibilityRole="button">
          {t('peer_request.back')}
        </Button>
        <Button
          theme="accent"
          accessibilityRole="button"
          onPress={() => {
            if (!canLeavePage(page, answers)) {
              setNotice(t('peer_request.required'))
              return
            }
            setNotice(null)
            if (isLast) setPhase('closing')
            else setPageIndex(pageIndex + 1)
          }}
        >
          {t('peer_request.next')}
        </Button>
      </XStack>
      <CallHelplineCTA />
    </ScrollView>
  )
}

function SaveLineText({ line }: { readonly line: SaveLine }): React.ReactElement | null {
  const t = useClaimT()
  if (line === 'idle') return null
  const key = line === 'saved' ? 'peer_request.saved' : line === 'saving' ? 'peer_request.saving' : 'peer_request.not_saved_retrying'
  return (
    <Text fontSize="$2" color={line === 'retrying' ? '$red10' : '$colorPress'} accessibilityRole="text" accessibilityLiveRegion="polite">
      {t(key)}
    </Text>
  )
}

/** The GENERIC renderer — one per question `kind` (single / multi / yes_no / date). */
function QuestionField({
  question,
  value,
  locale,
  onAnswer,
}: {
  readonly question: PeerRequestQuestion
  readonly value: PeerRequestAnswerValue | undefined
  readonly locale: string
  readonly onAnswer: (v: PeerRequestAnswerValue) => void
}): React.ReactElement {
  const t = useClaimT()
  const label = wordsIn(question.words, locale)
  const selectedCodes = value !== undefined && 'codes' in value ? value.codes : []
  const [dateText, setDateText] = useState(value !== undefined && 'date' in value ? toDisplayDate(value.date) : '')
  const [dateError, setDateError] = useState(false)

  return (
    <YStack gap="$2">
      <Text fontSize="$4" fontWeight="500" color="$color">
        {label}
      </Text>
      {question.kind === 'date' && (
        <YStack gap="$2">
          <Input
            value={dateText}
            onChangeText={setDateText}
            placeholder={t('peer_request.date_hint')}
            keyboardType="numbers-and-punctuation"
            accessibilityLabel={label}
          />
          {dateError && (
            <Text fontSize="$2" color="$red10" accessibilityRole="alert">
              {t('peer_request.date_invalid')}
            </Text>
          )}
          <Button
            accessibilityRole="button"
            onPress={() => {
              const iso = parseDisplayDate(dateText, todayInIst(new Date()))
              setDateError(iso === null)
              if (iso !== null) onAnswer({ date: iso })
            }}
          >
            {t('peer_request.date_save')}
          </Button>
        </YStack>
      )}
      {question.options.map((o) => {
        const selected = selectedCodes.includes(o.code)
        return (
          <Button
            key={o.code}
            theme={selected ? 'accent' : undefined}
            accessibilityRole={question.kind === 'multi' ? 'checkbox' : 'radio'}
            accessibilityState={{ selected }}
            accessibilityLabel={wordsIn(o.words, locale)}
            height="auto"
            py="$2"
            onPress={() => {
              const next = toggleOption(question, value, o.code)
              if (next !== null) onAnswer(next)
            }}
          >
            {wordsIn(o.words, locale)}
          </Button>
        )
      })}
    </YStack>
  )
}
