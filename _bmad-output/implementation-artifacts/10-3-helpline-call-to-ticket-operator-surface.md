---
baseline_commit: 26c140c15e074fb9d771b72c4abb72371982ee63
---

# Story 10.3: Helpline Call-to-Ticket Operator Surface (SM-1 C3) `[SURFACE]`

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a helpdesk operator receiving an inbound call,
I want a surface to create a helpdesk ticket on the member's behalf — identifying the caller via the FR-12A member lookup, capturing their stated issue, and stamping the ticket with `created_via: helpline_call` + my operator-name attribution,
so that callers without app access get the same structured, routed, SLA-tracked support as members who file from the app.

## Scope Boundary (read first — prevents over-build)

This is a `[SURFACE]` story. It is the **operator (admin-app) front door** to the create-ticket primitive that **Story 10.1 already built and already supports** for the `helpline_call` path. The 10.1 admin route (`POST /api/v1/p/:pariwarId/helpdesk/tickets`, `apps/api/src/modules/helpdesk/handlers.ts`) **already** resolves `operator_attribution` from the operator's session `display_name`, sets `actor: 'operator'`, computes routing + SLA, and persists the genesis under a compensating audit. So the API is 90% done — this story is mostly the **operator UI**, the **member-side "we filed this for you" surfacing**, and closing the **`helpdesk.create` RBAC gap** that 10.1/10.2 explicitly re-deferred here.

| In scope (10.3) | Out of scope → owning story |
|---|---|
| **Close the RBAC gap:** mint a `helpdesk.create` permission key (catalog v22→23) + gate the **existing** 10.1 admin route with `requirePermissionHook(deps, HELPDESK_CREATE_KEY, { dimension: 'pariwar' })` + grant it to `helpline_operator` + `district_admin` + `pariwar_admin` (super_admin auto-derives). This is the gap 10.1 (chunk-4 `[Defer]`) and 10.2 (Dev Notes) re-deferred to "Story 10.3/10.4 — whichever touches that route next." 10.3 touches it. | — |
| Operator UI: `apps/admin/src/modules/helpdesk/` module + `/p/$pariwarId/helpdesk` TanStack route — a two-pane operator console (mirror `<HelplineConsoleShell>`): LEFT = member lookup (**reuse** the shipped Story 4.7 `<MemberLookupForm>` + `<MemberSearchResults>`, scope-respecting, exact-match); RIGHT = category picker + verbal-issue body capture + submit → "filed" confirmation showing the routing target + SLA | — |
| Admin api-client function (`createHelplineTicket`) + a `useCreateHelplineTicket` mutation hook (the `useHelplineClaimIntake` precedent) that POSTs the existing `CreateTicketRequest` with `created_via: 'helpline_call'`, `subject_member_id` = the looked-up member, category + `sub_category` + body | — |
| **Member-side surfacing:** add `created_via` to `MemberTicketListItem` + `operator_attribution` to `MemberTicketDetailResponse` (a **scoped, AC-mandated** exception to [[project_admin_display_name_attribution]] — see Dev Notes) so the member app can render the "We filed this for you — Operator [Name]" header | — |
| Mobile: `apps/mobile/app/(helpdesk)/[ticketId].tsx` renders the **"We filed this for you — Operator [Name]"** header when `created_via === 'helpline_call'`; inbox may badge helpline-filed tickets. Reply round-trip is **identical** to a member-filed ticket (the 10.2 read-only thread reader already handles it unchanged) | — |
| Tests: API integration (operator create success + `operator_attribution` = operator display_name + routing + audit; **RBAC 403 without the key / 201 with it**; the member then sees the operator-filed ticket in their own inbox with the header fields); admin UI component/interaction tests; mobile detail-header render test | — |
| **New API create-handler logic** — the 10.1 `handlers.ts` `create()` already does the helpline path end-to-end. Do **not** fork a second handler; the ONLY API change is the permission hook + the member-DTO surfacing | 10.1 (built) |
| Attachment upload in the operator surface (operator transcribes verbally; the admin create route accepts `attachments[]` but the v1 console captures body text only) | Documented seam — not built |
| Non-member callers with **no** member record (`subject_actor_id` path) — the schema supports it, but the v1 console identifies a **member** via lookup (`subject_member_id`) | Documented seam — the `subject_actor_id` intake variant is a later refinement |
| Admin helpdesk **console / queue / SLA-tracking / SLA-breach alerts / cross-link navigation** | **Story 10.4** |
| Member/staff **reply-append WRITE** + `helpdesk_reply` push EMITTER | **Story 10.4** |
| Step-up OTP on ticket create | **N/A** — helpdesk ticket creation is **not** a freeze-firing action and is **not** in the AR-24 step-up list (unlike the 6.3 claim intake). Do NOT add `requireStepUp` here. |

**The operator files through the EXISTING primitive.** The 10.1 admin route (`POST …/helpdesk/tickets`) is *the* live tenant-scoped caller 10.1's own `routes.ts` header named for this story: "the operator call-to-ticket surface (Story 10.3) is the live tenant-scoped caller." 10.3 adds **no new event type, no migration, and no new create handler** — it adds a permission gate, an operator UI, and a narrow member-facing surfacing of the two operator fields already stored on the row.

## Acceptance Criteria

**AC1 — Operator identifies the member, captures the issue, files (the core flow).**
Given SM-1 demo beat C3 + Story 10.1's routing-policy primitive + Story 4.6 Validity Service lookup,
When the operator surface is implemented,
Then the operator opens `/p/:pariwarId/helpdesk` (tenant-scoped, session-gated like every `/p/$pariwarId/` admin route) and identifies the member via the shipped Story 4.7 `<MemberLookupForm>` + `<MemberSearchResults>` (exact-match by mobile / member_id / browse-Pariwar — **reused, not re-implemented**, scope-respecting);
And after selecting a member, the operator selects a **category** (+ optional **subcategory**) from the in-force routing policy and captures the member's stated issue verbally as the **body**, then submits;
And submission POSTs the **existing** `CreateTicketRequest` (`apps/api/src/modules/helpdesk/routes.ts`) with `created_via: 'helpline_call'`, `subject_member_id` = the selected member's id (`subject_actor_id: null`), `category`, `sub_category`, `body` — the server-authoritative routing/scope-context/SLA are **never** client-supplied (the 10.1 contract already enforces this).

**AC2 — The ticket is stamped with server-resolved operator attribution.**
Given the created ticket,
Then the persisted row carries `created_via: 'helpline_call'`, `actor: 'operator'`, `actorId` = the operating admin's user id, and `operator_attribution` = the operator's session `display_name` — **server-resolved, never client-supplied** ([[project_admin_display_name_attribution]]; the 10.1 `handlers.ts` already resolves this via `getDisplayName` and **fail-closes** with `AdminDisplayNameMissingError` if the operator has no display name — no blank/derived fallback);
And the routing decision + SLA due dates are computed by the same 10.1 orchestration a member-filed ticket uses (deterministic, audit-replayable, non-retroactive policy version snapshot); an audit line records the routing decision (inputs + policy version + outputs).

**AC3 — The ticket is a first-class citizen in the member's own inbox — with a "we filed this for you" header.**
Given a member whose ticket an operator filed on their behalf,
When that member opens their app helpdesk inbox (the Story 10.2 surface),
Then the operator-filed ticket appears in `GET …/member/helpdesk/tickets` exactly like a self-filed one (it matches `subject_member_id = actorId`), with the same status / routing target / SLA rendering;
And the ticket **detail** (`GET …/member/helpdesk/tickets/:ticketId`) surfaces a **"We filed this for you — Operator [Name]"** header — driven by two new member-DTO fields: `created_via` (on the list item, so the inbox can badge helpline-filed tickets) and `operator_attribution` (on the detail response, the operator's display name); for a member-filed ticket these are `'member_app'` / `null` and the header does **not** render;
And the read-only reply thread renders **unchanged** — the 10.2 `replayTicketThread` reader already handles this stream with zero change; the reply round-trip (once 10.4 lands) works identically to a member-initiated ticket (nothing about `created_via: 'helpline_call'` special-cases replies).

**AC4 — The create route is permission-gated (closing the re-deferred RBAC gap).**
Given the 10.1 admin route currently sits behind `[requireAdminSession, scopeResolutionHook]` only — with **no** `requirePermissionHook` (the gap 10.1's chunk-4 review and 10.2's Dev Notes explicitly re-deferred to "Story 10.3/10.4"),
When this story is implemented,
Then a `helpdesk.create` permission key is minted (catalog `PERMISSION_CATALOG_VERSION` 22 → 23) and the route's preHandler chain becomes `[requireAdminSession, scopeResolutionHook, requirePermissionHook(deps, HELPDESK_CREATE_KEY, { dimension: 'pariwar' })]` (the `reconciliation.review` / `cycle.freeze` pariwar-dimension pariwar-wide-key precedent — a Pariwar-scoped helpdesk capability, resolvable TODAY against `scopeTx.pariwarId`);
And the key is granted to `helpline_operator` (the SM-1 C3 actor) and `pariwar_admin`; `super_admin` auto-derives the full catalog. **`district_admin` is deliberately NOT granted** — a district-ceiling grant can never satisfy this `pariwar`-dimension check ([[project_rbac_geo_scope_containment]]); granting it would be an inert capability. (Corrected during code review 2026-07-29 — the original text listed `district_admin` as granted; the implementation was always correct, only this AC's prose was stale.)
And an actor **without** the grant is fail-closed (audited 403); an actor **with** it succeeds (201) — both asserted by integration tests (revert-sanity: removing the grant flips the 201 test to 403).

**AC5 — Category picker is registry-driven + dignified copy.**
Given the per-Pariwar routing-policy registry (10.1) + UX-DR54 operator decision-strip / UX-DR55 (operator-facing precise wording permitted, but the member-visible header stays dignified),
When the operator opens the category picker,
Then the categories (+ subcategories) come from the Pariwar's **in-force** policy (reuse the 10.2 `GET …/categories` read, or its domain `categoriesForPariwar`, adapted to the admin session — do **not** hardcode the v1 category set in the UI);
And the member-facing header the operator's action produces ("We filed this for you — Operator [Name]") is dignified per UX-DR55 (member-facing copy: warm, no jargon, no raw enum), while the operator console itself may use precise operator wording (category keys, SLA target labels) per UX-DR54/DR55.

**AC6 — Tests + gates green.**
Given the merge gate is `pnpm ci:local` (`--concurrency=4`, DB on :5433),
Then live-DB integration tests cover: operator (holding `helpdesk.create`) files a ticket → 201 with `created_via='helpline_call'`, `operator_attribution` = the seeded operator display_name, correct routing + SLA + audit line; an actor lacking the key → **403** (and the with-key path → 201, the revert-sanity pair); the operator-filed ticket is then readable by that **member** via the 10.2 member route with `created_via`/`operator_attribution` populated; a `helpline_call` create by an operator with **no display_name** → the fail-closed `AdminDisplayNameMissingError` (no ticket, no audit-settled);
And the admin UI has component/interaction tests for the console (lookup → select member → category → body → submit → "filed" confirmation) following the `helpline-claims`/`member-status` module test conventions (pure presentational shell unit-testable without router/query);
And the mobile detail screen has a test that the "We filed this for you — Operator [Name]" header renders for a `helpline_call` ticket and is **absent** for a `member_app` ticket;
And `emit-openapi.ts` + `openapi/v1.yaml` are regenerated for the two new member-DTO fields; en/hi parity holds for any new helpdesk/admin copy; `pnpm ci:local` is green.

## Tasks / Subtasks

- [x] **Task 1 — RBAC: mint + grant + gate `helpdesk.create`** (`packages/domain/src/rbac/`, `apps/api/src/modules/helpdesk/routes.ts`) (AC4)
  - [x] Add `helpdesk.create` to the seed catalog in `packages/domain/src/rbac/permissions.ts` (append a catalog entry with a Story-10.3 rationale comment in the running version-bump ledger; bump `PERMISSION_CATALOG_VERSION` 22 → 23). Follow the existing entry shape exactly (the `reconciliation.review` entry is the closest model: a pariwar-dimension, pariwar-wide capability key).
  - [x] Add `const HELPDESK_CREATE = permissionKey('helpdesk.create');` in `packages/domain/src/rbac/roles.ts` and include it in the `permissions` array of the `helpline_operator`, `district_admin`, and `pariwar_admin` `RoleBundle`s (super_admin already carries the full catalog). Add a Story-10.3 grant-rationale comment on `helpline_operator` (the SM-1 C3 actor). **Note the roles.ts:304 comment "Helpdesk keys land Epic 10" — this is the story that lands the first one; update/extend that comment.**
  - [x] Gate the **existing** route in `apps/api/src/modules/helpdesk/routes.ts`: import `requirePermissionHook` from `../rbac/index.js`, expose the key handle (the `channel-config`/`reconciliation` route precedent — a module-local `HELPDESK_CREATE_KEY` handle), and change the create route's `preHandler` from `[adminSession, scope]` to `[adminSession, scope, requirePermissionHook(deps, HELPDESK_CREATE_KEY, { dimension: 'pariwar' })]`. Update the route header comment (it currently says the permission "land[s] with 10.2/10.3/10.4" — this closes it).
  - [x] `tests/rbac/roles.test.ts` + the catalog referential-integrity test already assert every role key exists in the catalog — verify they pass with the new key (a typo throws at load per `permissionKey`). Update the catalog-version assertion if one pins the number.
  - [x] **Do NOT add `requireStepUp`** — helpdesk create is not freeze-firing and not in AR-24 (unlike 6.3 claim intake). Document this explicitly (a reviewer will look for it given the 6.3 precedent).
- [x] **Task 2 — Contracts: member-side operator surfacing** (`packages/contracts/src/helpdesk/member.ts`) (AC3)
  - [x] Add `created_via: HelpdeskCreatedVia` to `MemberTicketListItem` (so the inbox can badge helpline-filed tickets). Import `HelpdeskCreatedVia` from `./ticket.js`.
  - [x] Add `operator_attribution: z.string().min(1).max(128).nullable()` to `MemberTicketDetailResponse` (the operator's display name; `null` for member-filed). The `128` bound matches `HelpdeskTicketDto.operator_attribution` (`ticket.ts:79`) — the same underlying value; keep the two bounds identical, don't invent a wider one. Keep `.strict()`. **This is the deliberate, AC-mandated narrowing of the 10.2 "a member never sees … operator identity" rule** — update the file header comment to record the exception (the FILING operator's name IS surfaced by AC3 design; the RESPONDER's name is still never surfaced — routing target stays role/scope-only).
  - [x] Keep contracts pure-Zod, no `@twt/domain` import ([[project_contracts_domain_bundle_boundary]]).
  - [x] Regenerate `openapi/v1.yaml`. **No `scripts/emit-openapi.ts` edit needed** — `MemberTicketDetailResponse`/`MemberTicketListResponse` are already registered there (they wrap the live Zod schema by reference), so the two new fields flow through automatically on regen.
  - [x] `packages/contracts/tests/helpdesk.test.ts` — extend the member-DTO cases: `created_via` accepted on the list item, `operator_attribution` nullable on the detail, `.strict()` still rejects unknowns.
- [x] **Task 3 — API: surface the two fields in the member reads** (`apps/api/src/modules/helpdesk/member-handlers.ts`) (AC3)
  - [x] `toMemberListItem` → add `created_via: row.createdVia`. `toMemberDetail` → add `operator_attribution: row.operatorAttribution` (both already on `HelpdeskTicketRow` from `getTicketForMember`). No new query — the row already carries them.
  - [x] Confirm `getTicketForMember`/`listTicketsForMember` (`packages/domain/src/helpdesk/read.ts`) already select `createdVia` + `operatorAttribution` (they map the full row); if a projection narrows columns, widen it.
  - [x] **No new route.** The operator create still uses the 10.1 admin route (now permission-gated). Do not add a member-app create path here (10.2 owns that).
- [x] **Task 4 — Admin api-client + hook** (`apps/admin/src/api/client.ts`, `hooks.ts`) (AC1)
  - [x] `createHelplineTicket(pariwarId, payload)` in `client.ts` — `apiFetch('/api/v1/p/${pariwarId}/helpdesk/tickets', CreateTicketResponse, { method: 'POST', body: JSON.stringify(payload) })`, payload typed as `CreateTicketRequest` with `created_via: 'helpline_call'`. (Same-origin cookie-bearing fetch — the admin session is a cookie, not a bearer; mirror `addPariwar`/`acknowledgeCheck`.)
  - [x] `useCreateHelplineTicket(pariwarId)` in `hooks.ts` — `useMutation` (the `useHelplineClaimIntake` precedent). On success, expose the created ticket (ticket_id + routing target + SLA) for the confirmation panel.
  - [x] A category read for the picker: reuse the domain `categoriesForPariwar` via a small admin-session GET, OR (simpler) call the existing member categories shape server-side under the admin route. **Recommended:** add a thin admin-session `GET /api/v1/p/:pariwarId/helpdesk/categories` reusing `categoriesForPariwar` (gated by the same `helpdesk.create` grant or a read grant) — do not duplicate the category list in the client. Document the choice.
- [x] **Task 5 — Admin operator console UI** (`apps/admin/src/modules/helpdesk/`) (AC1, AC5)
  - [x] `HelpdeskOperatorShell.tsx` — a **pure presentational** two-pane console (mirror `HelplineConsoleShell.tsx`: sticky header, LEFT `lookupSlot` for member search, RIGHT category/subcategory picker + body textarea + submit + "filed" confirmation). All state via props → unit-testable without hooks/router/query.
  - [x] `HelpdeskOperatorPage.tsx` — the container: injects the shipped `<MemberLookupForm>` + `<MemberSearchResults>` (Story 4.7, `modules/member-status/`) into `lookupSlot`, wires `useMemberSearch` + `useCreateHelplineTicket`, holds selection/category/body state, renders the confirmation (routing target + SLA) on success.
  - [x] `i18n-en.ts` — the module's en copy (the `helpline-claims`/`member-status` per-module `i18n-en.ts` precedent — admin app copy is per-module `resolveEn`, NOT the `packages/i18n` member namespaces). Operator-facing wording may be precise (UX-DR55).
  - [x] `apps/admin/src/routes/HelpdeskOperatorRoute.tsx` + register `/p/$pariwarId/helpdesk` in `apps/admin/src/router.tsx` (the `HelplineClaimRoute` gate pattern: pure `GateView` on session loading/error/success; server is the real boundary via the new permission hook).
- [x] **Task 6 — Mobile: "we filed this for you" header** (`apps/mobile/app/(helpdesk)/[ticketId].tsx`, `index.tsx`) (AC3)
  - [x] In `[ticketId].tsx`, when `detail.created_via === 'helpline_call'`, render a dignified header: "We filed this for you — Operator {operator_attribution}" (Hindi-first via the `helpdesk` i18n namespace; add the two keys, en/hi parity). Absent for `member_app`.
  - [x] Optionally badge helpline-filed tickets in the inbox `index.tsx` using the new `created_via` list field.
  - [x] Add the header/badge copy to `packages/i18n/locales/{en,hi}/helpdesk.json` (Hindi-first, parity gate). Reuse `useHelpdeskT`.
- [x] **Task 7 — Tests + gates** (AC6)
  - [x] API live-DB integration (`apps/api/tests/integration/helpdesk/operator-*.spec.ts` or extend the module suite): operator-with-key create → 201 (`created_via`, `operator_attribution`=seeded display_name, routing, audit); **no-key actor → 403** + **with-key → 201** (revert-sanity pair); the operator-filed ticket read back through the **member** route (10.2) carries `created_via`/`operator_attribution`; missing-display-name operator → `AdminDisplayNameMissingError`. Test DB `twt-test-pg` :5433; assert membership not counts ([[project_live_db_test_gotchas]], [[project_known_livedb_test_failures]]). Seed the operator user with a `display_name` + the `helpdesk.create` grant.
  - [x] Contracts tests (Task 2). RBAC roles/catalog tests (Task 1).
  - [x] Admin UI: `HelpdeskOperatorShell` component/interaction test (lookup slot → select → category → body → submit → confirmation) — the `helpline-claims` shell-test precedent.
  - [x] Mobile: `[ticketId]` header render test (present for `helpline_call`, absent for `member_app`).
  - [x] Run full `pnpm ci:local` (`--concurrency=4`) as the merge gate; run the DB-gated suites for the changed `.strict()` member contracts + the newly-gated route ([[project_fastify_onsend_doublesend]] — the create route already returns the body; don't reintroduce `void reply.status(201).send()`).

### Review Findings

- [x] [Review][Decision] AC4 grant-list text vs. actual implementation — resolved: updated AC4's prose to drop `district_admin` from the granted-roles list (implementation was always correct per [[project_rbac_geo_scope_containment]]; only the AC text was stale).
- [x] [Review][Decision] Operator-console "lookup" step tested only via a stubbed slot, not a real integration test — resolved: accepted as matching the existing helpline-claims shell-testing convention; no fix needed.
- [x] [Review][Patch] `GET /categories` route missing the `limits.read` rate-limit config used by every other read route in the codebase — fixed: added `config: { rateLimit: limits.read }` [apps/api/src/modules/helpdesk/routes.ts:72]
- [x] [Review][Patch] `HelpdeskOperatorShell`'s `canSubmit` gate doesn't re-validate the selected category/subcategory still exists in a refetched `categories` list — fixed: gate now checks `activeCategory !== null` + subcategory membership [apps/admin/src/modules/helpdesk/HelpdeskOperatorShell.tsx:80]
- [x] [Review][Patch] `HelpdeskFiledResult.routedToScope` hand-rolls a widened `{dimension: string; value: string|null}` instead of reusing the stricter `HelpdeskGrantScope` contract type — fixed: now reuses `HelpdeskGrantScope` [apps/admin/src/modules/helpdesk/HelpdeskOperatorShell.tsx:25]
- [x] [Review][Patch] `createHelplineTicket` doesn't force/narrow `created_via: 'helpline_call'` at the type level — fixed: narrowed the client function + hook signature to `Omit<CreateTicketRequest, 'created_via'> & { created_via: 'helpline_call' }`, and the call site now uses `satisfies` instead of a widening type annotation so the literal survives [apps/admin/src/api/client.ts:1124, apps/admin/src/api/hooks.ts:757, apps/admin/src/modules/helpdesk/HelpdeskOperatorPage.tsx:79]
- [x] [Review][Patch] `CreateTicketResponse`/`HelpdeskCategoryListResponse` each imported twice (value + type-aliased) — **reversed on inspection**: this matches the file's own established convention (`ClauseDraftResponse as ClauseDraft`, `DeployTriggerResponse as DeployResult`, etc. — every other contract type in this import block does the same). Not a defect; no change made.
- [x] [Review][Patch] Mobile "we filed this for you" test regex-matches raw source text instead of rendering and asserting on output — **reversed on inspection**: the entire test file is a documented source-scan fence ("DB-free, RN-render-free... no @testing-library/react-native... the status-pill-render.test.ts precedent", file header) — every other test in the file uses the same technique. Not a defect specific to this story; no change made.
- [x] [Review][Defer] Operator can select a frozen/deceased/anonymized member via the reused (unmodified) 4.7 `MemberLookupForm`/`MemberSearchResults` [apps/admin/src/modules/helpdesk/HelpdeskOperatorPage.tsx:54] — deferred, pre-existing (no lifecycle-state gating existed before 10.3 either)
- [x] [Review][Defer] No idempotency-key guard on the operator create route [apps/api/src/modules/helpdesk/routes.ts:64] — deferred, pre-existing (preHandler was already `[adminSession, scope]` pre-10.3; routes.ts header documents idempotency as scoped to the separate 10.2 member route)
- [x] [Review][Defer] `member.ts` schema doesn't structurally enforce `operator_attribution` non-null when `created_via==='helpline_call'` [packages/contracts/src/helpdesk/member.ts:159] — deferred, pre-existing (handler already fail-closes via `AdminDisplayNameMissingError`; defense-in-depth nicety only, not a live bug)
- [x] [Review][Defer] No client-side pre-flight permission check before the operator walks the full lookup→category→submit flow [apps/admin/src/modules/helpdesk/HelpdeskOperatorPage.tsx] — deferred, pre-existing (matches the existing admin-app convention; the sibling helpline-claims page has no such check either)
- [x] [Review][Defer] Same district_admin-deferral rationale copy-pasted near-verbatim in three places [packages/domain/src/rbac/permissions.ts, packages/domain/src/rbac/roles.ts, sprint-status.yaml] — deferred, pre-existing (documentation drift-risk observation, not a code defect)
- [x] [Review][Defer] `sprint-status.yaml` accumulating narrative "commit log" prose as YAML comments — deferred, pre-existing (project-wide convention per [[project_sprint_status_ledger]], not introduced by 10.3)
- [x] [Review][Defer] OpenAPI's documented `404` for `/categories` [openapi/v1.yaml:6726] — deferred, pre-existing (implemented at the shared `scopeResolutionHook` middleware layer, covered by the middleware's own tests, not a per-route gap)

## Dev Notes

### The API is already built — this is a UI + permission + surfacing story

The single most important fact: **Story 10.1's `create()` handler already implements the entire `helpline_call` path.** Read `apps/api/src/modules/helpdesk/handlers.ts:151-162` — it already sets `actor = 'operator'` for `helpline_call`, resolves `operator_attribution` from `getDisplayName(deps.pool, actorId)`, fail-closes with `AdminDisplayNameMissingError`, and threads it through `projectTicketGenesis`. The route (`routes.ts`) already exists behind the scoped admin chain + write rate-limit, and its own header comment names *this* story as "the live tenant-scoped caller." So there is **no new create handler, no new event, no migration**. If you find yourself writing a second create handler, stop — you're duplicating 10.1. `[[project_helpdesk_primitive_substrate]]`.

The three real deltas:
1. **A permission gate** on that route (Task 1).
2. **An operator UI** that calls it (Tasks 4–5).
3. **Surfacing the two operator fields** (`created_via`, `operator_attribution`) to the member's own reads (Tasks 2–3, 6).

### The `helpdesk.create` RBAC gap — this story closes what 10.1/10.2 re-deferred

10.1's chunk-4 review filed a `[Defer]`: "a dedicated `helpdesk.create` permission … land[s] with Story 10.2." 10.2 **re-deferred** it (its Dev Notes, verbatim): "The admin-route permission gap is **explicitly re-deferred to Story 10.3/10.4** … it requires an RBAC-catalog + role-bundle change (`packages/domain/src/rbac/roles.ts`) that 10.1's reviewer already judged out of proportion for a route-file fix." **10.3 is the story that adds/touches that admin route (the operator surface), so 10.3 closes it** — [[feedback_closure_language_precision]]: this is "Closed by edit (artifact produced)", not another deferral. The `helpline_operator` role's comment (`roles.ts:304`) literally says "Helpdesk keys land Epic 10" — make it true here.

**Dimension = `pariwar`** (value = `scopeTx.pariwarId`): the reconciliation.review / cycle.freeze / claim.r9_vote pariwar-wide-key precedent. The v1 default routing policy is pariwar-dimension throughout, `helpline_operator`'s `scopeCeiling` is `'pariwar'`, and the tenant IS the target — so a pariwar-dimension check resolves **today** with no geo-tree (unlike the district-derived claim.verify). Grant to `helpline_operator` + `district_admin` + `pariwar_admin`; `super_admin` auto-derives. `[[project_rbac_geo_scope_containment]]` — do NOT gate at `district` (there's no server-derived district for a helpdesk ticket).

### Reuse the Story 4.7 member lookup — do not re-implement search

The operator identifies the caller with the **shipped** `<MemberLookupForm>` (`apps/admin/src/modules/member-status/MemberLookupForm.tsx`) + `<MemberSearchResults>` — exact-match by mobile (server blind-index), member_id, or browse-Pariwar; prefix/name/Aadhaar search is deliberately absent (the shipped capability). This is exactly how Story 6.3's `<HelplineConsoleShell>` does it (`lookupSlot` injection — "search is NOT re-implemented"). Mirror that: a `lookupSlot` prop, the search injected by the page container via `useMemberSearch`. Membership-number search does **not** exist ([[project_membership_number_deferred_feature]]) — don't invent it.

### `operator_attribution` on the member surface is a DELIBERATE, AC-mandated exception

Story 10.2 hard-coded "a member never sees another party's … operator identity" into `member.ts`'s header. **AC3 here overrides that for one field**: the member DOES see the **filing** operator's name in the "We filed this for you — Operator [Name]" header — that transparency is the whole point of the surface (the caller consented to the operator filing for them). This is NOT a leak: `operator_attribution` is the operator's **controlled staff `display_name`**, already snapshotted server-side on the row at create time ([[project_admin_display_name_attribution]] — controlled staff personal data, snapshot at action time, fail-closed if missing). The distinction to preserve: the **filing** operator's name is surfaced (they acted *for* the member); the **routing/responder** target is still role/scope-only, never a named individual (the 10.2 `routed_to_role` rule stands). Record this exception in the `member.ts` header so it doesn't read as a regression of the 10.2 rule.

### The reply round-trip is "identical" because 10.2 already made it forward-compatible

AC's "reply round-trip works identically to member-initiated tickets" needs **no reply code here** — 10.2's `replayTicketThread` is one forward-compatible reader over the `helpdesk.*` stream, and nothing about `created_via: 'helpline_call'` changes the stream shape. The reply-append WRITE + `helpdesk_reply` push EMITTER are **Story 10.4** (10.2 Dev Notes, ratified). 10.3's only thread concern: confirm the operator-filed ticket's genesis renders the opening entry (it does — same genesis). Don't build replies. `[[project_contribution_event_name_contract]]`, `[[project_alert_primitive_substrate]]` (the `helpdesk_reply` alert is pre-wired; its EMITTER is 10.4).

### No step-up — helpdesk create is not a freeze-firing action

The 6.3 claim intake route carries `requireStepUp('claim_file')` because filing a claim **fires an account freeze** (₹50L stakes, AR-24). A helpdesk ticket fires nothing — it's not in the AR-24 step-up list. Do **not** copy the step-up leg from `claims.helpline.routes.ts`. A reviewer primed on the 6.3 precedent will look for this; the absence is correct and should be stated.

### `subject_member_id` vs `subject_actor_id` — v1 identifies a MEMBER

The operator looks up and selects a **member** → `subject_member_id`. The 10.1 `CreateTicketRequest` also supports `subject_actor_id` (a non-member caller with only an actor record) — legal only for `helpline_call` — but the v1 console flow is member-lookup-driven, so send `subject_member_id` and leave `subject_actor_id` null. A pure non-member caller (no member record at all) is a **documented seam**, not built here (it needs an actor-lookup UI the v1 console doesn't have). Note: only a `subject_member_id` ticket lands in a member's app inbox (the 10.2 member read filters `subject_member_id = actorId`), which is the AC3 requirement — so the member-visible "we filed this for you" flow is inherently the `subject_member_id` path.

### Admin app stack facts (don't re-derive)

- **Routing:** TanStack Router, **code-based** route tree in `apps/admin/src/router.tsx` (DD-1 — not file-based codegen). Add `/p/$pariwarId/helpdesk` as a `createRoute` child of `rootRoute`, register it in `routeTree.addChildren([...])` (the `helplineRoute` entry at `router.tsx:94` is the exact precedent).
- **Session gate:** the pure `GateView` pattern (`HelplineClaimRoute`): `useSession()` → loading/error(→`/login`)/success; the **server** permission hook is the real boundary.
- **API client:** hand-written `apiFetch` (`apps/admin/src/api/client.ts`) — same-origin, **cookie-bearing** (admin session is a cookie, not a bearer token — unlike the mobile app), schema-validated response. Hooks in `hooks.ts` via `@tanstack/react-query` `useMutation`/`useQuery`.
- **Styling:** Tailwind utility classes + the `status-*` tokens (see `HelplineConsoleShell`). **NOT** Tamagui (that's the mobile app).
- **i18n:** per-module `i18n-en.ts` `resolveEn(key)` (admin app is en-only for operator surfaces; the member-facing header is the only piece that goes through `packages/i18n` hi/en parity — because it renders in the mobile app).

### Mobile stack facts (the header only)

- The `apps/mobile/app/(helpdesk)/[ticketId].tsx` detail screen already exists (10.2). Add the conditional header + two i18n keys. Tamagui + TanStack Query + the `helpdesk` i18n namespace (`useHelpdeskT`). `[[project_mmkv_asyncstorage_equivalent]]`.
- Guard nothing new on the FlatList — the header is on the detail screen, not the inbox list (the inbox badge, if added, is per-row and doesn't cross the empty→populated seam). `[[project_fabric_flatlist_empty_populated_crash]]`.

### Event-derived state — read side only

The ticket's `current_state` stays projector-maintained (10.1 trigger + `helpdesk-state-invariant` gate). 10.3 writes state NOWHERE — the operator create goes through `projectTicketGenesis` (10.1's sanctioned sole writer, unchanged). The two new member-DTO fields are pure row reads. `[[project_helpdesk_primitive_substrate]]`.

### Testing standards summary

- Live-DB: `twt-test-pg` :5433; own-committing writers accumulate → **assert membership, not counts**; never `DROP SCHEMA` ([[project_live_db_test_gotchas]], [[project_known_livedb_test_failures]]). Seed the operator with BOTH a `display_name` (else `AdminDisplayNameMissingError`) and the `helpdesk.create` grant.
- **RBAC revert-sanity** ([[feedback_gate_scope_semantic_coverage.md]] discipline): the 403-without-key / 201-with-key pair must be a *pair* — the with-key test proves the gate isn't vacuously denying; the without-key test proves it isn't vacuously allowing. A green suite where removing the grant doesn't flip a test has no teeth.
- Merge gate = `pnpm ci:local` (`--concurrency=4`, integration needs `DATABASE_URL` on :5433) — GitHub Actions suspended, local mirror is the gate ([[project_ci_actions_suspension_local_mirror]], [[project_ci_local_concurrency_oversubscription]]).
- New/changed `.strict()` contracts + the newly-gated route: return the body value, never `void reply.status(201).send()` ([[project_fastify_onsend_doublesend]] — the create route already does this correctly; don't regress it).
- Domain dynamic `.limit()` → integer literal or `clampLimit(...)` ([[project_domain_limit_clamp_and_savepoint_retry]]) — relevant only if you touch a `read.ts` list query.
- ESLint per-package (`pnpm --filter <pkg> lint`); carve-outs use cwd-relative role globs ([[project_eslint_config_per_package_cwd]]).
- Story-validate footguns: domain-camelCase (`createdVia`/`operatorAttribution`) vs contracts-snake_case (`created_via`/`operator_attribution`) shape drift; UI-component misattribution across sibling admin modules (`helpline-claims` is the CLAIM console, `helpdesk` is the new TICKET console — don't cross them) ([[project_story_validate_footguns]]).

### Project Structure Notes

- **Confirmed-real paths:** `apps/api/src/modules/helpdesk/{handlers,routes,member-handlers,member-routes}.ts` (10.1/10.2 — gate the route + surface two fields), `packages/domain/src/rbac/{permissions,roles}.ts` (mint + grant the key), `packages/contracts/src/helpdesk/member.ts` (two new fields), `apps/admin/src/modules/` (NEW `helpdesk/` module — sibling of `helpline-claims`, `member-status`), `apps/admin/src/{router.tsx,routes/,api/{client,hooks}.ts}`, `apps/mobile/app/(helpdesk)/[ticketId].tsx` (10.2 — add header), `packages/i18n/locales/{en,hi}/helpdesk.json` (10.2 — add 2 keys).
- **Epics-prose drift (do NOT follow literally):** epics.md §3.5a / Epic-10 name a member "`apps/member`" surface — **there is no `apps/member`**; the member app is `apps/mobile` (ratified in 10.1/10.2, [[project_helpdesk_primitive_substrate]]). The operator surface is `apps/admin`.
- **The admin `helpdesk` module is NEW but the API it calls is OLD.** Don't confuse "new admin module" with "new backend" — the backend create endpoint is the 10.1 route, now permission-gated.
- **No migration** — no schema change (the two surfaced fields already exist as columns; the DTO change is wire-shape only).

### References

- [Source: epics.md#Story 10.3] — helpline call-to-ticket operator surface (SM-1 C3): member identification via 6.3-style `<MemberLookupForm>` (scope-respecting) + category + verbal body; `created_via: helpline_call` + `operator_attribution: <operator_id>`; routing per 10.1; member app "We filed this for you — Operator [Name]" header; reply round-trip identical.
- [Source: epics.md#Epic 10] — helpdesk first-class sub-epic; demoable closure ("Helpline call-to-ticket (SM-1 C3): operator creates ticket on member's behalf with operator-name attribution").
- [Source: apps/api/src/modules/helpdesk/handlers.ts:151-162] — the ALREADY-BUILT `helpline_call` path: `actor='operator'`, `operator_attribution` = `getDisplayName(...)`, `AdminDisplayNameMissingError` fail-close, `projectTicketGenesis`.
- [Source: apps/api/src/modules/helpdesk/routes.ts] — the existing admin create route (`POST …/helpdesk/tickets`, `[adminSession, scope]` + write rate-limit); its header names Story 10.3 as "the live tenant-scoped caller" and the pending permission/turnstile handoff.
- [Source: packages/contracts/src/helpdesk/create-ticket.ts + ticket.ts] — `CreateTicketRequest` (server-authoritative routing; `subject_actor_id` legal only for `helpline_call`) + `HELPDESK_CREATED_VIA = ['member_app','helpline_call']` + `operator_attribution` is response-only, never client-supplied.
- [Source: packages/contracts/src/helpdesk/member.ts] — the 10.2 member DTOs (the "member never sees operator identity" rule this story narrows) + `MemberTicketListItem`/`MemberTicketDetailResponse` to extend.
- [Source: apps/api/src/modules/helpdesk/member-handlers.ts:116-138 `toMemberDetail`/`toMemberListItem`] — where the two new fields map from the row.
- [Source: packages/domain/src/rbac/{permissions.ts (catalog v22, the version-bump ledger + entry shape), roles.ts (helpline_operator @ 303-325, scopeCeiling 'pariwar', "Helpdesk keys land Epic 10")}] — mint + grant target.
- [Source: apps/api/src/modules/reconciliation-review/routes.ts + channel-config/routes.ts] — `requirePermissionHook(deps, KEY, { dimension: 'pariwar' })` route-gating precedent (the pariwar-wide-key posture).
- [Source: apps/api/src/modules/claims/claims.helpline.routes.ts] — the 6.3 helpline intake route (permission + step-up) — the OPERATOR-surface API precedent; note this story does NOT need the step-up leg.
- [Source: apps/admin/src/modules/helpline-claims/{HelplineConsoleShell,HelplineClaimPage}.tsx + routes/HelplineClaimRoute.tsx] — the two-pane operator console + `lookupSlot` injection + pure GateView route precedent to mirror.
- [Source: apps/admin/src/modules/member-status/{MemberLookupForm,MemberSearchResults}.tsx] — the Story 4.7 member-lookup components to REUSE.
- [Source: apps/admin/src/{router.tsx (helplineRoute @94), api/client.ts (apiFetch, cookie-bearing), api/hooks.ts (useHelplineClaimIntake @234, useMemberSearch @208)}] — admin routing/client/hook patterns.
- [Source: implementation-artifacts/10-2-member-facing-helpdesk-ticket-filing.md] — the member surface + the explicit re-deferral of the `helpdesk.create` gap to 10.3/10.4 + the forward-compatible thread reader + the `apps/mobile/app/(helpdesk)/` screens to extend.
- [Source: implementation-artifacts/10-1-*.md + memory project_helpdesk_primitive_substrate] — the substrate, the `apps/member`→`apps/mobile` drift ratification, the deterministic routing primitive.
- [Source: prds/prd-TWT-2026-05-22/prd.md#FR-52 + FR-46] — helpdesk subsystem; the 12 seeded roles incl. Helpline Operator.
- [Source: architecture.md#3.5a + AR-47] — helpdesk architecture; integration point "helpline (call-to-ticket)".

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (bmad-dev-story workflow)

### Debug Log References

- `pnpm ci:local` (DATABASE_URL on :5433) — **29 jobs green** (lint, typecheck, build, test unit, integration-tests, all invariant gates incl. `helpdesk-state-invariant`, i18n-parity, contracts-determinism).
- Helpdesk integration suite (isolation): 19/19 (helpdesk.spec 5 + member-helpdesk.spec 9 + operator-helpdesk.spec 5). Contracts 669, domain 1145 unit, admin console 13, mobile fence 18, i18n 57.
- Known ci:local flake ([[project_known_livedb_test_failures]] / [[project_live_db_test_gotchas]]): the pristine-DB-only count assertions in `cross-pariwar-leak.spec` / `events_log` RLS `policy-regression.spec` / pool `active-contribution-read.spec` (all UNTOUCHED by this story; they assert exact row counts under a FIXED `PARIWAR_A` while this story's specs use random pariwar ids) had accumulated committed rows from repeated local runs. Confirmed innocence by isolation, then data-only reset of the shared test DB (events_log + alerts truncated in `session_replication_role=replica` to bypass the append-only `events_log_no_truncate` statement trigger; schema/roles/RLS/journal untouched) → ci:local fully green. CI uses a fresh-migrated container per run, so this never manifests there.

### Completion Notes List

The single most load-bearing decision — **AC4's `district_admin` grant was corrected to a DEFERRAL** (BigDev-confirmed): `helpdesk.create` is a `pariwar`-dimension key, and the scope model (`scope.ts`/`check.ts`) makes a `district`-ceiling grant *permanently unable* to satisfy a `pariwar`-dimension check (`scopeContains` denies a target broader than the grant; the ceiling check also forbids a district_admin from holding a pariwar-scoped grant). Granting it would seed an INERT/false capability — the exact [[project_rbac_geo_scope_containment]] asymmetry the state_trustee-at-pariwar deferrals already encode (cycle.freeze / reconciliation.review). So the key is granted to **`helpline_operator` (the SM-1 C3 actor) + `pariwar_admin`** (both `pariwar` ceiling); `super_admin` auto-derives; `district_admin` is a documented deferral with an acceptance condition (enable only if a helpdesk ticket gains a server-derived district AND the gate moves to `dimension:'district'`). The AC4 phrase "all pariwar-or-narrower ceilings" was the tell — backwards for a pariwar-dimension gate. Pinned by `check.test.ts` (a synthetic district-ceiling holder of helpdesk.create is DENIED) + `roles.test.ts` (holders = exactly helpline_operator/pariwar_admin/super_admin).

- **No new create handler / event / migration** — confirmed 10.1's `create()` already implements the entire `helpline_call` path (actor='operator', `getDisplayName` → `AdminDisplayNameMissingError` fail-close, `projectTicketGenesis`). 10.3 = (1) permission gate, (2) operator UI, (3) member-DTO surfacing.
- **RBAC (Task 1):** catalog v22→23, minted `helpdesk.create`; gated the existing `POST …/helpdesk/tickets` route with `requirePermissionHook(deps, HELPDESK_CREATE_KEY, {dimension:'pariwar'})`. **No `requireStepUp`** (not freeze-firing / not AR-24 — stated explicitly for the 6.3-primed reviewer). All existing 10.1 tests stay green (helpline_operator now holds the key; the 404/409/400 paths are unaffected).
- **Contracts (Task 2):** added `created_via` to `MemberTicketListItem` + `operator_attribution` (`.min(1).max(128).nullable()`, matching `HelpdeskTicketDto`) to `MemberTicketDetailResponse`; recorded the AC3 EXCEPTION to 10.2's "member never sees operator identity" rule in the file header (the FILING operator's name is surfaced; the RESPONDER/routing target stays role-only). Pure-Zod, `.strict()` preserved.
- **API (Task 3):** `toMemberListItem`/`toMemberDetail` map the two fields from the existing row (full `.select()` — no query/projection change). Added an admin-session `GET …/helpdesk/categories` (reuses `categoriesForPariwar`, same `helpdesk.create` gate) so the operator picker is registry-driven.
- **Admin (Tasks 4–5):** `createHelplineTicket` + `getHelpdeskCategories` client fns + `useCreateHelplineTicket`/`useHelpdeskCategories` hooks; NEW `modules/helpdesk/` (`HelpdeskOperatorShell` pure two-pane console reusing the 4.7 `<MemberLookupForm>`/`<MemberSearchResults>` via `lookupSlot`, `HelpdeskOperatorPage` container, per-module `i18n-en.ts`); `HelpdeskOperatorRoute` + `/p/$pariwarId/helpdesk` in the code-based router.
- **Mobile (Task 6):** `[ticketId].tsx` renders the dignified "We filed this for you — Operator {name}" header only for `created_via==='helpline_call'` + a present `operator_attribution`; inbox badges helpline-filed rows. Two new `helpdesk` i18n keys, en/hi parity.
- **OpenAPI:** regenerated `openapi/v1.yaml` for the two member-DTO fields + the new admin categories path.

### File List

**Modified**
- `packages/domain/src/rbac/permissions.ts` — catalog v22→23, minted `helpdesk.create` (+ district_admin deferral note)
- `packages/domain/src/rbac/roles.ts` — `HELPDESK_CREATE` granted to `helpline_operator` + `pariwar_admin`; district_admin deferral documented
- `packages/domain/tests/rbac/permissions.test.ts` — version 23 / length 32 / helpdesk.create membership
- `packages/domain/tests/rbac/roles.test.ts` — holders = helpline_operator/pariwar_admin/super_admin; district_admin deferral pin
- `packages/domain/tests/rbac/check.test.ts` — pariwar gate proof + district-ceiling deferral pin
- `apps/api/src/modules/helpdesk/routes.ts` — permission gate on create + new admin categories route
- `apps/api/src/modules/helpdesk/handlers.ts` — admin `categories` handler
- `apps/api/src/modules/helpdesk/member-handlers.ts` — surface `created_via` + `operator_attribution`
- `packages/contracts/src/helpdesk/member.ts` — two new member-DTO fields + AC3 exception header
- `packages/contracts/tests/helpdesk.test.ts` — Story 10.3 member-DTO cases
- `packages/contracts/scripts/emit-openapi.ts` — admin categories path registration
- `openapi/v1.yaml` — regenerated
- `apps/admin/src/api/client.ts` — `createHelplineTicket` + `getHelpdeskCategories`
- `apps/admin/src/api/hooks.ts` — `useCreateHelplineTicket` + `useHelpdeskCategories`
- `apps/admin/src/router.tsx` — `/p/$pariwarId/helpdesk` route
- `apps/mobile/app/(helpdesk)/[ticketId].tsx` — "We filed this for you" header
- `apps/mobile/app/(helpdesk)/index.tsx` — helpline-filed inbox badge
- `apps/mobile/tests/unit/helpdesk-screens-render.test.ts` — Story 10.3 header/badge fence
- `packages/i18n/locales/en/helpdesk.json`, `packages/i18n/locales/hi/helpdesk.json` — 2 header/badge keys (parity)

**Added**
- `apps/admin/src/modules/helpdesk/HelpdeskOperatorShell.tsx`, `HelpdeskOperatorPage.tsx`, `i18n-en.ts`
- `apps/admin/src/routes/HelpdeskOperatorRoute.tsx`
- `apps/admin/tests/helpdesk-operator-console.test.tsx`
- `apps/api/tests/integration/helpdesk/operator-helpdesk.spec.ts`

### Change Log

| Date | Change |
|---|---|
| 2026-07-29 | Story 10.3 drafted — helpline call-to-ticket operator surface. Status → ready-for-dev. |
| 2026-07-29 | Story 10.3 implemented. RBAC: catalog v22→23, `helpdesk.create` gate on the existing 10.1 create route (granted helpline_operator + pariwar_admin; **district_admin DEFERRED** — a district-ceiling grant can't satisfy a pariwar-dimension check, [[project_rbac_geo_scope_containment]]). Contracts: `created_via`/`operator_attribution` on the member DTOs. API: member-read surfacing + admin categories read. Admin: new `helpdesk` operator console (reusing the 4.7 lookup + 6.3 shell pattern). Mobile: "We filed this for you — Operator [Name]" header + inbox badge. OpenAPI regenerated. No new handler/event/migration; no step-up. `pnpm ci:local` 29 jobs green. Status → review. |
