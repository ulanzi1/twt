// Trustee degraded-mode page (Story 5.8, Task 6; AC4 #10) — the [SURFACE] demoable.
//
// The demoable "trustee declares/revokes degraded mode" flow: banner (active/inactive) + declare form →
// api → declaration table → banner re-read. Minimal; NO gold-plating. `pariwarId` is a prop (from the
// route) so the page is testable without a router (the ChannelConfigPage precedent).

import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';

import { ApiError } from '../../api/client.js';
import {
  useActiveDegradedMode,
  useDeclareDegradedMode,
  useDegradedBridgeSmsSwitch,
  useRevokeDegradedMode,
  useSession,
  useSetDegradedBridgeSmsSwitch,
} from '../../api/hooks.js';
import { BRIDGE_TEXT_PARAGRAPH, BRIDGE_TEXTS_SWITCHED_OFF_SENTENCE, bridgeSwitchSavedMessage } from './bridge-copy.js';
import { BridgeSwitchPanel, SWITCH_BRIDGE_SMS_KEY } from './BridgeSwitchPanel.js';
import { DeclareForm } from './DeclareForm.js';
import { DegradedModeBanner } from './DegradedModeBanner.js';

export interface DegradedModePageProps {
  pariwarId: string;
}

/** The switch read failed — the page's one sentence for it, both when never read and when a refresh fails over a last-read state. */
const SWITCH_UNREAD = 'The switch could not be read.';

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
  // Code review 2026-10-28 (second pass) — the switch as last READ, kept while a background refetch fails (`data` survives the
  // error): `null` only when it has never been read. The banner, the header and the declare form all take this one value.
  const switchState = bridgeSwitch.data ?? null;
  const bridgeTextsOn = switchState ? switchState.enabled : null;
  // Code review 2026-10-28 (P2-3) — the change is ANNOUNCED: with no active declaration nothing else on the page moves, so a
  // screen-reader operator heard nothing. Set ONCE from the server's answer; cleared when the next change is sent. Second pass: it
  // holds the state SAVED and empties (silently — an empty live region says nothing) once the switch no longer reads that way.
  const [switchSaved, setSwitchSaved] = useState<boolean | null>(null);
  useEffect(() => {
    if (switchSaved !== null && bridgeTextsOn !== null && bridgeTextsOn !== switchSaved) setSwitchSaved(null);
  }, [bridgeTextsOn, switchSaved]);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-lg font-semibold">Degraded mode — cycle-open SMS bridge</h1>
        {/* Story 5.8b (FS11 (a)) replaced the AR-20 force-SMS sentence with what is built. */}
        <p className="text-sm opacity-70" data-testid="degraded-mode-header-copy">
          Declare degraded mode when in-app push or WhatsApp is unavailable system-wide. {BRIDGE_TEXT_PARAGRAPH}{' '}
          Declaring supersedes any currently-active declaration.
        </p>
        {/* Code review 2026-10-28 (second pass), Decision 1 (b) — OFF ⇒ the banner's own "switched off" words beside the paragraph
            (⛔ new words); ON or not read ⇒ nothing added. */}
        {bridgeTextsOn === false && (
          <p className="text-sm font-semibold" data-testid="degraded-mode-header-switched-off">
            {BRIDGE_TEXTS_SWITCHED_OFF_SENTENCE}
          </p>
        )}
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
            bridgeTextsOn={bridgeTextsOn}
            onRevoke={(id) => revoke.mutate(id)}
            revokePending={revoke.isPending}
            revokeError={errorMessage(revoke.error)}
          />
        )}
      </section>

      <section aria-label="Bridge text switch" className="rounded border p-4">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide opacity-70">Bridge texts (all Pariwars)</h2>
        {/* Second pass — rendered from `data` whenever there is any: a failed background refetch keeps the panel (and a typed
            reason) and says so quietly, in the page's existing words (⛔ a new sentence — decision D1 (b)); the blocking alert is only
            for a switch never read. */}
        {switchState ? (
          <>
            {bridgeSwitch.isError && (
              <p className="mb-2 text-sm opacity-70" data-testid="bridge-switch-refresh-failed">
                {SWITCH_UNREAD}
              </p>
            )}
            <BridgeSwitchPanel
              state={switchState}
              canChange={canSwitch}
              onChange={(body, onSaved) => {
                setSwitchSaved(null);
                setBridgeSwitch.mutate(body, {
                  onSuccess: (state) => {
                    setSwitchSaved(state.enabled);
                    onSaved();
                  },
                });
              }}
              pending={setBridgeSwitch.isPending}
              changeError={errorMessage(setBridgeSwitch.error)}
            />
          </>
        ) : bridgeSwitch.isLoading ? (
          <p role="status">Loading the switch…</p>
        ) : (
          <p role="alert" className="text-status-fail-fg">{errorMessage(bridgeSwitch.error) ?? SWITCH_UNREAD}</p>
        )}
        {/* PERSISTENT (outside the branches above): a live region must already be in the page before its text changes. */}
        <p role="status" aria-atomic="true" className="mt-2 text-sm" data-testid="bridge-switch-saved">
          {switchSaved !== null && bridgeTextsOn === switchSaved ? bridgeSwitchSavedMessage(switchSaved) : ''}
        </p>
      </section>

      <section aria-label="Declare degraded mode" className="rounded border p-4">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide opacity-70">Declare</h2>
        <DeclareForm
          bridgeTextsOn={bridgeTextsOn}
          pending={declare.isPending}
          submitError={errorMessage(declare.error)}
          onSubmit={(payload) => declare.mutate(payload)}
        />
      </section>
    </div>
  );
}
