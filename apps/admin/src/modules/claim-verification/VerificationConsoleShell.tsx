// `<VerificationConsoleShell>` — the UX-DR39 single-scroll verifier-console anatomy (Story 6.10,
// Task 4; AC2/AC3/AC6). Pure presentational + READ-ONLY: opening the console mutates NOTHING.
//
// Anatomy (top → bottom):
//   · scope chrome (the active Pariwar + switcher) — passed in as `scopeChrome`;
//   · a header with the claim id + deceased member + claim state + a "read-only" badge;
//   · the signals panel (sections (a)–(f)) — passed in as `children`;
//   · a STICKY-BOTTOM SLOT for Story 6.11's `<VerificationDecisionStrip>` — a COMPOSITION SEAM only
//     (`decisionSlot`). 6.10 renders it EMPTY/INERT (the AR-61 escalation affordance + the approve/
//     deny/escalate controls are Story 6.11/6.12). Rendering the slot never emits a lifecycle event.
//
// a11y (architecture §4.10 compound-view semantic structure): declared landmark regions (banner/main/
// contentinfo), a heading hierarchy without skips, and a skip-link to the decision slot.

import type { ReactElement, ReactNode } from 'react';

import { verifierConsoleEn as t } from './i18n-en.js';

export interface VerificationConsoleShellProps {
  claimCaseId: string;
  deceasedMemberName: string | null;
  claimState: string;
  /** The scope chrome (`<ScopeChrome>`), rendered as the banner region. */
  scopeChrome: ReactNode;
  /** The signals panel (sections (a)–(f)). */
  children: ReactNode;
  /**
   * The sticky-bottom decision-strip slot — Story 6.11's `<VerificationDecisionStrip>` mounts here.
   * A COMPOSITION SEAM only: 6.10 passes nothing (an inert empty slot). Never wire an adjudication
   * control here in 6.10.
   */
  decisionSlot?: ReactNode;
}

const DECISION_SLOT_ID = 'verification-decision-slot';

export function VerificationConsoleShell({
  claimCaseId,
  deceasedMemberName,
  claimState,
  scopeChrome,
  children,
  decisionSlot,
}: VerificationConsoleShellProps): ReactElement {
  return (
    <div className="flex min-h-full flex-col" data-testid="verification-console-shell">
      {/* Skip-link to the decision slot (keyboard-first; a11y §4.10). */}
      <a href={`#${DECISION_SLOT_ID}`} className="sr-only focus:not-sr-only focus:block focus:p-2">
        {t.shell.skipToDecision}
      </a>

      {/* Banner region — scope chrome. */}
      <div role="banner">{scopeChrome}</div>

      {/* Main region — claim header + the signals panel (single scroll). */}
      <main className="flex-1 overflow-y-auto p-4" aria-label={t.shell.title}>
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-lg font-bold">{t.shell.title}</h1>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm">
              <dt className="opacity-60">{t.shell.claimLabel}</dt>
              <dd className="font-mono text-xs" data-testid="shell-claim-id">
                {claimCaseId}
              </dd>
              <dt className="opacity-60">{t.shell.memberLabel}</dt>
              <dd>{deceasedMemberName ?? <span className="opacity-40">—</span>}</dd>
              <dt className="opacity-60">{t.shell.stateLabel}</dt>
              <dd data-testid="shell-claim-state">{claimState}</dd>
            </dl>
          </div>
          <span
            className="rounded bg-status-ok-bg px-2 py-0.5 text-xs font-medium text-status-ok-fg"
            data-testid="read-only-badge"
          >
            {t.shell.readOnlyBadge}
          </span>
        </header>

        {children}
      </main>

      {/* Sticky-bottom decision-strip SLOT (composition seam; empty/inert in 6.10). */}
      <div
        id={DECISION_SLOT_ID}
        role="contentinfo"
        aria-label="Decision"
        className="sticky bottom-0 border-t bg-white p-3"
        data-testid="decision-strip-slot"
      >
        {decisionSlot ?? <p className="text-xs opacity-50">{t.shell.decisionSlotEmpty}</p>}
      </div>
    </div>
  );
}
