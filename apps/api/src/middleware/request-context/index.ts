// request-context middleware (AC-5, Task 1.3) — §3 L3891 AsyncLocalStorage.
//
// At request entry it (1) generates a traceId, (2) hydrates a request-context ALS
// store with `{ traceId, actorId?, pariwarId? }` so deep code (audit emit, error
// mapping) reads the context without threading it through every call, (3) mirrors
// it onto `request.requestContext`, and (4) populates the domain
// `encryptionContextStorage` with the admin-global encryption store so Tier-1
// encrypt/decrypt of the admin email works inside handlers (discharges D14-1.5(b)).
//
// Uses `enterWith` (not `run`) because a Fastify onRequest hook cannot wrap the
// whole request lifecycle in a callback — Fastify runs each request in its own
// async context, so `enterWith` sets the store for that context. The actorId is
// back-filled by the auth layer once the session resolves (the store object is
// mutated in place + re-entered).

import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

import { encryption } from '@twt/domain';
import type { FastifyReply, FastifyRequest, onRequestHookHandler } from 'fastify';

import type { AppDeps } from '../../context.js';
import { ADMIN_EMAIL_FIELD_CLASS, ADMIN_GLOBAL_NAMESPACE } from '../../context.js';
import type { RequestContext } from '../../types.js';

/** The request-context AsyncLocalStorage — read by audit + error-mapping. */
export const requestContextStorage = new AsyncLocalStorage<RequestContext>();

/** Read the current request context (or undefined outside a request). */
export function getRequestContext(): RequestContext | undefined {
  return requestContextStorage.getStore();
}

const TRACE_HEADER = 'x-request-id';

function sanitizeTraceId(value: string): string {
  // Keep only printable ASCII (0x20–0x7E); strips control chars and non-ASCII.
  return value.replace(/[^ -~]/g, '').slice(0, 128);
}

/**
 * Build the onRequest hook bound to `deps`. The admin-global encryption store
 * (ADMIN_GLOBAL_NAMESPACE) is what the admin email blind-index + Tier-1 envelope
 * key on (Reconciliation R2 — admin identity is global, not Pariwar-scoped).
 */
export function requestContextHook(deps: AppDeps): onRequestHookHandler {
  return function onRequest(
    request: FastifyRequest,
    reply: FastifyReply,
    done: (err?: Error) => void,
  ): void {
    const incoming = request.headers[TRACE_HEADER];
    const traceId =
      typeof incoming === 'string' && incoming.length > 0
        ? sanitizeTraceId(incoming) || randomUUID()
        : randomUUID();

    const ctx: RequestContext = { traceId };
    request.requestContext = ctx;
    requestContextStorage.enterWith(ctx);

    // Admin-identity encryption context (global namespace). Tier-1 admin-email
    // encrypt/decrypt + blindIndex run under this store inside handlers.
    encryption.encryptionContextStorage.enterWith({
      context: { pariwarId: ADMIN_GLOBAL_NAMESPACE, fieldClass: ADMIN_EMAIL_FIELD_CLASS },
      kms: deps.encryption.kms,
      kekRef: deps.encryption.kekRef,
      hmacKeyRef: deps.encryption.hmacKeyRef,
    });

    // Echo the correlation id so clients + the audit trail can stitch the request.
    void reply.header(TRACE_HEADER, traceId);
    done();
  };
}
