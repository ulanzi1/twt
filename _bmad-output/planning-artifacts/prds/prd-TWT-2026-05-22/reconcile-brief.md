---
title: Brief → PRD Reconciliation — TWT
status: review
created: 2026-05-22
source_doc: ../../briefs/brief-TWT-2026-05-22/brief.md
target_docs:
  - ./prd.md
  - ./addendum.md
---

# Brief → PRD Reconciliation

Comparison of `brief.md` (final product brief) against `prd.md` + `addendum.md`. The goal is to surface ideas — especially qualitative ones — that the FR structure may have silently dropped, weakened, or contradicted.

## 1. Carried forward (strong)

These brief items are cleanly captured by the PRD/addendum with their meaning intact.

| Brief idea | Where in PRD/addendum |
|---|---|
| Member-funded mutual aid, ~₹50 lakh nominee target | §1 Vision, Pool Math addendum §3 |
| TSCT as proven reference (~₹247cr / 556 families) | §1 Vision; addendum §2 divergence table |
| TWT v1 = **first instance** of a multi-tenant Pariwar Platform | §1 Vision, §4.8, FR-59 |
| `pariwar_id` first-class on every multi-tenant table from day 1 | FR-59, Glossary, addendum §7 |
| Rail Parivar / Public Servants Parivar / Bank Parivar as planned tenants | §1 Vision, §3 Glossary, Phase 4 rollout |
| Single ₹110/year mandatory Vyawastha Shulk (divergence from TSCT voluntary) | FR-1, addendum §2 + §5 |
| UPI Intent only for support pool; no payment gateway for trust money | FR-27, §4.5, FR-94, addendum RA-4 |
| UTR self-attestation + nominee daily statement intake + matcher | FR-28, FR-29, FR-30 |
| Screenshot upload **only** mandatory on UTR mismatch | FR-32 (explicitly stated) |
| Mahabharata pool naming, extensible / culture-rooted | FR-13, Glossary, OQ-12 |
| Deterministic balanced assignment `hash(member_id+cycle_id) mod N` | FR-14 |
| Dual nominee bank accounts (RBI UPI workaround) | FR-31 |
| 15-day contribution window | FR-22, Glossary |
| 12-month advance notice on fixed-amount changes | FR-15, UJ-6 |
| Peer mesh **AND** ground inspection — both, not either | FR-39, FR-40, §4.6 description, [NOTE FOR PM] |
| Human shepherd per claim | FR-41, UJ-3, §2.5 |
| Nominee bank entered at **claim-time**, not signup | FR-4, FR-37 |
| Trustee-Lite signals panel (not Kanban) for v1 | FR-42, FR-57, addendum RA-26 |
| Flexible RBAC, 12 default roles, scope dimensions, immutable 7y audit log | FR-44–FR-47 |
| Module marketplace (HDFC, LIC, health-camp); ops self-fund via commission | §4.9, SM-6 |
| Crowdfunding Module killed in v1; Phase 2/3 trust-intermediated, 80G, 10% cut | FR-67 Out of Scope, addendum RA-6 |
| Public donation directly to nominee — killed (PMLA exposure to bereaved) | §5 Non-Goals, addendum RA-6 |
| Public trust ledger / commission disclosure — killed (political risk) | §6.2, addendum RA-1/RA-2/RA-3 |
| Public = member contributions + verifier names; ledger private | FR-74 |
| DPDPA compliance (export, RTBF, consent registry) | FR-95–97 |
| Multi-channel: in-app primary, WhatsApp toggleable, Telegram **mirror** (not mandatory) | FR-23, FR-70–73, addendum §2 |
| Hindi + English bilingual; additional languages v2+ | FR-68, §5 |
| Cloudflare front + Bot Management + Turnstile, PII shielding, anti-scrape | FR-88–92 |
| Solo + self-funded; PRD applies to *build capacity* not trust ops | §2.6, §9.1 |
| Three uncompromisable subsystems (Pool Engine, Reconciliation, RBAC/multi-tenant) | §9.1 explicit |
| Pool-math floor ~4L members; Bihar field-worker recruitment is the lever | §9.3, SM-2 |
| NSCT geographic-bypass posture | §9.4, OQ-10 |
| Naming question (TWT vs Shikshak Parivar) | §13 OQ-1 |
| Out-of-scope list (eHRMS auto-fetch, AA reconciliation, full Kanban, etc.) | §6.2, addendum §1 |
| Trustee-adjustable lock-in starting at 30d, member-count-driven ramp | FR-8, addendum §7 |
| Field-worker comp gated on KYC + ₹110 + first valid contribution | FR-84, addendum §2 |
| Contribution Note never "receipt"/"invoice" | FR-33, Glossary |

## 2. Carried forward (weak) — texture partially lost

These appear in PRD but the qualitative voice has been thinned to a checklist line.

### 2.1 "Patience as discipline" (brief §What Makes This Different)

> "Slow burn is the build strategy. v1 ships when the first end-to-end claim closes cleanly, not on a runway-dictated date. Multi-Pariwar expansion happens when the first Pariwar's math works, not when a deck slide demands it."

PRD captures the **scheduling consequence** (SM-1 = "first claim closes cleanly," Phase 4 = "when Bihar math works") and the **resource consequence** (§9.1 sequencing). What's lost: **patience as an explicit product virtue** — the idea that the trust's posture, the build cadence, and the pool-math floor philosophy are all the same discipline. It reads in PRD as a sequencing rule; in the brief it is a stance. Recommend a one-line tone marker in §9 or §1 making patience a named virtue, not just a sequencing principle.

### 2.2 "Trust posture codified in the product"

> "'Facilitator, not guarantor. No judicial challenge accepted.' This isn't fine print — it's reflected in the UX (Contribution Note, never 'receipt' or 'invoice'), in the rules engine (under-funded cycles deliver actual collection, no top-up), and in the transparency policy (member contributions public; trust ledger private)."

The three concrete encodings (Contribution Note naming, FR-19 under-funded behavior, FR-74 transparency matrix) all exist. What's weaker: the brief argues this is **one coherent posture made structural in three places**. PRD treats the three as independent FRs in three different sections. The unifying thesis "trust posture is encoded across the surface, not put in fine print" is implicit at best. §4.14 ("Trust Posture, Compliance & DPDPA") description gestures at it but doesn't name the three encodings as the same posture.

### 2.3 "TWT is a community, not a coalition / not a service"

Brief: members are "part of something honorable — not a customer of a service" (JTBD). Brief framing — *chanda* (community contribution) with rules — and the warm-formal सम्मानित साथी address — are partial encodings of a deeper "not a service, not insurance, not a fintech, a community of mutual obligation" posture.

PRD has the address (Glossary, FR-69), has "not a teacher community / social network" in non-goals (§5), and has the JTBD line in §2.7. What's weaker: the brief's distinction between a *community of obligation* and a *service* (or worse, an *insurance product*) is the philosophical center; PRD's non-goals list it correctly ("not insurance, no actuarial pricing, no top-up, no entitlement") but separates it from the warm-formal voice. The voice and the no-entitlement posture are the same idea. They could be cross-linked.

### 2.4 "Friction-by-default" → "friction reserved for cases that need it"

Brief: "TSCT's pain point (mandatory screenshot upload for every contribution) is solved by member UTR self-attestation + nominee-pushed daily bank statements + a UTR matching engine. Screenshot upload still exists, but only as an optional fallback that becomes mandatory when a UTR fails to match — friction is reserved for the cases that actually need it."

PRD captures the mechanism (FR-28–32) but loses the *design philosophy*: **friction is a resource — spend it where evidence demands it, not by default**. This is a generalizable principle the product applies elsewhere (no eHRMS auto-fetch but manual is fine; no AA in v1; no over-payment enforcement, only facilitated recovery). PRD has each of these as independent decisions. The brief's framing — friction-as-resource — is a unifying principle that downstream UX/architecture work would benefit from naming.

### 2.5 "Bereaved family must not face PMLA scrutiny"

Brief frames the public-donation kill in human terms: bereaved family + PMLA exposure. PRD addendum RA-6 captures the rationale crisply. PRD body (§5 Non-Goals) reduces it to "PMLA exposure to bereaved families is the reason." Compressed but accurate. Mild texture loss only — addendum carries the texture.

### 2.6 "Telegram-mandatory excludes anyone who doesn't or won't use it"

Brief §The Problem frames Telegram-dependency as *exclusion*, not just inconvenience. PRD captures Telegram as **mirror not mandatory** mechanically (FR-23, FR-73, addendum §2) — but the *exclusion-as-harm* framing is mostly lost. The reason TWT mirrors Telegram instead of dropping it is to honor the TSCT-migrating cohort; the reason it isn't mandatory is to not exclude non-Telegram users. Both halves matter; PRD captures the first more than the second.

### 2.7 "Pariwar Platform — one codebase that will later host..."

Brief opens with this vision in the exec summary. PRD opens with the Bihar scope and treats multi-Pariwar as architecture (FR-59–63). The platform vision is in §1 Vision second paragraph but feels secondary. The brief's emotional weight ("this is the *first instance* of a deliberately multi-tenant platform") is mathematically true in PRD but tonally muted. Consider strengthening §1 framing.

## 3. Gaps — present in brief, absent in PRD + addendum

### 3.1 GAP-1: "No technical moat — the real differentiation is a set of choices most builders won't make." [HIGH]

> Brief §What Makes This Different: "This product does not have a technical moat, and the brief should not pretend it does. The real differentiation is a set of choices most builders won't make"

This is an **explicit anti-brag** that frames the entire differentiation section. PRD nowhere acknowledges the absence of a technical moat or names the differentiation as *choice-discipline*. §10 "Why Now" lists structural rails (NSCT, TSCT plateau, DPDPA, UPI/DigiLocker) and structural opportunity but never says: "Anyone could build this; the moat is that we made these specific decisions and held them." Recommend adding to §10 or §1.

### 3.2 GAP-2: "v1 ships when the first claim can close end-to-end without manual heroics, not when a runway dictates." [MEDIUM — partial]

PRD SM-1 captures the *measurable* version of this. What's missing: the brief's explicit rejection of runway-driven shipping. The framing "patience over speed" / "the product space rewards patience" is the *cultural* discipline; PRD has the metric, not the discipline. See also §2.1 above. Recommend §9.1 or new §9.0 stating: ship gate is SM-1; runway/calendar does not dictate.

### 3.3 GAP-3: Field-worker comp as a **cash-flow constraint** that must be modeled before recruitment scales. [HIGH]

Brief §Constraints: "₹60–70/teacher field-worker comp is a cash-flow constraint that must be modeled before recruitment scales."

PRD names the comp rate (A-8, FR-84) and names recruitment as OQ-5. PRD does **not** name the cash-flow modeling requirement — i.e., that before the trust can scale field worker recruitment, it must model the runway against expected acquisition velocity vs. ₹110 inflow. This is critical because the trust is collecting ₹110 to fund operations (modules cover the gap eventually, but not on day 1). Recommend adding to OQ-5 owner notes or §9.3.

### 3.4 GAP-4: "If NSCT activates in Bihar before TWT launches there, the differentiation story tightens." [MEDIUM]

PRD captures NSCT-in-Bihar as monitoring concern (§9.4, OQ-10, risk register). What's missing: the **brief explicitly says the differentiation story tightens** — i.e., the narrative posture must change if NSCT preempts. PRD treats it as a risk to monitor; brief treats it as a contingency that requires repositioning. Recommend extending OQ-10 with a "contingency: differentiation re-framing required" note.

### 3.5 GAP-5: "Architecture allows renaming, but ASO and trust legal docs do not." [LOW — covered]

PRD §9.5 and OQ-1 contain this verbatim-ish. Listed for completeness; not actually a gap.

### 3.6 GAP-6: Brief's "Adjacent (future)" persona scope — "Rail employees, public servants, bank employees, other sectoral cadres whose member math demands a national or large-scope pool." [LOW]

PRD §2.8 mentions other cadres as non-users; §1 Vision mentions Rail / Public Servants / Bank. What's missing: the brief's **economic** rationale — *"member math demands a national or large-scope pool"* — which is the reason why Rail and Banking Pariwars matter most. PRD has the architecture (FR-59), the listing (Vision), and OQ-9 (pool scope per Pariwar), but the math rationale (these cadres' base sizes demand national pools) is implicit. Recommend adding to §4.8 description or §1 Vision.

### 3.7 GAP-7: "TWT v1 is the first instance of a deliberately multi-tenant 'Pariwar Platform'... each as its own app + brand + scope, all running on shared infrastructure." [MEDIUM — texture]

PRD captures the architecture (FR-59–63). What's underplayed: the *deliberateness*. The brief makes a point that other builders would *not* invest in multi-tenant scaffolding before the first tenant works; TWT does. This is a deliberate "expensive-up-front to retire technical debt before it's incurred" decision. PRD's §4.8 description hints at retrofit cost but doesn't name the deliberateness as a *differentiator*. Could be folded into §1 or §4.8.

### 3.8 GAP-8: Brief's framing of TSCT's pain points as five separate constraints (Geography, Mechanics, Channel, No mobile-native, No scaffolding). [LOW]

PRD §1 Vision lists most of these. Brief lists them as named axes; PRD prose mentions them. Mild texture loss. Not material.

### 3.9 GAP-9: Vision item — "Support categories beyond death benefit (Kanyadan, Jivandan, Vyawastha, Retirementdaan) reuse the engine rather than requiring rewrites." [LOW — covered]

PRD FR-20 covers this. Listed because the brief's phrasing names four specific *daan categories* explicitly; PRD names "future _daan reuse" generically. Trustee panel may want the explicit naming for context. Mild.

### 3.10 GAP-10: Vision item — "The Crowdfunding Module ships as a Phase 2/3 opt-in, proving the platform can absorb a regulated donation-flow surface without compromising the core peer-to-peer architecture." [MEDIUM]

PRD captures Crowdfunding as Phase 2/3 with the 80G/PAN/10% details (§4.9, addendum RA-6). What's lost: the **brief's framing that Crowdfunding is also a *test* of the platform** — does the architecture absorb a regulated-donation surface without poisoning the core peer-to-peer model? PRD treats it as a feature deferral; brief treats it as a *proof point* for the architecture. Recommend adding the "platform-stress-test" framing to §4.9 or the Vision.

### 3.11 GAP-11: "v2+ rollout per state" for additional regional languages. [LOW — covered]

PRD §5, FR-68 cover this. Not a gap.

### 3.12 GAP-12: Operational depth pointers to brainstorm + tsct-reference. [LOW — covered]

PRD `authoring_inputs` references them. Not a gap.

## 4. Qualitative-texture risks

Places where the FR / consequence structure has reduced rich brief framing to crisp engineering bullets. These are the places where downstream artifacts (UX spec, architecture, story creation) most need to refer **back** to the brief, not just the PRD.

### 4.1 The "Facilitator, not guarantor" posture is encoded but not unified

The brief positions this as a **single coherent posture made structural** in three places (Contribution Note language, under-funded cycle behavior, transparency policy). PRD distributes the three encodings across FR-33, FR-19, FR-74 — three sections, no cross-reference. A downstream developer building any one in isolation may miss that it is one stance, not three rules. **Risk:** when one of the three is contested ("can we soften the Contribution Note language?"), the reviewer may not realize they are weakening a load-bearing posture that is also encoded in FR-19 and FR-74. Recommend a §4.14 callout listing the three encodings as the same posture, or a tone-guide artifact citing them together.

### 4.2 Warm-formal tone reduced to a copy-review checklist

FR-69 says "every member-facing string passes copy review against the tone guide before merge." The brief's tone — *warm-formal*, सम्मानित साथी, *chanda*-with-rules, *community of mutual obligation* — is not just a copy-review gate. It is a product posture: members are not customers, not donors, not insurance-policyholders, not users. PRD captures the negative half (§5 Non-Goals — "not a service, not insurance, not a fintech, not a community/social-network") but separates it from the tone guide. **Risk:** UX/design artifacts may interpret the tone guide as a styling layer rather than a stance. The brief's "honorable participation, not service consumption" is the texture that gets stripped if FR-69 is treated as a lint rule.

### 4.3 "Friction-as-resource" principle is implicit, not named

Five separate FRs apply the principle (FR-32 screenshot-only-on-mismatch, FR-36 facilitated over-payment recovery, FR-19 under-funded cycle no top-up, manual KYC fallback per FR-2, no eHRMS auto-fetch per FR-1 out-of-scope). The brief frames this as **one principle**. PRD treats each as an independent design decision. **Risk:** a future PRD amendment or scope expansion may apply friction inconsistently — e.g., adding mandatory screenshot upload "for safety" without realizing it violates the friction-as-resource principle.

### 4.4 "Patience as discipline" reduced to sequencing

§9.1 captures sequencing; SM-1 captures the gate. The brief treats *patience* as a virtue — applied to v1 timing (no runway gate), Pariwar expansion timing (no deck-driven schedule), and even pool-math floor acceptance (the product is "real" before it is "fully valued"). PRD's success metrics correctly identify SM-1 (real) and SM-2 (value proposition fully landed) as **separate gates**, but the brief's idea that *both being separate is itself a discipline* is implicit. **Risk:** a future stakeholder may see the gap between SM-1 and SM-2 (12–24 months) as a *problem to solve* rather than as the expected outcome of patient growth.

### 4.5 Bereaved-family voice in the Quaternary persona (§2.5) is thin

The brief frames the bereaved family as a person who is *not rushed* — "Files a claim ~1 month after death (grief eases the rush)." PRD §2.5 captures this. UJ-3 narrates the journey. **What's at risk:** the design constraint that grief reshapes UX — slower copy, fewer fields per screen, explicit human shepherd. The "grief-aware claim UX hardening" deferral to v3 (§4.6 out of scope) is honest, but the deferral does not exempt v1 from the brief's underlying insight: *the bereaved family is the most fragile user surface*. The fact that hardening is deferred to v3 means v1 must be conservative-by-default in that surface — that conservatism isn't named.

## 5. Contradictions

None material. The PRD's deliberate divergences from TSCT are documented in addendum §2 (TSCT divergences table) with explicit rationale, and all align with brief intent. A few items to call out as *near-contradictions* that resolve on close reading:

### 5.1 Apparent contradiction: SMS

Brief §The Problem indirectly cites "SMS/WhatsApp fallback for late adopters" (in §Who This Serves: "Smartphone users (mobile-first; SMS/WhatsApp fallback for late adopters).") PRD drops SMS entirely (§4.10 out of scope, addendum §2). **Resolution:** Brief frames SMS as a *possible fallback*; PRD's drop is justified in addendum §2 ("cost and TRAI dependency"). This is a deliberate decision, not a contradiction — but it would be worth a `.decision-log.md` entry confirming that the brief's hedge ("SMS/WhatsApp fallback") was consciously narrowed to WhatsApp-only.

### 5.2 Apparent contradiction: KYC mandatory at signup

Brief §The Solution: "KYC fields are captured manually at launch and validated by trustees; DigiLocker integration switches on — and becomes mandatory — once provider approval lands." PRD FR-1 / FR-2 also says KYC is mandatory and DigiLocker becomes mandatory post-approval. Addendum RA-5 rejects "WhatsApp-only signup" in favor of "Full KYC mandatory at signup." Consistent — but the brief's phrasing "captured manually at launch and validated by trustees" creates a slight ambiguity about whether unvalidated members can transact. PRD resolves this with the `pending-valid` state (Glossary, FR-2) — they cannot. Not a contradiction; just a place where PRD has tightened a soft brief phrasing into hard state machine.

### 5.3 Apparent contradiction: lock-in baseline

Brief §The Solution does not specify a starting lock-in value; PRD FR-8 sets it at 30 days with trustee-adjustable ramp. Addendum §2 names the divergence from TSCT's 12-month flat. The 30-day starting value comes from the brainstorm, not from the brief directly. Trustee panel should confirm — but this is documented as A-5 / OQ-14, so it's not a contradiction; it is an assumption surfaced.

## 6. Recommended PRD edits

In priority order, the cheapest edits that close the most texture:

1. **Add to §1 (Vision) or §10 (Why Now):** one sentence acknowledging "no technical moat — the differentiation is held by a set of decisions most builders won't make and won't hold." Cites GAP-1.
2. **Add a §4.14 callout** listing the three encodings of "facilitator, not guarantor" (FR-33 naming, FR-19 no-top-up, FR-74 ledger-private) as a unified posture, not three independent FRs. Closes Texture-Risk 4.1.
3. **Add to §9 or §9.0:** name "patience as discipline" as the cadence principle — ship gate is SM-1, not calendar; Pariwar expansion gate is SM-2 (Pariwar-1 math works), not deck-driven. Closes GAP-2, Texture-Risk 4.4.
4. **Extend OQ-5 owner notes:** field-worker recruitment plan must include a **cash-flow model** (₹110 inflow vs. ₹65 outflow × velocity) before scaling recruitment. Closes GAP-3.
5. **Extend OQ-10:** NSCT-in-Bihar contingency includes a *differentiation re-framing* requirement, not only monitoring. Closes GAP-4.
6. **Add to §4.9 or §1 Vision:** Crowdfunding Module is also a **platform stress-test** — proves the architecture absorbs a regulated-donation flow without poisoning peer-to-peer core. Closes GAP-10.
7. **Add a tone-guide artifact note** (in FR-69 or §4.10 description): tone is not a copy-review lint — it encodes "honorable participation, not service consumption." Closes Texture-Risk 4.2.
8. **Add a `.decision-log.md` entry** confirming the deliberate narrowing of brief's "SMS/WhatsApp fallback" to WhatsApp-only. Closes contradiction 5.1.
9. **Add to §4.5 description:** name "friction-as-resource" as the principle that FR-32, FR-36, FR-19, manual-KYC, and no-eHRMS-auto-fetch all apply. Closes Texture-Risk 4.3.
10. **Add to §2.5 or §4.6:** an explicit note that v1 must be conservative-by-default in the bereaved-family surface, given that grief-aware UX hardening is deferred to v3. Closes Texture-Risk 4.5.

---

*This reconciliation does not propose new product scope. It only surfaces where the brief's qualitative texture deserves more weight in PRD prose, and where unifying principles got fragmented into independent FRs.*
