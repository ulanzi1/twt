// Telegram Bot config form tests (Story 5.5, Task 9; AC3). The form is presentational (takes onSubmit), so it
// renders standalone — no router/query context needed.

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { TelegramConfigForm } from '../src/modules/channel-config/TelegramConfigForm.js';

const ZERO_CONFIG = {
  enabled: false,
  botUsername: null,
  botTokenSecretName: null,
  webhookSecretTokenSecretName: null,
};

describe('TelegramConfigForm (AC3)', () => {
  it('submits the config; blank optional fields coerce to null (not empty strings)', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<TelegramConfigForm initial={ZERO_CONFIG} onSubmit={onSubmit} pending={false} />);

    await user.click(screen.getByTestId('telegram-enabled'));
    await user.type(screen.getByLabelText(/Bot username/i), 'twt_pariwar_bot');
    await user.click(screen.getByTestId('telegram-config-submit'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const payload = onSubmit.mock.calls[0]![0] as Record<string, unknown>;
    expect(payload.enabled).toBe(true);
    expect(payload.botUsername).toBe('twt_pariwar_bot');
    // Untouched optional fields stay null (the .nullable() branch), never ''.
    expect(payload.botTokenSecretName).toBeNull();
    expect(payload.webhookSecretTokenSecretName).toBeNull();
  });

  it('renders a server-side submit error', () => {
    render(
      <TelegramConfigForm initial={ZERO_CONFIG} onSubmit={vi.fn()} pending={false} submitError="Forbidden — pariwar.configure_channels required" />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(/configure_channels/);
  });
});
