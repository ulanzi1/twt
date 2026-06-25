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
  | 'login.logout'
  | 'passkey.enroll'
  | 'passkey.auth'
  | 'passkey.auth.failure'
  | 'recovery_code.consume'
  | 'recovery_code.failure'
  | 'password_reset.failure'
  | 'password_reset.request'
  | 'password_reset.consume'
  | 'step_up.send'
  | 'step_up.consume'
  | 'step_up.failure'
  | 'scope.change'
  | 'authz.denied'
  // ── Security-policy abuse signals (Story 1.14, §2.11 Layer-2) ────────────────
  // The taxonomy is becoming a general security-audit surface (it already carries
  // authz.denied + scope.change); a rename to SecurityAuditEventType is out of
  // scope (noted, not done — Story 1.14 Project Structure Notes).
  | 'rate_limit.exceeded'
  | 'abuse.honeypot'
  // ── Provisioning surface (Story 1.15, FR-61/FR-62) ───────────────────────────
  // The first global-scoped write surface. `pariwar.provisioned` records a new
  // Pariwar mint+passport-persist; `pariwar.deploy_triggered` records a Dokploy
  // build trigger via the deploy seam.
  | 'pariwar.provisioned'
  | 'pariwar.deploy_triggered'
  // ── Member mobile+OTP auth surface (Story 3.2, FR-1) ─────────────────────────
  // Member login/session/step-up/device events. EVERY context carries the otp_hash
  // (never the code) + masked mobile (last-4) only — never plaintext mobile, never a
  // token. The default sink is the Story 1.10 hash-chain (FR-47).
  | 'member_login.otp_send'
  | 'member_login.otp_consume'
  | 'member_login.failure'
  | 'member_session.refresh'
  | 'member_session.reuse_revoke'
  // Refresh rejected because the member's lifecycle state is withdrawn/anonymized
  // (PR-Patch-9): the login gate blocks such members, so a long-lived refresh chain
  // must too — the chain is revoked and this records it.
  | 'member_session.revoked'
  | 'member_session.logout'
  | 'member_step_up.send'
  | 'member_step_up.consume'
  | 'member_step_up.failure'
  | 'member_device.bound'
  | 'member_device.dropped';

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
