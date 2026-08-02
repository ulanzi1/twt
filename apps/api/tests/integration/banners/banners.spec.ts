// Banner/Popup admin + member surfaces — E2E (Story 10.9; AC1/AC3/AC4/AC5/AC6/AC7/AC9). (:5433)
//
// Proves both surfaces against real Postgres:
//   · AC7 RBAC revert-sanity PAIR — pariwar_admin (holds banner.manage) → 200 on the list; an auditor
//     (Pariwar grant, NO key) → fail-closed 403; district_admin → 403 (DEFERRED, never granted).
//   · AC1 workflow — create (201) → publish (200) → retract (200); an illegal transition (re-publish
//     a published banner, act on a retracted one) → typed 409 BEFORE any write (a no-op never 200s).
//   · AC6 tone gate — publish BY the banner's own author → 409 with the status unchanged; publish by
//     a NON-author → 200. A missing Hindi field → 422 at publish.
//   · AC4 — an undismissable popup → 422 at create AND at update; a non-dismissible BANNER is fine.
//   · AC2 — the derived-display-state list filter; `scheduled` is not `live`.
//   · AC3 member surface — the resolved banner+popup read, dismissal suppression, the
//     re-surface-after-revision case, cross-member isolation, and the idempotent dismiss replay.
//   · AC7 member auth — a `:pariwarId` that is not the member's own is a 404, NOT a 403.
//
// ⚠ Own-committing seed writes; a fresh random pariwarId per test; users/role_grants cleaned in
// afterAll. Assert MEMBERSHIP, not counts ([[project_live_db_test_gotchas]]).

import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { AppDeps } from '../../../src/context.js';
import * as service from '../../../src/modules/auth/admin/admin-auth.service.js';
import { signAccessToken } from '../../../src/modules/auth/member/tokens.js';
import { createTestApp, hasDatabase, makeClient, teardown, type TestApp } from '../_setup.js';
import { FakeWebAuthnProvider } from '../_webauthn-fake.js';

type Client = ReturnType<typeof makeClient>;
type Json = Record<string, unknown>;

const ACCESS_TTL_MS = 15 * 60 * 1000;

// A window that is comfortably OPEN at real wall-clock `now` — the handlers inject `deps.clock()`,
// which is the real clock in the test app, so the fixture window must straddle it rather than pin a
// fixed instant.
const OPEN_FROM = new Date(Date.now() - 60 * 60 * 1000).toISOString();
const OPEN_UNTIL = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
// A window that has not started yet — used for the `scheduled` derived state.
const FUTURE_FROM = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
const FUTURE_UNTIL = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

describe.skipIf(!hasDatabase)('banner/popup admin + member surfaces — E2E (:5433)', () => {
  let t: TestApp;
  let deps: AppDeps;
  let fakeWebauthn: FakeWebAuthnProvider;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    fakeWebauthn = new FakeWebAuthnProvider();
    t = await createTestApp({ webauthn: fakeWebauthn });
    deps = t.deps;
  });

  afterAll(async () => {
    const c = await t.pool.connect();
    try {
      if (createdUserIds.length > 0) {
        await c.query(`DELETE FROM admin_sessions WHERE sess ->> 'userId' = ANY($1)`, [createdUserIds]);
        await c.query(`DELETE FROM role_grants WHERE user_id = ANY($1)`, [createdUserIds]);
        await c.query(`DELETE FROM users WHERE id = ANY($1)`, [createdUserIds]);
      }
    } finally {
      c.release();
    }
    await teardown(t);
  });

  async function authenticate(displayName: string): Promise<{ client: Client; userId: string }> {
    const email = `banner-${randomUUID()}@example.test`;
    const password = 'CorrectHorseBatteryStaple9';
    const userId = await service.createAdminAccount(deps, { email, password, displayName });
    createdUserIds.push(userId);
    const credentialId = `cred-${userId}`;
    fakeWebauthn.nextRegistration = { verified: true, credential: { id: credentialId, publicKey: 'pk', counter: 0 } };
    fakeWebauthn.nextAuthentication = { verified: true, newCounter: 1 };
    const client = makeClient(t.app);
    const enroll = service.mintEnrollmentToken(deps, userId);
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/register/options', payload: { enrollmentToken: enroll } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/register/verify', payload: { response: { id: 'b' }, enrollmentToken: enroll } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email, password } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/authenticate/options', payload: {} });
    const verify = await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/authenticate/verify', payload: { response: { id: credentialId } } });
    expect(verify.statusCode).toBe(200);
    return { client, userId };
  }

  async function grant(userId: string, pariwarId: string, role: string): Promise<void> {
    const c = await t.pool.connect();
    try {
      await c.query(
        `INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value) VALUES ($1, $2, $3, $4, $5)`,
        [userId, pariwarId, role, 'pariwar', pariwarId],
      );
    } finally {
      c.release();
    }
  }

  /** Two DISTINCT pariwar_admins in one tenant — the tone gate needs a non-author publisher. */
  async function twoAdmins(pariwarId: string): Promise<{ author: Client; reviewer: Client }> {
    const a = await authenticate('Banner Author');
    const b = await authenticate('Banner Reviewer');
    await grant(a.userId, pariwarId, 'pariwar_admin');
    await grant(b.userId, pariwarId, 'pariwar_admin');
    return { author: a.client, reviewer: b.client };
  }

  function bannerBody(overrides: Partial<Json> = {}): Json {
    return {
      title: 'Maintenance window',
      body: 'The app is unavailable 02:00–03:00 IST.',
      title_hi: 'रखरखाव अवधि',
      body_hi: 'ऐप 02:00–03:00 IST तक उपलब्ध नहीं रहेगा।',
      audience_scope: 'members-all',
      valid_from: OPEN_FROM,
      valid_until: OPEN_UNTIL,
      display_mode: 'banner',
      dismissible: true,
      severity: 'info',
      ...overrides,
    };
  }

  async function createBanner(client: Client, p: string, overrides: Partial<Json> = {}): Promise<string> {
    const res = await client.inject({ method: 'POST', url: `/api/v1/p/${p}/banners`, payload: bannerBody(overrides) });
    expect(res.statusCode).toBe(201);
    return (res.json() as { banner_id: string }).banner_id;
  }

  /** Create as the author, publish as the reviewer (the non-author the tone gate requires). */
  async function publishedBanner(
    admins: { author: Client; reviewer: Client },
    p: string,
    overrides: Partial<Json> = {},
  ): Promise<string> {
    const id = await createBanner(admins.author, p, overrides);
    const res = await admins.reviewer.inject({ method: 'POST', url: `/api/v1/p/${p}/banners/${id}/publish`, payload: {} });
    expect(res.statusCode).toBe(200);
    return id;
  }

  function memberToken(memberId: string, pariwarId: string): string {
    return signAccessToken(t.app, { memberId, pariwarId, deviceId: 'test-device' }, ACCESS_TTL_MS);
  }

  async function memberBanners(tok: string, p: string): Promise<{ status: number; body: Json }> {
    const res = await t.app.inject({
      method: 'GET',
      url: `/api/v1/p/${p}/member/banners`,
      headers: { authorization: `Bearer ${tok}`, origin: 'http://localhost:3001' },
    });
    return { status: res.statusCode, body: safeJson(res) };
  }

  async function dismiss(
    tok: string,
    p: string,
    bannerId: string,
    kind: 'dismissed' | 'shown' = 'dismissed',
  ): Promise<{ status: number; body: Json }> {
    const res = await t.app.inject({
      method: 'POST',
      url: `/api/v1/p/${p}/member/banners/${bannerId}/dismiss`,
      payload: { kind },
      headers: { authorization: `Bearer ${tok}`, origin: 'http://localhost:3001' },
    });
    return { status: res.statusCode, body: safeJson(res) };
  }

  function safeJson(res: { json: () => unknown }): Json {
    try {
      return res.json() as Json;
    } catch {
      return {};
    }
  }

  // ── AC7 — the RBAC revert-sanity pair + the district deferral pin (on the list read) ────────────
  it('AC7 with-key: pariwar_admin (holds banner.manage) → 200 on the list', async () => {
    const p = randomUUID();
    const a = await authenticate('Admin');
    await grant(a.userId, p, 'pariwar_admin');
    const res = await a.client.inject({ method: 'GET', url: `/api/v1/p/${p}/banners` });
    expect(res.statusCode).toBe(200);
  });

  it('AC7 without-key: an auditor (Pariwar grant, no banner.manage) → fail-closed 403', async () => {
    const p = randomUUID();
    const a = await authenticate('Auditor');
    await grant(a.userId, p, 'auditor');
    const res = await a.client.inject({ method: 'GET', url: `/api/v1/p/${p}/banners` });
    expect(res.statusCode).toBe(403);
  });

  it('AC7 deferral pin: district_admin is DENIED the list (never granted banner.manage)', async () => {
    const p = randomUUID();
    const a = await authenticate('District Admin');
    await grant(a.userId, p, 'district_admin');
    const res = await a.client.inject({ method: 'GET', url: `/api/v1/p/${p}/banners` });
    expect(res.statusCode).toBe(403);
  });

  it('AC7: every WRITE route is gated too, not just the read', async () => {
    const p = randomUUID();
    const a = await authenticate('Auditor Write');
    await grant(a.userId, p, 'auditor');
    const create = await a.client.inject({ method: 'POST', url: `/api/v1/p/${p}/banners`, payload: bannerBody() });
    expect(create.statusCode).toBe(403);
    const fake = randomUUID();
    for (const url of [`/api/v1/p/${p}/banners/${fake}/publish`, `/api/v1/p/${p}/banners/${fake}/retract`]) {
      expect((await a.client.inject({ method: 'POST', url, payload: {} })).statusCode).toBe(403);
    }
    expect(
      (await a.client.inject({ method: 'PATCH', url: `/api/v1/p/${p}/banners/${fake}`, payload: { severity: 'critical' } }))
        .statusCode,
    ).toBe(403);
  });

  // ── AC1 — the lifecycle + the pre-write legality guard ──────────────────────────────────────────
  it('AC1: create → publish → retract, with the derived display_state on every response', async () => {
    const p = randomUUID();
    const admins = await twoAdmins(p);

    const created = await admins.author.inject({ method: 'POST', url: `/api/v1/p/${p}/banners`, payload: bannerBody() });
    expect(created.statusCode).toBe(201);
    const draft = created.json() as Json;
    expect(draft.status).toBe('draft');
    expect(draft.display_state).toBe('draft');
    expect(draft.revision).toBe(1);

    const published = await admins.reviewer.inject({
      method: 'POST',
      url: `/api/v1/p/${p}/banners/${draft.banner_id as string}/publish`,
      payload: {},
    });
    expect(published.statusCode).toBe(200);
    const pub = published.json() as Json;
    expect(pub.status).toBe('published');
    // The window straddles `now`, so the DERIVED state is `live` — nothing ran to make it so.
    expect(pub.display_state).toBe('live');
    expect(pub.tone_signoff_content_hash).toMatch(/^[0-9a-f]{64}$/);

    const retracted = await admins.author.inject({
      method: 'POST',
      url: `/api/v1/p/${p}/banners/${draft.banner_id as string}/retract`,
      payload: {},
    });
    expect(retracted.statusCode).toBe(200);
    expect((retracted.json() as Json).display_state).toBe('retracted');
  });

  it('AC1: an ILLEGAL transition is a typed 409 BEFORE any write (a no-op never becomes a 200)', async () => {
    const p = randomUUID();
    const admins = await twoAdmins(p);
    const id = await publishedBanner(admins, p);

    const rePublish = await admins.reviewer.inject({ method: 'POST', url: `/api/v1/p/${p}/banners/${id}/publish`, payload: {} });
    expect(rePublish.statusCode).toBe(409);
    expect((rePublish.json() as { error: { code: string } }).error.code).toBe('banner.invalid_state');

    await admins.author.inject({ method: 'POST', url: `/api/v1/p/${p}/banners/${id}/retract`, payload: {} });
    // Retracted is terminal: retract again, publish again, and edit all 409.
    expect((await admins.author.inject({ method: 'POST', url: `/api/v1/p/${p}/banners/${id}/retract`, payload: {} })).statusCode).toBe(409);
    expect((await admins.reviewer.inject({ method: 'POST', url: `/api/v1/p/${p}/banners/${id}/publish`, payload: {} })).statusCode).toBe(409);
    expect(
      (await admins.author.inject({ method: 'PATCH', url: `/api/v1/p/${p}/banners/${id}`, payload: { severity: 'critical' } }))
        .statusCode,
    ).toBe(409);
  });

  it('AC1: an unknown banner id is a 404 (not a 500)', async () => {
    const p = randomUUID();
    const a = await authenticate('Admin 404');
    await grant(a.userId, p, 'pariwar_admin');
    const res = await a.client.inject({ method: 'GET', url: `/api/v1/p/${p}/banners/${randomUUID()}` });
    expect(res.statusCode).toBe(404);
    expect((res.json() as { error: { code: string } }).error.code).toBe('banner.not_found');
  });

  // ── AC6 — the tone-review gate ──────────────────────────────────────────────────────────────────
  it('AC6: the banner’s OWN AUTHOR cannot publish it (409); a non-author can (200)', async () => {
    const p = randomUUID();
    const admins = await twoAdmins(p);
    const id = await createBanner(admins.author, p);

    const byAuthor = await admins.author.inject({ method: 'POST', url: `/api/v1/p/${p}/banners/${id}/publish`, payload: {} });
    expect(byAuthor.statusCode).toBe(409);
    // The status is UNCHANGED — a denied publish writes nothing.
    const afterDeny = await admins.author.inject({ method: 'GET', url: `/api/v1/p/${p}/banners/${id}` });
    expect((afterDeny.json() as Json).status).toBe('draft');

    const byReviewer = await admins.reviewer.inject({ method: 'POST', url: `/api/v1/p/${p}/banners/${id}/publish`, payload: {} });
    expect(byReviewer.statusCode).toBe(200);
  });

  it('AC6: publishing without all four copy fields → 422 naming the missing field', async () => {
    const p = randomUUID();
    const admins = await twoAdmins(p);
    const id = await createBanner(admins.author, p, { body_hi: null });
    const res = await admins.reviewer.inject({ method: 'POST', url: `/api/v1/p/${p}/banners/${id}/publish`, payload: {} });
    expect(res.statusCode).toBe(422);
    const err = res.json() as { error: { code: string; details: { missing: string[] } } };
    expect(err.error.code).toBe('banner.bilingual_required');
    expect(err.error.details.missing).toContain('body_hi');
  });

  // ── AC4 — "no member trapped" ───────────────────────────────────────────────────────────────────
  it('AC4: an undismissable popup → 422 at create; a non-dismissible BANNER is permitted', async () => {
    const p = randomUUID();
    const a = await authenticate('Popup Admin');
    await grant(a.userId, p, 'pariwar_admin');

    const bad = await a.client.inject({
      method: 'POST',
      url: `/api/v1/p/${p}/banners`,
      payload: bannerBody({ display_mode: 'popup', dismissible: false }),
    });
    expect(bad.statusCode).toBe(422);
    expect((bad.json() as { error: { code: string } }).error.code).toBe('banner.popup_must_be_dismissible');

    const ok = await a.client.inject({
      method: 'POST',
      url: `/api/v1/p/${p}/banners`,
      payload: bannerBody({ display_mode: 'banner', dismissible: false }),
    });
    expect(ok.statusCode).toBe(201);
  });

  it('AC4: a PATCH that would produce an undismissable popup → 422 (checked on the MERGED row)', async () => {
    const p = randomUUID();
    const a = await authenticate('Popup Patch Admin');
    await grant(a.userId, p, 'pariwar_admin');
    const id = await createBanner(a.client, p, { display_mode: 'banner', dismissible: false });
    const res = await a.client.inject({
      method: 'PATCH',
      url: `/api/v1/p/${p}/banners/${id}`,
      payload: { display_mode: 'popup' },
    });
    expect(res.statusCode).toBe(422);
    expect((res.json() as { error: { code: string } }).error.code).toBe('banner.popup_must_be_dismissible');
  });

  it('AC2: an empty window → 422 at create', async () => {
    const p = randomUUID();
    const a = await authenticate('Window Admin');
    await grant(a.userId, p, 'pariwar_admin');
    const res = await a.client.inject({
      method: 'POST',
      url: `/api/v1/p/${p}/banners`,
      payload: bannerBody({ valid_from: OPEN_UNTIL, valid_until: OPEN_FROM }),
    });
    expect(res.statusCode).toBe(422);
    expect((res.json() as { error: { code: string } }).error.code).toBe('banner.window_invalid');
  });

  // ── AC2 — the DERIVED display-state filter ──────────────────────────────────────────────────────
  it('AC2: the list filters on the DERIVED display state; a future window reads `scheduled`, not `live`', async () => {
    const p = randomUUID();
    const admins = await twoAdmins(p);
    const live = await publishedBanner(admins, p);
    const future = await publishedBanner(admins, p, { valid_from: FUTURE_FROM, valid_until: FUTURE_UNTIL });
    const draft = await createBanner(admins.author, p);

    const idsIn = async (displayState: string): Promise<string[]> => {
      const res = await admins.author.inject({ method: 'GET', url: `/api/v1/p/${p}/banners?display_state=${displayState}` });
      expect(res.statusCode).toBe(200);
      return (res.json() as { items: Json[] }).items.map((i) => i.banner_id as string);
    };

    expect(await idsIn('live')).toContain(live);
    expect(await idsIn('live')).not.toContain(future);
    expect(await idsIn('scheduled')).toContain(future);
    expect(await idsIn('draft')).toContain(draft);
  });

  // ── Decision 5 — the content-hash edit branch ───────────────────────────────────────────────────
  it('Decision 5: a WINDOW-ONLY edit needs no re-review and does NOT bump revision', async () => {
    const p = randomUUID();
    const admins = await twoAdmins(p);
    const id = await publishedBanner(admins, p);
    // The AUTHOR may make this edit — no copy changed, so no non-author reviewer is required.
    const res = await admins.author.inject({
      method: 'PATCH',
      url: `/api/v1/p/${p}/banners/${id}`,
      payload: { valid_until: FUTURE_UNTIL, display_once_per_member: true },
    });
    expect(res.statusCode).toBe(200);
    const row = res.json() as Json;
    expect(row.revision).toBe(1);
    expect(row.display_once_per_member).toBe(true);
  });

  it('Decision 5: a COPY edit on a published banner by its AUTHOR is 409; by a NON-author it bumps revision', async () => {
    const p = randomUUID();
    const admins = await twoAdmins(p);
    const id = await publishedBanner(admins, p);

    const byAuthor = await admins.author.inject({
      method: 'PATCH',
      url: `/api/v1/p/${p}/banners/${id}`,
      payload: { body: 'Now 02:00–04:00 IST.' },
    });
    expect(byAuthor.statusCode).toBe(409);
    // Nothing was written.
    const unchanged = await admins.author.inject({ method: 'GET', url: `/api/v1/p/${p}/banners/${id}` });
    expect((unchanged.json() as Json).revision).toBe(1);

    const byReviewer = await admins.reviewer.inject({
      method: 'PATCH',
      url: `/api/v1/p/${p}/banners/${id}`,
      payload: { body: 'Now 02:00–04:00 IST.' },
    });
    expect(byReviewer.statusCode).toBe(200);
    expect((byReviewer.json() as Json).revision).toBe(2);
  });

  // ── AC3 / AC5 / AC7 — the MEMBER surface ────────────────────────────────────────────────────────
  it('AC5: the member read returns a RESOLVED banner AND popup at once (independent lanes)', async () => {
    const p = randomUUID();
    const admins = await twoAdmins(p);
    await publishedBanner(admins, p, { severity: 'info', display_mode: 'banner' });
    await publishedBanner(admins, p, { severity: 'critical', display_mode: 'banner' });
    await publishedBanner(admins, p, { severity: 'critical', display_mode: 'popup', dismissible: true });

    const memberId = randomUUID();
    const res = await memberBanners(memberToken(memberId, p), p);
    expect(res.status).toBe(200);
    const banner = res.body.banner as Json | null;
    const popup = res.body.popup as Json | null;
    // Both lanes are filled, and the critical banner beat the info one.
    expect(banner?.severity).toBe('critical');
    expect(banner?.display_mode).toBe('banner');
    expect(popup?.display_mode).toBe('popup');
  });

  it('AC3: the member DTO leaks no workflow/attribution fields', async () => {
    const p = randomUUID();
    const admins = await twoAdmins(p);
    await publishedBanner(admins, p);
    const res = await memberBanners(memberToken(randomUUID(), p), p);
    const banner = res.body.banner as Json;
    for (const leaked of [
      'pariwar_id',
      'created_by_actor_id',
      'tone_signoff_content_hash',
      'tone_signoff_reviewed_by',
      'audience_scope',
      'audience_scope_value',
      'status',
    ]) {
      expect(banner).not.toHaveProperty(leaked);
    }
  });

  it('AC3: dismissing suppresses for THAT member only, and a copy revision re-surfaces it', async () => {
    const p = randomUUID();
    const admins = await twoAdmins(p);
    const id = await publishedBanner(admins, p);
    const alice = memberToken(randomUUID(), p);
    const bob = memberToken(randomUUID(), p);

    expect(((await memberBanners(alice, p)).body.banner as Json).banner_id).toBe(id);

    const d = await dismiss(alice, p, id);
    expect(d.status).toBe(200);
    expect(d.body.dismissed_revision).toBe(1);

    expect((await memberBanners(alice, p)).body.banner).toBeNull();
    // Bob is untouched — the suppression is per-member, not global.
    expect(((await memberBanners(bob, p)).body.banner as Json).banner_id).toBe(id);

    // A window-only edit must NOT bring it back for Alice…
    await admins.author.inject({ method: 'PATCH', url: `/api/v1/p/${p}/banners/${id}`, payload: { valid_until: FUTURE_UNTIL } });
    expect((await memberBanners(alice, p)).body.banner).toBeNull();

    // …but a COPY revision must (AC3's "unless updated").
    const revised = await admins.reviewer.inject({
      method: 'PATCH',
      url: `/api/v1/p/${p}/banners/${id}`,
      payload: { body: 'Revised copy — please re-read.' },
    });
    expect((revised.json() as Json).revision).toBe(2);
    expect(((await memberBanners(alice, p)).body.banner as Json).banner_id).toBe(id);
  });

  it('AC3: the dismiss write is IDEMPOTENT — a replay is a clean 200, never a 500 or a duplicate', async () => {
    const p = randomUUID();
    const admins = await twoAdmins(p);
    const id = await publishedBanner(admins, p);
    const alice = memberToken(randomUUID(), p);

    const first = await dismiss(alice, p, id);
    const replay = await dismiss(alice, p, id);
    expect(first.status).toBe(200);
    expect(replay.status).toBe(200);
    expect(replay.body.dismissed_revision).toBe(first.body.dismissed_revision);
    expect((await memberBanners(alice, p)).body.banner).toBeNull();
  });

  it('AC3: a `shown` acknowledgement suppresses a display-once popup identically', async () => {
    const p = randomUUID();
    const admins = await twoAdmins(p);
    const id = await publishedBanner(admins, p, {
      display_mode: 'popup',
      dismissible: true,
      display_once_per_member: true,
    });
    const alice = memberToken(randomUUID(), p);
    expect(((await memberBanners(alice, p)).body.popup as Json).banner_id).toBe(id);

    const ack = await dismiss(alice, p, id, 'shown');
    expect(ack.status).toBe(200);
    expect(ack.body.kind).toBe('shown');
    expect((await memberBanners(alice, p)).body.popup).toBeNull();
  });

  it('AC7: a member reading ANOTHER Pariwar’s banners gets 404, NOT 403 (no tenant-existence oracle)', async () => {
    const own = randomUUID();
    const other = randomUUID();
    const tok = memberToken(randomUUID(), own);
    expect((await memberBanners(tok, other)).status).toBe(404);
    expect((await dismiss(tok, other, randomUUID())).status).toBe(404);
  });

  it('AC7: the member routes require a member session (401 without one) and carry NO RBAC key', async () => {
    const p = randomUUID();
    const res = await t.app.inject({
      method: 'GET',
      url: `/api/v1/p/${p}/member/banners`,
      headers: { origin: 'http://localhost:3001' },
    });
    expect(res.statusCode).toBe(401);

    // …and a member with a VALID session needs no grant at all: an empty tenant answers 200 with
    // both lanes null, not 403.
    const ok = await memberBanners(memberToken(randomUUID(), p), p);
    expect(ok.status).toBe(200);
    expect(ok.body).toEqual({ banner: null, popup: null });
  });

  it('AC3: dismissing a banner that does not exist in this tenant is a 404, not a 500', async () => {
    const p = randomUUID();
    const res = await dismiss(memberToken(randomUUID(), p), p, randomUUID());
    expect(res.status).toBe(404);
    expect((res.body as { error: { code: string } }).error.code).toBe('banner.not_found');
  });

  it('Decision 4: a `cohort`-audience banner is published + listed for admins but visible to NOBODY', async () => {
    const p = randomUUID();
    const admins = await twoAdmins(p);
    const id = await publishedBanner(admins, p, { audience_scope: 'cohort', audience_scope_value: 'lock-in-2026' });

    const adminList = await admins.author.inject({ method: 'GET', url: `/api/v1/p/${p}/banners?display_state=live` });
    expect((adminList.json() as { items: Json[] }).items.map((i) => i.banner_id)).toContain(id);

    const member = await memberBanners(memberToken(randomUUID(), p), p);
    expect(member.body).toEqual({ banner: null, popup: null });
  });

  it('AC2: a banner whose window has not opened is invisible to members with nothing having run', async () => {
    const p = randomUUID();
    const admins = await twoAdmins(p);
    await publishedBanner(admins, p, { valid_from: FUTURE_FROM, valid_until: FUTURE_UNTIL });
    const res = await memberBanners(memberToken(randomUUID(), p), p);
    expect(res.body).toEqual({ banner: null, popup: null });
  });

  it('AC1: a retracted banner disappears from the member surface immediately', async () => {
    const p = randomUUID();
    const admins = await twoAdmins(p);
    const id = await publishedBanner(admins, p);
    const alice = memberToken(randomUUID(), p);
    expect(((await memberBanners(alice, p)).body.banner as Json).banner_id).toBe(id);

    await admins.author.inject({ method: 'POST', url: `/api/v1/p/${p}/banners/${id}/retract`, payload: {} });
    expect((await memberBanners(alice, p)).body.banner).toBeNull();
  });
});
