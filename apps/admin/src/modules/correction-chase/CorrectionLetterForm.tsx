// <CorrectionLetterForm> — the District Admin records a POSTED letter to ONE person and, later, its delivery (Story
// 6.19b, AC5, key (1); `-230` 3, `-231` D, D6, D31).
//
// ⭐ SHORT (NFR-8 — usable at ≤ 720p): the posting date and the tracking number, then — within 14 days — the delivery
// date and a screenshot, ONE delivery form PER undelivered letter (keyed by `letter_id`, labelled "#n posted <date>" —
// ⛔ never "the first undelivered one", which put letter #2's proof on #1). ⭐ The ADDRESS is shown ONLY here, on
// demand, behind a fresh step-up (`correction_letter_address`), and each reveal leaves its own audit line on the
// server. It is held in this component's state only — ⛔ never in the query cache — and it is CLEARED: by "Hide the
// address", after a successful save, whenever the record form is ⛔ not shown (a refetch flipped `canRecord`, the
// limit or the first-delivery wait — the step-up state clears with it, and a reveal resolving after that is
// DISCARDED), and at an ABSOLUTE deadline on THIS browser's clock: the rest of the step-up's five-minute window since
// the last verify ANYWHERE on the page (the elevation is per SESSION, ⛔ per form), ⛔ never under 30 seconds. The
// deadline is re-checked on `visibilitychange` / `focus` — a `setTimeout` does ⛔ not count the time a laptop slept.
// (The server's `elevatedUntil` is ⛔ no longer compared with the browser clock — a skewed clock made a 0 ms flash.)
// A late delivery is accepted and flagged overdue — ⛔ never refused. `-231` D: a second letter follows the FIRST one's
// delivery (the server refuses it with 409 `first_not_delivered`; the form says so before the round trip). The dates
// are checked here too (fifth-pass review: `noValidate` had cancelled the inputs' `max`/`min`) — a future date, a
// delivery before the posting — BEFORE the 10 MB upload; the server stays the boundary for every rule (eligibility,
// the address, the agreement, ≤ 2 per person, the dates).
//
// ⭐ The DELIVERY mutation lives HERE, ⛔ not in the per-letter form (fourth-pass review 2026-10-01): a recorded
// delivery refetches the queue, which drops the letter from `undelivered` and UNMOUNTS its form before the mutation
// settles — its "Saved." never rendered. This component outlives the refetch (the panel keeps it mounted while the
// person has a letter), so "Delivery recorded for letter #n." survives it — and focus moves to that line (`tabIndex`
// -1), ⛔ never dropped to <body> with the form that held it.
// ⭐ PERSISTENT status regions whose TEXT changes — a live region that mounts already holding its text is ⛔ not
// announced: the status line, and the note line ("two letters are recorded" / "the second follows the first one's
// delivery"). The address itself is ⛔ in no live region (it is focused instead; the status says only that it is shown).
//
// ⚠ The page cannot tell whether the session holds key (1) — the session carries only the NATIONAL grants and the
// key is district-dimension — so the controls stay visible and every error reads through the chase's ONE classifier
// (`errors.ts`): a 403 is "your access does not cover this claim", a 401 the session, a 429 the rate limit — ⛔ never
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
import { STEP_UP_REQUIRED_CODE, correctionLetterRefusalText } from './errors.js';
import { correctionChaseEn as t } from './i18n-en.js';
import { istToday } from './ist.js';

export { correctionLetterRefusalText } from './errors.js';

/** The longest a revealed address stays on screen — the admin step-up's elevation window (~5 minutes). */
export const ADDRESS_VISIBLE_MAX_MS = 5 * 60 * 1000;
/** The shortest — long enough to copy it onto an envelope, whatever the clock arithmetic says. */
export const ADDRESS_VISIBLE_MIN_MS = 30 * 1000;

/**
 * How long a just-revealed address stays on screen, measured on THIS browser's clock: the rest of the step-up window
 * when a code was verified `msSinceVerify` ago, else the whole window; ⛔ never under the floor. Recomputed on EVERY
 * reveal.
 */
export function addressVisibleMs(msSinceVerify: number | null): number {
  if (msSinceVerify === null || !Number.isFinite(msSinceVerify) || msSinceVerify < 0) return ADDRESS_VISIBLE_MAX_MS;
  return Math.max(ADDRESS_VISIBLE_MIN_MS, ADDRESS_VISIBLE_MAX_MS - msSinceVerify);
}

// ⭐ ONE clock for EVERY letter form on the page (fifth-pass review 2026-10-01): the step-up elevation is per SESSION,
// so a code verified in one person's form also elevates the reveal in another — whose window must be the REST of that
// elevation, ⛔ a fresh five minutes. Browser clock (`Date.now()`), set on each successful verify.
let lastStepUpVerifiedAt: number | null = null;

/** Records a successful step-up verify, on the browser's clock. */
export function noteStepUpVerified(at: number = Date.now()): void {
  lastStepUpVerifiedAt = at;
}

/** Milliseconds since the last verify anywhere on the page; `null` when none this page load. */
export function msSinceLastStepUpVerify(now: number = Date.now()): number | null {
  return lastStepUpVerifiedAt === null ? null : now - lastStepUpVerifiedAt;
}

/** Forgets the last verify (tests; a sign-out). */
export function forgetStepUpVerified(): void {
  lastStepUpVerifiedAt = null;
}

/**
 * The letters the per-RUN rules read — ≤ 2 per person per run, and the second after the first one's delivery (`-231`
 * D). Under K1 a person's `letters` span EVERY family / direction run of the live return (two may BOTH be #1). ⭐ The
 * queue marks each letter `in_current_run` — when it does, that flag decides. ⚠ Only a letter list WITHOUT the flag
 * (⛔ never the queue's) falls back to the posting-order guess: the LATEST group — from the last #1 on, in posting order. ⭐ Unless EVERY letter of that
 * group was posted before the latest family run's day 0 (`familyRunDay0`, known when that run is the headline run):
 * then the group is an EARLIER run's (a family → staff → family claim whose new run has no letter yet), and there is ⛔
 * no client gate — the server is the boundary, and its refusal has its own line. ⛔ Never gate on all of a person's
 * letters: two delivered letters of run 1 blocked run 3's first letter for good.
 */
export function currentRunLetters(
  letters: readonly CorrectionLetterDto[],
  familyRunDay0: string | null,
): readonly CorrectionLetterDto[] {
  if (letters.some((l) => l.in_current_run !== undefined)) return letters.filter((l) => l.in_current_run === true);
  const ordered = [...letters].sort((a, b) =>
    a.posted_on === b.posted_on ? a.sequence - b.sequence : a.posted_on < b.posted_on ? -1 : 1,
  );
  const start = ordered.map((l) => l.sequence).lastIndexOf(1);
  const group = start === -1 ? ordered : ordered.slice(start);
  if (familyRunDay0 !== null && group.length > 0 && group.every((l) => l.posted_on < familyRunDay0)) return [];
  return group;
}

export interface CorrectionLetterFormProps {
  readonly pariwarId: string;
  readonly claimCaseId: string;
  readonly personKey: string;
  /** EVERY letter of the person across the live return's family / direction runs (K1) — each delivery recordable. */
  readonly letters: readonly CorrectionLetterDto[];
  /**
   * The latest family / direction run's day 0 when the panel knows it (that run is the headline run), else `null` —
   * it tells an earlier run's letters from the current run's (`currentRunLetters`).
   */
  readonly familyRunDay0: string | null;
  /**
   * A NEW letter can be recorded: the person is letter-eligible (found dead) AND the family can be contacted (the
   * chase's `cannot_remind` is unset — D30). Deliveries are recordable regardless. ⭐ REQUIRED — a default of `true`
   * failed OPEN for a caller that forgot it.
   */
  readonly canRecord: boolean;
}

/** ONE undelivered letter's delivery form — its own fields, so two letters' dates and files never mix. */
function LetterDeliveryForm({
  letter,
  busy,
  onDeliver,
  onInvalid,
}: {
  readonly letter: CorrectionLetterDto;
  readonly busy: boolean;
  /** Records the delivery; resolves `true` once the server accepted it. */
  readonly onDeliver: (letter: CorrectionLetterDto, deliveredOn: string, file: File) => Promise<boolean>;
  /** Shows why the form was ⛔ sent (a missing field, a date the server would refuse). */
  readonly onInvalid: (message: string) => void;
}): ReactElement {
  const [deliveredOn, setDeliveredOn] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const label = `${t.letters.deliveryHeading} — ${t.letters.deliveryOf}${String(letter.sequence)} ${t.letters.posted} ${letter.posted_on}`;

  async function save(e: FormEvent): Promise<void> {
    e.preventDefault();
    // ⭐ A VISIBLE message, ⛔ never a silent return (the old form no-oped when its state and the file input disagreed).
    if (deliveredOn === '' || file === null) {
      onInvalid(t.letters.deliveryFieldsRequired);
      return;
    }
    // ⭐ The dates, BEFORE the upload — `noValidate` cancelled the input's own `min`/`max`, so a typed future date or a
    // delivery before the posting went up with a 10 MB file only to be refused. ISO dates compare as strings.
    if (deliveredOn > istToday()) {
      onInvalid(t.letters.refusals.date_in_future ?? t.letters.error);
      return;
    }
    if (deliveredOn < letter.posted_on) {
      onInvalid(t.letters.refusals.delivered_before_posted ?? t.letters.error);
      return;
    }
    const ok = await onDeliver(letter, deliveredOn, file);
    // ⭐ LIVE, ⛔ dead (kept in the fifth pass): when the queue's refetch FAILS, the route keeps the last list on screen
    // (a banner says it may be out of date), so this form STAYS after a success — its uncontrolled file input must
    // ⛔ keep showing the file that was already sent. On a successful refetch the form is gone and this is a no-op.
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

type FocusTarget = 'show' | 'send' | 'otp' | 'address' | 'status';

/** A revealed address and the browser-clock instant it must be gone by. */
interface RevealedAddress {
  readonly text: string;
  readonly deadline: number;
}

export function CorrectionLetterForm({
  pariwarId,
  claimCaseId,
  personKey,
  letters,
  familyRunDay0,
  canRecord,
}: CorrectionLetterFormProps): ReactElement {
  const record = useRecordCorrectionLetter(pariwarId, claimCaseId);
  const deliver = useRecordCorrectionLetterDelivery(pariwarId, claimCaseId);
  const [postedOn, setPostedOn] = useState('');
  const [tracking, setTracking] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  // ⭐ The ONE persistent status line (see the header) — every non-PII state change is announced through it.
  const [status, setStatus] = useState('');
  const [address, setAddress] = useState<RevealedAddress | null>(null);
  const [stepUp, setStepUp] = useState<'idle' | 'needed' | 'sent'>('idle');
  const [otp, setOtp] = useState('');
  // ⭐ ONE in-flight guard for the address controls — a double click was two decrypts + two audit lines, or two SMSes.
  // The GUARD reads a ref (two clicks in one tick both saw the render-time `null`); the state only disables buttons.
  const [busy, setBusy] = useState<'reveal' | 'send' | 'verify' | null>(null);
  const busyRef = useRef<'reveal' | 'send' | 'verify' | null>(null);
  const recordingRef = useRef(false);
  const deliveringRef = useRef(false);
  // ⭐ Bumped whenever the address / step-up state is cleared (hide, save, the deadline, the record form hidden) — a
  // reveal or a code request that resolves AFTER a bump is DISCARDED (it would re-show an address nobody asked for).
  const addressEpochRef = useRef(0);
  const focusNext = useRef<FocusTarget | null>(null);
  const statusRef = useRef<HTMLParagraphElement | null>(null);
  const showRef = useRef<HTMLButtonElement | null>(null);
  const sendRef = useRef<HTMLButtonElement | null>(null);
  const otpRef = useRef<HTMLInputElement | null>(null);
  const addressRef = useRef<HTMLParagraphElement | null>(null);
  const addressBlockRef = useRef<HTMLDivElement | null>(null);

  // ⭐ Deliveries: EVERY undelivered letter, whichever run it belongs to (keyed by `letter_id`, ⛔ by `sequence`).
  const undelivered = letters.filter((l) => l.delivered_on === null);
  // ⭐ The per-RUN rules read the current run's letters only (K1 — see `currentRunLetters`).
  const runLetters = currentRunLetters(letters, familyRunDay0);
  const atLimit = runLetters.length >= 2;
  // `-231` D — the second letter follows the first one's delivery.
  const waitingForFirstDelivery = runLetters.length === 1 && runLetters[0]!.delivered_on === null;
  const recordFormShown = canRecord && !atLimit && !waitingForFirstDelivery;

  // ⭐ Focus FOLLOWS a swapped control — the code input once the code is sent, the address once it is shown, "Show the
  // address" once it is hidden (by hand or by the deadline) or a verified reveal is refused, the status line after a
  // saved letter or delivery (the form that held focus is gone) — ⛔ never dropped to <body>. Set by the handler that
  // swaps the control; applied after the commit that rendered the replacement.
  useEffect(() => {
    const target = focusNext.current;
    if (target === null) return;
    focusNext.current = null;
    const el = { show: showRef, send: sendRef, otp: otpRef, address: addressRef, status: statusRef }[target].current;
    el?.focus();
  });

  // ⭐ The record form is ⛔ not shown (a refetch flipped `canRecord`, the limit, the first-delivery wait) ⇒ the address
  // and the step-up state go with it — ⛔ never left in state, to reappear when the form does.
  useEffect(() => {
    if (recordFormShown) return;
    addressEpochRef.current += 1;
    if (address !== null) {
      setAddress(null);
      setStatus(t.letters.addressHidden);
    }
    if (stepUp !== 'idle') setStepUp('idle');
    if (otp !== '') setOtp('');
  }, [recordFormShown, address, stepUp, otp]);

  // ⭐ The address CLEARS itself at its ABSOLUTE deadline — ⛔ never left on screen indefinitely. The timer covers an
  // awake page; `visibilitychange` / `focus` re-check the deadline when a slept laptop or a background tab comes back
  // (a `setTimeout` does ⛔ not count the time the machine slept).
  useEffect(() => {
    if (address === null) return;
    const expire = (): void => {
      if (addressBlockRef.current?.contains(document.activeElement) === true) focusNext.current = 'show';
      addressEpochRef.current += 1;
      setAddress(null);
      setStatus(t.letters.addressHidden);
    };
    const recheck = (): void => {
      if (Date.now() >= address.deadline) expire();
    };
    const id = setTimeout(expire, Math.max(0, address.deadline - Date.now()));
    document.addEventListener('visibilitychange', recheck);
    window.addEventListener('focus', recheck);
    return () => {
      clearTimeout(id);
      document.removeEventListener('visibilitychange', recheck);
      window.removeEventListener('focus', recheck);
    };
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
    const epoch = addressEpochRef.current;
    try {
      const res = await getCorrectionLetterAddress(pariwarId, claimCaseId, personKey);
      // ⛔ The form hid (or the address was cleared) while this was in flight — DISCARD, ⛔ never re-show.
      if (addressEpochRef.current !== epoch) return;
      setAddress({ text: res.address, deadline: Date.now() + addressVisibleMs(msSinceLastStepUpVerify()) });
      setStepUp('idle');
      setStatus(t.letters.addressShown);
      focusNext.current = 'address';
    } catch (err) {
      if (addressEpochRef.current !== epoch) return;
      if (err instanceof ApiError && err.code === STEP_UP_REQUIRED_CODE) {
        setStepUp('needed');
        setStatus(t.letters.stepUpIntro);
        focusNext.current = 'send';
        return;
      }
      // A READ failed — "could not be shown", ⛔ "could not be saved".
      setProblem(correctionLetterRefusalText(err, t.letters.addressError));
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
    const epoch = addressEpochRef.current;
    try {
      await requestStepUp(CORRECTION_LETTER_ADDRESS_STEP_UP_CONTEXT);
      if (addressEpochRef.current !== epoch) return;
      setStepUp('sent');
      setOtp('');
      setStatus(again ? t.letters.codeResent : t.letters.codeSent);
      focusNext.current = 'otp';
    } catch (err) {
      if (addressEpochRef.current !== epoch) return;
      // ⭐ Through the ONE classifier — a 403 / 429 / 401 each read as what they are, ⛔ "Try again".
      setProblem(correctionLetterRefusalText(err, t.letters.codeNotSent));
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
        setProblem(
          err instanceof ApiError && err.code === 'auth.step_up_failed'
            ? t.letters.codeWrong
            : correctionLetterRefusalText(err, t.letters.codeNotChecked),
        );
        return;
      }
      // ⭐ The code is USED — leave the code step at once, so a refusal of the reveal below does ⛔ not leave the form
      // asking for a code that can no longer work. The page-wide clock starts the address window HERE.
      noteStepUpVerified();
      setOtp('');
      setStepUp('idle');
      await reveal();
    } finally {
      end();
    }
  }

  function hideAddress(): void {
    addressEpochRef.current += 1;
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
    // ⭐ `noValidate` cancelled the input's `max` — a typed future date is caught HERE, ⛔ after a round trip.
    if (postedOn > istToday()) {
      setProblem(t.letters.refusals.date_in_future ?? t.letters.error);
      return;
    }
    recordingRef.current = true;
    try {
      // ⭐ `mutateAsync` — the outcome is read from the awaited call, ⛔ not from per-call callbacks (TanStack drops
      // those for an observer that unmounted or was re-used by a later call).
      await record.mutateAsync({ person_key: personKey, posted_on: postedOn, tracking_number: tracking.trim() });
      setPostedOn('');
      setTracking('');
      addressEpochRef.current += 1;
      setAddress(null);
      setStepUp('idle');
      setOtp('');
      setStatus(t.letters.saved);
      focusNext.current = 'status';
    } catch (err) {
      setProblem(correctionLetterRefusalText(err));
    } finally {
      recordingRef.current = false;
    }
  }

  async function deliverLetter(letter: CorrectionLetterDto, deliveredOn: string, file: File): Promise<boolean> {
    // ⭐ A LINE, ⛔ a silent return — the other letter's delivery is still being saved.
    if (deliveringRef.current) {
      setStatus(t.letters.deliveryBusy);
      return false;
    }
    deliveringRef.current = true;
    setProblem(null);
    setStatus('');
    try {
      // Resolves after the queue's refetch (the hook's `onSettled` returns it) — the letter now shows as delivered.
      await deliver.mutateAsync({ letterId: letter.letter_id, deliveredOn, file });
      setStatus(t.letters.deliveryRecorded(letter.sequence, letter.posted_on));
      focusNext.current = 'status';
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
      <p role="status" aria-live="polite" data-testid="letter-form-status" tabIndex={-1} ref={statusRef}>
        {status}
      </p>
      {/* ⭐ PERSISTENT — mounted whatever the state, so the line that appears when a save or a refetch reaches the
          limit / the first-delivery wait is ANNOUNCED (its content changes), ⛔ mounted already holding its text. */}
      <p role="status" data-testid="letter-form-note">
        {canRecord && atLimit ? (
          <span data-testid="letter-limit">{t.letters.limit}</span>
        ) : canRecord && waitingForFirstDelivery ? (
          <span data-testid="letter-second-waits">{t.letters.secondWaitsForDelivery}</span>
        ) : null}
      </p>
      {recordFormShown ? (
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
      ) : null}

      {undelivered.map((l) => (
        <LetterDeliveryForm
          key={l.letter_id}
          letter={l}
          busy={deliver.isPending}
          onDeliver={deliverLetter}
          onInvalid={(message) => {
            setStatus('');
            setProblem(message);
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
