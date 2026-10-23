// Story 11b.4 (AC9) — the family-memorial queue is REACHABLE from the admin nav inside a Pariwar context, and the link is
// ⛔ key-gated (a Pariwar grant is ⛔ in `nationalGrants` — a gated link would show only to `super_admin`). The server's
// `memorial.review` check is the boundary; the page shows its own "no access" on a 403.

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

let params: Record<string, string> = {};
vi.mock('@tanstack/react-router', () => ({
  Link: (p: { children: ReactNode; to: string; 'data-testid'?: string }) => (
    <a href={p.to} data-testid={p['data-testid']}>
      {p.children}
    </a>
  ),
  Outlet: () => null,
  useNavigate: () => vi.fn(),
  useParams: () => params,
  useRouter: () => ({ invalidate: vi.fn() }),
}));

vi.mock('../src/api/client.js', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, getSession: async () => ({ userId: '11111111-1111-4111-8111-111111111111', nationalGrants: [] }) };
});

const { RootLayout } = await import('../src/routes/RootLayout.js');

function setup(): void {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RootLayout />
    </QueryClientProvider>,
  );
}

describe('the family-memorial queue in the admin nav (AC9)', () => {
  it('inside a Pariwar: present, with ⛔ national grant at all', async () => {
    params = { pariwarId: '44444444-4444-4444-8444-444444444444' };
    setup();
    expect(await screen.findByTestId('nav-memorial-reviews')).toHaveAttribute('href', '/p/$pariwarId/memorial-reviews');
  });

  it('outside a Pariwar: absent', async () => {
    params = {};
    setup();
    await screen.findByText('Sign out').catch(() => undefined);
    expect(screen.queryByTestId('nav-memorial-reviews')).toBeNull();
  });
});
