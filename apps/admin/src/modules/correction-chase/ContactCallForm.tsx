// <ContactCallForm> — the District Admin records a PHONE CALL to ONE person on a claim being chased (Story 6.37c, LD10,
// LD11; `2026-10-17-351` 5 A), from the correction chase panel OR the certificate list (ONE component, both modules).
//
// ⭐ SHORT: the date of the call (IST, ⛔ later than today), who answered (a ROLE — ⛔ a name), and whether it reached the
// family — "it reached the family" is offered ONLY when the person or a family member answered (the server and the DB
// refuse it otherwise). A call that reached the family counts as reaching them and ends their follow-up texts.
// ⭐ ONE `Idempotency-Key` per user-initiated attempt: made on the first submit, KEPT across a retry of that attempt (a
// network failure, a refusal — a request that DID land replays its first result, ⛔ a second call), and made afresh
// after a success — AND whenever the fields differ from the ones the kept key was made for (review round 2, P4: an
// EDITED retry is a new call, ⛔ a replay of the first one that silently drops the edit). Made by `newIdempotencyKey()`
// (safe outside a secure context — P7).
// ⭐ ALWAYS MOUNTED once offered (`offered`): the status line ("Call recorded.") must outlive the refetch that can
// withdraw the form — a `reached` call closes the ask, and a form that unmounts on success takes its confirmation (and
// the focus) with it (review round 2, P3 — the letter form's 6.19c lesson). When the parent stops offering it, the
// form's fields and any shown number go; the status line stays.
// ⭐ The NUMBER to call is shown ONLY here, on demand, behind a fresh step-up (`contact_call_number`) — the letter form's
// address-reveal flow (`CorrectionLetterForm.tsx`): held in this component's state only (⛔ the query cache), cleared by
// "Hide the number", after a saved call, at the step-up window's deadline (re-checked on `visibilitychange` / `focus`)
// and on unmount; each reveal leaves its own audit line on the server. A NOMINEE before counsel's written basis (G1) is
// refused in plain words — "post them a letter".
// ⭐ PERSISTENT status line whose TEXT changes (a live region that mounts already holding its text is ⛔ announced); the
// number itself is ⛔ in a live region (it is focused instead).
// ⚠ T18 — the microcopy gate scans comments too: say "reported" / "the network said", ⛔ the bare canonical term.

import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent, type ReactElement } from 'react';

import type { ContactCallAnsweredBy, ContactCallOutcome, ContactLadderAsk, ContactLadderFollowUpDto } from '@twt/contracts';

import {
  ApiError,
  CONTACT_CALL_NUMBER_STEP_UP_CONTEXT,
  getCertificateContactCallNumber,
  getCorrectionContactCallNumber,
  requestStepUp,
  verifyStepUp,
} from '../../api/client.js';
import { newIdempotencyKey, useRecordContactCall } from '../../api/hooks.js';
import { addressVisibleMs, msSinceLastStepUpVerify, noteStepUpVerified } from './CorrectionLetterForm.js';
import { STEP_UP_REQUIRED_CODE, contactCallRefusalText } from './errors.js';
import { correctionChaseEn } from './i18n-en.js';
import { istToday } from './ist.js';

const t = correctionChaseEn.calls;
const tl = correctionChaseEn.letters;

const ANSWERED_BY: readonly ContactCallAnsweredBy[] = ['the_person', 'family_member', 'someone_else', 'nobody'];

/** `-351` 5 A — a call REACHES the family only when the person or a family member answered. Pure. */
export function canBeReached(answeredBy: ContactCallAnsweredBy | ''): boolean {
  return answeredBy === 'the_person' || answeredBy === 'family_member';
}

/**
 * Whether a person's row OFFERS the call form — ONE rule for both surfaces. Pure.
 * · A follow-up that is NOT concluded (running, or ended another way) keeps it offered regardless of the ask — staff may
 *   log a late / historical call after the ladder ended (review D11).
 * · A CONCLUDED follow-up defers to its ask (`ask` is only ever set once the follow-up concluded — LD9): offered only
 *   when a CALL can answer it — ⛔ `none` (neither is possible: escalate — review P29) and ⛔ `letter` (a nominee while
 *   nominee calls are not cleared: every call and reveal is refused — review round 2, P6).
 */
export function callFormOffered(followUp: ContactLadderFollowUpDto | null, ask: ContactLadderAsk | null): boolean {
  if (followUp !== null && followUp.state !== 'concluded') return true;
  return ask === 'call_or_letter' || ask === 'call';
}

export interface ContactCallFormProps {
  readonly pariwarId: string;
  readonly claimCaseId: string;
  readonly personKey: string;
  /** The surface — the correction chase panel or the certificate list (the routes differ; the record is one). */
  readonly chase: 'correction' | 'certificate';
  /**
   * Whether the parent offers the form now (a follow-up runs, or a call can answer an open ask). ⭐ The component stays
   * mounted when it turns false — its status line holds the save's confirmation (P3).
   */
  readonly offered: boolean;
}

type FocusTarget = 'show' | 'send' | 'otp' | 'number' | 'status';

export function ContactCallForm({ pariwarId, claimCaseId, personKey, chase, offered }: ContactCallFormProps): ReactElement | null {
  const record = useRecordContactCall(pariwarId, claimCaseId, chase);
  const [calledOn, setCalledOn] = useState('');
  const [answeredBy, setAnsweredBy] = useState<ContactCallAnsweredBy | ''>('');
  const [outcome, setOutcome] = useState<ContactCallOutcome | ''>('');
  const [problem, setProblem] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [number, setNumber] = useState<{ readonly text: string | null; readonly deadline: number } | null>(null);
  const [stepUp, setStepUp] = useState<'idle' | 'needed' | 'sent'>('idle');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState<'reveal' | 'send' | 'verify' | null>(null);
  const busyRef = useRef<'reveal' | 'send' | 'verify' | null>(null);
  const savingRef = useRef(false);
  // ⭐ The attempt's key and the body it was made for — kept across a retry of the SAME attempt (the same fields),
  // replaced after a success or when the fields change (P4).
  const keyRef = useRef<{ readonly key: string; readonly body: string } | null>(null);
  // ⭐ Once offered, the status line stays mounted for the component's life (P3).
  const [everOffered, setEverOffered] = useState(offered);
  if (offered && !everOffered) setEverOffered(true);
  const hintId = useId();
  const numberEpochRef = useRef(0);
  const focusNext = useRef<FocusTarget | null>(null);
  const statusRef = useRef<HTMLParagraphElement | null>(null);
  const showRef = useRef<HTMLButtonElement | null>(null);
  const sendRef = useRef<HTMLButtonElement | null>(null);
  const otpRef = useRef<HTMLInputElement | null>(null);
  const numberRef = useRef<HTMLParagraphElement | null>(null);
  const numberBlockRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const target = focusNext.current;
    if (target === null) return;
    focusNext.current = null;
    ({ show: showRef, send: sendRef, otp: otpRef, number: numberRef, status: statusRef })[target].current?.focus();
  });

  // ⭐ The number CLEARS itself at its ABSOLUTE deadline (the letter form's rule — a slept laptop is re-checked).
  useEffect(() => {
    if (number === null) return;
    const expire = (): void => {
      if (numberBlockRef.current?.contains(document.activeElement) === true) focusNext.current = 'show';
      numberEpochRef.current += 1;
      setNumber(null);
      setStatus(t.numberHidden);
    };
    const recheck = (): void => {
      if (Date.now() >= number.deadline) expire();
    };
    const id = setTimeout(expire, Math.max(0, number.deadline - Date.now()));
    document.addEventListener('visibilitychange', recheck);
    window.addEventListener('focus', recheck);
    return () => {
      clearTimeout(id);
      document.removeEventListener('visibilitychange', recheck);
      window.removeEventListener('focus', recheck);
    };
  }, [number]);

  // P3 — the parent withdrew the form (e.g. a `reached` call closed the ask): the number and the step-up go with it
  // (the epoch moves on, so a reveal in flight is discarded); the status line — and its "Call recorded." — stays.
  // Fix-diff review — the fields, the kept key and any problem go too: a form offered AGAIN later (a new ladder) starts
  // EMPTY (⛔ an old attempt's key replayed, ⛔ an old alert with no form to retry from).
  useEffect(() => {
    if (offered) return;
    numberEpochRef.current += 1;
    setNumber(null);
    setStepUp('idle');
    setOtp('');
    setCalledOn('');
    setAnsweredBy('');
    setOutcome('');
    setProblem(null);
    keyRef.current = null;
  }, [offered]);

  // ⛔ A reveal resolving after unmount is DISCARDED (the epoch moves on).
  useEffect(
    () => () => {
      numberEpochRef.current += 1;
    },
    [],
  );

  // Review P22 — ONE gate, checked by both `begin()` (the reveal/send/verify flows) and `save()`, so the three
  // async flows and a save can never overlap: each writes into the SAME shared `status` live region, and a save
  // mid-reveal (or a reveal mid-save) could otherwise clobber the other's message or race the number's epoch.
  function anyOperationInFlight(): boolean {
    return busyRef.current !== null || savingRef.current;
  }

  function begin(kind: 'reveal' | 'send' | 'verify'): boolean {
    if (anyOperationInFlight()) return false;
    busyRef.current = kind;
    setBusy(kind);
    setProblem(null);
    setStatus('');
    return true;
  }

  function end(): void {
    busyRef.current = null;
    setBusy(null);
  }

  async function reveal(): Promise<void> {
    const epoch = numberEpochRef.current;
    try {
      const res =
        chase === 'correction'
          ? await getCorrectionContactCallNumber(pariwarId, claimCaseId, personKey)
          : await getCertificateContactCallNumber(pariwarId, claimCaseId, personKey);
      if (numberEpochRef.current !== epoch) return;
      setNumber({ text: res.number, deadline: Date.now() + addressVisibleMs(msSinceLastStepUpVerify()) });
      setStepUp('idle');
      setStatus(t.numberShown);
      focusNext.current = 'number';
    } catch (err) {
      if (numberEpochRef.current !== epoch) return;
      if (err instanceof ApiError && err.code === STEP_UP_REQUIRED_CODE) {
        setStepUp('needed');
        setStatus(t.stepUpIntro);
        focusNext.current = 'send';
        return;
      }
      setProblem(contactCallRefusalText(err, t.numberError));
      focusNext.current = 'show';
    }
  }

  async function revealNumber(): Promise<void> {
    if (!begin('reveal')) return;
    try {
      await reveal();
    } finally {
      end();
    }
  }

  async function sendCode(): Promise<void> {
    const again = stepUp === 'sent';
    if (!begin('send')) return;
    const epoch = numberEpochRef.current;
    try {
      await requestStepUp(CONTACT_CALL_NUMBER_STEP_UP_CONTEXT);
      if (numberEpochRef.current !== epoch) return;
      setStepUp('sent');
      setOtp('');
      setStatus(again ? tl.codeResent : tl.codeSent);
      focusNext.current = 'otp';
    } catch (err) {
      if (numberEpochRef.current !== epoch) return;
      setProblem(contactCallRefusalText(err, tl.codeNotSent));
    } finally {
      end();
    }
  }

  async function verifyAndReveal(): Promise<void> {
    if (busyRef.current !== null) return;
    if (otp.trim() === '') {
      setProblem(tl.codeRequired);
      return;
    }
    if (!begin('verify')) return;
    // Review P25 — the SAME epoch check `reveal()`/`sendCode()` already do: an unmount (or "Hide the number") while
    // `verifyStepUp` is in flight must ⛔ touch state on return.
    const epoch = numberEpochRef.current;
    try {
      try {
        await verifyStepUp(otp.trim());
      } catch (err) {
        if (numberEpochRef.current !== epoch) return;
        setProblem(
          err instanceof ApiError && err.code === 'auth.step_up_failed' ? tl.codeWrong : contactCallRefusalText(err, tl.codeNotChecked),
        );
        return;
      }
      if (numberEpochRef.current !== epoch) return;
      noteStepUpVerified();
      setOtp('');
      setStepUp('idle');
      await reveal();
    } finally {
      end();
    }
  }

  // P2 — Enter in the code box VERIFIES the code; ⛔ it submits the call form around it (which would save the call
  // with the code unchecked and the step-up cleared).
  function onOtpKeyDown(e: KeyboardEvent<HTMLInputElement>): void {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    void verifyAndReveal();
  }

  function hideNumber(): void {
    numberEpochRef.current += 1;
    setNumber(null);
    setStatus(t.numberHidden);
    focusNext.current = 'show';
  }

  function chooseAnsweredBy(v: ContactCallAnsweredBy | ''): void {
    setAnsweredBy(v);
    // ⭐ "It reached the family" is ⛔ offered for someone else / nobody — a chosen one is withdrawn, ⛔ silently sent.
    if (!canBeReached(v) && outcome === 'reached') setOutcome('');
  }

  async function save(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (anyOperationInFlight()) return;
    setProblem(null);
    setStatus('');
    if (calledOn === '' || answeredBy === '' || outcome === '') {
      setProblem(t.fieldsRequired);
      return;
    }
    if (calledOn > istToday()) {
      setProblem(t.dateInFuture);
      return;
    }
    if (outcome === 'reached' && !canBeReached(answeredBy)) {
      setProblem(t.reachedNeedsAnswer);
      return;
    }
    // P4 / P7 — the key is settled BEFORE the in-flight flag (nothing between `savingRef = true` and the `try` can
    // throw): the kept key only for the SAME fields; edited fields are a new attempt.
    const body = { person_key: personKey, called_on: calledOn, answered_by: answeredBy, outcome };
    const signature = JSON.stringify(body);
    const kept = keyRef.current;
    const idempotencyKey = kept !== null && kept.body === signature ? kept.key : newIdempotencyKey();
    keyRef.current = { key: idempotencyKey, body: signature };
    savingRef.current = true;
    try {
      await record.mutateAsync({ body, idempotencyKey });
      keyRef.current = null; // ⭐ the next call is a NEW attempt
      setCalledOn('');
      setAnsweredBy('');
      setOutcome('');
      numberEpochRef.current += 1;
      setNumber(null);
      setStepUp('idle');
      setOtp('');
      setStatus(t.saved);
      focusNext.current = 'status';
    } catch (err) {
      setProblem(contactCallRefusalText(err));
    } finally {
      savingRef.current = false;
    }
  }

  if (!everOffered) return null;
  return (
    <div className="mt-2 flex flex-col gap-2 text-xs" data-testid={`call-form-${personKey}`}>
      <p role="status" aria-live="polite" data-testid="call-form-status" tabIndex={-1} ref={statusRef}>
        {status}
      </p>
      {offered ? (
      <form noValidate onSubmit={(e) => void save(e)} className="flex flex-col gap-2 rounded border p-2" aria-label={t.record}>
        <span className="font-medium">{t.record}</span>
        {number === null ? (
          <button
            ref={showRef}
            type="button"
            className="self-start rounded border px-2 py-0.5"
            disabled={busy !== null || record.isPending}
            onClick={() => void revealNumber()}
          >
            {t.showNumber}
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-2" ref={numberBlockRef}>
            <p data-testid="call-number" tabIndex={-1} ref={numberRef}>
              <span className="opacity-70">{t.number}: </span>
              {number.text ?? t.noNumber}
            </p>
            <button type="button" className="rounded border px-2 py-0.5" onClick={hideNumber}>
              {t.hideNumber}
            </button>
          </div>
        )}
        {stepUp !== 'idle' ? (
          <div className="flex flex-col gap-1" role="group" aria-label={t.stepUpIntro} data-testid="call-step-up">
            {stepUp === 'needed' ? (
              <button
                ref={sendRef}
                type="button"
                className="self-start rounded border px-2 py-0.5"
                disabled={busy !== null || record.isPending}
                onClick={() => void sendCode()}
              >
                {tl.sendCode}
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex flex-col">
                  <span className="opacity-70">{tl.code}</span>
                  <input
                    ref={otpRef}
                    className="rounded border px-2 py-1"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    onKeyDown={onOtpKeyDown}
                  />
                </label>
                <button
                  type="button"
                  className="rounded border px-2 py-0.5"
                  disabled={busy !== null || record.isPending}
                  onClick={() => void verifyAndReveal()}
                >
                  {tl.verify}
                </button>
                <button
                  type="button"
                  className="rounded border px-2 py-0.5"
                  disabled={busy !== null || record.isPending}
                  onClick={() => void sendCode()}
                >
                  {tl.resendCode}
                </button>
              </div>
            )}
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <label className="flex flex-col">
            <span className="opacity-70">{t.calledOn}</span>
            <input type="date" className="rounded border px-2 py-1" value={calledOn} max={istToday()} onChange={(e) => setCalledOn(e.target.value)} required />
          </label>
          <label className="flex flex-col">
            <span className="opacity-70">{t.whoAnswered}</span>
            <select
              className="rounded border px-2 py-1"
              value={answeredBy}
              onChange={(e) => chooseAnsweredBy(e.target.value as ContactCallAnsweredBy | '')}
              required
            >
              <option value="">{t.choose}</option>
              {ANSWERED_BY.map((a) => (
                <option key={a} value={a}>
                  {t.answeredBy[a]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <fieldset className="flex flex-wrap gap-3">
          {/* P30 — the radio group is NAMED; a disabled "reached" says why (⛔ a silent grey option). */}
          <legend className="opacity-70">{t.outcomeLegend}</legend>
          <label className="flex items-center gap-1">
            <input
              type="radio"
              name={`call-outcome-${personKey}`}
              value="reached"
              checked={outcome === 'reached'}
              disabled={!canBeReached(answeredBy)}
              aria-describedby={canBeReached(answeredBy) ? undefined : hintId}
              onChange={() => setOutcome('reached')}
            />
            {t.reached}
          </label>
          <label className="flex items-center gap-1">
            <input
              type="radio"
              name={`call-outcome-${personKey}`}
              value="not_reached"
              checked={outcome === 'not_reached'}
              onChange={() => setOutcome('not_reached')}
            />
            {t.notReached}
          </label>
          {canBeReached(answeredBy) ? null : (
            <span id={hintId} className="w-full opacity-70" data-testid="call-reached-hint">
              {t.reachedHint}
            </span>
          )}
        </fieldset>
        <button type="submit" className="self-start rounded border px-3 py-1" disabled={record.isPending || busy !== null}>
          {t.save}
        </button>
      </form>
      ) : null}
      {problem !== null ? (
        <p role="alert" className="text-status-fail-fg">
          {problem}
        </p>
      ) : null}
    </div>
  );
}
