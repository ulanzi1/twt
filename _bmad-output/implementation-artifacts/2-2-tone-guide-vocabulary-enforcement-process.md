# Story 2.2: Tone Guide + Vocabulary Enforcement Process

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Pariwar admin authoring member-visible copy,
I want a tone-guide document + copy-review checklist + a publish-time tone-review sign-off gate that complements Story 1.17's automated microcopy/vocabulary lint,
so that the **human-judgment** dimensions of tone (warmth, dignity, register, grief-context) are explicitly reviewed and sign-off-recorded before publish, rather than assumed satisfied by automated lint.

## Acceptance Criteria

> Lettered/numbered ACs below restate the epic's two literal AC blocks (epics.md L1430–1440) as **independently testable** criteria, reconciled against the existing codebase (Story 1.17 microcopy gate, Story 1.10 audit writer, Story 1.8 RBAC catalog) and the established "land-once primitive → consumer wires in" discipline (Story 2.1 / gate-inventory.md). One scope reconciliation is locked here and flagged for BigDev at the end: **persistence of sign-off records is deferred to each consuming surface (Story 2.4 first); 2.2 ships the gate mechanism, not a speculative polymorphic store** — see Dev Notes → Scope decisions.

**AC1 — Tone-guide document authored (epics.md L1433–1434, binding).**
A published tone-guide document exists at `docs/tone-guide.md` covering, at minimum, the four epic-named dimensions:
1. **Voice** — warm, plain, dignified, never sales-y (the *सम्मानित साथी* / colleague address, never "user/customer/donor"; the ambient tagline voice; the *sutradhar* "seen by us all" narration register).
2. **Register per surface** — Yogdaan Bahi = dignified-respectful; Sahyog Vivran = honorific; admin warnings = factual-precise — reconciled to the architecture §4.15 actor-class copy register (member = calm-precise; nominee = grief-respectful; admin = operational; partner = contractual).
3. **Prohibited frames** — loss/scarcity framing on cycle-close (Pool-Reality #2 — no "we fell short of…", "X% achieved", "target missed"), panic, and sales-y framing.
4. **Grief-context modulation** — "fursat" cadence, witness-not-bailiff stance, no countdowns under emotional load, Module-Shelf grief-context exclusion, black-bordered memorial register.

Content is **sourced** from the UX spec + architecture §4.15 + the epic dimensions (see Dev Notes → "Where to source tone-guide content"); it is not invented. The document explicitly positions itself as the **human layer above** Story 1.17's automated microcopy floor (AC6).

**AC2 — Copy-review checklist authored (epics.md L1435, binding).**
A tone-review checklist artifact exists (`docs/tone-review-checklist.md`, cross-linked from the guide) that a **non-author reviewer** works through and signs off on before any member-visible copy is published. Checklist items map 1:1 to the AC1 tone-guide dimensions. The checklist documents the publish-routing process: which copy surfaces it governs (News/Blog, Niyamavali clause, T&C, push-notification template, helpdesk macro), who may review (a non-author holding the surface's review permission — for Niyamavali this is the already-seeded `niyamavali.review` key, packages/domain/src/rbac/permissions.ts:88), and that sign-off is recorded in the audit log (AC4).

**AC3 — Reusable tone-review publish-gate primitive (epics.md L1435–1436 mechanism; reconciled).**
A **framework-agnostic** gate primitive is shipped so that consuming publish endpoints (first consumer = Story 2.4 Niyamavali publish) enforce tone-review at the API layer:
- A pure-domain evaluator in `packages/domain/src/tone-review/` decides allow/deny from an injected sign-off record, enforcing the **non-author invariant** (`reviewedBy !== authoredBy`) and the **sign-off-present invariant** (a `null`/absent sign-off → deny).
- A structured `ToneReviewRequiredError` (with a `toErrorResponse(requestId)` projector) mirrors `AuthorizationDeniedError`; it maps to **HTTP 409** with a `tone_review.required` code via the error-mapping middleware (matches Story 2.4 AC L1490).
- A Fastify pre-handler adapter (`apps/api/src/modules/tone-review/`) mounts the evaluator as a publish-route guard, mirroring `requirePermissionHook` (apps/api/src/modules/rbac/index.ts).
- The pure domain layer carries **no** Fastify/HTTP imports (the rbac precedent).

**AC4 — Sign-off recording via Story 1.10 audit log (epics.md L1435, binding).**
A `tone_review.signoff` audit-emission helper records a tone-review sign-off through the Story 1.10 writer (`writeAuditEntry`, packages/domain/src/audit/write.ts — action format `^[a-z0-9_]+(\.[a-z0-9_]+)+$`), carrying the reviewed artifact's resource locator, the non-author reviewer's actor id, and a content hash of the reviewed copy. The helper is proven to produce a valid `AuditEntryInput` and write a real audit line. **Persistence of which-artifact-was-reviewed is owned by the consuming surface** (Story 2.4 records tone-reviewer attribution + `clause_version_id` per its AC L1485) — see Dev Notes scope decision.

**AC5 — Publish blocked at the API layer + blocked attempt audited (epics.md L1438–1440, binding).**
When publish is attempted without a recorded non-author tone-review sign-off, the gate **blocks** (the pre-handler throws `ToneReviewRequiredError` → 409 `tone_review.required`) **and** emits a `tone_review.publish_blocked` audit line (response status 409) via the audit seam. Teeth proven end-to-end without a live DB by injecting a fake audit sink + a stub sign-off resolver: (a) no sign-off → block + audit + 409 mapping; (b) author == reviewer → block + audit; (c) valid non-author sign-off → allow, no block-audit.

**AC6 — FM/microcopy lint is the automated floor; both layers required; gate registered (epics.md L1436, binding).**
The tone-guide document states that Story 1.17's `microcopy` gate (vocabulary register + tone prohibitions + numeral discipline) is the **automated enforcement floor** and the tone-review sign-off is the **human check above it** — both required before publish. Story 1.17's microcopy lint is **NOT re-implemented or modified** here (it already enforces the automatable vocabulary/tone prohibitions). The new tone-review gate is registered in `gate-inventory.md` as a **Category B (green-by-construction, awaiting consumer)** gate with re-trigger = Story 2.4.

**AC7 — Green merge gate + governance (project discipline).**
`pnpm ci:local` stays green (lint/typecheck/build/test incl. the new domain + api tests). An ADR is authored for the tone-review gate decision + the FM-floor relationship. `deferred-work.md` records: the consumer-wiring re-trigger (Story 2.4), future-surface re-triggers (News/Blog, T&C, push templates, helpdesk macros), and the persistence deferral — each with an explicit re-trigger per [[feedback_record_unattested_no_backfill]] (un-gated commitments decay) and [[feedback_closure_language_precision]].

## Tasks / Subtasks

- [x] **Task 1 — Author the tone-guide document (AC1, AC6)**
  - [x] Create `docs/tone-guide.md`. Distill the four named dimensions (voice; per-surface register; prohibited frames; grief-context modulation) from the sources in Dev Notes. Cite sources inline (UX spec line refs, architecture §4.15).
  - [x] Map "register per surface" to the architecture §4.15 actor-class copy register (member/nominee/admin/partner) and the named surfaces (Yogdaan Bahi, Sahyog Vivran, admin warnings).
  - [x] Add an explicit section: **"Automated floor vs. human check"** — Story 1.17 `microcopy` gate is the automated floor (link `scripts/microcopy/` + `microcopy.yaml`); tone-review sign-off is the human layer above it; both required before publish (AC6). Do **not** restate the lint's prohibited-term table as if it were new — reference it.
- [x] **Task 2 — Author the tone-review checklist (AC2)**
  - [x] Create `docs/tone-review-checklist.md`; cross-link from `docs/tone-guide.md`. One checklist item per AC1 dimension + a grief-context gate item + a "non-author reviewer confirmed" item.
  - [x] Document the publish-routing process: governed surfaces (News/Blog, Niyamavali clause, T&C, push template, helpdesk macro), who may review (non-author holding the surface review permission; Niyamavali = `niyamavali.review`), and that sign-off is audit-recorded.
- [x] **Task 3 — Pure-domain tone-review gate primitive (AC3)**
  - [x] Create `packages/domain/src/tone-review/`: `errors.ts` (`ToneReviewRequiredError` with `toErrorResponse(requestId)` projector — mirror `packages/domain/src/rbac/check.ts` `AuthorizationDeniedError`), `gate.ts` (the `ToneReviewSignoff` value type + pure `evaluateToneReviewGate({ signoff, authoredBy })` returning allow / structured-deny; enforce the non-author + sign-off-present invariants), `index.ts` (re-exports).
  - [x] Wire into `packages/domain/src/index.ts`: add `export * as toneReview from './tone-review/index.js'` (namespace pattern) **and** surface `ToneReviewRequiredError` at top level (mirroring how `AuthorizationDeniedError` is importable from `@twt/domain` for the error-mapping middleware).
  - [x] Unit-test the pure evaluator (vitest, no DB): missing sign-off → deny; author == reviewer → deny; valid non-author sign-off → allow; `toErrorResponse` envelope shape.
- [x] **Task 4 — API pre-handler adapter + audit emission (AC3, AC4, AC5)**
  - [x] Create `apps/api/src/modules/tone-review/index.ts`: a `requireToneReviewSignoff(deps, opts)` Fastify pre-handler that resolves the sign-off via an injected resolver (`opts.resolveSignoff(request)` — the **consumer** supplies persistence; see scope decision), calls the pure evaluator, and on deny emits `tone_review.publish_blocked` + throws `ToneReviewRequiredError`. Mirror `requirePermissionHook` (modules/rbac) for shape, deps usage, and the "ran without session/scope" loud-500 guard.
  - [x] Add a `tone_review.signoff` recording helper that maps to `AuditEntryInput` and calls `writeAuditEntry(deps.servicePool, …)` fire-and-forget / never-throw (mirror `createAuditLogSink` in apps/api/src/audit/audit-log-sink.ts). Use a **dedicated, injectable audit seam** for tone-review actions — do NOT extend the auth-typed `AuthAuditEventType` union (it is the auth taxonomy; rename is explicitly deferred per audit-sink.ts comment). The default impl uses `writeAuditEntry`; tests inject a capturing fake.
  - [x] `tone_review.signoff` and `tone_review.publish_blocked` actions both match the writer's action regex; blocked = response status 409, signoff = 200. Carry NO secret/raw copy material — hash the reviewed content into `requestPayloadHash` (the audit-write contract).
- [x] **Task 5 — Error-mapping + teeth (AC3, AC5)**
  - [x] UPDATE `apps/api/src/middleware/error-mapping/index.ts`: add an `instanceof ToneReviewRequiredError` branch → `reply.status(409).send(error.toErrorResponse(requestId))`, placed alongside the `AuthorizationDeniedError` (403) branch. Import from `@twt/domain`.
  - [x] Add `apps/api/tests/unit/tone-review.test.ts`: prove pre-handler teeth with a fake audit sink + stub `resolveSignoff` — (a) null sign-off → throws `ToneReviewRequiredError` + one `tone_review.publish_blocked` emission; (b) author==reviewer → blocked; (c) valid non-author sign-off → passes, no block emission. Assert the 409 mapping via the error-mapping unit (or a focused test).
- [x] **Task 6 — Gate-inventory + governance (AC6, AC7)**
  - [x] UPDATE `_bmad-output/implementation-artifacts/gate-inventory.md`: register the tone-review publish gate under **Category B — Green-by-Construction, Awaiting Consumer** (Story 2.2; no-op reason = "no member-visible-copy publish endpoint exists yet — `apps/api/src/modules/tone-review/` guard is installed + unit-tested but mounted by no route"; re-trigger = **Story 2.4** Niyamavali publish mounts `requireToneReviewSignoff`). **Note:** gate-inventory.md's Category B is headed "CI Gates: Green-by-Construction, Awaiting Consumer" and every existing row is a literal `pnpm` CI job — this gate is a **runtime Fastify pre-handler, not a CI lint** (see Dev Notes scope decision #2). State that distinction explicitly in the new row (e.g. "Type: runtime publish gate, tracked here for consumer-wiring visibility") rather than silently fitting the CI-job table shape. Cross-link from this story.
  - [x] Author the ADR (next number = **ADR-0019** at create-story time — verify append-after-latest in `docs/knowledge-transfer/adr-index.md`, the same convention 2.1/ADR-0018 followed): the tone-review gate decision, the automated-floor-vs-human-check relationship, and the persistence-deferred-to-consumer seam. Add the ADR-index row + update the status-summary counts (mirror the 2.1 P4/P5 review-patch lesson — keep the row-count chain monotone and the `drafted`/`Total` tallies correct).
  - [x] UPDATE `_bmad-output/implementation-artifacts/deferred-work.md`: a Story 2.2 section recording — Closed-by-edit (tone-guide doc, checklist, gate primitive, audit helper, error-mapping, tests); deferred-with-re-trigger (sign-off **persistence** → first consumer Story 2.4; gate **consumer wiring** → Story 2.4; future governed surfaces News/Blog / T&C / push templates / helpdesk macros → their owning stories). Apply [[feedback_closure_language_precision]].
- [x] **Task 7 — Verification**
  - [x] Run `pnpm ci:local` green (lint/typecheck/build/test + all static gates). No live DB needed (teeth proven with injected fakes — same posture as Story 2.1). If you choose to add a real-sink integration test, it needs `DATABASE_URL` on `:5433` ([[project_ci_actions_suspension_local_mirror]], [[project_live_db_test_gotchas]]). — **15/15 static jobs green; integration-tests SKIPPED (no live DB needed).**
  - [x] Confirm the Story 1.17 `microcopy` gate still passes unchanged (you did not widen `copy_globs` or touch `microcopy.yaml` — the tone-guide doc lives in `docs/`, outside the bounded `apps/admin` scan scope). — **microcopy green: 18 code files / 0 copy files (unchanged scope).**

### Review Findings

- [x] [Review][Patch] `evaluateToneReviewGate` never checks `signoff.resourceLocator` against the publish target's `resourceLocator` [packages/domain/src/tone-review/gate.ts:59-91] — a sign-off recorded for one artifact silently authorizes publish of any other artifact, as long as `reviewedBy !== authoredBy`. Untested (gate.test.ts uses one shared `LOCATOR` constant throughout). Confirmed independently by Blind Hunter, Edge Case Hunter, and Acceptance Auditor. **Fixed:** added a third resource-bound invariant (deny, reusing `signoff-missing` reason, when `signoff.resourceLocator !== resourceLocator`) + a regression test.
- [x] [Review][Patch] `toneReviewEventToAuditInput` silently swaps a malformed `contentHash` for a context hash with no log line [apps/api/src/modules/tone-review/index.ts:98-102] — minor audit-integrity gap; add a `console.error` on the fallback path to match the logging already done in `hashContext`'s own catch. **Fixed:** added the log line + a test asserting it fires.

## Dev Notes

### Scope decisions (LOCKED at create-story)

1. **2.2 ships the gate MECHANISM, not the persistence.** There is **no member-visible-copy publish endpoint at Story 2.2** — the first (Niyamavali publish) lands at Story 2.4; News/Blog, T&C, push templates, helpdesk macros come later. The "what artifact is being reviewed" identity is **polymorphic across surfaces that don't exist yet** (a `clause_version_id` from 2.3, a future `news_post_id`, a `push_template_id`…). Manufacturing a generic `copy_review_signoffs` table now would violate the project's own discipline (permissions.ts: "do NOT manufacture keys for resources whose endpoints don't exist"). So the gate evaluator operates on an **injected sign-off record**; the **first concrete persistence is owned by Story 2.4** (which already commits to recording tone-reviewer attribution + `clause_version_id`, epics.md L1485). This mirrors Story 2.1's "`apps/member` doesn't exist → classification registry, not hardcoded paths" reasoning and the gate-inventory "Category B, awaiting consumer" pattern. **→ Flagged for BigDev at the end as the one real scope lever.**
2. **The "gate" is a RUNTIME publish gate, not a new CI lint.** Tone-review is inherently a human-judgment check — it cannot be a static lint. The *automated* portion (vocabulary register + tone prohibitions + numerals) already exists as Story 1.17's `microcopy` CI gate. Do **NOT** re-implement, widen, or duplicate that lint. 2.2 adds the human layer (doc + checklist) + the runtime sign-off gate above it.
3. **`niyamavali.review` already exists** (packages/domain/src/rbac/permissions.ts:88, seeded at Story 1.8). Do NOT add it. Do NOT manufacture a generic `copy.review` key — no generic copy-review endpoint exists; each surface uses its resource-specific review key (Niyamavali = `niyamavali.review`; future surfaces add their own in their owning story). WHO-may-review is enforced at the consumer's review-submission endpoint (2.4); 2.2's publish guard enforces only sign-off-present + non-author.
4. **Audit actions use the 1.10 writer directly, not the auth taxonomy.** `tone_review.signoff` / `tone_review.publish_blocked` are not auth/security events. Route them through `writeAuditEntry` (packages/domain/src/audit/write.ts) via a dedicated injectable seam — do NOT add them to `AuthAuditEventType` (apps/api/src/audit/audit-sink.ts), whose own comment defers the SecurityAuditEventType rename.

### ⚠️ Disaster-prevention: there is NO publish endpoint to gate yet

Do not look for (or invent) a publish route to attach the guard to. At Story 2.2 the deliverable is the **installed, unit-tested gate primitive** + the **authored human-process docs** + **gate-inventory registration**. AC5's "blocked at the API layer" is realized when Story 2.4's Niyamavali publish route mounts `requireToneReviewSignoff` in its `preHandler` chain. Prove teeth at 2.2 against a **stub resolver + fake audit sink** (the rbac/2.1 precedent), not against a real route. This is the established "land-once primitive → consumer wires in with teeth" pattern (gate-inventory.md Category B; e.g. `benefit-mechanism` awaits Story 2.3, `pii-scrape` awaits Story 2.5).

### Existing-code state (READ before editing)

- **Audit writer (Story 1.10)** — `packages/domain/src/audit/write.ts:71` `AuditEntryInput` = `{ pariwarId (uuid), actorId (uuid|null), actorRole (≤128|null), action (dotted lowercase `^[a-z0-9_]+(\.[a-z0-9_]+)+$`, ≤128), resourceLocator (1..1024), requestPayloadHash (sha256 hex), responseStatus (100..599), traceId? }`; `writeAuditEntry(servicePool, input)` appends to the global hash chain and **throws on error** — the caller owns never-throw-into-request-path (wrap in try/catch, fire-and-forget). Reference impl to copy: `apps/api/src/audit/audit-log-sink.ts` (`createAuditLogSink` — maps event → `AuditEntryInput`, `void writeAuditEntry(...).catch(...)`, `hashContext` via `canonicalJsonStringify`, the `00000000-…` global-pariwar sentinel).
- **RBAC guard pattern (the shape to mirror)** — `apps/api/src/modules/rbac/index.ts` `requirePermissionHook(deps, key, opts)`: a Fastify `preHandlerHookHandler` that reads `request.scopeTx`/`requestContext.actorId`, loud-500s if its prerequisites didn't run, calls a pure domain check, and on deny emits via `deps.auditSink.emit({...})` then the pure guard throws. Copy this skeleton for `requireToneReviewSignoff`.
- **Error projector to mirror** — `AuthorizationDeniedError.toErrorResponse(requestId)` → `ErrorResponseShape` is defined in `packages/domain/src/errors.ts:85-110` (thrown by the guard at `packages/domain/src/rbac/check.ts:219-256`); mapped at `apps/api/src/middleware/error-mapping/index.ts:70-73` (`instanceof` → `reply.status(403)`). `ToneReviewRequiredError` follows the identical pattern → 409.
- **AppDeps** — `apps/api/src/context.ts:41` carries `servicePool: pg.Pool` (line 55), `auditSink: AuthAuditSink` (line 59, the injectable seam — add a sibling tone-review audit seam the same way), `clock: () => Date` (line 71). `ADMIN_GLOBAL_NAMESPACE` (line 29) = the nil-UUID global sentinel. Tests build deps with fakes (capturing sink, frozen clock) — context.ts header line 5.
- **Permission catalog (Story 1.8)** — `packages/domain/src/rbac/permissions.ts`: `niyamavali.review` (L88) + `niyamavali.amend` (L87) already seeded; catalog is append-only, branded `PermissionKey`, `<resource>.<action>` regex.
- **Domain public API** — `packages/domain/src/index.ts` uses `export * as <ns> from './<area>/index.js'` (audit, rbac, ids, …) and surfaces select error classes at top level (line 23-30). Add `toneReview` namespace + top-level `ToneReviewRequiredError`.
- **Story 1.17 microcopy gate (the automated floor — DO NOT TOUCH)** — `scripts/microcopy/` (`lib.ts` pure + `check.ts` impure) + root `microcopy.yaml` + `microcopy:check`/`microcopy:test` scripts + the `microcopy` ci.yml job; bounded to an `apps/admin` slice. It already enforces the vocabulary register (`passbook→Yogdaan Bahi`, `receipt`/`invoice`→`Contribution Note`, `report`→`Sahyog Vivran`) + tone prohibitions (scarcity/panic/Pool-Reality). Your tone-guide doc **references** this; it does not duplicate or modify it.

### Where to source tone-guide content (do NOT invent it)

- **UX spec** (`_bmad-output/planning-artifacts/ux-design-specification.md`): warm-formal *सम्मानित साथी* address, never "user/customer/donor" (L155, L309, L387, L572); ambient tagline voice "आज का सहयोग कल का सहारा" (L156); *sutradhar* / "seen by us all" narration register (L440, L569); grief register — "fursat" cadence, witness-not-bailiff, no countdowns under emotional load, Module-Shelf grief exclusion (L67, L77, L129, L295, L315, L390, L404, L537–L555); govt-grade conservatism + community warmth (L414–L416, L434–L435); black-bordered memorial register (L454, L481).
- **Architecture §4.15 Actor adaptation (authority section)** (`_bmad-output/planning-artifacts/architecture.md` ~L2872–2901): the per-actor-class **copy register** (member = calm-precise; nominee = grief-respectful; admin = operational; partner = contractual); interaction tone (witness-not-bailiff for nominee; neutral-action for member); cross-class leakage prevention. Map the epic's per-surface registers (Yogdaan Bahi / Sahyog Vivran / admin warnings) onto these actor classes.
- **Epic dimensions** (epics.md L1434): the four named dimensions are the AC1 spine; the sources above provide the substance.
- **Pool-Reality framing** (epics.md L2782 / microcopy.yaml pool-reality patterns): the prohibited loss/scarcity/comparison-to-target frames the human reviewer must catch in phrasings the lint can't (template-literal/spelled-out variants — see deferred-work.md L1260).

### Testing standards

- `vitest`, pure-core + thin-impure split (the 1.17/2.1 pattern): the pure `evaluateToneReviewGate` is unit-tested with no DB/Fastify; the pre-handler is unit-tested with a fake Fastify request + capturing audit sink + stub resolver. **No live DB required** for the binding teeth (Story 2.1 posture). Prove teeth end-to-end: block-without-signoff → `ToneReviewRequiredError` + exactly one `tone_review.publish_blocked` emission + 409 mapping; author==reviewer → blocked; valid non-author sign-off → allowed with no block emission.
- Keep the audit emitter **never-throw** — assert that a throwing fake sink does not propagate out of the pre-handler's emission path (an audit failure must not change the gate decision or crash the request).

### Project Structure Notes

- **New (docs):** `docs/tone-guide.md`, `docs/tone-review-checklist.md`, `docs/adr/ADR-0019-*.md`.
- **New (`packages/domain`):** `src/tone-review/errors.ts`, `src/tone-review/gate.ts`, `src/tone-review/index.ts`, `src/tone-review/tests/*.test.ts` (follow the package's existing test placement convention — match `rbac/`).
- **New (`apps/api`):** `src/modules/tone-review/index.ts` (pre-handler + audit seam + emitter), `tests/unit/tone-review.test.ts`.
- **Modified:** `packages/domain/src/index.ts` (+`toneReview` namespace, +top-level `ToneReviewRequiredError`); `apps/api/src/context.ts` (+tone-review audit seam in `AppDeps` + `createDeps`/test-deps wiring, mirroring `auditSink`); `apps/api/src/middleware/error-mapping/index.ts` (+409 branch); `_bmad-output/implementation-artifacts/gate-inventory.md` (+Category-B row); `_bmad-output/implementation-artifacts/deferred-work.md` (+Story 2.2 section); `docs/knowledge-transfer/adr-index.md` (+ADR-0019 row + counts); `_bmad-output/implementation-artifacts/sprint-status.yaml` (2.2 → in-progress → review at dev/review time).
- **Do NOT touch:** `scripts/microcopy/*`, `microcopy.yaml`, `apps/api/src/audit/audit-sink.ts` `AuthAuditEventType` union, `packages/domain/src/rbac/permissions.ts` catalog.
- **Variance note:** the checklist is a separate `docs/tone-review-checklist.md` cross-linked from the guide (chosen for the reviewer's working-artifact ergonomics); folding it into the guide is an acceptable equivalent if preferred.

### References

- Story + ACs: [Source: epics.md#Story-2.2 (L1424–1440)]; Epic 2 framing [Source: epics.md L1385–1403, L582–584]; story-label legend `[GOVERNANCE]` = CI gate / policy / audit / sign-off gate [Source: epics.md L1403].
- Story 2.4 consumer contract (409 `tone_review.required`; tone-reviewer attribution + `clause_version_id` on publish) [Source: epics.md L1484–1490].
- FR-69 (tone guide enforced via copy review) [Source: epics.md L1393]; Pool-Reality prohibited frames [Source: epics.md L2787].
- Automated floor (Story 1.17 microcopy gate) [Source: 1-17-…-numeral-hardening.md AC3 + Task 4; gate-inventory.md `microcopy` row; scripts/microcopy/, microcopy.yaml]. Vocabulary register canon [Source: 1-17 Dev Notes "Vocabulary register"].
- Audit writer (Story 1.10): `AuditEntryInput` + `writeAuditEntry` [Source: packages/domain/src/audit/write.ts:71-122]; sink reference impl [Source: apps/api/src/audit/audit-log-sink.ts]; seam pattern [Source: apps/api/src/audit/audit-sink.ts].
- RBAC guard + error projector to mirror [Source: apps/api/src/modules/rbac/index.ts:68-110; packages/domain/src/rbac/check.ts:219-256]; error-mapping [Source: apps/api/src/middleware/error-mapping/index.ts:14-72]; AppDeps [Source: apps/api/src/context.ts:29-71]; permission catalog [Source: packages/domain/src/rbac/permissions.ts:81-94].
- Tone/voice/register source material: [Source: ux-design-specification.md L67,77,129,155-156,295,309,315,387,390,404,414-416,434-435,439,440,471,537-555,569-572]; actor-class copy register [Source: architecture.md §4.15 ~L2872-2901].
- Gate-inventory Category-B pattern [Source: gate-inventory.md "Category B — Awaiting Consumer"].
- Previous-story precedent (land-once primitive, no-DB teeth, governance hygiene, ADR-index P4/P5 lesson) [Source: 2-1-i18n-…-surface-contract.md].
- Memory: [[project_ci_actions_suspension_local_mirror]] (`pnpm ci:local` is the merge gate), [[feedback_closure_language_precision]] (Closed-by-edit vs Resolved-via-deferral), [[feedback_record_unattested_no_backfill]] (un-gated commitments decay → gate the re-commitment), [[project_sprint_status_ledger]] (status flip + ledger COMMENT convention), [[project_live_db_test_gotchas]] (only if you add a real-sink integration test).

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Claude Opus 4.8) — bmad-dev-story workflow

### Debug Log References

- `pnpm --filter @twt/domain exec vitest run tests/tone-review/gate.test.ts` — RED (module absent) → GREEN (5/5).
- `pnpm --filter @twt/api exec vitest run tests/unit/tone-review.test.ts` — 11/11 (incl. the expected `console.error` from the throwing-sink never-throw case).
- `pnpm --filter @twt/domain test` 153 passed / 60 skipped; `pnpm --filter @twt/api test` 74 passed / 47 skipped (DB-gated integration).
- `pnpm ci:local` — **15/15 static jobs green**; integration-tests SKIPPED (no live DB needed — teeth proven with injected fakes, Story 2.1 posture). `microcopy` green unchanged (18 code files / 0 copy files).

### Completion Notes List

- **AC1/AC6 (Task 1):** `docs/tone-guide.md` authored — four named dimensions (voice; per-surface register mapped onto architecture §4.15 actor-class register; prohibited frames; grief-context modulation), every rule sourced + inline-cited from the UX spec + architecture §4.15 (no invention), with the explicit "Automated floor vs. human check" §5 positioning Story 1.17's `microcopy` gate as the automated floor and referencing (not duplicating) its prohibited-term table.
- **AC2 (Task 2):** `docs/tone-review-checklist.md` authored — one checklist item per AC1 dimension + a grief-context gate + a non-author-reviewer attestation; documents the publish-routing process (governed surfaces, `niyamavali.review` reviewer, audit-recorded sign-off). Cross-linked both ways with the guide.
- **AC3 (Tasks 3+4):** pure fail-closed `evaluateToneReviewGate` (`packages/domain/src/tone-review/`) + `ToneReviewRequiredError`/`toErrorResponse` (mirrors `AuthorizationDeniedError`), surfaced as the `toneReview` namespace + top-level error in `@twt/domain`; Fastify `requireToneReviewSignoff` pre-handler (`apps/api/src/modules/tone-review/`) consuming an injected `resolveSignoff` (consumer owns persistence).
- **AC4 (Task 4):** dedicated `ToneReviewAuditSink` seam (NOT an `AuthAuditEventType` extension) → `toneReviewEventToAuditInput` maps to a valid `AuditEntryInput` → `writeAuditEntry` fire-and-forget/never-throw; `tone_review.signoff`=200 (requestPayloadHash = reviewed-copy contentHash) / `tone_review.publish_blocked`=409 (hashed context); both actions match the writer regex; no raw copy material. Seam wired into `AppDeps`/`createDeps`/test-deps mirroring `auditSink`.
- **AC5 (Task 5):** error-mapping 409 `tone_review.required` branch added; teeth proven in `apps/api/tests/unit/tone-review.test.ts` — (a) no sign-off → throw + one `publish_blocked`; (b) author==reviewer → blocked; (c) valid non-author → allow, no block emission; plus loud-500 guard, never-throw (throwing sink does not change the decision), audit-input mapping, and the 409 mapping.
- **AC6 (Task 6):** gate-inventory Category B row added with the explicit "runtime Fastify pre-handler, NOT a CI lint" distinction + a clarifying note (re-trigger Story 2.4). `microcopy` lint NOT re-implemented/modified.
- **AC7 (Tasks 6+7):** `pnpm ci:local` green; ADR-0019 authored (drafted) + adr-index row appended-after-latest with counts updated (drafted 15→16, Total 136→137, Section A 37→38); `deferred-work.md` Story 2.2 section added with closure-language precision + explicit per-item re-triggers.
- **Variance (faithful):** domain unit tests placed at `packages/domain/tests/tone-review/gate.test.ts` (the actual `packages/domain/tests/rbac/` convention the story said to "match") rather than the Project-Structure-Notes literal `src/tone-review/tests/`. No co-located `src` tests exist in this package; the chosen path matches the package's real test layout.
- **Disaster-prevention honored:** no publish route was invented — the gate is installed + unit-tested but mounted by no route (gate-inventory Category B; consumer = Story 2.4). No live DB used.

### File List

**New (docs):**
- `docs/tone-guide.md`
- `docs/tone-review-checklist.md`
- `docs/adr/ADR-0019-tone-review-publish-gate.md`

**New (`packages/domain`):**
- `packages/domain/src/tone-review/errors.ts`
- `packages/domain/src/tone-review/gate.ts`
- `packages/domain/src/tone-review/index.ts`
- `packages/domain/tests/tone-review/gate.test.ts`

**New (`apps/api`):**
- `apps/api/src/modules/tone-review/index.ts`
- `apps/api/tests/unit/tone-review.test.ts`

**Modified:**
- `packages/domain/src/index.ts` (+`toneReview` namespace, +top-level `ToneReviewRequiredError`/`TONE_REVIEW_REQUIRED_CODE` + denial types)
- `apps/api/src/context.ts` (+`toneReviewAuditSink` in `AppDeps`)
- `apps/api/src/deps.ts` (+`createToneReviewAuditSink(servicePool)` wiring)
- `apps/api/src/middleware/error-mapping/index.ts` (+`ToneReviewRequiredError` → 409 branch + header comment)
- `apps/api/tests/integration/_setup.ts` (+`CapturingToneReviewAuditSink` + test-deps wiring)
- `_bmad-output/implementation-artifacts/gate-inventory.md` (+Category-B runtime-gate row + note)
- `_bmad-output/implementation-artifacts/deferred-work.md` (+Story 2.2 section)
- `docs/knowledge-transfer/adr-index.md` (+ADR-0019 row + preamble note + counts: drafted 15→16, Total 136→137, Section A 37→38)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (2.2 → in-progress → review + ledger COMMENT)
- `_bmad-output/implementation-artifacts/2-2-tone-guide-vocabulary-enforcement-process.md` (Tasks/Subtasks checkboxes, Dev Agent Record, Status)

## Change Log

| Date | Change |
|---|---|
| 2026-06-20 | Story 2.2 created (ready-for-dev): tone-guide doc + copy-review checklist + runtime tone-review publish-gate primitive (pure-domain evaluator + Fastify pre-handler + 1.10 audit emission + 409 error-mapping), above the Story 1.17 automated microcopy floor. Scope locked: gate mechanism shipped now (Category B, consumer = Story 2.4); sign-off persistence deferred to consuming surfaces. |
| 2026-06-20 | Story 2.2 implemented (ready-for-dev → in-progress → review): docs/tone-guide.md + docs/tone-review-checklist.md authored (sourced + cited); `packages/domain/src/tone-review/` pure fail-closed evaluator + `ToneReviewRequiredError` (toneReview namespace + top-level export); `apps/api/src/modules/tone-review/` `requireToneReviewSignoff` pre-handler + dedicated `tone_review.*` audit seam (→ Story 1.10 writer, never-throw) wired into AppDeps/deps/test-deps; error-mapping 409 `tone_review.required` branch; 16 new tests (5 domain + 11 api, teeth proven with stub resolver + fake sink, no DB). ADR-0019 authored (drafted); adr-index row + counts (15→16/136→137); gate-inventory Category B row (runtime gate, re-trigger 2.4); deferred-work Story 2.2 section (persistence + consumer-wiring + future surfaces deferred with re-triggers). `pnpm ci:local` 15/15 green; microcopy unchanged. |
