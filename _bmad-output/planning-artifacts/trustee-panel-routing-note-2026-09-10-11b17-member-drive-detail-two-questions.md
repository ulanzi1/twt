# Trustee Panel routing note — 2026-09-10

## Story 11b.17 (**Story F** — the member's view of ONE drive) is **written and ⛔ not yet built.** Two questions block it. **(1)** You ruled the **expected figure (लक्ष्य)** onto the member's drive *list* last week and told us the *detail* page was **⛔ not decided by that ruling** — so we are asking. **(2)** ⚠⛔ **A clause you ratified says the family's UPI ID is *"shown to the logged-in member"* — and we recorded it as *satisfied* by a payment button that ⛔ never shows it.** We think that reading may be wrong, and we would rather ask than keep it.

> ⚠⛔ **A NOTE ON WHAT COUNTS AS EVIDENCE HERE.** Every factual claim below is either (a) **verbatim
> ratified text** from `.decision-log.md`, or (b) **verified repository state** — a shipped file's
> contents, a grep with its result, an absent route. ⛔ We have deliberately ⛔ **not** rested any part
> of this escalation on a code comment, a doc-block, or a story file's own prose — ⚠ **and Q2 exists
> precisely because we once did.** ⭐ §7 lists every command, so any claim here can be re-run.

> ⭐⭐ **THE ONE THING TO KNOW BEFORE READING FURTHER.** ⛔ **Neither question is a defect in what you
> ruled.** **Q1** is a question your own record left **explicitly open and handed to this story by
> name.** **Q2** is a place where you ruled clearly and **we narrowed it in our own notes** without
> coming back to you. ⇒ ⭐ Q1 asks you to **extend**; Q2 asks you to **confirm or correct us**.

---

## 1. What is being asked, precisely

| # | Question | What is blocked |
|---|---|---|
| **Q1** | Does the member's **per-drive detail** show the **expected figure (लक्ष्य)** — and for **which** drives? | ⛔ Story F cannot start. Its own "shows at least what the public shows" test ⛔ cannot be written either way. |
| **Q2** | Does *"the UPI ID is shown to the logged-in member"* mean the **ID itself is displayed**, or is a **"Pay by UPI" button** enough? | ⛔ Story F cannot start. ⚠ And a **standing record of ours is wrong** in one reading or the other. |

⭐ **Q2 is the one we would most like answered**, because a wrong answer there is not a missing
feature — it is either **a ratified instruction we quietly declined to follow**, or **a Tier-1 field
about to be put on screen on a reading you never gave.**

---

## 2. ⭐ What was ratified, and what was ⛔ NOT

### 2.1 Verbatim — `2026-09-04-189` **cl.3** (Trustee-ratified)

> ⭐⭐ **A MEMBER MUST SEE MORE THAN THE PUBLIC, AND ⛔ NEVER LESS.**

### 2.2 Verbatim — `2026-09-09-211` **Consequence 2** — ⭐ this note's occasion

> ⚠ Story `11b-17` (**F**, the member's drive **detail**) is ⛔ **not** ruled here. ⭐ Whether the
> per-drive view shows लक्ष्य, and on which axis, is F's question — ⛔ it does ⛔ not inherit this by
> symmetry.

### 2.3 Verbatim — `2026-09-09-211` **cl.1**

> **THE MEMBER'S DRIVE LIST RENDERS THE EXPECTED FIGURE.** Story `11b-15`'s fourth-tab list shows
> लक्ष्य per drive. ⛔ Its previous scope sentence — *"⛔ no target (story **C** keeps it hidden)"* — is
> **RETIRED**, at all three sites it appeared.

### 2.4 Verbatim — `2026-09-04-190` **cl.7** (Trustee-ratified)

> **7. ⭐ THE TARGET — WHO SETS IT AND WHO MAY REVEAL IT ARE SPLIT.**
> … **(b)** it is ⛔ **NOT visible** to member or public;
> **(c)** ⭐ **ONLY A SUPERADMIN may make it visible**, and **separately for member and for public**.

### 2.5 Verbatim — `2026-09-04-191` **cl.1** (Trustee-ratified — **Dhiraj Rahul** and **Kalpana Bharti**)

> **1. ⭐ `nominee_vpa` — A MEMBER FIELD, ⛔ NOT A PUBLIC ONE.** `-190` cl.1 removed the banking
> coordinates from `public`; ⇒ the VPA goes with them, and is **shown to the logged-in member so they
> can make the contribution**. ⭐ Closes `-190` follow-up (i) — BigDev proposed removal-for-consistency
> and the Panel confirmed it, ⚠ **with the purpose stated**: it is ⛔ not merely withheld from the
> public, it is **carried on the member surface as a payment coordinate**.

### 2.6 ⭐ What was ⛔ NOT ruled

- ⛔ **Nothing** says whether the **detail** page shows लक्ष्य. `-211` says so in as many words (§2.2).
- ⛔ **Nothing** says what *"shown to the logged-in member"* requires **on screen**.
- ⛔ **Nothing** says whether लक्ष्य on a **closed** drive behaves like a live one. ⚠ `-204` **cl.2**
  placed it *"right of the progress bar, **on a LIVE row**"* — ⭐ a slot that describes a live row and
  ⛔ says nothing about a finished one.

---

## 3. ⛔⛔ Q1 — does the **detail** show लक्ष्य?

### 3.1 What exists today — ⭐ verified, ⛔ not asserted

- The member's **list** carries it: `driveTargetInr` at
  `packages/contracts/src/contributions/member-drive-list.ts:187`.
- ⚠ **It is carried on `live` rows ⛔ ONLY.** The producer's own guard,
  `satisfiesMemberDriveLiveRowPairing` (`:236-244`), enforces
  `entry.status === 'live' ? true : entry.driveTargetInr === undefined`.
- ⭐ **⛔ Nothing renders today regardless.** The reveal is **fail-closed**: an absent
  `pariwar_drive_target_visibility` row is hidden from everyone (`-190` cl.7(b)), and ⛔ **no Pariwar
  has a row.**
- ⭐ **There is ⛔ no detail page yet.** `apps/mobile/app/(tabs)/` contains `index`, `panchayat`,
  `sahyog`, `shradhanjali` — ⛔ no per-drive route. Story F would build the first one.

### 3.2 ⛔⛔ THE FINDING

Story F was written to say *"⛔ no target"*. ⚠⛔ **That is the exact sentence `-211` cl.1 retired from
the sibling story**, and F had copied it. ⇒ as written, F would have produced a **detail page showing
less than the list it opens from, and less than the public index** — the inversion cl.3 exists to
forbid, and a contradiction of F's own acceptance criteria.

⭐ We have struck it. ⛔ **But striking it does ⛔ not decide what replaces it**, and `-211` told us not
to assume.

### 3.3 ⚠ And there is a **second axis** the list never had to face

The list carries लक्ष्य on **live** rows only. ⭐ The **detail** page covers **three** stages — `live`,
`closed` and `settled`. ⇒ a question the list's ruling ⛔ never met:

> ⚠ **On a drive that has FINISHED, does the member see what the target had been?**

⭐ **INFERENCE — ⛔ labelled as such:** we read `-204` cl.2's *"on a LIVE row"* as describing **where
the number sat on that screen**, ⛔ not as a rule that the figure disappears once a drive closes. ⚠ But
that is our reading of a slot description, ⛔ not a ruling, so we are ⛔ not acting on it.

---

## 4. ⛔⛔ Q2 — *"shown to the logged-in member"*: the ID, or a button?

### 4.1 ⭐ What you ruled — §2.5, in one line

The UPI ID is a **member field**, *"shown to the logged-in member so they can make the contribution"*,
and your record states the purpose: *"⛔ not merely withheld from the public, it is **carried on the
member surface as a payment coordinate**."*

### 4.2 What exists today — ⭐ verified

`packages/contracts/src/contributions/nominee-accounts.ts:44`, `:61` — the member's payment screen
receives a **boolean**, ⛔ never the ID:

```
* `vpaPresent` says whether a UPI `pa=` can be built for this account today WITHOUT exposing the VPA itself.
      vpaPresent: z.boolean(),
```

The ID itself is read **server-side** and folded into a UPI payment link, so a member can **tap and
pay** ⛔ without ever seeing the string.

### 4.3 ⛔⛔ THE FINDING — ⚠ **and it is ours, ⛔ not yours**

Our own working record (`deferred-work.md`, item (e)) reasons as follows, verbatim:

> ⭐⭐ **AND cl.1's purpose is ALREADY SATISFIED, ⛔ by a path that predates it:** the plaintext VPA is
> consumed **SERVER-SIDE** into the member's UPI intent … ⇒ ⛔ **do ⛔ NOT "close" anything by adding
> `vpa` to that wire**; that would be a NEW Tier-1 exposure ⛔ nobody ruled on.

⚠⛔⛔ **THAT LAST PHRASE IS ⛔ NOT ACCURATE, AND WE ARE CORRECTING IT IN FRONT OF YOU.** You **did**
rule on it — cl.1, Trustee-ratified, **with the purpose stated.** ⇒ what is genuinely unruled is ⛔ not
*whether* the member gets the VPA, but **what *"shown"* requires**:

- ⭐ **The narrow reading (what we built):** the member can *use* the coordinate. Purpose served; the
  string stays off the screen and out of screenshots.
- ⭐ **The plain reading (what the words say):** *"shown … carried on the member surface"* means the
  member can **read it** — and can therefore pay from **another** device, another app, or by reading
  it to someone, ⛔ none of which a button on one screen supports.

⚠ **We took the narrow reading in a working note and recorded the item CLOSED.** ⛔ It was never put
back to you. ⭐ Story F is the first surface that would act on it either way, which is why it surfaces
now.

### 4.4 ⚖️ What is actually at stake — ⛔ stated plainly

⚠ A UPI ID is ⛔ **not** like an account number. It is designed to be handed out — it is how people are
paid. ⭐ But it is still a **bereaved family's** payment address, and Story F would put it in front of
**every member of the Pariwar, for every drive, indefinitely** (`-199`), on a phone, ⛔ where it can be
screenshotted and forwarded.

⇒ ⭐ the question is ⛔ not *"is a VPA sensitive"* in the abstract. It is: **does your instruction that
it be *shown* mean shown, given that population?**

---

## 5. ⚖️ Stated fairly, in both directions

**For showing more (Q1 लक्ष्य on all stages; Q2 the ID visible):**
⭐ These are the people who **funded** the drive. A trust that hides from its own members what a drive
was aiming for, or where the money was sent, is a strange kind of transparency. ⭐ And cl.3 — *a member
sees more than the public, never less* — points this way on every axis.

**For showing less (Q1 live-only; Q2 the button only):**
⚠ Everything on a member's phone is **screenshottable, forwardable, and ⛔ not revocable** — a page can
be taken down; a screenshot cannot. ⚠ The expected figure on a **closed** drive is a fact about a
family's shortfall that serves ⛔ no payment purpose once the drive is over. ⚠ And the UPI ID's purpose
— **paying** — is already fully served without displaying it.

⛔ **We take neither side.** ⭐ We note only that Q2's narrow reading was adopted **without asking**, and
that is the part we are correcting.

---

## 6. The options — ⛔ none is pre-ruled

### 6.1 Q1 — लक्ष्य on the member's drive detail

| | Option |
|---|---|
| **(A)** | ⭐ **Show it, on `reveal_to_members`, on ALL THREE stages** (`live` · `closed` · `settled`). ⭐ Consistent with the list by construction; ⭐ satisfies cl.3 on every stage; ⚠ discloses a finished drive's shortfall. |
| **(B)** | ⭐ **Show it, on `reveal_to_members`, on LIVE drives only** — ⭐ exactly mirrors the list and `-204` cl.2's slot. ⚠ A member opening a **closed** drive sees no target, which is ⛔ not less than the public (the public index is live-only too). |
| **(C)** | ⛔ **Do not show it on the detail at all.** ⚠⛔ We must say plainly: this would put the **detail below the list** for the same drive, and we ⛔ cannot reconcile it with cl.3 or with F's own acceptance criteria. ⇒ if you choose it, ⭐ it needs a stated reason we can record. |
| **(D)** | ⭐ Something else. |

### 6.2 Q2 — the UPI ID on the member's drive detail

| | Option |
|---|---|
| **(A)** | ⭐ **Confirm the narrow reading — the button is enough.** ⛔ The ID stays off every screen; `vpaPresent` remains a boolean. ⭐ Our record becomes correct as written, ⚠ and we amend its wording (*"nobody ruled on"* → *"cl.1 confirmed as satisfied by the payment path"*). |
| **(B)** | ⭐ **Confirm the plain reading — show the ID.** ⭐ cl.1 is applied as written; Story F renders it beside the other coordinates. ⚠ A new Tier-1 field reaches the member surface, and we would record the exposure the way `-199` was recorded. |
| **(C)** | ⭐ **Show it, but narrower than `-199`** — e.g. ⛔ only while a drive is still collecting, or ⛔ only for the drives that member was asked to pay into. ⚠ This would make the VPA the **one** coordinate scoped differently from the rest, which we would need to build and test separately. |
| **(D)** | ⭐ Something else. |

⚠⛔ **A note on `-199`, so it is ⛔ not mistaken for a ruling of yours.** The decision applying `-190`
cl.3 *"literally"* — any member, any drive in their Pariwar, any stage — is **author-committed by
BigDev**, ⛔ **not Trustee-ratified.** ⭐ It enumerated *"account number, IFSC, UPI ID and holder
name"*. ⇒ Q2(B) is ⛔ not a new grant so much as an admission that the enumeration and our working
note **disagreed**, and ⛔ nobody noticed.

---

## 7. ⭐ How every fact above was established — ⛔ re-runnable

⭐ All paths relative to the repository root; `main` at `a2617869`.

| # | Claim | Command |
|---|---|---|
| C1 | `-211` hands the लक्ष्य question to F by name | `sed -n '110,116p' .decision-log.md` |
| C2 | `-211` cl.1 retired *"no target"* from story E | `sed -n '57,62p' .decision-log.md` |
| C3 | `-191` cl.1 is **Trustee-ratified** (DR + KB) and states the purpose | `sed -n '2022,2036p' .decision-log.md` |
| C4 | ⛔ Only `-191` **cl.4** was ever superseded (by `-204`); ⭐ cl.1 stands | `grep -n "191.*SUPERSEDED\|SUPERSEDED.*191" .decision-log.md` |
| C5 | `-199` is **author-committed**, ⛔ not Trustee-ratified | `sed -n '1486,1488p' .decision-log.md` |
| C6 | The member wire carries लक्ष्य | `grep -n "driveTargetInr" packages/contracts/src/contributions/member-drive-list.ts` |
| C7 | ⚠ It is carried on **live** rows only | `sed -n '236,244p' packages/contracts/src/contributions/member-drive-list.ts` |
| C8 | The member payment wire carries a **boolean**, ⛔ never the VPA | `grep -n "vpaPresent\|vpa" packages/contracts/src/contributions/nominee-accounts.ts` |
| C9 | Our working note called it *"a NEW Tier-1 exposure ⛔ nobody ruled on"* | `sed -n '336,352p' _bmad-output/implementation-artifacts/deferred-work.md` |
| C10 | The reveal is fail-closed and ⛔ no Pariwar has a row | `sed -n '83,90p' .decision-log.md` |
| C11 | ⛔ No per-drive route exists today | `ls "apps/mobile/app/(tabs)/"` |

---

# Appendix A — In plain words

## The first question

Last week you decided that when a member opens the list of drives in their Pariwar, they should see
**the expected figure** — लक्ष्य — for each one. ⭐ You also said, in the same decision, that this did
**not** automatically settle what happens on the **detail page** for a single drive, and that we should
come back and ask. ⭐ This is us asking.

There is a reason it matters. A member taps a drive in the list and opens its page. ⚠ If the list shows
the expected figure and the page does not, then **going in for more detail gives you less** — which is
the opposite of how it should work, and the opposite of a rule you have already given us: *a member
should see more than a stranger, never less.*

⚠ There is one extra wrinkle. On the list, the figure appears only for drives that are **still
collecting**. ⭐ The detail page also covers drives that have **finished**. ⇒ so: **should a member
looking at a finished drive still be able to see what it had been aiming for?** ⛔ Nobody has decided
that, and we are not deciding it for you.

> ⭐ **Nothing shows to anyone today either way** — the figure is switched off everywhere until a
> Superadmin turns it on, and ⛔ nobody has.

## The second question — ⚠ this one is a correction, ⛔ not a request

In September you ruled that the family's **UPI ID** is a **member** field. Your words were that it is
*"shown to the logged-in member so they can make the contribution"* — and the record went further,
saying it is *"carried on the member surface as a payment coordinate"*, ⛔ not merely kept from the
public.

⚠⛔ **What we actually built shows the member a "pay" button and ⛔ never the ID itself.** The app
knows the UPI ID behind the scenes and uses it to make the payment work, but a member ⛔ cannot read it.

⛔⛔ **And then we wrote in our own working notes that your instruction was "already satisfied" by that
button, and closed the matter — without asking you.** ⚠ We also wrote that showing the ID *"would be a
new exposure nobody ruled on"*, which was ⛔ **not right**: you had ruled on it. ⭐ We are putting that
in front of you rather than leaving it buried in a file.

⇒ **so: when you said the UPI ID is *shown* to the member, did you mean they can see it?**

⭐ It makes a practical difference. If a member can only tap a button, they can pay ⛔ only from that
phone, in that app, at that moment. If they can **read** the ID, they can pay from a different app,
from a computer, or pass it to a family member who is doing the paying.

⚠ And the reason it is not obvious: a UPI ID is meant to be given out — it is how people get paid. ⛔ But
this one belongs to a **bereaved family**, and the plan is to show it to **every member of the
Pariwar, for every drive, from now on** — on phones, where anything on screen can be photographed and
passed along.

⛔ **We are not arguing for either answer.** ⭐ We are saying that we chose one quietly, and that was
not ours to choose.

## What happens now

⛔ **Nothing is being built until you answer.** Story F is written and held.

⭐ If you are content with the payment button as it is, say so and we will correct our note to say you
confirmed it — ⛔ rather than that nobody had been asked.
