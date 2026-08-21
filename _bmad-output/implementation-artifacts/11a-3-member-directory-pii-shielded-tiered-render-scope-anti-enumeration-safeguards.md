---
baseline_commit: 1bc46e01da11e3f7688c0ce977acf1cb10d4cf87
---

# Story 11a.3: Member Directory PII-Shielded — Tiered Render Scope + Anti-Enumeration Safeguards `[SURFACE]`

Status: done

> ✅ **CODE REVIEW PASS COMPLETE (2026-08-21). BOTH OUTSTANDING ITEMS NOW CLOSED.** See §Review
> Findings under Tasks/Subtasks for the full record.
>
> ✅ **Live-DB verification — RAN, GREEN.** Against `twt-test-pg` (:5433), migration `0111`
> applied cleanly (no `42P07`); `pg_class` confirms `relrowsecurity`/`relforcerowsecurity` both
> `true` on `pariwar_directory_publication`. `directory-publication-policy.spec.ts`: 16/16.
> `member-directory.spec.ts`: 11/11 (including the 3 new kill-switch tests). Full live-DB
> regression: `@twt/domain` 3044/3045 (254/254 files, 1 pre-existing skip), `@twt/api` 1051/1052
> (122/122 files, 1 pre-existing skip) — zero failures either package.
>
> ✅ **"Branch bundles unrelated Story 11a.4 authoring work" — CLOSED BY EDIT (2026-08-21).** This
> branch's history was corrected: the 11a-4 story file and its `sprint-status.yaml` row never land
> on `story/11a.3` at all now (`440bde6` was rewritten to carry only 11a.3's own record). 11a.4's
> `bmad-create-story` output lives on its own `story/11a.4-phone-email-obfuscation` branch off
> `main`, in its own `chore(11a.4): story record + sprint-status → ready-for-dev` commit — a git
> action, not a code edit, and not part of this diff.
>
> ✅ **BASELINE IS CLEAN AND ON `main`.** `HEAD == origin/main == 1bc46e0` — verified by
> `git fetch origin` at authoring time ([[feedback_git_fetch_before_remote_reasoning]]). Story 11a.2
> is **merged**, not merely `done`. Branch off `main`; re-`fetch` before you branch.
>
> ✅ **ALL SIX DECISIONS (D1–D6) RULED BY BIGDEV, 2026-08-20 — each as recommended. Nothing here
> is open.** They are recorded in §Decisions. They were **raised rather than assumed** because D1
> decides whether the internet-facing SSR process gets KMS decrypt capability over Tier-1 PII, and
> guessing a directory question is the exact **SD-1** failure mode (`2026-08-19-132` cl.7). ⛔ The dev
> agent must **not** re-open or re-interpret a ruling; a ruling is superseded, never re-read
> ([[feedback_supersede_never_reinterpret]]) — if one looks wrong once the code is in front of you,
> **stop and raise it**, ⛔ never silently deviate.
> ⚠ **This ruling has no independent record yet** — no `.decision-log.md` entry exists for it; this
> story file and the sprint-status ledger comment are the only trace, both written in the same
> authoring pass. **Task 1's decision-log commit (`2026-08-20-143`) is what makes it durable
> governance-of-record** — treat it as a **non-optional precondition**, not a formality
> ([[feedback_record_unattested_no_backfill]], [[feedback_governance_commits_precede_implementation]]).
>
> ⭐ **THIS IS THE STORY THE LAUNCH-BLOCKING CLAUSE WAS WRITTEN ABOUT.** `2026-08-19-136` clause 4:
> the tier-leak CI leg **must be operative before the Member Directory ships**. It is *armed* (11a.1)
> but **EMPTY on `member-directory`** (11a.2) — `membersSurfaceFieldIds(model)` returns `[]`, so today's
> green check on the flagship surface proves *"renders no classified field"*, ⛔ **not** *"the
> directory is policed"*. **This story is what makes it real.** ⛔ Nothing here may ship a member row
> while that leg still evaluates nothing.
>
> **Depends on (all `done` + merged):** **11a.2** (`/members`, `<MatrixField>`, `matrix.server.ts`,
> `parsePageParams`, `<AuthenticatedFragment>`, the `cache_policy` + `pagination_binding` gate legs) ·
> **11a.1** (the populated matrix, `getVisibility()`, `deriveFieldIds`, `resolvePublicMemberName`,
> the presentation-policy substrate, the escalation ledger) · 2.5 (the Astro shell, `withPublicScope`)
> · 1.14 (`@fastify/rate-limit` + `namedRateLimits` + honeypots + `X-Robots-Tag` + the forced-pagination
> guard that walks the OpenAPI surface) · 1.10 (the §1.5 hash-chain audit writer) · 1.8 (RBAC) ·
> 1.5 (Tier-1 envelope + KMS) · 3.9 (`member_postings` → district) · 10.20 (moderation status).

---

## Story

As any visitor to the Member Directory,
I want a paginated directory rendered at my visibility tier with **anti-enumeration safeguards that
actually run**, so that the directory supports institutional legitimacy and trust verification
without becoming a social-network discovery tool, a harvesting target, or a social-graph mapping
surface —
and so that the flagship public surface stops being policed by a **green check that evaluates
nothing**.

---

## 🎯 What is actually true today — verified, not inherited

Every claim was checked against the tree at `1bc46e0`.

| Claim | Verified state |
|---|---|
| `/members` ships and renders | ✅ `apps/public/src/pages/members.astro` — shell + FR-91 pagination controls + a not-yet-published empty state. ⛔ **Zero member data.** |
| The `member-directory` tier-leak leg has teeth | ⛔ **NO.** `MEMBERS_FIELD_IDS` maps **every** key to `null`, so `membersSurfaceFieldIds(model)` returns `[]` and `evaluateSnapshot` evaluates nothing. A test *asserts the set is empty*. |
| The matrix declares the directory's fields | ✅ Exactly **two**: `member_name` (tier `public`, `pii_tier: 1`, carrying the **one** ruled `tier1_public_exception` + `presentation_policy_ref`) and `district` (tier `public`, `pii_tier: 3`). ⛔ No `member_status` row exists. |
| `resolvePublicMemberName(mode, storedName)` exists | ✅ `packages/domain/src/kyc/public-name.ts` — pure, over an **already-decrypted** name. ⛔ **No PRODUCTION call site** (≈15 call sites in `packages/domain/tests/`, none in `apps/`). This story is its first consumer. |
| `resolvePublicNamePresentationMode(db, pariwarId)` exists | ✅ `packages/domain/src/kyc/presentation-policy.ts` — reads `pariwar_public_name_presentation`, defaults `full_name` (⛔ **not** fail-closed; argued at `public-name.ts`). |
| `<MatrixField>` has a call site | ⛔ **NO — zero, anywhere.** Recorded as a verified finding at `.decision-log.md#2026-08-20-142`. **This story is its first consumer**, and that is a named follow-up, not a nicety. |
| A member-directory roster read exists in `@twt/domain` | ⛔ **NO.** `packages/domain/src/member/` has `listMemberIdsForPariwar` + `listMemberStatesForPariwar` (both **unbounded**, whole-Pariwar, no `limit`) and `searchMembers` (4.7, admin, returns **ciphertext as stored**). ⛔ None of them is a directory read. |
| A **set-based** cohort district read exists | ✅ **YES — THREE, and they are the shape to copy.** `surveys/read.ts:303-316`, `news-blog/audience.ts:163-171` and `banners/audience.ts` each resolve latest-posting district for a **whole member cohort in ONE query** via a correlated subquery. ⛔ The per-member `getMemberPostingLatest` is **not** the only reader — see **Trap 6**. |
| The latest-posting tie-break is a **committed cross-implementation rule** | ✅ **`ORDER BY created_at DESC, posting_id DESC` (the "D3 rule")**, carrying an explicit *"Change one, check the other"* at `member-geo/resolve.ts:33,41,60,92` · `surveys/read.ts:296,311` · `news-blog/audience.ts:145,168` · `claim/peer-mesh-read.ts:83-88` · `member/posting.ts:120`. ⛔ **`created_at DESC` alone is NOT the rule** — see **Trap 6a**. |
| `apps/public` can decrypt Tier-1 | ⛔ **NO, and this is load-bearing.** `decryptKycField` needs `FieldCryptoDeps { kms, kekRef, hmacKeyRef }`; `apps/public/package.json` has no KMS wiring and `apps/public/src/lib/` has no `deps` module. |
| `apps/public` can write an audit line | ⛔ **NO.** `writeAuditEntry` takes the **BYPASSRLS service pool**; `apps/public`'s pool runs `SET LOCAL ROLE twt_app`, and *"tenants never reach this code (twt_app has no INSERT grant)"* (`audit/write.ts:1-11`). |
| `apps/public` can rate-limit | ⛔ **NO.** No Fastify, no `@fastify/rate-limit`, no store (§1.4: no Redis). |
| An audit line can **carry the query context** | ⛔ **NO — and this bounds AC6.4.** `audit_log_entries` has **no context/payload column** (`schema/audit_log_entries.ts:66-123`) — only `request_payload_hash`. `authEventToAuditInput` **hashes** `event.context` into that digest and hard-codes `resourceLocator: user:${actorId ?? 'anonymous'}`. ⇒ an abuse line is a **counter, not a forensic record**. Read **Trap 8**. |
| The audit event-type union is open | ⛔ **NO.** `AuthAuditEventType` (`apps/api/src/audit/audit-sink.ts:15`) is documented *"The closed set"*. A new abuse action **must be minted there** plus a `statusForAuthEvent` mapping. ⛔ Read **Trap 8** before reaching for `abuse.honeypot`. |
| `apps/public` can read the visitor IP | ✅ `Astro.clientAddress` (Astro 6.4.8 + `@astrojs/node` 10.1.4, `mode: 'standalone'`). ⚠ Read **Trap 3** before using it. |
| `apps/api` has the safeguards already | ✅ `namedRateLimits(deps).search` (per-session-or-IP), the global `onExceeded` → `rate_limit.exceeded` audit emit with per-key-per-window dedupe, `trustProxy: true`, `X-Robots-Tag` on **every** response, honeypots emitting `abuse.honeypot`, and the login-wall `PUBLIC_ALLOWLIST` — the precedented place a **deliberately unauthenticated** route is *defended in writing* (Story 10.21 AC-R1). |
| `apps/api/src/modules/public-pages/` exists | ⛔ **NO** — 48 modules, this is not one. 11a.2 refused to create it empty: *"it lands with its first consumer"* ([[feedback_no_premature_package]]). **This story is that consumer.** |
| `apps/public` calls `apps/api` anywhere today | ⛔ **NO.** Zero `fetch(` in `apps/public/src`. This story introduces the first cross-app hop. `turbo.json` `globalEnv` is `["PARIWAR_PROFILE","PUBLIC_PARIWAR_ID","PUBLIC_SITE_ORIGIN"]` — no API origin. |
| FR-91 pagination on `apps/public` | ✅ `parsePageParams` + the `pagination_binding` gate leg (11a.2). ⚠ `page` has **no upper bound** and `offset` can leave safe-integer range — **both deferred with THIS story as the trigger.** |
| An abuse-detection surface exists anywhere | ⛔ **NO.** Grepped `apps/api/src`, `packages/domain/src`, `packages/contracts/src`: `abuse.honeypot` is the only abuse signal in the repo and no console surfaces it. `directory-abuse-rules.yaml` does not exist. |
| Story 10.6 is "query throttling" | ⛔ **FALSE.** 10.6 is the **Bulk Operations Framework**. `epics.md` Story 11a.4 cites *"Story 10.6 query throttling"* as a protection layer — a **verified-false cross-reference**, the same shape as the C3 Epic-3 dependency error. ⛔ Do not cite it as coverage. |
| `critical_render_path_ms` | Deferred; its trigger — **re-written at 11a.2 to name Story 11a.3 explicitly** — has now **fired** (`friction-budget.yaml`, `deferred-work.md:93`). |

---

## ⛔ THE EIGHT TRAPS — read these before anything else

### Trap 1 — ⭐ THE `authenticated_member` COLUMN OF THE AC'S TABLE HAS NO VIEWER. It cannot be built here.

The AC's tiered-render table has three columns. **Only one of them is reachable on this surface**,
and that was established by verification at 11a.2, not by preference:

- Members are **TOKEN-BEARER** — `member-session-guard.ts:1-8` reads the access-token JWT from the
  **`Authorization` header**, `exp ≤ 15 min`. A browser navigating to `twt.org/members` sends
  **cookies**, never an `Authorization` header.
- `apps/` holds `admin · api · jobs · mobile · public`. There is ⛔ **no `apps/member-web/`**
  (`architecture.md:486-494` defers it behind named triggers), and `apps/mobile` has **no directory
  screen** (`apps/mobile/app/` — 15 route groups, none is a directory).

⇒ ⛔ **There is no `authenticated_member` viewer for the Member Directory today, by any mechanism.**
Minting one means a browser member session at the page layer, which `architecture.md:515-517`
forbids — *"the auth boundary lives at the API … no special-case auth surface is introduced at the
public page layer"*.

⭐ **What this story therefore builds: the `public` tier, for real.** The authenticated tier is
**declared structurally unreachable** and routed onto **11a.2's already-recorded fragment-mechanism
deferral** (trigger: Epic 11b FR-77, *or* an `apps/member-web/` split trigger firing). ⛔ Do **not**
add matrix rows for `block` / `school` / `designation` / `pool_participation` / `registration_date` —
`block` is gated on `-137`'s unbuilt migration mechanism, `school` and `designation` are
**permanently RBAC-ineligible**, and the last two would be rows no substrate and no render backs,
which is **SD-1 by another route**.

⚠ **Say this LOUDLY in the record**, exactly as 11a.2 said "armed but empty". Half a table shipping
is fine; half a table shipping **silently** is the defect.

### Trap 2 — ⭐ THE SSR PROXY COLLAPSES PER-IP RATE LIMITING TO ONE BUCKET

D1(a) puts the read on `apps/api`, and `apps/public` calls it **server-side**. ⛔ Then every
internet visitor arrives at `apps/api` from **one** IP — the SSR process's. `perSessionKey(request)`
falls through to `request.ip` for an unauthenticated caller, so **all directory traffic on earth
shares a single rate-limit bucket**: the ceiling either blocks every visitor at once or protects
nobody. Same for the abuse audit line — every signal would name the proxy.

⇒ `apps/public` **must forward the visitor's address** (`Astro.clientAddress`, appended to any
inbound `X-Forwarded-For` chain), and the route **must** key its limit on the forwarded value.
⚠ `apps/api` runs `trustProxy: true` (`server.ts:88`), so `request.ip` already reads
`X-Forwarded-For` — ⛔ **verify this in a test, do not assume it**: a rate limit keyed on a constant
is a rate limit that does not exist, and it would pass every unit test.

### Trap 3 — ⚠ `trustProxy: true` MEANS THE FORWARDED IP IS CALLER-SUPPLIED. Do not "fix" it globally.

The same `trustProxy: true` that makes Trap 2 solvable also means a caller reaching `apps/api`
directly can **spoof** `X-Forwarded-For` and evade the per-IP ceiling. That is **pre-existing** (the
Cloudflare / Dokploy hop assumption) — ⛔ **but it becomes materially sharper here**, because this is
the first *deliberately unauthenticated, PII-bearing* route whose anti-enumeration mandate depends on
that key. ⛔ **Do not change `trustProxy` globally** — it would alter `request.ip` and origin checks
for every route in the app, on a surface story. **Record it**: name the network precondition (the
route is reachable only through the trusted hop) in the allowlist entry and in `deferred-work.md`
with a trigger. ⚠ A spoofable key is a real limit on what the throttle proves, and the README must
say so in the 10.12 fence's own words.

### Trap 4 — ⛔ EDGE CACHING AND ABUSE DETECTION ARE IN TENSION, AND D5 KEEPS THE CACHE

`/members` is declared `cache_policy: edge_cacheable` and the matrix comment says in terms:
*"⭐ STORY 11a.3 MUST RE-DECIDE THIS when it renders real member rows."* ✅ **D5(a) ruled: keep it.**

⇒ ⛔ Then state the consequence rather than discovering it later: **a cached hit never reaches the
origin**, so the origin-side throttle and the abuse audit lines see only cache **misses**. A scraper
walking pages 1..N through a warm edge is invisible to the very detection this story ships.
⚠ **Inert today** — there is no Cloudflare in this repo and edge selection is contingent on DPDPA
legal review (`architecture.md` §5.8a) — ⛔ but it is a **named dependency** of the detection story
and must be written into `directory-abuse-rules.yaml`'s own README and `deferred-work.md`.
⛔ Do not paper over it by claiming the origin sees everything.

### Trap 5 — ⛔ THE ESCALATION LEDGER STRUCTURALLY CANNOT ATTEST A **FIRST-TIME** CLASSIFICATION

The status pill needs a **new** `public` field (`member_status`) on the flagship surface. It is
tempting to add an `escalations:` entry for it. ⛔ **It will not parse, and forcing it would be a
fabrication.** `MatrixEscalationSchema` requires a real `from` tier and `superRefine` **rejects**
`from` unless it outranks `to` (`matrix.ts:268-293`) — there is no honest `from` for a field that was
never classified. 11a.1's own ledger header already settles the principle: *"Declaring a surface for
the first time is NOT an escalation … recording them here would inflate the ledger with entries that
prove nothing."*

⇒ The attestation for a first-time `public` field is the **`.decision-log.md` entry** (Task 1), the
field's `description:` naming it, and the PR template's security prompt. ⛔ **Never invent a `from`
tier to make the ledger accept it**, and ⛔ never weaken the parser.

### Trap 6 — ⛔ THE SET-BASED DISTRICT READ ALREADY EXISTS THREE TIMES. ⛔ DO NOT INVENT A FOURTH SHAPE.

District comes from `member_postings`. ⛔ **`getMemberPostingLatest` is NOT its only reader** — that
claim is false and believing it is how this task gets rewritten from scratch. The readers are:

| Reader | Shape |
|---|---|
| `member/posting.ts:129` `getMemberPostingLatest` | **per member** — ⛔ calling it per row is the exact N+1 AR-65 exists to prevent and that 10.11 already paid 44s → 220s for |
| `member-geo/resolve.ts:68` `getMemberCurrentDistrict` | **per member**, as-of (`at: Date`); the *named* single-member district accessor and where the D3 rule is documented |
| `surveys/read.ts:303-316` · `news-blog/audience.ts:163-171` · `banners/audience.ts` | ⭐ **SET-BASED over a whole member cohort, in ONE query** — ⛔ **this is the shape to copy** |

⭐ **The three set-based readers already solve both gotchas.** Read `surveys/read.ts:303-316` before
writing a line: it joins `members` and resolves district through a correlated subquery, and it dodges
[[project_epic6_drizzle_correlated_subquery_bug]] **by using raw quoted identifiers**
(`WHERE p.member_id = "members"."member_id"`) instead of interpolating `${members.memberId}`. ⛔ That
mitigation is the whole reason it works — do not "tidy" it back into a Drizzle `Column`.

⚠ Every dynamic `.limit()` must route through `clampLimit` — the `domain-accessor-invariants` gate
enforces it ([[project_domain_limit_clamp_and_savepoint_retry]]).

#### ⛔ Trap 6a — THE TIE-BREAK IS `created_at DESC, posting_id DESC`, AND IT IS A COMMITTED RULE

⛔ **`ORDER BY … created_at DESC` alone is WRONG here**, and it is wrong in a way no test in this
story would catch. The repo's latest-posting comparator is **`created_at DESC, posting_id DESC`** —
the **"D3 rule"** — carried with an explicit *"Change one, check the other"* at
`member-geo/resolve.ts:33,41,60,92` · `surveys/read.ts:296,311` · `news-blog/audience.ts:145,168` ·
`claim/peer-mesh-read.ts:83-88` · `member/posting.ts:120`. Dropping `posting_id DESC` creates a
**sixth, silently divergent** implementation of a rule five files coordinate on, and two postings
sharing a `created_at` then resolve **non-deterministically** — ⛔ which breaks AC2's own *"page N is
the same page N on every request"* from inside the query that AC is about.

⚠ And if the read uses `DISTINCT ON`, the `ORDER BY` **must lead with the `DISTINCT ON` expressions**
or Postgres raises **42P10** ⇒ the full form is
`DISTINCT ON (member_id) … ORDER BY member_id, created_at DESC, posting_id DESC`.
⭐ `moderation/read.ts:258` is the model **because it carries a complete tie-break chain**
(`member_id, acted_at DESC, created_at DESC, moderation_action_id DESC`) — ⛔ mirror its *rigour*,
not just its keyword.

### Trap 7 — ⚠ THE FIELD SET IS DERIVED, NOT WRITTEN. Adding a rendered value is a matrix act.

`deriveFieldIds` (11a.1 ruling D3(a)) throws in **both** directions: a render-model key with no
mapping entry throws, and a mapping entry with no model key throws. `MEMBERS_FIELD_IDS` currently
maps **all three** keys to `null`. The moment a member attribute enters `MembersRenderModel`, it
**must** carry a snake_case id **and** a matrix row, or the build fails — which is the mechanism
working, ⛔ not an obstacle to route around.
⛔ **Never add a mechanical camelCase→snake_case converter** — it would invent an id nobody
classified, turning *"an unclassified field slipped in"* (which the matrix catches) into *"the gate
made up a name for it"* (which nothing catches).
⚠ And the soft spot is real and confessed: a value computed inline in `.astro` frontmatter and
interpolated into the template **never enters the model** and is invisible to the derivation.
⛔ Keep **all** display logic in the pure `lib/*.ts` module — on this surface that is a gate evasion
before it is a style choice.

### Trap 8 — ⭐ THE ABUSE AUDIT LINE IS A COUNTER, NOT A FORENSIC RECORD. Say so; ⛔ do not imply otherwise.

The AC asks for abuse signals audit-logged *"with the viewer actor + query context"*. ⛔ **The
substrate cannot store the query context, and this must be built knowing that:**

- `audit_log_entries` has **no context or payload column** (`schema/audit_log_entries.ts:66-123`).
  The only fields available are `action`, `resource_locator`, `actor_id`, `actor_role`,
  `response_status`, `trace_id` — and `request_payload_hash`, which is a **SHA-256 digest**.
- `authEventToAuditInput` (`apps/api/src/audit/audit-log-sink.ts`) **hashes** `event.context` into
  that digest and hard-codes `resourceLocator: user:${event.actorId ?? 'anonymous'}`. ⇒ for an
  unauthenticated directory visitor the locator is the **constant** `user:anonymous` and the context
  is **unrecoverable**.

⇒ **Two consequences, both to be written down rather than discovered:**
**(a)** the only fields that can carry triage signal are **`action`** (the abuse rule that fired) and
**`resource_locator`** — put the rule id and the coarse, non-PII query shape *there*, ⛔ never rely on
`context` surviving; **(b)** ⚠ **D4(a)'s rationale is bounded by this.** *"The signal is real and
reachable today"* is true; *"triageable today"* is ⛔ **not**. Say which one you shipped
([[feedback_closure_language_precision]]) — the console deferral inherits this limit and its
`deferred-work.md` entry must name it.

⛔ **The event type must be MINTED, not borrowed.** `AuthAuditEventType`
(`apps/api/src/audit/audit-sink.ts:15`) is documented *"The closed set of privileged auth events"* —
a directory-abuse line needs a **new member of that union** *and* a `statusForAuthEvent` mapping
alongside `rate_limit.exceeded` / `abuse.honeypot`. ⛔ **Do NOT reuse `abuse.honeypot`**: it would
corrupt the honeypot signal *and* break `apps/api/tests/integration/security-headers.spec.ts:72`,
which asserts an **exact** hit count. ⚠ And the seam is **`deps.auditSink.emit`**, ⛔ never
`writeAuditEntry` directly — its own header states producers do not call it.

---

## ⛔ SCOPE BOUNDARY — what this story is NOT

| ⛔ Not in scope | Owner / reason |
|---|---|
| The **`authenticated_member` render** (full name at the member tier, block, school, pool participation, registration date) | ⛔ **Structurally unbuildable — Trap 1.** Routed onto 11a.2's fragment-mechanism deferral (11b FR-77 / `apps/member-web` split) |
| A **browser member session** on `apps/public` | ⛔ **FORBIDDEN** — `architecture.md:515-517`. Needs its own ruling |
| **Search / filter** over the directory | ⛔ Out. The AC lists *"better search/filter"* under **acceptable directions for evolution**, ⛔ not as scope. ⚠ `architecture.md` §2.11's *"Search endpoints (public Member Directory…)"* is a **forward reference**, not a commitment discharged here |
| Phone/email **obfuscation** patterns | **11a.4** |
| `<NoticeboardStrip>` / `<PinnedNotice>` | **11a.5 / 11a.6** |
| A **member-detail page** (`/members/:id`) | ⛔ Out — FR-75's *"noindex on member **detail** pages"* has no page to bind to yet. ⚠ ⛔ Do not invent one: a per-member permalink is an enumeration primitive, and it is not in any AC |
| An **admin console view** for abuse signals | ✅ **D4(a): deferred with a written trigger.** The rules + enforcement + audit lines ship; the view does not |
| **Bulk export** in any form | ⛔ **FORBIDDEN** (FR-91). No "download all", no CSV, no `?format=csv`. The authorized path is **Story 10.7**'s scope-respecting, audit-logged reports library |
| Changing any **PII tier** | ⛔ **FORBIDDEN** (`-136` cl.6). The name stays Tier-1 ciphertext + Tier-2 blind index; this is a **decrypt at a named surface** |
| A **second** Tier-1 `public` exception | ⛔ **FORBIDDEN** — the parser rejects it by design (`matrix.ts` cross-field check). ⛔ Do not weaken that check |
| `block` / `zone` / `division` / `school` / `designation` rows | ⛔ **BLOCKED or PERMANENTLY INELIGIBLE** — unchanged from 11a.1/11a.2. ⛔ A test asserts their absence |
| Amending **In Memoriam / Sahyog Vivran** name form | ⛔ **FORBIDDEN** (`epics.md` C5). `-135`/`-136` are scoped to **this** surface |
| Changing `trustProxy` | ⛔ **Out — Trap 3.** Record it; do not re-tune a global on a surface story |
| Configuring **Cloudflare** | ⛔ Out of the repo (§5.8a). The gate proves what the **origin emits** |
| A **self-serve admin toggle** for the presentation policy | ⛔ Out — changing the mode is a **governed act** (`-136` cl.3), not a tenant preference |
| An **empty** `apps/api/src/modules/public-pages/` | ✅ N/A — it lands here **with** its route and handler. ⛔ Never a module with no route |

---

## 📜 Policy meaning (AI-10-1, CONFIRMED BigDev 2026-08-18)

**Does this story introduce or change a predicate that gates a member's access to a benefit?**

⛔ **No — and D3 makes that answer non-obvious, so read the reasoning rather than the verdict.**
This story introduces one new predicate: **which members appear in the public directory**. It reads
`members.state` and the moderation status, both of which *also* feed benefit paths — but it reads
them **only to decide a render**. ⛔ No `is_valid`, `is_assignable`, eligibility, pool-assignment,
validity or peer-mesh predicate is written, conjoined, or consulted. `architecture.md` §2.13.2 makes
this structural: *"Directory attributes are display-only BY DEFAULT … enforced by signature"*.
⛔ **A diff in which a directory-listing predicate reaches an eligibility path violates §2.13.2** and
must be rejected in review, ⛔ not argued about. ⚠ This is the **10.10 shape** — a conjunct added to
a predicate that silently changed what a sanction *means*. Read it that way before writing it.

> ⛔ **SUPERSEDED IN PART BY `2026-08-21-145` (second-round code review, 2026-08-21).** The verdict
> above — *"No, this story introduces no predicate gating a benefit"* — **stands for the roster
> predicate**, and the Acceptance Auditor **re-verified it in code** rather than accepting it:
> `listPublicDirectoryMembers` / `countPublicDirectoryMembers` / `DIRECTORY_VISIBLE_MEMBER_STATES`
> have exactly **one** production consumer repo-wide, ⛔ no `is_valid` / `is_assignable` / eligibility
> / pool / validity / peer-mesh path imports them, and the module writes nothing. ✅ §2.13.2 holds.
>
> ⛔ **But the section was INCOMPLETE, and the incompleteness was load-bearing.** It enumerated the
> predicate's inputs as *"`members.state` and the moderation status"* and stopped — which is exactly
> why ⭐ **nobody noticed that a DECEASED member is published, marked "Active"** (`-145` cl.1). Two
> further predicates existed with ⛔ **no member-facing sentence at all**: the **`account-frozen`
> omission** (added by `-145` cl.1) and the **per-Pariwar kill switch** (`-145` cl.5(c), which shipped
> ⛔ implementation-first with no governance record). ⚠ **This is the AI-10-1 failure mode in its
> purest form**: the section ran, produced a defensible "No", and the predicate that mattered was
> **not in the list it was reasoning over**.

**The sentence, in the member's terms** — ⛔ **REPLACED by `2026-08-21-145` cl.1; the original is
struck, ⛔ not silently edited:**

> ~~*"…You appear there while your membership is active or in lock-in. If your membership is
> suspended, you stop appearing…"*~~ ⛔ **Incomplete — said nothing about death.**

> ✅ *"Your full legal name — the one on your KYC record — and your district are now shown on the
> public member directory to anyone on the internet, with no login. You appear there while your
> membership is active or in waiting-period. If your membership is suspended, you stop appearing;
> nothing else about your membership changes, and you are not removed from the trust. **You also stop
> appearing once your death has been reported to the trust, from the moment a claim naming you is
> opened.** Your Pariwar can switch the displayed form to 'Ramesh K.' without touching your KYC
> record, and can switch it back — **and if your name cannot be shortened into that form, you are left
> off the directory rather than shown in full.** **Whether your Pariwar's directory is published at
> all also depends on a switch only a Super Admin can operate; it is on unless someone turns it off,
> and you cannot see it or request it."***

**Checked against the Niyamavali — the result is TWO OPEN FINDINGS, ⛔ not a confirmation.**

1. ⚠ **Carried forward, ⛔ not re-derived.** Story 11a.1 read all 23 v1 clause ids in
   `packages/domain/seed/niyamavali-v1-clauses.sql` and found ⛔ **no clause governing directory
   publication or name visibility** (Decision `2026-08-20-140` cl.7). ⚠ **Still open.** 11a.2 made
   it sharper by shipping the page; **this story makes it sharpest** — the page now prints names.
   ⛔ This story does **not** close it: amending the Niyamavali is Story 2.4's workflow and needs its
   own ruling ([[feedback_supersede_never_reinterpret]]).
2. ⭐ **NEW, raised by this story, ⛔ not silently absorbed.** Under **D3(a)** a **suspension removes
   a member from the public directory**, and under the pill a **lock-in member's waiting status is
   published to the internet**. Neither consequence is described anywhere a member can read: the
   moderation record model (10.20) commits *what* a suspension is, and the Niyamavali carries
   `niy.moderation.dwell` — ⛔ but **no clause says a sanction changes what the public sees about
   you**, and ⛔ no clause says lock-in is public. ⚠ Recorded in Task 1's decision-log entry as an
   **open finding for the Panel**, ⛔ not fixed here, and ⛔ not used as a reason to quietly drop the
   pill the epic's own row-by-row disposition left **unchanged**.

⚠ Both compound `2026-08-19-136` cl.5's already-recorded DPDPA exposure (*legal counsel not engaged*).

---

## Acceptance Criteria

### AC1 — The directory read + the Tier-1 decrypt live at `apps/api/src/modules/public-pages/`, and the module lands WITH its route

**Given** ✅ **D1(a) RULED**, and ⛔ **verified**: `apps/public` cannot decrypt Tier-1 (no KMS
wiring), cannot write an audit line (`writeAuditEntry` needs the BYPASSRLS service pool; `twt_app`
has no INSERT grant), and cannot rate-limit (no Fastify, no store)
**When** the read path is built
**Then** `apps/api/src/modules/public-pages/` ships with a **real route** — a single
collection-returning `GET` for the directory page — plus `handlers.ts`, `routes.ts`, `index.ts` in
the house module shape, registered in `server.ts` in the load-bearing order
**And** the route is added to `login-wall.spec.ts`'s `PUBLIC_ALLOWLIST` with its justification
written **in the entry**, in the Story 10.21 AC-R1 style — ⛔ a bare allowlist line is the failure
mode that entry exists to prevent; it must state **why** it is unauthenticated (the surface is
`public` tier by Panel ruling) and **what bounds it instead** (named `search` rate limit, page cap,
page ceiling, `noindex`, no detail route, no export)
**And** it carries `config: { rateLimit: limits.search }` from `namedRateLimits(deps)` **unmodified**
— ⛔ never an inline ad-hoc ceiling, and ⛔ never `limits.read` (the looser tier) on an enumeration
surface. ⭐ **No `keyGenerator` override is needed and ⛔ none should be written**: `limits.search`
already keys on `perSessionKey`, which is `request.session?.userId ?? request.ip`
(`plugins/rate-limit/index.ts:48-50`), and `trustProxy: true` makes `request.ip` **read the forwarded
chain** — so an unauthenticated caller is already keyed on the visitor address that **Trap 2**
requires. ⚠ The work is in **forwarding** the address from `apps/public` (T5), ⛔ not in re-keying the
limit here; a hand-rolled `keyGenerator` is exactly the ad-hoc deviation this clause forbids
**And** the Tier-1 decrypt uses the **existing** `decryptKycField` under `MEMBER_KYC_FIELD_CLASS`
with the member's **real** `pariwarId` — ⛔ no new field class, ⛔ no new namespace, ⛔ no second
crypto helper
**And** ⭐ **`apps/public` gains NO KMS material.** ⛔ No third `buildEncryptionDeps` parallel, no
`kekRef` in `apps/public`, no `@twt/domain` encryption import in any `apps/public` module. A test or
lint assertion proves the absence — ⛔ an absence nobody checks is an absence that regresses.

### AC2 — The roster read is ONE set-based domain accessor, bounded, and its exclusions are the ruled ones

**Given** ⛔ **verified**: no directory read exists; `listMemberStatesForPariwar` is unbounded and
whole-Pariwar; `getMemberPostingLatest` is **per member**, and ⭐ **three set-based cohort district
reads already exist** (**Trap 6**)
**When** the roster read is authored
**Then** a **new** accessor in `packages/domain/src/member/` resolves one page in **ONE query** —
member + current lifecycle state + latest posting district + KYC name ciphertext — ⛔ never a
per-member fan-out, and ⛔ never `searchMembers` (4.7 admin search, wrong shape and wrong caller)
**And** it is written **against the existing set-based shape** (`surveys/read.ts:303-316`,
`news-blog/audience.ts:163-171`), ⛔ not freshly invented — including that shape's **raw quoted
identifiers** (`p.member_id = "members"."member_id"`), which are what keep it clear of
[[project_epic6_drizzle_correlated_subquery_bug]]
**And** ⭐ the latest-posting comparator is the committed **D3 rule —
`created_at DESC, posting_id DESC`** (**Trap 6a**), ⛔ **never `created_at DESC` alone**: five files
coordinate on this comparator under an explicit *"Change one, check the other"*, and a missing
`posting_id` tie-break makes two same-`created_at` postings resolve **non-deterministically** —
⛔ which breaks this AC's own determinism clause from inside the query. ⚠ If `DISTINCT ON` is used,
the `ORDER BY` **must lead with the `DISTINCT ON` expression** (42P10) ⇒
`DISTINCT ON (member_id) … ORDER BY member_id, created_at DESC, posting_id DESC`
**And** the district is the **raw `member_postings.district` string**, ⛔ **not** lifted through the
geo tree — every *audience* consumer calls `liftDistrictThroughTree` because it is deciding
**eligibility**; this surface is deciding a **display value**, and lifting it here would be a
directory attribute quietly acquiring policy meaning (§2.13.2). ⚠ Resolve it **as of now**, matching
the precedents' `created_at <= <now>` bound
**And** the `limit` routes through `clampLimit` (the `domain-accessor-invariants` gate) and the
ordering is **stable and deterministic** (`member_id` ascending, the house convention) so page N is
the same page N on every request — ⛔ a non-deterministic order silently duplicates and drops rows
across pages
**And** ✅ **D3(a) RULED — the roster is:** lifecycle state ∈ `{active, active-in-grace, lock-in}`
**AND** moderation status ∉ `{suspended, terminated}`. ⇒ ⛔ every `pending-kyc` / `pending-fee` /
`pending-valid` / `lapsed-unpaid` / `withdrawn` / `anonymized` member is **omitted**, and so is every
suspended or terminated member
**And** ⛔ **a member with no KYC name resolves to omission, ⛔ never to a blank row where a person's
name belongs** — `resolvePublicMemberName` returns `''` for an unresolvable name and the caller
treats `''` as *"omit this row"* (the `pool-identity.ts` fail-soft precedent). ⚠ Assert that
explicitly; a blank name cell on a public page is worse than a shorter page
**And** the accessor is **transport-free**: ⛔ no HTTP, ⛔ no audit, ⛔ no decryption, ⛔ no permission
check — the `apps/api` boundary orchestrates those (the `searchMembers` precedent).

### AC3 — The name renders through the presentation policy, and `full_name` is PROVEN not to be hard-coded

**Given** `-136` cl.1 — *"a build in which the public name form cannot be changed without a code
change **FAILS** this clause"* — and `resolvePublicMemberName` has **zero call sites**
**When** the name is rendered
**Then** the render resolves the Pariwar's mode via `resolvePublicNamePresentationMode` and passes it
to `resolvePublicMemberName` — ⛔ never a literal `full_name`, ⛔ never a local re-implementation of
`splitFirstNameLastInitial`, and ⛔ never a second copy of the mode default
**And** ⭐ a test **PROVES** configurability end-to-end, ⛔ does not assert it: with a stored
`shielded_name` row the same fixture renders `"Rajesh S."`, with `full_name` (or no row at all) it
renders the full legal name, **and the stored `name_ciphertext` is byte-identical across the flip
and the flip back** (`-136` cl.2/cl.3 — it moves in **both** directions and writes no name)
**And** the mode is resolved **once per page render**, ⛔ not once per row — a per-row policy read is
an N+1 on a config value that cannot vary within a page.

### AC4 — The tier-leak leg on `member-directory` STOPS BEING VACUOUS, and the discharge is proven by planting a leak

**Given** ⛔ **verified**: `membersSurfaceFieldIds(model)` returns `[]` for the shipped model (⚠ it
takes the render model as its argument — ⛔ it is not a no-arg accessor), a committed test **asserts**
that emptiness, and `2026-08-19-136` cl.4 makes an operative leg **launch-blocking** for this surface
**When** the render ships
**Then** `MembersRenderModel` carries the member rows, `MEMBERS_FIELD_IDS` maps each rendered member
attribute to its snake_case matrix id (⛔ **`null` only for genuinely non-field keys** like `page` /
`limit` / `hasMembers`), and `membersSurfaceFieldIds(model)` returns a **non-empty** set containing at
least `member_name`, `district` and `member_status`
**And** ⛔ the committed *"the field set IS empty"* assertion in
`apps/public/tests/integration/public-pages/scrape-test.spec.ts` is **replaced**, ⛔ never deleted
without a replacement — and the replacement asserts the **exact** expected set, so a silently
dropped field fails
**And** the surface's `description:` in `public-vs-private-matrix.yaml`, the page header, the render
model doc-block, the live-render spec, `deferred-work.md` and `gate-inventory.md` — **all six places
that currently say "armed but empty"** — are **rewritten**. ⛔ A leg that became real while six
committed records still say it is vacuous is a governance record contradicting itself
**And** ⭐ **the discharge is proven by planting a real leak**: a snapshot carrying an
`authenticated_member`-tier or **undeclared** field at `public` **fails**, and the failure names the
field. ⛔ *"The set is non-empty"* is not the proof — the proof is that a leak now **fails a run that
previously passed**.

### AC5 — `<MatrixField>` gets its FIRST real call site, and every rendered member value goes through it

**Given** `.decision-log.md#2026-08-20-142` — `<MatrixField>` shipped with **zero call sites**, and
this story is the named follow-up
**When** the row renders
**Then** **every** member-attribute value on the page renders through
`<MatrixField surface="member-directory" field={…} viewerContext={…} value={…} />`, ⛔ never
interpolated directly, so that `getVisibility()` is the **only** thing deciding what appears
**And** a not-visible verdict renders **nothing at all** — ⛔ no placeholder, ⛔ no empty `<span>`,
⛔ no HTML comment naming the omitted field. *An omission that announces itself is an enumeration
signal*: a scraper diffing renders learns exactly which fields exist
**And** ⛔ the component is **not** modified to accommodate the call site: no `TIER_RANK` import, no
second viewer ceiling, no local tier comparison. If it does not fit, **stop and raise it**
**And** ⚠ the runtime matrix identity property (`?raw` inline, byte-identical to the committed file)
still holds and its test still passes — ⚠ note that 11a.2 verified the `?raw` bytes reach
`dist/server/chunks/` only via a **manually run, reverted probe**; with a real call site the module
is no longer tree-shaken, so ⭐ **re-verify against a real `dist/` build** and record the result.

### AC6 — Anti-enumeration is MECHANIZED, and every safeguard is proven to run

**Given** `epics.md` C1 — anti-enumeration is *"load-bearing, not defensive"* — and ⛔ **verified**:
`apps/public` can enforce none of it (the verified table's three `apps/public` **cannot** rows — no
KMS, no audit INSERT grant, no rate-limit store)
**When** the safeguards ship
**Then** **each** of the following exists, is wired to the live path, and has a test that proves it
**fires** — ⛔ never a comment claiming a protection that is not there:
  1. **Page-size cap** — `PUBLIC_PAGE_SIZE_MAX` (50, imported from `_common/pagination.ts`, ⛔ not
     re-declared) enforced at **both** ends: rejected at the Astro parse and clamped at the domain
     accessor. ⚠ Two independent bounds is deliberate, ⛔ not redundancy to tidy away.
     ⚠ **The epic's *"e.g., 25 entries/page"* is NOT a second cap and this is ⛔ not a relaxation of
     it**: 25 is `PUBLIC_PAGE_SIZE_DEFAULT` (what a caller who asks for nothing gets), 50 is
     `PUBLIC_SURFACE_PAGE_SIZE_CAP` — the FR-91 ceiling already committed at 11a.2 and shared with
     `@twt/contracts`. ⛔ Raising **either** is an FR-91 change needing its own ruling
  2. **Deep-pagination horizon** — ✅ **D2(a)**: a **new decidable rejection reason** on
     `parsePageParams` mirroring `limit_above_cap`, with a named exported constant and its rationale.
     ⇒ **discharges** the deferred *"`page` has no upper bound"* item (`deferred-work.md:5660`) and
     the *"offset precision loss"* item (`:5663`), **both of whose trigger is this story**
  3. **Rate limiting** — `limits.search` on the route, keyed on the **forwarded visitor address**
     (**Trap 2**), ⛔ not on the SSR proxy. A test drives the ceiling and asserts the N+1th request
     is `429` **and** that a `rate_limit.exceeded` audit line was captured
  4. **Abuse rules + detection** — ✅ **D4(a)**: `directory-abuse-rules.yaml` is a **committed,
     versioned, strictly-parsed** config (a malformed file **throws**, ⛔ never degrades to "no
     rules" — the `parseCapabilityBar` doctrine) declaring the triggers the AC names: high-volume
     lookups, repeated district-wide queries, deep-crawl / rapid-pagination patterns. It is **read by
     the route** and a breach emits an audit line through **`deps.auditSink.emit`** (⛔ never
     `writeAuditEntry` directly) under a **newly minted** `AuthAuditEventType` + its
     `statusForAuthEvent` mapping (⛔ never a borrowed `abuse.honeypot` — **Trap 8**).
     ⭐ **And the line's honest reach is stated, ⛔ not implied**: the rule id and a coarse, non-PII
     query shape go in **`action` + `resource_locator`**, because `context` is **hashed away** and no
     column stores it (**Trap 8**). ⛔ Never describe this line as carrying the query context
  5. **`noindex`** — unchanged and **still passed** to `PublicShell`; `apps/api` additionally stamps
     `X-Robots-Tag: noindex, nofollow` on the JSON route by the existing global hook (⚠ **verify, do
     not rebuild** — 11a.1 AC7)
  6. **No bulk-export affordance** — ⛔ no "download all", no CSV link, no `?format=` parameter, on
     the page **or** the API route
**And** ⚠ **the authenticated-session clause is answered honestly**: the AC says *"authenticated
session does NOT bypass rate limits"*. ⛔ There is no authenticated session on this surface
(**Trap 1**), so there is nothing to bypass. **Say that**, ⛔ never imply a control that has no
subject
**And** ⚠ **the account-sanction clause is answered the same way, ⛔ not skipped**: the AC's
rate-limiting bullet ends *"abuse-detected accounts trigger temporary suspension + trustee review"*.
⛔ **There are no accounts on this surface** — every visitor is unauthenticated (**Trap 1**), so
there is no account to suspend and no actor to route to trustee review; the enforceable residue is
the **429** and the **audit line**. ⛔ Record it in Task 1's decision-log entry as a **third clause
with no subject on this surface** (alongside the authenticated-session clause and the verified-false
10.6 cross-reference) — ⚠ it becomes live at Epic 11b **only if** an authenticated directory tier is
ever built, and the record must say so rather than leaving a reader to assume it was built
**And** ⛔ **the console view is NOT built** (D4(a)) — it is written into `deferred-work.md` with a
named trigger, and the record says plainly that a signal exists with no purpose-built view yet.

### AC7 — The cache declaration is RE-DECIDED in writing, and its cost to detection is recorded

**Given** the matrix comment obliging this story to re-decide, and ✅ **D5(a) RULED**
**When** the surface renders real member rows
**Then** `cache_policy: edge_cacheable` **stands**, the page keeps
`public, max-age=60, s-maxage=300` + `Vary: Accept-Language` on the accepted path and `no-store` on
the 400 path, and the gate's `cache_policy_reconciliation` leg keeps passing
**And** ⛔ the matrix comment that says *"11a.3 MUST RE-DECIDE THIS"* is **rewritten to record the
decision and its reason** — ⛔ leaving a standing instruction that has been carried out is a record
that asks for the same work twice
**And** ⭐ **Trap 4 is written down where it will be read**: a cached hit never reaches the origin,
so the throttle and the abuse audit lines see only cache **misses**. Recorded in
`directory-abuse-rules.yaml`'s README section **and** `deferred-work.md` as a **named dependency**
(re-trigger: an edge/CDN actually being configured). ⛔ Not a footnote, and ⛔ not omitted because it
is inert today.

### AC8 — `critical_render_path_ms`: PARTIALLY DISCHARGED, ⛔ not passed over a fourth time

**Given** its trigger was **re-written at 11a.2 to name this story explicitly** and has now **fired**
(`friction-budget.yaml`, `deferred-work.md:93`), and ⚠ the same trigger family has now fired at 2.6,
10.5, 11a.2 and 11a.3
**When** this story lands
**Then** ✅ **D6(a) RULED — a real measurement of the DYNAMIC HTML lands here**: `/members` is
measured at realistic page sizes (a full page at the cap), emitted per route alongside the existing
static attribution and **clearly labelled as a different quantity** — ⚠ 11a.2's per-route numbers are
an **attribution of static client assets**, ⛔ **not** a measurement of dynamic SSR HTML, and the two
must never be summed or compared
**And** only the **device-throttled Lighthouse-CI timing harness** is re-deferred, with a
**genuinely new reason** (⛔ not a restatement of 11a.2's) and a new written trigger
**And** ⛔ **say which one you built** ([[feedback_closure_language_precision]] — *"Closed by [edit]"*
and *"Resolved via explicit deferral"* are different claims; ⛔ never collapse them).

### AC9 — Records, copy, i18n, inventory, and the friction-budget declaration, for the surface actually shipped

**Given** the gates that bite when a member-facing surface changes
**When** the directory renders real members
**Then** the new member copy extends the **existing `members` i18n namespace** with **hi + en
parity** (`i18n:check-parity`) — ⚠ `t()` defaults to `common` and **throws** on a miss, so pass
`namespace` explicitly on **every** call ([[project_missed_cycle_visibility_substrate]]) — and ⚠ the
interpolation token is **single-brace `{max}`**, matching `packages/i18n/src/resolver.ts:33`'s
`TOKEN` regex. ⛔ `{{max}}` is the bug that made `/members` throw on **every** request at 11a.2 and
that **no test caught**, because every test bypassed `t()` with a hand-built label fixture
**And** ⭐ **at least one test exercises the real `t()` path for this page**, ⛔ not only a hand-built
`MembersLabels` fixture — that fixture shape is precisely what hid the 11a.2 defect
**And** both `members` locale files stay in `microcopy.yaml` `copy_globs` (already added at 11a.2 —
⚠ **verify**, and add any new namespace)
**And** `docs/ux/empty-skeleton-error-inventory.md` §7 is updated: the **Populated** row (currently
*"⛔ Does not exist at Story 11a.2 — owned by 11a.3"*) is **filled**, the *"no next affordance"* note
is replaced with the real row-count-derived behaviour, and ⛔ **no `<TBD>` cells**. ⛔ Row 6 closure
criteria are **not relaxed** and ⛔ **no trustee ratification is fabricated or back-dated**
([[feedback_record_unattested_no_backfill]])
**And** `friction-budget.md`'s named-payer ledger carries an **affirmed or new** declaration
(`evaluateDeclaration` requires the file be touched when a member-facing surface is) — ⚠ per
[[project_friction_budget_baseline_ratchet]] the AC-4 leg diffs **committed** history, so ⛔ verify
**after committing**, not before; and ⛔ do not ratchet a baseline on a measured **rise**
**And** a11y (Story 0.10 P0-2c + the 1.17 design system): semantic list/table structure, ARIA
labelling, keyboard-reachable pagination as **real links** (⛔ never JS-dependent buttons — the
works-with-JS-disabled posture of 2.5 AC3 is ⛔ not relaxed), visible `:focus-visible`, `@twt/tokens`
via `theme.server.ts` only (⛔ **no Tailwind** — `@twt/ui` is still a stub; the documented 2.5
variance stands).

### AC10 — Revert-sanity: every new detection route has its OWN independently planted negative control

**Given** the house doctrine — *"a governance gate that silently stopped detecting anything would be
worse than no gate: the green check would actively certify an invariant nobody is enforcing"*
(`scripts/governance-boundary/README.md`)
**When** the suite runs
**Then** **each** new detection route carries its **own** planted violation, run for real, exit code
recorded, then reverted: a tier-leak on `member-directory` with a real field set · an **undeclared**
member field entering the render model (`deriveFieldIds` throws) · a **stale** mapping entry
(`deriveFieldIds` throws the other way) · `?page=` above the new horizon · a rate-limit trip emitting
`rate_limit.exceeded` · an abuse-rule breach emitting its audit line · a malformed
`directory-abuse-rules.yaml` (**throws**, ⛔ never degrades) · a `member_status` matrix row deleted
while the page still renders it
**And** ⛔ **never one fixture tripping several checks** — that is one control wearing several hats
and it hides which leg actually fired (⚠ the recording gap 11a.2's own AC9 review flagged)
**And** the whole gate is proven **live** against real planted files
([[feedback_verify_before_committing_governance_claims]] — ⛔ a green scan is not proof; **run it**)
**And** ⭐ **the rate-limit key is proven not to be a constant**: two requests carrying **different**
forwarded addresses must land in **different** buckets. ⛔ Without this assertion, Trap 2 passes every
other test in the suite.

### AC11 — The "legitimacy surface, not social graph" invariant is documented where it BINDS

**Given** this story's third load-bearing commitment (per user direction, `epics.md`)
**When** the invariant is recorded
**Then** it lives **in the code and config a future author will actually open** — the page header,
the render module doc-block, and `directory-abuse-rules.yaml`'s README section — ⛔ not only in this
story file, which no future feature proposal will read
**And** it names the **explicitly prohibited** directions: (a) friend-finder / connection
suggestions; (b) social graphing or member-relationship visualisation; (c) engagement gamification
(badges, streaks); (d) "members you might know" recommendation engines; (e) any feature incentivising
repeated member-discovery sessions
**And** it names the **acceptable** ones: tier-respecting search/filter for legitimate
trust-verification, accessibility, performance, and additional fields **with trustee-attested matrix
updates**
**And** it states the **test a proposal must pass**: *"does this serve institutional legitimacy or
trust verification?"* — if the answer is *engagement* or *social discovery*, the proposal is rejected
**at design time**. ⚠ Link it from `apps/public/COMPOSITION-CONTRACT.md` so the public-surface
contract points at it.

---

## 🚨 Decisions — ✅ **ALL SIX RULED BY BIGDEV, 2026-08-20. Nothing here is open.**

> ⚠ **DECISION IDS COLLIDE ACROSS STORIES — read the prefix.** `D1`–`D6` below are **this story's**.
> Story 11a.1 ruled a `D1`–`D6` and 11a.2 a `D1`–`D5`; several are still binding here — 11a.1's
> **D2** (the gate-script / live-render-spec split), 11a.1's **D3(a)** (snapshot `fields` derived
> from the render model's own keys), 11a.2's **D2(a)** (the fragment contract), 11a.2's **D4(a)**
> (explicit `cache_policy`). ⛔ Where the text means another story's, it says so. ⛔ Never resolve a
> bare `D3` by proximity.

⭐ Every one was ruled **as recommended**, so the Tasks below are written against the ruled option.
⛔ The rejected options are retained deliberately — a reader must be able to see what was *not*
chosen and why, without re-deriving it.

### D1 — ⭐ Where does the directory read + the Tier-1 name decrypt live? — ✅ **RULED (a) (BigDev, 2026-08-20)**

- **(a) ✅ RULED — `apps/api/src/modules/public-pages/`, the architecture's NAMED boundary**
  (`architecture.md:515-517`). It is where the capabilities already are: KMS deps, `@fastify/rate-limit`
  with a named `search` ceiling, the §1.5 audit hash-chain writer (which needs the BYPASSRLS service
  pool `apps/public` does not have), honeypots, `X-Robots-Tag`, and the login-wall allowlist — the
  precedented place a deliberately-unauthenticated route is **defended in writing**. ⭐ **A bonus
  worth stating:** a collection `GET` on `apps/api` is walked by Story 1.14's forced-pagination guard
  over the committed OpenAPI surface, so FR-91 gains **a second, independent** enforcement on this
  data path — the guard `apps/public` routes are structurally outside of. 11a.2 refused to create the
  module empty; **this story is its first consumer**, which is exactly the condition it named.
  ⚠ **Cost, stated plainly:** a new cross-app SSR hop (base URL, timeout, failure state) and
  **Trap 2** — the proxy collapses per-IP keying unless the visitor address is forwarded.
- **(b)** ⛔ *Not chosen.* `apps/public` reads under `withPublicScope` and gains its own KMS deps (a third by-value
  `buildEncryptionDeps` parallel). ⛔ The KEK is shared across **every** Tier-1 field class — mobile,
  device tokens, KYC — so the blast radius of the internet-facing process holding decrypt capability
  is ⛔ not "names". And it still could not audit (no INSERT grant) or rate-limit (no store).
- **(c)** ⛔ *Not chosen.* A pre-resolved public-directory projection storing presentation-resolved names.
  ⛔ A plaintext second identity system — precisely `-136` cl.2's prohibition — and a new
  exfiltration target no CI gate would see.

### D2 — Cursor pagination, or keep the shipped offset form? — ✅ **RULED (a) (BigDev, 2026-08-20)**

- **(a) ✅ RULED — keep offset `?page=N&limit=M` and ADD the missing ceiling.** ⭐ The reason is
  substantive, not conservative: **a cursor over a deterministic `member_id` ordering is an offset in
  disguise** — it does not remove the walk-every-page primitive, so adopting it would *look* like an
  anti-enumeration control while changing nothing. The controls that actually bound enumeration are
  the **page ceiling**, the **page-size cap**, the **rate limit** and **`noindex`**. Keeping the form
  also preserves the `pagination_binding` gate leg (the **only** mechanized FR-91 enforcement on
  `apps/public`), the real-link pagination, and the `back_to_start` behaviour — and it **discharges
  two deferred items whose trigger is this story**. ⚠ The AC's *"cursor-based … non-guessable
  cursors"* clause is then **recorded as an explicit written deviation with this reason** — ⛔ never
  silently dropped.
- **(b)** ⛔ *Not chosen.* Replace with signed opaque cursors. ⚠ Breaks the gate leg's `parsePageParams` contract,
  the shipped links and their tests, and needs signing key material — while leaving the enumeration
  surface unchanged.
- **(c)** ⛔ *Not chosen.* Offset URLs + an internal keyset cursor. ⚠ More machinery for a query-plan benefit
  no measured page size justifies today.

### D3 — Which members appear, and what happens to a suspended member? — ✅ **RULED (a) (BigDev, 2026-08-20)**

- **(a) ✅ RULED — lifecycle ∈ `{active, active-in-grace, lock-in}` AND moderation ∉
  `{suspended, terminated}`.** ⚠ **Its cost, stated plainly and raised to the Panel:** a suspension
  then silently removes a member from the public directory — a member-visible consequence of a
  moderation act that ⛔ **no clause of the Niyamavali describes**. Recorded as a **new open finding**
  in the Policy-meaning note and in Task 1's decision-log entry, ⛔ not absorbed.
- **(b)** ⛔ *Not chosen.* Suspension keeps the listing (matching *"suspension keeps the roster"*, 10.20), rendering
  nothing about the sanction. ⚠ Then the public page asserts current membership for a member under
  sanction — a statement to the internet that no ruling authorises either.
- **(c)** ⛔ *Not chosen.* `active` + `active-in-grace` only. ⛔ Contradicts the epic's own field row, which
  declares the status pill as *"active / lock-in only"*.

### D4 — What ships for `directory-abuse-rules.yaml` and the console? — ✅ **RULED (a) (BigDev, 2026-08-20)**

- **(a) ✅ RULED — the rules file **and** the enforcement that reads it; the console VIEW is
  deferred with a named trigger.** Abuse signals land as §1.5 audit lines, queryable through the
  existing Story 1.10 surface, so the signal is real and reachable today. ⛔ The record says plainly
  that no purpose-built view exists yet.
  ⚠ **The ruling's rationale is BOUNDED by Trap 8, and the bound is part of the ruling as
  implemented:** *"real and reachable"* is true; *"triageable"* is ⛔ **not**. No column stores the
  query context — it is hashed into `request_payload_hash` — so the line proves a rule fired and
  when, ⛔ not what was walked. ⇒ the rule id + a coarse query shape must be pushed into `action` /
  `resource_locator`, and the console deferral in `deferred-work.md` **inherits this limit and must
  name it**. ⛔ Do not let the deferral read as though a richer signal is already waiting.
- **(b)** ⛔ *Not chosen.* Build the admin console surface too. ⚠ An Epic-10-shaped operator surface (RBAC key
  mint, route, list view, i18n, tests) inside a public-shell story — the scope shape 11a.2's D5(b)
  was rejected for.
- **(c)** ⛔ *Not chosen.* Rules file only. ⛔ A committed governance artifact nothing reads is the vacuous-green
  defect Story 11a.1 existed to remove.

### D5 — Does `/members` stay `edge_cacheable` now that it renders named members? — ✅ **RULED (a) (BigDev, 2026-08-20)**

- **(a) ✅ RULED — it stays `edge_cacheable`, and the detection cost is RECORDED.** The content is
  `public` tier by Panel ruling, so it is cacheable by construction, and the cache absorbs scraper
  load. ⚠ **Trap 4** is the cost: a cached hit never reaches the origin, so the throttle and the
  abuse audit lines see only misses. ⚠ **Inert today** (no edge in this repo; §5.8a) but recorded as
  a **named dependency** with an edge-configuration re-trigger.
- **(b)** ⛔ *Not chosen.* `private_no_store`, so every request reaches the origin and is throttleable. ⚠ Discards
  the edge for the flagship public surface and sits oddly with a tier model in which public content
  is cacheable by construction.
- **(c)** ⛔ *Not chosen.* Cache page 1 only. ⛔ Needs a per-branch cache header, which `detectCacheSignal`'s
  whole-file textual scan is structurally blind to — the exact hazard the `/blog/[postId]` 404 patch
  just fixed.

### D6 — `critical_render_path_ms`: discharge, partial-discharge, or re-defer? — ✅ **RULED (a) (BigDev, 2026-08-20)**

- **(a) ✅ RULED — partial discharge.** Measure the **dynamic SSR HTML** of `/members` at realistic
  page sizes — the quantity that actually varies with directory data, and the one 11a.2's static
  attribution explicitly does **not** capture. Re-defer only the device-throttled Lighthouse harness,
  with a **new** reason. ⭐ Avoids a second consecutive re-deferral on the same reason, which is
  **decay, not deferral** ([[feedback_mechanization_split_commitment]]).
- **(b)** ⛔ *Not chosen.* Full discharge — build the throttled Lighthouse-CI harness. ⚠ Separate CI
  infrastructure on a surface story's critical path (11a.2 D5(a)'s reasoning, unchanged).
- **(c)** ⛔ *Not chosen.* Re-defer both. ⛔ The trigger family has now fired at 2.6, 10.5, 11a.2 and 11a.3.

---

## Tasks / Subtasks

### Coverage matrix — every AC → its task(s)

| AC | Tasks |
|---|---|
| AC1 `public-pages` module + route + no KMS in `apps/public` | T3, T4, T5 |
| AC2 one bounded set-based roster read | T2 |
| AC3 presentation policy PROVEN configurable | T4, T7 |
| AC4 tier-leak leg stops being vacuous | T6, T7, T12 |
| AC5 `<MatrixField>` first real call site | T7, T12 |
| AC6 anti-enumeration mechanized | T3, T5, T8, T9, T12 |
| AC7 cache re-decided + Trap 4 recorded | T6, T9, T13 |
| AC8 `critical_render_path_ms` partial discharge | T10, T13 |
| AC9 i18n / microcopy / inventory / friction-budget / a11y | T7, T11 |
| AC10 revert-sanity | T12 |
| AC11 legitimacy-not-social-graph invariant | T7, T9 |

### Task 0 — Branch, baseline, rulings (AC: all)
- [x] ✅ **D1–D6 are already ruled** (BigDev, 2026-08-20, all as recommended) and §Decisions records
      them. ⛔ No halt. ⛔ Do not re-open a ruling mid-implementation — if one looks wrong once the
      code is in front of you, **stop and raise it**, ⛔ never silently deviate
      ([[feedback_supersede_never_reinterpret]]).
- [x] `git fetch origin`; confirm `origin/main` is still `1bc46e0`. Branch off `main`.
- [x] ⛔ Confirm `pnpm pii:check` is **green before you start** and record the surface/field/snapshot
      counts, so any later failure is provably **yours**
      ([[feedback_verify_before_committing_governance_claims]]).
- [x] ⚠ Re-verify **live** that GitHub Actions is working this session; ⛔ never infer it from the
      record ([[project_ci_actions_suspension_local_mirror]]).

### Task 1 — `governance:` — the decision-log entry (AC: all) — ⭐ **COMMITS FIRST, ALONE**
- [x] Write `.decision-log.md` entry **`2026-08-20-143`** recording **D1–D6 as ruled by BigDev on
      2026-08-20 (each as recommended)**, plus:
      - ⭐ **Trap 1** — the `authenticated_member` column of the AC's table has **no viewer** and is
        structurally unbuildable at this story (verified: token-bearer members, no `apps/member-web`,
        no mobile directory screen); routed onto 11a.2's fragment-mechanism deferral.
      - ⭐ **The NEW open finding for the Panel** (Policy meaning §2): under D3(a) a **suspension
        removes a member from the public directory**, and the status pill **publishes lock-in
        status**, and ⛔ **no Niyamavali clause describes either**. ⛔ Raised, not closed.
      - ⚠ **`2026-08-20-140` cl.7 remains OPEN** and is now sharpest — the page prints names while
        the rulebook still records no directory publication. ⛔ Not closed here.
      - ⛔ **One verified cross-reference error and TWO clauses with no subject**: `epics.md` Story
        11a.4 cites *"Story 10.6 query throttling"* — **10.6 is the Bulk Operations Framework** (the
        C3 shape); and on this surface **both** the AC's *"authenticated session does NOT bypass rate
        limits"* **and** its *"abuse-detected accounts trigger temporary suspension + trustee
        review"* have **no subject**, because every visitor is unauthenticated (**Trap 1**). ⛔ Record
        both — a clause answered nowhere is indistinguishable from a clause quietly skipped.
      - ⭐ **Trap 8** — the abuse audit line is a **counter, not a forensic record**: no column stores
        the query context (it is hashed), and the unauthenticated locator is the constant
        `user:anonymous`. ⇒ **D4(a)'s "reachable today" is true; "triageable today" is not**, and the
        console deferral inherits that limit ([[feedback_closure_language_precision]]).
      - ⚠ **Trap 3** — `trustProxy: true` makes the forwarded IP caller-supplied; recorded as a
        network precondition, ⛔ **not** re-tuned globally on a surface story.
      - ⚠ **Trap 4** — edge caching hides scraper traffic from origin-side detection.
- [x] Commit `governance(11a.3): …` **before any code**
      ([[feedback_governance_commits_precede_implementation]] — history must read governance →
      implementation).
- [x] ⛔ **Nothing mechanically verifies this entry exists — which is precisely why it is a
      precondition, not a formality.** `checkEscalationAttestation` (`gate.ts:416-447`) tests
      `^###\s+Decision\s+<id>` **only for entries in `matrix.escalations`**, and Task 6 correctly adds
      **no** escalation entry (**Trap 5**). ⇒ the gate will never look for `2026-08-20-143`. ⚠ Match
      the existing `### Decision <id>: **<title>**` heading format anyway — the leg *does* check the
      standing `-136` citation, and a reformat there breaks a green leg.

### Task 2 — The domain roster read (AC: 2) — `packages/domain/src/member/`
- [x] ⭐ **Read `surveys/read.ts:303-316` and `news-blog/audience.ts:163-171` FIRST.** They already
      resolve latest-posting district for a whole member cohort in ONE query — ⛔ this task adapts
      that shape, it does not invent one (**Trap 6**).
- [x] New accessor (e.g. `directory-read.ts`) resolving ONE page in ONE query: `member_id`, current
      lifecycle `state`, latest posting `district`, `name_ciphertext`. ⛔ No per-member fan-out.
- [x] Latest posting uses the committed **D3 comparator `created_at DESC, posting_id DESC`**
      (**Trap 6a**) — ⛔ **never `created_at DESC` alone**; five files coordinate on it under
      *"Change one, check the other"*, and dropping the tie-break makes same-`created_at` rows
      non-deterministic, breaking AC2's own paging-stability clause. ⚠ With `DISTINCT ON`, the
      `ORDER BY` must lead with the `DISTINCT ON` expression (**42P10**) ⇒
      `DISTINCT ON (member_id) … ORDER BY member_id, created_at DESC, posting_id DESC`.
      ⛔ Mirror `moderation/read.ts:258`'s **complete tie-break chain**, not just its keyword.
- [x] ⛔ Do **not** interpolate an outer `Column` into a same-named-column subquery
      ([[project_epic6_drizzle_correlated_subquery_bug]] — DB-free tests cannot catch it). ⭐ The
      precedents' mitigation is **raw quoted identifiers** (`p.member_id = "members"."member_id"`) —
      ⛔ do not "tidy" them back into `${members.memberId}`.
- [x] District is the **raw posting string, resolved as of now** (`created_at <= <now>`), ⛔ **not**
      lifted through the geo tree — lifting is what *audience* readers do to decide eligibility, and
      a display attribute acquiring policy meaning is the §2.13.2 violation.
- [x] `limit` through `clampLimit`; `offset` bounded; stable `member_id ASC` ordering.
- [x] Roster predicate per **D3(a)**: lifecycle ∈ `{active, active-in-grace, lock-in}` **AND**
      moderation ∉ `{suspended, terminated}`. ⛔ Never a `.filter()` in JS after an unbounded read.
- [x] Also expose a **bounded total-row count** for the same predicate — the honest "next" link and
      the page ceiling both need it. ⛔ Do not derive "there is a next page" from a full-page result.
- [x] Transport-free: ⛔ no HTTP, ⛔ no audit, ⛔ no decrypt, ⛔ no permission check.
- [x] Live-DB spec: RLS scoping, each excluded state, a suspended member absent, a member with no
      posting row, deterministic paging across two pages, and ⛔ **assert membership, not counts**
      ([[project_live_db_test_gotchas]]).

### Task 3 — `apps/api/src/modules/public-pages/` (AC: 1, 6) — ⭐ **the module lands WITH its route**
- [x] `handlers.ts` / `routes.ts` / `index.ts` in the house module shape; register in `server.ts` in
      the load-bearing order. ⛔ Never an empty module.
- [x] One collection-returning `GET` with a `.strict()` request schema carrying a **bounded `limit`**
      (so the 1.14 OpenAPI forced-pagination guard covers it) and the `page` ceiling.
- [x] `config: { rateLimit: limits.search }` from `namedRateLimits(deps)`, **unmodified**. ⛔ Not
      `limits.read`, ⛔ not an inline ceiling, ⛔ **and not a hand-rolled `keyGenerator`** —
      `perSessionKey` already falls through to `request.ip`, which `trustProxy: true` reads from the
      forwarded chain. The forwarding work is in T5, ⛔ not here.
- [x] **Trap 2** — assert in a test that two different forwarded addresses land in **different**
      buckets. ⚠ This tests the *inherited* key, and it is the only thing standing between the
      shipped ceiling and one global bucket.
- [x] Add the route to `login-wall.spec.ts` `PUBLIC_ALLOWLIST` **with its written defence** (10.21
      AC-R1 style): why unauthenticated, and what bounds it instead. ⛔ A bare line is the failure
      mode that entry exists to prevent.
- [x] Regenerate + commit `openapi/v1.yaml` (`emit-openapi.ts`); ⚠ the determinism check must stay
      green.
- [x] ⚠ **Verify, do not rebuild**: the global `X-Robots-Tag` hook already covers this route.

### Task 4 — Decrypt + presentation policy at the handler (AC: 1, 3)
- [x] Resolve the mode **once per request** via `resolvePublicNamePresentationMode`; ⛔ never per row.
- [x] Decrypt each `name_ciphertext` with the existing `decryptKycField` under
      `MEMBER_KYC_FIELD_CLASS` + the member's real `pariwarId`. ⛔ No new field class or namespace.
- [x] Pass the decrypted name to `resolvePublicMemberName(mode, storedName)` — ⭐ its **first call
      site**. ⛔ No local `splitFirstNameLastInitial` re-implementation, ⛔ no literal `full_name`.
- [x] `''` ⇒ **omit the row**. ⛔ Never a blank name cell.
- [x] Configurability test (`-136` cl.1/cl.2/cl.3): `shielded_name` → `"Rajesh S."`, `full_name` /
      no row → full legal name, **and `name_ciphertext` byte-identical across flip and flip-back**.
- [x] ⛔ The response carries **only** the classified fields. ⛔ No `member_id`, no ciphertext, no
      mobile, no email, no internal state values beyond the ruled pill labels — a public JSON route
      that over-returns is a leak the HTML tier-leak leg cannot see.

### Task 5 — `apps/public` consumes the route (AC: 1, 6)
- [x] A small server-only client (`apps/public/src/lib/directory.server.ts`) — `fetch` with an
      explicit **timeout** and a typed parse. ⛔ No retry storm on a public page.
- [x] Forward the visitor address: `Astro.clientAddress` appended to any inbound `X-Forwarded-For`
      chain (**Trap 2**).
- [x] Add the API origin env var to `turbo.json` `globalEnv` (mirroring `PUBLIC_PARIWAR_ID` /
      `PUBLIC_SITE_ORIGIN`) and validate it at boot, ⛔ not mid-request.
- [x] A **failure state**: an unreachable or slow API renders a dignified error, ⛔ never a page
      that looks like an empty directory. ⚠ Record it in the empty-state inventory (T11).
- [x] ⭐ **AC1's absence proof**: assert `apps/public` imports no encryption symbol and declares no
      `kekRef` — ⛔ an absence nobody checks is an absence that regresses.

### Task 6 — Matrix + the six "armed but empty" records (AC: 4, 7) — **Trap 5**
- [x] Add the `member_status` field to `member-directory` (`tier: public`, `pii_tier: 3`) with a
      `description:` naming Decision `2026-08-20-143` and the two labels it may carry.
- [x] ⛔ **Do NOT add an `escalations:` entry for it** — `MatrixEscalationSchema` requires a real
      `from` tier and rejects a non-escalation; a first-time classification is ⛔ **not** an
      escalation (11a.1's own ledger header). ⛔ Never invent a `from`, ⛔ never weaken the parser.
- [x] Rewrite the surface `description:` — it currently says the leg is **armed but empty**. Same for
      the `cache_policy` comment, which currently instructs *"11a.3 MUST RE-DECIDE THIS"* (AC7).
- [x] ⛔ No `block` / `school` / `designation` / `pool_participation` / `registration_date` rows. ⚠ A
      committed test asserts the first three are absent — keep it passing.
- [x] Re-verify `turbo.json` `contracts:check-pii-scrape.inputs` still covers **every** path the gate
      reads (11a.2 Trap 6 — a gate reading outside its `inputs` passes on stale bytes).

### Task 7 — The render (AC: 3, 4, 5, 9, 11) — `apps/public/src/lib/` + `members.astro`
- [x] Extend `MembersRenderModel` with the row list; map every rendered member attribute in
      `MEMBERS_FIELD_IDS` to its snake_case id (**Trap 7**). ⛔ No mechanical case converter.
- [x] ⛔ **All** display logic stays in the pure `members-render.ts`; `members.astro` stays a thin
      wrapper. On this surface that is a **gate evasion** before it is a style choice.
- [x] Render every member value through `<MatrixField>` — ⭐ its first real call site (AC5). ⛔ Do not
      modify the component to fit; if it does not fit, **stop and raise it**.
- [x] Honest "next" link derived from the **real** row count (T2), replacing the 11a.2 suppression.
- [x] a11y: semantic structure, ARIA, keyboard-reachable **real link** pagination, visible
      `:focus-visible`, `@twt/tokens` only. ⛔ No Tailwind.
- [x] Record the **legitimacy-not-social-graph invariant** (AC11) in the page header and the render
      module doc-block, with the prohibited/acceptable lists and the design-time test.
- [x] ⭐ Re-verify the `?raw` matrix bytes reach a **real `dist/` build** now that the module is no
      longer tree-shaken, and record the result (AC5).

### Task 8 — The deep-pagination horizon (AC: 6.2) — `apps/public/src/lib/pagination.ts`
- [x] New decidable rejection reason mirroring `limit_above_cap`, with a **named exported constant +
      rationale**, chosen against the real row count now available.
- [x] ⇒ **Discharges** `deferred-work.md:5660` (`page` has no upper bound) and `:5663` (offset
      precision loss) — ⛔ both must be marked closed **by edit**, in the project's closure language
      ([[feedback_closure_language_precision]]).
- [x] ⛔ Keep the rejection **rejection-invariant**: `?page=all`, over-cap, over-horizon and
      non-integer must still produce **byte-identical** output so a prober learns nothing about which
      bound it hit. ⚠ A new reason must not leak into the DOM.
- [x] ⚠ Mirror the ceiling at the API route (T3) — the two surfaces must not drift into two horizons.

### Task 9 — `directory-abuse-rules.yaml` + detection (AC: 6.4, 7, 11) — ✅ **D4(a)**
- [x] A committed, versioned, **strictly parsed** rules file (unknown keys throw; a malformed file
      **throws**, ⛔ never degrades to "no rules" — the `parseCapabilityBar` doctrine).
- [x] Triggers per the AC: high-volume lookups · repeated district-wide queries · deep-crawl /
      rapid-pagination patterns.
- [x] **Read by the route** (T3); a breach emits a §1.5 audit line through **`deps.auditSink.emit`**
      — ⛔ never `writeAuditEntry` directly (its header states producers do not call it). ⛔ A rules
      file nothing reads is the vacuous-green defect.
- [x] ⭐ **Mint a new `AuthAuditEventType`** in `apps/api/src/audit/audit-sink.ts` (a union documented
      as **closed**) **and** its `statusForAuthEvent` mapping in `audit-log-sink.ts`, alongside
      `rate_limit.exceeded` / `abuse.honeypot`. ⛔ **Never reuse `abuse.honeypot`** — it corrupts the
      honeypot signal and breaks `security-headers.spec.ts:72`'s exact-count assertion (**Trap 8**).
- [x] ⛔ **Put the triage signal where it survives**: the rule id + a coarse, non-PII query shape go
      in **`action`** and **`resource_locator`**. ⚠ `context` is **hashed** into
      `request_payload_hash` and no column stores it — ⛔ never write a comment claiming the line
      carries the query context (**Trap 8**).
- [x] A README section in the 10.12 fence's *"⚠ What this does NOT prove — read this first"* style,
      naming: **Trap 4** (a warm edge hides scraper traffic from the origin), **Trap 3** (the
      forwarded key is caller-supplied), **Trap 8** (the audit line is a **counter, not a forensic
      record** — the query context is hashed, the unauthenticated locator is a constant), the
      in-memory per-instance rate-limit store (§1.4, no Redis ⇒ effective ceiling × instance count),
      and ⛔ that **no console view exists yet**.
- [x] Record the AC11 invariant here too — this is the file a future abuse-rule author opens.

### Task 10 — Friction budget: measure the DYNAMIC HTML (AC: 8) — ✅ **D6(a)**
- [x] Measure `/members` SSR HTML bytes at a **full page at the cap**; emit per route alongside the
      existing static attribution, ⚠ **clearly labelled as a different quantity** — ⛔ never summed
      or compared with the static numbers.
- [x] Re-defer **only** the device-throttled Lighthouse harness, with a **new** written reason and a
      new trigger. ⛔ Do not restate 11a.2's reason.
- [x] ⚠ Verify the AC-4 declaration leg **after committing** ([[project_friction_budget_baseline_ratchet]]);
      ⛔ do not ratchet a baseline on a measured rise.

### Task 11 — Copy, i18n, microcopy, inventory (AC: 9)
- [x] Extend the `members` namespace, hi + en parity. ⚠ **single-brace `{max}`** tokens; explicit
      `namespace` on every `t()` call.
- [x] ⭐ At least one test through the **real `t()` path** for this page — ⛔ not only a hand-built
      `MembersLabels` fixture, which is exactly what hid the 11a.2 throw-on-every-request defect.
- [x] ⚠ Verify both locale files are still in `microcopy.yaml` `copy_globs`.
- [x] `docs/ux/empty-skeleton-error-inventory.md` §7: fill the **Populated** row, replace the
      "no next affordance" note, add the **API-unreachable** state (T5). ⛔ No `<TBD>`, ⛔ no
      fabricated ratification. ⛔ Row 6 closure criteria not relaxed.
- [x] `friction-budget.md` — affirm or add the named-payer declaration.

### Task 12 — Revert-sanity (AC: 10) — ⭐ **run it, do not reason about it**
- [x] One **independently planted** violation per detection route (the eight in AC10). ⛔ Never one
      fixture tripping several checks — that is the recording gap 11a.2's own review flagged.
- [x] ⭐ Include the **rate-limit-key** control (different forwarded addresses ⇒ different buckets).
      ⛔ Without it, Trap 2 passes every other test in the suite.
- [x] Prove live against real planted files; record exit codes in Completion Notes; revert; confirm
      the tree is clean.

### Task 13 — Records (AC: 4, 6, 7, 8)
- [x] `deferred-work.md`: **close** the two pagination items and the *"armed but empty"* entry **by
      edit**; add the console-view deferral (⛔ **naming the Trap-8 limit it inherits** — the signal
      it will render is a counter, not a forensic record), the Trap-3 network precondition, the
      Trap-4 edge dependency, the `authenticated_member`-tier routing, and the D2 cursor deviation.
      ⛔ Use the project's closure language exactly ([[feedback_closure_language_precision]]).
- [x] `gate-inventory.md`: the `pii-scrape` row's *"tier-leak leg on `member-directory` still
      VACUOUS"* caveat is **retired**, and the abuse-rules + friction-budget rows updated.
- [x] Story record + `sprint-status.yaml` — ⛔ flip **only** `development_status[11a-3-…]`;
      `epic-11a` stays `in-progress` (3 stories remain after this one).
- [x] ⛔ **REBASE-merge this multi-commit story, NEVER squash** — the `governance:` commit must stay
      first ([[project_story_automator_ops]]).

---

### Review Findings

Code review run 2026-08-21 against baseline `1bc46e0` (verified live == `origin/main`). Three layers:
Blind Hunter (diff only), Edge Case Hunter (diff + read access), Acceptance Auditor (diff + this spec).

- [x] [Review][Patch] Directory `total` is roster size, not rendered-item count — APPLIED. `handlers.ts` now carries an explicit comment at the `total` computation recording the resolution; the contract's own doc comment (`packages/contracts/src/public-pages/directory.ts:108-112`) already stated this precisely and needed no change. No omission metric added. [apps/api/src/modules/public-pages/handlers.ts; packages/contracts/src/public-pages/directory.ts]
- [x] [Review][Defer] IP-based anti-enumeration keying is spoofable end-to-end — `apps/public/src/lib/directory.server.ts` builds the forwarded-IP chain from caller-supplied `X-Forwarded-For` without validating/stripping it before it reaches `apps/api`'s `trustProxy:true` rate-limit/abuse keying, and nothing in this diff adds a code-level control restricting direct calls to `apps/api` that skip the public SSR hop — Trap 3's "network precondition" is prose-only [apps/public/src/lib/directory.server.ts:91-104; apps/api/src/modules/public-pages/routes.ts] — deferred, pre-existing: RESOLVED (BigDev, 2026-08-21) to be an infra-layer control (network ACL / mTLS between `apps/public` and `apps/api`), not a code change in this diff.
- [x] [Review][Patch] No per-Pariwar directory-publication enablement flag — APPLIED. New `pariwar_directory_publication` table (migration `0111`, mirroring `pariwar_public_name_presentation`'s governance shape exactly: rationale + actor + display snapshot + §1.5 audit anchor required, `pariwar.manage_directory_publication` permission key minted, `super_admin` only, catalog version 37→38), a governed domain module (`packages/domain/src/member/directory-publication.ts`: `resolveDirectoryPublicationEnabled` / `setDirectoryPublicationEnabled`), and a gate at the TOP of `handlers.ts` returning the SAME `{items:[],total:0}` shape as an empty roster when disabled (⛔ not a distinct error — would itself be a new existence oracle). ⛔ NO self-serve admin toggle UI shipped — the mechanism exists ungated by UI, mirroring 11a.1's own posture for the presentation-mode table; a console surface is a follow-up story if wanted. ✅ **VERIFIED LIVE (2026-08-21)** against `twt-test-pg` (:5433): migration `0111` applied clean, RLS force-enabled confirmed via `pg_class`, `directory-publication-policy.spec.ts` 16/16, `member-directory.spec.ts` 11/11, full `@twt/domain` + `@twt/api` live regression zero failures. [packages/domain/src/schema/pariwar_directory_publication.ts; packages/domain/migrations/0111_directory-publication.sql; packages/domain/src/member/directory-publication.ts; packages/domain/src/rbac/permissions.ts; apps/api/src/modules/public-pages/handlers.ts]
- [x] [Review][Patch] Branch bundles unrelated Story 11a.4 authoring work — APPLIED (git action, 2026-08-21). `story/11a.3`'s history was rewritten: `440bde6` now carries only 11a.3's own record (its 11a-4-bundling paragraph removed from the commit message), so the 11a-4 story file and its `sprint-status.yaml` row flip never land on this branch. 11a.4's authoring output moved to its own `story/11a.4-phone-email-obfuscation` branch off `main`, in a `chore(11a.4): story record + sprint-status → ready-for-dev` commit. `story/11a.3` now flips **only** `development_status[11a-3-…]`, per Task 13. A local backup of the pre-rewrite branch tip is kept at `story-11a3-backup-before-split` (470fd3e) in case anything needs recovering. [_bmad-output/implementation-artifacts/sprint-status.yaml]

- [x] [Review][Patch] Sequential per-row KMS decrypt has no batching — APPLIED. Rewritten as `Promise.all(rows.map(...))`, index-aligned so the deterministic roster order survives concurrent resolution [apps/api/src/modules/public-pages/handlers.ts]
- [x] [Review][Patch] Abuse detector's outer `catch` is unlogged and too broad — APPLIED. Added `console.error` logging on the catch, and `win.emitted` is now set AFTER `auditSink.emit` rather than before [apps/api/src/modules/public-pages/abuse-rules.ts]
- [x] [Review][Patch] Module-global `windows` Map leaks abuse-counter state across tests — APPLIED. Shared `beforeEach(() => __resetDirectoryAbuseCounters())` added to `member-directory.spec.ts`'s top-level `describe`; the now-redundant inline reset removed [apps/api/tests/integration/public-pages/member-directory.spec.ts]
- [x] [Review][Patch] The "nothing else leaks" test is a raw substring scan — APPLIED. Replaced with `PublicDirectoryResponse.safeParse(body).success` (the real `.strict()` wire contract); the `enc:` substring scan kept alongside it (schema validation proves no extra KEY, not that a permitted key's VALUE is clean) [apps/api/tests/integration/public-pages/member-directory.spec.ts]
- [x] [Review][Patch] `resourceLocator` enforced only by a comment — APPLIED. Added a locator-shape regex guard (`RESOURCE_LOCATOR_PATTERN`) in `authEventToAuditInput`; an override failing it falls back to the safe default instead of being written as-is, with a logged warning [apps/api/src/audit/audit-log-sink.ts]
- [x] [Review][Dismiss — corrected on inspection] `evaluateDirectoryAbuse` runs before `pariwarId` is confirmed to resolve to a real Pariwar — **the premise doesn't hold.** Verified: nothing in this route (or `openScopeTx`, or the domain accessors) ever checks that a Pariwar with the given id EXISTS — `openScopeTx` only re-validates the UUID is syntactically well-formed. A nonexistent Pariwar returns the identical `{items:[],total:0}` shape as a real Pariwar with zero visible members, BY DESIGN — that's an anti-enumeration property (not leaking Pariwar existence through the response), not an oversight. Adding an "exists" check to move the detector after it would be a regression against that property, not a fix: it would let an attacker binary-search which UUIDs are real Pariwars by watching for abuse-counter/audit-line side effects. Not applied. [apps/api/src/modules/public-pages/handlers.ts:66-86; apps/api/src/modules/multi-tenant/scope-tx.ts]
- [x] [Review][Patch] An unresolvable/corrupted `nameCiphertext` row throws uncaught inside the per-row decrypt loop — APPLIED. Wrapped in try/catch, logs and omits just that row (mirrors `resolvePoolIdentity`'s fail-soft precedent) [apps/api/src/modules/public-pages/handlers.ts]
- [x] [Review][Patch] `row.district === ''` fails the response schema's `.min(1)` and 500s the page — APPLIED. Normalized `district: row.district === '' ? null : row.district` [apps/api/src/modules/public-pages/handlers.ts]
- [x] [Review][Patch] A valid page number past the roster's actual last page renders the same "not yet published" notice — APPLIED. New `pastEnd` model key (`total > 0 && rows.length === 0`), its own copy (`past_end_title`/`past_end_body`, both locales), distinct rendering branch in `members.astro`, and test coverage (`members-render.test.ts`, `members-copy.test.ts`, `scrape-test.spec.ts`'s exact-key-set assertion updated) [apps/public/src/pages/members.astro; apps/public/src/lib/{members-render,surface-fields}.ts; packages/i18n/locales/{en,hi}/members.json]
- [x] [Review][Patch] AC6.1's page-size cap re-declared with no drift-guard test — APPLIED. New `apps/api/tests/unit/directory-page-size-cap.test.ts` asserting `DIRECTORY_PAGE_SIZE_CAP === PUBLIC_SURFACE_PAGE_SIZE_CAP` (2 tests, passing) [apps/api/tests/unit/directory-page-size-cap.test.ts]
- [x] [Review][Patch] Three governance commits not reflected in the story's own Dev Agent Record — APPLIED. Change Log backfilled with all three (`7aee1c3`, `f1b1456`, `12c7915`) plus this review pass itself; File List updated [this story file]
- [x] [Review][Patch] AC4's two planted negative controls both fabricated, tier-based half unproven — APPLIED. Added CONTROL 4: clones the real matrix, downgrades `member_name`'s tier to `authenticated_member` (simulating the pre-`2026-08-19-136` state — the field's own real escalation history), and proves `evaluateSnapshot` fails it. CONTROL 2's comment corrected to state honestly that no REAL `authenticated_member`-tier field exists on this surface to plant (Trap 1), so it and CONTROL 1 both test the undeclared-field half, not the tier-ceiling half [apps/public/tests/integration/public-pages/scrape-test.spec.ts]

- [x] [Review][Defer] D6's negative control (swapping `"members"."member_id"` for interpolated `${members.memberId}`) passes (exit 0) — it does not catch the Epic-6-class correlated-subquery regression it was planted to catch [11a-3 story file — Debug Log References, D6 row] — deferred, pre-existing: Drizzle correlated-subquery collapse is undetectable by a DB-free static control (Epic 6 retro), honestly documented in the story's own Debug Log rather than hidden; needs new DB-backed tooling, not a code fix in this diff.

**Dismissed as noise (3):** `evictColdest`'s O(n log n) sort is bounded by the 10k-key cap (~140k comparisons, sub-millisecond) — not a real amplification risk · the `row.state === 'lock-in' ? 'waiting-period' : 'active'` ternary is a verified false positive — `row.state` is type- and query-narrowed to exactly `{active, active-in-grace, lock-in}` before reaching this line, and `active-in-grace → active` is the explicitly ruled mapping (`2026-08-20-143` D3(a)), guarded by a dedicated negative-control suite (`public-pages-directory-vocabulary.test.ts`) · a Postgres bigint count exceeding `Number.MAX_SAFE_INTEGER` is practically unreachable for a Pariwar-scoped member count.

---

### Review Findings — SECOND ROUND (2026-08-21)

Second code review run against the same baseline `1bc46e0`, over the **post-patch** tree (i.e. against
`0d18fa3`, which already carries the first round's 17 applied patches). Three layers: Blind Hunter
(diff only), Edge Case Hunter (diff + read access), Acceptance Auditor (diff + this spec + the AI-6-5
load-bearing-invariant checklist).

⚠ **The first two layer launches died on an account session limit and were relaunched.** The relaunched
Edge Case Hunter and Acceptance Auditor were primed with the twelve findings the Blind Hunter had
already produced, so they hunted new ground rather than re-deriving. ⛔ Recorded because it means the
two later layers did **not** independently re-discover those twelve — an absence of corroboration is
not corroboration ([[feedback_record_unattested_no_backfill]]).

**38 raised → 2 merged → 36 unique: 4 decision-needed, 30 patch, 2 dismissed.**

> ✅ **ALL 34 ACTIONABLE FINDINGS APPLIED (2026-08-21).** The 4 decisions were ruled by BigDev and
> committed as **`2026-08-21-145`** — a `governance:` commit landing **BEFORE** any implementing
> code ([[feedback_governance_commits_precede_implementation]]), which is precisely the discipline
> the kill-switch finding in this same round says was skipped last time.
>
> **Commits, in order:** `5bed467` (governance) → `f186c8c` (RD1–RD4) → `15af092` (render / scripts /
> contracts) → `c4aad0f` (test integrity + records + the missing coverage).
>
> ✅ **Live-DB regression — RAN, GREEN.** Against `twt-test-pg` (:5433): `@twt/domain` **3051/3052**
> (254 files, 1 pre-existing skip), `@twt/api` **1062/1063** (122 files, 1 pre-existing skip). Zero
> failures either package. ⚠ Both counts ROSE (3044→3051, 1051→1062) because this round added tests;
> ⛔ no test was deleted to make a number move.
>
> ✅ **Gates — RAN, GREEN, ⛔ not assumed:** i18n parity · pii-scrape · microcopy · schema-diff ·
> benefit-mechanism · OpenAPI determinism · typecheck + lint on all five touched packages.
>
> ⭐ **REVERT-SANITY RUN FOR REAL, ⛔ not reasoned about** (AC10 doctrine, and
> [[feedback_verify_before_committing_governance_claims]]):
> · removing the `NOT_DECEASED` conjunct fails **5 of 6** new live-DB cases — the sixth is the
>   settled-claim negative control, which correctly still passes because without the conjunct
>   everyone is published. ⛔ Recorded rather than glossed: an all-6 failure would have meant the
>   control was not independent.
> · removing the `pastEnd` `page > 1` conjunct fails **exactly one** test; removing the `hasNext`
>   horizon clamp fails **exactly one** — ⛔ neither fixture trips the other's leg.
>
> ⚠ **WHAT THIS ROUND DID NOT DO, stated rather than left to be inferred:**
> · ⛔ The **`2026-08-21-145` cl.5 disclosure is NOT a fix.** The kill switch still shipped
>   implementation-first in a `fix:` commit; the history is ⛔ not rewritten to look compliant
>   ([[feedback_record_unattested_no_backfill]]).
> · ⛔ **`2026-08-20-140` cl.7 remains OPEN and is now WIDER** — the kill switch joins the set of
>   directory-publication mechanics no Niyamavali clause describes.
> · ⛔ **`2026-08-19-136` cl.5 (DPDPA counsel) remains OPEN**, and cl.1 SHARPENS it: the surface was
>   publishing the deceased.
> · ⚠ The **edge-cache floor on the kill switch** is now recorded, ⛔ not solved — a pulled Pariwar
>   is still served from warm PoPs for up to `s-maxage`.
> · ⚠ The **`resourceLocator` widening still carries no re-examination trigger** (checklist Family 9);
>   it is now tested, but the trigger is owed.
> · ⚠ **`dynamic-html-weight.mjs` is fixed but still runs in NO CI leg** — nothing would report it
>   breaking again.

⭐ **Every finding below was verified against the tree before triage, ⛔ not taken from the layer at
face value.** Four gradings were corrected in the process; those corrections are recorded inline.

#### ⛔ Decision-needed (4) — ✅ **ALL FOUR RULED BY BIGDEV, 2026-08-21.** ⛔ Nothing here is open.

> ⭐ **These four change a RULED predicate or a Panel-governed name form.** ⛔ A dev agent must **not**
> re-open or re-interpret them; a ruling is superseded, never re-read
> ([[feedback_supersede_never_reinterpret]]). If one looks wrong once the code is in front of you,
> **stop and raise it** — ⛔ never silently deviate.
>
> ⚠ **THESE RULINGS HAVE NO INDEPENDENT RECORD YET.** This section is the only trace. ⛔ Each needs a
> `governance:` decision-log entry committed **FIRST**, before the implementing patch
> ([[feedback_governance_commits_precede_implementation]], [[feedback_record_unattested_no_backfill]]).
>
> | # | Ruling |
> |---|---|
> | **RD1 — deceased** | ✅ **(a) Add the `account-frozen` conjunct + rule it.** Treated as a launch-blocking defect. `directoryRosterPredicate` gains a third conjunct excluding account-frozen members; a decision-log entry **SUPERSEDES D3(a)**; the member-facing sentence is updated; `overlay.ts:17`'s stale *"Story 6.1 does NOT exist yet"* comment is corrected. |
> | **RD2 — XFF key** | ✅ **(a) Stop trusting the inbound chain.** `apps/public` sends **ONLY** `Astro.clientAddress`, discarding the browser-supplied chain; the doc-block's *"standard's own semantics"* rationale is rewritten to say why the standard loses to the threat model here. ⭐ **AC10's vacuous test is fixed**: it must assert a **MULTI-element** chain keys on the address we chose. ⛔ `trustProxy` is **NOT** touched — Trap 3 stands. |
> | **RD3 — mononym** | ✅ **(a) Omit the row via the existing `''` fail-soft.** `shielded_name` over a single-token name returns `''`, which the caller already treats as *"omit this row"* (the `pool-identity.ts` precedent AC2 cites). ⭐ **Fails CLOSED**: a member whose name cannot be shielded is ⛔ not published unshielded. Decision-log line, ⛔ not a Panel ruling — the shield's *meaning* is unchanged, only its behaviour on an input it silently mishandled. |
> | **RD4 — rapid_pagination** | ✅ **(c) Both — depth rule + a separate rate rule.** The existing rule is renamed to name **depth** honestly; a **second** rule measures actual pagination velocity (page transitions per window). Rules-file version bumped. ⭐ Keeps faith with AC6.4's **three** named triggers rather than collapsing two of them into one mismeasured rule. |

**The four, as originally raised:**

- [x] [Review][Decision] ⭐ **CRITICAL — a DECEASED member is published on the open internet, name decrypted from Tier-1, status pill reading "Active".** `MEMBER_LIFECYCLE_STATES` has ⛔ **no `deceased` label** (`packages/domain/src/schema/members.ts:61-71`), so death never touches `members.state`; death is carried by the **`account-frozen` overlay**, which `packages/domain/src/member/overlay.ts:4-5` says is *"NEVER written to `members.state`"*. `directoryRosterPredicate` (`packages/domain/src/member/directory-read.ts:159-166`) consults exactly two things — `members.state` and the moderation subquery — and ⛔ **never the overlay**; `getMemberAccountOverlay` has ⛔ **zero production call sites**. ⚠ `overlay.ts:17`'s *"Story 6.1 does NOT exist yet … the overlay is always not-frozen"* is **STALE** — Epic 6 shipped: `apps/api/src/server.ts:149` wires `POST /member/claims/intake` → `claim.intake_initiated`, and both member and helpline intake paths are live. ⇒ a member whose death has been reported appears on the unauthenticated directory **indefinitely, including while their family's claim is in intake**. ⭐ This is also a **Family 11 (AI-10-1) breach**: §Policy-meaning enumerates the predicate's inputs as *"`members.state` and the moderation status"* and stops — the sentence never written is *"your name stays on the public directory marked Active after you die"*, which nobody ruled and which cuts against the dignity posture In Memoriam exists to serve. ⛔ **D3(a) ruled this predicate; adding a third conjunct SUPERSEDES a ruling and needs its own** ([[feedback_supersede_never_reinterpret]]). **Options:** (a) add an account-frozen conjunct + a `deceased` render disposition; (b) rule that publication survives death and say so in the member-facing sentence. [packages/domain/src/member/directory-read.ts:159-166; packages/domain/src/member/overlay.ts:17]
- [x] [Review][Decision] ⭐ **CRITICAL — the anti-enumeration key is ATTACKER-CHOSEN; AC6.3, AC6.4 and AC10 all fall to one request header.** `buildForwardedFor` **appends** the real visitor to the **caller-supplied** inbound chain (`apps/public/src/lib/directory.server.ts:91-103`), and `trustProxy: true` reads the **LEFTMOST** entry — ✅ **verified empirically**, not reasoned: `@fastify/proxy-addr` with trust-all over `'1.2.3.4, 9.9.9.9'` returns `1.2.3.4`. ⇒ `X-Forwarded-For: 10.0.0.<n>` yields a fresh rate-limit bucket **and** a fresh abuse-counter window per request; rotating `<n>` defeats every safeguard, and 10k rotations thrash `MAX_TRACKED_KEYS`, evicting genuine visitors' counters. ⛔ **The first round's deferral does NOT cover this**: that one was *"calls that SKIP the SSR hop"* → resolved to an infra ACL/mTLS control; this attack goes **THROUGH** the legitimate hop, so a network ACL does nothing. ⭐ **AC10's guard passes vacuously**: `rate-limit-key.spec.ts:50` sends a **single-element** chain, where leftmost and rightmost are identical — the property under attack is precisely the one the test cannot see. Also falsifies Debug-Log control **C6**. Bears on **Trap 2**, **Task 5**, **AC6.3**, **AC6.4**, **AC10**. ⛔ The obvious fix (stop trusting the inbound chain) contradicts the function's own written rationale (*"that is the standard's own semantics"*), and **Trap 3 rules `trustProxy` changes out of scope** — hence a decision, not a patch. [apps/public/src/lib/directory.server.ts:91-103; apps/api/tests/integration/public-pages/rate-limit-key.spec.ts:50]
- [x] [Review][Decision] **HIGH — `shielded_name` is a silent NO-OP for mononyms: the full legal name is published under the shield.** `splitFirstNameLastInitial('Sunita')` → `{firstName:'Sunita', lastInitial:''}` → `resolvePublicMemberName` takes the `lastInitial === ''` arm and returns `firstName`, which for a mononym **is the entire stored legal name** — byte-identical to `full_name`. ⚠ The Pariwar performs the governed privacy act (`-136` cl.3) and for every single-token KYC name it does **nothing**, with ⛔ no signal anywhere. ⚠ Mononyms are common in India ⇒ ⛔ not a corner case. The helper's semantics were written for In Memoriam/Sahyog, where first-name-only **is** the shield; this story is its **first production call site** and the meaning ⛔ does not carry over. ⛔ Decision because the public name form is **Panel-governed** (`-136`), not a dev choice. **Options:** (a) omit the row (the existing `''` fail-soft path); (b) a ruled mononym shield form. [packages/domain/src/kyc/public-name.ts:77-81; packages/domain/src/kyc/name.ts:51; apps/api/src/modules/public-pages/handlers.ts:151]
- [x] [Review][Decision] **MEDIUM — `rapid_pagination` measures absolute page DEPTH, not rate; one shared link trips it on request #1.** `observed = win.deepestPage` is set from `signal.page` on the first-ever request (`apps/api/src/modules/public-pages/abuse-rules.ts:149,171-176`), so following a bookmark to `?page=45` emits `directory.abuse_suspected` with ⛔ **zero velocity measured**. The rule's own YAML description says *"advancing deep into the page range **faster than a human reads**"* — ⛔ no rate, interval, or page-transition count is computed anywhere. In a 10k-member Pariwar (horizon page 200) the **entire second half of the legitimate page range is permanently flagged**. ⛔ Decision because the fix is either the rule semantics or the ruled description — a contract question, not a code one. [apps/api/src/modules/public-pages/abuse-rules.ts:149,171-176; packages/contracts/public-pages/directory-abuse-rules.yaml]

#### Patch (30)

**Governance / closure honesty (Family 10 + Family 11 REAL GAPs — ⛔ triaged at the AC ladder, not downgraded):**

- [x] [Review][Patch] ⭐ **HIGH — the per-Pariwar kill switch is a NEW member-gating predicate that shipped with NO decision-log entry, NO policy-meaning sentence and NO Niyamavali check, inside a `fix:` commit** — the whole substrate (migration `0111`, the table, the domain module, the RLS policy, permission catalog 37→38) landed in `bf05f10 fix(11a.3): code-review patches`, and `grep "directory_publication" .decision-log.md` returns **zero hits**. `permissions.ts:5046` cites its authority as *"Story 11a.3 code review (2026-08-21, D3)"* — ⛔ colliding with this story's ruled **D3** (the roster predicate). The member-facing sentence was never updated to say *"unless your Pariwar's publication is switched off by a Super Admin"*. Violates Task 1, [[feedback_governance_commits_precede_implementation]], Project Structure Notes (*"⛔ No new DB migration is expected … stop and raise it"*), and Family 11. [packages/domain/src/rbac/permissions.ts:5046; .decision-log.md]
- [x] [Review][Patch] **HIGH — the flagship surface's `RenderSnapshot` carries no `html`, so the FR-93 naked-PII leg never runs against the ONE public render that prints member PII.** `scrape-test.spec.ts:543-547` passes `fields` but ⛔ no `html:`, while every other surface passes `html: HTML` (lines 460, 475, 487, 498). The file's committed header still asserts *"Every snapshot below now carries **BOTH** `html` and `fields`"* — ⛔ a record certifying the opposite of the truth. The substitute at :585 hand-builds `` `${r.memberName} ${r.district ?? ''} ${r.memberStatus}` `` — which that same header forbids as *"a hand-maintained list restating the render"*; a fourth rendered value escapes it silently. [apps/public/tests/integration/public-pages/scrape-test.spec.ts:543-547,585]
- [x] [Review][Patch] **HIGH — AC10's CONTROL 3 asserts a property of `Array.prototype.filter`, not of the tier-leak leg.** It calls ⛔ **no production symbol** — no `evaluateSnapshot`, no `membersSurfaceFieldIds`, no `deriveFieldIds`. It builds a 2-element array from a 3-element one and asserts it has 2 elements. Delete `MEMBER_DIRECTORY_ROW_FIELD_IDS`, delete `<MatrixField>`, delete `member_status` from the render — this test still passes. ⛔ Fake safety in the exact place the story claims its discharge proof lives. [apps/public/tests/integration/public-pages/scrape-test.spec.ts:631-637]
- [x] [Review][Patch] **MEDIUM — the "second, independent FR-91 enforcement" is attributed to the committed OpenAPI surface; the guard actually walks the LIVE in-process swagger document.** `forced-pagination.spec.ts:120` does `const doc = t.app.swagger()` and ⛔ never reads `openapi/v1.yaml`. Four committed comments claim otherwise (`emit-openapi.ts`, `routes.ts` control 2, `directory.ts` ×2, AC1's own text). ⚠ Compounds the OpenAPI drift below: in the committed file the 200 body is a `$ref`, which the guard's `isCollectionResponse` would ⛔ **not** detect — so if it were ever pointed at the file its comments name, this route would be invisible. [apps/api/tests/integration/forced-pagination.spec.ts:120]
- [x] [Review][Patch] **MEDIUM — `docs/ux/empty-skeleton-error-inventory.md` §7 still says "there is no read" on `/members`, and now names two different rows "the primary state".** Line 104 (unchanged) carries *"**Empty (the primary state today)** … ⛔ there is no read"* plus a stale `hasMembers: false` source reference; line 106 adds *"**Populated (the primary state)**"*. AC9 required the section rewritten for the surface actually shipped — the new rows landed, the falsified old row did not. [docs/ux/empty-skeleton-error-inventory.md:104,106]
- [x] [Review][Patch] **LOW — `deferred-work.md`'s new-deferrals heading was inserted mid-list, re-homing a still-OPEN item under it.** `## Deferred from: 11a-3-…` sits immediately before the `⚠ Decision 2026-08-20-140 cl.7 … remains OPEN` bullet, which belonged to the *"⚠ Carried OPEN — ⛔ not closed by this story"* section. ⇒ the one item the story is most careful to call *answered but not closed* now files as this story's new deferral. Violates [[feedback_closure_language_precision]]. [_bmad-output/implementation-artifacts/deferred-work.md]

**Caching / correctness of what the visitor is told:**

- [x] [Review][Patch] ⭐ **HIGH — the API-outage state, a 429, and the kill-switched empty roster are ALL served at HTTP 200 with `Cache-Control: public, max-age=60, s-maxage=300`.** `members.astro:155-161`'s cache branch keys on `rejection === null` only, so every non-rejection outcome takes the `edge_cacheable` arm. ⇒ one transient blip pins *"The directory could not be loaded"* into a shared edge for 5 minutes for **every** visitor, long after recovery; one visitor's 429 is cached for everyone. ⚠ The comment directly above argues the opposite for the 400 path. ⭐ Also: `pastEnd` and `apiUnavailable` are **new conditional render branches under a whole-file textual cache gate** (`detectCacheSignal`) and neither is declared gate-invisible, which Previous-story intelligence explicitly required. Violates AC7 + Trap 4. [apps/public/src/pages/members.astro:155-161]
- [x] [Review][Patch] **MEDIUM — `pastEnd` fires on page 1 when every row drops, telling the visitor "You've reached the end of the directory" on a 400-member roster.** `pastEnd = !apiUnavailable && total > 0 && rows.length === 0` (`members-render.ts:143`) — ⛔ no `accepted.page > 1` conjunct. `total` is the roster count taken **before** per-row name resolution; a KMS blip or an all-mononym `''` resolution drops every row while `total` stays 400. Same class of false statement the diff spends three i18n keys avoiding for `apiUnavailable`. [apps/public/src/lib/members-render.ts:143]
- [x] [Review][Patch] **MEDIUM — "Next page" links to a page the parser is guaranteed to reject.** `hasNext = !apiUnavailable && accepted.page * accepted.limit < total` (`members-render.ts:156`) is ⛔ not clamped by `PUBLIC_PAGE_HORIZON`. Roster 5001, limit 25, page 200 ⇒ `hasNext` true ⇒ renders `<a rel="next" href="/members?page=201">` ⇒ `parsePageParams` rejects it with `page_above_horizon` and the visitor lands on the 400 state. ⛔ No fixture in `members-render.test.ts` covers the horizon boundary (every fixture totals 2 or 5). [apps/public/src/lib/members-render.ts:156]
- [x] [Review][Patch] **MEDIUM — the edge cache defeats the kill switch, and that cost is recorded ONLY against abuse detection.** AC7/Trap 4 are written down for the throttle (*"a cached hit never reaches the origin"*) in two places — ⛔ the identical mechanism applies to the D3 kill switch and is nowhere recorded. A Pariwar pulled for a DPDPA reason keeps being served real member names from every warm PoP for up to 300s, per page number. ⛔ The one control whose justification is *"pull one Pariwar without redeploying"* has an unacknowledged multi-minute floor. [packages/contracts/public-pages/public-vs-private-matrix.yaml; apps/public/src/pages/members.astro]

**Anti-enumeration mechanism:**

- [x] [Review][Patch] **HIGH — `high_volume_lookups` threshold (60) EQUALS the `SEARCH_RATE_MAX` default (60), so it fires only at an exact boundary and dies silently if that env var is ever lowered.** ⚠ **Grading corrected** — the Blind Hunter called it *"structurally unfireable"*; verified it is not: compare is `observed < threshold → continue`, so the 60th allowed request fires. But the limiter 429s the 61st **before the handler**, so the detector only ever counts *allowed* requests — the harder a scraper hammers, the less it sees. ⛔ No guard test couples the two numbers, unlike the page-size cap which got exactly such a guard last round. [apps/api/src/modules/public-pages/abuse-rules.ts:161,178; apps/api/src/config.ts:417; packages/contracts/public-pages/directory-abuse-rules.yaml]
- [x] [Review][Patch] **MEDIUM — every `directory.abuse_suspected` line is written under the nil GLOBAL pariwar with no traceId.** The emit omits `pariwarId` and `traceId` (`abuse-rules.ts:184-194`), so `authEventToAuditInput` defaults to `GLOBAL_AUDIT_PARIWAR` (`00000000-…`) and `trace_id = NULL` — even though `handlers.ts:71` has `pariwarIdStr` and `request.requestContext.traceId` in hand. ⇒ a Pariwar-scoped audit reader (1.10) ⛔ never sees these lines, and two Pariwars crawled at once are indistinguishable. ⚠ The rules README claims the rule id is *"the only triage signal that survives"* — the tenant would have survived in its own column and was discarded for no stated reason. [apps/api/src/modules/public-pages/abuse-rules.ts:184-194]
- [x] [Review][Patch] **MEDIUM — the new `resourceLocator` override and its `RESOURCE_LOCATOR_PATTERN` guard have ZERO tests, and the pattern silently discards the rule id on malformed input.** `audit-log-sink.ts:62-118` is modified but `apps/api/tests/unit/audit-log-sink.test.ts` is ⛔ **not in the diff**; nothing anywhere references `RESOURCE_LOCATOR_PATTERN`. ⛔ Three arms unverified. ⚠ This was itself last round's patch closing *"`resourceLocator` enforced only by a comment"* — and the replacement enforcement is ⛔ **enforced only by reading the code**. ⭐ The pattern rejects uppercase, so a non-integer page reaching the detector (`directory:x:pNaN:lNaN`) discards **the one triage field Trap 8's whole argument was built to preserve**. [apps/api/src/audit/audit-log-sink.ts:62-118]
- [x] [Review][Patch] **MEDIUM — `buildForwardedFor(null, null)` returns `''`, and the empty header collapses those visitors into the SSR proxy's single bucket.** With no valid token `proxy-addr` falls back to the socket address — **the SSR process** — i.e. the exact failure the module exists to prevent (*"all directory traffic on earth shares one bucket"*), silently, with ⛔ no error and no log. ⚠ `directory-client.test.ts` **asserts** `=== ''` as intended behaviour. [apps/public/src/lib/directory.server.ts:90-102]
- [x] [Review][Patch] **LOW — the abuse detector runs BEFORE the publication kill switch**, so a Pariwar disabled under a DPDPA hold still accrues counters, still evicts other visitors against `MAX_TRACKED_KEYS`, and still writes `directory.abuse_suspected` rows describing enumeration of a surface serving `{items:[],total:0}`. [apps/api/src/modules/public-pages/handlers.ts:79,100]

**Roster read / query correctness:**

- [x] [Review][Patch] **MEDIUM — `DIRECTORY_EXCLUDED_MODERATION_ACTIONS` is DEAD CODE declared under the banner "⭐ THE RULED ROSTER PREDICATE, HALF TWO"; the query hard-codes a one-value allowlist instead.** `NOT_UNDER_SANCTION` is `COALESCE(…, 'restore') = 'restore'` (`directory-read.ts:144-151`) — ⛔ any action value other than `restore` de-lists. Repo-wide the constant is referenced by nothing but its own declaration. ⇒ a fourth `MODERATION_ACTIONS` value (a warn, an expiry, a reinstate) silently removes every member whose latest action is that value — **a directory ban nobody wrote** — while the exported constant still says only suspend/terminate exclude, and `-144` cl.5 guarantees ⛔ no reason is disclosed. ⭐ That is the **10.10 shape** ([[project_moderation_model_correct_course]]) arriving by **omission** rather than by conjunction. Correct today only by accident of the enum's current length. [packages/domain/src/member/directory-read.ts:96,144-151]
- [x] [Review][Patch] **MEDIUM — unbounded full-roster `count(*)` with a per-row correlated subquery, plus up to 50 unbounded-concurrency KMS calls, on every unauthenticated request.** `countPublicDirectoryMembers` has ⛔ no `LIMIT`, so the moderation subquery is evaluated once per roster member — a 10k-member Pariwar pays 10k subquery executions **per page view**. ⚠ The comment claims *"Resolved with bounded concurrency, ⛔ not sequentially"* but `Promise.all(rows.map(...))` has ⛔ **no** concurrency bound; the only bound is page size ⇒ N visitors = 50×N in-flight KMS calls. ⛔ A false "bounded" claim, and combined with the XFF decision above, a cheap amplification lever. [apps/api/src/modules/public-pages/handlers.ts:472-530; packages/domain/src/member/directory-read.ts:238-243]
- [x] [Review][Patch] **LOW — `total` and the page rows come from two statements in a READ COMMITTED tx, and the count takes no as-of bound.** `openScopeTx` issues a bare `BEGIN` ⇒ each statement takes a fresh snapshot; `listPublicDirectoryMembers` uses `opts.now ?? new Date()` with ⛔ no `now` passed from production (bypassing `deps.clock()`, which the abuse signal at `:79` does use), and `countPublicDirectoryMembers` accepts no `now` at all. ⇒ `hasNext` can advertise an empty page, or the last page can silently lose a row. [apps/api/src/modules/public-pages/handlers.ts:114,120]
- [x] [Review][Patch] **LOW — a whitespace-only district survives the `''` normalization and renders as a BLANK cell instead of "Not recorded".** `row.district === '' ? null : row.district` (`handlers.ts:166`) — `' '` is not `''`, passes `z.string().min(1)`, arrives truthy so `?? labels.districtUnknown` ⛔ never fires, and `outputForVerdict` only nulls the empty string ⇒ `<span data-field="district"> </span>`. ⚠ The comment on that very line names the reachability. Fix is `row.district?.trim() || null` — the half-step the comment already reasons about, finished. [apps/api/src/modules/public-pages/handlers.ts:166]

**Render / AC5 / Trap 7:**

- [x] [Review][Patch] **MEDIUM — AC5's "a not-visible verdict renders NOTHING at all" is defeated by the call site: the `<td>` wrappers and `<th>` headers sit OUTSIDE `<MatrixField>`.** `members.astro:186-198` — `MatrixField.astro` (correctly unmodified) renders nothing on a not-visible verdict, but the surrounding `<td>` and the column `<th>` are unconditional ⇒ an empty `<td>` in every row under a still-labelled header. AC5's own rationale: *"An omission that announces itself is an enumeration signal."* ⚠ Latent today only because all three fields are `public`. [apps/public/src/pages/members.astro:186-198]
- [x] [Review][Patch] **LOW — display logic computed in the `.astro` template rather than the pure render module.** `value={row.district ?? labels.districtUnknown}` (`members.astro:192`) while `toDisplayRow` passes `district` through untouched ⇒ what a visitor sees for a member with no posting row is decided in the template. Task 7: *"⛔ **All** display logic stays in the pure `members-render.ts` … On this surface that is a **gate evasion** before it is a style choice."* Violates Trap 7. ⚠ Minor a11y adjunct: the `<caption>` duplicates `labels.pageIntro` verbatim, already rendered as the intro `<p>` directly above. [apps/public/src/pages/members.astro:192]

**Drift, packaging, and comments that describe couplings which do not exist:**

- [x] [Review][Patch] **HIGH — `dynamic-html-weight.mjs` cannot run: its stub emits the internal `lock-in` token the wire contract now rejects.** `scripts/dynamic-html-weight.mjs:48` sets `status: i % 7 === 0 ? 'lock-in' : 'active'`; `isDirectoryResponse` accepts only `'active' | 'waiting-period'` (`directory.server.ts:168`) ⇒ `bad_response` ⇒ zero rows ⇒ the script's own guard *"the measured HTML contains no member rows — the stub was not consumed"* throws on **every** run. ⛔ AC8's measurement deliverable is dead on arrival, and the stale internal vocabulary `-144` cl.4 removed from the wire survives here. ⛔ Nothing in CI runs this script, so nothing reports it. [apps/public/scripts/dynamic-html-weight.mjs:48]
- [x] [Review][Patch] **MEDIUM — `verify-matrix-inline.mjs`'s "long contiguous slice" check tests only the 22-character first line.** It computes a 200-char slice then does `.split('\n')[0]` ⇒ `- id: member-directory`, discarding the slice. A build that inlined the surface header and truncated every field row beneath it **passes**. ⚠ Secondary: if the anchor is ever renamed, `indexOf` returns `-1` and `slice(-1, 199)` yields the file's last character, which `includes()` will almost certainly find ⇒ the check passes **vacuously** rather than failing. [apps/public/scripts/verify-matrix-inline.mjs:1812-1818]
- [x] [Review][Patch] **MEDIUM — `no-kms-in-public.test.ts` is described as covering the whole app; it scans `src/` only.** `const SRC = join(here, '../src')` ⇒ `apps/public/scripts/*.mjs` (⚠ **two new files added by this very story**) and `apps/public/tests/**` are outside the scan root, while `COMPOSITION-CONTRACT.md` and `directory.server.ts` both claim the absence is asserted *"across the whole app"*. ⚠ Separately the package.json leg matches only package **names** containing `kms`/`node-vault` — capability would in practice arrive via `@twt/domain`, already a dependency, which the regex ⛔ cannot see. [apps/public/tests/no-kms-in-public.test.ts:3553,3603-3613]
- [x] [Review][Patch] **MEDIUM — a missing or unpackaged `directory-abuse-rules.yaml` takes down the ENTIRE API server, not just the directory.** `loadDirectoryAbuseRules()` runs at handler construction (`handlers.ts:404`), i.e. inside `buildServer()`, and resolves via `require.resolve('@twt/contracts/package.json')`. ⚠ Two deploy-time failure modes, both fatal to every unrelated route (claims, contributions, admin, webhooks): an `exports` map added without a `"./package.json"` entry (the barrel's own comment anticipates one), or a pruned Docker build copying `dist/` but not the sibling `public-pages/*.yaml`. ⛔ Nothing pins the YAML into the package's `files`/`exports`. ⚠ Note: throwing on a **malformed** file is correct per AC6.4 — this finding is the **packaging** risk only. [apps/api/src/modules/public-pages/abuse-rules.ts:152-178]
- [x] [Review][Patch] **MEDIUM — the new OpenAPI path uses Fastify colon syntax and declares NO `pariwarId` parameter.** ✅ **Grading corrected upward** (the Blind Hunter filed it Low): verified `grep -c "^  /.*:[a-zA-Z]" openapi/v1.yaml` → **1** — this is the ⛔ **only** colon-style path in the entire committed document; every other `/api/v1/p/…` route uses `{pariwarId}`. `registerPath` passes `query` but ⛔ no `params`, so the required-uuid constraint on the one segment that selects a tenant is absent from the published contract and no generated consumer can construct the URL. [openapi/v1.yaml:3680-3707; packages/contracts/scripts/emit-openapi.ts:4022-4041]
- [x] [Review][Patch] **MEDIUM — a missing `PUBLIC_API_ORIGIN` silently defaults to localhost, contradicting the stated fail-at-boot intent.** The doc-block says a bad origin *"must fail the boot, loudly, rather than surface as a mysterious per-request failure state that looks like an outage"* — but the guarded case (malformed) is the unlikely one; the likely one (var not set in the deployed SSR container) takes the `??` branch, parses cleanly, and every request then hits `http://127.0.0.1:3000` ⇒ `ECONNREFUSED` ⇒ the outage state. ⛔ Exactly the failure the comment forbids. `PUBLIC_API_ORIGIN` was added to `turbo.json` `globalEnv` but nothing requires it present. [apps/public/src/lib/directory.server.ts:1870-1883]
- [x] [Review][Patch] **LOW — three independent hard-coded `25` page-size defaults, with a drift guard for the cap but NONE for the default.** `pagination.ts:37`, `handlers.ts:394`, `directory-read.ts:4846` each declare `= 25`; `directory-page-size-cap.test.ts` guards only the **cap**. ⚠ That cap guard exists precisely because the 11a.2 review found a false "shared constant" claim — the same class was re-created one line away and left unguarded. 25 is `PUBLIC_PAGE_SIZE_DEFAULT`, an FR-91 number. [apps/public/src/lib/pagination.ts:37; apps/api/src/modules/public-pages/handlers.ts:394; packages/domain/src/member/directory-read.ts:4846]
- [x] [Review][Patch] **LOW — the two files nominated as the authoritative written defence of this unauthenticated PII route state the control count differently.** `routes.ts:585` says *"four independent controls"*; `login-wall.spec.ts:683` says *"FIVE controls"* (it lists the page cap and the page horizon separately; `routes.ts` folds them). [apps/api/src/modules/public-pages/routes.ts:585; apps/api/tests/integration/login-wall.spec.ts:683]
- [x] [Review][Patch] **LOW — `handlers.ts` re-exports the horizon "so the route schema and the tests share ONE horizon" — and nothing imports it from there.** `routes.ts` takes `PublicDirectoryQuery` from `@twt/contracts`; `member-directory.spec.ts` hardcodes `?page=201` / `?page=200` literals. ⛔ The comment describes a coupling that does not exist — in a story whose stated lesson is that 11a.2's review found *"the comment named a constant that did not exist and the guarding test compared against a second hardcoded literal."* [apps/api/src/modules/public-pages/handlers.ts:544-545]

#### Dismissed as noise (2)

⛔ **Both verified false, ⛔ not waved away.** The KYC-join finding (*"`innerJoin(memberKycProfiles, eq(memberId, memberId))` omits `pariwar_id` ⇒ fan-out + cross-tenant leak under a BYPASSRLS pool"*) does not hold: `member_kyc_profiles.memberId` is `.primaryKey()` (`packages/domain/src/schema/member_kyc_profiles.ts:62-65`), so ⛔ no fan-out is possible, and the join key is the PK of a row already tenant-filtered by `eq(members.pariwarId, pariwarId)` in the same `WHERE` — safe **by construction**. ⚠ The Acceptance Auditor reached the same verdict independently. (⚠ Residue worth one line if the file is touched anyway: the module header's *"what keeps the read correct if a caller ever passes a BYPASSRLS pool"* overstates by one join.) · The kill-switch-has-no-caller finding (*"`setDirectoryPublicationEnabled` is reachable only from `psql`"*) is the **deliberate, recorded** posture from the first round — *"⛔ NO self-serve admin toggle UI shipped — the mechanism exists ungated by UI, mirroring 11a.1's own posture"* — ⛔ not an oversight. ⚠ Its real residue (that no caller writes the required §1.5 audit anchor) is folded into the kill-switch governance patch above.

#### Checklist verdicts (AI-6-5, families the diff touches)

- **Family 2** — `covered-by-construction` — the only new write is the kill-switch upsert, idempotent via `pariwar_directory_publication_pariwar_id_uq` + `onConflictDoUpdate`; asserted live (*"the upsert stayed one row, not three"*, 23505 on raw duplicate). Abuse counters are per-process **by design** (§1.4, no Redis) and that limit is written into the rules README.
- **Family 3** — `covered-by-test` — `directory-read.spec.ts` → *"cross-tenant RLS: a PARIWAR_B member is invisible under PARIWAR_A scope"*; `directory-publication-policy.spec.ts` → *"⛔ a Pariwar cannot read ANOTHER Pariwar's flag"*. ⚠ One overstatement noted in the Dismissed section.
- **Family 5** — `covered-by-test` — `directory-publication-policy.spec.ts` asserts RLS **directly** at migration level: FORCE via `pg_class`, cross-tenant negative, unset-scope-reads-zero (the 1.6 closed-failure construct), the 23505 partial-unique, the column default. ⚠ No CHECK mirrors the app-layer rationale/auditId requirement — byte-for-byte the `0110` precedent it declares it mirrors.
- **Family 6** — `covered-by-test` — explicit field-pick throughout (⛔ never a spread); ciphertext stops at the domain boundary; ⛔ no `member_id` on the wire. `member-directory.spec.ts` → *"renders the three classified fields — and ⛔ NOTHING else on the wire"*; `public-pages-directory-vocabulary.test.ts` → *"⛔ the entry stays .strict()"*.
- **Family 7** — `covered-by-construction` — `count(*)` cannot fan out (`member_kyc_profiles.member_id` is the PK), and count + page read share ONE `directoryRosterPredicate`, asserted by *"counts under the SAME predicate as the page read"*.
- **Family 8** — `covered-by-test` — five independently planted negative controls in `directory-publication-policy.spec.ts` (no rationale / no audit anchor / no actor display name / no grants / every other pariwar-dimension key but not this one), each contrasted with the positive.
- **Family 9** — `covered-by-construction` — the unauthenticated PII surface carries a DELIBERATE block with rationale **and** re-examination trigger in three places (`routes.ts` header, the `PUBLIC_ALLOWLIST` entry in 10.21 AC-R1 style, `server.ts`). ⚠ The `resourceLocator` widening is the ⛔ one bypass documented **without** a trigger — filed as a patch above.
- **Family 10** — ⛔ **REAL GAP** — four committed completion claims unsupported by the tree (kill-switch governance record · `scrape-test.spec.ts`'s "every snapshot carries BOTH `html` and `fields`" · the "committed OpenAPI surface" attribution repeated in four places · §7's surviving "there is no read"). Each emitted above at the AC severity ladder. ✅ Everything else in the closure set verified clean: all six "armed but empty" records genuinely rewritten; both pagination deferrals `CLOSED BY EDIT` in the right language; `-140` cl.7 correctly *answered, not closed*; the D6 negative control honestly recorded as proving nothing; AC9's `microcopy.yaml` `copy_globs` claim **holds**.
- **Family 11** — ⛔ **REAL GAP** — ✅ the **roster** predicate is clean and the §2.13.2 display-only claim was **verified in code, ⛔ not taken on trust**: `listPublicDirectoryMembers` / `countPublicDirectoryMembers` / `DIRECTORY_VISIBLE_MEMBER_STATES` have exactly ONE production consumer repo-wide, ⛔ no `is_valid` / `is_assignable` / eligibility / pool / validity / peer-mesh path imports them, and the module writes nothing. ⛔ **The gap is the other two predicates**: the **kill switch** (*"whether your name is on the public directory now also depends on a Super-Admin-only switch you cannot see, cannot request, and which is ON unless someone turns it off"*) and the **deceased omission** (*"your name stays on the public directory marked Active after you die"*) — both shipped with ⛔ no member-facing sentence, ⛔ no Niyamavali check, ⛔ no ruling of record.
- **Family 12** — `covered-by-construction` — ⛔ no write action and ⛔ no per-member client-supplied id on this path: `PublicDirectoryEntry` deliberately carries no member identifier, and the single client-supplied id (`pariwarId`) **is** the loaded scope, uuid-validated by the route schema and re-validated by `openScopeTx`. ⛔ No read keyed on `pariwar_id` where a member-scoped read was meant — a Pariwar-wide roster is exactly what this surface means.

---

## Dev Notes

### Files this story touches, and what must be preserved

| File | Current state | What changes | ⛔ Must not break |
|---|---|---|---|
| `apps/public/src/pages/members.astro` | Shell + FR-91 controls + not-yet-published empty state; ⛔ no DB read, no `withPublicScope` | Rows render; API fetch; forwarded IP | ⛔ Keep the thin-frontmatter convention (Trap 7). ⛔ Keep the conditional cache header (11a.2 patch: rejections are `no-store`). ⛔ Keep `noindex` |
| `apps/public/src/lib/members-render.ts` | Pure; `hasMembers` hard-coded `false`; ⛔ no "next" link by design | Rows + honest next link | ⛔ Keep `buildMembersRejectionView` **rejection-invariant** — it deliberately takes no `rejection` argument |
| `apps/public/src/lib/surface-fields.ts` | `deriveFieldIds` throws **both** ways; `MEMBERS_FIELD_IDS` maps every key to `null`; camelCase↔snake_case mapped **by hand** | `+ member field ids` | ⛔ Never add a mechanical case converter. ⛔ Never silence either throw direction |
| `apps/public/src/lib/pagination.ts` | Offset parse/reject; cap imported from `_common/pagination.ts`; ⛔ no `page` ceiling | `+ horizon` | ⛔ Keep the cap **imported**, never re-declared (the 11a.2 review found the "shared constant" claim was false). ⛔ Keep `parsePageParams` callable — the `pagination_binding` leg matches on it |
| `apps/public/src/components/MatrixField.astro` | Delegates every decision to `getVisibility()`; renders **nothing** when not visible; **zero call sites** | ⛔ Nothing | ⛔ Do not modify it to fit the call site. ⛔ No `TIER_RANK` import, ⛔ no second ceiling copy |
| `apps/public/src/lib/matrix.server.ts` | `?raw` inline + parse-once + loud throw | ⛔ Nothing | ⛔ Never a `?? { surfaces: [] }` fallback — 11a.1 deleted exactly that |
| `packages/contracts/public-pages/public-vs-private-matrix.yaml` | 8 surfaces, 23 fields, 1 escalation; `member-directory` `renders: true`, `paginated: true`, `edge_cacheable` | `+ member_status`; rationale + cache comment rewritten | ⛔ **Read its header first — it is NOT a schema.** ⛔ No second Tier-1 `public` exception (it fails to parse by design). ⛔ No fabricated escalation entry (**Trap 5**) |
| `packages/contracts/src/public-pages/gate.ts` | 5 legs; frontmatter strip; comment-stripping on the binding leg | Likely nothing | ⚠ `astroTemplate()`'s regex truncates on an embedded line-starting `---` — a **known deferred** defect; ⛔ do not "fix" it reactively here |
| `apps/public/tests/integration/public-pages/scrape-test.spec.ts` | The tier-leak leg lives here (11a.1 D2); loads the matrix by relative fs path with ⛔ no empty fallback; **asserts the members field set IS empty** | The empty assertion is **replaced** | ⛔ Never restore an empty-matrix fallback. ⛔ Never delete the assertion without a stronger replacement |
| `apps/api/src/server.ts` | `trustProxy: true`; hook order is load-bearing (`collectRoutes` first, `X-Robots-Tag` via `onSend`) | `+ module registration` | ⛔ Do not change `trustProxy` (**Trap 3**). ⛔ Do not reorder hooks. ⚠ `onSend` async hops caused `ERR_HTTP_HEADERS_SENT` before ([[project_fastify_onsend_doublesend]]) |
| `apps/api/tests/integration/login-wall.spec.ts` | Fails closed: a route missing **both** the gate and an allowlist entry fails | `+ a DEFENDED entry` | ⛔ Never a bare allowlist line — the entry is where "deliberately unauthenticated" is argued |
| `openapi/v1.yaml` | Committed, determinism-checked | Regenerated | ⛔ Hand-editing it will fail the determinism check |
| `packages/domain/src/member/` | `listMemberIdsForPariwar` / `listMemberStatesForPariwar` unbounded by design (whole-Pariwar sets); `getMemberPostingLatest` per member | `+ directory read` | ⛔ Do not add a `limit` to the two unbounded accessors — their unboundedness is argued in their doc-blocks. ⛔ Every new dynamic `.limit()` goes through `clampLimit` |
| `apps/api/src/audit/audit-sink.ts` | `AuthAuditEventType` — a union documented as **"The closed set"**; `AuthAuditSink.emit` is the seam | `+ ONE new abuse event type` | ⛔ Never reuse `abuse.honeypot` (**Trap 8**) — it corrupts the honeypot signal and breaks `security-headers.spec.ts:72`. ⛔ Never widen the union to `string` |
| `apps/api/src/audit/audit-log-sink.ts` | `statusForAuthEvent` maps type → HTTP-equivalent status; `authEventToAuditInput` **hashes** `context` and hard-codes `resourceLocator: user:<actorId\|anonymous>` | `+ the new type's status mapping` | ⛔ Do not "fix" the hashing or the locator to carry query context — both are deliberate PII-poisoning defenses (W6-CR1.6). Work **within** them (**Trap 8**) |
| `packages/domain/src/member-geo/resolve.ts` · `surveys/read.ts` · `news-blog/audience.ts` | The D3 latest-posting comparator + the working set-based cohort read | ⛔ Nothing | ⛔ Do not change the comparator — five files coordinate on it under *"Change one, check the other"*. ⭐ **Read them; copy the shape** (**Trap 6**) |
| `turbo.json` | `globalEnv` has 3 entries; `contracts:check-pii-scrape.inputs` covers the matrix + `.astro` pages + `.decision-log.md` | `+ API origin env`; verify inputs | ⛔ A gate reading outside its `inputs` passes on stale bytes |

### Patterns to reuse — ⛔ do not reinvent

- **API module shape:** `apps/api/src/modules/member-data-rights/` — and specifically its
  **deliberately-unauthenticated redemption route**, which is the closest precedent in the repo for
  what this story ships: a defended allowlist entry, a named rate-limit tier chosen and *argued*, and
  a comment saying ⛔ do not "fix" this by adding a session guard.
- **⭐ Set-based COHORT district read — the closest precedent, and it already exists three times:**
  `surveys/read.ts:303-316`, `news-blog/audience.ts:163-171`, `banners/audience.ts`. One query over
  `members` with a correlated latest-posting subquery carrying the D3 comparator, and **raw quoted
  identifiers** (`p.member_id = "members"."member_id"`) that keep it clear of the Epic-6 correlation
  bug. ⛔ Adapt this; do not author a fourth shape (**Trap 6**).
- **Set-based latest-row read:** `member/moderation/read.ts:258` and
  `member/renewal-scheduler.ts:103` — both `DISTINCT ON` with the 42P10-safe `ORDER BY`, and
  `moderation/read.ts` carries a **complete tie-break chain**, which is the part to copy.
  `news-blog/audience.ts:149-150` and `surveys/read.ts:298` both say in terms ⛔ *not a freshly
  invented `DISTINCT ON`*.
- **The latest-posting comparator (D3):** `member-geo/resolve.ts:60,92` `getMemberCurrentDistrict` —
  the *named* single-member accessor and where `created_at DESC, posting_id DESC` is documented.
  ⛔ Not called per row here (N+1), but it is the definition of the rule the set-based read must use.
- **Audit emission from a route:** the rate-limit `onExceeded` emitter
  (`plugins/rate-limit/index.ts:93-120`) — `deps.auditSink.emit` with a typed event, `actorId` left
  `null` for an unauthenticated caller, and per-key-per-window dedupe. ⛔ This, not `writeAuditEntry`.
- **Compound page read in ONE query:** `member/search-read.ts` (`searchMembers`, AR-65) — the
  LEFT-JOIN shape, `clampLimit`, ciphertext returned **as stored** with the boundary decrypting.
- **Page shape:** `terms.astro` remains the cleanest model; `members.astro` already follows it.
- **Pure-core / impure-orchestration split:** `gate.ts` (pure) + `scripts/check-pii-scrape.ts`
  (impure), mirroring `scripts/friction-budget/{lib,check}.ts`.
- **Honest scoping README:** `scripts/custom-field-governance/README.md`'s *"⚠ What this gate does
  NOT prove — read this first"* is the **template to copy**, not merely a precedent to cite.
- **Strict config parsing:** `parseFrictionBudgetYaml` / `parsePublicVsPrivateMatrix` — `.strict()`,
  loud throw, ⛔ never a silent default.
- **Data path:** `withPublicScope` (`apps/public`) and `openScopeTx` (`apps/api`) — `BEGIN` →
  `SET LOCAL ROLE twt_app` → `setPariwarScope` → read → `ROLLBACK`. ⛔ Not a superuser bypass.

### UX constraints that bind this surface — ⛔ not general advice

- ⭐ **`ux-design-specification.md:1124` names *"member directory listings"* explicitly** in the
  **operational register**: Gregorian dates + **Latin numerals**. ⛔ Devanagari numerals must not
  appear in directory rows even in the Hindi locale — and the `microcopy` gate's Devanagari-numeral
  discipline already has teeth on the `members` locale files (they are in `copy_globs`). ⚠ This is a
  checkable constraint, ⛔ not a stylistic preference.
- **Empty / no-results state** — the design-system **Pattern 7** empty-state treatment. ⚠ Note the
  directory has **two** distinct empty states now: *"no members to show"* (a real, dignified empty
  roster) and *"the API is unreachable"* (T5). ⛔ Never render the second as the first — an outage
  that looks like an empty membership is a false statement about the trust.
- **Pattern 10 (Search + Filter)** names the member directory as a consumer — ⛔ **out of scope
  here** (§Scope boundary). ⚠ It is why the *"Showing X of Y"* count and the filter-chip affordances
  are **not** built: they arrive with search, under a tier-respecting design, ⛔ not ahead of it.
- **Tier 3 (public website)** care level (`ux-design-specification.md:48`) — the directory is public
  web, so the shell's minimal-JS, works-with-JS-disabled posture governs. ⛔ No client island.

### Previous-story intelligence — what 11a.1 and 11a.2 already paid for

- ⭐ **The defect this epic exists to remove is the *vacuous green check*.** 11a.1 found the tier-leak
  leg reporting green while `loadSnapshots()` was literally `return []`; 11a.2 shipped `/members` and
  declared, in six places, that the leg was **armed but empty**. ⛔ This story's single largest
  failure mode is shipping member rows while any of those six records still says "empty" — the
  record would then certify the opposite of the truth.
- ⚠ **The 11a.2 headline defect was a test-fixture blind spot, not a logic error.** `/members` threw
  on **every** request (`{{max}}` vs the single-brace `TOKEN` regex) and **no test caught it**,
  because every test hand-built a `MembersLabels` fixture and bypassed `t()`. ⇒ AC9's "exercise the
  real `t()` path" is a direct consequence. ⛔ Do not add more label fixtures without one real path.
- ⚠ **Claims in comments were found false twice.** 11a.2's *"cap re-exported so the two surfaces
  cannot drift"* referenced a constant that did not exist, and its guarding test was tautological
  against a second hardcoded literal. ⇒ ⛔ **Any comment asserting a shared constant, a covering
  gate, or an enforced bound must be verified against source before it is written**, and the test
  must assert against the **imported binding**, never a re-typed value.
- ⚠ **A whole-file textual gate is blind to branches.** The `/blog/[postId]` 404 shipped with no
  `Cache-Control` while `detectCacheSignal` read the file as compliant. ⇒ if this story adds any
  conditional header or conditional render path, ⛔ assume the gate cannot see it and say so.
- ⚠ **`<AuthenticatedFragment>`'s cache-safety test is a comment-stripped literal-token scan** and is
  defeatable by concatenation, a wrapper, or `Astro.locals.user`/`.viewer`. Its surrounding prose
  overstates what it proves. ⛔ Do not cite it as proof of anything this story does.
- ⭐ **Rulings are superseded, never re-read.** 11a.2's D1(a) rationale turned out **half false**
  (`<MatrixField>` had no call site) and the project's answer was a **new dated finding**
  (`2026-08-20-142`), ⛔ not an edit to the ruling. Follow that shape if something here proves wrong.

### Git intelligence — the last six commits

`1bc46e0` `fix(11a.2)` code-review patches · `5663aad` `governance(11a.2)` Decision `-142` ·
`231a492` `chore(11a.2)` story record + sprint-status · `90bbe2a` `docs(11a.2)` friction-budget
dispositions · `1462526` `feat(11a.2)` the shell + `/members` · `6f5d10c` `governance(11a.2)`
Decision `-141`.

⇒ The committed shape of a story in this epic is **`governance:` first and alone → `feat:` →
`docs:` → `chore:`**, with review patches as a trailing `fix:`. ⛔ Follow it, and ⛔ **rebase-merge,
never squash** — squashing destroys the governance-first ordering the history is supposed to prove
([[project_story_automator_ops]], [[feedback_governance_commits_precede_implementation]]).

### Testing

- `apps/public` runs **vitest**; `.astro` components are **not** unit-testable — hence the house
  convention that all display logic lives in pure `.ts`. ⚠ That convention is what makes
  `deriveFieldIds` sound.
- `apps/api` integration specs run against the **live test DB**. ⚠ Run the unit leg and the live-DB
  leg **separately** — a `DATABASE_URL`-global combined run double-runs integration specs and
  pollutes counts ([[project_ci_local_double_run_pollution]]); concurrency is pinned at 4
  ([[project_ci_local_concurrency_oversubscription]]).
- ⚠ Known live-DB flakes exist and are **not** this story's — confirm innocence by running a spec in
  isolation before attributing a failure ([[project_known_livedb_test_failures]]).
- ⛔ Never regenerate an applied migration (42P07); ⛔ never `DROP SCHEMA` (42P01); assert
  **membership, not counts** ([[project_live_db_test_gotchas]]).
- ⚠ `git push` runs the full `ci:local` via a pre-push hook — that is the "hang", ⛔ not a failure.

### Project Structure Notes

- ⛔ **No new package.** The roster read goes in `@twt/domain`, the route in `apps/api`, the render in
  `apps/public` ([[feedback_no_premature_package]]).
- ⛔ **No new DB migration is expected.** Every table this story reads already exists
  (`members`, `member_postings`, `member_kyc_profiles`, `member_moderation_actions`,
  `pariwar_public_name_presentation`). If one seems needed, **stop and raise it** — a migration on a
  render story is a signal the scope boundary moved.
- ⚠ `@twt/contracts` must **not** import `@twt/domain`'s pg-touching namespaces — it would leak `pg`
  into the RN Metro bundle ([[project_contracts_domain_bundle_boundary]]).
- ⚠ Beware the **type-only → value import** trap: converting a `import type` to a value import can
  materialise a module-init cycle that breaks consuming packages at runtime while typecheck, lint and
  local tests stay green ([[project_type_only_import_cycle_trap]]).
- ⚠ `member_number` does not exist. ⛔ Never invent a membership-number column
  ([[project_membership_number_deferred_feature]]).

### Latest technical information

- **Astro `^6.4.8`** + `@astrojs/node` `^10.1.4`, `output: 'server'`, `mode: 'standalone'`.
  `Astro.clientAddress` is available on this adapter and is what **Trap 2** needs.
- **Fastify 5** + `@fastify/rate-limit` `^11` — `onExceeded(req, key)` for the audit line (⛔ not
  `onExceeding`, which fires on every counted request and floods); per-route `config.rateLimit`
  **inherits** the global `onExceeded` + `errorResponseBuilder` via `mergeParams`
  (`Object.assign`) — ⚠ but `ban` does **not** inherit.
- ⚠ The rate-limit store is **in-memory, per-instance** (§1.4, no Redis) ⇒ the effective ceiling is
  `max × instanceCount`. Acceptable as a bootstrap ceiling; ⛔ **say so in the README** rather than
  implying a global limit.
- ⛔ `vite.ssr.noExternal` must keep listing every `@twt/*` package — moving one to `ssr.external`
  breaks the standalone image.
- ⭐ **Astro 6 server islands (`server:defer`)** remain the recorded leading candidate for the
  authenticated fragment at Epic 11b — ⛔ **not** adopted here (Trap 1: no viewer).

### References

- `_bmad-output/planning-artifacts/epics.md` §Epic 11a, §Story 11a.3 (+ the 2026-08-19 C1/C2/C3/C9
  reconciliation blocks), §Story 11a.4, §Epic 11b (11b.1 / 11b.6 inheritance)
- `_bmad-output/planning-artifacts/architecture.md` §2.7 (the ruled Tier-1 exception, L1558-1590) ·
  §2.11 (rate limiting, L1764-1790) · §"Cross-surface rendering policy" (L495-546) ·
  §"Member-Responsive Web" (L486-494) · §2.13.1–2.13.4
- `_bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md` FR-74 · FR-75 · FR-89 · FR-91 ·
  FR-92 · FR-93
- `_bmad-output/planning-artifacts/ux-design-specification.md` L48 (Tier-3 public-website care
  level) · **L1124 (the operational register — *"member directory listings"* named explicitly:
  Gregorian dates + Latin numerals)** · L2432 Pattern 10 (Search + Filter — ⛔ out of scope here) ·
  Pattern 7 (empty states)
- `_bmad-output/implementation-artifacts/11a-1-…-public-vs-private-replacement.md` (Traps 1-7,
  rulings D1-D6, AC7 indexing reconciliation)
- `_bmad-output/implementation-artifacts/11a-2-…-renderers.md` (Traps 1-6, rulings D1-D5, the
  16 review findings — 8 patched, 8 deferred)
- `.decision-log.md` `2026-08-19-132` `-133` `-135` `-136` `-137` · `2026-08-20-140` `-141` `-142`
- `_bmad-output/implementation-artifacts/deferred-work.md` L93-141 (the 11a.2 section), L5660,
  L5663, L5665
- `_bmad-output/implementation-artifacts/gate-inventory.md` rows `pii-scrape`, `friction-budget`,
  `microcopy`
- `packages/domain/src/kyc/{public-name,presentation-policy,name}.ts` ·
  `packages/domain/src/member/{read,posting,search-read}.ts` ·
  `packages/domain/src/member/moderation/read.ts` · `packages/domain/src/encryption/member-fields.ts`
  · `packages/domain/src/audit/write.ts` · `packages/domain/src/pagination.ts`
- **The set-based cohort district precedents + the D3 comparator (Trap 6):**
  `packages/domain/src/surveys/read.ts:296-316` · `packages/domain/src/news-blog/audience.ts:145-171`
  · `packages/domain/src/banners/audience.ts` · `packages/domain/src/member-geo/resolve.ts:30-95` ·
  `packages/domain/src/claim/peer-mesh-read.ts:83-88` · `packages/domain/src/member/posting.ts:108-129`
- **The audit seam + its limits (Trap 8):** `apps/api/src/audit/audit-sink.ts` (the closed
  `AuthAuditEventType` union) · `apps/api/src/audit/audit-log-sink.ts` (`statusForAuthEvent`,
  `authEventToAuditInput`) · `packages/domain/src/schema/audit_log_entries.ts:66-123` (⛔ no context
  column) · `apps/api/src/plugins/rate-limit/index.ts:48-50,93-120` (`perSessionKey`, `onExceeded`)
- `packages/contracts/src/public-pages/{matrix,scrape,gate}.ts` ·
  `packages/contracts/public-pages/public-vs-private-matrix.yaml` ·
  `packages/contracts/src/_common/pagination.ts`
- `apps/api/src/plugins/rate-limit/index.ts` · `apps/api/src/plugins/security-headers/index.ts` ·
  `apps/api/src/server.ts` · `apps/api/src/modules/member-data-rights/routes.ts` ·
  `apps/api/tests/integration/{login-wall,forced-pagination,rate-limit}.spec.ts`
- `apps/public/COMPOSITION-CONTRACT.md` · `docs/ux/empty-skeleton-error-inventory.md` §7 ·
  `docs/adr/ADR-0013-pii-scrape-ci-gate.md` · `docs/domain-accessor-invariants.md`
- `friction-budget.yaml` · `friction-budget.md` · `microcopy.yaml` · `turbo.json`

---

## Dev Agent Record

### Agent Model Used

`claude-opus-5` (Claude Code, `bmad-dev-story`).

### Debug Log References

#### ⭐ REVERT-SANITY — every detection route, INDEPENDENTLY planted, run for real, exit code recorded, reverted

⛔ No fixture trips more than one check: each row below is its own mutation, applied alone
and reverted before the next (the recording gap 11a.2's own AC9 review flagged).
Baseline and RESTORED runs bracket the table, so a control that "failed" for an unrelated
reason would be visible.

| # | Planted violation | Detection route | Exit |
|---|---|---|---|
| — | *(baseline: scrape / render / abuse / rate-key / api-dir / pii-gate)* | all | **0** ✅ |
| C1 | `member_status` matrix row **deleted** while the page still renders it | tier-leak leg (`scrape-test.spec.ts`) | **1** ✅ |
| C2 | an **undeclared** member field (`registrationDate`) enters the render model | `deriveFieldIds` — model-key direction | **1** ✅ |
| C3 | a **stale** mapping entry (`poolParticipation`) with no model key | `deriveFieldIds` — mapping-key direction | **1** ✅ |
| C4 | the deep-pagination **horizon check removed** | `members-render.test.ts` | **1** ✅ |
| C5 | the named **SEARCH rate limit removed** from the route | `rate-limit-key.spec.ts` | **1** ✅ |
| C6 | ⭐ the rate-limit **key made a CONSTANT** (Trap 2) | `rate-limit-key.spec.ts` | **1** ✅ |
| C7 | an abuse rule **disarmed** (threshold raised out of reach) | live-wiring test (`member-directory.spec.ts`) | **1** ✅ |
| C8 | `directory-abuse-rules.yaml` **malformed** (active rule, no threshold) | strict parser — throws, ⛔ never degrades | **1** ✅ |
| — | *(restored: all six suites + the pii gate)* | all | **0** ✅ |

**Domain-layer controls** (run separately, same discipline):

| # | Planted violation | Exit |
|---|---|---|
| D1 | the D3 comparator's `posting_id DESC` tie-break **dropped** | **1** ✅ |
| D2 | the **correlation itself removed** from the district subquery | **1** ✅ |
| D3 | the **moderation half** of the roster predicate neutered | **1** ✅ |
| D4 | the KYC `innerJoin` → `leftJoin` (blank-name rows leak in) | **1** ✅ |
| D5 | `orderBy(member_id)` → `orderBy(random())` (paging stability) | **1** ✅ |
| D6 | ⚠ `"members"."member_id"` → `${members.memberId}` (qualifier spelling) | **0** ⚠ **see below** |

**Cross-cutting controls:**

| # | Planted violation | Exit |
|---|---|---|
| X1 | the route's `limit` bound **removed** → Story 1.14's OpenAPI forced-pagination guard | **1** ✅ (named this route explicitly) |
| X2 | the `members` i18n namespace **unregistered** → catalog-registration guard | **1** ✅ |
| X3 | the same, → the real-`t()`-path test | **1** ✅ |

⚠ **D6 IS RECORDED AS PROVING NOTHING, and that matters more than the fifteen that passed.**
Swapping the literal outer qualifiers for an interpolated Drizzle `Column` did **NOT** fail —
so I dumped the generated SQL both ways rather than assume. **They are byte-identical**,
because this query's `innerJoin` puts more than one table in scope and Drizzle emits the full
`"members"."member_id"` qualifier by itself. The precedents (`surveys/read.ts`,
`news-blog/audience.ts`) are single-table `.from(members)` reads — which is where the
bare-column rendering, and the Epic-6 bug, actually occur. ⇒ the module comment was rewritten
to state that bound honestly: the literal qualifiers are kept because the property is **one
edit away** from mattering, ⛔ not because they are what keeps this read correct today. D2
(removing the correlation outright) is the control that does bite.

#### ⭐ AC5 — the `?raw` matrix bytes in a REAL `dist/` build

11a.2 could only check this via a manually-run, reverted probe. With `<MatrixField>` now
having real call sites the module is no longer tree-shaken, so the probe is **committed**
(`apps/public/scripts/verify-matrix-inline.mjs`, `pnpm --filter @twt/public verify:matrix-inline`).

```
✓ the ?raw matrix bytes reach a REAL dist/ build — 7 probes found across 20 built server
  file(s); carrier: dist/server/chunks/members_C4wyp2_b.mjs
```

#### ⭐ AC8 — the DYNAMIC SSR HTML measurement (D6(a))

Measured against the **real built standalone server** with the upstream stubbed at a full
page at the FR-91 cap (`pnpm --filter @twt/public weight:dynamic`):

```
/members at the cap (50 rows) = 19 234 bytes; single row = 4 220; marginal = 306 B/row
⛔ NOT comparable with dist/page-weight.json (static client assets). Different quantity.
```

⚠ Static attribution for the same route is **3 116 B** — the dynamic HTML is ~**6×** it, which
is exactly the gap `page-weight.mjs`'s own header says it does not capture.
⚠ First run reported a marginal cost of **0 B/row**: the stub ignored `limit`, so the
"single-row" baseline also rendered 50 rows. A harness that cannot vary its input measures
nothing — fixed, and the stub now honours `limit`.

#### Full regression (run separately per [[project_ci_local_double_run_pollution]])

| Suite | Result |
|---|---|
| `@twt/public` | **163 passed** (12 files) |
| `@twt/domain` unit | **1892 passed**, 2 skipped |
| `@twt/domain` live-DB | **1135 passed** (125 files) |
| `@twt/api` unit | **351 passed**, 696 skipped |
| `@twt/api` live-DB | **720 passed** (79 files) |
| `@twt/contracts` | **1030 passed** · `@twt/i18n` **64 passed** |
| `pnpm lint` | **20/20 tasks** clean |
| `pnpm pii:check` | ✓ 8 surfaces, **24** fields (was 23), 1 escalation |
| `pnpm i18n:check` · `pnpm microcopy:check` | ✓ ✓ |
| `pnpm friction:check` | ✓ (AC-4 leg verified **after** committing) |

⚠ Baseline recorded before starting, so any failure was provably mine: `pii:check` green at
`1bc46e0` with 8 surfaces / 23 fields / 1 escalation. GitHub Actions verified **live** this
session (CI succeeded 9m33s on `1bc46e0`). ⚠ `code-escrow-mirror` fails on **every** push back
to 2026-08-18 — pre-existing, ⛔ not this story's.

### Completion Notes List

#### ⭐ THE HEADLINE: the launch-blocking clause is DISCHARGED

`membersSurfaceFieldIds(model)` returned `[]` before this story, so `evaluateSnapshot`
evaluated **nothing** on the flagship public surface and a green `member-directory` check
proved only *"renders no classified field"*. It now returns
`['district', 'member_name', 'member_status']`. ⭐ **The discharge is proven by planting a
real leak into a snapshot that passes clean** — *"the set is non-empty"* was never the proof.
⇒ `2026-08-19-136` cl.4 is discharged (Decision `2026-08-20-143`).

⚠ **All six committed records that said "armed but empty" were rewritten in the same commit
as the code**: the matrix surface description, the page header, the render-model doc-block,
the live-render spec, `deferred-work.md` and `gate-inventory.md`. The committed
*"the field set IS empty"* assertion was **REPLACED**, ⛔ never deleted, and the replacement
asserts the **exact** set so a silently dropped field fails too.

#### ⛔ TWO PRE-EXISTING DEFECTS ON `main`, FOUND BY TESTS THIS STORY OWED

1. ⭐ **`/members` threw on EVERY REQUEST at `1bc46e0`.** `members.astro` called
   `t(..., { namespace: 'members' })`, the locale files existed — but `members` was **never
   registered in `packages/i18n/src/catalog.ts`**, so `getCatalog` returned `undefined` and
   `t()` threw. Verified against the baseline commit, ⛔ not inferred. This is the **same
   defect CLASS** as 11a.2's `{{max}}` bug, arriving by a different mechanism, and invisible
   for exactly the reason AC9 names: every test hand-built a `MembersLabels` fixture and
   bypassed the resolver.
   ⭐ **The gap itself is now mechanized, not just the instance fixed**: the parity gate walks
   the `locales/` directory while `catalog.ts` is hand-maintained, so the two could never meet.
   `packages/i18n/tests/catalog-registration.test.ts` asserts every domain on disk is
   registered **and** every registered namespace resolves — both drift directions.
2. ⛔ **AC1's "second, independent FR-91 enforcement" would have shipped FALSE.** Story 1.14's
   guard detects a collection GET by a literal `items` key; my response named the array
   `entries`, leaving the route **invisible** to the guard while the claim sat in the comments.
   Renamed, then **verified by planting an unbounded `limit`** and watching the guard fail and
   name this route explicitly.

#### ⚠ ONE COMMENT CLAIM RETRACTED BEFORE IT SHIPPED

See D6 in the Debug Log. The Epic-6 correlation mitigation is real, but it is **not** what
keeps *this* query correct — verified by dumping the generated SQL, not by inheriting the
precedent's rationale. The comment now carries the honest bound.

#### Decisions implemented as ruled (⛔ none re-opened)

D1(a) read + decrypt at `apps/api/src/modules/public-pages/` (the module lands **with** its
route — the condition 11a.2 named) · D2(a) offset paging kept + the horizon added · D3(a) the
roster predicate · D4(a) rules **and** enforcement, console deferred · D5(a) `edge_cacheable`
kept, cost recorded · D6(a) dynamic HTML measured, timing harness re-deferred with a
**genuinely new** reason and trigger.

#### ⛔ What is NOT built, said loudly rather than left to be inferred

- **The `authenticated_member` tier has NO VIEWER** (`-143` cl.7) — verified: members are
  token-bearer, there is no `apps/member-web/`, `apps/mobile` has no directory screen. This
  ships the `public` tier **for real**; the other column is routed onto 11a.2's
  fragment-mechanism deferral. ⛔ Half a table shipping is fine; half a table shipping
  *silently* is the defect.
- **The abuse audit line is a COUNTER, not a forensic record.** No column stores query
  context (it is hashed into `request_payload_hash`), so the rule id + a coarse non-PII shape
  go in `resource_locator`. D4(a)'s *"real and reachable"* is **true**; *"triageable"* is
  ⛔ **false**, and the console deferral names that limit.
- **Two epic-AC clauses have no subject here** — *"an authenticated session does not bypass
  rate limits"* and *"abuse-detected accounts trigger suspension + trustee review"*. There are
  no sessions and no accounts on this surface. The enforceable residue is the **429** and the
  **audit line**.
- **A warm edge hides scraper traffic from the origin entirely** (D5(a)'s cost) — inert today,
  recorded as a named dependency with an edge-configuration re-trigger.
- **The forwarded rate-limit key is caller-supplied** under `trustProxy: true`. ⛔ `trustProxy`
  was **not** re-tuned; the network precondition is recorded instead.

#### ⛔ RAISED, NOT CLOSED — for the Trustee Panel

Under D3(a) a **suspension silently removes a member from the public directory**, and the
status pill **publishes lock-in status to the internet**. ⛔ **No Niyamavali clause describes
either.** Recorded at `2026-08-20-143` cl.8; `2026-08-20-140` cl.7 (the rulebook records no
directory publication at all) **remains open and is now at its sharpest** — the page now
prints members' full legal names. ⛔ Neither is closed here; amending the Niyamavali is Story
2.4's workflow.

#### One deliberate, minimal extension to a shared seam

`AuthAuditEvent` gained an **optional** `resourceLocator`, defaulting to the existing
`user:<actorId|anonymous>` so every current emitter is byte-identical. ⛔ The context hashing
and the default locator — both deliberate PII-poisoning defenses — are **untouched**. Without
it an unauthenticated emitter has literally no distinguishing field, so the signal could record
*that* something fired but never *which rule*. Documented at the field as non-PII-only.

#### ⛔ No migration, no new package, no new permission key

Every table read already existed. Matrix grew 23 → 24 fields; the escalation ledger is
**unchanged at 1** — a first-time classification is ⛔ not an escalation, and
`MatrixEscalationSchema` correctly rejects one.

### File List

**Added (19)**
- `packages/domain/src/member/directory-read.ts`
- `packages/domain/tests/integration/member/directory-read.spec.ts`
- `packages/contracts/src/public-pages/directory.ts`
- `packages/contracts/src/public-pages/abuse-rules.ts`
- `packages/contracts/public-pages/directory-abuse-rules.yaml`
- `apps/api/src/modules/public-pages/{index,routes,handlers,abuse-rules}.ts`
- `apps/api/tests/integration/public-pages/member-directory.spec.ts`
- `apps/api/tests/integration/public-pages/rate-limit-key.spec.ts`
- `apps/api/tests/unit/directory-abuse-rules.test.ts`
- `apps/public/src/lib/directory.server.ts`
- `apps/public/scripts/verify-matrix-inline.mjs`
- `apps/public/scripts/dynamic-html-weight.mjs`
- `apps/public/tests/{directory-client,members-copy,no-kms-in-public}.test.ts`
- `packages/i18n/tests/catalog-registration.test.ts`
- `apps/api/tests/unit/directory-page-size-cap.test.ts` (code review, 2026-08-21 — AC6.1 drift guard)
- `_bmad-output/planning-artifacts/niyamavali-amendment-draft-2026-08-21-directory-publication.md` (commit `f1b1456`)
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-08-21-niyamavali-directory-publication.md` (commit `7aee1c3`)

**Modified (28)**
- `packages/domain/src/member/index.ts`
- `packages/contracts/src/public-pages/index.ts` · `packages/contracts/scripts/emit-openapi.ts`
- `packages/contracts/public-pages/public-vs-private-matrix.yaml` · `openapi/v1.yaml`
- `apps/api/src/server.ts` · `apps/api/src/audit/{audit-sink,audit-log-sink}.ts`
- `apps/api/tests/integration/login-wall.spec.ts`
- `apps/public/src/pages/members.astro`
- `apps/public/src/lib/{members-render,surface-fields,pagination}.ts`
- `apps/public/tests/{members-render,authenticated-fragment}.test.ts`
- `apps/public/tests/integration/public-pages/scrape-test.spec.ts`
- `apps/public/COMPOSITION-CONTRACT.md` · `apps/public/package.json`
- `packages/i18n/src/catalog.ts` · `packages/i18n/locales/{en,hi}/members.json`
- `turbo.json`
- `.decision-log.md` · `friction-budget.md` · `docs/ux/empty-skeleton-error-inventory.md`
- `_bmad-output/implementation-artifacts/{deferred-work,gate-inventory,sprint-status}.md|.yaml`
- `apps/api/src/modules/public-pages/handlers.ts` · `apps/api/src/modules/public-pages/abuse-rules.ts` (code review, 2026-08-21)
- `apps/api/tests/integration/public-pages/member-directory.spec.ts` (code review, 2026-08-21)
- this story file

## Change Log

| Date | Change |
|---|---|
| 2026-08-20 | Story authored by `bmad-create-story`. D1–D6 raised and ⭐ **ruled by BigDev as recommended**; ⛔ Trap 1 (the `authenticated_member` tier has NO viewer) and the ⭐ NEW Niyamavali finding (suspension removes a member from the public directory; lock-in status becomes public) recorded for Task 1's decision-log entry `2026-08-20-143`. |
| 2026-08-20 | Story validated against the tree at `1bc46e0`. ⭐ **Trap 8 added** — the abuse audit line is a **counter, not a forensic record** (no context column; the locator is a constant for an unauthenticated visitor) and its event type must be **minted** in a closed union, ⛔ never borrowed from `abuse.honeypot`; D4(a)'s rationale bounded accordingly. ⭐ **Trap 6 rewritten** — three set-based cohort district reads already exist and are the shape to copy, and the latest-posting comparator is the committed D3 rule **`created_at DESC, posting_id DESC`** (⛔ `created_at DESC` alone would have broken AC2's own paging-stability clause). ⛔ The AC's *"abuse-detected accounts trigger temporary suspension + trustee review"* clause answered as **having no subject** on this surface rather than left unaddressed. AC1/T3 rate-limit keying resolved (`limits.search` **unmodified**; ⛔ no `keyGenerator` override). Corrected: the escalation-attestation regex is at `gate.ts:435` and ⛔ **never evaluates this story's decision id**; 48 API modules; `membersSurfaceFieldIds(model)` takes the render model; `resolvePublicMemberName` has no **production** call site; the epic's *"25 entries/page"* is the default, ⛔ not a second cap. |
| 2026-08-20 | ⭐ **IMPLEMENTED** (`bmad-dev-story`). The `member-directory` tier-leak leg is **OPERATIVE** — `membersSurfaceFieldIds(model)` returns `['district','member_name','member_status']`, and the discharge is proven by **planting a real leak into a snapshot that passes clean**. `2026-08-19-136` cl.4 (launch-blocking) **DISCHARGED**. All six "armed but empty" records rewritten in the same commit as the code; the committed "field set IS empty" assertion **replaced**, ⛔ not deleted. D1–D6 implemented as ruled, ⛔ none re-opened. ⛔ **TWO PRE-EXISTING DEFECTS ON `main` FOUND AND FIXED**: (1) `/members` threw on **every request** at `1bc46e0` because the `members` i18n namespace was never registered in `catalog.ts` — the same defect CLASS as 11a.2's `{{max}}` bug via a different mechanism, invisible for exactly the reason AC9 names; the **gap itself is now mechanized** (`catalog-registration.test.ts`), not just the instance fixed. (2) AC1's "second independent FR-91 enforcement" would have shipped **FALSE** — Story 1.14's guard detects `items`, not `entries`; renamed and then **verified by planting an unbounded limit**. ⚠ **One comment claim retracted before shipping**: the Epic-6 correlation mitigation compiles byte-identically in this query (the `innerJoin` already forces qualification) — verified by dumping the generated SQL; the comment now carries the honest bound, and the negative control that "proves" it is recorded as **proving nothing**. AC8 **partially discharged**: dynamic SSR HTML measured for real (19 234 B at the cap, 306 B/row) — ⛔ a different quantity from the static attribution, never summed; only the **timing** harness re-deferred, with a genuinely new reason + trigger. ⛔ **RAISED NOT CLOSED**: no Niyamavali clause describes a suspension removing a member from the directory, or lock-in being published (`-143` cl.8); `-140` cl.7 remains open and is now sharpest. 15 planted controls run live, exit codes recorded, all reverted, tree verified clean. ⛔ No migration, no new package, no new permission key; escalation ledger unchanged at 1 (a first-time classification is not an escalation). |
| 2026-08-21 | governance: Decision `2026-08-21-144` (commit `7aee1c3`) — the Trustee Panel rules all three open Niyamavali directory findings from the routing note. ⭐ The amendment lands in PROSE (the clause registry structurally cannot carry a publication clause — no `benefit_mechanism` value is honest for it). ⛔ `2026-08-20-140` cl.7 is ANSWERED but **NOT CLOSED**. |
| 2026-08-21 | governance: DRAFT Niyamavali amendment for ratification (commit `f1b1456`), discharging `144` cl.7(c). ⭐ Drafting surfaced that §4.4 ("public rendering is consent-gated and never default opt-in") is **INCONSISTENT** with the ruled directory policy and is expressly amended, ⛔ not reinterpreted — three amendments (A1 §4.4 exception, A2 Part 10 directory disclosure, A3 §8.4b de-listing), both locales. ⛔ NOT APPLIED — authorised, not made; ratification pending. |
| 2026-08-21 | fix (commit `12c7915`), discharging `144` cl.8: the public wire stops speaking the INTERNAL lifecycle word — `packages/contracts/src/public-pages/directory.ts`'s enum reads `['active','waiting-period']`, `handlers.ts` now emits `'waiting-period'`, and a negative-controlled guard (`packages/contracts/tests/public-pages-directory-vocabulary.test.ts`) asserts the PROPERTY (no internal lifecycle word reaches the enum) rather than restating a fixture. `row.state === 'lock-in'` stays as the correct INTERNAL read; the boundary is this one line. |
| 2026-08-21 | git action: `story/11a.3`'s history rewritten to close the "bundled Story 11a.4 authoring work" finding. `440bde6` corrected to carry only 11a.3's own record (the 11a-4-bundling paragraph removed from its message; the 11a-4 story file and its `sprint-status.yaml` row flip removed from its tree, since neither belongs to this story per Task 13); the five commits after it (`7aee1c3`, `f1b1456`, `12c7915`, and the two code-review commits) replayed cleanly on the corrected base, with one expected `sprint-status.yaml` conflict at the 11a-3/11a-4 row pair, resolved to `11a-3: in-progress` / `11a-4: backlog`. 11a.4's `bmad-create-story` output relocated to its own `story/11a.4-phone-email-obfuscation` branch off `main`. Local-only branch, not yet pushed — safe to rewrite; a pre-rewrite backup is kept at `story-11a3-backup-before-split`. |
| 2026-08-21 | live-DB verification: `twt-test-pg` (:5433) available this pass. `pnpm db:migrate` applied `0111` cleanly (no `42P07`); `pg_class` confirms `relrowsecurity`/`relforcerowsecurity` both `true` on `pariwar_directory_publication`. `directory-publication-policy.spec.ts` 16/16, `member-directory.spec.ts` 11/11 (including the 3 new kill-switch tests) in isolation; full `@twt/domain` live suite 3044/3045 (254/254 files, 1 pre-existing skip) and full `@twt/api` live suite 1051/1052 (122/122 files, 1 pre-existing skip) — zero failures either package. Both items from the code-review pass now closed; `Status` → `review`. |
| 2026-08-21 | code review (`bmad-code-review`): 4 `decision-needed` findings resolved by BigDev — total-count semantics documented as roster size (not rendered-item count); IP-spoofing trust boundary deferred to infra (network ACL/mTLS); per-Pariwar directory-publication enablement flag added; the bundled Story 11a.4 authoring work flagged for a pre-merge branch split (git action, not applied here). 14 `patch` findings applied: batched the per-row KMS decrypt, hardened the abuse-detector's fail-open catch (logged + reordered dedupe-vs-emit), fixed cross-test abuse-counter leakage, replaced a substring-scan leak check with the real `.strict()` schema, added a runtime shape guard on `resourceLocator`, fixed a decrypt-failure 500 to fail-soft per-row, normalized an empty-string `district`, added a distinct "past the end" page state, closed the AC6.1 page-size-cap drift gap with a cross-package test, backfilled this Change Log + File List with the three post-review commits, and closed AC4's tier-ceiling coverage gap with a real (simulated pre-escalation) `authenticated_member` control. 1 finding (probing a nonexistent `pariwarId`) was corrected on inspection — its proposed fix would have regressed an existing anti-enumeration property, so it was NOT applied. 1 finding (D6's Drizzle correlated-subquery false-negative) deferred as a pre-existing, honestly-documented tooling limitation. 3 findings dismissed as verified false positives / bounded-cost noise. |
