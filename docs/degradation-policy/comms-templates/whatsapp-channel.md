# Comms template: WhatsApp Business (UTILITY) — degraded posture activation

> **⚠️ PENDING LEGAL REVIEW PER STORY 0.13** ⚠️
>
> **THIS TEMPLATE BODY IS PROVISIONAL.** It remains pending legal counsel review per Story 0.13. The marker is removed ONLY via `../degradation-policy-ledger.md` "Legal-counsel revision log" + trustee co-sign + supersession-schema marker. **Silent marker removal is a framework violation.**

**Status:** drafted (Story 0.4 author-commit 2026-05-29); awaiting trustee sign-off (Story 0.4 Task 7); awaiting Story 0.13 counsel return (Story 0.4 Task 9); awaiting Meta template approval at template-submission time per the Meta UTILITY template approval lead-time policy (architecture §3.4 "Template approval lead-time policy").

**Architectural authority:** architecture.md §3.4 ("WhatsApp Business — dual-gated: Pariwar admin toggle (FR-72) AND member self-declared opt-in") + Cross-Cutting #10 (channel-provider abstraction) + addendum RA-29 (the three-tier channel model). Meta UTILITY template shape; per-Pariwar WA Business number admin-configurable per FR-72.

**Routing:** dispatched via Story 5.1 alert dispatcher + Story 5.3 WhatsApp Business channel (BSP-abstracted per §3.4). Subject to the two WA gates per §3.4: (i) Pariwar admin toggle ACTIVE; (ii) member self-declared opt-in ACTIVE. Members without opt-in receive only the in-app push (per `push-channel.md`) and the cache-safe public-page banner (per `public-page-banner.md`); the per-member transactional fallback SMS (per `sms-channel.md`) is the WA-failure ladder per §3.4.

---

## Trigger conditions

**Primary trigger:** degraded posture activated. Fires to every member with WA opt-in ACTIVE in the affected Pariwar(s). Per architecture §3.4 "Time-critical templates always send through both channels regardless of the [in-app engagement cost optimization]" — degraded-posture activation is **NOT** a time-critical template at v1 (it does not have the urgency profile of payment-reminder/payout/expiry); BUT degraded posture is a "trust-state framing" template that the optimization toggle SHOULD respect to avoid over-suppression. The trigger-policy decision is recorded in operations policy.

**Mid-cycle template suspension fallback** (per §3.4): if Meta suspends this template mid-dispatch, the dispatcher falls back to the per-Pariwar pre-approved fallback template (generic announcement format; simpler copy that doesn't trigger the suspension). The fallback content is operations-policy territory and lives in the per-Pariwar template library, not this framework.

**Suppression:** members in frozen Account State Machine states do NOT receive this template (lifecycle-driven dispatch suppression per architecture §3.4); the cache-safe public-page banner is the in-scope channel for frozen-state members.

## Channel-specific shape constraints

- Meta UTILITY template — submit to Meta for approval per the Meta Business Platform UTILITY template review process.
- Template name: `pariwar_degraded_posture_v1` (revisable per template revision in operations policy; the v1 suffix tracks revision generation per Meta template versioning).
- Variable syntax: Meta `{{N}}` positional variables, NOT the curly-brace `{var_name}` form used in this framework's documentation. The variable list below shows the per-substitution semantic meaning; the actual template body submitted to Meta uses `{{1}}`, `{{2}}`, `{{3}}`.
- Body length: bounded ≤ 1024 chars per Meta UTILITY template constraints.
- Header: optional text header; included.
- Footer: optional text footer; NOT included (the footer slot is reserved for Pariwar-branding per FR-63 Pariwar passport).
- Quick-reply / call-to-action buttons: NOT included in v1 (degraded posture does not require an action; the helpline-phone link is in the body).
- Language: per-Pariwar language config (Hindi primary for TWT-Bihar; English secondary surface via Meta language-template variant).
- Per-Pariwar WA Business number: admin-configurable per FR-72; sourced from Pariwar config at dispatch time.

## Variables to substitute

Same semantic set as `push-channel.md` (the dispatcher uses one canonical alert payload per architecture Cross-Cutting #10):

- `{{1}}` = `{pariwar_name}` (e.g., "TWT-Bihar")
- `{{2}}` = `{expected_return_date}` (format per Pariwar i18n config)
- `{{3}}` = `{fallback_handler_phone}` (E.164 format per WA expectations)

## Variables to NOT substitute

Per architecture §3.4 "Channel-renderer escaping discipline" + UX §PII shielding:

- No member PII (no member name, no member-id, no mobile/email/address/DOB).
- No claim case identifiers, pool identifiers, contribution amounts.
- No internal-system identifiers.
- No member-specific data of any kind — the template is framework-level + Pariwar-level only.

Meta's variable substitution itself escapes the values for WA renderer correctness; the application-side discipline is to NOT pass any of the forbidden variables to Meta.

## Template body (Hindi primary; Meta template submission)

**Header (Hindi):** सम्मानित साथी — कृपया ध्यान दें

**Body (Hindi):**

> प्रिय सम्मानित साथी,
>
> हमारे संचालन में अस्थायी देरी है; आपका मासिक सहयोग चक्र सामान्य रूप से चालू है।
>
> {{2}} तक स्थिति समाधान हो जाएगी।
>
> तत्काल सहायता के लिए: {{3}}
>
> — {{1}} ट्रस्टी पैनल

**English secondary variant** (separate Meta template `pariwar_degraded_posture_v1_en` submitted alongside the Hindi variant; English language tag per Meta template-language config):

**Header (English):** Respected colleague — please note

**Body (English):**

> Dear सम्मानित साथी,
>
> We are operating with reduced staff bandwidth; your monthly sahyog cycle continues normally.
>
> Resolution expected by {{2}}.
>
> For immediate help: {{3}}
>
> — {{1}} Trustee Panel

## Per-Pariwar template approval discipline

Template submission to Meta requires Pariwar-admin authority per FR-72. Lead-time policy per architecture §3.4 — cycle-cadence templates have a lead-time floor that protects the cycle from in-flight template approval lag. Degraded-posture activation is NOT a cycle-cadence template; its lead-time floor is operations-policy territory (forward-deferred). Recommended: submit + approve the template per Pariwar at framework-deploy time (Story 0.4 closure + Pariwar provisioning) so the template is pre-approved at degraded-posture activation time.

## Tone + content discipline (per README §12)

Same as `push-channel.md` § "Tone + content discipline".

## Triggering surfaces (cross-link to `../surface-inventory.md`)

This template is cited by the following surface rows:

- My Pool card (Tier 1)
- Renewal-grace surface (Tier 1)
- Sunita-mode nominee console (Tier 1)
- Field-worker dispatch app (Tier 2 — Vikram-class WA reach)

## Legal-counsel return (PLACEHOLDER — populates when Story 0.13 returns)

_When Story 0.13 returns counsel review on this template, the return is logged in `../degradation-policy-ledger.md` Legal-counsel revision log; the revision is applied as a `legal-counsel-revision-YYYY-MM-DD.md` patch file in this directory; the prior body is preserved in a `superseded-YYYY-MM-DD.md` snapshot; the PENDING LEGAL REVIEW marker at the top of this file is replaced with `LEGAL REVIEW RETURNED (YYYY-MM-DD)` per the marker-removal discipline in `../README.md` §4 invariant 6._

**Counsel-review-specific considerations for the WA channel:** counsel should evaluate (a) Meta's UTILITY-template eligibility criteria for trust-posture copy under degraded operations; (b) DPDPA consent implications of the WA opt-in interaction with degraded-posture broadcast; (c) per-Pariwar template re-approval cadence under Meta policy changes. These considerations are surfaced for counsel; resolution lies with counsel + Trustee Panel.
