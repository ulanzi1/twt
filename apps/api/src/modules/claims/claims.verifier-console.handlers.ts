// Verifier-console bounded compound assembler — Story 6.10 (Task 1; AC1/AC2/AC7, D2/D9/D10).
//
// The READ-ONLY signals view for ONE claim, served by ONE API request. This apps/api service is the
// bounded-assembler realization of AR-65 (Decision D2 — NOT a new materialized store, NOT @twt/domain:
// section (a) needs the FR-12A Validity payload from @twt/validity-service, which DEPENDS ON @twt/domain,
// so domain cannot import it — the same turbo-cycle wall that keeps the projector off @twt/events).
//
// ── Bounded fan-out, NO N+1 (AC1) ──────────────────────────────────────────────────────────────────
// A FIXED number of top-level source reads, independent of signal-ROW counts. `VERIFIER_CONSOLE_MAX_READS`
// is the asserted ceiling (see its doc comment for exactly what the counter includes). Adding documents /
// photos / peers / responses adds ROWS to a single read, never another read (the no-N+1 property).
//
// ── Failure posture (AC7) — the four-state vocabulary, NEVER collapsed ──────────────────────────────
//   · A whole-request failure ONLY on: auth/scope/tenant denial, or the CORE claim-identity read
//     (`getClaimDocumentReview` → null ⇒ 404). Those reject the whole request.
//   · Otherwise each optional section is isolated: a transient throw ⇒ `{ status: 'unavailable' }` for
//     THAT section (request still 200). A dependency failure is NEVER converted to `empty`.
//   · `empty` = the producer ran and genuinely found no records. `not_available_yet` = the downstream
//     producer has not shipped (sections (e)/(f) until Story 6.11; the concealment `not_evaluated`).
//
// ── PII discipline ─────────────────────────────────────────────────────────────────────────────────
// The accessors return ciphertext + object keys AS STORED; THIS route decrypts under the request
// encryption context (KYC via kyc-crypto, extracted OCR fields via claim-document-crypto, inspection
// text via ground-inspection-crypto) and mints short-lived (300s) signed URLs. Per-field decrypt is
// fail-soft (a corrupt envelope ⇒ null for that field, never a failed read). The packet is
// authorized-display-sensitive — never logged, never persisted client-side.

import { claim, idempotency, ids, type Db } from '@twt/domain';
import {
  getValidityCached,
  type ValidityCaller,
  type ValidityServiceDeps,
} from '@twt/validity-service';
import type {
  DocumentReviewSection,
  GroundInspectionSection,
  MemberValidityPayloadDto,
  PeerMeshSection,
  PriorVerifierCommentsSection,
  RecentPrecedentsSection,
  ValiditySection,
  VerifierConsoleIdentity,
  VerifierConsolePacket,
  VerifierConsoleResponse,
  VerifierReviewItem,
} from '@twt/contracts';
import type { FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import { ForbiddenError, NotFoundError, UnauthorizedError } from '../../http-errors.js';
import { emitAuthAudit } from '../auth/shared/audit.js';
import { decryptKycField } from '../kyc/kyc-crypto.js';
import { decryptClaimDocumentField } from './claim-document-crypto.js';
import { decryptGroundInspectionField } from './ground-inspection-crypto.js';

/** The verifier-console READ key (Story 6.10, catalog v13) — gates the route (district dimension). */
export const VERIFIER_CONSOLE_KEY = 'claim.verify';

/** Short-lived signed-URL TTL for documents + inspection photos (the 6.7 300s precedent). */
const SIGNED_URL_TTL_SECONDS = 300;

/**
 * The asserted per-request read ceiling (AC1 / D9). WHAT THE COUNTER INCLUDES: the top-level bounded
 * source reads the assembler orchestrates — `getClaimDocumentReview` (core: claim + documents + KYC),
 * `getValidityCached` (one logical validity fetch), the three peer-mesh reads (selection, ping intents,
 * responses), and `getClaimGroundInspection`. Measured baseline with EVERY signal present = 6.
 *
 * WHAT IT EXCLUDES (measured/asserted separately, NOT DB reads): signed-URL minting and crypto
 * (decrypt) operations; and `getValidityCached`'s INTERNAL cache/recompute reads (the Story 4.8 cache
 * is the p95 mechanism — D9 states the true 4L p95 rests on that cache + the claim indices, not a
 * full-scale load harness). Sections (e)/(f) currently do NO DB read (`not_available_yet` until 6.11).
 *
 * Ceiling = baseline 6 + a small explicit allowance of 2 = 8. The allowance is exactly the two Story
 * 6.11 producer reads (getPriorVerifierDecisions + getRecentInScopePrecedents) that light up when the
 * decision read model ships — so 6.11 needs no bump. Any FURTHER increase requires an explanation at
 * review, not a casual bump; the counter is asserted in the live-DB integration test so it cannot be
 * silently "fixed" by excluding a newly-added read.
 */
export const VERIFIER_CONSOLE_MAX_READS = 8;

/** Counts the assembler's top-level bounded source reads (the no-N+1 fan-out width). */
class ReadCounter {
  public count = 0;
  public bump(): void {
    this.count += 1;
  }
}

/** The assembler's request context (the route builds it; tests construct it directly for a live-DB run). */
export interface VerifierConsoleContext {
  /** The RLS-scoped Drizzle handle (request.scopeTx.tx). */
  db: Db;
  pariwarId: string;
  claimCaseId: string;
  /** The deceased member's server-derived posting district (the route resolved + authorized it). */
  district: string;
  /** The acting verifier + their effective grants (for the scope-redacted validity read). */
  actorId: string;
  grants: readonly import('@twt/domain').rbac.EffectiveGrant[];
  traceId: string | null;
  /** Optional structured logger for fail-soft decrypt/section warnings (the route passes request.log). */
  log?: { warn: (obj: unknown, msg: string) => void };
}

/** Fail-soft decrypt: a single corrupt/rotated envelope yields `null` for THAT field, never a throw. */
async function safeDecrypt(
  fn: () => Promise<string>,
  ctx: VerifierConsoleContext,
  what: string,
): Promise<string | null> {
  try {
    return await fn();
  } catch (err) {
    ctx.log?.warn({ err, what, claimCaseId: ctx.claimCaseId }, 'verifier-console: field decrypt failed; returning null');
    return null;
  }
}

/**
 * Assemble the full verifier-console packet (the bounded compound read). Returns the packet + the
 * counted top-level reads (the live-DB test asserts `readCount <= VERIFIER_CONSOLE_MAX_READS` and that
 * it does NOT grow with row counts). Throws `NotFoundError` when the CORE claim read is absent (AC7
 * whole-request failure); every OPTIONAL section is isolated to `unavailable` on a transient throw.
 */
export async function assembleVerifierConsole(
  deps: AppDeps,
  ctx: VerifierConsoleContext,
): Promise<{ packet: VerifierConsolePacket; readCount: number }> {
  const reads = new ReadCounter();
  const pariwarId = ids.pariwarId(ctx.pariwarId);
  const claimCaseId = ids.claimId(ctx.claimCaseId);

  // ── CORE read (AC7): claim identity + documents + deceased KYC in one bounded fan-out (6.5 shape) ──
  reads.bump();
  const core = await claim.getClaimDocumentReview(ctx.db, pariwarId, claimCaseId);
  if (!core) {
    // The claim does not exist in this Pariwar (RLS + explicit predicate — a cross-tenant guess also
    // lands here). Whole-request failure → 404. NEVER a degraded 200 packet.
    throw new NotFoundError('Claim not found', 'claim.not_found');
  }
  const deceasedMemberId = core.claim.deceasedMemberId;

  // ── (a) identity (decrypted DISPLAY fields — part of the core read) ──────────────────────────────
  const identity: VerifierConsoleIdentity = {
    deceasedName:
      core.deceasedKyc?.nameCiphertext != null
        ? await safeDecrypt(() => decryptKycField(core.deceasedKyc!.nameCiphertext, ctx.pariwarId, deps.encryption), ctx, 'kyc.name')
        : null,
    deceasedDateOfBirth:
      core.deceasedKyc?.dobCiphertext != null
        ? await safeDecrypt(() => decryptKycField(core.deceasedKyc!.dobCiphertext, ctx.pariwarId, deps.encryption), ctx, 'kyc.dob')
        : null,
  };
  const memberRecord =
    core.deceasedKyc == null ? null : { name: identity.deceasedName, dateOfBirth: identity.deceasedDateOfBirth };

  // ── (a) validity — scope-redacted by the service; `unavailable` on a transient fail ──────────────
  const validity = await assembleValidity(deps, ctx, deceasedMemberId, reads);

  // ── (a) concealment tri-state (D10) — request-time, scope-safe; district = indicator_only ────────
  // NEVER inferred from the redacted validity `specialFlags` (absence can't distinguish "no flag" from
  // "redacted flag"), NEVER the member-standing flag. No claim-scoped R14 producer exists yet, so the
  // honest v1 posture is `not_evaluated` — never `not_flagged`, never a green/clear. When the producer
  // lands (deferred, likely Story 6.15) it plugs into this SAME shape without changing the console API.
  const concealment = { status: 'not_evaluated', detailVisibility: 'indicator_only' } as const;

  // ── (b) OCR document-review parity (embeds the 6.5 <VerifierReviewPanel> shape) ──────────────────
  const documentReview = await assembleDocumentReview(deps, ctx, core, memberRecord);

  // ── (c) peer-mesh transcripts (Story 6.6) — transcripts NOT counts; absence ≠ denied ─────────────
  const peerMesh = await assemblePeerMesh(ctx, claimCaseId, reads);

  // ── (d) ground-inspection notes + photos (Story 6.7) — `[]` = a first-class absence signal ───────
  const groundInspection = await assembleGroundInspection(deps, ctx, claimCaseId, reads);

  // ── (e)/(f) prior comments + recent precedents — `not_available_yet` until Story 6.11 (D6) ───────
  const priorVerifierComments = await assemblePriorComments(ctx, claimCaseId);
  const recentPrecedents = await assembleRecentPrecedents(ctx, claimCaseId);

  const packet: VerifierConsolePacket = {
    claimCaseId: ctx.claimCaseId,
    pariwarId: ctx.pariwarId,
    claimState: core.claim.currentState,
    deceasedMemberId,
    identity,
    validity,
    concealment,
    documentReview,
    peerMesh,
    groundInspection,
    priorVerifierComments,
    recentPrecedents,
  };
  return { packet, readCount: reads.count };
}

async function assembleValidity(
  deps: AppDeps,
  ctx: VerifierConsoleContext,
  deceasedMemberId: string,
  reads: ReadCounter,
): Promise<ValiditySection> {
  try {
    const validityDeps: ValidityServiceDeps = {
      db: ctx.db,
      keyedStore: idempotency.createKeyedStore(deps.servicePool),
      servicePool: deps.servicePool,
      traceId: ctx.traceId,
    };
    // The caller's locator is the deceased's DISTRICT (the route already authorized the actor there);
    // a district-scoped grant covers it (exact node), and the service redacts State-Trustee-only fields
    // for a narrower caller (so a district verifier gets the redacted payload — the correct posture).
    const caller: ValidityCaller = {
      actorId: ctx.actorId,
      grants: ctx.grants,
      resource: { dimension: 'district', value: ctx.district, pariwarId: ctx.pariwarId },
      isSelf: false,
    };
    reads.bump();
    const payload = await getValidityCached(
      validityDeps,
      { pariwarId: ids.pariwarId(ctx.pariwarId), memberId: ids.memberId(deceasedMemberId) },
      { caller },
    );
    return { status: 'present', payload: payload as unknown as MemberValidityPayloadDto };
  } catch (err) {
    ctx.log?.warn({ err, claimCaseId: ctx.claimCaseId }, 'verifier-console: validity read unavailable');
    return { status: 'unavailable' };
  }
}

async function assembleDocumentReview(
  deps: AppDeps,
  ctx: VerifierConsoleContext,
  core: NonNullable<Awaited<ReturnType<typeof claim.getClaimDocumentReview>>>,
  memberRecord: { name: string | null; dateOfBirth: string | null } | null,
): Promise<DocumentReviewSection> {
  try {
    if (core.documents.length === 0) return { status: 'empty' };
    const reviews: VerifierReviewItem[] = await Promise.all(
      core.documents.map(async (d): Promise<VerifierReviewItem> => {
        const dec = (ct: string | null, what: string) =>
          ct == null ? Promise.resolve(null) : safeDecrypt(() => decryptClaimDocumentField(ct, ctx.pariwarId, deps.encryption), ctx, what);
        return {
          documentType: d.documentType,
          parityOutcome: d.parityOutcome,
          verifierReviewRequired: d.verifierReviewRequired,
          ocrConfidence: d.ocrConfidence,
          parityFlags: (d.parityFlags ?? {}) as Record<string, string>,
          extracted: {
            deceasedName: await dec(d.deceasedNameCiphertext, 'doc.deceasedName'),
            dateOfBirth: await dec(d.dobCiphertext, 'doc.dob'),
            dateOfDeath: await dec(d.dateOfDeathCiphertext, 'doc.dateOfDeath'),
            issuingAuthority: await dec(d.issuingAuthorityCiphertext, 'doc.issuingAuthority'),
            certificateNumber: await dec(d.certificateNumberCiphertext, 'doc.certificateNumber'),
          },
          memberRecord,
          preview: {
            signedUrl: await deps.claimDocumentStorage.signedReadUrl(d.storageObjectKey, SIGNED_URL_TTL_SECONDS),
            contentType: d.contentType,
            filename: d.documentType,
          },
        };
      }),
    );
    return { status: 'present', reviews };
  } catch (err) {
    ctx.log?.warn({ err, claimCaseId: ctx.claimCaseId }, 'verifier-console: document-review section unavailable');
    return { status: 'unavailable' };
  }
}

async function assemblePeerMesh(
  ctx: VerifierConsoleContext,
  claimCaseId: ids.ClaimId,
  reads: ReadCounter,
): Promise<PeerMeshSection> {
  try {
    const pariwarId = ids.pariwarId(ctx.pariwarId);
    reads.bump();
    const selection = await claim.getPeerMeshSelectionByClaim(ctx.db, pariwarId, claimCaseId);
    if (!selection) return { status: 'empty' };

    reads.bump();
    const pings = await claim.getPeerMeshPingIntentsBySelection(ctx.db, pariwarId, selection.selectionId);
    reads.bump();
    const responses = await claim.getPeerMeshResponses(ctx.db, claimCaseId);

    return {
      status: 'present',
      transcript: {
        selectionId: selection.selectionId,
        distinctResponderCount: claim.distinctPeerMeshResponderCount(responses),
        pingedMemberIds: pings.map((p) => p.memberId),
        // Append-order responses; a non-response is simply ABSENT and is NEVER inferred as `denied` (AC2c).
        responses: responses.map((r) => ({ responderMemberId: r.responderMemberId, response: r.response })),
        // AC2c's verifier annotations have no owning producer yet — explicit not_available_yet, never fabricated.
        verifierAnnotations: { status: 'not_available_yet' },
      },
    };
  } catch (err) {
    ctx.log?.warn({ err, claimCaseId: ctx.claimCaseId }, 'verifier-console: peer-mesh section unavailable');
    return { status: 'unavailable' };
  }
}

async function assembleGroundInspection(
  deps: AppDeps,
  ctx: VerifierConsoleContext,
  claimCaseId: ids.ClaimId,
  reads: ReadCounter,
): Promise<GroundInspectionSection> {
  try {
    reads.bump();
    const all = await claim.getClaimGroundInspection(ctx.db, ids.pariwarId(ctx.pariwarId), claimCaseId);
    if (all.length === 0) return { status: 'empty' }; // AC5 absence-is-a-signal — but a genuine [], not a failure

    const assignments = await Promise.all(
      all.map(async (r) => {
        const photos = await Promise.all(
          r.photos.map(async (p) => ({
            photoId: p.photoId,
            contentType: p.contentType,
            byteSize: p.byteSize,
            caption:
              p.captionCiphertext == null
                ? null
                : await safeDecrypt(() => decryptGroundInspectionField(p.captionCiphertext!, ctx.pariwarId, deps.encryption), ctx, 'inspection.caption'),
            signedUrl: await deps.claimDocumentStorage.signedReadUrl(p.storageObjectKey, SIGNED_URL_TTL_SECONDS),
          })),
        );
        return {
          groundInspectionId: r.inspection.groundInspectionId,
          district: r.inspection.district,
          inspectionStage: r.inspection.inspectionStage,
          inspectionSiteType: r.inspection.inspectionSiteType,
          inspectorActorId: r.inspection.inspectorActorId,
          scheduledAt: r.inspection.scheduledAt.toISOString(),
          status: r.inspection.status,
          refusalReason: r.inspection.refusalReason,
          completedAt: r.inspection.completedAt ? r.inspection.completedAt.toISOString() : null,
          notes:
            r.inspection.notesCiphertext == null
              ? null
              : await safeDecrypt(() => decryptGroundInspectionField(r.inspection.notesCiphertext!, ctx.pariwarId, deps.encryption), ctx, 'inspection.notes'),
          structuredFindings: r.inspection.structuredFindings ?? null,
          photos,
        };
      }),
    );
    return { status: 'present', assignments };
  } catch (err) {
    ctx.log?.warn({ err, claimCaseId: ctx.claimCaseId }, 'verifier-console: ground-inspection section unavailable');
    return { status: 'unavailable' };
  }
}

async function assemblePriorComments(
  ctx: VerifierConsoleContext,
  claimCaseId: ids.ClaimId,
): Promise<PriorVerifierCommentsSection> {
  try {
    const result = await claim.getPriorVerifierDecisions(ctx.db, ids.pariwarId(ctx.pariwarId), claimCaseId);
    if (result.status === 'not_available_yet') return { status: 'not_available_yet' };
    if (result.status === 'empty') return { status: 'empty' };
    return {
      status: 'present',
      comments: result.decisions.map((d) => ({
        outcome: d.outcome,
        reasonCode: d.reasonCode,
        rationale: d.rationale,
        actorDisplay: d.actorDisplay,
        decidedAt: d.decidedAt.toISOString(),
        claimCaseId: d.claimCaseId,
      })),
    };
  } catch (err) {
    ctx.log?.warn({ err, claimCaseId: ctx.claimCaseId }, 'verifier-console: prior-comments section unavailable');
    return { status: 'unavailable' };
  }
}

async function assembleRecentPrecedents(
  ctx: VerifierConsoleContext,
  claimCaseId: ids.ClaimId,
): Promise<RecentPrecedentsSection> {
  try {
    const result = await claim.getRecentInScopePrecedents(ctx.db, ids.pariwarId(ctx.pariwarId), claimCaseId);
    if (result.status === 'not_available_yet') return { status: 'not_available_yet' };
    if (result.status === 'empty') return { status: 'empty' };
    return {
      status: 'present',
      precedents: result.precedents.map((d) => ({
        claimCaseId: d.claimCaseId,
        outcome: d.outcome,
        reasonCode: d.reasonCode,
        rationale: d.rationale,
        actorDisplay: d.actorDisplay,
        decidedAt: d.decidedAt.toISOString(),
      })),
    };
  } catch (err) {
    ctx.log?.warn({ err, claimCaseId: ctx.claimCaseId }, 'verifier-console: recent-precedents section unavailable');
    return { status: 'unavailable' };
  }
}

export function createVerifierConsoleHandlers(deps: AppDeps) {
  return {
    VERIFIER_CONSOLE_KEY,

    /**
     * GET …/admin/claims/:claimCaseId/verifier-console — the READ-ONLY bounded compound signals view.
     * The route chain [adminSession, scope, resolveVerifierConsoleDistrict, requirePermission(claim.verify,
     * district)] has already enforced an authenticated HUMAN actor + tenant + district scope (fail-closed,
     * audited). This handler assembles + returns the packet and emits the AUDITED read line. It emits NO
     * `claim.*` lifecycle event and takes NO decision (AC4).
     */
    async getVerifierConsole(request: FastifyRequest): Promise<VerifierConsoleResponse> {
      const scopeTx = request.scopeTx;
      const actorId = request.requestContext.actorId;
      const district = request.verifierConsoleDistrict;
      if (!scopeTx || !actorId) {
        throw new UnauthorizedError('Authentication required', 'auth.session_required');
      }
      if (district == null) {
        // Defensive: the district-resolution preHandler + the district permission gate should have
        // denied a no-district claim already (403). Never assemble without an authorized district.
        throw new ForbiddenError('Authorization required', 'auth.forbidden');
      }
      const { claimCaseId } = request.params as { claimCaseId: string };

      const { packet } = await assembleVerifierConsole(deps, {
        db: scopeTx.tx,
        pariwarId: scopeTx.pariwarId,
        claimCaseId,
        district,
        actorId,
        grants: request.scopeGrants ?? [],
        traceId: request.requestContext.traceId ?? null,
        log: request.log,
      });

      // AUDITED read (the adminValidityRead precedent) — NON-PII context only.
      emitAuthAudit(deps, request, 'admin_verifier_console.read', {
        actorId,
        pariwarId: scopeTx.pariwarId,
        context: {
          claim_case_id: claimCaseId,
          district,
          deceased_member_id: packet.deceasedMemberId,
        },
      });

      return { packet };
    },
  };
}
