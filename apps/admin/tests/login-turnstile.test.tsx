// LoginPage Turnstile widget tests (Story 1.13, AC-5).
//
// The widget mount point renders ONLY when a build-time VITE_TURNSTILE_SITE_KEY is
// present (absent → no widget, matching the server's no-op verifier seam). The actual
// Cloudflare `window.turnstile.render` is a no-op under jsdom (the external api.js
// never loads) — these tests assert the GATING, not the third-party widget itself.

import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LoginPage } from '../src/routes/LoginPage.js';
import { renderWithClient } from './_helpers.js';

// LoginPage calls useNavigate at the top level — stub the router so it renders without
// a RouterProvider. The api client is stubbed (no calls happen on a bare render).
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn() }));
vi.mock('../src/api/client.js', () => ({
  ApiError: class ApiError extends Error {
    public status = 0;
    public get isUnauthorized(): boolean {
      return false;
    }
  },
  login: vi.fn(),
  passkeyAuthOptions: vi.fn(),
  passkeyAuthVerify: vi.fn(),
  consumeRecovery: vi.fn(),
}));

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('LoginPage Turnstile widget (AC-5)', () => {
  it('renders NO widget when no site key is configured (dev default)', () => {
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', '');
    renderWithClient(<LoginPage />);
    expect(screen.queryByTestId('turnstile-widget')).not.toBeInTheDocument();
  });

  it('renders the widget mount point when a build-time site key is present', () => {
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', '1x00000000000000000000AA');
    renderWithClient(<LoginPage />);
    const widget = screen.getByTestId('turnstile-widget');
    expect(widget).toBeInTheDocument();
    expect(widget).toHaveAttribute('aria-label', 'Verification challenge');
  });
});
