// Life Events — nominee update (Story 3.9, Task 8; AC1/AC2/AC4). STEP-UP gated ('nominee_change').
// Reuses the shared NomineeForm (extracted from the signup step) + re-runs the 3.4 declare service
// via lifeEventsUpdateNominees. A grief-paced flow (nominee changes after a death) — save-and-resume
// (UX-DR50) persists the in-progress form; the step-up OTP loop (403 auth.step_up_required → request
// → verify → retry) is driven by useStepUpGate. On success the panel + nominee queries are invalidated.
//
// Story 6.36e (AC5; `2026-10-24-397` NE2–NE4) — the member MARKS on this screen ONLY (the form's `link` prop): the form waits
// for the declarer's marks read (a form rendered without it would re-save every rank WITHOUT its mark — and END it); each
// slot starts with its rank's live mark as a `keep` (the form itself starts EMPTY — G14); a draft from before this story
// restores the same way (TR9). The find screen hands its pick back through memory (`takeNomineeLinkPick`, on focus) and the
// keyed form remounts with it. A 409 `nominee.link_stale` reloads the marks and asks for the save again. Each mark refusal
// is its own `nominee_link.*` message.
// Code review 2026-10-24: the DRAFT is stored redacted (⛔ another member's registered name, ⛔ the name a contact was saved
// under — `redactForDraft`; the marks are re-read on restore); the form is gated on the marks being KNOWN (`links.data`), ⛔ on
// `isLoading` (a disabled query is neither loading nor errored — and a form without them ends every live mark); a failed marks
// read says so with a Retry that stays mounted while it runs (TanStack v5 resets an errored query to pending); a 409 reload
// that FAILED says it did not reload; the pick is SPOKEN (the form remounts, so focus resets).
// Round 3 (2026-10-24): the pick line stores the NAME and is translated at render (a language change re-words it), is cleared by
// every remount that is ⛔ a pick (a stale reload, *Continue draft* — it would otherwise describe a slot that is gone), and sits
// inside the screen's gutter.
//
// Story 6.36f (MK8, `2026-10-26-407`) — a MARKS-ONLY mode on this screen (⛔ a route): an entry card above the form (a saved
// declaration whose every rank has a basis, ⛔ locked, and a live mark or the right to find one) switches the screen to one block
// per rank — its label + relationship from the links read's `ranks` (⛔ the cached status read) and the SAME mark control the form
// renders. The form is UNMOUNTED meanwhile (⛔ a stale form or draft beneath it). *Save marks* sends each rank's mark + the version
// the phone saw (⛔ a detail — the server copies them), through the same step-up gate and footer; it stays disabled until a mark
// differs. The find screen's pick lands on the marks record (the same focus effect). ⛔ A draft is written in marks mode (nothing is
// typed; a picked number is held in memory only). A 409 `marks_stale` / `link_stale` reloads the marks and asks again;
// `marks_no_declaration` returns to the form; *Marks saved.* is announced on both platforms before the screen leaves.

import { useCallback, useEffect, useRef, useState } from 'react'
import { AccessibilityInfo, Platform, ScrollView } from 'react-native'

import { ApiError } from '@twt/api-client'
import { useT } from '@twt/i18n/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Stack, useFocusEffect, useRouter } from 'expo-router'
import type { NomineeMarksSaveRequest } from '@twt/contracts'
import { Button, H2, Input, Paragraph, Spinner, Text, YStack } from 'tamagui'

import { memberAuth } from '../../lib/member-api'
import {
  NomineeForm,
  type NomineeFormEntry,
  type NomineeSubmitEntry,
} from '../../components/life-events/NomineeForm'
import { NomineeMarkControl } from '../../components/life-events/NomineeMarkControl'
import { SaveAndResumeAffordance } from '../../components/life-events/SaveAndResumeAffordance'
import { clearDraft, loadDraft, saveDraft } from '../../components/life-events/draft-store'
import { useStepUpGate } from '../../components/life-events/useStepUpGate'
import { useSession } from '../../lib/session-context'
import { useKnownPeoplePromptsQuery } from '../../components/known-people/useKnownPeopleQueries'
import { AnnouncedText } from '../../components/peer-request/announce'
import { errorCodeOf, useNomineeLinksQuery } from '../../components/nominee-links/useNomineeLinkQueries'
import { useNomineeLinkT } from '../../lib/nominee-link-i18n'
import {
  applyMarksPick,
  applyPick,
  buildMarksBody,
  clearNomineeLinkSession,
  freshSlotCount,
  initialMarks,
  markName,
  marksDiffer,
  marksEntryVisible,
  reconcileMarks,
  redactForDraft,
  saveRefusalCopyKey,
  takeNomineeLinkPick,
  type MarksRecord,
  type NomineeRank,
} from '../../lib/nominee-links'

const DRAFT_KEY = 'nominees'
const EMPTY_FORM: NomineeFormEntry = { name: '', relationship: '', mobile: '', address: '' }

export default function LifeEventsNomineesScreen() {
  const t = useT()
  const router = useRouter()
  const queryClient = useQueryClient()
  const stepUp = useStepUpGate('nominee_change')
  const { session } = useSession()
  const memberId = session?.memberId ?? ''

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<NomineeSubmitEntry[] | null>(null)
  const [initialForms, setInitialForms] = useState<NomineeFormEntry[] | undefined>(undefined)
  const [resumeAvailable, setResumeAvailable] = useState(false)
  // Story 6.36e — the declarer's marks, whether they may FIND a member (`canNamePeople` — the SAME caller predicate the
  // match endpoint applies; V11 hides the control for anyone else), the form's latest slots, and its remount key.
  const lt = useNomineeLinkT()
  const links = useNomineeLinksQuery()
  const prompts = useKnownPeoplePromptsQuery()
  const canFind = prompts.data?.canNamePeople === true
  const latestForms = useRef<NomineeFormEntry[] | null>(null)
  const [formKey, setFormKey] = useState(0)
  // The pick, SPOKEN (the form remounts with it, so focus resets and the new label alone is silent); a failed marks read's Retry.
  const [pickNotice, setPickNotice] = useState<{ name: string | null; seq: number } | null>(null)
  const [retrying, setRetrying] = useState(false)
  async function retryLinks(): Promise<void> {
    setRetrying(true)
    try {
      await links.refetch()
    } finally {
      setRetrying(false)
    }
  }
  /** Remount the keyed form with `forms` (a draft continued, a pick, a stale reload) — and keep the draft in step. */
  function remountWith(forms: NomineeFormEntry[]): void {
    setPickNotice(null) // a pick sets it AFTER this; every other remount replaces the slots it described
    latestForms.current = forms
    setInitialForms(forms)
    setFormKey((k) => k + 1)
    saveDraft(memberId, DRAFT_KEY, redactForDraft(forms))
  }
  // Story 6.36f (MK8) — the marks-only mode: its record (one entry per rank), the record it started from (⛔ a save until a mark
  // differs), its own spoken notice and refusal line, and the body the OTP retry re-sends. The focus effect reads the MODE through
  // a ref (its dependency list stays the slots it falls back to).
  const [marksMode, setMarksMode] = useState(false)
  const marksModeRef = useRef(false)
  // The memoized focus effect speaks a pick through the CURRENT translator (`lt` is a fresh closure per render — a captured one
  // would keep the language the callback was made in).
  const ltRef = useRef(lt)
  ltRef.current = lt
  const [marks, setMarks] = useState<MarksRecord>({})
  const [marksStart, setMarksStart] = useState<MarksRecord>({})
  const [marksNotice, setMarksNotice] = useState<{ text: string; seq: number } | null>(null)
  const [marksError, setMarksError] = useState<{ text: string; seq: number } | null>(null)
  const [pendingMarks, setPendingMarks] = useState<NomineeMarksSaveRequest | null>(null)
  /** The slots a fresh form starts with: EMPTY, each carrying its rank's live mark as a `keep`. */
  const freshForms = (): NomineeFormEntry[] =>
    reconcileMarks(Array.from({ length: freshSlotCount(links.data?.links ?? []) }, () => ({ ...EMPTY_FORM })), links.data?.links ?? [])
  // The find screen's pick, taken when this screen regains focus.
  useFocusEffect(
    useCallback(() => {
      const pick = takeNomineeLinkPick()
      if (pick === null) return
      // Story 6.36f (MK8) — in marks mode the pick lands on the marks record (⛔ `applyPick`, which is slot-shaped). It is SPOKEN
      // only: the picked rank's own label already SHOWS it, and a second line above rank 1 read as rank 1's (device run D2).
      if (marksModeRef.current) {
        setMarks((m) => applyMarksPick(m, pick.rank, pick.mark))
        setMarksError(null)
        const name = markName(pick.mark)
        AccessibilityInfo.announceForAccessibility(name ? ltRef.current('form.marked', { name }) : ltRef.current('form.marked_no_name'))
        return
      }
      const base = latestForms.current ?? initialForms ?? freshForms()
      if (pick.rank > base.length) return
      const applied = applyPick(base, pick.rank, pick.mark)
      remountWith(applied)
      setPickNotice({ name: markName(pick.mark), seq: Date.now() })
      // reads the latest slots through the ref; re-created when the slots it falls back to change
    }, [initialForms, links.data]),
  )
  // The form session's matched contacts and any pick are dropped when the member leaves the screen (NE3).
  useEffect(() => () => clearNomineeLinkSession(), [])
  // Story 6.20 (AC2, AC8) — the declaration LOCKS at the first claim. The status read says so up front;
  // a 409 `nominee.locked_claim_filed` on submit (a claim filed while the screen was open) says so too.
  const status = useQuery({ queryKey: ['member', 'nominees'], queryFn: () => memberAuth.nomineesStatus() })
  const [lockedBySubmit, setLockedBySubmit] = useState(false)
  const locked = lockedBySubmit || status.data?.locked === true

  /** A claim was filed while the screen was open — lock, and drop the now-unsendable draft. */
  function lockOnSubmit(): void {
    clearDraft(memberId, DRAFT_KEY)
    setLockedBySubmit(true)
  }

  // ⭐ Family 13(d) (code review 2026-09-24b): the LOCKED state is ANNOUNCED on iOS too — the paragraph's
  // `accessibilityLiveRegion` is Android-only (the `nominee-review.tsx` precedent; iOS only, or TalkBack
  // would speak it twice).
  useEffect(() => {
    if (locked && Platform.OS === 'ios') {
      AccessibilityInfo.announceForAccessibility(`${t('nominees.locked_title')}. ${t('nominees.locked_body')}`)
    }
    // `t` is a fresh closure each render (`useT()`) — keyed on `locked` only, or it re-announced every render.
  }, [locked])

  useEffect(() => {
    const draft = loadDraft<NomineeFormEntry[]>(memberId, DRAFT_KEY)
    if (draft && draft.length > 0 && draft.some((f) => f.name.trim())) setResumeAvailable(true)
  }, [memberId])

  async function invalidateAndLeave(): Promise<void> {
    clearDraft(memberId, DRAFT_KEY)
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['member', 'nominees'] }),
      queryClient.invalidateQueries({ queryKey: ['member', 'life-events'] }),
      links.refetch(),
    ])
    router.back()
  }

  async function onSubmit(nominees: NomineeSubmitEntry[]): Promise<void> {
    setBusy(true)
    setError(null)
    setPending(nominees)
    try {
      const result = await stepUp.guard(() => memberAuth.lifeEventsUpdateNominees({ nominees }))
      // undefined ⇒ step-up was requested; the OTP input is now shown (do NOT leave yet).
      if (result !== undefined) await invalidateAndLeave()
    } catch (err) {
      if (err instanceof ApiError && err.code === 'nominee.locked_claim_filed') lockOnSubmit()
      else await onSaveRefused(err)
    } finally {
      setBusy(false)
    }
  }

  /** Story 6.36e — a mark refusal says its own words; a stale one reloads the marks and asks for the save again. */
  async function onSaveRefused(err: unknown): Promise<void> {
    const code = errorCodeOf(err)
    const key = saveRefusalCopyKey(code)
    if (key === null) {
      setError(t('lifeEvents.error_generic'))
      return
    }
    if (code === 'nominee.link_stale') {
      const fresh = await links.refetch()
      // A FAILED reload keeps the old data (TanStack): ⛔ claim "reloaded" over it — say it did not.
      if (fresh.isError || fresh.data === undefined) {
        setError(lt('save.stale_not_reloaded'))
        return
      }
      remountWith(reconcileMarks(latestForms.current ?? initialForms ?? freshForms(), fresh.data.links))
    }
    setError(lt(key))
  }

  async function onVerifyOtp(): Promise<void> {
    if (!pending) return
    setBusy(true)
    setError(null)
    try {
      await stepUp.verifyAndRetry(() => memberAuth.lifeEventsUpdateNominees({ nominees: pending }))
      await invalidateAndLeave()
    } catch (err) {
      if (err instanceof ApiError && err.code === 'nominee.locked_claim_filed') lockOnSubmit()
      else await onSaveRefused(err)
    } finally {
      setBusy(false)
    }
  }

  // ── Story 6.36f (MK8) — the marks-only mode ──────────────────────────────────────────────────────────────────────────────
  /** Start (or restart) the mode from the links read: every rank's live mark, ⛔ a change yet. */
  function startMarks(view: NonNullable<typeof links.data>): void {
    const start = initialMarks(view)
    setMarksStart(start)
    setMarks(start)
  }

  function enterMarksMode(): void {
    if (links.data === undefined) return
    stepUp.reset()
    setError(null)
    setPickNotice(null)
    setMarksNotice(null)
    setMarksError(null)
    startMarks(links.data)
    marksModeRef.current = true
    setMarksMode(true)
    // The tapped card vanishes with the form — ⛔ in silence (the page-change rule, `announce.tsx`).
    AccessibilityInfo.announceForAccessibility(lt('marks.title'))
  }

  /** "Change names or numbers instead" — back to the FULL form, remounted fresh (⛔ a draft written). */
  function backToForm(): void {
    stepUp.reset()
    marksModeRef.current = false
    setMarksMode(false)
    setMarksNotice(null)
    setMarksError(null)
    setPendingMarks(null)
    setPickNotice(null)
    latestForms.current = null
    setInitialForms(undefined)
    setFormKey((k) => k + 1)
  }

  const showMarksError = (text: string): void => setMarksError({ text, seq: Date.now() })
  /** *"Mark removed."* / *"Mark kept."*: SHOWN, and SPOKEN ONCE here — ⛔ a live region, which TalkBack re-read at the *Save marks*
   *  press (device run D1, 2026-10-27: re-read whether the line stayed or was cleared). */
  function sayMarksNotice(text: string): void {
    setMarksNotice({ text, seq: Date.now() })
    AccessibilityInfo.announceForAccessibility(text)
  }

  /** A 200: SAY it on both platforms (a live region unmounted by `router.back()` is never read), then leave as a full save does. */
  async function marksSaved(): Promise<void> {
    AccessibilityInfo.announceForAccessibility(lt('marks.saved'))
    await invalidateAndLeave()
  }

  async function onSaveMarks(): Promise<void> {
    if (links.data === undefined) return
    const body = buildMarksBody(links.data.ranks, marks)
    setBusy(true)
    setMarksError(null)
    // *"Mark removed."* / *"Mark kept."* said what the member DID — ⛔ left standing under the spinner and the step-up prompt.
    setMarksNotice(null)
    setPendingMarks(body)
    try {
      const result = await stepUp.guard(() => memberAuth.lifeEventsUpdateNomineeMarks(body))
      // undefined ⇒ step-up was requested; the OTP input is now shown (do NOT leave yet).
      if (result !== undefined) await marksSaved()
    } catch (err) {
      await onMarksRefused(err)
    } finally {
      setBusy(false)
    }
  }

  async function onVerifyMarksOtp(): Promise<void> {
    if (!pendingMarks) return
    setBusy(true)
    setMarksError(null)
    try {
      await stepUp.verifyAndRetry(() => memberAuth.lifeEventsUpdateNomineeMarks(pendingMarks))
      await marksSaved()
    } catch (err) {
      await onMarksRefused(err)
    } finally {
      setBusy(false)
    }
  }

  /** A marks-only refusal: the lock; ⛔ declaration ⇒ the form; a stale basis or mark ⇒ reload the marks and ask again. */
  async function onMarksRefused(err: unknown): Promise<void> {
    const code = errorCodeOf(err)
    if (code === 'nominee.locked_claim_filed') {
      lockOnSubmit()
      return
    }
    if (code === 'nominee.marks_no_declaration') {
      backToForm()
      setError(lt('save.marks_no_declaration'))
      return
    }
    const key = saveRefusalCopyKey(code)
    if (key === null) {
      showMarksError(t('lifeEvents.error_generic'))
      return
    }
    if (code === 'nominee.marks_stale' || code === 'nominee.link_stale') {
      void queryClient.invalidateQueries({ queryKey: ['member', 'nominees'] })
      const fresh = await links.refetch()
      // A FAILED reload keeps the old data (TanStack): ⛔ claim "reloaded" over it — say it did not.
      if (fresh.isError || fresh.data === undefined) {
        showMarksError(lt('save.stale_not_reloaded'))
        return
      }
      setMarksNotice(null)
      startMarks(fresh.data)
    }
    showMarksError(lt(key))
  }

  function onContinueDraft(): void {
    const draft = loadDraft<NomineeFormEntry[]>(memberId, DRAFT_KEY)
    // Story 6.36e (TR9) — a draft's slots against the marks read: one written before this story (⛔ `memberLink`) takes the
    // rank's live mark as a `keep` — ⛔ "no mark", which would end it.
    if (draft) remountWith(reconcileMarks(draft, links.data?.links ?? []))
    setResumeAvailable(false)
  }

  function onStartFresh(): void {
    clearDraft(memberId, DRAFT_KEY)
    setResumeAvailable(false)
  }

  const stepUpFooter = stepUp.needsOtp ? (
    <YStack gap="$3">
      <Text accessibilityRole="text" accessibilityLiveRegion="polite">
        {t('lifeEvents.step_up_required')}
      </Text>
      <Input
        value={stepUp.otp}
        onChangeText={stepUp.setOtp}
        keyboardType="number-pad"
        maxLength={6}
        height={48}
        accessibilityLabel={t('lifeEvents.step_up_required')}
        accessibilityHint={t('lifeEvents.step_up_hint')}
      />
      <Button
        theme="accent"
        height={56}
        disabled={busy || !stepUp.otp.trim()}
        accessibilityRole="button"
        accessibilityLabel={t('auth.verify')}
        onPress={marksMode ? onVerifyMarksOtp : onVerifyOtp}
      >
        {busy ? <Spinner /> : t('auth.verify')}
      </Button>
      <Button
        chromeless
        height={40}
        accessibilityRole="button"
        accessibilityLabel={t('lifeEvents.step_up_cancel')}
        onPress={stepUp.reset}
      >
        {t('lifeEvents.step_up_cancel')}
      </Button>
    </YStack>
  ) : null

  // ⭐ Until the status read answers, ⛔ no editable form (code review 2026-09-24): it used to flash the
  // form — the very "form that 409s on submit" the locked state exists to avoid.
  const marksKnown = links.data !== undefined
  if (status.isLoading || (!marksKnown && !links.isError && !retrying)) {
    return (
      <>
        <Stack.Screen options={{ title: t('lifeEvents.nominees_label') }} />
        <YStack flex={1} items="center" justify="center" bg="$background" testID="nominees-status-loading">
          <Spinner accessibilityLabel={t('lifeEvents.nominees_label')} />
        </YStack>
      </>
    )
  }

  if (locked) {
    // ⭐ The LOCKED state — what happened, what the member can do, and the helpline (the three-part
    // grammar). ⛔ Never a form that 409s on submit. Announced when it appears.
    return (
      <>
        <Stack.Screen options={{ title: t('lifeEvents.nominees_label') }} />
        {/* ⛔ NOT `accessible={true}` (family 13(a), code review 2026-09-24): a grouped container is ONE
            element to a screen reader, which swallowed the correction Button — the screen's only action. */}
        <YStack gap="$4" px="$6" py="$6" bg="$background" testID="nominees-locked">
          <H2 accessibilityRole="header">{t('nominees.locked_title')}</H2>
          <Paragraph accessibilityRole="text" accessibilityLiveRegion="polite">
            {t('nominees.locked_body')}
          </Paragraph>
          <Button
            theme="accent"
            height={56}
            accessibilityRole="button"
            accessibilityLabel={t('nominees.locked_correction_cta')}
            onPress={() => router.push('/(life-events)/nominee-correction')}
          >
            {t('nominees.locked_correction_cta')}
          </Button>
        </YStack>
      </>
    )
  }

  if (marksMode && links.data !== undefined) {
    const view = links.data
    const changed = marksDiffer(marksStart, marks)
    /** *Remove mark* on a rank: ⛔ mark (a live one ENDS at save) — and SAY so (the button vanishes with it). */
    const removeRankMark = (rank: NomineeRank) => {
      setMarks((m) => ({ ...m, [rank]: null }))
      setMarksError(null)
      sayMarksNotice(lt('form.removed'))
    }
    return (
      <>
        <Stack.Screen options={{ title: t('lifeEvents.nominees_label') }} />
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <YStack gap="$4" px="$6" py="$6" bg="$background" testID="nominee-marks-mode">
            <H2 accessibilityRole="header">{lt('marks.title')}</H2>
            <Paragraph accessibilityRole="text">{lt('marks.intro')}</Paragraph>
            {/* One block per rank of the BASIS (⛔ the cached status read, which may be stale — MK3). */}
            {view.ranks.map((r) => (
              <YStack key={r.rank} gap="$3" testID={`nominee-marks-rank-${r.rank}`}>
                <Text fontWeight="600" accessibilityRole="header">
                  {lt('marks.slot', {
                    nominee: r.rank === 1 ? t('nominees.primary_label') : t('nominees.secondary_label'),
                    relationship: t(`nominees.relationship_${r.relationship}`),
                  })}
                </Text>
                <NomineeMarkControl
                  index={r.rank - 1}
                  mark={marks[r.rank] ?? null}
                  canFind={canFind}
                  questionOpen={false}
                  onFind={() => router.push({ pathname: '/(life-events)/nominee-link-find', params: { rank: String(r.rank) } })}
                  onRemove={() => removeRankMark(r.rank)}
                  onKeep={() => sayMarksNotice(lt('form.kept'))}
                />
              </YStack>
            ))}
            {/* The mode's OWN notice — OUTSIDE the blocks (the control carries ⛔ notice): the removed button takes focus with it. */}
            {marksNotice ? (
              <Text key={marksNotice.seq} fontSize="$2" color="$color" accessibilityRole="text">
                {marksNotice.text}
              </Text>
            ) : null}
            {stepUpFooter}
            {marksError ? <AnnouncedText key={marksError.seq} text={marksError.text} kind="error" color="#C0392B" /> : null}
            <Button
              theme="accent"
              height={56}
              disabled={busy || !changed}
              accessibilityRole="button"
              accessibilityLabel={lt('marks.save')}
              accessibilityHint={changed ? undefined : lt('marks.nothing_changed')}
              accessibilityState={{ disabled: busy || !changed, busy }}
              onPress={() => void onSaveMarks()}
            >
              {busy ? <Spinner /> : lt('marks.save')}
            </Button>
            {changed ? null : <Paragraph accessibilityRole="text">{lt('marks.nothing_changed')}</Paragraph>}
            <Button chromeless height={48} disabled={busy} accessibilityRole="button" accessibilityLabel={lt('marks.back_to_form')} accessibilityState={{ disabled: busy }} onPress={backToForm}>
              {lt('marks.back_to_form')}
            </Button>
          </YStack>
        </ScrollView>
      </>
    )
  }

  const marksEntry = marksEntryVisible({
    nominees: status.data?.nominees.length,
    statusError: status.isError,
    locked,
    ranks: links.data?.ranks.length,
    liveMarks: links.data?.links.length ?? 0,
    canFind,
  })

  return (
    <>
      <Stack.Screen options={{ title: t('lifeEvents.nominees_label') }} />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {/* ⭐ A failed status read is SAID, ⛔ not swallowed. The form stays usable — a submit after a claim
            was filed is still refused and turns into the locked state. */}
        {status.isError ? (
          <YStack px="$6" pt="$6" gap="$2" testID="nominees-status-error">
            <Text accessibilityRole="alert" accessibilityLiveRegion="polite">
              {t('lifeEvents.error_generic')}
            </Text>
            <Button
              chromeless
              height={40}
              accessibilityRole="button"
              accessibilityLabel={t('medical.retry')}
              onPress={() => void status.refetch()}
            >
              {t('medical.retry')}
            </Button>
          </YStack>
        ) : null}
        {/* Story 6.36e — ⛔ a form without the marks read: a save would end every live mark. Said, with a Retry. */}
        {!marksKnown ? (
          <YStack px="$6" pt="$6" gap="$2" testID="nominee-links-error">
            {/* Keyed by the last failure: the line stays mounted through a retry, so a SECOND failure is spoken again. */}
            <AnnouncedText key={links.errorUpdatedAt} text={lt('error.load')} kind="error" color="#C0392B" />
            {/* Stays MOUNTED while the retry runs (v5 resets the errored query to pending) — focus is ⛔ dropped. */}
            <Button
              chromeless
              height={40}
              disabled={retrying}
              accessibilityRole="button"
              accessibilityLabel={lt('retry')}
              accessibilityState={{ disabled: retrying, busy: retrying }}
              onPress={() => void retryLinks()}
            >
              {retrying ? <Spinner /> : lt('retry')}
            </Button>
          </YStack>
        ) : null}
        {resumeAvailable && marksKnown ? (
          <YStack px="$6" pt="$6">
            <SaveAndResumeAffordance onContinue={onContinueDraft} onStartFresh={onStartFresh} />
          </YStack>
        ) : null}
        {/* Story 6.36f (MK8) — changing a mark ⛔ needs the nominees typed again. */}
        {marksEntry ? (
          <YStack px="$6" pt="$4" gap="$2" testID="nominee-marks-entry">
            <Paragraph accessibilityRole="text">{lt('marks.entry')}</Paragraph>
            <Button height={48} accessibilityRole="button" accessibilityLabel={lt('marks.title')} onPress={enterMarksMode}>
              {lt('marks.title')}
            </Button>
          </YStack>
        ) : null}
        {pickNotice ? (
          <YStack px="$6" pt="$4">
            <AnnouncedText key={pickNotice.seq} text={pickNotice.name ? lt('form.marked', { name: pickNotice.name }) : lt('form.marked_no_name')} color="$color" />
          </YStack>
        ) : null}
        {!marksKnown ? null : (
        <NomineeForm
          key={`form-${formKey}`}
          title={t('lifeEvents.nominees_label')}
          intro={t('nominees.intro')}
          submitLabel={t('nominees.submit')}
          busy={busy}
          error={error}
          onSubmit={onSubmit}
          initialForms={initialForms ?? freshForms()}
          onFormsChange={(forms) => {
            latestForms.current = forms
            saveDraft(memberId, DRAFT_KEY, redactForDraft(forms))
          }}
          onEdit={() => {
            setError(null)
            setPickNotice(null) // the line said what the pick did — ⛔ left standing once the form changes
          }}
          footer={stepUpFooter}
          link={{
            canFind,
            onFind: (rank: NomineeRank) => router.push({ pathname: '/(life-events)/nominee-link-find', params: { rank: String(rank) } }),
          }}
        />
        )}
      </ScrollView>
    </>
  )
}
