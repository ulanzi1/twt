// Story 11b.4 (AC7a / AC8, Y round) — the handover state machine for Send and Withdraw, as a TRANSITION TABLE: every phase ×
// every event, written out by hand (⛔ never computed by the reducer's own logic), illegal events included (⇒ the SAME state
// object, which the hooks use as their double-tap guard). Then the AC7a stories as event traces, and the phase predicates.

import { describe, expect, it } from 'vitest'

import {
  HANDOVER_GATE_INITIAL,
  HANDOVER_GATE_MAX_RESENDS,
  HANDOVER_GATE_PHASES,
  handoverGateCanPress,
  handoverGateCanResend,
  handoverGateCodeAsked,
  handoverGateInFlight,
  handoverGateReduce,
  handoverGateRefused,
  type HandoverGateEvent,
  type HandoverGatePhase,
  type HandoverGateRefusal,
  type HandoverGateState,
} from '../../lib/handover-gate'

const PRIOR: HandoverGateRefusal = { kind: 'server', code: 'memorial.prior' }
const START_REQUESTS = 3
const START_RESENDS = 1
/** The state each row starts from: a refusal already shown, `notVerified` set where it can be, three SMS so far, one of them a resend. */
const start = (phase: HandoverGatePhase): HandoverGateState => ({
  phase,
  refusal: PRIOR,
  notVerified: phase === 'need_code',
  codeRequests: START_REQUESTS,
  resends: START_RESENDS,
})

const EVENTS = {
  press: { type: 'press' },
  confirm: { type: 'confirm' },
  verified_ok: { type: 'verified', ok: true },
  verified_wrong: { type: 'verified', ok: false },
  answer_ok: { type: 'answer', answer: { kind: 'ok' } },
  answer_step_up: { type: 'answer', answer: { kind: 'step_up' } },
  answer_refused: { type: 'answer', answer: { kind: 'refused', code: 'memorial.authorisation_outdated' } },
  answer_no_answer: { type: 'answer', answer: { kind: 'no_answer' } },
  resend: { type: 'resend' },
  content_changed: { type: 'content_changed' },
} as const satisfies Record<string, HandoverGateEvent>
type EventName = keyof typeof EVENTS

/** `same` ⇒ illegal here: the reducer returns the very same object. Otherwise the whole next state. */
type Cell = 'same' | { phase: HandoverGatePhase; refusal: HandoverGateRefusal; notVerified?: boolean; codeRequests?: number; resends?: number }

const OUTDATED: HandoverGateRefusal = { kind: 'server', code: 'memorial.authorisation_outdated' }
const STILL: HandoverGateRefusal = { kind: 'still_refused' }
const NONE: HandoverGateRefusal = { kind: 'no_answer' }

// prettier-ignore
const TABLE: Record<HandoverGatePhase, Record<EventName, Cell>> = {
  idle: {
    press: { phase: 'sending', refusal: null },
    confirm: 'same', verified_ok: 'same', verified_wrong: 'same',
    answer_ok: 'same', answer_step_up: 'same', answer_refused: 'same', answer_no_answer: 'same',
    resend: 'same', content_changed: 'same',
  },
  sending: {
    press: 'same', confirm: 'same', verified_ok: 'same', verified_wrong: 'same',
    answer_ok: { phase: 'sent', refusal: null },
    answer_step_up: { phase: 'need_code', refusal: null, codeRequests: START_REQUESTS + 1 }, // ONE new SMS
    answer_refused: { phase: 'idle', refusal: OUTDATED },
    answer_no_answer: { phase: 'idle', refusal: NONE },
    resend: 'same', content_changed: 'same', // ⛔ a new code while the attempt is in flight
  },
  need_code: {
    press: 'same', // Send / Withdraw are off while the code is asked for (W3)
    confirm: { phase: 'verifying', refusal: null }, // "did not match" is cleared while the new code is checked
    verified_ok: 'same', verified_wrong: 'same',
    answer_ok: 'same', answer_step_up: 'same', answer_refused: 'same', answer_no_answer: 'same',
    // Z0 (A) — "Send a new code": ONE new SMS, a new code asked for ("did not match" cleared), one resend counted
    resend: { phase: 'need_code', refusal: null, codeRequests: START_REQUESTS + 1, resends: START_RESENDS + 1 },
    content_changed: 'same', // an edit while the code is asked for: the retry after it sends the new words (P1 (d))
  },
  verifying: {
    press: 'same', confirm: 'same', // X3 — a second Confirm while the code is checked starts nothing
    verified_ok: { phase: 'retrying', refusal: null },
    verified_wrong: { phase: 'need_code', refusal: null, notVerified: true }, // ⛔ no new SMS (codeRequests unchanged)
    answer_ok: 'same', answer_step_up: 'same', answer_refused: 'same', answer_no_answer: 'same',
    resend: 'same', content_changed: 'same', // ⛔ a new code while the typed one is checked
  },
  retrying: {
    press: 'same', confirm: 'same', // X3 — ⛔ no Confirm, ⛔ no second POST while the retry runs
    verified_ok: 'same', verified_wrong: 'same',
    answer_ok: { phase: 'sent', refusal: null },
    answer_step_up: { phase: 'refused', refusal: STILL }, // the helpline, ⛔ no SMS
    answer_refused: { phase: 'idle', refusal: OUTDATED }, // a server answer: the step-up PASSED (R7 — a later 403 is a lapse)
    answer_no_answer: { phase: 'retry_pending', refusal: NONE }, // nothing proved: the next press is still the retry
    resend: 'same', content_changed: 'same', // ⛔ a new code while the retry runs (its code was used)
  },
  retry_pending: {
    press: { phase: 'retrying', refusal: null },
    confirm: 'same', verified_ok: 'same', verified_wrong: 'same',
    answer_ok: 'same', answer_step_up: 'same', answer_refused: 'same', answer_no_answer: 'same',
    resend: 'same', // the panel is put away: a press is the retry
    content_changed: { phase: 'idle', refusal: PRIOR }, // Z4 (b) — the edit dropped the key: the next press is a NEW Send
  },
  refused: {
    press: { phase: 'refused_sending', refusal: PRIOR }, // the helpline line stays drawn while it runs (AC10)
    confirm: 'same', verified_ok: 'same', verified_wrong: 'same',
    answer_ok: 'same', answer_step_up: 'same', answer_refused: 'same', answer_no_answer: 'same',
    resend: 'same', content_changed: 'same', // STICKY: ⛔ a new code, ⛔ an edit lifts it (Z0 (A) keeps `refused` as built)
  },
  refused_sending: {
    press: 'same', confirm: 'same', verified_ok: 'same', verified_wrong: 'same',
    answer_ok: { phase: 'sent', refusal: null }, // only a 2xx ends the refusal
    answer_step_up: { phase: 'refused', refusal: STILL }, // ⛔ no SMS — ever, until a 2xx (X2 (b))
    answer_refused: { phase: 'refused', refusal: OUTDATED }, // STICKY: a non-2xx answer keeps it refused
    answer_no_answer: { phase: 'refused', refusal: NONE },
    resend: 'same', content_changed: 'same',
  },
  sent: {
    press: { phase: 'sending', refusal: null }, // a NORMAL attempt again: its 403 asks a NEW code (R7)
    confirm: 'same', verified_ok: 'same', verified_wrong: 'same',
    answer_ok: 'same', answer_step_up: 'same', answer_refused: 'same', answer_no_answer: 'same',
    resend: 'same', content_changed: 'same',
  },
}

describe('the transition table — every phase × every event', () => {
  it('covers EVERY phase and EVERY event (nothing left implicit)', () => {
    expect(Object.keys(TABLE).sort()).toEqual([...HANDOVER_GATE_PHASES].sort())
    for (const phase of HANDOVER_GATE_PHASES) expect(Object.keys(TABLE[phase]).sort(), phase).toEqual(Object.keys(EVENTS).sort())
    expect(HANDOVER_GATE_PHASES).toHaveLength(9)
  })

  const CELLS = HANDOVER_GATE_PHASES.flatMap((phase) => (Object.keys(EVENTS) as EventName[]).map((event) => [phase, event] as const))

  it.each(CELLS)('%s + %s', (phase, event) => {
    const before = start(phase)
    const after = handoverGateReduce(before, EVENTS[event])
    const cell = TABLE[phase][event]
    if (cell === 'same') {
      expect(after).toBe(before) // illegal ⇒ ignored: the SAME object (the hooks' guard)
      return
    }
    expect(after).not.toBe(before)
    expect(after).toEqual({
      phase: cell.phase,
      refusal: cell.refusal,
      notVerified: cell.notVerified ?? false,
      codeRequests: cell.codeRequests ?? START_REQUESTS,
      resends: cell.resends ?? START_RESENDS,
    })
  })

  it('the reducer never mutates the state it is given', () => {
    for (const [phase, event] of CELLS) {
      const before = start(phase)
      const copy = JSON.parse(JSON.stringify(before)) as HandoverGateState
      handoverGateReduce(before, EVENTS[event])
      expect(before).toEqual(copy)
    }
  })
})

/** Run a trace of events from the initial state; returns every state passed through. */
const trace = (...events: EventName[]): HandoverGateState[] => {
  const out: HandoverGateState[] = [HANDOVER_GATE_INITIAL]
  for (const e of events) out.push(handoverGateReduce(out[out.length - 1]!, EVENTS[e]))
  return out
}
const last = (states: HandoverGateState[]): HandoverGateState => states[states.length - 1]!

describe('the AC7a stories, as traces', () => {
  it('starts idle, nothing shown, no SMS', () => {
    expect(HANDOVER_GATE_INITIAL).toEqual({ phase: 'idle', refusal: null, notVerified: false, codeRequests: 0, resends: 0 })
  })

  it('403 → code → verified → the retry lands ⇒ sent, ONE SMS', () => {
    const s = last(trace('press', 'answer_step_up', 'confirm', 'verified_ok', 'answer_ok'))
    expect(s).toEqual({ phase: 'sent', refusal: null, notVerified: false, codeRequests: 1, resends: 0 })
  })

  it('the retry is refused (403) ⇒ refused; pressing again and again never asks another code (AC7a, T5, X2 (b))', () => {
    const states = trace('press', 'answer_step_up', 'confirm', 'verified_ok', 'answer_step_up', 'press', 'answer_step_up', 'press', 'answer_refused', 'press', 'answer_no_answer', 'press', 'answer_step_up')
    expect(last(states)).toMatchObject({ phase: 'refused', refusal: STILL })
    expect(Math.max(...states.map((x) => x.codeRequests))).toBe(1)
    expect(states.some((x, i) => i > 4 && x.phase === 'need_code')).toBe(false)
  })

  it('…and only a 2xx ends it; a lapse AFTER that gets a new code (R7)', () => {
    const s = last(trace('press', 'answer_step_up', 'confirm', 'verified_ok', 'answer_step_up', 'press', 'answer_ok', 'press', 'answer_step_up'))
    expect(s).toMatchObject({ phase: 'need_code', codeRequests: 2 })
  })

  it('R7 — the retry gets a SERVER answer that is not a 403 ⇒ the step-up passed: a later 403 is a lapse ⇒ a NEW code', () => {
    const s = last(trace('press', 'answer_step_up', 'confirm', 'verified_ok', 'answer_refused', 'press', 'answer_step_up'))
    expect(s).toMatchObject({ phase: 'need_code', codeRequests: 2 })
  })

  it('W2 / X2 — the retry gets NO answer ⇒ the next press is STILL the retry: its 403 ⇒ refused, ⛔ no second SMS', () => {
    const states = trace('press', 'answer_step_up', 'confirm', 'verified_ok', 'answer_no_answer', 'press', 'answer_no_answer', 'press', 'answer_step_up')
    expect(states[5]).toMatchObject({ phase: 'retry_pending', refusal: NONE })
    expect(states[6]!.phase).toBe('retrying')
    expect(last(states)).toMatchObject({ phase: 'refused', refusal: STILL, codeRequests: 1 })
  })

  it('…and its 2xx (the server replays the first result under the same key) ⇒ sent', () => {
    expect(last(trace('press', 'answer_step_up', 'confirm', 'verified_ok', 'answer_no_answer', 'press', 'answer_ok')).phase).toBe('sent')
  })

  it('a wrong code asks again with "did not match" — ⛔ no new SMS — and the next Confirm clears it', () => {
    const states = trace('press', 'answer_step_up', 'confirm', 'verified_wrong', 'confirm', 'verified_wrong', 'confirm')
    expect(states[4]).toMatchObject({ phase: 'need_code', notVerified: true, codeRequests: 1 })
    expect(last(states)).toMatchObject({ phase: 'verifying', notVerified: false, codeRequests: 1 })
  })

  it('a normal attempt that gets no answer, or a refusal, leaves the step-up untouched: its next 403 asks a code', () => {
    expect(last(trace('press', 'answer_no_answer', 'press', 'answer_step_up'))).toMatchObject({ phase: 'need_code', codeRequests: 1 })
    expect(last(trace('press', 'answer_refused', 'press', 'answer_step_up'))).toMatchObject({ phase: 'need_code', codeRequests: 1 })
  })

  it('Z0 (A) — "Send a new code": one new SMS each, "did not match" cleared, at most HANDOVER_GATE_MAX_RESENDS per screen', () => {
    expect(HANDOVER_GATE_MAX_RESENDS).toBe(3)
    const states = trace('press', 'answer_step_up', 'confirm', 'verified_wrong', 'resend', 'resend', 'resend', 'resend', 'resend')
    expect(states[4]).toMatchObject({ phase: 'need_code', notVerified: true, codeRequests: 1, resends: 0 })
    expect(states[5]).toMatchObject({ phase: 'need_code', notVerified: false, codeRequests: 2, resends: 1 })
    expect(states[7]).toMatchObject({ codeRequests: 4, resends: 3 })
    expect(handoverGateCanResend(states[7]!)).toBe(false)
    expect(states[8]).toBe(states[7]) // the cap: ignored (the same object) — only the helpline now
    expect(states[9]).toBe(states[7])
    // … and the cap holds for the screen's life: a later round (a lapse after a 2xx) gets its ONE SMS, ⛔ more new codes.
    const later = last(trace('press', 'answer_step_up', 'resend', 'resend', 'resend', 'confirm', 'verified_ok', 'answer_ok', 'press', 'answer_step_up', 'resend'))
    expect(later).toMatchObject({ phase: 'need_code', codeRequests: 5, resends: 3 })
  })

  it('Z0 (A) — a new code is asked for only while the code panel waits for one (⛔ while it is checked or its retry runs)', () => {
    for (const phase of HANDOVER_GATE_PHASES) expect(handoverGateCanResend(start(phase)), phase).toBe(phase === 'need_code')
    expect(handoverGateCanResend({ ...start('need_code'), resends: HANDOVER_GATE_MAX_RESENDS })).toBe(false)
  })

  it('Z0 (A) — after a new code the verified retry is still the ONE retry: its 403 ⇒ refused, ⛔ another SMS', () => {
    const states = trace('press', 'answer_step_up', 'resend', 'confirm', 'verified_ok', 'answer_step_up', 'press', 'answer_step_up')
    expect(last(states)).toMatchObject({ phase: 'refused', refusal: STILL, codeRequests: 2, resends: 1 })
  })

  it('Z4 (b) — the retry got NO answer, then the words were EDITED (the key dropped) ⇒ the next press is a NEW Send: its 403 asks a code', () => {
    const states = trace('press', 'answer_step_up', 'confirm', 'verified_ok', 'answer_no_answer', 'content_changed', 'press', 'answer_step_up')
    expect(states[6]).toMatchObject({ phase: 'idle', refusal: NONE })
    expect(last(states)).toMatchObject({ phase: 'need_code', codeRequests: 2 })
    // without the edit the same press is still the retry (its 403 ⇒ the helpline)
    expect(last(trace('press', 'answer_step_up', 'confirm', 'verified_ok', 'answer_no_answer', 'press', 'answer_step_up'))).toMatchObject({ phase: 'refused', codeRequests: 1 })
  })

  it('X7 — a double tap: the second press while sending is ignored (the same object)', () => {
    const sending = handoverGateReduce(HANDOVER_GATE_INITIAL, EVENTS.press)
    expect(handoverGateReduce(sending, EVENTS.press)).toBe(sending)
  })
})

describe('the phase predicates the screens draw from', () => {
  // prettier-ignore
  const PREDICATES: Record<HandoverGatePhase, { canPress: boolean; inFlight: boolean; codeAsked: boolean; refused: boolean }> = {
    idle:            { canPress: true,  inFlight: false, codeAsked: false, refused: false },
    sending:         { canPress: false, inFlight: true,  codeAsked: false, refused: false },
    need_code:       { canPress: false, inFlight: false, codeAsked: true,  refused: false },
    verifying:       { canPress: false, inFlight: false, codeAsked: true,  refused: false },
    retrying:        { canPress: false, inFlight: true,  codeAsked: true,  refused: false },
    retry_pending:   { canPress: true,  inFlight: false, codeAsked: false, refused: false },
    refused:         { canPress: true,  inFlight: false, codeAsked: false, refused: true },
    refused_sending: { canPress: false, inFlight: true,  codeAsked: false, refused: true },
    sent:            { canPress: true,  inFlight: false, codeAsked: false, refused: false },
  }

  it.each([...HANDOVER_GATE_PHASES])('%s', (phase) => {
    expect({
      canPress: handoverGateCanPress(phase),
      inFlight: handoverGateInFlight(phase),
      codeAsked: handoverGateCodeAsked(phase),
      refused: handoverGateRefused(phase),
    }).toEqual(PREDICATES[phase])
  })

  it('a press is allowed exactly where the table has a press transition', () => {
    for (const phase of HANDOVER_GATE_PHASES) expect(handoverGateCanPress(phase), phase).toBe(TABLE[phase].press !== 'same')
  })
})
