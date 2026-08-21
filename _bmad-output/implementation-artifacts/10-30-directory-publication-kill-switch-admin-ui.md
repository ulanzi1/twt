---
baseline_commit: 46ffc59c58e7fd313343700549fd30288e1427e0
---

# Story 10.30: Directory-Publication Kill-Switch Administrative UI `[SURFACE]`

Status: review

> ⚠ **THIS STORY WAS MINTED DIRECTLY INTO `sprint-status.yaml`, NOT INTO `epics.md`.** No epic section
> exists for it — `epics.md`'s Epic 10 section ends at Story 10.29. The Acceptance Criteria below are
> therefore **authored by this story file**, not reproduced from minted epic text, and are grounded
> entirely in `.decision-log.md#2026-08-21-146` / `#2026-08-21-147` and
> `docs/launch-gate-inventory/inventory-roster.md` Row 17 — read those before this file; they are the
> ratified source of truth this story implements.
>
> ⭐ **WHAT THIS STORY DISCHARGES.** Decision `2026-08-21-146` cl.5 ruled that the per-Pariwar
> directory-publication kill switch (shipped implementation-first in Story 11a.3) is a **mechanism
> present but NOT an operational control** until a dedicated administrative UI ships, and that
> **direct database manipulation must not be described as normal manual operation**. Decision
> `2026-08-21-147` cl.1 escalated that into a **launch gate**: the public Member Directory
> (`/members`, shipped and `done` at Story 11a.3) **must not go live** until this UI exists. Clause 2
> placed the implementation here, in Epic 10 (admin-console), explicitly **not** bundled into 11a.4.
>
> ⛔ **THIS STORY DOES NOT REOPEN THE KILL-SWITCH MECHANISM.** The domain substrate —
> `packages/domain/src/member/directory-publication.ts`, the `pariwar_directory_publication` table
> (migration `0111`, applied), the `pariwar.manage_directory_publication` permission key (RBAC catalog
> v38, `super_admin` ONLY) — is **already built and correct**. This story adds **zero** new domain
> logic, **zero** new permission keys, **zero** new migrations: a THIN admin API + console surface over
> an already-governed write path, the shape of Story 5.8 (degraded-mode) and Story 1.15
> (pariwar-provisioning). Its only `packages/domain` diff is the AC9 comment correction.
>
> ⛔ **TWO THINGS THIS STORY MUST NOT CLAIM** — both are ratified constraints, both are testable
> below, and both are the easiest mistakes to make here:
> 1. **That Row 17 closes.** `inventory-roster.md:263`: *"a `done` story alone does NOT close this
>    row"* — closure also needs a Decision recording **≥2-trustee ratification** that the switch may be
>    treated as an operational control. That event is outside this story's authority. → **Trap 5**, AC9.
> 2. **That the control is immediate.** `/members` is `edge_cacheable` with `s-maxage=300`
>    (`2026-08-21-145` cl.5(e)) — a pulled Pariwar keeps being served from warm edge PoPs, per page
>    number, for up to five minutes. `2026-08-21-147` cl.1(d) forbids the word outright. → **Trap 4**, AC5.
>
> **Depends on:** Story 11a.3 (`done`) — the domain substrate, the migration, the permission key, all
> already shipped. Story 10.29 (`done`) — the numerically-previous Epic 10 story; its governance
> discipline (Task 1 commits first, zero `packages/`/`apps/` files) is followed here at Task 1.

## Story

As a Trust super_admin who needs to pull a Pariwar's public Member Directory listing without asking
an engineer to run SQL,
I want a console page where I can see and change whether a Pariwar's directory is published, with a
required reason, and see who last changed it and why,
so that the kill switch Decision `2026-08-21-146`/`-147` require becomes something I can actually
operate — and so the public Member Directory is allowed to go live at all.

---

## 🎯 The gap, stated exactly

The write path exists and is correct:

```
packages/domain/src/member/directory-publication.ts
    setDirectoryPublicationEnabled()     ← rationale + actor + display snapshot + audit-anchor REQUIRED
    getDirectoryPublicationRow()         ← read
    DIRECTORY_PUBLICATION_PERMISSION_KEY = 'pariwar.manage_directory_publication'  ← super_admin ONLY

packages/domain/src/rbac/permissions.ts:918   ← the key, already in SEED_PERMISSION_KEYS, catalog v38
packages/domain/migrations/0111_directory-publication.sql   ← the table, already applied
```

But **nothing calls `setDirectoryPublicationEnabled` from any HTTP route.** Confirmed by exhaustive
grep, re-verified against the working tree at `46ffc59`:

```
$ grep -rin "manage_directory_publication\|directory[-_]publication\|directoryPublication" apps/api/src apps/admin/src
apps/api/src/modules/public-pages/handlers.ts:137   ← the ONLY hit: the PUBLIC READ (memberDomain.resolveDirectoryPublicationEnabled)
```

⚠ **The `-i` is load-bearing.** The sole call site spells it `resolveDirectoryPublicationEnabled` —
capital `D`, capital `P` — so a case-SENSITIVE `directoryPublication` pattern returns **zero** hits
and reads as if the substrate were absent. If you re-run this and get nothing, check your `-i`
before concluding anything about the tree.
Zero admin routes. Zero admin console pages. The only way to flip the switch today is a hand-run
`UPDATE pariwar_directory_publication SET enabled = ...` — exactly the fallback Decision
`2026-08-21-147` cl.1(c) **withdraws** as an acceptable answer.

⚠ **A parallel gap exists in `kyc/presentation-policy.ts` (Story 11a.1's public-name kill switch) and
is explicitly OUT OF SCOPE here.** Its own header (`rbac/permissions.ts:534`) says plainly "NO
self-serve admin toggle UI ships in Story 11a.1" and that posture was never ruled on. Only the
**directory-publication** switch was escalated to a launch gate by `-147`; do not widen this story to
also build a UI for the presentation-mode switch — that would be unratified scope creep onto a
different (if visually similar) control.

---

## ⛔ THE TRAPS — read before writing code

**Trap 1 — inventing a second write path.** `setDirectoryPublicationEnabled` already validates
rationale, audit-anchor, actor/display consistency, and the permission grant, and already upserts in
both directions. The handler's job is to **call it correctly** — resolve the actor's display name
server-side (fail-closed, per `[[project_admin_display_name_attribution]]`), pre-generate the audit
id, and pass through. ⛔ Do not re-implement any of its validation in the handler; it exists exactly
so the check happens in one place.

**Trap 2 — a client-supplied `changedByDisplay`.** The admin client must **never** send a display
name on the wire. It is resolved server-side from `users.display_name` via
`getDisplayName(deps.pool, actorId)` (the `feature-flags`/`custom-fields` precedent) — see Dev Notes.
A client-supplied display name would let an operator's browser lie about who made the change, which
defeats the entire point of the accountability requirement Decision `2026-08-21-146` cl.4/5 named.

**Trap 3 — a client-side permission gate that gets it wrong.** `pariwar.manage_directory_publication`
is a **pariwar-dimension** grant, not in the admin session's `nationalGrants` set — mirror
`DegradedModeRoute.tsx` exactly: **no** client-side capability check. The route renders for any
authenticated admin session; the server's `requirePermissionHook` is the real boundary, and a
non-`super_admin` sees the API's 403 surfaced as a page error. ⛔ Do **not** copy
`ProvisioningRoute.tsx`'s `nationalGrants.includes(...)` gate — that pattern is for **global**-scope
permissions and would silently misclassify this pariwar-scoped one (it is never present in
`nationalGrants` for anyone, so the gate would deny everyone including super_admin).

**Trap 4 — implying the control is immediate.** AC5 is not decorative. Every surface a human reads
before or after flipping the switch — the confirmation copy, the success state, the disabled-state
explanation — must disclose the `s-maxage=300` propagation floor. ⛔ The word "immediately" / "right
away" / "instantly" may not appear anywhere describing this control's effect.

**Trap 5 — treating the launch-gate row as closeable from here.** This story's Task 1 governance
commit **records that the UI shipped**; it does **not** write "Row 17 closed" or flip
`current_status` on Row 17. That flip requires a **separate** ≥2-trustee ratification Decision, which
is out of this story's authority to create. Recording the UI's existence and recording the row's
closure are two different governance acts — do not collapse them.
⚠ **Task 6 is where this trap actually bites.** Correcting the "no admin UI ships" comments is
one keystroke away from writing "…and the switch is therefore now an operational control." It is
not. The UI existing and the Panel ratifying are, again, two different facts — AC9 turns on holding
them apart in the corrected wording.

---

## ⛔ SCOPE BOUNDARY — what this story is NOT

| ⛔ Not in scope | Why |
|---|---|
| The kill-switch **mechanism** — every executable line of `directory-publication.ts`, the table, the permission key | Already built and correct at Story 11a.3. A diff touching `setDirectoryPublicationEnabled`'s validation logic, the schema, or `SEED_PERMISSION_KEYS`/`PERMISSION_CATALOG_VERSION` is out of scope (AC6). ⚠ **Their COMMENTS are a deliberate exception** — AC9/Task 6 corrects the two blocks that assert no admin UI exists. Comment lines only; ⛔ if your `packages/domain` diff contains a single executable line, you have exceeded this story. |
| A UI for `kyc/presentation-policy.ts` (the public-name presentation-mode switch) | Never ratified as a launch gate; a different control. See "A parallel gap" above. |
| Flipping launch-gate-inventory Row 17 to `closed` | Requires a separate ≥2-trustee ratification Decision this story cannot author on its own authority (Trap 5). |
| Granting `pariwar.manage_directory_publication` to any role other than `super_admin` | `2026-08-21-146`/Decision `-145` cl.5 ruled `super_admin` only; re-granting "for symmetry" reverses a ratified decision. |
| A global (cross-Pariwar) bulk-disable control | The switch is per-Pariwar by design (Story 11a.3 D3 rationale: gradual rollout / pull one Pariwar without redeploying). One Pariwar at a time, matching the domain shape. |
| Reducing the `edge_cacheable`/`s-maxage=300` floor on `/members` | Out of scope — a separate change to the public-pages caching policy, not this story's concern. This story only **discloses** the floor. |
| A nav-menu entry / Pariwar admin hub linking to this page | No such hub exists for any sibling per-Pariwar admin tool (`feature-flags`, `degraded-mode`, `cycle-freeze` are all direct-URL, un-linked — confirmed by repo grep at authoring time). This story follows that convention; adding a hub is unrelated scope. |

---

## Acceptance Criteria

### AC1 — An admin API surface exposes read + governed write of the per-Pariwar kill switch

**Given** the scoped admin route chain `[requireAdminSession, scopeResolutionHook,
requirePermissionHook(pariwar.manage_directory_publication)]` (the `degraded-mode` precedent)
**When** a `super_admin` session with the grant calls the write route with a non-empty rationale
**Then** `setDirectoryPublicationEnabled` is called with the actor id, a server-resolved
`changedByDisplay` (never client-supplied), a pre-generated `auditId`, and the supplied `rationale`
**And** a §1.5 hash-chain audit line is written via `audit.withCompensatingAudit`, covering the same
transaction as the domain write (the `degraded-mode`/ADR-0030 pattern)
**And** a GET route returns the current row, carrying an explicit `configured: boolean` — `false`
when no row exists, alongside `enabled: true` (the "not individually disabled" default, mirroring
`resolveDirectoryPublicationEnabled`'s own default-true asymmetry). ⛔ Absence must NOT be signalled
only by all-null fields: an unconfigured Pariwar and a Pariwar someone deliberately re-enabled are
different facts and the operator is shown which one they are looking at
**And** a write carrying an empty/whitespace rationale is rejected at the **contract** boundary with
a `400` — ⛔ never a `500`. `UngovernedDirectoryPublicationChangeError` `extends Error` (not
`ApiError`) and is **not** registered in `apps/api/src/middleware/error-mapping/index.ts`, whose
documented default is "Anything else → 500 `internal.error`". It is the domain's backstop, ⛔ not
this route's rejection path

### AC2 — A non-`super_admin` (or unauthenticated) caller cannot flip the switch

**Given** an admin session that lacks `pariwar.manage_directory_publication` (e.g. `pariwar_admin`,
`district_admin`)
**When** it calls the write route
**Then** the server returns `403` (permission denied) — never a silent no-op, never a `200`
**And** an unauthenticated request returns `401` and is bounced to `/login` client-side (the
`DegradedModeRoute` precedent)

### AC3 — A console page at `/p/$pariwarId/directory-publication` lets a human operate the switch without database access

**Given** a `super_admin` session viewing the page for a specific Pariwar
**Then** the page shows the CURRENT state (published / not published), and — when a row exists — the
last-changed actor's display name, rationale, and timestamp
**And** a form lets the operator flip the state, **requiring** a non-empty rationale before the
submit control is enabled (client-side courtesy; the server's own rejection — Trap 1 — remains the
real boundary and must stay reachable and tested)
**And** on a `403` from a session lacking the grant, the page surfaces the server's denial as a
readable error — no client-side capability check hides the form (Trap 3)

### AC4 — Both directions are exercised, end to end, by a human through the console

**Given** a Pariwar whose directory is currently published (no row, or a row with `enabled: true`)
**When** a super_admin disables it through the console with a rationale
**Then** the row flips to `enabled: false`, and the public `/members` route (Story 11a.3's read path,
`resolveDirectoryPublicationEnabled`) reflects it on next read (subject to the AC5 propagation floor)
**And** the reverse (re-enabling a disabled Pariwar) is equally reachable through the same page — the
mechanism is symmetric by construction (`setDirectoryPublicationEnabled`'s own doc comment: "moves in
BOTH directions")

### AC5 — The control's non-immediacy is disclosed, not implied

**Given** the `2026-08-21-147` cl.1(d) directive that "immediate" may not describe this control
**Then** the console page carries a visible, always-present line disclosing the edge-cache
propagation floor (e.g., naming the `s-maxage=300` / up-to-5-minute figure) — not only on success, but
as standing copy near the toggle, so an operator reads it **before** acting, not only after
**And** no code comment, commit message, or UI string introduced by this story uses "immediately" /
"instantly" / "right away" to describe the switch's effect
**And** a source-scan test (mirroring the `delivery-terminology-gate.test.ts` shape) asserts the
forbidden words are absent from the new UI copy files

### AC6 — No new permission key, no catalog version bump, no migration

**Given** `pariwar.manage_directory_publication` already exists in `SEED_PERMISSION_KEYS` at catalog
v38, granted to `super_admin` only, and the `pariwar_directory_publication` table already exists
(migration `0111`, applied)
**Then** this story's diff contains **zero** changes to `permissions.ts`'s `SEED_PERMISSION_KEYS`,
**zero** `PERMISSION_CATALOG_VERSION` bump, and **zero** new migration files
**And** `packages/domain/tests/rbac/permissions.test.ts` (or equivalent catalog-shape test) passes
unmodified — proving the catalog is untouched, not merely unexamined

### AC7 — Governance record precedes the code, and the record does not overclaim

**Given** `[[feedback_governance_commits_precede_implementation]]` and the `10-29` precedent (Task 1
commits first, zero `packages/`/`apps/` files)
**Then** a `governance:`-prefixed commit lands before any implementation commit, recording that this
story implements the UI Decision `2026-08-21-147` cl.2 minted, referencing `-146`/`-147`/Row 17
**And** the commit — and every subsequent commit and this story's Dev Agent Record — states plainly
that Row 17 does **not** close by this story alone (Trap 5); the launch gate's closure remains a
separate ratification event

### AC8 — Policy-meaning note (AI-10-1)

This story introduces **no new predicate that gates a member's access to a benefit**, and changes no
existing one. It builds an operating surface for an **already-governed, already-ratified** predicate
(`resolveDirectoryPublicationEnabled`, ratified at Story 11a.3 / Decision `2026-08-21-145`/`-146`).
Checked against the Niyamavali: **not applicable** — no clause is touched, no member-facing predicate
changes meaning. Stated explicitly per the persistent AI-10-1 instruction, so an absent note here is
not mistaken for an unasked question.

### AC9 — The code stops asserting that this UI does not exist

**Given** two authoritative comments that state, as present fact, that no admin UI ships with this
key — `packages/domain/src/rbac/permissions.ts:552` ("⛔⛔ NO ADMIN UI SHIPS WITH THIS KEY, AND THE
SWITCH IS THEREFORE **NOT AN OPERATIONAL CONTROL**") and
`packages/domain/src/member/directory-publication.ts:16-30` ("⛔⛔ NOT AN OPERATIONAL CONTROL YET…
until the UI ships this is a MECHANISM PRESENT, ⛔ NOT a lever anyone can pull")
**Then** both are corrected in this story to record that the UI **has** shipped, citing this story
**And** ⛔ **both continue to state that the switch is STILL NOT an operational control** — the
UI shipping does **not** confer that status; only the separate ≥2-trustee ratification does (Trap 5).
The claim that changes is "no UI exists"; the claim that does **not** change is "not an operational
control"
**And** no other surviving copy of the superseded "a console surface is a future story if one is
wanted" framing remains anywhere this story touches (the Story 11a.3 second-round finding)

⚠ This AC exists because a comment asserting a falsehood is worse than no comment: it stops the next
reader from looking. Leaving it is the exact defect class 11a.3's own second review round caught.

---

## Tasks / Subtasks

### Coverage matrix — every AC → its task(s)

| AC | Tasks |
|---|---|
| AC1 — API read + governed write | 2, 3, 7 |
| AC2 — permission denial paths | 3, 7 |
| AC3 — console page | 4, 5 |
| AC4 — both directions, end to end | 7 |
| AC5 — non-immediacy disclosure | 4, 5, 7 |
| AC6 — no catalog/migration changes | 7 |
| AC7 — governance precedes code | 1 |
| AC8 — policy-meaning note | (this file, above) |
| AC9 — code stops asserting the UI is absent | 6 |

### Task 0 — Branch, baseline
- [x] `git fetch origin`. Branch off `46ffc59` (this story's `baseline_commit`), clean tree, verified.
- [x] Baseline the suites BEFORE any edit and record real numbers: `pnpm --filter @twt/contracts test`,
      `pnpm --filter @twt/domain test tests/rbac/`, `pnpm --filter @twt/admin test`, the live-DB
      `apps/api/tests/integration/` suite touching `public-pages`, **and**
      `packages/domain/tests/integration/rls/directory-publication-policy.spec.ts` — the substrate's own
      guard suite, the one that would reveal accidental domain drift (AC6/AC9 touch these files'
      comments; ⛔ nothing else). ⛔ A baseline taken after an edit is not a baseline.
- [x] Re-confirm the grep from "The gap, stated exactly" against the working tree — **case-insensitive
      (`-i`)**, per the warning there. Expect exactly ONE hit (`public-pages/handlers.ts`). Record ZERO
      DRIFT or note what changed. ⛔ Zero hits means your pattern is wrong, not that the substrate moved.

### Task 1 — `governance:` — the decision-log entry (AC: 7) — **COMMITS FIRST**
- [x] Append a decision-log entry (next sequential `2026-08-21-NNN` or the authoring date if later)
      recording: this story implements the UI Decision `2026-08-21-147` cl.2 minted at Epic 10
      `backlog`; the permission key and table are unchanged (reused, not re-ruled); Row 17 does **not**
      close by this entry — closure requires a separate ≥2-trustee ratification.
- [x] `docs/launch-gate-inventory/inventory-roster.md` Row 17 — update `cross_story_discharge_path`'s
      "no story file yet" clause to point at this story file, **without** flipping `current_status`
      away from `open` and **without** populating `closure_evidence_link` (that happens at the separate
      ratification event, per the row's own discipline).
- [x] ⛔ **Zero `packages/` and `apps/` files in this commit.** Commit manually, branch + selective
      stage — ⛔ **not** `commit-story` ([[project_story_automator_ops]]).

### Task 2 — Contracts (AC: 1)
- [x] New folder `packages/contracts/src/directory-publication/` (mirrors `degraded-mode/`'s
      per-domain-folder convention — this is an admin-console concern, not `public-pages`).
- [x] `publication.ts` — ⚠ **domain-noun filename, no `-admin` suffix**: `degraded-mode/` is
      `declarations.ts` + `index.ts`, and that is the convention being mirrored.
      `DirectoryPublicationStatusResponse` (`enabled: boolean`, **`configured: boolean`**,
      `changedByDisplay: string | null`, `rationale: string | null`, `updatedAt: Iso8601Datetime |
      null`) and `SetDirectoryPublicationRequest` (`enabled: boolean`, `rationale: string` —
      ⭐ **`.min(1)` after trim**, this is the `400` boundary AC1 requires, `.strict()`).
      ⛔ **No `changedByDisplay` field on the request** — Trap 2; it is server-resolved, never
      accepted from the caller.
- [x] `index.ts` barrel; wire into `packages/contracts/src/index.ts`'s export list (the `degraded-mode`
      precedent for where a new per-domain folder gets re-exported).
- [x] Re-run `packages/contracts/scripts/emit-openapi.ts`; confirm the new components appear in
      `openapi/v1.yaml`.

### Task 3 — API module (AC: 1, 2)
- [x] New module `apps/api/src/modules/directory-publication/` — `handlers.ts`, `routes.ts`,
      `index.ts`, mirroring `degraded-mode/`'s split. ⚠ That directory holds **four** files: its
      `composition.ts` is a Story-5.8-specific read-seam for the channels fan-out and has **no analogue
      here** — ⛔ do not create one to "match".
- [x] `handlers.ts`:
  - `getStatus`: reads `getDirectoryPublicationRow(scopeTx.tx, pariwarId)`; maps an absent row to
    `{ enabled: true, configured: false, changedByDisplay: null, rationale: null, updatedAt: null }`
    and a present row to `configured: true` (AC1 — ⛔ absence is signalled by the explicit flag, not
    inferred from all-null fields; mirrors `resolveDirectoryPublicationEnabled`'s default-true).
  - `setStatus`: resolve `actorDisplay = await getDisplayName(deps.pool, actorId)`
    (`apps/api/src/modules/auth/admin/admin-auth.repo.ts`, the `feature-flags`/`custom-fields`
    precedent); `if (actorDisplay === null) throw new AdminDisplayNameMissingError(actorId)`
    (Trap 2/fail-closed, [[project_admin_display_name_attribution]]) — **before** calling the domain
    write. ⚠ That error is a **409** (`admin.display_name_missing`, `http-errors.ts:82`), ⛔ not a
    400/403 — assert 409 in the test, do not guess.
  - The grants argument is **`request.scopeGrants`** — loaded once by `scopeResolutionHook` and
    declared optional at `apps/api/src/types.ts:45`. Use the house fail-closed idiom
    `request.scopeGrants ?? []` (the reasoning is written out at
    `apps/api/src/modules/member-moderation/handlers.ts:337`). ⛔ Do **not** call `loadActorGrants`
    again — it already ran.
  - Pre-generate `auditId = randomUUID()`. Call
    `audit.withCompensatingAudit(deps.servicePool, { auditIntent: {...}, mutate: () =>
    setDirectoryPublicationEnabled(tx, { pariwarId, enabled, changedByActor: actorId, changedByDisplay:
    actorDisplay, rationale, auditId, actorGrants: request.scopeGrants ?? [] }) })` — the
    `degraded-mode` pattern exactly (`handlers.ts:74-` in that module).
  - ⚠ **The domain grant check is a backstop, ⛔ not the denial path.** With `?? []` the domain would
    throw `UngovernedDirectoryPublicationChangeError`, which is unregistered in `errorMappingHandler`
    and therefore surfaces as a **500**. `requirePermissionHook` on the route is what produces AC2's
    `403`; the domain check must never be the thing a denied caller reaches.
  - Audit `action`: a new dotted-lowercase constant, e.g. `pariwar.directory_publication.changed`
    (the `degraded-mode` `AUDIT_ACTION_DECLARED`/`_REVOKED` naming precedent — multi-dot, the writer's
    regex permits it).
  - `resourceLocator`: include `pariwarId` + the target `enabled` value in the locator string (the
    `degraded-mode` declare handler's `resourceLocator` shape — ⚠ note the OWED re-examination trigger
    on `resourceLocator` widening carried from `2026-08-21-146`'s open follow-ups; this handler's
    locator is a NEW site, so construct it narrowly and do not widen an existing one).
- [x] `routes.ts`: `GET /api/v1/p/:pariwarId/admin/directory-publication/status` and
      `PUT /api/v1/p/:pariwarId/admin/directory-publication/status`, both on the chain
      `[requireAdminSession, scopeResolutionHook, requirePermissionHook(deps,
      'pariwar.manage_directory_publication')]`. Both register in `openapi/v1.yaml` (the expected diff
      — mirrors `degraded-mode/routes.ts`'s own header comment).
- [x] `index.ts`: `registerDirectoryPublicationModule`, mirroring `degraded-mode/index.ts`.
- [x] Wire into `apps/api/src/server.ts` near `registerDegradedModeModule` (a sibling per-Pariwar
      admin-write module).

### Task 4 — Admin console module (AC: 3, 5)
- [x] New module `apps/admin/src/modules/directory-publication/` —
      `DirectoryPublicationPage.tsx` + a small form component, mirroring `degraded-mode/`'s
      `DegradedModePage.tsx` + `DeclareForm.tsx` split.
- [x] `DirectoryPublicationPage.tsx`: `pariwarId` as a prop (route-supplied, testable without a
      router — the `feature-flags`/`degraded-mode` precedent). Renders current status (AC3), the
      standing propagation-floor disclosure line (AC5 — **always visible**, not conditional on any
      action), and the toggle form.
- [x] The form: a rationale `<textarea>`, disabled submit until non-empty (client courtesy; server
      remains the real gate per Trap 1/AC3).
- [x] `apps/admin/src/api/client.ts` + `hooks.ts`: `getDirectoryPublicationStatus` /
      `setDirectoryPublicationStatus` typed fetch wrappers + `useDirectoryPublicationStatus` (query) /
      `useSetDirectoryPublicationStatus` (mutation, invalidating the status query on success) — the
      `feature-flags`/`degraded-mode` hooks precedent.
- [x] i18n: add `apps/admin/src/modules/directory-publication/i18n-en.ts` carrying **every** UI
      string, including the AC5 disclosure line. This file is not optional — AC5's source-scan test
      targets it.
      ⭐ **The convention is already settled; ⛔ do not re-investigate it.** Eleven `apps/admin`
      modules carry an `i18n-en.ts` (`helpdesk`, `banners`, `surveys`, `news-blog`, `trustee-lite`,
      `member-status`, `claim-verification`, `claim-appeal`, `helpline-claims`, `ground-inspection`,
      `pool-fixed-amount`) and **every one is English-only — there is no `i18n-hi.ts` anywhere in
      `apps/admin`**. Admin copy is staff-facing and carries no en/hi parity obligation. ⚠ ⛔ Do not
      look for `degraded-mode/i18n-en.ts` or `feature-flags/i18n-en.ts` — neither exists; those two
      modules predate the convention and inline their strings. Follow the eleven, not the two.

### Task 5 — Route registration (AC: 3, 5)
- [x] `apps/admin/src/routes/DirectoryPublicationRoute.tsx` — mirror `DegradedModeRoute.tsx`
      **exactly**: session-loading/error states, `pariwarId` from `useParams`, **no** client-side
      permission gate (Trap 3), render `DirectoryPublicationPage` on success.
- [x] `apps/admin/src/router.tsx`: register `path: '/p/$pariwarId/directory-publication'`,
      `component: DirectoryPublicationRoute`, alongside the other `/p/$pariwarId/...` routes.
- [x] ⛔ Do **not** add a nav-menu link — no per-Pariwar admin hub exists for any sibling tool
      (confirmed: `degraded-mode`, `feature-flags`, `cycle-freeze` are all un-linked, direct-URL). Adding
      one here would be unrelated scope (see SCOPE BOUNDARY table).

### Task 6 — The stale-claim correction (AC: 9) — **comments only, ⛔ zero behaviour change**

- [x] `packages/domain/src/rbac/permissions.ts` (the block at ~552, above
      `PERMISSION_CATALOG_VERSION`): the line "⛔⛔ NO ADMIN UI SHIPS WITH THIS KEY, AND THE SWITCH IS
      THEREFORE **NOT AN OPERATIONAL CONTROL**" is false the moment this story lands. Correct it to
      record that the UI ships at Story 10.30 — **and keep the second half true**: still ⛔ NOT an
      operational control, because that status turns on the ≥2-trustee ratification, ⛔ not on the UI
      existing. The "therefore" is what breaks; the conclusion stands on its own.
- [x] `packages/domain/src/member/directory-publication.ts` (header, ~16-30): same correction to
      "⛔⛔ NOT AN OPERATIONAL CONTROL YET" and to commitment (c) "until the UI ships this is a
      MECHANISM PRESENT, ⛔ NOT a lever anyone can pull". Commitments (a) and (b) are ⛔ **unchanged
      and still binding** — the mechanism stays, and hand-run SQL still may not be described as normal
      operation. Point (c) at the ratification, not at this story.
- [x] ⛔ **Do not write "operational control" as an achieved state, and do not write "Row 17 closed".**
      The honest sentence is: *the UI now exists; the switch remains not an operational control until
      the ratifying Decision lands.* Trap 5 lives or dies on this wording.
- [x] Grep for surviving copies of the superseded "a future story if one is wanted" framing
      (`grep -rin "future story if one is wanted" packages apps docs`) — Story 11a.3's second review
      found one; confirm none remain.
- [x] ⚠ **`packages/domain` is otherwise untouched.** This task changes **comments only** — ⛔ zero
      changes to `SEED_PERMISSION_KEYS`, ⛔ zero `PERMISSION_CATALOG_VERSION` bump (AC6), ⛔ zero
      changes to any function body. The diff for these two files must be comment lines and nothing else.

### Task 7 — Tests (AC: 1, 2, 4, 5, 6, 9)
- [x] **Live-DB integration**, new file `apps/api/tests/integration/directory-publication/admin.spec.ts`:
  - A `super_admin` session flips a Pariwar's directory `enabled: true → false` through the real
    route; assert the row, the audit line (via the hash-chain reader, the `degraded-mode` spec's own
    assertion style), and — reading through `resolveDirectoryPublicationEnabled` directly — that the
    public read path observes the change (AC1, AC4).
  - The reverse flip (`false → true`) through the same route (AC4's "both directions" requirement).
  - A session **without** the grant (e.g. `pariwar_admin`) gets `403` on the write route; the row is
    unchanged (AC2).
  - An unauthenticated request gets `401` (AC2).
  - A write with an empty/whitespace rationale is rejected server-side with a **`400`** from the
    contract boundary (`rationale` `.min(1)` after trim) — proving the client-side
    disable-until-non-empty (Task 4) is a courtesy, not the boundary (mirrors AC3/AC5 of Story 10.29's
    "the UI check is presentational" pattern).
    ⛔ **Assert the status is 400. A 500 is a FAILING test, not an alternative pass.**
    `UngovernedDirectoryPublicationChangeError` `extends Error`, is not an `ApiError`, and is **not**
    registered in `apps/api/src/middleware/error-mapping/index.ts` — whose documented fallback is
    "Anything else → 500 `internal.error`". If your route can reach that throw, the contract gate is
    missing; fix the contract, ⛔ do not widen the assertion to accept the 500.
  - GET on a Pariwar with no row returns the default-enabled shape (AC1).
- [x] **Unit (DB-free):** the new contracts round-trip; `SetDirectoryPublicationRequest` rejects a
      supplied `changedByDisplay` key (`.strict()` — proves Trap 2 is unrepresentable on the wire, not
      merely unused).
- [x] **AC5 source-scan test:** a small Vitest test (in `apps/admin` or `packages/contracts`, wherever
      the new UI-copy file lives) asserting `/immediately|instantly|right away/i` does not appear in
      the new i18n strings or the new handler/route files' comments — mirrors the shape of
      `delivery-terminology-gate.test.ts`. ⭐ **Prove it has teeth**: temporarily insert the word,
      confirm the test goes RED with real output, revert, re-run green.
- [x] **AC6 regression:** run `packages/domain/tests/rbac/permissions.test.ts` (or the catalog-shape
      test covering `SEED_PERMISSION_KEYS`/`PERMISSION_CATALOG_VERSION`) unmodified; record it green,
      proving the catalog is untouched.
- [x] `pnpm --filter @twt/admin test` — the new page/form/route components, RTL-tested to the depth
      `apps/admin/tests/feature-flags-page.test.tsx` uses as precedent. ⚠ ⛔ There is **no**
      degraded-mode admin test to copy — `degraded-mode` is the precedent for the route/page *shape*
      only, `feature-flags-page.test.tsx` for the *testing* shape.
- [x] **AC9 regression:** `pnpm --filter @twt/domain test tests/rbac/` plus
      `packages/domain/tests/integration/rls/directory-publication-policy.spec.ts` — both green and
      **unmodified**, proving Task 6 changed comments and nothing else.

### Task 8 — Verification (AC: all)
- [x] `pnpm ci:local` — all static gates. ⚠ `git push` runs the full `ci:local` via a pre-push hook
      (the "hang") ([[project_friction_budget_baseline_ratchet]]).
- [x] Live-DB **single-pass** for `@twt/domain` and `@twt/api`. ⛔ Do **not** export `DATABASE_URL`
      globally ([[project_ci_local_double_run_pollution]]). Confirm a suspect spec's innocence by
      running it in isolation, never by assumption ([[project_known_livedb_test_failures]]).
- [x] Per-package `lint` for every package touched ([[project_eslint_config_per_package_cwd]]).
- [x] Record every count as a real local run; anything not captured is recorded **un-attested**, never
      reconstructed ([[feedback_record_unattested_no_backfill]],
      [[feedback_verify_before_committing_governance_claims]]).
- [x] Flip `development_status[10-30-directory-publication-kill-switch-admin-ui]` to `review`, then
      `done` on completion, with ONE combined reverse-chron `last_updated` comment
      ([[project_sprint_status_ledger]]). ⛔ Do **not** touch `epic-10-retrospective` or Row 17's
      `current_status` — see Trap 5 / Task 1.

---

### Review Findings

_(none yet — populated by `bmad-code-review`)_

## Dev Notes

### Files being CREATED (new module, no existing file carries this concern)

| File | Mirrors | Notes |
|---|---|---|
| `packages/contracts/src/directory-publication/publication.ts` (+ `index.ts`) | `degraded-mode/declarations.ts` (+ `index.ts`) — domain-noun filename, ⛔ no `-admin` suffix | `.strict()`; `rationale` `.min(1)` after trim (the 400 boundary); explicit `configured: boolean`; ⛔ no `changedByDisplay` on the request (Trap 2) |
| `apps/api/src/modules/directory-publication/{handlers,routes,index}.ts` | `apps/api/src/modules/degraded-mode/` (⛔ its 4th file, `composition.ts`, has no analogue here) | `getDisplayName` + `AdminDisplayNameMissingError` fail-closed before the write; `withCompensatingAudit` for the audited mutation |
| `apps/admin/src/modules/directory-publication/{DirectoryPublicationPage,…}.tsx` | `apps/admin/src/modules/degraded-mode/` | Standing (not conditional) AC5 disclosure line |
| `apps/admin/src/routes/DirectoryPublicationRoute.tsx` | `apps/admin/src/routes/DegradedModeRoute.tsx` **exactly** | No client-side grant gate (Trap 3) |

### Files being MODIFIED — read each **before** editing

| File | What it does today | What changes | What must NOT break |
|---|---|---|---|
| `apps/api/src/server.ts` | Registers every module via its own `register*Module(app, deps)` call, grouped loosely by story | +1 `registerDirectoryPublicationModule(app, deps)` call near `registerDegradedModeModule` | The existing registration order and every other module's wiring |
| `packages/contracts/src/index.ts` | Re-exports every per-domain contracts folder | +1 `export * from './directory-publication/index.js'` | Every existing export; no name collisions with `degraded-mode`'s own `DegradedModeActiveResponse`-style names |
| `apps/admin/src/router.tsx` | ~25 `/p/$pariwarId/...` route registrations, one `createRoute` block each | +1 block, following the exact shape of the `feature-flags`/`degraded-mode` entries immediately above it | Every existing route; route path uniqueness |
| `openapi/v1.yaml` | Generated by `emit-openapi.ts`, determinism-gated in CI | +2 new paths (GET/PUT `.../directory-publication/status`) | The generator-determinism CI gate — re-run the emit script, do not hand-edit the YAML |
| `docs/launch-gate-inventory/inventory-roster.md` | Row 17, `current_status: open`, `cross_story_discharge_path` pointing at "no story file yet" | Point the discharge path at this story file; `current_status` **stays `open`** (Trap 5) | Every other row; the row's own closure-status-aggregation discipline |
| `packages/domain/src/rbac/permissions.ts` (~552, **comment block only**) | Asserts "NO ADMIN UI SHIPS WITH THIS KEY, AND THE SWITCH IS THEREFORE NOT AN OPERATIONAL CONTROL" — true today, false the moment this story lands | The "no UI" half is corrected to cite Story 10.30; the "not an operational control" half **stays** (Task 6 / AC9) | ⛔ `SEED_PERMISSION_KEYS`, ⛔ `PERMISSION_CATALOG_VERSION` (AC6) — the diff here is comment lines and nothing else |
| `packages/domain/src/member/directory-publication.ts` (header ~16-30, **comment block only**) | "⛔⛔ NOT AN OPERATIONAL CONTROL YET"; commitment (c) "until the UI ships this is a MECHANISM PRESENT" | Same split correction (Task 6 / AC9); commitments (a) and (b) unchanged and still binding | ⛔ Every function body — `setDirectoryPublicationEnabled`'s validation is out of scope and its guard spec must stay green unmodified |

### Reuse — do **NOT** reinvent

- **`setDirectoryPublicationEnabled` / `getDirectoryPublicationRow`** (`packages/domain/src/member/directory-publication.ts`) already validate everything a governed write needs. The handler's entire job is assembling the correctly-shaped input and calling them.
- **`getDisplayName(deps.pool, actorId)`** (`apps/api/src/modules/auth/admin/admin-auth.repo.ts:186`) — the house server-side display-name resolver. ⛔ Do not read `users.display_name` with a fresh query; this accessor is the single source.
- **`request.scopeGrants`** (`apps/api/src/types.ts:45`, populated by `scopeResolutionHook` at `middleware/scope-resolution/index.ts:72`) — the actor's already-loaded `EffectiveGrant[]`. ⛔ Do not call `loadActorGrants` a second time. The fail-closed idiom is `request.scopeGrants ?? []` (see `member-moderation/handlers.ts:337` for why an absent value must resolve to *no* grants).
- **`audit.withCompensatingAudit`** (`@twt/domain`, used at `degraded-mode/handlers.ts:74`) — the ADR-0030 compensated-audit pattern for a mutation that must be audited in the same logical operation. ⛔ Do not hand-roll a `writeAuditEntry` call beside the mutation.
- **`AdminDisplayNameMissingError`** (`apps/api/src/http-errors.js`) — the house typed error for a missing display name, already thrown at four other call sites. ⛔ No bare `throw new Error`.
- **`requireAdminSession` / `scopeResolutionHook` / `requirePermissionHook`** — the exact three-hook chain every other pariwar-scoped admin-write route uses. ⛔ Do not invent a fourth hook or reorder the chain.
- **`DegradedModeRoute.tsx`** — copy its gate logic verbatim for the new route (Trap 3); it is the correct precedent for a pariwar-dimension permission, not `ProvisioningRoute.tsx` (global-dimension).

### Anti-patterns this story is specifically exposed to

1. **Re-validating rationale/audit-anchor logic in the handler** that `setDirectoryPublicationEnabled` already owns (Trap 1).
2. **A client-supplied `changedByDisplay`** (Trap 2) — the exact defect class Story 10.29's whole subject was about (a caller-supplied fact wearing an authoritative field's name).
3. **Copying `ProvisioningRoute.tsx`'s global-grant gate** onto a pariwar-dimension permission (Trap 3) — would deny every operator including `super_admin`, since the grant never appears in `nationalGrants`.
4. **"Immediately" leaking into UI copy or comments** (Trap 4/AC5) — a specific, ratified word-choice constraint, not a generic quality bar.
5. **Treating story completion as launch-gate closure** (Trap 5) — the single most consequential mistake this story could make; it would misrepresent a ratification event that has not happened.
6. **Widening scope to the `kyc/presentation-policy.ts` switch** because it looks identical — it was never ratified as a launch gate; building its UI here is unearned scope (see "A parallel gap").
7. **Domain-camelCase vs contracts-snake_case drift** across the new field's hops ([[feedback_story_validate_footguns]]).
8. **Shipping the UI while the code still says it does not exist** (AC9/Task 6) — two authoritative comments assert "NO ADMIN UI SHIPS WITH THIS KEY". A comment asserting a falsehood stops the next reader from looking, and this is the same defect 11a.3's second review already caught once.
9. **Over-correcting those comments into "now an operational control"** — the mirror-image error, and the more dangerous one: it claims a ratification that has not happened (Trap 5).
10. **Letting the domain's `Ungoverned…Error` be the rejection path** — it is unregistered in `errorMappingHandler`, so it surfaces as an opaque 500 on what should be a 400 (contract) or 403 (permission hook).

### Testing standards

- **Live DB** at `twt-test-pg`:5433 ([[project_live_db_test_gotchas]]). Assert membership/state, not counts, against own-committing writers.
- ⛔ Do not export `DATABASE_URL` globally ([[project_ci_local_double_run_pollution]]).
- The AC5 source-scan test must be proven to have teeth (insert the forbidden word, confirm RED, revert) — a test that cannot fail proves nothing.
- ⛔ **No test may assert a `500`.** Every rejection this story can produce has a designed status: `400` (empty rationale, contract), `401` (no session), `403` (no grant, permission hook), `409` (`admin.display_name_missing`). A 500 anywhere means an error escaped `errorMappingHandler`'s registry — that is the bug, not the expectation.
- Both write directions (enable→disable, disable→enable) must be exercised through the **real route**, not by hand-inserting rows — mirrors the `10.29` "drives the real route" discipline.

### Previous-story intelligence

**From Story 10.29 (`done`, the numerically-previous Epic 10 story):**
- Task 1 is a `governance:`-prefixed decision-log commit touching **zero** `packages/`/`apps/` files, landing **before** implementation. Same shape here (Task 1).
- Its Trap 2 lesson (`expect(...).not.toBeNull()` proves nothing already true before the change) generalizes: this story's AC4 "both directions" tests must prove the flip actually happened, not merely that a call did not error.
- Its review found a caller-supplied field wearing an authoritative field's name (`member_requested_staff_mediation`) — the same shape as this story's Trap 2 (`changedByDisplay`). Both stories independently arrived at "resolve server-side, refuse to accept from the caller."

**From Story 11a.3 (`done`, the story that shipped this story's entire domain substrate):**
- The kill switch's own module header (`directory-publication.ts:1-30`) is the authoritative statement of what this UI must and must not claim. Re-read it before writing any UI copy — it names the exact three commitments (mechanism stays; no description as normal manual operation; not an operational control until the UI ships) this story discharges the third of.
- The second-round review on 11a.3 found a **stale comment** that had said a console surface was "a future story if one is wanted" — since superseded to "not optional, a directive." ⭐ **This story inherits that defect in its live form**: two comments still assert no UI ships with this key. AC9 / Task 6 discharge it, and the grep for the old framing runs there.

### Git intelligence (last 5 commits)

```
46ffc59 governance(11a.3): Decision 2026-08-21-147 — the kill-switch admin UI is a LAUNCH GATE       ← BASELINE
17a315f chore(11a.3): sprint-status ledger — record the 2026-08-21-146 ratification
92debf7 governance(11a.3): Decision 2026-08-21-146 — Panel RATIFIES -145; ⛔ the kill switch is NOT an operational control
fb97bd8 governance(11a.3): route Decision 2026-08-21-145 for trustee ratification
41a33ad chore(11a.3): second review round applied — story record + sprint-status → done
```

Pattern: `governance:` commits precede the story-authoring/implementation commits that discharge them.
This story's Task 1 follows the same shape.

### Library / framework context — ⛔ NO NEW DEPENDENCIES

This story adds **zero** packages — every piece (Fastify route hooks, Zod contracts, TanStack Query
on the admin client, the audit writer) is already pinned and used by `degraded-mode`/`feature-flags`,
which this story mirrors file-for-file. See those modules' `package.json`s for the pins already in
force; do not add anything new for a single toggle page.

### Project Structure Notes

- New per-domain folders on both sides: `packages/contracts/src/directory-publication/` and
  `apps/api/src/modules/directory-publication/` and `apps/admin/src/modules/directory-publication/` —
  the established one-folder-per-concern convention (confirmed against 40+ existing sibling folders at
  authoring time).
- `packages/contracts` must **never** import `@twt/domain`'s pg-touching namespaces
  ([[project_contracts_domain_bundle_boundary]]) — not relevant to this story's contract additions
  (plain Zod shapes), but keep the boundary in mind if any accessor types are referenced.
- Route path convention: `/p/$pariwarId/directory-publication` (admin console) and
  `/api/v1/p/:pariwarId/admin/directory-publication/status` (API) — both match the `degraded-mode`
  sibling's naming shape exactly.

### References

- `.decision-log.md#decision-2026-08-21-147` — the launch-gate designation (cl.1) + Epic 10 ownership (cl.2).
- `.decision-log.md#decision-2026-08-21-146` — cl.5, the "not an operational control until a UI ships" ruling this story discharges.
- `.decision-log.md#decision-2026-08-21-145` — cl.5(e), the `s-maxage=300` edge-cache floor AC5 discloses.
- `docs/launch-gate-inventory/inventory-roster.md` Row 17 — closure criteria + the "a `done` story alone does NOT close this row" discipline (Trap 5).
- `packages/domain/src/member/directory-publication.ts` — the domain substrate this story exposes, unmodified.
- `packages/domain/src/rbac/permissions.ts:905-921` — the `pariwar.manage_directory_publication` key, catalog v38, unmodified.
- `apps/api/src/modules/degraded-mode/{handlers,routes,index}.ts` — the file-for-file structural precedent.
- `apps/admin/src/routes/DegradedModeRoute.tsx` — the exact client-side gate pattern to copy (Trap 3).
- `apps/admin/src/modules/feature-flags/FeatureFlagsPage.tsx` — the "minimal by design" console-page precedent + its `describeFlipError`-style error mapping.
- `_bmad-output/implementation-artifacts/10-29-member-authored-staff-mediation-request.md` — the numerically-previous story; its Trap 2 (caller-supplied field wearing an authoritative name) is the same shape as this story's Trap 2.

---

## Dev Agent Record

### Implementation Plan

Followed the Tasks/Subtasks sequence exactly. Task 1 (`governance:`) committed FIRST, touching zero
`packages/`/`apps/` files, per `[[feedback_governance_commits_precede_implementation]]` and the 10.29
precedent. Implementation then landed contracts → API → console → route → the AC9 comment correction
→ tests.

The whole surface is a THIN wrapper: the only new logic anywhere is DTO-shaping
(`toStatusDto`) and the fail-closed display-name resolution. Every governance rule
(rationale, audit anchor, actor/display consistency, the grant check) stayed inside
`setDirectoryPublicationEnabled`, which is why `packages/domain`'s diff contains zero executable
lines.

### Debug Log

- **AC5 gate self-hit.** The first draft of `i18n-en.ts` spelled the banned adverbs out in its own
  header comment as a warning to future editors — which the source-scan test then found, correctly,
  as a violation. Resolved the way `delivery-terminology-gate.test.ts` resolves it: the gate
  assembles each needle at runtime and excludes itself by name, and the copy file's comment now
  points AT the gate instead of restating the list. The same care applied to `hooks.ts`, whose first
  draft used "immediate" about the query invalidation; rewritten to say what it actually means
  (the OPERATOR's view refreshes; the PUBLIC's does not).
- **Admin RTL mock leakage.** `not.toHaveBeenCalled()` in the whitespace-rationale case failed at
  first with "Number of calls: 3" — module-scoped `vi.hoisted` mocks accumulating across tests.
  Fixed with a `beforeEach(vi.clearAllMocks)`; without it the assertion would have been failing (or
  passing) for reasons unrelated to the behaviour under test.
- **Error-envelope shape.** The 409 assertion initially read `res.json().code`; the house envelope
  nests it (`ErrorResponse` → `error.code`). The STATUS was correct on the first run — only the
  assertion's path into the body was wrong.
- **`publicReadSaysEnabled` nearly went through `deps.db` unscoped**, which (RLS applying, no scope
  set) would have read zero rows and returned the default `true` for every case — a silently vacuous
  assertion. Switched to a real `openScopeTx`, the same RLS-scoped handle
  `public-pages/handlers.ts:137` uses.

### Completion Notes

**What shipped.** A super_admin can now read and flip a Pariwar's directory-publication state from
`/p/$pariwarId/directory-publication`, both directions, with a required rationale, and see who last
changed it and why — over `GET`/`PUT /api/v1/p/:pariwarId/admin/directory-publication/status` on the
chain `[requireAdminSession, scopeResolutionHook, requirePermissionHook(pariwar.manage_directory_publication)]`.
Decision `2026-08-21-148` records it.

⛔ **ROW 17 DOES NOT CLOSE BY THIS STORY, AND THE SWITCH IS STILL NOT AN OPERATIONAL CONTROL.**
`docs/launch-gate-inventory/inventory-roster.md` Row 17's `current_status` remains `open` and its
`closure_evidence_link` remains empty. Only `cross_story_discharge_path`'s "no story file yet" clause
was updated, to name this story. Closure additionally requires a Decision recording ≥2-trustee
ratification that the switch may be TREATED as an operational control — an event outside this story's
authority. ⇒ **the public Member Directory still may not go live.** The UI existing and the Panel
ratifying are two different facts and this story only produced the first (Trap 5).

⚠ **The control is not immediate, and the surface says so.** `/members` is `edge_cacheable` with
`s-maxage=300`, so a pulled Pariwar keeps being served from warm PoPs, per page number, for up to
five minutes (`2026-08-21-145` cl.5(e)). The console carries a STANDING disclosure — rendered in
every state including loading and error, not only on success — and
`apps/admin/tests/directory-publication-terminology.test.ts` fails the build on
*immediately*/*instantly*/*right away* in the new copy or comments.

**Per-AC:**
- **AC1** — GET returns an explicit `configured: boolean` (absence is never inferred from all-null
  attribution); PUT calls `setDirectoryPublicationEnabled` with a server-resolved display name, a
  pre-generated `auditId` and `request.scopeGrants ?? []`, inside `audit.withCompensatingAudit`. An
  empty/whitespace rationale is rejected with **400** at the contract boundary (`.trim().min(1)`).
- **AC2** — 403 for `pariwar_admin` and `district_admin` (row provably unchanged, zero audit lines);
  401 unauthenticated on both routes. ⛔ No test asserts a 500 anywhere.
- **AC3** — the page renders state + last-changed attribution + the flip form; submit is disabled
  until a non-empty rationale (a courtesy — the 400 stays reachable and is tested); a 403 surfaces as
  readable copy and does NOT hide the form (no client-side capability check — Trap 3).
- **AC4** — both directions driven through the REAL route, with the flip asserted against the stored
  row AND against `resolveDirectoryPublicationEnabled` through a real scope tx.
- **AC5** — standing disclosure + the source-scan gate, **proven to have teeth in both halves**:
  inserting "immediately" turned it RED with real output, and separately deleting the disclosure
  turned the presence assertion RED. Reverted; green.
- **AC6** — ⛔ zero `SEED_PERMISSION_KEYS` change, zero `PERMISSION_CATALOG_VERSION` bump, zero new
  migrations. `packages/domain/tests/rbac/` ran **unmodified** and green (153 tests), as did
  `tests/integration/rls/directory-publication-policy.spec.ts` (16 tests).
- **AC7** — `governance:` commit `eb0bb46` landed before any implementation commit, zero
  `packages/`/`apps/` files, and states Row 17 does not close.
- **AC8** — policy-meaning note: **not applicable**, stated in the AC itself. No new predicate gates
  a member's access to a benefit and no existing one changed meaning; this is an operating surface
  for an already-ratified predicate.
- **AC9** — both stale comments corrected, each only in its "no UI exists" half; both continue to
  state the switch is NOT an operational control. `grep -rin "future story if one is wanted"` over
  `packages apps docs` returns **zero hits**. The `packages/domain` diff is **provably comment-only**
  (`git diff -U0 packages/domain | grep -vE '^[+-]\s*//'` → empty).

### Verification — every count a real local run

| Suite | Baseline (pre-edit, at `46ffc59`) | Final | Δ |
|---|---|---|---|
| `pnpm --filter @twt/contracts test` | 61 files / 1035 tests ✅ | 62 files / 1049 tests ✅ | +1 file, +14 tests |
| `pnpm --filter @twt/admin test` | 34 files / 355 tests ✅ | 36 files / 375 tests ✅ | +2 files, +20 tests |
| `pnpm --filter @twt/domain test tests/rbac/` | 4 files / 153 tests ✅ | 4 files / 153 tests ✅ | unchanged + **unmodified** (AC6) |
| `directory-publication-policy.spec.ts` (live DB) | 1 file / 16 tests ✅ | 1 file / 16 tests ✅ | unchanged + **unmodified** (AC9) |
| `apps/api` `tests/integration/public-pages` (live DB) | 2 files / 14 tests ✅ | 2 files / 14 tests ✅ | unchanged |
| `packages/domain` `tests/integration` (live DB, single pass) | — | 126 files / 1157 tests ✅ | no regressions |
| `apps/api` `tests/integration` (live DB, single pass) | — | 80 files / 734 tests ✅ | includes the new 11 |
| `pnpm ci:local` | — | **PASSED — 31 jobs green** | — |
| per-package `lint` (contracts, domain, api, admin) | — | all 4 clean ✅ | — |

Live DB: `twt-test-pg` on `:5433`, `DATABASE_URL` passed **per-invocation**, ⛔ never exported
globally ([[project_ci_local_double_run_pollution]]). `ci:local` reports
`SKIP integration-tests` for exactly that reason; the live legs were run separately, single-pass.

**Task 0 baselines were taken BEFORE any edit**, and the grep re-confirmation found **ZERO DRIFT**:
case-insensitively, exactly one hit — `apps/api/src/modules/public-pages/handlers.ts:137` — matching
the story's own corrected line number.

### File List

**Created**
- `packages/contracts/src/directory-publication/publication.ts`
- `packages/contracts/src/directory-publication/index.ts`
- `packages/contracts/tests/directory-publication.test.ts`
- `apps/api/src/modules/directory-publication/handlers.ts`
- `apps/api/src/modules/directory-publication/routes.ts`
- `apps/api/src/modules/directory-publication/index.ts`
- `apps/api/tests/integration/directory-publication/admin.spec.ts`
- `apps/admin/src/modules/directory-publication/DirectoryPublicationPage.tsx`
- `apps/admin/src/modules/directory-publication/PublicationForm.tsx`
- `apps/admin/src/modules/directory-publication/i18n-en.ts`
- `apps/admin/src/routes/DirectoryPublicationRoute.tsx`
- `apps/admin/tests/directory-publication-page.test.tsx`
- `apps/admin/tests/directory-publication-terminology.test.ts`

**Modified**
- `.decision-log.md` — Decision `2026-08-21-148` (Task 1, governance commit)
- `docs/launch-gate-inventory/inventory-roster.md` — Row 17 `cross_story_discharge_path` only; ⛔ `current_status` and `closure_evidence_link` untouched
- `packages/contracts/src/index.ts` — barrel re-export
- `packages/contracts/scripts/emit-openapi.ts` — components + the two paths
- `openapi/v1.yaml` — regenerated (⛔ not hand-edited); determinism gate green
- `apps/api/src/server.ts` — `registerDirectoryPublicationModule`
- `apps/admin/src/api/client.ts` — typed fetch wrappers
- `apps/admin/src/api/hooks.ts` — query + mutation hooks
- `apps/admin/src/router.tsx` — `/p/$pariwarId/directory-publication`
- `packages/domain/src/rbac/permissions.ts` — **comment lines only** (AC9)
- `packages/domain/src/member/directory-publication.ts` — **comment lines only** (AC9)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — status flips + ledger

### Change Log

| Date | Change |
|---|---|
| 2026-08-21 | Task 1 — `governance:` Decision `2026-08-21-148` + Row 17 discharge-path update committed FIRST (`eb0bb46`), zero `packages/`/`apps/` files. |
| 2026-08-21 | Tasks 2–5 — contracts, API module, admin console module and route registration; OpenAPI regenerated. |
| 2026-08-21 | Task 6 — AC9 stale-claim correction: both comments record the UI shipped and both keep "NOT an operational control". Comment-only diff, proven. |
| 2026-08-21 | Task 7 — 14 contract tests, 11 live-DB integration tests, 15 admin RTL tests, 5 terminology-gate tests; the AC5 gate proven RED in both halves then reverted green. |
| 2026-08-21 | Task 8 — `ci:local` 31/31 green; live-DB single-pass domain (1157) + api (734); four packages lint-clean. Status → review. |
