// The REPLACEMENT-CERTIFICATE reminder — the District Admin's handlers (Story 6.19d; AC4, AC5, AC8; `2026-10-03-276`
// CR9, CR11). Key (1) `claim.record_correction_letter` on every one (the same act and holder as the correction and closure
// letters — 6.19c's precedent; ⛔ no catalog bump).
//
//   · getCertificateReminders        — the "Certificate reminders" LIST, row-filtered to the caller's districts with
//                                      `rbac.hasPermission` at the deceased's posting district BEFORE the page slice.
//   · recordCertificateLetter        — the ONE posted letter per person per claim (`-275` Q1 A) and per number (CR6).
//   · recordCertificateLetterDelivery — its delivery date + screenshot (multipart; the storage port, its own key prefix
//                                      `…/certificate-letter/{letterId}`; ⚠ ⛔ no virus scan — recorded, as D6).
//   · readCertificateLetterAddress   — THAT person's address, behind a FRESH step-up; one audit line per reveal.
//   · readCertificateLetterScreenshot — a TTL-signed URL, behind the SAME step-up (6.19c's 2026-10-02 review patch).
// Every refusal is a stable code `certificate_letter.<refusal>` (⭐ an exhaustive `never` switch). Every per-claim audit
// line: `resourceLocator: 'claim:<lower-case uuid>'`, ⛔ never a tracking number, an address or a screenshot.
// ⛔ Nothing here refuses, closes, approves or time-limits a claim (invariant 1).

import { randomUUID } from 'node:crypto';

import type {
  CertificateLetterAddressResponse,
  CertificateLetterDto,
  CertificateLetterScreenshotResponse,
  CertificateReminderItemDto,
  CertificateRemindersResponse,
  RecordCertificateLetterRequest,
} from '@twt/contracts';
import { claim, cycleCalendar, encryption, ids, member as memberDomain, rbac, schema } from '@twt/domain';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import { emitAuthAudit } from '../auth/shared/audit.js';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  ServiceUnavailableError,
  UnauthorizedError,
} from '../../http-errors.js';
import { geoTreeResolverForRequest, loadActorGrants } from '../rbac/index.js';
import { decryptClaimContactField } from './claim-contact-crypto.js';
import {
  CORRECTION_LETTER_KEY,
  CORRECTION_SCREENSHOT_URL_TTL_SECONDS,
  contextOf,
  readLetterScreenshotUpload,
  refuseFutureDate,
} from './claims.correction-chase.handlers.js';
import { actorDisplayOf, auditClaim, inWriteTx } from './claims.correction-closure.handlers.js';

/** The fresh step-up the address read AND the screenshot read require. */
export const CERTIFICATE_LETTER_ADDRESS_STEP_UP_CONTEXT = 'certificate_letter_address';
/** The Tier-1 field class of a certificate letter's tracking number (`piiColumn(1, 'claim_certificate_letter')`). */
export const CLAIM_CERTIFICATE_LETTER_FIELD_CLASS = 'claim_certificate_letter';

/**
 * A certificate-letter refusal as its stable 4xx, in plain words. ⭐ Exhaustive over `CertificateLetterRefusal` — a
 * compile error, ⛔ not a silent default, when the domain adds one.
 */
export function certificateLetterRefusalError(refusal: claim.CertificateLetterRefusal): Error {
  const c = (message: string) => new ConflictError(message, `certificate_letter.${refusal}`);
  switch (refusal) {
    case 'no_run':
      return c('There is no certificate reminder on this claim — no letter is owed');
    case 'not_letter_eligible':
      return c("A letter is owed only when this person's text messages could not reach their current number");
    case 'address_missing':
      return c("This person's postal address is not on the claim's contact record");
    case 'agreement_not_live':
      return c("The family's agreement to be contacted is not in force");
    case 'already_recorded':
      return c('A certificate letter to this person — or to their phone number — is already recorded. Only one is sent');
    case 'already_delivered':
      return c("This letter's delivery is already recorded");
    case 'delivered_before_posted':
      return new BadRequestError('The delivery date is before the posting date', 'certificate_letter.delivered_before_posted');
    case 'not_found':
      return new NotFoundError('Letter not found', 'certificate_letter.not_found');
    default: {
      const unreachable: never = refusal;
      return new ConflictError('The certificate letter cannot be recorded', `certificate_letter.${String(unreachable)}`);
    }
  }
}

/** Every typed error a certificate-letter act may throw, as its 4xx / 503. Rethrows anything else. */
export function translateCertificateLetterError(err: unknown): never {
  if (err instanceof claim.CertificateLetterRefusedError) throw certificateLetterRefusalError(err.refusal);
  if (err instanceof claim.CorrectionNumberUnverifiedError) {
    // The person's CURRENT number could not be checked just now — fail CLOSED, retryable (⛔ a 409).
    throw new ServiceUnavailableError(
      "A family member's current number could not be checked just now — try again in a minute",
      'certificate_letter.number_unverified',
    );
  }
  throw err;
}

function letterDto(
  row: { letterId: string; personKey: string; postedOn: string; deliveredOn: string | null; screenshotStorageKey: string | null },
  today: string,
): CertificateLetterDto {
  return {
    letter_id: row.letterId,
    person_key: row.personKey,
    posted_on: row.postedOn,
    delivered_on: row.deliveredOn ?? null,
    overdue: claim.closureLetterOverdue(row.postedOn, row.deliveredOn ?? null, today as cycleCalendar.CalendarDateString),
    has_screenshot: row.screenshotStorageKey !== null,
  };
}

function itemDto(r: claim.CertificateListItem): CertificateReminderItemDto {
  return {
    claim_case_id: r.claimCaseId,
    short_reference: r.shortReference,
    cause: r.cause,
    run_state: r.runState,
    pause_reason: r.pauseReason,
    run_day: r.runDay,
    next_reminder_on: r.nextReminderOn,
    cannot_remind: r.cannotRemind,
    people: r.people.map((p) => ({
      person_key: p.personKey,
      role: p.role,
      position: p.position,
      sms_state: p.smsState,
      letter_eligible: p.letterEligible,
      letter:
        p.letter === null
          ? null
          : {
              letter_id: p.letter.letterId,
              posted_on: p.letter.postedOn,
              delivered_on: p.letter.deliveredOn,
              overdue: p.letter.overdue,
              has_screenshot: p.letter.hasScreenshot,
            },
      escalation_recorded_on: p.escalationRecordedOn,
    })),
  };
}

export function createCertificateReminderHandlers(deps: AppDeps) {
  const today = (): string => cycleCalendar.istDateOf(deps.clock());

  return {
    /**
     * GET …/admin/certificate-reminders — key (1): ROW-FILTERED to the caller's districts at the deceased's posting
     * district, over the bounded scan, BEFORE the page slice (a bare Pariwar gate would leak other districts' claims).
     */
    async getCertificateReminders(request: FastifyRequest): Promise<CertificateRemindersResponse> {
      const scopeTx = request.scopeTx;
      const actorId = request.requestContext.actorId;
      if (!scopeTx || !actorId) throw new UnauthorizedError('Authentication required', 'auth.session_required');
      const pariwarId = ids.pariwarId(scopeTx.pariwarId);
      const grants = request.scopeGrants ?? (await loadActorGrants(scopeTx, actorId));
      const geoTree = geoTreeResolverForRequest(request);
      const scanned = await claim.listCertificateReminderClaims(scopeTx.tx, pariwarId, today() as cycleCalendar.CalendarDateString);
      const visible: claim.CertificateListItem[] = [];
      for (const row of scanned) {
        const posting = await memberDomain.getMemberPostingLatest(scopeTx.tx, pariwarId, ids.memberId(row.deceasedMemberId));
        const district = posting?.district ?? null;
        if (rbac.hasPermission(grants, CORRECTION_LETTER_KEY, { dimension: 'district', value: district, pariwarId: scopeTx.pariwarId }, { resolver: geoTree })) {
          visible.push(row);
        }
      }
      const limit = (request.query as { limit?: number } | undefined)?.limit ?? claim.CERTIFICATE_LIST_DEFAULT_LIMIT;
      const items = visible.slice(0, limit).map(itemDto);
      emitAuthAudit(deps, request, 'admin_claim_certificate_reminder.list_read', {
        actorId,
        pariwarId: scopeTx.pariwarId,
        context: { visible_count: items.length },
      });
      return { items };
    },

    /** POST …/certificate-reminders/letters — key (1): the ONE posted letter (CR9). */
    async recordCertificateLetter(request: FastifyRequest, reply: FastifyReply): Promise<CertificateLetterDto> {
      const ctx = contextOf(request);
      const body = request.body as RecordCertificateLetterRequest;
      refuseFutureDate(body.posted_on, today(), 'certificate_letter');
      const actorDisplay = await actorDisplayOf(deps, ctx.actorId);
      // The cheap refusals first (read-only) — ⛔ KMS work for a 409 beyond the number hash itself.
      try {
        await claim.assertCertificateLetterAllowed(request.scopeTx!.tx, ctx.pariwarId, ctx.claimCaseId, body.person_key, {
          crypto: deps.encryption,
        });
      } catch (err) {
        translateCertificateLetterError(err);
      }
      const trackingNumberCiphertext = encryption.serializeEnvelope(
        await encryption.encryptTier1(
          Buffer.from(body.tracking_number.trim(), 'utf-8'),
          { pariwarId: ctx.pariwarIdStr, fieldClass: CLAIM_CERTIFICATE_LETTER_FIELD_CLASS },
          deps.encryption.kms,
          deps.encryption.kekRef,
        ),
      );
      let row: schema.ClaimCertificateReminderLetterRow;
      try {
        row = await inWriteTx(deps, ctx.pariwarIdStr, (client) =>
          claim.recordCertificateLetter(
            client,
            {
              pariwarId: ctx.pariwarId,
              claimCaseId: ctx.claimCaseId,
              personKey: body.person_key,
              postedOn: body.posted_on,
              trackingNumberCiphertext,
              actorId: ctx.actorId,
              actorDisplay,
            },
            { crypto: deps.encryption },
          ),
        );
      } catch (err) {
        translateCertificateLetterError(err);
      }
      auditClaim(deps, request, ctx, 'admin_claim_certificate_reminder.letter_recorded', {
        letter_id: row!.letterId,
        person_key: row!.personKey,
        posted_on: row!.postedOn,
      });
      void reply.status(201);
      return letterDto(row!, today());
    },

    /** POST …/certificate-reminders/letters/:letterId/delivery — key (1), multipart. */
    async recordCertificateLetterDelivery(request: FastifyRequest, reply: FastifyReply): Promise<CertificateLetterDto> {
      const ctx = contextOf(request);
      const letterId = (request.params as { letterId: string }).letterId.toLowerCase();
      const actorDisplay = await actorDisplayOf(deps, ctx.actorId);
      const existing = await claim.readCertificateLetter(request.scopeTx!.tx, ctx.pariwarId, ctx.claimCaseId, letterId);
      if (existing === null) throw certificateLetterRefusalError('not_found');
      if (existing.deliveredOn !== null) throw certificateLetterRefusalError('already_delivered');
      const { buffer, mimetype, deliveredOn } = await readLetterScreenshotUpload(request, today(), 'certificate_letter');
      // D6 — the port, the certificate letter's OWN key prefix; put-then-persist, the orphan deleted best-effort on a
      // failure thrown before the commit (6.19b's shape and its deferred COMMIT caveat).
      const storageKey = `pariwar/${ctx.pariwarIdStr}/claim/${ctx.claimCaseIdStr}/certificate-letter/${letterId}/${randomUUID()}`;
      await deps.claimDocumentStorage.put(storageKey, new Uint8Array(buffer), { contentType: mimetype });
      let row: schema.ClaimCertificateReminderLetterRow;
      try {
        row = await inWriteTx(deps, ctx.pariwarIdStr, (client) =>
          claim.recordCertificateLetterDelivery(client, {
            pariwarId: ctx.pariwarId,
            claimCaseId: ctx.claimCaseId,
            letterId,
            deliveredOn,
            screenshotStorageKey: storageKey,
            screenshotContentType: mimetype,
            screenshotSizeBytes: buffer.byteLength,
            actorId: ctx.actorId,
            actorDisplay,
          }),
        );
      } catch (err) {
        if (typeof deps.claimDocumentStorage.delete === 'function') {
          await deps.claimDocumentStorage
            .delete(storageKey)
            .catch((delErr: unknown) => request.log.warn({ err: delErr }, 'certificate-letter screenshot orphan cleanup failed'));
        } else {
          request.log.warn('certificate-letter screenshot orphaned: the storage port has no delete()');
        }
        translateCertificateLetterError(err);
      }
      const dto = letterDto(row!, today());
      auditClaim(deps, request, ctx, 'admin_claim_certificate_reminder.letter_delivery_recorded', {
        letter_id: letterId,
        delivered_on: deliveredOn,
        overdue: dto.overdue,
        byte_size: buffer.byteLength,
        content_type: mimetype,
      });
      void reply.status(201);
      return dto;
    },

    /** GET …/certificate-reminders/letters/address?person_key= — key (1) + a FRESH step-up; one audit line per reveal. */
    async readCertificateLetterAddress(request: FastifyRequest, reply: FastifyReply): Promise<CertificateLetterAddressResponse> {
      const ctx = contextOf(request);
      const { person_key: personKey } = request.query as { person_key: string };
      void reply.header('cache-control', 'no-store');
      let address: claim.CertificateLetterAddress;
      try {
        ({ address } = await claim.assertCertificateLetterAllowed(request.scopeTx!.tx, ctx.pariwarId, ctx.claimCaseId, personKey, {
          crypto: deps.encryption,
        }));
      } catch (err) {
        translateCertificateLetterError(err);
      }
      const plaintext = await decryptClaimContactField(address!.addressCiphertext, ctx.pariwarIdStr, deps.encryption);
      auditClaim(deps, request, ctx, 'admin_claim_certificate_reminder.letter_address_revealed', { person_key: personKey });
      return { person_key: personKey, address: plaintext };
    },

    /** GET …/certificate-reminders/letters/:letterId/screenshot — key (1) + the SAME step-up; a TTL-signed URL. */
    async readCertificateLetterScreenshot(request: FastifyRequest, reply: FastifyReply): Promise<CertificateLetterScreenshotResponse> {
      const ctx = contextOf(request);
      const letterId = (request.params as { letterId: string }).letterId.toLowerCase();
      void reply.header('cache-control', 'no-store');
      const row = await claim.readCertificateLetter(request.scopeTx!.tx, ctx.pariwarId, ctx.claimCaseId, letterId);
      if (row === null || row.screenshotStorageKey === null) {
        throw new NotFoundError('No screenshot is recorded for this letter', 'certificate_letter.no_screenshot');
      }
      const url = await deps.claimDocumentStorage.signedReadUrl(row.screenshotStorageKey, CORRECTION_SCREENSHOT_URL_TTL_SECONDS);
      auditClaim(deps, request, ctx, 'admin_claim_certificate_reminder.letter_screenshot_read', { letter_id: letterId });
      return { url, expires_in_seconds: CORRECTION_SCREENSHOT_URL_TTL_SECONDS };
    },
  };
}
