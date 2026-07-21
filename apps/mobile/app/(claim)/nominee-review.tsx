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
  bankName: string | null
  ifscState: IfscState
}

const emptyAccount = (): AccountFields => ({ holder: '', number: '', ifsc: '', vpa: '', bankName: null, ifscState: 'idle' })

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
        if (active) setExistingBankNames(res.accounts.map((a) => a.bankName))
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
    a.holder.trim() !== '' && a.number.trim() !== '' && a.ifscState === 'ok'
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
      return {
        accountHolderName: a.holder.trim(),
        accountNumber: a.number.trim(),
        ifsc: a.ifsc.trim().toUpperCase(),
        ...(vpa !== '' ? { vpa } : {}),
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
        {a.ifscState === 'error' ? <Text color="#B00020">{t('nominee.bank.ifsc_error')}</Text> : null}
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
          <Text color="#B00020">{t('nominee.bank.vpa_invalid')}</Text>
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
        {accountBlock(0, 'nominee.bank.primary')}
        {accountBlock(1, 'nominee.bank.secondary')}

        {submit === 'saved' ? <Text color="#1E8E3E">{t('nominee.bank.saved')}</Text> : null}
        {notice ? <Text color="#B00020">{notice}</Text> : null}

        <Button theme="accent" disabled={!canSubmit} onPress={() => void onSubmit()}>
          {busy ? <Spinner /> : t('nominee.bank.submit')}
        </Button>

        <CallHelplineCTA label={t('nominee.wrong')} />
      </YStack>
    </ClaimProxyFlowShell>
  )
}
