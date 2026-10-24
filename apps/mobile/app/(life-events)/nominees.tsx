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

import { useCallback, useEffect, useRef, useState } from 'react'
import { AccessibilityInfo, Platform, ScrollView } from 'react-native'

import { ApiError } from '@twt/api-client'
import { useT } from '@twt/i18n/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Stack, useFocusEffect, useRouter } from 'expo-router'
import { Button, H2, Input, Paragraph, Spinner, Text, YStack } from 'tamagui'

import { memberAuth } from '../../lib/member-api'
import {
  NomineeForm,
  type NomineeFormEntry,
  type NomineeSubmitEntry,
} from '../../components/life-events/NomineeForm'
import { SaveAndResumeAffordance } from '../../components/life-events/SaveAndResumeAffordance'
import { clearDraft, loadDraft, saveDraft } from '../../components/life-events/draft-store'
import { useStepUpGate } from '../../components/life-events/useStepUpGate'
import { useSession } from '../../lib/session-context'
import { useKnownPeoplePromptsQuery } from '../../components/known-people/useKnownPeopleQueries'
import { AnnouncedText } from '../../components/peer-request/announce'
import { errorCodeOf, useNomineeLinksQuery } from '../../components/nominee-links/useNomineeLinkQueries'
import { useNomineeLinkT } from '../../lib/nominee-link-i18n'
import {
  applyPick,
  clearNomineeLinkSession,
  freshSlotCount,
  markName,
  reconcileMarks,
  redactForDraft,
  saveRefusalCopyKey,
  takeNomineeLinkPick,
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
  /** The slots a fresh form starts with: EMPTY, each carrying its rank's live mark as a `keep`. */
  const freshForms = (): NomineeFormEntry[] =>
    reconcileMarks(Array.from({ length: freshSlotCount(links.data?.links ?? []) }, () => ({ ...EMPTY_FORM })), links.data?.links ?? [])
  // The find screen's pick, taken when this screen regains focus.
  useFocusEffect(
    useCallback(() => {
      const pick = takeNomineeLinkPick()
      if (pick === null) return
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
        onPress={onVerifyOtp}
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
