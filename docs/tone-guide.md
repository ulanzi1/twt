# TWT Tone Guide

> **Status:** Published (Story 2.2). The **human layer** above the Story 1.17 automated
> microcopy floor (see [§5 Automated floor vs. human check](#5-automated-floor-vs-human-check)).
> **Companion artifact:** [`tone-review-checklist.md`](./tone-review-checklist.md) — the
> non-author reviewer works through that checklist and records a sign-off before any
> member-visible copy is published.

This guide governs the **human-judgment** dimensions of tone — warmth, dignity, register,
and grief-context — for every member-visible surface TWT renders. It is **sourced**, not
invented: each rule below cites the UX specification (`_bmad-output/planning-artifacts/ux-design-specification.md`,
referenced as `UX Lnnn`) and the architecture authority section
(`_bmad-output/planning-artifacts/architecture.md §4.15 Actor adaptation`). Where a
dimension is automatable, the **Story 1.17 `microcopy` gate** already enforces it as a CI
floor; this guide is the layer of judgment that a lint cannot perform.

The four dimensions below are the spine of the
[copy-review checklist](./tone-review-checklist.md); each checklist item maps 1:1 to a
dimension here.

---

## 1. Voice — warm, plain, dignified, never sales-y

TWT's voice is **deliberately quiet**. The product "does not seek delight, surprise,
novelty, or engagement-as-end-in-itself" (UX L307). It is the voice of a *trustworthy
neighbour sitting with you, not the bureaucracy moving you through a queue* (UX L316).

**Rules:**

- **Address members as *सम्मानित साथी* (colleague), never "user / customer / donor."**
  The Hindi address "is not branding decoration; it names the felt relationship" of
  colleague-to-colleague within a community of mutual obligation (UX L309; emotional-goals
  table UX L387). Members *contribute to* their Pariwar; they do not *transact with* a
  service (UX L416). A deceased member is a **Deceased Member**, never a "Late Teacher."
- **The tagline is the ambient brand voice, used sparingly.** *"आज का सहयोग कल का सहारा"*
  appears on home, public footers, and Contribution Note PDFs (UX L156) — it sets the warm
  register; it is not a marketing slogan to be repeated inside transactional flows.
- **Narration speaks in the *sutradhar* "seen by us all" register.** Claim narration adopts
  the Mahabharata oral-witness voice — *sakshi-bhava*, "the courtroom of the village square"
  — with "no donor-ego, no impact-metric strutting" (UX L440). Canonical form: *"In Pool
  Karna, 14,800 members of the Pariwar contributed; the family of Ramesh-ji … received
  ₹45.8 lakh; verified by Anita-ji of Patna district and **seen by us all**"* (UX L440).
- **Tally, not balance.** The system "does not owe" the member; he gave. Running totals read
  *कुल योगदान … आहुति* (a *tally*), never "balance" (UX L457). Confirmation states are
  "brief, undramatic green" — never celebratory animation (UX L407, "Dignity over delight").
- **Anti-principle — `delight through novelty` is explicitly rejected** (UX L304): no
  gamification, streaks, badges, achievement unlocks, or leaderboards. "Delight comes from
  reliability, dignity, and the felt sense of community participation."

The architecture frames this as the four felt goals, in priority order: **dignified
belonging → quiet trust → agency without anxiety → held-ness under grief** (UX L307–L316).
Every copy decision serves the community frame "or it is wrong" (UX L404).

---

## 2. Register per surface

The epic names three surface registers — **Yogdaan Bahi = dignified-respectful; Sahyog
Vivran = honorific; admin warnings = factual-precise**. These reconcile onto the
architecture **§4.15 per-actor-class copy register**, which is the authority on actor-class
concerns (architecture §4.15 L2872–2901):

> **Copy register** — member is **calm-precise**; nominee is **grief-respectful**; admin is
> **operational**; partner is **contractual**. **Interaction tone** — nominee uses
> **witness-not-bailiff** cadence; member uses **neutral-action** cadence
> (architecture §4.15 L2885–2891).

| Surface | Actor class | Register | Sourced discipline |
|---|---|---|---|
| **Yogdaan Bahi** (contribution ledger) | member | calm-precise / dignified-respectful | Passbook grammar: date \| narration \| amount \| running *tally*; "warm off-white, not cold grey" hairlines; *mudra* seal "present, not loud" (UX L450–L463). |
| **Sahyog Vivran** (per-claim memorial page) | nominee / public | honorific / grief-respectful | Hindi newspaper *shradhanjali* arc — **presence → loss → gathering → continuance**, *not* the Western *problem → donor → solution* (UX L438); human-written narratives only, no AI prose in v1 (UX L150). |
| **Admin warnings / staff tools** | admin | operational / factual-precise | "What 'govt-grade' actually looks like": conservative, dense, serial-numbered, *सत्यापित*-stamped register (UX L315). Staff outbound adapts WhatsApp Business templates to the warm-formal *सम्मानित साथी* address (UX L572). |
| **Nominee Reconciliation Console** | nominee | grief-respectful, witness-not-bailiff | "fursat" cadence ("when you have leisure"), never "complete your task" (UX L67, L129). |

**Cross-class leakage is prohibited** and CI-asserted at the architecture layer: "no
member-class copy renders inside a nominee-class surface; no admin-class shortcuts appear in
member-class navigation" (architecture §4.15 L2897–2899). The human reviewer must confirm
the register of a copy surface matches its actor class before publish.

---

## 3. Prohibited frames

These are the framings a member-visible surface must **never** carry. The automatable
subset (scarcity / panic / comparison-to-target phrasings) is enforced by the Story 1.17
`microcopy` gate's tone-prohibition patterns; the reviewer catches the variants a lint
cannot (template-literal and spelled-out forms — see
[§5](#5-automated-floor-vs-human-check)).

- **Loss / scarcity framing on cycle-close (Pool-Reality #2).** The close-of-cycle frame
  "turns mutual-aid math into emotional payoff **without ever saying 'shortfall'**"
  (UX L152; FR-19). Forbidden: *"we fell short of …"*, *"X% achieved"*, *"target missed"*,
  progress-meter-against-target framing (the rejected Ketto / GoFundMe pattern, UX L538,
  "violates FR-19").
- **Sales-y / donor-funnel framing.** No "bright primary-blue CTA buttons in grief context →
  donation funnel, not condolence" (UX L537); no "Charity: Water-style donor-impact
  storytelling for Sahyog Vivran → wrong narrative tradition" (UX L555). TWT is "not a
  consumer product competing for attention" (UX L304).
- **Panic / manufactured urgency.** "No false alarms; no manufactured deadlines; no
  notification-anxiety patterns" (UX L397, "Calm is the default state"). "LinkedIn's vague
  urgency prompts → TWT uses specific, factual prompts" (UX L546). The pool deadline "is
  shown but not theatricalized" (UX L313).
- **Anxiety / coercion framings.** No "24-hour-or-suspended timer patterns" (UX L537,
  violates Stance #5 — no punitive auto-action); contributor lists "never show 'seen but
  didn't pay'" (UX L538).
- **Bureaucratic framings.** No "ticket-number-before-name greetings → violates 'hold the
  user, don't process them'" (UX L540). The dispute screen reads *"Humari team aapse baat
  karna chahti hai,"* never "respond in 24h or be suspended" (UX L77).
- **Hindi-as-translation-layer.** No transliterated Hindi, mixed scripts, or "English UI with
  Hindi subtitles → violates Hindi-first parity" (UX L548). (Bilingual parity is enforced
  structurally by the Story 2.1 `i18n-parity` gate; the reviewer judges register and
  naturalness, not key-presence.)

---

## 4. Grief-context modulation

Grief is **held, not processed** (UX L295). Every grief-context surface — Ravi-mode, Sunita
-mode, the deceased's frozen account, the bereaved family's contact with the helpline
operator — is "designed for *being held*, not *being managed*" (UX L401). The bereaved
family "reaches TWT … grief-paced (~1 month after death)" (UX L60).

- **"fursat" cadence.** "When you have leisure" — never "complete your task" or "your task
  is pending" (UX L67, L295, L401). Sunita's console uses fursat cadence (UX L67).
- **Witness-not-bailiff stance.** The nominee surface uses witness-not-bailiff cadence
  (architecture §4.15 L2890; UX L295). The system "absorbs the burden the family cannot,"
  it does not pursue them.
- **No countdowns under emotional load.** "No countdowns under emotional load, no penalties
  under grief" (UX L295); "no countdowns in frozen states" (UX L390).
- **Module-Shelf grief-context exclusion (enforced rule).** The Module Shelf is suppressed
  in all account-frozen states — `claim-filed-frozen`, `disbursed-frozen-readable`,
  `disabled-T+90`, `public-record-∞`. "A relative opening the deceased's phone three days
  after the funeral never sees a partner-marketing card. Enforced by the Account State
  Machine, not by reviewer discretion" (UX L67, Stance #1). *The reviewer does not enforce
  the suppression itself, but must confirm no grief-context copy assumes a marketing or
  upsell surface is present.*
- **Black-bordered memorial register.** The *Shradhanjali Sahyog Vivran* renders as a Hindi
  newspaper obituary: "full-bleed black rule at top," "centered square portrait wrapped in a
  black border with a white inset … (the classic black-border-on-white funeral frame)"
  (UX L471). Explicitly rejected: "marigold borders, diya autoplay, sepia photo filters →
  costume drama, not dignity" (UX L537); "diya animations, sepia photo filters" (UX L465).
- **Numeral register under grief.** Per amendment-A2, Devanagari (Hindi) numerals appear
  **only** in memorial Devanagari *prose* on the Shradhanjali surface; operational columns
  (Yogdaan Bahi dates/amounts) stay Gregorian + Latin (UX L454; enforced by the Story 1.17
  numeral discipline). The reviewer confirms ceremonial vs. operational numeral choice
  reads correctly in context.

---

## 5. Automated floor vs. human check

Tone enforcement in TWT is **two layers, both required before publish**:

| Layer | What it is | Where it lives | What it catches |
|---|---|---|---|
| **Automated floor** | Story 1.17 `microcopy` CI gate | `scripts/microcopy/` (pure `lib.ts` + impure `check.ts`) + root `microcopy.yaml`; `microcopy:check` / `microcopy:test`; the `microcopy` `ci.yml` job | The **automatable** subset: vocabulary register (`passbook → Yogdaan Bahi`, `receipt`/`invoice` → `Contribution Note`, `report → Sahyog Vivran`, `user`/`customer`/`donor` → colleague), tone prohibitions (scarcity / panic / Pool-Reality comparison-to-target), and numeral discipline. Every finding names file + line + the canonical replacement. |
| **Human check** (this guide) | The tone-review sign-off | `docs/tone-guide.md` + [`docs/tone-review-checklist.md`](./tone-review-checklist.md) + the runtime tone-review publish gate (Story 2.2, consumer = Story 2.4) | The **human-judgment** dimensions a lint cannot evaluate: warmth, dignity, register-fit per surface, grief-context appropriateness, and the **variants** of prohibited frames the lint's literal patterns miss (template-literal interpolations, spelled-out numerals, paraphrased scarcity). |

**The `microcopy` gate is the floor — this guide is the layer above it.** The lint guarantees
the floor is never breached on the automatable axes; it cannot judge whether a sentence
*feels* like a trustworthy neighbour or a donation funnel. That judgement is what a
**non-author reviewer** records via the [tone-review checklist](./tone-review-checklist.md)
before publish. This guide does **not** restate the lint's prohibited-term table as if it
were new — that table is owned by `microcopy.yaml`; here we reference it and cover the
dimensions above it.

Both layers are required: automated lint **passing** does not substitute for a recorded
human tone-review sign-off, and a human sign-off does not waive the lint. Story 2.4's
Niyamavali publish endpoint is the first surface to enforce the human layer at the API
boundary (see [`tone-review-checklist.md` → publish routing](./tone-review-checklist.md#publish-routing)).

---

## Sources

- UX specification — `_bmad-output/planning-artifacts/ux-design-specification.md`
  (Foundational Design Stances; Desired Emotional Response; UX Pattern Analysis;
  Yogdaan Bahi / Shradhanjali visual grammar). Line refs cited inline as `UX Lnnn`.
- Architecture **§4.15 Actor adaptation (authority section)** —
  `_bmad-output/planning-artifacts/architecture.md` L2872–2901 (per-actor-class copy
  register; interaction tone; cross-class leakage prevention).
- Epic dimensions — `epics.md` Story 2.2 (L1424–1440); FR-19 close-of-cycle framing;
  FR-69 tone guide enforced via copy review; Pool-Reality prohibited frames (L2782).
- Automated floor — Story 1.17 (`scripts/microcopy/`, `microcopy.yaml`, the `microcopy`
  CI job); ADR-0016.
