// Member self-verify recovery handlers — Story 9.7 (Tasks 3/4; AC2/AC3/AC4).
//
// The member-facing RECOVERY surface's server half: a screenshot-upload transport (the ONE budgeted
// friction surface, FR-32) + the `<SelfVerifySurface>` detail read (default / uploaded / resolved).
//
// ── The upload flow (AC3/AC4) — cloned from the 9.3 reconciliation upload discipline ─────────────────
// The ROUTE-facing `uploadScreenshot` resolves authz + the mandatory-only-on-mismatch GUARD (member session
// → own-live-pool resolution → pool-id match → the mismatch/fallback gate), then hands a resolved context to
// the injectable TRANSPORT core `uploadScreenshotTransport` (the 9.3 `uploadBankStatement` split, so the
// transport is unit-testable within a rolled-back tx): read the multipart file → MIME/byte-cap/emptiness →
// VIRUS-SCAN (AR-45, the reused 9.3 StatementScanner) → STORE the bytes (AR-45) → APPEND
// `reconciliation.self-verify-screenshot-uploaded` on the ALERT stream (Decision D2) → audit → return the
// advanced `status`. Best-effort blob cleanup on an append failure. Storage/scanner outage → dignified 503;
// a rejected upload (no mismatch + no fallback, too large, empty, wrong MIME, quarantined) → dignified 4xx.
//
// ── PURE EVIDENCE INTAKE (AC4, load-bearing) ─────────────────────────────────────────────────────────
// The upload path RECORDS evidence and (via the event seam) notifies the Story 9.8 reviewer — full stop. It
// emits NO `contribution.confirmed`, remaps NO wrong-pool payment, re-runs NO matcher, mutates NO status.
// The member stays red/mismatch until the 9.4 matcher or the 9.8 trustee confirms. There is DELIBERATELY no
// matcher-enqueue call in this module (contrast the 9.3 staff upload, which DOES re-trigger the matcher — a
// new bank statement changes outcomes; a member screenshot never does).

import { randomUUID } from 'node:crypto';

import {
  SELF_VERIFY_SCREENSHOT_MAX_BYTES,
  SELF_VERIFY_SCREENSHOT_MIME_TYPES,
  type ContributionMismatchReasonCode,
  type SelfVerifyScreenshotUploadResponse,
  type SelfVerifyStateResponse,
} from '@twt/contracts';
import { contribution as contributionDomain, ids, reconciliation } from '@twt/domain';
import type { FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import {
  BadRequestError,
  NotFoundError,
  PayloadTooLargeError,
  ServiceUnavailableError,
  UnauthorizedError,
} from '../../http-errors.js';
import type { ScopeTx } from '../../types.js';
import { emitAuthAudit } from '../auth/shared/audit.js';
import { resolveMemberLivePool } from '../member-pool/handlers.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';
import { ResilientCall, StorageUnavailableError } from '../reconciliation/resilience.js';

/** The self-verify recovery default state (no mismatch, no upload) — the fail-soft + neutral shape. */
const SELF_VERIFY_DEFAULT: SelfVerifyStateResponse = {
  mismatch: false,
  reason: null,
  screenshotUploaded: false,
  status: 'default',
};

/**
 * The resolved upload context the guard hands the transport core — the member's OWN live pool + alert +
 * the mismatch reference. `mismatchReason` is the live mismatch's reason-code (persisted on the event) or
 * `null` for an explicit "Trouble with UTR?" fallback. `auditReason` is the NON-PII machine token for the
 * audit line (the reason, or `trouble_with_utr`).
 */
export interface SelfVerifyUploadContext {
  readonly pariwarId: ids.PariwarId;
  readonly poolId: ids.PoolId;
  readonly alertId: ids.AlertId;
  readonly memberId: string;
  readonly mismatchReason: ContributionMismatchReasonCode | null;
  readonly auditReason: string;
}

export function createSelfVerifyHandlers(deps: AppDeps) {
  // ONE ResilientCall per external dependency (its own breaker state persists across requests). AR-45.
  // Tuned like the 9.3 upload: scan + store sit in the same synchronous request, so 2 attempts × 1.5s keeps
  // the worst case near ~6s rather than the untuned 3×5s.
  const storageCall = new ResilientCall('self-verify-screenshot-storage', { attempts: 2, timeoutMs: 1_500 });
  const scannerCall = new ResilientCall('statement-scanner', { attempts: 2, timeoutMs: 1_500 });

  /** Read the authenticated member's (memberId, pariwarId) or fail 401. */
  function memberCtx(request: FastifyRequest): { memberIdStr: string; pariwarIdStr: string } {
    const memberIdStr = request.requestContext.actorId;
    const pariwarIdStr = request.requestContext.pariwarId;
    if (!memberIdStr || !pariwarIdStr) {
      throw new UnauthorizedError('Authentication required', 'auth.session_required');
    }
    return { memberIdStr, pariwarIdStr };
  }

  /**
   * The injectable TRANSPORT core (AC3/AC4). Runs read→MIME→cap→scan→store→emit→audit over the caller's
   * scope tx + a resolved context. A rejected upload throws a dignified 4xx BEFORE any store; a
   * storage/scanner outage throws a dignified 503 (never a 500). PURE EVIDENCE INTAKE — no verdict, no remap.
   */
  async function uploadScreenshotTransport(
    request: FastifyRequest,
    scopeTx: ScopeTx,
    ctx: SelfVerifyUploadContext,
  ): Promise<SelfVerifyScreenshotUploadResponse> {
    const poolIdStr = ctx.poolId;
    // (1) Read the multipart file.
    const data = await request.file();
    if (!data) {
      throw new BadRequestError('No screenshot in the upload', 'self_verify.no_file');
    }
    let buffer: Buffer;
    try {
      buffer = await data.toBuffer();
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === 'FST_REQ_FILE_TOO_LARGE' || code === 'FST_FILES_LIMIT') {
        rejectAudit(request, ctx, 'too_large');
        throw new PayloadTooLargeError('Screenshot exceeds the size limit', 'self_verify.too_large', {
          maxBytes: SELF_VERIFY_SCREENSHOT_MAX_BYTES,
        });
      }
      // Any other multipart read failure (client disconnect, malformed stream, …) — dignified 503, never a
      // raw 500. AC3's "never a 500" AR-45 contract covers the whole endpoint, not just scan/store.
      request.log.warn({ err, poolId: poolIdStr }, 'self-verify upload: multipart read failed');
      throw new ServiceUnavailableError(
        'We could not read your upload just now — please try again in a little while',
        'self_verify.upload_read_failed',
      );
    }
    // (2) Exact byte cap + emptiness (defense-in-depth beyond the plugin limit).
    if (data.file.truncated || buffer.byteLength > SELF_VERIFY_SCREENSHOT_MAX_BYTES) {
      rejectAudit(request, ctx, 'too_large');
      throw new PayloadTooLargeError('Screenshot exceeds the size limit', 'self_verify.too_large', {
        maxBytes: SELF_VERIFY_SCREENSHOT_MAX_BYTES,
      });
    }
    if (buffer.byteLength === 0) {
      throw new BadRequestError('The uploaded screenshot is empty', 'self_verify.empty');
    }
    // (3) MIME allowlist — image OR PDF only (UX §11). A screenshot is stored opaque for a human reviewer,
    //     never parsed, so anything outside the set is a dignified 4xx (no fallback path). Normalize case +
    //     strip any `; charset=...` parameter suffix before matching — some RN FormData polyfills emit one.
    const rawContentType = data.mimetype || 'application/octet-stream';
    const contentType = (rawContentType.split(';')[0] ?? rawContentType).trim().toLowerCase();
    if (!SELF_VERIFY_SCREENSHOT_MIME_TYPES.includes(contentType)) {
      rejectAudit(request, ctx, 'unsupported_type');
      throw new BadRequestError('Please upload a photo or PDF of your payment', 'self_verify.unsupported_type');
    }

    const bytes = new Uint8Array(buffer);

    // (4) Virus-scan quarantine (AR-45-wrapped, the reused 9.3 scanner). Unclean ⇒ reject + audit.
    let scan;
    try {
      scan = await scannerCall.run(() => deps.statementScanner.scan(bytes));
    } catch (err) {
      throw mapStorageOutage(err, request, deps, ctx);
    }
    if (!scan.clean) {
      emitAuthAudit(deps, request, 'member_self_verify.upload_rejected', {
        actorId: ctx.memberId,
        pariwarId: ctx.pariwarId,
        context: { pool_id: poolIdStr, reason: 'quarantined', scan_reason: scan.reason },
      });
      throw new BadRequestError(
        'We could not accept this file — please upload your screenshot again',
        'self_verify.file_quarantined',
      );
    }

    // (5) Store the raw bytes (AR-45-wrapped). The object key is opaque + non-PII, minted per upload.
    const objectKey = `pariwar/${ctx.pariwarId}/pool/${poolIdStr}/${randomUUID()}`;
    try {
      await storageCall.run(() => deps.selfVerifyScreenshotStorage.put(objectKey, bytes, { contentType }));
    } catch (err) {
      throw mapStorageOutage(err, request, deps, ctx);
    }

    // (6) Append the evidence event on the ALERT stream (Decision D2). PURE EVIDENCE INTAKE (AC4): records
    //     the blob key + the mismatch reference and NOTHING else. On an append failure, best-effort clean up
    //     the just-stored blob (never orphan a Tier-1 blob).
    try {
      await reconciliation.appendSelfVerifyScreenshotUploaded(scopeTx.client, {
        pariwarId: ctx.pariwarId,
        alertId: ctx.alertId,
        actorId: ctx.memberId,
        payload: {
          poolId: poolIdStr,
          memberId: ctx.memberId,
          alertId: ctx.alertId,
          objectKey,
          mismatchReason: ctx.mismatchReason,
          contentType,
          uploadedAt: deps.clock().toISOString(),
        },
      });
    } catch (err) {
      try {
        await deps.selfVerifyScreenshotStorage.delete?.(objectKey);
      } catch (cleanupErr) {
        // The append failed AND the compensating delete also failed — the blob is now orphaned. Give it
        // its own audit trail rather than silently swallowing the cleanup failure (it needs a distinct
        // signal from a routine append failure so an on-call engineer can find + reap the orphan).
        emitAuthAudit(deps, request, 'member_self_verify.storage_unavailable', {
          actorId: ctx.memberId,
          pariwarId: ctx.pariwarId,
          context: {
            pool_id: poolIdStr,
            dependency: 'self-verify-screenshot-storage',
            kind: 'orphaned_blob_cleanup_failed',
            object_key: objectKey,
          },
        });
        request.log.error({ err: cleanupErr, objectKey }, 'self-verify upload: orphaned blob cleanup failed');
      }
      // A busy alert stream (SAVEPOINT retry budget exhausted) is a dignified 503, never a raw 500.
      if (err instanceof reconciliation.SelfVerifyAppendRetryExhaustedError) {
        throw new ServiceUnavailableError(
          'We could not save your screenshot just now — please try again in a little while',
          'self_verify.append_retry_exhausted',
        );
      }
      throw err;
    }

    emitAuthAudit(deps, request, 'member_self_verify.screenshot_uploaded', {
      actorId: ctx.memberId,
      pariwarId: ctx.pariwarId,
      // The machine reason token only — never the screenshot bytes, never a UTR, never free text.
      context: { pool_id: poolIdStr, reason: ctx.auditReason, content_type: contentType },
    });
    return { status: 'uploaded' };
  }

  /** Emit a rejection audit line (NON-PII: pool + a machine reason token). */
  function rejectAudit(
    request: FastifyRequest,
    info: { memberId: string; pariwarId: ids.PariwarId; poolId: ids.PoolId | string },
    reason: string,
  ): void {
    emitAuthAudit(deps, request, 'member_self_verify.upload_rejected', {
      actorId: info.memberId,
      pariwarId: info.pariwarId,
      context: { pool_id: info.poolId, reason },
    });
  }

  /** Map an AR-45 outage (StorageUnavailableError) to a dignified 503 + audit line; rethrow anything else. */
  function mapStorageOutage(err: unknown, request: FastifyRequest, d: AppDeps, ctx: SelfVerifyUploadContext): Error {
    if (err instanceof StorageUnavailableError) {
      emitAuthAudit(d, request, 'member_self_verify.storage_unavailable', {
        actorId: ctx.memberId,
        pariwarId: ctx.pariwarId,
        context: { pool_id: ctx.poolId, dependency: err.dependency, kind: err.kind },
      });
      return new ServiceUnavailableError(
        'We could not save your screenshot just now — please try again in a little while',
        'self_verify.storage_unavailable',
      );
    }
    return err instanceof Error ? err : new Error(String(err));
  }

  return {
    uploadScreenshotTransport,

    /**
     * POST /api/v1/member/self-verify/screenshot (AC3/AC4). Resolves authz + the mandatory-only-on-mismatch
     * guard, then runs the transport core. Accepts a screenshot ONLY for a pool where the member has an
     * unresolved mismatch, OR the explicit FR-32 "Trouble with UTR?" fallback. Never a 500.
     */
    async uploadScreenshot(request: FastifyRequest): Promise<SelfVerifyScreenshotUploadResponse> {
      const { memberIdStr, pariwarIdStr } = memberCtx(request);
      const memberId = ids.memberId(memberIdStr);
      const pariwarId = ids.pariwarId(pariwarIdStr);
      const query = request.query as { pool_id: string; fallback?: boolean };
      const now = deps.clock();

      const scopeTx = await openScopeTx(deps, pariwarIdStr);
      let ok = false;
      try {
        // (1) Resolve the member's OWN live assigned pool (the FR-12A self-scope). No active/live pool ⇒ 404.
        const chosen = await resolveMemberLivePool(scopeTx.tx, request, { memberId, pariwarId, now });
        if (chosen === null) {
          throw new NotFoundError('No active pool to self-verify', 'self_verify.no_active_pool');
        }
        // (2) The upload target MUST be the member's own live pool — never another pool (no oracle).
        if (query.pool_id !== chosen.pool.poolId) {
          throw new NotFoundError('No such pool for this member', 'self_verify.pool_not_found');
        }
        const poolId = ids.poolId(chosen.pool.poolId);

        // (3) The mandatory-only-on-mismatch guard (AC3, FR-32). Accept ONLY when the member has an
        //     unresolved mismatch OR this is the explicit "Trouble with UTR?" fallback — there is NO
        //     happy-path screenshot door. A no-mismatch, no-fallback upload is a dignified 4xx.
        const state = await contributionDomain.resolveMemberSelfVerifyState(scopeTx.tx, {
          pariwarId,
          memberId,
          poolId,
        });
        const fallback = query.fallback === true;
        if (!state.mismatch && !fallback) {
          rejectAudit(request, { memberId: memberIdStr, pariwarId, poolId: chosen.pool.poolId }, 'no_mismatch_no_fallback');
          throw new BadRequestError('There is nothing to verify for this pool right now', 'self_verify.no_mismatch');
        }

        const body = await uploadScreenshotTransport(request, scopeTx, {
          pariwarId,
          poolId,
          alertId: ids.alertId(chosen.alertId),
          memberId: memberIdStr,
          mismatchReason: state.mismatch ? state.reason : null,
          auditReason: state.mismatch ? (state.reason ?? 'mismatch') : 'trouble_with_utr',
        });
        ok = true;
        return body;
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
    },

    /**
     * GET /api/v1/member/self-verify/:poolId (AC2). The `<SelfVerifySurface>` detail read — the member's OWN
     * recovery state for one pool (default / uploaded / resolved + the mismatch reason). Member-scoped
     * (FR-12A). Fail-soft to the neutral default on any error (the surface has its own retry affordance; the
     * card is the authoritative entry signal) — never a 500 wall.
     */
    async selfVerifyState(request: FastifyRequest): Promise<SelfVerifyStateResponse> {
      const { memberIdStr, pariwarIdStr } = memberCtx(request);
      const memberId = ids.memberId(memberIdStr);
      const pariwarId = ids.pariwarId(pariwarIdStr);
      const { poolId } = request.params as { poolId: string };
      const now = deps.clock();

      const scopeTx = await openScopeTx(deps, pariwarIdStr);
      let ok = false;
      try {
        // The requested poolId MUST be the member's own live assigned pool — mirror the POST upload
        // guard's ownership check (never an oracle for an arbitrary/historical pool id). Fail-soft to the
        // neutral default rather than a 404, consistent with this read's own "never leak, never blank"
        // posture (the My Pool card resilience precedent).
        const chosen = await resolveMemberLivePool(scopeTx.tx, request, { memberId, pariwarId, now });
        if (chosen === null || poolId !== chosen.pool.poolId) {
          ok = true;
          return SELF_VERIFY_DEFAULT;
        }
        const state = await contributionDomain.resolveMemberSelfVerifyState(scopeTx.tx, {
          pariwarId,
          memberId,
          poolId: ids.poolId(poolId),
        });
        ok = true;
        return state;
      } catch (err) {
        request.log.error({ err, memberId: memberIdStr }, 'self-verify-state: fail-soft to default');
        ok = true; // the scope tx did no writes — a clean close is correct
        return SELF_VERIFY_DEFAULT;
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
    },
  };
}
