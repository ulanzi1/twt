# Trustee Panel routing note — 2026-09-14
## Two questions from Story 11b.17's Group-B code review: (Q1) does a SUSPENDED member see the nominee's unmasked banking coordinates? (Q2) what does a member see when a bank's NAME was never recorded?

> ## ✅ ANSWERED — 2026-09-14, **Dhiraj Rahul** and **Kalpana Bharti**
>
> **Q1 → Option A.** Suspension does ⛔ **not** narrow what a member sees. A suspended member reads the
> nominee's complete, UNMASKED coordinates like any other member — ⭐ the existing ruling's own rationale
> (*"they are curing … they need the contribution surface"*) reaches this page, because access was
> preserved so a member can **take part**, and contributing is taking part. ⛔ **No code change** — the
> shipped behaviour is CONFIRMED.
> ⚠⛔ **Scope, and it is narrow:** this answers **SUSPENSION** only. ⛔ It does ⛔ NOT close
> `deferred-work.md`'s *"⛔ RTBF revokes NO live member session"* (terminated / withdrawn / anonymized are
> blocked at login and refresh; the ≤15-min token residual is that item's subject, still **OPEN** with an
> immediate trigger), and ⛔ it does ⛔ not rule that a session guard may never consult member state.
>
> **Q2 → Option B.** An unrecorded bank name **OMITS ITS ROW**, exactly as `branch` already does —
> ⛔ **never** the decrypt-failed sentinel. ⭐ The ground is that the sentinel made a **false statement**:
> `bank_name` is ⛔ never encrypted, so *"could not be shown"* reported a cryptographic failure where a box
> was simply left empty, with ⛔ no log line to tell the two apart afterwards. ⛔ Option A (new wording in
> both languages) declined — an absent row already says it, without new copy. ⛔ Option C declined on the
> falsity ground.
> ⚠ **Cost:** a CROSS-LAYER change — the contract (`bankName` becomes nullable), the API boundary
> (`.trim() || null`), and the mobile render (the `branch` path). ⛔ `branch` and the three Tier-1
> coordinates' sentinel are **UNCHANGED**.
>
> ⭐ Recorded as **`#decision-2026-09-14-217`**, Trustee-ratified, two clauses.
>
> ⛔ **The body below is kept AS PUT, ⛔ not rewritten** ([[feedback_record_unattested_no_backfill]]).

**Author:** BigDev, Solo Builder — 2026-09-14
**Occasion:** Story 11b.17 (the member's per-drive detail) `bmad-code-review`, **Group B** (the API
boundary) — the second of four chunked review passes. Two findings were triaged as **decisions**, not
patches, because each turns on a member-facing rule nobody has ruled.
**Routed to:** Trustee Panel.
**Status:** ✅ **ANSWERED 2026-09-14** — see the ruling above. ⛔ It blocked nothing shipped; ⭐ Q1 confirms
the shipped reading and Q2 orders a cross-layer change.

> ⭐⛔ **THE ONE THING TO KNOW FIRST.** ⛔ **Neither question is a defect in anything you ruled, and
> ⛔ neither blocks Story 11b.17, which is `done` and shipped.** Q1 asks whether an existing ruling of
> yours — *"a suspended member MUST retain access"* — extends to a surface that **did not exist when you
> made it**. Q2 asks which of two true things a member should be told when a bank's name was never typed
> in. ⚠ Both were **narrowed twice** during review: our first framing of Q1 was **three-quarters wrong**,
> and §2.3 records exactly how, ⛔ rather than quietly shipping the corrected version.

---

## 1. What is being asked, precisely

| # | Question | What is at stake |
|---|---|---|
| **Q1** | A member who has been **SUSPENDED** (a moderation standing, ⛔ not a lifecycle state) retains their session **by your ruling** — they are *"curing"*. Does that retained access include this new surface: one drive's page carrying the nominee's **COMPLETE, UNMASKED account number and IFSC**? | ⛔ Nothing changes today unless the answer is "no". If it is "no", the route needs a moderation-overlay check — and so, by symmetry, may the drive LIST and the PAYMENT screen. |
| **Q2** | When a nominee's bank **NAME** was never recorded (a blank data-entry field, ⛔ not a fault), the member currently reads ***"[unavailable — could not be shown]"*** — the same words shown when **DECRYPTION FAILS**. Should these two situations read differently? | The current text tells a member the system **failed** when it did **not**. Changing it needs either new copy or a contract change. |

---

## 2. Q1 — the suspended member and the banking coordinates

### 2.1 Verbatim — what is ALREADY ruled

`apps/api/src/modules/auth/member/member-auth.handlers.ts:93-97`, recording **D5 requirement 3 / AC7**:

> **SUSPENSION IS DELIBERATELY NOT BLOCKED** — a suspended member **MUST** retain access — they are
> curing, they need the contribution surface, and Story 10.16's disclosure lives there.

⭐ This is deliberate, argued, and we are ⛔ **not** asking you to revisit it. The reasoning is sound:
a member being asked to cure something must be able to reach the surface where curing happens.

### 2.2 What was ⛔ NOT ruled

⚠ That ruling names **the contribution surface** and **Story 10.16's disclosure**. Story 11b.17's
drive-detail page is **NEW** (shipped 2026-09-13) and is the ⛔ **only** surface in the system that hands
a member a bereaved family's **full, unmasked account number and IFSC** — deliberately unmasked, because
*"a masked account# cannot be transferred to"* (`-190` cl.3, as scoped by `-199`).

⇒ ⛔ Nobody has said whether *"retains access"* means **all member surfaces** or **the curing path**.
Today the code answers **"all member surfaces"** — ⛔ by inheritance from a shared session guard, ⛔ not
by a decision.

### 2.3 ⚠⛔ How our OWN first framing of this was WRONG — kept as the record

Our first draft of this finding claimed **five** classes of principal could reach the coordinates:
suspended, terminated, withdrawn, RTBF-anonymized, and mid-signup. ⭐ Checking each against the record
falsified three of them:

- ⛔ **Suspended** — ⛔ not a hole at all; **ruled**, as quoted in §2.1. ⇒ ⭐ the residue is the narrow
  question in §2.2, ⛔ not a defect.
- ⛔ **Terminated / withdrawn / anonymized** — login and refresh **DO** block these. The residual is a
  ≤15-minute access-token window, which is **already an open, owned deferred item**
  (`deferred-work.md`, *"⛔ RTBF revokes NO live member session"*) with an **immediate** re-trigger and a
  **named-successor-story** owner — and whose own text predicted this route: *"every NEW session-only
  member route inherits it."* ⇒ ⛔ **this note does ⛔ NOT re-raise it.**
- ⛔ **Mid-signup** — **unreachable**: a continuation / pariwar-select token fails the guard's
  `typ === 'access'` check.

⭐ We record this because the corrected question is much **narrower** than the alarm we first raised, and
⛔ you should not be asked to rule on a hole that does not exist
([[feedback_record_unattested_no_backfill]], [[feedback_trace_reachability_before_escalating]]).

### 2.4 Reachability

⚠ A suspended member with a live session, opening any drive in their Pariwar. ⛔ Not a rare edge case —
it is the ordinary state of every suspended member for as long as they are suspended.

### 2.5 Options

| | Option | Cost |
|---|---|---|
| **A** | **Ratify the current behaviour.** Suspension does not narrow what a member sees; a suspended member reads the coordinates like any other. | ⛔ No code change. One decision-log entry. ⚠ Consistent with *"they are curing"*, and with the fact that a suspended member may still wish to contribute. |
| **B** | **Suspension withholds the coordinates**, while leaving the rest of the drive page visible. | A moderation-overlay read on this route + a render branch + tests. ⚠ Raises a symmetry question for the drive LIST's nominee name and the PAYMENT screen — ⛔ which we would then have to ask you about too. |
| **C** | **Suspension withholds the whole drive-detail page** (404 or a "your access is limited" state). | Simplest to build; ⚠ but it removes a surface a curing member may need in order to CONTRIBUTE, which cuts against D5 requirement 3's own rationale. |

⭐ **Our steer: Option A**, on the ground that your existing ruling's rationale (*"they are curing … they
need the contribution surface"*) reads as **enabling participation**, and this page is part of
participating. ⚠ But it is a disclosure of a **third party's** banking data — the nominee's, ⛔ not the
suspended member's — which is why we are ⛔ not deciding it ourselves.

---

## 3. Q2 — "could not be shown" vs "was never recorded"

### 3.1 What the member sees today

Each nominee account renders five fields. Three (**holder name**, **account number**, **IFSC**) are
encrypted; two (**bank name**, **branch**) are ordinary plain text.

When an encrypted field cannot be decrypted, the member reads a deliberate, distinct string:
***"[unavailable — could not be shown]"*** — ⭐ ⛔ never a blank, because *"a blank could masquerade as
real data"*. ⭐ That is correct and we are ⛔ not proposing to change it.

⚠⛔ **The problem:** the **bank name** is ⛔ **never encrypted** — there is nothing to decrypt. When an
operator simply left it blank, the member reads **the same "could not be shown" text**, which says the
system failed when it did not. ⛔ And ⛔ no error is logged, so nobody can tell the two apart afterwards
either.

### 3.2 The code already states the correct rule — for the field beside it

`apps/api/src/modules/member-pool/handlers.ts:831-835`, for **branch**:

> `branch` is ⛔ NOT `bankName`'s twin … a `null` is an **ORDINARY ABSENT OPTIONAL**, ⛔ not a fault and
> ⛔ not a decrypt failure. ⭐ The surface **OMITS THE ROW**; **a sentinel here would report a failure
> that did not happen.**

⭐ And the shared constant's own definition scopes itself to encrypted fields — *"the DISTINCT sentinel a
**Tier-1 decrypt failure** renders on any of `NomineeBankAccountView`'s **decrypted** fields"* — while
the same file calls `bankName` *"the Tier-3 plaintext label (**no decrypt**)"*.

⇒ ⭐ by the project's own written rule, the bank-name behaviour is **inconsistent**. ⚠ What it should be
instead is a **member-facing wording choice**, which is yours.

### 3.3 Why we are ⛔ not just fixing it

The obvious fix — *"omit it, like branch"* — is **foreclosed**: the response contract types `bankName` as
a required, non-empty string. ⇒ every remedy changes something member-visible or contractual:

| | Option | Cost |
|---|---|---|
| **A** | **New wording for "never recorded"** — e.g. *"Bank name not recorded"* — distinct from the decrypt-failure text. | New copy in **both languages**, a new shared constant, tests. ⭐ Most accurate to the member. |
| **B** | **Omit the bank-name row entirely** when it was never recorded, exactly as `branch` already does. | A contract change (`bankName` becomes nullable) + client handling. ⭐ Most consistent with the rule already written for `branch`. |
| **C** | **Ratify the current behaviour** — one "unavailable" wording covers both causes, on the ground that the member's practical situation is identical (they cannot see a bank name). | ⛔ No code change; ⭐ we would then narrow the `branch` comment's claim so the two stop contradicting. ⚠ Leaves a data-entry gap indistinguishable from a system fault in the logs as well as the UI. |

⭐ **Our steer: Option B**, because the rule it follows is already written in this codebase for the
neighbouring field, and it needs ⛔ no new words in two languages. ⚠ Option A is better for the member if
you would rather they were told *why* the name is missing.

### 3.4 Reachability

⚠ `bank_name` is a `NOT NULL` column with ⛔ **no non-empty constraint**, so an empty string is
**storable today**. ⛔ We have not observed one in production; it depends on how the claim intake is
completed. ⭐ It is a data-quality question, ⛔ not a rare crash.

---

## 4. What is blocked

**Nothing.** Story 11b.17 is `done`. ⛔ Neither question gates it, and ⛔ neither changes what is shipped
unless you choose an option that does. ⚠ Q1 is raised now rather than later because **11b.20** (the
public render) and any future surface reusing this session guard inherit the same unruled meaning.

---

## 5. Commands to re-verify every claim

```
sed -n '93,97p'   apps/api/src/modules/auth/member/member-auth.handlers.ts   # Q1 — suspension is ruled
sed -n '25,45p'   apps/api/src/modules/auth/shared/member-session-guard.ts   # Q1 — no state check
grep -n "RTBF revokes NO live member session" -A 20 _bmad-output/implementation-artifacts/deferred-work.md
sed -n '827,836p' apps/api/src/modules/member-pool/handlers.ts               # Q2 — bankName vs branch
sed -n '38,50p'   packages/contracts/src/contributions/nominee-accounts.ts   # Q2 — the sentinel's scope
```

---

## Appendix A — the same two questions, in plain English

*This appendix says nothing new. If anything here seems to differ from the sections above, the sections
above are the exact record.*

### Q1 — the member who is "on notice"

When a member breaks a rule, they can be **suspended**. You have already decided that a suspended member
keeps using the app — they are putting things right, and they need to be able to do that.

Separately, we have just built a new screen: open one fundraising drive, and it shows the grieving
family's **full bank account number** so you can transfer money to them. It is shown in full on purpose —
you cannot transfer money to a partly-hidden account number.

**The question:** should a suspended member see that bank account number?

Right now they do, simply because they are still logged in — ⛔ nobody decided it, it just follows from
their session still working. It may well be the right answer: a suspended member may still want to
contribute. But it is somebody **else's** bank details — the bereaved family's — so we would rather you
decided it than have it happen by default.

- **Option A — yes, they see it** (what happens today; nothing changes).
- **Option B — no, hide just the bank details** from a suspended member, leave the rest of the page.
- **Option C — hide the whole page** from a suspended member.

*Our steer: Option A — your reason for letting them stay was so they can take part, and contributing is
taking part.*

### Q2 — two different problems, one confusing message

On that same screen, each bank account shows five things. Three are stored **scrambled** for safety and
unscrambled when shown. Two — the **bank's name** and the **branch** — are stored as ordinary text.

If something goes wrong unscrambling a protected field, the member sees: **"[unavailable — could not be
shown]"**. That is deliberate and sensible.

**The problem:** the bank's **name** is not scrambled at all. So if whoever entered the family's details
simply **left the bank name blank**, the member sees that same *"could not be shown"* message — which
tells them something broke, when really a box was just left empty. Nothing is written down anywhere to
tell the two apart, so even we cannot tell afterwards which happened.

We would fix it ourselves, but every fix changes something you may care about — either new wording, or
leaving the line out altogether.

- **Option A — different wording**, e.g. *"Bank name not recorded"*, so the member knows it was never
  filled in rather than broken. (Needs new text in English and Hindi.)
- **Option B — just leave that line out**, exactly as we already do for the branch when it is missing.
- **Option C — leave it as is** — one message for both, since either way the member cannot see a bank
  name.

*Our steer: Option B — it matches what we already do for the branch on the very same card, and it needs
no new words in two languages.*

---

*Prepared by the 2026-09-14 Group-B code review of Story 11b.17. This note is an addition to the record,
⛔ not a correction of it.*
