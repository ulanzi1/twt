# Trustee Panel routing note — 2026-09-08

> ⏳ **ROUTED, ⛔ NOTHING RATIFIED.** This note is the escalation as it is being put to the Panel.
> ⭐ The ruling, when made, is transcribed into `.decision-log.md` and this header is replaced by it.

---

## A story was withdrawn, and the sprint ledger has ⛔ no honest way to say so. The vocabulary is the Panel's, ⛔ not ours.

⚠⛔ **WE WANT TO BE STRAIGHT ABOUT THE SIZE OF THIS.** ⛔ Nothing ships differently either way. ⛔ No
member sees anything. ⛔ No money moves. ⭐ This is a **record-integrity** question about one word in
one YAML file — and it reaches the Panel **only because the repository's own rule says it must**.

⭐ **If the Panel would rather not spend a sitting on this, Q2 offers a standing delegation** so this
class never returns.

---

## 1. What is being asked, precisely

| # | Question | What is blocked / at risk |
|---|---|---|
| **Q1** | May `withdrawn` be **minted** as a terminal `development_status` value — *"story closed WITHOUT implementation because ANOTHER STORY owns the work"* — ⛔ distinct from `deferred-to-v2`, whose work does ⛔ not ship at all? | ⛔ Nothing ships. ⚠ But **today the ledger states a falsehood**: `11b-16` reads `ready-for-dev` while its story file reads `WITHDRAWN`. ⭐ A future `sprint-planning` or `dev-story` run reads the **row**, ⛔ not the file. |
| **Q2** *(optional)* | Does the Panel wish to **delegate** enum additions of this class — ⭐ ones that change ⛔ no member-facing behaviour and ⛔ no governance authority — to the Solo Builder, with a standing obligation to record each mint in `.decision-log.md`? | ⚠ Without it, every future vocabulary gap returns to the Panel. ⭐ With it, the Panel keeps the ones that matter. |

⭐ **Q1 is the one we need.** ⭐ Q2 is offered only to save the Panel this class of question in future;
⛔ declining it costs nothing.

---

## 2. Why this is the Panel's, and ⛔ not BigDev's

⚠⛔ **THE REPOSITORY ALREADY DECIDED THIS, AGAINST ITSELF.** `sprint-status.yaml` carries, verbatim:

> *"⛔ A `blocked-awaiting-decisions` value was considered and **deliberately NOT minted** — per the
> `deferred-to-v2` precedent (Decision `2026-08-17-126` cl.6) **an enum addition is a RATIFIED
> GOVERNANCE ACT**, not an authoring convenience. ⇒ `ready-for-dev` here means what the enum says."*

⇒ ⭐ a value was **wanted, and refused**, on exactly the ground that would be used to mint this one.
⛔ We are ⛔ not going to mint `withdrawn` on author-committed authority and leave that sentence
standing three screens above it.

⭐ **What BigDev DID have authority to do, and did:** withdraw the story. Story scoping is his
(`#decision-2026-09-08-208` cl.1). ⛔ What he does ⛔ not have is the authority to add a word to the
**vocabulary the ledger is written in**.

---

## 3. The fact, and why every existing value is false

### 3.1 What happened

Story `11b-16` ordered work that `8-16` **already owned**. `8-16` was minted **2026-09-02** by Panel
direction (`2026-09-02-179` cl.3); `11b-16` was authored **2026-09-04**, at a **narrower** scope, and
its authors had ⛔ never seen `8-16`. ⇒ `11b-16` is **WITHDRAWN** (`-208` cl.1) — ⛔ not superseded
(`8-16` came **first**), ⛔ not deferred (**the work ships**, in `8-16`).

### 3.2 The four things we could write in the row, and why each is a lie

| Value | Its definition | Why it is false here |
|---|---|---|
| `ready-for-dev` **(what the row says today)** | *"Story file created in stories folder"* | ⛔ Implies **startable**. A `dev-story` run would pick it up and build a **reversal of a Trustee-ratified clause** — the very thing the withdrawal exists to stop. |
| `backlog` | *"Story only exists in epic file"* | ⛔ It does ⛔ **not** exist in `epics.md`, and this implies *"not yet started, still in v1"* — ⛔ it will **never** be started. |
| `deferred-to-v2` | *"Story ruled OUT of v1 scope … closed WITHOUT implementation"* | ⛔ The work is ⛔ **not** out of v1 — ⭐ it ships in `8-16`, in v1. ⚠ And this value's own definition requires **a trustee-ratified decision**, which is the question being asked. |
| **deletion** | — | ⛔ Invites a `sprint-planning` **ghost**: the key returns on the next regeneration with ⛔ no record of why it left. |

⇒ ⭐ **each is false in a different direction.** ⛔ We wrote none of them.

### 3.3 What we did instead, and its cost

⭐ The row **stays `ready-for-dev` and is KNOWINGLY FALSE**, and `-208` **cl.7** says so in terms. The
story file's own `Status:` line carries the truth:

> `Status: ⛔ **WITHDRAWN** (Decision 2026-09-08-208 cl.1) — ⛔ terminal. … ⚠⛔ ⛔ DO ⛔ NOT RUN
> `dev-story` AGAINST THIS FILE.`

⚠⛔ **THE COST IS REAL AND WE ⛔ WILL NOT UNDERSTATE IT:** the automation reads the **row**. ⭐ The
protection is **prose in a file the automation does ⛔ not consult.** ⇒ this holds because a human is
in the loop today; ⛔ it is ⛔ not a mechanism.

---

## 4. Options

| | Option | Cost |
|---|---|---|
| **A** | ⭐ **Mint `withdrawn`** (text at §5), and flip `11b-16` to it. | One enum value; one `STATUS DEFINITIONS` paragraph; one row. ⭐ The ledger stops lying and the automation is guarded by the **row**, ⛔ not by prose. |
| **B** | **Widen `deferred-to-v2`** to cover *"closed without implementation"* generally, ⛔ dropping *"ruled OUT of v1"*. | ⛔ Amends a **ratified** definition (`2026-08-17-126` cl.6) and makes one word mean two different fates — *"the work never ships"* and *"the work ships elsewhere"*. ⛔ We ⛔ do not recommend it. |
| **C** | **Decline the mint; keep the status quo.** | ⛔ Free today, ⛔ and the row stays knowingly false. ⚠ We would then ask for a **second-best mechanism** — e.g. a CI guard that fails if a `ready-for-dev` row's story file says `WITHDRAWN` — ⭐ because a falsehood guarded only by prose is what this repo keeps finding the hard way. |
| **D** | **Delete the row.** | ⛔ The ghost problem in §3.2. ⛔ Not recommended. |

⭐ **Our read: A.** It is the smallest change that makes the record true, and it closes a gap the
automation can actually fall into.

---

## 5. If the Panel rules A — the text to ratify, ⛔ verbatim

⭐ Added to the `STATUS DEFINITIONS` block, under **Story Status**, immediately after `deferred-to-v2`:

```
#   - withdrawn: Story closed WITHOUT implementation because ANOTHER STORY owns the work. ⛔ This is
#       a TERMINAL state. ⭐ It is distinct from `deferred-to-v2` (whose work does ⛔ NOT ship at all)
#       and from `done` (built by THIS story): the work DOES ship, under a different key, and that key
#       MUST be named in the `last_updated` ledger entry that sets this value, together with the
#       decision that withdrew the story. ⛔ The story file is KEPT, ⛔ never deleted, and its own
#       `Status:` line carries the same word. ⛔ A `withdrawn` story is NEVER picked up by `dev-story`.
#       Minted 2026-09-08 by Trustee Panel ruling (routing note
#       `trustee-panel-routing-note-2026-09-08-sprint-status-withdrawn-enum-mint.md`) for
#       `11b-16-member-name-form-configured-presentation`, whose work is owned by
#       `8-16-member-pool-identity-name-form-alignment`.
```

⇒ then `development_status[11b-16-member-name-form-configured-presentation]: withdrawn`, in a
`governance:` commit, with the flip recorded in the ledger.

---

## 6. What is blocked

⛔ **Nothing ships on this.** ⭐ `8-16` is startable **today** and does ⛔ not wait for this ruling —
its two Preflight STOPs were discharged by `-208` and `-209`.

⚠ What waits is only the **record**: until this is answered, `11b-16`'s row is false, and the only
thing standing between an automated run and a withdrawn story is a sentence in a file that run does
⛔ not read.

---

## 7. Commands to re-verify every claim in this note

```bash
# The rule that makes this the Panel's — verbatim, in the file it governs
grep -n "deliberately NOT minted" -A3 _bmad-output/implementation-artifacts/sprint-status.yaml

# The status vocabulary as it stands, and the `deferred-to-v2` definition
sed -n '/^# STATUS DEFINITIONS/,/^# WORKFLOW NOTES/p' _bmad-output/implementation-artifacts/sprint-status.yaml

# The row that is knowingly false, and the file that carries the truth
grep -n "^  11b-16" _bmad-output/implementation-artifacts/sprint-status.yaml
sed -n '/^Status:/,+4p' _bmad-output/implementation-artifacts/11b-16-member-name-form-configured-presentation.md

# The withdrawal itself, and clause 7 (this escalation)
grep -n "^### Decision 2026-09-08-208" .decision-log.md
```

---

## Appendix — the same question, in plain English

### What happened

We wrote a story. It turned out another story, written two days earlier, was already going to do the
same work — and had been approved by the Panel to do **more** of it. So we cancelled ours.

### The problem

Our sprint tracker records each story's state with one word from a fixed, short list: *backlog*,
*ready-for-dev*, *in-progress*, *review*, *done*, and one special one, *deferred-to-v2* (meaning
*"we decided not to build this at all"*).

⭐ **There is no word for *"cancelled, because someone else is building it."*** The closest,
*deferred-to-v2*, means the opposite of what happened — the work **is** being built; just not by this
story.

So the tracker currently says our cancelled story is **ready to be worked on**. That is not true, and
if an automated run believed it, it would build something the Panel has already ruled against. We put
a warning in the story document itself — but the automation reads the tracker, ⛔ not the document.

### Why we are asking you and not just fixing it

Some time ago we wanted to add a different word to that list and stopped ourselves, writing down that
**adding a word to this list is a governance decision, not a convenience** — because the list is how
the project describes the state of its own work, and quietly extending it lets anyone redefine what
*"done"* or *"cancelled"* means.

⭐ We are keeping to that rule, even though it makes a small thing slower.

### What we are asking for

Permission to add one word — **withdrawn** — meaning *"this story is closed without being built,
because another story is building it instead."*

### And a second, optional question

If the Panel would rather not be asked about this kind of thing again, you can delegate it: let the
Solo Builder add words like this **when they change nothing a member sees and nothing about who
decides what**, on condition each one is written into the decision log. ⭐ You would keep every
decision that actually affects a member. ⛔ Saying no to this costs nothing — it just means questions
like this keep coming to you.

### What happens next

⭐ Whatever you rule is written into the decision log and the tracker is corrected the same day.
⛔ Nothing is waiting on it to be built — this is about the record being true.
