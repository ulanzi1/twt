---
baseline_commit: 71aae719b3022a84f23a790867c1ced0b919affc
---

# Story 10.18: Constituting the Trustee Panel as a Sanctioning Authority `[GOVERNANCE]`

Status: review

## Story

As the Trustee Panel named by the Niyamavali as the body that determines moderation sanctions,
I want the Trust's governing instruments to constitute me as an authority the system can recognise,
so that the governance document does not describe an authority the system cannot express.

---

## What this story is

**The Trustee Panel already exercises authority this system cannot recognise.** `.decision-log.md`
Decision `2026-08-07-089` states that *"The Trustee Panel exclusively owns authorization to activate Story
10.23's imposition flag. No other role holds it, and it is not delegable."* **Eight** ratified Decisions in
that log are signed *"Ratifying trustees: Trustee Panel"* (`:91, 130, 311, 347, 429, 495, 527, 830`; three
further entries read *"pending Trustee Panel session"* and are **not** ratified). Yet there is no
`trustee_panel` among the twelve seeded role bundles, so the system cannot distinguish a Panel act from a
`pariwar_admin` act. Every exclusivity the log asserts is enforced by convention alone.

This story closes that gap — **governance first, capability second** — and is the `[GATE]` on Story 10.20.

**Framing, verbatim from `epics.md:3721`:** *"this is not an RBAC task. Its subject is who holds the
authority to sanction a member; the permission key is the last and smallest step in expressing that. The
governance work … is the substance. A role bundle preceding that definition would be a capability without a
constituted holder."*

---

## Verified premises — one stale, two wrong, one already discharged

⚠ **Only #1 is a premise of the epic's AC.** #2 is **V3's** sentence
(`sprint-change-proposal-2026-08-04.md:67`) and the **epic's own wording is correct**; #3 is a
state-of-the-world fact the epic never claimed; #4 is an AC from the sprint-change-proposal. Do not charge
`epics.md` with three defects it does not have.

**Provenance differs by item.** #1 and #4 concern **git-tracked** files, verified at `71aae71`. #2 and #3
concern `docs/legal/`, which is **gitignored with no git history** — those were **read on-disk on
2026-08-09**, a weaker provenance than a commit pin, since an untracked file's content has no relationship
to any SHA.

**⛔ #1 STALE — `PERMISSION_CATALOG_VERSION` is 29, not 28. The bump is 29 → 30.**
`epics.md:3738` says 28 → 29; Story 10.12 took 28 → 29 on 2026-08-07. Live:
`packages/domain/src/rbac/permissions.ts:367`, pinned at `permissions.test.ts:54`. Underneath the number
sits a real question the epic asked without noticing: **every prior bump minted a permission key**; this
one mints a **role** and reuses `member.moderate`, so the key count stays at **40**. (The story does not
assert how many prior bumps there were — the catalog's origin version is unrecorded.)

**⛔ #2 WRONG (V3's claim) — the Niyamavali already defines the Trustee Panel.**
`niyamavali.md:39` (§1.3): *"**District Admin / State Trustee / Trustee Panel (Core Team)** — the three
escalation tiers of decision authority (Part 9)."* §5.3 (`:126`) gives it *"full discretion"*. Hindi mirrors
at `:43`, `:124`. So the term exists, is equated with "Core Team", sits at the **top** of three tiers above
State Trustee, and is scoped to **Part 9 only**. Three consequences:

1. §8.7 must **reconcile with §1.3**, not invent beside it. Silence here is the single most likely defect
   in the amendment text (→ AC2 Q2).
2. The Deed **already vests the power**: `trust-deed.md:239` (Clause 20(b)) *"admit, **suspend, and cease
   members**"*; `:251` (Clause 20(h)) permits delegation *"to **committees** … while retaining ultimate
   responsibility."* §8.7 names **which of two already-lawful shapes** the Panel is (→ AC2 Q1).
3. The tier ranking is **not** cited as corroboration for the RBAC ceiling — see **D2**.

**⛔ #3 WRONG — Part 8 runs §8.1–§8.4 only.** `niyamavali.md:170-183`. **No §8.4a, §8.5, §8.6, §8.7, §8.8,
§8.9 in either locale.** The eleven-item amendment package at
`sprint-change-proposal-2026-08-04.md:520-533` is entirely unlanded. ⚠ PRD FR-56 (`prd.md:866`) already
cites **§8.4a**, which does not exist — a live dangling cross-reference, recorded but **not this story's to
fix** (it belongs with 10.19/10.20).

**✅ #4 ALREADY DISCHARGED — the `epics.md:3540` actor correction is done.** It reads *"As a member of the
**Trustee Panel** with `member.moderate` permission"*, note at `:3544-3547`. Record as
discharged-before-start; re-doing it is a no-op diff. **It changes no work.**

---

## ⛔ The one thing this story must not do: manufacture a ratification

**The Niyamavali is an unadopted draft** — `niyamavali.md:5` carries `[[v1.0]]`, `[[date]]`, `[[date]]`,
none filled, under a standing `⚠ DRAFT — NOT LEGAL ADVICE` banner (`:9-15`). **Counsel is not engaged** —
every return field in `docs/legal-counsel-engagement/` is `<PENDING>`. Part 11 (`:210-212`) requires a Board
resolution reference and counsel review before publication.

⇒ *"The Part 8 amendment lands FIRST"* **cannot mean "ratified and effective."**

| Landing means | Landing does NOT mean |
|---|---|
| §8.7 authored into `niyamavali.md` **and** `niyamavali.hi.md` | A `[[v1.0]]` → `v1.1` version bump |
| Composition/scope routed to the Panel and ruled (AC2) | An `Effective:` or `Adopted by Board resolution` date |
| The ruling — **quoting §8.7 verbatim**, since the file is gitignored — recorded in `.decision-log.md` | A `[LEGAL]` counsel-acceptance entry |
| The owed counsel review recorded **as owed** in `deferred-work.md` | Any claim Part 8 is legally settled |

Use `[[feedback_closure_language_precision]]` verbs: this amendment is **authored and Panel-ratified**, and
**counsel review remains outstanding**. Never "approved", never "final".

The precedent is exact: **Decision `2026-08-06-080`** amended §3.1/Appendix A on Trustee Panel attestation
alone, `Status: Trustee-ratified`, no `[LEGAL]` entry. But `sprint-change-proposal-2026-08-04.md:618` names
§8.7 specifically as legal counsel's **critical-path deliverable**. The tension is real; the story records
it (Escalation 6, routed as **Q5**) rather than resolving it silently.

⚠ **This story opens a FIFTH open Trustee Panel obligation while four remain undischarged** — **Story
10.23's** Escalation 6 (`2026-08-07-089`), the copy-truth defect, R7(A)'s unpublished Part 11 amendment
(`2026-08-06-077`), and the R7(C)/R7(F) lock-in asymmetry. **It discharges none of them** and must not read
as if it did.

---

## In scope / out of scope

| In scope | Out of scope → owner |
|---|---|
| Niyamavali **§8.7**, in `en` + `hi` | The other ten Part 8 items → **10.19 (D5), 10.20 (D10)** |
| Reconciling §8.7 with the existing §1.3 "Trustee Panel (Core Team)" | Part 9's appeal flow → **10.22** |
| A routing note + `.decision-log.md` Decision settling composition and scope (**Q1–Q8**) | Obtaining counsel review → **Story 0.13**, recorded as owed. ⚠ Not a live owner: per this story's Escalation 6 it "has not closed, no counsel is selected, every ledger field is a placeholder." |
| The 13th seeded role `trustee_panel`, `scopeCeiling: 'pariwar'`, holding `member.moderate` | Any new **permission key** — `member.moderate` exists (`permissions.ts:398`) |
| **Six** parity surfaces a 13th role touches (AC4) | A role-administration UI / `role_grants` write path — never built, still unowned |
| `member.suspend` deprecated, mechanized, revert-probed | **Removing** `member.suspend` → a separate later bump (Escalation 4) |
| **Rewriting** Family-A geo markers to the rank-order reason; **re-pointing** Family-B markers to a named story | **Building** the geo-tree resolver → **Story 1.18**. `denyDeeperGeoResolver` untouched |
| Confronting the inert `verifier` grant (AC8) ⚠ *scope addition beyond the epic's literal AC* | Re-architecting `GEO_RANK`/`scopeContains` → freeze row 9; needs an ADR |
| Recording what 10.18 does **not** unblock (AC9) ⚠ *scope addition* | 10.20's record model, 10.19's login block → their own stories |

⚠ **Also scope additions beyond the epic, flagged per this story's own convention:** AC4's
**domain↔contracts ceiling parity assertion** (a new invariant over all 12 pre-existing roles), AC4's
**sixth surface** (~12 prose sites + a const rename), and **minting Story 1.18 into `epics.md` with
acceptance criteria inside a retrospected epic** (the epic authorizes only *"re-points … to a named
successor item"*).

---

## The two families of geo deferral — AC7 turns on this distinction

The epic does not make it, and re-pointing all markers to one successor would carry a false claim forward.

**Family A — RANK-ORDER. A resolver can NEVER fix these.** The grant's ceiling is `state`/`district`/`block`
and the check runs at `dimension: 'pariwar'`. `scopeWithinCeiling` (`scope.ts:74-79`) reads **`CEILING_RANK`**
(`:64-67`, = `{...GEO_RANK, self: 5}`) and is a **pure numeric compare** — `1 >= 2` → false — with **no
resolver parameter**. `scopeContains` denies independently at **`:193`** (`if (tRank < gRank) return false;`),
which **is** `GEO_RANK`-based (`:56-61`), also before any resolver is consulted. **No org tree changes
either line.**

> **These markers are not stale pointers — they are misdiagnoses.** They promise Epic 3 would have fixed
> something Epic 3 could never fix. ⛔ **Family A is REWRITTEN in place to state the rank-order reason. It is
> NOT re-pointed to Story 1.18** — re-pointing preserves the error under a fresher name. For the moderation
> site, **this story is the answer**: the actor was never `state_trustee`; it is a pariwar-ceiling Panel.

Sites include `cycle.freeze`, `claim.r9_vote`, `claim.appeal_vote`, `claim.appeal_final`,
`pool.fixed_amount_set/_emergency`, `reconciliation.review`, and `member.moderate` (10.10).
⛔ **`helpdesk.create` (10.3) and `helpdesk.respond` (10.4) are NOT marker sites** — verified: zero
occurrences of `Epic 3` *or* `Epic-3`; both already state the rank-order reason and are **already in the
target state. Do not edit them.**

**Family B — GENUINE GEO-TREE.** Grant and target in the same tree, target strictly narrower.
`denyDeeperGeoResolver` (`scope.ts:133-135`, `contains: () => false`) is the only implementation; a real
resolver **would** resolve these. Sites: 6.7 `claim.conduct_ground_inspection` for `block_admin`, 6.10
`claim.verify` for `state_trustee`, `reports/scope.ts`, `reports/templates/_shared.ts`, the banners/news
audience modules, `schema/cycle_freeze_commits.ts`. **Only Family B is re-pointed to Story 1.18.**

---

## Acceptance Criteria

### AC1 — The Part 8 amendment is authored FIRST, in BOTH language files; its durable record is the Decision entry, because the Niyamavali is NOT in git

**Given** `epics.md:3725-3727` and `[[feedback_governance_commits_precede_implementation]]`
**Then** a **new §8.7 — The Trustee Panel** is authored into `docs/legal/niyamavali.md` (after §8.4) **and
into `docs/legal/niyamavali.hi.md` at the structurally identical position**. The Hindi file is a **co-equal
governing instrument** (`counsel-roster.md:32`: *"the Niyamavali is Hindi-primary"*), not a translation
artifact — shipping `en` only would leave the Hindi-primary document silent on the body it constitutes.

⛔ **The number is §8.7 regardless of the gap. Do NOT renumber to §8.5.** Part 8 ends at §8.4 today, so a
dev will see empty numbers and have a tidiness reason to close the gap. **The gap is deliberate** — §8.4a,
§8.5, §8.6, §8.8, §8.9 are reserved for the ten unlanded items owned by 10.19/10.20. Renumbering silently
breaks every §8.7 reference in this story, the routing note, the Decision, and
`sprint-change-proposal-2026-08-04.md:520-533`.

⛔ **`docs/legal/` IS GITIGNORED.** `.gitignore:67-68`; `git check-ignore -v docs/legal/niyamavali.md`
matches; `git ls-files docs/legal/` is **empty**. **Editing the Niyamavali produces no commit and no diff.**
A dev who plans "commit the amendment first" will find nothing to commit and may conclude it is optional.
It is not — the *record* lives elsewhere.

**Then** the durable evidence is a **`.decision-log.md` entry quoting §8.7 verbatim** and naming the file
and section, following Decision `2026-08-06-080`, which amended the same file the same way for the same
reason.
**And** §8.7 **expressly reconciles with §1.3** — adopting the existing *"Trustee Panel (Core Team)"* and
extending its scope from Part 9 to Part 8, **or** amending §1.3 in the same act. It does not introduce a
second, undifferentiated Panel.
**And** §8.7 **expressly distinguishes itself from Part 9's "State Trustee panel"** (`niyamavali.md:129`,
`:191`), fixed at *"≥2 trustees; majority-rules per R9"* (`review-scope-charter.md:63`) — **the only quorum
stated for a Niyamavali trustee *panel***, belonging to the **geographic appeal** panel, not this one.
⚠ It is **not** the only quorum in the repo — `trust-deed.md:227` (Clause 19(b)), ~10 sites in
`docs/launch-gate-inventory/` and `monthly-review-cadence-protocol.md`, and `prd.md:1475` (*"≥ 3 trustees,
statutory minimum"*) all state trustee quorum numbers. **Do not restore that overclaim.** The risk is that
§8.7's silence lets Part 9's number be read across **by adjacency**, which does not require uniqueness.
**And** §8.7 **cites the Deed rather than restating it** — Clause 20(b) for the sanctioning power,
Clause 18/19 for composition and quorum, Clause 20(h) if modelled as a delegate committee. Restating a
quorum inline creates a second source of truth that will drift.
**And** the record lands in a commit prefixed **`governance:`** touching **only** governance artifacts:
`.decision-log.md`, the routing note, `deferred-work.md`, `sprint-status.yaml`, **`epics.md`** (Story 1.18's
entry, per Task 7), and this story file. **Zero files under `packages/` or `apps/`.**
**And** `feat/10-18-…` is **cut from that commit**, so `git log` reads governance → implementation.

⛔ **No version bump, no effective date, no `[LEGAL]` line.** AC1 is satisfied by
authored-and-Panel-ratified text; **not** by anything claiming legal finality.

### AC2 — Composition and scope are ROUTED to the Panel, never authored unilaterally

**Given** §8.7's subject is the Panel's **own** constitution
**Then** a **routing note** is authored at
`_bmad-output/planning-artifacts/trustee-panel-routing-note-<date>-story-10-18.md`, in the shape of the two
existing notes: a `**Status:**` line, `**Author:** BigDev`, `**Raised:**` against this story at its
baseline, a *"Why this note exists"* section naming which questions are **not** in it and why, then one
`## Q<n>` per question with the gap, the options, and a recommended posture.
**And** it carries **at minimum these eight questions**:

- **Q1 — Is the Panel the Board acting in a moderation capacity, or a Clause-20(h) committee of it?**
  Determines whether §8.7 cites Clause 20(b) directly or 20(h) delegation, and whether Deed quorum binds.
- **Q2 — Does §8.7 adopt the §1.3 "Core Team" body, or is §1.3 amended?** The two-Panels defect.
- **Q3 — Is the Panel's Part 8 sanctioning authority exclusive?** §8.2 today lets *"a concealment flag
  confirmed by a **State Trustee**"* ground a suspension, and `pariwar_admin` holds `member.moderate` live.
- **Q4 — Does a thirteenth seeded role require OQ-3 confirmation?** `roles.ts:1-9` declares the 12-role set
  *"PROVISIONAL PENDING OQ-3"*, which the Panel owns (`prd.md:1526`).
- **Q5 — Does Decision `2026-08-06-080`'s Panel-attestation-only precedent extend to §8.7?** `080` ratified
  a lower-stakes section, while `sprint-change-proposal-2026-08-04.md:618` names §8.7 as counsel's
  critical-path deliverable. Escalation 6 proceeds on `080` without the Panel confirming it applies here.
- **Q6 — Does §1.3's Part-9 escalation-tier ranking corroborate the `pariwar` RBAC scope ceiling, or is
  that a category leap from an appeal-authority ranking to a scope-ceiling claim?** The rank-order argument
  stands on its own regardless (D2).
- **Q7 — Should `verifier` keep its inert `member.moderate` grant?** It holds the key at
  `scopeCeiling: 'district'` (`roles.ts:437`) against a `pariwar`-dimension gate, so it confers nothing.
  ⚠ Asked separately from Q3 because Q3 names only `pariwar_admin` and §8.2's State Trustee — **Q3 governs
  a live effective grant, Q7 an inert one, and the Panel may rule differently on each.**
- **Q8 — Does restoring a TERMINATED member require a formal Panel ceremony, rather than today's
  single-actor `trustee-discretion` action?** Story 10.17 deposited this at `deferred-work.md:3260` with the
  re-trigger *"Story 10.18 lands and defines what 'sanctioning authority' actually gates"* — **this story is
  that story**, so the trigger fires here. Raised at Task 1, not Task 9, or the "route it" branch is
  unreachable.

**And** every recommended posture is labelled **non-binding** — a suggestion the Panel may reject, not a
default assumed accepted by silence.
**And** it includes a *"What happens if this note is not answered"* section, **per question**, stated as a
**governance consequence**. This table is binding and is carried verbatim into the note:

| Q | Feeds | If unruled |
|---|---|---|
| **Q1** | Task 3 | ⛔ **BLOCKING.** §8.7 cannot be authored. → state **G2-BLOCKED**. |
| **Q2** | Task 3 | ⛔ **BLOCKING.** §8.7 cannot reconcile with §1.3, and an unreconciled §8.7 creates the two-Panels defect. → **G2-BLOCKED**. |
| **Q3** | Task 4, §8.7 text | **Defaults to CONCURRENT.** `pariwar_admin` keeps the grant; §8.7 says authority is concurrent; the *"if exclusive"* removal is recorded in `deferred-work.md` with the Panel ruling as re-trigger. State it in §8.7 — silence gets read as exclusivity later. |
| **Q4** | Task 4 | **Defaults to PROVISIONAL** (Escalation 5) — ships on the same footing as the other twelve, which `roles.ts:1-9` already declares. State it; do not treat as silent approval. |
| **Q5** | AC1 | **Defaults to PROCEED on `080`**, counsel review recorded as **owed**. The question exists so the Panel can override, not so the story waits. |
| **Q6** | Story/routing-note citation only | **Defaults to NO CITATION.** Consequence-free for the code (D2): the second argument never enters `roles.ts` either way. |
| **Q7** | Task 8 | **Defaults to DEFER** with an acceptance condition. Removal is the branch needing a ruling; keeping an inert grant is not. |
| **Q8** | Task 9 / AC9 | **Defaults to STATUS QUO** — today's single-actor path stands, re-deposited against **Story 10.19**, a *story*. ⚠ Second deposit; do not let it lapse a third time. |

**Only Q1 and Q2 block.** A default taken is recorded **as a default taken, never as a ruling.**
**And** the ruling is recorded as a `.decision-log.md` entry in the `2026-08-07-088` per-question shape,
numbered from the current head **`2026-08-09-095`** (`.decision-log.md:37`).
**And** per `[[feedback_supersede_never_reinterpret]]`, no existing Decision body is edited; a supersede
pointer is **added** if one is affected.

⚠ **Per-clause provenance is mandatory.** Decision `2026-08-09-095` exists precisely because a flat
*"Trustee-ratified."* line let author analysis inherit ratified authority by adjacency. **Label which
clauses are Panel rulings, which are defaults taken, and which are author findings.**

### AC3 — `trustee_panel` at a `pariwar` ceiling, recorded reason = the RANK ORDERING

**Given** `GEO_RANK` (`scope.ts:56-61`) = `{ global:0, pariwar:1, state:2, district:3, block:4 }`, *"lower
number = broader"*
**Then** a thirteenth bundle is added to `defaultRoleBundles`:
`{ role: 'trustee_panel', permissions: [MEMBER_MODERATE], scopeCeiling: 'pariwar' }`, using the existing
handle at `roles.ts:62` — **no new key, no new handle**. `finance_officer` (`roles.ts:401-410`) is the
structural template.
**And** the bundle comment records **the rank-order reason**: a `state`-ceiling grant can never satisfy a
`pariwar`-dimension check because `scopeWithinCeiling` is a pure numeric compare (`1 >= 2` → false) with
**no resolver parameter**, and `scopeContains` denies independently at `:193` before any resolver is
consulted. **Supplying a resolver would not have solved this.** The constraint is the ordering, not the
absence.

⛔ **Name the constants correctly — `CEILING_RANK` for the ceiling check, `GEO_RANK` for containment.**
`scopeWithinCeiling` (`:74-79`) reads **`CEILING_RANK`** (`:64-67`), not `GEO_RANK`. The arithmetic and
conclusion are unaffected (`CEILING_RANK` spreads `GEO_RANK`), but writing `GEO_RANK` pins a **false
mechanism** into production code — the exact defect class AC7 exists to purge. `scopeContains`'s `:193`
deny **is** `GEO_RANK`-based. **This applies to every Family-A marker Task 7 rewrites, not only to this
bundle comment.**

**And** the comment states the ceiling is **not** a workaround for the missing resolver.
**And** ⛔ **the §1.3 tier-ranking argument is NOT written into the code comment** (D1/D2) — it is
unratified pending Q6, and a `roles.ts` comment cannot show ratification status.
**And** the route is confirmed unchanged: `apps/api/src/modules/member-moderation/routes.ts:112` already
gates at `{ dimension: 'pariwar' }`. **No route change is required or permitted** — except that a Q3
"exclusive" ruling makes removing `pariwar_admin`'s grant a `defaultRoleBundles` **data** edit (Task 4), not
a route change and not schema DDL (`role_grants.role` is plain `text`).

### AC4 — The thirteenth role crosses SIX parity surfaces

**Given** no seeded role has been added since Story 1.8 — there is no mint precedent for a *role*
**Then** all six surfaces are updated, honouring the ordering constraint:

1. `packages/domain/src/rbac/roles.ts:30-42` — `SeededRole` union gains `| 'trustee_panel'`
2. `roles.ts` — the `defaultRoleBundles` entry (AC3)
3. `packages/contracts/src/rbac/roles.ts` — `SeededRoleSchema` gains the literal **in the same index
   position as `defaultRoleBundles`**; `packages/contracts/tests/rbac.test.ts:144-147` asserts
   `SeededRoleSchema.options` **`toEqual`** `defaultRoleBundles.map(b => b.role)` — **order-exact**
4. `packages/contracts/src/rbac/roles.ts:55` — `SEEDED_ROLE_SCOPE_CEILING` gains `trustee_panel: 'pariwar'`.
   ⚠ Omitting it is a **hard `pnpm typecheck` failure** (`TS2741`) — the map is
   `Record<SeededRoleSchema, ScopeDimensionSchema>`, total over the enum union. **The real unguarded hazard
   is a *wrong* value**: `trustee_panel: 'district'` typechecks and then makes `superRefine` reject every
   pariwar-scoped grant — an inert role, the same defect as AC8's `verifier`.
5. `openapi/v1.yaml:175-188` — the hard 12-value `RoleBundle.role` enum (anchor `&a2`). Regenerate with
   **`pnpm contracts:emit-openapi`** and **commit**, or `contracts:check-openapi-determinism` fails
6. ⭐ **The prose surface: ~12 sites hard-code "12 seeded roles."** Verified live: `roles.ts:1,:3,:25` (**the
   OQ-3 header AC2 Q4 quotes**), `rbac/index.ts:13`, `rbac/scope.ts:5`, `schema/role_grants.ts:56-58`,
   `contracts/src/rbac/roles.ts:9,:19`, `contracts/src/rbac/scope.ts:5`, test titles at `roles.test.ts:32`,
   `scope.test.ts:35`, `rbac.test.ts:94`, and the const **`TWELVE_ROLES`** → rename to **`SEEDED_ROLES`** so
   the next role addition does not repeat this sweep. A story whose AC7 purges stale comment claims must not
   ship twelve fresh ones.

**And** a **domain↔contracts ceiling parity assertion** is added — **behavioural, not by export**.
`SEEDED_ROLE_SCOPE_CEILING` is **module-private** (`contracts/src/rbac/roles.ts:55`, referenced only at
`:99`), so asserting it directly would require widening `@twt/contracts`' public API, which this story does
not authorize. **Instead:** for every bundle in `defaultRoleBundles`, construct a `RoleGrant` at that
bundle's own `scopeCeiling` and assert `RoleGrantSchema` **parses it successfully** — exercising the same
`superRefine` ceiling lookup, with no production change.
**And** ⭐ **that assertion is REVERT-PROBED RED**: all 12 ceilings currently agree, so it goes green on day
one, and a gate that has never failed proves nothing
(`[[feedback_gate_scope_semantic_coverage]]`). Flip one ceiling, confirm red, revert. Record the output.
**And** every test hard-coding twelve is updated, not deleted: `roles.test.ts:17-30`, `:33-36`, and each
negative holder-loop at `:145, :160, :175, :192, :210, :228, :247` now also asserts `trustee_panel` does not
hold the key in question. (Safe: none of the seven covers `member.moderate`.)
**And** a new holder-set assertion is added in the shipped pattern
(`it('Story 10.18 — member.moderate holders are exactly …')`).

⛔ **No migration is authored.** `schema/role_grants.ts` declares `role` as plain `text`, **deliberately not
a `pgEnum`** — *"a `text` column lets the set change without an enum migration."* Only `scope_dimension` is
enum-constrained and `pariwar` is already a member. **A migration here would be a defect.**

### AC5 — The catalog bumps 29 → 30

**Given** the epic's *"bumps 28 → 29"* is stale (live: 29) but its instruction to bump is **unconditional**
**Then** the catalog bumps **29 → 30**, treating the catalog version as the version of the *capability
model* (roles included), so a consumer caching authorization decisions sees the model move. This corrects
the number; it does not reopen whether to bump.
**And** the `permissions.ts` changelog block and Completion Notes record that this is a **deviation from the
key-minting precedent** — every prior bump minted a key; this one mints a role.
**And** `permissions.test.ts:54` → `toBe(30)`, its provenance comment **extended, never truncated**.
**And** `expect(PERMISSION_CATALOG.keys).toHaveLength(40)` (`:56`) **stays at 40**. If it moves, a key was
minted and the story has exceeded scope.

### AC6 — `member.suspend` is deprecated, mechanized, revert-probed. NOT removed.

**Given** `epics.md:3741-3743` — deprecated not removed, key stays enforceable, existing grants honoured, no
new grants, every declaration site names the successor, *"a CI assertion fails if a new grant appears"*
**And given** `member.suspend` (`permissions.ts:397`) is granted to **four roles explicitly** —
`pariwar_admin` (`roles.ts:237`), `state_trustee` (`:347`), `district_admin` (`:359`), `block_admin` (`:398`)
— **plus `super_admin`, which holds it through `defaultRoleBundles` like any other holder**, its bundle
being `permissions: PERMISSION_CATALOG.keys` (`roles.ts:224`). It is **checked by zero production call
sites**.
**Then** the key stays, all grants stay, **no grant is removed** — removal is a later, separate bump.
**And** a deprecation marker is introduced. ⚠ **No `deprecated` convention exists in this codebase**;
there is nowhere to hang a flag. **This story invents it**, and it must be **machine-readable** because a CI
assertion cannot read a comment: export `DEPRECATED_PERMISSION_KEYS` + `isDeprecatedKey()` from
`permissions.ts`. Do **not** restructure `SEED_PERMISSION_KEYS` into an object array — that breaks
`SeedPermissionKey`, `PERMISSION_CATALOG.keys`, `permissions.test.ts:57-59` and `PermissionCatalogSchema`.
**And** every declaration site (`permissions.ts:397`, `roles.ts:61`, the four grant sites) names
**`member.moderate`** as successor.
**And** the CI assertion is a **whole-state invariant scan, never a git-diff** — the repo standard
(`scripts/governance-boundary/check.ts`). It imports `defaultRoleBundles`, collects the `member.suspend`
holder set, and asserts it equals the frozen baseline
`['block_admin','district_admin','pariwar_admin','state_trustee','super_admin']` — **five entries**.
**And** ⭐ **REVERT-PROBED RED**: add a **sixth** holder, confirm failure, revert. Record the output.
**And** ⛔ **its REACH is stated honestly in its failure message**: it inspects `defaultRoleBundles` only.
There is **no SQL seed, no production `seedRoles()` caller, no `role_grants` write path**, and static CI has
no database. *"No new grants"* is enforced over the **declarative bundles only.**

**Placement:** either a new `it(...)` in `roles.test.ts` (cheapest) **or** a
`scripts/<name>/{check.ts,lib.ts,lib.test.ts,README.md}` gate registered in **both** root `package.json` and
`scripts/ci-local.sh`. State which and why.

### AC7 — Every stale geo-deferral marker is handled, SPLIT BY FAMILY

**Given** V2 (`sprint-change-proposal-2026-08-04.md:65`) and `epics.md:3734-3736`, whose *"~14 marker
sites"* is an **undercount**

⛔ **THE COUNTING RULE — apply it before counting anything.** Prior attempts produced four irreconcilable
figures because they measured **different things**. The binding rule:

> Count **geo-deferral comment BLOCKS**: a contiguous comment run whose deferral reference is offered as the
> promised fix for a scope/containment gap.
> - **Marker string: `Epic[ -]3` — BOTH spellings.** The repo writes it both ways and the **hyphenated form
>   dominates** in `permissions.ts`. Matching only `Epic 3` silently drops roughly half the population.
> - **Scope: non-test, non-`dist` source under `packages/` and `apps/`, extensions `.ts` AND `.tsx`.**
> - **Excluded:** `.test.ts` / `.spec.ts`, anything under `dist/`, and references that are not geo-deferrals
>   (e.g. `permissions.ts:18` *"members at Epic 3"*, an epic-timing note) — the largest source of
>   over-counting.
> - **Block boundary:** where one unbroken comment run covers several keys (`permissions.ts:236-266`) or is
>   a single catalog JSDoc (`:77-366`), count **one block per deferral subject**, not per comment run.
>   Otherwise the count collapses to 1 and the `P#` labels become meaningless.

✅ **DERIVED 2026-08-10 — the count is now settled: 45 geo-deferral BLOCKS across 19 files** (Family A
**24**, Family B **21**), plus **1 named site** (`member-moderation/routes.ts`) carrying no marker string.
The full label→site table is in **Task 7** and is the execution authority. Three corrections it makes to
the earlier drafts: `schema/cycle_freeze_commits.ts` is **excluded** (FK-posture, not a geo-deferral); the
banners **mirrors are included** (settling the open inclusion-rule question); and `scope.ts` has **four**
blocks (S1–S4), not the draft's five-with-a-gap.

**Verified line counts under `Epic[ -]3`** (the *population* the blocks were derived from):

| | `roles.ts` | `permissions.ts` | `scope.ts` | Repo-wide |
|---|---|---|---|---|
| **Union lines** | **13** | **21** | **5** | **115** (`.ts`) · **119** (with `.tsx`) · **56 files** |

⚠ **Two corrections to earlier reviews that must not be re-reversed:** the previously-blessed `11/9/3` is a
count of the **space-spelled subset only** and is **not** the marker population — it may and should be
superseded. And a figure of **20** for `permissions.ts`, previously ordered discarded, is **correct** for geo
markers (21 union minus `:18`). ⛔ **Do not restore the "do not fix 11/9/3" or "discard on sight"
instructions.**

**Then** this story **does NOT build the geo-tree resolver.** `denyDeeperGeoResolver` (`scope.ts:133-135`)
is **byte-unchanged** — the **const only**; its doc comment `:126-132` is editable.
**And** every marker is handled by family: **Family A REWRITTEN in place** to the rank-order reason (naming
`CEILING_RANK`/`GEO_RANK` correctly per AC3), **never re-pointed**; **Family B RE-POINTED** to Story 1.18.
**And** the successor is **`Story 1.18 — Geo-Tree Scope Resolver`**, key `1-18-geo-tree-scope-resolver`.
⭐ **The numbering rule, stated so it is not invented:** *the successor belongs to the epic that owns the
model it extends, at that epic's next free sequential number.* The resolver extends the RBAC
scope-containment model minted by **Story 1.8** in **Epic 1**, whose highest live key is `1-17-…`.
It is **not** an Epic 3 story: Epic 3 supplies the geo **data**, which is the dependency whose arrival was
mistaken for the fix.
⚠ **`epic-1-retrospective` is `done`.** Placing 1.18 there is deliberate — the alternative (parking it in
whichever epic is open) is how the original deferral became unowned. Record this reasoning in the `epics.md`
entry so it is not later "corrected."
**And** the successor is a **STORY with acceptance criteria, never an epic.** ⭐ **This is the whole lesson.**
`deferred-work.md:1472` (D1-1.8) already carries this deferral with `Re-trigger: Epic 3 member/geo data
landing` — **that trigger fired and nobody saw it**: `member_postings.district` landed with Story 3.1/3.9,
both `done`, and no resolver was built, because **a deferral naming an epic expires unowned**
(`[[project_r7_fact_producer_unbuilt]]`).
**And** `deferred-work.md:1472` is **rewritten**, and `:853` and `:3186` re-pointed to Story 1.18.
**And** the Epic-3 evidence is worded at **story granularity**: `sprint-status.yaml` literally reads
`epic-3: in-progress` even though all fourteen Epic 3 stories and the retrospective are `done` (Epics 4–10
read the same — the roll-up key is never flipped). *"Epic 3's stories are all `done`"* is checkable;
*"Epic 3 is `done`"* is checkably false against the file.

### AC8 — The inert `verifier` grant is confronted, not stepped over

**Given** `verifier` holds `member.moderate` (`roles.ts:436`) at `scopeCeiling: 'district'` (`:437`), while
the only route gating that key checks `{ dimension: 'pariwar' }` (`routes.ts:112`) — so
`scopeWithinCeiling('pariwar','district')` is `1 >= 3` → **false**
**Then** the grant is **inert today**, exactly the "INERT/false capability" Story 10.3's review refused to
seed.
**And** the story **either** records it as a deliberate deferral with an acceptance condition, in the shipped
10.3/10.4 form, **or** removes it — but does **not** leave it unremarked while adding a second
`member.moderate` holder beside it.
**And** the choice is pinned by **two** assertions, because one is not sufficient:
- `check.test.ts` in the shipped `it('DEFERRAL PIN: …')` form — ⚠ but note this form builds a **synthetic**
  bundle deliberately, *"so the proof is catalog-independent"* (`check.test.ts:461`). **It pins the scope
  algebra, not the grant**, and passes identically whether or not `verifier` holds the key.
- **plus a catalog-DEPENDENT `roles.test.ts` holder assertion naming `verifier` explicitly** — asserting it
  **does** hold `member.moderate` (defer branch) or **does not** (remove branch). Required on **both**
  branches; without it the recommended branch ships an unpinnable pin.

> **Recommended (non-binding): record as a deferral, do not remove.** Removal changes who can moderate,
> which is a Panel question — **Q7**. A suggestion the Panel may reject, not a default accepted by silence.

### AC9 — What this story does NOT unblock is recorded

**Then** the Completion Notes and `deferred-work.md` record, explicitly:
1. **Story 10.20 is unblocked; 10.19, 10.21, 10.22 are not** — all still `backlog`, none depends on this
   story. Constituting the Panel does not make termination safe.
2. **`deferred-work.md:3260`'s re-trigger fires here** and is routed as **Q8** (AC2). Do not let it lapse.
3. **The counsel review of §8.7 remains OWED**, recorded as un-attested per
   `[[feedback_record_unattested_no_backfill]]`.
4. **The ten unlanded Part 8 items** remain unlanded, and PRD FR-56's `§8.4a` citation remains dangling.
5. **The `member.suspend` removal bump is NOT scheduled** by this story (Escalation 4).
6. Escalations **2, 3, 7** (raised-not-resolved) and **D5's re-trigger** are deposited with concrete owners.

---

## Load-Bearing Decisions

### D1 — ⭐ The governance half is not a preamble; it is the story.

An implementer reading only the AC list sees one role, one constant, one marker and a comment sweep —
perhaps forty lines of code — and will be tempted to do that first and write the amendment afterwards.
**That inverts the story.** `epics.md:3727` requires the amendment to land *first*, and the repo mechanizes
the ordering in `git log`. If code lands first, AC1 cannot be retroactively satisfied without rewriting
history, and the story will have granted a capability to a body the instrument had not constituted — **the
precise thing it exists to prevent.**

### D2 — The `pariwar` ceiling rests on the rank ordering ALONE.

`state`/`district`/`block` can never satisfy a `pariwar` check (a pure numeric compare), and `global` would
make the Panel cross-tenant, contradicting multi-Pariwar isolation. **This alone fixes the ceiling.**

⚠ **The second argument — that §1.3 places the Panel above State Trustee — is NOT ratified, and does NOT
enter production code.** It conflates a grievance-appeal tier ranking with an RBAC scope-ceiling claim.
Routed as **Q6**; whatever the answer, the bundle comment carries the rank-order reason only. A `roles.ts`
comment cannot show ratification status, which is how author analysis inherits ratified authority by
adjacency — the defect `2026-08-09-095` exists to prevent.

### D3 — RECOMMENDED (NON-BINDING), needs Panel recording. §8.7 adopts the §1.3 body.

§1.3 already exists, already places the Panel above State Trustee, already mirrored in Hindi. A parallel
§8.7 body would put two Trustee Panels in one instrument. **But this is Q2 — a BLOCKING question. If the
Panel does not rule, §8.7 is not authored to this recommendation by default; the story stops.**

### D4 — The `deprecated` convention must be machine-readable.

The epic asks for a declaration-site note *and* a CI assertion. A comment satisfies the first and cannot
satisfy the second. `DEPRECATED_PERMISSION_KEYS` + `isDeprecatedKey()` is the least invasive shape: additive,
no type breakage, directly inspectable. **A convention other stories will inherit.**

### D5 — An accepted asymmetry: the gate is narrower than the promise, and says so.

`epics.md:3742` promises *"a CI assertion fails if a new grant appears."* What is buildable asserts over
`defaultRoleBundles` only — the complete set of statically-inspectable grants, because no seed, migration or
admin write path for `role_grants` exists. **Build it, and state its reach in the failure message.**
**Re-trigger:** see Escalation 4 — this and the `member.suspend` removal share one named owner.

### D6 — Do NOT touch `GEO_RANK`, `CEILING_RANK`, `scopeContains`, or `denyDeeperGeoResolver`.

The RBAC permission-key + scope-dimension model is **architectural freeze row 9**, enforced by
`scripts/governance-boundary/check.ts` and `capability-bar.ts:72-73`. Re-ranking `pariwar` and `state` would
"fix" the state_trustee family and silently re-authorize every grant in the system. If it is ever right, it
is an ADR and a story of its own. Nine tests pin the deny-deeper behaviour (`scope.test.ts:98`,
`check.test.ts:184`, `:64`, `:439`, `:479`, `:508`, `:539`, `bulk-operations/execute.test.ts:240`,
`integration/reports/reports.spec.ts:124`) — **all must stay green and unmodified.** ⚠ AC8 **adds** new
assertions; it never modifies these.

---

## Escalations owed

1. ⛔ **Q3 — `pariwar_admin` holds `member.moderate` today and this story does not remove it.** If §8.7
   makes Panel authority **exclusive**, that grant contradicts the instrument from the moment §8.7 lands and
   a `defaultRoleBundles` edit is owed (Task 4). ⚠ "Migration" here means a **bundle-data edit, never schema
   DDL**. If **concurrent**, §8.7 must say so. Either way the answer is the Panel's, and the implementer must
   not settle it by leaving the grant and saying nothing. The same question reaches §8.2's *"State Trustee"*
   and §8.3's *"Trustee discretion"* — both name authorities other than the Panel, inside Part 8.

2. ⚖ **The `[[v1.0]]` placeholders make every Niyamavali amendment un-versionable.** `niyamavali.md:5` has
   never had a version, effective date, or Board-resolution reference; Part 11 requires all three. §8.7 has
   no version anchor, and a later reader asking *"as of which version?"* has no answer. **Not this story's to
   fix** — Story 0.13 / the Board-adoption event. Raised, not resolved. → `deferred-work.md`.

3. ⚖ **Two Niyamavali surfaces exist and only one is amended.** The seeded registry
   (`packages/domain/seed/niyamavali-v1-clauses.sql`) carries 22 clauses and **none from Part 8**. §8.7 is a
   document amendment only, with no `clause_versions` row — so the public render (Story 2.5) and the rule
   engine will not know it exists. **Confirm this is intended rather than an omission.** → `deferred-work.md`.

4. ⚠ **The `member.suspend` removal has no owner — and neither does D5's extension.** AC6 forbids removal
   here; the epic says removal is *"a separate, later catalog bump, taken only once no live grant references
   it."* ⛔ **Both this and D5's re-trigger previously named *"the first story that builds a `role_grants`
   write path"* — a story that does not exist and is unowned**, which is the epic-named-deferral failure AC7
   diagnoses, one indirection deeper. **Concrete replacement:** both are owned by **the first story that adds
   a `role_grants` write path OR removes the last `member.suspend` bundle entry, whichever comes first**; if
   neither has happened by Epic 11a's start, the obligation is re-raised to the Panel as an explicit agenda
   item. Record with that wording, not a bare "later."

5. ⚠ **A thirteenth role touches OQ-3, which the Panel owns** (`roles.ts:1-9`, `prd.md:1526`). This is Q4.
   If the Panel declines to rule, the role ships **provisional on the same footing as the other twelve** —
   which the file header already declares — **and that must be stated, not assumed.**

6. ⚖ **The counsel-review requirement and the working precedent point in opposite directions.**
   `niyamavali.md:13-15` and Part 11 require routing through counsel and recording `[LEGAL]` acceptance;
   `sprint-change-proposal-2026-08-04.md:618` names §8.7 as counsel's critical-path item. But
   `review-scope-charter.md:5` records the engagement as awaiting ratification, Story 0.13 has not closed, no
   counsel is selected, every ledger field is a placeholder. Meanwhile `2026-08-06-080` amended the
   Niyamavali on Panel attestation alone. **Proceed on the `080` precedent and record the gap — do not
   manufacture a `[LEGAL]` line, and do not block indefinitely on an unengaged counsel.** Confirmation
   routed as **Q5**.

7. ⚖ **`docs/legal/` being gitignored means no governing instrument is under review, ever.** The
   Niyamavali, Trust Deed, T&C and Privacy Policy are all untracked. Amendments leave no diff, no blame, no
   PR surface, and no way to answer *"what did §8.7 say on date X?"* other than the decision log. This story
   works within the constraint (AC1) rather than changing it — **but the constraint is a governance risk
   larger than this story.** Raised, not resolved. → `deferred-work.md`.

---

## Tasks / Subtasks

### Task 0 — Orient (AC: all)

- [ ] `git fetch origin` and confirm `main` is still at `71aae71`
      (`[[feedback_git_fetch_before_remote_reasoning]]`).
      **If it moved:** (a) `git log --oneline 71aae71..origin/main` and read every commit touching
      `packages/domain/src/rbac/`, `packages/contracts/src/rbac/`, `docs/legal/`, `.decision-log.md`;
      (b) re-derive `PERMISSION_CATALOG_VERSION`, the `.decision-log.md` head, and the AC7 marker counts;
      (c) re-verify the ~80 line-pins in this story with `grep`, not by eye; (d) record what moved in the
      Completion Notes. **Do not proceed on stale pins** — `member-moderation/routes.ts`'s three stale pins
      are exactly what unverified line-pinned prose becomes.
- [ ] Confirm `PERMISSION_CATALOG_VERSION` is still `29` (`permissions.ts:367`).
- [ ] Confirm `niyamavali.md:170-183` still ends Part 8 at §8.4 — **and the same for `niyamavali.hi.md`**.
- [ ] Confirm `.decision-log.md:37` head is still `2026-08-09-095`.
- [ ] Run `git check-ignore -v docs/legal/niyamavali.md` and see it match, **before** planning any commit
      involving it.
- [ ] ⭐ **Derive the marker BLOCK count under AC7's counting rule**, and emit a **label→site table**
      (`P#`/`R#`/`S#` · file · line range · family · reason). Those labels are used by Task 7 and defined
      nowhere else — **Task 7 is not executable until this table exists.** Include `scope.ts` **S4**, which
      no earlier draft assigned to either family. Record the table in Task 7 and the total in AC7.
      ⚠ Use `Epic[ -]3` (both spellings) and include `.tsx`. Verified union line counts are in AC7 as the
      population; the block count is yours to derive.
- [ ] Read in full before writing a line: `packages/domain/src/rbac/{scope,permissions,roles}.ts`,
      `packages/contracts/src/rbac/roles.ts`, `docs/legal/niyamavali.md` Parts 1/8/9/11,
      `docs/legal/trust-deed.md` Clauses 18–20.

### Task 1 — ⭐ FIRST: the routing note (AC: 2) → state **G0**

- [ ] Author the routing note carrying **Q1–Q8**, each with the gap, the options, a recommended posture
      **labelled non-binding**, and its unruled consequence.
- [ ] Carry **AC2's eight-row consequence table verbatim**. **Q1 and Q2 BLOCK**; **Q3–Q8 have stated
      defaults** (concurrent · provisional · proceed-on-`080` · no-citation · defer · status-quo). A default
      taken is recorded **as a default taken, never as a ruling.**
- [ ] Commit alone, prefixed `governance:`, on branch `governance/10-18-trustee-panel-constitution`.

### Task 2 — Obtain the Panel's ruling (AC: 1, 2) → **G1 → G2-READY or G2-BLOCKED**

⛔ **Nothing is written to `.decision-log.md` in this task.** The ruling and the amendment text are **one
governance act**, recorded in **one** entry, committed **once**, at Task 3 — when both inputs exist. This
replaces an earlier "stage it now, complete it later" design that produced an **impossible state**: on an
unruled Q1/Q2 the entry could never be completed *or* committed, leaving a dangling governance torso.

- [ ] Route the note to the Panel and collect rulings.
- [ ] **If Q1 AND Q2 are ruled** (Q3–Q8 ruled or defaulted) → **G2-READY**. Hold the rulings; proceed to
      Task 3.
- [ ] ⛔ **If Q1 or Q2 is unruled** → **G2-BLOCKED. STOP. Do not proceed to Task 3 or any later task.**
      Write a **BLOCK RECORD** — which is **not** a `.decision-log.md` entry, because nothing enters the
      decision log without a decision:
      - a dated section appended to the **routing note**: which questions went unanswered, when the note was
        raised, that the story is halted at Task 2, and what would unblock it;
      - a `deferred-work.md` entry with the Panel ruling as re-trigger;
      - `sprint-status.yaml` flipped to `blocked`;
      - committed `governance:`. **Clean tree, nothing dangling, no partial ratification anywhere.**
- [ ] ⚠ **Only Q1/Q2 block.** An unruled Q3–Q8 takes its stated default and the story continues — a blanket
      halt would contradict Escalation 5's licence to ship the role provisionally on an unruled Q4.

### Task 3 — Author §8.7 and record the ratification, atomically (AC: 1) → **G2-READY → G3**

- [ ] Re-confirm `.decision-log.md`'s head **immediately before writing** (it may have moved during Task 2)
      and number from it. Re-confirm `PERMISSION_CATALOG_VERSION` is still `29`.
- [ ] Add §8.7 to `docs/legal/niyamavali.md` after §8.4, and the structurally identical §8.7 to
      `docs/legal/niyamavali.hi.md`.
- [ ] Confirm the Hindi §8.7 is **semantically** equivalent, not merely positionally identical — it is a
      co-equal governing instrument.
- [ ] Reconcile with §1.3 per the **Q2 ruling** — adopt-and-extend, or amend §1.3 in the same act.
- [ ] Expressly distinguish §8.7's body from Part 9's *"State Trustee panel"* and its ≥2-trustee quorum.
- [ ] Cite Deed Clauses 18/19/20(b)/20(h); **do not restate numbers**.
- [ ] Update `## APPENDIX A — RULE INDEX` in both files if §8.7 introduces an indexable rule.
- [ ] ⛔ No version bump, no effective date, no `[LEGAL]` line.
- [ ] **Write the Decision entry COMPLETE, in one pass**: the Q1–Q8 rulings, **§8.7 quoted verbatim**, and
      per-clause provenance labelling **which clauses are Panel rulings, which are defaults taken, and which
      are author findings**. Nothing is staged, and no committed Decision is ever edited afterward.
- [ ] ⛔ `docs/legal/` is gitignored — these edits produce **no diff**. `git status` showing no change there
      is expected, not a failure. The verbatim quote **is** the record.
- [ ] Commit **once**, `governance:`, governance artifacts only. **Cut `feat/10-18-…` from this commit** →
      **G4**.

### Task 4 — The thirteenth role, across six surfaces (AC: 3, 4)

- [ ] `roles.ts` — extend `SeededRole`; add the bundle with **the rank-order reason only**, naming
      **`CEILING_RANK`** for the ceiling check and `GEO_RANK` for containment. ⛔ The §1.3 argument does not
      enter the comment.
- [ ] `contracts/src/rbac/roles.ts` — `SeededRoleSchema` **in matching index position**;
      `SEEDED_ROLE_SCOPE_CEILING` entry.
- [ ] `pnpm contracts:emit-openapi` and **commit `openapi/v1.yaml`**.
- [ ] **Surface 6 — the prose sweep.** Fix all ~12 "12 seeded roles" sites listed in AC4 and rename
      `TWELVE_ROLES` → `SEEDED_ROLES`. Search `12 seeded`, `twelve`, `TWELVE`, `toHaveLength(12)` across
      `packages/{domain,contracts}/src/rbac` and their tests before declaring this task done.
- [ ] **Add the behavioural ceiling-parity assertion** (AC4): for each bundle, build a `RoleGrant` at its own
      `scopeCeiling` and assert `RoleGrantSchema` parses. **No production export.**
- [ ] ⭐ **Revert-probe the parity assertion RED**: flip one ceiling, confirm failure, revert. Record output.
- [ ] Update `roles.test.ts` numerics and the seven negative holder-loops; add the AC4 holder-set assertion.
- [ ] ⛔ **If Q3 was ruled "exclusive": remove `pariwar_admin`'s `member.moderate` entry (`roles.ts:238`)
      here** — AC3 and Escalation 1 say it is owed, and this is the only task touching `defaultRoleBundles`.
      Move AC4's holder-set assertion with it, record the removal as its own line item in the Decision's
      per-clause provenance, and confirm the set matches what Task 8 pins. **Bundle-data edit, never DDL.**
- [ ] If Q3 was **not** ruled, apply the default (**concurrent**): grant stays, conditional removal recorded
      in `deferred-work.md` with the Panel ruling as re-trigger, **as a default taken**.
- [ ] Verify no migration was created.

### Task 5 — The catalog bump (AC: 5)

- [ ] Re-confirm `PERMISSION_CATALOG_VERSION` is still `29` — if a story landed a bump during Tasks 1–4 the
      target moves from 30 to 31.
- [ ] Bump 29 → 30; write the deviation-from-precedent reasoning into the `permissions.ts` changelog block.
- [ ] `permissions.test.ts:54` → `toBe(30)`; **extend** its provenance comment.
- [ ] Confirm `toHaveLength(40)` is unchanged.

### Task 6 — Deprecate `member.suspend`, and prove the gate bites (AC: 6)

- [ ] Add `DEPRECATED_PERMISSION_KEYS` + `isDeprecatedKey()` to `permissions.ts`.
- [ ] Deprecation notes at `permissions.ts:397`, `roles.ts:61`, and the four grant sites, each naming
      `member.moderate`.
- [ ] Build the whole-state holder-set assertion (not a git-diff).
- [ ] ⭐ **Revert-probe RED**: add a **sixth** holder (the baseline has five), confirm failure, revert.
      Record output.
- [ ] State the assertion's reach in its failure message.
- [ ] If built as a `scripts/` gate: register in root `package.json` **and** `scripts/ci-local.sh`.

### Task 7 — Handle every marker, split by family (AC: 7)

> ## ✅ Task 0's LABEL→SITE TABLE — derived 2026-08-10, THIS IS THE AUTHORITY
>
> Counted under AC7's rule: geo-deferral comment **blocks**, marker string **`Epic[ -]3` (both
> spellings)**, `.ts` + `.tsx`, non-test, non-`dist`, one block per **deferral subject**.
> ⚠ **Line numbers are post-Task-4/5/6** — `permissions.ts` and `roles.ts` shifted. Re-derive with
> `grep -nE "Epic[ -]3"` if any further edit lands before Task 7 runs.
>
> **TOTAL: 45 blocks across 19 files** — Family A **24**, Family B **21**, plus **1 named site** carrying
> no marker string. Population: 119 marker lines / 56 files; the remaining 37 files are **excluded** as
> epic-timing, FK-posture, or consumer-ownership references, not geo-deferrals.
>
> ### Family A — RANK-ORDER. Rewrite in place. Never re-point. (24 blocks)
>
> | Label | File | Lines | Subject |
> |---|---|---|---|
> | P3 | `domain/src/rbac/permissions.ts` | 172, 175, 177 | D-B reconciliation / `cycle.freeze` |
> | P4 | ″ | 186–187 | `state`-ceiling vs pariwar-dimension |
> | P5 | ″ | 208 | pariwar-dimension keys, Trustee-Lite |
> | P6 | ″ | 221–222 | Trustee-Lite precedent |
> | P7 | ″ | 231–232 | `reconciliation.review` |
> | P9 | ″ | 501, 503 | pariwar-dimension check |
> | P10 | ″ | 510 | `claim.r9_vote` + panel membership |
> | P11 | ″ | 529 | `appeal_stage3_decide` |
> | P12 | ″ | 539 | version-bump note |
> | P13 | ″ | 546 | `reconciliation.review` reviewer |
> | R1–R5 | `domain/src/rbac/roles.ts` | 102, 106, 111, 118, 124 | key-handle comments |
> | R6–R10 | ″ | 288–289, 295, 300, 308, 314 | `pariwar_admin` bundle deferrals |
> | D10 | `api/…/claims/claims.cycle-freeze.routes.ts` | 13 | `state_trustee` deferred |
> | D11 | `api/…/claims/claims.r9-voting.routes.ts` | 15 | `state_trustee` deferred |
> | D12 | `api/…/pool-fixed-amount/index.ts` | 12 | `state_trustee` deferred |
> | D13 | `api/…/trustee-lite/handlers.ts` | 40 | district-ceiling vs pariwar — the 7th replay |
>
> ### Family B — GENUINE GEO-TREE. Re-point to Story 1.18. (21 blocks)
>
> | Label | File | Lines | Subject |
> |---|---|---|---|
> | P1 | `domain/src/rbac/permissions.ts` | 120–121 | `claim.conduct_ground_inspection`, block→district |
> | P2 | ″ | 157 | `claim.verify`, state→district console |
> | P8 | ″ | 486 | state→district check |
> | R11 | `domain/src/rbac/roles.ts` | 410 | `block_admin` ancestry |
> | R12 | ″ | 454 | `verifier` state→district (D3a) |
> | S1 | `domain/src/rbac/scope.ts` | 29 | injectable geo-tree seam |
> | S2 | ″ | 116–121 | canonical org tree / containment seam |
> | S3 | ″ | 126–132 | `denyDeeperGeoResolver` doc comment |
> | S4 | ″ | 179 | fail-closed until org tree |
> | D1 | `domain/src/reports/scope.ts` | 16 | district-narrowing below ceiling |
> | D2 | ″ | 71 | multi-node scope |
> | D3 | `domain/src/reports/templates/_shared.ts` | 5, 24, 40 | deny-deeper narrowing |
> | D4 | `domain/src/reports/templates/member-roster.ts` | 44 | deny-deeper |
> | D5 | `…/contribution-rate-by-district.ts` | 45 | deny-deeper |
> | D6 | `domain/src/news-blog/audience.ts` | 17, 19 | geo/designation selector |
> | D7 | `domain/src/banners/audience.ts` | 18, 40 | geo/designation selector |
> | D8 | `domain/src/banners/read.ts` | 23 | geo selector drift |
> | D9 | `domain/src/pool/fixed-amount.ts` | 78 | trustee directory + geo resolver *(compound)* |
> | D14 | `contracts/src/banners/enums.ts` | 45 | selection primitive |
> | D15 | `contracts/src/banners/dto.ts` | 43 | selection primitive |
> | D16 | `admin/src/modules/banners/derive.ts` | 60 | selection primitive |
>
> ### ⛔ Corrections to the draft lists — the table overrides all three
>
> 1. **`schema/cycle_freeze_commits.ts:23` is EXCLUDED**, though the draft listed it under Family B. It is
>    an **FK-posture** note (*"no `pariwars` base table to FK against pre-Epic-3"*), which AC7's counting
>    rule excludes explicitly. Do not edit it.
> 2. **The banners mirrors are IN scope** — D14/D15/D16 settle the open inclusion-rule question. The rule:
>    *a mirror carrying the same deferral prose is swept with its origin.* `contracts/src/banners/{enums,dto}.ts`
>    and `admin/src/modules/banners/derive.ts` all say "until the Epic-3 selection primitive lands", same as
>    `domain/src/banners/audience.ts`. Sweeping the origin and not its mirrors would leave the claim
>    half-corrected.
> 3. **`scope.ts` has FOUR blocks, not five.** The draft's `S1/S2/S3/S5` (with S4 missing) was a
>    line-based labelling; `:118` and `:120` are one contiguous doc comment on one subject. Labels are
>    S1–S4, contiguous, none missing.
>
> **Excluded populations, recorded so they are not re-litigated:** `permissions.ts:18` (*"members at
> Epic 3"* — epic timing); ~37 files of epic-timing / FK-posture / consumer-ownership references
> (`consent_records.ts`, `ids/index.ts`, `terms-and-conditions/*`, `schema/pool*`, `members.ts`,
> `apps/mobile/*`, the contracts consent/alerts/data-export families, and others). **None is a
> geo-deferral.** Verified by reading every one.

- [ ] **Execute against the label→site table above.** Where any draft list and the table disagree, **the
      table wins**.
- [ ] **Family A — REWRITE IN PLACE** to the rank-order reason (`CEILING_RANK` for the ceiling check,
      `GEO_RANK` for containment). ⛔ **Do not re-point Family A to Story 1.18.** 24 blocks, per the table.
      ⛔ **Do NOT edit `helpdesk.create` (`permissions.ts:236-248`) or `helpdesk.respond` (`:248-263`)** —
      zero markers in either spelling; already in target state.
- [ ] ⭐ **The moderation site — BOTH ranges, for different reasons**
      (`apps/api/src/modules/member-moderation/routes.ts`; note it carries **no** `Epic 3`/`Epic-3` string,
      so Task 0's count will not surface it — it is on this checklist by name):
      - **`:12-13`** — three stale pins: `permissions.ts:368` (live `:398`), `roles.ts:209` (live `:238`),
        and *"`PERMISSION_CATALOG_VERSION` **STAYS 28**"* (AC5 takes it to **30**). Fix all three.
      - **`:25-27`** — the recorded deferral itself: *"v1 holder is `pariwar_admin` (+ `super_admin`);
        `state_trustee` and `district_admin` are DEFERRED … its epic's protagonist unable to act."* **This
        story adds `trustee_panel` to that holder list and answers that finding.** AC7's instruction to
        *"name this story as the answer to the deferral the header records"* applies **here** — the deferral
        is recorded at `:25-27`, not at `:12-13`.
- [ ] **Family B — RE-POINT to `Story 1.18`.** 21 blocks, per the table. ⛔ `schema/cycle_freeze_commits.ts`
      is **excluded** (FK-posture, not a geo-deferral) despite appearing in the old draft.
- [ ] ⛔ `denyDeeperGeoResolver` (`scope.ts:133-135`) byte-unchanged — **the const only**; `:126-132` is
      editable.
- [ ] Rewrite `deferred-work.md:1472` (D1-1.8); re-point `:853` and `:3186` to Story 1.18.
- [ ] ⛔ **Mint Story 1.18 in its OWN `governance:` commit, before the marker sweep.** Add
      `1-18-geo-tree-scope-resolver` to `epics.md` under **Epic 1** **with acceptance criteria** (including
      the retrospected-epic reasoning) and to `sprint-status.yaml` as `backlog` after `1-17-…`. The marker
      edits may ride the code commit; **the creation of the owner may not.**
- [ ] Word the Epic-3 evidence at **story granularity** (AC7).

### Task 8 — The inert `verifier` grant (AC: 8)

- [ ] Defer-with-acceptance-condition (recommended) or remove, **per the Q7 ruling**; if unruled, take the
      **defer** default and record it as a default taken.
- [ ] ⛔ **ADD a new `check.test.ts` assertion in the DEFERRAL PIN form. Do NOT modify an existing one** —
      D6 freezes `check.test.ts:439/:479/:508/:539` among nine pins that "must stay green and unmodified."
      There is no `verifier` pin to "update."
- [ ] **Add the catalog-dependent `roles.test.ts` holder assertion naming `verifier`** — on **either**
      branch (AC8). The synthetic `check.test.ts` pin is catalog-independent and cannot observe the grant.
- [ ] **If the Panel ruled "remove":** delete the `member.moderate` entry from `verifier`'s bundle
      (`roles.ts:436`); record it as its own line item in the Decision's per-clause provenance; flip the
      `roles.test.ts` assertion to the negative form; and **update AC4's holder-set assertion to drop
      `verifier`** — the set changes by definition, so do not attempt to "confirm no change."
- [ ] ⚠ For the deferral prose, copy **`helpdesk.respond`'s** acceptance condition (`permissions.ts:264-265`)
      — `helpdesk.create` states the rank-order reason but carries **no** acceptance condition.

### Task 9 — Governance records, and the condition on `done` (AC: 9)

- [ ] `deferred-work.md` — a new dated section carrying: the counsel review owed; the `member.suspend`
      removal **and D5's extension** under Escalation 4's concrete owner; the six AC9 items; the Q8 outcome;
      and **Escalations 2, 3 and 7** (raised-not-resolved), each with a named destination.
- [ ] `sprint-status.yaml` — one combined `# last_updated:` ledger entry
      (`[[project_sprint_status_ledger]]`), reverse-chronological at top, carrying the governance chain
      (routing note → Decision), a `VERIFIED …` line naming exact gates and counts, and a `NEXT:` line.
      ⚠ **Split provenance honestly**: commit-pinned claims about git-tracked files vs on-disk reads of
      `docs/legal/`. Never attribute an untracked file's content to a SHA.
- [ ] Flip `development_status[10-18-…]`.
- [ ] ⚠ This task writes governance artifacts on `feat/10-18-…`, after the code commits. That is a known
      inversion of D1's ordering for the closing ledger entries specifically, accepted because the entries
      *describe* the completed work and cannot precede it. Record it; do not silently normalize it.

### Task 10 — Validate (AC: all)

- [ ] ⛔ **Confirm D1's ordering held, as an ASSERTION, over EVERY governance commit** — not a printed line
      for a human to skim, and not only the first commit. The story produces up to three governance commits
      (Task 1 routing note, Task 3 Decision, Task 7 Story-1.18 mint):

      ```sh
      BASE=$(git merge-base origin/main HEAD)        # merge-safe: works whether or not
                                                     # governance/… already merged to main
      FIRST=$(git rev-list --reverse $BASE..HEAD | head -1)
      git log -1 --format=%s "$FIRST" | grep -q '^governance:' \
        || { echo "D1 VIOLATED: first commit is not governance:"; exit 1; }

      for sha in $(git rev-list --no-merges $BASE..HEAD); do
        git log -1 --format=%s "$sha" | grep -q '^governance:' || continue
        if git show --stat --name-only --format= "$sha" | grep -qE '^(packages|apps)/'; then
          echo "AC1 VIOLATED: $sha touches packages/ or apps/"; exit 1
        fi
      done
      echo "D1 + AC1 ok"
      ```

      ⚠ `--no-merges` is required: `git show --stat --name-only --format=` emits **nothing** on a merge
      commit, so a merge would silently pass the AC1 check.
- [ ] `pnpm --filter @twt/domain lint` · `pnpm --filter @twt/contracts lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm test`
- [ ] `pnpm turbo run contracts:check-openapi-determinism` — **must PASS.** Task 4 already regenerated and
      committed `openapi/v1.yaml`; a red gate here means Task 4 was skipped, and is a defect, not an
      expected state.
- [ ] `pnpm ci:local` — record the outcome honestly, attested if run, un-attested if not
      (`[[feedback_record_unattested_no_backfill]]`). Note
      `[[project_ci_local_concurrency_oversubscription]]`, and that `git push` runs the full `ci:local` via
      the pre-push hook.

---

## Review history

Three pre-implementation review passes ran before any code was written. Findings are discharged; the
substance is folded into the ACs, Decisions and Tasks above, and the corrections that matter are recorded in
the Change Log. Counts: **pass 1** — 17 patches, 2 deferred, 3 dismissed. **pass 2** — 3 decisions, 27
patches (6 of them fixing defective pass-1 patches), 5 dismissed. **pass 3** — 1 decision, 21 patches (10 of
them fixing defective pass-2 patches).

⚠ **The recurring defect across all three passes was a fix applied to one location and not to its mirrors**
(an AC body but not its heading, an AC but not its task, either but not the `sprint-status.yaml` ledger).
This document was restructured after pass 3 specifically to reduce the number of mirrors. **When editing it,
prefer changing one authoritative statement over adding a second one elsewhere.**

Two deferrals remain open, in `deferred-work.md`: no process exists for a counsel review that comes back
**disagreeing** (downstream of Story 0.13 landing at all), and nothing propagates the gitignored
`docs/legal/` edits to other environments (a structural property of the `.gitignore` decision).

---

## Dev Notes

### Files to read before writing a line

| File | Why |
|---|---|
| `packages/domain/src/rbac/scope.ts` | `GEO_RANK:56-61`, **`CEILING_RANK:64-67`** (what `scopeWithinCeiling:74-79` actually reads), `scopeContains:153-211` (deny at `:193`), `denyDeeperGeoResolver:133-135` — do not touch the const. |
| `packages/domain/src/rbac/roles.ts` | `SeededRole:30-42`, `RoleBundle:45-50`, `super_admin:224`, `finance_officer:401-410` (the template), `verifier:436-437` (AC8), the four `member.suspend` grants, the OQ-3 header `:1-9`. |
| `packages/domain/src/rbac/permissions.ts` | `:367` the version; `:77-366` the changelog block to extend; `:375-606` the flat key tuple with nowhere to hang a flag. |
| `packages/contracts/src/rbac/roles.ts` | `SeededRoleSchema:20-33`, `SEEDED_ROLE_SCOPE_CEILING:55` (**module-private**). Order-exact parity test: `packages/contracts/tests/rbac.test.ts:144-147`. |
| `packages/domain/tests/rbac/check.test.ts` | `:439-451` the synthetic DEFERRAL PIN, `:461` the catalog-independence comment. |
| `docs/legal/niyamavali.md` | §1.3 `:39`, §5.3 `:126`, Part 8 `:170-183`, Part 9 `:186-194`, Part 11 `:207-212`, draft banner `:9-15`. |
| `docs/legal/trust-deed.md` | Clause 18 `:209-221`, Clause 19 `:223-231` (**quorum at `:227`**), 20(b) `:239`, 20(h) `:251`. |

### Anti-patterns — the nine ways this story goes wrong

1. **Writing the code first and the amendment after.** D1. Unrecoverable without rewriting history.
2. **Authoring the Panel's composition unilaterally.** The Panel's own constitution is the Panel's question.
3. **Bumping 28 → 29.** The live value is 29.
4. **Adding the role to `defaultRoleBundles` and stopping.** Six surfaces (AC4). ⚠ `SEEDED_ROLE_SCOPE_CEILING`
   **omission fails typecheck loudly** (`TS2741`); the hazard that slips through is a **wrong value**, which
   typechecks and silently makes the role inert.
5. **Re-pointing "Epic 3" → another EPIC.** Epic-named deferrals expire unowned. The successor is
   **Story 1.18**, with acceptance criteria.
6. **Re-pointing Family A to the successor.** Family A is **rewritten in place** — a resolver can never fix
   it, and re-pointing preserves the misdiagnosis under a fresher name.
7. **Counting markers with `grep 'Epic 3'`.** The hyphenated `Epic-3` spelling dominates in `permissions.ts`.
   Use `Epic[ -]3`.
8. **A comment-only deprecation.** Cannot fail CI, so AC6's assertion clause is undischargeable. D4.
9. **Seeing `docs/legal/` produce no git diff and concluding the amendment did not happen — or is not
   required.** It is gitignored. The Decision entry is the record. AC1.

### Reuse map

- The `member.moderate` handle exists: `roles.ts:62`. No new key, no new handle.
- The route already gates at `{ dimension: 'pariwar' }`: `member-moderation/routes.ts:112`.
- Gate skeleton: `scripts/governance-boundary/{check.ts,lib.ts,lib.test.ts,README.md}` — header naming the AC
  it mechanizes, whole-state scan, failure message naming the remediation workflow.
- Routing-note shape: `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-08-07-story-10-23.md`.
- Decision shape: `.decision-log.md` `2026-08-07-088` (per-question ratification).
- Deferral-with-acceptance-condition prose: `permissions.ts:264-265` (10.4 `helpdesk.respond`) — ⚠ **use this
  one**; `helpdesk.create` states the reason but carries no acceptance condition.

### Testing standards

Vitest 2.1.8; `packages/domain/tests/rbac/*.test.ts` mirrors `packages/domain/src/rbac/`; suffix `.test.ts`
(`.spec.ts` is reserved for live-DB integration specs). This story adds **no live-DB test** — everything it
touches is declarative. D6's nine deny-deeper pins must stay green and **unmodified**; AC4 and AC8 **add**
assertions. If an existing pin needs editing, the change has exceeded scope.

### Project structure

No new package, no new module, no migration. Production code: `packages/domain/src/rbac/` (3 files),
`packages/contracts/src/rbac/roles.ts`, `openapi/v1.yaml` (generated), plus the marker sweep and the prose
sweep. Governance artifacts: `docs/legal/niyamavali{,.hi}.md`, `.decision-log.md`, the routing note,
`deferred-work.md`, `sprint-status.yaml`, `epics.md` (Story 1.18).

⚠ **i18n:** any admin-facing copy ships keys in **both** `packages/i18n/locales/en/` and `hi/` (enforced by
`pnpm i18n:check`); `t()` defaults to the **`common`** namespace and **throws** on a miss — pass
`{ namespace }` explicitly (`[[project_missed_cycle_visibility_substrate]]`). This story is expected to need
none.

### References

- `epics.md:3715-3745` (Story 10.18 AC), `:3651-3658` (moderation preamble; *"10.18 gates 10.20"*)
- `sprint-change-proposal-2026-08-04.md:61-68` (V1–V3), `:226-258` (§4a), `:520-533` (Part 8 package), `:618`
- `docs/legal/niyamavali.md:39,126,129,170-183,191,207-212` · `niyamavali.hi.md:43,124`
- `docs/legal/trust-deed.md:209-231,227,239,251`
- `.decision-log.md:37` (head `2026-08-09-095`), `:306-341` (`089`), `:825-891` (`080`), `:342` (`088`)
- `.gitignore:67-68` — `docs/legal/` untracked
- `docs/legal-counsel-engagement/review-scope-charter.md:5,:63` · `counsel-roster.md:32`
- `packages/domain/seed/niyamavali-v1-clauses.sql` — 22 clauses, **none from Part 8**
- `packages/domain/src/rbac/scope.ts:50-79,126-135,153-211` · `permissions.ts:367,375-606` ·
  `roles.ts:1-9,30-50,224,401-410,436-437`
- `packages/contracts/tests/rbac.test.ts:144-147` · `packages/domain/tests/rbac/check.test.ts:439-461`
- `deferred-work.md:853,1472,3186,3260`
- `_bmad-output/implementation-artifacts/10-3-helpline-call-to-ticket-operator-surface.md:240` — the
  inert-grant precedent
- `_bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md:851-874` (FR-56), `:1475`, `:1526`

---

## Dev Agent Record

### Agent Model Used

Claude Opus 5 (`claude-opus-5`), via `bmad-code-review` (three pre-implementation passes) then direct
task execution, 2026-08-09 → 2026-08-10.

### Debug Log References

Revert-probe outputs are recorded inline in the commits that introduced each gate — see
`8e83b76` (ceiling parity, both directions), `3e7ab20` (`member.suspend` holder set: add / remove /
catalog-delete), and `ad5b9e4` (the `verifier` pin pair asymmetry).

### Completion Notes List

**Discharged before start:** the `epics.md:3540` actor correction (premise #4) was already done; changing
it again would have been a no-op diff.

**The governance half landed first, structurally.** `git log` reads governance → governance → governance
→ implementation, and `feat/10-18-…` was **cut from** the ratifying commit rather than merely ordered
after it. Verified by the Task 10 assertion over every governance commit, not by inspection.

**All eight routed questions were ratified at option (a) as Panel rulings** — none taken as a stated
default, no directions attached. Recorded in Decision `2026-08-10-096` with per-clause provenance
(1–8 rulings, 9 the ratified §8.7 text, 10–12 author-committed findings carrying no ratified authority).

**§8.7 is authored and Trustee-ratified; counsel review remains OWED and un-attested.** No version bump,
no effective date, no Board-resolution reference, no `[LEGAL]` line — and none may be inferred. The
Decision reproduces §8.7 **verbatim in both locales** because `docs/legal/` is gitignored and that entry
is the amendment's only durable copy; the reproduction was verified paragraph-by-paragraph against the
live files.

**Deviations from the story as written, each deliberate:**
- **Six parity surfaces, not five.** AC4's prose surface (~12 "12 seeded roles" sites) was swept
  number-free and `TWELVE_ROLES` renamed `SEEDED_ROLES`, so the next role addition need not repeat it.
- **All 16 negative holder-loops updated, not the 7 the story enumerated by line number.** That list had
  already shifted once; the principle applies uniformly. Safe — `roles.test.ts` carries zero
  `member.moderate` references, verified before editing.
- **The ceiling-parity assertion is behavioural, not by export** (BigDev's ruling): `SEEDED_ROLE_SCOPE_CEILING`
  stays module-private and the test exercises `RoleGrantSchema`'s `superRefine` instead.
- **The status flip was held until after validation** rather than performed in Task 9, so the ledger never
  claimed a validation that had not run.

**Found and fixed during a focused review of Task 4:** the ceiling-parity gate was **one-directional** —
it caught a transport ceiling narrower than the domain's (inert role) but silently passed a broader one
(privilege-escalation shaped). Verified empirically at 22 passed with `trustee_panel: 'global'`. Now
bidirectional and probed both ways (`8e83b76`).

**Found while verifying Task 8:** the `verifier` bundle listed `MEMBER_MODERATE` first and left it
**entirely unremarked** — exactly what AC8 forbids. The declaration site now carries the full deferral,
the Q7 ruling, and the acceptance condition in the shipped 10.3/10.4 form.

**The marker count was settled at 45 blocks / 19 files**, under a counting rule this story had to write.
The prior "verified" figure was a **spelling artifact** — it matched `Epic 3` only, while the hyphenated
`Epic-3` form dominates in `permissions.ts` (13 of 21). Two prior corrections were themselves reversed:
the ledger's `11/9/3` was *not* the marker population, and a figure of 20 that had been ordered
"discarded on sight" was **correct**. `permissions.ts` and `roles.ts` derived to 13 and 12 blocks —
matching the story's *original* draft, which the intervening recount had wrongly discredited.

**Validation (Task 10), attested:** `pnpm ci:local` **PASSED — 30 jobs green, exit 0**. Full `pnpm test`
37/37 turbo tasks green. The D1/AC1 ordering check ran as an **assertion** over every non-merge commit and
passed — the first time that check has actually executed, the pass-1 version having used a git range that
excluded what it measured and the pass-2 version having printed rather than asserted.

**⚠ The live-DB integration suite FAILED, and it is NOT this story's.** 4 tests across 2 files in
`@twt/domain`: `tests/integration/feature-flags/registry.spec.ts` (1) and
`tests/integration/custom-fields/registry.spec.ts` (3). **Innocence was confirmed, not assumed** — the
specs were reproduced in isolation (ruling out concurrency/double-run pollution), then re-run at the
baseline commit `71aae71` via stash + detached checkout, where they produce **the same 4 failures in the
same 2 files**. Neither touches RBAC, roles, permissions, scope or OpenAPI. **Pre-existing, out of scope,
not fixed here, and not claimed as green.**

**Un-attested / not exercised, stated plainly:**
- **This story adds no live-DB test.** Everything it touches is declarative, so the integration job
  exercises nothing this story changed.
- **The AC6 gate reaches `defaultRoleBundles` only.** No SQL seed, no production `seedRoles()` caller, no
  `role_grants` write path, and static CI has no database. A grant written directly to the table would not
  be caught. Stated in the gate's own failure message.
- **Decision `2026-08-10-096` clause 7 cites `roles.ts:436-437`; the bundle now sits at `:453+`**, moved by
  this story's own later commits. The Decision is committed governance and was accurate when written, so it
  is **not** edited (`[[feedback_supersede_never_reinterpret]]`). Recorded in `deferred-work.md` with the
  lesson: decision entries written ahead of code should cite **symbols, not line numbers**.

**Not unblocked:** 10.19, 10.21, 10.22 remain `backlog`. The ten other Part 8 items are unlanded and
PRD FR-56's `§8.4a` citation still dangles. None of the four pre-existing Trustee Panel obligations is
discharged — this story opened a fifth.

### File List

**Governance artifacts (7):** `.decision-log.md` · `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-08-10-story-10-18.md`
(new) · `_bmad-output/planning-artifacts/epics.md` (Story 1.18 minted) ·
`_bmad-output/implementation-artifacts/{sprint-status.yaml, deferred-work.md}` · this story file ·
`docs/legal/niyamavali.md` + `docs/legal/niyamavali.hi.md` (**gitignored — §8.7 appears in no diff; the
Decision entry is the record**).

**Domain (8):** `packages/domain/src/rbac/{roles,permissions,scope,index}.ts` ·
`packages/domain/src/schema/role_grants.ts` · `packages/domain/src/reports/scope.ts` ·
`packages/domain/src/reports/templates/{_shared,member-roster,contribution-rate-by-district}.ts` ·
`packages/domain/src/{banners/audience,banners/read,news-blog/audience,pool/fixed-amount}.ts`

**Contracts (5):** `packages/contracts/src/rbac/{roles,scope}.ts` · `packages/contracts/src/rbac/README.md` ·
`packages/contracts/src/banners/{enums,dto}.ts`

**Apps (6):** `apps/api/src/modules/member-moderation/routes.ts` ·
`apps/api/src/modules/claims/{claims.cycle-freeze,claims.r9-voting}.routes.ts` ·
`apps/api/src/modules/{pool-fixed-amount/index,trustee-lite/handlers}.ts` ·
`apps/admin/src/modules/banners/derive.ts`

**Tests (4):** `packages/domain/tests/rbac/{roles,permissions,check,scope}.test.ts` ·
`packages/contracts/tests/rbac.test.ts`

**Generated (1):** `openapi/v1.yaml`

---

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-08-10 | 0.3 | **Third review pass + restructure.** Pass 3 found **10 of pass 2's 27 patches defective** — the same one-location-not-its-mirrors failure pass 2 existed to fix. ⛔ **The critical one: pass 2's "verified ground truth" marker count was a SPELLING ARTIFACT.** It counted `grep -c 'Epic 3'` while the repo writes the marker **both ways**, and the hyphenated `Epic-3` form **dominates** in `permissions.ts` (13 of 21). Union counts are `roles.ts` **13**, `permissions.ts` **21**, `scope.ts` **5**; 115 lines `.ts` / 119 with `.tsx` / 56 files. On that basis pass 2 had **blessed the ledger's `11/9/3` as correct and forbidden fixing it**, and **ordered a more accurate figure destroyed** — it dismissed a reviewer's "20 lines in `permissions.ts`" as unreliable when 20 is exactly right for geo markers (21 union minus `:18`, the one epic-timing note its own rule excludes). Both instructions are withdrawn; the counting rule now specifies **marker string (`Epic[ -]3`), file extensions (`.ts` + `.tsx`), and a real block boundary** — it previously collapsed `permissions.ts:77-366` (one JSDoc) to a single block. Other pass-2 defects fixed: `GEO_RANK`→`CEILING_RANK` had been applied to **AC3 only**, leaving the instruction governing the **entire Family-A sweep** ordering the false mechanism into ~20 comments; **Q8 never reached the two tasks that execute the Q-graph**, so an unruled Q8 fell into neither the blocking pair nor the defaulted range; both of pass 2's AC4 additions had **zero task coverage**; the retracted quorum overclaim survived in two mirrors, one of them making `sprint-status.yaml` self-contradictory within a single comment block; and pass 2's ledger rewrite introduced **fresh** drift by re-asserting the §1.3 corroboration that D1/D2 de-ratified. ⭐ **Decision: the mandated ceiling-parity assertion is BEHAVIOURAL, not by export** — `SEEDED_ROLE_SCOPE_CEILING` is module-private, so the assertion builds a `RoleGrant` at each bundle's own `scopeCeiling` and asserts `RoleGrantSchema` parses, exercising the same lookup with no public-API widening; and it carries its own **revert-probe**, since all 12 ceilings already agree and an unprobed gate proves nothing. ⭐ **Task 2/Task 3 redesigned as a governance state machine.** Pass 2's "stage the Decision at Task 2, complete it at Task 3" created an **impossible state**: on an unruled Q1/Q2 the entry could never be completed *or* committed. Now the ruling and the amendment are **one atomic act** — nothing is written to `.decision-log.md` until both inputs exist, the entry is authored complete and committed **once** at Task 3, and an unruled Q1/Q2 produces a **BLOCK RECORD** (routing-note section + `deferred-work.md` + `sprint-status.yaml: blocked`) which is explicitly **not** a decision-log entry, because nothing enters the decision log without a decision. This preserves the hard invariant — implementation is reachable only through a real ratification — while removing both the manufactured-ratification risk and the dangling-torso state. Also: the `:25-27` moderation deferral is now edited alongside `:12-13` (it is the deferral this story actually answers, and its holder list is one this story makes incomplete); Task 10's D1 check **asserts** rather than prints, covers **every** governance commit rather than the first, is merge-safe via `git merge-base`, and excludes merge commits (on which `--name-only` emits nothing, silently passing); Task 8 **adds** rather than modifies a D6-frozen pin; Escalation 4 and D5 no longer re-trigger on a story that does not exist; Task 0 has a real "if `main` moved" procedure; AC1's commit allowlist admits `epics.md`; and pass 2's own scope additions are flagged as epic deviations per the story's own convention. **Restructured** from ~1500 to ~700 lines: three review-findings sections condensed to one Review-history note, inline patch archaeology folded into the instructions it justified, and duplicated framing collapsed — because the recurring defect across all three passes was mirror drift, and the document had more mirrors than any single pass could keep synchronized. | BigDev |
| 2026-08-10 | 0.2 | **Second review pass.** 3 decisions resolved, 27 patches, 5 dismissed; **6 patches fixed defective pass-1 patches**. Load-bearing corrections: pass 1's D1 ordering check used a two-dot git range **excluding the governance commits it was meant to observe**; `sprint-status.yaml` re-asserted as `VERIFIED live at 71aae71` two claims the story had retracted, including commit-SHA provenance for **gitignored** files; Task 7 was not executable (its `P#`/`R#`/`S#` labels are defined nowhere, `scope.ts` S4 was assigned to neither family, and pass 1 ordered the dev to find `helpdesk.create`/`helpdesk.respond` markers that **do not exist**); per-question consequences were made mandatory then supplied for Q1 only, leaving Task 2's blanket halt contradicting Escalation 5. Falsified and corrected: AC4's *"fails at runtime, not typecheck"* was **inverted** (`TS2741`; the real hazard is a wrong value, which typechecks and makes the role inert); AC3 named `GEO_RANK` where `scopeWithinCeiling` reads `CEILING_RANK`; AC1's *"only quorum number anywhere in the repo"* is **false**; and three of the "four premises in the epic AC" are not the epic's — `epics.md:3725`'s Part-8-scoped wording is **correct**, so the story had been charging its own source with defects it does not have. Decisions: the §1.3 corroboration never enters production code; the successor is named **Story 1.18** under a stated numbering rule; the inert `verifier` grant gets its own Panel question (**Q7**). **Q8** added so AC9's *"route it to the Panel"* branch is reachable at Task 1 rather than unreachable at Task 9. | BigDev |
| 2026-08-09 | 0.1 | Story authored via `bmad-create-story`, off `main` @ `71aae71`. Epic 10's seventeenth authored story and the earliest un-started story in the moderation arc (10.19–10.22 all `backlog` behind it); `epics.md:3745` makes it the `[GATE]` on 10.20. **Four carried premises verified live: one stale, two wrong, one already discharged** — `PERMISSION_CATALOG_VERSION` is 29 not 28 (bump is 29 → 30, and it mints a **role**, not a key, which no prior bump did); the Niyamavali **already defines** the Trustee Panel at §1.3 as the **top** of three tiers, scoped to Part 9, so §8.7 must **reconcile** rather than invent; Part 8 runs §8.1–§8.4 only, with none of the eleven-item 2026-08-04 package landed and PRD FR-56 already citing a §8.4a that does not exist; and the `epics.md:3540` actor correction is already discharged. ⛔ **The Niyamavali is an unadopted `[[v1.0]]` draft and counsel is not engaged**, so *"the amendment lands FIRST"* cannot mean ratified-and-effective — a version bump, effective date or `[LEGAL]` line would be manufactured validation. ⛔ **`docs/legal/` is gitignored**, so the amendment produces no commit and the durable record must be a `.decision-log.md` entry **quoting §8.7 verbatim** (the `2026-08-06-080` precedent). ⭐ **AC7 splits the geo-deferral debt into two families** — rank-order (no resolver can ever fix them; they are misdiagnoses) and genuine geo-tree — and only the second belongs to a successor, which must be a **story with acceptance criteria** because `deferred-work.md:1472`'s epic-named re-trigger **fired at Story 3.1/3.9 and nobody saw it**. Also surfaced: the inert `verifier` grant (AC8), the absence of any `deprecated` convention (D4), and the `member.suspend` removal having no owner. Seven escalations raised, none absorbed. | BigDev |
