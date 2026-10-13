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
// ⭐ Second-pass review: every state the story made reachable is SPOKEN (S28 — `announce.tsx`), and a page or phase change
// is announced and starts at the top (S29); single choices are a labelled radio group whose chosen option is `checked`
// (S30); the member is ⛔ never trapped — a refused answer is NAMED and can be given up for the saved one, and a member
// who cannot save (offline) may leave after saying so (S32); Android's back steps back through the pages (S33); a typed
// but unsaved date is an unresolved edit (S35); a fast second tap builds on the first (S37); a saved answer that could
// ⛔ not be shown counts as answered (S38); the helpline is on the closing page too (S40).

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { BackHandler, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { useNavigation, usePreventRemove } from '@react-navigation/native'
import { PeerAnswerEditor } from '@twt/api-client'
import { Button, Input, Paragraph, Text, XStack, YStack } from 'tamagui'
import { useLocale } from '@twt/i18n/react'

import type { PeerRequestAnswerValue, PeerRequestDetailResponse, PeerRequestQuestion } from '@twt/contracts'

import { useClaimT } from '../../lib/claim-i18n'
import {
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
import { AnnouncedText, useAnnounceOnChange } from './announce'
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
  const status = (error as { status?: number } | null)?.status
  // Keep the existing editor through a transient background GET failure; its saves still settle.
  const retainLoaded = data !== undefined && classifyFailure(error) === 'retry' && status !== 401 && status !== 403
  if ((error && !retainLoaded) || !data) {
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
  const navigation = useNavigation()
  const { locale } = useLocale()
  const save = useSavePeerAnswer(pariwarId, pingId)
  const submit = useSubmitPeerReply(pariwarId, pingId)

  const [pageIndex, setPageIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>(() => detail.submitted ? 'no_longer_open' : 'pages')
  const [notice, setNotice] = useState<string | null>(null)
  const [submitFailed, setSubmitFailed] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  // A date TYPED but ⛔ saved — an unresolved edit, ⛔ silently dropped (review S35).
  const [dirtyDates, setDirtyDates] = useState<ReadonlySet<string>>(new Set())
  // The member chose to leave with saves unresolved: where to, once the guard is lifted (review S32).
  const [leaveTo, setLeaveTo] = useState<(() => void) | null>(null)
  const [allowLeave, setAllowLeave] = useState(false)
  const pendingLeave = useRef<(() => void) | null>(null)
  const submitting = useRef(false)
  const saveRef = useRef(save.mutateAsync)
  saveRef.current = save.mutateAsync
  const initialAnswers = useRef(detail.answers)
  const allQuestions = useMemo(() => detail.questionnaire.pages.flatMap((p) => p.questions), [detail])
  const [editor] = useState(() => new PeerAnswerEditor(detail.answers, {
    save: (task) => saveRef.current(task),
    newKey: newIdempotencyKey,
    shouldRetry: (err) => classifyFailure(err) === 'retry',
    wait: (attempt) => new Promise((resolve) => setTimeout(resolve, retryDelayMs(attempt))),
    questions: allQuestions,
  }))
  const state = useSyncExternalStore(editor.subscribe, editor.getSnapshot)
  const answers = useMemo(() => new Map([...state.answers].flatMap(([key, value]) =>
    'unavailable' in value ? [] : [[key, value] as const],
  )), [state.answers])
  const saveLine: SaveLine = state.saveLine
  const mounted = useRef(true)
  // ONE key for this reply's Submit, minted once (⛔ a throwaway per render — review S37).
  const submitKey = useRef<string | null>(null)
  submitKey.current ??= newIdempotencyKey()
  const scrollRef = useRef<ScrollView>(null)
  useEffect(() => {
    mounted.current = true
    editor.activate(initialAnswers.current)
    return () => {
      mounted.current = false
      editor.dispose()
    }
  }, [editor])
  useEffect(() => {
    editor.replaceFromServer(detail.answers)
  }, [editor, detail.answers])
  useEffect(() => {
    if (state.error === null) {
      if (state.failed.size === 0 && leaveTo === null) setNotice(null)
      return
    }
    const failure = classifyFailure(state.error)
    if (failure === 'not_openable') setPhase('not_openable')
    else if (failure === 'no_longer_open' || failure === 'submitted') setPhase('no_longer_open')
    else {
      // NAME the refused question — it may be on an earlier page (review S32).
      const failedKey = [...state.failed][0]
      const q = allQuestions.find((x) => x.key === failedKey)
      setNotice(q ? t('peer_request.invalid_named', { question: wordsIn(q.words, locale) }) : t('peer_request.invalid'))
    }
  }, [state.error, state.failed, locale])
  const busy = state.pending > 0 || state.failed.size > 0 || dirtyDates.size > 0
  usePreventRemove((phase === 'pages' || phase === 'closing') && (busy || isSubmitting) && !allowLeave, ({ data }) => {
    setNotice(t('peer_request.unsaved'))
    if (!isSubmitting) setLeaveTo(() => () => navigation.dispatch(data.action))
  })
  useEffect(() => {
    if (!allowLeave || pendingLeave.current === null) return
    const go = pendingLeave.current
    pendingLeave.current = null
    go()
  }, [allowLeave])

  const pages = useMemo(() => visiblePages(detail, answers), [detail, answers])
  const page = pages[Math.min(pageIndex, Math.max(0, pages.length - 1))] ?? []

  // ── announce a page / phase change, and start the page at its top (review S29) ──
  const pageWords = t('peer_request.page_of', { page: String(Math.min(pageIndex, pages.length - 1) + 1), pages: String(pages.length) })
  const changeAnnouncement =
    phase === 'pages'
      ? `${t('peer_request.title')} — ${pageWords}`
      : phase === 'closing'
        ? wordsIn(detail.questionnaire.closingNote, locale)
        : phase === 'thanks'
          ? wordsIn(detail.questionnaire.thankYou, locale)
          : null
  useAnnounceOnChange(changeAnnouncement)
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false })
  }, [pageIndex, phase])

  /** Queue each choice; the editor retries with its original key and preserves later choices. */
  const saveAnswer = useCallback(
    (questionKey: string, value: PeerRequestAnswerValue) => {
      if (submitting.current) return
      setNotice(null)
      setLeaveTo(null)
      editor.save(questionKey, value)
    },
    [editor],
  )
  const setDateDirty = useCallback((key: string, dirty: boolean) => {
    setDirtyDates((prev) => {
      if (prev.has(key) === dirty) return prev
      const next = new Set(prev)
      if (dirty) next.add(key)
      else next.delete(key)
      return next
    })
  }, [])

  /** Leave the questions (page 1's Back, Android back, or a navigation away) — asking first while anything is unresolved. */
  const leaveQuestions = useCallback(() => {
    if (submitting.current) return
    if (state.pending > 0 || state.failed.size > 0 || dirtyDates.size > 0) {
      setNotice(t('peer_request.unsaved'))
      setLeaveTo(() => onBack)
      return
    }
    onBack()
  }, [state.pending, state.failed.size, dirtyDates.size, onBack, locale])
  const pageBack = useCallback(() => {
    if (dirtyDates.size > 0) return setNotice(t('peer_request.date_unsaved'))
    if (pageIndex === 0) return leaveQuestions()
    setNotice(null)
    setPageIndex(pageIndex - 1)
  }, [dirtyDates.size, pageIndex, leaveQuestions, locale])

  // ⭐ Android's back steps back through the in-screen pages, ⛔ pops the whole request (review S33).
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (phase === 'closing') {
        if (!submitting.current) setPhase('pages')
        return true
      }
      if (phase === 'pages') {
        pageBack()
        return true
      }
      return false
    })
    return () => sub.remove()
  }, [phase, pageBack])

  if (phase === 'not_openable') return <PeerRequestNotOpenable messageKey="peer_request.not_openable" />
  if (phase === 'no_longer_open') return <PeerRequestNotOpenable messageKey="peer_request.no_longer_open" />

  const leaveControls = leaveTo !== null && (
    <Button
      accessibilityRole="button"
      onPress={() => {
        // The member CHOSE to give up what is unsaved — ⛔ silent: the notice above said so.
        const go = leaveTo
        setLeaveTo(null)
        editor.dispose()
        pendingLeave.current = go
        setAllowLeave(true)
      }}
    >
      {t('peer_request.leave_anyway')}
    </Button>
  )
  const keepSaved = state.failed.size > 0 && (
    <Button accessibilityRole="button" onPress={() => { setNotice(null); editor.discardFailed() }}>
      {t('peer_request.keep_saved')}
    </Button>
  )

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

  if (phase === 'closing') {
    return (
      <ScrollView ref={scrollRef} contentContainerStyle={{ padding: 16, gap: 16 }}>
        <Paragraph size="$5">{wordsIn(detail.questionnaire.closingNote, locale)}</Paragraph>
        <SaveLineText line={saveLine} />
        {notice !== null && <AnnouncedText text={notice} kind="error" />}
        {submitFailed && <AnnouncedText text={t('peer_request.submit_error')} kind="error" />}
        {keepSaved}
        {leaveControls}
        <XStack gap="$3">
          <Button disabled={isSubmitting} onPress={() => { if (!submitting.current) setPhase('pages') }} accessibilityRole="button">
            {t('peer_request.back')}
          </Button>
          <Button
            theme="accent"
            disabled={busy || isSubmitting}
            accessibilityRole="button"
            onPress={() => {
              const current = editor.getSnapshot()
              if (current.pending > 0 || current.failed.size > 0 || dirtyDates.size > 0 || submitting.current) return
              submitting.current = true
              setIsSubmitting(true)
              setSubmitFailed(false)
              void submit
                .mutateAsync(submitKey.current!)
                .then(() => mounted.current && setPhase('thanks'))
                .catch((err: unknown) => {
                  if (!mounted.current) return
                  const failure = classifyFailure(err)
                  if (failure === 'submitted') setPhase('thanks')
                  else if (failure === 'no_longer_open') setPhase('no_longer_open')
                  else if (failure === 'not_openable') setPhase('not_openable')
                  else setSubmitFailed(true)
                })
                .finally(() => {
                  submitting.current = false
                  if (mounted.current) setIsSubmitting(false)
                })
            }}
          >
            {t(submitFailed ? 'peer_request.try_again' : 'peer_request.submit')}
          </Button>
        </XStack>
        {/* ⭐ Review S40 — the helpline is on EVERY page, the closing one (where a Submit failure lands) included. */}
        <CallHelplineCTA />
      </ScrollView>
    )
  }

  const isLast = pageIndex >= pages.length - 1
  return (
    <ScrollView ref={scrollRef} contentContainerStyle={{ padding: 16, gap: 16 }}>
      <Text fontSize="$6" fontWeight="600" accessibilityRole="header">
        {t('peer_request.title')}
      </Text>
      <Text fontSize="$2" color="$colorPress">
        {pageWords}
      </Text>
      {page.map((q) => (
        <QuestionField
          key={q.key}
          question={q}
          value={answers.get(q.key)}
          latestValue={() => {
            const v = editor.getSnapshot().answers.get(q.key)
            return v === undefined || 'unavailable' in v ? undefined : v
          }}
          unavailable={state.answers.get(q.key) !== undefined && 'unavailable' in state.answers.get(q.key)!}
          disabled={isSubmitting}
          locale={locale}
          onAnswer={(v) => saveAnswer(q.key, v)}
          onDateDirty={(dirty) => setDateDirty(q.key, dirty)}
        />
      ))}
      {notice !== null && <AnnouncedText text={notice} kind="error" />}
      {keepSaved}
      {leaveControls}
      <SaveLineText line={saveLine} />
      <XStack gap="$3">
        <Button disabled={isSubmitting} onPress={pageBack} accessibilityRole="button">
          {t('peer_request.back')}
        </Button>
        <Button
          theme="accent"
          accessibilityRole="button"
          onPress={() => {
            if (page.some((q) => dirtyDates.has(q.key))) {
              setNotice(t('peer_request.date_unsaved'))
              return
            }
            // A saved answer that could ⛔ not be shown IS answered (review S38) — the map WITH those entries.
            if (!canLeavePage(page, state.answers)) {
              setNotice(t('peer_request.required'))
              return
            }
            setNotice(state.failed.size > 0 ? notice : null)
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
  const key = line === 'saved' ? 'peer_request.saved' : line === 'saving' ? 'peer_request.saving' : line === 'failed' ? 'peer_request.not_saved' : 'peer_request.not_saved_retrying'
  // SPOKEN on both platforms (review S28 — the live region alone is Android-only).
  return <AnnouncedText text={t(key)} color={line === 'retrying' ? '$red10' : '$colorPress'} />
}

/** The GENERIC renderer — one per question `kind` (single / multi / yes_no / date). */
function QuestionField({
  question,
  value,
  latestValue,
  unavailable,
  disabled,
  locale,
  onAnswer,
  onDateDirty,
}: {
  readonly question: PeerRequestQuestion
  readonly value: PeerRequestAnswerValue | undefined
  /** The editor's value AT THE TAP — a fast second tap builds on the first (review S37), ⛔ on the last render's. */
  readonly latestValue: () => PeerRequestAnswerValue | undefined
  readonly unavailable: boolean
  readonly disabled: boolean
  readonly locale: string
  readonly onAnswer: (v: PeerRequestAnswerValue) => void
  readonly onDateDirty: (dirty: boolean) => void
}): React.ReactElement {
  const t = useClaimT()
  const label = wordsIn(question.words, locale)
  const selectedCodes = value !== undefined && 'codes' in value ? value.codes : []
  const savedDate = value !== undefined && 'date' in value ? value.date : null
  const savedText = savedDate === null ? '' : toDisplayDate(savedDate)
  const [dateText, setDateText] = useState(savedText)
  const [dateError, setDateError] = useState(false)
  useEffect(() => {
    setDateText(savedText)
    setDateError(false)
  }, [savedText])
  const dirty = question.kind === 'date' && dateText.trim() !== '' && dateText !== savedText
  useEffect(() => {
    onDateDirty(dirty)
  }, [dirty])
  useEffect(() => () => onDateDirty(false), [])
  const single = question.kind !== 'multi'

  return (
    <YStack gap="$2">
      <Text fontSize="$4" fontWeight="500" color="$color">
        {label}
      </Text>
      {unavailable && <AnnouncedText text={t('peer_request.unavailable')} kind="error" />}
      {question.kind === 'date' && (
        <YStack gap="$2">
          <Input
            disabled={disabled}
            value={dateText}
            onChangeText={(text) => { setDateText(text); setDateError(false) }}
            placeholder={t('peer_request.date_hint')}
            keyboardType="numbers-and-punctuation"
            accessibilityLabel={label}
          />
          {dateError && <AnnouncedText text={t('peer_request.date_invalid')} kind="error" />}
          <Button
            disabled={disabled}
            accessibilityRole="button"
            onPress={() => {
              const iso = parseDisplayDate(dateText, todayInIst(new Date()))
              setDateError(iso === null)
              if (iso !== null) onAnswer({ date: iso })
            }}
          >
            {t('peer_request.date_save')}
          </Button>
          {dirty && (
            <Button disabled={disabled} accessibilityRole="button" onPress={() => { setDateText(savedText); setDateError(false) }}>
              {t('peer_request.date_clear')}
            </Button>
          )}
        </YStack>
      )}
      {/* A single choice is a radio GROUP named by its question (review S30 — the repo's `contact.tsx` pattern). */}
      <YStack gap="$2" {...(single ? { accessibilityRole: 'radiogroup' as const, accessibilityLabel: label } : {})}>
        {question.options.map((o) => {
          const selected = selectedCodes.includes(o.code)
          return (
            <Button
              key={o.code}
              disabled={disabled}
              theme={selected ? 'accent' : undefined}
              accessibilityRole={single ? 'radio' : 'checkbox'}
              accessibilityState={{ checked: selected }}
              accessibilityLabel={wordsIn(o.words, locale)}
              height="auto"
              py="$2"
              onPress={() => {
                if (question.kind === 'date') { setDateText(''); setDateError(false) }
                const next = toggleOption(question, latestValue(), o.code)
                if (next !== null) onAnswer(next)
              }}
            >
              {wordsIn(o.words, locale)}
            </Button>
          )
        })}
      </YStack>
    </YStack>
  )
}
