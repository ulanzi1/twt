// Story 12.5b (Task 7; AC10, AC11; `2026-11-22-489` QE6 (A), QE7 (A), QE12 (A), QE13 (A)) — the partner's-own-page route in the
// admin console. Fetchers mocked (the real ApiError kept); the real hooks, derivations and copy run.
// Covers: the wizard asks the route FIRST in step (e) with ⛔ default and asks no places for `partner_form`; step (f) shows the
// partner's page field; the request carries the route's own fields and NULL for the other's; a 422 at ['partner_form_url'] opens
// step (f) and marks the field; the detail page names the route and the page, shows the figures with "fewer than 5", saves the
// partner's totals, and Publish needs the publisher's route (⛔ default) — a 409 `module.lead_route_mismatch` says what to do.
// ⚠ jsdom keeps focus on a disabled button ([[project_jsdom_disabled_button_keeps_focus]]): focus legs here assert only where focus
// is SENT, ⛔ that it left a disabled control.

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { MODULE_PARTNER_FORM_STAGE_LABEL_MAX, type ModuleDetailResponse, type ModuleScopeOptionsResponse } from '@twt/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithClient } from './_helpers.js';

const PARIWAR = '11111111-1111-4111-8111-111111111111';
const PARTNER = '0f8fad5b-d9cb-469f-a165-70867728950e';
const MODULE = '6ba7b810-9dad-41d1-80b4-00c04fd430c8';
const PAGE = 'https://partner.example/apply?offer=twt-bihar-lic';

const listModulePartners = vi.fn();
const getModuleScopeOptions = vi.fn();
const authorModule = vi.fn();
const getModuleDetail = vi.fn();
const publishModule = vi.fn();
const recordPartnerFormTotals = vi.fn();
vi.mock('../src/api/client.js', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    listModulePartners: (p: string) => listModulePartners(p),
    getModuleScopeOptions: (p: string) => getModuleScopeOptions(p),
    authorModule: (p: string, b: unknown, k: string) => authorModule(p, b, k),
    getModuleDetail: (p: string, m: string) => getModuleDetail(p, m),
    publishModule: (p: string, m: string, b: unknown, k: string) => publishModule(p, m, b, k),
    recordPartnerFormTotals: (p: string, m: string, b: unknown, k: string) => recordPartnerFormTotals(p, m, b, k),
  };
});

const { ModuleWizard } = await import('../src/modules/marketplace/ModuleWizard.js');
const { ModuleDetailPage } = await import('../src/modules/marketplace/ModuleDetailPage.js');
const { resolveEn: t, MODULE_EN_KEYS } = await import('../src/modules/marketplace/i18n-en.js');
const { ApiError } = await import('../src/api/client.js');
const derive = await import('../src/modules/marketplace/derive.js');

const options = (): ModuleScopeOptionsResponse => ({
  geo_tree_version: null,
  states: [],
  districts: [{ value: 'Gaya', state: null, usable: true, unusable_reason: null }],
  district_source: 'workplace_districts',
  districts_truncated: false,
});

const below = { figure: null, below_floor: true };
const withheld = { figure: null, below_floor: false, withheld: true };
function partnerFormDetail(over: Partial<ModuleDetailResponse> = {}): ModuleDetailResponse {
  return {
    module_id: MODULE,
    pariwar_id: PARIWAR,
    partner_id: PARTNER,
    partner_display_name_en: 'LIC',
    partner_display_name_hi: 'एलआईसी',
    name_en: 'Term plan',
    name_hi: 'टर्म प्लान',
    description_en: 'A plan.',
    description_hi: 'योजना।',
    eligibility_filter: { version: 1, clauses: [] },
    scope_filter: { version: 1, scope: 'members-all' },
    valid_from: '2026-11-05T05:00:00.000Z',
    valid_until: '2026-12-05T05:00:00.000Z',
    slot_capacity: null,
    slots_remaining: null,
    lead_route: 'partner_form',
    lead_handoff_url: null,
    lead_handoff_signing_key_secret_name: null,
    partner_form_url: PAGE,
    branding_bundle: { version: 1, logo_object_key: null, accent_color_hex: null },
    current_state: 'draft',
    archive_reason: null,
    created_at: '2026-11-01T00:00:00.000Z',
    updated_at: '2026-11-01T00:00:00.000Z',
    author_display_name: 'Asha',
    authored_by_viewer: false,
    publication: null,
    lead_count: 0,
    partner_form_figures: {
      // RD1 (Decision `2026-11-22-490` (1)): the day below lists three kinds below 5, so their all-days figures are withheld.
      counts: { card_shown: { figure: 12, below_floor: false, withheld: false }, card_opened: withheld, went_to_partner: withheld, came_back: withheld },
      days: [{ day: '2026-11-20', counts: { card_shown: { figure: 12, below_floor: false }, card_opened: below, went_to_partner: below, came_back: below } }],
      partner_totals: [
        {
          totals_id: '9b2c4a10-0d8f-4b8e-9f43-1c2d3e4f5a6b',
          period_start: '2026-11-01',
          period_end: '2026-11-30',
          entered_at: '2026-11-21T06:00:00.000Z',
          stages: [
            { order: 1, label: 'Started', figure: 40, below_floor: false },
            { order: 2, label: 'Finished', figure: null, below_floor: true },
          ],
        },
      ],
    },
    ...over,
  };
}

beforeEach(() => {
  for (const f of [listModulePartners, getModuleScopeOptions, authorModule, getModuleDetail, publishModule, recordPartnerFormTotals]) f.mockReset();
  listModulePartners.mockResolvedValue({
    items: [{ partner_id: PARTNER, display_name_en: 'LIC', display_name_hi: 'एलआईसी', created_at: '2026-11-01T00:00:00.000Z' }],
  });
  getModuleScopeOptions.mockResolvedValue(options());
});

const next = (): void => {
  fireEvent.click(screen.getByTestId('wizard-next'));
};
const reason = (): string | null => screen.queryByTestId('wizard-reason')?.textContent ?? null;

/** Steps (a)–(d) answered; ends on step (e). */
async function toRouteStep(): Promise<void> {
  await waitFor(() => expect(screen.getByRole('option', { name: 'LIC / एलआईसी' })).toBeInTheDocument());
  fireEvent.change(screen.getByTestId('partner-select'), { target: { value: PARTNER } });
  for (const [id, v] of [['field-name-en', 'Term plan'], ['field-name-hi', 'टर्म प्लान'], ['field-description-en', 'A plan.'], ['field-description-hi', 'योजना।']] as const) {
    fireEvent.change(screen.getByTestId(id), { target: { value: v } });
  }
  next();
  fireEvent.click(screen.getByTestId('eligibility-all'));
  next();
  await screen.findByTestId('scope-picker');
  fireEvent.click(screen.getByTestId('scope-kind-members-all'));
  next();
  fireEvent.change(screen.getByTestId('field-validFrom'), { target: { value: '2026-11-05T10:30' } });
  fireEvent.change(screen.getByTestId('field-validUntil'), { target: { value: '2026-12-05T10:30' } });
  next();
}

describe('Story 12.5b — the wizard asks the route (QE7 (A))', () => {
  it('step (e) asks the route FIRST with ⛔ default; partner_form asks ⛔ places; (f) asks the partner page; the request carries it and NULLs the rest', { timeout: 30_000 }, async () => {
    renderWithClient(<ModuleWizard pariwarId={PARIWAR} onCreated={vi.fn()} />);
    await toRouteStep();
    expect(screen.getByTestId('wizard-step-heading')).toHaveTextContent(t('module.wizard.step.e'));
    const group = screen.getByRole('group', { name: t('module.route.question') });
    expect(within(group).getAllByRole('radio').every((r) => !(r as HTMLInputElement).checked)).toBe(true); // ⛔ default
    expect(reason()).toBe(t('module.reason.leadRoute'));
    expect(screen.getByTestId('wizard-next')).toBeDisabled();
    // Each option says what it means for the member's details.
    expect(group).toHaveTextContent(t('module.route.trust_sends.hint'));
    expect(group).toHaveTextContent(t('module.route.partner_form.hint'));
    fireEvent.click(screen.getByTestId('route-partner_form'));
    expect(screen.queryByTestId('places-question')).toBeNull();
    expect(screen.getByTestId('places-none')).toHaveTextContent(t('module.places.none'));
    expect(reason()).toBeNull();
    next();
    // (f): the partner's page — ⛔ handoff URL, ⛔ secret.
    expect(screen.queryByTestId('field-lead-url')).toBeNull();
    expect(screen.queryByTestId('field-secret-name')).toBeNull();
    expect(screen.getByTestId('partner-form-copy')).toHaveTextContent(t('module.partnerForm.copy'));
    expect(reason()).toBe(t('module.reason.partnerFormUrl'));
    fireEvent.change(screen.getByTestId('field-partner-form-url'), { target: { value: 'http://partner.example/x' } });
    expect(reason()).toBe(t('module.reason.partnerFormUrlHttps'));
    fireEvent.change(screen.getByTestId('field-partner-form-url'), { target: { value: `${PAGE}#top` } });
    expect(reason()).toBe(t('module.reason.partnerFormUrlFragment'));
    fireEvent.change(screen.getByTestId('field-partner-form-url'), { target: { value: ` ${PAGE} ` } });
    expect(reason()).toBeNull();
    next();
    // The summary restates the route and the page as it will be SENT (trimmed).
    expect(screen.getByTestId('summary-route')).toHaveTextContent(t('module.route.partner_form'));
    expect(screen.getByTestId('summary-places')).toHaveTextContent(t('module.places.none'));
    expect(screen.getByTestId('summary-partner-form-url')).toHaveTextContent(t('module.detail.partnerFormUrl', { url: PAGE }));
    authorModule.mockResolvedValue({ module_id: MODULE, state: 'draft' });
    fireEvent.click(screen.getByTestId('wizard-create'));
    await waitFor(() => expect(authorModule).toHaveBeenCalledTimes(1));
    expect(authorModule.mock.calls[0]![1]).toMatchObject({
      lead_route: 'partner_form',
      partner_form_url: PAGE,
      slot_capacity: null,
      lead_handoff_url: null,
      lead_handoff_signing_key_secret_name: null,
    });
  });

  it('G25: a 422 at [partner_form_url] opens step (f), names the field and marks it aria-invalid', { timeout: 30_000 }, async () => {
    renderWithClient(<ModuleWizard pariwarId={PARIWAR} onCreated={vi.fn()} />);
    await toRouteStep();
    fireEvent.click(screen.getByTestId('route-partner_form'));
    next();
    fireEvent.change(screen.getByTestId('field-partner-form-url'), { target: { value: 'https://partner.example:8443/x' } });
    next();
    authorModule.mockRejectedValue(
      new ApiError(422, 'module.manifest_invalid', 'invalid', { issues: [{ path: ['partner_form_url'], message: 'partner_form_url must not name a port' }] }),
    );
    fireEvent.click(screen.getByTestId('wizard-create'));
    await waitFor(() => expect(screen.getByTestId('wizard-step-heading')).toHaveTextContent(t('module.wizard.step.f')));
    expect(screen.getByTestId('wizard-issue')).toHaveTextContent(
      t('module.wizard.issueField', { field: t('module.field.partnerFormUrl'), message: 'partner_form_url must not name a port' }),
    );
    expect(screen.getByTestId('field-partner-form-url')).toHaveAttribute('aria-invalid', 'true');
    // Review R2P14: the issue text did NOT replace the page-copy description — the field is described by BOTH.
    const field = screen.getByTestId('field-partner-form-url');
    expect(field).toHaveAccessibleDescription(expect.stringContaining(t('module.partnerForm.copy')));
    expect(field).toHaveAccessibleDescription(expect.stringContaining('partner_form_url must not name a port'));
  });

  it('R2P14 (round 3): a 422 at [lead_route] opens step (e); BOTH radios carry aria-invalid and are described by the hint AND the issue', { timeout: 30_000 }, async () => {
    renderWithClient(<ModuleWizard pariwarId={PARIWAR} onCreated={vi.fn()} />);
    await toRouteStep();
    fireEvent.click(screen.getByTestId('route-partner_form'));
    next();
    fireEvent.change(screen.getByTestId('field-partner-form-url'), { target: { value: PAGE } });
    next();
    authorModule.mockRejectedValue(new ApiError(422, 'module.manifest_invalid', 'invalid', { issues: [{ path: ['lead_route'], message: 'lead_route is not valid' }] }));
    fireEvent.click(screen.getByTestId('wizard-create'));
    await waitFor(() => expect(screen.getByTestId('wizard-step-heading')).toHaveTextContent(t('module.wizard.step.e')));
    for (const route of ['trust_sends', 'partner_form'] as const) {
      const radio = screen.getByTestId(`route-${route}`);
      expect(radio).toHaveAttribute('aria-invalid', 'true');
      expect(radio).toHaveAccessibleName(derive.describeRoute(route).name);
      expect(radio).toHaveAccessibleDescription(expect.stringContaining(derive.describeRoute(route).meaning));
      expect(radio).toHaveAccessibleDescription(expect.stringContaining('lead_route is not valid'));
    }
    expect(screen.getByTestId('route-question')).not.toHaveAttribute('aria-invalid');
    // The whole option is ONE label — clicking the hint selects the radio (the click target is the row, ⛔ the short name).
    fireEvent.click(screen.getByText(derive.describeRoute('trust_sends').meaning));
    expect(screen.getByTestId('route-trust_sends')).toBeChecked();
  });

  it('R2P14: each route radio is NAMED by its name only and DESCRIBED by its hint once; an unchosen route marks the radios, ⛔ the group', { timeout: 30_000 }, async () => {
    renderWithClient(<ModuleWizard pariwarId={PARIWAR} onCreated={vi.fn()} />);
    await toRouteStep();
    for (const route of ['trust_sends', 'partner_form'] as const) {
      const radio = screen.getByTestId(`route-${route}`);
      expect(radio).toHaveAccessibleName(derive.describeRoute(route).name);
      expect(radio).toHaveAccessibleDescription(derive.describeRoute(route).meaning);
    }
    expect(screen.getByTestId('route-question')).not.toHaveAttribute('aria-invalid');
  });

  it('a trust_sends offer still asks places and the hand-off fields; switching routes clears the places answer', { timeout: 30_000 }, async () => {
    renderWithClient(<ModuleWizard pariwarId={PARIWAR} onCreated={vi.fn()} />);
    await toRouteStep();
    fireEvent.click(screen.getByTestId('route-trust_sends'));
    expect(reason()).toBe(t('module.reason.placesMode'));
    fireEvent.click(screen.getByTestId('places-fixed'));
    fireEvent.change(screen.getByTestId('field-places'), { target: { value: '7' } });
    fireEvent.click(screen.getByTestId('route-partner_form'));
    fireEvent.click(screen.getByTestId('route-trust_sends'));
    expect(screen.queryByTestId('field-places')).toBeNull(); // the fixed number was dropped with the switch
    expect(reason()).toBe(t('module.reason.placesMode'));
  });
});

describe('Story 12.5b — derivations', () => {
  it('fromModule carries the route and the page ("Start a corrected copy" — AC11); FIELD_STEP maps the two new fields', () => {
    const s = derive.fromModule(partnerFormDetail());
    expect(s).toMatchObject({ leadRoute: 'partner_form', partnerFormUrl: PAGE, leadHandoffUrl: '', secretName: '', placesMode: null });
    expect(derive.firstInvalidStep(s)).toBeNull();
    expect(derive.toAuthorRequest(s)).toMatchObject({ lead_route: 'partner_form', partner_form_url: PAGE, slot_capacity: null });
    const step = (x: string) => derive.WIZARD_STEPS.indexOf(x as (typeof derive.WIZARD_STEPS)[number]);
    expect(derive.issueToStep(['lead_route'])).toBe(step('e'));
    expect(derive.issueToStep(['partner_form_url'])).toBe(step('f'));
    expect(derive.issueFieldName(['partner_form_url'])).toBe('partner_form_url');
  });

  it('figureText shows "fewer than 5" for a floored figure; the totals draft validates and builds its request', () => {
    expect(derive.figureText({ figure: 12, below_floor: false })).toBe('12');
    expect(derive.figureText({ figure: null, below_floor: true })).toBe(t('module.figures.fewerThan5'));
    expect(derive.figureText({ figure: null, below_floor: false, withheld: true })).toBe(t('module.figures.notShown'));
    expect(derive.figureText({ figure: 12, below_floor: false, withheld: false })).toBe('12');
    const d = { periodStart: '2026-11-01', periodEnd: '2026-11-30', stages: [{ label: ' Started ', figure: '3' }] };
    expect(derive.validateTotalsDraft(d)).toBeNull();
    expect(derive.toTotalsRequest(d)).toEqual({ period_start: '2026-11-01', period_end: '2026-11-30', stages: [{ label: 'Started', figure: 3 }] });
    expect(derive.validateTotalsDraft({ ...d, periodEnd: '2026-10-01' })).toBe(t('module.totals.reasonPeriod'));
    for (const bad of ['', '2.5', '-1', 'x']) {
      expect(derive.validateTotalsDraft({ ...d, stages: [{ label: 'S', figure: bad }] })).toBe(t('module.totals.reasonStage'));
    }
    expect(derive.validateTotalsDraft({ ...d, stages: [{ label: 'x'.repeat(81), figure: '9' }] })).toBe(t('module.totals.reasonStage'));
    expect(derive.moduleErrorGuidance('module.lead_route_mismatch', 'detail')).toBe(t('module.error.lead_route_mismatch'));
  });

  it('⛔ "report", "receipt" or "invoice" in ANY admin copy key (the microcopy gate scans admin code) — every key, ⛔ a name filter, ⛔ a swallowed throw', () => {
    // Review R2P5: the earlier filter was a case-sensitive regex over key names and missed six new keys (`module.reason.leadRoute`,
    // `module.field.leadRoute`, `module.detail.publishRoute*`, `module.detail.leadsNotUsed`, `module.places.none`). Walk them ALL.
    // A key's own variables are supplied as the resolver names them ("needs the parameter 'total'"); any OTHER failure fails the test.
    const render = (k: string): string => {
      const params: Record<string, string | number> = {};
      for (let tries = 0; tries < 12; tries += 1) {
        try {
          return t(k, params);
        } catch (e) {
          const missing = /needs the parameter '(\w+)'/.exec(String(e))?.[1];
          if (missing === undefined) throw e;
          params[missing] = 'x';
        }
      }
      throw new Error(`${k}: too many parameters`);
    };
    for (const k of MODULE_EN_KEYS) expect(render(k), k).not.toMatch(/report|receipt|invoice/i);
    // The six keys the old filter skipped are among those walked.
    for (const k of ['module.reason.leadRoute', 'module.field.leadRoute', 'module.detail.publishRoute', 'module.detail.publishRouteReason', 'module.detail.leadsNotUsed', 'module.places.none']) {
      expect(MODULE_EN_KEYS, k).toContain(k);
    }
  });
});

describe('Story 12.5b — the detail page (AC10, AC11)', () => {
  function renderDetail(): void {
    renderWithClient(<ModuleDetailPage pariwarId={PARIWAR} moduleId={MODULE} onBack={vi.fn()} onStartCorrectedCopy={vi.fn()} />);
  }

  it('names the route and the partner page; registrations "not used"; the figures show "fewer than 5" and the newest partner entry', { timeout: 20_000 }, async () => {
    getModuleDetail.mockResolvedValue(partnerFormDetail());
    renderDetail();
    expect(await screen.findByTestId('module-detail-route')).toHaveTextContent(t('module.detail.route', { route: t('module.route.partner_form') }));
    expect(screen.getByTestId('module-detail-partner-form-url')).toHaveTextContent(t('module.detail.partnerFormUrl', { url: PAGE }));
    expect(screen.getByTestId('module-detail-leads-not-used')).toHaveTextContent(t('module.detail.leadsNotUsed'));
    const total = screen.getByTestId('module-figures-total');
    expect(total).toHaveTextContent('12');
    // RD1: the all-days figure of each kind with a day below 5 reads "not shown" — ⛔ "fewer than 5" (its form tells nothing).
    expect(within(total).getAllByText(t('module.figures.notShown'))).toHaveLength(3);
    expect(within(total).queryByText(t('module.figures.fewerThan5'))).toBeNull();
    expect(within(screen.getByTestId('module-figures-day-2026-11-20')).getAllByText(t('module.figures.fewerThan5'))).toHaveLength(3);
    expect(screen.getByTestId('module-figures-day-2026-11-20')).toBeInTheDocument();
    const totals = screen.getByTestId('module-partner-totals');
    expect(totals).toHaveTextContent('Started: 40');
    expect(totals).toHaveTextContent(`Finished: ${t('module.figures.fewerThan5')}`);
    // ⛔ a lead hand-off line for this route.
    expect(screen.queryByText(/Lead hand-off address/)).toBeNull();
  });

  it('a trust_sends offer shows ⛔ figures section and ⛔ totals form', { timeout: 20_000 }, async () => {
    getModuleDetail.mockResolvedValue(
      partnerFormDetail({
        lead_route: 'trust_sends',
        partner_form_url: null,
        lead_handoff_url: 'https://leads.partner.example/lic',
        lead_handoff_signing_key_secret_name: 'lic-key',
        partner_form_figures: null,
      }),
    );
    renderDetail();
    expect(await screen.findByTestId('module-detail-route')).toHaveTextContent(t('module.route.trust_sends'));
    expect(screen.queryByTestId('module-figures')).toBeNull();
    expect(screen.queryByTestId('module-totals-form')).toBeNull();
  });

  // Review RP3 (checklist family 13). "Add a step" unmounts when the twentieth step is added, and a button that unmounts under the
  // keyboard drops focus to <body>. Every add now moves focus to the NEW step's first field (the next thing to type), and the
  // twentieth also says, in the always-mounted live region, that no more steps can be added.
  it('RP3: "Add a step" moves focus to the new step\'s label; adding the 20th (the button goes) keeps focus there and announces the limit', { timeout: 20_000 }, async () => {
    getModuleDetail.mockResolvedValue(partnerFormDetail());
    renderDetail();
    await screen.findByTestId('module-totals-form');
    const live = screen.getByTestId('module-totals-live');
    const add = (): HTMLElement => screen.getByTestId('totals-stage-add');
    add().focus();
    fireEvent.click(add());
    expect(document.activeElement).toBe(screen.getByTestId('totals-stage-label-1'));
    expect(live).toHaveTextContent('');
    for (let n = 3; n <= 19; n += 1) fireEvent.click(add());
    expect(screen.getAllByTestId(/^totals-stage-label-/)).toHaveLength(19);
    add().focus();
    fireEvent.click(add()); // the 20th — the button unmounts with this press
    expect(screen.queryByTestId('totals-stage-add')).toBeNull();
    expect(document.activeElement).toBe(screen.getByTestId('totals-stage-label-19'));
    expect(document.activeElement).not.toBe(document.body);
    expect(live).toHaveTextContent(t('module.totals.stagesLimit', { n: 20 }));
    // Removing one brings the button back and clears the limit line.
    fireEvent.click(screen.getByTestId('totals-stage-remove-19'));
    expect(add()).toBeInTheDocument();
    expect(live).not.toHaveTextContent(t('module.totals.stagesLimit', { n: 20 }));
  });

  it('AC10: the totals form — Save waits for a valid period and stages; it sends the request and says it was saved', { timeout: 20_000 }, async () => {
    getModuleDetail.mockResolvedValue(partnerFormDetail());
    recordPartnerFormTotals.mockResolvedValue({ totals_id: '9b2c4a10-0d8f-4b8e-9f43-1c2d3e4f5a6c', stages: 2 });
    renderDetail();
    await screen.findByTestId('module-totals-form');
    expect(screen.getByTestId('totals-save')).toBeDisabled();
    expect(screen.getByTestId('module-totals-reason')).toHaveTextContent(t('module.totals.reasonPeriod'));
    fireEvent.change(screen.getByTestId('totals-period-start'), { target: { value: '2026-11-01' } });
    fireEvent.change(screen.getByTestId('totals-period-end'), { target: { value: '2026-11-30' } });
    fireEvent.change(screen.getByTestId('totals-stage-label-0'), { target: { value: 'Started' } });
    fireEvent.change(screen.getByTestId('totals-stage-figure-0'), { target: { value: '41' } });
    fireEvent.click(screen.getByTestId('totals-stage-add'));
    fireEvent.change(screen.getByTestId('totals-stage-label-1'), { target: { value: 'Finished' } });
    fireEvent.change(screen.getByTestId('totals-stage-figure-1'), { target: { value: '3' } });
    expect(screen.getByTestId('totals-save')).toBeEnabled();
    fireEvent.click(screen.getByTestId('totals-save'));
    await waitFor(() => expect(recordPartnerFormTotals).toHaveBeenCalledTimes(1));
    expect(recordPartnerFormTotals.mock.calls[0]!.slice(0, 3)).toEqual([
      PARIWAR,
      MODULE,
      { period_start: '2026-11-01', period_end: '2026-11-30', stages: [{ label: 'Started', figure: 41 }, { label: 'Finished', figure: 3 }] },
    ]);
    expect(typeof recordPartnerFormTotals.mock.calls[0]![3]).toBe('string'); // an Idempotency-Key per click
    await waitFor(() => expect(screen.getByTestId('module-totals-live')).toHaveTextContent(t('module.totals.saved')));
  });

  it('AC11 (QE6 (A)): Publish waits for the publisher\'s route (⛔ default); a 409 lead_route_mismatch says withdraw and copy', { timeout: 20_000 }, async () => {
    getModuleDetail.mockResolvedValue(partnerFormDetail());
    publishModule.mockRejectedValue(new ApiError(409, 'module.lead_route_mismatch', 'mismatch', { offer_lead_route: 'partner_form' }));
    renderDetail();
    await screen.findByTestId('module-publish');
    const radios = within(screen.getByTestId('module-publish-route')).getAllByRole('radio');
    expect(radios.every((r) => !(r as HTMLInputElement).checked)).toBe(true);
    for (const k of ['tone', 'hindi', 'partner']) fireEvent.click(screen.getByTestId(`module-tick-${k}`));
    expect(screen.getByTestId('module-publish-button')).toBeDisabled();
    expect(screen.getByTestId('module-publish-route-reason')).toHaveTextContent(t('module.detail.publishRouteReason'));
    fireEvent.click(screen.getByTestId('module-publish-route-trust_sends'));
    expect(screen.getByTestId('module-publish-button')).toBeEnabled();
    fireEvent.click(screen.getByTestId('module-publish-button'));
    await waitFor(() => expect(publishModule).toHaveBeenCalledTimes(1));
    expect((publishModule.mock.calls[0]![2] as { lead_route: string }).lead_route).toBe('trust_sends');
    await waitFor(() => expect(screen.getByTestId('module-detail-message')).toHaveTextContent(t('module.error.lead_route_mismatch')));
  });

  // ── Review round 2 (R2P7, R2P8, R2P14, R2P17) ──
  const fillTotals = (): void => {
    fireEvent.change(screen.getByTestId('totals-period-start'), { target: { value: '2026-11-01' } });
    fireEvent.change(screen.getByTestId('totals-period-end'), { target: { value: '2026-11-30' } });
    fireEvent.change(screen.getByTestId('totals-stage-label-0'), { target: { value: 'Started' } });
    fireEvent.change(screen.getByTestId('totals-stage-figure-0'), { target: { value: '41' } });
  };

  it('R2P7: editing the form retires the last result ("saved" is about what was sent, ⛔ the next period)', { timeout: 20_000 }, async () => {
    getModuleDetail.mockResolvedValue(partnerFormDetail());
    recordPartnerFormTotals.mockResolvedValue({ totals_id: '9b2c4a10-0d8f-4b8e-9f43-1c2d3e4f5a6c', stages: 1 });
    renderDetail();
    await screen.findByTestId('module-totals-form');
    fillTotals();
    fireEvent.click(screen.getByTestId('totals-save'));
    await waitFor(() => expect(screen.getByTestId('module-totals-live')).toHaveTextContent(t('module.totals.saved')));
    fireEvent.change(screen.getByTestId('totals-period-start'), { target: { value: '2026-12-01' } });
    expect(screen.getByTestId('module-totals-live')).not.toHaveTextContent(t('module.totals.saved'));
  });

  it('R2P7: a double click sends ONE write; focus returns to the form only when the admin has not moved on', { timeout: 20_000 }, async () => {
    getModuleDetail.mockResolvedValue(partnerFormDetail());
    let settle!: (v: { totals_id: string; stages: number }) => void;
    recordPartnerFormTotals.mockReturnValue(new Promise((resolve) => (settle = resolve)));
    renderDetail();
    await screen.findByTestId('module-totals-form');
    fillTotals();
    const save = screen.getByTestId('totals-save');
    fireEvent.click(save);
    fireEvent.click(save);
    await waitFor(() => expect(recordPartnerFormTotals).toHaveBeenCalledTimes(1));
    // The admin moves on while the write runs: focus is claimed by another control, ⛔ pulled back to the heading.
    const other = screen.getByTestId('module-withdraw');
    other.focus();
    settle({ totals_id: '9b2c4a10-0d8f-4b8e-9f43-1c2d3e4f5a6c', stages: 1 });
    await waitFor(() => expect(screen.getByTestId('module-totals-live')).toHaveTextContent(t('module.totals.saved')));
    expect(document.activeElement).toBe(other);
    expect(recordPartnerFormTotals).toHaveBeenCalledTimes(1);
  });

  it('R2P7: a date before 2000 or an impossible date is named BEFORE Save (⛔ the generic 422)', () => {
    const d = { periodStart: '2026-11-01', periodEnd: '2026-11-30', stages: [{ label: 'S', figure: '9' }] };
    for (const bad of [{ periodStart: '1999-12-31' }, { periodStart: '2026-02-30', periodEnd: '2026-03-01' }]) {
      expect(derive.validateTotalsDraft({ ...d, ...bad })).toBe(t('module.totals.reasonYear'));
    }
    expect(derive.validateTotalsDraft({ ...d, periodStart: '2000-01-01' })).toBeNull();
  });

  it('R2P17: a 409 module.partner_form_totals_overlap names the way out (enter the same dates to correct)', { timeout: 20_000 }, async () => {
    getModuleDetail.mockResolvedValue(partnerFormDetail());
    recordPartnerFormTotals.mockRejectedValue(
      new ApiError(409, 'module.partner_form_totals_overlap', 'overlap', { existing_period_start: '2026-11-01', existing_period_end: '2026-11-30' }),
    );
    renderDetail();
    await screen.findByTestId('module-totals-form');
    fillTotals();
    fireEvent.click(screen.getByTestId('totals-save'));
    await waitFor(() =>
      expect(screen.getByTestId('module-totals-error')).toHaveTextContent(t('module.error.partner_form_totals_overlap_dates', { from: '2026-11-01', until: '2026-11-30' })),
    );
  });

  it('R2P14: removing a step says so in the live region, renumbers, and sends focus to the row now in its place (⛔ the heading)', { timeout: 20_000 }, async () => {
    getModuleDetail.mockResolvedValue(partnerFormDetail());
    renderDetail();
    await screen.findByTestId('module-totals-form');
    fireEvent.click(screen.getByTestId('totals-stage-add'));
    fireEvent.click(screen.getByTestId('totals-stage-add'));
    fireEvent.change(screen.getByTestId('totals-stage-label-1'), { target: { value: 'Second' } });
    fireEvent.change(screen.getByTestId('totals-stage-label-2'), { target: { value: 'Third' } });
    fireEvent.click(screen.getByTestId('totals-stage-remove-1'));
    expect(screen.getByTestId('module-totals-live')).toHaveTextContent(t('module.totals.stageRemoved', { n: 2 }));
    expect(screen.getAllByTestId(/^totals-stage-label-/)).toHaveLength(2);
    expect(screen.getByTestId('totals-stage-label-1')).toHaveValue('Third'); // renumbered
    expect(document.activeElement).toBe(screen.getByTestId('totals-stage-label-1'));
    // The last row removed: focus goes to the one before it.
    fireEvent.click(screen.getByTestId('totals-stage-remove-1'));
    expect(document.activeElement).toBe(screen.getByTestId('totals-stage-label-0'));
  });

  it('R2P14: the reason regions are ALWAYS mounted (a live region inserted with its text is not announced); the figures table has a name', { timeout: 20_000 }, async () => {
    getModuleDetail.mockResolvedValue(partnerFormDetail());
    renderDetail();
    await screen.findByTestId('module-totals-form');
    expect(screen.getByTestId('module-publish-route-reason')).toHaveAttribute('role', 'status');
    expect(screen.getByTestId('module-totals-reason')).toHaveAttribute('role', 'status');
    // Once a route is chosen / the form is valid the regions stay, empty.
    fireEvent.click(screen.getByTestId('module-publish-route-trust_sends'));
    expect(screen.getByTestId('module-publish-route-reason')).toBeEmptyDOMElement();
    fillTotals();
    expect(screen.getByTestId('module-totals-reason')).toBeEmptyDOMElement();
    expect(within(screen.getByTestId('module-figures')).getByRole('table')).toHaveAccessibleName(t('module.figures.caption'));
  });

  it('R2P8: the mismatch copy says which way the offer works and that choosing it publishes; withdraw is the way out only if that is not wanted', () => {
    const text = t('module.error.lead_route_mismatch');
    expect(text).toMatch(/Choose that way to publish it/);
    expect(text).toMatch(/withdraw the offer and start a corrected copy/);
  });

  // ── Review round 3 (the adversarial review of the round-2 patches) ──
  it('R3: focus goes back to the totals heading when the admin has NOT moved on (the positive leg of focusIfUnclaimed)', { timeout: 20_000 }, async () => {
    getModuleDetail.mockResolvedValue(partnerFormDetail());
    recordPartnerFormTotals.mockResolvedValue({ totals_id: '9b2c4a10-0d8f-4b8e-9f43-1c2d3e4f5a6c', stages: 1 });
    renderDetail();
    await screen.findByTestId('module-totals-form');
    fillTotals();
    (document.activeElement as HTMLElement | null)?.blur();
    fireEvent.click(screen.getByTestId('totals-save'));
    await waitFor(() => expect(screen.getByTestId('module-totals-live')).toHaveTextContent(t('module.totals.saved')));
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: t('module.totals.heading') }));
  });

  it('R3: a "Step n removed" note is announced EVERY time (a new node), the last-step wording does not claim a renumbering, and a save retires it', { timeout: 20_000 }, async () => {
    getModuleDetail.mockResolvedValue(partnerFormDetail());
    recordPartnerFormTotals.mockResolvedValue({ totals_id: '9b2c4a10-0d8f-4b8e-9f43-1c2d3e4f5a6c', stages: 1 });
    renderDetail();
    await screen.findByTestId('module-totals-form');
    const live = screen.getByTestId('module-totals-live');
    for (let n = 0; n < 3; n += 1) fireEvent.click(screen.getByTestId('totals-stage-add')); // 4 steps
    fireEvent.click(screen.getByTestId('totals-stage-remove-1'));
    const first = within(live).getByText(t('module.totals.stageRemoved', { n: 2 }));
    fireEvent.click(screen.getByTestId('totals-stage-remove-1')); // the same step number again
    const second = within(live).getByText(t('module.totals.stageRemoved', { n: 2 }));
    expect(second).not.toBe(first); // a REMOUNTED node: identical text in place is not re-read
    fireEvent.click(screen.getByTestId('totals-stage-remove-1')); // now the LAST step (2 → 1 step left)
    expect(within(live).getByText(t('module.totals.lastStageRemoved', { n: 2 }))).toBeInTheDocument();
    expect(live).not.toHaveTextContent('renumbered');
  });

  it('R3: Save itself retires a "Step n removed" note — the form is already valid when the note appears, so no edit clears it first', { timeout: 20_000 }, async () => {
    getModuleDetail.mockResolvedValue(partnerFormDetail());
    recordPartnerFormTotals.mockResolvedValue({ totals_id: '9b2c4a10-0d8f-4b8e-9f43-1c2d3e4f5a6c', stages: 1 });
    renderDetail();
    await screen.findByTestId('module-totals-form');
    const live = screen.getByTestId('module-totals-live');
    fillTotals();
    fireEvent.click(screen.getByTestId('totals-stage-add'));
    fireEvent.click(screen.getByTestId('totals-stage-remove-1')); // the note appears AFTER the last edit; the form is valid
    expect(live).toHaveTextContent(t('module.totals.lastStageRemoved', { n: 2 }));
    fireEvent.click(screen.getByTestId('totals-save'));
    await waitFor(() => expect(live).toHaveTextContent(t('module.totals.saved')));
    expect(live).not.toHaveTextContent(t('module.totals.lastStageRemoved', { n: 2 }));
  });

  it('R3: an overlap 409 names the period it clashes with (the 409 carries it)', { timeout: 20_000 }, async () => {
    getModuleDetail.mockResolvedValue(partnerFormDetail());
    recordPartnerFormTotals.mockRejectedValue(
      new ApiError(409, 'module.partner_form_totals_overlap', 'overlap', { existing_period_start: '2026-10-01', existing_period_end: '2026-10-31' }),
    );
    renderDetail();
    await screen.findByTestId('module-totals-form');
    fillTotals();
    fireEvent.click(screen.getByTestId('totals-save'));
    await waitFor(() =>
      expect(screen.getByTestId('module-totals-error')).toHaveTextContent(t('module.error.partner_form_totals_overlap_dates', { from: '2026-10-01', until: '2026-10-31' })),
    );
    expect(screen.getByTestId('module-totals-error')).toHaveTextContent('2026-10-01');
    // ⛔ details (an older server): the general sentence, ⛔ a hole in it.
    recordPartnerFormTotals.mockRejectedValue(new ApiError(409, 'module.partner_form_totals_overlap', 'overlap'));
    fireEvent.click(screen.getByTestId('totals-save'));
    await waitFor(() => expect(screen.getByTestId('module-totals-error')).toHaveTextContent(t('module.error.partner_form_totals_overlap')));
  });

  it('R3: a number too large is NAMED as too large; the "80 characters" in the step copy is the contract bound', () => {
    const d = { periodStart: '2026-11-01', periodEnd: '2026-11-30', stages: [{ label: 'S', figure: '9999999999' }] };
    expect(derive.validateTotalsDraft(d)).toBe(t('module.totals.reasonFigure'));
    expect(derive.validateTotalsDraft({ ...d, stages: [{ label: 'S', figure: '2147483647' }] })).toBeNull();
    expect(t('module.totals.reasonStage')).toContain(String(MODULE_PARTNER_FORM_STAGE_LABEL_MAX));
  });
});
