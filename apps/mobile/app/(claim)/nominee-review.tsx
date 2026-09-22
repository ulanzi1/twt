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

import { useEffect, useRef, useState } from 'react'

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
import { useRouter } from 'expo-router'
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

export default function NomineeReviewScreen(): React.ReactElement {
  const t = useClaimT()
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
  useEffect(() => {
    if (!claimCaseId) return
    let active = true
    claimApi
      .nomineeBankStatus(claimCaseId)
      .then((res) => {
        if (!active) return
        setExistingBankNames(res.accounts.map((a) => a.bankName))
        // Story 6.18 (AC5) — the filer is told their bank details need correcting.
        setCorrectionNeeded(res.correctionNeeded === true)
        setMemberEditable(res.memberEditable !== false)
      })
      .catch(() => {
        // Best-effort — the form still works blank if the status fetch fails.
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
    submit !== 'saving'

  async function onSubmit(): Promise<void> {
    if (!claimCaseId) return
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
    router.push('/(claim)/acknowledgement')
  }

  const busy = submit === 'saving'

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
          disabled={busy}
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
          disabled={busy}
        />
        <Input
          value={a.number}
          onChangeText={(v) => patchAccount(idx, { number: v.replace(/[^0-9]/g, '') })}
          keyboardType="number-pad"
          placeholder={t('nominee.bank.number')}
          accessibilityLabel={t('nominee.bank.number')}
          disabled={busy}
        />
        <Input
          value={a.ifsc}
          onChangeText={(v) => patchAccount(idx, { ifsc: v.toUpperCase(), ifscState: 'idle', bankName: null })}
          onBlur={() => void resolveIfsc(idx)}
          autoCapitalize="characters"
          maxLength={11}
          placeholder={t('nominee.bank.ifsc')}
          accessibilityLabel={t('nominee.bank.ifsc')}
          disabled={busy}
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
          disabled={busy}
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
                <Text color="$colorPress">{t(`relationship.${n.relationship}`)}</Text>
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
        {existingBankNames.length > 0 ? (
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
            is `assertive`, because it means the save did ⛔ not happen. */}
        {submit === 'saved' ? (
          <Text color="#1E8E3E" accessibilityRole="alert" accessibilityLiveRegion="polite">
            {t('nominee.bank.saved')}
          </Text>
        ) : null}
        {notice ? (
          <Text color="#B00020" accessibilityRole="alert" accessibilityLiveRegion="assertive">
            {notice}
          </Text>
        ) : null}

        <Button theme="accent" disabled={!canSubmit} onPress={() => void onSubmit()}>
          {busy ? <Spinner /> : t('nominee.bank.submit')}
        </Button>

        <CallHelplineCTA label={t('nominee.wrong')} />
      </YStack>
    </ClaimProxyFlowShell>
  )
}
