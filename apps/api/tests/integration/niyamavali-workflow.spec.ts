// Niyamavali amendment-workflow endpoints — Story 2.4 (AC1-AC6).
//
// Drives the real Fastify app via fastify.inject through the full trustee workflow:
//   create draft → submit-for-review → non-author sign-off → audit-logged publish.
// Asserts: one audit line per publish carrying clause_id + clause_version_id (AC2);
// the published clause_versions (+ amendment) rows have a NON-NULL audit_id (AC5);
// publish without sign-off → 409 tone_review.required (AC4); a self-review is rejected
// (AC1d); edit-after-signoff invalidates the sign-off → publish 409 (content-bound);
// ClauseIdConflictError → 409 + ClauseNotFoundError → 404 (AC6); the member-
// notification hook fired with the right payload (AC3).
//
// ⚠ Own-committing writes (the scope tx commits on 2xx; the audit writer commits its
// own tx). clause_versions + niyamavali_amendments are append-only / FK-referenced and
// CANNOT be deleted, so each test uses a FRESH random pariwarId and assertions key on
// MEMBERSHIP, never counts ([[project_live_db_test_gotchas]]).

import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { AppDeps } from '../../src/context.js';
import * as service from '../../src/modules/auth/admin/admin-auth.service.js';
import { buildServer } from '../../src/server.js';
import {
  buildTestDeps,
  hasDatabase,
  makeClient,
  type CapturingNiyamavaliHook,
  type TestDeps,
} from './_setup.js';
import { FakeWebAuthnProvider } from './_webauthn-fake.js';

type Client = ReturnType<typeof makeClient>;

interface DraftShape {
  draftId: string;
  clauseId: string;
  status: string;
  operation: string;
  toneReviewedBy: string | null;
  toneReviewContentHash: string | null;
}
interface PublishShape {
  clauseVersionId: string;
  clauseId: string;
  version: number;
  auditId: string;
}

const PAYLOAD = { rule_code: 'R7(A)', title_en: 'Restoration after lapse', restoration_window_days: 30 };

function createBody(clauseId: string): object {
  return {
    operation: 'create',
    clauseId,
    payload: PAYLOAD,
    effectiveDate: '2026-08-01T00:00:00.000Z',
    benefitMechanism: 'pool',
  };
}

describe.skipIf(!hasDatabase)('Niyamavali amendment workflow (Story 2.4)', () => {
  let td: TestDeps;
  let deps: AppDeps;
  let fakeWebauthn: FakeWebAuthnProvider;
  let app: Awaited<ReturnType<typeof buildServer>>;
  let hook: CapturingNiyamavaliHook;
  const createdUserIds: string[] = [];
  const usedPariwarIds: string[] = [];

  beforeAll(async () => {
    fakeWebauthn = new FakeWebAuthnProvider();
    td = buildTestDeps({ webauthn: fakeWebauthn });
    deps = td.deps;
    hook = td.niyamavaliHook;
    app = await buildServer(deps);
  });

  afterAll(async () => {
    await app.close();
    const c = await td.pool.connect();
    try {
      if (usedPariwarIds.length > 0) {
        // clause_drafts is deletable (no append-only trigger); clause_versions +
        // niyamavali_amendments are append-only / FK-referenced and intentionally kept.
        await c.query(`DELETE FROM clause_drafts WHERE pariwar_id = ANY($1)`, [usedPariwarIds]);
      }
      if (createdUserIds.length > 0) {
        await c.query(`DELETE FROM admin_sessions WHERE sess ->> 'userId' = ANY($1)`, [createdUserIds]);
        await c.query(`DELETE FROM role_grants WHERE user_id = ANY($1)`, [createdUserIds]);
        await c.query(`DELETE FROM users WHERE id = ANY($1)`, [createdUserIds]);
      }
    } finally {
      c.release();
      await td.pool.end();
    }
  });

  /** Authenticate a fresh admin (passkey enroll + login). Returns an auth'd client + id. */
  async function authenticate(): Promise<{ client: Client; userId: string }> {
    const email = `niy-${randomUUID()}@example.test`;
    const password = 'CorrectHorseBatteryStaple9';
    const userId = await service.createAdminAccount(deps, { email, password });
    createdUserIds.push(userId);

    const client = makeClient(app);
    fakeWebauthn.nextRegistration = {
      verified: true,
      credential: { id: `cred-${userId}`, publicKey: Buffer.from(userId).toString('base64url'), counter: 0 },
    };
    const credentialId = fakeWebauthn.nextRegistration.credential!.id;
    const token = service.mintEnrollmentToken(deps, userId);
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/register/options', payload: { enrollmentToken: token } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/register/verify', payload: { response: { id: 'browser' }, enrollmentToken: token } });
    fakeWebauthn.nextAuthentication = { verified: true, newCounter: 1 };
    await client.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email, password } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/authenticate/options', payload: {} });
    const verify = await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/authenticate/verify', payload: { response: { id: credentialId } } });
    expect(verify.statusCode).toBe(200);
    return { client, userId };
  }

  /** Grant pariwar_admin (carries niyamavali.amend + niyamavali.review) in a Pariwar. */
  async function grantPariwarAdmin(userId: string, pariwarId: string): Promise<void> {
    const c = await td.pool.connect();
    try {
      await c.query(
        `INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value)
           VALUES ($1, $2, 'pariwar_admin', 'pariwar', $3)`,
        [userId, pariwarId, pariwarId],
      );
    } finally {
      c.release();
    }
  }

  /** A fresh author in a fresh Pariwar. */
  async function newAuthorInPariwar(): Promise<{ client: Client; userId: string; pariwarId: string }> {
    const { client, userId } = await authenticate();
    const pariwarId = randomUUID();
    usedPariwarIds.push(pariwarId);
    await grantPariwarAdmin(userId, pariwarId);
    return { client, userId, pariwarId };
  }

  const niy = (pariwarId: string, suffix = ''): string => `/api/v1/p/${pariwarId}/niyamavali${suffix}`;

  // ── AC1 + AC2 + AC3 + AC5: the full create → publish flow ────────────────────
  it('runs the full create-draft → submit → non-author sign-off → publish flow', async () => {
    const { client: author, pariwarId } = await newAuthorInPariwar();
    const reviewerAuth = await authenticate();
    await grantPariwarAdmin(reviewerAuth.userId, pariwarId);
    const clauseId = 'niy.flow.r1';

    // create
    const created = await author.inject({ method: 'POST', url: niy(pariwarId, '/clauses/drafts'), payload: createBody(clauseId) });
    expect(created.statusCode).toBe(200);
    const draft = created.json<DraftShape>();
    expect(draft.status).toBe('draft');

    // submit
    const submitted = await author.inject({ method: 'POST', url: niy(pariwarId, `/clauses/drafts/${draft.draftId}/submit-for-review`) });
    expect(submitted.statusCode).toBe(200);
    expect(submitted.json<DraftShape>().status).toBe('in_review');

    // non-author sign-off
    const signoff = await reviewerAuth.client.inject({ method: 'POST', url: niy(pariwarId, `/clauses/drafts/${draft.draftId}/tone-review`), payload: { confirm: true } });
    expect(signoff.statusCode).toBe(200);
    const signed = signoff.json<DraftShape>();
    expect(signed.status).toBe('signed_off');
    expect(signed.toneReviewedBy).toBe(reviewerAuth.userId);

    // publish
    const published = await author.inject({ method: 'POST', url: niy(pariwarId, `/clauses/drafts/${draft.draftId}/publish`) });
    expect(published.statusCode).toBe(200);
    const pub = published.json<PublishShape>();
    expect(pub.clauseId).toBe(clauseId);
    expect(pub.version).toBe(1);
    expect(pub.auditId).toMatch(/^[0-9a-f-]{36}$/);

    // AC5: the published clause_versions row has a NON-NULL audit_id referencing the line.
    const c = await td.pool.connect();
    try {
      const { rows } = await c.query<{ audit_id: string | null }>(
        `SELECT audit_id FROM clause_versions WHERE clause_version_id = $1`,
        [pub.clauseVersionId],
      );
      expect(rows[0]?.audit_id).toBe(pub.auditId);
      // AC2: a single audit line carrying the clause_id + clause_version_id.
      const audit = await c.query<{ action: string; resource_locator: string }>(
        `SELECT action, resource_locator FROM audit_log_entries WHERE audit_id = $1`,
        [pub.auditId],
      );
      expect(audit.rows[0]?.action).toBe('niyamavali.amended');
      expect(audit.rows[0]?.resource_locator).toContain(clauseId);
      expect(audit.rows[0]?.resource_locator).toContain(pub.clauseVersionId);
    } finally {
      c.release();
    }

    // AC3: the member-notification hook fired with the published coordinates.
    const fired = hook.events.find((e) => e.clauseVersionId === pub.clauseVersionId);
    expect(fired).toBeDefined();
    expect(fired?.clauseId).toBe(clauseId);
    expect(fired?.pariwarId).toBe(pariwarId);
  });

  // ── AC4: publish without a sign-off → 409 tone_review.required ────────────────
  it('publish without a recorded sign-off is rejected 409 tone_review.required', async () => {
    const { client: author, pariwarId } = await newAuthorInPariwar();
    const created = await author.inject({ method: 'POST', url: niy(pariwarId, '/clauses/drafts'), payload: createBody('niy.nosign.r1') });
    const draft = created.json<DraftShape>();
    await author.inject({ method: 'POST', url: niy(pariwarId, `/clauses/drafts/${draft.draftId}/submit-for-review`) });

    const published = await author.inject({ method: 'POST', url: niy(pariwarId, `/clauses/drafts/${draft.draftId}/publish`) });
    expect(published.statusCode).toBe(409);
    expect(published.json<{ error: { code: string } }>().error.code).toBe('tone_review.required');
  });

  // ── AC1d: an author cannot tone-review their own draft (409 self-review) ──────
  it('a self-review sign-off (author === reviewer) is rejected 409', async () => {
    const { client: author, pariwarId } = await newAuthorInPariwar();
    const created = await author.inject({ method: 'POST', url: niy(pariwarId, '/clauses/drafts'), payload: createBody('niy.self.r1') });
    const draft = created.json<DraftShape>();
    await author.inject({ method: 'POST', url: niy(pariwarId, `/clauses/drafts/${draft.draftId}/submit-for-review`) });

    const selfSign = await author.inject({ method: 'POST', url: niy(pariwarId, `/clauses/drafts/${draft.draftId}/tone-review`), payload: { confirm: true } });
    expect(selfSign.statusCode).toBe(409);
    expect(selfSign.json<{ error: { code: string } }>().error.code).toBe('niyamavali.draft_self_review');
  });

  // ── content-binding: edit-after-signoff invalidates → publish 409 ────────────
  it('editing after sign-off invalidates it → publish 409 (content-bound)', async () => {
    const { client: author, pariwarId } = await newAuthorInPariwar();
    const reviewerAuth = await authenticate();
    await grantPariwarAdmin(reviewerAuth.userId, pariwarId);

    const created = await author.inject({ method: 'POST', url: niy(pariwarId, '/clauses/drafts'), payload: createBody('niy.edit.r1') });
    const draft = created.json<DraftShape>();
    await author.inject({ method: 'POST', url: niy(pariwarId, `/clauses/drafts/${draft.draftId}/submit-for-review`) });
    await reviewerAuth.client.inject({ method: 'POST', url: niy(pariwarId, `/clauses/drafts/${draft.draftId}/tone-review`), payload: { confirm: true } });

    // Edit after sign-off → resets to draft + clears sign-off.
    const edited = await author.inject({
      method: 'PUT',
      url: niy(pariwarId, `/clauses/drafts/${draft.draftId}`),
      payload: { payload: { ...PAYLOAD, restoration_window_days: 45 } },
    });
    expect(edited.statusCode).toBe(200);
    expect(edited.json<DraftShape>().status).toBe('draft');
    expect(edited.json<DraftShape>().toneReviewContentHash).toBeNull();

    // Publish now 409s (no current sign-off).
    const published = await author.inject({ method: 'POST', url: niy(pariwarId, `/clauses/drafts/${draft.draftId}/publish`) });
    expect(published.statusCode).toBe(409);
    expect(published.json<{ error: { code: string } }>().error.code).toBe('tone_review.required');
  });

  // ── AC6: typed-error → HTTP mapping (409 conflict, 404 not-found) ────────────
  it('amending a non-existent clause → 404 niyamavali.clause_not_found', async () => {
    const { client: author, pariwarId } = await newAuthorInPariwar();
    const res = await author.inject({
      method: 'POST',
      url: niy(pariwarId, '/clauses/drafts'),
      payload: {
        operation: 'amend',
        clauseId: 'niy.ghost.r1',
        payload: PAYLOAD,
        effectiveDate: '2026-08-01T00:00:00.000Z',
        affectedMemberScope: { kind: 'all_members' },
      },
    });
    expect(res.statusCode).toBe(404);
    expect(res.json<{ error: { code: string } }>().error.code).toBe('niyamavali.clause_not_found');
  });

  it('creating a draft for an already-published clause → 409 niyamavali.clause_id_conflict', async () => {
    const { client: author, pariwarId } = await newAuthorInPariwar();
    const reviewerAuth = await authenticate();
    await grantPariwarAdmin(reviewerAuth.userId, pariwarId);
    const clauseId = 'niy.conflict.r1';

    // Publish it once (so the clause now exists in the registry).
    const created = await author.inject({ method: 'POST', url: niy(pariwarId, '/clauses/drafts'), payload: createBody(clauseId) });
    const draft = created.json<DraftShape>();
    await author.inject({ method: 'POST', url: niy(pariwarId, `/clauses/drafts/${draft.draftId}/submit-for-review`) });
    await reviewerAuth.client.inject({ method: 'POST', url: niy(pariwarId, `/clauses/drafts/${draft.draftId}/tone-review`), payload: { confirm: true } });
    const pub = await author.inject({ method: 'POST', url: niy(pariwarId, `/clauses/drafts/${draft.draftId}/publish`) });
    expect(pub.statusCode).toBe(200);

    // A new CREATE draft for the same clause id → conflict.
    const conflict = await author.inject({ method: 'POST', url: niy(pariwarId, '/clauses/drafts'), payload: createBody(clauseId) });
    expect(conflict.statusCode).toBe(409);
    expect(conflict.json<{ error: { code: string } }>().error.code).toBe('niyamavali.clause_id_conflict');
  });

  // ── AC1c: diff preview returns structured + rendered ─────────────────────────
  it('diff preview returns the structured + rendered diff for a create draft', async () => {
    const { client: author, pariwarId } = await newAuthorInPariwar();
    const created = await author.inject({ method: 'POST', url: niy(pariwarId, '/clauses/drafts'), payload: createBody('niy.diff.r1') });
    const draft = created.json<DraftShape>();

    const diff = await author.inject({ method: 'GET', url: niy(pariwarId, `/clauses/drafts/${draft.draftId}/diff`) });
    expect(diff.statusCode).toBe(200);
    const body = diff.json<{ structuredDiff: { added: Record<string, unknown> }; renderedDiff: { field: string; after: string | null }[] }>();
    // create → everything is "added".
    expect(Object.keys(body.structuredDiff.added)).toContain('rule_code');
    expect(body.renderedDiff.find((r) => r.field === 'title_en')?.after).toBe('Restoration after lapse');
  });

  // ── RBAC: unauthenticated + cross-tenant non-member ──────────────────────────
  it('unauthenticated requests are 401', async () => {
    const anon = makeClient(app);
    const res = await anon.inject({ method: 'GET', url: niy(randomUUID(), '/clauses') });
    expect(res.statusCode).toBe(401);
  });

  it('an admin with no membership in the Pariwar gets 404 (no enumeration oracle)', async () => {
    const { client } = await authenticate(); // authenticated but not granted anywhere
    const res = await client.inject({ method: 'GET', url: niy(randomUUID(), '/clauses') });
    expect(res.statusCode).toBe(404);
  });
  // Live-DB suite timeout: the full-flow test alone runs ~9 sequential live-DB round-trips
  // (setup + 4 HTTP legs + audit assertions) against a shared :5433 container; under concurrent
  // `turbo`/`ci:local` load it can exceed the 5s vitest default. 20s removes the contention flake
  // without masking a real hang (see apps/jobs/tests/audit/integrity-check.test.ts precedent).
}, { timeout: 20000 });
