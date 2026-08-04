---
baseline_commit: 49ad0ca195d2fd4358f9362109823c2a241bb80f
---

# Story 10.11: Trustee-Lite List + Signals `[SURFACE]`

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## ⏸ Sequencing note — authored, not started, held behind 10.16 → 10.17 (2026-08-04)

**This story is NOT blocked and NOT halted.** It is fully authored, `ready-for-dev`, and zero lines of
its code exist. It is deliberately **not next in the queue**. Recorded here so a later reader does not
mistake "sat in `ready-for-dev` for a while" for an implementation problem in the story.

**Why held.** Escalation 3 below records the hazard: 10.11 surfaces suspension candidates while
`10-16` and `10-17` are still `backlog`, so the moderation section's rows point at a cure that is not
yet reachable. The story's original instruction was *"Do not block 10.11 on 10.16/10.17; record it."*
**That instruction is superseded by a sequencing decision taken 2026-08-04, after the story was
authored.** This is a change of plan, not a defect in the story, and the original reasoning stands on
its own terms — 10.11 genuinely does not *depend* on 10.16/10.17. The decision is to sequence the cure
ahead of the surface that advertises it, so trustees are never shown a suspension candidate before
Story 10.17 restores the roster path that lets that member cure.

**What 10.11 waits on, precisely: Story 10.17, not the contribution-fact producer.** Decision D1-B was
ratified specifically so this story ships structurally complete and explicitly degraded, lighting up
with zero changes in these files the day the producer lands. Ordering the producer *ahead* of 10.11
would not honour D1-B — it would **moot** it, and D1 is closed. If that ordering is ever chosen, take
it as a fresh, recorded decision; do not arrive at it as a side effect of scheduling.

**Planned order:** `bmad-correct-course` (scope + assign the unowned contribution-fact producer,
Escalation 1) → 10.16 → 10.17 → **10.11** → producer story when scheduled.

**Nothing in the story below changes.** No AC, no Task, no Decision is amended by this note. Resume by
starting at Task 0's unchecked items — Task 0's D1 confirmation is already closed and must not be
re-opened. Re-verify the `baseline_commit` diff first: 10.16 and 10.17 both land ahead of this story
and **10.17 adds a field to the validity payload** (`deriveIsAssignable`), which is the same payload
this story's `violator-flags.ts` reads.

## Story

As a Trustee at the Pariwar level,
I want one list + signals view (the v1 alternative to a full Kanban) that aggregates every trustee-attention item across claim freeze / R9 voting / concealment / appeals / reconciliation / moderation, each row carrying its category, age, deadline-or-explicit-absence, and a cross-link to the surface where I actually act,
so that I can see at a glance what needs me without opening six consoles — **and so that members in R7 violation are surfaced for my decision without the system ever making that decision for me.**

## Scope Boundary (read first — prevents over-build AND under-build)

**10.11 is an AGGREGATOR. It owns NO state.** No new table, no new migration, no new event type, no new projector, no new permission key, no `PERMISSION_CATALOG_VERSION` bump. Every row it renders is derived, at read time, from a source another story already ships. If you find yourself writing an `INSERT`, stop — you have left the story.

**Two findings from the 2026-08-04 Sprint Change Proposal reshape this story. Read Decisions 1 and 2 before writing a line.**

| In scope (10.11) | Out of scope → owning story / seam |
|---|---|
| **The pure signal-row normalizer + orderer**: NEW `packages/domain/src/trustee-lite/` — DB-free, clock-injected. Normalizes six heterogeneous source shapes into one `TrusteeSignalRow`, derives `age`, derives `deadlineAt` where a source HAS one, derives `severity` where a source defines one, and applies the two-tier ordering (D2). The `packages/domain/src/helpdesk/sla.ts` shape, verbatim. | A `trustee_signals` table / materialized view → **forbidden**. There is no new truth here; every row is a lens over an existing one. |
| **`listOpenAppealCasesForPariwar`** — ONE new domain read in the EXISTING `packages/domain/src/claim/appeal-read.ts`. It is the only source of the six with no Pariwar-wide list read today (D5). | A new `claim/appeal-queue.ts` module → no; extend the shipped read module. |
| **Reuse, unmodified**: `getCycleFreezePending` (6.13), `getR9VotingQueue` (6.14), `listOpenReconciliationCases` (9.8), `listModeratedMembersForPariwar` (10.10 Decision 9). **Four reads exist and are correct — do not touch them, do not re-implement them, do not "improve" them.** | Concealment (6.15) is **NOT** a fifth read — it is a FILTER over `getCycleFreezePending`'s `concealmentFlags` (D6). Writing a new concealment query is the single most likely wheel-reinvention in this story. |
| **The violator-flag arm** — pure, reads `applicableNiyamavaliClauses ∩ R7_CLAUSE_IDS` off the Story 4.6 validity payload; renders an EXPLICIT `detection_unavailable` state today, and lights up with **zero changes here** the day the contribution-fact producer lands (D1). | **Building the `contribution.*` fact producer** → out. It is an unowned, unwritten story and it changes every validity payload hash. See D1 + the Escalation block. |
| **NEW `apps/api/src/modules/trustee-lite/`** — one GET route composing the six reads inside ONE scope-tx, with per-section capability filtering on the caller's actual grants (D4, the 10.7 `resolveActorReportScope` precedent). | Any write route. Any step-up. Any decryption (D11). |
| **NEW `apps/admin/src/modules/trustee-lite/`** + route `/p/$pariwarId/trustee` — the 10.4 `Page`/`Shell`/`i18n-en.ts`/`crossLinks.ts` four-file pattern. | Extending `modules/member-status/` → no; that is the member RECORD surface (4.7/10.10). Sibling-module cross-wiring is a named footgun ([[project_story_validate_footguns]]). |
| **Contracts DTOs** + `emit-openapi.ts` + `openapi/v1.yaml` regen. | A new i18n namespace — the admin console is English-facing per-module `resolveEn` (the 10.3/10.4 precedent), NOT `packages/i18n`. |
| **The detection-only mechanization** (D7): a `moderation-advice` rule added to `microcopy.yaml`'s `tone` list (data-only — `apps/admin/src/**` is ALREADY in `code_globs`) + a contracts frozen-key test + an admin render test. | A NEW CI gate script → **rejected** (D7). This is the [[project_access_wrapper_gate_pending_scope]] "know when NOT to extend" call. |

## Acceptance Criteria

**AC1 — Six sources, one shape, one round of queries.**
Given `epics.md:3578` names six aggregation sources and `prd.md:877` sorts "by stage and deadline",
When the Trustee-Lite read is implemented,
Then a pure `normalizeTrusteeSignals(...)` in `packages/domain/src/trustee-lite/` maps every source row to ONE `TrusteeSignalRow` — `{ category, sourceKey, resourceId, label, ageMs, raisedAt, deadlineAt: Date | null, severity: TrusteeSignalSeverity | null, crossLinkKind }` — with **no I/O, no `Date.now()`, `now` injected** (the `deriveContributionStatus` / `slaTimerRunning` discipline);
And the six categories are exactly `cycle_freeze` (6.13) · `r9_voting` (6.14) · `concealment` (6.15) · `appeal` (6.16) · `reconciliation` (9.8) · `moderation` (10.10), plus the seventh **`violator_flag`** arm (AC4);
And the handler issues **at most one query per source** inside ONE scope-tx — six bounded, already-`clampLimit`ed reads. **This is O(1) queries, not an N+1**; record in the Dev Agent Record that FR-42's "one indexed query; no N+1" governs the per-member SIGNALS PANEL (Story 4.7, shipped), not FR-57's list, so a reviewer does not misapply it;
And **no source read is modified**: `getCycleFreezePending`, `getR9VotingQueue`, `listOpenReconciliationCases` and `listModeratedMembersForPariwar` are called as-shipped. A diff touching any of their bodies is a finding.

**AC2 — Deadline-proximity sorts what HAS a deadline; everything else degrades explicitly.**
Given only two of the six sources carry or can derive a deadline — reconciliation (`deadline_at`, real and nullable) and appeals (stage-entry + `DEFAULT_APPEAL_STAGE_SLA_DAYS = {stage1:14, stage2:21, stage3:14}`, `claim/appeal.ts:180`) — while cycle-freeze, R9 voting, concealment and moderation define none,
Then the ordering is **two-tier**: rows with a non-null `deadlineAt` first, ascending (soonest first); rows with `deadlineAt === null` after, by **age descending** (longest-waiting first); ties broken on `(category, resourceId)` so the order is **total and deterministic**;
And an undated row renders `deadline_at: null` **with an explicit "no deadline" affordance** — never a fabricated date, never a blank cell that reads as "due now", never silently dropped;
And this generalizes the epic's moderation carve-out (`epics.md:3587`) rather than special-casing it: `epics.md` names moderation because Story 10.10 Decision 9 recorded it, but **three further sources are equally undated**, and a sort that pretends otherwise would mis-rank a live trustee's worklist. Record the generalization.

**AC3 — Severity exists only where a source defines it, and NEVER on a moderation or violator row.**
Given the 10.4 `packages/domain/src/helpdesk/sla.ts` severity model (`breached ≻ due_soon ≻ on_track`, derived from a running timer against a due instant),
Then `severity` is derived **only** for the two dated categories (reconciliation, appeal) using that same shape, and is `null` for `cycle_freeze` / `r9_voting` / `concealment`;
And `severity` is **structurally `null`** for `moderation` and `violator_flag` — `epics.md:3587`: *"a severity score on a moderation row would itself be a recommendation"*;
And a **revert-sanity** test proves this has teeth: removing the moderation/violator null-pin flips a test.

**AC4 — Violator flags: detection only, and honestly `detection_unavailable` until a producer exists.**
Given the ratified D1-B decision — ***"Trustee-Lite will ship structurally complete, but the R7 violator section shall explicitly render `detection_unavailable` until the contribution-fact producer exists. The story shall not derive R7 violations outside the rule engine."*** (BigDev, 2026-08-04) —
And given `epics.md:3582-3587` + `prd.md:879`, and given that the `contribution.*` fact producer **does not exist** — `packages/validity-service/src/payload.ts:294` hardcodes `contributionHistorySummary: CONTRIBUTION_UNAVAILABLE` and `types.ts:56-65` states R7/R8 are OMITTED from `applicableNiyamavaliClauses[]` until Epic 8/9 supplies real facts,
Then a **pure** `deriveViolatorFlags(payload)` filters `applicableNiyamavaliClauses` to `R7_CLAUSE_IDS` (imported from `@twt/niyamavali-engine`, never re-declared) and emits one flag per applied clause carrying **exactly**: `clause_id` · `clause_label` · `facts_establishing[]` (the clause's own evaluated fact key/value pairs from the provenance trace) · `holding_since`;
And when `contributionHistorySummary.status === 'producer_unavailable'` the section renders a **first-class `detection_unavailable` state naming the missing producer** — **never an empty list.** An empty violator list on a governance surface is a false all-clear, which is a worse failure than an honest gap ([[feedback_record_unattested_no_backfill]]);
And the flag carries **no `recommended_action`, no `suggested_outcome`, no severity, no priority, no rank, no ordering by inferred urgency**, and the flag's cross-link navigates to the member record with **no reason code and no action pre-selected**;
And the DTO's key set is pinned by a **frozen-key contracts test**: the parsed object's keys equal the permitted set exactly, and no key matches `/recommend|suggest|advis|severit|urgen|priorit|rank|score/i`;
And the derivation is **producer-shaped, not story-shaped** — when the producer lands, flags appear with **zero changes in this story's files**. Pin that with a unit test that feeds a synthetic payload carrying real R7 clauses and asserts flags render.

**AC5 — The copy carries no verbs of advice, and CI proves it.**
Given `epics.md:3585` prohibits *"should be suspended"*, *"action required"*, *"overdue for review"* and equivalents,
Then `microcopy.yaml` gains ONE `tone` entry, label `moderation-advice`, whose case-insensitive regex covers the advice-verb family (`should be (suspended|terminated|removed)`, `action required`, `overdue for review`, `needs? action`, `recommend(ed|s)? (suspension|termination)`, `requires? your action`, `must be (suspended|terminated)`);
And **no new gate script is written** — `apps/admin/src/**/*.{ts,tsx}` is already in `microcopy.yaml`'s `scope.code_globs` (`:195-197`), so the rule binds this module and every future admin surface with **zero gate-code change** (D7);
And teeth are **proven, not assumed**: a planted-violation fixture in `scripts/microcopy/` fails the gate, and a revert-sanity note records that deleting the rule flips it green ([[feedback_gate_scope_semantic_coverage]] — a green scan over a newly-scanned surface proves nothing);
And the `report` vocabulary rule (`microcopy.yaml:36`, canonical *Sahyog Vivran*) already binds this module — do not write "report" in admin copy.

**AC6 — Scope-respecting: sections the caller cannot act on are OMITTED, not rendered empty.**
Given `epics.md:3580` ("scope-respecting via Story 1.8") and six sources gated by six different keys — `cycle.freeze` · `claim.r9_vote` · `claim.verify` (concealment) · `claim.appeal_review` **or** `claim.appeal_vote` · `reconciliation.review` · `member.moderate`,
Then **no new permission key is minted and `PERMISSION_CATALOG_VERSION` stays 28**;
And the handler resolves the caller's grants ONCE (`request.scopeGrants ?? []`) and evaluates each section's key with the pure `rbac.hasPermission(grants, key, resource)` predicate — the **Story 10.7 `resolveActorReportScope` dynamic-key precedent** (`apps/api/src/modules/reports/handlers.ts:82,100-108`), because the key is per-section and therefore cannot be a static `preHandler`;
And a section the caller lacks is **absent from the response**, not present-and-empty: an empty `r9_voting` array tells an actor without `claim.r9_vote` that there are zero R9 cases, which is a scope leak;
And a caller holding **none** of the six keys receives a structured **403** (`AuthorizationDeniedError`), not a 200 with an empty body;
And the route composes `[requireAdminSession, scopeResolutionHook]` and is **NOT step-up gated** — AR-24 gates consequential writes; this surface writes nothing. Record that this returns to the 10.3/10.4/10.5/10.8/10.9 "NOT step-up-gated" chain that 10.10 broke.

**AC7 — Every row cross-links to the surface where the trustee actually acts.**
Given `epics.md:3579` ("cross-link to the canonical surface for the item"),
Then a pure `trusteeCrossLink(pariwarId, row)` in `apps/admin/src/modules/trustee-lite/crossLinks.ts` — modelled on the shipped `modules/helpdesk/crossLinks.ts` — maps each category to its live route: `cycle_freeze` → `/p/:id/cycle-freeze` · `r9_voting` → `/p/:id/r9-voting` · `concealment` → `/p/:id/claims/:claimCaseId/verify` · `appeal` → `/p/:id/claims/:claimCaseId/verify` · `reconciliation` → `/p/:id/reconciliation-review` · `moderation` and `violator_flag` → `/p/:id/members`;
And the moderation/violator cross-link opens the member record **cold** — no reason code, no action, no query parameter that could pre-fill the moderation form (AC4's structural half);
And the helper returns `href: null` for any target that does not exist, and the shell renders that disabled — the shipped `crossLinks.ts` contract, not a thrown error.

**AC8 — The list is an ID + non-PII summary surface; it decrypts nothing.**
Given the 10.4 crypto-boundary lesson (`apps/api`'s request path carries ADMIN-identity keys) and the 6.10/6.13 "ciphertext as stored, decrypt at the route after authorization" rule,
Then the Trustee-Lite response carries **identifiers and non-PII labels only** — `member_id`, `claim_case_id`, `deceased_member_id`, `pool_id`, reason/routing CODES, `actor_display` (already a controlled non-PII snapshot per [[project_admin_display_name_attribution]]);
And **no ciphertext is selected, no KMS call is made, and no name or mobile is resolved** — the canonical surface each row links to already decrypts after its own authorization. Contrast `reconciliation-review/handlers.ts:164-183`, which decrypts because it is the DETAIL surface;
And a test asserts the response contains no `*_ciphertext` key and the handler makes zero `deps.encryption` calls.

**AC9 — The surface renders, and the empty states are honest.**
Given the 10.4 `Page`/`Shell` container/pure-shell split and the New-Architecture list footgun ([[project_fabric_flatlist_empty_populated_crash]] — admin is web, but the same structural rule applies: render empty/loading/error OUTSIDE the list),
Then `apps/admin/src/modules/trustee-lite/{TrusteeLitePage,TrusteeLiteShell,crossLinks,i18n-en}.ts(x)` land, wired at a new `/p/$pariwarId/trustee` route in `apps/admin/src/router.tsx` (code-based routing, DD-1) with a `RootLayout` nav entry;
And each section renders one of **four** distinguishable states — populated · genuinely empty ("nothing needs you here") · **not permitted** (section absent, per AC6) · **detection unavailable** (violator flags only, per AC4) — and the shell never collapses "empty" and "unavailable" into one rendering;
And the undated rows carry the AC2 "no deadline" affordance and are visually grouped after the dated ones, so the two-tier order is legible rather than mysterious.

**AC10 — Tests + gates green.**
Given `pnpm ci:local` (`--concurrency=4`, DB on :5433) is the sanctioned merge gate (ADR-0017) — [[project_ci_actions_suspension_local_mirror]], [[project_ci_local_concurrency_oversubscription]],
Then **domain unit** tests cover: the two-tier ordering (dated-before-undated, ascending deadline, age-descending within undated, total determinism under ties); severity derivation for the two dated categories and the structural `null` for the other five; `deriveViolatorFlags` over a `producer_unavailable` payload (→ `detection_unavailable`) AND over a synthetic payload carrying applied R7 clauses (→ flags render, proving the seam); and the concealment filter over a `getCycleFreezePending` fixture;
And **live-DB integration** covers: the six reads composing in one scope-tx; the per-section capability filter with a **403-without / 200-with revert pair** per section; the zero-keys 403; a cross-Pariwar denial; and `listOpenAppealCasesForPariwar` against real appeal rows;
And **contracts** tests cover the DTOs + the AC4 frozen-key assertion + a domain↔contracts category-enum sync-guard (TEST-only cross-import per [[project_contracts_domain_bundle_boundary]]);
And **admin UI** tests cover all four section states, the cross-link hrefs, and the AC4 "cold" moderation link (no pre-selected action);
And **revert-sanity** proves teeth on three guards: removing the moderation-severity null-pin flips a test; removing the `microcopy.yaml` `moderation-advice` rule flips the planted-violation fixture; removing the AC6 section filter flips the 403-without test;
And `scripts/emit-openapi.ts` + `openapi/v1.yaml` are regenerated; `pnpm microcopy:check` is green **with the new rule**; **no migration is authored**; `PERMISSION_CATALOG_VERSION` is still 28; `pnpm ci:local` is green.

## Load-Bearing Decisions

Decisions 4, 6, 7, 9 and 11 follow shipped precedent — implement to them. **Decisions 1, 2, 3, 5, 8 and 10 are NEW calls this story makes.** D1 was the load-bearing fork; **it is CONFIRMED (D1-B, BigDev, 2026-08-04) and is not open.** Implement to it — do not re-open the producer question mid-story.

1. **CONFIRMED (D1-B — BigDev, 2026-08-04) — the violator-flag detector has no fact source, so 10.11 ships the ARM, not the PRODUCER. ⭐ THE decision.**

   > **The ratified decision, verbatim — reproduce it unchanged wherever this call is cited:**
   > **Trustee-Lite will ship structurally complete, but the R7 violator section shall explicitly render `detection_unavailable` until the contribution-fact producer exists. The story shall not derive R7 violations outside the rule engine.**

   Both halves are binding. The first forbids shipping the section as an empty list or omitting it; the second forbids D1-C in every disguise — including a "temporary", "just-for-the-flag", or "read-only" R7 derivation living in `apps/api`, `apps/admin`, or the new `trustee-lite` namespace. If R7 facts are not supplied to the registry-driven engine, this story does not compute them.

   `epics.md:3578` attributes the mechanism to *"Story 10.17's D1 surfacing mechanism"* — but Story 10.17 as authored (`epics.md:3683-3713`) is entirely about `is_assignable`, and contains **no flagging mechanism whatsoever**. The decision brief is unambiguous where the epic drifted: *"**violator flagging on the admin dashboard** (from D1) … This is **scope-defining input to Story 10.11 rather than a standalone story**"* (`moderation-model-decision-brief.md:795-797`). **10.11 owns it; the epic's 10.17 attribution is a drafting error — record it.**
   **But the detection cannot fire.** Verified against live source: `packages/validity-service/src/payload.ts:294` hardcodes `contributionHistorySummary: CONTRIBUTION_UNAVAILABLE`, and `types.ts:56-65` states plainly that *"R7/R8 are OMITTED from `applicableNiyamavaliClauses[]` until the Epic 8/9 producer supplies real `contribution.*` facts."* Epic 8 and Epic 9 are `done` and **the producer was never built.** So there is no way, today, to know that a member is in R7 violation.
   → **D1-B (CONFIRMED): ship the arm structurally complete and explicitly degraded.** `deriveViolatorFlags` reads the 4.6 payload's `applicableNiyamavaliClauses ∩ R7_CLAUSE_IDS`; today that intersection is empty **by construction**, so the section renders `detection_unavailable` naming the missing producer. The day the producer lands, flags appear with zero changes in this story's files. This is the codebase's own repeated discipline — `CONTRIBUTION_MISMATCH_EVENT_TYPE` (`contribution/history.ts:63-75`), `CONTRIBUTION_UNAVAILABLE`, the 9.x forward contracts of record.
   *Rejected — D1-A: build the producer here.* It must derive seven calendar-correct facts (`total_count`, `ever_contributed`, `skips_current_year`, `months_since_last`, `r7a_restorations_used`, `in_lapse`, `personal_event_excuse_claimed`). Three have no source at all: `skips_current_year` needs per-cycle assignment history, `r7a_restorations_used` needs restoration accounting, and `personal_event_excuse_claimed` has **no event anywhere**. Wiring it into `assemblePayload` would populate `applicableNiyamavaliClauses` and `specialFlags` for every member, changing **every validity payload hash** — which cascades into the 4.8 cache epochs and the Story 7.4 assignment version pin. That is a story, and a large one.
   *Rejected — D1-C: derive R7 violation ad-hoc inside 10.11.* It would hardcode eligibility logic outside the registry, violating `architecture.md`'s *"every eligibility check registry-driven, not hardcoded"* and `prd.md:425`, and it would fork [[project_engine_never_infers_contribution_facts]]. A **partially** derived fact producing a **wrong** flag on a real member's record — on the surface that feeds a suspension decision — is the worst outcome available here.
   **→ Escalation owed (see the Escalation block): the R7 contribution-fact producer is UNOWNED.** Neither the brief nor the change proposal noticed that R7 evaluation is structurally dark; both assumed it worked.

2. **NEW — deadline-proximity is a two-tier order, because four of six sources have no deadline.**
   `epics.md:3579` requires the sort; `epics.md:3587` then carves out moderation alone. Verified: **cycle-freeze, R9 voting and concealment carry no deadline either.** `CycleFreezePendingCase` (`claim/cycle-freeze-read.ts:50-63`) has no temporal field; `R9QueueItem` (`claim/r9-voting-read.ts:38-48`) has none; concealment is a flag on a cycle-freeze row. Only reconciliation ships `deadlineAt` and only appeals can derive one from `DEFAULT_APPEAL_STAGE_SLA_DAYS`.
   → dated-ascending, then undated by age-descending, ties on `(category, resourceId)`. The epic's moderation carve-out is **generalized, not contradicted** — it named the one case a prior story had recorded; three more exist. *Rejected:* a synthetic deadline per category (fabricating governance data to satisfy a sort — the precise failure [[feedback_record_unattested_no_backfill]] exists to prevent). *Rejected:* dropping undated rows (they are most of the worklist).

3. **NEW — severity is per-source-optional and structurally `null` on moderation + violator rows.** The epic's reason is exact and worth restating in code: *a severity score on a moderation row would itself be a recommendation.* Reuse the 10.4 `sla.ts` band vocabulary rather than inventing a second severity language.

4. **RBAC — no new key; per-section filtering on the caller's real grants.** Six sources, six keys. Minting a `trustee.dashboard` key would bump the catalog for a read that grants nothing new, and would replay the `district_admin` / `state_trustee` pariwar-ceiling deferral for a seventh time ([[project_rbac_geo_scope_containment]]). The **10.7 precedent** (`reports/handlers.ts:100-108`) already establishes the shape: resolve grants once, evaluate the per-item key at the handler because it is dynamic. Sections omitted (not emptied) — an empty array is an existence oracle. *Rejected:* minting a key. *Rejected:* gating the whole route on `member.moderate` (would hide the five claim sections from claim staff).

5. **NEW — one new domain read: `listOpenAppealCasesForPariwar`.** Of the six sources this is the only one with no Pariwar-wide list. `appeal-read.ts` ships `getAppealJourney` (per-claim), `getAppealPanel` (per-claim) and `getAppealDecisionsByReviewer` (reviewer-scoped) — none aggregates open cases at a trustee's scope. Add it **in that file**, scope-safe, `clampLimit`ed, carrying the stage + stage-entry instant the AC2 deadline derivation needs.

6. **Concealment is a FILTER, not a query.** `getCycleFreezePending` already resolves the real 6.15 concealment producer in bulk (`cycle-freeze-read.ts:16-25` — `assessClaimConcealmentBulk`, one clamped read for the page, the explicit no-N+1 requirement) and surfaces `concealmentFlags` per case. The concealment section is the subset whose flags include `CONCEALMENT_REVIEW_REQUIRED_FLAG`. **A claim legitimately appears in both the cycle-freeze and concealment sections — they are lenses, not a partition. Do not dedupe.**

7. **The detection-only CI assertion is a yaml rule + two tests — NOT a new gate.** The copy half is data-only: `microcopy.yaml`'s `tone` list is regex-driven and `apps/admin/src/**` is already in `code_globs`, so one entry gives real teeth over this module and every future admin surface with zero gate-code change. The structural half is a contracts frozen-key test plus an admin render test; both run inside `ci:local`, which **is** CI. Writing a new AST gate here would be the `[[project_access_wrapper_gate_pending_scope]]` mistake — a per-story gate tax for a surface two tests cover better. Per [[feedback_mechanization_split_commitment]], mechanize the cheapest and most corrosive family (advice-verbs in copy, which drift silently) and test the rest. **Teeth must be proven with a planted violation + revert-sanity**, not assumed from a green run.

8. **NEW — a new admin module, not an extension of `member-status`.** `modules/member-status/` is the 4.7/10.10 member RECORD surface (lookup → panel → moderation strip). Trustee-Lite is a Pariwar-wide worklist that links INTO it. Cross-wiring sibling admin modules is a named recurring footgun ([[project_story_validate_footguns]]). Follow the 10.4 four-file shape: `Page` (container: hooks, state) · `Shell` (pure, prop-driven, unit-testable) · `crossLinks.ts` (pure) · `i18n-en.ts` (English `resolveEn`).

9. **The API module composes; the domain stays pure.** New `apps/api/src/modules/trustee-lite/` does the six reads, the grant filter and the DTO mapping. The **pure** normalization / ordering / severity / violator derivation lives in `packages/domain/src/trustee-lite/` — DB-free, clock-injected, exhaustively unit-testable, exactly like `helpdesk/sla.ts` and `contribution/history.ts`'s `deriveContributionStatus`. No accessor in that new namespace touches `Db`.

10. **NEW — record that FR-42's "one indexed query; no N+1" does not bind this story.** `epics.md:92` attaches that constraint to the FR-42 **signals panel** — the per-member compound read model shipped at Story 4.7. FR-57's list is a different surface. Six bounded reads is O(1) queries; a reviewer applying FR-42's phrasing literally would demand a single impossible join across six unrelated subsystems. State it once, in the module header.

11. **No decryption, no step-up, no writes.** The aggregator is the index; every canonical surface it links to already authorizes and decrypts on its own. Keeping ciphertext out of this path keeps the module entirely outside the crypto boundary that bit Story 10.4.

## Escalations owed (do not silently absorb)

1. **⚠ The R7 contribution-fact producer is UNOWNED and unwritten.** `validity-service/payload.ts:294` + `types.ts:56-65` show R7/R8 are structurally un-evaluated in production. Consequence: **no R7-based violator flag can fire, and no R7 restoration path can be observed by any surface.** The 2026-08-04 brief's §2.2 table ("six of seven R7 clauses can only be cleared by contributing … all six are unreachable today") diagnosed the *roster* blockage (→ 10.17) but not this: even after 10.17 unblocks the roster, **nothing evaluates whether a member cleared their R7 package.** Route to PM as a new story. 10.11 lands the consumer seam and is not blocked by it.
   **↳ Sharpened 2026-08-04 (post-authoring), for whoever scopes this at `bmad-correct-course`:** the
   reason this gap survived two rounds of governance review is that **the event producer WAS built and
   the fact producer was not** — and the deferral note does not distinguish them.
   `contribution.confirmed` has two live emitters today (`apps/jobs/src/matcher/matcher-worker.ts:325`,
   `apps/api/src/modules/reconciliation-review/handlers.ts:308`), so "did Epic 9 produce contribution
   facts?" reads *yes* for events and *no* for the seven `contribution.*` keys the engine consumes.
   Nothing maps one to the other; `assemblePayload` has no contribution input at all. Second reason:
   `types.ts:56-65` defers to an **epic** (`producer: 'epic-8-9'`), and epics carry no acceptance
   criteria — Epic 8's 13 stories and Epic 9's 12 were checked and **none** is the fact producer, so
   both epics closed `done` with retrospectives and the pointer expired with no owner. Scoping input:
   `listMemberContributionHistory` (`packages/domain/src/contribution/history.ts:276`) plausibly sources
   ~4 of the 7 facts; `skips_current_year`, `r7a_restorations_used` and `personal_event_excuse_claimed`
   have no substrate, and the last needs a member-facing flow that exists nowhere — expect a split.
   Housekeeping to fold in: `packages/contracts/src/contributions/pool-contributor-list.ts:7` and
   `packages/domain/src/index.ts:167` still read *"Epic 9's producer, unbuilt → honestly EMPTY today"*.
   Those were written at Story 8.3, predate the 9.4 matcher, and are now stale — they actively
   reinforce the wrong mental model.
2. **`epics.md:3578` mis-attributes the violator mechanism to Story 10.17.** The brief (`:795-797`) assigns it to 10.11 as scope-defining input. 10.11 builds the arm. Flag for an `epics.md` correction.
3. **Standing hazard, unchanged by this story:** 10.11 surfaces suspension candidates while **10.16 → 10.17 are still `backlog`**, so any suspension taken today is still the de-facto permanent ban the whole correct-course exists to fix. 10.11 adds **no new suspension path** (10.10's strip is already live), so it does not worsen it — but the moderation section's copy should not imply the cure is reachable. Do not block 10.11 on 10.16/10.17; record it.
   **↳ SUPERSEDED 2026-08-04 (post-authoring) — see the Sequencing note at the top of this file.** The
   analysis above stands: 10.11 has no technical dependency on 10.16/10.17. What changed is the
   *ordering decision* — the cure now ships ahead of the surface that advertises it, so "do not block"
   became "hold, deliberately". Nothing in this story was re-scoped to accommodate that, and the
   moderation-copy caution in this escalation still applies verbatim when 10.11 is picked up.

## Tasks / Subtasks

- [ ] **Task 0 — Read before writing (AC1)**
  - [x] ~~Confirm D1 with BigDev.~~ **D1-B APPROVED (BigDev, 2026-08-04): arm now, producer later.** The producer question is CLOSED for this story — if implementation pressure tempts you toward deriving R7 facts here, that is D1-C and it is rejected; escalate instead.
  - [ ] Read in full: `packages/domain/src/claim/cycle-freeze-read.ts`, `claim/r9-voting-read.ts`, `claim/appeal-read.ts`, `reconciliation/reconciliation-review-read.ts` (`listOpenReconciliationCases`, `:163`), `member/moderation/read.ts` (`listModeratedMembersForPariwar`, `:201`), `helpdesk/sla.ts`, `apps/api/src/modules/reports/handlers.ts:60-110`, `apps/admin/src/modules/helpdesk/{HelpdeskQueuePage,crossLinks}.tsx|ts`.
- [ ] **Task 1 — `packages/domain/src/trustee-lite/` pure core (AC1, AC2, AC3)**
  - [ ] `types.ts`: `TrusteeSignalCategory` (7 members), `TrusteeSignalSeverity` (reuse the `sla.ts` band vocabulary), `TrusteeSignalRow`.
  - [ ] `signals.ts`: per-source `normalize*` mappers + `orderTrusteeSignals(rows)` (two-tier, total, deterministic) + `deriveSignalSeverity(row, now)`. **No `Db` import in this namespace.**
  - [ ] `violator-flags.ts`: `deriveViolatorFlags(payload)` over `applicableNiyamavaliClauses ∩ R7_CLAUSE_IDS` (import `R7_CLAUSE_IDS` from `@twt/niyamavali-engine`); returns `{ status: 'detection_unavailable', producer } | { status: 'ok', flags }`.
  - [ ] Barrel + `packages/domain/src/index.ts` export.
- [ ] **Task 2 — `listOpenAppealCasesForPariwar` (AC1, AC2, D5)**
  - [ ] Add to `packages/domain/src/claim/appeal-read.ts`; scope-safe, `clampLimit`ed, returns stage + stage-entry instant + claim/deceased ids.
- [ ] **Task 3 — Contracts (AC4, AC8, AC10)**
  - [ ] `packages/contracts/src/trustee-lite/{dto,index}.ts`: `TrusteeSignalRowDto`, `ViolatorFlagDto` (**frozen key set**), `TrusteeLiteResponse` with **optional** per-section keys (absent ≡ not permitted, AC6).
  - [ ] Category-enum sync-guard test (test-only cross-import, [[project_contracts_domain_bundle_boundary]]); frozen-key + forbidden-key-pattern test.
  - [ ] `scripts/emit-openapi.ts` + `openapi/v1.yaml` regen.
- [ ] **Task 4 — `apps/api/src/modules/trustee-lite/` (AC1, AC6, AC8)**
  - [ ] `handlers.ts`: one scope-tx, six reads, grant-filtered sections, no decryption, zero `deps.encryption` calls.
  - [ ] `routes.ts`: `GET /api/v1/p/:pariwarId/admin/trustee-lite`, `preHandler: [adminSession, scope]` — **no `requirePermissionHook`, no step-up** (AC6); 403 when zero sections.
  - [ ] Register in `server.ts`.
- [ ] **Task 5 — Admin surface (AC7, AC9)**
  - [ ] `apps/admin/src/modules/trustee-lite/{TrusteeLitePage.tsx,TrusteeLiteShell.tsx,crossLinks.ts,i18n-en.ts}`; four section states rendered outside the list.
  - [ ] `apps/admin/src/api/{client,hooks}.ts` → `useTrusteeLite(pariwarId)`.
  - [ ] `router.tsx` route `/p/$pariwarId/trustee` + `RootLayout` nav entry.
- [ ] **Task 6 — Detection-only mechanization (AC5, D7)**
  - [ ] `microcopy.yaml` `tone` entry `moderation-advice` (+ an explanatory comment citing `epics.md:3585`).
  - [ ] Planted-violation fixture + test in `scripts/microcopy/`; run `pnpm microcopy:test && pnpm microcopy:check`.
- [ ] **Task 7 — Tests (AC10)**
  - [ ] Domain unit; contracts; live-DB integration (per-section 403/200 revert pairs, zero-key 403, cross-Pariwar denial); admin UI; the three revert-sanity probes.
- [ ] **Task 8 — Verify + record**
  - [ ] `pnpm ci:local` on `twt-test-pg` :5433. Confirm **no migration**, catalog still **28**, `openapi/v1.yaml` regenerated.
  - [ ] Dev Agent Record: the D1 escalation, the `epics.md:3579` mis-attribution, the FR-42 clarification, the return to "NOT step-up-gated".

## Dev Notes

### The three things most likely to go wrong

1. **Reinventing the concealment query.** It already exists inside `getCycleFreezePending` (D6). Filter, do not query.
2. **Fabricating a deadline** so the sort looks uniform. Four of six sources have none (D2). An invented date on a governance worklist is worse than an honest null.
3. **Rendering an empty violator list.** `detection_unavailable` ≠ `[]` (AC4). On this surface an empty list reads as *"no members are in violation"*, which is a false all-clear.

### Current state of the files this story touches

- `packages/domain/src/claim/appeal-read.ts` — **UPDATE**. Ships three reads, none Pariwar-wide. Adding one read must not perturb `getAppealDecisionsByReviewer`'s index usage (`(reviewer_actor_id, stage, decided_at)`).
- `apps/admin/src/router.tsx` — **UPDATE**. Code-based routing (DD-1), 22 routes; append following the existing comment-per-route convention.
- `apps/admin/src/routes/RootLayout.tsx` — **UPDATE**. The nav renders only two links today (`nav-integrity`, `nav-provisioning`); follow the `data-testid` convention.
- `apps/admin/src/api/{client,hooks}.ts` — **UPDATE**. ~40 hooks; follow `useHelpdeskQueue` / `useCycleFreezePending`.
- `microcopy.yaml` — **UPDATE**. Strict parser: an unknown key **throws**. Add only within the existing `tone` schema (`label` + `pattern`), and validate the regex (`assertValidRegex`).
- `packages/contracts/scripts/emit-openapi.ts` + `openapi/v1.yaml` — **UPDATE**, regenerate; a stale spec fails `contracts-check`.

### No new dependencies

Nothing here needs a package. TanStack Router + Query, Zod, Drizzle, Radix and Tailwind are all already in the admin/api/domain stacks at their pinned versions. **Do not add one** — a new dep on an aggregator surface is a review finding on its face.

### Naming and boundaries

- Domain/TS is camelCase; every wire key is snake_case, mapped at the `packages/contracts` boundary — never in the domain ([[project_story_validate_footguns]]).
- The new domain namespace is **pure**. If a file under `packages/domain/src/trustee-lite/` imports `Db`, the layering is wrong.
- Admin copy is per-module English `resolveEn` (10.3/10.4), **not** `packages/i18n`. No en/hi parity obligation and no tone-review gate on this surface — but the microcopy gate binds it (AC5).

### Known artifact conflicts, recorded not hidden

| Conflict | Resolution |
|---|---|
| `epics.md:3578` credits Story 10.17 with the violator mechanism; 10.17 has none | Brief `:795-797` assigns it to 10.11. 10.11 builds it. Escalation 2. |
| `epics.md:3579` requires deadline-proximity sorting; 4 of 6 sources are undated | AC2 two-tier order; the moderation carve-out generalized (D2). |
| `epics.md:92` (FR-42) "one indexed query; no N+1" | Binds the Story 4.7 per-member panel, not FR-57's list (D10). |
| `prd.md:877` "sorted by stage and deadline" vs `epics.md:3579` "deadline-proximity" | Category *is* the stage grouping; within a section, AC2's order. No contradiction. |
| `architecture.md:4262` names an admin `modules/verifier/` tree that does not exist | The shipped layout is flat `apps/admin/src/modules/<module>/`. Follow the code. |

### References

- [Source: `_bmad-output/planning-artifacts/epics.md#Story 10.11` — lines 3568-3591 (post-amendment)]
- [Source: `_bmad-output/planning-artifacts/epics.md#Story 10.10` — retro-note, lines 3558-3566]
- [Source: `_bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md#FR-57` — lines 875-879; `#FR-42` line 702-704; `#FR-12A` lines 386-427]
- [Source: `_bmad-output/planning-artifacts/sprint-change-proposal-2026-08-04.md` — §2.2 line 99, §4b(iii) lines 450-462]
- [Source: `_bmad-output/implementation-artifacts/moderation-model-decision-brief.md#D1` — lines 189-237; "Spun out" table lines 784-797]
- [Source: `_bmad-output/implementation-artifacts/10-10-…md#Decision 9` — the `listModeratedMembersForPariwar` forward commitment]
- [Source: `packages/validity-service/src/payload.ts:245-296`; `src/types.ts:56-65` — the producer gap]
- [Source: `packages/domain/src/{claim/cycle-freeze-read.ts,claim/r9-voting-read.ts,claim/appeal-read.ts,reconciliation/reconciliation-review-read.ts,member/moderation/read.ts,helpdesk/sla.ts}`]
- [Source: `apps/api/src/modules/reports/handlers.ts:60-110` — the dynamic-key authorization precedent]
- [Source: `apps/admin/src/modules/helpdesk/{crossLinks.ts,HelpdeskQueuePage.tsx}` — the module pattern]
- [Source: `microcopy.yaml:52-95,193-212` — the tone rules + the admin code_globs scope]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

### Change Log

| Date | Change |
|---|---|
| 2026-08-04 | **D1 ratified by BigDev as D1-B**, verbatim: *"Trustee-Lite will ship structurally complete, but the R7 violator section shall explicitly render `detection_unavailable` until the contribution-fact producer exists. The story shall not derive R7 violations outside the rule engine."* Task 0's confirmation step is closed; D1-A and D1-C are rejected and must not be re-opened mid-story. |
| 2026-08-04 | Story created via `bmad-create-story`. |
