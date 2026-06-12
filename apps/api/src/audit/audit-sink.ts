// AuthAuditSink — the injectable audit seam for every privileged auth event
// (AC-9, Task 6.1).
//
// THE SEAM, NOT THE SINK. Story 1.8 exposed `onAuthorizationDenied` without
// building the sink; this is the symmetric move for the auth surface. The default
// implementation is a structured log line. The FR-47 tamper-evident hash-chain
// audit log + `events_log` writes + off-site mirror are **Story 1.10** (D-item →
// 1.10) — do NOT build hash chaining here (Reconciliation R4). Story 1.10 swaps a
// real sink in via dependency injection WITHOUT touching auth code.
//
// Events carry NO secret material: an OTP is referenced by `otp_hash`, never the
// code; a password is never logged; a session id is referenced, never its cookie.

/** The closed set of privileged auth events emitted to the sink. */
export type AuthAuditEventType =
  | 'login.success'
  | 'login.failure'
  | 'login.lockout'
  | 'passkey.enroll'
  | 'passkey.auth'
  | 'passkey.auth.failure'
  | 'recovery_code.consume'
  | 'recovery_code.failure'
  | 'password_reset.request'
  | 'password_reset.consume'
  | 'step_up.send'
  | 'step_up.consume'
  | 'step_up.failure'
  | 'scope.change'
  | 'authz.denied';

export interface AuthAuditEvent {
  readonly type: AuthAuditEventType;
  /** The acting subject (user) id when known; null for pre-identification events. */
  readonly actorId: string | null;
  /** The active Pariwar when the event is scoped; null for global/pre-scope events. */
  readonly pariwarId?: string | null;
  /** Request correlation id (architecture §3.2). */
  readonly traceId?: string;
  /** Non-sensitive structured context (otp_hash, action_context, prev/new scope…). */
  readonly context?: Readonly<Record<string, unknown>>;
  /** Emission time; injectable clock keeps tests deterministic. */
  readonly at: Date;
}

export interface AuthAuditSink {
  emit(event: AuthAuditEvent): void;
}

/**
 * Default sink: a single structured `console.info` line tagged `[auth-audit]`.
 * Deliberately inert beyond logging — the real sink is Story 1.10. Never throws
 * (an audit-sink failure must not break the auth path); a sink that needs
 * durability guarantees is the 1.10 hash-chain's concern.
 */
export const consoleAuthAuditSink: AuthAuditSink = {
  emit(event: AuthAuditEvent): void {
    try {
      console.info(
        '[auth-audit]',
        JSON.stringify({
          type: event.type,
          actorId: event.actorId,
          pariwarId: event.pariwarId ?? null,
          traceId: event.traceId ?? null,
          at: event.at.toISOString(),
          ...(event.context ? { context: event.context } : {}),
        }),
      );
    } catch {
      // An audit log line must never take down the request path.
    }
  },
};
