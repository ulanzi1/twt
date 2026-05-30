# Comms template: In-app push (FCM + APNs) — degraded posture activation

> **⚠️ PENDING LEGAL REVIEW PER STORY 0.13** ⚠️
>
> **THIS TEMPLATE BODY IS PROVISIONAL.** It remains pending legal counsel review per Story 0.13 (legal counsel concurrent-review engagement). The marker is removed ONLY via `../degradation-policy-ledger.md` "Legal-counsel revision log" + trustee co-sign + supersession-schema marker. **Silent marker removal is a framework violation.**

**Status:** drafted (Story 0.4 author-commit 2026-05-29); awaiting trustee sign-off (Story 0.4 Task 7); awaiting Story 0.13 counsel return (Story 0.4 Task 9).

**Architectural authority:** architecture.md §3.4 ("In-app push (universal): FCM + APNs; every notification category fires in-app") + Cross-Cutting #10 ("Channel-provider abstraction — single canonical `alert` payload renders across all channels behind a swappable provider interface").

**Routing:** dispatched via the Story 5.1 alert dispatcher + Story 5.2 in-app push channel (FCM/APNs primary). Per §3.4 "Lifecycle-driven dispatch suppression", member-class push notifications are suppressed for accounts in frozen Account State Machine states (`claim-filed-frozen`, `disbursed-frozen-readable`, `disabled-T+90`, `public-record-∞`); this degraded-posture push is a **member-class notification** and is therefore subject to the same suppression — frozen-state members receive the degradation framing via the cache-safe public-page banner (per `public-page-banner.md`) instead.

---

## Trigger conditions

**Primary trigger:** degraded posture activated (Solo Builder unavailable >7 days OR Trustee Panel declares degraded posture); the template body fires to every active-cycle member on next-app-open (architecture §3.4 "In-app banner on next open showing missed alerts" pattern).

**Secondary triggers:**

- State-trustee-escalation event surfaces a degraded-mode banner to the verifier-pool staff (Anita-class) via the in-console push surface.
- Credential-escrow-quorum-open event (Story 0.2) surfaces the banner to the trustee tooling on next-trustee-login.

**Suppression:** members in frozen Account State Machine states do NOT receive this template (lifecycle-driven dispatch suppression per architecture §3.4); they receive the degradation framing via the cache-safe public-page banner on any twt.org visit.

## Channel-specific shape constraints

- FCM payload size ≤ 4 KB per Google FCM constraints.
- APNs payload size ≤ 4 KB per Apple APNs constraints.
- Hindi primary copy renders in Devanagari per UX §6 typography stack; English secondary copy renders in Latin script.
- No image attachments in v1 (per UX Stance #1 "no urgency theater" + architecture §3.4 simplicity).
- Deep-link action: tapping the push opens the My Pool card per architecture §3.3 (in-app push affordance); the My Pool card surface itself renders the same template body as an in-app banner via the §3.4 banner pattern.

## Variables to substitute

- `{pariwar_name}` — the human-readable Pariwar name (e.g., "TWT-Bihar"). Sourced from Pariwar config; required.
- `{expected_return_date}` — concrete date when the trust expects degraded posture to lift (per Trustee Panel decision at degraded-posture activation; format: "DD MMM YYYY" in English, "DD MMM YYYY" or Devanagari numerals per Pariwar i18n config). Required.
- `{fallback_handler_phone}` — phone number of the published helpline operator team for immediate support; sourced from operations policy. Required.

## Variables to NOT substitute (under ANY circumstance)

Per architecture §3.4 "Channel-renderer escaping discipline" + UX §PII shielding rule:

- No member PII (no member name, no member-id, no mobile/email/address/DOB).
- No claim case identifiers.
- No pool identifiers or contribution amounts (the template is framework-level, not member-specific).
- No internal-system identifiers (no `actor_id`, no `event_id`, no internal-only state tokens).

A fixture test (Story 5.x deliverable per the README §8 Open ADR slots) asserts that the template renders as inert text when input contains markdown/template-syntax characters.

## Template body (Hindi primary + English secondary)

**Title (Hindi):** सम्मानित साथी — कृपया ध्यान दें

**Title (English):** Respected colleague — please note

**Body (Hindi — primary):**

> प्रिय सम्मानित साथी,
>
> हमारे संचालन में अस्थायी देरी है; आपका मासिक सहयोग चक्र सामान्य रूप से चालू है।
>
> {expected_return_date} तक स्थिति समाधान हो जाएगी।
>
> तत्काल सहायता के लिए: {fallback_handler_phone}
>
> — {pariwar_name} ट्रस्टी पैनल

**Body (English — secondary):**

> Dear सम्मानित साथी,
>
> We are operating with reduced staff bandwidth; your monthly sahyog cycle continues normally.
>
> Resolution expected by {expected_return_date}.
>
> For immediate help: {fallback_handler_phone}
>
> — {pariwar_name} Trustee Panel

## Tone + content discipline (per README §12)

- **No urgency theater** per UX Stance #5 — copy does NOT use "URGENT", "FINAL NOTICE", "IMMEDIATE ACTION REQUIRED", or equivalent.
- **No module-promotion language** per UX Stance #1 — no mention of partner modules, donor opportunities, or product cross-sells.
- **No punitive language** per UX Stance #5 — no "or your account will be suspended" framing.
- **Warm-formal salutation** per UX §Design Opportunities — *सम्मानित साथी* / "Respected colleague" only.
- **Hindi primary** per UX Cross-Cutting "i18n at the core".

## Triggering surfaces (cross-link to `../surface-inventory.md`)

This template is cited by the following surface rows:

- My Pool card (Tier 1)
- Yogdaan Bahi (Tier 1)
- Renewal-grace surface (Tier 1)
- Ravi-mode claim filing (Tier 1)
- Sunita-mode nominee console (Tier 1)
- Anita's verifier console (Tier 1; in-console banner)
- Helpline Operator console (Tier 2; in-console operator banner)
- Trustee-Lite signals panel (Tier 2)
- Staff console (Tier 2)
- Field-worker dispatch app (Tier 2; alongside `whatsapp-channel.md`) — (**`gracefully-suspended`** surface: push fires to field workers explaining the new-dispatch suspension, not to indicate normal operation. Template body IS the suspension notice.)
- Niyamavali amendment workflow (Tier 2) — (**`gracefully-suspended`** surface: push fires in-console to trustees explaining the amendment pause. Template body IS the suspension notice.)
- R9 voting workflow (Tier 2)

## Legal-counsel return (PLACEHOLDER — populates when Story 0.13 returns)

_When Story 0.13 returns counsel review on this template, the return is logged in `../degradation-policy-ledger.md` Legal-counsel revision log; the revision is applied as a `legal-counsel-revision-YYYY-MM-DD.md` patch file in this directory; the prior body is preserved in a `superseded-YYYY-MM-DD.md` snapshot; the PENDING LEGAL REVIEW marker at the top of this file is replaced with `LEGAL REVIEW RETURNED (YYYY-MM-DD)` per the marker-removal discipline in `../README.md` §4 invariant 6._
