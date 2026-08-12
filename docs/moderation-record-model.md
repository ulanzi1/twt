# The moderation record model

**Story 10.20 · Decision `2026-08-12-099` · Niyamavali §8.5 / §8.6 / §8.9**

> **Why this file exists.** The constitutional half of the moderation record lives in
> `docs/legal/niyamavali.md`, which is **gitignored** — it has no diff and no blame. `docs/` is
> tracked. This is therefore the record model's one *diffable* home, and the tracked companion to an
> untracked instrument. SCP §4f promised it; nobody owned it; Story 10.20 created it.
>
> ⛔ **This file describes. It does not govern.** Where it and the Niyamavali differ, the Niyamavali
> governs and this file is wrong. Where it and the code differ, read both as evidence and fix the
> one that is lying.

---

## The constitutional frame

> **Termination is an exceptional governance act, not a stronger suspension.**
> — Niyamavali §8.6, opening sentence; PRD FR-56

Every rule below is subordinate to that sentence. A moderation record exists so that a decision can
be **reconstructed**, **tested against the principles**, and **enriched without being rewritten**.

---

## 1. The three separable parts

Before this model a moderation action carried **one** structured `reason_code` and **one** free-text
`rationale_ciphertext`. That single field was asked to answer three different questions at once —
*what happened*, *why this sanction*, and *how can the case be reconstructed* — and it answered none
of them testably.

| Part | Form | Required | Where it lives |
|---|---|---|---|
| **(1) Reason code(s)** | Structured registry vocabulary — **exactly one primary**, any number of supporting | Always | `member_moderation_actions.reason_code` (primary) + `member_moderation_grounds` |
| **(2) Decision Note** | Prose, governance-grade, Tier-1 encrypted | Always, every action | `member_moderation_actions.decision_note_ciphertext` |
| **(3) Evidence** | **References only, never free text** | Optional | `evidence_refs` JSONB, on the action **and** on each ground |

A termination carries three further fields:

| Field | Answers | Required |
|---|---|---|
| `escalation_inadequacy_ciphertext` | **(a)** why *suspension* is inadequate | On `terminate`, always |
| `escalation_proportionality_ciphertext` | **(b)** why *termination* is proportionate | On `terminate`, always |
| `immediate_termination_reason_ciphertext` | **why NOW** — the exception to the dwell | Only when the exception is invoked |

⛔ **The exception reason is not a third part of the escalation test.** (a) and (b) answer *why
termination*; it answers *why now*. Collapsing them makes both unfalsifiable.

---

## 2. What is enforced, and by which layer

The record's **shape** is the enforcement. The route guard and the UI guard are the second and third
layers, not the first.

| Rule | DB | Domain | Route | UI |
|---|---|---|---|---|
| Both escalation parts present iff `terminate` | ✅ `escalation_iff_terminate` CHECK | ✅ backstop | ✅ typed 422 | ✅ |
| Part (a) is not a restatement of (b) | ⛔ **impossible** | — | ✅ typed 422 | ✅ |
| Each part meets a substance floor | ⛔ | — | ✅ typed 422 | ✅ |
| Evidence is an array, within a cap | ✅ two inline CHECKs | ✅ | ✅ | ✅ |
| Each evidence entry is `{kind, ref}` with a bounded kind and an identifier-only ref | ✅ `moderation_evidence_refs_valid()` | ✅ | ✅ | ✅ |
| At most one primary ground per action | ✅ partial unique index | — | ✅ typed 409 | — |
| Grounds are never `UPDATE`d or `DELETE`d | ✅ GRANT posture | — | — | — |
| A dwell separates suspension from ordinary termination | ⛔ | ✅ in the caller, in-tx | ✅ typed 409 | ✅ re-confirmation |

### ⛔ Why the anti-restatement rule can never be a database constraint

`encryptModerationRationale` is a **non-deterministic** Tier-1 envelope encrypt. Two byte-identical
plaintexts produce two different ciphertexts, so `CHECK (a <> b)` is satisfied by exactly the case it
would exist to catch. The comparison has one legitimate home: the **plaintext, in the route, before
encryption** — which is also where it is cheapest, since a doomed request never spends a KMS
round-trip.

### ⭐ Why evidence references are not Tier-1

A reference is an *identifier*, not prose about a member. That is true **structurally**, not by
convention: the `kind` is a bounded enum, and the `ref` charset **excludes whitespace**, which is the
single exclusion that makes a sentence unrepresentable. This is why `evidence_refs` is safe in a list
DTO and safe to keep out of the RTBF scrub.

> ⛔ **If the shape enforcement is ever weakened, the column's PII classification must be revisited
> in the same change** — not afterwards.

### ⚠ What the database backstops, stated exactly

Array-ness and a cardinality cap alone do **not** stop a raw-SQL writer:
`[{"kind":"anything","ref":"<a full sentence of prose>"}]` satisfies both. The **per-entry shape
check** is the half that closes it, and it rides an `IMMUTABLE` SQL function because an inline
subquery or set-returning function inside a `CHECK` is a hard Postgres error, not a style preference.

---

## 3. Grounds attach; they never rewrite

`member_moderation_grounds` is **append-only**. A later finding *attaches* to the original decision —
which is what keeps "what was known **when** the decision was made" recoverable.

- **The primary ground never moves at all.** A partial unique index on `(moderation_action_id) WHERE
  is_primary` plus a `SELECT, INSERT`-only grant make it structurally immutable: a second primary
  raises `23505`, and clearing the existing flag would be an `UPDATE` no grant permits. So the epic's
  *"added, superseded, or corrected"* is satisfied **for supporting grounds**; for the primary the
  answer is that it is fixed at the action.
- **The index is the backstop; the typed 409 is the interface.** A `23505` reaching a caller as a 500
  is a bug — *"the primary ground is fixed at the action"* is a fact a trustee must be able to read
  off the error.
- **Superseded rows are retained and flagged, never filtered.** An audit trail that hides what it
  replaced is not an audit trail, and on a contested member the superseded ground is often precisely
  the one under dispute.
- **`member_id` is denormalized onto the table deliberately** — the RTBF scrub has a member id and
  nothing else, and every scrub in `anonymize.ts` keys on `<table>.memberId`. It is not a second
  source of truth: same transaction, same value, both rows append-only.

---

## 4. The operational / governance vocabulary split

Recorded at the point of use, because the two are easy to conflate:

| Act | Kind | Built here? |
|---|---|---|
| Appending a ground to an existing action | **Operational** | ✅ Yes |
| Superseding a supporting ground | **Operational** | ✅ Yes |
| Creating a **new reason code** | **Governance** — Part 11 amendment → registry version → trustee approval → audit → publication | ⛔ **Never, at runtime** |
| Retiring a reason code | **Governance** | ⛔ Not built |

The registry is **code-level and frozen**. There is no per-tenant reason-code table: one would let a
tenant invent its own grounds for terminating a member.

### `ordinarilyResultsIn` is guidance, not policy

`epics.md` forbids narrowing `appliesTo`; `prd.md` requires that grounds for termination and grounds
for suspension "are not interchangeable". **Both hold, at different layers:**

- the **enumeration** is governance text — Niyamavali §8.5;
- the **registry** stays permissive and carries `ordinarilyResultsIn` as ratified guidance;
- the **Trustee Panel**, not the registry, determines the sanction (§8.6 principle 2).

All seven moderation grounds carry `'suspend'`; all three restore grounds carry `null` — *a code that
justifies no sanction carries no sanction guidance*. The UI renders it as text where non-null and
renders **nothing** where null: not "n/a", not an empty chip.

⛔ A change that "satisfies FR-56" by narrowing `MODERATION_APPLIES_TO` has violated the epic AC and
pre-empted the Panel.

---

## 5. The dwell, and the exception the Panel kept

**Seven days**, resolved from the versioned registry clause `niy.moderation.dwell`, with the resolved
`clause_version_id` pinned onto every termination so a historical decision stays readable against the
policy that governed it.

- ⛔ **`7` is hard-coded nowhere in the service.** An unprovisioned registry **refuses** the ordinary
  path with a named 503 rather than falling back — a sanction under a convention no Pariwar ratified
  is an unratified sanction imposed by a machine.
- ⭐ **The dwell governs the ORDINARY path only.** §8.6 principles 5 and 6 say termination *normally*
  follows suspension and notice *normally* precedes it — both carry an express exception. An absolute
  gate would contradict the principles it exists to mechanize.
- **Immediate termination remains available** where the authorised actor records the reason. That
  reason is a first-class field, and it is `NULL` on the ordinary path and non-`NULL` exactly when the
  exception was invoked — which makes *"how often is the exception used?"* answerable.
- ⛔ **Invoking the exception does not forfeit any future right of appeal.**
- ⛔ **`legal_actions` is not filtered by the dwell.** Legality and precondition are different facts;
  collapsing them would make a pure reducer's output depend on a clock. `termination_available_at` is
  a separate, additive field.

---

## 6. Restoration is prospective

Restoration restores membership **from the restoration point forward**. It does **not** erase the
terminated period: no retroactive contribution credit, missed obligations are not treated as
fulfilled, R7 continues to determine resulting standing, and renewal / lapse / rejoin rules evaluate
on the member's **actual state and dates**.

⛔ **No special "restored terminated member" state exists, and none may be created** — a state that
bypasses R7 or any ordinary membership rule is expressly forbidden. **Restoration is not amnesty.**

---

## 7. The future extraction point — named, not taken

The shape here (primary ground · supporting grounds · findings · proportionality · evidence) would
serve **trustee removals**, **volunteer discipline** or **vendor blacklisting** unchanged. The
`member_moderation_grounds` columns are deliberately **subject-agnostic**: `code`, `is_primary`,
`note`, `evidence_refs` name no member concept.

**It is not extracted, because one consumer exists.** A generic version needs a polymorphic subject,
and `member_moderation_actions` carries a member FK plus member-scoped RLS.

> **Re-trigger:** extract when a **second discipline surface is actually being built** — not before.

---

## 8. What this model does NOT close

| # | Not closed | Owner |
|---|---|---|
| 1 | **§8.8 — the moderation appeal.** §8.6's *Recorded gap* clause states the gap; it does not close it | Story 10.22 |
| 2 | **The richer opportunity-to-respond.** Elapsed dwell satisfies v1 by ruling; no response or waiver record exists, because a response has nowhere to arrive | Story 10.22 |
| 3 | **`VALIDATE CONSTRAINT` on `escalation_iff_terminate`** — it ships `NOT VALID`, so rows written before migration `0099` are grandfathered unvalidated. Forward enforcement is complete (the table is append-only) | A governance act dispositioning the legacy rows |
| 4 | **The generic discipline-record primitive** — §7 above | A second discipline surface |
| 5 | **The rejoin-model governance drift** — four texts and one live code path still state a flat "12 months from termination" model that Decision `2026-08-12-099` (Q7.2) supersedes | A Part 11 amendment, its own routing note and ruling |
| 6 | **The supporting-ground picker on the terminate form.** The append API is built and tested; the console affordance for it is not | A follow-up surface story |
| 7 | **Counsel review of §8.5 / §8.6 / §8.9** | Standing Trustee Panel obligation queue |

⛔ **No `termination_access_block` flag change was made here**, and nothing in this model asserts that
Part 8 is legally settled. The Niyamavali remains an **unadopted draft** and **counsel is not
engaged**.
