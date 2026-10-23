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
//
// ── ⭐ Story 6.34 (TV6; `2026-10-10-313`, `-322` C8): the five v1 entries are DARK — truthfully ─────────────
// Each was ONE whole-body variable (the body is `${heading}: ${line}`, `render.ts` — unbounded, mixed-script):
// 0 % fixed text and no TRAI type fits it, so ⛔ none is registrable (TRAI's 18 Nov 2025 Direction; the 30 %
// fixed rule). Each entry KEEPS its category and config-key name (the 5.6 set stays visible) but carries
// `contentTemplate: null` + `unregistrableReason`, and `resolveDltTemplate` returns `null` for it ⇒ composition
// falls to the log fixture — TODAY's behaviour, since ⛔ id was ever provisioned. ⚠ Provisioning
// `dltTemplateIdConfigKey` for any of the five does NOTHING (roster Row 30, deferred-work). Turning the
// per-member SMS fallback ON needs fixed wording per category (en + hi) — new member-facing copy, a later
// story with its own §0 — ⛔ "fixed" here by registering text.
//
// ── ⭐ Story 5.11 (2026-10-23; `2026-10-23-389` FS1 (d), FS15 (a); reach `2026-10-23-390` Q1 B) — the TV6 note above KEPT ──
// That later story is 5.11, and the fixed wording does ⛔ live here: it is MESSAGE-keyed, ⛔ category-keyed — three notices
// about a member's own contribution (day 10, a payment not matched, a payment still not confirmed) — in
// `apps/jobs/src/scheduler/contribution-sms-templates.ts`, and the alert fan-out's SMS rung reads THAT registry (through the
// payload's `sms` block), ⛔ this one. These five entries stay DARK and UNUSED by the alert SMS rung; `claim_status_change`
// (no producer) and `helpdesk_reply` (log-only in production) stay visibly unlit. ⚠ `resolveDltTemplate` and its composition
// path stay in place, all-dark — provisioning a key below still does NOTHING. The real send is row 5-11b.

import type { AlertCategory } from '@twt/contracts';

import type { DltSlot } from './dlt-variables.js';

/** Why a listed category has ⛔ registrable template. */
export type DltUnregistrableReason = 'whole_body_variable';

/** One registrable DLT-transactional template (per SMS-eligible category) — what `resolveDltTemplate` returns. */
export interface RegistrableDltTemplate {
  /**
   * The global config / Secret-Manager NAME pointer the composition layer resolves → the TRAI-assigned DLT
   * template id at send time. NEVER the id itself (never hardcoded/logged/audited — AI-4-3(c)).
   */
  readonly dltTemplateIdConfigKey: string;
  /**
   * The registered content-template TEXT (the TRAI-approved scaffolding). `{#var#}` marks each variable the
   * rendered SMS body fills. Lives in code so a drift from the TRAI registration is a reviewable edit; the
   * gateway byte-matches against its OWN registered copy of this text.
   */
  readonly contentTemplate: string;
  readonly unregistrableReason?: never;
  /** The declared variables, in text order (Story 6.34 TV2) — the registry test runs the shape check over them. */
  readonly slots: readonly DltSlot[];
  /** The template version (bumped when the registered content text changes). */
  readonly version: number;
}

/** A listed category whose template is ⛔ registrable (Story 6.34 TV6) — kept visible, resolved to `null`. */
export interface UnregistrableDltTemplate {
  /** The config-key NAME — provisioning it does NOTHING (the category resolves to `null`). */
  readonly dltTemplateIdConfigKey: string;
  readonly contentTemplate: null;
  readonly unregistrableReason: DltUnregistrableReason;
  readonly slots: readonly [];
  readonly version: number;
}

/** One entry of the per-category registry — registrable, or listed-but-dark. */
export type DltTemplate = RegistrableDltTemplate | UnregistrableDltTemplate;

/** TV6 — a v1 entry: its whole body was one variable ⇒ ⛔ registrable. */
const dark = (category: AlertCategory): UnregistrableDltTemplate => ({
  dltTemplateIdConfigKey: `sms.dlt.template_id.${category}`,
  contentTemplate: null,
  unregistrableReason: 'whole_body_variable',
  slots: [],
  version: 1,
});

/**
 * The v1 SMS DLT template registry — ONLY the per-member transactional categories (BigDev 2026-07-06). A
 * category not present here is not SMS-eligible. Typed as a partial map over the full AlertCategory enum so
 * the absence of the other 4 categories (step_up_otp + the 3 broadcasts) is STATICALLY visible.
 */
export const SMS_DLT_TEMPLATE_REGISTRY: Readonly<Partial<Record<AlertCategory, DltTemplate>>> = {
  deadline_reminder: dark('deadline_reminder'),
  contribution_confirmed: dark('contribution_confirmed'),
  contribution_mismatch: dark('contribution_mismatch'),
  claim_status_change: dark('claim_status_change'),
  helpdesk_reply: dark('helpdesk_reply'),
};

/**
 * Resolve the registered DLT template for an alert category, or `null` when the category is NOT SMS-eligible
 * (mirrors the CONCEPT of resolveApprovedTemplate, but GLOBAL — no DB, no per-Pariwar dimension). The
 * composition seam uses this to decide SMS-eligibility: `null` ⇒ the fixture (no real SMS send). Accepts a
 * plain `string` (the alert's category as it arrives at the composition layer, mirroring
 * resolveApprovedTemplate's `string` param) — any value outside the registry keys resolves to `null`, and so
 * does a listed entry with ⛔ registrable text (Story 6.34 TV6 — all five v1 entries today).
 */
export function resolveDltTemplate(category: string): RegistrableDltTemplate | null {
  const entry = SMS_DLT_TEMPLATE_REGISTRY[category as AlertCategory];
  if (entry === undefined || entry.contentTemplate === null) return null;
  return entry;
}
