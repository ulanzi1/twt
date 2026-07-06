// WhatsApp Business config form tests (Story 5.3, Task 5; AC4). The forms are presentational (take
// onSubmit), so they render standalone — no router/query context needed.

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { WaConfigForm } from '../src/modules/channel-config/WaConfigForm.js';
import { WaTemplateForm } from '../src/modules/channel-config/WaTemplateForm.js';

const ZERO_CONFIG = {
  enabled: false,
  displayPhoneNumber: null,
  phoneNumberId: null,
  wabaId: null,
  accessTokenSecretName: null,
  graphApiVersion: 'v21.0',
};

describe('WaConfigForm (AC4)', () => {
  it('submits the config; blank optional fields coerce to null (not empty strings)', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<WaConfigForm initial={ZERO_CONFIG} onSubmit={onSubmit} pending={false} />);

    await user.click(screen.getByTestId('wa-enabled'));
    await user.type(screen.getByLabelText(/Meta phone-number ID/i), '1234567890');
    await user.click(screen.getByTestId('wa-config-submit'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const payload = onSubmit.mock.calls[0]![0] as Record<string, unknown>;
    expect(payload.enabled).toBe(true);
    expect(payload.phoneNumberId).toBe('1234567890');
    // Untouched optional fields stay null (the .nullable() branch), never ''.
    expect(payload.displayPhoneNumber).toBeNull();
    expect(payload.accessTokenSecretName).toBeNull();
    expect(payload.graphApiVersion).toBe('v21.0');
  });

  it('blocks submit + shows an error for a non-Meta graph version', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<WaConfigForm initial={ZERO_CONFIG} onSubmit={onSubmit} pending={false} />);

    const graph = screen.getByLabelText(/Graph API version/i);
    await user.clear(graph);
    await user.type(graph, 'latest');
    await user.click(screen.getByTestId('wa-config-submit'));

    await waitFor(() => expect(screen.getAllByRole('alert').length).toBeGreaterThan(0));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('renders a server-side submit error', () => {
    render(
      <WaConfigForm initial={ZERO_CONFIG} onSubmit={vi.fn()} pending={false} submitError="Forbidden — pariwar.configure_channels required" />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(/configure_channels/);
  });
});

describe('WaTemplateForm (AC4)', () => {
  it('submits a per-category template mapping', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<WaTemplateForm onSubmit={onSubmit} pending={false} />);

    await user.selectOptions(screen.getByLabelText(/Alert category/i), 'contribution_confirmed');
    await user.type(screen.getByLabelText(/Meta template name/i), 'contrib_v1');
    await user.selectOptions(screen.getByLabelText(/Meta approval status/i), 'approved');
    await user.click(screen.getByTestId('wa-template-submit'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]![0]).toEqual({
      alertCategory: 'contribution_confirmed',
      templateName: 'contrib_v1',
      languageCode: 'en',
      approvalStatus: 'approved',
    });
  });
});
