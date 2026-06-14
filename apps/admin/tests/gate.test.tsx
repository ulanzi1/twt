// Permission-gate tests (Story 1.11b, AC-1 / DD-6). The gate is a pure presentational
// decision, so it needs no router/query context.

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { IntegrityGateView } from '../src/routes/IntegrityRoute.js';

describe('IntegrityGateView (AC-1 audit.verify gate)', () => {
  const Page = () => <div data-testid="secret-page">integrity page</div>;

  it('hides the page when the session lacks audit.verify', () => {
    render(
      <IntegrityGateView status="success" grants={['member.suspend']}>
        <Page />
      </IntegrityGateView>,
    );
    expect(screen.getByTestId('access-denied')).toBeInTheDocument();
    expect(screen.queryByTestId('secret-page')).not.toBeInTheDocument();
  });

  it('shows the page when the session carries audit.verify', () => {
    render(
      <IntegrityGateView status="success" grants={['audit.verify', 'audit.export']}>
        <Page />
      </IntegrityGateView>,
    );
    expect(screen.getByTestId('secret-page')).toBeInTheDocument();
    expect(screen.queryByTestId('access-denied')).not.toBeInTheDocument();
  });

  it('shows a loading state while the session resolves', () => {
    render(
      <IntegrityGateView status="loading" grants={undefined}>
        <Page />
      </IntegrityGateView>,
    );
    expect(screen.queryByTestId('secret-page')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/checking your session/i);
  });

  it('shows a redirecting state on a session error (401 → /login)', () => {
    render(
      <IntegrityGateView status="error" grants={undefined}>
        <Page />
      </IntegrityGateView>,
    );
    expect(screen.queryByTestId('secret-page')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/redirecting/i);
  });
});
