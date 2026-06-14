// Typed API client seam (Story 1.11b, DD-7).
//
// A thin hand-written fetch layer that parses every response with the SAME
// `@twt/contracts` Zod schemas the server validates against — single source of
// transport types, no hand-written shadow types (arch Naming L3719-3723). The full
// OpenAPI→client codegen is deferred (DD-7). Every call rides the HttpOnly +
// SameSite=Lax session cookie via `credentials: 'include'`; a 401 surfaces as an
// `ApiError` the router/Query layer redirects to /login on.

import {
  AuditIntegrityAcknowledgement,
  AuditIntegrityCheckList,
  AuditIntegrityCheckResult,
  LoginResponse,
  RecoveryConsumeResponse,
  SessionResponse,
  type AuditIntegrityAcknowledgement as Acknowledgement,
  type AuditIntegrityCheckList as CheckList,
  type AuditIntegrityCheckResult as CheckResult,
  type LoginResponse as LoginResult,
  type SessionResponse as Session,
} from '@twt/contracts';
import type { z } from 'zod';

/** A typed transport error — carries the HTTP status + the server's error code. */
export class ApiError extends Error {
  public constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
  public get isUnauthorized(): boolean {
    return this.status === 401;
  }
}

interface ErrorEnvelope {
  error?: { code?: string; message?: string };
}

/** Core fetch: same-origin, cookie-bearing, schema-validated. */
async function apiFetch<T>(
  path: string,
  schema: z.ZodType<T>,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  });

  if (!res.ok) {
    let code = `http.${res.status}`;
    let message = res.statusText || 'Request failed';
    try {
      const body = (await res.json()) as ErrorEnvelope;
      if (body.error?.code) code = body.error.code;
      if (body.error?.message) message = body.error.message;
    } catch {
      // Non-JSON error body — keep the status-derived defaults.
    }
    throw new ApiError(res.status, code, message);
  }

  // 204 (logout) has no body to parse.
  if (res.status === 204) return undefined as T;
  return schema.parse(await res.json());
}

// ── Audit-integrity surface (Story 1.11b) ─────────────────────────────────────

/** GET the recent integrity-check history (default 30, most-recent first). */
export function listIntegrityChecks(limit = 30): Promise<CheckList> {
  return apiFetch(`/api/v1/audit/integrity-checks?limit=${limit}`, AuditIntegrityCheckList);
}

/** POST an on-demand verification of the whole global chain (the 1.11a endpoint). */
export function runVerification(): Promise<CheckResult> {
  return apiFetch('/api/v1/audit/verify-integrity', AuditIntegrityCheckResult, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

/** POST an acknowledgement of a (failed) check with an investigation-ticket ref. */
export function acknowledgeCheck(
  checkId: string,
  ticketRef: string,
): Promise<Acknowledgement> {
  return apiFetch(
    `/api/v1/audit/integrity-checks/${encodeURIComponent(checkId)}/acknowledge`,
    AuditIntegrityAcknowledgement,
    { method: 'POST', body: JSON.stringify({ ticketRef }) },
  );
}

// ── Auth surface (Story 1.9 endpoints, driven by the login page) ──────────────

/** GET the current session's userId + global-scope grants (DD-6). */
export function getSession(): Promise<Session> {
  return apiFetch('/api/v1/auth/session', SessionResponse);
}

/** POST the first factor (email + password) → mfa_required. */
export function login(email: string, password: string): Promise<LoginResult> {
  return apiFetch('/api/v1/auth/login', LoginResponse, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

/** POST to fetch the WebAuthn authentication options (provider-controlled JSON). */
export async function passkeyAuthOptions(): Promise<unknown> {
  const res = await fetch('/api/v1/auth/passkey/authenticate/options', {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new ApiError(res.status, `http.${res.status}`, 'Passkey options failed');
  return res.json();
}

/** POST the WebAuthn assertion to complete the second factor. */
export async function passkeyAuthVerify(response: unknown): Promise<{ authenticated: boolean }> {
  const res = await fetch('/api/v1/auth/passkey/authenticate/verify', {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ response }),
  });
  if (!res.ok) throw new ApiError(res.status, `http.${res.status}`, 'Passkey verification failed');
  return res.json() as Promise<{ authenticated: boolean }>;
}

/** POST a recovery code as the second factor (single-use). */
export function consumeRecovery(code: string): Promise<{ authenticated: boolean }> {
  return apiFetch('/api/v1/auth/recovery/consume', RecoveryConsumeResponse, {
    method: 'POST',
    body: JSON.stringify({ code }),
  }) as Promise<{ authenticated: boolean }>;
}

/** GET a CSRF double-submit token (required by the logout mutation, ADR-0009). */
async function fetchCsrfToken(): Promise<string> {
  const res = await fetch('/api/v1/auth/csrf', { credentials: 'include' });
  if (!res.ok) throw new ApiError(res.status, `http.${res.status}`, 'CSRF token fetch failed');
  const body = (await res.json()) as { csrfToken: string };
  return body.csrfToken;
}

/** POST logout with the double-submit CSRF token; destroys the session. */
export async function logout(): Promise<void> {
  const csrfToken = await fetchCsrfToken();
  const res = await fetch('/api/v1/auth/logout', {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json', 'csrf-token': csrfToken },
    body: JSON.stringify({}),
  });
  if (!res.ok && res.status !== 401) {
    throw new ApiError(res.status, `http.${res.status}`, 'Logout failed');
  }
}
