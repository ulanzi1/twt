// StepUpOtpDeliveryPort — the delivery seam for step-up / login OTP codes.
//
// Reconciliation R3: §2.2 commits step-up delivery via SMS-DLT-transactional. epics.md L2235-2248 splits
// ownership: Story 1.9 owns the gating decision + OTP mechanism; Story 5.6/5.9 owns transport. → This port
// is the boundary. Story 1.9 shipped the dev/log stub; Story 5.9 lands the REAL SMS-DLT adapter
// (`sms-step-up-delivery.ts`) as the production default for the MEMBER call sites.
//
// The middleware owns the gating decision; the channel owns transport — so this interface deliberately knows
// nothing about HTTP, sessions, or gating.
//
// ── The payload is a DISCRIMINATED UNION on `intent` (Story 5.9, Task 2) ─────────────────────────────────
// The two member call sites hand the adapter DIFFERENT things — mobile resolution is per-intent, not one
// uniform decrypt path:
//   · `login`   → the caller already holds the canonical E.164 mobile (at OTP-request time no member is
//                 resolved yet — `actorId` is a mobile blind index, NOT a MemberId — so no decrypt is
//                 possible). It threads `resolvedMobile` directly. `pariwarId` is FORBIDDEN.
//   · `step_up` → `actorId` IS a real MemberId + `pariwarId` is available; the adapter decrypts the member's
//                 Tier-1 mobile via the Story 5.6 path. `resolvedMobile` is FORBIDDEN.
// Modelled as a union (`?: never` on the forbidden field) rather than flat optionals so a future caller
// cannot double-populate (or leave empty) both fields with no compile-time signal.

/** The OTP delivery intent — selects the per-intent mobile-resolution path AND the OTP DLT template. */
export type StepUpOtpIntent = 'login' | 'step_up';

/** The fields every OTP delivery carries, regardless of intent. */
interface StepUpOtpDeliveryCommon {
  /** The plaintext OTP — delivered to the actor, NEVER persisted (only its hash is) / logged / audited. */
  readonly code: string;
  /**
   * The actor the code is for. For `login` this is the MOBILE BLIND INDEX (no member resolved yet —
   * enumeration safety); for `step_up` this is the real MemberId (used for the decrypt lookup).
   */
  readonly actorId: string;
  /** The operation the step-up gates (for the audit `action_context`). */
  readonly actionContext: string;
  /** Optional destination hint (e.g. masked mobile) — distinct from the real `resolvedMobile`. */
  readonly destinationHint?: string;
}

export type StepUpOtpDelivery =
  | (StepUpOtpDeliveryCommon & {
      readonly intent: 'login';
      /**
       * The canonical E.164 mobile the caller already holds (login: no member resolved yet, so no decrypt).
       * REQUIRED for `login`.
       */
      readonly resolvedMobile: string;
      /** FORBIDDEN for `login` (no member/tenant resolved at OTP-request time). */
      readonly pariwarId?: never;
    })
  | (StepUpOtpDeliveryCommon & {
      readonly intent: 'step_up';
      /**
       * The tenant for the member-mobile decrypt path (`getMemberMobileCiphertext(db, {pariwarId, memberId})`).
       * REQUIRED for `step_up`. May be `null` at a call site that never reaches the real SMS adapter (the
       * admin path uses the always-stub delivery) — the adapter treats a null tenant as `no_delivery_target`.
       */
      readonly pariwarId: string | null;
      /** FORBIDDEN for `step_up` (the adapter decrypts the mobile itself). */
      readonly resolvedMobile?: never;
    });

/**
 * The outcome of a delivery attempt — recorded in the send audit as `delivery_channel` / `delivery_status`
 * (Story 5.9, Task 3). The real SMS-DLT adapter returns `{ channel: 'sms', status: 'accepted', … }` on a
 * gateway accept; the dev/log stub returns `{ channel: 'log', status: 'stub' }`.
 */
export interface StepUpDeliveryResult {
  readonly channel: 'sms' | 'log';
  readonly status: 'accepted' | 'stub';
  /** The gateway message id on a real accept (for send-audit / observability). Absent for the stub. */
  readonly gatewayMessageId?: string;
}

export interface StepUpOtpDeliveryPort {
  /**
   * Deliver the OTP. Resolves with the delivery result on ACCEPTANCE; on ANY non-accept (invalid number,
   * DLT template not approved, carrier reject, gateway 4xx/5xx, network, no delivery target) the real
   * adapter THROWS a `StepUpDeliveryError` — the caller's catch then audits a `*.failure` line + calls
   * `onPrimaryDeliveryFailure` + propagates a retriable error. A rejected OTP send must NEVER resolve.
   */
  deliver(delivery: StepUpOtpDelivery): Promise<StepUpDeliveryResult>;
  /** Called iff the primary delivery channel throws. Use for alerting / fallback (P29 / D2). */
  onPrimaryDeliveryFailure?: (delivery: StepUpOtpDelivery, error: unknown) => void;
}

/**
 * A classified OTP-delivery failure — carries a STABLE, PII-FREE `errorClass` (never the code or mobile).
 * `no_delivery_target` (no resolvable recipient) or an `SmsErrorClass` value from the Story 5.6 classifier
 * (`invalid_number` / `dlt_template_not_approved` / `carrier_reject` / `rate_limited` / `api_unavailable` /
 * `auth` / `unknown`), plus `invalid_payload` for a malformed discriminated-union payload.
 */
export class StepUpDeliveryError extends Error {
  public readonly name = 'StepUpDeliveryError';
  public constructor(
    /** The stable, PII-free failure class. */
    public readonly errorClass: string,
    message?: string,
  ) {
    super(message ?? errorClass);
  }
}

/**
 * Dev/log stub (Epic 1). Logs that a code WOULD be sent — and, only when `revealForDev` is true (local dev /
 * tests), the code itself so a developer can complete the flow without SMS. NEVER reveal in production. The
 * real SMS-DLT adapter (`createSmsDltStepUpDelivery`) is the Story 5.9 production default for the member call
 * sites; the admin path keeps this stub in ALL environments (admin-mobile substrate deferred — R4).
 */
export function createLogStepUpDelivery(opts: { revealForDev: boolean }): StepUpOtpDeliveryPort {
  return {
    async deliver(delivery: StepUpOtpDelivery): Promise<StepUpDeliveryResult> {
      console.info(
        '[step-up-delivery:stub]',
        JSON.stringify({
          actorId: delivery.actorId,
          actionContext: delivery.actionContext,
          intent: delivery.intent,
          note: 'real SMS-DLT delivery is Story 5.9 — this is a dev/admin stub',
          ...(opts.revealForDev ? { devCode: delivery.code } : {}),
        }),
      );
      return { channel: 'log', status: 'stub' };
    },
  };
}
