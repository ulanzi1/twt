// Tone-review publish-gate HTTP adapter — Story 2.2 (AC3, AC4, AC5).
//
// Mounts the framework-agnostic `evaluateToneReviewGate` (@twt/domain tone-review)
// as a Fastify pre-handler on a member-visible-copy PUBLISH route. The HUMAN layer
// above Story 1.17's automated `microcopy` floor: it refuses to let copy publish
// unless a NON-AUTHOR reviewer has a recorded tone-review sign-off
// (docs/tone-guide.md + docs/tone-review-checklist.md are the process this enforces).
//
// ⚠ THERE IS NO PUBLISH ENDPOINT TO GATE AT STORY 2.2. This primitive is installed +
// unit-tested but mounted by NO route. The first consumer is Story 2.4's Niyamavali
// publish, which supplies the sign-off RESOLVER (persistence is the consumer's, per
// the locked scope decision) and adds this hook to its `preHandler` chain. The shape
// mirrors `requirePermissionHook` (modules/rbac): deps usage, the loud-500
// prerequisite guard, the injectable audit seam on deny.
//
// DEDICATED AUDIT SEAM. `tone_review.signoff` / `tone_review.publish_blocked` are NOT
// auth/security events — they do NOT extend the auth-typed `AuthAuditEventType`
// (audit/audit-sink.ts, whose own comment defers the SecurityAuditEventType rename).
// They route through this module's own `ToneReviewAuditSink`, whose default impl maps
// to a @twt/domain `AuditEntryInput` and calls `writeAuditEntry` (the Story 1.10
// global-chain writer) fire-and-forget / never-throw — the `createAuditLogSink`
// precedent. NO secret/raw copy material reaches the sink: the reviewed copy is a
// `contentHash` (SHA-256 hex), the audit `requestPayloadHash` is a digest.

import { createHash } from 'node:crypto';

import { audit, canonicalJsonStringify, ToneReviewRequiredError, toneReview } from '@twt/domain';
import type { FastifyRequest, preHandlerHookHandler } from 'fastify';
import type pg from 'pg';

import type { AppDeps } from '../../context.js';

const { writeAuditEntry } = audit;
type AuditEntryInput = audit.AuditEntryInput;
type ToneReviewSignoff = toneReview.ToneReviewSignoff;

/** The nil-UUID sentinel for global / no-specific-tenant audit rows (the auth-sink precedent). */
const GLOBAL_AUDIT_PARIWAR = '00000000-0000-0000-0000-000000000000';

const HEX64 = /^[0-9a-f]{64}$/i;

// ── Dedicated tone-review audit seam (NOT the auth taxonomy) ───────────────────

/** The closed set of tone-review audit events. */
export type ToneReviewAuditEventType = 'tone_review.signoff' | 'tone_review.publish_blocked';

export interface ToneReviewAuditEvent {
  readonly type: ToneReviewAuditEventType;
  /** Reviewer (signoff) or author (publish_blocked) actor id; null when unknown. */
  readonly actorId: string | null;
  /** Active Pariwar when scoped; null/global for pre-scope events. */
  readonly pariwarId?: string | null;
  /** Request correlation id (architecture §3.2). */
  readonly traceId?: string;
  /** The reviewed/published artifact's resource locator. */
  readonly resourceLocator: string;
  /** SHA-256 hex content hash of the reviewed copy (signoff only) — NEVER the copy. */
  readonly contentHash?: string;
  /** Non-sensitive structured context (denial reason, authoredBy, reviewedBy…). */
  readonly context?: Readonly<Record<string, unknown>>;
  /** Emission time; injectable clock keeps tests deterministic. */
  readonly at: Date;
}

export interface ToneReviewAuditSink {
  emit(event: ToneReviewAuditEvent): void;
}

function sha256Hex(s: string): string {
  return createHash('sha256').update(s, 'utf8').digest('hex');
}

/** SHA-256 of the canonical-JSON of a non-secret context object (the auth-sink precedent). */
function hashContext(context: unknown): string {
  try {
    return sha256Hex(canonicalJsonStringify(context ?? {}));
  } catch (err) {
    console.error(
      '[tone-review-audit] context not canonicalizable, using {} hash fallback',
      JSON.stringify({ error: errMessage(err) }),
    );
    return sha256Hex('{}');
  }
}

/** HTTP-equivalent status for a tone-review event: a sign-off is 200; a block is 409. */
function statusForToneReviewEvent(type: ToneReviewAuditEventType): number {
  return type === 'tone_review.publish_blocked' ? 409 : 200;
}

/**
 * Map a tone-review event onto the canonical audit-row input (AC4). The
 * `requestPayloadHash` is the reviewed-copy `contentHash` when present (a sign-off
 * carries one); otherwise the SHA-256 of the non-secret context (a publish-block has
 * no sign-off). The `action` is the dotted event type — both values match the
 * writer's `^[a-z0-9_]+(\.[a-z0-9_]+)+$` regex.
 */
export function toneReviewEventToAuditInput(event: ToneReviewAuditEvent): AuditEntryInput {
  if (event.contentHash && !HEX64.test(event.contentHash)) {
    console.error(
      '[tone-review-audit] contentHash is not a SHA-256 hex digest, falling back to context hash',
      JSON.stringify({ type: event.type, resourceLocator: event.resourceLocator }),
    );
  }
  const requestPayloadHash =
    event.contentHash && HEX64.test(event.contentHash)
      ? event.contentHash.toLowerCase()
      : hashContext(event.context);
  return {
    pariwarId: event.pariwarId ?? GLOBAL_AUDIT_PARIWAR,
    actorId: event.actorId,
    actorRole: null,
    action: event.type,
    resourceLocator: event.resourceLocator,
    requestPayloadHash,
    responseStatus: statusForToneReviewEvent(event.type),
    traceId: event.traceId ?? null,
  };
}

/**
 * The real tone-review audit sink (Story 1.10 writer). Persists every sign-off +
 * blocked-publish as a tamper-evident audit line. Never throws into the request path
 * (the `createAuditLogSink` contract).
 */
export function createToneReviewAuditSink(servicePool: pg.Pool): ToneReviewAuditSink {
  return {
    emit(event: ToneReviewAuditEvent): void {
      try {
        const input = toneReviewEventToAuditInput(event);
        void writeAuditEntry(servicePool, input).catch((err: unknown) => {
          console.error(
            '[tone-review-audit] failed to persist tone-review audit line',
            JSON.stringify({ type: event.type, error: errMessage(err) }),
          );
        });
      } catch (err) {
        console.error(
          '[tone-review-audit] failed to map tone-review audit event',
          JSON.stringify({ type: event.type, error: errMessage(err) }),
        );
      }
    },
  };
}

/**
 * Default inert tone-review sink: a single structured `console.info` line. The
 * `consoleAuthAuditSink` analogue — used in local/dev wiring where the hash-chain
 * sink is not desired; tests inject a capturing fake. Never throws.
 */
export const consoleToneReviewAuditSink: ToneReviewAuditSink = {
  emit(event: ToneReviewAuditEvent): void {
    try {
      console.info(
        '[tone-review-audit]',
        JSON.stringify({
          type: event.type,
          actorId: event.actorId,
          pariwarId: event.pariwarId ?? null,
          resourceLocator: event.resourceLocator,
          traceId: event.traceId ?? null,
          at: event.at.toISOString(),
          ...(event.context ? { context: event.context } : {}),
        }),
      );
    } catch {
      // An audit line must never take down the request path.
    }
  },
};

// ── The publish-gate pre-handler (AC3, AC5) ────────────────────────────────────

export interface RequireToneReviewSignoffOptions {
  /**
   * Resolve the recorded sign-off for the artifact being published, or `null` if
   * none exists. The CONSUMER supplies persistence (Story 2.4 owns the store + this
   * resolver) — Story 2.2 only injects the seam.
   */
  resolveSignoff: (
    request: FastifyRequest,
  ) => Promise<ToneReviewSignoff | null> | ToneReviewSignoff | null;
  /** Resolve the actor who authored the copy being published. */
  resolveAuthoredBy: (request: FastifyRequest) => string;
  /** Resolve the publish target's resource locator (for the denial + audit). */
  resolveResourceLocator: (request: FastifyRequest) => string;
}

/**
 * Build a Fastify pre-handler enforcing the tone-review sign-off on a publish route.
 * MUST run AFTER the request-context middleware (which sets `request.requestContext`)
 * — a missing context is a programming error → fail loud (500), the same contract as
 * `requirePermissionHook`. On deny it (1) emits `tone_review.publish_blocked` via the
 * dedicated audit seam, then (2) throws `ToneReviewRequiredError` → the error-mapping
 * middleware renders the 409 `tone_review.required`. The audit seam never throws, so
 * an audit failure cannot change the gate decision or crash the request.
 */
export function requireToneReviewSignoff(
  deps: AppDeps,
  opts: RequireToneReviewSignoffOptions,
): preHandlerHookHandler {
  return async function preHandler(request: FastifyRequest): Promise<void> {
    if (!request.requestContext) {
      // Programming error — mounted without the request-context middleware ahead of
      // it (no traceId/actorId available for the audit line). Fail loud (500).
      throw new Error('[tone-review] requireToneReviewSignoff ran without request context');
    }

    const authoredBy = opts.resolveAuthoredBy(request);
    const resourceLocator = opts.resolveResourceLocator(request);
    const signoff = await opts.resolveSignoff(request);

    const result = toneReview.evaluateToneReviewGate({ signoff, authoredBy, resourceLocator });
    if (result.allowed) return;

    const { denial } = result;
    // Emit the blocked-attempt audit line, then throw the 409. The emit is wrapped:
    // an audit-sink failure must NOT change the gate decision or replace the
    // ToneReviewRequiredError (the real sink never throws; this guards a bad injection).
    try {
      deps.toneReviewAuditSink.emit({
        type: 'tone_review.publish_blocked',
        // The actor attempting the publish (the author), when known.
        actorId: request.requestContext.actorId ?? denial.authoredBy ?? null,
        pariwarId: request.scopeTx?.pariwarId ?? null,
        traceId: request.requestContext.traceId,
        resourceLocator,
        context: {
          reason: denial.reason,
          authoredBy: denial.authoredBy,
          reviewedBy: denial.reviewedBy,
        },
        at: deps.clock(),
      });
    } catch (err) {
      console.error(
        '[tone-review] audit sink threw during publish_blocked emission — gate decision held',
        JSON.stringify({ resourceLocator, error: errMessage(err) }),
      );
    }
    throw new ToneReviewRequiredError(denial);
  };
}

// ── Sign-off recording helper (AC4) ────────────────────────────────────────────

export interface RecordToneReviewSignoffParams {
  /** The non-author reviewer's actor id. */
  reviewedBy: string;
  /** The reviewed artifact's resource locator. */
  resourceLocator: string;
  /** SHA-256 hex content hash of the reviewed copy — NEVER the copy itself. */
  contentHash: string;
  /** Active Pariwar, when scoped. */
  pariwarId?: string | null;
  /** Request correlation id. */
  traceId?: string;
}

/**
 * Record a tone-review sign-off (AC4) through the dedicated audit seam → the Story
 * 1.10 writer. Fire-and-forget / never-throw (the seam owns that contract). The
 * consuming surface (Story 2.4) calls this from its review-submission endpoint AND
 * owns the durable which-artifact-was-reviewed record (`clause_version_id` +
 * tone-reviewer attribution); Story 2.2 ships only the audit emission.
 */
export function recordToneReviewSignoff(deps: AppDeps, params: RecordToneReviewSignoffParams): void {
  deps.toneReviewAuditSink.emit({
    type: 'tone_review.signoff',
    actorId: params.reviewedBy,
    pariwarId: params.pariwarId ?? null,
    traceId: params.traceId,
    resourceLocator: params.resourceLocator,
    contentHash: params.contentHash,
    context: { reviewedBy: params.reviewedBy },
    at: deps.clock(),
  });
}

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
