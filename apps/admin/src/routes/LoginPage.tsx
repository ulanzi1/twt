// Minimal admin login surface (Story 1.11b, DD-2).
//
// Drives the EXISTING Story 1.9 auth API: POST /auth/login (email + password, RHF +
// the `LoginRequest` Zod schema) → { status: 'mfa_required', methods } → a second
// factor (WebAuthn passkey via @simplewebauthn/browser, OR a recovery code). The
// session cookie is set by the server and rides automatically (`credentials:
// 'include'`); on completion we invalidate the session query + land on the verify
// page. Enrollment / reset / step-up UIs are deferred (DD-2) — the dev surface logs
// in as an already-enrolled admin.

import { zodResolver } from '@hookform/resolvers/zod';
import { startAuthentication } from '@simplewebauthn/browser';
import { LoginRequest, type LoginRequest as LoginCredentials } from '@twt/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

import * as api from '../api/client.js';
import { sessionKey } from '../api/hooks.js';

// The Cloudflare Turnstile widget (api.js) is the ONE admin-side vendor touch-point
// (Story 1.13, AC-5). It mirrors `@twt/edge`'s TURNSTILE_WIDGET_SCRIPT_URL but is NOT
// imported from the package — that would pull `node:crypto` into the browser bundle.
// A pivot to a different edge vendor swaps this single component (AR-52, client side).
const TURNSTILE_SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const TURNSTILE_SCRIPT_ID = 'cf-turnstile-script';

interface TurnstileApi {
  render(
    el: HTMLElement,
    opts: {
      sitekey: string;
      callback: (token: string) => void;
      'error-callback'?: () => void;
      'expired-callback'?: () => void;
    },
  ): string;
  reset(widgetId?: string): void;
  remove(widgetId?: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

function messageFor(err: unknown): string {
  if (err instanceof api.ApiError) {
    if (err.isUnauthorized) return 'Invalid credentials or second factor.';
    return err.message;
  }
  return 'Something went wrong. Please try again.';
}

export function LoginPage(): ReactElement {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [stage, setStage] = useState<'credentials' | 'mfa'>('credentials');
  const [methods, setMethods] = useState<readonly string[]>([]);
  const [recoveryCode, setRecoveryCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Turnstile widget state (AC-5). The widget renders ONLY when a build-time site key
  // is present; absent ⇒ no widget + no token ⇒ the server's no-op verifier passes.
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
  const [turnstileToken, setTurnstileToken] = useState<string | undefined>(undefined);
  const widgetRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | undefined>(undefined);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginCredentials>({
    resolver: zodResolver(LoginRequest),
    defaultValues: { email: '', password: '' },
  });

  // Load the Cloudflare Turnstile script + render the widget on the credentials stage.
  useEffect(() => {
    if (!siteKey || stage !== 'credentials') return;

    function renderWidget(): void {
      if (!window.turnstile || !widgetRef.current || widgetIdRef.current !== undefined) return;
      widgetIdRef.current = window.turnstile.render(widgetRef.current, {
        sitekey: siteKey as string,
        callback: (token) => setTurnstileToken(token),
        'error-callback': () => setTurnstileToken(undefined),
        'expired-callback': () => setTurnstileToken(undefined),
      });
    }

    // Track which element received the load listener so cleanup can remove it.
    let listenerTarget: HTMLElement | null = null;

    if (window.turnstile) {
      renderWidget();
    } else {
      const existing = document.getElementById(TURNSTILE_SCRIPT_ID);
      if (existing) {
        existing.addEventListener('load', renderWidget);
        listenerTarget = existing;
      } else {
        const script = document.createElement('script');
        script.id = TURNSTILE_SCRIPT_ID;
        script.src = TURNSTILE_SCRIPT_URL;
        script.async = true;
        script.defer = true;
        script.addEventListener('load', renderWidget);
        listenerTarget = script;
        document.head.appendChild(script);
      }
    }

    return () => {
      listenerTarget?.removeEventListener('load', renderWidget);
      if (window.turnstile && widgetIdRef.current !== undefined) {
        window.turnstile.remove(widgetIdRef.current);
      }
      widgetIdRef.current = undefined;
    };
  }, [siteKey, stage]);

  /** Tokens are single-use — reset the widget + clear state so a retry gets a fresh one. */
  function resetTurnstile(): void {
    setTurnstileToken(undefined);
    if (window.turnstile && widgetIdRef.current !== undefined) {
      window.turnstile.reset(widgetIdRef.current);
    }
  }

  async function completeLogin(): Promise<void> {
    await queryClient.invalidateQueries({ queryKey: sessionKey });
    void navigate({ to: '/audit/integrity' });
  }

  const onCredentials = handleSubmit(async (values) => {
    setError(null);
    setBusy(true);
    try {
      const res = await api.login(values.email, values.password, turnstileToken);
      setMethods(res.methods);
      setStage('mfa');
    } catch (err) {
      setError(messageFor(err));
      resetTurnstile(); // single-use token — refresh it for the next attempt
    } finally {
      setBusy(false);
    }
  });

  async function onPasskey(): Promise<void> {
    setError(null);
    setBusy(true);
    try {
      const optionsJSON = (await api.passkeyAuthOptions()) as Parameters<
        typeof startAuthentication
      >[0]['optionsJSON'];
      const assertion = await startAuthentication({ optionsJSON });
      const res = await api.passkeyAuthVerify(assertion);
      if (res.authenticated) await completeLogin();
      else setError('Passkey verification was rejected.');
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  }

  async function onRecovery(): Promise<void> {
    setError(null);
    setBusy(true);
    try {
      const res = await api.consumeRecovery(recoveryCode.trim());
      if (res.authenticated) await completeLogin();
      else setError('Recovery code was rejected.');
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto mt-10 max-w-sm">
      <h1 className="text-xl font-bold">Admin sign in</h1>

      {stage === 'credentials' && (
        <form className="mt-4 flex flex-col gap-3" onSubmit={onCredentials} aria-label="Sign in">
          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-sm font-medium">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              className="rounded border px-2 py-1"
              aria-invalid={errors.email ? true : undefined}
              {...register('email')}
            />
            {errors.email && <p role="alert" className="text-sm text-status-fail-fg">{errors.email.message}</p>}
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-sm font-medium">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              className="rounded border px-2 py-1"
              aria-invalid={errors.password ? true : undefined}
              {...register('password')}
            />
            {errors.password && <p role="alert" className="text-sm text-status-fail-fg">{errors.password.message}</p>}
          </div>
          {siteKey && (
            <div
              ref={widgetRef}
              data-testid="turnstile-widget"
              className="min-h-[65px]"
              aria-label="Verification challenge"
            />
          )}
          <button type="submit" disabled={busy} aria-busy={busy} className="rounded bg-black px-3 py-2 text-white disabled:opacity-60">
            {busy ? 'Signing in…' : 'Continue'}
          </button>
        </form>
      )}

      {stage === 'mfa' && (
        <div className="mt-4 flex flex-col gap-4">
          <p className="text-sm">Complete your second factor to finish signing in.</p>
          {methods.includes('webauthn') && (
            <button type="button" onClick={onPasskey} disabled={busy} aria-busy={busy} className="rounded bg-black px-3 py-2 text-white disabled:opacity-60">
              Use passkey
            </button>
          )}
          {methods.includes('recovery_code') && (
            <form
              className="flex flex-col gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void onRecovery();
              }}
              aria-label="Recovery code"
            >
              <label htmlFor="recovery" className="text-sm font-medium">Recovery code</label>
              <input
                id="recovery"
                type="text"
                className="rounded border px-2 py-1"
                value={recoveryCode}
                onChange={(e) => setRecoveryCode(e.target.value)}
              />
              <button type="submit" disabled={busy || recoveryCode.trim() === ''} className="rounded border px-3 py-2 disabled:opacity-60">
                Use recovery code
              </button>
            </form>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-4 text-sm text-status-fail-fg">
          {error}
        </p>
      )}
    </div>
  );
}
