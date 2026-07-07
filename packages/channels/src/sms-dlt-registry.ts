// DLT template registry — Story 5.6 (AC2; Task 2).
//
// A STATIC, VERSIONED, per-category registry of the TRAI/DLT-transactional templates the `sms` channel is
// eligible to send. DLT registration is PLATFORM-GLOBAL (one PE/OE entity for the whole platform), so this
// is a typed `const` map — there is NO per-Pariwar table and NO migration (contrast pariwar_wa_templates,
// which is per-(Pariwar, category) because WA credentials are per-Pariwar).
//
// ── Eligibility, not credentials (the load-bearing rule) ───────────────────────────────────────────────
// A category PRESENT here is SMS-eligible; a category ABSENT is NOT SMS-eligible — `resolveDltTemplate`
// returns `null`, so the composition seam's `resolveSmsProvider` falls back to the fixture and no real SMS
// is sent for it (mirrors WhatsApp's "no approved template ⇒ not WA-eligible"). Expanding the registry to
// other AlertCategory values is a LATER story, once those categories' DLT content is TRAI-registered.
//
// ── The v1 category set (CONFIRMED product-policy decision, BigDev 2026-07-06) ─────────────────────────
// SMS only fires as a transactional FALLBACK for a per-member alert whose higher-tier channel already
// failed (architecture §3.4 / RA-29 — SMS is NOT a bulk-alert channel). So the v1 set is exactly the
// PER-MEMBER TRANSACTIONAL categories (the same family WhatsApp serves): deadline_reminder,
// contribution_confirmed, contribution_mismatch, claim_status_change, helpdesk_reply. Deliberately EXCLUDED:
//   · step_up_otp        — OTP delivery is Story 5.9, on its OWN rate budget (never this transactional path);
//   · alert_published / module_new / niyamavali_amended — broadcasts (Telegram-side / not per-member).
// The architecture §3.4 prose examples (payment reminder / payout issued / claim accepted / expiry warning /
// membership lapse) are ILLUSTRATIVE, not schema identifiers — they do NOT map 1:1 onto the 9-value enum, so
// this set is a DERIVED product default, not an architecture-mandated list. Do NOT infer new mappings from
// the prose or invent AlertCategory values.
//
// ── Credential NAMEs, never values (AI-4-3(c)) ────────────────────────────────────────────────────────
// The registry stores the CONFIG-KEY NAME pointer (`dltTemplateIdConfigKey`), NEVER the TRAI-assigned
// template id itself — the composition layer resolves the NAME → the real id from global config / Secret
// Manager at send time (mirror pariwar_wa_config.access_token_secret_name discipline). The registered
// content template TEXT + version live in code (code-reviewed, matches the TRAI registration per the Story
// 0.1 runbook / AR-56) so a content drift is a reviewable one-line edit.

import type { AlertCategory } from '@twt/contracts';

/** One registered DLT-transactional template (per SMS-eligible category). */
export interface DltTemplate {
  /**
   * The global config / Secret-Manager NAME pointer the composition layer resolves → the TRAI-assigned DLT
   * template id at send time. NEVER the id itself (never hardcoded/logged/audited — AI-4-3(c)).
   */
  readonly dltTemplateIdConfigKey: string;
  /**
   * The registered content-template TEXT (the TRAI-approved scaffolding). `{#var#}` marks the single
   * variable slot the rendered SMS body fills. Lives in code so a drift from the TRAI registration is a
   * reviewable edit; the gateway byte-matches against its OWN registered copy of this text.
   */
  readonly contentTemplate: string;
  /** The template version (bumped when the registered content text changes; a later multi-var shape = Epic 10). */
  readonly version: number;
}

/**
 * The v1 SMS DLT template registry — ONLY the per-member transactional categories (BigDev 2026-07-06). A
 * category not present here is not SMS-eligible. Typed as a partial map over the full AlertCategory enum so
 * the absence of the other 4 categories (step_up_otp + the 3 broadcasts) is STATICALLY visible.
 */
export const SMS_DLT_TEMPLATE_REGISTRY: Readonly<Partial<Record<AlertCategory, DltTemplate>>> = {
  deadline_reminder: {
    dltTemplateIdConfigKey: 'sms.dlt.template_id.deadline_reminder',
    contentTemplate: '{#var#}',
    version: 1,
  },
  contribution_confirmed: {
    dltTemplateIdConfigKey: 'sms.dlt.template_id.contribution_confirmed',
    contentTemplate: '{#var#}',
    version: 1,
  },
  contribution_mismatch: {
    dltTemplateIdConfigKey: 'sms.dlt.template_id.contribution_mismatch',
    contentTemplate: '{#var#}',
    version: 1,
  },
  claim_status_change: {
    dltTemplateIdConfigKey: 'sms.dlt.template_id.claim_status_change',
    contentTemplate: '{#var#}',
    version: 1,
  },
  helpdesk_reply: {
    dltTemplateIdConfigKey: 'sms.dlt.template_id.helpdesk_reply',
    contentTemplate: '{#var#}',
    version: 1,
  },
};

/**
 * Resolve the registered DLT template for an alert category, or `null` when the category is NOT SMS-eligible
 * (mirrors the CONCEPT of resolveApprovedTemplate, but GLOBAL — no DB, no per-Pariwar dimension). The
 * composition seam uses this to decide SMS-eligibility: `null` ⇒ the fixture (no real SMS send). Accepts a
 * plain `string` (the alert's category as it arrives at the composition layer, mirroring
 * resolveApprovedTemplate's `string` param) — any value outside the registry keys resolves to `null`.
 */
export function resolveDltTemplate(category: string): DltTemplate | null {
  return SMS_DLT_TEMPLATE_REGISTRY[category as AlertCategory] ?? null;
}
