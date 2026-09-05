# Trustee Panel routing note — 2026-09-05
## The public index tells visitors **"The trust met its commitment to the family"** — and it says it **precisely when the family received LESS than expected**. ⛔ No decision of yours ever authorised that sentence.

**Author:** BigDev, Solo Builder — 2026-09-05
**Occasion:** Story **11b.12**'s validation pass (D2). ⭐ Found by **reading the producer**, ⛔ not the
copy: the string was traced to the branch that emits it before this note was written.
**Routed to:** Trustee Panel. ⚠ **And, on one question only, to counsel** — see §6.
**Status:** ✅⭐ **(Q1) ANSWERED — Trustee-ratified, Dhiraj Rahul + Kalpana Bharti, 2026-09-05:**
> **"Trust doesn't make any commitment to the family."**
> **"We are open to suggestions on new wording and waiting."**

⇒ **Option (ii) is chosen.** The line **goes**.

✅⭐ **(Q2) ANSWERED — the Panel supplied its OWN wording, 2026-09-05** (⛔ none of our five;
⭐ recorded verbatim at **§8**), **plus a two-column table — Nominee full name | District — above the
message, on BOTH the member and public views.**

✅⭐ **ALL FOUR BLOCKERS ANSWERED, 2026-09-05 — §9.1.** B owns the copy source, D supplies the amount
field; the index gets its own one-line wording; E/F consume B's copy later; a no-name variant is
supplied.

⏳ **ONE ITEM OPEN — §9.3/§9.4.** The ratified **index** line says *"{nominee_name}, **nominee of**
Late {family_name}"*. ⛔ The data ⛔ cannot support that relationship (6.8 D1 removed the linkage
deliberately; the holder **may not be the nominee**), and the nominee name is ⛔ **not on the index
wire at all** — putting it there is a **new, bulk-harvestable exposure** `-190` cl.2 does ⛔ not cover.
⭐ A surgical fix is proposed that keeps everything else. Logged as Story 11b.12 **D2**.
⛔ **NON-BLOCKING.** Story 11b.12 proceeds without it; the string is ⛔ untouched until you answer.

> ## ⚠⛔ CORRECTION — 2026-09-05, **v1 of this note contained a FALSE STATEMENT**
>
> ⭐ **Found by Dhiraj Rahul**, who asked the exact right question of v1: *"what do you display
> elsewhere — exact sentence?"*
>
> ⛔ **v1 said the alternative wording was "the message members themselves receive when a drive closes
> short." ⛔ THAT IS FALSE. ⛔ NO MEMBER RECEIVES IT. ⛔ NOBODY HAS EVER SEEN IT.**
>
> The `close-of-cycle` copy was written at **Story 7.8** and has had **⛔ ZERO consumers ever since**:
> ⛔ nothing calls `selectCloseOfCycleFraming` outside its own unit test, ⛔ nothing resolves the
> namespace outside an i18n test, and the codebase states it in terms —
> *"⛔ No close-of-cycle (FR-19) read model exists, and ⛔ no story owns one"*
> (`packages/ui/src/noticeboard/presenter.ts:178`). ⇒ it is **drafted copy, ⛔ never shipped**.
>
> ⭐ **WHAT SURVIVES THE CORRECTION** — the finding itself is **untouched**. §3's trace, the
> never-disburses premise, and the sentence's unratified provenance ⛔ do not depend on it.
> ⛔ **WHAT WEAKENS** — the *"we already do this elsewhere"* argument. The honest version is: **we
> drafted a different register for the same outcome and ⛔ never shipped it.** ⚠ Option **(ii)** is
> re-worded accordingly, and §4 now names a register that **IS** live.
>
> ⚠⛔ **THIS IS RECORDED, ⛔ NOT QUIETLY PATCHED**, because it is the ⛔ exact failure Story 11b.3a
> found: **a false fact inside the appendix the Panel is instructed to answer from ALONE**. ⭐ It was
> caught by a Trustee reading the note as intended. ⛔ It should have been caught before it reached you.

> ### 📖 **Panel members — please start at [Appendix A: In plain words](#appendix-a--in-plain-words).**
> ⭐ It is **complete on its own** — the whole question, the options, and what follows
> from each, with ⛔ no technical detail. ⭐ **You can answer this note from Appendix A alone.**
> The numbered sections are the engineering record. ⛔ You are not expected to read them.

> ⭐⛔ **THE HEADLINE.** On the public Sahyog Drive index, each finished drive carries a one-line
> *"Close of cycle"* summary. There are three possible lines. **One of them reads:**
>
> > **"The cycle closed. The trust met its commitment to the family."**
> > *(Hindi: "चक्र पूर्ण हुआ। ट्रस्ट ने परिवार के प्रति अपना दायित्व निभाया।")*
>
> ⚠⛔ **That line is shown ⛔ ONLY when the drive delivered LESS than was expected.** It is the
> **under-funded** branch. The two other lines cover *met or exceeded* and *not yet reconciled*.
>
> ⇒ the one case where the drive fell short is the one case where the page tells the public the
> **trust met a commitment**.
>
> ⛔⛔ **AND THE TRUST DOES ⛔ NOT PAY THE FAMILY AT ALL.** Members pay the nominee's account
> **directly**; there is ⛔ no trust-held pot and ⛔ no payout step (`#decision-2026-09-04-192`,
> verified in code). ⇒ whatever the sentence means, it ⛔ cannot mean the trust made up the shortfall.
>
> ⭐⭐ **WHY YOU AND ⛔ NOT US.** ⛔ We are not asking you to approve a rewrite. We are asking a prior
> question we have ⛔ no authority to answer: **does the trust make a commitment to the family at
> all — and if so, what is it?** ⛔ Nothing in any ratified decision, the PRD or the epics says. ⚠ The
> sentence was written by us at Story 11b.1 and has been public ever since.

---

## 1. What is being asked, precisely

**(Q1) — ⭐ DOES THE TRUST MAKE A COMMITMENT TO THE FAMILY?** And if it does, **what is it** — an
amount, an effort, an eligibility, something else? ⛔ We could find ⛔ no ratified statement of one.

**(Q2) — SHOULD THIS SENTENCE STAY, IN ANY FORM?** Four options in §5. ⚠ Our view is in Appendix A;
⛔ we are not asking you to rubber-stamp it.

**(Q3) — DOES THE ANSWER BIND THE OTHER TWO LINES?** `outcome.fully_funded` and `outcome.partial` sit
beside it and are ⛔ **not** in question here — but if (Q1) establishes that the trust makes ⛔ no
commitment of the kind implied, the register of all three should be checked once, together, ⛔ rather
than one string at a time.

## 2. ⭐ What was ratified, and what was ⛔ NOT

| Ref | What it says | Status |
|---|---|---|
| `2026-09-04-192` | the trust **⛔ NEVER disburses** — members pay the nominee **directly**; ⛔ no trust-held pot, ⛔ no payout engine; the family is paid **THROUGHOUT** the drive | **Author-committed** (BigDev). ⚠ Its cl.1 was later ratified at `-193` cl.1; ⛔ this premise itself is a **verified code fact**, ⛔ not a matter of authority |
| `2026-09-04-189` consequence 6 | *"the sum is an **outcome of members paying**, ⛔ never a **guarantee the trust can make**"*; insurance-shaped language is a **regulatory-surface question**, routed to counsel | ⚠ **Author's analysis recorded UNDER a Trustee-ratified decision** — ⛔ **not itself a ratified clause** ([[feedback_closure_language_precision]]) |
| `outcome.under_funded`, the sentence itself | *"The trust met its commitment to the family."* | ⛔⛔ **AUTHOR-WRITTEN COPY. ⛔ NEVER RATIFIED, ⛔ never routed, ⛔ never reviewed against consequence 6.** Shipped at Story 11b.1 (`4598ad70`, *"copy with teeth"*) |

⛔ **Searched and ⛔ NOT found:** the phrase, or any statement of a trust commitment to a family,
appears in ⛔ **no** decision-log entry, ⛔ **no** PRD line and ⛔ **no** epic. ⭐ Stated as a **negative
result we checked**, ⛔ not as an assumption ([[feedback_negative_claims_checkable_in_repo]]).

## 3. ⛔⛔ The finding — traced to the producer, ⛔ not inferred from the words

The three *"Close of cycle"* lines are selected by an outcome enum computed per drive:

- `packages/domain/src/close-of-cycle/framing.ts:159` —
  `return deliveredTotal >= expectedTotal ? 'fully_funded' : 'under_funded';`
- `packages/domain/src/pool/public-read.ts:729` — computed per row for the public index
- `apps/public/src/pages/sahyog.astro:148` — `outcomeUnderFunded: tr('outcome.under_funded')`

⇒ **`under_funded` means exactly one thing: `deliveredTotal < expectedTotal`.** The family received
**less** than the drive expected to deliver. ⭐ That is the branch carrying *"the trust met its
commitment."*

⚠ **It is ⛔ NOT an edge case.** `expectedTotal` is the assigned roster's expectation; any drive where
some assigned members did not contribute lands here. ⛔ The only case that renders **nothing** is a
drive with **zero** assigned contributors (`fundingOutcome: null`). ⇒ this is the **ordinary
shortfall path**, live on the public index today, in both languages.

## 4. ⚖️ Stated fairly, in both directions

**⭐ The case that the sentence is DEFENSIBLE:**
- *"Commitment"* may mean the **coverage guarantee** — that the family was covered and the drive ran —
  ⛔ not that money moved from the trust. On that reading the sentence is **true**, and its job is to
  stop a shortfall reading as a failure toward a grieving family.
- ⭐ **The instinct behind it is sound and worth preserving.** A bare *"less was collected than
  expected"* on a public memorial page would be cruel and would misrepresent a mutual-aid drive as a
  failed transaction. ⛔ Whatever replaces it must keep that care.

**⛔ The case that it is ⛔ NOT:**
- ⚠ **Its own product drafted the opposite register for the same enum.** The **same outcome enum**
  has a second copy family, `close-of-cycle`, whose `under_funded` text reads:
  > *"{contributorCount} colleagues stood together; {amount} reached {familyName}'s family. Our
  > gratitude for standing beside them."*
  ⇒ **members** delivered, and the amount that **reached** the family is what is named. ⛔ The trust is
  ⛔ not the actor. **Two copy families, one enum, opposite stories.**
  ⚠⛔ **BUT WEIGH IT CORRECTLY: that copy has ⛔ NEVER been displayed to anyone** (see the Correction
  above). ⇒ it is evidence of **what we judged right when we wrote it**, ⛔ **NOT** evidence of an
  established practice. ⛔ Do ⛔ not read it as "the product already says this."
- ⭐ **The register that IS live says nothing about a commitment.** Where the shipped product names
  money — the progress figure on the drive page and the member app's contribution card — the label is
  simply **"Raised so far"** (*"अब तक जुटाई गई राशि"*, `contribution.json:124`). ⛔ No actor, ⛔ no
  promise, ⛔ no verdict. ⚠ That is the only shipped precedent, and it points away from the sentence
  in question.
- ⚠ **It asserts a verdict the architecture deliberately quarantines.** `classifyCycleOutcome` exists
  so that ⛔ no target, ratio or shortfall figure can reach the copy path (Pool-Reality #2). ⛔ The
  numbers are quarantined — but this sentence leaks the **verdict**, and leaks it **inverted**:
  *"met"* on the branch that means *not met*.
- ⚠⛔ **It is the class `-189` consequence 6 already named.** *"A guarantee the trust can make"* is
  precisely what that consequence says the trust ⛔ cannot offer. ⛔ The string predates the analysis
  and was ⛔ never checked against it.

## 5. The options

**(i) ⭐ THE TRUST DOES MAKE A COMMITMENT — TELL US WHAT IT IS.** We then word the line to state it
accurately, and record it as ratified. ⚠ If the commitment is about **coverage or effort**, the line
must ⛔ not read as a delivered **amount**.

**(ii) ⭐ THE TRUST MAKES ⛔ NO SUCH COMMITMENT — THE LINE GOES.** Replaced with a statement of what
**members' contributions** delivered, with ⛔ no comparison and ⛔ no claim about the trust.
⚠⛔ **Stated accurately after the Correction: this is a register we DRAFTED (Story 7.8) and ⛔ NEVER
SHIPPED — ⛔ it is NOT an existing practice we would be matching.** ⭐ The one shipped precedent is the
neutral **"Raised so far"**. ⇒ choosing (ii) means **authoring** the replacement line, and we would
bring you the exact wording before it goes up.

**(iii) ⛔ KEEP IT AS IS.** ⚠ We record it as ratified copy, and the contradiction with the
member-facing message stands, deliberately. ⛔ We do ⛔ not recommend this, but it is yours to take.

**(iv) ⚠ DEFER — but ⛔ NOT silently.** The line stays while you consider it, ⭐ and it stays carried
as an **OPEN** item in the two places that are actually read: **this note's `Status`** and **Story
11b.12's D2**, which keeps it visible in every sprint-status read until it is answered. ⇒ a **known,
live, unratified public claim**, ⛔ not an unrecorded default
([[feedback_record_unattested_no_backfill]]).

## 6. ⚠ The one question that is ⛔ NOT yours

`-189` consequence 6 routes **insurance-shaped language** to counsel, because TWT is a mutual-aid
trust and ⛔ not an insurer. *"The trust met its commitment to the family"* is promise-shaped by
construction. ⇒ **whatever you rule under (Q1), the final wording should pass the same 13-row
regulatory-surface review** Story 0.13's framework carries (counsel: Adv. Mohit Agrawal).
⛔ **This is ⛔ not a delay** — (Q1) is the question that must be answered first, and only its answer
tells counsel what is being claimed.

---

## Appendix A — In plain words

⭐ **You can answer this note from this page alone.** ⛔ Nothing above is needed.

### What the public sees today

The public Sahyog Drive page lists finished drives. Beside each one there is a short line explaining
how it ended. There are **three** possible lines, and the website picks one automatically:

| When the drive… | The public reads |
|---|---|
| collected **as much as, or more than,** expected | *"The cycle closed with the support it needed."* |
| ⭐ collected **LESS** than expected | ⭐ **"The cycle closed. The trust met its commitment to the family."** |
| has not finished being checked | *"The cycle closed. Reconciliation is still in progress."* |

### The problem

The middle line — the one that says **the trust met its commitment** — is shown **only when the drive
fell short.** That is the one situation where the least was delivered.

And the trust **does not pay the family any money at all.** Members send their contributions
**straight to the nominee's own bank account**. Nothing passes through the trust. So the sentence
cannot mean the trust made up the difference — there is nothing for it to make up the difference
*with*.

### Why we are asking you and not deciding it ourselves

We wrote that sentence. ⛔ You never approved it. And we cannot find anywhere — in any decision you
have made, in the product requirements, or in the plans — that says **the trust makes a commitment to
a family at all.**

Deciding what the trust promises is not a wording choice. **It is yours.**

We also want to say plainly: we think the *instinct* behind the sentence was right. A public memorial
page should not tell a grieving family, in effect, "not enough people helped." Whatever replaces this
line should keep that care. ⛔ The problem is the **claim**, not the kindness.

### One more thing worth knowing — ⚠ and a correction to what we first told you

⭐ **Dhiraj asked what we display elsewhere, and the exact sentence. Here it is — and the honest
answer is that we display it ⛔ NOWHERE.**

Some years back, for exactly this situation, we **wrote** a different message. In full:

> **English:** *"{number} colleagues stood together; {amount} reached {family name}'s family. Our
> gratitude for standing beside them."*
>
> **Hindi:** *"{number} सहयोगियों ने साथ मिलकर हाथ बढ़ाया; {family name} के परिवार को {amount} पहुँचाए गए।
> इस साथ के लिए हम सबका आभार।"*

That version credits **the members** and names what actually **reached** the family. ⛔ It never
mentions the trust.

⚠⛔ **BUT WE MUST CORRECT OURSELVES.** The first version of this note told you this was *"the message
members themselves receive."* **That was wrong.** It was written, translated, and then **never
connected to anything** — ⛔ no member has ever seen it, and ⛔ no part of the app sends it. We
apologise for the error; it is corrected here rather than quietly.

⇒ **Please weigh it for what it is:** evidence of **what we thought right when we wrote it**, ⛔ not
proof that the product already speaks this way.

The only place the live product actually names money, it says simply: **"Raised so far"**
(*"अब तक जुटाई गई राशि"*). ⛔ No promise, ⛔ no mention of the trust, ⛔ no verdict on whether it was
enough.

### What we are asking

**1. Does the trust make a commitment to the family?** If yes — **what is it?**

**2. Given your answer, what should that line say?**

- **(i)** The trust *does* commit to something — tell us what, and we will say it accurately.
- **(ii)** The trust makes no such commitment — we remove the line and describe what members'
  contributions delivered instead. ⚠ This would be **new wording we write for you**, ⛔ not an
  existing sentence we copy across; we would bring you the exact words before they go up.
- **(iii)** Keep it exactly as it is, and we record that you have approved it.
- **(iv)** You need more time — the line stays for now, and it stays flagged as an open question on
  this note and on the story that found it, so it comes back to you rather than quietly becoming
  permanent.

**3. A separate, smaller point.** Whatever you decide, wording that sounds like a **promise of money**
needs a look from our lawyer before it goes back up — the trust is a mutual-aid trust, not an
insurer, and we have agreed before that promise-shaped language gets that check. ⚠ That is a step
*after* your answer, not instead of it.

### What happens meanwhile

**Nothing changes on the website.** The line stays exactly as it is until you answer. Story 11b.12 —
the one that fixes the *other* wrong sentences about payment on that page — carries on without this,
and ⛔ does ⛔ not touch this line.

---

## Appendix A2 — ⭐ WHERE THIS STANDS NOW (updated 2026-09-05, after your answers)

⭐ **You have since answered almost everything. In plain words, here is what is settled and the ⛔ ONE
thing still open.**

### ✅ Settled

- **You told us the trust makes no commitment to the family.** ⇒ the false sentence **goes**.
- **You gave us your own wording** — the five-paragraph message and the one-line version for the
  list page. ⭐ We have recorded both exactly as you wrote them.
- **You settled the money figure**: we write the message now, and the rupee amount is switched on by
  the separate piece of work that produces it. ⇒ ⛔ nothing waits on anything else.
- **You settled the app**: we write the words once, and the member screens use them when they are
  built.
- **You gave us the wording for when a family has asked not to be named.** ⭐ Thank you — that case
  is now covered.

### ⏳ The one thing still open — and it is ⛔ not a wording question

Your line for the list page says: ***"…for {nominee name}, **nominee of** Late {family name}…"***

⭐ **You are right that the money must only ever go to the nominee. That is the rule, and it is
written down.** ⚠⛔ **But we have checked, and ⛔ nothing in the system actually checks it:**

- the person approving a claim **⛔ cannot see** the account holder's name at all — they are only
  told whether **something** was filled in;
- the database was **deliberately built without** any link between that name and the nominee on
  record;
- this gap was written down some time ago and is **still open**.

⇒ so if we print *"X, nominee of Y"* on a public page, we state as **fact** something the Trust
**requires** but ⛔ **nobody has verified.**

⭐⭐ **THE GOOD NEWS — AND OUR RECOMMENDATION.** We already store the nominee's name from when the
member first declared them. ⇒ **the check you intend can be BUILT.** We would rather **build the
check** than water down your sentence:

1. show the account holder's name to the person approving the claim, so they can actually do the
   check they are already responsible for; and
2. record that they did it.

⇒ then *"nominee of"* becomes **true because it was checked**, ⛔ not merely intended. ⭐ That is a
small separate piece of work, and your ruling is the best reason yet to schedule it.

### ⚠ One more thing to decide, separately

The nominee's name is on **one drive's page** today — ⛔ it is **not** on the **list** page. Putting
it on the list means anyone can page through and collect **every nominee's name and district in one
go**, and there is a district filter, so they could ask for one district at a time. ⛔ That is a
different thing from showing one name on one family's page, and you have ⛔ not been asked about it.

⚠ ⛔ **This is true even if the check above is built** — verifying a name does ⛔ not decide whether a
list of them should be downloadable.

### ⭐ What we need from you

1. **Build the check** (our recommendation), or print the sentence knowing it is unverified — or use
   *"for the family of Late {family name}"* and leave the nominee's name off the list page.
2. **May the nominee's name go on the list page at all?**
3. **When a district is not recorded**, we will simply leave that part of the sentence out — ⭐ tell
   us if you would rather it said something.

---

## 7. ⭐ PROPOSED WORDING — five options, ⏳ awaiting the Panel's pick

**Given (Q1)'s answer — the trust makes ⛔ NO commitment — every option below removes the trust as an
actor.** ⭐ All carry the tagline **सहयोग का हाथ, हर परिवार के साथ** as directed.

⭐⭐ **AND A SECOND BRIEF, ADDED BY BigDev:** the words must be **plain** — ⛔ no jargon, ⛔ nothing a
reader has to work at — and a member of the public reading them should feel **drawn to join the
Trust**. ⭐ **There is ⛔ NO length limit**; a longer, warmer sentence is preferred to a clipped one.

### 7.1 ⚠ What any replacement must satisfy

1. ⛔ **⛔ No trust actor, ⛔ no commitment, ⛔ no guarantee** — (Q1), and `-189` consequence 6.
2. ⛔ **⛔ No payment claim about the trust** — `-192`: members pay the family **directly**.
3. ⛔⛔ **⛔ NO VERDICT ON WHETHER THE TARGET WAS MET.** ⭐ The one most easily missed:
   `classifyCycleOutcome` exists to **quarantine** the target so ⛔ no ratio, percentage or shortfall
   reaches the copy (Pool-Reality #2). ⇒ the replacement must ⛔ **not** say *"less than expected"*
   either. ⚠ Replacing one leak with a franker leak is ⛔ not a fix.
4. ⭐ **PLAIN WORDS.** ⛔ Not *"reconciled"*, ⛔ not *"cycle funding outcome"*. ⭐ The Hindi should read
   as naturally as speech, ⛔ not as translated English.
5. ⭐ **IT SHOULD MAKE SOMEONE WANT TO JOIN** — by what it truthfully says, ⛔ not by selling.
6. ⚠ **It is a public memorial page.** ⛔ It must never read as *"not enough people helped"*, and
   ⛔ never as an advertisement placed on a family's record.
7. ⚠ **The confirmed count is ⛔ ALREADY on the same row.** ⇒ ⛔ don't restate a number.

### 7.2 ⭐ The tagline in English

**सहयोग का हाथ, हर परिवार के साथ** — three renderings, ⭐ our pick first:

| | English |
|---|---|
| ⭐ **(a)** | **"A hand of support, with every family"** |
| (b) | "A helping hand, with every family" |
| (c) | "Support in hand, beside every family" |

⭐ **(a)** keeps *सहयोग* as **support** — the word this product already carries in its own name
(*Sahyog*) — and mirrors the Hindi's two-beat rhythm.

⚠ **Hindi note:** the public pages already call a drive **अभियान** (`page.intro`), ⛔ not *"चक्र"*.
⭐ Every Hindi option below uses **अभियान**, so the row reads in the same voice as the page around it.

### 7.3 The five options

⭐ **EN** then **HI**, exactly as each would render.

---

**⭐ OPTION 1 — THE SIMPLEST.** Says who acted, and nothing more.

> **EN:** *"This drive has closed. Fellow members stood with this family — a hand of support, with
> every family."*
>
> **HI:** *"यह अभियान पूरा हुआ। साथी सदस्य इस परिवार के साथ खड़े रहे — सहयोग का हाथ, हर परिवार के साथ।"*

⭐ True of **every** closed drive. ⛔ Nothing to misread. ⚠ Also the least reason to join.

---

**⭐⭐ OPTION 2 — WHERE THE MONEY WENT.** The single most persuasive true fact this trust has.

> **EN:** *"This drive has closed. Every contribution went straight to this family — a hand of
> support, with every family."*
>
> **HI:** *"यह अभियान पूरा हुआ। हर योगदान सीधे इस परिवार तक पहुँचा — सहयोग का हाथ, हर परिवार के साथ।"*

⭐⭐ ***"went straight to"* is the correction ⛔ AND the invitation.** It is the verified fact
(`-192`, `upi-intent.ts`): money moves member → family, with ⛔ **nothing held by the trust**. ⇒ it
replaces the old falsehood with **the very truth that falsehood was hiding**, and it answers the first
question any prospective member has: *"where does my money actually go?"*

---

**⭐⭐⭐ OPTION 3 — THE ONE WE RECOMMEND.** Plain, warm, and it explains what membership *is*.

> **EN:** *"This drive has closed. Members from across the Pariwar stood beside this family, and every
> contribution went straight to the family — a hand of support, with every family."*
>
> **HI:** *"यह अभियान पूरा हुआ। पूरे परिवार-क्षेत्र के सदस्य इस परिवार के साथ खड़े रहे, और हर योगदान सीधे परिवार
> तक पहुँचा — सहयोग का हाथ, हर परिवार के साथ।"*

⭐ Carries **both** true things at once: **people who did not know this family helped it**, and **their
money reached it whole**. ⇒ that is the entire case for joining, told as a **record** rather than a
pitch. ⭐ Longer, which the brief now allows.

⚠ *"Members from across the Pariwar"* is chosen deliberately over *"members who never met this
family"* — the second is warmer but ⛔ we ⛔ cannot verify it of every contributor. ⭐ Pool assignment
**is** Pariwar-wide, so option 3 says only what is true.

---

**⭐ OPTION 4 — THE EXPLICIT INVITATION.** ⚠ Strongest pull, ⚠ and the one with a caveat.

> **EN:** *"This drive has closed. Members stood with this family, and every contribution went
> straight to them. This is what it means to belong to this trust — a hand of support, with every
> family."*
>
> **HI:** *"यह अभियान पूरा हुआ। सदस्य इस परिवार के साथ खड़े रहे, और हर योगदान सीधे परिवार तक पहुँचा। इस ट्रस्ट
> का सदस्य होने का यही अर्थ है — सहयोग का हाथ, हर परिवार के साथ।"*

⚠⛔ **TWO CAUTIONS, ⛔ neither a refusal.**
**(a)** *"This is what it means to belong"* is a **join-pitch**, and `-189` consequence 6 routes
join-pitch language to **counsel** — ⛔ not because it is wrong, but because a mutual-aid trust must
⛔ not read as an insurer promising cover. ⇒ picking 4 adds a counsel step ⛔ before it goes up.
**(b)** ⚠ It addresses **the reader** on **a family's memorial row**. ⭐ Options 1-3 let the record
speak and let the reader draw the conclusion; ⛔ option 4 draws it for them, next to a name.

---

**⭐⭐ OPTION 5 — ⛔ NOT A WORDING. A STRUCTURE. ⭐ Pick it ALONGSIDE one of the above.**

⭐ **Use ONE line for BOTH the met-in-full and the fell-short case.** Whichever wording you choose,
apply it to `fully_funded` **and** `under_funded` alike. ⛔ Only *"Reconciliation is still in
progress"* stays separate — that is about **process**, ⛔ not a funding verdict.

⚠⛔ **WHY, AND IT IS ⛔ NOT COSMETIC.** Constraint 3 forbids publishing a verdict — but **three
different sentences ARE the verdict.** A visitor comparing two rows can read off which drive fell
short. ⇒ the quarantine is kept in form and defeated in substance.

⭐ **And the dignity point runs the same way:** today, families of under-supported drives are
**publicly marked as such, permanently, on a memorial page.** Given (Q1) — the trust promises nothing,
so there is ⛔ **no promise to report against** — ⛔ no public interest is served by that mark.

⚠ **This answers (Q3):** yes, the ruling reaches `outcome.fully_funded` too. ⛔ Flagged, ⛔ not assumed
— collapsing the two is **your call**.

### 7.4 ⭐ The tagline goes IN EVERY ROW — as directed

⭐ **BigDev has directed the tagline into the line itself, and with ⛔ no length limit that is what we
build.** ⭐ It also serves the second brief: a visitor who scans three or four drives meets
**सहयोग का हाथ, हर परिवार के साथ** each time, and the phrase becomes the thing they remember.

⚠ **One observation, ⛔ recorded rather than argued:** on a page of twenty drives the tagline renders
twenty times. ⭐ If it ever begins to read as filler, the remedy is to lift it to the top of the page
**once** and keep the short half in the row — ⛔ a later adjustment, ⛔ not a reason to change course
now. ⛔ **Nothing about it blocks a decision today.**

### 7.5 ⭐ What we recommend

**⭐ Wording: OPTION 3. ⭐ Structure: OPTION 5. ⭐ Tagline: in every row, as directed.**

⇒ every drive that has closed reads, identically, whether it met the target or fell short:

> **EN:** *"This drive has closed. Members from across the Pariwar stood beside this family, and every
> contribution went straight to the family — a hand of support, with every family."*
>
> **HI:** *"यह अभियान पूरा हुआ। पूरे परिवार-क्षेत्र के सदस्य इस परिवार के साथ खड़े रहे, और हर योगदान सीधे परिवार
> तक पहुँचा — सहयोग का हाथ, हर परिवार के साथ।"*

⭐ **Why:** it is plain enough to read at a glance; it removes a falsehood **and** publishes the truth
that falsehood concealed; it ends the verdict leak instead of rewording it; ⛔ it marks no family; and
it makes the case for joining **by stating what happened**, ⛔ not by asking.

⚠ **⛔ A recommendation, ⛔ not a decision.** Any of the five ships the day you pick one. ⚠ If you pick
**4**, it goes to counsel first (§6).


---

## 8. ✅ THE PANEL'S RATIFIED WORDING — and ⛔ what stands between it and the page

### 8.1 ⭐ Ratified verbatim (DR + KB, 2026-09-05)

**Hindi**

> **स्व. {familyName} जी के परिवार के लिए सहकर्मियों ने मिलकर ₹{amount} का योगदान किया।**
>
> परिवार के हर सहकर्मी का सहयोग मायने रखता है। यही हमारी ताकत है।
>
> परिवार के साथ खड़े होने वाले हर सहकर्मी का हम हृदय से आभार व्यक्त करते हैं।
>
> **सहयोग का हाथ, हर परिवार के साथ।**
>
> **Pariwar से आज ही जुड़ें और इस आंदोलन का हिस्सा बनें।**

**English**

> **Late {familyName}'s family received contributions of ₹{amount} from colleagues.**
>
> When one family needs support, the whole Pariwar stands with them. Because in Pariwar, we stand
> together.
>
> Our heartfelt gratitude to every colleague who stood beside the family.
>
> **सहयोग का हाथ, हर परिवार के साथ।**
>
> **Join the Pariwar. Be the Movement.**

**Plus:** a table above the message — **Nominee full name** (left) · **District** (right) — on **both**
the member and the public view.

### 8.2 ⭐ What is ALREADY available — ⛔ verified live, ⛔ not assumed

| Element | Status |
|---|---|
| ⭐ **Nominee name, public tier** | ✅ **ALREADY RATIFIED AND SHIPPED.** `-190` cl.2 (DR + KB) put it at `tier: public` under the label *"Nominee Name"*; it is on the drive-page wire as `nomineeBankAccounts[].accountHolderName` and renders **un-gated** (⛔ no per-subject consent). ⇒ ⛔ **no new exposure decision is needed.** |
| ⭐⭐ ***"FULL* name"** | ✅⭐ **THIS CLOSES AN OPEN DEFERRAL.** `deferred-work.md` **(h)** `D-nominee-name-form` was routed at 11b.11 *because `-190` cl.2 ruled the LABEL and ⛔ not the FORM*. ⭐ The Panel has now ruled the form: **full**. ⇒ item (h) can be **CLOSED BY RULING**. |
| **District** | ✅ on the drive-page wire (`sahyog-vivran.ts:322`), ⚠ `.nullable()` — renders *"Not recorded"* today when absent. |
| **The gratitude / tagline / joining paragraphs** | ✅ pure copy. ⛔ Nothing blocks them. |

### 8.3 ⛔⛔ THE FOUR THINGS THAT BLOCK THE BUILD

**⛔ (1) `₹{amount}` DOES ⛔ NOT EXIST ON EITHER PUBLIC WIRE — and fixing it is CIRCULAR.**

Both contracts say it in terms:
- `sahyog-drive.ts:133` — *"⛔ A count, ⛔ never a sum of amounts, and ⛔ never a score."*
- `sahyog-vivran.ts:325` — the same sentence.

⇒ there is **⛔ no amount to interpolate.** ⭐ Publishing one is **story D**'s ruled deliverable
(`11b-14`, D1+D2 — *"extend the canonical producer; amount on both surfaces"*).

⚠⛔ **AND STORY D IS BLOCKED ON STORY B** (`-195` cl.3). ⇒ if B must render `₹{amount}`, **B needs D
and D needs B**. ⛔ That is a deadlock, ⛔ not a sequencing detail.

⭐ **Two clean ways out — the Panel or BigDev picks:**
**(a)** the message ships **with story D**, whole, amount included; **B** ships only the
falsehood-removal (a short line on the index);
**(b)** **B** ships the message **without** the first sentence, and **D** adds it.
⭐ **We recommend (a)** — the first sentence is the message's headline, and shipping the block without
it would read oddly and then change again weeks later.

**⛔ (2) THE MESSAGE WILL ⛔ NOT FIT WHERE THE OLD SENTENCE LIVED.**

The line it replaces is a **one-line cell** in the *"Close of cycle"* **column** of the index table —
⛔ one cell per drive, on a paginated list. ⭐ The ratified text is **five paragraphs plus a table**.
⇒ ⛔ it cannot go in a table cell, and twenty drives would render it twenty times.

⭐ **It is written for a PAGE, and the page exists:** the per-drive **Sahyog Vivran** page
(`/sahyog-vivran/{token}`) — which is also where the nominee name and district **already are**.

⇒ ⚠ **we need one decision:** does the index keep a **short** line (one of §7's five, or nothing at
all), with the **full message on the drive page**? ⭐ That is our recommendation.

**⛔ (3) *"BOTH MEMBER AND PUBLIC VIEW"* — ⛔ THE MEMBER VIEWS DO ⛔ NOT EXIST YET.**

⛔ There is **⛔ no member drive list and ⛔ no member drive detail** today. They are **story E**
(`11b-15`, the fourth tab) and **story F** (`11b-17`, the member's drive detail) — ⛔ neither built,
and **both blocked on B**. ⇒ B ⛔ **cannot** put this on a member view; ⭐ it can only ship the
**copy** that E and F then render.

⚠ ⛔ Not a refusal — a sequencing fact. ⭐ The member half lands at **E/F**, ⛔ not here.

**⚠ (4) `{familyName}` CAN BE ⛔ NULL — AND ON THE DRIVE PAGE IT IS ⛔ NOT THERE AT ALL.**

- ⚠ The deceased's name is **consent-gated**. `deceasedMemberName` is `.nullable()`, and the shipped
  copy says so: *"A family may choose whether their relative is named here, and may change that
  choice at any time."* ⇒ the message **needs a no-name variant in both locales**, or a withheld-name
  drive renders ***"Late 's family"***.
- ⛔⛔ **AND ON THE DRIVE PAGE THE NAME IS ⛔ NOT ON THE WIRE.** `sahyog-vivran.ts:29` states the
  surface carries *"⛔ no deceased member's name"*; that exposure is **story 11b.3b's**, gated on its
  own Panel rulings (`-173` / `-174`). ⇒ if the message goes on the drive page (blocker 2), ⚠ its
  **headline sentence has no name to use** until 11b.3b ships.

### 8.4 ⚠ FOUR THINGS RECORDED, ⛔ NOT BLOCKING

**⚠ (i) The name published under *"Nominee"* may ⛔ NOT be the nominee — and this promotes it.**
The matrix calls this *"the sharpest fact about this field"*: it is `account_holder_name_ciphertext`,
the **disbursement account holder**. Story **6.8 D1** removed the nominee linkage **deliberately** —
⛔ no FK to `member_nominees`, ⛔ no rank, ⛔ no match rule — and it is guarded by an approval chain
that **⛔ cannot see it**. ⇒ the value is **UNVERIFIED and today UNVERIFIABLE** (routed, `D5-subject`).
⚠⛔ **What changes:** today it is a small field label; the ruling makes it a **headline table above a
memorial message**. ⛔ The exposure is the same, ⭐ but the PROMINENCE is not. ⚠ Recorded so the Panel
promotes it **knowing**, ⛔ not by side-effect.

**⚠ (ii) There can be TWO nominee names.** `nomineeBankAccounts` is `.max(2)` — two **equal**
accounts (9.9: the donor picks). ⚠ If the two holder names differ, *"Nominee full name"* (singular)
is ambiguous. ⇒ needs a rule: **first? both? neither?**

**⚠ (iii) *"Join the Pariwar. Be the Movement."* is a JOIN-PITCH ⇒ counsel.**
`-189` consequence 6 routes join-pitch language to **counsel** — a mutual-aid trust must ⛔ not read
as an insurer promising cover. ⭐ We flagged this on §7's option 4; the ratified text is **more**
explicit. ⇒ **counsel (Adv. Mohit Agrawal) reviews it before it goes public.** ⛔ Not a refusal,
⛔ not a veto — a step, and it can run in parallel with everything else.

**⚠ (iv) The English and Hindi second paragraphs say DIFFERENT things.**
- **HI:** *"परिवार के हर सहकर्मी का सहयोग मायने रखता है। यही हमारी ताकत है।"* (*every colleague's support
  matters; that is our strength*)
- **EN:** *"When one family needs support, the whole Pariwar stands with them. Because in Pariwar, we
  stand together."*

⭐ Both are good. ⚠ They are ⛔ not translations of each other. ⇒ **is that deliberate** (each locale
written in its own voice — ⭐ a legitimate and often better choice) **or should they match?** ⛔ We
have ⛔ not "corrected" either; we ship exactly what was ratified once you confirm.

### 8.5 ⭐ What we propose

| # | Question | ⭐ Our recommendation |
|---|---|---|
| 1 | Where does the full message go? | ⭐ **The drive page.** The index keeps a **short** line from §7. |
| 2 | The `₹{amount}` deadlock | ⭐ **(a)** — the whole block ships with **story D**; **B** ships only the falsehood-removal now. |
| 3 | Member view | ⭐ **B ships the copy; E and F render it.** ⛔ Not buildable here. |
| 4 | Withheld name | ⭐ A **no-name variant** in both locales, ⛔ authored now, ⛔ not improvised later. |
| 5 | Two nominee names | ⭐ Panel to rule: first / both / neither. |
| 6 | The join-pitch | ⭐ To **counsel**, in parallel. ⛔ Blocks nothing else. |
| 7 | EN/HI divergence | ⭐ Confirm deliberate, or supply matched text. |

⭐ **What B can ship IMMEDIATELY, with ⛔ none of the above resolved:** the removal of *"The trust met
its commitment to the family"* and the two other false payout sentences (AC2). ⭐ **The falsehood does
⛔ not have to wait for the replacement.**

---



---

## 9. ✅ THE FOUR BLOCKERS ANSWERED — ⚠ and TWO findings on the new index line

### 9.1 ✅ Answered 2026-09-05 (BigDev, relaying DR + KB)

| # | Blocker | ✅ Resolution |
|---|---|---|
| **1** | the `₹{amount}` deadlock | ✅ **Dependency made EXPLICIT.** *"B defines the message structure and copy; D supplies the approved amount field."* ⇒ ⛔ no deadlock: B owns the **copy source**, D owns the **field**. |
| **2** | where the message goes | ✅ **The index gets its own ONE-LINE wording** — ratified, §9.2. The five-paragraph block stays for the drive page. |
| **3** | the member views | ✅ ***"B can ship the shared copy source now. E/F consume it later."*** ⇒ exactly Trap 5's shape, now ruled. |
| **4** | the withheld name | ✅ **No-name variant supplied:** *"The family received contributions of ₹{amount} from colleagues."* / *"परिवार के लिए सहकर्मियों ने मिलकर ₹{amount} का योगदान किया।"* |

⚠⛔ **ONE IMPLEMENTATION NOTE ON (1), so it is ⛔ not discovered as a bug.** `t()` **THROWS** on a
missing key and would interpolate `{amount}` to nothing while D is unbuilt. ⇒ **B ships the copy and
the no-amount variants; the amount-bearing line RENDERS only when D lands.** ⭐ B is ⛔ not blocked —
⛔ but it must ⛔ not render a sentence with an empty rupee figure in the meantime.

### 9.2 ✅ The ratified INDEX line (DR + KB, 2026-09-05)

> **EN:** *"{amount} contributed by colleagues for {nominee_name}, nominee of Late {family_name}, who
> served in {district_name} district."*
>
> **HI:** *"जनपद {district_name} में कार्यरत स्व० {family_name} की नॉमिनी {nominee_name} के लिए सहकर्मियों
> द्वारा {amount} का योगदान।"*

⭐ **VERIFIED AND CORRECT:** *"served in {district_name} district"* / *"जनपद … में कार्यरत"* is
**accurate**. `district` on this wire is documented as *"the deceased member's latest posting
district, RAW"* (`sahyog-drive.ts:130`) ⇒ the sentence says exactly what the field holds. ⭐ We checked
this rather than assume it.

### 9.3 ⛔⛔ FINDING 1 — THE LINE ASSERTS A RELATIONSHIP ⛔ NOTHING VERIFIES

> ⚠⭐ **READ §9.6 WITH THIS SECTION.** As first written this section was **too strong** — it read as
> though the holder↔nominee linkage were **arbitrary**. ⛔ It is ⛔ not: the **policy is established**.
> ⭐ §9.6 corrects it and proposes the better fix.

⚠⛔ ***"{nominee_name}, nominee of Late {family_name}"*** / ***"स्व० {family_name} की नॉमिनी
{nominee_name}"*** is a **sentence-level factual claim about two NAMED private individuals**: that
this person **is the nominee of** that deceased member.

⛔⛔ **THE DATA ⛔ CANNOT SUPPORT THAT CLAIM.** The value is
`account_holder_name_ciphertext` — the **disbursement account holder**. Story **6.8 D1** removed the
nominee linkage **deliberately**: ⛔ no FK to `member_nominees`, ⛔ no rank, ⛔ no match rule. The
public-vs-private matrix records it in terms:

> *"the account holder **MAY NOT BE THE NOMINEE**, and the value is guarded by a multi-stage human
> approval chain — verifier → state trustee → freeze — that ⛔ **CANNOT SEE IT** … this publishes,
> under the word 'Nominee', a value that is both **UNVERIFIED** and today **UNVERIFIABLE**."*

⚠⛔ **WHY THIS IS DIFFERENT FROM WHAT IS ALREADY SHIPPED.** Today the claim is **one word** — a field
labelled *"Nominee Name"* — and it is already routed as a known problem (`D5-subject`). ⭐ The new line
promotes it to a **full sentence naming both people and stating their relationship**. ⇒ if the account
holder is, say, a brother-in-law who received the disbursement, **the public index states — of a named
living person — that they are the nominee of a named deceased person, and that is false.**

⛔⛔ **AND IT IS THE ⛔ EXACT CLASS OF DEFECT THIS ENTIRE NOTE EXISTS TO FIX.** *"The trust met its
commitment"* was a sentence asserting something the system does not do. ⚠ *"X, nominee of Late Y"* is
a sentence asserting something the system **does not know**. ⭐ We would be replacing one unfounded
public claim with another — about **named private individuals** this time.

⭐ **THE SURGICAL FIX — ⭐ it keeps everything the Panel asked for except the unfounded half:**

> **EN:** *"{amount} contributed by colleagues for the family of Late {family_name}, who served in
> {district_name} district."*
>
> **HI:** *"जनपद {district_name} में कार्यरत स्व० {family_name} के परिवार के लिए सहकर्मियों द्वारा {amount} का
> योगदान।"*

⇒ ⭐ same warmth, same specificity, same tokens minus one — and it says **only what is true**:
colleagues contributed, for that family. ⛔ It also removes Finding 2 entirely.

⚠ **If the Panel wants the recipient named**, the accurate phrasing is what the data ⛔ does support —
that this person **received on the family's behalf** — ⛔ never that they **are the nominee**:
*"… for {nominee_name}, who received on behalf of the family of Late {family_name} …"*

### 9.4 ⛔⛔ FINDING 2 — THE NOMINEE NAME IS ⛔ NOT ON THE INDEX TODAY, AND THE INDEX IS BULK-HARVESTABLE

⭐ **Verified:** `sahyog-drive.ts` (the index contract) carries `deceasedMemberName`, `district`,
`closedAt`, the pool codes, the token and the confirmed count. ⛔ **It carries ⛔ NO nominee field at
all.** The nominee name lives only on the **per-drive page** (`sahyog-vivran.ts:265`).

⚠⛔ **⇒ `-190` cl.2 DOES ⛔ NOT ALREADY COVER THIS.** That ruling put the name on **one drive's page**.
Putting it on the **index** is a **different surface with a different exposure shape**:

- ⛔ The index is **paginated** and returns a `total` ⇒ ⭐ Story 11b.10's Panel note already established
  that **walking its pages harvests every row**.
- ⛔⛔ It carries a **district filter** (`sahyog-drive.ts:189`) ⇒ *"list every nominee in Lucknow
  district"* becomes **one request**.
- ⇒ the result is a **bulk-downloadable list of living private individuals — name + district —**
  ⛔ which does not exist today at any tier.

⚠ ⛔ **This is ⛔ NOT us re-opening `-190` cl.2.** ⭐ That ruling stands untouched for the drive page.
⇒ this is a **NEW exposure on a NEW surface** that the Panel has ⛔ not yet been asked about
([[feedback_supersede_never_reinterpret]] — ⛔ a ruling for one surface does ⛔ not auto-widen to
another).

⭐ **§9.3's surgical fix closes this too** — ⛔ no nominee name on the index, ⛔ nothing to harvest.

### 9.5 ⚠ ONE SMALLER ITEM — THREE NULLABLE TOKENS IN ONE SENTENCE

⚠ All three interpolations can be **absent**:

| Token | Null when | Today's index renders |
|---|---|---|
| `{family_name}` | ⭐ the family **declines to name** their relative (consent, and revocable) | the row, ⛔ without the name |
| `{district_name}` | ⛔ no posting row | *"Not recorded"* |
| `{nominee_name}` | ⛔ no disbursement account recorded | ⛔ n/a — ⛔ not on this wire |

⇒ ⭐ **the ratified no-name variant (answer 4) covers `{family_name}`** — ⚠ but the index line needs a
rule for `{district_name}` too, or a withheld-district drive reads *"who served in  district."*
⭐ **Simplest rule, ⛔ no combinatorial variants:** *omit the clause whose value is absent.* ⇒ one
sentence, three optional clauses.

### 9.6 ⚠⛔ CORRECTION TO §9.3 — **the POLICY is established; it is the VERIFICATION that is not**

⭐ **BigDev is right, and §9.3 as first written was ⛔ too strong.** ⚠ It read as though the linkage
between the account holder and the nominee were **arbitrary**. ⛔ It is ⛔ not. The record establishes
the **intent** plainly: money may ⛔ **not** go to any person other than the nominee, and the
decision log names the obligation in terms — the **APPROVER DUTY**.

⚠⛔ **⛔ BUT THE RECORD SAYS, EQUALLY PLAINLY, THAT THE DUTY ⛔ CANNOT BE PERFORMED TODAY.** ⭐ Three
findings, ⛔ all verified live at `054ff76a`, ⛔ none inferred:

**1. ⛔ The schema — which the decision log itself designates THE AUTHORITY — denies the linkage in
terms.** `packages/domain/src/schema/claim_nominee_bank_accounts.ts:9-11`, verbatim:

> *"there is deliberately **NO `nominee_rank` column, NO FK to `member_nominees`, and NO
> holder-name-must-match-nominee linkage of any kind: the filer types a holder name per account,
> full stop.**"*

⚠ `2026-09-04-190`'s follow-up records a **two-document contradiction** on exactly this point —
`contracts/src/contributions/nominee-accounts.ts:18` calls it *"the NOMINEE name"* while the schema
denies the linkage — and rules: ⭐ **"the schema is the authority."**

**2. ⛔⛔ NOBODY IN THE APPROVAL CHAIN CAN SEE THE FIELD.** `D5-subject` **(ii)**, the *"UN-MECHANIZED
APPROVER DUTY"*: *"⛔ nobody in the verifier → state-trustee → correcting-admin chain can SEE
`account_holder_name`; the only read-back is a **presence boolean**."*
⭐ **Verified live:** the ⛔ only decrypts of `account_holder_name` in the whole tree are the **public
page**, the **payment path**, and the **claim-intake write**. ⛔ There is ⛔ **no approval surface among
them.** ⇒ the duty exists and is ⛔ **structurally un-performable**.

**3. ⛔ `D5-subject` IS OPEN — BOTH HALVES**, with named triggers. ⛔ It was made **NON-BLOCKING** by
`D5(a)`; ⭐ it was ⛔ **not resolved** ([[feedback_closure_language_precision]]).

⇒ ⭐ **THE ACCURATE STATEMENT OF THE FINDING, replacing §9.3's:** the sentence *"X, nominee of Late
Y"* publishes as **established fact** a relationship that the Trust **intends and requires**, but
which ⛔ **no system step verifies and no human in the chain can check.** ⛔ It is ⛔ not an arbitrary
claim — ⚠ it is an **unverified** one, and the record says so in three places.

### 9.6.1 ⭐⭐ AND THERE IS A BETTER FIX THAN CHANGING THE WORDS

⭐ **The data to verify against ⛔ ALREADY EXISTS.** `member_nominees.name_ciphertext`
(`schema/member_nominees.ts:60`) holds the **declared nominee's name**, Tier-1, keyed
`(member_id, rank)`. ⇒ the match the schema declined to build at Story 6.8 is **buildable now**, from
data already collected.

⚠⛔ ⇒ **if the policy is that money reaches ⛔ only the nominee — and the Panel says it is — then the
right answer is ⛔ NOT to soften the public sentence. It is to MECHANIZE THE DUTY**, so that the
sentence becomes **true by construction**:

- ⭐ surface `account_holder_name` on Story **6.10**'s verification console, so the approver can
  actually perform the check they are already accountable for; and/or
- ⭐ record the holder↔nominee match as an explicit, auditable step at approval.

⭐⭐ **That is EXACTLY what `D5-subject` (ii) asks for**, and its recorded trigger is *"the next story
touching Story 6.10's console, **or any story adding a Tier-1 decrypt to an approval surface**."*
⇒ ⭐ this ruling is the occasion to schedule it, ⛔ not a reason to weaken the words.

⚠ ⛔ **It is ⛔ not 11b.12's work** — ⛔ this story touches ⛔ no approval surface. ⭐ It is a story of
its own, and the Panel's ruling is the strongest reason yet to open one.

### 9.6.2 ⛔ §9.4 IS ⛔ UNAFFECTED BY THIS CORRECTION

⚠ The **second** finding stands **whole**, ⛔ independent of the first: the nominee name is ⛔ **not on
the index wire at all**, and the index is **paginated + district-filterable** ⇒ putting it there
creates a **bulk-harvestable list of living private individuals** that `-190` cl.2 — a ruling about
**one drive's page** — does ⛔ not cover. ⭐ Even a **fully verified** nominee name raises that
question; ⛔ verification does ⛔ not answer it.

### 9.7 ⭐ What we need

| # | Question | ⭐ Our recommendation |
|---|---|---|
| 1 | *"nominee of Late …"* — an **UNVERIFIED** relational claim (§9.3, ⚠ **as corrected at §9.6**) | ⭐ **Open a story to MECHANIZE the approver duty** (`D5-subject` (ii)) — the match data already exists. ⚠ **Until it lands**, either adopt the surgical fix or ship the sentence **knowing** the check is un-performable. ⛔ Our recommendation is to mechanize, ⛔ not to soften. |
| 2 | nominee name on the **index** — a new, bulk-harvestable exposure (§9.4) | ⭐ **⛔ Do not put it there.** ⭐ Closed automatically by the fix above. ⚠ If the Panel wants it anyway, it needs its **own ruling** — ⛔ `-190` cl.2 does not reach this surface. |
| 3 | absent district (§9.5) | ⭐ **Omit the clause.** |

⭐⭐ **EVERYTHING ELSE IS SETTLED AND BUILDABLE.** ⭐ Answers 1, 3 and 4 close blockers 1, 3 and 4
outright; the drive-page block, the tagline, the gratitude paragraphs and the joining line are ⛔ not
affected by either finding. ⚠ Only the **one index sentence** is held, ⛔ and only on its middle clause.

---


---

## 10. ✅ ALL THREE ANSWERED — D2 IS CLOSED, and three pieces of work fall out

### 10.1 ⚠⛔ ONE ATTRIBUTION QUERY BEFORE THIS IS RECORDED AS RATIFIED

⚠ These rulings were relayed as **"by DR and KP."** ⛔ **Every prior ratification in this epic reads
"Dhiraj Rahul + Kalpana Bharti" — DR + KB.** ⭐ We have ⛔ **not** silently normalised *KP* to *KB*:
recording a Trustee ratification against the wrong person is a governance defect in its own right,
and this note already carries one lesson about asserting what we had not checked.

⇒ ⛔ **CONFIRM THE SECOND INITIALS.** ⭐ Everything below is recorded and buildable either way — only
the attribution line waits.

### 10.2 ✅ The three rulings

| # | Ruling | Effect |
|---|---|---|
| **1** | ⭐ **Open a story to MECHANIZE the approver duty.** | ✅ `D5-subject` **(ii)** moves from *routed* to **commissioned**. ⭐ The check becomes real; *"nominee of"* becomes true **because it was checked**. |
| **2** | ⭐ **Add the nominee name on the index.** | ✅ §9.4's finding is **ANSWERED, ⛔ not overruled** — the Panel was shown the bulk-harvest property and **accepted it**. ⇒ a **new Tier-1 public exposure on a new surface**, Trustee-ratified. |
| **3** | ⭐ **Omit the clause.** | ✅ An absent `{district_name}` (or any absent token) **drops its clause**. ⛔ No combinatorial variants. |

⇒ ⭐⭐ **D2 IS CLOSED.** The index line is settled, with the *"nominee of"* clause standing **because
ruling 1 makes it true**, ⛔ not because the objection was waived.

### 10.3 ⚠ ONE IMPLEMENTATION CONSEQUENCE OF RULING 2 — ⛔ NOT a re-litigation

⭐ **What is ⛔ NOT new, stated so it is ⛔ not raised as alarm:** the public surfaces are **already**
`edge_cacheable` at `s-maxage=300`, and the drive page **already** serves this decrypted name. ⛔ Edge
-caching a decrypted Tier-1 value is ⛔ **not** a new posture. ⭐ We checked before saying so.

⚠⛔ **What ⛔ IS new — the DECRYPT VOLUME:**

| Surface | Tier-1 decrypts per request |
|---|---|
| Drive page (today) | **1-2** — one drive, `.max(2)` accounts |
| Index (after ruling 2) | ⚠ **up to 100** — `PUBLIC_SURFACE_PAGE_SIZE_CAP = 50` rows × 2 accounts |

⇒ a **~50× step change in per-request KMS/decrypt load on the highest-traffic public endpoint**, which
is **unauthenticated** and **paginated**. ⚠ And `public-read.ts` currently joins ⛔ **no** nominee table
at all, so this is a **new join per row** as well.

⭐ ⛔ **Not an objection — a sizing fact.** ⇒ the story that builds it owes: a **batched** decrypt
(⛔ never N+1 per row), a **decrypt-failure posture** for a list (the drive page's per-field sentinel
does ⛔ not obviously scale to 50 rows), and a **measured** check against the shipped p95 tooling
([[project_measured_validation_framework]]).

### 10.4 ⭐ Where each ruling lands — ⛔ none of it is 11b.12's

| Ruling | Home | Why ⛔ not 11b.12 |
|---|---|---|
| **1** — mechanize the duty | ⭐ **A NEW STORY** (Story 6.10's console family) | ⛔ 11b.12 touches ⛔ no approval surface. ⚠ It is a **Tier-1 decrypt at a NEW internal surface** and owes its own PII-posture reasoning — `D5-subject` (ii) says so in terms. |
| **2** — nominee name on the index | ⭐ **ITS OWN STORY, or a NAMED addition to story D (11b-14)** | ⛔ 11b.12's **AC7** forbids touching any field tier, listing predicate or wire shape. ⚠ This is a contract + domain read + matrix + decrypt change. ⭐ D already extends the index (`live`, the meter, the amount) so it is the natural host — ⛔ but a **Tier-1 PII exposure is a different class** from D's work and needs its own AC and its own matrix row. |
| **3** — omit the clause | ✅ **11b.12**, ⭐ in the copy source it already owns | ⭐ A rendering rule over the copy B is already authoring. |

⚠⛔ **AND RULING 2 OWES A DECISION-LOG ENTRY BEFORE ANY CODE** — it is a **Trustee-ratified new public
Tier-1 exposure on a surface `-190` cl.2 did ⛔ not reach**, plus a **new matrix row**. ⭐ Governance
commits first, and separately ([[feedback_governance_commits_precede_implementation]]).

### 10.5 ⭐ What 11b.12 does with all this

⭐ **Ruling 3 only.** ⛔ Everything else is other stories' work, now named and owned.
⇒ **11b.12's scope is unchanged**: delete the three falsehoods (AC2), fix the stage vocabulary, ship
the shared copy source **including the ratified index line and the omit-the-clause rule** — ⚠ with the
`{nominee_name}` token **authored but ⛔ not yet rendered**, exactly as `{amount}` is (§9.1).

⭐⭐ **That is the same pattern for both pending tokens: B writes the copy; another story lights it up.**

---


---

## References

- `.decision-log.md#decision-2026-09-04-192` — the trust ⛔ never disburses; members pay the nominee directly
- `.decision-log.md#decision-2026-09-04-189` consequence 6 — *"an outcome of members paying, ⛔ never a guarantee the trust can make"*; the counsel route
- `.decision-log.md#decision-2026-09-04-193` cl.1 — upgrades `-192` cl.1 to Trustee-ratified
- `packages/domain/src/close-of-cycle/framing.ts:159` — `under_funded` ⟺ `deliveredTotal < expectedTotal`
- `packages/domain/src/pool/public-read.ts:729` — the per-row computation on the public index
- `apps/public/src/pages/sahyog.astro:148` — where the line renders
- `packages/i18n/locales/{en,hi}/sahyog-drive.json:44` — the string, both locales
- `packages/i18n/locales/{en,hi}/close-of-cycle.json:5` — the counterpart copy for the same enum,
  ⚠ **drafted at Story 7.8 (`3201f98e`) and ⛔ NEVER SHIPPED** — ⛔ zero consumers
- `packages/ui/src/noticeboard/presenter.ts:178` — *"⛔ No close-of-cycle (FR-19) read model exists,
  and ⛔ no story owns one"*
- `packages/i18n/locales/{en,hi}/contribution.json:124` — **"Raised so far"**, the one SHIPPED
  money register
- Story **11b.12** **D2** — this note's home; ⛔ non-blocking
