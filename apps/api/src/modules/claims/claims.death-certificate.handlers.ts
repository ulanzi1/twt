// The District Admin's DEATH-CERTIFICATE REVIEW and its HISTORY — Story 6.21a (Task 4; D1, D4, D9, T10;
// AC1, AC2, AC5).
//
//   · POST …/admin/claims/:claimCaseId/death-certificate/review  — ACCEPT (the District Admin TYPES the date
//     of death) or REJECT (one of three reasons) the claim's CURRENT certificate — `claim.review_death_certificate`
//   · GET  …/admin/claims/:claimCaseId/death-certificate/history — EVERY upload, newest first (including
//     never-reviewed ones), each with its preview and ALL its reviews, the dates and notes DECRYPTED —
//     `claim.verify` (its holders already see the certificate and its OCR date)
//
// `2026-09-20-235` Y: only a certificate with a clear date is acceptable. `2026-09-20-236` BB: a rejection asks
// the family for another WITHOUT the claim being denied — ⛔ no lifecycle state moves (invariant 2).
// ⭐ Encrypt BEFORE the writer (the date and note are Tier-1); decrypt only AFTER the route chain authorized
// the read; every line audited with ids and codes ONLY — ⛔ never the date, ⛔ never the note (T10).
// ⭐ EVERY refusal is audited `_review_rejected` with its reason code — the display-name lookup, the encryption
// and the scope open included (6.20's corrected shape). Mutations audit AFTER the transaction closes.

import { claim as claimDomain, ids, member as memberDomain } from '@twt/domain';
import type {
  DeathCertificateHelplineClaimsResponse,
  DeathCertificateHistoryResponse,
  DeathCertificateReviewRequest,
  DeathCertificateReviewWriteResponse,
  ReadableErasable,
} from '@twt/contracts';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import {
  AdminDisplayNameMissingError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from '../../http-errors.js';
import { getDisplayName } from '../auth/admin/admin-auth.repo.js';
import { emitAuthAudit } from '../auth/shared/audit.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';
import {
  decryptDeathCertificateReviewField,
  encryptDeathCertificateReviewField,
} from './death-certificate-crypto.js';
import { deathDateBlindIndex } from './ground-inspection-crypto.js';

/** D13 — the District Admin's review key (minted in `2026-09-25-244`). */
export const DEATH_CERTIFICATE_REVIEW_KEY = 'claim.review_death_certificate';
/** The history READ key — `claim.verify`, reused (D9): its holders already see the certificate + its OCR date. */
export const DEATH_CERTIFICATE_HISTORY_KEY = 'claim.verify';

/** Short-lived signed-URL TTL — the verifier console's value (the 6.7 300 s precedent). */
const SIGNED_URL_TTL_SECONDS = 300;

/** The history read's per-batch fan-out width — bounds concurrent KMS/storage calls on a claim near the
 * `DEATH_CERTIFICATE_HISTORY_MAX_LIMIT` upload cap, without going back to one-at-a-time. */
const HISTORY_READ_CONCURRENCY = 10;

type Log = FastifyRequest['log'];

function scopeOf(request: FastifyRequest) {
  const scopeTx = request.scopeTx;
  const actorId = request.requestContext.actorId;
  if (!scopeTx || !actorId)
    throw new UnauthorizedError('Authentication required', 'auth.session_required');
  return { scopeTx, actorId, pariwarId: ids.pariwarId(scopeTx.pariwarId) };
}

async function resolveDisplay(deps: AppDeps, actorId: string): Promise<string> {
  const display = await getDisplayName(deps.pool, actorId);
  if (display == null || display.trim() === '') throw new AdminDisplayNameMissingError(actorId);
  return display;
}

const locator = (claimCaseId: string) => `claim:${claimCaseId.toLowerCase()}`;

/**
 * Decrypt one Tier-1 field for an authorized surface: a failure or an empty decrypt is `unreadable`; the RTBF
 * sentinel is `anonymized` (`2026-09-26-246` §2 — erased is permanent, ⛔ not a fault). ⚠ The sentinel DECRYPTS
 * cleanly (`anonymizeMember` writes it as an ordinary envelope), so it must be named here — shown as a value,
 * `[anonymized]` would read as the accepted date of death.
 */
async function readable(
  decrypt: () => Promise<string>,
  log: Log,
  what: string,
  claimCaseId: string,
): Promise<ReadableErasable> {
  try {
    const value = await decrypt();
    if (value === '') return { state: 'unreadable' };
    if (value === memberDomain.ANONYMIZED_SENTINEL) return { state: 'anonymized' };
    return { state: 'readable', value };
  } catch (err) {
    // ⚠ The class name only — ⛔ never the ciphertext or a fragment of a decrypt.
    log.warn(
      { err: err instanceof Error ? err.name : 'unknown', what, claimCaseId },
      'death-certificate: decrypt failed; unreadable',
    );
    return { state: 'unreadable' };
  }
}

/** Map a review refusal onto HTTP: `death_certificate_review.<reason>` 409, ⛔ never a 500 for a guard the writer owns. */
function translateReview(err: unknown): never {
  if (err instanceof claimDomain.DeathCertificateReviewRefusedError) {
    if (err.reason === 'not_found')
      throw new NotFoundError('Claim not found', 'death_certificate_review.not_found');
    throw new ConflictError(
      'The death-certificate review was refused',
      `death_certificate_review.${err.reason}`,
    );
  }
  if (err instanceof claimDomain.ClaimStreamConcurrencyError) {
    throw new ConflictError(
      'The claim changed while the review was being recorded — please try again',
      'death_certificate_review.concurrent',
    );
  }
  throw err;
}

/** The bounded reason code a refused review is audited with — ⛔ never a message with data in it. Kept in
 * lockstep with `translateReview`'s wire-code mapping so the audit trail matches what the client actually saw. */
function auditReason(err: unknown): string {
  if (err instanceof claimDomain.DeathCertificateReviewRefusedError) return err.reason;
  if (err instanceof claimDomain.ClaimStreamConcurrencyError) return 'concurrent';
  return err instanceof Error ? err.name : 'unknown';
}

/** Best-effort audit emit: a failed audit write must ⛔ never turn an already-committed review into a 500 for
 * the client, or an already-refused review into a masked 500. Logged, not thrown. */
function emitAuthAuditBestEffort(
  deps: AppDeps,
  request: FastifyRequest,
  type: Parameters<typeof emitAuthAudit>[2],
  fields?: Parameters<typeof emitAuthAudit>[3],
): void {
  try {
    emitAuthAudit(deps, request, type, fields);
  } catch (err) {
    request.log.error(
      { err: err instanceof Error ? err.name : 'unknown' },
      'death-certificate: audit emit failed',
    );
  }
}

export function createDeathCertificateHandlers(deps: AppDeps) {
  const enc = deps.encryption;

  return {
    /** POST — the District Admin's accept / reject review. The writer VALIDATES; it ⛔ never decides. */
    async postReview(
      request: FastifyRequest,
      reply: FastifyReply,
    ): Promise<DeathCertificateReviewWriteResponse> {
      const { scopeTx: outer, actorId } = scopeOf(request);
      const { claimCaseId } = request.params as { claimCaseId: string };
      const body = request.body as DeathCertificateReviewRequest;
      const p = outer.pariwarId;

      let result: Awaited<ReturnType<typeof claimDomain.recordDeathCertificateReview>> | undefined;
      let failure: unknown;
      try {
        const actorDisplay = await resolveDisplay(deps, actorId);
        // The contract is deliberately LOOSE on `note` (⛔ no `.min(1)`, so a real empty note still reaches
        // AC1's audited refusal). An empty PLAINTEXT note is caught HERE, before it is ever encrypted: the
        // domain writer only ever sees ciphertext (T10), and an empty plaintext does ⛔ not encrypt to empty
        // ciphertext — the writer's OWN ciphertext-emptiness check is a backstop for a caller that forgot to
        // encrypt, not this. Thrown as the writer's own error type so it flows through the SAME translate +
        // audit path below, in the writer's own guard order (missing_display, then missing_note).
        if (body.note.trim() === '') {
          throw new claimDomain.DeathCertificateReviewRefusedError(
            claimCaseId,
            'missing_note',
            'a note is required',
          );
        }
        const [noteCt, dateCt, dateIndex] = await Promise.all([
          encryptDeathCertificateReviewField(body.note, p, enc),
          body.accepted_date !== undefined
            ? encryptDeathCertificateReviewField(body.accepted_date, p, enc)
            : Promise.resolve(null),
          // ⭐ Story 6.26b (GI6; RD12; Trap 1) — the accepted date's keyed index, through the ONE helper under the ONE
          // shared field class (⛔ never a second `blindIndex(` call, ⛔ never a literal class), from the SAME
          // regex-checked plaintext — so the warning module can compare it with the inspection's ⛔ without a decrypt.
          body.accepted_date !== undefined ? deathDateBlindIndex(body.accepted_date, p, enc) : Promise.resolve(null),
        ]);
        const scopeTx = await openScopeTx(deps, p);
        let ok = false;
        try {
          result = await claimDomain.recordDeathCertificateReview(scopeTx.client, {
            claimCaseId: ids.claimId(claimCaseId),
            pariwarId: ids.pariwarId(p),
            verdict: body.verdict,
            certificateToken: body.certificate_token,
            acceptedDate: body.accepted_date ?? null,
            acceptedDateCiphertext: dateCt,
            acceptedDateIndex: dateIndex,
            // Story 6.26b (GI8) — required on an accept, refused on a reject: the WRITER's two 409s.
            registerCheck: body.register_check ?? null,
            rejectionReason: body.rejection_reason ?? null,
            noteCiphertext: noteCt,
            expectedLiveReviewId: body.expected_live_review_id,
            actorId,
            actorDisplay,
            actor: 'operator',
          });
          ok = true;
        } finally {
          await closeScopeTx(scopeTx, ok);
        }
      } catch (err) {
        failure = err;
      }

      if (failure !== undefined || result === undefined) {
        emitAuthAuditBestEffort(deps, request, 'admin_claim.death_certificate_review_rejected', {
          actorId,
          pariwarId: p,
          resourceLocator: locator(claimCaseId),
          context: {
            claim_case_id: claimCaseId,
            // ⚠ Client-echoed, ⛔ NOT domain-confirmed (nothing was recorded) — ⛔ never `upload_id`, the
            // name the success line reserves for `result.uploadId`'s server-confirmed value below.
            certificate_token: body.certificate_token.toLowerCase(),
            verdict: body.verdict,
            reason: auditReason(failure),
          },
        });
        return translateReview(failure);
      }
      // The write COMMITTED — audited as recorded BEFORE anything else can fail. ⛔ No date, ⛔ no note.
      // `result.uploadId` is the domain-confirmed upload the review actually landed against — ⛔ not the
      // client-echoed `body.certificate_token` (they're required to match, but this is the audited one).
      emitAuthAuditBestEffort(deps, request, 'admin_claim.death_certificate_reviewed', {
        actorId,
        pariwarId: p,
        resourceLocator: locator(claimCaseId),
        context: {
          claim_case_id: claimCaseId,
          review_id: result.reviewId,
          upload_id: result.uploadId,
          verdict: result.verdict,
          rejection_reason: body.verdict === 'rejected' ? (body.rejection_reason ?? null) : null,
          // Story 6.26b (RD17; GI14's posture) — a plaintext non-PII code. ⛔ Never the date or its index.
          register_check: body.verdict === 'accepted' ? (body.register_check ?? null) : null,
          superseded_review_id: result.supersededReviewId,
        },
      });
      void reply.status(201);
      return {
        claim_case_id: claimCaseId,
        review_id: result.reviewId,
        verdict: result.verdict,
        superseded_review_id: result.supersededReviewId,
        supersession_reason: result.supersessionReason,
        event_version: result.eventVersion,
      };
    },

    /**
     * GET — the HISTORY: every upload (kept for as long as claim records are kept, `-243`), newest first, each
     * with its preview and every review, the accepted dates and notes DECRYPTED. ⭐ Tier-1 shipped with ⛔ no
     * reader is a defect — this is the notes' reader. Decrypt-after-authorize; ONE audit line, ids only.
     */
    async getHistory(request: FastifyRequest): Promise<DeathCertificateHistoryResponse> {
      const { scopeTx, actorId, pariwarId } = scopeOf(request);
      const { claimCaseId } = request.params as { claimCaseId: string };
      const cid = ids.claimId(claimCaseId);
      const claimRow = await claimDomain.getClaimCase(scopeTx.tx, pariwarId, cid);
      if (!claimRow) throw new NotFoundError('Claim not found', 'claim.not_found');
      const p = scopeTx.pariwarId;
      const log = request.log;

      const history = await claimDomain.listDeathCertificateHistory(scopeTx.tx, pariwarId, cid);

      // Batch every decrypt and every signed-URL lookup, BOUNDED to `HISTORY_READ_CONCURRENCY` uploads at a
      // time — a claim near the 100-upload cap must ⛔ not fire a hundred-wide burst of concurrent KMS/storage
      // calls in one instant (a thundering herd), while still beating the original one-at-a-time loop.
      const uploads: Array<Awaited<ReturnType<typeof processUpload>>> = [];
      for (let i = 0; i < history.uploads.length; i += HISTORY_READ_CONCURRENCY) {
        const batch = history.uploads.slice(i, i + HISTORY_READ_CONCURRENCY);
        uploads.push(...(await Promise.all(batch.map((u) => processUpload(u)))));
      }
      async function processUpload(u: (typeof history.uploads)[number]) {
        const [signedUrl, reviews] = await Promise.all([
          // A storage failure on ONE upload's preview ⛔ never fails the whole history read.
          deps.claimDocumentStorage
            .signedReadUrl(u.storageObjectKey, SIGNED_URL_TTL_SECONDS)
            .catch((err: unknown) => {
              log.warn(
                {
                  err: err instanceof Error ? err.name : 'unknown',
                  uploadId: u.uploadId,
                  claimCaseId,
                },
                'death-certificate: signed-URL lookup failed; preview unavailable',
              );
              return null;
            }),
          Promise.all(
            u.reviews.map(async (r) => ({
              review_id: r.reviewId,
              verdict: r.verdict,
              rejection_reason: r.rejectionReason,
              // Story 6.26b (GI8) — `null` on a rejected review AND on an accepted one recorded before 6.26b.
              register_check: r.registerCheck ?? null,
              accepted_date:
                r.acceptedDateCiphertext === null
                  ? null
                  : await readable(
                      () => decryptDeathCertificateReviewField(r.acceptedDateCiphertext!, p, enc),
                      log,
                      'accepted_date',
                      claimCaseId,
                    ),
              note: await readable(
                () => decryptDeathCertificateReviewField(r.noteCiphertext, p, enc),
                log,
                'review_note',
                claimCaseId,
              ),
              decided_by_display: r.decidedByDisplay,
              decided_at: r.decidedAt.toISOString(),
              superseded_at: r.supersededAt?.toISOString() ?? null,
              superseded_reason: r.supersededReason,
            })),
          ),
        ]);
        return {
          upload_id: u.uploadId,
          channel: u.channel,
          uploaded_at: u.uploadedAt.toISOString(),
          current: u.current,
          preview: { signed_url: signedUrl, content_type: u.contentType },
          reviews,
        };
      }
      const reviewCount = uploads.reduce((n, u) => n + u.reviews.length, 0);

      // ⭐ Records WHO opened the certificates' dates and notes and ON WHICH CLAIM — ⛔ never the values.
      emitAuthAuditBestEffort(deps, request, 'admin_death_certificate.history_read', {
        actorId,
        pariwarId: p,
        resourceLocator: locator(claimCaseId),
        context: {
          claim_case_id: claimCaseId,
          upload_count: uploads.length,
          review_count: reviewCount,
        },
      });

      return { claim_case_id: claimCaseId, uploads, truncated: history.truncated };
    },

    /**
     * GET …/admin/members/:memberId/death-certificate/claims — Story 6.21b (D5). The SELECTED
     * deceased member's live claims, each with the SAME D1 status the family sees, from the SAME
     * resolver (BW-J5 — one server-side source of truth). ⛔ No `certificate_token` on the wire here:
     * the in-flight marker is a member-app-only concept. Bounded by `listLiveClaimsForDeceasedMember`'s
     * own `.limit(10)` — ⛔ a second query is never written.
     *
     * ⚠ DELIBERATE — ⛔ no server-side read-back gate. Any `claim.file` holder at the Pariwar may list any
     * member's live claims here; the caller's identity read-back is the helpline page's SCRIPT, enforced
     * client-side only (D5: "⚠ client-side only"), as `<HelplineNomineeCorrection>`'s raisable-claims read
     * already is. Acceptable because the response is ids + status codes, ⛔ no PII and ⛔ no token.
     * Re-examine if this response ever carries more than ids and status codes, or if a server-side
     * "caller verified" session fact is introduced.
     */
    async getClaimsForMember(
      request: FastifyRequest,
    ): Promise<DeathCertificateHelplineClaimsResponse> {
      const { scopeTx, actorId, pariwarId } = scopeOf(request);
      const { memberId } = request.params as { memberId: string };
      const memberIdBrand = ids.memberId(memberId);
      const liveClaims = await claimDomain.listLiveClaimsForDeceasedMember(scopeTx.tx, pariwarId, memberIdBrand);
      const claims = await Promise.all(
        liveClaims.map(async (c) => {
          const result = await claimDomain.readDeathCertificateFamilyStatus(
            scopeTx.tx,
            pariwarId,
            c.claimCaseId,
            c.currentState,
          );
          return {
            claim_case_id: c.claimCaseId,
            claim_state: c.currentState,
            created_at: c.createdAt.toISOString(),
            status: result.status,
            replacement_reason: result.replacementReason,
            upload_allowed: result.uploadAllowed,
            reassurance: result.reassurance,
          };
        }),
      );
      emitAuthAuditBestEffort(deps, request, 'admin_death_certificate.claims_read', {
        actorId,
        pariwarId: scopeTx.pariwarId,
        resourceLocator: `member:${memberIdBrand}`,
        context: {
          // The BRANDED (lower-cased) id — the same spelling as the locator, so a join on either finds it.
          member_id: memberIdBrand,
          claim_count: claims.length,
          statuses: claims.map((c) => c.status),
        },
      });
      return { member_id: memberId, claims };
    },
  };
}
