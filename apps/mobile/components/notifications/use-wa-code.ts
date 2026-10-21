// The WhatsApp-code form's state — Story 5.13 (Task 5.2; AC9, AC13; WC3, WC7, WC16; Decision 2026-10-21-376).
//
// Owned by `OtherPhoneCodeHint` for as long as the signup step's body shows: collapsing the link hides the form's VIEW only, so a
// sent code, the counts, the countdown, the last line and an in-flight call all survive collapse → expand. ONE call in flight (a
// ref, ⛔ state — two presses in one frame both see the pre-update closure). Late results are dropped by the hook's OWN version
// counter, bumped on blur and on unmount (⛔ by a collapse; ⛔ the step's counter, which "Open WhatsApp again" also bumps) — a late
// result's DATA is dropped, but `busy` is always cleared, so a refocused form is never stuck disabled (code review P2) — and a
// dropped VERIFY also clears the code it sent, so a refocused Confirm can ⛔ resubmit a code the server may have just called wrong
// (code review round 2). Every
// call is bounded (`withTimeout` — the transport has ⛔ timeout). The wait is a countdown from the server's `retryAfterSeconds`
// (⛔ the device clock). ⭐ TOLD: the member is told a code MAY have been sent by a 200, a non-`ApiError` Send, an `ApiError` ≥ 500
// whose code is ⛔ `wa_opt_in.*` with unparseable details, or the mint's `liveCode` — only then is the button "Send another code".
// `t` is ⛔ here at all (the view renders the words — [[project_uset_fresh_closure_memo_trap]]).

import { useCallback, useEffect, useRef, useState } from 'react'

import { ApiError } from '@twt/api-client'
import { WaOptInCodeErrorDetails, type CreateWaOptInResponse } from '@twt/contracts'
import { useFocusEffect } from 'expo-router'

import { memberAuth } from '../../lib/member-api'
import { CALL_TIMEOUT_MS, withTimeout } from '../../lib/with-timeout'

/** The wait after a send whose count is unknown (the server's 409 decides — AC9). */
const UNKNOWN_WAIT_SECONDS = 60

/** The form's one line. `sent` / `sent_uncertain` are status lines; the rest are errors. */
export type WaCodeLine =
  | 'sent'
  | 'sent_uncertain'
  | 'wrong_retry'
  | 'wrong_final'
  | 'no_longer_valid'
  | 'send_failed'
  | 'verify_failed'
  | 'no_more'

export interface WaCodeState {
  /** The member was TOLD a code may have been sent (header). */
  readonly told: boolean
  /** The code field shows (a code may still be typed). */
  readonly field: boolean
  /** Counted sends still possible; null = unknown (a send whose answer never came). */
  readonly codesRemaining: 0 | 1 | 2 | null
  /** Seconds before a send may be asked for (a countdown — ⛔ the device clock). */
  readonly wait: number
  readonly line: WaCodeLine | null
  /** The closed route — 5.10's number + phrase below the form. */
  readonly closed: boolean
  /** The code route cannot send at all (the mint said `codeAvailable: false`, or the server said so) — ⛔ send / resend button. */
  readonly sendBlocked: boolean
  /** The request lapsed (`not_pending`) — `no_longer_valid` ALONE (its phrase has lapsed too). */
  readonly lapsed: boolean
  readonly code: string
  readonly busy: boolean
  /** Bumped on every send the member is told about — the announcement keys on it (a second `sent` is spoken). */
  readonly sendCount: number
  /**
   * Bumped when a press is answered with a wait the member is ⛔ otherwise told about (`rate_limit.exceeded`, `code_resend_too_soon`,
   * a `code_send_failed` carrying `retryAfterSeconds` — code review round 2) — `resend_wait` is spoken on it, queued behind any line.
   */
  readonly waitCount: number
}

export interface WaCode extends WaCodeState {
  readonly showSend: boolean
  readonly showResend: boolean
  readonly canConfirm: boolean
  setCode(next: string): void
  send(): Promise<void>
  confirm(): Promise<void>
}

/** The state the form opens in, from the mint (WC7): a live code opens at the field; `codeAvailable: false` closes the route. */
export function initialWaCodeState(minted: CreateWaOptInResponse): WaCodeState {
  return {
    told: minted.liveCode,
    field: minted.liveCode,
    codesRemaining: minted.codesRemaining,
    wait: 0,
    line: minted.liveCode ? (minted.liveCodeDelivery === 'sent' ? 'sent' : 'sent_uncertain') : null,
    closed: !minted.codeAvailable,
    sendBlocked: !minted.codeAvailable,
    lapsed: false,
    code: '',
    busy: false,
    sendCount: 0,
    waitCount: 0,
  }
}

/** `ApiError.details` (typed `unknown`) read through the SHARED schema — null when it does ⛔ parse. */
function detailsOf(err: ApiError): WaOptInCodeErrorDetails | null {
  const parsed = WaOptInCodeErrorDetails.safeParse(err.details)
  return parsed.success ? parsed.data : null
}

/** `inner`'s characters appear in `outer` in order (⛔ necessarily together) — an edit that only added to `inner`. */
function keepsInOrder(outer: string, inner: string): boolean {
  let i = 0
  for (const ch of outer) if (i < inner.length && ch === inner[i]) i += 1
  return i === inner.length
}

/** A failure that may have followed a sent code: ⛔ an `ApiError`, or a ≥ 500 whose code is ⛔ ours and whose details do ⛔ parse. */
function mayHaveSent(err: unknown): boolean {
  if (!(err instanceof ApiError)) return true
  return err.status >= 500 && !err.code.startsWith('wa_opt_in.') && detailsOf(err) === null
}

export function useWaCode(minted: CreateWaOptInResponse, onActivated: () => void): WaCode {
  const [state, setState] = useState<WaCodeState>(() => initialWaCodeState(minted))
  const busyRef = useRef(false)
  const version = useRef(0)
  const patch = useCallback((next: Partial<WaCodeState>) => setState((s) => ({ ...s, ...next })), [])

  // Blur and unmount invalidate an in-flight call (⛔ a collapse — the hook outlives the view).
  useFocusEffect(useCallback(() => () => { version.current += 1 }, []))
  useEffect(() => () => { version.current += 1 }, [])

  // The countdown — one tick a second while waiting (⛔ the device clock).
  const waiting = state.wait > 0
  useEffect(() => {
    if (!waiting) return
    const timer = setInterval(() => setState((s) => ({ ...s, wait: Math.max(0, s.wait - 1) })), 1000)
    return () => clearInterval(timer)
  }, [waiting])

  // Digits only, six at most — normalized BEFORE the limit (a pasted "123 456"). An edit that only ADDS to a FULL code (the old six
  // still there, in order — a digit typed or a paste dropped anywhere in it) is refused, as native `maxLength` refuses any insert
  // at the limit (⛔ slice: it would silently splice a wrong code — code review round 2). An edit that REPLACES it (the field
  // selected, a whole message pasted over it) is normalized, then cut to six.
  const setCode = useCallback(
    (next: string) =>
      setState((s) => {
        const digits = next.replace(/\D/g, '')
        return digits.length > 6 && s.code.length === 6 && keepsInOrder(digits, s.code) ? s : { ...s, code: digits.slice(0, 6) }
      }),
    [],
  )

  const send = useCallback(async (): Promise<void> => {
    if (busyRef.current) return
    busyRef.current = true
    patch({ busy: true })
    const v = ++version.current
    const current = () => version.current === v
    try {
      const res = await withTimeout(memberAuth.sendWaOptInCode(), CALL_TIMEOUT_MS)
      if (!current()) return
      setState((s) => ({
        ...s,
        told: true,
        field: true,
        codesRemaining: res.codesRemaining,
        wait: res.retryAfterSeconds ?? 0,
        line: res.delivery === 'sent' ? 'sent' : 'sent_uncertain',
        closed: false,
        sendCount: s.sendCount + 1,
      }))
    } catch (err) {
      if (!current()) return
      if (mayHaveSent(err)) {
        // A code may have been sent — the field, and the count unknown (the server's 409 decides the next send).
        setState((s) => ({ ...s, told: true, field: true, codesRemaining: null, wait: UNKNOWN_WAIT_SECONDS, line: 'sent_uncertain', sendCount: s.sendCount + 1 }))
        return
      }
      const e = err as ApiError
      const d = detailsOf(e)
      const keepField = d?.liveCode ?? false
      // An answer that shows a live code the member was ⛔ told of (a send whose answer a blur dropped): TELL them now —
      // `sent_uncertain` ("if it arrives on WhatsApp, type it here"), spoken on the send counter; a wait with it is shown, ⛔ spoken
      // on top (the 200-with-a-wait shape). Every send-error arm that keeps the field (code review round 2).
      const newlyTold = (s: WaCodeState): boolean => !s.told && keepField
      switch (e.code) {
        case 'wa_opt_in.already_active':
          onActivated()
          return
        case 'wa_opt_in.not_pending':
          patch({ line: 'no_longer_valid', lapsed: true, field: false, closed: false })
          return
        case 'wa_opt_in.code_resend_too_soon':
          // A live code the member was ⛔ told of (its send's answer was dropped by a blur): TELL them now — `sent_uncertain`, spoken
          // on the send counter, the wait shown ⛔ spoken on top (the 200-with-a-wait shape — code review round 2).
          setState((s) => {
            const told = newlyTold(s)
            return {
              ...s,
              wait: d?.retryAfterSeconds ?? UNKNOWN_WAIT_SECONDS,
              field: d ? d.liveCode : s.field,
              codesRemaining: d?.codesRemaining ?? s.codesRemaining,
              told: s.told || keepField,
              line: told ? 'sent_uncertain' : s.line,
              sendCount: told ? s.sendCount + 1 : s.sendCount,
              waitCount: told ? s.waitCount : s.waitCount + 1,
            }
          })
          return
        case 'rate_limit.exceeded':
          setState((s) => ({ ...s, wait: UNKNOWN_WAIT_SECONDS, waitCount: s.waitCount + 1 }))
          return
        case 'wa_opt_in.code_send_failed':
          if (d === null) break
          // A released FIRST send (2 left): the line and the send button (after any wait) — ⛔ the number + phrase yet.
          // One left: also the closed route below. ⛔ left: the closed route.
          // A wait with it (Meta rate-limited the send): `resend_wait` is spoken too, queued behind `send_failed` (code review round 2)
          // — ⛔ when this answer TELLS the member of a live code (`sent_uncertain` is spoken instead; the wait is shown).
          setState((s) => {
            const told = newlyTold(s)
            return {
              ...s,
              line: told ? 'sent_uncertain' : 'send_failed',
              told: s.told || keepField,
              sendCount: told ? s.sendCount + 1 : s.sendCount,
              codesRemaining: d.codesRemaining,
              wait: d.retryAfterSeconds ?? 0,
              field: keepField,
              closed: d.codesRemaining < 2,
              waitCount: !told && (d.retryAfterSeconds ?? 0) > 0 ? s.waitCount + 1 : s.waitCount,
            }
          })
          return
        case 'wa_opt_in.code_limit_reached':
          // ⛔ more sends — the number + phrase below say what is left; an untold live code is told first (`sent_uncertain`).
          setState((s) => {
            const told = newlyTold(s)
            return {
              ...s,
              line: told ? 'sent_uncertain' : 'no_more',
              told: s.told || keepField,
              sendCount: told ? s.sendCount + 1 : s.sendCount,
              codesRemaining: 0,
              field: keepField,
              closed: true,
            }
          })
          return
        default:
          break
      }
      // `code_unavailable`, `code_not_offered`, `channel_unavailable`, any other 4xx, a `wa_opt_in.*` code with details that do ⛔
      // parse: the line and the closed route; ⛔ send again (it would fail the same way).
      patch({ line: 'send_failed', field: keepField, closed: true, sendBlocked: true })
    } finally {
      busyRef.current = false
      // ALWAYS (⛔ `current()`): a blur drops the result, ⛔ the form — after unmount this setState is a no-op.
      patch({ busy: false })
    }
  }, [patch, onActivated])

  const confirm = useCallback(async (): Promise<void> => {
    if (busyRef.current) return
    const code = state.code
    if (code.length !== 6) return
    busyRef.current = true
    patch({ busy: true })
    const v = ++version.current
    const current = () => version.current === v
    /** A verify whose answer is unknown: ONE bounded status re-read decides (AC9). */
    const reread = async (): Promise<void> => {
      try {
        const status = await withTimeout(memberAuth.getWaOptInStatus(), CALL_TIMEOUT_MS)
        if (!current()) return
        if (status.state === 'ACTIVE') onActivated()
        else if (status.state === 'PENDING') patch({ line: 'verify_failed' })
        else patch({ line: 'no_longer_valid', lapsed: true, field: false, closed: false })
      } catch {
        if (current()) patch({ line: 'verify_failed' })
      }
    }
    try {
      await withTimeout(memberAuth.verifyWaOptInCode(code), CALL_TIMEOUT_MS)
      if (!current()) return
      onActivated()
    } catch (err) {
      if (!current()) return
      if (!(err instanceof ApiError)) return await reread()
      const d = detailsOf(err)
      switch (err.code) {
        case 'wa_opt_in.already_active':
          onActivated()
          return
        case 'wa_opt_in.not_pending':
          patch({ line: 'no_longer_valid', lapsed: true, field: false, closed: false })
          return
        case 'wa_opt_in.code_wrong':
          if (d !== null && (d.attemptsRemaining ?? 0) >= 1) {
            patch({ line: 'wrong_retry', code: '', codesRemaining: d.codesRemaining })
            return
          }
          patch({
            line: 'wrong_final',
            code: '',
            codesRemaining: d?.codesRemaining ?? 0,
            field: d?.liveCode ?? false,
            closed: (d?.codesRemaining ?? 0) === 0 && !(d?.liveCode ?? false),
          })
          return
        case 'wa_opt_in.code_no_longer_valid':
          patch({ line: 'no_longer_valid', code: '', codesRemaining: d?.codesRemaining ?? 0, field: false, closed: (d?.codesRemaining ?? 0) === 0 })
          return
        default:
          // `invalid_state`, a 5xx, a 429, any other answer: the status re-read decides.
          return await reread()
      }
    } finally {
      busyRef.current = false
      // ALWAYS (⛔ `current()`): a blur drops the result, ⛔ the form — after unmount this setState is a no-op. A DROPPED result also
      // clears the code it sent (unless the member already typed another) — it may have been wrong, and a second Confirm of the
      // same digits would spend the last try (code review round 2).
      const dropped = !current()
      setState((s) => ({ ...s, busy: false, code: dropped && s.code === code ? '' : s.code }))
    }
  }, [patch, onActivated, state.code])

  const sendable = !state.sendBlocked && !state.lapsed && state.codesRemaining !== 0
  return {
    ...state,
    // Sending blocked, or ⛔ count left ⇒ the closed route ALWAYS (I6 — a dead live code must ⛔ strand the member; both codes
    // spent shows the number + phrase below the field however the member got there — the mint's `codeAvailable: false` does too —
    // code review round 2). ⛔ once the request lapsed (its phrase lapsed with it).
    closed: state.closed || state.sendBlocked || (state.codesRemaining === 0 && !state.lapsed),
    showSend: sendable && !state.told,
    // Once told, ANY count still left (1, unknown, or 2 after a told-but-released send) keeps "Send another code" (I6 — code review P2).
    showResend: sendable && state.told,
    canConfirm: state.field && !state.lapsed && state.code.length === 6 && !state.busy,
    setCode,
    send,
    confirm,
  }
}
