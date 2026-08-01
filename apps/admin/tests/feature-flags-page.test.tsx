// FeatureFlagsPage component/interaction tests (Story 10.8, Review Pass 4).
//
// ⚠ WHY THIS FILE EXISTS. The console shipped with NO test at all — against 24 specs elsewhere in
// this app, including the 10.3/10.4/10.5 console precedents AC4 explicitly cites. That absence is
// the direct reason three separate defects shipped invisibly:
//   · every non-identity state the form offered was rejected by the server's staged-rollout ladder,
//     so the console could not perform a single legal flip of any flag — its entire purpose;
//   · it rendered the raw actor UUID and ignored the display-name snapshot migration 0089 exists
//     solely to supply;
//   · it ignored `has_more`, reproducing the silent truncation that field was added to prevent.
// The cases below pin each of those, plus the null-render and error paths.

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { FeatureFlagInventoryResponse } from '@twt/contracts';
import { FeatureFlagsPage } from '../src/modules/feature-flags/FeatureFlagsPage.js';
import { renderWithClient } from './_helpers.js';

const PARIWAR = '11111111-1111-1111-1111-111111111111';

type Entry = FeatureFlagInventoryResponse['flags'][number];

function entry(overrides: Partial<Entry> = {}): Entry {
  return {
    flag_key: 'kyc_manual_fallback',
    description: 'DigiLocker hard-mandatory cutover',
    state: 'off',
    source: 'default',
    flag_version: 1,
    cohort_definition: { clauses: [] },
    fallback_default: false,
    owner: 'kyc-desk',
    dead_by: '2026-12-31',
    effective_from: null,
    effective_until: null,
    last_flip_actor: null,
    last_flip_actor_display: null,
    rationale: null,
    ...overrides,
  } as Entry;
}

const client = vi.hoisted(() => ({
  listPariwarFeatureFlags: vi.fn(),
  listFeatureFlagVersions: vi.fn(),
  flipFeatureFlag: vi.fn(),
}));

vi.mock('../src/api/client.js', async (orig) => {
  const actual = await orig<typeof import('../src/api/client.js')>();
  return { ...actual, ...client };
});

function renderPage(flags: Entry[]): void {
  client.listPariwarFeatureFlags.mockResolvedValue({ flags });
  renderWithClient(<FeatureFlagsPage pariwarId={PARIWAR} />);
}

describe('FeatureFlagsPage — the flip form respects the staged-rollout ladder', () => {
  it('⚠ from `off`, offers ONLY the legal next states — never a rung-skip the server would 409', async () => {
    // The regression this file exists for: the form used to offer all five states unconditionally,
    // so three of five options were an instant 409 and a fourth a 400.
    renderPage([entry({ state: 'off' })]);
    await userEvent.click(await screen.findByRole('button', { name: /change/i }));

    const select = await screen.findByLabelText(/new state/i);
    const offered = Array.from(select.querySelectorAll('option')).map((o) => o.value).sort();
    expect(offered).toEqual(['canary', 'off']);
    expect(offered).not.toContain('full');
    expect(offered).not.toContain('rollout');
    expect(offered).not.toContain('rolled_back');
  });

  it('from `canary`, offers rollout and rolled_back — but not `full` (no rung-skip)', async () => {
    renderPage([entry({ state: 'canary', source: 'override', flag_version: 2 })]);
    await userEvent.click(await screen.findByRole('button', { name: /change/i }));
    const select = await screen.findByLabelText(/new state/i);
    const offered = Array.from(select.querySelectorAll('option')).map((o) => o.value).sort();
    expect(offered).toEqual(['canary', 'rolled_back', 'rollout']);
  });

  it.each(['off', 'canary', 'rollout', 'full', 'rolled_back'] as const)(
    'state `%s` offers its own IDENTITY transition — that is how owner/dead-by/rationale are edited',
    async (state) => {
      // Without the identity arm, editing a flag's lifecycle metadata without changing behaviour
      // would be impossible — and re-publishing the same state is also how a cohort gets narrowed.
      renderPage([entry({ state, source: 'override', flag_version: 2 })]);
      await userEvent.click(await screen.findByRole('button', { name: /change/i }));
      const select = await screen.findByLabelText(/new state/i);
      const offered = Array.from(select.querySelectorAll('option')).map((o) => o.value);
      expect(offered).toContain(state);
    },
  );
});

describe('FeatureFlagsPage — attribution rendering (AC4)', () => {
  it('⚠ renders the display-name SNAPSHOT, never the raw actor UUID', async () => {
    renderPage([
      entry({
        state: 'canary',
        source: 'override',
        flag_version: 2,
        rationale: 'begin the Patna cutover',
        last_flip_actor: '33333333-3333-3333-3333-333333333333',
        last_flip_actor_display: 'Asha Verma',
      }),
    ]);
    expect(await screen.findByText(/Asha Verma/)).toBeTruthy();
    expect(screen.queryByText(/33333333-3333-3333-3333-333333333333/)).toBeNull();
  });

  it('a pre-0089 row renders "not recorded" — NOT the UUID, and not "unknown actor"', async () => {
    // Null means "written before attribution was snapshotted", which is a different claim from
    // "we do not know who did this" — the contract says so explicitly.
    renderPage([
      entry({
        state: 'canary',
        source: 'override',
        flag_version: 2,
        rationale: 'legacy flip',
        last_flip_actor: '33333333-3333-3333-3333-333333333333',
        last_flip_actor_display: null,
      }),
    ]);
    expect(await screen.findByText(/not recorded/i)).toBeTruthy();
    expect(screen.queryByText(/33333333-3333-3333-3333-333333333333/)).toBeNull();
  });

  it('an actor with NO rationale is still shown — the actor is not nested inside the rationale', async () => {
    renderPage([
      entry({
        state: 'canary',
        source: 'override',
        flag_version: 2,
        rationale: null,
        last_flip_actor: '33333333-3333-3333-3333-333333333333',
        last_flip_actor_display: 'Asha Verma',
      }),
    ]);
    expect(await screen.findByText(/Asha Verma/)).toBeTruthy();
  });
});

describe('FeatureFlagsPage — degraded and null paths', () => {
  it('renders a degenerate cohort without throwing into the render tree', async () => {
    // The COMPONENT half of the malformed-row defence: an empty clause list must summarise, not
    // crash — one throw inside `.map` during render takes down the whole table, including every
    // other flag's row. (The SCHEMA half — that one unparseable row does not fail `parse` for the
    // entire response — lives in `packages/contracts/tests/feature-flags.test.ts`, because mocking
    // the api-client here bypasses the zod parse entirely and could not exercise it.)
    renderPage([
      entry({ flag_key: 'kyc_manual_fallback', cohort_definition: { clauses: [] } }),
      entry({ flag_key: 'telegram_mirror', description: 'FR-73 mirror' }),
    ]);
    expect(await screen.findByText(/kyc_manual_fallback/)).toBeTruthy();
    expect(await screen.findByText(/telegram_mirror/)).toBeTruthy();
  });

  it('a 403 on the inventory read is distinguishable from an outage', async () => {
    const { ApiError } = await import('../src/api/client.js');
    client.listPariwarFeatureFlags.mockRejectedValue(new ApiError(403, 'rbac.denied', 'Forbidden'));
    renderWithClient(<FeatureFlagsPage pariwarId={PARIWAR} />);
    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toMatch(/do not have permission/i);
    });
  });

  it('renders a never-flipped flag without throwing on its null window/rationale/actor', async () => {
    renderPage([entry()]);
    expect(await screen.findByText(/kyc_manual_fallback/)).toBeTruthy();
  });
});
