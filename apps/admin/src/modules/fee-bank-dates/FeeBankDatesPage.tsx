// The finance officer's BANK-DATE page — Story 6.39a (Task 5; DL3, DL9, DL10, DL11; AC12).
//
// `2026-11-21-473` Q2 B: *"Staff may use the bank's date when the Trust's own bank statement shows the money arrived before
// the death; they record that they did, with a reason, and it is audited."* Built `2026-11-27-510`; the page's lost-write line
// `2026-11-27-512` D2.
//   · TWO sections (DL10): the claims the recorded check holds on its joining fee, and — only when non-empty, under its own
//     heading — those with a recorded bank date whose check now passes (listed so a wrong date can be corrected).
//   · Each row shows the RECORDED date, the amount and the reference's LAST FOUR only (DL3: the typed reference is a real
//     check, ⛔ a copy from the screen). ⛔ A name, ⛔ the date of death, ⛔ the check's outcome (N2).
//   · The form: the reference AS THE STATEMENT SHOWS IT, the date the money arrived, a reason, a note — every field
//     required, each missing one refused in words, on its field, before anything is sent.
//   · The write needs a FRESH step-up (DL9): a 403 `auth.step_up_required` HOLDS it and the shared `StepUpPanel` re-sends it
//     (⛔ a second step-up UI). While a write is in flight or held, the form is LOCKED (so the held body is the one on screen —
//     the panel's hold discipline) and ⛔ other row can be opened (unmounting the form would drop the write's answer).
// ⭐ Code review 2026-11-27 — the OUTCOME (recorded / refused / lost) is the LIST's, ⛔ the row's: a row that moves section or
// leaves the list on the reload (a success, `stale`, `not_held`, `window_closed`, `not_found`) would otherwise take its line
// with it. ONE announced, focused line above the sections, naming the claim's reference ending.
// English only (the admin console's posture). ⛔ Colour alone: every state is WORDS.

import { useNavigate } from '@tanstack/react-router';
import { FEE_BANK_DATE_REASON_CODES, FEE_BANK_DATE_STEP_UP_CONTEXT, STATEMENT_REFERENCE_RE, type FeeBankDateListRow } from '@twt/contracts';
import type { ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';

import { ApiError } from '../../api/client.js';
import { FEE_BANK_DATE_RELOAD_CODES, isAnsweredFeeBankDateRefusal, usePostFeeBankDate } from '../../api/hooks.js';
import { holdKey, holdOnce, needsStepUp, StepUpPanel, type PendingWrite } from '../workplaces/StepUpPanel.js';
import { feeBankDateErrorMessage } from './errors.js';
import { feeBankDatesEn as t } from './i18n-en.js';

type Reason = (typeof FEE_BANK_DATE_REASON_CODES)[number];

/** The approved row line's LAST part (`reference ending {last4}`, DL11) — names the claim on the outcome line, ⛔ new words. */
const REFERENCE_ENDING = t.row.split(' · ').pop()!;
type Field = 'reference' | 'date' | 'reason' | 'note';

/** A `YYYY-MM-DD` that is a REAL calendar date (2026-02-30 is ⛔ one) — the contract's rule, for the form's own prompt. */
function isRealDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const ms = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(ms) && new Date(ms).toISOString().slice(0, 10) === value;
}

function fmt(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
}

/** Fill `{key}` slots with VALUES — a replacer function, so a value's `$&` / `$'` is never read as a pattern. */
function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (slot, key: string) => values[key] ?? slot);
}

/** What is wrong with the form, in the approved words, and on WHICH field — `null` when it may be sent. Field order. */
export function feeBankDateFormPrompt(form: { reference: string; date: string; reason: Reason | null; note: string }): { field: Field; text: string } | null {
  const ref = form.reference.trim();
  if (ref === '') return { field: 'reference', text: t.prompts.referenceEmpty };
  if (!STATEMENT_REFERENCE_RE.test(ref)) return { field: 'reference', text: t.prompts.referenceShape };
  if (!isRealDate(form.date)) return { field: 'date', text: t.prompts.date };
  if (form.reason === null) return { field: 'reason', text: t.prompts.reason };
  if (form.note.trim() === '') return { field: 'note', text: t.prompts.note };
  return null;
}

/** The list's ONE outcome line. `kind` picks its role: a recorded line is a status, a refusal or a lost write an alert. */
export interface FeeBankDateNotice {
  readonly claimCaseId: string;
  readonly referenceLast4: string;
  readonly kind: 'recorded' | 'refused';
  readonly text: string;
  /** Bumped per notice, so the SAME words a second time are a NEW node — announced again. */
  readonly seq: number;
}

interface RowFormProps {
  pariwarId: string;
  row: FeeBankDateListRow;
  onClose: () => void;
  /** The write's outcome — the list shows it (the row may move or leave on the reload). */
  onOutcome: (kind: FeeBankDateNotice['kind'], text: string, closeForm: boolean) => void;
  /** A write is in flight or held — the list locks every other row's "open". */
  onBusyChange: (busy: boolean) => void;
  /** The officer edited a field — the list retires this row's outcome line. */
  onEdited: () => void;
  /** The open row's tokens changed under the form (a reload) — the list closes it with DL11's `stale` line. */
  onTokensChanged: () => void;
}

function RowForm({ pariwarId, row, onClose, onOutcome, onBusyChange, onEdited, onTokensChanged }: RowFormProps): ReactElement {
  const record = usePostFeeBankDate(pariwarId);
  const navigate = useNavigate();
  const [reference, setReference] = useState('');
  const [date, setDate] = useState('');
  const [reason, setReason] = useState<Reason | null>(null);
  const [note, setNote] = useState('');
  const [prompt, setPrompt] = useState<{ field: Field; text: string; seq: number } | null>(null);
  const [pending, setPending] = useState<PendingWrite>(null);
  const id = row.claim_case_id;
  // `sending` (round 4): set by the press itself, cleared by the write's own callbacks — so `busy` cannot read false between the
  // step-up panel clearing its hold and the retry's `isPending` reaching React (the freeze must not lapse mid-retry).
  const [sending, setSending] = useState(false);
  const busy = sending || record.isPending || pending !== null;
  // ⭐ The currency tokens are the row AS IT WAS when the form opened (code review round 2, 2026-11-27): the list refetches on
  // window focus — the officer reading the bank statement in another tab is the normal case — and a token read at PRESS time
  // would follow a record or a check the officer never saw, turning `stale` into a silent correction (and a lost write's
  // re-send into a duplicate). Any answer that reloads the list closes the form, so a re-open takes the fresh tokens.
  const [seen] = useState(() => ({ checkId: row.expected_live_check_id, recordId: row.expected_live_record_id }));
  // ⭐ Round 4 (superseding round 3's "say it, then take the new tokens" — the line it relied on is retired by the next
  // keystroke, so the officer could press on tokens never consciously seen): a reload that CHANGES the open row's tokens in
  // place (another officer's record, a District Admin's re-check, a re-open before the reload landed) CLOSES the form with
  // DL11's `stale` line — as a move or a drop does. ⛔ token is ever adopted client-side: a re-open takes the row as then shown,
  // and a press racing the close still carries the tokens AS OPENED (the server answers `stale`, DL5 (e)). The list is frozen
  // while a write is busy, so this never fires mid-write.
  useEffect(() => {
    if (row.expected_live_check_id === seen.checkId && row.expected_live_record_id === seen.recordId) return;
    onTokensChanged();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the row's tokens alone
  }, [row.expected_live_check_id, row.expected_live_record_id]);

  useEffect(() => {
    onBusyChange(busy);
  }, [busy, onBusyChange]);
  useEffect(() => () => onBusyChange(false), [onBusyChange]);
  // ⚠ Real Chrome drops the focus to <body> when the focused control is natively disabled (the locked fieldset — jsdom keeps
  // it; the browser pass 2026-11-27). When the form comes back after a refusal or a cancelled step-up, the focus returns to
  // its submit button — the officer corrects the SAME form.
  const submitRef = useRef<HTMLButtonElement>(null);
  const refocus = useRef(false);
  // A HELD write moves the focus into the step-up panel (its first control — "Send the code"): the locked fieldset has just
  // dropped it to <body> in real Chrome (code review round 2).
  const panelRef = useRef<HTMLDivElement>(null);
  const heldKey = pending === null ? null : holdKey(pending);
  useEffect(() => {
    if (pending !== null) panelRef.current?.querySelector<HTMLElement>('button, input')?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per hold
  }, [heldKey]);
  useEffect(() => {
    if (!busy && refocus.current) {
      refocus.current = false;
      submitRef.current?.focus();
    }
  }, [busy]);

  // An edit (only possible while ⛔ busy — the fieldset is locked otherwise) clears the prompt and the row's outcome line: the
  // officer is acting on it (a still-wrong field is prompted again on the next press). `field` is kept for the call sites.
  const edit = <V,>(_field: Field, set: (v: V) => void) => (v: V) => {
    setPrompt(null);
    onEdited();
    set(v);
  };

  const send = (body: Parameters<typeof record.mutate>[0]['body']) => {
    onBusyChange(true); // ⛔ an effect later: the list freezes in the SAME commit as the press (code review round 2)
    setSending(true);
    record.mutate(
      { claimCaseId: id, body },
      {
        onSuccess: () => {
          setSending(false);
          // ⛔ The Tier-1 note or the typed reference kept anywhere once written: the form state, the mutation (reset; the hook's
          // gcTime is 0), the retry closure (the hold is gone).
          setNote('');
          setReference('');
          record.reset();
          onOutcome('recorded', t.recorded, true);
        },
        onError: (err) => {
          setSending(false); // a hold keeps `busy` through `pending`
          if (needsStepUp(err)) {
            record.reset(); // the held body lives in the retry closure alone (⛔ also in the mutation's `variables`)
            setPending(holdOnce({ owner: 'bank-date', target: id, id: Date.now(), label: t.submit, retry: () => send(body) }));
            return;
          }
          record.reset();
          if (err instanceof ApiError && err.status === 401) {
            void navigate({ to: '/login' });
            return;
          }
          // An answer that RELOADS the list (a reload code; a lost write — `-512` D2) closes the form: its tokens are spent.
          const reloads = !isAnsweredFeeBankDateRefusal(err) || FEE_BANK_DATE_RELOAD_CODES.has(err.code);
          if (!reloads) refocus.current = true;
          onOutcome('refused', feeBankDateErrorMessage(err), reloads);
        },
      },
    );
  };

  const submit = () => {
    const p = feeBankDateFormPrompt({ reference, date, reason, note });
    if (p !== null) {
      setPrompt((prev) => ({ ...p, seq: (prev?.seq ?? 0) + 1 }));
      return;
    }
    setPrompt(null);
    send({
      statement_reference: reference.trim(),
      bank_credit_date: date,
      reason_code: reason!,
      note: note.trim(),
      expected_live_check_id: seen.checkId,
      expected_live_record_id: seen.recordId,
    });
  };

  const promptId = `fee-bank-date-prompt-${id}`;
  const invalid = (f: Field) => (prompt?.field === f ? { 'aria-invalid': true as const, 'aria-describedby': promptId } : {});
  return (
    <div className="flex flex-col gap-2 rounded border p-3" data-testid={`fee-bank-date-form-${id}`}>
      <fieldset disabled={busy} className="flex flex-col gap-2" data-testid="fee-bank-date-fields">
        <label className="flex flex-col text-sm">
          {t.fields.reference}
          <input
            type="text"
            autoComplete="off"
            value={reference}
            maxLength={40}
            onChange={(e) => edit('reference', setReference)(e.target.value)}
            data-testid="fee-bank-date-reference"
            {...invalid('reference')}
          />
        </label>
        <label className="flex flex-col text-sm">
          {t.fields.date}
          <input type="date" value={date} onChange={(e) => edit('date', setDate)(e.target.value)} data-testid="fee-bank-date-date" {...invalid('date')} />
        </label>
        <fieldset className="flex flex-col gap-1" data-testid="fee-bank-date-reasons" {...invalid('reason')}>
          <legend className="text-sm">{t.fields.reasonLegend}</legend>
          {FEE_BANK_DATE_REASON_CODES.map((r) => (
            <label key={r} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={`fee-bank-date-reason-${id}`}
                value={r}
                checked={reason === r}
                onChange={() => edit<Reason>('reason', setReason)(r)}
                data-testid={`fee-bank-date-reason-${r}`}
              />
              {t.reasons[r]}
            </label>
          ))}
        </fieldset>
        <label className="flex flex-col text-sm">
          {t.fields.note}
          <textarea value={note} maxLength={2000} onChange={(e) => edit('note', setNote)(e.target.value)} data-testid="fee-bank-date-note" {...invalid('note')} />
        </label>
        {prompt !== null ? (
          // Keyed by `seq`: the same prompt a second time is a NEW node — announced again.
          <p key={prompt.seq} id={promptId} role="alert" data-testid="fee-bank-date-prompt">
            {prompt.text}
          </p>
        ) : null}
        <div className="flex gap-2">
          <button ref={submitRef} type="button" className="rounded bg-accent px-3 py-1 text-sm font-semibold text-white" onClick={submit} data-testid="fee-bank-date-submit">
            {t.submit}
          </button>
          <button type="button" className="text-sm underline" onClick={onClose} data-testid="fee-bank-date-close">
            {t.close}
          </button>
        </div>
      </fieldset>
      {pending !== null ? (
        <div ref={panelRef} className="contents">
        <StepUpPanel
          key={holdKey(pending)}
          context={FEE_BANK_DATE_STEP_UP_CONTEXT}
          pending={pending}
          onDone={() => setPending(null)}
          onCancel={() => {
            refocus.current = true;
            setPending(null);
          }}
          testId="fee-bank-date-step-up"
        />
        </div>
      ) : null}
    </div>
  );
}

interface RowProps {
  pariwarId: string;
  row: FeeBankDateListRow;
  open: boolean;
  /** Another row's write is in flight or held — this row cannot be opened meanwhile. */
  locked: boolean;
  onOpen: (id: string | null) => void;
  onOutcome: RowFormProps['onOutcome'];
  onBusyChange: RowFormProps['onBusyChange'];
  onEdited: RowFormProps['onEdited'];
  onTokensChanged: RowFormProps['onTokensChanged'];
}

function Row({ pariwarId, row, open, locked, onOpen, onOutcome, onBusyChange, onEdited, onTokensChanged }: RowProps): ReactElement {
  return (
    <li className="flex flex-col gap-1 border-b py-2" data-testid={`fee-bank-date-row-${row.claim_case_id}`}>
      <p className="text-sm" data-testid="fee-bank-date-row-line">
        {fill(t.row, { date: row.recorded_fee_date, amount: String(row.amount_inr), last4: row.reference_last4 })}
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
        <RowForm pariwarId={pariwarId} row={row} onClose={() => onOpen(null)} onOutcome={onOutcome} onBusyChange={onBusyChange} onEdited={onEdited} onTokensChanged={onTokensChanged} />
      ) : (
        <button
          type="button"
          className="self-start text-sm underline"
          disabled={locked}
          onClick={() => onOpen(row.claim_case_id)}
          data-testid="fee-bank-date-open"
        >
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

/** DL11's approved `stale` line as the outcome line for `claimCaseId` — a reload changed or moved the open row. */
function staleNotice(claimCaseId: string, referenceLast4: string, prev: FeeBankDateNotice | null): FeeBankDateNotice {
  return { claimCaseId, referenceLast4, kind: 'refused', text: t.refused['stale']!, seq: (prev?.seq ?? 0) + 1 };
}

/** The two sections (DL10). ONE form open at a time; ONE outcome line for the page. */
export function FeeBankDatesList(props: FeeBankDatesListProps): ReactElement {
  const [openFor, setOpenFor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<FeeBankDateNotice | null>(null);
  const noticeRef = useRef<HTMLParagraphElement>(null);
  // ⭐ While a write is in flight or HELD, the list on screen is FROZEN (fix-diff review 2026-11-27): a reload in that time (a
  // focus refetch while the officer reads the step-up code; another actor's commit) could move or drop the row, and a moved row
  // is a NEW component (two lists) — its form would unmount and take the write's answer, the held step-up and the typed fields
  // with it, with ⛔ word. The fresh list renders once the outcome is shown.
  const [frozen, setFrozen] = useState<Pick<FeeBankDatesListProps, 'held' | 'recorded' | 'heldTruncated' | 'recordedTruncated'> | null>(null);
  useEffect(() => {
    setFrozen((prev) =>
      busy ? (prev ?? { held: props.held, recorded: props.recorded, heldTruncated: props.heldTruncated, recordedTruncated: props.recordedTruncated }) : null,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the snapshot is taken when `busy` turns on, ⛔ on each new list
  }, [busy]);
  const held = frozen?.held ?? props.held;
  const recorded = frozen?.recorded ?? props.recorded;
  const heldTruncated = frozen?.heldTruncated ?? props.heldTruncated;
  const recordedTruncated = frozen?.recordedTruncated ?? props.recordedTruncated;

  // The outcome line takes the focus when the form that held it is GONE (a success closes it; a refused row may leave or
  // move on the reload) — family 13 (d). A refusal whose form is still open keeps the focus in the form being corrected
  // (the line is an alert — announced without the focus; fix-diff review 2026-11-27).
  useEffect(() => {
    if (notice !== null && (notice.kind === 'recorded' || openFor !== notice.claimCaseId)) noticeRef.current?.focus();
  }, [notice, openFor]);
  // A form whose row has LEFT the list, or MOVED section, closes. The sections are two lists, so a moved row is a NEW
  // component: its form would re-open EMPTY (the typed fields and any held step-up dropped without a word) — fix-diff
  // review 2026-11-27. Closing says so: an outcome line already shown stays; a form closed with ⛔ outcome (a reload while the
  // officer was typing) gets DL11's approved `stale` line — "This claim changed since you opened it. It has been reloaded —
  // check again." — the very case it names (code review round 2).
  const heldIds = held.map((r) => r.claim_case_id);
  const sectionOf = (id: string): 'held' | 'recorded' | null =>
    heldIds.includes(id) ? 'held' : recorded.some((r) => r.claim_case_id === id) ? 'recorded' : null;
  const openSection = openFor === null ? null : sectionOf(openFor);
  const openedIn = useRef<'held' | 'recorded' | null>(null);
  const openedLast4 = useRef('');
  useEffect(() => {
    if (openFor === null) {
      openedIn.current = null;
      return;
    }
    if (openSection === null || (openedIn.current !== null && openedIn.current !== openSection)) {
      // ALWAYS the `stale` line (round 3): an older line for this claim (a correctable refusal) was about the form now gone.
      setNotice((prev) => staleNotice(openFor, openedLast4.current, prev));
      setOpenFor(null);
      return;
    }
    openedIn.current = openSection;
  }, [openFor, openSection]);

  const outcomeFor = (row: FeeBankDateListRow): RowFormProps['onOutcome'] => (kind, text, closeForm) => {
    setNotice((prev) => ({ claimCaseId: row.claim_case_id, referenceLast4: row.reference_last4, kind, text, seq: (prev?.seq ?? 0) + 1 }));
    if (closeForm) setOpenFor(null);
  };
  const open = (id: string | null) => {
    openedIn.current = null; // set by the effect for the row now open
    openedLast4.current = [...held, ...recorded].find((r) => r.claim_case_id === id)?.reference_last4 ?? '';
    setOpenFor(id);
    if (id !== null) setNotice(null);
  };
  const tokensChangedFor = (row: FeeBankDateListRow) => () => {
    setNotice((prev) => staleNotice(row.claim_case_id, row.reference_last4, prev));
    setOpenFor(null);
  };
  // An edit in the row's form retires that row's outcome line (the officer is correcting it — an old refusal must not stand).
  const editedFor = (id: string) => () => setNotice((prev) => (prev !== null && prev.claimCaseId === id ? null : prev));

  const rowOf = (row: FeeBankDateListRow) => (
    <Row
      key={row.claim_case_id}
      pariwarId={props.pariwarId}
      row={row}
      open={openFor === row.claim_case_id}
      locked={busy && openFor !== row.claim_case_id}
      onOpen={open}
      onOutcome={outcomeFor(row)}
      onEdited={editedFor(row.claim_case_id)}
      onTokensChanged={tokensChangedFor(row)}
      onBusyChange={setBusy}
    />
  );

  return (
    <div className="flex flex-col gap-4" data-testid="fee-bank-dates-list">
      {notice !== null ? (
        <p
          key={notice.seq}
          ref={noticeRef}
          tabIndex={-1}
          role={notice.kind === 'recorded' ? 'status' : 'alert'}
          data-testid={notice.kind === 'recorded' ? 'fee-bank-date-recorded' : 'fee-bank-date-refused'}
          data-claim={notice.claimCaseId}
        >
          {fill(REFERENCE_ENDING, { last4: notice.referenceLast4 })} — {notice.text}
        </p>
      ) : null}
      <section aria-labelledby="fee-bank-dates-heading" data-testid="fee-bank-dates-held">
        {held.length === 0 ? (
          <p role="status" data-testid="fee-bank-dates-empty">
            {t.empty}
          </p>
        ) : (
          <ul>{held.map(rowOf)}</ul>
        )}
        {heldTruncated ? (
          <p role="status" className="text-xs" data-testid="fee-bank-dates-held-truncated">
            {t.truncated}
          </p>
        ) : null}
      </section>
      {recorded.length > 0 ? (
        <section aria-labelledby="fee-bank-dates-recorded-heading" data-testid="fee-bank-dates-recorded">
          <h2 id="fee-bank-dates-recorded-heading" className="text-base font-semibold">
            {t.recordedHeading}
          </h2>
          <ul>{recorded.map(rowOf)}</ul>
          {recordedTruncated ? (
            <p role="status" className="text-xs" data-testid="fee-bank-dates-recorded-truncated">
              {t.truncated}
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
