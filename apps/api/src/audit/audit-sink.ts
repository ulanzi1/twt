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
  | 'member_device.dropped'
  // ── Member first-signup creation surface (Story 3.6a, FR-1) ──────────────────
  // The signup-create endpoint that finally mints the member from the signup_continuation seam
  // (the FIRST production member.signup_initiated). Context carries masked-mobile (last-4) ONLY —
  // NEVER plaintext mobile, NEVER the continuation token / jti.
  //   created — a member was created (members row + member_identities + the full session issued).
  //   failure — a signup-create attempt was rejected (bad/expired/consumed continuation, mobile
  //             mismatch, duplicate member, or the default Pariwar is unconfigured).
  | 'member_signup.created'
  | 'member_signup.failure'
  // ── Member KYC signup surface (Story 3.3b, FR-2) ─────────────────────────────
  // KYC step events. Context carries masked-Aadhaar (last-4) + transaction_id ONLY —
  // NEVER name/dob/photo/raw Aadhaar, NEVER the OAuth code or PKCE code_verifier.
  //   initiate   — a DigiLocker pull was begun;
  //   verified   — the eAadhaar was verified+persisted (callback step);
  //   confirmed  — the member confirmed the shown DigiLocker profile (confirm step);
  //   manual     — a self-declared manual-fallback record was stored;
  //   failure    — a DigiLocker verification failure (routes the member to manual, AC2).
  | 'member_kyc.initiate'
  | 'member_kyc.verified'
  | 'member_kyc.confirmed'
  | 'member_kyc.manual'
  | 'member_kyc.failure'
  // Story 3.4 — signup nominee declaration. NON-PII context only (nominee_count + split);
  // NEVER nominee name/mobile/address. Emitted once per declare (and re-declare via 3.9).
  //   declared — 1–2 nominees were declared with a server-derived 75/25 (or sole) split.
  | 'member_nominees.declared'
  // Story 3.5 — signup medical disclosure. NON-PII context only (ima_list_version +
  // condition_count); NEVER the selected condition codes / free-text additional context.
  // Emitted once per submit (and re-submit via 3.9 — append-only history).
  //   disclosed — a medical disclosure + concealment-denial ack was recorded.
  | 'member_medical.disclosed'
  // Story 3.6a — signup T&C acceptance (the SECOND consent-registry consumer, copying 3.5's
  // audit-or-throw chain). NON-PII context (tc_version_id only); the legal body is public text.
  //   accepted — a tc_acceptance consent was recorded (fire-and-forget emitAuthAudit, after ok=true).
  // The compensating `member_terms.accept_rolled_back` (5xx) line is written DIRECTLY via
  // writeAuditEntry on a post-audit rollback (NOT via emitAuthAudit) — mirroring 3.5's
  // `member_medical.disclosure_rolled_back`, which is likewise absent from this emit-sink union.
  | 'member_terms.accepted'
  // ── Member signup ₹110 Vyawastha Shulk surface (Story 3.6b, FR-1 / AR-67) ─────
  // The signup-fee payment + the 5-condition lock-in entry gate. Context is NON-PII: masked UTR
  // (last-4) + amount only — NEVER a full UTR, NEVER a token. The reference-code capture (D2 port
  // seam) + the lock-in clock-start marker emit here too.
  //   intent   — a UPI Intent URL was built (the OS-level handoff seam).
  //   paid     — a receipt was persisted (the load-bearing confirm; AR-67 indefinite retention).
  //   failure  — a confirm/intent attempt was rejected (unconfigured VPA, terminal member, etc.).
  | 'member_vyawastha_shulk.intent'
  | 'member_vyawastha_shulk.paid'
  | 'member_vyawastha_shulk.failure'
  // The Reference Code port-seam capture (D2/R5) — attribution_source stored; NO registry validation,
  // NO new lifecycle event (the 14-event member vocabulary is frozen). Context carries no PII.
  | 'member_attribution.captured'
  // The lock-in clock-start marker (member.lock_in_entered emitted) — context carries the FR-8
  // lock_in_days_at_join snapshot + the resolved lock_in_policy_version (both NON-PII).
  | 'member.lock_in_entered'
  // ── Member Life Events panel surface (Story 3.9, FR-5) ───────────────────────
  // Self-service address + posting updates (nominee + medical Life Events updates reuse the 3.4/3.5
  // audit lines above). Context is NON-PII: address carries a presence marker ONLY (NEVER the raw
  // address bytes); posting carries district (non-PII geographic) + is_retirement.
  //   address.updated — a new append-only member_addresses row was written + member.address_updated emitted.
  //   posting.updated — a new append-only member_postings row was written + member.posting_updated emitted.
  | 'member_life_events.address_updated'
  | 'member_life_events.posting_updated'
  // ── Member voluntary-withdrawal surface (Story 3.10, FR-6) ───────────────────
  // The withdrawal confirm (member.withdrawal_completed emitted → state withdrawn) + the signup
  // rejoin-lock block. Context is NON-PII: reason_code (bounded enum) + rejoin_permitted_at only —
  // NEVER the free-text reason_text (Tier-1, member_withdrawals only), NEVER a token. The actorId
  // carries the member_id; the rejoin-block line carries masked mobile (last-4) + rejoin_permitted_at.
  //   completed      — a withdrawal was confirmed (₹110 forfeited; 12-month rejoin lock written).
  //   rejoin_blocked — a same-identity signup was blocked inside the 12-month rejoin-lock window.
  | 'member_withdrawal.completed'
  | 'member_withdrawal.rejoin_blocked'
  // ── Member data-export surface (Story 3.11, FR-95 / DPDPA data-portability) ───
  // The export request + the one-time gated download. Context is NON-PII: export_id, member_id (the
  // actorId), status, byte size — NEVER any exported field value, NEVER the plaintext. The `.generated`
  // line is emitted by the apps/jobs build worker (via writeAuditEntry directly, not this sink); it is
  // listed here for taxonomy completeness.
  //   requested  — a member requested an export (pending row created + build job enqueued).
  //   generated  — the build worker finished the ZIP + stored it envelope-encrypted (jobs-side).
  //   downloaded — the one-time gated download streamed the ZIP (consumed_at stamped).
  | 'member_data_export.requested'
  | 'member_data_export.generated'
  | 'member_data_export.downloaded';

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
