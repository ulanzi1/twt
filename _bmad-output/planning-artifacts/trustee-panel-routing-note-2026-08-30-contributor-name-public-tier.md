# Trustee Panel routing note — 2026-08-30
## On what authority, and in what FORM, does a CONTRIBUTOR's name render at the `public` tier?

**Author:** BigDev, Solo Builder — 2026-08-30
**Occasion:** Story 11b.2 (the `@twt/ui` `contribution-list` presenter) authoring + three validation
passes. Decision **D7-nameform(a)** — transcribed as `.decision-log.md#decision-2026-08-30-168`
**cl.4** — ruled that this story **records the question and rules NOTHING**. ⛔ Nothing 11b.2 builds
requires an answer; it is raised because **Story 11b.3 cannot start without one**, and the evidence
was assembled here.
**Routed to:** Trustee Panel · **Adv. Mohit Agrawal** (engaged counsel since 2026-06-21; T&C return
due **2026-09-07**).
**Status:** ✅ **ANSWERED 2026-09-02** — §12 — and ⚠ **§12's Q3 was CORRECTED the same day at §13**
(`.decision-log.md#decision-2026-09-02-175`, **Panel-ratified**). ⭐ **The standing position is:**
Q1 **YES** · Q2 **THE FULL NAME**, ⭐ **unconditionally** · Q3 ⛔ **the staged reduction is the NOMINEE
BANK fields' and does ⛔ NOT reach a contributor's or the deceased member's name**.
⚠ **Read §13 with §12 — ⛔ §12 is left exactly as relayed and is ⛔ not rewritten.**

> ### 📖 **Panel members — please start at [Appendix A: In plain words](#appendix-a--in-plain-words).**
> It is at the end of this note and it is **complete on its own** — the whole question, the options,
> and what follows from each, with ⛔ no technical detail. ⭐ **You can answer this note from
> Appendix A alone.** The numbered sections are the **evidence**, written for the engineering record.
> ⛔ You are not expected to read them.
>
> *(Appendix added 2026-09-02, in the same form as the note you answered that day.)*

> ⭐⛔ **THE HEADLINE: THE BASIS IS SETTLED AND THE FORM IS NOT — AND ⛔ NOTHING IN THE TREE SAYS SO.**
> Story 11b.3's AC rests contributor names on *"those members' own T&C"*, so **why** a contributor's
> name may appear publicly is answered. But **which name** — full, or first-name + last-initial, or
> something else — is **UNRULED**, has been since 2026-08-19, and is re-affirmed undisturbed at
> `.decision-log.md:1061`.
>
> ⚠⛔ **AND THE COUNTERWEIGHT IS ⛔ NOT "EXACTLY ONE COMMITTED DOCUMENT". IT IS THREE.** That claim was
> asserted three times in this story's own history and it was **false** each time. ⛔ The correction
> matters to the Panel because it changes how much unruled practice is already assumed in writing.

---

## 1. What is being asked, precisely

Two questions, and they are **separable**:

**(Q1) — the DECLARATION.** May `contributor_name` be declared at the `public` tier on a Sahyog Drive
/ Sahyog Vivran surface at all? That is a `(surface, field)` pair in `matrix.ts`'s ruled Tier-1
public-exception allowlist, and **adding one is a RULING, ⛔ never a code edit** — the file says so on
its own face (`matrix.ts:388-391`): *"⛔ ADDING TO THIS LIST IS A RULING, NEVER A CODE CHANGE … do NOT
'fix' a failing third entry by appending it here — that inverts the control. **The gate failing is the
gate working.**"*

**(Q2) — the FORM.** If yes, in what form does it render?

⚠ **Q2 is ⛔ not a sub-case of Q1**, and ⛔ neither is answered by the other.

## 2. ⭐ The allowlist has **TWO** entries, and ⛔ NEITHER is a contributor

Verified in the file at the SHA below (`matrix.ts:392-404`; ⚠ the `Map` literal **closes** at `:404`):

- `member-directory.member_name` (`:394`) — cites `2026-08-19-135` cl.7(c) / `-136`.
- `sahyog-drive.deceased_member_name` (`:403`) — cites `2026-08-24-159` cl.2 (D1(b)).

⇒ ⛔ **There is no contributor entry, on any surface.**

⚠⛔ **AND `matrix.ts:401-402` IS ⛔ NOT A THIRD ONE.** Read in full it keeps **11b.3 and 11b.6** at
first-name + last-initial for the **deceased member's** name, and says *"moving them requires each
surface's OWN Panel ruling."* ⛔ It is ⛔ not about a contributor.

## 3. ⭐ The THIRD widening is **four nominee-bank fields on a different surface** — ⛔ nothing contributor-shaped

`2026-08-28-165` **cl.1** ruled all four fields in scope — `account_holder_name` · `account_number` ·
`ifsc` · `vpa` — on **`sahyog-vivran`**, and **cl.3** ruled that **Story 11b.3 adds them at surface
declaration**, ⛔ not this entry. ⇒ they are ⛔ **not yet in `matrix.ts`**, and their arrival will ⛔
**not** create a contributor precedent: they are **disbursement-channel** fields, ⛔ not a person's
public identity on a contributor list.

## 4. ⚠⛔ `-165` **cl.2** is scoped to ACCOUNT fields — and the extension to a contributor name is an INFERENCE, ⛔ not a ruling

cl.2, verbatim in the Panel's own terms: *"Do not create a separate Tier-1 classification merely
because the public projection is masked. **The underlying account fields remain Tier-1.** Treat masking
as a presentation/projection policy."*

⇒ the natural extension — *"a **shielded** contributor name (first-name + last-initial) is **still
Tier-1**, so shielding does not lower its tier"* — is, in these words:

> ⭐ **A SOUND INFERENCE, VIA `pii_tier` BEING A FACT ABOUT THE DATA** — the matrix's own schema
> comment says so (`public-vs-private-matrix.yaml:60`: *"a FACT about the data; ⛔ never changed to
> permit a render"*) — ⛔ **and NOT something the ruling decided.**

⚠ The Panel is asked to notice the difference. cl.2's subject was **bank account fields**; extending
it to a **person's name** is this author's reasoning, offered openly so the Panel can reject it. ⛔ It
is ⛔ not presented as settled.

## 5. ⭐ THE ASYMMETRY — the BASIS is settled; the DECLARATION and the MECHANISM are not

| Layer | State |
|---|---|
| **The BASIS** — *why* a contributor's name may render publicly | ✅ **SETTLED.** Story 11b.3's AC rests it on *"those members' own T&C"*. `2026-08-28-160` **cl.7** (`.decision-log.md:746-750`) cleared **all three** 11b surfaces, superseding `-157` cl.3's hold. |
| **The DECLARATION** — the `(surface, field)` matrix pair | ⛔ **NOT MADE.** Two entries, neither a contributor (§2). |
| **The FORM** — full name vs first-name + last-initial vs other | ⛔ **UNRULED** since 2026-08-19 (`.decision-log.md:1061`). |
| **The MECHANISM** — what actually gates it at render time | ⛔ **NOT BUILT** (§7). |

⚠ ⛔ **This asymmetry is the whole reason the note exists.** A reader who checks only the basis
concludes the question is answered. It is not.

## 6. ⚠⛔ THREE committed documents already ASSUME first-name + last-initial for CONTRIBUTORS — ⛔ and none is a ruling

This is the correction the Panel most needs, because the prior framing (*"exactly ONE committed
document"*) understated the standing practice by a factor of three:

1. ⭐ **`epics.md:3145`** — **the load-bearing one.** Story **8.3**'s own *"I want"*, which names the
   audience as *"any pool member viewing the My Pool card **or any visitor on Sahyog Drive (Epic
   11b)**"* and specifies *"(first-name + last-initial only)"*. ⇒ the **public** contributor case was
   contemplated in an epic AC **two epics before** Epic 11b.
2. **`epics.md:3238`** — the receipt PDF embeds the contributing member's *"first-name + last-initial"*.
3. **`epics.md:4931`** — Story 11b.2's own epic AC.

⇒ ⭐ **"Unruled" survives against THREE assumptions, ⛔ not one — and it survives for exactly one
reason: ⛔ an epic AC is ⛔ not a ruling.**

⚠ **The shipped WIRE already implements the shielded form**, so a ruling either way costs no
migration: `packages/contracts/src/contributions/pool-contributor-list.ts:42-51` —
`ConfirmedContributorRow = { firstName: min(1), lastInitial: max(16) }`, `.strict()`. ⛔ That is a
**built-to** form, ⛔ not a ratified one.

## 7. ⛔ THE 11b.9 PRECEDENT IS **INERT** TODAY — and its wait is a ruled **CHOICE**, ⛔ NOT a block

The Panel will reasonably ask whether the T&C-version mechanism that grounds the *basis* is available
to gate the *form*. ⛔ **Today it is not, and presenting it as a working mechanism would misstate the
tree:**

- ⛔ **No `clause_versions` row is minted.** The predicate is **false for every member**.
- ⚠ **Story 11b.9's Task 1 — and ⛔ ONLY Task 1 — WAITS**, on counsel's T&C return (**2026-09-07**)
  **and** on a second real person holding `niyamavali.review` (`11b-9-…md:935, :945`).
- ⭐ **Its Tasks 2-8 are ⛔ NOT waiting** — they shipped **inert by design**, and 11b.9 ruled that
  posture *"not merely permitted — they are the ruled posture."*

⚠⛔ **AND THE WORD *"BLOCKED"* IS ⛔ NOT USED OF 11b.9 ANYWHERE IN THIS NOTE, DELIBERATELY.** 11b.9
ruled the wait a **CHOICE, ⛔ not a constraint**. Calling a deliberate choice a block would misstate
the precedent **to the very body being asked to rule on it**
([[feedback_closure_language_precision]]).

## 8. ⚠ THE MOST ADJACENT FAMILY-FACING CONTROL NO LONGER EXISTS

`2026-08-28-162` **cl.2** retired **`sahyog_vivran_publication`** and **`in_memoriam_listing`**
alongside `sahyog_drive_publication`. ⇒ the consent type most adjacent to a contributor list on
`/sahyog-vivran` is ⛔ **gone as a family-facing control**; `sahyog_drive_publication` is
**preserved-but-de-authorised** ([[project_11b_consent_model_c5_superseded]]).

⇒ ⛔ **The Panel cannot route this question to a per-subject consent tick-box. There is none, by
ruling.**

## 9. What is put to the Panel

1. **Q1 — the DECLARATION.** Should a `(surface, field)` pair for a contributor's name be added to
   `matrix.ts:392`'s ruled allowlist, and on which surface(s)?
2. **Q2 — the FORM.** Full name, or first-name + last-initial, or another form — **for CONTRIBUTORS**,
   distinctly from the deceased member, whose form was ruled separately at D10 and is itself ⛔ still
   awaiting Panel ratification (`deferred-work.md` 11b.1 item (e)).
3. **Q3 — the ASYMMETRY.** Does the settled **basis** carry any weight on the **form**, or are they
   fully independent? ⚠ This author's view is that they are independent, and offers it as a view.

## 10. ⚠ A precondition the Panel should know about

⭐ **The public/member INVERSION is already open and binds the answer.** `resolvePoolIdentity` shields
the same family's name on the **member-facing** My Pool card, passbook and notifications (8.6/8.7/8.8)
— so a permissive ruling here can make the **public** page show **MORE** than the **member app** does
for the same pool. It sits at `deferred-work.md:289-292` under 11b.1 item **(e)** (`:281`), with the same
*"binds 11b.2 and 11b.3"* language. ⛔ Not re-filed here; ⛔ two records of one obligation is its own
failure.

## 11. What this note does ⛔ NOT do

⛔ Does **not** rule, ratify, amend or apply anything · ⛔ does **not** add a matrix entry (that is the
ruling being sought, and appending one would **invert the control**) · ⛔ does **not** declare a
surface or a field · ⛔ does **not** block Story 11b.2, which builds nothing that needs an answer —
its presenter emits name **PARTS** and ⛔ never joins them, precisely so that ⛔ nothing in it decides
the form (`-168` cl.6) · ⛔ does **not** advance Row 17 · ⛔ does **not** re-open the settled basis ·
⛔ mints **no** launch-gate roster row · ⛔ does **not** claim the contributor list is authorised to go
live, which remains a matter of deployment plus the counsel/Panel process, ⛔ never a code mechanism
and ⛔ never the publication kill switch.

⚠ **And the phrasing rule binds every line above:** *"counsel has not reviewed X"* — ⛔ **never**
*"counsel is not engaged"*, which is **false and has been since 2026-06-21** (`2026-08-24-158`).

---

## Sources — every one read at `6028581`

- `packages/contracts/src/public-pages/matrix.ts:388-391` (⛔ adding is a RULING; *"the gate failing is the gate working"*) · `:392-404` (the TWO-entry allowlist; the `Map` closes at `:404`) · `:394` · `:403` · ⚠ `:401-402` (the **deceased member's** name on 11b.3/11b.6 — ⛔ NOT a contributor's)
- `packages/contracts/public-pages/public-vs-private-matrix.yaml:60` — `pii_tier` is *"a FACT about the data; ⛔ never changed to permit a render"* (the inference in §4 rests on this) · `:358-364` (the exception's own `scope:`, reserving a change to a Panel ruling)
- `.decision-log.md#decision-2026-08-28-165` **cl.1** (four nominee-bank fields on `sahyog-vivran`) · **cl.2** (masking is a presentation policy; ⚠ scoped to **account** fields) · **cl.3** (11b.3 adds them at declaration; ⛔ not yet in the file)
- `.decision-log.md#decision-2026-08-28-162` **cl.2** — `sahyog_vivran_publication` + `in_memoriam_listing` retired
- `.decision-log.md:746-750` (`-160` **cl.7** — clears all three 11b surfaces, superseding `-157` cl.3; ⚠ ⛔ NOT at `:676-680`, which is cl.3's preserved **basis**)
- `.decision-log.md:1061` (the contributor/donor name form stays **UNRULED**) · `:1068-1069` (`2026-08-24-159` **cl.12** — the TWO committed records reserving a public name-form change to the Panel; ⚠ ⛔ the reservation is NOT at `:1061`)
- `.decision-log.md#decision-2026-08-30-168` **cl.4** (D7-nameform(a) — the ruling that produced this note) · **cl.6** (D9(a) — why 11b.2 decides nothing here)
- ⭐ `_bmad-output/planning-artifacts/epics.md:3145` (Story 8.3's own *"I want"* — *"any visitor on Sahyog Drive (Epic 11b)"*, *"first-name + last-initial only"*) · `:3238` (the receipt PDF) · `:4931` (11b.2's epic AC) · `:4868` / `:4888` (the Panel reservation for contributors)
- `packages/contracts/src/contributions/pool-contributor-list.ts:42-51` — the shipped shielded wire shape, `.strict()` at `:51`
- `_bmad-output/implementation-artifacts/11b-9-sahyog-drive-publication-authority-switch.md:139-140` (the lifted hold) · `:570` (the de-authorised gate) · `:574-576` · ⭐ `:935`, `:945` (the wait is a **CHOICE**, ⛔ not a constraint — the reason *"blocked"* appears nowhere above)
- `_bmad-output/implementation-artifacts/deferred-work.md:281` + `:289-292` (11b.1 item (e) — the public/member inversion, already open) · `:296-313` (item (f), discharged by Story 11b.2) · `:7-196` (⭐ THIS story's own section). ⚠⛔ **These are POST-INSERT line numbers.** Story 11b.2's section was prepended on 2026-08-30 per the file's newest-first discipline, shifting every 11b.1 anchor down by **192** — so the pre-insert citations `:89` · `:97-100` · `:104-121` that appear in `-168` and in older documents were TRUE WHEN WRITTEN and now point 192 lines short. ⛔ The ITEM LETTERS are stable; cite those.
- Memory: [[feedback_closure_language_precision]] · [[project_11b_consent_model_c5_superseded]] · [[project_dpdpa_counsel_engaged_but_unrecorded]] · [[project_directory_launch_gated_on_killswitch_ui]]


---

## 12. ✅ ANSWERED — 2026-09-02 (BigDev, relaying the Panel). Logged as `2026-09-02-174`

**Ratifying trustees:** **Dhiraj Rahul**, **Kalpana Bharti**.

| | Question | Answer |
|---|---|---|
| **Q1** | May a contributor's name render at `public`? | ✅ **YES** |
| **Q2** | In what form? | ✅ **THE FULL NAME** |
| **Q3** | *(as put: are basis and form independent?)* | ⚠ **Answered differently, and more usefully:** *"stick to full name and the progressive disappearance of name/surname as ratified earlier"* ⇒ **`2026-08-28-160` cl.10's staged schedule is EXTENDED from bank fields to a person's name** |

⚠⛔ **Q3's referent was ⛔ NOT INFERRED.** The relayed phrase named a prior ratification without citing
it; the candidates were put back to BigDev, who identified **cl.10**. ⛔ The agent transcribes; it
⛔ never re-grounds a ruling.

### ⭐ §4 IS CLOSED BY RULING — in the direction of extension

§4 recorded that applying cl.10/cl.2 reasoning — whose subject was **bank account fields** — to **a
person's name** was *"a SOUND INFERENCE … ⛔ and NOT something the ruling decided"*, and offered it
*"so the Panel can reject it."* ⭐ **The Panel did not reject it. It adopted it.** ⇒ the inference is
now a ruling for **cl.10's SCHEDULE**, which is what was put and answered. ⛔ Nothing is ruled on any
other clause by analogy.

### ⭐ §6 WORKED — the ruling went AGAINST the standing practice

§6 disclosed that **three** committed documents assume first-name + last-initial, and that the
**shipped wire implements it**. ⭐ **Q2 overturned all four.** ⇒ `epics.md:3145` · `:3238` · `:4931`
are now **stale and owe annotation** (⛔ annotation, ⛔ never a rewrite), and
`ConfirmedContributorRow = { firstName, lastInitial }` is the wrong shape for this surface.

### ⚠⛔ What Q3 does ⛔ NOT settle — and it is more than it settles

- ⛔⛔ **NO STORY BUILDS IT.** 11b.3a's schedule covers the **four nominee bank fields**; 11b.3b renders
  names with ⛔ **no time dimension at all**. The ruled behaviour is owned by ⛔ **nobody today**.
- ⛔ **What "masked" MEANS for a name is undefined.** cl.10(e) defines it for bank details (last 4 +
  bank/branch/IFSC). ⚠ The ratified `full_name` → `shielded_name` → omitted ladder is the natural
  analogue — ⛔ but that is an inference, ⛔ not this ruling. → **D13-maskedname**.
- ⛔ **Whether the name schedule shares 11b.3a's substrate is a POLICY question**, ⛔ not a schema one:
  one row means a Pariwar cannot hide bank details quickly while letting names persist. → **D12-schedule**.
- ⛔⛔ **THE SPLIT-COMMITMENT RISK.** The Panel authorised full names **together with** their
  disappearance. The permissive half is **cheap**; the protective half is **expensive**. ⇒ shipping the
  first without the second publishes **full legal names of living members, permanently**, on an
  authority granted **conditionally**. → **D14-order**, ⛔ not an authoring choice.

### ⛔ Still owed after this round

⛔ **D12-schedule** · ⛔ **D13-maskedname** · ⛔⛔ **D14-order** (may full names ship before the
schedule?) · ⛔ the **three stale epic ACs** owe annotation · ⚠ **Q3-as-asked** — whether basis and
form are independent — is recorded **NOT ANSWERED**, ⛔ not answered in the negative.

---

## 13. ⚠⭐ CORRECTED — 2026-09-02, **Panel-ratified**. Logged as `2026-09-02-175`

**Ratifying trustees:** **Kalpana Bharti**, **Dhiraj Rahul** — ⭐ the **same two** who answered §12,
in the **same day's session**.

⛔ **§12 is left exactly as relayed and is ⛔ NOT rewritten** ([[feedback_supersede_never_reinterpret]]).
This section records the correction beside it.

**What happened.** BigDev, who carried the Panel's answers at §12, read the transcribed ruling back and
identified that **Q3's answer did not reflect the Panel's intent**. The correction was **put back to
the Panel**, and **the Panel ratified it**. ⭐ ⛔ It is ⛔ **not** an author re-reading ratified words —
that would not have been a relay's call.

**The correction.** The *"progressive reduction of public exposure"* is the **NOMINEE BANK fields'** —
which is exactly what `2026-08-28-160` **cl.10** already ruled, over `account_holder_name` ·
`account_number` · `ifsc` · `vpa`. ⭐ **The *nominee's* name is the phrase's true referent.**
⇒ ⛔ it does ⛔ **NOT** reach the **contributor's** name, and ⛔ **NOT** the **deceased member's**.

| | Standing position after §13 |
|---|---|
| **Q1** — may a contributor be named? | ✅ **YES** — ⛔ unchanged |
| **Q2** — in what form? | ✅ **THE FULL NAME** — ⛔ unchanged, ⭐ **and now UNCONDITIONAL** |
| **Q3** | ⛔ **No staged reduction applies to a contributor's name.** cl.10 is unchanged and covers the nominee bank fields, as it always did |

### ⭐ What this changes

- ⭐⭐ **The word *"conditionally"* is WITHDRAWN from Q2's permission.** The condition was §12's Q3.
- ⭐⭐ **Story 11b.3b's Task 0 STOP GATE IS LIFTED.** Both name questions are ruled, unconditionally.
- ⛔ **Four decisions are VACATED — ⛔ not rejected, ⛔ not answered in the negative. Their questions
  ceased to exist** (the `2026-08-24-159` precedent — *"(a) did not become wrong, its QUESTION ceased
  to exist"*): **D14-order** (the STOP gate — ⭐ **gone**) · **D12-schedule** · **D13-maskedname** ·
  **D11-order**.
- ⛔ **Story 11b.3a is UNAFFECTED** — cl.10 never moved, so its masking schedule returns to a **single
  subject**.

### ⛔ What this does NOT change

- ⭐ **§6 still stands, and Q2 still overturns the standing practice.** `epics.md:3145` · `:3238` ·
  `:4931` remain **STALE** and owe **annotation**; the shipped wire is still the wrong shape here.
- ⛔ **`2026-09-02-173` (the deceased member) is untouched** — and its **counsel clause is still
  outstanding**, so ⛔ **no deceased-member name renders** until that written rule exists and is pinned.
- ⚠ **§4 returns to an OPEN INFERENCE — ⛔ neither adopted nor rejected.** §12 appeared to adopt it;
  §13 withdraws the adoption. ⛔ It is ⛔ **not** now *"rejected by the Panel"*, and ⛔ nobody may cite
  §13 as having decided it either way ([[feedback_closure_language_precision]]).
- ⚠ **Q3-as-asked** — whether basis and form are independent — is **STILL NOT ANSWERED**, by either
  §12 or §13.

⭐ **Caught between transcription and implementation. ⛔ Nothing had been built against §12's Q3**, so
the correction costs **zero rework**.

---

# Appendix A — In plain words

*Added 2026-09-02, at BigDev's direction, in the same form as the 2 September note. ⛔ Nothing here is
new — it is §1–§11 above without the technical detail. Where the two differ, the numbered sections
govern.*

> ## ✅ **This has now been ANSWERED — 2026-09-02.**
> **1. May a contributor be named? — YES.  2. In what form? — THE FULL NAME.**
>
> ⚠ **Question 3 was corrected the same day, and the Panel approved the correction.**
> The answer first recorded said a contributor's name should **fade over time**. That was a
> misunderstanding: **the fading was always about the family's BANK DETAILS** — including the name on
> the account — and ⛔ **not** about the people who contributed, or the member who died.
>
> ⭐ **So the position is simply: a contributor is named, in full, and the name does ⛔ not fade.**
> Nothing else you decided changes, and nothing had been built on the mistaken version, so it cost
> nothing to put right.
>
> *The rest of this appendix is kept as the record of what was asked.*

## What this is about

When a colleague dies, other members contribute to a drive for that family. Afterwards the drive has a
**public page** so that anyone — a family member, a prospective member, a journalist — can check the
Trust really moved the money.

**The question is whether the people who CONTRIBUTED may be named on that page, and if so, how much of
their name.**

## ⚠ Whose names — this is NOT the question you answered on 2 September

| Whose name | Which question |
|---|---|
| The member who **died** | ✅ **You answered this on 2 September** — yes, full name. ⛔ **Not this note.** |
| The **colleagues who contributed money** | ⭐ **THIS NOTE.** Still open. |
| The family member whose **bank account** receives the money | ⛔ A separate question, not before you. |

⚠ **These are different people, and one difference is worth holding in mind:** the member who died is
**one person per drive**. The contributors are **many living colleagues**, one row each, on every
drive they gave to.

## Where things stand

- **WHY their names may appear is already settled.** Contributors are members, and they accepted the
  Trust's terms themselves. That basis was cleared on 28 August. ⛔ Nobody is asking you to re-open it.
- **WHAT FORM the name takes was never decided** — not by anyone, at any point. It has been open since
  19 August.

⚠ **A reader who checks only the first line concludes the question is answered. It is not.** That gap
is the only reason this note exists.

## ⚠ Something we must disclose, because it works against us

**Three of our own planning documents already assume "first name + last initial"** — one of them
written two stages of work before this page was even designed, and the software already stores names
that way today.

⛔ **None of those is a decision of yours.** A planning document is not a ruling. We are telling you
this plainly rather than letting the existing practice quietly stand in for your answer.

⭐ **And it costs nothing either way.** Whichever form you choose, there is **no rebuild and no data
migration** — the change is small. ⛔ Please do not let "it is already built that way" weigh on the
answer.

## ⚠ One option that is no longer available

You **cannot** answer this by saying *"ask each member for permission first."* The tick-box that would
have done that was **retired by ruling on 28 August**. There is no per-person consent to route this to
— the basis is the terms they already accepted, or nothing.

## What we are asking you

1. **May a contributor's name appear on the public page at all?** Yes / No / Not yet.
2. **If yes — in what form?** The **full name**, or **first name + last initial** (e.g. "Ramesh K.")?
3. **Does the reason we may publish tell us anything about how much to publish?**
   Our view is that these are **independent** questions — the fact that someone agreed to the terms
   does not by itself say whether their full name or a short form should appear. ⚠ We offer that as a
   view, ⛔ not as a recommendation, and you may disagree.

## What happens with each answer

| Your answer | What follows |
|---|---|
| **Yes, first name + last initial** | Matches what the software already does. The list shows "Ramesh K.". |
| **Yes, full name** | The list shows full names. Small change, no rebuild. |
| **Not yet / No** | The page ships **with no contributor list**. ⛔ Nothing breaks — the rest of the page works. It can be revisited at any time. |

## ⚠ Two things worth knowing before you decide

1. **The member app currently shows *less* than the public page does**, for the same family. That gap
   already exists and your 2 September answer widened it. A permissive answer here widens it again.
   It is recorded as a separate open item and ⛔ this note does not ask you to fix it.
2. **This list is a record of who stood behind a family — ⛔ not a ranking.** Whatever you decide, the
   page will never rank contributors, show "top givers", or add badges or scores. That is already
   fixed and is ⛔ not part of this question.

## What this note does not do

⛔ It decides nothing — it only asks · ⛔ it does **not** re-open why contributors' names may appear ·
⛔ it does **not** touch the member who died (answered 2 September) or the family's bank details ·
⛔ and it publishes nothing: **built is not published**, and no page goes live to the public on the
strength of this note.

## Why it matters now

⭐ **This is the last thing holding up the work.** The other question on this page was answered on
2 September; **this one is the only remaining blocker**, and the work cannot begin until you answer
it — even with a "not yet", which is a complete and legitimate answer.

## If you want to answer

**Questions 1 and 2 are enough** to unblock the work. **Question 3** is useful for the record but the
work does not wait on it.
