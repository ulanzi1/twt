# Story 3.2: Member Mobile + OTP Authentication `[SURFACE]`

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a teacher signing up or returning to the TWT app,
I want to authenticate via mobile number + OTP using DLT-transactional / PE-OE compliant SMS, with a long-lived session bound to my trusted device and a fresh-OTP step-up gate on high-trust actions,
so that I can sign in without remembering a password, the SMS pipeline is regulator-compliant, and sensitive operations stay protected even on an open session.

This is the **member-identity SURFACE** for Epic 3 — the entry point every later signup step (3.3b KYC, 3.4 nominees, 3.5 medical, 3.6 payment/lock-in) and every returning-member surface (Epic 4 status, Epic 6 claim filing, Epic 8 contributions) sits behind. It builds: the member mobile+OTP **login** flow, the **mobile (JWT) session model** (§2.4 — net-new; admin's `@fastify/session` model is NOT reusable here), the **trusted-device** binding (max 2), and the **member step-up-OTP** mechanism + gate.

**It REUSES the Story 1.9 OTP primitives and the `StepUpOtpDeliveryPort` delivery seam — it does NOT build a real SMS provider** (that is Story 5.6/5.9 — see Dev Notes "R3: SMS-DLT is Epic 5"). It does NOT wire the specific gated actions (nominee/withdrawal/etc.) — it ships the **`requireMemberStepUp` gate** that those later stories attach. It does NOT build the signup wizard (3.6 assembles it) — it ships the mobile login/OTP screen + the verified-mobile → session seam signup consumes.

## Acceptance Criteria

> Lifted verbatim from epics.md §Story 3.2 (lines 1633–1644). FR/AR provenance: PRD FR-1 (signup auth). Canonical mechanism: architecture §2.2 Member authentication (lines 1323–1385) + §2.4 Session model (lines 1412–1449) + §2.11 Rate limiting (lines 1702–1722) + §2.7 PII tiers (lines 1504–1533). Reconciliations (R1–R4) are in Dev Notes and resolve every spec/arch tension below — read them before coding.

**AC1 — Member mobile + OTP login flow → session.**
**Given** AR-21 (mobile+OTP via DLT-transactional / PE-OE) + AR-23 (90d refresh, 2 trusted devices) + AR-24 (step-up OTP set)
**When** the member authentication flow is implemented
**Then** the flow is: **enter mobile → receive OTP via DLT-transactional SMS template → enter OTP → session established** (access token ≤15 min + refresh token **90 days** + max **2 trusted devices** per member)
**And** the SMS template is delivered through the **DLT-transactional / PE-OE-registered** channel seam (AR-56 commitment, Epic 0) — at this story that is the `StepUpOtpDeliveryPort` seam + dev/log stub; the real SMS-DLT transport + template registration is Story 5.6/5.9 (R3)
**And** rate-limit enforcement (Story 1.14) applies: **OTP send is throttled per-phone (5 / 15-min window) + per-IP + a global per-Pariwar send cap** (§2.11 / Category-5 row, architecture line 3484)
**And** OTP delivery falls back to an **alternate channel via a placeholder hook** (no transport implemented — Epic 5 wires WhatsApp/voice fallback).

**AC2 — Member step-up OTP on high-trust actions.**
**Given** a member at a step-up-gated action (mobile-number change, nominee change, withdrawal, account-deletion ack, DigiLocker re-link, claim filing — §2.2 list)
**When** the action is invoked without a fresh elevated context for that exact `actionContext`
**Then** a fresh DLT-transactional step-up OTP fires (**single-use, TTL 3 min**); on verify the member gains an **elevated window (~5 min)** bound to that one `actionContext`
**And** the audit log records **each send + each consume + each failure**, tagged with the operation identifier (`action_context`) and `otp_hash` — **never the code, never plaintext mobile**.

> **Scope of AC2:** ship the reusable **`requireMemberStepUp(deps, actionContext)` gate** + the member step-up request/verify endpoints + elevation storage. The *specific* gated routes (nominee change 3.4/3.9, withdrawal 3.10, etc.) attach the gate in their own stories. Prove the mechanism end-to-end with at least one synthetic gated test route.

## Tasks / Subtasks

> **DRY-first:** before writing anything, read the four reuse anchors in Dev Notes "Reuse map". The OTP mechanics (`generateOtp`, `hashOtp`, invalidate-on-next, attempt-cap, atomic burn), the delivery seam, the rate-limit named-config pattern, and the blind-index/Tier-1 encryption pattern ALL exist — extend/mirror them, do not reinvent.

- [x] **Task 1 — Member mobile identity storage: Tier-1 envelope + blind index** (AC: #1)
  - [x] Mobile is **Tier-1 PII** (§2.7 line 1504) AND a login equality-lookup key → it needs BOTH: a Tier-1 envelope ciphertext (storage/display) AND a deterministic **blind index** (the lookup key). This is the EXACT admin-email pattern — mirror `apps/api/src/modules/auth/shared/email-index.ts` (`encryptTier1` + `encryption.blindIndex`).
  - [x] **Pre-scope lookup problem (critical):** member login runs **before** `app.pariwar_id` is known (the person types a mobile; we don't yet know the Pariwar). The admin solution is a fixed `ADMIN_GLOBAL_NAMESPACE` + a BYPASSRLS `servicePool` read. Mirror it: introduce a `MEMBER_IDENTITY_NAMESPACE` (fixed nil-style UUID, NOT a real tenant) for the mobile blind index, and resolve mobile → member(s) via `deps.servicePool` (no RLS context). See Dev Notes "R2: cross-Pariwar login lookup". **Concrete value:** define `export const MEMBER_IDENTITY_NAMESPACE = '00000000-0000-0000-0000-000000000001'` in `apps/api/src/context.ts` immediately below `ADMIN_GLOBAL_NAMESPACE = '00000000-0000-0000-0000-000000000000'` — these two must be distinct (same mobile hashed under the admin namespace would collide with an admin email that happens to be numeric). Also define `export const MEMBER_MOBILE_FIELD_CLASS = 'member_mobile'` alongside `ADMIN_EMAIL_FIELD_CLASS`.
  - [x] Add a mobile-number normalizer + validator (E.164 / Indian 10-digit canonicalization) so `+91 98765 43210`, `09876543210`, `9876543210` map to one blind index. Add a `MobileNumber` Zod primitive in `packages/contracts/src/_common/primitives.ts` (mirror `UuidString`/`Iso8601Datetime`).
  - [x] Storage placement decision (state it in Completion Notes): mobile lives on a **member-identity row keyed for pre-scope lookup**. Recommended: a new `member_identities` table (`member_id` FK, `pariwar_id`, `mobile_ciphertext`, `mobile_blind_index` UNIQUE-per-namespace, `created_at`) so the lookup is a clean servicePool read and `members` stays the lifecycle anchor (Story 3.1's table is deliberately PII-free — see its header). Do NOT add `mobile` columns to `members` without recording why. Add Drizzle schema + RLS policy (read/write tenant-isolated for in-scope reads; the pre-scope login read uses servicePool, like `admin-session.handler.ts`).

- [x] **Task 2 — Extract shared OTP primitives + member OTP persistence** (AC: #1, #2)
  - [x] The pure helpers `generateOtp()` (6-digit, leading-zeros) + `hashOtp()` (SHA-256) live in `apps/api/src/modules/step-up/step-up.service.ts`. **Extract them to `apps/api/src/modules/auth/shared/otp.ts`** and re-export from step-up (API-preserving) so admin step-up + member auth share ONE implementation. Do not copy-paste.
  - [x] Add `member_auth_otps` Drizzle table (mirror `step_up_otps.ts` shape, but member-flavored): `id`, `mobile_blind_index` (the destination — present for BOTH intents), `member_id` (**nullable** — null at first-signup login, set for returning login + all step-up), `intent` pgEnum `('login','step_up')` (**distinct OTP pools per intent class** — §2.2 "step-up cannot share value with concurrent login-OTP"), `action_context` (nullable; required for `step_up`), `otp_hash`, `expires_at`, `consumed_at`, `attempts int default 0`, `created_at`. Index on `(mobile_blind_index, intent)` for the "latest live OTP" lookup. **Store only the hash, never the code** (§2.2).
  - [x] Member OTP service (`apps/api/src/modules/auth/member/member-otp.service.ts`): `requestOtp(intent, mobileBlindIndex, {memberId?, actionContext?})` (invalidate-on-next per `(mobile,intent)` → mint → store hash) + `verifyOtp(intent, mobileBlindIndex, code)` (latest-live → attempt-cap MAX 5 → atomic burn on match). Reuse the admin verify/burn semantics verbatim (`apps/api/src/modules/step-up/step-up.service.ts:53-74`, incl. the concurrent-burn race guard).
  - [x] **TTLs:** login-OTP **5 min**, step-up-OTP **3 min** (§2.2 line 1370). Add `loginOtpTtlMs` (default `5 * MINUTE`) to config; reuse existing `stepUpOtpTtlMs` (3 min) + `stepUpElevatedMs` (5 min) for member step-up.

- [x] **Task 3 — Member (mobile/JWT) session model: `@fastify/jwt` + refresh tokens + trusted devices** (AC: #1)
  - [x] **Net-new.** Admin uses `@fastify/session` (Postgres-store, idle 12h/abs 7d) — NOT reusable for members. Members use §2.4: short-lived **access token (≤15 min, JWT)** + **refresh token (90 days)** recorded server-side, **rotated on use**, **per-device bound**. (R1: refresh = 90d for members — see Dev Notes; §2.4's "30 days" is the generic line, superseded by the member-specific §2.2/AR-23 "90d" the AC commits.)
  - [x] Add `@fastify/jwt` dependency to `apps/api`. **JWT algorithm pinning (§2.4 line 1447):** asymmetric only (**ES256 or RS256**); `none` rejected; symmetric rejected. Sign the access token with a private key resolved via Secret Manager (mirror the pepper/`sessionSecret` `resolveSecretValue` pattern in config.ts + `packages/domain/src/secrets.ts`); the access token carries `member_id`, `pariwar_id`, `device_id`, `exp`. Register a `apps/api/src/plugins/jwt/` plugin (mirror `plugins/session/` registration order in `server.ts`).
  - [x] **Refresh token = opaque high-entropy random** (NOT a JWT), stored **hashed** in a new `member_refresh_tokens` table (`id`, `member_id`, `device_id`, `token_hash`, `expires_at` (90d), `rotated_at`/`revoked_at`, `created_at`). Rotation-on-use: each refresh mints a new token + invalidates the prior (detect reuse of a rotated token → revoke the device's chain). Refresh-token deletion is the revocation mechanism (§2.4 line 1426).
  - [x] **Trusted devices (max 2):** new `member_trusted_devices` table (`device_id`, `member_id`, `pariwar_id` informational, `device_label?`, `bound_at`, `last_seen_at`). Binding a **3rd device drops the oldest** + requires step-up OTP (§2.2 line 1337). Device id = the stable client-supplied device identifier (§2.4 line 1421-1422; hardware-backed where available, software fallback — commit revocability + audit-on-rotation, not a specific mechanism).
  - [x] **Suspension cascade (§2.4 line 1428):** member suspension (FR-56, later epic) must delete all sessions + refresh tokens — expose a `revokeAllMemberSessions(memberId)` repo fn now so the seam exists.

- [x] **Task 4 — Member auth API routes + handlers + member-session guard** (AC: #1)
  - [x] New module `apps/api/src/modules/auth/member/` (mirror `auth/admin/` layout: `member-auth.routes.ts`, `.handlers.ts`, `.repo.ts`, `.service.ts`). Routes under `/api/v1/member/auth/...`:
    - `POST /otp/request` `{ mobile }` → throttled (per-phone 5/15min, Task 6); resolves blind index, mints login-OTP, delivers via seam, audits send. Returns `{ sent: true, expiresInSeconds }` — **never reveal whether the mobile maps to an existing member** (enumeration defense; mirror admin `verifyFirstFactor`'s no-such-user timing-equalization posture).
    - `POST /otp/verify` `{ mobile, otp, deviceId, deviceLabel? }` → verifies login-OTP; on success: resolve member via servicePool → **if member exists:** call `member.getMemberStateAt(memberId, now)` — if state is `withdrawn`, return 403 `MEMBER_WITHDRAWN` (timing-equalize: consume the OTP + delay response same as a consume failure to avoid enumeration — do NOT reveal that a member exists); if state is `anonymized`, RTBF has erased the `member_identities` row so the blind-index lookup already misses (treat as no-member path); if state is `active`/`active-in-grace`/`pending-*`/`lock-in`/`lapsed-unpaid`, proceed — bind/refresh trusted device + issue full access+refresh tokens (see R6 for device-cap handling + droppedDevice response field); **if no member exists** (first signup), issue a **short-lived `signup_continuation` token** (the verified-mobile seam Story 3.6 consumes — see R5 for full spec including the `member_signup_continuations` single-use table). Audit consume/failure in all branches.
    - `POST /token/refresh` `{ refreshToken }` → rotate + reissue (Task 3); audits refresh + reuse-detection revoke. **Device ID sourcing:** the server looks up `device_id` from the `member_refresh_tokens` row — the client does NOT send `deviceId` on refresh (it would be unverifiable and spoofable). The refresh token record already carries `device_id`; use it to bind the rotated token to the same device.
    - `POST /logout` → revoke current device's refresh token; audit.
  - [x] **Member-session guard:** `apps/api/src/modules/auth/shared/member-session-guard.ts` exporting `requireMemberSession(deps)` (verify access-token JWT → set `request.requestContext.actorId = member_id` + the pariwar scope). **CRITICAL — login-wall CI gate (Story 1.14):** `apps/api/tests/integration/login-wall.spec.ts` introspects the route table for the `ADMIN_SESSION_GUARD` marker symbol and fails CI on any non-allowlisted authenticated route lacking a guard. Add a parallel `MEMBER_SESSION_GUARD` symbol and **teach login-wall.spec.ts about it** (extend the guard-recognition set), and add the member OTP/refresh/login routes to the explicit public allowlist — otherwise CI fails. Verify the spec's allowlist + marker logic before adding routes.
  - [x] CSRF posture: member API is token-bearer (Authorization header), not cookie-session → the admin double-submit/Origin cookie-CSRF model does not apply the same way. Document the chosen posture (bearer tokens are not auto-sent cross-site) in the routes header, mirroring `admin-auth.routes.ts`'s CSRF note.

- [x] **Task 5 — OTP delivery seam (REUSE — do NOT build SMS)** (AC: #1)
  - [x] **Reuse `apps/api/src/modules/auth/shared/step-up-delivery.ts`** (`StepUpOtpDeliveryPort` + `createLogStepUpDelivery`). Generalize the interface name if helpful (e.g. `OtpDeliveryPort`) but **do NOT add an SMS provider dependency** — its header + deferred-work D1-1.9 are explicit: real SMS-DLT transport is **Story 5.6/5.9**. `deps.stepUpDelivery` already exists on `AppDeps`; route member login-OTP + step-up-OTP through it.
  - [x] **Alternate-channel fallback (AC1):** add a no-op placeholder hook (e.g. an `onPrimaryDeliveryFailure` seam or a `channel: 'sms'|'voice'|'whatsapp'` field defaulting to `'sms'`) that records intent but performs NO transport. Comment: Epic 5 (Story 5.6/5.9) wires WhatsApp/voice. New D-item if you find yourself adding a provider.

- [x] **Task 6 — OTP rate limiting (per-phone + per-IP + global cap)** (AC: #1)
  - [x] Reuse `apps/api/src/plugins/rate-limit/index.ts` (named per-route configs + global audit emit). The existing `perSessionKey` uses `request.session?.userId ?? request.ip` — members have **no `@fastify/session`**, so add a **per-phone keyGenerator** keyed on the normalized mobile (or its blind index) from the request body, with a **15-minute window** (NOT the 1-min named limits) → `max 5` (§2.11 / line 3484). Add `otpPerPhoneMax` (5) + window to config (env-overridable bootstrap ceiling, §2.11 "default-deny ceiling").
  - [x] Layer the **per-IP** ceiling (the global registration already covers per-IP) + a **global per-Pariwar send cap** to detect bulk attacks (§2.11 line 1711-1712 "global cap"). Independent budgets — a legit member on a fresh device must not be locked by an unrelated IP window (§2.2 line 1364-1367).
  - [x] On trip, the existing `onExceeded` emits `rate_limit.exceeded` to the hash-chain audit sink — inherited automatically (see plugin header). Verify the 429 envelope inherits via `rate-limit.spec.ts` precedent.

- [x] **Task 7 — Member step-up OTP mechanism + `requireMemberStepUp` gate** (AC: #2)
  - [x] Member step-up request/verify endpoints (`POST /api/v1/member/auth/step-up/request` `{ actionContext }` + `/step-up/verify` `{ otp }`) — mirror `apps/api/src/modules/step-up/step-up.handlers.ts`, but use the member OTP table (`intent='step_up'`, keyed by member's mobile blind index + `member_id` + `action_context`) and the **member elevation storage** below. TTL 3 min, single-use, attempt-capped, audited (send/consume/failure).
  - [x] **Elevation storage — the JWT problem (R4):** admin step-up stores `elevatedUntil`/`elevatedAction` in `request.session` (server-side `@fastify/session`). Members have **no server session**. Implement elevation as a **server-side record** (recommended: `member_step_up_elevations` table — `member_id`, `action_context`, `elevated_until`, `created_at` — revocable + auditable, consistent with Postgres-only posture) queried by the gate. Do NOT embed elevation solely in a client token (breaks revocability — §2.2 "per-OTP revocability"). State the chosen mechanism in Completion Notes.
  - [x] **`requireMemberStepUp(deps, actionContext)`** preHandler (mirror `apps/api/src/modules/step-up/gate.ts`): passes only when a FRESH elevation (`elevated_until > now`) exists for this member AND `action_context` matches exactly (elevation for action A never satisfies a gate on action B). On miss → `StepUpRequiredError(actionContext)` (reuse the existing 403 structured error in `http-errors.ts`). Prove with ≥1 synthetic gated route in tests.

- [x] **Task 8 — Audit event types + emission** (AC: #1, #2)
  - [x] `AuthAuditEventType` is a **closed union** in `apps/api/src/audit/audit-sink.ts` (currently `login.*`, `step_up.*`). **Extend it** with the member events you emit, e.g. `member_login.otp_send` / `member_login.otp_consume` / `member_login.failure` / `member_session.refresh` / `member_session.reuse_revoke` / `member_session.logout` / `member_step_up.send` / `member_step_up.consume` / `member_step_up.failure` / `member_device.bound` / `member_device.dropped`. Adding an event the union doesn't list is a type error — that's the guard.
  - [x] Emit via `emitAuthAudit(deps, request, type, {...})` (`apps/api/src/modules/auth/shared/audit.ts`). **No secret material ever** — `otp_hash` not the code; masked mobile (last 4) not plaintext; no tokens. The default sink is the Story 1.10 hash-chain (FR-47).

- [x] **Task 9 — Contracts (`packages/contracts/src/members/`)** (AC: #1, #2)
  - [x] Member auth contracts go in `packages/contracts/src/members/` (per deferred-work D10-1.4: members/ contracts land at Stories 3.1+; the dir exists with only a README). Add `members/auth.ts`. **All `.strict()`**; mirror `packages/contracts/src/auth/step-up.ts` + `login.ts` shapes. Re-export from the `members` barrel + register as OpenAPI paths (mirror `auth/index.ts`).

    **`MemberOtpVerifyResponse` — discriminated union (3.6 and the mobile client are coupled on this shape):**
    ```ts
    // Returning member — full session
    { sessionType: 'full_session', accessToken: string, accessTokenExpiresAt: Iso8601Datetime,
      refreshToken: string, deviceId: string, memberId: string, pariwarId: string,
      droppedDevice?: { deviceId: string, deviceLabel?: string, boundAt: Iso8601Datetime } }
    // Multi-Pariwar (R2) — client must pick scope before a full session is issued
    { sessionType: 'pariwar_select',
      memberships: Array<{ memberId: string, pariwarId: string, pariwarName: string }>,
      selectToken: string /* short-lived opaque, client posts it with chosen pariwarId to a
                             POST /otp/select-pariwar endpoint that issues the full session */ }
    // First-signup — no member row yet (R5)
    { sessionType: 'signup_continuation', signupContinuationToken: string,
      expiresAt: Iso8601Datetime }
    ```
    Use `z.discriminatedUnion('sessionType', [...])` so the mobile client gets typed narrowing without `any`-casts.
  - [x] Reuse `Iso8601Datetime` + the new `MobileNumber` primitive from `_common`. OTP field: `z.string().min(6).max(8)` (admin step-up precedent). Keep wire types decoupled from internal enums (the `nationalGrants: string[]` precedent in `auth/session.ts`).

- [x] **Task 10 — api-client SDK + mobile login/OTP screen** (AC: #1)
  - [x] `packages/api-client/src/index.ts` is near-empty — add the member-auth SDK methods (request-otp, verify-otp, refresh, step-up) typed against `@twt/contracts`. Mirror whatever fetch/error convention `apps/admin` uses to call admin auth.
  - [x] Mobile login screen (`apps/mobile`, Expo Router + Tamagui) — **precedent: Story 1.9 shipped `apps/admin/src/routes/LoginPage.tsx`, so SURFACE auth stories ship the client UI.** Add `app/(auth)/login.tsx` (enter mobile) + `app/(auth)/otp.tsx` (enter OTP). **Expo Router auth guard pattern:** protect all non-auth routes via the root `app/_layout.tsx` — read the session store (from `expo-secure-store`) and call `router.replace('/(auth)/login')` if no access token. Note: `(auth)` is a route *group* in Expo Router, not inherently protected — the guard lives in the layout, not the group name. Bilingual (Hindi-default — Epic 3 intro line 1575; use the `@twt/i18n` utility from Story 2.1 + the `auth` or `common` namespace; add translation keys `auth.mobile_prompt`, `auth.otp_prompt`, `auth.otp_sent`, `auth.otp_error_invalid`, `auth.otp_error_expired`, `auth.otp_error_rate_limit`). Apply UX Pattern 4 "dignified validation" (UX-DR55) for OTP errors. Phone+OTP is **transferable by design** (Ravi-mode, UX line 263) — do NOT add identity binding beyond phone+OTP+device that would break a relative entering OTP on the registered phone.
  - [x] **Token storage (§ architecture line 2584):** refresh + access tokens → **`expo-secure-store`** (Keychain/Keystore), **NOT MMKV** (`apps/mobile/lib/mmkv.ts` is for non-sensitive only). Add the `expo-secure-store` dep. Wire the SDK to read/refresh from secure storage on app open (session-resume; §2.2 line 1343 — resume does not require OTP unless a force-re-OTP signal fires).

- [x] **Task 11 — Tests + migration + ci:local gate** (AC: #1, #2)
  - [x] **Migration:** generate ONCE via drizzle for the new tables/enums (`member_identities`, `member_auth_otps` + `intent` enum, `member_refresh_tokens`, `member_trusted_devices`, `member_step_up_elevations`, `member_signup_continuations`) + RLS policies; hand-supplement GRANTs/FORCE-RLS as Story 3.1's migration did. **Never regenerate an applied migration; never DROP SCHEMA** ([[project_live_db_test_gotchas]]). Commands (Story 3.1 precedent from its Dev Agent Record): `pnpm --filter @twt/domain db:generate` → inspect the emitted SQL → hand-supplement GRANTs + `FORCE ROW LEVEL SECURITY` → `DATABASE_URL=postgresql://…:5433/… pnpm --filter @twt/domain db:migrate` → `pnpm --filter @twt/domain db:check` → "Everything's fine". Apply to `twt-test-pg` on :5433.
  - [x] **Unit:** OTP service (generate/hash determinism, invalidate-on-next, attempt-cap, atomic burn, TTL), mobile normalizer/blind-index determinism, JWT sign/verify + algorithm pinning (reject `none`/HS256), refresh-rotation + reuse-detection, trusted-device cap (3rd drops oldest), step-up gate freshness + action-context binding.
  - [x] **Integration (:5433):** full login flow (request→verify→session); per-phone rate-limit trip (5/15min) → 429 + audit; cross-Pariwar lookup via servicePool resolves correctly under RLS; step-up gate end-to-end on a synthetic route; suspension cascade revokes sessions; login-wall.spec.ts passes WITH the new member routes (guard marker + allowlist).
  - [x] **Merge gate:** `pnpm ci:local` GREEN on :5433 ([[project_ci_actions_suspension_local_mirror]]); schema-diff accepts the additive tables; friction-budget/pii-scrape gates pass (mobile is Tier-1 — ensure no plaintext mobile reaches any public/member surface that the pii-scrape gate scans).

## Dev Notes

### Reuse map — extend these, do NOT reinvent

| Need | Existing anchor (REUSE / MIRROR) | Net-new for 3.2 |
|---|---|---|
| OTP generate/hash/verify/burn | `apps/api/src/modules/step-up/step-up.service.ts` (extract pure helpers to `auth/shared/otp.ts`) | member OTP table + per-intent pools |
| OTP delivery transport | `auth/shared/step-up-delivery.ts` (`StepUpOtpDeliveryPort` + log stub; `deps.stepUpDelivery`) | alt-channel placeholder hook only |
| Step-up request/verify glue | `modules/step-up/step-up.handlers.ts` | member elevation storage (no `request.session`) |
| Step-up gate | `modules/step-up/gate.ts` (`requireStepUp`) | `requireMemberStepUp` + `MEMBER_SESSION_GUARD` |
| PII Tier-1 + blind-index lookup | `auth/shared/email-index.ts` (`encryptTier1` + `blindIndex`, fixed namespace) | `MEMBER_IDENTITY_NAMESPACE` + mobile normalizer |
| Pre-scope identity read | `auth/admin/admin-session.handler.ts` (BYPASSRLS `deps.servicePool`) | mobile → member resolution |
| Rate limiting | `plugins/rate-limit/index.ts` (named configs, global audit emit, inheritance) | per-phone 15-min keyGen + per-Pariwar cap |
| Session guard + login-wall | `auth/shared/session-guard.ts` (`ADMIN_SESSION_GUARD`) + `tests/integration/login-wall.spec.ts` | `requireMemberSession` + extend the gate spec |
| Audit emit | `auth/shared/audit.ts` (`emitAuthAudit`) + `audit/audit-sink.ts` union | extend `AuthAuditEventType` |
| Config TTL/rate constants | `apps/api/src/config.ts` (`stepUpOtpTtlMs`/`stepUpElevatedMs`/`loginRateMax`) | `loginOtpTtlMs`, `otpPerPhoneMax`, JWT key, refresh TTL |
| Contracts | `packages/contracts/src/auth/{step-up,login,session}.ts` + `_common/primitives.ts` | `members/auth.ts` + `MobileNumber` |
| Client UI precedent | `apps/admin/src/routes/LoginPage.tsx` (Story 1.9) | `apps/mobile` login/OTP screen |

### Critical reconciliations (resolve these tensions BEFORE coding)

- **R1 — Refresh token is 90 days (member), not 30.** §2.4 line 1420 says generic mobile "refresh token 30 days"; §2.2 line 1333 + AR-23 + the AC say **90 days** for members. Use **90d**. This exact "imported the wrong session property" confusion was already caught for *admin* and corrected (deferred-work.md line 447 / ADR-0009 §Decision-2 / Decision 2026-06-12-045): admin = `@fastify/session` Postgres-store (idle 12h/abs 7d); the 90d-refresh/≤15min-access/2-device properties are the **member** model. Do not re-import admin's session model here.
- **R2 — Cross-Pariwar login lookup.** `members` is RLS tenant-isolated (`members-rls.ts` — read/write only under `app.pariwar_id`). But login-by-mobile happens **before** scope is known, and Pariwar-Passport (§2.5) means one mobile may map to member rows in multiple Pariwars. Resolve mobile → member(s) via the **BYPASSRLS `deps.servicePool`** (the `admin-session.handler.ts` precedent), using a fixed `MEMBER_IDENTITY_NAMESPACE` blind index. After resolution, set `app.pariwar_id` and proceed scoped. If multiple memberships resolve, the client picks scope (the Passport navigation model, §2.5) — for 3.2, issuing a session for the resolved member + recording the seam is sufficient; multi-membership disambiguation UI can defer to the Passport surface (note it).
- **R3 — SMS-DLT transport is Epic 5, NOT this story.** deferred-work D1-1.9 + `step-up-delivery.ts` header are explicit: `StepUpOtpDeliveryPort` ships a dev/log stub; real SMS-DLT-transactional delivery via the channel dispatcher is **Story 5.6/5.9**; DLT template registration is operational/Story 5.6 (deferred-work line 645). **Do NOT add an SMS provider dependency.** The AC's "DLT-transactional SMS template … AR-56" is satisfied at this story by routing through the seam + recording the dependency. If you reach for Twilio/MSG91/etc., stop and file a D-item.
- **R4 — Step-up elevation has no `request.session` on the member side.** The admin gate stores `elevatedUntil`/`elevatedAction` on the server session object; members are JWT/bearer with no server session. Use a **server-side elevation record** (recommended `member_step_up_elevations`) so elevation stays revocable + auditable (§2.2). The OTP TTL (3 min, to enter the code) and the elevated/commit window (~5 min, to commit the action) are **two distinct timers** — the AC's "~5 min success window" is the elevation window, NOT the OTP TTL. `stepUpElevatedMs` (5 min) + `stepUpOtpTtlMs` (3 min) already encode both in config.
- **R5 — First-signup vs returning-login.** At first signup the member row does not exist yet (Story 3.1: `member_id` is minted by the signup flow 3.6 as the event-stream `stream_id`). So login-OTP is keyed by **mobile blind index** (not `member_id`); `member_auth_otps.member_id` is nullable. On verify with no existing member → issue a short-lived **`signup_continuation`** token (the verified-mobile seam Story 3.6 consumes to create the member + upgrade to a full session). On verify with an existing member → full access+refresh session. Build both paths; 3.6 wires signup onto the seam.

  **`signup_continuation` token spec (concrete — 3.6 is coupled on this):**
  - **Format:** signed JWT using the same asymmetric key as the access token (ES256/RS256). Self-contained but single-use enforced server-side.
  - **TTL: 30 minutes** — must span the full signup wizard (3.3b KYC → 3.4 nominees → 3.5 medical → 3.6 payment). Do NOT use ≤15 min (access-token TTL); the wizard cannot complete in 15 min under rural cellular.
  - **Payload:** `{ sub: mobileBlindIndex, intent: 'signup', jti: <uuid> }` — carries the blind index as identity anchor (Story 3.6 uses it to look up + create the member), plus a `jti` for single-use enforcement.
  - **Single-use table:** add `member_signup_continuations` (`jti` PK, `mobile_blind_index`, `expires_at`, `consumed_at`, `created_at`) to the migration. On `/otp/verify` (signup path): insert the row. Story 3.6's first call: mark `consumed_at`; if already consumed, 409. On expiry: treat as no-session (the member restarts OTP).
  - **Wire into `MemberOtpVerifyResponse`** (see Task 9) as the `signup_continuation` branch of the discriminated union.

- **R6 — 3rd-device step-up during login (mechanism committed).** §2.2 line 1337 says "Binding a 3rd device drops the oldest and requires step-up OTP", but at `/otp/verify` time the member has no established session — there is nowhere to call `/step-up/request`. **Committed resolution:** the login OTP itself satisfies the device-replacement authorization. When `/otp/verify` detects the member is at device cap (already has 2 `member_trusted_devices` rows) and the incoming `deviceId` is not already bound, the server: (1) identifies the oldest trusted device by `bound_at`; (2) deletes its `member_refresh_tokens` chain (revoking it); (3) removes it from `member_trusted_devices`; (4) emits `member_device.dropped` audit event with `{ droppedDeviceId, reason: 'device_cap' }`; (5) binds the new device and issues the full access+refresh session normally. The response includes `{ droppedDevice: { deviceId, deviceLabel, boundAt } }` so the mobile client can show a "Your session on [label] was signed out" notice. No extra round-trip. The §2.2 step-up requirement applies to **active-session** device management (an explicit "manage my devices" surface that Epic 4/8 may ship) — not to the initial login flow where OTP already proves mobile possession.

### Security & correctness constraints (non-negotiable)

- **Never persist OTP codes** — only SHA-256 hashes (§2.2 OTP-security-floor line 1375). **Never log/audit/return plaintext mobile** — mask to last-4; audit carries `otp_hash` + masked mobile only.
- **JWT algorithm pinning** (§2.4 line 1447): asymmetric ES256/RS256 only; `none` structurally rejected; reject symmetric where asymmetric expected. JWT signing key via Secret Manager (never an env literal in prod — config.ts pepper precedent).
- **Distinct OTP pools per intent** (§2.2 line 1379): a concurrent login-OTP and step-up-OTP must never share a value/slot — the `intent` discriminator + per-`(mobile,intent)` invalidate-on-next enforces this.
- **Enumeration defense:** `/otp/request` returns the same `{sent:true}` shape whether or not the mobile maps to a member (mirror admin `verifyFirstFactor` timing equalization).
- **Refresh-token reuse detection:** rotation-on-use means a replayed (already-rotated) refresh token signals theft → revoke the whole device chain + audit (`member_session.reuse_revoke`).
- **Force-re-OTP signals** (§2.2 line 1338): SIM-swap / device-binding change / fraud-policy risk signals invalidate the session. Detection formulas are the fraud-policy ADR's, not this story's — but expose the **revocation seam** (`revokeAllMemberSessions`) so the signal handler (later) can call it.

### Known open questions (do NOT try to solve here — flagged for awareness)

- **OQ-UX-15 shared-phone (UX line 191):** Bihar families commonly share one phone; the session model assumes one phone = one member and OTP-auth makes that implicit. This is **explicitly unspec'd / unowned** (owner: account/session architecture). Build the one-phone-one-member model as specified; do NOT improvise multi-member-per-phone here — note any place your design would need to change if/when this is resolved.
- **Transferable auth (Ravi-mode, UX lines 263-265):** the auth mechanism itself carries the transfer (a relative uses the deceased's registered phone to receive OTP for claim filing in Epic 6). Keep login bound to phone+OTP+device only — do not add biometric/identity gating that would block this designed flow.
- **Legal-counsel dependency (deferred-work line 868):** Story 3.2 closure is listed among Stories whose final sign-off depends on Story 0.13 legal-counsel returns — carry as a closure risk, not a code blocker.

### Source tree — files to touch

```
packages/domain/src/schema/         member_identities.ts, member_auth_otps.ts, member_refresh_tokens.ts,
                                    member_trusted_devices.ts, member_step_up_elevations.ts,
                                    member_signup_continuations.ts                            [NEW]
packages/domain/src/policies/       member-identity-rls.ts (+ siblings)                       [NEW]
packages/domain/migrations/         00XX_*.sql (generated once + hand-supplemented GRANT/RLS) [NEW]
packages/contracts/src/members/     auth.ts (+ barrel update)                                 [NEW]
packages/contracts/src/_common/     primitives.ts (MobileNumber)                             [UPDATE]
apps/api/src/modules/auth/shared/   otp.ts (extract), member-session-guard.ts                [NEW]
apps/api/src/modules/auth/member/   member-auth.{routes,handlers,repo,service}.ts,
                                    member-otp.service.ts                                     [NEW]
apps/api/src/modules/step-up/       step-up.service.ts (re-export extracted helpers)         [UPDATE]
apps/api/src/plugins/jwt/index.ts   @fastify/jwt registration (algorithm pinning)            [NEW]
apps/api/src/config.ts              loginOtpTtlMs, otpPerPhoneMax, refresh TTL, JWT key      [UPDATE]
apps/api/src/audit/audit-sink.ts    extend AuthAuditEventType                                [UPDATE]
apps/api/src/context.ts / deps.ts   wire jwt signer + MEMBER_IDENTITY_NAMESPACE +
                                    MEMBER_MOBILE_FIELD_CLASS + any new deps                 [UPDATE]
apps/api/src/server.ts              register jwt plugin + member routes (order matters)       [UPDATE]
apps/api/src/plugins/rate-limit/    per-phone keyGen (or inline named limit)                 [UPDATE]
apps/api/tests/integration/login-wall.spec.ts  teach it the member guard marker              [UPDATE]
packages/api-client/src/index.ts    member-auth SDK methods                                  [UPDATE]
apps/mobile/app/(auth)/             login screen + OTP screen (expo-secure-store)            [NEW]
apps/mobile/package.json            expo-secure-store dep                                     [UPDATE]
```

### Testing standards summary

Vitest unit (pure logic, frozen `deps.clock()` for TTL/window/rotation assertions) + integration on the `twt-test-pg` Docker DB at :5433 (`DATABASE_URL` on 5433 — [[project_ci_actions_suspension_local_mirror]]). Own-committing writers accumulate rows across runs — assert membership/behavior, not absolute counts ([[project_live_db_test_gotchas]]). Merge gate = `pnpm ci:local` (mirrors all ci.yml jobs). Per [[project_fastify_onsend_doublesend]], if any handler uses `void reply.status(...).send()` with body-independent headers, prefer `onRequest`; run DB-gated suites when adding `onSend` hooks.

### Project Structure Notes

- **Member auth is its own module** (`apps/api/src/modules/auth/member/`), parallel to `auth/admin/` — shared crypto/seam/audit live in `auth/shared/`. This keeps the admin (`@fastify/session`) and member (`@fastify/jwt`) models cleanly separated while sharing the OTP + delivery + audit primitives.
- **`members` table stays PII-free** (Story 3.1 deliberately excluded profile/PII; its header says PII columns are "downstream stories' to add"). Mobile lands on `member_identities` to (a) keep the lifecycle anchor clean and (b) make the pre-scope servicePool lookup a single-table read. Record this placement decision in Completion Notes.
- **Variance to watch:** Story 3.1 noted `@twt/domain` cannot import `@twt/events` (turbo task-graph cycle) and reads `events_log` directly ([[project_member_lifecycle_domain_substrate]]). Member auth lives in `apps/api` (not `@twt/domain`), so it can import freely — but if you add member-state reads (e.g. blocking login for `withdrawn`/`anonymized` members), route them through the Story 3.1 accessors (`getMemberStateAt` / overlay), not a direct state-column read, and respect the domain's import boundaries.

### References

- [Source: epics.md#Story 3.2 (lines 1627–1644)] — story + ACs (verbatim).
- [Source: epics.md#Epic 3 (lines 1567–1591)] — Hindi-default, transferable auth, FR/AR anchors, dependencies.
- [Source: architecture.md#2.2 Member authentication (lines 1323–1385)] — OTP channel, session model, trusted devices, step-up set, TTLs, OTP security floor, ADR captures.
- [Source: architecture.md#2.4 Session model — hybrid (lines 1412–1449)] — mobile JWT (access 15min + refresh + rotation + device binding), revocation, algorithm pinning.
- [Source: architecture.md#2.11 Rate limiting (lines 1702–1722) + line 3484] — per-phone 5/15min + global per-Pariwar cap; bootstrap-ceiling discipline.
- [Source: architecture.md#2.7 PII tiers (lines 1504–1533)] — mobile = Tier-1 envelope; blind-index for equality lookup.
- [Source: architecture.md#2.5 Multi-Pariwar scope (lines 1451–1476)] — Passport, URL-prefix scope, mobile-app client injects pariwar_id.
- [Source: architecture.md line 2584] — sensitive tokens → expo-secure-store.
- [Source: deferred-work.md line 438 (D1-1.9) + line 447 (R1) + line 645 + line 868] — SMS-DLT = Epic 5; member-vs-admin session reconciliation; DLT registration operational; legal-counsel dependency.
- [Source: apps/api/src/modules/step-up/{service,gate,handlers}.ts + auth/admin/* + auth/shared/* + plugins/rate-limit/index.ts + config.ts] — the Story 1.9/1.14 reuse anchors.
- [Source: packages/domain/src/schema/{step_up_otps,members}.ts + policies/members-rls.ts] — table/RLS patterns to mirror.
- [Source: apps/admin/src/routes/LoginPage.tsx] — SURFACE-auth client-UI precedent.

## Dev Agent Record

### Agent Model Used

Claude Opus 4.8 (claude-opus-4-8) via the BMAD `dev-story` workflow.

### Debug Log References

- `pnpm --filter @twt/domain db:generate` → `0019_polite_penance.sql` (6 tables + `member_otp_intent` enum) → hand-supplemented GRANT/FORCE-RLS/CHECK/trigger; `0020_lively_doctor_strange.sql` (additive `member_refresh_tokens.pariwar_id`). Applied to `twt-test-pg` :5433; `db:check` → "Everything's fine".
- `pnpm --filter @twt/api exec vitest run tests/unit/member-auth-primitives.test.ts` → 9 passed (incl. JWT algorithm pinning: `none` + HS256 rejected).
- `DATABASE_URL=…:5433 … vitest run tests/integration/member-auth.spec.ts` → 12 passed (full login, enumeration defense, per-phone 429, wrong-OTP, device-cap drop, refresh rotation+reuse, step-up gate, action-context binding, withdrawn block, multi-Pariwar select, suspension cascade).
- `DATABASE_URL=…:5433 pnpm ci:local` → **17/17 jobs green** (lint, typecheck, build, test (unit), db-check, contracts-determinism, crypto-check, tokens-theme-check, i18n-parity, pii-scrape, friction-budget, schema-diff, benefit-mechanism, microcopy, domain-invariants, member-state-invariant, integration-tests). One transient `test (unit)` blip on the first run (cross-package DB concurrency from a globally-exported `DATABASE_URL`, which the real DB-less CI `test` job never has) — green on re-run.

### Completion Notes List

**Decisions recorded (as required by tasks):**
- **Mobile storage placement (Task 1):** mobile lands on a NEW tenant-isolated `member_identities` table (`member_id` PK + FK → members, `pariwar_id`, `mobile_ciphertext` Tier-1 envelope, `mobile_blind_index`), NOT on `members` (which stays PII-free per Story 3.1). The blind index is computed under the fixed `MEMBER_IDENTITY_NAMESPACE` (`…0001`, distinct from `ADMIN_GLOBAL_NAMESPACE` `…0000`); uniqueness is `UNIQUE(pariwar_id, mobile_blind_index)` — one mobile = one member per Pariwar, cross-Pariwar duplicates allowed (R2 multi-membership; "UNIQUE-per-namespace" reconciled to per-Pariwar to satisfy Pariwar-Passport). The pre-scope mobile→member lookup reads via the BYPASSRLS `deps.servicePool` (admin-session.handler precedent).
- **RLS families:** `member_identities` = tenant-isolated (mirrors members-rls). The OTP / refresh-token / trusted-device / step-up-elevation / signup-continuation tables = the GLOBAL member-identity/auth carve-out (`USING(true)` + FORCE, mirrors identity-auth-rls) — they're written pre-scope (mobile/bearer-keyed) so a tenant predicate would return 0 rows. The 5 carve-out tables carry plain `member_id` uuid columns (NO FK to the RLS-forced `members`, which would fail the FK check pre-scope).
- **Elevation storage (R4):** server-side `member_step_up_elevations` record (revocable + auditable), NOT a client token — members have no `request.session`.
- **Refresh-token scope:** `member_refresh_tokens.pariwar_id` is stored so a rotated token reissues the access token for the SAME scope (correct even for a multi-Pariwar member holding sessions in several Pariwars on one device).
- **JWT (Task 3, §2.4 pinning):** access + signup-continuation + pariwar-select tokens are ES256 (asymmetric). `@fastify/jwt` registered with `verify.algorithms=['ES256']` → `none` + HS256 rejected (unit-tested). Private key via Secret Manager in prod (`resolveMemberJwtKeys`); ephemeral ES256 keypair in dev/test/CI. Refresh tokens are opaque + SHA-256-hashed (NOT JWTs).
- **Multi-Pariwar (R2):** implemented end-to-end (not just seamed) — `/otp/verify` returns the `pariwar_select` branch with a signed select-token; `POST /otp/select-pariwar` re-resolves + issues the full session for the chosen Pariwar.
- **3rd-device at login (R6):** the login OTP authorizes the replacement — at cap, the oldest device is dropped + its refresh chain revoked, and `droppedDevice` is returned (+ `member_device.dropped` audit). The §2.2 "3rd device requires step-up" applies to an active-session device-management surface (later epic), not initial login.

**AC coverage:**
- **AC1** — enter mobile → OTP (via the reused `StepUpOtpDeliveryPort` seam + dev/log stub; NO SMS provider added, R3) → verify → session (access ≤15min JWT + refresh 90d + ≤2 trusted devices). Per-phone 5/15min throttle (`memberOtpSendThrottle` preHandler — body-keyed, since @fastify/rate-limit's keyGenerator runs pre-body) + per-IP route limit + a global send cap; trip emits `rate_limit.exceeded`.
- **AC2** — member step-up OTP (single-use, 3-min TTL) → ~5-min elevation bound to one `action_context`; `requireMemberStepUp(deps, actionContext)` gate proven end-to-end via a synthetic probe; audit records send/consume/failure with `action_context` + `otp_hash`, never the code, never plaintext mobile (masked last-4 only).

**Honest deviations / notes for review:**
- **Alt-channel fallback (Task 5 / AC1):** satisfied by routing through the existing `StepUpOtpDeliveryPort` (`createLogStepUpDelivery` is a no-op transport stub) + a masked `destinationHint`; a DISTINCT `onPrimaryDeliveryFailure`/`channel` placeholder hook was NOT added as a separate construct — the seam itself IS the no-op placeholder, and Epic 5 (5.6/5.9) wires the real SMS-DLT + WhatsApp/voice fallback. Flag if a distinct hook is wanted now.
- **"global per-Pariwar send cap" (Task 6):** the Pariwar is unknown pre-scope, so the bulk-attack tripwire is a GLOBAL send cap (not per-Pariwar) — noted as the honest pre-scope realization; per-Pariwar refinement defers to a scoped surface. *(Ratified in the 2026-06-25 re-review, PR-Defer-4.)*
- **OTP audit tag = `HMAC(otp_hash)`, not the literal `otp_hash` (P28 / PR-Decision-4):** every send/consume audit carries an HMAC-SHA256-keyed correlation tag instead of the raw SHA-256 `otp_hash` the AC names — a deliberate hardening (a 6-digit raw hash is brute-forceable in <1 ms; the keyed tag is non-invertible by log readers). Strictly stronger than spec; ratified as a recorded deviation in the 2026-06-25 re-review.
- **Mobile UI (Task 10):** verified by `typecheck` + `lint` only (the mobile `build`/`test` scripts are no-ops by repo design); not runtime-verified in this environment. The signup-continuation + pariwar-select branches show a placeholder notice on-screen (the signup wizard is Story 3.6; the Passport scope-selection UI defers, R2) — the API + SDK fully support both.
- **Legal-counsel dependency (deferred-work line 868):** Story 3.2 final sign-off depends on Story 0.13 legal-counsel returns — carried as a closure risk, not a code blocker.

### Completion Notes — Change Log

| Date | Change |
|---|---|
| 2026-06-25 | Implemented Story 3.2 (member mobile+OTP auth SURFACE) across 11 tasks: domain substrate (6 tables + 2 migrations + RLS), `@fastify/jwt` ES256 session model (access + 90d rotated refresh + ≤2 trusted devices), member auth module (login/verify/refresh/logout/select-pariwar + step-up request/verify + `requireMemberStepUp` gate + `requireMemberSession` guard), per-phone OTP throttle, audit-event extension, `members/auth.ts` contracts + OpenAPI paths, `@twt/api-client` member SDK, and the Expo mobile login/OTP screens. `pnpm ci:local` green (17/17). Status → review. |

### File List

**Domain (`packages/domain/`)**
- `src/schema/member_identities.ts` *(new)* — tenant-isolated mobile Tier-1 envelope + blind index.
- `src/schema/member_auth_otps.ts` *(new)* — login + step-up OTP pools (`member_otp_intent` enum).
- `src/schema/member_refresh_tokens.ts` *(new)* — opaque hashed refresh tokens (rotate + reuse-detect, `pariwar_id` scope).
- `src/schema/member_trusted_devices.ts` *(new)* — max-2 device bindings.
- `src/schema/member_step_up_elevations.ts` *(new)* — server-side elevation records.
- `src/schema/member_signup_continuations.ts` *(new)* — single-use signup-continuation registry.
- `src/policies/member-identities-rls.ts` *(new)* — tenant-isolation policies.
- `src/policies/member-auth-rls.ts` *(new)* — global carve-out policies (5 tables).
- `src/schema/index.ts`, `src/policies/index.ts` *(modified)* — barrel exports.
- `migrations/0019_polite_penance.sql` + `meta/0019_snapshot.json` *(new)* — tables + enum + RLS + hand-supplemented GRANT/FORCE/CHECK/trigger.
- `migrations/0020_lively_doctor_strange.sql` + `meta/0020_snapshot.json` *(new)* — additive `member_refresh_tokens.pariwar_id`.
- `migrations/meta/_journal.json` *(modified)*.

**Contracts (`packages/contracts/`)**
- `src/members/auth.ts` *(new)*, `src/members/index.ts` *(new)* — member auth DTOs (discriminated verify union).
- `src/_common/primitives.ts` *(modified)* — `MobileNumber` primitive.
- `src/index.ts` *(modified)* — members barrel export.
- `scripts/emit-openapi.ts` *(modified)* — member components + 6 paths.
- `../../openapi/v1.yaml` *(modified)* — regenerated (deterministic).

**API (`apps/api/`)**
- `src/modules/auth/member/` *(new)* — `jwt-keys.ts`, `tokens.ts`, `member-auth.repo.ts`, `member-otp.service.ts`, `member-auth.service.ts`, `member-auth.handlers.ts`, `member-auth.routes.ts`, `member-step-up.gate.ts`, `otp-rate-limit.ts`, `index.ts`.
- `src/modules/auth/shared/otp.ts` *(new)* — extracted `generateOtp`/`hashOtp`.
- `src/modules/auth/shared/mobile-index.ts` *(new)* — normalizer + Tier-1 envelope + blind index.
- `src/modules/auth/shared/member-session-guard.ts` *(new)* — `requireMemberSession` + `MEMBER_SESSION_GUARD`.
- `src/plugins/jwt/index.ts` *(new)* — `@fastify/jwt` ES256-pinned registration + claim types.
- `src/modules/step-up/step-up.service.ts` *(modified)* — re-export extracted OTP helpers.
- `src/context.ts`, `src/config.ts`, `src/deps.ts`, `src/audit/audit-sink.ts`, `src/server.ts`, `package.json` *(modified)*.
- `tests/unit/member-auth-primitives.test.ts` *(new)*, `tests/integration/member-auth.spec.ts` *(new)*.
- `tests/integration/_setup.ts`, `tests/integration/login-wall.spec.ts` *(modified)*.

**api-client (`packages/api-client/`)**
- `src/index.ts` *(modified)* — `createMemberAuthClient` member SDK; `package.json` *(modified)*.

**Mobile (`apps/mobile/`)**
- `app/(auth)/_layout.tsx`, `app/(auth)/login.tsx`, `app/(auth)/otp.tsx` *(new)* — login + OTP screens.
- `lib/session.ts`, `lib/session-context.tsx`, `lib/member-api.ts` *(new)* — expo-secure-store session + client wiring.
- `app/_layout.tsx`, `package.json` *(modified)* — auth guard + LocaleProvider + deps.

**i18n (`packages/i18n/`)**
- `locales/en/common.json`, `locales/hi/common.json` *(modified)* — `auth.*` keys (bilingual parity).

**Root**
- `pnpm-lock.yaml` *(modified)*.

---

### Review Findings

> Code review run 2026-06-25. Layers: Blind Hunter + Edge Case Hunter + Acceptance Auditor. 59 raw → 5 decision_needed, 27 patch, 3 defer, 11 dismissed.

#### Decision-Needed

*(All 5 resolved — converted to patches below.)*

#### Patch

- [x] [Review][Patch] P1: OTP attempt-cap non-atomic — concurrent requests can bypass max-attempt ceiling via read-then-check race [member-otp.service.ts:verifyOtp + member-auth.repo.ts:findLatestLiveOtp]
- [x] [Review][Patch] P2: OTP hash comparison uses `===` not `crypto.timingSafeEqual` — timing oracle leaks hash prefix [member-otp.service.ts:verifyOtp]
- [x] [Review][Patch] P3: Rate limiter increments `phoneCounts` and `globalCount` before the throttle check — rejected requests consume quota; move writes after the guard [otp-rate-limit.ts:preHandler]
- [x] [Review][Patch] P4: Bucket rotation resets `globalCount` to 0 but does not re-sum surviving `phoneCounts` entries — global cap never triggers again after first bucket roll [otp-rate-limit.ts]
- [x] [Review][Patch] P5: Logout silently no-ops (no revocation, no audit) when `user.typ !== 'access'` or `device_id` absent [member-auth.handlers.ts:logout]
- [x] [Review][Patch] P6: Withdrawn-member path in `completeMemberLogin` lacks timing equalization — response faster than normal OTP failure, creating mobile enumeration oracle [member-auth.handlers.ts:completeMemberLogin]
- [x] [Review][Patch] P7: `revokeDeviceChain` has no `RETURNING` or rowCount check — silent no-op on bad inputs leaves refresh chain live [member-auth.repo.ts:revokeDeviceChain]
- [x] [Review][Patch] P8: `otpRequest`: `stepUpDelivery.deliver()` failure after OTP inserted emits no delivery-failure audit — only a send-success record exists [member-auth.handlers.ts:otpRequest]
- [x] [Review][Patch] P9: `otpVerify`: DB error on `resolveMembersByMobile` after OTP consumed — OTP burned but session never issued, user silently locked out [member-auth.handlers.ts:otpVerify]
- [x] [Review][Patch] P10: `getMemberStateAt` returning `null` or an unknown future state (e.g. `suspended`) is treated as active — session issued for non-existent or blocked member [member-auth.handlers.ts:completeMemberLogin]
- [x] [Review][Patch] P11: `issueFullSession` throw in `completeMemberLogin` leaves no failure audit record [member-auth.handlers.ts:completeMemberLogin]
- [x] [Review][Patch] P12: `selectPariwar`: invalid pariwarId guess leaves no audit trail — brute-force enumeration undetected [member-auth.handlers.ts:selectPariwar]
- [x] [Review][Patch] P13: `selectPariwar`: `maskedMobile` is `undefined` in `completeMemberLogin` — audit events for multi-Pariwar logins omit masked mobile [member-auth.handlers.ts:selectPariwar]
- [x] [Review][Patch] P14: `incrementOtpAttempts` DB failure leaves attempt budget unconsumed — attacker can retry beyond `OTP_MAX_ATTEMPTS` on transient DB errors [member-otp.service.ts:verifyOtp]
- [x] [Review][Patch] P15: `bindDevice`: `memberMaxTrustedDevices=0` config allows unbounded device inserts (no cap enforced) [member-auth.service.ts:bindDevice]
- [x] [Review][Patch] P16: `bindDevice`: `revokeDeviceChain` throw after `deleteTrustedDevice` succeeds — device removed from table but its refresh tokens survive [member-auth.service.ts:bindDevice]
- [x] [Review][Patch] P17: `bindDevice`: `insertTrustedDevice` throw after device drop — oldest device evicted but new device never registered; audit says bound [member-auth.service.ts:bindDevice]
- [x] [Review][Patch] P18: `rotateRefresh`: `revokeDeviceChain` throw on concurrent-rotation reuse detection — chain not revoked despite reuse detected [member-auth.service.ts:rotateRefresh]
- [x] [Review][Patch] P19: `rotateRefresh`: new token insert or `touchTrustedDevice` throw after atomic rotate succeeds — old token consumed, new token never issued, client locked out [member-auth.service.ts:rotateRefresh]
- [x] [Review][Patch] P20: `otp_hash` absent from all `member_login.otp_consume` and `member_step_up.consume` audit events — violates AC2 non-repudiation requirement; `verifyOtp` result does not return `otpHash` [member-auth.handlers.ts + member-otp.service.ts]
- [x] [Review][Patch] P21: `member_step_up.failure` audit omits `action_context` — AC2 requires action_context on every step-up event [member-auth.handlers.ts:stepUpVerify]
- [x] [Review][Patch] P22: `stepUpVerify`: `insertElevation` throw after OTP consumed — OTP burned, elevation not created, step-up gate still rejects, user must re-request OTP [member-auth.handlers.ts:stepUpVerify]
- [x] [Review][Patch] P23: Concurrent `stepUpVerify` calls for same `(memberId, actionContext)` accumulate unbounded elevation rows — UPSERT or cleanup needed [member-auth.repo.ts:insertElevation]
- [x] [Review][Patch] P24: `requireMemberStepUp`: `hasFreshElevation` DB failure propagates as 500 — gate becomes a hard blocker on transient DB errors [member-step-up.gate.ts]
- [x] [Review][Patch] P25: No integration test covers `POST /member/auth/logout` endpoint [tests/integration/member-auth.spec.ts]
- [x] [Review][Patch] P26: `findRefreshTokenByHash` missing `LIMIT 1` — defense-in-depth against constraint relaxation [member-auth.repo.ts]
- [x] [Review][Patch] P27: `otpVerify` multi-Pariwar path: `body.deviceId` not validated before being embedded in `pariwarSelect` token — null device_id binds null device on selectPariwar [member-auth.handlers.ts:otpVerify]

#### Deferred

- [x] [Review][Defer] W1: Access token revocation list absent — JWT 15-min TTL is the spec-committed control for member access tokens; revocation requires a token blacklist not specced here — pre-existing architectural property [member-session-guard.ts]
- [x] [Review][Defer] W2: Stale `phoneCounts` entries survive if server clock jumps >1 window bucket — edge case under unusual clock conditions — pre-existing limitation [otp-rate-limit.ts]
- [x] [Review][Defer] W3: `selectPariwar`: `mobile_blind_index` changed between token issuance and call — structural; would require a persistent nonce table to fully close; theoretical attack requires mobile change during a 5-min window — pre-existing [member-auth.handlers.ts]
- [x] [Review][Patch] P28: Audit `otp_hash` must use HMAC-SHA256(otp_hash, audit_correlation_key) — plain SHA-256 of a 6-digit OTP is brute-forceable in <1ms; add `auditCorrelationKey` to config (resolved from Secret Manager); compute `hmacOtpAudit(otpHash, key)` in a new helper and use it in all `otp_send` / `step_up.send` audit emit sites [auth/shared/otp.ts + member-auth.handlers.ts + config.ts]
- [x] [Review][Patch] P29: Add `onPrimaryDeliveryFailure` no-op callback to `StepUpOtpDeliveryPort` — AC1 alternate-channel fallback seam; Epic 5 (Story 5.6/5.9) wires real transport; callback logs intent only [auth/shared/step-up-delivery.ts]
- [x] [Review][Patch] P30: Add `pariwarSelectTtlMs` config key (default 5 min, env-overridable) and use it in `signPariwarSelect` instead of `stepUpElevatedMs` — decouples scope-select TTL from step-up elevation window [config.ts + member-auth.handlers.ts]
- [x] [Review][Patch] P31: Replace in-process `phoneCounts` Map with Postgres-backed OTP rate counter — `INSERT INTO otp_rate_buckets (phone_key, bucket, count) VALUES ($1,$2,1) ON CONFLICT (phone_key,bucket) DO UPDATE SET count = otp_rate_buckets.count + 1 RETURNING count` — consistent across instances; migration needed [otp-rate-limit.ts + new migration]
- [x] [Review][Patch] P32: Add `memberRefreshAbsoluteMs` config (e.g. 180d) and enforce absolute ceiling in `rotateRefresh` — check `row.created_at + absoluteMs > now`; reject if exceeded; add `created_at` to refresh token read path [config.ts + member-auth.service.ts + member-auth.repo.ts]

---

### Review Findings — Re-review 2026-06-25 (adversarial 3-layer + P1–P32 reconciliation)

> Second pass requested via `/bmad-code-review 3.2`. Layers: Blind Hunter (diff-only) + Edge Case Hunter (diff + repo) + Acceptance Auditor (diff + spec) + a dedicated Patch Reconciler verifying every prior P1–P32 against the **actual working tree** (the prior `[ ]` boxes are stale, not unfixed). 4 decision-needed, 8 patch, 3 defer, 2 dismissed.

#### P1–P32 reconciliation (verified against current code)

- **P1–P19, P21–P32 → FIXED** (verified in code). The prior checklist boxes are unchecked but the fixes ARE present in the working tree — the boxes are stale and should be reconciled to `[x]`.
- **P20 → PARTIAL** — `member_login.otp_consume` now carries `otp_audit_tag` (fixed), but `member_step_up.consume` (`member-auth.handlers.ts:410-413`) still emits only `action_context` with NO `otp_audit_tag`. Re-opened below as **PR-Patch-2**.
- **Gate integrity:** the recorded "17/17 green `pnpm ci:local`" (Debug Log) **predates** the P1–P32 patches AND the hand-authored `0021_otp-rate-buckets.sql` — so the merge gate is currently **unverified**. See **PR-Patch-6**.

#### Decision-Needed

- [x] [Review][Decision] PR-Decision-1 (RESOLVED → patch, see PR-Patch-9): `/token/refresh` does not re-check member lifecycle state — `rotateRefresh` (`member-auth.service.ts:145-221`) validates only the token row; the login path blocks `withdrawn`/`anonymized` but refresh does not, so such a member keeps minting access tokens for up to 90d. Mostly mitigated by the architected `revokeAllMemberSessions` suspension cascade (a seam here, wired in a later epic) + spec W1 (15-min access TTL is the committed control). **Decide:** add a belt-and-suspenders `getMemberStateAt` re-check on refresh now, OR rely on the cascade seam (consistent with architecture/W1).
- [x] [Review][Decision] PR-Decision-2 (RESOLVED → patch, see PR-Patch-10): `pariwar_select` token is replayable — `signPariwarSelect` (`tokens.ts:60-75`) has no `jti` and `/otp/select-pariwar` has no consumption row, unlike its sibling `signup_continuation` (jti + single-use `member_signup_continuations`). Within the 5-min TTL one OTP can mint unlimited full sessions (each a new 90d refresh) + repeatedly drop/bind devices. **Decide:** make it single-use (recommended — mirror signup_continuation: jti + consumption registry/migration), confirming one-OTP→one-Pariwar-session is the intended model.
- [x] [Review][Decision] PR-Decision-3 (RESOLVED → patch, see PR-Patch-11): refresh rotation race revokes a legit device on benign double-tap — two concurrent `/token/refresh` of the SAME valid token (common on flaky rural connectivity) classify the loser as `reuse` → whole device chain revoked → full logout/re-OTP (`member-auth.service.ts:175-185`). **Decide:** keep strict reuse-detection (security) OR add a short same-token grace window (availability).
- [x] [Review][Decision] PR-Decision-4 (RESOLVED → ratified/documented; see PR-Defer-4): ratify two implemented deviations from the AC literal text — (a) "global per-Pariwar send cap" is implemented as a single GLOBAL cap (`otp-rate-limit.ts`; Pariwar unknown pre-scope — dev-disclosed); (b) OTP audit uses `HMAC(otp_hash)` correlation tag (P28 hardening, stronger than spec) instead of the literal `otp_hash` the AC names — NOT in the "Honest deviations" list. **Decide:** ratify both as recorded deviations, OR require per-Pariwar cap / literal `otp_hash`.

#### Patch

- [x] [Review][Patch] PR-Patch-1: `/step-up/request` has no per-phone OTP-send throttle — only `requireMemberSession`; the global per-IP 300/min applies, so an authenticated token-holder can SMS-bomb the member / burn DLT cost. Add a per-member throttle (+ route rateLimit) mirroring `/otp/request` [member-auth.routes.ts:94-101 + otp-rate-limit.ts]
- [x] [Review][Patch] PR-Patch-2: `member_step_up.consume` audit omits `otp_audit_tag` (P20 residual) — `result.otpHash` is available; compute `hmacOtpAuditCorrelation(result.otpHash, deps.config.auditOtpCorrelationKey)` and add `otp_audit_tag` to the consume context (AC2 non-repudiation) [member-auth.handlers.ts:410-413]
- [x] [Review][Patch] PR-Patch-3: trusted-device cap (max 2) not enforced atomically — `bindDevice` read-then-write (list → delete oldest → insert) on the bare pool; concurrent binds can leave 3 devices + orphan a refresh chain. Wrap in a tx with `SELECT … FOR UPDATE` or a per-member advisory lock [member-auth.service.ts:33-80]
- [x] [Review][Patch] PR-Patch-4: step-up OTP not bound to the requesting member — `verifyOtp('step_up', blindIndex, …)` keys on blind index + intent only; for a multi-Pariwar shared mobile another member's session can consume the OTP. Add a `memberId` predicate to the step-up OTP lookup (low exploitability — shared phone already receives both OTPs, but a cheap correctness fix) [member-auth.handlers.ts:385 + member-otp.service.ts/repo]
- [x] [Review][Patch] PR-Patch-5: dead `state === null` branch + empty-stream admit — `getMemberStateAt` never returns null, so the "state unavailable" defense (handlers ~60-77) is unreachable; an identity row with zero lifecycle events logs in as `pending-kyc`. Remove/repair the dead branch (admitting `pending-*` is spec-permitted; the unreachable defense is the issue) [member-auth.handlers.ts]
- [x] [Review][Patch] PR-Patch-6: add the `0021_otp-rate-buckets` drizzle snapshot + re-run `pnpm ci:local` — `_journal.json` lists idx 21 but `migrations/meta/` has no `0021_snapshot.json`; the recorded green gate predates 0021 + all P-patches, so the merge gate is unverified [packages/domain/migrations/meta/]
- [x] [Review][Patch] PR-Patch-7: test coverage gaps — no integration test for the per-IP ceiling, the global cap, or the new `member_step_up.consume` `otp_audit_tag`; add them [tests/integration/member-auth.spec.ts]
- [x] [Review][Patch] PR-Patch-8: `/otp/request` returns `sent:true` even when `stepUpDelivery.deliver()` throws — accepted enumeration tradeoff, but a real SMS failure to a known member is invisible. Surface an internal alert/metric via `onPrimaryDeliveryFailure` (no wire-shape change) [member-auth.handlers.ts:otpRequest]
- [x] [Review][Patch] PR-Patch-9 (from PR-Decision-1): re-check member lifecycle state on refresh — in `rotateRefresh`, after the row is validated, call `memberDomain.getMemberStateAt(row.memberId, now)`; if `withdrawn`/`anonymized`, revoke the device chain + reject (mirror the login gate). Symmetric belt-and-suspenders over the suspension cascade [member-auth.service.ts:rotateRefresh + member-auth.handlers.ts:tokenRefresh]
- [x] [Review][Patch] PR-Patch-10 (from PR-Decision-2): make `pariwar_select` single-use — add a `jti` to `signPariwarSelect`, a `member_pariwar_selects` (or reuse-pattern) single-use registry table + migration, insert on `/otp/verify` (multi path) and consume-or-409 on `/otp/select-pariwar` (mirror `signup_continuation`) [tokens.ts + member-auth.handlers.ts + new schema/migration]
- [x] [Review][Patch] PR-Patch-11 (from PR-Decision-3): add a same-token grace window to the refresh race — when `markRefreshTokenRotated` loses the race for a token whose own `rotated_at` was set within a short grace (e.g. ≤10s) by a concurrent call, return the already-issued successor instead of classifying as reuse; keep strict reuse for genuinely older rotated tokens [member-auth.service.ts:rotateRefresh + member-auth.repo.ts]

#### Deferred

- [x] [Review][Defer] PR-Defer-1: Mobile UI collapses `pariwar_select` + `signup_continuation` into a placeholder notice — multi-Pariwar / first-signup members cannot complete login in the shipped UI; API+SDK fully support both. Deferred — Passport scope-selection UI + signup wizard are Story 3.6 / Epic 4 (dev-disclosed) [apps/mobile/app/(auth)/otp.tsx]
- [x] [Review][Defer] PR-Defer-2: `requireMemberStepUp` swallows DB errors → 403 (P24-as-applied) — masks a DB outage as "needs step-up" (non-actionable loop). Deferred — deliberate availability tradeoff over a hard 5xx [member-step-up.gate.ts]
- [x] [Review][Defer] PR-Defer-3: Story 3.2 final sign-off depends on Story 0.13 legal-counsel returns — carried as a closure risk, not a code blocker (re-affirms the existing deferral). Prior W1/W2/W3 remain deferred as recorded.
- [x] [Review][Defer] PR-Defer-4 (ratified, from PR-Decision-4): two AC-literal deviations accepted as recorded — (a) the "global per-Pariwar send cap" is implemented as a single GLOBAL cap (Pariwar unknown pre-scope; per-Pariwar refinement defers to a scoped surface); (b) OTP audit stores `HMAC(otp_hash)` (P28 hardening, strictly stronger than the AC's literal `otp_hash`). Both should be added to the Completion Notes "Honest deviations" list.

#### Re-review resolution (2026-06-25)

All 11 patches applied + all 4 decisions resolved. **P1–P32 reconciled**: P1–P19 + P21–P32 were already FIXED in the working tree (boxes were stale, now checked); P20 (step-up consume `otp_audit_tag`) closed by PR-Patch-2.

**Patches applied:**
- PR-Patch-1 — `memberStepUpSendThrottle` (per-member) + per-IP ceiling on `/step-up/request` (`otp-rate-limit.ts`, `member-auth.routes.ts`).
- PR-Patch-2 — `otp_audit_tag` added to `member_step_up.consume` (`member-auth.handlers.ts`).
- PR-Patch-3 — `bindDevice` wrapped in a per-member `pg_advisory_lock` (`member-auth.service.ts`).
- PR-Patch-4 — step-up `verifyOtp` bound to `expectedMemberId` (`member-otp.service.ts`, `member-auth.repo.ts`).
- PR-Patch-5 — dead `state === null` branch removed (`member-auth.handlers.ts`).
- PR-Patch-6 — migrations 0021 + 0022 applied to :5433; `db:check` "Everything's fine"; `ci:local` re-verified green (16 jobs + the unit job green DB-less). **Note:** drizzle snapshots for 0021/0022 remain hand-managed/absent (the established 0021 pattern); `db:check`/`schema-diff` tolerate it, but a future `db:generate` must be run carefully (snapshot drift — known, not gate-blocking).
- PR-Patch-7 — integration tests added: select single-use, refresh-after-withdrawal, step-up send throttle, concurrent-refresh grace, per-IP ceiling, step-up consume audit-tag (18/18 green).
- PR-Patch-8 — `/step-up/request` delivery failure now audited + alert-hooked (`member-auth.handlers.ts`).
- PR-Patch-9 — `rotateRefresh` re-checks `getMemberStateAt`; withdrawn/anonymized → revoke chain + 403 `member_session.revoked` (`member-auth.service.ts`, `audit-sink.ts`).
- PR-Patch-10 — `pariwar_select` single-use: `jti` + `member_pariwar_selects` table (schema + RLS + migration 0022) + consume-or-409 (`tokens.ts`, jwt plugin, `member-auth.{handlers,repo}.ts`).
- PR-Patch-11 — refresh-race grace window (`memberRefreshRaceGraceMs`, default 10s): a true concurrent double-tap (loser of the atomic-rotation race within grace) returns `concurrent` (no chain revoke); sequential replay-after-rotation stays strict reuse → revoke (`member-auth.service.ts`, `config.ts`).

**Ratified deviations (added to Honest Deviations):** global send cap (not per-Pariwar, pre-scope); `HMAC(otp_hash)` audit tag (stronger than literal `otp_hash`).
