# Trustee Panel routing note — 2026-09-18

> ## ✅ PANEL RULING — recorded 2026-09-18 (Dhiraj Rahul + Kalpana Bharti)
>
> **Option (B).** The **member** contributor list renders the placeholder too, in the **same words** —
> `A contributor` / `एक सहकर्मी`. ⛔ No member-specific variant, ⛔ no second key.
>
> ⇒ `2026-08-30-169` **cl.1 (D5)**'s placeholder prohibition is **SUPERSEDED IN PART** on this surface
> as well, completing the supersession across **both** contributor lists. ⚠⛔ **The placeholder half
> ⛔ ONLY** — D5's **⛔ NO ROW KEY**, its RTBF representation-removal, and its *"identifiable or
> correlatable"* ground all **STAND WHOLE**, the last of these as `-219` cl.4(c): ⛔ nothing may
> disclose WHICH of the five causes applies.
>
> ⭐ `-219` cl.3's word constraint travels with the word and is ⛔ not re-opened. ⛔ `Anonymous` /
> `गुमनाम` and ⛔ `Not recorded` / `दर्ज नहीं` stay ruled out by name.
>
> ⇒ **the `-189` cl.3 vs D5 conflict is CLOSED** — `-189` cl.3 prevails on this surface.
>
> Recorded as **Decision `2026-09-18-222`**. ⭐ Axis A and Axis B now discharge on the same code path,
> so story **`11b-21`** carries both and its Axis-B exclusion fence is **lifted by that entry**.
> ⚠ The sections below are the question **as it was put**, kept ⛔ unedited — including both
> corrections the note carried before it reached the Panel.

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
> ⚠⛔ **AND A DISCLOSURE IN TWO PARTS, BECAUSE IT BEARS ON HOW MUCH WEIGHT TO GIVE THIS NOTE.**
> **(1)** The escalation that produced `-219` recorded this matter as *"UNRULED"*. ⛔ That was **wrong**
> — it was ruled on 2026-09-04 — and the error was the author's, corrected at `-221`. ⇒ ⭐ what follows
> is a **narrowed** question, ⛔ not the one `-219` asked.
> **(2)** ⚠ **This note's own §3 and §5 were CORRECTED on 2026-09-18, after it was first written.** The
> original argued that a placeholder is MORE dangerous on the member surface, and recommended against
> extending it. ⭐ Two checks against the shipped tree defeated that (§3); the superseded reasoning and
> the superseded recommendation are both QUOTED in place, ⛔ not deleted, so the Panel can see what
> changed and why. ⇒ ⚠ **the author has now been wrong about this question twice.** ⛔ Weigh the
> EVIDENCE in §3 and §4, ⛔ not the author's reading in §5.

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

## 3. The conflict is FORMAL. ⛔ The privacy substance behind it does ⛔ not survive checking

A placeholder on the member list **satisfies `-189` cl.3** (the member stops seeing less) by **breaching
`-169` cl.1** (a marker occupies the position). ⭐ That much is true and is why this note exists.

⚠⛔⛔ **BUT THIS SECTION FIRST ARGUED SOMETHING STRONGER, AND IT WAS TESTED AND FOUND WEAK.** ⛔ The
superseded reasoning is QUOTED, ⛔ not deleted:

> ⛔ *"AND THE GROUND OF D5 BITES HARDER ON THE MEMBER SURFACE THAN IT DID ON THE PUBLIC ONE … on the
> member surface a placeholder is **closer to naming the person**, which is the exact harm D5 exists to
> prevent. That is the argument for leaving the member list alone."*

⭐ **TWO CHECKS AGAINST THE SHIPPED TREE DEFEAT IT:**

1. ⛔ **A MEMBER CANNOT ENUMERATE THEIR POOL'S ROSTER.** `AssignedPoolContributorList`
   (`packages/contracts/src/contributions/pool-contributor-list.ts`) is `confirmed[]` **plus**
   `pending { count, percentage }` — a **COUNT**, ⛔ not names. ⇒ there is ⛔ no list to intersect a
   placeholder against. The *"small set of known colleagues"* the old argument leaned on is ⛔ not
   available to the reader on that surface.
2. ⭐⭐ **THE IDENTICAL PLACEHOLDER IS ⭐ ALREADY PUBLIC FOR THE SAME PEOPLE.** `/sahyog` links to every
   drive page via a server-returned token (`apps/public/src/lib/sahyog-render.ts`, `driveHref`), the two
   status enums are the **same three values** (`live` / `closed` / `verified`), and both lists come from
   the **same producer**. ⇒ the member can open the public page for their own drive and see the
   placeholder there — beside **full legal names**, rather than the shielded form their own screen gives
   them.

⇒ ⚠⛔ **WITHHOLDING THE PLACEHOLDER FROM THE MEMBER PROTECTS ⛔ NOTHING.** It does ⛔ not prevent that
member learning anything; it makes them **the only reader who cannot see it on the surface that is
theirs**, while a stranger sees it plus the fuller name form.

⚠ **THE ONE RESIDUAL CASE, RECORDED RATHER THAN GLOSSED:** the per-Pariwar public kill switch. With
public surfaces switched OFF, the drive page does ⛔ not render and the member surface WOULD be the sole
disclosure point. ⭐ It is an **emergency control, default-ENABLED**, so the ordinary state is
"public page available" — ⛔ but if the Panel weighs the erasure question under a kill-switched Pariwar,
that is the case where the old argument still has force.

⭐ **And the argument FOR, unchanged and now unopposed:** you ratified (E) on a **FAIRNESS** ground —
every reader should learn the list is incomplete, ⛔ not only the arithmetic-minded. ⚠ The member has the
**strongest interest** in their own pool's completeness and is currently the one reader who cannot learn
it at all.

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

⚠⛔⛔ **OUR READING CHANGED, AND THE SUPERSEDED ONE IS QUOTED, ⛔ NOT DELETED.** ⛔ IT READ:

> ⛔ *"Our reading is (C) or (A). (C) is the only option that closes `-189` cl.3's gap without putting a
> marker in the erased person's position; (A) is the honest minimum … We do ⛔ not recommend (B) without
> counsel."*

⭐⭐ **IT IS NOW (B).** That recommendation rested on §3's correlation argument, which ⛔ did ⛔ not
survive checking (see §3): a member cannot enumerate the roster, and the identical placeholder is
already public for the same people.
⇒ ⚠ **(C) is now the WEAKEST of the three, ⛔ not the safest.** It gives the member LESS than a stranger
already gets, while still re-creating on the member surface the derivable tally you accepted knowingly
on the public one. ⇒ it pays a privacy cost and ⛔ does ⛔ not buy the parity `-189` cl.3 asks for.
⇒ ⚠ **(A) is now simply the breach, continued** — ⛔ no longer a defensible minimum, because the harm it
was protecting against is ⛔ not there.
⭐ **(B) is what `-189` cl.3 already points at**, and it is the only option that leaves a member no worse
informed about their own pool than a stranger is.
⚠ **We ⛔ do ⛔ not withdraw (D).** If the Panel weighs the kill-switched case in §3, or wants the
data-subject question tested independently, counsel is already engaged — ⭐ but it is ⛔ no longer a
precondition in our reading.

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
sed -n '/PendingContributorsAggregate = z/,/strict()/p' packages/contracts/src/contributions/pool-contributor-list.ts
                                                                # a COUNT, not names — no roster to intersect

# §3 check 2 — the same placeholder is already public, and reachable
grep -n "driveHref(row.publicToken" apps/public/src/lib/sahyog-render.ts      # the index links every drive
grep -n "PublicSahyogVivranStatus = z.enum" packages/contracts/src/public-pages/sahyog-vivran.ts
grep -n "PublicSahyogDriveStatus = z.enum" packages/contracts/src/public-pages/sahyog-drive.ts
                                                                # identical enums ⇒ no status window
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

**Making the two match touches a different rule you made.** When you ruled on erasure, you said the
person should *disappear* rather than leave anything **"identifiable or correlatable"** behind.

⚠ **We first argued that this made the member page the more dangerous place for a placeholder** — the
other people there are their colleagues, so a blank line points closer to someone specific. ⭐ **We
checked that, and it does not hold.** Two reasons: a member is never shown a list of who else is in
their pool (only a count of how many have not yet contributed), and the very same placeholder is
**already on the public page** for the same drive — which that member can open in one click, where it
sits beside people's **full names** rather than the shortened form their own screen shows.

⇒ So keeping it off the member's page **protects nobody**. It only means the member is the one person
who cannot see it, on the page that belongs to them.

**One exception, for honesty:** if a Pariwar has switched its public pages off, the public page is not
there, and the member's page would be the only place the removal shows. That switch is an emergency
control and is normally on.

There is also a middle option: show the member a **number** — *"12 confirmed"* above 11 names — without
putting anything in the removed person's place. ⚠ On checking, this now looks like the **weakest**
choice: it still lets the count of removals be worked out, and it leaves the member knowing less than a
stranger does.

### What we suggest, and how much to trust it

⭐ **Our suggestion is to show the member the same small line the public page already shows** — option
**(B)** in §5. It is the only choice that leaves a member no less informed about their own pool than a
stranger on the internet already is, and it is the direction your 2026-09-04 ruling already points.

⚠⛔ **But weigh the two facts above rather than our suggestion.** We have now been wrong about this
question **twice**: first by recording it as something you had never ruled on when you had, and then by
arguing a danger that turned out not to exist. ⭐ Both corrections are written into this note where the
old wording used to sit, so you can see what changed. ⇒ the parts worth your weight are that **a member
is never shown who else is in their pool**, and that **the same line is already public for the same
people** — ⛔ not our reading of them.

⚠ And one thing ⛔ does ⛔ not change on any answer: this is a **clause conflict**, so whichever way you
go, one of two things you ruled has to give. That is why it is in front of you rather than built.
