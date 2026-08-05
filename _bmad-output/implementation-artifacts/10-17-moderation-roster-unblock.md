---
baseline_commit: 7e59f3d1369cd0178293d17c33a6bc65a1e1a5da
---

# Story 10.17: Moderation Roster Unblock — Suspension Keeps the Donor Roster `[SURFACE]`

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a suspended member with an available restoration path,
I want to remain on the donor roster so I can make the contributions that restore me,
so that the Niyamavali's primary restoration path is actually reachable.

## The principle — the *why*, recorded explicitly

> **A suspension removes a member's entitlement to RECEIVE support, not their obligation to
> CONTRIBUTE toward the Pariwar while completing an available restoration path.**

This is a **constitutional correction, not a feature.** Niyamavali §3.3 states that discipline
consequences affect standing and beneficiary eligibility, never the ability to participate — *"A
member in lock-in remains a member and may continue to contribute."* The codebase **already honours
this for lock-in** (`VALID_STATES` includes `'lock-in'`). Story 10.10 did the opposite for
suspension, and the five-fact chain that follows makes every suspension a de-facto permanent ban:

| # | Fact | Source (verified live at baseline) |
|---|---|---|
| 1 | Suspension sets `is_valid: false` | `packages/validity-service/src/payload.ts:71-78` |
| 2 | Pool assignability is `is_valid` **and nothing else** | `apps/jobs/src/assignable-roster.ts:52` |
| 3 | A member off the roster is told they have no pool | `apps/api/src/modules/payment/handlers.ts:118,123,262` → `{ available: false, reason: 'unassigned' }` |
| 4 | **No contribution path exists outside an assigned pool** — and a CI fence asserts the absence of one | Story 8.10 / `pool-bound-payment-invariant` gate |
| 5 | R7(A) restoration = 3 **consecutive contributions** | Niyamavali §3.1, §8.3; PRD FR-56 |

**⇒ Six of the seven R7 restoration clauses can only be cleared by contributing, and all six are
unreachable today.** This story is the one line that reopens them.

## `[GATE]` — discharged, and what that means precisely

> **`epics.md:3681` — Story 10.17 MUST NOT deploy without Story 10.16.**

**Story 10.16 is `done` (merged at `7e59f3d`, PR #167). The gate is satisfied.** Do not re-litigate
it, and do not re-implement the disclosure.

But understand exactly what "satisfied" means, because it creates a task for *this* story:

- The contribution-during-suspension disclosure is **built and test-proven**.
- It has **never rendered on a live path.** `is_valid: false` keeps a suspended member off the
  roster, so `/pay` returns `{ available: false, reason: 'unassigned' }` and the disclosure's branches
  are unreachable **by design** (10.16 Escalation 3).
- **This story is the first real-path validation of that disclosure.** 10.16's Escalation 3 names
  10.17's dev agent as the one who must confirm it renders live. That is **AC6** here, and it must be
  recorded honestly — attested if you ran it, un-attested if you did not
  (`[[feedback_record_unattested_no_backfill]]`). Never backfill.

---

## Scope Boundary (read first — prevents over-build AND under-build)

**10.17 owns NO new state.** No table, no migration, no new event type, no new projector, no new
route, no new permission key. `PERMISSION_CATALOG_VERSION` stays **28**. It adds **one pre-derived
boolean field** to an existing payload and switches **one read** to it.

The whole logic change is **~1 real line**. Everything else is the discipline around it: the
invariant amendment, the regression suite that currently asserts the *old* behaviour, the replay pin,
and the honest reconciliation of every comment that says "suspension is folded into `is_valid`."

| In scope (10.17) | Out of scope → owning story / seam |
|---|---|
| **`deriveIsAssignable(state, moderationStatus)`** beside `deriveIsValid` in `packages/validity-service/src/payload.ts`, wired at the `assemblePayload` composition. | Any change to `deriveIsValid` / `VALID_STATES` / `ACTIVE_STATES`. `is_valid` keeps its exact current meaning (coverage). Only the **roster** switches fields. |
| **`isAssignable` on the payload type + the wire DTO** — `validity-service/src/types.ts`, `contracts/src/members/validity.ts`, and a regenerated `openapi/v1.yaml`. | A new endpoint, a new response envelope, or the field on `ContributionIntentResponse` / `NomineeAccountsResponse`. It belongs on the one canonical validity payload. |
| **`apps/jobs/src/assignable-roster.ts:52`** reads the new field; the frozen-invariant doc block at `:40-49` is **rewritten as an amendment**. | **Any eligibility logic entering `apps/jobs`.** The roster reads **one pre-derived field** — that is what AI-7-2 exists to protect and it is preserved exactly. |
| **Correcting the wrong enforcement-scope claim** at `payload.ts:44-52` (it asserts claim eligibility + the rules engine inherit suspension through `is_valid`; neither reads it). | Changing claim eligibility or the niyamavali engine. The comment is wrong; the code is fine. |
| **Inverting the 10.10 regression assertions** that pin the *old* behaviour — chiefly `packages/validity-service/tests/integration/moderation-validity.spec.ts:243-262`. | **Deleting** them. See D2 — a deleted test is how this story silently loses its own proof. |
| **A replay-determinism pin** (Tier 3): a moderation event occurring *after* a frozen `committed_at` must not change the roster resolved *at* that instant. | Bumping `POOL_ASSIGNMENT_HASH_VERSION`. See D3 — the roster is an **input**, not the algorithm; a bump would break replay of every already-frozen cycle. |
| **Tier-2 reconciliation** — pool-spawn comments, the Story 8.6 yogdaan-status posture, the Story 8.8 alert posture. | New member-facing copy on the payment surface (Story 10.16 shipped it) or branching the alert builders on moderation (D4 — explicitly rejected). |
| **Confirming the 10.16 disclosure renders on the now-live path** (AC6). | Changing `packages/ui/src/contribution-disclosure/*` or `apps/mobile/components/active-contribution/SuspensionDisclosure.tsx`. If the disclosure needs a change to render, that is a **finding**, not a licence to edit. |
| **The AI-7-2 amendment record** + updating `[[project_assignability_predicate_is_isvalid_only]]`. | The Trustee Panel role (10.18), termination auth-block (10.19), record model (10.20), appeal (10.22), restoration lock-in (10.23), contribution-fact producer (10.24). |

---

## Reviewer checkpoint — the two-question test

This story introduces **the first divergence between two booleans that were previously one.** From
here on, a member can be `is_valid: false, is_assignable: true`. That is a permanent, deliberate
feature of the model — and it means every read of either boolean now carries a claim about *which
question it is answering*.

**Apply this to every site that touches either field — in this PR and in every review after it:**

> **Every consumer of `is_valid` must be able to answer: *"am I talking about COVERAGE?"***
> **Every consumer of `is_assignable` must be able to answer: *"am I talking about DONOR-ROSTER
> ELIGIBILITY?"***
> **If neither question is obviously true at the call site, the wrong boolean is probably being used.**

Worked examples:

| Site | Question it is answering | Correct field |
|---|---|---|
| "Is this member covered for support if death today?" | coverage | `is_valid` |
| "Should this member be assigned to a contribution pool?" | roster | `is_assignable` |
| "Should the member-status headline say *active*?" | coverage | `is_valid` (unchanged) |
| "Should this member receive a contribution alert?" | roster (indirectly — via pool membership) | neither; read the pool |
| "Is this member's contribution confirmed?" | neither — it is a fact about the *contribution* | neither (D6) |

The tell-tale for a wrong read is a call site where the answer is *"both, I suppose"* — that is a site
written when the two were fused, and it now needs an owner to state which it meant. Escalation 1 lists
the two such sites known at authoring time; if you find a third, **raise it, do not silently repoint
it.**

---

## Acceptance Criteria

### AC1 — The assignability predicate is a single, reason-code-blind derivation

**Given** D3 (Sprint Change Proposal 2026-08-04) + Niyamavali §3.3
**When** the assignability predicate is derived
**Then** `is_assignable = VALID_STATES.includes(state) && moderationStatus !== 'terminated'` — a
**single predicate, no reason-code branching**. A `suspended` member is assignable regardless of which
of the seven reason codes was recorded; a `terminated` member never is.
**And** `is_valid` keeps its current meaning (**coverage** — "covered for support if death today";
suspended → `false`). Only the **roster** switches fields. `deriveIsValid`, `deriveIsActive`,
`VALID_STATES` and `ACTIVE_STATES` are byte-unchanged, and a diff on any of them is a review finding.

### AC2 — AI-7-2 is amended, not violated: the roster still reads ONE pre-derived field

**Given** the AI-7-2 frozen invariant
**When** `apps/jobs/src/assignable-roster.ts:52` reads the new field
**Then** `isMemberAssignable` returns **exactly `payload.isAssignable`** — one field, no conjunction,
no subfield inspection, **no eligibility logic in `apps/jobs`**. The instruction that a reviewer treat
any *other* subfield read on this path as a finding survives verbatim, retargeted at the new field.
**And** the frozen-invariant doc block at `:40-49` is **rewritten** to record this as an **amendment
to AI-7-2, not a violation**, naming what changed (which single field) and what did not (that it *is*
a single pre-derived field).
**And** the wrong enforcement-scope claim at `packages/validity-service/src/payload.ts:44-52` is
corrected in the same pass: it asserts that "pool assignability, claim eligibility and the rules
engine ALL inherit suspension with NO code change" — **only the first was ever true**, and after this
story it is true through `is_assignable` rather than `is_valid`. Claim eligibility runs the human
R5/R8 ladder and the niyamavali engine produces *inputs to* the payload; neither reads `is_valid`.

### AC3 — Tier 1: the field crosses the wire, and the OpenAPI prose is corrected

**Given** Tier 1 (the five files named by the Sprint Change Proposal §2.4)
**Then** `packages/validity-service/src/payload.ts` adds `deriveIsAssignable` and wires it into
`assemblePayload`'s `withoutHash` object; `packages/validity-service/src/types.ts` adds
`isAssignable: boolean` to `MemberValidityPayload` with a doc comment naming it the **roster**
predicate (vs `isValid` = coverage); `packages/contracts/src/members/validity.ts` adds
`isAssignable: z.boolean()` to `MemberValidityPayloadDto`; and `openapi/v1.yaml` is **regenerated and
committed** via `pnpm contracts:emit-openapi`, with the description prose distinguishing the two
booleans.
**And** `deriveIsAssignable` is exported from `packages/validity-service/src/index.ts` alongside
`deriveIsValid` / `deriveIsActive`.
**And** the field is **NOT** added to `STATE_TRUSTEE_ONLY_FLAGS` or otherwise redacted — a member is
entitled to know they are on the roster; `redaction.ts` is unchanged.

### AC4 — Tier 3: replay determinism is pinned by a test

**Given** `apps/jobs/src/assignable-roster.ts` promises byte-identical re-spawn from a frozen
`committed_at`
**When** the predicate changes
**Then** a test **pins** that a moderation event occurring **after** a frozen `committed_at` does not
change the roster resolved **at** that instant — the resolved member-id list and
`computeAssignableRosterHash(memberSet)` are both byte-identical across two resolutions separated by
the moderation write.
**And** the test additionally pins the new behaviour at the frozen instant: a member suspended
**before** the freeze **is** on the frozen roster, and a member terminated before the freeze is not.
**And** the pin's rationale is recorded: nothing diverges today (no moderation event predates any
frozen cycle), so **the pin exists so that stays true**.

### AC5 — Tier 2: the behaviour that switches on is reconciled, honestly

**Given** Tier 2 (behaviour newly switching on)
**Then** the pool-spawn comments that describe the roster as "keeps `is_valid` members"
(`packages/domain/src/pool/spawn.ts:419`, and the surrounding AI-7-2 notes) are corrected to name
`is_assignable`.
**And** the Story 8.6 yogdaan status derivation
(`packages/domain/src/contribution/history.ts` `deriveContributionStatus`) is confirmed
**moderation-blind** and **left unchanged** — a suspended member's confirmed contribution renders
green, and that is correct: the contribution *happened*. A test pins that the derivation takes no
moderation input.
**And** the Story 8.8 contribution-alert posture is recorded per **D4**: a suspended member on the
roster **receives contribution alerts, and that is the cure working**. The alert builders remain
moderation-blind; the member-facing explanation is the Story 10.16 disclosure on the payment surface,
not the push notification.

### AC6 — Reachability is proven end to end, and the 10.16 disclosure is confirmed on a live path

**This AC carries two proofs with different owners. Do not merge them.**

**AC6a — PRIMARY PROOF (this story's responsibility): a suspended member reaches `/pay`.**
**Given** the roster unblock
**When** the chain runs end to end
**Then** a live-DB integration test proves: a **suspended** member is `is_assignable: true`, appears
in the resolved assignable roster, lands in `pool_snapshots.member_assignments`, and the
nominee-accounts read returns `available: true` **rather than** `{ available: false, reason:
'unassigned' }`.
**This is what 10.17 owns and must prove.** It is a statement about *reachability*.

**AC6b — SECONDARY PROOF (confirmation only): the shipped 10.16 disclosure renders unchanged.**
**Given** 10.16 Escalation 3 — the disclosure has only ever been proven at test level, because no
suspended member could reach `/pay`
**When** the exact validity payload such a member now receives is fed into
`deriveContributionDisclosure(...)` (`@twt/ui`)
**Then** it yields a **non-null** view-model with `instrument: 'suspension'` — the guard firing on
**real payload data**, not a hand-built fixture.
**This is a confirmation that 10.17 made the disclosure reachable — NOT a re-verification of 10.16's
presenter.** The correctness of the disclosure's copy, arms, precedence and view-model shape was
established and reviewed under 10.16 and is **not re-opened here**. If AC6b fails, the finding is
*"10.17 did not deliver the payload 10.16 was built against"* until proven otherwise — investigate
the payload first, and see Anti-pattern 7.

**And (both):** whether a human/emulator run of `/pay` was actually performed is recorded
**explicitly** in the Dev Agent Record as attested or un-attested. **Do not imply a device run that
did not happen** (`[[feedback_record_unattested_no_backfill]]`). AC6a and AC6b are both provable
without a device; a device run would additionally attest pixels, which neither AC claims.

### AC7 — The 10.10 regression suite is corrected, never deleted

**Given** the shipped Story 10.10 tests assert the behaviour this story deliberately reverses
**When** those assertions fail
**Then** each one is **rewritten to assert the new invariant**, keeping its name, comment and
intent — *never* deleted, `.skip`ped, or weakened. Minimum set (verified present at baseline):
- `packages/validity-service/tests/integration/moderation-validity.spec.ts:243` — *"a suspended
  member drops out of assignability through `is_valid` ALONE"* → becomes *"a suspended member stays
  assignable through `is_assignable`, while `is_valid` still drops"*, with the local predicate
  replica updated to `(p) => p.isAssignable` and a **terminated** case added.
- `…moderation-validity.spec.ts:168` — the byte-identical-lifecycle-fields test gains `isAssignable`
  to its explicitly-allowed-to-move set for termination and its **must-not-move** set for suspension.
- `apps/api/tests/integration/member-moderation/member-moderation.spec.ts:15-16` — the header comment
  claiming *"a suspended member drops out of the assignable roster with NO roster change"* is
  corrected.
**And** every test fixture that constructs a full `MemberValidityPayloadDto` / `MemberValidityPayload`
compiles — the DTO is `.strict()` and the type is not `Partial`.

---

## Decisions

### D1 — RECOMMENDED. `deriveIsAssignable` lives beside `deriveIsValid`, and the roster reads one field. ⭐

`payload.ts:31-38` already declares itself *"the SINGLE source of that mapping: refining what counts
is a one-line edit here, ZERO engine/rule change."* The new predicate belongs in exactly that block,
with exactly that shape:

```ts
/**
 * `is_assignable` = the DONOR-ROSTER predicate (Story 10.17). A covered lifecycle state AND not
 * TERMINATED — a suspended member stays on the roster because suspension removes the entitlement to
 * RECEIVE support, never the obligation to CONTRIBUTE while completing a restoration path
 * (Niyamavali §3.3).
 *
 * Deliberately NOT `is_valid`: the two answer different questions and must be free to diverge.
 *   · is_valid     — "covered for support if death today" (coverage)
 *   · is_assignable — "may be assigned to a contribution pool"   (roster)
 * A suspended member is `is_valid: false, is_assignable: true`. That divergence IS the story.
 *
 * No reason-code branching, ever: the seven codes establish the GROUND, never the roster
 * consequence. A per-code roster rule would relocate a governance decision into a derivation.
 */
export function deriveIsAssignable(
  state: member.MemberLifecycleState,
  moderationStatus: member.moderation.ModerationStatus = 'none',
): boolean {
  return VALID_STATES.includes(state) && moderationStatus !== 'terminated';
}
```

**Rejected alternatives, and why:**

- **(a) Widen `VALID_STATES` / relax `deriveIsValid` so suspended members stay valid.** This is the
  tempting one-liner and it is *catastrophic*: `is_valid` is the coverage answer the member-status
  panel, the verifier-console signals panel and the FR-12A contract all render. Making a suspended
  member "valid" tells them they are covered when they are not — the exact class of falsehood Story
  10.16 exists to prevent.
- **(b) Add a moderation predicate inside `assignable-roster.ts`** (e.g. `payload.isValid ||
  isSuspendedNotTerminated(payload.specialFlags)`). This is the AI-7-2 violation. It forks eligibility
  logic into `apps/jobs`, requires parsing the flag protocol in a job, and is precisely what the
  invariant was frozen to prevent. The invariant survives *because* the new field is pre-derived.
- **(c) A separate `rosterEligibility` sub-object.** Over-modelled for one boolean, and it would
  change the payload shape more than necessary — every added key widens the replay-hash surface.

### D2 — ⭐ THE MOST IMPORTANT DECISION IN THIS STORY. The failing tests ARE the proof.

> **A failing test here demonstrates the constitutional change. Rewrite the assertion; preserve the
> historical intent. Never delete it.**

Read that sentence again before you touch a test file. Four shipped test bodies currently assert,
correctly and deliberately, the behaviour this story reverses. **They will go red. That is the story
working, and it is the single clearest evidence that the correction actually landed.**

**The instinct this decision exists to override.** A developer — human or agent — who sees a red test
after a one-line change reaches for the delete key, or for `.skip`, or waters the assertion down until
it passes. Here that instinct destroys the only artifact that records *what changed and why*. A green
suite reached by deletion is indistinguishable from a green suite reached by correctness
(`[[feedback_gate_scope_semantic_coverage]]` — a green scan proves nothing), and the next engineer
reading `git log -p` on that file cannot tell a governance amendment from a coverage regression.

**The required treatment, per test:**
- **Keep the test.** Same file, same `describe`, same `it` position.
- **Keep the name's shape** — it should read as the *same question, newly answered*: *"a suspended
  member drops out of assignability through `is_valid` ALONE"* → *"a suspended member STAYS assignable
  through `is_assignable`, while `is_valid` still drops."*
- **Rewrite the comment block, not just the expectation.** The comment is where the old invariant is
  stated in prose; leaving it while flipping the `expect` produces a test that contradicts itself.
- **Preserve the intent.** Each of these tests was written to catch a specific regression. After the
  rewrite it must still catch *a* regression — usually the mirror-image one. A rewrite that asserts
  nothing (e.g. dropping the terminated case because it is now the only `false` arm) has lost the
  test's purpose even though the file still contains it.

**The single most important one is `moderation-validity.spec.ts:243`.** Its comment block *is* the
frozen AI-7-2 statement in test form. Rewriting it — comment included — is how the amendment gets
recorded in the one place the next reader will actually look. **Reviewers will rely on this:** a diff
showing that test *deleted* rather than *rewritten* is, on its own, sufficient grounds to reject the
PR.

### D3 — RATIFIED HERE. Do NOT bump `POOL_ASSIGNMENT_HASH_VERSION`.

`packages/domain/src/pool/assign.ts:55` pins `'v1'`, and `:131` states the bump rule precisely: bump
**iff the algorithm changes members' pools for the SAME roster.**

This story changes **which members are in the roster**, not how a roster is hashed into pools. The
roster is an **input**. A bump would:
- invalidate the frozen vectors at `packages/domain/tests/pool/assign.test.ts:232-237`, and
- **break replay of every already-frozen cycle** — the version is stamped into each
  `pool.spawned` event as `assignment_hash_version`.

`computeAssignableRosterHash(memberSet)` already fingerprints the roster content per cycle, which is
exactly the right place for this change to be observable. **Leave `'v1'` alone.** If a dev agent finds
itself editing `assign.ts`, it has left the story.

### D4 — RECOMMENDED, needs recording. The Story 8.8 alert copy stays moderation-blind.

`epics.md:3705` says *"a suspended member receiving a contribution alert is the cure working, and the
copy must say so."* Read literally, that could mean branching the alert copy on moderation status.
**Do not.** Ship the reconciliation as a recorded posture, not as new alert copy:

1. **Privacy.** A push notification renders on a lock screen, in front of whoever is holding the
   phone. Sanction status is a bounded-but-sensitive standing; the moderation reason code reaching a
   *member-authenticated* surface (10.10/10.16 precedent) is not a licence to put it on a lock screen.
2. **Architecture.** `buildCycleOpenAlert` / `buildDeadlineReminderAlert`
   (`apps/jobs/src/scheduler/contribution-notify-triggers.ts:291`, `:324`) take pool identity, locale
   and clock — nothing member-status-shaped. Threading a moderation read into a 4L-scale fan-out adds
   a per-member validity read to the hot path for a copy variant.
3. **It is already said, in the right place.** The member-facing explanation of *"why am I being asked
   to contribute while suspended"* is the Story 10.16 disclosure, rendered **on the payment surface,
   before they can act**. AC1 of 10.16 is explicit that this is a payment-surface concern.

**What "reconciled" therefore means here:** the *comments and story record* stop claiming suspended
members are excluded from the contribution loop, a test pins that the alert builders take no
moderation input, and the posture is written down so the next reader does not re-open it. If BigDev
wants suspension-aware alert copy, it is a separate, deliberate decision — flag it, do not build it.

### D5 — NEW. An accepted DEPLOYMENT-COMPATIBILITY WINDOW — not a functional defect.

> **⚠ DEPLOYMENT NOTE — belongs in the release/deploy record, not only in the code.**
> For up to **60 seconds** after this story deploys, `GET /api/v1/member/validity` may return **500**
> for members with a warm pre-deploy cache row. This is a **schema-rollout compatibility window,
> inherent to adding a required field to a cached, strictly-parsed payload.** It is **accepted**, it is
> **self-healing**, and it is **not a bug to fix inside this story.**
>
> **Explicitly out of scope:** adding a payload-version/shape component to the validity cache key. That
> is a real design change to a frozen Story 4.8 mechanism, taken for a 60-second transient. If a future
> engineer proposes it while implementing or reviewing 10.17, the answer is **no — raise it as its own
> item** (see Escalation 2). Likewise do not make `isAssignable` optional in the DTO to dodge the
> window: an optional roster predicate is a correctness hole that outlives the deploy by years.

Adding a **required** field to a `.strict()` response DTO interacts with the Story 4.8 cache-aside in
a way worth stating before it surprises someone in production:

- `member_validity_cache` stores the **full serialized payload** as JSONB
  (`packages/domain/src/schema/member_validity_cache.ts`).
- The cache key is `(member_id, member_state_hash, rule_registry_version, cohort_invalidation_epoch)`
  — **there is no payload-shape/version component** (`validity-cache/store.ts:83-97`).
- `fastify-type-provider-zod`'s `serializerCompiler` **parses the response**
  (`apps/api/src/plugins/zod-openapi/index.ts:25`). A cached pre-deploy payload lacking `isAssignable`
  → a required-field parse failure → **500 on `GET /api/v1/member/validity`**.

**The window is bounded and self-healing:** `VALIDITY_CACHE_TTL_SECONDS = 60`
(`packages/domain/src/validity-cache/constants.ts:20`), and the read is `computedAt > now() - 60s`,
so every stale-shaped row is a miss within a minute of deploy.

**Required handling:** accept the window, and **write it into the Dev Agent Record AND the deploy
note** as an accepted compatibility window with its bound (60s) and its mechanism (TTL expiry) stated.
If a deploy wants the window closed to zero, the lever already exists and needs no code:
`POST /api/v1/p/:pariwarId/admin/validity-cache/invalidate-all`
(`apps/api/src/modules/member-validity/handlers.ts` → `bumpCohortEpoch`), run per Pariwar immediately
after rollout. That is an **operational** choice, made at deploy time; it is not a code change and not
a condition of this story.

Note the **assignable roster itself is unaffected**: `assignable-roster.ts` deliberately uses
`getValidityAt`, never `getValidityCached` (its own doc block explains why), so pool spawn never reads
a cached payload.

### D6 — Shipped precedent, verified. Story 8.6's yogdaan status is already correct; pin it, don't touch it.

`deriveContributionStatus` (`packages/domain/src/contribution/history.ts:113-128`) takes
`{ confirmed, held, mismatch, alertClosed }` and **nothing member-status-shaped**. A suspended member
whose contribution is confirmed therefore renders **green**, beside a suspended standing.

**That is correct and must not be "fixed".** The green states a fact about the *contribution*
(matched to bank records), not about the member's standing. Colouring it differently for a suspended
member would be the passbook editorialising about a sanction — and would make the restoration path
invisible to the very member completing it. AC5 asks for a **pin**, not a change.

---

## Tasks / Subtasks

### Task 0 — Orient, and confirm nothing shifted under you (AC: all)

- [x] `git fetch origin` and branch off `main` at `7e59f3d` — never commit to `main`
      (`[[feedback_git_fetch_before_remote_reasoning]]`, `[[project_story_automator_ops]]`).
- [x] Read, in this order, before writing a line:
      `packages/validity-service/src/payload.ts` (lines 31-108 and 275-300),
      `apps/jobs/src/assignable-roster.ts` (whole file — it is short and every paragraph is load-bearing),
      `packages/validity-service/tests/integration/moderation-validity.spec.ts` (lines 160-262).
- [x] Confirm the five Tier-1 anchors still resolve: `payload.ts` `deriveIsValid` ~`:71`, the
      `assemblePayload` `isValid:` line ~`:290`, `types.ts` `isValid:` ~`:167`,
      `contracts/src/members/validity.ts` `isValid:` ~`:111`, `assignable-roster.ts:52`. If any moved,
      note it in the Dev Agent Record and proceed — the anchors are navigational, not normative.
- [x] Run `pnpm ci:local` **once at baseline** and record the result. Some live-DB failures are
      documented-innocent flakes (`[[project_known_livedb_test_failures]]`,
      `[[project_ci_local_concurrency_oversubscription]]`); knowing the baseline is what lets you tell
      them apart from your own regressions later.

### Task 1 — `deriveIsAssignable` + the corrected enforcement-scope comment (AC: 1, 2, 3)

- [x] Add `deriveIsAssignable` to `packages/validity-service/src/payload.ts`, immediately after
      `deriveIsValid`, with the doc comment from D1 (the two-questions contrast is the load-bearing
      part — a future reader must not "simplify" the two booleans back into one).
- [x] Wire it into `assemblePayload`'s `withoutHash` object beside `isValid` / `isActive`, using the
      same `moderation.status` already resolved there. **Field order matters for the canonical hash**
      — place `isAssignable` immediately after `isActive` and keep the object literal, the type and
      the DTO in the same order.
- [x] **Rewrite** the Story-10.10 Decision-8 comment block at `payload.ts:44-52`. It currently claims
      pool assignability, claim eligibility and the rules engine all inherit suspension through
      `is_valid`. Replace with the accurate statement: `is_valid` is **coverage**; `is_assignable` is
      the **roster**; the roster is the only consumer that was ever reached by that edit; claim
      eligibility (human R5/R8 ladder) and the niyamavali engine do **not** read `is_valid` at all.
      Keep the "⚠ DO NOT add a moderation predicate to …" warning — retarget it at the new field.
- [x] Export `deriveIsAssignable` from `packages/validity-service/src/index.ts` next to
      `deriveIsValid` / `deriveIsActive`.
- [x] Unit tests in `packages/validity-service/tests/payload.test.ts`, extending the existing
      `describe('is_valid / is_active × moderation status …')` block at `:127`:
      - `none` × each `VALID_STATES` entry → `isAssignable: true`
      - `suspended` × each `VALID_STATES` entry → `isValid: false`, **`isAssignable: true`**
      - `terminated` × each `VALID_STATES` entry → `isAssignable: false`
      - any non-`VALID_STATES` lifecycle state (e.g. `withdrawn`, `lapsed`, `pending-kyc`) →
        `isAssignable: false` **regardless of** moderation status
      - a **reason-code-blindness** pin: the same status with different reason codes produces an
        identical `isAssignable` (AC1's "no reason-code branching" made testable)

### Task 2 — The wire: type, DTO, OpenAPI (AC: 3)

- [x] `packages/validity-service/src/types.ts` — add `isAssignable: boolean` to
      `MemberValidityPayload` immediately after `isActive`, with a one-line doc comment naming it the
      **roster** predicate and contrasting it with `isValid`'s **coverage** meaning.
- [x] `packages/contracts/src/members/validity.ts` — add `isAssignable: z.boolean()` to
      `MemberValidityPayloadDto` in the same position. **The schema is `.strict()`** — a field present
      in the payload but absent from the DTO fails serialization, and vice versa.
- [x] Update the `MemberValidityPayloadDto` doc comment so the two booleans are distinguishable from
      the OpenAPI alone (that prose is what "OpenAPI regenerates with **corrected prose**" means).
- [x] Regenerate and **commit** `openapi/v1.yaml`: `pnpm contracts:emit-openapi`. Then verify the gate:
      `pnpm --filter @twt/contracts contracts:check-openapi-determinism`.
- [x] `packages/validity-service/src/redaction.ts` — **verify unchanged**. The field is member-visible
      by design; do not add it to `STATE_TRUSTEE_ONLY_FLAGS`. Add a `redaction.test.ts` assertion that
      `isAssignable` survives a narrow-scope redaction.
- [x] Fix every full-payload test fixture that now fails typecheck (all use a base object + `Partial`
      overrides, or a full inline literal): `apps/admin/tests/member-status-panel.test.tsx`,
      `apps/admin/tests/verifier-console.test.tsx`, `packages/ui/tests/member-status/presenter.test.ts`,
      `packages/ui/tests/member-status/moderation.test.ts`,
      `packages/ui/tests/contribution-disclosure/presenter.test.ts`,
      `packages/validity-service/tests/payload.test.ts`. Set the value **truthfully per fixture**
      (a suspended fixture gets `isAssignable: true`) — a blanket `true` would quietly make the
      10.16 fixtures assert something false.
- [x] **`packages/validity-service/tests/redaction.test.ts` and
      `packages/validity-service/tests/determinism-runner.ts` are a DIFFERENT shape — do not lump them
      into the typecheck-fix list above.** Both call `assemblePayload({...})` with an `AssembleInput`
      object (`memberId`, `evaluatedAt`, `memberState`, `lockInStatus`, …), never a
      `MemberValidityPayload`/`Dto` literal directly, and `isAssignable` is *derived output*, not
      required input — they will **not** fail typecheck. Leave them untouched unless you want a
      positive pin that `isAssignable` survives redaction / a determinism run (optional; Task 1's
      `payload.test.ts` additions already cover the derivation itself).

### Task 3 — The roster reads the new field; AI-7-2 is amended (AC: 1, 2)

- [x] `apps/jobs/src/assignable-roster.ts:52` — `return payload.isAssignable;`. Nothing else changes
      in the function.
- [x] **Rewrite the doc block at `:40-49`** as an *amendment record*. It must say, in the file itself:
      - what changed — the single field read is now `is_assignable`, not `is_valid`;
      - **what did not** — it is still exactly ONE pre-derived field, still never a reimplementation
        of eligibility, still never an inspection of `is_active` / lock-in / grace / suspension /
        renewal or any other subfield;
      - **why** — a suspension removes the entitlement to receive support, not the obligation to
        contribute (Niyamavali §3.3); `is_valid` remains the coverage answer and is deliberately no
        longer the roster answer;
      - that this is recorded as an **amendment to AI-7-2, not a violation** (Sprint Change Proposal
        2026-08-04 §2.1, §4f), citing Story 10.17;
      - the surviving reviewer instruction: **any other subfield read on this path is a finding.**
- [x] Update the D1 reference in the `createAssignableRosterResolver` doc comment (step 3 currently
      reads *"keeps the `is_valid` members (D1)"*).
- [x] Update `apps/jobs/tests/assignable-roster.test.ts` — `describe('isMemberAssignable — the D1
      predicate (is_valid ONLY)')` **currently holds two cases**; add the case that carries the whole
      story so the block reaches four total: a payload with `isValid: false, isAssignable: true` **is**
      assignable, and `isValid: true, isAssignable: false` (terminated) is **not**.

### Task 4 — Correct the 10.10 regression suite (AC: 7)

- [x] `packages/validity-service/tests/integration/moderation-validity.spec.ts`:
      - `:243` — rewrite the test **and its comment block** per D2. Local predicate becomes
        `(p: { isAssignable: boolean }) => p.isAssignable`. Sequence: baseline assignable → suspend →
        **still assignable**, `is_valid` false → terminate → **not** assignable → restore → assignable.
      - `:168` — the byte-identical test: under **suspension**, `isAssignable` must be in the
        *unchanged* set (it stays `true`); add a mirrored case where **termination** flips it.
      - `:1-15` — correct the file header, which states the concentration claim
        ("`apps/jobs/src/assignable-roster.ts` reads `payload.isValid` and NOTHING else").
      - `:201` (the stale-cache test) — keep it, and extend the post-suspend recompute assertion with
        `isAssignable === true`, so the "worst failure mode" test also covers the new field.
- [x] `apps/api/tests/integration/member-moderation/member-moderation.spec.ts:15-16` — correct the AC5
      header comment.
- [x] Grep the repo for prose asserting the old invariant and correct what you find (at minimum:
      `packages/domain/src/pool/spawn.ts:419`, `apps/jobs/tests/assignable-roster-live.test.ts:7`).
      **Not `pool/assign.ts:30-34`** — that block is D4's verdict-blind design note and contains no
      `is_valid`/`is_assignable` prose to correct (confirmed: zero occurrences in the file); its only
      AI-7-2-tagged comment is the typed-throw rationale at `:181-182`, which is unrelated to the
      roster predicate and does not need touching. Comments that state a now-false invariant are how
      the next story re-derives the defect.

### Task 5 — The replay-determinism pin (AC: 4)

- [x] Add the pin to `apps/jobs/tests/assignable-roster-live.test.ts` (live-DB, `:5433`,
      `describe.skipIf(!hasDatabase)` — the existing harness already seeds members, a
      `cycle_freeze_commits` row and drives the **real** `createAssignableRosterResolver`).
- [x] The pin, precisely:
      1. seed members and a cycle freeze at `committed_at = T`;
      2. resolve the roster at `T` → capture the member-id list **and**
         `poolDomain.computeAssignableRosterHash(list)`;
      3. append a `member.moderation.suspended` event for one roster member **at a time after `T`**;
      4. resolve at `T` again → **byte-identical list and hash**.
- [x] Plus the at-instant behaviour: a member suspended **before** `T` **is** on the frozen roster
      (the new invariant); a member terminated before `T` is **not**.
- [x] Record in the test comment *why* it exists: nothing diverges today because no moderation event
      predates any frozen cycle (10.10 shipped 2026-08-03) — **the pin exists so that stays true.**
      `getValidityAt` resolves the moderation overlay at the pinned instant alongside
      `getMemberStateAt` (`validity-service/src/service.ts:93-99`), which is the mechanism that makes
      the pin pass; say so, so a future edit that moves the overlay read to `now()` fails here loudly.

### Task 6 — Tier-2 reconciliation (AC: 5)

- [x] Correct the pool-spawn comments identified in Task 4's grep.
- [x] Add a pin for D6 in `packages/domain/tests/contribution/history.test.ts` (beside the existing
      `deriveContributionStatus` tests): the derivation's input type carries no moderation/validity
      field, and a `confirmed` contribution yields `'green'` irrespective of anything member-standing
      shaped. Assert **structurally** (the input shape), not just behaviourally.
- [x] Add a pin for D4 in `apps/jobs/tests/contribution-notify-triggers.test.ts`: `buildCycleOpenAlert`
      and `buildDeadlineReminderAlert` take no moderation input and produce byte-identical alerts for
      two members differing only in moderation standing. Comment it with D4's rationale, so the
      "the copy must say so" line in the epic is visibly *answered*, not ignored.
- [x] Record D4's posture in `_bmad-output/implementation-artifacts/deferred-work.md` — suspension-
      aware alert copy is **considered and deliberately not built**, with the privacy + hot-path
      reasoning, so it reads as a decision rather than an omission.

### Task 7 — Reachability (AC6a), then disclosure confirmation (AC6b)

**Write these as two clearly-labelled assertions, in this order.** AC6a is what 10.17 owes; AC6b is a
confirmation that rides on it.

- [x] **AC6a — the primary proof.** Add a live-DB integration spec proving reachability end to end.
      The natural home is `apps/jobs/tests/assignable-roster-live.test.ts` for the roster half and an
      `apps/api` integration spec for the surface half; one spec covering both is acceptable if it
      stays readable.
      1. seed an active member, suspend them (real event path), freeze a cycle, spawn;
      2. assert the member **is** in `pool_snapshots.member_assignments`;
      3. assert `GET /api/v1/member/validity` for that member returns `isValid: false`,
         `isAssignable: true`, and `specialFlags` containing `suspended_per_<code>`;
      4. assert the nominee-accounts read returns `available: true` — **not**
         `{ available: false, reason: 'unassigned' }`.
- [x] **AC6b — the confirmation.** Feed that **real** payload (not a fixture) into
      `deriveContributionDisclosure` (`@twt/ui`) and assert a non-null view-model with
      `instrument: 'suspension'`. Label the assertion in the test as *confirming reachability of the
      Story 10.16 disclosure*, so a future reader does not mistake it for a re-test of 10.16.
- [x] **Do not modify** `packages/ui/src/contribution-disclosure/*` or `SuspensionDisclosure.tsx`.
      10.16's presenter is shipped and reviewed; its correctness is **not re-opened here**. If AC6b
      returns `null`, the working hypothesis is *"10.17 did not deliver the payload 10.16 was built
      against"* — investigate the payload, then **report it as a finding**. Editing 10.16 to make this
      story's AC pass is Anti-pattern 7.
- [x] Record the attestation honestly in the Dev Agent Record: state plainly whether an emulator/device
      run of `/pay` was performed. AC6a and AC6b are both provable **without** a device; if no device
      run happened, say **un-attested** and carry it as a risk
      (`[[feedback_record_unattested_no_backfill]]`). The `apps/mobile` render fence remains a
      comment-stripped source scan — 10.16 Escalation 2 (no RN mount harness) is **not** discharged
      here and must not be attempted in this story.

### Task 8 — Governance records (AC: 2)

- [x] `.decision-log.md` — one entry recording the **AI-7-2 amendment** (assignability stops being
      `is_valid` alone; the roster still reads one pre-derived field), using the file's existing
      template, citing Sprint Change Proposal 2026-08-04 §4f and this story. **This is not a blank-slate
      entry** — Decision 2026-08-04-072 already exists, scoped exactly this work, and named the anchors
      (`assignable-roster.ts:41-53`, `payload.ts:77,290`, `types.ts:167`,
      `contracts/src/members/validity.ts:111`) as its open follow-up. Resolve that follow-up (mark it
      done, naming the actual PR/commit) rather than duplicating it as an unrelated new entry.
- [x] Update the memory note `[[project_assignability_predicate_is_isvalid_only]]` — it already
      carries the "AMENDED 2026-08-04 … not yet shipped" annotation; flip it to **shipped**, naming
      the field and this story.
- [x] **The deployment note (D5).** Record the ≤60s cache-shape compatibility window in the Dev Agent
      Record **and** wherever this repo carries deploy notes for a release, stating: the bound (60s),
      the mechanism (validity-cache TTL expiry), that it is an **accepted schema-rollout window and not
      a functional defect**, and the optional zero-window operational lever
      (`validity-cache/invalidate-all` per Pariwar, post-rollout). Explicitly note that a
      payload-version cache key was **considered and rejected for this story**, so the next engineer
      does not re-open it as a bug.
- [x] **Architecture — do NOT amend `architecture.md`.** This is settled, not a judgment call:
      **Decision 2026-08-04-072** already ruled *"no `architecture.md` amendment is performed [for the
      §4f items]... and none is required going forward under this convention"* — the canonical
      implementation record for this amendment is the **AI-7-2 doc-comment rewrite itself**
      (`assignable-roster.ts` + `payload.ts`), not a spine document. `architecture.md` was frozen before
      Epic 4 and carries zero `MemberValidityPayload`/`AI-N-M` references; do not invent a
      payload-field-inventory section to hold this. **Close out Decision 072's open follow-up** (the
      bullet beginning *"Story 10.17 dev-story: write the `is_assignable` predicate..."*) by editing
      `.decision-log.md` to mark that specific line resolved-by-this-story, rather than authoring a
      disconnected new entry for the AI-7-2 amendment.

### Task 9 — Validate (AC: all)

- [x] **Apply the two-question test to your own diff** (see *Reviewer checkpoint*). Walk every site
      this PR touches that reads `isValid` or `isAssignable` and confirm the call site obviously
      answers *coverage* or *roster*. Record any site where the honest answer was *"both"* — that is a
      finding for its owner, not something to repoint silently.
- [x] `pnpm turbo run typecheck` — the `.strict()` DTO + non-`Partial` type make this the fastest way
      to find every unfixed fixture.
- [x] `pnpm turbo run lint`, `pnpm turbo run test`.
- [x] `pnpm --filter @twt/validity-service test:determinism` — the P0 replay gate. It asserts **one
      distinct hash across 100 threads**, not a golden value, so a new field is expected to keep it
      green. If it goes red, you have introduced order-nondeterminism, not a hash change.
- [x] `pnpm --filter @twt/contracts contracts:check-openapi-determinism` — fails if `openapi/v1.yaml`
      was not regenerated **and committed**.
- [x] `pnpm ci:local` against the live test DB on `:5433`
      (`[[project_ci_actions_suspension_local_mirror]]`). Compare against your Task-0 baseline; confirm
      any failure in isolation before attributing it to this story
      (`[[project_known_livedb_test_failures]]`, `[[project_ci_local_concurrency_oversubscription]]`).
      **This story touches a payload shape read by live-DB specs**, so unlike 10.16 a live-DB failure
      here is *not* presumptively innocent — check each one.
- [x] Note: `git push` runs the full `ci:local` via a pre-push hook — the apparent "hang" is that, not
      credentials (`[[project_friction_budget_baseline_ratchet]]`).

### Review Findings

_bmad-code-review, three parallel layers (Blind Hunter diff-only, Edge Case Hunter diff+project-trace,
Acceptance Auditor diff+spec+live verification), 2026-08-05. 14 raw findings → 6 patch, 3 defer, 5
dismissed as noise or verified-fine, 0 decision-needed._

- [x] [Review][Patch] Story doc File List header says "Tests (11)" but 14 files are actually listed [_bmad-output/implementation-artifacts/10-17-moderation-roster-unblock.md:961] — fixed, header now reads "Tests (14)"
- [x] [Review][Patch] Story doc header "Source, prose-only corrections (4)" but 5 files are listed [_bmad-output/implementation-artifacts/10-17-moderation-roster-unblock.md:958] — fixed, header now reads "(5)"
- [x] [Review][Patch] Escalations numbered out of authoring order (3, then 5, then 4) [_bmad-output/implementation-artifacts/10-17-moderation-roster-unblock.md:808] — fixed, Escalation 4 block moved before Escalation 5; numbers unchanged (both are referenced elsewhere) so file now reads 1→2→3→4→5
- [x] [Review][Patch] D4 "byte-identical" behavioral test's comment overclaims what it proves — M1/M2 are opaque memberIds with no moderation-status semantics; the assertion only re-proves memberId-invariance, already established by the structural test above it [apps/jobs/tests/contribution-notify-triggers.test.ts:870] — fixed, comment + `it` title rewritten to claim only what the test proves; suite re-run, 66/66 pass
- [x] [Review][Patch] `deriveIsAssignable.length` assertion doesn't verify what its comment claims ("no 3rd arg") — `moderationStatus` has a default value so `.length` is 1, not 2, and stays 1 even if a genuine 3rd arg were added [packages/validity-service/tests/payload.test.ts:198] — fixed, assertion tightened to `toBe(1)` with a comment explaining the `.length`/default-param limitation; suite re-run, 91/91 pass
- [x] [Review][Patch] `moderation/index.ts`'s corrected comment re-duplicates `payload.ts`'s enforcement-scope prose near-verbatim — the exact duplication pattern that caused the stale comment this story just fixed [packages/domain/src/member/moderation/index.ts] — fixed, comment trimmed to point at `assignable-roster.ts`'s doc block as the canonical amendment record instead of repeating the rationale; `@twt/domain` typecheck clean
- [x] [Review][Defer] Escalation 5's "wider gap" (other shipped DTOs likely also unregistered in `emit-openapi.ts`) has zero mechanized enforcement (no test/lint/TODO) [packages/contracts/scripts/emit-openapi.ts] — deferred, pre-existing; already named as future re-trigger in Escalation 5
- [x] [Review][Defer] AC3's OpenAPI clause not discharged — `openapi/v1.yaml` stays byte-identical because `emit-openapi.ts` never imports `validity.ts`; confirmed live (`grep -c isValid` → 0) [packages/contracts/src/members/validity.ts] — deferred, pre-existing; already transparently recorded as Escalation 5 + deferred-work.md + decision-log
- [x] [Review][Defer] New coverage for restoring a member from `terminated` → `none` via bare `trustee-discretion`, treated as routine, while Story 10.18 (trustee-panel sanctioning authority) is still `backlog` [packages/validity-service/tests/integration/moderation-validity.spec.ts:345] — deferred, pre-existing transition (Story 10.10's state machine), only newly exercised by this test; worth a look when 10.18 lands

---

## Dev Notes

### The three files you must read before writing a line

1. **`apps/jobs/src/assignable-roster.ts`** (whole file, ~140 lines). Every paragraph of its header is
   a load-bearing invariant, and one of them is the thing you are amending. Read the D1 predicate
   block at `:40-49` and the D2 cache-avoidance paragraph at `:22-30` — the latter is why pool spawn
   is immune to D5's cache hazard.
2. **`packages/validity-service/src/payload.ts:31-108`** — the composition block, `VALID_STATES`,
   `deriveIsValid` / `deriveIsActive`, `moderationSpecialFlag`. Two of these comments are wrong after
   this story; AC2 makes correcting them a requirement, not a courtesy.
3. **`packages/validity-service/tests/integration/moderation-validity.spec.ts:160-262`** — the shipped
   proof of the behaviour you are reversing. Read it before you change it, so the rewrite preserves
   each test's *intent*.

### Current state of the data path, end to end

```
member.moderation.suspended event  (events_log, member stream)
  → member.moderation.getMemberModerationOverlay(db, memberId, at)     ← resolved AT the pinned instant
  → assemblePayload({ memberState, moderationOverlay, … })
      · isValid       = deriveIsValid(state, status)        → false when suspended     (coverage)
      · isActive      = deriveIsActive(state, status)       → false when suspended
      · isAssignable  = deriveIsAssignable(state, status)   → TRUE when suspended  ★ NEW (roster)
      · specialFlags  += `suspended_per_<reason_code>`      (member-visible by design)
  → validityPayloadHash = sha256(canonical(payload − hash − evaluatedAt))

  ├─ apps/jobs (POOL SPAWN):  getValidityAt(…, committedAt, { internal:true })
  │     → isMemberAssignable(payload) → payload.isAssignable          ★ THE ONE READ THAT CHANGES
  │     → spawnChildPool(memberSet) → pool_snapshots.member_assignments
  │
  └─ apps/api (MEMBER SELF-READ):  getValidityCached(…, { caller })
        → redactForCaller (moderation flags survive — payload.ts:96-103)
        → MemberValidityResponse (.strict(), serializer-parsed)
        → apps/mobile useMemberValidityQuery (['member','validity'])
        → deriveContributionDisclosure(payload)  → the Story 10.16 disclosure on /pay
```

Two facts about that diagram deserve emphasis:

- **The spawn path never touches the cache.** `assignable-roster.ts` uses `getValidityAt` (historical,
  never cached) deliberately; `getValidityCached` is a live-`now()`-only path. D5's hazard is confined
  to the member self-read.
- **The moderation overlay is resolved at the pinned instant**, not `now()`
  (`service.ts:93-99`). That is *why* AC4's replay pin passes. If a future refactor moves that read to
  `now()`, a suspension today would retroactively change a past cycle's roster — the pin is the
  tripwire.

### What becomes reachable the moment this lands

A suspended member, previously invisible to the whole contribution loop, now:

| Surface | Before | After |
|---|---|---|
| Pool assignment (7.4 seam) | absent from `member_assignments` | **assigned** |
| `/pay` (nominee accounts) | `{ available: false, reason: 'unassigned' }` | `{ available: true, … }` **with the 10.16 disclosure** |
| Story 8.8 contribution alerts | never fanned out (not in `memberIds`) | **receives them — this is the cure working** (D4) |
| Story 8.6 Yogdaan Bahi | no rows for the cycle | rows; a confirmed contribution renders **green** (D6) |
| Story 8.3 pool contributor list | absent | present once confirmed |
| `is_valid` / coverage | `false` | **`false` — unchanged.** They contribute; they are not covered. |

That last row is the whole moral shape of the story. Nothing here grants coverage.

### Anti-patterns — the seven ways this story goes wrong

1. **Widening `VALID_STATES` or relaxing `deriveIsValid`.** The tempting one-liner; it tells a
   suspended member they are covered. D1(a).
2. **Putting the moderation check in `apps/jobs`.** The AI-7-2 violation. The invariant survives
   *because* the field is pre-derived. D1(b).
3. **Deleting (or `.skip`ping, or watering down) the red 10.10 tests.** They are the proof, not the
   obstacle — a failing test here *demonstrates* the constitutional change. Rewrite the assertion,
   preserve the historical intent. **D2 / AC7 — and a deletion is on its own grounds to reject the PR.**
4. **Bumping `POOL_ASSIGNMENT_HASH_VERSION`.** Breaks replay of every frozen cycle. D3.
5. **Branching alert copy on moderation status.** Puts sanction status on a lock screen and a validity
   read in a 4L fan-out. D4.
6. **"Fixing" the green yogdaan row for a suspended member.** The green is a fact about the
   contribution, not an endorsement of standing. D6.
7. **Editing `packages/ui/src/contribution-disclosure/*` to make AC6 pass.** 10.16 is `done` and
   reviewed. If it does not render, that is a finding to report.

### Reuse map — do not reinvent

| Need | Use this (shipped) | Never |
|---|---|---|
| Moderation standing at an instant | `member.moderation.getMemberModerationOverlay(db, memberId, at)` | a bespoke `events_log` scan |
| The moderation status set | `member.moderation.ModerationStatus` / `MODERATION_STATUSES` | a string literal union re-declared locally |
| Roster fingerprint | `poolDomain.computeAssignableRosterHash(memberSet)` | `JSON.stringify` of a member list |
| Live roster resolution in a test | `createAssignableRosterResolver({ pool })` | replicating the enumerate→evaluate→filter loop |
| Live-DB seeding for the pin | the existing helpers in `apps/jobs/tests/assignable-roster-live.test.ts` | a new seeder |
| Cache invalidation on moderation | the migration-0036 `events_log` AFTER-INSERT trigger (`member.%`) | an explicit delete in a handler |
| Reading the flag protocol in a test | `parseModerationFlag` (`packages/ui/src/member-status/i18n-keys.ts`) | re-deriving the `suspended_per_` prefix |

### Testing standards

- Vitest throughout. Pure unit tests need no DB; anything named `*.spec.ts` under
  `tests/integration/**` is live-DB-gated on `DATABASE_URL` (`twt-test-pg`, `:5433`).
- Live-DB gotchas that bite this story specifically (`[[project_live_db_test_gotchas]]`): **assert
  membership, not counts** (own-committing writers accumulate rows); never `DROP SCHEMA`; never
  regenerate an applied migration. Prefer suite-level `{ timeout: 20000 }` if a spec flakes under
  concurrent load.
- The replay pin (Task 5) must assert **byte-identical hash**, not merely equal-length lists — the
  hash is what the audit trail actually stamps into `pool.spawned`.
- Revert-sanity is expected for the new pins (`[[feedback_gate_scope_semantic_coverage]]`): with the
  predicate reverted to `payload.isValid`, Task 5's and Task 7's specs must go **red**. Record the
  observed failure count in the Dev Agent Record — a pin that stays green under revert is vacuous, and
  10.16's review found exactly that failure mode hiding inside its own fence.

### Project Structure Notes

- **`packages/contracts` must never import `@twt/domain`'s pg-touching namespaces at source level**
  (`[[project_contracts_domain_bundle_boundary]]`) — the DTO change is a plain `z.boolean()`, so this
  is a constraint to respect, not a task.
- The DTO is `camelCase` throughout (`isValid`, `isActive`) — this payload is **not** one of the
  snake_case contract surfaces. Match `isAssignable` to its siblings
  (`[[feedback_story_validate_footguns]]`).
- No migration, no `drizzle` schema change, no seed change. The `schema-diff` and `db-check` gates
  should be untouched by this story; if either moves, something is wrong.
- `PERMISSION_CATALOG_VERSION` stays **28** (`packages/domain/src/rbac/permissions.ts:337`). No new key.

### Latest technical notes

- `openapi/v1.yaml` is a **committed artifact** with a byte-identity CI gate
  (`packages/contracts/scripts/check-openapi-determinism.ts`). Regenerating and forgetting to commit is
  the single most common way this story's PR goes red on something unrelated to its logic.
- The determinism gate (`.github/workflows/ci.yml:790`) asserts **one distinct hash across 100 OS
  threads** — a variance check, not a golden-value check. There is no pinned payload hash anywhere in
  the repo to update. (`packages/domain/tests/pool/assign.test.ts:232` *does* pin frozen vectors, but
  those are assignment vectors over a given roster and are untouched by D3.)
- `apps/mobile` still has **no component-mount capability** (`vitest.config.ts` is
  `environment: 'node'`, `include: tests/unit/**/*.test.ts` — a `.tsx` mount test is not even
  collected). 10.16 Escalation 2 stands. Do not attempt the harness here.

---

## Escalations

**Escalation 1 — the two remaining `is_valid` consumers should be reviewed to confirm they are
displaying COVERAGE rather than roster eligibility.** Nothing here suggests either is wrong. Until this
story, the two concepts were fused in one boolean, so no consumer ever had to state which it meant;
now they can be distinguished, and confirming each one's intent is cheap. **Both reviews are out of
scope here** — this story changes neither:
- `apps/admin/src/modules/claim-verification/SignalsPanel.tsx:106` renders `isValid ? valid : invalid`
  on the verifier console. Coverage is very likely the correct semantic for claim verification. The
  open question is a **labelling** one: the label reads as a general verdict, and a verifier may now
  see a member marked "invalid" who is actively and legitimately contributing. **A copy question for
  Epic 6's owner, raised not resolved.**
- `packages/ui/src/member-status/presenter.ts:81,91` derives the member-facing headline from
  `isValid && isActive` — coverage, which is what a status headline should report. Story 10.16 AC3
  pinned this **byte-unchanged** and this story does not touch it. Whether a suspended-but-contributing
  member's headline should *additionally* acknowledge their roster standing is a **UX** question owned
  by the moderation-model UX items (Sprint Change Proposal §4e items 2-3).

**Escalation 2 — the ≤60s post-deploy 500 window (D5).** Bounded, self-healing, and mitigable with a
shipped operator route. Recorded rather than engineered around. If TWT ever adds a zero-downtime
deploy requirement for member reads, a payload-shape component in the validity cache key becomes a
real design item — **not** a side-quest inside a `[SURFACE]` story.

**Escalation 3 — carried forward, unresolved: the join-lock-in coverage question.** 10.16 Escalation 1
stands. `VALID_STATES` treats the join `lock-in` state as **covered** while FR-8 describes it as a
general-death lock-in. Resolving it changes `deriveIsValid` → every validity payload hash → Story 4.8
cache epochs + the 7.4 assignment version pin. **This story deliberately does not touch
`VALID_STATES`**, which is also why `deriveIsAssignable` reuses it rather than re-deriving a state
list — whatever that resolution turns out to be, both predicates should move together. Route to
`bmad-correct-course` if it is a real defect rather than a docstring imprecision.

**Escalation 4 — the RN mount harness (10.16 Escalation 2), still owed a story.** Seven stories have
now reached for a component-mount assertion and used a comment-stripped source scan instead. AC6 here
proves the **data path** end to end, which is the strongest available evidence without the harness —
but it does not prove pixels. Not discharged; not attempted here.

**Escalation 5 — NEW, raised at implementation: `MemberValidityPayloadDto` has never been registered
in the OpenAPI emitter, so AC3's "regenerate and commit `openapi/v1.yaml`" clause was undischargeable.**
`pnpm contracts:emit-openapi` produced a **byte-identical file**. The cause is not a stale emission:
`packages/contracts/scripts/emit-openapi.ts` is a **hand-curated registry** — schemas must be explicitly
imported and registered — and it has never imported `../src/members/validity.js`. `grep -c isValid
openapi/v1.yaml` returns **0**: the entire Story 4.6 validity payload (`isValid`, `isActive`, every
sub-object) has never been in the published contract, so `isAssignable` could not appear there either.
The two-boolean prose AC3 required was written into the `MemberValidityPayloadDto` doc comment, which is
the effective contract documentation today. **Registering the payload was deliberately NOT done here:**
it would publish a whole previously-undocumented wire surface into a byte-identity-gated artifact as a
side effect of a one-field story that explicitly owns no new state — a diff larger than this story's
logic, reviewed under the wrong story. Recorded in `deferred-work.md` and `.decision-log.md`. **A likely
wider gap:** other shipped DTOs may be unregistered too; the owning story should audit, not spot-fix.

---

## References

- `_bmad-output/planning-artifacts/epics.md:3683-3713` — Story 10.17 AC (the source of AC1-AC5)
- `_bmad-output/planning-artifacts/epics.md:3646-3658` — the moderation-model preamble + the
  constitutional frame (*"Termination is an exceptional governance act, not a stronger suspension"*)
- `_bmad-output/planning-artifacts/epics.md:3660-3681` — Story 10.16 + the `[GATE]` on this story
- `_bmad-output/planning-artifacts/epics.md:3538-3566` — Story 10.10 + its retro-note naming 10.17 as
  the correction
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-08-04.md:27-56` — §1.1 the five-fact
  defect chain; §1.2 the Niyamavali §3.3 contradiction; §1.3 the wrong enforcement-scope claim
- `…sprint-change-proposal-2026-08-04.md:112-119` — §2.4 the Tier 1/2/3/4 decomposition
- `…sprint-change-proposal-2026-08-04.md:196-226` — the 10.17 proposal verbatim
- `…sprint-change-proposal-2026-08-04.md:577-590` — §4f the AI-7-2 amendment record + architecture scope
- `…sprint-change-proposal-2026-08-04.md:623-631` — success criteria 1 and 2 (this story owns both)
- `_bmad-output/implementation-artifacts/10-16-contribution-during-suspension-disclosure.md:568-573` —
  Escalation 3, which names 10.17's dev agent as the first real-path validator (AC6)
- `_bmad-output/implementation-artifacts/10-10-member-moderation-suspend-terminate-restore-reason-codes.md:23,126,145`
  — the frozen AI-7-2 statements this story amends
- `apps/jobs/src/assignable-roster.ts:22-30, 40-52, 82-96` — the cache-avoidance rationale, the D1
  predicate block, the resolver
- `packages/validity-service/src/payload.ts:33-53, 55-60, 65-113, 275-303` — the composition block, the
  wrong enforcement claim (Decision-8, `:43-53`), `VALID_STATES` (`:55-60`), the derive functions
  (`:65-113`), `assemblePayload` (`:275-303`; `withoutHash` object `:287-300`). These, plus
  `assignable-roster.ts:41-53`, `types.ts:167` and `contracts/src/members/validity.ts:111`, are the
  same anchor set Decision 2026-08-04-072 already named — anchors are navigational, not normative
  (Task 0), but these are confirmed current as of this story's authoring.
- `packages/validity-service/src/service.ts:60-135` — `getValidityAt`; the moderation overlay resolved
  **at the pinned instant** (the mechanism AC4 pins)
- `packages/validity-service/src/types.ts:156-190` — `MemberValidityPayload`
- `packages/validity-service/src/redaction.ts:102-121` — `redactForCaller` (unchanged by this story)
- `packages/validity-service/src/cache.ts:41-130` — the cache-aside; D5's hazard surface
- `packages/domain/src/validity-cache/store.ts:83-97` + `constants.ts:20` — the four-part key (no
  payload-shape component) + the 60s TTL
- `packages/contracts/src/members/validity.ts:100-128` — `MemberValidityPayloadDto` (`.strict()`)
- `packages/contracts/scripts/check-openapi-determinism.ts` — the committed-artifact gate
- `apps/api/src/plugins/zod-openapi/index.ts:24-25` — `setSerializerCompiler` (response parsing)
- `apps/api/src/modules/member-validity/handlers.ts:110-185` — the member self-read + admin read + the
  `invalidate-all` operator route
- `apps/api/src/modules/payment/handlers.ts:118,123,262` — the `{ available:false, reason:'unassigned' }`
  producer that AC6 must see flip
- `packages/domain/src/pool/assign.ts:30-34, 55, 131, 191-196` — the verdict-blind assignment engine,
  `POOL_ASSIGNMENT_HASH_VERSION` and its bump rule (D3)
- `packages/domain/src/pool/spawn.ts:417-445` — the AI-7-2 spawn comment + `assignment_hash_version`
- `packages/domain/src/contribution/history.ts:101-128` — `deriveContributionStatus` (D6)
- `apps/jobs/src/scheduler/contribution-notify-triggers.ts:291-350, 740-790` — the alert builders
  (`buildCycleOpenAlert:291`, `buildDeadlineReminderAlert:324`) and the member fan-out (D4)
- `packages/validity-service/tests/integration/moderation-validity.spec.ts:1-15, 168-199, 201-228,
  243-262` — the regression suite AC7 corrects
- `apps/jobs/tests/assignable-roster-live.test.ts` — the live harness AC4/AC6 extend
- `.github/workflows/ci.yml:136` (openapi determinism), `:790` (validity determinism-replay),
  `:836` (integration-tests)

---

## Dev Agent Record

### Agent Model Used

`claude-opus-5` (Claude Code, `bmad-dev-story`), 2026-08-04.

### Debug Log References

**Task 0 baseline (before any edit, at `7e59f3d`):**
- `pnpm ci:local` (no `DATABASE_URL`) → **PASSED, 29 jobs green**, `integration-tests` SKIPPED.
- `DATABASE_URL=… pnpm ci:local` → **FAILED, 1 job** (`integration-tests`): `apps/api` `tests/integration/member-moderation/member-moderation.spec.ts` › *"AC4: an audit line is written per action, and the RATIONALE is never in it"* → `expected [] to include 'member_moderation.suspended'` (1 failed | 830 passed | 1 skipped). **Confirmed innocent**: the spec passes **22/22 in isolation**. It is the known concurrency-4 flake — the assertion waits `setTimeout(200)` for an async audit write that misses its window under load (`[[project_ci_local_concurrency_oversubscription]]`, `[[project_known_livedb_test_failures]]`). Pre-existing; not attributable to this story.

**Three implementation traps hit and resolved (each cost a red run):**
1. **`none --terminate-->` is an ILLEGAL transition and folds as SILENT IDENTITY.** `evaluateModerationOverlay` reduces via `nextModerationStatus(status, action)` and *ignores* the payload's `moderation_from`/`moderation_to`; an illegal step is `continue`d. Seeding a lone `member.moderation.terminated` therefore folds to `status: 'none'` — the member came back **fully unmoderated**, and the "terminated member is off the roster" assertions failed by finding them ON it. Termination must always be seeded as the two-event chain suspend → terminate. Recorded in the test helper's doc comment so the next author does not re-discover it.
2. **`recordClaimNomineeBankAccounts` requires EXACTLY two accounts, atomically** (Story 6.8). Seeding one threw `NomineeBankAccountSetError`.
3. **`resolveMemberLivePool` gates on `getMemberStateAt(...) === 'active'`.** Verified this is *not* a second blocker: moderation is an overlay and `members.state` never moves (10.10 Decision 1), so a suspended member passes it — pool assignment genuinely was the only thing to unblock.

**Final validation (Task 9), and the live-DB failures run to ground.** The story warned that a live-DB failure here is *not* presumptively innocent because this change touches a payload shape those specs read. Each was therefore chased rather than waved off:
- `pnpm turbo run typecheck` ✅ (20/20) · `lint` ✅ · `pnpm --filter @twt/validity-service test:determinism` ✅ (one distinct hash across 100 threads) · `contracts:check-openapi-determinism` ✅.
- **`ci:local` (live DB) — first run: 2 jobs red.** `test (unit)`: 2 `@twt/admin` React tests at ~5s (timeouts). `integration-tests`: **all 6** DB-backed tests in `moderation-validity.spec.ts`, `isValid` staying `true` after a suspend. Six failures in the one spec this story rewrites is exactly the shape of a real regression, so it was investigated to root cause, not retried.
- **Evidence it is NOT this story's change:** (i) an independent `tsx` diagnostic against the same DB showed the domain fold correct (`overlay = suspended`, `state = active`) and `getValidity` returning `isValid=false, isActive=false, isAssignable=true` with the `suspended_per_` flag — the exact assertions that failed; (ii) the spec passes **7/7 in isolation**; (iii) it passes **7/7 twice sequentially** against the same DB (so it is not double-run pollution); (iv) the **entire `integration-tests` job run alone is green — 23/23 tasks**; (v) the log shows the spec ran **twice** in that ci:local (DATABASE_URL is exported globally, so `test (unit)` runs the integration specs too) and the **first pass was green (7/7, 5066ms)** while the second failed in 608ms.
- **Decisive re-run:** a clean `ci:local` with nothing else touching the DB → `moderation-validity.spec.ts` **passed both passes (7/7, 7/7)**, `test (unit)` green, and the earlier `@twt/admin` timeouts did not recur. `integration-tests` failed on **one unrelated test instead** — `banners/banners.spec.ts` AC5 (Story 10.9), `createBanner` 500-not-201 after 5542ms — **confirmed innocent at 26/26 in isolation**. A *different* victim each run, always timing-shaped, is the documented signature of `[[project_ci_local_concurrency_oversubscription]]` / `[[project_ci_local_double_run_pollution]]`; the baseline run had its own instance (a different spec again).
- **Every Story-10.17 spec was green in BOTH passes of the clean run:** `assignable-roster-live.test.ts` 5/5, `assignable-roster.test.ts` 8/8, `suspended-member-reachability.spec.ts` 3/3, `moderation-validity.spec.ts` 7/7.
- **Stated plainly:** `ci:local` does **not** currently end green end-to-end on this machine — it ends with one load-induced failure whose identity changes per run. That is a **pre-existing environmental condition, present at baseline**, not a regression from this story, and it is reported rather than hidden.

**REVERT-SANITY (the pins have teeth — `[[feedback_gate_scope_semantic_coverage]]`):**
- Reverting `isMemberAssignable` to `return payload.isValid` → **6 tests fail** across `apps/jobs/tests/assignable-roster.test.ts` + `assignable-roster-live.test.ts` (both new AC4/AC6a live pins, all three new predicate cases, and the resolver filter case).
- Reverting `deriveIsAssignable` to `moderationStatus === 'none'` (i.e. a copy of `deriveIsValid`) → the new `apps/api` reachability spec's AC6a validity-self-read test fails.
- ⚠ **Recorded honestly:** two specs in that api file are *not* predicate-sensitive in isolation, and this is by design, not an oversight. (a) The nominee-accounts `available: true` test seeds `pool_snapshots.member_assignments` directly, so it proves the **snapshot → surface** half only; the **roster → snapshot** half is what the jobs-side AC6a pin proves, and it *is* predicate-sensitive. (b) **AC6b is `specialFlags`-driven**: `isUnderContributionPermittingSuspension` reads `parseModerationFlag(payload.specialFlags)`, never `isAssignable` — so the disclosure fires on payload *shape*, independent of the roster predicate. That is exactly why AC6b is scoped as a **confirmation of reachability**, not a proof of the predicate.
- The AC4 "moderation event AFTER the freeze" pin correctly stays **green** under revert: it tests instant-pinning of the overlay read, not the predicate.

### Completion Notes List

**The change itself is ~1 logic line.** `deriveIsAssignable(state, moderationStatus) = VALID_STATES.includes(state) && moderationStatus !== 'terminated'`, wired into `assemblePayload`, and `apps/jobs/src/assignable-roster.ts` switched from `payload.isValid` to `payload.isAssignable`. Everything else is the discipline around it.

- **AC1 ✅** Single reason-code-blind predicate. `deriveIsValid` / `deriveIsActive` / `VALID_STATES` / `ACTIVE_STATES` are **byte-unchanged** (verify with `git diff` — only the surrounding comment block moved). Reason-code blindness is pinned both structurally (`deriveIsAssignable.length ≤ 2` — no reason-code parameter exists) and behaviourally (four different codes through `assemblePayload` → identical `isAssignable`, while `specialFlags` proves the code *did* reach the payload, so the invariance is real blindness and not a dead input).
- **AC2 ✅** `isMemberAssignable` returns **exactly** `payload.isAssignable` — one field, no conjunction. The `:41-53` doc block was rewritten as an **amendment record** naming what changed / what did not / why, and retaining the reviewer instruction verbatim, retargeted. The wrong enforcement-scope claim in `payload.ts` was corrected — **and its verbatim duplicate at `packages/domain/src/member/moderation/index.ts:12-19` was found by the Task-4 grep and corrected too** (not in the story's list).
- **AC3 ⚠ PARTIAL — one clause could not be discharged; see Escalation 5.** Type ✅, `.strict()` DTO ✅, export ✅, not redacted ✅ (+ a new positive pin that `isAssignable` survives both narrow-caller and self-call redaction). **`openapi/v1.yaml` regenerated to a byte-identical file (zero diff)** because `emit-openapi.ts` is a hand-curated registry that has **never imported `../src/members/validity.js`** — `grep -c isValid openapi/v1.yaml` → **0**. The whole Story 4.6 payload has never been in the OpenAPI artifact, so the field cannot appear there. The two-boolean prose AC3 asked for was written into the `MemberValidityPayloadDto` doc comment instead. Determinism gate still green. Recorded in `deferred-work.md` + `.decision-log.md`; **not** silently dropped, and **not** backfilled (`[[feedback_record_unattested_no_backfill]]`).
- **AC4 ✅** Replay pin added in two halves: (i) a moderation event **after** a frozen `committed_at` leaves the roster resolved **at** it byte-identical — asserted on `computeAssignableRosterHash`, not just list equality; (ii) at the frozen instant, a member suspended **before** the freeze **is** on the roster and one terminated before it is **not**. The rationale (nothing diverges today; the pin exists so that stays true) and the mechanism it guards (the overlay resolved at the pinned instant, never `now()`) are written into the test comment.
- **AC5 ✅** Pool-spawn comment corrected. **D6** pinned structurally + behaviourally (`deriveContributionStatus` has no member-standing-shaped input slot; a confirmed contribution is green regardless) and **left unchanged**. **D4** pinned (both builders' input shape has no standing slot; two members differing only in standing get byte-identical `payload_data`) and recorded in `deferred-work.md` as *considered and deliberately not built*, with the privacy + hot-path + already-said-on-the-payment-surface reasoning.
- **AC6a ✅ PROVEN, in two halves that join at `pool_snapshots.member_assignments`.** Roster half (`apps/jobs/tests/assignable-roster-live.test.ts`): a suspended member survives the **real** resolver and **real** `spawnChildPool` into the snapshot, and 7.6 resolves them to a real pool; a terminated member does not. Surface half (new `apps/api/tests/integration/payment/suspended-member-reachability.spec.ts`): `GET /api/v1/member/validity` → `isValid: false`, `isAssignable: true`, `suspended_per_r7-contribution-discipline`; nominee-accounts → **`available: true`**, not `{ available: false, reason: 'unassigned' }`. The split is forced by layering (a package/app cannot import another app) and is stated in both files.
- **AC6b ✅ CONFIRMED.** The **real** handler-returned payload (not a fixture) fed into `deriveContributionDisclosure` yields a non-null view-model with `instrument: 'suspension'`. **This is the first time the Story 10.16 disclosure has been shown to fire on a live path** — discharging 10.16 Escalation 3. `packages/ui/src/contribution-disclosure/*` and `SuspensionDisclosure.tsx` are **untouched**.
- **AC6 attestation — UN-ATTESTED, stated plainly.** **No emulator or device run of `/pay` was performed.** AC6a and AC6b are both proven at the data-path level without a device, which is what they claim; **pixels are NOT attested.** Do not read anything above as a device run. 10.16 Escalation 2 (no RN mount harness) is **not** discharged and was not attempted (`[[feedback_record_unattested_no_backfill]]`).
- **AC7 ✅** Every red 10.10 assertion was **rewritten, never deleted or skipped** (D2). `moderation-validity.spec.ts:243` kept its file/position/name-shape (*"…drops out of assignability through `is_valid` ALONE"* → *"…STAYS assignable through `is_assignable`, while `is_valid` still drops"*) with its **comment block rewritten**, plus a terminated arm and a restore arm so it still catches a regression. The byte-identical test gained `isAssignable` to its **must-not-move** set under suspension **and a new mirrored test** putting it in the **allowed-to-move** set under termination — the pair is what makes either meaningful. The stale-cache test gained `isAssignable === true` on the post-suspend recompute. The file header and `member-moderation.spec.ts`'s AC5 header were corrected. **Net test count went UP everywhere** (validity-service integration 6→7, jobs roster units 6→8).

**D5 — DEPLOYMENT NOTE (accepted compatibility window, NOT a defect).** For up to **60 seconds** after this deploys, `GET /api/v1/member/validity` may return **500** for members with a warm pre-deploy `member_validity_cache` row: the cached JSONB payload lacks `isAssignable`, and `fastify-type-provider-zod`'s serializer parses the response against a `.strict()` DTO. **Bound:** `VALIDITY_CACHE_TTL_SECONDS = 60`, and the read is `computedAt > now() - 60s`, so every stale-shaped row is a miss within a minute. **Mechanism:** TTL expiry; self-healing, no code needed. **Optional zero-window lever (operational, at deploy time):** `POST /api/v1/p/:pariwarId/admin/validity-cache/invalidate-all` per Pariwar immediately after rollout. **Explicitly considered and REJECTED for this story:** adding a payload-shape/version component to the Story 4.8 cache key (a real design change to a frozen mechanism, for a 60s transient), and making `isAssignable` optional in the DTO (a correctness hole outliving the deploy by years). Do not re-open either as a bug. **Pool spawn is unaffected** — `assignable-roster.ts` uses `getValidityAt`, never `getValidityCached`.

**Two-question test applied to the whole diff (Task 9).** The only production reads are `assignable-roster.ts` → `isAssignable` (ROSTER ✓) and `payload.ts` producing it. The two surviving `isValid` readers both answer COVERAGE and are correct + unchanged: `SignalsPanel.tsx:106` (claim verification) and `member-status/presenter.ts:340` (status headline). **No third "both, I suppose" site was found in production code.** Four stale-prose sites *were* found beyond the story's list and corrected: `member/moderation/index.ts`, `member/read.ts:59`, `news-blog/audience.ts:6`, and three "Enforcement is `is_valid`" comments (`server.ts:295`, `member-moderation/handlers.ts:228`, `member-auth.repo.ts:433`).

**Variances from the story spec, recorded rather than made silently:**
1. **`@twt/ui` added as a `devDependency` of `apps/api`** (workspace, test-only). AC6b mandates feeding the real payload into `@twt/ui`'s `deriveContributionDisclosure`, and `apps/api` did not depend on it. `@twt/ui` is pure logic depending only on `@twt/contracts` (no react/react-native), so there is no cycle and nothing ships — the import is test-only (`[[project_contracts_domain_bundle_boundary]]`: test-only cross-package imports are safe).
2. **A new spec file** (`apps/api/tests/integration/payment/suspended-member-reachability.spec.ts`) rather than extending `nominee-accounts.spec.ts` — that file is scoped to the Tier-1 decrypt round-trip and mixing reachability into it would blur both.
3. **`redaction.test.ts` was touched after all** — Task 2 said to leave it unless a positive redaction pin was wanted. AC3's "the field is NOT redacted" is a real claim, so the optional pin was taken.

`PERMISSION_CATALOG_VERSION` stays **28**. No migration, no schema change, no new event type, no new route, no new permission key.

### File List

**Source (7):**
- `packages/validity-service/src/payload.ts` — `deriveIsAssignable` + `assemblePayload` wiring + the corrected enforcement-scope comment block
- `packages/validity-service/src/types.ts` — `isAssignable` on `MemberValidityPayload`
- `packages/validity-service/src/index.ts` — export `deriveIsAssignable`
- `packages/contracts/src/members/validity.ts` — `isAssignable` on `MemberValidityPayloadDto` + two-boolean prose
- `apps/jobs/src/assignable-roster.ts` — reads `payload.isAssignable`; AI-7-2 doc block rewritten as the amendment record
- `packages/domain/src/pool/spawn.ts` — corrected AI-7-2 spawn comment
- `packages/domain/src/member/moderation/index.ts` — corrected the duplicated enforcement-scope claim

**Source, prose-only corrections (5):**
- `packages/domain/src/member/read.ts`, `packages/domain/src/news-blog/audience.ts`, `apps/api/src/server.ts`, `apps/api/src/modules/auth/member/member-auth.repo.ts`, `apps/api/src/modules/member-moderation/handlers.ts`

**Tests (14):**
- `apps/api/tests/integration/payment/suspended-member-reachability.spec.ts` — **NEW** (AC6a surface half + AC6b)
- `apps/jobs/tests/assignable-roster-live.test.ts` — AC4 replay pins + AC6a roster half + `moderateMember` helper
- `apps/jobs/tests/assignable-roster.test.ts` — the two divergence cases
- `apps/jobs/tests/contribution-notify-triggers.test.ts` — D4 moderation-blindness pin
- `packages/domain/tests/contribution/history.test.ts` — D6 moderation-blindness pin
- `packages/validity-service/tests/payload.test.ts` — the `is_assignable` cross-product + reason-code blindness + revert-sanity
- `packages/validity-service/tests/redaction.test.ts` — `isAssignable` survives redaction
- `packages/validity-service/tests/integration/moderation-validity.spec.ts` — AC7 rewrites + the termination mirror
- `apps/api/tests/integration/member-moderation/member-moderation.spec.ts` — corrected AC5 header
- `packages/ui/tests/contribution-disclosure/presenter.test.ts`, `packages/ui/tests/member-status/moderation.test.ts`, `packages/ui/tests/member-status/presenter.test.ts`, `apps/admin/tests/member-status-panel.test.tsx`, `apps/admin/tests/verifier-console.test.tsx` — fixtures, set truthfully per fixture

**Config / records (5):**
- `apps/api/package.json` + `pnpm-lock.yaml` — `@twt/ui` devDependency
- `.decision-log.md` — Decision 2026-08-04-072's follow-up resolved
- `_bmad-output/implementation-artifacts/deferred-work.md` — D4 posture + the OpenAPI finding
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — status ledger

---

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-08-04 | 0.1 | Story authored via `bmad-create-story` off `main` @ `7e59f3d`. Six decisions recorded (D1 predicate placement, D2 invert-don't-delete, D3 no version bump, D4 moderation-blind alerts, D5 the 60s cache-shape window, D6 yogdaan stays green). Seven ACs; AC6 discharges 10.16 Escalation 3; AC7 protects the regression suite. | Bob (SM) |
| 2026-08-04 | 0.2 | Five refinements from BigDev at authoring time. (i) D5 restated as an **accepted deployment-compatibility window, not a functional defect**, with a payload-version cache key explicitly rejected in-story and a deploy-note task added — this is what stops a future engineer "fixing" a 60-second transient by editing a frozen 4.8 mechanism. (ii) AC6 split into **AC6a reachability (10.17 owns)** and **AC6b disclosure confirmation (10.16's correctness is not re-opened)**, keeping ownership unambiguous. (iii) D2 promoted to the story's most emphasised decision with an explicit per-test treatment and a stated review consequence — developers instinctively delete failing tests, and here the failing test *is* the record of the constitutional change. (iv) Escalation 1 reworded from "may be reading the wrong boolean" to "should be **reviewed to confirm they display coverage rather than roster eligibility**" — nothing proves either consumer is wrong. (v) NEW **Reviewer checkpoint — the two-question test**, a permanent mental model for the first divergence between two previously-fused booleans, wired into Task 9. | Bob (SM) |
| 2026-08-04 | 1.0 | **Implemented** on `feat/10-17-moderation-roster-unblock` off `main @ 7e59f3d`. `deriveIsAssignable` shipped beside `deriveIsValid`; the roster switched to `payload.isAssignable`; AI-7-2 amended in-place as the canonical record (Decision 2026-08-04-072 §2). AC1/AC2/AC4/AC5/AC6a/AC6b/AC7 satisfied; **AC3 partial** — the OpenAPI clause was undischargeable because the validity payload has never been registered in the hand-curated emitter (**Escalation 5**, new). Every red 10.10 assertion rewritten, none deleted (D2); net test count up in all four touched suites. Revert-sanity: 6 failures on predicate revert. **AC6 device run: UN-ATTESTED** — the data path is proven end to end, pixels are not. D5's ≤60s cache-shape window recorded as an accepted deployment note. Four stale-prose sites found beyond the story's list and corrected. One variance: `@twt/ui` added as an `apps/api` devDependency (test-only, required by AC6b). | Amelia (Dev) |
| 2026-08-04 | 0.3 | Validated against live `HEAD@7e59f3d` and `.decision-log.md`. Two critical fixes: (i) Task 8 now cites **Decision 2026-08-04-072**, which already rules `architecture.md` out of scope for this amendment and pre-scoped its own open follow-up — the task closes that follow-up rather than inventing a disconnected entry. (ii) Task 2's fixture list corrected — `redaction.test.ts`/`determinism-runner.ts` build an `AssembleInput`, not a `MemberValidityPayload` literal, and will not fail typecheck; split out of the must-fix list. Two precision fixes: Task 3's `assignable-roster.test.ts` describe block holds two cases today, not four; Task 4's grep list dropped `assign.ts:30-34` (no `is_valid` prose there) and trimmed the live-test anchor to `:7` (line 125 doesn't contain the claimed phrase). Anchors in Dev Notes/References tightened to match Decision 072's own anchor set. | Validation pass |
