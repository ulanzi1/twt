// The family memorial's MEMBER handlers (Story 11b.4 — AC1 / AC4 / AC7 / AC8 / AC10 / AC19; `#decision-2026-10-24-398`).
//
// The principal is the Ravi-mode session-as-deceased (the family signs in to the DECEASED member's account); the GETs are
// ⛔ step-up-gated (the nominee-console precedent); the writes need the NOMINEE's handover code (`claim_handover` — which,
// after MA19, ONLY the nominee route mints). The server switch (MA17) answers before the step-up gate (routes.ts).
//
// ⭐ The load-bearing invariant: the family's words are stored VERBATIM (Trap 6 — ⛔ trim, ⛔ normalisation; validation runs
// on a DERIVED view) and authorised AT SEND, in this surface (`-162` cl.3 — AC4): the permission columns ride the SAME row,
// written in the SAME transaction.
//
// Send's order (AC7): session → step-up → Idempotency claim (the first DB touch, before parsing) → parse (Trap 11) →
// resolve the drive → validate → resolve the nominee the handover code was addressed to (MA5; ⛔ none ⇒ 409, before any
// `put`) → strip the photo's metadata and `put` it (MA8) → encrypt (⛔ never inside the lock) → `withCompensatingAudit`
// (intent first; `openScopeTx`: lock → chain head → the drive is still the session's → canSend → current version →
// keepPreviousPhoto's key → insert) → COMMIT → `recordResult` → 201. A photo `put` BY THIS REQUEST is deleted best-effort on
// any failure after the `put` — ⛔ never a reused `keepPreviousPhoto` object, which still belongs to the earlier version.

import { createHash, randomUUID } from 'node:crypto';

import {
  MEMORIAL_ALT_TEXT_MAX_CODE_POINTS,
  MEMORIAL_BODY_MAX_CODE_POINTS,
  MEMORIAL_PHOTO_MAX_BYTES,
  MEMORIAL_PHOTO_URL_TTL_SECONDS,
  MEMORIAL_SEND_FIELDS,
  MEMORIAL_SEND_FILE_FIELD,
  MemorialSendResponse,
  isMemorialTextBlank,
  memorialCodePointLength,
  type MemorialEntryResponse,
  type MemorialMemberView,
  type MemorialMemberViewResponse,
  type MemorialWithdrawResponse,
} from '@twt/contracts';
import {
  audit,
  canonicalJsonStringify,
  claim,
  ids,
  idempotency,
  kyc as kycDomain,
  member as memberDomain,
  memorial,
  nominee as nomineeDomain,
  notifications,
  type Db,
} from '@twt/domain';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import { BadRequestError, ConflictError, NotFoundError, UnauthorizedError } from '../../http-errors.js';
import type { ScopeTx } from '../../types.js';
import { emitAuthAudit } from '../auth/shared/audit.js';
import { normalizeMobile } from '../auth/shared/mobile-index.js';
import { decryptKycField } from '../kyc/kyc-crypto.js';
import { KmsOutageError, normalisePublicName, withKmsOutageClassification } from '../kyc/name-render.js';
import { resolvePoolNamePresentationModeForRequest } from '../member-pool/pool-identity.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';
import { decryptNomineeField } from '../nominee/nominee-crypto.js';
import { decryptMemorialField, encryptMemorialField } from './memorial-crypto.js';
import { stripMemorialPhotoMetadata } from './photo-metadata.js';

/** The write actions (the hash-chain sink, through `withCompensatingAudit` — MA11). */
export const MEMORIAL_SUBMISSION_CREATE_ACTION = 'memorial.submission.create';
export const MEMORIAL_SUBMISSION_WITHDRAW_ACTION = 'memorial.submission.withdraw';

/** The Idempotency claim's TTL — the helpdesk create precedent (AC3: past it a retry is a fresh attempt). */
const MEMORIAL_SEND_IDEMPOTENCY_TTL_SECONDS = 300;

/** Multipart limits for THIS route (Trap 11): `fieldSize` ≥ 32 KiB (6,000 astral code points are 24,000 bytes). */
const MEMORIAL_MULTIPART_LIMITS = {
  files: 1,
  fileSize: MEMORIAL_PHOTO_MAX_BYTES + 1,
  fields: 10,
  fieldSize: 32 * 1024,
  parts: 12,
} as const;

/** The ONE neutral member 404 — the switch off, an id that is ⛔ theirs, ⛔ a drive (Trap 8). */
export function memorialNotFound(): NotFoundError {
  return new NotFoundError('Not found', 'memorial.not_found');
}

function sha256Hex(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

interface ParsedSend {
  readonly fields: Readonly<Record<string, string>>;
  readonly photo: { readonly bytes: Buffer; readonly truncated: boolean } | null;
}

/**
 * Read the Send's multipart body (Trap 11): `request.parts()` with per-request limits, fields in any order, the photo
 * optional, an explicit allow-list of field names, a duplicate field or a second file refused, and ⭐ `valueTruncated` /
 * `fieldnameTruncated` on ANY field part refused — `@fastify/multipart` passes an over-long text field through CUT and
 * raises ⛔ no error (⛔ there is ⛔ no `FST_FIELD_SIZE_LIMIT` code — helpdesk's catch arm for it is dead). The first
 * violation is recorded and the stream DRAINED (the helpdesk review-hardening), then thrown.
 */
async function readSendMultipart(request: FastifyRequest): Promise<ParsedSend> {
  if (!request.isMultipart()) throw new BadRequestError('Expected a multipart/form-data body', 'memorial.field_not_allowed');
  const allowed = new Set<string>(MEMORIAL_SEND_FIELDS);
  const fields: Record<string, string> = {};
  let photo: { bytes: Buffer; truncated: boolean } | null = null;
  let pending: BadRequestError | null = null;
  const fail = (message: string, code: string): void => {
    pending ??= new BadRequestError(message, code);
  };
  try {
    for await (const part of request.parts({ limits: MEMORIAL_MULTIPART_LIMITS })) {
      if (part.type === 'file') {
        if (pending !== null || part.fieldname !== MEMORIAL_SEND_FILE_FIELD) {
          if (part.fieldname !== MEMORIAL_SEND_FILE_FIELD) fail('A part is not allowed here', 'memorial.field_not_allowed');
          part.file.resume();
          continue;
        }
        if (photo !== null) {
          fail('A part was sent twice', 'memorial.duplicate_field');
          part.file.resume();
          continue;
        }
        const bytes = await part.toBuffer();
        photo = { bytes, truncated: part.file.truncated };
        continue;
      }
      if (part.fieldnameTruncated || part.valueTruncated) {
        fail('A field is too long', 'memorial.field_too_long');
        continue;
      }
      if (!allowed.has(part.fieldname)) {
        fail('A field is not allowed here', 'memorial.field_not_allowed');
        continue;
      }
      if (Object.prototype.hasOwnProperty.call(fields, part.fieldname)) {
        fail('A field was sent twice', 'memorial.duplicate_field');
        continue;
      }
      if (typeof part.value !== 'string') {
        fail('A field is not allowed here', 'memorial.field_not_allowed');
        continue;
      }
      fields[part.fieldname] = part.value;
    }
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === 'FST_FILES_LIMIT') throw new BadRequestError('A part was sent twice', 'memorial.duplicate_field');
    if (code === 'FST_REQ_FILE_TOO_LARGE') throw new BadRequestError('The photo is too large', 'memorial.photo_too_large');
    if (code === 'FST_FIELDS_LIMIT' || code === 'FST_PARTS_LIMIT') {
      throw new BadRequestError('A field is not allowed here', 'memorial.field_not_allowed');
    }
    throw err;
  }
  if (pending !== null) throw pending;
  return { fields, photo };
}

type HandoverResolution =
  | { readonly ok: true; readonly recipient: memorial.MemorialHandoverRecipient; readonly nomineeRef: string }
  | { readonly ok: false };

/**
 * MA5 — the nominee the handover code is addressed to AT SEND TIME, taking the SAME branch `sendHandoverOtp` takes
 * (`claims.service.ts`): while a `-239` suspicion refusal stands, the at-death nominee by version id; else the deceased's
 * PRIMARY nominee, whose version ref is the rank-1 head of the declaration history. ⛔ None resolvable (refusal `kind:
 * 'none'`, ⛔ primary nominee, an undeliverable number, ⛔ rank-1 version row) ⇒ `{ ok: false }` — the Send refuses with
 * `409 memorial.nominee_unresolved` and ⛔ never writes a null recipient. The decrypts run OUTSIDE any transaction.
 */
async function resolveHandoverNominee(
  deps: AppDeps,
  pariwarIdStr: string,
  deceasedMemberId: ids.MemberId,
): Promise<HandoverResolution> {
  const pariwarId = ids.pariwarId(pariwarIdStr);
  const scopeTx = await openScopeTx(deps, pariwarIdStr);
  let ok = false;
  let read:
    | { readonly kind: 'at_death'; readonly versionId: string; readonly mobileCiphertext: string | null }
    | { readonly kind: 'latest'; readonly mobileCiphertext: string; readonly versionId: string | null }
    | { readonly kind: 'none' };
  try {
    const refusal = await claim.readSuspicionRefusalRecipient(scopeTx.tx, pariwarId, deceasedMemberId);
    if (refusal !== null) {
      if (refusal.kind === 'none') {
        read = { kind: 'none' };
      } else {
        const [version] = await nomineeDomain.getNomineeVersionsByIds(scopeTx.tx, pariwarId, [refusal.versionId]);
        read = { kind: 'at_death', versionId: refusal.versionId, mobileCiphertext: version?.mobileCiphertext ?? null };
      }
    } else {
      const primary = (await nomineeDomain.getMemberNominees(scopeTx.tx, pariwarId, deceasedMemberId))[0];
      if (!primary) {
        read = { kind: 'none' };
      } else {
        const versionId = await memorial.readLatestPrimaryNomineeVersionId(scopeTx.tx, { pariwarId, memberId: deceasedMemberId });
        read = { kind: 'latest', mobileCiphertext: primary.mobileCiphertext, versionId };
      }
    }
    ok = true;
  } finally {
    await closeScopeTx(scopeTx, ok);
  }
  if (read.kind === 'none') return { ok: false };
  if (read.kind === 'at_death') {
    const canonical = await claim.resolveCorrectionMobile(read.mobileCiphertext, 'member_nominee', pariwarIdStr, deps.encryption);
    return canonical === null ? { ok: false } : { ok: true, recipient: 'at_death', nomineeRef: read.versionId };
  }
  if (read.versionId === null) return { ok: false };
  const canonical = normalizeMobile(await decryptNomineeField(read.mobileCiphertext, pariwarIdStr, deps.encryption));
  return canonical === null ? { ok: false } : { ok: true, recipient: 'latest', nomineeRef: read.versionId };
}

/**
 * The deceased's name for the intro (MA14) — the 11b.21 chain (decrypt → `publicNameTokens` →
 * `resolveMemberFacingDeceasedName(presentationMode, …)` → `normalisePublicName`), FAIL-SOFT: a KMS outage, a null name or
 * the erasure sentinel ⇒ `null` (the no-name key), ⛔ never a 500. ⚠ A deliberate difference from 11b.21, which re-throws
 * `KmsOutageError`: here the outage degrades the intro's NAME only (the words fail soft separately).
 */
async function resolveIntroName(
  deps: AppDeps,
  request: FastifyRequest,
  args: {
    readonly pariwarId: ids.PariwarId;
    readonly ciphertext: string | null;
    readonly presentationMode: Awaited<ReturnType<typeof resolvePoolNamePresentationModeForRequest>>;
  },
): Promise<{ readonly name: string | null; readonly decrypted: boolean }> {
  if (args.ciphertext === null) return { name: null, decrypted: false };
  let stored: string;
  try {
    stored = await decryptKycField(args.ciphertext, args.pariwarId, withKmsOutageClassification(deps.encryption));
  } catch (err) {
    request.log.warn(
      { errorName: err instanceof Error ? err.name : typeof err, outage: err instanceof KmsOutageError },
      'memorial: deceased name decrypt failed — the no-name intro',
    );
    return { name: null, decrypted: false };
  }
  if (stored === memberDomain.ANONYMIZED_SENTINEL) return { name: null, decrypted: true };
  try {
    const name = normalisePublicName(
      notifications.resolveMemberFacingDeceasedName(args.presentationMode, kycDomain.publicNameTokens(stored).join(' ')),
    );
    return { name, decrypted: true };
  } catch (err) {
    request.log.warn({ errorName: err instanceof Error ? err.name : typeof err }, 'memorial: deceased name resolution failed');
    return { name: null, decrypted: true };
  }
}

export function createMemorialHandlers(deps: AppDeps) {
  const idempotencyStore = idempotency.createKeyedStore(deps.pool);

  function memberCtx(request: FastifyRequest): { memberIdStr: string; pariwarIdStr: string } {
    const memberIdStr = request.requestContext.actorId;
    const pariwarIdStr = request.requestContext.pariwarId;
    if (!memberIdStr || !pariwarIdStr) throw new UnauthorizedError('Authentication required', 'auth.session_required');
    return { memberIdStr, pariwarIdStr };
  }

  function logMultiple(request: FastifyRequest, resolved: memorial.ResolvedMemorialDrive): void {
    if (resolved.matchCount > 1) {
      request.log.warn(
        { matchCount: resolved.matchCount, chosenPoolId: resolved.drive.poolId },
        'memorial: the member has more than one closed drive — writing about only one',
      );
    }
  }

  async function signedPhotoUrl(
    request: FastifyRequest,
    ctx: { memberIdStr: string; pariwarIdStr: string },
    submissionId: string,
    key: string,
  ): Promise<string | null> {
    try {
      const url = await deps.memorialPhotoStorage.signedReadUrl(key, MEMORIAL_PHOTO_URL_TTL_SECONDS);
      emitAuthAudit(deps, request, 'memorial.photo.url', {
        actorId: ctx.memberIdStr,
        pariwarId: ctx.pariwarIdStr,
        context: { submission_id: submissionId, viewer: 'family' },
        resourceLocator: `memorial:${submissionId}`,
      });
      return url;
    } catch (err) {
      request.log.warn({ err, submissionId }, 'memorial: photo url failed — showing the words without the photo');
      return null;
    }
  }

  return {
    /** GET /api/v1/member/memorial/entry — the home probe (AC1): ⛔ no decrypt, ⛔ no audit line. */
    async entry(request: FastifyRequest): Promise<MemorialEntryResponse> {
      if (!deps.config.memorialAuthorshipEnabled) return { memorialEntry: false };
      const { memberIdStr, pariwarIdStr } = memberCtx(request);
      let scopeTx: ScopeTx | undefined;
      let ok = false;
      try {
        scopeTx = await openScopeTx(deps, pariwarIdStr);
        const resolved = await memorial.resolveMemorialDrive(scopeTx.tx, {
          pariwarId: ids.pariwarId(pariwarIdStr),
          memberId: ids.memberId(memberIdStr),
        });
        ok = true;
        return { memorialEntry: resolved !== null };
      } catch (err) {
        request.log.error({ err }, 'memorial: entry probe failed — no entry');
        ok = true; // read-only
        return { memorialEntry: false };
      } finally {
        if (scopeTx) await closeScopeTx(scopeTx, ok);
      }
    },

    /** GET /api/v1/member/memorial — the family's own view (AC1 / AC10). */
    async view(request: FastifyRequest): Promise<MemorialMemberViewResponse> {
      if (!deps.config.memorialAuthorshipEnabled) return { memorial: null };
      const ctx = memberCtx(request);
      const pariwarId = ids.pariwarId(ctx.pariwarIdStr);
      const memberId = ids.memberId(ctx.memberIdStr);

      const scopeTx = await openScopeTx(deps, ctx.pariwarIdStr);
      let ok = false;
      let resolved: memorial.ResolvedMemorialDrive | null;
      let chain: memorial.MemorialChainLink[] = [];
      let nameCiphertext: string | null = null;
      let presentationMode: Awaited<ReturnType<typeof resolvePoolNamePresentationModeForRequest>> | null = null;
      try {
        resolved = await memorial.resolveMemorialDrive(scopeTx.tx, { pariwarId, memberId });
        if (resolved !== null) {
          chain = await memorial.readMemorialChain(scopeTx.tx, { pariwarId, poolId: resolved.drive.poolId });
          nameCiphertext = (await kycDomain.getMemberKycProfile(scopeTx.tx, pariwarId, memberId))?.nameCiphertext ?? null;
          presentationMode = await resolvePoolNamePresentationModeForRequest(scopeTx.tx, pariwarId);
        }
        ok = true;
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
      if (resolved === null || presentationMode === null) return { memorial: null };
      logMultiple(request, resolved);

      // ── Decrypt AFTER the transaction (⛔ KMS inside a tx). ─────────────────────────────────────────────────────────
      let fieldsDecrypted = 0;
      const intro = await resolveIntroName(deps, request, { pariwarId, ciphertext: nameCiphertext, presentationMode });
      if (intro.decrypted) fieldsDecrypted += 1;

      const state = memorial.memorialChainState(chain);
      const latest = chain.length === 0 ? null : chain[chain.length - 1]!;
      let body: string | null = null;
      let altText: string | null = null;
      let unavailable: 'memorial.unavailable_now' | null = null;
      if (latest !== null) {
        try {
          body = await decryptMemorialField(latest.submission.bodyCiphertext, ctx.pariwarIdStr, deps.encryption);
          fieldsDecrypted += 1;
          if (latest.submission.altTextCiphertext !== null) {
            altText = await decryptMemorialField(latest.submission.altTextCiphertext, ctx.pariwarIdStr, deps.encryption);
            fieldsDecrypted += 1;
          }
        } catch (err) {
          // AC1 — a FAIL-SOFT 200 (responses are PARSED — ⛔ a 500); the app can neither send nor withdraw until it reads.
          request.log.warn({ errorName: err instanceof Error ? err.name : typeof err }, 'memorial: words decrypt failed — unavailable now');
          body = null;
          altText = null;
          unavailable = memorial.MEMORIAL_UNAVAILABLE_NOW;
        }
      }
      const photoKey = latest?.submission.photoObjectKey ?? null;
      const photoUrl =
        latest !== null && photoKey !== null ? await signedPhotoUrl(request, ctx, latest.submission.submissionId, photoKey) : null;

      emitAuthAudit(deps, request, 'memorial.member.read', {
        actorId: ctx.memberIdStr,
        pariwarId: ctx.pariwarIdStr,
        context: { fields_decrypted: fieldsDecrypted, memorial_state: state },
        resourceLocator: `memorial-pool:${resolved.drive.poolId}`,
      });

      const decision = latest?.decision ?? null;
      const withdrawal = latest?.withdrawal ?? null;
      const view: MemorialMemberView = {
        driveId: resolved.drive.poolId,
        deceasedName: intro.name,
        memorialState: state,
        submissionId: latest?.submission.submissionId ?? null,
        body,
        altText,
        unavailable,
        hasPhoto: photoKey !== null,
        photoUrl,
        omissions: decision?.omissions.map((o) => ({ field: o.field, start: o.start, end: o.end, reason: o.reason })) ?? [],
        photoLeftOut: decision?.photoLeftOutReason ? { reason: decision.photoLeftOutReason } : null,
        reasonCode: withdrawal?.withdrawnBy === 'trust' ? withdrawal.reasonCode : (decision?.reasonCode ?? null),
        earlierApprovalWithdrawn: memorial.deriveEarlierApprovalWithdrawn(chain),
        canSend: unavailable === null && memorial.memorialCanSend(state),
        canWithdraw: unavailable === null && memorial.memorialCanWithdraw(state),
        authorisation: memorial.currentMemorialAuthorisation(),
      };
      return { memorial: view };
    },

    /** POST /api/v1/member/memorial/submissions — Send (AC4 / AC7). 201, or 200 on an idempotent replay. */
    async send(request: FastifyRequest, reply: FastifyReply): Promise<MemorialSendResponse> {
      const ctx = memberCtx(request);
      const pariwarId = ids.pariwarId(ctx.pariwarIdStr);
      const memberId = ids.memberId(ctx.memberIdStr);

      // (1) Idempotency claim — the handler's FIRST DB touch, before any parsing.
      const rawKey = request.headers['idempotency-key'];
      const key = (Array.isArray(rawKey) ? rawKey[0] : rawKey)?.trim();
      if (!key) throw new BadRequestError('An Idempotency-Key header is required', 'memorial.idempotency_key_required');
      const idemKey = `memorial.send:${ctx.pariwarIdStr}:${ctx.memberIdStr}:${key}`;
      if ((await idempotencyStore.claim(idemKey, MEMORIAL_SEND_IDEMPOTENCY_TTL_SECONDS)) === 'already_claimed') {
        const stored = await idempotencyStore.getResult(idemKey);
        const replay = stored === null ? null : MemorialSendResponse.safeParse(stored);
        if (replay?.success) {
          void reply.status(200);
          return replay.data;
        }
        throw new ConflictError('A Send with this key is still in progress', 'memorial.idempotency_in_progress');
      }

      let settled = false;
      try {
        // (2) Parse (Trap 11).
        const { fields, photo } = await readSendMultipart(request);

        // (3) Resolve the drive (⛔ none ⇒ the neutral 404).
        const resolveTx = await openScopeTx(deps, ctx.pariwarIdStr);
        let resolveOk = false;
        let resolved: memorial.ResolvedMemorialDrive | null;
        try {
          resolved = await memorial.resolveMemorialDrive(resolveTx.tx, { pariwarId, memberId });
          resolveOk = true;
        } finally {
          await closeScopeTx(resolveTx, resolveOk);
        }
        if (resolved === null) throw memorialNotFound();
        logMultiple(request, resolved);
        const drive = resolved.drive;

        // (4) Validate — on a DERIVED view; the stored body is the exact string received (Trap 6).
        const body = fields['body'];
        if (body === undefined || isMemorialTextBlank(body)) {
          throw new BadRequestError('Please write a few words before sending', 'memorial.body_blank');
        }
        if (memorialCodePointLength(body) > MEMORIAL_BODY_MAX_CODE_POINTS) {
          throw new BadRequestError('The words are longer than the page can hold', 'memorial.body_too_long');
        }
        const keepRaw = fields['keepPreviousPhoto'];
        if (keepRaw !== undefined && keepRaw !== 'true' && keepRaw !== 'false') {
          throw new BadRequestError('A field is not allowed here', 'memorial.field_not_allowed');
        }
        const keepPreviousPhoto = keepRaw === 'true';
        if (keepPreviousPhoto && photo !== null) {
          throw new BadRequestError('Send a new photo or keep the earlier one, not both', 'memorial.photo_conflict');
        }
        const withPhoto = photo !== null || keepPreviousPhoto;
        const altTextRaw = fields['altText'];
        let altText: string | null = null;
        if (withPhoto) {
          if (altTextRaw === undefined || isMemorialTextBlank(altTextRaw)) {
            throw new BadRequestError('Please describe the photo in a few words', 'memorial.alt_text_required');
          }
          if (memorialCodePointLength(altTextRaw) > MEMORIAL_ALT_TEXT_MAX_CODE_POINTS) {
            throw new BadRequestError('The photo description is too long', 'memorial.alt_text_too_long');
          }
          altText = altTextRaw;
        } else if (altTextRaw !== undefined && altTextRaw !== '') {
          // ⛔ Never silently dropped: a description with no photo is refused, ⛔ discarded.
          throw new BadRequestError('A photo description needs a photo', 'memorial.field_not_allowed');
        }
        const copyVersion = fields['authorisationCopyVersion'];
        if (copyVersion === undefined || copyVersion === '') {
          throw new ConflictError('The permission text has changed — please read it again', 'memorial.authorisation_outdated');
        }
        const locale = fields['authorisationLocale'];
        if (locale !== 'hi' && locale !== 'en') {
          throw new BadRequestError('A field is not allowed here', 'memorial.field_not_allowed');
        }
        let stripped: { bytes: Uint8Array; mime: 'image/jpeg' | 'image/png' } | null = null;
        if (photo !== null) {
          if (photo.truncated || photo.bytes.byteLength > MEMORIAL_PHOTO_MAX_BYTES) {
            throw new BadRequestError('The photo is too large', 'memorial.photo_too_large');
          }
          const r = stripMemorialPhotoMetadata(new Uint8Array(photo.bytes));
          if (!r.ok) {
            throw new BadRequestError(
              r.problem === 'photo_type' ? 'Please choose a JPEG or PNG photo' : 'The photo could not be read',
              `memorial.${r.problem}`,
            );
          }
          stripped = { bytes: r.bytes, mime: r.mime };
        }

        // (5) The nominee the handover code was addressed to (MA5) — BEFORE any `put`, so ⛔ no orphaned object.
        const handover = await resolveHandoverNominee(deps, ctx.pariwarIdStr, memberId);
        if (!handover.ok) {
          throw new ConflictError('We could not find the nominee for this account', 'memorial.nominee_unresolved');
        }

        // (6) Strip done above; `put` it (a fresh key per Send — ⛔ client-supplied).
        let putKey: string | null = null;
        if (stripped !== null) {
          putKey = `pariwar/${ctx.pariwarIdStr}/memorial/${drive.poolId}/${randomUUID()}`;
          await deps.memorialPhotoStorage.put(putKey, stripped.bytes, { contentType: stripped.mime });
        }

        try {
          // (7) Encrypt — ⛔ never inside the lock.
          const bodyCiphertext = await encryptMemorialField(body, ctx.pariwarIdStr, deps.encryption);
          const altTextCiphertext = altText === null ? null : await encryptMemorialField(altText, ctx.pariwarIdStr, deps.encryption);

          // (8) The write under a compensating audit; the scope tx commits inside `mutate` (⛔ `request.scopeTx`).
          const created = await audit.withCompensatingAudit(deps.servicePool, {
            auditIntent: {
              pariwarId,
              actorId: ctx.memberIdStr,
              actorRole: null,
              action: MEMORIAL_SUBMISSION_CREATE_ACTION,
              resourceLocator: `memorial-pool:${drive.poolId}`,
              requestPayloadHash: sha256Hex(
                canonicalJsonStringify({
                  pool_id: drive.poolId,
                  body_sha256: sha256Hex(body),
                  has_photo: withPhoto,
                  keep_previous_photo: keepPreviousPhoto,
                  authorisation_copy_version: copyVersion,
                  authorisation_locale: locale,
                  handover_recipient: handover.recipient,
                }),
              ),
              traceId: request.requestContext.traceId ?? null,
            },
            mutate: async () => {
              const tx = await openScopeTx(deps, ctx.pariwarIdStr);
              let txOk = false;
              try {
                await memorial.lockMemorialPool(tx.tx, drive.poolId);
                const again = await memorial.resolveMemorialDrive(tx.tx, { pariwarId, memberId });
                if (again === null || again.drive.poolId !== drive.poolId) throw memorialNotFound();
                const chain = await memorial.readMemorialChain(tx.tx, { pariwarId, poolId: drive.poolId });
                const decision = memorial.decideMemorialSend(chain, { authorisationCopyVersion: copyVersion, keepPreviousPhoto });
                if (!decision.ok) {
                  switch (decision.refusal) {
                    case 'already_reviewed':
                      throw new ConflictError('The Trust has already approved this memorial', 'memorial.already_reviewed');
                    case 'authorisation_outdated':
                      throw new ConflictError('The permission text has changed — please read it again', 'memorial.authorisation_outdated');
                    case 'no_previous_photo':
                      throw new BadRequestError('There is no earlier photo to keep', 'memorial.no_previous_photo');
                  }
                }
                const photoKey = decision.keptPhoto?.objectKey ?? putKey;
                const photoMime = decision.keptPhoto?.mime ?? stripped?.mime ?? null;
                let row: Awaited<ReturnType<typeof memorial.insertMemorialSubmission>>;
                try {
                  row = await memorial.insertMemorialSubmission(tx.tx, {
                    pariwarId,
                    poolId: drive.poolId,
                    claimCaseId: drive.claimCaseId,
                    deceasedMemberId: memberId,
                    supersedesSubmissionId: decision.supersedesSubmissionId,
                    bodyCiphertext,
                    altTextCiphertext,
                    photoObjectKey: photoKey,
                    photoMime,
                    authorisationCopyVersion: copyVersion,
                    authorisationLocale: locale,
                    handoverRecipient: handover.recipient,
                    handoverNomineeRef: handover.nomineeRef,
                  });
                } catch (err) {
                  // The unique indexes are a BACKSTOP an unlocked insert can reach (Trap 12).
                  if ((err as { code?: string }).code === '23505') {
                    throw new ConflictError('Please try sending again', 'memorial.try_again');
                  }
                  throw err;
                }
                txOk = true;
                return row;
              } finally {
                await closeScopeTx(tx, txOk);
              }
            },
          });

          const response: MemorialSendResponse = { submissionId: created.submissionId, memorialState: 'with_the_trust' };
          // (9) COMMIT happened inside `mutate`; THEN record the result ([[project_idempotent_write_handler_shape]]).
          await idempotencyStore.recordResult(idemKey, response);
          settled = true;
          void reply.status(201);
          return response;
        } catch (err) {
          // ⛔ Only an object THIS request `put` — never a reused `keepPreviousPhoto` object.
          if (putKey !== null) {
            const orphan = putKey;
            await deps.memorialPhotoStorage.delete(orphan).catch((cleanupErr: unknown) => {
              request.log.warn({ err: cleanupErr }, 'memorial: photo cleanup after a failed Send failed');
            });
          }
          throw err;
        }
      } finally {
        if (!settled) await idempotencyStore.release(idemKey).catch(() => undefined);
      }
    },

    /** POST /api/v1/member/memorial/submissions/:id/withdraw — the family withdraws before review (AC8). */
    async withdraw(request: FastifyRequest): Promise<MemorialWithdrawResponse> {
      const ctx = memberCtx(request);
      const pariwarId = ids.pariwarId(ctx.pariwarIdStr);
      const memberId = ids.memberId(ctx.memberIdStr);
      const { id } = request.params as { id: string };
      await audit.withCompensatingAudit(deps.servicePool, {
        auditIntent: {
          pariwarId,
          actorId: ctx.memberIdStr,
          actorRole: null,
          action: MEMORIAL_SUBMISSION_WITHDRAW_ACTION,
          resourceLocator: `memorial:${id.toLowerCase()}`,
          requestPayloadHash: sha256Hex(canonicalJsonStringify({ submission_id: id, withdrawn_by: 'family' })),
          traceId: request.requestContext.traceId ?? null,
        },
        mutate: async () => {
          const tx = await openScopeTx(deps, ctx.pariwarIdStr);
          let txOk = false;
          try {
            await withLockedSessionChain(tx.tx, { pariwarId, memberId }, async (chain) => {
              const verdict = memorial.decideFamilyWithdraw(chain, id);
              if (verdict === 'not_found') throw memorialNotFound();
              if (verdict === 'not_withdrawable') {
                throw new ConflictError('This version can no longer be withdrawn', 'memorial.not_withdrawable');
              }
              await memorial.insertMemorialWithdrawal(tx.tx, {
                submissionId: id,
                pariwarId,
                withdrawnBy: 'family',
                reasonCode: null,
                internalNoteCiphertext: null,
                actorId: ctx.memberIdStr,
                actorDisplay: null,
              });
            });
            txOk = true;
          } finally {
            await closeScopeTx(tx, txOk);
          }
        },
      });
      return { memorialState: 'withdrawn' };
    },
  };
}

/** Resolve the session's drive (⛔ none ⇒ 404), take the pool lock FIRST, then read the chain (MA9). */
async function withLockedSessionChain(
  tx: Db,
  who: { readonly pariwarId: ids.PariwarId; readonly memberId: ids.MemberId },
  fn: (chain: memorial.MemorialChainLink[]) => Promise<void>,
): Promise<void> {
  const resolved = await memorial.resolveMemorialDrive(tx, who);
  if (resolved === null) throw memorialNotFound();
  await memorial.lockMemorialPool(tx, resolved.drive.poolId);
  const chain = await memorial.readMemorialChain(tx, { pariwarId: who.pariwarId, poolId: resolved.drive.poolId });
  await fn(chain);
}
