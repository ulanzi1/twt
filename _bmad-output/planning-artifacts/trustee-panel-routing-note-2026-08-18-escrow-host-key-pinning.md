# Trustee Panel Routing Note — ADR-0002 states a security control as CLOSED that was never built

**Status:** ⏳ **Open — four questions, awaiting ruling.** Q1 and Q3 are ⛔ BLOCKING. Q2 and Q4 are
⚠ DIRECTIVE.
**Author:** BigDev (Solo Builder)
**Raised:** 2026-08-18, against `main` @ `7fd5496` (clean, fetched, `== origin/main`).
**Scope:** ⛔ **Attached to no story.** Story 0.3 closed its framework leg on 2026-06-05; this concerns
a **ratified ADR clause** and the workflow beneath it.
**Decision-log head, verified live at authoring:** `2026-08-18-129` (`.decision-log.md:37`).
`grep -c '^### Decision '` → **131** headings, of which one is the `YYYY-MM-DD-NNN` **template**,
leaving **130** numbered headings over **129** distinct numbers — the `+1` is the amendment suffix
`2026-06-01-012-amend-1`. No gaps in `001…129`.
**Disposition on ruling:** a single `.decision-log.md` entry, numbered **`2026-08-18-130`** from the
current head — *(⚠ **re-verify the head at ruling time**)*. Per Decision `2026-08-09-095` the entry
must **label per-clause provenance**.

> ⚠ **Every recommendation in this note is NON-BINDING.**

> ⛔ **ADR-0002 is RATIFIED and is NOT edited by this note or by any ruling on it.** Its status line
> reads `ratified`, dated 2026-06-05, ratifying trustees **Dhiraj Rahul** and **Kalpana Bharti**,
> `Superseded by: (none)`. A correction is recorded as a **successor decision** referencing the clause,
> on the `2026-08-12-101` / `2026-08-16-122` record-correction precedent
> ([[feedback_supersede_never_reinterpret]]).

> ⚠ **Nothing here is a live security incident.** F-4 states precisely when the exposure would open,
> and it is **not open today**. This note exists so it never opens.

---

## Why this note exists

The `code-escrow-mirror` workflow has been failing on every push to `main`. It was investigated on the
assumption that a credential had expired. **It had not** — the workflow fails by design, exactly as its
own header says it will, because Story 0.3 Task 8 (secret wiring) has never closed:

```
MIRROR_PUSH_CREDENTIAL:
MIRROR_DESTINATION_URL:
##[error]MIRROR_DESTINATION_URL is unset — Story 0.3 Task 8 (secret wiring) has not closed.
```

⇒ **That part is correctly recorded and needs no ruling.**

The investigation surfaced something else, which is what this note is about: **ADR-0002 asserts that a
security exposure is closed, by a mechanism that does not exist in the codebase.**

---

## Findings

*(Every citation re-verified from source at `7fd5496`.)*

### F-1 ⭐ THE FINDING — a ratified ADR states a control as CLOSED; the code implements the weaker one

**ADR-0002 body item 7** (`docs/adr/adr-0002-code-escrow-mirror-destination.md:37`), verbatim:

> *"**Host-key pinning** per Story 0.3 OQ #9 SSH TOFU resolution — the workflow YAML stores a
> `KNOWN_HOSTS` GitHub Actions secret containing GitLab.com's published SSH host-key fingerprint; the
> workflow runs with `StrictHostKeyChecking=yes`. **This closes the trust-on-first-use exposure
> window** between Task 8 secret-wiring and Task 7 ADR landing."*

And again in its consequences (`:65`):

> *"**Trust-on-first-use exposure** closed by the `KNOWN_HOSTS` secret + `StrictHostKeyChecking=yes`
> configuration per Story 0.3 OQ #9 + body item 7 above."*

**What the workflow actually does** (`.github/workflows/code-escrow-mirror.yml:184`):

```bash
export GIT_SSH_COMMAND="ssh -i ${HOME}/.ssh/mirror_id -o StrictHostKeyChecking=accept-new -o IdentitiesOnly=yes"
```

`accept-new` **is** trust-on-first-use. ⛔ **`KNOWN_HOSTS` appears in no `env:` block, no `secrets.`
reference, and no shell line anywhere in the repository** — it exists only inside a comment.

⇒ The ADR does not merely omit the control. It **affirmatively states the exposure is closed**. That is
the strongest form of the defect: not a gap, but a **false assurance**, ratified.

### F-2 — the workflow file contradicts ITSELF about its own posture

Two statements, same file, both live:

| Line | Says |
|---|---|
| `:52` (header) | *"`StrictHostKeyChecking=accept-new` is used… **trust-on-first-use on every ephemeral runner**… Accepted as the **pre-ADR interim posture**… **Task 7 ADR commits host-key pinning that closes this window.**"* |
| `:146-147` (step comment) | *"Per ADR-0002… **host-key pinning = `KNOWN_HOSTS` secret** with GitLab.com SSH host fingerprint + **`StrictHostKeyChecking=yes`** (closes Story 0.3 OQ #9 TOFU exposure)."* |

The header is **accurate and self-aware**; the step comment describes the ADR's intent as though it were
implemented. The code at `:184` implements the header, not the step comment.

⇒ A reader who reads only the step comment — the one directly above the credential logic — concludes
pinning is in force.

### F-3 — the gap is recorded NOWHERE

Searched `deferred-work.md` and `.decision-log.md` for `OQ #9` / `TOFU` / `trust-on-first-use` /
`accept-new`. **One hit**, and it is the *instruction*, not the gap — Decision `2026-06-05-034`
clause 2, directing that the ADR capture *"host-key pinning mechanism per Story 0.3 OQ 9 SSH TOFU
resolution."*

Story 0.3's own deferral block (`deferred-work.md:1978-1994`) records **thirteen** items — sole-admin
enforcement, §2.10a one-shot verification, attestation drift, pre-Task-8 failure logging, ref-deletion
policy, the dual-mirror row, and more. ⛔ **Host-key pinning is not among them.**

⇒ The obligation was **instructed → ratified as closed → never implemented → never recorded as
outstanding**. Nothing in the tree would surface it.

### F-4 ⭐ THE SHARP ONE — not exploitable today, and exactly when it becomes so

The TOFU window is **closed right now**, for an accidental reason: the SSH branch at `:184` is never
reached, because the secret pre-flight guard at `:160-171` aborts the step first. No secrets ⇒ no push
⇒ no host-key decision.

⛔ **It opens the moment Task 8 wires the secrets** — and that is precisely the moment an operator will
be reading ADR-0002 saying the exposure is already closed.

⇒ **The day the escrow starts working is the day the window opens, under a ratified document asserting
it is shut.** ⚠ Stated as the reason this is worth a sitting now rather than at Task 8.

### F-5 — the delivery mechanism for missing it: a check that is red by design

`code-escrow-mirror` fails on **every** push to `main` and has done so since the workflow landed. Two
consecutive `main` pushes were checked live (2026-08-17 and 2026-08-18); both red at 13–15s.

That is **working as authored** — the header calls the failure *"the gap to log"*. But it also means a
permanently-red check on `main` reads as normal. ⚠ **A real failure of this workflow would be
indistinguishable from the designed one**, and Story 0.3's own deferral list already names the adjacent
problem: *"Pre-Task-8 workflow failures pile up with no auto-log channel."*

---

## The four questions

### Q1 — Is ADR-0002 item 7 corrected? ⛔ BLOCKING · *It currently states a false closure*

⭐ **Recommendation: (a) yes — a successor `.decision-log.md` entry records that item 7 and its
consequence line describe a control that was specified but never implemented, and that the TOFU
exposure is therefore OPEN-on-wiring rather than closed.**
⛔ **The ADR file is NOT edited.** Its status stays `ratified`; the correction lives in the successor
entry, on the `2026-08-12-101` / `2026-08-16-122` precedent.

### Q2 — Is the pinning IMPLEMENTED now, or bound to Task 8? ⚠ DIRECTIVE

The change is small: add `KNOWN_HOSTS` to the step's `env:`, write it to `~/.ssh/known_hosts`, switch to
`StrictHostKeyChecking=yes`, and reconcile the two comments at `:52` and `:146-147`.

⭐ **Recommendation: (b) implement now.** ⚠ It is arguably **not new scope at all** — ADR-0002 already
ratified this exact mechanism; building it is *conformance to a ratified control*, not a new decision.
⛔ The Panel may equally rule (a) defer it into Task 8's own work, which is safe **only if Q3 rules (a)**.

### Q3 — Does Task 8 gain a PRECONDITION: no secret wiring until pinning is in place? ⛔ BLOCKING

This is the question that decides whether the window can ever open.

⭐ **Recommendation: (a) yes — bind them.** Wiring `MIRROR_PUSH_CREDENTIAL` / `MIRROR_DESTINATION_URL`
may not precede a working `KNOWN_HOSTS` + `StrictHostKeyChecking=yes`. ⭐ **This makes the exposure
structurally unable to open**, rather than relying on whoever closes Task 8 remembering this note.
⚠ Phrase it over the **system**, not the backlog — *"no mirror credential is wired while the workflow
resolves host keys by TOFU"* survives a backlog reorganisation; *"Task 8 must do X"* does not
([[feedback_mechanization_split_commitment]]).

### Q4 — What posture for the permanently-red check? ⚠ DIRECTIVE

⭐ **No strong recommendation.** Options: (a) leave it red-by-design and record the fatigue risk;
(b) convert to `workflow_dispatch` + scheduled until Task 8, so `main` is green and the gap is tracked
elsewhere; (c) keep it red but wire the auto-log channel Story 0.3's deferral already names.
⚠ ⛔ **(b) trades a visible gap for an invisible one** and should be ruled deliberately if chosen.

---

## What non-answer would mean

| Q | Consequence of no answer |
|---|---|
| **Q1** ⛔ | A ratified ADR keeps asserting a closed exposure that is not closed. **Any future reader — including counsel, at §8.x review — is entitled to rely on it.** |
| **Q3** ⛔ | ⚠ **The live risk.** Task 8 closes at some later date, the secrets go in, and the TOFU window opens silently under a document saying it is shut. No mechanism would catch it. |
| **Q2** ⚠ | Pinning stays unbuilt; tolerable **only** while Q3(a) holds the wiring shut. |
| **Q4** ⚠ | The check stays red-by-design; a genuine failure remains indistinguishable from the designed one. |

⛔ **No story stops on any of this.** The mirror is not running, and nothing in the product is affected.

---

## What this note does NOT ask, and what a ruling would NOT mean

**Not asked:**
- ⛔ **Whether the mirror destination is right.** GitLab.com under the trustee-owned foundation account
  is ratified and untouched.
- ⛔ **Whether Task 8 should close.** Only what must be true *before* it does.
- ⛔ **Any change to the credential model, rotation cadence, or branch-protection posture.**
- ⛔ **Anything about the `--mirror` / LFS / force-push semantics** already recorded in Story 0.3's
  deferral block.
- ⛔ **Re-opening Story 0.3.** Its framework leg closed 2026-06-05 with operational execution deferred,
  and that record is accurate.

**A ruling would NOT mean:**
- ⚠ that **ADR-0002 is superseded.** A record correction to one clause is not a supersession of the ADR.
- ⚠ that **the escrow is working.** It is not, and this note does not make it so.
- ⚠ that **Story 0.3's other twelve deferrals are touched.** They are unchanged.
- ⚠ that **the TOFU exposure was ever exploited.** ⛔ No such claim is made: the SSH branch has never
  executed, because the secret guard aborts first (F-4).

---

## Ruling template

Per Decision `2026-08-09-095`, per-clause provenance is mandatory.

| Q | Ruling | Notes |
|---|---|---|
| **Q1** ⛔ | (a) successor entry corrects item 7 + the `:65` consequence / (b) no correction — with reason | ⛔ The ADR file is never edited in place |
| **Q2** ⚠ | (a) defer to Task 8 / (b) implement now / (c) implement now **and** record it as conformance, not new scope | ⛔ (a) is safe only under Q3(a) |
| **Q3** ⛔ | (a) bind — no credential wiring while the workflow resolves host keys by TOFU / (b) no binding — with reason | ⭐ Phrase over the SYSTEM, not the backlog |
| **Q4** ⚠ | (a) red-by-design, fatigue risk recorded / (b) dispatch+schedule until Task 8 / (c) red + wire the auto-log channel | ⛔ (b) trades a visible gap for an invisible one |

---

## Disposition

On ruling: **one** `.decision-log.md` entry, numbered from the **then-live head**
(**`2026-08-18-130`** at authoring), per-clause provenance labelled, committed under a
`governance(escrow):` prefix **before** any workflow change
([[feedback_governance_commits_precede_implementation]]).

**If Q1 rules (a):** the entry states in terms that ADR-0002 item 7 and its `:65` consequence line
**described a control that was never implemented**, and that the exposure is **OPEN-on-wiring**. ⛔ Per
[[feedback_closure_language_precision]] this is *"Not addressed"* as to the control and a **record
correction** as to the ADR — ⛔ never *"Closed by [edit]"*, because no edit closes it.

**If Q3 rules (a):** the binding is recorded as a **standing precondition** on the credential wiring
itself, and — per the lesson this project has paid for repeatedly — is written into the artifact a
successor must touch (`docs/escrow/code-escrow/mirror-procedure.md` §1 Prerequisites and the workflow's
own secret-guard block), ⛔ not only into this note.

⛔ ADR-0002, Decisions `2026-06-05-019`, `2026-06-05-034` and `2026-06-05-036` are **not edited** by any
of this.
