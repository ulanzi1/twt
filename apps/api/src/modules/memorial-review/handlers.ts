// The Trust's review of the family memorial — ADMIN handlers (Story 11b.4 — AC9 / MA6 / MA7 / MA16 / Trap 8;
// `#decision-2026-10-24-398`). Gated by `memorial.review` (pariwar dimension — `trustee_panel` + derived `super_admin`).
//
// ⛔ There is ⛔ no edit: the decision input is `.strict()` with ⛔ no field that carries the family's text (AC6). The reviewer
// approves, leaves parts out (spans into the VERBATIM text, each with one of four reasons), or says no; and may withdraw the
// Trust's own approval (MA16). Trap 8 — every refusal inside a Pariwar the reviewer holds is the ONE neutral
// `404 memorial_review.not_found` with a byte-identical body, checked scope-first, PER ROUTE (see `memorial/review.ts`).
// A staff user with ⛔ grant in `:pariwarId` gets the scope middleware's `404 pariwar.not_found` before this runs.
//
// The writes: the decision is validated against the version's DECRYPTED words BEFORE the lock (⛔ KMS while holding it —
// footguns #56(b)); the pending re-check is repeated UNDER the lock, so a race lands on the neutral 404. The scope tx
// commits inside `withCompensatingAudit`'s `mutate` — ⛔ `request.scopeTx`, which commits in `onSend` after the audit.

import { createHash } from 'node:crypto';

import {
  MEMORIAL_PHOTO_URL_TTL_SECONDS,
  validateMemorialDecision,
  type MemorialReviewDecisionInput,
  type MemorialReviewDecisionResponse,
  type MemorialReviewDetailResponse,
  type MemorialReviewListResponse,
  type MemorialReviewVersion,
  type MemorialWithdrawApprovalInput,
  type MemorialWithdrawApprovalResponse,
} from '@twt/contracts';
import { audit, canonicalJsonStringify, clampLimit, ids, kyc as kycDomain, member as memberDomain, memorial } from '@twt/domain';
import type { FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import { AdminDisplayNameMissingError, BadRequestError, NotFoundError, UnauthorizedError } from '../../http-errors.js';
import { getDisplayName } from '../auth/admin/admin-auth.repo.js';
import { emitAuthAudit } from '../auth/shared/audit.js';
import { decryptKycField } from '../kyc/kyc-crypto.js';
import { normalisePublicName } from '../kyc/name-render.js';
import { decryptMemorialField, encryptMemorialField } from '../memorial/memorial-crypto.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';

export const MEMORIAL_REVIEW_DECIDE_ACTION = 'memorial.review.decide';
export const MEMORIAL_REVIEW_WITHDRAW_APPROVAL_ACTION = 'memorial.review.withdraw_approval';

const LIST_LIMIT = { default: 50, cap: 200 } as const;

/** The ONE neutral review 404 (Trap 8) — identical message and code for every refusal in a route's set. */
function reviewNotFound(): NotFoundError {
  return new NotFoundError('Not found', 'memorial_review.not_found');
}

function sha256Hex(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export function createMemorialReviewHandlers(deps: AppDeps) {
  function staffCtx(request: FastifyRequest): { actorId: string; pariwarIdStr: string } {
    const actorId = request.requestContext.actorId;
    const pariwarIdStr = request.requestContext.pariwarId;
    if (!actorId || !pariwarIdStr) throw new UnauthorizedError('Authentication required', 'auth.session_required');
    return { actorId, pariwarIdStr };
  }

  /** The reviewer's display-name SNAPSHOT — fail-closed, ⛔ an email-derived fallback. */
  async function reviewerDisplay(actorId: string): Promise<string> {
    const display = await getDisplayName(deps.pool, actorId);
    if (!display) throw new AdminDisplayNameMissingError(actorId);
    return display;
  }

  /** The deceased's name for STAFF (the stored name, normalised) — ⛔ the erasure sentinel; a failure ⇒ `null`. */
  async function staffName(request: FastifyRequest, pariwarIdStr: string, ciphertext: string | null): Promise<string | null> {
    if (ciphertext === null) return null;
    try {
      const stored = await decryptKycField(ciphertext, pariwarIdStr, deps.encryption);
      return stored === memberDomain.ANONYMIZED_SENTINEL ? null : normalisePublicName(stored);
    } catch (err) {
      request.log.warn({ errorName: err instanceof Error ? err.name : typeof err }, 'memorial-review: name decrypt failed');
      return null;
    }
  }

  async function signedUrl(
    request: FastifyRequest,
    who: { actorId: string; pariwarIdStr: string },
    submissionId: string,
    key: string,
  ): Promise<string | null> {
    try {
      const url = await deps.memorialPhotoStorage.signedReadUrl(key, MEMORIAL_PHOTO_URL_TTL_SECONDS);
      emitAuthAudit(deps, request, 'memorial.photo.url', {
        actorId: who.actorId,
        pariwarId: who.pariwarIdStr,
        context: { submission_id: submissionId, viewer: 'reviewer' },
        resourceLocator: `memorial:${submissionId}`,
      });
      return url;
    } catch (err) {
      request.log.warn({ err, submissionId }, 'memorial-review: photo url failed');
      return null;
    }
  }

  /** Read a submission's chain (scope-first: ⛔ in this Pariwar ⇒ `null`). Read-only scope tx. */
  async function readChainFor(pariwarIdStr: string, submissionId: string) {
    const pariwarId = ids.pariwarId(pariwarIdStr);
    const tx = await openScopeTx(deps, pariwarIdStr);
    let ok = false;
    try {
      const at = await memorial.readMemorialSubmissionPool(tx.tx, { pariwarId, submissionId });
      if (at === null) {
        ok = true;
        return null;
      }
      const chain = await memorial.readMemorialChain(tx.tx, { pariwarId, poolId: at.poolId });
      const nameCiphertext = (await kycDomain.getMemberKycProfile(tx.tx, pariwarId, at.deceasedMemberId))?.nameCiphertext ?? null;
      ok = true;
      return { at, chain, nameCiphertext };
    } finally {
      await closeScopeTx(tx, ok);
    }
  }

  return {
    /**
     * GET /api/v1/p/:pariwarId/memorial-reviews[?view=decided&limit=&offset=] — chain heads, no body; `pending` oldest
     * (sent) first, `decided` most recently DECIDED first (the head's decision / withdrawal time — review T7), paged by
     * `offset` with `hasMore`.
     */
    async list(request: FastifyRequest): Promise<MemorialReviewListResponse> {
      const who = staffCtx(request);
      const q = request.query as { view?: 'pending' | 'decided'; limit?: number; offset?: number };
      const view = q.view ?? 'pending';
      const pariwarId = ids.pariwarId(who.pariwarIdStr);
      const tx = await openScopeTx(deps, who.pariwarIdStr);
      let ok = false;
      let rows: memorial.MemorialReviewQueueRow[];
      let hasMore: boolean;
      const names = new Map<string, string | null>();
      try {
        ({ rows, hasMore } = await memorial.listMemorialReviewQueue(tx.tx, {
          pariwarId,
          view,
          limit: clampLimit(q.limit, LIST_LIMIT),
          offset: q.offset ?? 0,
        }));
        for (const r of rows) {
          if (!names.has(r.deceasedMemberId)) {
            names.set(r.deceasedMemberId, (await kycDomain.getMemberKycProfile(tx.tx, pariwarId, r.deceasedMemberId))?.nameCiphertext ?? null);
          }
        }
        ok = true;
      } finally {
        await closeScopeTx(tx, ok);
      }
      const resolved = new Map<string, string | null>();
      let decrypted = 0;
      for (const [memberId, ct] of names) {
        if (ct !== null) decrypted += 1;
        resolved.set(memberId, await staffName(request, who.pariwarIdStr, ct));
      }
      // ONE `memorial.review.read` line per page for its name decrypts (MA11).
      emitAuthAudit(deps, request, 'memorial.review.read', {
        actorId: who.actorId,
        pariwarId: who.pariwarIdStr,
        context: { view, rows: rows.length, offset: q.offset ?? 0, fields_decrypted: decrypted },
        resourceLocator: 'memorial-review:list',
      });
      return {
        items: rows.map((r) => ({
          submissionId: r.submissionId,
          deceasedName: resolved.get(r.deceasedMemberId) ?? null,
          sentAt: r.createdAt.toISOString(),
          // The time the decided view is ordered by (review V12 — T7 sorted by a time the table never showed); `null` pending.
          decidedAt: r.decidedAt === null ? null : r.decidedAt.toISOString(),
          memorialState: memorial.deriveMemorialStatus({
            decision: r.action === null ? null : { action: r.action },
            withdrawal: r.withdrawnBy === null ? null : { withdrawnBy: r.withdrawnBy, reasonCode: null },
          }),
        })),
        hasMore,
      };
    },

    /** GET …/memorial-reviews/:submissionId — the version AND its whole chain (the history view). */
    async detail(request: FastifyRequest): Promise<MemorialReviewDetailResponse> {
      const who = staffCtx(request);
      const { submissionId } = request.params as { submissionId: string };
      const read = await readChainFor(who.pariwarIdStr, submissionId);
      if (read === null) throw reviewNotFound();
      const { chain, nameCiphertext } = read;
      if (memorial.memorialReviewTargetIndex(chain, submissionId, 'detail') === null) throw reviewNotFound();

      let decrypted = 0;
      const dec = async (ct: string | null): Promise<{ value: string | null; failed: boolean }> => {
        if (ct === null) return { value: null, failed: false };
        try {
          const value = await decryptMemorialField(ct, who.pariwarIdStr, deps.encryption);
          decrypted += 1;
          return { value, failed: false };
        } catch (err) {
          request.log.warn({ errorName: err instanceof Error ? err.name : typeof err }, 'memorial-review: decrypt failed');
          return { value: null, failed: true };
        }
      };
      const versions: MemorialReviewVersion[] = [];
      for (const link of chain) {
        const s = link.submission;
        const body = await dec(s.bodyCiphertext);
        const alt = await dec(s.altTextCiphertext);
        const decisionNote = await dec(link.decision?.internalNoteCiphertext ?? null);
        const withdrawalNote = await dec(link.withdrawal?.internalNoteCiphertext ?? null);
        versions.push({
          submissionId: s.submissionId,
          sentAt: s.createdAt.toISOString(),
          body: body.value,
          altText: alt.value,
          unavailable: body.failed || alt.failed ? memorial.MEMORIAL_UNAVAILABLE_NOW : null,
          hasPhoto: s.photoObjectKey !== null,
          photoUrl: s.photoObjectKey === null ? null : await signedUrl(request, who, s.submissionId, s.photoObjectKey),
          authorisationCopyVersion: s.authorisationCopyVersion,
          authorisationLocale: s.authorisationLocale,
          handoverRecipient: s.handoverRecipient,
          decision:
            link.decision === null
              ? null
              : {
                  action: link.decision.action,
                  omissions: link.decision.omissions.map((o) => ({ field: o.field, start: o.start, end: o.end, reason: o.reason })),
                  photoLeftOutReason: link.decision.photoLeftOutReason,
                  reasonCode: link.decision.reasonCode,
                  internalNote: decisionNote.value,
                  actorDisplay: link.decision.actorDisplay,
                  decidedAt: link.decision.decidedAt.toISOString(),
                },
          withdrawal:
            link.withdrawal === null
              ? null
              : {
                  withdrawnBy: link.withdrawal.withdrawnBy,
                  reasonCode: link.withdrawal.reasonCode,
                  internalNote: withdrawalNote.value,
                  actorDisplay: link.withdrawal.actorDisplay,
                  withdrawnAt: link.withdrawal.withdrawnAt.toISOString(),
                },
        });
      }
      const deceasedName = await staffName(request, who.pariwarIdStr, nameCiphertext);
      if (nameCiphertext !== null) decrypted += 1;
      emitAuthAudit(deps, request, 'memorial.review.read', {
        actorId: who.actorId,
        pariwarId: who.pariwarIdStr,
        context: { submission_id: submissionId, versions: chain.length, fields_decrypted: decrypted },
        resourceLocator: `memorial:${submissionId}`,
      });
      // MA16 — the chain's withdraw target is named from ANY version opened: with v1 approved and v2 pending / declined the
      // head is what the queue links to, and v1 is the version the Trust withdraws (`withdraw-approval` validates it).
      const withdrawApprovalTargetId = memorial.memorialWithdrawApprovalTargetId(chain);
      return {
        submissionId,
        deceasedName,
        memorialState: memorial.memorialChainState(chain),
        chain: versions,
        canDecide: memorial.memorialReviewTargetIndex(chain, submissionId, 'decision') !== null,
        canWithdrawApproval: withdrawApprovalTargetId !== null,
        withdrawApprovalTargetId,
      };
    },

    /** POST …/memorial-reviews/:submissionId/decision — ONE decision per version (MA6). */
    async decide(request: FastifyRequest): Promise<MemorialReviewDecisionResponse> {
      const who = staffCtx(request);
      const { submissionId } = request.params as { submissionId: string };
      const input = request.body as MemorialReviewDecisionInput;
      const pariwarId = ids.pariwarId(who.pariwarIdStr);

      // (1) Scope / existence / pending (404) — then the offsets against the words (400): a range 400 is reachable only
      //     for a version the reviewer may see.
      const read = await readChainFor(who.pariwarIdStr, submissionId);
      if (read === null) throw reviewNotFound();
      const index = memorial.memorialReviewTargetIndex(read.chain, submissionId, 'decision');
      if (index === null) throw reviewNotFound();
      const target = read.chain[index]!.submission;
      const body = await decryptMemorialField(target.bodyCiphertext, who.pariwarIdStr, deps.encryption);
      const altText =
        target.altTextCiphertext === null ? null : await decryptMemorialField(target.altTextCiphertext, who.pariwarIdStr, deps.encryption);
      const verdict = validateMemorialDecision(input, { body, altText, hasPhoto: target.photoObjectKey !== null });
      if (!verdict.ok) {
        throw new BadRequestError('The parts left out are not valid', 'memorial_review.invalid_omissions', { problem: verdict.problem });
      }

      // (2) Attribution + the note's ciphertext — before the lock.
      const display = await reviewerDisplay(who.actorId);
      const noteCiphertext =
        input.internalNote === undefined ? null : await encryptMemorialField(input.internalNote, who.pariwarIdStr, deps.encryption);
      const omissions = input.omissions ?? [];

      await audit.withCompensatingAudit(deps.servicePool, {
        auditIntent: {
          pariwarId,
          actorId: who.actorId,
          actorRole: null,
          action: MEMORIAL_REVIEW_DECIDE_ACTION,
          resourceLocator: `memorial:${submissionId}`,
          requestPayloadHash: sha256Hex(
            canonicalJsonStringify({
              submission_id: submissionId,
              action: input.action,
              omissions,
              photo_left_out_reason: input.photoLeftOut?.reason ?? null,
              reason_code: input.reasonCode ?? null,
              has_internal_note: noteCiphertext !== null,
            }),
          ),
          traceId: request.requestContext.traceId ?? null,
        },
        mutate: async () => {
          const tx = await openScopeTx(deps, who.pariwarIdStr);
          let txOk = false;
          try {
            await memorial.lockMemorialPool(tx.tx, read.at.poolId);
            const chain = await memorial.readMemorialChain(tx.tx, { pariwarId, poolId: read.at.poolId });
            if (memorial.memorialReviewTargetIndex(chain, submissionId, 'decision') === null) throw reviewNotFound();
            await memorial.insertMemorialDecision(tx.tx, {
              submissionId,
              pariwarId,
              action: input.action,
              omissions: omissions.map((o) => ({ field: o.field, start: o.start, end: o.end, reason: o.reason })),
              photoLeftOutReason: input.photoLeftOut?.reason ?? null,
              reasonCode: input.reasonCode ?? null,
              internalNoteCiphertext: noteCiphertext,
              actorId: who.actorId,
              actorDisplay: display,
            });
            txOk = true;
          } finally {
            await closeScopeTx(tx, txOk);
          }
        },
      });
      return { submissionId, memorialState: input.action };
    },

    /** POST …/memorial-reviews/:submissionId/withdraw-approval — the Trust withdraws its own approval (MA16). */
    async withdrawApproval(request: FastifyRequest): Promise<MemorialWithdrawApprovalResponse> {
      const who = staffCtx(request);
      const { submissionId } = request.params as { submissionId: string };
      const input = request.body as MemorialWithdrawApprovalInput;
      const pariwarId = ids.pariwarId(who.pariwarIdStr);

      const read = await readChainFor(who.pariwarIdStr, submissionId);
      if (read === null) throw reviewNotFound();
      if (memorial.memorialReviewTargetIndex(read.chain, submissionId, 'withdraw_approval') === null) throw reviewNotFound();
      const display = await reviewerDisplay(who.actorId);
      const noteCiphertext =
        input.internalNote === undefined ? null : await encryptMemorialField(input.internalNote, who.pariwarIdStr, deps.encryption);

      await audit.withCompensatingAudit(deps.servicePool, {
        auditIntent: {
          pariwarId,
          actorId: who.actorId,
          actorRole: null,
          action: MEMORIAL_REVIEW_WITHDRAW_APPROVAL_ACTION,
          resourceLocator: `memorial:${submissionId}`,
          requestPayloadHash: sha256Hex(
            canonicalJsonStringify({ submission_id: submissionId, reason_code: input.reasonCode, has_internal_note: noteCiphertext !== null }),
          ),
          traceId: request.requestContext.traceId ?? null,
        },
        mutate: async () => {
          const tx = await openScopeTx(deps, who.pariwarIdStr);
          let txOk = false;
          try {
            await memorial.lockMemorialPool(tx.tx, read.at.poolId);
            const chain = await memorial.readMemorialChain(tx.tx, { pariwarId, poolId: read.at.poolId });
            if (memorial.memorialReviewTargetIndex(chain, submissionId, 'withdraw_approval') === null) throw reviewNotFound();
            await memorial.insertMemorialWithdrawal(tx.tx, {
              submissionId,
              pariwarId,
              withdrawnBy: 'trust',
              reasonCode: input.reasonCode,
              internalNoteCiphertext: noteCiphertext,
              actorId: who.actorId,
              actorDisplay: display,
            });
            txOk = true;
          } finally {
            await closeScopeTx(tx, txOk);
          }
        },
      });
      return { submissionId, memorialState: 'approval_withdrawn' };
    },
  };
}
