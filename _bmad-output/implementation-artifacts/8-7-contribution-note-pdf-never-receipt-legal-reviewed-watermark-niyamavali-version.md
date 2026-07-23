---
baseline_commit: b5f1d6736215bea6bc6aa408102b7a0ec84dbea8
---

# Story 8.7: Contribution Note PDF — Never "Receipt", Legal-Reviewed, Watermark + Niyamavali Version `[SURFACE]`

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As Sushil opening a row in my Yogdaan Bahi,
I want a downloadable **Yogdaan Pratigya** (Contribution Note) PDF — never called "receipt" or "invoice" — carrying my contribution's facts, the TWT watermark, my Pariwar's branding, and the Niyamavali version in force when I contributed,
so that I hold an artifact that reflects the trust relationship rather than a transactional document — and so that what the artifact claims is exactly what the reconciliation pipeline has actually established, no more.

## Acceptance Criteria

_Elaborated from `epics.md:2979-2995` (Story 8.7) + FR-33 (`epics.md:80`) — the epics.md text is 2 short `Then` blocks; expanded here with the render-engine contract (AC2), the honest-status invariant that governs a **shareable** artifact (AC3), the Niyamavali-version resolution + its honest-gap rule (AC4), the watermark/branding/identifier discipline (AC5), the legal pending-review pattern (AC6), and the vocabulary-gate teeth + Hindi-first + tagged-PDF a11y that bind it (AC1/AC7). Not verbatim._

**AC1 — The artifact is a Yogdaan Pratigya, and the vocabulary gate has real teeth over it**
**Given** FR-33 (`epics.md:80`) + Story 1.17's FM-1..FM-14 microcopy lint + the `microcopy.yaml` vocabulary register
**When** the Contribution Note generator is implemented
**Then** the document is titled **"योगदान प्रतिज्ञा" / "Yogdaan Pratigya (Contribution Note)"** — Hindi-primary with the English gloss; it is **explicitly NOT** "Receipt", "Invoice", "रसीद", or "बिल", anywhere in the document body, the filename, the HTTP `Content-Disposition`, the i18n keys, the route path, or the OpenAPI summary
**And** the prohibited terms are caught by the **actual** gate, not merely by review: `microcopy.yaml` already carries `receipt → Contribution Note (Yogdaan Pratigya)` and `invoice → …` as `member_only: false` rules, and `packages/i18n/locales/{hi,en}/contribution.json` is **already** inside `scope.copy_globs` — so the Note's copy keys are covered the moment they land there. The **template/renderer source** is NOT covered (`scope.code_globs` is `apps/admin/src/**` only), so this story **extends `code_globs` to the Note template** and proves the extension has semantic teeth with a planted-violation fixture + revert-sanity, per the established `scripts/microcopy/{close-of-cycle,contribution}.test.ts` convention. A green scan over newly-scanned files proves nothing on its own (`[[feedback_gate_scope_semantic_coverage]]`).

**AC2 — Rendered server-side, correct Devanagari, tagged for screen readers**
**Given** the Hindi-first surface contract (Story 2.1) + "accessibility-compliant (tagged PDF for screen readers)" (`epics.md:2995`)
**When** the PDF is produced
**Then** rendering is **server-authoritative** (the client never composes the artifact) and produces a PDF in which **Devanagari conjuncts, matras and nuqta forms are correctly shaped** and the document carries a **structure tree (tagged PDF)** so a screen reader reads it in logical order
**And** the renderer is injected behind a small port (the Story 6.5 `ClaimDocumentStorage` port/adapter precedent), so tests inject a deterministic fake and the heavy engine dependency lives in exactly one adapter
**And** the render environment has the Devanagari font faces **actually available** — a headless container with no Devanagari font renders tofu boxes (▯▯▯) for every Hindi glyph while every unit test still passes. Font availability is asserted by a rendered-output check, not assumed.

**AC3 — Honest status: a shareable artifact must never over-claim (this story's load-bearing invariant)**
**Given** the yellow-never-confirmed invariant (Story 8.4, `epics.md:2935-2941`) + the self-view-vs-public boundary (Story 8.6 D1)
**When** a Note is generated for a contribution in any of the four statuses (`yellow | green | red | grey` — `deriveContributionStatus`, `packages/domain/src/contribution/history.ts:94`)
**Then** the Note renders a **status block derived from exactly that same function** — never a second, divergent derivation — and its language matches the status precisely: **green** = confirmed by reconciliation (`पुष्ट`); **yellow** = "आपने भुगतान की सूचना दी है; मिलान अभी शेष है" (you have told us you paid; verification pending) — never "received", "paid", "confirmed", or "thank you for your payment"; **red** = a mismatch is under review; **grey** = on record, cycle closed with no reconciliation verdict (strictly neutral — never "missed"/"failed"/"voided", per the Story 8.6 D3 ratification)
**And** the **UTR is embedded only when the status is `green`** (`epics.md:2990` — "UTR (when confirmed)"); a non-green Note shows the payment-reference (`tr=`) line without asserting a settled payment
**And** the *सत्यापित* (verified) warm-red watermark stamp (UX `:1094`) is **reserved for `green` Notes only**; non-green Notes carry the neutral TWT/Pariwar watermark without it. This is the mechanism that makes a shareable non-green artifact safe: the Yogdaan Bahi is a private self-view, but **a PDF leaves that boundary the moment Sushil forwards it on WhatsApp** — so the artifact itself, not the surface it was fetched from, has to carry the honesty
**And** a test asserts the negative directly: a `yellow` Note contains **no** UTR, **no** *सत्यापित* stamp, and none of the confirmation-implying strings.

**AC4 — Niyamavali version reference, resolved at contribution time — or honestly absent**
**Given** `epics.md:2990` ("`clause_version_id` reference to the relevant Niyamavali rules effective at contribution time") + Story 2.3's dual resolution (`resolveByClauseId(db, pariwarId, clauseId, asOf)`, `packages/domain/src/niyamavali/read.ts:26`)
**When** the Note is generated for a contribution attested at instant `T`
**Then** the contribution-governing clause is resolved **as-of `T`** (not as-of now) and its `clause_version_id` + clause version number is printed in the Note's provenance block, so a Note regenerated years later still cites the rule that was actually in force
**And** when the Pariwar has **no** published contribution-discipline clause (the state today — no clause rows are seeded for the launch tenant; `niy.contribution-discipline.*` appears only in `packages/niyamavali-engine/tests/`), the provenance block renders an **honest absence** ("Niyamavali संस्करण: उपलब्ध नहीं" / "not yet published") — the generator **NEVER fabricates, back-dates, or defaults a version string** (`[[feedback_record_unattested_no_backfill]]`). This AC leg ships **carried un-attested**: it is structurally complete and starts citing real versions with zero code change the moment Epic 2 clause authoring seeds the tenant.

**AC5 — Watermark, per-Pariwar branding, member identifier**
**Given** `epics.md:2991` (TWT watermark + per-Pariwar branding, Story 1.7) + FR-33's `[v1-S]` donor-ID watermark + UX `:434` (Bihar govt-scheme certificate register) + UX `:156` (the tagline on Contribution Note PDFs)
**When** the Note renders
**Then** it carries: the **TWT watermark**; the **Pariwar branding bundle** (display name, logo, primary/secondary colour) read from the Story 1.7 Pariwar-Passport, degrading gracefully to TWT defaults when a field is unset; the ambient tagline **"आज का सहयोग कल का सहारा"**; and a **member identifier watermark** used for traceability
**And** the member identifier is derived from the existing `member_id` (e.g. a short, stable, non-reversible display form) — it is **NEVER an invented membership number**: no `member_number` column, generation scheme, or search key may be introduced here (`[[project_membership_number_deferred_feature]]` — membership number is a confirmed product requirement owned by a dedicated identity feature, not by this story)
**And** the accent discipline holds: **one accent per surface** (UX `:1094`) — the warm-red is spent on the *सत्यापित* stamp when present, and is not also spent on a CTA or a decorative rule
**And** the member-visible identity fields are `firstName + lastInitial` only (the PII-shielded shape the card and passbook already use); no full name, no phone, no address, no Aadhaar, no bank detail ever reaches the artifact.

**AC6 — Legal-review posture recorded, not performed, and not stamped on the member's artifact**
**Given** `epics.md:2987,2991` (legal-reviewed copy per Story 0.13's pending-review pattern) + `docs/legal-counsel-engagement/review-scope-charter.md:26` (which already names "Contribution Note PDF copy per FR-33" as in-scope)
**When** the Note copy ships
**Then** the copy is registered as a **review artifact** in `docs/legal-counsel-engagement/review-artifact-roster.md` with status `pending`, and the story records openly that the copy is **authored-but-not-counsel-reviewed** — counsel engagement Tasks 7–11 are `_AWAITING EXTERNAL ACTION_` and this story does not and cannot close them
**And** the pending status is tracked **internally** — it is **not** rendered as a "pending legal review" marker on the member's artifact (the Story 2.6 T&C surface marks itself publicly because it *is* the legal instrument; a Contribution Note carrying "pending legal review" would corrode exactly the trust the artifact exists to build). If BigDev prefers the visible marker, that is a one-line copy change — but the default is internal tracking.

**AC7 — Regenerable, Hindi-first, accessible, member-scoped**
**Given** `epics.md:2991` ("PDF is regenerable for any past contribution") + `:2995` (Hindi-first parity, tagged PDF) + FR-95 (data-export ZIP includes Contribution Notes — a future consumer)
**When** a member requests a Note
**Then** generation is **on demand and stateless** — the same contribution regenerates a byte-equivalent Note (modulo the generation timestamp) from event-derived facts; **no PDF is persisted** to object storage, so there is no stale copy, no RTBF sweep, and no divergence between the stored artifact and the truth
**And** the endpoint is **member-session-gated and hard-scoped to the caller's own contributions** — requesting another member's `contributionId` returns 404, never another member's Note (the Story 8.6 D1 self-scope, restated because a PDF is a far worse leak than a list row)
**And** Hindi-first parity holds for every new copy key (`pnpm i18n:check`); the produced PDF is tagged; the mobile download affordance meets the ≥44pt touch floor and announces its action.

---

## Scope — what belongs to 8.7 vs what is a reserved seam

| **In scope (8.7 builds it)** | **Out of scope (seam only / owned elsewhere)** |
|---|---|
| The **Note data resolver**: given `(memberId, contributionId)`, assemble the artifact's facts by reusing `listMemberContributionHistory` + the **existing** `resolvePoolIdentity` (never a second identity path). | A **`contribution_notes` table / any persistence**. The Note is regenerable-on-demand (AC7). No object storage, no `ClaimDocumentStorage` reuse, no signed URLs. |
| The **HTML template + the `ContributionNotePdfRenderer` port** (`@twt/contracts`) + **one** concrete adapter in `@twt/platform-adapters`. | **Reusing / extending the OCR, claim-document, or snapshot storage ports.** Different concern, different lifecycle. |
| `GET /api/v1/member/contribution-note/:contributionId` in the **existing** `apps/api/src/modules/member-pool/` module — member-session-gated, returns `application/pdf` bytes. | A **new API module or a new workspace package.** A resolver + a template + a route is not a cross-package reuse surface (`[[feedback_no_premature_package]]`). Extraction waits for the FR-95 data-export consumer to actually exist. |
| Flipping **`noteAvailable`** in the existing history handler (`handlers.ts:609`) from the hardcoded `false` to the real predicate, and replacing the **placeholder screen body** at `apps/mobile/app/(contribution)/note/[id].tsx` with the real fetch → save → open/share flow. | Changing the **route path** (`/(contribution)/note/[id]`) or the `ContributionHistoryRow` shape — 8.6 reserved both deliberately; keep them. |
| `contribution.json` **`note.*` copy keys** (hi+en) + the **microcopy `code_globs` extension** over the template + its planted-violation teeth test. | The **`<CallHelplineCTA>`** on the Note footer — that is **Story 8.11**, which explicitly lists the Contribution Note PDF among its surfaces (`epics.md:3049`). Leave a footer slot; do not build the CTA. |
| The **legal review-artifact roster row** (AC6) + the friction-budget disposition. | **Performing** the legal review, or closing any Story 0.13 task. |
| The **Niyamavali version resolution** via the existing `resolveByClauseId` as-of the contribution instant. | **Authoring / seeding Niyamavali clauses** — Epic 2 owns clause publishing. 8.7 consumes what exists and renders an honest absence when nothing does. |

## Tasks / Subtasks

- [x] **Task 0 — Read before writing.** Read, in this order: `packages/domain/src/contribution/history.ts` (the read + `deriveContributionStatus` you must reuse, not re-derive); `apps/api/src/modules/member-pool/handlers.ts` (`resolvePoolIdentity` at `:480`, `resolveHistory` at `:560-615`, the `noteAvailable: false` you will flip at `:609`, the fail-soft posture); `packages/contracts/src/claims/documents.ts` (the port-in-contracts / adapter-in-platform-adapters precedent you are copying); `apps/mobile/app/(contribution)/note/[id].tsx` + `apps/mobile/components/yogdaan-bahi/YogdaanBahiRow.tsx:61-65` (the reserved route + how it is reached); `microcopy.yaml` (`vocabulary`, `scope.code_globs`, `scope.copy_globs`) + `scripts/microcopy/contribution.test.ts` (the teeth-test convention).

- [x] **Task 1 — Contracts: the renderer port + the Note DTOs (AC1, AC2, AC3).**
  - [x] Add `packages/contracts/src/contributions/contribution-note.ts`: the `ContributionNotePdfRenderer` port — a **pure TS interface** (`render(html: string, opts): Promise<Uint8Array>`, browser-safe `Uint8Array`, no engine types leaking) modelled line-for-line on `ClaimDocumentStorage` (`claims/documents.ts:86-108`), including the "the concrete adapter is injected; tests inject a fake" header. Add the `ContributionNoteFacts` shape (the resolved, render-ready facts) — `.strict()`, plain `z` only, **no `@twt/domain` import at source** (`[[project_contracts_domain_bundle_boundary]]`).
  - [x] PII discipline in the DTO: `deceasedFirstName`/`deceasedLastInitial`/member `firstName`/`lastInitial` only; `utr` **optional and present only for `green`**; no phone/address/Aadhaar/bank field exists on the shape at all (make it structurally impossible, not merely unused).
  - [x] Barrel through `contributions/index.ts` → `src/index.ts`. Contracts tests: `.strict()` rejection, the structural no-extra-PII guard (mirror `contributions.test.ts`'s existing guard), and a guard that `utr` cannot be set on a non-green facts object.

- [x] **Task 2 — The renderer adapter (AC2).**
  - [x] Implement **one** concrete adapter in `packages/platform-adapters/src/contribution-note-pdf/` (sibling of `claim-document-storage/`), exported from the package index with the same header convention. **This is the first browser-rendering dependency in `apps/api`'s deployable image** — no `puppeteer`/`playwright`/`chromium` package exists in `apps/api` today, so its Docker image size, build time, and CI cache footprint change materially; do not underestimate this as "just another npm install."
  - [x] **Engine choice (D1):** HTML → headless Chromium. This is the only path that satisfies **both** AC2 legs simultaneously — see D1 for why `pdfkit` / `pdf-lib` / `@react-pdf/renderer` structurally cannot (no complex-script shaping → broken Devanagari; no structure tree → untagged PDF).
  - [x] **Fonts (D5 — the concrete disaster):** vendor the Devanagari + Latin faces into the repo and reference them from the template via local `@font-face` `file://` / data URIs, **and** install them in the deployable image; do **not** rely on a system font being present or on any network font fetch (the render container is offline and font-less by default). Add a **rendered-output assertion** that the produced PDF actually embeds a Devanagari face — a shaping/tofu regression must fail CI, not ship.
  - [x] Operational guards: a **single lazily-created browser instance** reused across renders with crash-restart; a hard **render timeout**; a **concurrency cap**; an output **byte cap**. A PDF render is orders of magnitude more expensive than any other member read in this app.
  - [x] Add an **in-memory / deterministic fake renderer** (the `createInMemoryClaimDocumentStorage` precedent) so every API + template test runs without a browser.

- [x] **Task 3 — The Note resolver + template (AC1, AC3, AC4, AC5).**
  - [x] Resolve facts for `(pariwarId, memberId, contributionId)` by **reusing** `listMemberContributionHistory` and selecting the matching `contributionId` — this gives member-scope (AC7), the `alertId`, the `poolId`, `attestedAt`, the `utr`, and the **already-derived** `status` for free. Do **not** write a second status derivation (D3).
  - [x] Resolve pool identity via the **existing** `resolvePoolIdentity` (D6 of Story 8.6) so the Note's family/letter/name/amount are byte-identical to the card and the passbook. A divergence here reads as a forgery to Sushil.
  - [x] Resolve the payment reference via the existing `deriveContributionReference` (`tr=`) rather than re-deriving it.
  - [x] Resolve the Niyamavali version via `niyamavali.resolveByClauseId(tx, pariwarId, <contribution-discipline clauseId>, attestedAt)` — **`asOf` = the contribution instant** (AC4). Null → the honest-absence render; never a fabricated string.
  - [x] Resolve Pariwar branding from the Story 1.7 Pariwar-Passport (`display_name_hi`/`_en`, `branding_bundle`), degrading to TWT defaults per field.
  - [x] Author the HTML template: govt-scheme certificate register (UX `:434`) — watermark, serial-style provenance block, conservative palette, dense layout; the tagline (UX `:156`); a footer slot reserved for Story 8.11's helpline CTA. **Every member-visible string routes through `@twt/i18n`'s server-safe `t`** — `apps/api` does not depend on `@twt/i18n` today, so add it (the package root is explicitly server-safe and names `apps/api` as an intended consumer, `packages/i18n/src/index.ts:8-13`).
  - [x] Numeral discipline (D7): date / amount / cycle / `tr=` render **Gregorian + Latin**; names render Devanagari. Hindi-primary with English gloss for headings.

- [x] **Task 4 — API route + `noteAvailable` (AC1, AC3, AC7).**
  - [x] Add `GET /api/v1/member/contribution-note/:contributionId` to the **existing** `member-pool/{routes,handlers}.ts`, gated by `requireMemberSession` (auto-covered by the Story 1.14 login-wall CI gate). Response: `application/pdf` bytes with a `Content-Disposition: attachment` filename that itself contains no prohibited term (AC1).
  - [x] **Not fail-soft.** Unlike `contributionHistory`, an unresolvable Note must **404** (unknown/not-yours) or **5xx** (render failure) — never a blank or partial PDF. A partially-rendered artifact is worse than no artifact.
  - [x] Apply a **per-member rate limit** (`@fastify/rate-limit` is already a dependency) — render cost makes this endpoint the app's cheapest DoS surface.
  - [x] Flip `noteAvailable` in `resolveHistory` (`handlers.ts:609`) from the hardcoded `false` to the **resolvability** predicate (D3(a), ratified): `true` iff the row's identity resolved — which, at that point in `resolveHistory`, is exactly the rows that survived the `identity === null` omission check. **No status term belongs in this expression.** Replace the stale "8.7 flips this (a green/confirmed row is the natural first target)" comment at `:606-608` — that parenthetical encodes the green-gating reading D3 rejected, and leaving it will mislead the next reader.
  - [x] Hand-author the OpenAPI path (binary response; the multipart-upload route is the precedent for hand-authoring); regenerate `openapi/v1.yaml`; `contracts:check-openapi-determinism` must stay byte-stable.
  - [x] DB-free unit tests with the fake renderer: 401 without a session; **404 for another member's `contributionId`** (the load-bearing scope test); the green Note contains the UTR + the *सत्यापित* stamp; the yellow Note contains **neither**, plus none of the confirmation-implying strings; a render failure surfaces an error rather than an empty body.

- [x] **Task 5 — api-client + mobile (AC3, AC7).**
  - [x] Add a **bytes-returning** method to `createMemberAuthClient` (`packages/api-client/src/index.ts`) — the existing methods return JSON; this one returns the PDF body. Keep the required `'GET'` method argument convention (the 8.6 five-arg gotcha).
  - [x] Replace the placeholder body of `apps/mobile/app/(contribution)/note/[id].tsx` (keep the route path and the file's header framing). Flow: authenticated fetch → write to `expo-file-system` cache → open/share via `expo-sharing` (both already dependencies — do **not** add a PDF viewer library or a signed-URL flow; there is no object storage here).
  - [x] Loading / error / retry states matching the passbook's conventions (`YogdaanBahi.tsx` gained a real `isError` branch in 8.6 review — mirror it, do not regress to a silent empty state). Announce the download action; ≥44pt targets.
  - [x] **New-Arch caution** (`[[project_fabric_flatlist_empty_populated_crash]]`): if this screen renders any list that crosses empty→populated in place, render the empty/loading branch **outside** it.

- [x] **Task 6 — i18n copy + microcopy gate teeth (AC1, AC6).**
  - [x] Add `note.*` keys to `packages/i18n/locales/{hi,en}/contribution.json` — title, the four status blocks, provenance labels, the Niyamavali-absent string, watermark/tagline, download/share/error copy. Hindi-first, grade-6, dignified register, Latin operational numerals. This file is **already** in `scope.copy_globs`, so vocabulary + tone + numeral rules bite it on arrival.
  - [x] **Extend `microcopy.yaml` `scope.code_globs`** to cover the Note template source, with the same commented rationale style the existing entries use.
  - [x] Add `scripts/microcopy/contribution-note.test.ts` following `contribution.test.ts` exactly: load the **real** `microcopy.yaml` + the **real** locale/template files off disk, prove a **planted** "receipt"/"invoice"/"रसीद" violation is flagged, prove the real authored copy is clean, and record a **revert-sanity** result (revert the scope extension → the planted violation goes unflagged) in the Dev Agent Record. Teeth over green (`[[feedback_gate_scope_semantic_coverage]]`).
  - [x] `pnpm i18n:check` ✓ + `pnpm microcopy:check` ✓.

- [x] **Task 7 — Governance records + regression sweep.**
  - [x] Add the Contribution Note copy as a new row in `docs/legal-counsel-engagement/review-artifact-roster.md` (AC6), following the roster's schema (`review-artifact-roster.md:11-30`) — `integration_status: pending-submission` (not a bare "pending"; the real enum runs `pending-submission → awaiting-counsel-return → returned-pending-integration → integrated-into-Story-X → deferred-with-rationale → superseded`), with `actual_submission_date: <PENDING-TASK-10>` and every other required field (`artifact_id`, `artifact_type`, `source_artifact_path`, `owning_story + epic`, `submission_priority`, `target_submission_date`, `sla_target_return_date`, `actual_return_date`, `return_summary_link`, `integration_target_story_or_section`, `notes`) populated per the schema, cross-referencing `review-scope-charter.md:26`.
  - [x] Record the **friction-budget disposition**: member-session surface, not `apps/public` → does not enter the public page-weight budget; **do not ratchet the baseline** (`[[project_friction_budget_baseline_ratchet]]`).
  - [x] Add the PII-scrape matrix entry for the Contribution Note surface (first-name + last-initial only; UTR green-only) if the Story 1.16b gate maintains a per-surface matrix.
  - [x] `pnpm ci:local` with `DATABASE_URL` on :5433 as the merge gate (`[[project_ci_local_concurrency_oversubscription]]` — a *different* untouched package failing each run is the known oversubscription flake, not your diff; confirm innocence by isolation).

### Review Findings

_Code review run 2026-07-23 against uncommitted changes (baseline `b5f1d67`), three parallel layers: Blind Hunter (diff-only), Edge Case Hunter (diff + repo access), Acceptance Auditor (diff + this spec). The diff itself only covers tracked files — all newly-created files (contribution-note.ts, note-template.ts, note-assets.ts, pool-identity.ts, the platform-adapters chromium/fake adapter, contracts/contribution-note.ts, save-note.ts) are untracked and were reviewed directly off the working tree by the Edge Case Hunter and Acceptance Auditor layers._

- [x] [Review][Patch] Note resolution is capped by the 500-row history read, silently narrowing AC7's "regenerable for any past contribution" — a contribution older than the member's most recent 500 attested contributions is indistinguishable from "not yours" and 404s. Resolved during code review (2026-07-23): replace with a targeted, uncapped ownership/fact lookup for Note resolution specifically, rather than reusing the capped history-list read. [`apps/api/src/modules/member-pool/contribution-note.ts:132-134`, `packages/domain/src/contribution/history.ts:118,185-188`]

- [x] [Review][Patch] AC2/D5 tofu risk on the document's own title and brand name: `.brand-hi`, `.doc-title h1`, `.tagline` use the `display-name`/`display-parichay` tokens (Tiro Devanagari Hindi), which is not vendored, not installed in the Alpine image, and unreachable over network (chromium blocks non-`data:` requests) — only the body text uses the vendored Noto face. This is the exact failure D5 warns about, reintroduced on the heading/brand/tagline elements. [`apps/api/src/modules/member-pool/note-template.ts:179,183,219`, `packages/tokens/src/tokens.ts:75-76`]
- [x] [Review][Patch] Per-member rate limit doesn't bind to the member: `perSessionKey` reads `request.session?.userId`, but member routes are bearer-JWT only with no `request.session`, so it silently falls through to `request.ip` — the route's "per-member cost bound" claim doesn't hold. [`apps/api/src/modules/member-pool/routes.ts:30-34`, `apps/api/src/plugins/rate-limit/index.ts:47-49`]
- [x] [Review][Patch] AC3 over-claim guard isn't enforced at runtime: the `.superRefine` on `ContributionNoteFacts` is exercised only in contract unit tests; the production resolver never calls `.parse`/`.safeParse`, so correctness today rests entirely on a manual ternary rather than the schema. [`packages/contracts/src/contributions/contribution-note.ts:164-177`, `apps/api/src/modules/member-pool/contribution-note.ts:171-193`]
- [x] [Review][Patch] Dead, duplicated, gate-uncovered PDF title constants: `NOTE_PDF_TITLE_HI`/`NOTE_PDF_TITLE_EN` in handlers.ts duplicate (and word-order-drift from) the i18n `note.title` keys already correctly used in the template's `<title>` tag, sit outside the extended `code_globs`, and are functionally dead — the chromium adapter never reads `renderOpts.title`. [`apps/api/src/modules/member-pool/handlers.ts:246-268`, `packages/platform-adapters/src/contribution-note-pdf/chromium.ts:156-216`]
- [x] [Review][Patch] Route has no Fastify `params` schema for `contributionId` despite the OpenAPI doc declaring `z.string().min(1)` — enforced behavior diverges from the documented contract. [`apps/api/src/modules/member-pool/routes.ts:82-90`, `packages/contracts/scripts/emit-openapi.ts:1018`]
- [x] [Review][Patch] `document.fonts.ready` evaluate call has no timeout, unlike `setContent`/`page.pdf`, so a render can hang past the intended `timeoutMs`. [`packages/platform-adapters/src/contribution-note-pdf/chromium.ts:184-185`]
- [x] [Review][Patch] `acquireSlot()` queued waiters have no timeout — combined with the above (or a slow `puppeteer.launch()`), one stuck render can permanently hold one of only 2 global concurrency slots and back up every other member's Note render. [`packages/platform-adapters/src/contribution-note-pdf/chromium.ts:109-116`]
- [x] [Review][Patch] Mobile double-tap race on `onDownload`: `disabled={busy}` lags the async state update, letting a rapid double-tap fire two concurrent downloads/shares. [`apps/mobile/app/(contribution)/note/[id].tsx:716-727`]
- [x] [Review][Patch] `save-note.ts` gives no distinct signal when `Sharing.isAvailableAsync()` is false — the screen treats it identically to a successful share even though the file only exists in the app's private cache. [`apps/mobile/lib/save-note.ts:36-41`]
- [x] [Review][Patch] Hindi `note.label.family` ("सहयोग") drops the "family" referent present in the English label ("Family supported"). [`packages/i18n/locales/hi/contribution.json` — `note.label.family`]

- [x] [Review][Defer] OpenAPI `500` response description only characterizes render failures; a DB/scope-tx failure inside `resolveContributionNoteFacts` would also surface as a 500 but isn't described that way. [`openapi/v1.yaml`, `packages/contracts/scripts/emit-openapi.ts`] — deferred, pre-existing minor doc-precision gap, not blocking

## Dev Notes

### D1 — Render engine: HTML → headless Chromium is the only option that satisfies AC2; the pure-JS PDF libraries structurally cannot

AC2 asks for two things at once: **correct Devanagari shaping** and a **tagged PDF**. Those two constraints together eliminate the obvious choices, and a dev agent that reaches for the popular library will produce a PDF that looks fine in a Latin smoke test and is unreadable in Hindi:

- **`pdfkit` / `pdfmake` / `@react-pdf/renderer`** embed fonts via fontkit but perform **no complex-script shaping** — they do not run the Devanagari GSUB reordering or GPOS mark positioning. Matras attach to the wrong base, conjuncts fail to form, and `ि` renders after its consonant instead of before. It will not *error*; it will silently render wrong Hindi. None of them emit a structure tree either, so the tagged-PDF leg fails too.
- **`pdf-lib`** does no shaping at all and has no tagged-PDF support.
- **`harfbuzzjs` (WASM) + `pdf-lib`** would shape correctly but requires hand-building the structure tree for tagging — a large amount of bespoke PDF-internals code for a single artifact.
- **Headless Chromium (Puppeteer)** runs HarfBuzz, so Devanagari shapes correctly, and Chrome's PDF export has been **tagged by default since Puppeteer v11** (`--export-tagged-pdf`; `PDFOptions.tagged`). It also means the template is plain HTML/CSS — reviewable, i18n-able, and styleable against the design tokens.

Take Chromium, but **put it behind the port** (Task 1) exactly as Story 6.5 put GCS behind `ClaimDocumentStorage`: the engine dependency then lives in one adapter file, every test injects a fake, and if the container weight later becomes a deployment problem the adapter can move to a jobs-side render service **without touching the module, the route, or the template**. Architecture already gives every `apps/*` workspace its own Dockerfile (`:577-579, 623-626`), so the font + browser install is a per-workspace concern, not a global one.

### D2 — Regenerate, never persist

`epics.md:2991` says the PDF is "regenerable for any past contribution", and every input is event-derived. So generate **on demand and store nothing**. This is not a shortcut — it is the stronger design: no stale artifact that contradicts a later reconciliation verdict, no RTBF sweep over a blob bucket, no object-key lifecycle, no signed-URL TTL, no divergence between the stored PDF and the truth. It also keeps `ClaimDocumentStorage` out of this story entirely.

The cost is render latency on every request, which is why Task 2's browser reuse + Task 4's rate limit are not optional polish. If a future story needs pre-generation (bulk FR-95 export ZIPs), that story adds a cache in front of the resolver — the port makes that additive.

### D3 — Note availability: generatable for any resolvable attested contribution; the artifact's contents governed strictly by `deriveContributionStatus` (**RATIFIED**)

The epics user story says "As Sushil **after a confirmed contribution**", and `epics.md:2990` says "UTR (**when confirmed**)". Read literally, a Note would only exist for `green` rows. But `green` is **unreachable today** — Epic 9's `contribution.confirmed` producer is unbuilt (Story 8.6 D3). Gating on green makes 8.7 ship dark: `noteAvailable` stays `false` on every row, the mobile screen is unreachable, and nothing is demoable — the exact shape of the Story 8.4 nominee-VPA trap (`[[project_nominee_vpa_deferred_seam]]`).

**The decision:** a Note is generatable for **any resolvable attested contribution**, in any of the four statuses, and the artifact carries its status honestly per AC3 — with the **UTR and the *सत्यापित* stamp reserved for `green`**. This satisfies the literal FR-33 reading of "UTR when confirmed" while making the story demoable today.

The reason this is safe is worth stating explicitly, because a reviewer will (correctly) probe it: **a PDF escapes the self-view boundary.** Story 8.6 D1 established that showing Sushil his own yellow status is legitimate because the Yogdaan Bahi is a private self-view, while the yellow-never-confirmed invariant governs public/aggregate surfaces. A downloadable file breaks that clean split — it is fetched from a self-view and then forwarded to a landlord, a relative, a WhatsApp group. So the honesty cannot live in the surface; it has to be **printed on the artifact**. The status block + the reserved verification stamp are that mechanism. A yellow Note that says "you told us you paid; verification pending" is safe to forward. A yellow Note that says "received, thank you" is a forgery the platform authored itself.

> **Resolved (BigDev, 2026-07-23):** ratified **exactly as drafted** — availability is NOT status-gated; green-only gating is explicitly rejected. Consequences the dev agent must honor:
>
> **(a) The `noteAvailable` predicate is a RESOLVABILITY predicate, not a status predicate.** It is `true` when the row resolves to a real artifact — the contribution belongs to the caller **and** `resolvePoolIdentity` returns a pool identity (claim → deceased member → KYC name decrypt all succeed). **Do not put a status term in it.** A `yellow`, `red`, or `grey` row with resolvable identity gets `noteAvailable: true`; a `green` row whose identity is unresolvable gets `noteAvailable: false` and a 404. Status and availability are orthogonal — conflating them is the specific mistake this ratification forecloses.
>
> **(b) The artifact's CONTENTS are governed strictly by `deriveContributionStatus`, and by nothing else.** All three status-varying elements — the status block copy, the presence of the UTR, and the presence of the *सत्यापित* warm-red stamp — key off that ONE function's output for that ONE contribution (`packages/domain/src/contribution/history.ts:94`). No second derivation, no re-mapping of an arm, no "close enough" inference from the alert state, no client-side status logic. The Note renders the status it is given.
>
> **(c) The two rules compose, and neither may leak into the other.** Availability decides *whether a Note exists*; `deriveContributionStatus` decides *what it says*. A dev agent that lets status narrow availability ships 8.7 dark; one that lets availability widen what the artifact claims ships a forgery. Task 4's negative test — a `yellow` Note contains **no** UTR, **no** *सत्यापित* stamp, and none of the confirmation-implying strings, while still being downloadable — is the load-bearing proof that both halves hold simultaneously. Treat it as non-optional.
>
> **(d) AC3's rationale stands unchanged** and belongs in the code header: the honesty lives on the artifact because a PDF escapes the Story 8.6 D1 self-view boundary the moment it is forwarded.

### D4 — Niyamavali version: resolve as-of the contribution instant, and render an honest gap

`resolveByClauseId(db, pariwarId, clauseId, asOf)` (`niyamavali/read.ts:26`) already does exactly the right thing: latest non-deprecated version effective at `asOf`. Pass the **contribution's `attestedAt`**, never `now()` — the whole point of citing a version on a durable artifact is that a Note regenerated in 2031 still names the rule that governed the contribution in 2026.

Today there are **no seeded contribution-discipline clause rows** for the launch tenant — `niy.contribution-discipline.*` clause ids appear only in `packages/niyamavali-engine/tests/r7-ladder.test.ts`. So the resolution will return `null` in practice. Render the honest absence and **carry the gap in the Dev Agent Record** rather than inventing a placeholder version, seeding a fake clause, or defaulting to "v1" (`[[feedback_record_unattested_no_backfill]]`). The wiring is what this story owes; the data is Epic 2's.

Pick the clause id from the `niy.contribution-discipline.*` family as a documented constant with a header explaining why it may resolve to nothing today. If the Pariwar-level clause id turns out to be configurable rather than fixed, resolve it from config — but do not invent a config surface for it in this story.

### D5 — Fonts: the failure that passes every test and ships tofu

A headless-Chromium container built from a slim base image has **no Devanagari font**. Every unit test passes (the fake renderer returns fake bytes), the route returns a valid PDF, and the member downloads a document where every Hindi glyph is a `▯`. The Latin numerals look perfect, which makes it easy to miss in a quick visual check.

So: vendor the faces (Tiro Devanagari Hindi / Noto Sans Devanagari — the same families the mobile app uses via `@expo-google-fonts/*`, and the UX display face at `:1108`), reference them from the template with local `@font-face` sources, install them in the image, and **assert on rendered output** that a Devanagari face is embedded. Treat a missing-font regression as a CI failure, not a visual-QA finding. Note the repo currently vendors exactly one font file (`apps/mobile/assets/fonts/SpaceMono-Regular.ttf`) — server-side faces are new here, so decide their home deliberately.

### D6 — Reuse the identity and status paths; author no second source of truth

Three things in this story already exist and must be **called**, not re-derived:

1. **Status** — `deriveContributionStatus` (`contribution/history.ts:94`). The Note's status block is a rendering of that function's output. A second derivation is how a passbook row and its own Note end up disagreeing.
2. **Pool identity** — `resolvePoolIdentity` (`member-pool/handlers.ts:480`), the shared resolver Story 8.6 extracted precisely so the card and the passbook agree. The Note is the third consumer. Its `decryptKycField` call is already `try/catch`-wrapped (an 8.6 review fix) — for the Note, a decrypt failure must **404/error**, not silently omit a field, since a Note with a blank family name is a defective artifact rather than a shortened list.
3. **Payment reference** — `deriveContributionReference` (Story 7.7). The `tr=` on the Note must be the same deterministic value the UPI intent used.

### D7 — Register, numerals, accent discipline

Operational register (UX `:1121-1127`, amendment A2): **date, amount, cycle ref, `tr=`, UTR → Gregorian + Latin numerals**; the family/member names carry **Devanagari**. Hindi-primary headings with an English gloss (this is a document a member may need to show to a non-Hindi reader; the gloss is not a parity violation — the parity gate governs key coverage, and both locales carry full copy).

Visual register: Bihar govt-scheme certificate (UX `:434`) — watermark, provenance/serial block, conservative palette, dense information layout. **One accent per surface** (UX `:1094`): the warm-red is spent on the *सत्यापित* stamp when the Note is green; a non-green Note therefore has **no** warm-red element at all. Copy is dignified-respectful (Story 2.2) — "your support" / योगदान, never "dues"/"obligations"/"payment due".

### D8 — Legal posture: record it, don't stamp it

Story 0.13's engagement Tasks 7–11 are `_AWAITING EXTERNAL ACTION_`; `review-scope-charter.md:26` already names the Contribution Note copy as in-scope for counsel. This story's obligation is to **register the artifact and state its status openly** (roster row + Dev Agent Record), not to obtain or simulate a review, and not to mark the story's legal leg closed. The Story 2.6 T&C precedent renders `legal_review_status` publicly because the T&C *is* the legal instrument under review; a Contribution Note is a trust artifact whose value is undermined by a "pending legal review" stamp. Default to internal tracking (AC6) and let BigDev overturn if they disagree.

### D9 — Security: this endpoint hands a member a file about themselves and nothing else

Two guards, both load-bearing:

- **Ownership.** The `contributionId` is a client-supplied id. Resolve it **through the member-scoped read** (`listMemberContributionHistory` for the caller's own `memberId`) and match — never fetch the event by id and then check ownership afterwards, and never trust a `memberId` from the request. A wrong-Note leak here is a PII disclosure of another member's contribution, their pool, and the deceased family they support.
- **Cost.** Rate-limit per member. This is the only member endpoint in the app that spawns a browser render.

Both deserve an explicit test (Task 4), not just careful code.

### D10 — Do NOT touch (frozen / other-epic-owned)

The `contribution.utr-attested` write + the yellow-never-confirmed teeth (8.4); the confirmed-only contributor read + progress meter (8.3); the alert state machine and `alerts.current_state` projector (8.1 — read it, never write it); `deriveContributionStatus`'s precedence (8.6 D3, ratified — render it, never re-map it); Epic 9 reconciliation / the green flip / the mismatch producer; the pool assignment engine (7.4); `deriveContributionReference` / amount-lock (7.7); the `ContributionHistoryRow` shape and the `/(contribution)/note/[id]` route path (8.6 reserved both); `CANONICAL_CHANNEL_LADDER` / the dispatcher (Epic 5); the `<CallHelplineCTA>` (8.11). **8.7 adds a read-only artifact renderer. It changes no state machine, emits no event, and touches no financial-truth path.**

### Testing standards

- **Contracts (DB-free):** `.strict()` rejection; the structural no-extra-PII guard over `ContributionNoteFacts`; the "`utr` only when green" guard.
- **Template/renderer (DB-free, fake renderer):** the four status renderings; **green** contains the UTR + the *सत्यापित* stamp; **yellow/red/grey** contain neither and contain none of the confirmation-implying strings; the Niyamavali-absent path renders the honest string and never a fabricated version; branding falls back per field.
- **Renderer adapter (real engine, one test):** a rendered PDF embeds a Devanagari face and carries a structure tree. Keep this suite small and clearly marked — it is the only test that needs a browser.
- **API (DB-free unit, fake renderer):** member-session gate (401); **another member's `contributionId` → 404**; content type + `Content-Disposition` filename carries no prohibited term; render failure → error, never an empty 200 body.
- **Microcopy gate:** planted-violation fixture + **revert-sanity** over the extended `code_globs` (record the revert result in the Dev Agent Record — a green scan is not the deliverable).
- **Live-DB (if the resolver gets an integration spec):** `[[project_live_db_test_gotchas]]` — `twt-test-pg` on :5433, assert membership not counts, no migration regen, no `DROP SCHEMA`; suite-level `{timeout:20000}` if it trips the concurrent-load class.
- **Mobile:** build/test are repo no-ops → the gate is `pnpm typecheck` + `pnpm lint` + `pnpm i18n:check` + `pnpm microcopy:check` + the contracts/api suites. The download→open round-trip is **device-observable** — if it is not run on the emulator, record it as un-attested rather than asserting AC7 closed (the 8.6 AC4/AC5 discipline; `[[project_mobile_android_emulator_setup]]`).

### Project Structure Notes

- **New:** `packages/contracts/src/contributions/contribution-note.ts`; `packages/platform-adapters/src/contribution-note-pdf/{<engine>,fake}.ts` (+ tests); the Note resolver + HTML template under `apps/api/src/modules/member-pool/` (the module that already owns the history read and `resolvePoolIdentity`); `apps/api/tests/unit/contribution-note.test.ts`; `scripts/microcopy/contribution-note.test.ts`; vendored font assets.
- **Edited:** `packages/contracts/src/contributions/index.ts` + `src/index.ts` + `tests/contributions.test.ts`; `packages/platform-adapters/src/index.ts`; `packages/api-client/src/index.ts` (one bytes-returning method); `apps/api/src/modules/member-pool/{routes,handlers}.ts` (new route + the `noteAvailable` flip at `:609`); `apps/api/src/context.ts` (inject the renderer on `AppDeps`, the `claimDocumentStorage` precedent); `apps/api/package.json` (+`@twt/i18n`); `packages/contracts/scripts/emit-openapi.ts` + regenerated `openapi/v1.yaml`; `apps/mobile/app/(contribution)/note/[id].tsx`; `packages/i18n/locales/{hi,en}/contribution.json`; `microcopy.yaml` (`scope.code_globs`); `docs/legal-counsel-engagement/review-artifact-roster.md`; `friction-budget.md`; `sprint-status.yaml` ledger; the deployable Dockerfile(s) for the browser + fonts.
- **No new workspace package.** A resolver + a template + a route + one adapter is not a cross-package reuse surface yet; the FR-95 data-export consumer does not exist today (`[[feedback_no_premature_package]]`). Extend `member-pool` and `platform-adapters`.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-8.7] (`:2979-2995`) — the two `Then` blocks: Yogdaan Pratigya naming + FM-1..FM-14 lint teeth; the embedded fields incl. `clause_version_id` at contribution time; watermark + per-Pariwar branding + legal pending-review + regenerable; Hindi-first + tagged PDF. Also (`:80`) FR-33 in full (donor-ID watermark `[v1-S]`, alert ID, nominee acknowledgement); (`:2853`) the demoable-closure beat; (`:2971-2973`) 8.6's Note-link + save-and-resume seam; (`:3049`) Story 8.11's claim on the Note footer; (`:173`) FR-95's future consumption of Notes.
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] — (`:434`, `:565`) the Bihar govt-scheme certificate visual register the Note must match; (`:947`) the receipt-mental-model / distinct-legal-framing rationale; (`:156`) the tagline on Contribution Note PDFs; (`:1094`) warm-red accent reservation incl. the *सत्यापित* watermark + one-accent-per-surface; (`:1108`) the display face; (`:1121-1127`) operational Latin/Gregorian numeral discipline; (`:73`) the three-FR trust-posture interlock (weakening FR-33 weakens FR-19 and FR-74).
- [Source: _bmad-output/planning-artifacts/architecture.md] — (`:235`) object storage names Contribution Note PDFs as a future consumer (this story deliberately does not use it — D2); (`:577-579`, `:623-626`) Dockerfile per deployable workspace; (`:2999-3014`) Dokploy v1 → Cloud Run/GKE container path; (`:1740`) the data-export bundle that will consume Notes.
- [Source: packages/domain/src/contribution/history.ts] — `listMemberContributionHistory` (`:162`, member-scoped, returns `contributionId`/`alertId`/`poolId`/`attestedAt`/`utr`/`status`), `deriveContributionStatus` (`:94`), `CONTRIBUTION_STATUSES` (`:70`), `MAX_CONTRIBUTION_HISTORY_ROWS` (`:118`).
- [Source: apps/api/src/modules/member-pool/handlers.ts] — `resolvePoolIdentity` (`:480`, the shared card/passbook identity resolver with its `decryptKycField` try/catch), `resolveHistory` (`:543`), the `noteAvailable: false` placeholder + its "8.7 flips this" comment (`:606-609`), the member-session route pattern and the fail-soft posture this story deliberately does NOT inherit.
- [Source: packages/contracts/src/claims/documents.ts:86-108] — the `ClaimDocumentStorage` port: pure TS interface in contracts, `Uint8Array` bytes, concrete adapter injected, in-memory fake for tests. The exact shape `ContributionNotePdfRenderer` copies. Adapters live in `packages/platform-adapters/src/claim-document-storage/` with `packages/platform-adapters/src/index.ts:3-12` as the export convention.
- [Source: packages/domain/src/niyamavali/read.ts:26-51] — `resolveByClauseId(db, pariwarId, clauseId, asOf)`, the as-of resolution AC4 needs; `packages/niyamavali-engine/tests/r7-ladder.test.ts:76-106` — the `niy.contribution-discipline.*` clause-id family (test-only today, hence AC4's honest-absence rule).
- [Source: microcopy.yaml] — `vocabulary` `receipt`/`invoice` → `Contribution Note (Yogdaan Pratigya)` with `member_only: false` (`:32-35`); `scope.code_globs` = `apps/admin/src/**` only (`:101-103`) — the gap AC1 closes; `scope.copy_globs` already includes `packages/i18n/locales/{hi,en}/contribution.json` (`:133-134`); `allow` entries showing the reason-carrying convention. Teeth convention: `scripts/microcopy/contribution.test.ts` (planted-violation + real-config + revert-sanity) and `close-of-cycle.test.ts`.
- [Source: packages/i18n/src/index.ts:8-13] — the server-safe root explicitly built so `apps/api` (Fastify) can import `t` without React; `packages/i18n/locales/en/contribution.json:104-106` — the existing `yogdaan.note.*` keys the placeholder reuses.
- [Source: apps/mobile/app/(contribution)/note/[id].tsx + components/yogdaan-bahi/YogdaanBahiRow.tsx:61-65,130] — the reserved route this story fills and the row affordance that reaches it; `apps/mobile/package.json` — `expo-file-system` + `expo-sharing` + `expo-web-browser` already present (no new PDF-viewer dependency needed).
- [Source: _bmad-output/implementation-artifacts/8-6-yogdaan-bahi-contribution-timeline-list-virtualization.md] — D1 (the self-view vs public boundary this story must extend to a shareable artifact), D3 + its BigDev ratification (grey = neutral "on record"), D4 (the Note seam), D6 (the shared identity resolver), and the review findings that established the fail-soft / `isError` / numeral-run conventions.
- [Source: docs/legal-counsel-engagement/review-scope-charter.md:26 + engagement-letter-template.md:44] — the Contribution Note copy is already named in counsel's review scope; `review-artifact-roster.md` is where AC6's row lands.

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (bmad-dev-story / Amelia)

### Implementation Plan

Task 0 recon complete against live source at `b5f1d67`. Every file:line cite in the story verified accurate (`history.ts:94`/`:162`, `handlers.ts:480`/`:543`/`:606-609`, `documents.ts:86-108`, `niyamavali/read.ts:26`, `microcopy.yaml:101-103`/`:133-134`, `i18n/src/index.ts:8-13`, the mobile route + `YogdaanBahiRow.tsx:61-65`).

Build order + the three engine/asset refinements made during recon (each a narrowing of a D-note, none a change to its intent):

1. **Contracts** — `contributions/contribution-note.ts`: the `ContributionNotePdfRenderer` port (pure TS, `Uint8Array`, modelled on `ClaimDocumentStorage`) + `ContributionNoteFacts` (`.strict()`, plain `z`, no `@twt/domain` import). `utr` optional + a `.superRefine` making it structurally impossible on a non-`green` facts object.
2. **Adapter** — `platform-adapters/src/contribution-note-pdf/{chromium,fake}.ts`. **Refinement of D1: `puppeteer-core`, not `puppeteer`.** `puppeteer` bundles a ~170 MB glibc Chromium download at install time that *does not run on the `node:22-alpine` base the api Dockerfile uses*. `puppeteer-core` + an injected executable path (`CHROMIUM_EXECUTABLE_PATH`, defaulting to the Alpine `chromium` package path) keeps `pnpm install`/CI light and is the only variant that actually works on the committed base image. Same engine, same D1 reasoning (HarfBuzz shaping + `--export-tagged-pdf`); only the delivery of the binary changes.
3. **Fonts — refinement of D5: vendor + *inline as a data URI*, do not rely on an installed system font at all.** D5 offers `file://`/data-URI *and* image install; inlining alone is strictly stronger — the template then carries its own face, so a font-less container cannot produce tofu. Vendored from `@expo-google-fonts/noto-sans-devanagari` (already a mobile dependency → the same family, one licence already in the tree) into `apps/api/assets/fonts/`. Noto Sans Devanagari covers Latin, so ONE face serves both scripts and there is no second-font fallback hole.
4. **Resolver + template** in `member-pool/` — reuse `listMemberContributionHistory` (member scope + status), `resolvePoolIdentity` (D6), `deriveContributionReference`, `resolveByClauseId(asOf = attestedAt)`, `getPariwarPassport` branding. Member watermark = SHA-256(pariwarId + memberId) truncated — derived, non-reversible, **not** a membership number.
5. **Route** `GET /api/v1/member/contribution-note/:contributionId` in the existing module — session-gated, dedicated stricter rate limit, 404 (unknown/not-yours) / 5xx (render), never a partial PDF. `noteAvailable` flips to the resolvability predicate.
6. **api-client + mobile** — reuse the existing `callBinary` (the 3.11 data-export precedent) + the `lib/save-export.ts` `File`/`Paths` + `Sharing` flow.
7. **i18n `note.*` + microcopy `code_globs` extension + teeth test; governance records.**

### Debug Log References

**`pnpm ci:local` with `DATABASE_URL` on :5433 — 28/28 jobs green** (lint, typecheck, build, unit tests, db-check, contracts-determinism, i18n-parity, pii-scrape, friction-budget, microcopy, all 11 invariant gates, determinism-replay, channels-determinism, integration-tests). No oversubscription flake this run.

**AC2 real-engine attestation — ATTESTED (not skipped).** `apps/api/tests/unit/contribution-note-render.test.ts` renders the REAL template through REAL headless Chromium (local Chrome, discovered by path) and asserts on the produced bytes: the vendored `NotoSansDevanagari` face is **embedded** and the document carries a **`StructTreeRoot`** (tagged PDF). Both assertions search the raw bytes PLUS every inflated FlateDecode stream — Chrome writes its catalog and font descriptors into compressed object streams, so a naive substring scan would have reported a false negative. Visual confirmation additionally captured for a green and a yellow Note: Devanagari conjuncts (प्रतिज्ञा, चिह्न), matras and the सत्यापित stamp all shape correctly; no tofu.

**Microcopy REVERT-SANITY (AC1 teeth — the deliverable, not the green scan).** Planted `Contribution Receipt` into the real `note-template.ts` `<title>`, then ran the real gate twice:
- **with** the 8.7 `scope.code_globs` entries → `✗ [vocabulary] apps/api/src/modules/member-pool/note-template.ts:139 — "Receipt" → use "Contribution Note (Yogdaan Pratigya)"`, gate FAILED;
- **without** them (extension reverted, violation left in place) → 74 code files scanned, `✓ no violations`, gate **PASSED**.
The identical violation goes unflagged without the extension, so the scope extension is load-bearing rather than decorative (`[[feedback_gate_scope_semantic_coverage]]`). Both files restored; gate green.

**Two live findings the extended gate caught on arrival** (fixed properly, NOT allow-listed): two hex colour literals in the resolver's `BRANDING_DEFAULTS` → `@twt/tokens` `color['rule-heavy']` / `color['stamp-mudra']`; and three uses of a prohibited vocabulary term in code comments → the canonical "Yogdaan Bahi". This is the semantic coverage AC1 asked for — the gate bit real code the moment the scope grew.

**Test-design defect found and fixed while writing the API suite.** The template inlines two ~220 KB base64 font blobs, and an arbitrary base64 blob contains essentially every short substring by chance — so `html.includes('v0')` and `!html.includes('Sharma')` produced silent false results. Every content assertion now runs against a `visible()` helper that strips the data URIs. Worth flagging for any future test over this template.

**Copy-assertion correction.** The first draft of the AC3 negative test banned the bare token `पुष्ट` on a non-green Note — which fails, because the honest yellow copy is "यह अभी पुष्ट नहीं है" ("is NOT yet confirmed"). The forbidden list now holds AFFIRMATIVE confirmation phrases only, and the yellow test additionally asserts the denial IS present.

### Completion Notes List

**What shipped.** `GET /api/v1/member/contribution-note/:contributionId` renders a member's own Yogdaan Pratigya as a tagged, Hindi-first PDF: server-authoritative, generated on demand, persisted nowhere. The `ContributionNotePdfRenderer` port lives in `@twt/contracts` with a headless-Chromium adapter and a deterministic fake in `@twt/platform-adapters`; the resolver and HTML template live in the existing `member-pool` module; the mobile screen fills the route 8.6 reserved.

**AC3 / D3 — the load-bearing invariant, enforced in three independent places.** (1) STRUCTURALLY in the contract: `ContributionNoteFacts` carries a `.superRefine` that makes `utr` impossible to set on a non-`green` facts object — a future dev cannot ship an over-claiming artifact by editing HTML, because the facts object refuses to exist. (2) In the template: the सत्यापित stamp and the UTR row are the only status-varying elements besides the status block, and all three key off the ONE `deriveContributionStatus` output. (3) In tests: a yellow Note is downloadable AND contains no UTR, no stamp, and no confirmation-implying string, while a green one contains both — the non-optional proof that availability and contents are governed independently.

**D3(a) ratification honoured exactly.** `noteAvailable` is now the literal `true` at the point in `resolveHistory` where every unresolvable row has already been omitted — a RESOLVABILITY predicate with **no status term**. The stale 8.6 comment encoding the rejected green-gating reading was replaced with the reasoning. Two new tests pin it: all four statuses get `true` when identity resolves, and two GREEN rows differing only in resolvability produce one row and one omission.

**AC4 — the honest gap, carried un-attested as designed.** The Niyamavali version resolves via `resolveByClauseId(..., asOf = attestedAt)` — asserted directly (`asOf` equals the contribution instant, not `now()`). No contribution-discipline clause is seeded for the launch tenant, so it resolves to `null` today and the artifact renders "अभी प्रकाशित नहीं · Not yet published". The generator never fabricates, back-dates, or defaults a version. The wiring is complete: a test with a published version proves a real `clause_version_id` is cited with zero code change. The clause constant addresses the contribution-discipline RULE (`niy.contribution-discipline.r7`), deliberately not one of the `r7-a…r7-g` ladder rungs — those are precedence-ordered explanations of which arm applied (`[[project_niyamavali_precedence_is_provenance]]`), and citing one on a durable artifact would misstate what governed the contribution.

**AC5 — the member mark is a watermark, not an identity.** `TWT-XXXXXXXX` = SHA-256(pariwarId + memberId) truncated: short, stable, non-reversible, and mixed with the Pariwar so the same member marks differently across tenants. No `member_number` column, generation scheme, or search key was introduced (`[[project_membership_number_deferred_feature]]`). A test asserts the raw member id never appears on the artifact. Only first-name + last-initial for both the member and the deceased family; no phone/address/Aadhaar/bank/nominee field exists on the facts shape at all, guarded by a 15-field structural rejection test.

**AC6 — legal posture recorded, not performed.** Row 21 `contribution-note-copy-fr33-v1` added to `review-artifact-roster.md` with the real enum (`integration_status: pending-submission`) and every required field populated, cross-referencing `review-scope-charter.md:26`. The copy ships **authored-but-not-counsel-reviewed**; engagement Tasks 7–11 remain `_AWAITING EXTERNAL ACTION_` and this story neither closes nor advances them. Per D8 the pending status is tracked internally and is **not** stamped on the member's artifact.

**Three implementation refinements of the D-notes** (each a narrowing, none a change of intent — all recorded in the Implementation Plan above):
1. **`puppeteer-core`, not `puppeteer`** (D1). `puppeteer` bundles a ~170 MB glibc Chromium that does not run on the `node:22-alpine` base the api Dockerfile actually uses, and would tax every install and CI cache. `puppeteer-core` + an injected `executablePath` (`CHROMIUM_EXECUTABLE_PATH`, distro `chromium` installed in the image) is the only variant that works on the committed base. Same engine, same reasoning; only binary delivery differs.
2. **Fonts inlined as data URIs, not merely installed** (D5). D5 offered `@font-face` sources *and* an image install; inlining alone is strictly stronger — the document carries its own face, so a font-less container cannot produce tofu. The adapter additionally aborts every non-`data:` request, so a remote font cannot silently succeed in dev and fail in prod. The image install is retained as belt-and-braces. Faces vendored from `@expo-google-fonts/noto-sans-devanagari` (the family the mobile app already uses; SIL OFL, licence shipped alongside). Verified against the file's cmap that this ONE face covers Devanagari, Latin, digits, `₹` and operational punctuation — so there is no second-font fallback hole for the Latin numeral run.
3. **`resolvePoolIdentity` + `cycleRefFromCommittedAt` extracted to `pool-identity.ts`.** The Note is their third consumer (D6), and reaching them from the Note resolver while the handler imports the resolver would have created an import cycle. Implementation unchanged — only the home moved.

**A note on the colour discipline.** Because the template entered `code_globs`, FM-14 #2 bites its stylesheet. Rather than allow-list it, every non-tenant colour is taken from `@twt/tokens` semantic roles (`ink-primary`, `surface-base`, `rule-hairline`, `stamp-mudra`, the four status inks). The only literal colours in the output are the Pariwar's own brand values, which are tenant DATA on the facts object. This is the first server-side consumer of `@twt/tokens`.

**Governance dispositions.** Friction budget: declaration affirmed, **no new row**, baseline **NOT ratcheted** (`[[project_friction_budget_baseline_ratchet]]`) — a member-session surface with zero deliberate friction; the ~440 KB of vendored faces are a server-side artifact asset that never enters any client bundle or public page. PII-scrape matrix: **no entry added, deliberately** — `public-vs-private-matrix.yaml` governs PUBLIC surfaces and explicitly reserves population to Epic 11a ("Do NOT pre-populate real surfaces here"); the Note is member-session-gated, so an entry here would breach that gate's ownership boundary. Its PII shape is recorded above instead.

**⚠️ UN-ATTESTED — the mobile download→open round-trip (AC7's device leg).** Attempted on the Pixel_9 emulator: the route resolves and the screen mounts, but the dev client served a **stale embedded bundle** (it still rendered the 8.6 placeholder) and Metro logged no bundle request from the device, so **the new screen was never exercised on-device**. Reaching a real green path additionally needs a member session plus seeded pool/claim/KYC/attestation data, for which no dev seed harness exists. Recorded as un-attested rather than asserted closed (`[[feedback_record_unattested_no_backfill]]`; the 8.6 AC4/AC5 discipline). Closing it needs `expo run:android` (a full native rebuild) plus a seeded member fixture — a forward commitment, not a silent gap.

What IS attested for the same surface: `pnpm typecheck` + `pnpm lint` + `pnpm i18n:check` + `pnpm microcopy:check` all green; the server render verified end-to-end against real Chromium with structural AND visual proof; and the save/share path is the same `expo-file-system` `File`/`Paths` + `expo-sharing` code shape already proven in production by the Story 3.11 data-export flow. What is NOT attested is the on-device fetch → cache-write → share-sheet round trip.

**Forward commitments owed.** (a) The device round-trip above. (b) AC4 begins citing real versions when Epic 2 seeds a contribution-discipline clause — no code change here. (c) The Note footer holds a reserved slot for Story 8.11's `<CallHelplineCTA>` (`epics.md:3049`); the CTA was deliberately not built. (d) `apps/api`'s deployable image now carries Chromium — a materially heavier runtime image, and the first browser dependency in the stack; if that weight becomes a deployment problem the port lets the adapter move to a jobs-side render service without touching the module, the route, or the template.

### File List

**New**
- `packages/contracts/src/contributions/contribution-note.ts`
- `packages/platform-adapters/src/contribution-note-pdf/chromium.ts`
- `packages/platform-adapters/src/contribution-note-pdf/fake.ts`
- `apps/api/src/modules/member-pool/contribution-note.ts`
- `apps/api/src/modules/member-pool/note-template.ts`
- `apps/api/src/modules/member-pool/note-assets.ts`
- `apps/api/src/modules/member-pool/pool-identity.ts` (extracted from `handlers.ts` — implementation unchanged)
- `apps/api/assets/fonts/NotoSansDevanagari_400Regular.ttf`
- `apps/api/assets/fonts/NotoSansDevanagari_700Bold.ttf`
- `apps/api/assets/fonts/LICENSE.txt`
- `apps/api/tests/unit/contribution-note.test.ts`
- `apps/api/tests/unit/contribution-note-render.test.ts` (the ONE browser test)
- `apps/mobile/lib/save-note.ts`
- `scripts/microcopy/contribution-note.test.ts`

**Modified**
- `packages/contracts/src/contributions/index.ts`
- `packages/contracts/tests/contributions.test.ts`
- `packages/contracts/scripts/emit-openapi.ts`
- `openapi/v1.yaml` (regenerated; determinism check green)
- `packages/platform-adapters/src/index.ts`
- `packages/platform-adapters/package.json` (+`puppeteer-core`)
- `packages/api-client/src/index.ts`
- `packages/i18n/locales/hi/contribution.json`
- `packages/i18n/locales/en/contribution.json`
- `apps/api/package.json` (+`@twt/i18n`, +`@twt/tokens`)
- `apps/api/src/context.ts`
- `apps/api/src/deps.ts`
- `apps/api/src/modules/member-pool/handlers.ts`
- `apps/api/src/modules/member-pool/routes.ts`
- `apps/api/tests/integration/_setup.ts`
- `apps/api/tests/unit/contribution-history.test.ts`
- `apps/api/Dockerfile`
- `apps/mobile/app/(contribution)/note/[id].tsx`
- `apps/mobile/components/yogdaan-bahi/YogdaanBahiRow.tsx`
- `apps/mobile/components/yogdaan-bahi/sample-data.ts`
- `microcopy.yaml`
- `friction-budget.md`
- `docs/legal-counsel-engagement/review-artifact-roster.md`
- `pnpm-lock.yaml`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-07-23 | 1.0 | Story IMPLEMENTED (ready-for-dev → review). All 7 tasks + 41 subtasks complete; `pnpm ci:local` 28/28 green with `DATABASE_URL` on :5433. Shipped: the `ContributionNotePdfRenderer` port + `ContributionNoteFacts` in `@twt/contracts` (with the `utr`-only-when-green `.superRefine` making an over-claiming artifact structurally unconstructible), the headless-Chromium adapter + deterministic fake in `@twt/platform-adapters`, the Note resolver + HTML template + `GET /api/v1/member/contribution-note/:contributionId` in the existing `member-pool` module (session-gated, per-member render rate limit, 404-not-fail-soft), the `noteAvailable` flip to the D3(a) resolvability predicate, the api-client bytes method, the real mobile Note screen, `note.*` copy in both locales, the microcopy `code_globs` extension with proven teeth, and the legal-roster + friction-budget dispositions. **AC2 ATTESTED against real Chromium** (embedded Devanagari face + `StructTreeRoot`, plus visual confirmation of conjunct/matra shaping and the green-only सत्यापित stamp). **Revert-sanity proven** for the gate-scope extension: the identical planted violation is flagged with it and unflagged without it; the extension also caught two real findings on arrival (hex colour literals → `@twt/tokens` roles; a prohibited term in comments → the canonical noun), fixed rather than allow-listed. Three D-note refinements recorded: `puppeteer-core` over `puppeteer` (the bundled glibc Chromium does not run on the committed alpine base), fonts INLINED as data URIs rather than merely installed (the document then carries its own face, so a font-less container cannot ship tofu), and `resolvePoolIdentity`/`cycleRefFromCommittedAt` extracted to `pool-identity.ts` for their third consumer. **Carried UN-ATTESTED:** the mobile download→open round-trip (the emulator served a stale embedded bundle; needs a native rebuild + a seeded member fixture) and AC4's live version citation (no contribution-discipline clause is seeded — Epic 2's to author; the wiring is complete and renders an honest absence). | bmad-dev-story (Amelia) |
| 2026-07-23 | 0.3 | Validation pass (validate-create-story checklist): fixed Task 7's legal-roster row to use the real schema (`integration_status: pending-submission`, full required-field set) instead of a nonexistent bare "pending" status; corrected Task 0's `resolvePoolIdentity` line cite from `:487` to `:480` to match D6; flagged in Task 2 that headless Chromium is the first browser-rendering dependency in `apps/api`'s deployable image. All other file:line references, precedents, and cross-story claims (history.ts, handlers.ts, documents.ts, niyamavali/read.ts, microcopy.yaml, mobile route/deps, i18n, api-client, legal-scope-charter, Story 8.6 substrate, sprint-status prerequisites) independently re-verified against live source at HEAD `b5f1d67` and confirmed accurate. | bmad-create-story |
| 2026-07-23 | 0.2 | D3 ratified by BigDev exactly as drafted: availability is NOT status-gated (green-only gating explicitly rejected); `noteAvailable` is a **resolvability** predicate (own-contribution + resolvable pool identity) with no status term, while the artifact's contents — status block, UTR presence, *सत्यापित* stamp — are governed strictly by `deriveContributionStatus` and nothing else. The two rules compose and neither may leak into the other; Task 4's yellow-Note negative test is the load-bearing proof and is non-optional. Task 4 additionally now calls for replacing the stale "a green/confirmed row is the natural first target" comment left at `handlers.ts:606-608` by 8.6, which encodes the rejected reading. | bmad-create-story |
| 2026-07-23 | 0.1 | Story drafted (ready-for-dev) — bmad-create-story context-engine pass over epics 8.7 + FR-33 + the 8.6 Yogdaan Bahi substrate (history read, `deriveContributionStatus`, `resolvePoolIdentity`, the reserved Note route) + the 6.5 port/adapter precedent + the Story 2.3 Niyamavali as-of resolution + `microcopy.yaml` scope + UX §7 certificate/accent/numeral discipline. Key decisions surfaced: HTML→headless-Chromium behind a renderer port as the only engine satisfying both Devanagari shaping and tagged PDF (D1), regenerate-never-persist (D2), **Note-availability gating flagged for BigDev** with honest-status + reserved-*सत्यापित*-stamp as the recommended default (D3), Niyamavali version resolved as-of the contribution instant with an honest-absence rule and no fabricated version (D4), the font/tofu disaster (D5), reuse-don't-re-derive for status/identity/`tr=` (D6), microcopy `code_globs` extension with proven teeth (AC1), and ownership + rate-limit guards on the first render-cost endpoint (D9). | bmad-create-story |
