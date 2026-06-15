# Story 1.14: Rate-Limiting + Login-Wall + Forced-Pagination + Honeypot/Noindex `[PRIMITIVE]`

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As Solo Builder,
I want rate-limiting on every public/auth endpoint, login-wall on every authenticated surface, forced pagination on every list endpoint, and honeypot + noindex on admin surfaces,
So that abuse, scraping, enumeration, and discovery vectors are closed **by default** rather than per-endpoint.

This is the **§2.11 Layer-2 policy-enforcement primitive**: Story 1.13 shipped Cloudflare/Bot-Management/Turnstile (Layer 1 — IP-level, at the edge). This story builds the **server-side** counterpart so protection survives any edge bypass (break-glass direct-ingress §5.8 line 3263; substrate pivot per §5.8a) and applies to surfaces the edge does not see. It is a `[PRIMITIVE]`: the mechanisms + a "fails-closed-by-construction" guard, not a retrofit of many endpoints (at Epic 1 there is exactly **one** list endpoint and **no** member/JWT auth surface yet — see Scope reality).

## Acceptance Criteria

> Source BDD (epics.md L1256-1267, FR-89/90/91/92). Expanded + numbered for the dev.

**Given** FR-89 + FR-90 + FR-91 + FR-92 **When** the policy enforcement layer is authored, **Then**:

1. **AC-1 — Rate limiting is server-side enforced (not just edge-side) with per-IP + per-session + per-endpoint thresholds.** The existing global per-IP ceiling (`plugins/rate-limit`, `globalRateMax` 300/min) is extended with **named per-endpoint thresholds** (read/search vs write, stricter on write) and a **per-session key** for authenticated routes (key = session actor when present, else IP). Thresholds are env-overridable with **generous-but-finite bootstrap ceilings** (§2.11 "default-deny ceiling at bootstrap" — not "unlimited until Category 5"). The existing `loginRateMax` (10/min) + `stepUpRateMax` (5/min, per-actor+per-IP) per-route limits are preserved.

2. **AC-2 — Every authenticated endpoint requires a valid session; the gate fails closed.** `requireAdminSession` (the existing login-wall, `auth/shared/session-guard.ts`) already 401s on absent/expired session. This story makes "authenticated ⇒ guarded" enforced **by construction**: a guard (test over the route table / OpenAPI doc) proves no authenticated route is reachable without the session gate, so a future route that forgets the preHandler **fails CI, not in prod**. FR-90 (login-wall on nominee bank/account display, active-alert-window gated) is forward-referenced — those surfaces do not exist at Epic 1; this story ships the enforceable mechanism + guard, not the member-data routes.

3. **AC-3 — Every list endpoint enforces server-side pagination with a capped page size; no endpoint returns an unbounded result set.** The cursor-based pagination contract already exists (`@twt/contracts` `_common/pagination.ts`: `PaginationQuery` `limit.max(50)` public, `paginatedResponse()` wrapper). This story **enforces** it: `?limit=all` / `?page=all` is **rejected** (already fails the numeric Zod coercion → 400; assert it), the cap is applied, and a guard (test) asserts every collection-returning GET declares a bounded `limit` + a `paginatedResponse`-shaped body. The one existing list endpoint (audit-log history, admin-tier `limit.max(200)`) is brought under the policy.

4. **AC-4 — Admin/API surfaces serve `X-Robots-Tag: noindex, nofollow`, and honeypot routes exist.** A global `onSend` hook stamps `X-Robots-Tag: noindex, nofollow` on responses (the HTTP-header form FR-92 names — stronger than, and complementary to, the `<meta name="robots">` already present in `apps/admin/index.html:7`). **Honeypot** route(s) — synthetic paths a legitimate client never requests, advertised only as bot-bait — return a benign response **and emit an abuse-signal audit event** when hit.

**Given** abusive traffic patterns (synthetic test) **When** the patterns hit the policy layer, **Then**:

5. **AC-5 — Rate limits trip; the offending session/IP is throttled; the audit log records the event.** When a key exceeds its ceiling, the request gets `429` and the trip is recorded as a tamper-evident audit line via the **existing** `deps.auditSink.emit(...)` seam (Story 1.10 hash-chain) — a new `rate_limit.exceeded` event type (→ HTTP-equiv 429). Honeypot hits emit `abuse.honeypot`. Audit emission must **not** flood (one line per trip, not per subsequent rejected request — see Dev Notes).

6. **AC-6 — Tests prove the enforcement.** A dedicated `rate-limit.spec.ts` builds an app with a **low** ceiling (`testConfig({ … })`) and asserts the N+1th request is 429 **and** a `rate_limit.exceeded` audit event was captured — **this discharges deferred item CR-D-2** ("AC-7 rate-limit fires — zero coverage"). Plus: login-wall-fails-closed test, `?limit=all`-rejected + cap-enforced test, `X-Robots-Tag` present test, honeypot-hit emits `abuse.honeypot` test. `pnpm turbo lint typecheck test` GREEN repo-wide. Existing auth/step-up/turnstile suites stay green (the `TEST_ENV` 100 000 ceilings remain so unrelated specs do not trip 429).

## Tasks / Subtasks

- [x] **Task 1 — Named rate-limit thresholds + per-session keying (AC-1)**
  - [x] Extend `apps/api/src/config.ts` `ApiConfig` with named ceilings: e.g. `readRateMax` / `searchRateMax` (~60/min per §A L3483) and `writeRateMax` (stricter than read), all `intEnv(...)`-loaded + env-overridable with generous bootstrap defaults. Preserve `globalRateMax`/`loginRateMax`/`stepUpRateMax`.
  - [x] In `apps/api/src/plugins/rate-limit/index.ts`, export a `perSessionKey(request)` keyGenerator helper (`request.session?.userId ?? request.ip`) and a small named-threshold registry (so routes set `config: { rateLimit: NAMED }` instead of inline literals — mirror the existing `LOGIN_RATE`/`stepUpRate` shape).
  - [x] Keep the global per-IP ceiling as defense-in-depth (it already exists); ensure per-route overrides inherit the global `onExceeded`/`errorResponseBuilder` (verify — see Dev Notes "per-route inheritance").
  - [x] **Type ordering note (O-2):** `'rate_limit.exceeded'` is added to `AuthAuditEventType` in Task 2. When implementing the `onExceeded` closure in Task 1, stub the audit emit with `// TODO Task 2: deps.auditSink.emit(...)` to avoid a TypeScript error, or complete Task 2 first before wiring the emit body.
- [x] **Task 2 — Audit on trip + honeypot signal (AC-5, AC-4)**
  - [x] Add `'rate_limit.exceeded'` and `'abuse.honeypot'` to `AuthAuditEventType` (`apps/api/src/audit/audit-sink.ts`); extend `statusForAuthEvent` in `audit-log-sink.ts` so `rate_limit.exceeded → 429` (honeypot → 200 or 403, your call — document it). No other sink change needed: `authEventToAuditInput` passes `action: event.type` straight through to the hash-chain row.
  - [x] Wire a **global** `onExceeded(request, key)` at `registerRateLimit` that calls `deps.auditSink.emit({ type: 'rate_limit.exceeded', actorId: request.session?.userId ?? null, traceId: request.requestContext?.traceId, context: { ip: request.ip, routeUrl: request.routeOptions?.url, key }, at: deps.clock() })`. **Avoid flood** — emit on the trip (`onExceeded`), not on every subsequent rejected request; if the store fires `onExceeded` repeatedly, add a per-key-per-window dedupe (small note: CR-B-1 is the cautionary precedent).
  - [x] Add a custom `errorResponseBuilder` so the 429 body uses the project `ErrorResponse` envelope (`{ error: { code: 'rate_limit.exceeded', message, request_id } }`) — match `setNotFoundHandler` / `errorMappingHandler` shape.
- [x] **Task 3 — Honeypot routes + `X-Robots-Tag` noindex hook (AC-4)**
  - [x] Add a global `onSend` hook stamping `X-Robots-Tag: noindex, nofollow` on every response (home: a new `apps/api/src/plugins/security-headers/` or fold beside `originCheckHook` — see Project Structure Notes variance). Register in `server.ts` in the load-bearing order.
  - [x] Add honeypot route(s) (e.g. `GET /admin-login.php`, `GET /wp-admin`, or a `config`-driven set) that return a benign 200/404-looking body and emit `abuse.honeypot` via `deps.auditSink.emit`. Keep them OUT of the OpenAPI doc (`schema: { hide: true }`) and exempt from the forced-pagination guard.
- [x] **Task 4 — Forced-pagination enforcement + guard (AC-3)**
  - [x] Confirm `?limit=all` is rejected and assert it in tests. **Rejection mechanism differs by schema**: `ListChecksQuery` uses `z.coerce.number()` (NaN → `.int()` fails → 400) while `PaginationQuery` uses `z.number()` (string type-mismatch → 400). Both produce 400; the error detail body differs. **Guard-test assertion must check `statusCode === 400` only — do not assert the error detail message** (fragile across schema types). `?page=all` is also rejected because `PaginationQuery` is `.strict()` (unknown key) and `ListChecksQuery` has no `page` param. Reject any over-cap `limit` (Zod `.max()` already does; assert).
  - [x] Bring the audit-log history list (`modules/audit-log/index.ts` `ListChecksQuery`, `limit.max(200)`) under the shared policy. Two options — pick one and document: **(a) Keep `ListChecksQuery`** (its own `max(200)` admin-tier cap is the sanctioned bound per §3.2); add `config: { rateLimit: { max: deps.config.readRateMax, timeWindow: '1 minute', keyGenerator: perSessionKey } }` to the route registration to apply the named per-session threshold (this is the only existing authenticated list endpoint and the proof-of-concept for `perSessionKey`). **(b) Adopt `PaginationQuery`** only if the 50-cap is acceptable for admin audit lists — note that this drops the existing `.default(30)`, so either add `.default(30)` to the route's querystring schema override or add an explicit SQL fallback limit to avoid returning all rows when `limit` is omitted.
  - [x] Add a **guard test** asserting every collection-returning GET (introspect `app.routes` / the swagger OpenAPI doc) declares a bounded `limit` and a `paginatedResponse`-shaped 200 body. Honeypot + single-object GETs (e.g. `/me`, integrity-status) are exempt by allowlist/convention.
- [x] **Task 5 — Login-wall fails-closed guard (AC-2)**
  - [x] Confirm `requireAdminSession` is on every authenticated route (it is, today). Add a **guard test** asserting no route outside an explicit public allowlist (health, login, password-reset-request, `/_meta/csrf`, honeypot, swagger) is reachable without the session gate — so a future unguarded authenticated route fails CI.
- [x] **Task 6 — Tests (AC-6) — discharges CR-D-2**
  - [x] `apps/api/tests/integration/rate-limit.spec.ts`: low-ceiling `createTestApp`/`testConfig` override; fire N+1 `app.inject` from one IP; assert N+1th = 429 + `CapturingAuditSink.ofType('rate_limit.exceeded')` non-empty. Hermetic (no DB) so it runs everywhere.
  - [x] login-wall-fails-closed spec; `?limit=all` rejected + cap spec; `X-Robots-Tag` present spec; honeypot-hit `abuse.honeypot` spec.
  - [x] `pnpm turbo lint typecheck test` GREEN; existing suites unaffected.
- [x] **Task 7 — Docs / deferrals / completion notes**
  - [x] Completion notes: record the **multi-instance in-memory store** consequence (Add-Redis trigger §1.4 L806) + the honeypot/noindex **source-tree variance** + bootstrap-ceiling values + CR-D-2 discharge.
  - [x] Open deferred items: distributed rate-limit store (when multi-instance / Add-Redis trigger); Category-5 threshold tuning; edge `X-Robots-Tag` transform rule (optional, fold into 1.13 infra deferral); optionally pick up TEW1 (`openapi/v1.yaml` `^\S+$` tightening — 1.14 was named as a candidate).
  - [x] No new ADR required (see Dev Notes "ADR posture"). Architect may elect ADR-0011 to formalize the bootstrap-ceiling policy if desired.

## Dev Notes

### Scope reality — what exists, what is forward-referenced

**`[PRIMITIVE]`. Do not over-build.** At Epic 1 the surface is tiny; most of this story is *mechanism + guard*, and a large fraction of the enforcement is **already present** and only needs to be extended/enforced:

| Concern | Already exists | This story adds |
|---|---|---|
| Rate-limit (per-IP global) | `plugins/rate-limit/index.ts` (`@fastify/rate-limit@11`, global 300/min) + per-route `LOGIN_RATE`, `stepUpRate` (per-actor+IP keyGen) | Named per-endpoint thresholds (read/search/write), per-session key helper, global `onExceeded` audit emit, `errorResponseBuilder` |
| Login-wall | `auth/shared/session-guard.ts` `requireAdminSession` (401s, fails closed, destroys session) | A **guard test** so "authenticated ⇒ guarded" holds by construction |
| Forced pagination | `@twt/contracts` `_common/pagination.ts` (`PaginationQuery` max 50, `paginatedResponse`); `?limit=all` already 400s on coercion | Enforcement guard test + bring audit-log list under policy + explicit `limit=all` rejection assertion |
| Noindex | `apps/admin/index.html:7` `<meta name="robots" content="noindex, nofollow">` | The **`X-Robots-Tag` HTTP header** (global onSend hook) |
| Honeypot | — (net-new) | Trap route(s) emitting `abuse.honeypot` |
| Audit on trip | `deps.auditSink.emit` seam → Story 1.10 hash-chain (`createAuditLogSink`) | New event types `rate_limit.exceeded` / `abuse.honeypot` |

**Forward-referenced — DO NOT build here:**
- **FR-90 member-data login-wall** (nominee bank/account, active-alert-window gated, FR-22 `live`): those routes are Epic 6/7/11a. Ship the enforceable gate + guard only.
- **Member/JWT auth + OTP-per-phone throttle** (§2.11 per-resource): `auth/member/` + `plugins/jwt/` are not built (Epic 3). The per-phone keyGenerator is the *same shape* as the existing step-up per-actor keyGen — leave it for Epic 3.
- **Public list endpoints** (Member Directory, Sahyog archive): Epics 3/11a. Only the audit-log history list exists now.
- **apps/public (Astro)**: a stub (Story 2.5). Do not scaffold. The noindex/honeypot primitive is consumed by the real surface (apps/admin + the API).

### ⚠ Naming collision — architecture "§1.14" ≠ "Story 1.14"

Architecture **§1.14** is the **member lifecycle state machine** (`pending-kyc → … → anonymized`, AR-14, consumed in Epic 3). It is **unrelated** to this story. Every `§1.14` reference in epics.md/architecture.md is about member state — do **not** pull member-state work into this rate-limiting story. (`packages/domain/src/member/state.ts` D4-1.3 is the member-state home; not touched here.)

### Architecture compliance — the spec this implements

- **§2.11 Rate limiting strategy (architecture.md L1700-1720):** three layers — Cloudflare front-line (FR-88, Layer 1, **done in 1.13**); **per-session at API via `@fastify/rate-limit` with configurable per-endpoint limits, write stricter than read, signup strictest** (this story, Layer 2); per-resource throttling (OTP/search/WebAuthn — partly forward-referenced). **"Default-deny rate-limit ceiling at bootstrap"** — every endpoint ships a generous-but-finite ceiling now; Category 5 tightens later. Threshold *values* → Category 5 Observability (L1716, L1785) — so do not agonize over exact numbers; pick sane bootstrap ceilings, env-overridable.
- **§3.2 Pagination (architecture.md L1834-1846):** cursor-based, opaque cursor, page-size capped per FR-91 (max 50 public; higher for authed admin within reason), `?cursor=&limit=`, response `next_cursor`+`has_more`, **`?limit=all` rejected**, forced on public surfaces. The contract (`_common/pagination.ts`) already encodes this. Cursor *signing* (HMAC/encrypted/opaque-lookup) is a downstream per-endpoint implementation ADR (L1844-1846) — **not** this story.
- **§1.4 No Redis at Phase 1 (architecture.md L796-808):** Postgres-only for cache/idempotency/jobs; **no Redis**. See the multi-instance caveat below.
- **FR-89/90/91/92 (prd.md L1134-1148):** FR-89 per-endpoint limits strict on auth/write/search; FR-90 login-wall on nominee bank/account gated on auth AND active-alert-window; FR-91 `?page=all` rejected + max page size + no bulk export from public; FR-92 honeypot fields + `<meta robots noindex,nofollow>` on member-detail/search pages.
- **Threat model (architecture.md L1307):** external scrapers countered by Cloudflare+BotMgmt+Turnstile (FR-88, done) **+ forced pagination (FR-91, this story)** + PII matrix (FR-74) + scrape-test CI.

### ⚠ KEY design caveat — in-memory store is per-instance (no Redis)

`@fastify/rate-limit` defaults to an **in-memory** store. With **no Redis** (§1.4) and a future multi-instance Cloud Run/Dokploy deploy, per-instance counters mean the *effective* ceiling is `max × instanceCount`, and a per-session limit only holds if requests for a session are sticky. This is **acceptable for the bootstrap primitive** because:
1. **Cloudflare (Layer 1) is the real cross-instance IP limiter** (§2.11) — the API layer is per-session + defense-in-depth, explicitly the second line.
2. §2.11 frames API limits as **bootstrap ceilings**, tuned in Category 5.
3. Phase-1 concurrency is low; the **Add-Redis trigger** (§1.4 L806: sustained queue depth / DB pressure) is the documented escalation.

**Action:** ship in-memory now (matches the existing plugin); **record the consequence in completion notes + open a deferred item** (distributed rate-limit store at the Add-Redis trigger / multi-instance). Do **not** build a Postgres-backed `@fastify/rate-limit` store in this story unless trivially justified — it is premature and contradicts the "no Redis, bootstrap ceiling" posture. (A custom store is possible via the `store`/`incr`/`child` interface if a later story needs it.)

### `@fastify/rate-limit@11` — verified API (Fastify 5.8.5, June 2026)

Installed: `fastify@5.8.5`, `@fastify/rate-limit@11.0.0` (the v5-compatible major), `@fastify/session@11.1.1`, `@fastify/csrf-protection@8.0.0`.

- `keyGenerator: (request) => string` (default `request.ip`). Sync/async. → per-session = `request.session?.userId ?? request.ip`.
- `max: number | async (request, key) => number`; `timeWindow: string | number` (e.g. `'1 minute'`).
- **`onExceeded(request, key) => void`** — fires when the limit is exceeded (the 429 path). **Use this for the audit emit.** Note: may fire on subsequent rejected requests within the window depending on store — so **dedupe per key/window** to avoid an audit flood (CR-B-1 precedent).
- `onExceeding(request, key) => void` — fires on *every* counted request approaching the limit; **too noisy for audit** — do not use it for the audit line.
- `errorResponseBuilder: (request, context) => object` — `context` has `max`, `after`, `ttl`, `ban`. Use to emit the project `ErrorResponse` envelope on 429.
- `ban: number` — N 429s → 403 (set 0 = immediate 403). Optional escalation for the "offending IP throttled" AC (a banned scraper gets 403). Consider for honeypot/abuse keys.
- **Per-route:** `config: { rateLimit: { max, timeWindow, keyGenerator, … } }`; `rateLimit: false` disables. **Per-route inheritance:** per-route config overrides only the keys it sets and inherits the rest from global — so a **global `onExceeded`/`errorResponseBuilder` should apply to per-route-limited routes too. Verify** with a test (login route at low ceiling → asserts the global audit emit fired); if it does not inherit, thread `onExceeded` into the `LOGIN_RATE`/`stepUpRate` configs explicitly.
- Custom store (future): class with `incr(key, cb, timeWindow, max) → {current, ttl}` + `child(routeOptions)`.

### Reuse, do NOT reinvent — existing seams

- **Audit:** `deps.auditSink.emit(event)` — already wired to the Story 1.10 hash-chain (`createAuditLogSink(servicePool)`, `deps.ts:135`). `authEventToAuditInput` (`audit-log-sink.ts`) does `action: event.type` pass-through, so a new enum member needs only a `statusForAuthEvent` status mapping. Events carry **no secret material** (context is non-secret + SHA-256'd) — for rate-limit, context = `{ ip, routeUrl, key }` (key may be a session id/IP — non-secret).
- **Login-wall:** `requireAdminSession(deps)` (`session-guard.ts`) — reuse as-is; the new work is the *guard test*, not a new gate.
- **Cross-cutting hook pattern:** `originCheckHook` (`plugins/csrf-protection/index.ts:50`) is the model for the `X-Robots-Tag` onSend hook and any global policy hook — a `(deps) => hookHandler` factory registered in `server.ts`.
- **Per-route limit + custom keyGen pattern:** `modules/step-up/index.ts:33-44` (`stepUpRate` with composed per-actor+per-IP keyGenerator) and `admin-auth.routes.ts:46-50` (`LOGIN_RATE`) — copy this shape for named thresholds.
- **Pagination contract:** `@twt/contracts` `_common/pagination.ts` — `PaginationQuery`, `paginatedResponse(item)`, `Cursor`. Do not re-define page shapes.
- **Config loader:** `config.ts` `intEnv(env, KEY, fallback)` — add new ceilings the same way (already has `globalRateMax`/`loginRateMax`/`stepUpRateMax`).
- **Error envelope:** `http-errors.ts` (`UnauthorizedError`, `ForbiddenError`) + `errorMappingHandler` + `setNotFoundHandler` (`server.ts:50`) — the 429 body must match `{ error: { code, message, request_id } }`.

### Server registration order (load-bearing — `server.ts:57-73`)

request-context (onRequest, FIRST) → cookie → session → csrf → **rate-limit** → swagger → originCheck (onRequest) → routes. The `X-Robots-Tag` onSend hook can register anywhere (onSend runs late); honeypot routes register with the other routes. **The audit `onExceeded` closure needs `deps`** — `registerRateLimit(app, deps)` already receives it. The per-session keyGenerator needs the session loaded — it runs in the rate-limit hook which is after `registerSession`, so `request.session` is available (same ordering the step-up keyGen relies on — see `step-up/index.ts:6`).

### Audit-flood avoidance (CR-B-1 precedent)

Deferred CR-B-1 warns that emitting an audit line per request (the `scope.change` flood) makes the trail "unqueryable for anomaly detection." Apply the lesson here: a tripped limit can reject many requests in a window — emit **one** `rate_limit.exceeded` line per key-per-window. Honeypot hits are naturally rare → one line per hit is fine.

**Concrete deduplication recipe** — a window-bucketed Map in the `registerRateLimit` closure:

```ts
const exceeded = new Map<string, number>(); // bucketKey → emitMs (for lazy pruning)
const windowMs = 60_000; // matches the rate-limit timeWindow

// inside onExceeded(request, key):
const bucket = Math.floor(deps.clock().getTime() / windowMs);
const bucketKey = `${key}:${bucket}`;
if (!exceeded.has(bucketKey)) {
  exceeded.set(bucketKey, deps.clock().getTime());
  // Lazy prune: evict entries from previous windows to keep memory bounded
  for (const [k, t] of exceeded) {
    if (deps.clock().getTime() - t > windowMs * 2) exceeded.delete(k);
  }
  deps.auditSink.emit({ type: 'rate_limit.exceeded', … });
}
```

**Why not rely solely on `ban`?** `ban: N` converts the *N+1*th consecutive 429 to 403, which *may* reduce `onExceeded` call frequency depending on the store implementation — but the `@fastify/rate-limit` docs do not guarantee `onExceeded` is suppressed after the ban threshold. The Map approach is deterministic and store-agnostic. Use `ban` as an *escalation* (scraper gets 403 eventually) independently of the audit dedup.

### ADR posture — no new ADR required

Per the architecture-vs-ADR boundary (ADRs commit cloud controls; architecture commits properties) and architecture-vs-PRD (PRD commits policy/cadence): §2.11 already commits the 3-layer rate-limit architecture; §1.4 commits no-Redis + the Add-Redis trigger; §3.2 commits forced pagination + `?limit=all` rejection; FR-92 commits honeypot/noindex. This story **implements already-committed properties** at the app layer — no cloud control, no new architectural decision. Threshold *values* are policy → Category 5, not an ADR. Record the source-tree variance + bootstrap ceilings + multi-instance consequence in **completion notes** (the discipline used for `packages/edge` in 1.13). Architect *may* elect **ADR-0011** purely to formalize the bootstrap-ceiling/abuse-signal policy — optional, not a blocker.

### Config / env additions (mirror existing)

Add to `config.ts` (env-overridable, generous bootstrap defaults), e.g.:
- `readRateMax` / `searchRateMax` (env `SEARCH_RATE_MAX`, ~60/min per §A L3483),
- `writeRateMax` (env `WRITE_RATE_MAX`, stricter than read),
- optionally honeypot route set + `ban` threshold.
Keep `RATE_LIMIT_MAX`/`LOGIN_RATE_MAX`/`STEP_UP_RATE_MAX`. **`apps/api/.env.example` must document any new var** (the `[config]` loader throws on missing *required* vars — keep these optional with defaults so the stack still boots with zero config, matching the Turnstile-optional posture).

### Testing standards + project gotchas

- **Harness:** `tests/integration/_setup.ts` — `createTestApp(overrides?)` builds via the real `buildServer`; `testConfig(extra)` overrides env (→ low ceilings for the 429 test); `CapturingAuditSink` records events (`.ofType('rate_limit.exceeded')`); all HTTP via `app.inject(...)` (no port, no supertest); DB-touching specs guard with `describe.skipIf(!hasDatabase)`. The rate-limit + login-wall + pagination-reject + noindex + honeypot specs are **hermetic** (no DB) → run everywhere.
- **Gotcha — the 100 000 ceilings:** `TEST_ENV` sets `RATE_LIMIT_MAX`/`LOGIN_RATE_MAX`/`STEP_UP_RATE_MAX = 100000` so the many `inject()` calls (all from `127.0.0.1`) don't trip 429 in unrelated suites. The new `rate-limit.spec.ts` must **locally** override to a *low* ceiling (e.g. `testConfig({ SEARCH_RATE_MAX: '3' })` or `createTestApp` with a low-ceiling config) and fire from a single IP to force the trip. Do **not** lower the global `TEST_ENV` ceilings (it would break every other suite).
- **Discharges CR-D-2** (deferred-work.md L194): this is the "per-test env-override pattern + dedicated `rate-limit.spec.ts`" it asked for.
- **Live-DB discipline (memory):** no audit/DB row-count assertions that assume an empty table (own-committing writers accumulate); assert membership not counts. Test DB = `twt-test-pg` on 5433; never regenerate an applied migration; never `DROP SCHEMA`.
- **No new migration expected** — this is stateless config + hooks + route guards. (Audit rows go through the existing Story 1.10 writer; no schema change.)

### Previous-story intelligence (Story 1.13 — Cloudflare/Turnstile, done)

- 1.13 shipped **Layer 1** (edge). This story is **Layer 2** (server). They compose: server-side limits must hold even when the edge is bypassed (break-glass §5.8 L3263) or pivoted (§5.8a).
- 1.13 established the **source-tree-variance discipline**: `packages/edge` was not in the architecture tree (AR-52 override) → recorded in ADR-0010 + completion notes + Project Structure Notes. Apply the same when homing honeypot/noindex (the arch tree lists `plugins/rate-limit` but **not** a honeypot/security-headers home — see below).
- 1.13 fixed a **load-bearing regression** (a discarded `verify()` boolean). Watch for the analogous trap here: ensure the rate-limit `onExceeded` audit emit and the pagination guard are actually *wired*, not inert — assert them in tests (a guard that never runs is worse than none).
- 1.13 deferrals D1-D5 are edge/infra — not blockers here. D5-1.13 (Bot-Management plan-tier) is the Layer-1 abuse signal; the honeypot here is a Layer-2 complement that works with zero Cloudflare config.

### Project Structure Notes

- **`apps/api/src/plugins/rate-limit/`** — extend in place (arch tree L4264 sanctions this home for `@fastify/rate-limit`).
- **`X-Robots-Tag` onSend hook + honeypot routes** — the architecture source tree (L4255-4280) lists `plugins/{zod-openapi,swagger,session,jwt,rate-limit,cookie}` and `middleware/{request-context,scope-resolution,audit-context,error-mapping}` but **no** honeypot/security-headers home. **This is a deliberate source-tree variance** (same class as `packages/edge` in 1.13). Recommended homes: `apps/api/src/plugins/security-headers/` (the noindex onSend hook + future security headers) and a small honeypot route registrar (`plugins/security-headers/honeypot.ts` or `modules/honeypot/`). **Record the variance in completion notes + here.** Folding the noindex hook beside `originCheckHook` in `csrf-protection/` is an acceptable lower-variance alternative — dev's call; document whichever.
- **Audit taxonomy** — `AuthAuditEventType` is becoming a general security-audit taxonomy (it already carries `authz.denied`, `scope.change`, and KMS events use a parallel hook). Adding `rate_limit.exceeded`/`abuse.honeypot` is consistent; a future rename to a neutral `SecurityAuditEventType` is out of scope (note it, don't do it).
- **`@twt/contracts` `_common/pagination.ts`** — consume; do not modify the shape.
- No new package. No migration.

### References

- Story (BDD source): [epics.md L1250-1268](../planning-artifacts/epics.md) — Story 1.14 + FR-89..92.
- §2.11 Rate limiting strategy: [architecture.md L1700-1720](../planning-artifacts/architecture.md) (+ threshold values deferred L1716/L1785; §A thresholds L3482-3483).
- §3.2 Pagination: [architecture.md L1834-1846](../planning-artifacts/architecture.md).
- §1.4 No-Redis + Add-Redis trigger: [architecture.md L796-808](../planning-artifacts/architecture.md).
- Threat model (external scrapers): [architecture.md L1307](../planning-artifacts/architecture.md).
- Source tree (plugins/middleware homes): [architecture.md L4255-4280, L4264, L4529](../planning-artifacts/architecture.md).
- FR-89/90/91/92: [prds/prd-TWT-2026-05-22/prd.md L1134-1148](../planning-artifacts/prds/prd-TWT-2026-05-22/prd.md).
- Existing rate-limit plugin: `apps/api/src/plugins/rate-limit/index.ts`.
- Per-route limit + keyGen pattern: `apps/api/src/modules/step-up/index.ts:33-44`, `apps/api/src/modules/auth/admin/admin-auth.routes.ts:46-50`.
- Login-wall: `apps/api/src/modules/auth/shared/session-guard.ts`.
- Cross-cutting hook pattern: `apps/api/src/plugins/csrf-protection/index.ts:50` (`originCheckHook`).
- Audit seam + taxonomy: `apps/api/src/audit/audit-sink.ts` (`AuthAuditEventType`), `apps/api/src/audit/audit-log-sink.ts` (`authEventToAuditInput`, `statusForAuthEvent`), `apps/api/src/deps.ts:135`.
- Pagination contract: `packages/contracts/src/_common/pagination.ts`.
- Existing list endpoint: `apps/api/src/modules/audit-log/index.ts:120-195` (`ListChecksQuery`, `limit.max(200)`).
- Admin noindex meta (already present): `apps/admin/index.html:7`.
- Server bootstrap order: `apps/api/src/server.ts:34-77`.
- Test harness + the 100 000 ceiling gotcha: `apps/api/tests/integration/_setup.ts:42-60`.
- Discharges: **CR-D-2** [deferred-work.md L194](deferred-work.md) (rate-limit 429 coverage). Optional pickup: **TEW1** [deferred-work.md L868] (`openapi/v1.yaml` `^\S+$`). Cautionary: **CR-B-1** [deferred-work.md L959] (audit flood).
- `@fastify/rate-limit` v11 API: https://github.com/fastify/fastify-rate-limit (verified June 2026 — `onExceeded`/`onExceeding`, `keyGenerator`, `errorResponseBuilder`, `ban`, per-route `config.rateLimit`, custom `store`).

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (BMAD dev-story workflow)

### Debug Log References

- **Load-bearing regression caught (the 1.13-style trap the Dev Notes flagged).** The initial `X-Robots-Tag` implementation was a global **onSend** hook (per the task wording). Against the live test DB it produced an `ERR_HTTP_HEADERS_SENT` unhandled error in the *existing* `admin-auth.spec.ts` logout test. Root cause: the logout handler does `void reply.status(204).send()` — a fire-and-forget send from an `async` handler that returns `void`. An **async** onSend hop introduces a microtask delay in the send pipeline; during that gap the handler resolves with `undefined` while `reply.sent` is still `false`, so Fastify double-sends → the second `writeHead` throws. Isolation confirmed: toggling the hook off removed the error. **Fix:** stamp the header in an **onRequest** hook instead — runs before anything is sent, persists through 204/404/429/500, zero send-pipeline interaction. Identical observable behaviour; auth code untouched. (The latent logout double-send is recorded as a deferred observation below.)
- **Per-route inheritance verified two ways.** (1) Source: `@fastify/rate-limit` `mergeParams` = `Object.assign({}, globalParams, routeConfig)`, so a per-route `config.rateLimit` inherits the global `onExceeded` + `errorResponseBuilder` (only `ban` resets per route). (2) Test: the named per-route audit-list trip fires the *global* audit emit (`rate-limit.spec.ts`).

### Completion Notes List

- **§2.11 Layer-2 server-side enforcement primitive — mechanism + guards, not a retrofit.** At Epic 1 the surface is one list endpoint and no member/JWT auth, so this ships the enforceable mechanisms + "fails-closed-by-construction" guards. Most enforcement already existed and was extended/enforced, not reinvented.
- **Rate limiting (AC-1/AC-5).** `config.ts` gained env-overridable named ceilings: `readRateMax=120`, `searchRateMax=60`, `writeRateMax=30` (write stricter than read; bootstrap ceilings tuned in Category 5). `plugins/rate-limit/index.ts` exports `perSessionKey` (`session.userId ?? ip`) + `namedRateLimits(deps)`, and registers a **global** `onExceeded` audit emit (window-bucketed dedupe → one `rate_limit.exceeded` line per key-per-window, CR-B-1) + an `errorResponseBuilder` returning an `ApiError` so the existing `errorMappingHandler` produces the 429 envelope. Per-route limits inherit both (verified).
- **Audit taxonomy (AC-5/AC-4).** `rate_limit.exceeded` (→429) and `abuse.honeypot` (→200, documented) added to `AuthAuditEventType`; `statusForAuthEvent` extended. Pass-through to the Story 1.10 hash-chain needed no sink change.
- **Honeypot + noindex (AC-4).** New `plugins/security-headers/`: onRequest `X-Robots-Tag: noindex, nofollow` (every response) + 6 hidden honeypot traps (`/wp-login.php`, `/wp-admin`, `/xmlrpc.php`, `/.env`, `/admin.php`, `/phpmyadmin`) returning benign 200 + emitting `abuse.honeypot` per hit.
- **Forced pagination (AC-3).** Audit-list brought under the named per-session `read` ceiling (option (a): kept `ListChecksQuery` `max(200)`). Guard test over the swagger doc asserts every collection-returning GET declares a bounded `limit` (≥1 examined, never vacuous). The `paginatedResponse` cursor-shape clause activates for public list routes (Epic 3+); the only Epic-1 list is the admin audit history (bare-array, bounded), so the enforceable invariant today is bounded-limit.
- **Login-wall (AC-2).** `requireAdminSession` tags its handler with `ADMIN_SESSION_GUARD`; `route-registry.ts` (onRoute collector) feeds `login-wall.spec.ts`, asserting every non-allowlisted route carries the gate — a future unguarded authenticated route fails CI.
- **CR-D-2 DISCHARGED.** `rate-limit.spec.ts` is the dedicated low-ceiling 429+audit coverage the deferred item asked for.
- **⚠ KEY CAVEAT — in-memory store is per-instance (no Redis, §1.4).** `@fastify/rate-limit` defaults to an in-memory store; on a future multi-instance deploy the effective ceiling is `max × instanceCount`. **Accepted for the bootstrap primitive** (Cloudflare Layer-1 is the real cross-instance IP limiter; these are bootstrap ceilings; Phase-1 concurrency is low). Distributed store deferred to the Add-Redis trigger (§1.4 L806).
- **Source-tree variance (recorded, 1.13-discipline).** `plugins/security-headers/` + `route-registry.ts` are not in the architecture source tree (L4255-4280, which lists no honeypot/security-headers/route-registry home) — a deliberate variance, same class as `packages/edge` in 1.13.
- **Bootstrap ceilings** documented in `apps/api/.env.example`; all optional with defaults (stack boots with zero config, matching the Turnstile-optional posture). `TEST_ENV` ceilings set to 100000 (incl. the new named vars) so unrelated suites don't trip; `rate-limit.spec.ts` overrides locally.
- **No new migration, no new ADR** (implements already-committed §2.11/§3.2/§1.4/FR-92 properties). Architect may elect ADR-0011 to formalize the bootstrap-ceiling/abuse-signal policy — optional.
- **Validation:** `pnpm turbo lint typecheck test` GREEN (53/53). Full `apps/api` suite GREEN hermetically (50 pass / 35 DB-skip) and against the live test DB (85/85, zero errors).

**Open deferred items (for deferred-work.md / Architect):**
- Distributed rate-limit store (custom `@fastify/rate-limit` store) at the Add-Redis trigger / first multi-instance deploy.
- Category-5 rate-limit threshold tuning (the ceilings are bootstrap values).
- Edge `X-Robots-Tag` transform rule at Cloudflare (optional; fold into the 1.13 infra deferral) — the server header is the authoritative copy.
- Member/JWT per-resource throttle (OTP-per-phone, search, WebAuthn) — forward-referenced to Epic 3 (same keyGen shape as the existing step-up per-actor key).
- **Latent logout double-send** (`admin-auth.handlers.ts` logout `void reply.status(204).send()` from an async void handler) — harmless today, but the next async onSend hook anywhere would re-expose it; convert to `return reply.status(204).send()` when next in that file.
- TEW1 (`openapi/v1.yaml` `^\S+$` tightening) — NOT picked up this story; remains a candidate.

### File List

**Modified:**
- `apps/api/src/config.ts` — named `readRateMax`/`searchRateMax`/`writeRateMax` ceilings.
- `apps/api/src/audit/audit-sink.ts` — `rate_limit.exceeded` + `abuse.honeypot` event types.
- `apps/api/src/audit/audit-log-sink.ts` — `statusForAuthEvent` (429 / 200) mappings.
- `apps/api/src/plugins/rate-limit/index.ts` — `perSessionKey`, `namedRateLimits`, global `onExceeded` audit emit (dedupe) + `errorResponseBuilder`.
- `apps/api/src/modules/auth/shared/session-guard.ts` — `ADMIN_SESSION_GUARD` marker on the gate.
- `apps/api/src/modules/audit-log/index.ts` — audit-list under the named per-session `read` limit.
- `apps/api/src/server.ts` — wire `collectRoutes`, `registerSecurityHeaders`, `registerHoneypot`.
- `apps/api/.env.example` — document the rate-limit env vars.
- `apps/api/tests/integration/_setup.ts` — `TEST_ENV` named ceilings at 100000.

**Added:**
- `apps/api/src/plugins/security-headers/index.ts` — `X-Robots-Tag` onRequest hook + honeypot traps.
- `apps/api/src/route-registry.ts` — onRoute collector for the AC-2/AC-3 guards.
- `apps/api/tests/integration/rate-limit.spec.ts` — AC-1/AC-5/AC-6 (discharges CR-D-2).
- `apps/api/tests/integration/forced-pagination.spec.ts` — AC-3 rejection + guard.
- `apps/api/tests/integration/login-wall.spec.ts` — AC-2 fails-closed guard.
- `apps/api/tests/integration/security-headers.spec.ts` — AC-4 X-Robots-Tag + honeypot.

### Review Findings

3 review layers (Blind Hunter · Edge Case Hunter · Acceptance Auditor). 0 decision-needed · 0 patches · 7 deferred · 9 dismissed.

- [x] [Review][Defer] CR-D1-1.14: Audit dedup key is actor-scoped, not route-scoped [`apps/api/src/plugins/rate-limit/index.ts`] — deferred, pre-existing design choice. Same actor tripping two different named rate-limit routes in the same 1-minute window produces a single `rate_limit.exceeded` audit line (the first trip's `routeUrl`). Subsequent route trips are silently collapsed. By spec design ("one line per key per window"); future story could key on `${key}:${routeUrl}:${bucket}` if per-route granularity is needed.
- [x] [Review][Defer] CR-D2-1.14: `emitted` dedup Map has no size cap — grows O(unique keys / 2-min window) under high-cardinality DDoS [`apps/api/src/plugins/rate-limit/index.ts`] — deferred, bootstrap limitation. Acceptable while single-instance and Cloudflare Layer-1 is the primary IP limiter. Address at Add-Redis trigger (§1.4 L806) when distributed store is introduced.
- [x] [Review][Defer] CR-D3-1.14: `search` and `write` named thresholds defined in `namedRateLimits` but not wired to any route [`apps/api/src/plugins/rate-limit/index.ts`] — deferred, forward-reference. No Epic 1 search/write endpoints exist. Apply when first search/write routes ship (Epic 3+).
- [x] [Review][Defer] CR-D4-1.14: `paginatedResponse` cursor-shape assertion absent from forced-pagination guard [`apps/api/tests/integration/forced-pagination.spec.ts`] — deferred, explicitly noted in completion notes (Epic 3+ trigger). Current guard asserts bounded `limit` only; cursor-shape clause activates when first public list routes ship.
- [x] [Review][Defer] CR-D5-1.14: Forced-pagination guard validates OpenAPI schema `maximum` declaration, not runtime enforcement for future routes [`apps/api/tests/integration/forced-pagination.spec.ts`] — deferred, single endpoint adequate now. New list routes should include a behavioral `?limit=cap+1` rejection test at registration to prove enforcement is wired, not just declared.
- [x] [Review][Defer] CR-D6-1.14: No test asserts `loginRateMax` / `stepUpRateMax` per-route limits still trip at their declared ceilings — deferred, pre-existing coverage gap. Existing test suites run at 100000 ceiling so the per-route limits never fire in tests. Preserved in code; behavioral test would require a dedicated low-ceiling spec analogous to `rate-limit.spec.ts`.
- [x] [Review][Defer] CR-D7-1.14: Minor — `path` field in honeypot audit context contains full URL including query string (`request.url`); field name implies path-only [`apps/api/src/plugins/security-headers/index.ts`]. Also: `?limit=201` (off-by-one boundary) not tested, only `?limit=99999`. Low priority.

## Change Log

| Date | Change | Author |
|---|---|---|
| 2026-06-15 | Story drafted (ready-for-dev) via bmad-create-story — Layer-2 policy-enforcement primitive; exhaustive analysis of §2.11/§3.2/§1.4 + existing plugins/contracts/audit seams. | BigDev |
| 2026-06-15 | Implemented §2.11 Layer-2 enforcement primitive (named per-session rate limits + audit-on-trip + dedupe + 429 envelope; X-Robots-Tag + honeypot; forced-pagination + login-wall guards via route registry). Discharged CR-D-2. Caught + avoided an onSend double-send regression (→ onRequest). `pnpm turbo lint typecheck test` GREEN (53/53); apps/api 85/85 against live DB. | claude-opus-4-8 |
| 2026-06-15 | Code review (3-layer: Blind Hunter + Edge Case Hunter + Acceptance Auditor). 0 patches · 7 deferred · 9 dismissed. Story → done. | BigDev |
