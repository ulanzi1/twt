# Trustee Panel routing note — 2026-09-19 — when the bank-account name does not match the nominee

> ## ✅ PANEL RULING — Dhiraj Rahul + Kalpana Bharti, 2026-09-19 (relayed by BigDev)
>
> Recorded as `.decision-log.md` `2026-09-19-226`. ⭐ The Panel answered with **its own design**, not any
> option below: there is ⛔ no escalation path; the District Admin reviews.
>
> **Verbatim, as relayed:**
> 1. *"Mismatch is not allowed in general. It's the duty of helpline_operator to make sure name doesn't
>    mismatch. However, A clerical difference (an initial, a married name, a bank's shortened name) in
>    form can be submitted with note to District Admin. Once Pariwar Admin approves the claim, campaign
>    goes live. System shouldn't act for name mismatch at any time, but display/highlight that approved
>    named is mismatched for District Admin, Pariwar Admin, Super Admin."*
> 2. *"Mismatch is reviewed by District Admin."*
> 3. *"Bank Account Information is mandatory for claim filing."*
> 4. *"Clerical mismatch can be permitted subject to District Admin approval at verification and final
>    approval by Pariwar Admin."*
>
> **Follow-up answers, same session:**
> - (a) The highlight comes from the **District Admin's recorded judgement**, ⛔ never a computer
>   comparison — *"but District Admin cannot proceed unless reason for name mismatch is selected."*
> - (b) A mismatch that is ⛔ not clerical is **sent back for correction** — ⛔ not denied for it.
> - (c) **Two accounts** are mandatory; claims already filed without them must have them added before
>   the District Admin can decide.
> - (d) For claims the family files in the app, the **District Admin's check** is the safeguard.
>
> **Against the parts below:** Part 1 → none of A/B/C (no escalation; the District Admin decides,
> with a selected reason). Part 2 → none of A/B/C (the District Admin). Part 3 → neither A nor B —
> accounts are mandatory at filing, which removes the question. Part 4 → A in substance, but the
> accepting actor is the District Admin, with final approval by the Pariwar Admin.
>
> ⭐ Everything below is kept **unedited** as the question **as it was put**
> ([[feedback_supersede_never_reinterpret]]).

<!-- §0 GATE, answered before writing (kept for the record):
⭐ Parts 1–4 are the Panel's: they decide whether a death claim can be stopped (what the Trust owes a
family), who holds the power to let a claim proceed, and whether an earlier ruling is narrowed.
⛔ NOT asked here, because they are ours and already decided in Story 6.18: where on the screen the
check sits, the permission key, how staleness is detected, and that every approval path is gated
separately (BigDev chose per-path checks over a single final check, 2026-09-19).
⛔ Also NOT asked: that a family member can change the declared nominee after death. It is real, it is
recorded (E2), and it is a separate question for a separate note.
-->

---

# The question

**In one sentence:** when the person approving a death claim looks at the name on the bank account
the family gave and it does not match the nominee the member declared, what happens to the claim —
and who decides?

**Why it cannot be decided without you:** on 5 September you asked us to make the approver's check
real. Our record of what you ruled next — that a mismatch should be sent up for review rather than
stopping the claim — exists only in our own working notes, not in the decision log, and building it
has shown that the answer has four parts, three of which nobody has ruled. Each part decides whether
a grieving family's claim can stall, or who holds the power to release it.

## The one fact that decides it

⭐ **The person who can release a claim sent up for review today is the Pariwar Admin, not a State
Trustee.** When the system was built, reviews were given to the Pariwar Admin, acting for the
trustees, until State Trustees have their own access. So a ruling that says "the State Trustee
decides" either means the Pariwar Admin in practice, or it means waiting for work that has not been
scheduled.

---

# What you are choosing between

**Part 1 — does a mismatch stop the claim?** *(Our notes record you choosing B on 5 September. Please
confirm or correct.)*

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | A mismatch stops the claim until the account is fixed | Nothing is paid to an unchecked account | A clerical difference (an initial, a married name, a bank's shortened name) halts a death claim. The account often cannot be changed at that stage |
| **B** | A mismatch sends the claim up for review; it is never stopped for this reason | The family's claim keeps moving; a senior person looks | The verifier can no longer approve that claim themselves — it waits for the reviewer |
| **C** | Record the check but let the approver proceed regardless | Fastest for the family | The check is recorded but binds no one; it is close to today |

**Our reading:** **B** — because it is what our notes say you chose, and it is the only option that
neither halts a claim nor leaves the check toothless.

**Part 2 — who reviews a mismatch?**

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | The Pariwar Admin, acting for the trustees (as every other review works today) | Reviews happen now, by the person who already releases these claims | It is not a State Trustee. Your notes' wording said "State Trustee" |
| **B** | A State Trustee only | The reviewer is the most senior office | ⚠ State Trustees have no access to these screens yet, and that work is not scheduled. Until it is, every mismatch **waits with no one able to release it** |
| **C** | The Pariwar Admin now; a State Trustee once they have access | Reviews happen now, and the senior office takes over later | Two stages to explain; the later switch needs its own story |

**Our reading:** **C** — because B stalls every mismatched claim today, and C records the intention
you stated without making families wait for it.

**Part 3 — a claim where the family has not given any account yet.**

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | The check applies only once an account is on file; a claim with no account is decided as today | Nothing changes for families who have not filed an account yet | Approval can happen before any account exists. ⭐ Any account added later is checked before the trustees' final vote, so no unchecked account reaches payment |
| **B** | No claim can be approved until an account is on file and checked | Every approved claim has a checked account from the start | ⚠ A new condition on every death claim that nobody has ruled — a family slow to give an account stalls the claim |

**Our reading:** **A** — BigDev's choice on 19 September. It adds no new condition, and the later
check at the trustees' vote covers the gap. ⚠ It narrows the wording in our notes ("recorded before
approval"), which is why it is here.

**Part 4 — may the reviewer let a claim proceed when the names differ?**

| | Option | What changes for a person | Cost |
|---|---|---|---|
| **A** | Yes, with a written reason that is kept on record | The reviewer can accept a legitimate difference (a married name, a bank truncation) and the family is paid | Relies on the reviewer's judgement; the reason is the only safeguard |
| **B** | No — only an exact confirmation lets a claim proceed | Nothing proceeds on a doubtful account | ⚠ By the time a claim reaches the reviewer, the account usually **cannot be changed**. The reviewer's only other choice is to **deny** — a death claim refused over a spelling |

**Our reading:** **A** — because "sent up for review" only means something if the reviewer can
decide either way, and B makes denial the only exit.

---

# What is at stake right now

- **Live today:** yes. The bank-account holder's name is already shown under the words "Nominee
  Name" on three public pages and on two member screens. Nobody inside the Trust checks it. Your
  5 September ruling that lets the public index say "nominee of" stands **because** this check is
  to be built.
- **Blocked:** the recording half of Story 6.18 — the approval check and the review path. Showing the
  two names to the approver is **not** blocked and can proceed.
- **If nothing is decided:** the approver can see the names, but nothing requires them to check,
  and nothing records that they did.

---

# How much to trust this note

- **Earlier versions of this question:** the 5 September note put ruling 1 ("make the check real")
  and never asked what happens on a mismatch. The "soft" answer was then recorded the same evening in
  our commit message and story file, **not** in the decision log, and it named a State Trustee we
  later found holds none of the access.
- **Corrected before this note was written:** our first description of the review path said a
  mismatch "does not block". Checking the code showed it does stop the verifier (only the reviewer
  can then release the claim); Part 1 now says so. Our first design for Part 3 would have made "no
  account" silently mean "no approval"; that is why Part 3 exists.
- **Still uncertain:** whether you meant "State Trustee" literally on 5 September (Part 2). We have
  no record of your words beyond our own notes.

---

# In plain English

When a member dies, the family gives a bank account for the Pariwar's contributions. The name on that
account is already shown publicly as the nominee's, but nobody at the Trust has ever compared it with
the nominee the member actually declared. You asked us to make that comparison a real, recorded duty.
We are building it: the approver will see both names side by side and must record whether they match.
The hard case is a mismatch. We suggest it goes up for review instead of stopping the claim (B); that
the Pariwar Admin reviews it until State Trustees have their own access (C); that families who have
not yet given an account are not held up, with any account added later still checked before the
trustees' final vote (A); and that the reviewer may accept a genuine difference with a written reason
(A). If this plain summary and the evidence below ever disagree, the evidence is the record.

---
---

# EVIDENCE — for the record, not for the meeting

## E1 — What is already ratified, verbatim

> `trustee-panel-routing-note-2026-09-05-11b12-under-funded-commitment-claim.md` §10.2 — *"The three
> rulings — Trustee-ratified, DR + KB, 2026-09-05"* — ruling **1**: *"Open a story to MECHANIZE the
> approver duty."* Effect: *"`D5-subject` (ii) moves from routed to commissioned. The check becomes
> real; "nominee of" becomes true because it was checked."*

> `.decision-log.md` `-205` (ruling 2's entry) cl.4: *"Story 6.18 — commissioned by the same
> 2026-09-05 Panel pass, ruling 1 — is what closes …"*; cl.10 records the index value as unverified
> until 6.18 ships.

> `6-13-state-trustee-cycle-freeze-approval-bulk-approval-surface.md` D-B — *"RATIFIED"* by BigDev
> 2026-07-13 (⚠ an author ratification, not the Panel's): *"Pariwar-scoped `cycle.freeze` … granted
> to `pariwar_admin` + `super_admin`; direct `state_trustee` authorization DEFERRED to Epic 3 … v1
> actor = `pariwar_admin` acting as Trustee-Lite."*

## E2 — What is NOT ratified

- **The "soft" answer (Part 1 B).** It appears only in commit `d3d67710` (2026-09-05 23:38) — *"6.18's
  D2 RULED (b) SOFT — Trustee Panel (Dhiraj Rahul + Kalpana Bharti), 2026-09-05. Recording the
  attestation is MANDATORY; a "does not match" verdict ROUTES to the State Trustee INSTEAD OF HALTING
  a death claim"* — in the Story 6.18 file, and in the `2026-09-05o` ledger block and the comment
  above the `6-18` row in `sprint-status.yaml`. The 5 September note contains no block/soft/advisory
  question (`grep -c SOFT` = 0). No `.decision-log.md` entry records it.
- **The reviewer's identity (Part 2), the no-account case (Part 3), the reviewer's power to accept
  (Part 4):** ruled nowhere.
- **Not asked here, recorded so it is not lost:** the member-nominee declaration can be rewritten
  after the member's death — the write path checks only for `withdrawn`/`anonymized` members, and
  the claim filer's session is the deceased member's. The new check therefore compares two values
  the filer may control. Story 6.18 shows the declaration date beside the claim's filing date and
  records this; the fix changes what a family may do and belongs in its own note.
- `-210` cl.2 (BigDev's delegated authority to add enum values) covers tracking vocabularies that
  change nothing a member is owed. It does ⛔ not cover the new review reason, which reroutes a death
  claim — so this ruling is also that reason's authority.

## E3 — What the code actually does

- **Escalation stops the verifier:** `verifier-decision-persist.ts` — `ClaimDecisionConflictError`,
  *"Escalate is terminal-for-write"*; `adjudicateClaim` refuses any claim with a live decision row
  (`:295-299`). The claim's lifecycle state does not change (`claim/state.ts:192-198`).
- **Who can release it:** `resolveEscalation` (`state-trustee-decision-persist.ts:533`) via the
  cycle-freeze route, gated `cycle.freeze` at the Pariwar level (`claims.cycle-freeze.routes.ts`,
  header: *"v1 actor = pariwar_admin-as-Trustee-Lite"*). `state_trustee` holds neither
  `cycle.freeze` nor `claim.verify` (`packages/domain/src/rbac/roles.ts`).
- **Approval does not require an account today:** neither decision writer reads
  `claim_nominee_bank_accounts`.
- **Where the account can change:** before the verifier's approval (`NOMINEE_BANK_COLLECTABLE_STATES`)
  and by an admin correction just after it (`['verifier_approved']`); ⛔ never in the trustees'
  freeze or later (`claim/errors.ts:198-210`). ⇒ a check at the trustees' vote sees the final account
  (Part 3's safeguard, inference from the two windows; Story 6.18 AC9 pins it with a test).
- **Paths to approval Story 6.18 gates:** the verifier's approval, the review release, the trustees'
  frozen vote (including appeal reversals), and the R9 vote finalization.

## E4 — Commands to re-verify every claim

```
# The 5 September note never asked the soft/block question (expect 0)
grep -c 'SOFT' _bmad-output/planning-artifacts/trustee-panel-routing-note-2026-09-05-11b12-under-funded-commitment-claim.md
# Where the "soft" answer actually lives
git show -s --format='%h %ad %s' d3d67710
# No decision entry for it; 6.18 appears only as ruling 1 inside -205 and in catalog notes
grep -n 'Story 6.18' .decision-log.md
# Escalation is terminal-for-write
grep -n 'terminal-for-write' packages/domain/src/claim/verifier-decision-persist.ts
# The v1 reviewer is the Pariwar Admin
grep -n 'Trustee-Lite' apps/api/src/modules/claims/claims.cycle-freeze.routes.ts
# Approval never reads bank accounts (expect no output)
grep -n 'nominee_bank\|NomineeBank' packages/domain/src/claim/verifier-decision-persist.ts packages/domain/src/claim/state-trustee-decision-persist.ts
# The two windows in which an account can change
sed -n 198,210p packages/domain/src/claim/errors.ts
```
