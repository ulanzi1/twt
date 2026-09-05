# Trustee Panel routing note — 2026-09-05
## The public index tells visitors **"The trust met its commitment to the family"** — and it says it **precisely when the family received LESS than expected**. ⛔ No decision of yours ever authorised that sentence.

**Author:** BigDev, Solo Builder — 2026-09-05
**Occasion:** Story **11b.12**'s validation pass (D2). ⭐ Found by **reading the producer**, ⛔ not the
copy: the string was traced to the branch that emits it before this note was written.
**Routed to:** Trustee Panel. ⚠ **And, on one question only, to counsel** — see §6.
**Status:** ⏳ **OPEN — awaiting the Panel.** Logged as Story 11b.12 **D2**.
⛔ **NON-BLOCKING.** Story 11b.12 proceeds without it; the string is ⛔ untouched until you answer.

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
- ⚠ **Its own product contradicts it.** The **same outcome enum** drives the member-facing
  close-of-cycle message, and for `under_funded` that one reads:
  > *"{N} colleagues stood together; {amount} reached {family}'s family. Our gratitude for standing
  > beside them."*
  ⇒ **members** delivered, and the amount that **reached** the family is what is named. ⛔ The trust is
  ⛔ not the actor. **Two copy families, one enum, opposite stories** — and the ratified register is the
  member-facing one.
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

**(ii) ⭐ THE TRUST MAKES ⛔ NO SUCH COMMITMENT — THE LINE GOES.** Replaced with the register the
product already uses: what **members' contributions** delivered, with ⛔ no comparison and ⛔ no claim
about the trust. ⭐ Aligns the public line with the member-facing one.

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

### One more thing worth knowing

Elsewhere in the product — in the message members themselves receive when a drive closes short — we
already say something different, and it does not mention the trust:

> *"{N} colleagues stood together; {amount} reached {family}'s family. Our gratitude for standing
> beside them."*

That version credits **the members**, and names what actually **reached** the family. The two messages
describe the same event and tell different stories.

### What we are asking

**1. Does the trust make a commitment to the family?** If yes — **what is it?**

**2. Given your answer, what should that line say?**

- **(i)** The trust *does* commit to something — tell us what, and we will say it accurately.
- **(ii)** The trust makes no such commitment — we remove the line and describe what members'
  contributions delivered, as we already do elsewhere.
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

## References

- `.decision-log.md#decision-2026-09-04-192` — the trust ⛔ never disburses; members pay the nominee directly
- `.decision-log.md#decision-2026-09-04-189` consequence 6 — *"an outcome of members paying, ⛔ never a guarantee the trust can make"*; the counsel route
- `.decision-log.md#decision-2026-09-04-193` cl.1 — upgrades `-192` cl.1 to Trustee-ratified
- `packages/domain/src/close-of-cycle/framing.ts:159` — `under_funded` ⟺ `deliveredTotal < expectedTotal`
- `packages/domain/src/pool/public-read.ts:729` — the per-row computation on the public index
- `apps/public/src/pages/sahyog.astro:148` — where the line renders
- `packages/i18n/locales/{en,hi}/sahyog-drive.json:44` — the string, both locales
- `packages/i18n/locales/en/close-of-cycle.json:5` — the member-facing counterpart, same enum
- Story **11b.12** **D2** — this note's home; ⛔ non-blocking
