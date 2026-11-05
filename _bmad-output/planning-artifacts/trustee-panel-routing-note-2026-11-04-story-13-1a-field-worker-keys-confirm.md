# Trustee Panel routing note — Story 13.1a: three field-worker permissions, for the Panel to confirm

> ## ⏳ AWAITING PANEL RULING — SENT (reported by BigDev, 2026-11-05)
>
> **SENT.** BigDev told the session on 2026-11-05 that this note has been sent. ⚠ NOT recorded anywhere in the repo: the channel, the time, and whether the text sent is
> identical to this file (the draft as committed at `1c3b6bce` and corrected at `b82094e8`) — the file below is kept as DRAFTED. Review round 2 amended AD10 and the Find
> screen (decision `-448`); neither touches who holds a key, so this note's question is unchanged.
>
> **No ruling is recorded here yet.** When the Panel rules, transcribe the ruling into this block **and** into
> `.decision-log.md` as a new decision id. Everything below is then kept **unedited** as the question **as it was put**
> ([[feedback_supersede_never_reinterpret]]).
>
> **This question is NON-BLOCKING.** The build of Story 13.1a goes ahead on the answer we recommend (option A). What waits for the
> Panel is going live with field-worker registration (roster Row 48, leg (i)) — nothing is live today.

---

## §0 — THE GATE: is this the Panel's decision at all?

**Yes — narrowly.** The Panel already ruled **who** does what (`-441`, `-443`). The only thing left that is the Panel's is the one
sentence in the Panel's own earlier ratification (`-059`, amendment B (3)) that says permissions for the Field Worker role area are
"to be ratified when their feature sets ship". Three such permissions ship with Story 13.1a. That sentence asks the Panel to confirm
them; the author cannot confirm them on the Panel's behalf, and reading the sentence narrowly to avoid asking would be re-reading a
ratified clause to fit ([[feedback_supersede_never_reinterpret]]).

Everything else in the story — how the screens are built, how a name is decrypted, the order of the audit line — is the author's and
is **not** asked here (stripped of citations, those are engineering questions).

---

# The question

**In one sentence:** Do you confirm three new permissions for the people who manage field workers — the right to **approve** a field worker, the right to **see** the field workers in an area (their names, and one worker's phone number when you open them), and the right to **read a worker's code out to them** when they ask — held by the officers you already named?

**Why it cannot be decided without you:** Your earlier decision says permissions for field workers are to be confirmed by you once the feature that uses them is built. This is that feature.

## The one fact that decides it

**You have already decided who these officers are; these three permissions are those decisions turned into switches.** You ruled that the District Admin manages field workers and the Pariwar Admin fills in, that the District Admin registers and the Pariwar Admin approves, and that the full log of a field worker is kept. Nothing below gives an officer a power your rulings did not already point at. The only thing new is that these officers can now **see names and phone numbers** of the workers they manage and **read a worker's code to them** — and every such look is written to the audit log, naming the officer's account, before anything is shown.

---

# What you are choosing between

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **Confirm all three, as being built.** Approve: Pariwar Admin only. See workers, and read a worker's code out: the District Admin for their own district, and the Pariwar Admin for any. | A District Admin can see the names of the workers in their district, open one to see the phone number, and read an active worker their code. A Pariwar Admin can do the same for any district and is the only one who approves. Each look is logged. | Names and phone numbers of the field workers (who are not members) appear on officers' screens — officers who typed them in the first place. If you meant something stricter, we change who holds a permission before go-live; nothing is rebuilt. |
| **B** | Confirm approval; let only the Pariwar Admin see workers and read codes. | Only the Pariwar Admin sees worker names and reads a code. | The officer you named as the usual manager of field workers, the District Admin, cannot see their own workers or help one who lost their code; every such request goes to the Pariwar Admin. |
| **C** | Confirm as in A, but ask the officer to prove who they are again (a second check) before a phone number or a code is shown. | As in A, with one more step each time. | Slower for officers who use the screens many times a day, and a new second-check step to build. BigDev has judged a plain logged look enough (2026-11-04). |

**Our reading:** **A** — **because** the officers are the ones your rulings already name, every look is logged against the officer's account before it is shown, and a worker's code is the very thing the worker is told to share with teachers.

---

# What is at stake right now

- **Live today:** nothing. No field worker is registered in production, and these three permissions do not exist yet.
- **Blocked:** nothing in the build. Going live with registering and approving field workers waits on this confirm, among other legs (roster Row 48, leg (i)).
- **If nothing is decided:** the build ships on option A; go-live of field-worker registration stays blocked on this leg until you answer.

---

# How much to trust this note

- **Earlier versions of this question:** none — this is the first draft (2026-11-04).
- **Corrected in this note (2026-11-04, before sending — the story's review round 1, findings R10–R12):** the plain-English section said option C "changes a setting, not the build" — it does not: a second identity check is new work (the cost line of option C already said so); option A called the workers "contractors" — whether a field worker is a contractor or an employee is counsel's open question (roster Row 48 (g)), so the note now says only that they are not members; the closing instructions said to discharge leg (i) of Row 48 outright — that leg also covers keys other stories mint, so only THIS note's contribution is discharged. (Before that, the story it comes from was checked once by a fresh reviewer; its findings were about tests and wording, not about who holds what.)
- **Still uncertain:** whether your sentence "to be ratified when their feature sets ship" was meant to cover permissions held by the District Admin and the Pariwar Admin, or only permissions held by the field worker role itself. We have not decided that for you — it is the reason this note exists. Your earlier decision on the first field-worker permission (adding a worker) is the nearest precedent; this note does not claim it settled this one.

---

# In plain English

We are building the screens that let a District Admin register a field worker, a Pariwar Admin approve them, and either officer read a worker's six-digit code to them when they ask. That needs three new permissions: approve a worker; see the workers in an area; read a worker's code. You have already said who manages field workers and who approves them, so we have given each permission to exactly those officers — approval only to the Pariwar Admin, the other two to the District Admin for their own district and to the Pariwar Admin. Every time an officer looks at a worker's name or phone number, or reads out a code, the system first writes it into the audit log, naming the officer's account. We suggest you confirm all three as they are (option A). If you want only the Pariwar Admin to see workers and read codes (B), or want an extra identity check before a phone number or a code is shown (C), say so. Option B changes only who holds a permission (a setting, not the build); option C would need a new second-check step built into the screens and the server — BigDev has decided a plain logged look is enough for now (2026-11-04), and option C is not being built. If this section and the evidence below disagree, the evidence is the record.

---
---

# EVIDENCE — for the record, not for the meeting

## E1 — What is already ratified, verbatim

> `2026-06-21-059`, amendment B (3): *"Future permission additions for Finance Officer, Media/Comms, Field Worker, and Helpline Operator are to be ratified when their feature sets ship."*

> `2026-11-03-443`, Q4 A (the Panel's ruling, relayed by BigDev): *"The District Admin registers; the Pariwar Admin approves; if the District Admin is not available, the Pariwar Admin does both (the system can detect only that no District Admin holds the district). A worker is creditable only after a second officer approves."*

> `2026-11-03-441`, the Panel's words as relayed: *"Keep the full log of field worker."* (The same entry rules that a District Admin may add a field worker, that the District Admin is the intended manager of field workers and the Pariwar Admin fills in.)

## E2 — What is NOT ratified

> `2026-11-03-443`: *"Whether this entry satisfies B (3) for those keys is NOT recorded as made — as `-441` left it."* — the permissions for approving, moving, opening and answering a move request: each "comes with the work that builds it".

Nothing ratified names the three permissions in this note, who holds the **see** and **read a code** permissions, or that a District Admin may see a worker's name and phone number. The author's decision `2026-11-04-446` (AD6, AD9) records them as the author's choice, on the default, pending this confirm.

## E3 — What the code actually does

- **Nothing is built.** At `06bab925` none of the three permissions exists in the permission catalog, and no route calls the two commands that approve a worker (`recordFieldWorkerKycCompleted`, `activateFieldWorker`) — so today no worker can become creditable in production. (Both facts are re-checked by the commands in E4.)
- **What will be built (an inference from the story, not yet code):** approval — Pariwar Admin only; see workers and read a code — District Admin (own district only) and Pariwar Admin (any district); the Super Admin holds every permission by derivation. A look at a name, a phone number or a code is refused unless an audit line naming the officer was written first.

## E4 — Commands to re-verify every claim

Run these before sending. A command that returns EMPTY where a number is expected is a finding, not a pass.

```
# the three permissions do not exist yet (expect 0 until Story 13.1a's Task 3 lands)
grep -c "field_worker\.\(approve\|read_code\|view\)" packages/domain/src/rbac/permissions.ts

# no route calls the two approval commands (expect 0 until Story 13.1a's Task 6 lands)
grep -rln "recordFieldWorkerKycCompleted\|activateFieldWorker" apps --include='*.ts' | wc -l

# the Panel's wording and rulings, by decision id (verify the id's date in the heading, then the sentence)
grep -n '^### Decision 2026-06-21-059' .decision-log.md
grep -n 'ratified when their feature sets ship' .decision-log.md
grep -n 'Whether this entry satisfies B (3) for those keys is NOT recorded as made' .decision-log.md
grep -n 'A worker is creditable only after a second officer approves' .decision-log.md
grep -n 'Keep the full log of field worker' .decision-log.md

# the go-live leg this confirm closes
grep -n 'Row 48' docs/launch-gate-inventory/inventory-roster.md
```

---

<!-- AFTER THE PANEL RULES
1. Transcribe the ruling into the AWAITING block at the top AND into `.decision-log.md` as a new decision id.
2. Keep every section below the block UNEDITED — it is the question as put.
3. Record what the ruling does NOT cover (one ruling on these three permissions does not move the footing legs (b), (e), (f), (g) of Row 48).
4. Record under leg (i) of Row 48 a dated line that THIS note's three keys (`field_worker.approve`, `field_worker.read_code`, `field_worker.view`) are confirmed (or how the ruling changed them) — a discharge of 13.1a's CONTRIBUTION only. Leg (i) covers every field-worker key that 13.1a, 13.1c and 13.1d mint: close the whole leg only after checking that each sibling's own key confirm has been recorded; this ruling ratifies no key outside its question. Mark a closure DISCHARGED, never delete ([[feedback_closure_language_precision]]); the roster's governing criterion is unchanged.
5. If implementation follows (a different holder set), it needs a ROW — a grant change before go-live is a one-line edit of `rbac/roles.ts` and its test; name the story that does it.
-->
