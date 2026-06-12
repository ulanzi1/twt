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
  fields: { actorId?: string | null; pariwarId?: string | null; context?: Record<string, unknown> } = {},
): void {
  deps.auditSink.emit({
    type,
    actorId: fields.actorId ?? request.requestContext.actorId ?? null,
    pariwarId: fields.pariwarId ?? request.requestContext.pariwarId ?? null,
    traceId: request.requestContext.traceId,
    ...(fields.context ? { context: fields.context } : {}),
    at: deps.clock(),
  });
}
