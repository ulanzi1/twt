# Interview Protocol — P0-2c VI/Low-Vision Member Accessibility Validation

> This protocol is the **operational conduct runbook** translating `ethics-protocol.md` §3 conduct standards into an actionable session checklist. Researcher reads this in full before each session.

## §0 — Pre-recruitment trustee-approval checklist

(P0-2c-distinct precondition inheriting Story 0.9 §2-tris.)

Before Solo Builder approaches any candidate, the following **MUST** be complete:

- [ ] Framework + ethics-protocol + interview-protocol + ux-dr-clause-evaluation-worksheet + recruitment-path candidates + travel-reimbursement budget + (optional) time-stipend proposal presented to Trustee Panel.
- [ ] Trustee Panel voted approval — recorded as **first row** in `trustee-review-log.md` with `review_id = pre-session-001`, `review_scope = approval-for-recruitment-pre-session`, `review_verdict = approved-for-recruitment` (or `revision-list-pending-approval` with explicit revision list co-signed by trustee via `.decision-log.md` sub-entry per Story 0.9 P-10 precedent).
- [ ] If trustee verdict is `revision-list-pending-approval`, revisions integrated into framework + re-presentation + re-vote BEFORE recruitment.
- [ ] If quorum unavailable, Trustee Panel chair emergency approval recorded with `emergency_approval_expiry_date` (30-day window) + `second_trustee_re_review_required = true` per Story 0.9 D-02 precedent.

**Per Story 0.9 D-06 precedent:** broad trustee approval covers all four enumerated recruitment paths broadly — no re-approval needed for path-change between approval and recruitment, as long as the path stays within the enumerated set.

## §0-bis — Pre-recruitment prototype-operability checklist (P0-2c-distinct)

(P0-2c-distinct precondition not present in Stories 0.8/0.9.)

Before Solo Builder approaches any candidate, **TWT signup + My Pool + Yogdaan Bahi prototype surfaces MUST be verified operable for real AT walkthrough**:

- [ ] **Substrate verified** per Story 0.14 P0-5 ratify-decision closure (RN + Tamagui).
- [ ] **Minimum viable navigation present** on signup flow: OTP entry → KYC step → nominee declaration → medical disclosure → ₹110 UPI intent.
- [ ] **Minimum viable navigation present** on My Pool card: `<ActiveContributionCard>` renders + 15-day countdown + UPI intent button + status pill.
- [ ] **Minimum viable navigation present** on Yogdaan Bahi: `<ContributionTimeline>` renders with ≥10-row sample data + virtualization active.
- [ ] **AT API surface area present per UX-DR67:**
  - React Native Accessibility props wired per UX spec lines 1199-1201: `accessibilityLabel`, `accessibilityRole`, `accessibilityHint`, `accessibilityLiveRegion` on focusable + interactive elements.
  - Semantic HTML + ARIA attributes on web (Astro) surfaces: correct landmark elements (`<main>`, `<nav>`, `<button>`), `aria-label` on icon-only controls, `aria-live` regions for dynamic content (P-18 review-patch: Astro/web-substrate AT API check parallel to RN check above).
  - Tamagui / Radix accessibility primitives engaged per UX spec lines 685-687.
- [ ] **Per-surface operability checklist signed off by Solo Builder** in `recruitment-log.md` (`prototype-operability` field per surface).
- [ ] **Per-surface non-operability acknowledged a priori:** if any surface is non-operable, recruitment may proceed but the non-operable surface is marked `not-evaluated-due-to-prototype-surface-coverage-gap` in the UX-DR clause-evaluation worksheet a priori.

## §1 — Pre-session checklist

- [ ] Consent form printed in **Hindi** (`informed-consent-template-hindi.md`); **large-print Hindi alternative** prepared (≥18pt body text).
- [ ] **Read-aloud capability** ready (researcher can read consent aloud if requested).
- [ ] **Thumbprint pad + witness availability** confirmed (in case participant requests thumbprint-with-witness-co-signature per Story 0.9 P-14 precedent).
- [ ] Recording device prepared if participant agreed at recruitment pre-check.
- [ ] **Screen-recording-of-prototype tooling prepared** (mobile-screen-recording app on participant's device OR Solo Builder's recording laptop + cast).
- [ ] Question-bank (`question-bank.md`) readied as **prompt list, NOT script**.
- [ ] **UX-DR clause-evaluation worksheet prepared for opt-in mid-session presentation per ethics-protocol §3.7** — printed cards OR prototype-overlay OR spoken format per the README §8 Open ADR slot (researcher's choice based on participant's preferred AT modality).
- [ ] Per-session-note template (`per-session-note-schema.md`) opened in editor.
- [ ] Researcher's identifying-marker minimal (no TWT branding, no formal attire; witnessing-register dress code).
- [ ] **Travel-reimbursement cash + receipt mechanism prepared** (disability-context default per ethics-protocol §2(g)).

## §1-bis — AT-pre-flight session conducted (P0-2c-distinct)

(P0-2c-distinct precondition not present in prior P0-2 legs.)

- **≤15-min pre-flight session conducted before ≥60-min session is scheduled.**
- Participant brings own AT configuration (screen reader / magnification / voice control). Researcher does NOT prescribe or modify.
- Researcher verifies AT can navigate prototype substrate:
  - **Signup flow:** participant attempts to navigate signup screen with own AT. Researcher observes + records outcome.
  - **My Pool card:** participant attempts to navigate `<ActiveContributionCard>`. Researcher observes + records outcome.
  - **Yogdaan Bahi:** participant attempts to navigate `<ContributionTimeline>`. Researcher observes + records outcome.
- **Per-surface AT-pre-flight outcome recorded** in `recruitment-log.md`:
  - `prototype-operable-with-participant-at-config` — proceed to ≥60-min session
  - `partial-operability-N-of-3-surfaces` — proceed; mark inaccessible surface(s) `not-evaluated-due-to-prototype-surface-coverage-gap` in worksheet
  - `at-pre-flight-blocking-failure-unable-to-proceed` — recruit substitute participant per disability-network paths
- **AT-pre-flight classification rubric (P-13 review-patch):** researcher uses the following in-field criteria to assign outcomes:
  - **Operable:** participant's AT locates and activates at least one interactive element on the surface without researcher guidance; focus traversal produces at least one meaningful announcement.
  - **Partial (N-of-3):** participant's AT can interact with some elements on the surface but cannot reach or activate a specific required element (e.g., UPI button, OTP entry, list row); researcher notes which element failed and why. Surface proceeds with that element marked `not-evaluated-due-to-prototype-surface-coverage-gap`.
  - **Blocking failure:** participant's AT produces no navigation, no announcement, or completely non-functional focus traversal on the surface substrate; the surface cannot be walked at all. The failure must affect the substrate, not a single element, to be classified as blocking.
- **Researcher does NOT modify participant's AT setup** during pre-flight per ethics-protocol §3.8.
- AT-pre-flight outcome is recorded BEFORE ≥60-min session is scheduled.

## §2 — Opening

- **Greeting in Hindi with witnessing register** per ethics-protocol §3.4.
- Researcher introduces self + TWT purpose in **60-90 seconds without solicitation**: "Main BigDev. TWT ek trust hai jo Bihar mein parivaron ke beech aapsi sahyog karta hai. Main yeh design accessibility ke liye behtar banane mein aapki madad chahta hoon."
- **Warm acknowledgment of participant's time and effort to bring own AT** — "Aapne apni AT setup yahaan tak laayi/laaye, iske liye main aabhari hoon."
- Consent form review:
  - Researcher reads each section aloud if participant requested read-aloud (default for VI participants);
  - Large-print Hindi alternative provided if requested;
  - Participant signs OR provides thumbprint with witness co-signature per Story 0.9 P-14 precedent;
  - Recording-or-notes choice confirmed (verbal reconfirmation per ethics-protocol §3.5);
  - Re-consent-for-quotation checkbox explicitly confirmed.
- **Conversational warm-up** — non-sensitive topics for **3-5 minutes** (between Story 0.8's 2-3-min and Story 0.9's 5-10-min; disability-context default acknowledges AT-orientation pacing).

## §3 — Surface walkthrough discipline

- Researcher **invites participant to walk through the three named prototype surfaces in participant-led order** — signup flow / My Pool card / Yogdaan Bahi flows.
- Researcher **does NOT pre-script the walkthrough sequence**.
- **Researcher does NOT modify participant's AT setup or prescribe AT settings** per ethics-protocol §3.8.
- **Researcher does NOT interrupt participant's AT navigation** — silence after participant action is honored ≥5 seconds.
- Researcher **captures observations per the four AC-named dimensions in real-time** per-session note:
  - **Dimension 1** — where they succeeded
  - **Dimension 2** — where they got stuck
  - **Dimension 3** — what AT behavior surprised the designer
  - **Dimension 4** — what copy or interaction patterns broke
- Researcher records mental-model phrasing per the re-consent-for-quotation discipline — **paraphrase first**, re-consent later for verbatim.
- **Researcher does NOT signal expected verdict through leading prompts** per ethics-protocol §3.4 anti-leading discipline.
- Researcher captures **AT-event-by-event log** in per-session note `at-behavior-event-log` column: timestamp + AT-event type + surface + observed behavior + researcher interpretation + participant confirmation/correction + severity proposal.
- **Surface coverage minimum: 2 of 3** per ethics-protocol §3.1 + Story 0.9 D-01 precedent.
- **Time-pressure guidance (P-28 review-patch):** if participant spends >40 min on a single surface (leaving <20 min for remaining surfaces), researcher may gently offer a transition: *"Kya hum next surface bhi dekhna chahenge?"* — offered once only, no pressure; if participant declines, researcher respects participant-led order. Researcher notes in per-session note if 2-of-3 minimum was at risk.
- **Distress-pause trigger (P-29 review-patch):** if participant shows frustration or distress with AT failure, researcher immediately invokes `ethics-protocol.md §3.9` — pause walkthrough, offer to switch surfaces or continue conversationally, mark remaining clauses `not-evaluated-due-to-participant-emotional-state`. See ethics-protocol §3.9 for full procedure.

## §4 — Mid-session UX-DR clause-evaluation opt-in offer

(Per ethics-protocol §3.7; D-06 review-patch: hard time-box ≤15 min, highest-risk clauses first.)

- Researcher offers UX-DR clause-evaluation review **only after at least 1 surface walkthrough is complete** AND **only if conversation pace permits** AND **only with explicit opt-in**.
- **Time-box: ≤15 minutes total.** Researcher starts a mental (or silent) timer when participant opts in. If 15 minutes elapse, researcher stops clause evaluation and marks remaining cells `not-evaluated-due-to-pacing-constraint`.
- **Prioritization order (highest-risk first):** (1) WCAG AA critical-path clauses per NFR-20 (screen reader compatibility + form labels + keyboard navigation + color independence); (2) TWT-specific UX-DR68 clauses (Hindi TalkBack + Devanagari conjunct + Hindi voice input); (3) UX-DR65 touch-target clauses; (4) UX-DR66 same-product principle; (5) remaining UX-DR67 clauses.
- Offer wording (verbatim):

  > *"Hum kuch design rules likhe hain — accessibility ke baare mein. Agar aap chahen, hum kuch dikha sakte hain aur poochh sakte hain ki kya woh aapke experience ke saath match karte hain. Par agar aap aaram se nahin hain to bilkul zaroori nahin."*

- **If opted-in:** UX-DR66 + UX-DR67 + UX-DR68 + UX-DR65 clauses presented **one at a time** in the prioritization order above with participant's per-clause verdict captured in `ux-dr-clause-evaluation-worksheet.md`:
  - `lands-as-intended`
  - `requires-revision-with-proposed-clause`
  - `requires-deeper-redesign`
  - `not-evaluated-due-to-participant-non-engagement`
  - `not-evaluated-due-to-prototype-surface-coverage-gap`
- **If declined:** all clauses marked `not-evaluated-due-to-participant-non-engagement`.
- Researcher records `mid-session-revision` sub-field for intra-session verdict contradictions per Story 0.9 P-20 precedent.

## §5 — Closing

- Researcher asks: **"Kya aap kuch aur batana chahte hain jo maine nahin poocha?"** — open-floor close per Story 0.9 §5 precedent.
- Researcher asks for permission to reach back if synthesis needs clarification OR for re-consent-for-quotation per ethics-protocol §2-bis workflow.
- Researcher **reconfirms withdrawal-right AND quotation-withdrawal-right AND AT-behavior-observation-withdrawal-right**.
- Researcher provides **withdrawal-contact via the trustee-mediated channel**.
- Researcher **reconfirms travel-reimbursement is provided** per ethics-protocol §2(g) + provides cash + receipt acknowledgment.

## §6 — Post-session

- **Per-session note authored within 24 hours** per `per-session-note-schema.md`.
- **Supplementary-addendum permitted within the 24-hour window** per Story 0.9 P-21 precedent (researcher may file an addendum to capture observations that surface in reflection within the window).
- Raw recording transferred to secure storage per operations policy if applicable.
- **Per-session note pseudonymization verified** — no substantive identifier, no village-name, no specific etiology.
- **Divergence-flag inserted in per-session note** for any observation that contradicts a PRD/UX/architecture assumption per `assumption-inventory.md` — the divergence-log itself is populated at Task 9 during synthesis; per-session divergence-flags are the source data the synthesis aggregates.
- **UX-DR clause-evaluation worksheet populated** for evaluated clauses + **accessibility-debt classification applied per finding** (`wcag-aa-defect-must-fix` | `accessibility-debt-tracked-and-fix` | `wcag-aaa-aspiration-deferred-with-rationale` | `participant-class-extension-needed-for-coverage` | `not-applicable`).
- Recruitment-log row updated with `session_conducted_date` + `quotation_re-consent_engagement` + `at_behavior_documentation_re_consent_engagement` status.
