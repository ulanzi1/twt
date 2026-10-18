// The District Admin's CALL RECORD — the handlers, ONE factory per chase surface (Story 6.37c, Task 6; AC7; LD10, LD11).
// Registered by the two EXISTING route files on their own path grammar (`…/correction/calls…`,
// `…/certificate-reminders/calls…`) — so the district resolver and the human-actor route gate apply (F17, T21) —
// behind key (1) `claim.record_correction_letter` (LD10 (a): the same act family, the same holder; ⛔ catalog change).
//
//   · record     — POST …/calls: a MANDATORY `Idempotency-Key` (400 without) over the keyed store in the house shape
//                  ([[project_idempotent_write_handler_shape]]): the claim, the write tx opened INSIDE the claim's try,
//                  COMMIT, THEN `recordResult`, `release()` on any failure; a replay under the same key returns the
//                  FIRST result (200) whatever its body (the store compares ⛔ bodies); a replay while the first is in
//                  flight ⇒ 409 `contact_call.idempotency_in_progress`. 201 + the DTO; one audit line RIGHT after the
//                  commit — BEFORE `recordResult`, so a store failure can ⛔ drop the audit of a committed call (review
//                  round 2, P5); a `recordResult` failure after the commit is logged and the committed call still returns
//                  201 (⛔ "could not be saved" for a call that WAS saved).
//   · precheckNumber — a preHandler BEFORE the step-up on the reveal route: the call refusals (claim, D30, recipient,
//                  LD11's nominee gate) run FIRST, so ⛔ OTP is spent on a reveal that will be refused (round 2, P6).
//   · readNumber — GET …/calls/number?person_key=: behind a FRESH step-up (`contact_call_number`), the person's CURRENT
//                  number (after a 6.20 correction, the new one), `Cache-Control: no-store`, ONE audit line per reveal;
//                  an unreadable envelope / a KMS fault IN THE DECRYPT ⇒ a retryable 503 `contact_call.number_unavailable`
//                  (logged, ids + the error's message only); anything else (a DB fault, a bug) is a 500 (round 2, P32).
// ⭐ LD11 — the nominee-call switch is the api config's `claimNomineeCallsCleared` (ONE env var, read at boot), passed
// into the domain — ⛔ read there. Uncleared ⇒ both routes refuse a NOMINEE (409 `contact_call.nominee_calls_not_cleared`).
// Every audit line: `resourceLocator: 'claim:<lower-case uuid>'`, ⛔ a number, ⛔ a name (who answered is a ROLE).

import type { ContactCallDto, ContactCallNumberResponse, RecordContactCallRequest } from '@twt/contracts';
import { claim, idempotency } from '@twt/domain';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { AuthAuditEventType } from '../../audit/audit-sink.js';
import type { AppDeps } from '../../context.js';
import { BadRequestError, ConflictError, NotFoundError, ServiceUnavailableError } from '../../http-errors.js';
import { contextOf } from './claims.correction-chase.handlers.js';
import { actorDisplayOf, auditClaim, inWriteTx } from './claims.correction-closure.handlers.js';
import { toContactCallDto } from './contact-ladder-dto.js';

/** The FRESH step-up the number reveal requires (a free string — ⛔ registry; the admin's `client.ts` has the same). */
export const CONTACT_CALL_NUMBER_STEP_UP_CONTEXT = 'contact_call_number';
/** LD10 — a call's idempotency claim is held this long (a reused key within a day replays the first call). */
export const CONTACT_CALL_IDEMPOTENCY_TTL_SECONDS = 24 * 60 * 60;

/**
 * A call refusal as its stable 4xx, in plain words. ⭐ Exhaustive over `ContactCallRefusal` — a compile error, ⛔ a
 * silent default, when the domain adds one.
 */
export function contactCallRefusalError(refusal: claim.ContactCallRefusal): Error {
  const c = (message: string) => new ConflictError(message, `contact_call.${refusal}`);
  const b = (message: string) => new BadRequestError(message, `contact_call.${refusal}`);
  switch (refusal) {
    case 'claim_not_found':
      return new NotFoundError('Claim not found', 'contact_call.claim_not_found');
    case 'undetermined':
      return c('Who the family is has not been settled for this claim yet — there is nobody to record a call to');
    case 'no_contact_record':
      return c("The family's contact details are not on this claim — the helpline can add them");
    case 'agreement_not_live':
      return c("The family's agreement to be contacted is not in force");
    case 'not_a_recipient':
      return c('This person is not one of the people being reminded on this claim');
    case 'nominee_calls_not_cleared':
      return c("A nominee cannot be phoned yet — the Trust's lawyer has not confirmed it may. Post them a letter instead");
    case 'called_on_in_future':
      return b('The call date cannot be later than today');
    case 'called_on_before_filing':
      return b('The call date is before the claim was filed');
    case 'reached_needs_answer':
      return b('A call reaches the family only when the person or a family member answered');
    default: {
      const unreachable: never = refusal;
      return new ConflictError('The call cannot be recorded', `contact_call.${String(unreachable)}`);
    }
  }
}

/** Every typed error a call act may throw, as its 4xx. Rethrows anything else. */
function translateContactCallError(err: unknown): never {
  if (err instanceof claim.ContactCallRefusedError) throw contactCallRefusalError(err.refusal);
  throw err;
}

/** Review P27 — a header this long could only be a client bug; capped before it's persisted as part of a store key. */
const IDEMPOTENCY_KEY_MAX_LENGTH = 200;

function requireIdempotencyKey(request: FastifyRequest): string {
  const raw = request.headers['idempotency-key'];
  const key = Array.isArray(raw) ? raw[0] : raw;
  if (!key || key.trim() === '') {
    throw new BadRequestError('An Idempotency-Key header is required', 'contact_call.idempotency_key_required');
  }
  const trimmed = key.trim();
  if (trimmed.length > IDEMPOTENCY_KEY_MAX_LENGTH) {
    throw new BadRequestError('The Idempotency-Key header is too long', 'contact_call.idempotency_key_too_long');
  }
  return trimmed;
}

/** The call handlers of ONE surface — `correction` (…/correction/calls) or `certificate` (…/certificate-reminders/calls). */
export function createContactCallHandlers(
  deps: AppDeps,
  chase: 'correction' | 'certificate',
  audits: { readonly recorded: AuthAuditEventType; readonly revealed: AuthAuditEventType },
) {
  const idempotencyStore = idempotency.createKeyedStore(deps.pool);
  const nomineeCallsCleared = (): boolean => deps.config.claimNomineeCallsCleared;

  return {
    /** POST …/calls — key (1) + a MANDATORY `Idempotency-Key`. */
    async record(request: FastifyRequest, reply: FastifyReply): Promise<ContactCallDto> {
      const ctx = contextOf(request);
      const body = request.body as RecordContactCallRequest;
      const key = requireIdempotencyKey(request);
      // Review P17 — scoped by claim and chase too: an Idempotency-Key value an actor reuses across claims, or
      // across the correction/certificate surfaces, must ⛔ replay the first claim's/chase's result onto the second.
      const storeKey = `claim.contact_call:${ctx.pariwarIdStr}:${ctx.actorId}:${ctx.claimCaseIdStr}:${chase}:${key}`;
      const claimed = await idempotencyStore.claim(storeKey, CONTACT_CALL_IDEMPOTENCY_TTL_SECONDS);
      if (claimed === 'already_claimed') {
        const stored = await idempotencyStore.getResult(storeKey);
        if (stored !== null) {
          // ⭐ The FIRST result, whatever this replay's body says (the store compares ⛔ bodies) — ⛔ a second row.
          void reply.status(200);
          return stored as ContactCallDto;
        }
        throw new ConflictError(
          'A call with this Idempotency-Key is already being recorded — please wait and retry',
          'contact_call.idempotency_in_progress',
        );
      }
      let settled = false;
      try {
        const actorDisplay = await actorDisplayOf(deps, ctx.actorId);
        let result: claim.RecordContactCallResult;
        try {
          // The write tx opens INSIDE the claim's try; `inWriteTx` COMMITS before it returns (and rethrows a failed one).
          result = await inWriteTx(deps, ctx.pariwarIdStr, (client) =>
            claim.recordContactCall(client, {
              pariwarId: ctx.pariwarId,
              claimCaseId: ctx.claimCaseId,
              chase,
              personKey: body.person_key,
              calledOn: body.called_on,
              answeredBy: body.answered_by,
              outcome: body.outcome,
              actorId: ctx.actorId,
              actorDisplay,
              nomineeCallsCleared: nomineeCallsCleared(),
              now: deps.clock(),
            }),
          );
        } catch (err) {
          translateContactCallError(err);
        }
        const dto = toContactCallDto(result!.call);
        // Review P26 — the call row already COMMITTED above; a `recordResult` failure here must ⛔ release the key
        // for a retry (that would write a SECOND call row). Mark `settled` FIRST so the `finally` below only
        // releases on a failure that happened BEFORE the commit.
        settled = true;
        // Review round 2, P5 — the audit/mutation pair: the line is written for EVERY committed call, BEFORE the
        // store's `recordResult`, so a store failure can ⛔ leave a committed call un-audited.
        auditClaim(deps, request, ctx, audits.recorded, {
          call_id: dto.call_id,
          person_key: dto.person_key,
          called_on: dto.called_on,
          answered_by: dto.answered_by,
          outcome: dto.outcome,
          ended_ladder_count: result!.endedLadderIds.length,
        });
        try {
          await idempotencyStore.recordResult(storeKey, dto);
        } catch (err) {
          // The call IS saved (committed + audited): ⛔ tell the client it was not. The key stays claimed with ⛔
          // result — a replay under it gets 409 until the TTL (the deferred P26 residual), ⛔ a second row.
          request.log.warn(
            { claimCaseId: ctx.claimCaseIdStr, callId: dto.call_id, err: err instanceof Error ? err.name : 'unknown' },
            'contact-call: the idempotency result could not be recorded after the commit',
          );
        }
        void reply.status(201);
        return dto;
      } finally {
        // Any failure BEFORE the commit releases it, so the SAME key can be retried at once (⛔ wait out the TTL).
        // A failure AFTER the commit (`settled = true`) leaves it claimed — a retry gets 409 `idempotency_in_progress`
        // until the TTL, never a second call row (review P26).
        if (!settled) await idempotencyStore.release(storeKey).catch(() => undefined);
      }
    },

    /**
     * Review round 2, P6 — a preHandler on the reveal route, BEFORE the step-up: the call refusals (the claim, D30, the
     * recipient set, LD11's nominee gate) answer first, so a District Admin is ⛔ sent a code for a reveal that the
     * handler would refuse. Reads only; the handler re-runs it (the step-up sits between the two).
     */
    async precheckNumber(request: FastifyRequest): Promise<void> {
      const ctx = contextOf(request);
      const { person_key: personKey } = request.query as { person_key: string };
      try {
        await claim.assertContactCallAllowed(request.scopeTx!.tx, {
          pariwarId: ctx.pariwarId,
          claimCaseId: ctx.claimCaseId,
          chase,
          personKey,
          nomineeCallsCleared: nomineeCallsCleared(),
        });
      } catch (err) {
        translateContactCallError(err);
      }
    },

    /** GET …/calls/number?person_key= — key (1) + a FRESH step-up; one audit line per reveal; `no-store`. */
    async readNumber(request: FastifyRequest, reply: FastifyReply): Promise<ContactCallNumberResponse> {
      const ctx = contextOf(request);
      const { person_key: personKey } = request.query as { person_key: string };
      // ⛔ A step-up-gated Tier-1 read is never cached.
      void reply.header('cache-control', 'no-store');
      let person: claim.ContactCallPerson;
      try {
        person = await claim.assertContactCallAllowed(request.scopeTx!.tx, {
          pariwarId: ctx.pariwarId,
          claimCaseId: ctx.claimCaseId,
          chase,
          personKey,
          nomineeCallsCleared: nomineeCallsCleared(),
        });
      } catch (err) {
        translateContactCallError(err); // a refusal ⇒ its 4xx; a DB fault / a bug ⇒ rethrown (a 500)
      }
      let e164: string | null;
      try {
        e164 = await claim.resolveCorrectionMobile(person!.mobileCiphertext, person!.mobileSource, ctx.pariwarIdStr, deps.encryption);
      } catch (err) {
        // Review round 2, P32 — ONLY the decrypt maps to the retryable 503 (an unreadable envelope / a KMS blip). Ids and
        // the error's CLASS only — ⛔ its message: an envelope parser's SyntaxError or a normaliser's message can echo the
        // stored value (fix-diff review).
        request.log.warn(
          {
            claimCaseId: ctx.claimCaseIdStr,
            personKey,
            err: err instanceof Error ? err.name : 'unknown',
            errClass: err instanceof Error ? err.constructor.name : typeof err,
          },
          'contact-call: the number could not be read',
        );
        throw new ServiceUnavailableError("This person's number could not be read just now — try again in a minute", 'contact_call.number_unavailable');
      }
      auditClaim(deps, request, ctx, audits.revealed, { person_key: personKey });
      return { person_key: personKey, number: e164 };
    },
  };
}
