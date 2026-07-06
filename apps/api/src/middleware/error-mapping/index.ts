// error-mapping middleware (AC-5, Task 1.4).
//
// The single transport-error boundary: every thrown error becomes a typed JSON
// `ErrorResponse` envelope (`_common/errors.ts`) carrying the request correlation
// id. Mapping order:
//   1. Zod validation failures (fastify-type-provider-zod) → 400 `request.validation`.
//   2. `ApiError` (this surface's own errors) → its statusCode/code/details.
//   3. `AuthorizationDeniedError` (RBAC second guard) → 403 via its own projector.
//   3a. `ToneReviewRequiredError` (tone-review publish gate, Story 2.2) → 409 via projector.
//   4. Known domain errors (scope invalid/missing, branded-id invalid) → mapped 4xx/5xx.
//   5. Anything else → 500 `internal.error` with NO internal detail leaked.
//
// The 500 path never exposes `err.message`/stack — it logs server-side (with the
// traceId) and returns an opaque envelope, per architecture §3.2 "uncaught → 500,
// no internal leak".

import { KycProviderError } from '@twt/contracts';
import {
  AuthorizationDeniedError,
  ClauseIdConflictError,
  ClauseNotFoundError,
  DraftNotFoundError,
  DraftSelfReviewError,
  DraftStateError,
  InvalidPariwarScopeError,
  PariwarScopeMissingError,
  TcPinnedClauseNotFoundError,
  TcStateError,
  TcVersionConflictError,
  TcVersionNotFoundError,
  TelegramOptInNotFoundError,
  TelegramOptInPendingExistsError,
  TelegramOptInStateError,
  ToneReviewRequiredError,
  WaOptInNotFoundError,
  WaOptInPendingExistsError,
  WaOptInStateError,
  ids,
  type ErrorResponseShape,
} from '@twt/domain';
import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod';

import { ApiError } from '../../http-errors.js';

/** KYC error-code → HTTP status (Story 3.3b). transport-down → 502; everything else 4xx. */
const KYC_ERROR_STATUS: Readonly<Record<string, number>> = {
  transaction_not_found: 404,
  transaction_expired: 409,
  user_consent_denied: 422,
  verification_failed: 422,
  signature_invalid: 422,
  certificate_stale: 422,
  provider_unavailable: 502,
};

function envelope(code: string, message: string, requestId: string, details?: unknown): ErrorResponseShape {
  return {
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
      request_id: requestId,
    },
  };
}

/**
 * The Fastify error handler. Bound to the app in `buildServer`. `request.requestContext`
 * is always set by the request-context middleware (it runs first), so `traceId`
 * is reliably present.
 */
export function errorMappingHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply,
): void {
  const requestId = request.requestContext?.traceId ?? 'unknown';

  // (1) Zod request-validation failure surfaced by fastify-type-provider-zod.
  if (hasZodFastifySchemaValidationErrors(error)) {
    void reply
      .status(400)
      .send(
        envelope('request.validation', 'Request failed schema validation', requestId, {
          issues: error.validation,
        }),
      );
    return;
  }

  // (2) This surface's own typed errors.
  if (error instanceof ApiError) {
    void reply.status(error.statusCode).send(error.toErrorResponse(requestId));
    return;
  }

  // (3) RBAC denial (the second guard — §2.6).
  if (error instanceof AuthorizationDeniedError) {
    void reply.status(403).send(error.toErrorResponse(requestId));
    return;
  }

  // (3a) Tone-review publish gate denial (Story 2.2) → 409 `tone-review-required`
  // (matches Story 2.4 publish contract). Same own-projector pattern as the RBAC 403.
  if (error instanceof ToneReviewRequiredError) {
    void reply.status(409).send(error.toErrorResponse(requestId));
    return;
  }

  // (3a′) KYC provider failure (Story 3.3b, AC2/AC5). The normalized, provider-neutral
  // KycProviderError thrown by the DigiLocker provider's verifyAndPullProfile/getStatus.
  // Its own `toErrorResponse` projector carries `{ code, retriable }` so the member app
  // branches to the manual-fallback empathy path. Mapped to HTTP by code (the callback is
  // the throw site; the 3.3a transport stays fenced).
  if (KycProviderError.is(error)) {
    const status = KYC_ERROR_STATUS[error.code] ?? 422;
    void reply.status(status).send(error.toErrorResponse(requestId));
    return;
  }

  // (3b) Niyamavali registry typed errors (Story 2.4, AC6 + the draft state machine).
  // Each owns its code + projector — the 2.3-deferred 409/404 mapping lands here.
  //   ClauseIdConflictError → 409 niyamavali.clause_id_conflict (create allocation race)
  //   ClauseNotFoundError   → 404 niyamavali.clause_not_found   (amend/deprecate absent)
  //   DraftNotFoundError    → 404 niyamavali.draft_not_found
  //   DraftStateError       → 409 niyamavali.draft_invalid_state (illegal transition)
  //   DraftSelfReviewError  → 409 niyamavali.draft_self_review   (author signed own draft)
  if (error instanceof ClauseIdConflictError) {
    void reply.status(409).send(error.toErrorResponse(requestId));
    return;
  }
  if (error instanceof ClauseNotFoundError) {
    void reply.status(404).send(error.toErrorResponse(requestId));
    return;
  }
  if (error instanceof DraftNotFoundError) {
    void reply.status(404).send(error.toErrorResponse(requestId));
    return;
  }
  if (error instanceof DraftStateError) {
    void reply.status(409).send(error.toErrorResponse(requestId));
    return;
  }
  if (error instanceof DraftSelfReviewError) {
    void reply.status(409).send(error.toErrorResponse(requestId));
    return;
  }

  // (3c) T&C registry typed errors (Story 2.6, AC6/AC7). Each owns its code + projector.
  //   TcVersionConflictError      → 409 terms_and_conditions.version_conflict (concurrent create race)
  //   TcVersionNotFoundError      → 404 terms_and_conditions.version_not_found
  //   TcStateError                → 409 terms_and_conditions.invalid_state (illegal transition)
  //   TcPinnedClauseNotFoundError → 422 terms_and_conditions.pinned_clause_not_found (absent/cross-tenant pin)
  if (error instanceof TcVersionConflictError) {
    void reply.status(409).send(error.toErrorResponse(requestId));
    return;
  }
  if (error instanceof TcVersionNotFoundError) {
    void reply.status(404).send(error.toErrorResponse(requestId));
    return;
  }
  if (error instanceof TcStateError) {
    void reply.status(409).send(error.toErrorResponse(requestId));
    return;
  }
  if (error instanceof TcPinnedClauseNotFoundError) {
    void reply.status(422).send(error.toErrorResponse(requestId));
    return;
  }

  // (3d) WA opt-in typed errors (Story 5.4, AC1/AC3/AC4). Each owns its code + projector.
  //   WaOptInNotFoundError       → 404 wa_opt_in.not_found
  //   WaOptInPendingExistsError  → 409 wa_opt_in.pending_exists (a PENDING is already outstanding)
  //   WaOptInStateError          → 409 wa_opt_in.invalid_state (illegal transition, e.g. a concurrent race)
  if (error instanceof WaOptInNotFoundError) {
    void reply.status(404).send(error.toErrorResponse(requestId));
    return;
  }
  if (error instanceof WaOptInPendingExistsError) {
    void reply.status(409).send(error.toErrorResponse(requestId));
    return;
  }
  if (error instanceof WaOptInStateError) {
    void reply.status(409).send(error.toErrorResponse(requestId));
    return;
  }

  // (3e) Telegram opt-in typed errors (Story 5.5, AC4/AC10). Each owns its code + projector.
  //   TelegramOptInNotFoundError      → 404 telegram_opt_in.not_found
  //   TelegramOptInPendingExistsError → 409 telegram_opt_in.pending_exists (a PENDING is already outstanding)
  //   TelegramOptInStateError         → 409 telegram_opt_in.invalid_state (illegal transition, e.g. a race)
  if (error instanceof TelegramOptInNotFoundError) {
    void reply.status(404).send(error.toErrorResponse(requestId));
    return;
  }
  if (error instanceof TelegramOptInPendingExistsError) {
    void reply.status(409).send(error.toErrorResponse(requestId));
    return;
  }
  if (error instanceof TelegramOptInStateError) {
    void reply.status(409).send(error.toErrorResponse(requestId));
    return;
  }

  // (4) Known domain errors.
  if (error instanceof InvalidPariwarScopeError) {
    void reply.status(400).send(envelope('scope.invalid', 'Invalid Pariwar scope', requestId));
    return;
  }
  if (error instanceof ids.InvalidBrandedIdError) {
    void reply.status(400).send(envelope('id.invalid', 'Malformed identifier', requestId));
    return;
  }
  if (error instanceof PariwarScopeMissingError) {
    // A missing scope at a query path is a server bug (middleware did not run) —
    // surface as 500 (loud) but with a stable code, not the raw message.
    request.log.error({ err: error, traceId: requestId }, 'pariwar scope missing at query path');
    void reply.status(500).send(envelope('scope.missing', 'Internal error', requestId));
    return;
  }

  // Fastify's own HTTP errors (e.g. 404 not-found, 429 from rate-limit) carry a
  // statusCode; preserve it but wrap in the envelope.
  const statusCode = typeof error.statusCode === 'number' ? error.statusCode : 500;
  if (statusCode >= 400 && statusCode < 500) {
    void reply
      .status(statusCode)
      .send(envelope(error.code ?? 'request.error', 'Request error', requestId));
    return;
  }

  // (5) Uncaught — log server-side, leak nothing.
  request.log.error({ err: error, traceId: requestId }, 'unhandled error');
  void reply.status(500).send(envelope('internal.error', 'Internal server error', requestId));
}
