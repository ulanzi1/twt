// Story 6.25 (Task 4.4; AC3; `2026-10-09-299` RE9 A) — the sign-in RETURN PATH for the staff email's link.
//
//   · the allowlist: ONLY `/p/<uuid>/nominee-refusals` is followed; an absolute URL, `//evil`, another route, a query, a trailing
//     segment, an upper-cased or malformed id ⇒ the default landing page (⛔ an open redirect);
//   · the round trip: a signed-out admin on `/login?next=/p/<P>/nominee-refusals` completes sign-in and is taken to THAT list; a
//     refused `next` lands on `/audit/integrity` as before;
//   · the refusal list's BOTH redirects (a session error, a 401 on the list) carry `next` = its own path.

import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { allowedNextPariwarId, nomineeRefusalsPath } from '../src/routes/login-next.js';
import { renderWithClient } from './_helpers.js';

const P = '2b7c0a4e-5d1f-4e8a-9c3b-1f2e3d4c5b6a';
const navigate = vi.fn();
const session = { isLoading: false, isError: false };
const list = { isLoading: false, error: null as unknown, data: undefined as unknown };

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigate,
  useParams: () => ({ pariwarId: P }),
  // Mirrors `loginRoute`'s own `validateSearch` (`router.tsx`) against the test's simulated URL.
  useSearch: () => {
    const next = new URLSearchParams(window.location.search).get('next');
    return next === null ? {} : { next };
  },
}));
vi.mock('../src/api/client.js', () => ({
  ApiError: class ApiError extends Error {
    public constructor(public status: number) {
      super(`HTTP ${String(status)}`);
    }
    public get isUnauthorized(): boolean {
      return this.status === 401;
    }
  },
  login: vi.fn(() => Promise.resolve({ methods: ['recovery_code'] })),
  passkeyAuthOptions: vi.fn(),
  passkeyAuthVerify: vi.fn(),
  consumeRecovery: vi.fn(() => Promise.resolve({ authenticated: true })),
}));
vi.mock('../src/api/hooks.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/api/hooks.js')>()),
  useSession: () => session,
  useNomineeRefusals: () => list,
}));

const { LoginPage } = await import('../src/routes/LoginPage.js');
const { NomineeRefusalsRoute } = await import('../src/routes/NomineeRefusalsRoute.js');
const { ApiError } = await import('../src/api/client.js');

beforeEach(() => {
  navigate.mockClear();
  session.isError = false;
  list.error = null;
});
afterEach(() => {
  window.history.replaceState(null, '', '/');
});

describe('the allowlist (⛔ an open redirect)', () => {
  it('ONLY the nominee-refusal list of a well-formed Pariwar id is allowed', () => {
    expect(allowedNextPariwarId(nomineeRefusalsPath(P))).toBe(P);
    for (const bad of [
      undefined,
      null,
      42,
      '',
      `https://evil.example/p/${P}/nominee-refusals`,
      `//evil.example/p/${P}/nominee-refusals`,
      `/p/${P}/nominee-refusals?x=1`,
      `/p/${P}/nominee-refusals/`,
      `/p/${P}/nominee-refusals/../../audit`,
      `/p/${P.toUpperCase()}/nominee-refusals`,
      `/p/${P}x/nominee-refusals`,
      '/p/not-a-uuid/nominee-refusals',
      `/p/${P}/nominee-corrections`,
      '/audit/integrity',
      `\\/p/${P}/nominee-refusals`,
      `javascript:alert(1)//p/${P}/nominee-refusals`,
    ]) {
      expect(allowedNextPariwarId(bad), String(bad)).toBeNull();
    }
  });
});

/** Sign in through the recovery-code path (the simplest second factor to drive) and return the navigate call. */
async function signIn(): Promise<unknown> {
  renderWithClient(<LoginPage />);
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'priya@example.org' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'a-long-enough-password' } });
  fireEvent.submit(screen.getByRole('form', { name: 'Sign in' }));
  const code = await screen.findByLabelText('Recovery code', { selector: 'input' });
  fireEvent.change(code, { target: { value: 'ABCD-EFGH' } });
  fireEvent.submit(screen.getByRole('form', { name: 'Recovery code' }));
  await waitFor(() => expect(navigate).toHaveBeenCalled());
  return navigate.mock.calls.at(-1)![0];
}

describe('⭐ the round trip', () => {
  it('a signed-out admin who followed the email signs in and lands ON the list', async () => {
    window.history.replaceState(null, '', `/login?next=${encodeURIComponent(nomineeRefusalsPath(P))}`);
    expect(await signIn()).toEqual({ to: '/p/$pariwarId/nominee-refusals', params: { pariwarId: P } });
  });

  it('a refused `next` (an absolute URL) lands on /audit/integrity as before', async () => {
    window.history.replaceState(null, '', `/login?next=${encodeURIComponent('https://evil.example/')}`);
    expect(await signIn()).toEqual({ to: '/audit/integrity' });
  });

  it('⛔ `next` at all ⇒ /audit/integrity (unchanged behaviour)', async () => {
    window.history.replaceState(null, '', '/login');
    expect(await signIn()).toEqual({ to: '/audit/integrity' });
  });
});

describe('the refusal list sends a signed-out admin to sign-in WITH its own path', () => {
  it('a session error ⇒ /login?next=<the list>', async () => {
    session.isError = true;
    renderWithClient(<NomineeRefusalsRoute />);
    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/login', search: { next: `/p/${P}/nominee-refusals` } }));
  });

  it('a 401 on the list ⇒ /login?next=<the list>', async () => {
    // The MOCK's constructor takes the status alone (the real one takes 3–4 arguments).
    list.error = new (ApiError as unknown as new (status: number) => Error)(401);
    renderWithClient(<NomineeRefusalsRoute />);
    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/login', search: { next: `/p/${P}/nominee-refusals` } }));
  });
});
