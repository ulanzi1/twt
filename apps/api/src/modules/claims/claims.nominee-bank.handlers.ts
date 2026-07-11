// Claim-time nominee bank-detail collection handlers — Story 6.8 (Task 5; AC1/AC2/AC4/AC5).
//
// Two authenticated collection surfaces that share ONE core (`recordNomineeBank`):
//   · member-app (Ravi-mode session, handover-trust step-up) — /member/claims/:id/nominee-bank
//   · helpline operator (claim.manage_nominee_bank permission + admin step-up) — the admin scope-tx path
// Plus a shared IFSC-lookup read (public bank/branch — no claim touched).
//
// ── Concerns this file owns (the 6.7 ground-inspection posture) ───────────────────────
// (1) The D3 collectable-window guard runs FIRST (a clean 409 before any write; the domain
//     re-guards inside the tx). Member-app also asserts claim ownership (deceased === session member).
// (2) Each IFSC is re-validated server-side (format + BankIfscLookup) — never trust the client; a
//     failure is a dignified Pattern-4 rejection (the account is not persisted).
// (3) PII (holder name / account number / IFSC) is ENCRYPTED BEFORE the writer; bank_name/branch are
//     public plaintext. The response is a NON-PII presence view.
// (4) AUDIT IS A POST-COMMIT SINK — the mutation rides a dedicated committed scope-tx; emitAuthAudit
//     fires only after the tx commits, carrying NON-PII (claim id + ranks-present + ifsc_validated).
// (5) TWO-TIER PERMISSION (review finding, 2026-07-11): the route preHandler only proves
//     `claim.manage_nominee_bank` (tier-1 ordinary collection). A tier-2 CORRECTION additionally
//     requires `claim.correct_nominee_bank` — checked HERE, once the claim's locked state confirms
//     a correction is actually being attempted, via the `assertCorrectionAuthorized` callback the
//     helpline route supplies (the `claim.override_ground_inspection` in-handler-check pattern —
//     the tier isn't knowable at the route preHandler stage, only after the domain writer's D3 read).

import {
  type IfscLookupResponse,
  type NomineeBankStatusResponse,
  type RecordNomineeBankHelplineRequest,
  type RecordNomineeBankRequest,
  type RecordNomineeBankResponse,
  type NomineeBankAccountEntry,
} from '@twt/contracts';
import { claim, ids, rbac } from '@twt/domain';
import { IFSC_REGEX } from '@twt/platform-adapters';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import { BadRequestError, ConflictError, NotFoundError, UnauthorizedError } from '../../http-errors.js';
import { emitAuthAudit } from '../auth/shared/audit.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';
import { auditAuthorizationDenied } from '../rbac/index.js';
import type { ScopeTx } from '../../types.js';
import { encryptNomineeBankField } from './nominee-bank-crypto.js';

/** The D3 tier-1 (nominee) window + tier-2 (admin correction) window — mirror the domain guard. */
const COLLECTABLE_STATES = new Set<string>(claim.NOMINEE_BANK_COLLECTABLE_STATES);
const ADMIN_CORRECTION_STATES = new Set<string>(claim.NOMINEE_BANK_ADMIN_CORRECTION_STATES);
/** Story 6.8 code review — the D3 tier-2 correction permission key (catalog v11), checked
 *  in-handler via `assertCorrectionAuthorized` (the route preHandler only proves tier-1). */
const CLAIM_CORRECT_NOMINEE_BANK_KEY = 'claim.correct_nominee_bank';

/** Map a nominee-bank domain error to its stable HTTP shape (the backstop; the route also pre-checks
 *  the common cases for a clean early signal). Rethrows anything unknown. */
function translateNomineeBankError(err: unknown): never {
  if (err instanceof claim.NomineeBankClaimNotFoundError) {
    throw new NotFoundError('Claim not found', 'claim.not_found');
  }
  if (err instanceof claim.NomineeBankClaimNotCollectableError) {
    throw new ConflictError(
      'Bank details cannot be recorded for the claim in its current state',
      'nominee_bank.not_collectable',
      { state: err.currentState },
    );
  }
  if (err instanceof claim.NomineeBankAccountSetError) {
    throw new BadRequestError('Exactly two bank accounts are required', 'nominee_bank.invalid_account_set');
  }
  if (err instanceof claim.NomineeBankCorrectionReasonRequiredError) {
    throw new BadRequestError(
      'A reason is required to correct bank details after verifier approval',
      'nominee_bank.correction_reason_required',
    );
  }
  throw err;
}

interface RecordInput {
  claimCaseId: ids.ClaimId;
  pariwarId: ids.PariwarId;
  actorId: string;
  actor: 'member' | 'operator';
  /** Member-app authz: the claim's deceased member must equal the acting session member. */
  requireDeceasedMemberId?: ids.MemberId;
  /** D3 tier-2: the helpline (authorized admin) may correct in the post-approval window. */
  allowCorrection?: boolean;
  /** The mandatory justification for a post-approval correction (audited, NON-PII). */
  correctionReason?: string;
  /**
   * Called exactly when the claim is confirmed (post row-lock) to be in the tier-2 correction
   * window AND `allowCorrection` was requested — BEFORE the mandatory-reason check. Throws
   * `AuthorizationDeniedError` (403) if the actor lacks `claim.correct_nominee_bank` (review
   * finding, 2026-07-11 — the route preHandler only proves the tier-1 `claim.manage_nominee_bank`).
   * Omitted for the member route (which never sets `allowCorrection`).
   */
  assertCorrectionAuthorized?: () => void;
}

/** A validated + encrypted account, ready for the domain writer (plus the resolved public bank). */
interface PreparedAccount {
  input: claim.NomineeBankAccountInput;
  bankName: string;
  branch: string | null;
}

/**
 * Validate one account's IFSC (format + cached lookup) and encrypt its three Tier-1 fields. A
 * malformed or unrecognized IFSC is a dignified Pattern-4 rejection (the account is not persisted).
 */
async function prepareAccount(
  deps: AppDeps,
  pariwarId: string,
  rank: 1 | 2,
  entry: NomineeBankAccountEntry,
): Promise<PreparedAccount> {
  const ifsc = entry.ifsc.toUpperCase();
  // Server-side format re-assertion (never trust the client) → dignified copy on failure.
  if (!IFSC_REGEX.test(ifsc)) {
    throw new BadRequestError(
      "We couldn't recognize that IFSC — please check it and try again.",
      'nominee_bank.ifsc_unrecognized',
      { rank },
    );
  }
  const resolved = await deps.bankIfscLookup.lookup(ifsc);
  if (!resolved) {
    throw new BadRequestError(
      "We couldn't recognize that IFSC — please check it and try again.",
      'nominee_bank.ifsc_unrecognized',
      { rank },
    );
  }

  const [accountHolderNameCiphertext, accountNumberCiphertext, ifscCiphertext] = await Promise.all([
    encryptNomineeBankField(entry.accountHolderName, pariwarId, deps.encryption),
    encryptNomineeBankField(entry.accountNumber, pariwarId, deps.encryption),
    encryptNomineeBankField(ifsc, pariwarId, deps.encryption),
  ]);

  return {
    input: {
      accountRank: rank,
      accountHolderNameCiphertext,
      accountNumberCiphertext,
      ifscCiphertext,
      bankName: resolved.bankName,
      branch: resolved.branch,
      ifscValidated: true,
    },
    bankName: resolved.bankName,
    branch: resolved.branch,
  };
}

/**
 * The shared collection core. Runs the ownership + D3 guard FIRST (against the scoped tx), validates
 * + encrypts both accounts, records them in a dedicated committed scope-tx, then emits the post-commit
 * audit. Returns the NON-PII presence response.
 */
async function recordNomineeBank(
  deps: AppDeps,
  request: FastifyRequest,
  guardTx: ScopeTx,
  body: RecordNomineeBankRequest,
  input: RecordInput,
): Promise<RecordNomineeBankResponse> {
  // (1) Ownership + D3 collectable-window guard FIRST — a clean signal before any write.
  const claimRow = await claim.getClaimCase(guardTx.tx, input.pariwarId, input.claimCaseId);
  if (!claimRow) throw new NotFoundError('Claim not found', 'claim.not_found');
  // Member-app: the session member may only write against their OWN claim (no cross-claim oracle).
  if (input.requireDeceasedMemberId && claimRow.deceasedMemberId !== input.requireDeceasedMemberId) {
    throw new NotFoundError('Claim not found', 'claim.not_found');
  }
  // D3 tiers: the nominee window is open to any caller; the correction window only to an authorized
  // admin (allowCorrection). Anything else (pre-converged, frozen/published) is a clean 409 here (the
  // writer re-guards inside the tx + enforces the mandatory correction reason as the backstop).
  const editable =
    COLLECTABLE_STATES.has(claimRow.currentState) ||
    (input.allowCorrection === true && ADMIN_CORRECTION_STATES.has(claimRow.currentState));
  if (!editable) {
    throw new ConflictError(
      'Bank details cannot be recorded for the claim in its current state',
      'nominee_bank.not_collectable',
      { state: claimRow.currentState },
    );
  }
  // D3 tier-2: the two windows are disjoint (ADMIN_CORRECTION_STATES ∩ COLLECTABLE_STATES = ∅), so
  // reaching here with the claim in the correction window means this IS a correction attempt — the
  // route preHandler only proved the tier-1 permission; require the tier-2 one now (review finding,
  // 2026-07-11).
  if (input.allowCorrection === true && ADMIN_CORRECTION_STATES.has(claimRow.currentState)) {
    input.assertCorrectionAuthorized?.();
  }

  // (2) Validate + encrypt both accounts (rank #1, #2 by array position). A bad IFSC throws here —
  // BEFORE any persistence, so a rejected account is never stored.
  const prepared = await Promise.all(
    body.accounts.map((entry, i) => prepareAccount(deps, input.pariwarId, (i + 1) as 1 | 2, entry)),
  );

  // (3) Record in a dedicated committed scope-tx (the writer emits the identity annotation event).
  const scopeTx = await openScopeTx(deps, input.pariwarId);
  let ok = false;
  let corrected = false;
  try {
    const result = await claim.recordClaimNomineeBankAccounts(scopeTx.client, {
      claimCaseId: input.claimCaseId,
      pariwarId: input.pariwarId,
      accounts: prepared.map((p) => p.input),
      recordedByActor: input.actorId,
      actor: input.actor,
      ...(input.allowCorrection !== undefined ? { allowCorrection: input.allowCorrection } : {}),
      ...(input.correctionReason !== undefined ? { correctionReason: input.correctionReason } : {}),
    });
    corrected = result.corrected;
    ok = true;
  } catch (err) {
    translateNomineeBankError(err);
  } finally {
    await closeScopeTx(scopeTx, ok);
  }

  const ifscValidated = prepared.every((p) => p.input.ifscValidated);

  // (4) POST-COMMIT audit — NON-PII only. A correction adds the `corrected` flag + the operator's
  //     justification (the convergence-override "audited reason" precedent — operational, NOT PII).
  emitAuthAudit(deps, request, input.actor === 'member' ? 'member_claim.nominee_bank_recorded' : 'helpline_claim.nominee_bank_recorded', {
    actorId: input.actorId,
    pariwarId: input.pariwarId,
    context: {
      claim_case_id: input.claimCaseId,
      account_ranks_present: prepared.map((p) => p.input.accountRank),
      ifsc_validated: ifscValidated,
      intake_channel: input.actor === 'member' ? 'member_app' : 'helpline',
      corrected,
      ...(corrected && input.correctionReason ? { correction_reason: input.correctionReason } : {}),
    },
  });

  return {
    accounts: prepared.map((p) => ({
      rank: p.input.accountRank,
      bankName: p.bankName,
      ifscValidated: p.input.ifscValidated,
      holderNamePresent: true,
    })),
  };
}

/**
 * The NON-PII presence view of whatever is currently on file for a claim (review finding,
 * 2026-07-11) — `[]` when nothing has been recorded yet (AC3 "absence is a signal"), both accounts
 * once recorded. No decryption: rank/bankName/ifscValidated are already non-PII plain columns.
 */
async function nomineeBankStatus(
  tx: ScopeTx['tx'],
  pariwarId: ids.PariwarId,
  claimCaseId: ids.ClaimId,
): Promise<NomineeBankStatusResponse> {
  const rows = await claim.getClaimNomineeBankAccountsCiphertext(tx, pariwarId, claimCaseId);
  return {
    accounts: rows.map((row) => ({
      rank: row.accountRank as 1 | 2,
      bankName: row.bankName,
      ifscValidated: row.ifscValidated,
      holderNamePresent: true,
    })),
  };
}

/** Resolve an IFSC to its public bank/branch (shared by both surfaces). A malformed or unknown IFSC
 *  is a dignified 404 (Pattern-4). */
async function lookupIfsc(deps: AppDeps, ifscRaw: string): Promise<IfscLookupResponse> {
  const ifsc = ifscRaw.toUpperCase();
  if (!IFSC_REGEX.test(ifsc)) {
    throw new NotFoundError("We couldn't recognize that IFSC — please check it.", 'nominee_bank.ifsc_unrecognized');
  }
  const resolved = await deps.bankIfscLookup.lookup(ifsc);
  if (!resolved) {
    throw new NotFoundError("We couldn't recognize that IFSC — please check it.", 'nominee_bank.ifsc_unrecognized');
  }
  return { ifsc, bankName: resolved.bankName, branch: resolved.branch };
}

export function createNomineeBankHandlers(deps: AppDeps) {
  function memberCtx(request: FastifyRequest): { memberIdStr: string; pariwarIdStr: string } {
    const memberIdStr = request.requestContext.actorId;
    const pariwarIdStr = request.requestContext.pariwarId;
    if (!memberIdStr || !pariwarIdStr) {
      throw new UnauthorizedError('Authentication required', 'auth.session_required');
    }
    return { memberIdStr, pariwarIdStr };
  }

  return {
    /** GET /api/v1/member/claims/ifsc/:ifsc — member-app IFSC lookup (public bank/branch). */
    async ifscLookupMember(request: FastifyRequest, reply: FastifyReply): Promise<IfscLookupResponse> {
      const { ifsc } = request.params as { ifsc: string };
      const body = await lookupIfsc(deps, ifsc);
      void reply.status(200);
      return body;
    },

    /** GET /api/v1/p/:pariwarId/admin/claims/ifsc/:ifsc — helpline IFSC lookup (public bank/branch). */
    async ifscLookupHelpline(request: FastifyRequest, reply: FastifyReply): Promise<IfscLookupResponse> {
      const { ifsc } = request.params as { ifsc: string };
      const body = await lookupIfsc(deps, ifsc);
      void reply.status(200);
      return body;
    },

    /**
     * GET /api/v1/member/claims/:claimCaseId/nominee-bank — member-app presence view of whatever is
     * currently on file (review finding, 2026-07-11). Claim-ownership asserted (a member cannot probe
     * another member's claim — the same oracle guard `recordMember` applies). No step-up: read-only,
     * NON-PII (no account number / holder name / raw IFSC).
     */
    async getStatusMember(request: FastifyRequest, reply: FastifyReply): Promise<NomineeBankStatusResponse> {
      const { memberIdStr, pariwarIdStr } = memberCtx(request);
      const { claimCaseId } = request.params as { claimCaseId: string };
      const pariwarId = ids.pariwarId(pariwarIdStr);
      const claimCaseIdBrand = ids.claimId(claimCaseId);
      const tx = await openScopeTx(deps, pariwarIdStr);
      let ok = false;
      try {
        const claimRow = await claim.getClaimCase(tx.tx, pariwarId, claimCaseIdBrand);
        if (!claimRow || claimRow.deceasedMemberId !== ids.memberId(memberIdStr)) {
          throw new NotFoundError('Claim not found', 'claim.not_found');
        }
        const body = await nomineeBankStatus(tx.tx, pariwarId, claimCaseIdBrand);
        ok = true;
        void reply.status(200);
        return body;
      } finally {
        await closeScopeTx(tx, ok);
      }
    },

    /**
     * GET /api/v1/p/:pariwarId/admin/claims/:claimCaseId/nominee-bank — helpline presence view.
     * Permission-gated only (claim.manage_nominee_bank) — a read mutates nothing, so no step-up
     * (mirrors the IFSC lookup route's posture). Tenant-scoped by the ambient scope tx (RLS +
     * explicit predicate).
     */
    async getStatusHelpline(request: FastifyRequest, reply: FastifyReply): Promise<NomineeBankStatusResponse> {
      const scopeTx = request.scopeTx;
      if (!scopeTx) {
        throw new UnauthorizedError('Authentication required', 'auth.session_required');
      }
      const { claimCaseId } = request.params as { claimCaseId: string };
      void reply.status(200);
      return nomineeBankStatus(scopeTx.tx, ids.pariwarId(scopeTx.pariwarId), ids.claimId(claimCaseId));
    },

    /**
     * POST /api/v1/member/claims/:claimCaseId/nominee-bank — member-app (Ravi-mode) dual-account
     * collection. Opens its own scope tx for the guard read + the write.
     */
    async recordMember(request: FastifyRequest, reply: FastifyReply): Promise<RecordNomineeBankResponse> {
      const { memberIdStr, pariwarIdStr } = memberCtx(request);
      const { claimCaseId } = request.params as { claimCaseId: string };
      const body = request.body as RecordNomineeBankRequest;
      const guardTx = await openScopeTx(deps, pariwarIdStr);
      let body_: RecordNomineeBankResponse;
      let ok = false;
      try {
        body_ = await recordNomineeBank(deps, request, guardTx, body, {
          claimCaseId: ids.claimId(claimCaseId),
          pariwarId: ids.pariwarId(pariwarIdStr),
          actorId: memberIdStr,
          actor: 'member',
          requireDeceasedMemberId: ids.memberId(memberIdStr),
        });
        ok = true;
      } finally {
        // The guard tx is read-only (the mutation ran on its own committed tx inside recordNomineeBank);
        // close it either way. `ok` reflects whether the core returned without throwing.
        await closeScopeTx(guardTx, ok);
      }
      void reply.status(201);
      return body_;
    },

    /**
     * POST /api/v1/p/:pariwarId/admin/claims/:claimCaseId/nominee-bank — helpline operator
     * collection. Rides the scope-resolution middleware's scope tx (request.scopeTx) for the guard read.
     */
    async recordHelpline(request: FastifyRequest, reply: FastifyReply): Promise<RecordNomineeBankResponse> {
      const scopeTx = request.scopeTx;
      const operatorId = request.requestContext.actorId;
      if (!scopeTx || !operatorId) {
        throw new UnauthorizedError('Authentication required', 'auth.session_required');
      }
      const { claimCaseId } = request.params as { claimCaseId: string };
      const body = request.body as RecordNomineeBankHelplineRequest;
      const out = await recordNomineeBank(deps, request, scopeTx, { accounts: body.accounts }, {
        claimCaseId: ids.claimId(claimCaseId),
        pariwarId: ids.pariwarId(scopeTx.pariwarId),
        actorId: operatorId,
        actor: 'operator',
        // Authorized admin — may correct in the post-approval window (D3 tier-2); reason threaded.
        allowCorrection: true,
        // The tier-2 permission gate (review finding, 2026-07-11) — the route preHandler only
        // proved claim.manage_nominee_bank; this additionally requires claim.correct_nominee_bank,
        // called ONLY once recordNomineeBank confirms a correction is actually being attempted (the
        // claim.override_ground_inspection resolveInspectorOverride pattern).
        assertCorrectionAuthorized: () => {
          const grants = request.scopeGrants ?? [];
          const result = rbac.checkPermission(
            {
              actorId: operatorId,
              grants,
              key: CLAIM_CORRECT_NOMINEE_BANK_KEY,
              resource: { dimension: 'pariwar', value: scopeTx.pariwarId, pariwarId: scopeTx.pariwarId },
            },
            { onAuthorizationDenied: auditAuthorizationDenied(deps, request, operatorId, scopeTx.pariwarId) },
          );
          if (!result.ok) throw result.error; // AuthorizationDeniedError → structured 403
        },
        ...(body.correctionReason !== undefined ? { correctionReason: body.correctionReason } : {}),
      });
      void reply.status(201);
      return out;
    },
  };
}
