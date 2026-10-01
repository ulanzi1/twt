// The Pariwar Admin's CLOSURE DECISIONS — Story 6.19c (AC6, AC8c, AC17; key (3) and D27 under `cycle.freeze`).
//
// Each pending closure request gets a UX-DR54 decision strip: the PRIMARY action leftmost (approve), NUMBERED shortcuts
// (1 approves, 2 declines — ⛔ while typing in the note), and the decline note MANDATORY before the decline acts. After
// a decision the UX-DR44 `<AuditTrailEntry>` shows at once (the server's snapshotted name and instant). Each live
// "no correction needed" record gets approve (D27 — the full checks) or keep (stating who must act, with a note); a
// held claim says so and offers ⛔ no decision (only the Super Admin decides it, `-273` §4).
// ⛔ No name, ⛔ no number: the notes are staff notes.

import type { ClosureDecisionClaimResponse, PariwarClosureQueueResponse } from '@twt/contracts';
import type { KeyboardEvent, ReactElement } from 'react';
import { useId, useState } from 'react';

import {
  useApproveNoCorrectionNeeded,
  useDecideCorrectionClosure,
  useKeepNoCorrectionNeeded,
} from '../../api/hooks.js';
import { AuditTrailEntry } from '../claim-verification/AuditTrailEntry.js';
import { closureErrorText } from './errors.js';
import { correctionClosureEn as t } from './i18n-en.js';

type QueueItem = PariwarClosureQueueResponse['items'][number];

function NoteText({ note }: { note: QueueItem['note'] }): ReactElement {
  return <>{note.state === 'readable' ? note.value : '—'}</>;
}

function DecidedEntry({ decided, outcome, label }: { decided: ClosureDecisionClaimResponse; outcome: string; label: string }): ReactElement {
  return (
    <ul className="mt-2" data-testid="closure-decided-entry">
      <AuditTrailEntry entry={{ outcome, reasonCode: label, actorDisplay: decided.decided_by, decidedAt: decided.decided_at }} />
    </ul>
  );
}

/** One closure request's UX-DR54 strip. */
export function ClosureRequestStrip({ pariwarId, item }: { pariwarId: string; item: QueueItem }): ReactElement {
  const decide = useDecideCorrectionClosure(pariwarId);
  const [note, setNote] = useState('');
  const [noteMissing, setNoteMissing] = useState(false);
  const [decided, setDecided] = useState<{ response: ClosureDecisionClaimResponse; decision: 'approve' | 'decline' } | null>(null);
  const noteId = useId();

  async function act(decision: 'approve' | 'decline'): Promise<void> {
    if (decide.isPending || decided !== null) return;
    if (decision === 'decline' && note.trim() === '') {
      setNoteMissing(true);
      return;
    }
    setNoteMissing(false);
    const body = note.trim() === '' ? { decision } : { decision, note };
    await decide.mutateAsync({ claimCaseId: item.claim_case_id, body }).then(
      (response) => setDecided({ response, decision }),
      () => undefined,
    );
  }

  // UX-DR54 — 1 / 2 act from anywhere in the strip, ⛔ while the note box has focus (the digits are text there).
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>): void {
    if ((e.target as HTMLElement).tagName === 'TEXTAREA') return;
    if (e.key === '1') {
      e.preventDefault();
      void act('approve');
    } else if (e.key === '2') {
      e.preventDefault();
      void act('decline');
    }
  }

  if (decided !== null) {
    return (
      <div data-testid={`closure-strip-${item.claim_case_id}`}>
        <p role="status">{decided.decision === 'approve' ? t.strip.approved : t.strip.declined}</p>
        <DecidedEntry
          decided={decided.response}
          outcome={decided.decision === 'approve' ? 'denied' : 'escalated'}
          label={decided.decision === 'approve' ? t.state.closed! : t.state.escalated!}
        />
      </div>
    );
  }

  return (
    <div
      className="sticky bottom-0 mt-2 flex flex-col gap-1 border-t bg-white p-2"
      data-testid={`closure-strip-${item.claim_case_id}`}
      onKeyDown={onKeyDown}
      role="group"
      aria-label={t.strip.heading}
    >
      <label className="flex flex-col">
        {t.strip.declineNote}
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          aria-describedby={noteMissing ? noteId : undefined}
          data-testid="closure-decision-note"
        />
      </label>
      {noteMissing ? (
        <p role="alert" id={noteId}>
          {t.strip.noteRequired}
        </p>
      ) : null}
      <p className="text-xs opacity-70">{t.strip.shortcuts}</p>
      <div className="flex gap-2">
        <button
          type="button"
          className="rounded border px-3 py-1"
          aria-keyshortcuts="1"
          disabled={decide.isPending}
          onClick={() => void act('approve')}
          data-testid="closure-approve"
        >
          1 · {t.strip.approve}
        </button>
        <button
          type="button"
          className="rounded border px-3 py-1"
          aria-keyshortcuts="2"
          disabled={decide.isPending}
          onClick={() => void act('decline')}
          data-testid="closure-decline"
        >
          2 · {t.strip.decline}
        </button>
      </div>
      {decide.isError ? (
        <p role="alert" data-testid="closure-decision-error">
          {closureErrorText(decide.error)}
        </p>
      ) : null}
    </div>
  );
}

/** One live "no correction needed" record — D27's approve or `-260` G2's keep. */
export function NoCorrectionStrip({ pariwarId, item }: { pariwarId: string; item: QueueItem }): ReactElement {
  const approve = useApproveNoCorrectionNeeded(pariwarId);
  const keep = useKeepNoCorrectionNeeded(pariwarId);
  const [mustAct, setMustAct] = useState<'family' | 'staff'>('family');
  const [note, setNote] = useState('');
  const [noteMissing, setNoteMissing] = useState(false);
  const [approved, setApproved] = useState<ClosureDecisionClaimResponse | null>(null);
  const noteId = useId();
  const n = t.strip.noCorrection;

  if (item.held) {
    return (
      <p role="status" className="mt-2 text-xs" data-testid={`no-correction-held-${item.claim_case_id}`}>
        {n.held}
      </p>
    );
  }
  if (approved !== null) {
    return (
      <div data-testid={`no-correction-strip-${item.claim_case_id}`}>
        <p role="status">{n.approved}</p>
        <DecidedEntry decided={approved} outcome="approved" label={t.strip.kind.no_correction_needed!} />
      </div>
    );
  }

  async function onKeep(): Promise<void> {
    if (note.trim() === '') {
      setNoteMissing(true);
      return;
    }
    setNoteMissing(false);
    await keep.mutateAsync({ claimCaseId: item.claim_case_id, body: { must_act: mustAct, note } }).then(
      () => setNote(''),
      () => undefined,
    );
  }

  return (
    <div className="mt-2 flex flex-col gap-1 border-t p-2" data-testid={`no-correction-strip-${item.claim_case_id}`}>
      <p className="text-xs">{item.checked_after_record === true ? n.checkedAfter : n.notChecked}</p>
      <button
        type="button"
        className="self-start rounded border px-3 py-1"
        disabled={approve.isPending || item.checked_after_record !== true}
        aria-describedby={item.checked_after_record !== true ? `${noteId}-check` : undefined}
        onClick={() =>
          void approve.mutateAsync(item.claim_case_id).then(
            (r) => setApproved(r),
            () => undefined,
          )
        }
        data-testid="no-correction-approve"
      >
        {n.approve}
      </button>
      {item.checked_after_record !== true ? (
        <span id={`${noteId}-check`} className="sr-only">
          {n.notChecked}
        </span>
      ) : null}
      {approve.isError ? <p role="alert">{closureErrorText(approve.error)}</p> : null}
      <fieldset className="mt-1 flex flex-col gap-1">
        <legend>{n.keep}</legend>
        <label>
          {n.keepMustAct}{' '}
          <select value={mustAct} onChange={(e) => setMustAct(e.target.value as 'family' | 'staff')} data-testid="no-correction-keep-must-act">
            <option value="family">{n.keepFamily}</option>
            <option value="staff">{n.keepStaff}</option>
          </select>
        </label>
        <label className="flex flex-col">
          {n.keepNote}
          <textarea value={note} onChange={(e) => setNote(e.target.value)} aria-describedby={noteMissing ? noteId : undefined} data-testid="no-correction-keep-note" />
        </label>
        {noteMissing ? (
          <p role="alert" id={noteId}>
            {t.strip.noteRequired}
          </p>
        ) : null}
        <button type="button" className="self-start rounded border px-3 py-1" disabled={keep.isPending} onClick={() => void onKeep()} data-testid="no-correction-keep">
          {n.keep}
        </button>
        {keep.isSuccess ? <p role="status">{n.kept}</p> : null}
        {keep.isError ? <p role="alert">{closureErrorText(keep.error)}</p> : null}
      </fieldset>
    </div>
  );
}

/** The whole list — one card per item. */
export function PariwarClosureList({ pariwarId, items }: { pariwarId: string; items: readonly QueueItem[] }): ReactElement {
  return (
    <ul className="mt-4 space-y-3" data-testid="closure-queue">
      {items.map((item) => (
        <li key={`${item.kind}-${item.claim_case_id}`} className="rounded border p-3 text-sm" data-testid={`closure-queue-item-${item.claim_case_id}`}>
          <div className="flex flex-wrap items-baseline gap-x-3">
            <span className="rounded bg-black/5 px-1.5 py-0.5 text-xs">{t.strip.kind[item.kind] ?? item.kind}</span>
            <code className="font-mono text-xs">{item.short_reference}</code>
          </div>
          <dl className="mt-1 grid grid-cols-[auto,1fr] gap-x-3 text-xs">
            <dt className="opacity-70">{item.kind === 'closure_request' ? t.strip.askedBy : t.strip.recordedBy}</dt>
            <dd>
              {item.by} · {item.at}
            </dd>
            <dt className="opacity-70">{t.strip.note}</dt>
            <dd data-testid="closure-queue-note">
              <NoteText note={item.note} />
            </dd>
            {item.family_run_day0 !== null ? (
              <>
                <dt className="opacity-70">{t.strip.familyRunDay0}</dt>
                <dd>{item.family_run_day0}</dd>
              </>
            ) : null}
          </dl>
          {item.kind === 'closure_request' ? (
            <ClosureRequestStrip pariwarId={pariwarId} item={item} />
          ) : (
            <NoCorrectionStrip pariwarId={pariwarId} item={item} />
          )}
        </li>
      ))}
    </ul>
  );
}
