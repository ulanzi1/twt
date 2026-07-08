// The real SMS-DLT step-up / login OTP delivery adapter — Story 5.9 (AC1; Task 2).
//
// Replaces the `createLogStepUpDelivery` reveal stub as the PRODUCTION `StepUpOtpDeliveryPort` for the two
// MEMBER call sites (login-OTP send + step-up-request). It is the FIRST live caller of the real SMS gateway
// Story 5.6 built (`SmsMessagingHandle` + `classifySmsError`) — but only the single-target OTP path, on the
// OTP rate budget (`otp_rate_buckets`, enforced by the Story 3.2 pre-handler), NEVER the transactional
// `sms_rate_buckets`.
//
// ── Direct + time-critical — NOT a `dispatch` fan-out (Reconciliation R1) ────────────────────────────────
// The frozen `step_up_otp` Alert payload carries NO code (it is deep-frozen + audited + HMAC-hashed — a
// secret must never enter that pipeline). So OTP delivery is a DIRECT SMS-DLT provider send with the code in
// a dedicated OTP DLT template body — it does NOT go through `dispatch`, `evaluateCostOptimization`, or
// `evaluateDegradedModeBridge` (never batched / suppressed / deferred). There is still NO live `dispatch`
// call site after this story ([[project_channels_no_live_dispatch_yet]]).
//
// ── Honest accept/reject — a rejected send NEVER resolves (AC1 #2) ───────────────────────────────────────
// On gateway accept `deliver` resolves `{ channel: 'sms', status: 'accepted', gatewayMessageId }`. On ANY
// non-accept (no delivery target, invalid number, DLT template not approved / content mismatch, carrier
// reject, gateway 4xx/5xx, network) it THROWS a classified `StepUpDeliveryError` (no PII) — so the existing
// caller catch-path fires (audit `*.failure` + `onPrimaryDeliveryFailure` + propagate a retriable error). We
// deliberately do NOT copy Story 5.6's provider "never throws / resolve rejected" posture — that is for a
// best-effort fan-out with a lower rung; an OTP send has no lower rung and its success is load-bearing.
//
// ── Single attempt, no internal retry — "resend" is user-driven ──────────────────────────────────────────
// `deliver` makes ONE gateway send attempt; on error it throws immediately. "Resend" is the user re-hitting
// the OTP request endpoint, which mints a BRAND-NEW code (`invalidateLiveOtps`) — never a same-code redelivery.
//
// ── Secrets discipline ───────────────────────────────────────────────────────────────────────────────────
// The OTP code + the member mobile are the two secrets. The code appears ONLY in the outbound SMS body (via
// the OTP DLT template variable). The E.164 mobile is decrypted ONLY here (the composition layer), never
// logged. The gateway credential + template-id NAMEs resolve to values only at send time, never logged
// (AI-4-3(c)). No thrown `StepUpDeliveryError` message carries the code or the mobile.
//
// ── KNOWN v1 gap (same as 5.6/WA): no client-cache eviction on credential rotation → restart-required. ────

import { classifySmsError, resolveOtpTemplate, renderOtpBody, type SmsMessagingHandle } from '@twt/channels';
import { ids, waOptIn, type Db } from '@twt/domain';

import type { EncryptionDeps } from '../../../context.js';
import { decryptMobile } from './mobile-index.js';
import {
  StepUpDeliveryError,
  type StepUpDeliveryResult,
  type StepUpOtpDelivery,
  type StepUpOtpDeliveryPort,
} from './step-up-delivery.js';

/** What the real SMS-DLT OTP adapter needs (all resolved once at boot; restart-required-on-rotation). */
export interface SmsDltStepUpDeliveryDeps {
  /** The Story 5.6 gateway send seam (built from the resolved global credential + PE/OE sender header). */
  readonly messaging: SmsMessagingHandle;
  /**
   * A Db handle for the `step_up` member-mobile decrypt read. The lookup is keyed by (pariwarId, memberId)
   * — globally unique — so a BYPASSRLS handle (`serviceDb`) with the explicit tenant filter is the R2
   * pre-scope read pattern (mirrors `getMemberMobileBlindIndex(servicePool, memberId)` in the same handler).
   */
  readonly db: Db;
  /** Encryption material to decrypt the member's Tier-1 mobile → the SMS recipient E.164 (composition-layer only). */
  readonly encryption: EncryptionDeps;
  /**
   * Resolve a global config / Secret-Manager NAME → its value (the OTP DLT template id) at send time. Never
   * hardcoded / logged / audited (AI-4-3(c)). Returns null/blank when unresolvable ⇒ `no_delivery_target`.
   */
  readonly resolveConfig: (configKey: string) => Promise<string | null>;
}

/**
 * Assert the discriminated-union payload carries EXACTLY the intent-correct field (belt-and-braces beyond the
 * compile-time union — a JS caller / a widened type can still hand a malformed bag). Rejects the wrong field
 * for the intent (or both, or neither) with a PII-free `invalid_payload`.
 */
// ── Send timeout (Story 5.9 review) — an AUTH-policy budget, not a provider concern ────────────────────────
// `SmsMessagingHandle.send` has no timeout/abort signal (Story 5.6 keeps the generic provider timeout-agnostic
// — other future consumers may legitimately need a different budget). A member's login/step-up HTTP request
// must not hang forever on a stalled gateway, so THIS caller bounds the wait. On expiry the wait is abandoned
// (not cancelled — there is no abort signal to cancel with) and classified as an `unknown` StepUpDeliveryError,
// same failure path as any other rejection: no retry, no fallback channel, existing audit/failure flow intact.
const SEND_TIMEOUT_MS = 10_000;

function withSendTimeout<T>(pending: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new StepUpDeliveryError('unknown', 'sms otp send rejected: timeout')),
      timeoutMs,
    );
    pending.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err: unknown) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

function assertPayloadShape(payload: StepUpOtpDelivery): void {
  const bag = payload as { resolvedMobile?: unknown; pariwarId?: unknown };
  if (payload.intent === 'login') {
    if (bag.pariwarId != null) {
      throw new StepUpDeliveryError('invalid_payload', 'login intent must not carry pariwarId');
    }
    if (typeof bag.resolvedMobile !== 'string' || bag.resolvedMobile.trim() === '') {
      throw new StepUpDeliveryError('no_delivery_target', 'login intent requires a resolvedMobile');
    }
  } else if (payload.intent === 'step_up') {
    if (bag.resolvedMobile != null) {
      throw new StepUpDeliveryError('invalid_payload', 'step_up intent must not carry resolvedMobile');
    }
  } else {
    throw new StepUpDeliveryError('invalid_payload', 'unknown delivery intent');
  }
}

/**
 * Create the production SMS-DLT `StepUpOtpDeliveryPort`. `deliver` resolves the E.164 recipient per intent,
 * renders the OTP into the intent's dedicated DLT template, and posts a single send via the gateway seam —
 * resolving on accept, throwing a classified `StepUpDeliveryError` (no PII) on any non-accept.
 */
export function createSmsDltStepUpDelivery(deps: SmsDltStepUpDeliveryDeps): StepUpOtpDeliveryPort {
  /** Resolve the E.164 recipient per intent (login: caller-supplied; step_up: decrypt). Throws on no target. */
  async function resolveRecipient(payload: StepUpOtpDelivery): Promise<string> {
    if (payload.intent === 'login') {
      // The caller already holds the canonical E.164 (validated by assertPayloadShape) — no decrypt.
      return payload.resolvedMobile;
    }
    // step_up — decrypt the member's Tier-1 mobile via the Story 5.6 path (composition layer only).
    if (!payload.pariwarId) {
      throw new StepUpDeliveryError('no_delivery_target', 'step_up intent is missing pariwarId');
    }
    const ciphertext = await waOptIn.getMemberMobileCiphertext(deps.db, {
      pariwarId: payload.pariwarId as ids.PariwarId,
      memberId: payload.actorId as ids.MemberId,
    });
    if (!ciphertext) {
      throw new StepUpDeliveryError('no_delivery_target', 'no member identity row for step_up recipient');
    }
    return decryptMobile(ciphertext, deps.encryption);
  }

  return {
    async deliver(payload: StepUpOtpDelivery): Promise<StepUpDeliveryResult> {
      try {
        assertPayloadShape(payload);
        const to = await resolveRecipient(payload);

        // Select the per-intent OTP DLT template + resolve its TRAI id from the global NAME pointer at send time.
        const template = resolveOtpTemplate(payload.intent);
        const dltTemplateId = await deps.resolveConfig(template.dltTemplateIdConfigKey);
        if (!dltTemplateId || dltTemplateId.trim() === '') {
          throw new StepUpDeliveryError('no_delivery_target', 'OTP DLT template id NAME resolved to blank');
        }

        // Build the gateway message with the SECRET code in the single variable slot (never logged/audited).
        const body = renderOtpBody(template, payload.code);
        let gatewayMessageId: string;
        try {
          gatewayMessageId = await withSendTimeout(
            deps.messaging.send({ to, dltTemplateId, body }),
            SEND_TIMEOUT_MS,
          );
        } catch (err) {
          // A timeout is already a classified StepUpDeliveryError (withSendTimeout) — pass it through as-is.
          if (err instanceof StepUpDeliveryError) throw err;
          // Otherwise classify via 5.6's PII-free classifier; the thrown error carries NO code / mobile.
          const { errorClass } = classifySmsError(err);
          throw new StepUpDeliveryError(errorClass, `sms otp send rejected: ${errorClass}`);
        }
        return { channel: 'sms', status: 'accepted', gatewayMessageId };
      } catch (err) {
        // Any failure ABOVE the gateway send (recipient decrypt, config/secret resolution — a DB or
        // Secret-Manager throw) must still surface as a classified, PII-free StepUpDeliveryError, never a raw
        // error escaping the port's documented contract (Story 5.9 review).
        if (err instanceof StepUpDeliveryError) throw err;
        throw new StepUpDeliveryError('unknown', 'sms otp delivery failed: unclassified error');
      }
    },
  };
}
