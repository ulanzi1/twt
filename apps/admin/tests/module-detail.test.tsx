// Story 12.2 (AC7, AC12) — one partner offer. Fetchers mocked (the real ApiError kept); the real hooks, StepUpPanel and copy
// run. Covers: Publish DISABLED with the author and single-admin sentences when `authored_by_viewer`; publish → 403 step-up
// → the panel (with MODULE_PUBLISH_STEP_UP_CONTEXT) → verify → the held write retried ONCE with the SAME key; a 409
// tone_review.required → the author sentence; the C10 warning at lead_count 3; withdraw sends no body of its own (the
// fetcher sends `{}`).

import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { focusManager } from '@tanstack/react-query';
import { MODULE_PUBLISH_STEP_UP_CONTEXT, type ModuleDetailResponse } from '@twt/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithClient } from './_helpers.js';

const PARIWAR = '11111111-1111-4111-8111-111111111111';
const MODULE = '6ba7b810-9dad-41d1-80b4-00c04fd430c8';

const getModuleDetail = vi.fn();
const publishModule = vi.fn();
const withdrawModule = vi.fn();
const requestStepUp = vi.fn();
const verifyStepUp = vi.fn();
vi.mock('../src/api/client.js', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    getModuleDetail: (p: string, m: string) => getModuleDetail(p, m),
    publishModule: (p: string, m: string, b: unknown, k: string) => publishModule(p, m, b, k),
    withdrawModule: (p: string, m: string, k: string) => withdrawModule(p, m, k),
    requestStepUp: (c: string) => requestStepUp(c),
    verifyStepUp: (o: string) => verifyStepUp(o),
  };
});

const { ModuleDetailPage } = await import('../src/modules/marketplace/ModuleDetailPage.js');
const { resolveEn: t } = await import('../src/modules/marketplace/i18n-en.js');
const { ApiError } = await import('../src/api/client.js');
const { formatIst } = await import('../src/modules/marketplace/derive.js');

function detail(over: Partial<ModuleDetailResponse> = {}): ModuleDetailResponse {
  return {
    module_id: MODULE,
    pariwar_id: PARIWAR,
    partner_id: '0f8fad5b-d9cb-469f-a165-70867728950e',
    partner_display_name_en: 'HDFC',
    partner_display_name_hi: 'एचडीएफसी',
    name_en: 'Home loan',
    name_hi: 'गृह ऋण',
    description_en: 'A loan.',
    description_hi: 'ऋण।',
    eligibility_filter: { version: 1, clauses: [] },
    scope_filter: { version: 1, scope: 'members-all' },
    valid_from: '2026-11-05T05:00:00.000Z',
    valid_until: '2026-12-05T05:00:00.000Z',
    slot_capacity: null,
    slots_remaining: null,
    lead_handoff_url: 'https://leads.partner.example/hdfc',
    lead_handoff_signing_key_secret_name: 'hdfc-signing-key',
    branding_bundle: { version: 1, logo_object_key: null, accent_color_hex: null },
    current_state: 'draft',
    archive_reason: null,
    created_at: '2026-11-01T00:00:00.000Z',
    updated_at: '2026-11-01T00:00:00.000Z',
    author_display_name: 'Asha',
    authored_by_viewer: false,
    publication: null,
    lead_count: 0,
    ...over,
  };
}

beforeEach(() => {
  for (const f of [getModuleDetail, publishModule, withdrawModule, requestStepUp, verifyStepUp]) f.mockReset();
});

function render(): void {
  renderWithClient(<ModuleDetailPage pariwarId={PARIWAR} moduleId={MODULE} onBack={vi.fn()} onStartCorrectedCopy={vi.fn()} />);
}
function tickAll(): void {
  for (const k of ['tone', 'hindi', 'partner']) fireEvent.click(screen.getByTestId(`module-tick-${k}`));
}

describe('ModuleDetailPage (AC12)', () => {
  it('shows the members-cannot-see line, the three exact ticks, and Publish only once all are ticked', { timeout: 20_000 }, async () => {
    getModuleDetail.mockResolvedValue(detail());
    render();
    expect(await screen.findByTestId('module-detail-members-cannot-see')).toHaveTextContent(t('module.detail.membersCannotSee'));
    for (const k of ['tone', 'hindi', 'partner']) expect(screen.getByTestId('module-publish')).toHaveTextContent(t(`module.detail.tick.${k}`));
    expect(screen.getByTestId('module-detail-author')).toHaveTextContent(t('module.detail.author', { name: 'Asha' }));
    expect(screen.getByTestId('module-detail-hi')).toHaveAttribute('lang', 'hi');
    expect(screen.getByTestId('module-publish-button')).toBeDisabled();
    tickAll();
    expect(screen.getByTestId('module-publish-button')).toBeEnabled();
    expect(screen.queryByTestId('module-lead-warning')).toBeNull();
  });

  it('authored_by_viewer: Publish DISABLED with the author sentence and the single-admin line', { timeout: 20_000 }, async () => {
    getModuleDetail.mockResolvedValue(detail({ authored_by_viewer: true }));
    render();
    expect(await screen.findByTestId('module-publish-author')).toHaveTextContent(t('module.detail.authorCannotPublish'));
    expect(screen.getByTestId('module-publish-single-admin')).toHaveTextContent(t('module.detail.singleAdmin'));
    expect(screen.getByTestId('module-publish-button')).toBeDisabled();
    // RP33 — `toHaveAccessibleDescription` RESOLVES the id, so a dangling aria-describedby fails (a bare attribute check would not).
    expect(screen.getByTestId('module-publish-button')).toHaveAccessibleDescription(t('module.detail.authorCannotPublish'));
    expect(screen.getByTestId('module-tick-tone')).toBeDisabled();
  });

  it('publish → 403 step-up → the panel → verify → the held write retried ONCE with the SAME key', { timeout: 20_000 }, async () => {
    getModuleDetail.mockResolvedValue(detail());
    publishModule
      .mockRejectedValueOnce(new ApiError(403, 'auth.step_up_required', 'step up', { action: MODULE_PUBLISH_STEP_UP_CONTEXT }))
      .mockResolvedValueOnce({ module_id: MODULE, state: 'scheduled', published_event_type: 'module.scheduled' });
    requestStepUp.mockResolvedValue({});
    verifyStepUp.mockResolvedValue({});
    render();
    await screen.findByTestId('module-publish');
    tickAll();
    fireEvent.click(screen.getByTestId('module-publish-button'));
    const panel = await screen.findByTestId('module-step-up');
    fireEvent.click(screen.getByText(/send/i, { selector: 'button' }));
    await waitFor(() => expect(requestStepUp).toHaveBeenCalledWith(MODULE_PUBLISH_STEP_UP_CONTEXT));
    fireEvent.change(await screen.findByTestId('module-step-up-code'), { target: { value: '123456' } });
    fireEvent.click(screen.getByTestId('module-step-up-verify'));
    await waitFor(() => expect(publishModule).toHaveBeenCalledTimes(2));
    expect(publishModule.mock.calls[1]![3]).toBe(publishModule.mock.calls[0]![3]);
    expect(publishModule.mock.calls[0]![2]).toEqual({ tone_checklist_confirmed: true, hindi_reviewed: true, partner_agreement_confirmed: true });
    expect(await screen.findByTestId('module-detail-message')).toHaveTextContent(t('module.detail.published'));
    expect(panel).not.toBeInTheDocument();
  });

  it('a second step-up demand on the retried write is an error, ⛔ another hold', { timeout: 20_000 }, async () => {
    getModuleDetail.mockResolvedValue(detail());
    publishModule.mockRejectedValue(new ApiError(403, 'auth.step_up_required', 'step up'));
    requestStepUp.mockResolvedValue({});
    verifyStepUp.mockResolvedValue({});
    render();
    await screen.findByTestId('module-publish');
    tickAll();
    fireEvent.click(screen.getByTestId('module-publish-button'));
    await screen.findByTestId('module-step-up');
    fireEvent.click(screen.getByText(/send/i, { selector: 'button' }));
    fireEvent.change(await screen.findByTestId('module-step-up-code'), { target: { value: '123456' } });
    fireEvent.click(screen.getByTestId('module-step-up-verify'));
    expect(await screen.findByTestId('module-detail-message')).toHaveTextContent(t('module.detail.stepUpAgain'));
    expect(publishModule).toHaveBeenCalledTimes(2);
    expect(screen.queryByTestId('module-step-up')).toBeNull();
  });

  it('a 409 tone_review.required shows the author sentence', { timeout: 20_000 }, async () => {
    getModuleDetail.mockResolvedValue(detail());
    publishModule.mockRejectedValue(new ApiError(409, 'tone_review.required', 'tone'));
    render();
    await screen.findByTestId('module-publish');
    tickAll();
    fireEvent.click(screen.getByTestId('module-publish-button'));
    expect(await screen.findByTestId('module-detail-message')).toHaveTextContent(t('module.detail.authorCannotPublish'));
  });

  it('the C10 warning at lead_count 3 — before Withdraw and before "Start a corrected copy"', { timeout: 20_000 }, async () => {
    getModuleDetail.mockResolvedValue(detail({ current_state: 'active', lead_count: 3 }));
    render();
    const warning = await screen.findByTestId('module-lead-warning');
    expect(warning).toHaveTextContent(t('module.detail.leadWarning', { n: 3 }));
    const box = screen.getByTestId('module-correct');
    // The warning comes BEFORE both buttons in the reading order.
    const order = [...box.querySelectorAll('[data-testid]')].map((e) => e.getAttribute('data-testid'));
    expect(order.indexOf('module-lead-warning')).toBeLessThan(order.indexOf('module-withdraw'));
    expect(order.indexOf('module-lead-warning')).toBeLessThan(order.indexOf('module-corrected-copy'));
    expect(screen.queryByTestId('module-publish')).toBeNull(); // publish is a draft's only
  });

  it('withdraw calls the fetcher with a key and no step-up; corrected copy hands back the id', { timeout: 20_000 }, async () => {
    getModuleDetail.mockResolvedValue(detail());
    withdrawModule.mockResolvedValue({ module_id: MODULE, state: 'archived' });
    const onCopy = vi.fn();
    renderWithClient(<ModuleDetailPage pariwarId={PARIWAR} moduleId={MODULE} onBack={vi.fn()} onStartCorrectedCopy={onCopy} />);
    fireEvent.click(await screen.findByTestId('module-withdraw'));
    await waitFor(() => expect(withdrawModule).toHaveBeenCalledWith(PARIWAR, MODULE, expect.any(String)));
    expect(requestStepUp).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('module-corrected-copy'));
    expect(onCopy).toHaveBeenCalledWith(MODULE);
  });

  // ── Code review round 1, chunk C ────────────────────────────────────────────────────────────────────

  it('RP24: publishing a draft whose window has lapsed says to withdraw and copy — not to "choose a later closing time"', { timeout: 20_000 }, async () => {
    getModuleDetail.mockResolvedValue(detail());
    publishModule.mockRejectedValue(new ApiError(409, 'module.window_ended', 'ended'));
    render();
    await screen.findByTestId('module-publish');
    tickAll();
    fireEvent.click(screen.getByTestId('module-publish-button'));
    const message = await screen.findByTestId('module-detail-message');
    expect(message).toHaveTextContent(t('module.error.window_ended_detail'));
    expect(message).not.toHaveTextContent(t('module.error.window_ended'));
    expect(message).toHaveAttribute('role', 'alert');
  });

  it('RP28: the page the publisher reads says the offer "reaches no member for now" when every ticked status is a no-member one', { timeout: 20_000 }, async () => {
    getModuleDetail.mockResolvedValue(
      detail({ eligibility_filter: { version: 1, clauses: [{ kind: 'member_state_in', states: ['active', 'lapsed-unpaid'] }] } }),
    );
    render();
    expect(await screen.findByTestId('module-detail-reaches-no-member')).toHaveTextContent(t('module.eligibility.reachesNoMember'));
  });

  it.each([
    ['one ticked status can have a member', { version: 1, clauses: [{ kind: 'member_state_in', states: ['active', 'lock-in'] }] }],
    ['no status restriction', { version: 1, clauses: [] }],
  ] as const)('RP28: no "reaches no member" warning when %s', { timeout: 20_000 }, async (_label, filter) => {
    getModuleDetail.mockResolvedValue(detail({ eligibility_filter: filter as unknown as ModuleDetailResponse['eligibility_filter'] }));
    render();
    await screen.findByTestId('module-detail-eligibility');
    expect(screen.queryByTestId('module-detail-reaches-no-member')).toBeNull();
  });

  it('an archived offer offers neither Publish nor Withdraw — only a corrected copy', { timeout: 20_000 }, async () => {
    getModuleDetail.mockResolvedValue(detail({ current_state: 'archived', archive_reason: 'trustee_archived' }));
    render();
    await screen.findByTestId('module-detail');
    expect(screen.queryByTestId('module-publish')).toBeNull();
    expect(screen.queryByTestId('module-withdraw')).toBeNull();
    expect(screen.getByTestId('module-corrected-copy')).toBeInTheDocument();
  });

  it('RP32: a withdraw is announced in an always-mounted live region and focus moves to the page heading', { timeout: 20_000 }, async () => {
    getModuleDetail.mockResolvedValue(detail({ current_state: 'active' }));
    withdrawModule.mockResolvedValue({ module_id: MODULE, state: 'archived' });
    render();
    const live = await screen.findByTestId('module-detail-live');
    expect(live).toHaveAttribute('role', 'status');
    expect(live).toBeEmptyDOMElement(); // mounted BEFORE the result, so the result is announced when it arrives
    fireEvent.click(screen.getByTestId('module-withdraw'));
    await waitFor(() => expect(live).toHaveTextContent(t('module.detail.withdrawn')));
    expect(screen.getByRole('heading', { level: 1 })).toHaveFocus();
  });

  it('a refused withdraw shows the mapped sentence as an alert', { timeout: 20_000 }, async () => {
    getModuleDetail.mockResolvedValue(detail({ current_state: 'active' }));
    withdrawModule.mockRejectedValue(new ApiError(409, 'module.illegal_transition', 'no'));
    render();
    fireEvent.click(await screen.findByTestId('module-withdraw'));
    const message = await screen.findByTestId('module-detail-message');
    expect(message).toHaveTextContent(t('module.error.illegal_transition'));
    expect(message).toHaveAttribute('role', 'alert');
  });

  it('Cancel on the held publish drops the hold: no second write, the panel is gone, Publish is available again', { timeout: 20_000 }, async () => {
    getModuleDetail.mockResolvedValue(detail());
    publishModule.mockRejectedValue(new ApiError(403, 'auth.step_up_required', 'step up'));
    render();
    await screen.findByTestId('module-publish');
    tickAll();
    fireEvent.click(screen.getByTestId('module-publish-button'));
    const panel = await screen.findByTestId('module-step-up');
    fireEvent.click(screen.getByTestId('module-step-up-cancel'));
    expect(panel).not.toBeInTheDocument();
    expect(publishModule).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('module-publish-button')).toBeEnabled();
  });

  it('RP19: a failed background refetch keeps the loaded page, the ticks and the panel — and says it may be out of date', { timeout: 20_000 }, async () => {
    getModuleDetail.mockResolvedValueOnce(detail()).mockRejectedValue(new ApiError(500, 'internal.error', 'down'));
    render();
    await screen.findByTestId('module-publish');
    tickAll();
    act(() => {
      focusManager.setFocused(false);
      focusManager.setFocused(true); // the admin comes back from reading the OTP
    });
    await waitFor(() => expect(getModuleDetail).toHaveBeenCalledTimes(2));
    const note = await screen.findByTestId('module-detail-refresh-error');
    expect(note).toHaveTextContent(t('module.detail.refreshError'));
    expect(note).toHaveAttribute('role', 'alert'); // PU1: the only signal that the publish page is stale is announced as an alert
    expect(screen.queryByTestId('module-detail-error')).toBeNull();
    expect(screen.getByTestId('module-publish')).toBeInTheDocument();
    expect(screen.getByTestId('module-tick-tone')).toBeChecked();
  });

  it('a failed FIRST load shows the error in place of the page', { timeout: 20_000 }, async () => {
    getModuleDetail.mockRejectedValue(new ApiError(403, 'authz.forbidden', 'no'));
    render();
    expect(await screen.findByTestId('module-detail-error')).toHaveTextContent(t('module.error.forbidden')); // RP22, end to end
    expect(screen.queryByTestId('module-detail')).toBeNull();
  });
});

describe('ModuleDetailPage — code review round 2 (chunk C)', () => {
  const publication = (type: 'module.scheduled' | 'module.activated') => ({
    published_event_type: type,
    reviewer_display_name: 'Ravi',
    reviewed_at: '2026-11-02T05:00:00.000Z',
    hindi_reviewed: true as const,
    partner_agreement_confirmed: true as const,
    tone_signoff_content_hash: 'a'.repeat(64),
  });

  it('RC1: arriving from Create draft announces "Draft created." in the live region and focuses the heading — once', { timeout: 20_000 }, async () => {
    getModuleDetail.mockResolvedValue(detail({ authored_by_viewer: true })); // the admin's own new draft (PT10)
    const onCreatedShown = vi.fn();
    renderWithClient(
      <ModuleDetailPage pariwarId={PARIWAR} moduleId={MODULE} created onCreatedShown={onCreatedShown} onBack={vi.fn()} onStartCorrectedCopy={vi.fn()} />,
    );
    const live = await screen.findByTestId('module-detail-live');
    await waitFor(() => expect(live).toHaveTextContent(t('module.detail.created')));
    expect(screen.getByRole('heading', { level: 1 })).toHaveFocus();
    expect(onCreatedShown).toHaveBeenCalledTimes(1); // the route clears its flag, so a reload does not announce it again
  });

  it('RC1: without the flag nothing is announced and focus is not moved', { timeout: 20_000 }, async () => {
    getModuleDetail.mockResolvedValue(detail());
    render();
    const live = await screen.findByTestId('module-detail-live');
    expect(live).toBeEmptyDOMElement();
    expect(screen.getByRole('heading', { level: 1 })).not.toHaveFocus();
  });

  it('RC2: the step-up panel takes focus when it opens; Cancel returns it to the heading', { timeout: 20_000 }, async () => {
    getModuleDetail.mockResolvedValue(detail());
    publishModule.mockRejectedValue(new ApiError(403, 'auth.step_up_required', 'step up'));
    render();
    await screen.findByTestId('module-publish');
    tickAll();
    fireEvent.click(screen.getByTestId('module-publish-button'));
    const panel = await screen.findByTestId('module-step-up');
    await waitFor(() => expect(within(panel).getAllByRole('button')[0]).toHaveFocus());
    fireEvent.click(screen.getByTestId('module-step-up-cancel'));
    expect(screen.getByRole('heading', { level: 1 })).toHaveFocus();
  });

  it('RC2: a refused publish, a refused withdraw and a failed held retry each leave focus on the heading', { timeout: 30_000 }, async () => {
    getModuleDetail.mockResolvedValue(detail());
    publishModule.mockRejectedValueOnce(new ApiError(409, 'module.concurrent_change', 'race'));
    withdrawModule.mockRejectedValueOnce(new ApiError(409, 'module.illegal_transition', 'no'));
    render();
    await screen.findByTestId('module-publish');
    tickAll();
    const heading = screen.getByRole('heading', { level: 1 });
    screen.getByTestId('module-publish-button').focus();
    fireEvent.click(screen.getByTestId('module-publish-button'));
    await screen.findByText(t('module.error.concurrent_change'));
    expect(heading).toHaveFocus();

    screen.getByTestId('module-withdraw').focus();
    fireEvent.click(screen.getByTestId('module-withdraw'));
    await screen.findByText(t('module.error.illegal_transition'));
    expect(heading).toHaveFocus();

    // The held retry: the panel's Verify button unmounts with the panel, and the retried write fails.
    publishModule.mockRejectedValue(new ApiError(403, 'auth.step_up_required', 'step up'));
    requestStepUp.mockResolvedValue({});
    verifyStepUp.mockResolvedValue({});
    fireEvent.click(screen.getByTestId('module-publish-button'));
    await screen.findByTestId('module-step-up');
    fireEvent.click(screen.getByText(/send/i, { selector: 'button' }));
    fireEvent.change(await screen.findByTestId('module-step-up-code'), { target: { value: '123456' } });
    fireEvent.click(screen.getByTestId('module-step-up-verify'));
    await screen.findByText(t('module.detail.stepUpAgain'));
    expect(heading).toHaveFocus();
  });

  it('RC11: a fast double activation of Publish or Withdraw sends ONE write', { timeout: 20_000 }, async () => {
    getModuleDetail.mockResolvedValue(detail());
    publishModule.mockReturnValue(new Promise(() => undefined));
    withdrawModule.mockReturnValue(new Promise(() => undefined));
    render();
    await screen.findByTestId('module-publish');
    tickAll();
    const button = screen.getByTestId('module-publish-button');
    // Both presses land in ONE act scope, so no render (and no `busy`) comes between them — a fast double activation.
    act(() => {
      button.click();
      button.click();
    });
    await waitFor(() => expect(publishModule).toHaveBeenCalledTimes(1));
    await new Promise((r) => setTimeout(r, 30));
    expect(publishModule).toHaveBeenCalledTimes(1);
  });

  it('RC11: the same guard covers Withdraw', { timeout: 20_000 }, async () => {
    getModuleDetail.mockResolvedValue(detail({ current_state: 'active' }));
    withdrawModule.mockReturnValue(new Promise(() => undefined));
    render();
    const button = await screen.findByTestId('module-withdraw');
    act(() => {
      button.click();
      button.click();
    });
    await waitFor(() => expect(withdrawModule).toHaveBeenCalledTimes(1));
    await new Promise((r) => setTimeout(r, 30));
    expect(withdrawModule).toHaveBeenCalledTimes(1);
  });

  it('RC15: "Published." does not wait for the page’s refresh — and Publish stays off until the refreshed offer arrives', { timeout: 20_000 }, async () => {
    let resolveRefresh: (v: unknown) => void = () => undefined;
    getModuleDetail.mockResolvedValueOnce(detail()).mockReturnValue(new Promise((r) => { resolveRefresh = r; }));
    publishModule.mockResolvedValue({ module_id: MODULE, state: 'scheduled', published_event_type: 'module.scheduled' });
    render();
    await screen.findByTestId('module-publish');
    tickAll();
    fireEvent.click(screen.getByTestId('module-publish-button'));
    await waitFor(() => expect(screen.getByTestId('module-detail-live')).toHaveTextContent(t('module.detail.published')));
    expect(getModuleDetail).toHaveBeenCalledTimes(2); // the refresh is still running
    expect(screen.getByTestId('module-publish-button')).toBeDisabled(); // a second press would only meet a 409
    expect(screen.getByTestId('module-publish-button')).toHaveTextContent(t('module.detail.publish'));
    resolveRefresh(detail({ current_state: 'scheduled', publication: publication('module.scheduled') }));
    await waitFor(() => expect(screen.queryByTestId('module-publish')).toBeNull());
  });

  it('RC16: one registered member is "1 member", not "1 members"', { timeout: 20_000 }, async () => {
    getModuleDetail.mockResolvedValue(detail({ current_state: 'active', lead_count: 1 }));
    render();
    expect(await screen.findByTestId('module-lead-warning')).toHaveTextContent(t('module.detail.leadWarningOne'));
    expect(t('module.detail.leadWarningOne')).toBe(
      '1 member registered interest in this offer. A corrected copy starts with all places free; that member can register again, and the partner may receive a second lead for the same member.',
    );
  });

  it.each([
    ['scheduled', true],
    ['active', false],
    ['archived', false],
  ] as const)('RC16: "goes live at its opening time" only while the offer is scheduled (%s)', { timeout: 20_000 }, async (state, shown) => {
    getModuleDetail.mockResolvedValue(detail({ current_state: state, publication: publication('module.scheduled') }));
    render();
    const line = await screen.findByTestId('module-detail-publication');
    const key = shown ? 'module.detail.publishedScheduled' : 'module.detail.publishedActive';
    expect(line.textContent).toBe(t(key, { name: 'Ravi', at: formatIst('2026-11-02T05:00:00.000Z') }));
  });

  it('RC18: the partner’s Hindi name is marked lang="hi"', { timeout: 20_000 }, async () => {
    getModuleDetail.mockResolvedValue(detail());
    render();
    const line = await screen.findByTestId('module-detail-partner');
    expect(line).toHaveTextContent(t('module.detail.partner', { en: 'HDFC' }));
    const hi = within(line).getByText('एचडीएफसी');
    expect(hi).toHaveAttribute('lang', 'hi');
    expect(line).not.toHaveAttribute('lang'); // the English half stays English
  });
});

describe('ModuleDetailPage — patch-diff review of round 2 (PT)', () => {
  const renderCreated = (onCreatedShown = vi.fn()) =>
    renderWithClient(
      <ModuleDetailPage pariwarId={PARIWAR} moduleId={MODULE} created onCreatedShown={onCreatedShown} onBack={vi.fn()} onStartCorrectedCopy={vi.fn()} />,
    );

  it('PT2: a late first load does not take focus from where the admin has moved it — the draft is still announced', { timeout: 20_000 }, async () => {
    let resolveDetail: (v: unknown) => void = () => undefined;
    getModuleDetail.mockReturnValue(new Promise((r) => { resolveDetail = r; }));
    const elsewhere = document.createElement('input');
    document.body.appendChild(elsewhere);
    try {
      renderCreated();
      elsewhere.focus();
      resolveDetail(detail({ authored_by_viewer: true }));
      await waitFor(() => expect(screen.getByTestId('module-detail-live')).toHaveTextContent(t('module.detail.created')));
      expect(elsewhere).toHaveFocus();
    } finally {
      elsewhere.remove();
    }
  });

  it.each([
    ['another admin’s draft', { authored_by_viewer: false }],
    ['an offer that is no longer a draft', { authored_by_viewer: true, current_state: 'scheduled' as const }],
  ])('PT10: `?created=true` on %s announces nothing and moves no focus — the flag is still dropped', { timeout: 20_000 }, async (_l, over) => {
    getModuleDetail.mockResolvedValue(detail(over));
    const onCreatedShown = vi.fn();
    renderCreated(onCreatedShown);
    const live = await screen.findByTestId('module-detail-live');
    await waitFor(() => expect(onCreatedShown).toHaveBeenCalledTimes(1));
    expect(live).toBeEmptyDOMElement();
    expect(screen.getByRole('heading', { level: 1 })).not.toHaveFocus();
  });

  it('PT3: an error from BEFORE the write does not re-enable Publish on the old state; only a later result does', { timeout: 20_000 }, async () => {
    let resolveRefresh: (v: unknown) => void = () => undefined;
    getModuleDetail
      .mockResolvedValueOnce(detail())
      .mockRejectedValueOnce(new ApiError(500, 'internal.error', 'down')) // a background refresh fails: error WITH data
      .mockReturnValue(new Promise((r) => { resolveRefresh = r; })); // the post-write refresh is still running
    publishModule.mockResolvedValue({ module_id: MODULE, state: 'scheduled', published_event_type: 'module.scheduled' });
    render();
    await screen.findByTestId('module-publish');
    tickAll();
    act(() => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
    });
    await screen.findByTestId('module-detail-refresh-error');
    fireEvent.click(screen.getByTestId('module-publish-button'));
    await waitFor(() => expect(screen.getByTestId('module-detail-live')).toHaveTextContent(t('module.detail.published')));
    expect(screen.getByTestId('module-publish-button')).toBeDisabled();
    resolveRefresh(detail({ current_state: 'scheduled' }));
    await waitFor(() => expect(screen.queryByTestId('module-publish')).toBeNull());
  });

  it('PT3 / PU4: a refresh that FAILS after the write re-enables the buttons (the server is the judge of a second press)', { timeout: 20_000 }, async () => {
    // The post-write refresh is rejected only once "Published." is on screen, through a deferred — never in the same tick as
    // the write's result, so the outcome cannot depend on which millisecond each lands in (PU4).
    let rejectRefresh: (e: unknown) => void = () => undefined;
    getModuleDetail.mockResolvedValueOnce(detail()).mockReturnValue(new Promise((_r, j) => { rejectRefresh = j; }));
    publishModule.mockResolvedValue({ module_id: MODULE, state: 'scheduled', published_event_type: 'module.scheduled' });
    render();
    await screen.findByTestId('module-publish');
    tickAll();
    fireEvent.click(screen.getByTestId('module-publish-button'));
    await waitFor(() => expect(screen.getByTestId('module-detail-live')).toHaveTextContent(t('module.detail.published')));
    expect(screen.getByTestId('module-publish-button')).toBeDisabled(); // still waiting for the post-write result
    rejectRefresh(new ApiError(500, 'internal.error', 'down'));
    await screen.findByTestId('module-detail-refresh-error');
    await waitFor(() => expect(screen.getByTestId('module-publish-button')).toBeEnabled());
  });

  it('PT4: once the code is verified, focus goes to the heading while the held write is retried', { timeout: 20_000 }, async () => {
    getModuleDetail.mockResolvedValue(detail());
    publishModule.mockRejectedValueOnce(new ApiError(403, 'auth.step_up_required', 'step up')).mockReturnValue(new Promise(() => undefined));
    requestStepUp.mockResolvedValue({});
    verifyStepUp.mockResolvedValue({});
    render();
    await screen.findByTestId('module-publish');
    tickAll();
    fireEvent.click(screen.getByTestId('module-publish-button'));
    await screen.findByTestId('module-step-up');
    fireEvent.click(screen.getByText(/send/i, { selector: 'button' }));
    fireEvent.change(await screen.findByTestId('module-step-up-code'), { target: { value: '123456' } });
    screen.getByTestId('module-step-up-verify').focus();
    fireEvent.click(screen.getByTestId('module-step-up-verify'));
    await waitFor(() => expect(publishModule).toHaveBeenCalledTimes(2)); // the retry hangs
    expect(screen.queryByTestId('module-step-up')).toBeNull();
    expect(screen.getByRole('heading', { level: 1 })).toHaveFocus();
  });
});

describe('withdrawModule — the fetcher sends `{}` (QE15)', () => {
  it('POSTs JSON `{}` with the Idempotency-Key', async () => {
    const actual = await vi.importActual<typeof import('../src/api/client.js')>('../src/api/client.js');
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ module_id: MODULE, state: 'archived' }), { status: 200, headers: { 'content-type': 'application/json' } }),
    );
    try {
      await actual.withdrawModule(PARIWAR, MODULE, 'key-1');
      const [url, init] = fetchSpy.mock.calls[0]!;
      expect(String(url)).toBe(`/api/v1/p/${PARIWAR}/modules/${MODULE}/withdraw`);
      expect(init?.method).toBe('POST');
      expect(init?.body).toBe('{}');
      expect((init?.headers as Record<string, string>)['Idempotency-Key']).toBe('key-1');
    } finally {
      fetchSpy.mockRestore();
    }
  });
});
