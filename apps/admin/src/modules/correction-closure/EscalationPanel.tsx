// The Super Admin's held claims and decision surface — Story 6.19c (AC14, AC17, AC8c; keys (5), (4)).
//
// The list (both origins), and ONE claim opened at a time: both admins' notes (a declined closure) or the mark history
// (a staff case), the directions and their responses, the name check's RECORDED state and which writer an approve would
// run (`-273` §8, said in plain words), then the three acts — hold under review, direct a named admin, decide. A staff
// case offers ⛔ no close (`-274` 1a); the reason list follows the chosen decision (`-273` §10); a refusal also takes
// the trustee reason code. The `-273` §7 highlight is shown on the decision's result. Every note / text is REQUIRED
// before Send, and its absence is SAID.

import type { ClosureDecisionClaimResponse, ClosureSuperAdminReason, EscalatedClosureDetailResponse, EscalatedClosuresResponse, StaffNoteDto } from '@twt/contracts';
import { CLOSURE_SUPER_ADMIN_REASONS } from '@twt/contracts';
import type { ReactElement } from 'react';
import { useId, useState } from 'react';

import {
  useDecideEscalatedClosure,
  useEscalatedClosure,
  usePlaceClosureUnderReview,
  useRecordClosureDirection,
} from '../../api/hooks.js';
import { ApiError } from '../../api/client.js';
import { AuditTrailEntry } from '../claim-verification/AuditTrailEntry.js';
import {
  LaterApprovalWarnings,
  approvalBlockedReason,
  approvalNeedsWarningReason,
  resolvedWarningReasonCode,
} from '../claim-verification/LaterApprovalWarnings.js';
import { verifierConsoleEn } from '../claim-verification/i18n-en.js';
import { correctionChaseEn } from '../correction-chase/i18n-en.js';
import { ApprovalNameHighlightBadge } from './ApprovalNameHighlightBadge.js';
import { closureErrorText } from './errors.js';
import { correctionClosureEn as t } from './i18n-en.js';

const e = t.escalation;

function Note({ note }: { note: StaffNoteDto | null }): ReactElement {
  if (note === null) return <>—</>;
  return <>{note.state === 'readable' ? note.value : '—'}</>;
}

/** A required-text field with its own "say why" alert. */
function RequiredText(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  missing: boolean;
  testId: string;
}): ReactElement {
  const id = useId();
  return (
    <>
      <label className="flex flex-col">
        {props.label}
        <textarea value={props.value} onChange={(ev) => props.onChange(ev.target.value)} aria-describedby={props.missing ? id : undefined} data-testid={props.testId} />
      </label>
      {props.missing ? (
        <p role="alert" id={id}>
          {t.column.noteRequired}
        </p>
      ) : null}
    </>
  );
}

export function EscalatedClosureList(props: {
  items: EscalatedClosuresResponse['items'];
  onOpen: (claimCaseId: string) => void;
}): ReactElement {
  return (
    <ul className="mt-4 space-y-2" data-testid="escalated-closures">
      {props.items.map((i) => (
        <li key={i.closure_id} className="rounded border p-2 text-sm" data-testid={`escalated-closure-${i.claim_case_id}`}>
          <div className="flex flex-wrap items-baseline gap-x-3">
            <code className="font-mono text-xs">{i.short_reference}</code>
            <span className="text-xs">{t.origin[i.origin] ?? i.origin}</span>
            {/* Code review patch (2026-10-02) — `role="status"`: a refetch silently updates this state span (e.g.
                decline → escalated, review → under_review) for a viewer who isn't the one who just acted. */}
            <span role="status" className="text-xs">{t.state[i.state] ?? i.state}</span>
          </div>
          <p className="text-xs opacity-80">
            {e.escalatedAt} {i.escalated_at}
            {i.under_review_since !== null ? ` · ${e.underReviewSince} ${i.under_review_since}` : ''}
            {i.open_directions > 0 ? ` · ${i.open_directions} ${e.openDirections}` : ''}
          </p>
          <button type="button" className="mt-1 rounded border px-2 py-0.5 text-xs" onClick={() => props.onOpen(i.claim_case_id)} data-testid={`escalated-open-${i.claim_case_id}`}>
            {e.open}
          </button>
        </li>
      ))}
    </ul>
  );
}

function ReviewForm({ pariwarId, detail }: { pariwarId: string; detail: EscalatedClosureDetailResponse }): ReactElement | null {
  const review = usePlaceClosureUnderReview(pariwarId, detail.closure.claim_case_id);
  const [note, setNote] = useState('');
  const [missing, setMissing] = useState(false);
  if (detail.closure.state === 'under_review') return null;
  return (
    <section className="mt-3 flex flex-col gap-1" aria-label={e.review}>
      <RequiredText label={e.reviewNoteLabel} value={note} onChange={setNote} missing={missing} testId="escalation-review-note" />
      <button
        type="button"
        className="self-start rounded border px-3 py-1"
        disabled={review.isPending}
        data-testid="escalation-review-submit"
        onClick={() => {
          if (note.trim() === '') return setMissing(true);
          setMissing(false);
          void review.mutateAsync(note).catch(() => undefined);
        }}
      >
        {e.review}
      </button>
      {review.isSuccess ? <p role="status">{e.reviewed}</p> : null}
      {review.isError ? <p role="alert">{closureErrorText(review.error)}</p> : null}
    </section>
  );
}

function DirectionForm({ pariwarId, claimCaseId }: { pariwarId: string; claimCaseId: string }): ReactElement {
  const direct = useRecordClosureDirection(pariwarId, claimCaseId);
  const [actor, setActor] = useState('');
  const [role, setRole] = useState<'district_admin' | 'pariwar_admin'>('district_admin');
  const [kind, setKind] = useState<'restart_family_reminders' | 'other'>('other');
  const [text, setText] = useState('');
  const [missing, setMissing] = useState(false);
  // Code review patch (2026-10-02): `actor` gets its OWN missing-value state, ⛔ sharing `missing` with `text` —
  // an empty actor field with a filled text field used to render "Write a note saying why" under the (already
  // valid) text box while the actually-empty actor input got no error state/`aria-describedby` at all.
  const [actorMissing, setActorMissing] = useState(false);
  const actorErrorId = useId();
  const d = e.direct;
  return (
    <fieldset className="mt-3 flex flex-col gap-1" data-testid="escalation-direction-form">
      <legend className="font-semibold">{d.heading}</legend>
      <label className="flex flex-col">
        {d.actor}
        <input
          value={actor}
          onChange={(ev) => setActor(ev.target.value)}
          aria-describedby={actorMissing ? actorErrorId : undefined}
          data-testid="direction-actor"
        />
      </label>
      {actorMissing ? (
        <p role="alert" id={actorErrorId} data-testid="direction-actor-missing">
          {d.actorRequired}
        </p>
      ) : null}
      <label>
        {d.role}{' '}
        <select value={role} onChange={(ev) => setRole(ev.target.value as typeof role)} data-testid="direction-role">
          <option value="district_admin">{d.district_admin}</option>
          <option value="pariwar_admin">{d.pariwar_admin}</option>
        </select>
      </label>
      <label>
        {d.kind}{' '}
        <select value={kind} onChange={(ev) => setKind(ev.target.value as typeof kind)} data-testid="direction-kind">
          <option value="other">{d.other}</option>
          <option value="restart_family_reminders">{d.restart_family_reminders}</option>
        </select>
      </label>
      <RequiredText label={d.text} value={text} onChange={setText} missing={missing} testId="direction-text" />
      <button
        type="button"
        className="self-start rounded border px-3 py-1"
        disabled={direct.isPending}
        data-testid="direction-submit"
        onClick={() => {
          const textEmpty = text.trim() === '';
          const actorEmpty = actor.trim() === '';
          setMissing(textEmpty);
          setActorMissing(actorEmpty);
          if (textEmpty || actorEmpty) return;
          void direct
            .mutateAsync({ directed_to_actor: actor.trim(), directed_to_role: role, kind, text })
            // Code review patch (2026-10-03, adversarial re-check): `actor` is cleared too, ⛔ only `text` — this
            // handler was already being touched for the `actorMissing` fix, and leaving the previous recipient's
            // id sitting in the box after a successful direction is a real, directly-adjacent paper-cut.
            .then(() => {
              setText('');
              setActor('');
            }, () => undefined);
        }}
      >
        {d.submit}
      </button>
      {direct.isSuccess ? <p role="status">{d.recorded}</p> : null}
      {direct.isError ? <p role="alert">{closureErrorText(direct.error)}</p> : null}
    </fieldset>
  );
}

type Decision = 'close' | 'refuse' | 'approve';

const tw = verifierConsoleEn.approvalWarnings;

function DecisionForm({
  pariwarId,
  detail,
  onConflict,
}: {
  pariwarId: string;
  detail: EscalatedClosureDetailResponse;
  /** Story 6.23b — a 409 refetches the detail, so the warnings and the WAIT show as they now stand. */
  onConflict: () => void;
}): ReactElement {
  const decide = useDecideEscalatedClosure(pariwarId, detail.closure.claim_case_id);
  const staffCase = detail.closure.origin === 'staff_case';
  const decisions: Decision[] = staffCase ? ['approve', 'refuse'] : ['close', 'refuse', 'approve'];
  const [decision, setDecision] = useState<Decision>(decisions[0]!);
  // Code review patch (2026-10-02): typed as `ClosureSuperAdminReason` (the contracts enum), ⛔ a bare `string` —
  // the `as never` cast at the mutation call site below is gone; a future drift between this dropdown's values
  // and the contract's enum now fails at COMPILE time, at the one place the value is actually set (the `<select>`
  // handler below), not silently at the distant call site.
  const [reason, setReason] = useState<ClosureSuperAdminReason>(CLOSURE_SUPER_ADMIN_REASONS[decisions[0]!][0]);
  const [refusalCode, setRefusalCode] = useState<'standing_not_met' | 'documents_insufficient' | 'other'>('documents_insufficient');
  const [note, setNote] = useState('');
  const [missing, setMissing] = useState(false);
  const [decided, setDecided] = useState<ClosureDecisionClaimResponse | null>(null);
  // ⭐ Story 6.23b (EA6a; Trap 5) — the WARNING REASON on an approve, its OWN field (⛔ a closure reason). ⛔ No default.
  const [warningPick, setWarningPick] = useState('');
  const [warningMissing, setWarningMissing] = useState(false);
  const warningReasonCode = resolvedWarningReasonCode(detail.reason_options, warningPick);
  const warned = approvalNeedsWarningReason(detail.approval_warnings);
  const approveBlocked = decision === 'approve' ? approvalBlockedReason(detail.approval_warnings) : null;
  const pickerPrefix = 'escalation-decision';
  const x = e.decide;

  if (decided !== null) {
    return (
      <section className="mt-3" data-testid="escalation-decided">
        <p role="status">{x.decided}</p>
        <ul>
          <AuditTrailEntry
            entry={{
              // Code review Decision 5 (2026-10-02): `closed` and `approved` each get their OWN outcome value now;
              // `refused` is DELIBERATELY left mapped to the shared `denied` verb (⛔ not given a distinct one) —
              // a closure-for-no-response and a refusal both leave the claim `denied` at the domain layer, but
              // "Closed by" was the one reading an admin could otherwise mistake for "Denied"; "refused" already
              // reads correctly as the verifier console's existing "Denied by" concept, so it stays as-is.
              outcome:
                decided.closure?.super_admin_decision === 'approved'
                  ? 'approved'
                  : decided.closure?.super_admin_decision === 'closed'
                    ? 'closed'
                    : 'denied',
              reasonCode: x.reasons[decided.closure?.super_admin_reason ?? ''] ?? decided.closure?.super_admin_reason ?? '',
              actorDisplay: decided.decided_by,
              decidedAt: decided.decided_at,
            }}
          />
        </ul>
        <ApprovalNameHighlightBadge highlight={decided.closure?.approval_name_highlight ?? null} />
      </section>
    );
  }

  return (
    <fieldset className="mt-3 flex flex-col gap-1" data-testid="escalation-decision-form">
      <legend className="font-semibold">{x.heading}</legend>
      {staffCase ? <p className="text-xs">{x.staffCaseNoClose}</p> : null}
      <label>
        {x.decision}{' '}
        <select
          value={decision}
          data-testid="decision-kind"
          onChange={(ev) => {
            const next = ev.target.value as Decision;
            setDecision(next);
            setReason(CLOSURE_SUPER_ADMIN_REASONS[next][0]);
            // Code review 2026-10-06 (P44): clear a stale "reason required" error — switching away from (and back
            // to) 'approve' must not re-show last attempt's validation before a new submit.
            setWarningMissing(false);
          }}
        >
          {decisions.map((d) => (
            <option key={d} value={d}>
              {x[d]}
            </option>
          ))}
        </select>
      </label>
      <label>
        {x.reason}{' '}
        <select value={reason} onChange={(ev) => setReason(ev.target.value as ClosureSuperAdminReason)} data-testid="decision-reason">
          {CLOSURE_SUPER_ADMIN_REASONS[decision].map((r) => (
            <option key={r} value={r}>
              {x.reasons[r] ?? r}
            </option>
          ))}
        </select>
      </label>
      {decision === 'refuse' ? (
        <label>
          {x.refusalCode}{' '}
          <select value={refusalCode} onChange={(ev) => setRefusalCode(ev.target.value as typeof refusalCode)} data-testid="decision-refusal-code">
            {(['documents_insufficient', 'standing_not_met', 'other'] as const).map((c) => (
              <option key={c} value={c}>
                {x.refusalCodes[c]}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {decision === 'approve' ? <p className="text-xs" data-testid="decision-approve-path">{e.approvePath[detail.approve_path]}</p> : null}
      {/* ⭐ Story 6.23b (EA6a, EA7) — the warnings on an APPROVE only (a close or a refusal is ⛔ never gated). */}
      {decision === 'approve' ? (
        <LaterApprovalWarnings
          summary={detail.approval_warnings}
          options={detail.reason_options}
          value={warningReasonCode}
          onChange={(code) => {
            setWarningPick(code);
            setWarningMissing(false);
          }}
          error={warningMissing ? tw.reasonRequiredError : null}
          disabled={decide.isPending}
          idPrefix={pickerPrefix}
        />
      ) : null}
      <RequiredText label={x.note} value={note} onChange={setNote} missing={missing} testId="decision-note" />
      <button
        type="button"
        className="self-start rounded border px-3 py-1"
        disabled={decide.isPending || approveBlocked !== null}
        // Code review 2026-10-06 (P34): derived from `pickerPrefix` (the SAME value passed to the picker's
        // `idPrefix` above) rather than a hardcoded literal duplicating it.
        aria-describedby={approveBlocked !== null ? `${pickerPrefix}-approval-blocked` : undefined}
        data-testid="decision-submit"
        onClick={() => {
          const noteMissing = note.trim() === '';
          const reasonMissing = decision === 'approve' && warned && warningReasonCode === '';
          setMissing(noteMissing);
          setWarningMissing(reasonMissing);
          if (noteMissing || reasonMissing) return;
          void decide
            .mutateAsync({
              decision,
              reason,
              note,
              ...(decision === 'refuse' ? { refusal_reason_code: refusalCode } : {}),
              ...(decision === 'approve' && warned ? { warning_reason_code: warningReasonCode } : {}),
            })
            .then(setDecided, (err: unknown) => {
              if (err instanceof ApiError && err.status === 409) onConflict();
            });
        }}
      >
        {x.submit}
      </button>
      {decide.isError ? (
        <p role="alert" data-testid="decision-error">
          {closureErrorText(decide.error)}
        </p>
      ) : null}
    </fieldset>
  );
}

/** ONE held claim, opened. */
export function EscalationDetail({ pariwarId, claimCaseId }: { pariwarId: string; claimCaseId: string }): ReactElement {
  const q = useEscalatedClosure(pariwarId, claimCaseId);
  if (q.isLoading) return <p role="status">{e.loading}</p>;
  if (q.isError || q.data === undefined) return <p role="alert">{closureErrorText(q.error, e.loadError)}</p>;
  const d = q.data;
  return (
    <article className="mt-4 rounded border p-3 text-sm" data-testid="escalation-detail" aria-label={d.short_reference}>
      <h2 className="font-semibold">
        <code className="font-mono">{d.short_reference}</code> — {t.origin[d.closure.origin]} ·{' '}
        {/* Code review patch (2026-10-02) — `role="status"`: a refetch after a decide/direct/review action
            silently updates this state word (e.g. escalated → under_review → closed/refused/approved). */}
        <span role="status">{t.state[d.closure.state]}</span>
      </h2>
      {d.resubmitted ? <p role="status">{e.resubmitted}</p> : d.family_part_done ? <p>{e.familyPartDone}</p> : null}
      <p data-testid="escalation-name-check">
        {e.nameCheck}: {e.nameCheckState[d.name_check_state] ?? d.name_check_state}
      </p>
      <h3 className="mt-2 font-semibold">{e.notes}</h3>
      <dl className="grid grid-cols-[auto,1fr] gap-x-3 text-xs">
        <dt className="opacity-70">{e.requestNote}</dt>
        <dd data-testid="escalation-request-note">
          <Note note={d.request_note} /> {d.requested_by !== null ? `— ${d.requested_by}` : ''}
        </dd>
        <dt className="opacity-70">{e.pariwarNote}</dt>
        <dd data-testid="escalation-pariwar-note">
          <Note note={d.pariwar_decision_note} /> {d.pariwar_decided_by !== null ? `— ${d.pariwar_decided_by}` : ''}
        </dd>
        <dt className="opacity-70">{e.reviewNote}</dt>
        <dd>
          <Note note={d.review_note} />
        </dd>
      </dl>
      <h3 className="mt-2 font-semibold">{e.marks}</h3>
      <ul className="text-xs">
        {d.marks.map((m) => (
          <li key={`${m.set_at}-${m.must_act}`}>
            {m.must_act === 'family' ? correctionChaseEn.mustAct.family : correctionChaseEn.mustAct.staff} · {m.set_by} ({m.set_by_role}) · {m.set_at}
            {m.is_return_mark ? ` · ${e.returnMark}` : ''} {m.note !== null ? <> — <Note note={m.note} /></> : null}
          </li>
        ))}
      </ul>
      <h3 className="mt-2 font-semibold">{e.directions}</h3>
      <ul className="text-xs">
        {d.directions.map((dir) => (
          <li key={dir.direction_id} data-testid={`escalation-direction-${dir.direction_id}`}>
            {dir.directed_to_role} · {dir.created_at}: <Note note={dir.text} /> — {e.response}:{' '}
            {dir.response === null ? e.noResponse : <Note note={dir.response} />}
          </li>
        ))}
      </ul>
      <ReviewForm pariwarId={pariwarId} detail={d} />
      <DirectionForm pariwarId={pariwarId} claimCaseId={claimCaseId} />
      <DecisionForm pariwarId={pariwarId} detail={d} onConflict={() => void q.refetch()} />
    </article>
  );
}
