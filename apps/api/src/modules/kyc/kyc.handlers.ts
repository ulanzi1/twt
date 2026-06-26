// KYC signup-step handlers — Story 3.3b (Task 3; AC1/AC2/AC5).
//
// The FIRST surface that DRIVES the Story 3.1 member lifecycle: confirm emits
// `member.kyc_completed` and manual emits `member.kyc_manual_fallback` via the projector
// (`pending-kyc → pending-fee`). It CONSUMES the 3.3a `KycProvider` seam through the
// registry — never the DigiLocker transport.
//
// ── Scope-tx discipline (R3) ───────────────────────────────────────────────────────────
// `requireMemberSession` sets `request.requestContext.{actorId,pariwarId}` but does NOT open
// a scope tx, so every member handler opens its own (`openScopeTx`) and the projector gets the
// raw `scopeTx.client` (it issues `SET LOCAL app.member_state_writer='on'`). The PUBLIC
// callback has no member JWT — it resolves the transaction's pariwar_id PRE-SCOPE (servicePool)
// then opens a scope tx for THAT pariwar. Profile write + event append + state projection run
// inside ONE scope tx so a torn view never exists.
//
// ── PII discipline ────────────────────────────────────────────────────────────────────
// name/dob/photo are Tier-1 encrypted in the route before the accessor sees them; the audit
// carries masked-Aadhaar / transaction_id only — NEVER name/dob/photo/raw Aadhaar/OAuth code.

import type {
  KycCallbackRequest,
  KycConfirmRequest,
  KycInitiateResponse,
  KycManualSubmitRequest,
  KycProfile,
  KycProfileSummaryResponse,
  KycStatusResponse,
  MemberKycState,
} from '@twt/contracts';
import { KycProviderError } from '@twt/contracts';
import { ids, kyc, member as memberDomain } from '@twt/domain';
import type { FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import { ConflictError, NotFoundError, UnauthorizedError } from '../../http-errors.js';
import { emitAuthAudit } from '../auth/shared/audit.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';
import type { ScopeTx } from '../../types.js';
import { decryptKycField, encryptKycField } from './kyc-crypto.js';
import { isManualFallbackEnabled } from './manual-fallback-seam.js';
import { resolveKycTransactionByState } from './kyc.repo.js';
import type { KycProviderContext } from './context.js';

const TX_STATES = new Set(['pending', 'verified', 'failed', 'expired']);

export function createKycHandlers(deps: AppDeps) {
  const enc = deps.encryption;

  /** Bind the active provider to a scoped ctx (the 3.3a registry seam). */
  function providerFor(scopeTx: ScopeTx, pariwarIdStr: string): ReturnType<
    AppDeps['kycProviders']['getActiveKycProvider']
  > {
    const ctx: KycProviderContext = { db: scopeTx.tx, pariwarId: ids.pariwarId(pariwarIdStr) };
    return deps.kycProviders.getActiveKycProvider(ctx);
  }

  /** Member's KYC standing, derived from the stored profile (none / verified / manual). */
  function memberKycStateOf(
    profile: Awaited<ReturnType<typeof kyc.getMemberKycProfile>>,
  ): MemberKycState {
    if (!profile) return 'none';
    return profile.source === 'manual' ? 'manual_pending' : 'digilocker_verified';
  }

  /** Assemble the `/status` view (profile + lifecycle + in-flight transaction + FR-58C seam). */
  async function buildStatus(
    scopeTx: ScopeTx,
    pariwarId: ids.PariwarId,
    memberId: ids.MemberId,
  ): Promise<KycStatusResponse> {
    const profile = await kyc.getMemberKycProfile(scopeTx.tx, pariwarId, memberId);
    const lifecycleState = await memberDomain.getMemberStateAt(scopeTx.tx, memberId, deps.clock());
    const txn = await kyc.getLatestKycTransactionForMember(scopeTx.tx, pariwarId, memberId);
    return {
      ...(txn && TX_STATES.has(txn.status)
        ? { transactionStatus: txn.status as 'pending' | 'verified' | 'failed' | 'expired' }
        : {}),
      memberKycState: memberKycStateOf(profile),
      lifecycleState,
      manualFallbackEnabled: isManualFallbackEnabled(deps),
    };
  }

  /** Read the authenticated member's (memberId, pariwarId) or fail 401. */
  function memberCtx(request: FastifyRequest): { memberIdStr: string; pariwarIdStr: string } {
    const memberIdStr = request.requestContext.actorId;
    const pariwarIdStr = request.requestContext.pariwarId;
    if (!memberIdStr || !pariwarIdStr) {
      throw new UnauthorizedError('Authentication required', 'auth.session_required');
    }
    return { memberIdStr, pariwarIdStr };
  }

  return {
    /** POST /api/v1/member/kyc/initiate — begin a DigiLocker pull (member must be pending-kyc). */
    async initiate(request: FastifyRequest): Promise<KycInitiateResponse> {
      const { memberIdStr, pariwarIdStr } = memberCtx(request);
      const scopeTx = await openScopeTx(deps, pariwarIdStr);
      let ok = false;
      try {
        const memberId = ids.memberId(memberIdStr);
        const state = await memberDomain.getMemberStateAt(scopeTx.tx, memberId, deps.clock());
        if (state !== 'pending-kyc') {
          throw new ConflictError(
            'Member is not pending-kyc (KYC already completed)',
            'kyc.not_pending',
          );
        }
        const provider = providerFor(scopeTx, pariwarIdStr);
        const initiation = await provider.initiate(memberIdStr, 'signup');
        emitAuthAudit(deps, request, 'member_kyc.initiate', {
          actorId: memberIdStr,
          pariwarId: pariwarIdStr,
          context: { transaction_id: initiation.transactionId },
        });
        ok = true;
        return {
          transactionId: initiation.transactionId,
          authorizationUrl: initiation.authorizationUrl,
          expiresAt: initiation.expiresAt,
        };
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
    },

    /**
     * POST /api/v1/kyc/callback — PUBLIC (state-correlated). Resolve the transaction's
     * pariwar pre-scope, open a scope tx for it, verify+pull, persist the profile awaiting
     * confirm. Does NOT emit `member.kyc_completed` (the member confirms, per AC1). On a
     * provider failure the normalized error propagates (AC2 — the client offers manual).
     */
    async callback(request: FastifyRequest): Promise<KycProfileSummaryResponse> {
      const body = request.body as KycCallbackRequest;
      const txn = await resolveKycTransactionByState(deps.servicePool, body.state);
      if (!txn) {
        throw new NotFoundError(
          'No KYC transaction for the supplied state',
          'kyc.transaction_not_found',
        );
      }
      // Pre-scope guards (before paying the cost of a scope tx): reject non-pending
      // transactions and already-expired ones so replay and stuck-pending rows cannot occur.
      if (txn.status !== 'pending') {
        throw new NotFoundError(
          'No active KYC transaction for the supplied state',
          'kyc.transaction_not_found',
        );
      }
      if (txn.expiresAt <= deps.clock()) {
        throw new ConflictError('KYC transaction has expired', 'kyc.transaction_expired');
      }
      const scopeTx = await openScopeTx(deps, txn.pariwarId);
      let ok = false;
      try {
        const pariwarId = ids.pariwarId(txn.pariwarId);
        const memberId = ids.memberId(txn.memberId);
        const provider = providerFor(scopeTx, txn.pariwarId);

        let profile: KycProfile;
        try {
          profile = await provider.verifyAndPullProfile({ state: body.state, code: body.code });
        } catch (err) {
          emitAuthAudit(deps, request, 'member_kyc.failure', {
            actorId: txn.memberId,
            pariwarId: txn.pariwarId,
            context: {
              transaction_id: txn.transactionId,
              code: KycProviderError.is(err) ? err.code : 'provider_unavailable',
            },
          });
          throw err; // rolled back below; error-mapping normalizes KycProviderError → HTTP.
        }

        const nameCt = await encryptKycField(profile.name, txn.pariwarId, enc);
        const dobCt = await encryptKycField(profile.dob, txn.pariwarId, enc);
        const photoCt = profile.photoUrl
          ? await encryptKycField(profile.photoUrl, txn.pariwarId, enc)
          : null;
        await kyc.upsertMemberKycProfile(scopeTx.tx, {
          memberId,
          pariwarId,
          nameCiphertext: nameCt,
          dobCiphertext: dobCt,
          photoCiphertext: photoCt,
          aadhaarMaskedId: profile.aadhaarMaskedId,
          verificationStrength: profile.verificationStrength,
          source: 'digilocker',
          trusteeVerified: false,
          kycTransactionId: ids.kycTransactionId(txn.transactionId),
        });
        emitAuthAudit(deps, request, 'member_kyc.verified', {
          actorId: txn.memberId,
          pariwarId: txn.pariwarId,
          context: { transaction_id: txn.transactionId, aadhaar_masked: profile.aadhaarMaskedId },
        });
        ok = true;
        return {
          name: profile.name,
          dob: profile.dob,
          aadhaarMaskedId: profile.aadhaarMaskedId,
          verificationStrength: profile.verificationStrength,
          photoPresent: Boolean(profile.photoUrl),
        };
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
    },

    /**
     * POST /api/v1/member/kyc/confirm — confirm a verified DigiLocker profile → emit
     * `member.kyc_completed` (pending-kyc → pending-fee). Idempotent: a re-confirm when the
     * member is already past pending-kyc emits no second event.
     */
    async confirm(request: FastifyRequest): Promise<KycStatusResponse> {
      const body = request.body as KycConfirmRequest;
      const { memberIdStr, pariwarIdStr } = memberCtx(request);
      const scopeTx = await openScopeTx(deps, pariwarIdStr);
      let ok = false;
      try {
        const memberId = ids.memberId(memberIdStr);
        const pariwarId = ids.pariwarId(pariwarIdStr);
        const provider = providerFor(scopeTx, pariwarIdStr);

        const status = await provider.getStatus(body.transactionId);
        if (status.status !== 'verified') {
          throw new ConflictError('KYC transaction is not verified', 'kyc.not_verified');
        }
        const profile = await kyc.getMemberKycProfile(scopeTx.tx, pariwarId, memberId);
        if (!profile) {
          throw new NotFoundError('No stored KYC profile to confirm', 'kyc.profile_not_found');
        }
        // Bind the supplied transactionId to the authenticated member's stored profile so
        // Member B cannot advance their own lifecycle using Member A's verified transactionId.
        if (profile.kycTransactionId?.toLowerCase() !== body.transactionId.toLowerCase()) {
          throw new ConflictError(
            'Transaction does not match stored KYC profile',
            'kyc.transaction_mismatch',
          );
        }

        // Idempotent: only emit while still pending-kyc (the projector + a re-confirm guard).
        const state = await memberDomain.getMemberStateAt(scopeTx.tx, memberId, deps.clock());
        if (state === 'pending-kyc') {
          await memberDomain.projectMemberState(scopeTx.client, {
            memberId,
            pariwarId,
            eventType: 'member.kyc_completed',
            payload: {
              from_state: 'pending-kyc',
              to_state: 'pending-fee',
              trigger: 'kyc_digilocker',
              actor: 'member',
              ...(profile.aadhaarMaskedId ? { kyc_reference: profile.aadhaarMaskedId } : {}),
            },
            actorId: memberIdStr,
          });
          emitAuthAudit(deps, request, 'member_kyc.confirmed', {
            actorId: memberIdStr,
            pariwarId: pariwarIdStr,
            context: { transaction_id: body.transactionId },
          });
        }
        const result = await buildStatus(scopeTx, pariwarId, memberId);
        ok = true;
        return result;
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
    },

    /**
     * POST /api/v1/member/kyc/manual — the AC2 fallback target. Store a self-declared
     * record (Tier-1 encrypted; self_declared, trustee_verified=false) → emit
     * `member.kyc_manual_fallback` (pending-kyc → pending-fee). `reason` is REQUIRED by the
     * payload schema (R1: this advances to pending-fee NOW; pending-valid is reached LATER
     * at lock-in expiry for the still-unverified member).
     */
    async manual(request: FastifyRequest): Promise<KycStatusResponse> {
      const body = request.body as KycManualSubmitRequest;
      const { memberIdStr, pariwarIdStr } = memberCtx(request);
      // FR-58C server-side gate — reject before opening a scope tx when the seam is off.
      if (!isManualFallbackEnabled(deps)) {
        throw new ConflictError('Manual KYC fallback is not available', 'kyc.manual_fallback_disabled');
      }
      const scopeTx = await openScopeTx(deps, pariwarIdStr);
      let ok = false;
      try {
        const memberId = ids.memberId(memberIdStr);
        const pariwarId = ids.pariwarId(pariwarIdStr);
        const state = await memberDomain.getMemberStateAt(scopeTx.tx, memberId, deps.clock());
        if (state !== 'pending-kyc') {
          throw new ConflictError('Member is not pending-kyc', 'kyc.not_pending');
        }
        // Guard against silently downgrading a cryptographically-verified DigiLocker profile.
        const existingProfile = await kyc.getMemberKycProfile(scopeTx.tx, pariwarId, memberId);
        if (existingProfile?.source === 'digilocker') {
          throw new ConflictError(
            'A DigiLocker-verified profile already exists — use confirm instead of manual',
            'kyc.digilocker_profile_exists',
          );
        }
        const nameCt = await encryptKycField(body.name, pariwarIdStr, enc);
        const dobCt = await encryptKycField(body.dob, pariwarIdStr, enc);
        const photoCt = body.photo ? await encryptKycField(body.photo, pariwarIdStr, enc) : null;
        await kyc.upsertMemberKycProfile(scopeTx.tx, {
          memberId,
          pariwarId,
          nameCiphertext: nameCt,
          dobCiphertext: dobCt,
          photoCiphertext: photoCt,
          aadhaarMaskedId: null,
          verificationStrength: 'self_declared',
          source: 'manual',
          trusteeVerified: false,
          kycTransactionId: null,
        });
        await memberDomain.projectMemberState(scopeTx.client, {
          memberId,
          pariwarId,
          eventType: 'member.kyc_manual_fallback',
          payload: {
            from_state: 'pending-kyc',
            to_state: 'pending-fee',
            trigger: 'kyc_manual',
            actor: 'member',
            reason: 'manual_fallback',
          },
          actorId: memberIdStr,
        });
        emitAuthAudit(deps, request, 'member_kyc.manual', {
          actorId: memberIdStr,
          pariwarId: pariwarIdStr,
          context: { source: 'manual' },
        });
        const result = await buildStatus(scopeTx, pariwarId, memberId);
        ok = true;
        return result;
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
    },

    /**
     * GET /api/v1/member/kyc/profile-summary — decrypt and return the stored KYC profile.
     * Called by the mobile confirm screen after the DigiLocker callback has persisted the
     * profile. Returns name/dob (decrypted), masked-Aadhaar, and a photoPresent flag.
     * The raw photo bytes are NEVER echoed back (Tier-1 discipline).
     */
    async profileSummary(request: FastifyRequest): Promise<KycProfileSummaryResponse> {
      const { memberIdStr, pariwarIdStr } = memberCtx(request);
      const scopeTx = await openScopeTx(deps, pariwarIdStr);
      let ok = false;
      try {
        const profile = await kyc.getMemberKycProfile(
          scopeTx.tx,
          ids.pariwarId(pariwarIdStr),
          ids.memberId(memberIdStr),
        );
        if (!profile) {
          throw new NotFoundError('No KYC profile found', 'kyc.profile_not_found');
        }
        const name = await decryptKycField(profile.nameCiphertext, pariwarIdStr, enc);
        const dob = await decryptKycField(profile.dobCiphertext, pariwarIdStr, enc);
        ok = true;
        return {
          name,
          dob,
          aadhaarMaskedId: profile.aadhaarMaskedId,
          verificationStrength: profile.verificationStrength,
          photoPresent: profile.photoCiphertext !== null,
        };
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
    },

    /** GET /api/v1/member/kyc/status — the step entry/poll read. */
    async status(request: FastifyRequest): Promise<KycStatusResponse> {
      const { memberIdStr, pariwarIdStr } = memberCtx(request);
      const scopeTx = await openScopeTx(deps, pariwarIdStr);
      let ok = false;
      try {
        const result = await buildStatus(
          scopeTx,
          ids.pariwarId(pariwarIdStr),
          ids.memberId(memberIdStr),
        );
        ok = true;
        return result;
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
    },
  };
}
