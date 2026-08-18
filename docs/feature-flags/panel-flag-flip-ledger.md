# Panel-Owned Flag Flip Ledger

**Authority:** Decision `2026-08-09-093` (flip mechanics) · `2026-08-09-094` (all-Pariwars = `full`) ·
`2026-08-17-127` cl. 6 (the `termination_access_block` authorisation) · `2026-08-18-128` (the ladder,
ruled generally) · `2026-08-18-130` cl. 1/4/5 (production only; rehearsal required; rehearsal cohort
bounded) · `2026-08-18-131` (attestation).
**Status:** Live ledger. **Empty at authoring — no Panel-owned flag has ever been flipped.**

This ledger is the **sole durable record of Panel-owned flag flips and rehearsals**, on the
`docs/escrow/escrow-ledger.md` / `docs/degradation-policy/degradation-policy-ledger.md` precedent.

## ⭐ Why this ledger exists — the asymmetry it closes

A **production rung** is self-recording: the flip route writes an immutable `feature_flag_versions` row
**and** a §1.5 audit line, in the production database, under the compensating-audit discipline
(`apps/api/src/modules/feature-flags/handlers.ts`).

A **staging rehearsal is not.** It writes its version and audit line into a **staging** database — an
environment that is disposable, re-seedable, and is nobody's governance record. Decision
`2026-08-18-130` clause 4 requires the rehearsal be *"recorded as a rehearsal"*; **without this file
there is nowhere for that record to live**, and the commitment would survive only as a sentence in a
decision entry ([[feedback_mechanization_split_commitment]] — *decay concentrates in the un-mechanized
half*).

## ⛔ THE INVARIANT THIS FILE MECHANIZES

> **A rehearsal is recorded as a rehearsal and NEVER as a rung.**
> — Decision `2026-08-18-130` clause 4

⚠ That sentence is a **property of the record**, not an instruction to be remembered. The schema below
makes it structural:

| Rule | Enforcement |
|---|---|
| A `rehearsal` row's **`rung` cell is `—`** | ⛔ A number in that cell on a `rehearsal` row makes the row **invalid**, not merely wrong |
| A `rehearsal` row's **`discharges` cell is `nothing`** | ⛔ No exception. A rehearsal discharges nothing, ever |
| A `rehearsal` row's **`environment` is `staging`** | ⛔ Per `130` cl. 1, the ruled walk is production-only; a production row is a rung by definition |
| A `rung` row's **`environment` is `production`** | ⛔ Same clause, from the other side |

⭐ **The discharge predicate for register row (vii)**, stated so it is checkable rather than recalled:

> Row **(vii)** of the standing-obligation register discharges **if and only if** this ledger contains a
> row with `kind = rung` **and** `rung = 3` **and** `state = full` **and** `environment = production`.

⛔ **No rehearsal row can ever satisfy that predicate**, because `kind = rehearsal` fails the first
conjunct. That is the whole point of the `kind` column.

## The ruled walk, for reference

⛔ Reproduced, **not re-decided**. Authority is `2026-08-18-128` clause 2 + `2026-08-18-130` clause 1.

| Rung | State | Cohort (`dimension: pariwar_id`, `op: in`) | Environment |
|---|---|---|---|
| 1 | `canary` | Shikshak Pariwar | production |
| 2 | `rollout` | Shikshak Pariwar, Rail Pariwar, Banker Pariwar | production |
| 3 | `full` | ⛔ none — `full` ignores the cohort entirely | production |

**Write path:** the **global** route — `POST /api/v1/global/feature-flags/:flagKey/versions`, writing
`pariwar_id: null` with the cohort clauses above (`130` cl. 2). ⛔ **Not per-Pariwar overrides.**

## ⚠ The rehearsal cohort is NOT the walk's cohort

Per `2026-08-18-130` clause 5, the staging rehearsal's cohort is **open and unnamed**, and:

- ⛔ It does **NOT** default to the names above. Pariwars are **per-environment rows**; Shikshak / Rail /
  Banker may not exist in staging, may exist under different ids, or may not exist at all. The
  repository seeds **no** Pariwars (`packages/domain/seed/{dev,staging}` hold only READMEs).
- ⛔ It is resolved against **staging's actual Pariwars** at rehearsal time, and the resolved ids are
  recorded in the row below.
- ⛔ **`2026-08-18-128` clause 6's stop-condition governs the rehearsal too:** a name that does not
  resolve to **exactly one** live Pariwar **STOPS** the rehearsal. It is ⛔ never closed by picking the
  nearest match.

---

## Ledger

_Empty. No Panel-owned flag has ever been flipped, in any environment._

**Schema** (one row per publish — rehearsal or rung):

| Date | `kind` | `rung` | Flag | Target state | Environment | Cohort names | Resolved `pariwar_id`s | Publisher | Authority | `discharges` | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|

**Column discipline (READ before adding a row):**

- **`kind`** — exactly `rehearsal` or `rung`. ⛔ No third value. ⛔ Never blank.
- **`rung`** — `1`, `2` or `3` for `kind = rung`; **`—` for `kind = rehearsal`**, always.
- **Environment** — `staging` for a rehearsal, `production` for a rung. ⛔ Never both, never blank.
- **Cohort names** — the names as ruled (rung) or as resolved against staging (rehearsal). ⛔ For
  `state = full`, write `—`: `full` ignores the cohort and writing one invites a later reader to think
  it narrowed something.
- **Resolved `pariwar_id`s** — the UUIDs each name resolved to, per `128` cl. 6. ⛔ Mandatory whenever
  a cohort is present. ⛔ If a name failed to resolve, **no row is written** — the walk stopped; record
  the stop in Notes on its own row with `kind` matching the attempt and `discharges: nothing`.
- **Publisher** — the `super_admin` identity that executed the publish (`130` cl. 3 accepted
  `super_admin`-only as sufficient; the identity is therefore the whole human record of the act).
- **Authority** — the decision entry authorising this publish.
- **`discharges`** — `nothing` for every rehearsal, always. For a rung: `nothing` for rungs 1 and 2;
  **register row (vii)** for rung 3 only.

**Append-only.** ⛔ Rows are never edited or deleted. A correction is a **new row** referencing the
prior one in Notes, on the decision-log precedent (*"once ratified, never edited in place"*).

---

## ⛔ The failure this ledger exists to prevent

A rehearsal executed in staging, going well, and later being cited — in good faith, months on — as
evidence that "rung 1 has been done." Register row (vii) would then appear discharged by an act that
**touched no member**, in an environment where the ruled cohort may not even exist.

⚠ The defence is **not** vigilance. It is that a rehearsal row **cannot** carry a rung number, **cannot**
carry `production`, and **cannot** carry a `discharges` value other than `nothing` — so the claim has
nowhere to be written down truthfully, and a false claim is visible on its face.
