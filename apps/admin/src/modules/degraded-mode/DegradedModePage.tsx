// Trustee degraded-mode page (Story 5.8, Task 6; AC4 #10) — the [SURFACE] demoable.
//
// The demoable "trustee declares/revokes degraded mode" flow: banner (active/inactive) + declare form →
// api → declaration table → banner re-read. Minimal; NO gold-plating. `pariwarId` is a prop (from the
// route) so the page is testable without a router (the ChannelConfigPage precedent).

import type { ReactElement } from 'react';

import { ApiError } from '../../api/client.js';
import {
  useActiveDegradedMode,
  useDeclareDegradedMode,
  useDegradedBridgeSmsSwitch,
  useRevokeDegradedMode,
  useSession,
  useSetDegradedBridgeSmsSwitch,
} from '../../api/hooks.js';
import { BRIDGE_TEXT_PARAGRAPH } from './bridge-copy.js';
import { BridgeSwitchPanel, SWITCH_BRIDGE_SMS_KEY } from './BridgeSwitchPanel.js';
import { DeclareForm } from './DeclareForm.js';
import { DegradedModeBanner } from './DegradedModeBanner.js';

export interface DegradedModePageProps {
  pariwarId: string;
}

function errorMessage(error: unknown): string | undefined {
  if (!error) return undefined;
  if (error instanceof ApiError) return `${error.code}: ${error.message}`;
  return error instanceof Error ? error.message : 'Something went wrong.';
}

export function DegradedModePage({ pariwarId }: DegradedModePageProps): ReactElement {
  const active = useActiveDegradedMode(pariwarId);
  const declare = useDeclareDegradedMode(pariwarId);
  const revoke = useRevokeDegradedMode(pariwarId);
  // Story 5.8b (AC12) — the Trust-wide switch: the state for all, the control for a Super Admin (the session's national grants).
  const bridgeSwitch = useDegradedBridgeSmsSwitch();
  const setBridgeSwitch = useSetDegradedBridgeSmsSwitch();
  const session = useSession();
  const canSwitch = session.data?.nationalGrants.includes(SWITCH_BRIDGE_SMS_KEY) ?? false;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-lg font-semibold">Degraded mode — cycle-open SMS bridge</h1>
        {/* Story 5.8b (FS11 (a)) replaced the AR-20 sentence ("force SMS … bypassing cost-optimization") with what is built. */}
        <p className="text-sm opacity-70" data-testid="degraded-mode-header-copy">
          Declare degraded mode when in-app push or WhatsApp is unavailable system-wide. {BRIDGE_TEXT_PARAGRAPH}{' '}
          Declaring supersedes any currently-active declaration.
        </p>
      </header>

      <section aria-label="Degraded-mode status" className="rounded border p-4">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide opacity-70">Status</h2>
        {active.isLoading ? (
          <p role="status">Loading status…</p>
        ) : active.isError ? (
          <p role="alert" className="text-status-fail-fg">{errorMessage(active.error)}</p>
        ) : (
          <DegradedModeBanner
            active={active.data?.active ?? null}
            bridgeTextsOn={bridgeSwitch.data ? bridgeSwitch.data.enabled : null}
            onRevoke={(id) => revoke.mutate(id)}
            revokePending={revoke.isPending}
            revokeError={errorMessage(revoke.error)}
          />
        )}
      </section>

      <section aria-label="Bridge text switch" className="rounded border p-4">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide opacity-70">Bridge texts (all Pariwars)</h2>
        {bridgeSwitch.isLoading ? (
          <p role="status">Loading the switch…</p>
        ) : bridgeSwitch.isError || !bridgeSwitch.data ? (
          <p role="alert" className="text-status-fail-fg">{errorMessage(bridgeSwitch.error) ?? 'The switch could not be read.'}</p>
        ) : (
          <BridgeSwitchPanel
            state={bridgeSwitch.data}
            canChange={canSwitch}
            onChange={(body) => setBridgeSwitch.mutate(body)}
            pending={setBridgeSwitch.isPending}
            changeError={errorMessage(setBridgeSwitch.error)}
          />
        )}
      </section>

      <section aria-label="Declare degraded mode" className="rounded border p-4">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide opacity-70">Declare</h2>
        <DeclareForm
          pending={declare.isPending}
          submitError={errorMessage(declare.error)}
          onSubmit={(payload) => declare.mutate(payload)}
        />
      </section>
    </div>
  );
}
