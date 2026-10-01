// Story 6.19c (AC8c) — every new closure queue is REACHABLE from the admin nav: the Pariwar Admin's, the directee's and
// the closure letters INSIDE a Pariwar context, and the Super Admin's — a global role — from the TOP LEVEL too, on the
// national grant (advisory; the server's key check is the boundary). `deferred-work.md` 6.18 chunk 3.

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

let grants: string[] = [];
vi.mock('../src/api/client.js', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, getSession: async () => ({ userId: '11111111-1111-4111-8111-111111111111', nationalGrants: grants }) };
});

const { RootLayout } = await import('../src/routes/RootLayout.js');

function setup(): void {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RootLayout />
    </QueryClientProvider>,
  );
}

describe('the closure queues in the admin nav (AC8c)', () => {
  it('inside a Pariwar: closure decisions, the direction inbox and the closure letters', async () => {
    params = { pariwarId: '44444444-4444-4444-8444-444444444444' };
    grants = [];
    setup();
    expect(await screen.findByTestId('nav-closure-decisions')).toHaveAttribute('href', '/p/$pariwarId/correction/closures');
    expect(screen.getByTestId('nav-direction-inbox')).toBeInTheDocument();
    expect(screen.getByTestId('nav-closure-letters')).toBeInTheDocument();
    expect(screen.queryByTestId('nav-escalations')).toBeNull();
  });

  it('⭐ the Super Admin reaches the held claims from the TOP LEVEL (a Pariwar picker) and inside a Pariwar', async () => {
    grants = ['claim.review_escalated_closure'];
    params = {};
    setup();
    expect(await screen.findByTestId('nav-escalations-top')).toHaveAttribute('href', '/correction/escalations');
  });

  it('⭐ … and inside a Pariwar context', async () => {
    grants = ['claim.review_escalated_closure'];
    params = { pariwarId: '44444444-4444-4444-8444-444444444444' };
    setup();
    expect(await screen.findByTestId('nav-escalations')).toHaveAttribute('href', '/p/$pariwarId/correction/escalations');
  });
});
