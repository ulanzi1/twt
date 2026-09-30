// <CorrectionLetterForm> — the District Admin records a POSTED letter to ONE person and, later, its delivery (Story
// 6.19b, AC5, key (1); `-230` 3, `-231` D, D6, D31).
//
// ⭐ SHORT (NFR-8 — usable at ≤ 720p): the posting date and the tracking number, then — within 14 days — the delivery
// date and a screenshot. ⭐ The ADDRESS is shown ONLY here, on demand, behind a fresh step-up (`correction_letter_address`),
// and each reveal leaves its own audit line on the server; it is ⛔ never cached beyond this form (it is dropped when
// the form closes). A late delivery is accepted and flagged overdue — ⛔ never refused. The server is the boundary for
// every rule (eligibility, the address, the agreement, ≤ 2 per person).

import { useState, type FormEvent, type ReactElement } from 'react';

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

export interface CorrectionLetterFormProps {
  readonly pariwarId: string;
  readonly claimCaseId: string;
  readonly personKey: string;
  readonly letters: readonly CorrectionLetterDto[];
}

function refusalText(err: unknown): string {
  if (err instanceof ApiError && err.code.startsWith('correction_letter.')) {
    return t.letters.refusals[err.code.slice('correction_letter.'.length)] ?? t.letters.error;
  }
  return t.letters.error;
}

export function CorrectionLetterForm({ pariwarId, claimCaseId, personKey, letters }: CorrectionLetterFormProps): ReactElement {
  const record = useRecordCorrectionLetter(pariwarId, claimCaseId);
  const deliver = useRecordCorrectionLetterDelivery(pariwarId, claimCaseId);
  const [postedOn, setPostedOn] = useState('');
  const [tracking, setTracking] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [stepUp, setStepUp] = useState<'idle' | 'needed' | 'sent'>('idle');
  const [otp, setOtp] = useState('');
  const [deliveredOn, setDeliveredOn] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const undelivered = letters.find((l) => l.delivered_on === null);
  const atLimit = letters.length >= 2;

  async function revealAddress(): Promise<void> {
    setProblem(null);
    try {
      const res = await getCorrectionLetterAddress(pariwarId, claimCaseId, personKey);
      setAddress(res.address);
      setStepUp('idle');
    } catch (err) {
      if (err instanceof ApiError && err.code === 'auth.step_up_required') {
        setStepUp('needed');
        return;
      }
      setProblem(refusalText(err));
    }
  }

  async function sendCode(): Promise<void> {
    setProblem(null);
    try {
      await requestStepUp(CORRECTION_LETTER_ADDRESS_STEP_UP_CONTEXT);
      setStepUp('sent');
    } catch {
      setProblem(t.letters.error);
    }
  }

  async function verifyAndReveal(): Promise<void> {
    setProblem(null);
    try {
      await verifyStepUp(otp.trim());
      setOtp('');
      await revealAddress();
    } catch {
      setProblem(t.letters.error);
    }
  }

  function saveLetter(e: FormEvent): void {
    e.preventDefault();
    setProblem(null);
    if (postedOn === '' || tracking.trim() === '') return;
    record.mutate(
      { person_key: personKey, posted_on: postedOn, tracking_number: tracking.trim() },
      {
        onSuccess: () => {
          setPostedOn('');
          setTracking('');
          setAddress(null);
        },
        onError: (err) => setProblem(refusalText(err)),
      },
    );
  }

  function saveDelivery(e: FormEvent): void {
    e.preventDefault();
    setProblem(null);
    if (undelivered === undefined || deliveredOn === '' || file === null) return;
    deliver.mutate(
      { letterId: undelivered.letter_id, deliveredOn, file },
      {
        onSuccess: () => {
          setDeliveredOn('');
          setFile(null);
        },
        onError: (err) => setProblem(refusalText(err)),
      },
    );
  }

  return (
    <div className="mt-2 flex flex-col gap-2 text-xs" data-testid={`letter-form-${personKey}`}>
      {!atLimit ? (
        <form onSubmit={saveLetter} className="flex flex-col gap-2 rounded border p-2">
          <span className="font-medium">{t.letters.record}</span>
          {address === null ? (
            <button type="button" className="self-start rounded border px-2 py-0.5" onClick={() => void revealAddress()}>
              {t.letters.showAddress}
            </button>
          ) : (
            <p data-testid="letter-address">
              <span className="opacity-70">{t.letters.address}: </span>
              {address}
            </p>
          )}
          {stepUp !== 'idle' ? (
            <div className="flex flex-col gap-1" role="group" aria-label={t.letters.stepUpIntro}>
              <span>{t.letters.stepUpIntro}</span>
              {stepUp === 'needed' ? (
                <button type="button" className="self-start rounded border px-2 py-0.5" onClick={() => void sendCode()}>
                  {t.letters.sendCode}
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <label className="flex flex-col">
                    <span className="opacity-70">{t.letters.code}</span>
                    <input className="rounded border px-2 py-1" inputMode="numeric" value={otp} onChange={(e) => setOtp(e.target.value)} />
                  </label>
                  <button type="button" className="rounded border px-2 py-0.5" onClick={() => void verifyAndReveal()}>
                    {t.letters.verify}
                  </button>
                </div>
              )}
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <label className="flex flex-col">
              <span className="opacity-70">{t.letters.postedOn}</span>
              <input type="date" className="rounded border px-2 py-1" value={postedOn} onChange={(e) => setPostedOn(e.target.value)} required />
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
      ) : (
        <p role="status">{t.letters.limit}</p>
      )}

      {undelivered !== undefined ? (
        <form onSubmit={saveDelivery} className="flex flex-col gap-2 rounded border p-2">
          <span className="font-medium">{t.letters.deliveryHeading}</span>
          <div className="flex flex-wrap gap-2">
            <label className="flex flex-col">
              <span className="opacity-70">{t.letters.deliveredOn}</span>
              <input type="date" className="rounded border px-2 py-1" value={deliveredOn} onChange={(e) => setDeliveredOn(e.target.value)} required />
            </label>
            <label className="flex flex-col">
              <span className="opacity-70">{t.letters.file}</span>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required />
            </label>
          </div>
          <button type="submit" className="self-start rounded border px-3 py-1" disabled={deliver.isPending}>
            {t.letters.saveDelivery}
          </button>
        </form>
      ) : null}

      <p role="status" aria-live="polite">
        {record.isSuccess || deliver.isSuccess ? t.letters.saved : ''}
      </p>
      {problem !== null ? (
        <p role="alert" className="text-status-fail-fg">
          {problem}
        </p>
      ) : null}
    </div>
  );
}
