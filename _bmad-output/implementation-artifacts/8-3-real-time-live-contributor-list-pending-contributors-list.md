---
baseline_commit: b5128a9abe0d56a95888587f08974a545876b5c3
---

# Story 8.3: Real-Time Live Contributor List (FR-24) + Pending Contributors List (FR-25 `[v1-S]`)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As any pool member viewing their live pool (and, downstream, any visitor on the Sahyog Vivran public page — Epic 11b),
I want to see the **real-time list of confirmed contributors** (first-name + last-initial only) — kept strictly separate from any pending-but-not-yet-confirmed contributors — with confirmation visibility deriving **exclusively from Epic 9 reconciliation**,
So that the published contributor list reflects only actually-confirmed contributions and never leaks unverified yellow-pill / self-attested states as confirmed.

## Scope — what belongs to 8.3 vs what is a reserved seam

> **Story 8.3 owns a READ VIEW + its INVARIANT TEETH, not a producer.** It reads `contribution.confirmed` event-derived state (Epic 9's producer, unbuilt) and renders it. It never confirms, never promotes, never mutates contribution state. The confirmed numerator is honestly **empty today** and that is correct — do NOT fake rows (`[[feedback_record_unattested_no_backfill]]`). The story's real deliverable is the read model + the query-layer confirmed-only guard + the virtualized surface + the CI teeth, **encoded before any producer exists so yellow can never leak once 8.4/Epic 9 land.**

Story 8.3 is `[CONSUMER]`. It is the sibling of 8.2 (`<ActiveContributionCard>`): same server-authoritative thin-read-seam discipline (`member-pool/` module, `RenewalStatusWidget` posture), extended from the aggregate progress meter (8.2) to the **named contributor rows** (this story).

| Belongs to 8.3 (this story) | Deferred — reserved seam (do NOT build here) |
|---|---|
| The **confirmed-contributor read view** — a domain read that sources **exclusively** from `contribution.confirmed` event-derived state (empty until Epic 9), returning contributor `first_name + last_initial` (PII-shielded) | The **`contribution.confirmed` producer** + the contribution state machine + the yellow→green flip → **Epic 9** reconciliation. 8.3 reads it; it never produces it (the epic's exclusive-ownership fence, `epics.md:2855`) |
| The **pending-contributors count + percentage** (FR-25 `[v1-S]`) — `pendingCount = rosterSize − confirmedCount`, plus percentage; **NO member-identifying details** on this list (privacy hardening, see D3) | The **`contribution.utr-attested` producer** (Story 8.4) that yellow-pills a member. 8.3 reads neither yellow identities nor yellow counts into the confirmed list; the pending count is roster-minus-confirmed, not attested-derived (D3) |
| The **server-authoritative read model** (confirmed contributor rows + pending count/pct + pool identity) + its **API endpoint** + **`@twt/api-client` SDK method** + **`@twt/contracts` response shape** (`.strict()`, PII-shielded, **no yellow/pending-identity field**) | The **public Sahyog Vivran render** (FR-24 consequence: "public version on the Sahyog Vivran page, FR-77") → **Epic 11b**. 8.3 designs the read model to serve it, but the public Astro/API render is 11b's consumer — and so is the **PII-matrix entry** (deferred to Story 11a.1, D11) |
| The **`<PoolContributorList>` mobile component** — virtualized (FlashList, already a dep), confirmed rows + pending count/pct, self-suppressing + fail-soft + accessible; surfaced on a member-facing live-pool view the My Pool card links to | The **My Pool card internals** (8.2, shipped) — do NOT re-implement the card. 8.3 adds the **link/affordance + the contributor-list view**; the card already renders the aggregate meter (8.2 scope table) |
| The **reconciliation-confirmed-only visibility invariant** enforced at the **query layer** (the read cannot accept `pending \| yellow \| unconfirmed`) + a **CI test** asserting no endpoint surfaces a yellow/pending contribution as confirmed | The **real-time push transport** (websocket/SSE). No such infra exists; v1 "near-real-time" = React Query polling / refetch-on-foreground (D6). A push channel is a deferred seam — and moot today since there are 0 confirmed events to push. Also deferred: the **PII-scrape matrix entry itself** (Story 1.16b's scaffold is Epic-11a-trustee-attested-only territory — see D11) |

## Acceptance Criteria

**AC1 — Confirmed contributor list sources EXCLUSIVELY from reconciliation-confirmed state (the load-bearing invariant).**
Given FR-24 + the epic's reconciliation-confirmed-only visibility invariant (`epics.md:2909-2915`) + Epic 9 as the sole `contribution.confirmed` producer (not built),
When the live confirmed-contributor list is resolved for a pool,
Then it contains **only** contributors derived from `contribution.confirmed` event-derived state (green-pill), showing **`first_name + last_initial` only** (PII-shielded per the Story 1.16b discipline — never full names, never phone/bank/nominee data, never Tier-1 ciphertext);
And it is legitimately **empty** today (Epic 9's producer does not exist → 0 confirmed → `[]`) — the empty list is rendered honestly, never faked (`[[feedback_record_unattested_no_backfill]]`);
And **the data model forbids the alternative at the query layer**: the confirmed-contributors read has **no parameter and no field** that could admit `pending \| yellow \| unconfirmed \| attested` state — yellow (Story 8.4 intent) is structurally unable to reach this list before it even exists;
And the read is **server-authoritative**: one SDK call returns the fully-resolved list model; the client resolves nothing about confirmation status (the 8.2 `member-pool` posture).

**AC2 — Pending contributors = count + percentage only, NO member-identifying details (FR-25 `[v1-S]`, privacy-hardened).**
Given FR-25 `[v1-S]` + the epic's privacy carve (`epics.md:2906`: "member-identifying details are not shown on this list") + the pool roster from the assignment snapshot,
When the pending-contributors data is resolved,
Then it exposes **`pendingCount` + `pendingPercentage` ONLY** — computed as `rosterSize − confirmedCount` over the pool roster (`resolveAssignedPoolWithRosterForMember`'s `memberIds.length`) — with **no names, no identifiers, no per-member rows** for pending members (the peer-accountability signal is aggregate, never a public "who hasn't paid" shame list);
And this **deliberately hardens PRD FR-24/25's original "see who has *not yet* contributed"** into an aggregate signal — flag the PRD-vs-epic reconciliation in the Dev Agent Record (the epic is the authoritative implementation spec; the PRD's identifying framing is superseded by the privacy carve);
And with 0 confirmed today, `pendingCount == rosterSize` and `pendingPercentage == 100%` (or `0 of 0 → 0%` for an empty roster) — honest, not stubbed.

**AC3 — Lists are virtualized (UX-DR80) using the ratified library.**
Given UX-DR80 (virtualization, `epics.md:2907`; architecture §4.6 "Surfaces requiring virtualization" + "FlashList for lists above the threshold") + the canonical scale (50–500 Yogdaan Bahi; **up to ~16k** on Sahyog contributor scroll),
When the confirmed-contributor list renders,
Then it is virtualized with **`@shopify/flash-list`** (already a dependency, `apps/mobile/package.json` `^2.3.1`, and the ratified P0-5 choice — reuse the `ShradhanjaliSahyogVivran` FlashList pattern including the `FlashList as any` React-19 + new-arch prop-typing cast, `apps/mobile/components/shradhanjali/ShradhanjaliSahyogVivran.tsx:182`), **no full-set render into the native view** (the architecture-committed property);
And the empty state (0 confirmed today) renders a calm, non-alarming placeholder (not an error; a low/empty list is not a failure — the 8.2 "low meter is not danger" register), and pending is shown as the aggregate count/percentage strip;
And the empty-state copy **reports state, never attributes responsibility**: "No confirmed contributions yet." — NOT "Nobody has contributed." / "No one has paid." (the latter subtly blames the pool; the former simply states the reconciliation status). Same discipline for the pending strip — aggregate, neutral, no shame framing (the FR-25 coercion-risk note, D3).

**AC4 — Reconciliation-confirmed-only visibility invariant is CI-enforced across every surface (this story's teeth).**
Given the invariant that **contributor visibility derives exclusively from `contribution.confirmed`** and that **yellow-pill / self-attested states must NEVER appear as confirmed** (`epics.md:2911-2915`),
When the contributor-list surfaces (member live-pool view, and — eventually, via a Story 11a.1 matrix entry, D11 — the future Sahyog Vivran public render) are checked in CI,
Then a **CI test asserts no API endpoint surfaces a `yellow_pill` / `pending` / `attested` contribution as a confirmed contributor**; mixing the two states across any surface **fails the test** (author the assertion so it would genuinely bite if a future dev added a yellow-fed field — the decoy-teeth discipline, `[[feedback_gate_scope_semantic_coverage]]`);
And the **compound-read-model shape test** (contracts `.strict()`) REJECTS any `pending`/`yellow`/`attested`/`utr` contributor field and any ciphertext/full-name/phone/bank field (the AI-6-3-carry pattern 8.2 established);
And the **PII-scrape matrix entry itself is deferred, not built in 8.3** (see D11 — the scaffold `packages/contracts/public-pages/public-vs-private-matrix.yaml` is Epic 11a/Story 11a.1's trustee-attested-only territory, `epics.md:3602`; 8.3 does not add a surface to it). The invariant this AC actually needs — that no endpoint surfaces yellow/pending as confirmed — is enforced **now** by the AC4 CI test + the `.strict()` shape test (Task 5), which require no matrix entry to have teeth.

**AC5 — Near-real-time contributor updates on `contribution.confirmed` (transport-honest).**
> Naming note: "near-real-time," not "real-time" — the update mechanism is polling-based refresh (D6), not a push socket. The word is chosen deliberately so a reviewer reading the AC title alone does not assume a websocket/SSE guarantee the stack does not make.
Given a member's contribution flips yellow→green via Epic 9 reconciliation (`epics.md:2917-2919`),
When Epic 9 emits `contribution.confirmed`,
Then the contributor **appears on the confirmed list** and the **pending count decrements** on the next read — realized as **React Query near-real-time refresh** (refetch-on-foreground + a bounded `refetchInterval`, the MMKV-persisted client, D6), NOT a websocket/SSE push (no such infra; a push transport is a documented seam);
And because Epic 9's producer is unbuilt, this path is **structurally correct but exercises empty today** — the read is wired to source from `contribution.confirmed` so that when Epic 9 lands, the list populates with **zero changes to this story's code** (the 8.1→8.2 "read the projection the producer will fill" pattern);
And the My Pool card's confirmed progress meter (8.2) and this list read the **same** confirmed source, so they can never disagree.

**AC6 — Accessibility (inherited Story 0.10 P0-2c gate).**
Given the inherited accessibility gate (Story 0.10 P0-2c — Reena-class data-cost + status-anxiety) + the 8.2 a11y posture,
When the list renders for assistive-tech users,
Then contributor rows are **semantically labeled** (`accessibilityRole`, per-row `accessibilityLabel` = "[first name] [last initial], confirmed contributor"); the pending **count/percentage strip is announced `accessibilityLiveRegion="polite"`** (ambient status, never `assertive`); the list is keyboard/screen-reader traversable; Devanagari renders without clipping at 360px; grade-6 reading level for all copy;
And **operational figures render in Latin numerals even in Hindi** (amendment-A2 — counts, percentages, `X of N`), NOT `toHindiNumeral` (the 8.2 D6 discipline; the microcopy UX-DR73 gate enforces it).

## Tasks / Subtasks

- [x] **Task 1 — Confirmed-contributor domain read (confirmed-only) + roster reuse (AC1, AC2).**
  - [x] Author `listConfirmedContributorsForPool(db, { pariwarId, cycleId, poolId })` in `packages/domain/src/` (co-locate with the contribution/alert reads — e.g. a new `contribution/read.ts`, or extend `alert/read.ts`'s neighborhood; keep it a transport-free PRIMITIVE: NO HTTP, NO decryption — the boundary decrypts). It sources **exclusively** from `contribution.confirmed` event-derived state: read `events_log` for `event_type = 'contribution.confirmed'` scoped to the pool (the domain-reads-`events_log`-directly pattern, `[[project_member_lifecycle_domain_substrate]]`; there is **no** `contributions` projection table and 8.3 does **NOT** create one — that substrate is Epic 9's). Return `{ memberId }[]` (identities only; the boundary decrypts to first+last-initial). **Empty today** (no producer). Structurally forbid a yellow path: the function has no `status`/`state` parameter — it hard-filters `contribution.confirmed` in the query.
  - [x] Reuse `resolveAssignedPoolWithRosterForMember` / `resolveAssignedPoolWithRosterFromCandidates` (`packages/domain/src/pool/contribution-binding.ts:346,373`) for the roster (`memberIds.length` = pending denominator). Do NOT re-derive the roster.
  - [x] Pure, DB-free `computePendingAggregate({ rosterSize, confirmedCount }) → { pendingCount, pendingPercentage }` (clamp: empty roster → `0`/`0%`; percentage integer-rounded, Latin). Unit-test at 0-confirmed, all-confirmed, empty-roster boundaries.

- [x] **Task 2 — Response contract (`.strict()`, PII-shielded, no-yellow-field decoy teeth) (AC1, AC2, AC4).**
  - [x] Author `packages/contracts/src/contributions/pool-contributor-list.ts` (the dir exists; `active-contribution-card.ts` is the 8.2 sibling — same `.strict()` + no-type-shadowing discipline, `contributions/README.md`). Shape: `{ pool: { letterCode, name | null, canonicalIdentifier }, confirmed: { firstName, lastInitial }[], pending: { count, percentage } }`. Every object `.strict()`. **NO** `status`/`yellow`/`attested`/`utr`/`pending`-member-identity field anywhere; **NO** ciphertext/full-name/phone/bank field (AC4 shape-test rejects them). Export from the contributions barrel + contracts `index.ts`.
  - [x] Register in `packages/api-client/src/index.ts` inside `createMemberAuthClient` — mirror `memberActiveContribution()` (the 8.2 SDK method): Zod-validated response, `auth: true`, export the `…Result` type alias.

- [x] **Task 3 — API read endpoint (AC1, AC2, AC5, AC6).** Extend the 8.2 `member-pool/` module (sibling read, no new module needed).
  - [x] Route `GET /api/v1/member/pool-contributors` in `apps/api/src/modules/member-pool/` (member-session-gated via `requireMemberSession`; auto-covered by the Story 1.14 login-wall gate — do NOT add to the public allowlist). Register alongside the existing `member-pool` route in `routes.ts`.
  - [x] Resolution pipeline (server-authoritative, mirrors 8.2 `handlers.ts`): (1) `getMemberStateAt` — not `active` → empty/self-suppress model; (2) `listLiveAlertsForPariwar` (`packages/domain/src/alert/read.ts`) → the live cycles; (3) `resolveAssignedPoolWithRosterForMember` → the member's pool + roster (the D7 soonest-closing tie-break for multi-pool, reuse 8.2's rule); (4) `listConfirmedContributorsForPool` → confirmed member IDs; (5) decrypt each confirmed member's **own** KYC name at the **member-session** read layer (`decryptKycField` via `member_kyc_profiles.nameCiphertext`) + `splitFirstNameLastInitial` (the util 8.2 added, `apps/api/src/modules/member-pool/name.ts`) → first+last-initial; (6) `computePendingAggregate`; (7) resolve pool letter-code/name (`reserveNames` fallback, reuse 8.2). **Fail-soft**: any absent/malformed input or thrown error → an empty-but-valid model (never a 500 — the surface self-suppresses, the 8.2 AC1 posture).
  - [x] **Per-request decrypt-cost note (D5):** confirmed contributors are pool members whose names are Tier-1 KMS-encrypted. Decrypt at the member-session layer (NOT the admin `member.view_validity` path). Today the confirmed set is **empty**, so there is 0 decrypt cost now; when Epic 9 populates it, this is up to `rosterSize` decrypts per read — flag a batching/caching seam in code + the Dev Agent Record (do NOT prematurely build a plaintext cache; `[[project_validity_cache_failopen_pattern]]` — never at rest).

- [x] **Task 4 — `<PoolContributorList>` mobile component + virtualization + home wiring (AC1, AC2, AC3, AC6).**
  - [x] New `apps/mobile/components/contributor-list/{PoolContributorList.tsx,usePoolContributorsQuery.ts}` — mirror the 8.2 `active-contribution/` structure (React Query + `memberAuth` SDK, `useT()`/`useLocale()`, self-suppression, fail-soft, Latin operational numerals, ARIA-live polite).
  - [x] Virtualize the confirmed rows with **`@shopify/flash-list`**, reusing the `ShradhanjaliSahyogVivran` pattern (`FlashList as any` cast + bounded height + `nestedScrollEnabled` handling, `components/shradhanjali/ShradhanjaliSahyogVivran.tsx:174-190`). Row = `first_name last_initial` (passbook register, hairline rules, no fintech chrome — reuse `@twt/tokens`/Tamagui, never hard-coded colors). Empty state = calm placeholder copy (i18n `contribution` namespace, hi+en parity).
  - [x] Pending strip = aggregate `pendingCount` / `pendingPercentage` only (NO per-member rows), `accessibilityLiveRegion="polite"`.
  - [x] **Surface it on a member-facing live-pool view the My Pool card links to** (do NOT re-render inside the 8.2 card — 8.2 owns the card's aggregate meter). Add a ≥44pt "View contributors" affordance on/near the card that navigates to the contributor-list view; keep the composition seam explicit. Offline: the query uses the shared MMKV-persisted `PersistQueryClientProvider` (no per-query wiring).

- [x] **Task 5 — Confirmed-only invariant teeth: CI test + shape test + PII matrix (AC4).**
  - [x] **Compound-read-model shape test** (`packages/contracts/tests/contributions.test.ts` — extend the 8.2 file): `.strict()` REJECTS any `status`/`yellow`/`attested`/`utr`/pending-identity field on the contributor-list shape + any ciphertext/full-name/phone/bank field; the confirmed-row + pending-aggregate shapes parse. Decoy-teeth (`[[feedback_gate_scope_semantic_coverage]]`).
  - [x] **Confirmed-only endpoint/domain test**: assert `listConfirmedContributorsForPool` sources only `contribution.confirmed` — seed a (hand-crafted) `contribution.utr-attested`/yellow event in `events_log` and assert it does **NOT** appear in the confirmed list (the invariant would genuinely bite; yellow is introduced by 8.4 but the guard must exist before it can be violated). If seeding a not-yet-defined event type is impractical, assert the query's `event_type` filter is `contribution.confirmed` exactly + that no `status`/`state` parameter exists (structural teeth).
  - [x] **PII-scrape matrix entry — deferred, do NOT add in 8.3** (D11): `packages/contracts/public-pages/public-vs-private-matrix.yaml` is a Story 1.16b scaffold whose own header + Story 11a.1's AC (`epics.md:3602`) require **trustee-attested PR approval for any addition**, not just Epic 11a doing the populating. 8.3 has no trustee-attestation step and must not silently add a surface. Confirm `pnpm turbo run contracts:check-pii-scrape` stays green as-is (empty matrix → no-op — nothing to do here). **Resolved via explicit deferral; re-trigger: Story 11a.1's trustee-attested matrix population** (that story adds the `live-contributor-list` surface using this story's already-shipped `.strict()` shape + CI test as its reference).

- [x] **Task 6 — Copy + i18n parity + microcopy gate (AC2, AC3, AC6).**
  - [x] Add contributor-list keys to `packages/i18n/locales/{hi,en}/contribution.json` (namespace exists, already in the microcopy `copy_globs` since 8.2): confirmed-list header, empty-state placeholder, pending count/percentage strip, per-row + strip a11y labels. Grade-6; interpolate counts/percentages in **Latin** (amendment-A2). Hi+en parity (`pnpm i18n:check`).
  - [x] **Empty-state copy reports state, not blame (AC3):** "No confirmed contributions yet." / "अभी तक कोई पुष्टि किया गया योगदान नहीं" — NOT "Nobody has contributed." The empty list means *reconciliation hasn't confirmed anyone yet* (and today, that the producer is unbuilt), not that the pool failed to act.
  - [x] No scarcity/panic/shame framing on the pending strip (the FR-25 `[NOTE FOR PM]` coercion risk — keep it neutral/aggregate). Run `pnpm microcopy:check` — must pass.

- [x] **Task 7 — Tests (AC1–AC6).**
  - [x] **DB-free unit:** `computePendingAggregate` boundaries (0/all/empty-roster); the confirmed-only structural guard; the shape test (Task 5).
  - [x] **Live-DB integration** (`packages/domain/tests/integration/`, `twt-test-pg` :5433, `describe.skipIf(!hasDatabase)`, `setupLiveDb()`, reuse `seedAlert`/`seedPool`/`PARIWAR_A`/`enterAppScope`): `listConfirmedContributorsForPool` empty-when-no-confirmed + tenant isolation; the yellow-event-excluded assertion (Task 5); roster-driven pending denominator. Own-committing writers accumulate → assert membership not counts; no migration regen; no `DROP SCHEMA` (`[[project_live_db_test_gotchas]]`). Suite-level `{timeout:20000}` if it trips the concurrent-load class (`[[project_known_livedb_test_failures]]`).
  - [x] **Component logic:** no RN mount-test harness in-repo (`apps/mobile/vitest.config.ts` node-only, the Story 6.2 precedent) — cover the testable logic (pending aggregate, self-suppression discriminator, a11y copy keys via the parity gate) with pure units; note the mount-test infeasibility.

- [x] **Task 8 — Sprint-status ledger, friction-budget disposition, regression.**
  - [x] Add the **Story 8.3 disposition entry** to `friction-budget.md` (the 8.2/3.7/3.8 precedent): read-only, conditionally-rendered, virtualized member surface; no urgency theater; page-weight baseline unchanged unless a new public render lands (it does not — 11b owns that). Do NOT raise the friction baseline (`[[project_friction_budget_baseline_ratchet]]`).
  - [x] Flip `development_status[8-3-…]` → `review` + add the top-of-file reverse-chron COMMENT ledger entry (`[[project_sprint_status_ledger]]`).
  - [x] Run `pnpm ci:local` (DB on :5433) — all jobs green (`[[project_ci_actions_suspension_local_mirror]]`; `--concurrency=4` in ci-local.sh, `[[project_ci_local_concurrency_oversubscription]]`). `microcopy` + `i18n-parity` + `pii-scrape` + the new shape/confirmed-only tests are load-bearing for "done."

### Review Findings

- [x] [Review][Patch] `<ViewContributorsEntry>` gates on the wrong precondition, can hide a working list — the CTA reuses the 8.2 card's `useActiveContributionQuery`, which additionally requires the DECEASED member's KYC name to resolve (`resolveCard` returns `UNASSIGNED` if that name is empty/unresolvable). `resolveContributorList` (the actual list) never touches the deceased member's name at all — it only needs `resolveMemberLivePool`. So if the deceased member's KYC name is corrupt/unresolvable, the "View contributors" affordance vanishes even though the contributor list itself would render correctly (including a legitimate empty-confirmed state). This contradicts the D8 "lock-step" self-suppression claim in the Dev Agent Record and is untested. **Resolution (human call):** switch the CTA to gate on `usePoolContributorsQuery` (the same query the destination screen uses) instead of the card's `useActiveContributionQuery` — guarantees the CTA and the list agree exactly, at the cost of one extra fetch on the home screen. [`apps/mobile/components/contributor-list/ViewContributorsEntry.tsx`, `apps/api/src/modules/member-pool/handlers.ts:330-357`]

- [x] [Review][Patch] KYC decrypt failure for one confirmed contributor blanks the ENTIRE list, not just that row — `decryptKycField` (handlers.ts:213) is called unguarded inside the per-contributor loop, unlike the adjacent null-profile check (lines 206-212) which correctly skips-and-continues. If decrypt throws (bad ciphertext, transient KMS error), it propagates out of `resolveContributorList` to the outer `catch` in `poolContributors`, which fail-softs the WHOLE response to `{ assigned: false }` — hiding every already-resolved confirmed row and the pending aggregate, not just the one bad row. This directly undermines the stated invariant "the aggregate never understates confirmation." Fix: wrap the `decryptKycField`/`splitFirstNameLastInitial` call in the same skip-and-log pattern as the null-profile branch. [`apps/api/src/modules/member-pool/handlers.ts:213`]

- [x] [Review][Patch] `<PoolContributorList>` shows a false "you have no pool" message while loading — the guard `if (!data || !data.assigned)` (PoolContributorList.tsx:55) is shared by the loading state (data undefined), the true-absent state, and any error, and renders the visible copy `contributor_list.no_pool` ("You have no live pool right now.") in all three cases. Since this screen is only reached via `<ViewContributorsEntry>`, which already confirmed the member IS assigned, every navigation to this screen shows a momentarily false claim before the real data arrives. This diverges from 8.2's card, which self-suppresses to nothing (`return null`) rather than asserting a visible (and here, false) claim during load. Fix: distinguish `isLoading` from true absence and show a neutral loading state (or nothing) instead of the "no pool" copy. [`apps/mobile/components/contributor-list/PoolContributorList.tsx:55-63`]

- [x] [Review][Patch] REAL GAP (load-bearing checklist family 7 — Aggregate correctness) — no test exercises the handler-level path where `confirmedCount` (used for the pending aggregate, `confirmed.length`) diverges from `rows.length` (the visible rows) because a KYC name was unresolvable. Only the pure `computePendingAggregate` math is unit-tested; the actual wiring in `resolveContributorList` that keeps the aggregate keyed on `confirmed.length` rather than `rows.length` has no test asserting it. A future refactor swapping one for the other would silently regress the "aggregate never understates confirmation" invariant with nothing to catch it. Fix: add an integration test seeding a confirmed member with an unresolvable/null KYC profile and assert `pending.count`/`pending.percentage` still reflect the true confirmed total. [`apps/api/src/modules/member-pool/handlers.ts:203-228`, `packages/domain/tests/integration/contribution/confirmed-contributors.spec.ts`]

- [x] [Review][Patch] Comment overclaims the polling posture is shared with other surfaces — `usePoolContributorsQuery.ts` states the near-real-time interval is "the same posture every other member surface uses," but neither the 8.2 `useActiveContributionQuery` nor the 3.8 renewal-status query sets any `refetchInterval` at all (they rely solely on the default `staleTime`). 8.3 introduces genuinely new polling behavior, not a reused one. Low severity — correct the comment wording so it doesn't misstate precedent for a future reader. [`apps/mobile/components/contributor-list/usePoolContributorsQuery.ts:10-24`]

- [x] [Review][Defer] `payload ->> 'poolId'` jsonb-text-extraction filter has no supporting expression index [`packages/domain/src/contribution/read.ts:90-104`] — deferred, pre-existing pattern (matches `member/overlay.ts`'s `payload ->> 'deceased_member_id'` predicate already in the codebase) and mitigated by the leading indexed `pariwar_id` scope; not a regression introduced by this diff.

- [x] [Review][Defer] Sequential per-contributor KYC decrypt loop (N+1), no batching primitive stubbed [`apps/api/src/modules/member-pool/handlers.ts:203-220`] — deferred, explicitly disclosed as the D5 seam in the story's own Dev Notes ("do NOT build the cache here"); moot today at 0 confirmed contributors.

- [x] [Review][Defer] `ConfirmedContributorRow.lastInitial` (`.max(16)`) doesn't structurally guarantee "initial-only" — a full surname would pass the schema; enforcement lives entirely in `splitFirstNameLastInitial`, outside this diff [`packages/contracts/src/contributions/pool-contributor-list.ts:41-50`] — deferred, mirrors the already-shipped 8.2 `deceasedLastInitial` bound verbatim; not a new risk introduced by 8.3.

- [x] [Review][Defer] FlashList `keyExtractor` includes `index`, so identity churns whenever a newly-confirmed member sorts ahead of existing rows, weakening virtualization recycling across the 60s poll [`apps/mobile/components/contributor-list/PoolContributorList.tsx:124-126`] — deferred, low-impact at this story's actual scale (pool roster, dozens, not the ~16k Sahyog Vivran scale), and removing `index` risks duplicate-key collisions since the PII-shielded shape carries no stable per-member identifier.

- [x] [Review][Defer] No cross-check that a `contribution.confirmed` event's `memberId` is actually a member of the pool's roster (stale/duplicate `poolId`, future producer bug) [`packages/domain/src/contribution/read.ts:86-113`] — deferred, this is a forward invariant on Epic 9's not-yet-built producer; not constructible/testable until that producer exists (D2/D10).

## Dev Notes

### D0 — Read Story 8.2 first; this is its sibling, and reuse its module wholesale
8.2 shipped the `member-pool/` API module, the `member-session` name-decrypt + `splitFirstNameLastInitial` util, the `contributions/` read-model contract pattern, the `RenewalStatusWidget`-style mobile widget, and the "presentation, not lifecycle" discipline. 8.3 **extends** all of these — a second route in `member-pool/`, a second contract in `contributions/`, a second mobile component in the same idiom. Do **NOT** stand up a new module or re-invent the decrypt/name-split/fail-soft plumbing. The one genuinely new thing is the `contribution.confirmed` domain read (Task 1) and the virtualized list (Task 4).

### D1 — The confirmed-only invariant is the ENTIRE point of this story
This is 8.2's AC4 (confirmed-only progress meter) generalized to **named rows**. The governing sentence, verbatim from 8.2 D4: *"the progress meter/list reflects money CONFIRMED BY RECONCILIATION, not participant intent."* A yellow / self-attested / pending contribution is a member's *claim that they paid* — it is not confirmed money and must never appear as a confirmed contributor. The epic repeats this four times (`epics.md:2911-2915`). Encode the teeth **now**, before 8.4 introduces yellow and before Epic 9 introduces green — so the leak is structurally impossible the moment either lands. The read model must have **no field and no parameter** that could carry pending/yellow state to the confirmed surface.

### D2 — Honestly empty today; do NOT fake rows
Epic 9 owns the `contribution.confirmed` producer and is unbuilt, so the confirmed list is `[]` and pending is `100% of roster` right now. That is **correct and honest**, not a stub to fill (`[[feedback_record_unattested_no_backfill]]`). Render an empty confirmed list + a full-pending aggregate. When 8.4 (yellow attest) and Epic 9 (green confirm) land, they fill the `contribution.confirmed` source and this surface populates with **zero code changes here** — exactly how 8.2's meter reads `0 of N` today and increments later.

### D3 — Pending is AGGREGATE ONLY — a deliberate privacy hardening over the PRD
PRD FR-24/25 originally frame pending as "see **who** has not yet contributed" (identifying, a peer-accountability signal, `prd.md:552-556`). The **epic supersedes this** for privacy: "member-identifying details are **not** shown on this list" (`epics.md:2906`) — pending is **count + percentage only**, no names, no per-member rows, no "who hasn't paid" shame list. Follow the epic (the authoritative implementation spec); the PRD's `[NOTE FOR PM]` even flags the coercion risk this hardening resolves. State the reconciliation explicitly in the Dev Agent Record (the 8.2 D6/spec-reconciliation discipline). Compute pending as `rosterSize − confirmedCount` (from the pool snapshot roster + the confirmed read) — **not** from attested/yellow state (which doesn't exist yet and would leak intent-as-shortfall).

### D4 — Contributor names are the CONTRIBUTOR's own name, not the deceased member's
8.2 decrypted the **deceased member** (the family being supported). 8.3 decrypts each **confirmed contributor's own** KYC name → `first_name + last_initial`. Different subject, same mechanism: member-session-layer `decryptKycField` over `member_kyc_profiles.nameCiphertext` + the `splitFirstNameLastInitial` util 8.2 already added (`apps/api/src/modules/member-pool/name.ts`). Reuse it; do not re-write a name splitter. No DPDPA consent gate applies (the same 8.2 D11 reasoning: a co-pool member seeing who-else-confirmed in the pool they're in is not a claim-processing/disbursement action on protected data — state this as a decision, not a silent omission).

### D5 — Decrypt cost is real once populated; batch/seam it, don't pre-optimize
Today: 0 confirmed → 0 decrypts. Once Epic 9 populates: up to `rosterSize` (≤ pool size) Tier-1 KMS decrypts per read of a public-ish list. This is the exact tension 8.2 D11 flagged. For 8.3, decrypt only the **confirmed** subset (bounded by actual confirmations, typically ≪ roster early in a cycle), per-request only (never a persistent plaintext cache — `[[project_validity_cache_failopen_pattern]]`, "validity never decrypts Tier-1"). Flag a batch-decrypt + short-TTL read-model-cache seam in code + the Dev Agent Record for when confirmation volume grows (the Sahyog Vivran public render at 11b is where this actually bites — it's not member-session-gated). Do NOT build the cache in 8.3.

### D6 — "Real-time" = React Query polling; a push transport is a deferred seam
The epic says "within seconds (real-time update)" (`epics.md:2919`). There is **no** websocket/SSE infrastructure in the stack (Fastify + React Query + MMKV). v1 "near-real-time" is React Query **refetch-on-foreground + a bounded `refetchInterval`** — the same posture every other member surface uses. Name the websocket/SSE push as an explicit deferred seam in code + the Dev Agent Record. This is moot today anyway (0 confirmed events to push), so polling is honest and sufficient; do NOT build a realtime transport for an empty stream.

### D7 — Virtualization: FlashList is already chosen, already used — reuse the exact pattern
The "virtualization library choice" carried commitment (`[[project_epic7_carries_into_epic8]]`) is **resolved**: `@shopify/flash-list@^2.3.1` is a dependency (`apps/mobile/package.json`) and the ratified P0-5 choice for lists above the threshold (architecture §4.6). `ShradhanjaliSahyogVivran.tsx` already uses it for the 200–16k contributor scroll — including the **`FlashList as any` cast** working around a React-19 + new-arch prop-typing wrinkle (`:177-182`) and the nested-scroll handling (`:189`). **Reuse that exact pattern**; do not evaluate alternatives, do not fall back to `FlatList` for this scale. The architecture commits the *property* (no full-set render into the native view); FlashList satisfies it.

### D8 — Where the list lives: a member view the card links to, NOT inside the 8.2 card
8.2's scope table is explicit: the card "renders only the aggregate progress meter, **not** the named contributor rows" — those are 8.3. So 8.3 builds a **separate** member-facing live-pool view (or an expandable section) that the My Pool card links to via a ≥44pt affordance. Do NOT re-open or re-render the 8.2 card body. Keep the card ↔ list composition a clean navigation seam. The same read model is designed to also feed the Epic-11b public Sahyog Vivran render (a downstream consumer, not 8.3's build) — which is why the response shape is PII-shielded to public-tier from the start, even though the PII-matrix entry itself is deferred to Story 11a.1 (D11).

### D9 — Reuse, do NOT re-declare / re-invent
- **Alert/pool reads:** `listLiveAlertsForPariwar` (`packages/domain/src/alert/read.ts`), `resolveAssignedPoolWithRosterForMember` + `…FromCandidates` (`pool/contribution-binding.ts:373,346`), `getMemberStateAt` (`member/read.ts:88`), `pool/names.ts` (`reserveNames` letter-code fallback).
- **API scaffolding:** the 8.2 `member-pool/{handlers,routes,index}.ts` (add a second route), `openScopeTx`/`closeScopeTx`, `requireMemberSession`, the `member-home` `memberCtx` request-context pattern.
- **Name decrypt/split:** `decryptKycField` (`apps/api/src/modules/kyc/kyc-crypto.ts`) + `kycDomain.getMemberKycProfile(tx, pariwarId, memberId)` + `splitFirstNameLastInitial` (`apps/api/src/modules/member-pool/name.ts`) — the exact trio the 8.2 handler already imports (`member-pool/handlers.ts:52-54,211-214`); reuse verbatim, keying on the **contributor's own** `memberId` instead of the deceased member's.
- **SDK:** `createMemberAuthClient` GET pattern + the `memberActiveContribution()` method as the template (`api-client/src/index.ts`).
- **Contracts:** the `contributions/` dir + `active-contribution-card.ts` `.strict()`/discriminator style + the AI-6-3-carry shape test in `contracts/tests/contributions.test.ts`.
- **Mobile:** the `active-contribution/` widget structure (self-suppress, fail-soft, ARIA-live polite, Latin numerals); the `shradhanjali/ShradhanjaliSahyogVivran` FlashList pattern.
- **i18n/tokens:** `contribution` namespace (already in microcopy `copy_globs`), `useT()`/`useLocale()`, `i18n/number.ts` Latin-numeral helpers, `@twt/tokens`/Tamagui.
- **PII matrix:** do NOT touch `public-vs-private-matrix.yaml` in this story — see D11.

### D10 — Do NOT touch (frozen / other-epic-owned)
The alert state machine / projector / trigger (8.1), the pool spawn saga (7.x), the 8.2 card body, `deriveContributionReference` (8.4's), any Epic 9 reconciliation surface or the `contribution.confirmed` **producer**, the frozen `cycle.frozen` payload, `CANONICAL_CHANNEL_LADDER`/dispatch (Epic 5). 8.3 does **NOT** create a `contributions`/reconciliation projection table (Epic 9's substrate) — it reads `events_log` directly.

### D11 — Do NOT add a surface to `public-vs-private-matrix.yaml`; the AC4/Task-5 PII-matrix entry is deferred to Story 11a.1
The epic's own AC4 text ("PII scrape CI verifies the matrix entry for 'live contributor list' surfaces...", `epics.md:2915`) conflicts with a stronger, more specific governance rule elsewhere in the same planning corpus: Story 11a.1's AC (`epics.md:3602`) requires **trustee-attested PR approval for every matrix addition**, not only for visibility escalations — and Story 1.16b, the story that built the scaffold, states verbatim in its own file header and Dev Notes: *"Do NOT pre-populate real surfaces here — that is Epic 11a's [trustee-attested] job"* (`packages/contracts/public-pages/public-vs-private-matrix.yaml` header; `1-16b-pii-scrape-ci-gate.md`). The matrix is `surfaces: []` today — no story has ever added an entry, so 8.3 would be the first departure from that rule, and 8.3 has no trustee-attestation mechanism of its own.

**Resolution:** 8.3 does **NOT** edit `public-vs-private-matrix.yaml`. The confirmed-only visibility invariant this AC exists to protect is already enforced without a matrix entry: the AC4 CI test (asserts no endpoint surfaces yellow/pending as confirmed) + the `.strict()` compound-read-model shape test (Task 5) are both **query-and-schema-level teeth**, live from this story, independent of the matrix. The matrix entry is cosmetic paperwork on top of an already-enforced invariant — deferring it costs nothing operationally.

**Closure:** *Resolved via explicit deferral* (`[[feedback_closure_language_precision]]`) — not "closed," not "not addressed." **Re-trigger:** Story 11a.1, when it performs its trustee-attested matrix population; that story should add the `live-contributor-list` surface (`first_name` + `last_initial`, public on Sahyog Vivran / authenticated_member in-app, no confirmation-status/pending-identity field) using 8.3's shipped contract shape as its reference, and can point at 8.3's CI test as evidence the invariant already holds.

### Testing standards
- DB-free unit + shape tests co-located; Vitest. The pending-aggregate math, the confirmed-only structural guard, and the `.strict()` decoy-teeth shape test are the load-bearing units.
- Live-DB integration under `packages/domain/tests/integration/`: `twt-test-pg` :5433, `describe.skipIf(!hasDatabase)`, `setupLiveDb()`, reuse `seedAlert`/`seedPool`/`PARIWAR_A`/`enterAppScope`. Membership-not-count assertions; no migration regen; no `DROP SCHEMA` (`[[project_live_db_test_gotchas]]`).
- `microcopy` + `i18n-parity` + `pii-scrape` (no-op, unchanged matrix — D11) + the confirmed-only CI test are part of "done" — a green list that leaks yellow or fails parity is not done.
- If adding any Fastify `onSend` hook, run the DB-gated suites (`[[project_fastify_onsend_doublesend]]`) — but this is a GET read; `onRequest`/handler-return is the norm.

### Project Structure Notes
- **New:** `packages/domain/src/contribution/read.ts` (or extend the alert-read neighborhood) — `listConfirmedContributorsForPool` + `computePendingAggregate`; `packages/contracts/src/contributions/pool-contributor-list.ts` + barrel export; a second route + handler in `apps/api/src/modules/member-pool/`; `apps/mobile/components/contributor-list/{PoolContributorList.tsx,usePoolContributorsQuery.ts}` (+ the member live-pool view/route the card links to); i18n keys in `locales/{hi,en}/contribution.json`; tests (domain unit + integration, contracts shape).
- **Edit:** `packages/api-client/src/index.ts` (SDK method + type export); `apps/api/src/modules/member-pool/routes.ts` (register the route); the My Pool card / home to add the "View contributors" affordance; `friction-budget.md`; `_bmad-output/implementation-artifacts/sprint-status.yaml` (ledger). Reuse the `contribution` i18n namespace (no `catalog.ts` change).
- **Do NOT create:** a `contributions`/reconciliation projection table; a new API module; a websocket transport; a duplicate name-splitter or decrypt path; a surface in `public-vs-private-matrix.yaml` (D11 — deferred to Story 11a.1).

### References
- [Source: _bmad-output/planning-artifacts/epics.md#Story 8.3] (`:2895-2919`) — the AC: confirmed list = `first_name + last_initial`, reconciliation-confirmed-only; pending = count + percentage, no identifying details; virtualization UX-DR80; the query-layer + CI-test teeth; real-time on `contribution.confirmed`. Note (D11): the epic AC's mention of a PII-scrape matrix entry is deferred to Story 11a.1 — reconciled against the stronger Story 11a.1/1.16b trustee-attestation governance.
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 8] (`:2839-2857`) — "closes at yellow pill, green flip is Epic 9"; the exclusive-ownership fence (`:2855`); Story 0.10 accessibility gate; FR-23 nudge seam.
- [Source: _bmad-output/planning-artifacts/epics.md#Story 8.4] (`:2935-2941`) — the yellow-pill/UTR-attestation invariant 8.3's downstream must respect ("downstream surfaces … must NOT treat yellow as quasi-confirmed"); why 8.3's confirmed list must exclude yellow.
- [Source: _bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md] (`:544-556`) — FR-24 (real-time confirmed list, first+last-initial, updates on reconciliation not attestation, public version on Sahyog Vivran FR-77) + FR-25 `[v1-S]` (pending; note the epic's privacy hardening over the PRD's "see who" framing — D3).
- [Source: _bmad-output/planning-artifacts/architecture.md] (`§4.6`, `:2661-2680`) — surfaces requiring virtualization (Shradhanjali contributor scroll 200–16k the canonical case); "FlashList for lists above the threshold"; the property-vs-library commitment.
- [Source: _bmad-output/implementation-artifacts/8-2-active-contribution-card-…md] — the sibling: `member-pool/` module, `contributions/` read-model contract, `splitFirstNameLastInitial`, member-session decrypt, the AI-6-3-carry shape test, the confirmed-only (D4) discipline, the FlashList-vs-`FlatList` register, the a11y + Latin-numeral (D6) posture, the fail-soft/self-suppress pattern.
- [Source: packages/domain/src/alert/read.ts] — `listLiveAlertsForPariwar` (the live-cycle entry point). [Source: packages/domain/src/pool/contribution-binding.ts:346,373] — `resolveAssignedPoolWithRoster*` (roster = pending denominator).
- [Source: apps/mobile/components/shradhanjali/ShradhanjaliSahyogVivran.tsx:174-190] — the FlashList virtualization pattern to reuse (the `FlashList as any` React-19/new-arch cast + nested-scroll handling); today sample-data-coupled (`./sample-data`) — 8.3 wires the real read model for the member surface (the public Vivran render is Epic 11b).
- [Source: apps/api/src/modules/member-pool/{handlers,routes,index,name}.ts] — the thin server-authoritative read module + the name-split util to extend. [Source: packages/api-client/src/index.ts] — `memberActiveContribution()` SDK template.
- [Source: packages/contracts/src/contributions/{README,active-contribution-card,index}.ts + tests/contributions.test.ts] — `.strict()`/no-shadowing discipline + the shape-test decoy-teeth to extend.
- [Source: packages/contracts/public-pages/public-vs-private-matrix.yaml + _bmad-output/implementation-artifacts/1-16b-pii-scrape-ci-gate.md] — the 1.16b PII-scrape matrix scaffold; its own header + Story 11a.1's AC (`epics.md:3602`) gate ALL additions behind trustee-attested PR approval — the reason D11 defers the `live-contributor-list` entry to Story 11a.1 instead of adding it here.
- [Source: microcopy.yaml + scripts/microcopy] — the scarcity/panic + UX-DR73 Latin-numeral gate (`contribution.json` already in `copy_globs` since 8.2). [Source: packages/i18n/locales/{hi,en}/contribution.json] — the copy namespace + parity gate.

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Opus 4.8)

### Debug Log References

- **Live-DB caught a real query bug (fixed):** the first cut of `listConfirmedContributorsForPool` used
  `SELECT DISTINCT <payload->>member> … ORDER BY <same expr>`, which Postgres rejects with `42P10`
  ("for SELECT DISTINCT, ORDER BY expressions must appear in select list") — the two `sql` template
  instances are distinct expressions. Rewrote to a plain `SELECT` + JS de-dup (`Set`) + `.sort()`, which
  is correct at this scale (the confirmed set is bounded by the pool roster ≤ pool size). A DB-free unit
  test structurally could not have caught this — the integration spec (`confirmed-contributors.spec.ts`)
  did, on the very first run ([[project_epic6_drizzle_correlated_subquery_bug]] genre).
- **`ci:local` `test (unit)` job flaked once** (the concurrency-timeout class, [[project_ci_local_concurrency_oversubscription]] /
  [[project_known_livedb_test_failures]]); two forced clean `pnpm turbo run test --force --concurrency=4`
  runs passed 35/35, and the subsequent full `ci:local PASSED — 28 jobs green`. Not a regression from this story.

### Completion Notes List

Story 8.3 ships a READ VIEW + its invariant teeth — the sibling of 8.2's `<ActiveContributionCard>`,
extended from the aggregate meter to the named confirmed-contributor rows. No producer; the confirmed
numerator is honestly empty today (Epic 9's `contribution.confirmed` producer is unbuilt) and populates
with **zero code changes here** when Epic 9 lands.

- **AC1 (confirmed-only, load-bearing):** `contribution.listConfirmedContributorsForPool` (new
  `packages/domain/src/contribution/read.ts`) sources EXCLUSIVELY from `contribution.confirmed` — it
  hard-filters `event_type = 'contribution.confirmed'` (the `CONFIRMED_EVENT_TYPE` constant, never a set,
  never a parameter). The params type is exactly `{ pariwarId, cycleId, poolId }` — there is NO
  `status`/`state` field that could admit a yellow/pending/attested row (the structural guard, unit-tested
  with a `@ts-expect-error`). Server-authoritative: one SDK call returns the fully-resolved model.
- **AC2 / D3 (pending is AGGREGATE ONLY):** `computePendingAggregate` (pure, DB-free) = `rosterSize −
  confirmedCount` over the pool roster (`resolveAssignedPoolWithRosterForMember`'s `rosterSize`), NOT
  attested-derived. The contract exposes ONLY `{ count, percentage }` — no names, no per-member rows.
  **PRD↔epic reconciliation (flagged per AC2):** PRD FR-24/25 frame pending as "see WHO has not yet
  contributed"; the epic (`epics.md:2906`) supersedes this with "member-identifying details are not shown
  on this list." I followed the epic (the authoritative implementation spec) — pending is aggregate,
  never a "who hasn't paid" shame list; the PRD's `[NOTE FOR PM]` coercion-risk flag is what this hardens.
- **D4 decision (stated, not silent):** the decrypted name is each **confirmed contributor's OWN** KYC name
  (not 8.2's deceased member), reusing the member-session `decryptKycField` + `splitFirstNameLastInitial`
  verbatim. No DPDPA consent gate applies — a co-pool member seeing who-else-confirmed in the pool they are
  in is not a claim-processing/disbursement action on protected data (the same 8.2 D11 reasoning).
- **D5 decrypt-cost seam (flagged in code + here, NOT built):** today 0 confirmed ⇒ 0 decrypts. Once Epic 9
  populates, up to the confirmed-subset size (≪ roster early in a cycle) Tier-1 KMS decrypts per read. A
  batch-decrypt + short-TTL read-model cache is a documented seam — NEVER a plaintext cache at rest
  ([[project_validity_cache_failopen_pattern]]); the Epic-11b public Sahyog Vivran render is where it bites.
  A confirmed contributor whose name is unresolvable is **omitted from the visible rows** (logged) but still
  counts toward `confirmedCount` for the pending math, so the aggregate never understates confirmation.
- **AC3 / D7 virtualization:** `<PoolContributorList>` virtualizes the confirmed rows with `@shopify/flash-list`
  (the ratified P0-5 choice), reusing the `ShradhanjaliSahyogVivran` `FlashList as any` React-19/new-arch cast.
  Empty state is a calm, state-reporting placeholder ("No confirmed contributions yet.") — never blame framing.
- **AC5 / D6 (near-real-time = polling, transport-honest):** the query uses a bounded 60s `refetchInterval` +
  `refetchOnReconnect` — NOT a websocket/SSE push (no such infra; moot today at 0 confirmed events). The
  `refetch-on-foreground` half is a documented seam: the app wires no `AppState`→`focusManager` bridge yet,
  so `refetchOnWindowFocus` is inert until that cross-cutting bridge lands (then it fires with no change here).
- **AC4 teeth:** (1) the contracts `.strict()` shape test rejects any `status`/`yellow`/`attested`/`utr`/
  pending-identity field + any ciphertext/full-name/phone/bank field on the confirmed rows AND a
  per-member-identity field on the pending aggregate; (2) the live-DB integration spec seeds a hand-crafted
  `contribution.utr-attested` (yellow) event on the same pool and asserts it does NOT appear in the confirmed
  list (the invariant genuinely bites before 8.4 introduces yellow). **D11 honored:** `public-vs-private-matrix.yaml`
  is NOT touched — the AC4 PII-matrix entry is *Resolved via explicit deferral* to Story 11a.1's trustee-attested
  population; `pii-scrape` stays green as a no-op. The confirmed-only invariant is already enforced now by the
  CI test + the `.strict()` shape test, which need no matrix entry to have teeth.
- **D8 composition:** the contributor list is a SEPARATE member view (`(contribution)/contributors` route); the
  8.2 card body is untouched. A `<ViewContributorsEntry>` ≥44pt affordance mounts just below the card and
  self-suppresses in lock-step with it (reusing the card's existing `useActiveContributionQuery` — same
  queryKey, no extra fetch).
- **Reuse (D0/D9):** extended the 8.2 `member-pool/` module with a second route; extracted the shared steps
  (1)-(5) into `resolveMemberLivePool` so both the card and the list resolve the same member-active × live-cycle
  × assigned-pool selection (the 8.2 unit tests still pass 10/10 after the refactor). Reused the contracts
  `contributions/` `.strict()` pattern, the SDK GET template, the `contribution` i18n namespace, `@twt/tokens`/Tamagui.
- **Testing (Task 7):** DB-free units (`computePendingAggregate` boundaries + the structural confirmed-only
  guard + the `.strict()` shape decoy-teeth) + live-DB integration (empty-today, confirmed-included,
  yellow-excluded, pool-scoped, de-dup, tenant-isolation). Per the Story 6.2 precedent, `apps/mobile` has no
  RN mount-test harness (`vitest.config.ts` node-only) — the component's testable logic (pending aggregate,
  self-suppression discriminator via the contracts union test, a11y copy keys via the parity gate) is covered
  by pure units; a full RN mount test is infeasible in-repo and is noted rather than faked.
- **Substitution note:** none needed — the app already standardizes MMKV for the persisted query client
  ([[project_mmkv_asyncstorage_equivalent]]), which the new query auto-inherits.

**Verification:** `pnpm ci:local` (DATABASE_URL on :5433) → **PASSED, 28 jobs green** — including `test (unit)`,
`integration-tests`, `pii-scrape` (no-op, D11), `friction-budget`, `i18n-parity`, `microcopy`, and
`alert-state-invariant`. New tests: 8 domain units, 7 live-DB integration, 12 added contracts shape assertions.

### File List

**New:**
- `packages/domain/src/contribution/read.ts` — `listConfirmedContributorsForPool` (confirmed-only) + `computePendingAggregate`
- `packages/domain/src/contribution/index.ts` — the `contribution` read-primitive barrel
- `packages/contracts/src/contributions/pool-contributor-list.ts` — the `.strict()` PII-shielded read model (no yellow/attested field)
- `apps/mobile/components/contributor-list/PoolContributorList.tsx` — the virtualized member view
- `apps/mobile/components/contributor-list/usePoolContributorsQuery.ts` — the React Query hook (near-real-time polling)
- `apps/mobile/components/contributor-list/ViewContributorsEntry.tsx` — the ≥44pt "View contributors" affordance (D8)
- `apps/mobile/app/(contribution)/_layout.tsx` — the contribution route group
- `apps/mobile/app/(contribution)/contributors.tsx` — the contributor-list route
- `packages/domain/tests/contribution/read.test.ts` — DB-free units (aggregate boundaries + structural guard)
- `packages/domain/tests/integration/contribution/confirmed-contributors.spec.ts` — live-DB confirmed-only teeth
- `apps/api/tests/unit/pool-contributors.test.ts` — Review fix: DB-free handler-wiring test proving the pending aggregate uses `confirmed.length`, not `rows.length`

**Modified:**
- `packages/domain/src/index.ts` — export the `contribution` namespace
- `packages/contracts/src/contributions/index.ts` — barrel-export the pool-contributor-list shapes
- `packages/api-client/src/index.ts` — `memberPoolContributors()` SDK method + `PoolContributorListResult` type
- `apps/api/src/modules/member-pool/handlers.ts` — `poolContributors` handler + `resolveMemberLivePool` shared extract + `resolveContributorList` pipeline
- `apps/api/src/modules/member-pool/routes.ts` — register `GET /api/v1/member/pool-contributors`
- `apps/mobile/app/_layout.tsx` — register the `(contribution)` route group
- `apps/mobile/app/(tabs)/index.tsx` — mount `<ViewContributorsEntry>` below the card
- `packages/contracts/tests/contributions.test.ts` — extend the shape test with the 8.3 decoy teeth
- `packages/i18n/locales/en/contribution.json` — `contributor_list.*` copy keys
- `packages/i18n/locales/hi/contribution.json` — `contributor_list.*` copy keys (hi parity)
- `friction-budget.md` — the Story 8.3 disposition entry (no new row, baseline unchanged)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — the ledger flip → review

## Change Log

| Date | Change |
|---|---|
| 2026-07-20 | Story 8.3 implemented: confirmed-only Live Contributor List read model + `GET /api/v1/member/pool-contributors` + SDK method + `.strict()` PII-shielded contract (no yellow/attested/pending-identity field) + virtualized `<PoolContributorList>` + aggregate pending strip + the confirmed-only CI teeth (shape test + live-DB yellow-exclusion). PII-matrix entry deferred to Story 11a.1 (D11). `ci:local` 28 jobs green. Status → review. |
