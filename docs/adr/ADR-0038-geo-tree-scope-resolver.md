# ADR-0038: The geo-tree scope resolver's source of truth is a versioned per-Pariwar registry table holding a JSONB tree document, with NO code-resident default

> **Status:** drafted
> **Date:** 2026-08-12 (date entered current status)
> **Author:** Solo Builder (BigDev), at Story 1.18 closure
> **Ratifying trustees:** — (populated at `ratified` status)
> **Supersedes:** —
> **Superseded by:** —

## Context

ADR-0008 Decision 4 committed the RBAC containment model: scope is `(dimension, value)` plus
**hierarchical containment**, and *"a strictly-narrower geo target (state→district) defers to an
**injectable geo-tree resolver**."* It then recorded a deferral:

> *"The canonical org tree lands with member/geo data in **Epic 3**, so the **default resolver denies
> deeper containment** (fail-closed) until one is supplied — a recorded deferral (geo-tree containment
> seam → Epic 3), not a faked org tree."*

⛔ **That deferral named an EPIC, and it expired unowned.** `member_postings.district` landed at Stories
3.1/3.9; all fourteen Epic 3 stories and the Epic 3 retrospective closed; **no resolver was built**,
because an epic carries no acceptance criteria and nothing owns it
([[project_r7_fact_producer_unbuilt]]). Seven epics passed with `denyDeeperGeoResolver` — `contains: () =>
false` — as the only implementation of the seam. Story 10.18 diagnosed the accumulated debt, split it
into two families, and minted **Story 1.18** as the named owner of the half a resolver can actually fix.

**This ADR is the control mechanism for the architectural property ADR-0008 Decision 4 committed**
([[feedback_architecture_vs_adr_boundary]]): the property is *"deeper geo containment resolves through an
injectable seam, fail-closed by default."* The property is unchanged and is **not** re-opened here. What
was never decided — and what this ADR decides — is **where the tree comes from**.

### The constraints that force the choice

1. **Purity is binding.** `hasPermission` is documented and tested as a **PURE, side-effect-free
   predicate** (ADR-0008 Decision 8; `check.ts:9-11`), and `GeoTreeResolver.contains` is **synchronous by
   interface** (`scope.ts:161-163`). The resolver therefore **cannot query the database**. Whatever the
   source of truth is, it must be readable into memory *before* the check and closed over. Making
   `contains` async would change the seam's interface, which is **architectural freeze row 9**
   (`epics.md:527`) and out of bounds for an implementation story.
2. **The tenant sits ABOVE the geography.** `GEO_RANK` places `pariwar: 1` above `state: 2`
   ([[project_rbac_geo_scope_containment]]). A Pariwar is the tenant; states are subdivisions *within*
   it. There is no cross-Pariwar national tree — each Pariwar owns its own `state → district → block`
   subtree.
3. **Only three edge kinds are ever reachable.** `scopeContains` returns `true` for any `pariwar` grant
   before the resolver is consulted (`scope.ts:236`), and denies a broader target before it
   (`scope.ts:232`). The resolver therefore only ever sees `state→district`, `state→block`,
   `district→block`. That is the entire surface.
4. **Fail-closed must remain the resting state.** A wrong tree silently **grants** authority; an absent
   tree merely denies. The asymmetry is the whole argument for what follows.

### Risk if the wrong choice is made

A geography seeded in code that does not match a Pariwar's actual administrative structure **widens
authorization silently** — no error, no log, no denial to notice. The failure mode of the current
fail-closed default is a visible 403; the failure mode of a wrong tree is an invisible allow.

## Decision

**The organizational tree is a versioned, per-Pariwar registry table (`geo_tree_versions`) holding one
JSONB tree document per version row, with NO code-resident default. A Pariwar with no published row has
NO tree: the loader returns `null`, the caller passes no resolver, and `denyDeeperGeoResolver` applies —
today's behaviour, byte-identical, by construction.**

Load-bearing details:

- **Posture = `helpdesk_routing_policy_versions`** (`packages/domain/src/helpdesk/registry.ts:1-19`),
  which is itself the `clause_versions` posture: append a new version row, never mutate a prior one
  except its `superseded_by_version` forward pointer; `(pariwar_id, version)` is unambiguous; exactly one
  in-force version per Pariwar; a typed conflict error on a concurrent version claim.
- **One JSONB document per row, not a row per node.** The document is read **once per request**, beside
  `request.scopeGrants` in the scope-resolution middleware, and closed over by a **pure, synchronous**
  resolver factory. This is what keeps constraint (1) cheap.
- ⭐ **NO version-1 code default.** This is the single deliberate divergence from the routing-policy
  precedent, which *does* ship `DEFAULT_ROUTING_POLICY`. There is no universally-correct Indian
  state→district→block tree, and per constraint (4) an absent tree is strictly safer than a guessed one.
- **Value comparison is byte-identical to the exact-node path.** `scope.ts:241` compares
  `grant.value === target.value` — strict, case-**sensitive**, untrimmed. The resolver applies **the same
  rule**, and a test pins the agreement. Normalizing on one path only would make
  `state=Bihar ⊇ district=patna` allow while `district=Patna ⊇ district=patna` denies — a contradiction
  **within a single request**.
- **Document validation rejects** cycles, a node whose parent is not strictly broader by `GEO_RANK`, and
  duplicate node values at the same dimension under one parent.
- **Tenant RLS**, mirroring `role_grants`, and the table joins the adversarial `cross-pariwar-leak`
  must-return-0 set — **a leaked org tree is a leaked authorization input**.
- ⛔ **No feature flag reaches the resolver, the loader, or the injection site.**
  `packages/domain/src/rbac` and `apps/api/src/modules/rbac` are `governance_boundary.yaml` **prohibited
  roots** (`:238`, `:289`); the new `packages/domain/src/geo-tree` root is admitted to that list, so a
  passing scan proves admissibility rather than merely proving the root is unlisted.

### What this ADR does NOT decide

- ⛔ It does **not** change `GEO_RANK`, `CEILING_RANK`, `scopeContains`'s ordering, the `GeoTreeResolver`
  interface, or the permission-key / scope-dimension model — **architectural freeze row 9**.
  - ⭐ **PRE-PRESENTATION CROSS-REFERENCE, added 2026-08-19.** ⛔ **This bullet remains TRUE of ADR-0038** —
    this ADR changed none of those things, and Story 1.18 landed without touching `rbac/scope.ts`.
    ⚠ What has changed is the **surrounding freeze**: **`ADR-0039`** (`ratified` 2026-08-19, Decision
    `2026-08-19-138`; substance ruled at `2026-08-19-134`) **amends architectural freeze row 9 narrowly**,
    moving dimension ordering out of the global rank table and into the published hierarchy document.
    ⭐ `ADR-0039` is, in its own words, *"precisely the ADR that ADR-0038 declined to be."*
    ⛔ A reader must therefore **not** infer from this bullet that freeze row 9 stands untouched. ⛔ The
    bullet is **not** edited; this note is the cross-reference ([[feedback_supersede_never_reinterpret]]).
- ⛔ It does **not** re-rank `pariwar` vs `state`. That would silently re-authorize every grant in the
  system and is its own ADR and its own story, if it is ever right.
- ⛔ It does **not** discharge the **rank-order** (Family A) denials. A resolver answers *"is X beneath
  Y"*; it can only ever narrow. A narrower grant authorizing a broader target is the ordering working
  correctly, not a missing capability. See `packages/domain/src/rbac/scope.ts` §RANK-ORDER.
- ⛔ It does **not** place `self` in the geo tree. `self` is orthogonal by design (`scope.ts:50-55`) and
  `GeoNode` excludes it **by type** (`:149`).
- ⛔ It does **not** supply **member→geo attribution** ("which members are in Patna"). A tree answers *"is
  Patna in Bihar"* and nothing more. That is **Story 1.19**.

## Alternatives considered

- **A projection over `member_postings` — REJECTED, and it is IMPOSSIBLE rather than merely undesirable.**
  `member_postings` carries `district text NOT NULL` and nothing else geographic
  (`schema/member_postings.ts:51`). **There is no `state` column and no `block` column anywhere in the
  schema** — verified across all applied migrations at `0100`. `helpdesk_tickets`'
  `MemberScopeContextSnapshot` (`:83-89`) *declares* `state`/`district`/`block`, and its only producer
  leaves **all three null** (`apps/api/src/modules/helpdesk/handlers.ts:10-15`), so it is a declared shape
  with no data behind it. A projection can enumerate the **set of district values in use**; it can supply
  **zero edges**. ⭐ **Ancestry cannot be projected from data that records no parent.** This is not a
  trade-off; the option does not exist.
  *Residual risk / revisit trigger:* if a future story adds real `state`/`block` columns to
  `member_postings` **with a recorded parent relationship**, a projection becomes expressible — but it
  would still be a *derived* geography competing with a *declared* one, which is its own governance
  question.

- **A code-resident constant (a seeded geography) — REJECTED.** There is no universally-correct Indian
  state→district→block tree; administrative boundaries are revised, and each Pariwar's operational
  geography need not match the official one. Per constraint (4) the failure modes are asymmetric: a wrong
  seeded tree **silently grants** authority with no signal, while an absent tree merely denies with a
  visible 403. A guessed geography is the one option that can make the system *less* safe than shipping
  nothing.
  *Residual risk / revisit trigger:* if every Pariwar in production converges on one published tree and
  re-entering it per tenant becomes pure friction, a **code-resident seed offered as a starting
  document** — copied into a tenant's row, never read as a fallback — would be a compatible follow-up. It
  must never become a default the loader falls back to.

- **A row-per-node table (`geo_nodes`) — REJECTED on cost, not on correctness.** It models the same
  information faithfully, but reconstructing ancestry costs an N-query walk or a recursive CTE **per
  request**, against constraint (1)'s requirement that the tree be in memory before a pure predicate
  runs. The single-document read is what makes purity cheap.
  *Residual risk / revisit trigger:* if a tree ever grows past what is sensible to read and hold per
  request, or if per-node metadata (codes, effective dates, per-node audit) becomes a requirement, the
  document shape stops paying. Revisit then — the seam does not change, only the loader.

- **Making `GeoTreeResolver.contains` asynchronous so it can query — REJECTED, out of bounds.** It would
  change the seam interface (freeze row 9) and destroy the purity ADR-0008 Decision 8 committed and the
  entire `tests/rbac/check.test.ts` matrix depends on.

## Consequences

- **Operational.** Publishing a tree becomes a per-Pariwar operational act with a real consequence:
  **it widens authorization.** A Pariwar that publishes `Patna ∈ Bihar` thereby lets every `state=Bihar`
  grant reach Patna-scoped targets. That is the intended capability, and it is exactly why the tree is
  declared per tenant rather than assumed. No runbook exists for tree publication yet — the writer
  surface is not part of Story 1.18.
- **Security.** The tree is an **authorization input**, so it inherits authorization-input handling:
  tenant RLS, membership in the cross-Pariwar adversarial leak set, and exclusion from feature-flag
  evaluation (the `governance_boundary.yaml` prohibited-root admission). A cross-tenant read of another
  Pariwar's tree would be a disclosure of that Pariwar's administrative structure **and** a potential
  authorization-widening vector.
- **Performance.** One additional indexed single-row read per request that resolves scope, on the same
  path that already loads `scopeGrants` — no per-check cost, no N+1, no query inside a predicate. The
  resolver's `contains` is an in-memory map walk over at most three edge kinds.
- **Cost.** Negligible: one small JSONB row per Pariwar per version.
- **Failure modes accepted.**
  - **A Pariwar with no tree keeps today's behaviour** — deeper geo containment denies. This is a
    *feature* of the design, not a gap, and it is what makes the change safe to land.
  - **A wrong-but-valid tree grants wrongly.** Validation catches cycles, rank inversions and duplicate
    siblings; it **cannot** catch a factually incorrect edge (`Patna ∈ Kerala` is structurally valid).
    That risk is accepted and is the price of a declared geography; the mitigation is that publication is
    an explicit, versioned, append-only, audit-visible act rather than an inferred one.
  - **Build-time re-resolution reads the newer tree.** `apps/jobs/src/reports-export.ts` re-resolves
    scope at build time, so a tree published between request and build is the one that applies. This
    matches the existing revoked-grant posture and is recorded rather than special-cased.
- **Migration / pivot path.** The seam is unchanged, so reversing this decision means replacing the
  **loader**, not the predicate. To revert entirely: stop passing a resolver at the injection sites and
  every call site returns to `denyDeeperGeoResolver` — which is precisely the AC8 revert-probe this
  story runs deliberately, so the reversal is a tested path rather than a hypothesis. To move to
  `geo_nodes` rows: the loader materializes the same in-memory document from a different query; nothing
  above the loader changes.

## References

- [Source: architecture.md §2.6 L1476-1496] — the RBAC containment property this ADR controls
- [Source: architecture.md §3.13 L2406-2421] — cross-Pariwar grant composition
- [Source: epics.md L510-527] — Architectural Freeze Boundaries, **row 9** (the seam, GEO_RANK, CEILING_RANK)
- [Source: epics.md, Story 1.18] — owning Story
- [Source: `docs/adr/ADR-0008-rbac-permission-model.md` Decision 4 + Decision 8 + §Consequences "Deferred seams"] — the deferred seam this ADR discharges. ⛔ **ADR-0008 is `ratified` and is NOT edited, re-read, or superseded by this ADR** ([[feedback_supersede_never_reinterpret]]); ADR-0038 **discharges** its Decision-4 seam and cross-references it.
- [Source: `.decision-log.md`, Decision 2026-08-12-102] — the authoring entry
- [Source: `docs/knowledge-transfer/adr-index.md`] — the live index row for this ADR
- [Source: `packages/domain/src/rbac/scope.ts:56-106, 147-174, 192-250`] — `GEO_RANK`, §RANK-ORDER, the seam, `scopeContains`
- [Source: `packages/domain/src/helpdesk/registry.ts:1-19`] — the versioned per-Pariwar registry precedent
- [Source: `packages/domain/src/schema/member_postings.ts:44-62`] — the only geo column that exists
- [Source: `governance_boundary.yaml:238, 289`] — the `rbac` prohibited roots
- Memory: [[feedback_architecture_vs_adr_boundary]] — discipline anchor
- Memory: [[feedback_supersede_never_reinterpret]] — why ADR-0008 is discharged, never re-read
- Memory: [[project_rbac_geo_scope_containment]] — the asymmetry this ADR must not disturb
- Memory: [[project_r7_fact_producer_unbuilt]] — *a deferral naming an EPIC expires unowned*

---

## Changelog

| Date | Status flip | Author | Notes |
|---|---|---|---|
| 2026-08-12 | (initial draft) | BigDev (Solo Builder) | Authored under Story 1.18 (Geo-Tree Scope Resolver), Task 2. `drafted` — trustee ratification is a named forward obligation this story may not assert ([[feedback_verify_before_committing_governance_claims]]). |
