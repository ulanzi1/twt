// Dedicated OTP DLT template registry — Story 5.9 (AC2; Task 1).
//
// The AR-56 "DLT-transactional (PE/OE) registration for OTP-SMS / step-up-OTP-SMS" surface — DISTINCT from
// Story 5.6's per-category transactional registry (`sms-dlt-registry.ts`, which deliberately EXCLUDED
// `step_up_otp`: "OTP delivery is Story 5.9, on its OWN rate budget (never this transactional path)"). OTP
// delivery is a DIRECT, time-critical single-recipient send (never a `dispatch` fan-out) on the OTP rate
// budget (`otp_rate_buckets`), never the transactional `sms_rate_buckets`.
//
// ── TWO templates, keyed by intent (BigDev decision 2026-07-07) ────────────────────────────────────────
// `login` and `step_up` are SEPARATELY TRAI-registered OTP DLT-transactional templates — each with its own
// NAME pointer + TTL wording (login 5 min, step-up 3 min — the committed TTLs, R2). A category ABSENT here is
// not OTP-eligible; the two intents are the whole v1 set.
//
// ── Credential NAMEs, never values (AI-4-3(c)) ────────────────────────────────────────────────────────
// This registry stores the CONFIG-KEY NAME pointer (`dltTemplateIdConfigKey`), NEVER the TRAI-assigned
// template id itself — the composition/deps layer resolves the NAME → the real id from global config /
// Secret Manager at send time (mirror `pariwar_wa_config.access_token_secret_name` + the 5.6
// `dltTemplateIdConfigKey` discipline). The registered content template TEXT + version live in code
// (code-reviewed, byte-matching each TRAI registration per the Story 0.1 runbook / AR-56) so a content
// drift is a reviewable one-line edit; the gateway byte-matches `body` against its OWN registered copy.
//
// ── The single variable slot = the 6-digit OTP code (mirror 5.6's single-`{{1}}` DLT shape) ─────────────
// `{#var#}` marks the ONE variable slot the rendered SMS body fills with the code. The OTP code is a SECRET:
// it appears ONLY in the outbound SMS body, NEVER in a log / audit / render-hash / the `step_up_otps` row.

/** The OTP delivery intent — selects one of the two separately-registered OTP DLT templates. */
export type OtpIntent = 'login' | 'step_up';

/** One registered OTP DLT-transactional template (per intent). */
export interface OtpDltTemplate {
  /**
   * The global config / Secret-Manager NAME pointer the deps layer resolves → the TRAI-assigned OTP DLT
   * template id at send time. NEVER the id itself (never hardcoded/logged/audited — AI-4-3(c)).
   */
  readonly dltTemplateIdConfigKey: string;
  /**
   * The registered content-template TEXT (the TRAI-approved scaffolding). `{#var#}` marks the single
   * variable slot the rendered SMS body fills with the 6-digit code. Lives in code so a drift from the TRAI
   * registration is a reviewable edit; the gateway byte-matches against its OWN registered copy of this text.
   */
  readonly contentTemplate: string;
  /** The template version (bumped when the registered content text changes). */
  readonly version: number;
}

/** The variable-slot marker the rendered body substitutes the code into (mirror the registry's `{#var#}`). */
const OTP_VAR_SLOT = '{#var#}';

/**
 * The v1 OTP DLT template registry — TWO separately-registered templates keyed by intent (BigDev
 * 2026-07-07). Each carries its own NAME pointer + committed TTL wording (login 5 min, step-up 3 min — R2).
 * Typed as a TOTAL map over `OtpIntent` so a missing intent is a compile error (both are always present).
 */
export const OTP_DLT_TEMPLATE_REGISTRY: Readonly<Record<OtpIntent, OtpDltTemplate>> = {
  login: {
    dltTemplateIdConfigKey: 'sms.dlt.template_id.otp_login',
    contentTemplate: `${OTP_VAR_SLOT} is your TWT login code. Valid 5 min. Do not share.`,
    version: 1,
  },
  step_up: {
    dltTemplateIdConfigKey: 'sms.dlt.template_id.otp_step_up',
    contentTemplate: `${OTP_VAR_SLOT} is your TWT verification code. Valid 3 min. Do not share.`,
    version: 1,
  },
};

/**
 * Resolve the registered OTP DLT template for a delivery intent. Total over `OtpIntent` — always returns a
 * template (never `null`, unlike the per-category `resolveDltTemplate`, which returns `null` for
 * non-SMS-eligible categories). The step-up adapter selects `step_up`; the login-OTP delivery selects `login`.
 */
export function resolveOtpTemplate(intent: OtpIntent): OtpDltTemplate {
  return OTP_DLT_TEMPLATE_REGISTRY[intent];
}

/**
 * Render the outbound OTP SMS body: substitute the 6-digit code into the template's single variable slot.
 * The code is a SECRET — it appears ONLY in the returned body (the outbound SMS), never in a log/audit.
 */
export function renderOtpBody(template: OtpDltTemplate, code: string): string {
  return template.contentTemplate.replace(OTP_VAR_SLOT, code);
}
