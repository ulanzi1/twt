# Trustee Panel routing note — 2026-09-18

> ## ⏳ AWAITING PANEL RULING
>
> ⛔ **Nothing is recorded here yet.** When the Panel rules, the ruling is transcribed into this block
> and into `.decision-log.md`, and the sections below are kept **unedited** as the question AS PUT
> ([[feedback_supersede_never_reinterpret]]).

---

## ONE question, and it is a conflict between two things you have already ruled — ⛔ not a new policy ask

On 2026-09-16 you ruled option (E): the **public** Sahyog Vivran contributor list keeps a row for a
contributor whose name is withheld and renders a placeholder (`A contributor` / `एक सहकर्मी`).

The **member-facing** contributor list still DROPS that row entirely. ⇒ a member looking at their own
pool cannot tell the list is incomplete; any stranger on the internet can.

⚠⛔ **Closing that gap would satisfy one of your rulings by breaching another.** That is the whole of
the question, and it is why it is here rather than being built.

> ⚠⛔ **A NOTE ON WHAT COUNTS AS EVIDENCE.** Every claim below is either **verbatim ratified text** from
> `.decision-log.md` or **verified repository state** at a named line. ⛔ Nothing rests on a code
> comment or a story's prose. §5 lists the commands.
> ⚠ **AND A DISCLOSURE, BECAUSE IT BEARS ON HOW MUCH WEIGHT TO GIVE THIS NOTE:** the escalation that
> produced `-219` recorded this matter as *"UNRULED"*. ⛔ That was **wrong** — it was ruled on
> 2026-09-04 — and the error was the author's, corrected at `-221`. ⇒ ⭐ what follows is a **narrowed**
> question, ⛔ not the one `-219` asked.

---

## 1. What is being asked

| | Question | What is at stake |
|---|---|---|
| **Q** | May the **member-facing** contributor list render a placeholder row for a withheld name — or does `2026-08-30-169` cl.1 (D5) continue to forbid it there? | ⛔ Nothing on the public page changes either way. ⚠ What changes is whether a member can learn that their own pool's list is incomplete. |

⭐ **This is ⛔ NOT asking about the NAME FORM.** That half — public sees the full name, a member sees
`firstName + lastInitial` — you already ruled at `-189` cl.3. It is a **discharge**, it needs a story,
and it is ⛔ not on this note.

---

## 2. The two clauses, verbatim

### 2.1 `2026-09-04-189` **cl.3** — Trustee-ratified

> **3. (Q3) — ⭐⭐ A MEMBER MUST SEE **MORE** THAN THE PUBLIC, AND ⛔ **NEVER LESS**.** ⇒ the inversion
> `-188` recorded is **⛔ NOT acceptable** and must be closed.

⭐ Scoped by [`-195`](#) **cl.1** to the **drive data class** — *"the nominee/bank fields and the drive
record"* — and the contributor name is treated as inside that scope in the shipped tree
(`packages/contracts/src/public-pages/matrix.ts`) and in Story 11b.3b's **AC10**.

### 2.2 `2026-08-30-169` **cl.1 (D5)** — ruled for the MEMBER list specifically

> **D5 — THE GOVERNING RULING: RTBF REMOVES THE CONTRIBUTOR ENTIRELY.** … ⛔ **No anonymized row is
> emitted** — ⛔ no marker, ⛔ no placeholder, ⛔ no `rowKey`, ⛔ nothing occupying the position where
> that person used to be.
> **Ground, verbatim:** the person's representation *"should disappear, rather than leaving an
> **identifiable or correlatable placeholder**"*

⚠ `-219` cl.2 superseded this **for the public surface only**, deliberately and by name. On the member
surface it stands **whole**.

---

## 3. Why this is a real conflict and ⛔ not a drafting slip

A placeholder on the member list **satisfies `-189` cl.3** (the member stops seeing less) by **breaching
`-169` cl.1** (a marker occupies the position).

⚠⛔⛔ **AND THE GROUND OF D5 BITES HARDER ON THE MEMBER SURFACE THAN IT DID ON THE PUBLIC ONE.** D5's
stated reason is that the erasure must ⛔ not be *"identifiable or correlatable"*. Consider who is
reading:

| | Public drive page | A member's own pool |
|---|---|---|
| Audience | strangers, unauthenticated | the pool's own assigned members |
| Population | a drive's contributors, unknown to the reader | a small set of **known colleagues** |
| What a placeholder says | *"someone here is unnamed"* | *"one of the people I know is unnamed"* |

⇒ ⭐ on the member surface a placeholder is **closer to naming the person**, which is the exact harm D5
exists to prevent. ⚠ That is the argument for leaving the member list alone — and it is ⛔ not
symmetrical with the reasoning that carried (E) on the public page.

⭐ **The argument the other way, stated as strongly:** you ratified (E) on a **FAIRNESS** ground — that
every reader should learn the list is incomplete rather than only the arithmetic-minded. ⚠ The member
has the **strongest interest** in their own pool's completeness, and is currently the one reader who
cannot learn it at all.

---

## 4. What a member sees today — verified, ⛔ not assumed

`apps/api/src/modules/member-pool/handlers.ts` returns `null` for **all five** withholding causes — a
failed profile read, an unresolvable name, a failed decrypt, the erasure sentinel, an empty name after
split — and the results are filtered out. ⇒ ⛔ no row, ⛔ no marker, ⛔ no gap.

⚠ **And the member wire carries ⛔ no `total`.** `AssignedPoolContributorList` is `confirmed[]` plus
`pending { count, percentage }`, where `count = rosterSize − confirmedCount`. ⇒ ⛔ not even the
subtraction the public page permits is available; a member could only approximate `rosterSize` from an
integer percentage.

⇒ ⭐ **the member's position is strictly less informed than the public's, on BOTH axes.**

---

## 5. Options

| | Option | Cost |
|---|---|---|
| **A** | **Leave the member list as it is.** Record that `-169` cl.1 (D5) prevails on the member surface, and that `-189` cl.3 yields to it **for the omission-visibility axis only**. | ⛔ No code. ⚠ A member stays less informed than a stranger about their own pool, and `-189` cl.3 carries a second standing exception. |
| **B** | **Extend the placeholder to the member list.** Supersede `-169` cl.1 for that surface as `-219` cl.2 did for the public one. | Code in `apps/api/member-pool`, `packages/ui/contribution-list`, `apps/mobile`. ⚠ Points a marker at a known colleague — D5's ground, at its sharpest. |
| **C** | **Give the member the COUNT without the marker** — publish the set size on the member wire so the list can say *"N confirmed"* beside fewer named rows, with ⛔ no per-row placeholder. | ⭐ Satisfies `-189` cl.3's *"never less"* without occupying the erased person's position. ⚠ Re-creates on the member surface exactly the derivable-tally property (E) was ratified as accepting on the public one. |
| **D** | **Refer to counsel first**, as a DPDPA question about an erasure's visibility to a known peer group. | ⚠ Delay. ⭐ Adv. Mohit Agrawal is already engaged. |

⭐ **Our reading is (C) or (A).** (C) is the only option that closes `-189` cl.3's gap without putting a
marker in the erased person's position; (A) is the honest minimum if you judge D5's ground to prevail
on a peer-visible surface. ⛔ We do ⛔ not recommend (B) without counsel.

---

## 6. What is blocked

⛔ **Nothing.** Story `11b-3b` is `done` — neither axis was ever its to close (**AC8** fenced the member
surface out, and **AC10** discharged the obligation `-195` cl.1 actually placed on it: *"each must state
its compliance"*).
⚠ What is carried is a **breach of a standing ruling** (`-189` cl.3) on both axes, recorded at `-221`.
⛔ It is ⛔ not an accepted trade, and `-177` cl.2 may ⛔ not be cited as though it were.

---

## 7. Commands to re-verify

```
grep -n "A MEMBER MUST SEE" .decision-log.md                    # -189 cl.3, verbatim
grep -n "^### Decision 2026-09-04-195" .decision-log.md         # cl.1 scopes it to the drive data class
grep -n "^### Decision 2026-08-30-169" .decision-log.md         # cl.1 (D5), the member-surface prohibition
grep -n "^### Decision 2026-09-02-177" .decision-log.md         # cl.2, the CARRY — dated BEFORE -189
sed -n '/splitFirstNameLastInitial(fullName)/p' apps/api/src/modules/member-pool/handlers.ts
grep -n "return null" apps/api/src/modules/member-pool/handlers.ts   # the five drop arms
sed -n '/AssignedPoolContributorList = z/,/strict()/p' packages/contracts/src/contributions/pool-contributor-list.ts
```

---

## Appendix — the question in plain English

*Nothing new here; it restates §3 without technical terms. If anything differs, the sections above are
the record.*

When a member exercises their **right to be forgotten**, their name disappears from the list of people
who contributed. You ruled that on the **public** page we now leave a small line saying *"a
contributor"* in their place — so an ordinary visitor can tell the list is incomplete, instead of only
someone who does the arithmetic.

On the page a **member** sees for their own pool, we still remove the line completely. So a member
cannot tell anyone was removed.

**Making the two match would break a different rule you made.** When you ruled on erasure, you said the
person should *disappear* rather than leave anything **"identifiable or correlatable"** behind. On a
public page, a blank line among strangers says very little. On a member's own pool page, the other
people are **their colleagues** — a blank line there is much closer to pointing at a specific person.

So: **is it better that a member can see something was removed, or better that nothing marks the spot
where their colleague used to be?**

There is a middle option: show the member a **number** — *"12 confirmed"* above 11 names — without
putting anything in the removed person's place. That tells them the list is incomplete without
marking whose line is missing. ⚠ It has its own cost: from the number and the names, the count of
removals can be worked out — the same trade you accepted knowingly for the public page.
