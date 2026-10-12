// The SHARED claim DLT SMS send core — extracted from 6.19b's `sendClaimCorrectionSms` by Story 6.24b (Task 3.1;
// `2026-10-08-295` RB4 — the FIRST extraction: 6.19b, 6.19c, 6.19d and 6.24b's suspicion notices all send through it).
//
// ⭐ ONE copy of the fail-closed rules and the provider-result classification — a second copy would drift the day a
// provider error class is added (Trap 15). The body is 6.19b's VERBATIM but for one token (`template.dltTemplateIdConfigKey`
// ⇒ `input.dltTemplateIdConfigKey` — the registry lookup stays in each caller's wrapper) and the render, which each
// caller passes: it runs at 6.19b's position — AFTER the gateway check, OUTSIDE the `try` — so a `t()` throw stays a
// crash (a pg-boss retry), ⛔ a final `error`. The helpline is 6.19b's per-Pariwar number (`-269` §5 — the SAME key).
// ⛔ It never alarms and ⛔ never logs — callers add the ids. ⛔ No VALUE import from `claim-correction-reminders.ts`
// (a reminders ↔ dlt-send runtime cycle — [[project_type_only_import_cycle_trap]]): the deps are declared here.
// ⭐ Story 6.34 (`2026-10-12-322` C1, read by `-323` R1): the resolved helpline is CHECKED as a TRAI callback number
// (`isDltCallbackNumber` — digits only, 3–14; ⛔ `+`, ⛔ spaces). A set-but-malformed number is SENT exactly as today —
// same body, same outcome, ⛔ held, ⛔ refused, ⛔ normalised (stripping `+` would change the rendered body) — and the
// FINAL result of a send the provider was handed carries `helplineNotCallbackNumber: true`; each caller logs ONE warning
// on it (the core still never logs). ⛔ On `transient` (a pg-boss retry would warn on every attempt) and ⛔ on the config
// finals that send nothing. The control is provisioning — roster Row 30 (c).

import { createSmsDltProvider, isDltCallbackNumber, type SmsAppClient } from '@twt/channels';

import { claimCorrectionHelplineConfigKey } from './claim-correction-sms-templates.js';
import { classifySecretManagerFault } from './contribution-providers.js';

/** A send is abandoned after this and counted `api_unavailable` (the OTP path's `sms-step-up-delivery.ts` budget). */
export const CORRECTION_SEND_TIMEOUT_MS = 10_000;

/** What the core needs — structurally a subset of `ClaimCorrectionReminderDeps`. */
export interface ClaimDltSmsDeps {
  readonly smsAppClient: SmsAppClient;
  readonly resolveConfig: (configKey: string) => Promise<string | null>;
  /** Override the send timeout (tests). */
  readonly sendTimeoutMs?: number;
}

/**
 * Set ONLY on a FINAL result of a send the provider was handed (`accepted`, `rejected_*`, a provider-classified
 * `error`) when the Pariwar's helpline is set but ⛔ a callback number (Story 6.34, `-322` C1) — the caller warns.
 */
interface HelplineFlag {
  readonly helplineNotCallbackNumber?: true;
}

/** What one claim DLT SMS attempt came to. `transient` ⇒ the caller throws so pg-boss retries. */
export type ClaimCorrectionSmsResult =
  | ({
      readonly kind: 'final';
      readonly outcome: 'accepted';
      readonly providerMessageId: string | null;
      readonly detail: null;
    } & HelplineFlag)
  | ({
      readonly kind: 'final';
      readonly outcome: 'rejected_invalid_number' | 'rejected_unreachable' | 'error';
      readonly providerMessageId: null;
      readonly detail: string;
      /** A permanent failure that needs a human (config, template, auth) — the caller alarms. */
      readonly alarm: boolean;
    } & HelplineFlag)
  | { readonly kind: 'transient'; readonly detail: string };

/**
 * The ONE warning each caller logs, through its existing `alarm` sink, when a final result carries
 * `helplineNotCallbackNumber` (`-322` C1 / `-323` R1) — the Pariwar, the purpose and the rule; ⛔ the number itself.
 */
export function helplineNotCallbackNumberWarning(pariwarId: string, purpose: string): string {
  return (
    `[jobs] claim-dlt-sms: pariwar ${pariwarId} ${purpose} — SENT, but the helpline set for this Pariwar is not a callback ` +
    `number: digits only, 3–14 — no '+' or spaces. Fix the secret; once operators enforce tags they reject these texts ` +
    `(roster Row 30 (c))`
  );
}

class SendTimeoutError extends Error {}

function withTimeout<T>(pending: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new SendTimeoutError('timeout')), ms);
    pending.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (err: unknown) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

/**
 * ⭐ SEND ONE CLAIM DLT SMS (a DIRECT DLT SMS to an explicit E.164 number; ⛔ not `dispatch()`, ⛔ not an Alert). Fails
 * CLOSED on a missing DLT template id, an unset helpline number (per Pariwar, `-269` §5) or an unconfigured gateway —
 * `error`, alarm, ⛔ never a fixture `accepted` (T13). The provider never throws (S3): its `rejected` is classified —
 * `invalid_number` → `rejected_invalid_number`; `carrier_reject` → `rejected_unreachable` (`-269` §4);
 * `dlt_template_not_approved` / `auth` / `unknown` → `error` + alarm, FINAL; `rate_limited` / `api_unavailable` (and a
 * timeout, and any Secret Manager fault that is ⛔ not a known CONFIG fault — incl. `UNAUTHENTICATED`, a token-refresh
 * blip) → TRANSIENT; a known Secret Manager config fault (`classifySecretManagerFault`: `INVALID_ARGUMENT`,
 * `PERMISSION_DENIED`, `FAILED_PRECONDITION`, `UNIMPLEMENTED`) → `error` + alarm, FINAL (`config:secret_manager_<code>`).
 */
export async function sendClaimDltSms(
  deps: ClaimDltSmsDeps,
  input: {
    /** The caller's registry entry's Secret Manager name for the DLT template id. */
    readonly dltTemplateIdConfigKey: string;
    readonly pariwarId: string;
    /** The E.164 recipient — decrypted by the caller, ⛔ never logged. */
    readonly e164: string;
    /** Renders the registered body with the per-Pariwar helpline number (trimmed). A throw is a crash, ⛔ a final. */
    readonly render: (helpline: string) => string;
  },
): Promise<ClaimCorrectionSmsResult> {
  let dltTemplateId: string | null;
  let helpline: string | null;
  try {
    dltTemplateId = await deps.resolveConfig(input.dltTemplateIdConfigKey);
    helpline = await deps.resolveConfig(claimCorrectionHelplineConfigKey(input.pariwarId));
  } catch (err) {
    // `resolveSmsDltConfig` re-throws everything but "not provisioned" (`NOT_FOUND` ⇒ `null`, handled below). Only
    // a KNOWN config fault (`PERMISSION_DENIED`, `INVALID_ARGUMENT`, `FAILED_PRECONDITION`, `UNIMPLEMENTED`) is
    // FINAL + alarm; everything else (a quota spike, an outage, a token-refresh `UNAUTHENTICATED`, a socket error,
    // ⛔ no code) retries — ⚠ one that never clears surfaces at the next day's exhausted-row finaliser (`error` +
    // alarm), which costs one slot, where a wrongly-final code would cost EVERY family's slot that day.
    const fault = classifySecretManagerFault(err);
    if (fault.transient) return { kind: 'transient', detail: 'config_unavailable:secret_manager' };
    return { kind: 'final', outcome: 'error', providerMessageId: null, detail: `config:secret_manager_${fault.code}`, alarm: true };
  }
  if (dltTemplateId === null || dltTemplateId.trim() === '') {
    return { kind: 'final', outcome: 'error', providerMessageId: null, detail: 'config:dlt_template_id_missing', alarm: true };
  }
  if (helpline === null || helpline.trim() === '') {
    return { kind: 'final', outcome: 'error', providerMessageId: null, detail: 'config:helpline_number_missing', alarm: true };
  }
  if (!deps.smsAppClient.isConfigured()) {
    return { kind: 'final', outcome: 'error', providerMessageId: null, detail: 'config:sms_gateway_unconfigured', alarm: true };
  }
  const resolvedHelpline = helpline.trim();
  // `-322` C1 — the flag rides ONLY the provider-handed finals below; ⛔ an outcome, `detail` or body changes.
  const flag: HelplineFlag = isDltCallbackNumber(resolvedHelpline) ? {} : { helplineNotCallbackNumber: true };
  const body = input.render(resolvedHelpline);
  try {
    // ⚠ `messaging()` INSIDE the try: a half-configured client throws here, and that is a config fault, ⛔ a crash.
    const provider = createSmsDltProvider({ messaging: deps.smsAppClient.messaging(), dltTemplateId: dltTemplateId.trim() });
    const result = await withTimeout(
      provider.send({ channel: 'sms', title: null, body, deepLink: null }, { channel: 'sms', address: input.e164 }),
      deps.sendTimeoutMs ?? CORRECTION_SEND_TIMEOUT_MS,
    );
    if (result.status === 'accepted') {
      return { kind: 'final', outcome: 'accepted', providerMessageId: result.providerMessageId, detail: null, ...flag };
    }
    const detail = result.detail ?? 'unknown:NO_DETAIL';
    const errorClass = detail.split(':')[0];
    switch (errorClass) {
      case 'invalid_number':
        return { kind: 'final', outcome: 'rejected_invalid_number', providerMessageId: null, detail, alarm: false, ...flag };
      case 'carrier_reject':
        return { kind: 'final', outcome: 'rejected_unreachable', providerMessageId: null, detail, alarm: false, ...flag };
      case 'rate_limited':
      case 'api_unavailable':
        return { kind: 'transient', detail };
      default:
        return { kind: 'final', outcome: 'error', providerMessageId: null, detail, alarm: true, ...flag };
    }
  } catch (err) {
    if (err instanceof SendTimeoutError) return { kind: 'transient', detail: 'api_unavailable:timeout' };
    return { kind: 'final', outcome: 'error', providerMessageId: null, detail: 'config:sms_messaging_unavailable', alarm: true };
  }
}
