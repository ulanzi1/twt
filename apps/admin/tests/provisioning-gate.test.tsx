// Provisioning permission-gate tests (Story 1.15, AC-4). The gate is a pure
// presentational decision, so it needs no router/query context (mirrors gate.test.tsx).

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { hasPariwarProvision } from '../src/api/hooks.js';
import { ProvisioningGateView } from '../src/routes/ProvisioningRoute.js';

describe('ProvisioningGateView (AC-4 pariwar.provision gate)', () => {
  const Page = () => <div data-testid="secret-page">provisioning page</div>;

  it('hides the page when the session lacks pariwar.provision', () => {
    render(
      <ProvisioningGateView status="success" grants={['audit.verify']}>
        <Page />
      </ProvisioningGateView>,
    );
    expect(screen.getByTestId('access-denied')).toBeInTheDocument();
    expect(screen.queryByTestId('secret-page')).not.toBeInTheDocument();
  });

  it('shows the page when the session carries pariwar.provision', () => {
    render(
      <ProvisioningGateView status="success" grants={['pariwar.provision', 'audit.verify']}>
        <Page />
      </ProvisioningGateView>,
    );
    expect(screen.getByTestId('secret-page')).toBeInTheDocument();
    expect(screen.queryByTestId('access-denied')).not.toBeInTheDocument();
  });

  it('shows a loading state while the session resolves', () => {
    render(
      <ProvisioningGateView status="loading" grants={undefined}>
        <Page />
      </ProvisioningGateView>,
    );
    expect(screen.queryByTestId('secret-page')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/checking your session/i);
  });

  it('shows a redirecting state on a session error (401 → /login)', () => {
    render(
      <ProvisioningGateView status="error" grants={undefined}>
        <Page />
      </ProvisioningGateView>,
    );
    expect(screen.queryByTestId('secret-page')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/redirecting/i);
  });
});

describe('hasPariwarProvision', () => {
  it('is true only for a grant set containing pariwar.provision', () => {
    expect(hasPariwarProvision(['pariwar.provision'])).toBe(true);
    expect(hasPariwarProvision(['audit.verify'])).toBe(false);
    expect(hasPariwarProvision([])).toBe(false);
    expect(hasPariwarProvision(undefined)).toBe(false);
  });
});
