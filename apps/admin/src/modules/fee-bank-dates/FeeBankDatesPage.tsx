// The finance officer's BANK-DATE page — Story 6.39a (Task 5; DL3, DL9, DL10, DL11; AC12).
//
// `2026-11-21-473` Q2 B: *"Staff may use the bank's date when the Trust's own bank statement shows the money arrived before
// the death; they record that they did, with a reason, and it is audited."* Built `2026-11-27-510`.
//   · TWO sections (DL10): the claims the recorded check holds on its joining fee, and — only when non-empty, under its own
//     heading — those with a recorded bank date whose check now passes (listed so a wrong date can be corrected).
//   · Each row shows the RECORDED date, the amount and the reference's LAST FOUR only (DL3: the typed reference is a real
//     check, ⛔ a copy from the screen). ⛔ A name, ⛔ the date of death, ⛔ the check's outcome (N2).
//   · The form: the reference AS THE STATEMENT SHOWS IT, the date the money arrived, a reason, a note — every field
//     required, each missing one refused in words before anything is sent.
//   · The write needs a FRESH step-up (DL9): a 403 `auth.step_up_required` HOLDS it and the shared `StepUpPanel` re-sends it
//     (⛔ a second step-up UI). The page owns the mutation and the currency tokens (the row's live check and live record).
// English only (the admin console's posture). ⛔ Colour alone: every state is WORDS.

import { FEE_BANK_DATE_REASON_CODES, FEE_BANK_DATE_STEP_UP_CONTEXT, STATEMENT_REFERENCE_RE, type FeeBankDateListRow } from '@twt/contracts';
import type { ReactElement } from 'react';
import { useState } from 'react';

import { usePostFeeBankDate } from '../../api/hooks.js';
import { holdOnce, needsStepUp, StepUpPanel, type PendingWrite } from '../workplaces/StepUpPanel.js';
import { feeBankDateErrorMessage } from './errors.js';
import { feeBankDatesEn as t } from './i18n-en.js';

type Reason = (typeof FEE_BANK_DATE_REASON_CODES)[number];

/** A `YYYY-MM-DD` that is a REAL calendar date (2026-02-30 is ⛔ one) — the contract's rule, for the form's own prompt. */
function isRealDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const ms = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(ms) && new Date(ms).toISOString().slice(0, 10) === value;
}

function fmt(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
}

/** What is wrong with the form, in the approved words — `null` when it may be sent. Checked in the field order. */
export function feeBankDateFormPrompt(form: { reference: string; date: string; reason: Reason | null; note: string }): string | null {
  const ref = form.reference.trim();
  if (ref === '') return t.prompts.referenceEmpty;
  if (!STATEMENT_REFERENCE_RE.test(ref)) return t.prompts.referenceShape;
  if (!isRealDate(form.date)) return t.prompts.date;
  if (form.reason === null) return t.prompts.reason;
  if (form.note.trim() === '') return t.prompts.note;
  return null;
}

function RowForm({ pariwarId, row, onClose }: { pariwarId: string; row: FeeBankDateListRow; onClose: () => void }): ReactElement {
  const record = usePostFeeBankDate(pariwarId);
  const [reference, setReference] = useState('');
  const [date, setDate] = useState('');
  const [reason, setReason] = useState<Reason | null>(null);
  const [note, setNote] = useState('');
  const [prompt, setPrompt] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingWrite>(null);
  const [done, setDone] = useState(false);
  const id = row.claim_case_id;

  // Any edit backs out of a held retry (the shared panel's hold discipline: a held write is what the officer ASKED for).
  const edit = <V,>(set: (v: V) => void) => (v: V) => {
    setPending(null);
    set(v);
  };

  const send = (body: Parameters<typeof record.mutate>[0]['body']) => {
    record.mutate(
      { claimCaseId: id, body },
      {
        onSuccess: () => {
          setDone(true);
          setNote(''); // the Tier-1 note is ⛔ kept in state once it is written
          setReference(''); // ⛔ the typed reference either
        },
        onError: (err) => {
          if (!needsStepUp(err)) return;
          setPending(holdOnce({ owner: 'bank-date', target: id, id: Date.now(), label: t.submit, retry: () => send(body) }));
        },
      },
    );
  };

  const submit = () => {
    const p = feeBankDateFormPrompt({ reference, date, reason, note });
    setPrompt(p);
    if (p !== null) return;
    send({
      statement_reference: reference.trim(),
      bank_credit_date: date,
      reason_code: reason!,
      note: note.trim(),
      expected_live_check_id: row.expected_live_check_id,
      expected_live_record_id: row.expected_live_record_id,
    });
  };

  if (done) {
    return (
      <p role="status" data-testid={`fee-bank-date-recorded-${id}`}>
        {t.recorded}
      </p>
    );
  }
  const failed = record.isError && !needsStepUp(record.error);
  const locked = record.isPending || pending !== null;
  return (
    <div className="flex flex-col gap-2 rounded border p-3" data-testid={`fee-bank-date-form-${id}`}>
      <label className="flex flex-col text-sm">
        {t.fields.reference}
        <input
          type="text"
          autoComplete="off"
          value={reference}
          maxLength={40}
          onChange={(e) => edit(setReference)(e.target.value)}
          data-testid="fee-bank-date-reference"
        />
      </label>
      <label className="flex flex-col text-sm">
        {t.fields.date}
        <input type="date" value={date} onChange={(e) => edit(setDate)(e.target.value)} data-testid="fee-bank-date-date" />
      </label>
      <fieldset className="flex flex-col gap-1" data-testid="fee-bank-date-reasons">
        <legend className="text-sm">{t.fields.reasonLegend}</legend>
        {FEE_BANK_DATE_REASON_CODES.map((r) => (
          <label key={r} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name={`fee-bank-date-reason-${id}`}
              value={r}
              checked={reason === r}
              onChange={() => edit(setReason)(r)}
              data-testid={`fee-bank-date-reason-${r}`}
            />
            {t.reasons[r]}
          </label>
        ))}
      </fieldset>
      <label className="flex flex-col text-sm">
        {t.fields.note}
        <textarea value={note} maxLength={2000} onChange={(e) => edit(setNote)(e.target.value)} data-testid="fee-bank-date-note" />
      </label>
      {prompt !== null ? (
        <p role="alert" data-testid="fee-bank-date-prompt">
          {prompt}
        </p>
      ) : null}
      <div className="flex gap-2">
        <button
          type="button"
          className="rounded bg-accent px-3 py-1 text-sm font-semibold text-white"
          disabled={locked}
          onClick={submit}
          data-testid="fee-bank-date-submit"
        >
          {t.submit}
        </button>
        <button type="button" className="text-sm underline" disabled={record.isPending} onClick={onClose} data-testid="fee-bank-date-close">
          {t.close}
        </button>
      </div>
      {pending !== null ? (
        <StepUpPanel
          context={FEE_BANK_DATE_STEP_UP_CONTEXT}
          pending={pending}
          onDone={() => setPending(null)}
          onCancel={() => setPending(null)}
          testId="fee-bank-date-step-up"
        />
      ) : null}
      {failed ? (
        <p role="alert" data-testid="fee-bank-date-refused">
          {feeBankDateErrorMessage(record.error)}
        </p>
      ) : null}
    </div>
  );
}

function Row({ pariwarId, row, open, onOpen }: { pariwarId: string; row: FeeBankDateListRow; open: boolean; onOpen: (id: string | null) => void }): ReactElement {
  return (
    <li className="flex flex-col gap-1 border-b py-2" data-testid={`fee-bank-date-row-${row.claim_case_id}`}>
      <p className="text-sm" data-testid="fee-bank-date-row-line">
        {t.row.replace('{date}', row.recorded_fee_date).replace('{amount}', String(row.amount_inr)).replace('{last4}', row.reference_last4)}
      </p>
      {row.latest_posting_district ? (
        <p className="text-xs">
          {t.district}: {row.latest_posting_district}
        </p>
      ) : null}
      {row.live_record ? (
        <p className="text-xs" data-testid="fee-bank-date-row-live">
          {t.liveRecord}: {row.live_record.bank_credit_date} · {t.reasons[row.live_record.reason_code]} · {t.liveBy}{' '}
          {row.live_record.recorded_by_display}, {fmt(row.live_record.recorded_at)}
        </p>
      ) : null}
      {open ? (
        <RowForm pariwarId={pariwarId} row={row} onClose={() => onOpen(null)} />
      ) : (
        <button type="button" className="self-start text-sm underline" onClick={() => onOpen(row.claim_case_id)} data-testid="fee-bank-date-open">
          {t.open}
        </button>
      )}
    </li>
  );
}

export interface FeeBankDatesListProps {
  pariwarId: string;
  held: readonly FeeBankDateListRow[];
  recorded: readonly FeeBankDateListRow[];
  heldTruncated: boolean;
  recordedTruncated: boolean;
}

/** The two sections (DL10). ONE form open at a time; the row keys it. */
export function FeeBankDatesList(props: FeeBankDatesListProps): ReactElement {
  const [openFor, setOpenFor] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-4" data-testid="fee-bank-dates-list">
      <section aria-label={t.heading} data-testid="fee-bank-dates-held">
        {props.held.length === 0 ? (
          <p role="status" data-testid="fee-bank-dates-empty">
            {t.empty}
          </p>
        ) : (
          <ul>
            {props.held.map((row) => (
              <Row key={row.claim_case_id} pariwarId={props.pariwarId} row={row} open={openFor === row.claim_case_id} onOpen={setOpenFor} />
            ))}
          </ul>
        )}
        {props.heldTruncated ? (
          <p role="status" className="text-xs" data-testid="fee-bank-dates-held-truncated">
            {t.truncated}
          </p>
        ) : null}
      </section>
      {props.recorded.length > 0 ? (
        <section aria-labelledby="fee-bank-dates-recorded-heading" data-testid="fee-bank-dates-recorded">
          <h2 id="fee-bank-dates-recorded-heading" className="text-base font-semibold">
            {t.recordedHeading}
          </h2>
          <ul>
            {props.recorded.map((row) => (
              <Row key={row.claim_case_id} pariwarId={props.pariwarId} row={row} open={openFor === row.claim_case_id} onOpen={setOpenFor} />
            ))}
          </ul>
          {props.recordedTruncated ? (
            <p role="status" className="text-xs" data-testid="fee-bank-dates-recorded-truncated">
              {t.truncated}
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
