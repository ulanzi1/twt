# Trustee Panel routing note — three small choices for the nominee correction

> **§0 gate — passed (2026-09-20), with a caveat we state openly.** These are **ours to decide** unless you object — each is a detail of how
> the two-step correction you ruled works. We ask you to **confirm** them because each fixes **who may start a correction, what counts as a
> known relationship, and what the approvers must write.** ⚠ **This is a confirmation, not a request for a decision:** if you say nothing, our
> defaults stand, and the story says they were ours. It is deliberately short.

> ## ⏳ AWAITING PANEL RULING
>
> **Nothing is recorded here yet.** When the Panel rules, transcribe it into this block **and** into `.decision-log.md` as a new decision id
> (or record "confirmed as drafted"). Everything below is then kept **unedited**, as the question **as it was put**.

---

# The question

**In one sentence:** Please **confirm — or change —** three small choices about the correction of a nominee after a claim is filed.

**Why we ask:** You ruled that a genuine mistake may be corrected if we know the nominee's **relationship** to the member, and that a
correction needs the **District Admin's** approval and then the **Pariwar Admin's.** You did not say **who starts one**, **what counts as a
"known" relationship**, or **what the approvers must write.**

## The one fact that decides them

**None of these changes what you ruled; they only fix details.** Each is a one-line rule, easy to change.

---

# What we chose — and what you may change

| # | The choice | **Our default** | If you would rather | What it changes for a person |
|---|---|---|---|---|
| **1** | **Is "other" a known relationship?** The relationship is one of *spouse, child, parent, sibling, other*, and it is always filled in. | **"Other" counts as known only if the approvers write down, in their note, what the relationship actually is.** | "Other" never counts; or always counts. | Whether a nominee such as a cousin or a friend can have a **genuine mistake** corrected. |
| **2** | **Who starts a correction?** *(not stated in your ruling)* | The **helpline operator** on the family's behalf, or the **family through the app.** **Never the District Admin alone.** | Only the helpline operator; or only the app. | Who a family must go through to ask for a correction. |
| **3** | **Must each approval carry a written reason?** *(not stated)* | **Yes** — a written note at **each** of the two approvals. | No note; or a note only when declining. | Whether a later reader can see **why** a correction was allowed or refused. |

**Our reading: confirm all three as drafted** — **because** each is the plainest reading and each costs one edit to change. **Cost, honestly:**
#1 makes the approvers do a little writing; #3 adds a required note at each step.

---

# What is at stake right now

- **Live today:** **Nothing** — the correction is not built.
- **Blocked:** **#1** blocks finishing the correction's relationship check. #2 and #3 block nothing; they stand as defaults.
- **If nothing is decided:** the defaults stand, and the story records that **they were ours.**

---

# How much to trust this note

- **Earlier versions of this question:** none sent. #2 and #3 were first written into a ruling record (`-236`) as defaults on 2026-09-20 and were
  never put to you; #1 was found while writing Story 6.20.
- **Corrected in this note:** none.
- **Still uncertain:** whether a family who cannot reach the helpline **or** the app has any other way to start a correction — we assumed
  these two cover everyone.

---

# In plain English

You ruled that an honest mistake in the nominee may be corrected after a claim, when we know the nominee's relationship, and that the District
Admin and then the Pariwar Admin must both approve. Three details were left to us: whether "other" counts as a known relationship (we say yes,
but only if the approvers write down what it is), who may start a correction (the helpline operator or the family in the app, never the
District Admin alone), and whether each approval needs a written reason (we say yes). If you say nothing, these stand. If this paragraph and
the evidence below ever disagree, **the evidence is the record.**

---
---

# EVIDENCE — for the record, not for the meeting

## E1 — What is already ratified, verbatim

**`2026-09-20-234` (W), Trustee-ratified:**
> *"Allow geniune mistake, you should also ask for nominee relation with member. Only if we know the relation we can allow geniune mistake. …"*

**`2026-09-20-236` (Z), Trustee-ratified:**
> *"correction requires approval by both, first District Admin then Pariwar Admin."*

## E2 — What is NOT ratified

- **What counts as a "known" relationship** — in particular whether "other" does.
- **Who starts a correction** and **whether each approval carries a written reason** — recorded in `-236` as **defaults (CC2, CC3), ⛔ not ratified.**

## E3 — What the code actually does

- **The relationship is always filled in.** It is one of `spouse | child | parent | sibling | other` (`packages/contracts/src/nominee/declaration.ts:33`) and the column is `NOT NULL` (`packages/domain/src/schema/member_nominees.ts:65`). So "known" can only ever be a question about **"other"**. (E4.2)
- **`-236` records CC2 and CC3 as small confirms with defaults** (`.decision-log.md` lines 56–57). (E4.3)

## E4 — Commands to re-verify every claim

⭐ Run before sending. ⚠ A command that returns EMPTY is a finding, not a pass. Results as run 2026-09-20:

```
# E4.1 the rulings, verbatim
grep -c "Only if we know the relation we can allow geniune mistake" .decision-log.md                       # -> 1
grep -c "correction requires approval by both, first District Admin then Pariwar Admin" .decision-log.md   # -> 1

# E4.2 the relationship set and NOT NULL
grep -n "NomineeRelationship = z.enum" packages/contracts/src/nominee/declaration.ts                       # -> line 33: spouse | child | parent | sibling | other
grep -n "relationship: text('relationship').notNull()" packages/domain/src/schema/member_nominees.ts       # -> line 65

# E4.3 CC2 / CC3 recorded as defaults
grep -n "CC2. Who raises a correction request\|CC3. Whether each approval carries a written reason" .decision-log.md   # -> lines 56, 57
```

---

<!-- AFTER THE PANEL RULES — per the template:
1. Transcribe into the ⏳ block AND into `.decision-log.md` (or record "confirmed as drafted").
2. Keep every section above UNEDITED — it is the question as put.
3. Record what the ruling does NOT cover.
4. Discharge the item wherever it is carried — Story 6.20's open question P3 and `-236`'s CC2 and CC3 — and mark it DISCHARGED, never delete it.
5. If any default changes, edit the rule; no redesign is owed. -->
