// Story 12.2 patch-diff review (PT11, PT7) — the module routes' search wiring, end to end through a memory-history router that
// mounts the REAL route components (`ModuleNewRoute`, `ModuleDetailRoute`) and the REAL `validateSearch` functions under the
// app's own paths. The fetchers are mocked (the real ApiError kept). Covers: `?created=true` is the only flag the detail route
// keeps; Create draft → the detail page announces "Draft created." and the URL loses `created` (a reload does not announce it
// again); a corrected copy whose source is not found starts a blank offer at `/new` with no `from`.

import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';

import { renderWithClient } from './_helpers.js';

const PARIWAR = '11111111-1111-4111-8111-111111111111';
const PARTNER = '0f8fad5b-d9cb-469f-a165-70867728950e';
const SOURCE = '6ba7b810-9dad-41d1-80b4-00c04fd430c8';
const CREATED = '7c9e6679-7425-40de-944b-e07fc1f90ae7';

const getSession = vi.fn();
const listModulePartners = vi.fn();
const getModuleScopeOptions = vi.fn();
const authorModule = vi.fn();
const getModuleDetail = vi.fn();
vi.mock('../src/api/client.js', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    getSession: () => getSession(),
    listModulePartners: (p: string) => listModulePartners(p),
    getModuleScopeOptions: (p: string) => getModuleScopeOptions(p),
    authorModule: (p: string, b: unknown, k: string) => authorModule(p, b, k),
    getModuleDetail: (p: string, m: string) => getModuleDetail(p, m),
  };
});

const { ModuleDetailRoute, ModuleNewRoute, validateModuleDetailSearch, validateModuleNewSearch } = await import('../src/routes/ModulesRoute.js');
const { resolveEn: t } = await import('../src/modules/marketplace/i18n-en.js');
const { ApiError } = await import('../src/api/client.js');

function moduleDetail(moduleId: string, over: Record<string, unknown> = {}) {
  return {
    module_id: moduleId,
    pariwar_id: PARIWAR,
    partner_id: PARTNER,
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
    authored_by_viewer: true,
    publication: null,
    lead_count: 0,
    ...over,
  };
}

/** The module routes under the app's own paths (so the components' `useParams({ from })` ids match), on a memory history. */
function renderAt(url: string) {
  const root = createRootRoute({ component: Outlet });
  const newRoute = createRoute({ getParentRoute: () => root, path: '/p/$pariwarId/modules/new', validateSearch: validateModuleNewSearch, component: ModuleNewRoute });
  const detailRoute = createRoute({
    getParentRoute: () => root,
    path: '/p/$pariwarId/modules/$moduleId',
    validateSearch: validateModuleDetailSearch,
    component: ModuleDetailRoute,
  });
  const listRoute = createRoute({ getParentRoute: () => root, path: '/p/$pariwarId/modules', component: () => <p>list</p> });
  const history = createMemoryHistory({ initialEntries: [url] });
  const router = createRouter({ routeTree: root.addChildren([listRoute, newRoute, detailRoute]), history });
  renderWithClient(<RouterProvider router={router} />);
  return history;
}

// The router scrolls on navigation, which jsdom does not implement.
let scroll: MockInstance | undefined;
beforeEach(() => {
  scroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
});
afterEach(() => {
  scroll?.mockRestore();
});

beforeEach(() => {
  for (const f of [getSession, listModulePartners, getModuleScopeOptions, authorModule, getModuleDetail]) f.mockReset();
  getSession.mockResolvedValue({});
  listModulePartners.mockResolvedValue({
    items: [{ partner_id: PARTNER, display_name_en: 'HDFC', display_name_hi: 'एचडीएफसी', created_at: '2026-11-01T00:00:00.000Z' }],
  });
  getModuleScopeOptions.mockResolvedValue({
    geo_tree_version: null,
    states: [],
    districts: [],
    district_source: 'workplace_districts',
    districts_truncated: false,
  });
});

describe('validateModuleDetailSearch (PT11)', () => {
  it.each([
    [{ created: true }, { created: true }],
    [{ created: 'true' }, { created: true }],
    [{}, {}],
    [{ created: false }, {}],
    [{ created: 'yes' }, {}],
    [{ created: 1 }, {}],
    [{ from: 'x', other: 'y' }, {}],
  ])('%j → %j', (input, out) => {
    expect(validateModuleDetailSearch(input)).toEqual(out);
  });
});

describe('validateModuleNewSearch (PU1, PU2)', () => {
  it.each([
    [{ from: SOURCE }, { from: SOURCE }],
    [{ from: SOURCE.toUpperCase() }, { from: SOURCE.toUpperCase() }],
    [{ from: 'not-a-uuid' }, {}],
    [{ from: `${SOURCE}x` }, {}],
    [{ from: '' }, {}],
    [{ from: 7 }, {}],
    [{ blank: true }, { blank: true }],
    [{ blank: 'true' }, { blank: true }],
    [{ blank: 'yes' }, {}],
    [{ from: SOURCE, blank: true }, { from: SOURCE, blank: true }],
  ])('%j → %j', (input, out) => {
    expect(validateModuleNewSearch(input)).toEqual(out);
  });
});

describe('the module routes, through a router (PT11, PT7)', () => {
  it('Create draft → the detail page announces "Draft created.", focuses its heading, and the URL loses `created`', { timeout: 30_000 }, async () => {
    getModuleDetail.mockImplementation((_p: string, id: string) =>
      Promise.resolve(id === SOURCE ? moduleDetail(SOURCE, { authored_by_viewer: false, current_state: 'archived' }) : moduleDetail(CREATED)),
    );
    authorModule.mockResolvedValue({ module_id: CREATED, state: 'draft' });
    const history = renderAt(`/p/${PARIWAR}/modules/new?from=${SOURCE}`);
    // A corrected copy pre-fills every step, so the summary is six Nexts away.
    await waitFor(() => expect(screen.getByTestId('field-name-en')).toHaveValue('Home loan'));
    await screen.findByRole('option', { name: 'HDFC / एचडीएफसी' });
    for (let i = 0; i < 6; i += 1) fireEvent.click(screen.getByTestId('wizard-next'));
    fireEvent.click(screen.getByTestId('wizard-create'));

    await waitFor(() => expect(screen.getByTestId('module-detail-live')).toHaveTextContent(t('module.detail.created')));
    expect(screen.getByRole('heading', { level: 1 })).toHaveFocus();
    expect(getModuleDetail).toHaveBeenCalledWith(PARIWAR, CREATED);
    await waitFor(() => expect(history.location.pathname).toBe(`/p/${PARIWAR}/modules/${CREATED}`));
    await waitFor(() => expect(history.location.search).toBe('')); // replaced: a reload does not announce it again
  });

  it('PT7: a corrected copy whose source is not found starts a blank offer at /new with no `from`', { timeout: 20_000 }, async () => {
    getModuleDetail.mockRejectedValue(new ApiError(404, 'module.not_found', 'not found'));
    const history = renderAt(`/p/${PARIWAR}/modules/new?from=${SOURCE}`);
    const blank = await screen.findByTestId('wizard-start-blank');
    blank.focus();
    fireEvent.click(blank);
    expect(await screen.findByRole('heading', { level: 1, name: t('module.wizard.title') })).toBeInTheDocument();
    expect(screen.getByTestId('wizard-step-a')).toBeEnabled(); // a fresh wizard: nothing is waiting for a source
    // PU1: the button unmounted with the old wizard; the new one takes focus, and its one-shot flag is cleared.
    await waitFor(() => expect(screen.getByTestId('wizard-step-heading')).toHaveFocus());
    await waitFor(() => expect(history.location.search).toBe(''));
    expect(history.location.pathname).toBe(`/p/${PARIWAR}/modules/new`);
    // `replace` — Back does not return to the dead corrected-copy URL.
    expect(history.length).toBe(1);
  });

  it('PU2: a malformed `?from=` is dropped before any read — a blank wizard, no source request', { timeout: 20_000 }, async () => {
    renderAt(`/p/${PARIWAR}/modules/new?from=not-a-uuid`);
    expect(await screen.findByRole('heading', { level: 1, name: t('module.wizard.title') })).toBeInTheDocument();
    expect(screen.getByTestId('wizard-step-a')).toBeEnabled();
    expect(getModuleDetail).not.toHaveBeenCalled();
  });
});
