---
baseline_commit: 6bd01ec2cfab641500b437d1235e79c1dc6e2655
---

# Story 10.28: Multi-Node Report Scope `[PRIMITIVE]`

Status: done

> ⚠ **WHY THIS STORY SITS IN A RETROSPECTED EPIC.** `epic-10-retrospective` is `optional`. The placement is
> deliberate and is **not** to be "corrected" into whichever epic happens to be open: this story extends
> **Story 10.7's `ResolvedReportScope`**, and the project's rule is that *a successor belongs to the epic that
> owns the model it extends, at that epic's next free sequential number* — the same deliberate act that placed
> Story 1.18 in Epic 1, Story 1.19 beside it, and Story 6.17 in Epic 6. **Minted by Story 1.18 Task 1
> (Decision `2026-08-12-102`), governance-first.** Do not flip `epic-10-retrospective`.
>
> ⭐ **THE PERMANENT OWNER.** Its existence was ruled **unconditional** — *not* contingent on Story 1.18's
> implementation. Story 1.18 could have absorbed this cheaply once the ancestry work was in hand and
> **deliberately did not**, because a permanent owner born already-discharged is a contradiction (1.18 AC6;
> D6's *"unless it falls out cheaply"* branch **CLOSED**).
>
> **Depends on:** Story 10.7 (`done`) — the model. **Reads:** Story 1.18 (`done`, merged `9fa4e31`) — the
> ancestry resolver, which is **orthogonal**, not a prerequisite. **Third generation** of the Epic-3 geo
> deferral: Epic 3 → Story 1.18 → {1.19 ✅, 6.17 ✅, **10.28**}. This is the last of the three.

## Story

As a district administrator holding a report key at more than one district,
I want report scope to carry every node I hold,
so that an export covers all of them, instead of silently returning one district and no signal that the rest
were dropped.

---

## 🎯 The gap, stated exactly

An actor holding `member.export_roster` at **`{district,'Patna'}` AND `{district,'Gaya'}`** (two
`district_admin` grants, both legitimate, both within the `district` ceiling) resolves to **one** of them:

```
reports/scope.ts:86   if (best === null || broadnessRank(candidate.dimension) < broadnessRank(best.dimension))
                      strict `<`  ⇒  the SECOND same-dimension grant never displaces the first
                      ⇒  best = whichever grant the `grants` array happened to iterate first
```

`ResolvedReportScope` is `{ dimension, value: string | null }` — **single-valued** (`reports/types.ts:54-57`).
`resolveDistrictNarrowing` therefore returns `{ kind: 'district', district: <one> }`
(`templates/_shared.ts:68-71`), and both district-narrowable templates emit
`AND cp.district = ${narrowing.district}` — **one** district.

⛔ **The failure this story exists to remove is SILENT.** No error. No warning. No partial-export signal. The
Gaya members are simply absent from a CSV the administrator will treat as complete. That is why **AC3 demands
a test that proves PRESENCE**, not absence of error.

> ⚠ **LINE ANCHORS DRIFT, AND THE MINTED AC TEXT IS NOT EDITED TO CHASE THEM.** The five ACs cite
> `reports/scope.ts:73`, `_shared.ts` and `reports.spec.ts:124`; the deferred-work marker cites
> `scope.ts:67` and `scope.ts:71`. All were written at older heads. **Every anchor in THIS file is re-derived
> at `6bd01ec`.** ⛔ Do not "fix" a line number inside minted AC text ([[feedback_supersede_never_reinterpret]];
> the Story 1.19 Escalation 3 / Story 6.17 precedent).

### ⛔ AC4's `reports.spec.ts:124` is AMBIGUOUS — and the obvious reading is the WRONG FILE

There are **two** `reports.spec.ts` in this repo:

| Path | Line 124 today | Is it the pin? |
|---|---|---|
| `apps/api/tests/integration/reports/reports.spec.ts` | `payload: { report_type: 'audit_log_query', … }` inside an **auditor 200** test | ⛔ **NO.** Unrelated. |
| `packages/domain/tests/integration/reports/reports.spec.ts` | inside the comment block `:125-146` | ✅ **YES** — the pin is the `it(...)` at **`:147`**. |

This is the [[project_story_validate_footguns]] misattribution class (sibling modules, same basename).
**AC4 means the DOMAIN spec.** Touching the `apps/api` one at `:124` would silently satisfy nothing.

---

## ⛔ THE FOUR TRAPS — read these before anything else

Each is the *obvious* reading of an AC, and each breaks the system in a different direction.

| # | ⛔ Do NOT | ✅ The rule that holds instead |
|---|---|---|
| 1 | **Do not let an EMPTY value set fall through to the un-narrowed query.** | **Empty ⇒ `deny`, never `all`.** `WHERE district IN ()` is a Postgres syntax error, so the tempting "fix" is to skip the predicate — which emits the **full tenant** to an actor entitled to zero districts. That is a privilege escalation with a `.length === 0` on it. **D5.** |
| 2 | **Do not authorize on ANY node.** | `assembleReport` must pass `checkPermission` for **EVERY** node in the set (AND, not OR). All of them come from qualifying grants today, so ALL passes by construction — which is exactly why requiring ALL is free, and why it fails closed if that construction ever drifts. **D2.** |
| 3 | **Do not expand `state` → its descendant districts as a side-effect of "making it multi-valued".** | Cardinality and ancestry are **orthogonal**, again. Building the expansion needs an enumeration API `geo-tree` does not have, and **no real role can reach the branch.** **D3** rules it. |
| 4 | **Do not de-duplicate by "it can't happen".** | Two grants at the SAME node are reachable **today** (two roles, one district). The de-dup contract is AC5's, it is testable without any ancestry work, and a `Set` is the whole implementation. **D7.** |

⭐ **Why trap 1 is the dangerous one.** It arrives as a runtime SQL error in a test, and the smallest edit that
makes the error go away is to drop the predicate. It converts a fail-closed deny into a full-tenant export
without touching a single line that mentions authorization. **Pin the deny with a test so nobody "fixes" it
later** — the **D5 polarity pair** (Task 7), both halves mandatory.

---

## ⛔ SCOPE BOUNDARY — what this story is NOT

| Not this story | Why | Owner |
|---|---|---|
| Changing `GEO_RANK` / `CEILING_RANK` / `scopeContains` / the `GeoTreeResolver` interface | **Architectural freeze row 9** (`epics.md:526`). | ADR + a different story |
| Granting any key to any role, or minting a permission key | No AC asks for one. `PERMISSION_CATALOG_VERSION` does **not** move; `keys` count does **not** move. | — |
| Building / editing / seeding a **geo tree** | Story 1.18 shipped registry + resolver and deliberately **no writer surface**. | a future publishing surface |
| A `state`-actor district **enumeration** API on `geo-tree` | **D3.** `GeoTreeResolver` is `contains`-only **by interface**; `LoadedGeoTree.parents` is child→parent only. | see D3 — no successor |
| Any **schema** change | ⛔ **No migration.** `report_exports` carries **no resolved-scope column** by design (10.7) and gains none. | settled |
| Any **contracts** change | Scope never crosses the wire. `contracts/src/reports/reports.ts` mentions scope only in a comment. ⛔ Never import `@twt/domain`'s pg-touching namespaces into `@twt/contracts` ([[project_contracts_domain_bundle_boundary]]). | settled |
| Any **admin UI** change | `apps/admin/src/modules/reports/ReportsPage.tsx` has no scope affordance — a report-type select and a format select. Nothing to widen. | settled |
| A partial-export **warning banner / signal field** | AC3's requirement is that the silent case becomes **impossible**, not that it becomes *announced*. Adding a signal field is a contract change nobody asked for. | not minted |
| Wiring `contribution_rate_by_district`'s real numerator, or its lifecycle-state denominator filter | Pre-existing, recorded (`deferred-work.md:3442`, `:3447`). | Epic 8/9 follow-up |
| Re-opening the 10.7 idempotency digest | `paramsDigest` hashes `params` only; the idempotency key is already **actor-scoped** (`findActiveReportExport(tx, actorId, …)`), and build-time re-resolution handles a scope change. Nothing to do. | settled — see **Escalation 4** |

---

## Acceptance Criteria

> ⛔ **The five ACs below are MINTED TEXT (`epics.md:4197-4211`) and are NOT edited**
> ([[feedback_supersede_never_reinterpret]]). Where implementation refines, over- or under-specifies one, the
> **disposition is recorded beside it** — the Story 1.19 AC4 / Story 6.17 precedent — never by rewriting the AC.

### AC1 — `ResolvedReportScope` carries **multiple** same-dimension values

`ResolvedReportScope` carries **multiple** same-dimension values; `resolveActorReportScope` returns every
grant at the broadest dimension instead of the strict-`<` tie-break winner (`reports/scope.ts:73`).

> 📍 **Anchor re-derived at `6bd01ec`:** the tie-break is `reports/scope.ts:86`; the `v1 LIMITATION` comment
> this AC removes is `:75-85`; the type is `reports/types.ts:54-57`.
> ✅ **Shape ruled by D1.** ⛔ The broadest-dimension selection itself does **not** change — a `pariwar` grant
> still beats a `district` grant. What changes is that ties at the winning dimension **accumulate** instead of
> being discarded.

### AC2 — the templates narrow `WHERE district IN (...)`

Report templates narrow `WHERE district IN (...)` — `member-roster` and `contribution-rate-by-district`.

> 📍 `templates/member-roster.ts:53-56` and `templates/contribution-rate-by-district.ts:52-55` — the two
> `scopeFilter` ternaries. Both call the shared `resolveDistrictNarrowing`; the change is in `_shared.ts` and
> lands at both sites (**D5**).
> ⚠ **`contribution_rate_by_district`'s district branch is DEAD for any real holder** and this story does not
> change that — see **Escalation 1**. It is edited for **shape consistency**, and its unreachability is
> recorded openly rather than papered over by inventing a grant.

### AC3 — a silent single-district export is **impossible**

**A silent single-district export is impossible**: a two-grant test asserts both districts appear. The
failure this story exists to remove is *silent*, so the test must prove presence, not absence of error.

> ⭐ **This AC is the story.** The fixture already exists: `seedTwoDistricts` seeds **Patna** (a1, a2), **Gaya**
> (a3) and a cross-tenant Patna member (b1) — `packages/domain/tests/integration/reports/reports.spec.ts:57-70`.
> **Assert `ids.has(a1) && ids.has(a2) && ids.has(a3)` and `!ids.has(b1)`** — presence of both districts,
> absence of the other tenant. ⛔ A `rows.length > 0` assertion does **not** satisfy this AC; the old behaviour
> also returned rows.
> ⛔ **Membership, never counts** — the shared dev DB accumulates committed rows ([[project_live_db_test_gotchas]]).
> ✅ **Revert-sanity is mandatory** (Task 7): the test must be shown to go RED against the single-valued
> behaviour, or it proves nothing ([[feedback_gate_scope_semantic_coverage]]).

### AC4 — `_shared.ts`'s narrowing modes extended; the deny-deeper pin re-pinned as a **query** pin

`_shared.ts`'s narrowing modes are extended, and `reports.spec.ts:124` is re-pinned as a **query**
deny-deeper pin (it is not an RBAC pin — `checkPermission` already allows there).

> 📍 **`reports.spec.ts` here means `packages/domain/tests/integration/reports/reports.spec.ts`** — see the
> ambiguity table above. The pin is the `it(...)` at **`:147`**; its comment block is `:125-146`.
> ⭐ **HALF OF THIS AC WAS ALREADY DISCHARGED BY STORY 1.18, AND SAYING SO IS THE HONEST REPORT.** 1.18's AC6
> performed the RBAC-vs-query reclassification in full and asserted it falsifiably (the with-resolver
> companion at `:183-201` re-runs the same assembly with a real Bihar tree and still gets zero rows). What
> **remains** for 10.28 is narrow and real: the comment's stated reason — *"`DistrictNarrowing` and
> `ResolvedReportScope` are SINGLE-VALUED"* — **expires the moment AC1 lands**, and a stale reason left in
> place is precisely the failure this chain has now repeated three times. **Rewrite the reason; do not touch
> the assertion.**
> ⚠ Under **D3**'s ruling the assertion `expect(result.rows).toHaveLength(0)` is **UNCHANGED**. The AC's own
> verb — *"re-pinned **as a query deny-deeper pin**"* — presupposes the pin remains a deny pin. That is
> evidence for D3, not a coincidence.

### AC5 — composition with Story 1.18's ancestry is **stated**

**Composition with Story 1.18's ancestry is stated**: a state grant reaches districts beneath it, and
multi-node + ancestry must not double-count a district reachable by both paths.

> ✅ **Delivered in two halves, and the halves are NOT equal.**
> **(a) The de-duplication contract — BUILT AND PINNED.** Reachable today without any ancestry work: two
> grants at the **same** district (two roles, one node) must produce **one** entry in the `IN` list. **D7.**
> **(b) The state→descendants arm — `deny`, "Closed by [edit]", NO successor. D3.** The evidence, not a
> preference: **no role in `roles.ts` holds a district-narrowable report key at a `state` ceiling.**
> `state_trustee` (`roles.ts:361-369`, ceiling `state`) holds `member.view_validity` but **not**
> `member.export_roster`; `member.export_roster` is held only by `pariwar_admin` (`:341`, ceiling `pariwar`)
> and `district_admin` (`:401`, ceiling `district`); `reconciliation.review` is pariwar-ceiling only. The
> branch has **zero live consumers, zero backlog consumers and no FR** — the exact evidentiary shape on which
> Story 1.18's D4-R closed `self` **by edit with no successor**, rather than manufacturing an un-gated
> re-commitment ([[feedback_record_unattested_no_backfill]]).
> ⛔ The composition RULE is still **stated in code** (D3), so that whichever future story first grants a
> district-narrowable key to a state-ceiling role finds the de-dup contract already built and tested.

---

## 🚨 Decisions — ✅ **ALL SEVEN RULED BY BIGDEV, 2026-08-13. Nothing here is open.**

> ✅ **RULING (BigDev, 2026-08-13):** *"D1-D7 ruled as recommended."* Every recommendation below is therefore a
> **ruling**, including each sub-ruling (D1(i)–(iv)) and every ⛔ prohibition stated inside it. Recorded here
> **before** implementation ([[feedback_governance_commits_precede_implementation]]); the `governance:` commit
> carrying Decision `2026-08-13-105` still lands **first**, with zero `packages/`/`apps/` files.
>
> ⛔ **"As recommended" is not licence to re-derive.** Where a decision names an arm, that arm is now the rule
> and the rejected arm is **closed** — not a fallback to reach for when the ruled arm turns out to be more work.

### D1 — ✅ **RULED: arm A.** The multi-value shape on `ResolvedReportScope`

**Arm A, with sub-rulings (i)–(iv) all ruled as stated.** Replace `value` with `values`:

```ts
export interface ResolvedReportScope {
  readonly dimension: ScopeDimension;
  /** EVERY node the actor holds this key at, at `dimension` — deduped, sorted, stable.
   *  EMPTY iff `dimension === 'global'` (the one dimension whose canonical target value is
   *  null — `rbac/scope.ts:236`). A NON-global dimension with an empty set is UNREACHABLE:
   *  `resolveActorReportScope` returns `null` rather than an empty-set scope. */
  readonly values: readonly string[];
}
```

| Arm | Verdict |
|---|---|
| **A. Replace `value` with `values: readonly string[]`** | ✅ **RECOMMENDED.** One source of truth. Every consumer becomes a **compile error** — which is the migration aid: the four read sites (`assemble.ts:55-57`, `_shared.ts:69-70`, `handlers.ts:350-351`, `reports-export.ts:177`) cannot be silently missed. |
| B. Keep `value`, add optional `values` | ⛔ Two sources of truth for one fact. A consumer reading the old field compiles, passes, and silently keeps today's bug. This is the shape the story exists to delete. |

**Sub-rulings requested:** (i) `global` ⇒ `values: []` — confirm, and confirm the invariant
`dimension === 'global' ⇔ values.length === 0` is asserted by a unit test. (ii) **Sort + dedupe at the
producer** (`resolveActorReportScope`), not at each consumer — determinism for SQL, tests and audit
attribution. (iii) `pariwar` ⇒ `values: [pariwarId]` (unchanged in substance).
(iv) ⭐ **`scopeValue` is already guaranteed non-null for every non-`global` dimension** that survives
`grantScopeWellFormed` (`scope.ts:38-43`: `global` ⇒ value must be null; every other dimension ⇒ value must
be non-null). So `values: readonly string[]` needs **no** null filter and **no** `!` assertion — narrow via
the existing guard. ⛔ A defensive `.filter(Boolean)` added "just in case" would silently swallow a future
well-formedness regression instead of failing closed.

### D2 — ✅ **RULED: ALL, not ANY.** `assembleReport`'s authorization over N nodes

`checkPermission` takes **one** `ResourceLocator` (`rbac/check.ts:262`, `:209`). With N values it must be
called N times.

**✅ ALL must pass (AND).** For `global`, one call with `value: null`.

- Every value in the set came from a grant that already passed the bundle + ceiling + key filters
  (`scope.ts:65-72`), so **ALL passes by construction today** — requiring ALL costs nothing now, and fails
  **closed** if `resolveActorReportScope` and `checkPermission` ever drift apart.
- ⛔ **OR would be a genuine escalation**: one qualifying node would authorize a query that reads N.
- ⛔ **The Open/Closed invariant survives** (10.7 AC1, inherited from 10.6 Decision 5): the loop iterates
  **scope values**, never `reportType`. There is still no `if (reportType === …)` in `assemble.ts`. The two
  proofs that enforce it — the **source-text** check
  (`tests/reports/assemble.test.ts:52-…`, which `readFileSync`s `assemble.ts` itself) and the **behavioural**
  two-divergent-fixture proof (`tests/reports/assemble.test.ts:34-…` over `tests/reports/fixtures.ts`) — must
  both stay green **unmodified**. ⚠ The source-text test reads the file it guards, so a careless refactor of
  `assemble.ts` can break it in a way `typecheck` will not.

### D3 — ✅ **RULED: arm B.** The `state` arm **stays `deny`** — *"Closed by [edit]"*, ⛔ **NO successor is minted.**

| Arm | Verdict |
|---|---|
| A. Build `state` → `WHERE district IN (<descendants>)` | ⛔ **NOT RECOMMENDED.** Needs an enumeration API that does not exist (`GeoTreeResolver` is `contains`-only **by interface** — freeze row 9; `LoadedGeoTree.parents` is child→parent only, `geo-tree/resolver.ts:100-105`), a widened `ReportScopeCtx` seam, and it is **unreachable by every real role** (AC5(b) evidence). It also contradicts AC4's own verb. |
| **B. `deny` stays; the REASON is rewritten a third time** | ✅ **RECOMMENDED.** |

⭐ **The reason must be durable this time.** It has now been wrong twice: *"no geo-tree resolver until Story
1.18"* (expired when 1.18 shipped) and *"`DistrictNarrowing` / `ResolvedReportScope` are SINGLE-VALUED"*
(expires the moment AC1 lands). The third reason is the one that does not decay:

> `state` denies because **no role holds a district-narrowable report key at a `state` ceiling** — there is no
> actor to serve, and no enumeration API exists because none was ever needed. **Closed by [edit], NO successor
> minted** (the Story 1.18 D4-R `self` precedent, on the same evidentiary shape). If a state-ceiling role ever
> gains such a key, **that** story raises it with a live requirement attached.

⛔ **Do NOT mint a story, an epic pointer, or a "re-trigger: someday" line.** *A deferral naming an epic
expires unowned* ([[project_r7_fact_producer_unbuilt]]), and minting an owner for work nobody has asked for is
the un-gated re-commitment [[feedback_record_unattested_no_backfill]] warns decays. ⛔ `block` and `self` are
untouched — their reasons (rank order; not a tree node) remain correct and are re-stated verbatim.

### D4 — ✅ **RULED as recommended** (see also the Escalation 3 ruling). Audit actor-role attribution with N nodes

Both sites resolve the acting role by matching a grant against the resolved scope:

```
apps/api/src/modules/reports/handlers.ts:347-353     g.scopeDimension === …dimension && g.scopeValue === …value
apps/jobs/src/reports-export.ts:175-178              (identical shape)
```

**✅ Match** on `dimension === resolvedScope.dimension && resolvedScope.values.includes(g.scopeValue)`,
take the **first** — deterministic because D1(ii) sorts the set.

⚠ **State the residual limitation openly rather than solving it:** an actor holding *different roles* at
*different nodes* has one of those roles recorded. That is **not a regression** — today's code has the same
ambiguity with less determinism — and the 10.7 review already chose "the grant that actually authorized"
over "the first grant in the tenant". ⛔ **Do NOT add an audit column, an array field, or a second audit
line.** Record it in `deferred-work.md` with no successor unless BigDev rules otherwise.

### D5 — ✅ **RULED as recommended.** `DistrictNarrowing`: rename the kind, and **empty must DENY**

**✅ The ruled shape:**

```ts
export type DistrictNarrowing =
  | { kind: 'all' }
  | { kind: 'districts'; districts: readonly string[] }   // ⭐ NON-EMPTY, guaranteed by the constructor
  | { kind: 'deny' };
```

- **Rename `district` → `districts`.** Every call site becomes a compile error; a silently-still-compiling
  call site is how trap 1 ships.
- ⛔ **`districts.length === 0` ⇒ return `{ kind: 'deny' }` at the source**, so no consumer can ever hold an
  empty array. The invariant is enforced **in `resolveDistrictNarrowing`**, not by convention at two query
  sites. (Under D1 this is defence-in-depth — a non-global scope with an empty set is already unreachable —
  and defence-in-depth is exactly what trap 1 warrants.)
- **SQL:** `sql.join(districts.map((d) => sql`${d}`), sql`, `)` inside `IN (…)`. ⛔ **Never** string-concatenate
  — `templates.test.ts:54-60` already proves a district value can be hostile (`=SUM(A1:A9)`). Note both
  templates use raw `client.execute(sql…)`, not the query builder, so drizzle's `inArray(column, …)` does not
  apply here.

### D6 — ✅ **RULED: NO.** Does `resolveActorReportScope`'s signature change?

**No.** Same parameters, same `null`-when-unheld contract, same purity. Only the return **shape**
widens. This keeps the three call sites (`handlers.ts:103`, `:345`, `reports-export.ts:165`) structurally
unchanged and keeps the diff legible. ⛔ Do not add a `geoResolver` parameter — that would be D3 arm A by the
back door.

### D7 — ✅ **RULED as recommended.** De-duplication is a `Set`, **pinned by a reachable test**

**Dedupe** in `resolveActorReportScope` (D1(ii)). The pin is **not** hypothetical: an actor holding
`district_admin` **and** a second key-bearing role at the *same* district produces the same node twice today.
A unit test asserting `values` contains `'Patna'` exactly once satisfies AC5's "must not double-count" with a
test that **can actually fail** ([[feedback_gate_scope_semantic_coverage]]) — unlike an ancestry-based
double-count test, which under D3 could never run.

---

## ⚠ ESCALATIONS — ✅ **ALL FOUR DISPOSITIONED BY BIGDEV, 2026-08-13**

| # | ✅ Ruling |
|---|---|
| 1 | **Accept the recommendation** — edit for shape consistency, record unreachability at the site, ⛔ invent no grant. |
| 2 | **MANDATORY.** The AC3 test must demonstrably go **RED** when the old strict-`<` implementation is restored, then **GREEN** after restoration. |
| 3 | **Record it.** ⛔ No successor and ⛔ no additional audit mechanism. |
| 4 | **Leave unchanged.** The existing build-time re-resolution is deliberate and correct. |

### Escalation 1 — `contribution_rate_by_district`'s district branch is **DEAD for every real holder**, and AC2 names it anyway

`CONTRIBUTION_RATE_PERMISSION_KEY = 'reconciliation.review'` is held only by pariwar-ceiling roles, so
`resolveDistrictNarrowing` can **never** return a districts-narrowing for it — already recorded at
`deferred-work.md:3447`. **✅ Ruled disposition:** edit it anyway, for shape consistency (it shares
`_shared.ts`), and **record the unreachability at the site**. ⛔ Do **not** invent a district-capable grant to
make AC2's second template demonstrable — that is manufacturing a consumer to satisfy a test. **`member-roster`
carries AC3's proof**, as it already carries 10.7's district-narrowing proof.

> ✅ **RULED (BigDev, 2026-08-13): accept the recommendation.**

### Escalation 2 — the AC3 test's *revert-sanity* is the only thing that proves the fix

A two-grant test written against the NEW code passes trivially. **Mandatory (Task 7):** temporarily restore
the strict-`<` tie-break, observe the AC3 test go **RED**, restore, and record **both** failure outputs in the
Dev Agent Record — the Story 1.18 AC8 discipline, which proved its tests discriminated *ancestry* rather than
*presence*. Same reasoning here: prove the test discriminates *both districts* rather than *some rows*.

> ✅ **RULED (BigDev, 2026-08-13): MANDATORY.** *"The AC3 test must demonstrably go RED when the old strict-`<`
> implementation is restored, then GREEN after restoration."*
> ⛔ Both observations are **recorded with their real output** — the RED run's actual failure text and the
> restored GREEN run. A described probe is not a run ([[feedback_record_unattested_no_backfill]]); a probe that
> was never made to fail proves nothing ([[feedback_gate_scope_semantic_coverage]]). ⛔ The restoration must be
> verified byte-for-byte, not assumed — the 1.18 discipline.

### Escalation 3 — audit attribution ambiguity survives this story (**D4**)

Recorded, not solved. Flagged here so a reviewer does not read it as an oversight.

> ✅ **RULED (BigDev, 2026-08-13): record it; NO successor and NO additional audit mechanism.**
> It lands in `deferred-work.md` as a **recorded limitation with no owner** — deliberately, on the same
> discipline as D3: minting an owner for work nobody has asked for is the un-gated re-commitment
> [[feedback_record_unattested_no_backfill]] warns decays, and *a deferral naming an epic expires unowned*
> ([[project_r7_fact_producer_unbuilt]]). ⛔ No audit column, no array field, no second audit line, no
> "re-trigger: someday". The entry states the ambiguity, states that today's code already has it with **less**
> determinism, and stops.

### Escalation 4 — request→build scope drift is already correct; **do not "fix" it**

The idempotency key is actor-scoped and excludes scope; the build worker **re-resolves** grants and tree at
build time (`reports-export.ts:163-192`). So a grant added between request and build **widens** the export and
one revoked **narrows** it — deliberate, and documented at `:183-190`. ⛔ Freezing scope into the pending row
would reintroduce the resolved-scope columns 10.7 deliberately removed.

> ✅ **RULED (BigDev, 2026-08-13): leave unchanged.** *"The existing build-time re-resolution is deliberate and
> correct."* ⛔ `reports-export.ts:163-192` is **out of scope except for D4's attribution line**. Do not
> "harden" the drift, do not add an as-of-request mode, do not persist scope.

---

## Tasks / Subtasks

### Task 0 — Branch, baseline (AC: all)
- [x] ✅ **UNBLOCKED.** BigDev ruled **D1–D7 as recommended** and dispositioned **Escalations 1–4** on
      2026-08-13; every ruling is recorded above under the decision it answers. ⛔ Nothing below re-opens them.
- [x] Branch `feature/10-28-multi-node-report-scope` off `main` @ `6bd01ec` (clean, fetched, verified).
- [x] **Baseline the suites BEFORE any edit** and record the numbers:
      `pnpm --filter @twt/domain test tests/reports/` (scope + assemble + templates + registry) and the live-DB
      `packages/domain/tests/integration/reports/reports.spec.ts`. A baseline taken after an edit is not a baseline.
- [x] Re-derive every line anchor in this file against the working tree; record **drift or ZERO DRIFT** explicitly.

### Task 1 — `governance:` — the decision-log entry (AC: 1, 5) — **COMMITS FIRST**
- [x] Append **Decision `2026-08-13-105`** to `.decision-log.md` (newest first, above `2026-08-13-104`), carrying
      D1–D7, the four escalation dispositions, and **D3's "Closed by [edit], no successor" with its evidence**.
- [x] ⛔ **Zero `packages/` and `apps/` files in this commit.** History must read governance → implementation
      ([[feedback_governance_commits_precede_implementation]]). Commit manually — branch + selective stage, **not**
      `commit-story` ([[project_story_automator_ops]]).

### Task 2 — The type + the resolver (AC: 1, 5)
- [x] `packages/domain/src/reports/types.ts:54-57` — `ResolvedReportScope.value` → `values: readonly string[]`,
      with the D1 doc comment (global ⇔ empty; non-global empty is unreachable).
- [x] `packages/domain/src/reports/scope.ts` — accumulate ties at the winning dimension; **dedupe + sort**; reset
      the set when a genuinely broader dimension appears. ⛔ Broadest-dimension selection itself is unchanged.
- [x] **Delete the `v1 LIMITATION` block (`:75-85`)** and rewrite the module header (`:20-25`) — this story
      discharges it. ⛔ Do not leave "owned by Story 10.28" prose behind a shipped fix.

### Task 3 — Narrowing modes + both templates (AC: 2, 5) — **D5**
- [x] `templates/_shared.ts` — `DistrictNarrowing` per D5; `resolveDistrictNarrowing` returns `deny` on empty.
- [x] Rewrite the per-dimension re-examination doc comment (`:30-56`, `:72-73`) with **D3's third reason** for
      `state`; ⛔ `block` (rank order) and `self` (not a tree node) reasons re-stated **verbatim** — they are correct.
- [x] `templates/member-roster.ts:53-56` and `templates/contribution-rate-by-district.ts:52-55` — `IN (…)` via
      `sql.join`. Update both files' `deny`-branch comments (`member-roster.ts:44-46`, `crbd.ts:45-47`), which name
      Story 10.28 as pending.
- [x] Record `contribution_rate_by_district`'s unreachability **at the site** (Escalation 1).

### Task 4 — Consumers: assemble + the two call-site families (AC: 1) — **D2, D4**
- [x] `packages/domain/src/reports/assemble.ts:49-65` — check **every** node (D2); `global` ⇒ one call with
      `value: null`. ⛔ No `reportType` branch; the Open/Closed source-regex test stays green **unmodified**.
- [x] `apps/api/src/modules/reports/handlers.ts:347-353` and `apps/jobs/src/reports-export.ts:175-178` — role
      attribution per D4. ⛔ `handlers.ts:103-111` / `reports-export.ts:165-174` fail-closed `null` handling is
      **unchanged**.
- [x] Typecheck `@twt/domain`, `@twt/api`, `@twt/jobs` — the compile errors ARE the checklist (D1 arm A).

### Task 5 — The deny-deeper pin, re-pinned (AC: 4)
- [x] `packages/domain/tests/integration/reports/reports.spec.ts:125-146` — rewrite the **reason** only.
      ⛔ `expect(result.rows).toHaveLength(0)` at `:175` and the with-resolver companion `:183-201` are
      **byte-frozen**. State plainly what 1.18 already discharged vs what this story changes (AC4's disposition).
- [x] ⛔ Do **not** touch `apps/api/tests/integration/reports/reports.spec.ts` — wrong file (see the table above).

### Task 6 — Markers, deferred-work, epics (AC: 5)
- [x] `deferred-work.md:3449-3457` — mark ✅ **DISCHARGED by Story 10.28**, using
      [[feedback_closure_language_precision]]'s vocabulary exactly. `:1731` and `:4316` — update the pointers.
- [x] `deferred-work.md` — a **new** section for D3's "Closed by [edit], no successor" and D4's residual
      ambiguity. ⛔ Neither gets a minted owner.
- [x] `_bmad-output/planning-artifacts/epics.md:4185-4211` — record the dispositions beside the ACs.
      ⛔ **Never edit the minted AC text.**
- [x] Grep-sweep `10.28` / `10-28` across `packages/` and `apps/` and dispose of **every** hit; list them in the
      Dev Agent Record. **The sweep at `6bd01ec` is 12 hits across 6 files, all already in Tasks 2/3/5:**
      `reports/scope.ts:24,75,84` · `reports/types.ts:89` · `templates/_shared.ts:10,41,44,72` ·
      `templates/member-roster.ts:45` · `templates/contribution-rate-by-district.ts:46` ·
      `tests/integration/reports/reports.spec.ts:142,145`. ⚠ `moderation-dwell.test.ts:54` is a **false
      positive** (the date `2026-10-28`) — do not touch it. ⛔ A grep sweep proves only that no *token* was
      missed; a file describing the limitation without naming the story would not appear here.

### Task 7 — Tests (AC: 3, 5) — **the two mandatory pairs**
- [x] **AC3 — the two-grant presence test (live DB).** In `tests/integration/reports/reports.spec.ts`, a
      `district_admin` × 2 (`Patna` + `Gaya`) ctx over `seedTwoDistricts`:
      `expect(ids.has(a1)).toBe(true); expect(ids.has(a2)).toBe(true); expect(ids.has(a3)).toBe(true); expect(ids.has(b1)).toBe(false);`
      ⛔ Membership, never counts. ⛔ A `rows.length > 0` assertion does not satisfy AC3.
- [x] **⛔ THE D5 POLARITY PAIR — MANDATORY, BOTH HALVES.** (a) a two-district scope ⇒ **both** districts in the
      `IN` list; (b) an **empty** value set ⇒ **`deny`**, i.e. **zero rows**, ⛔ **never** the full tenant. Half (b)
      is the one that catches trap 1, and it must assert zero rows against a seeded tenant that *has* rows —
      otherwise it passes vacuously.
      ⚠ **Half (b)'s input is UNREACHABLE through a real actor's grants** — D1(i)'s own invariant
      (`dimension === 'global' ⇔ values.length === 0`) means `resolveActorReportScope` never returns a
      non-`global` scope with an empty set; an actor with no district grant gets `null` and a 403 before any
      template runs. Construct it the same way the state_trustee PIN 9/9 test constructs its scope: **hand-build**
      the `ResolvedReportScope` (`{ dimension: 'district', values: [] }`) and its ctx directly, bypassing
      `resolveActorReportScope`, then run it through the template's `query` (or `assembleReport`) against a
      seeded tenant to prove the SQL returns `[]`, not the tenant.
- [x] **AC5 dedupe pin (unit, DB-free):** two grants at the SAME district ⇒ `values` contains it **once** (D7).
- [x] **Invariant pin (unit):** `dimension === 'global' ⇔ values.length === 0`.
- [x] **⭐ REVERT-SANITY (Escalation 2), mandatory:** restore the strict-`<` tie-break, run the AC3 test, record it
      **RED with its real output**, restore, re-run green. A test that cannot be made to fail proves nothing.
- [x] Update `tests/reports/scope.test.ts` (5 tests, all read `.value`) and `tests/reports/assemble.test.ts`
      (`:30`, `:85`). ⛔ Update — do **not** delete. The `:62-70` broadest-scope test is the one that must keep
      proving `pariwar` beats `district`.

### Task 8 — Verification (AC: all)
- [x] `pnpm ci:local` — all static gates. ⚠ `git push` runs the full `ci:local` via a pre-push hook (that is the
      "hang") ([[project_friction_budget_baseline_ratchet]]).
- [x] Live-DB single-pass for `@twt/domain` and `@twt/api`. ⛔ Do **not** export `DATABASE_URL` globally — that
      double-runs integration specs and produces worker timeouts ([[project_ci_local_double_run_pollution]]).
      Confirm any suspect spec's innocence by running it in isolation, never by assumption.
- [x] Record every count as a **real local run**; anything not captured is recorded **un-attested**, never
      reconstructed ([[feedback_record_unattested_no_backfill]], [[feedback_verify_before_committing_governance_claims]]).

---

### Review Findings

- [x] [Review][Patch] D4's "deterministic because sorted" claim is false — `values.sort()` orders `ResolvedReportScope.values`, not the `grants` array `.find()` iterates, and neither grant-loading query (`apps/api/src/modules/rbac/index.ts:39-44`, `apps/jobs/src/reports-export.ts:101`) carries an `ORDER BY`; Postgres row order for `SELECT ... FROM role_grants WHERE user_id = $1` is otherwise unspecified [apps/api/src/modules/reports/handlers.ts:347-363, apps/jobs/src/reports-export.ts:175-188] — fixed: `grants` sorted locally (`scopeValue`, then `role`) at both D4 sites before `.find()`, making "first hit" actually deterministic.
- [x] [Review][Patch] AC3/D2's defence-in-depth authorization assertion is a bare `.rejects.toThrow()` with no error-type/message check, so it can't distinguish "denied for the right reason" from an unrelated crash — thin for the trap the story itself calls the most dangerous [packages/domain/tests/integration/reports/reports.spec.ts:240] — fixed: asserts `AuthorizationDeniedError` specifically.
- [x] [Review][Patch] `contribution-rate-by-district.ts`'s new `districts` narrowing / `sql.join` `IN (...)` construction is a byte-for-byte duplicate of `member-roster.ts`'s (not a shared helper) and is exercised by zero tests — a typo here ships unnoticed even though `member-roster`'s copy is proven correct via AC3 [packages/domain/src/reports/templates/contribution-rate-by-district.ts:60-70] — fixed: added a direct `.query()`-level two-district test (hand-built ctx, no invented grant, per Escalation 1).
- [x] [Review][Patch] Stale doc comment still describes the pre-10.28 singular `(dimension, value)` shape, two lines below the correctly-updated `ResolvedReportScope` interface — exactly the "stale reason left behind" class D3 warns about, just outside the files the task list named [packages/domain/src/reports/types.ts:78] — fixed.
- [x] [Review][Patch] `WellFormedGrant`'s non-global arm (`{ scopeValue: string }`) doesn't constrain `scopeDimension`, so it structurally still admits `{ scopeDimension: 'global', scopeValue: string }` — the "no null filter, no `!`" guarantee holds only because runtime code doesn't exploit the gap, not because the type closes it [packages/domain/src/reports/scope.ts:52-53] — fixed: non-global arm now typed `{ scopeDimension: Exclude<ScopeDimension, 'global'>; scopeValue: string }`.

**Verification after patches:** `pnpm --filter @twt/domain typecheck`, `@twt/api typecheck`, `@twt/jobs typecheck` — all clean. `pnpm --filter @twt/domain lint`, `@twt/api lint`, `@twt/jobs lint` — all clean. Live-DB: `packages/domain/tests/integration/reports/reports.spec.ts` 12/12 (was 11, +1 new), `apps/api/tests/integration/reports/reports.spec.ts` 9/9, `apps/jobs/tests/reports-export.test.ts` 5/5. Domain unit: `tests/reports/*.test.ts` 25/25. `assemble.ts` untouched by these patches — both Open/Closed proofs (`assemble.test.ts`) still green unmodified.

## Dev Notes

### Files being MODIFIED — read each **before** editing

| File | What it does today | What changes | What must NOT break |
|---|---|---|---|
| `packages/domain/src/reports/types.ts` (`:54-57`) | `ResolvedReportScope = { dimension, value: string \| null }`; `ReportScopeCtx` carries the optional `geoResolver` (`:73-91`) | `value` → `values` (D1) | ⛔ `geoResolver` stays **OPTIONAL** — omitting it must remain byte-identical to today; ⛔ the AUTHORIZATION-vs-NARROWING separation doc (`:87-89`) stays true |
| `packages/domain/src/reports/scope.ts` | PURE, fail-closed; broadest-dimension pick with a strict-`<` tie-break (`:86`); the `v1 LIMITATION` block (`:75-85`) | accumulate + dedupe + sort; **delete** the limitation block; rewrite the header (`:20-25`) | ⛔ `null` when the key is held at NO scope; ⛔ the bundle/ceiling/active-Pariwar filters (`:64-72`); ⛔ purity — no I/O, no clock |
| `packages/domain/src/reports/templates/_shared.ts` | 3 narrowing modes; the per-dimension re-examination comment (`:30-56`); `REPORT_ROW_CAP` + `reportRowLimit` | `districts` kind; empty ⇒ `deny`; `state`'s reason rewritten (D3) | ⛔ `reportRowLimit`'s clamp (the domain forced-pagination invariant); ⛔ `block`/`self` reasons unchanged |
| `packages/domain/src/reports/templates/member-roster.ts` (`:42-88`) | `deny`-early-return; tenant predicate + district ternary; tenant-scoped `DISTINCT ON` CTE; `LEFT JOIN` so never-posted members appear for a pariwar actor | `IN (…)` | ⛔ the explicit `m.pariwar_id` predicate (the worker runs BYPASSRLS); ⛔ the CTE's own `pariwar_id` filter; ⛔ the `LEFT JOIN` + `COALESCE(cp.district,'—')`; ⛔ `LIMIT ${reportRowLimit()}` |
| `packages/domain/src/reports/templates/contribution-rate-by-district.ts` (`:43-75`) | same narrowing shape over a `GROUP BY` aggregate; honest `'n/a (Epic 8/9)'` numerator | `IN (…)` + the unreachability note | ⛔ **never invent the numerator** ([[project_engine_never_infers_contribution_facts]]); ⛔ the `INNER JOIN` here is deliberate (contrast the roster) |
| `packages/domain/src/reports/assemble.ts` (`:32-70`) | ONE `checkPermission` at the resolved scope, then `template.query` | per-node check (D2) | ⛔ **NO `reportType` branch** — 10.7 AC1 / 10.6 Decision 5, enforced by a source-text regex test **and** a two-fixture behavioural proof; ⛔ fail-closed rethrow of `check.error` |
| `apps/api/src/modules/reports/handlers.ts` (`:103-111`, `:343-353`) | request-time resolve → 403 on `null`; download-audit role attribution | D4 attribution | ⛔ the `AuthorizationDeniedError` shape; ⛔ `openScopeTx`/`closeScopeTx` pairing; ⛔ enqueue-after-commit + compensate |
| `apps/jobs/src/reports-export.ts` (`:163-200`) | build-time re-resolve of grants **and** tree; role attribution; assemble → serialize → envelope-encrypt | D4 attribution | ⛔ build-time re-validation semantics (`:183-190`); ⛔ the `status !== 'pending'` early bail; ⛔ artifact encryption |
| `packages/domain/tests/integration/reports/reports.spec.ts` | 4 narrowing tests + the 9/9 deny-deeper pin (`:125-201`) + the lifecycle-accessor suite | + the AC3 two-grant test; the pin's **comment** only | ⛔ `:175` and `:183-201` byte-frozen; ⛔ `seedTwoDistricts` shape; ⛔ `enterAppScope` before every read |
| `packages/domain/tests/reports/scope.test.ts` (5 tests) | all assert `{dimension, value}` | `{dimension, values}` + the D7 dedupe pin + the global-invariant pin | ⛔ keep the broadest-scope test (`:62-70`) and the fail-closed test (`:43-50`) semantically intact |
| `packages/domain/tests/reports/assemble.test.ts` (`:30`, `:85`) | fixture ctxs | shape only | ⛔ the Open/Closed proofs |

### Reuse — do **NOT** reinvent

- **`sql.join` is drizzle's list interpolation.** `sql.join(vals.map((v) => sql`${v}`), sql`, `)`. ⛔ Do not write
  a helper, do not `.map().join(',')`, do not reach for `inArray` (these are raw `client.execute` queries, not
  builder chains).
- **`seedTwoDistricts` already seeds Patna ×2 + Gaya + a cross-tenant Patna** — the AC3 fixture exists. Do not
  write a new seeder.
- **The `districtCtx()` / `pariwarCtx()` factories** (`reports.spec.ts:31-46`) are the ctx pattern; add a
  `twoDistrictCtx()` beside them.
- **`resolveDistrictNarrowing` is the ONE narrowing authority.** Both templates call it. ⛔ Do not inline a
  second narrowing decision into a template.
- **The formula-injection guarantee already exists** via the reused 10.6 `toCsv` (`templates.test.ts:54-60`,
  `:74-80`). ⛔ Do not add escaping in the query layer.

### Anti-patterns this story is specifically exposed to

1. ⛔ **Empty set ⇒ un-narrowed query.** Trap 1. The full-tenant export. **D5.**
2. ⛔ **ANY-node authorization** instead of ALL. Trap 2. **D2.**
3. ⛔ **Absorbing D3 arm A "while we're in here"** — the exact reasoning Story 1.18 was forbidden from using in
   the other direction. Trap 3.
4. ⛔ **String-concatenating the `IN` list.** A district value can be hostile.
5. ⛔ **Keeping `value` alongside `values`** so nothing breaks. It is how the bug survives. **D1.**
6. ⛔ **Adding a `reportType` branch to `assemble.ts`** while looping nodes. Open/Closed, 10.7 AC1.
7. ⛔ **Editing the minted AC text** to match what was built. Record the disposition beside it
   ([[feedback_supersede_never_reinterpret]]).
8. ⛔ **Leaving a stale reason in `_shared.ts`.** Third time. **D3.**
9. ⛔ **Normalizing district strings** (trim/case-fold). `role_grants.scope_value` and
   `member_postings.district` are both free `text`, and the geo-tree resolver deliberately does **not**
   normalize (`geo-tree/resolver.ts:20-31`) — a one-request inconsistency is worse than either rule.
10. ⛔ **Persisting resolved scope on `report_exports`.** 10.7 removed those columns deliberately.
11. ⛔ **Count-based assertions** on a live-DB suite fed by own-committing writers
    ([[project_live_db_test_gotchas]]).
12. ⛔ **A type-only import becoming a value import** across `reports` / `geo-tree` / `rbac`
    ([[project_type_only_import_cycle_trap]]).

### Testing standards

- Vitest. Domain unit tests are DB-free; `*.spec.ts` under `tests/integration/` are live-DB (`twt-test-pg`:5433).
  ⛔ Never `DROP SCHEMA` (42P01); ⛔ never regenerate an applied migration (42P07) — **this story writes no
  migration at all**.
- Own-committing writers ⇒ assert **membership**, not counts.
- Suite-level `{ timeout: 20000 }` on live-DB suites; `--concurrency=4` is already set for `turbo run test`
  ([[project_ci_local_concurrency_oversubscription]]).
- **Revert-sanity is required, not optional** ([[feedback_gate_scope_semantic_coverage]]).
- ⚠ **The DATE-BOMB class**: pin `created_at` on any seeded row read back through a clock-bounded query. The
  roster CTE orders by `created_at DESC`, so a seeded posting with a defaulted timestamp is exposed
  ([[project_known_livedb_test_failures]]).

### Previous-story intelligence

**Story 6.17 (`done`, merged `6bd01ec`)** — the immediate predecessor and the closest structural analogue:
- Its **D6 polarity pair** is the model for this story's D5 pair: when absence must DENY rather than widen,
  **both halves are pinned**, and a *fallback probe* proves the pair actually isolates the polarity.
- Its headline review finding was a **per-ROW read gate** that leaked because the gate was evaluated **once**
  for a request that returned **many** rows. ⚠ **Directly relevant here**: this story turns a one-node check
  into an N-node one — D2's "ALL, not ANY" is the same lesson pointed the other way.
- Comment-only changes to fenced files were shipped with an explicit "zero non-comment diff lines" proof.
  Task 5 owes the same for the frozen pin.

**Story 1.18 (`done`, merged `9fa4e31`)** — the model this story completes:
- **AC8's revert probes** proved the tests discriminated *ancestry* rather than *presence*, with two
  **different** failure sets. Escalation 2 repeats that design deliberately.
- Its **D4-R** closed `self` **by edit with no successor** on a zero-consumer evidentiary record. **D3 reasons
  from exactly that precedent.**
- `db:generate` MUST NOT be used in this repo (114 KB full-schema dump; snapshots stop at `0020`). ⛔ Moot
  here — no schema change — and stated so nobody reaches for it.

**Story 10.7 (`done`)** — the model being extended: scope-as-predicate (Decision 3), per-template permission
keys (Decision 6), the Open/Closed harness (AC1), PII masking (Decision 2, never Tier-1 plaintext), no
persisted resolved-scope column, and the second-pass review that **filed this very limitation**
(`deferred-work.md:3449`) — whose 2026-07-31 premise was later **superseded on evidence**, never reinterpreted
([[feedback_supersede_never_reinterpret]]).

### Git intelligence (last 5 commits)

```
6bd01ec story(6.17): Block-Dimension Ground-Inspection Gate (#187)
ba52ba0 Merge PR #186 — 1.19 member geo attribution
a4a3f7d story(1.19): code-review fixes — genuine cross-tenant tests, split log cause, D3/dead-export cleanup
dc25916 story(1.19): member→geo attribution + the state audience arm, wired end-to-end in BOTH consumers
f263ce4 governance(1.19): Decision 2026-08-13-103 — eight rulings, six marker dispositions, D1's MECHANIZED re-trigger
```

The shape to copy: **`governance:` first with zero `packages/`/`apps/` files**, then `story(N):`, then
`story(N): code-review fixes` ([[feedback_governance_commits_precede_implementation]]). Commit manually —
branch + selective stage, not `commit-story` ([[project_story_automator_ops]]). ⛔ `git fetch origin` before
any claim about `origin/main` ([[feedback_git_fetch_before_remote_reasoning]]).

### Project Structure Notes

- ⛔ **No new package, no new domain namespace, no new file.** This story edits **10 existing files** plus tests.
- ⛔ **No migration.** No schema change of any kind.
- ⛔ **No contracts change.** Scope never crosses the wire.
- ⛔ **No admin UI change.** `ReportsPage.tsx` has no scope affordance.
- ⛔ **No RBAC catalog change.** `PERMISSION_CATALOG_VERSION` and the key count both stay put.
- Domain columns snake_case, TS camelCase — no drift risk in this diff, but the contracts-snake_case vs
  domain-camelCase trap remains live project-wide ([[feedback_story_validate_footguns]]).
- ⚠ **`apps/api/tests/integration/reports/reports.spec.ts` cannot prove AC3 and is not asked to.** Its `grant()`
  helper inserts **`scope_dimension: 'pariwar'` only** (`:74-88`, the literal at `:78`), so no multi-district actor is expressible
  there. AC3's proof lives in the **domain** integration spec. ⛔ Do not widen the API helper to manufacture one.
- ⚠ **`apps/api/src/modules/trustee-lite/handlers.ts:14-22` needs NO change.** It cites
  `resolveActorReportScope` as a *pattern* precedent (dynamic per-section keys over grants resolved once) and
  never calls it. It will appear in no grep sweep for `10.28`; it is listed here so a reviewer does not read
  its absence from the File List as an omission.

### References

- `_bmad-output/planning-artifacts/epics.md:4185-4211` — Story 10.28's five minted ACs + the placement note
- `_bmad-output/planning-artifacts/epics.md:3682-3695` — Story 10.7 (FR-58A), the model being extended
- `_bmad-output/planning-artifacts/epics.md:526` — architectural freeze row 9 (RBAC key + scope-dimension model)
- `.decision-log.md` — Decision `2026-08-12-102` (the mint; 1.18 AC6 / D6 closed) · `2026-08-13-104` (6.17's nine rulings)
- `_bmad-output/implementation-artifacts/deferred-work.md:3449-3457` — the marker this story discharges
- `_bmad-output/implementation-artifacts/deferred-work.md:4312-4370` — the three-mint table + the third-generation warning
- `_bmad-output/implementation-artifacts/deferred-work.md:3441-3447` — 10.7's other recorded reports deferrals
- `_bmad-output/implementation-artifacts/1-18-geo-tree-scope-resolver.md` — Appendix A (this story's minted text), D4-R, AC8
- `_bmad-output/implementation-artifacts/6-17-block-dimension-ground-inspection-gate.md` — the D6 polarity-pair discipline
- `packages/domain/src/reports/{types,scope,assemble}.ts` + `templates/{_shared,member-roster,contribution-rate-by-district}.ts`
- `packages/domain/src/rbac/scope.ts:229-301` — `scopeContains` · `packages/domain/src/rbac/check.ts:262` — `checkPermission`
- `packages/domain/src/rbac/roles.ts:341` / `:361-369` / `:401` — the AC5(b) zero-consumer evidence
- `packages/domain/src/geo-tree/resolver.ts:100-105`, `:147-182` — `LoadedGeoTree` is child→parent only (D3)
- `apps/api/src/modules/reports/handlers.ts` · `apps/jobs/src/reports-export.ts` — the two consumer families

---

## Dev Agent Record

### Agent Model Used

Claude Opus 5 (`claude-opus-5`) — `bmad-dev-story`, 2026-08-13.

### Debug Log References

**Task 0 — BASELINES, taken BEFORE any edit (both are real local runs):**

| Suite | Command | Baseline |
|---|---|---|
| Domain reports unit | `pnpm vitest run tests/reports/` | **4 files / 20 tests passed** |
| Domain reports live-DB | `DATABASE_URL=… pnpm vitest run tests/integration/reports/reports.spec.ts` | **1 file / 8 tests passed** |

⛔ `DATABASE_URL` was supplied **inline per invocation**, never exported globally
([[project_ci_local_double_run_pollution]]).

**Task 0 — ANCHOR RE-DERIVATION AT `6bd01ec`: ✅ ZERO DRIFT.** Every falsifiable anchor in this file was
re-checked against the working tree and **all matched exactly**:
`scope.ts` `:20-25`/`:38-43`/`:64-72`/`:75-85`/`:86` · `types.ts` `:54-57`/`:73-91`/`:87-89`/`:89` ·
`_shared.ts` `:30-56`/`:58-61`/`:68-71`/`:72-73` · `member-roster.ts` `:44-46`/`:53-56` ·
`contribution-rate-by-district.ts` `:45-47`/`:52-55` · `assemble.ts` `:32-70`/`:49-65`/`:55-57` ·
`handlers.ts` `:103`/`:103-111`/`:343-353`/`:350-351` · `reports-export.ts` `:163-192`/`:165`/`:175-178`/`:183-190` ·
domain `reports.spec.ts` `:31-46`/`:57-70`/`:125-146`/`:147`/`:175`/`:183-201` ·
`scope.test.ts` 5 tests all reading `.value` · `assemble.test.ts` `:30`/`:34`/`:52`/`:85` ·
`rbac/scope.ts:236` · `rbac/check.ts:209`/`:262` · `geo-tree/resolver.ts:100-105` ·
`roles.ts:341`/`:361-369`/`:401` (+ `reconciliation.review` at `:319` under `pariwar_admin` and `:452` under
`finance_officer`, **both pariwar-ceiling** — the D3/AC5(b) zero-consumer evidence, confirmed live).
**AC4's ambiguity confirmed as documented:** `apps/api/tests/integration/reports/reports.spec.ts:124` is
`payload: { report_type: 'audit_log_query', … }` inside an unrelated auditor-200 test (**the WRONG file**),
and its `grant()` helper hardcodes `scope_dimension: 'pariwar'` at `:78` — no multi-district actor is
expressible there. The pin is the domain spec.

**⭐ ESCALATION 2 — REVERT-SANITY. MANDATORY, PERFORMED, AND IT CAUGHT A REAL DEFECT IN MY OWN TEST.**

*Probe:* the strict-`<` tie-break was restored by making a tie `continue` (`>` → `>=` in the accumulator's
narrower-dimension guard), which reproduces the old "first-iterated grant wins" behaviour exactly.

**RED — run 1 (unit), real output:**
```
FAIL tests/reports/scope.test.ts > AC1: carries EVERY district an actor holds the key at
AssertionError: expected { dimension: 'district', …(1) } to deeply equal { dimension: 'district', …(1) }
    "values": Array [
-     "Gaya",
      "Patna",
    ]
FAIL tests/reports/scope.test.ts > AC1: the accumulated set is SORTED at the producer
    "values": Array [
-     "Arrah",
-     "Gaya",
      "Patna",
    ]
  Tests  2 failed | 8 passed (10)
```

**⛔ RED — run 2 (live DB) initially did NOT fail, and that is the finding.** The AC3 fixture
`twoDistrictCtx()` **hand-built** its `resolvedScope`, so it exercised only the template's `IN (…)`
narrowing and bypassed `resolveActorReportScope` entirely — it would have passed unchanged against the old
single-valued resolver, proving nothing about the bug this story fixes. **A probe that cannot fail proves
nothing** ([[feedback_gate_scope_semantic_coverage]]), and this is precisely the class of self-deception
Escalation 2 was made mandatory to catch. The fixture was rewritten to **derive** the scope from the two
real grants through the real producer (grants → `resolveActorReportScope` → `assembleReport` → SQL), and
re-probed:

**RED — run 2 re-probed (live DB), real output:**
```
FAIL tests/integration/reports/reports.spec.ts > AC3: a TWO-DISTRICT actor sees BOTH districts
AssertionError: expected false to be true // Object.is equality
 ❯ :168  expect(ids.has(a3)).toBe(true); // Gaya — the one the single-valued tie-break silently dropped
FAIL tests/integration/reports/reports.spec.ts > D5(a): a two-district scope narrows to EXACTLY those districts
 ❯ :198  expect(districts.has('Gaya')).toBe(true);
  Tests  2 failed | 9 passed (11)
```
⭐ **D5(b) stayed GREEN throughout the probe** — the polarity pair isolating correctly: the empty⇒deny half
is independent of the tie-break, exactly as the Story 6.17 fallback-probe discipline predicts.

**RESTORATION — verified BYTE-FOR-BYTE, not assumed** (the Story 1.18 discipline):
`sha256(scope.ts)` before probe = after restore = `e5e86b838707e2f3fe085ac73b74e9d9fc6225156060ee7de1815faef8af3e9e`.

**GREEN — after restoration:** unit `4 files / 25 tests passed`; live-DB `1 file / 11 tests passed`.

**Task 8 — VERIFICATION (every count a real local run):**

| Check | Result |
|---|---|
| `pnpm ci:local` | ✅ **PASSED — 30 jobs green** (integration-tests SKIP by design without `DATABASE_URL`) |
| `pnpm turbo run test --concurrency=4 --force` (cache-less) | ✅ **37/37 tasks successful** |
| `@twt/domain` live-DB single pass | ✅ **238 files / 2741 passed, 1 skipped, 0 failed** |
| `@twt/api` live-DB single pass | ✅ **115 files / 953 passed, 1 skipped, 0 failed** |
| `@twt/domain` · `@twt/api` · `@twt/jobs` typecheck | ✅ clean |

⚠ **RECORDED UN-ATTESTED, NOT RECONSTRUCTED** ([[feedback_record_unattested_no_backfill]]): the **first**
(cold-cache) `ci:local` reported `✗ test (unit)` with 29/30 otherwise green. Its log was overwritten before
the failing package was identified, so **which package flaked is not attested and is deliberately not
guessed**. What *is* attested: a subsequent **cache-less** `--force` run of the full unit matrix passed
37/37, and two later `ci:local` runs passed 30/30. This is consistent with the known
[[project_ci_local_concurrency_oversubscription]] flake class, but that attribution is **unproven** and is
recorded as a suspicion, not a finding.

### Completion Notes List

**All five ACs satisfied. All seven decisions and four escalation dispositions implemented as ruled — none
re-derived, none softened.**

- **AC1 (D1 arm A)** — `ResolvedReportScope.value` **replaced** by `values: readonly string[]`. The
  broadest-dimension *pick* is unchanged (a `pariwar` grant still beats a `district` grant); **ties at the
  winning dimension now accumulate**, a strictly broader dimension resets the set, a strictly narrower one
  contributes nothing. Dedupe (`Set`) + sort happen **at the producer** (D1(ii)).
- **⭐ D1(iv) implemented as "narrow via the existing guard", NOT as a filter.** `grantScopeWellFormed`
  became a **type predicate** over a `WellFormedGrant` union (`global` ⇒ `scopeValue: null`; every other
  dimension ⇒ `scopeValue: string`). This is what lets `values.add(grant.scopeValue)` compile with **no
  null filter and no `!`**. A `.filter(Boolean)` would have swallowed a future well-formedness regression;
  the guard rejects it and contributes nothing — fail-closed.
- **AC2 (D5)** — `DistrictNarrowing`'s `district` kind renamed `districts` (non-empty by construction), and
  **empty ⇒ `deny` enforced at the source** inside `resolveDistrictNarrowing`. Both templates emit
  `WHERE district IN (…)` via `sql.join` over **parameterized** values — never string concatenation.
- **AC3** — the live-DB two-grant test asserts **presence** (`a1`, `a2`, `a3` present; `b1` absent) through
  the full real chain, membership-based never count-based, and is proven falsifiable (see Escalation 2).
- **AC4** — the pin's **reason** rewritten; **assertions byte-frozen**. Proof: the entire diff of
  `packages/domain/tests/integration/reports/reports.spec.ts` contains **zero non-comment changed lines**
  beyond the four mandatory `value`→`values` ctx migrations — `expect(result.rows).toHaveLength(0)` and the
  whole with-resolver companion are untouched. The report states plainly that **1.18 discharged the
  RBAC-vs-query reclassification in full** and that 10.28 owed only the expired reason.
- **AC5** — **(a)** the de-dup contract is built and pinned by a **reachable** test (two roles at one
  district). **(b)** the `state` arm stays `deny`, **"Closed by [edit]", NO successor minted**, on the
  zero-consumer evidence verified live in `roles.ts`.
- **⛔ D2 — ALL, never ANY**, and one hazard found and closed while implementing it: mapping a scope to
  `values` and looping would run **zero** iterations for an empty set — authorizing nothing and therefore
  permitting everything. The empty set is instead mapped to a **single `null` target**, which `global`
  passes canonically and every other dimension **fails closed** on at `rbac/scope.ts:236`. The
  polarity-pair test asserts that `assembleReport` rejects it, not merely that the query returns `[]`.
- **⛔ D4 — a silent regression found and closed:** matching purely with `values.includes(...)` would have
  **un-attributed every `global` (super_admin) actor**, since a global scope carries the empty set while its
  grants carry a null `scopeValue` — the pre-10.28 equality matched them. Both sites therefore fall back to
  the null-valued grant when the set is empty, preserving today's attribution exactly.
- **Escalation 1** — `contribution_rate_by_district` edited for shape consistency with its unreachability
  recorded **at the site**; ⛔ no grant invented.
- **Escalations 3 & 4** — D4's residual ambiguity recorded in `deferred-work.md` with **no successor and no
  new audit mechanism**; `reports-export.ts:163-192`'s build-time re-resolution left **unchanged**.
- **Open/Closed (10.7 AC1) intact** — the loop iterates **scope values**, never `reportType`. Both proofs
  (the `readFileSync` source-text check and the two-divergent-fixture behavioural proof) pass **unmodified**.
- **Grep sweep — all 12 hits across 6 files disposed.** Every surviving `10.28` mention now describes
  **shipped** behaviour or is a historical attribution; a targeted sweep confirms **no
  owner/pending-language remains** (`"owned by"`, `"pending"`, `"will re-pin"` — zero hits).
  `moderation-dwell.test.ts:54` (the date `2026-10-28`) correctly left untouched as the known false positive.
- **Scope boundary honoured:** ⛔ no migration, no contracts change, no admin-UI change, no RBAC-catalog
  change (`PERMISSION_CATALOG_VERSION` and the key count both unmoved), no new file, no new package.
  `apps/api/tests/integration/reports/reports.spec.ts` untouched (the wrong-file trap).

### File List

**Governance (committed FIRST, zero `packages/`/`apps/` files — commit `aa4318e`):**
- `.decision-log.md` — Decision `2026-08-13-105` appended newest-first above `2026-08-13-104`

**Domain source:**
- `packages/domain/src/reports/types.ts`
- `packages/domain/src/reports/scope.ts`
- `packages/domain/src/reports/assemble.ts`
- `packages/domain/src/reports/templates/_shared.ts`
- `packages/domain/src/reports/templates/member-roster.ts`
- `packages/domain/src/reports/templates/contribution-rate-by-district.ts`

**Consumers:**
- `apps/api/src/modules/reports/handlers.ts`
- `apps/jobs/src/reports-export.ts`

**Tests:**
- `packages/domain/tests/reports/scope.test.ts`
- `packages/domain/tests/reports/assemble.test.ts`
- `packages/domain/tests/integration/reports/reports.spec.ts`

**Governance / tracking artifacts:**
- `_bmad-output/implementation-artifacts/deferred-work.md`
- `_bmad-output/planning-artifacts/epics.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/10-28-multi-node-report-scope.md` (this file)

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-08-13 | 1.0 | ✅ **IMPLEMENTED — all 5 ACs satisfied, all 8 tasks complete, status → `review`.** `ResolvedReportScope.value` **replaced** by `values: readonly string[]` (D1 arm A); ties at the winning dimension ACCUMULATE with dedupe + sort **at the producer**; `DistrictNarrowing.district` → `districts` with **empty ⇒ `deny` at the source** (D5); both templates emit `WHERE district IN (…)` via `sql.join`; `assembleReport` checks **EVERY** node (D2). ⭐ **D1(iv) delivered by making `grantScopeWellFormed` a TYPE PREDICATE** — `scopeValue` narrows through the existing guard with no null filter and no `!`. ⛔ **Two latent hazards found and closed while implementing the rulings:** (1) mapping the scope to `values` and looping would run **zero** iterations on an empty set — authorizing nothing and therefore permitting everything; the empty set is mapped to a single `null` target that fails closed at `rbac/scope.ts:236`; (2) D4 attribution by `values.includes(...)` alone would have **un-attributed every `global` actor**, since a global scope carries the empty set while its grants carry a null `scopeValue`. ⭐ **Escalation 2's revert-sanity caught a real defect in the AC3 fixture itself** — it hand-built `resolvedScope` and so did NOT go RED against the restored strict-`<` implementation; rewritten to derive the scope through the real producer, it then went RED on the dropped Gaya district and GREEN after byte-verified restoration (sha256 identical). D5(b) stayed green throughout, proving the polarity pair isolates. **AC4's assertions are byte-frozen** (zero non-comment diff lines beyond the four mandatory ctx migrations). **D3 + Escalation 3 recorded as deliberate NO-OWNER closures.** Verification: `ci:local` **30/30**, cache-less `turbo run test --force` **37/37**, domain live-DB **2741 passed**, api live-DB **953 passed**. ⚠ One un-attested item recorded openly: the first cold-cache `ci:local` flagged `✗ test (unit)` and its log was overwritten before the package was identified — **not reconstructed, not guessed**. | Claude Opus 5 (`bmad-dev-story`) |
| 2026-08-13 | 0.3 | **Independent validation pass** (`bmad-create-story validate`, fresh context): every falsifiable claim in this file — all line anchors, quoted source, the AC1-5 verbatim mint text, the 12-hit/6-file grep sweep, both predecessor merge hashes — re-derived against the live tree at `6bd01ec` and found to match exactly, zero drift. One enhancement applied: Task 7's D5 polarity-pair half (b) now states explicitly that its input is unreachable through a real actor's grants (per D1(i)) and must be hand-constructed the same way the state_trustee PIN 9/9 test is, rather than left implicit. No other changes. Status UNCHANGED at `ready-for-dev`; nothing committed. | Claude Opus 5 (`bmad-create-story validate`) |
| 2026-08-13 | 0.2 | ✅ **ALL RULINGS CLOSED; Task 0 unblocked. No code written, nothing committed, status UNCHANGED at `ready-for-dev`.** BigDev ruled **D1–D7 as recommended** — including every sub-ruling (D1(i) `global` ⇔ empty set, (ii) sort+dedupe **at the producer**, (iii) `pariwar` ⇒ `[pariwarId]`, (iv) **no** null filter and no `!` assertion, because `grantScopeWellFormed` already guarantees non-null) and every ⛔ prohibition stated inside them. ⭐ **D3 is the consequential one**: the `state` arm **stays `deny`**, labelled *"Closed by [edit]"* with **NO successor minted**, on the zero-live/zero-backlog-consumer evidence and Story 1.18's own D4-R precedent — so its third stated reason is the durable one (no role holds a district-narrowable report key at a `state` ceiling), not another reason that expires on the next story. **Escalations dispositioned:** (1) accept the recommendation — edit `contribution_rate_by_district` for shape consistency, record its unreachability at the site, ⛔ invent no grant; (2) **revert-sanity MANDATORY** — the AC3 test must demonstrably go **RED** against the restored strict-`<` implementation and **GREEN** after restoration, both recorded with their real output; (3) D4's residual attribution ambiguity is **recorded with no successor and no additional audit mechanism**; (4) request→build scope drift **left unchanged** — the build-time re-resolution is deliberate and correct. ⛔ Two dispositions now carry a *deliberate no-owner* label (D3, Escalation 3); neither may be re-read as a deferral ([[feedback_closure_language_precision]] — the three labels are never collapsed). **PROVENANCE:** rulings are BigDev's, recorded verbatim in intent. Every code fact cited remains pinned at `6bd01ec`; **nothing is attested by a test run** — the Task 0 baseline is still owed BEFORE any edit. | BigDev |
| 2026-08-13 | 0.1 | Story authored from `epics.md:4185-4211` minted text at `main` @ `6bd01ec`. Full blast radius traced: **10 source files + 4 test files, zero migrations, zero contracts, zero UI, zero RBAC-catalog change.** Seven decisions (D1–D7) and four escalations **RAISED, awaiting BigDev's ruling** — Task 0 is BLOCKING. The load-bearing findings: (1) **AC4's `reports.spec.ts:124` is the WRONG FILE** under the obvious reading — two specs share the basename and the `apps/api` one at `:124` is an unrelated auditor test; the pin is `packages/domain/…/reports.spec.ts:147`. (2) **AC4 was half-discharged by Story 1.18 already**; what remains is that its stated reason *expires the moment AC1 lands* — the third stale reason in this chain. (3) **D3 evidence**: no role holds a district-narrowable report key at a `state` ceiling (`state_trustee` lacks `member.export_roster`), so AC5's state arm has zero live and zero backlog consumers — recommended **"Closed by [edit]", no successor**, on 1.18's own D4-R precedent, and AC4's verb (*"re-pinned **as a** query deny-deeper pin"*) independently presupposes it. (4) **Trap 1 is a privilege escalation**: `WHERE district IN ()` is a syntax error whose smallest fix drops the predicate and exports the full tenant — hence the mandatory D5 polarity pair. | Claude Opus 5 (`bmad-create-story`) |
