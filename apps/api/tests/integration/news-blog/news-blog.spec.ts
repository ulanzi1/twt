// News/Blog admin surface — E2E (Story 10.5; AC1/AC2/AC3/AC5/AC6/AC7). (:5433)
//
// Proves the authoring surface against real Postgres:
//   · AC6 RBAC revert-sanity PAIR — pariwar_admin (holds news.manage) → 200 on the list; an auditor
//     (Pariwar grant, NO key) → fail-closed 403; district_admin → 403 (deferred, never granted).
//   · AC2 workflow + author≠reviewer — create (201) → submit (200) → approve (200) → publish (200);
//     submit with reviewer_id == author → 403; approve BY the author → 403; an illegal transition
//     (approve a draft) → typed 409 before any write.
//   · AC7 bilingual — a public post missing hi copy → 422 at submit.
//   · AC3/AC5 — approve records the tone_review.signoff (fixture sink); publish enqueues the immediate
//     NEWS_PUBLISH fan-out job; schedule enqueues a DELAYED one (the worker owns the fan-out).
//
// ⚠ Own-committing seed writes; fresh random pariwarId per test; users/role_grants cleaned in afterAll.

import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { AppDeps } from '../../../src/context.js';
import * as service from '../../../src/modules/auth/admin/admin-auth.service.js';
import { createTestApp, hasDatabase, makeClient, teardown, type TestApp } from '../_setup.js';
import { FakeWebAuthnProvider } from '../_webauthn-fake.js';

type Client = ReturnType<typeof makeClient>;
type Json = Record<string, unknown>;

describe.skipIf(!hasDatabase)('news/blog admin surface — E2E (:5433)', () => {
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
    const email = `news-${randomUUID()}@example.test`;
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

  function draftBody(overrides: Partial<Json> = {}): Json {
    return {
      title: 'Welcome',
      body_markdown: '# hello',
      title_hi: 'स्वागत',
      body_markdown_hi: '# नमस्ते',
      audience_scope: 'members-all',
      channels: ['push', 'sms'],
      ...overrides,
    };
  }

  async function createDraft(client: Client, p: string, overrides: Partial<Json> = {}): Promise<string> {
    const res = await client.inject({ method: 'POST', url: `/api/v1/p/${p}/news`, payload: draftBody(overrides) });
    expect(res.statusCode).toBe(201);
    return (res.json() as { post_id: string }).post_id;
  }

  // ── AC6 — the RBAC revert-sanity pair + district deferral pin (on the list read) ──────────────────
  it('AC6 with-key: pariwar_admin (holds news.manage) → 200 on the list', async () => {
    const p = randomUUID();
    const a = await authenticate('Author');
    await grant(a.userId, p, 'pariwar_admin');
    const res = await a.client.inject({ method: 'GET', url: `/api/v1/p/${p}/news` });
    expect(res.statusCode).toBe(200);
  });

  it('AC6 without-key: an auditor (Pariwar grant, no news.manage) → fail-closed 403', async () => {
    const p = randomUUID();
    const a = await authenticate('Auditor');
    await grant(a.userId, p, 'auditor');
    const res = await a.client.inject({ method: 'GET', url: `/api/v1/p/${p}/news` });
    expect(res.statusCode).toBe(403);
  });

  it('AC6 deferral pin: district_admin is DENIED the list (never granted news.manage)', async () => {
    const p = randomUUID();
    const a = await authenticate('District Admin');
    await grant(a.userId, p, 'district_admin');
    const res = await a.client.inject({ method: 'GET', url: `/api/v1/p/${p}/news` });
    expect(res.statusCode).toBe(403);
  });

  // ── AC2/AC3 — the full workflow with two distinct admins (author ≠ reviewer) ──────────────────────
  it('AC2: create → submit → approve → publish; author≠reviewer + tone sign-off + fan-out enqueue', async () => {
    const p = randomUUID();
    const author = await authenticate('Author');
    const reviewer = await authenticate('Reviewer');
    await grant(author.userId, p, 'pariwar_admin');
    await grant(reviewer.userId, p, 'pariwar_admin');

    const postId = await createDraft(author.client, p);

    // author cannot be the reviewer (403)
    const selfSubmit = await author.client.inject({
      method: 'POST',
      url: `/api/v1/p/${p}/news/${postId}/submit`,
      payload: { reviewer_id: author.userId },
    });
    expect(selfSubmit.statusCode).toBe(403);
    expect((selfSubmit.json() as { error: { code: string } }).error.code).toBe('news.author_is_reviewer');

    // submit naming the reviewer → 200
    const submit = await author.client.inject({
      method: 'POST',
      url: `/api/v1/p/${p}/news/${postId}/submit`,
      payload: { reviewer_id: reviewer.userId },
    });
    expect(submit.statusCode).toBe(200);
    expect((submit.json() as Json)['status']).toBe('submitted');

    // the author cannot approve their own post (403)
    const selfApprove = await author.client.inject({ method: 'POST', url: `/api/v1/p/${p}/news/${postId}/approve`, payload: {} });
    expect(selfApprove.statusCode).toBe(403);

    // the non-author reviewer approves → 200 + a recorded tone_review.signoff (fixture sink)
    const approve = await reviewer.client.inject({ method: 'POST', url: `/api/v1/p/${p}/news/${postId}/approve`, payload: {} });
    expect(approve.statusCode).toBe(200);
    expect((approve.json() as Json)['status']).toBe('approved');
    expect((approve.json() as Json)['tone_signoff_content_hash']).toMatch(/^[0-9a-f]{64}$/);
    const signoff = t.toneReviewAuditSink.events.find(
      (e) => e.type === 'tone_review.signoff' && e.resourceLocator === `news:post:${postId}`,
    );
    expect(signoff).toBeDefined();

    // publish → 200 + an IMMEDIATE fan-out job enqueued
    const publish = await reviewer.client.inject({ method: 'POST', url: `/api/v1/p/${p}/news/${postId}/publish`, payload: {} });
    expect(publish.statusCode).toBe(200);
    expect((publish.json() as Json)['status']).toBe('published');
    const job = t.newsPublishQueue.enqueued.find((j) => j.postId === postId);
    expect(job).toBeDefined();
    expect(job!.mode).toBe('immediate');
  });

  it('AC2 review findings: submit rejects a reviewer_id who does not hold news.manage', async () => {
    const p = randomUUID();
    const author = await authenticate('Author');
    const notAReviewer = await authenticate('No Grant');
    await grant(author.userId, p, 'pariwar_admin');
    // notAReviewer is authenticated but never granted news.manage in this Pariwar.
    const postId = await createDraft(author.client, p);
    const res = await author.client.inject({
      method: 'POST',
      url: `/api/v1/p/${p}/news/${postId}/submit`,
      payload: { reviewer_id: notAReviewer.userId },
    });
    expect(res.statusCode).toBe(403);
    expect((res.json() as { error: { code: string } }).error.code).toBe('news.author_is_reviewer');
  });

  it('AC2 review findings: only the ASSIGNED reviewer may approve — a third news.manage holder is rejected', async () => {
    const p = randomUUID();
    const author = await authenticate('Author');
    const reviewer = await authenticate('Reviewer');
    const other = await authenticate('Other Admin');
    await grant(author.userId, p, 'pariwar_admin');
    await grant(reviewer.userId, p, 'pariwar_admin');
    await grant(other.userId, p, 'pariwar_admin'); // also holds news.manage, but was never named as reviewer

    const postId = await createDraft(author.client, p);
    await author.client.inject({ method: 'POST', url: `/api/v1/p/${p}/news/${postId}/submit`, payload: { reviewer_id: reviewer.userId } });

    const wrongApprover = await other.client.inject({ method: 'POST', url: `/api/v1/p/${p}/news/${postId}/approve`, payload: {} });
    expect(wrongApprover.statusCode).toBe(403);
    expect((wrongApprover.json() as { error: { code: string } }).error.code).toBe('news.author_is_reviewer');

    const rightApprover = await reviewer.client.inject({ method: 'POST', url: `/api/v1/p/${p}/news/${postId}/approve`, payload: {} });
    expect(rightApprover.statusCode).toBe(200);
    expect((rightApprover.json() as Json)['status']).toBe('approved');
  });

  it('AC4 review findings: schedule rejects a scheduled_publish_at at/before now', async () => {
    const p = randomUUID();
    const author = await authenticate('Author');
    const reviewer = await authenticate('Reviewer');
    await grant(author.userId, p, 'pariwar_admin');
    await grant(reviewer.userId, p, 'pariwar_admin');
    const postId = await createDraft(author.client, p);
    await author.client.inject({ method: 'POST', url: `/api/v1/p/${p}/news/${postId}/submit`, payload: { reviewer_id: reviewer.userId } });
    await reviewer.client.inject({ method: 'POST', url: `/api/v1/p/${p}/news/${postId}/approve`, payload: {} });

    const past = new Date(Date.now() - 3600_000).toISOString();
    const res = await reviewer.client.inject({ method: 'POST', url: `/api/v1/p/${p}/news/${postId}/schedule`, payload: { scheduled_publish_at: past } });
    expect(res.statusCode).toBe(422);
    expect((res.json() as { error: { code: string } }).error.code).toBe('news.schedule_in_past');
  });

  it('AC2: an illegal transition (approve a DRAFT) is a typed 409 before the write', async () => {
    const p = randomUUID();
    const a = await authenticate('Author');
    await grant(a.userId, p, 'pariwar_admin');
    const postId = await createDraft(a.client, p);
    const res = await a.client.inject({ method: 'POST', url: `/api/v1/p/${p}/news/${postId}/approve`, payload: {} });
    expect(res.statusCode).toBe(409);
    expect((res.json() as { error: { code: string } }).error.code).toBe('news.post_invalid_state');
    // the post is untouched — still a draft
    const detail = await a.client.inject({ method: 'GET', url: `/api/v1/p/${p}/news/${postId}` });
    expect((detail.json() as Json)['status']).toBe('draft');
  });

  it('AC7: a public post missing Hindi copy → 422 at submit', async () => {
    const p = randomUUID();
    const author = await authenticate('Author');
    const reviewer = await authenticate('Reviewer');
    await grant(author.userId, p, 'pariwar_admin');
    await grant(reviewer.userId, p, 'pariwar_admin'); // must hold news.manage to pass the reviewer-lock validation before the bilingual check runs
    const postId = await createDraft(author.client, p, { audience_scope: 'public', title_hi: null, body_markdown_hi: null });
    const res = await author.client.inject({
      method: 'POST',
      url: `/api/v1/p/${p}/news/${postId}/submit`,
      payload: { reviewer_id: reviewer.userId },
    });
    expect(res.statusCode).toBe(422);
    expect((res.json() as { error: { code: string } }).error.code).toBe('news.bilingual_required');
  });

  it('AC4: schedule enqueues a DELAYED publish job; the list is status-filterable', async () => {
    const p = randomUUID();
    const author = await authenticate('Author');
    const reviewer = await authenticate('Reviewer');
    await grant(author.userId, p, 'pariwar_admin');
    await grant(reviewer.userId, p, 'pariwar_admin');
    const postId = await createDraft(author.client, p);
    await author.client.inject({ method: 'POST', url: `/api/v1/p/${p}/news/${postId}/submit`, payload: { reviewer_id: reviewer.userId } });
    await reviewer.client.inject({ method: 'POST', url: `/api/v1/p/${p}/news/${postId}/approve`, payload: {} });

    const at = new Date(Date.now() + 3600_000).toISOString();
    const sched = await reviewer.client.inject({ method: 'POST', url: `/api/v1/p/${p}/news/${postId}/schedule`, payload: { scheduled_publish_at: at } });
    expect(sched.statusCode).toBe(200);
    expect((sched.json() as Json)['status']).toBe('scheduled');
    const job = t.newsPublishQueue.enqueued.find((j) => j.postId === postId);
    expect(job).toBeDefined();
    expect(job!.mode).toBe('scheduled');
    expect(job!.at).toBeInstanceOf(Date);

    // the list, filtered to scheduled, contains this post (membership, not counts)
    const list = await reviewer.client.inject({ method: 'GET', url: `/api/v1/p/${p}/news?status=scheduled` });
    expect(list.statusCode).toBe(200);
    const ids = (list.json() as { items: Array<{ post_id: string }> }).items.map((i) => i.post_id);
    expect(ids).toContain(postId);
  });
});
