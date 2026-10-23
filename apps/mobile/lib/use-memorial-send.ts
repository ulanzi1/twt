// Story 11b.4 (AC3 / AC7 / AC7a) — Send, with the NOMINEE's handover code asked for AT SEND, ⛔ never at the start.
//
// The elevation lasts 5 minutes and a family may write over days, so the code is asked only when Send returns
// `403 auth.step_up_required`: the app runs the handover OTP through `use-handover-otp.ts` (⛔ never `useStepUpGate` —
// that texts the SESSION member's phone) and RETRIES ONCE with the draft, the photo and the SAME Idempotency-Key (the 403
// comes before the claim, so the key is unspent). A second refusal after a verified code goes to the helpline (⛔ another
// SMS round trip — the `certificate-replacement.tsx` rule).
//
// ⚠ The hook's outcomes are decided at RENDER time: `send()` returns `Promise<void>` and sets `error` as state (reading it
// right after `await send()` sees a stale closure), and a failed `verify()` sets the same `error`. ⛔ The memorial screen
// never renders `hook.error` (claim copy): send failed ⇔ `masked === null && error !== null`; no nominee ⇔ `noNominee`;
// not verified ⇔ `await verify(code) === false`. ⚠⛔ `otp.send` is rebuilt every render (deps `[t]` on a fresh closure) —
// the send effect is keyed on the 403 OUTCOME only, ⛔ never on `otp.send` (it would text the nominee in a loop).
// ⚠ The hook is ⛔ edited (AC17), so a rate limit is ⛔ told apart from a failed send (a known gap, AC16 (12)).

import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { ApiError } from '@twt/api-client'
import type { MemorialMemberView } from '@twt/contracts'

import { invalidateMemorialQueries, MEMORIAL_VIEW_QUERY_KEY } from '../components/memorial-authorship/useMemorialQueries'
import { memorialSendRefusalKey } from '../components/memorial-authorship/memorial-copy'
import { memorialApi } from './memorial-api'
import {
  clearMemorialDraft,
  dropMemorialSendKey,
  loadMemorialDraft,
  memorialPhotoUri,
  memorialSendKey,
  memorialSendLanded,
} from './memorial-draft'
import { useHandoverOtp } from './use-handover-otp'

export type MemorialSendPhase = 'idle' | 'sending' | 'need_code' | 'sent'

export interface UseMemorialSend {
  readonly phase: MemorialSendPhase
  /** A `memorial` copy key for the last refusal (Pattern 4), or `null`. */
  readonly refusalKey: string | null
  /** The handover leg's render-time state (only meaningful while `phase === 'need_code'`). */
  readonly handover: {
    readonly masked: string | null
    readonly sendFailed: boolean
    readonly noNominee: boolean
    readonly notVerified: boolean
    readonly busy: boolean
  }
  send(): Promise<void>
  confirmCode(code: string): Promise<void>
}

export function useMemorialSend(args: {
  readonly memberId: string
  readonly view: MemorialMemberView
  readonly locale: 'hi' | 'en'
  readonly onSent: () => void
}): UseMemorialSend {
  const { memberId, view, locale, onSent } = args
  const queryClient = useQueryClient()
  const otp = useHandoverOtp()
  const [phase, setPhase] = useState<MemorialSendPhase>('idle')
  const [refusalKey, setRefusalKey] = useState<string | null>(null)
  const [notVerified, setNotVerified] = useState(false)
  // Did we already retry after a VERIFIED code? (A second refusal then goes to the helpline.)
  const retriedAfterCode = useRef(false)
  const onSentRef = useRef(onSent)
  onSentRef.current = onSent

  async function landed(): Promise<void> {
    clearMemorialDraft(memberId, view.driveId)
    await invalidateMemorialQueries(queryClient)
    setPhase('sent')
    onSentRef.current()
  }

  async function attempt(): Promise<void> {
    setPhase('sending')
    setRefusalKey(null)
    const draft = loadMemorialDraft(memberId, view.driveId)
    const pending = memorialSendKey(memberId, view.driveId, view.submissionId)
    const form = new FormData()
    form.append('body', draft.body ?? '')
    form.append('authorisationCopyVersion', view.authorisation.copyVersion)
    form.append('authorisationLocale', locale)
    const photoUri = memorialPhotoUri(draft.photoFileName)
    if (draft.keepPreviousPhoto) form.append('keepPreviousPhoto', 'true')
    if (photoUri !== null || draft.keepPreviousPhoto) form.append('altText', draft.altText ?? '')
    if (photoUri !== null && !draft.keepPreviousPhoto) {
      // RN multipart: the { uri, name, type } descriptor (cast — RN's FormData accepts it).
      form.append('photo', { uri: photoUri, name: draft.photoFileName, type: draft.photoMime ?? 'image/jpeg' } as unknown as Blob)
    }
    try {
      await memorialApi.send(form, { idempotencyKey: pending.idempotencyKey })
      await landed() // ANY 2xx — 201, or the 200 replay
    } catch (err) {
      const code = err instanceof ApiError ? err.code : ''
      if (code === 'auth.step_up_required') {
        if (retriedAfterCode.current) {
          setRefusalKey('handover.still_refused')
          setPhase('idle')
          return
        }
        setPhase('need_code')
        return
      }
      if (code === 'memorial.idempotency_in_progress') {
        const fresh = await queryClient.fetchQuery({ queryKey: MEMORIAL_VIEW_QUERY_KEY, queryFn: () => memorialApi.view(), gcTime: 0, staleTime: 0 })
        if (memorialSendLanded(pending, fresh.memorial?.submissionId ?? null)) {
          await landed()
          return
        }
        dropMemorialSendKey(memberId, view.driveId)
        setRefusalKey('send.try_again')
        setPhase('idle')
        return
      }
      if (code === 'memorial.authorisation_outdated') await invalidateMemorialQueries(queryClient) // reload the text
      setRefusalKey(memorialSendRefusalKey(code))
      setPhase('idle')
    }
  }

  // ⭐ The send effect is keyed on the 403 OUTCOME only — ⛔ never on `otp.send` (rebuilt every render).
  useEffect(() => {
    if (phase !== 'need_code') return
    void otp.send()
  }, [phase])

  return {
    phase,
    refusalKey,
    handover: {
      masked: otp.masked,
      sendFailed: otp.masked === null && otp.error !== null,
      noNominee: otp.noNominee,
      notVerified,
      busy: otp.busy,
    },
    send: attempt,
    async confirmCode(code: string): Promise<void> {
      setNotVerified(false)
      const ok = await otp.verify(code)
      if (!ok) {
        setNotVerified(true)
        return
      }
      retriedAfterCode.current = true
      await attempt()
    },
  }
}

/**
 * The same handover leg for the family's WITHDRAW (AC7a): run `action`; on `403 auth.step_up_required` ask the nominee's
 * code and retry ONCE; a second refusal after a verified code ⇒ `exhausted` (the helpline). Any other refusal is returned
 * to the caller through `onRefused` (⛔ swallowed).
 */
export function useHandoverGatedAction(action: () => Promise<void>, onRefused: (code: string) => void) {
  const otp = useHandoverOtp()
  const [needCode, setNeedCode] = useState(false)
  const [notVerified, setNotVerified] = useState(false)
  const [exhausted, setExhausted] = useState(false)
  const retried = useRef(false)

  async function run(): Promise<void> {
    try {
      await action()
      setNeedCode(false)
    } catch (err) {
      const code = err instanceof ApiError ? err.code : ''
      if (code !== 'auth.step_up_required') {
        onRefused(code)
        return
      }
      if (retried.current) {
        setNeedCode(false)
        setExhausted(true)
        return
      }
      setNeedCode(true)
    }
  }

  // ⭐ Keyed on the 403 outcome only — ⛔ never on `otp.send`.
  useEffect(() => {
    if (needCode) void otp.send()
  }, [needCode])

  return {
    needCode,
    exhausted,
    handover: {
      masked: otp.masked,
      sendFailed: otp.masked === null && otp.error !== null,
      noNominee: otp.noNominee,
      notVerified,
      busy: otp.busy,
    },
    run,
    async confirmCode(code: string): Promise<void> {
      setNotVerified(false)
      if (!(await otp.verify(code))) {
        setNotVerified(true)
        return
      }
      retried.current = true
      await run()
    },
  }
}
