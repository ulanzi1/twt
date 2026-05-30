# Comms template: Public-page banner (cache-safe Astro SSR) — degraded posture activation

> **⚠️ PENDING LEGAL REVIEW PER STORY 0.13** ⚠️
>
> **THIS TEMPLATE BODY IS PROVISIONAL.** It remains pending legal counsel review per Story 0.13. The marker is removed ONLY via `../degradation-policy-ledger.md` "Legal-counsel revision log" + trustee co-sign + supersession-schema marker. **Silent marker removal is a framework violation.**

**Status:** drafted (Story 0.4 author-commit 2026-05-29); awaiting trustee sign-off (Story 0.4 Task 7); awaiting Story 0.13 counsel return (Story 0.4 Task 9); the rendering surface (public Astro SSR shell per Story 2.5) does not yet exist at v1 author-commit — the banner does not render in the wild until Story 2.5 + Story 11a.5 (noticeboard strip foundation) close.

**Architectural authority:** architecture.md §5.8a ("Cache-safe public SSR guarantee — Public SSR output is cacheable at the CDN / edge under standard public-cache semantics — it contains no member-conditional content, no session-derived branching, no PII"). The banner is part of the SSR output that's CDN-cacheable; it MUST NOT carry member-state.

**Routing:** rendered by the public Astro SSR shell (Story 2.5) at request time; cached at the Cloudflare edge (or substitute per architecture §5.8a pivot-readiness) per standard public-cache TTL semantics. NOT a dispatcher-routed channel — the banner is server-rendered into every public-surface response while degraded posture is active.

---

## ⚠️ Framework violation guard — what this banner MUST NOT carry

Per the README §4 invariant 5 and §6 Account State Machine cross-check + architecture §5.8a cache-safe SSR guarantee:

- **No PII of any kind.** No member name, no member-id, no mobile/email/address/DOB, no nominee details, no claim case identifier.
- **No member-state.** No "you are in `claim-filed-frozen`" or any account-state-derived branching.
- **No auth-derived branching.** The banner is identical for non-members and authenticated members on the same page; member-specific content lives in authenticated fragments per §5.8a.
- **No payment-status, no UTR numbers, no contribution amounts.** Pool-level statistics that are already public per FR-77 (Sahyog Vivran shows contributor count) MAY appear elsewhere on the page but are NOT part of the degradation banner content.
- **No urgency theater** per UX Stance #5.

A banner revision that introduces any of the above is a cache-safe SSR violation — the banner content MUST flow through the same `public-page-banner.md` template body that this file commits.

## Trigger conditions

**Primary trigger:** degraded posture activated. The banner is rendered into every public-surface response while the activation flag is `true` in the public-SSR config. Cache TTL respects the §5.8a cache-safe contract; the banner is structurally identical across cache instances.

**Suppression:** none. The banner is visible to:

- Anonymous visitors on twt.org.
- Authenticated members visiting public surfaces (e.g., twt.org/sahyog-list).
- Members in frozen Account State Machine states (the §3.4 lifecycle-driven dispatch suppression does NOT apply to the public-page banner — it applies to push/WA notifications only; frozen-state members visiting a public surface DO see the banner because the suppression is about member-class push, not about public-page render).
- Search-engine crawlers (the banner is in the SSR HTML and is therefore indexable; the crawler-visibility is acceptable because the banner content is structurally public per the cache-safe SSR guarantee).

**Dismissal:** the banner is dismissible at the visitor session-level (cookie / localStorage). Server-side dismissal state is NOT permitted per the cache-safe SSR invariant — if the server rendered different content for "dismissed" vs "not dismissed" visitors, the cache would fragment per session, breaking §5.8a.

**Member-side dismissal at authenticated surfaces** (Story 2.5 / 11a.5 territory): if a member wants to dismiss the banner on the authenticated surfaces (not the public-SSR surfaces), that is a Story 2.5 / 11a.5 concern (authenticated fragment registry). Story 0.4 explicitly does NOT prescribe member-side dismissal. The boundary is recorded here so a future Story 2.5 / 11a.5 dev does not violate the cache-safe SSR property.

## Channel-specific shape constraints

- HTML5; rendered by Astro SSR per Story 2.5.
- Bilingual (Hindi primary + English secondary) inline; language toggle is a server roundtrip per the Niyamavali page pattern (Story 2.5).
- Cacheable per Cloudflare standard public-cache semantics; TTL per the §5.8a cache-safe contract (typically 1-5 minutes for degraded-posture activation timeliness; the specific TTL is operations-policy).
- Banner position: top-of-page, above the content; sticky on scroll per UX §Component Library Tier-2 surface inventory NoticeboardStrip pattern (Story 11a.5 NoticeboardStrip is the structural anchor once that Story closes).
- Banner styling: per UX §6 Design System Foundation; degraded-posture banner uses the "in-process / pending external action" color (yellow per UX §Visual grammar primitives) — same color the StatusPill yellow state uses (consistent semantic across the visual system).
- No interactive content (no buttons, no forms); only the helpline link is interactive (a `tel:` link).
- No image content (per the no-PII discipline + UX Stance #5 no-urgency-theater).

## Variables to substitute

Server-side substitution at SSR render time:

- `{pariwar_name}` — Pariwar name from the per-Pariwar SSR config (e.g., "TWT-Bihar").
- `{expected_return_date}` — concrete date in "DD MMM YYYY" format; sourced from the degraded-posture activation flag's metadata.
- `{fallback_handler_phone}` — phone number from operations policy.

## Variables to NOT substitute

The cache-safe SSR invariant constrains the substitution set tightly:

- No member-specific data of any kind (per the framework violation guard above).
- No session-state, no auth-state, no cookie-derived values.
- No request-IP-derived geo (cache fragmentation risk).
- No user-agent-derived branding (cache fragmentation risk).
- No `{recipient_role}` (the banner is identical for all visitors per §5.8a).

## Template body (Hindi primary + English secondary)

**HTML (server-rendered by Astro SSR):**

```html
<aside class="banner banner--degraded-posture" role="alert" aria-label="Trust operational notice">
  <div class="banner__hindi" lang="hi">
    <p>
      <strong>{pariwar_name}</strong> ट्रस्ट वर्तमान में सीमित स्टाफ बैंडविड्थ के साथ संचालित हो रहा है;
      मासिक सहयोग चक्र सामान्य रूप से चालू है।
      स्थिति समाधान <strong>{expected_return_date}</strong> तक अपेक्षित है।
      तत्काल सहायता के लिए <a href="tel:{fallback_handler_phone}">{fallback_handler_phone}</a> पर संपर्क करें।
    </p>
  </div>
  <div class="banner__english" lang="en">
    <p>
      <strong>{pariwar_name}</strong> Trust is currently operating with reduced staff bandwidth;
      the monthly sahyog cycle continues normally.
      Resolution expected by <strong>{expected_return_date}</strong>.
      For immediate help, contact <a href="tel:{fallback_handler_phone}">{fallback_handler_phone}</a>.
    </p>
  </div>
  <button class="banner__dismiss" data-dismiss-target="banner--degraded-posture" aria-label="Dismiss notice">×</button>
</aside>
```

**Client-side dismiss script** (Story 2.5 + Story 11a.5 territory; sketch only):

```javascript
// Stores dismissal in localStorage scoped to this visitor session only.
// Server is unaware of the dismissal — cache-safe SSR property preserved.
document.querySelector('.banner__dismiss')?.addEventListener('click', (e) => {
  const target = e.target.dataset.dismissTarget;
  document.querySelector(`.${target}`).style.display = 'none';
  localStorage.setItem(`dismissed-${target}`, Date.now());
});
```

**CSS (degraded-posture color = yellow per UX §Visual grammar; minimal sketch):**

```css
.banner--degraded-posture {
  background: var(--color-yellow-pending);
  color: var(--color-text-on-yellow);
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
```

The HTML + CSS + JS sketches above are committed for the comms-template content; the actual implementation (component composition, CSS tokens, Astro integration) is Story 2.5 + Story 11a.5 + Story 1.17 (design system foundation) territory.

## Tone + content discipline (per README §12)

Same as `push-channel.md` § "Tone + content discipline" + public-banner-specific additions:

- Color signal = yellow (in-process / pending external action) per UX §Visual grammar — consistent with the StatusPill yellow state. Red (mismatch / blocked) is NOT appropriate; degraded posture is not a mismatch.
- Sticky on scroll per the NoticeboardStrip pattern (Story 11a.5) — once that Story closes, the banner integrates with the NoticeboardStrip rather than rendering as a separate `<aside>`.

## Triggering surfaces (cross-link to `../surface-inventory.md`)

This template is cited by all Tier 3 public surfaces:

- Sahyog Drive — active list (Tier 3)
- Sahyog Drive — archive (Tier 3)
- Sahyog Drive — detail / Sahyog Vivran (Tier 3)
- Member Directory (Tier 3)
- In Memoriam (Tier 3)
- Niyamavali public render with diff (Tier 3)

Additionally cited by Tier 1 surfaces that have a public-page presence:

- Ravi-mode claim filing (Tier 1; when the claim landing flows through twt.org)
- Account State Machine render-mode sub-rows for `disabled-T+90` and `public-record-∞` (the banner overlays the public-record render).

## Legal-counsel return (PLACEHOLDER — populates when Story 0.13 returns)

_When Story 0.13 returns counsel review on this template, the return is logged in `../degradation-policy-ledger.md` Legal-counsel revision log; the revision is applied as a `legal-counsel-revision-YYYY-MM-DD.md` patch file in this directory; the prior body is preserved in a `superseded-YYYY-MM-DD.md` snapshot; the PENDING LEGAL REVIEW marker at the top of this file is replaced with `LEGAL REVIEW RETURNED (YYYY-MM-DD)` per the marker-removal discipline in `../README.md` §4 invariant 6._

**Counsel-review-specific considerations for the public-page banner:** counsel should evaluate (a) trust-posture compliance for a publicly-rendered service-interruption notice under Indian consumer-protection law (review-adversarial.md §C-1 surfaces this fragility); (b) accessibility-disclosure obligations for visually-impaired visitors (UX-DR66/67/68 inheritance); (c) search-engine-indexability of the banner content (the banner IS indexable; whether that creates a permanent SEO record of degraded posture across past activations is an Open ADR question for operations policy). These considerations are surfaced for counsel; resolution lies with counsel + Trustee Panel.
