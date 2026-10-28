// The bridge text's Trust-wide Super Admin switch (Story 5.8b, Task 6; AC12; `2026-10-28-415` FS17 (a); Panel `2026-10-28-414` Q1 A).
//
// The STATE is shown to everyone who can see this page (read-only); the CONTROL only to a session whose national grants carry
// `degraded_mode.switch_bridge_sms` (`super_admin`) — the WorkplacesPage precedent. The server's `requireGlobalPermission` is the real
// boundary (a 403 surfaces as the page error). A change needs a reason (the history keeps it). ONE switch for every Pariwar.

import type { DegradedBridgeSmsSwitchResponse } from '@twt/contracts';
import type { ReactElement } from 'react';
import { useState } from 'react';

import { formatIst } from '../correction-chase/ist.js';

/** The permission key the control is shown for (catalog v55; `super_admin` only). */
export const SWITCH_BRIDGE_SMS_KEY = 'degraded_mode.switch_bridge_sms';

export interface BridgeSwitchPanelProps {
  readonly state: DegradedBridgeSmsSwitchResponse;
  readonly canChange: boolean;
  /**
   * Send the change; call `onSaved` once the SERVER accepted it — the panel then clears its reason box, so the next change needs its
   * own reason (code review 2026-10-28 (second pass): the box kept the last one, and the next change recorded it).
   */
  readonly onChange: (body: { enabled: boolean; reason: string }, onSaved: () => void) => void;
  readonly pending: boolean;
  readonly changeError?: string;
}

export function BridgeSwitchPanel({ state, canChange, onChange, pending, changeError }: BridgeSwitchPanelProps): ReactElement {
  const [reason, setReason] = useState('');
  const [missingReason, setMissingReason] = useState(false);
  const next = !state.enabled;
  // A reason is written for ONE direction: when the state moves under it (changed elsewhere, or a 409's refresh), the box empties,
  // so a reason typed for "on" is never sent with "off" (code review 2026-10-28 (second pass)). Adjusted during render (⛔ an effect).
  const [reasonFor, setReasonFor] = useState(next);
  if (reasonFor !== next) {
    setReasonFor(next);
    setReason('');
  }

  return (
    <div className="flex flex-col gap-2" data-testid="bridge-switch" data-enabled={String(state.enabled)}>
      <p className="font-semibold">
        {state.enabled
          ? 'Bridge texts are ON for every Pariwar.'
          : 'Bridge texts are OFF for every Pariwar — no bridge text is sent; the app and WhatsApp notifications still go.'}
      </p>
      {/* Code review 2026-10-28 (second pass) — staff time in IST (the admin app's `formatIst`), ⛔ raw ISO UTC; ⛔ an empty `— “”`. */}
      {state.changedAt ? (
        <p className="text-sm opacity-70" data-testid="bridge-switch-last-changed">
          Last changed {formatIst(state.changedAt)}
          {state.changedByDisplay ? ` by ${state.changedByDisplay}` : ''}
          {state.reason !== null ? ` — “${state.reason}”` : ''}
        </p>
      ) : (
        <p className="text-sm opacity-70">Never changed — the switch starts off.</p>
      )}
      {canChange && (
        <form
          className="flex flex-col gap-2"
          aria-label="Change the bridge text switch"
          onSubmit={(e) => {
            e.preventDefault();
            const trimmed = reason.trim();
            if (trimmed === '') {
              setMissingReason(true);
              return;
            }
            setMissingReason(false);
            onChange({ enabled: next, reason: trimmed }, () => setReason(''));
          }}
        >
          <label htmlFor="bridge-switch-reason" className="text-sm font-medium">Reason (required)</label>
          <textarea
            id="bridge-switch-reason"
            className="rounded border px-2 py-1"
            rows={2}
            maxLength={500}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            data-testid="bridge-switch-reason"
          />
          {missingReason && <p role="alert" className="text-sm text-status-fail-fg">A reason is required.</p>}
          <button
            type="submit"
            disabled={pending}
            aria-busy={pending}
            className="rounded bg-black px-4 py-2 text-white disabled:opacity-60"
            data-testid="bridge-switch-submit"
          >
            {pending ? 'Saving…' : next ? 'Switch bridge texts on' : 'Switch bridge texts off'}
          </button>
          {changeError && <p role="alert" className="text-sm text-status-fail-fg">{changeError}</p>}
        </form>
      )}
    </div>
  );
}
