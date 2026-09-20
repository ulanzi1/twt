# Trustee Panel routing note — may the nominee a member declared be changed after the member has died?

> **§0 gate — passed (2026-09-20).** This is the Panel's: it is about **who the Trust recognises as the person it owes,** and
> whether that can be altered by someone who stands to benefit. Stripped of every citation the sentence is *"after a member has died,
> may the person they named as their nominee still be changed — and by whom?"* — not a question we would answer alone in front of a
> trustee. ⚠ It was **mixed**, so it is split: the Panel is asked **only** whether and by whom. *How* the software would stop or
> check a change is ours and is not asked.

> ## ⏳ AWAITING PANEL RULING
>
> **Nothing is recorded here yet.** When the Panel rules, transcribe it into this block **and** into `.decision-log.md` as a new
> decision id. Everything below is then kept **unedited**, as the question **as it was put**.

---

# The question

**In one sentence:** After a member has died, **may the nominee they declared still be changed** — and if so, **by whom, and with
what check?**

**Why it cannot be decided without you:** The declared nominee is the person the whole death-claim process is built around — the
person the Trust checks the bank account against, and the person it owes. Whether that name can be altered *after the death*, by
whoever is handling the claim, is a question about what the Trust owes and to whom. It has been noticed twice and never asked: your
2026-09-19 ruling listed it as *not covered*, and the note that led to it said it was *"real, … recorded, and a separate question
for a separate note."* This is that note.

## The one fact that decides it

**Today nothing in the software stops it.** The only check is that the member has not withdrawn or been erased — and **death is not
one of those states.** So the declared nominee can be **replaced** after the member has died, and the new name check we are building
(the bank account holder against the declared nominee) then compares **two things the person handling the claim could control.**
The check would still run, and would still say "matches", without anyone being alerted that the answer was made to fit.

---

# What you are choosing between

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **Lock the declaration once a death claim is filed.** The family can no longer change the nominee; a genuine correction (a misspelt name, a wrong phone) goes **through a District Admin, with a note, and the check is repeated.** | Nobody can alter *who the nominee is* after the death without a staff member looking at it. | A bereaved family with an honest mistake must **go through the helpline or a District Admin** — more effort at a hard time. We also have to say **which moment** locks it (when a claim is filed, or when a death is reported). |
| **B** | **Allow the change, but make it impossible to miss.** The change is recorded; the District Admin is told **prominently** that the nominee was changed after the death; and the claim **cannot be approved until they confirm it.** | Families can still correct a mistake themselves. | It **still permits** a change by the person who benefits, and depends on the District Admin noticing and judging it — more work per file, and the judgement is theirs alone. |
| **C** | **Leave it as it is.** The reviewer sees two dates side by side — when the nominee was declared, and when the claim was filed — and nothing else. | Nothing changes for families. | The control you commissioned — *checking the account holder against the nominee* — **can be undone by rewriting the nominee first.** A reviewer must **notice the two dates and work out why they matter.** |

**Our reading: A** — **because** the purpose of the name check is that the nominee is fixed before the person handling the claim
has any reason to shape it, and only A restores that. **Cost, honestly:** it makes an honest correction harder, and someone must be
available to make it. ⚠ **This is separable:** if you prefer B, the same recording is built and the "cannot approve until confirmed"
step replaces the lock.

---

# What is at stake right now

- **Live today:** **Nothing.** The code is not in production. This is precautionary — but it is a **hole**, not a theory: it is
  reachable in the code as written.
- **Blocked:** **Nothing.** The name check can be finished as designed; it will simply be as strong as this ruling makes it.
- **If nothing is decided:** **C** stays. The reviewer sees the two dates, and the check can be made to fit.

---

# How much to trust this note

- **Earlier versions of this question:** the hole was **recorded on 2026-09-19** and again in your ruling's "not covered" list; it was
  **never put as a question.** This is its first appearance as one.
- **Corrected in this note:** we first assumed fixing it needed a new "deceased" state in the software. It does not — the check
  simply has to know about the death, which the software already records separately.
- **Still uncertain:**
  - We have **not exercised** it end to end. That the person filing a death claim in the app can reach the nominee routes rests on
    the way the routes are guarded and on the 2026-09-19 note's statement that the filer *"is the deceased member's"* session; we did
    not run it.
  - The **later "update" route** asks for an extra one-time code (a "step-up"). **We have not traced which phone receives it** — if
    it goes to the late member's phone, a family holding that phone could still pass it.
  - We do **not know how often** a family needs a genuine correction after a death.
  - "Death is a separate record, not a state" comes from a recorded working note and was **not re-derived** here.

---

# In plain English

When a member dies, the person handling the claim is signed in as that member. Right now, that session can still **change who the
member named as their nominee.** The new name check compares the bank account's holder against that named nominee — so if the
nominee can be changed after the death, the check can be made to say "matches" simply by changing the name first.

There are three ways to handle it. **Lock the nominee once a claim is filed** (safest; an honest mistake then needs a District
Admin). **Allow changes, but flag them loudly and make the District Admin confirm** (families can fix a mistake; but someone who
benefits can still make a change, and it rests on the reviewer). Or **leave it** (nothing changes for families, but the check you
asked for can be defeated).

We suggest **locking it**, because the point of the check is that the nominee is fixed before anyone has a reason to shape it. If
this paragraph and the evidence below ever disagree, **the evidence is the record.**

---
---

# EVIDENCE — for the record, not for the meeting

## E1 — What is already ratified or recorded, verbatim

**`2026-09-20-227` — "What this ruling does ⛔ NOT cover":**
> - the filer's ability to rewrite the declared nominee after the member's death (2026-09-19 routing note E2);

**The 2026-09-19 routing note (`trustee-panel-routing-note-2026-09-19-6-18-nominee-name-mismatch.md`), E2 — "Not asked here, recorded so it is not lost":**
> *"the member-nominee declaration can be rewritten after the member's death — the write path checks only for `withdrawn`/`anonymized` members, and the claim filer's session is the deceased member's. The new check therefore compares two values the filer may control. Story 6.18 shows the declaration date beside the claim's filing date and records this; the fix changes what a family may do and belongs in its own note."*

**The same note, in its own words:** *"⛔ Also NOT asked: that a family member can change the declared nominee after death. It is real, it is recorded (E2), and it is a separate question for a separate note."*

## E2 — What is NOT ratified

- **Whether a nominee declaration may be changed after the member's death.** No ruling covers it.
- **Who, if anyone, may change it, and with what check.** Not ruled.
- **Which moment** would lock it (a death reported, a claim filed, a claim approved). Not ruled.

## E3 — What the code actually does

⚠ A code comment is a claim, not evidence — each point below was traced.
- **The only guard is a state check for `withdrawn` and `anonymized`.** `apps/api/src/modules/nominee/nominee.handlers.ts` line 40: `const TERMINAL_STATES = new Set(['withdrawn', 'anonymized'])`; the life-events handler (`apps/api/src/modules/life-events/handlers.ts` line 42) has the same set. (E4.2)
- **The handler then REPLACES the declaration unconditionally.** After that check it calls `replaceMemberNominees` (delete-then-insert) with the submitted nominees; there is no "already declared" or "claim filed" check. (E4.3)
- **The domain writer has no guard at all** — its only check is that the insert returned the rows (`packages/domain/src/nominee/declaration-write.ts`). (E4.3)
- **Two routes reach it.** `POST /api/v1/member/nominees` requires **only a member session** (`preHandler: [memberSession]`). The Life Events update route (`${LIFE_EVENTS_BASE}/nominees`) adds a step-up code `'nominee_change'`. (E4.4)
- **The claim filer uses a member session.** The claim routes are `[memberSession, requireMemberStepUp(deps, CLAIM_HANDOVER_ACTION_CONTEXT)]`. ⚠ *Inference:* the same member session therefore reaches the nominee route — **not exercised**. (E4.5)
- **No check for death or a frozen account was found** in the nominee routes, handlers or the nominee domain module. (E4.6 — an **empty** result, reported as a finding: it is only as wide as those three places.)
- **What 6.18 does about it today:** it shows `nominee_declared_at` beside `claim_filed_at` — *"a PLAIN PAIR OF DATES with ⛔ no highlight"* — and nothing more. (E4.7)

## E4 — Commands to re-verify every claim

⭐ Run before sending. ⚠ A command that returns EMPTY is a finding, not a pass. Results as run 2026-09-20:

```
# E4.1 the ruling's "not covered" line and the source note's wording
grep -n "filer's ability to rewrite the declared nominee" .decision-log.md                       # -> found (-227's NOT-cover list)
grep -n -i "rewrite\|after the member's death" _bmad-output/planning-artifacts/trustee-panel-routing-note-2026-09-19-6-18-nominee-name-mismatch.md
#   -> lines 60 and 208, quoted in E1

# E4.2 the only guard
grep -n "TERMINAL_STATES" apps/api/src/modules/nominee/nominee.handlers.ts apps/api/src/modules/life-events/handlers.ts
#   -> nominee.handlers.ts:40 and life-events/handlers.ts:42, both `{'withdrawn','anonymized'}`

# E4.3 the write is unconditional after that guard
sed -n 96,136p apps/api/src/modules/nominee/nominee.handlers.ts                                   # -> the state check, then `replaceMemberNominees`
grep -n "throw new Error\|withdrawn\|anonymized\|claim" packages/domain/src/nominee/declaration-write.ts
#   -> only the "insert returned fewer rows" check (line 78); no state or claim check

# E4.4 the two routes
sed -n 20,40p apps/api/src/modules/nominee/nominee.routes.ts                                       # -> preHandler: [memberSession]
sed -n 44,62p apps/api/src/modules/life-events/routes.ts                                           # -> preHandler: [memberSession, requireMemberStepUp(deps, 'nominee_change')]

# E4.5 the claim filer's session
grep -n "memberSession, requireMemberStepUp" apps/api/src/modules/claims/claims.routes.ts         # -> lines 114, 132, 164

# E4.6 any death / frozen-account guard in the nominee code
grep -rn -i "isAccountFrozen\|account.frozen\|accountFrozen\|assertNotFrozen\|frozen overlay" apps/api/src/modules/nominee apps/api/src/modules/life-events packages/domain/src/nominee
#   -> EMPTY. A FINDING: no such guard was found in those three places.

# E4.7 what 6.18 already shows the reviewer
grep -n "nominee_declared_at\|claim_filed_at" packages/contracts/src/claims/nominee-name-check.ts  # -> lines 217 (the "plain pair of dates" comment), 232, 233
```

---

<!-- AFTER THE PANEL RULES — per the template:
1. Transcribe into the ⏳ block AND into `.decision-log.md` as a new decision id.
2. Keep every section above UNEDITED — it is the question as put.
3. Record what the ruling does NOT cover (a ruling on nominee changes does not settle changes to the bank accounts after death, which are governed separately).
4. Discharge the item wherever it is carried — `-227`'s "NOT cover" list, Story 6.18's AC2/AC12 and the 2026-09-19 note's E2 — and mark it DISCHARGED, never delete it.
5. If implementation follows (option A or B), it needs a ROW: a guard in the nominee handlers plus, for A, a staff correction route. -->
