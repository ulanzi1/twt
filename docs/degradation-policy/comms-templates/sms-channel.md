# Comms template: SMS (DLT-transactional PE/OE) — degraded posture activation

> **⚠️ PENDING LEGAL REVIEW PER STORY 0.13** ⚠️
>
> **THIS TEMPLATE BODY IS PROVISIONAL.** It remains pending legal counsel review per Story 0.13. The marker is removed ONLY via `../degradation-policy-ledger.md` "Legal-counsel revision log" + trustee co-sign + supersession-schema marker. **Silent marker removal is a framework violation.**

**Status:** drafted (Story 0.4 author-commit 2026-05-29); awaiting trustee sign-off (Story 0.4 Task 7); awaiting Story 0.13 counsel return (Story 0.4 Task 9); awaiting DLT-transactional template registration (PE/OE header) per architecture §2.2 + §3.4 as an operational prerequisite.

**Architectural authority:** architecture.md §2.2 (DLT-transactional PE/OE SMS for OTP + step-up + transactional fallback) + §3.4 (SMS three preserved surfaces) + addendum RA-29 (bulk-alert SMS banned). This template is content authored for fire-conditions (3) and (4) in the README §5 channel-hierarchy invariant cross-check; it is NOT and CANNOT BE authored for a bulk-alert fire-condition.

**Routing:** dispatched via Story 5.1 alert dispatcher + Story 5.6 SMS transactional fallback channel. Per architecture §3.4 fallback ladder, this template body is rendered when:

- **Per-member transactional fallback path** — both WA gates ACTIVE + WA delivery returns undelivered after the committed retry window (3 attempts × exponential backoff per §3.4). Fires per message, not per cohort. Members without active WA opt-in do NOT receive this template (they receive only the in-app push per `push-channel.md` and the public-page banner per `public-page-banner.md`).
- **Pariwar-degraded-mode cycle-open SMS bridge path** — per-Pariwar push delivery rate falls below threshold AND WA admin-toggle is OFF. Fires for time-critical templates; for degraded-posture activation, the trigger is operations-policy-gated (the policy decides whether the degraded-posture activation event is time-critical enough to fire the SMS bridge; default = no, the public-page banner is sufficient).

**Suppression:** members in frozen Account State Machine states do NOT receive this template (lifecycle-driven dispatch suppression per architecture §3.4); the cache-safe public-page banner is the in-scope channel for frozen-state members. OTP-SMS and step-up-OTP-SMS continue to fire under frozen states per §2.2 (they are not subject to lifecycle-driven dispatch suppression).

## ⚠️ Framework violation guard — what this template MUST NOT BE

Per the README §4 invariant 3 and §5 channel-hierarchy cross-check:

- This template MUST NOT be dispatched as a bulk-alert SMS (banned per RA-29).
- This template MUST NOT be added to a fifth SMS fire-condition (a bulk-alert degraded-posture path) — the four named conditions in §3.4 are exhaustive.
- This template's dispatch path is **per-member** (fallback path) or **per-Pariwar threshold-conditional** (cycle-open bridge path). NOT broadcast-to-cohort.

A framework revision that introduces a bulk-alert SMS path is a structural-invariant violation requiring a `.decision-log.md` `[GOV]` entry amending the channel hierarchy — not a silent rewrite.

---

## Channel-specific shape constraints

> **Language policy note:** The policy primary across all five degradation-policy comms channels is Hindi (Devanagari script) per UX Cross-Cutting "i18n at the core" and README §12. This channel is the **sole exception**: the SMS body uses Hinglish (Latin/GSM-7 script) because Devanagari exceeds the 70-char Unicode single-segment budget (~74 chars for equivalent copy), which would force a 2-segment SMS at 2× cost at scale. Hinglish is therefore the **technically mandated implementation vehicle** for the Hindi-primary policy on this channel — not a policy exception from Hindi. The policy primary remains Hindi; the GSM-7 constraint governs the script. Devanagari SMS is preserved as an alternative for carriers/use-cases that support Unicode multi-segment; see "Devanagari alternative" section below.

- DLT-transactional registration per architecture §2.2 — PE (Principal Entity) + OE (Originating Entity) headers registered with the DLT operator (Bharti Airtel / Jio / Vi DLT consortium).
- Per-template DLT registration: this template is registered as a transactional template with the body below; registration is operations-policy work (Story 5.6 + per-Pariwar operations).
- Body length: bounded ≤ 160 chars per SMS single-segment constraints (multi-segment SMS permitted but cost-multiplicative; the framework targets single-segment).
- Language: Hindi-Devanagari NOT supported on all India carriers in single-segment SMS (Devanagari = 70-char Unicode segment vs 160-char GSM-7 segment). Template body MUST fit Hindi within the 70-char Unicode budget OR fall back to Latin-script transliterated Hindi (Hinglish) within the 160-char GSM-7 budget. **Recommendation:** use Hinglish for SMS single-segment fidelity; Devanagari Hindi for the push + WA + email + public-page banner channels which have no such constraint.
- DLT header rendering: the PE/OE header is prepended by the DLT operator; the template body is the part below the header.

## Variables to substitute

Constrained by the 70-Unicode / 160-GSM-7 segment budget. Recommended substitution set:

- `{expected_return_date_short}` — concrete date in DD-MM-YY format (8 chars).
- `{fallback_handler_phone_short}` — phone number in 10-digit format (10 chars) OR shortcode if registered.

Pariwar name is encoded in the DLT PE/OE header, NOT in the body — saves ~12 chars of body budget.

## Variables to NOT substitute

Per architecture §3.4 "Channel-renderer escaping discipline" + UX §PII shielding + the inherent character-budget pressure:

- No member PII (no member name, no member-id, no mobile/email/address/DOB).
- No claim case identifiers, pool identifiers, contribution amounts.
- No internal-system identifiers.

The character budget enforces minimalism — there is no room for member-specific data even if the PII discipline allowed it.

## Template body (Hinglish — GSM-7 segment for single-segment SMS)

**Body (recommended — Hinglish, 156 chars including spaces):**

```
TWT Pariwar: Sanchalan mein asthayi deri. Aapka sahyog chakra normal hai. Sthiti {expected_return_date_short} tak. Madad: {fallback_handler_phone_short}. - Trustee Panel
```

Character budget: roughly 130 chars of fixed content + 8 chars date + 10 chars phone + 8 chars separators = ~156 chars; within the 160-char GSM-7 single-segment budget.

**Body (Devanagari alternative — only if single-segment Unicode budget permits; counts ~64 chars):**

```
TWT पारिवार: संचालन में देरी; सहयोग चक्र चालू। {expected_return_date_short} तक। मदद: {fallback_handler_phone_short}
```

Character budget: roughly 56 chars fixed + 8 chars date + 10 chars phone = ~74 chars; **exceeds the 70-char Unicode single-segment budget**. Devanagari requires multi-segment SMS = 2x cost. **Recommendation:** ship Hinglish for v1; revisit Devanagari for v2 if multi-segment cost is acceptable.

> ⚠️ **DO NOT REGISTER THIS BODY FOR V1** — exceeds the 70-char Unicode single-segment budget; results in a 2-segment SMS at 2× cost at scale. The Hinglish body above is the v1 DLT registration candidate. This body is preserved as a v2 option only.

**Operations-policy decision required at template-registration time:** Hinglish vs Devanagari (vs both via per-member language preference) — the dev framework commits the **template body options**; the registration choice is operations policy (forward-deferred).

## Tone + content discipline (per README §12)

- **No urgency theater** per UX Stance #5.
- **No module-promotion language** per UX Stance #1.
- **No punitive language** per UX Stance #5.
- **Hinglish is acceptable** for SMS only — every other channel uses Devanagari Hindi primary. The Hinglish exception is character-budget-driven, NOT a tone preference.

## Triggering surfaces (cross-link to `../surface-inventory.md`)

This template is cited by the following surface rows:

- Sunita-mode nominee console (Tier 1; via per-member fallback ladder when WA undelivered)

The template is NOT cited as a primary channel for any surface — it is exclusively a fallback ladder element per architecture §3.4 fire conditions (3) and (4). Surfaces that need SMS reach for the degraded-posture event flow through the per-member transactional fallback when WA fails OR the Pariwar-degraded-mode cycle-open bridge when the threshold condition fires.

## Legal-counsel return (PLACEHOLDER — populates when Story 0.13 returns)

_When Story 0.13 returns counsel review on this template, the return is logged in `../degradation-policy-ledger.md` Legal-counsel revision log; the revision is applied as a `legal-counsel-revision-YYYY-MM-DD.md` patch file in this directory; the prior body is preserved in a `superseded-YYYY-MM-DD.md` snapshot; the PENDING LEGAL REVIEW marker at the top of this file is replaced with `LEGAL REVIEW RETURNED (YYYY-MM-DD)` per the marker-removal discipline in `../README.md` §4 invariant 6._

**Counsel-review-specific considerations for the SMS channel:** counsel should evaluate (a) DLT-transactional template content compliance under TRAI guidelines; (b) DPDPA consent implications of the SMS fallback under degraded-posture broadcast (member's WA opt-in is the consent boundary; SMS fallback inherits the same consent surface per architecture §3.4); (c) per-Pariwar PE/OE-header content rules. These considerations are surfaced for counsel; resolution lies with counsel + Trustee Panel.
