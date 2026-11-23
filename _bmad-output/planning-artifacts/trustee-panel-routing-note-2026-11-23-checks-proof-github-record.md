# Trustee Panel routing note — 2026-11-23 — what counts as proof that the checks ran

> ## ⏳ AWAITING PANEL RULING
>
> ⛔ **Nothing is recorded here yet.** ⛔ **NOT SENT.** Written 2026-11-23 by the session for BigDev. It is ⛔ **not** "shown to the Panel" until BigDev sends it ([[feedback_shown_to_panel_means_sent]]). When the Panel rules, transcribe the ruling into this block **and** into `.decision-log.md` as a new decision id. Everything below is then kept **unedited** as the question **as it was put** ([[feedback_supersede_never_reinterpret]]).

---

## §0 — The gate: is this the Panel's decision?

**Half of it is. The other half is the author's, and is told to you, not asked.**

- **The Panel's half — a ratified clause is superseded.** In June the Panel ratified that the developer's own written note is the proof that the automated checks ran on each change, for as long as GitHub's own checker was switched off. Replacing that with GitHub's record supersedes a ratified clause, and what the Trust accepts as proof is not an engineering choice. This is the question below.
- **The author's half — built, not asked.** Whether the developer's own computer *also* repeats the checks every time they save a change. Stripped of every citation, that sentence changes nothing a member, a family or a nominee sees or is owed, so it is the author's (the template's own test: "anything whose answer is 'the code should do X' with no change to what a person sees or is owed"). The template says a mixed question is two questions: the governance half is ruled by you, the other half is built, and the note says so. This is that statement. It is described under "What changes in practice" so you are not surprised by it.

---

# The question

**In one sentence:** Before any change to the TWT software goes live, 41 automated checks run on it. **Do you accept the record that GitHub keeps of those checks as the proof that they ran — in place of the developer's own written note, which is what you agreed to in June?**

**Why it cannot be decided without you:** In June you agreed, as a temporary arrangement, that the developer's note would be the proof, and the agreement said a new decision would be needed once GitHub's checker was working again. It is working again. Only you can say what the Trust will accept as proof.

## The one fact that decides it

**GitHub already runs the same list of 41 checks on every change and keeps its own record of each run; the developer's laptop copy is a second copy of the same checking.** Of the last 400 runs GitHub has recorded (early August to 23 November), 350 passed, 27 failed and 22 were stopped early; one more was still running when this was written. The failures are in the record too, which is what an honest record looks like.

---

# What you are choosing between

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | **Accept GitHub's record as the proof.** | Nothing a member or family sees. When the Trust asks "did the checks run on this change?", the answer is a GitHub run with a number and a date, not the developer's note. | The Trust relies on GitHub staying switched on. It was switched off for about seven weeks, mid-June to the end of July, by our notes. If it is switched off again, the developer goes back to checking on their own computer and writing a note, and says so. The record is held by GitHub, not by the Trust, and we understand a person with administrator access to our GitHub account can delete a run (not re-checked). |
| **B** | **Keep the developer's note as the proof**, as agreed in June. GitHub's record still exists but is not what counts. | Nothing a member or family sees. | The developer keeps running the checks twice on every change: GitHub's run takes about 25 minutes, and their own copy adds its own wait. The second copy sometimes fails for a reason unrelated to the change (five changes in the two weeks to 23 November recorded one), and each time costs a re-run and an explanation. A note is also the weaker kind of proof, as the June record itself says. |

**Our reading: A — because** the record is kept by someone other than the developer, it already exists for every change, both lists have 41 checks, and the June agreement itself said the note was temporary. You can reject our reading and still use this note: B costs the developer time, not safety.

**Not asked now:** a switch on GitHub that makes it refuse to accept a change onto the live software unless its checks are green. Today that rule is followed by the developer, not enforced by GitHub. We have not tested whether the switch works with how changes are put live, and testing it is ours. We will bring it to you if you want it.

## What changes in practice (told, not asked)

If you choose A, the developer's own computer stops repeating all 41 checks on every change. The copy stays available and is recommended for risky changes (changes to the database, or to the checks themselves). If GitHub's checker is switched off again, the developer turns it back on and records the date.

## A second, smaller ask — only if you answer A

The decision is written up as ADR-0047, a short technical record that replaces the June one. **If you answer A, we also ask two of you to sign it off**, so that the written record matches your answer. Two trustees' sign-off is how a written record of this kind becomes binding on the Trust, and it is how the June one was agreed. You would be signing what the table above and "What changes in practice" say, and nothing more. We would bring the sign-off page in the same form as June's. **If you answer B, there is nothing to sign:** ADR-0047 would be rewritten or withdrawn, and the June record stays as it is.

---

# What is at stake right now

- **Live today:** GitHub's checks already run on every change and are what the developer looks at. The June arrangement is still formally in force, and the developer still follows it.
- **Blocked:** nothing.
- **If nothing is decided:** the June arrangement stays. The developer keeps doing both, and the Trust's own records keep describing GitHub's checker as switched off, which is out of date.

---

# How much to trust this note

- **Earlier versions of this question:** the first wording (decision `-496`, 2026-11-23) asked whether "the pre-push hook" should be off by default. That is an engineer's term and an engineering choice, and BigDev pointed out that the Panel would not know it. It is replaced by this note and by decision `-497`. This note also first asked only the one question; the request for two trustees' sign-off ("A second, smaller ask") was added on 2026-11-23 before sending, because answering a question does not by itself make the written record binding (decision `-498`).
- **Corrected in this note:** an earlier count said six changes had a failing laptop run. Re-reading each change's record, it is five; the sixth failed in its own new test. That count is the records' own words, not re-run. Running the evidence commands also corrected two more things before this was written down: the run counts had already moved by one, and an earlier draft misdescribed what the last command returns (see E4).
- **Still uncertain:** the dates GitHub was switched off come from our notes, not from a fresh check, and we do not know that it was off continuously. We have not checked whether the laptop copy ever caught a problem that GitHub would not have. The point that an administrator can delete a run is our understanding of GitHub, not re-checked.

---

# In plain English

Every change to the TWT software goes through 41 automated checks before it goes live. In June, GitHub's service that runs them was switched off, so the developer ran the same checks on their own computer and wrote down the result, and you agreed that note would count as the proof, for as long as GitHub was off. GitHub is back. It now runs all 41 checks on every change and keeps its own record. The question is whether that record can be the proof from now on. We suggest yes: it is kept by a third party, it already exists for every change, and the laptop copy adds no check that GitHub lacks. If you say yes, the developer stops repeating the checks on their own computer every time; it stays available when they want it. If you say yes, we also ask two of you to sign the written record, so it matches your answer. If you prefer to keep the June arrangement, nothing breaks. The developer simply keeps doing both. If this section and the evidence below ever disagree, the evidence is the record.

---
---

# EVIDENCE — for the record, ⛔ not for the meeting

## E1 — What is already ratified, verbatim

ADR-0017 (`docs/adr/ADR-0017-local-ci-mirror-merge-gate.md`), ratified by the Panel as interim policy at the 2026-06-21 session (decision `2026-06-21-059`); authored under decision `2026-06-20-052`. By clause:

> **Header:** *"Ratified as **interim policy** until GitHub Actions is restored — a successor ADR is required on restoration (Decision 2026-06-20-052)."*
>
> **Decision:** *"`pnpm ci:local` (via `scripts/ci-local.sh`) + `.githooks/pre-push` is the sanctioned merge gate while GitHub Actions is unavailable. A green `ci:local` run is a valid substitute for a green GitHub Actions run; the sprint-status.yaml ledger is the per-story attestation record."*
>
> **§4:** *"Each story's sprint-status.yaml ledger entry must include a note confirming `ci:local` green (+ integration-tests when DATABASE_URL available) before the story is flipped to `done`. This is the per-story audit trail substitute for a GitHub Actions run URL."*
>
> **§5:** *"When GitHub Actions is restored, this ADR is superseded by a successor entry that records the reinstatement and the transition from `ci:local` back to cloud CI as the primary gate. The `.githooks/pre-push` hook becomes a secondary local check (not the sole enforcement mechanism). The `ci:local` script is retained as a developer tool regardless."*
>
> **Consequences, Security:** *"The gate-ran status is now developer-attested (sprint-status ledger) rather than provider-attested (GitHub Actions audit log). This is a weaker trust signal; it is the best available alternative while the suspension persists."*
>
> **Consequences, Auditability gap:** *"No immutable third-party log that "the gates ran." … Trustee Panel should be informed of this posture at the next review."*

Decision `2026-06-20-052`, open follow-up: *"Successor ADR required when GitHub Actions is restored (records reinstatement + transition from `ci:local` back to cloud CI as primary gate)."*

## E2 — What is NOT ratified

- **ADR-0047** (`docs/adr/ADR-0047-github-actions-primary-gate-ci-local-advisory.md`, landed on `main` 2026-11-23) is `drafted`, ⛔ not ratified. ADR-0017 stays `ratified` and in force until the Panel rules. Ratifying ADR-0047 needs two trustees' sign-off; the note asks for it only if the answer is A ("A second, smaller ask"), and ⛔ a ruling on PQ1 alone does not flip the ADR.
- **How the hook is made off by default** is not decided; a separate change, the author's.
- **Required status checks on `main`** are not decided and untested (ADR-0047 alternative D).
- **ADR-0017 §5's sentence on the hook** is superseded only if the Panel ratifies ADR-0047 as a whole. The Panel is told this in "What changes in practice"; it is ⛔ not put as a question. ⛔ **No Panel delegation of the hook's mechanics was found**, so this note does not claim one.

## E3 — What GitHub and the repository actually do (checked 2026-11-23)

- `.github/workflows/ci.yml` runs on a pull request to `main` and on a push to `main`; documentation-only changes are skipped (its `paths` filter). 41 jobs.
- PR run `45169126164` (Story 3.15b, head `57f541b3`): 41 of 41 jobs success. The push of that SHA to `main`, run `45172653375`: 41 of 41.
- PR run `45184100999` for decision `-496` / ADR-0047 (head `3841b44a`): 41 of 41 success. The push run for it, `45188226484`, was still in progress when this note was written; ⛔ not cited as passed.
- Landing records for those changes read "pre-push ci:local 41/41, GitHub CI 41/41": both lists have 41.
- `main` is protected against force-push, deletion and non-linear history, with `enforce_admins` on; ⛔ no required status checks, ⛔ no required reviews, ⛔ no push restrictions, no rulesets.
- `code-escrow-mirror` is a separate workflow, red on every push because `MIRROR_DESTINATION_URL` is unset (today's log). It is ⛔ not part of the 41 and not part of this question.
- ⚠ **Inference, labelled:** that a person with administrator access can delete a workflow run is our understanding of GitHub's product, not checked here.

## E4 — Commands to re-verify every claim

```
gh api repos/ulanzi1/twt/actions/runs --jq .total_count
gh run list --workflow ci.yml --limit 400 --json conclusion,createdAt --jq 'group_by(.conclusion)[]|{c:.[0].conclusion,n:length}'
gh run view 45169126164 --json conclusion,jobs --jq '{c:.conclusion,total:(.jobs|length),ok:([.jobs[]|select(.conclusion=="success")]|length)}'
gh run view 45172653375 --json conclusion,jobs --jq '{c:.conclusion,total:(.jobs|length),ok:([.jobs[]|select(.conclusion=="success")]|length)}'
gh api repos/ulanzi1/twt/branches/main/protection --jq '{checks:(.required_status_checks // "absent"), reviews:(.required_pull_request_reviews // "absent"), enforce_admins:.enforce_admins.enabled, linear:.required_linear_history.enabled}'
grep -n "^### Decision 2026-06-20-052\|^### Decision 2026-06-21-059" .decision-log.md
git log --since=2026-11-06 --format='%h %s' | grep -iE 'ci:local.*(untouched|flak|known failure|unrelated)'
```

⚠ A command that returns empty is a finding, not a pass. Run on 2026-11-23, the run counts in command 2 drift by a run or two as new runs arrive (350 / 27 / 22 plus one still running at the time). The last command is a heuristic over commit subject lines. It returned eight commits across six stories: `12b49b14` (13.1c), `31f1938e` (13.1g), `133a70bc` and `366605e1` (13.1f), `5e9171c1` (14.3), `685a09b8` and `eedc9be3` (6.39), and `9f2ccb0f` (3.15). The note counts **five** — all but 3.15, whose red was a flaky wait in a test file that story itself wrote, fixed in its own previous commit. That exclusion is a reading of the record, not something the command shows. An earlier draft of this note said the command would find exactly five; it does not, and the window had to start on 6 November, not 7 November, to include 13.1c.

---

<!-- AFTER THE PANEL RULES: (1) transcribe into the block at the top AND into `.decision-log.md` as a new decision id; (2) keep every section below it UNEDITED; (3) record what the ruling does NOT cover — it does not decide the hook's mechanics, nor the required-checks switch; (4) discharge the item in ADR-0047's "On ratification, apply" list, marking it DISCHARGED, never deleting it; (5) the implementation (ADR-0017 → superseded, index rows and counts, the hook and `ci-local.sh` headers, `gate-inventory.md` lines 13–16 and 112) is carried by **Row 56 (`adr-0047-checks-proof-ratified-and-applied`) of `docs/launch-gate-inventory/inventory-roster.md`** (decision `-498`) — add a dated line there for each step; a discharge with no row is a decision nobody schedules. -->
