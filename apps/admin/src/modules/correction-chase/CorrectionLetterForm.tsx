// <CorrectionLetterForm> — the District Admin records a POSTED letter to ONE person and, later, its delivery (Story
// 6.19b, AC5, key (1); `-230` 3, `-231` D, D6, D31).
//
// ⭐ SHORT (NFR-8 — usable at ≤ 720p): the posting date and the tracking number, then — within 14 days — the delivery
// date and a screenshot, ONE delivery form PER undelivered letter (keyed by `letter_id`, labelled "#n posted <date>" —
// ⛔ never "the first undelivered one", which put letter #2's proof on #1). ⭐ The ADDRESS is shown ONLY here, on
// demand, behind a fresh step-up (`correction_letter_address`), and each reveal leaves its own audit line on the
// server. It is held in this component's state only — ⛔ never in the query cache — and it is CLEARED: by "Hide the
// address", after a successful save, and on a timer (the step-up's elevation window, at most five minutes). A late
// delivery is accepted and flagged overdue — ⛔ never refused. `-231` D: a second letter follows the FIRST one's
// delivery (the server refuses it with 409 `first_not_delivered`; the form says so before the round trip).
// The server is the boundary for every rule (eligibility, the address, the agreement, ≤ 2 per person, the dates).
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
import { correctionChaseEn as t } from './i18n-en.js';
import { istToday } from './ist.js';

/** The longest a revealed address stays on screen — the admin step-up's elevation window (~5 minutes). */
export const ADDRESS_VISIBLE_MAX_MS = 5 * 60 * 1000;

export interface CorrectionLetterFormProps {
  readonly pariwarId: string;
  readonly claimCaseId: string;
  readonly personKey: string;
  readonly letters: readonly CorrectionLetterDto[];
  /** The person is letter-eligible (found dead) — a NEW letter can be recorded. Deliveries are recordable regardless. */
  readonly canRecord?: boolean;
}

/** A refusal as specific copy — each server code maps to its own line; a 403 is the ROLE, ⛔ not a transient fault. */
export function correctionLetterRefusalText(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code.startsWith('correction_letter.')) {
      return t.letters.refusals[err.code.slice('correction_letter.'.length)] ?? t.letters.error;
    }
    if (err.status === 403 && err.code !== 'auth.step_up_required') return t.letters.forbidden;
  }
  return t.letters.error;
}

/** ONE undelivered letter's delivery form — its own state, so two letters' dates and files never mix. */
function LetterDeliveryForm({
  pariwarId,
  claimCaseId,
  letter,
}: {
  readonly pariwarId: string;
  readonly claimCaseId: string;
  readonly letter: CorrectionLetterDto;
}): ReactElement {
  const deliver = useRecordCorrectionLetterDelivery(pariwarId, claimCaseId);
  const [deliveredOn, setDeliveredOn] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const label = `${t.letters.deliveryHeading} — ${t.letters.deliveryOf}${String(letter.sequence)} ${t.letters.posted} ${letter.posted_on}`;

  function save(e: FormEvent): void {
    e.preventDefault();
    setProblem(null);
    // ⭐ A VISIBLE message, ⛔ never a silent return (the old form no-oped when its state and the file input disagreed).
    if (deliveredOn === '' || file === null) {
      setProblem(t.letters.deliveryFieldsRequired);
      return;
    }
    deliver.mutate(
      { letterId: letter.letter_id, deliveredOn, file },
      {
        onSuccess: () => {
          setDeliveredOn('');
          setFile(null);
          // ⭐ The file input is uncontrolled — reset it too, or it keeps showing the old file after a success.
          if (fileRef.current !== null) fileRef.current.value = '';
        },
        onError: (err) => setProblem(correctionLetterRefusalText(err)),
      },
    );
  }

  return (
    <form
      onSubmit={save}
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
      <button type="submit" className="self-start rounded border px-3 py-1" disabled={deliver.isPending}>
        {t.letters.saveDelivery}
      </button>
      <p role="status" aria-live="polite">
        {deliver.isSuccess ? t.letters.saved : ''}
      </p>
      {problem !== null ? (
        <p role="alert" className="text-status-fail-fg">
          {problem}
        </p>
      ) : null}
    </form>
  );
}

export function CorrectionLetterForm({
  pariwarId,
  claimCaseId,
  personKey,
  letters,
  canRecord = true,
}: CorrectionLetterFormProps): ReactElement {
  const record = useRecordCorrectionLetter(pariwarId, claimCaseId);
  const [postedOn, setPostedOn] = useState('');
  const [tracking, setTracking] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [addressHidden, setAddressHidden] = useState(false);
  const [stepUp, setStepUp] = useState<'idle' | 'needed' | 'sent'>('idle');
  const [otp, setOtp] = useState('');
  // ⭐ ONE in-flight guard for the address controls — a double click was two decrypts + two audit lines, or two SMSes.
  const [busy, setBusy] = useState<'reveal' | 'send' | 'verify' | null>(null);
  const addressTtlMs = useRef(ADDRESS_VISIBLE_MAX_MS);
  const otpRef = useRef<HTMLInputElement | null>(null);
  const addressRef = useRef<HTMLParagraphElement | null>(null);

  const undelivered = letters.filter((l) => l.delivered_on === null);
  const atLimit = letters.length >= 2;
  // `-231` D — the second letter follows the first one's delivery.
  const waitingForFirstDelivery = letters.length === 1 && letters[0]!.delivered_on === null;

  // ⭐ Focus follows the step: the code input once the code is sent, the address once it is shown.
  useEffect(() => {
    if (stepUp === 'sent') otpRef.current?.focus();
  }, [stepUp]);
  const addressShown = address !== null;
  useEffect(() => {
    if (addressShown) addressRef.current?.focus();
  }, [addressShown]);
  // ⭐ The address CLEARS itself — ⛔ never left on screen indefinitely.
  useEffect(() => {
    if (!addressShown) return;
    const id = setTimeout(() => {
      setAddress(null);
      setAddressHidden(true);
    }, addressTtlMs.current);
    return () => clearTimeout(id);
  }, [addressShown]);

  async function reveal(): Promise<void> {
    try {
      const res = await getCorrectionLetterAddress(pariwarId, claimCaseId, personKey);
      setAddressHidden(false);
      setAddress(res.address);
      setStepUp('idle');
    } catch (err) {
      if (err instanceof ApiError && err.code === 'auth.step_up_required') {
        setStepUp('needed');
        return;
      }
      setProblem(correctionLetterRefusalText(err));
    }
  }

  async function revealAddress(): Promise<void> {
    if (busy !== null) return;
    setProblem(null);
    setBusy('reveal');
    try {
      await reveal();
    } finally {
      setBusy(null);
    }
  }

  async function sendCode(): Promise<void> {
    if (busy !== null) return;
    setProblem(null);
    setBusy('send');
    try {
      await requestStepUp(CORRECTION_LETTER_ADDRESS_STEP_UP_CONTEXT);
      setStepUp('sent');
    } catch {
      setProblem(t.letters.codeNotSent);
    } finally {
      setBusy(null);
    }
  }

  async function verifyAndReveal(): Promise<void> {
    if (busy !== null) return;
    setProblem(null);
    if (otp.trim() === '') {
      setProblem(t.letters.codeRequired);
      return;
    }
    setBusy('verify');
    try {
      try {
        const res = await verifyStepUp(otp.trim());
        const left = Date.parse(res.elevatedUntil) - Date.now();
        addressTtlMs.current = Number.isFinite(left) ? Math.max(0, Math.min(left, ADDRESS_VISIBLE_MAX_MS)) : ADDRESS_VISIBLE_MAX_MS;
        setOtp('');
      } catch (err) {
        setProblem(err instanceof ApiError && err.code === 'auth.step_up_failed' ? t.letters.codeWrong : t.letters.codeNotChecked);
        return;
      }
      await reveal();
    } finally {
      setBusy(null);
    }
  }

  function hideAddress(): void {
    setAddress(null);
    setAddressHidden(true);
  }

  function saveLetter(e: FormEvent): void {
    e.preventDefault();
    setProblem(null);
    if (postedOn === '' || tracking.trim() === '') {
      setProblem(t.letters.fieldsRequired);
      return;
    }
    record.mutate(
      { person_key: personKey, posted_on: postedOn, tracking_number: tracking.trim() },
      {
        onSuccess: () => {
          setPostedOn('');
          setTracking('');
          setAddress(null);
        },
        onError: (err) => setProblem(correctionLetterRefusalText(err)),
      },
    );
  }

  return (
    <div className="mt-2 flex flex-col gap-2 text-xs" data-testid={`letter-form-${personKey}`}>
      {!canRecord ? null : atLimit ? (
        <p role="status">{t.letters.limit}</p>
      ) : waitingForFirstDelivery ? (
        <p role="status" data-testid="letter-second-waits">
          {t.letters.secondWaitsForDelivery}
        </p>
      ) : (
        <form onSubmit={saveLetter} className="flex flex-col gap-2 rounded border p-2" aria-label={t.letters.record}>
          <span className="font-medium">{t.letters.record}</span>
          {address === null ? (
            <button
              type="button"
              className="self-start rounded border px-2 py-0.5"
              disabled={busy !== null}
              onClick={() => void revealAddress()}
            >
              {t.letters.showAddress}
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <p role="status" data-testid="letter-address" tabIndex={-1} ref={addressRef}>
                <span className="opacity-70">{t.letters.address}: </span>
                {address}
              </p>
              <button type="button" className="rounded border px-2 py-0.5" onClick={hideAddress}>
                {t.letters.hideAddress}
              </button>
            </div>
          )}
          {address === null && addressHidden ? (
            <p role="status" className="opacity-70" data-testid="letter-address-hidden">
              {t.letters.addressHidden}
            </p>
          ) : null}
          {stepUp !== 'idle' ? (
            <div className="flex flex-col gap-1" role="group" aria-label={t.letters.stepUpIntro}>
              {/* ⭐ ANNOUNCED — the prompt, then "code sent" — ⛔ never a silent swap of controls. */}
              <span role="status" data-testid="letter-step-up-status">
                {stepUp === 'needed' ? t.letters.stepUpIntro : t.letters.codeSent}
              </span>
              {stepUp === 'needed' ? (
                <button
                  type="button"
                  className="self-start rounded border px-2 py-0.5"
                  disabled={busy !== null}
                  onClick={() => void sendCode()}
                >
                  {t.letters.sendCode}
                </button>
              ) : (
                <div className="flex items-center gap-2">
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
        <LetterDeliveryForm key={l.letter_id} pariwarId={pariwarId} claimCaseId={claimCaseId} letter={l} />
      ))}

      <p role="status" aria-live="polite">
        {record.isSuccess ? t.letters.saved : ''}
      </p>
      {problem !== null ? (
        <p role="alert" className="text-status-fail-fg">
          {problem}
        </p>
      ) : null}
    </div>
  );
}
