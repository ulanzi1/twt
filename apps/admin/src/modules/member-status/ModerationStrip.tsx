// `<ModerationStrip>` — the member-record moderation surface (Story 10.10, Task 8; AC9).
//
// Extends the EXISTING Story 4.7 member-record module (`ux-design-specification.md:1894` names
// `<MemberStatusPanel>` as the member record). A NEW admin module was rejected: 4.7's lookup + panel
// IS the member-record view, and cross-wiring a sibling admin module is a known failure class
// ([[project_story_validate_footguns]]).
//
// ── The client re-implements NO legality rules ──────────────────────────────────────────────────
// Button enablement comes from the SERVER's `legal_actions`, derived from the same
// `nextModerationStatus` reducer the write path uses. A client-side copy of the four legal arms
// would be a second source of truth that drifts the moment Decision 2 is revisited — and the one
// rule most worth not drifting on is "terminate is legal only from suspended".
//
// ── The reason-code dropdown filters by `appliesTo` ─────────────────────────────────────────────
// From the frozen contracts registry: a restore code is never offered for a suspension, and vice
// versa. The server re-checks with a typed 422 — this is convenience, not the boundary.
//
// ── UX Pattern 2 confirmation modal (`ux-design-specification.md:2312-2322`) ────────────────────
// destructive token · FIRST FOCUS ON CANCEL · ESC dismisses · explicit consequence statement · no
// Enter-key default. The consequence line is action-specific and states what actually happens
// (sessions revoked, rejoin locked 12 months) — never a generic "are you sure?".

import {
  EVIDENCE_REF_KINDS,
  EVIDENCE_REF_PATTERN,
  MODERATION_DECISION_NOTE_MAX_CHARS,
  MODERATION_ESCALATION_MIN_CHARS,
  type EvidenceRefDto,
  type ModerationAction,
  type ModerationHistoryResponse,
  type ReasonCode,
  type ReasonCodeMetaDto,
} from '@twt/contracts';
import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';

import { moderationEn as t } from './i18n-en.js';

// Re-exported, NOT re-declared (review follow-up). This was a hand-copied `4_000` under a comment
// saying it "mirrors the contracts DTO" — a duplication-by-value with no sync-guard, in the very
// component whose earlier review fix was deleting exactly that pattern from the reason-code map.
// It now comes from the contracts DTO itself, so the textarea's cap and the server's `.max()` are
// one number and cannot drift.
export { MODERATION_DECISION_NOTE_MAX_CHARS };

export interface ModerationSubmit {
  action: ModerationAction;
  reasonCode: ReasonCode;
  /** The governance-grade DECISION NOTE (renamed from `rationale` by Story 10.20, AC12). */
  rationale: string;
  // ── Story 10.20 — `terminate` only ────────────────────────────────────────────────────────────
  /** (a) why SUSPENSION is inadequate. */
  escalationInadequacy?: string;
  /** (b) why TERMINATION is proportionate. ⛔ Never derived from (a). */
  escalationProportionality?: string;
  /** References only, never prose (AC4). */
  evidenceRefs?: EvidenceRefDto[];
  /** The recorded reason for invoking the immediate-termination exception (AC8). */
  immediateTerminationReason?: string;
}

/** Normalize for the anti-restatement compare — mirrors the domain's `normalizeEscalationPart`. */
function normalizeForCompare(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

export interface ModerationStripProps {
  /** The member's current standing + server-derived `legal_actions`. */
  moderation: ModerationHistoryResponse;
  /**
   * The frozen reason-code registry (review follow-up — was previously hand-duplicated by value in
   * `i18n-en.ts`, with no server source; now read from `GET …/moderation/reason-codes`, the SAME
   * source the server's `appliesTo` 422 enforces). May be `[]` while the query is loading.
   */
  reasonCodes: readonly ReasonCodeMetaDto[];
  onSubmit: (input: ModerationSubmit) => Promise<void>;
  processing?: boolean;
  error?: string | null;
  /** Rendered when the server answered 403 `auth.step_up_required` — the OTP challenge slot. */
  stepUpSlot?: ReactElement | null;
  /**
   * Increments on EVERY committed action, including one that only landed after a step-up retry
   * (review follow-up).
   *
   * `confirm()` clears the form when its own `onSubmit` resolves, which covers the direct path. It
   * does NOT cover the step-up path: there `onSubmit` THROWS with a 403, and the retry is fired by
   * the parent from the OTP panel's `onSuccess` — so the write commits while this component still
   * shows a fully-populated form, an `aria-pressed` action button and no confirmation. An operator
   * reading that as "not submitted yet" clicks Confirm again; on a restore→suspend sequence the
   * second action is legal and lands. The parent owns the knowledge that a write succeeded, so the
   * parent signals it.
   */
  clearSignal?: number;
}

/** Reason codes valid for an action (the `appliesTo` filter — AC3/AC9), from server metadata. */
export function reasonCodesFor(
  action: ModerationAction,
  reasonCodes: readonly ReasonCodeMetaDto[],
): readonly ReasonCode[] {
  return reasonCodes.filter((m) => m.applies_to.includes(action)).map((m) => m.code);
}

/**
 * ⚖ The Q6-ratified guidance for a code, or `null` when the code carries none (AC10).
 *
 * ⛔ `null` is a FIRST-CLASS ANSWER, not a missing value: on the three restore grounds it means
 * *this code carries no sanction guidance because it justifies no sanction*, and the UI must render
 * NOTHING there — not "n/a", not an empty chip.
 */
export function guidanceFor(
  code: ReasonCode | '',
  reasonCodes: readonly ReasonCodeMetaDto[],
): ModerationAction | null {
  if (code === '') return null;
  return reasonCodes.find((m) => m.code === code)?.ordinarily_results_in ?? null;
}

/** Label a guidance action with the standing it produces, reusing the existing status copy. */
function statusForGuidance(action: ModerationAction): 'none' | 'suspended' | 'terminated' {
  if (action === 'suspend') return 'suspended';
  if (action === 'terminate') return 'terminated';
  return 'none';
}

/** Resolve a code's label from server metadata; a readable fallback (never a raw slug) pre-fetch. */
export function reasonCodeLabel(code: string, reasonCodes: readonly ReasonCodeMetaDto[]): string {
  return reasonCodes.find((m) => m.code === code)?.label ?? code.replace(/-/g, ' ');
}

export function ModerationStrip({
  moderation,
  reasonCodes,
  onSubmit,
  processing,
  error,
  stepUpSlot,
  clearSignal = 0,
}: ModerationStripProps): ReactElement {
  const [action, setAction] = useState<ModerationAction | null>(null);
  const [reasonCode, setReasonCode] = useState<ReasonCode | ''>('');
  const [rationale, setRationale] = useState('');
  // ⛔ TWO INDEPENDENT PIECES OF STATE, and that is the enforcement at this layer. One shared value,
  // or a "copy from (b)" affordance, would let a single paragraph satisfy both halves of a test
  // whose entire point is that they are separately answerable (`epics.md:3851`, D2).
  const [escalationInadequacy, setEscalationInadequacy] = useState('');
  const [escalationProportionality, setEscalationProportionality] = useState('');
  const [evidenceRefs, setEvidenceRefs] = useState<EvidenceRefDto[]>([]);
  const [immediateReason, setImmediateReason] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [pending, setPending] = useState<ModerationAction | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const cancelRef = useRef<HTMLButtonElement | null>(null);

  const clearForm = useCallback((): void => {
    setAction(null);
    setReasonCode('');
    setRationale('');
    setEscalationInadequacy('');
    setEscalationProportionality('');
    setEvidenceRefs([]);
    setImmediateReason('');
    setValidationError(null);
    setConfirmError(null);
    setPending(null);
  }, []);

  // Clear on a parent-signalled commit. `seenClearSignal` starts at the INITIAL value so the first
  // render never fires a spurious clear (which would wipe a form the operator is mid-way through if
  // the component ever remounts with a non-zero signal).
  const seenClearSignal = useRef(clearSignal);
  useEffect(() => {
    if (clearSignal === seenClearSignal.current) return;
    seenClearSignal.current = clearSignal;
    clearForm();
  }, [clearSignal, clearForm]);

  // ⛔ `legal_actions` is the SERVER's, and it is NOT filtered by the dwell (Q4.2) — legality and
  // precondition are different facts. `terminate` therefore stays enabled for the whole dwell
  // window, which is exactly the ruled shape: the control is offered, and the re-confirmation below
  // is what makes taking it INFORMED.
  const legal = new Set<ModerationAction>(moderation.legal_actions);

  /** True while the ordinary termination path has not yet opened (AC8). */
  const dwellOpen =
    moderation.termination_available_at !== null &&
    new Date(moderation.termination_available_at).getTime() > Date.now();

  /** Choose an action — reset a reason code the new action's `appliesTo` does not admit. */
  const chooseAction = useCallback(
    (next: ModerationAction): void => {
      setAction(next);
      setValidationError(null);
      setReasonCode((current) => {
        const meta = reasonCodes.find((m) => m.code === current);
        return current !== '' && !(meta?.applies_to ?? []).includes(next) ? '' : current;
      });
    },
    [reasonCodes],
  );

  // UX Pattern 2: FIRST FOCUS ON CANCEL, and ESC dismisses. Both are what make a destructive modal
  // safe — a reflexive Enter or a mis-aimed click must land on the harmless choice.
  useEffect(() => {
    if (pending === null) return;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setPending(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [pending]);

  /** Validate, then open the confirmation modal. */
  const requestSubmit = (): void => {
    if (action === null) return;
    if (reasonCode === '') {
      setValidationError(t.reasonRequiredError);
      return;
    }
    // The rationale is required on EVERY action (AC3) — deliberately stricter than the UX
    // `<ReasonCodeDropdown>` "other-text-required" state, which asks for text only on an "other"
    // code. A structured code alone cannot explain a suspension to the member who receives it.
    if (rationale.trim() === '') {
      setValidationError(t.rationaleRequiredError);
      return;
    }
    // ── Story 10.20 (AC6) — the two-part escalation test, on `terminate` ONLY ───────────────────
    // ⚠ THIS IS THE THIRD LAYER, NOT THE FIRST. The record's SHAPE is the first (migration 0099's
    // `escalation_iff_terminate` CHECK) and the route guard is the second. Client validation here is
    // for the operator's benefit — it must never be mistaken for the boundary.
    if (action === 'terminate') {
      const a = escalationInadequacy.trim();
      const b = escalationProportionality.trim();
      if (a === '' || b === '') {
        setValidationError(t.escalationRequiredError);
        return;
      }
      if (a.length < MODERATION_ESCALATION_MIN_CHARS || b.length < MODERATION_ESCALATION_MIN_CHARS) {
        setValidationError(t.escalationTooShortError);
        return;
      }
      if (normalizeForCompare(a) === normalizeForCompare(b)) {
        setValidationError(t.escalationRestatementError);
        return;
      }
      // Every reference must be an identifier. ⛔ A prose `ref` is REJECTED, never truncated — a
      // truncation would silently store a prefix of the prose the rule exists to keep out.
      if (evidenceRefs.some((r) => r.ref.trim() === '' || !EVIDENCE_REF_PATTERN.test(r.ref.trim()))) {
        setValidationError(t.evidenceInvalidError);
        return;
      }
    }
    setValidationError(null);
    setPending(action);
  };

  /** The modal's Confirm — fires the write. Always closes so a rejection reveals the error below. */
  const confirm = async (): Promise<void> => {
    if (pending === null || reasonCode === '') return;
    // ⛔ A recorded reason with no substance is not recorded (AC8). The server applies the same floor
    // and is the authority; this keeps the operator from losing the dialog to a 422.
    if (pending === 'terminate' && dwellOpen) {
      const reason = immediateReason.trim();
      if (reason.length < MODERATION_ESCALATION_MIN_CHARS) {
        setConfirmError(t.immediateReasonRequiredError);
        return;
      }
    }
    try {
      const isTerminate = pending === 'terminate';
      await onSubmit({
        action: pending,
        reasonCode,
        rationale: rationale.trim(),
        // ⛔ The escalation parts, the evidence and the exception reason ride a TERMINATION only —
        // on any other action they describe something that did not happen, and the server 422s them.
        ...(isTerminate
          ? {
              escalationInadequacy: escalationInadequacy.trim(),
              escalationProportionality: escalationProportionality.trim(),
              ...(evidenceRefs.length > 0
                ? { evidenceRefs: evidenceRefs.map((r) => ({ ...r, ref: r.ref.trim() })) }
                : {}),
              ...(immediateReason.trim() !== ''
                ? { immediateTerminationReason: immediateReason.trim() }
                : {}),
            }
          : {}),
      });
      // Cleared on the DIRECT success path. The step-up path throws here and is cleared by
      // `clearSignal` once the parent's retry commits — see the prop's note.
      clearForm();
    } catch {
      // Swallowed: the caller's mutation hook tracks the failure and feeds it back via `error`.
    } finally {
      setPending(null);
    }
  };

  const ACTIONS: readonly { action: ModerationAction; label: string; destructive: boolean }[] = [
    { action: 'suspend', label: t.suspend, destructive: true },
    { action: 'terminate', label: t.terminate, destructive: true },
    { action: 'restore', label: t.restore, destructive: false },
  ];

  return (
    <section
      aria-label={t.heading}
      data-testid="moderation-strip"
      className="flex flex-col gap-3 rounded border p-4"
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">{t.heading}</h2>
        <span
          data-testid="moderation-current-status"
          className={`rounded border px-2 py-0.5 text-xs font-semibold ${
            moderation.current_status === 'none'
              ? 'border-gray-300 bg-gray-100 text-gray-700'
              : 'border-status-fail-border bg-status-fail-bg text-status-fail-fg'
          }`}
        >
          {t.status[moderation.current_status]}
          {moderation.current_reason_code
            ? ` — ${reasonCodeLabel(moderation.current_reason_code, reasonCodes)}`
            : ''}
        </span>
      </header>

      <div className="flex flex-wrap gap-2" role="group" aria-label={t.heading}>
        {ACTIONS.map((a) => (
          <button
            key={a.action}
            type="button"
            data-testid={`moderation-action-${a.action}`}
            // Enabled ONLY when the SERVER says the transition is legal. `terminate` on an
            // unmoderated member is disabled here for the same reason the server 409s it: FR-56
            // routes termination through suspension (Decision 2).
            disabled={!legal.has(a.action) || processing}
            aria-pressed={action === a.action}
            title={legal.has(a.action) ? undefined : t.illegalHint}
            className={`rounded px-3 py-1 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${
              a.destructive
                ? 'bg-status-fail-bg text-status-fail-fg'
                : 'bg-status-ok-bg text-status-ok-fg'
            }`}
            onClick={() => chooseAction(a.action)}
          >
            {a.label}
          </button>
        ))}
      </div>

      {action !== null && (
        <div className="flex flex-col gap-2" data-testid="moderation-form">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" htmlFor="moderation-reason-code">
              {t.reasonLabel}
              <span aria-hidden> *</span>
            </label>
            <select
              id="moderation-reason-code"
              data-testid="moderation-reason-code"
              className="rounded border p-1 text-sm"
              value={reasonCode}
              disabled={processing}
              onChange={(e) => {
                setReasonCode(e.target.value as ReasonCode | '');
                setValidationError(null);
              }}
            >
              <option value="">{t.reasonPlaceholder}</option>
              {/* Filtered by `appliesTo` — a restore code is never offered for a suspension. */}
              {reasonCodesFor(action, reasonCodes).map((c) => (
                <option key={c} value={c}>
                  {reasonCodeLabel(c, reasonCodes)}
                </option>
              ))}
            </select>
            {validationError === t.reasonRequiredError && (
              <p className="text-xs text-status-fail-fg" role="alert" data-testid="moderation-reason-error">
                {validationError}
              </p>
            )}
            {/*
              ⚖ Q6-ratified GUIDANCE (AC10). ⛔ Rendered as TEXT ONLY — never a default selection, a
              pre-selected action, a severity score or a recommendation: FR-57's prohibition is a
              prohibition ON THE DECISION MOVING, and a pre-selected sanction moves it.
              ⛔ Rendered ONLY where the value is non-null. On the three restore grounds it is `null`
              — a code that justifies no sanction carries no sanction guidance — and NOTHING is
              rendered there: not "n/a", not an empty chip.
            */}
            {guidanceFor(reasonCode, reasonCodes) !== null && (
              <p className="text-xs opacity-60" data-testid="moderation-reason-guidance">
                {t.guidancePrefix}: {t.status[statusForGuidance(guidanceFor(reasonCode, reasonCodes)!)]}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" htmlFor="moderation-rationale">
              {t.rationaleLabel}
              <span aria-hidden> *</span>
            </label>
            <textarea
              id="moderation-rationale"
              data-testid="moderation-rationale"
              className="rounded border p-1 text-sm"
              maxLength={MODERATION_DECISION_NOTE_MAX_CHARS}
              placeholder={t.rationalePlaceholder}
              value={rationale}
              disabled={processing}
              aria-describedby="moderation-rationale-note"
              onChange={(e) => {
                setRationale(e.target.value);
                setValidationError(null);
              }}
            />
            <p id="moderation-rationale-note" className="text-xs opacity-60">
              {t.rationaleEncryptedNote}
            </p>
            {validationError === t.rationaleRequiredError && (
              <p
                className="text-xs text-status-fail-fg"
                role="alert"
                data-testid="moderation-rationale-error"
              >
                {validationError}
              </p>
            )}
          </div>

          {/*
            ── Story 10.20 (AC6) — the two-part escalation justification, `terminate` ONLY ────────
            ⛔ TWO SEPARATE CONTROLS with no copy-across affordance and no shared state. `epics.md`
            requires the parts be separately answerable and neither pre-filled from the other, and a
            single control (or a "same as above" button) defeats that at the layer the operator
            actually touches. Pinned by a RENDER test, not only a view-model test — the
            `epics.md:3729` finding against Story 10.10 was that "AC9's prose reached nobody because
            tests asserted the view-model and never the render".
          */}
          {action === 'terminate' && (
            <fieldset
              className="flex flex-col gap-2 rounded border p-2"
              data-testid="moderation-escalation"
            >
              <legend className="px-1 text-xs font-semibold">{t.escalationHeading}</legend>
              <p className="text-xs opacity-70">{t.escalationIntro}</p>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" htmlFor="moderation-escalation-inadequacy">
                  {t.escalationInadequacyLabel}
                  <span aria-hidden> *</span>
                </label>
                <textarea
                  id="moderation-escalation-inadequacy"
                  data-testid="moderation-escalation-inadequacy"
                  className="rounded border p-1 text-sm"
                  maxLength={MODERATION_DECISION_NOTE_MAX_CHARS}
                  placeholder={t.escalationInadequacyPlaceholder}
                  value={escalationInadequacy}
                  disabled={processing}
                  onChange={(e) => {
                    setEscalationInadequacy(e.target.value);
                    setValidationError(null);
                  }}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label
                  className="text-xs font-medium"
                  htmlFor="moderation-escalation-proportionality"
                >
                  {t.escalationProportionalityLabel}
                  <span aria-hidden> *</span>
                </label>
                <textarea
                  id="moderation-escalation-proportionality"
                  data-testid="moderation-escalation-proportionality"
                  className="rounded border p-1 text-sm"
                  maxLength={MODERATION_DECISION_NOTE_MAX_CHARS}
                  placeholder={t.escalationProportionalityPlaceholder}
                  value={escalationProportionality}
                  disabled={processing}
                  onChange={(e) => {
                    setEscalationProportionality(e.target.value);
                    setValidationError(null);
                  }}
                />
              </div>
            </fieldset>
          )}

          {/*
            ── Story 10.20 (AC4) — evidence REFERENCES ───────────────────────────────────────────
            ⛔ NOT a free-text evidence box. Each row is a bounded `kind` plus a restricted-charset
            `ref`, so prose is UNREPRESENTABLE rather than merely discouraged.
          */}
          {action === 'terminate' && (
            <fieldset className="flex flex-col gap-2 rounded border p-2" data-testid="moderation-evidence">
              <legend className="px-1 text-xs font-semibold">{t.evidenceHeading}</legend>
              <p className="text-xs opacity-70">{t.evidenceIntro}</p>
              {evidenceRefs.map((row, i) => (
                <div key={i} className="flex flex-wrap items-end gap-2">
                  <label className="sr-only" htmlFor={`moderation-evidence-kind-${i}`}>
                    {t.evidenceKindLabel}
                  </label>
                  <select
                    id={`moderation-evidence-kind-${i}`}
                    data-testid={`moderation-evidence-kind-${i}`}
                    className="rounded border p-1 text-sm"
                    value={row.kind}
                    disabled={processing}
                    onChange={(e) => {
                      const kind = e.target.value as EvidenceRefDto['kind'];
                      setEvidenceRefs((prev) => prev.map((r, j) => (j === i ? { ...r, kind } : r)));
                      setValidationError(null);
                    }}
                  >
                    {EVIDENCE_REF_KINDS.map((k) => (
                      <option key={k} value={k}>
                        {t.evidenceKinds[k] ?? k}
                      </option>
                    ))}
                  </select>
                  <label className="sr-only" htmlFor={`moderation-evidence-ref-${i}`}>
                    {t.evidenceRefLabel}
                  </label>
                  <input
                    id={`moderation-evidence-ref-${i}`}
                    data-testid={`moderation-evidence-ref-${i}`}
                    className="rounded border p-1 text-sm"
                    placeholder={t.evidenceRefPlaceholder}
                    value={row.ref}
                    disabled={processing}
                    onChange={(e) => {
                      const ref = e.target.value;
                      setEvidenceRefs((prev) => prev.map((r, j) => (j === i ? { ...r, ref } : r)));
                      setValidationError(null);
                    }}
                  />
                  <button
                    type="button"
                    data-testid={`moderation-evidence-remove-${i}`}
                    className="rounded border px-2 py-1 text-xs"
                    disabled={processing}
                    onClick={() => setEvidenceRefs((prev) => prev.filter((_, j) => j !== i))}
                  >
                    {t.evidenceRemove}
                  </button>
                </div>
              ))}
              <button
                type="button"
                data-testid="moderation-evidence-add"
                className="self-start rounded border px-2 py-1 text-xs"
                disabled={processing}
                onClick={() => setEvidenceRefs((prev) => [...prev, { kind: 'complaint', ref: '' }])}
              >
                {t.evidenceAdd}
              </button>
            </fieldset>
          )}

          {/*
            The FORM-LEVEL validation message. The reason-code and Decision Note errors render
            beside their own fields above; the escalation and evidence errors belong to a GROUP of
            controls rather than to any single one, so they render here.
            ⚠ Without this site the escalation errors were set into state and displayed NOWHERE — the
            operator saw a submit that silently did nothing. Caught by a RENDER test, which is
            exactly the failure mode `epics.md:3729` records: a view-model assertion would have
            passed, because the state was being set correctly all along.
          */}
          {validationError !== null &&
            validationError !== t.reasonRequiredError &&
            validationError !== t.rationaleRequiredError && (
              <p
                className="text-xs text-status-fail-fg"
                role="alert"
                data-testid="moderation-validation-error"
              >
                {validationError}
              </p>
            )}

          <button
            type="button"
            data-testid="moderation-submit"
            className="self-start rounded bg-accent px-3 py-1 text-sm font-semibold text-white"
            disabled={processing}
            onClick={requestSubmit}
          >
            {processing ? t.processing : t.submit}
          </button>

          {error && (
            <p className="text-xs text-status-fail-fg" role="alert" data-testid="moderation-error">
              {error}
            </p>
          )}
          {stepUpSlot}
        </div>
      )}

      {/* UX Pattern 2 confirmation modal. */}
      {pending !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t.confirmTitle}
          className="fixed inset-0 z-10 flex items-center justify-center bg-black/40"
          data-testid="moderation-confirm-modal"
        >
          <div className="flex max-w-sm flex-col gap-3 rounded border border-status-fail-border bg-white p-4">
            <h3 className="text-sm font-bold">{t.confirmTitle}</h3>
            {/* The EXPLICIT consequence statement — never a generic "are you sure?". */}
            <p className="text-sm" data-testid="moderation-confirm-consequence">
              {t.consequence[pending]}
            </p>

            {/*
              ── Story 10.20 (AC8/AC12) — THE RULED CONSOLE SHAPE (Q4.2) ──────────────────────────
              A THIRD shape, neither of the two the routing note offered. During the seven-day dwell
              the Terminate control stays VISIBLE AND ENABLED — ⛔ it is NOT disabled until day 7 —
              and selecting it opens THIS re-confirmation, which states that the dwell is still open
              and that the actor is invoking the immediate-termination route. Not a generic "are you
              sure".
              ⛔ THE DIALOG OBTAINS INFORMED INTENT; IT DOES NOT GRANT AUTHORITY. The server decides
              whether the immediate route is permitted — a client that treats its own confirmation as
              the authorisation has reimplemented the gate in the one place the Trust does not
              control. That is why the reason is COLLECTED here and VALIDATED there.
            */}
            {pending === 'terminate' && dwellOpen && (
              <div className="flex flex-col gap-2" data-testid="moderation-dwell-warning">
                <p className="text-sm font-semibold">{t.dwellOpenHeading}</p>
                <p className="text-xs">
                  {t.dwellOpenBody.replace(
                    '{date}',
                    new Date(moderation.termination_available_at!).toLocaleString(),
                  )}
                </p>
                <label className="text-xs font-medium" htmlFor="moderation-immediate-reason">
                  {t.immediateReasonLabel}
                  <span aria-hidden> *</span>
                </label>
                <textarea
                  id="moderation-immediate-reason"
                  data-testid="moderation-immediate-reason"
                  className="rounded border p-1 text-sm"
                  maxLength={MODERATION_DECISION_NOTE_MAX_CHARS}
                  placeholder={t.immediateReasonPlaceholder}
                  value={immediateReason}
                  disabled={processing}
                  onChange={(e) => {
                    setImmediateReason(e.target.value);
                    setConfirmError(null);
                  }}
                />
                <p className="text-xs opacity-70">{t.dwellServerAuthoritative}</p>
                {confirmError !== null && (
                  <p
                    className="text-xs text-status-fail-fg"
                    role="alert"
                    data-testid="moderation-confirm-error"
                  >
                    {confirmError}
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                ref={cancelRef}
                type="button"
                data-testid="moderation-confirm-cancel"
                className="rounded border px-3 py-1 text-sm"
                disabled={processing}
                onClick={() => setPending(null)}
              >
                {t.confirmCancel}
              </button>
              <button
                type="button"
                data-testid="moderation-confirm-submit"
                className="rounded bg-status-fail-bg px-3 py-1 text-sm font-semibold text-status-fail-fg"
                disabled={processing}
                onClick={() => void confirm()}
              >
                {processing ? t.processing : t.confirmYes}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/**
 * The read-only moderation history (AC9). Action · reason · actor_display · date.
 * ⚠ The rationale CIPHERTEXT is never rendered — the list DTO does not even carry it.
 */
export function ModerationHistory({
  entries,
  reasonCodes,
  hasMore = false,
  onRevealRationale,
  revealedRationales = {},
  revealingId = null,
  revealError = null,
}: {
  entries: ModerationHistoryResponse['entries'];
  reasonCodes: readonly ReasonCodeMetaDto[];
  /** True when older actions exist beyond this page — an audit trail must say so. */
  hasMore?: boolean;
  /** Decrypt ONE action's rationale on demand. Absent ⇒ the reveal affordance is not rendered. */
  onRevealRationale?: (moderationActionId: string) => void;
  /** Already-revealed rationales by action id. A `null` value means "envelope unreadable". */
  revealedRationales?: Record<string, string | null>;
  revealingId?: string | null;
  revealError?: string | null;
}): ReactElement {
  if (entries.length === 0) {
    return (
      <p className="text-sm opacity-70" data-testid="moderation-history-empty">
        {t.historyEmpty}
      </p>
    );
  }
  return (
    <>
      <ol
        aria-label={t.historyHeading}
        data-testid="moderation-history"
        className="flex flex-col gap-1 text-sm"
      >
        {entries.map((e) => {
          const isRevealed = e.moderation_action_id in revealedRationales;
          const rationale = revealedRationales[e.moderation_action_id];
          return (
            <li key={e.moderation_action_id} className="rounded border p-2">
              <span className="font-semibold">{t.status[actionToStatus(e.action)]}</span>{' '}
              <span className="opacity-70">— {reasonCodeLabel(e.reason_code, reasonCodes)}</span>
              <div className="text-xs opacity-60">
                {e.actor_display} · {new Date(e.acted_at).toLocaleString()}
                {e.rejoin_permitted_at
                  ? ` · ${t.rejoinPermitted} ${new Date(e.rejoin_permitted_at).toLocaleDateString()}`
                  : ''}
              </div>
              {/*
                ── Story 10.20 (AC9) — the GROUNDS behind this action ──────────────────────────
                Primary first, then supporting in append order. ⛔ SUPERSEDED grounds are RENDERED
                AND FLAGGED, never hidden — an audit trail that hides what was superseded is not an
                audit trail, and on a contested member the superseded ground is often precisely the
                one under dispute.
                ⚠ `has_note` only. The ground note is Tier-1 and stays decrypt-on-demand, exactly
                like the Decision Note — three new Tier-1 fields must not become three new list
                columns.
              */}
              {e.grounds.length > 0 && (
                <ul
                  className="mt-1 flex flex-col gap-0.5 text-xs"
                  data-testid={`moderation-grounds-${e.moderation_action_id}`}
                >
                  {e.grounds.map((g) => (
                    <li
                      key={g.ground_id}
                      data-testid={`moderation-ground-${g.ground_id}`}
                      className={g.superseded ? 'opacity-60 line-through' : undefined}
                    >
                      {reasonCodeLabel(g.code, reasonCodes)}
                      {g.is_primary ? ` (${t.groundPrimary})` : ''}
                      {g.superseded ? ` — ${t.groundSuperseded}` : ''}
                      {g.supersedes_ground_id !== null ? ` — ${t.groundSupersedes}` : ''}
                      {g.has_note ? ` · ${t.groundHasNote}` : ''}
                      {g.evidence_refs.length > 0
                        ? ` · ${t.evidenceLabel}: ${g.evidence_refs.map((r) => r.ref).join(', ')}`
                        : ''}
                    </li>
                  ))}
                </ul>
              )}
              {/* The action's OWN evidence references — identifiers, safe to render in a list. */}
              {e.evidence_refs.length > 0 && (
                <div
                  className="mt-1 text-xs opacity-70"
                  data-testid={`moderation-evidence-${e.moderation_action_id}`}
                >
                  {t.evidenceLabel}: {e.evidence_refs.map((r) => `${r.kind} ${r.ref}`).join(', ')}
                </div>
              )}
              {/*
                The Decision Note is NOT rendered with the row — it is Tier-1 PII and is decrypted only
                when an operator explicitly asks. What is shown is the DECRYPTED plaintext; the
                ciphertext never reaches this component at all (the list DTO has no such field).
              */}
              {onRevealRationale !== undefined &&
                (isRevealed ? (
                  <p
                    className="mt-1 whitespace-pre-wrap rounded bg-black/5 p-2 text-xs"
                    data-testid={`moderation-rationale-${e.moderation_action_id}`}
                  >
                    {rationale === null || rationale === undefined
                      ? t.rationaleUnreadable
                      : rationale}
                  </p>
                ) : (
                  <button
                    type="button"
                    className="mt-1 text-xs underline opacity-80"
                    data-testid={`moderation-reveal-${e.moderation_action_id}`}
                    disabled={revealingId === e.moderation_action_id}
                    onClick={() => onRevealRationale(e.moderation_action_id)}
                  >
                    {revealingId === e.moderation_action_id
                      ? t.processing
                      : t.revealRationale}
                  </button>
                ))}
            </li>
          );
        })}
      </ol>
      {revealError !== null && (
        <p role="alert" className="mt-2 text-xs text-status-fail-fg" data-testid="moderation-reveal-error">
          {revealError}
        </p>
      )}
      {/*
        An audit trail that is cut MUST say it is cut. Silently showing the newest page as if it
        were the whole record hides exactly the oldest entry — typically the ORIGINAL decision a
        dispute is about.
      */}
      {hasMore && (
        <p className="mt-2 text-xs opacity-70" data-testid="moderation-history-truncated">
          {t.historyTruncated}
        </p>
      )}
    </>
  );
}

/** History rows record the ACTION taken; label it with the standing that action produced. */
function actionToStatus(action: ModerationAction): 'none' | 'suspended' | 'terminated' {
  if (action === 'suspend') return 'suspended';
  if (action === 'terminate') return 'terminated';
  return 'none';
}
