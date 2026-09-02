# Trustee Panel routing note — 2026-09-02
## May the DECEASED MEMBER's name render at the `public` tier on **Sahyog Vivran**, and in what FORM?

**Author:** BigDev, Solo Builder — 2026-09-02
**Occasion:** Story **11b.3b**'s Task 0, which owes this packet in terms. The question is **D3**, a
**new finding of the 2026-09-01 authoring pass** — ⛔ nothing in the tree had recorded it. The D6(b)
three-way split of Story 11b.3 was ruled partly *because* of it: moving both name questions into
11b.3b is what lets 11b.3 ship with **zero Tier-1 fields at `public`** and therefore **no Panel
dependency at all**.
**Routed to:** Trustee Panel · **Adv. Mohit Agrawal** (engaged counsel since 2026-06-21; T&C return
due **2026-09-07** — ⭐ **five days from this note**, and §3 turns on that date).
**Status:** ⏳ **ROUTED, ⛔ NOTHING RATIFIED AND NOTHING APPLIED.**

> ### 📖 **Panel members — please start at [Appendix A: In plain words](#appendix-a--in-plain-words).**
> It is at the end of this note and it is **complete on its own** — it contains the whole question,
> the options, and what follows from each, with ⛔ no technical detail. ⭐ **You can answer this note
> from Appendix A alone.**
> The numbered sections below are the **evidence**, written for the engineering record so that
> whatever you decide can be checked against the code later. ⛔ You are not expected to read them.

> ⭐⛔ **THE HEADLINE: `/sahyog` NAMES THE DECEASED MEMBER IN FULL, AND `/sahyog-vivran` — THE PAGE
> DEDICATED TO THAT ONE PERSON — CANNOT NAME THEM AT ALL.**
> `matrix.ts:401-402` keeps 11b.3 and 11b.6 at first-name + last-initial and reserves any change to
> *"each surface's **OWN** Panel ruling."* ⚠⛔ **But keeping a shielded FORM is ⛔ not the same act as
> holding an ENTRY**, and the gate is fail-closed regardless of form: a `pii_tier: 1` field at
> `tier: public` with no `tier1_public_exception` **FAILS**, whether the value is a full name, an
> initial, or a masked string. ⇒ **as things stand the memorial page must render the drive unnamed,
> beside an index that names the same person in full.**
>
> ⚠ **This note asks about the DECEASED MEMBER only.** The **contributor** question (Q1/Q2 of the
> `2026-08-30` note) is ⛔ **not re-argued here** — one note, one question set.

---

## 1. What is being asked, precisely

### ⭐ First: **WHOSE** name — because THREE different people's names reach these surfaces, and TWO land on THIS one

**`deceased_member_name` is the MEMBER WHO DIED — the colleague the drive exists FOR.** It resolves
from `claims.deceased_member_id` (`packages/domain/src/schema/claims.ts:127`), which is `notNull()`
and branded **`MemberId`** ⇒ ⭐ **the deceased is always themselves a TWT member**, ⛔ never an outside
person. The claim spawns the pool; other members contribute; the funds go to that member's
nominee/family. ⇒ funds are raised **in that member's name, for their family** — the person the page
is **about** is the deceased member; the recipient of the **money** is the nominee.

⚠⛔ **AND THE THREE NAMES MUST ⛔ NOT BE CONFLATED — they rest on DIFFERENT instruments:**

| Field | Whose name it actually is | Story | Its instrument | Allowlist entry |
|---|---|---|---|---|
| **`deceased_member_name`** | ⭐ **the member who DIED** (`claims.deceased_member_id`) | **11b.3b — this note** | the **deceased member's OWN** accepted T&C (`-160` cl.4) | ⛔ **none on `sahyog-vivran` → D3** |
| `nominee_account_holder_name` | ⚠ **whoever the filer TYPED as account holder** — the schema is explicit: *"⛔ NO holder-name-must-match-nominee linkage of any kind: the filer types a holder name per account, full stop"* (`claim_nominee_bank_accounts.ts:7-11`) | 11b.3a | the **nominee's own Claim Terms** (`-160` cl.3) — ⛔ **which has no instrument** | ✅ ruled `-165` cl.1 |
| `contributor_name` | each member who **CONTRIBUTED** | 11b.3b | **those members' own** T&C (`-160` cl.7) | ⛔ none → **D2**, routed 2026-08-30 |

⭐⭐ **AND THAT TABLE EXPLAINS WHY THIS QUESTION IS THE EASIER OF THE TWO NAME QUESTIONS.** The basis
in §3 works **precisely because the deceased is a member** — a member can accept a T&C carrying the
disclosure clause, and `NAME_PUBLICATION_AUTHORISED` reads exactly that
(`cr.subject_id = "claims"."deceased_member_id"`, `consent_type = tc_acceptance`). ⚠ It is also why
the **nominee's** basis is the hard one: a nominee is a **NON-MEMBER**, which is the missing *"consent
basis that reaches a non-member"* on which counsel's standing third-party objection turns
(`deferred-work.md` 11b.1 item (a)). ⛔ **That nominee question is ⛔ NOT this note's** — it is Story
11b.3a's **D5**, and ⛔ nothing here should be read as bearing on it.

### Then: the two questions, and — exactly as in the contributor note — they are **separable**:

**(Q1) — the DECLARATION.** May `deceased_member_name` be declared at the `public` tier on
**`sahyog-vivran`** at all? That is a `(surface, field)` pair in `matrix.ts`'s ruled Tier-1
public-exception allowlist, and **adding one is a RULING, ⛔ never a code edit** — the file says so on
its own face (`matrix.ts:388-391`): *"⛔ ADDING TO THIS LIST IS A RULING, NEVER A CODE CHANGE … do NOT
'fix' a failing third entry by appending it here — that inverts the control. **The gate failing is the
gate working.**"*

**(Q2) — the FORM.** If yes: **full name**, as `/sahyog` renders it under D10, or **first-name +
last-initial**, the form `matrix.ts:401-402` currently reserves for this surface?

⚠ Q2 is ⛔ **not** a sub-case of Q1, and ⛔ neither is answered by the other. ⭐ **A ruling either way
costs ⛔ no migration and ⛔ no schema change** — which is precisely why nobody should pre-empt it.

## 2. ⭐ Why this is a NEW question and not one already answered

The allowlist holds **two** entries (`matrix.ts:392-404`), and ⛔ **neither is this**:

- `member-directory.member_name` (`:394`) — `2026-08-19-135` cl.7(c) / `-136`.
- `sahyog-drive.deceased_member_name` (`:403`) — `2026-08-24-159` cl.2 (D1(b)).

⚠⛔ **AND THE SECOND ONE IS THE TRAP.** It is the *same field name* on a *different surface*, so a
reader who greps for `deceased_member_name` finds a ruling and concludes the question is answered.
⛔ It is not. The entry's own `scope:` block in `public-vs-private-matrix.yaml` says so, verbatim:

> *"Exactly this field on exactly this surface. ⛔ It does NOT reach Sahyog Vivran (11b.3) or In
> Memoriam (11b.6), which keep first-name + last-initial and **must each seek their OWN Panel
> ruling**."*

⭐ **The G3 routing note excluded this question from the `-135`/`-136` scope in terms too**
(`epics.md:160`): those decisions *"did not ask about nominee names, **deceased-member names on Sahyog
Vivran**, or verifier names on public verifier profiles — separate surfaces with separate consent
postures."*

## 3. ⭐⭐ THE FINDING THIS NOTE EXISTS TO PUT TO THE PANEL — the BASIS is built, and its CLAUSE TEXT is still being written

⚠ **This surface is in a materially different position from the contributor one, and the difference
runs in the Panel's favour: here the MECHANISM already exists.** Story 11b.9 shipped
`NAME_PUBLICATION_AUTHORISED` (`packages/domain/src/pool/public-read.ts:283-299`) — the deceased
member's **own** accepted T&C version, pinning the posthumous-disclosure clause. ⛔ Not the family's
tick-box, which `2026-08-28-160` cl.3-5 de-authorised and `-162` retired.

⭐ **And the predicate is deliberately INERT today** (`public-read.ts:171-175`): *"UNTIL A MATCHING
`clause_versions` ROW EXISTS AND IS PINNED, THIS PREDICATE IS FALSE FOR EVERY MEMBER AND ⛔ NO NAME
RENDERS … fail-closed, correct, and ⛔ NOT A BUG."* That is a ruled **choice** (`2026-08-28-161`,
11b.9 D6(a)), ⛔ not a defect and ⛔ not a block.

**⇒ THE FINDING.** The clause the predicate pins is
**`niy.public-disclosure.member-information`** (`public-read.ts:181-183`) — ⚠ a **GENERAL**
"public disclosure of member information" clause, carried under a constant *named*
`SAHYOG_DRIVE_PUBLICATION_CLAUSE_ID`. **The name is surface-scoped; the clause id is not.**

⛔ **And the clause TEXT does not exist yet** — counsel's T&C return is due **2026-09-07**. ⇒ whether a
Panel ruling on Q1 is **buildable** depends on text that is ⛔ **not yet fixed**:

| If counsel's clause is drafted… | Then a Q1 "yes" is… |
|---|---|
| **narrowly** — authorising disclosure *on the Sahyog Drive index* | ⛔ **unbuildable.** The entry would be ruled and the predicate would still be false on this surface; the page renders unnamed anyway. |
| **generally** — authorising posthumous disclosure of member information on the Trust's public transparency surfaces | ✅ **live the moment the clause is pinned**, with ⛔ no further code. |

⭐⭐ **This is the whole reason the note is worth sending BEFORE 2026-09-07 rather than after.** The
Panel can ask counsel to scope the clause **deliberately**, in either direction, rather than the
project discovering the mismatch when the ruling turns out to have no instrument. ⚠ The epic AC
already warns against assuming otherwise: *"⛔ do not assume the 11b.9 predicate transfers unchanged
to a class it was not built for."*

⛔ **This note does ⛔ not propose the clause text and does ⛔ not ask the Panel to draft it.** It asks
only that the **scope question be put to counsel as a scope question**.

## 4. ⭐ THE ASYMMETRY — and it sits differently from the contributor case

| Layer | Contributor (the 2026-08-30 note) | **Deceased member on `sahyog-vivran`** (this note) |
|---|---|---|
| **The BASIS** — *why* the name may render | ✅ **SETTLED** (`-160` cl.7) | ✅ **SETTLED** — the member's own T&C, `-160` cl.4 |
| **The DECLARATION** — the `(surface, field)` pair | ⛔ **NOT MADE** | ⛔ **NOT MADE** — ⭐ **and this is the new finding** |
| **The FORM** | ⛔ **UNRULED** since 2026-08-19 | ⚠ **RESERVED** to this surface's own Panel ruling (`matrix.ts:401-402`) |
| **The MECHANISM** — what gates it at render time | ⛔ **NOT BUILT** | ✅ **BUILT and INERT by ruled design** (§3) |

⇒ ⭐ **the Panel is being asked for less here than in the contributor case.** The instrument exists;
what is missing is the **entry** and the **form**.

## 5. ⚠⛔ `/sahyog`'s FORM IS ⛔ NOT AVAILABLE AS PRECEDENT, AND THE FILE SAYS WHICH GROUNDS MAY BE CITED

`/sahyog` renders the **full name** under **D10** — ⚠ and **D10 is AUTHOR-RULED and ⛔ NOT
Panel-ratified.** `deferred-work.md` 11b.1 item **(e)** records it as *"authorised, ⛔ NOT made"*, and
the exception's own rationale says *"⛔ Do not record it as Panel-ratified until it is."*

⭐⭐ **AND THE `scope:` BLOCK PRE-INSTRUCTS THIS RULING, WHICH IS UNUSUAL AND SHOULD BE HONOURED.** It
names, in advance, which of D10's three grounds a third surface may borrow:

> *"⛔ when they do, cite grounds **(1) and (3)** above, ⛔ **never (2)**: ground (2) reasons FROM the
> `/members` baseline, and the same pass that ruled D10 found that baseline **non-compliant with Trust
> Deed cl.15(c)** (which prevails, cl.28, and requires explicit, revocable, purpose-specific consent
> and never default opt-in)."*

⇒ the grounds available to a full-name ruling **on this surface** are:
- **(1)** a shielded name defeats the verification purpose — duplicate full names already need a
  second identifier, so first-name + last-initial is useless for verification;
- **(3)** the shield returns `''` (omit) for **every single-token stored name**, and **mononyms are
  common in India**, so shielding leaves an entire class of deceased members unnamed with no signal.

⛔ **Ground (2) — "it is more protective than `/members`" — may ⛔ not be cited here.** ⚠ Recorded
because it is the ground a reader reaches for first.

## 6. ⚠ A precondition the Panel should know about — the INVERSION, ⛔ already open and ⛔ not re-filed

`resolvePoolIdentity` (`packages/domain/src/notifications/pool-identity.ts:76`) **hard-codes the
shielded form** for the **member-facing** My Pool card, Yogdaan Bahi and notifications (8.6/8.7/8.8).
⇒ after D10 the **public** page already shows **MORE** than the **member app** does for the same
family, and a permissive ruling here **widens that gap to a second surface**.

It sits at `deferred-work.md` 11b.1 item **(e)** with the *"binds 11b.2 and 11b.3"* language.
⛔ **Not re-filed here** — *"two records of one obligation is its own failure."* ⚠ Whether Story
11b.3b **resolves** it is its own decision (**D9**), and resolving it would mean changing the
**member** app's form, which is ⛔ not this surface's act.

## 7. ⛔ What a ruling here does NOT reach

⚠ **11b.6 (In Memoriam) is fenced by the SAME line and is ⛔ NOT covered by this note.**
`matrix.ts:401-402` names 11b.3 **and** 11b.6 together, and reserves *"each surface's OWN Panel
ruling"* — ⇒ a ruling on `sahyog-vivran` **does ⛔ not travel** to In Memoriam, which must seek its own
when it is authored. ⛔ Do not let the pairing in that sentence be read as one permission covering two
surfaces.

## 8. What is put to the Panel

1. **Q1 — the DECLARATION.** Should `sahyog-vivran.deceased_member_name` be added to `matrix.ts:392`'s
   ruled Tier-1 public-exception allowlist?
2. **Q2 — the FORM.** If yes: the **full name** (aligning with `/sahyog`, on grounds (1) and (3) only
   — §5), or **first-name + last-initial** (the form the file currently reserves for this surface)?
   ⚠ **This author's view**, offered as a view: the memorial page is the surface on which ground (3)
   bites hardest — a mononymous deceased member would be rendered **unnamed on the page dedicated to
   them**. ⛔ It is ⛔ not a recommendation on Q1.
3. **Q3 — the CLAUSE SCOPE, and it is ⛔ not a code question (§3).** Counsel's posthumous-disclosure
   clause returns **2026-09-07** under the id `niy.public-disclosure.member-information`. Should the
   Panel ask counsel to scope its text to **the Sahyog Drive index only**, or to **the Trust's public
   transparency surfaces generally**? ⚠ A Q1 "yes" with a narrowly-drafted clause is a ruling with
   ⛔ no instrument, and the surface renders unnamed regardless.

⭐ **A fourth outcome is available and legitimate: rule Q1 "not yet."** Story 11b.3b's **D3(c)** is
*"ship the surface un-named and defer"* — fail-closed, honest, and ⛔ costing nothing to reverse later.
⚠ It must be recorded as a **choice**, ⛔ never as a default ([[feedback_closure_language_precision]]).

## 9. What this note does ⛔ NOT do

⛔ Does **not** rule, ratify, amend or apply anything · ⛔ does **not** add a matrix entry (that is the
ruling being sought, and appending one would **invert the control**) · ⛔ does **not** declare a
surface or a field · ⛔ does **not** re-argue the **contributor** question, which is the 2026-08-30
note's and is ⏳ still open · ⛔ does **not** re-open D10 or the `sahyog-drive` entry · ⛔ does **not**
re-file the inversion (§6) · ⛔ does **not** reach 11b.6 (§7) · ⛔ does **not** propose or draft clause
text · ⛔ does **not** block Stories **11b.3** or **11b.3a**, which are startable today precisely
because the D6(b) split moved this question out of them · ⛔ does **not** advance Row 17 · ⛔ mints
**no** launch-gate roster row · ⛔ does **not** claim this surface is authorised to go live, which
remains a matter of **deployment plus the counsel/Panel process** — ⛔ never a code mechanism and
⛔ **never** the publication kill switch, which is an emergency operational control, default-ENABLED
by design ([[project_directory_launch_gated_on_killswitch_ui]]).

⚠ **And the phrasing rule binds every line above:** *"counsel has not reviewed X"* — ⛔ **never**
*"counsel is not engaged"*, which is **false and has been since 2026-06-21** (`2026-08-24-158`).

---

## Sources — every one read at `79ed41d`

- `packages/contracts/src/public-pages/matrix.ts:388-391` (⛔ adding is a RULING; *"the gate failing is the gate working"*) · `:392-404` (the TWO-entry allowlist) · `:394` · `:403` · ⭐ `:401-402` (the 11b.3 / 11b.6 fence — the sentence this note exists to act on)
- `packages/contracts/src/public-pages/matrix.ts:174-199` — `MatrixFieldSchema.superRefine`, **fail-closed in BOTH directions**: Tier-1-at-`public` without an exception FAILS, ⚠ **regardless of the rendered form**
- ⭐ `packages/contracts/public-pages/public-vs-private-matrix.yaml` — the `sahyog-drive.deceased_member_name` exception's `rationale:` (D10's three grounds) and its **`scope:`** block (*"⛔ does NOT reach Sahyog Vivran (11b.3) or In Memoriam (11b.6) … cite grounds (1) and (3), ⛔ never (2)"*) · `:60` (`pii_tier` is *"a FACT about the data; ⛔ never changed to permit a render"*)
- ⭐⭐ `packages/domain/src/pool/public-read.ts:283-299` (`NAME_PUBLICATION_AUTHORISED` — the member's own `tc_acceptance` pinning the clause) · `:171-175` (the **ruled inert state**; ⛔ do not seed a placeholder `clause_versions` row) · **`:181-183`** (the clause id is **`niy.public-disclosure.member-information`** — ⚠ **GENERAL**, under a Sahyog-Drive-*named* constant; §3's finding)
- `.decision-log.md#decision-2026-08-28-160` **cl.3-5** (the per-data-class basis; the family tick-box DE-AUTHORISED) · **cl.4** (the deceased member's name rests on the member's own T&C) · **cl.7** (clearance lifted for all three 11b surfaces)
- `.decision-log.md#decision-2026-08-28-161` (11b.9 D6(a) — the clause is minted as a **Niyamavali** clause and **pinned**; ⚠ it routes counsel's text through the **Story 2.4 amendment workflow** + a **non-author tone-review sign-off**, ⛔ not a seed script) · `#decision-2026-08-28-162` (the three publication consent types RETIRED, ⛔ not reinterpreted) · `#decision-2026-08-24-159` cl.2 (the `sahyog-drive` entry) · `#decision-2026-08-24-158` (counsel engaged since 2026-06-21)
- `_bmad-output/planning-artifacts/epics.md:160` (the G3 note excluded *"deceased-member names on Sahyog Vivran"* from the `-135`/`-136` scope, in terms) · `:4956-5015` (Story 11b.3's ACs — ⚠ **STALE**; the 11b.3 story file's top box records why)
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-08-30-contributor-name-public-tier.md` — the **model** for this note, and the **separate** question set (⛔ not re-argued here) · `trustee-panel-routing-note-2026-08-28-11b3-publication-basis-and-matrix.md` **§11** (the *"⛔ not added now — a pre-added entry is a standing permission with ⛔ no subject"* timing rule this note preserves)
- `_bmad-output/implementation-artifacts/deferred-work.md` — 11b.1 item **(d)** (the BASIS routing) · item **(e)** (D10 *"authorised, ⛔ NOT made"*, and the inversion). ⚠ **Cite the ITEM LETTERS, ⛔ not line numbers** — 11b.2's prepended section shifted every 11b.1 anchor down by 192, so older line citations point short.
- `_bmad-output/implementation-artifacts/11b-3b-sahyog-vivran-named-identity-render-layer.md` — **D3** (this question, with options (a)/(b)/(c)) · Task 0 (which owes this packet) · `11b-3-…md` D6 (the split, and why it moved this question here)
- ⭐ `packages/domain/src/schema/claims.ts:127` (`deceased_member_id` — `notNull()`, branded **`MemberId`** ⇒ the deceased is always a member; §1) · `packages/domain/src/schema/claim_nominee_bank_accounts.ts:7-11` (*"⛔ NO holder-name-must-match-nominee linkage of any kind"* — the account holder is ⛔ not necessarily a nominee) · `packages/contracts/src/public-pages/sahyog-drive.ts:88-98` (`deceasedMemberName` — resolved through `resolvePublicMemberName`, ⛔ NEVER `resolvePoolIdentity()`)
- `packages/domain/src/notifications/pool-identity.ts:76` (`resolvePoolIdentity` — the hard-coded shielded MEMBER-facing form; §6's inversion)
- Memory: [[feedback_closure_language_precision]] · [[feedback_supersede_never_reinterpret]] · [[project_11b_consent_model_c5_superseded]] · [[project_dpdpa_counsel_engaged_but_unrecorded]] · [[project_directory_launch_gated_on_killswitch_ui]] · [[project_death_is_an_overlay_not_a_state]]


---

# Appendix A — In plain words

*Added 2026-09-02 for the Panel. ⛔ Nothing here is new — it is §1–§9 above, without the technical
detail. Where the two differ, the sections above govern.*

## What the two pages are

| | What it is | Does it show the member's name today? |
|---|---|---|
| **The Sahyog Drive list** | One line per drive. Anyone on the internet can see it. It exists so a stranger can check the Trust really moves money to families. | ✅ **Yes — the full name.** Already decided. |
| **The Sahyog Vivran page** | **One page for one drive** — the page about that one family's loss. **This is the page we are asking about.** | ⛔ **No. It cannot show the name at all.** |

## The problem, in one sentence

**The list can name the member who died. The page about that member cannot name them at all.**

So a visitor would see the name on the summary list, click through to the page dedicated to that
person, and find the name gone.

## Why that happened

Publishing a person's name on a public page needs a permission granted **once, by name, for that
specific page**. The Panel granted it for the **list**. Nobody ever granted it for the **page** —
it was simply never noticed until now.

⛔ **We cannot grant it ourselves.** The rule written into the system says each page needs **its own
Panel decision**. The system is deliberately built to refuse until it gets one, and it is refusing
correctly.

## ⚠ One thing that is easy to get wrong

This is **not** a question about *how much* of the name to show.

Showing **"Ramesh Kumar"** and showing **"Ramesh K."** both need the **same permission**. Shortening
the name does **not** avoid the decision. So there are two separate questions: *may we show it at
all*, and *in what form*.

## Whose name are we talking about?

**The member who died** — the colleague the drive was run for. Three different people's names appear
around these pages, and only the first is this note's subject:

| Whose name | Is it this note's subject? |
|---|---|
| **The member who died** | ⭐ **Yes — this note.** |
| The family member whose bank account receives the money | ⛔ No — a separate question, not decided here |
| The colleagues who contributed | ⛔ No — a separate note already with you (30 August) |

## What we are asking you

1. **May the page show the name of the member who died?** Yes / No / Not yet.
2. **If yes — in what form?** The full name (matching the list), or first name + last initial?
3. **A question of timing about our lawyer's wording** — explained just below.

## Question 3, in plain words — and why this note comes now

The permission to publish rests on a rule **the member themselves accepted when they joined**. Not
the family's permission — the member's own. **Adv. Mohit Agrawal is writing that rule now and sends
it on 7 September.**

The wording matters more than it sounds:

- If he writes *"may be published **on the Sahyog Drive list**"* — then **even if you say yes, nothing
  changes.** The page still shows no name, because the member's own rule wouldn't cover that page.
- If he writes *"may be published **on the Trust's public pages**"* — then a yes works **immediately**,
  with no further work.

⭐ **That is the only reason this note comes before the 7th rather than after.** You may want to tell
him which of the two to write.

## What happens with each answer

| Your answer | What follows |
|---|---|
| **Yes, full name** | The page names the member, matching the list. Needs the wording in Q3 to be the broad one. |
| **Yes, first name + last initial** | The page names the member in short form. ⚠ See the mononym point below. |
| **Not yet / No** | The page ships **without** the name. ⛔ Nothing breaks — everything else on the page still works. It can be revisited at any time, and it costs nothing to change later. |

## ⚠ Three things worth knowing before you decide

1. **Many people have only one name.** For them, "first name + last initial" produces **nothing at
   all** — so those members would appear **unnamed on their own memorial page**, with no explanation
   shown to the reader.
2. **The member app currently shows *less* than the public page does**, for the same family. Saying
   yes here widens that gap. It is already recorded as a separate open item and is ⛔ not something
   this note asks you to fix.
3. **One argument is off-limits, and we are flagging it ourselves.** When the Panel allowed the full
   name on the list, it gave three reasons. Two of them may be reused here. The third —
   *"it is more protective than the member directory"* — may **not**, because that directory was
   itself later found not to meet the Trust Deed's consent requirement. ⛔ Please do not treat the
   directory as a benchmark.

## What this note does not do

⛔ It decides nothing — it only asks · ⛔ it does **not** cover the **In Memoriam** page, which is a
separate page needing its own decision when it is built · ⛔ it does **not** cover contributor names
(the 30 August note) · ⛔ it does **not** re-open the decision already made about the list · ⛔ and it
publishes nothing: **built is not published**, and no page goes live to the public on the strength of
this note.

## If you want to answer

Answering **Q1** and **Q2** is enough to unblock the work. **Q3** is a message to counsel rather than
a decision, and can follow separately — but it is time-bound to **7 September**.
