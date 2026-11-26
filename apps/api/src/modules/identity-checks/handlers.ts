// Staff check a TYPED-IN identity while the member is alive — Story 3.13 (Task 3.4; DL4–DL9, DL11, DL13; AC8–AC12).
//
//   · GET  …/admin/members/identity-checks                  — the QUEUE (DL11; ⛔ PII) — `member.reveal_mobile_for_identity_check`
//   · GET  …/admin/members/:memberId/identity-check         — the DETAIL (DL8; one audited view) — `member.validate_identity`
//   · POST …/admin/members/:memberId/identity-check         — RECORD the act (DL1–DL3; Idempotency-Key) — `member.validate_identity`
//   · POST …/admin/members/:memberId/identity-check/mobile  — the full number, ONE audited press (DL6a) — the reveal key
//
// `2026-11-25-502` Q1 A (Trustee-ratified): an original government photo ID, in person or on a video call; *"nothing is
// copied or kept"*. Q3 B (widened): staff see the member's number *"for this purpose"*, one press at a time, every showing
// audited — ⛔ the number in the line (the `-328` rule). "For this purpose" is STRUCTURAL: the press is refused unless the
// member is awaiting a check right now (DL4), and under a standing death report (the DL5 lock, FIRST).
//
// ⭐ Decrypt-after-authorize: every route's chain has already held its key at the member's (or the caller's) scope.
// ⭐ Mutations audit AFTER the transaction closes; ⛔ a name, a date of birth, the note or the number in any audit line.
// ⭐ A DISCLOSURE (the detail's one view, the number's one showing) is audited FIRST: the line is PERSISTED (awaited) before the
//    identity or the number is returned, and a line that cannot be written is a 503 and ⛔ the data (`2026-11-26-504` item 2).
// ⚠ ⛔ CI gate scans this module (F7b) — the human-actor chain on each route is proved by its own API tests (AC12).

import type {
  IdentityCheckDetailResponse,
  IdentityCheckHistoryEntry,
  IdentityCheckMobileResponse,
  IdentityCheckQueueQuery,
  IdentityCheckQueueResponse,
  IdentityCheckRecordRequest,
  IdentityCheckRecordResponse,
} from '@twt/contracts';
import { IDENTITY_CHECK_ERROR_CODES as CODES } from '@twt/contracts';
import { audit as auditDomain, idempotency, ids, member as memberDomain, rbac, waOptIn } from '@twt/domain';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { authEventToAuditInput } from '../../audit/audit-log-sink.js';
import type { AppDeps } from '../../context.js';
import {
  AdminDisplayNameMissingError,
  BadRequestError,
  ConflictError,
  NotFoundError,
  ServiceUnavailableError,
  UnauthorizedError,
} from '../../http-errors.js';
import { getDisplayName } from '../auth/admin/admin-auth.repo.js';
import { emitAuthAudit } from '../auth/shared/audit.js';
import { decryptMobile, maskMobile } from '../auth/shared/mobile-index.js';
import { decryptKycField } from '../kyc/kyc-crypto.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';
import { loadActorGrants } from '../rbac/index.js';
import { decryptIdentityCheckNote, encryptIdentityCheckNote } from './crypto.js';

/** DL6 — the CHECK key: the detail and the record (`district_admin`, `pariwar_admin`; + derived super_admin). */
export const VALIDATE_IDENTITY_KEY = 'member.validate_identity';
/** DL6a — the REVEAL key: the number press AND the queue (DA, PA, verifier, helpline; + derived super_admin). */
export const REVEAL_MOBILE_KEY = 'member.reveal_mobile_for_identity_check';

/** How long a record's idempotency claim is held — the personal-event precedent. */
const RECORD_IDEMPOTENCY_TTL_SECONDS = 300;

type Log = FastifyRequest['log'];
type RefusalReason = memberDomain.IdentityValidationRefusedError['reason'];

function scopeOf(request: FastifyRequest) {
  const scopeTx = request.scopeTx;
  const actorId = request.requestContext.actorId;
  if (!scopeTx || !actorId) throw new UnauthorizedError('Authentication required', 'auth.session_required');
  return { scopeTx, actorId, p: scopeTx.pariwarId, pariwarId: ids.pariwarId(scopeTx.pariwarId) };
}

const locator = (memberId: string) => `member:${memberId.toLowerCase()}`;
const shortId = (memberId: string) => memberId.toLowerCase().replace(/-/g, '').slice(0, 8);

/** The staff words of each refusal — the API message (the admin shows its own DL12 lines by CODE). ⛔ A name or a number. */
const REFUSAL_MESSAGES: Record<RefusalReason, string> = {
  not_found: 'Member not found',
  invalid_shape: 'The identity check does not fit together. Open it again.',
  not_eligible: 'This member does not need an identity check.',
  death_reported: 'The Trust has been told this member has died. Their identity is checked on the claim instead.',
};

/** Map a refusal onto HTTP: `identity_validation.<reason>` — 404 `not_found`, 400 `invalid_shape`, else 409. */
function translate(err: unknown): never {
  if (err instanceof memberDomain.IdentityValidationRefusedError) {
    const code = `identity_validation.${err.reason}`;
    const message = REFUSAL_MESSAGES[err.reason];
    if (err.reason === 'not_found') throw new NotFoundError(message, code);
    if (err.reason === 'invalid_shape') throw new BadRequestError(message, code);
    throw new ConflictError(message, code);
  }
  if (err instanceof memberDomain.MemberStreamConcurrencyError || isOneLiveViolation(err)) {
    throw new ConflictError('The member changed while the identity check was being recorded — please try again', CODES.concurrent);
  }
  throw err;
}

/** A 23505 on 0218's one-live index (drizzle wraps the driver error; the SQLSTATE may be on `.cause`). */
function isOneLiveViolation(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const e = err as { code?: unknown; constraint?: unknown; cause?: { code?: unknown; constraint?: unknown } | null };
  return (e.code ?? e.cause?.code) === '23505' && (e.constraint ?? e.cause?.constraint) === 'member_identity_validations_one_live_per_member_uq';
}

/**
 * The REVEAL's refusal (`2026-11-26-504` item 4): a death claim is answered with the SAME generic `not_eligible` as every other
 * member who is not awaiting a check — verifiers and helpline operators are ⛔ told a claim stands. The audit line keeps the
 * real reason (`auditReason` is read off the ORIGINAL error); the DA / PA detail keeps its banner (DL5).
 */
function translateForReveal(err: unknown): never {
  if (err instanceof memberDomain.IdentityValidationRefusedError && err.reason === 'death_reported') {
    throw new ConflictError(REFUSAL_MESSAGES.not_eligible, CODES.notEligible);
  }
  return translate(err);
}

/** The bounded reason code a refusal is audited with — ⛔ a message with data in it. In lockstep with `translate`. */
function auditReason(err: unknown): string {
  if (err instanceof memberDomain.IdentityValidationRefusedError) return err.reason;
  if (err instanceof memberDomain.MemberStreamConcurrencyError || isOneLiveViolation(err)) return 'concurrent';
  return err instanceof Error ? err.name : 'unknown';
}

export function createIdentityCheckHandlers(deps: AppDeps) {
  const enc = deps.encryption;
  const idempotencyStore = idempotency.createKeyedStore(deps.pool);

  /** Best-effort audit emit: a failed audit write must ⛔ turn a committed act into a 500, or mask a refusal. */
  function audit(request: FastifyRequest, type: Parameters<typeof emitAuthAudit>[2], fields: Parameters<typeof emitAuthAudit>[3]): void {
    try {
      emitAuthAudit(deps, request, type, fields);
    } catch (err) {
      request.log.error({ err: err instanceof Error ? err.name : 'unknown' }, 'identity-check: audit emit failed');
    }
  }

  /**
   * ⭐ A DISCLOSURE's audit line (`2026-11-26-504` item 2). DL8 names the AWAITED `audit.writeAuditEntry` precedent
   * (`adminMemberSearch`) and `-502` item 5 says *"every showing is recorded"*: the line is PERSISTED before the identity or
   * the number leaves the server, and when it cannot be written the answer is a 503 and ⛔ the data (the decrypted value is
   * dropped with the exception). ⛔ The best-effort `audit` above would have shown the number and lost the line. The row is
   * the sink's own (`authEventToAuditInput`), so the two kinds of line cannot drift apart.
   */
  async function auditDisclosure(
    request: FastifyRequest,
    type: Parameters<typeof emitAuthAudit>[2],
    fields: { actorId: string; pariwarId: string; resourceLocator: string; context: Record<string, unknown> },
  ): Promise<void> {
    try {
      await auditDomain.writeAuditEntry(
        deps.servicePool,
        authEventToAuditInput({
          type,
          actorId: fields.actorId,
          pariwarId: fields.pariwarId,
          traceId: request.requestContext.traceId,
          context: fields.context,
          resourceLocator: fields.resourceLocator,
          at: deps.clock(),
        }),
      );
    } catch (err) {
      request.log.error(
        { err: err instanceof Error ? err.name : 'unknown' },
        'identity-check: the audit line of a disclosure was not written — nothing returned',
      );
      throw new ServiceUnavailableError('This could not be recorded, so it was not shown.', CODES.auditUnavailable);
    }
  }

  /**
   * The typed-in identity of a member awaiting a check, decrypted (DL8; `2026-11-26-504` item 1). The name and the date of birth
   * MUST be readable, and a photo that exists MUST decrypt: staff compare the original ID with these, and a blank beside a live
   * "Confirm identity" (irreversible, DL10) is how someone confirms against nothing. ⛔ A field degrading to `null` — an
   * unreadable field is a 503, logged by class name only (⛔ the ciphertext, ⛔ the value). A photo may be ABSENT (it is optional).
   */
  async function readTypedInIdentity(
    kyc: { nameCiphertext: string | null; dobCiphertext: string | null; photoCiphertext: string | null },
    p: string,
    log: Log,
  ): Promise<{ name: string; date_of_birth: string; photo: string | null }> {
    const unreadable = (field: string, err?: unknown): ServiceUnavailableError => {
      log.error({ err: err instanceof Error ? err.name : 'none', field }, 'identity-check: a typed-in field could not be read');
      return new ServiceUnavailableError('The typed-in details could not be read.', CODES.identityUnreadable);
    };
    const open = async (ct: string | null, field: string): Promise<string | null> => {
      if (ct === null) return null;
      let value: string;
      try {
        value = await decryptKycField(ct, p, enc);
      } catch (err) {
        throw unreadable(field, err);
      }
      return value === memberDomain.ANONYMIZED_SENTINEL ? null : value;
    };
    const name = await open(kyc.nameCiphertext, 'name');
    const dob = await open(kyc.dobCiphertext, 'dob');
    const photo = await open(kyc.photoCiphertext, 'photo');
    if (name === null) throw unreadable('name');
    if (dob === null) throw unreadable('dob');
    return { name, date_of_birth: dob, photo };
  }

  /** Does the caller hold `key` at any of its OWN grants in this Pariwar? (The queue's `can_check`.) */
  async function holdsAnywhereHere(request: FastifyRequest, key: string): Promise<boolean> {
    const { scopeTx, actorId } = scopeOf(request);
    const grants = request.scopeGrants ?? (await loadActorGrants(scopeTx, actorId));
    return grants.some(
      (g) =>
        g.pariwarId === scopeTx.pariwarId &&
        rbac.hasPermission([g], key, { dimension: g.scopeDimension, value: g.scopeValue, pariwarId: g.pariwarId }),
    );
  }

  return {
    /**
     * GET — the QUEUE (DL11; `2026-11-26-504` item 3: a member with a death claim is ⛔ listed, and `has_more` says another page
     * follows). Gated on the caller's OWN scope for the reveal key (every holder of the check key holds it
     * too); a district caller's page is pushed into SQL, then EVERY row is kept only if the caller's grant scope contains
     * the member's district target (the per-member gate's predicate). ⛔ PII, ⛔ decrypt — so ⛔ audit line.
     */
    async getQueue(request: FastifyRequest): Promise<IdentityCheckQueueResponse> {
      const { scopeTx, pariwarId, p } = scopeOf(request);
      const q = request.query as IdentityCheckQueueQuery;
      const scope = request.identityCheckScope;
      if (!scope || scope.value === null) return { entries: [], can_check: false, has_more: false };
      const page = await memberDomain.listIdentityCheckQueuePage(scopeTx.tx, pariwarId, {
        at: deps.clock(),
        district: scope.dimension === 'district' ? scope.value : null,
        ...(q.limit !== undefined ? { limit: q.limit } : {}),
        ...(q.offset !== undefined ? { offset: q.offset } : {}),
      });
      const grantScope: rbac.GrantScope = { dimension: scope.dimension, value: scope.value };
      const kept = page.entries.filter((r) =>
        rbac.scopeContains(
          grantScope,
          r.district !== null ? { dimension: 'district', value: r.district } : { dimension: 'pariwar', value: p },
        ),
      );
      return {
        entries: kept.map((r) => ({
          member_id: r.memberId,
          short_member_id: shortId(r.memberId),
          signed_up_at: r.signedUpAt.toISOString(),
          state: r.state as 'lock-in' | 'pending-valid',
          district: r.district,
          latest_outcome: r.latestOutcome,
          latest_decided_at: r.latestDecidedAt?.toISOString() ?? null,
          attempt_count: r.attemptCount,
        })),
        can_check: await holdsAnywhereHere(request, VALIDATE_IDENTITY_KEY),
        has_more: page.hasMore,
      };
    },

    /**
     * GET — the DETAIL (DL8; `2026-11-26-504` item 1). Decrypts the typed-in name, date of birth and photo ONLY while a check is
     * AWAITED (the forms' own predicate: DL4-eligible, no death claim standing) — for every other member the detail shows the
     * state, the posting and the history, ⛔ the identity, ⛔ the number — and ONLY the live act's note; the mobile is MASKED (the
     * full number is the reveal press). An unreadable field is a 503. ONE audit line per view, PERSISTED before anything is returned. An
     * anonymized member shows ⛔ identity.
     */
    async getDetail(request: FastifyRequest, reply: FastifyReply): Promise<IdentityCheckDetailResponse> {
      const { scopeTx, actorId, pariwarId, p } = scopeOf(request);
      const { memberId } = request.params as { memberId: string };
      const mid = ids.memberId(memberId);
      const d = await memberDomain.readIdentityCheckDetail(scopeTx.tx, pariwarId, mid, deps.clock());
      if (!d) throw new NotFoundError('Member not found', CODES.notFound);
      const anonymized = d.state === 'anonymized';
      const awaited = d.ineligibility === null && !d.deathReported;

      const identity = !anonymized && d.kyc !== null && awaited ? await readTypedInIdentity(d.kyc, p, request.log) : null;
      // The masked number follows the identity: shown only while a check is AWAITED (`2026-11-26-504` item 1) — a member who
      // needs no check, or has a death claim standing, has nothing for staff to arrange.
      let maskedMobile: string | null = null;
      if (!anonymized && awaited) {
        const ct = await waOptIn.getMemberMobileCiphertext(scopeTx.tx, { pariwarId, memberId: mid });
        if (ct !== null) {
          try {
            maskedMobile = maskMobile(await decryptMobile(ct, enc));
          } catch (err) {
            request.log.error({ err: err instanceof Error ? err.name : 'unknown' }, 'identity-check: mobile decrypt failed');
          }
        }
      }
      let liveNote: string | null = null;
      if (d.liveNoteCiphertext !== null) {
        try {
          const v = await decryptIdentityCheckNote(d.liveNoteCiphertext, p, enc);
          liveNote = v === memberDomain.ANONYMIZED_SENTINEL ? null : v;
        } catch (err) {
          request.log.error({ err: err instanceof Error ? err.name : 'unknown' }, 'identity-check: note decrypt failed');
        }
      }

      // ⭐ WHO opened WHOSE typed-in identity — ⛔ the identity itself, ⛔ the note, ⛔ the number. PERSISTED first (item 2):
      // `identity_opened` is true only when the name and date of birth were actually read.
      await auditDisclosure(request, 'admin_identity_check.identity_check_read', {
        actorId,
        pariwarId: p,
        resourceLocator: locator(memberId),
        context: {
          member_id: memberId.toLowerCase(),
          identity_opened: identity !== null,
          live_validation_id: d.history.find((h) => h.live)?.validationId ?? null,
          eligible: d.ineligibility === null,
          death_reported: d.deathReported,
        },
      });

      const history: IdentityCheckHistoryEntry[] = d.history.map((h) => ({
        validation_id: h.validationId,
        outcome: h.outcome,
        evidence_kind: h.evidenceKind,
        document_kind: h.documentKind,
        not_confirmed_reason: h.notConfirmedReason,
        decided_by_display: h.decidedByDisplay,
        decided_at: h.decidedAt.toISOString(),
        live: h.live,
        note: h.live ? liveNote : null,
      }));
      // ⛔ A decrypted identity, a masked number and a note: never cached by the browser or an intermediary.
      void reply.header('cache-control', 'no-store');
      return {
        member_id: memberId.toLowerCase(),
        short_member_id: shortId(memberId),
        state: d.state,
        signed_up_at: d.signedUpAt.toISOString(),
        kyc_source: d.kyc?.source ?? null,
        identity,
        masked_mobile: maskedMobile,
        posting: d.posting ? { district: d.posting.district, workplace_name: d.posting.workplaceName } : null,
        death_reported: d.deathReported,
        eligible: awaited,
        history,
      };
    },

    /**
     * POST — RECORD the act (DL13): the idempotency claim → the scope tx opened INSIDE the try → COMMIT → the claim is no
     * longer released (`settled`) → the audit line → THEN `recordResult`, whose failure is logged and ⛔ a 500
     * ([[project_idempotent_write_handler_shape]]; `2026-11-26-504`, code review P13).
     */
    async postRecord(request: FastifyRequest, reply: FastifyReply): Promise<IdentityCheckRecordResponse> {
      const { actorId, p, pariwarId } = scopeOf(request);
      const { memberId } = request.params as { memberId: string };
      const body = request.body as IdentityCheckRecordRequest;
      const raw = request.headers['idempotency-key'];
      const key = (Array.isArray(raw) ? raw[0] : raw)?.trim();
      if (!key) throw new BadRequestError('An Idempotency-Key header is required', CODES.idempotencyKeyRequired);

      const idemKey = `identity_validation.record:${p}:${memberId.toLowerCase()}:${actorId}:${key}`;
      const claimed = await idempotencyStore.claim(idemKey, RECORD_IDEMPOTENCY_TTL_SECONDS);
      if (claimed === 'already_claimed') {
        const stored = await idempotencyStore.getResult(idemKey);
        if (stored !== null) {
          void reply.status(200);
          return stored as IdentityCheckRecordResponse;
        }
        throw new ConflictError('A request with this Idempotency-Key is already in progress — please wait and retry', CODES.idempotencyInProgress);
      }

      let settled = false;
      try {
        let result: memberDomain.RecordIdentityValidationResult | undefined;
        let failure: unknown;
        try {
          const display = await getDisplayName(deps.pool, actorId);
          if (display == null || display.trim() === '') throw new AdminDisplayNameMissingError(actorId);
          const notePlain = body.note !== undefined && body.note !== '' ? body.note : null;
          const shape = {
            outcome: body.outcome,
            evidenceKind: body.evidence_kind ?? null,
            documentKind: body.document_kind ?? null,
            notConfirmedReason: body.not_confirmed_reason ?? null,
          };
          // The SHAPE first — before anything is encrypted or read (the writer's own step 0, the same function).
          const problem = memberDomain.identityValidationShapeProblem({ ...shape, noteCiphertext: notePlain });
          if (problem !== null) throw new memberDomain.IdentityValidationRefusedError(memberId, 'invalid_shape', problem);
          const noteCiphertext = notePlain !== null ? await encryptIdentityCheckNote(notePlain, p, enc) : null;

          const scopeTx = await openScopeTx(deps, p);
          let ok = false;
          try {
            result = await memberDomain.recordIdentityValidation(scopeTx.client, {
              ...shape,
              noteCiphertext,
              pariwarId,
              memberId: ids.memberId(memberId),
              actorId,
              actorDisplay: display,
            });
            ok = true;
          } finally {
            await closeScopeTx(scopeTx, ok);
          }
        } catch (err) {
          failure = err;
        }

        if (failure !== undefined || result === undefined) {
          audit(request, 'admin_identity_check.identity_check_rejected', {
            actorId,
            pariwarId: p,
            resourceLocator: locator(memberId),
            context: { member_id: memberId.toLowerCase(), outcome: body.outcome, reason: auditReason(failure) },
          });
          return translate(failure);
        }

        const response: IdentityCheckRecordResponse = {
          validation_id: result.validationId,
          outcome: result.outcome,
          superseded_validation_id: result.supersededValidationId,
          state: result.state,
          kyc_completed: result.kycCompleted,
        };
        // ⭐ COMMITTED (`2026-11-26-504`, code review P13): from here the claim is ⛔ released — a retry must not re-run an act that
        // landed — and the audit line goes out STRAIGHT after the COMMIT, before the idempotency result is stored, so a failing
        // `recordResult` can neither lose the line nor turn a committed act into a 500.
        settled = true;
        // ⛔ The note, the reason's words, a name. The outcome and the reason CODE are the record's.
        audit(request, 'admin_identity_check.identity_check_recorded', {
          actorId,
          pariwarId: p,
          resourceLocator: locator(memberId),
          context: {
            member_id: memberId.toLowerCase(),
            validation_id: result.validationId,
            outcome: result.outcome,
            evidence_kind: body.evidence_kind ?? null,
            document_kind: body.document_kind ?? null,
            not_confirmed_reason: body.not_confirmed_reason ?? null,
            superseded_validation_id: result.supersededValidationId,
            kyc_completed: result.kycCompleted,
          },
        });
        try {
          await idempotencyStore.recordResult(idemKey, response);
        } catch (err) {
          // The act and its audit line are done; only a REPLAY of this key is affected (it answers "in progress" until the hold ends).
          request.log.error({ err: err instanceof Error ? err.name : 'unknown' }, 'identity-check: idempotency result not stored');
        }
        void reply.status(201);
        return response;
      } finally {
        // Any failure after the claim releases it, so the SAME key can be retried at once.
        if (!settled) await idempotencyStore.release(idemKey).catch(() => undefined);
      }
    },

    /**
     * POST — the member's FULL number, ONE showing (DL6a). ⛔ Idempotency-Key: every press is a separate, audited showing.
     * The death lock FIRST, then DL4, in a transaction of its own (nothing is written; it is rolled back). A death claim is
     * refused with the generic `not_eligible` (`2026-11-26-504` item 4) — the audit line keeps `death_reported`.
     */
    async postRevealMobile(request: FastifyRequest, reply: FastifyReply): Promise<IdentityCheckMobileResponse> {
      const { actorId, p, pariwarId } = scopeOf(request);
      const { memberId } = request.params as { memberId: string };
      const mid = ids.memberId(memberId);
      let mobile: string | undefined;
      let failure: unknown;
      try {
        const scopeTx = await openScopeTx(deps, p);
        try {
          await memberDomain.assertIdentityCheckAwaited(scopeTx.client, pariwarId, mid);
          const ct = await waOptIn.getMemberMobileCiphertext(scopeTx.tx, { pariwarId, memberId: mid });
          if (ct === null) throw new ConflictError("This member's number can no longer be shown here.", CODES.mobileUnavailable);
          const canonical = await decryptMobile(ct, enc);
          if (canonical === memberDomain.ANONYMIZED_SENTINEL || canonical.trim() === '') {
            throw new ConflictError("This member's number can no longer be shown here.", CODES.mobileUnavailable);
          }
          // ⭐ EVERY press — actor, member, time. ⛔ The number (`-328`'s rule). PERSISTED before the number is returned
          // (`2026-11-26-504` item 2; `-502` item 5: "every showing is recorded") — a line that cannot be written is a 503 and
          // ⛔ the number. ⭐ Written INSIDE this transaction, so the intake lock taken FIRST is still HELD: a death claim cannot
          // be filed between the check and the showing (the awaited write would otherwise widen that window).
          await auditDisclosure(request, 'admin_identity_check.member_mobile_shown', {
            actorId,
            pariwarId: p,
            resourceLocator: locator(memberId),
            context: { member_id: memberId.toLowerCase() },
          });
          mobile = canonical;
        } finally {
          // Read-only: nothing to keep (the advisory lock ends with the transaction).
          await closeScopeTx(scopeTx, false);
        }
      } catch (err) {
        failure = err;
      }
      if (failure !== undefined || mobile === undefined) {
        audit(request, 'admin_identity_check.member_mobile_reveal_rejected', {
          actorId,
          pariwarId: p,
          resourceLocator: locator(memberId),
          context: {
            member_id: memberId.toLowerCase(),
            reason:
              failure instanceof ConflictError
                ? 'mobile_unavailable'
                : failure instanceof ServiceUnavailableError
                  ? 'audit_unavailable'
                  : auditReason(failure),
          },
        });
        if (failure instanceof ConflictError || failure instanceof ServiceUnavailableError) throw failure;
        return translateForReveal(failure);
      }
      void reply.header('cache-control', 'no-store');
      return { mobile };
    },
  };
}
