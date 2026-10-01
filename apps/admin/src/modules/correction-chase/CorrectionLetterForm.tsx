// <CorrectionLetterForm> — the District Admin records a POSTED letter to ONE person and, later, its delivery (Story
// 6.19b, AC5, key (1); `-230` 3, `-231` D, D6, D31).
//
// ⭐ SHORT (NFR-8 — usable at ≤ 720p): the posting date and the tracking number, then — within 14 days — the delivery
// date and a screenshot, ONE delivery form PER undelivered letter (keyed by `letter_id`, labelled "#n posted <date>" —
// ⛔ never "the first undelivered one", which put letter #2's proof on #1). ⭐ The ADDRESS is shown ONLY here, on
// demand, behind a fresh step-up (`correction_letter_address`), and each reveal leaves its own audit line on the
// server. It is held in this component's state only — ⛔ never in the query cache — and it is CLEARED: by "Hide the
// address", after a successful save, and on a timer measured on THIS browser's clock from each reveal (at most the
// step-up's five-minute window, ⛔ never under 30 seconds; the server's `elevatedUntil` is ⛔ no longer compared with
// the browser clock, which a skewed clock turned into a 0 ms flash). A late delivery is accepted and flagged overdue —
// ⛔ never refused. `-231` D: a second letter follows the FIRST one's delivery (the server refuses it with 409
// `first_not_delivered`; the form says so before the round trip). The server is the boundary for every rule
// (eligibility, the address, the agreement, ≤ 2 per person, the dates).
//
// ⭐ The DELIVERY mutation lives HERE, ⛔ not in the per-letter form (fourth-pass review 2026-10-01): a recorded
// delivery refetches the queue, which drops the letter from `undelivered` and UNMOUNTS its form before the mutation
// settles — its "Saved." never rendered. This component outlives the refetch (the panel keeps it mounted while the
// person has a letter), so "Delivery recorded for letter #n." survives it.
// ⭐ ONE persistent status region whose TEXT changes — a live region that mounts already holding its text is ⛔ not
// announced. The address itself is ⛔ in no live region (it is focused instead; the region says only that it is shown).
//
// ⚠ The page cannot tell whether the session holds key (1) — the session carries only the NATIONAL grants and the
// key is district-dimension — so the controls stay visible and a 403 reads "your role cannot do this", ⛔ never
// "could not be saved. Try again." (which invited a retry that can never succeed).

import { useEffect, useRef, useState, type FormEvent, type ReactElement } from 'react';

import type { CorrectionLetterDto } from '@twt/contracts';

import {
  ApiError,
  CORRECTION_LETTER_ADDRESS_STEP_UP_CONTEXT,
  getCorrectionLetterAddress,
  requestStepUp,
  verifyStepUp,
} from '../../api/client.js';
import { useRecordCorrectionLetter, useRecordCorrectionLetterDelivery } from '../../api/hooks.js';
import { STEP_UP_REQUIRED_CODE, isRoleForbidden } from './errors.js';
import { correctionChaseEn as t } from './i18n-en.js';
import { istToday } from './ist.js';

/** The longest a revealed address stays on screen — the admin step-up's elevation window (~5 minutes). */
export const ADDRESS_VISIBLE_MAX_MS = 5 * 60 * 1000;
/** The shortest — long enough to copy it onto an envelope, whatever the clock arithmetic says. */
export const ADDRESS_VISIBLE_MIN_MS = 30 * 1000;

/**
 * How long a just-revealed address stays on screen, measured on THIS browser's clock: the rest of the step-up window
 * when this form verified a code `msSinceVerify` ago, else the whole window; ⛔ never under the floor. Recomputed on
 * EVERY reveal.
 */
export function addressVisibleMs(msSinceVerify: number | null): number {
  if (msSinceVerify === null || !Number.isFinite(msSinceVerify) || msSinceVerify < 0) return ADDRESS_VISIBLE_MAX_MS;
  return Math.max(ADDRESS_VISIBLE_MIN_MS, ADDRESS_VISIBLE_MAX_MS - msSinceVerify);
}

export interface CorrectionLetterFormProps {
  readonly pariwarId: string;
  readonly claimCaseId: string;
  readonly personKey: string;
  readonly letters: readonly CorrectionLetterDto[];
  /**
   * A NEW letter can be recorded: the person is letter-eligible (found dead) AND the family can be contacted (the
   * chase's `cannot_remind` is unset — D30). Deliveries are recordable regardless.
   */
  readonly canRecord?: boolean;
}

/** A refusal as specific copy — each server code maps to its own line; a 403 is the ROLE, ⛔ not a transient fault. */
export function correctionLetterRefusalText(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code.startsWith('correction_letter.')) {
      return t.letters.refusals[err.code.slice('correction_letter.'.length)] ?? t.letters.error;
    }
    if (isRoleForbidden(err)) return t.letters.forbidden;
    // ⭐ A body-size or media-type refusal from the transport (a proxy, the multipart limit) carries ⛔ no
    // `correction_letter.*` code — often no JSON body at all (`http.413`) — so the STATUS says what happened.
    if (err.status === 413) return t.letters.refusals.too_large ?? t.letters.error;
    if (err.status === 415) return t.letters.refusals.unsupported_media_type ?? t.letters.error;
  }
  return t.letters.error;
}

/** ONE undelivered letter's delivery form — its own fields, so two letters' dates and files never mix. */
function LetterDeliveryForm({
  letter,
  busy,
  onDeliver,
  onMissingFields,
}: {
  readonly letter: CorrectionLetterDto;
  readonly busy: boolean;
  /** Records the delivery; resolves `true` once the server accepted it. */
  readonly onDeliver: (letter: CorrectionLetterDto, deliveredOn: string, file: File) => Promise<boolean>;
  readonly onMissingFields: () => void;
}): ReactElement {
  const [deliveredOn, setDeliveredOn] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const label = `${t.letters.deliveryHeading} — ${t.letters.deliveryOf}${String(letter.sequence)} ${t.letters.posted} ${letter.posted_on}`;

  async function save(e: FormEvent): Promise<void> {
    e.preventDefault();
    // ⭐ A VISIBLE message, ⛔ never a silent return (the old form no-oped when its state and the file input disagreed).
    if (deliveredOn === '' || file === null) {
      onMissingFields();
      return;
    }
    const ok = await onDeliver(letter, deliveredOn, file);
    // ⚠ Normally the refetch shows this letter delivered and this form is already gone; the reset matters only when
    // it stays (the refetch failed) — then the uncontrolled file input must ⛔ not keep showing the old file.
    if (ok) {
      setDeliveredOn('');
      setFile(null);
      if (fileRef.current !== null) fileRef.current.value = '';
    }
  }

  return (
    // ⭐ `noValidate`: the browser's own `required` bubble pre-empted the form's specific message.
    <form
      noValidate
      onSubmit={(e) => void save(e)}
      aria-label={label}
      className="flex flex-col gap-2 rounded border p-2"
      data-testid={`delivery-form-${letter.letter_id}`}
    >
      <span className="font-medium">{label}</span>
      <div className="flex flex-wrap gap-2">
        <label className="flex flex-col">
          <span className="opacity-70">{t.letters.deliveredOn}</span>
          <input
            type="date"
            className="rounded border px-2 py-1"
            value={deliveredOn}
            min={letter.posted_on}
            max={istToday()}
            onChange={(e) => setDeliveredOn(e.target.value)}
            required
          />
        </label>
        <label className="flex flex-col">
          <span className="opacity-70">{t.letters.file}</span>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            required
          />
        </label>
      </div>
      <button type="submit" className="self-start rounded border px-3 py-1" disabled={busy}>
        {t.letters.saveDelivery}
      </button>
    </form>
  );
}

type FocusTarget = 'show' | 'send' | 'otp' | 'address';

export function CorrectionLetterForm({
  pariwarId,
  claimCaseId,
  personKey,
  letters,
  canRecord = true,
}: CorrectionLetterFormProps): ReactElement {
  const record = useRecordCorrectionLetter(pariwarId, claimCaseId);
  const deliver = useRecordCorrectionLetterDelivery(pariwarId, claimCaseId);
  const [postedOn, setPostedOn] = useState('');
  const [tracking, setTracking] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  // ⭐ The ONE persistent status line (see the header) — every non-PII state change is announced through it.
  const [status, setStatus] = useState('');
  const [address, setAddress] = useState<{ readonly text: string; readonly ttlMs: number } | null>(null);
  const [stepUp, setStepUp] = useState<'idle' | 'needed' | 'sent'>('idle');
  const [otp, setOtp] = useState('');
  // ⭐ ONE in-flight guard for the address controls — a double click was two decrypts + two audit lines, or two SMSes.
  // The GUARD reads a ref (two clicks in one tick both saw the render-time `null`); the state only disables buttons.
  const [busy, setBusy] = useState<'reveal' | 'send' | 'verify' | null>(null);
  const busyRef = useRef<'reveal' | 'send' | 'verify' | null>(null);
  const recordingRef = useRef(false);
  const deliveringRef = useRef(false);
  // When THIS form last verified a step-up code, on the browser's clock — the address window is measured from it.
  const verifiedAtRef = useRef<number | null>(null);
  const focusNext = useRef<FocusTarget | null>(null);
  const showRef = useRef<HTMLButtonElement | null>(null);
  const sendRef = useRef<HTMLButtonElement | null>(null);
  const otpRef = useRef<HTMLInputElement | null>(null);
  const addressRef = useRef<HTMLParagraphElement | null>(null);
  const addressBlockRef = useRef<HTMLDivElement | null>(null);

  const undelivered = letters.filter((l) => l.delivered_on === null);
  const atLimit = letters.length >= 2;
  // `-231` D — the second letter follows the first one's delivery.
  const waitingForFirstDelivery = letters.length === 1 && letters[0]!.delivered_on === null;

  // ⭐ Focus FOLLOWS a swapped control — the code input once the code is sent, the address once it is shown, "Show the
  // address" once it is hidden (by hand or by the timer) or a verified reveal is refused — ⛔ never dropped to <body>.
  // Set by the handler that swaps the control; applied after the commit that rendered the replacement.
  useEffect(() => {
    const target = focusNext.current;
    if (target === null) return;
    focusNext.current = null;
    const el = { show: showRef, send: sendRef, otp: otpRef, address: addressRef }[target].current;
    el?.focus();
  });

  // ⭐ The address CLEARS itself — ⛔ never left on screen indefinitely. A fresh timer per reveal (`address` is a new
  // object each time), with that reveal's own window.
  useEffect(() => {
    if (address === null) return;
    const id = setTimeout(() => {
      if (addressBlockRef.current?.contains(document.activeElement) === true) focusNext.current = 'show';
      setAddress(null);
      setStatus(t.letters.addressHidden);
    }, address.ttlMs);
    return () => clearTimeout(id);
  }, [address]);

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
    try {
      const res = await getCorrectionLetterAddress(pariwarId, claimCaseId, personKey);
      const since = verifiedAtRef.current === null ? null : Date.now() - verifiedAtRef.current;
      setAddress({ text: res.address, ttlMs: addressVisibleMs(since) });
      setStepUp('idle');
      setStatus(t.letters.addressShown);
      focusNext.current = 'address';
    } catch (err) {
      if (err instanceof ApiError && err.code === STEP_UP_REQUIRED_CODE) {
        setStepUp('needed');
        setStatus(t.letters.stepUpIntro);
        focusNext.current = 'send';
        return;
      }
      setProblem(correctionLetterRefusalText(err));
      focusNext.current = 'show';
    }
  }

  async function revealAddress(): Promise<void> {
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
    try {
      await requestStepUp(CORRECTION_LETTER_ADDRESS_STEP_UP_CONTEXT);
      setStepUp('sent');
      setOtp('');
      setStatus(again ? t.letters.codeResent : t.letters.codeSent);
      focusNext.current = 'otp';
    } catch {
      setProblem(t.letters.codeNotSent);
    } finally {
      end();
    }
  }

  async function verifyAndReveal(): Promise<void> {
    if (busyRef.current !== null) return;
    if (otp.trim() === '') {
      setProblem(t.letters.codeRequired);
      return;
    }
    if (!begin('verify')) return;
    try {
      try {
        await verifyStepUp(otp.trim());
      } catch (err) {
        setProblem(err instanceof ApiError && err.code === 'auth.step_up_failed' ? t.letters.codeWrong : t.letters.codeNotChecked);
        return;
      }
      // ⭐ The code is USED — leave the code step at once, so a refusal of the reveal below does ⛔ not leave the form
      // asking for a code that can no longer work.
      verifiedAtRef.current = Date.now();
      setOtp('');
      setStepUp('idle');
      await reveal();
    } finally {
      end();
    }
  }

  function hideAddress(): void {
    setAddress(null);
    setStatus(t.letters.addressHidden);
    focusNext.current = 'show';
  }

  async function saveLetter(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (recordingRef.current) return;
    setProblem(null);
    setStatus('');
    if (postedOn === '' || tracking.trim() === '') {
      setProblem(t.letters.fieldsRequired);
      return;
    }
    recordingRef.current = true;
    try {
      // ⭐ `mutateAsync` — the outcome is read from the awaited call, ⛔ not from per-call callbacks (TanStack drops
      // those for an observer that unmounted or was re-used by a later call).
      await record.mutateAsync({ person_key: personKey, posted_on: postedOn, tracking_number: tracking.trim() });
      setPostedOn('');
      setTracking('');
      setAddress(null);
      setStatus(t.letters.saved);
    } catch (err) {
      setProblem(correctionLetterRefusalText(err));
    } finally {
      recordingRef.current = false;
    }
  }

  async function deliverLetter(letter: CorrectionLetterDto, deliveredOn: string, file: File): Promise<boolean> {
    if (deliveringRef.current) return false;
    deliveringRef.current = true;
    setProblem(null);
    setStatus('');
    try {
      // Resolves after the queue's refetch (the hook's `onSettled` returns it) — the letter now shows as delivered.
      await deliver.mutateAsync({ letterId: letter.letter_id, deliveredOn, file });
      setStatus(t.letters.deliveryRecorded(letter.sequence));
      return true;
    } catch (err) {
      setProblem(correctionLetterRefusalText(err));
      return false;
    } finally {
      deliveringRef.current = false;
    }
  }

  return (
    <div className="mt-2 flex flex-col gap-2 text-xs" data-testid={`letter-form-${personKey}`}>
      <p role="status" aria-live="polite" data-testid="letter-form-status">
        {status}
      </p>
      {!canRecord ? null : atLimit ? (
        <p role="status">{t.letters.limit}</p>
      ) : waitingForFirstDelivery ? (
        <p role="status" data-testid="letter-second-waits">
          {t.letters.secondWaitsForDelivery}
        </p>
      ) : (
        // ⭐ `noValidate`: the browser's own `required` bubble pre-empted the form's specific message.
        <form
          noValidate
          onSubmit={(e) => void saveLetter(e)}
          className="flex flex-col gap-2 rounded border p-2"
          aria-label={t.letters.record}
        >
          <span className="font-medium">{t.letters.record}</span>
          {address === null ? (
            <button
              ref={showRef}
              type="button"
              className="self-start rounded border px-2 py-0.5"
              disabled={busy !== null}
              onClick={() => void revealAddress()}
            >
              {t.letters.showAddress}
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-2" ref={addressBlockRef}>
              {/* ⛔ NOT a live region — focused instead, so a screen reader reads it ONCE; the status line above
                  says only that it is shown. */}
              <p data-testid="letter-address" tabIndex={-1} ref={addressRef}>
                <span className="opacity-70">{t.letters.address}: </span>
                {address.text}
              </p>
              <button type="button" className="rounded border px-2 py-0.5" onClick={hideAddress}>
                {t.letters.hideAddress}
              </button>
            </div>
          )}
          {stepUp !== 'idle' ? (
            // The prompt ("…we will send you a code", "we sent you a code") is spoken by the status line above.
            <div className="flex flex-col gap-1" role="group" aria-label={t.letters.stepUpIntro} data-testid="letter-step-up">
              {stepUp === 'needed' ? (
                <button
                  ref={sendRef}
                  type="button"
                  className="self-start rounded border px-2 py-0.5"
                  disabled={busy !== null}
                  onClick={() => void sendCode()}
                >
                  {t.letters.sendCode}
                </button>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex flex-col">
                    <span className="opacity-70">{t.letters.code}</span>
                    <input
                      ref={otpRef}
                      className="rounded border px-2 py-1"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                    />
                  </label>
                  <button
                    type="button"
                    className="rounded border px-2 py-0.5"
                    disabled={busy !== null}
                    onClick={() => void verifyAndReveal()}
                  >
                    {t.letters.verify}
                  </button>
                  {/* ⭐ The wrong-code line says "Send a new code" — so there IS one to press. */}
                  <button
                    type="button"
                    className="rounded border px-2 py-0.5"
                    disabled={busy !== null}
                    onClick={() => void sendCode()}
                  >
                    {t.letters.resendCode}
                  </button>
                </div>
              )}
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <label className="flex flex-col">
              <span className="opacity-70">{t.letters.postedOn}</span>
              <input
                type="date"
                className="rounded border px-2 py-1"
                value={postedOn}
                max={istToday()}
                onChange={(e) => setPostedOn(e.target.value)}
                required
              />
            </label>
            <label className="flex flex-col">
              <span className="opacity-70">{t.letters.tracking}</span>
              <input className="rounded border px-2 py-1" maxLength={64} value={tracking} onChange={(e) => setTracking(e.target.value)} required />
            </label>
          </div>
          <button type="submit" className="self-start rounded border px-3 py-1" disabled={record.isPending}>
            {t.letters.save}
          </button>
        </form>
      )}

      {undelivered.map((l) => (
        <LetterDeliveryForm
          key={l.letter_id}
          letter={l}
          busy={deliver.isPending}
          onDeliver={deliverLetter}
          onMissingFields={() => {
            setStatus('');
            setProblem(t.letters.deliveryFieldsRequired);
          }}
        />
      ))}

      {problem !== null ? (
        <p role="alert" className="text-status-fail-fg">
          {problem}
        </p>
      ) : null}
    </div>
  );
}
