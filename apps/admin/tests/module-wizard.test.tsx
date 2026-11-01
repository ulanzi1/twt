// Story 12.2 (AC11) — the partner-offer wizard. The api-client fetchers are mocked (the real ApiError kept); the real hooks,
// derivations and copy run. Covers: the opening line; step gating with the reason shown; step (b)'s no-default choice, the
// G18 notice and warning; the picker (hidden kinds with reasons, a too-long option disabled, the truncation notice, the
// exact value emitted); the 422 issue → its step; ONE Idempotency-Key per wizard session, reused on a retry.

import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { ModuleScopeOptionsResponse } from '@twt/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithClient } from './_helpers.js';

const PARIWAR = '11111111-1111-4111-8111-111111111111';
const PARTNER = '0f8fad5b-d9cb-469f-a165-70867728950e';
const MODULE = '6ba7b810-9dad-41d1-80b4-00c04fd430c8';

const listModulePartners = vi.fn();
const getModuleScopeOptions = vi.fn();
const authorModule = vi.fn();
const getModuleDetail = vi.fn();
vi.mock('../src/api/client.js', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    listModulePartners: (p: string) => listModulePartners(p),
    getModuleScopeOptions: (p: string) => getModuleScopeOptions(p),
    authorModule: (p: string, b: unknown, k: string) => authorModule(p, b, k),
    getModuleDetail: (p: string, m: string) => getModuleDetail(p, m),
  };
});

const { ModuleWizard } = await import('../src/modules/marketplace/ModuleWizard.js');
const { resolveEn: t } = await import('../src/modules/marketplace/i18n-en.js');
const { ApiError } = await import('../src/api/client.js');

const LONG = 'x'.repeat(125);
function options(over: Partial<ModuleScopeOptionsResponse> = {}): ModuleScopeOptionsResponse {
  return {
    geo_tree_version: null,
    states: [],
    districts: [
      { value: 'Gaya', state: null, usable: true, unusable_reason: null },
      { value: 'Patna ', state: null, usable: true, unusable_reason: null },
      { value: LONG, state: null, usable: false, unusable_reason: 'too_long' },
    ],
    district_source: 'workplace_districts',
    districts_truncated: true,
    ...over,
  };
}

beforeEach(() => {
  for (const f of [listModulePartners, getModuleScopeOptions, authorModule, getModuleDetail]) f.mockReset();
  listModulePartners.mockResolvedValue({
    items: [{ partner_id: PARTNER, display_name_en: 'HDFC', display_name_hi: 'एचडीएफसी', created_at: '2026-11-01T00:00:00.000Z' }],
  });
  getModuleScopeOptions.mockResolvedValue(options());
});

const next = (): void => {
  fireEvent.click(screen.getByTestId('wizard-next'));
};
const reason = (): string | null => screen.queryByTestId('wizard-reason')?.textContent ?? null;

/** Walk steps (a)–(f) with valid answers; ends on the summary. */
async function fillAll(): Promise<void> {
  // (a)
  await waitFor(() => expect(screen.getByRole('option', { name: 'HDFC / एचडीएफसी' })).toBeInTheDocument());
  expect(reason()).toBe(t('module.reason.partner'));
  expect(screen.getByTestId('wizard-next')).toBeDisabled();
  fireEvent.change(screen.getByTestId('partner-select'), { target: { value: PARTNER } });
  fireEvent.change(screen.getByTestId('field-name-en'), { target: { value: 'Home loan' } });
  fireEvent.change(screen.getByTestId('field-name-hi'), { target: { value: 'गृह ऋण' } });
  fireEvent.change(screen.getByTestId('field-description-en'), { target: { value: 'A loan.' } });
  expect(reason()).toBe(t('module.reason.descriptionHi'));
  fireEvent.change(screen.getByTestId('field-description-hi'), { target: { value: 'ऋण।' } });
  expect(reason()).toBeNull();
  next();
  // (b)
  fireEvent.click(screen.getByTestId('eligibility-all'));
  next();
  // (c)
  await screen.findByTestId('scope-picker');
  fireEvent.click(screen.getByTestId('scope-kind-district'));
  fireEvent.click(screen.getByTestId('scope-option-Patna ', { normalizer: (x) => x }));
  next();
  // (d)
  fireEvent.change(screen.getByTestId('field-validFrom'), { target: { value: '2026-11-05T10:30' } });
  fireEvent.change(screen.getByTestId('field-validUntil'), { target: { value: '2026-12-05T10:30' } });
  next();
  // (e)
  fireEvent.click(screen.getByTestId('places-unlimited'));
  next();
  // (f)
  fireEvent.change(screen.getByTestId('field-lead-url'), { target: { value: 'https://leads.partner.example/hdfc' } });
  fireEvent.change(screen.getByTestId('field-secret-name'), { target: { value: 'hdfc-signing-key' } });
  next();
}

describe('ModuleWizard (AC11)', () => {
  it('opens with the QE1 line and walks to the summary, which restates the meanings verbatim', { timeout: 20_000 }, async () => {
    renderWithClient(<ModuleWizard pariwarId={PARIWAR} onCreated={vi.fn()} />);
    expect(screen.getByTestId('wizard-opening')).toHaveTextContent(t('module.wizard.opening'));
    await fillAll();
    const audience = screen.getByTestId('summary-audience');
    expect(audience).toHaveTextContent(t('module.audience.district', { places: 'Patna ' }).trim());
    expect(audience).toHaveTextContent(t('module.audience.unlistedDistrict'));
    expect(audience).toHaveTextContent(t('module.audience.matchesNobody'));
    expect(screen.getByTestId('summary-eligibility')).toHaveTextContent(t('module.eligibility.none'));
    expect(screen.getByTestId('summary-eligibility')).toHaveTextContent(t('module.eligibility.leftOrErased'));
    expect(screen.getByTestId('summary-places')).toHaveTextContent(t('module.places.unlimited'));
    expect(screen.getByTestId('preview-hi')).toHaveAttribute('lang', 'hi');
  });

  it('step (b) has NO default; "Only these statuses" shows the G18 notice, and the warning when every tick is a no-member status', { timeout: 20_000 }, async () => {
    renderWithClient(<ModuleWizard pariwarId={PARIWAR} onCreated={vi.fn()} />);
    await waitFor(() => expect(screen.getByRole('option', { name: 'HDFC / एचडीएफसी' })).toBeInTheDocument());
    fireEvent.change(screen.getByTestId('partner-select'), { target: { value: PARTNER } });
    for (const [id, v] of [['field-name-en', 'A'], ['field-name-hi', 'ऋण'], ['field-description-en', 'B'], ['field-description-hi', 'ऋण']] as const) {
      fireEvent.change(screen.getByTestId(id), { target: { value: v } });
    }
    next();
    expect(screen.getByTestId('eligibility-all')).not.toBeChecked();
    expect(screen.getByTestId('eligibility-only')).not.toBeChecked();
    expect(reason()).toBe(t('module.reason.eligibilityMode'));
    fireEvent.click(screen.getByTestId('eligibility-only'));
    expect(screen.getByTestId('eligibility-no-member-yet')).toHaveTextContent(t('module.eligibility.noMemberYet'));
    expect(reason()).toBe(t('module.reason.eligibilityStates'));
    fireEvent.click(screen.getByTestId('eligibility-state-active'));
    expect(screen.getByTestId('eligibility-reaches-no-member')).toHaveTextContent(t('module.eligibility.reachesNoMember'));
    fireEvent.click(screen.getByTestId('eligibility-state-lock-in'));
    expect(screen.queryByTestId('eligibility-reaches-no-member')).toBeNull();
    expect(reason()).toBeNull();
  });

  it('the picker: no-state reason, role/cohort line, too-long option disabled, truncation notice, search', { timeout: 20_000 }, async () => {
    renderWithClient(<ModuleWizard pariwarId={PARIWAR} onCreated={vi.fn()} />);
    await waitFor(() => expect(screen.getByRole('option', { name: 'HDFC / एचडीएफसी' })).toBeInTheDocument());
    fireEvent.change(screen.getByTestId('partner-select'), { target: { value: PARTNER } });
    for (const [id, v] of [['field-name-en', 'A'], ['field-name-hi', 'ऋण'], ['field-description-en', 'B'], ['field-description-hi', 'ऋण']] as const) {
      fireEvent.change(screen.getByTestId(id), { target: { value: v } });
    }
    next();
    fireEvent.click(screen.getByTestId('eligibility-all'));
    next();
    await screen.findByTestId('scope-picker');
    expect(screen.queryByTestId('scope-kind-state')).toBeNull();
    expect(screen.getByTestId('scope-no-states')).toHaveTextContent(t('module.scope.noStates'));
    expect(screen.getByTestId('scope-role-cohort')).toHaveTextContent(t('module.scope.roleCohort'));
    fireEvent.click(screen.getByTestId('scope-kind-district'));
    expect(reason()).toBe(t('module.reason.scopeValues'));
    expect(screen.getByTestId('scope-truncated')).toHaveTextContent(t('module.scope.truncated', { n: 3 }));
    expect(screen.getByTestId(`scope-option-${LONG}`)).toBeDisabled();
    expect(screen.getByTestId('scope-options')).toHaveTextContent(t('module.scope.tooLong'));
    expect(screen.getByTestId('scope-no-district-line')).toHaveTextContent(t('module.audience.noDistrict'));
    expect(screen.getByTestId('scope-unlisted-district-line')).toHaveTextContent(t('module.audience.unlistedDistrict'));
    fireEvent.change(screen.getByTestId('scope-search'), { target: { value: 'gay' } });
    expect(screen.getByTestId('scope-option-Gaya')).toBeInTheDocument();
    expect(screen.queryByTestId('scope-option-Patna ', { normalizer: (x) => x })).toBeNull();
  });

  it('hides the district kind (with its reason) when there are no districts', { timeout: 20_000 }, async () => {
    getModuleScopeOptions.mockResolvedValue(
      options({ geo_tree_version: 2, states: [{ value: 'Bihar', state: null, usable: true, unusable_reason: null }], districts: [], district_source: 'geo_tree', districts_truncated: false }),
    );
    renderWithClient(<ModuleWizard pariwarId={PARIWAR} onCreated={vi.fn()} />);
    await waitFor(() => expect(screen.getByRole('option', { name: 'HDFC / एचडीएफसी' })).toBeInTheDocument());
    fireEvent.change(screen.getByTestId('partner-select'), { target: { value: PARTNER } });
    for (const [id, v] of [['field-name-en', 'A'], ['field-name-hi', 'ऋण'], ['field-description-en', 'B'], ['field-description-hi', 'ऋण']] as const) {
      fireEvent.change(screen.getByTestId(id), { target: { value: v } });
    }
    next();
    fireEvent.click(screen.getByTestId('eligibility-all'));
    next();
    await screen.findByTestId('scope-picker');
    expect(screen.queryByTestId('scope-kind-district')).toBeNull();
    expect(screen.getByTestId('scope-no-districts')).toHaveTextContent(t('module.scope.noDistricts'));
    expect(screen.getByTestId('scope-kind-state')).toBeInTheDocument();
  });

  it('Create draft: a 422 maps its issue to the step; the retry REUSES the one Idempotency-Key; success hands back the id', { timeout: 20_000 }, async () => {
    authorModule
      .mockRejectedValueOnce(
        new ApiError(422, 'module.manifest_invalid', 'invalid', { issues: [{ path: ['name_hi'], message: 'must contain Hindi (Devanagari) text' }] }),
      )
      .mockResolvedValueOnce({ module_id: MODULE, state: 'draft' });
    const onCreated = vi.fn();
    renderWithClient(<ModuleWizard pariwarId={PARIWAR} onCreated={onCreated} />);
    await fillAll();
    fireEvent.click(screen.getByTestId('wizard-create'));
    // Back on step (a), the issue shown.
    expect(await screen.findByTestId('wizard-step-a')).toBeInTheDocument();
    expect(screen.getByTestId('wizard-issue')).toHaveTextContent(t('module.wizard.issue', { message: 'must contain Hindi (Devanagari) text' }));
    const body = authorModule.mock.calls[0]![1] as Record<string, unknown>;
    expect(body).toMatchObject({ partner_id: PARTNER, scope_filter: { version: 1, scope: 'district', values: ['Patna '] }, slot_capacity: null });
    // Walk forward again to the summary and retry.
    for (let i = 0; i < 6; i += 1) next();
    fireEvent.click(screen.getByTestId('wizard-create'));
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(MODULE));
    expect(authorModule).toHaveBeenCalledTimes(2);
    expect(authorModule.mock.calls[1]![2]).toBe(authorModule.mock.calls[0]![2]);
  });

  it('a corrected copy pre-fills from the module', { timeout: 20_000 }, async () => {
    getModuleDetail.mockResolvedValue({
      partner_id: PARTNER,
      name_en: 'Old name',
      name_hi: 'पुराना',
      description_en: 'd',
      description_hi: 'द',
      eligibility_filter: { version: 1, clauses: [] },
      scope_filter: { version: 1, scope: 'members-all' },
      valid_from: '2026-11-05T05:00:00.000Z',
      valid_until: '2026-12-05T05:00:00.000Z',
      slot_capacity: 10,
      lead_handoff_url: 'https://x.example/y',
      lead_handoff_signing_key_secret_name: 'k',
    });
    renderWithClient(<ModuleWizard pariwarId={PARIWAR} fromModuleId={MODULE} onCreated={vi.fn()} />);
    await waitFor(() => expect(screen.getByTestId('field-name-en')).toHaveValue('Old name'));
    expect(getModuleDetail).toHaveBeenCalledWith(PARIWAR, MODULE);
  });
});
