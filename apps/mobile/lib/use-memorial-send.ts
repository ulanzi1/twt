// Story 11b.4 (AC3 / AC7 / AC7a / AC8) — Send and Withdraw, with the NOMINEE's handover code asked for AT SEND, ⛔ never at
// the start.
//
// The elevation lasts 5 minutes and a family may write over days, so the code is asked only when a request returns
// `403 auth.step_up_required`: the app runs the handover OTP through `use-handover-otp.ts` (⛔ never `useStepUpGate` — that
// texts the SESSION member's phone) and RETRIES ONCE with the draft, the photo and the SAME Idempotency-Key. A refusal of that
// retry goes to the helpline (⛔ never another SMS round trip — the `certificate-replacement.tsx` rule).
//
// ⭐ Y round (BigDev 2026-10-24, "simplify" + "key on the row"): WHEN to ask for a code, retry, or send the family to the
// helpline is decided by ONE explicit state machine — the pure reducer in `handover-gate.ts`, shared by Send and Withdraw —
// and these hooks are thin: they run the request the machine allows and feed its answer back. ⛔ No clock decides anything
// (the T3 / V3 / W1 key times, the W2 elevation window, the V5 / W4 refetch bound are gone), and ⛔ no Send refetches the view
// first: the server keeps the Idempotency-Key ON the submission row, so a retry under a kept key replays its first result at
// ANY age and a duplicate waits and replays — the phone never has to guess what the server did. A `409
// memorial.idempotency_in_progress` (an OLDER server only) keeps the key and says "try again".
//
// ⚠ The OTP hook's outcomes are decided at RENDER time: `send()` returns `Promise<void>` and sets `error` as state, and a failed
// `verify()` sets the same `error`. ⛔ The memorial screen never renders `hook.error` (claim copy): not verified ⇔ `await
// verify(code) === false`; the SEND's outcome is read PER CODE REQUEST (Z5): the shared hook keeps `masked` from an earlier
// request (it only clears `error` at a new one), so after a second request whose SMS failed `masked === null && error !==
// null` was false and the OLD "code sent to ****" stood over no SMS. The memorial hooks therefore note when THIS request's
// `send()` has settled and read `masked` / `error` once, at that render (the request's own result); until then the panel waits.
// The shared hook is ⛔ not edited (AC17 — the claim screens keep its behaviour). ⚠⛔ `otp.send` is rebuilt every render
// (deps `[t]` on a fresh closure) — the SMS effect is keyed on the machine's `codeRequests` (one per ENTRY into `need_code`,
// one per "Send a new code"), ⛔ never on `otp.send` (it would text the nominee in a loop). ⚠ A rate limit is ⛔ not told
// apart from a failed send (a known gap, AC16 (12)).
//
// ⭐ Every user action goes through the machine FIRST, and is IGNORED unless the phase allows it: the guard reads a REF that
// is updated synchronously, so two taps in one frame start one request (X7).
//
// A Send in flight is tied to its screen (P1):
//   · the draft CONTENT is snapshotted before the request; on a 2xx the draft is cleared only if the saved content still
//     equals the snapshot — a draft edited meanwhile is a NEWER draft and survives, its photo copy included (saving the edit
//     already dropped the kept key — R6);
//   · the outcome is navigated to only if the screen that started the Send is still mounted AND in front; an outcome OWED to a
//     screen that was behind another one is shown on its return to the front only if nothing newer was written meanwhile
//     (V9 (b) — the stored draft is re-checked then);
//   · while a request is in flight, Android's hardware back is consumed and the iOS swipe-back gesture is off for this screen.

import { useCallback, useEffect, useRef, useState } from 'react'
import { BackHandler } from 'react-native'
import { useFocusEffect, useNavigation } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'

import { ApiError } from '@twt/api-client'
import type { MemorialMemberView } from '@twt/contracts'

import type { HandoverPanelState } from '../components/memorial-authorship/HandoverCodePanel'
import { invalidateMemorialQueries } from '../components/memorial-authorship/useMemorialQueries'
import { memorialSendRefusalKey } from '../components/memorial-authorship/memorial-copy'
import { memorialKinshipForSend } from '../components/memorial-authorship/memorial-kinship'
import {
  HANDOVER_GATE_INITIAL,
  handoverGateCanPress,
  handoverGateCanResend,
  handoverGateCodeAsked,
  handoverGateInFlight,
  handoverGateReduce,
  handoverGateRefused,
  type HandoverGateAnswer,
  type HandoverGateEvent,
  type HandoverGatePhase,
  type HandoverGateRefusal,
  type HandoverGateState,
} from './handover-gate'
import { memorialApi } from './memorial-api'
import {
  clearMemorialDraft,
  loadMemorialDraft,
  memorialDraftContentSignature,
  memorialPhotoUri,
  memorialSendKey,
} from './memorial-draft'
import { useHandoverOtp, type UseHandoverOtpResult } from './use-handover-otp'

/**
 * X5 — refresh the memorial queries WITHOUT waiting: `invalidateQueries` resolves only after the refetch it starts, and a hung
 * link must not hold a screen in flight (the screens refetch on mount anyway).
 */
function refreshMemorialQueries(client: ReturnType<typeof useQueryClient>): void {
  void Promise.resolve(invalidateMemorialQueries(client)).catch(() => undefined)
}

/** The signature of an EMPTY draft — what a landed Send leaves behind once it cleared the draft (V9 (b)). */
const CLEARED_DRAFT_SIGNATURE = memorialDraftContentSignature({})

/**
 * How a failed request ended, for the machine. A PROVING answer is the API's own error envelope from AFTER the step-up check;
 * anything else proves nothing about the step-up ⇒ `no_answer` (the safe side: a retry stays a retry):
 *   · a network error, a timeout, a page with no envelope (a gateway's 502: `http.<status>`) — nothing that checked it;
 *   · Z4 (a) — an answer that may come from BEFORE it: the write routes run the rate limit → the memorial switch → the member
 *     session → the step-up (`apps/api/src/modules/memorial/routes.ts`), so a `429`, an `auth.*` refusal (a lapsed session),
 *     `memorial.not_found` (the switch's neutral 404) and any `5xx` (a preHandler that failed) are ⛔ proof it passed.
 */
export function handoverGateAnswerOf(err: unknown): HandoverGateAnswer {
  if (!(err instanceof ApiError) || err.code.startsWith('http.')) return { kind: 'no_answer' }
  if (err.code === 'auth.step_up_required') return { kind: 'step_up' }
  if (err.status === 429 || err.status >= 500 || err.code.startsWith('auth.') || err.code === 'memorial.not_found') return { kind: 'no_answer' }
  return { kind: 'refused', code: err.code }
}

/** The machine, with a synchronous REF guard: `dispatch` returns `false` (and changes nothing) for an event not allowed now. */
function useHandoverGate(): { readonly state: HandoverGateState; dispatch(e: HandoverGateEvent): boolean } {
  const [state, setState] = useState<HandoverGateState>(HANDOVER_GATE_INITIAL)
  const ref = useRef(state)
  const dispatch = useCallback((e: HandoverGateEvent): boolean => {
    const next = handoverGateReduce(ref.current, e)
    if (next === ref.current) return false
    ref.current = next
    setState(next)
    return true
  }, [])
  return { state, dispatch }
}

/** Z5 — what the code request numbered `request` came to: the masked number it was sent to (`''` — no nominee), or failed. */
interface CodeRequestResult {
  readonly request: number
  readonly masked: string | null
  readonly failed: boolean
}

/** Run `then` once `p` has settled, whatever it came to (the hook's `send()` never rejects; a stand-in may return nothing). */
function settle(p: Promise<void> | undefined, then: () => void): Promise<void> {
  return Promise.resolve(p).then(then, then)
}

/**
 * One SMS per code request — keyed on the machine's counter, ⛔ never on `otp.send` (rebuilt every render). Z5 — returns what
 * THIS request came to (`null` while its SMS is on its way): the request's number is noted once its `send()` has settled, and
 * the hook's `masked` / `error` are read at THAT render (its state updates are applied before or with the note — never after).
 */
function useCodeRequestSms(codeRequests: number, otp: UseHandoverOtpResult): CodeRequestResult | null {
  const [settled, setSettled] = useState(0)
  const [result, setResult] = useState<CodeRequestResult | null>(null)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  useEffect(() => {
    if (codeRequests > 0) void settle(otp.send(), () => mounted.current && setSettled((n) => Math.max(n, codeRequests)))
  }, [codeRequests])
  useEffect(() => {
    // `otp` here is the render that saw `settled` change: this request's own result.
    if (settled > 0) setResult({ request: settled, masked: otp.error !== null ? null : otp.masked, failed: otp.error !== null })
  }, [settled])
  return result !== null && result.request === codeRequests ? result : null
}

function panelState(state: HandoverGateState, otp: UseHandoverOtpResult, sms: CodeRequestResult | null): HandoverPanelState {
  return {
    // Z5 — the CURRENT request's result only; while its SMS is on its way, nothing (the panel waits — ⛔ an older number).
    masked: sms?.masked ?? null,
    sendFailed: sms?.failed === true,
    noNominee: sms?.masked === '',
    notVerified: state.notVerified,
    // X3 — Confirm is OFF unless the code is being asked for: while it is checked, and while its retry runs.
    busy: state.phase !== 'need_code' || otp.busy,
    // Z0 (A) — "Send a new code" (the panel decides WHEN to show it: the SMS failed, or a wait since it was sent).
    canResend: handoverGateCanResend(state),
    request: state.codeRequests,
  }
}

/** The `memorial` copy key for what the family is told after the last Send attempt. */
function sendRefusalKey(refusal: HandoverGateRefusal): string | null {
  if (refusal === null) return null
  if (refusal.kind === 'still_refused') return 'handover.still_refused'
  if (refusal.kind === 'no_answer') return 'send.try_again'
  return memorialSendRefusalKey(refusal.code)
}

export interface UseMemorialSend {
  readonly phase: HandoverGatePhase
  /** A request is in flight (Send shows "Sending…", the edit buttons are off, Back is consumed). */
  readonly inFlight: boolean
  /** Send may be pressed now. */
  readonly canSend: boolean
  /** The nominee's code panel is shown. */
  readonly codeAsked: boolean
  /** A `memorial` copy key for the last refusal (Pattern 4), or `null`. */
  readonly refusalKey: string | null
  readonly handover: HandoverPanelState
  send(): Promise<void>
  confirmCode(code: string): Promise<void>
  /** Z0 (A) — "Send a new code" on the code panel (ONE new SMS; ignored unless the machine allows it). */
  resendCode(): void
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
  const gate = useHandoverGate()
  const phase = gate.state.phase
  const inFlight = handoverGateInFlight(phase)
  const sms = useCodeRequestSms(gate.state.codeRequests, otp)
  // Z4 (b) — the content signature the last POST sent: a press finding the draft changed since is a NEW Send, ⛔ the retry.
  const postedContent = useRef<string | null>(null)
  // Z3 — a key minted on this screen whose SAVE failed (full storage), with the content it was minted for: reused (and saved
  // again) before another is minted, for the screen's life — an edit (other content) never reuses it (R6).
  const unsavedKey = useRef<{ readonly idempotencyKey: string; readonly content: string } | null>(null)
  const onSentRef = useRef(onSent)
  onSentRef.current = onSent
  const navigation = useNavigation()

  // Is the screen that started the Send still here, and in front? (`useFocusEffect`'s cleanup also runs on unmount.)
  const mountedRef = useRef(true)
  const focusedRef = useRef(true)
  // T6 — a Send that landed while this screen was BEHIND another one, with the sent words unchanged (the draft is cleared):
  // the outcome is owed, and is shown when the screen comes back to the front. It holds the SENT content's signature (`null`
  // ⇒ nothing owed): V9 (b) re-checks the stored draft against it on that return.
  const outcomeOwed = useRef<string | null>(null)
  // The draft's ids for the (stable) focus callback.
  const ids = useRef({ memberId, driveId: view.driveId })
  ids.current = { memberId, driveId: view.driveId }
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])
  useFocusEffect(
    useCallback(() => {
      focusedRef.current = true
      const owed = outcomeOwed.current
      if (owed !== null) {
        outcomeOwed.current = null
        // V9 (b) — only if nothing newer was written while this screen was behind: the stored draft is still the sent content,
        // or the cleared remains of it. A NEWER draft owes nothing — ⛔ never the outcome over words not yet sent.
        const now = memorialDraftContentSignature(loadMemorialDraft(ids.current.memberId, ids.current.driveId))
        if (now === owed || now === CLEARED_DRAFT_SIGNATURE) onSentRef.current()
      }
      return () => {
        focusedRef.current = false
      }
    }, []),
  )

  // (c) While a request is in flight the screen cannot be backed out of by accident: Android's hardware back is consumed
  // (registered ONLY then) and the iOS swipe-back gesture is off. "Save and come back" stays allowed — it is safe.
  useEffect(() => {
    navigation.setOptions({ gestureEnabled: !inFlight })
    if (!inFlight) return
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true)
    return () => sub.remove()
  }, [inFlight, navigation])

  /** A 2xx (`201`, or the `200` replay). `sent` is the content signature this attempt SENT. */
  function landed(sent: string): void {
    const unchanged = memorialDraftContentSignature(loadMemorialDraft(memberId, view.driveId)) === sent
    if (unchanged) clearMemorialDraft(memberId, view.driveId) // a newer draft (and its photo copy) is never touched
    unsavedKey.current = null // any 2xx ends the key (Z3: the one held in memory too)
    gate.dispatch({ type: 'answer', answer: { kind: 'ok' } })
    refreshMemorialQueries(queryClient) // X5 — ⛔ not awaited
    if (!mountedRef.current) return // resolved after the screen was left: nowhere to navigate
    // Navigate only when the family is still on this screen and has not written anything newer since. Behind another screen
    // with the sent words unchanged ⇒ the outcome is OWED, shown on the return to the front (T6). A NEWER draft owes nothing
    // (P1 (a)): the family is never taken to the outcome over words they have not sent.
    if (!unchanged) return
    if (focusedRef.current) onSentRef.current()
    else outcomeOwed.current = sent
  }

  /** The POST the machine has just allowed (`sending`, `retrying` or `refused_sending`), and its answer fed back. */
  async function post(): Promise<void> {
    const draft = loadMemorialDraft(memberId, view.driveId)
    const sent = memorialDraftContentSignature(draft)
    // The kept key, else a new one (kept until any 2xx; an edit drops it — R6). ⛔ No age check: the server replays at any age.
    // Z3 — else the key this screen holds because its save failed, for the SAME content; still unsaved ⇒ held on.
    const held = unsavedKey.current !== null && unsavedKey.current.content === sent ? unsavedKey.current.idempotencyKey : null
    const pending = memorialSendKey(memberId, view.driveId, held)
    unsavedKey.current = pending.stored ? null : { idempotencyKey: pending.idempotencyKey, content: sent }
    postedContent.current = sent
    const form = new FormData()
    form.append('body', draft.body ?? '')
    form.append('authorisationCopyVersion', view.authorisation.copyVersion)
    form.append('authorisationLocale', locale)
    const photoUri = memorialPhotoUri(draft.photoFileName)
    if (draft.keepPreviousPhoto) form.append('keepPreviousPhoto', 'true')
    if (photoUri !== null || draft.keepPreviousPhoto) form.append('altText', draft.altText ?? '')
    // Story 11b.5a (KL8 / KL15) — the family list, ONLY when non-empty; the ticks ride only when this Send carries a photo (the
    // same photo test as the two lines above), else every one is stripped.
    const kinship = memorialKinshipForSend(draft.kinship, photoUri !== null || draft.keepPreviousPhoto === true)
    if (kinship.length > 0) form.append('kinship', JSON.stringify(kinship))
    if (photoUri !== null && !draft.keepPreviousPhoto) {
      // RN multipart: the { uri, name, type } descriptor (cast — RN's FormData accepts it).
      form.append('photo', { uri: photoUri, name: draft.photoFileName, type: draft.photoMime ?? 'image/jpeg' } as unknown as Blob)
    }
    try {
      await memorialApi.send(form, { idempotencyKey: pending.idempotencyKey })
    } catch (err) {
      const answer = handoverGateAnswerOf(err)
      // `authorisation_outdated` ⇒ reload the permission text (⛔ not awaited — X5).
      if (answer.kind === 'refused' && answer.code === 'memorial.authorisation_outdated') refreshMemorialQueries(queryClient)
      gate.dispatch({ type: 'answer', answer }) // a refusal never clears the draft, and never drops the key
      return
    }
    landed(sent)
  }

  return {
    phase,
    inFlight,
    canSend: handoverGateCanPress(phase),
    codeAsked: handoverGateCodeAsked(phase),
    refusalKey: sendRefusalKey(gate.state.refusal),
    handover: panelState(gate.state, otp, sms),
    async send(): Promise<void> {
      // Z4 (b) — the no-answer retry's key was dropped by an edit since (R6): this press is a NEW Send (the machine ignores the
      // event in every other phase).
      const now = memorialDraftContentSignature(loadMemorialDraft(memberId, view.driveId))
      if (postedContent.current !== null && now !== postedContent.current) gate.dispatch({ type: 'content_changed' })
      if (!gate.dispatch({ type: 'press' })) return
      await post()
    },
    async confirmCode(code: string): Promise<void> {
      if (!gate.dispatch({ type: 'confirm' })) return
      const ok = await otp.verify(code)
      if (!gate.dispatch({ type: 'verified', ok })) return
      if (ok) await post() // the ONE retry after the verified code
    },
    resendCode(): void {
      gate.dispatch({ type: 'resend' }) // ONE new SMS through the counter — or ignored (not asked for, or the cap reached)
    },
  }
}

/**
 * The same machine for the family's WITHDRAW (AC7a / AC8): run `action`; a 403 asks the nominee's code and retries ONCE; a
 * refusal of that retry is `exhausted` (the helpline, ⛔ no SMS) until a Withdraw works. Any other answer — or none — is
 * handed to the caller through `onRefused` (the server's code, or `''` when nothing answered), ⛔ never swallowed.
 */
export function useHandoverGatedAction(action: () => Promise<void>, onRefused: (code: string) => void) {
  const otp = useHandoverOtp()
  const gate = useHandoverGate()
  const phase = gate.state.phase
  const sms = useCodeRequestSms(gate.state.codeRequests, otp)

  async function attempt(): Promise<void> {
    try {
      await action()
    } catch (err) {
      const answer = handoverGateAnswerOf(err)
      gate.dispatch({ type: 'answer', answer })
      if (answer.kind === 'refused') onRefused(answer.code)
      else if (answer.kind === 'no_answer') onRefused('')
      return
    }
    gate.dispatch({ type: 'answer', answer: { kind: 'ok' } })
  }

  return {
    phase,
    /** The nominee's code panel is shown. */
    needCode: handoverGateCodeAsked(phase),
    /** The code-verified retry was refused: the helpline line (sticky until a Withdraw works). */
    exhausted: handoverGateRefused(phase),
    /** A request is in flight. */
    busy: handoverGateInFlight(phase),
    /** Withdraw may be pressed now (⛔ not while in flight, ⛔ not while the code is asked for — W3). */
    canRun: handoverGateCanPress(phase),
    handover: panelState(gate.state, otp, sms),
    async run(): Promise<void> {
      if (!gate.dispatch({ type: 'press' })) return
      await attempt()
    },
    async confirmCode(code: string): Promise<void> {
      if (!gate.dispatch({ type: 'confirm' })) return
      const ok = await otp.verify(code)
      if (!gate.dispatch({ type: 'verified', ok })) return
      if (ok) await attempt() // the ONE retry after the verified code
    },
    /** Z0 (A) — "Send a new code" on the code panel. */
    resendCode(): void {
      gate.dispatch({ type: 'resend' })
    },
  }
}
