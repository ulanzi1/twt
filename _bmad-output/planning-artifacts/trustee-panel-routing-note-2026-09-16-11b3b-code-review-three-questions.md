# Trustee Panel routing note — 2026-09-16

> ## ✅ PANEL RULING — recorded 2026-09-16 (Dhiraj Rahul + Kalpana Bharti)
>
> **Q1 → Option E.** The public contributor list renders a **placeholder row** in each omitted
> position, so the rendered rows match `total`. ⚠⛔ **Ratified on the FAIRNESS ground, ⛔ not the
> privacy one — and the record must ⛔ never say this closes the leak: it WIDENS disclosure.** Today
> the count is derivable by arithmetic and a position needs probing; with a placeholder both are
> visible at a glance. What it buys is that **every** reader learns what only an arithmetic-minded one
> learns today. ⇒ `2026-08-30-169` **cl.1 (D5)** is **SUPERSEDED IN PART**, ⚠ **for the PUBLIC surface
> only** — the member-facing list at `packages/ui/src/contribution-list` keeps D5 whole.
> ⭐ **The word is `A contributor`**, and its constraint is ratified with it: it must be true under
> **all five** omission causes, and ⛔ nothing may disclose WHICH applies. ⛔ `Anonymous` and
> ⛔ `Not recorded` are ruled out **by name** (the latter would be false — the name *is* recorded).
> ⚠ `Name not shown` is the ratified fallback. ⛔ The **Hindi is NOT ruled** and the English ships no
> sooner than it does.
>
> **Q2 → Option A**, carrying the record correction with it. The financial-truth gate is **hardened**
> so a numeric-literal operand is caught, with a test isolating the shape leg; and `2026-09-02-176`
> **D1**'s premise (*"11b.3b — which already adds `@twt/ui` to `apps/public`"*) is **corrected as
> false** — ⭐ the gate is now the **sole** enforcement of D1(c). ⛔ D1(c) is ⛔ not relaxed and ⛔ was
> ⛔ not violated. ⛔ Option C (order `@twt/ui` in) is **declined**.
>
> **Q3 → Option A.** **Membership itself is the basis** for publishing a living contributor's name;
> contributing is a **public act**, and a T&C withdrawal does ⛔ not retract it. ⭐ The matrix citation
> is **corrected**: `2026-08-28-160` cl.7 does ⛔ not reach a living subject (its cl.4 is *"after
> death"* throughout). ⛔ Option B (withdrawal removes the name) is **declined** — it would make a
> public record of money mutable by a private action. ⚠ The separate **counsel's-clause** item stays
> OPEN and is untouched.
>
> Recorded as **Decision `2026-09-16-219`** (cl.1–cl.4 = Q1, cl.5 = Q2, cl.6 = Q3), with three
> **Open follow-ups**: the Hindi placeholder, the now-asymmetric member surface, and the duplicate
> count key. The sections below are the escalation **as it was put**, and are kept ⛔ unedited
> ([[feedback_supersede_never_reinterpret]]).

---

## Story 11b.3b (Sahyog Vivran — the deceased member's name + the confirmed-contributor list) had a **SECOND code review** (2026-09-16), after the row had already been moved to `done`. **Eleven** findings were fixed in place. **Three** we will ⛔ not answer for you.

The second pass ran against a **different diff range** from the first, and that is why it found more.
The first pass diffed the story's `baseline_commit` (`05094a68..HEAD`), a range that also carried
stories **11b.17 / 11b.19 / 8.17** interleaved in the same linear history — so every finding needed a
`git log --grep` authorship filter, and ~60 were dismissed as another story's. The second pass diffed
**`be0037cc..HEAD`**, the branch's merge-base with `origin/main`, where **all 15 commits are 11b.3b's
own**. ⇒ ⛔ no filter, and only **3** dismissals.

> ⚠⛔ **A NOTE ON WHAT COUNTS AS EVIDENCE HERE — ⭐ the same discipline as the 2026-09-07 / 2026-09-08
> notes.** Every factual claim below is either (a) **verbatim ratified text** from `.decision-log.md`
> or a shipped matrix/locale string, or (b) **verified repository state** — a file's contents at a
> named line, or a command we ran and whose output we quote. ⛔ We have ⛔ not rested any part of this
> escalation on a code comment or on a story file's prose — ⚠ which matters unusually much here,
> because **two of the three questions below are cases where a code comment asserts a property the
> code beside it does ⛔ not have.** §7 lists every command so each claim can be re-opened and checked.
> Where something is an **inference** it is labelled **INFERENCE**.

> ⭐⭐ **AND THE ONE THING TO KNOW FIRST.** ⛔ **None of these is a defect in what you ruled.**
> **Q1** is the *arithmetic shadow* of a ruling that is correct — `2026-08-30-169` cl.6's two-axis
> model — meeting a pagination envelope that did not exist when it was ruled.
> **Q2** is a ruling (`2026-09-02-176` D1) whose two **enforcement mechanisms** have both since gone
> soft, while the thing it forbids remains forbidden.
> **Q3** is a **basis citation** question: the ratification of the contributor's name is real and
> unconditional, but the *consent basis* the matrix cites for it is text about a **different subject**.
> ⇒ ⭐ we are asking you to **extend and confirm**, ⛔ not to reconsider.

---

## 1. What is being asked, precisely

| # | Question | What is blocked / at risk |
|---|---|---|
| **Q1** | `total` counts the RTBF-erased contributor (ruled) while the rendered rows do not. ⇒ the **number of erased contributors is derivable by subtraction**, and at `?limit=1` the **exact position** of each erasure is probeable. Is that accepted residual risk, or must the envelope change? | ⚠ **LIVE on the shipping public surface.** ⛔ Nothing is blocked from shipping; the exposure exists today on the branch. |
| **Q2** | `2026-09-02-176` **D1(c)** (*"re-deriving the multiplication locally stays REFUSED"*) was ruled enforceable by the **`@twt/ui` fence**. That fence was ⛔ never lifted — but `@twt/ui` was also ⛔ never **added**, and the CI gate that mechanizes D1(c) was **narrowed** in this same story. Does D1(c) still bind, and on what mechanism? | ⛔ Nothing renders differently — the figure is numerically identical either way. ⚠ What is at risk is that **a future local re-derivation now passes CI green**. |
| **Q3** | The contributor's full name is ratified at `public` **unconditionally** (`-174` cl.1/cl.2, `-175`). The matrix cites **`2026-08-28-160` cl.7** as its *consent basis* — but cl.7 rests on cl.4, which is expressly about publication of a member's own name **after death**. What is the basis for a **living** contributor, and does it have a **revocation** posture? | ⛔ Nothing changes on the page on any answer. ⚠ Up to **fifty living members' full legal names** render on an unauthenticated, edge-cached page today, with ⛔ no runtime consent check of any kind. |

⭐ **Q1 is the one we would most like answered** — it is the only one with a live exposure, and it
touches an RTBF guarantee whose own ratified ground is about **correlatability**.

---

## 2. What was ratified, and what was ⛔ NOT

### 2.1 Verbatim — `2026-08-30-169` **cl.1** (D5, the RTBF ground)

> 1. ⭐⭐ **[Author-committed] D5 — THE GOVERNING RULING: RTBF REMOVES THE CONTRIBUTOR ENTIRELY.** An
>    RTBF invocation removes the contributor from the contributor surface. ⛔ **No anonymized row is
>    emitted** — ⛔ no marker, ⛔ no placeholder, ⛔ no `rowKey`, ⛔ nothing occupying the position
>    where that person used to be.
>    **Ground, verbatim from the story:** the person's public contribution / name / claim
>    representation *"should disappear, rather than leaving an **identifiable or correlatable
>    placeholder**"*

⭐ **The operative words for Q1 are *"or correlatable"*.** The ruling does ⛔ not only forbid a visible
marker; its stated ground is that the erasure must ⛔ not be **correlatable**.

### 2.2 Verbatim — `2026-08-30-169` **cl.6** (D3-aggregate, the two-axis model)

> 6. ⭐⭐ **[Author-committed] D3-aggregate — THE TWO-AXIS MODEL. ⛔ Do not re-litigate.**
>    > **Contribution state: `CONFIRMED`** · **Public representation: `OMITTED`**
>    **(1)** The RTBF-omitted contributor **CONTINUES to contribute to `confirmedCount`** and to every
>    other aggregate financial/statistical measure whose semantics represent **CONFIRMED HISTORICAL
>    TRANSACTIONS**. …
>    **(2)** `rosterSize` **in the ruling's sense** is the number of contributors **currently eligible
>    for public representation**. ⛔ It is **NOT** a measure of contribution-confirmation state and
>    ⛔ **MUST NOT** be used to infer a contributor's financial status.
>    ⇒ ⭐⭐ **Only `rows` shrinks.**

⚠ **This is the ruling Q1 arises from, and it is ⛔ not wrong.** Q1 exists because *"only `rows`
shrinks"* — correct and deliberate — becomes a **subtraction** the moment both quantities are put on
the same wire, which is what the 11b.3b pagination envelope does.

### 2.3 Verbatim — `2026-09-02-176` **D1** (the amount, the fence, and D1(c))

> 1. ⭐⭐ **[Author-committed] D1 — (b): CONSUME the shipped `amountRaisedInr`. ⚠ AND IT MOVES TO
>    STORY 11b.3b, because the `@twt/ui` dependency fence STAYS.**
>    … ⇒ ⭐ **the fence is NOT lifted; the amount MOVES.** **11b.3b** — which already adds `@twt/ui` to
>    `apps/public` (C-1) — owns the amount-raised render.
>    ⛔ **D1(c) — re-deriving the multiplication locally — stays REFUSED**, and **the fence is what
>    makes the refusal enforceable rather than aspirational.**

### 2.4 Verbatim — `2026-09-02-174` cl.1/cl.2 and `2026-09-02-175` (the contributor's name)

> 1. ⭐ **[Trustee-ratified] Q1 — THE DECLARATION: YES.** A contributor's name **may** be declared at
>    the `public` tier.
> 2. ⭐ **[Trustee-ratified] Q2 — THE FORM: the FULL NAME.** ⛔ Not first-name + last-initial.

`-175` then corrected `-174` cl.3 away, so **Q1/Q2 stand UNCONDITIONALLY**.

### 2.5 Verbatim — `2026-08-28-160` **cl.4** (the consent model cl.7's clearance rests on)

> 4. ⭐⭐ **[Trustee-ratified] THE NEW CONSENT MODEL.** Six elements, ratified as a unit:
>    (a) **T&C acceptance is sufficient** as the member's own basis for publication of the member's own
>        name **after death**.
>    (b) The membership T&C **must expressly state** that post-death publication of the member's name
>        is permitted. ⛔ Absent that clause in the accepted version, the basis does ⛔ not exist.
>    (c) **Acceptance is formal:** … with the **T&C version + date/time recorded against the member**.

### 2.6 What was ⛔ NOT ratified

- ⛔ **No ruling states what `total` may be on a PAGINATED public contributor wire.** `-169` cl.6
  ruled the *aggregate* keeps the erased contributor; the paginated envelope (`items` / `page` /
  `limit` / `total`) is 11b.3b's, and post-dates it.
- ⛔ **No ruling addresses a minimum `limit`.** `1` is legal today.
- ⛔ **No ruling replaces the `@twt/ui` fence as D1(c)'s enforcement mechanism**, and ⛔ none
  authorises narrowing the CI gate's coverage — AC11(b) narrowed it as an implementation act.
- ⛔ **No ruling states a consent basis for publishing a LIVING member's name**, nor any **revocation**
  posture for one. `-160` cl.4 is *"after death"* throughout; `-174`/`-175` rule the **declaration and
  the form**, ⛔ not a basis.

---

## 3. Q1 — the omission count is derivable, and at `limit=1` it is positional

### 3.1 The rule, verbatim from the shipped contract

`packages/contracts/src/public-pages/sahyog-vivran.ts:672`:

> ⛔⛔ **AND THERE IS ⛔ NO OMISSION COUNT, EVER.** ⛔ Not a tally, ⛔ not a "some names withheld"
> line, ⛔ not a per-row marker. A count of omissions is an enumeration signal over which members
> were erased.

### 3.2 The fact, at three named sites in `apps/api/src/modules/public-pages/handlers.ts`

| Line | Code | Consequence |
|---|---|---|
| `:998` | `const total = confirmedContributors.length;` | `total` is the **pre-omission** set size — correct per `-169` cl.6 |
| `:1004` | `confirmedContributors.slice(offset, offset + limit)` | the page is cut from the **UNFILTERED** set |
| `:1114` | `.filter((row) => row !== null)` | omissions collapse out **after** the cut |

### 3.3 The recovery

**(a) The tally.** `total − Σ items.length` over the pages is the number of omitted contributors. On a
drive with 3 confirmed contributors of whom one is erased, the **default** request returns
`{ total: 3, items: [A, C] }` — the tally is `1`, with ⛔ no attacker effort at all.

**(b) The position.** Because the slice precedes the filter, `GET …?limit=1&page=k` addresses **one
specific position** in the ruled order. A response of `{"items": [], "total": N}` for any `k ≤ N`
proves that **position `k` specifically** was omitted. Sweeping `k = 1…N` returns the exact set of
erased positions.

⚠ The order is **stable and deterministic** — earliest live confirmation's `event_version`, with
`member_id` as a final tie-break (`packages/domain/src/contribution/read.ts:231-232`). ⇒ anyone who
read the list **before** an erasure can map a recovered position back to the **person**.

⭐ **INFERENCE (labelled):** we have ⛔ not observed this being done. The mechanism is verified; the
practical likelihood is a judgement we leave to the Panel.

### 3.4 Why this is not `-169` cl.6 being wrong

Both horns leak, and that is the honest statement of the problem:

- **`total` pre-omission (today, ruled):** the omission **count** is derivable.
- **`total` post-omission:** `total` **shrinks** between two reads of the same drive ⇒ it leaks that an
  erasure **happened**, to anyone who cached the earlier value — and it would also contradict cl.6(1).

⇒ ⭐ the question is ⛔ not *"which is correct"* but **which residual signal the Trust accepts**.

### 3.5 Options

| | Option | Cost |
|---|---|---|
| **A** | **Accept the derivable tally as residual risk**, and amend the contract's absolute wording so code and rule agree. | ⛔ No code change. ⚠ The *"⛔ NO OMISSION COUNT, EVER"* sentence becomes *"no **rendered** omission count"* — the absolute claim is retired. |
| **B** | **Floor `limit` above 1** (e.g. minimum 5). | Kills the **positional** oracle; ⛔ leaves the aggregate tally. Small contract + page change. |
| **C** | **Filter before paging** — cut the page from the omission-filtered set, keeping `total` pre-omission. | ⭐ Removes the positional oracle AND makes every page full. ⚠ Costs the *"page first, decrypt second"* bound: the decrypt fan-out would no longer be capped by `limit`. |
| **D** | **Re-rule `total` post-omission.** | ⛔ Contradicts cl.6(1); accepts the shrink signal instead. |
| **E** | **Render a PLACEHOLDER row** in place of each omitted name, so the list length matches `total`. | ⚠⛔ **Requires `-169` cl.1 to be SUPERSEDED BY NAME** — that clause forbids a placeholder in terms. ⛔ It does ⛔ not close the leak; see §3.6. |

⭐ Our reading is that **B or C** is the smallest honest change, and **C** is the only one that closes
the positional oracle without retiring a ratified sentence — ⚠ but C has a real cost (§3.4 above) that
is a Trust-level call about decrypt volume on an unauthenticated route.
⚠ **E is a different KIND of answer** and is set out separately below, because it ⛔ does not close the
leak and must ⛔ not be put to a vote as though it did.

### 3.6 Option E — the placeholder, and the word it would need

⚠⛔⛔ **STATED FIRST, BECAUSE IT IS THE THING MOST EASILY MISREAD: A PLACEHOLDER ⛔ DOES ⛔ NOT CLOSE
Q1 — IT INCREASES DISCLOSURE.** Today the count is derivable by arithmetic and a position needs
probing. With a placeholder, **both are visible at a glance, to every reader, with ⛔ no arithmetic and
⛔ no probing.**

⭐ **The honest case for it is FAIRNESS, ⛔ not privacy.** Today only a determined or technical reader
learns the list is incomplete; an ordinary visitor is left to assume it is complete, because ⛔ no copy
may claim completeness and ⛔ nothing signals its absence. ⇒ E distributes the **same** information
**equally**, and states it honestly. That is a defensible Trust position — ⭐ but it must be put to the
Panel as *"make the existing leak honest and equal"*, ⛔ **never** as *"close the leak"*.

#### The constraint that picks the word

⛔⛔ **THE WORD MUST BE TRUE UNDER ALL FIVE OMISSION CAUSES** — RTBF erasure, the erasure sentinel, an
unresolvable name, a MONONYM under `shielded_name`, and a failed decrypt
(`packages/contracts/src/public-pages/sahyog-vivran.ts:668-669`). ⚠ A word that implies **why** converts
a derivable count into a **LABELLED disclosure that this specific person exercised RTBF** — strictly
worse than the state Q1 describes.

⭐ **This rule is ⛔ not ours — it is already reasoned out in the shipped code.**
`packages/ui/src/contribution-list/presenter.ts:53-56`, verbatim:

> reusing `member.anonymousMember` would state that the person exercised their right to erasure when
> the name was merely absent, which is **a false statement about a data-subject right on the one
> surface that exists to protect it**

#### What that rules out

| Candidate | Why ⛔ not |
|---|---|
| **"Anonymous"** (`member.anonymousMember`) | ⛔ Already rejected in-house — 11b.2a's **D6(a)** removed it, on the ground quoted above. It also asserts the person *chose* to give anonymously: a different, false fact. |
| **"Not recorded"** | ⚠⛔ **THE TRAP.** It is the house absence word (`value.district_unknown`, on four surfaces) so it looks like the safe reuse — ⛔ but here it would be **FALSE**. An unrecorded district genuinely is not in the system; a contributor's name **IS** recorded, encrypted in KYC. We are declining to publish it. |
| **"Name withheld"** | ⛔ The rulings name *"some names withheld"* as the forbidden phrase — adopting it collides with the record. "Withheld" also implies an agent keeping something from the reader. |
| **"Removed" / "Erased"** | ⛔ Asserts RTBF. False for **four of the five** causes. |
| **"Unavailable"** | ⛔ The house uses this for SYSTEM faults (DigiLocker, WhatsApp). Reads as a broken page, and is false for RTBF. |

#### The recommended word

> ### A contributor
> Hindi: **एक योगदानकर्ता** — in-vocabulary (the project's contribution word is *Yogdaan*).
> ⭐ **एक सहयोगी** is the warmer alternative and echoes *Sahyog*, though it names the RELATIONSHIP
> rather than the act. ⚠ The final Hindi is a **copy call**, ⛔ not a reviewer's to mint.

Three grounds:

1. ⭐ **True under all five causes**, and asserts ⛔ nothing about which.
2. ⭐⭐ **It renders `-169` cl.6's two-axis model LITERALLY** — *Contribution state: `CONFIRMED` ·
   Public representation: `OMITTED`*. The row testifies to the contribution and declines the identity,
   which is exactly what cl.6 ruled.
3. ⭐ **It keeps the row meaningful.** This page exists to show that colleagues supported a family. An
   unnamed row still testifies to that. *"Name not shown"* makes the row about the **withholding**;
   *"A contributor"* makes it about the **contribution**. In a list it reads naturally —
   *Kavita Singh · A contributor · Ramesh Chandra Tiwari*.

⭐ If the Panel prefers a plainly administrative register, **"Name not shown"** (*नाम नहीं दिखाया गया*)
is the correct second choice — equally true across all five causes, ⚠ just colder.

---

## 4. Q2 — D1(c)'s two enforcement mechanisms have both gone soft

### 4.1 What was ruled

`-176` D1 (§2.3) refuses **D1(c)** — re-deriving `confirmedCount × fixedAmount` locally — and states
the ground: **"the fence is what makes the refusal enforceable rather than aspirational."**

### 4.2 Mechanism 1 — the `@twt/ui` fence: ⛔ never lifted, and ⛔ never landed

The ruling says 11b.3b *"already adds `@twt/ui` to `apps/public` (C-1)"*. **It does not.**
`apps/public/package.json` dependencies at HEAD are exactly:

```
@twt/contracts · @twt/domain · @twt/i18n · @twt/tokens        (+ @astrojs/node, astro)
```

⭐ **And the engineering call not to add it is DEFENSIBLE** — adding a package for one number is the
premature-extraction pattern; a live in-code fence at `apps/public/src/pages/sahyog.astro:917-919`
independently says `@twt/ui`'s 11b consumers are 11b.2 / 11b.5 / 11b.7. ⛔ We are ⛔ not asking you to
order the dependency.

⚠ **What we are reporting is that the ruling's stated premise is false**, and therefore the amount does
⛔ not come from the canonical presenter. It comes from the **domain**:
`packages/domain/src/pool/sahyog-vivran-read.ts` reuses a `deliveredTotal` binding.

⭐ **VERIFIED, ⛔ not assumed:** that multiplication **pre-dates** this story. At `be0037cc` the same
file already carried `deliveredTotal: confirmedContributionCount * row.fixedAmount` at line **509**,
inside `classifyCycleOutcome`. ⇒ 11b.3b **hoisted** an existing product; it did ⛔ **not** introduce a
second one. **D1(c) was not violated.**

### 4.3 Mechanism 2 — the CI gate: narrowed in this same story

`scripts/sahyog-vivran-financial-truth/lib.ts` mechanizes D1(c). AC11(b) **narrowed** it — correctly in
principle, because the old rule banned the **name** `amountRaisedInr`, and a rule that bans the ruled
field's own name makes the ruling unshippable. What replaced it:

```
:132  TARGET_OPERANDS   = /^(fixedAmount|rosterSize|expectedTotal|deliveredTotal)$/
:140  COUNT_OPERAND     = /^(confirmedCount|confirmedContributionCount|assignedCount|rosterSize)$/
:141  PER_MEMBER_AMOUNT = /^(fixedAmount|fixed_amount)$/
```

`isAmountDerivation` fires only when **both** operands of a `*` resolve to a **named identifier**
matching those sets. ⇒ this, in a render-path file, **passes the gate green**:

```ts
const amountRaisedInr = model.confirmedContributionCount * 1000;
```

⚠ Before the narrowing, that exact line tripped the name rule. The gate's own doc-block claims the new
rule is *"caught STRUCTURALLY … under ANY local spelling"* — ⛔ that is false for a **literal** or
**aliased** operand.

⭐ **For completeness, one thing the narrowing did ⛔ NOT break:** `PER_MEMBER_AMOUNT` accepts
`fixed_amount` (snake), which is ⛔ absent from `TARGET_OPERANDS` — so `confirmedCount * fixed_amount`
is caught by the shape leg **alone**. The shape leg is ⛔ not dead code; its hole is the literal
operand, ⛔ not vacuity.

### 4.4 Options

| | Option | Cost |
|---|---|---|
| **A** | **Widen `isAmountDerivation`** to fire when one operand is a `COUNT_OPERAND` and the other a numeric literal; add a test isolating the shape leg. | Small. ⚠ Amends an AC you ratified at AC11(b); possible false positives on unrelated arithmetic in render-path files. |
| **B** | **Confirm D1(c) now rests on the gate alone**, and record that the `@twt/ui` fence is ⛔ no longer part of its enforcement (the premise in `-176` D1 having been overtaken). | ⛔ No code change; the log records what actually enforces the rule. |
| **C** | **Order `@twt/ui` into `apps/public`** so the ruling's stated mechanism exists. | ⚠ We ⛔ do not recommend this — a package for one number, against [[feedback_no_premature_package]]. |

⭐ Our reading: **A + B together.** B is the honest record; A restores the coverage the narrowing
removed.

---

## 5. Q3 — what is the consent basis for a LIVING contributor's name, and can it be withdrawn?

### 5.1 What is ratified — and it is ⛔ not in doubt

`-174` cl.1/cl.2 + `-175`: a contributor's name **may** render at `public`, in the **FULL NAME** form,
**unconditionally**. ⛔ We are ⛔ not questioning that.

### 5.2 The citation gap

The shipped matrix (`packages/contracts/public-pages/public-vs-private-matrix.yaml:1282-1284`) states
the basis in its own words:

> ⚠⛔ **THIS IS THIS SURFACE'S REAL DAY-ONE OUTPUT** — unlike the deceased name above, the contributor
> predicate has ⛔ NO clause gate anywhere in the code; its basis is `2026-08-28-160` cl.7 (the
> member's own accepted membership T&C) and is SETTLED. ⇒ up to fifty living members' full legal names
> render on an unauthenticated, edge-cached page.

⚠ **`-160` cl.7 is a SURFACE CLEARANCE, and it rests on cl.4** — and cl.4 (§2.5) is about *"publication
of the member's own name **after death**"* in every one of its six elements. A **living** contributor
is a different subject. ⇒ **INFERENCE:** the matrix's citation may be reaching cl.4's model further
than cl.4 states. We are ⛔ not asserting the basis is absent — we are asking which text it is.

### 5.3 The asymmetry in the code, verified

| Subject | Basis checked at runtime? |
|---|---|
| **Deceased member's name** | ⭐ **YES** — `NAME_PUBLICATION_AUTHORISED` joins `consent_records` and honours `revoked_at`. The name is fail-closed today. |
| **Contributor's name (living)** | ⛔ **NO** — ⛔ not T&C acceptance, ⛔ not its version, ⛔ not revocation. |

⚠ `-160` cl.4(c) requires the **T&C version + date/time recorded against the member**, and cl.4(b)
makes the basis version-dependent for the deceased subject. ⛔ Nothing reads either for a contributor.

### 5.4 The concrete state nobody has ruled on

A member who **revokes** their T&C acceptance (or accepted a version predating the applicable clause)
is **excluded** as a deceased subject by `NAME_PUBLICATION_AUTHORISED` — and still **renders as a
contributor**, in full legal name, on an unauthenticated, edge-cached page, indefinitely.

⭐ The enforcing mechanism already exists and is exported in the same file. ⛔ The dev agent may ⛔ not
decide whether it applies.

### 5.5 Options

| | Option | Cost |
|---|---|---|
| **A** | **Confirm membership itself is the basis** — a contributor's name is published because they are a member who contributed, and T&C revocation does ⛔ not withdraw it. Record the reasoning against the *living* subject explicitly, and correct the matrix's cl.7 citation. | ⛔ No code change. ⭐ Closes the citation gap. |
| **B** | **Rule that revocation withdraws the contributor name too** — apply the existing consent check to the contributor path. | Real code change; a contributor's row would disappear on revocation (mechanically like RTBF, and interacting with Q1). |
| **C** | **Refer to counsel first** (Adv. Mohit Agrawal, DPDPA engagement) before the Panel rules. | ⚠ Delay. ⭐ This is a personal-data-basis question and counsel is already engaged. |

⭐ Our reading: **C then A** — counsel confirms, the Panel records, the matrix citation is corrected.
⛔ We do ⛔ not recommend B without counsel, because it would make a public financial record mutable on
a consent action, which has its own transparency cost.

---

## 6. What is blocked

**Nothing in the shipped page changes on any of the three answers.** The second review's other **11**
findings are fixed, applied and verified (`apps/public` 622/622 · `apps/api` live-DB 40/40 + 5/5 ·
domain 369/369 · contracts 1132/1132 · the financial-truth gate 20/20 and green · `tsc` and
`astro check` clean).

These three are recorded as **open** in the story's *Review Findings — SECOND PASS (2026-09-16)*
section, in `deferred-work.md` marked `[PANEL-ROUTED]`, and in `sprint-status.yaml`. **Story 11b.3b is
`in-progress` until they are ruled.**

⚠⛔ **One live exposure, stated plainly:** **Q1's oracle is on the branch today.** Q2 is a weakened
guard, ⛔ not a live defect. Q3 is a citation and a revocation posture, ⛔ not a live defect.

---

## 7. Commands to re-verify every claim

```
# Q1 — the rule, then the three sites that defeat it
grep -n "NO OMISSION COUNT, EVER" packages/contracts/src/public-pages/sahyog-vivran.ts   # :672
sed -n '996,1006p'  apps/api/src/modules/public-pages/handlers.ts   # :998 total pre-omission; :1004 slice
sed -n '1110,1116p' apps/api/src/modules/public-pages/handlers.ts   # :1114 filter AFTER the slice
sed -n '228,233p'   packages/domain/src/contribution/read.ts        # :231-232 the deterministic sort

# Q2 — the fence that never landed, and the gate that narrowed
grep -n '"@twt/' apps/public/package.json                           # no @twt/ui
git show be0037cc:packages/domain/src/pool/sahyog-vivran-read.ts | grep -n fixedAmount   # :509 pre-existing
sed -n '132p;140,141p' scripts/sahyog-vivran-financial-truth/lib.ts
sed -n '160,170p'      scripts/sahyog-vivran-financial-truth/lib.ts # isAmountDerivation

# Q3 — the asymmetry
sed -n '1277,1300p' packages/contracts/public-pages/public-vs-private-matrix.yaml
sed -n '393,410p' packages/domain/src/pool/public-read.ts          # the predicate, honouring revoked_at
grep -n "consent\|revoked_at" apps/api/src/modules/public-pages/handlers.ts   # none on the contributor path

# The ratified text itself (the log is newest-first — cite by clause, NEVER by line)
grep -n "^### Decision 2026-08-30-169\|^### Decision 2026-09-02-176\|^### Decision 2026-09-02-174\|^### Decision 2026-08-28-160" .decision-log.md
```

---

## Appendix — the same three questions, in plain English

*This appendix says nothing new. It restates §3, §4 and §5 without technical terms, for a quick read
before the meeting. If anything here seems to differ from the sections above, the sections above are
the exact record.*

### The page we are talking about

There is a **public web page for one Sahyog Drive** — the collection held when a member dies. Anyone on
the internet can open it; no login. It shows the drive's code, the district, the amount raised, and —
new in this story — a **list of the colleagues who have contributed**, by full name, fifty to a page.

Two of the three questions are about that list.

### Question 1 — you can work out who was erased

If a member exercises their **right to be forgotten**, you ruled that their name **disappears
completely** from that list — no blank, no "name withheld", nothing in their place. You also ruled
that their contribution **still counts** in the totals, because they really did contribute. Both are
right.

But the page shows **both numbers at once**: *"137 confirmed"* at the top, and then the names. If the
page says 137 and shows 136 names, a reader can subtract and learn that **exactly one person was
erased**.

It gets sharper. The list is served in pages, and a visitor can ask for **one name at a time** — *"give
me name number 4"*. If the answer comes back **empty**, that proves person number 4 specifically was
erased. Ask for 1, 2, 3, 4… and you have the exact positions of everyone who was erased. Since the
order never changes, anyone who looked at the list **before** the erasure can match a position back to
**a real person**.

Your own written reason for the erasure rule was that the person should disappear *"rather than
leaving an identifiable or **correlatable** placeholder"*. There is no visible placeholder — but the
absence is correlatable.

**The awkward part:** the obvious alternative is worse in a different way. If we made the total shrink
too, then anyone who noted "137" yesterday and sees "136" today learns an erasure happened. **Both
choices leak something.** We need your decision on which we accept. The middle option — never serving
fewer than five names at a time — removes the ability to pinpoint a *position*, while leaving the
simple subtraction.

### Question 2 — a guard rail we relied on was never actually built

You ruled that the "amount raised" figure must be calculated in **one place only**, and never
re-calculated somewhere else. Your recorded reason was that a particular technical boundary would make
that rule **"enforceable rather than aspirational"**.

That boundary was never put in place. The developer chose not to — and **we think that choice was
right**, because it would have meant pulling in a whole shared package for a single number.

**Nothing is broken:** we checked, and the figure is **not** being re-calculated. It reuses a
calculation that already existed. The number on the page is correct.

What we want on record is that the rule is now guarded by **one** mechanism instead of two — an
automated check — and that this same story **narrowed** that check. It still catches the obvious
mistakes, but a developer who wrote the calculation using a plain number instead of a named value
would now slip through unnoticed. We would like to tighten it, and we need you to say so, because
tightening it changes something you approved.

### Question 3 — why we are allowed to publish a living person's name

You ruled clearly that a contributor's **full name** may appear on this public page. That is not in
question.

What we cannot find is the written basis for **why** a living member's name may be published. The
document our records point to is about publishing a member's name **after they die** — every part of
it says "after death". A living contributor is a different situation.

Related and more practical: for the **deceased** member, the system actively checks that the family's
permission is still valid, and **stops** publishing if that permission is withdrawn. For the
**contributor**, there is **no such check at all** — nothing is consulted before their name goes on
the page.

So if a member were to **withdraw** their agreement, we would correctly stop publishing their name as a
deceased member — but their name would **still appear** as a contributor, indefinitely.

We are not saying this is wrong. It may be entirely correct that contributing to a collection is a
public act that cannot later be unpublished. **But nobody has written that down**, and this is personal
data on an open web page. Our suggestion is to ask Adv. Mohit Agrawal first, then record your decision.

### What happens next

All three are written into the story record and the deferred-work register. The story is held at
`in-progress` — not `done` — until you rule. The eleven other things this review found are already
fixed.
