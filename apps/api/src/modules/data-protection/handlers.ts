// Story 14.3 (decision `2026-11-20-467` DL5, DL8, DL9, DL10; AC5–AC7, AC10, AC11) — the personal data breach register's handlers.
// Six routes under `/api/v1/data-protection/…`, all GLOBAL (no Pariwar scope) behind `requireGlobalPermission('breach.manage')`.
//
// N1 — the system drafts; people send. NOTHING here (or anywhere) transmits a notice: no SMS, WhatsApp, push, email or outbound
// request. A "sent" fact is an entry staff record after sending by their own means.
//
// THE WRITE ORDER (both POSTs; it differs from the feature-flags idempotency precedent on two points — see `idempotent`):
//   the `Idempotency-Key` header (REQUIRED — an append-only row can never be removed, so a retry must not write twice)
//   → claim → replay the stored response, or 409 while the first attempt is in flight
//   → the display name (fail closed) and the PRE-CHECKS, which refuse 404 / 409 closed / 400 extension with NO audit line
//   → `withCompensatingAudit({ mutate: the domain write, which COMMITs })` — the in-lock rule check there is the race backstop only
//   → `recordResult` OUTSIDE `mutate` (inside it, a failed record would write a `_rolled_back` line for a write that DID commit)
//   → ⛔ `release` once the write has committed (a retry would duplicate a permanent row); `release` only when it did not.
// The three notices are DRAFTED by the admin page from the `view` this module returns (`buildBreachDrafts`, `@twt/contracts`).
// ⛔ A direct `audit.writeAuditEntry` here — the access-wrapper gate scans this directory (DATA_PROTECTION_ROOTS).

import { createHash, randomUUID } from 'node:crypto';

import {
  deriveBreachIncidentView,
  type BreachEntry,
  type BreachEntryAppendRequest,
  type BreachIncident,
  type BreachIncidentDetailResponse,
  type BreachIncidentListQuery,
  type BreachIncidentListResponse,
  type BreachIncidentOpenRequest,
  type BreachMembersOnRecordResponse,
  type BreachSignalListQuery,
  type BreachSignalListResponse,
} from '@twt/contracts';
import { audit, breach, canonicalJsonStringify, idempotency } from '@twt/domain';
import type { FastifyRequest } from 'fastify';

import { ADMIN_GLOBAL_NAMESPACE, type AppDeps } from '../../context.js';
import {
  AdminDisplayNameMissingError,
  BadRequestError,
  ConflictError,
  NotFoundError,
  ServiceUnavailableError,
  UnauthorizedError,
} from '../../http-errors.js';
import { getDisplayName } from '../auth/admin/admin-auth.repo.js';

/** The ONE key (read AND write). GLOBAL; held by `super_admin` alone, derived. */
const BREACH_MANAGE_KEY = 'breach.manage';

const AUDIT_ACTION_OPENED = 'data_protection.breach.opened';
const AUDIT_ACTION_ENTRY_APPENDED = 'data_protection.breach.entry_appended';
/** FR-47 — the detail read is the disclosure of an incident's narrative; the intent line IS the disclosure record. */
const AUDIT_ACTION_VIEWED = 'data_protection.breach.viewed';

/** How long a claim holds while its request runs (it must exceed the handler's runtime; a dead claim blocks only this long). */
const BREACH_IDEMPOTENCY_CLAIM_TTL_SECONDS = 300;
/** How long a recorded response is replayed for the same key. */
const BREACH_IDEMPOTENCY_REPLAY_TTL_SECONDS = 24 * 60 * 60;

function sha256Hex(value: unknown): string {
  return createHash('sha256').update(canonicalJsonStringify(value), 'utf8').digest('hex');
}

/** pg 23514 — a CHECK violation, directly or as a driver error's cause (the memorial-takedown helper). */
function isCheckViolation(err: unknown): boolean {
  if (err === null || typeof err !== 'object') return false;
  return (err as { code?: unknown }).code === '23514' || (err as { cause?: { code?: unknown } }).cause?.code === '23514';
}

function checkViolationConstraint(err: unknown): string | null {
  const direct = (err as { constraint?: unknown }).constraint;
  const cause = (err as { cause?: { constraint?: unknown } }).cause?.constraint;
  const name = typeof direct === 'string' ? direct : typeof cause === 'string' ? cause : null;
  return name;
}

function toIncidentDto(i: breach.BreachIncident): BreachIncident {
  return {
    incidentId: i.incidentId,
    isRehearsal: i.isRehearsal,
    title: i.title,
    becameAwareAt: i.becameAwareAt.toISOString(),
    openedAt: i.openedAt.toISOString(),
    detectionSource: i.detectionSource,
    detectionSignalRef: i.detectionSignalRef,
    openedByDisplay: i.openedByDisplay,
  };
}

function toEntryDto(e: breach.BreachIncidentEntry): BreachEntry {
  // The payload was validated against its kind's strict contract when it was written; the route's response schema parses it again.
  return {
    entryId: e.entryId,
    entrySeq: e.entrySeq,
    kind: e.kind,
    payload: e.payload,
    recordedAt: e.recordedAt.toISOString(),
    recordedByDisplay: e.recordedByDisplay,
  } as BreachEntry;
}

function toDetailDto(found: breach.BreachIncidentWithEntries, now: Date): BreachIncidentDetailResponse {
  const incident = toIncidentDto(found.incident);
  const entries = found.entries.map(toEntryDto);
  return { incident, entries, view: deriveBreachIncidentView(incident, entries, now) };
}

function incidentNotFound(incidentId: string): NotFoundError {
  return new NotFoundError('No such breach incident', 'breach.incident_not_found', { incidentId });
}
function incidentClosed(incidentId: string): ConflictError {
  return new ConflictError('This incident is closed — nothing more can be recorded on it', 'breach.incident_closed', { incidentId });
}
function extensionNotAfterDue(incidentId: string, currentDueAt: string): BadRequestError {
  return new BadRequestError('An extension must be later than the current due time of the Board report', 'breach.extension_not_after_due', {
    incidentId,
    currentDueAt,
  });
}

/** A domain refusal (raised inside the lock — the race backstop) as its wire error. */
function fromRegisterError(err: breach.BreachRegisterError, incidentId: string): Error {
  switch (err.code) {
    case 'breach.incident_not_found':
      return incidentNotFound(incidentId);
    case 'breach.incident_closed':
      return incidentClosed(incidentId);
    case 'breach.extension_not_after_due':
      return extensionNotAfterDue(incidentId, String(err.details['currentDueAt'] ?? ''));
    case 'breach.extension_invalid':
      return new BadRequestError('The extension has no valid date', 'breach.extension_invalid', { incidentId });
  }
}

export function createDataProtectionHandlers(deps: AppDeps) {
  const idempotencyStore = idempotency.createKeyedStore(deps.pool);

  function actorOf(request: FastifyRequest): string {
    const actorId = request.requestContext.actorId;
    if (!actorId) throw new UnauthorizedError('Authentication required', 'auth.session_required');
    return actorId;
  }

  async function displayNameOf(actorId: string): Promise<string> {
    const actorDisplay = await getDisplayName(deps.pool, actorId);
    if (actorDisplay === null) throw new AdminDisplayNameMissingError(actorId);
    return actorDisplay;
  }

  /**
   * Run a write under a REQUIRED `Idempotency-Key`. `run` must resolve only once the write has COMMITTED and throw only when it
   * has not: a throw releases the claim (the caller may retry at once); a resolve is recorded, and a failure to record is a 503
   * that keeps the claim — the row exists, so the same key must never run the write again.
   */
  async function idempotent<T>(request: FastifyRequest, namespace: string, run: () => Promise<T>): Promise<T> {
    const header = request.headers['idempotency-key'];
    if (typeof header !== 'string' || header.trim() === '') {
      throw new BadRequestError('An Idempotency-Key header is required', 'breach.idempotency_key_required');
    }
    const idemKey = `${namespace}:${header.trim()}`;
    const outcome = await idempotencyStore.claim(idemKey, BREACH_IDEMPOTENCY_CLAIM_TTL_SECONDS);
    if (outcome === 'already_claimed') {
      const stored = await idempotencyStore.getResult(idemKey);
      if (stored !== null) return stored as T;
      throw new ConflictError(
        'A request with this Idempotency-Key is still in progress — check the record before trying again',
        'breach.idempotency_in_progress',
      );
    }

    let result: T;
    try {
      result = await run();
    } catch (err: unknown) {
      // Nothing was committed: free the key so the caller can retry at once.
      await idempotencyStore.release(idemKey).catch(() => undefined);
      throw err;
    }
    try {
      await idempotencyStore.recordResult(idemKey, result, { extendTtlSeconds: BREACH_IDEMPOTENCY_REPLAY_TTL_SECONDS });
    } catch (err: unknown) {
      if (err instanceof idempotency.IdempotencyKeyNotClaimedError) throw err; // mapped to 503 `idempotency.record_failed`
      throw new ServiceUnavailableError(
        'The idempotency record could not be written — retry with the same Idempotency-Key',
        'idempotency.record_failed',
      );
    }
    return result;
  }

  return {
    BREACH_MANAGE_KEY,

    /** POST open an incident (AC5). 200 with the detail. */
    async open(request: FastifyRequest): Promise<BreachIncidentDetailResponse> {
      const actorId = actorOf(request);
      const body = request.body as BreachIncidentOpenRequest;
      return idempotent(request, `breach-open:${actorId}`, async () => {
        const actorDisplay = await displayNameOf(actorId);
        const incidentId = randomUUID();
        const becameAwareAt = new Date(body.becameAwareAt);
        let opened: breach.BreachIncidentWithEntries;
        try {
          opened = await audit.withCompensatingAudit(deps.servicePool, {
            auditIntent: {
              pariwarId: ADMIN_GLOBAL_NAMESPACE,
              actorId,
              actorRole: null,
              action: AUDIT_ACTION_OPENED,
              resourceLocator: `global/data-protection/breaches/${incidentId};rehearsal=${String(body.isRehearsal)}`,
              requestPayloadHash: sha256Hex({
                incident_id: incidentId,
                is_rehearsal: body.isRehearsal,
                title: body.title,
                became_aware_at: becameAwareAt.toISOString(),
                detection_source: body.detectionSource,
                detection_signal_ref: body.detectionSignalRef ?? null,
              }),
              traceId: request.requestContext.traceId ?? null,
            },
            mutate: ({ auditId }) =>
              breach.openBreachIncident(deps.servicePool, {
                incidentId,
                isRehearsal: body.isRehearsal,
                title: body.title,
                becameAwareAt,
                detectionSource: body.detectionSource,
                detectionSignalRef: body.detectionSignalRef ?? null,
                actorId,
                actorDisplay,
                auditId,
              }),
          });
        } catch (err: unknown) {
          // e.g. this node's clock ran ahead of the database's on `becameAwareAt`. The wrapper has already written its
          // `_rolled_back` line and rethrown.
          if (isCheckViolation(err)) {
            throw new BadRequestError('The incident was refused by a database rule', 'breach.constraint_violation', {
              constraint: checkViolationConstraint(err),
            });
          }
          throw err;
        }
        return toDetailDto(opened, deps.clock());
      });
    },

    /** POST append one entry (AC6). 200 with the detail. */
    async append(request: FastifyRequest): Promise<BreachIncidentDetailResponse> {
      const actorId = actorOf(request);
      const { incidentId } = request.params as { incidentId: string };
      const body = request.body as BreachEntryAppendRequest;
      return idempotent(request, `breach-entry:${incidentId}`, async () => {
        const actorDisplay = await displayNameOf(actorId);

        // PRE-CHECKS, before the audit intent: a refusal known now leaves no audit line.
        const current = await breach.readBreachIncident(deps.servicePool, incidentId);
        if (current === null) throw incidentNotFound(incidentId);
        const view = toDetailDto(current, deps.clock()).view;
        if (view.status === 'closed') throw incidentClosed(incidentId);
        if (body.kind === 'board_extension_recorded' && Date.parse(body.payload.grantedUntil) <= Date.parse(view.boardReportDueAt)) {
          throw extensionNotAfterDue(incidentId, view.boardReportDueAt);
        }

        const entryId = randomUUID();
        let appended: breach.BreachIncidentWithEntries;
        try {
          appended = await audit.withCompensatingAudit(deps.servicePool, {
            auditIntent: {
              pariwarId: ADMIN_GLOBAL_NAMESPACE,
              actorId,
              actorRole: null,
              action: AUDIT_ACTION_ENTRY_APPENDED,
              resourceLocator: `global/data-protection/breaches/${incidentId}/entries/${entryId};kind=${body.kind}`,
              requestPayloadHash: sha256Hex({ incident_id: incidentId, entry_id: entryId, kind: body.kind, payload: body.payload }),
              traceId: request.requestContext.traceId ?? null,
            },
            mutate: ({ auditId }) =>
              breach.appendBreachEntry(deps.servicePool, {
                entryId,
                incidentId,
                kind: body.kind,
                payload: body.payload,
                actorId,
                actorDisplay,
                auditId,
              }),
          });
        } catch (err: unknown) {
          // The in-lock backstop lost a race the pre-check could not see (intent + `_rolled_back` lines are accepted there).
          if (err instanceof breach.BreachRegisterError) throw fromRegisterError(err, incidentId);
          if (isCheckViolation(err)) {
            throw new BadRequestError('The entry was refused by a database rule', 'breach.constraint_violation', {
              constraint: checkViolationConstraint(err),
            });
          }
          throw err;
        }
        return toDetailDto(appended, deps.clock());
      });
    },

    /** GET one incident with every entry and the derived view (AC7) — AUDITED: one `data_protection.breach.viewed` line. */
    async detail(request: FastifyRequest): Promise<BreachIncidentDetailResponse> {
      const actorId = actorOf(request);
      const { incidentId } = request.params as { incidentId: string };
      // The 404 is decided BEFORE the wrapper: a throw inside `mutate` would write `.viewed` and `.viewed_rolled_back`.
      const found = await breach.readBreachIncident(deps.servicePool, incidentId);
      if (found === null) throw incidentNotFound(incidentId);
      return audit.withCompensatingAudit(deps.servicePool, {
        auditIntent: {
          pariwarId: ADMIN_GLOBAL_NAMESPACE,
          actorId,
          actorRole: null,
          action: AUDIT_ACTION_VIEWED,
          resourceLocator: `global/data-protection/breaches/${incidentId}`,
          requestPayloadHash: sha256Hex({ incidentId }),
          traceId: request.requestContext.traceId ?? null,
        },
        mutate: () => Promise.resolve(toDetailDto(found, deps.clock())),
      });
    },

    /** GET the newest incidents — a title, times and flags only; ⛔ narrative. Not audited. */
    async list(request: FastifyRequest): Promise<BreachIncidentListResponse> {
      const { limit } = request.query as BreachIncidentListQuery;
      const now = deps.clock();
      const rows = await breach.listBreachIncidents(deps.servicePool, limit);
      return {
        items: rows.map((row) => {
          const { incident, view } = toDetailDto(row, now);
          return {
            incidentId: incident.incidentId,
            title: incident.title,
            isRehearsal: incident.isRehearsal,
            openedAt: incident.openedAt,
            becameAwareAt: incident.becameAwareAt,
            detectionSource: incident.detectionSource,
            status: view.status,
            boardReportDueAt: view.boardReportDueAt,
            boardReportOverdue: view.boardReportOverdue,
            principalsNoticeRecorded: view.principalsNoticeRecorded,
            boardInitialRecorded: view.boardInitialRecorded,
            boardReportRecorded: view.boardReportRecorded,
            signoffRecorded: view.signoffRecorded,
          };
        }),
      };
    },

    /** GET "signals to assess" (AC10) — failed, unacknowledged audit-chain checks. Read only; acknowledgement stays with the integrity page. */
    async signals(request: FastifyRequest): Promise<BreachSignalListResponse> {
      const { limit } = request.query as BreachSignalListQuery;
      const rows = await breach.listBreachSignals(deps.servicePool, limit);
      return {
        items: rows.map((s) => ({
          checkId: s.checkId,
          verifiedAt: s.verifiedAt.toISOString(),
          firstBrokenSeq: s.firstBrokenSeq,
          rowsVerified: s.rowsVerified,
          triggerSource: s.triggerSource,
          incidentIds: [...s.incidentIds],
        })),
      };
    },

    /** GET members on record (AC11) — the monthly review's input. A count; ⛔ a threshold, ⛔ an alert. */
    async membersOnRecord(): Promise<BreachMembersOnRecordResponse> {
      const m = await breach.countMembersOnRecord(deps.servicePool);
      return { asOf: m.asOf.toISOString(), pariwarCount: m.pariwarCount, total: m.total, byState: { ...m.byState } };
    },
  };
}
