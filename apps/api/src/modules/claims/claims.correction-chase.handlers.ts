// The correction-return CHASE — the District Admin's handlers (Story 6.19b, Task 7; AC5, AC9b, AC16).
//
//   · changeMustAct      — key (7): change WHO MUST ACT on the live return, with a REQUIRED note. The route refuses a
//                          change to the value the mark already has (409 `must_act.unchanged`); the domain writer
//                          refuses when there is ⛔ no live return (409 `must_act.no_live_return`) and writes under the
//                          trustee lock, so the change cannot race a second return onto a superseded `decision_id`.
//   · recordLetter       — key (1): a POSTED letter to a letter-eligible person (D31's own precondition; ≤ 2 per person
//                          per RETURN — `-272` §2(c) / `-273` §2, Story 6.19c; the second only after the first's
//                          delivery AND posted on/after that delivery date, `-231` D). The cheap refusals run FIRST
//                          (a read-only `assertCorrectionLetterRecordable`), THEN the tracking number is encrypted, THEN
//                          the writer re-checks under the lock (6.19b's third-pass follow-up: ⛔ KMS before a 409). ⚠ When the person's
//                          CURRENT number could not be hashed (a KMS / envelope fault) the precondition fails CLOSED:
//                          503 `correction_letter.number_unverified` (retryable), on this route AND the address reveal
//                          — each logged first as a warn line (ids only), so a persistent fault is visible server-side.
//   · recordDelivery     — key (1): the delivery date + ONE screenshot (multipart). MIME and size are checked BEFORE
//                          the port's `put`; put-then-persist, the orphan deleted best-effort on any failure THROWN
//                          before the commit (opening the scope tx included). ⚠ ⛔ NOT a failed COMMIT itself:
//                          `closeScopeTx` swallows a COMMIT failure, so the route then returns 201, writes the audit
//                          line and leaves the screenshot orphaned — a pre-existing project-wide pattern, DEFERRED
//                          (`deferred-work.md`, 6.19b fourth pass), ⛔ not fixed here. A delivery later than 14 days
//                          is ACCEPTED (flagged overdue by the read) — ⛔ never refused.
//                          ⚠ ⛔ No virus scan exists (D6) — recorded in `deferred-work.md`, ⛔ not fixed.
//   · readLetterAddress  — key (1) + STEP-UP: that person's address, ONLY inside the letter form; one audit line per
//                          reveal; `Cache-Control: no-store`. ⛔ Never under `claim.view_nominee_name_check`.
//   · readScreenshot     — key (1): a TTL-limited signed read URL; audited; `Cache-Control: no-store`.
// ⛔ A `posted_on` / `delivered_on` LATER than today (IST) is refused here (400 `correction_letter.date_in_future`),
// before the writer — a future delivery date would stop the person's reminders today. The lower bounds (⛔ before
// the live return's IST date; ⛔ before the first letter's delivery; a delivery before the posting) are the writer's.
// Every audit line: `resourceLocator: 'claim:<lower-case uuid>'`, the actor's SNAPSHOTTED display name on the record
// ([[project_admin_display_name_attribution]]), ⛔ never a tracking number, an address, a note or a screenshot.

import { randomUUID } from 'node:crypto';

import {
  CLAIM_DOCUMENT_MAX_BYTES,
  CORRECTION_LETTER_SCREENSHOT_MIME_TYPES,
  isRealCalendarDate,
  type ChangeCorrectionMustActRequest,
  type ChangeCorrectionMustActResponse,
  type CorrectionLetterAddressResponse,
  type CorrectionLetterDto,
  type CorrectionLetterScreenshotResponse,
  type RecordCorrectionLetterRequest,
} from '@twt/contracts';
import { claim, cycleCalendar, ids, rbac, schema } from '@twt/domain';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { AuthAuditEventType } from '../../audit/audit-sink.js';
import type { AppDeps } from '../../context.js';
import {
  AdminDisplayNameMissingError,
  BadRequestError,
  ConflictError,
  NotFoundError,
  PayloadTooLargeError,
  ServiceUnavailableError,
  UnauthorizedError,
  UnsupportedMediaTypeError,
} from '../../http-errors.js';
import { getDisplayName } from '../auth/admin/admin-auth.repo.js';
import { emitAuthAudit } from '../auth/shared/audit.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';
import { geoTreeResolverForRequest, loadActorGrants } from '../rbac/index.js';
import { decryptClaimContactField } from './claim-contact-crypto.js';
import { encryptCorrectionMarkNote, encryptCorrectionTrackingNumber } from './correction-chase-crypto.js';

export const CORRECTION_LETTER_KEY = 'claim.record_correction_letter';
export const CORRECTION_MUST_ACT_KEY = 'claim.change_correction_must_act';
export const CORRECTION_LETTER_ADDRESS_STEP_UP_CONTEXT = 'correction_letter_address';
/** The screenshot's signed read lives this long (a short, never-public link). */
export const CORRECTION_SCREENSHOT_URL_TTL_SECONDS = 300;


interface ChaseContext {
  readonly actorId: string;
  readonly pariwarIdStr: string;
  readonly pariwarId: ids.PariwarId;
  readonly claimCaseId: ids.ClaimId;
  readonly claimCaseIdStr: string;
}

function contextOf(request: FastifyRequest): ChaseContext {
  const scopeTx = request.scopeTx;
  const actorId = request.requestContext.actorId;
  if (!scopeTx || !actorId) throw new UnauthorizedError('Authentication required', 'auth.session_required');
  const { claimCaseId } = request.params as { claimCaseId: string };
  return {
    actorId,
    pariwarIdStr: scopeTx.pariwarId,
    pariwarId: ids.pariwarId(scopeTx.pariwarId),
    claimCaseId: ids.claimId(claimCaseId),
    claimCaseIdStr: claimCaseId.toLowerCase(),
  };
}

/**
 * The D31 / D20 refusals as stable 4xx codes — and the precondition's fail-CLOSED hash fault as a retryable 503
 * (`correction_letter.number_unverified`): the person's current number could not be hashed just now, so whether they
 * are letter-eligible on THAT number is unknown — ⛔ never decided on the old number's history.
 */
export function translateLetterError(err: unknown): never {
  if (err instanceof claim.CorrectionNumberUnverifiedError) {
    throw new ServiceUnavailableError(
      "This person's current number could not be checked just now — try again in a minute",
      'correction_letter.number_unverified',
    );
  }
  if (err instanceof claim.CorrectionLetterRefusedError) {
    // ⭐ Exhaustive over `CorrectionLetterRefusal` — a compile error, ⛔ not a silent `?? 'default'` forward, is
    // what should happen if the domain ever adds a refusal reason this route doesn't know about yet.
    switch (err.refusal) {
      case 'not_found':
        throw new NotFoundError('Letter not found', 'correction_letter.not_found');
      case 'delivered_before_posted':
        throw new BadRequestError('The delivery date is before the posting date', 'correction_letter.delivered_before_posted');
      case 'no_family_run':
        throw new ConflictError('This claim has no family reminder run — a letter belongs to one', 'correction_letter.no_family_run');
      case 'not_letter_eligible':
        throw new ConflictError(
          'This person is not letter-eligible — a letter is for someone the text reminders could not reach',
          'correction_letter.not_letter_eligible',
        );
      case 'address_missing':
        throw new ConflictError("This person's postal address is not on the claim's contact record", 'correction_letter.address_missing');
      case 'agreement_not_live':
        throw new ConflictError("The family's agreement to be contacted is not in force", 'correction_letter.agreement_not_live');
      case 'limit_reached':
        throw new ConflictError('Two letters have already been recorded for this person on this return', 'correction_letter.limit_reached');
      case 'already_delivered':
        throw new ConflictError("This letter's delivery is already recorded", 'correction_letter.already_delivered');
      case 'first_not_delivered':
        // `-231` D — "at most two letters; the second after the first's delivery".
        throw new ConflictError(
          "The person's first letter has no recorded delivery — a second letter follows the first's delivery",
          'correction_letter.first_not_delivered',
        );
      case 'posted_before_first_delivery':
        // `-231` D's chronology — the second letter follows the first's DELIVERY, so it cannot be posted before it.
        throw new ConflictError(
          "The posting date is before the person's first letter was delivered",
          'correction_letter.posted_before_first_delivery',
        );
      case 'posted_before_run':
        throw new ConflictError('The posting date is before the claim was returned for correction', 'correction_letter.posted_before_run');
      default: {
        const unreachable: never = err.refusal;
        throw new ConflictError('The letter cannot be recorded', `correction_letter.${String(unreachable)}`);
      }
    }
  }
  throw err;
}

/**
 * Story 6.19b (fifth pass) — the J1 503 leaves a SERVER trace. A persistent envelope / KMS fault would otherwise block
 * one person's letter and address reveal indefinitely with only a 503 in the access log. ⛔ Ids only: the claim id,
 * the person key (`claimant` / `nominee:<version id>`) and the route — never a number, an address or a hash.
 */
function warnIfNumberUnverified(request: FastifyRequest, err: unknown, route: 'record_letter' | 'letter_address'): void {
  if (!(err instanceof claim.CorrectionNumberUnverifiedError)) return;
  request.log.warn(
    { claimCaseId: err.claimCaseId.toLowerCase(), personKey: err.personKey, route },
    "correction-letter: the person's current number could not be hashed — refusing with 503 number_unverified",
  );
}

/** ⛔ A letter date LATER than today (IST) — 400 `correction_letter.date_in_future`. */
function refuseFutureDate(date: string, today: string): void {
  if (date > today) {
    throw new BadRequestError('A letter date cannot be later than today', 'correction_letter.date_in_future');
  }
}

export function toLetterDto(row: claim.ClaimCorrectionLetterView, today: string): CorrectionLetterDto {
  return {
    letter_id: row.letterId,
    person_key: row.personKey,
    sequence: row.sequence as 1 | 2,
    posted_on: row.postedOn,
    delivered_on: row.deliveredOn ?? null,
    overdue: claim.correctionLetterOverdue(row.postedOn, row.deliveredOn ?? null, today),
    has_screenshot: row.screenshotStorageKey !== null && row.screenshotStorageKey !== undefined,
  };
}

export function createCorrectionChaseHandlers(deps: AppDeps) {
  async function displayName(actorId: string): Promise<string> {
    const name = await getDisplayName(deps.pool, actorId);
    if (name === null) throw new AdminDisplayNameMissingError(actorId);
    return name;
  }
  function audit(request: FastifyRequest, ctx: ChaseContext, type: AuthAuditEventType, context: Record<string, unknown>): void {
    emitAuthAudit(deps, request, type, {
      actorId: ctx.actorId,
      pariwarId: ctx.pariwarId,
      resourceLocator: `claim:${ctx.claimCaseIdStr}`,
      context: { claim_case_id: ctx.claimCaseIdStr, ...context },
    });
  }
  const today = (): string => cycleCalendar.istDateOf(deps.clock());

  return {
    /** POST …/correction/must-act — key (7). */
    async changeMustAct(request: FastifyRequest, reply: FastifyReply): Promise<ChangeCorrectionMustActResponse> {
      const ctx = contextOf(request);
      const body = request.body as ChangeCorrectionMustActRequest;
      const actorDisplay = await displayName(ctx.actorId);
      const grants = request.scopeGrants ?? (await loadActorGrants(request.scopeTx!, ctx.actorId));
      const role = rbac.matchingGrantRole(
        grants,
        CORRECTION_MUST_ACT_KEY,
        { dimension: 'district', value: request.nomineeNameCheckDistrict ?? null, pariwarId: ctx.pariwarIdStr },
        { resolver: geoTreeResolverForRequest(request) },
      );
      // The route's own gate already required this key — a `null`/unrecognised re-check result is a
      // programming error (grant/context drift), never a real "nobody authorised this" case.
      if (role === null || !(schema.CORRECTION_MARK_ROLES as readonly string[]).includes(role)) {
        throw new Error(`[correction-chase] changeMustAct: no matching grant role resolved (got ${String(role)})`);
      }
      const setByRole = role as schema.CorrectionMarkRole;
      // ⭐ The cheap refusals FIRST (read-only; the writer re-checks under the lock) — ⛔ KMS work for a 409 (6.19b's
      // third-pass follow-up).
      const pre = await claim.resolveCorrectionChase(request.scopeTx!.tx, ctx.pariwarId, ctx.claimCaseId);
      if (pre.liveReturn === null) {
        throw new ConflictError('This claim has no live return — there is nothing to mark', 'must_act.no_live_return');
      }
      if (pre.mark?.mustAct === body.must_act) {
        throw new ConflictError(`Who must act is already "${body.must_act}"`, 'must_act.unchanged');
      }
      const noteCiphertext = await encryptCorrectionMarkNote(body.note, ctx.pariwarIdStr, deps.encryption);
      const scopeTx = await openScopeTx(deps, ctx.pariwarIdStr);
      let ok = false;
      let result: claim.WriteCorrectionMarkResult;
      try {
        result = await claim.writeCorrectionMark(scopeTx.client, {
          pariwarId: ctx.pariwarId,
          claimCaseId: ctx.claimCaseId,
          mustAct: body.must_act,
          actorId: ctx.actorId,
          actorDisplay,
          setByRole,
          noteCiphertext,
          refuseUnchanged: true,
          now: deps.clock(),
        });
        ok = true;
      } catch (err) {
        if (err instanceof claim.CorrectionMarkNoLiveReturnError) {
          throw new ConflictError('This claim has no live return — there is nothing to mark', 'must_act.no_live_return');
        }
        if (err instanceof claim.CorrectionMarkUnchangedError) {
          throw new ConflictError(`Who must act is already "${err.mustAct}"`, 'must_act.unchanged');
        }
        if (err instanceof claim.CorrectionMarkNoteRequiredError) {
          throw new ConflictError('A note is required for this change', 'must_act.note_required');
        }
        throw err;
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
      audit(request, ctx, 'admin_claim_correction.must_act_changed', {
        must_act: result.mark.mustAct,
        set_by_role: result.mark.setByRole,
        ended_run_kind: result.endedRun?.kind ?? null,
        opened_run_kind: result.openedRun?.kind ?? null,
      });
      void reply.status(201);
      return {
        claim_case_id: ctx.claimCaseIdStr,
        must_act: result.mark.mustAct,
        opened_run: result.openedRun
          ? { run_id: result.openedRun.runId, kind: result.openedRun.kind, day0: result.openedRun.day0 }
          : null,
      };
    },

    /** POST …/correction/letters — key (1). */
    async recordLetter(request: FastifyRequest, reply: FastifyReply): Promise<CorrectionLetterDto> {
      const ctx = contextOf(request);
      const body = request.body as RecordCorrectionLetterRequest;
      refuseFutureDate(body.posted_on, today());
      const actorDisplay = await displayName(ctx.actorId);
      // ⭐ The cheap refusals FIRST (read-only — D31, the return's cap, the chronology); the writer re-checks under the
      // lock. ⛔ KMS work for a 409 (6.19b's third-pass follow-up).
      try {
        await claim.assertCorrectionLetterRecordable(
          request.scopeTx!.tx,
          ctx.pariwarId,
          ctx.claimCaseId,
          body.person_key,
          body.posted_on,
          { crypto: deps.encryption },
        );
      } catch (err) {
        warnIfNumberUnverified(request, err, 'record_letter');
        translateLetterError(err);
      }
      const trackingNumberCiphertext = await encryptCorrectionTrackingNumber(body.tracking_number, ctx.pariwarIdStr, deps.encryption);
      const scopeTx = await openScopeTx(deps, ctx.pariwarIdStr);
      let ok = false;
      let row: claim.ClaimCorrectionLetterView;
      try {
        row = await claim.recordCorrectionLetter(scopeTx.client, {
          pariwarId: ctx.pariwarId,
          claimCaseId: ctx.claimCaseId,
          personKey: body.person_key,
          postedOn: body.posted_on,
          trackingNumberCiphertext,
          actorId: ctx.actorId,
          actorDisplay,
          crypto: deps.encryption,
        });
        ok = true;
      } catch (err) {
        warnIfNumberUnverified(request, err, 'record_letter');
        translateLetterError(err);
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
      audit(request, ctx, 'admin_claim_correction.letter_recorded', {
        letter_id: row!.letterId,
        run_id: row!.runId,
        person_key: row!.personKey,
        sequence: row!.sequence,
        posted_on: row!.postedOn,
      });
      void reply.status(201);
      return toLetterDto(row!, today());
    },

    /** POST …/correction/letters/:letterId/delivery — key (1), multipart. */
    async recordDelivery(request: FastifyRequest, reply: FastifyReply): Promise<CorrectionLetterDto> {
      const ctx = contextOf(request);
      // ⭐ Lower-cased ONCE — the storage key and the audit lines carry the canonical id ([[project_branded_ids_lowercase]]).
      const letterId = (request.params as { letterId: string }).letterId.toLowerCase();
      const actorDisplay = await displayName(ctx.actorId);
      // A cheap existence pre-check BEFORE reading or storing any bytes (the writer re-checks under the lock).
      const existing = await claim.readCorrectionLetter(request.scopeTx!.tx, ctx.pariwarId, ctx.claimCaseId, letterId);
      if (existing === null) throw new NotFoundError('Letter not found', 'correction_letter.not_found');
      if (existing.deliveredOn !== null) {
        throw new ConflictError("This letter's delivery is already recorded", 'correction_letter.already_delivered');
      }

      const data = await request.file();
      if (!data) throw new BadRequestError('No screenshot in the upload', 'correction_letter.no_file');
      if (!(CORRECTION_LETTER_SCREENSHOT_MIME_TYPES as readonly string[]).includes(data.mimetype)) {
        throw new UnsupportedMediaTypeError('Upload the screenshot as a JPEG, PNG or WebP image', 'correction_letter.unsupported_media_type', {
          allowed: CORRECTION_LETTER_SCREENSHOT_MIME_TYPES,
        });
      }
      let buffer: Buffer;
      try {
        buffer = await data.toBuffer();
      } catch (err) {
        const code = (err as { code?: string }).code;
        if (code === 'FST_REQ_FILE_TOO_LARGE' || code === 'FST_FILES_LIMIT') {
          throw new PayloadTooLargeError('The screenshot exceeds the size limit', 'correction_letter.too_large', {
            maxBytes: CLAIM_DOCUMENT_MAX_BYTES,
          });
        }
        throw err;
      }
      if (data.file.truncated || buffer.byteLength > CLAIM_DOCUMENT_MAX_BYTES) {
        throw new PayloadTooLargeError('The screenshot exceeds the size limit', 'correction_letter.too_large', {
          maxBytes: CLAIM_DOCUMENT_MAX_BYTES,
        });
      }
      if (buffer.byteLength === 0) throw new BadRequestError('The screenshot is empty', 'correction_letter.empty');
      // The delivery date. ⚠ The client sends the `delivered_on` field BEFORE the file: `request.file()` returns at the
      // file part, so only the fields ahead of it are guaranteed in `data.fields` — a field trailing the file is
      // timing-dependent (busboy may or may not have parsed it by now) and is ⛔ not relied on.
      const field = (data.fields as Record<string, { value?: unknown } | undefined> | undefined)?.['delivered_on'];
      const deliveredOn = field && typeof field.value === 'string' ? field.value.trim() : '';
      if (!isRealCalendarDate(deliveredOn)) {
        throw new BadRequestError('A delivery date (YYYY-MM-DD) is required with the screenshot', 'correction_letter.delivered_on_required');
      }
      refuseFutureDate(deliveredOn, today());

      // D6 — the port, its OWN key prefix. put-then-persist; the orphan is deleted best-effort on any failure THROWN before
      // the commit — ⭐ `openScopeTx` runs INSIDE the `try`, so a pool / BEGIN failure cleans up too. ⚠ A failed COMMIT is
      // ⛔ not one of them: `closeScopeTx` swallows it (deferred, see the header).
      const storageKey = `pariwar/${ctx.pariwarIdStr}/claim/${ctx.claimCaseIdStr}/correction-letter/${letterId}/${randomUUID()}`;
      await deps.claimDocumentStorage.put(storageKey, new Uint8Array(buffer), { contentType: data.mimetype });
      let scopeTx: Awaited<ReturnType<typeof openScopeTx>> | undefined;
      let ok = false;
      let row: claim.ClaimCorrectionLetterView;
      try {
        scopeTx = await openScopeTx(deps, ctx.pariwarIdStr);
        row = await claim.recordCorrectionLetterDelivery(scopeTx.client, {
          pariwarId: ctx.pariwarId,
          claimCaseId: ctx.claimCaseId,
          letterId,
          deliveredOn,
          screenshotStorageKey: storageKey,
          screenshotContentType: data.mimetype,
          screenshotSizeBytes: buffer.byteLength,
          actorId: ctx.actorId,
          actorDisplay,
        });
        ok = true;
      } catch (err) {
        if (typeof deps.claimDocumentStorage.delete === 'function') {
          await deps.claimDocumentStorage
            .delete(storageKey)
            .catch((delErr: unknown) => request.log.warn({ err: delErr }, 'correction-letter screenshot orphan cleanup failed'));
        } else {
          request.log.warn('correction-letter screenshot orphaned: the storage port has no delete()');
        }
        translateLetterError(err);
      } finally {
        if (scopeTx !== undefined) await closeScopeTx(scopeTx, ok);
      }
      const dto = toLetterDto(row!, today());
      audit(request, ctx, 'admin_claim_correction.letter_delivery_recorded', {
        letter_id: letterId,
        delivered_on: deliveredOn,
        overdue: dto.overdue,
        byte_size: buffer.byteLength,
        content_type: data.mimetype,
      });
      void reply.status(201);
      return dto;
    },

    /** GET …/correction/letters/address?person_key= — key (1) + step-up; one audit line per reveal. */
    async readLetterAddress(request: FastifyRequest, reply: FastifyReply): Promise<CorrectionLetterAddressResponse> {
      const ctx = contextOf(request);
      const { person_key: personKey } = request.query as { person_key: string };
      // ⛔ A step-up-gated Tier-1 read is never cached (no global hook sets this — checked 2026-10-01).
      void reply.header('cache-control', 'no-store');
      let address: claim.CorrectionLetterAddress;
      try {
        // The address is for a letter the District Admin may SEND — D31's precondition, the same answer the writer runs.
        // ⭐ `{ crypto }` — the SAME number-reset-aware person state the writer reads (AC3, `-271` §1).
        ({ address } = await claim.assertCorrectionLetterAllowed(request.scopeTx!.tx, ctx.pariwarId, ctx.claimCaseId, personKey, {
          crypto: deps.encryption,
        }));
      } catch (err) {
        warnIfNumberUnverified(request, err, 'letter_address');
        translateLetterError(err);
      }
      const plaintext = await decryptClaimContactField(address!.addressCiphertext, ctx.pariwarIdStr, deps.encryption);
      audit(request, ctx, 'admin_claim_correction.letter_address_revealed', { person_key: personKey });
      return { person_key: personKey, address: plaintext };
    },

    /** GET …/correction/letters/:letterId/screenshot — key (1); a TTL-limited signed URL. */
    async readScreenshot(request: FastifyRequest, reply: FastifyReply): Promise<CorrectionLetterScreenshotResponse> {
      const ctx = contextOf(request);
      const letterId = (request.params as { letterId: string }).letterId.toLowerCase();
      // ⛔ A signed read URL is a bearer credential for its TTL — never cached.
      void reply.header('cache-control', 'no-store');
      const row = await claim.readCorrectionLetter(request.scopeTx!.tx, ctx.pariwarId, ctx.claimCaseId, letterId);
      if (row === null || row.screenshotStorageKey === null) {
        throw new NotFoundError('No screenshot is recorded for this letter', 'correction_letter.no_screenshot');
      }
      const url = await deps.claimDocumentStorage.signedReadUrl(row.screenshotStorageKey, CORRECTION_SCREENSHOT_URL_TTL_SECONDS);
      audit(request, ctx, 'admin_claim_correction.letter_screenshot_read', { letter_id: letterId });
      return { url, expires_in_seconds: CORRECTION_SCREENSHOT_URL_TTL_SECONDS };
    },
  };
}
