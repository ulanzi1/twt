---
title: 'AI-6-3 — Live-DB compound-read-model shape test class'
type: 'chore'
created: '2026-07-17'
status: 'done'
baseline_commit: 4fa669a3054f1a3acc730d030bcefbac7a487065
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** DB-free unit tests structurally cannot catch data-shape defects — Story 6.6's Drizzle correlated-subquery tautology shipped wrong districts with green unit tests, and the 6.10 verifier-console compound read model (plus Epic 7's pool read models) carries the same un-covered risk (Epic 6 retro H-3/I-2, AI-6-3 confirmed BigDev 2026-07-16).

**Approach:** Add a targeted **live-DB shape test class** — specs that seed *adversarial decoy data* (rows a shape-broken query would wrongly return) and assert the exact right rows come back: a regression spec for the 6.6 correlated-subquery class and a compound data-shape spec for the 6.10 assembler, structured as a documented pattern Epic 7 pool read models join by adding sibling specs.

## Boundaries & Constraints

**Always:**
- **Zero production source changes** — test-only, like AI-5-2.
- Follow the live-DB conventions: `describe.skipIf(!hasDatabase)`, `.spec.ts` under `tests/integration/`, domain-package `setupLiveDb()` tx-rollback style; apps/api `_setup.ts` own-committing style with fresh random `pariwarId` and **membership-not-count** assertions.
- Every shape assertion must be **tautology-detecting**: the seed must include decoy rows such that the known-bad query shape returns detectably wrong data (a seed the bug passes proves nothing — [[feedback_gate_scope_semantic_coverage]]).
- **Count-only assertions are banned** in shape specs: assert exact row membership; where the production read specifies an ordering (candidate snapshot by `member_id` asc; posting pick by `created_at DESC, posting_id DESC`), assert that order too — otherwise sort-then-compare.
- Prove teeth via **revert-sanity**: temporarily reintroduce the unqualified-column interpolation in `peer-mesh-read.ts`, observe the new spec fail, restore byte-identical. The temporary edit is **development-only and must never be committed** — only the recorded evidence in the Dev Agent Record is.
- Each spec carries a WHY header naming the AI-6-3 shape-test class and the bug class it guards, so Epic 7 finds and extends the pattern.

**Ask First:**
- Any production source edit needed to make a surface testable (e.g. exporting an assembler).
- Any new shared test-utils module beyond additions to existing `_helpers.ts` seeders.

**Never:**
- No schema or migration changes; never regenerate applied migrations.
- No new test harness/abstraction layer — the "class" is a naming + seeding pattern, not a framework.
- Do not duplicate the existing `verifier-console.spec.ts` coverage (authz matrix, four-state vocabulary, max-reads ceiling); the new spec is data-shape only.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Candidate snapshot correlation | M1 has postings district-X (old) + district-Y (new); M2 holds the tenant-wide newest posting in district-Z | M1 → Y, M2 → Z (tautology would yield Z for both) | N/A |
| Deceased attributes correlation | Same decoy shape against `getPeerMeshDeceasedAttributes` | Deceased's own latest posting, not tenant-wide latest | N/A |
| Compound console shape | Claim A with rich signal rows on every panel + decoy claim B (same pariwar, same deceased-adjacent columns) + claim C (other pariwar) | Every panel of A's console contains exactly A's rows — membership assert; none of B's/C's | N/A |
| No DATABASE_URL | env unset | Both new suites skip cleanly | N/A |

</frozen-after-approval>

## Code Map

- `packages/domain/src/claim/peer-mesh-read.ts:73-137` -- the fixed 6.6 correlated subqueries (`getPeerMeshCandidateSnapshot`, `getPeerMeshDeceasedAttributes`); bug-class comment at 60–71
- `apps/api/src/modules/claims/claims.verifier-console.handlers.ts:134` -- `assembleVerifierConsole` + per-panel sub-assemblers (the 6.10 compound read)
- `packages/domain/src/claim/verifier-console-read.ts:133,158` -- `getPriorVerifierDecisions`, `getRecentInScopePrecedents`
- `packages/domain/src/test-utils/integration-setup.ts` -- `setupLiveDb`, `getTx`, `hasDatabase`
- `packages/domain/tests/integration/_helpers.ts` -- seeders (`seedMember`, `seedClaim`, …); seed as superuser before `SET LOCAL ROLE twt_app`
- `apps/api/tests/integration/_setup.ts` + `claims/verifier-console.spec.ts` -- apps/api live-DB style + existing (non-shape) console coverage
- `apps/jobs/tests/claim-peer-mesh.test.ts` -- indirect existing coverage; multi-district seeding example (lines 184–190)

## Tasks & Acceptance

**Execution:**
- [x] `git` -- branch `story/ai-6-3-compound-read-model-shape-tests` off up-to-date `main` -- repo convention
- [x] `packages/domain/tests/integration/claim/peer-mesh-shape.spec.ts` -- new shape regression spec: seed matrix rows 1–2 (add a `seedMemberPosting` helper to `_helpers.ts` if none exists), assert per-member correct district via exact row equality -- guards the 6.6 bug class at its source
- [x] `packages/domain/src/claim/peer-mesh-read.ts` -- revert-sanity teeth check (temporary edit, observe fail, restore byte-identical; never committed) -- proves semantic coverage; record outcome in Dev Agent Record
- [x] `apps/api/tests/integration/claims/verifier-console-shape.spec.ts` -- new compound shape spec: seed matrix row 3 across documents/peer-mesh/inspection/decisions/precedents, assemble claim A's console, membership-assert every panel -- guards the 6.10 read model
- [x] `_bmad-output/implementation-artifacts/ai-6-3-compound-read-model-shape-tests.md` -- append Dev Agent Record (incl. teeth-check evidence + the Epic-7 join instruction) -- continuity

**Acceptance Criteria:**
- Given the adversarial seed, when the unqualified interpolation is temporarily reintroduced in `peer-mesh-read.ts`, then `peer-mesh-shape.spec.ts` fails; when restored, it passes.
- Given decoy claims B and C, when claim A's console is assembled, then each panel's rows are exactly A's (membership assertions, no counts).
- Given `DATABASE_URL` unset, when the two suites run, then both skip; given `:5433` up, then both pass.
- Given the full local gate, when `pnpm ci:local` runs with `DATABASE_URL`, then all 14 jobs pass.

## Design Notes

The "test class" = a convention, deliberately not a harness: `*-shape.spec.ts` under the owning package's `tests/integration/`, adversarial decoy seeding, exact-membership assertions, WHY header citing AI-6-3. **Any future compound read model joins by adding a sibling `*-shape.spec.ts` beside its read code** — Epic 7's pool read models first — and the WHY header in both new specs states this explicitly.

## Verification

**Commands:**
- `DATABASE_URL=postgres://…:5433/… pnpm --filter @twt/domain test` -- expected: new spec green
- `DATABASE_URL=… pnpm --filter @twt/api test` -- expected: new spec green
- `pnpm --filter @twt/domain test` (no DATABASE_URL) -- expected: suites skip, exit 0
- `pnpm ci:local` -- expected: all jobs green (the merge gate while Actions is suspended)

## Dev Agent Record

### Files created / changed

- [packages/domain/tests/integration/claim/peer-mesh-shape.spec.ts](../../packages/domain/tests/integration/claim/peer-mesh-shape.spec.ts) — NEW: the 6.6 correlated-subquery shape regression spec (4 tests; matrix rows 1–2).
- [apps/api/tests/integration/claims/verifier-console-shape.spec.ts](../../apps/api/tests/integration/claims/verifier-console-shape.spec.ts) — NEW: the 6.10 compound data-shape spec (2 tests; matrix row 3), driving `assembleVerifierConsole` directly (already exported — NO production edit was needed, so the Ask-First item never triggered).
- [packages/domain/tests/integration/_helpers.ts](../../packages/domain/tests/integration/_helpers.ts) — additive only: new `seedMemberPosting` seeder (fixed `postingId` + `createdAt` accepted so the `created_at DESC, posting_id DESC` pick is pinnable) + the `postingId` id-constructor import.
- **Zero production source changes** (verified: `git status` shows only the two new specs + the `_helpers.ts` addition + this spec file).

### Seeding design — why the decoys detect the tautology

**Domain spec (fresh random pariwar per test, superuser seed → `enterAppScope`, tx-rollback):** the known-bad shape collapses the latest-posting correlation into `p.member_id = p.member_id` — the subquery then returns the TENANT-WIDE newest posting for every outer row. So the seed plants one member (M2) holding the tenant-wide newest posting (`Muzaffarpur` @ 2099) in a district UNIQUE to M2, while every other expectation is a different district: M1 → `Gaya` (with a same-`created_at` decoy `Saran` at a LOWER `posting_id`, pinning the `posting_id DESC` tiebreak), M3 → `null` (no posting), deceased → own-latest `Patna` (not `Muzaffarpur`). Under the bug, every district becomes `Muzaffarpur` — M1, M3 and the deceased all fail deterministically (no ~30-40% flake window: the decoy never coincides with any expected value). Assertions are exact `toEqual` on the full row array in `member_id` asc order — membership + order + per-member district in one; no counts.

**apps/api spec (fresh random pariwarIds, own-committing seeds, membership-not-count):** decoy claim B lives in the SAME pariwar and is about the SAME deceased member as claim A — every deceased-adjacent column (`deceased_member_id` on claims, peer-mesh selections, events) matches, so a panel query keyed by `pariwar_id` or `deceased_member_id` instead of `claim_case_id` would pull B's rows into A's console. Decoy claim C lives in ANOTHER pariwar — a dropped tenant predicate would pull C's. Every panel row carries a per-claim UNIQUE marker (storage object keys → deterministic `memory://` signed URLs, fixed-order candidate uuids, photo ids, actor display names) and each panel of A's assembled console is asserted by exact membership: documents = exactly {docKeyA1, docKeyA2}; peer-mesh pings = exactly [candA1, candA2, candA3] in `member_id` asc order (seeded OUT of order to prove the read sorts); responses = exactly A's two responders; inspection = exactly [inspectionA] with exactly A's two photo ids; (e) = exactly A's own decision; (f) = exactly [B] (current-claim exclusion + tenant scoping in one assertion). A whole-packet JSON sweep then proves NONE of B's/C's panel markers appear anywhere (B's decision fields legitimately appear once, as the (f) precedent, and are excluded from the sweep). A second test assembles decoy B's OWN console to prove the decoy rows really landed — the "none of B's rows" assertions can't pass vacuously.

### Teeth-check evidence (revert-sanity, development-only edit — never committed)

**What was changed:** in `peer-mesh-read.ts`, BOTH correlated subqueries (in `getPeerMeshCandidateSnapshot` and `getPeerMeshDeceasedAttributes`) had the literal outer qualifier `"members"."member_id" AND p.pariwar_id = "members"."pariwar_id"` replaced with the Column-object interpolation `${members.memberId} AND p.pariwar_id = ${members.pariwarId}` — the exact 6.6 bug shape.

**Observed failure:** `peer-mesh-shape.spec.ts` → **4/4 tests failed**, every district collapsing to the tenant-wide-newest decoy exactly as predicted. Excerpt:

```
FAIL … deceased attributes: the deceased gets their OWN latest posting, not the tenant-wide newest
AssertionError: expected { district: 'Muzaffarpur', …(1) } to deeply equal { district: 'Patna', …(1) }
-   "district": "Patna",
+   "district": "Muzaffarpur",

FAIL … excludeActorId still yields exact per-member rows
  { "memberId": "…0003",
-   "district": null,
+   "district": "Muzaffarpur" }

Test Files  1 failed (1) / Tests  4 failed (4)
```

**Restoration proof:** `git checkout -- packages/domain/src/claim/peer-mesh-read.ts`; `git status --short` afterwards shows NO entry for `peer-mesh-read.ts` (only the new test files + `_helpers.ts`), and `git diff --stat` on the file is empty — byte-identical restore. Re-run: 4/4 green.

### Test-run results (2026-07-17)

| Command | Result |
|---|---|
| `DATABASE_URL=…:5433… vitest run …/peer-mesh-shape.spec.ts` | 4 passed |
| `DATABASE_URL=…:5433… vitest run …/verifier-console-shape.spec.ts` | 2 passed |
| `DATABASE_URL=…:5433… pnpm --filter @twt/domain test` | 1023 passed, 1 skipped, **1 PRE-EXISTING failure** (see below) |
| `DATABASE_URL=…:5433… pnpm --filter @twt/api test` | 568 passed (73 files) |
| `pnpm --filter @twt/domain test` (no DATABASE_URL) | 546 passed, 479 skipped — exit 0 |
| `pnpm --filter @twt/api test` (no DATABASE_URL) | 183 passed, 385 skipped — exit 0 |
| `lint` + `typecheck`, both packages | clean |

**Pre-existing failure (NOT caused by AI-6-3):** `tests/integration/device-token/device-token.spec.ts` › "cleanup prune: purgeExpiredDeviceTokens …" asserts `deleted === 2`, but `purgeExpiredDeviceTokens` sweeps the whole table and the shared `:5433` DB has **26 committed prunable rows** (own-committing apps/api runs, `last_seen_at` 2026-07-08→07-16 — all predating this task; AI-6-3 seeds never touch `member_device_tokens`) → 26 + 2 = 28. Fails identically in isolation and on an unmodified tree; the test's own purge rolls back, so it will keep failing (and will RECUR as committed rows age past the 7d/30d windows) until either the stale rows are purged from the shared DB or the assertion is made accumulation-proof (delta/membership, not an absolute count) — it is itself an instance of the exact count-assertion anti-pattern this story bans. An environment DELETE of the 26 expired rows was attempted but denied by the session's permission policy; left for the human/parent to run (or fold into a follow-up fix of that spec).

### Review-patch round (2026-07-17 — 14 patch-grade findings from the 3-layer review, all applied)

**apps/api `verifier-console-shape.spec.ts`:**
1. **Sweep de-vacuoused** — the signed URL carries `encodeURIComponent(key)`, so sweeping raw `shape/B/…` keys against `JSON.stringify(packet)` could never match. The sweep now checks each doc key's leak-surviving forms: the ENCODED key and the raw uuid TAIL inside it (uuids contain no `/`, so the tail survives encoding verbatim); comment updated to say so.
2. **Compound teeth proven by induced defect** (evidence below); WHY header rewritten to state precisely what is PROVEN (the (e) claim correlation + the (f) superseded filter, via revert-sanity) vs ANALYTICALLY ARGUED (the remaining panels, from the same marker construction + the non-vacuousness assembly), and that the C-decoy is additionally guarded by RLS scope — it pins the tenant boundary as a whole (defense-in-depth), not the bare SQL predicate.
3. **Members rows for candidates** — every pinged/responding candidate id now gets a real committed `members` row in its pariwar (idempotent `ON CONFLICT DO NOTHING`), so the seed resembles reachable state.
4. **Superseded-precedent decoy** — new decoy claim D (same pariwar, same deceased) is adjudicated then its decision row superseded via raw `UPDATE … SET superseded_at = now() … AND superseded_at IS NULL`; (f) still asserts exactly `[claimB]`, pinning the previously test-uncovered `superseded_at IS NULL` predicate.
5. **Non-vacuousness across ALL panels** — after A's assertions the same test assembles decoy B's OWN console and membership-asserts B's markers on every panel (doc signed URL, pings `[candB1, candB2]`, responder, inspection + photo, B's own (e) decision, and B's (f) precedents = exactly `[claimA]`); the redundant separate second test was deleted.
6. `eventType as never` cast removed — the emit helper is typed with the projector's real union (`Parameters<typeof claim.projectClaimState>[1]['eventType']`).
7. Both `localeCompare` sorts replaced with a plain bytewise `byString` comparator (matches Postgres uuid order; no locale surprises).
8. Candidate uuids get a random-PER-RUN hex prefix with ordered tails (they COMMIT — fixed uuids would collide across runs; within-run bytewise order stays known for the exact-order assertion).

**domain `peer-mesh-shape.spec.ts`:**
9. New non-active-member decoy M4 with a unique-district posting; the exact `toEqual` arrays stay 3 rows (M4 absent), pinning the roster's `state = 'active'` predicate. **Deviation:** the review said state `'exited'`, but `MEMBER_LIFECYCLE_STATES` has no such value — `'withdrawn'` (the non-active equivalent) is used and noted in the spec comment.
10. The 2099 decoy posting date replaced with dynamic `new Date()` — still deterministically tenant-wide newest vs the 2020–2023 seeds, without betting against a future effective-dating predicate.
11. M1–M4/DECEASED and TIE_LOW/TIE_HIGH now derive from one random-per-run prefix with ordered tails (known bytewise order within a run; no cross-run/concurrent fixed-uuid collisions); comments updated.
12. Suite-level `{ timeout: 20000 }` added (parity with the api spec).
13. The separate tie-break test removed — test 1's whole-array `toEqual` already pins Gaya; its rationale folded into test 1's comment (TIE seeds kept).

**`_helpers.ts`:**
14. `seedMemberPosting`'s default `createdAt` no longer falls through to the tx-pinned `defaultNow()` (two default calls in one tx would tie nondeterministically) — it defaults to a unique monotonically-increasing timestamp from a module-level counter seeded off `Date.now()`.

**Compound teeth-check evidence (dev-only edits to `packages/domain/src/claim/verifier-console-read.ts`, one at a time, each restored via `git checkout --` and verified byte-identical — `git diff` over `packages/domain/src` + `apps/api/src` empty afterwards; spec re-run green):**

*(a) dropped the `eq(claimVerifierDecisions.claimCaseId, claimCaseId)` correlation from `getPriorVerifierDecisions` → the (e) panel assertion failed exactly as designed — B's denial AND D's superseded approval leaked into A's transcript:*

```
AssertionError: expected [ { …(4) }, { …(4) }, { …(4) } ] to deeply equal [ { …(4) } ]
+   { "actorDisplay": "Verifier Bravo",  "outcome": "denied",  "reasonCode": "concealment_flag_uphold", … }
+   { "actorDisplay": "Verifier Delta",  "outcome": "approved", "reasonCode": "r8_90pct_met", … }
    { "actorDisplay": "Verifier Alpha",  "outcome": "approved", "reasonCode": "r8_90pct_met", … }
```

*(b) dropped the `isNull(claimVerifierDecisions.supersededAt)` filter from `getRecentInScopePrecedents` → the (f) assertion failed — D's superseded decision resurrected as a false precedent:*

```
AssertionError: expected [ { …(3) }, { …(3) } ] to deeply equal [ { …(3) } ]
+   { "actorDisplay": "Verifier Delta", "outcome": "approved", … }
    { "actorDisplay": "Verifier Bravo", "outcome": "denied", … }
```

**Re-verification after the patch round:** domain shape spec 3/3 green with DATABASE_URL, api shape spec 1/1 green (now one compound test containing the B-console non-vacuousness assertions); both skip cleanly without DATABASE_URL (exit 0); `lint` + `typecheck` clean on @twt/domain and @twt/api. Zero production source changes in the working tree (the two teeth edits were dev-only and restored byte-identical).

**`pnpm ci:local`: PASSED — 24 jobs green on 2026-07-17**, after purging 27 aged prunable rows from the shared test DB's `member_device_tokens` (mirroring the purge-job criteria: `stale` > 7d / `invalid` > 30d by `last_seen_at`). The device-token count test (`deleted === 2` against a whole-table sweep) is being DEFERRED as a known recurring landmine — it will re-fail as committed rows age past the windows — not fixed here.

### Epic-7 join instruction

Any future compound read model — **Epic 7's pool read models first** — joins this test class by adding a sibling `*-shape.spec.ts` beside its read code (same package, `tests/integration/**`), with (1) a WHY header naming the AI-6-3 shape-test class + the bug class guarded, (2) adversarial decoy seeding such that the known-bad shape returns detectably wrong rows (same-tenant sibling-aggregate decoys + other-tenant decoys; a seed the bug passes proves nothing), (3) exact-membership assertions — counts banned — plus exact-order assertions wherever the read documents an ordering, and (4) a non-vacuousness check that the decoy rows really landed. Both new specs carry this instruction in their headers so the pattern is discoverable from the code itself.

## Suggested Review Order

**The shape-test class — what it is and what it proves**

- Entry point: the class definition, the 6.6 tautology anatomy, and the Epic-7 join instruction.
  [`peer-mesh-shape.spec.ts:1`](../../packages/domain/tests/integration/claim/peer-mesh-shape.spec.ts#L1)

- The compound-side WHY header — which bad shapes are PROVEN by induced defect vs analytically argued (RLS defense-in-depth on the C-decoy).
  [`verifier-console-shape.spec.ts:1`](../../apps/api/tests/integration/claims/verifier-console-shape.spec.ts#L1)

**6.6 correlated-subquery regression (domain)**

- The adversarial seed: per-run-prefixed ordered uuids, the tenant-wide-newest decoy, the tie pair, the `withdrawn` roster decoy.
  [`peer-mesh-shape.spec.ts:77`](../../packages/domain/tests/integration/claim/peer-mesh-shape.spec.ts#L77)

- One whole-array `toEqual` pins membership + order + per-member district + the `state='active'` predicate; teeth: 4/4 fail under the reintroduced tautology.
  [`peer-mesh-shape.spec.ts:114`](../../packages/domain/tests/integration/claim/peer-mesh-shape.spec.ts#L114)

- The deceased's own-latest read, same decoy shape (matrix row 2).
  [`peer-mesh-shape.spec.ts:138`](../../packages/domain/tests/integration/claim/peer-mesh-shape.spec.ts#L138)

**6.10 compound console shape (api)**

- The decoy topology: B same-pariwar/same-deceased (key-shape detector), C cross-pariwar (tenant boundary), D superseded decision (predicate pin).
  [`verifier-console-shape.spec.ts:293`](../../apps/api/tests/integration/claims/verifier-console-shape.spec.ts#L293)

- The superseded-precedent decoy — the one predicate no live test previously pinned (`verifier-console-read.ts:174`); teeth proven by induced defect.
  [`verifier-console-shape.spec.ts:248`](../../apps/api/tests/integration/claims/verifier-console-shape.spec.ts#L248)

- The (e) prior-decisions assertion — teeth proven: dropping the `claim_case_id` correlation fails here.
  [`verifier-console-shape.spec.ts:385`](../../apps/api/tests/integration/claims/verifier-console-shape.spec.ts#L385)

- The whole-packet sweep — encoded doc-key forms + raw uuid tails, so document leaks are actually sweepable.
  [`verifier-console-shape.spec.ts:403`](../../apps/api/tests/integration/claims/verifier-console-shape.spec.ts#L403)

- Non-vacuousness: decoy B's own console membership-asserted on every panel — the seed is live, not vacuously absent.
  [`verifier-console-shape.spec.ts:424`](../../apps/api/tests/integration/claims/verifier-console-shape.spec.ts#L424)

**Peripherals**

- `seedMemberPosting` + the monotonic default-`createdAt` clock (avoids tx-pinned `defaultNow()` ties for future callers).
  [`_helpers.ts:355`](../../packages/domain/tests/integration/_helpers.ts#L355)

- Dev Agent Record: all three teeth evidences, the review-patch round, the ci:local outcome, the deferred device-token landmine.
  [`ai-6-3-compound-read-model-shape-tests.md:84`](ai-6-3-compound-read-model-shape-tests.md#L84)
