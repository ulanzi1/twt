# Trustee Panel routing note — when a death is filed a second time, which filing day counts?

> **§0 gate — passed (2026-10-15).** You ratified SC1 — A, *"Count from the filing day, with two limits"*, accepting the cost *"a family
> that plans ahead can still change who is asked"* (`2026-10-14-331`). A death can be filed more than once. Which filing "the filing
> day" means decides whether that accepted cost stays where you set it (option A or C) or grows (option B, as built today). That is a
> reading of a ratified rule, so it is yours. ⛔ It is not blocking: the build continues with the rule exactly as written, behind one
> function, and the answer is a small change there with its own test.
> ⭐ Routed by BigDev from Story 6.36's validate pass (2026-10-15): *"Route to the Panel"*.

---

> ## ⏳ AWAITING PANEL RULING
>
> ⛔ **Nothing is recorded here yet, and the note has ⛔ not been sent.** When the Panel rules, transcribe the answer into this block
> **and** into `.decision-log.md` as a new decision id. ⭐ Everything below is then kept **unedited** as the question as put.

---

# The question

**In one sentence:** when a family files a claim, the claim is closed, and the family files again for the same death, should the five
people asked be chosen as things stood before the **first** filing or before the **latest** one?

**Why it cannot be decided without you:** you ratified "before the filing day" with a stated cost (*"a family that plans ahead can
still change who is asked"*). Both answers fit those words. One keeps the cost at what you accepted. The other lets a second filing
reopen it.

## The one fact that decides it

Between a first and a second filing, the family may still hold the dead member's phone and can record a new school or office on the
member's account. The family can no longer change the people the member named: from the first filing the app refuses every
People-who-know-me action on the dead member's account. (A named person can still withdraw, and that counts — it is their own choice,
never the family's.) **The workplace is not frozen.** So if the second filing's day counts, a family can change the workplace
after their first claim fails and then file again. The colleagues of the school they chose would be asked.

---

# What you are choosing between

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **The first filing counts.** Every later claim for the same death uses the first claim's filing day. | A change made to the dead member's account after the first filing ⛔ never decides who is asked, on any later claim. | A genuine correction made between two claims (a school recorded wrongly before the first filing and fixed later) is ignored too, and staff are ⛔ not told of it; the ground inspection always runs. And if a member was once wrongly reported dead and that claim was refused, a later real death would count from the old, false filing — possibly years earlier — and colleagues would be read as of then. (Option C narrows this.) |
| **B** | **Each claim's own filing counts** (the rule as written today). | A family whose first claim was closed can change the recorded workplace and file again. The new school's colleagues are then asked. | The cost you accepted (*"a family that plans ahead can still change who is asked"*) grows. A closed claim gives the family a second chance to plan. Staff see the warning line only when the change falls in the 90 days before the new filing. |
| **C** | **The first filing counts, unless an investigation found the member innocent of a claim filed while they were alive** (the finding you already ratified in September). | As A; a later real death after a false report on which an investigation found the member innocent counts from its own filing. | That finding is recorded by a later piece of work (the fraud register) that is not built yet and waits on legal advice. Until it is, C behaves exactly as A. A false report refused WITHOUT an investigation leaves no finding and still anchors as in A. Nothing new is asked of staff. |

**Our reading:** **C** — **because** it keeps your ruling's cost exactly where you accepted it, and it uses the innocence finding you already ratified to keep an old false report
from deciding who is asked about a real death; until that finding can be recorded it is the same as A. "The filing day" then means the day the
Trust was first told of the death. That is also the day the app already stops the dead member's account changing the people they named. Under B,
the workplace stays open to the family after a failed claim while the named people are closed to them, and nothing about the case explains that difference.

---

# What is at stake right now

- **Live today:** nothing. The app is not in production, and the five are not yet texted (that is a later story).
- **Blocked:** nothing. The build uses B (the rule as written) behind one function, so A or C is a small change there with its own test (C also reads the innocence finding).
- **If nothing is decided:** B ships, and the gap above stays open until you answer.

---

# How much to trust this note

- **Earlier versions of this question:** none. The 2026-10-14 confirm note (SC1) did not consider a second filing.
- **Corrected in this note:** the first draft (2026-10-15, before sending) said the app "refuses every change" to the named people —
  over-broad: only the dead member's account is refused; a named person can still withdraw. It also quoted the decision's heading
  ("as recorded before the filing day") as if it were the ratified text; §0 now quotes SC1 — A as put. A fresh-context check found
  both. A third check found option A's cost was missing the false-report case; it is now in A's cost, our reading and the plain
  English. A draft of the recommendation then said to restart the count after ANY refusal — that would have reopened option B for
  the commonest re-file (the family's, after a refusal), and "refusal" is not a single recorded state; a fourth check caught it, and
  the narrower version is now option C in the table. A fifth check found option C was first written as "a new staff step and a new
  recorded reason" — wrong: you ratified the innocence finding in September (`-238`) and its table already exists (nothing writes it yet); C now uses it.
- **Still uncertain:** how often a death is filed twice. Today a claim can be filed again after a refusal, and after a closure for no
  response once a District Admin or the helpline confirms it. Some staff actions also create a new claim for the same death. We have
  not counted how often each happens.

---

# In plain English

When someone dies, the Trust asks up to five people who worked with them whether the death is real. To stop the family choosing those
people, we look at where the member worked as recorded before the day the family filed the claim. You agreed to that, and accepted
that a family could still change it before filing.

Sometimes a claim is closed and the family files again. If we look at the record before the second filing, the family had all the
time between the two claims to change where the member is recorded as working. We suggest using the day of the first filing, because
that is when the Trust first learned of the death. The app already stops the family changing the member's named people from that day.
One exception needs care: if a living member was once wrongly reported dead and that claim was refused, the first filing would be
that old mistake. You already ruled that an investigation can find such a member innocent; once that finding is recorded, the count
should start again from the real death's own filing (option C). Until the Trust can record it, C works the same as A.

---
---

# EVIDENCE — for the record, ⛔ not for the meeting

## E1 — What is already ratified, verbatim

> `2026-10-14-331` (Trustee-ratified), call 1 — **SC1 — A.** *"colleagues recorded at the school for 90 days or more are asked first,
> and staff are told when the member's workplace or the people they named changed in the 90 days before the claim."* Its cost, as put
> and accepted: *"A family that files late can miss the previous school's colleagues; a family that plans ahead can still change who
> is asked — staff see the warning, and the ground inspection always runs."*

> `2026-09-21-238` (Trustee-ratified), cl.1: *"A claim filed against a member who is **alive** does ⛔ not lock that member's
> declaration for life. On investigation finding the member **innocent**, the declaration **unlocks immediately**."* cl.4: *"An
> investigation finds the member **innocent** or **guilty**. ⛔ No third outcome."*

> `2026-10-10-310` (Trustee-ratified) CF4 A — the five are the member's workplace colleagues; *"the family ⛔ never chooses"* (narrowed
> by SC1 A to "a change before the filing day still counts, limited").

## E2 — What is NOT ratified

Which filing "the filing day" means when one death has more than one claim. SW19 (6.36a's record, committed by `-330`, author-commit) says *"the claim's
filing date (`claims.created_at`, IST)"*. Each claim has its own row and its own `created_at`, so the text as built is option B.

## E3 — What the code actually does

- One selection per claim (`claim_peer_mesh_selections.claim_case_id` UNIQUE). A new claim gets a new selection and a new cut.
- A death can be filed again (`packages/domain/src/claim/refile-guard.ts`): after a closure for no response, ONLY when the District
  Admin or the helpline confirms, with a note (`2026-09-27-254`); after a refusal the family re-files freely. A filing made while a suspicion refusal stands (6.24a) is kept
  apart from the refused claim, so it becomes a new claim; the ICP override (`packages/domain/src/claim/icp.ts`) also creates one. *Inference, not counted:* each
  of those then reaches the selection job.
- The innocence finding has a home: `claim_nominee_findings.kind = 'member_found_innocent'`
  (`packages/domain/src/schema/claim_nominee_findings.ts`), already read with the same filter: the declaration-lock check asks
  whether any claim names the member with ⛔ `member_found_innocent` finding on it (`packages/domain/src/claim/nominee-lock.ts`). Its producer is a later
  row (the fraud register, counsel-gated) ⇒ ⛔ nothing writes it in production today.
- The family can no longer change the named people from the first filing: `knownPeopleCallerSql` (`packages/domain/src/member/known-people.ts`) refuses
  every 6.36b route for a CALLER whom any claim, in any state, names as the deceased (`2026-10-15-333` call 1). A NAMED person can
  still withdraw (call 1 (b)), and a named person's erasure still changes the set — neither is the family's act.
- Postings are not frozen: the life-events posting route has no such check. Its own comment says *"change after a death is answered
  by 6.36's cut"* (`apps/api/src/modules/life-events/handlers.ts`).

## E4 — Commands to re-verify every claim

```
grep -n '^### Decision 2026-10-14-331' .decision-log.md
grep -n 'claim_case_id' packages/domain/migrations/0054_claim-peer-mesh.sql
sed -n 1,20p packages/domain/src/claim/refile-guard.ts
grep -n 'export function knownPeopleCallerSql' -A3 packages/domain/src/member/known-people.ts
grep -n "6.36's cut" apps/api/src/modules/life-events/handlers.ts
grep -n '^### Decision 2026-09-21-238' .decision-log.md
grep -n "member_found_innocent" packages/domain/src/claim/nominee-lock.ts
```
