// The termination-access block — E2E (Story 10.19, Task 4; AC4, AC12; :5433).
//
// ── ⛔ THE DOMAIN VOCABULARY, RULED (Decision `2026-08-10-098` clause 3) ───────────────────────────
// Nothing in this file describes a failed login, and nothing may be edited to. The sequence is:
//
//   OTP verification SUCCEEDS → termination status is established → SESSION ISSUANCE IS DENIED →
//   a structured termination response is returned → the client renders the termination surface.
//
// Identity verification succeeded; authorization to establish a member session did not. The HTTP
// status code is a TRANSPORT DETAIL. If you find yourself writing "login fails" in a title here,
// you are describing a different system.
//
// ── What AC12 is defending against, in one sentence ───────────────────────────────────────────────
// The Trustee Panel named the failure directly: **a future implementation quietly issuing a normal
// session because OTP authentication succeeded.** That is not hypothetical — it is the most natural
// mistake at this seam, because step 1 of the sequence genuinely DOES succeed and the code sits
// inside a function whose name and history are about completing a login. Every assertion below is
// chosen so that mistake cannot pass.
//
// ── Two things this file does deliberately, which look odd until you know why ─────────────────────
//
//   (1) A FRESH RANDOM pariwarId PER TEST. The flag lookup is memoized in a process-global `Map`
//       keyed by `(flag_key, pariwar_id)` with a 5-second TTL (`feature-flags/cache.ts:36,48`). Two
//       tests sharing a Pariwar within that window would read each other's flag state, and the
//       flag-OFF test would flake against the flag-ON test's row. Distinct Pariwars make the cache
//       keys disjoint, so neither test can observe the other's flip.
//
//   (2) `issueFullSession` IS NOT SPIED ON — its OBSERVABLE FOOTPRINT is asserted instead: no
//       refresh-token row, no trusted-device row, and neither of the two audit lines it is followed
//       by (`member_login.otp_consume` with `result: 'full_session'`, and `member_device.bound`).
//       A spy would pin an implementation NAME; these pin the EFFECT, and they keep failing if the
//       function is renamed, inlined, or replaced by a different session-minting path — which is
//       exactly the refactor that would otherwise slip a session past this gate.

import { randomUUID } from 'node:crypto';

import { featureFlags } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import { encryptMobile, mobileBlindIndex, normalizeMobile } from '../../../src/modules/auth/shared/mobile-index.js';
import { createTestApp, hasDatabase, teardown, type TestApp } from '../_setup.js';

type Json = Record<string, unknown>;

const BASE = '/api/v1/member/auth';
const FLAG = 'termination_access_block';

function randomMobile(): string {
  let n = String(6 + Math.floor(Math.random() * 4));
  for (let i = 0; i < 9; i++) n += Math.floor(Math.random() * 10);
  return n;
}

async function post(t: TestApp, url: string, payload: Json): Promise<{ status: number; body: Json }> {
  const res = await t.app.inject({ method: 'POST', url, payload, headers: { origin: 'http://localhost:3001' } });
  let body: Json = {};
  try {
    body = res.json() as Json;
  } catch {
    body = {};
  }
  return { status: res.statusCode, body };
}

/** Seed an ACTIVE member with a login identity. Mirrors `moderation-auth-effects.spec.ts`. */
async function seedMember(t: TestApp, mobile: string, pariwarId: string): Promise<string> {
  const memberId = randomUUID();
  const blindIndex = await mobileBlindIndex(mobile, t.deps.encryption);
  const ciphertext = await encryptMobile(normalizeMobile(mobile) as string, t.deps.encryption);
  await t.pool.query(
    `INSERT INTO pariwar_passport (pariwar_id, display_name_en, display_name_hi, legal_name, branding_bundle, locale_default)
       VALUES ($1, 'Test Pariwar', 'Test Pariwar', 'Test Trust', $2, 'hi')
     ON CONFLICT (pariwar_id) DO NOTHING`,
    [pariwarId, JSON.stringify({ logo_url: 'https://x/l.png', primary_color: '#0A3D62', secondary_color: '#FFFFFF' })],
  );
  await t.pool.query(`INSERT INTO members (member_id, pariwar_id, state, state_event_version) VALUES ($1, $2, 'active', 4)`, [
    memberId,
    pariwarId,
  ]);
  await t.pool.query(
    `INSERT INTO member_identities (member_id, pariwar_id, mobile_ciphertext, mobile_blind_index) VALUES ($1, $2, $3, $4)`,
    [memberId, pariwarId, ciphertext, blindIndex],
  );
  // ⚠ `member.lock_in_expired` MUST carry `{ kyc_verified: true }`. The reducer safeParses it and
  // returns the state UNCHANGED on a malformed payload (`domain/member/state.ts:91-96`, whose own
  // comment names "seeded without kyc_verified" as the case), so an empty payload leaves the member
  // stuck in `lock-in` — never `active`. Nothing here would fail: login does not gate on `lock-in`,
  // so every assertion in this file would still pass while silently testing the wrong member state,
  // and `member.withdrawal_completed` (which transitions only from `active`) would become a no-op.
  const events: Array<[string, string]> = [
    ['member.signup_initiated', '{}'],
    ['member.kyc_completed', '{}'],
    ['member.vyawastha_shulk_paid', '{}'],
    ['member.lock_in_expired', JSON.stringify({ kyc_verified: true })],
  ];
  let v = 1;
  for (const [type, payload] of events) {
    await t.pool.query(
      `INSERT INTO events_log (stream_id, event_type, payload, event_version, occurred_at, pariwar_id)
         VALUES ($1, $2, $3::jsonb, $4, now() - interval '1 day', $5)`,
      [memberId, type, payload, v++, pariwarId],
    );
  }
  return memberId;
}

/** Append a moderation action the way the real write path does (event + decision row). */
async function recordModeration(
  t: TestApp,
  memberId: string,
  version: number,
  action: 'suspend' | 'terminate',
  reasonCode: string,
  pariwarId: string,
): Promise<void> {
  const eventType = action === 'suspend' ? 'member.moderation.suspended' : 'member.moderation.terminated';
  await t.pool.query(
    `INSERT INTO events_log (stream_id, event_type, payload, event_version, occurred_at, pariwar_id)
       VALUES ($1, $2, $3, $4, now() - interval '1 hour', $5)`,
    [memberId, eventType, JSON.stringify({ reason_code: reasonCode }), version, pariwarId],
  );
  await t.pool.query(
    `INSERT INTO member_moderation_actions
       (pariwar_id, member_id, action, reason_code, decision_note_ciphertext, actor_id, actor_display, rejoin_permitted_at, acted_at,
        escalation_inadequacy_ciphertext, escalation_proportionality_ciphertext)
       VALUES ($1, $2, $3::moderation_action, $4, 'enc:v1:test', $5, 'A Trustee', $6, now() - interval '1 hour' + ($7 || ' seconds')::interval,
        CASE WHEN $3 = 'terminate' THEN 'enc:v1:inadequacy' END,
        CASE WHEN $3 = 'terminate' THEN 'enc:v1:proportionality' END)`,
    [
      pariwarId,
      memberId,
      action,
      reasonCode,
      randomUUID(),
      action === 'terminate' ? new Date(Date.now() + 300 * 24 * 60 * 60 * 1000).toISOString() : null,
      String(version),
    ],
  );
}

/**
 * Enable `termination_access_block` for one Pariwar, written DIRECTLY.
 *
 * ⚠ Direct INSERT rather than the admin flip API, following this suite's own `recordModeration`
 * convention: the write path has its own coverage, and routing through it here would drag in the
 * AC7 transition ladder (a first flip may only go `off → canary`, and `canary` must name a cohort
 * clause) — three extra hops that test the flip API, not this gate. `state: 'full'` serves everyone,
 * so the cohort is irrelevant by construction. The code default owns `DEFAULT_FLAG_VERSION` (1);
 * persisted rows start at the version immediately after it — asserted, not just commented, so this
 * row cannot silently decouple from the registry's own numbering and become inert
 * (`flagVersionInForce` ignores a version it does not recognise as the chain head).
 */
async function enableBlockFor(t: TestApp, pariwarId: string): Promise<void> {
  const version = featureFlags.DEFAULT_FLAG_VERSION + 1;
  await t.pool.query(
    `INSERT INTO feature_flag_versions
       (flag_key, pariwar_id, version, cohort_definition, state, fallback_default, owner, dead_by,
        effective_from, effective_until, rationale)
     VALUES ($1, $2, $3, '{"clauses":[]}'::jsonb, 'full', false, 'trustee-panel', '2027-06-30',
             now() - interval '1 minute', NULL, 'AC12 test: block enabled')`,
    [FLAG, pariwarId, version],
  );
}

/** Drive OTP request → verify with a CORRECT code. */
async function verifyWithCorrectOtp(t: TestApp, mobile: string, deviceId: string): Promise<{ status: number; body: Json }> {
  const req = await post(t, `${BASE}/otp/request`, { mobile });
  expect(req.status).toBe(200);
  const code = t.stepUpDelivery.last?.code as string;
  // ⛔ The premise is EXPLICIT, not incidental. A test that supplied a WRONG OTP would pass for the
  // wrong reason and would keep passing after the block was deleted — it would be asserting that bad
  // credentials are refused, which no part of this story changed.
  expect(code).toMatch(/^\d{6}$/);
  return post(t, `${BASE}/otp/verify`, { mobile, otp: code, deviceId });
}

const liveRefreshRows = async (t: TestApp, memberId: string): Promise<number> =>
  (
    await t.pool.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM member_refresh_tokens WHERE member_id = $1 AND revoked_at IS NULL`,
      [memberId],
    )
  ).rows[0]?.n ?? 0;

const deviceRows = async (t: TestApp, memberId: string): Promise<number> =>
  (await t.pool.query<{ n: number }>(`SELECT count(*)::int AS n FROM member_trusted_devices WHERE member_id = $1`, [memberId]))
    .rows[0]?.n ?? 0;

/**
 * Every JWT-shaped string anywhere in a payload — the honest form of "nothing usable came back".
 *
 * ⚠ The `eyJ` prefix is LOAD-BEARING, not belt-and-braces. A first draft matched three dot-separated
 * `[A-Za-z0-9_-]` runs, which is also the exact shape of this story's own reason-label key
 * (`memberStatus.moderationReason.r14-forgery` — three segments, each ≥10 chars) and of most dotted
 * i18n keys. That false positive failed the assertion on a payload containing no credential at all.
 * A real JWT's first segment is base64url of a JSON header, so it necessarily begins `eyJ` (`{"`);
 * anchoring there separates a token from a namespaced key without weakening the scan.
 */
function jwtLikeStrings(value: unknown, found: string[] = []): string[] {
  if (typeof value === 'string') {
    if (/^eyJ[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}$/.test(value)) found.push(value);
    return found;
  }
  if (Array.isArray(value)) {
    for (const v of value) jwtLikeStrings(v, found);
    return found;
  }
  if (value !== null && typeof value === 'object') {
    for (const v of Object.values(value)) jwtLikeStrings(v, found);
  }
  return found;
}

describe.skipIf(!hasDatabase)('termination access — session issuance denial (live DB) (:5433)', () => {
  it('⭐ AC12: with the block ENABLED, identity verification succeeds and NO session and NO privileges are established', async () => {
    const pariwarId = randomUUID();
    const t = await createTestApp({ env: { DEFAULT_SIGNUP_PARIWAR_ID: pariwarId } });
    try {
      const mobile = randomMobile();
      const memberId = await seedMember(t, mobile, pariwarId);
      await recordModeration(t, memberId, 5, 'suspend', 'r14-forgery', pariwarId);
      await recordModeration(t, memberId, 6, 'terminate', 'r14-forgery', pariwarId);
      await enableBlockFor(t, pariwarId);

      const res = await verifyWithCorrectOtp(t, mobile, 'device-terminated');

      // ── The denial itself. The status code is transport; the CODE is the contract. ──────────────
      expect(res.status).toBe(403);
      const err = res.body.error as Json;
      expect(String(err?.code)).toBe('auth.member_terminated');
      // ⛔ NOT a reuse of `auth.member_withdrawn`: the caller proved possession of the OTP for this
      // mobile, so they ARE the member, and an honest code is what the member app renders.
      expect(String(err?.code)).not.toBe('auth.member_withdrawn');

      // ── (1) No session token of any kind came back ──────────────────────────────────────────────
      // Asserting "not 200" alone would pass even if a token were issued ALONGSIDE a 403.
      expect(res.body.accessToken).toBeUndefined();
      expect(res.body.refreshToken).toBeUndefined();
      expect(res.body.session).toBeUndefined();

      // ── (5) Nothing returned is usable as a credential ─────────────────────────────────────────
      // Closes the "it wasn't a session, it was just a token" reading: scan the WHOLE payload —
      // including the notice — for anything JWT-shaped, wherever a future edit might tuck it.
      expect(jwtLikeStrings(res.body)).toEqual([]);

      // ⭐ …and PROVEN, not just scanned for shape: a subsequent authenticated call, presenting
      // literally everything the response returned as the bearer credential, is refused. This is the
      // AC12 assertion the shape-scan above cannot make by itself — `jwtLikeStrings` proves no JWT
      // sits IN the payload; this proves the payload, taken whole, cannot BE used as one.
      const subsequentCall = await t.app.inject({
        method: 'GET',
        url: '/api/v1/member/lock-in-status',
        headers: { origin: 'http://localhost:3001', authorization: `Bearer ${JSON.stringify(res.body)}` },
      });
      expect(subsequentCall.statusCode).toBe(401);

      // ── (2) No server-side session state was created ────────────────────────────────────────────
      // A response-only assertion cannot see a write. These can.
      expect(await liveRefreshRows(t, memberId)).toBe(0);
      expect(await deviceRows(t, memberId)).toBe(0);

      // ── (3) `issueFullSession` did not run — asserted by its observable footprint ───────────────
      // See the header for why this is not a spy. Both lines fire immediately after a successful
      // issuance; neither can appear on a denied path.
      expect(t.auditSink.ofType('member_login.otp_consume')).toHaveLength(0);
      expect(t.auditSink.ofType('member_device.bound')).toHaveLength(0);

      // The denial IS audited, under a `terminated` reason that stays separable from the two
      // lifecycle reasons — `withdrawn` and `anonymized` — in any audit query keyed on it.
      const failures = t.auditSink.ofType('member_login.failure');
      expect(failures).toHaveLength(1);
      expect(JSON.stringify(failures[0])).toContain('terminated');
      // Masked mobile only — never plaintext, on a path that now carries a member-facing payload.
      expect(JSON.stringify(t.auditSink.events)).not.toContain(normalizeMobile(mobile) as string);

      // ── (4) The STRUCTURED payload is present — a controlled termination state, not a generic
      //        authentication failure (Decision `097` clause 8). ────────────────────────────────────
      const notice = err?.details as Json;
      expect(notice).toBeDefined();
      expect(notice?.decision).toBe('terminated');
      // The Ground reaches the member as a resolved LABEL KEY — never the raw reason code.
      expect(notice?.ground_label_key).toBe('memberStatus.moderationReason.r14-forgery');
      expect(String(notice?.ground_label_key)).not.toBe('r14-forgery');
      expect(typeof notice?.effective_at).toBe('string');
      // ⛔ Summary is STRUCTURALLY absent until Story 10.20 (Q2 option (a)) — never an empty string,
      // which a client would render as a blank line pretending to be prose.
      expect(notice?.summary).toEqual({ available: false });
      expect(notice?.summary).not.toBe('');
      // Honest about what exists TODAY: Story 10.21 has not landed, so there is no off-portal route.
      expect(notice?.further_communication).toEqual({
        channel: 'administrative_request',
        route_available: false,
      });

      // ⛔ No rationale, no reason CODE, no actor name ever reaches the member.
      const noticeJson = JSON.stringify(notice);
      expect(noticeJson).not.toContain('A Trustee');
      expect(noticeJson).not.toContain('enc:v1:test');
    } finally {
      await teardown(t);
    }
  });

  it('⚠ AC12: with the block at its SHIPPED DEFAULT (off), the member DOES receive a normal session', async () => {
    // This is not a courtesy test. Under Q6 sub-choice (b-i) the flag ships OFF and the flip is
    // gated on Story 10.21, so THIS is the shipped truth until the Trustee Panel authorises it.
    // ⛔ Asserting only the flag-ON behaviour while the default is OFF would be a FALSE GREEN: it
    // would prove the code path exists, not that termination ends access — and it would let the
    // default silently invert without a single test noticing.
    const pariwarId = randomUUID();
    const t = await createTestApp({ env: { DEFAULT_SIGNUP_PARIWAR_ID: pariwarId } });
    try {
      const mobile = randomMobile();
      const memberId = await seedMember(t, mobile, pariwarId);
      await recordModeration(t, memberId, 5, 'suspend', 'r14-forgery', pariwarId);
      await recordModeration(t, memberId, 6, 'terminate', 'r14-forgery', pariwarId);
      // No flag row written — the ABSENT configuration, which is what `fallbackDefault: false` must
      // resolve to. The block FAILS OPEN by ratified design (Decision `097` clause 7(ii)).

      const res = await verifyWithCorrectOtp(t, mobile, 'device-default-off');

      expect(res.status).toBe(200);
      expect(await liveRefreshRows(t, memberId)).toBeGreaterThan(0);
      expect(t.auditSink.ofType('member_login.otp_consume')).toHaveLength(1);
    } finally {
      await teardown(t);
    }
  });

  // ── AC5 — the refresh path, the SECOND read site ────────────────────────────────────────────────
  //
  // ⚠ Every test below terminates the member MID-SESSION, with the flag already enabled before
  // login. That ordering is deliberate on two counts. It is the real scenario AC5 exists for — a
  // member with a live app is terminated, and the refresh chain is what catches them. And it keeps
  // the flag state CONSTANT across the test: the lookup is memoized for 5s, so flipping mid-test
  // would race the cache, while the overlay read is uncached and sees the termination immediately.

  it('⭐ AC5: a member terminated MID-SESSION is denied on refresh, with the same code and notice as login', async () => {
    const pariwarId = randomUUID();
    const t = await createTestApp({ env: { DEFAULT_SIGNUP_PARIWAR_ID: pariwarId } });
    try {
      const mobile = randomMobile();
      const memberId = await seedMember(t, mobile, pariwarId);
      await enableBlockFor(t, pariwarId);

      // Active member, block enabled → a normal session. The block is not a blanket gate.
      const login = await verifyWithCorrectOtp(t, mobile, 'device-midsession');
      expect(login.status).toBe(200);
      const refreshToken = login.body.refreshToken as string;
      expect(typeof refreshToken).toBe('string');
      expect(await liveRefreshRows(t, memberId)).toBeGreaterThan(0);

      // …then the trustee terminates them, while that session is still live.
      await recordModeration(t, memberId, 5, 'suspend', 'r14-forgery', pariwarId);
      await recordModeration(t, memberId, 6, 'terminate', 'r14-forgery', pariwarId);

      const res = await post(t, `${BASE}/token/refresh`, { refreshToken });

      // ⛔ Without this gate the member would keep rotating refresh tokens indefinitely and never
      // re-authenticate — the block would be green at login and absent in production for exactly
      // the members it targets.
      expect(res.status).toBe(403);
      const err = res.body.error as Json;
      // AC5's correction: this previously reported `auth.member_withdrawn` / "Member is not active"
      // for EVERY blocked cause, telling a terminated member something false about their account.
      expect(String(err?.code)).toBe('auth.member_terminated');
      expect(String(err?.code)).not.toBe('auth.member_withdrawn');

      // The SAME structured payload as the login gate, so the member-app surface renders identically
      // whichever path reached it — a refresh denial is where a live app hits the block FIRST.
      const notice = err?.details as Json;
      expect(notice?.decision).toBe('terminated');
      expect(notice?.ground_label_key).toBe('memberStatus.moderationReason.r14-forgery');
      expect(notice?.summary).toEqual({ available: false });

      // The device chain is revoked, so the denial is terminal rather than a retryable blip.
      expect(await liveRefreshRows(t, memberId)).toBe(0);
      const revoked = t.auditSink.ofType('member_session.revoked');
      expect(revoked).toHaveLength(1);
      // `reason` stays the stable `member_blocked` key existing queries grep for; `cause` is what
      // makes a terminated denial separable from a withdrawn one.
      expect(JSON.stringify(revoked[0])).toContain('member_blocked');
      expect(JSON.stringify(revoked[0])).toContain('terminated');

      // Nothing usable came back on this path either.
      expect(res.body.accessToken).toBeUndefined();
      expect(res.body.refreshToken).toBeUndefined();
      expect(jwtLikeStrings(res.body)).toEqual([]);
    } finally {
      await teardown(t);
    }
  });

  it('⚠ AC5: with the block at its SHIPPED DEFAULT (off), a terminated member still refreshes', async () => {
    // The flag-OFF half of the pair, for the same reason as at login: under Q6 (b-i) this is the
    // shipped truth until Story 10.21 lands, and asserting only the flag-ON side would let the
    // default invert without a single test noticing.
    const pariwarId = randomUUID();
    const t = await createTestApp({ env: { DEFAULT_SIGNUP_PARIWAR_ID: pariwarId } });
    try {
      const mobile = randomMobile();
      const memberId = await seedMember(t, mobile, pariwarId);
      const login = await verifyWithCorrectOtp(t, mobile, 'device-midsession-off');
      expect(login.status).toBe(200);
      const refreshToken = login.body.refreshToken as string;

      await recordModeration(t, memberId, 5, 'suspend', 'r14-forgery', pariwarId);
      await recordModeration(t, memberId, 6, 'terminate', 'r14-forgery', pariwarId);

      const res = await post(t, `${BASE}/token/refresh`, { refreshToken });
      expect(res.status).toBe(200);
      expect(typeof res.body.refreshToken).toBe('string');
    } finally {
      await teardown(t);
    }
  });

  it('⚠ AC5: a WITHDRAWN member still reports auth.member_withdrawn — the cause switch is not a rename', async () => {
    // The regression guard on AC5's correction. Adding `cause` and switching on it must not
    // reclassify the pre-existing lifecycle block: a withdrawn member's code, message and audit
    // line are unchanged, and no termination notice is attached to a non-termination cause.
    const pariwarId = randomUUID();
    const t = await createTestApp({ env: { DEFAULT_SIGNUP_PARIWAR_ID: pariwarId } });
    try {
      const mobile = randomMobile();
      const memberId = await seedMember(t, mobile, pariwarId);
      await enableBlockFor(t, pariwarId);
      const login = await verifyWithCorrectOtp(t, mobile, 'device-withdrawn');
      expect(login.status).toBe(200);
      const refreshToken = login.body.refreshToken as string;

      // Withdrawal is a LIFECYCLE state, not a moderation overlay — a different mechanism entirely.
      // ⚠ The event is `member.withdrawal_completed` (`domain/member/state.ts:152`), NOT
      // `member.withdrawn`; the state is named `withdrawn` but no event carries that name, and an
      // unrecognised type replays to no transition at all — leaving the member `active` and this
      // test passing a 200 while appearing to assert a block.
      // ⚠ `occurred_at` is backdated because `getMemberStateAt` is bounded by the INJECTED APP clock
      // while `now()` is the DB clock; under app-behind-DB skew a same-instant event falls outside
      // the window and is silently skipped (`moderation/overlay.ts:132-149` documents the same trap).
      await t.pool.query(
        `INSERT INTO events_log (stream_id, event_type, payload, event_version, occurred_at, pariwar_id)
           VALUES ($1, 'member.withdrawal_completed', '{}'::jsonb, 5, now() - interval '1 minute', $2)`,
        [memberId, pariwarId],
      );

      const res = await post(t, `${BASE}/token/refresh`, { refreshToken });
      expect(res.status).toBe(403);
      const err = res.body.error as Json;
      expect(String(err?.code)).toBe('auth.member_withdrawn');
      expect(String(err?.code)).not.toBe('auth.member_terminated');
      // ⛔ No termination notice rides a withdrawal — the payload is only for the terminated cause.
      expect(err?.details).toBeUndefined();
      expect(await liveRefreshRows(t, memberId)).toBe(0);
    } finally {
      await teardown(t);
    }
  });

  it('⚠ AC7 guard: a SUSPENDED member keeps their session even with the block ENABLED', async () => {
    // D5 requirement 3 — a suspended member is CURING and needs the contribution surface, where
    // Story 10.16's disclosure lives. `moderationDeniesSession` returns `false` for `suspended`
    // deliberately. Asserted with the flag ON, because that is the only state in which the
    // exhaustive switch is actually consulted — with the flag off this would pass vacuously.
    const pariwarId = randomUUID();
    const t = await createTestApp({ env: { DEFAULT_SIGNUP_PARIWAR_ID: pariwarId } });
    try {
      const mobile = randomMobile();
      const memberId = await seedMember(t, mobile, pariwarId);
      await recordModeration(t, memberId, 5, 'suspend', 'r7-contribution-discipline', pariwarId);
      await enableBlockFor(t, pariwarId);

      const res = await verifyWithCorrectOtp(t, mobile, 'device-suspended');

      expect(res.status).toBe(200);
      expect(await liveRefreshRows(t, memberId)).toBeGreaterThan(0);
    } finally {
      await teardown(t);
    }
  });
});
