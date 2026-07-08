// Member-app claim-filing service — Story 6.2 (Tasks 2 + 3; AC2/AC3).
//
// Two responsibilities, both orchestrated by claims.handlers.ts:
//   · the handover-trust OTP (AC2) — sent to the NOMINEE's declared mobile, verified from
//     Ravi's own phone, establishing the step-up elevation the intake route requires;
//   · the intake emission (AC3) — mint claim_case_id + project claim.intake_initiated,
//     idempotently (single-channel trivial-duplicate guard).
//
// ── Handover-trust OTP reuses the Story 3.2 member-OTP machinery (no new table) ────────
// The handover OTP is a fresh, transactional, single-target SMS-DLT OTP — architecturally
// the §2.2 step-up leg for claim filing (Dev Notes "Step-up OTP requirement"). It reuses:
//   · the `member_auth_otps` `step_up` pool (mint / invalidate-on-next / attempt-capped
//     verify / atomic burn), keyed on a SYNTHETIC `handover:<deceasedMemberId>` pool key
//     (namespaced so it can NEVER collide with a real mobile blind index — those are hex
//     HMAC outputs — eliminating any cross-talk with a member's real login/step-up OTPs);
//   · the `member_step_up_elevations` record as the handover-trust marker (action context
//     `claim_handover`) — the intake route gates on `requireMemberStepUp(deps,
//     'claim_handover')`, exactly the Story 3.9 nominee-change precedent;
//   · the `stepUpDelivery` port with the `login` intent variant — the variant that carries
//     an already-resolved E.164 (we decrypt the NOMINEE's Tier-1 mobile ourselves; the
//     `step_up` variant would instead decrypt the SESSION member's mobile — the wrong
//     target for Ravi-mode).
// This is why NO enum value / migration is added (Dev Notes "Decisions"). The nominee's
// mobile is decrypted ONLY to deliver + mask — never persisted, never the pool key.
//
// ── Intake idempotency (AC3, a hard requirement) ──────────────────────────────────────
// Filing a claim FREEZES an account, so a duplicate is not cosmetic. Two layers:
//   1. a transaction-scoped Postgres advisory lock on (pariwarId, deceasedMemberId)
//      serializes concurrent intakes for one death, so the route-level dedup read is
//      reliable even under a simultaneous double-submit;
//   2. the dedup read itself (`getClaimByDeceasedMember`) — if a claim already exists,
//      return it (no second `claim.intake_initiated`, no second freeze).
// The projector's `(stream_id, event_version)` unique index is a further backstop
// (ClaimStreamConcurrencyError → return the existing claim), though the advisory lock
// means it should never be reached in practice.

import { createHash, randomUUID } from 'node:crypto';

import { claim, ids, nominee as nomineeDomain } from '@twt/domain';
import type pg from 'pg';

import type { AppDeps } from '../../context.js';
import type { ScopeTx } from '../../types.js';
import { maskMobile, normalizeMobile } from '../auth/shared/mobile-index.js';
import { requestOtp, verifyOtp } from '../auth/member/member-otp.service.js';
import { hasFreshElevation, insertElevation } from '../auth/member/member-auth.repo.js';
import { decryptNomineeField } from '../nominee/nominee-crypto.js';

/** The step-up action context the handover-trust elevation is recorded under (the intake
 * route gates on it). */
export const CLAIM_HANDOVER_ACTION_CONTEXT = 'claim_handover';

/** Reuse the `step_up` OTP pool for the handover OTP (distinct TTL/attempt-cap machinery;
 * the synthetic pool key + expectedMemberId binding keep it fully isolated). */
const HANDOVER_OTP_INTENT = 'step_up' as const;

/** The freeform `trigger` audit note on the `claim.intake_initiated` payload (Story 6.1:
 * the trigger field is deliberately unconstrained — a descriptive string). */
const INTAKE_TRIGGER = 'member_app_ravi_intake';

/** The synthetic, collision-proof OTP-pool key for a death's handover OTP. Namespaced so it
 * can never equal a real mobile blind index (hex HMAC) — no cross-talk with login/step-up. */
function handoverPoolKey(deceasedMemberId: string): string {
  return `handover:${deceasedMemberId}`;
}

/** The transaction-scoped advisory-lock key for one death's intake (serializes concurrent
 * double-submits). Postgres advisory locks take a bigint — derive a stable one from the
 * (pariwarId, deceasedMemberId) pair via a truncated SHA-256. */
function intakeAdvisoryLockKey(pariwarId: string, deceasedMemberId: string): bigint {
  const hex = createHash('sha256').update(`${pariwarId}:${deceasedMemberId}`).digest('hex');
  // Take 15 hex chars (60 bits) → always positive, safely inside Postgres' signed
  // bigint advisory-lock arg (63 usable magnitude bits).
  return BigInt(`0x${hex.slice(0, 15)}`);
}

export interface HandoverOtpSendOutcome {
  /** Always true (existence defense — a member with no resolvable nominee gets the same
   * shape; the flow then routes to the helpline per AC5). */
  sent: true;
  /** Masked nominee mobile hint (`+91·····NNNN`), or '' when no nominee is resolvable. */
  nomineeMobileMasked: string;
  /** The SHA-256 hash of the delivered code, for the HMAC-keyed send audit (never the code);
   * `null` when nothing was sent. */
  otpHash: string | null;
}

/**
 * Send the handover-trust OTP to the deceased's PRIMARY nominee's declared mobile (AC2).
 * Reads the nominee row inside the tenant scope tx, Tier-1-decrypts the mobile, delivers the
 * code via the SMS-DLT seam, and persists only the hash. Returns an existence-defended
 * outcome (never reveals whether a nominee exists) + the hash for the caller's audit line.
 */
/** P6-style timing-equalization delay (mirrors member-auth.handlers.ts's withdrawn-member
 * guard) — the no-nominee and undeliverable-mobile early-returns below are otherwise
 * measurably faster than the real-SMS-send path, letting a caller distinguish "no nominee"
 * from "nominee, OTP sent" via response time despite the existence-defended return shape. */
async function timingEqualizeDelay(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 150 + Math.random() * 150));
}

export async function sendHandoverOtp(
  deps: AppDeps,
  scopeTx: ScopeTx,
  ctx: { deceasedMemberId: ids.MemberId; pariwarId: ids.PariwarId },
): Promise<HandoverOtpSendOutcome> {
  const nominees = await nomineeDomain.getMemberNominees(scopeTx.tx, ctx.pariwarId, ctx.deceasedMemberId);
  const primary = nominees[0]; // rank-ordered (primary first) by the accessor.
  if (!primary) {
    // No nominee to reach — existence-defended no-op; the UI routes to the helpline (AC5).
    await timingEqualizeDelay();
    return { sent: true, nomineeMobileMasked: '', otpHash: null };
  }

  const plaintextMobile = await decryptNomineeField(
    primary.mobileCiphertext,
    ctx.pariwarId,
    deps.encryption,
  );
  const canonical = normalizeMobile(plaintextMobile);
  if (canonical === null) {
    // Stored nominee mobile is not a deliverable Indian mobile — existence-defended no-op.
    await timingEqualizeDelay();
    return { sent: true, nomineeMobileMasked: '', otpHash: null };
  }
  const masked = maskMobile(canonical);

  const poolKey = handoverPoolKey(ctx.deceasedMemberId);
  const otp = await requestOtp(deps, HANDOVER_OTP_INTENT, poolKey, {
    memberId: ctx.deceasedMemberId,
    actionContext: CLAIM_HANDOVER_ACTION_CONTEXT,
  });

  // Deliver via the `login` intent variant — it carries an already-resolved E.164 (we hold
  // the NOMINEE's decrypted mobile). The `step_up` variant would decrypt the SESSION
  // member's mobile — the wrong target for Ravi-mode. The plaintext mobile + code appear
  // ONLY in the outbound SMS; never logged/audited/persisted (only the hash is).
  await deps.stepUpDelivery.deliver({
    intent: 'login',
    code: otp.code,
    actorId: poolKey,
    actionContext: CLAIM_HANDOVER_ACTION_CONTEXT,
    resolvedMobile: canonical,
    destinationHint: masked,
  });

  return { sent: true, nomineeMobileMasked: masked, otpHash: otp.otpHash };
}

export interface HandoverOtpVerifyOutcome {
  verified: boolean;
  /** The consumed OTP's hash on success (for the HMAC-keyed consume audit); else null. */
  otpHash: string | null;
}

/**
 * Verify a submitted handover-trust OTP (AC2). Attempt-capped + single-use-burn via the
 * shared member-OTP verify; on success records the `claim_handover` step-up elevation the
 * intake route requires. A wrong/expired/absent code returns `{ verified: false }` (the
 * caller renders the dignified generic Pattern-4 message).
 */
export async function verifyHandoverOtp(
  deps: AppDeps,
  ctx: { deceasedMemberId: ids.MemberId },
  code: string,
): Promise<HandoverOtpVerifyOutcome> {
  const poolKey = handoverPoolKey(ctx.deceasedMemberId);
  const result = await verifyOtp(deps, HANDOVER_OTP_INTENT, poolKey, code, {
    expectedMemberId: ctx.deceasedMemberId,
  });
  if (!result.ok || result.actionContext !== CLAIM_HANDOVER_ACTION_CONTEXT) {
    // A wrong-code failure still carries the attempted-against OTP's hash (when a live OTP
    // was found to check against) so the handover_otp_failure audit line can be correlated
    // to the OTP being brute-forced, rather than always logging a bare failure.
    return { verified: false, otpHash: result.otpHash ?? null };
  }

  const now = deps.clock();
  await insertElevation(deps.pool, {
    memberId: ctx.deceasedMemberId,
    actionContext: CLAIM_HANDOVER_ACTION_CONTEXT,
    elevatedUntil: new Date(now.getTime() + deps.config.stepUpElevatedMs),
  });
  return { verified: true, otpHash: result.otpHash };
}

/** True iff a fresh handover-trust elevation exists for the member (belt-and-braces beyond
 * the route preHandler — used by the intake handler's defensive re-check). */
export async function hasHandoverTrust(deps: AppDeps, deceasedMemberId: string): Promise<boolean> {
  return hasFreshElevation(deps.pool, deceasedMemberId, CLAIM_HANDOVER_ACTION_CONTEXT, deps.clock());
}

export interface IntakeOutcome {
  claimCaseId: string;
  state: string;
  /** True when this call minted a NEW claim (freeze fired); false on an idempotent hit. */
  created: boolean;
}

/**
 * Mint `claim_case_id` + project `claim.intake_initiated` for the deceased member,
 * idempotently (AC3). MUST run inside the caller's scope tx (pariwar scope already set) —
 * it passes the raw `scopeTx.client` to the projector. Acquires a tx-scoped advisory lock
 * on the death, then dedups: returns any existing claim instead of a second freeze.
 */
export async function initiateIntake(
  deps: AppDeps,
  scopeTx: ScopeTx,
  input: {
    deceasedMemberId: ids.MemberId;
    pariwarId: ids.PariwarId;
    auditId: string;
  },
): Promise<IntakeOutcome> {
  const client: pg.PoolClient = scopeTx.client;
  const deceasedMemberIdStr = String(input.deceasedMemberId);

  // (1) Serialize concurrent intakes for THIS death so the dedup read is race-safe. The
  // lock is transaction-scoped — released on COMMIT/ROLLBACK, no explicit unlock needed.
  await client.query('SELECT pg_advisory_xact_lock($1)', [
    intakeAdvisoryLockKey(input.pariwarId, input.deceasedMemberId).toString(),
  ]);

  // (2) Route-level dedup: an existing claim for this death → return it (no second freeze).
  const existing = await claim.getClaimByDeceasedMember(scopeTx.tx, input.pariwarId, input.deceasedMemberId);
  if (existing) {
    return { claimCaseId: existing.claimCaseId, state: existing.currentState, created: false };
  }

  const claimCaseId = ids.claimId(randomUUID());
  try {
    const result = await claim.projectClaimState(client, {
      claimCaseId,
      pariwarId: input.pariwarId,
      deceasedMemberId: input.deceasedMemberId,
      intakeChannels: ['member_app'],
      // v1 null-claimant policy (Dev Notes "Decisions" #1): no distinct Ravi actor entity;
      // the claims.claimant_actor_id is null, the acting session member is the audit actor.
      claimantActorId: null,
      eventType: 'claim.intake_initiated',
      payload: {
        from_state: null,
        to_state: 'intake_pending',
        trigger: INTAKE_TRIGGER,
        actor: 'member',
        // THE PINNED SEAM: snake_case `deceased_member_id` or the account-frozen overlay
        // never fires (member/overlay.ts:97 matches `payload ->> 'deceased_member_id'`).
        deceased_member_id: deceasedMemberIdStr,
        intake_channel: 'member_app',
        claimant_actor_id: null,
      },
      actorId: deceasedMemberIdStr,
      auditId: input.auditId,
    });
    return { claimCaseId: String(claimCaseId), state: result.state, created: true };
  } catch (err) {
    // Backstop (should be unreachable under the advisory lock): a concurrent submit that
    // slipped past layer 1 collided at the (stream_id, event_version) unique index. Re-read
    // and return the existing claim rather than surfacing a 500.
    if (err instanceof claim.ClaimStreamConcurrencyError) {
      const raced = await claim.getClaimByDeceasedMember(scopeTx.tx, input.pariwarId, input.deceasedMemberId);
      if (raced) {
        return { claimCaseId: raced.claimCaseId, state: raced.currentState, created: false };
      }
    }
    throw err;
  }
}
