// The helpline's take-down of a family memorial at the nominee's request — ADMIN handlers (Story 11b.4a, Task 7.2;
// `#decision-2026-10-27-412` MP6–MP9, MP12, MP14; `-392` item 4, `-393` M1 / M4, `-395` item 3, `-411` items 1, 4).
// Gated by `memorial.takedown` (pariwar dimension — `helpline_operator` + derived `super_admin`). ⛔ These routes do ⛔ not obey the
// memorial switch (MP13): a take-down must stay possible with the lever off (the review routes' precedent).
//
// ⭐ ONLY THE NOMINEE WHO SENT IT (`-395` item 3, `-411` item 1): the drive view shows the nominee recorded on the SHOWN version —
// the operator calls THAT number back (MP7) and only then records the request (`calledBack: true`). ⛔ No note, ⛔ no reason: the
// operator records THAT the nominee asked, ⛔ not why (`-393` (ii) — ⛔ no merit test).
// ⭐ THE WRITES commit their OWN scope tx inside `withCompensatingAudit`'s `mutate` (the memorial-review shape), under the pool
// lock; the `Idempotency-Key` result is recorded AFTER that commit ([[project_idempotent_write_handler_shape]]). ⛔ No KMS call
// while the lock is held: the drive view decrypts AFTER its read transaction.
// ⭐ ERASED ⇒ INVISIBLE (Trap 4): an erased member's memorial is ⛔ never listed and its drive is the neutral 404.
// The word "immediately" is ⛔ never used about a take-down (Trap 11 — it leaves the page within about 5 minutes once an edge
// cache exists).

import { createHash } from 'node:crypto';

import {
  MEMORIAL_PHOTO_URL_TTL_SECONDS,
  type MemorialKinshipEntry,
  type MemorialKinshipRelation,
  type MemorialTakedownDriveResponse,
  type MemorialTakedownMemberDrivesResponse,
  type MemorialTakedownOpenRequestsResponse,
  type MemorialTakedownOutcomeInput,
  type MemorialTakedownOutcomeResponse,
  type MemorialTakedownRequestInput,
  type MemorialTakedownRequestResponse,
  type MemorialTakedownRequestView,
} from '@twt/contracts';
import { audit, canonicalJsonStringify, idempotency, ids, member as memberDomain, memorial } from '@twt/domain';
import type { FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import {
  AdminDisplayNameMissingError,
  BadRequestError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from '../../http-errors.js';
import { getDisplayName } from '../auth/admin/admin-auth.repo.js';
import { emitAuthAudit } from '../auth/shared/audit.js';
import { decryptMemorialField } from '../memorial/memorial-crypto.js';
import { parseMemorialKinship } from '../memorial/memorial-kinship.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';
import { decryptNomineeField } from '../nominee/nominee-crypto.js';
import { publicMemorialKinship, publicMemorialText } from '../public-pages/memorial-public-text.js';

export const MEMORIAL_TAKEDOWN_REQUEST_RECORD_ACTION = 'memorial.takedown.request_record';
export const MEMORIAL_TAKEDOWN_DECIDE_ACTION = 'memorial.takedown.decide';

/** The admin-write idempotency window (the drive-target / feature-flag precedent). */
const IDEMPOTENCY_TTL_SECONDS = 24 * 60 * 60;
/** MP14 (b) — how far back the nominee's first contact may be entered (0187's CHECK is the backstop). */
const FIRST_CONTACT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function sha256Hex(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

/** The ONE neutral 404 (an erased memorial, a drive with ⛔ no shown memorial, an unknown request). */
function takedownNotFound(): NotFoundError {
  return new NotFoundError('Not found', 'memorial_takedown.not_found');
}

/** A Postgres CHECK violation (drizzle wraps the pg error). */
function isCheckViolation(err: unknown): boolean {
  if (err === null || typeof err !== 'object') return false;
  return (err as { code?: unknown }).code === '23514' || (err as { cause?: { code?: unknown } }).cause?.code === '23514';
}

export function createMemorialTakedownHandlers(deps: AppDeps) {
  const idempotencyStore = idempotency.createKeyedStore(deps.pool);

  function staffCtx(request: FastifyRequest): { actorId: string; pariwarIdStr: string } {
    const actorId = request.requestContext.actorId;
    const pariwarIdStr = request.requestContext.pariwarId;
    if (!actorId || !pariwarIdStr) throw new UnauthorizedError('Authentication required', 'auth.session_required');
    return { actorId, pariwarIdStr };
  }

  /** The operator's display-name SNAPSHOT — fail-closed, ⛔ never an email-derived fallback ([[project_admin_display_name_attribution]]). */
  async function operatorDisplay(actorId: string): Promise<string> {
    const display = await getDisplayName(deps.pool, actorId);
    if (!display) throw new AdminDisplayNameMissingError(actorId);
    return display;
  }

  /** `Idempotency-Key` (opt-in) — claim, run (which COMMITS), then record; a failure releases the key. */
  async function withIdempotency<T>(request: FastifyRequest, namespace: string, run: () => Promise<T>): Promise<T> {
    const headerKey = request.headers['idempotency-key'];
    if (Array.isArray(headerKey) || (typeof headerKey === 'string' && (headerKey.trim() === '' || headerKey.trim().length > 255))) {
      throw new BadRequestError('Send exactly one non-blank Idempotency-Key of at most 255 characters, or none', 'memorial_takedown.idempotency_key_invalid');
    }
    if (typeof headerKey !== 'string') return run();
    const key = `${namespace}:${headerKey.trim()}`;
    if ((await idempotencyStore.claim(key, IDEMPOTENCY_TTL_SECONDS)) === 'already_claimed') {
      const stored = await idempotencyStore.getResult(key);
      if (stored !== null) return stored as T;
      throw new ConflictError('A request with this Idempotency-Key is already in progress — wait and retry', 'memorial_takedown.idempotency_in_progress');
    }
    try {
      const result = await run();
      await idempotencyStore.recordResult(key, result);
      return result;
    } catch (err) {
      await idempotencyStore.release(key).catch(() => undefined);
      throw err;
    }
  }

  function requestView(r: memorial.MemorialTakedownRequestWithOutcome, now: Date): MemorialTakedownRequestView {
    const o = r.outcome;
    return {
      requestId: r.request.requestId,
      firstContactAt: r.request.firstContactAt.toISOString(),
      receivedAt: r.request.receivedAt.toISOString(),
      dueAt: r.request.dueAt.toISOString(),
      overdue: o === null && memorial.isMemorialTakedownOverdue(r.request, now),
      actorDisplay: r.request.actorDisplay,
      outcome:
        o === null
          ? null
          : {
              outcome: o.outcome,
              decidedAt: o.decidedAt.toISOString(),
              actorDisplay: o.actorDisplay,
              decidedAfterDue: o.decidedAt.getTime() > r.request.dueAt.getTime(),
            },
    };
  }

  return {
    /** GET …/memorial-takedowns/members/:memberId/drives — MP12: the deceased member's drives with a SHOWN memorial. */
    async memberDrives(request: FastifyRequest): Promise<MemorialTakedownMemberDrivesResponse> {
      const who = staffCtx(request);
      const { memberId } = request.params as { memberId: string };
      const tx = await openScopeTx(deps, who.pariwarIdStr);
      let ok = false;
      try {
        const drives = await memorial.listMemberMemorialDrives(tx.tx, {
          pariwarId: ids.pariwarId(who.pariwarIdStr),
          memberId: ids.memberId(memberId),
        });
        ok = true;
        return { drives: drives.map((d) => ({ poolId: d.poolId, poolCanonicalIdentifier: d.poolCanonicalIdentifier, hasOpenRequest: d.hasOpenRequest })) };
      } finally {
        await closeScopeTx(tx, ok);
      }
    },

    /**
     * GET …/memorial-takedowns/drives/:poolId — the drive view (AC6): the words AS THE PAGE SHOWS THEM (joined — `-411` item 3),
     * the photo (a 5-minute signed URL, audited), the nominee to CALL BACK (MP7), how a smaller fix is done (MP8 (b)), the current
     * nominee, and the requests. ONE `memorial.takedown.read` line.
     */
    async drive(request: FastifyRequest): Promise<MemorialTakedownDriveResponse> {
      const who = staffCtx(request);
      const { poolId } = request.params as { poolId: string };
      const pariwarId = ids.pariwarId(who.pariwarIdStr);
      const tx = await openScopeTx(deps, who.pariwarIdStr);
      let ok = false;
      let read: memorial.MemorialTakedownDriveRead | null;
      try {
        read = await memorial.readMemorialTakedownDrive(tx.tx, { pariwarId, poolId: ids.poolId(poolId) });
        ok = true;
      } finally {
        await closeScopeTx(tx, ok);
      }
      if (read === null) throw takedownNotFound();

      // ── Decrypt AFTER the transaction (⛔ no KMS inside a tx). A failure leaves THAT field `null` — the screen says so. ──
      let decrypted = 0;
      const dec = async (ct: string | null, as: 'memorial' | 'nominee'): Promise<string | null> => {
        if (ct === null) return null;
        try {
          const v =
            as === 'memorial'
              ? await decryptMemorialField(ct, who.pariwarIdStr, deps.encryption)
              : await decryptNomineeField(ct, who.pariwarIdStr, deps.encryption);
          decrypted += 1;
          return v;
        } catch (err) {
          request.log.warn({ errorName: err instanceof Error ? err.name : typeof err }, 'memorial-takedown: decrypt failed');
          return null;
        }
      };

      let shown: MemorialTakedownDriveResponse['shown'] = null;
      if (read.shown !== null) {
        const s = read.shown.submission;
        const body = await dec(s.bodyCiphertext, 'memorial');
        const photoKept = s.photoObjectKey !== null && read.shown.decision?.photoLeftOutReason == null;
        const alt = photoKept ? await dec(s.altTextCiphertext, 'memorial') : null;
        // Story 11b.5a (KL11) — the family list (decrypt failure ⇒ `null`, as the words).
        const kinPlain = await dec(s.kinshipCiphertext, 'memorial');
        // ⭐ Trap 4 — the sentinel is an erasure the member-state check missed (a race): ⛔ never shown as words. KL10 — a sentinel
        // list joins the same OR (the whole memorial goes, never "the memorial without its list").
        if (
          body === memberDomain.ANONYMIZED_SENTINEL ||
          alt === memberDomain.ANONYMIZED_SENTINEL ||
          kinPlain === memberDomain.ANONYMIZED_SENTINEL
        ) {
          throw takedownNotFound();
        }
        // KL10 — a PRESENT list that fails to decrypt (`kinPlain` null) or to parse drops the WHOLE memorial from the public page, so
        // the helpline may not say its words are "on the page now": the memorial reads as unreadable (words, photo and list all
        // `null`, ⛔ no photo URL minted — the screen's own words-unavailable state), and the take-down still works off `submissionId`.
        let entries: MemorialKinshipEntry[] | null = [];
        if (s.kinshipCiphertext !== null) {
          entries = kinPlain === null ? null : parseMemorialKinship(kinPlain);
          if (kinPlain !== null && entries === null) request.log.warn('memorial-takedown: family list did not parse');
        }
        const unreadable = entries === null;
        const omissions = read.shown.decision?.omissions ?? [];
        let words: string[] | null = null;
        let altText: string | null = null;
        if (body !== null && !unreadable) {
          // The SAME function the public page calls — "the words as the page shows them" cannot drift (R5).
          const text = publicMemorialText({ body, altText: alt, omissions });
          words = text.words;
          altText = text.altText;
        }
        let photoUrl: string | null = null;
        if (photoKept && !unreadable) {
          try {
            photoUrl = await deps.memorialPhotoStorage.signedReadUrl(s.photoObjectKey!, MEMORIAL_PHOTO_URL_TTL_SECONDS);
            emitAuthAudit(deps, request, 'memorial.photo.url', {
              actorId: who.actorId,
              pariwarId: who.pariwarIdStr,
              context: { submission_id: s.submissionId, viewer: 'helpline' },
              resourceLocator: `memorial:${s.submissionId}`,
            });
          } catch (err) {
            request.log.warn({ errorName: err instanceof Error ? err.name : typeof err }, 'memorial-takedown: photo url failed');
          }
        }
        // The SAME rows the public page gets (`publicMemorialKinship` — grouped, left-out entries absent, each name isolated;
        // ⛔ never an `inPhoto` tick). `[]` for ⛔ no list; `null` when the list could not be read.
        let kinship: { relation: MemorialKinshipRelation; names: string[] }[] | null = [];
        if (s.kinshipCiphertext !== null) {
          kinship =
            entries === null
              ? null
              : publicMemorialKinship(entries, (read.shown.decision?.kinshipOmissions ?? []).map((k) => k.index));
        }
        shown = {
          submissionId: s.submissionId,
          sentAt: s.createdAt.toISOString(),
          words,
          hasPhoto: photoKept && !unreadable,
          photoUrl,
          altText,
          kinship,
        };
      }

      const nomineeToCallBack =
        read.shownNominee === null
          ? null
          : { name: await dec(read.shownNominee.nameCiphertext, 'nominee'), mobile: await dec(read.shownNominee.mobileCiphertext, 'nominee') };
      const currentNominee =
        read.currentNominee === null || read.shown === null
          ? null
          : {
              name: await dec(read.currentNominee.nameCiphertext, 'nominee'),
              isNomineeToCallBack: read.currentNominee.versionId === read.shown.submission.handoverNomineeRef,
            };
      const memorialState = memorial.deriveMemorialChainState(read.chain);
      const now = deps.clock();

      emitAuthAudit(deps, request, 'memorial.takedown.read', {
        actorId: who.actorId,
        pariwarId: who.pariwarIdStr,
        context: { fields_decrypted: decrypted, memorial_state: memorialState },
        resourceLocator: `memorial-pool:${read.poolId}`,
      });

      return {
        poolId: read.poolId,
        poolCanonicalIdentifier: read.poolCanonicalIdentifier,
        memorialState,
        shown,
        nomineeToCallBack,
        smallerFix: read.shown === null ? null : memorial.memorialCanSend(memorialState) ? 'send_now' : 'take_down_first',
        currentNominee,
        requests: read.requests.map((r) => requestView(r, now)),
      };
    },

    /**
     * GET …/memorial-takedowns/requests?open=true — AC10: the OPEN requests, oldest first, `overdue` derived. ⚠ BOUNDED (review R17):
     * the domain read clamps the page (one open request per drive keeps it far below the bound), and past it the LEAST urgent
     * requests are the ones that fall off — see `listOpenMemorialTakedownRequests`.
     */
    async openRequests(request: FastifyRequest): Promise<MemorialTakedownOpenRequestsResponse> {
      const who = staffCtx(request);
      const tx = await openScopeTx(deps, who.pariwarIdStr);
      let ok = false;
      try {
        const rows = await memorial.listOpenMemorialTakedownRequests(tx.tx, { pariwarId: ids.pariwarId(who.pariwarIdStr) });
        ok = true;
        const now = deps.clock();
        return {
          requests: rows.map((r) => ({
            requestId: r.request.requestId,
            poolId: r.request.poolId,
            poolCanonicalIdentifier: r.poolCanonicalIdentifier,
            firstContactAt: r.request.firstContactAt.toISOString(),
            receivedAt: r.request.receivedAt.toISOString(),
            dueAt: r.request.dueAt.toISOString(),
            overdue: memorial.isMemorialTakedownOverdue(r.request, now),
          })),
        };
      } finally {
        await closeScopeTx(tx, ok);
      }
    },

    /**
     * POST …/memorial-takedowns/drives/:poolId/requests — AC6: record the nominee's request after the call-back (MP7). The 7 days
     * run from the nominee's FIRST contact (MP14 (b)): ⛔ not in the future, ⛔ not more than 7 days ago — else 400. ⭐ The body
     * echoes the version the operator was LOOKING AT (`shownSubmissionId`): the domain compares it with the chain re-read under
     * the pool lock, and a version approved since is `409 shown_changed` with nothing written (review R1, MP8 (c)).
     */
    async recordRequest(request: FastifyRequest): Promise<MemorialTakedownRequestResponse> {
      const who = staffCtx(request);
      const { poolId } = request.params as { poolId: string };
      const input = request.body as MemorialTakedownRequestInput;
      const firstContactAt = new Date(input.firstContactAt);
      const pariwarId = ids.pariwarId(who.pariwarIdStr);
      return withIdempotency(request, `memorial-takedown:request:${who.pariwarIdStr}:${poolId}`, async () => {
        // ⭐ INSIDE the run (review R16): a retry of a request that was recorded returns the STORED 201 before the window is
        // evaluated — the key lives 24 h, so a first contact that was inside the 7 days at the first call can have aged out by the retry.
        const now = deps.clock().getTime();
        if (!(firstContactAt.getTime() <= now) || firstContactAt.getTime() < now - FIRST_CONTACT_WINDOW_MS) {
          throw new BadRequestError(
            "The nominee's first contact must be in the last 7 days, and not in the future",
            'memorial_takedown.first_contact_out_of_range',
          );
        }
        const display = await operatorDisplay(who.actorId);
        return audit.withCompensatingAudit(deps.servicePool, {
          auditIntent: {
            pariwarId,
            actorId: who.actorId,
            actorRole: null,
            action: MEMORIAL_TAKEDOWN_REQUEST_RECORD_ACTION,
            resourceLocator: `memorial-pool:${poolId}`,
            // ⚠ The operator-entered `first_contact_at` is ONLY inside `requestPayloadHash` — a hash, ⛔ not a readable field of the
            // line; `received_at` is the request ROW's (DB clock) and is ⛔ hashed here. Both are stored on the append-only request row
            // (MP14 (b) as amended, review RR12). The version the operator was shown (R1) is hashed beside it.
            requestPayloadHash: sha256Hex(
              canonicalJsonStringify({
                pool_id: poolId,
                shown_submission_id: input.shownSubmissionId,
                first_contact_at: firstContactAt.toISOString(),
                verified_by: 'called_back',
              }),
            ),
            traceId: request.requestContext.traceId ?? null,
          },
          mutate: async () => {
            const tx = await openScopeTx(deps, who.pariwarIdStr);
            let txOk = false;
            try {
              const out = await memorial.recordMemorialTakedownRequest(tx.tx, {
                pariwarId,
                poolId: ids.poolId(poolId),
                shownSubmissionId: input.shownSubmissionId,
                firstContactAt,
                actorId: ids.userId(who.actorId),
                actorDisplay: display,
              });
              if (!out.ok) {
                switch (out.refusal) {
                  case 'not_found':
                    throw takedownNotFound();
                  case 'shown_changed':
                    throw new ConflictError(
                      'The memorial on the page is no longer the one you were looking at — reload the drive and call back the nominee named there',
                      'memorial_takedown.shown_changed',
                    );
                  case 'request_open':
                    throw new ConflictError('This drive already has an open take-down request', 'memorial_takedown.request_open');
                }
              }
              txOk = true;
              return { requestId: out.request.requestId, poolId, dueAt: out.request.dueAt.toISOString() };
            } catch (err) {
              // The DB clock moved past a bound the handler's clock admitted (0187's CHECK — the backstop).
              if (isCheckViolation(err)) {
                throw new BadRequestError(
                  "The nominee's first contact must be in the last 7 days, and not in the future",
                  'memorial_takedown.first_contact_out_of_range',
                );
              }
              throw err;
            } finally {
              await closeScopeTx(tx, txOk);
            }
          },
        });
      });
    },

    /**
     * POST …/memorial-takedowns/requests/:requestId/outcome — AC7. `taken_down` (step-up `memorial_takedown`, checked by the route)
     * withdraws EVERY un-withdrawn version under the pool lock (MP8 (a)); `kept` / `superseded` change nothing public. The chain
     * is re-read under the lock (MP8 (c)): `taken_down` and `kept` refuse a changed shown version, `superseded` an unchanged one.
     */
    async decide(request: FastifyRequest): Promise<MemorialTakedownOutcomeResponse> {
      const who = staffCtx(request);
      const { requestId } = request.params as { requestId: string };
      const input = request.body as MemorialTakedownOutcomeInput;
      const pariwarId = ids.pariwarId(who.pariwarIdStr);
      return withIdempotency(request, `memorial-takedown:outcome:${who.pariwarIdStr}:${requestId}`, async () => {
        const display = await operatorDisplay(who.actorId);
        return audit.withCompensatingAudit(deps.servicePool, {
          auditIntent: {
            pariwarId,
            actorId: who.actorId,
            actorRole: null,
            action: MEMORIAL_TAKEDOWN_DECIDE_ACTION,
            resourceLocator: `memorial-takedown:${requestId}`,
            requestPayloadHash: sha256Hex(canonicalJsonStringify({ request_id: requestId, outcome: input.outcome })),
            traceId: request.requestContext.traceId ?? null,
          },
          mutate: async () => {
            const tx = await openScopeTx(deps, who.pariwarIdStr);
            let txOk = false;
            try {
              const out = await memorial.decideMemorialTakedown(tx.tx, {
                pariwarId,
                requestId,
                outcome: input.outcome,
                actorId: ids.userId(who.actorId),
                actorDisplay: display,
              });
              if (!out.ok) {
                switch (out.refusal) {
                  case 'not_found':
                    throw takedownNotFound();
                  case 'already_decided':
                    throw new ConflictError('This request has already been decided', 'memorial_takedown.already_decided');
                  case 'shown_changed':
                    throw new ConflictError(
                      'The memorial on the page is no longer the one this request was about — close it as superseded',
                      'memorial_takedown.shown_changed',
                    );
                  case 'shown_unchanged':
                    throw new ConflictError('The memorial on the page has not changed — superseded does not apply', 'memorial_takedown.shown_unchanged');
                }
              }
              txOk = true;
              return { requestId, outcome: out.outcome.outcome, decidedAt: out.outcome.decidedAt.toISOString() };
            } finally {
              await closeScopeTx(tx, txOk);
            }
          },
        });
      });
    },
  };
}
