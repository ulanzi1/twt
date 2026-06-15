// Add-Pariwar form tests (Story 1.15, AC-4 control (a)). The form is presentational
// (takes onSubmit), so it renders standalone — no router/query context needed.

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AddPariwarForm } from '../src/modules/pariwar-provisioning/AddPariwarForm.js';

async function fillRequired(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.type(screen.getByLabelText(/Display name \(English\)/i), 'Test Trust');
  await user.type(screen.getByLabelText(/Display name \(Hindi\)/i), 'टेस्ट ट्रस्ट');
  await user.type(screen.getByLabelText(/Legal \/ trust name/i), 'Test Welfare Trust');
  await user.type(screen.getByLabelText(/^Logo URL$/i), 'https://cdn.twt.local/t/logo.png');
}

describe('AddPariwarForm (AC-4)', () => {
  it('submits a valid payload (optional fields omitted, not sent as empty strings)', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<AddPariwarForm onSubmit={onSubmit} pending={false} />);

    await fillRequired(user);
    await user.click(screen.getByTestId('add-pariwar-submit'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const payload = onSubmit.mock.calls[0]![0] as Record<string, unknown> & {
      brandingBundle: Record<string, unknown>;
    };
    expect(payload.displayNameEn).toBe('Test Trust');
    expect(payload.localeDefault).toBe('hi');
    expect(payload.brandingBundle.primary_color).toBe('#0A3D62');
    // Blank optional fields coerced to undefined (not '') so .nullish()/.url() pass.
    expect(payload.trustRegistrationId).toBeUndefined();
    expect(payload.brandingBundle.accent_color).toBeUndefined();
    expect(payload.brandingBundle.logo_url_dark).toBeUndefined();
  });

  it('blocks submit + shows an error for a non-hex primary colour', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<AddPariwarForm onSubmit={onSubmit} pending={false} />);

    await fillRequired(user);
    const primary = screen.getByLabelText(/Primary colour/i);
    await user.clear(primary);
    await user.type(primary, 'navy');
    await user.click(screen.getByTestId('add-pariwar-submit'));

    await waitFor(() => expect(screen.getAllByRole('alert').length).toBeGreaterThan(0));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('renders a server-side submit error', () => {
    render(<AddPariwarForm onSubmit={vi.fn()} pending={false} submitError="Forbidden — pariwar.provision required" />);
    expect(screen.getByRole('alert')).toHaveTextContent(/pariwar\.provision/);
  });
});
