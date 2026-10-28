// The degraded-mode page — Story 5.8b (Task 6; AC8, AC12; `2026-10-28-415` FS11 (a), FS4 (d), FS17 (a)). The module had ⛔ test
// (F11). What a declaring trustee is told is now TRUE: the page header, the declare form and the active banner carry FS11's one
// paragraph (+ the death exclusion + the Super Admin switch), and 5.8's AR-20 promise (*"force SMS … bypassing cost-optimization"*)
// is gone from the module. The Trust-wide switch's STATE shows to everyone who can see the page; its CONTROL only to a session whose
// national grants carry `degraded_mode.switch_bridge_sms` (the server is the boundary). The banner says "armed" only while it is ON.
// The api-client module is mocked (the `integrity-page.test.tsx` precedent); the real hooks and components run.

import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DegradedBridgeSmsSwitchResponse, DegradedModeDeclarationResponse } from '@twt/contracts';
import { ApiError } from '../src/api/client.js';
import { createQueryClient, degradedBridgeSmsSwitchKey } from '../src/api/hooks.js';
import { renderWithClient } from './_helpers.js';

const h = vi.hoisted(() => ({
  grants: [] as string[],
  active: null as unknown,
  sw: { enabled: false, changedAt: null, changedByDisplay: null, reason: null } as Record<string, unknown>,
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
      h.sw = { enabled: body.enabled, changedAt: '2026-10-28T07:00:00.000Z', changedByDisplay: 'Asha Verma', reason: body.reason };
      return h.sw;
    }),
  };
});

const { DegradedModePage } = await import('../src/modules/degraded-mode/DegradedModePage.js');
const { DegradedModeBanner } = await import('../src/modules/degraded-mode/DegradedModeBanner.js');
const { DeclareForm } = await import('../src/modules/degraded-mode/DeclareForm.js');
const { formatIst } = await import('../src/modules/correction-chase/ist.js');
const {
  BRIDGE_TEXT_EXPLAINER,
  BRIDGE_TEXT_DEATH_EXCLUSION,
  BRIDGE_TEXT_SWITCH_NOTE,
  BRIDGE_TEXT_TEMPLATE_CAVEAT,
  BRIDGE_TEXTS_SWITCHED_OFF,
  BRIDGE_TEXTS_SWITCHED_OFF_SENTENCE,
} = await import('../src/modules/degraded-mode/bridge-copy.js');

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
  h.sw = { enabled: false, changedAt: null, changedByDisplay: null, reason: null };
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
    render(<DeclareForm onSubmit={() => undefined} pending={false} bridgeTextsOn={null} />);
    const copy = screen.getByTestId('degraded-mode-declare-copy');
    for (const sentence of FS11) expect(copy.textContent).toContain(sentence);
  });

  it('⭐ the ACTIVE banner carries the paragraph; "armed" only while the switch is ON; OFF says the texts are switched off', () => {
    const { rerender } = render(<DegradedModeBanner active={ACTIVE} bridgeTextsOn={true} onRevoke={() => undefined} revokePending={false} />);
    for (const sentence of FS11) expect(screen.getByTestId('degraded-mode-banner-copy').textContent).toContain(sentence);
    expect(screen.getByText(/the cycle-open SMS bridge is armed/)).toBeTruthy();
    // Second pass, Decision 1 (b) — "armed" never stands alone: FS11 (a)'s own template caveat is IN the headline.
    expect(screen.getByTestId('degraded-mode-banner-headline').textContent).toBe(
      `⚠ Degraded mode ACTIVE — the cycle-open SMS bridge is armed — ${BRIDGE_TEXT_TEMPLATE_CAVEAT}.`,
    );
    rerender(<DegradedModeBanner active={ACTIVE} bridgeTextsOn={false} onRevoke={() => undefined} revokePending={false} />);
    expect(screen.queryByText(/is armed/)).toBeNull();
    expect(screen.getByText(/texts are switched off for every Pariwar/)).toBeTruthy();
    expect(screen.getByTestId('degraded-mode-banner-headline').textContent).toBe(`⚠ Degraded mode ACTIVE — ${BRIDGE_TEXTS_SWITCHED_OFF}.`);
    rerender(<DegradedModeBanner active={ACTIVE} bridgeTextsOn={null} onRevoke={() => undefined} revokePending={false} />);
    expect(screen.queryByText(/is armed/)).toBeNull();
    expect(screen.getByTestId('degraded-mode-banner-headline').textContent).toBe('⚠ Degraded mode ACTIVE.');
  });

  it('second pass — the caveat and the "switched off" words are FS11 (a)\'s and the banner\'s own, ⛔ new words', () => {
    expect(BRIDGE_TEXT_EXPLAINER).toContain(`— ${BRIDGE_TEXT_TEMPLATE_CAVEAT}.`);
    expect(BRIDGE_TEXTS_SWITCHED_OFF).toBe("the bridge's texts are switched off for every Pariwar; the app and WhatsApp notifications still go");
    expect(BRIDGE_TEXTS_SWITCHED_OFF_SENTENCE).toBe(
      "The bridge's texts are switched off for every Pariwar; the app and WhatsApp notifications still go.",
    );
  });

  it('⭐ second pass, Decision 1 (b) — switch OFF ⇒ the "switched off" words sit beside the paragraph in the HEADER', async () => {
    renderWithClient(<DegradedModePage pariwarId={PARIWAR} />);
    const off = await screen.findByTestId('degraded-mode-header-switched-off');
    expect(off.textContent).toBe(BRIDGE_TEXTS_SWITCHED_OFF_SENTENCE);
    expect(off.previousElementSibling).toBe(screen.getByTestId('degraded-mode-header-copy'));
    // …and in the declare form, under the page's real switch read.
    expect(screen.getByTestId('degraded-mode-declare-switched-off').textContent).toBe(BRIDGE_TEXTS_SWITCHED_OFF_SENTENCE);
  });

  it('⭐ second pass, Decision 1 (b) — switch ON ⇒ the header and the declare form carry the paragraph ALONE', async () => {
    h.sw = { enabled: true, changedAt: '2026-10-28T07:00:00.000Z', changedByDisplay: 'Asha Verma', reason: 'on' };
    renderWithClient(<DegradedModePage pariwarId={PARIWAR} />);
    await waitFor(() => expect(screen.getByTestId('bridge-switch').getAttribute('data-enabled')).toBe('true'));
    expect(screen.queryByTestId('degraded-mode-header-switched-off')).toBeNull();
    expect(screen.queryByTestId('degraded-mode-declare-switched-off')).toBeNull();
    expect(screen.getByTestId('degraded-mode-header-copy').textContent).toContain(BRIDGE_TEXT_EXPLAINER);
  });

  it('second pass, Decision 1 (b) — the switch unread ⇒ neither claim (neutral)', async () => {
    const client = await import('../src/api/client.js');
    vi.mocked(client.getDegradedBridgeSmsSwitch).mockRejectedValueOnce(new Error('down'));
    renderWithClient(<DegradedModePage pariwarId={PARIWAR} />);
    expect(await screen.findByText('down')).toBeTruthy();
    expect(screen.queryByTestId('degraded-mode-header-switched-off')).toBeNull();
    expect(screen.queryByTestId('degraded-mode-declare-switched-off')).toBeNull();
  });

  it('⭐ second pass, Decision 1 (b) — the DECLARE FORM standalone: OFF ⇒ beside the paragraph; ON / unknown ⇒ not shown', () => {
    const { rerender } = render(<DeclareForm onSubmit={() => undefined} pending={false} bridgeTextsOn={false} />);
    const off = screen.getByTestId('degraded-mode-declare-switched-off');
    expect(off.textContent).toBe(BRIDGE_TEXTS_SWITCHED_OFF_SENTENCE);
    expect(off.previousElementSibling).toBe(screen.getByTestId('degraded-mode-declare-copy'));
    rerender(<DeclareForm onSubmit={() => undefined} pending={false} bridgeTextsOn={true} />);
    expect(screen.queryByTestId('degraded-mode-declare-switched-off')).toBeNull();
    rerender(<DeclareForm onSubmit={() => undefined} pending={false} bridgeTextsOn={null} />);
    expect(screen.queryByTestId('degraded-mode-declare-switched-off')).toBeNull();
  });

  it('⭐ ⛔ "bypassing cost-optimization" (5.8\'s AR-20 promise) anywhere in the module — comments included', () => {
    const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/modules/degraded-mode');
    // Code review 2026-10-28 (second pass) — the RAW source: AC8 says "nowhere in the module", so ⛔ stripping comments first.
    for (const name of readdirSync(dir)) {
      const src = readFileSync(path.join(dir, name), 'utf8');
      expect(src, name).not.toMatch(/bypassing cost-optimization/i);
      expect(src, name).not.toMatch(/force SMS/i);
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

  it('⭐ code review P2-3 — with NO active declaration, a successful change is ANNOUNCED: the status region (in the page BEFORE the change, empty) says the state the server returned; the next change clears it first', async () => {
    h.grants = ['degraded_mode.switch_bridge_sms'];
    expect(h.active).toBeNull();
    renderWithClient(<DegradedModePage pariwarId={PARIWAR} />);
    await screen.findByTestId('bridge-switch-submit');
    const region = screen.getByTestId('bridge-switch-saved');
    expect(region.getAttribute('role')).toBe('status');
    expect(screen.getAllByRole('status')).toContain(region);
    expect(region.textContent).toBe('');
    await userEvent.type(screen.getByTestId('bridge-switch-reason'), 'templates approved');
    await userEvent.click(screen.getByTestId('bridge-switch-submit'));
    await waitFor(() => expect(region.textContent).toBe('Saved — bridge texts are now ON for every Pariwar.'));
    // The SAME node (a live region that is re-created is not re-read reliably) — and the declaration status did not move.
    expect(screen.getByTestId('bridge-switch-saved')).toBe(region);
    await waitFor(() => expect(screen.getByTestId('bridge-switch-submit').textContent).toBe('Switch bridge texts off'));
    // Code review 2026-10-28 (second pass) — the reason box EMPTIED on success: the next change needs its own reason (⛔ the last
    // one re-sent). Submitting it empty is refused; ⛔ request.
    expect((screen.getByTestId('bridge-switch-reason') as HTMLTextAreaElement).value).toBe('');
    await userEvent.click(screen.getByTestId('bridge-switch-submit'));
    expect(await screen.findByText('A reason is required.')).toBeTruthy();
    expect(h.setCalls).toEqual([{ enabled: true, reason: 'templates approved' }]);
    await userEvent.type(screen.getByTestId('bridge-switch-reason'), 'cost review');
    await userEvent.click(screen.getByTestId('bridge-switch-submit'));
    await waitFor(() => expect(region.textContent).toBe('Saved — bridge texts are now OFF for every Pariwar.'));
    expect(h.setCalls).toEqual([
      { enabled: true, reason: 'templates approved' },
      { enabled: false, reason: 'cost review' },
    ]);
  });

  it('code review P2-3 — a REFUSED change announces ⛔ success (the error is the alert)', async () => {
    h.grants = ['degraded_mode.switch_bridge_sms'];
    const client = await import('../src/api/client.js');
    vi.mocked(client.setDegradedBridgeSmsSwitch).mockRejectedValueOnce(new Error('the switch is already in this state'));
    renderWithClient(<DegradedModePage pariwarId={PARIWAR} />);
    await userEvent.type(await screen.findByTestId('bridge-switch-reason'), 'race');
    await userEvent.click(screen.getByTestId('bridge-switch-submit'));
    expect(await screen.findByText('the switch is already in this state')).toBeTruthy();
    expect(screen.getByTestId('bridge-switch-saved').textContent).toBe('');
  });

  it('⭐ second pass — a 409 "already in this state" (the page was stale) REFRESHES the switch on settle; the error stays; ⛔ "Saved"', async () => {
    h.grants = ['degraded_mode.switch_bridge_sms'];
    const client = await import('../src/api/client.js');
    vi.mocked(client.setDegradedBridgeSmsSwitch).mockImplementationOnce(async () => {
      // Another Super Admin already turned it ON; this page still shows OFF.
      h.sw = { enabled: true, changedAt: '2026-10-28T07:00:00.000Z', changedByDisplay: 'Ravi Kumar', reason: 'elsewhere' };
      throw new ApiError(409, 'degraded_mode.bridge_switch.concurrent_change', 'the switch is already in this state');
    });
    renderWithClient(<DegradedModePage pariwarId={PARIWAR} />);
    await userEvent.type(await screen.findByTestId('bridge-switch-reason'), 'turn it on');
    await userEvent.click(screen.getByTestId('bridge-switch-submit'));
    await waitFor(() => expect(screen.getByTestId('bridge-switch').getAttribute('data-enabled')).toBe('true'));
    expect(
      screen.getByText('degraded_mode.bridge_switch.concurrent_change: the switch is already in this state').getAttribute('role'),
    ).toBe('alert');
    expect(screen.getByTestId('bridge-switch-saved').textContent).toBe('');
    // The reason was typed for "on"; the switch now offers "off" — ⛔ that reason carried over.
    expect((screen.getByTestId('bridge-switch-reason') as HTMLTextAreaElement).value).toBe('');
  });

  it('⭐ second pass — a failed BACKGROUND refetch keeps the panel (and a typed reason) from the last read, says so quietly; the banner keeps the state', async () => {
    h.grants = ['degraded_mode.switch_bridge_sms'];
    h.active = ACTIVE;
    const qc = createQueryClient();
    render(
      <QueryClientProvider client={qc}>
        <DegradedModePage pariwarId={PARIWAR} />
      </QueryClientProvider>,
    );
    await userEvent.type(await screen.findByTestId('bridge-switch-reason'), 'half typed');
    const client = await import('../src/api/client.js');
    vi.mocked(client.getDegradedBridgeSmsSwitch).mockRejectedValueOnce(new Error('network blip'));
    await qc.invalidateQueries({ queryKey: degradedBridgeSmsSwitchKey });
    expect(await screen.findByTestId('bridge-switch-refresh-failed')).toBeTruthy();
    expect(screen.getByTestId('bridge-switch').getAttribute('data-enabled')).toBe('false');
    expect((screen.getByTestId('bridge-switch-reason') as HTMLTextAreaElement).value).toBe('half typed');
    expect(screen.queryByText('network blip')).toBeNull();
    expect(screen.getByTestId('degraded-mode-banner-headline').textContent).toContain('switched off');
    expect(screen.getByTestId('degraded-mode-header-switched-off')).toBeTruthy();
  });

  it('⭐ second pass — the "Saved" line empties (silently, the SAME node) once the switch no longer reads the way it was saved', async () => {
    h.grants = ['degraded_mode.switch_bridge_sms'];
    const qc = createQueryClient();
    render(
      <QueryClientProvider client={qc}>
        <DegradedModePage pariwarId={PARIWAR} />
      </QueryClientProvider>,
    );
    await userEvent.type(await screen.findByTestId('bridge-switch-reason'), 'templates approved');
    await userEvent.click(screen.getByTestId('bridge-switch-submit'));
    const region = screen.getByTestId('bridge-switch-saved');
    await waitFor(() => expect(region.textContent).toBe('Saved — bridge texts are now ON for every Pariwar.'));
    // Another Super Admin turns it OFF; this page re-reads.
    h.sw = { enabled: false, changedAt: '2026-10-28T08:00:00.000Z', changedByDisplay: 'Ravi Kumar', reason: 'off again' };
    await qc.invalidateQueries({ queryKey: degradedBridgeSmsSwitchKey });
    await waitFor(() => expect(screen.getByTestId('bridge-switch').getAttribute('data-enabled')).toBe('false'));
    expect(region.textContent).toBe('');
    expect(screen.getByTestId('bridge-switch-saved')).toBe(region);
  });

  it('second pass — "Last changed" is in IST (the admin app\'s formatIst), ⛔ raw ISO; a null reason ⇒ ⛔ `— “”`', async () => {
    h.sw = { enabled: true, changedAt: '2026-10-28T07:00:00.000Z', changedByDisplay: 'Asha Verma', reason: null };
    const { unmount } = renderWithClient(<DegradedModePage pariwarId={PARIWAR} />);
    const line = await screen.findByTestId('bridge-switch-last-changed');
    expect(line.textContent).not.toContain('2026-10-28T07:00:00.000Z');
    expect(line.textContent).toContain('12:30'); // 07:00 UTC = 12:30 IST
    expect(line.textContent).toBe(`Last changed ${formatIst('2026-10-28T07:00:00.000Z')} by Asha Verma`);
    expect(line.textContent).not.toContain('“');
    unmount();
    h.sw = { enabled: true, changedAt: '2026-10-28T07:00:00.000Z', changedByDisplay: 'Asha Verma', reason: 'on' };
    renderWithClient(<DegradedModePage pariwarId={PARIWAR} />);
    expect((await screen.findByTestId('bridge-switch-last-changed')).textContent).toBe(
      `Last changed ${formatIst('2026-10-28T07:00:00.000Z')} by Asha Verma — “on”`,
    );
  });

  it('the banner on the page reflects the switch: OFF ⇒ "switched off", ON ⇒ "armed"', async () => {
    h.active = ACTIVE;
    const { unmount } = renderWithClient(<DegradedModePage pariwarId={PARIWAR} />);
    // The header and the declare form now carry the same words (second pass) — the BANNER's headline is the one asserted here.
    await waitFor(() => expect(screen.getByTestId('degraded-mode-banner-headline').textContent).toMatch(/texts are switched off for every Pariwar/));
    unmount();
    h.sw = { enabled: true, changedAt: '2026-10-28T07:00:00.000Z', changedByDisplay: null, reason: 'on' } satisfies DegradedBridgeSmsSwitchResponse;
    renderWithClient(<DegradedModePage pariwarId={PARIWAR} />);
    expect(await screen.findByText(/the cycle-open SMS bridge is armed/)).toBeTruthy();
    expect(screen.getByTestId('degraded-mode-banner-headline').textContent).toContain(BRIDGE_TEXT_TEMPLATE_CAVEAT);
  });
});
