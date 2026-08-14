// `<HelpdeskDetailShell>` — the pure responder ticket-detail view (Story 10.4, Task 7; AC2/AC3/AC5).
//
// Renders the reply thread + the routing/SLA header + the cross-link nav, and exposes the pick-up /
// reply / resolve action affordances (each gated by the ticket's current state — the API guards
// legality too, this just hides an action that would 409). PURE presentational: the container wires
// the mutations. The reply/resolve message is local input state (a presentational concern).

import { DPDPA_DATA_RIGHTS_SUBCATEGORY, type HelpdeskAdminTicketDetailResponse } from '@twt/contracts';
import type { ReactElement } from 'react';
import { useState } from 'react';

import { crossLinkNavs } from './crossLinks.js';
import { resolveEn } from './i18n-en.js';
import { formatSlaRemaining, severityLabel, severityToneClass, stateLabel } from './presentation.js';

export interface HelpdeskDetailShellProps {
  pariwarId: string;
  detail?: HelpdeskAdminTicketDetailResponse;
  loading: boolean;
  error?: string;
  onPickUp: () => void;
  onReply: (message: string) => void;
  onResolve: (message: string) => void;
  pending: { pickUp: boolean; reply: boolean; resolve: boolean };
  actionError?: string;

  // ── Story 10.21 (AC2/AC3) — the DPDPA fulfilment affordances ──────────────────────────────────────
  // ⚠ These are SEPARATE from the reply/resolve actions above, because they are a DIFFERENT AUTHORITY.
  // Responding to a ticket rides `helpdesk.respond`; EXECUTING a data-rights request on a member with
  // no session rides `member.data_rights` + a distinct step-up. The container decides whether the
  // acting admin holds it — the shell only renders what it is told.
  /** Whether the acting admin holds `member.data_rights`. ⛔ Presentational only — the API is the real
   *  gate; hiding an action the caller cannot perform is a courtesy, not a control. */
  canFulfilDataRights?: boolean;
  onBuildExport?: () => void;
  onFulfilErasure?: () => void;
  dataRightsPending?: { buildExport: boolean; erasure: boolean };
  dataRightsError?: string;
  dataRightsNotice?: string;

  // ── AC-R1 delivery + AC-R2 correction ────────────────────────────────────────────────────────────
  onDeliverMemberDirect?: () => void;
  onDeliverStaffMediated?: (attestation: string) => void;
  deliveryPending?: { memberDirect: boolean; staffMediated: boolean };
  onRecordCorrection?: (input: {
    requestedChange: string;
    actionTaken: string;
    outcome: 'recorded' | 'applied' | 'declined';
  }) => void;
  correctionPending?: boolean;
}

export function HelpdeskDetailShell(props: HelpdeskDetailShellProps): ReactElement {
  const {
    pariwarId,
    detail,
    loading,
    error,
    onPickUp,
    onReply,
    onResolve,
    pending,
    actionError,
    canFulfilDataRights = false,
    onBuildExport,
    onFulfilErasure,
    dataRightsPending,
    dataRightsError,
    dataRightsNotice,
    onDeliverMemberDirect,
    onDeliverStaffMediated,
    deliveryPending,
    onRecordCorrection,
    correctionPending,
  } = props;
  const [attestation, setAttestation] = useState('');
  const [correctionRequested, setCorrectionRequested] = useState('');
  const [correctionAction, setCorrectionAction] = useState('');
  const [correctionOutcome, setCorrectionOutcome] = useState<'recorded' | 'applied' | 'declined'>('applied');
  const [message, setMessage] = useState('');
  // ⛔ Erasure is IRREVERSIBLE and operator-initiated, so it requires an explicit second confirmation
  // in the UI. This is a usability guard, NOT a security control — the API's step-up + idempotency +
  // advisory lock are the real ones. ⛔ Do not remove the API guards on the strength of this checkbox.
  const [erasureConfirmed, setErasureConfirmed] = useState(false);

  if (loading) return <p role="status">{resolveEn('helpdesk.detail.loading')}</p>;
  if (error !== undefined) return <p role="alert" className="text-red-700">{error}</p>;
  if (!detail) return <p role="status">{resolveEn('helpdesk.detail.notFound')}</p>;

  const state = detail.current_state;
  const canPickUp = state === 'open' || state === 'reopened';
  const canAwait = state === 'open' || state === 'in_progress';
  const canResolve = state === 'in_progress' || state === 'awaiting_member';
  const messageReady = message.trim().length > 0;
  const navs = crossLinkNavs(pariwarId, detail.cross_links);

  // ⛔ Shown ONLY for a data-rights ticket that names a subject member. The subcategory token is
  // IMPORTED, never re-declared — a typo would silently fail to match and the panel would never
  // appear, with nothing anywhere reporting why (the @twt/contracts source-scan gate enforces this).
  // ⚠ `subject_member_id` is required because every fulfilment read keys on the MEMBER, never on the
  // ticket (AC4) — a ticket with no subject member has nobody to fulfil for.
  const isDataRightsTicket =
    detail.sub_category === DPDPA_DATA_RIGHTS_SUBCATEGORY && detail.subject_member_id !== null;

  return (
    <section aria-label={resolveEn('helpdesk.detail.title')} className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">{detail.subject}</h1>
        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
          <span>{detail.category}</span>
          <span>·</span>
          <span>{stateLabel(state)}</span>
          <span>·</span>
          <span className={`font-semibold ${severityToneClass(detail.severity)}`}>{severityLabel(detail.severity)}</span>
          <span>·</span>
          <span>{resolveEn('helpdesk.detail.routedTo')} {detail.routed_to_role}</span>
        </div>
        <div className="flex gap-4 text-xs text-gray-500">
          <span>
            {resolveEn('helpdesk.sla.firstResponse')}: {formatSlaRemaining(detail.sla_first_response.ms_remaining, detail.sla_first_response.running)}
          </span>
          <span>
            {resolveEn('helpdesk.sla.resolution')}: {formatSlaRemaining(detail.sla_resolution.ms_remaining, detail.sla_resolution.running)}
          </span>
        </div>
        {navs.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {navs.map((n) =>
              n.href ? (
                <a key={n.kind} href={n.href} className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                  {n.label}
                </a>
              ) : (
                <span key={n.kind} className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-400" title={resolveEn('helpdesk.crosslink.pending')}>
                  {n.label}
                </span>
              ),
            )}
          </div>
        )}
      </header>

      {/* The reply thread — role-labelled authors only (never a named individual). */}
      <ol aria-label={resolveEn('helpdesk.detail.thread')} className="flex flex-col gap-2">
        {detail.thread.map((e, i) => (
          <li key={`${e.occurred_at}-${i}`} className="rounded border border-gray-200 p-2">
            <div className="text-xs uppercase text-gray-400">
              {e.author === 'member' ? resolveEn('helpdesk.author.member') : resolveEn('helpdesk.author.staff')}
            </div>
            <div className="whitespace-pre-wrap text-sm">{e.body}</div>
          </li>
        ))}
      </ol>

      {/* ── Story 10.21 — DPDPA fulfilment (a DIFFERENT authority from reply/resolve) ─────────────── */}
      {isDataRightsTicket && (
        <div className="flex flex-col gap-2 rounded border border-amber-300 bg-amber-50 p-3">
          <h2 className="text-sm font-semibold">{resolveEn('helpdesk.dataRights.title')}</h2>
          <p className="text-xs text-gray-700">{resolveEn('helpdesk.dataRights.help')}</p>

          {!canFulfilDataRights && (
            <p role="status" className="text-xs text-gray-600">
              {resolveEn('helpdesk.dataRights.noPermission')}
            </p>
          )}

          {dataRightsError !== undefined && (
            <p role="alert" className="text-red-700">{dataRightsError}</p>
          )}
          {dataRightsNotice !== undefined && (
            <p role="status" className="text-green-800">{dataRightsNotice}</p>
          )}

          {canFulfilDataRights && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  className="w-fit rounded bg-blue-700 px-3 py-1 text-white disabled:opacity-50"
                  disabled={dataRightsPending?.buildExport === true}
                  onClick={onBuildExport}
                  data-testid="helpdesk-datarights-build-export"
                >
                  {dataRightsPending?.buildExport === true
                    ? resolveEn('helpdesk.action.pending')
                    : resolveEn('helpdesk.dataRights.buildExport')}
                </button>
                {/* ⚠ Says plainly that BUILDING is not DELIVERING. Delivery is undecided governance
                    (AC-R1 / Escalation 1), and an operator must not infer from a success message that
                    they may now hand the file over. */}
                <p className="text-xs text-gray-600">{resolveEn('helpdesk.dataRights.buildExportNote')}</p>
              </div>

              <div className="flex flex-col gap-1 border-t border-amber-200 pt-2">
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={erasureConfirmed}
                    onChange={(e) => setErasureConfirmed(e.target.checked)}
                    data-testid="helpdesk-datarights-erasure-confirm"
                  />
                  {resolveEn('helpdesk.dataRights.erasureConfirm')}
                </label>
                <button
                  type="button"
                  className="w-fit rounded bg-red-700 px-3 py-1 text-white disabled:opacity-50"
                  disabled={!erasureConfirmed || dataRightsPending?.erasure === true}
                  onClick={onFulfilErasure}
                  data-testid="helpdesk-datarights-erasure"
                >
                  {dataRightsPending?.erasure === true
                    ? resolveEn('helpdesk.action.pending')
                    : resolveEn('helpdesk.dataRights.erasure')}
                </button>
                <p className="text-xs text-gray-600">{resolveEn('helpdesk.dataRights.erasureNote')}</p>
              </div>

              {/* ── AC-R1 DELIVERY. ⛔ PRIMARY first and prominent; the fallback is visually and
                  textually subordinate, because it IS subordinate. */}
              <div className="flex flex-col gap-1 border-t border-amber-200 pt-2">
                <button
                  type="button"
                  className="w-fit rounded bg-blue-700 px-3 py-1 text-white disabled:opacity-50"
                  disabled={deliveryPending?.memberDirect === true}
                  onClick={onDeliverMemberDirect}
                  data-testid="helpdesk-datarights-deliver"
                >
                  {deliveryPending?.memberDirect === true
                    ? resolveEn('helpdesk.action.pending')
                    : resolveEn('helpdesk.dataRights.deliver')}
                </button>
                <p className="text-xs text-gray-600">{resolveEn('helpdesk.dataRights.deliverNote')}</p>
              </div>

              <details className="rounded border border-gray-300 bg-white p-2">
                {/* ⛔ Collapsed by default. An operator must actively open the exception rather than
                    meet it as a peer of the primary button. */}
                <summary className="cursor-pointer text-xs font-medium">
                  {resolveEn('helpdesk.dataRights.fallbackTitle')}
                </summary>
                <div className="flex flex-col gap-1 pt-2">
                  <p className="text-xs text-gray-700">{resolveEn('helpdesk.dataRights.fallbackNote')}</p>
                  <label className="text-xs" htmlFor="helpdesk-datarights-attestation">
                    {resolveEn('helpdesk.dataRights.fallbackAttestation')}
                  </label>
                  <textarea
                    id="helpdesk-datarights-attestation"
                    className="rounded border border-gray-300 p-2 text-sm"
                    rows={2}
                    value={attestation}
                    onChange={(e) => setAttestation(e.target.value)}
                    data-testid="helpdesk-datarights-attestation"
                  />
                  <button
                    type="button"
                    className="w-fit rounded border border-red-700 px-3 py-1 text-red-700 disabled:opacity-50"
                    disabled={attestation.trim() === '' || deliveryPending?.staffMediated === true}
                    onClick={() => onDeliverStaffMediated?.(attestation.trim())}
                    data-testid="helpdesk-datarights-fallback"
                  >
                    {deliveryPending?.staffMediated === true
                      ? resolveEn('helpdesk.action.pending')
                      : resolveEn('helpdesk.dataRights.fallback')}
                  </button>
                  {/* ⚠ States the server-side precondition in plain words so a refusal is not a
                      mystery. ⛔ The UI does NOT evaluate it — the server observes it. */}
                  <p className="text-xs text-gray-500">{resolveEn('helpdesk.dataRights.fallbackBlocked')}</p>
                </div>
              </details>

              {/* ── AC-R2 CORRECTION. ⛔ A RECORD, not a member-profile editor. */}
              <details className="rounded border border-gray-300 bg-white p-2">
                <summary className="cursor-pointer text-xs font-medium">
                  {resolveEn('helpdesk.dataRights.correctionTitle')}
                </summary>
                <div className="flex flex-col gap-1 pt-2">
                  <p className="text-xs text-gray-700">{resolveEn('helpdesk.dataRights.correctionNote')}</p>
                  <label className="text-xs" htmlFor="helpdesk-correction-requested">
                    {resolveEn('helpdesk.dataRights.correctionRequested')}
                  </label>
                  <textarea
                    id="helpdesk-correction-requested"
                    className="rounded border border-gray-300 p-2 text-sm"
                    rows={2}
                    value={correctionRequested}
                    onChange={(e) => setCorrectionRequested(e.target.value)}
                    data-testid="helpdesk-correction-requested"
                  />
                  <label className="text-xs" htmlFor="helpdesk-correction-action">
                    {resolveEn('helpdesk.dataRights.correctionAction')}
                  </label>
                  <textarea
                    id="helpdesk-correction-action"
                    className="rounded border border-gray-300 p-2 text-sm"
                    rows={2}
                    value={correctionAction}
                    onChange={(e) => setCorrectionAction(e.target.value)}
                    data-testid="helpdesk-correction-action"
                  />
                  <label className="text-xs" htmlFor="helpdesk-correction-outcome">
                    {resolveEn('helpdesk.dataRights.correctionOutcome')}
                  </label>
                  <select
                    id="helpdesk-correction-outcome"
                    className="w-fit rounded border px-2 py-1 text-sm"
                    value={correctionOutcome}
                    onChange={(e) => setCorrectionOutcome(e.target.value as typeof correctionOutcome)}
                    data-testid="helpdesk-correction-outcome"
                  >
                    <option value="applied">applied</option>
                    <option value="recorded">recorded</option>
                    <option value="declined">declined</option>
                  </select>
                  <button
                    type="button"
                    className="w-fit rounded bg-blue-700 px-3 py-1 text-white disabled:opacity-50"
                    disabled={
                      correctionRequested.trim() === '' ||
                      correctionAction.trim() === '' ||
                      correctionPending === true
                    }
                    onClick={() =>
                      onRecordCorrection?.({
                        requestedChange: correctionRequested.trim(),
                        actionTaken: correctionAction.trim(),
                        outcome: correctionOutcome,
                      })
                    }
                    data-testid="helpdesk-correction-submit"
                  >
                    {correctionPending === true
                      ? resolveEn('helpdesk.action.pending')
                      : resolveEn('helpdesk.dataRights.correctionSubmit')}
                  </button>
                </div>
              </details>
            </div>
          )}
        </div>
      )}

      {/* Actions — hidden when illegal for the current state (the API also guards). */}
      <div className="flex flex-col gap-2 border-t pt-3">
        {actionError !== undefined && <p role="alert" className="text-red-700">{actionError}</p>}
        {canPickUp && (
          <button type="button" className="w-fit rounded bg-blue-700 px-3 py-1 text-white disabled:opacity-50" disabled={pending.pickUp} onClick={onPickUp}>
            {pending.pickUp ? resolveEn('helpdesk.action.pending') : resolveEn('helpdesk.action.pickUp')}
          </button>
        )}
        {(canAwait || canResolve) && (
          <div className="flex flex-col gap-2">
            <label className="text-sm" htmlFor="helpdesk-reply-message">
              {resolveEn('helpdesk.action.messageLabel')}
            </label>
            <textarea
              id="helpdesk-reply-message"
              className="rounded border border-gray-300 p-2 text-sm"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={resolveEn('helpdesk.action.messagePlaceholder')}
            />
            <div className="flex gap-2">
              {canAwait && (
                <button
                  type="button"
                  className="rounded border border-blue-700 px-3 py-1 text-blue-700 disabled:opacity-50"
                  disabled={!messageReady || pending.reply}
                  onClick={() => onReply(message.trim())}
                >
                  {pending.reply ? resolveEn('helpdesk.action.pending') : resolveEn('helpdesk.action.reply')}
                </button>
              )}
              {canResolve && (
                <button
                  type="button"
                  className="rounded bg-green-700 px-3 py-1 text-white disabled:opacity-50"
                  disabled={!messageReady || pending.resolve}
                  onClick={() => onResolve(message.trim())}
                >
                  {pending.resolve ? resolveEn('helpdesk.action.pending') : resolveEn('helpdesk.action.resolve')}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
