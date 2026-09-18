# TEMPLATE — Trustee Panel routing note

> ⛔⛔ **THIS FILE IS A TEMPLATE. ⛔ It is ⛔ NOT a routing note and carries ⛔ no question.**
> ⭐ Copy it to `trustee-panel-routing-note-YYYY-MM-DD-<slug>.md` and delete every `<!-- guidance -->`
> block as you fill it in.
>
> ⚠⛔ **WHY THIS EXISTS.** Forty-one notes were written before it, by imitation, and they drifted into a
> shape that served the **author** rather than the **reader**: clause tracing and file paths first, the
> plain-English question last, as an appendix. The 2026-09-16 and 2026-09-18 notes ran 172 lines each
> and came back answered in four words. ⭐ That terseness is ⛔ not disengagement — it is what a reader
> does when the document makes them work around it.
> ⇒ ⭐⭐ **THE ORDER BELOW IS THE POINT.** The Panel are trustees of a teachers' mutual-aid trust, ⛔ not
> engineers. They decide what the Trust **owes people**. ⛔ They do ⛔ not decide how a regex is written.

---

## §0 — THE GATE: is this the Panel's decision at all?

<!-- guidance
⛔⛔ ANSWER THIS BEFORE WRITING ANYTHING ELSE. If it fails, do not write the note — decide it yourself
and record it as an author-commit.

⭐ IT IS THE PANEL'S if the question is:
  · what the Trust DISCLOSES about a person, or to whom
  · what the Trust OWES a member, a family or a nominee
  · a LEGAL or consent BASIS for handling someone's data
  · two RATIFIED clauses that conflict, so one of them must give
  · a ratified clause that must be SUPERSEDED, narrowed or extended

⛔ IT IS YOURS if the question is:
  · which implementation is correct, faster, or safer
  · whether a CI gate, lint rule or test has enough coverage
  · what a variable, key, file or function should be called
  · anything whose answer is "the code should do X" with no change to what a person sees or is owed

⚠⛔ THE TEST THAT CATCHES THE HARD ONES — STRIP THE CITATIONS AND READ WHAT IS LEFT.
A 2026-09-16 note asked the Panel to rule on whether a static-analysis rule should also match a
numeric literal operand. Dressed in clause ids it looked governance-shaped; stripped, it was a lint
question. ⇒ ⭐ if the bare sentence would embarrass you in front of a trustee, it is yours.

⚠ A MIXED QUESTION IS TWO QUESTIONS. Split it: rule the governance half, build the other half, and say
in the note that you have done so. ⛔ Do ⛔ not bundle an engineering choice into a governance ask to
get it blessed.
-->

---

> ## ⏳ AWAITING PANEL RULING
>
> ⛔ **Nothing is recorded here yet.** When the Panel rules, transcribe it into this block **and** into
> `.decision-log.md` as a new decision id. ⭐ Everything below is then kept **unedited** as the question
> **as it was put** ([[feedback_supersede_never_reinterpret]]).

---

# The question

<!-- guidance
⭐ ONE PARAGRAPH, PLAIN LANGUAGE, ⛔ NO clause ids, ⛔ NO file paths, ⛔ NO identifiers.
⚠ If you cannot state it without citations, you do not yet understand it well enough to ask it.
-->

**In one sentence:** …

**Why it cannot be decided without you:** …

## The one fact that decides it

<!-- guidance
⭐⭐ LEAD WITH IT. ⛔ Do ⛔ not make the reader assemble it from evidence.
⚠ Most questions turn on ONE fact. Axis B's whole answer was "the same line is already public for the
same people" — one sentence, and it was buried in §3 behind two ratified quotations.
⛔ If you cannot name a single deciding fact, say so plainly — that is itself useful to the Panel.
-->

…

---

# What you are choosing between

<!-- guidance
⭐ 2–4 options. ⛔ Never just one with a rhetorical alternative.
⚠ EVERY option gets an HONEST cost, including the one you recommend. An option with no stated cost
reads as the answer you want, and the Panel is right to distrust it.
⭐ Plain language in this table. The clause each option touches goes in the EVIDENCE section, ⛔ not here.
-->

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | … | … | … |
| **B** | … | … | … |
| **C** | … | … | … |

**Our reading:** … — **because** …

<!-- guidance
⭐ Give a recommendation. ⛔ A note that refuses to recommend pushes the analysis back onto the reader.
⚠ But make it separable: the Panel must be able to reject your reading and still use the note.
-->

---

# What is at stake right now

<!-- guidance
⭐ Answer THREE things in three lines:
  · Is anything live / exposed today, or is this precautionary?
  · What is BLOCKED while this is open? (Usually: nothing. SAY SO — it stops a rushed answer.)
  · What happens if the Panel does nothing?
-->

- **Live today:** …
- **Blocked:** …
- **If nothing is decided:** …

---

# How much to trust this note

<!-- guidance
⚠⛔ MANDATORY, and ⛔ not optional politeness. Record:
  · every earlier version of this question and how it was wrong
  · anything you CORRECTED in this note after first writing it, and what changed your mind
  · anything you are UNSURE of

⭐ The 2026-09-18 note was corrected twice before it reached the Panel — once for recording a ruled
matter as "unruled", once for an argument that did not survive checking. ⚠ Both were disclosed, and
the note told the Panel to weigh the EVIDENCE over the author's reading. ⇒ ⭐ a note that has been
wrong and says so is worth more than one that appears never to have been.
-->

- **Earlier versions of this question:** …
- **Corrected in this note:** …
- **Still uncertain:** …

---

# In plain English

<!-- guidance
⭐ Write this as though for someone who has never seen the system: no field names, no clause ids, no
file paths. ⚠ It must reach a CONCLUSION — say what you suggest and why.
⛔ A version of this used to sit at the END as an appendix, after 130 lines of tracing. That was
backwards: it was the only part written for the actual reader, and it was last.
⇒ ⭐ If this section and the technical evidence below ever disagree, the EVIDENCE is the record — say so.
-->

…

---
---

# EVIDENCE — for the record, ⛔ not for the meeting

<!-- guidance
⭐ Everything below is what makes the note auditable and re-checkable later. ⛔ The Panel is ⛔ not
expected to read it to answer. ⭐ Keep it complete anyway: it is what a future reader re-opens.
-->

## E1 — What is already ratified, verbatim

<!-- guidance
⭐ Quote the governing clauses EXACTLY, by decision id + CLAUSE NUMBER.
⚠⛔ CITE BY CLAUSE, ⛔ NEVER BY LINE — `.decision-log.md` is newest-first and every line pointer rots.
⚠⛔ AND VERIFY THE DATE IN THE ID. A mis-dated id greps EMPTY, which is indistinguishable from "no such
decision". Six citations of `-195` carried the wrong date for two weeks before anyone ran the grep.
⇒ ⭐ locate by the BARE NUMBER first: grep -n '^### Decision .*-195' .decision-log.md
-->

> …

## E2 — What is NOT ratified

<!-- guidance
⭐ State plainly what no ruling covers. ⚠ This is usually where the real question lives, and leaving it
implicit is how a settled matter gets re-opened — or an open one gets treated as settled.
-->

…

## E3 — What the code actually does

<!-- guidance
⚠⛔ A CODE COMMENT IS A CLAIM, ⛔ NEVER EVIDENCE. Trace it: is it BUILT? what is its SCOPE? what does it
COST? ([[feedback_trace_internal_state_never_cite_decision_text]])
⚠ Verify NEGATIVE claims by grepping. "X is never done" is checkable.
⭐ Label any INFERENCE as an inference.
-->

…

## E4 — Commands to re-verify every claim

<!-- guidance
⭐⭐ RUN THESE BEFORE SENDING. ⛔ Not as a formality — this is where notes have been caught being wrong:
running them is what exposed the mis-dated `-195` citation.
⚠ A command that returns EMPTY is a finding, ⛔ not a pass.
-->

```
…
```

---

<!-- guidance — AFTER THE PANEL RULES
1. ⭐ Transcribe into the ⏳ block at the top AND into `.decision-log.md` as a new decision id.
2. ⛔ Keep every section below it UNEDITED — it is the question as put.
3. ⚠ Record what the ruling does ⛔ NOT cover. A clause often carries several prohibitions in ONE
   sentence; a ruling on one of them does ⛔ not move the others. `-222` had to state that D5's
   "no row key" and "identifiable or correlatable" halves survived a supersession of its
   "no placeholder" half, or the next reader would have taken the whole sentence as fallen.
4. ⭐ Discharge the item wherever it is carried — `deferred-work.md`, `sprint-status.yaml`, the story —
   and mark it DISCHARGED, ⛔ never delete it ([[feedback_closure_language_precision]]).
5. ⚠ If implementation follows, it needs a ROW. A discharge with no row is a decision nobody schedules.
-->
