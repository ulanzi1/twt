// Auth audit-emit helper (Story 1.9, AC-9).
//
// Thin wrapper that stamps every privileged auth event with the request's traceId
// + clock time and forwards to the injectable `AuthAuditSink` (default: structured
// log; the FR-47 hash-chain sink is Story 1.10 — Reconciliation R4). Centralizing
// emission keeps every call site consistent (no secret material — otp_hash never
// the code, never a plaintext email/password/token).

import type { FastifyRequest } from 'fastify';

import type { AuthAuditEventType } from '../../../audit/audit-sink.js';
import type { AppDeps } from '../../../context.js';

export function emitAuthAudit(
  deps: AppDeps,
  request: FastifyRequest,
  type: AuthAuditEventType,
  fields: {
    actorId?: string | null;
    pariwarId?: string | null;
    context?: Record<string, unknown>;
    /**
     * ⭐⭐ OPTIONAL `resource_locator` override — forwarded verbatim to {@link AuthAuditEvent}.
     *
     * ⚠⛔⛔ **THIS IS THE ⛔ ONLY CHANNEL BY WHICH A CALLER CAN NAME *WHAT* AN EVENT WAS ABOUT.**
     * `context` is **SHA-256 HASHED** into `request_payload_hash` and `audit_log_entries` has ⛔ **no
     * context column**, so a value passed in `context` alone survives ⛔ only as a hash preimage —
     * the row is then indistinguishable from every other row with the same actor and action.
     * ⇒ ⭐ an AC requiring an audit line to **NAME** a resource is satisfied **HERE**, ⛔ not by
     * `context` ([[feedback_trace_internal_state_never_cite_decision_text]] — trace BUILT?, ⛔ never
     * assume a doc-block's claim).
     *
     * ⛔⛔ **NON-PII, SHORT, CALLER-AUTHORED ONLY** — see `AuthAuditEvent.resourceLocator`. ⛔ It is
     * ⛔ NOT a channel for query context and ⛔ NOT a channel for anything a member typed.
     * ⚠ It is guarded, ⛔ not trusted: a value failing `RESOURCE_LOCATOR_PATTERN`
     * (`/^[a-z0-9][a-z0-9:_.-]{0,127}$/` — ⭐ **LOWERCASE ONLY**) is DISCARDED and the row silently
     * falls back to `user:<actorId>`. ⇒ ⭐ **lowercase your identifier before passing it**, and
     * assert the persisted row rather than the in-memory sink.
     */
    resourceLocator?: string;
  } = {},
): void {
  deps.auditSink.emit({
    type,
    actorId: fields.actorId ?? request.requestContext.actorId ?? null,
    pariwarId: fields.pariwarId ?? request.requestContext.pariwarId ?? null,
    traceId: request.requestContext.traceId,
    ...(fields.context ? { context: fields.context } : {}),
    ...(fields.resourceLocator !== undefined ? { resourceLocator: fields.resourceLocator } : {}),
    at: deps.clock(),
  });
}
