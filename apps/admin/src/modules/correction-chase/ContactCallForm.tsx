// <ContactCallForm> — the District Admin records a PHONE CALL to ONE person on a claim being chased (Story 6.37c, LD10,
// LD11; `2026-10-17-351` 5 A), from the correction chase panel OR the certificate list (ONE component, both modules).
//
// ⭐ SHORT: the date of the call (IST, ⛔ later than today), who answered (a ROLE — ⛔ a name), and whether it reached the
// family — "it reached the family" is offered ONLY when the person or a family member answered (the server and the DB
// refuse it otherwise). A call that reached the family counts as reaching them and ends their follow-up texts.
// ⭐ ONE `Idempotency-Key` per user-initiated attempt: made on the first submit, KEPT across a retry of that attempt (a
// network failure, a refusal — a request that DID land replays its first result, ⛔ a second call), and made afresh only
// after a success.
// ⭐ The NUMBER to call is shown ONLY here, on demand, behind a fresh step-up (`contact_call_number`) — the letter form's
// address-reveal flow (`CorrectionLetterForm.tsx`): held in this component's state only (⛔ the query cache), cleared by
// "Hide the number", after a saved call, at the step-up window's deadline (re-checked on `visibilitychange` / `focus`)
// and on unmount; each reveal leaves its own audit line on the server. A NOMINEE before counsel's written basis (G1) is
// refused in plain words — "post them a letter".
// ⭐ PERSISTENT status line whose TEXT changes (a live region that mounts already holding its text is ⛔ announced); the
// number itself is ⛔ in a live region (it is focused instead).
// ⚠ T18 — the microcopy gate scans comments too: say "reported" / "the network said", ⛔ the bare canonical term.

import { useEffect, useRef, useState, type FormEvent, type ReactElement } from 'react';

import type { ContactCallAnsweredBy, ContactCallOutcome } from '@twt/contracts';

import {
  ApiError,
  CONTACT_CALL_NUMBER_STEP_UP_CONTEXT,
  getCertificateContactCallNumber,
  getCorrectionContactCallNumber,
  requestStepUp,
  verifyStepUp,
} from '../../api/client.js';
import { useRecordContactCall } from '../../api/hooks.js';
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

export interface ContactCallFormProps {
  readonly pariwarId: string;
  readonly claimCaseId: string;
  readonly personKey: string;
  /** The surface — the correction chase panel or the certificate list (the routes differ; the record is one). */
  readonly chase: 'correction' | 'certificate';
}

type FocusTarget = 'show' | 'send' | 'otp' | 'number' | 'status';

export function ContactCallForm({ pariwarId, claimCaseId, personKey, chase }: ContactCallFormProps): ReactElement {
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
  // ⭐ The attempt's key — kept across a retry of the SAME attempt, replaced only after a success.
  const keyRef = useRef<string | null>(null);
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

  // ⛔ A reveal resolving after unmount is DISCARDED (the epoch moves on).
  useEffect(
    () => () => {
      numberEpochRef.current += 1;
    },
    [],
  );

  function begin(kind: 'reveal' | 'send' | 'verify'): boolean {
    if (busyRef.current !== null) return false;
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
    try {
      try {
        await verifyStepUp(otp.trim());
      } catch (err) {
        setProblem(
          err instanceof ApiError && err.code === 'auth.step_up_failed' ? tl.codeWrong : contactCallRefusalText(err, tl.codeNotChecked),
        );
        return;
      }
      noteStepUpVerified();
      setOtp('');
      setStepUp('idle');
      await reveal();
    } finally {
      end();
    }
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
    if (savingRef.current) return;
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
    savingRef.current = true;
    const idempotencyKey = keyRef.current ?? crypto.randomUUID();
    keyRef.current = idempotencyKey;
    try {
      await record.mutateAsync({ body: { person_key: personKey, called_on: calledOn, answered_by: answeredBy, outcome }, idempotencyKey });
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

  return (
    <div className="mt-2 flex flex-col gap-2 text-xs" data-testid={`call-form-${personKey}`}>
      <p role="status" aria-live="polite" data-testid="call-form-status" tabIndex={-1} ref={statusRef}>
        {status}
      </p>
      <form noValidate onSubmit={(e) => void save(e)} className="flex flex-col gap-2 rounded border p-2" aria-label={t.record}>
        <span className="font-medium">{t.record}</span>
        {number === null ? (
          <button
            ref={showRef}
            type="button"
            className="self-start rounded border px-2 py-0.5"
            disabled={busy !== null}
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
                disabled={busy !== null}
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
                  />
                </label>
                <button type="button" className="rounded border px-2 py-0.5" disabled={busy !== null} onClick={() => void verifyAndReveal()}>
                  {tl.verify}
                </button>
                <button type="button" className="rounded border px-2 py-0.5" disabled={busy !== null} onClick={() => void sendCode()}>
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
          <label className="flex items-center gap-1">
            <input
              type="radio"
              name={`call-outcome-${personKey}`}
              value="reached"
              checked={outcome === 'reached'}
              disabled={!canBeReached(answeredBy)}
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
        </fieldset>
        <button type="submit" className="self-start rounded border px-3 py-1" disabled={record.isPending}>
          {t.save}
        </button>
      </form>
      {problem !== null ? (
        <p role="alert" className="text-status-fail-fg">
          {problem}
        </p>
      ) : null}
    </div>
  );
}
