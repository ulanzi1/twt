# Trustee Panel routing note — "when they died": the system sees only the day the claim is filed

> **Status: SENT by BigDev and ANSWERED 2026-10-31 — recorded as [`-430`](../../.decision-log.md#decision-2026-10-31-430).** Written
> 2026-10-31 from Story 6.38's fourth code review (finding A). ⛔ Member uses the system yet.

## §0 — the gate

**It is the Panel's:** both questions decide whose families the Trust helps (what the Trust OWES), and Q1's answer may need a small record
of a refused filing, which your 30 October ruling said is ⛔ kept. **Split out and ⛔ asked:** how a check is built, where a date is
stored, and how staff screens word it — ours, once you answer. **Stripped of every reference, the question reads:** *"if a person who never
paid dies, and their family pays afterwards, does the Trust owe them a claim?"* — a question about people, ⛔ about code.

---

> ## ✅ PANEL RULED — 2026-10-31 — recorded as `2026-10-31-430`
>
> **Ruled by DR + KB (Dhiraj Rahul + Kalpana Bharti), relayed by BigDev, verbatim:**
> *"by DR and KB*
> *Q1 - B, Q2 - A"*
>
> ⭐ Our suggestion was **taken on both questions**.
> - **Q1 B:** before any drive opens, staff compare the date of death on the certificate with the date the fee was paid, and ⛔ drive
>   opens if the fee came after. This is added to the staff check already ruled at `-424` Q1 (a) C (row `6-39`, a go-live condition).
> - **Q2 A:** refused at the door, as built.
>
> Our readings needed to build are recorded in `-430` as ⛔ ratified: the fee date is the receipt's payment date, the same-day edge is
> ⛔ decided and is owed by 6-39's create-story, and what the family is told is ⛔ ruled. Story 6.38 is ⛔ changed.
>
> ⭐ Everything **below this block is kept UNEDITED**. It is the question as it was put.

---

# The question

**In one sentence:** your ruling turns a family away when the person *"had not yet paid when they died"* — but the system cannot tell
when the person died, only when the claim is filed; should a joining fee paid **after** the death open the door?

**Why it cannot be decided without you:** answering it means choosing between letting a late payment through, checking dates at a step
that does not exist yet, or keeping a note of a refused filing — and you ruled that a refusal leaves ⛔ record.

## The one fact that decides it

**A refused filing leaves no trace, so the door forgets it.** When a claim is filed, the system has ⛔ date of death — that arrives
later, from the death certificate. So the door looks at the person's membership **on the day the claim is filed**, and treats that as their
membership when they died. If the family is turned away because the fee was never paid, nothing is kept. If someone then pays the fee from
the dead member's phone (it needs that phone, its one-time code, and a real payment), the person becomes a member in their first days after
joining — which your rules cover — and a second filing is let in. Nothing on the payment step asks whether a death was reported, because
none was kept.

---

# Q1 — a joining fee paid after the death

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **Leave it as built** — the day the claim is filed counts. | A family that pays after the death and files again is helped like any other. | It lets through exactly the case your ruling turns away; it only needs the dead member's phone and the fee. Families who are turned away and *don't* think to pay are treated differently from those who do. |
| **B** | **Staff check the dates before any drive opens** (our suggestion). The door stays as built. The staff check you already asked for on 31 October (an unchecked identity is checked from the death documents before any drive) also compares the **date of death on the certificate** with the **date the fee was paid**. Paid after the death ⇒ ⛔ drive. | Most families see no change. A family that paid after the death is stopped before money is asked of anyone, ⛔ at the door. | The staff step is ⛔ built yet and grows by one comparison; it must exist before members' claims go live, as you already ruled for it. The family is stopped LATER — after filing and sending documents — which is harder news than a refusal at the door. Until it is built, A stands. |
| **C** | **Keep a small note of a refused filing.** Not a claim, ⛔ appeal — only "a filing for this person's death was refused on this day". A later filing for the same person is refused the same way, whatever was paid since. | A family that pays after the death is turned away again at the door. | It is a record, which your 30 October ruling said a refusal does ⛔ leave. A mistyped member number would leave that note against a LIVING person, and when they die years later their family is turned away — silently, with ⛔ appeal — unless staff find and remove it. |

**Our reading:** **B** — **because** it uses the real date of death instead of a stand-in, keeps no record of refusals, and rides on a
staff step you have already required before claims go live. Its cost is that the family hears it later. You can reject this reading and
still use the table.

# Q2 — a member who died while a member, but whose membership ended before the death was reported

**In one sentence:** if a member dies, and before anyone reports the death their membership is ended — withdrawn from their own phone, or
removed after a misconduct finding — the family is turned away and told *"the person was not a member of the Trust when they died"*, which is
untrue; is that acceptable?

The same fact decides it: the door looks at the day of filing. This is **rare** — a withdrawal needs the member's own phone, and a removal
needs a misconduct case to finish in the days between the death and the report — but the reason the family is told is then false.

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **Leave it as built** (our suggestion) — refused at the door. | The family is turned away. | The general reason is untrue for them, and there is ⛔ appeal. The helpline operator sees the specific reason ("left the Trust" / "removed") and can hear the caller say the death came first — but has no way to act on it. |
| **B** | **Let the operator file anyway** when the caller says the death came before the membership ended; staff then check the certificate's date before any drive. | The family is helped if the dates bear it out. | A new power for operators at the door, resting at first on the caller's word; a new staff check; and a way around the door that someone could misuse. |

**Our reading:** **A** — **because** the case is rare and B opens a way around the door for everyone to fix it. If you prefer B, the staff
date check from Q1 B is the natural place for it.

---

# What is at stake right now

- **Live today:** nothing — no member uses the system.
- **Blocked:** nothing. Story 6.38 can land as built (it builds A in both questions); B in Q1 is a change to the staff step that is
  already its own piece of work, and C in Q1 would be a change to 6.38's door.
- **If nothing is decided:** A stands in both, and the late-payment case stays open until someone decides.

# How much to trust this note

- **Earlier versions of this question:** none. Your 31 October ruling saw the cost *"a family is turned away because the person had not
  yet paid when they died"*; the note in front of you then did ⛔ say that the system cannot see the date of death. That gap is this note.
- **Corrected in this note:** none while drafting. I first considered whether a death in the first days after joining is paid at all —
  if it were not, a late fee would gain nothing. It is: those members count as covered today. That is why Q1 matters.
- **Still uncertain:** (1) whether a family would in practice pay the fee from the dead member's phone — it needs the phone, its code and a
  real payment; I have ⛔ seen it happen, only that nothing stops it. (2) That the certificate's date of death will be available to staff in
  a form they can compare — the system says it arrives at the document review, and I have ⛔ traced that review further. (3) Q2's
  rarity is a judgement, ⛔ a measurement.

# In plain English

Your rule is that a family is turned away if the person had not paid when they died. But on the day a claim is filed, the system has no
date of death — it only learns that later from the certificate. So it checks whether the person had paid **on the day of filing**. Because
a refusal is not written down anywhere, a family that is turned away can pay the small joining fee from the dead person's phone and file
again, and the claim goes through. We suggest that the staff check you already asked for — the one that happens before any drive opens —
also compares the date on the death certificate with the date the fee was paid, and stops the drive if the fee came after the death. That
keeps no record of refusals and uses the real date. The cost is that such a family hears "no" later rather than at the door.

The second, rarer question: a member who dies and whose membership ends before anyone reports the death is turned away and told they were
not a member when they died — which is not true. We suggest leaving that as it is, because fixing it would mean letting operators open
the door on a caller's word.

If this section and the evidence below ever disagree, the **evidence** is the record.

---
---

# EVIDENCE — for the record, ⛔ not for the meeting

## E1 — What is already ratified, verbatim

- **`2026-10-30-423` Q3 B (ruling 4):** *"A claim for someone who, at their death, had not finished joining (⛔ identity check), had left the
  Trust, had been removed, or had been erased is refused when it is filed: the helpline tells the caller the claim cannot be filed; ⛔ claim
  record is kept."* Cost as put, accepted: *"No record and no appeal; a mistyped member number turns a real family away silently."*
- **`2026-10-30-423`, our readings (⛔ ratified):** *"⛔ recorded (Q3 B) = ⛔ claim record, ⛔ appeal."*
- **`2026-10-31-424` Q1 (b) B (ruling 2):** *"A claim for someone who gave their identity details but never paid the joining fee is refused
  at the door, with the same treatment as the other refused cases (⛔ record, ⛔ appeal — `-423` Q3 B)."* Cost as put, accepted: *"A family
  is turned away because the person had not yet paid when they died — even if they died days after giving their details."*
- **`2026-10-31-424` Q1 (a) C (ruling 1):** *"filed — but the identity is checked first, by staff, from the death documents and the details
  on record, before any drive opens."* Cost: *"it must be built before members' claims go live."* — row
  `6-39-identity-check-before-a-drive-for-an-unchecked-identity`.
- **`2026-10-31-424` Q3 B (ruling 5):** the caller and the app are told *"the person was not a member of the Trust when they died"*.

## E2 — What is NOT ratified

- **That the state on the day of FILING stands in for the state at DEATH.** It is Story 6.38's build reading (G10: *"the state at the first
  report stands in for the state at death"*), ⛔ a ruling. Both rulings speak of the state **at death**.
- **Whether a payment made after the death counts.** No ruling covers it.
- **Whether a refused filing may leave a non-claim note.** `-423`'s reading defines ⛔ recorded as ⛔ claim record; a different kind of note
  is ⛔ addressed either way.
- **The staff date check.** Row `6-39` checks IDENTITY; a DATE comparison is ⛔ in its ruled scope.

## E3 — What the code actually does

- **The door reads the CURRENT state:** `resolveClaimIntakeDoor` (`packages/domain/src/claim/intake-door.ts`) calls
  `getCurrentMemberState(db, memberId)` — the unbounded event replay — and refuses `pending-fee` as `not_paid`.
- **A refusal writes nothing:** `tryConverge` (`packages/domain/src/claim/icp.ts`, step 1b) throws `ClaimIntakeRefusedError` before any
  write; the transaction rolls back. The only trace is the helpline's security audit line (DL16), which records a staff action, ⛔ a refusal
  the door later consults.
- **The fee confirm has ⛔ death check:** the member-session route in `apps/api/src/modules/vyawastha-shulk/handlers.ts` moves
  `pending-fee → lock-in` (`trigger: 'vyawastha_shulk_paid'`) after its lock-in gate; the file contains ⛔ reference to a death or a claim.
  (Inference, labelled: from `pending-kyc` the manual KYC route reaches `pending-fee` the same way; ⛔ traced line by line.)
- **`lock-in` is covered:** `packages/validity-service/src/payload.ts` lists `'lock-in'` among the valid states, and the door opens for it.
- **No date of death at intake:** G10 — neither intake request carries one; the OCR provider returns nothing; the certificate's date
  arrives at the document review (Story 6.21a).

## E4 — Commands to re-verify every claim

Run 2026-10-31 at `2c20ed03` on `story/6-38-death-locks-erasure-and-non-member-claims-refused`; every one returned what is stated.

```
grep -n '^### Decision .*-42[345]' .decision-log.md                       # three entries: -425, -424, -423
grep -c "had not yet paid when they died" .decision-log.md                # 1 (-424 Q1 (b)'s cost)
grep -n "getCurrentMemberState(db, memberId)" packages/domain/src/claim/intake-door.ts      # the door reads the current state
grep -n "if (door.kind === 'refused')" packages/domain/src/claim/icp.ts                     # the refusal throws before any write
grep -n "trigger: 'vyawastha_shulk_paid'" apps/api/src/modules/vyawastha-shulk/handlers.ts  # 2 sites: first fee + renewal
grep -c -i "death" apps/api/src/modules/vyawastha-shulk/handlers.ts       # 0 — ⚠ the ABSENCE is the finding (no death check)
grep -n "'lock-in'," packages/validity-service/src/payload.ts             # lock-in is a valid (covered) state
grep -n "G10 — ⛔ death date at intake" _bmad-output/implementation-artifacts/6-38-death-locks-erasure-and-non-member-claims-refused.md
grep -n "^  6-39-identity-check" _bmad-output/implementation-artifacts/sprint-status.yaml   # backlog
grep -n "the person was not a member of the Trust when they died" packages/i18n/locales/en/claim.json
```
