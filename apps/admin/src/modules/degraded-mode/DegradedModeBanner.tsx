// Degraded-mode status banner (Story 5.8, Task 6; AC4 #10, §4.10).
//
// Mirror audit-integrity/StatusBanner.tsx: while degraded mode is ACTIVE, a visible WARNING banner
// (`role="alert"` + `aria-live="assertive"` — a security-critical state must interrupt the screen reader)
// showing the mode / effective-from / expires-at (or "until revoked") / reason + a Revoke action. The
// inactive state renders a muted/polite (`role="status"` + `aria-live="polite"`) "no active degraded mode".

import type { DegradedModeDeclarationResponse } from '@twt/contracts';
import type { ReactElement } from 'react';

import { BRIDGE_TEXT_PARAGRAPH, BRIDGE_TEXT_TEMPLATE_CAVEAT, BRIDGE_TEXTS_SWITCHED_OFF } from './bridge-copy.js';

function Field({ label, value }: { label: string; value: string | null }): ReactElement {
  return (
    <div className="flex flex-col">
      <dt className="text-xs uppercase tracking-wide opacity-70">{label}</dt>
      <dd className="font-mono text-sm break-all">{value ?? '—'}</dd>
    </div>
  );
}

export interface DegradedModeBannerProps {
  active: DegradedModeDeclarationResponse | null;
  /** Story 5.8b (AC12) — the Trust-wide switch: `true` ON, `false` OFF, `null` not (yet) read. */
  bridgeTextsOn: boolean | null;
  onRevoke: (id: string) => void;
  revokePending: boolean;
  revokeError?: string;
}

export function DegradedModeBanner({
  active,
  bridgeTextsOn,
  onRevoke,
  revokePending,
  revokeError,
}: DegradedModeBannerProps): ReactElement {
  if (!active) {
    return (
      <div
        className="rounded border border-status-muted-fg/20 bg-status-muted-bg p-4 text-status-muted-fg"
        aria-live="polite"
        role="status"
        data-testid="degraded-mode-banner"
        data-status="inactive"
      >
        No active degraded mode — the normal channel ladder and cost-optimization apply.
      </div>
    );
  }

  return (
    <div
      className="rounded border-l-4 border-status-fail-border bg-status-fail-bg p-4 text-status-fail-fg"
      role="alert"
      aria-live="assertive"
      data-testid="degraded-mode-banner"
      data-status="active"
    >
      {/* Story 5.8b — "armed" only while the Super Admin switch is ON (FS17 (a)); OFF says so. Code review 2026-10-28 (second pass),
          Decision 1 (b): "armed" never stands alone — FS11 (a)'s own template caveat goes with it (⛔ new words). */}
      {bridgeTextsOn === true ? (
        <p className="text-lg font-bold" data-testid="degraded-mode-banner-headline">
          ⚠ Degraded mode ACTIVE — the cycle-open SMS bridge is armed — {BRIDGE_TEXT_TEMPLATE_CAVEAT}.
        </p>
      ) : bridgeTextsOn === false ? (
        <p className="text-lg font-bold" data-testid="degraded-mode-banner-headline">
          ⚠ Degraded mode ACTIVE — {BRIDGE_TEXTS_SWITCHED_OFF}.
        </p>
      ) : (
        <p className="text-lg font-bold" data-testid="degraded-mode-banner-headline">⚠ Degraded mode ACTIVE.</p>
      )}
      {/* Story 5.8b (FS11 (a)) replaced the AR-20 force-SMS sentence with what is built. */}
      <p className="mt-1 text-sm" data-testid="degraded-mode-banner-copy">
        {BRIDGE_TEXT_PARAGRAPH}
      </p>
      <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Mode" value={active.mode} />
        <Field label="Effective from" value={active.effectiveFrom} />
        <Field label="Expires at" value={active.expiresAt ?? 'until revoked'} />
        <Field label="Reason" value={active.reason} />
      </dl>
      <button
        type="button"
        onClick={() => onRevoke(active.id)}
        disabled={revokePending}
        aria-busy={revokePending}
        className="mt-3 rounded bg-black px-4 py-2 text-white disabled:opacity-60"
        data-testid="degraded-mode-revoke"
      >
        {revokePending ? 'Revoking…' : 'Revoke degraded mode'}
      </button>
      {revokeError && <p role="alert" className="mt-2 text-sm text-status-fail-fg">{revokeError}</p>}
    </div>
  );
}
