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
  type ModerationAction,
  type ModerationHistoryResponse,
  type ReasonCode,
  type ReasonCodeMetaDto,
} from '@twt/contracts';
import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';

import { moderationEn as t } from './i18n-en.js';

/** Max rationale length — mirrors the contracts DTO's `.max(4_000)`. */
export const MODERATION_RATIONALE_MAX_CHARS = 4_000;

export interface ModerationSubmit {
  action: ModerationAction;
  reasonCode: ReasonCode;
  rationale: string;
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
}

/** Reason codes valid for an action (the `appliesTo` filter — AC3/AC9), from server metadata. */
export function reasonCodesFor(
  action: ModerationAction,
  reasonCodes: readonly ReasonCodeMetaDto[],
): readonly ReasonCode[] {
  return reasonCodes.filter((m) => m.applies_to.includes(action)).map((m) => m.code);
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
}: ModerationStripProps): ReactElement {
  const [action, setAction] = useState<ModerationAction | null>(null);
  const [reasonCode, setReasonCode] = useState<ReasonCode | ''>('');
  const [rationale, setRationale] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [pending, setPending] = useState<ModerationAction | null>(null);
  const cancelRef = useRef<HTMLButtonElement | null>(null);

  const legal = new Set<ModerationAction>(moderation.legal_actions);

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
    setValidationError(null);
    setPending(action);
  };

  /** The modal's Confirm — fires the write. Always closes so a rejection reveals the error below. */
  const confirm = async (): Promise<void> => {
    if (pending === null || reasonCode === '') return;
    try {
      await onSubmit({ action: pending, reasonCode, rationale: rationale.trim() });
      // Cleared only on success — a failed submit keeps the operator's typed rationale.
      setAction(null);
      setReasonCode('');
      setRationale('');
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
              maxLength={MODERATION_RATIONALE_MAX_CHARS}
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
}: {
  entries: ModerationHistoryResponse['entries'];
  reasonCodes: readonly ReasonCodeMetaDto[];
}): ReactElement {
  if (entries.length === 0) {
    return (
      <p className="text-sm opacity-70" data-testid="moderation-history-empty">
        {t.historyEmpty}
      </p>
    );
  }
  return (
    <ol
      aria-label={t.historyHeading}
      data-testid="moderation-history"
      className="flex flex-col gap-1 text-sm"
    >
      {entries.map((e) => (
        <li key={e.moderation_action_id} className="rounded border p-2">
          <span className="font-semibold">{t.status[actionToStatus(e.action)]}</span>{' '}
          <span className="opacity-70">— {reasonCodeLabel(e.reason_code, reasonCodes)}</span>
          <div className="text-xs opacity-60">
            {e.actor_display} · {new Date(e.acted_at).toLocaleString()}
            {e.rejoin_permitted_at
              ? ` · ${t.rejoinPermitted} ${new Date(e.rejoin_permitted_at).toLocaleDateString()}`
              : ''}
          </div>
        </li>
      ))}
    </ol>
  );
}

/** History rows record the ACTION taken; label it with the standing that action produced. */
function actionToStatus(action: ModerationAction): 'none' | 'suspended' | 'terminated' {
  if (action === 'suspend') return 'suspended';
  if (action === 'terminate') return 'terminated';
  return 'none';
}
