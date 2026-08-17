---
baseline_commit: f225a76bf9514486c0ad58b6e62dfdd91f67b610
---

# Story 10.14: Permission Delegation `[SURFACE]`

Status: deferred-to-v2 (⛔ terminal, and a SUCCESSFUL outcome — see Decision `2026-08-17-126`)

Epic: 10 · Story: 14 · Key: `10-14-permission-delegation`
Authored: 2026-08-16 · Baseline: `main` @ `f225a76` (clean, fetched, `== origin/main`)

---

> ⛔ **NO CODE IS WRITTEN UNTIL THE ROUTING NOTE IS RULED.** Task 1 is a Trustee Panel routing note;
> Task 2 is the decision-log entry recording the ruling. Task 3 onward is gated on it
> ([[feedback_governance_commits_precede_implementation]]). This is the **10.13 shape**: the story is
> named after a surface, and the real question is upstream of the surface.

> ⛔ **QUESTION ZERO — IS FR-48 EVEN IN v1?** `prd.md:1325` enumerates the §4.7 v1 scope as
> *"(§4.7, FRs 44–47, 49–57, 58A, 58B, 58C)"* — **FR-48 is the single §4.7 FR omitted from that list.**
> `prd.md:1350` places it under *§6.2 Out of scope / may slip*: *"**Permission delegation with date
> range** — `[v1-S]` (FR-48); may slip to v2 depending on cadence."* Both verified live at authoring.
> ⇒ There is a defensible reading that **FR-48 is not in v1 at all**, and the cheapest correct outcome
> of this story may be a **ruled deferral**, not an implementation. Q1 asks exactly this and is
> **BLOCKING**. Building first and asking later spends the most governance-expensive story in Epic 10
> on a feature the PRD already flagged as cuttable.

> ⛔ **THE `[SURFACE]` LABEL IS WRONG. THIS IS PRIMITIVE-WEIGHT SECURITY WORK.**
> `[SURFACE]` means *"don't stand up a new primitive"* (`10-9-…md:131`). But at `f225a76`:
> `grep -rn "10\.14\|10-14\|FR-48" apps packages docs` → **ZERO hits**;
> `grep -rli "delegation\|delegatee\|delegator" packages apps` → two unrelated test files.
> Nothing exists. And **no prior Epic 10 `[SURFACE]` story has ever created an authority-bearing
> table** — 10.5/10.9/10.11/10.13 wrote *content* or *config*; this writes *authorization*. Treat the
> label as inherited, not as a scope statement. Q2 routes whether the label should be corrected.

> ⛔ **`role_grants` HAS ZERO PRODUCTION WRITE PATHS. THE GRANT ADMIN SURFACE WAS NEVER BUILT.**
> Every `INSERT INTO role_grants` / `DELETE FROM role_grants` in the tree is a **test fixture**
> (`apps/api/tests/integration/{scope-tx,admin-auth,channel-config,degraded-mode}.spec.ts`;
> `packages/domain/tests/integration/**`). There is no grant-admin route (`apps/api/src/modules/rbac/`
> is **one file with zero routes**; `openapi/v1.yaml` has **zero** rbac paths), no admin screen, no
> production `seedRoles()` caller, and `AuthzContext.bundles` — the FR-44 *"bundles editable by Super
> Admin"* seam at `packages/domain/src/rbac/check.ts:84-89` — is **never passed anything but
> `defaultRoleBundles`**. The code says so itself, twice:
> `apps/api/src/modules/rbac/index.ts:273-274` (*"NO `role_grants` revocation path at all"*) and
> `packages/domain/tests/rbac/roles.test.ts:532-536`.
> ⇒ This story would ship the **first production write into the authorization substrate**, and it
> would be a *delegation* write on a substrate with no *grant* write. You can lend a permission you
> hold; nothing in the product can give you one. **Q3 routes the ordering.**

> ⛔ **TWO PRE-EXISTING RE-EXAMINATION TRIGGERS FIRE ON THIS EXACT STORY.** Neither is optional and
> neither is this story's to defer. Both were verified verbatim at authoring.
>
> **Trigger A — `apps/api/src/modules/rbac/index.ts:273-283`:** *"there is currently **NO** Pariwar
> deactivation or suspension concept anywhere in the codebase, and **NO `role_grants` revocation path
> at all** … ⚠ **RE-EXAMINE THIS GATE BEFORE SHIPPING EITHER OF THESE:** … 2. A `role_grants`
> revocation path, or any flow that leaves grants behind on offboarding. In either case this gate needs
> a liveness/membership predicate **before** the feature ships, not after."*
> The gate is `requireGlobalOrAnyPariwarPermission`, which reads `loadGlobalActorGrants` — **BYPASSRLS,
> every tenant, no expiry predicate**. An expired delegation reaching it silently retains cross-tenant
> catalog access. **AC7 discharges this.**
>
> **Trigger B — `packages/domain/tests/rbac/roles.test.ts:532-536`:** *"⚠ THIS GATE'S REACH IS THE
> DECLARATIVE BUNDLES ONLY. It inspects `defaultRoleBundles`. There is NO SQL seed inserting
> `role_grants` rows, NO production caller of `seedRoles()`, and NO admin route that writes
> `role_grants` — the Story-1.9+ role-admin surface was never built — and static CI has no database.
> A grant written directly to the `role_grants` TABLE would NOT be caught here. **Re-trigger: the first
> story that builds a `role_grants` write path must extend this assertion.**"*
> The frozen holder set it pins is `member.suspend`'s. **AC8 discharges this.** ⚠ A delegation that can
> convey `member.suspend` un-pinned defeats a Story 10.18 gate by data rather than by code — which is
> exactly the reach the gate's own text admits it does not have.

> ⛔ **FREEZE ROW 9 — AND THE COMPLIANT PATTERN ALREADY EXISTS.** `epics.md:533` freezes *"RBAC
> permission-key + scope-dimension model | FR-44/45/46; 12 seeded roles; server-side enforcement
> (AR-26)"*; `epics.md:519`: *"Any change to a Frozen item requires an **ADR or trustee-ratified Sprint
> Change Proposal**."* "Effective permissions = own + active delegations" is a change to that model.
> ⭐ **Compose, do not amend** — the precedent is `apps/api/src/modules/rbac/index.ts:253-259`:
> *"This does NOT widen that rule or touch `packages/domain/src/rbac` (freeze row 9) — it **composes**
> the existing PURE `rbac.hasPermission` predicate twice at the HTTP-adapter layer."*
> ⛔ Do **not** edit `packages/domain/src/rbac/{scope,check}.ts` core semantics
> (`scope.ts:40,116-117,123-125,184-185` each say so). An **ADR is still owed either way** (AC9).

> ⛔ **`architecture.md:1510-1511`, VERBATIM, IS THE SHARPEST SINGLE OBSTACLE:**
> *"**No silent role escalation.** Role changes go through a dedicated audit-logged endpoint; **role
> modification requires Super Admin scope**; trustee discretion logged."*
> The epic AC has a **Pariwar admin** minting authority. FR-48 (`prd.md:783`) says a **trustee** does.
> `.decision-log.md:260` says **"a `pariwar_admin` is not the Board."** Three sources, three different
> authorities. **Q4 routes this and it is BLOCKING.** ⛔ Do not pick one in code.

> ⛔ **THE EPIC'S "PERMISSION CHECKS (STORY 1.8) READ BOTH" REACHES ONE OF ELEVEN READERS.**
> `role_grants` is read directly at **eleven** production sites. Wiring delegations into the request
> path alone leaves the other ten answering a *different* question about the same actor —
> [[feedback_mechanization_split_commitment]], where decay concentrates in the un-mechanized half:
>
> | # | Reader | What it decides |
> |---|---|---|
> | 1 | `apps/api/src/middleware/scope-resolution/index.ts:58` | ⭐ the request path — sets `request.scopeGrants`; **0 grants ⇒ 404 "Pariwar not found"** |
> | 2 | `apps/api/src/modules/rbac/index.ts:39` (`loadActorGrants`) | the per-gate fallback when `scopeGrants` is absent |
> | 3 | `apps/api/src/modules/rbac/index.ts:189` (`loadGlobalActorGrants`) | ⛔ **BYPASSRLS, all tenants** — Trigger A's gate |
> | 4 | `apps/api/src/modules/auth/admin/admin-session.handler.ts:53` | the session's advisory role list |
> | 5 | `apps/jobs/src/reports-export.ts:101` | ⛔ the BYPASSRLS worker's scope re-resolution |
> | 6 | `packages/domain/src/pool/fixed-amount-panel.ts:159` | ⛔ who may attest an **immutable Emergency Adjustment Record** |
> | 7 | `packages/domain/src/pool/fixed-amount-panel.ts:217` | the attestor picker's directory |
> | 8 | `packages/domain/src/claim/r9-voting-persist.ts:332` | ⛔ **R9 panel membership** |
> | 9 | `packages/domain/src/claim/appeal-panel-persist.ts:260` | ⛔ **appeal panel membership** |
> | 10 | `packages/domain/src/claim/appeal-panel-persist.ts:283` | the single-actor appeal read |
> | 11 | `packages/domain/src/claim/shepherd-assign-persist.ts:215,290` | shepherd eligibility |
>
> Rows 6–10 are the **key-as-credential** sites, and they make the split unresolvable by engineering
> judgement. Decision `2026-08-16-123` clause 2 (`[Trustee-ratified]`) **defines** an eligible emergency
> attestor as *"an actor holding `pool.fixed_amount_emergency` at this Pariwar … resolved from
> `role_grants` … evaluated by the pure `hasPermission` predicate"*. If a delegation satisfies that
> read, a `pariwar_admin` **manufactures a quorum-eligible attestor for 90 days by writing one row**,
> and a ratified definition has been *re-read* rather than superseded
> ([[feedback_supersede_never_reinterpret]]). If it does not, the epic's "read both" is **false** for
> the three governance panels that matter most. ⇒ **Q5 routes this. It is BLOCKING. Do not resolve it
> in code.**

> ⛔ **`EffectiveGrant` CANNOT EXPRESS A PERMISSION KEY.** `packages/domain/src/rbac/check.ts:59-64` is
> `{ pariwarId, role, scopeDimension, scopeValue }`. A key is only reached via
> `bundle.permissions.includes(key)` (`check.ts:184`) after `bundleLookup(grant.role)` (`:176`), and
> `role_grants.role` is plain `text` storing **roles, never keys** (`fixed-amount-panel.ts:83-89` makes
> this point explicitly). FR-44 agrees (`prd.md:749`): *"Roles are bundles of permission keys. Members
> are granted **roles** with scopes."* ⇒ The AC's `permission_keys[]` is **inexpressible in the current
> grant shape**, and `role_grants` cannot store it.
> ⭐ **The legal seam already exists:** `AuthzContext.bundles` (`check.ts:84-89`) — *"the admin path
> (Story 1.9+) passes the Super-Admin-edited set (FR-44) so the check honours edits without code
> change"* — and `bundleLookup` (`:121-127`) already handles arbitrary bundle sets. A delegation becomes
> a **synthetic single-use bundle** plus a synthetic `EffectiveGrant` naming it. Zero bytes change under
> freeze row 9. ⚠ `scopeWithinCeiling(grant.scopeDimension, bundle.scopeCeiling)` (`check.ts:179`) means
> the synthetic bundle needs a `scopeCeiling`, and getting it wrong **widens authority silently**.
> **D2 rules the shape.**

> ⛔ **AN OVER-BROAD DELEGATION FAILS SILENTLY, NOT LOUDLY.** `scopeWithinCeiling` and `scopeContains`
> make an over-broad grant **inert**, not an error — the loop just `continue`s (`check.ts:179-181`).
> `pariwar` (GEO_RANK 1) **outranks** `state` (2) — `scope.ts:78-125`, and ⛔ `:123-125` forbids
> "fixing" it. The "INERT ON ARRIVAL" failure mode is called out in ~8 places
> (`roles.ts:644-646`, `permissions.ts:757-760`, `.decision-log.md:266`).
> ⇒ **"within their own scope, never above" MUST be enforced at WRITE time and rejected loudly.** Never
> rely on the check-time predicate to catch it — a silently inert delegation reads to its author as a
> granted one.

> ⛔ **DELEGATION DEFEATS EVERY SEPARATION-OF-DUTIES CHECK IN THE SYSTEM, BECAUSE THEY ALL COMPARE
> IDENTITIES AND DELEGATION MOVES AUTHORITY WITHOUT MOVING IDENTITY.** There is **no
> delegator ≠ delegatee rule anywhere in the corpus** and the epic AC does not state one. Live checks:
> author ≠ reviewer (`prd.md:812`, FR-51); Stage-1 reviewer ≠ decision-maker (`prd.md:727`, FR-43A);
> Niyamavali §8.8 — the appeal is heard by *"a member of the Panel who did not take part in the act
> appealed against"*; SA-5's three-person rule. Each passes on identity while the authority behind it
> has moved. **Q6 routes the exclusion list.** ⛔ Do not invent one in code.
> ⭐ The in-repo enforcement precedent is `packages/domain/src/member/moderation/appeal-persist.ts:243`
> — the different-individual rule as a **typed 409 inside the scope transaction, never a 403**.

> ⛔ **RATIFIED NON-DELEGABILITY ALREADY EXISTS, AND THE AC HAS NO DENYLIST.** Verified verbatim:
> · Niyamavali §8.7 (`niyamavali.md:266`): the Trustee Panel is *"the Board of Trustees acting in a
>   moderation capacity, and **not a delegate committee**."*
> · Decision `2026-08-10-096` Q1 (`.decision-log.md:2609`): *"moderation is **not delegable to a subset
>   of the Board** without a further governance act"* — option (b), the shape that would have permitted
>   it, was **considered and not taken**.
> · Decision `2026-08-07-089` (`.decision-log.md:2982`): the Panel *"exclusively owns authorization to
>   activate Story 10.23's imposition flag. No other role holds it, and **it is not delegable**."*
> · Deed Cl. 20(h) (`trust-deed.md:251`) is the **only** delegation power in the Deed and it is
>   *organisational* — *"delegate administrative and operational functions … to committees,
>   office-bearers, employees, or agents, **while retaining ultimate responsibility**"* — not
>   per-permission, and not time-boxed. Cl. 10(a)'s *"the Board or its authorised delegates"* governs
>   **opening a Pool** and nothing else.
> · Panel-exclusive keys in the live catalog: `member.restore_terminated` (`permissions.ts:526-530`) and
>   `member.decide_moderation_appeal` (`permissions.ts:543-547`), whose comment warns that reusing an
>   adjacent key *"would reopen [the indistinguishability] at the one call site where the separation is
>   the entire mechanism."*
> · `epics.md:3780` (FR-58C capability bar) already prohibits *"(d) escalating actor permissions beyond
>   RBAC scope (Story 1.8)"* for flags. A delegation surface is precisely that vector by another route.
> ⇒ **Q6 must produce a ratified denylist.** ⛔ An author-invented denylist is not acceptable here.

> ⛔ **"ROLE TRANSITIONS / EMERGENCY HANDOFFS" ARE ALREADY GOVERNED — BY A STRICTER, NON-DELEGATION
> MECHANISM.** `docs/runbooks/trustee-credential-loss-succession.md:14-20`, verified verbatim:
> **SA-1** *"an ordinary admin never self-elevates"*; **SA-2** *"Super-Admin assignment requires trustee
> approval … **never an operator acting alone**"*; **SA-3** the continuity invariant; **SA-4** the
> anti-capture invariant; **SA-5** *"**Three-way separation of duties** … These three roles are held by
> **three distinct individuals**, named in the recovery log, for **every** change to the Super-Admin
> holder set."* Plus `:92` grant-before-revoke and `:119`'s forbidden-actions list.
> ⇒ As written, 10.14 is a **self-service bypass of that runbook** for every key below Super Admin.
> ⭐ The architecture's own posture for temporary authority is the break-glass rule
> (`architecture.md:3292-3295`): *"**Break-glass access must be time-bounded and audit-logged** —
> activation requires explicit operator action with a stated expiry; every direct-ingress request emits
> an audit line; **auto-revert at expiry unless explicitly renewed with re-justification**."* That is
> the shape to copy — and note *renewal is a new record with fresh justification, never an extension of
> the old one*.

> ⛔ **THE AUDIT CHAIN CANNOT CURRENTLY EXPRESS A DELEGATED ACT.** FR-47's line schema (`prd.md:770`)
> carries exactly one `actor_id`; Story 1.10's carries `actor_id` + `actor_role`. Neither has
> `on_behalf_of` or `via_delegation_id`. An auditor replaying the hash chain **cannot distinguish a
> delegated act from a native one** — the same indistinguishability Story 10.18 existed to end
> (`roles.ts:601-605`) — and it undercuts `prd.md:779`'s tamper-evidence claim. The epic AC's `audit_id`
> sits on the *delegation record*, not on the *acts performed under it*. **D4 rules whether acts carry
> the delegation reference.**

> ⚠ **THREE AC CLAUSES HAVE NO RATIFIED SOURCE.** `[Author-committed]` epic text, not PRD, not Panel —
> recorded so the dev agent does not mistake them for requirements:
> 1. **"an *admin* can delegate"** — FR-48 says *trustee*. See the `architecture.md:1510` banner.
> 2. **"max 90 days; configurable"** — nothing in the PRD bounds a delegation. Every other "90 days" in
>    the PRD is FR-15 fixed-amount notice; the phrasing mirrors FR-49's *"5,000 items per batch in v1
>    (configurable)"* (`prd.md:793`). **Unratified.** D3 rules it.
> 3. **"vacation coverage / role transitions / emergency handoffs"** — none of these three phrases
>    appears anywhere in the PRD.

---

## Story

As the authority the governing instruments actually vest with the power to lend a permission,
I want a time-bounded, revocable, audit-evidenced delegation that **every** authorization reader honours
identically — and that **cannot** convey the keys the Deed, the Niyamavali and four ratified decisions
have already declared non-delegable,
so that vacation cover stops being an informal password hand-off, without the delegation surface
becoming the escalation route that Story 10.18, Decision `2026-08-07-089` and the FR-58C capability bar
each exist to close.

---

## What this story is, in one paragraph

FR-48 is two sentences long (`prd.md:783`) and is the one §4.7 FR the PRD left out of its own v1 scope
list. Everything else the epic asserts — `permission_keys[]`, the scope-subset rule, the 90-day cap,
"configurable", the effective-permissions union — is epic authorship. Meanwhile the substrate it names
is frozen (row 9), has **no production write path**, cannot represent a key-subset grant, is read
directly by **eleven** call sites of which five decide **panel membership**, and carries **two standing
re-examination triggers that name a `role_grants` write path as their firing condition**. So this story
is **governance first and engineering second**: a routing note with six blocking questions, a ratified
denylist, an ADR against freeze row 9 — and only then a table, a write-time containment guard, one
request-path load, and a small admin screen. **The Panel may rule that the correct v1 answer is
`deferred`, and that outcome is a success, not a failure.**

---

## ⛔ The governance half lands first

Task 1 (routing note) and Task 2 (decision-log entry) commit **alone**, with `governance:` prefixes and
**zero** `packages/` or `apps/` files, before any implementation commit
([[feedback_governance_commits_precede_implementation]]). History must read governance → implementation.
⛔ Commit manually — branch + selective stage, **not** `commit-story` ([[project_story_automator_ops]]).

**Decision-log head, verified live at authoring:** `2026-08-16-125` (`.decision-log.md:37`). The ruling
entry therefore takes **`2026-08-16-126`** — ⚠ **re-verify the head at ruling time** and number from
whatever is then head; if the ruling lands on a later date the entry takes that date. Per Decision
`2026-08-09-095` the entry must label **per-clause provenance** (`[Trustee-ratified]` /
`[Author-committed]` / author finding).

⛔ If the ruling amends Niyamavali or the Deed, the amended text must be reproduced **verbatim in both
locales inside the decision entry** — `docs/legal/` is gitignored (verified: `git check-ignore -v
docs/legal/niyamavali.md` → `docs/legal/`), so the entry is the **only durable copy**.

---

## Boundary

### In scope

1. The Trustee Panel routing note (Q1–Q6) and the decision-log entry recording its ruling.
2. An ADR against architectural freeze row 9 recording the compose-don't-amend design.
3. `permission_delegations` — a new tenant-scoped, RLS'd, append-only-terms table + migration `0109`.
4. A **write-time** containment guard: delegated keys ⊆ the delegator's own effective keys; delegated
   scope ⊆ the delegator's grant scope; the ratified denylist; delegator ≠ delegatee.
5. **One** request-path load of active delegations, in `scope-resolution`, beside `scopeGrants`.
6. Delegation-aware answers at **every** reader the ruling says must see them (Q5's output).
7. Revocation, and the derived-at-read expiry window.
8. The admin surface: create, list with derived state, revoke-with-confirmation.
9. Discharging **both** standing re-examination triggers (AC7, AC8).

### Out of scope — explicitly, with the disposition recorded

| Item | Disposition |
|---|---|
| A general **role-grant admin surface** (FR-44/FR-46, the Story-1.9+ gap) | ⛔ **Not built here.** Q3 routes whether 10.14 may ship before it. If the Panel rules it must not, this story's successor is a role-grant surface story, and 10.14 becomes `blocked`. Record either way. |
| Editing **role bundles** at runtime (FR-44's *"editable by Super Admin"*) | Resolved via explicit deferral. `AuthzContext.bundles` stays fed `defaultRoleBundles` for native grants; the synthetic-bundle seam is used **only** for delegations. |
| **Super-Admin** delegation | ⛔ Out of scope by SA-1…SA-5. The succession runbook governs it and this story does not touch it. Name it in the routing note so the exclusion is ruled, not assumed. |
| An `on_behalf_of` / `via_delegation_id` column on the **audit chain** | D4. If ruled in, it is a `[PRIMITIVE]`-weight change to Story 1.10's substrate and gets its **own** story — not a rider here. |
| Member-side delegation | ⛔ Not applicable. Members hold no `role_grants` rows; an actor is a `users` row (`schema/users.ts`). |
| Extraction of the three-instance `assertPanelAuthorized` pattern | ⛔ Still not now ([[feedback_no_premature_package]]); a fourth instance does not change the answer. |
| `PERMISSION_CATALOG_VERSION` as a delegation epoch | ⛔ It cannot express per-actor, per-time variance. Do not overload it. |

---

## Acceptance Criteria

> **AC source map.** AC1–AC2 are governance and have no epic source — they exist because the epic's
> single BDD block cannot be implemented without them. AC3–AC6 re-express `epics.md:3942-3946`.
> AC7–AC9 are the standing obligations this story is the named trigger for. Every divergence from the
> epic's literal wording is called out inline.

### AC1 — The routing note is authored and RULED before any code `[GOVERNANCE, BLOCKING]`

**Given** the eleven readers, the two triggers, freeze row 9, and four ratified non-delegability rulings
**When** Task 1 runs
**Then** `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-08-16-story-10-14.md` exists,
carrying **Q1–Q6 with every option's cost stated and a non-binding ⭐ recommendation per question**, in
the format of `trustee-panel-routing-note-2026-08-16-story-7-11.md`
**And** it states per question **what a non-answer would mean** ([[feedback_record_unattested_no_backfill]])
**And** ⛔ **no `packages/` or `apps/` file is modified until the ruling is recorded.**

### AC2 — The ruling is recorded, with per-clause provenance `[GOVERNANCE, BLOCKING]`

**Then** a single `.decision-log.md` entry (`2026-08-16-126` from the verified head) records the ruling,
labels each clause `[Trustee-ratified]` / `[Author-committed]` per Decision `2026-08-09-095`, and — if
Q1 rules **defer** — says so in terms, flips `development_status[10-14-permission-delegation]` to a
deferred state, and **stops**. ⛔ A deferral is a legitimate terminal outcome and must not be reworded
into a partial build ([[feedback_closure_language_precision]]).

### AC3 — The record: append-only terms, a revocation leg, and a SNAPSHOTTED cap

**Given** the ruled shape
**When** the table lands
**Then** `permission_delegations` carries the epic's fields — `delegator_actor_id`, `delegatee_actor_id`,
`permission_keys[]`, scope as **`(scope_dimension, scope_value)`** (⚠ **reconciling** the epic's bare
`scope`, which is unimplementable: ADR-0008 Decision 5 makes a grant a `(dimension, value)` tuple, never
a bare enum), `valid_from`, `valid_until`, `reason`, `audit_id` — plus
`delegator_display` / `delegatee_display` snapshots ([[project_admin_display_name_attribution]])
**And** `valid_from` is **inclusive**, `valid_until` **exclusive**, both `NOT NULL`, with
`CHECK (valid_until > valid_from)` — the 10.9 convention (`10-9-…md:247-249`), not a new one
**And** ⭐ **the maximum-span cap is a column SNAPSHOTTED at grant time, never re-read from live config**
— 10.23's version-pin lesson (`member_restoration_impositions.ts:13-18`): a later re-tune of a
"configurable" bound must **never retroactively move an existing delegation's window**
**And** the **terms are immutable by privilege**: column-level `GRANT` gives `UPDATE` to
`revoked_at` / `revoked_by_actor_id` / `revocation_audit_id` **only** — the `0107`/`0108` posture, whose
header records that this class of defect is invisible to typecheck and unit tests and is caught **only**
by a live-DB spec
**And** ⛔ **no projector, no `current_state`, no state-writer trigger, no CI state-invariant gate, no
`events_log` stream, no `packages/events` registration** — the `[SURFACE]` precedent (`10-9-…md:131`,
`feature_flag_versions.ts:9-19`). Delegation is a registry row, not a 6th state machine.

### AC4 — The write-time guard, fail-closed and LOUD `[THE TEETH]`

**Given** `scopeWithinCeiling`/`scopeContains` make an over-broad grant **inert rather than rejected**
**When** a delegation is created
**Then** the server, **inside the scope transaction**, refuses with a **typed, audited** error when any
of these holds — evaluated in this order so the reported reason is the true one:
  1. a requested key is on the **ratified denylist** (Q6) → `403`
  2. `delegator_actor_id === delegatee_actor_id` → **`409`**, not 403 (the
     `appeal-persist.ts:243` precedent: a different-individual rule is a conflict, not an authz failure)
  3. a requested key is one the **delegator does not themselves hold** at the requested
     `(dimension, value)` — proven by the **pure `hasPermission`** over the delegator's own grants loaded
     inside the tx, the `assertFixedAmountPanelAuthorized` shape verbatim → `403`
  4. the requested scope is **not contained** in the delegator's own grant scope → `403`
  5. the span exceeds the ruled cap → `422`
**And** the refusals **read as governance refusals, not validation errors** — the
`CustomFieldsPage.tsx:56-63` doctrine: *"an operator told only 'invalid' will try variations until
something sticks, which is precisely how a fence gets walked around."*
**And** ⛔ **no client-side capability hiding** (`FixedAmountPage.tsx:56-59`, `CustomFieldsPage.tsx:17-21`):
the picker is convenience, the server is the boundary.
**And** creating **and revoking** a delegation are **step-up gated** — AR-24 (`epics.md:291`) names
*"staff privilege escalation/**role grant**"* explicitly — via `requireStepUp(deps, actionContext)`
(`apps/api/src/modules/step-up/gate.ts:16-28`), registered **after** the permission hook so an
unauthorized actor never reaches OTP (`pool-fixed-amount/index.ts:17`).

### AC5 — One load, one place, and it stays PURE

**Given** ⛔ `hasPermission` is pure + synchronous by contract (ADR-0008 Decision 8) and
`GeoTreeResolver.contains` is sync **by interface** — *"Making `contains` async would change the seam's
interface, which is **architectural freeze row 9**"* (ADR-0038)
**When** delegations reach the request path
**Then** they are loaded **exactly once per request** in
`apps/api/src/middleware/scope-resolution/index.ts`, beside `scopeGrants` and `geoTree`, and stashed on
the request — the middleware's own stated rule: *"loaded once here, consumed synchronously by every
downstream gate"*
**And** they are composed via `AuthzContext.bundles` as **synthetic single-use bundles** (D2), so
`packages/domain/src/rbac/{check,scope}.ts` are **byte-unchanged**
**And** ⛔ **no query inside a predicate, no `async` on any seam, no cross-request permission cache.**
There is none today (`request.scopeGrants` is per-request only), which is **why revocation takes effect
on the next request by construction** — do not introduce one and then have to invalidate it.

### AC6 — Membership vs permission: the 404 leg is NOT widened

**Given** `scope-resolution/index.ts:58-61` treats **zero grants as "Pariwar not found" (404)** — grant
presence **is** tenant membership
**When** a delegatee holds a delegation but **no** native `role_grant` in that Pariwar
**Then** the ruled behaviour is implemented **explicitly and tested**: ⭐ recommended arm — the 404
membership leg reads **native grants only**, so a delegation confers a *permission*, never *membership*
**And** the reason is recorded at the call site: folding delegations into that array would make a
delegation silently convey tenancy, which no ratified source authorises
**And** ⚠ the `scope.change` audit emits `roles: grants.map(g => g.role)` (`:82`) — a synthetic
delegation bundle must not pollute that list with a fake role name. D2 covers the naming.

### AC7 — Trigger A is DISCHARGED, not deferred

**Then** `requireGlobalOrAnyPariwarPermission` (`apps/api/src/modules/rbac/index.ts:285-318`) gains the
**liveness predicate its own comment demands before this feature ships**, and
`loadGlobalActorGrants` — BYPASSRLS, every tenant — **cannot** return an expired or revoked delegation
**And** the `:274-283` comment block is **rewritten to the post-story truth**, not left asserting "NO
`role_grants` revocation path at all" two lines above the story that built one (the 10.28 review's
"stale reason left behind" class)
**And** a **revert-sanity** run proves the new predicate has teeth: remove it, watch the test go RED,
record the RED output ([[project_gate_scope_semantic_coverage]] — a green scan proves nothing).

### AC8 — Trigger B is DISCHARGED: the holder-set gate is extended to the write path

**Given** `packages/domain/tests/rbac/roles.test.ts:533-537` — *"Re-trigger: the first story that builds
a `role_grants` write path must extend this assertion"*
**Then** the `member.suspend` frozen-holder-set assertion is extended so a **delegation** cannot convey a
key whose holder set is frozen, and the extension is asserted, not skipped
**And** ⛔ the gate's honest reach is restated rather than overclaimed: it inspects data structures, and
whatever it still cannot see is written down.

### AC9 — The ADR, the capability bar, and the registers

**Then** a new ADR records the compose-don't-amend design against **freeze row 9**, cites
`epics.md:519`'s *"ADR or trustee-ratified Sprint Change Proposal"*, and is added to
`docs/knowledge-transfer/adr-index.md` as `drafted` — ⛔ **`drafted`, not `ratified`**; trustee
ratification is a forward obligation this story may not assert
([[feedback_verify_before_committing_governance_claims]])
**And** the new delegation module root is **admitted to `governance_boundary.yaml`'s `prohibited` list**
under prohibition (d), following the Story 1.18 `geo-tree` precedent verbatim — its own reasoning
applies here without change: *"a passing scan over an unlisted root proves the root is unlisted, not
that the behaviour is admissible."* ⛔ An authorization input left unlisted makes every future scan of it
vacuous
**And** `epics.md:3934-3946` is corrected for the `[SURFACE]` label (Q2) and the bare-`scope` field
(AC3), and `prd.md`'s FR-48/§6.1/§6.2 inconsistency is recorded — ⛔ **surfaced for ratification, never
silently edited** ([[feedback_supersede_never_reinterpret]])
**And** `deferred-work.md` records every disposition with the exact vocabulary of
[[feedback_closure_language_precision]] — "Closed by [implementation]" vs "Resolved via explicit
deferral" vs "Not addressed", never collapsed.

---

## 🚨 Decisions — ⏳ **ALL OPEN. NOTHING BELOW IS RULED.**

⚠ Every ⭐ is a **non-binding** author recommendation. ⛔ Silence is not assent — each records what a
non-answer would mean.

### Q1 — `[BLOCKING]` Is FR-48 in v1 at all?
`prd.md:1325` omits FR-48 from the §4.7 v1 list; `prd.md:1350` lists it as may-slip.
**(a)** Confirm v1 — implement. **(b)** ⭐ **Defer to v2** — record as "Resolved via explicit deferral",
close the story, and let the two standing triggers be discharged by whichever story next writes
`role_grants`. **(c)** Confirm v1 but **narrowed** (e.g. a single-key, single-scope, 14-day emergency
delegation) — the smallest shape that satisfies the stated *why* without the escalation surface.
⭐ Recommend **(b) or (c)**. *Non-answer:* the story cannot start; every later question is moot.

### Q2 — Is `[SURFACE]` the right label, and is `epics.md` corrected?
⭐ Recommend correcting to `[PRIMITIVE]`. *Non-answer:* the label keeps signalling "no new primitive"
over a story that creates an authority-bearing table — a reader-facing misstatement.

### Q3 — `[BLOCKING]` May a delegation surface ship before a role-grant surface exists?
⭐ Recommend **no** in principle, **yes** in practice **only if** Q1 lands on (c). *Non-answer:* the
system ships a way to lend authority before a way to confer it.

### Q4 — `[BLOCKING]` Who may delegate? Trustee (FR-48), Pariwar admin (epic), or Super Admin (`architecture.md:1510`)?
⭐ Recommend the ruling name the authority **explicitly** and reconcile `architecture.md:1510` — either
by amendment or by holding that a delegation is categorically **not** a "role modification". ⛔ Do not
let three sources stand. *Non-answer:* the dev agent picks one, and picking is a governance act.

### Q5 — `[BLOCKING]` Which of the eleven readers must see delegations?
⭐ Recommend: **the request path yes; the five key-as-credential readers (rows 6–10) NO**, with the
asymmetry **stated in the ruling** — eligibility to sit on a governance panel is a standing capacity, not
a lent one, and Decision `2026-08-16-123` clause 2 defined it against `role_grants`. If the Panel rules
otherwise, clause 2 must be **superseded in terms**, never re-read.
*Non-answer:* the epic's "read both" ships as a half-truth and the split-brain is permanent.

### Q6 — `[BLOCKING]` The ratified non-delegable denylist.
⭐ Recommend at minimum: `member.restore_terminated`, `member.decide_moderation_appeal`, `member.moderate`
and `member.suspend` (Niyamavali §8.7 + `2026-08-10-096`), `claim.r9_vote`, `claim.appeal_vote`,
`pool.fixed_amount_emergency` (panel-membership credentials), the 10.23 imposition-flag key
(`2026-08-07-089`), and any future key that gates delegation itself.
⭐ Recommend the denylist be **data with a golden-set test**, not scattered `if`s.
*Non-answer:* ⛔ **the story stops.** An author-invented denylist over ratified non-delegability is
exactly the overreach [[feedback_supersede_never_reinterpret]] forbids.

### D1 — One key or two? (`permission.delegate` / `permission.revoke_delegation`)
⭐ Recommend **one** (`permission.delegate`), catalog **35 → 36**, keys **43 → 44**. ⚠ `PERMISSION_KEY_REGEX`
admits **exactly one dot** (`permissions.ts:49`) — `permission.delegation.create` is invalid.

### D2 — The synthetic-bundle shape
⭐ Recommend a per-delegation bundle `{ role: \`__delegation:\${id}\`, permissions: <keys>, scopeCeiling: <the delegation's own dimension> }`
passed via `ctx.bundles`, with a synthetic `EffectiveGrant` naming that role. ⚠ Must not leak into the
`scope.change` audit's `roles` list (AC6) or into `SeededRoleSchema` (whose options are asserted
**order-exact** against `defaultRoleBundles`).

### D3 — The cap: 90 days, or the ruled number, and is it configurable?
⭐ Recommend a **ruled constant, snapshotted per row** (AC3). ⛔ "Configurable" without a snapshot is the
FR-8 hazard 10.23 exists to prevent.

### D4 — Do acts performed under a delegation carry the delegation reference?
⭐ Recommend **yes in the `auditSink` context** (cheap, additive: new `AuthAuditEventType` members
`delegation.granted | delegation.revoked`, plus a `viaDelegationId` in the denial/act context) and
**no** on the FR-47 hash-chained line in this story (a `[PRIMITIVE]` change to Story 1.10's substrate,
owed its own story). *Non-answer:* the audit trail cannot distinguish a delegated act — record it as a
**named, accepted limit**, never leave it implied.

### D5 — Does grant/revoke rotate the admin session?
`architecture.md:1455-1456`: *"Session-ID rotation on auth-state change. Login, **role change**, password
reset … all rotate the session ID."* ⭐ Recommend **yes on revoke** at minimum. *Non-answer:* a revoked
delegatee keeps a session minted under the old authority.

### D6 — Renewal: extend the row, or mint a new one?
⭐ Recommend **mint a new record with fresh justification** — `architecture.md:3294`'s break-glass rule
(*"unless explicitly renewed with re-justification"*) plus AC3's immutable terms make extension
incoherent.

---

## ⚠ Escalations

**E1 — `apps/jobs/src/reports-export.ts:101` re-resolves scope on the BYPASSRLS worker pool.** If Q5
rules delegations visible to workers, this reader needs the same expiry predicate as AC7's, and
[[project_reports_exports_surface_substrate]]'s explicit-`pariwar_id` discipline applies. If not, say so
at the call site. ⛔ Neither answer may be left implicit.

**E2 — The UX specification contains no delegation surface, no multi-select grammar, and no
"effective permissions" viewer.** Verified: the spec's only "on behalf of" grammar is
`<ClaimProxyFlowShell>`'s *"Filing on behalf of…"* banner (`ux-design-specification.md:1961`). Building a
richer surface means **inventing UX**. ⭐ Recommend the **Story 10.12 posture** verbatim
(`CustomFieldsPage.tsx:5-9`): ship the minimum the AC compels, and record the owed UX pass as an
escalation rather than inventing grammar.

**E3 — WCAG.** `ux-design-specification.md:1181` allows a named v1 gap on Tier-2 staff surfaces but
requires the gap be **named and tracked**; `:2629-2637` makes an inaccessible admin path *"a defect, not
a configuration"*. Name it or meet AA — do not ship silence.

**E4 — Cost on every admin request.** `openScopeTx` + `loadActorGrants` + `loadGeoTree` is already 2
queries per admin request; a delegation load is a 3rd, on **every** admin route, to serve a feature the
PRD marked may-slip. Feeds Q1(c).

---

## Tasks / Subtasks

### Coverage matrix — every AC → its task(s)

| AC | Tasks |
|---|---|
| AC1 — routing note ruled | 1 |
| AC2 — ruling recorded | 2 |
| AC3 — the record + migration 0109 | 4, 5 |
| AC4 — the write-time guard | 6, 7, 10, 11 |
| AC5 — one load, stays pure | 8, 11 |
| AC6 — membership ≠ permission | 8, 11 |
| AC7 — Trigger A discharged | 9, 11 |
| AC8 — Trigger B discharged | 9, 11 |
| AC9 — ADR, capability bar, registers | 3, 12 |

### Task 0 — Branch, baseline, rulings (AC: all)
- [x] `git fetch origin` ([[feedback_git_fetch_before_remote_reasoning]]). Branch
      `governance/10-14-permission-delegation` off **`f225a76`**, clean tree, verified `== origin/main`.
- [x] **Baseline the suites BEFORE any edit**, real numbers: `pnpm --filter @twt/domain test tests/rbac/`,
      `pnpm --filter @twt/contracts test`, `pnpm --filter @twt/api test tests/unit/`, and the live-DB
      `packages/domain/tests/integration/rls/role-grants-policy-regression.spec.ts` +
      `.../multi-tenant/cross-pariwar-leak.spec.ts`. ⛔ A baseline taken after an edit is not a baseline.
- [x] Re-derive **every** line anchor in this file against the working tree; record **drift or ZERO
      DRIFT** explicitly.
- [x] Re-verify the `.decision-log.md` head (`2026-08-16-125` at authoring) and the next free migration
      number (`0109` at authoring).

### Task 1 — `governance:` — the routing note (AC: 1) — **COMMITS FIRST, BLOCKING**
- [x] Author `trustee-panel-routing-note-2026-08-16-story-10-14.md` carrying **Q1–Q6** with per-option
      costs, ⭐ non-binding recommendations, and per-question *"what a non-answer would mean"*. Follow
      `trustee-panel-routing-note-2026-08-16-story-7-11.md`'s structure.
- [x] Reproduce the four non-delegability rulings **verbatim with citations** (`niyamavali.md:266`,
      `.decision-log.md:2609`, `.decision-log.md:2982`, `trust-deed.md:251`) — the Panel must see what it
      already ruled.
- [x] ⛔ **Zero `packages/` and `apps/` files in this commit.** ⛔ **STOP HERE until ruled.**

### Task 2 — `governance:` — the decision-log entry (AC: 2) — **COMMITS SECOND**
- [x] Append the entry (number from the **live** head), per-clause provenance per `2026-08-09-095`.
- [x] ⛔ If Q1 rules **defer**: record it, flip sprint status, update `deferred-work.md`, and **STOP**.
      Tasks 3–12 do not run. That is a complete, successful outcome.

> ⛔ **TASKS 3–12 DID NOT RUN, AND THEIR BOXES STAY UNCHECKED — DELIBERATELY.**
> Decision `2026-08-17-126` cl. 1–2 ruled **Q1 = (b), FR-48 deferred to v2**, and Task 2's own terms
> say so: *"If Q1 rules **defer**: record it, flip sprint status, update `deferred-work.md`, and
> **STOP**. Tasks 3–12 do not run. That is a complete, successful outcome."*
> ⛔ **An unchecked box here means "correctly not done", not "left undone"** — the two are different
> and are never collapsed ([[feedback_closure_language_precision]]). Nothing below was built: no ADR,
> no `permission_delegations` table, no migration `0109`, no contracts, no catalog key
> (`PERMISSION_CATALOG_VERSION` stays **35**, key count stays **43**), no write-time guard, no
> request-path load, no admin surface, no tests, no `governance_boundary.yaml` admission.
> ⚠ **AC7 and AC8 are therefore NOT satisfied, and are not claimed to be.** Both triggers are recorded
> as **"Not addressed" and ARMED** in `deferred-work.md`, ⛔ never as discharged.

### Task 3 — The ADR (AC: 9)
- [ ] `docs/adr/ADR-00NN-permission-delegation.md` — the compose-don't-amend design against freeze row 9;
      the synthetic-bundle seam (D2); the eleven readers and Q5's ruled answer; the denylist mechanism.
- [ ] Add an `adr-index.md` row as **`drafted`**. ⛔ Not `ratified`.

### Task 4 — Schema + migration `0109` (AC: 3)
- [ ] `packages/domain/src/schema/permission_delegations.ts` — fields per AC3, following
      `member_restoration_impositions.ts` for the append-only posture and `banners.ts:175-176,220` for the
      window columns + `CHECK`.
- [ ] **Hand-author** `packages/domain/migrations/0109_permission-delegations.sql` with the
      hand-supplemented `ENABLE` + `FORCE ROW LEVEL SECURITY`, the Story-1.6 closed-failure RLS construct,
      and **column-level `GRANT`s** so only the revocation columns carry `UPDATE`.
      ⛔ **Do NOT run `drizzle-kit generate`** — snapshots stop at `0020`; regenerating an applied
      migration is the `42P07` footgun ([[project_live_db_test_gotchas]]). Copy `0108`'s header style.
- [ ] Append `_journal.json` by hand: `idx: 109`, matching `version`/`when` cadence.
- [ ] `packages/domain/src/policies/permission-delegations-rls.ts` + re-export.

### Task 5 — Contracts (AC: 3)
- [ ] `packages/contracts/src/rbac/delegation.ts` — `.strict()` Zod, reusing `ScopeDimensionSchema` +
      `PermissionKeySchema`. ⛔ **No `@twt/domain` import** ([[project_contracts_domain_bundle_boundary]]).
- [ ] Pure `deriveDelegationState(row, now)` → `scheduled | active | expired | revoked`, `now` **injected**
      — the `banners/display-state.ts:25-32,66-78` posture: *a derivation, **never** a persisted column*.
- [ ] Register `components/schemas` in `emit-openapi.ts`; re-emit; determinism byte-stable.

### Task 6 — The catalog key (AC: 4) — **D1**
- [ ] Append the key to `SEED_PERMISSION_KEYS` with the mandatory **reuse-check comment block**
      (`permissions.ts:718-760` is the exemplar). Bump `PERMISSION_CATALOG_VERSION` 35 → 36 **with a
      `── Bumped 35 → 36 at Story 10.14 ──` block**.
- [ ] Extend the pinned assertions: `tests/rbac/permissions.test.ts:54` (version) **and** `:56` (key
      count 43 → 44) — extending the inline changelog, not replacing it.
- [ ] Add the handle in `roles.ts` and place it in the ruled bundle(s) only. ⛔ Not `state_trustee` /
      `district_admin` — a state/district-ceiling grant can never satisfy a pariwar-dimension check and
      would be **INERT ON ARRIVAL**.

### Task 7 — The write-time guard (AC: 4) — **THE TEETH**
- [ ] `packages/domain/src/rbac-delegation/guard.ts` (⛔ **not** under `packages/domain/src/rbac/` — that
      root is frozen and governance-boundary-prohibited): the five ordered refusals, each a typed error.
- [ ] Copy `assertFixedAmountPanelAuthorized`'s shape **verbatim** (`fixed-amount-panel.ts:140-173`): raw
      `pg.PoolClient`, one query inside the scope tx, the **pure** `hasPermission` per key, fail-closed on
      the first miss.
- [ ] Delegator ≠ delegatee as a **409** (`appeal-persist.ts:243` precedent), mapped in
      `apps/api/src/middleware/error-mapping/index.ts`.
- [ ] Denylist as **data + a golden-set test** (Q6's ruled list).
- [ ] ⛔ Any dynamic `.limit()` must be an **integer literal** or `clampLimit(...)` — a named `const` fails
      the domain-accessor gate ([[project_domain_limit_clamp_and_savepoint_retry]]).

### Task 8 — The request-path load (AC: 5, 6)
- [ ] `apps/api/src/middleware/scope-resolution/index.ts` — load active delegations once, beside
      `scopeGrants`/`geoTree`; stash on the request; declare the decoration in `apps/api/src/types.ts`.
- [ ] ⛔ The **404 membership leg (`:60-61`) reads NATIVE grants only** (AC6's ruled arm) — with the reason
      recorded at the call site.
- [ ] Compose via `AuthzContext.bundles` at the gate. ⛔ `packages/domain/src/rbac/{check,scope}.ts`
      **byte-unchanged** — prove it with `git diff --stat`.
- [ ] ⛔ Keep the `scope.change` audit's `roles` list free of synthetic bundle names.

### Task 9 — Discharge BOTH triggers (AC: 7, 8)
- [ ] **Trigger A:** add the liveness predicate to `requireGlobalOrAnyPariwarPermission`; ensure
      `loadGlobalActorGrants` cannot return an expired/revoked delegation; **rewrite the `:274-283`
      comment to the post-story truth**.
- [ ] **Trigger B:** extend `roles.test.ts`'s frozen-holder-set assertion to the write path; restate its
      honest reach.
- [ ] **Revert-sanity ×2** — remove each guard, record the **RED** output. A test that cannot be made to
      fail proves nothing ([[project_gate_scope_semantic_coverage]]).

### Task 10 — The admin surface (AC: 4) — **E2's minimum**
- [ ] `apps/admin/src/modules/permission-delegation/` + a thin `routes/PermissionDelegationRoute.tsx` at
      `/p/$pariwarId/permission-delegation`; register in `router.tsx`.
- [ ] Local `i18n-en.ts` exporting `resolveEn`, imported as `t`. ⛔ **Do NOT add keys to
      `packages/i18n/locales/**`** — that catalog is member-facing and triggers the Hindi-parity gate.
      ⚠ `@twt/i18n`'s `t()` defaults to the `hi`/`common` namespace and **throws**; the admin `t` is a
      different, non-throwing resolver ([[project_missed_cycle_visibility_substrate]]).
- [ ] Key multi-select on the 10.13 picker precedent (`FixedAmountPage.tsx:75-91,295-345`): a **`Set`**,
      pruned when the directory refetches smaller, **display names shown / ids submitted**, and
      loading/error/empty rendered **outside** the list.
- [ ] Revoke behind a **Radix `Dialog`** confirmation (`audit-integrity/AcknowledgeDialog.tsx`), with a
      **consequence statement**, Cancel focused first, ESC to dismiss (UX Pattern 2, `:2315-2325`).
      ⛔ Not `DegradedModeBanner.tsx`'s unconfirmed revoke.
- [ ] ⛔ `apps/admin` **cannot import `@twt/domain`** (browser bundle) — shared derivation lives in
      `@twt/contracts` (Task 5).

### Task 11 — Tests (AC: 3–8) — **the mandatory pairs**
- [ ] Unit: the five ordered refusals; the denylist golden set; the containment matrix on
      `tests/rbac/check.test.ts:564-747`'s per-story pariwar-gate + ceiling-deferral template; the pure
      window derivation with **boundary** cases (inclusive `valid_from`, exclusive `valid_until`).
- [ ] Live-DB: `permission-delegations-policy-regression.spec.ts` (sibling of
      `role-grants-policy-regression.spec.ts`, incl. the `relrowsecurity`/`relforcerowsecurity` catalog
      assertion) **and** add the table to `cross-pariwar-leak.spec.ts`'s **must-return-0** set.
- [ ] Live-DB: the **column-level GRANT** proof — an `UPDATE` of a term column must be **refused by the
      database**. ⛔ This is the one AC3 defect no unit test can catch (the `0108` header says so).
- [ ] API: the 404-vs-403 membership leg (AC6); step-up ordering (403 before OTP); an **expired**
      delegation denied at `requireGlobalOrAnyPariwarPermission` (AC7).
- [ ] ⚠ A named test must actually assert what the task claims
      ([[feedback_spec_edits_must_propagate_to_tasks]]) — 10.21's round-2 review found nine checked boxes
      whose tests did not exist.

### Task 12 — Registers + verification (AC: 9, all)
- [ ] `governance_boundary.yaml` — admit the new module root under prohibition (d), Story 1.18's
      `geo-tree` wording as the template; bump `count` in the **same** commit (revert-sanity teeth).
- [ ] `epics.md:3934-3946` label + `scope` field corrections (Q2/AC3); the `prd.md` FR-48 §6.1/§6.2
      inconsistency **surfaced**, ⛔ not silently edited.
- [ ] `deferred-work.md` dispositions in the exact vocabulary of [[feedback_closure_language_precision]].
- [ ] `pnpm ci:local` (all static gates). ⚠ `git push` runs the full `ci:local` via a pre-push hook —
      that is the "hang" ([[project_friction_budget_baseline_ratchet]]).
- [ ] Live-DB **single-pass** for `@twt/domain` and `@twt/api`. ⛔ Do **not** export `DATABASE_URL`
      globally ([[project_ci_local_double_run_pollution]]). Confirm a suspect spec's innocence by running
      it in isolation ([[project_known_livedb_test_failures]] — `@twt/api` full-suite runs surface a
      *different* red spec each run; one red spec is not evidence of a regression).
- [ ] Per-package `lint` for every package touched ([[project_eslint_config_per_package_cwd]]).
- [ ] Record every count as a **real local run**; anything uncaptured is recorded **un-attested**, never
      reconstructed ([[feedback_record_unattested_no_backfill]]).
- [ ] Flip `development_status[10-14-permission-delegation]` + ONE combined reverse-chron `last_updated`
      comment at completion ([[project_sprint_status_ledger]]). The ledger tag at authoring is
      `2026-08-16l`.

### Review Findings

_(none yet — populated by `bmad-code-review`)_

---

## Dev Notes

### The one-paragraph mental model

A native grant says *"this actor holds this **role** in this Pariwar at this scope"*, and the pure
predicate turns a role into keys through a bundle. A delegation says *"this actor may use these
**keys**, borrowed, until this instant."* The system has no vocabulary for a borrowed key, and freeze row
9 forbids inventing one in the frozen module. So the delegation is expressed **as a bundle** — the one
shape the predicate already accepts from outside itself — loaded once per request beside the native
grants, and composed at the adapter layer. Everything hard about this story is at the edges of that
sentence: **who may say it** (Q4), **which keys it may name** (Q6), **who must hear it** (Q5), and
**whether it should be said at all in v1** (Q1).

### Architecture compliance — the constraints that bind this work

- **Freeze row 9** (`epics.md:533`) — compose, never amend. `packages/domain/src/rbac/**` byte-unchanged.
- **`architecture.md:1510-1511`** — *"No silent role escalation … role modification requires Super Admin
  scope."* Reconciled by Q4 or by an ADR, never by silence.
- **ADR-0008 Decision 8 + ADR-0038** — `hasPermission` is **pure and synchronous**; `contains` is sync
  **by interface** and changing that is itself a freeze-row-9 change. ⇒ load once per request; never
  query inside a predicate.
- **ADR-0008 Decision 5** — a grant is `(dimension, value)`, hierarchical containment, **not** a flat
  enum compare. The epic's bare `scope` is unimplementable as written (AC3 reconciles it).
- **`architecture.md:3292-3295`** — the break-glass posture is the architecture's only statement on
  temporary authority: time-bounded, audit-logged, **auto-revert at expiry, renewal only with fresh
  re-justification**. AC3 + D6 follow it.
- **`architecture.md:1455-1456`** — session-ID rotation on role change (D5).
- **`architecture.md:1096-1114`** — database-authoritative time; ⛔ never `new Date()` in a derivation
  (`architecture.md:4118` lists it as an anti-pattern). `now` is injected everywhere.
- **RLS** — the new table is **scoped**, not a Passport-style carve-out; `ENABLE` + `FORCE`; joins the
  cross-tenant **must-return-0** set.

### Files being MODIFIED — read each **before** editing

| File | Read for |
|---|---|
| `apps/api/src/modules/rbac/index.ts` | all of it (319 lines). `:32-51` the loader; `:131-166` the hook; `:185-201` the BYPASSRLS loader; **`:253-259`** the compose-don't-amend precedent; **`:274-283`** Trigger A. |
| `apps/api/src/middleware/scope-resolution/index.ts` | `:55-90`. The 404-at-zero-grants leg (`:58-61`) and the `scope.change` audit's `roles` list (`:82`). |
| `packages/domain/src/rbac/check.ts` | `:59-64` `EffectiveGrant`; `:83-98` `AuthzContext`; `:121-127` `bundleLookup`; `:150-198` the algorithm. ⛔ **Read-only.** |
| `packages/domain/src/rbac/scope.ts` | `:78-125` the rank-order asymmetry; `:132-137` `scopeWithinCeiling`; `:209-211` `denyDeeperGeoResolver`. ⛔ **Read-only.** |
| `packages/domain/src/rbac/permissions.ts` | `:49` the regex; `:410-475` the bump ledger; `:718-760` the reuse-check exemplar. |
| `packages/domain/tests/rbac/roles.test.ts` | `:496-538` — Trigger B, in full. |
| `packages/domain/src/pool/fixed-amount-panel.ts` | the whole file — the guard shape to copy verbatim. |
| `governance_boundary.yaml` | `:232-320` — the `prohibited` list and Story 1.18's admission reasoning. |

### Reuse — do **NOT** reinvent

| Need | Use | ⛔ Do not |
|---|---|---|
| "does actor A hold key K at scope S" | the pure `rbac.hasPermission` | write a second predicate |
| loading a third party's grants in a tx | `assertFixedAmountPanelAuthorized`'s shape | invent a new query pattern |
| window semantics | `banners.ts` + `banners/display-state.ts` | a new inclusive/exclusive convention |
| append-only + pinned parameters | `member_restoration_impositions.ts` | a mutable terms row |
| revocable + time-bounded + audited | the `consent_records` revoke leg (never deleted; time-travel predicate) | `DELETE` |
| different-individual rule | `appeal-persist.ts:243` (typed **409**) | a 403 |
| actor picker + multi-select | `FixedAmountPage.tsx:75-91,295-345` | free-text UUIDs |
| confirmation modal | `audit-integrity/AcknowledgeDialog.tsx` (Radix) | an unconfirmed destructive button |
| audit intent + `audit_id` | `packages/domain/src/audit/compensating.ts` | a bare `writeAuditEntry` on a rollback-capable path (the access-wrapper gate rejects it) |
| staff attribution | `getDisplayName` + snapshot columns | ⛔ the **unscoped, no-role-predicate** read that `.decision-log.md:274` records as the 10.13 defect |

### Anti-patterns this story is specifically exposed to

1. **Fixing the freeze.** Widening `EffectiveGrant` or re-ranking `pariwar`/`state` "to make delegation
   work." Both are freeze row 9; `scope.ts:123-125` forbids the second by name.
2. **Silent inertness.** Accepting an over-broad delegation because the check-time predicate will refuse
   it anyway. The author sees "granted"; the system means "never." Reject at write time (AC4).
3. **Half-wiring.** Teaching the request path about delegations and leaving the ten other readers behind
   ([[feedback_mechanization_split_commitment]]).
4. **Re-reading a ratified ruling.** Letting a delegation satisfy Decision `2026-08-16-123` clause 2's
   attestor definition without superseding it in terms ([[feedback_supersede_never_reinterpret]]).
5. **An author-invented denylist** over ratified non-delegability. Q6 or stop.
6. **A stale comment two lines from a correct fix** — `rbac/index.ts:274-283` after AC7 (the 10.28 review
   class).
7. **Overclaiming a gate.** AC8's extension must state what it still cannot see, as the original does.
8. **`drizzle-kit generate`** on an applied migration → `42P07`.
9. **Type-only → value import** into `packages/domain/src/rbac/**` materialising a module-init cycle that
   typecheck and the local suite stay green through ([[project_type_only_import_cycle_trap]]).

### Testing standards

- **Live DB** `twt-test-pg`:5433 ([[project_live_db_test_gotchas]]). ⛔ Never `DROP SCHEMA`; ⛔ never
  regenerate an applied migration; assert **membership, not counts**, against own-committing writers.
- ⛔ Do not export `DATABASE_URL` globally ([[project_ci_local_double_run_pollution]]).
- **Revert-sanity is mandatory twice** (Task 9). Record the RED output.
- The **column-level GRANT** proof must be a **live-DB** test — it is the AC3 defect no unit test sees.
- `apps/api/tests/unit/require-global-permission.test.ts` shows the fake-pg-pool + `CapturingSink`
  pattern: a full allow/deny matrix for the HTTP gate with **no database**.

### Previous-story intelligence

**From Story 10.13 (`done`, the numerically-previous story and the closest structural sibling):**
- Its shape **is** this story's shape: a surface whose real question was *"who is eligible"*, answered by
  a routing note before any code. Task 1 here is Task 1 there.
- Its ruling (`2026-08-16-123` cl. 2) is now the thing Q5 must not quietly re-read. ⚠ The story that
  established key-as-credential is the story delegation would undo.
- Its review found the **unscoped `getDisplayName`** defect: *"no tenant and no role predicate"*. The
  delegatee picker must not repeat it — `role_grants` RLS is what makes the cross-tenant case close.
- ⚠ The epic's discharge note for 10.13 (`epics.md:3923`, not the story file itself) records a limit
  worth copying in tone: *"Eligibility proves an attestor **could** have attested; it does not prove
  they **did**."* State this story's limits the same way.

**From Story 7.11 (`done`, the most recent commit):**
- Its review found a governance entry **bundled into the implementation commit** with a false claim that
  it had landed first — split into `aaa6127` + `f225a76` to fix. ⛔ Tasks 1 and 2 here commit **alone**.
- It reconciled one number across **nine** registers. Q6's denylist has the same fan-out risk.

**From Story 10.28/10.29:**
- 10.28's `governance:`-first Task 1 touching **zero** `packages/`/`apps/` files is the exact shape here.
- 10.29's lesson: prove **presence**, not absence-of-error, when the failure mode is silent. AC4's
  ordered-refusal test is that instrument.

### Git intelligence (last 5 commits, `f225a76`)

```
f225a76 story(7.11): the fixed-amount notice period is 90 days, reconciled across nine registers  ← BASELINE
aaa6127 governance(7.11): Decision 2026-08-16-125 — the emergency backdating bound binds to the amount IN FORCE
948468b governance(7.11): Decision 2026-08-16-124 — the notice period is 90 days, superseding clause 6 of 123
284df18 governance(7.11): routing note for the fixed-amount notice period — six questions, four blocking
d6de145 Story 10.13: Fixed-Amount Setter Admin UI — trustee panel eligibility (#192)
```

The pattern is unambiguous and this story follows it: **routing note → decision → story**, `governance:`
before `story:`, rulings recorded before the code they authorise, ⛔ never a decision edited in place.
Note `284df18` — a routing note committed **alone**. That is Task 1.

### Library / framework context — ⛔ NO NEW DEPENDENCIES

- **`zod ^3.23.0`** — ⛔ v3, not v4. `.strict()`, `z.string().datetime({ offset: true })`. ⛔ No
  `z.iso.datetime()` / top-level `z.strictObject`.
- **`drizzle-orm ^0.45.0`** — `timestamp(..., { withTimezone: true, mode: 'date' })` is the house shape.
  Migrations are **hand-authored**.
- **`fastify ^5.8.0`** — set status then **return**; ⛔ never `void reply.status(N).send()` in an async
  handler ([[project_fastify_onsend_doublesend]]).
- **Admin**: React + Vite + TanStack Router/Query + Radix. Reuse what the sibling modules use.

### Project Structure Notes

- **Sweep at `f225a76`: `grep -rn "10\.14\|10-14\|FR-48" apps packages docs` → ZERO hits.** Nothing points
  at this story; the pointers it creates are the ones it must later discharge.
- New module root: ⭐ `packages/domain/src/rbac-delegation/` — deliberately **outside** the frozen and
  governance-boundary-prohibited `packages/domain/src/rbac/`, and itself admitted to the prohibited list
  (AC9).
- Migration `0109` is next. Catalog version 35 → 36; key count 43 → 44 (D1).
- `packages/contracts` must never import `@twt/domain`'s pg-touching namespaces
  ([[project_contracts_domain_bundle_boundary]]); `apps/admin` is a browser bundle and cannot import
  `@twt/domain` at all.

### References

- `_bmad-output/planning-artifacts/epics.md:3934-3946` — the story; `:102` FR-48; `:520` the freeze
  preamble; `:538` **freeze row 9**; `:291` AR-24 step-up; `:3780` FR-58C prohibition (d).
- `prds/prd-TWT-2026-05-22/prd.md:783` FR-48 verbatim; **`:1325`** the v1 roll-up that omits it;
  **`:1350`** the may-slip line; `:749` FR-44; `:770,779` FR-47; `:795` *"cannot delegate scope-down"*;
  `:812` author≠reviewer; `:727` FR-43A.
- `architecture.md:1491-1512` §2.6; **`:1510-1511`** no-silent-role-escalation; `:1455-1456` session
  rotation; **`:3292-3295`** break-glass; `:2451-2456` §3.13 grant tuple.
- `docs/adr/ADR-0008-rbac-permission-model.md` (ratified) — Decisions 3, 5, 8, 9.
- `docs/adr/ADR-0038-geo-tree-scope-resolver.md` (**drafted**) — the purity constraint.
- `docs/legal/niyamavali.md:266` — *"not a delegate committee"*; §8.8 the appeal separation.
- `docs/legal/trust-deed.md:251` — Cl. 20(h), the only delegation power.
- `docs/runbooks/trustee-credential-loss-succession.md:14-20` SA-1…SA-5; `:92` grant-before-revoke; `:119`.
- `.decision-log.md:37` head (`2026-08-16-125`); `:230-275` Decision `2026-08-16-123` — **`:270` clause 2,
  the key-as-credential definition**; `:260` *"A `pariwar_admin` is not the Board"*; `:266` the
  INERT-ON-ARRIVAL rank-order warning; `:274` the unscoped-read defect. `:2609` moderation
  non-delegable; `:2982` Decision `2026-08-07-089`.
- `apps/api/src/modules/rbac/index.ts:253-259` compose-don't-amend; **`:274-283` Trigger A**.
- `packages/domain/tests/rbac/roles.test.ts:496-538` — **Trigger B**.
- `packages/domain/src/rbac/check.ts:59-64,83-98,121-127,150-198`; `scope.ts:78-125,132-137,209-211`.
- `packages/domain/src/pool/fixed-amount-panel.ts` — the guard + directory shapes.
- `governance_boundary.yaml:232-320` — `prohibited`, incl. Story 1.18's `geo-tree` admission reasoning.
- `ux-design-specification.md:1961` `<ClaimProxyFlowShell>`; `:2315-2325` Pattern 2; `:1181`/`:2629-2637`
  accessibility; `:2483-2490` Pattern 12 field types.
- `_bmad-output/test-artifacts/test-design-qa.md:423` — **P2-016, scenario cell EMPTY.**

---

## Open questions for BigDev (raised at authoring; none blocks Task 1)

1. **Q1 is genuinely open in both directions.** If your read is that FR-48 ships in v1 regardless of
   `prd.md:1325`, say so and the routing note asks Q2–Q6 only. If not, Q1 leads and the likely outcome is
   a ruled deferral — which would be the cheapest correct result available here.
2. **Is the *real* need behind FR-48 actually vacation cover, or is it the missing role-grant surface?**
   Q3 exists because the second reading is at least as plausible, and a role-grant admin surface would
   discharge both standing triggers with far less governance surface than delegation does.
3. **`architecture.md:1510` may simply be right.** If role modification requires Super Admin scope, the
   honest shape may be "Super Admin grants a time-boxed role" rather than "an admin lends keys" — which
   collapses D2 entirely and reuses `role_grants` with two new columns. Worth ruling before Task 3.

---

## Dev Agent Record

### Agent Model Used

Claude Opus 5 (`claude-opus-5`) via `bmad-dev-story`, 2026-08-17.

### Debug Log References

**Task 0 — baselines, taken BEFORE any edit, every number a real local run.**

| Suite | Result |
|---|---|
| `pnpm --filter @twt/domain test tests/rbac/` | **4 files / 153 tests PASS** (scope 16, permissions 37, roles 39, check 61) |
| `pnpm --filter @twt/contracts test` | **56 files / 921 tests PASS** |
| `pnpm --filter @twt/api test tests/unit/` | **40 files / 305 pass + 1 skipped (306)** |
| live-DB `rls/role-grants-policy-regression.spec.ts` + `multi-tenant/cross-pariwar-leak.spec.ts` | **2 files / 26 tests PASS** (`twt-test-pg`:5433, `DATABASE_URL` passed inline — ⛔ never exported globally) |

**Task 0 — re-verification of the moving numbers.**
- `.decision-log.md` head: **`2026-08-16-125`** (`:37`) — unchanged from authoring. `grep -c '^### Decision '` → **127** headings, one of which is the `YYYY-MM-DD-NNN` template ⇒ 126 numbered over 125 distinct numbers, the `+1` being the legitimate `2026-06-01-012-amend-1` suffix. No gaps in `001…125`. ⇒ the ruling entry takes **`2026-08-16-126`**, renumbered if the ruling lands on a later date.
- Next free migration: **`0109`** (`_journal.json` head `idx: 108`) — unchanged.
- `PERMISSION_CATALOG_VERSION` = **35**; `PERMISSION_CATALOG.keys` length = **43**. Both unchanged; neither moved.

**Task 0 — anchor re-derivation. ⭐ ZERO DRIFT on every load-bearing citation**, each read from source: both trigger texts (`rbac/index.ts:273-283`, `roles.test.ts:532-536`) verbatim; all eleven `role_grants` readers; the four ratified non-delegability sources (`niyamavali.md:266`, `.decision-log.md:2609`, `:2982`, `trust-deed.md:251`); SA-1…SA-5; freeze row 9 (`epics.md:533`) and its escalation clause (`:519`); Decision `2026-08-16-123` clause 1 (`:260`) and clause 2 (`:270`); `check.ts:59-64,83-89,121,150,179,184`; `scope.ts:123-125,132-137`; `permissions.ts:49,475,526-530,543-547`; every PRD line (`:727,749,770,779,781,783,793,795,812,1325,1350`).

**Three citation drifts found, recorded as routing-note finding F-9 — ⛔ not silently corrected** (the class the 10.21 round-2 review caught nine times):
1. References cite `epics.md:538` for **freeze row 9**; it is at **`:533`** (`:538` is row 14). The story's own Dev Notes cite `:533` correctly — a self-inconsistent citation, same class as the two the validation pass already fixed.
2. References cite `epics.md:520` for the freeze preamble; it is at **`:519`** (`:520` is blank). The banner cites `:519` correctly.
3. Reader #11 cited as `shepherd-assign-persist.ts:215,290`; the second `.from(roleGrants)` is at **`:289`**.

**Two sweeps imprecise but substantively true, also recorded in F-9:**
4. *"`grep -rn "10\.14\|10-14\|FR-48" apps packages docs` → ZERO hits"* — **zero in `apps` and `packages`**, but **5 in `docs/`**, every one unrelated (`Days 10-14`, `A-epic-10-14-story-breakdown`, an ADR index row). The substantive claim — nothing points at this story — **holds**.
5. The delegation sweep's *"two unrelated test files"* — the only `delegatee|delegator` hits are **two `apps/admin/dist/*.js.map` build artifacts**; **zero in source**. Substantively **stronger** than claimed.

**One story claim STRENGTHENED on verification (F-3).** *"Every `INSERT INTO role_grants` / `DELETE FROM role_grants` in the tree is a test fixture"* was checked exhaustively rather than sampled, across `INSERT`/`DELETE`/`UPDATE` in both raw-SQL and Drizzle forms: **43 sites across 43 files, every one under `tests/`. Not one production write.** Corroborated: `apps/api/src/modules/rbac/` is one 318-line file with **zero** route registrations; `openapi/v1.yaml` has **zero** rbac paths; **no** production caller of `seedRoles()`; `AuthzContext.bundles` is never passed anything but `defaultRoleBundles` in production.

### Completion Notes List

**Task 0 — COMPLETE.** Branch `governance/10-14-permission-delegation` cut from `main` @ `f225a76`, verified clean and `== origin/main` after `git fetch origin`. Baselines, head/migration/catalog re-verification, and full anchor re-derivation recorded above.

**Task 1 — COMPLETE.** `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-08-16-story-10-14.md` authored in the structure of `trustee-panel-routing-note-2026-08-16-story-7-11.md`: **nine findings** (F-1…F-9), **six questions** (Q1–Q6, **all six BLOCKING**), each carrying per-option costs, a **non-binding ⭐ recommendation**, and an explicit *"what a non-answer would mean"*; plus a *"What non-answer would mean"* roll-up, a *"What this note does NOT ask"* section, a ruling template, and a disposition. The four ratified non-delegability rulings are reproduced **verbatim with citations** (`niyamavali.md:266`, `.decision-log.md:2609`, `.decision-log.md:2982`, `trust-deed.md:251`). ⛔ **Zero `packages/` and `apps/` files touched.**

**Task 2 — COMPLETE. ⛔ Q1 RULED (b): FR-48 IS DEFERRED TO v2.** Recorded as **Decision
`2026-08-17-126`** (`.decision-log.md:37`), numbered from the re-verified head `2026-08-16-125` and
taking **2026-08-17** because the ruling landed the day after the note was raised — as the note's
Disposition provided for. Per-clause provenance per Decision `2026-08-09-095`: **clauses 1–5
`[Trustee-ratified]`**, **clauses 6–8 `[Author-committed]`**, **clause 9 an author finding**.

**⛔ THE STORY IS COMPLETE. Tasks 3–12 did not run, and that is the successful outcome AC2 describes
in terms.** Nothing was built. `PERMISSION_CATALOG_VERSION` stays **35**, key count stays **43**, the
next free migration is still **`0109`**, and ⛔ **zero `packages/` and `apps/` files were touched by
either commit** — verified on both.

**What the ruling deliberately did NOT do** — each recorded rather than implied:
- ⛔ **Trigger A and Trigger B are NOT discharged.** They are recorded as **"Not addressed"** and
  remain **ARMED**. AC7/AC8 are therefore **not satisfied and are not claimed to be**. Their firing
  condition — *"the first story that builds a `role_grants` write path"* — is simply not met, because
  10.14 built none. ⚠ `rbac/index.ts:273-283`'s comment is left **exactly as it stands**: it is
  **currently true**, and rewriting it would be the "stale reason left behind" defect *in reverse*.
- ⛔ **Decision `2026-08-16-123` clause 2 is untouched and unsuperseded.** The ruling records only that
  no v1 delegation mechanism exists to test it against ([[feedback_supersede_never_reinterpret]]).
- ⛔ **`prd.md` is not edited.** `:781`, `:1325`, `:1350` stand; clause 8 records that clause 1
  resolves which reading governs and that no line is rewritten on that strength.
- ⛔ **`epics.md:3934`'s AC body is left VERBATIM.** It gains a deferral banner only. The `[SURFACE]`
  label and the bare `scope` field are **flagged in place, not fixed** — Q2's and AC3's business, and
  **Q2 was not reached**.
- ⛔ **No successor story was minted.** Clause 9 records F-3's observation — that the real need may be
  *"we cannot administer grants"* rather than *"we cannot lend one"* — **without an owner, and says
  so**, rather than naming a false one ([[feedback_record_unattested_no_backfill]]).

**⚠ "Not reached" ≠ "not answered".** Q2–Q6 were not declined and were not left open by silence;
ruling Q1 made all five **moot in v1**. Each returns **unruled** with FR-48, together with the routing
note that frames them, and ⛔ a v2 successor may not treat `2026-08-17-126` as having settled any.

**⚠ No gate was run, and none is owed.** Zero source files changed across both commits, so `ci:local`
would be **vacuous over this story's diff**; that is recorded rather than run and reported as
meaningful ([[feedback_record_unattested_no_backfill]]). The Task 0 baselines stand as the last real
numbers for this branch. `yaml.safe_load` was run against `sprint-status.yaml` after each edit.

**⚠ One enum value was minted, narrowly.** `deferred-to-v2` did not exist in `development_status`;
clause 6 adds it **and documents it in the STATUS DEFINITIONS block**. ⛔ It does **not** discharge
Story 0.12's open warning **W-01** (`deferred-work.md:2185`), whose scope is the *reconciliation* enum
with a per-decision suffix and whose owner is that story's Task 10, still `_AWAITING EXTERNAL ACTION_`.

*(Superseded, retained: the note below was written at the Task 1 halt, before Q1 was ruled.)*

**⛔ HALTED AT TASK 2, BY DESIGN.** Task 2 records a ruling that does not yet exist; Tasks 3–12 are gated on Task 2. This is the story's own stated stopping point (*"⛔ STOP HERE until ruled"*), not an incomplete implementation. **Five of the six questions stop the story if unanswered**; only Q2 permits continuation, and only in a degraded state.

**What the note asks, in one line each.** **Q1** — is FR-48 in v1 at all, given `prd.md:1325` omits it from the §4.7 roll-up and `:1350` lists it as may-slip (⭐ defer, or narrow). **Q2** — is `[SURFACE]` the right label over an authority-bearing table (⭐ correct to `[PRIMITIVE]`). **Q3** — may a way to *lend* authority ship before a way to *confer* it exists (⭐ no, in principle). **Q4** — who may delegate, given FR-48 says trustee, the epic says Pariwar admin, `architecture.md:1510` says Super Admin, and `2026-08-16-123` cl. 1 says a `pariwar_admin` is not the Board (⭐ name it explicitly **and** reconcile `:1510`). **Q5** — which of the eleven readers must see delegations, given clause 2 of `2026-08-16-123` defined panel eligibility against `role_grants` nine days ago (⭐ request path yes, the five key-as-credential readers no — and if otherwise, **supersede clause 2 in terms, never re-read it**). **Q6** — the ratified non-delegable denylist, which ⛔ an author may not invent.

**Forward obligations, recorded now so they are not lost to a deferral.** Trigger A (`rbac/index.ts:273-283`) and Trigger B (`roles.test.ts:532-536`) fire on **whichever story writes `role_grants` first**. If Q1 rules defer, they are **not discharged — they stay armed**, and the decision entry must record that in those words, never as "closed" ([[feedback_closure_language_precision]]).

### File List

| File | Change |
|---|---|
| `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-08-16-story-10-14.md` | **new** — the Task 1 routing note (AC1) |
| `_bmad-output/implementation-artifacts/10-14-permission-delegation.md` | modified — Task 0/1 checkboxes, Dev Agent Record, File List, Change Log |
| `_bmad-output/implementation-artifacts/sprint-status.yaml` | modified — `ready-for-dev → in-progress → deferred-to-v2`; the `deferred-to-v2` value **minted and documented** in STATUS DEFINITIONS; two reverse-chron ledger entries (`2026-08-17`, `2026-08-17b`) |
| `.decision-log.md` | modified — **Decision `2026-08-17-126`** prepended at the head (AC2) |
| `_bmad-output/implementation-artifacts/deferred-work.md` | modified — eight dispositions in the exact three-way vocabulary of [[feedback_closure_language_precision]] |
| `_bmad-output/planning-artifacts/epics.md` | modified — **deferral banner only** on `:3934`; ⛔ the AC body left **verbatim** |

⛔ **Zero `packages/` and `apps/` files, across BOTH commits.** The story never left its governance
half. ⛔ `prd.md` is **not** in this list, deliberately — clause 8 surfaces its FR-48 inconsistency
rather than editing it.

---

## Change Log

| Date | Change |
|---|---|
| 2026-08-16 | Authored via `bmad-create-story` off `main` @ `f225a76`. Status → `ready-for-dev`. Six blocking routing questions, six decisions, four escalations, two standing re-examination triggers identified as firing on this story. |
| 2026-08-17 | Task 2 via `bmad-dev-story`. **Q1 ruled (b): FR-48 DEFERRED TO v2** — recorded as **Decision `2026-08-17-126`**, clauses 1–5 `[Trustee-ratified]`, 6–8 `[Author-committed]`, 9 an author finding. **Q2–Q6 recorded as "not reached"**, which is distinct from "not answered". **Both standing triggers recorded as "Not addressed" and ARMED — ⛔ NOT discharged**; AC7/AC8 are not satisfied and are not claimed to be. Decision `2026-08-16-123` cl. 2 **untouched and unsuperseded**. `deferred-work.md` gains eight dispositions; `epics.md:3934` gains a deferral **banner** with its AC body left **verbatim**; `prd.md` **not edited**. `deferred-to-v2` minted into `development_status` and documented in STATUS DEFINITIONS (narrowly — ⛔ does not discharge Story 0.12 W-01). **Tasks 3–12 did not run; their boxes stay unchecked deliberately.** ⛔ Zero `packages/`/`apps/` files across both commits. Status → `deferred-to-v2`. ⛔ **Terminal, and a successful outcome.** |
| 2026-08-17 | Task 0 + Task 1 via `bmad-dev-story`. Branch `governance/10-14-permission-delegation` off `f225a76`. Four suites baselined before any edit (153 / 921 / 306 / 26, all green). Decision-log head, next migration, and catalog version/key count all re-verified unchanged. Anchors re-derived: **ZERO DRIFT** on every load-bearing citation; three citation drifts and two imprecise sweeps recorded as routing-note **F-9** rather than silently corrected. Routing note authored — nine findings, six questions, all six BLOCKING. ⛔ **Story HALTED at Task 2 pending a Trustee Panel ruling**, as AC1 requires. Zero `packages/`/`apps/` files touched. |
| 2026-08-17 | Validated via `bmad-create-story validate`. ~45 citations spot-checked; all quoted text confirmed verbatim. Two line-precision defects fixed: Trigger A/B line ranges corrected (`index.ts:275-276`→`273-274`, `:274-283`→`273-283`; `roles.test.ts:533-536`/`:533-537`→`532-536` in both places, resolving a self-inconsistent citation) and the 10.13 "discharge banner" quote re-attributed to `epics.md:3923` (it was never in the 10-13 story file). No ruling, requirement, or AC changed. Status remains `ready-for-dev`. |
