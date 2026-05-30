# PRD Quality Review — TWT v1 (Update Cycle 2026-05-27)

> Update-cycle review. Findings weighted on the 2026-05-27 changes: Anita persona rewrite (§2.3 + §6.2), new §4.15 Future Benefit Hooks with FR-100 (Durghatana Sahayata forward-compat), and the FR-1 v1-posture / Out-of-Scope update. Pre-existing PRD content reviewed only where touched or contradicted by today's changes.

## Overall verdict

The update is well-conceived and largely well-executed. The Anita correction propagates cleanly — §2.3 and §6.2 read as the same person, and the operational role (staff, scope=Patna) is unchanged from prior text, so the "full-time paid TWT staff" framing slots in without cascading rewrites elsewhere. The §4.15 / FR-100 surface is genuinely a forward-compat hook (not a hidden v1 feature in disguise), the `pool` vs `reserve` distinction maps the conceptual axis sharply, and the Jivandan ≠ Durghatana Sahayata cross-reference is explicit in three places (Glossary × 2, FR-100 prose). What's at risk: the `benefit_mechanism` enum was added to FR-7's rule registry contract by reference only — FR-7 itself was not updated; cost-model implications of Anita-as-salaried-headcount (flagged in the decision log) have not landed in §9.3 or the Risk register; and FR-100 has no `[ASSUMPTION]` tags despite making several inferences (R15-style framing, "ground-inspection-gated", "gift, not entitlement" posture inheritance) that the Trustee Panel has not yet ratified.

## Decision-readiness — adequate

The two big decisions (Anita = paid staff; Durghatana Sahayata is a *reserve*-mechanism benefit, NOT a daan, NOT in v1) are stated as decisions, not buried. FR-100's "do not conflate" against Jivandan is the kind of named tension that earns its place. The trade-off — shipping a hook today instead of waiting for the full Durghatana Sahayata spec — is implicitly acknowledged via the narrowness of what FR-100 commits to (receipt persistence, payout-destination *capability* reservation, enum value present-but-unused, separate-entity commitment, audit-log reuse). That's a real trade-off captured at adequate fidelity.

Where decision-readiness softens: FR-100's `[NOTE FOR PM]` ("forward-compat surface is intentionally minimal") reads more like a justification than a tension surfacing. The actual tension — "are we sure the `benefit_mechanism` enum should have exactly two values and not be more granular?" — is in the decision log but not in the PRD. A decision-maker reading FR-100 cold sees a confident architectural commitment with no visible doubt.

### Findings
- **medium** FR-100 enum-width bet not flagged as tension (§4.15) — The `benefit_mechanism: pool | reserve` two-value enum is a forward architectural bet (decision-log records it replaced narrower predecessors), but FR-100 prose presents it as settled. *Fix:* Add a `[NOTE FOR PM]` near the enum description: "Two-value enum is a forward bet — future products may force a third mechanism (e.g., subsidized-partner-benefit). Trustee Panel ratifies pre-Durghatana-Sahayata launch."
- **low** FR-100's `[NOTE FOR PM]` is informational, not tension-surfacing (§4.15 closing Notes) — Current text justifies the design; doesn't name what could go wrong. *Fix:* Reframe to name the live tension (e.g., "Reserve-mechanism rules will require their own audit-of-disbursement discipline that v1's audit log doesn't yet specialize for. Defer specification but track.").

## Substance over theater — strong

§4.15 is not furniture. It does load-bearing work: it carries the "what does the ₹110 buy?" forward-compat surface out of FR-1 so FR-1 stays focused on the fee transaction. The Glossary disambiguation (Jivandan as crowdfunded daan; Durghatana Sahayata as trust-paid assistance benefit; explicit "not the same as" cross-references both ways) is exactly the kind of glossary work that prevents downstream drift. Anita's §6.2 rewrite replaces the prior volunteer framing with motivation that fits the full-time paid framing without being mawkish.

### Findings
*(none — substance holds)*

## Strategic coherence — strong

The update tightens the PRD's existing thesis (mutual aid ≠ insurance; trust ≠ guarantor) rather than introducing a new one. §4.15 explicitly preserves FR-1's "₹110 buys no direct return in v1" posture *while* establishing the future-eligibility-anchor relationship — this is the right way to express "no entitlement now, no closed door later" in a PRD, and it composes with the FR-19 "actual delivery, no top-up" / FR-33 "Contribution Note, not receipt" / FR-94 trust posture clauses without strain. The Anita-as-staff correction tightens §2.6 (the Trustee + Staff frame): all references to "Anita-class shepherds" elsewhere in the PRD now have a clean home in the §2.6 staff layer, where the persona description previously implied a hybrid teacher-volunteer that didn't quite fit.

### Findings
*(none — coherence holds)*

## Done-ness clarity — adequate

FR-100's consequences (receipt persistence reconstructable, payout-destination capability reserved as architectural-not-schema-locked, rule registry tags rules by `benefit_mechanism`, separate entity for future requests, trust-disbursement audit reuse, benefit independence) are individually testable. An engineer reading FR-100 alone could write the v1 implementation: ensure receipts persist with the fields listed in FR-1's consequences; add `benefit_mechanism` column to the rule-registry schema with values `pool` and `reserve`; tag all v1 rules `pool`; do NOT add payout-destination tables.

What's thin: the `benefit_mechanism` enum is introduced in FR-100 but FR-7 (Versioned per-Pariwar rule registry, the canonical home of the rule registry) has not been updated to reflect that its schema now includes this discriminator. An engineer implementing FR-7 in isolation would miss this. The cross-reference exists from FR-100 ("the Niyamavali rule registry (FR-7) tags every rule with a `benefit_mechanism` discriminator") but is one-directional. FR-7's "structured payload the engine consumes" prose should name `benefit_mechanism` as a required field.

Also thin: FR-100's "Receipt persistence is reconstructable" consequence depends on FR-1's "Vyawastha Shulk receipt persistence retains `paid_at`, `valid_through`, `amount`, `utr`, `payment_method` indefinitely — sufficient to back-prove…" — that line in FR-1 was added in this cycle but doesn't define what "indefinitely" means relative to FR-47's 7-year audit-log retention. If a Durghatana Sahayata request lands in year 9, can the engine still back-prove fee-paid status? The PRD says yes; the retention policy elsewhere says 7 years. This needs reconciling.

### Findings
- **high** `benefit_mechanism` not landed in FR-7 (§4.2 FR-7) — FR-100 declares that the rule registry tags rules by `benefit_mechanism`, but FR-7's consequences and payload description do not name the field. Downstream architect reading FR-7 in isolation will miss it. *Fix:* Add a bullet to FR-7 consequences: "Each rule carries a `benefit_mechanism` discriminator (enum `pool` | `reserve`; v1 ships only `pool`-tagged rules) — see FR-100 for the rationale and the forward `reserve` path."
- **high** Vyawastha Shulk receipt retention horizon ambiguous (§4.1 FR-1 / §4.7 FR-47 / §4.14 FR-96) — FR-1 (as updated) says receipts retained "indefinitely" and "sufficient to back-prove, for any past date" — but the surrounding audit-log retention is 7 years (FR-47), and DPDPA RTBF (FR-96) anonymizes contributions on request. If a member exercises RTBF in year 4 and a Durghatana Sahayata flow lands in year 9, can fee-paid status still be confirmed? Policy is undecided. *Fix:* In FR-1 (or §4.15 NFRs), name the receipt-retention window explicitly and reconcile against FR-47 (7-year audit) and FR-96 (RTBF anonymization). Or flag as `[ASSUMPTION]` / new OQ.
- **medium** Payout-destination "architectural slot, not schema-locked" is undefined-testable (§4.15 FR-100) — "Reserved architectural slot" without a schema doesn't have a test. An engineer can't verify the slot is reserved if nothing is committed. *Fix:* Either drop the consequence (it adds no testable obligation in v1) or strengthen to "v1 does NOT add a `payout_destinations` table or `payout_destination_id` FK; this is an explicit non-add."
- **low** FR-1A grace interaction with future Durghatana Sahayata not addressed (§4.1 FR-1A / §4.15) — If a member is `active_in_grace` and has an accident, is Durghatana Sahayata eligible? Out-of-scope for v1 but the *forward-compat hook* should at least note that the grace-state policy will need a Durghatana Sahayata decision. *Fix:* Add to FR-100 Out of Scope: "Eligibility of `active_in_grace` (FR-1A) members for Durghatana Sahayata — reserved for v2/v3 design."

## Scope honesty — adequate

FR-100's "Out of Scope for v1" list is thorough: member-self request intake UI, accident-evidence handling, payout-destination collection/validation/UI, accident-specific lock-in clock, Niyamavali rule predicates for Durghatana Sahayata, ground-inspection variant, "what your ₹110 bought" communication. That's seven concrete omissions named explicitly. FR-1's Out-of-Scope additions ("Any member-side return on the ₹110 in v1 — no Durghatana Sahayata (Accident Assistance) unlock, no insurance, no medical-aid path. Forward-compat hooks live in §4.15.") is a clean fence — exactly the kind of "the reader is not meant to infer" discipline the rubric asks for.

What's missing: the **Assumptions Index (§14)** and **Open Questions (§13) were not updated this cycle**, despite FR-100 making inferences that warrant `[ASSUMPTION]` tagging:

1. The "gift, not entitlement" / TSCT R15 posture inheritance — Trustee Panel has not formally ratified this for TWT. The decision log notes this is a posture choice; the PRD treats it as settled.
2. The "ground-inspection-gated" framing for future Durghatana Sahayata — the existing §4.6 ground-inspection is scoped to death claims; reusing it for accident assistance is a forward bet.
3. The two-value `benefit_mechanism` enum is a forward architectural commitment without Trustee or architect sign-off.
4. The Glossary entry for Durghatana Sahayata says "disbursed from the trust account after ground inspection" — this is a policy decision dressed as a definition; it has not been ratified.

None of these block v1 (none are v1 scope), but the rubric's "Open-items density relative to stakes" frame suggests they should at least appear as low-priority `[ASSUMPTION]` or OQ items so they don't sleep-walk into ratified status.

### Findings
- **high** Forward-compat policy inferences not surfaced as `[ASSUMPTION]` or OQ (§13, §14, §4.15) — FR-100 makes at least four inferences (R15-posture inheritance, ground-inspection-gating, two-value enum, "gift not entitlement" framing) that the Trustee Panel has not formally ratified. The decision log records iteration; the PRD presents them as settled. *Fix:* Add `[ASSUMPTION A-14]` covering "TSCT R15-style posture (gift not entitlement; ground-inspection-gated; member-self trust-paid) is the design reference for future Durghatana Sahayata; Trustee Panel ratifies pre-design at v2/v3 start." Add to §14. Optionally add OQ-17 "Future Durghatana Sahayata policy ratification — Trustee Panel sign-off on R15-style posture + `benefit_mechanism` enum + ground-inspection-gated framing."
- **medium** Anita-as-salaried-headcount cost-model impact not landed in §9.3 (§9.3 Pool-math floor, Risk register) — Decision log explicitly flags: "Anita-class is now a salaried-headcount cost factor for §9.3 cash-flow modeling — full-time salary outflow grows ahead of ₹110 fee inflow." §9.3 currently models field-worker comp as the cash-flow constraint; staff salary is not named. *Fix:* Extend §9.3 paragraph 3 (or add a §9.3 bullet) to name staff salary alongside field-worker comp as a pre-launch cash-flow modeling input. Cross-ref OQ-15 (trust staff hiring plan).

## Downstream usability — adequate

The Glossary updates are the strongest part of the cycle for downstream usability. Both Jivandan and Durghatana Sahayata cross-reference each other ("not the same as Durghatana Sahayata"; "not a *daan*"); both use the verbatim term forms ("Durghatana Sahayata" capitalized, with Devanagari दुर्घटना सहायता); the addendum §5 R15 row uses the exact term ("renamed **Durghatana Sahayata (Accident Assistance)**") and explicitly tags `benefit_mechanism = reserve` in addendum-glossary form. An architect source-extracting from this PRD will pick up the disambiguation cleanly.

The Anita changes flow with reasonable consistency. §2.3 says "full-time paid TWT staff"; §2.5 says "**The trust assigns a human shepherd per claim** — Anita-class"; §2.6 defines Trust Staff as "claim shepherding, nominee statement intake, helpdesk routing, field-worker dispatch, reconciliation triage" — Anita's described role fits. UJ-3 ("A trustee assigns a **human shepherd** — Anita-class") and UJ-4 ("Anita gets a push…") read correctly under the new framing. Addendum §6.2 ("She works full-time on TWT because she's seen what happens without it") reinforces.

Two small drift risks: (1) UJ-3 calls the shepherd "human shepherd — Anita-class"; UJ-4 just uses "Anita". Consistent but slightly informal — "Anita-class" as a noun isn't in the Glossary. Probably fine. (2) FR-41's "typically a District Admin in the deceased's scope" still uses "District Admin" — the RBAC role label — rather than "full-time paid TWT staff" — the persona framing. These are different layers (role vs persona) so this is correct, not a drift, but a downstream UX reader may need to mentally connect Anita-persona → District Admin role → Trust Staff layer.

### Findings
- **low** "Anita-class" used as noun without Glossary entry (UJ-3, §2.5 persona text) — Informal shorthand. Acceptable as-is, but a Glossary footnote ("Anita-class — informal: trust-staff personnel in the District Admin role; see §2.3 / §2.6") would lock the bridge. *Fix:* Optional Glossary footnote, or rephrase UJ-3 to "human shepherd (District Admin role)" and drop "Anita-class" usage outside §2.

## Shape fit — strong

The update reinforces the PRD's existing shape: this is a chain-top PRD (feeds architecture → UX → stories) that deliberately keeps personas thin in §2 and parks depth in addendum §6. The Anita rewrite respects that pattern — the §2.3 paragraph is short, the §6.2 expansion is where the motivation lives. The §4.15 introduction respects the "capability cluster" shape of §4 — it's a new cluster that fits the §4 ordering convention (identity → rules → pool engine → … → compliance → future hooks at the end). FR-100 is one FR (numbered correctly in global sequence) with proper consequence structure, NFR sub-section, Out of Scope sub-section, and Notes.

### Findings
*(none — shape fits)*

## Mechanical notes

- **Glossary drift:** Jivandan entry now reads "future ***daan* / crowdfunded** support category for accidental / emergency medical aid" — the addition of "Engine reuse via FR-20" is correct, and the new clause "**not** the same as Durghatana Sahayata" is well placed. The Durghatana Sahayata entry is internally consistent. No drift detected.
- **ID continuity:** FR-100 is correctly placed in §4.15 with no gap (FR-99 closes §4.14). The numbering is globally unique. The addendum's reference to FR-100 (§5 R15 row) resolves. The §6.1 In-Scope and §6.2 Out-of-Scope lists were **not updated** to reference FR-100 — but since FR-100 is forward-compat hooks (architecturally in v1, behaviorally out of v1), the omission is defensible. A line in §6.1 ("**Future Benefit Hooks:** receipt persistence covered under Identity; `benefit_mechanism` rule-registry tag (FR-100)") would tighten traceability.
- **Assumptions Index roundtrip:** FR-100 has no inline `[ASSUMPTION]` tags. §14 was not updated this cycle. See the Scope-honesty `[ASSUMPTION A-14]` finding above.
- **Open Questions roundtrip:** §13 was not updated this cycle. Consider OQ-17 (Future Durghatana Sahayata policy ratification) as discussed under Scope honesty.
- **UJ persona linkage:** Anita appears in UJ-3 and UJ-4. Both link to §2.3 by exact persona label. No new UJs were added this cycle (Durghatana Sahayata is out-of-scope so no UJ); correct.
- **Cross-reference check on addendum §5 R15 row:** "rule-tagged `benefit_mechanism = reserve`" — uses backticks, matches FR-100 prose form. "(FR-100, §4.15)" cross-ref resolves. Phrasing "trust-paid assistance benefit … not a daan / pool support category" matches Glossary. Clean.
- **Required sections present:** §0 Document Purpose, §1 Vision, §2 Target User, §3 Glossary, §4 Features (now including §4.15), §5 Non-Goals, §6 MVP Scope, §7 Success Metrics, §8 NFRs, §9 Constraints, §10 Why Now, §11 Stakeholders, §12 Rollout, §13 OQs, §14 Assumptions. All present. No new section gaps introduced.
