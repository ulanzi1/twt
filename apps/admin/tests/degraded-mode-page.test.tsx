// The degraded-mode page — Story 5.8b (Task 6; AC8, AC12; `2026-10-28-415` FS11 (a), FS4 (d), FS17 (a)). The module had ⛔ test
// (F11). What a declaring trustee is told is now TRUE: the page header, the declare form and the active banner carry FS11's one
// paragraph (+ the death exclusion + the Super Admin switch), and 5.8's AR-20 promise (*"force SMS … bypassing cost-optimization"*)
// is gone from the module. The Trust-wide switch's STATE shows to everyone who can see the page; its CONTROL only to a session whose
// national grants carry `degraded_mode.switch_bridge_sms` (the server is the boundary). The banner says "armed" only while it is ON.
// The api-client module is mocked (the `integrity-page.test.tsx` precedent); the real hooks and components run.

import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DegradedBridgeSmsSwitchResponse, DegradedModeDeclarationResponse } from '@twt/contracts';
import { renderWithClient } from './_helpers.js';

const h = vi.hoisted(() => ({
  grants: [] as string[],
  active: null as unknown,
  sw: { enabled: false, changedAt: null, changedByActor: null, reason: null } as Record<string, unknown>,
  setCalls: [] as unknown[],
}));

vi.mock('../src/api/client.js', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    getSession: async () => ({ userId: '11111111-1111-4111-8111-111111111111', nationalGrants: h.grants }),
    getActiveDegradedMode: vi.fn(async () => ({ active: h.active })),
    getDegradedBridgeSmsSwitch: vi.fn(async () => h.sw),
    setDegradedBridgeSmsSwitch: vi.fn(async (body: { enabled: boolean; reason: string }) => {
      h.setCalls.push(body);
      h.sw = { enabled: body.enabled, changedAt: '2026-10-28T07:00:00.000Z', changedByActor: '11111111-1111-4111-8111-111111111111', reason: body.reason };
      return h.sw;
    }),
  };
});

const { DegradedModePage } = await import('../src/modules/degraded-mode/DegradedModePage.js');
const { DegradedModeBanner } = await import('../src/modules/degraded-mode/DegradedModeBanner.js');
const { DeclareForm } = await import('../src/modules/degraded-mode/DeclareForm.js');
const { BRIDGE_TEXT_EXPLAINER, BRIDGE_TEXT_DEATH_EXCLUSION, BRIDGE_TEXT_SWITCH_NOTE } = await import(
  '../src/modules/degraded-mode/bridge-copy.js'
);

const PARIWAR = '22222222-2222-4222-8222-222222222222';
const ACTIVE: DegradedModeDeclarationResponse = {
  id: '33333333-3333-4333-8333-333333333333',
  mode: 'cycle_open_sms_bridge',
  effectiveFrom: '2026-10-28T06:00:00.000Z',
  expiresAt: null,
  revokedAt: null,
  declaredByActor: null,
  reason: 'push down',
};

const FS11 = [BRIDGE_TEXT_EXPLAINER, BRIDGE_TEXT_DEATH_EXCLUSION, BRIDGE_TEXT_SWITCH_NOTE];

beforeEach(() => {
  h.grants = [];
  h.active = null;
  h.sw = { enabled: false, changedAt: null, changedByActor: null, reason: null };
  h.setCalls = [];
});

describe('Story 5.8b AC8 — what the trustee is told (FS11 (a))', () => {
  it('the sentence is BigDev\'s, verbatim, with the death exclusion and the switch', () => {
    expect(BRIDGE_TEXT_EXPLAINER).toBe(
      'While this is active, each cycle that opens texts every member assigned to a pool in it, once, in their language — once the ' +
        "bridge's text templates are approved (until then no text is sent). A member who cannot be texted still gets the app and " +
        'WhatsApp notification. A cycle that opened before you declared is not affected; revoking does not stop texts for a cycle that ' +
        'opened while this was active.',
    );
    expect(BRIDGE_TEXT_DEATH_EXCLUSION).toBe('Members whose death has been reported are not texted.');
    expect(BRIDGE_TEXT_SWITCH_NOTE).toBe('A Super Admin can switch these texts off for every Pariwar.');
  });

  it('⭐ the PAGE HEADER carries the paragraph', async () => {
    renderWithClient(<DegradedModePage pariwarId={PARIWAR} />);
    const header = await screen.findByTestId('degraded-mode-header-copy');
    for (const sentence of FS11) expect(header.textContent).toContain(sentence);
  });

  it('⭐ the DECLARE FORM carries the paragraph (rendered standalone — the telegram-config-form precedent)', () => {
    render(<DeclareForm onSubmit={() => undefined} pending={false} />);
    const copy = screen.getByTestId('degraded-mode-declare-copy');
    for (const sentence of FS11) expect(copy.textContent).toContain(sentence);
  });

  it('⭐ the ACTIVE banner carries the paragraph; "armed" only while the switch is ON; OFF says the texts are switched off', () => {
    const { rerender } = render(<DegradedModeBanner active={ACTIVE} bridgeTextsOn={true} onRevoke={() => undefined} revokePending={false} />);
    for (const sentence of FS11) expect(screen.getByTestId('degraded-mode-banner-copy').textContent).toContain(sentence);
    expect(screen.getByText(/the cycle-open SMS bridge is armed/)).toBeTruthy();
    rerender(<DegradedModeBanner active={ACTIVE} bridgeTextsOn={false} onRevoke={() => undefined} revokePending={false} />);
    expect(screen.queryByText(/is armed/)).toBeNull();
    expect(screen.getByText(/texts are switched off for every Pariwar/)).toBeTruthy();
    rerender(<DegradedModeBanner active={ACTIVE} bridgeTextsOn={null} onRevoke={() => undefined} revokePending={false} />);
    expect(screen.queryByText(/is armed/)).toBeNull();
  });

  it('⭐ ⛔ "bypassing cost-optimization" (5.8\'s AR-20 promise) anywhere in the module', () => {
    const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/modules/degraded-mode');
    for (const name of readdirSync(dir)) {
      const src = readFileSync(path.join(dir, name), 'utf8');
      // The replacement notes NAME the old promise inside a comment — the rendered text never does.
      const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      expect(code, name).not.toMatch(/bypassing cost-optimization/i);
      expect(code, name).not.toMatch(/force SMS/i);
    }
  });
});

describe('Story 5.8b AC12 — the Trust-wide switch on the page', () => {
  it('⭐ a NON-Super Admin sees the state (read-only) and ⛔ control', async () => {
    h.grants = ['pariwar.declare_degraded_mode'];
    renderWithClient(<DegradedModePage pariwarId={PARIWAR} />);
    const panel = await screen.findByTestId('bridge-switch');
    expect(panel.getAttribute('data-enabled')).toBe('false');
    expect(panel.textContent).toContain('Bridge texts are OFF for every Pariwar');
    expect(panel.textContent).toContain('the switch starts off');
    // Give the session read a chance to land before asserting the control's absence.
    await waitFor(() => expect(screen.queryByTestId('bridge-switch-submit')).toBeNull());
  });

  it('⭐ a Super Admin sees the control; ⛔ reason ⇒ ⛔ request; with a reason it switches ON and the state re-reads', async () => {
    h.grants = ['degraded_mode.switch_bridge_sms', 'pariwar.declare_degraded_mode'];
    renderWithClient(<DegradedModePage pariwarId={PARIWAR} />);
    const submit = await screen.findByTestId('bridge-switch-submit');
    expect(submit.textContent).toBe('Switch bridge texts on');
    await userEvent.click(submit);
    expect(await screen.findByText('A reason is required.')).toBeTruthy();
    expect(h.setCalls).toEqual([]);
    await userEvent.type(screen.getByTestId('bridge-switch-reason'), '  templates approved  ');
    await userEvent.click(screen.getByTestId('bridge-switch-submit'));
    await waitFor(() => expect(h.setCalls).toEqual([{ enabled: true, reason: 'templates approved' }]));
    await waitFor(() => expect(screen.getByTestId('bridge-switch').getAttribute('data-enabled')).toBe('true'));
    expect(screen.getByTestId('bridge-switch').textContent).toContain('“templates approved”');
    expect(screen.getByTestId('bridge-switch-submit').textContent).toBe('Switch bridge texts off');
  });

  it('the banner on the page reflects the switch: OFF ⇒ "switched off", ON ⇒ "armed"', async () => {
    h.active = ACTIVE;
    const { unmount } = renderWithClient(<DegradedModePage pariwarId={PARIWAR} />);
    expect(await screen.findByText(/texts are switched off for every Pariwar/)).toBeTruthy();
    unmount();
    h.sw = { enabled: true, changedAt: '2026-10-28T07:00:00.000Z', changedByActor: null, reason: 'on' } satisfies DegradedBridgeSmsSwitchResponse;
    renderWithClient(<DegradedModePage pariwarId={PARIWAR} />);
    expect(await screen.findByText(/the cycle-open SMS bridge is armed/)).toBeTruthy();
  });
});
