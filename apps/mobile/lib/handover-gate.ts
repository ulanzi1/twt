// Story 11b.4 (AC7a / AC8 / AC10) — ONE explicit state machine for the family's Send and Withdraw behind the NOMINEE's
// handover code. A pure reducer: ⛔ no clock, ⛔ no I/O, ⛔ no copy (the hooks in `use-memorial-send.ts` map `refusal` to
// `memorial` keys and run the requests). BigDev 2026-10-24 ("simplify", "key on the row"): the server now replays a Send
// for the same Idempotency-Key at any age and answers no `409 idempotency_in_progress`, so the phone no longer guesses server
// state from times — four rounds of clock-based patches (two flags, two timestamps, a window, a bound, a cancel) are replaced
// by the transitions below.
//
// The phases:
//   idle            nothing in flight; a press is a NORMAL attempt (its 403 asks for the nominee's code)
//   sending         a normal attempt in flight
//   need_code       the nominee's code is asked for — ONE SMS per ENTRY into this phase, and one per "Send a new code"
//                   (`codeRequests` counts both; Z0 (A): at most HANDOVER_GATE_MAX_RESENDS new codes per screen)
//   verifying       the typed code is being verified
//   retrying        the ONE retry after a verified code is in flight (its 403 ⇒ refused, ⛔ never another SMS)
//   retry_pending   that retry got NO server answer (network, timeout, a gateway page): the next press is STILL the retry
//   refused         the retry was refused (403): the helpline, ⛔ no SMS — STICKY until a 2xx
//   refused_sending a press from `refused` in flight (its 403 ⇒ refused again; anything but a 2xx stays refused)
//   sent            the last attempt got a 2xx; a later press is a normal attempt again (R7 — a 403 then is a lapsed
//                   elevation and fairly gets a NEW code)
//
// The rules that matter (AC7a, R7, T5, X2):
//   · a 403 to a NORMAL attempt ⇒ need_code (an SMS);
//   · a 403 to the code-verified retry, or to any press while refused ⇒ refused (the helpline, ⛔ never an SMS until a 2xx);
//   · a SERVER answer to the retry that is not a 403 PROVES the step-up passed — but only an answer from AFTER the step-up
//     check: the routes run the rate limit → the memorial switch → the member session → the step-up, in that order
//     (`apps/api/src/modules/memorial/routes.ts`), so a 429, an `auth.*` refusal, `memorial.not_found` or a 5xx may come from
//     BEFORE it and prove nothing (Z4 (a) — `handoverGateAnswerOf` reads them as `no_answer`). A proving answer ⇒ idle: a
//     LATER 403 is a lapse ⇒ need_code, a new SMS (R7);
//   · NO server answer to the retry proves nothing ⇒ retry_pending: the next press is still the retry (its 403 ⇒ refused) —
//     unless the content changed meanwhile (Z4 (b): the edit dropped the key, so the next press is a NEW Send ⇒ idle);
//   · "Send a new code" (Z0 (A)) is allowed only while the code is asked for, and at most HANDOVER_GATE_MAX_RESENDS times per
//     screen: ONE new SMS each, "did not match" cleared; after the last, only the helpline is offered;
//   · an event the phase does not allow is IGNORED (the reducer returns the SAME state object — the hooks use that identity
//     as their double-tap guard).

export type HandoverGatePhase =
  | 'idle'
  | 'sending'
  | 'need_code'
  | 'verifying'
  | 'retrying'
  | 'retry_pending'
  | 'refused'
  | 'refused_sending'
  | 'sent'

export const HANDOVER_GATE_PHASES: readonly HandoverGatePhase[] = [
  'idle',
  'sending',
  'need_code',
  'verifying',
  'retrying',
  'retry_pending',
  'refused',
  'refused_sending',
  'sent',
]

/**
 * How a request ended, as the machine sees it:
 *   ok         any 2xx (`201`, or the `200` replay);
 *   step_up    `403 auth.step_up_required`;
 *   refused    any OTHER answer from the server (its error envelope's `code`);
 *   no_answer  nothing from the server: a network error, a timeout, a body that is not the server's envelope (a gateway).
 */
export type HandoverGateAnswer =
  | { readonly kind: 'ok' }
  | { readonly kind: 'step_up' }
  | { readonly kind: 'refused'; readonly code: string }
  | { readonly kind: 'no_answer' }

export type HandoverGateEvent =
  /** The family pressed Send / Withdraw. */
  | { readonly type: 'press' }
  /** The family pressed Confirm on the nominee's code. */
  | { readonly type: 'confirm' }
  /** The code check returned. */
  | { readonly type: 'verified'; readonly ok: boolean }
  /** The request in flight returned. */
  | { readonly type: 'answer'; readonly answer: HandoverGateAnswer }
  /** Z0 (A) — the family pressed "Send a new code" on the code panel. */
  | { readonly type: 'resend' }
  /** Z4 (b) — the draft's content is no longer what the last request sent (an edit dropped the kept key — R6). */
  | { readonly type: 'content_changed' }

/** What the family is told after the last attempt (the hooks map it to `memorial` copy). */
export type HandoverGateRefusal =
  | null
  | { readonly kind: 'still_refused' }
  | { readonly kind: 'no_answer' }
  | { readonly kind: 'server'; readonly code: string }

export interface HandoverGateState {
  readonly phase: HandoverGatePhase
  readonly refusal: HandoverGateRefusal
  /** need_code only: the last code typed did not match (⛔ no new SMS for it). */
  readonly notVerified: boolean
  /**
   * How many codes were asked for — each ENTRY into `need_code` and each "Send a new code". The hooks text the nominee once
   * per increment, ⛔ never per render.
   */
  readonly codeRequests: number
  /** Z0 (A) — how many times "Send a new code" was pressed on this screen (capped at HANDOVER_GATE_MAX_RESENDS). */
  readonly resends: number
}

export const HANDOVER_GATE_INITIAL: HandoverGateState = { phase: 'idle', refusal: null, notVerified: false, codeRequests: 0, resends: 0 }

/** Z0 (A) — "Send a new code" is offered at most this many times per screen; after that, only the helpline. */
export const HANDOVER_GATE_MAX_RESENDS = 3

/** A request is in flight (Android back consumed, the edit buttons off). */
export function handoverGateInFlight(phase: HandoverGatePhase): boolean {
  return phase === 'sending' || phase === 'retrying' || phase === 'refused_sending'
}

/** Send / Withdraw may be pressed. */
export function handoverGateCanPress(phase: HandoverGatePhase): boolean {
  return phase === 'idle' || phase === 'sent' || phase === 'retry_pending' || phase === 'refused'
}

/** The nominee's code panel is shown (asked for, being checked, or its retry in flight — Confirm is off but for need_code). */
export function handoverGateCodeAsked(phase: HandoverGatePhase): boolean {
  return phase === 'need_code' || phase === 'verifying' || phase === 'retrying'
}

/** Z0 (A) — "Send a new code" may be pressed now (the code is asked for, and the screen's new codes are not used up). */
export function handoverGateCanResend(s: HandoverGateState): boolean {
  return s.phase === 'need_code' && s.resends < HANDOVER_GATE_MAX_RESENDS
}

/** The retry was refused: the helpline line (sticky until a 2xx). */
export function handoverGateRefused(phase: HandoverGatePhase): boolean {
  return phase === 'refused' || phase === 'refused_sending'
}

function to(s: HandoverGateState, phase: HandoverGatePhase, refusal: HandoverGateRefusal): HandoverGateState {
  return { phase, refusal, notVerified: false, codeRequests: s.codeRequests, resends: s.resends }
}

function serverRefusal(a: { readonly code: string }): HandoverGateRefusal {
  return { kind: 'server', code: a.code }
}

export function handoverGateReduce(s: HandoverGateState, e: HandoverGateEvent): HandoverGateState {
  switch (e.type) {
    case 'press':
      switch (s.phase) {
        case 'idle':
        case 'sent':
          return to(s, 'sending', null)
        case 'retry_pending':
          return to(s, 'retrying', null)
        case 'refused':
          return to(s, 'refused_sending', s.refusal) // the helpline line stays drawn while it runs (AC10)
        default:
          return s
      }
    case 'confirm':
      return s.phase === 'need_code' ? to(s, 'verifying', null) : s
    case 'verified':
      if (s.phase !== 'verifying') return s
      return e.ok ? to(s, 'retrying', null) : { ...to(s, 'need_code', null), notVerified: true }
    case 'resend':
      // ONE new SMS (`codeRequests`), "did not match" cleared — only while the code is asked for, and within the cap.
      return handoverGateCanResend(s) ? { ...to(s, 'need_code', null), codeRequests: s.codeRequests + 1, resends: s.resends + 1 } : s
    case 'content_changed':
      // The edit dropped the key the no-answer retry was sent under: the next press is a NEW Send, ⛔ the retry (its 403
      // asks a code; the refusal line already shown stays).
      return s.phase === 'retry_pending' ? to(s, 'idle', s.refusal) : s
    case 'answer': {
      const a = e.answer
      switch (s.phase) {
        case 'sending':
          if (a.kind === 'ok') return to(s, 'sent', null)
          if (a.kind === 'step_up') return { ...to(s, 'need_code', null), codeRequests: s.codeRequests + 1 }
          if (a.kind === 'refused') return to(s, 'idle', serverRefusal(a))
          return to(s, 'idle', { kind: 'no_answer' })
        case 'retrying':
          if (a.kind === 'ok') return to(s, 'sent', null)
          if (a.kind === 'step_up') return to(s, 'refused', { kind: 'still_refused' })
          if (a.kind === 'refused') return to(s, 'idle', serverRefusal(a)) // an answer from after the step-up check: it passed
          return to(s, 'retry_pending', { kind: 'no_answer' }) // nothing proved: the next press is still the retry
        case 'refused_sending':
          if (a.kind === 'ok') return to(s, 'sent', null)
          if (a.kind === 'step_up') return to(s, 'refused', { kind: 'still_refused' })
          if (a.kind === 'refused') return to(s, 'refused', serverRefusal(a))
          return to(s, 'refused', { kind: 'no_answer' })
        default:
          return s
      }
    }
  }
}
