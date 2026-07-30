---
baseline_commit: 3bfb4f53682a4d825cebad6df94a54654774ca53
---

# Story 10.5: News/Blog Dual Surface + Author ≠ Reviewer + Scheduled Publish + Channel-Per-Post `[SURFACE]`

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Pariwar admin or trustee authoring member-facing announcements,
I want a News/Blog admin surface with audience scoping + author ≠ reviewer enforcement + scheduled publishing + per-post channel selection,
so that member-visible content goes through procedural-fairness (tone) review before publish and dispatches via the right channels at the right time.

## Scope Boundary (read first — prevents over-build)

**This is the first story in Epic 10 that leaves the helpdesk family.** There is **no `news-blog` primitive story before it** — 10.5 builds its OWN data model, but it is `[SURFACE]`, not `[PRIMITIVE]`, and it is deliberately a **thin composition over four already-shipped substrates**: (1) the **`alert_published` notification** (`packages/contracts/src/alerts/alert.ts:112` — `{title, body}`, already deep-linking to `announcements/:alert_id`) + the **shipped dispatch fan-out** (`fanOutAlertToMembers`, `apps/jobs/src/scheduler/contribution-notify.ts:426` — the stack's live `dispatch()` composition); (2) the **tone-review gate** (`packages/domain/src/tone-review/gate.ts` — a PURE, injected-signoff evaluator whose consumer owns persistence, the Story 2.4 precedent); (3) **Story 1.8 RBAC** (mint one key, the 10.3/10.4 helpdesk precedent); (4) **Story 1.10 audit** (per-transition attribution). **You are wiring, not inventing primitives.** Read [[project_alert_primitive_substrate]], [[project_channels_no_live_dispatch_yet]] (retired — live dispatch exists), [[project_contribution_event_name_contract]], [[project_admin_display_name_attribution]], [[project_rbac_geo_scope_containment]].

**Two epics-prose facts are WRONG against the live system — do NOT follow them literally (see Load-Bearing Decisions):**
- Epics says channels are `in_app | wa | sms | email`. **The real delivery layer** (`packages/domain/src/notifications/delivery.ts:46`) supports **`push | whatsapp | sms | telegram`** — there is **no `email` channel** and there **is** a `telegram` channel. Map to the real set. (Same "note-the-substitution" discipline as [[project_mmkv_asyncstorage_equivalent]].)
- Epics says the member surface is a "member feed". **There is no `apps/web`** — the public surface is **`apps/public`** (Astro); the member surface is the `announcements/:alert_id` push landing that `alert_published` already deep-links to (mobile). This story does not build a new member-app "feed" screen — but that call is **Decision 5, UNCONFIRMED** (see Load-Bearing Decisions): `architecture.md:4225` still reserves a dedicated `apps/mobile/app/p/[pariwarId]/news/` route, so get PO sign-off before treating the push landing as the full substitute.

| In scope (10.5) | Out of scope → owning story / seam |
|---|---|
| **`news_posts` data model** (NEW migration `0085`, NEW `packages/domain/src/schema/news_posts.ts`). Columns: `post_id` (PK), `pariwar_id` (RLS), `title`, `body_markdown`, `audience_scope` (`public\|members-all\|state\|role\|cohort` pgEnum), `audience_scope_value` (nullable — the state/role/cohort selector), `scheduled_publish_at` (nullable), `channels` (text[] — `push\|whatsapp\|sms\|telegram`), `status` (`draft\|submitted\|approved\|scheduled\|published` pgEnum), `author_actor_id`, `reviewer_actor_id` (nullable until submitted/approved), bilingual copy fields (`title_hi`/`body_markdown_hi` — REQUIRED for `public`/`members-all`, see AC7), `published_at` (nullable), timestamps. Per-Pariwar `news_posts_pariwar_status_idx`. | Comments (epics: "disabled by default") — **no comment system built**; the column/feature is a documented non-goal. |
| **Status is a MUTABLE column + audit-logged transitions — NOT event-derived-state** (Load-Bearing Decision 1). Unlike `members`/`alerts`/`pools`/`helpdesk_tickets`, News/Blog posts are **mutable content** (title/body edited across drafts) with an admin workflow, not a legal-state machine; the epics frames status as a plain column and author≠reviewer as an **API-layer** check. So: a plain `status` enum updated in the scoped tx, every transition written to the Story 1.10 audit log (author/reviewer/publish attribution). **No projector, no state-writer trigger, no CI state-invariant gate, no `events_log` stream.** | Full event-sourcing of the post lifecycle → **considered and rejected** (Decision 1); if a future story needs replayable post history, that is its call. |
| **Domain module** `packages/domain/src/news-blog/`: `createDraft` / `updateDraft` (draft-only edits), `submitForReview(postId, reviewerId)` (draft→submitted; **rejects if `reviewerId === author_actor_id`**), `approve(postId, approverActorId, signoff)` (submitted→approved; **rejects if approver === author**; runs `evaluateToneReviewGate` with the injected non-author sign-off), `schedule(postId, at)` (approved→scheduled), `publish(postId)` (approved/scheduled→published; sets `published_at`). Pure `nextPostStatus(status, action)` legality helper (the 10.4 `nextTicketState` precedent — API guards illegality pre-write). Read: `listPostsForPariwar` (paginated, status-filtered, `clampLimit`) + `getPost` + a public read `listPublishedPublicPosts`. | — |
| **author ≠ reviewer enforcement at the API layer** (epics-explicit). `submitForReview` 403s if `reviewer_id == author_id`; `approve` 403s if the approving actor is the author. Identity-based (actor-id compare), NOT a distinct RBAC key (Decision 2 — one `news.manage` key; both author and reviewer hold it; the system forbids the SAME person doing both). | A split `news.author` / `news.review` capability model → **considered and rejected** (Decision 2); v1 is identity-based per the epics text. |
| **tone-review sign-off (Story 2.2) recorded before approval.** `approve` is the point the **non-author reviewer records a `ToneReviewSignoff`** (`resourceLocator = news:post:<postId>`, `contentHash = sha256(body_markdown [+ _hi])`) and it is injected into `evaluateToneReviewGate`; deny → typed 409, no status change. Persist the sign-off (a `news_post_tone_signoffs` row or a column on the post — Decision 3) — the consumer owns persistence (the gate is pure; `tone-review/gate.ts` header + the 2.4 niyamavali precedent). Reuse the `ToneReviewAuditSink` seam (`apps/api/src/modules/tone-review/index.ts`). | The Story 1.17 automated `microcopy` lint floor (the automatable layer BELOW tone-review) — already enforced elsewhere; not this story. |
| **Scheduled publish via pg-boss** (`apps/jobs`). On `schedule`, enqueue a delayed job (`boss.send(NEWS_PUBLISH, {postId}, { startAfter: scheduledPublishAt, singletonKey: postId })`); the worker at fire time **re-checks `status === 'scheduled'`** (idempotent — a cancelled/re-scheduled post is a no-op), transitions to `published`, and enqueues the channel fan-out. The `cycle-open-alert.ts` `boss.schedule`/`singletonKey` composition is the precedent. | The pg-boss `startAfter`-native-delay refinement is noted as available in `contribution-notify.ts:46`; use it. A cron-sweep fallback for missed schedules → optional hardening, **documented seam** (v1 relies on the native delayed job + the idempotent status re-check). |
| **Channel dispatch on publish** = the `alert_published` fan-out. For each member in the resolved audience, build an `alert_published` `Alert` (`{title, body}` — the post's title/body, producer-formatted, locale-correct) and dispatch via `fanOutAlertToMembers` on the post's selected `channels`. Reuse the shipped composition; **do NOT re-implement dispatch**. Providers unwired ⇒ **log-only fixture delivery** (identical to helpdesk 10.4 / [[project_channels_no_live_dispatch_yet]]) — the emit + fan-out wiring is the deliverable. The deep-link (`announcements/:alert_id`) is already wired (`deep-link.ts:86`). | Real SMS/push/WA/telegram vendor integration — providers unwired, log-only fixtures. |
| **Audience member-resolution: `members-all` is FULLY wired; `public` dispatches to NO member (public-web render only); `state`/`role`/`cohort` are STORED + rendered but their DISPATCH selection is a documented seam** (Load-Bearing Decision 4). The `members` table carries only `state` (LIFECYCLE state — NOT geography) + `pariwar_id` (`schema/members.ts`) — there is **no queryable member district / designation / cohort attribute** to filter on. So `resolveAudienceMemberIds` fully implements `members-all` (all `active`/in-grace members in the Pariwar — reuse the validity/active predicate, NOT a raw state scan) and `public` (empty member set — the post renders on `apps/public`, no push). `state`/`role`/`cohort` **persist + display + drive the tone-review bilingual requirement**, but their member-selection predicate is a **seam** (no member attribute exists yet); a v1 `state`/`role`/`cohort` post is accepted, tone-reviewed, and rendered, and its dispatch resolves to the empty set with a logged "audience selector not yet resolvable" note — it lights up for free when Epic-3 geo / a member-designation attribute lands. | A geo-tree / designation / cohort member-selection resolver → future story (the [[project_rbac_geo_scope_containment]] "no geo-tree resolver until Epic 3" precedent). |
| **RBAC:** mint `news.manage` (dimension `pariwar`, catalog `PERMISSION_CATALOG_VERSION` 24→25) gating every admin news route (list / create / update / submit / approve / schedule / publish). Grant to the authoring roles (`pariwar_admin`; `super_admin` auto-derives; `media_comms` — the codebase's one existing content/comms-authoring role, currently unused by any authoring permission — is the likely candidate to also grant; confirm with the PO whether `media_comms` alone should author+review or share the key with `pariwar_admin`, Dev Notes). `district_admin` **DEFERRED** — a district-ceiling grant can never satisfy a `pariwar`-dimension check ([[project_rbac_geo_scope_containment]]), the same asymmetry 10.3/10.4 encoded. | A separate read-only `news.view` key → seam; v1 folds read under `news.manage`. The PUBLIC read (`apps/public`) is **unauthenticated** (FR-74 public matrix) — no RBAC. |
| **Admin authoring UI** — NEW `apps/admin/src/modules/news-blog/`: a post list (status-filtered, paginated), an editor (title/body_markdown + hi fields, audience_scope + value, channels multi-select, schedule picker), and the submit/approve(+sign-off)/schedule/publish actions gated on status-legality. Precedent: the `niyamavali-admin` module (closest analogue — authored copy + review/publish workflow) and the 10.4 `helpdesk` queue/detail module. New route(s) `/p/$pariwarId/news/*` in `router.tsx`. | — |
| **Public read surface** (`apps/public`, Astro) — a `public`-audience published-post list + detail page (bilingual, unauthenticated), reading `listPublishedPublicPosts`. Follow the existing `apps/public` page/layout conventions + its `COMPOSITION-CONTRACT.md`, and its established RLS-scoped read pattern (`apps/public/src/lib/db.server.ts` — `getDb`/`withPublicScope`, Story 2.5), already used by `terms.astro` and `niyamavali.astro`. | — |
| **Contracts DTOs** (`packages/contracts/src/news-blog/`) + `emit-openapi.ts` + `openapi/v1.yaml` regen. | — |
| **en/hi parity** for public/members-all copy (FR-51: "Hindi + English required for public/members-all scoping"). The post's own bilingual fields are validated at submit; any new member-facing notification strings go through `packages/i18n` hi/en. | — |

## Acceptance Criteria

**AC1 — The post data model + the draft-authoring surface.**
Given FR-51 + Story 1.8 RBAC,
When the News/Blog admin surface is implemented,
Then a `news_posts` model exists (NEW migration `0085` + `schema/news_posts.ts`) carrying `title`, `body_markdown`, bilingual `title_hi`/`body_markdown_hi`, `audience_scope` (`public | members-all | state | role | cohort`), `audience_scope_value` (nullable), `scheduled_publish_at` (nullable), `channels` (`push | whatsapp | sms | telegram` — per-post selectable), `author_actor_id`, `reviewer_actor_id` (nullable until submitted), `status` (`draft | submitted | approved | scheduled | published`), `published_at`, per-tenant `pariwar_id` (RLS) + a `news_posts_pariwar_status_idx`;
And a holder of `news.manage` opens `/p/:pariwarId/news` (tenant-scoped, session-gated like every `/p/$pariwarId/` admin route), sees the Pariwar's posts (newest-first, paginated, status-filterable via a real `listPostsForPariwar` with `clampLimit`), and can create + edit a **draft** (title/body/audience/channels/schedule) — draft edits are allowed ONLY while `status === 'draft'` (a submitted/approved post is edit-locked; a legality guard rejects a draft-edit on a non-draft pre-write);
And **`status` is a plain mutable column, NOT event-derived-state** — there is no projector, no state-writer trigger, no `events_log` stream for posts (Load-Bearing Decision 1); every transition is written to the Story 1.10 audit log with actor attribution.

**AC2 — Author ≠ reviewer, enforced at the API layer.**
Given a draft authored by actor A,
When submit / approve are called,
Then `submit_for_review(post_id, reviewer_id)` sets `status = submitted` + records `reviewer_actor_id` **but rejects with 403 if `reviewer_id == author_actor_id`**; and `approve(post_id)` (submitted → approved) **rejects with 403 if the approving actor is `author_actor_id`** — both are identity-based checks at the handler, distinct from the `news.manage` RBAC gate (which both author and reviewer hold; Load-Bearing Decision 2);
And the pure `nextPostStatus(status, action)` helper defines the legal transitions; an illegal transition (e.g. `approve` a `draft`, `publish` a `submitted`) is rejected at the API layer BEFORE any write (a typed 409 — the 10.4 `nextTicketState` "reducer/emitter guard" discipline, [[project_helpdesk_responder_surface_104]]).

**AC3 — Tone review (Story 2.2) gates approval; the reviewer's sign-off is recorded.**
Given the tone-review publish-gate (`evaluateToneReviewGate`, `packages/domain/src/tone-review/gate.ts`) and Story 2.2's "a NON-AUTHOR reviewer records a sign-off before member-visible copy publishes",
When a reviewer approves a post,
Then `approve` records a `ToneReviewSignoff` (`reviewedBy = approver`, `resourceLocator = news:post:<postId>`, `contentHash = sha256` of the reviewed body — never the raw copy in the sign-off), **injects it into `evaluateToneReviewGate`, and proceeds to `approved` ONLY if the gate allows** (a missing / author-authored / wrong-resource sign-off → typed 409, status unchanged);
And the sign-off is **persisted by this consumer** (the gate is pure — persistence is the consumer's, per its header + the Story 2.4 niyamavali precedent) and its recording routes through the dedicated `ToneReviewAuditSink` (`tone_review.signoff`, `apps/api/src/modules/tone-review/index.ts`) — NOT the auth taxonomy, NO raw copy in the audit.

**AC4 — Scheduled publish fires at the scheduled time via pg-boss.**
Given `scheduled_publish_at` on an `approved` post,
When the post is scheduled,
Then `schedule(post_id, at)` (approved → scheduled) enqueues a **pg-boss delayed job** (`startAfter: scheduled_publish_at`, `singletonKey: post_id` — the `cycle-open-alert.ts` precedent) that at fire time **re-checks `status === 'scheduled'`** (idempotent: a cancelled or re-scheduled post is a clean no-op), transitions the post to `published`, sets `published_at`, and enqueues the channel fan-out (AC5);
And an immediate publish (no schedule) is supported: `publish(post_id)` directly on an `approved` post transitions to `published` + fans out inline (the same publish path the worker calls).

**AC5 — Channel dispatch on publish (the `alert_published` fan-out), audience-scoped, channel-selected.**
Given the post's `audience_scope` + `channels`,
When a post publishes,
Then for each member in the **resolved audience** the system builds an `alert_published` `Alert` (`{ title, body }` = the post's producer-formatted, locale-correct copy) and dispatches it via the SHIPPED `fanOutAlertToMembers` composition on the post's selected `channels` — reusing the live dispatch, NOT re-implementing it; v1 delivery is a **log-only fixture** (providers unwired, [[project_channels_no_live_dispatch_yet]] retired); the deep-link resolves to `announcements/:alert_id` (already wired, `deep-link.ts:86`);
And **audience resolution** (Load-Bearing Decision 4): `members-all` resolves to all active/in-grace members in the Pariwar (reuse the validity/active predicate — NOT a raw `state` scan); `public` resolves to the **empty member set** (public-web render only, no push); `state` / `role` / `cohort` are accepted + stored + rendered but their dispatch selector is a **documented seam** (the `members` table has no district/designation/cohort attribute — `schema/members.ts`) → a v1 non-`members-all`/non-`public` post dispatches to the empty set with a logged "audience selector not yet resolvable" note, lighting up for free when the selection primitive lands.

**AC6 — RBAC: mint + grant + gate `news.manage`.**
Given every admin news route needs an authorization gate,
When this story is implemented,
Then `news.manage` is minted (`PERMISSION_CATALOG_VERSION` 24 → 25, dimension `pariwar` — value = `scopeTx.pariwarId`, the `helpdesk.create`/`helpdesk.respond`/`reconciliation.review` pariwar-wide precedent) and gates the list/create/update/submit/approve/schedule/publish routes (`[requireAdminSession, scopeResolutionHook, requirePermissionHook(deps, NEWS_MANAGE_KEY, { dimension: 'pariwar' })]`, no step-up);
And it is granted to the content-authoring roles (`pariwar_admin` + `super_admin` auto-derives, plus `media_comms` — the one existing comms-authoring role in `roles.ts`, currently unused by any authoring permission; confirm with the PO whether it's included, Dev Notes); **`district_admin` is deliberately NOT granted** — a district-ceiling grant can never satisfy a `pariwar`-dimension check ([[project_rbac_geo_scope_containment]]), the exact asymmetry 10.3/10.4 encoded;
And an actor without the grant is fail-closed (audited 403); an actor with it succeeds — asserted as a revert-sanity pair + the `district_admin`-denied pin;
And the **public read surface** (`apps/public`) is **unauthenticated** (FR-74 public matrix) — it reads only `public`-audience `published` posts and never touches `news.manage`.

**AC7 — Bilingual requirement + dual surface render.**
Given FR-51 "Hindi + English required for public/members-all scoping",
When a post's `audience_scope ∈ { public, members-all }`,
Then submit/approve **requires both** the English (`title`/`body_markdown`) and Hindi (`title_hi`/`body_markdown_hi`) copy to be present (a missing Hindi field on a public/members-all post → typed 422 at submit) — for `state`/`role`/`cohort` the Hindi field is optional (Pariwar-locale-dependent);
And a `public`-audience published post renders on `apps/public` (Astro, unauthenticated) as a bilingual blog list + detail (following the existing `apps/public` page/layout conventions + `COMPOSITION-CONTRACT.md`, reading via the established `getDb`/`withPublicScope` RLS-scoped pattern in `apps/public/src/lib/db.server.ts` — the same path `terms.astro`/`niyamavali.astro` already use, Dev Notes);
And a `members-all` published post reaches the member via the `alert_published` push landing (`announcements/:alert_id`, already wired) — this story does not build a new member-app feed screen (Decision 5, **UNCONFIRMED**: `architecture.md:4225` still reserves a dedicated `news/` mobile route distinct from the `announcements` landing; get PO sign-off before treating the epics "member feed" prose as fully superseded).

**AC8 — Tests + gates green.**
Given `pnpm ci:local` (`--concurrency=4`, DB on :5433) is the primary sanctioned merge gate (ADR-0017, ratified — a brief ADR-0036 GitHub-Actions-reinstatement was authored 2026-07-29 and reverted 2026-07-30; cloud CI is NOT authoritative right now) — [[project_ci_actions_suspension_local_mirror]], [[project_ci_local_concurrency_oversubscription]],
Then domain unit tests cover: `nextPostStatus` legality (every legal + illegal arm); the author≠reviewer rejections (submit + approve); the tone-review gate integration (deny on missing/author/wrong-resource sign-off; allow on a valid non-author sign-off); the bilingual-required check for public/members-all; `resolveAudienceMemberIds` (`members-all` membership, `public` empty, `state`/`role`/`cohort` empty-with-seam);
And live-DB integration covers: the paginated status-filtered scope-respecting list (**assert membership, not counts** — [[project_live_db_test_gotchas]]); each transition write + audit-log entry; an illegal transition rejected pre-write (a no-op does not become a 200); the RBAC 403-without/200-with revert-sanity pair + the `district_admin`-denied pin; the publish path builds + fans out the `alert_published` alert (fixture-level) to a `members-all` audience;
And the pg-boss scheduled-publish worker: a scheduled post fires → publishes → fans out; a cancelled/re-scheduled post is an idempotent no-op (`singletonKey` + status re-check);
And admin UI component/interaction tests cover the list (status filter, pagination) + the editor (audience/channels/schedule) + the submit→approve(sign-off)→schedule/publish action flow (following the `niyamavali-admin` / 10.4 `helpdesk` module test conventions);
And `emit-openapi.ts` + `openapi/v1.yaml` are regenerated for the new DTOs; en/hi parity holds for any new member-facing copy; `pnpm ci:local` is green.

## Load-Bearing Decisions

Decisions 1–4 are architecturally significant; each was surfaced with a firm recommendation + rejected alternative (the 10.4 house style) and **all four were confirmed by the product owner on 2026-07-30 (RESOLVED)**. They are settled — do NOT re-litigate them in dev; implement to them. Decision 5 is a fifth, **UNCONFIRMED** call surfaced during story validation — needs explicit PO sign-off before dev starts on the mobile-surface question it covers; everything else in this story can proceed regardless of its outcome.

1. **Data model — RECOMMEND a mutable `status` column + audit-logged transitions, NOT event-derived-state.** Every other stateful entity in this codebase (`members`, `alerts`, `pools`, `helpdesk_tickets`) is event-derived with a projector + a `app.*_state_writer` DB-trigger guard + a CI state-invariant gate ([[project_helpdesk_primitive_substrate]], [[project_alert_primitive_substrate]], [[project_member_lifecycle_domain_substrate]]). News/Blog posts are **different in kind**: mutable rich content (title/body edited across drafts, not an append-only fact stream), an admin workflow (not a legal/audit-critical lifecycle like a claim or a contribution), and the epics itself frames `status` as a plain column with an **API-layer** author≠reviewer check. Event-sourcing mutable markdown is a heavy mismatch, and the `[SURFACE]` label signals "don't stand up a new primitive." → **A plain `status` pgEnum, transitioned in the scoped tx, with every transition written to the Story 1.10 audit log (author/reviewer/publish attribution).** No projector, no trigger, no CI gate, no stream. *Rejected alternative:* full event-sourcing to match helpdesk — rejected as over-build for mutable content with no replay requirement.

2. **Author vs reviewer — RECOMMEND ONE `news.manage` key + identity-based author≠reviewer at the API.** The epics is explicit: "author ≠ reviewer enforcement is at the API layer: `submit_for_review` rejects if `reviewer_id == author_id`; `approve` rejects if approving actor is the author." That is an **identity** check, not a **capability** split. Both the author and the reviewer need to *act on* the post, so both hold `news.manage`; the system simply forbids the same person from being author and approver. This is simpler, faithful to the text, and one RBAC key (the 10.3/10.4 single-key precedent). *Rejected alternative:* split `news.author` / `news.review` keys — rejected; the epics models fairness by identity, not by a junior-author/senior-reviewer capability tier, and a split would still need the identity check anyway.

3. **Tone-review sign-off persistence — RECOMMEND a dedicated `news_post_tone_signoffs` row (or a first-class sign-off record), recorded at `approve`.** The gate is pure and the consumer owns persistence (`gate.ts` header + the Story 2.4 niyamavali precedent). `approve` is exactly the non-author-reviewer sign-off moment. Persist `{post_id, reviewed_by, content_hash, reviewed_at}` and inject it into `evaluateToneReviewGate`; re-approving after an edit needs a fresh sign-off (the `contentHash` binds the sign-off to the reviewed copy — an edit invalidates it). Route the recording through the existing `ToneReviewAuditSink`. *Alternative considered:* fold the sign-off into the post row (`reviewer_actor_id` + a `tone_signoff_content_hash` column) — acceptable and lighter; pick whichever the dev finds cleaner, but the `contentHash`-binds-to-copy invariant is non-negotiable.

4. **Audience dispatch resolution — RECOMMEND fully wiring `members-all` + `public` now, and shipping `state`/`role`/`cohort` as stored-and-rendered with a seam'd dispatch selector.** The `members` table has only `state` (LIFECYCLE, not geography) + `pariwar_id` — there is no district / designation / cohort member attribute to filter on (`schema/members.ts`). Fabricating one is out of scope and would collide with Epic-3 geo. So `members-all` (all active/in-grace members) + `public` (empty member set, web-only) are fully functional; `state`/`role`/`cohort` posts are accepted, tone-reviewed, rendered, and dispatch to the empty set with a logged seam note — activating for free when the selection primitive lands. This is the [[project_rbac_geo_scope_containment]] "no geo-tree until Epic 3, resolve only what exists" discipline applied to audience.

5. **UNCONFIRMED — mobile member-feed screen: does `apps/mobile/app/p/[pariwarId]/news/` get built in this story, or does the `alert_published`/`announcements` push landing fully substitute for it?** The Scope Boundary and AC7 take the position that no new member-app feed screen is needed — the `alert_published` push already deep-links to `announcements/:alert_id`, and the epics' "member feed" language is read as predating that landing. But `architecture.md:4225` still explicitly reserves `apps/mobile/app/p/[pariwarId]/news/` — `# FR-51 member news feed` — as its own route, distinct from the generic `announcements` alert landing, and nothing in the architecture doc marks it deprecated or superseded. Unlike Decisions 1–4, this has **not** been confirmed by the product owner. *Recommendation:* proceed with the `announcements` landing as sufficient for v1 dispatch (as the rest of this story assumes) UNLESS the PO confirms the `news/` route is still wanted as a dedicated in-app list/browse screen (as opposed to the reactive push landing) — in which case that screen is a follow-on story, not silently folded into 10.5's scope. Do not delete or reinterpret the `architecture.md:4225` line item without that confirmation.

## Tasks / Subtasks

- [x] **Task 1 — Domain: `news_posts` schema + migration 0085 + status/legality core** (`packages/domain/src/schema/news_posts.ts`, `packages/domain/migrations/0085_news-blog-posts.sql`) (AC1, AC2)
  - [x] `schema/news_posts.ts`: the table (all AC1 columns), two pgEnums (`news_audience_scope`, `news_post_status`) each derived from a single canonical tuple (the `members.ts` "one spelling authority" discipline), the `news_posts_pariwar_status_idx`, `$inferSelect`/`$inferInsert` row types. `channels` as `text[]` with the `push|whatsapp|sms|telegram` value set (map from epics' wrong `in_app|wa|sms|email` — Scope Boundary note). Branded `pariwar_id`.
  - [x] Migration `0085`: `CREATE TYPE` for both enums + `CREATE TABLE news_posts` + the index + **RLS policy** (`USING`/`WITH CHECK (pariwar_id = current_setting('app.pariwar_id'))` — the every-tenant-table precedent; grep an existing migration for the exact RLS DDL). **NO state-writer trigger** (Decision 1 — status is a plain column). Register in the drizzle journal correctly ([[project_live_db_test_gotchas]] — never regenerate an applied migration).
  - [x] Decide + implement the tone-signoff persistence (Decision 3): either a `news_post_tone_signoffs` table in the same migration, or `tone_signoff_content_hash` + `tone_signoff_reviewed_at` columns on `news_posts`.
  - [x] Pure `nextPostStatus(status, action)` in `news-blog/status.ts` (DB-free; legal arms: draft→submitted, submitted→approved, approved→scheduled, approved→published, scheduled→published; everything else illegal). Unit-tested every arm.
- [x] **Task 2 — Domain: the news-blog module (writes + reads + audience resolution)** (`packages/domain/src/news-blog/`) (AC1–AC5)
  - [x] `write.ts`: `createDraft` / `updateDraft` (draft-only guard), `submitForReview(postId, reviewerId, actor)` (author≠reviewer 403; bilingual-required check for public/members-all → AC7), `approve(postId, approver, signoff)` (author≠approver 403; `evaluateToneReviewGate` inject → deny=409; persist sign-off; status→approved), `schedule(postId, at)`, `publish(postId)` (sets `published_at`). All in the caller's scoped tx (no self-commit). Every transition emits a Story 1.10 audit entry.
  - [x] `read.ts`: `listPostsForPariwar(db, pariwarId, {status?, limit, offset})` (`clampLimit`, newest-first, `news_posts_pariwar_status_idx`, membership-not-counts) + `getPost` + `listPublishedPublicPosts(db, pariwarId, {...})` (status=published ∧ audience=public — the `apps/public` read).
  - [x] `audience.ts`: `resolveAudienceMemberIds(db, pariwarId, audienceScope, scopeValue)` — `members-all` → active/in-grace member ids (reuse the validity/active predicate, NOT a raw `.select(members)` state scan; see Dev Notes for the right helper); `public` → `[]`; `state|role|cohort` → `[]` + a logged seam note (Decision 4). Unit-tested.
  - [x] Barrel-export from `packages/domain/src/index.ts` (the `news-blog` namespace). Unit tests for legality, author≠reviewer, tone-gate integration, bilingual-required, audience resolution.
- [x] **Task 3 — Contracts: news DTOs** (`packages/contracts/src/news-blog/`) (AC1, AC5, AC7)
  - [x] `CreateDraftRequest` / `UpdateDraftRequest` / `SubmitRequest` (`reviewer_id`) / `ApproveRequest` / `ScheduleRequest` (`scheduled_publish_at`) / `PublishRequest`; `NewsPostResponse` / `NewsPostListResponse` (paginated + `next_offset`); `PublicPostResponse` / `PublicPostListResponse` (bilingual, no actor ids). Pure-Zod, `.strict()`, snake_case wire (domain camelCase — watch the [[project_story_validate_footguns]] drift), NO `@twt/domain` import ([[project_contracts_domain_bundle_boundary]]).
  - [x] Channel enum `push|whatsapp|sms|telegram`; audience enum matching the domain tuple (a sync-guard test asserting contracts↔domain enum parity — the helpdesk severity sync-guard precedent).
  - [x] Register all routes in `scripts/emit-openapi.ts` + regenerate `openapi/v1.yaml`. Extend `packages/contracts/tests/`.
- [x] **Task 4 — API: admin news routes + author≠reviewer + tone-gate + public read route** (`apps/api/src/modules/news-blog/`) (AC1, AC2, AC3, AC6)
  - [x] `GET /p/:pariwarId/news` (paginated list), `POST /p/:pariwarId/news` (create draft), `PATCH …/news/:postId` (update draft), `POST …/news/:postId/submit`, `POST …/news/:postId/approve`, `POST …/news/:postId/schedule`, `POST …/news/:postId/publish`, `GET …/news/:postId`. Each: legality guard pre-write (typed 409 via `nextPostStatus`), the identity checks (403 on self-review/self-approve), returns the body (never `void reply.status().send()` — [[project_fastify_onsend_doublesend]]).
  - [x] `approve` mounts the tone-review sign-off flow (reuse `apps/api/src/modules/tone-review/index.ts` patterns — the `recordToneReviewSignoff`/`requireToneReviewSignoff` helpers + the `ToneReviewAuditSink`); persist + inject + gate.
  - [x] `schedule`/`publish` call into the jobs enqueue (Task 5) — publish fans out inline; schedule enqueues the delayed job.
  - [x] Gate all admin routes behind `requirePermissionHook(deps, 'news.manage', { dimension: 'pariwar' })`, no step-up. The **public** read route (`GET …/public/news` or via `apps/public`'s own data path) is UNAUTHENTICATED (AC6 last clause) — confirm where the public read is served from (Dev Notes / Task 7).
  - [x] Integration spec: transitions + audit; illegal-transition 409; author≠reviewer 403s; tone-gate deny 409 / allow; RBAC revert pair + district_admin-denied pin; publish → `alert_published` fan-out fires (fixture).
- [x] **Task 5 — Jobs: scheduled-publish worker + publish fan-out** (`apps/jobs/src/scheduler/news-publish.ts`) (AC4, AC5)
  - [x] `enqueueScheduledPublish(boss, {postId, at})` → `boss.send(NEWS_PUBLISH, {postId}, { startAfter: at, singletonKey: postId })` (the `cycle-open-alert.ts` `singletonKey`/`schedule` precedent). Register `NEWS_PUBLISH` in `QUEUE_NAMES` — this registry lives in `packages/queue/src/index.ts` (NOT `apps/jobs`), imported into `apps/jobs` via `@twt/queue` (see `cycle-open-alert.ts:31`).
  - [x] The worker: load the post under Pariwar scope, **re-check `status === 'scheduled'`** (idempotent no-op otherwise), transition to `published` + set `published_at`, resolve the audience (`resolveAudienceMemberIds`), build the `alert_published` `Alert` per member, `fanOutAlertToMembers(deps, alertFor, memberIds, pariwarId, now)` on the selected channels. **Crypto-boundary note (from 10.4):** `fanOutAlertToMembers` resolves MEMBER Tier-1 crypto — the jobs worker has the member-field-crypto deps (unlike apps/api's admin-identity path), so the fan-out belongs HERE, not inline in apps/api. The apps/api immediate-`publish` path should enqueue a zero-delay `NEWS_PUBLISH` (or a shared publish-and-fanout helper the jobs worker also calls) rather than calling `fanOutAlertToMembers` with admin-identity keys ([[project_helpdesk_responder_surface_104]] crypto-boundary lesson — do NOT repeat the apps/api decrypt-mismatch trap).
  - [x] Unit-test: the pure `alert_published` builder (`{title, body}` from the post); the idempotent no-op on non-scheduled; the fan-out reuse (not re-implemented). Log-only fixture delivery.
- [x] **Task 6 — RBAC: mint + grant + gate `news.manage`** (`packages/domain/src/rbac/{permissions,roles}.ts`) (AC6)
  - [x] Add `news.manage` to `SEED_PERMISSION_KEYS`, bump `PERMISSION_CATALOG_VERSION` 24 → 25 with a Story-10.5 version-bump ledger comment (pariwar-dimension, the helpdesk.create model; district_admin deferral + acceptance condition documented — enable only if a post gains a server-derived district AND the gate moves to `dimension:'district'`).
  - [x] Grant to `pariwar_admin` (+ super_admin auto; + `media_comms` — the existing comms-authoring role in `roles.ts`, currently unused by any authoring permission; confirm with the PO whether it's included). `district_admin` NOT granted (deferral documented).
  - [x] `tests/rbac/{permissions,roles,check}.test.ts`: catalog v25 / updated length / membership; holders = the granted set + super_admin; a district-ceiling holder DENIED at a pariwar check (revert-sanity pin).
- [x] **Task 7 — Admin UI: the news-blog authoring console** (`apps/admin/src/modules/news-blog/`) (AC1, AC2, AC3, AC7)
  - [x] List: status-filtered paginated post list (`useNewsPosts`) — the 10.4 `helpdesk` queue precedent. Editor: title/body_markdown + hi fields, audience_scope + value, channels multi-select, schedule picker — the `niyamavali-admin` authored-copy precedent (closest analogue). Actions: submit (reviewer pick) / approve (sign-off) / schedule / publish, each gated on status-legality + the identity rules surfaced in the UI (a reviewer≠author affordance).
  - [x] New api-client fns + hooks (`@tanstack/react-query`, cookie-bearing `apiFetch`). New routes `/p/$pariwarId/news` (list) + editor/detail in `router.tsx` (pure `GateView`). Tailwind + `status-*` tokens (NOT Tamagui). Admin `i18n-en.ts` (en-only for admin chrome; the POST copy fields are the bilingual member-facing content, validated in the domain).
  - [x] `apps/public` (Astro): a `public`-audience published blog list + detail page reading `listPublishedPublicPosts` (bilingual), per the existing `apps/public` page/layout conventions + `COMPOSITION-CONTRACT.md`, using the established `getDb`/`withPublicScope` RLS-scoped read pattern (`apps/public/src/lib/db.server.ts`, Story 2.5) already used by `terms.astro`/`niyamavali.astro`.
  - [x] Component/interaction tests (list filter/pagination; editor; submit→approve→schedule/publish flow; author≠reviewer affordance) following the `niyamavali-admin`/`helpdesk` conventions.
- [x] **Task 8 — Tests + gates** (AC8)
  - [x] Domain unit (status legality, author≠reviewer, tone-gate integration, bilingual-required, audience resolution) + live-DB integration (list, transitions+audit, illegal-transition 409, RBAC pair+district pin, publish fan-out fixture) + jobs (scheduled worker fire + idempotent no-op) + contracts (DTO + enum sync-guard) + RBAC (v25) + admin UI + i18n parity.
  - [x] Run full `pnpm ci:local` (`--concurrency=4`, `DATABASE_URL` on :5433). Assert membership-not-counts on shared-DB reads. Confirm all static gates green (the new migration must not trip determinism/journal gates).

### Review Findings

**Decision-needed:** none outstanding — all 4 resolved 2026-07-30 (see Patch/Deferred below).

**Patch:** all 14 applied 2026-07-30 (13 fixed; 1 verified not-an-issue, marked below). Typecheck + lint + the touched suites (domain news-blog 14, domain rbac 125, domain integration news-blog 13, contracts news-blog 11, api integration news-blog 10 (7 orig + 3 new), jobs news-publish 9 (8 orig + 1 new AC8 test), admin news-page 3) all green; domain-invariants/schema-diff/pii-scrape gates + full 18-task `turbo build` green.

- [x] [Review][Patch] Enforce reviewer lock at approve — `approve()` now rejects 403 if `approverActorId !== post.reviewerActorId` (not just `!== authorActorId`); `submitForReview`'s API handler validates `reviewer_id` resolves to a real `news.manage` holder before recording it (via `loadActorGrants` + `rbac.checkPermission`, reusing `NewsPostAuthorReviewerError`). [packages/domain/src/news-blog/write.ts:236-286; apps/api/src/modules/news-blog/handlers.ts submit()] New tests: "only the ASSIGNED reviewer may approve" + "submit rejects a reviewer_id who does not hold news.manage" [apps/api/tests/integration/news-blog/news-blog.spec.ts]
- [x] [Review][Patch] Honor per-post `channels` selection at dispatch — the worker now restricts a member's resolved delivery targets to the post's selected `channels` (`restrictTargetsToChannels`) before calling the shared per-member `fanOutAlert` core directly (not the `fanOutAlertToMembers` batch wrapper, whose signature is unchanged — every other caller unaffected). [apps/jobs/src/scheduler/news-publish.ts]
- [x] [Review][Patch] Fix misleading "cancelled/re-scheduled" comments — corrected in `news-publish.ts`'s header/gate comments and `write.ts`'s `publish()` docstring to state there is no reverse transition; a delayed job only ever finds `scheduled` or already-`published`. [apps/jobs/src/scheduler/news-publish.ts; packages/domain/src/news-blog/write.ts]
- [x] [Review][Patch] Scheduled-then-immediate-publish singletonKey collision — `singletonKey` is now mode-scoped (`"<postId>:scheduled"` / `"<postId>:immediate"`), so the two job kinds no longer dedupe against each other. [apps/api/src/modules/news-blog/queue.ts]
- [x] [Review][Patch] Idempotency gate redesign — the status re-check now decides ONLY whether a transition is needed; fan-out always runs once `published`, gated instead by a per-`(alertId, memberId)` claim in the Story 1.12 keyed store (`newsMemberKey`, claim→send→recordResult/release — the `runContributionNotifyChild` precedent), so a redelivery can neither drop nor duplicate a member's notification. [apps/jobs/src/scheduler/news-publish.ts]
- [x] [Review][Patch] Admin "Schedule" button crash — guarded with a `required` input + an `onSchedule()` early-return on an empty date, so `new Date('')` is never reached. [apps/admin/src/modules/news-blog/NewsPage.tsx]
- [x] [Review][Patch] Public post-detail 404 inert `Location` header — removed; a plain 404 is the intended behavior (comment already said so). [apps/public/src/pages/blog/[postId].astro]
- [x] [Review][Patch] `scheduled_publish_at` future validation — `schedule()` now takes `now` and rejects `at <= now` with a new typed `NewsPostScheduleInPastError` (422 `news.schedule_in_past`), wired through error-mapping. [packages/domain/src/news-blog/{write,errors}.ts; packages/domain/src/index.ts; apps/api/src/modules/news-blog/handlers.ts; apps/api/src/middleware/error-mapping/index.ts] New test: "schedule rejects a scheduled_publish_at at/before now" [apps/api/tests/integration/news-blog/news-blog.spec.ts]
- [x] [Review][Patch] `recordToneReviewSignoff` "unhandled promise" — **verified not an issue**: the function is synchronous (`void`-returning), and internally wraps its own async write in `void writeAuditEntry(...).catch(...)` plus a try/catch around the sync body (`apps/api/src/modules/tone-review/index.ts` `createToneReviewAuditSink.emit`) — there is no promise returned to the call site to leave unhandled. No code change made.
- [x] [Review][Patch] pg-boss job payload IDs now validated through the branded `ids.pariwarId`/`ids.newsPostId` constructors instead of `as`-cast. [apps/jobs/src/scheduler/news-publish.ts]
- [x] [Review][Patch] Admin `onSave()` now calls `loadIntoEditor(updated)` with the server's response, matching `onCreate()`. [apps/admin/src/modules/news-blog/NewsPage.tsx]
- [x] [Review][Patch] Pagination off-by-one at `limit=200` — the handler's requestable cap lowered to 199 (one below the domain accessor's hard 200 ceiling) so the "+1 to detect hasMore" trick is never re-clamped away. [apps/api/src/modules/news-blog/handlers.ts]
- [x] [Review][Patch] Push-body truncation now splits on Unicode code points (`Array.from` + `truncatePushBody`), not UTF-16 code units — a surrogate pair can no longer be bisected. [apps/jobs/src/scheduler/news-publish.ts]
- [x] [Review][Patch] AC8 test-coverage gap closed — a new live-DB test seeds a real `active` member (self-contained insert, plus a fully-populated fake-KMS `ContributionNotifyDeps`) and asserts `resolveAudienceMemberIds` + the per-member `resolveMemberDeliveryContext`/`fanOutAlert` path actually run against a non-empty audience (previously every case used an empty audience by construction). [apps/jobs/tests/news-publish.test.ts]

**Deferred:**

- [x] [Review][Defer] `members-all` audience resolution uses a raw `members.state` scan instead of the validity-cache predicate [packages/domain/src/news-blog/audience.ts] — deferred: no bulk validity-cache resolver exists anywhere in the codebase today; building one is a real infrastructure project, not a local patch. Re-trigger when a bulk resolver lands or a correctness gap is observed.
- [x] [Review][Defer] Single-admin Pariwar can never submit/approve any post (author≠reviewer + `news.manage` granted only to `pariwar_admin`) [packages/domain/src/rbac/roles.ts] — deferred, pre-existing (direct consequence of a PO-ratified decision, 2026-07-30: `media_comms` deliberately kept dormant)
- [x] [Review][Defer] Public blog list (`apps/public/src/pages/blog.astro`) is hard-capped at 50 published posts with no pagination UI [apps/public/src/pages/blog.astro] — deferred, not required by any AC; reasonable v1 limitation

## Dev Notes

### This is a composition over shipped substrates — the single most important fact

You are NOT building a new event-sourced primitive. `alert_published` (`{title,body}`, deep-linking to `announcements/:alert_id`) and the live `fanOutAlertToMembers` dispatch composition **already exist and already work** — the cycle-open announcement uses them today (`contribution-notify-triggers.ts`). The tone-review gate **already exists** as a pure evaluator (`tone-review/gate.ts`). Story 1.10 audit + Story 1.8 RBAC **already exist**. 10.5 adds a `news_posts` table, a thin workflow module, one RBAC key, one pg-boss worker, and two UIs (admin authoring + public read) — and wires them to the substrates above. If you find yourself designing a projector / state-writer trigger / events_log stream for posts, STOP — Decision 1 says posts are a mutable-column workflow, not event-derived-state.

### Reuse `alert_published` verbatim — do NOT mint a new alert category

The channel dispatch on publish is the `alert_published` `Alert` variant (`packages/contracts/src/alerts/alert.ts:112` — `{ title: z.string().min(1), body: z.string().min(1) }`), exactly as the epics says ("category `alert_published` re-purposed for general announcements"). The producer fills `title`/`body` with the post's locale-correct copy (render stays a pure function of the payload — the `deadline_display`/`period_label` producer-owns-copy discipline). The deep-link is already `announcements/:alert_id` (`deep-link.ts:86`). No new category, no new deep-link, no new mobile screen — the member lands on the existing `announcements` surface.

### The channel set is `push | whatsapp | sms | telegram` — the epics is wrong

`packages/domain/src/notifications/delivery.ts:46` is authoritative: `'push' | 'whatsapp' | 'sms' | 'telegram'`. The epics' `in_app | wa | sms | email` is drift — `in_app` = `push`, `wa` = `whatsapp`, there is **no `email` channel**, and there **is** a `telegram` channel. Model `channels` on the real set. Note the substitution in the Dev Agent Record (the [[project_mmkv_asyncstorage_equivalent]] "note-the-substitution" discipline). Providers are unwired ⇒ v1 delivery is a **log-only fixture** on every channel ([[project_channels_no_live_dispatch_yet]] is RETIRED — live dispatch exists, but the vendor legs are stubs).

### tone-review: you are the SECOND consumer (after 2.4) — persist + inject, don't re-implement the gate

`evaluateToneReviewGate` is PURE and default-deny (missing/author-authored/wrong-resource sign-off → deny). Its header: "the consuming surface owns where that record is persisted and how it is resolved." So 10.5 persists a `ToneReviewSignoff` (`reviewedBy`, `resourceLocator = news:post:<postId>`, `contentHash = sha256` of the reviewed body — NEVER the raw copy) at `approve`, and injects it. Reuse the apps/api adapter shape (`apps/api/src/modules/tone-review/index.ts`): the `recordToneReviewSignoff`/`requireToneReviewSignoff` helpers (there's no separate signoff-object constructor — these functions ARE the reusable surface), the `createHash`/`sha256Hex` content-hash, the dedicated `ToneReviewAuditSink` (`tone_review.signoff` — NOT the auth taxonomy, no raw copy in the audit). The `contentHash` binds the sign-off to the reviewed copy: a post edited after approval needs a fresh sign-off (an edit invalidates the old hash). See `packages/domain/src/niyamavali/drafts.ts` for the 2.4 resolver precedent.

### author ≠ reviewer is IDENTITY, at the API — not a second RBAC key

Both author and reviewer hold `news.manage`. The fairness rule is `reviewer_id != author_id` on submit and `approver != author` on approve — an actor-id compare in the handler, returning 403 (Decision 2). This is NOT modeled as separate `news.author`/`news.review` capabilities. Keep the RBAC surface to ONE key.

### Audience: only `members-all` + `public` are fully wireable today (Decision 4)

The `members` table (`schema/members.ts`) carries `member_id`, `pariwar_id`, `state` (LIFECYCLE — `pending-kyc`/`active`/`lapsed-unpaid`/…, NOT geography), `state_event_version`, `lock_in_days_at_join`, timestamps. There is **no district / geographic-state / designation / cohort column**. So:
- `members-all` → the active/in-grace member set for the Pariwar. Do NOT hand-roll a `.select(members).where(eq(state,'active'))` — reuse the project's active/validity predicate (grep for the member "active-in-grace"/validity helper the dispatch fan-outs already use; the [[project_assignability_predicate_is_isvalid_only]] and validity-cache reads are the canonical "who counts as active" source). Membership-not-counts in tests.
- `public` → `[]` (no push; renders on `apps/public`).
- `state` / `role` / `cohort` → stored + rendered + they DRIVE the bilingual requirement, but their dispatch selector is `[]` + a logged seam note. There is no member attribute to select on; fabricating one collides with Epic-3 geo ([[project_rbac_geo_scope_containment]]: "no geo-tree resolver until Epic 3 — resolve only what exists"). This is a deliberate, documented seam, not an omission.

### Scheduled publish: native pg-boss delay + idempotent status re-check

`boss.send(NEWS_PUBLISH, {postId}, { startAfter: scheduledPublishAt, singletonKey: postId })` — pg-boss natively delays until `startAfter` (the refinement `contribution-notify.ts:46` flags as available; use it). `singletonKey = postId` dedupes re-schedules. The worker MUST re-check `status === 'scheduled'` before publishing (a post cancelled or re-scheduled between enqueue and fire is a clean no-op) — this is the idempotency spine, since the delayed job can't be un-sent. The `cycle-open-alert.ts` (`boss.schedule` + `singletonKey`) composition is the in-repo precedent. An immediate `publish` reuses the same publish-and-fan-out helper (enqueue a zero-delay job, or a shared function the worker calls) — see the crypto-boundary note in Task 5.

### Crypto-boundary: the fan-out lives in apps/jobs, NOT inline in apps/api

10.4's load-bearing lesson ([[project_helpdesk_responder_surface_104]]): `fanOutAlertToMembers` resolves MEMBER Tier-1 field crypto, but apps/api's request path carries ADMIN-identity keys — wiring the member-targeting fan-out into an apps/api handler is a **decrypt-mismatch bug**. apps/jobs has the member-field-crypto deps. So the publish fan-out belongs in the `apps/jobs` worker (Task 5); the apps/api `publish` handler enqueues the (zero-delay) publish job rather than calling `fanOutAlertToMembers` itself. Do not repeat the trap the 10.4 review flagged (AI-Review HIGH, `apps/api/src/deps.ts:326`).

### Admin app stack facts (don't re-derive — from 10.3/10.4)

- **Routing:** TanStack Router, code-based tree in `apps/admin/src/router.tsx` (add `/p/$pariwarId/news` + editor/detail as `createRoute` children).
- **Session gate:** pure `GateView` (`useSession()` → loading/error(→`/login`)/success); the SERVER permission hook is the real boundary.
- **API client:** hand-written `apiFetch` (`api/client.ts`), same-origin **cookie-bearing** (admin session is a cookie), schema-validated. Hooks via `@tanstack/react-query`.
- **Styling:** Tailwind + `status-*` tokens (NOT Tamagui — that's mobile). Admin i18n = per-module `i18n-en.ts` `resolveEn` (en-only for chrome); the POST's own bilingual copy is member-facing content validated in the domain.
- **Closest UI precedent = `apps/admin/src/modules/niyamavali-admin/`** (authored copy + review/publish workflow — the nearest analogue to news authoring). Also the 10.4 `helpdesk` queue/detail for list+detail conventions. Do NOT cross news with an unrelated module ([[project_story_validate_footguns]] UI-misattribution trap). Note: `architecture.md`'s aspirational tree names this module `news-blog-author/`; this story uses `news-blog/` for parity with the `apps/api/src/modules/news-blog/` name — consistent with existing precedent of admin module names diverging from the architecture doc's original sketch (e.g. `audit-explorer`→`audit-integrity`, `verifier`→`claim-verification`).

### Public surface = `apps/public` (Astro), NOT `apps/web`

There is no `apps/web`. `apps/public` is the Astro public site (`pages/`, `layouts/`, `lib/`, a `COMPOSITION-CONTRACT.md`). The `public`-audience blog renders there, unauthenticated (FR-74 public matrix: "public Blog" is in the no-auth column). The read path is already established — `apps/public/src/lib/db.server.ts` exports `getDb`/`withPublicScope`, an RLS-scoped read-only tx (`SET LOCAL ROLE twt_app`, Story 2.5), and is already used by `terms.astro` and `niyamavali.astro`. Wire the news list/detail pages through that same helper; there is no open question to resolve here.

### Event-name / no-new-vocabulary discipline

There is no `news.*` event vocabulary and there should not be one (Decision 1 — posts aren't event-sourced). The ONLY dotted names 10.5 touches are the audit event types for the transitions (Story 1.10 audit taxonomy — follow the existing audit-entry convention, e.g. `news.published`/`news.approved` as audit actions, NOT `events_log` domain events) and the reused `alert_published` category. Do NOT add anything to `packages/events/src/registry.ts` ([[project_contribution_event_name_contract]] is about the contribution family; news has no events_log stream).

### Testing standards summary

- Live-DB: `twt-test-pg` :5433; own-committing writers accumulate → **assert membership, not counts** ([[project_live_db_test_gotchas]], [[project_known_livedb_test_failures]]); never `DROP SCHEMA` / never regenerate an applied migration (0085 is new — journal it correctly).
- **RBAC revert-sanity** ([[project_gate_scope_semantic_coverage]] discipline): the 403-without / 200-with pair must be a real pair (removing the grant flips a test) + the `district_admin`-denied pin.
- Merge gate = `pnpm ci:local` (`--concurrency=4`, integration needs `DATABASE_URL` on :5433) — ADR-0017 ratified as the primary sanctioned gate; a same-day ADR-0036 GitHub-Actions-reinstatement attempt was reverted 2026-07-30, so a cloud CI run is NOT a substitute — run `ci:local` before pushing and treat it as the real gate ([[project_ci_actions_suspension_local_mirror]], [[project_ci_local_concurrency_oversubscription]]).
- New/changed `.strict()` contracts + newly-gated routes: return the body, never `void reply.status(N).send()` ([[project_fastify_onsend_doublesend]]).
- Domain dynamic `.limit()` → `clampLimit(...)` ([[project_domain_limit_clamp_and_savepoint_retry]]) — the list read's pagination.
- ESLint per-package (`pnpm --filter <pkg> lint`); carve-outs use cwd-relative role globs ([[project_eslint_config_per_package_cwd]]).
- Story-validate footguns: domain-camelCase (`bodyMarkdown`/`scheduledPublishAt`/`audienceScope`) vs contracts-snake_case (`body_markdown`/`scheduled_publish_at`/`audience_scope`) drift; JSONB/`text[]` handling for `channels`; UI-component misattribution ([[project_story_validate_footguns]]).
- Contracts must not import `@twt/domain`'s pg-touching namespaces ([[project_contracts_domain_bundle_boundary]]) — the enum sync-guard is a TEST-only cross-import.

### Project Structure Notes

- **NEW paths:** `packages/domain/src/schema/news_posts.ts`, `packages/domain/migrations/0085_news-blog-posts.sql`, `packages/domain/src/news-blog/{status,write,read,audience,index}.ts`, `packages/contracts/src/news-blog/`, `apps/api/src/modules/news-blog/{routes,handlers}.ts`, `apps/jobs/src/scheduler/news-publish.ts`, `apps/admin/src/modules/news-blog/` + `router.tsx` routes + `api/{client,hooks}`, `apps/public/src/pages/` (blog list+detail).
- **EXTEND (not new):** `packages/domain/src/rbac/{permissions,roles}.ts` (mint+grant `news.manage`), `packages/domain/src/index.ts` (barrel), `scripts/emit-openapi.ts` + `openapi/v1.yaml`, `packages/queue/src/index.ts` `QUEUE_NAMES` (register `NEWS_PUBLISH`; imported into `apps/jobs` via `@twt/queue`, NOT a file under `apps/jobs`), `packages/i18n/locales/{en,hi}/` (any new member-facing strings).
- **Epics-prose drift (do NOT follow literally):** channels are `push|whatsapp|sms|telegram` not `in_app|wa|sms|email` (no email; telegram exists); the public surface is `apps/public` (Astro), not `apps/web` (which does not exist). The member surface being the `announcements` push landing rather than a new "member feed" screen is this story's working assumption but is **Decision 5, UNCONFIRMED** — see Load-Bearing Decisions.
- **NO event-derived-state** for posts (Decision 1) — no projector, no state-writer trigger, no CI state-invariant gate, no `events_log` stream, no `packages/events` registration.

### References

- [Source: epics.md#Story 10.5] — News/Blog dual surface: post fields (title/body_markdown/audience_scope/scheduled_publish_at/channels[]/author_actor_id/reviewer_actor_id/status), author≠reviewer at the API (submit_for_review + approve reject self), tone-review sign-off before approval, scheduled publish via pg-boss, channel dispatch via Story 5.1 category `alert_published`.
- [Source: epics.md#FR-51] — News/Blog dual surface (public + member feed), `draft→review→publish` author≠reviewer, audience `public|members-all|state|role|cohort`, scheduled publishing, per-post channel selection, comments disabled by default, Hindi+English required for public/members-all.
- [Source: epics.md#Epic 10 demoable closure] — "Trustee schedules a state-scoped News/Blog post; auto-publishes at scheduled time with audience-scoped rendering."
- [Source: epics.md#FR-74] — public-vs-private matrix: "public Blog" is in the no-auth public column.
- [Source: packages/contracts/src/alerts/alert.ts:44-55,112] — the `alert_published` category + `{title,body}` payload (the reused notification variant).
- [Source: packages/contracts/src/deep-links/deep-link.ts:41,86-89] — `alert_published` → `announcements/:alert_id` (already wired member landing).
- [Source: apps/jobs/src/scheduler/contribution-notify.ts:426 fanOutAlertToMembers] — the shipped live dispatch composition to reuse for the publish fan-out.
- [Source: apps/jobs/src/scheduler/contribution-notify-triggers.ts] — the `alert_published` cycle-open producer (the pattern for building + fanning out an `alert_published` alert).
- [Source: apps/jobs/src/scheduler/cycle-open-alert.ts:96,114,287] — `boss.schedule`/`boss.send` + `singletonKey` + at-least-once — the scheduled-publish worker precedent.
- [Source: packages/domain/src/tone-review/gate.ts] — the PURE `evaluateToneReviewGate` (default-deny; consumer owns persistence) — the approval gate.
- [Source: apps/api/src/modules/tone-review/index.ts] — the tone-review Fastify adapter: `recordToneReviewSignoff`/`requireToneReviewSignoff` helpers, `contentHash`, the dedicated `ToneReviewAuditSink` (`tone_review.signoff`).
- [Source: packages/domain/src/niyamavali/drafts.ts] — the Story 2.4 sign-off persistence/resolver precedent (the first tone-review consumer).
- [Source: packages/domain/src/notifications/delivery.ts:46] — the AUTHORITATIVE channel set `push|whatsapp|sms|telegram` (epics' `in_app|wa|sms|email` is drift).
- [Source: packages/domain/src/schema/members.ts] — members carry only `state` (lifecycle) + `pariwar_id`; NO district/designation/cohort attribute → audience `state/role/cohort` dispatch is a seam (Decision 4).
- [Source: packages/domain/src/rbac/{permissions.ts (catalog v24), roles.ts}] — mint `news.manage` v24→25, pariwar-dimension; grant to the authoring roles; district_admin deferral ([[project_rbac_geo_scope_containment]]).
- [Source: implementation-artifacts/10-4-helpdesk-admin-console-sla-tracking-cross-link-integration.md] — the crypto-boundary lesson (fan-out belongs in apps/jobs, not apps/api), the `nextTicketState`/`nextPostStatus` API-guards-illegality pattern, the RBAC single-key mint+grant+district-defer precedent, the log-only-fixture dispatch reality.
- [Source: apps/admin/src/modules/niyamavali-admin/] — the closest admin UI analogue (authored copy + review/publish workflow). [Source: apps/admin/src/modules/helpdesk/] — list+detail console conventions.
- [Source: apps/public/ (Astro: pages/layouts/lib + COMPOSITION-CONTRACT.md)] — the public blog render home. [Source: apps/public/src/lib/db.server.ts] — the established `getDb`/`withPublicScope` RLS-scoped read pattern (Story 2.5), already used by `terms.astro`/`niyamavali.astro`.
- [Source: packages/queue/src/index.ts] — `QUEUE_NAMES` registry (register `NEWS_PUBLISH` here, imported into `apps/jobs` via `@twt/queue`).
- [Source: packages/domain/src/rbac/roles.ts] — `media_comms` is the codebase's one existing comms-authoring role, currently unused by any authoring permission (candidate `news.manage` grantee alongside `pariwar_admin`; confirm with PO).
- [Source: architecture.md#4225] — `apps/mobile/app/p/[pariwarId]/news/` reserved as "FR-51 member news feed," not yet deprecated (Decision 5, UNCONFIRMED).
- [Source: architecture.md#4325-4327 modules tree] — `news-blog/` module home (FR-51); `apps/jobs/scheduler` the worker home. [Source: architecture.md#3.4] — the channel-provider dispatcher.

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (bmad-create-story workflow); claude-sonnet-5 (bmad-dev-story implementation)

### Debug Log References

- Domain unit + live-DB integration: `pnpm --filter @twt/domain exec vitest run tests/news-blog tests/integration/news-blog` — 14 unit + 13 live-DB green.
- Contracts sync-guard: `pnpm --filter @twt/contracts exec vitest run tests/news-blog.test.ts` — 11 green; full contracts suite 687 green.
- RBAC v25: `pnpm --filter @twt/domain exec vitest run tests/rbac` — 125 green.
- API E2E: `pnpm --filter @twt/api exec vitest run tests/integration/news-blog` — 7 green.
- Jobs worker: `pnpm --filter @twt/jobs exec vitest run tests/news-publish.test.ts` — 8 green.
- Admin UI: `pnpm --filter @twt/admin exec vitest run tests/news-page.test.tsx` — 3 green.
- Gates: openapi determinism, domain-accessor-invariants, schema-diff, pii-scrape all green; migration 0085 journalled (idx 85) without tripping the determinism/journal gate.

### Completion Notes List

**PO decisions applied (2026-07-30):** (1) `news.manage` granted to `pariwar_admin` only (+ super_admin auto) — `media_comms` stays dormant per PO. (2) No dedicated mobile `news/` feed screen — the `alert_published → announcements/:alert_id` push landing is the v1 member surface (Decision 5 resolved to the announcements landing).

**Load-Bearing Decisions implemented as ratified:**
- D1 — `news_posts.status` is a PLAIN mutable pgEnum column (NO projector / state-writer trigger / CI state-invariant gate / events_log stream). Migration 0085 deliberately omits any trigger.
- D2 — ONE `news.manage` key; author≠reviewer is an IDENTITY check in the domain write path (403), NOT a capability split.
- D3 — tone-review sign-off folded onto the post row (`tone_signoff_content_hash` + `tone_signoff_reviewed_at`), content-hash-bound to the reviewed body (an edit invalidates it). Recorded at `approve` via the dedicated `ToneReviewAuditSink` (`tone_review.signoff`, no raw copy).
- D4 — `members-all` (active/in-grace) + `public` (empty set) fully wired; `state`/`role`/`cohort` stored + rendered + drive the bilingual requirement, dispatch selector is a logged seam (`resolveAudienceMemberIds` returns `[]` + a note).

**Epics-drift corrections (as flagged):** channels modelled on the REAL delivery set `push|whatsapp|sms|telegram` (no `email`, has `telegram` — delivery.ts:46); public surface is `apps/public` (Astro `blog.astro` + `blog/[postId].astro`), not `apps/web`. Noted the substitution per [[project_mmkv_asyncstorage_equivalent]] discipline.

**Crypto-boundary (10.4 lesson honored):** the audience fan-out lives in the apps/jobs `NEWS_PUBLISH` worker (member Tier-1 crypto), NEVER inline in apps/api. `schedule` enqueues a DELAYED job (`startAfter`, `mode:'scheduled'` — worker transitions scheduled→published then fans out, idempotent no-op unless still `scheduled`); immediate `publish` transitions synchronously in apps/api then enqueues a zero-delay `mode:'immediate'` job (worker fans out only). `singletonKey = post_id`. Deterministic UUIDv5 `alert_id` from the post id.

**Public read served by apps/public, not apps/api** — the two `/public/news` OpenAPI paths were intentionally NOT registered on the apps/api surface (apps/public reads the DB directly via `getDb`/`withPublicScope`, Story 2.5). The `PublicPostResponse`/`PublicPostListResponse` contract DTOs still exist for apps/public typing.

**Public body render:** the markdown body renders as ESCAPED pre-wrapped text (Astro auto-escapes) — no raw HTML reaches the page. A full sanitised markdown→HTML renderer is a documented follow-on.

**Push copy locale:** v1 uses the post's English title/body for the push teaser; per-member Hindi localization of the PUSH copy is a documented seam (the post's own hi copy still drives the public/member SURFACE render + the bilingual submit/approve requirement).

**Providers unwired ⇒ log-only fixture delivery** on every channel ([[project_channels_no_live_dispatch_yet]] retired — live dispatch exists, vendor legs are stubs). The emit + fan-out wiring is the deliverable.

**`pnpm ci:local` gate — full analysis (honest, per [[feedback_record_unattested_no_backfill]]):** the story's OWN suites + ALL 18 static gates are GREEN, and `test (unit)` passed green on a fresh DB. Two residual full-parallel `ci:local` failure classes were investigated and proven NOT to be this story's regressions:
- (a) *Three count-assertion specs* (`cross-pariwar-leak`, `active-contribution-read`, `rls/policy-regression`) failed only when the local `ci:local` ran integration specs TWICE (the unit `test` phase + the `integration-tests` phase against the same persistent DB, because `DATABASE_URL` was exported globally) — the unit phase's own-committing `claim.*`/`member.*` tests polluted PARIWAR_A's `events_log`/`alerts`, breaking a `toHaveLength(1)` on an accumulating table. On a fresh-DB SINGLE pass (the real CI `integration-tests` job shape) all three PASS. News is NOT event-sourced (zero `news.*` events; verified via `SELECT ... events_log WHERE pariwar_id=A`), so my code contributes ZERO to this pollution.
- (b) *Three heavy claim E2E suites* (`verifier-decision`, `appeal`, `dpdpa-consent`) timed out near 28–30s under `--concurrency=4` contention (all 8 packages running); in ISOLATION they pass 44/44 in 4.87s ([[project_ci_local_concurrency_oversubscription]] — the known oversubscription flake; I never touched claim code).
Evidence: `test(unit)` green; all gates green; the 3 count specs green on a fresh-DB single pass; the 3 claim specs green in isolation; every story-specific suite green (domain 14+13, contracts 11 (+687 full), rbac 125, api 7 E2E, jobs 8 pure+live, admin 3). No invariant gate (member/claim/pool/alert/helpdesk state-writer) flags `news_posts` — the ratified Decision-1 "not event-derived-state" posture holds mechanically.

### File List

**NEW**
- `packages/domain/src/schema/news_posts.ts`
- `packages/domain/migrations/0085_news-blog-posts.sql`
- `packages/domain/src/news-blog/{status,write,read,audience,errors,index}.ts`
- `packages/domain/tests/news-blog/{status,write-pure}.test.ts`
- `packages/domain/tests/integration/news-blog/news-blog.spec.ts`
- `packages/contracts/src/news-blog/{enums,dto,index}.ts`
- `packages/contracts/tests/news-blog.test.ts`
- `apps/api/src/modules/news-blog/{handlers,routes,index,queue}.ts`
- `apps/api/tests/integration/news-blog/news-blog.spec.ts`
- `apps/jobs/src/scheduler/news-publish.ts`
- `apps/jobs/tests/news-publish.test.ts`
- `apps/admin/src/modules/news-blog/{NewsPage.tsx,derive.ts,i18n-en.ts}`
- `apps/admin/src/routes/NewsRoute.tsx`
- `apps/admin/tests/news-page.test.tsx`
- `apps/public/src/pages/blog.astro`
- `apps/public/src/pages/blog/[postId].astro`

**MODIFIED**
- `packages/domain/src/ids/index.ts` (+ `NewsPostId` brand)
- `packages/domain/src/schema/index.ts` (barrel: news_posts)
- `packages/domain/src/index.ts` (barrel: `newsBlog` namespace + typed errors)
- `packages/domain/migrations/meta/_journal.json` (+ idx 85)
- `packages/domain/src/rbac/permissions.ts` (mint `news.manage`, catalog v24→25)
- `packages/domain/src/rbac/roles.ts` (grant to `pariwar_admin`)
- `packages/domain/tests/rbac/{permissions,roles,check}.test.ts` (v25 + grant + district pin)
- `packages/contracts/src/index.ts` (barrel: news-blog)
- `packages/contracts/scripts/emit-openapi.ts` (8 admin news paths) + `openapi/v1.yaml` (regenerated)
- `packages/queue/src/index.ts` (+ `NEWS_PUBLISH` queue name)
- `apps/api/src/context.ts` (+ `NewsPublishEnqueuer` + `newsPublishQueue`)
- `apps/api/src/deps.ts` (wire the pg-boss news enqueuer)
- `apps/api/src/server.ts` (register the news module)
- `apps/api/src/middleware/error-mapping/index.ts` (map the 4 news typed errors)
- `apps/api/tests/integration/_setup.ts` (+ `CapturingNewsPublishQueue`)
- `apps/jobs/src/boot.ts` (register the `NEWS_PUBLISH` worker)
- `apps/admin/src/api/{client,hooks}.ts` (news client fns + query hooks)
- `apps/admin/src/router.tsx` (+ `/p/$pariwarId/news` route)

## Change Log

| Date | Change |
|---|---|
| 2026-07-30 | Story 10.5 implemented (bmad-dev-story). Domain `news_posts` mutable-status workflow + migration 0085 (no state-writer trigger, D1); `news-blog` module (write/read/audience) reusing the tone-review gate; contracts DTOs + enum sync-guard + openapi regen; apps/api admin routes (news.manage gate, author≠reviewer 403, tone-gate at approve, illegal-transition 409, bilingual 422) + error-mapping; apps/jobs `NEWS_PUBLISH` worker (scheduled + immediate publish + `fanOutAlertToMembers` reuse, crypto boundary in jobs); RBAC `news.manage` v24→25 (pariwar_admin only; media_comms + district_admin deferred); admin authoring console (list/editor/actions) + apps/public Astro blog list+detail. PO decisions: pariwar_admin-only grant, announcements landing (no mobile feed screen). All targeted suites green. |
