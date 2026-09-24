// Nominee detail review + claim-time dual-bank collection (Story 6.2 + 6.8) — <NomineeDetailEditor>.
//
// 6.2 shipped the READ-ONLY nominee summary (relationship + presence flags for the encrypted
// fields — the NON-PII summary the member-nominees status endpoint returns). Story 6.8 adds the
// dual-account (#1 primary / #2 backup) bank-collection form below it: each account takes a holder
// name + account number + IFSC; on IFSC blur we resolve the bank name (cache-first) and show it, or
// a dignified Pattern-4 message on failure. Submit records BOTH accounts atomically (latest-wins) to
// the member collection route, then advances. The grief-paced posture is preserved: no countdowns,
// dignified errors, and the "details look wrong? Call us" CallHelplineCTA escape hatch stays.
//
// No PII is persisted to the local draft (only the document-stage marker + claimCaseId live there —
// the 6.2 discipline); the typed bank fields live in component state until submitted to the server.

import { useCallback, useEffect, useRef, useState } from 'react'

import type { NomineeStatusResponse, RecordNomineeBankRequest } from '@twt/contracts'
// Story 6.18 (AC12) — the SHARED English-script predicate from `@twt/contracts`.
// ⚠⚠ `isEnglishScriptName(x)`, ⛔ NOT `ENGLISH_NAME_REGEX.test(x.trim())` (code review 2026-09-20).
// Three clients each hand-rolled that call. It gives the same answer today, but only by coincidence
// of the current implementation: the moment the schema gains a rule the bare regex does not carry,
// a name the SERVER accepts starts being refused in the app (or worse, the reverse). One predicate,
// used by the schema and by every form, is the only way the two cannot drift.
// ⭐ `NAME_DIFFERENCE_NOTE_MAX_CHARS` from contracts, ⛔ not a literal `500` twice (code review
// 2026-09-22). The admin card already imported it; this screen hard-coded the same number in two
// places, so a change at the boundary would silently truncate a family's note at the OLD length —
// client-side, before the server ever saw it.
import { NAME_DIFFERENCE_NOTE_MAX_CHARS, isEnglishScriptName } from '@twt/contracts'
import { useT } from '@twt/i18n/react'
import { useFocusEffect, useRouter } from 'expo-router'
import { AccessibilityInfo, Platform } from 'react-native'
import { Button, Input, Paragraph, Separator, Spinner, Text, XStack, YStack } from 'tamagui'

import { ClaimProxyFlowShell } from '../../components/claim/ClaimProxyFlowShell'
import { CallHelplineCTA } from '../../components/claim/CallHelplineCTA'
import { claimApi } from '../../lib/claim-api'
import { memberAuth } from '../../lib/member-api'
import { useClaimT } from '../../lib/claim-i18n'
import { loadClaimDraft, saveClaimDraft } from '../../lib/claim-draft'
import { IFSC_RE } from '../../lib/nominee-bank-ifsc'
import { VPA_RE } from '../../lib/nominee-bank-vpa'
import { useSession } from '../../lib/session-context'

type NomineeSummary = NomineeStatusResponse['nominees'][number]
type NomineeLoadState = 'error' | NomineeSummary[] | null
type IfscState = 'idle' | 'checking' | 'ok' | 'error'

interface AccountFields {
  holder: string
  number: string
  ifsc: string
  // Story 8.13 — the nominee's UPI ID for this account. OPTIONAL — a BLANK value never gates submit; a
  // NON-blank value must be format-valid (vpaValid) or submit is blocked (review finding).
  vpa: string
  /** Story 6.18 (AC7) — the OPTIONAL note to the District Admin about a name difference. */
  note: string
  bankName: string | null
  ifscState: IfscState
}

const emptyAccount = (): AccountFields => ({ holder: '', number: '', ifsc: '', vpa: '', note: '', bankName: null, ifscState: 'idle' })

type SubmitState = 'idle' | 'saving' | 'saved' | 'error'

// ⭐ Gives the `saved` live-region message (code review 2026-09-22) time to actually be announced
// before the screen navigates away underneath it — without this the `submit === 'saved'` Text was
// mounted and unmounted in the same tick as `router.push`, so a screen-reader user never heard it.
const SAVED_ANNOUNCEMENT_DELAY_MS = 1200

export default function NomineeReviewScreen(): React.ReactElement {
  const t = useClaimT()
  const tCommon = useT()
  const router = useRouter()
  const { session } = useSession()
  const name = t('member_fallback')
  const memberId = session?.memberId
  const claimCaseId = memberId ? loadClaimDraft(memberId).claimCaseId : undefined

  const [nominees, setNominees] = useState<NomineeLoadState>(null)
  const [accounts, setAccounts] = useState<[AccountFields, AccountFields]>([emptyAccount(), emptyAccount()])
  const [submit, setSubmit] = useState<SubmitState>('idle')
  const [notice, setNotice] = useState<string | null>(null)
  const [existingBankNames, setExistingBankNames] = useState<string[]>([])
  const [correctionNeeded, setCorrectionNeeded] = useState(false)
  // ⚠ Whether the MEMBER may edit right now — ⛔ a different question from "does something need
  // correcting". Default `true` so a failed status fetch never silently locks a filer out of the
  // ordinary collection flow (the server is the boundary and refuses a write it should not take).
  const [memberEditable, setMemberEditable] = useState(true)
  // ⚠ The status read FAILED (code review 2026-09-23b) — ⛔ never read as "nothing to correct". The
  // form still works (the server is the boundary), but the family is told we could not check.
  const [statusUnavailable, setStatusUnavailable] = useState(false)

  // Shared unmount guard for async handlers outside the load effect (e.g. resolveIfsc below).
  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // Per-account request counters so a slower, older IFSC-lookup response can never clobber a
  // newer one for the same account index (out-of-order resolution on rapid re-blur).
  const ifscRequestSeq = useRef<[number, number]>([0, 0])

  useEffect(() => {
    let active = true
    memberAuth
      .nomineesStatus()
      .then((res) => {
        if (active) setNominees(res.nominees)
      })
      .catch(() => {
        if (active) setNominees('error')
      })
    return () => {
      active = false
    }
  }, [])

  // Whatever's already on file (bank names only — never account number / holder name; review
  // finding, 2026-07-11), so a re-edit or a D3 tier-2 admin correction doesn't start blind.
  // ⭐ READ ON EVERY FOCUS, ⛔ not once (code review 2026-09-23c). It was a mount-only effect, so a
  // family who came BACK to this screen saw `correctionNeeded`/`memberEditable` as they were when it
  // first mounted, and a failed first read left `statusUnavailable` up for the life of the screen —
  // beside "Bank details saved". `useFocusEffect` below calls this on mount AND on every return.
  const readStatus = useCallback((): (() => void) => {
    if (!claimCaseId) return () => {}
    let active = true
    claimApi
      .nomineeBankStatus(claimCaseId)
      .then((res) => {
        if (!active) return
        setExistingBankNames(res.accounts.map((a) => a.bankName))
        // Story 6.18 (AC5) — the filer is told their bank details need correcting.
        setCorrectionNeeded(res.correctionNeeded === true)
        setMemberEditable(res.memberEditable !== false)
        setStatusUnavailable(false)
      })
      .catch(() => {
        // ⚠⚠ NO LONGER SWALLOWED (code review 2026-09-23b — the ticked 2026-09-20 bullet said *"a
        // swallowed status-fetch `catch` means a returned filer sees no notice"* and the catch stayed
        // empty). The form still works — `memberEditable` keeps its permissive default and the
        // server refuses a write it should not take — but the family is TOLD the check failed.
        if (active) setStatusUnavailable(true)
      })
    return () => {
      active = false
    }
  }, [claimCaseId])

  function patchAccount(idx: 0 | 1, patch: Partial<AccountFields>): void {
    setAccounts((prev) => {
      const next: [AccountFields, AccountFields] = [{ ...prev[0] }, { ...prev[1] }]
      next[idx] = { ...next[idx], ...patch }
      return next
    })
  }

  /** On IFSC blur: format-check, then resolve the bank name (cache-first). Dignified on failure.
   *  Guards against unmount + a stale (out-of-order) response from an earlier blur on the same idx. */
  async function resolveIfsc(idx: 0 | 1): Promise<void> {
    const seq = ++ifscRequestSeq.current[idx]
    const raw = accounts[idx].ifsc.trim().toUpperCase()
    if (raw === '') {
      patchAccount(idx, { ifscState: 'idle', bankName: null })
      return
    }
    if (!IFSC_RE.test(raw)) {
      patchAccount(idx, { ifscState: 'error', bankName: null })
      return
    }
    patchAccount(idx, { ifsc: raw, ifscState: 'checking', bankName: null })
    try {
      const res = await claimApi.ifscLookup(raw)
      if (!mountedRef.current || ifscRequestSeq.current[idx] !== seq) return
      patchAccount(idx, { ifscState: 'ok', bankName: res.bankName })
    } catch {
      if (!mountedRef.current || ifscRequestSeq.current[idx] !== seq) return
      patchAccount(idx, { ifscState: 'error', bankName: null })
    }
  }

  const accountComplete = (a: AccountFields): boolean =>
    a.holder.trim() !== '' &&
    // Story 6.18 (AC12) — the boundary refuses a non-Latin holder name, so the form must too.
    isEnglishScriptName(a.holder) &&
    a.number.trim() !== '' &&
    a.ifscState === 'ok'
  // The VPA is OPTIONAL (a blank field is always valid — it never gates submit), but a NON-blank value
  // must be format-valid before submitting (review finding: previously a malformed-but-non-blank VPA
  // reached the server and 400'd the whole two-account payload with no field-specific feedback).
  const vpaValid = (a: AccountFields): boolean => a.vpa.trim() === '' || VPA_RE.test(a.vpa.trim())
  const canSubmit =
    Boolean(claimCaseId) &&
    accountComplete(accounts[0]) &&
    accountComplete(accounts[1]) &&
    vpaValid(accounts[0]) &&
    vpaValid(accounts[1]) &&
    // ⭐ `saved` is ⛔ not submittable either (code review 2026-09-23) — the announcement delay below
    // holds the screen for SAVED_ANNOUNCEMENT_DELAY_MS after the write lands, and a second tap in that
    // window fired a SECOND bank write (latest-wins ⇒ another event, a fresh `updated_at` that can
    // stale the District Admin's check) and a second `router.push`.
    submit !== 'saving' &&
    submit !== 'saved' &&
    // ⛔ NOT when the member may not edit (code review 2026-09-23b). The ticked 2026-09-20 bullet
    // prescribed *"… and suppress the in-app edit"*; only the banner copy landed, so a family at
    // `verifier_approved`/`reversed`/`state_trustee_freeze` typed into a live form and got the
    // generic *"could not save"* 409 beside a banner saying the District Admin would handle it.
    memberEditable

  async function onSubmit(): Promise<void> {
    if (!claimCaseId) return
    if (submit === 'saving' || submit === 'saved') return
    if (!accountComplete(accounts[0]) || !accountComplete(accounts[1])) {
      setNotice(t('nominee.bank.incomplete'))
      return
    }
    if (!vpaValid(accounts[0]) || !vpaValid(accounts[1])) {
      setNotice(t('nominee.bank.vpa_invalid'))
      return
    }
    setNotice(null)
    setSubmit('saving')
    // The optional VPA rides along only when the filer typed one (trimmed) — a blank field stays absent
    // (a first-class state; VPA never gates submit). Story 8.13.
    const buildAccount = (a: AccountFields) => {
      const vpa = a.vpa.trim()
      const note = a.note.trim()
      return {
        accountHolderName: a.holder.trim(),
        accountNumber: a.number.trim(),
        ifsc: a.ifsc.trim().toUpperCase(),
        ...(vpa !== '' ? { vpa } : {}),
        // Omitted entirely when blank — the contract's field is optional and an empty string would
        // persist as "a note was written" when none was (AC7).
        ...(note !== '' ? { nameDifferenceNote: note } : {}),
      }
    }
    const payload: RecordNomineeBankRequest = {
      accounts: [buildAccount(accounts[0]), buildAccount(accounts[1])],
    }
    try {
      await claimApi.recordNomineeBank(claimCaseId, payload)
    } catch {
      setSubmit('error')
      setNotice(t('nominee.bank.error'))
      return
    }
    // The write already succeeded — a failure past this point is not a "could not save" error.
    setSubmit('saved')
    // ⭐ THE BANNER CLEARS. It was set once from the status fetch and never reset, so after a
    // successful correction the filer was still being told their bank details needed correcting —
    // on the very details they had just corrected (code review 2026-09-20).
    setCorrectionNeeded(false)
    if (memberId) saveClaimDraft(memberId, { lastStep: 'nominee-review' })
    // ⭐ SPOKEN on both platforms (code review 2026-09-23) — `accessibilityLiveRegion` is Android-only
    // in React Native and `accessibilityRole="text"` announces nothing, so on iOS VoiceOver the `saved`
    // Text below was silent. The live region stays for TalkBack; this call is the iOS path (the
    // `PanchayatNoticeboard.tsx` precedent).
    // ⚠ iOS ONLY (code review 2026-09-23b): unguarded, TalkBack spoke "saved" TWICE — once from this
    // call and once from the live region.
    if (Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(t('nominee.bank.saved'))
    // ⭐ Hold on this screen long enough for the `saved` live region to be announced (code review
    // 2026-09-22) — navigating on the same tick as `setSubmit('saved')` unmounted the message
    // before a screen reader had any chance to read it.
    await new Promise((r) => setTimeout(r, SAVED_ANNOUNCEMENT_DELAY_MS))
    // ⛔ Not if the family has already left this screen during the delay (code review 2026-09-23) —
    // the push would otherwise pull them onto the acknowledgement from wherever they went.
    if (!mountedRef.current) return
    router.push('/(claim)/acknowledgement')
  }

  // ⭐ `saved` is busy too (code review 2026-09-23): an edit typed during the announcement delay
  // would be silently discarded when the screen navigates away.
  const busy = submit === 'saving' || submit === 'saved'
  // ⭐ Inputs are locked while busy OR when the member may not edit this claim (see `canSubmit`).
  const locked = busy || !memberEditable

  // ⭐ `saved` ENDS WHEN THE FAMILY COMES BACK (code review 2026-09-23b — a REGRESSION from the
  // 2026-09-23 patch). `router.push` keeps this screen mounted beneath the acknowledgement, and
  // nothing moved `submit` out of `saved`, so a swipe/hardware back landed on a permanently locked
  // form: a family who spotted a typo could not fix it, although latest-wins re-edits are legitimate
  // in the collection window. Re-focus resets it; the announcement delay itself runs while this
  // screen stays focused, so the 2026-09-23 re-submit guard is untouched.
  useFocusEffect(
    useCallback(() => {
      setSubmit((prev) => (prev === 'saved' ? 'idle' : prev))
      return readStatus()
    }, [readStatus]),
  )

  const accountBlock = (idx: 0 | 1, labelKey: string): React.ReactElement => {
    const a = accounts[idx]
    return (
      <YStack gap="$2" py="$2">
        <Text fontWeight="600">{t(labelKey)}</Text>
        <Input
          value={a.holder}
          onChangeText={(v) => patchAccount(idx, { holder: v })}
          placeholder={t('nominee.bank.holder')}
          accessibilityLabel={t('nominee.bank.holder')}
          disabled={locked}
        />
        {/* Story 6.18 (AC12), `-227` cl.9 — the English-script gate, shown INLINE as the filer types.
            ⛔ Never a silent server-only 400: a grieving family typing a name in their own script must
            be told what to change, here, not handed an opaque rejection after submitting. */}
        {/* ⭐ PAIRED with `accessibilityLiveRegion` (code review 2026-09-22) — a bare
            `accessibilityRole="alert"` does ⛔ not reliably announce on mount, and this message
            APPEARS as the family types. The sibling `correction_needed` below and
            `NomineeForm.tsx` in this same story already pair them; this one was the odd one out. */}
        {a.holder.trim() !== '' && !isEnglishScriptName(a.holder) ? (
          <Text
            color="#B00020"
            fontSize="$2"
            accessibilityRole="alert"
            accessibilityLiveRegion="assertive"
          >
            {t('nominee.bank.holder_english')}
          </Text>
        ) : null}
        {/* Story 6.18 (AC7), `-226` cl.2 — the OPTIONAL note to the District Admin explaining a
            clerical difference ("the bank shortened her name"). ⛔ NEVER required: cl.2 permits a
            note, it does not oblige one, and a missing note blocks nothing. */}
        <Input
          value={a.note}
          onChangeText={(v) => patchAccount(idx, { note: v.slice(0, NAME_DIFFERENCE_NOTE_MAX_CHARS) })}
          placeholder={t('nominee.bank.note')}
          accessibilityLabel={t('nominee.bank.note')}
          accessibilityHint={t('nominee.bank.note_help')}
          maxLength={NAME_DIFFERENCE_NOTE_MAX_CHARS}
          disabled={locked}
        />
        <Input
          value={a.number}
          onChangeText={(v) => patchAccount(idx, { number: v.replace(/[^0-9]/g, '') })}
          keyboardType="number-pad"
          placeholder={t('nominee.bank.number')}
          accessibilityLabel={t('nominee.bank.number')}
          disabled={locked}
        />
        <Input
          value={a.ifsc}
          onChangeText={(v) => patchAccount(idx, { ifsc: v.toUpperCase(), ifscState: 'idle', bankName: null })}
          onBlur={() => void resolveIfsc(idx)}
          autoCapitalize="characters"
          maxLength={11}
          placeholder={t('nominee.bank.ifsc')}
          accessibilityLabel={t('nominee.bank.ifsc')}
          disabled={locked}
        />
        {a.ifscState === 'checking' ? <Text color="$colorPress">{t('nominee.bank.ifsc_checking')}</Text> : null}
        {a.ifscState === 'ok' && a.bankName ? <Text color="#1E8E3E">{a.bankName}</Text> : null}
        {a.ifscState === 'error' ? (
          <Text color="#B00020" accessibilityRole="alert" accessibilityLiveRegion="assertive">
            {t('nominee.bank.ifsc_error')}
          </Text>
        ) : null}
        {/* Story 8.13 — optional UPI ID. A blank value never gates submit; a non-empty value that fails the
            client regex both shows an inline error AND blocks submit (review finding — canSubmit checks
            vpaValid). */}
        <Input
          value={a.vpa}
          onChangeText={(v) => patchAccount(idx, { vpa: v })}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder={t('nominee.bank.vpa')}
          accessibilityLabel={t('nominee.bank.vpa')}
          disabled={locked}
        />
        <Text color="$colorPress" fontSize="$2">{t('nominee.bank.vpa_help')}</Text>
        {a.vpa.trim() !== '' && !VPA_RE.test(a.vpa.trim()) ? (
          <Text color="#B00020" accessibilityRole="alert" accessibilityLiveRegion="assertive">
            {t('nominee.bank.vpa_invalid')}
          </Text>
        ) : null}
        <Separator />
      </YStack>
    )
  }

  return (
    <ClaimProxyFlowShell deceasedName={name}>
      <YStack gap="$4" pt="$4">
        <Text fontSize="$7" fontWeight="700">
          {t('nominee.title')}
        </Text>
        <Paragraph color="$colorPress">{t('nominee.help')}</Paragraph>

        {nominees === null ? (
          <Spinner />
        ) : nominees === 'error' ? (
          <>
            <Paragraph>{t('nominee.load_error')}</Paragraph>
            <CallHelplineCTA />
          </>
        ) : nominees.length === 0 ? (
          <>
            <Paragraph>{t('nominee.empty')}</Paragraph>
            <CallHelplineCTA />
          </>
        ) : (
          nominees.map((n, i) => (
            <YStack key={i} gap="$2" py="$2">
              <XStack justify="space-between">
                {/* ⭐ The DECLARED nominee's relationship is one of the fifteen NOMINEE codes (`-237` cl.1) —
                    labelled from `common`'s `nominees.relationship_*`. ⛔ Never the `claim` namespace's
                    `relationship.*`, which holds the five CLAIMANT codes: `t()` throws on a missing key, so
                    13 of the 15 values crashed this screen (code review 2026-09-24). */}
                <Text color="$colorPress">{tCommon(`nominees.relationship_${n.relationship}`)}</Text>
                <Text>{`${n.splitPct}%`}</Text>
              </XStack>
              <XStack justify="space-between">
                <Text color="$colorPress">{t('nominee.phone')}</Text>
                <Text>{n.mobilePresent ? t('nominee.present') : t('nominee.absent')}</Text>
              </XStack>
              <Separator />
            </YStack>
          ))
        )}

        {/* Story 6.8 — dual-account bank collection. */}
        <Text fontSize="$6" fontWeight="700" pt="$2">
          {t('nominee.bank.title')}
        </Text>
        <Paragraph color="$colorPress">{t('nominee.bank.help')}</Paragraph>
        {/* ⚠ Only while the family CAN save — "Saving below will replace both accounts" is false on
            a locked form (code review 2026-09-23c). */}
        {existingBankNames.length > 0 && memberEditable ? (
          <Paragraph color="$colorPress">
            {t('nominee.bank.existing_on_file', { banks: existingBankNames.join(', ') })}
          </Paragraph>
        ) : null}
        {/* Story 6.18 (AC5) — the filer is told their bank details need correcting. ⛔ NOT a denial
            and ⛔ no name: the copy says what to do, never whose name was judged wrong.
            ⚠⚠ AND IT ASKS FOR AN EDIT ONLY WHERE AN EDIT IS POSSIBLE (code review 2026-09-20).
            A live return sits at `verifier_approved` / `reversed` / `state_trustee_freeze` — ⛔ none
            of them member-writable. The old copy said "please check the bank details below" and
            showed an editable form on every one of them, so a grieving family typed corrections and
            got a generic *"could not save"* 409. `-227` cl.10 never asked the family to act: it
            asks the DISTRICT ADMIN to contact them and send the claim back up. That is what the
            staff-route copy says.
            ⛔ `accessibilityLiveRegion` — a bare `accessibilityRole="alert"` does not reliably
            announce on mount (the sibling `NomineeForm` in this same story already pairs them). */}
        {statusUnavailable ? (
          <Text
            color="#B00020"
            accessibilityRole="alert"
            accessibilityLiveRegion="assertive"
            testID="bank_status_unavailable"
          >
            {t('nominee.bank.status_unavailable')}
          </Text>
        ) : null}
        {/* ⭐ THE LOCKED FORM SAYS WHY (BigDev 2026-09-23c, option 1). The 2026-09-23b patch locked
            every field when the member may not edit — correct — but said nothing unless a correction
            was needed, so a family on an approved, frozen, refused or appealed claim met a dead form
            with no reason. `polite`: it is information, ⛔ not an error. */}
        {!memberEditable && !correctionNeeded ? (
          <Text accessibilityRole="text" accessibilityLiveRegion="polite" testID="bank_locked">
            {t('nominee.bank.locked')}
          </Text>
        ) : null}
        {correctionNeeded ? (
          <Text
            color="#B00020"
            accessibilityRole="alert"
            accessibilityLiveRegion="assertive"
            testID="correction_needed"
          >
            {memberEditable
              ? t('nominee.bank.correction_needed')
              : t('nominee.bank.correction_needed_staff')}
          </Text>
        ) : null}
        {accountBlock(0, 'nominee.bank.primary')}
        {accountBlock(1, 'nominee.bank.secondary')}

        {/* ⭐ THE SUBMIT OUTCOME — the two most important messages on the screen to announce, and
            both carried ⛔ NO accessibility role at all (code review 2026-09-22). The family presses
            Save and the focused button's state changes underneath them; without a live region a
            screen-reader user is told ⛔ nothing about whether their nominee's bank details reached
            the Trust. ⚠ `saved` is `polite` — it is good news and must ⛔ not interrupt; `notice`
            is `assertive`, because it means the save did ⛔ not happen.
            ⚠ `saved` uses `accessibilityRole="text"`, ⛔ NOT `"alert"` (code review 2026-09-22) —
            `role="alert"` conventionally forces an assertive/interrupting announcement regardless of
            `accessibilityLiveRegion`, which directly contradicts "must not interrupt" above; `"text"`
            is the pairing this codebase uses everywhere else for a polite announcement (e.g.
            `(signup)/nominees.tsx`, `(life-events)/index.tsx`). */}
        {submit === 'saved' ? (
          <Text color="#1E8E3E" accessibilityRole="text" accessibilityLiveRegion="polite">
            {t('nominee.bank.saved')}
          </Text>
        ) : null}
        {notice ? (
          <Text color="#B00020" accessibilityRole="alert" accessibilityLiveRegion="assertive">
            {notice}
          </Text>
        ) : null}

        <Button theme="accent" disabled={!canSubmit} onPress={() => void onSubmit()}>
          {submit === 'saving' ? <Spinner /> : t('nominee.bank.submit')}
        </Button>

        <CallHelplineCTA label={t('nominee.wrong')} />
      </YStack>
    </ClaimProxyFlowShell>
  )
}
