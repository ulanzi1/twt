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
// ⭐ Story 6.37 (MSG91 — `2026-10-17-345`; ADR-0041). (MG3) MSG91 sends the template's NAMED values, ⛔ the body: each
// caller passes its registry entry (`template`) and a `values` builder closing over the SAME locals its `render` uses, and
// BEFORE the network the core proves the values are the slots' names, each within its slot's `maxLength`, and rebuild the
// rendered body byte for byte (I1 as a runtime guard — under F9 a mismatch would otherwise be recorded `accepted`); a
// failure is a final `dlt_template_not_approved:values_mismatch` / `:value_too_long` + alarm. (MG4) A template id that is
// ⛔ MSG91's 24 hex is a final `dlt_template_not_approved:template_id_malformed`. (MG5) Then the ONE process pre-flight
// memo (`smsPreflight`, built in boot): a PROVEN fault (the SEND key refused — `auth` / `auth_or_not_found` under MG17
// (a)) is a final `auth:preflight` on EVERY caller; an UNPROVEN one (`content_mismatch`, `dlt_id_missing`,
// `sms_type_needs_unicode`, and `auth*` read with a separate key — MG17 (b)) and a TRANSIENT with ⛔ usable pass are a
// final / a `transient` on the holding children (their race guard already held — this is the in-flight race), but are
// SENT with a `preflightWarning` when the caller passes `preflightFailOpen` (6.19b/c/d — ⛔ hold there, T6; refusing a
// deliverable text would be `-322` §0's Panel option). The core still never alarms: the caller alarms the warning.
// (MG16 (i)) `beforeSend`, when given, is called synchronously IMMEDIATELY before the provider's send — a `defer_*` ⇒
// `{kind:'deferred'}` and ⛔ text (the overloads keep `deferred` out of every caller that passes none).
// ⭐ Story 6.37b (DR3, T22; `2026-10-17-347`): every send carries a `correlation` — its kind and the send row's own id —
// which goes on the wire as MSG91's `CRQID` and comes back in the delivery report. It is FORMATTED and VALIDATED at the
// TOP, before anything else and OUTSIDE every `try` (the config, provider-build and send `try`s each turn a throw into a
// FINAL that spends the text): a malformed one is a code bug ⇒ ONE `console.error` line naming the kind (⛔ the id —
// pg-boss 12 logs ⛔ handler throw) and a THROW (a crash, ⛔ a final — this file's rule). The provider only copies it.

import {
  createSmsDltProvider,
  isDltCallbackNumber,
  isMsg91TemplateId,
  substituteDltValues,
  type Msg91PreflightEntry,
  type Msg91PreflightMemo,
  type SmsAppClient,
  type SmsGatewayValue,
} from '@twt/channels';
import { smsDelivery } from '@twt/domain';

import { claimCorrectionHelplineConfigKey } from './claim-correction-sms-templates.js';
import { classifySecretManagerFault } from './contribution-providers.js';

/** A send is abandoned after this and counted `api_unavailable` (the OTP path's `sms-step-up-delivery.ts` budget). */
export const CORRECTION_SEND_TIMEOUT_MS = 10_000;

/** The ONE process pre-flight (MG5, MG17) — built in `boot.ts`; absent ⇒ ⛔ pre-flight (dev, and every existing fake). */
export interface ClaimDltSmsPreflight {
  readonly memo: Msg91PreflightMemo;
  /**
   * MG17 — does the memo read with the SEND key itself? (a) yes ⇒ its `auth` / `auth_or_not_found` PROVES the send would
   * fail; (b) a separate read-only key ⇒ a refusal proves nothing about the send key (an UNPROVEN reason).
   */
  readonly readsWithSendKey: boolean;
}

/** What the core needs — structurally a subset of `ClaimCorrectionReminderDeps`. */
export interface ClaimDltSmsDeps {
  readonly smsAppClient: SmsAppClient;
  readonly resolveConfig: (configKey: string) => Promise<string | null>;
  /** Override the send timeout (tests). */
  readonly sendTimeoutMs?: number;
  /** MG5 — the process pre-flight memo. OPTIONAL: every existing fake stays valid. */
  readonly smsPreflight?: ClaimDltSmsPreflight;
}

/**
 * Set ONLY on a FINAL result of a send the provider was handed (`accepted`, `rejected_*`, a provider-classified
 * `error`) when the Pariwar's helpline is set but ⛔ a callback number (Story 6.34, `-322` C1) — the caller warns.
 */
interface HelplineFlag {
  readonly helplineNotCallbackNumber?: true;
  /**
   * MG5 — set ONLY on a final of a send handed to the provider DESPITE a pre-flight fault or transient (fail open — the
   * 6.19b/c/d paths): `<class>:<reason>` (`api_unavailable:preflight`, `dlt_template_not_approved:preflight_<reason>`).
   * The caller alarms it beside its helpline warning (`preflightWarningMessage`); ⛔ an outcome change.
   */
  readonly preflightWarning?: string;
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

/** MG16 (i) — `beforeSend` said ⛔ now: the window closed, or the lease margin is gone. ⛔ Sent. */
export interface ClaimDltSmsDeferred {
  readonly kind: 'deferred';
  readonly reason: 'window' | 'lease';
}

/** The caller's last synchronous check, immediately before the provider's send (MG16 (i)). */
export type ClaimDltSmsBeforeSend = () => 'go' | 'defer_window' | 'defer_lease';

/** What one send is (the caller's registry entry and values, and its pre-flight stance). */
export interface ClaimDltSmsInput {
  /** The caller's registry entry's Secret Manager name for the template id. */
  readonly dltTemplateIdConfigKey: string;
  /** The caller's registry entry — the registered text and its slots (MG3 / MG5). */
  readonly template: Msg91PreflightEntry;
  readonly pariwarId: string;
  /** The E.164 recipient — decrypted by the caller, ⛔ never logged. */
  readonly e164: string;
  /** Renders the registered body with the per-Pariwar helpline number (trimmed). A throw is a crash, ⛔ a final. */
  readonly render: (helpline: string) => string;
  /**
   * The template's named values for the same helpline — closing over the SAME locals `render` uses (⛔ a second
   * formatting). A throw is a crash, ⛔ a final.
   */
  readonly values: (helpline: string) => Readonly<Record<string, string>>;
  /**
   * MG5 — `true` ONLY on the 6.19b/c/d paths (⛔ hold there): an unproven pre-flight fault or a transient is SENT with a
   * `preflightWarning`. `false` on the holding children: it is a final / a transient.
   */
  readonly preflightFailOpen: boolean;
  /** MG16 (i) — the caller's last synchronous check (peer mesh: the send window and the lease margin). */
  readonly beforeSend?: ClaimDltSmsBeforeSend;
  /**
   * 6.37b DR3 — which send this is: its kind and the send ROW's own uuid (`cr` a correction reminder or closure notice,
   * `ce` a certificate reminder, `sn` a suspicion notice, `pm` a peer-mesh ping). Sent as MSG91's `CRQID`. A value
   * outside the grammar is a crash, ⛔ a final.
   */
  readonly correlation: { readonly kind: smsDelivery.SmsSendRowKind; readonly rowId: string };
}

/** The send-row kinds a claim text may carry (6.37b DR3) — every correlation kind but the OTP's `ot`. */
const CLAIM_SEND_ROW_KINDS = ['cr', 'ce', 'sn', 'pm'] as const satisfies readonly smsDelivery.SmsSendRowKind[];

/**
 * 6.37b DR3 — the send's `CRQID`, or a CRASH: ONE line naming the kind (⛔ the id), then the throw. Called first in
 * `sendClaimDltSms`, outside every `try`.
 */
function correlationIdOrCrash(correlation: ClaimDltSmsInput['correlation']): string {
  try {
    // A claim text names a send ROW — `ot` (a login code's random id) is ⛔ one, even though it is in the grammar.
    if (!(CLAIM_SEND_ROW_KINDS as readonly string[]).includes(correlation.kind)) throw new Error('sms correlation: not a send-row kind');
    return smsDelivery.formatSmsCorrelationId(correlation);
  } catch (err) {
    // `correlation?.` — an untyped caller passing ⛔ correlation must still get its ONE line (code review round 2).
    const raw = String((correlation as { kind?: unknown } | undefined)?.kind);
    const kind = /^[a-z]{2}$/.test(raw) ? raw : 'unknown';
    console.error(`[jobs] sms.bad_correlation:${kind}`);
    throw err;
  }
}

/**
 * The ONE warning a fail-open caller logs, through its existing `alarm` sink, when a final carries `preflightWarning`
 * (MG5) — the Pariwar, the purpose, the config key and the class; ⛔ the id, ⛔ the number.
 */
export function preflightWarningMessage(pariwarId: string, purpose: string, configKey: string, warning: string): string {
  return (
    `[jobs] claim-dlt-sms: pariwar ${pariwarId} ${purpose} — SENT, but the MSG91 pre-flight of ${configKey} did not pass ` +
    `(${warning}); ⛔ a hold on this path (fail open) — check the template in MSG91 (roster Row 32 (d) / (e))`
  );
}

/**
 * Story 6.37 (MG5) — the HOLD of the suspicion / peer-mesh sweeps (and their children's race guard): a template the run
 * needs, through the ONE process pre-flight memo. `null` when it passed (a stale pass included), else the HOLD's alarm
 * code `config:sms_preflight_<reason>:<configKey>` (⛔ the id; ⛔ stored — the R11 precedent). EVERY fault holds here (the safe direction — it delays, never records reached), and so does a transient with
 * ⛔ usable pass (`-299` RE7's held class); ⛔ the `sms_type_unicode_for_gsm7` note (a PASS). ⛔ Memo ⇒ ⛔ pre-flight.
 */
export async function smsPreflightGap(
  preflight: ClaimDltSmsPreflight | undefined,
  template: Msg91PreflightEntry,
  configKey: string,
  templateId: string,
): Promise<string | null> {
  if (preflight === undefined) return null;
  const verdict = await preflight.memo.get(template, templateId);
  return verdict.ok ? null : `config:sms_preflight_${verdict.reason}:${configKey}`;
}

/** The slot every claim text carries the per-Pariwar helpline in (the three registries' `helpline`). */
const HELPLINE_SLOT = 'helpline';

/** MG3 — the values as the gateway sends them, or the reason they cannot be: names = the slots', ≤ maxLength, = the body. */
function checkedValues(
  template: Msg91PreflightEntry,
  values: Readonly<Record<string, string>>,
  body: string,
): { readonly ok: true; readonly values: readonly SmsGatewayValue[] } | { readonly ok: false; readonly code: 'values_mismatch' | 'value_too_long' } {
  const names = Object.keys(values);
  if (names.length !== template.slots.length || template.slots.some((slot) => !Object.hasOwn(values, slot.name))) {
    return { ok: false, code: 'values_mismatch' };
  }
  const ordered = template.slots.map((slot) => ({ name: slot.name, value: values[slot.name] as string }));
  if (ordered.some((v) => typeof v.value !== 'string')) return { ok: false, code: 'values_mismatch' };
  // Code points, as the slot predicates count (`fitsDltAlphanumeric`). ⚠ MSG91's own per-variable cap (S2) is ⛔ settled —
  // Row 32 (d) confirms it in writing before templates 13 / 14 are provisioned. ⭐ The per-Pariwar HELPLINE is EXEMPT (BigDev,
  // 2026-10-17 — `-322` C1 holds): one over its 14 characters is ⛔ a callback number, so it is SENT as set and the caller's
  // `helplineNotCallbackNumber` warning (which names the 14-character limit) fires — ⛔ refused.
  if (template.slots.some((slot, i) => slot.name !== HELPLINE_SLOT && [...(ordered[i] as SmsGatewayValue).value].length > slot.maxLength)) {
    return { ok: false, code: 'value_too_long' };
  }
  if (substituteDltValues(template.text, template.slots, ordered) !== body) return { ok: false, code: 'values_mismatch' };
  return { ok: true, values: ordered };
}

/**
 * The ONE warning each caller logs, through its existing `alarm` sink, when a final result carries
 * `helplineNotCallbackNumber` (`-322` C1 / `-323` R1) — the Pariwar, the purpose and the rule; ⛔ the number itself.
 */
export function helplineNotCallbackNumberWarning(pariwarId: string, purpose: string): string {
  return (
    `[jobs] claim-dlt-sms: pariwar ${pariwarId} ${purpose} — SENT, but the helpline set for this Pariwar is not a callback ` +
    `number: digits only, at least 3 and at most 14 characters — no '+' or spaces. Fix the secret; once operators enforce tags they reject these texts ` +
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
 * Story 6.37: the named values, the malformed id, the pre-flight and `beforeSend` — see the header.
 */
export function sendClaimDltSms(
  deps: ClaimDltSmsDeps,
  input: ClaimDltSmsInput & { readonly beforeSend: ClaimDltSmsBeforeSend },
): Promise<ClaimCorrectionSmsResult | ClaimDltSmsDeferred>;
export function sendClaimDltSms(
  deps: ClaimDltSmsDeps,
  input: ClaimDltSmsInput & { readonly beforeSend?: undefined },
): Promise<ClaimCorrectionSmsResult>;
export async function sendClaimDltSms(
  deps: ClaimDltSmsDeps,
  input: ClaimDltSmsInput,
): Promise<ClaimCorrectionSmsResult | ClaimDltSmsDeferred> {
  // 6.37b DR3 / T22 — FIRST, outside every `try`: a bad id is a crash (the row stays `attempting`), ⛔ a final.
  const correlationId = correlationIdOrCrash(input.correlation);
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
  const templateId = dltTemplateId.trim();
  // MG4 — ⛔ MSG91's 24 hex (a pasted DLT TE id, an old fixture value) — FIRST, before the memo (⛔ a `config:` word — I5).
  if (!isMsg91TemplateId(templateId)) {
    return { kind: 'final', outcome: 'error', providerMessageId: null, detail: 'dlt_template_not_approved:template_id_malformed', alarm: true };
  }
  const resolvedHelpline = helpline.trim();
  // `-322` C1 — the flag rides ONLY the provider-handed finals below; ⛔ an outcome, `detail` or body changes.
  const helplineFlag: HelplineFlag = isDltCallbackNumber(resolvedHelpline) ? {} : { helplineNotCallbackNumber: true };
  const body = input.render(resolvedHelpline);
  // MG3 — the named values, proved against the body BEFORE the network (I1 as a runtime guard).
  const checked = checkedValues(input.template, input.values(resolvedHelpline), body);
  if (!checked.ok) {
    return { kind: 'final', outcome: 'error', providerMessageId: null, detail: `dlt_template_not_approved:${checked.code}`, alarm: true };
  }

  // MG5 — the process pre-flight memo (a hit is synchronous-fast; a miss reads MSG91 once for every concurrent caller).
  let preflightWarning: string | undefined;
  if (deps.smsPreflight !== undefined) {
    const verdict = await deps.smsPreflight.memo.get(input.template, templateId);
    if (!verdict.ok) {
      if (verdict.transient) {
        if (!input.preflightFailOpen) return { kind: 'transient', detail: 'api_unavailable:preflight' };
        preflightWarning = 'api_unavailable:preflight';
      } else {
        const proven =
          verdict.reason === 'template_id_malformed' ||
          ((verdict.reason === 'auth' || verdict.reason === 'auth_or_not_found') && deps.smsPreflight.readsWithSendKey);
        if (proven) {
          const detail = verdict.reason === 'template_id_malformed' ? 'dlt_template_not_approved:template_id_malformed' : 'auth:preflight';
          return { kind: 'final', outcome: 'error', providerMessageId: null, detail, alarm: true };
        }
        const detail = `dlt_template_not_approved:preflight_${verdict.reason}`;
        if (!input.preflightFailOpen) return { kind: 'final', outcome: 'error', providerMessageId: null, detail, alarm: true };
        preflightWarning = detail;
      }
    }
  }
  const flag: HelplineFlag = preflightWarning === undefined ? helplineFlag : { ...helplineFlag, preflightWarning };

  let provider: ReturnType<typeof createSmsDltProvider>;
  try {
    // ⚠ `messaging()` INSIDE a try: a half-configured client throws here, and that is a config fault, ⛔ a crash.
    provider = createSmsDltProvider({
      messaging: deps.smsAppClient.messaging(),
      dltTemplateId: templateId,
      values: checked.values,
      correlationId,
    });
  } catch {
    return { kind: 'final', outcome: 'error', providerMessageId: null, detail: 'config:sms_messaging_unavailable', alarm: true };
  }
  // MG16 (i) — synchronously, IMMEDIATELY before the send (⛔ an await between this and `provider.send`).
  if (input.beforeSend !== undefined) {
    const go = input.beforeSend();
    if (go === 'defer_window') return { kind: 'deferred', reason: 'window' };
    if (go === 'defer_lease') return { kind: 'deferred', reason: 'lease' };
  }
  try {
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
