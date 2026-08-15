# Trustee Panel Routing Note — Story 10.22, Moderation Appeal Mechanism

**Status:** ⏳ **Open — ten questions, awaiting ruling.** **Q1, Q2, Q3, Q4 and Q8 are ⛔ BLOCKING**;
Q5, Q6, Q7, Q9 and Q10 are answerable but each has a stated non-answer consequence.
**Author:** BigDev (Solo Builder)
**Raised:** 2026-08-15, against
`_bmad-output/implementation-artifacts/10-22-moderation-appeal-mechanism.md`
at its baseline `main` @ `b3e12e1` (clean, fetched, `== origin/main`). **No code has been written.**
The story is `in-progress` at its governance half and stops at **Task 2** until this note is ruled.
**Story state:** 10.22 is `in-progress` (governance half only). 10.16, 10.17, 10.18, 10.19, 10.20,
10.21, 10.23, 10.26, 10.27 and 10.29 are `done`. Decision `2026-08-15-120` (Story 10.29) is the head
of `.decision-log.md`, which carries **122** numbered entries.
**Disposition on ruling:** a single `.decision-log.md` entry, numbered **`2026-08-15-121`** from the
current head `2026-08-15-120` — *(if the ruling lands on a later date the entry takes that date and
the `-121` sequence holds only while `-120` remains the head; the note carries **one** identity for
the ruling either way)*. Per Decision `2026-08-09-095` the entry must **label per-clause provenance** —
which clauses are Panel rulings (`[Trustee-ratified]`), which are defaults taken (`[Author-committed]`),
and which are author findings. **The new §8.8 must be reproduced verbatim in BOTH locales in that
entry**, because `docs/legal/` is gitignored (`.gitignore:68`, verified live:
`git check-ignore -v docs/legal/niyamavali.md` → `docs/legal/`) and the entry is the only durable copy.

> ⚠ **Every recommendation in this note is NON-BINDING.** Each ⭐ is a suggestion the Panel may reject,
> not a default the Panel is assumed to accept by silence. Where silence *does* carry a consequence,
> that consequence is stated per question and again in *"What non-answer would mean"*.

---

## Why this note exists

**§8.8 is a reserved number, and the reservation has a ruling behind it.**
`niyamavali.md:274` (hi `:272`), verified live:

> *§8.8 is reserved. §8.7 is deliberately numbered ahead of it; the intervening number is held for the
> remaining Part 8 amendment — the moderation appeal (§8.6, *Recorded gap*) — and is not to be closed
> up.*

And §8.6's *Recorded gap* clause (`:260`, hi `:258`) states in terms that its closure *"requires its
own amendment (§8.8, reserved)"*. The instrument therefore **forbids** building the appeal before the
amendment lands. This is the 10.18 precedent verbatim (*"the Part 8 amendment constituting the Trustee
Panel lands FIRST — the body is defined in governance before it is granted in code"*, `epics.md:3942`)
and the 10.20 precedent operationally.

**And the system already promises members an appeal, in five places, none of which is true today.**
Verified live at `b3e12e1`:

| # | Where | What it says | Status |
|---|---|---|---|
| 1 | `packages/domain/src/member/moderation/status.ts:17` | *"a trustee must first suspend (itself notified, audited and **appealable**)"* | Unbacked assertion in a load-bearing comment |
| 2 | `apps/api/src/modules/member-moderation/handlers.ts:414-419` | *"the CTA still has no moderation destination, which is Story 10.22's to build"* | Honest, and names this story |
| 3 | `packages/ui/src/member-status/presenter.ts:346` | *"the CTA still has no moderation destination — that is **Story 10.22's** to build"* | Honest, and names this story |
| 4 | `packages/i18n/locales/{en,hi}/common.json:339` — `moderation.notice.suspended.body` | *"You can sign in as usual and **request a review from your membership status page**."* | ⛔ **Shipped member-facing copy, both locales — a promise the product cannot keep** |
| 5 | `packages/i18n/locales/{en,hi}/common.json:342` — `moderation.notice.terminated.body_access_retained` | *"You can sign in as usual and **request a review from your membership status page**."* | ⛔ **AUTHOR FINDING — see below. Not in the story's inventory.** |

**And the CTA is a dead button in both apps** — `apps/mobile/app/(membership)/index.tsx:123-131` and
`apps/admin/src/modules/member-status/MemberStatusPanel.tsx:139-150` each render an appeal control with
**no `onPress` / `onClick` handler at all**. `presenter.ts` computes `showAppealCta` correctly and the
value goes nowhere.

---

## Four findings the Panel should see before ruling anything

### F-1 ⭐ THE SHARP ONE — the Trustee Panel has governance authority and NO OPERATIONAL QUEUE

`roles.ts:594-637`, verified live: `trustee_panel` holds **exactly**
`[member.moderate, member.restore_terminated]`, `scopeCeiling: 'pariwar'`. **It holds no helpdesk
capability at all** — stated as a settled fact at `permissions.ts:539-541` (*"The Trustee Panel holds
governance authority and no operational queue: `trustee_panel` (roles.ts) holds no helpdesk capability
at all"*).

⇒ **An appeal filed as a helpdesk ticket and "routed to the Panel" is INVISIBLE to the Panel.** And
`routed_to_role` is **advisory and inert** — it authorises nothing. A design that routes the appeal to
`trustee_panel` through the routing registry ships a green routing decision and an unheard member.

**Consequence for the ruling:** the helpdesk can be the **intake**. It cannot be the **adjudication
queue**. Whatever the Panel rules on Q2 and Q8, the story must build a surface on which the ruled
authority can *find* a filed appeal (Q2 and Q8 feed AC5's list requirement).

### F-2 — a new helpdesk CATEGORY would be guaranteed-unrouted

`registry.ts:51-64` is the v1 default policy (nine categories, `other` last as the `sub_category: null`
catch-all). Every per-Pariwar override is a **version-pinned document**, and a new category resolves
under **none** of them, while the golden-hash guard prescribes an unsafe remedy
(`[[project_helpdesk_default_policy_version_trap]]`). ⇒ the off-portal arm must ride an **existing**
category with a `sub_category` token. `complaint` (→ `pariwar_admin`, `pariwar` dimension,
`sub_category: null`) is the natural host and keeps routing green. **This is an implementation
constraint, not a question** — it is recorded so no ruling is read as authorising a tenth category.

### F-3 — geo containment is asymmetric, and it disqualifies two roles by arithmetic

`scope.ts:59-70`: `GEO_RANK` = `{ global: 0, pariwar: 1, state: 2, district: 3, block: 4 }`, and
`scopeWithinCeiling` is a **pure numeric compare with no resolver parameter**. ⇒ a `state_trustee`
(`state` ceiling, rank 2) and a `district_admin` (rank 3) can **never** satisfy a `pariwar`-dimension
check (`1 >= 2` → false). Story 1.18's resolver has landed and **does not** change this — the
constraint is the ordering, not the absence (the roles.ts:606-617 note says so expressly).

**Consequence for the ruling:** any adjudicator the Panel names must be **`pariwar`-ceiling or
broader**, or the capability is inert on arrival — the Story 10.3 lesson.

### F-4 — AUTHOR FINDING: there is a FIFTH untrue copy site, and the story's inventory misses it

The story's gap table (and the sprint-status ledger entry) name four sites. Verified live, there is a
fifth: **`moderation.notice.terminated.body_access_retained`** (`en`/`hi` `:342`) tells a **terminated**
member — in the flag-off world the system ships today — *"You can sign in as usual and request a review
from your membership status page."* That is the same unkeepable promise, made to the harsher sanction.

⚠ Recorded as a **finding, not a footnote** (the story's own Task 0 standard). It is not drift — the
copy has not changed — it is an **omission in the story's inventory**, and it is material because AC3's
requirement is that *the shipped notice copy becomes true*, not that four named strings do.

**Disposition proposed:** fold site #5 into AC3 without a Panel ruling, since it is the same defect
under the same AC. ⛔ It is **not** silently absorbed — it is named here, and will be named in the
story's Completion Notes and in `deferred-work.md`. **This note asks the Panel to note it, not to rule
on it.** If the Panel prefers it routed as a separate question, say so in the ruling template's Notes
column.

---

## The ten questions

⚠ **Read Q1, Q2 and Q8 together.** They are one design in three parts: *what shape the appeal has*,
*who hears it*, and *what key expresses that authority in code*. A ruling that answers them
inconsistently produces an instrument the capability model cannot express.

---

### Q1 — §8.8's shape ⛔ BLOCKING · *Feeds AC2, AC5*

**The question.** Is the moderation appeal **(a)** a **single-tier review** by an authority who did not
take the decision, **(b)** a **two-tier ladder**, or **(c)** a **mirror of Part 9's three stages**
(District Admin → State Trustee panel → Trustee)?

| | Option | What it means |
|---|---|---|
| **(a)** ⭐ | **Single tier** | One review, by an authority who did not take the appealed decision. Notice, a fair hearing, a reasoned outcome. Finality on the internal track; external recourse expressly unbarred (Deed Clause 26). |
| **(b)** | **Two tiers** | A first review, then a further appeal to a distinct body. Requires §8.8 to name **both** bodies and the escalation trigger. |
| **(c)** | **Mirror Part 9** | Three geographic stages, as the claim-denial appeal has. |

⚠ **The cost of (c), stated plainly.** Part 9's stage bodies are **geographic claim-adjudication
offices**. They do not map onto a Part 8 act the **Trustee Panel itself may have taken** — a District
Admin cannot review a Panel decision, and §8.7 states expressly that the Panel *"is not the 'State
Trustee panel' of Part 9"*. Choosing (c) would also require Part 8 to **reference Part 9**, which it
has never done (`niyamavali.md:286`), and would drag the claim appeal's machinery into a journey the
epic calls *"distinct"* (`epics.md:4071`).

⚠ **The cost of (b), stated equally plainly.** A second tier needs a **second body that outranks the
Panel**, and there is none below the Board — of which §8.7 makes the Panel a capacity. A two-tier
ladder would therefore be the Panel appealing to itself, twice, or an appeal to a body the instrument
must first constitute (a second 10.18-shaped amendment, out of this story's scope).

⚠ **The cost of (a).** Finality after one internal review. Mitigated by Deed Clause 26 and R10(E) —
internal resolution is *primary*, judicial/consumer-forum recourse is *not contractually barred* — and
by Q3's ruling that re-filing on new grounds is permitted after a decision.

⭐ **Recommend (a).**

---

### Q2 — Who hears it ⛔ BLOCKING · *Feeds AC2, AC5*

**The question, in two parts.**
**(i)** Does the Trustee Panel, sitting as such, hear the moderation appeal?
**(ii)** Where the **Panel itself** imposed the sanction, is the different-decision-maker requirement
satisfied by a **different individual within the Panel**, or must the appeal **leave the Panel**?

| | Option | What it means |
|---|---|---|
| **(a)** ⭐ | **Panel hears it; a DIFFERENT INDIVIDUAL suffices** | Deed Clause 26 binds Board discretion to *"the principles of natural justice"*, which speak to the **individual** decision-maker. §8.7 makes the Panel the Board acting in a moderation capacity, whose quorum is Deed Clause 19's. A Panel member who took no part in the appealed act is a different decision-maker. |
| **(b)** | **Panel hears it; it must LEAVE the Panel where the Panel decided** | Structurally purer, but see the cost. |
| **(c)** | **A body other than the Panel hears all moderation appeals** | Requires constituting that body — a second 10.18. |

⚠ **The cost of (b), stated plainly.** There is **no body above the Panel** short of the full Board,
and §8.7 already makes the Panel a capacity of it. (b) therefore either has no destination, or makes
the appeal unhearable in exactly the case it matters most — a Panel-imposed termination.

⚠ **The cost of (a), stated equally plainly.** A small Panel may have **no eligible individual**: if
every sitting member participated in the appealed act (as `member_moderation_actions.actor_id` or as a
`member_moderation_grounds.added_by`), the exclusion set swallows the body and the appeal cannot be
heard. **The system will refuse rather than pretend** — AC5's server-side exclusion returns a typed
**409**, not a quiet pass. ⚠ **The Panel should state what happens then**: the note recommends the
appeal remains **filed and open** (never auto-decided, never auto-dismissed), and the unavailability is
a governance matter for the Board. Silence on this sub-point is recorded as `[Author-committed]`.

⭐ **Recommend (a)**, with the exhausted-Panel case recorded as above.

---

### Q3 — Eligibility, window, and exhaustion ⛔ BLOCKING · *Feeds AC4, AC5*

**Four sub-questions.**

**Q3.1 — Which statuses are appealable?** `status.ts:17` already asserts suspension is *appealable*.
⭐ **Both `suspended` and `terminated`.** Anything narrower leaves one of the two shipped notice
strings untrue (and now, per F-4, one of three).

**Q3.2 — Is there a claimant-facing deadline?**
⭐ **No deadline.** There is **no `AppealWindowExpired` anywhere in this codebase**, and Part 9's D-E
grief-aware precedent set the same posture on the claim side. A deadline would also be unenforceable
against a terminated member who has lost portal access and may not learn of the sanction promptly.
⚠ The cost of no deadline: an appeal may be filed years later, against an act whose deciders have left
the Panel. Recorded, and accepted as the lesser harm.

**Q3.3 — One journey per moderation ACTION, or per MEMBER?**
⭐ **Per ACTION.** §8.4a states that suspension and termination are *"distinct sanctions with distinct
thresholds — not two intensities of one act"*. Keying to the **member** would make a later termination
unappealable because an earlier suspension had been appealed. Part 9's *"exactly one journey per claim,
ever"* keys to the **claim**; the Part 8 analogue of a claim is a **moderation act**, not a member.

**Q3.4 — After an appeal against an action is DECIDED, may a NEW appeal be filed against that SAME
action?**

| | Option | What it means |
|---|---|---|
| **(a)** ⭐ | **One OPEN appeal at a time; re-filing permitted after a decision** | Uniqueness is enforced by a **partial UNIQUE index** scoped to open rows. New grounds arising later get a hearing. |
| **(b)** | **Exhausted forever**, Part 9's D-F standard | A non-partial UNIQUE constraint on `moderation_action_id`. |

⚠ **The cost of (b), stated plainly.** It is **harsher than Part 9's own standard** applied to a
harsher subject: a claim is adjudicated against an external-facing entitlement with a documentary
record, whereas a moderation act is a disciplinary act by the Trust against its own member, and new
exculpatory facts are exactly the thing that surfaces late. (b) closes the door permanently on them.

⚠ **The cost of (a).** Repeat filings are possible. Mitigated by: one open at a time, the adjudicator's
reasoned outcome standing on the record, and the fact that a vexatious pattern is itself a §8.5 matter.

⭐ **Recommend: both statuses · no deadline · per action · (a) one open at a time.**

---

### Q4 — Outcomes, and what `allowed` DOES ⛔ BLOCKING · *Feeds AC4, AC6*

**Q4.1 — Which outcomes?** `upheld` | `allowed` only, or a third **`varied`** outcome (the appellate
authority substitutes a lesser sanction)?

⭐ **Two outcomes.** A variation is a **new moderation act** with its own §8.6 record, its own reason
code, its own Decision Note and its own dwell — not an appeal outcome. Encoding `varied` as an appeal
outcome would create a moderation act with no moderation record.

⚠ **The cost:** an appellate authority who thinks the sanction too harsh must **allow** the appeal and
then take a fresh, lesser act. That is two records where one might feel natural. It is also two
*attributions*, which is the point.

**Q4.2 — Does `allowed` DIRECT a restore, or PERFORM one?**

| | Option | What it means |
|---|---|---|
| **(a)** ⭐ | **DIRECTS** | The appeal record + its event are written; **nothing in the moderation overlay moves**. The restore is a subsequent, separately-attributed act through the existing `POST …/moderation` path, carrying its own reason code, its own Decision Note, and (from `terminated`) the Panel-exclusive `member.restore_terminated` check. The admin surface cross-links the two. |
| **(b)** | **PERFORMS** | The decide endpoint writes the overlay itself. |

⚠ **The cost of (b), stated plainly.** It is a **second moderation write path** that bypasses §8.6's
record, the dwell, and `member.restore_terminated`'s Panel exclusivity (`roles.ts:627-637` — the Panel
is that key's **only** holder, enforcing §8.4's *"Restoration from termination is an act of the Trustee
Panel"*). It would also make the appeal a moderation act **without a Decision Note**.

⭐ **Recommend two outcomes; `allowed` DIRECTS.**

---

### Q5 — Suspensive effect · *Feeds AC2, AC4*

**The question.** Does a filed appeal **suspend** the sanction pending outcome?

⭐ **No — and §8.8 states it expressly rather than leaving it silent.** A suspended member retains
access unconditionally and is *curing*; they need the contribution surface, and §8.4a/Story 10.16's
disclosure lives there. A terminated member's access does not return on filing — restoring it on the
mere act of filing would make filing a self-service reversal of the sanction.

⚠ **Why it must be stated, not left silent.** Silence would be read by the next reader as an open
question, and by a member as a possibility. §8.8 saying *"the filing of an appeal does not suspend the
act appealed against"* is one sentence that forecloses both readings.

⚠ **Non-answer consequence:** §8.8 ships silent on suspensive effect, and the silence is recorded in
`deferred-work.md` as an owed clarification.

---

### Q6 — §8.4a's *Notice + opportunity to respond* row ⚠ THE QUESTION 10.20 DEFERRED HERE · *Feeds AC2, AC8*

**Context.** §8.4a (`niyamavali.md:215`, hi `:213`) currently reads that the row is mechanized to the
**dwell only**, and says why: *"no response, and no waiver of the opportunity, is recorded or required,
because there is as yet **no route by which a member may respond** — §8.8 is reserved for it and remains
unlanded."* Once §8.8 lands, that sentence's premise is gone.

**The question.** Now that a route exists, does a termination require a **recorded response-or-waiver**
as a **precondition**?

| | Option | What it means |
|---|---|---|
| **(a)** ⭐ | **No for v1.** The row's disposition is re-worded to record that a route now exists, and elapsed dwell continues to satisfy it | The row **stays in the stated-but-unmechanized list** — per §8.4a's own standing rule, *"a row leaves this list when the Trust has seen its mechanism work, not merely when the code exists."* |
| **(b)** | **Yes** — a termination is blocked until a response or a waiver is recorded | |

⚠ **The cost of (b), stated plainly.** 10.20's Q4.3 already warned that *"inventing a response-record
precondition would block ordinary termination"* (`deferred-work.md:237-241`). A member who simply does
not respond would make the sanction unreachable, which converts silence into a veto.

⚠ **This question must be ASKED, not assumed.** 10.20 deferred it here by name. A silent (a) would
repeat the defect the deferral exists to prevent.

---

### Q7 — Intake shape · *Feeds AC4, AC7*

**The question.** Does the appeal have **two intake surfaces and one record** — an **in-portal** member
route (the dead CTA acquires a destination) and an **off-portal** helpline route riding the helpdesk
substrate as its intake artifact (an existing category + a `sub_category` token, per F-2)?

⭐ **Yes.** Two reasons: (i) `epics.md:4080` requires the appeal be reachable **off-portal** for a
terminated member — *"the appeal must not depend on the access termination removes"*; (ii) 10.21's
ruling put the analogous process *"ON a helpdesk ticket"*, and 10.29 shipped the both-intake-routes
pattern with the member's own request **captured at intake** by the projector from the server's clock.

⛔ **One record, not two.** A second table for the off-portal arm would let the two drift, and drift
between two records of one fact is a defect this project has already paid for.

⛔ **The off-portal arm is NOT gated on `member.data_rights`.** Filing an appeal is not executing a
DPDPA right, and 10.21 minted that key precisely to separate *filing* from *executing*.

⚠ **Non-answer consequence:** AC7 is unbuildable and the epic's off-portal requirement goes unmet — a
terminated member in the flag-on world would have **no route at all**.

---

### Q8 — The adjudication key ⛔ BLOCKING · *Feeds AC5*

**The question.** Mint a **new** permission key for deciding a moderation appeal (catalog **33 → 34**,
keys **42 → 43**), or reuse `member.moderate`? And who holds it?

| | Option | What it means |
|---|---|---|
| **(a)** ⭐ | **Mint** (proposed key: `member.moderation_appeal.decide`) | Granted to `trustee_panel` alone, `pariwar` dimension, with a recorded reuse-check at the key itself (the `member.restore_terminated` template). |
| **(b)** | **Reuse `member.moderate`** | No catalog move. |

⚠ **The cost of (b), stated plainly and with the live grants.** `member.moderate` is held by
`pariwar_admin` (`roles.ts:262`) **and** `trustee_panel` (`roles.ts:636`) — so a check on it **cannot
distinguish the appellate authority from the authority that decided**. That indistinguishability is the
exact defect Story 10.18 existed to end, and (b) reopens it at the one call site where the separation is
the entire point. `verifier` (`roles.ts:519`) also holds `member.moderate`, but as a **documented,
deliberately-inert** grant (`district` ceiling; Decision `2026-08-10-096` clause 7) — it could not
satisfy a `pariwar`-dimension check either.

⛔ **Per F-3, `state_trustee` and `district_admin` cannot hold the new key** — the grant would be inert
on arrival by rank arithmetic, not by oversight.

⚠ **The key name is the author's proposal, not a ruling subject.** If the Panel prefers a different
name, say so; otherwise the name is recorded `[Author-committed]`.

⚠ **Non-answer consequence:** AC5 cannot be implemented. There is no defensible default — (b) is a
known-bad and minting a key without a ruling is exactly what `[[feedback_governance_commits_precede_implementation]]`
forbids.

---

### Q9 — Publication · *Feeds AC8*

**The question.** Does an **allowed** moderation appeal publish anywhere, as Part 9's reversed denial
publishes to Sahyog Vivran?

⭐ **No.** Sahyog Vivran is **claim/memorial-scoped**. A moderation outcome concerns a member's standing
and is **member-private + audit**. Publishing an allowed appeal would publish the fact of the original
sanction to an audience that never saw it.

⚠ **Record the contrast expressly**, so a later reader does not read the absence as an omission. This
is AC8's *"Not addressed — a decided absence"* register (`[[feedback_closure_language_precision]]`).

⚠ **Non-answer consequence:** the absence ships unrecorded, and the next reader must re-derive it.

---

### Q10 — Legal review · *Feeds AC8, AC10*

**Context.** Story 6.16 built a `pending_legal_review` **fail-closed config gate** on the claim appeal
(`docs/appeal-procedural-fairness/README.md` §3) — with **initiate deliberately ungated**, on the stated
principle that *"a claimant's right to FILE an appeal must not be blocked by a trust-side config."*

**The question.** Does the moderation appeal ride that gate, or is it **recorded for counsel without a
gate**?

| | Option | What it means |
|---|---|---|
| **(a)** ⭐ | **Recorded for counsel, NO fail-closed gate** | A sibling section in `docs/appeal-procedural-fairness/` carrying a structurally-visible **PENDING-LEGAL-REVIEW** marker, routed into the Story 0.13 engagement roster. Both filing and deciding remain ungated. |
| **(b)** | **Ride the 6.16 gate** | Deciding a moderation appeal is refused while `pending_legal_review` is set. |

⚠ **The cost of (b), stated plainly.** The claim gate protects a ₹50L adjudication by refusing to
*adjudicate*. The same gate here would refuse to **hear a member at all** on a sanction already imposed
against them — which inverts the gate's purpose: it would use an unreviewed procedure as grounds to
leave the member unheard while the sanction runs. 6.16's own principle points the other way.

⚠ **The asymmetry with 6.16 must be RECORDED, not left to inference** — a later reader finding a gate on
one appeal and none on the other must be able to find the reason.

⚠ **Non-answer consequence:** the story defaults to (a) and records the default as `[Author-committed]`,
because shipping (b) unruled would gate a member's right to be heard on a config nobody ruled on.

---

## What non-answer would mean

| Q | Consequence of no answer |
|---|---|
| **Q1** ⛔ | §8.8 cannot be authored. The story stops. |
| **Q2** ⛔ | §8.8 cannot name the hearing authority, and AC5's exclusion set has no subject. The story stops. |
| **Q3** ⛔ | AC4's partial UNIQUE index has no key and no predicate; the table cannot be designed. The story stops. |
| **Q4** ⛔ | The `outcome` enum has no members and AC6 has no posture. The story stops. |
| **Q5** | §8.8 ships silent; recorded as owed. |
| **Q6** | §8.4a's row keeps a disposition whose stated reason (*"no route by which a member may respond"*) is **false the moment §8.8 lands**. ⚠ This is not a neutral default — non-answer leaves the instrument saying something untrue. |
| **Q7** | AC7 unbuildable; the off-portal requirement unmet; a terminated member in the flag-on world has no route. |
| **Q8** ⛔ | AC5 cannot be implemented, and there is no defensible default. The story stops. |
| **Q9** | The decided absence ships unrecorded. |
| **Q10** | Defaults to (a), recorded as `[Author-committed]`. |

**A blocked ruling stops the story at its governance half, recorded as such** — not worked around, not
partially built. Q1–Q4 and Q8 are the five that stop it.

---

## What this note does NOT ask, and what a ruling would NOT mean

**Not asked:**
- ⛔ **The `termination_access_block` flip.** It is DEFAULT OFF, its flip is a **separate,
  Panel-exclusive act** (Decision `2026-08-10-097` clause 12 bullet 4; `2026-08-10-098` clause 2), and
  10.21 has made it **DISCHARGEABLE, not discharged**. **Nothing in this note or a ruling on it
  authorises the flip.** The appeal is required to work on **both** sides of it (AC7).
- ⛔ **Any change to Epic 6's claim appeal.** No shared table, no shared id, no shared route, no import
  from `claim/appeal*.ts`. Part 9 is claim-scoped and Part 8 does not reference it.
- ⛔ **Any new `ModerationStatus`, `ModerationAction`, or `member_lifecycle_state` label.** The overlay
  has exactly three statuses and four legal arms, and a fourth would silently mis-classify five
  `TERMINAL_STATES` sets and every `legal_actions` derivation (`overlay.ts:17-23`).
- ⛔ **A general admin member-profile editor** — 10.21's standing prohibition, unchanged.
- ⛔ **Renumbering §8.7 or §8.9**, or closing up the reserved number.

**A ruling on this note WOULD mean:** §8.8 is **authored and Panel-ratified** into both locales in its
reserved slot, the reserved-numbers note **retires** (its *"deliberately numbered ahead"* sentence
preserved as the historical record of the ordering), §8.6's *Recorded gap* is recorded as **closed by
§8.8** with its original wording **preserved as superseded** (never edited in place —
`[[feedback_supersede_never_reinterpret]]`), and the implementation half is unblocked.

**A ruling would NOT mean:** that the Niyamavali is adopted (it remains an unadopted draft — `[[v1.0]]`,
`[[date]]` unfilled), that **counsel is engaged** (every return field in `docs/legal-counsel-engagement/`
is still `<PENDING>`), or that any standing Panel obligation is discharged. Using
`[[feedback_closure_language_precision]]`'s verbs: §8.8 would be **authored and Panel-ratified**;
**counsel review remains outstanding**.

---

## The standing Trustee Panel obligation queue

⚠ **Reported as last enumerated, not re-enumerated here.** `deferred-work.md:283` records the queue at
**NINE**, verified by enumeration at the time of writing (Story 10.20, 2026-08-12): (i) Story 10.23's
Escalation 6; (ii) **the copy-truth defect, still unassigned**; (iii) R7(A)'s unpublished Part 11
amendment; (iv) the R7(C)/R7(F) lock-in asymmetry; (v) counsel review of §8.7; (vi) counsel review of
§8.4/§8.4a; (vii) the Q6 portal-access flip authorisation; (viii) counsel review of §8.5/§8.6/§8.9;
(ix) the rejoin-model reconciliation.

⛔ **I have NOT re-enumerated items (i)–(ix) against the live tree**, and no entry between
`2026-08-12-099` and the head `2026-08-15-120` restates the count. **NINE is therefore the last recorded
figure, not a verified current one.** Stated as a count, not as progress.

⚠ **Two observations the Panel may wish to act on, offered as observations only:**
- Item **(ii)**, *the copy-truth defect*, appears to be **precisely what AC3 of this story closes**
  (now five sites, per F-4). A ruling here would make (ii) **dischargeable** — it would not discharge it.
- Item **(vii)** remains open; 10.21 landed and made the flip dischargeable, not discharged.

---

## Ruling template

The Panel may rule by completing this table. Per Decision `2026-08-09-095`, the recorded entry must
carry **per-clause provenance** — `[Trustee-ratified]`, `[Author-committed]`, or author finding.

| Q | Ruling | Notes |
|---|---|---|
| **Q1** | (a) / (b) / (c) | If (b) or (c), **name the bodies** and the escalation trigger |
| **Q2.1** | Panel hears it: yes / no | If no, name the body — it must be `pariwar`-ceiling or broader (F-3) |
| **Q2.2** | different individual / must leave the Panel | And: what happens when the exclusion set swallows the Panel? |
| **Q3.1** | suspended + terminated / suspended only / terminated only | |
| **Q3.2** | no deadline / deadline = ______ | |
| **Q3.3** | per action / per member | |
| **Q3.4** | (a) one open at a time / (b) exhausted forever | |
| **Q4.1** | two outcomes / three (adds `varied`) | |
| **Q4.2** | (a) DIRECTS / (b) PERFORMS | |
| **Q5** | no suspensive effect, stated / suspensive / silent | |
| **Q6** | (a) no precondition / (b) response-or-waiver required | The row **stays in the §8.4a list** either way |
| **Q7** | (a) two surfaces, one record / other | |
| **Q8** | (a) mint / (b) reuse `member.moderate` | If (a): key name = ______ ; holders = ______ |
| **Q9** | no publication / publish to ______ | |
| **Q10** | (a) recorded for counsel, no gate / (b) ride the 6.16 gate | |
| **F-4** | noted / route as a separate question | The fifth untrue copy site (`terminated.body_access_retained`) |

---

# The ruling as given — 2026-08-15

⚠ **Recorded verbatim and authoritative where it differs from the option text above.** The Panel
**materially amended Q3D beyond the options offered** — it did not select between (a) and (b), it
adopted (a) and then replaced it with a **three-tier appeal ladder** the note never put. Per the
Decision `2026-08-12-099` precedent, that is recorded as an **addition**, not read back into option (a)
as though it had been one.

## The ruling, as transmitted

| Q | Ruling |
|---|---|
| **Q1** | (a) — Single internal appeal. |
| **Q2A** | (a) — Trustee Panel is the appeal authority. |
| **Q2B** | (a) — A different Trustee Panel member must hear the appeal if the original decision was made by a Panel member. |
| **Q3A** | (a) — Both suspension and termination are appealable. |
| **Q3B** | (a) — No appeal deadline. |
| **Q3C** | (a) — Appeal is tied to the particular moderation decision, not permanently to the member. |
| **Q3D** | (a) — One appeal may be open at a time; a new appeal may be filed after the previous appeal is decided. **⚠ THEN AMENDED — see below.** |
| **Q4A** | (a) — Two outcomes only: `upheld` or `allowed`. |
| **Q4B** | (a) — An allowed appeal **directs** restoration; the appeal mechanism itself does not perform the restoration. |
| **Q5** | (a) — Filing an appeal does not suspend the punishment. |
| **Q6** | (a) — No additional response/waiver prerequisite is required before termination. |
| **Q7** | (a) — Two intake surfaces, member app/portal and helpline/helpdesk, producing one underlying appeal record. |
| **Q8** | (a) — Create a separate permission for deciding moderation appeals. |
| **Q9** | (a) — Appeal and outcome remain private; no public disclosure. |
| **Q10** | (a) — Counsel review is recorded but does not block filing or deciding an appeal. |

## Q3D — the amendment, verbatim

> **Q3D — Amend the ruling to the following exact appeal progression:**
> **First appeal:** decided by 1 Trustee.
> **Second appeal:** decided by 2 Trustees.
> **Third appeal:** decided by all 3 Trustees and is the final internal appeal.
> **Decision rule:** Where more than one Trustee participates, the outcome is determined by majority vote.
> **Two-Trustee tie:** If the second appeal results in a 1–1 split, it automatically proceeds to the
> third appeal before the full three-member Trustee Panel. No casting vote is used.
> **Prior participation:** A Trustee who participated in the original moderation decision or an earlier
> appeal remains eligible to participate in a later appeal. Prior participation does not create a
> recusal requirement.
> **Finality:** Once the third appeal is decided by majority vote of the three Trustees, the Trust's
> internal appeal process is exhausted. No fourth internal appeal is permitted.

## Standing directions given with the ruling, verbatim

> Do not silently fill any missing governance detail. In particular, preserve the distinction between
> the Panel's ruling and implementation recommendations.
>
> **Before implementation:** Create the corresponding Trustee Panel decision-log entry as the
> governance commit, following the existing governance-first convention. Update the Story 10.22
> decision/ruling section and sprint ledger with the actual Panel rulings. Ensure the English/Hindi
> §8.8 text reflects the ratified decisions consistently. Do not modify `packages/` or `apps/` in the
> governance commit. Reconcile every AC against the ruling before beginning implementation. **If any AC
> cannot be implemented exactly from these rulings, stop and surface the conflict rather than inventing
> a rule.** Preserve all recommendations that were not selected as recommendations only; do not
> represent them as Panel decisions.

## What was NOT ruled

- **F-4** — the fifth untrue copy site (`moderation.notice.terminated.body_access_retained`, en+hi).
  The ruling template's F-4 row was not completed. ⚠ **Un-ruled.** The author's proposed disposition
  (fold into AC3, no separate ruling) stands as a **recommendation only**.
- **Q2.2's exhausted-Panel sub-point** — *"what happens when the exclusion set swallows the Panel?"*
  Not answered directly. Q3D's no-recusal clause would dissolve the question, but only under one of the
  readings of **C-2** below.
- **The key NAME.** Q8(a) ruled that a separate permission be created. It did **not** name it.
  `member.moderation_appeal.decide` remains an **author recommendation**, `[Author-committed]`.

---

# ⛔ CONFLICTS — surfaced, NOT resolved. §8.8 IS NOT AUTHORED.

**Per the Panel's own standing direction** — *"If any AC cannot be implemented exactly from these
rulings, stop and surface the conflict rather than inventing a rule"* — the implementation half does
**not** begin, no `.decision-log.md` entry is authored, and §8.8 is **not** drafted in either locale.
An entry authored now would have to state a ruling that is not yet internally consistent, and Decision
`2026-08-09-095`'s per-clause provenance requirement cannot be met while two `[Trustee-ratified]`
clauses contradict each other.

⚠ Every conflict below is stated with the instrument or file that establishes it, verified live at
`b3e12e1`. None is an author preference.

## C-1 ⛔ Q1(a) and the Q3D amendment cannot both be authored into §8.8

Q1 option **(a)**, as the Panel had it before it: *"**Single tier** — One review, by an authority who
did not take the appealed decision."* The Q3D amendment establishes **three successive appeals** with a
named finality at the third. §8.8 must say one thing.

**Two readings, and the note will not choose between them:**
- **(i)** Q1(a) means *internal-only — not a mirror of Part 9's geographic stages* — and Q3D supplies
  the internal structure. §8.8 then states a **three-tier internal ladder**.
- **(ii)** Q1(a) means literally one review, and Q3D's progression is a later refinement that
  **supersedes** it. §8.8 then states the ladder and Q1(a)'s "single tier" is recorded as superseded.

Either way, **the phrase "single internal appeal" cannot appear in §8.8 alongside a three-appeal
progression.** ⚠ Reading (i) is the author's guess. It is not recorded as the ruling.

**Breaks:** AC2 (§8.8's text), AC1's Q1 clause.

## C-2 ⛔ Q2B and Q3D's *Prior participation* clause contradict each other head-on

| Clause | Says |
|---|---|
| **Q2B** `[Trustee-ratified]` | *"A **different** Trustee Panel member **must** hear the appeal if the original decision was made by a Panel member."* |
| **Q3D, Prior participation** `[Trustee-ratified]` | *"A Trustee who participated in the original moderation decision or an earlier appeal **remains eligible** to participate in a later appeal. Prior participation does **not** create a recusal requirement."* |

One mandates exclusion; the other abolishes it. **Three readings, all defensible, none rulable by the
author:**
- **(i)** Q2B governs the **first** appeal only; Q3D's no-recusal governs the **second and third**
  (where, at the third, excluding anyone is arithmetically impossible if the Panel is three).
- **(ii)** Q3D **supersedes** Q2B entirely — there is no recusal anywhere, and Q2B's "different member"
  is aspirational.
- **(iii)** Q2B governs **whenever a non-participating Trustee is available**, and Q3D relieves it only
  when none is.

**Breaks:** **AC5 in its entirety.** AC5's exclusion set (*every* `member_moderation_actions.actor_id`
**plus** every `member_moderation_grounds.added_by`), its server-side enforcement, its typed **409**,
and its mandatory **polarity-pair** test (*"the original actor is refused; a second Panel member is
accepted"*) all have **no subject** until this resolves. Under reading (ii) the 409 never fires and
AC5 has nothing to enforce; under (i) it fires at tier 1 only; under (iii) it fires conditionally on
Panel composition at decision time. ⛔ These are three different systems.

## C-3 ⛔ The Deed puts the Board at THREE-TO-NINE Trustees. Q3D presumes exactly three.

**`docs/legal/trust-deed.md:211`, Clause 18(a), verified live:**

> *"**Number.** The Board shall consist of not fewer than **[[three (3)]]** and not more than
> **[[nine (9)]]** Trustees."*

Q3D says *"all **3** Trustees"*, *"a **1–1** split"*, *"majority vote of **the three** Trustees"*,
*"the full **three-member** Trustee Panel"*. **The Trust may lawfully have nine.** And in code,
`trustee_panel` is a **role with no cardinality** — any number of users may hold it; nothing counts
them, and nothing could enforce "all three" against a five-holder Panel.

⚠ Note also §8.7 makes the Panel *the Board acting in a moderation capacity*, so "Trustee" and "Trustee
Panel member" are the same person here — which is what makes the arithmetic binding rather than
notional.

**The Panel must state whether §8.8 fixes the appellate bench at three, or states the rule relatively**
(e.g. *"one Trustee; then two; then all Trustees then in office"*). ⛔ The author will not pick.

**Breaks:** AC2 (§8.8's text), AC4 (how many decision rows/votes a tier may hold), AC5 (the bench).

## C-4 ⛔ Deed Clause 19(c) MANDATES a casting vote. Q3D disapplies it. The Deed is the superior instrument.

**`docs/legal/trust-deed.md:229`, Clause 19(c), verified live:**

> *"Save where a higher majority is required by this Deed, questions shall be decided by a majority of
> Trustees present and voting; **in case of equality, the Chairperson shall have a second or casting
> vote.**"*

Q3D: *"**No casting vote is used.**"* And §8.7 binds the Panel to Clause 19 expressly (*"whose quorum
is that of Deed Clause 19"*).

⛔ **A Niyamavali Part 8 amendment cannot disapply a Trust Deed clause.** Clause 19(c) admits variation
only *"where a higher majority is required by **this Deed**"*. Disapplying the casting vote is in
substance a **Deed amendment**, which under **Clause 27(b)** requires *"a resolution passed by not less
than two-thirds of the Trustees then in office"* **and** *"a supplementary registered deed"* — not a
Part 11 Niyamavali amendment, and certainly not §8.8.

⚠ Additionally: **there is no Chairperson concept anywhere in the codebase** — no role, no key, no
column. Even the Deed-compliant path has no mechanism today.

**Two lawful routes, for the Panel to choose:**
- **(i)** §8.8 **conforms** to Clause 19(c): a 1–1 split at the second appeal is broken by the
  Chairperson's casting vote, and the auto-escalation clause is dropped or re-scoped.
- **(ii)** The Deed is **amended first** under Clause 27(b), and §8.8 lands after it — a separate
  governance act, out of Story 10.22's scope entirely.

**Breaks:** AC2, and potentially the whole story's schedule under route (ii).

## C-5 ⛔ AC4's record cannot express a multi-Trustee majority vote

AC4 specifies the decision as **singular**: `outcome` · `decided_by_actor_id` · `decided_by_display` ·
`decided_at` · `reasoned_outcome_ciphertext`. Q3D requires **1, then 2, then N deciders**, an outcome
**derived from a majority of votes**, and an **automatic escalation** on a tie.

That is a **votes child table** (the `claim_r9_votes` shape), a **tier/sequence** column, a
**vote-to-outcome derivation**, and an **auto-escalation transition** — none of which AC4, Task 4 or
Task 5 contemplate, and none of which the story scopes. It is materially more than a column change.

⚠ It also reopens a question the note never asked: **does each voting Trustee author their own reasoned
outcome** (N Tier-1 ciphertexts), or does the bench issue one? AC9's RTBF scrub and AC4's *"no outcome
prose in the payload"* both depend on the answer.

**Breaks:** AC4, AC9, Task 4, Task 5, Task 6.

## C-6 ⛔ AC4's uniqueness rule is superseded, and its replacement is a DIFFERENT constraint

AC4/D4 as written: a **partial UNIQUE index** on `(moderation_action_id) WHERE open`, with re-filing
after a decision **intentional and uncapped**. D4 warns expressly: ⛔ *"do not 'tighten' AC4's index to
a non-partial UNIQUE constraint."*

Under Q3D the rule is now: **at most three** appeals per moderation action, **strictly tier-ordered**
(1 → 2 → 3), with **terminal exhaustion** after the third — *"No fourth internal appeal is permitted."*
That is not the shipped rule, not D4's rule, and not the naive tightening D4 forbids. It is a **third
constraint** the story does not specify.

⚠ And the tie-escalation makes tier progression **partly automatic** rather than member-initiated, so
"a new appeal may be filed after the previous appeal is decided" (Q3D's own first sentence) is true for
tiers 1→2 but **not** for the 1–1 tie path into tier 3.

**Breaks:** AC4, D4.

## C-7 ⚠ The ladder re-creates a three-tier structure, and §8.8 must still say it is NOT Part 9

AC2 requires §8.8 to state *expressly that it is **not** Part 9 and does **not** incorporate it*. Part 9
has **three stages**; §1.3 (`niyamavali.md:39`) already glosses *"District Admin / State Trustee /
Trustee Panel (Core Team) — **the three escalation tiers** of decision authority (Part 9)"*. A
three-appeal Part 8 ladder now **resembles** it closely, and Q1(a)'s recorded reasoning was that Part
9's stages *"do not map onto a Part 8 act"*.

⚠ This is **not fatal** — the two differ in bench (one body at escalating size vs. three distinct
geographic offices) — but §8.8's not-Part-9 sentence must now **distinguish** rather than merely assert,
and that sentence is governance text the author will not draft unruled.

**Breaks:** AC2's not-Part-9 clause (softly — it needs drafting guidance, not a new ruling).

---

## What is UNAFFECTED and ready to build the moment C-1…C-6 resolve

Recorded so the conflict register is not read as blocking more than it does. These rulings are clean,
match the ⭐, and break nothing:

**Q2A** (Panel is the authority) · **Q3A** (both statuses) · **Q3B** (no deadline) · **Q3C** (per
action, not per member) · **Q4A** (two outcomes) · **Q4B** (`allowed` DIRECTS — AC6 stands entire) ·
**Q5** (no suspensive effect) · **Q6** (no response-or-waiver precondition; the §8.4a row stays in the
list) · **Q7** (two intake surfaces, one record — AC7 stands entire) · **Q8** (mint a separate key —
AC5's RBAC half stands; only its exclusion half is blocked by C-2) · **Q9** (no publication) ·
**Q10** (counsel review recorded, no fail-closed gate — AC8's deferral register stands).

⚠ **Q8's key NAME is still un-ruled** and remains `[Author-committed]`.
