# Trustee Panel routing note — Story 13.1f: when an officer records that a field worker has died, should the screen still say "Tell the worker. If they disagree, they can appeal."?

> ## ✅ RULED 2026-11-20 — [Decision 2026-11-20-466](../../.decision-log.md#decision-2026-11-20-466) (Trustee-ratified)
>
> **Sent by BigDev; the ruling relayed to the session on 2026-11-20, by DR and KB.** ⚠ Not recorded: the channel, the send time, the time the
> Panel ruled, the trustees' full names (initials as relayed), and whether the text sent is identical to this file — **the file was never
> committed** (so there is no sha to cite), and it existed that day in a first-draft and a prepared state. Verbatim, as relayed (two lines):
>
> > *"by DR and KB*
> > *option A"*
>
> **Option A** — *as ruled: the same line after every ending, a death included* (our reading; as built). **Nothing changes**: no code, no copy,
> no row. B (a reworded reminder after a death) and C (no reminder after a death) were not taken. Story 13.1f's R2D-1, its `deferred-work.md`
> item R2D-W1 and the open item on roster Row 52 are DISCHARGED by the decision. **Not covered by the ruling:** the End confirm line (the same
> clause in the same words — left as built; ⚠ not recorded whether the Panel meant it too), a family's being told of a death, and who may
> appeal for a worker who has died.
>
> Everything below is kept **unedited** — the question **as it was put** ([[feedback_supersede_never_reinterpret]]).
>
> *(As prepared, 2026-11-20: every command in E4 was run that day against the uncommitted working tree of the story branch and returned what its
> comment expects; the code line numbers in E3 are as at that date.)*

---

## §0 — THE GATE: is this the Panel's decision?

| # | The question, stripped of citations | Whose | Why |
|---|---|---|---|
| 1 | After an officer records that a worker has died, should the screen still tell the officer to tell the worker that they can appeal? | **The Panel's** | You ruled the reminder "at an ending" (2026-11-17). Whether that covers a death is whether a ratified clause extends to a case it does not name, and what a worker — or whoever stands for them — is told of a decision about them is yours. |

**The engineering half, split off and not asked:** the code shows the same reminder after every ending, whatever the reason. That is as
ruled and is not a defect we will "fix" by reading your ruling for you. **Nothing in the code changes until you answer.**

---

# The question

**In one sentence:** An officer who ends a worker because they died is shown, today, the same line as for any ending — *"Tell the worker.
If they disagree, they can appeal."* — should that stay?

**Why it cannot be decided without you:** your ruling of 2026-11-17 set that line "at an ending", and what the Trust tells a worker, or
the people around them, about a decision is yours. Your own note listed death among the reasons an ending happens and did not say what the
line should mean for one.

## The one fact that decides it

**A death is recorded on the officer's word, and it can be wrong.** You ruled on 2026-11-07 that the officer records a death "on what
they have been told (by the family, a colleague or the community)", and that "a death recorded wrongly is put right under Question 1" — an
undo. So the person that line speaks to may be a **worker who is alive and has been wrongly recorded as dead**: someone who would need to
be told, and who could appeal. Or it may be a worker who really has died, to whom the line means nothing.

---

# What you are choosing between

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **As ruled: the same line after every ending, a death included.** *Our suggestion; as built.* | Nothing. A worker wrongly recorded as dead is still prompted for. | After a death that is true, the line speaks to someone who cannot be told, and names nobody else (a family, say). |
| **B** | **Keep a reminder after a death, but worded so it is true either way** — for example *"If you hear this was a mistake, the worker can appeal."* | The officer is prompted for the wrongly-recorded case, not told to talk to someone who has died. | A new sentence for you to approve, and it makes a promise about what happens if the death was a mistake. |
| **C** | **No reminder after a death.** An undo stays the remedy for a death recorded in error. | Nothing is said on screen after a death. | A worker wrongly recorded as dead gets no prompt that they may appeal; it rests on the family and the officer remembering. |

**Our reading:** **A** — **because** it adds no new promise, it keeps the prompt in the one case where the worker can actually be told, and
its cost (an odd sentence after a true death) harms nobody. If you choose B or C we change one line.

> **Not asked here:** whether the Trust owes a worker's family anything on a death — including being told, or money the worker had earned.
> The 2026-11-07 ruling carried the money to the work that first pays a commission; this note does not reopen it.

---

# What is at stake right now

- **Live today:** nothing. These screens are not deployed and no real field worker has been ended. No line has been shown to anyone.
- **Blocked:** nothing in the build. We suggest your answer is wanted **before the first real worker is ended because they died**; it does
  not hold the undo, appeal or shown-number routes.
- **If nothing is decided:** the line stays as you ruled it (option A).

---

# How much to trust this note

- **Earlier versions of this question:** none was sent. An earlier internal draft, written the same day in the code review, said that the
  line was "nonsensical" after a death, that the reason "died" had been added after your ruling on this line, and that we should drop the
  reminder for a death. **All three were wrong or incomplete.** "Died" was ruled on 2026-11-07, before the line was (2026-11-17), and your
  own note named it; and the line is not nonsensical when a death was recorded wrongly.
- **Corrected in this note:** our reading changed from *drop the reminder for a death* to *leave it*, once we saw that a death rests on the
  officer's word.
- **Still uncertain:** whether you meant the line to cover a death (the record does not say); how often a death is recorded wrongly
  (nothing counts it, and nothing is live); whether a family or nominee should be told of a death at all (not asked here).

---

# In plain English

When an officer ends a field worker, the screen reminds them to tell the worker and that they can appeal. That is what you ruled. One
reason for ending is that the worker died. After recording a death, the screen still says "Tell the worker. If they disagree, they can
appeal." If the worker really has died, the line is odd but harmless. But deaths are recorded on what the officer has been told, and you
ruled that a wrongly recorded death is put right by an undo — so sometimes the worker is alive and the line is exactly what they need. We
suggest leaving it as you ruled. If you would rather the screen said something different after a death, tell us whether you want a reworded
reminder that is true either way, or no reminder at all after a death.

If this section and the evidence below ever disagree, the evidence is the record.

---
---

# EVIDENCE — for the record, not for the meeting

## E1 — What is already ratified, verbatim

> **`2026-11-17-465`, clause 3 (Q3):** *"Q3 — A for (a) and (b). The officer tells the worker."* … *"(b) The officer who ended them tells them,
> reminded on screen: "Tell the worker. If they disagree, they can appeal.""* Cost: *"It rests on the officer who is the one being appealed
> against; nothing records that it was said."*

> **`2026-11-07-454`, clause 5 (Q5):** *"Q5 — A. Its own reason, "died","* *"recorded by the District Admin or the Pariwar Admin on what they
> have been told (by the family, a colleague or the community), with the date of death."* Cost as put, accepted: *"A new reason needs a small
> database change. It rests on the officer's word; a death recorded wrongly is put right under Question 1."*

> **The note ruled on 2026-11-17** (`trustee-panel-routing-note-2026-11-16-story-13-1f-field-worker-undo-and-appeal.md`): *"An officer ends a
> field worker's work for one of four reasons (they left; they stopped working; registered by mistake; they died)."*

## E2 — What is NOT ratified

Neither `-465` nor `-454` says what the Q3 (b) reminder means when the reason is a death, who — if anyone besides the worker — is told of a
death, or whether a death may be appealed by anyone but the worker. `-454` carries a dead worker's family's money to the work that first
pays a commission (Story 13.5); it is not touched here.

## E3 — What the code actually does

- The reminder is built for every ending: in `apps/admin/src/modules/field-workers/WorkerActions.tsx`, the announce after an act
  (`act === 'end'` → `fw.actions.tell.end`, with no test of `reason`; line 245 as at 2026-11-20), and the confirm line `fw.actions.end.final`
  (line 334; "… a worker who disagrees can appeal.") likewise. The only places `died` changes anything in that file are the date's label (line 382)
  and its default (line 164).
- `died` is one of the four reasons the API accepts (`packages/contracts/src/field-workers/enums.ts`, `FIELD_WORKER_TERMINATE_REASONS`, line 46).
  An undo of a `died` ending is allowed "any from-state, at any time" except after the Panel has refused an appeal
  (`packages/domain/src/field-worker/commands.ts`, the `undoFieldWorkerEnding` doc comment, line 768).
- **Negative claim, checked by grep (E4):** no appeal file refuses by reason — `died` appears in none of `ending-appeal-*.ts` and
  `ending-appeal-handlers.ts`. **Inference, not traced end to end:** an appeal against a `died` ending is therefore accepted today.

## E4 — Commands to re-verify every claim

Run these before sending. A command that returns EMPTY where a number is expected is a finding, not a pass.

```
# the ruling this note cites, by bare number, then the date in its heading (expect ONE line, 2026-11-17-465).
# ⚠ Anchor the id: an unanchored `.*-454` also matches the `-465` and `-455` headings, which CITE it in their titles.
grep -n '^### Decision [0-9-]*-465:' .decision-log.md
grep -cF 'The officer who ended them tells them, reminded on screen: "Tell the worker. If they disagree, they can appeal."' .decision-log.md

# the ruling that made death a reason (expect ONE line, 2026-11-07-454) and its words
grep -n '^### Decision [0-9-]*-454:' .decision-log.md
grep -cF 'recorded by the District Admin or the Pariwar Admin on what they have been told (by the family, a colleague or the community), with the date of death' .decision-log.md
grep -cF 'a death recorded wrongly is put right under Question 1' .decision-log.md

# the Panel's own note named death among the four reasons (expect 1)
grep -c 'they stopped working; registered by mistake; they died)' _bmad-output/planning-artifacts/trustee-panel-routing-note-2026-11-16-story-13-1f-field-worker-undo-and-appeal.md

# the reminder is reason-blind (expect the announce line and the confirm line - 245 and 334 as at 2026-11-20; neither mentions `reason`),
# and `died` branches only the date (expect 2 lines: the date's default and its label - 164 and 382 as at 2026-11-20)
grep -n "fw.actions.tell.end\|'fw.actions.end.final'\|t('fw.actions.end.final')" apps/admin/src/modules/field-workers/WorkerActions.tsx
grep -n "died" apps/admin/src/modules/field-workers/WorkerActions.tsx

# no appeal file refuses by reason (expect 0)
grep -c "died" packages/domain/src/field-worker/ending-appeal-commands.ts apps/api/src/modules/field-worker/ending-appeal-handlers.ts

# the go-live row this note is carried on
grep -n 'Row 52' docs/launch-gate-inventory/inventory-roster.md
```

---

<!-- AFTER THE PANEL RULES
1. Transcribe into the ⏳ block at the top AND into `.decision-log.md` as a new decision id; keep every section below UNEDITED.
2. Record what the ruling does NOT cover (E2 lists the family and the money).
3. Discharge it at: the story's R2D-1, `deferred-work.md` (code review of 13-1f, chunk D), and Row 52's dated line — mark DISCHARGED,
   never delete ([[feedback_closure_language_precision]]).
4. If the answer is B or C, implementation needs a ROW: a discharge with no row is a decision nobody schedules. If A, nothing changes.
-->
