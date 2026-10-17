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
//
// ── Story 6.37 (MSG91 — `2026-10-17-345` MG2 / MG3 / MG5; ADR-0041) ─────────────────────────────────────────
// The code goes through MSG91's Flow API like every other text (MG2 — ⛔ SendOTP): the message carries MSG91's template
// id and the ONE named value `otp` (TV13); the rendered body stays the oracle, ⛔ sent. ⭐ The pre-flight is ADVISORY here
// at runtime: `deliver` reads the process memo FIRE-AND-FORGET (⛔ awaited — ⛔ latency added to the bound) and a fault or
// a transient is only REPORTED; the code is STILL sent — ⛔ a login is ever refused by the pre-flight after boot (the
// boot check in `deps.ts` is the gate).

import {
  classifySmsError,
  resolveOtpTemplate,
  renderOtpBody,
  substituteDltValues,
  type Msg91PreflightMemo,
  type Msg91PreflightResult,
  type SmsMessagingHandle,
} from '@twt/channels';
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
  /**
   * Story 6.37 (MG5) — the ADVISORY runtime pre-flight: the api's process memo and where a non-pass is reported (the
   * template's config key and the verdict — ⛔ the id, ⛔ the code, ⛔ the number). Absent ⇒ ⛔ re-check.
   */
  readonly preflight?: {
    readonly memo: Msg91PreflightMemo;
    readonly report: (configKey: string, verdict: Exclude<Msg91PreflightResult, { ok: true }>) => void;
  };
}

/**
 * Assert the discriminated-union payload carries EXACTLY the intent-correct field (belt-and-braces beyond the
 * compile-time union — a JS caller / a widened type can still hand a malformed bag). Rejects the wrong field
 * for the intent (or both, or neither) with a PII-free `invalid_payload`.
 */
// ── Send timeout (Story 5.9 review) — an AUTH-policy budget, not a provider concern ────────────────────────
// A member's login/step-up HTTP request must not hang forever on a stalled gateway, so THIS caller bounds the wait.
// On expiry the wait is abandoned (not cancelled) and classified as an `unknown` StepUpDeliveryError, same failure
// path as any other rejection: no retry, no fallback channel, existing audit/failure flow intact. ⭐ Story 6.37
// (MG9): the MSG91 client now carries its OWN 9 s abort, started synchronously at `send` — so it fires FIRST and the
// class is deterministic (`api_unavailable`); this 10 s bound is the backstop for a non-MSG91 handle.
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
  const bag = payload as { resolvedMobile?: unknown; pariwarId?: unknown; template?: unknown };
  if (payload.intent === 'login') {
    if (bag.pariwarId != null) {
      throw new StepUpDeliveryError('invalid_payload', 'login intent must not carry pariwarId');
    }
    // Story 6.34 TV9 (`-322` C4): the only template override is `'step_up'` — ⛔ any other value.
    if (bag.template !== undefined && bag.template !== 'step_up') {
      throw new StepUpDeliveryError('invalid_payload', "login intent's template may only be 'step_up'");
    }
    if (typeof bag.resolvedMobile !== 'string' || bag.resolvedMobile.trim() === '') {
      throw new StepUpDeliveryError('no_delivery_target', 'login intent requires a resolvedMobile');
    }
  } else if (payload.intent === 'step_up') {
    if (bag.resolvedMobile != null) {
      throw new StepUpDeliveryError('invalid_payload', 'step_up intent must not carry resolvedMobile');
    }
    // Story 6.34 TV9 (`-322` C4): one-way — a step_up code is ⛔ ever switched to another text.
    if (bag.template !== undefined) {
      throw new StepUpDeliveryError('invalid_payload', 'step_up intent must not carry a template');
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
        // Story 6.34 TV9: a `login` payload may select the step-up TEXT (the claim handover's 3-minute code); the
        // recipient above still followed `intent`.
        const template = resolveOtpTemplate(payload.template ?? payload.intent);
        const resolvedId = await deps.resolveConfig(template.dltTemplateIdConfigKey);
        if (!resolvedId || resolvedId.trim() === '') {
          throw new StepUpDeliveryError('no_delivery_target', 'OTP DLT template id NAME resolved to blank');
        }
        const templateId = resolvedId.trim();

        // MG5 — the ADVISORY re-check, OFF the request path: ⛔ awaited, a non-pass is only reported.
        if (deps.preflight !== undefined) {
          const { memo, report } = deps.preflight;
          void memo
            .get({ text: template.contentTemplate, slots: template.slots }, templateId)
            .then((verdict) => {
              if (!verdict.ok) report(template.dltTemplateIdConfigKey, verdict);
            })
            .catch(() => undefined);
        }

        // Build the gateway message with the SECRET code as the template's ONE named value (TV13's `otp`; never
        // logged/audited) — MG3: the value must rebuild the rendered body through the registered text, ⛔ sent.
        const body = renderOtpBody(template, payload.code);
        const values = template.slots.map((slot) => ({ name: slot.name, value: payload.code }));
        if (values.length !== 1 || substituteDltValues(template.contentTemplate, template.slots, values) !== body) {
          throw new StepUpDeliveryError('dlt_template_not_approved', 'sms otp send refused: values_mismatch');
        }
        let gatewayMessageId: string;
        try {
          gatewayMessageId = await withSendTimeout(
            deps.messaging.send({ to, templateId, values, body }),
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
