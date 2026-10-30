# Trustee Panel routing note — three confirms on how staff change the neighbours' and the inspector's questions (non-blocking)

> **Status: SENT by BigDev and ANSWERED 2026-10-30 — recorded as [`-422`](../../.decision-log.md#decision-2026-10-30-422).** Written
> 2026-10-30 by Story 6.33 (Task 0.4) under [`-421`](../../.decision-log.md#decision-2026-10-30-421) QE14 (A). Non-blocking: the story is built
> on our suggestions, and ⛔ staff-written version can go live in production until you have answered (roster Row 45 (a)).

## §0 — the gate

**It is the Panel's:** in October you decided, in your own words, WHO may change the questions the Trust asks a dead member's neighbours and
family, and how. Building it, we hit three places where your words name a person the system cannot give that power to, or where we chose a
narrower meaning than your words could carry. Each changes who may change what families are asked — a delegation of your authority — so we
are asking you to confirm. Everything else in the build (how versions are stored, numbered, shown and audited) is engineering and is ⛔ in
this note.

---

> ## ✅ PANEL RULED — 2026-10-30 — recorded as `2026-10-30-422`
>
> **Ruled by DR + KB (Dhiraj Rahul + Kalpana Bharti), relayed by BigDev — verbatim:**
> *"by DR and KB*
> *Q1 A, Q2(a) A, Q2(b) A, Q3 A"*
>
> ⭐ Our suggestion **taken on all four**, each with its cost as put. ⇒ `-421` QE5 (A), QE6 (A), QE7 (a) are confirmed as built; roster Row 45
> (a) is met. ⚠ ⛔ covered: a Pariwar Admin's approval making a version live (it does ⛔ — only the Super Admin makes live, for one Pariwar
> or all).
>
> ⭐ Everything **below this block is kept UNEDITED** — it is the question as it was put.

---

# Q1 — who approves a new version for the State Trustee?

**In one sentence:** you said a State Trustee approves a Pariwar Admin's proposal; may a Pariwar Admin, acting for the State Trustee, do
that approving — including of their own proposal — with the Super Admin's step of making it live as the second pair of eyes?

**Why it cannot be decided without you:** your answer names the State Trustee for this step; we are giving it to someone else.

## The one fact that decides it

**The system cannot give a State Trustee a power over one Pariwar's own settings.** The State Trustee's role is built to cover a whole state,
and by design a state-wide role can never act on one Pariwar's own records. Every other State Trustee act on a Pariwar — the final vote on a
cycle, the R9 vote — is already cast by Pariwar Admins acting for the State Trustee (you were told this in October).

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **A Pariwar Admin approves, acting for the State Trustee; they may approve their own proposal; only the Super Admin can make it live** (our suggestion — what your October answer's own record reads). | Every new version passes at least two people: the Pariwar Admin who wrote or approved it, and the Super Admin who makes it live. | In practice one Pariwar Admin can write AND approve a version alone; the Super Admin is the only independent check. A Pariwar Admin of ONE Pariwar can approve a version the Super Admin then makes live for ALL Pariwars. |
| **B** | **As A, but a DIFFERENT Pariwar Admin must approve.** | Three people see a routine change. | A Pariwar with one admin cannot approve anything; the Super Admin must step in. This is the "a different person must approve" option you did ⛔ take in October. |
| **C** | **Only the Super Admin approves.** | One person — the Super Admin — approves and makes live. | The middle step you ruled disappears; the State Trustee has no part at all. |
| **D** | **The Trustee Panel itself approves each version.** | You see every new version before it is used. | Every version comes to you — the option you did ⛔ take in October; a version waits for a sitting. |

**Our reading:** **A** — **because** it is the same arrangement the Trust already uses for every State Trustee act on a Pariwar, and our record
of your October answer counts the Pariwar-side approver and the Super Admin as the two people. If you prefer B, C or D, it changes who holds
one permission before anything goes live.

---

# Q2 — the words you ruled

## Q2 (a) — may staff change the wording of the questions you ruled?

**In one sentence:** your answer lets the chain change questions *"with/without modification"*; may it change the WORDS of the questions you
ruled yourself (and the closing note and thank-you), or only add, change and remove the questions staff add?

**Why it cannot be decided without you:** locking your questions narrows the power your answer gave the chain.

**The one fact that decides it:** in October a change to the words of one of your questions was sent to you, and you ruled on it — that is
the only route a ruled question's words have ever changed by.

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **Your questions, closing note and thank-you are LOCKED** (our suggestion). Staff add, change, reorder and remove only their own questions. | Neighbours and families are asked your questions in exactly your words, in every version. | A clearer wording or a typo fix in one of your questions waits for a Panel decision. |
| **B** | **Staff may reword your questions** (what is asked and the answer choices stay the same). | Your questions may be worded differently in different Pariwars. | What neighbours and families are asked in your words changes without you. |

**Our reading:** **A** — **because** your words were ruled one by one, and the one time they changed, they came back to you.

## Q2 (b) — when you later change one of your questions, what happens to versions staff wrote on the old wording?

**In one sentence:** when you rule a new wording, should every staff version still using the old wording stop being used until staff re-base it
on yours, or keep running with the old wording until they do?

**Why it cannot be decided without you:** either your newer ruling waits behind what staff made live, or what staff made live is paused by it.

**The one fact that decides it:** staff versions copy your questions as they stood when written — so without a rule, your new wording would
never reach a Pariwar running a staff version.

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **Old-wording staff versions STOP being used** the moment your new wording is released (our suggestion); every Pariwar falls back to your new version until staff re-base theirs. | Your new wording reaches every neighbour and family at once. | The questions staff added are NOT asked anywhere until a staff version is re-based and made live again. ⚠ This also happens when counsel's legal basis is recorded by releasing a new version (rather than by editing one in place). |
| **B** | **Old-wording staff versions keep running** until staff re-base them. | Staff questions are never interrupted. | Your new wording does ⛔ reach a Pariwar until staff act — possibly never. |

**Our reading:** **A** — **because** under B, words staff made live would outrank your later ruling.

---

# Q3 — "make it live for all Pariwars": does that override a Pariwar's own version?

**In one sentence:** when the Super Admin makes a version live for all Pariwars, should a Pariwar that has its OWN version keep it, or should
"all" replace it too?

**Why it cannot be decided without you:** your words say *"for one pariwar/all pariwar"*; reading "all" as "every Pariwar without its own" is
narrower than the words.

**The one fact that decides it:** a Pariwar's own version was made live for that Pariwar on purpose, by the Super Admin.

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **"All" sets the default** (our suggestion): Pariwars with their own version keep it; the Super Admin's screen names them before confirming, and the Super Admin can return any of them to the shared version. | A Pariwar's own questions are never removed by a change meant for everyone else. | "All" does ⛔ literally reach every Pariwar — a question added "for all" (for example "Has the family filed any other claim for this death?") is ⛔ asked in a Pariwar with its own version until the Super Admin acts there too. |
| **B** | **"All" replaces every Pariwar's own version.** | Every Pariwar asks the same questions from that moment. | A Pariwar's own questions disappear without anyone in that Pariwar acting. |

**Our reading:** **A** — **because** it never undoes a choice made for one Pariwar by accident, and the screen shows exactly who is left out.

---

# What is at stake right now

- **Live today:** nothing. The way for staff to change the questions is not yet built; today every version of both questionnaires is written
  by us from your rulings.
- **Blocked:** nothing. We are building on our suggestions (A, A, A, A); a different answer changes one permission, one checking rule or how
  the live version is chosen — before go-live.
- **If nothing is decided:** no staff-written version goes live in production (the go-live record, Row 45 (a), stays open).

---

# How much to trust this note

- **Earlier versions of this question:** in October we proposed that a DIFFERENT person approve each version and that any health,
  cause-of-death or habits question come to you; you answered with your own chain instead.
- **Corrected while building, before this note:** our first build plan required the approver to be a different person from the author. We
  dropped it after re-reading our own record of your answer, which says a State Trustee approves *"a Pariwar Admin's proposal or their own"*
  — requiring a different person would have brought back the option you did not take. Q1 now asks you openly.
- **Still uncertain:** whether "State Trustee" in your answer meant a particular person or the role; whether you meant "all Pariwars" to
  override a Pariwar's own version; and whether counsel's legal basis for health questions will be recorded by editing a version in place or
  by releasing a new one (Q2 (b) pauses staff questions only in the second case).

---

# In plain English

In October you decided that staff may change the questions put to a dead member's neighbours and family: a Pariwar Admin proposes, the State
Trustee approves, and the Super Admin makes it live for one Pariwar or for all. We are building that now. Three things need your nod. First,
the system cannot let a State Trustee act on one Pariwar, so a Pariwar Admin approves on the State Trustee's behalf — as already happens for
the final vote and the R9 vote — and the Super Admin remains the second person before anything goes live. Second, we keep the questions you
wrote in your own words exactly as you wrote them; staff add their own questions alongside, and when you change your wording, staff versions
on the old wording pause until they are updated, so your words always win. Third, "make live for all Pariwars" leaves a Pariwar's own version
in place, and the screen says which Pariwars those are. We suggest all three; nothing goes live until you have answered.

---
---

# EVIDENCE — for the record, ⛔ not for the meeting

## E1 — What is already ratified, verbatim

> `2026-10-10-304` **Q7** (the neighbours' questions): *"Q7 - Pariwar Admin proposes, State Trustee proposes/approves  with/without
> modification. Super Admin make it live for one pariwar/all pariwar with/without modification. Superadmin can add question directly and make
> it live.No additional Permission required for Superadmin."*
> **Q8** (the inspector's questionnaire for the family): *"Q8 - Pariwar Admin proposes, State Trustee proposes/approves  with/without
> modification. Super Admin make it live for one pariwar/all pariwar with/without modification. Superadmin can add question directly and make
> it live. No additional Permission required for Superadmin."* (double spaces and *"live.No"* are the original's)

> `2026-10-10-304` decision item 4 (**Q6 A**): *"The text says "a few short questions" … the three questions are added … and the closing note
> before Submit, as put."*

> `2026-10-10-310` **CF3 (a)–(d) — yes:** *"(a) Every question the Panel ruled is in every version from now on (the first two-question draft
> kept on record, ⛔ never used); (b) a question added through the chain is ⛔ never a warning or a flag; (c) an alcohol question needs Q5
> changed first; (d) every health question is asked only once counsel has confirmed the basis — the texts wait for it."*

## E2 — What is NOT ratified

- **Who performs "State Trustee proposes/approves"** — Q7 / Q8 name the State Trustee; nothing rules who acts for them on a Pariwar's own
  questionnaire. (Q1)
- **Our own reading recorded under `-304`, ⛔ ratified:** *"A State Trustee "approves" a Pariwar Admin's proposal or their own; the Super Admin
  makes it live — so routine changes pass through at least two people (proposer / approver, and the Super Admin), EXCEPT the Super Admin's
  direct addition, which the Panel allowed alone."* (Q1 builds this as written.)
- **Whether *"with/without modification"* reaches the words of the Panel's own questions** — CF3 (a) keeps the questions in every version; it
  is silent on their words. A word change was routed to the Panel in October (`-328`). (Q2 (a))
- **What happens to a staff version when the Panel rewords a question** — nothing rules it. (Q2 (b))
- **Whether "all pariwar" overrides a Pariwar's own version** — nothing rules it. (Q3)
- Found fact told to the Panel in October (`2026-10-10-305` §1 (c), an author-commit): the final vote and the R9 vote *"are cast by
  **Pariwar Admins acting as Trustee-Lite**; the `state_trustee` role holds neither key"*.

## E3 — What the code actually does

- `packages/domain/src/rbac/roles.ts`: `state_trustee` = `CLAIM_APPROVE, MEMBER_SUSPEND, MEMBER_VIEW_VALIDITY, NIYAMAVALI_REVIEW,
  TC_APPROVE`, `scopeCeiling: 'state'`; the `CYCLE_FREEZE` comment reads *"gated on pariwar_admin-as-Trustee-Lite; direct state_trustee
  gating is RANK-ORDER BLOCKED (scope.ts §RANK-ORDER — no resolver can lift it)"*, and `CLAIM_R9_VOTE`'s *"Same Trustee-Lite posture as
  cycle.freeze"*.
- `packages/domain/src/rbac/scope.ts` §RANK-ORDER: *"A grant whose ceiling is `state` / `district` / `block` can NEVER satisfy a
  `pariwar`-dimension check, and NO organizational tree — however complete — changes that"*.
- Today every questionnaire version is reviewed code (`peer_mesh.v1`–`v4`, `ground_inspection.v1`, `packages/domain/src/questionnaires/`);
  ⛔ staff chain exists.
- What will be built (Story 6.33 v1.2, ⛔ YET BUILT at the time of writing — the story is `ready-for-dev`): QE6 (Q1 A), QE5 (Q2 (a) A and
  Q2 (b) A — the "stale ruled base" rule), QE7 (a) (Q3 A). Decision [`-421`](../../.decision-log.md#decision-2026-10-30-421) records them.

## E4 — Commands to re-verify every claim

```
grep -n '^### Decision 2026-10-10-304' .decision-log.md          # Q7 / Q8, item 4, the readings
grep -n '^### Decision 2026-10-10-305' .decision-log.md          # §1 (c) — Trustee-Lite votes
grep -n '^### Decision 2026-10-10-310' .decision-log.md          # CF3 (a)–(d)
grep -n '^### Decision 2026-10-13-328' .decision-log.md          # the word change routed to the Panel
grep -n '^### Decision 2026-10-30-421' .decision-log.md          # this build's decisions
grep -n 'or their own' .decision-log.md                          # the -304 reading
grep -n "scopeCeiling: 'state'" packages/domain/src/rbac/roles.ts
grep -n 'can NEVER satisfy' packages/domain/src/rbac/scope.ts
```
