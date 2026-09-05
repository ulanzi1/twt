# Trustee Panel routing note — 2026-09-05
## The public index tells visitors **"The trust met its commitment to the family"** — and it says it **precisely when the family received LESS than expected**. ⛔ No decision of yours ever authorised that sentence.

**Author:** BigDev, Solo Builder — 2026-09-05
**Occasion:** Story **11b.12**'s validation pass (D2). ⭐ Found by **reading the producer**, ⛔ not the
copy: the string was traced to the branch that emits it before this note was written.
**Routed to:** Trustee Panel. ⚠ **And, on one question only, to counsel** — see §6.
**Status:** ✅⭐ **(Q1) ANSWERED — Trustee-ratified, Dhiraj Rahul + Kalpana Bharti, 2026-09-05:**
> **"Trust doesn't make any commitment to the family."**
> **"We are open to suggestions on new wording and waiting."**

⇒ **Option (ii) is chosen.** The line **goes**. ⏳ **(Q2) OPEN — wording proposed at §7, awaiting
ratification.** ⛔ Nothing is applied until the Panel picks one. Logged as Story 11b.12 **D2**.
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
> It is at the end and is **complete on its own** — the whole question, the options, and what follows
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
