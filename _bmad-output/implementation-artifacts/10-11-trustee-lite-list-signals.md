---
baseline_commit: 49ad0ca195d2fd4358f9362109823c2a241bb80f
---

# Story 10.11: Trustee-Lite List + Signals `[SURFACE]`

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## ✅ Sequencing note — gate discharged, 10.11 is next (superseded 2026-08-05 via `bmad-create-story validate`)

**This story is NOT blocked.** It is fully authored, `ready-for-dev`, and zero lines of its code exist.
It was deliberately held behind a three-step planned order; **all three steps are now complete**, so
the hold this note originally recorded no longer applies. Left in place (rather than deleted) so a
later reader has the full history instead of a silently-vanished note.

**Original hold, for context.** Escalation 3 recorded the hazard: 10.11 surfaces suspension candidates
while `10-16`/`10-17` were still `backlog`, pointing at a cure not yet reachable. The decision taken
2026-08-04 was to sequence the cure ahead of the surface that advertises it — **Planned order:**
`bmad-correct-course` (scope + assign the unowned contribution-fact producer, Escalation 1) → 10.16 →
10.17 → **10.11** → producer story when scheduled.

**Verified live 2026-08-05 (`git log`, `sprint-status.yaml`) — all three prerequisite steps are done:**
- `bmad-correct-course` ran (commit `360bdf9` + `c359eb8`, `sprint-change-proposal-2026-08-04-R2.md`):
  the contribution-fact producer is no longer unowned — scoped into Stories **10.24** (projection +
  R7(C)–(F)), **10.25** (R7(A) accounting), **10.26** (R7(G) assertion), all entered as `backlog`. See
  the updated Escalation 1 below.
- **Story 10.16 — `done`** (commit `7e59f3d`, PR #167).
- **Story 10.17 — `done`** (commit `5394717`, PR #168).

**The `baseline_commit` diff was re-verified as this note instructed.** `10.17` did add a field to the
validity payload — `deriveIsAssignable`/`isAssignable` in `packages/validity-service/src/payload.ts` +
`types.ts` — and it is **purely additive**: it does not touch `applicableNiyamavaliClauses` or
`contributionHistorySummary`, the two fields `violator-flags.ts` reads. D1-B's premise is unaffected;
no change owed to this story's files. `epics.md:3578` was also corrected in the same pass to credit
10.11 (not 10.17) with the surfacing mechanism and to name Story 10.24 as the fact source — see D1's
updated citation below.

**Nothing in the ACs/Tasks/Decisions below is re-scoped by this note.** Resume by starting at Task 0's
unchecked items — Task 0's D1 confirmation is already closed and must not be re-opened.

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

   `epics.md:3578` **originally** attributed the mechanism to *"Story 10.17's D1 surfacing mechanism"* — but Story 10.17 as authored (`epics.md:3683-3713`) is entirely about `is_assignable`, and contained **no flagging mechanism whatsoever**. The decision brief was unambiguous where the epic drifted: *"**violator flagging on the admin dashboard** (from D1) … This is **scope-defining input to Story 10.11 rather than a standalone story**"* (`moderation-model-decision-brief.md:795-797`). **10.11 owns it — and this is no longer a drafting error to record: `epics.md:3578` was corrected in the same 2026-08-04 pass that scoped Escalation 1 (commit `c359eb8`) and now reads *"moderation violator flags — the surfacing mechanism is implemented by this story (10.11); the contribution-governance fact source is Story 10.24"* — verified live 2026-08-05. Re-verify the line before citing it in the Dev Agent Record; do not reproduce the old quote as if it were still current.**
   **But the detection cannot fire.** Verified against live source: `packages/validity-service/src/payload.ts:294` hardcodes `contributionHistorySummary: CONTRIBUTION_UNAVAILABLE`, and `types.ts:56-65` states plainly that *"R7/R8 are OMITTED from `applicableNiyamavaliClauses[]` until the Epic 8/9 producer supplies real `contribution.*` facts."* Epic 8 and Epic 9 are `done` and **the producer was never built.** So there is no way, today, to know that a member is in R7 violation.
   → **D1-B (CONFIRMED): ship the arm structurally complete and explicitly degraded.** `deriveViolatorFlags` reads the 4.6 payload's `applicableNiyamavaliClauses ∩ R7_CLAUSE_IDS`; today that intersection is empty **by construction**, so the section renders `detection_unavailable` naming the missing producer. The day the producer lands, flags appear with zero changes in this story's files. This is the codebase's own repeated discipline — `CONTRIBUTION_MISMATCH_EVENT_TYPE` (`contribution/history.ts:63-75`), `CONTRIBUTION_UNAVAILABLE`, the 9.x forward contracts of record.
   *Rejected — D1-A: build the producer here.* It must derive seven calendar-correct facts (`total_count`, `ever_contributed`, `skips_current_year`, `months_since_last`, `r7a_restorations_used`, `in_lapse`, `personal_event_excuse_claimed`). Three have no source at all: `skips_current_year` needs per-cycle assignment history, `r7a_restorations_used` needs restoration accounting, and `personal_event_excuse_claimed` has **no event anywhere**. Wiring it into `assemblePayload` would populate `applicableNiyamavaliClauses` and `specialFlags` for every member, changing **every validity payload hash** — which cascades into the 4.8 cache epochs and the Story 7.4 assignment version pin. That is a story, and a large one.
   *Rejected — D1-C: derive R7 violation ad-hoc inside 10.11.* It would hardcode eligibility logic outside the registry, violating `architecture.md`'s *"every eligibility check registry-driven, not hardcoded"* and `prd.md:425`, and it would fork [[project_engine_never_infers_contribution_facts]]. A **partially** derived fact producing a **wrong** flag on a real member's record — on the surface that feeds a suspension decision — is the worst outcome available here.
   **→ Escalation raised and since actioned (see the Escalation block): the R7 contribution-fact producer was UNOWNED** when this story was authored — neither the brief nor the change proposal had noticed that R7 evaluation is structurally dark; both assumed it worked. **It is no longer unowned** — routed 2026-08-04 to Stories 10.24/10.25/10.26 (still `backlog`, so D1-B's degraded rendering is unaffected).

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
   **↳ ROUTED 2026-08-04, verified live 2026-08-05 — no longer unowned, still unwritten.** The 2026-08-04
   `bmad-correct-course` pass (`sprint-change-proposal-2026-08-04-R2.md`) scoped exactly this gap into
   three new Epic 10 stories, all entered as `backlog`: **Story 10.24** (projection + R7(C)–(F)
   activation — the fact producer this escalation describes), **Story 10.25** (R7(A) restoration
   accounting), **Story 10.26** (R7(G) personal-event excuse assertion). `epics.md` now carries their
   full ACs (lines 3905–3980). None of the three is `done`, so **D1-B's conclusion is unchanged**: the
   violator-flag arm still ships `detection_unavailable` today. This escalation is discharged as
   "route to PM" — do not re-raise it; if 10.24–10.26 stall, that is a sprint-planning concern, not a
   10.11 one.
2. **`epics.md:3578` mis-attributed the violator mechanism to Story 10.17.** The brief (`:795-797`)
   assigns it to 10.11 as scope-defining input. 10.11 builds the arm.
   **↳ RESOLVED 2026-08-04, verified live 2026-08-05 — no `epics.md` correction owed.** The same
   correct-course pass rewrote `epics.md:3578` to read *"moderation violator flags — the surfacing
   mechanism is implemented by this story (10.11); the contribution-governance fact source is Story
   10.24. Until Story 10.24 lands, this section renders `detection_unavailable` per D1-B..."* — this is
   the correction this escalation asked for, already landed. Do not file a new `epics.md` correction
   request; re-verify the line lives if this note is ever more than a few weeks old.
3. **Standing hazard when this story was authored:** 10.11 surfaces suspension candidates while
   `10-16`/`10-17` were still `backlog`, so any suspension taken then was still the de-facto permanent
   ban the whole correct-course exists to fix. 10.11 adds **no new suspension path** (10.10's strip is
   already live), so it did not worsen it — but the moderation section's copy should not imply the cure
   is reachable before it is.
   **↳ SUPERSEDED 2026-08-04, then DISCHARGED — verified live 2026-08-05: `10-16` and `10-17` are both
   `done`** (commits `7e59f3d`/PR #167, `5394717`/PR #168; see the Sequencing note at the top of this
   file). The hazard this escalation warned about no longer holds when 10.11 is picked up — the roster
   path Story 10.17 restores is live before 10.11's first line of code. The moderation-copy caution
   still applies as a general discipline (AC5 already enforces "no verbs of advice" independent of
   whether the cure is reachable), but the specific "cure not yet reachable" condition is gone.

## Tasks / Subtasks

- [x] **Task 0 — Read before writing (AC1)**
  - [x] ~~Confirm D1 with BigDev.~~ **D1-B APPROVED (BigDev, 2026-08-04): arm now, producer later.** The producer question is CLOSED for this story — if implementation pressure tempts you toward deriving R7 facts here, that is D1-C and it is rejected; escalate instead.
  - [x] Read in full: `packages/domain/src/claim/cycle-freeze-read.ts`, `claim/r9-voting-read.ts`, `claim/appeal-read.ts`, `reconciliation/reconciliation-review-read.ts` (`listOpenReconciliationCases`, `:163`), `member/moderation/read.ts` (`listModeratedMembersForPariwar`, `:201`), `helpdesk/sla.ts`, `apps/api/src/modules/reports/handlers.ts:60-110`, `apps/admin/src/modules/helpdesk/{HelpdeskQueuePage,crossLinks}.tsx|ts`.
- [x] **Task 1 — `packages/domain/src/trustee-lite/` pure core (AC1, AC2, AC3)**
  - [x] `types.ts`: `TrusteeSignalCategory` (7 members), `TrusteeSignalSeverity` (reuse the `sla.ts` band vocabulary), `TrusteeSignalRow`.
  - [x] `signals.ts`: per-source `normalize*` mappers + `orderTrusteeSignals(rows)` (two-tier, total, deterministic) + `deriveSignalSeverity(row, now)`. **No `Db` import in this namespace.**
  - [x] `violator-flags.ts`: `deriveViolatorFlags(payload)` over `applicableNiyamavaliClauses ∩ R7_CLAUSE_IDS` (import `R7_CLAUSE_IDS` from `@twt/niyamavali-engine`); returns `{ status: 'detection_unavailable', producer } | { status: 'ok', flags }`.
  - [x] Barrel + `packages/domain/src/index.ts` export.
- [x] **Task 2 — `listOpenAppealCasesForPariwar` (AC1, AC2, D5)**
  - [x] Add to `packages/domain/src/claim/appeal-read.ts`; scope-safe, `clampLimit`ed, returns stage + stage-entry instant + claim/deceased ids.
- [x] **Task 3 — Contracts (AC4, AC8, AC10)**
  - [x] `packages/contracts/src/trustee-lite/{dto,index}.ts`: `TrusteeSignalRowDto`, `ViolatorFlagDto` (**frozen key set**), `TrusteeLiteResponse` with **optional** per-section keys (absent ≡ not permitted, AC6).
  - [x] Category-enum sync-guard test (test-only cross-import, [[project_contracts_domain_bundle_boundary]]); frozen-key + forbidden-key-pattern test.
  - [x] `scripts/emit-openapi.ts` + `openapi/v1.yaml` regen.
- [x] **Task 4 — `apps/api/src/modules/trustee-lite/` (AC1, AC6, AC8)**
  - [x] `handlers.ts`: one scope-tx, six reads, grant-filtered sections, no decryption, zero `deps.encryption` calls.
  - [x] `routes.ts`: `GET /api/v1/p/:pariwarId/admin/trustee-lite`, `preHandler: [adminSession, scope]` — **no `requirePermissionHook`, no step-up** (AC6); 403 when zero sections.
  - [x] Register in `server.ts`.
- [x] **Task 5 — Admin surface (AC7, AC9)**
  - [x] `apps/admin/src/modules/trustee-lite/{TrusteeLitePage.tsx,TrusteeLiteShell.tsx,crossLinks.ts,i18n-en.ts}`; four section states rendered outside the list.
  - [x] `apps/admin/src/api/{client,hooks}.ts` → `useTrusteeLite(pariwarId)`.
  - [x] `router.tsx` route `/p/$pariwarId/trustee` + `RootLayout` nav entry.
- [x] **Task 6 — Detection-only mechanization (AC5, D7)**
  - [x] `microcopy.yaml` `tone` entry `moderation-advice` (+ an explanatory comment citing `epics.md:3585`).
  - [x] Planted-violation fixture + test in `scripts/microcopy/`; run `pnpm microcopy:test && pnpm microcopy:check`.
- [x] **Task 7 — Tests (AC10)**
  - [x] Domain unit; contracts; live-DB integration (per-section 403/200 revert pairs, zero-key 403, cross-Pariwar denial); admin UI; the three revert-sanity probes.
- [x] **Task 8 — Verify + record**
  - [x] `pnpm ci:local` on `twt-test-pg` :5433. Confirm **no migration**, catalog still **28**, `openapi/v1.yaml` regenerated.
  - [x] Dev Agent Record: the D1 escalation, the `epics.md:3579` mis-attribution, the FR-42 clarification, the return to "NOT step-up-gated".

### Review Findings

*Code review run 2026-08-05 against uncommitted changes vs HEAD (`5394717`), three parallel layers: Blind Hunter (diff-only), Edge Case Hunter (diff + read access), Acceptance Auditor (diff + spec).*

- [x] [Review][Patch] `mayAppeal` never checks `claim.appeal_final` (Stage-3) — only `claim.appeal_review` (Stage-1) and `claim.appeal_vote` (Stage-2). A Stage-3 Trustee reviewer holding only `claim.appeal_final` currently sees no `appeal` section at all. Resolved (Decision, 2026-08-05): the cross-stage OR-gate visibility itself is correct — `apps/api/src/modules/claims/claims.appeal.routes.ts:106-121` establishes the precedent that any of the three appeal keys grants read access to a case by design, so stage-1/2/3 reviewers can see a case's full journey. The gap is narrower than first flagged: add the missing third key. **Fixed**: added `APPEAL_FINAL: 'claim.appeal_final'` to `TRUSTEE_LITE_SECTION_KEYS` and OR'd it into `mayAppeal`. [`apps/api/src/modules/trustee-lite/handlers.ts`]
- [x] [Review][Dismiss] AC1's literal "at most one query per source... six bounded reads" is technically exceeded by the reconciliation section, which issues two queries (`listHolidayWindows` + `listOpenReconciliationCases`). Resolved (Decision, 2026-08-05): AC1's intent is O(1)/bounded reads, not a literal single-query-per-source count — this mirrors the precedented, shipped Story 9.8 consumer pattern and doesn't violate the constraint's spirit. [`apps/api/src/modules/trustee-lite/handlers.ts`]
- [x] [Review][Patch] Misleading permission key on composite zero-grant denial — the 403 hardcodes `permissionKey: TRUSTEE_LITE_SECTION_KEYS.CYCLE_FREEZE` regardless of which of the six section keys were actually evaluated and missing, misleading any log/audit consumer reading the error. **Fixed**: `permissionKey` now names all seven candidate keys (`ALL_TRUSTEE_LITE_SECTION_KEYS.join(' | ')`) instead of pinning one arbitrarily. [`apps/api/src/modules/trustee-lite/handlers.ts`]
- [x] [Review][Patch] `crossLinks.ts`'s switch has no `default` — an unknown `cross_link_kind` (e.g. client/server deploy skew) falls through to an implicit `undefined` return, contradicting the module's own documented contract ("it never throws"). **Fixed**: added a `default` branch returning `{ href: null }`, plus a regression test for an unrecognized kind. [`apps/admin/src/modules/trustee-lite/crossLinks.ts:47`]
- [x] [Review][Patch] English tone-gate negation guard (`(?<!\bno\s)` before `action ... required`) only suppresses adjacent negation — "No further action is required from you" still trips the gate as a false positive; the only added test never exercises an intervening word. **Fixed**: widened to `(?<!\bno\b(?:\s+\S+){0,3}\s)`, tolerating up to 3 intervening words; added a regression test. [`microcopy.yaml`]
- [x] [Review][Patch] Hindi tone-gate negation guard (`(?!\s*नहीं)` after `ज़रूरी`/`आवश्यक`) has the identical adjacency weakness — "कार्रवाई ज़रूरी बिलकुल नहीं है" still trips the gate. **Fixed**: widened to `(?!(?:\s+\S+){0,3}\s*नहीं)`; added a regression test. [`microcopy.yaml`]
- [x] [Review][Patch] `CONTRIBUTION_PRODUCER_UNAVAILABLE_STATUS = 'producer_unavailable'` is asserted by prose comment to match `@twt/validity-service`'s real emitted sentinel, but unlike `TRUSTEE_LITE_R7_CLAUSE_IDS` (which gets a lockstep test in the niyamavali-engine package), nothing pins this match with a cross-package test. **Fixed**: added `packages/validity-service/tests/trustee-lite-sentinel-lockstep.test.ts` (validity-service CAN import domain, mirroring the R7 lockstep precedent) pinning the domain constant against the real `CONTRIBUTION_UNAVAILABLE.status`. [`packages/domain/src/trustee-lite/violator-flags.ts:166`]
- [x] [Review][Dismiss] Duplicate import of `TrusteeLiteResponse` from `@twt/contracts` (once as a value import, once as `type TrusteeLiteResponse as TrusteeLite`) solely to type one return as `Promise<TrusteeLite>`. **Verified false positive during patch application**: this is the file's own established convention — the identical value-import + `type X as Y` alias pattern is used for ~15 other DTOs in this same import block (`VerifierConsoleResponse`/`VerifierConsole`, `CycleFreezePendingResponse`/`CycleFreezePending`, `FeatureFlagInventoryResponse`/`FeatureFlagInventory`, …). "Fixing" it would make `TrusteeLiteResponse` the inconsistent one. Not touched. [`apps/admin/src/api/client.ts:554`]
- [x] [Review][Patch] `TrusteeLiteRoute.tsx` imports `HelpdeskGateView`/`HelpdeskGateViewProps` directly from `./HelpdeskQueueRoute.js` rather than a shared location. **Fixed differently than first proposed**: verified during patch application that shared-extraction is NOT this codebase's convention — 12+ unrelated-feature routes (`NewsRoute`, `ReportsRoute`, `VerifierConsoleRoute`, …) each hand-roll their own identically-shaped `<Feature>GateView`; the one existing cross-import (`HelpdeskTicketRoute` → `HelpdeskGateView`) stays within the Helpdesk feature family. Gave `TrusteeLiteRoute` its own local `TrusteeLiteGateView` instead, matching the dominant per-route pattern. [`apps/admin/src/routes/TrusteeLiteRoute.tsx`]
- [x] [Review][Defer] Zero-grant 403 denial path never calls `emitAuthAudit` — the success path audits `admin_trustee_lite.read`, but a probing/reconnaissance attempt with zero grants leaves no audit trail. Matches the existing project-wide convention: the 10.7 `reports/handlers.ts` precedent this story followed also doesn't audit its `AuthorizationDeniedError` path, and the central error-mapping middleware doesn't audit denials either — pre-existing, not a 10.11 regression. [`apps/api/src/modules/trustee-lite/handlers.ts`] — deferred, pre-existing convention across admin modules
- [x] [Review][Defer] `orderTrusteeSignals`'s `categoryRank` tie-break branch is never exercised by any test — every call site (`normalizeTrusteeSignals`) sorts a single-category array, so `categoryRank` is always 0 in practice. The comparator's cross-category total-ordering guarantee is unverified; harmless today, but the only guard against non-deterministic output if a future caller ever merges sections before sorting. [`packages/domain/src/trustee-lite/signals.ts`] — deferred, test-coverage gap only, no correctness impact today

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
| ~~`epics.md:3578` credited Story 10.17 with the violator mechanism; 10.17 has none~~ | **RESOLVED upstream, verified live 2026-08-05.** Corrected in the same 2026-08-04 pass that scoped Escalation 1 (commit `c359eb8`): the line now credits 10.11 and names Story 10.24 as the fact source. No `epics.md` edit owed by this story. |
| `epics.md:3579` requires deadline-proximity sorting; 4 of 6 sources are undated | AC2 two-tier order; the moderation carve-out generalized (D2). |
| `epics.md:92` (FR-42) "one indexed query; no N+1" | Binds the Story 4.7 per-member panel, not FR-57's list (D10). |
| `prd.md:876` "sorted by stage and deadline" vs `epics.md:3579` "deadline-proximity" | Category *is* the stage grouping; within a section, AC2's order. No contradiction. (Line renumbered from `:877` — see References.) |
| `architecture.md:4262` names an admin `modules/verifier/` tree that does not exist | The shipped layout is flat `apps/admin/src/modules/<module>/`. Follow the code. |
| **NEW, verified live 2026-08-05 —** `validity-service/types.ts:65`'s `ContributionHistoryUnavailable.producer` sentinel is still hardcoded `'epic-8-9'`, not updated by the 2026-08-04 correct-course pass that created Stories 10.24/10.25/10.26. Meanwhile Story 10.16's sibling gap-sentinel (`restorationPackage`) already uses `producer: 'story-10-24'` for the same underlying gap (see `sprint-status.yaml` line 250). | **Not this story's to fix** — `validity-service` is out of scope (D1-B forbids touching the producer question). But AC4's `detection_unavailable` state literally "**names the missing producer**": implemented today, it will render `'epic-8-9'`, an internal-jargon label that is now inconsistent with the sibling surface next to it. Before wiring AC4's UI copy, check whether Story 10.24 is expected to rename this sentinel first; if not, consider mapping the raw `'epic-8-9'` value to admin-facing copy (e.g. "awaiting the contribution-fact producer, Story 10.24") rather than echoing the sentinel string verbatim. Do not silently decide this — flag it in the Dev Agent Record either way. |

### References

- [Source: `_bmad-output/planning-artifacts/epics.md#Story 10.11` — lines 3568-3591 (post-amendment)]
- [Source: `_bmad-output/planning-artifacts/epics.md#Story 10.10` — retro-note, lines 3558-3566]
- [Source: `_bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md#FR-57` — lines 876-880; `#FR-42` line 703-705; `#FR-12A` lines 385-439 (all three shifted +1 from the original 875-879/702-704/386-427 by a 2026-08-04 R7(A)/(B) proxy-disclaimer bullet inserted at ~line 344; re-verified live 2026-08-05)]
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

claude-opus-5 (Claude Code, `bmad-dev-story`).

### Debug Log References

**The `epics.md:3578` citation, re-verified live before use (D1's instruction).** The line now reads
*"moderation violator flags — the surfacing mechanism is implemented by this story (10.11); the
contribution-governance fact source is Story 10.24. Until Story 10.24 lands, this section renders
`detection_unavailable` per D1-B…"*. The old Story-10.17 mis-attribution is gone and no `epics.md`
edit was owed. Escalation 2 stays discharged; the old quote was not reproduced anywhere.

**Escalation 1 re-verified.** `packages/validity-service/src/payload.ts:294` still hardcodes
`contributionHistorySummary: CONTRIBUTION_UNAVAILABLE`, and `types.ts:56-65` still states R7/R8 are
omitted from `applicableNiyamavaliClauses[]`. Stories 10.24/10.25/10.26 are still `backlog`. D1-B's
degraded rendering is therefore correct as shipped, and the escalation stays discharged — not re-raised.

**FR-42 clarification recorded in code, not only here.** `epics.md:92`'s "one indexed query; no N+1"
binds the FR-42 per-member SIGNALS PANEL (Story 4.7), NOT FR-57's list. Six bounded, already-clamped
reads over six unrelated subsystems is O(1) queries. Stated in both module headers
(`packages/domain/src/trustee-lite/types.ts`, `apps/api/src/modules/trustee-lite/handlers.ts`) so a
reviewer applying the phrasing literally — and demanding a single impossible join — is answered in place.

**Return to the "NOT step-up-gated" chain.** The route composes `[requireAdminSession,
scopeResolutionHook]` and nothing else. AR-24 gates consequential WRITES; this surface writes nothing,
elevates nothing and decrypts nothing. That returns Epic 10 to the 10.3/10.4/10.5/10.8/10.9 posture
that 10.10 broke for its own good reason (it takes moderation actions).

**A performance regression this story caused, found and fixed before merge.** The integration spec
originally seeded a fresh tenant and authenticated fresh admins PER TEST. Each `authenticate()` runs a
real argon2id hash and each seeded claim drives six projector appends, and under
`turbo run test --concurrency=4` that pushed the whole `@twt/api` suite from ~44s (clean baseline) to
~220s and started timing OTHER specs out at their 20s ceiling — 3 unrelated specs failed, a different
set each run. Measured against a `git stash` baseline rather than assumed. Fixed by building ONE shared
read-only fixture plus one client per role in `beforeAll`; the suite is back to 43.45s with 18 more
tests than the baseline had. Recorded because the flake would otherwise have been mis-filed as an
inherited one ([[project_ci_local_concurrency_oversubscription]]).

### Completion Notes List

**D1-B implemented exactly as ratified; the producer question was never re-opened.**
`deriveViolatorFlags` reads the Story 4.6 payload's `applicableNiyamavaliClauses ∩ R7_CLAUSE_IDS` and
nothing else. The producer-unavailable sentinel is checked FIRST and short-circuits, so the empty
intersection `payload.ts:294` guarantees can never be mistaken for "detection ran and found nobody" — a
unit test pins that ordering by feeding an R7 clause on an unavailable payload and asserting the result
is still `detection_unavailable`. No R7 fact is derived anywhere in this story (D1-C, rejected).

**⚠ THE DECISION this story had to make that the ACs did not settle — two of the six section keys are
DISTRICT-dimension, so the aggregator narrows them.** `claim.verify` (concealment) and
`claim.appeal_review` (Stage-1 appeals) are checked everywhere else at `dimension: 'district'` against a
SERVER-DERIVED per-claim posting district (`claims.verifier-console.routes.ts:78-81`,
`claims.appeal.routes.ts:99`). A Pariwar-WIDE aggregator has no single district, and deriving one per
row is the exact N+1 this surface exists to avoid. Every section is therefore checked at
`dimension: 'pariwar'` — fail-closed and honest, with two consequences stated rather than discovered:
  · `concealment` resolves for `super_admin` only until the Epic-3 geo-tree resolver lands, because
    `district_admin` and `verifier` hold `claim.verify` at a `district` scopeCeiling and a narrower
    grant never satisfies a broader check ([[project_rbac_geo_scope_containment]]);
  · `appeal` is UNAFFECTED in practice — AC6 already reads `claim.appeal_review` **or**
    `claim.appeal_vote`, and `claim.appeal_vote` is genuinely pariwar-dimension and held by
    `pariwar_admin`. The OR in the AC is what saves it.
This is the SEVENTH replay of the district-ceiling deferral and it is a deferral, not a defect: the
section is OMITTED, never silently emptied, so no caller is ever told "there is nothing here" when the
truth is "you cannot see this". Pinned by a live-DB test asserting `district_admin` → 403, so a future
bundle edit that reverses it fails there first.

**⚠ `R7_CLAUSE_IDS` could not be imported as Task 1 instructed — the import is architecturally
impossible.** `@twt/niyamavali-engine` DEPENDS ON `@twt/domain` (`niyamavali-engine/package.json`), so a
domain → engine import is a turbo/package cycle — the identical constraint
`claim/concealment-review.ts:10-13` documents for `evaluateConcealmentAt`. Resolved with the shipped
Story 6.14 pattern (`claim/r9-voting.ts:47-49`): the list is re-declared in the domain as
`TRUSTEE_LITE_R7_CLAUSE_IDS`, and the PIN lives in the ENGINE package, which CAN import domain —
`packages/niyamavali-engine/tests/r7-clause-ids-lockstep.test.ts`. Adding or removing an R7 sub-clause
fails there until the domain copy is updated in lockstep, so the re-declaration is mechanized rather
than a hand-maintained copy hoping to stay honest. AC4's "never re-declared" intent (no silent drift) is
satisfied; its literal instruction was not implementable.

**⚠ AC4's `facts_establishing[]` could not come from `provenanceTrace` as worded.** `ProvenanceEntry`
carries `payloadHash` / `evaluatedAt` / `benefitMechanism` — no fact key/value pairs exist anywhere in
the payload today. The flag therefore reads the `contribution.*` fact map a real producer will supply on
`contributionHistorySummary`, sorted for replay-stable order, and renders EMPTY until one does. Likewise
`holding_since` has no source: it is `null`, explicitly, and is NOT back-filled from `evaluatedAt` —
"the clause applies as of this evaluation" and "the member has been in violation since this date" are
different claims, and printing the first as the second on the surface that feeds a suspension decision
is the fabrication AC2's "no deadline" affordance exists to refuse. A unit test asserts
`holdingSince !== evaluatedAt`.

**The 10.24 seam is named at exactly one call site.** `summarizeViolatorFlags` takes a DISCRIMINATED
candidate source, not a bare array, because "no members are flagged" and "nothing can tell us who is
flagged" are different facts an array cannot distinguish. Today `apps/api` passes
`{status:'unavailable', producer: CONTRIBUTION_UNAVAILABLE.producer}`. When 10.24 lands, that ONE line
becomes `{status:'available', candidates}` over its projection — with zero changes to the domain files,
proven now by a unit test that feeds a synthetic payload carrying applied R7 clauses and asserts flags
render. The section also degrades to `detection_unavailable` if ANY candidate is unevaluable: a partial
scan is a false all-clear for exactly the members it skipped.

**⚠ FLAGGED, per the Dev Notes conflict table — the `producer: 'epic-8-9'` sentinel is stale and I did
NOT echo it.** `validity-service/types.ts:65` still hardcodes `'epic-8-9'` while Story 10.16's sibling
gap-sentinel already reads `'story-10-24'` for the same underlying gap. Fixing the sentinel is out of
scope (D1-B forbids touching the producer question). Since AC4 requires the state to "name the missing
producer", the admin surface maps known sentinels to admin-facing copy via `producerLabel()` —
`epic-8-9` → *"the contribution-fact producer (Story 10.24)"* — and falls through to the RAW value for
anything unrecognized, so an unfamiliar token is surfaced rather than hidden. A UI test asserts both
arms. **Owed forward: Story 10.24 should rename the sentinel; this mapping can then be deleted.**

**AC2's two-tier order generalizes the epic's moderation carve-out rather than contradicting it.**
Verified against live source: `CycleFreezePendingCase` (`cycle-freeze-read.ts:50-63`) and `R9QueueItem`
(`r9-voting-read.ts:38-48`) carry NO temporal field, and concealment is a flag on a cycle-freeze row —
so FOUR of six sources are undated, not one. `epics.md:3587` named moderation only because Story 10.10
had recorded it. Dated rows sort ascending; undated rows sort by age descending; unknown-age rows (the
three sources with no instant at all) sort last within that tier — unknown is neither new nor old — and
ties break on `(category, resourceId, sourceKey)`. `sourceKey` is load-bearing for TOTALITY, not
decoration: two reconciliation cases on ONE pool share both category and `resourceId`. A determinism
test asserts every rotation and reversal of the input yields the identical order.

**Concealment is a FILTER, and the two sections deliberately overlap.** `getCycleFreezePending` already
resolves the real 6.15 producer in bulk and surfaces `concealmentFlags`; the concealment section is the
subset carrying `CONCEALMENT_REVIEW_REQUIRED_FLAG`. ONE read serves both sections. A claim appears in
BOTH and is NOT deduped (D6) — collapsing them would hide one of the two reasons it needs attention. A
unit test asserts the overlap rather than merely permitting it.

**AC5's teeth were proven, and the new rule found a REAL false positive on introduction.** The
`moderation-advice` tone rule fired on a SHIPPED Story 9.1 string —
`"आपकी ओर से कोई कार्रवाई ज़रूरी नहीं है।"` ("No action is needed from you"), the fursat register's own
reassurance to a grieving nominee. That is a false positive, so the Hindi arm was NARROWED to exclude
the negated form and the English arm guarded symmetrically (`(?<!\bno\s)`), so the same sentence cannot
pass in one language and fail in the other — a parity bug the original asymmetric pattern would have
introduced. This is the identical narrowing `fursat-pressure` already applies to जल्दी. The rule also
fired on this story's OWN `i18n-en.ts`, whose header quoted the prohibited phrases; the header was
rewritten to describe them instead, which is itself evidence the rule binds this module. NO new gate
script was written (D7) — `apps/admin/src/**` was already in `code_globs`.

**REVERT-SANITY, all three probes run and recorded (not assumed):**
  1. *Moderation/violator severity null-pin* — `SEVERITY_FORBIDDEN_CATEGORIES` is asserted to equal
     exactly `{moderation, violator_flag}`, and `deriveSignalSeverity` is tested with a long-PAST
     deadline on both categories (still `null`). Removing an entry flips two tests.
  2. *The `moderation-advice` microcopy rule* — deleting the entry from `microcopy.yaml` and re-running
     `scripts/microcopy/moderation-advice.test.ts` left **26 of 45 tests failing** (every planted
     violation unflagged) while `pnpm microcopy:check` stayed green. Restored; 45/45 pass.
  3. *The AC6 section filter* — replacing `may()` with `() => true` in the handler flipped **4 of 18**
     live-DB tests (the zero-key 403, the pariwar_admin/concealment revert pair, the district_admin
     403, and the violator gating). Restored; 18/18 pass.

**AC8 proven two ways.** The response body is asserted to contain neither the seeded verifier-decision
ciphertext nor the seeded moderation ciphertext nor the substrings `ciphertext` / `enc:v1:`; separately,
every function on `deps.encryption` is wrapped for one request and the call list asserted EMPTY. The
first alone could be satisfied by decrypting and then dropping the value — counting port calls proves
the path never touches the crypto boundary at all (the 10.4 admin-identity-keys lesson).

**Cross-Pariwar isolation returns 404, not 403 — and that is correct.** `scopeResolutionHook` denies
before this module's filter runs: zero grants in the target Pariwar means "not a member (or the Pariwar
is absent)", and a 403 there would confirm the tenant EXISTS to a caller with no standing in it. The
shipped no-enumeration-oracle convention (`middleware/scope-resolution/index.ts:47-49`); stricter than a
403, not weaker. The test asserts 404 with that reasoning recorded inline.

**AC10 verification — what is green and what is not.** `pnpm ci:local` reports **29 of 30 jobs green**;
`integration-tests` fails on `apps/api/tests/integration/banners/banners.spec.ts`, which is
**PRE-EXISTING and unrelated to this story**, established by measurement rather than assertion:
  · the SAME `pnpm ci:local` FAILS on the clean baseline (`git stash` → `banners.spec.ts`, a different
    test in the same file);
  · a DIFFERENT `banners.spec` test fails on each run (four distinct ones observed across four runs);
  · `banners.spec` passes in isolation (26/26), and the full `@twt/api` suite passes standalone
    (107 files / 852 tests, 43.45s — the clean baseline is 44s with 834 tests).
  Mechanism: `banners.spec.ts` calls `twoAdmins(p)` in ~16 tests (~32 argon2id hashes) and starves under
  `turbo run test --concurrency=4` with eight packages competing — the SAME root cause this story found
  and fixed in its own spec. Fixing Story 10.9's spec is out of scope here; recorded so it is not
  re-diagnosed from scratch, and so this story is not credited with a green it did not earn
  ([[feedback_record_unattested_no_backfill]]).
  Everything this story touched is green in isolation: `@twt/domain` 2296, `@twt/contracts` 837,
  `@twt/admin` 268, `@twt/niyamavali-engine` 122, `@twt/api` 852, `scripts/microcopy` 228.
  **No migration was authored** (`git status packages/domain/migrations/` is empty),
  **`PERMISSION_CATALOG_VERSION` is still 28**, and `openapi/v1.yaml` was regenerated + verified
  deterministic. `pnpm microcopy:check` is green WITH the new rule.

### File List

**NEW — `packages/domain/src/trustee-lite/`** (the pure core; DB-free, clock-injected)
- `packages/domain/src/trustee-lite/types.ts`
- `packages/domain/src/trustee-lite/signals.ts`
- `packages/domain/src/trustee-lite/violator-flags.ts`
- `packages/domain/src/trustee-lite/index.ts`

**NEW — contracts**
- `packages/contracts/src/trustee-lite/dto.ts`
- `packages/contracts/src/trustee-lite/index.ts`

**NEW — apps/api**
- `apps/api/src/modules/trustee-lite/handlers.ts`
- `apps/api/src/modules/trustee-lite/routes.ts`
- `apps/api/src/modules/trustee-lite/index.ts`

**NEW — apps/admin**
- `apps/admin/src/modules/trustee-lite/TrusteeLitePage.tsx`
- `apps/admin/src/modules/trustee-lite/TrusteeLiteShell.tsx`
- `apps/admin/src/modules/trustee-lite/crossLinks.ts`
- `apps/admin/src/modules/trustee-lite/i18n-en.ts`
- `apps/admin/src/routes/TrusteeLiteRoute.tsx`

**NEW — tests**
- `packages/domain/tests/trustee-lite/signals.test.ts`
- `packages/domain/tests/trustee-lite/violator-flags.test.ts`
- `packages/contracts/tests/trustee-lite.test.ts`
- `packages/niyamavali-engine/tests/r7-clause-ids-lockstep.test.ts`
- `apps/api/tests/integration/trustee-lite/trustee-lite.spec.ts`
- `apps/admin/tests/trustee-lite.test.tsx`
- `scripts/microcopy/moderation-advice.test.ts`

**MODIFIED**
- `packages/domain/src/claim/appeal-read.ts` — added `listOpenAppealCasesForPariwar` + `OpenAppealCase` (D5)
- `packages/domain/src/index.ts` — `export * as trusteeLite`
- `packages/contracts/src/index.ts` — `export * from './trustee-lite/index.js'`
- `packages/contracts/scripts/emit-openapi.ts` — registered the GET path
- `openapi/v1.yaml` — regenerated
- `apps/api/src/server.ts` — `registerTrusteeLiteModule`
- `apps/api/src/audit/audit-sink.ts` — added `admin_trustee_lite.read`
- `apps/admin/src/api/client.ts` — `getTrusteeLite`
- `apps/admin/src/api/hooks.ts` — `useTrusteeLite`
- `apps/admin/src/router.tsx` — `/p/$pariwarId/trustee`
- `apps/admin/src/routes/RootLayout.tsx` — the `nav-trustee` entry
- `microcopy.yaml` — the `moderation-advice` tone rule
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — status ledger

### Change Log


| Date | Change |
|---|---|
| 2026-08-05 | **Code review (`bmad-code-review`), Status review → done.** Three parallel layers (Blind Hunter, Edge Case Hunter, Acceptance Auditor) over the uncommitted diff vs HEAD (`5394717`). 13 unique findings after dedup: 2 `decision-needed`, 8 `patch` (incl. 1 promoted from a decision), 2 `defer`, 2 dismissed as noise (matched documented precedent/decisions — the concealment district-dimension narrowing and the D1-B partial-scan short-circuit). Both decisions resolved with the user: the appeal-section OR-gate visibility is CORRECT (matches the `claims.appeal.routes.ts:106-121` cross-stage-by-design precedent) — narrowed to adding the missing third key, `claim.appeal_final`; the AC1 reconciliation two-query count was dismissed as satisfying the constraint's O(1)/bounded-reads intent, not its literal text. Of the 8 patches, 7 were fixed and 1 (the `client.ts` "duplicate" import) was found during application to be the file's own established convention across ~15 other DTOs and left unchanged. Two findings deferred to `deferred-work.md` as pre-existing, out-of-scope patterns (the zero-grant 403's missing audit call, matching the 10.7 `reports/handlers.ts` precedent; `orderTrusteeSignals`'s untested `categoryRank` tie-break, exercised by no current caller). Fixes: `permissionKey` on the composite zero-grant 403 now names all seven candidate keys instead of hardcoding `cycle.freeze`; `mayAppeal` gains the missing `claim.appeal_final` check; `crossLinks.ts`'s switch gained a `default` branch (+ test) so an unrecognized `cross_link_kind` returns `href: null` per its own documented contract instead of falling through to `undefined`; both `moderation-advice` tone-gate negation guards (English + Hindi) widened from adjacent-only to tolerate up to 3 intervening words (+ regression tests) so legitimate reassurance copy like "No further action is required" stops false-positiving; a new cross-package lockstep test (`packages/validity-service/tests/trustee-lite-sentinel-lockstep.test.ts`) pins `CONTRIBUTION_PRODUCER_UNAVAILABLE_STATUS` against the real `CONTRIBUTION_UNAVAILABLE.status`, mirroring the shipped R7-clause-ids lockstep pattern; `TrusteeLiteRoute.tsx` now owns a local `TrusteeLiteGateView` instead of cross-importing `HelpdeskGateView` from an unrelated feature's route file (verified during application that 12+ sibling routes each hand-roll their own gate view — that's the dominant convention, not shared extraction). All touched suites re-run green (domain, contracts n/a, admin, engine lockstep, validity-service lockstep, microcopy gate, and the live-DB `trustee-lite.spec.ts` integration suite — 18/18); `tsc --noEmit` and `eslint` clean on every touched package. |
| 2026-08-05 | **Implemented via `bmad-dev-story` (Tasks 0–8; Status ready-for-dev → in-progress → review).** New `packages/domain/src/trustee-lite/` pure core (7-category row, two-tier total order, per-source-optional severity with a structural moderation/violator null-pin, detection-only `deriveViolatorFlags`); ONE new domain read `listOpenAppealCasesForPariwar` (D5); new contracts `trustee-lite` DTOs with a FROZEN violator key set + all-optional sections; new `apps/api/src/modules/trustee-lite/` (one GET, six reads in one scope-tx, per-section grant filter, no step-up, zero decryption); new `apps/admin/src/modules/trustee-lite/` + `/p/$pariwarId/trustee` + a `nav-trustee` entry; a `moderation-advice` microcopy tone rule with proven teeth. THREE decisions the ACs did not settle, all recorded in the Dev Agent Record: (1) two of the six section keys are DISTRICT-dimension so `concealment` narrows to `super_admin` until the Epic-3 geo-resolver lands (7th replay of the deferral, pinned by a 403 test); (2) `R7_CLAUSE_IDS` could not be imported (domain→engine is a package cycle) so it is re-declared with a LOCKSTEP test in the engine package, the shipped 6.14 pattern; (3) `facts_establishing`/`holding_since` have no source in the provenance trace today and are honestly empty/null rather than back-filled. Flagged as the Dev Notes asked: the stale `producer:'epic-8-9'` sentinel is mapped to admin-facing copy rather than echoed, and Story 10.24 should rename it. Three revert-sanity probes RUN (26/45 microcopy tests flip, 4/18 live-DB tests flip, 2 severity tests flip). No migration; `PERMISSION_CATALOG_VERSION` still 28; `openapi/v1.yaml` regenerated + deterministic. `pnpm ci:local` = 29/30 green; the one failure is a PRE-EXISTING `banners.spec.ts` load flake that reproduces on the clean baseline (see the Dev Agent Record for the measurement). A performance regression this story initially introduced (per-test auth in the integration spec, ~44s→~220s suite) was measured against a stashed baseline and fixed before merge. |
| 2026-08-05 | **Validated via `bmad-create-story validate`.** Re-verified every load-bearing citation against live `HEAD` (`5394717`), 12 commits past this story's `baseline_commit`. Findings applied: (1) the top Sequencing note's hold is discharged — 10.16, 10.17 and the `bmad-correct-course` step are all complete, so 10.11 is next-in-queue, not held; (2) D1's quoted `epics.md:3578` text was corrected upstream in the same 2026-08-04 pass (now credits 10.11, names Story 10.24) — the story's own escalation-2 ask is already resolved, no further `epics.md` edit owed; (3) Escalation 1 is routed, not unowned — Stories 10.24/10.25/10.26 exist as `backlog`, D1-B's degraded rendering is unaffected; (4) new Dev Note: `validity-service/types.ts:65`'s `producer: 'epic-8-9'` sentinel is stale relative to Story 10.16's sibling sentinel (`'story-10-24'`) — flag before wiring AC4's UI copy, not this story's to fix; (5) `prd.md` FR-12A/FR-42/FR-57 citations renumbered +1 (an unrelated 2026-08-04 PRD insertion shifted them). No AC, Task, or Decision changed — all edits are provenance/status corrections. |
| 2026-08-04 | **D1 ratified by BigDev as D1-B**, verbatim: *"Trustee-Lite will ship structurally complete, but the R7 violator section shall explicitly render `detection_unavailable` until the contribution-fact producer exists. The story shall not derive R7 violations outside the rule engine."* Task 0's confirmation step is closed; D1-A and D1-C are rejected and must not be re-opened mid-story. |
| 2026-08-04 | Story created via `bmad-create-story`. |
