// Story 14.3 (decision `2026-11-20-467` DL5, DL8, DL9, DL10; AC5–AC7, AC10, AC11) — the personal data breach register's handlers.
// Six routes under `/api/v1/data-protection/…`, all GLOBAL (no Pariwar scope) behind `requireGlobalPermission('breach.manage')`.
//
// N1 — the system drafts; people send. NOTHING here (or anywhere) transmits a notice: no SMS, WhatsApp, push, email or outbound
// request. A "sent" fact is an entry staff record after sending by their own means.
//
// THE WRITE ORDER (both POSTs; it differs from the feature-flags idempotency precedent on two points — see `idempotent`):
//   the `Idempotency-Key` header (REQUIRED — an append-only row can never be removed, so a retry must not write twice)
//   → the new row's id DERIVED from the namespaced key (a UUIDv5 — review 2026-11-20: the claim alone could not stop a duplicate,
//     because an expired `pending` claim is taken over, so after a lost idempotency record a retry 300 s later ran the write again)
//   → claim → replay the stored response; else, if the row with the derived id EXISTS, answer with it; else 409 while in flight
//   → the display name (fail closed) and the PRE-CHECKS — the derived row already written ⇒ answer with it (⛔ a second row, ⛔ an
//     audit line); then 404 / 409 closed / 400 extension / 400 withdrawal with NO audit line
//   → `withCompensatingAudit({ mutate: the domain write, which COMMITs })` — the in-lock checks there are the race backstop only,
//     and the domain write is itself idempotent on the derived id
//   → `recordResult` OUTSIDE `mutate` (inside it, a failed record would write a `_rolled_back` line for a write that DID commit)
//   → ⛔ `release` once the write has committed; `release` when it threw (if it had committed after all — a connection lost after
//     COMMIT — the retry finds the derived row and answers with it; the wrapper's `_rolled_back` line for that attempt then
//     stands beside a row that exists — the compensating-audit wrapper's general limit, ⛔ special to this module).
// A REPLAY answers with what the FIRST response held — the incident, its entries up to and including the derived one, and the
// view derived from those — ⛔ the current detail: a write's key must never become an unaudited read of everything recorded since
// (the detail read is the audited disclosure, FR-47; patch review 2026-11-21).
// ⚠ Known residual (disclosed, ⛔ fixed): a FIRST attempt that runs longer than the 300 s claim lets a retry take the expired claim
// over before the first commits; the retry's pre-check cannot see the uncommitted row, its intent line is written, and the domain
// write then finds the row and does nothing — two audit lines for one row. Only a write slower than five minutes reaches it.
// The three notices are DRAFTED by the admin page from the `view` this module returns (`buildBreachDrafts`, `@twt/contracts`).
// ⛔ A direct `audit.writeAuditEntry` here — the access-wrapper gate scans this directory (DATA_PROTECTION_ROOTS).

import { createHash } from 'node:crypto';

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
import type { FastifyReply, FastifyRequest } from 'fastify';

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

/**
 * This register's OWN namespace for its name-based UUIDs (version 5) over the namespaced idempotency key — ⛔ RFC 4122's URL
 * namespace (the names are not URLs). Fixed for ever: changing it would break the replay of every key already used.
 */
const UUID_V5_NAMESPACE = Buffer.from('3f0d5b2e8c1a4e6b9a7d2c4b6e8f1a30', 'hex');

/** A UUIDv5 of `name`: the same namespaced key always gives the same id, so a retry addresses the row its first attempt wrote. */
function uuidV5(name: string): string {
  const hash = createHash('sha1').update(UUID_V5_NAMESPACE).update(name, 'utf8').digest();
  hash[6] = (hash[6]! & 0x0f) | 0x50;
  hash[8] = (hash[8]! & 0x3f) | 0x80;
  const h = hash.subarray(0, 16).toString('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

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

/**
 * The detail AS THE FIRST RESPONSE HELD IT, for a replay: the entries up to and including `entryId` (none for an open). Null when
 * the derived row does not exist (the write never committed).
 */
function replayDto(found: breach.BreachIncidentWithEntries, entryId: string | null, now: Date): BreachIncidentDetailResponse | null {
  if (entryId === null) return toDetailDto({ incident: found.incident, entries: [] }, now);
  const at = found.entries.findIndex((e) => e.entryId === entryId);
  return at < 0 ? null : toDetailDto({ incident: found.incident, entries: found.entries.slice(0, at + 1) }, now);
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
    case 'breach.withdrawal_invalid':
      return withdrawalInvalid(incidentId);
  }
}

function withdrawalInvalid(incidentId: string): BadRequestError {
  return new BadRequestError(
    'A withdrawal must name a recorded Board extension of this incident that has not already been withdrawn',
    'breach.withdrawal_invalid',
    { incidentId },
  );
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

  /** The namespaced key of a write — `<namespace>:<header>`. The header is REQUIRED (an append-only row can never be removed). */
  function idempotencyKeyOf(request: FastifyRequest, namespace: string): string {
    const header = request.headers['idempotency-key'];
    if (typeof header !== 'string' || header.trim() === '') {
      throw new BadRequestError('An Idempotency-Key header is required', 'breach.idempotency_key_required');
    }
    return `${namespace}:${header.trim()}`;
  }

  /**
   * Run a write under its namespaced key. `run` must resolve only once the write has COMMITTED; a throw releases the claim (the
   * caller may retry at once). A resolve is recorded; a failure to record is a 503 that KEEPS the claim. `written` answers whether
   * the row with the key's DERIVED id already exists (and with what) — it is what makes a retry safe whatever happened to the
   * claim: the same key never writes a second row, because the second write addresses the first one's id.
   */
  async function idempotent<T>(idemKey: string, written: () => Promise<T | null>, run: () => Promise<T>): Promise<T> {
    const outcome = await idempotencyStore.claim(idemKey, BREACH_IDEMPOTENCY_CLAIM_TTL_SECONDS);
    if (outcome === 'already_claimed') {
      const stored = await idempotencyStore.getResult(idemKey);
      if (stored !== null) return stored as T;
      // No recorded result: the first attempt is still running, OR it committed and its record was lost (the 503 below).
      const already = await written();
      if (already !== null) return already;
      throw new ConflictError(
        'A request with this Idempotency-Key is still in progress — check the record before trying again',
        'breach.idempotency_in_progress',
      );
    }

    let result: T;
    try {
      result = await run();
    } catch (err: unknown) {
      // Not committed (or not known to have committed — the derived id makes a retry safe either way): free the key.
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
    async open(request: FastifyRequest, reply: FastifyReply): Promise<BreachIncidentDetailResponse> {
      void reply.header('cache-control', 'no-store');
      const actorId = actorOf(request);
      const body = request.body as BreachIncidentOpenRequest;
      const idemKey = idempotencyKeyOf(request, `breach-open:${actorId}`);
      const incidentId = uuidV5(idemKey);
      const alreadyOpened = async (): Promise<BreachIncidentDetailResponse | null> => {
        const found = await breach.readBreachIncident(deps.servicePool, incidentId);
        return found === null ? null : replayDto(found, null, deps.clock());
      };
      return idempotent(idemKey, alreadyOpened, async () => {
        // A retry of an open that already committed: answer with it — ⛔ a second incident, ⛔ a second `opened` line.
        const replay = await alreadyOpened();
        if (replay !== null) return replay;
        const actorDisplay = await displayNameOf(actorId);
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
    async append(request: FastifyRequest, reply: FastifyReply): Promise<BreachIncidentDetailResponse> {
      void reply.header('cache-control', 'no-store');
      const actorId = actorOf(request);
      // ONE spelling of the id everywhere below (the route accepts either case; the namespace and the lock must not split by it).
      const incidentId = (request.params as { incidentId: string }).incidentId.toLowerCase();
      const body = request.body as BreachEntryAppendRequest;
      // The actor is in the namespace, as on open: one admin's key can never replay another admin's response.
      const idemKey = idempotencyKeyOf(request, `breach-entry:${actorId}:${incidentId}`);
      const entryId = uuidV5(idemKey);
      const alreadyAppended = async (): Promise<BreachIncidentDetailResponse | null> => {
        const found = await breach.readBreachIncident(deps.servicePool, incidentId);
        return found === null ? null : replayDto(found, entryId, deps.clock());
      };
      return idempotent(idemKey, alreadyAppended, async () => {
        // PRE-CHECKS, before the audit intent: a refusal known now leaves no audit line.
        const current = await breach.readBreachIncident(deps.servicePool, incidentId);
        if (current === null) throw incidentNotFound(incidentId);
        // A retry of an append that already committed: answer with it, FIRST — even when that entry was the `closed` one — and
        // as the first response held it (see `replayDto`).
        const replay = replayDto(current, entryId, deps.clock());
        if (replay !== null) return replay;
        const detailNow = toDetailDto(current, deps.clock());
        const actorDisplay = await displayNameOf(actorId);
        const view = detailNow.view;
        if (view.status === 'closed') throw incidentClosed(incidentId);
        if (body.kind === 'board_extension_recorded' && Date.parse(body.payload.grantedUntil) <= Date.parse(view.boardReportDueAt)) {
          throw extensionNotAfterDue(incidentId, view.boardReportDueAt);
        }
        if (body.kind === 'board_extension_withdrawn' && breach.breachWithdrawalRefusal(current.entries, body.payload.withdrawsEntryId) !== null) {
          throw withdrawalInvalid(incidentId);
        }

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
    async detail(request: FastifyRequest, reply: FastifyReply): Promise<BreachIncidentDetailResponse> {
      // The narrative is never kept by a browser or a proxy cache.
      void reply.header('cache-control', 'no-store');
      const actorId = actorOf(request);
      const incidentId = (request.params as { incidentId: string }).incidentId.toLowerCase();
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
            boardReportLate: view.boardReportLate,
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
