// Login-wall fails-closed guard (Story 1.14, AC-2 — FR-90 mechanism) — hermetic.
//
// `requireAdminSession` already 401s on an absent/expired session. This proves
// "authenticated ⇒ guarded" holds BY CONSTRUCTION: walk the real route table and
// assert every route NOT on the explicit public allowlist carries the session gate
// (tagged with ADMIN_SESSION_GUARD). A future authenticated route that forgets the
// preHandler — and is not deliberately allowlisted — fails CI, not prod.
//
// The public allowlist is the security-reviewed set of pre-session surfaces: health,
// the auth-establishment flow (login + the MFA/recovery/reset steps that RUN before a
// full session exists), the CSRF-token mint, swagger, and the honeypot traps. Adding
// a route here is an explicit decision; forgetting BOTH the allowlist entry and the
// gate fails the test (fails closed).

import { describe, expect, it } from 'vitest';

import { MEMBER_SESSION_GUARD } from '../../src/modules/auth/shared/member-session-guard.js';
import { ADMIN_SESSION_GUARD } from '../../src/modules/auth/shared/session-guard.js';
import type { TurnstileVerifier } from '../../src/modules/auth/shared/turnstile.js';
import { HONEYPOT_PATHS } from '../../src/plugins/security-headers/index.js';
import { getCollectedRoutes } from '../../src/route-registry.js';
import { createTestApp, teardown } from './_setup.js';

const rejectingTurnstile: TurnstileVerifier = { verify: async (): Promise<boolean> => false };

/** `${METHOD} ${url}` keys that legitimately run WITHOUT a full admin session. */
const PUBLIC_ALLOWLIST = new Set<string>([
  'GET /api/v1/_meta/health',
  'GET /api/v1/_meta/ready',
  'GET /api/v1/auth/csrf',
  'POST /api/v1/auth/login',
  // MFA / recovery / reset steps run on the pending-MFA session, BEFORE a full
  // admin session is established — they cannot require requireAdminSession.
  'POST /api/v1/auth/passkey/register/options',
  'POST /api/v1/auth/passkey/register/verify',
  'POST /api/v1/auth/passkey/authenticate/options',
  'POST /api/v1/auth/passkey/authenticate/verify',
  'POST /api/v1/auth/recovery/consume',
  'POST /api/v1/auth/password-reset/request',
  'POST /api/v1/auth/password-reset/consume',
  // ── Story 3.2 — member mobile+OTP auth: pre-session surfaces ─────────────────
  // OTP request/verify, multi-Pariwar scope select, and token refresh all run
  // BEFORE a member session exists (bearer-token model) — they cannot require the
  // member-session guard. The member step-up routes + the probe ARE guarded
  // (MEMBER_SESSION_GUARD), so they are NOT allowlisted.
  'POST /api/v1/member/auth/otp/request',
  'POST /api/v1/member/auth/otp/verify',
  'POST /api/v1/member/auth/otp/select-pariwar',
  'POST /api/v1/member/auth/token/refresh',
  // ── Story 10.21 AC-R1 — the member-direct export DELIVERY redemption ─────────
  // ⛔ DELIBERATELY UNAUTHENTICATED, and this allowlist entry is where that decision is
  // visible. The subject is a TERMINATED member: Niyamavali §8.4 ends authenticated
  // access while statutory rights survive, so the delivery route cannot require a
  // session — issuing one is precisely what the instrument forecloses. Ruled
  // member-direct by Decision `2026-08-14-109` clause 1.
  // ⚠ It is NOT an open surface. Redemption needs TWO secrets — the unguessable
  // `grantId` in the path AND the OTP delivered to the registered mobile — the grant is
  // one-time (burned by a conditional UPDATE) and short-lived, and EVERY failure mode
  // (unknown / spent / expired / wrong code / staff-mediated channel) returns the SAME
  // 404, so it is not an existence oracle. ⛔ It carries the named WRITE rate limit — the TIGHTER of
  // the two named tiers. (This comment said "read" until the round-2 review: the route had been moved
  // to `limits.write` by an earlier review finding and the allowlist's justification was not updated
  // with it. This entry is the designated place where "deliberately unauthenticated" is DEFENDED, so
  // half a defence being false is the whole problem — and it is now asserted below, not just asserted
  // about.)
  // ⛔ Do not "fix" this by adding a session guard — that deletes the route's purpose.
  'POST /api/v1/member-data-rights/delivery/:grantId/redeem',
  // Story 3.6a — first-signup member creation is PUBLIC (pre-session): the caller holds a
  // signup_continuation bearer (intent-scoped, single-use), not a member session, so it cannot
  // carry requireMemberSession. It is authenticated-equivalent via that verified-mobile token
  // (re-derived blind index must match the token sub), exactly like /otp/verify.
  'POST /api/v1/member/auth/signup/create',
  // Story 3.3b — the DigiLocker OAuth callback is PUBLIC by design (R3): DigiLocker
  // redirects the browser here with ?state&code and NO member JWT, so it cannot carry
  // requireMemberSession. It is authenticated-equivalent via the unguessable OAuth `state`
  // (resolves the kyc_transaction's member_id + pariwar_id), exactly like the OTP routes.
  // The other KYC routes (initiate/confirm/manual/status) ARE member-session-gated.
  'POST /api/v1/kyc/callback',
  // ── Story 11a.3 — the PUBLIC Member Directory read ───────────────────────────
  // ⛔ DELIBERATELY UNAUTHENTICATED, and this entry is where that decision is DEFENDED.
  // WHY: the surface is `public` TIER BY PANEL RULING (`2026-08-19-135`, affirmed by
  // `-136`) — the Member Directory is meant to be readable by anyone on the internet
  // with no login, so there is no session to require. ⛔ There is also no member
  // session available to add: members are TOKEN-BEARER (Authorization header, not
  // cookies), there is no `apps/member-web`, and `apps/mobile` has no directory
  // screen (`2026-08-20-143` cl.7). Adding a guard would delete the route's purpose
  // AND could not be satisfied by any shipped client.
  // ⚠ IT IS NOT AN OPEN SURFACE. FIVE controls bound it, each mechanized and tested:
  //   · the named SEARCH rate limit, UNMODIFIED — ⛔ NOT `limits.read`, the looser tier,
  //     which is backwards for an enumeration surface. Keyed (via `perSessionKey` →
  //     `request.ip` → `trustProxy`) on the FORWARDED VISITOR ADDRESS, not the SSR
  //     proxy; `rate-limit-key.spec.ts` asserts two addresses land in DIFFERENT buckets.
  //   · a page-size CAP (`PUBLIC_SURFACE_PAGE_SIZE_CAP` = 50) in the `.strict()` query
  //     schema, so Story 1.14's OpenAPI forced-pagination guard covers this route too.
  //   · a deep-pagination HORIZON (`PUBLIC_DIRECTORY_PAGE_HORIZON` = 200) — the ceiling
  //     that actually bounds a full walk, since offset paging was KEPT (D2(a)).
  //   · `X-Robots-Tag: noindex, nofollow` from the existing global hook, plus `noindex`
  //     on the page itself.
  //   · ⛔ NO member-detail route and ⛔ NO export affordance of any kind (FR-91). The
  //     `.strict()` schema makes `?format=csv` a 400 rather than an ignored parameter.
  // ⚠ AND ITS HONEST LIMIT, recorded rather than glossed: `trustProxy: true` makes the
  // forwarded address CALLER-SUPPLIED, so the per-visitor ceiling holds only for traffic
  // arriving through the trusted hop (`2026-08-20-143` cl.9). ⛔ Do not "fix" that by
  // re-tuning `trustProxy` globally — it would alter `request.ip` and origin checks for
  // every route in the app.
  // ⛔ Do not "fix" this entry by adding a session guard.
  'GET /api/v1/p/:pariwarId/public-pages/member-directory',
  // ── Story 11b.1 — the PUBLIC Sahyog Drive pool index read ─────────────────────
  // ⛔ DELIBERATELY UNAUTHENTICATED, and this entry is where that decision is DEFENDED.
  // ⭐ THE SECOND `public-pages` collection GET, and it is here because `routes.ts`'s
  // *"⛔ NO SECOND ROUTE"* clause NAMED THE PRICE of one — its own allowlist entry, its
  // own written defence, its own rate-limit choice. This is that entry.
  // WHY UNAUTHENTICATED: the surface exists so that anyone — a member's family, a
  // prospective member, a journalist — can verify for themselves that this trust
  // actually moves money. A login would defeat that purpose, and there is no member
  // session to add anyway (members are TOKEN-BEARER, there is no `apps/member-web`,
  // `2026-08-23-154` disposition (c) DEFERRED the authenticated tier for exactly that
  // reason). ⛔ Do not "fix" this by adding a session guard.
  // ⚠ IT IS NOT AN OPEN SURFACE. THE SAME FIVE controls bound it, each mechanized and
  // tested — ⚠ FIVE, matching `routes.ts` exactly; ⛔ two authoritative documents
  // disagreeing on how many controls exist is a defect this file has already had once:
  //   · the named SEARCH rate limit, UNMODIFIED — ⛔ NOT `limits.read`, the looser tier,
  //     which is backwards for an enumeration surface. Keyed on the FORWARDED VISITOR
  //     ADDRESS via the same `perSessionKey` → `request.ip` → `trustProxy` chain.
  //   · a page-size CAP (`PUBLIC_SURFACE_PAGE_SIZE_CAP` = 50) in the `.strict()` query
  //     schema, so Story 1.14's forced-pagination guard covers this route too.
  //   · a deep-pagination HORIZON — ⭐ the SAME `PUBLIC_DIRECTORY_PAGE_HORIZON` (200),
  //     re-exported rather than re-declared: two public surfaces with two horizons is
  //     the drift a shared constant exists to prevent.
  //   · `X-Robots-Tag: noindex, nofollow` from the existing global hook, plus `noindex`
  //     on the page itself.
  //   · ⛔ NO per-pool detail route and ⛔ NO export affordance of any kind (FR-91). The
  //     `.strict()` schema makes `?format=csv` a 400 rather than an ignored parameter —
  //     and it is also what makes `?name=…` a refusal, which matters here: there is no
  //     name-search substrate and the obvious workaround is an amplification attack.
  // ⭐ AND ONE CONTROL THE DIRECTORY DOES NOT HAVE — a PUBLICATION-BASIS gate on the
  // deceased member's name, evaluated BEFORE the Tier-1 decrypt so a row with no basis
  // costs ZERO KMS calls and no decrypt happens without an authorising basis.
  // ⚠ It gates the NAME, ⛔ never the ROW.
  // ⚠⛔ ⛔ NOT a per-subject consent gate, and it was until Story 11b.9: the family
  // tick-box (`sahyog_drive_publication`) was DE-AUTHORISED by `2026-08-28-160` cl.3-5
  // and the box retired by `-162`. The authority is the MEMBER'S OWN accepted versioned
  // T&C pinning the post-death publication clause.
  // ⚠ ITS HONEST LIMITS, recorded rather than glossed: `trustProxy: true` makes the
  // forwarded address CALLER-SUPPLIED (`2026-08-20-143` cl.9); and a cached hit never
  // reaches the origin, so the abuse counter here sees only cache MISSES.
  // ⛔⛔ AND BUILT IS ⛔ NOT PUBLISHED — ⭐ still true, but ⛔ NOT for the reasons this
  // comment used to give, both falsified on 2026-08-28: counsel's DPDPA hold was LIFTED
  // (`-160` cl.7, superseding `-157` cl.3) and Row 17's ≥2-trustee posture rested on C-5,
  // which FELL WHOLLY as a mechanism. ⭐ What keeps `/sahyog` dark is DEPLOYMENT plus the
  // counsel/Panel process — ⛔ not a code mechanism, and ⛔ never the publication kill
  // switch (an emergency control that defaults to ENABLED). ⛔ Allowlisting the route
  // closes nothing.
  'GET /api/v1/p/:pariwarId/public-pages/sahyog-drive',
  // ── Story 11b.3 — the PUBLIC PER-CLAIM Sahyog Vivran read ─────────────────────
  // ⛔ DELIBERATELY UNAUTHENTICATED, and this entry is where that decision is DEFENDED.
  // ⭐ THE THIRD `public-pages` GET, and the FIRST that is not a collection. It is here
  // because `routes.ts`'s two-route clause named the price of another route — its own
  // allowlist entry, its own written defence, its own rate-limit choice. This is that entry.
  // WHY UNAUTHENTICATED: the surface exists so that anyone can check one drive's record for
  // themselves — which pool it was, how it closed, and how many contributions were CONFIRMED
  // as money received. A login would defeat that purpose, and there is no member session to
  // add anyway (members are TOKEN-BEARER, there is no `apps/member-web`; `2026-08-23-154`
  // disposition (c) DEFERRED the authenticated tier for exactly that reason, and
  // `2026-08-28-164` A2 RE-PURPOSED SD-2 onto the post-campaign masking state rather than
  // dissolving it). ⛔ Do not "fix" this by adding a session guard.
  //
  // ⚠⛔ IT IS NOT AN OPEN SURFACE — AND IT IS ⛔ NOT BOUNDED BY THE SAME FIVE CONTROLS THE TWO
  // ROUTES ABOVE SHARE. ⛔ STATING FIVE HERE WOULD BE FALSE. `routes.ts:52-55` ruled that the
  // five are properties of "an unauthenticated, PAGINATED, PII-BEARING public COLLECTION"; this
  // route is a SINGLE-ITEM GET on a path parameter and declares `paginated: false`.
  // ⚠⛔⛔ AMENDED BY STORY 11b.3a — THE THIRD PROPERTY NO LONGER HOLDS. This entry used to add
  // "and carries ZERO Tier-1 fields". ⭐ TRUE AT 11b.3; ⛔ FALSE NOW: 11b.3a declares FOUR ruled
  // Tier-1 nominee-bank fields on this surface (`2026-08-28-165` cl.1/cl.3, under `2026-08-28-160`
  // cl.10) and the handler DECRYPTS them ⇒ **THIS ROUTE IS PII-BEARING**. ⛔ Amended, ⛔ not
  // deleted — the previous claim is named so nobody restores it.
  // ⇒ **D11(a)** (`2026-09-02-176`) ruled it states its APPLICABLE set; 11b.3a changed WHICH
  // controls apply, ⛔ not the rule — and ⭐ **STORY 11b.10 ADDED THE FIFTH** (the unguessable
  // address). ⭐ **FIVE**, matching `routes.ts` exactly:
  //   · the named SEARCH rate limit, UNMODIFIED — ⛔ NOT `limits.read`, the looser tier, which is
  //     backwards for an enumeration surface. Keyed on the FORWARDED VISITOR ADDRESS via the same
  //     `perSessionKey` → `request.ip` → `trustProxy` chain.
  //   · `X-Robots-Tag: noindex, nofollow` from the existing global hook, plus `noindex` on the
  //     page itself.
  //   · ⛔ NO onward DETAIL or EXPORT affordance. ⚠ Read that carefully on a single-item route:
  //     this route IS the detail view, so what is absent is any onward affordance — ⛔ no list,
  //     ⛔ no sibling links, ⛔ no `format`/`csv`, and an EMPTY `.strict()` query schema that
  //     makes every query parameter a 400.
  //   · ⭐ NEW AT 11b.3a — the BOUNDED, PROJECTED Tier-1 read. The four fields are decrypted
  //     SERVER-SIDE here and ⛔ never by `apps/public` (the KEK is shared across EVERY Tier-1 field
  //     class, so granting it for ONE gives it ALL — `2026-08-20-143` cl.1). The fan-out is bounded
  //     by `DIRECTORY_DECRYPT_CONCURRENCY` at AT MOST EIGHT values per page (four fields × at most
  //     two EQUAL accounts) — and only TWO per account once the Pariwar's masking window has
  //     elapsed, because cl.10(e)'s retention list excludes the holder name and the VPA. The masked
  //     projection is applied HERE: the wire's masked arm carries ⛔ no `accountNumber` key at all.
  //   · ⭐⭐ NEW AT 11b.10 — THE UNGUESSABLE PUBLIC ADDRESS. The path parameter is `:driveToken`, a
  //     128-bit CSPRNG token on the pool row under a GLOBAL unique index — ⛔ no longer the
  //     sequential `P-YYYY-MM-###` (`2026-09-03-184` **(B)**, Trustee-ratified). There is EXACTLY
  //     ONE address form: the bare identifier is ⛔ not independently addressable, though it is
  //     RETAINED (`-184` cl.2) and still RENDERED. A wrong or absent token answers a
  //     **BYTE-IDENTICAL 404** — the fourth collapsed case — because a distinguishable *"real
  //     drive, wrong token"* would itself be the enumeration oracle.
  //     ⛔ IT BOUNDS **DISCOVERY**, ⛔ NOT **AUTHORISATION** (D1, 2026-09-04): the page answers 200
  //     to ANYONE presenting a valid address — ⛔ no session, ⛔ no new auth surface, and ⛔ never a
  //     branch on the reader's membership standing (⛔ no `members.state`, ⛔ no `is_valid`, ⛔ no
  //     moderation overlay). ⚠ ITS PRICE, carried and ⛔ not hidden: a forwarded link is permanent
  //     public access to that drive UNTIL ITS TOKEN IS ROTATED — which is why the token is
  //     ROTATABLE per drive (D2), and ⛔ why the two must not be separated.
  //
  // ⛔ CONTROLS 2 (`PUBLIC_SURFACE_PAGE_SIZE_CAP`) AND 3 (`PUBLIC_DIRECTORY_PAGE_HORIZON`):
  // ⛔ STILL NOT APPLICABLE — NO COLLECTION, NO `limit`, NO `page` to bind them to.
  // ⚠⛔ THE N/A STILL HAS AN EXPIRY: **Story 11b.3b adds the contributor list, which makes this
  // route PAGINATED and RESTORES BOTH.** ⇒ 11b.3b owes this entry AND the `routes.ts` header an
  // update in its own commit — a bare "not applicable" with no expiry is how two controls quietly
  // never come back.
  // ⚠⛔⛔ AND 11b.3b MUST **EXTEND** WHAT 11b.3a WROTE, ⛔ NEVER OVERWRITE IT. The two are declared
  // INDEPENDENT AND PARALLEL and restore DIFFERENT properties on these SAME two documents: 11b.3a
  // restored PII-BEARING (the fourth bullet above), 11b.3b restores PAGINATED (controls 2 and 3).
  // ⛔ Replacing this set with a pagination-only one would DROP a control both documents must state
  // identically. ⇒ 11b.3b's count is **SIX**, ⛔ not five.
  // ⚠ 11b.3a's `nomineeBankAccounts` restores ⛔ NEITHER control: its `.max(2)` is the shape of a
  // substrate whose composite PK admits exactly `{1, 2}` — nothing to page, filter or walk.
  //
  // ⚠⛔ AND THE PROPERTY THAT WAS TRUE HERE IS NOW GONE: this entry used to say "⛔ THERE IS NOTHING
  // TO DECRYPT … ZERO KMS round-trips", which was the whole purchase of the D6(b) split. ⛔ FALSE
  // since 11b.3a. ⚠ What STILL holds is the conclusion it supported: this is ⛔ NOT a reason to move
  // the read to `apps/public` — and it is now a much STRONGER reason not to, because the decrypt
  // capability would go with it.
  //
  // ⚠ ITS HONEST LIMITS, recorded rather than glossed: `trustProxy: true` makes the forwarded
  // address CALLER-SUPPLIED (`2026-08-20-143` cl.9); a cached hit never reaches the origin, so
  // origin-side signals see only cache MISSES.
  // ⚠⭐ AND THE THIRD LIMIT IS **AMENDED BY 11b.10, ⛔ NOT DELETED**: it read *"with controls 2/3
  // structurally absent, `limits.search` is the ONLY bound on walking the sequential identifier —
  // which after 11b.3a fronts FOUR DECRYPTED Tier-1 fields, rendered in FULL for every Pariwar
  // until the Trust sets a masking window (`D8-default` FAIL-OPEN, `2026-09-02-179` cl.1)"*.
  // ⭐ THAT WAS TRUE AND IS THE REASON 11b.10 EXISTS. ⇒ there is now ⛔ NO SEQUENCE TO WALK: the
  // address is opaque (control 5 above). ⚠ `D8-default` FAIL-OPEN is UNCHANGED — 11b.10 changed
  // WHO CAN FIND the page, ⛔ not WHAT IS SHOWN (`-184` cl.5: option (d) was disclosure only and the
  // Panel did ⛔ not direct it). ⚠⛔ AND `limits.search` IS STILL ⛔ NOT A TUNING KNOB in EITHER
  // direction: the Panel directed option **(c)**, ⛔ not option (b), so the tier is unchanged, and
  // judging it insufficient is **A DECISION** (`2026-09-02-183` cl.5; 11b.3a AC2).
  // ⚠⛔ AND A MASKING FLIP IS ⛔ NOT IMMEDIATE: `s-maxage=300` means the previous projection — which
  // may be a FULL ACCOUNT NUMBER — keeps being served from every warm PoP for up to five minutes.
  // ⛔ Direct SQL is NOT the operational fallback.
  // ⛔⛔ AND BUILT IS ⛔ NOT PUBLISHED. What keeps this surface dark is DEPLOYMENT plus the
  // counsel/Panel process — ⛔ not a code mechanism, and ⛔ never the publication kill switch (an
  // emergency control that defaults to ENABLED). ⛔ Allowlisting the route closes nothing.
  'GET /api/v1/p/:pariwarId/public-pages/sahyog-vivran/:driveToken',
  // Developer-convenience OpenAPI doc (read-only, no data).
  'GET /docs/json',
  // Story 5.4 — the WhatsApp inbound-webhook ingress (§3.11) is PUBLIC by design: Meta is unauthenticated,
  // so it cannot carry a member/admin session. Its auth is the per-Pariwar verify-token (GET challenge) +
  // the X-Hub-Signature-256 HMAC over the raw body (POST) — verified in the handler, fail-closed (403).
  'GET /api/v1/webhooks/whatsapp/:pariwarId',
  'POST /api/v1/webhooks/whatsapp/:pariwarId',
  // Story 5.5 — the Telegram inbound-update webhook (§3.11) is PUBLIC by design: Telegram is unauthenticated,
  // so it cannot carry a member/admin session. Its auth is the per-Pariwar X-Telegram-Bot-Api-Secret-Token
  // header (constant-time compare) — verified in the handler, fail-closed (403). Telegram is POST-only.
  'POST /api/v1/webhooks/telegram/:pariwarId',
  // Honeypot traps are public by design (bot-bait); added programmatically below.
  ...HONEYPOT_PATHS.map((p) => `GET ${p}`),
]);

function hasSessionGuard(preHandlers: readonly unknown[]): boolean {
  // A route is "guarded" if it carries EITHER the admin-session guard OR the
  // member-session guard (Story 3.2) — both are login-walls for their surface.
  return preHandlers.some(
    (h) =>
      typeof h === 'function' &&
      ((h as unknown as Record<symbol, unknown>)[ADMIN_SESSION_GUARD] === true ||
        (h as unknown as Record<symbol, unknown>)[MEMBER_SESSION_GUARD] === true),
  );
}

describe('Login-wall fails-closed guard (AC-2, hermetic — no DB)', () => {
  it('every non-allowlisted route carries the requireAdminSession gate', async () => {
    const t = await createTestApp();
    try {
      const routes = getCollectedRoutes(t.app);
      expect(routes.length).toBeGreaterThan(0); // registry actually populated

      const unguarded: string[] = [];
      let guarded = 0;
      for (const route of routes) {
        // HEAD is auto-derived by Fastify from each GET and shares its preHandlers,
        // so the GET check already covers it — skip to avoid double-bookkeeping.
        if (route.method === 'HEAD') continue;
        const key = `${route.method} ${route.url}`;
        if (PUBLIC_ALLOWLIST.has(key)) continue;
        if (hasSessionGuard(route.preHandlers)) {
          guarded += 1;
        } else {
          unguarded.push(key);
        }
      }

      expect(unguarded).toEqual([]);
      // Not vacuous — there is a real set of authenticated routes under the gate.
      expect(guarded).toBeGreaterThanOrEqual(6);
    } finally {
      await teardown(t);
    }
  });

  it('an authenticated route returns 401 (fails closed) when called without a session', async () => {
    const t = await createTestApp();
    try {
      // GET (no body schema) so validation passes and the gate is what fires.
      const res = await t.app.inject({ method: 'GET', url: '/api/v1/auth/session' });
      expect(res.statusCode).toBe(401);
      expect(res.json<{ error: { code: string } }>().error.code).toBe('auth.session_required');
    } finally {
      await teardown(t);
    }
  });

  it('the public login route is reachable WITHOUT a session (allowlist is real)', async () => {
    // A rejecting Turnstile makes login 401 with the generic credential envelope
    // BEFORE any DB work — so this stays hermetic. The point: the failure is
    // auth.invalid_credentials (the handler ran), NOT auth.session_required (the
    // login-wall did not block a pre-session route).
    const t = await createTestApp({ turnstile: rejectingTurnstile });
    try {
      const res = await t.app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        headers: { origin: 'http://localhost:3001' },
        payload: { email: 'nobody@example.test', password: 'a-sufficiently-long-password' },
      });
      expect(res.statusCode).toBe(401);
      expect(res.json<{ error: { code: string } }>().error.code).toBe('auth.invalid_credentials');
    } finally {
      await teardown(t);
    }
  });

  it('⭐ the unauthenticated redemption route carries the WRITE rate-limit tier the allowlist claims', async () => {
    // ⛔ THE ALLOWLIST ENTRY IS A DEFENCE, AND HALF OF IT WAS FALSE. The comment above claimed the
    // route "carries the named read rate limit" while `routes.ts` had already been moved to
    // `limits.write` by an earlier review — and NOTHING asserted which tier was configured, so the
    // drift was invisible. An entry defending "deliberately unauthenticated" must be true in every
    // clause, or the next reviewer either accepts a wrong fact or re-opens a settled question.
    const t = await createTestApp();
    try {
      const routes = getCollectedRoutes(t.app);
      // ⚠ COMPARED BY OBJECT IDENTITY, NOT BY `max`. `namedRateLimits(deps)` is called ONCE per
      // module registration, so every route on the same tier shares the SAME config object — while the
      // test environment sets every tier's `max` to the same large number, which makes a value
      // comparison pass vacuously. Identity survives that.
      const tierOf = (method: string, url: string): unknown => {
        const r = routes.find((x) => x.method === method && x.url === url);
        expect(r, `route not found: ${method} ${url}`).toBeDefined();
        const cfg = r!.config as { rateLimit?: unknown } | undefined;
        expect(cfg?.rateLimit, `${method} ${url} declares no rateLimit`).toBeDefined();
        return cfg!.rateLimit;
      };

      // Reference tiers, read off the SAME live route table rather than re-derived from config.
      const writeTier = tierOf('POST', '/api/v1/p/:pariwarId/member-data-rights/export');
      const readTier = tierOf('GET', '/api/v1/p/:pariwarId/member-data-rights/export/active');
      // Without this the comparison below could pass vacuously if both names resolved to one object.
      expect(writeTier, 'the two named tiers must be distinct objects for this to have teeth').not.toBe(readTier);

      const redeem = tierOf('POST', '/api/v1/member-data-rights/delivery/:grantId/redeem');
      expect(redeem, 'the redemption route must be on the WRITE (tighter) tier').toBe(writeTier);
      expect(redeem, 'the redemption route must NOT be on the looser read tier').not.toBe(readTier);
    } finally {
      await teardown(t);
    }
  });

});
