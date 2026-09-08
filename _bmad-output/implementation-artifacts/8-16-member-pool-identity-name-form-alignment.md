---
baseline_commit: 79ed41dc
---

<!--
⭐ BASELINE — `Merge pull request #218 … governance/11b-2-validate-split` (2026-09-01). Carries
`2026-09-02-179` cl.3, `-180` (Trustee-ratified) and `-181`.

⚠⛔ **THE "verified live at `79ed41d`" TABLE WAS READ HERE, AND HEAD IS NOW `091c3bfe` (2026-09-08)
— 150 COMMITS AND 161 CODE FILES LATER.** ⭐ Re-verified at the 2026-09-08 validate: the blast radius
moved barely at all (`active-contribution-card.ts` +27 from 11b.10; `pool-contributor-list.ts` +14),
and ⭐ every Trap-4 / Trap-5 behavioural claim re-verified TRUE at HEAD. ⛔ But three citations drifted
— see the table. ⛔ Do ⛔ not re-date the table without re-reading it.

⭐ **SECOND VALIDATE — 2026-09-08, three independent verifiers, HEAD `c73887fe`** (4 governance/doc
commits past `091c3bfe`: `949a01ea` `43dfe2e6` `edfb3975` `c73887fe` — ⛔ **zero production code**).
Every behavioural claim, the inverted-premise finding (Preflight STOP 2) and the AC2/AC5 justifications
re-verified TRUE at HEAD; ⛔ no seed / migration flipped the inert-basis finding. Findings were
citation-precision and AC-scope only — applied in v0.8; see the Change Log.
-->

# Story 8.16: Member-Facing Pool Identity — Name-Form Alignment (closing the public/member INVERSION) `[SURFACE]`

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

> ⭐⛔ **THIS STORY IS ⛔ NOT IN `epics.md`'s STORY LIST.** It is minted **by Panel direction** —
> `2026-09-02-179` **cl.3**: *"the public/member inversion gap shall be closed."* ⛔ A future
> `sprint-planning` run must ⛔ not drop it.
>
> ⭐ **WHY EPIC 8 AND ⛔ NOT EPIC 11b.** Epic 11b *surfaced* the inversion; **Epic 8 owns the code** —
> `resolvePoolIdentity` and all four of its consumers are Stories **8.6 / 8.7 / 8.8**. ⚠ This follows
> the **`7-11` precedent** verbatim: that story was *"minted against **Epic 7**, whose Story 7.5 owns
> the **write path** — ⛔ not against Epic 10, whose 10.13 owns only the setter surface."*
> ⛔ And it discharges **`INV-owner`**: *"a directive naming an **EPIC** expires unowned"*
> ([[project_r7_fact_producer_unbuilt]]) — this names a **story key that exists in
> `sprint-status.yaml`**.

> ✅✅ **BOTH DECISIONS ARE RULED — TASK 0's STOP GATE IS DISCHARGED. ⭐ THIS STORY IS STARTABLE.**
>
> | Decision | Question | Whose |
> |---|---|---|
> | **`INV-scope`** | Do **all four** consumers rise, or only the in-app two? | ✅ **ALL FOUR** (`2026-09-02-180`) |
> | **`INV-form`** | Hard-coded, or **mode-resolved**? | ✅ **MODE-RESOLVED** (`2026-09-02-181`) |
>
> ⭐⭐ **`INV-scope` IS RULED: ALL FOUR** (Kalpana Bharti, Dhiraj Rahul). ⇒ the inversion **CLOSES**,
> ⛔ it is ⛔ not narrowed; the resolver's *"one identity everywhere"* property is **PRESERVED**; and
> ⛔ **no split is authorised** — a future story that divides the consumers is **reversing `-180`**,
> ⛔ not optimising.
>
> ⭐⭐ **`INV-form` RULED MODE-RESOLVED** — the member side reads the **same stored per-Pariwar mode**
> the public side reads. ⇒ **the two forms can ⛔ NEVER diverge again BY CONSTRUCTION**, which is a
> stronger guarantee than *"they match today"*.
>
> ⛔⛔ **AND IT CARRIES ONE TRAP THAT WOULD SILENTLY BREAK A MEMBER SURFACE — read Trap 5 before Task 2.**
> ⛔ `resolvePublicMemberName` may ⛔ **NOT** be reused verbatim: it **OMITS mononyms**, and the member
> side must ⛔ not.

---

## ✅ PREFLIGHT — **BOTH STOPS DISCHARGED. ⭐ THIS STORY IS STARTABLE.**

⭐ Both were found at the 2026-09-08 `validate` pass (three independent verifiers) and **both were
discharged the same day** — **STOP 1** by `#decision-2026-09-08-208`, **STOP 2** by
`#decision-2026-09-08-209`.
⚠⛔ **⛔ KEPT AS THE RECORD, ⛔ not deleted** — they are why the story's scope and its member-facing
sentence read as they do. ⛔ A later reader must ⛔ not "restore" what either of them removed.
⚠ The story's own **Task 0 STOP** (governance first, ⛔ no code before the `governance:` commit) is
⛔ unaffected and still binds.

### ✅ STOP 1 — ⭐ **DISCHARGED 2026-09-08 by `#decision-2026-09-08-208`.**

⭐⭐ **`11b-16` IS WITHDRAWN** (`-208` cl.1) — it ordered the same edits at a **narrower** scope
(three of four consumers) and is now terminal. ⇒ ⛔ **the two-story collision is closed**; `8-16`
owns this work alone.

⭐ **AND THE CLAUSE THIS STORY DEPENDED ON HAS LANDED.** `-208` **cl.2** declares `-198`'s push
carve-out — follow-up (i) **and** the body sentence *"story G MUST NOT flip the shared resolver
globally … the push path keeps the shielded form until ruled otherwise"* — ⛔ **VOID**, ⛔ not
superseded: an author-committed entry never held authority to narrow Trustee-ratified `-180` cl.1.
⇒ ⭐ **AC2's ALL-FOUR scope stands unopposed**, and the repo no longer holds a live sentence telling
a dev the opposite.

⭐ **WHAT `-208` ROUTED INTO THIS STORY** (cl.3, cl.5, cl.6) — ⛔ all already applied below:
`-198` **cl.1** (FORM ONLY) → **AC4b** · `-189` **cl.3** both directions → **AC4b** + Task 4 ·
`-195` **cl.1** compliance → **AC4b** · the sequencing → ⭐ **`8-16` runs before `11b-15`**.

⚠ **⛔ THE `epics.md:5128` RANGE + THE `11b-11:818` F/G MIS-KEYING ALREADY LANDED** in commit
`949a01ea` (2026-09-08, the same commit that created `-208`): `epics.md`'s six-story-split block now
carries the `-208` cl.6 correction (the six are `11b-11`…`11b-15` **PLUS `11b-17`**; story F is
`11b-17`, ⛔ not `11b-16`), and `11b-11:818` is **recorded-not-edited** per `-208` cl.6. ⇒ ⛔ **Task 0
does ⛔ NOT owe this** — it owes only the new `### Story 8.16` section and the FR-21 supersession.

✅ **AND THE ONE INCONSISTENCY IS RESOLVED.** `-208` cl.7 carried a knowingly-false row
(`11b-16: ready-for-dev`) because no `withdrawn` value existed and minting one is a **ratified
governance act**. ⭐ The Panel **minted it** on 2026-09-08 (`#decision-2026-09-08-210` cl.1) ⇒
`11b-16` now reads **`withdrawn`**, and ⛔ nothing about this story rests on prose any more.

### ✅ STOP 2 — ⭐ **DISCHARGED 2026-09-08 by `#decision-2026-09-08-209`. ⛔ THE FINDING BELOW STANDS.**

⭐ **BigDev confirmed the re-grounded framing, and supplied the wording** (`-209` cl.1). ⇒ ⭐ the
three-part logic: **what you see** → **why your Pariwar sees it** → **why that does ⛔ not imply
public disclosure.**
⚠⛔ **And the consequence is ⛔ not softened** (`-209` cl.2): on ship, a contributing member on a
Pariwar in the **default `full_name`** mode will see a **full legal name that ⛔ NOBODY can see
publicly**. ⭐ That is the decision, ⛔ not a side effect.
⛔ The old justification (*"the same name anyone can already see on the public page"*) is ⛔ **NOT
available and must ⛔ not return** (`-209` cl.3).

⇒ ⭐ **the finding that follows is retained verbatim as the RECORD of why** — ⛔ it is no longer a gate.

#### ⛔ The finding (retained): the ORIGINAL premise was inverted on every drive

⛔ The Story statement and the Policy-meaning sentence both say the app shows the member **LESS**
than the public page. ⭐ **Verified live at HEAD: the opposite is true, universally.**

⭐ The public name is gated by `NAME_PUBLICATION_AUTHORISED` (`public-read.ts:380-397`), whose basis
is the member's **own** `tc_acceptance` pinned to clause `niy.public-disclosure.member-information`.
⛔⛔ **That clause id appears at exactly ONE site in the entire codebase — its own definition
(`public-read.ts:261`).** ⛔ No migration, ⛔ no seed, ⛔ no production writer pins it. The code says
so itself (`public-read.ts:855-858`):

> *"⚠⭐ **`false` FOR EVERY ROW IS THE EXPECTED DAY-ONE STATE**, ⛔ not a fault: until a
> `clause_versions` row … exists AND is pinned into a T&C version, **nothing can satisfy the basis.**
> The surface is INERT, ⛔ not broken."*

⇒ ⭐ **today the public `/sahyog` page shows ⛔ NO deceased name on ANY drive, while the member app
shows `"Rajesh K."`.** The app already shows **MORE**.

| Case | Public today | Member today | After this story | Premise |
|---|---|---|---|---|
| Basis **absent** — ⭐ **every drive today** | ⛔ **no name** | `Rajesh K.` | **full legal name** | ⛔ **INVERTED** — this story WIDENS |
| Basis satisfied, mode `full_name` | `Rajesh Kumar` | `Rajesh K.` | `Rajesh Kumar` | ✅ the only case the premise describes |
| Mononym, `shielded_name` | `''` ⇒ row unnamed | whole stored name | whole stored name | ⛔ INVERTED (Trap 4 half-sees this) |

⇒ ⛔ **STOP and confirm the framing with BigDev.** ⭐ The story's **structural** purpose survives
untouched — when the basis becomes satisfiable the public rises to full names and the member would
still be shielded — ⛔ but the member-facing sentence is **false as written**, and it is the sentence
that would be quoted **to a member**. ⭐ The correct ground is already written, at `-198` cl.1: *"the
publication basis governs publication to the **WORLD**, ⛔ not what a mutual-aid group is told about
the family it is being asked to help."*

---

## Story

As a **contributing member** opening my pool,
I want to see the family I am supporting named in **the form my Pariwar has chosen** for that name,
so that the Trust is not in the position of shielding a name from the people who are paying for the
funeral while publishing it to everyone else.

⚠⛔ **⛔ THE "I WANT" CLAUSE CARRIED THE SAME FALSE COMPARISON, ⛔ ONE LINE UP** — it read *"named the
**same way a stranger sees them named** on the public Sahyog Drive page"*. ⭐ Re-grounded
(`-209` cl.2 context): ⛔ a stranger sees **nothing** today. ⚠ Third instance of one defect —
⛔ recorded, ⛔ not silently edited.

⚠⛔ **⛔ THE OLD BENEFIT CLAUSE WAS FALSE AND IS REMOVED.** It read *"the app never tells me less about
my own Pariwar's drive than it tells the internet"* — ⛔ but **today the app tells the member MORE**
(Preflight STOP 2: the basis is unsatisfiable, so the public page names ⛔ nobody). ⭐ What this story
closes is a **STRUCTURAL** inversion that bites the moment the basis becomes satisfiable — ⛔ not one a
member can observe today.

---

## 📜 Policy meaning (AI-10-1, CONFIRMED BigDev 2026-08-18)

**This story introduces ⛔ NO predicate that gates a member's access to a benefit.** It changes a
**presentation form** — which name string is rendered — and ⛔ touches ⛔ no eligibility, ⛔ no
assignability, ⛔ no contribution duty, ⛔ no `members.state`, ⛔ no `is_valid`, ⛔ no moderation
overlay. ⚠ Stated explicitly because *"an absent note is indistinguishable from an unasked question."*

**What it means to the member, in their terms:**
*"When you open your pool, you will see the name of the colleague whose family you are supporting,
in whatever form your Pariwar has chosen for that name — instead of a first name and an initial."*

⚠⛔ **⛔ THE PREVIOUS SENTENCE WAS FALSE FOR EVERY DRIVE IN THE SYSTEM AND IS ⛔ NOT RESTORED.** It
read *"the same name anyone can already see on the public page. Until now the app showed you less
than the public page did."* ⛔ **Nobody can see that name on the public page** — the publication basis
is unsatisfiable today (Preflight STOP 2, `public-read.ts:855-858`), so the public renders ⛔ no name
at all and the app already shows **more**. ⭐ This is the sentence a member would be shown; ⛔ it may
⛔ not claim a public disclosure that does not exist.

**The ground, in the member's terms:**
*"Your Pariwar can see this name because you are contributing to this drive. Public display is a
separate decision governed by the applicable publication basis."*

⭐ **THREE-PART LOGIC, and it is why the wording holds:** ⇒ **what you see** → **why your Pariwar
sees it** → **why that does ⛔ not imply public disclosure.** ⚠⛔ The third part is load-bearing: it
is what stops a member — or a later reader — inferring a public exposure that ⛔ does not exist.
⭐ The governing clause behind it (`2026-09-04-198` cl.1): the publication basis governs
**publication to the WORLD**, ⛔ not what a mutual-aid group is told about the family it is being
asked to help.

⚠⛔ **⛔ AND ⛔ NOT "the FULL name" — the word was DROPPED, deliberately.** ⭐ A Pariwar on
`shielded_name` will ⛔ **not** see a full name, so *"the full name … in whatever form your Pariwar
has chosen"* ⛔ contradicted itself. ⇒ ⭐ **"the name … in whatever form your Pariwar has chosen"** is
true in **both** modes.

✅ **Checked against the Niyamavali:** it governs eligibility, contribution duty and adjudication —
⛔ **it says nothing about the FORM of a name on a member surface.** Per
[[feedback_niyamavali_rulebook_not_spec]] its silence is ⛔ neither a blocker nor authority.
⚠ **Result: no amendment is owed.**

⚠⛔ **AND THE ⛔ NON-PREDICATE, because this story renders a DEAD person's name to LIVING members:**
⛔ nothing here may read `members.state`, and ⛔ **death is an overlay, ⛔ not a lifecycle state**
([[project_death_is_an_overlay_not_a_state]]). ⛔ Do ⛔ not add a "deceased" predicate to gate the form.

---

## 🎯 What already EXISTS — ⚠ read at `79ed41d`, **RE-ANCHORED at HEAD `091c3bfe` (2026-09-08)**

⚠⛔ **THREE CITATIONS HAD DRIFTED.** ⭐ The behavioural claims all re-verified TRUE; only the anchors
moved. ⛔ Corrected in place below — ⛔ do not restore the old numbers.

| Story's citation | State at HEAD | ⭐ Correct anchor |
|---|---|---|
| `sahyog-drive.ts:96` (AC4 + References) | ⛔ **STALE** — `:96` is now `PublicSahyogDriveStatus`, an unrelated enum 11b.14 amended | the *"⛔ NEVER through `resolvePoolIdentity()`"* sentence is **`:128`**; the field is `deceasedMemberName` **`:130`** |
| `pool-identity.ts:120-127` (⭐ was at **three** sites — EXISTS table, Trap 2, References; all corrected v0.8) | ⚠ off-by-one **and mis-aimed** — Trap 2's claim is about the **interface** | shape **`:40-41`**; producer **`:122-123`** |
| `contribution-note.ts:137` (AC3) | ⚠ literally correct but **misleading** — `:137` is a *comment* header, ⛔ not a field | the fields are **`:118`, `:120`** |


| Thing | State | Where |
|---|---|---|
| `resolvePoolIdentity` — the **ONE** place the join lives | ✅ **LIVE**, **hard-codes the SHIELDED form** | `packages/domain/src/notifications/pool-identity.ts:76` |
| ⭐ It emits **PARTS**, ⛔ never a joined string | ✅ returns `deceasedFirstName` + `deceasedLastInitial` **separately** (shape `:40-41` · producer `:122-123`) ⇒ **the join lives in each consumer** | same file |
| **FOUR** consumers — ⚠ **TWO LEAVE THE APP** | ✅ ① My Pool card (8.6) · ② Yogdaan Bahi (8.6) · ⚠ ③ **Contribution Note PDF** (8.7) · ⚠⚠ ④ **cycle-open push / WhatsApp / SMS** (8.8, runs in `apps/jobs`) | `pool-identity.ts:1-15` |
| ⭐ The **"two different pools"** design property | ✅ *"A divergence between the push a member receives and the card they open would read to Sushil as **two different pools**, so the resolver moves to `@twt/domain` rather than being duplicated by value."* | same header |
| `resolvePublicMemberName` — the **PUBLIC** form | ✅ **Pariwar-CONFIGURED**: `full_name` is the **DEFAULT, ⛔ not a constant** (`2026-08-19-136` cl.1) | `packages/domain/src/kyc/public-name.ts:73` |
| The public form's **ratification** | ✅ **PANEL-RATIFIED** — `/sahyog` (D10, `2026-09-02-179` cl.2) · `sahyog-vivran` (`-173`) | `.decision-log.md` |
| `splitFirstNameLastInitial` | ✅ the shielding implementation (`-136` cl.2) — ⛔ **not** to be reimplemented | `packages/domain/src/kyc/name.ts` |
| The identity on the **contract** | ✅ `ResolvedPoolIdentity` + the Contribution Note's own reference to the shared resolver | `pool-identity.ts:39`, `packages/contracts/src/contributions/contribution-note.ts:137` |

**⛔ What does ⛔ NOT exist:**

- ⛔ **No full-name field on `ResolvedPoolIdentity`.** It carries **parts only** ⇒ this is a **SHAPE
  change**, ⛔ not a one-line swap. See **Trap 2**.
- ⛔ **No mode-resolution on the member side.** The public side reads a stored per-Pariwar mode; the
  member side has ⛔ none. See **`INV-form`**.

---

## ⛔ THE SEVEN TRAPS

### Trap 1 — ⭐⛔ TWO OF THE FOUR CONSUMERS **LEAVE THE APP**, AND THAT IS THE WHOLE OF `INV-scope`

A public web page is **PULL** — someone must go and look. ⚠⚠ **A WhatsApp/SMS message is PUSH** — it
delivers a deceased person's full name to **every assigned member's handset**, which may be shared.
⚠ **And the Contribution Note is a PDF** a member downloads, keeps, and can forward.

⇒ ⛔ *"the member app rises to match the public"* is ⛔ **not** one change. It is **four**, and two of
them have an exposure profile the public page does ⛔ **not** have.

⛔⛔ **AND SPLITTING THEM RE-CREATES THE DEFECT THE RESOLVER WAS BUILT TO PREVENT** — its own header
says a divergence between the push and the card *"would read to Sushil as **two different pools**"*,
which is **why 8.8 moved it into `@twt/domain`** rather than duplicating it. ⇒ ⭐ **there is ⛔ no
cheap "in-app only" option**; it is a **deliberate re-divergence** with a named cost. → **`INV-scope`.**

### Trap 2 — ⭐⛔ THE RESOLVER EMITS **PARTS**. THIS IS A SHAPE CHANGE ACROSS FOUR CONSUMERS + A CONTRACT

`ResolvedPoolIdentity` carries **`deceasedFirstName`** and **`deceasedLastInitial`** as *separate*
fields (shape `:40-41` · producer `:122-123`), and **each consumer joins them**. ⇒ moving to a full
name means **changing what the resolver returns**, ⛔ not editing one string.

⛔ **Do ⛔ NOT "solve" it by stuffing the surname into `deceasedLastInitial`.** That field's name would
then lie, every consumer's join would silently produce the right output for the wrong reason, and the
next reader would find a field called *last **initial*** holding *"Kumar"*.

⭐ **The parts-not-joined shape is the SAME discipline 11b.2's presenter uses** (`-168` cl.6, D9(a) —
*"emits name PARTS and ⛔ never joins them, precisely so ⛔ nothing in it decides the form"*).
⚠ ⇒ **the form decision belongs at the render layer there, and the same question arises here** — so
whatever shape lands must keep the **form decidable**, ⛔ not bake it into the resolver.

### Trap 3 — ⚠⛔ "ALIGN WITH THE PUBLIC FORM" ⛔ DOES NOT MEAN "HARD-CODE THE FULL NAME"

The **public** form is **Pariwar-CONFIGURED** — `full_name` is the **DEFAULT, ⛔ not a constant**
(`2026-08-19-136` cl.1), and `-136` cl.1 is a **testable requirement**: *"a build in which the public
name form cannot be changed without a code change **FAILS this clause**."*

⇒ ⛔⛔ **if the member side hard-codes `full_name`, then a Pariwar that switches its public mode to
`shielded_name` gets a NEW INVERSION — pointing the other way.** The member app would show **MORE**
than the public page. ⭐ **That is the very defect this story exists to remove**, re-created by the fix.

→ **`INV-form`.** ⚠ ⛔ Applying cl.1 to the *member* side is an **inference** (its subject is the public
directory) — ⛔ it is **raised**, ⛔ not assumed ([[feedback_supersede_never_reinterpret]]; the
`2026-09-02-175` warning).

### Trap 4 — ⚠ MONONYMS ALREADY RENDER IN FULL ON THE MEMBER SIDE, SO PART OF THE "INVERSION" IS ⛔ NOT REAL

`splitFirstNameLastInitial` returns `lastInitial: ''` for a single-token name, and
`resolvePoolIdentity` returns the identity anyway (it only bails when `firstName === ''`). ⇒ for a
**mononymous** deceased member the member app **already renders the entire stored legal name**.

⭐ **Mononyms are common in India** — this is ⛔ not a corner case (`2026-08-21-145` cl.3 ruled exactly
this point for the directory, where the consequence was the opposite: the shield silently did nothing).
⇒ ⚠ **for that class there is ⛔ no inversion today**, and this story must ⛔ not report closing one.
⛔ Do ⛔ not "fix" the mononym path — ⛔ it is not broken here.

### Trap 5 — ⛔⛔ `resolvePublicMemberName` MAY ⛔ NOT BE REUSED VERBATIM — IT **OMITS MONONYMS**

⭐ **The obvious move after `INV-form(a)` is to call the public resolver directly** — same modes, same
shielding helper, one function. ⛔ **It would silently break a member surface.** Verified live:

| | `shielded_name`, mononym (single-token name) |
|---|---|
| `kyc/public-name.ts` (**public**) | returns **`''`** — callers treat it as **"omit this row"** (ruled `2026-08-21-145` cl.3: *"a shorter page beats an unshielded name on a page that promises shielding"*) |
| `notifications/pool-identity.ts` (**member**) | returns the identity **with `deceasedLastInitial: ''`** — it only bails when `firstName === ''` |

⇒ ⛔⛔ **reusing the public resolver turns *"show the family's single name"* into *"OMIT THE POOL"*** on
the My Pool card, the Yogdaan Bahi, the PDF **and** the notification. ⭐ **Mononyms are common in
India** — ⛔ this is ⛔ not a corner case.

⭐ **THE RULE:** the two surfaces need the **SAME FORM RULE** and ⛔ **DIFFERENT ABSENCE BEHAVIOUR** —
omitting a row from a public directory is a **privacy protection**; omitting a member's own pool is a
**functional regression**. ⇒ ⛔ **share the MODE, ⛔ never the whole function**
(`2026-09-02-181`).

⚠ ⛔ **And this is exactly the mechanism by which Trap 4 / AC4 would have been violated BY ACCIDENT.**

---

### Trap 6 — ⛔⛔ `familyDisplay` IS SHARED WITH THE **CONTRIBUTING MEMBER'S OWN** NAME

⭐ `apps/api/src/modules/member-pool/note-template.ts:82-84` defines one helper, and it is called
**twice**:

```
:144   const family = familyDisplay(facts.deceasedFirstName, facts.deceasedLastInitial);   // ← the DECEASED
:145   const member = familyDisplay(facts.memberFirstName,   facts.memberLastInitial);     // ← the LIVING member
```

⇒ ⛔⛔ **changing `familyDisplay` in place silently un-shields a LIVING member's own name on a
forwardable PDF** — a PII widening with ⛔ no ruling behind it. `-180` ruled the **deceased family's**
name, ⛔ nothing else.

⛔ **ONLY the deceased's name moves.** `memberFirstName`/`memberLastInitial`
(`contracts/.../contribution-note.ts:123-124`, produced by `resolveOwnName`) stay **shielded**.

### Trap 7 — ⚠ THE PUBLIC SIDE YOU ARE "MATCHING" RENDERS ⛔ NOTHING TODAY

⭐ Preflight STOP 2. ⛔ Do ⛔ not write a parity test that reads the public producer and asserts
equality without **seeding the basis** — it will compare against `null` and pass **vacuously**.

⇒ ⭐ a basis-satisfied fixture must be built through `consent_records`(`tc_acceptance`) →
`terms_and_conditions_pinned_clauses` → `clause_versions`
(`niy.public-disclosure.member-information`); helpers at
`packages/domain/tests/integration/_helpers.ts:200,241,267`.
⛔ **A fixture touching `sahyog_drive_publication` proves ⛔ nothing** — `2026-08-28-160` cl.5
de-authorised it and it is **read-never**.

---

## Acceptance Criteria

> ⭐ **AC1 is a RECORD, ⛔ no longer a gate** — both rulings landed 2026-09-02. ⛔ The gate that
> remains is the **PREFLIGHT**, ⛔ not AC1.

### AC1 — Both rulings exist, are cited, and are ⛔ NOT re-opened
`.decision-log.md` carries **`2026-09-02-180`** (`INV-scope` = ALL FOUR, **Trustee-ratified**) and
**`2026-09-02-181`** (`INV-form` = MODE-RESOLVED, BigDev) — ⭐ verified by **reading** them.
**And** ⛔ neither is re-authored, paraphrased or re-grounded here; a divergence between this file and
the log resolves **in favour of the log**, and is reported.
**And** ⛔ no code in this story predates them.

### AC2 — The member-facing form matches the ruled public form, at the ruled scope
**ALL FOUR** consumers render the name in the form `INV-form` rules — ① My Pool card · ② Yogdaan Bahi
· ③ the Contribution Note PDF · ④ the **cycle-open ⭐ AND deadline-reminder** push / WhatsApp / SMS
copy. ⛔ No consumer is excluded; ⛔ no split is authorised (`-180`).
**And** ⭐⭐ the form is **MODE-RESOLVED** from the stored `public_name_presentation_mode` — ⛔ never
hard-coded — read via `kyc.resolvePublicNamePresentationMode(db, pariwarId)`
(`presentation-policy.ts:63-69`, absent row → `full_name`).
**And** ⭐ the mode is an **INPUT** to the resolver, ⛔ **NOT a DB read inside it.**

⚠⛔ **⛔ THE OLD N+1 JUSTIFICATION WAS ⛔ FACTUALLY WRONG AND IS REPLACED.** It read *"the fan-out is
one notification per member ⇒ a read inside the resolver is an N+1 **across the whole fan-out**"*.
⭐ Verified live: `apps/jobs/src/scheduler/contribution-notify-triggers.ts:636-637` —
*"Resolves the pool's member-facing identity **ONCE (⛔ not per member — the join is per pool)**"*;
the single call is `:682-695` and both alert builders close over that one `identity`.
⇒ ⭐ **the true cost of an inside-read is +1 query per POOL**, ⛔ not per member — and on the API side
it is **+1 per distinct pool in the passbook loop** (`handlers.ts:826-857`, memoised per `poolId`).
⭐ **The reason the mode is still an INPUT is the shipped precedent**, ⛔ not a fan-out multiplier:
`public-pages/handlers.ts:168-170` / `:362-364` — *"RESOLVED ONCE PER REQUEST, ⛔ NEVER PER ROW."*

**And** ⛔⛔ `resolvePublicMemberName` is ⛔ **NOT** reused verbatim (**Trap 5**) — ⭐ share the **MODE**,
⛔ never the whole function; the member side keeps its **own** mononym fail-soft.
**And** ⭐ the **DEFAULT** carries across unchanged (`DEFAULT_PUBLIC_NAME_PRESENTATION_MODE =
'full_name'`, `public-name.ts:62`, deliberately ⛔ not fail-closed). ⛔ No new default is introduced.
**And** ⛔ the stored KYC name is ⛔ **NEVER** written by this path — ⭐ a test asserts
`member_kyc_profiles.name_ciphertext` is **byte-identical** across a form change and back
(`-136` cl.2).

### AC2b — ⛔ The FENCES, each with a PROVER
⚠⛔ These were prose in the old AC2 and could ⛔ not fail. ⭐ Each now names what proves it.

| Fence | ⭐ Prover |
|---|---|
| ⛔ The resolver issues ⛔ no `pariwar_public_name_presentation` read | a source-scan test: `resolvePublicNamePresentationMode` appears ⛔ nowhere in `notifications/pool-identity.ts`. ⚠ It is **reachable today** — `:22` already imports `* as kycDomain` |
| ⛔ The mode is read **once per pool**, ⛔ not per member | a call-count spy in `apps/jobs/tests/contribution-notify-triggers.test.ts` |
| ⛔ `resolvePoolIdentity` stays the ONE join site | ⛔ no consumer grows its own name resolution — extend the `packages/ui/tests/contribution-list/forbidden-imports.test.ts:67-71` pattern |
| ⛔ `splitFirstNameLastInitial` is ⛔ NOT reimplemented | ⭐ it **IS** the `shielded_name` implementation (`-136` cl.2); a second one is the *"second identity system"* that clause forbids |

### AC3 — The shape change is explicit, ⛔ no field lies, and it moves ⛔ ALL THREE contracts

⭐⭐ **THE SHAPE IS RULED HERE, ⛔ NOT LEFT TO THE DEV.** ⚠ The old AC gave a prohibition and a
property and ⛔ no shape — three incompatible designs satisfied it. ⇒ ⭐ **adopt: `ResolvedPoolIdentity`
sheds the two parts (`deceasedFirstName` / `deceasedLastInitial`) for ONE resolved display field
`deceasedDisplayName: string`**; ⛔ the parts are ⛔ not kept alongside it (two sources of truth), and
⛔ the mode is ⛔ not handed to consumers to re-join (that grows a second resolution site, against
AC2b).

⚠⛔ **THE IDENTIFIER `deceasedDisplayName` IS ⛔ NOT DECORATIVE — it threads through EVERY site
below and BOTH forbidden-list tests, verbatim.** It is a `deceased*` name (matching the sibling parts
and the public contract's `deceasedMemberName`) and is ⛔ **not** any token the `.strict()` guards
reject (`deceasedFullName` / `deceasedNameCiphertext` / `deceasedName`). ⚠ If a banned-token scan
surfaces a collision, the substitute must still carry the `deceased` prefix, must ⛔ not be a guarded
token, and must be applied **identically** at all sites — ⛔ never a per-file variant.

**And** ⛔⛔ **THREE contracts carry the shielded pair, ⛔ not one:**
`active-contribution-card.ts:124,130` · **`contribution-history.ts:73,77` (⭐ the Yogdaan Bahi —
consumer ②)** · `contribution-note.ts:118,120`. ⛔ Changing one leaves the other two lying — each
sheds its pair for `deceasedDisplayName`.
**And** `ResolvedPoolIdentity` (`notifications/pool-identity.ts:40-41`) moves with them — the two
part-fields become the one `deceasedDisplayName`.

**And** ⚠⛔ **THREE `.strict()` PII GUARDS FORBID THE OBVIOUS FIELD NAME.**
`packages/contracts/tests/contributions.test.ts:102`, `:478`, `:716` each assert `deceasedFullName` is
**REJECTED**. ⇒ amending them is **part of this story** and must cite `-180` — add
`deceasedDisplayName` to each guard's `VALID_*` fixture (it is ⛔ not a guarded token).
⛔⛔ **`memberFullName` stays forbidden where it is already asserted — the `:478` guard (`:480`) and
the `:716` guard (`:715`).** ⚠ The `:102` **card guard has ⛔ no member-own-name field** — its
rejection list is `deceasedNameCiphertext` / `deceasedFullName` / `nomineeName` / `nomineeBankAccount`
only. ⛔ Do ⛔ not add `memberFullName` to it; that is the **contributing member's** name and is
⛔ out of scope (**Trap 6**).

**And** ⛔ **Trap 6 holds:** `note-template.ts:82` `familyDisplay` is shared with the living member's
name at `:145`. ⛔ Do ⛔ not change it in place.

**And** ⭐ **`openapi/v1.yaml` is RE-EMITTED**, ⛔ never hand-edited — `pnpm contracts:emit-openapi`.
⚠ Only `ContributionHistoryResponse` is affected (`:2528`, `:2531`, required `:2564-2565`).
⛔⛔ **The `contracts-determinism` gate (`scripts/ci-local.sh:63`) FAILS THE PUSH otherwise.**

**And** ⚠ `apps/jobs` cannot import `apps/api` — the resolver lives in `@twt/domain` for that reason.
**And** ⛔ `packages/contracts` must never import `@twt/domain`'s pg-touching namespaces
([[project_contracts_domain_bundle_boundary]]) — ⭐ a test, ⛔ not a hope.

### AC4 — ⛔ What this story does ⛔ NOT change
⛔ The **PUBLIC** surfaces are ⛔ not touched — `/sahyog` and `/sahyog-vivran` render through
`resolvePublicMemberName`, ⛔ never `resolvePoolIdentity`. ⭐ **Already pinned by a live test the story
never named:** `apps/api/tests/integration/public-pages/sahyog-drive.spec.ts:558`.
**And** ⛔ no Tier-1 tier change, ⛔ no `public-vs-private-matrix.yaml` row, ⛔ nothing added to
`RULED_TIER1_PUBLIC_EXCEPTIONS` — ⭐ these are **authenticated** surfaces.
**And** ⛔ the **PUBLIC-side** mononym path is ⛔ not "fixed" (Trap 4). ⚠⛔ **Disambiguated:** the old
text said only *"the mononym path"*, which reads as forbidding the **member-side** handling Task 4
orders you to **test**.
**And** ⛔ no decrypt is added anywhere new.
**And** ⛔ `public_name_presentation_mode` is ⛔ **NOT renamed** (`-181`).
**And** ⛔ the resolver's **fail-soft posture** is unchanged — an unresolvable name / decrypt failure /
bad pool index **omits THIS pool**, ⛔ never throws.

### AC4b — ⛔⛔ THE PUBLICATION **BASIS** IS ⛔ NOT ADOPTED (⭐ inherited from the withdrawn `11b-16`)
⭐ `2026-09-04-198` **cl.1**: the member path takes the configured **FORM** and ⛔ **not** the
publication **BASIS** gate. ⇒ ⭐ **a member sees a name ALWAYS.**

⚠⛔ **⛔ THIS DOES ⛔ NOT COMPLY BY SILENCE.** `INV-form` says the member side *"reads the same stored
mode the public side reads"* — a dev told to mirror the public side has ⛔ nothing distinguishing its
**form** from its **basis gate**. `-197` follow-up (i) records the wrong reading as
**⛔⛔ A REGRESSION**: *"it would leave the contribution card unable to say who died, on the screen
that asks the member to pay."*

**And** ⭐ **`-189` cl.3 is PROVEN IN BOTH DIRECTIONS** (Trustee-ratified: *"⭐⭐ A MEMBER MUST SEE MORE
THAN THE PUBLIC, AND ⛔ NEVER LESS"*) — a test asserts a member sees the configured name on a drive
with ⛔ **no** basis while the public sees ⛔ none, **and** string-equality where the basis **holds**.
⚠ Per **Trap 7**, the basis-satisfied half is the load-bearing one and passes vacuously if the fixture
is wrong.
⚠⛔ **⛔ cl.3 IS ⛔ NOT A UNIVERSAL RULE — ⛔ do ⛔ not generalise it.** `2026-09-04-195` **cl.1**
(Trustee-scoped) confines it to *"the **drive data class** … and every surface in the six stories
below"* — the 11b split (`11b-11`…`11b-15`, `11b-17`); ⛔ `8-16` is ⛔ not one of them. It reaches
this story **only** through `-208` **cl.5(b)**, which routes `-189` cl.3 (both directions) into `8-16`
as `11b-16`'s residue — and ⚠ `-208` is **author-committed (BigDev), ⛔ not Trustee-ratified**.
**And** ⭐ compliance with `-189` cl.3 is **STATED** — `2026-09-04-195` cl.1: *"each must state its
compliance."*

### AC5 — Accessibility, i18n, and the paid-channel cost
Every `t()` passes an explicit **namespace** — ⚠ it is the **third argument, an options object**
(`t(key, params, { locale, ...NS })`, live shape at `contribution-notify-triggers.ts:308-309`), ⛔ not
a positional string. It defaults to `common` and **THROWS**.

**And** ⭐ the name reaches copy through the **existing `{family}` interpolation param** — ⛔ **NO new
locale key is minted.** Six keys, parallel in **both** locales
(`packages/i18n/locales/{en,hi}/contribution.json`): `active_contribution.family_parichay` `:7` ·
`.tone.closing` `:13` · `.tone.closing_a11y` `:14` · `notify.cycle_open.body` `:84` ·
`notify.deadline.day_14.subject` `:91` · `yogdaan.row_a11y` `:248`.
**And** ⭐ the **Hindi** arm moves with the English one — ⚠ two of the six are **a11y** strings, so
AC5's a11y and i18n obligations are the **same keys**.
**And** ⛔ money keeps **Latin** numerals in the Hindi UI (amendment-A2) — already
`formatCurrency(…, 'en')` at `contribution-notify-triggers.ts:305`. ⛔ Unchanged here.

**And** ⭐ the a11y family-13 checks hold in **React-Native** form on the two components this story
touches — `apps/mobile/components/active-contribution/ActiveContributionCard.tsx` and
`components/yogdaan-bahi/YogdaanBahiRow.tsx`. ⚠ **The failure mode, documented in this repo four
times:** a tamagui `<Button>` is `styled(View, …)` and supplies `accessible` **nowhere** — an RN
`View` is ⛔ **not** an accessibility element without `accessible={true}`, so the inner `<Text>` takes
focus and the label is ⛔ not announced.

**And** ⚠⛔ **THE SMS SEGMENT COUNT IS MEASURED AND RECORDED** — for **both** locales and **both**
alert kinds — against the **correct** ceiling:
⭐ **GSM-7 = 160 / 153 concatenated · UCS-2 (Devanagari) = 70 / 67.**
⚠⛔ **⛔ THE OLD "160-character segment" FIGURE WAS THE WRONG ONE FOR THE LAUNCH LOCALE.** Hindi forces
UCS-2, and `hi/contribution.json:84` is **~94 template characters before interpolation** ⇒ it is
**already multi-segment today, at any name length**. ⇒ the artefact is *"segments **before → after**"*,
⛔ never *"does it fit"*.
**And** ⛔ exceeding is ⛔ **not** a reason to narrow a ruled scope (`-180`) — ⭐ if the rise exceeds
**one segment** on any (locale, kind) pair it is **ROUTED**, ⛔ not absorbed silently.
**And** ⚠⛔ SMS is reached when **push fails** ⇒ the full name lands in an **unencrypted** SMS
precisely for members whose app is not working. ⛔ Recorded as a **precision** — the Panel ruled with
all three channels named — ⛔ **not** grounds to revisit.

### AC6 — What is routed, and what is CLOSED
`deferred-work.md` **11b.1 item (e)** is amended in place. ⭐ `INV-scope` ruled ALL FOUR ⇒ this
resolves to **CLOSED**, ⛔ never *"resolved via deferral"* ([[feedback_closure_language_precision]]);
⛔ the NARROWED branch does ⛔ not arise (**Q2 VACATED**, `-180` cl.3).

**And** ⚠⛔ **CLOSED ⛔ ON SHIP, ⛔ NOT ON RULING** — ⭐ split in two, because a `dev-story` run ends at
`review`, ⛔ before merge: **(a) in-run**, item (e) is edited to *"⏳ **CLOSING** — the closing edit is
made by `8-16`, at `review`. ⛔ Not closed until it merges"*; **(b) post-merge**, the closure is
recorded. ⛔ An AC satisfiable only at merge, with nobody assigned, is how item (e) stays open forever.

**And** ⛔⛔ **ITEM (e) IS REFERENCED AT THREE SITES IN `deferred-work.md`, NOT ONE — ⛔ CLOSING ONE
LEAVES THE FILE SELF-CONTRADICTORY** (the *"two records of one obligation is its own failure"*
posture, `2026-09-02-176` D7(a), which the file itself invokes at the vii stub):

| Site | Current text | Edit |
|---|---|---|
| the **`### (e)` body** (under Story 11b.1) | *"⚠ authorised, ⛔ NOT made"* (first half) · *"⛔ Not this story's to resolve — it **binds 11b.2 and 11b.3**"* (second half) | first half → **CLOSED** (`-179` cl.2) · second half → **⏳ CLOSING by `8-16`**, then **CLOSED by [edit]** |
| the **`- 11b.1 ITEM (e)` bullet** under the 11b.3a section (`deferred-work.md:601`) | *"its **binder is 11b.3b** (D9) … stays open … ⛔ Do not open a second item for it here"* | ⭐ re-point: the binder is **`8-16`** (`-179` cl.3 / `-180`), and the item **closes on `8-16`'s merge**. ⚠ Binder was stated **inconsistently** (this site said `11b.3b`; the body said `11b.2 and 11b.3`) — ⛔ both collapse to **`8-16`**. |
| the **`### ⛔ 11b.2 (vii) — INTENTIONALLY NOT RECORDED`** stub (`deferred-work.md:~854`) | *"already open … under Story 11b.1 item (e) … with the same 'binds 11b.2 and 11b.3' language"* | ⭐ annotate: item (e) is **discharged by `8-16`**; the stub's *"already open"* pointer is spent. ⛔ Annotate, ⛔ never delete. |

**And** ⚠⛔ **SIBLING `11b-3b` (`ready-for-dev`) IS A CO-WRITER OF ITEM (e).** Its **AC8 + Task**
(`11b-3b-…md:544-549`) already rewrites item (e) *conditionally on `8-16`'s merge state*: *"if 8.16
has MERGED, record the CLOSURE … If 8.16 has ⛔ not merged, re-affirm it open and name 8.16 as its
binder."* ⇒ ⭐ **whichever of `8-16` / `11b-3b` merges second must ⛔ neither re-affirm item (e) open
⛔ nor re-record its closure** — `8-16`'s Task 6b carries this as a forward commitment.

**And** ⚠⛔ **`deferred-work.md` names story `8-16` ⛔ NOWHERE** — verified: ⛔ no `8.16` and ⛔ no
`8-16-…` story-key occurrence; every `8-16` substring hit is a decision-log id (`2026-08-16-###` or
`2026-08-28-16#`) ([[feedback_negative_claims_checkable_in_repo]]).

**And** ⚠⛔ **A SECOND TARGET — ⛔ ITEM (d), ⛔ NOT (e).** The stale *"declinable and revocable"*
phrase is at **`deferred-work.md:970`, under item (d)**, ⛔ not (e). `2026-08-28-160` cl.6 reversed it
(*"**NO FAMILY VETO** … the decline path for the member's own name is deliberately removed. ⛔ A later
reader must not restore it as a 'missing feature'"*). ⇒ **annotate item (d)**; ⛔ annotate, ⛔ never
edit away.

### AC7 — The friction budget is DISPOSED, ⛔ not skipped
⭐ `MEMBER_FACING_PREFIXES = ['apps/mobile/', 'apps/public/']`
(`scripts/friction-budget/lib.ts:453`), and this story updates **two `apps/mobile` components** ⇒
**AC-4's attribution-on-change FIRES.**
⇒ this story records its friction-budget disposition **explicitly**, as 11b.11 / 11b.12 / 11b.13 /
11b.14 each did ([[project_friction_budget_baseline_ratchet]] — AC-4 diffs **COMMITTED** history, and
`git push` runs `ci:local`). ⚠ Expected shape: **declaration affirmed, ⛔ no new row** — this story
changes a name **form**, ⛔ it adds ⛔ no deliberate friction.

### AC8 — Governance first, and the story gets its `epics.md` entry
Task 0 lands a `governance:` commit before any code
([[feedback_governance_commits_precede_implementation]]).
**And** ⭐ **an `### Story 8.16` section is CREATED in `epics.md`** — ⚠ Epic 8's headings stop at
**8.13** (`epics.md:3353`), so there is ⛔ nothing to annotate.
⛔⛔ **This is the SECOND HALF of the very `7-11` precedent this story already invokes**
(`epics.md:3048`: *"had ⛔ no `epics.md` entry until it **CREATED its own**"*) — ⛔ the story cites that
precedent for **where to mint** and drops its annotation duty. ⇒ the header's stated risk
(*"a future `sprint-planning` run must ⛔ not drop it"*) is otherwise left as a **hope**.
**And** **FR-21**'s specified name form is **superseded BY NAME** — ⛔ the FR is ⛔ not edited
([[feedback_supersede_never_reinterpret]]).

### AC9 — The member's meaning is STATED **where a code reader meets it**
⭐ The two confirmed sentences (`#decision-2026-09-08-209` cl.1) are carried **verbatim** into the
**header comment block** of **`packages/domain/src/notifications/pool-identity.ts`** (`:1-15`) — the
⭐ ONE module all four consumers delegate to. ⚠ That header is `//` line comments, ⛔ **not** a
`/** */` doc-block — ⭐ match the existing style; ⛔ do ⛔ not convert it.

> *"When you open your pool, you will see the name of the colleague whose family you are supporting,
> in whatever form your Pariwar has chosen for that name — instead of a first name and an initial."*
>
> *"Your Pariwar can see this name because you are contributing to this drive. Public display is a
> separate decision governed by the applicable publication basis."*

**And** ⛔⛔ **THIS IS ⛔ NOT USER-FACING COPY — ⛔ DO ⛔ NOT MINT A LOCALE KEY FOR IT.** ⭐ It is a
**doc-block for developers**, ⛔ never a rendered string; AC5's *"⛔ no new locale key is minted"*
stands unchanged and this AC does ⛔ not create an exception to it.

**And** ⛔ the **third part is ⛔ not droppable** — *"Public display is a separate decision governed by
the applicable publication basis"* is what stops a later reader inferring a public exposure that
⛔ does not exist. ⚠ A header carrying only the first sentence ⛔ **fails this AC**.

**And** ⭐ **WHAT PROVES IT** — ⛔ not a reviewer's eye:
a test in `packages/domain/tests/notifications/pool-identity.test.ts` reads the resolver's **source
file** and asserts **both** sentences are present, compared **whitespace-normalised** (collapse all
runs of whitespace and comment markers to single spaces) so the assertion survives re-wrapping but
⛔ **not** paraphrase. ⚠⛔ ⛔ Assert the **exact** normalised strings — ⭐ a substring/keyword scan
would pass on a reworded header, which is the failure this AC exists to prevent.

**And** ⚠ the sentences are quoted in **three** places — this header, `8-16`'s Policy-meaning section,
and `-209` cl.1. ⛔ They must stay **byte-identical**; ⭐ the test is what makes drift in the code copy
fail loudly ([[feedback_spec_edits_must_propagate_to_tasks]]).

**And** ⚠⛔ **THE SAME HEADER ALREADY CARRIES A SENTENCE THIS STORY MAKES FALSE — ⛔ FIX IT IN THE SAME
EDIT.** `pool-identity.ts:12-13` reads:

> *"`apps/api/src/modules/member-pool/pool-identity.ts` **keeps its exact exported signature** and
> delegates here, so **no apps/api call site changed**."*

⛔ Both halves stop being true the moment the **mode** parameter lands (Task 2 — the wrapper **gains**
it, and its three call sites pass it). ⭐ Found at the final preflight, 2026-09-08. ⇒ ⛔ the header is
⛔ not merely appended to; the stale sentence is **corrected**, ⛔ never left standing beside the new
one ([[feedback_record_unattested_no_backfill]]).


---

## Tasks / Subtasks

- [x] **Task 0 — GOVERNANCE FIRST** (AC1, AC8) — ⛔ one `governance:` commit, ⛔ no code.
  - [x] ⛔⛔ **Read the PREFLIGHT. If either STOP is unanswered → ⛔ STOP and report.**
  - [x] ✅ The `INV-scope` packet was written and routed (2026-09-02).
    - [x] ✅ **THE PANEL ANSWERED — ALL FOUR** (Kalpana Bharti, Dhiraj Rahul; `2026-09-02-180`,
          note §10). ⛔ Already transcribed — ⛔ do ⛔ not re-transcribe.
  - [x] ✅ **`INV-form` RULED MODE-RESOLVED** (BigDev, `2026-09-02-181`). ⛔ Already transcribed —
        ⛔ do ⛔ not re-transcribe, ⛔ do ⛔ not re-author. ⚠ Read `-181` before Task 2: it names the
        forbidden move (**Trap 5**).
  - [x] ✅ Both are in `.decision-log.md`. ⛔ Neither is re-opened by this story.
  - [x] **CREATE** the `### Story 8.16` section in `epics.md` (⭐ the `7-11` precedent,
        `epics.md:3048`); record `-179` cl.3 + `-180` + `-181`; supersede **FR-21**'s form by name.
        ⚠ ⛔ **The `epics.md:5128` six-story-split range + the `11b-11:818` F/G mis-keying are ⛔ NOT
        this Task's work** — both landed in `949a01ea`.
- [x] **Task 1 — The identity SHAPE** (AC3) — ⭐ ONE resolved display field `deceasedDisplayName:
      string` on `ResolvedPoolIdentity`, replacing the `deceasedFirstName` / `deceasedLastInitial`
      pair; ⛔ never widen `deceasedLastInitial`; ⛔ the parts are ⛔ not kept alongside it.
  - [x] ⚠⛔ **`apps/api/tests/unit/_pool-identity-fake.ts` is a POSITIONAL mirror** of the domain
        signature, read by three suites. ⛔ It moves in the **same commit**, or three suites go green
        on the wrong shape.
- [x] **Task 2 — The resolver, MODE-RESOLVED** (AC2, AC2b)
  - [x] ⛔⛔ **Read Trap 5 FIRST.** ⛔ Do ⛔ not call `resolvePublicMemberName`.
  - [x] ⚠ **Two signatures, ⛔ different shapes** — say where the mode goes in each:
        `notifications/pool-identity.ts:76` `(db, encryption, pariwarId, input, log)` vs
        `member-pool/pool-identity.ts:60` `(deps, tx, request, pariwarId, input)`.
        ⛔⛔ **The wrapper is ⛔ NOT a pass-through, and it does ⛔ NOT "keep its signature"** — it
        **gains** the mode and forwards it. ⚠ Three of the four consumers reach the resolver through it.
  - [x] ⚠ Record the **SEMANTIC WIDENING** at the setting: `public_name_presentation_mode` now governs
        **member-facing** surfaces too (`-181`). ⛔ **Do ⛔ NOT rename it.**
  - [x] ⭐ **Carry the two confirmed sentences VERBATIM into the resolver's header comment block**
        (AC9, `-209` cl.1) — ⛔ all three parts; ⛔ a locale key is ⛔ NOT minted (⛔ not rendered copy);
        ⚠ `//` lines, ⛔ not a `/** */` doc-block.
  - [x] ⚠⛔ **CORRECT the stale sentence in that SAME header** — `pool-identity.ts:12-13` claims the
        `apps/api` wrapper *"keeps its exact exported signature"* and *"no apps/api call site
        changed"*. ⛔ Both are false once the mode parameter lands. ⛔ Correct it; ⛔ do ⛔ not leave it
        standing beside the new text.
- [x] **Task 3 — ALL FOUR consumers, ⭐ FIVE render sites** (AC2, AC3)
  - [x] ⚠⛔ **THE FIFTH RENDER SITE.** `familyLabel` (`contribution-notify-triggers.ts:250`) is called
        at **`:304` (cycle-open) ⭐ AND `:340` (deadline-reminder)**, and
        `notify.deadline.day_14.subject` interpolates `{family}`. ⇒ ⭐ **four resolver CALL sites,
        five RENDER sites.** ⛔ The old *"complete set"* finding was about call sites and was being
        read as render sites.
  - [x] ⚠ Add `kyc` to the existing `@twt/domain` import at `contribution-notify-triggers.ts:55` —
        ⭐ a value import, ⛔ no cycle.
  - [x] ⛔ **Trap 6** — ⛔ do ⛔ not change `note-template.ts:82` `familyDisplay` in place.
  - [x] Re-emit `openapi/v1.yaml` (`pnpm contracts:emit-openapi`) and **COMMIT** it.
  - [x] Amend the three `.strict()` PII guards (`contributions.test.ts:102`, `:478`, `:716`) — add
        `deceasedDisplayName` to each `VALID_*` fixture. ⛔ `memberFullName` stays forbidden in the
        `:478` / `:716` guards that carry it; ⛔ do ⛔ not add it to the `:102` card guard (no such
        field there).
- [x] **Task 4 — Tests** (AC2, AC2b, AC3, AC4, AC4b) — ⭐ paths in *Testing standards*.
  - [x] ⭐ The **byte-identical stored-name** assertion (AC2's load-bearing test).
  - [x] ⛔⛔ **A MONONYM TEST ON EVERY CONSUMER, in BOTH modes** (Trap 5).
  - [x] ⭐ **The MODE-FLIP / divergence test** — flip the Pariwar mode, assert public and member move
        **together**. ⚠ Per **Trap 7**, seed the basis or it compares against `null`.
  - [x] ⭐ **`-189` cl.3 in BOTH directions** (AC4b) — ⛔ `tc_acceptance` fixtures only.
  - [x] ⛔ The AC2b fences (no inside read · one read per pool · one join site).
  - [x] ⚠ Extend `apps/mobile/tests/unit/missed-cycle-section.test.ts:171`'s `forbidden` list with
        `deceasedDisplayName` — ⛔ the rename leaves its existing `deceasedFirstName` /
        `deceasedLastInitial` entries asserting the absence of fields that ⛔ no longer exist, so they
        **pass vacuously**.
  - [x] ⭐ Cite `sahyog-drive.spec.ts:558` as AC4's existing public-surface fence.
  - [x] ⭐ **The policy-sentence assertion** (AC9) — read `notifications/pool-identity.ts`'s **source**
        and assert **both** confirmed sentences, **whitespace-normalised** and **exact**.
        ⛔ Not a keyword scan: ⭐ a reworded header must **FAIL**.
- [x] **Task 5 — a11y + i18n + the paid-channel cost** (AC5)
  - [x] The `t()` namespace (⚠ **third arg, an options object**) across the six `{family}` keys.
  - [x] The RN `accessible={true}` check on **both** mobile components.
  - [x] ⚠⛔ **MEASURE the SMS segments** — both locales × both alert kinds; GSM-7 160/153, UCS-2
        70/67. ⭐ Record *"before → after"* in **Completion Notes**. ⛔ Route a >1-segment rise.
  - [x] The microcopy gate re-check (⭐ now **live**, ⛔ not conditional).
- [x] **Task 6a — `deferred-work.md`, IN-RUN** (AC6) — ⛔ **ALL THREE item (e) sites** (the `### (e)`
      body · the `- 11b.1 ITEM (e)` bullet at `:601` · the `### 11b.2 (vii)` stub at `:~854`): the
      body's second half → **⏳ CLOSING** and both other sites re-pointed/annotated to bind `8-16`
      (⛔ not `11b.3b`, ⛔ not `11b.2 and 11b.3`); the body's first half → CLOSED (`-179` cl.2).
      **item (d)** annotated against `-160` cl.6.
- [ ] ⏳ **Task 6b — POST-MERGE** (AC6) — ⛔ **DELIBERATELY UNCHECKED, ⛔ not forgotten.** ⚠ It is
      **UNREACHABLE from a `dev-story` run, BY DESIGN**: AC6 splits the closure precisely because a
      run ends at `review`, ⛔ before merge, and *"an AC satisfiable only at merge, with nobody
      assigned, is how item (e) stays open forever."* ⭐ Ticking it here would record a closure that
      ⛔ has not happened ([[feedback_closure_language_precision]]). ⇒ carried as a **forward
      commitment** in Completion Notes **and** the Change Log, so it survives this run.
      Record item (e) **CLOSED by [edit]** at all three sites.
      ⚠ **Reconcile with `11b-3b` AC8** (`11b-3b:544-549`), the co-writer: if `11b-3b` has already
      merged, its branch left item (e) *"re-affirmed open, binder `8-16`"* → close it; if it has
      ⛔ not, `8-16`'s closure stands and `11b-3b`'s "if merged → record closure" arm becomes a no-op.
      ⛔ Neither story re-affirms open nor re-closes. ⭐ Carried as a forward commitment in Completion
      Notes **and** the Change Log, so it survives the run.
- [x] **Task 7 — The friction-budget disposition** (AC7) — ⚠ written **AFTER** the code commit
      ([[project_friction_budget_baseline_ratchet]]).

### Review Findings

#### Round 1 — `bmad-code-review` 2026-09-08 against `git diff f5df1fae^..HEAD`

Blind Hunter + Edge Case Hunter + Acceptance Auditor. 7 `patch`, 0 `decision-needed`, 0 `defer`, 9
dismissed as noise/false-positive — enumerated here (round 2 flagged that a bare count is unauditable):

1. `epics.md` claimed edited but absent from the diff — diff-construction false positive: the reviewed
   range excludes commit `0082a2fc` (governance-only, predates the code commit); `epics.md`'s
   `### Story 8.16` entry IS present and correct at HEAD.
2. An unrecognised `mode` value silently falls through to the `full_name` branch — matches AC2's ruled
   default (`DEFAULT_PUBLIC_NAME_PRESENTATION_MODE = 'full_name'`, deliberately NOT fail-closed); not a
   gap.
3. The shielded-mode trailing period is an "undisclosed judgement call, no citation" — false: it cites
   `2026-09-02-181` in the code comment and is named explicitly as "ONE JUDGEMENT CALL STATED" in the
   v1.0 Change Log row.
4. No escaping added for the widened `deceasedDisplayName` field (PDF injection risk) — false:
   `note-template.ts`'s `factRow` already runs every value through `esc()`, unconditionally.
5. `.max(128)` bound insufficient for a long Devanagari legal name — speculative, no concrete overflow
   case raised; the widening from `.max(16)` and its rationale are already documented in place.
6. No privacy/compliance treatment of a full legal name over unencrypted SMS — already the Panel's own
   ruling, recorded in AC5 as "a precision — not grounds to revisit."
7. Self-reported test/gate results with no linked external artifact — standard practice for this
   workflow's Completion Notes; not fixable within a diff.
8. `openapi/v1.yaml` only reflects `ContributionHistoryResponse`, not the other two contracts — false:
   `active-contribution-card`/`contribution-note` were never part of `openapi/v1.yaml` (grep-verified:
   neither schema name appears in the file at all, before or after).
9. Task 6b permanently unchecked — explicitly by-design and disclosed in the story (AC6, Task 6b's own
   text).

✅ **All 7 `patch` findings applied — see the Change Log's v1.1 row for what changed and the corrected
SMS numbers.**

- [x] [Review][Patch] AC9's mandated policy-sentence test does not exist — Task 4 ticks it `[x]` and
      Completion Notes claim it, but `packages/domain/tests/notifications/pool-identity.test.ts` has no
      source-read / whitespace-normalised assertion of the two policy sentences (verified: zero grep
      hits for either sentence or `readFileSync` in that file). [packages/domain/tests/notifications/pool-identity.test.ts]
- [x] [Review][Patch] AC2b's first fence has no prover — the table names "a source-scan test:
      `resolvePublicNamePresentationMode` appears nowhere in `notifications/pool-identity.ts`" and
      Completion Notes claim "all four built with real provers," but no test file anywhere greps for
      this. [packages/domain/src/notifications/pool-identity.ts]
- [x] [Review][Patch] `resolvePublicNamePresentationMode`'s read in `runContributionNotifyChild` is not
      wrapped in the fail-soft discipline `resolvePoolIdentity` uses for every other read in the same
      path (decrypt, letter code, curated name) — a DB error here throws uncaught instead of
      alarm+skip-this-pool. [apps/jobs/src/scheduler/contribution-notify-triggers.ts:701-720]
- [x] [Review][Patch] `sms-segment-cost.test.ts`'s `BEFORE` fixture (`'रामेश्वर प्र.'` / `'Rajesh K.'`)
      already includes this story's own new trailing-period judgement call for `shielded_name` (the old
      `familyLabel`/`familyDisplay` joins had no period) — the "before → after" segment count doesn't
      measure the true pre-story baseline. [apps/jobs/tests/sms-segment-cost.test.ts:1761]
- [x] [Review][Patch] AC2b's "once per request" cost claim has a call-count spy only for `apps/jobs`;
      the three `apps/api` consumers (`resolveCard`/`resolveHistory`/`resolveContributionNoteFacts`)
      have no equivalent assertion. Low priority — beyond AC2b's literal text, which names only the
      jobs-side spy. [apps/api/src/modules/member-pool/handlers.ts]
- [x] [Review][Patch] `deferred-work.md`'s 11b.2(vii) annotation reads "Item (e) is **discharged by**
      `8-16`" — past-tense phrasing against this story's own closure-language discipline, even though
      the same sentence immediately qualifies it as CLOSING-not-merged. Low priority wording tightening.
      [_bmad-output/implementation-artifacts/deferred-work.md:376]
- [x] [Review][Patch] `_pool-identity-fake.ts` reimplements the mode-resolution branching by hand
      instead of delegating to `resolveMemberFacingDeceasedName`, and its default mock fixtures don't
      cohere (mode `full_name`, identity hard-coded shielded-form). ⚠ **APPLIED ONLY IN PART, corrected
      by round 2**: the hand-reimplemented BRANCHING was delegated to the real function (this file, plus
      the three call sites) — that closes the drift risk on the string a member is actually shown. The
      jobs-side fixture "incoherence" (`apps/jobs/tests/contribution-notify-triggers.test.ts`'s
      `IDENTITY`/mode default mismatch) was deliberately left as-is: it is already disclosed in that
      file's own comment (Story 8.16 header), and the wiring risk it names — "the mode discarded before
      reaching the resolver" — is already caught by the existing `resolvePoolIdentity.mock.calls[0]![3]`
      assertion, which checks the actual forwarded argument rather than the mock's return value.
      [apps/api/tests/unit/_pool-identity-fake.ts]

#### Round 2 — re-review of the round-1 patches (this diff: `git diff` vs. round-1 HEAD)

Same three layers, scoped to the 11-file round-1 patch diff. 1 `patch` from Edge Case Hunter (a real
regression my own round-1 fix introduced), 6 acted on from Blind Hunter's 14 (2 code/test fixes, 3
precision/robustness fixes, 1 record correction — see above), 8 dismissed. Acceptance Auditor
independently re-verified all 7 round-1 fixes live (ran the suites, re-measured the SMS numbers,
grepped for leftovers) and found all 7 genuinely applied, no new issues.

- [x] [Review][Patch] **Double-alarm regression in round-1's own fail-soft fix**: a presentation-mode
      read failure fired BOTH the new specific alarm AND the pre-existing generic "pool identity
      unresolvable" alarm (since `identity` is `null` either way), and the second message overwrote the
      true cause. Fixed with an outer `presentationModeFailed` flag; the round-1 test only checked
      `toHaveBeenCalledWith` (any call matching), which doesn't catch a second call — tightened to
      `toHaveBeenCalledTimes(1)`. [apps/jobs/src/scheduler/contribution-notify-triggers.ts:701-741]
- [x] [Review][Patch] AC9 test's comment-stripping handled only `//` lines; hardened to also strip
      `/** … */` / leading `*` so a future JSDoc-style header edit can't silently defeat the match.
      [packages/domain/tests/notifications/pool-identity.test.ts]
- [x] [Review][Patch] `contribution-note.test.ts`'s new AC2b call-count assertion was bolted onto an
      unrelated existing test, muddying failure attribution — split into its own `it(...)`.
      [apps/api/tests/unit/contribution-note.test.ts]
- [x] [Review][Patch] `_pool-identity-fake.ts` reintroduced, for the mode's TYPE, the exact duplication
      risk round 1 removed for the mode's LOGIC (`'full_name' | 'shielded_name'` hardcoded locally
      instead of the real `PublicNamePresentationMode`) — now a type-only import from `@twt/domain`.
      [apps/api/tests/unit/_pool-identity-fake.ts]
- [x] [Review][Patch] Typo in a new test title (backtick instead of an apostrophe). [packages/domain/tests/notifications/pool-identity.test.ts]
- [x] [Review][Patch] Round-1's "9 dismissed" count was unenumerated in the story ("details in the
      review session") — an unauditable claim in a governance artifact. Enumerated above.
- ⛔ **Dismissed (8)**: `Status: done` "contradicts" Task 6b still-open — not a new contradiction; the
  story's own AC6/Task 6b text already establishes that post-merge closure is a separate, deliberately
  later action regardless of the dev-story `Status:` field (which per this ledger's own STATUS
  DEFINITIONS means "Story completed" — implementation + review — not "merged"). AC2b fence-1 is a
  "naive substring grep" an import alias could defeat — matches AC2b's own literal prover definition,
  and this codebase has no adversarial-gaming threat model to defend against. The fail-soft test proves
  only the whole-job return, not "other pools unaffected" — moot: `runContributionNotifyChild` is
  ONE-JOB-PER-POOL by construction (verified at the call site), so there is no "other pool in this same
  call" to assert against. Mock-hygiene "inconsistent" across the three `apps/api` call-count tests —
  each matches ITS OWN file's pre-existing convention (manual `vi.clearAllMocks()` per test in
  `active-contribution-card.test.ts`; a global `beforeEach` in the other two) correctly. The SMS
  `BEFORE` baseline is "unverifiable from this diff alone" — true but not a defect: it was verified
  against `f5df1fae^`'s removed code during round 1, outside this narrower diff's view (Acceptance
  Auditor's round-2 pass re-confirmed it independently). The alarm message's `p.poolId`/`p.alertId`
  aren't visible in this diff's hunk — `p` is declared earlier in the same function, outside the hunk;
  a diff-context artifact, not a real gap. The Change Log v1.1 row is "a dense wall of text" — matches
  every prior Change Log row's own established style. `let presentationMode` has no explicit type
  annotation — TypeScript infers it correctly from the single assignment; verified by a clean
  `tsc --noEmit`.

---

## ⚖️ Decisions — ✅ **BOTH RULED.** `INV-scope` **ALL FOUR** (`-180`, Panel) · `INV-form` **MODE-RESOLVED** (`-181`, BigDev)

✅ **AND NOW IT ⛔ IS STARTABLE.** ⭐ This story's own two decisions are ruled and ⛔ neither is
re-opened; **both Preflight STOPs are discharged** — STOP 1 by `#decision-2026-09-08-208` (cl.1,
cl.2: `11b-16` withdrawn, `-198`'s carve-out **void**) and STOP 2 by `#decision-2026-09-08-209`
(the framing confirmed and re-grounded).
⚠ ⛔ Task 0's governance-first STOP still binds. ⇒ ⭐ read the Preflight for **why the scope and the
member sentence read as they do** — ⛔ not for a gate.

### ⛔ `INV-scope` — **PANEL, BLOCKING.** All four consumers, or the in-app two?

⭐ `2026-09-02-179` cl.3 directs closure and ⛔ **does not distinguish push from pull.** Two consumers
leave the app: the **Contribution Note PDF** (shareable) and the **cycle-open push/WhatsApp/SMS**
(a possibly-shared handset).

<details><summary>⛔ The question as put (kept as the record — ⭐ RULED (a); ⛔ the imperatives below are DEAD)</summary>

- **(a) ALL FOUR** — the gap closes completely, and the resolver's *"one identity everywhere"* property
  is preserved intact. ⚠ Then a deceased member's **full name is pushed to every assigned member's
  phone** at cycle open.
- **(b) IN-APP ONLY** (card + passbook) — the smaller exposure. ⚠⛔ **But it re-creates the *"two
  different pools"* divergence 8.8 moved the resolver to prevent**, and ⛔ the inversion is then
  **NARROWED, ⛔ not closed** — AC6 must say so.
- **(c) ALL FOUR EXCEPT THE PUSH** — the PDF is pulled (the member asks for it); the push is not.
  ⚠ A principled middle, ⛔ and it still splits the resolver.

⛔ **Only the Panel can rule this**, because the exposure it decides is ⛔ not the one they were shown.

</details>

✅ **RULED (a) ALL FOUR — 2026-09-02** (Kalpana Bharti, Dhiraj Rahul; `2026-09-02-180`).
Packet: `trustee-panel-routing-note-2026-09-02-8-16-inversion-scope.md` §10.
⇒ ⭐ **Q2 VACATED** (its antecedent did ⛔ not obtain) ⇒ **AC6 resolves to CLOSED**, ⛔ not narrowed —
⚠ **closed ON SHIP**, ⛔ not today; 11b.1 item (e) stays OPEN until this story merges.
⇒ ⭐ **the resolver's *"one identity everywhere"* property is PRESERVED** — ⛔ no split, and ⛔ a future
story that divides the consumers reverses `-180`.

⭐ **THREE FINDINGS OF THE PACKET-WRITING PASS, all verified and all narrowing the question:**
1. ⚠ **The notification DOES carry the name — ⛔ it is ⛔ not just "Pool F".**
   `apps/jobs/src/scheduler/contribution-notify-triggers.ts:251-253` **joins the parts**, and the copy
   renders it (*"Standing with **{family}**'s family"*). ⇒ consumer ④ is ⛔ **not** hypothetical.
2. ⭐ **The audience is BOUNDED and it is smaller than "a broadcast":** *"one … notification **per
   member assigned to a pool in that cycle**"* (`:10`) ⇒ **the pool roster — dozens**, ⛔ not the
   Pariwar and ⛔ not the membership. ⚠ And they are **the contributors to that family's drive**, who
   see the full name in-app under **every** option. ⇒ the real delta is *"also on a lock screen / in a
   WhatsApp thread / in an SMS"*, ⛔ **not** *"to strangers"*. ⛔ Do ⛔ not argue it as the latter.
3. ⭐ **The FOUR consumers are the COMPLETE set — a fifth was checked and ruled out.**
   `close-of-cycle/framing.ts:56` makes `familyName` a **required param**, ⚠ but it has **ZERO
   production suppliers** and the Panchayat Noticeboard renders ⛔ no family name. ⇒ ⛔ **there is no
   fifth surface**, and a future reader who finds `close-of-cycle.json` should ⛔ not re-derive one.

### ✅ `INV-form` — RULED **(a) MODE-RESOLVED** by BigDev, 2026-09-02 (`2026-09-02-181`)

⭐ The member side reads the **same stored per-Pariwar mode** the public side reads ⇒ **the two forms
can ⛔ never diverge again BY CONSTRUCTION.** ⛔ The mode is an **INPUT**, ⛔ not a DB read inside the
resolver (AC2 — the N+1). ⛔⛔ **And `resolvePublicMemberName` is ⛔ NOT reused verbatim — Trap 5.**

<details><summary>⛔ The question as put (kept as the record)</summary>

**Hard-coded full name, or MODE-RESOLVED?**

⚠ **Trap 3.** The public form is **Pariwar-configured**; hard-coding `full_name` on the member side
means a Pariwar that shields publicly ends up with the **member app showing MORE** — a **new
inversion**, pointing the other way.

- **(a) MODE-RESOLVED** — the member side reads the **same stored per-Pariwar mode** the public side
  does. ⭐ *Authoring recommendation: it is the only option that stays closed under a later mode change,
  and it is what `-136` cl.1's "must not hard-code" requirement asks for on the public side.* ⚠ ⛔ Note
  the mode's **write authority** is `super_admin` only — ⛔ this story adds ⛔ no new key and ⛔ no
  toggle.
- **(b) HARD-CODED full name** — simpler today. ⛔ Re-creates the inversion the moment any Pariwar
  shields. ⛔ Not recommended.

⚠⛔ **Applying `-136` cl.1 to the MEMBER side is an INFERENCE** — its subject is the public directory.
⛔ Raised, ⛔ not assumed (the `2026-09-02-175` warning).

</details>

---

## Dev Notes

### Architecture constraints — ⛔ non-negotiable

- ⭐ **`resolvePoolIdentity` lives in `@twt/domain` because `apps/jobs` cannot import `apps/api`.**
  `apps/api/src/modules/member-pool/pool-identity.ts` **stays where it is** and keeps delegating.
  ⛔ Do ⛔ not re-home it.
  ⚠⛔ **⛔ BUT IT DOES ⛔ NOT "KEEP ITS SIGNATURE" — THE OLD WORDING CONTRADICTED AC2.** It is ⛔ not a
  pass-through: `(deps, tx, request, pariwarId, input)` vs the domain's
  `(db, encryption, pariwarId, input, log)`. ⇒ if it kept its signature, the mode could reach it only
  by a **DB read inside the wrapper** — which is AC2's forbidden move, for **three of the four**
  consumers. ⭐ It **gains** the mode and forwards it.
- ⛔ **`packages/contracts` must never import `@twt/domain`'s pg-touching namespaces**
  ([[project_contracts_domain_bundle_boundary]]).
- ⚠ **Type-only → value import** materializes a module-init cycle that breaks **consuming** packages at
  runtime while typecheck/lint/local tests stay green ([[project_type_only_import_cycle_trap]]).
- ⛔ **Fail-soft is the resolver's posture and ⛔ must not change:** an unresolvable name / decrypt
  failure / bad pool index **omits THIS pool**, ⛔ never throws — *"letting it throw would blank an
  entire passbook or abort an entire cycle's fan-out."*

### Testing standards

⚠⛔ **⛔ A GREEN `pnpm ci:local` PROVES ⛔ NOTHING HERE.** `scripts/ci-local.sh:96` gates the **whole**
`integration-tests` job on `DATABASE_URL`; `:137` **SKIPS it silently** and still reports **PASSED**.
Every package's `test` is `vitest run --passWithNoTests`, so ⭐ **a new spec in a skipped path is
indistinguishable from no spec at all** — and this story's load-bearing tests all live there.

```
DATABASE_URL='postgresql://twt_dev_app:devpass@127.0.0.1:5433/twt_dev?sslmode=disable' \
  pnpm turbo run test --concurrency=1 \
  --filter=@twt/domain --filter=@twt/api --filter=@twt/jobs --filter=@twt/contracts
```

⭐ **Record the per-package pass COUNTS in Completion Notes** — a count is the only artefact that
distinguishes *"ran"* from *"skipped"*.

| Obligation | Where |
|---|---|
| ⭐ Byte-identical stored name across a form change **and back** (AC2) | `packages/domain/tests/integration/kyc/kyc-substrate.spec.ts` — **extend**. ⭐ Model on `packages/domain/tests/integration/rls/public-name-presentation-policy.spec.ts:126-137` |
| ⛔⛔ Mononym on **every** consumer, **both** modes (Trap 5) | resolver `packages/domain/tests/notifications/pool-identity.test.ts` · API `apps/api/tests/unit/{active-contribution-card,contribution-history,contribution-note}.test.ts` · job `apps/jobs/tests/contribution-notify-triggers.test.ts` (⚠ `:931-943` already covers `deceasedLastInitial: ''` — **extend**) |
| ⭐ Mode-flip / divergence + `-189` cl.3 both directions (AC2, AC4b) | **new:** `apps/api/tests/integration/contributions/member-name-form-parity.spec.ts` ⚠ **Trap 7** — seed the basis |
| Per-consumer render, all four (+ the 5th render site) | mobile `apps/mobile/tests/unit/*-name-form.test.ts` · PDF `apps/api/tests/unit/contribution-note-render.test.ts` · push `apps/jobs/tests/contribution-notify-triggers.test.ts` |
| The three contracts reject the old shape (AC3) | `packages/contracts/tests/contributions.test.ts` — **extend** |
| AC2b fences (no inside read · once per pool · one join site) | source-scan + call-count spy, as AC2b names |
| ⭐ AC4's public fence | `apps/api/tests/integration/public-pages/sahyog-drive.spec.ts:558` — ⭐ **already exists**; cite it |
| ⭐ **AC9 — the policy sentences in the resolver header** | `packages/domain/tests/notifications/pool-identity.test.ts` — **extend**. ⭐ Source read + whitespace-normalised **exact** match on both sentences; ⛔ DB-free, so it runs in the **unit** job and ⛔ is ⛔ not subject to the `DATABASE_URL` skip |

- **Live-DB:** ⛔ never regenerate an applied migration (42P07), ⛔ never `DROP SCHEMA` (42P01), assert
  **membership, not counts** ([[project_live_db_test_gotchas]]).
- ⚠ `integration-tests` concurrency `=1` is **LOAD-BEARING**
  ([[project_ci_local_concurrency_oversubscription]]). `git push` runs full `ci:local`.

### Project Structure Notes

⚠⛔ The old table had **7 rows, three of them non-paths**, and marked two ruled-in consumers
*"⚠ only if `INV-scope` includes it"* — ⭐ a condition `-180` settled. ⛔ Both conditionals are gone.

| Path | Disposition |
|---|---|
| `packages/domain/src/notifications/pool-identity.ts` | **UPDATE** — shape `:40-41` (the pair → `deceasedDisplayName`) · signature `:76` · absence guard `:99` · producer `:122-123` · ⭐ **header ← the two confirmed sentences, verbatim (AC9)** |
| `packages/domain/tests/notifications/pool-identity.test.ts` | **UPDATE** — the mononym cases **+ ⭐ the AC9 policy-sentence assertion** |
| `packages/contracts/src/contributions/active-contribution-card.ts` | **UPDATE** — `:79` doc · `:124`, `:130` |
| `packages/contracts/src/contributions/contribution-history.ts` | **UPDATE** — `:55` doc · `:73`, `:77` ⭐ the Yogdaan Bahi |
| `packages/contracts/src/contributions/contribution-note.ts` | **UPDATE** — `:118`, `:120` ⛔ **only**; `:123-124` (the member's own) ⛔ **NOT TOUCHED** |
| `packages/contracts/tests/contributions.test.ts` | **UPDATE** — the three PII guards `:102`, `:478`, `:716` (+`deceasedDisplayName` in each `VALID_*` fixture); ⛔ `memberFullName` stays forbidden in `:478`/`:716` ⛔ **only** — the `:102` card guard has no such field |
| `openapi/v1.yaml` | **RE-EMIT (generated)** — `pnpm contracts:emit-openapi`, ⛔ never by hand. Only `ContributionHistoryResponse` |
| `apps/api/src/modules/member-pool/pool-identity.ts` | **UPDATE** — `:55-58` doc · `:60-74` the delegation, ⭐ **gains the mode** |
| `apps/api/src/modules/member-pool/handlers.ts` | **UPDATE** — calls `:630`, `:835` (memoised per pool `:826-857`); producers `:748-749`, `:866-867` |
| `apps/api/src/modules/member-pool/contribution-note.ts` | **UPDATE** — call `:144`; producer `:185-186`. ⛔ `:159-161` `resolveOwnName` **NOT TOUCHED** |
| `apps/api/src/modules/member-pool/note-template.ts` | **UPDATE** — `:144` (deceased) ⛔ only. ⛔⛔ `:82` `familyDisplay` shared with `:145` — **Trap 6** |
| `apps/api/tests/unit/_pool-identity-fake.ts` | **UPDATE** — ⚠ POSITIONAL mirror, read by 3 suites; moves in the **same commit** |
| `apps/jobs/src/scheduler/contribution-notify-triggers.ts` | **UPDATE** — ✅ **RULED IN SCOPE (`-180` ALL FOUR)**. call `:683` · `familyLabel` `:250` · ⭐ **TWO** render sites `:304` **and `:340`** · import `:55` |
| `apps/mobile/components/active-contribution/ActiveContributionCard.tsx` | **UPDATE** — `:101-103` + the RN `accessible={true}` check |
| `apps/mobile/components/yogdaan-bahi/YogdaanBahiRow.tsx` | **UPDATE** — `:39` + `yogdaan.row_a11y` |
| `apps/mobile/components/yogdaan-bahi/sample-data.ts` | **UPDATE** — `:9` doc · `:57-58` fixtures |
| `apps/mobile/tests/unit/missed-cycle-section.test.ts` | **UPDATE** — `:171` ⚠ the vacuous-pass trap |
| `_bmad-output/planning-artifacts/epics.md` | **UPDATE** — ⭐ **CREATE** the `### Story 8.16` section (AC8) |
| `_bmad-output/implementation-artifacts/deferred-work.md` | **UPDATE** — item **(e)** ⏳ CLOSING at **all THREE sites** (`### (e)` body · `:601` bullet · `### 11b.2 (vii)` stub), all binding `8-16`; item **(d)** annotated (AC6). ⚠ `11b-3b` AC8 is a co-writer — see Task 6b |
| `friction-budget.md` | **UPDATE** — the disposition, ⚠ **after** the code commit (AC7) |
| ⛔ `apps/public/**` · `public-vs-private-matrix.yaml` · `RULED_TIER1_PUBLIC_EXCEPTIONS` | ⛔ **NOT TOUCHED** (AC4) |
| ⛔ `packages/domain/src/kyc/name.ts` · `kyc/public-name.ts` | ⛔ **NOT TOUCHED** — ⛔ no second shielding implementation (`-136` cl.2) |
| ⛔ `packages/ui/src/contribution-list/**` | ⛔ **NOT TOUCHED** — its `kind:'name'` model is about **contributors** |

### References

- [Source: `.decision-log.md#decision-2026-09-02-179` **cl.3** (the direction; `INV-scope` + `INV-owner` recorded open) · **cl.2** (D10 Panel-ratified) · `#decision-2026-09-02-173` / `-174` (the ratified public form)]
- [Source: `.decision-log.md#decision-2026-08-19-136` **cl.1** (must not hard-code — Trap 3) · **cl.2** (one stored name, N modes; `splitFirstNameLastInitial` IS the shield) · **cl.3** (scope vs authority) · `#decision-2026-08-21-145` cl.3 (mononyms — Trap 4)]
- [Source: `packages/domain/src/notifications/pool-identity.ts:1-15` (the four consumers + the *"two different pools"* property) · `:76` · shape `:40-41` · producer `:122-123`]
- [Source: `packages/domain/src/kyc/public-name.ts:73` (the Pariwar-configured public form) · `packages/contracts/src/public-pages/sahyog-drive.ts:128` (⛔ the public surface NEVER uses `resolvePoolIdentity`) — ⚠⛔ **RE-ANCHORED; `:96` is now an unrelated status enum**]
- [Source: `_bmad-output/implementation-artifacts/deferred-work.md` — 11b.1 item **(e)**. ⚠ Cite the ITEM LETTER, ⛔ not a line number]
- [Source: `_bmad-output/implementation-artifacts/11b-3b-…md` **D9(a)** — ⛔ NOT reversed; it ruled that 11b.3b does not resolve this, and `-179` cl.3 supplies the destination]
- ⭐ **INHERITED FROM THE WITHDRAWN `11b-16`:** `.decision-log.md#decision-2026-09-04-198` **cl.1**
  (FORM ONLY — the basis is ⛔ not adopted; ⚠ its push carve-out is **VOID** as against `-180` cl.1) ·
  `-197` follow-up (i) (the regression it prevents) · `#decision-2026-09-04-189` **cl.3**
  (Trustee-ratified — *"a member must see MORE than the public, and ⛔ never less"*) · `-195` **cl.1**
  (*"each must state its compliance"*)
- ⚠⛔ [Source: `.decision-log.md#decision-2026-08-28-160` **cl.5/cl.6** — the **live** publication
  basis is the member's own `tc_acceptance`; `sahyog_drive_publication` is **de-authorised** and
  read-never, and the family's decline path is **deliberately removed**]
- [Source: `packages/domain/src/pool/public-read.ts:261` (⛔ the clause id, its **only** site in the
  repo) · `:380-397` `NAME_PUBLICATION_AUTHORISED` · `:855-858` (⭐ *"`false` for every row is the
  expected DAY-ONE state … the surface is INERT"*)]
- PRD: `prd.md:520-522` **FR-21** (the card's `nominee first-name + last-initial` — ⛔ **SUPERSEDED IN
  FORM** by `-180`/`-181`; ⛔ the FR is ⛔ not edited, it is superseded **by name**) · `:627-633`
  **FR-33** (the Note — ⚠ carries a standing *"reviewed by trust legal"* duty on its copy) ·
  `:1055` **FR-74** (untouched, AC4) · `:179` (the glossary's `first-name + last-initial` — ⭐ **PUBLIC
  only**, ⛔ not the member surface)
- ⚠ [`prd.md:1008` says *"SMS dropped from v1"* — **superseded by Story 5.6's shipped cascade**
  (`packages/channels/src/cascade.ts:30`, `push → whatsapp → sms`). ⛔ Recorded, ⛔ not edited]
- Memory: [[project_friction_budget_baseline_ratchet]] · [[project_death_is_an_overlay_not_a_state]] · [[project_contracts_domain_bundle_boundary]] · [[project_r7_fact_producer_unbuilt]] · [[feedback_closure_language_precision]] · [[feedback_supersede_never_reinterpret]]

---

## Dev Agent Record

### Agent Model Used

Claude Opus 5 (`claude-opus-5`) — `bmad-dev-story`, 2026-09-08.

### Debug Log References

- **Live-DB suite, the four load-bearing packages** (the story's own command, `--concurrency=1`):
  `@twt/domain` **3338 passed | 1 skipped** (269 files) · `@twt/api` **1227 passed | 1 skipped**
  (130 files) · `@twt/jobs` **356 passed** (37 files) · `@twt/contracts` **1106 passed** (64 files).
  ⭐ **The counts are the artefact** — `ci-local.sh:137` skips the whole `integration-tests` job
  silently when `DATABASE_URL` is unset and still reports PASSED, and every package's `test` is
  `--passWithNoTests`, so a new spec in a skipped path is indistinguishable from no spec at all. These
  ran **with** `DATABASE_URL` set.
- Also green: `@twt/mobile` **454** (31 files) · `@twt/ui` **254** (13 files).
- Gates run individually: `contracts-determinism` · `pii-scrape` · `i18n-parity` · `microcopy`
  (308 tests + check) · `domain-invariants` · `access-wrapper` · `governance-boundary` ·
  `pool-state` · `alert-state` · `pool-bound-payment` · `friction-budget` — all green.
- ⚠ The `friction-budget` gate **FAILED first, as designed**, then passed once the disposition was
  **committed** — AC-4 diffs COMMITTED history, so an uncommitted declaration is invisible to it.

### Completion Notes List

**Commits (governance first — [[feedback_governance_commits_precede_implementation]]):**
`0082a2fc` `governance(8.16)` → `f5df1fae` `feat(8.16)` → `863a1123` `docs(8.16)` (the disposition,
written **after** the code commit existed).

⭐ **THE SHAPE, AS RULED (AC3).** `ResolvedPoolIdentity` sheds the `deceasedFirstName` /
`deceasedLastInitial` pair for one `deceasedDisplayName: string`; all **three** carrying contracts move
with it, and `openapi/v1.yaml` was **re-emitted** (only `ContributionHistoryResponse` moved, exactly as
AC3 predicted). ⛔ The parts are not kept alongside it and the mode is not handed to consumers.

⭐ **WHERE THE MODE GOES, in both signatures.** Domain: `(db, encryption, pariwarId, **mode**, input,
log)` — positional, immediately after the `pariwarId` it is scoped to, and deliberately **not** folded
into `input`, which is strictly per-POOL context while the mode is per-PARIWAR. apps/api wrapper:
`(deps, tx, request, pariwarId, **mode**, input)`. ⚠ Making it **required** is what turned every call
site into a compile error rather than a silent default.

⭐ **A NEW SEAM, named so the read stays with the caller:**
`resolvePoolNamePresentationModeForRequest(tx, pariwarId)` in the apps/api wrapper. Its name carries
the discipline ("for a request"), and the setting's **semantic widening** is recorded there — the one
place the member side reads it. ⛔ `public_name_presentation_mode` is **not** renamed.

⭐ **THE MEMBER-SIDE FORM RESOLVER IS ITS OWN FUNCTION** — `resolveMemberFacingDeceasedName(mode,
storedName)`, exported from the resolver module. ⛔ **Not** `resolvePublicMemberName`, and ⛔ **not** a
fallback through it either: that function returns `''` for BOTH *"unresolvable name"* and *"mononym
that cannot be shielded"*, and those two must not be conflated — the first fail-softs the pool away,
the second renders the name. It uses `splitFirstNameLastInitial` (which **IS** the `shielded_name`
implementation, `-136` cl.2), so no second shielding implementation exists.

⚠⭐ **ONE JUDGEMENT CALL, STATED: the `shielded_name` arm now emits the PUBLIC form's trailing period**
(`"Rajesh S."`, not the old `"Rajesh S"`). `INV-form` rules that the two sides share the **FORM RULE**
and differ only in **ABSENCE BEHAVIOUR**; a differing period would be a form divergence, and AC4b's
string-equality assertion would fail in `shielded_name` mode. ⛔ No Pariwar is on that mode today (the
ruled default is `full_name`), so nothing visible changes at launch.

⛔⛔ **TRAP 6 HELD, and the helper was renamed to make it hold.** `note-template.ts`'s `familyDisplay`
rendered the **living contributing member's** name through the same helper as the deceased's. It is now
`shieldedPartsDisplay` with exactly **one** caller — the member's own name — and the deceased's name
does not pass through it at all. `memberFullName` stays forbidden in the two guards that carry it, and
was **not** added to the `:102` card guard (which has no member-own-name field).

⭐ **THE AC2b FENCES, all four built with real provers:** a source scan asserting the mode accessor's
name appears nowhere in the resolver (reachable — the module already imports the whole `kyc`
namespace, so the accessor is one property access away) · a **call-count spy** in the jobs suite
proving one mode read per pool at roster sizes 2 and 4 · the `packages/ui` forbidden-bindings list
extended with `resolveMemberFacingDeceasedName` · a new mobile source-scan suite asserting neither
component binds a form decider, receives the mode, or re-joins parts.

⚠⛔ **FOUR VACUOUS-PASS TRAPS CLOSED, not one.** The story named the mobile
`missed-cycle-section.test.ts:171` list. Three MORE lists had the identical defect once the parts
ceased to exist anywhere: the `MissedCycleEntry` guard and the history/note PII guards in
`packages/contracts/tests/contributions.test.ts`. Each gained `deceasedDisplayName`; the old entries
stay as teeth against the pair returning.

⭐ **SMS SEGMENTS — MEASURED, both locales × both alert kinds, against the CORRECT ceiling.**
⚠⛔ **Every one of these messages is UCS-2, including ENGLISH** — `formatCurrency` emits **₹**
(U+20B9), which is outside both the GSM-7 basic set and its extension table. ⇒ 70 / 67 throughout;
there is no "cheap" locale.

| locale | kind | before | after | Δ seg |
|---|---|---|---|---|
| `hi` | cycle-open | 98u / **2 seg** | 100u / **2 seg** | **0** |
| `hi` | day-14 subject | 101u / **2 seg** | 103u / **2 seg** | **0** |
| `en` | cycle-open | 96u / **2 seg** | 106u / **2 seg** | **0** |
| `en` | day-14 subject | 110u / **2 seg** | 120u / **2 seg** | **0** |

⇒ ⭐ **MAX RISE: ZERO SEGMENTS. ⛔ Nothing is routed.** ⚠ The Hindi body is **already multi-segment at
any name length** (94-unit template before interpolation — the story's figure, verified exactly), which
is why the artefact is *"before → after"* and never *"does it fit"*. ⭐ Made a **test**
(`apps/jobs/tests/sms-segment-cost.test.ts`), not a one-off measurement: a later copy edit that pushes
a message past a segment now fails the suite.

⭐ **i18n: ⛔ NO NEW LOCALE KEY.** All six `{family}` keys verified present and parallel in **both**
locales; the name rides the existing interpolation param. The `t()` namespace is the third argument's
`namespace` field (`{ locale, ...NS }`) at every call site.

⚠⛔ **AN A11Y DEFECT FOUND AND FIXED (AC5).** Four tamagui `<Button>`s across the two components
carried an `accessibilityLabel` and **no** `accessible` prop. A tamagui Button is `styled(View, …)`;
an RN `View` is not an accessibility element without it, so the inner `<Text>` took focus and the
label was **never announced**. ⭐ This is the failure mode AC5 names — it reads correctly in source and
does not reach the screen reader, so review passes and only an assertion catches it. Fixed on both,
and asserted per-Button.

⭐ **AC9 — the two sentences are verbatim in the resolver header, all three parts**, as `//` lines
(matching the existing style, not converted to a doc-block). The proving test reads the **source file**
and matches both **whitespace-normalised and EXACTLY**, so a reworded header fails. ⭐ The same header's
now-false *"keeps its exact exported signature … no apps/api call site changed"* is **CORRECTED**, not
left standing beside the new text — and the same correction is written into the apps/api wrapper,
which is where a reader would actually look for it.

⭐ **TRAP 7 HANDLED — the parity spec seeds the real basis** and asserts the public name **explicitly**
(`toBe('Rajesh Kumar Sharma')`) *before* comparing it to the member's, so a broken fixture fails loudly
instead of comparing `null` to `null`. ⚠ The run's own log confirms the inert state is real: the
no-basis case emitted the shipped `PROVISIONING-INERT` diagnostic.

⭐ **AC4b COMPLIANCE IS STATED** (`-195` cl.1): `-189` cl.3 holds in both directions —
no-basis (member sees the configured name, public sees none) and basis-satisfied (string equality).
⚠ And its **scope is stated too**: cl.3 is Trustee-scoped by `-195` cl.1 to the drive data class and
the six 11b split stories, and reaches `8-16` only through **author-committed** `-208` cl.5(b). ⛔ Not
a universal invariant; ⛔ not generalised.

⚠ **AC4 — the public fence is CITED, not duplicated:** `sahyog-drive.spec.ts:558` already fails the
moment anyone reaches for `resolvePoolIdentity` on that surface. ⛔ No public file was touched.

⭐ **TRAP 4 RESPECTED:** the mononym class is asserted **unchanged** — both modes agree, as they did
before this story. ⛔ No inversion is reported closed for that class.

⚠⛔ **RECORDED, ⛔ NOT SWEPT (two pre-existing drifts found in passing):**
① `epics.md`'s Epic-8 summary said **"12 stories"** and was already stale at 13 — it was not updated
when Story 8.13 was added by correct-course 2026-07-21. Recounted to **14** with the staleness named
in place, rather than silently corrected.
② The friction gate reports `member-public-web.page_weight_bytes` at **11471** where 11b.14's
disposition recorded **11229**. ⭐ **Verified not attributable here** — this diff touches no file under
`apps/public/`, and the metric measures **identically at HEAD and at HEAD~1's public-surface state**.
⛔ Neither claimed nor disowned ([[feedback_record_unattested_no_backfill]]).

⏳⛔ **FORWARD COMMITMENT — TASK 6b IS OPEN BY DESIGN, AND IS THE ONE THING THIS RUN CANNOT DO.**
A `dev-story` run ends at `review`, **before merge**. `deferred-work.md` item (e) is therefore left at
**⏳ CLOSING** at all three sites, ⛔ not CLOSED. **On merge**, item (e) must be recorded
**"CLOSED by [edit]"** at all three: the `### (e)` body, the 11b.3a bullet, and the `11b.2 (vii)` stub.
⚠⛔ **RECONCILE WITH SIBLING `11b-3b` AC8** (`11b-3b:544-549`), which rewrites item (e) *conditionally
on `8-16`'s merge state*: if `11b-3b` merged first it left the item *"re-affirmed open, binder
`8-16`"* → close it; if it has not, `8-16`'s closure stands and `11b-3b`'s "if merged → record
closure" arm becomes a **no-op**. ⛔ **Whichever merges SECOND must neither re-affirm the item open nor
re-record its closure** — one obligation, one record
([[feedback_circular_deferral_between_sibling_stories]]).

⚠ **ALSO CARRIED FORWARD (⛔ not this story's to do):** `epics.md` must not lose the `### Story 8.16`
section in a future `sprint-planning` run — that section is now what stops it, and the story is in
`sprint-status.yaml` under `8-16-member-pool-identity-name-form-alignment`.

### File List

**Production code (6)**
- `packages/domain/src/notifications/pool-identity.ts`
- `packages/contracts/src/contributions/active-contribution-card.ts`
- `packages/contracts/src/contributions/contribution-history.ts`
- `packages/contracts/src/contributions/contribution-note.ts`
- `apps/api/src/modules/member-pool/pool-identity.ts`
- `apps/api/src/modules/member-pool/handlers.ts`
- `apps/api/src/modules/member-pool/contribution-note.ts`
- `apps/api/src/modules/member-pool/note-template.ts`
- `apps/jobs/src/scheduler/contribution-notify-triggers.ts`
- `apps/mobile/components/active-contribution/ActiveContributionCard.tsx`
- `apps/mobile/components/yogdaan-bahi/YogdaanBahiRow.tsx`
- `apps/mobile/components/yogdaan-bahi/sample-data.ts`

**Generated (⛔ never hand-edited)**
- `openapi/v1.yaml` — re-emitted via `pnpm contracts:emit-openapi`

**Tests — NEW (3)**
- `apps/api/tests/integration/contributions/member-name-form-parity.spec.ts`
- `apps/jobs/tests/sms-segment-cost.test.ts`
- `apps/mobile/tests/unit/pool-name-form.test.ts`

**Tests — UPDATED (9)**
- `packages/domain/tests/notifications/pool-identity.test.ts`
- `packages/domain/tests/integration/kyc/kyc-substrate.spec.ts`
- `packages/contracts/tests/contributions.test.ts`
- `packages/ui/tests/contribution-list/forbidden-imports.test.ts`
- `apps/api/tests/unit/_pool-identity-fake.ts` (⚠ the positional mirror — moved in the same commit)
- `apps/api/tests/unit/active-contribution-card.test.ts`
- `apps/api/tests/unit/contribution-history.test.ts`
- `apps/api/tests/unit/contribution-note.test.ts`
- `apps/api/tests/unit/contribution-note-render.test.ts`
- `apps/jobs/tests/contribution-notify-triggers.test.ts`
- `apps/mobile/tests/unit/missed-cycle-section.test.ts`

**Governance / records (5)**
- `_bmad-output/planning-artifacts/epics.md` (⭐ the `### Story 8.16` section CREATED)
- `_bmad-output/implementation-artifacts/deferred-work.md` (item (e) × 3 sites; item (d) annotated)
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `friction-budget.md`
- `_bmad-output/implementation-artifacts/8-16-member-pool-identity-name-form-alignment.md` (this file)

### Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-09-08 | 1.2 | ✅ **`bmad-code-review` re-run — 1 `patch` found by Edge Case Hunter, 6 of Blind Hunter's 14 acted on, Acceptance Auditor re-verified all 7 round-1 fixes live and found them genuinely applied.** ⭐⭐ **A real regression in round-1's own fail-soft fix, caught this round**: a presentation-mode read failure fired BOTH the new specific alarm AND the pre-existing generic "pool identity unresolvable" one, and the second overwrote the true cause — fixed with a `presentationModeFailed` flag, and the round-1 test tightened from `toHaveBeenCalledWith` (any matching call) to `toHaveBeenCalledTimes(1)`. ⭐ The AC9 test's comment-stripping hardened beyond `//`-only. ⭐ `contribution-note.test.ts`'s AC2b assertion split into its own test. ⭐ `_pool-identity-fake.ts` reintroduced, for the mode's TYPE, the exact duplication risk round 1 removed for its LOGIC — now a type-only import of `PublicNamePresentationMode`. ⭐ A typo fixed; round 1's "9 dismissed" count enumerated in place (it was an unauditable bare number). ⚠ **Status clarification, not a change**: `Status: done` (set at the end of round 1) means this ledger's own definition — "Story completed," implementation + review — not "merged"; Task 6b's post-merge `deferred-work.md` closure stays a deliberately separate, later action regardless of this field, exactly as the story's own AC6/Task 6b text already said before round 1 touched anything. ⛔ 8 of Blind Hunter's 14 dismissed as false positives or diff-context artifacts of a narrower re-review diff — see the Review Findings section. Verified after: `typecheck` clean (`apps/api` `tsc --noEmit`), the 6 touched test files green (142 tests, +1 from the tightened alarm-count assertion). | Claude |
| 2026-09-08 | 1.1 | ✅ **`bmad-code-review` — 7 `patch` findings, all applied.** ⭐⭐ **Two false "done" claims corrected**: AC9's policy-sentence test and AC2b's first fence (the `resolvePublicNamePresentationMode`-appears-nowhere source scan) were both checked `[x]` / claimed built but did not exist — both now exist in `pool-identity.test.ts`, reading the resolver's own source, whitespace-normalised exact match. ⭐ **A fail-soft gap closed**: the presentation-mode read in `runContributionNotifyChild` (`apps/jobs`) now degrades the SAME way every other read on that path does — alarm + skip THIS pool, never an uncaught throw — with a test forcing the failure. ⭐ **The AC5 SMS baseline corrected**: `sms-segment-cost.test.ts`'s `BEFORE` fixture was already carrying this story's OWN new shielded-mode trailing period (the pre-story `familyLabel`/`familyDisplay` joins had none); re-measured with the true pre-story strings — **segments unchanged (still ZERO rise on all four pairs)**, units revised: hi cycle_open 97u/2seg → 100u/2seg (was 98→100) · hi day_14 100/2 → 103/2 (was 101→103) · en cycle_open 95/2 → 106/2 (was 96→106) · en day_14 109/2 → 120/2 (was 110→120). ⭐ **AC2b's "once per request" claim now has a call-count spy for all three `apps/api` consumers**, not jobs alone (low priority — beyond AC2b's literal text). ⭐ **`_pool-identity-fake.ts` no longer reimplements the form decision** — it now delegates to the REAL `resolveMemberFacingDeceasedName` (the same "inject the real pure function" pattern already used for `poolLetterCode`'s siblings), so a future change to the form rule cannot drift silently between the two; `splitFirstNameLastInitial` dropped from its deps (no longer needed). ⚠ **`deferred-work.md`'s 11b.2(vii) annotation reworded** — "discharged by `8-16`" → "discharge is owned by `8-16`" ([[feedback_closure_language_precision]]); the item is still ⏳ CLOSING, not closed. Verified after: `typecheck` + `lint` green across `@twt/domain`/`@twt/api`/`@twt/jobs`/`@twt/contracts`/`@twt/ui`; the 6 touched test files (141 tests) all green. **9 other raised findings verified FALSE and dismissed** — most notably the diff-construction false positive on `epics.md` (see the section note above), the SMS-privacy and `.max(128)`-sizing findings (both already ruled/disclosed in AC5 and AC3), and the escaping-injection claim on the widened `deceasedDisplayName` field (`note-template.ts`'s `esc()` already covers it uniformly). | Claude |
| 2026-09-08 | 1.0 | ✅⭐⭐ **IMPLEMENTED — `dev-story`. Status → `review`.** Three commits, governance first: `0082a2fc` (`epics.md` §Story 8.16 CREATED; FR-21 superseded BY NAME, ⛔ not edited) → `f5df1fae` (the code) → `863a1123` (the friction disposition, written AFTER the code commit — AC-4 diffs COMMITTED history). ⭐ `ResolvedPoolIdentity` + all THREE contracts shed the shielded PAIR for one `deceasedDisplayName`; `openapi/v1.yaml` re-emitted (only `ContributionHistoryResponse` moved, exactly as AC3 predicted). ⭐ The mode is an INPUT at both signatures — positional after `pariwarId`, ⛔ never folded into the per-POOL `input`; a new `resolvePoolNamePresentationModeForRequest` seam keeps the read with the caller. ⛔ **Trap 5 held**: a purpose-built `resolveMemberFacingDeceasedName`, ⛔ not `resolvePublicMemberName` and ⛔ not a fallback through it (its `''` conflates *unresolvable* with *unshieldable mononym*). ⛔ **Trap 6 held**: `familyDisplay` → `shieldedPartsDisplay` with ONE caller — the living member's own name — and the deceased no longer passes through it. ⭐ **SMS measured: ZERO segment rise** on all four (locale, kind) pairs; ⛔ nothing routed. ⚠⭐ **Every message is UCS-2, English included** — `formatCurrency` emits **₹**, which is outside GSM-7 and its extension table; ⇒ 70/67 throughout, and the Hindi body was already multi-segment at ANY name length. Made a TEST, ⛔ not a one-off measurement. ⚠⛔ **An a11y defect found and fixed**: four tamagui `<Button>`s carried an `accessibilityLabel` and ⛔ no `accessible` prop ⇒ the label was ⛔ never announced. ⚠⛔ **FOUR vacuous-pass traps closed, ⛔ not the one the story named** — the `MissedCycleEntry` guard and the history/note PII guards had the identical defect. ⭐ Trap 7 handled: the parity spec seeds the real basis and asserts the public name EXPLICITLY before comparing. ⚠ **ONE JUDGEMENT CALL STATED**: the `shielded_name` arm now emits the public form's trailing period (`"Rajesh S."`), because `INV-form` shares the FORM RULE and only ABSENCE may differ; ⛔ no Pariwar is on that mode today. ⚠⛔ **RECORDED, ⛔ NOT SWEPT**: `epics.md`'s Epic-8 summary was already stale at *"12 stories"* (Story 8.13 never updated it) — recounted to 14 with the staleness NAMED; and the friction gate's 11471 vs 11b.14's 11229 is ⭐ **verified not attributable here** (⛔ no `apps/public/` file touched; identical at HEAD and HEAD~1's public state). ⏳⛔ **TASK 6b IS OPEN BY DESIGN** — a run ends at `review`, ⛔ before merge, so item (e) is ⏳ **CLOSING** at all THREE sites, ⛔ not CLOSED; ⛔ ticking it would record a closure that has ⛔ not happened. **On merge**: record **CLOSED by [edit]** at all three, and reconcile with sibling `11b-3b` AC8 — ⛔ whichever merges SECOND neither re-affirms it open nor re-closes it. Tests (live DB :5433): domain **3338**/1 skipped · api **1227**/1 skipped · jobs **356** · contracts **1106** · mobile **454** · ui **254**. Gates: contracts-determinism · pii-scrape · i18n-parity · microcopy · domain-invariants · access-wrapper · governance-boundary · pool-state · alert-state · pool-bound-payment · friction-budget — ⭐ all green. | BigDev + Claude |
| 2026-09-08 | 0.8 | ⛔⛔ **RE-VALIDATED (`bmad-create-story validate`) — three independent verifiers, HEAD `c73887fe` (4 governance/doc commits past the v0.5 re-anchor at `091c3bfe`; ⛔ zero production code). ⛔ NO CRITICAL BLOCKER — the story stays `ready-for-dev` and STARTABLE.** ⭐ **The inverted-premise finding (Preflight STOP 2), the AC2 "+1 per pool not per member" re-justification and the AC5 SMS/i18n figures all RE-VERIFIED TRUE at HEAD** — `niy.public-disclosure.member-information` still has exactly one repo site (its own definition), ⛔ no seed / migration flipped the inert basis, so the app still shows MORE than the empty public page. **ONE structural gap fixed:** ⛔⛔ **AC6 closed `deferred-work.md` item (e) at only ONE of its THREE reference sites** — the `### (e)` body, ⛔ not the `:601` bullet (which stated a *different* binder, `11b.3b`) ⛔ nor the `### 11b.2 (vii)` "already open under item (e)" stub; and ⛔ it never acknowledged that sibling **`11b-3b` AC8 (`11b-3b:544-549`) is a co-writer** that rewrites item (e) conditionally on `8-16`'s merge state. AC6 + Task 6a/6b now enumerate all three sites (all binding `8-16`) and carry the co-writer reconciliation ([[feedback_circular_deferral_between_sibling_stories]], [[feedback_closure_language_precision]]). **Other applied:** ⭐ AC3's "SHAPE RULED HERE, NOT LEFT TO THE DEV" left the field **unnamed** — the validate pass names it **`deceasedDisplayName: string`** (⛔ not a `.strict()`-guarded token; `deceased*` per the sibling parts / the public `deceasedMemberName`) and threads it through AC3 / AC4 / Task 1 / Task 3 / Task 4 / the Project-Structure table — ⚠ **BigDev may rename**, but the identifier is now single-sourced · ⛔ AC3's *"`memberFullName` stays forbidden in **all three** guards"* was **false** — the `:102` card guard has ⛔ no member-own-name field (`deceasedNameCiphertext` / `deceasedFullName` / `nomineeName` / `nomineeBankAccount` only); corrected to `:478`/`:716` only · ⛔ Preflight STOP 1 said the `epics.md:5128` + `11b-11:818` corrections were routed to **Task 0** — they already **landed in `949a01ea`**; Task 0's scope narrowed to the new `### Story 8.16` section + FR-21 · ⚠ AC4b now records that `-189` cl.3 is **scoped by `-195` cl.1** to the drive data class + the six 11b split stories and reaches `8-16` only via **author-committed `-208` cl.5(b)** — ⛔ not a universal invariant · ⭐ the `pool-identity.ts:120-127` anchor (stale at **three** sites despite the drift table saying "corrected in place") → `:40-41` shape / `:122-123` producer; `:1-14` → `:1-15`; the brittle *"all 43 `8-16` matches are the date"* count dropped for the verified conclusion. ⚠ **Deliberately NOT swept:** a cluster of ±1–2-line anchor drifts (`formatCurrency` `:305`, the once-per-pool doc-block `:636-637`, `NAME_PUBLICATION_AUTHORISED` `:380-397`, the `7-11` precedent `epics.md:3048`) — verifiers disagreed by a line or two, every behavioural claim re-verified TRUE, and a half-accurate re-date adds error (the story's own instruction). ⛔ Zero code. ⛔ Zero sprint-status rows flipped. | BigDev + Claude |
| 2026-09-08 | 0.7 | ✅⭐⭐ **FRAMING CONFIRMED — `#decision-2026-09-08-209`. PREFLIGHT STOP 2 DISCHARGED ⇒ ⭐ BOTH STOPS CLEAR; THE STORY IS STARTABLE.** ⭐ **BigDev supplied the wording** (`-209` cl.1), giving a clean **three-part logic: what you see → why your Pariwar sees it → ⛔ why that does NOT imply public disclosure.** ⭐⭐ And it **dropped the word "full"**, which had made the sentence contradict itself — a `shielded_name` Pariwar sees ⛔ no full name. ⚠⛔ **The consequence is STATED, ⛔ not softened** (`-209` cl.2): on ship a contributing member on a **default `full_name`** Pariwar sees a **full legal name that ⛔ NOBODY can see publicly** — ⭐ a real widening of disclosure, and ⭐ **the decision**, ⛔ not a side effect of "matching the public page", which shows nothing. ⛔ The old justification (*"the same name anyone can already see on the public page"* / *"the app showed you less"*) is ⛔ **NOT available and must ⛔ not return** (cl.3). ⚠ A **third instance** of that same false comparison was found and corrected in the same edit — the **"I want" clause** still read *"the same way a stranger sees them named"*; ⛔ recorded, ⛔ not silently edited. ⭐ ⛔ NOT confirmed by `-209`: the basis is still ⛔ not adopted (AC4b) · the inert basis is ⛔ not "fixed" here · ⛔ no public surface moves · ⭐ and the **STRUCTURAL** inversion remains real — the moment the basis is provisioned, an unfixed member path sits **below** the public one, which is what `-179` cl.3 directed closed. ⚠ Task 0's governance-first STOP still binds. | BigDev + Claude |
| 2026-09-08 | 0.6 | ✅⭐ **PREFLIGHT STOP 1 DISCHARGED — `#decision-2026-09-08-208`.** ⭐ `11b-16` is **WITHDRAWN** (cl.1): it ordered the same edits at a narrower scope, and `8-16` — minted **two days earlier** by Panel direction — owns the work. ⇒ ⛔ the two-story collision is closed. ⭐⭐ **AND THE CLAUSE THIS STORY DEPENDED ON LANDED (cl.2): `-198`'s push carve-out is ⛔ VOID, ⛔ not superseded** — an author-committed entry never held authority to narrow Trustee-ratified `-180` cl.1 ⇒ **AC2's ALL-FOUR scope now stands unopposed**, and the repo no longer holds a live sentence telling a dev the opposite. ⭐ Routed IN by `-208` cl.3/cl.5/cl.6 and already applied: `-198` cl.1 (FORM ONLY) → **AC4b** · `-189` cl.3 both directions → **AC4b** + Task 4 · `-195` cl.1 → **AC4b** · the `epics.md:5128` range + `11b-11:818` mis-keying → **Task 0** · sequencing ⇒ **`8-16` before `11b-15`** (E's Task 7 re-pointed; it named `8-16` nowhere and would have dangled). ⚠ `sprint-status.yaml` still reads `11b-16: ready-for-dev` — ⛔ knowingly (`-208` cl.7): no `withdrawn` enum exists and minting one is a **ratified governance act**, routed to the Panel. ⛔⛔ **STOP 2 STANDS — the inverted premise is BigDev's to confirm; this story is still ⛔ not startable.** | BigDev + Claude |
| 2026-09-08 | 0.5 | ⛔⛔ **RE-VALIDATED (`bmad-create-story validate`) — 25 findings, three independent verifiers, ALL APPLIED. ⛔ THE STORY IS NO LONGER STARTABLE AS WRITTEN.** ⭐ **TWO PREFLIGHT STOPS**: (1) the duplicate `11b-16` is withdrawn by ruling but the **decision entry does not exist yet**, and that entry owes a clause **voiding** `-198`'s live *"the push keeps the shielded form"* directive; (2) ⛔⛔ **the story's PREMISE IS INVERTED ON EVERY DRIVE TODAY** — the publication-basis clause id has **one site in the repo, its own definition**, so the public page names ⛔ nobody and the app already shows **more**. The member-facing policy sentence was **false** and is rewritten. ⭐ **AC2's N+1 justification was FACTUALLY WRONG** — the resolver is called **once per POOL** (`contribution-notify-triggers.ts:636-637` says so); replaced with the real precedent. ⭐ **A FIFTH RENDER SITE** — `familyLabel` feeds `:304` **and `:340`** (deadline reminders); *"four consumers"* is true of CALL sites only. ⭐ **Trap 6** — `familyDisplay` is shared with the **living** member's name (`note-template.ts:145`); changing it in place un-shields PII with no ruling. ⭐ **Trap 7** — a parity test passes vacuously against `null` unless the basis is seeded. ⭐ Contracts **1 → 3**, and the obvious field name `deceasedFullName` is **forbidden by three PII guards**. ⭐ `openapi/v1.yaml` re-emit — the determinism gate fails the push. ⭐ **Task 0's unchecked subtasks ordered a STOP and a re-ruling of `-181`** — boxes ticked. ⭐ Two ruled-in consumers were still marked *"only if `INV-scope` includes it"*. ⭐ Added: `baseline_commit` frontmatter, AC2b (fences with provers), AC4b (the FORM-ONLY carrier + `-189` cl.3 both directions), **AC7 friction-budget**, **AC8 `epics.md` creation** (the `7-11` precedent's dropped second half), real test paths + the `DATABASE_URL` silent-skip trap, the six `{family}` i18n keys, the **UCS-2 70/67** SMS ceiling (160 is the wrong figure for Hindi), the wrapper-signature contradiction, `deferred-work.md` item **(d)** vs **(e)**, and the PRD FR-21/33/74 traceability. ⛔ Zero code. ⛔ Zero rows flipped. | BigDev + Claude |
| 2026-09-02 | 0.4 | ✅✅ **`INV-form` RULED MODE-RESOLVED** (BigDev, `2026-09-02-181`) ⇒ ⭐⭐ **TASK 0's STOP GATE IS DISCHARGED — THIS STORY IS STARTABLE.** The member side reads the **same stored per-Pariwar mode** the public side reads, so the two forms ⛔ **cannot diverge again by construction**. ⛔ The mode is an **INPUT**, ⛔ not a DB read inside the resolver — it is **per-Pariwar** while the fan-out is **per assigned member**, so an inside read is an **N+1 across the whole fan-out**. ⛔⛔ **AND THE RULING CREATED `Trap 5`:** ⛔ `resolvePublicMemberName` may ⛔ **not** be reused verbatim — it **omits mononyms** (ruled `-145` cl.3 for the *public* directory), so reusing it would turn *"show the family's single name"* into *"OMIT THE POOL"* on all four surfaces. ⭐ Share the **MODE**, ⛔ never the whole function: same form rule, ⛔ different absence behaviour. ⚠ Also recorded: the setting's **semantic widening** (⛔ record at the setting, ⛔ do not rename) and that the **default** (`full_name`, ⛔ not fail-closed) carries across unchanged. | BigDev + Claude |
| 2026-09-02 | 0.3 | ✅✅ **`INV-scope` RULED — ALL FOUR** (Kalpana Bharti, Dhiraj Rahul; `2026-09-02-180`). The full name renders on **every** consumer, including the **Contribution Note PDF** and the **cycle-open push / WhatsApp / SMS**. ⇒ ⭐ the inversion **CLOSES** (⛔ not narrowed — **Q2 VACATED**, so AC6's narrowed branch does not arise), ⚠ **on SHIP, ⛔ not on ruling**; and ⭐ **the resolver's *"one identity everywhere"* property is PRESERVED** — ⛔ no split, and a future divergence reverses `-180`. ⛔ **`INV-form` STILL BLOCKS, and this ruling made it matter MORE:** under all four, hard-coding the full name means a Pariwar that shields publicly still pushes a full name to handsets and into a forwardable PDF ⇒ the case for **mode-resolved** is materially stronger. ⚠ AC5's microcopy re-check is now **live, ⛔ not conditional**, and the **SMS segment length** must be measured (WA/SMS are the paid channels, reached when push fails). | BigDev + Claude |
| 2026-09-02 | 0.2 | ⭐ **The `INV-scope` packet is WRITTEN AND ROUTED to the Panel** — `trustee-panel-routing-note-2026-09-02-8-16-inversion-scope.md`. ⏳ Routed, ⛔ nothing ratified; Task 0 stays a STOP gate. ⭐ **Three findings of the packet-writing pass, all verified:** ① the cycle-open notification **does** carry the name (`contribution-notify-triggers.ts:251-253` joins the parts; the copy renders *"Standing with {family}'s family"*) ⇒ consumer ④ is ⛔ not hypothetical · ② the audience is **bounded** — *"per member assigned to a pool in that cycle"* ⇒ the **pool roster, dozens**, and they are the contributors who see the full name in-app anyway ⇒ the real delta is *"also on a lock screen"*, ⛔ not *"to strangers"* · ③ ⭐ **the four consumers are the COMPLETE set** — `close-of-cycle`'s `{familyName}` has **zero production suppliers** and the Noticeboard renders none, so ⛔ **no fifth surface**. | BigDev + Claude |
| 2026-09-02 | 0.1 | Story minted by **Panel direction** (`2026-09-02-179` cl.3 — *"the public/member inversion gap shall be closed"*), discharging **`INV-owner`**. ⭐ Against **Epic 8**, which owns `resolvePoolIdentity` and its four consumers (the **`7-11` precedent**: mint against the epic that owns the **write path**). Two decisions carried OPEN: **`INV-scope`** (⛔ the **Panel's** — two consumers leave the app, and the ruling does not distinguish push from pull) and **`INV-form`** (hard-coded vs mode-resolved — ⚠ hard-coding re-creates the inversion the moment a Pariwar shields publicly). ⚠ Two findings of the authoring pass: the resolver emits **PARTS**, so this is a **shape change** across four consumers plus a contract; and **mononyms already render in full** on the member side, so part of the "inversion" is ⛔ not real and must ⛔ not be reported as closed. | BigDev + Claude |
