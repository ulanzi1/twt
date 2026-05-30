# Comms template: Email — degraded posture activation (trustee-class + opted-in member-class)

> **⚠️ PENDING LEGAL REVIEW PER STORY 0.13** ⚠️
>
> **THIS TEMPLATE BODY IS PROVISIONAL.** It remains pending legal counsel review per Story 0.13. The marker is removed ONLY via `../degradation-policy-ledger.md` "Legal-counsel revision log" + trustee co-sign + supersession-schema marker. **Silent marker removal is a framework violation.**

**Status:** drafted (Story 0.4 author-commit 2026-05-29); awaiting trustee sign-off (Story 0.4 Task 7); awaiting Story 0.13 counsel return (Story 0.4 Task 9); awaiting email-provider selection (operations-policy ADR — Mailgun, SendGrid, AWS SES, GCP transactional-email, or self-hosted are candidates).

**Architectural authority:** email is the trust's out-of-app comms surface; architecture does NOT enumerate email as one of the §3.4 three-tier channels (push / WA / SMS / Telegram) because email is structurally distinct — it is for trustee-class users + opted-in member-class users with email-on-file, NOT a primary member-channel for the Bihar-government-teacher cadre per UX §Target Users (Sushil is smartphone-primary, intermittent 4G; email is not his native channel). Architecture §1.13 (DPDPA consent registry) governs email opt-in capture.

**Routing:** dispatched via Story 5.1 alert dispatcher + a future Story (Epic 5 or Epic 10) email transactional channel. At v1, email is exclusively the **trustee-class + opted-in member-class** channel; not a primary member-channel.

---

## Trigger conditions

**Primary trigger:** degraded posture activated. Fires to:

- All **trustees** (per Trustee Panel roster); email-on-file is required for trustee enrollment.
- All **Operations Lead + named staff roles** (per Story 0.7 P0-1 fallback-handler ledger — author-committed 2026-05-30 at `docs/fallback-handler-ledger/`; Operations Lead appointment pending Task 8 closure (Trustee Panel hire decision); per-loop-node named staff role population pending Task 9 closure (Trustee Panel + Operations Lead naming event)); email-on-file is required for the staff role enrollment.
- **Opted-in members** with email-on-file AND email-opt-in ACTIVE per the Story 1.13 consent registry (Phase-2 surface; v1 may not have email-opt-in capture). At v1, this group may be empty; the framework reserves the surface for Phase-2.

**Suppression:** members in frozen Account State Machine states are NOT suppressed at the email channel by the §3.4 lifecycle-driven dispatch suppression rule (which is push/WA-specific). However, the trust's discretion is to apply the same suppression to email when the email recipient is a frozen-state member — the structural property is preserved via an explicit operations-policy decision logged in the dispatcher.

## Channel-specific shape constraints

- Subject line: bounded ≤ 60 chars per email-client preview-text discipline.
- Body: HTML + plaintext multipart; both required per email best-practices.
- Sender: per-Pariwar trust@<pariwar>.twt.org (or equivalent per email-provider DKIM/SPF setup); From-name = "TWT-{pariwar_name} Trustee Panel".
- Reply-To: same as sender; email-receive infrastructure forwards replies to the trustee distribution list.
- Plaintext body: same Hindi + English content as HTML; plaintext renders are increasingly important for accessibility (screen readers) and DPDPA disclosure context.
- No tracking pixels per UX §PII shielding + DPDPA consent posture — email opens are NOT tracked at the pixel level; bounce + delivery status from the email provider is sufficient for operational signal.
- No image attachments in v1.

## Variables to substitute

Same canonical set as `push-channel.md` (one alert payload per architecture Cross-Cutting #10):

- `{pariwar_name}` — Pariwar name (e.g., "TWT-Bihar").
- `{expected_return_date}` — concrete date in "DD MMM YYYY" format.
- `{fallback_handler_phone}` — phone number of the published helpline operator team.
- `{recipient_role}` — trustee-class vs staff-class vs member-class — used in the salutation block (`Trustee` vs `Respected colleague` vs `सम्मानित साथी`).

## Variables to NOT substitute

Per architecture §3.4 "Channel-renderer escaping discipline" + UX §PII shielding:

- No member PII (no member name, no member-id, no mobile/address/DOB) — recipient email itself IS PII but it's the addressing, not the body content.
- No claim case identifiers, pool identifiers, contribution amounts.
- No internal-system identifiers.

## Template body

**Subject (Hindi + English bilingual; 58 chars):** TWT-{pariwar_name}: संचालन में देरी / Operational delay notice

**HTML body (Hindi primary):**

```html
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: 'Mukta', 'Lohit Devanagari', sans-serif; max-width: 600px;">
  <h2>{recipient_role_salutation_hindi},</h2>

  <p>हमारे संचालन में अस्थायी देरी है; आपके Pariwar का मासिक सहयोग चक्र सामान्य रूप से चालू है।</p>

  <p><strong>{expected_return_date}</strong> तक स्थिति समाधान हो जाएगी।</p>

  <p>तत्काल सहायता के लिए: <a href="tel:{fallback_handler_phone}">{fallback_handler_phone}</a></p>

  <hr>

  <h3>{recipient_role_salutation_english},</h3>

  <p>We are operating with reduced staff bandwidth; your Pariwar's monthly sahyog cycle continues normally.</p>

  <p>Resolution expected by <strong>{expected_return_date}</strong>.</p>

  <p>For immediate help: <a href="tel:{fallback_handler_phone}">{fallback_handler_phone}</a></p>

  <p>— {pariwar_name} Trustee Panel</p>
</body>
</html>
```

**Plaintext body (mirrors HTML; required per email best-practices):**

```
{recipient_role_salutation_hindi},

हमारे संचालन में अस्थायी देरी है; आपके Pariwar का मासिक सहयोग चक्र सामान्य रूप से चालू है।

{expected_return_date} तक स्थिति समाधान हो जाएगी।

तत्काल सहायता के लिए: {fallback_handler_phone}

---

{recipient_role_salutation_english},

We are operating with reduced staff bandwidth; your Pariwar's monthly sahyog cycle continues normally.

Resolution expected by {expected_return_date}.

For immediate help: {fallback_handler_phone}

— {pariwar_name} Trustee Panel
```

**Salutation substitution variables:**

- `recipient_role_salutation_hindi` = "सम्मानित ट्रस्टी" (trustee) / "सम्मानित स्टाफ साथी" (staff) / "सम्मानित साथी" (member)
- `recipient_role_salutation_english` = "Respected Trustee" / "Respected Staff Colleague" / "Respected colleague"

## Tone + content discipline (per README §12)

Same as `push-channel.md` § "Tone + content discipline" + email-specific additions:

- Subject line is the email-specific tone-test — "Operational delay notice" is honest framing without panic; "URGENT — TRUST SUSPENDED" or equivalent escalation would violate UX Stance #5 "no urgency theater".
- Email-provider-specific HTML rendering quirks (Outlook, Apple Mail, Gmail mobile) are operations-policy concerns; the framework body is HTML5-conformant and renders acceptably across major clients per standard email best-practices.

## Triggering surfaces (cross-link to `../surface-inventory.md`)

This template is cited by the following surface rows:

- Trustee-Lite signals panel (Tier 2; trustee-class)
- Niyamavali amendment workflow (Tier 2; trustee-class) — (**`gracefully-suspended`** surface: email fires to explain the amendment pause; template body IS the suspension notice, not an operational update)
- Fixed-amount setter (Tier 2; trustee-class) — (**`gracefully-suspended`** surface: email fires to explain the setting-change pause; template body IS the suspension notice)
- R9 voting workflow (Tier 2; trustee-class)
- Audit-of-Anita UI (Tier 2; trustee-class)

The template is also implicitly cited by any future Phase-2 opted-in member-class surface; for v1 the email channel is exclusively trustee-class + staff-class.

## Legal-counsel return (PLACEHOLDER — populates when Story 0.13 returns)

_When Story 0.13 returns counsel review on this template, the return is logged in `../degradation-policy-ledger.md` Legal-counsel revision log; the revision is applied as a `legal-counsel-revision-YYYY-MM-DD.md` patch file in this directory; the prior body is preserved in a `superseded-YYYY-MM-DD.md` snapshot; the PENDING LEGAL REVIEW marker at the top of this file is replaced with `LEGAL REVIEW RETURNED (YYYY-MM-DD)` per the marker-removal discipline in `../README.md` §4 invariant 6._

**Counsel-review-specific considerations for the email channel:** counsel should evaluate (a) DPDPA disclosure requirements in email body (does degraded-posture activation constitute a "service interruption" that requires specific disclosure?); (b) trustee-fiduciary-disclosure language for trustee-class recipients (is the body adequate for the trustee's fiduciary disclosure obligations?); (c) email-tracking-pixel + open-tracking opt-in posture per DPDPA consent registry. These considerations are surfaced for counsel; resolution lies with counsel + Trustee Panel.
