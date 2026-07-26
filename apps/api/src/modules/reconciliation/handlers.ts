// Bank-statement reconciliation upload handlers — Story 9.3 (Tasks 2/3/4; AC1–AC4).
//
// Two authenticated upload surfaces that share ONE core (`uploadBankStatement`), mirroring the 6.5
// dual-surface (member Ravi-mode + helpline-operator) precedent:
//   · nominee (Sunita) — member Ravi-mode session + `claim_handover` step-up — /member/reconciliation/statements
//   · staff (District-Admin takeover/fallback) — admin scope-tx + `claim.file` — /p/:pariwarId/reconciliation/statements
//
// ── The upload core (AC1) ───────────────────────────────────────────────────────────────────────────
// guard/authz (route + pool resolution) → read the multipart file → MIME/byte-cap/emptiness → VIRUS-SCAN
// (AR-45-wrapped) → STORE the raw bytes (AR-45-wrapped; Decision D2 — the blob, never the entries) → run
// `parseStatement` INLINE over the buffer (~5s, HTTP 200 sync — contrast 6.5's async 202 OCR) → emit
// `reconciliation.statement-uploaded` (the metadata row + audit provenance + the engagement heartbeat,
// Decision D6) → return the `ParseResultSummary` (parsed) OR route to the "Hum aapke liye padh lenge"
// human fallback (unparseable), which ALSO raises `reconciliation.manual_transcription_requested` (AC2/AC3).
//
// ── CSV-first with human fallback (Decision D1 — LOCKED) ────────────────────────────────────────────
// An allowlisted-bank CSV parses inline. ANYTHING ELSE — a non-CSV MIME (PDF/image), an unknown bank, or
// an allowlisted CSV the parser cannot normalize — routes to the fallback (a stored blob + a staff
// transcription task), NEVER a crash, NEVER a silent drop. No OCR path in 9.3 (re-opening 9.2 D2 is
// forbidden). The fallback is precisely what makes "accepts PDF" honest without a v1 OCR engine.
//
// ── AR-45 (AC4) ─────────────────────────────────────────────────────────────────────────────────────
// The two EXTERNAL calls — the object-storage `put` + the virus-scan — are wrapped with retry-with-backoff
// + timeout + a circuit-breaker (`ResilientCall`). A storage/scanner outage degrades to a dignified 503
// (`ServiceUnavailableError` — "please try again shortly"), audit-logged, NEVER a 500 wall. `parseStatement`
// is a PURE local call (no AR-45 — the story's "no resilience theatre around local calls" caveat).

import { randomUUID } from 'node:crypto';

import {
  BankStatementParseError,
  UnsupportedBankError,
  isSupported,
  parseStatement,
  type BankParseResult,
} from '@twt/bank-parsers';
import {
  BANK_STATEMENT_CSV_MIME_TYPES,
  BANK_STATEMENT_MAX_BYTES,
  type BankStatementFallbackReason,
  type BankStatementUploadResponse,
  type ParseResultSummary,
  type RejectedRowBreakdown,
} from '@twt/contracts';
import { bankStatement, ids, reconciliation } from '@twt/domain';
import { ConcurrencyError, appendEvent, loadEvents } from '@twt/events';
import type { FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import { BadRequestError, PayloadTooLargeError, ServiceUnavailableError } from '../../http-errors.js';
import type { ScopeTx } from '../../types.js';
import { emitAuthAudit } from '../auth/shared/audit.js';
import { ResilientCall, StorageUnavailableError } from './resilience.js';

/** The staff-transcription SLA marker (whole hours) attached to a fallback task — the 24–48h AC2 window;
 *  the surface renders the RANGE, the machine records the ceiling. */
export const RECON_FALLBACK_SLA_HOURS = 48;

/** Bounded retry budget for the (stream_id, event_version) race on the pool stream (double-submit). */
const MAX_APPEND_RETRIES = 8;

/** Base backoff between append retries (exp — attempt k waits `APPEND_RETRY_BASE_DELAY_MS * 2^(k-1)`),
 *  mirroring `ResilientCall`'s backoff shape so the two retry loops in this module behave consistently
 *  under the exact contention scenario they both name (concurrent uploads to the same pool). */
const APPEND_RETRY_BASE_DELAY_MS = 20;

/** The attribution role of the acting caller (the 9.1-compatible takeover-vs-fallback distinction). */
type ReconActorRole = 'nominee' | 'staff';

/** The audit-type family per caller — keeps the member/staff attribution lines distinct (the 6.5 twin). */
const AUDIT = {
  nominee: {
    uploaded: 'member_reconciliation.statement_uploaded',
    fallback: 'member_reconciliation.fallback_requested',
    rejected: 'member_reconciliation.upload_rejected',
    unavailable: 'member_reconciliation.storage_unavailable',
  },
  staff: {
    uploaded: 'staff_reconciliation.statement_uploaded',
    fallback: 'staff_reconciliation.fallback_requested',
    rejected: 'staff_reconciliation.upload_rejected',
    unavailable: 'staff_reconciliation.storage_unavailable',
  },
} as const;

/** The resolved upload target the two route handlers hand the core (pool + attribution). */
export interface UploadTarget {
  readonly pariwarId: ids.PariwarId;
  readonly poolId: ids.PoolId;
  readonly claimCaseId: ids.ClaimId;
  readonly bankCode: bankStatement.BankCode;
  readonly actorId: string;
  readonly role: ReconActorRole;
}

/**
 * Build the `ParseResultSummary` from a parser result (the counts + provenance the surface renders). The
 * breakdown increment is an exhaustive switch over `RejectedRow['reason']` (the parser's real, closed
 * 5-value union — imported, not re-declared) rather than a permissive `key in breakdown` runtime check: a
 * future 6th reason the parser starts emitting fails TYPE-CHECKING here instead of silently under-counting
 * `rejected_breakdown` against `rows_rejected` at runtime.
 */
function toSummary(bankCode: bankStatement.BankCode, result: BankParseResult): ParseResultSummary {
  const breakdown: RejectedRowBreakdown = {
    'unparseable-date': 0,
    'missing-amount': 0,
    'empty-row': 0,
    'ambiguous-direction': 0,
    'ambiguous-amount': 0,
  };
  for (const r of result.rejected) {
    breakdown[r.reason] += 1;
  }
  return {
    bank_code: bankCode,
    rows_parsed: result.entries.length,
    rows_rejected: result.rejected.length,
    rejected_breakdown: breakdown,
    parser_version: `${bankCode}@1`,
  };
}

/**
 * Append an event on the POOL stream inside the scope tx, with a SAVEPOINT-guarded (stream_id,
 * event_version) retry (concurrent uploads to the same pool — a double-submit — race for the next slot;
 * a raw SAVEPOINT is required because a 23505 aborts the surrounding scope tx otherwise —
 * [[project_domain_limit_clamp_and_savepoint_retry]]).
 */
async function appendPoolEvent(
  scopeTx: ScopeTx,
  input: {
    readonly streamId: string;
    readonly eventType: string;
    readonly payload: unknown;
    readonly payloadSchema: import('zod').ZodTypeAny;
    readonly actorId: string;
  },
): Promise<void> {
  for (let attempt = 0; attempt < MAX_APPEND_RETRIES; attempt += 1) {
    const events = await loadEvents(scopeTx.tx, input.streamId);
    const expectedVersion = events.length > 0 ? events[events.length - 1]!.eventVersion : 0;

    await scopeTx.client.query('SAVEPOINT recon_append');
    try {
      await appendEvent(scopeTx.tx, {
        streamId: input.streamId,
        eventType: input.eventType,
        payload: input.payload,
        expectedVersion,
        actorId: input.actorId,
        pariwarId: scopeTx.pariwarId,
        payloadSchema: input.payloadSchema,
      });
      await scopeTx.client.query('RELEASE SAVEPOINT recon_append');
      return;
    } catch (err) {
      await scopeTx.client.query('ROLLBACK TO SAVEPOINT recon_append');
      if (err instanceof ConcurrencyError) {
        if (attempt < MAX_APPEND_RETRIES - 1) {
          await new Promise((resolve) => setTimeout(resolve, APPEND_RETRY_BASE_DELAY_MS * 2 ** attempt));
        }
        continue; // re-read head, bump version, retry
      }
      throw err;
    }
  }
  // Budget exhausted under sustained contention — a dignified 503, never a bare 500 (the module's own
  // "never a 500 wall" discipline, which this bare `Error` used to break).
  throw new ServiceUnavailableError(
    'We could not process your statement just now — please try again in a little while',
    'reconciliation.append_contention',
  );
}

export function createReconciliationHandlers(deps: AppDeps) {
  // ONE ResilientCall per external dependency (its own breaker state persists across requests). AR-45.
  // Tighter than the ResilientCall defaults (3 attempts × 5s ≈ 15s per call): the scan + store calls sit
  // in the SAME synchronous request AC1 promises "~5s" feedback for, and they run sequentially (scan must
  // clear before store), so the untuned defaults could push a worst-case response past 30s. 2 attempts ×
  // 1.5s keeps the worst case for both calls combined near ~6s — still one real retry, far closer to the
  // UX promise. Breaker threshold/cooldown stay at the defaults (a sustained outage still opens the
  // breaker after repeated requests).
  const storageCall = new ResilientCall('bank-statement-storage', { attempts: 2, timeoutMs: 1_500 });
  const scannerCall = new ResilientCall('statement-scanner', { attempts: 2, timeoutMs: 1_500 });

  /**
   * The shared upload core (AC1–AC4). Runs guard→scan→store→parse→emit; returns the discriminated
   * response. A rejected upload (too large / empty / quarantined) throws a dignified 4xx BEFORE any store.
   * A storage/scanner outage throws a dignified 503 (never a 500).
   */
  async function uploadBankStatement(
    request: FastifyRequest,
    scopeTx: ScopeTx,
    target: UploadTarget,
  ): Promise<BankStatementUploadResponse> {
    const audit = AUDIT[target.role];

    // (1) Read the multipart file.
    const data = await request.file();
    if (!data) {
      throw new BadRequestError('No statement file in the upload', 'reconciliation.no_file');
    }
    let buffer: Buffer;
    try {
      buffer = await data.toBuffer();
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === 'FST_REQ_FILE_TOO_LARGE' || code === 'FST_FILES_LIMIT') {
        emitAuthAudit(deps, request, audit.rejected, {
          actorId: target.actorId,
          pariwarId: target.pariwarId,
          context: { pool_id: target.poolId, reason: 'too_large' },
        });
        throw new PayloadTooLargeError('Statement exceeds the size limit', 'reconciliation.too_large', {
          maxBytes: BANK_STATEMENT_MAX_BYTES,
        });
      }
      throw err;
    }
    // (2) Exact byte cap + emptiness (defense-in-depth beyond the plugin limit).
    if (data.file.truncated || buffer.byteLength > BANK_STATEMENT_MAX_BYTES) {
      emitAuthAudit(deps, request, audit.rejected, {
        actorId: target.actorId,
        pariwarId: target.pariwarId,
        context: { pool_id: target.poolId, reason: 'too_large' },
      });
      throw new PayloadTooLargeError('Statement exceeds the size limit', 'reconciliation.too_large', {
        maxBytes: BANK_STATEMENT_MAX_BYTES,
      });
    }
    if (buffer.byteLength === 0) {
      throw new BadRequestError('The uploaded statement is empty', 'reconciliation.empty');
    }

    const bytes = new Uint8Array(buffer);

    // (3) Virus-scan quarantine (AR-45-wrapped). An unclean verdict rejects + audit-logs, never stores.
    let scan;
    try {
      scan = await scannerCall.run(() => deps.statementScanner.scan(bytes));
    } catch (err) {
      throw mapStorageOutage(err, request, deps, target, audit.unavailable);
    }
    if (!scan.clean) {
      emitAuthAudit(deps, request, audit.rejected, {
        actorId: target.actorId,
        pariwarId: target.pariwarId,
        context: { pool_id: target.poolId, reason: 'quarantined', scan_reason: scan.reason },
      });
      throw new BadRequestError(
        'We could not accept this file — please upload your statement again',
        'reconciliation.file_quarantined',
      );
    }

    // (4) Store the raw bytes (AR-45-wrapped; Decision D2 — the blob, never the entries). The object key
    //     is opaque + non-PII, minted per upload (statements accumulate; each daily upload is its own blob).
    const objectKey = `pariwar/${target.pariwarId}/pool/${target.poolId}/${randomUUID()}`;
    const contentType = data.mimetype || 'application/octet-stream';
    try {
      await storageCall.run(() => deps.bankStatementStorage.put(objectKey, bytes, { contentType }));
    } catch (err) {
      throw mapStorageOutage(err, request, deps, target, audit.unavailable);
    }

    // (5) Decide the outcome: parse inline (CSV + allowlisted bank) or route to the human fallback. (6)
    //     Emit the statement-uploaded event (metadata + audit provenance + engagement heartbeat, Decision
    //     D6). Both steps run AFTER the blob is already stored (step 4) — wrapped together so an unexpected
    //     failure anywhere in here (an untyped parser crash, the append's retry budget exhausting) triggers
    //     a best-effort cleanup of that blob instead of leaving it permanently orphaned in Tier-1 storage.
    const slug = deps.config.reconciliationPariwarSlug;
    const isCsv = BANK_STATEMENT_CSV_MIME_TYPES.includes(data.mimetype);
    let outcome: BankStatementUploadResponse;
    let parsedFlag = false;
    let summaryForEvent: ParseResultSummary | null = null;
    let fallbackReason: BankStatementFallbackReason | null = null;

    try {
      if (!isCsv) {
        // A PDF / image — no v1 OCR engine (Decision D1). The blob is stored; staff will read it.
        fallbackReason = 'unsupported_file';
        outcome = { outcome: 'fallback', fallback: { reason: fallbackReason, slaHours: RECON_FALLBACK_SLA_HOURS } };
      } else if (!isSupported(slug, target.bankCode)) {
        fallbackReason = 'unknown_bank';
        outcome = { outcome: 'fallback', fallback: { reason: fallbackReason, slaHours: RECON_FALLBACK_SLA_HOURS } };
      } else {
        try {
          const result = parseStatement(slug, target.bankCode, buffer);
          const summary = toSummary(target.bankCode, result);
          summaryForEvent = summary;
          if (result.entries.length > 0) {
            parsedFlag = true;
            outcome = { outcome: 'parsed', summary };
          } else {
            // A CSV that normalized zero usable rows — a dignified parse-failure → the human path.
            fallbackReason = 'parse_failed';
            outcome = {
              outcome: 'fallback',
              fallback: { reason: fallbackReason, slaHours: RECON_FALLBACK_SLA_HOURS, summary },
            };
          }
        } catch (err) {
          // The parser sandbox rethrows only typed errors (§5.3) — a crash never escapes as a 500.
          fallbackReason = err instanceof UnsupportedBankError ? 'unknown_bank' : 'parse_failed';
          if (!(err instanceof UnsupportedBankError) && !(err instanceof BankStatementParseError)) throw err;
          outcome = { outcome: 'fallback', fallback: { reason: fallbackReason, slaHours: RECON_FALLBACK_SLA_HOURS } };
        }
      }

      await appendPoolEvent(scopeTx, {
        streamId: target.poolId,
        eventType: reconciliation.RECONCILIATION_STATEMENT_UPLOADED_EVENT_TYPE,
        payloadSchema: reconciliation.ReconciliationStatementUploadedPayloadSchema,
        actorId: target.actorId,
        payload: {
          poolId: target.poolId,
          claimCaseId: target.claimCaseId,
          bankCode: target.bankCode,
          objectKey,
          parsed: parsedFlag,
          parserVersion: summaryForEvent?.parser_version ?? null,
          rowsParsed: summaryForEvent?.rows_parsed ?? 0,
          rowsRejected: summaryForEvent?.rows_rejected ?? 0,
          uploadedByRole: target.role,
        },
      });
    } catch (err) {
      try {
        // `delete` is optional on the port (not every adapter needs it) — best-effort cleanup either way;
        // the original error is what the caller/audit trail needs, not a cleanup failure.
        await deps.bankStatementStorage.delete?.(objectKey);
      } catch {
        /* swallowed — see above */
      }
      throw err;
    }
    emitAuthAudit(deps, request, audit.uploaded, {
      actorId: target.actorId,
      pariwarId: target.pariwarId,
      context: {
        pool_id: target.poolId,
        claim_case_id: target.claimCaseId,
        bank_code: target.bankCode,
        outcome: outcome.outcome,
        rows_parsed: summaryForEvent?.rows_parsed ?? 0,
        rows_rejected: summaryForEvent?.rows_rejected ?? 0,
      },
    });

    // (7) The "Hum aapke liye padh lenge" fallback (AC2/AC3): on an unparseable file, AUTO-raise the
    //     audit-logged, attributed manual-transcription task so the nominee is NEVER stranded even if she
    //     takes no further action. The stored `objectKey` rides the task so staff transcribe from the exact
    //     blob (the resolution feeds the Story 9.4 matcher — a documented seam, no live matcher call here).
    if (outcome.outcome === 'fallback' && fallbackReason !== null) {
      await raiseFallbackTask(scopeTx, request, target, {
        reason: fallbackReason,
        objectKey,
      });
    }

    return outcome;
  }

  /** Raise the `reconciliation.manual_transcription_requested` task + its audit line (AC3). */
  async function raiseFallbackTask(
    scopeTx: ScopeTx,
    request: FastifyRequest,
    target: UploadTarget,
    opts: { readonly reason: BankStatementFallbackReason; readonly objectKey: string | null },
  ): Promise<void> {
    const audit = AUDIT[target.role];
    await appendPoolEvent(scopeTx, {
      streamId: target.poolId,
      eventType: reconciliation.RECONCILIATION_MANUAL_TRANSCRIPTION_REQUESTED_EVENT_TYPE,
      payloadSchema: reconciliation.ReconciliationManualTranscriptionRequestedPayloadSchema,
      actorId: target.actorId,
      payload: {
        poolId: target.poolId,
        claimCaseId: target.claimCaseId,
        bankCode: opts.reason === 'unknown_bank' ? null : target.bankCode,
        objectKey: opts.objectKey,
        reason: opts.reason,
        slaHours: RECON_FALLBACK_SLA_HOURS,
        requestedByRole: target.role,
      },
    });
    emitAuthAudit(deps, request, audit.fallback, {
      actorId: target.actorId,
      pariwarId: target.pariwarId,
      context: {
        pool_id: target.poolId,
        claim_case_id: target.claimCaseId,
        reason: opts.reason,
        sla_hours: RECON_FALLBACK_SLA_HOURS,
        has_stored_file: opts.objectKey !== null,
      },
    });
  }

  return { uploadBankStatement, raiseFallbackTask, storageCall, scannerCall };
}

/** Map an AR-45 outage (StorageUnavailableError) to a dignified 503 + audit line; rethrow anything else. */
function mapStorageOutage(
  err: unknown,
  request: FastifyRequest,
  deps: AppDeps,
  target: UploadTarget,
  auditType: 'member_reconciliation.storage_unavailable' | 'staff_reconciliation.storage_unavailable',
): Error {
  if (err instanceof StorageUnavailableError) {
    emitAuthAudit(deps, request, auditType, {
      actorId: target.actorId,
      pariwarId: target.pariwarId,
      context: { pool_id: target.poolId, dependency: err.dependency, kind: err.kind },
    });
    return new ServiceUnavailableError(
      'We could not process your statement just now — please try again in a little while',
      'reconciliation.storage_unavailable',
    );
  }
  return err instanceof Error ? err : new Error(String(err));
}
