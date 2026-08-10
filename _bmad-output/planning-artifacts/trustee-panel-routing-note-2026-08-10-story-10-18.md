# Trustee Panel Routing Note — Story 10.18, Constituting the Trustee Panel as a Sanctioning Authority

**Status:** ✅ **Ruled 2026-08-10 — all eight questions ratified at Option (a), no directions attached.**
Binding record: Decision `2026-08-10-096`. **This note is the question set; the Decision entry governs.**
**Ruled:** 2026-08-10 by the Trustee Panel, as eight Panel rulings — **none was taken as a stated default**,
so the defaults tabulated in *"What non-answer would mean"* were not exercised and are retained below only
as the reasoning that motivated the ruling.
⚠ **Three consequences are recorded in the Decision rather than here**, because they are findings against
the substrate rather than parts of the ruling: Q6(a) **licenses no code comment** (the corroborating
argument stays out of `roles.ts` under every option, because a comment cannot display ratification status);
Q3(a) means `pariwar_admin`'s live `member.moderate` grant **stands and is not removed**; and Q7(a) requires
a **second, catalog-dependent** assertion, because the shipped deferral-pin form is catalog-independent by
design and cannot observe whether the grant exists.
**Author:** BigDev (Solo Builder)
**Raised:** 2026-08-10, against
`_bmad-output/implementation-artifacts/10-18-constituting-the-trustee-panel-sanctioning-authority.md`
at its baseline `main` @ `71aae71`, after three pre-implementation review passes. **No code has been
written.** The story is `ready-for-dev` and stops at Task 2 until Q1 and Q2 are ruled.
**Story state:** 10.18 is the `[GATE]` on Story 10.20 (`epics.md:3745`). 10.19, 10.21 and 10.22 are
`backlog` and **do not** depend on it.
**Disposition on ruling:** a `.decision-log.md` entry in the per-question option-ratification pattern of
Decision `2026-08-07-088`, numbered from the current head `2026-08-09-095`. Per
`2026-08-09-095`'s own requirement, the entry must **label per-clause provenance** — which clauses are
Panel rulings, which are defaults taken, and which are author findings.

> ⚠ **Every recommendation in this note is NON-BINDING.** Each is a suggestion the Panel may reject, not a
> default the Panel is assumed to accept by silence. Where silence *does* carry a consequence, that
> consequence is stated per question and again in *"What non-answer would mean"*.

---

## Why this note exists

**The Trustee Panel already exercises an authority this system cannot recognise.** Decision
`2026-08-07-089` states that the Panel *"exclusively owns authorization to activate Story 10.23's
imposition flag. No other role holds it, and it is not delegable."* **Eight** ratified Decisions in
`.decision-log.md` are signed *"Ratifying trustees: Trustee Panel"* (`:91, 130, 311, 347, 429, 495, 527,
830`). Yet there is no `trustee_panel` among the twelve seeded role bundles, no permission a Panel member
could hold **as** a Panel member, and therefore no way for the system to distinguish a Panel act from a
`pariwar_admin` act. **Every exclusivity the log asserts is today enforced by convention alone.**

Story 10.18 closes that gap — governance first, capability second. Its own framing
(`epics.md:3721`) is explicit that *"this is not an RBAC task… The governance work — defining the body in
Part 8, establishing its composition and scope, and settling that it is a Pariwar-level governing body
rather than a geographic office — is the substance. A role bundle preceding that definition would be a
capability without a constituted holder."*

**That work is the Panel's own constitution, which is why it is routed rather than authored.** An
implementer who writes the Panel's composition into a governing instrument has let a capability model
decide a governance fact.

### One correction to the premise the epic carried

⚠ **The Niyamavali already defines the Trustee Panel.** A prior planning document stated it does not.
`niyamavali.md:39` (§1.3), verbatim:

> **District Admin / State Trustee / Trustee Panel (Core Team)** — the three escalation tiers of decision
> authority (Part 9).

§5.3 (`:126`) adds that *"The Core Team / Trustee Panel retains **full discretion** over eligibility and
disbursement."* The Hindi mirror carries both (`:43`, `:124`). So the term **exists**, is **equated with
"Core Team"**, sits at the **top of three tiers above State Trustee**, and is scoped to **Part 9 only**.
Part 8 never references it.

This makes the work **extension and reconciliation, not invention** — and it is the origin of Q2.

### ⚠ The queue this note joins

This note opens a **fifth** open Panel obligation while four remain undischarged: Story 10.23's
Escalation 6 (`2026-08-07-089`, reaffirmed four times), the copy-truth defect (routed for owner
assignment, still unassigned), R7(A)'s unpublished Part 11 amendment (`2026-08-06-077`), and the
R7(C)/R7(F) lock-in asymmetry. **None of the four is this story's, and this story discharges none of
them.** Stated so this note does not arrive as if the Panel had no queue.

### What is deliberately NOT here

| | Why it is not a question |
|---|---|
| **The text of §8.7 itself** | Author-owned once Q1 and Q2 are ruled. The Panel settles *what body it is* and *how it relates to §1.3*; drafting follows. |
| **Whether the catalog version bumps** | `epics.md`'s instruction is unconditional. Implementer-owned; recorded in the story as a deviation from the key-minting precedent, not routed. |
| **The `scopeCeiling: 'pariwar'` choice** | Settled by the rank ordering alone — a `state`-ceiling grant can never satisfy a `pariwar`-dimension check, and `global` would make the Panel cross-tenant. Q6 asks only whether a *second, corroborating* argument may be cited; the ceiling does not depend on it. |
| **Counsel review of §8.7** | Owed and recorded as owed. Story 0.13 has not closed, no counsel is selected, every ledger field in `docs/legal-counsel-engagement/` is a placeholder. Q5 asks only whether to proceed on the existing precedent meanwhile. |
| **The geo-tree resolver** | Not built here. Re-pointed to a named successor story with acceptance criteria. |
| **Escalation 6 of Story 10.23** | Unchanged and outstanding. Nothing here discharges it or asks the Panel to. |

---

## ⛔ What this story must not do, and is not asking permission to do

**The Niyamavali is an unadopted draft.** `niyamavali.md:5` reads `**Version:** [[v1.0]] | **Effective:**
[[date]] | **Adopted by Board resolution dated:** [[date]]` — three placeholders, none filled, under a
standing `⚠ DRAFT — NOT LEGAL ADVICE` banner. Part 11 (`:210-212`) requires a Board resolution reference
and counsel review before publication, and **counsel is not engaged**.

⇒ **"The Part 8 amendment lands first" cannot mean "ratified and effective."** Nothing in this repo can
produce that today. A version bump, an effective date, or a `[LEGAL]` acceptance line would be
**fabricating validation**.

**What a Panel ruling here does and does not do:**

| A ruling here means | A ruling here does NOT mean |
|---|---|
| §8.7 is **authored and Panel-ratified** | The Niyamavali is versioned or effective |
| The composition and scope questions are settled by the body they concern | The Board has resolved anything |
| The amendment has a durable record — a `.decision-log.md` entry quoting §8.7 verbatim | Counsel has reviewed or accepted it |
| Implementation may begin | Part 8 is legally settled |

The precedent is exact and recent: **Decision `2026-08-06-080`** amended `niyamavali.md` §3.1/Appendix A on
Trustee Panel attestation alone, `Status: Trustee-ratified`, with no `[LEGAL]` entry. **Q5 asks the Panel
to confirm that precedent extends here**, rather than have the story assume it by analogy.

⚠ **Why the record must quote §8.7 verbatim.** `docs/legal/` is **gitignored** (`.gitignore:67-68`;
`git ls-files docs/legal/` is empty). The Niyamavali has **no git history at all** — amendments leave no
diff, no blame, and no way to answer *"what did §8.7 say on date X?"* other than the decision log. The
Decision entry is not a summary of the amendment; **it is the only durable copy.**

---

## Q1 — Is the Trustee Panel the Board acting in a moderation capacity, or a Clause-20(h) committee of it?

> ⛔ **BLOCKING.** §8.7 cannot be authored without this ruling.

**The gap.** §8.7 must constitute the Panel as a body. The Trust Deed already permits **two lawful
shapes**, and the instrument does not say which the Panel is:

- `trust-deed.md:239` (Clause 20(b)) gives the Board power to *"admit, **suspend, and cease members**"* —
  the sanctioning power itself, already vested.
- `trust-deed.md:251` (Clause 20(h)) permits delegation of *"administrative and operational functions … to
  **committees**, office-bearers, employees, or agents, **while retaining ultimate responsibility**."*

So §8.7 is **not creating an authority** — it is naming which of two already-lawful shapes the Panel is.
That is a Panel question, not an author's.

**What turns on it.** Whether §8.7 cites Clause 20(b) directly or Clause 20(h) delegation; and **whether
Deed quorum binds a moderation sitting** — Clause 19(b) (`trust-deed.md:227`) fixes quorum at *"one-half of
the Trustees then in office, or two, whichever is higher"*. Under (a) that quorum governs directly. Under
(b) the committee's own quorum would need stating, or it inherits by silence.

| | Option | Consequence |
|---|---|---|
| **(a)** ⭐ | **The Board acting in a moderation capacity.** §8.7 cites Clause 20(b); Deed quorum (Clause 19) governs a moderation sitting directly. | Simplest, and creates no second body. The Panel *is* the Board wearing a named hat, which matches §1.3's equation of "Trustee Panel" with "Core Team". No new quorum to state or drift. |
| **(b)** | **A Clause-20(h) delegate committee of the Board.** §8.7 cites 20(h); the Board retains ultimate responsibility. | Permits a smaller sitting than full Board quorum, useful if moderation volume grows. ⚠ Requires §8.7 to state the committee's composition and quorum, creating a second quorum number that can drift from the Deed's. |

**Recommendation (non-binding): (a).** It matches §1.3's existing equation of the Panel with the Core Team,
avoids minting a second quorum, and is the reading under which the eight already-ratified Decisions signed
*"Ratifying trustees: Trustee Panel"* were most plausibly taken. **(b) is not foreclosed** — if the Panel
intends moderation to be delegable to a subset, it must say so, because option (a) makes it not.

---

## Q2 — Does §8.7 adopt the §1.3 "Core Team" body, or is §1.3 amended in the same act?

> ⛔ **BLOCKING.** §8.7 cannot reconcile with §1.3 without this ruling, and an unreconciled §8.7 creates
> the defect it exists to prevent.

**The gap.** §1.3 already defines a Trustee Panel and **scopes it to Part 9** (claim-denial appeal). §8.7
constitutes a Trustee Panel for **Part 8** (moderation). If §8.7 is silent about §1.3, **the Niyamavali will
carry two incompatible Trustee Panels in one instrument** — and nothing in the document will say whether
they are the same body.

**This is the single most likely defect in the amendment text.** It is invisible at drafting time and
becomes load-bearing the first time someone asks whether a Part 9 appeal tier can exercise a Part 8
sanction, or vice versa.

### The adjacency hazard, which is separate and worse

Part 9 **already** carries a differently-constituted body called a *"**State Trustee** panel"*
(`niyamavali.md:129`, `:191`), fixed at *"≥2 trustees; majority-rules per R9"*
(`review-scope-charter.md:63`). That is a **geographic** appeal panel, and Story 10.18's framing settles the
§8.7 body as *"a Pariwar-level governing body rather than a geographic office"* — a direct contradiction.

**Two bodies, one word, adjacent sections, and one of them carries a stated quorum.** If §8.7 is silent,
the ≥2-trustee quorum will be read across **by adjacency**. ⚠ This holds regardless of how Q2 is answered,
so §8.7 must expressly distinguish itself from the Part 9 panel **under every option below**. Stated here so
it cannot be read as belonging to whichever option is selected.

| | Option | Consequence |
|---|---|---|
| **(a)** ⭐ | **§8.7 adopts the §1.3 body and extends its scope from Part 9 to Part 8.** One Panel, two arenas. | Cheapest and most honest: the body already exists, already sits above State Trustee, already mirrored in Hindi. No new definition to keep synchronized. ⚠ Requires §8.7 to state the extension explicitly — silent adoption reads as a coincidence of naming. |
| **(b)** | **§1.3 is amended in the same act** to define the Panel trust-wide, with Parts 8 and 9 both referencing it. | Cleanest final structure — one definition, referenced twice. Costs an edit to Part 1 in both locales, widening the amendment's blast radius beyond Part 8. |
| **(c)** | **§8.7 constitutes a separate Part 8 body** distinct from §1.3's. | ⛔ Not recommended. Puts two Trustee Panels in one instrument and requires every future reference to disambiguate. Recorded for completeness; believed to be what the story exists to prevent. |

**Recommendation (non-binding): (a).** It is the smallest amendment that leaves the instrument coherent.
**(b)** is the better end state and the Panel may prefer it; the difference is scope of edit, not substance.

---

## Q3 — Is the Panel's Part 8 sanctioning authority exclusive, or concurrent?

> **Non-blocking. Default if unruled: CONCURRENT.**

**The gap.** Part 8 today names authorities **other than** the Panel:

- **§8.2** grounds a suspension on *"a concealment flag confirmed by a **State Trustee**"*.
- **§8.3** restoration turns on *"**Trustee discretion**"*.
- And in code, **`pariwar_admin` holds `member.moderate` live** (`roles.ts:238`) — the grant the moderation
  routes actually check.

If §8.7 makes Panel authority **exclusive**, all three are inconsistent with the instrument from the moment
§8.7 lands, and removing `pariwar_admin`'s grant becomes owed. If **concurrent**, §8.7 must say so — because
a body constituted as "the body that determines sanctions" will otherwise be read as exclusive later, and
the grant will look like a defect that was never noticed.

| | Option | Consequence |
|---|---|---|
| **(a)** ⭐ | **Concurrent.** §8.7 states the Panel is *a* sanctioning authority; §8.2's State Trustee route and `pariwar_admin`'s grant stand. | No capability change; nothing breaks on the day §8.7 lands. §8.7 must state concurrency explicitly. Preserves day-to-day moderation throughput, which today runs through `pariwar_admin`. |
| **(b)** | **Exclusive.** Only the Panel may determine a Part 8 sanction. | Matches the strong reading of *"the body that determines moderation sanctions"*. ⚠ Requires removing `pariwar_admin`'s `member.moderate` grant in the same story, and leaves §8.2/§8.3 naming authorities the instrument no longer recognises — those need their own amendment, owned by 10.19/10.20. |

**Recommendation (non-binding): (a) concurrent**, with exclusivity available later as a deliberate act.
Exclusivity is the larger claim and is harder to reverse: it removes a live capability from the role that
performs almost all moderation today, and it strands two Part 8 sub-sections that this story is not
amending.

⚠ **If the Panel rules (b),** the removal is a `defaultRoleBundles` data edit — **not** a database
migration and **not** a route change. It is scoped, and the story carries the task for it.

---

## Q4 — Does a thirteenth seeded role require OQ-3 confirmation?

> **Non-blocking. Default if unruled: the role ships PROVISIONAL, on the same footing as the other twelve.**

**The gap.** `packages/domain/src/rbac/roles.ts:1-9` declares the seeded role set *"⚠ PROVISIONAL PENDING
OQ-3. The **Trustee Panel** confirms/revises the 12-role set … pre-launch (OQ-3 'Blocks: RBAC seed in
production')."* The Panel owns OQ-3 (`prd.md:1526`).

So adding a role to a set the Panel owns is, at least arguably, the Panel's call rather than the
implementer's. **No seeded role has been added since Story 1.8** — there is no precedent either way.

| | Option | Consequence |
|---|---|---|
| **(a)** ⭐ | **No separate confirmation needed.** `trustee_panel` ships provisional like the other twelve; OQ-3 confirms the whole set pre-launch, this role included. | Nothing new is claimed. The file header already declares the entire set provisional, so the thirteenth inherits exactly the status of the twelve. |
| **(b)** | **The Panel confirms this addition specifically**, as an OQ-3 increment. | Stronger provenance for the one role that is the Panel's own. Costs a ruling now and does not change the code. |

**Recommendation (non-binding): (a).** ⚠ **But the provisional status must be stated in the bundle comment
and the Completion Notes, not assumed.** Escalation 5 of the story exists precisely because "the Panel did
not object" is not the same as "the Panel confirmed", and a role that is the Panel's own should not acquire
a firmer status than the twelve by accident.

---

## Q5 — Does Decision `2026-08-06-080`'s Panel-attestation-only precedent extend to §8.7?

> **Non-blocking. Default if unruled: PROCEED on the `080` precedent, with counsel review recorded as OWED.**

**The gap.** Two documents point in opposite directions and the story cannot reconcile them.

**For proceeding:** Decision `2026-08-06-080` amended `docs/legal/niyamavali.md` §3.1/Appendix A on **Trustee
Panel attestation alone**, `Status: Trustee-ratified`, no `[LEGAL]` entry. That is a live, recent precedent
for exactly this act on exactly this document.

**Against:** `sprint-change-proposal-2026-08-04.md:618` names **§8.7 specifically** as legal counsel's
**critical-path deliverable**, and `:613` classifies the whole Part 8 package as *"subject to legal-counsel
review."* Part 11 (`niyamavali.md:211`) requires counsel review before publication.

**And the tie-breaker that is not available:** counsel **cannot** review it. Story 0.13 has not closed, no
counsel is selected, and every return field in `docs/legal-counsel-engagement/` is a `<PENDING>`
placeholder. Waiting is not a strategy with a termination condition.

⚠ **§8.7 is arguably more consequential than what `080` ratified.** `080` amended a rules-ladder section;
§8.7 defines **who may sanction a member** and gates Story 10.20. The story elsewhere argues exactly that.
So the precedent's extension should be **confirmed, not assumed by analogy** — which is why this is a
question rather than a recorded assumption.

| | Option | Consequence |
|---|---|---|
| **(a)** ⭐ | **The precedent extends.** Author and Panel-ratify §8.7 now; record counsel review as **owed**, un-attested, in `deferred-work.md`. | Story proceeds. The gap is recorded openly rather than closed by fiat. Matches how `080` was actually handled. |
| **(b)** | **§8.7 waits for counsel.** | ⛔ Blocks 10.18 and therefore 10.20 **indefinitely**, on a dependency with no owner and no date. Recorded because it is the literal reading of Part 11, not because it is actionable. |
| **(c)** | **Proceed, and additionally commit to a counsel re-review of §8.7 specifically** once engagement lands, with a named re-trigger. | (a) plus a stronger, dated obligation. Costs nothing now; makes the owed review harder to lose. |

**Recommendation (non-binding): (a), and the Panel may prefer (c).** The story's discipline is that an
un-attested gap is **recorded as un-attested and carried as risk**, never reconstructed later to look
validated. (c) makes that record load-bearing rather than passive.

⛔ **Under no option is a `[LEGAL]` acceptance line written.** There is no counsel to accept.

---

## Q6 — Does §1.3's escalation-tier ranking corroborate the `pariwar` RBAC scope ceiling?

> **Non-blocking, and consequence-free for the code. Default if unruled: the argument is NOT cited.**

**The gap — and what does *not* turn on it.** The role's `scopeCeiling: 'pariwar'` is settled by the **rank
ordering alone**: `scopeWithinCeiling` is a pure numeric compare in which a `state`, `district` or `block`
ceiling can never satisfy a `pariwar`-dimension check, and `global` would make the Panel cross-tenant,
contradicting multi-Pariwar isolation. **That argument stands whatever the Panel says here.**

The question is whether a **second** argument may be cited alongside it: that §1.3 places the Trustee Panel
at the **top of three tiers, above State Trustee**, which would independently suggest a trust-wide governing
body rather than a rung on the geographic ladder.

⚠ **Code review flagged this as a possible category leap** — §1.3's ranking is a **Part-9 appeal-escalation**
ordering, and a body being the top of an appeal chain does not, by itself, establish it as a
`pariwar`-ceiling body in the `scopeCeiling` sense. An earlier draft treated the argument as author-ratified;
it is now routed rather than assumed.

| | Option | Consequence |
|---|---|---|
| **(a)** ⭐ | **It corroborates.** The story and this note may cite the tier ranking as an independent reason the Panel is a trust-wide body. | Two arguments recorded, so a future reader cannot conclude the ceiling was a workaround for a missing resolver. |
| **(b)** | **It does not.** The ranking is Part-9-specific and says nothing about RBAC scope. Only the rank-order argument is cited. | Narrower and safer. The rank-order argument is sufficient and mechanically checkable. |

**Recommendation (non-binding): (a)**, because the two arguments genuinely point the same way and a future
reader benefits from both. **But the ceiling does not depend on the answer**, and **under every option the
tier-ranking argument is NOT written into the code comment** — a `roles.ts` comment cannot display
ratification status, and Decision `2026-08-09-095` exists precisely because author analysis inherited
ratified authority by sitting next to it.

---

## Q7 — Should `verifier` keep its inert `member.moderate` grant?

> **Non-blocking. Default if unruled: DEFER with an acceptance condition (do not remove).**

**The gap.** `verifier` holds `member.moderate` (`roles.ts:436`) at `scopeCeiling: 'district'` (`:437`).
The only route gating that key checks `{ dimension: 'pariwar' }` (`member-moderation/routes.ts:112`), and
`scopeWithinCeiling('pariwar','district')` is `1 >= 3` → **false**.

**So the grant confers nothing. It is inert today** — exactly the "INERT/false capability" Story 10.3's
review identified and deliberately refused to seed.

**Why this reaches the Panel.** A story whose whole subject is *who may sanction a member* cannot walk past
a role that **appears** to hold that power and does not. But removing it **changes who can moderate** —
nominally, and in the record — which is a governance act, not an implementer's cleanup.

⚠ **This is asked separately from Q3 deliberately.** Q3 names only `pariwar_admin` and §8.2's State Trustee.
**Q3 governs a live, effective grant; Q7 governs an inert one**, and the Panel may reasonably rule
differently on each — for instance, concurrent authority (Q3 = a) while still removing a grant that has
never worked (Q7 = b).

| | Option | Consequence |
|---|---|---|
| **(a)** ⭐ | **Defer, with a written acceptance condition**, in the shipped 10.3/10.4 form, pinned by a test. | Nothing changes; the inert grant is documented as inert with a condition under which it would become live. Preserves the option to make `verifier` a real moderator later without a fresh governance act. |
| **(b)** | **Remove the grant.** | Honest — the roster stops advertising a capability nobody has. ⚠ Forecloses `verifier`-as-moderator without a new Panel act, and changes the recorded holder set. |

**Recommendation (non-binding): (a).** The grant is harmless while inert, and removal is the less reversible
direction. ⚠ **Either way it must be pinned by a test that can actually observe the grant** — the existing
deferral-pin form in this repo builds a *synthetic* bundle so the proof is catalog-independent, which means
it passes identically whether or not `verifier` holds the key. A second, catalog-dependent assertion is
required under both options.

---

## Q8 — Does restoring a TERMINATED member require a formal Panel ceremony?

> **Non-blocking. Default if unruled: today's single-actor path stands, re-deposited against Story 10.19.**

**The gap, and why it is asked here.** Story 10.17's code review deposited this question at
`deferred-work.md:3260` with the re-trigger: *"whether restoring a **terminated** member should require a
formal trustee-panel ceremony (vs. today's single-actor `trustee-discretion` admin action) is a question for
whichever story builds that authority … **Re-trigger:** Story 10.18 lands and defines what 'sanctioning
authority' actually gates."*

**This story is that story. The trigger fires now.**

Today, restoring a terminated member is a **single-actor** admin action under §8.3's *"Trustee discretion"*.
Termination is the most consequential sanction in Part 8, and the story that constitutes the sanctioning
authority is the natural place to ask whether its **reversal** should require the same body that imposed it.

⚠ **This is its second deposit.** It lapsed once already — the first re-trigger named a story that had to
land before anyone would look at it. If it is not answered or re-deposited **with a named owner** now, it
lapses a third time.

| | Option | Consequence |
|---|---|---|
| **(a)** ⭐ | **Defer to Story 10.19** (termination ends membership privileges), with the Panel-ceremony question as an explicit AC there. | 10.19 owns termination mechanics end-to-end; restoration-from-termination belongs with it. Keeps this story's scope intact. **Requires 10.19 to carry it as an AC, not a note.** |
| **(b)** | **Rule now: restoration from termination requires a Panel act**, and §8.7 says so. | Settles it while the Panel is already considering its own authority. ⚠ Expands §8.7 beyond constituting the body into specifying a procedure, and 10.19 would still build the mechanism. |
| **(c)** | **Rule now: single-actor restoration stands.** | Closes the question. ⚠ Fixes today's behaviour as intended rather than incidental, on the basis of a system where termination has not yet been exercised. |

**Recommendation (non-binding): (a).** The question is real but its natural owner is the story that builds
termination. ⛔ **Under (a) the deferral must name Story 10.19 as an acceptance criterion**, not as a
`deferred-work.md` line — a deferral naming a story that does not carry it as an AC is how this question
lapsed the first time.

---

## What non-answer would mean

Stated as a **governance consequence** per question, not as a prediction about implementer behaviour.

| Q | Feeds | If unruled |
|---|---|---|
| **Q1** | Task 3 | ⛔ **§8.7 cannot be authored.** The story halts at Task 2 and records a block. Nothing is written to `.decision-log.md` — nothing enters the decision log without a decision — and no `packages/` change is made. |
| **Q2** | Task 3 | ⛔ **§8.7 cannot reconcile with §1.3.** Same halt. An unreconciled §8.7 would put two Trustee Panels in one instrument, which is the defect the story exists to prevent. |
| **Q3** | Task 4, §8.7 text | Defaults to **concurrent**. `pariwar_admin` keeps `member.moderate`; §8.7 states concurrency. The exclusivity option is recorded in `deferred-work.md` with the Panel ruling as re-trigger. ⚠ If §8.7 were instead left *silent*, exclusivity would be read in later against a grant nobody re-examined. |
| **Q4** | Task 4 | Defaults to **provisional**, on the same footing as the other twelve, **stated explicitly** in the bundle comment and Completion Notes. Silence is not treated as confirmation. |
| **Q5** | AC1 | Defaults to **proceed on `080`**, counsel review recorded as **owed** and un-attested. No `[LEGAL]` line is written under any circumstance. |
| **Q6** | Story/routing-note citation only | Defaults to **no citation**. Consequence-free for the code: the ceiling rests on the rank ordering either way, and the argument never enters `roles.ts`. |
| **Q7** | Task 8 | Defaults to **defer** with an acceptance condition. The inert grant stays, documented as inert. |
| **Q8** | Task 9 / AC9 | Defaults to **status quo**, re-deposited against **Story 10.19 as an acceptance criterion**. ⚠ This is its second deposit; a third lapse would mean the question has outlived two named re-triggers. |

⚠ **The failure direction is safe in every non-blocking case** — no capability is granted, no sanction is
enabled, nothing is imposed. That is why none of Q3–Q8 blocks. **It is also why a default taken must be
recorded in the Decision entry as a default taken, never as a ruling**: a safe default that is later read as
a Panel decision is how convention hardens into apparent authority, which is the condition this whole story
exists to end.

---

## References

- `_bmad-output/implementation-artifacts/10-18-constituting-the-trustee-panel-sanctioning-authority.md` — the story; AC1 (the amendment), AC2 (this note), AC3 (the ceiling), AC8 (Q7), AC9 (Q8)
- `_bmad-output/planning-artifacts/epics.md:3715-3745` — Story 10.18 AC; `:3721` the framing quoted above; `:3745` the `[GATE]` on 10.20
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-08-04.md:520-533` — the eleven-item Part 8 amendment package, entirely unlanded; `:613`, `:618` — §8.7 as counsel's critical-path item
- `docs/legal/niyamavali.md:5` (unfilled version/effective/adoption placeholders), `:9-15` (draft banner), `:39` (§1.3, the existing Panel definition), `:126` (§5.3 full discretion), `:129`, `:191` (Part 9's *State Trustee panel*), `:170-183` (Part 8, §8.1–§8.4 only), `:207-212` (Part 11)
- `docs/legal/niyamavali.hi.md:43`, `:124` — the Hindi mirror; a co-equal governing instrument, not a translation artifact (`counsel-roster.md:32`)
- `docs/legal/trust-deed.md:227` (Clause 19(b) quorum), `:239` (Clause 20(b) suspend-and-cease), `:251` (Clause 20(h) committee delegation)
- `.decision-log.md:37` — head `2026-08-09-095`, and the per-clause-provenance requirement it imposes
- Decision **`2026-08-06-080`** (`.decision-log.md:825-891`) — amended the Niyamavali on Panel attestation alone; the precedent Q5 turns on
- Decision **`2026-08-07-088`** (`:342`) — the per-question option-ratification format this note is written to be answered in
- Decision **`2026-08-07-089`** (`:306-341`) — Panel-exclusive, non-delegable authority; the queue this note joins
- `docs/legal-counsel-engagement/review-scope-charter.md:5` (engagement unratified), `:63` (Part 9's ≥2-trustee quorum) · `per-artifact-return-roster.md`, `engagement-ledger.md` — all fields `<PENDING>`
- `packages/domain/src/rbac/roles.ts:1-9` (the OQ-3 provisional header, Q4), `:238` (`pariwar_admin`'s `member.moderate`, Q3), `:436-437` (`verifier`'s inert grant, Q7)
- `packages/domain/src/rbac/scope.ts:56-61` (`GEO_RANK`), `:64-67` (`CEILING_RANK`), `:74-79` (`scopeWithinCeiling`), `:193` (`scopeContains`'s independent deny)
- `apps/api/src/modules/member-moderation/routes.ts:112` — the `{ dimension: 'pariwar' }` gate
- `_bmad-output/implementation-artifacts/deferred-work.md:3260` — Story 10.17's deposit; Q8's re-trigger
- `_bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md:1475` (Panel composition), `:1526` (OQ-3 ownership)
- `.gitignore:67-68` — `docs/legal/` untracked; why the Decision entry must quote §8.7 verbatim
