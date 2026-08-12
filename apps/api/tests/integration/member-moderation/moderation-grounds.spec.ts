// APPEND-ONLY moderation grounds, end to end — Story 10.20 (Task 7; AC9, WS-E). (:5433)
//
// `epics.md:3859-3862`: codes may be added, superseded, or corrected by a further append-only
// record — never `UPDATE`d, never `DELETE`d. A later finding ATTACHES to the original decision; it
// never rewrites it. This spec proves that, and proves the four things that constrain it:
//
//   · ⭐ THE PRIMARY GROUND NEVER MOVES. Superseding it is a typed 409, and a second `is_primary`
//     row is structurally impossible (`23505` from the partial unique index, driven from raw SQL).
//   · ⛔ The table grants no `UPDATE` except the one RTBF column — driven from raw SQL as `42501`.
//   · The D3 held-equivalent pair: the primary ground's `code` equals the action's `reason_code`,
//     asserted at EVERY step of a suspend → append → supersede → terminate walk.
//   · The event: `from_state === to_state`, `is_primary` absent, and — separately — the payload
//     PARSES against its registered schema, because an identity assertion is satisfied by a
//     correct payload and a REJECTED one alike (`state.ts:91-96`; Story 10.19's debug finding #3).
//
// ⚠ Own-committing seed writes; fresh random pariwarId + memberId per test.

import { randomUUID } from 'node:crypto';

import { ids, member as memberDomain } from '@twt/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { AppDeps } from '../../../src/context.js';
import * as service from '../../../src/modules/auth/admin/admin-auth.service.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { buildServer } from '../../../src/server.js';
import {
  buildTestDeps,
  hasDatabase,
  makeClient,
  type CapturingStepUpDelivery,
  type TestDeps,
} from '../_setup.js';
import { FakeWebAuthnProvider } from '../_webauthn-fake.js';

type Client = ReturnType<typeof makeClient>;
type Json = Record<string, unknown>;

const STEP_UP_APPEND = 'member_moderation_append_ground';
const IMMEDIATE_REASON =
  'The forged documents are still circulating and each day of delay exposes further claims to the same fraud.';
const ESCALATION = {
  escalation_inadequacy:
    'Suspension would not protect the Trust: the member retains the access that was misused and the restoration path it preserves is futile here.',
  escalation_proportionality:
    'Termination fits the conduct because the forgery was deliberate, repeated, and aimed at the claim-verification process itself.',
};

describe.skipIf(!hasDatabase)('moderation grounds — append-only (:5433)', () => {
  let td: TestDeps;
  let deps: AppDeps;
  let fakeWebauthn: FakeWebAuthnProvider;
  let adminStepUp: CapturingStepUpDelivery;
  let app: Awaited<ReturnType<typeof buildServer>>;
  const createdUserIds: string[] = [];
  const createdPariwars: string[] = [];

  beforeAll(async () => {
    fakeWebauthn = new FakeWebAuthnProvider();
    td = buildTestDeps({ webauthn: fakeWebauthn });
    deps = td.deps;
    adminStepUp = td.adminStepUpDelivery;
    app = await buildServer(deps);
  });

  afterAll(async () => {
    await app.close();
    const c = await td.pool.connect();
    try {
      if (createdUserIds.length > 0) {
        await c.query(`DELETE FROM admin_sessions WHERE sess ->> 'userId' = ANY($1)`, [createdUserIds]);
        await c.query(`DELETE FROM role_grants WHERE user_id = ANY($1)`, [createdUserIds]);
        await c.query(`DELETE FROM users WHERE id = ANY($1)`, [createdUserIds]);
      }
      if (createdPariwars.length > 0) {
        await c.query(`DELETE FROM member_moderation_grounds WHERE pariwar_id = ANY($1)`, [createdPariwars]);
        await c.query(`DELETE FROM member_moderation_actions WHERE pariwar_id = ANY($1)`, [createdPariwars]);
      }
    } finally {
      c.release();
    }
    await td.pool.end();
  });

  async function authenticate(): Promise<{ client: Client; userId: string }> {
    const email = `mod-grounds-${randomUUID()}@example.test`;
    const password = 'CorrectHorseBatteryStaple9';
    const userId = await service.createAdminAccount(deps, { email, password, displayName: 'Trustee One' });
    createdUserIds.push(userId);
    const credentialId = `cred-${userId}`;
    fakeWebauthn.nextRegistration = { verified: true, credential: { id: credentialId, publicKey: 'pk', counter: 0 } };
    fakeWebauthn.nextAuthentication = { verified: true, newCounter: 1 };
    const client = makeClient(app);
    const token = service.mintEnrollmentToken(deps, userId);
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/register/options', payload: { enrollmentToken: token } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/register/verify', payload: { response: { id: 'b' }, enrollmentToken: token } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email, password } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/authenticate/options', payload: {} });
    const verify = await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/authenticate/verify', payload: { response: { id: credentialId } } });
    expect(verify.statusCode).toBe(200);
    return { client, userId };
  }

  async function grant(userId: string, pariwarId: string): Promise<void> {
    const c = await td.pool.connect();
    try {
      await c.query(
        `INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value) VALUES ($1, $2, 'pariwar_admin', 'pariwar', $3)`,
        [userId, pariwarId, pariwarId],
      );
    } finally {
      c.release();
    }
  }

  async function elevate(client: Client, actionContext: string): Promise<void> {
    const req = await client.inject({ method: 'POST', url: '/api/v1/auth/step-up/request', payload: { actionContext } });
    expect(req.statusCode).toBe(200);
    const ver = await client.inject({ method: 'POST', url: '/api/v1/auth/step-up/verify', payload: { otp: adminStepUp.last?.code as string } });
    expect(ver.statusCode).toBe(200);
  }

  async function seedActiveMember(pariwarId: string): Promise<string> {
    const memberId = randomUUID();
    const scopeTx = await openScopeTx(deps, pariwarId);
    try {
      const mid = ids.memberId(memberId);
      const pid = ids.pariwarId(pariwarId);
      const project = (eventType: string, payload: Json) =>
        memberDomain.projectMemberState(scopeTx.client, {
          memberId: mid,
          pariwarId: pid,
          eventType: eventType as Parameters<typeof memberDomain.projectMemberState>[1]['eventType'],
          actorId: memberId,
          payload,
        });
      await project('member.signup_initiated', { from_state: null, to_state: 'pending-kyc', trigger: 'signup', actor: 'member' });
      await project('member.kyc_completed', { from_state: 'pending-kyc', to_state: 'pending-fee', trigger: 'kyc', actor: 'member' });
      await project('member.vyawastha_shulk_paid', { from_state: 'pending-fee', to_state: 'lock-in', trigger: 'fee_paid', actor: 'member', utr: 'UTR123', amount_inr: 110 });
      await project('member.lock_in_expired', { from_state: 'lock-in', to_state: 'active', trigger: 'lock_in_expired', actor: 'system', kyc_verified: true });
      await closeScopeTx(scopeTx, true);
    } catch (err) {
      await closeScopeTx(scopeTx, false);
      throw err;
    }
    return memberId;
  }

  /** A tenant + an active member + a SUSPENDED standing, and the elevated admin that produced it. */
  async function suspended(): Promise<{ p: string; memberId: string; client: Client; actionId: string }> {
    const p = randomUUID();
    createdPariwars.push(p);
    const memberId = await seedActiveMember(p);
    const { client, userId } = await authenticate();
    await grant(userId, p);
    await elevate(client, 'member_moderation_suspend');
    const res = await client.inject({
      method: 'POST',
      url: `/api/v1/p/${p}/members/${memberId}/moderation/suspend`,
      payload: { reason_code: 'r14-forgery', rationale: 'Suspended pending investigation.' },
    });
    expect(res.statusCode).toBe(200);
    return { p, memberId, client, actionId: res.json<{ moderation_action_id: string }>().moderation_action_id };
  }

  async function appendGround(
    p: string,
    memberId: string,
    actionId: string,
    client: Client,
    body: Json,
  ) {
    await elevate(client, STEP_UP_APPEND);
    return client.inject({
      method: 'POST',
      url: `/api/v1/p/${p}/members/${memberId}/moderation/${actionId}/grounds`,
      payload: body,
    });
  }

  async function history(p: string, memberId: string, client: Client) {
    const res = await client.inject({ method: 'GET', url: `/api/v1/p/${p}/members/${memberId}/moderation` });
    expect(res.statusCode).toBe(200);
    return res.json<{ entries: Array<{ moderation_action_id: string; reason_code: string; grounds: Array<Record<string, unknown>> }> }>();
  }

  const errCode = (res: { json: () => unknown }) => (res.json() as { error: { code: string } }).error.code;

  // ── The primary ground ────────────────────────────────────────────────────────────────────────

  it('⭐ AC9: the PRIMARY ground is written in the ACTION\'s own transaction, exactly once', async () => {
    const { p, memberId, actionId, client } = await suspended();
    const hist = await history(p, memberId, client);
    const grounds = hist.entries[0].grounds;
    // "At most one primary" is the DB's job (the partial unique index); "AT LEAST ONE" is the
    // writer's — this is the assertion that pins the writer's half.
    expect(grounds.filter((g) => g.is_primary)).toHaveLength(1);
    expect(grounds[0]).toMatchObject({ is_primary: true, code: 'r14-forgery', superseded: false });
    expect(actionId).toBeTruthy();
  });

  it('⛔ AC9: NO `ground-appended` event is emitted for a primary ground', async () => {
    const { memberId } = await suspended();
    // The primary is already on the timeline via the action's own `member.moderation.suspended`
    // event, which carries the same reason_code. A second event for the same fact would
    // double-count the decision on every fold that reads this stream — which is also why the
    // payload has no `is_primary` field at all.
    const c = await td.pool.connect();
    try {
      const r = await c.query<{ event_type: string }>(
        `SELECT event_type FROM events_log WHERE stream_id = $1`,
        [memberId],
      );
      expect(r.rows.map((x) => x.event_type)).not.toContain('member.moderation.ground-appended');
    } finally {
      c.release();
    }
  });

  // ── Appending, superseding ────────────────────────────────────────────────────────────────────

  it('AC9: a SUPPORTING ground is appended, and it emits the event on the member\'s own stream', async () => {
    const { p, memberId, actionId, client } = await suspended();
    const res = await appendGround(p, memberId, actionId, client, {
      code: 'concealment-confirmed',
      note: 'A second identity document surfaced during the audit.',
      evidence_refs: [{ kind: 'investigation', ref: 'INV-2026-0042' }],
    });
    expect(res.statusCode).toBe(200);

    const hist = await history(p, memberId, client);
    const grounds = hist.entries[0].grounds;
    expect(grounds).toHaveLength(2);
    const supporting = grounds.find((g) => !g.is_primary)!;
    expect(supporting).toMatchObject({
      code: 'concealment-confirmed',
      is_primary: false,
      // ⚠ `has_note`, never the note: it is Tier-1 and stays decrypt-on-demand.
      has_note: true,
      superseded: false,
    });
    expect(supporting['evidence_refs']).toEqual([{ kind: 'investigation', ref: 'INV-2026-0042' }]);
  });

  it('⭐ AC9: the event is lifecycle-IDENTITY, carries no `is_primary`, and PARSES against its schema', async () => {
    const { p, memberId, actionId, client } = await suspended();
    expect((await appendGround(p, memberId, actionId, client, { code: 'concealment-confirmed' })).statusCode).toBe(200);

    const c = await td.pool.connect();
    try {
      const r = await c.query<{ payload: Record<string, unknown> }>(
        `SELECT payload FROM events_log WHERE stream_id = $1 AND event_type = 'member.moderation.ground-appended'`,
        [memberId],
      );
      expect(r.rows).toHaveLength(1);
      const payload = r.rows[0].payload;

      // (a) Lifecycle identity — `members.state` provably cannot move.
      expect(payload['from_state']).toBe(payload['to_state']);

      // (b) ⭐ THE IDENTITY ASSERTION ABOVE PROVES LESS THAN IT LOOKS LIKE IT PROVES, so it does not
      //     stand alone. `memberStateMachine` `safeParse`s the payload and returns the state
      //     UNCHANGED on a malformed one (`state.ts:91-96`) — precisely Story 10.19's debug finding
      //     #3, where a seed carrying a malformed payload left every member in the wrong state while
      //     every assertion passed. So the payload's ACCEPTANCE is pinned SEPARATELY, by parsing it
      //     against the registered schema directly.
      const parsed =
        memberDomain.moderation.ModerationGroundAppendedPayloadSchema.safeParse(payload);
      expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);

      // (c) ⛔ NO overlay pair — no moderation status moves on an append, and claiming a from/to
      //     pair would be a false statement about the member's standing.
      expect(payload).not.toHaveProperty('moderation_from');
      expect(payload).not.toHaveProperty('moderation_to');
      // (d) ⛔ NO `is_primary` (appends are supporting-only by construction), and R1: no free text.
      expect(payload).not.toHaveProperty('is_primary');
      expect(payload).not.toHaveProperty('note');
      expect(payload).not.toHaveProperty('evidence_refs');
      expect(payload).not.toHaveProperty('actor_display');
    } finally {
      c.release();
    }
  });

  it('⭐ AC9: a supersede RETAINS the superseded row, flagged — an audit trail that hides is not one', async () => {
    const { p, memberId, actionId, client } = await suspended();
    const first = await appendGround(p, memberId, actionId, client, { code: 'concealment-confirmed' });
    const firstId = first.json<{ ground_id: string }>().ground_id;

    const second = await appendGround(p, memberId, actionId, client, {
      code: 'helpdesk-escalated-abuse',
      supersedes_ground_id: firstId,
    });
    expect(second.statusCode).toBe(200);

    const grounds = (await history(p, memberId, client)).entries[0].grounds;
    expect(grounds).toHaveLength(3); // primary + superseded + superseder — nothing disappears.
    const superseded = grounds.find((g) => g['ground_id'] === firstId)!;
    expect(superseded['superseded']).toBe(true);
    const superseder = grounds.find((g) => g['supersedes_ground_id'] === firstId)!;
    expect(superseder).toMatchObject({ code: 'helpdesk-escalated-abuse', superseded: false });
  });

  // ── ⭐ The primary is IMMUTABLE ────────────────────────────────────────────────────────────────

  it('⭐ AC9: superseding the PRIMARY ground is a TYPED 409, never a 23505 leaking as a 500', async () => {
    const { p, memberId, actionId, client } = await suspended();
    const primaryId = (await history(p, memberId, client)).entries[0].grounds.find(
      (g) => g.is_primary,
    )!['ground_id'] as string;

    const res = await appendGround(p, memberId, actionId, client, {
      code: 'concealment-confirmed',
      supersedes_ground_id: primaryId,
    });
    expect(res.statusCode).toBe(409);
    expect(errCode(res)).toBe('member_moderation.primary_ground_immutable');
    // ⛔ NOT a 500: "the primary ground is fixed at the action" is a fact a trustee must be able to
    // read off the error, not infer from a stack trace.
    expect(res.statusCode).not.toBe(500);
  });

  it('AC9: a supersede target from ANOTHER action is a 404, never an existence oracle', async () => {
    const a = await suspended();
    const b = await suspended();
    const bPrimaryId = (await history(b.p, b.memberId, b.client)).entries[0].grounds[0]['ground_id'] as string;

    const res = await appendGround(a.p, a.memberId, a.actionId, a.client, {
      code: 'concealment-confirmed',
      supersedes_ground_id: bPrimaryId,
    });
    expect(res.statusCode).toBe(404);
    expect(errCode(res)).toBe('member_moderation.ground_not_found');
  });

  it('AC9: appending to a nonexistent action is a 404', async () => {
    const { p, memberId, client } = await suspended();
    const res = await appendGround(p, memberId, randomUUID(), client, { code: 'concealment-confirmed' });
    expect(res.statusCode).toBe(404);
    expect(errCode(res)).toBe('member_moderation.action_not_found');
  });

  it('AC9: a ground whose code cannot justify the action it attaches to is a 422', async () => {
    const { p, memberId, actionId, client } = await suspended();
    // ⚠ A supporting ground is still a ground for the SANCTION THAT WAS IMPOSED — `prd.md:871`
    // requires that grounds for termination and for suspension not be interchangeable. A restore
    // code can no more SUPPORT a suspension than justify one.
    const res = await appendGround(p, memberId, actionId, client, { code: 'moderation-error' });
    expect(res.statusCode).toBe(422);
    expect(errCode(res)).toBe('member_moderation.reason_code_invalid');
  });

  it('AC9: prose evidence on a ground is rejected at the boundary (400)', async () => {
    const { p, memberId, actionId, client } = await suspended();
    const res = await appendGround(p, memberId, actionId, client, {
      code: 'concealment-confirmed',
      evidence_refs: [{ kind: 'investigation', ref: 'the member admitted it in a meeting' }],
    });
    expect(res.statusCode).toBe(400);
  });

  it('AC9: the FOURTH step-up context — an elevation for a restore cannot be spent on a finding', async () => {
    const { p, memberId, actionId, client } = await suspended();
    await elevate(client, 'member_moderation_restore');
    const res = await client.inject({
      method: 'POST',
      url: `/api/v1/p/${p}/members/${memberId}/moderation/${actionId}/grounds`,
      payload: { code: 'concealment-confirmed' },
    });
    expect(res.statusCode).toBe(403);
    expect(errCode(res)).toBe('auth.step_up_required');
  });

  // ── ⭐ D3 — the held-equivalent pair, driven through every arm ─────────────────────────────────

  it('⭐ D3: the primary ground\'s `code` EQUALS the action\'s `reason_code`, at every step', async () => {
    const { p, memberId, actionId, client } = await suspended();

    async function assertPairAgrees(label: string) {
      const hist = await history(p, memberId, client);
      for (const entry of hist.entries) {
        const primary = entry.grounds.find((g) => g.is_primary);
        expect(primary, `${label}: every action must carry a primary ground`).toBeTruthy();
        // The denormalization D3 accepts. It is safe because BOTH tables are append-only, so
        // NEITHER side can ever be rewritten — strictly stronger than the `read.ts:183-199`
        // argument it is modelled on, which holds only because one writer writes both in one tx.
        expect(primary!['code'], `${label}: ${entry.moderation_action_id}`).toBe(entry.reason_code);
      }
    }

    await assertPairAgrees('after suspend');

    // Append a SUPPORTING ground — the pair must be unaffected.
    const first = await appendGround(p, memberId, actionId, client, { code: 'concealment-confirmed' });
    await assertPairAgrees('after append');

    // Supersede THAT supporting ground — still unaffected.
    await appendGround(p, memberId, actionId, client, {
      code: 'helpdesk-escalated-abuse',
      supersedes_ground_id: first.json<{ ground_id: string }>().ground_id,
    });
    await assertPairAgrees('after supersede');

    // Terminate — a SECOND action, with its own primary ground.
    await elevate(client, 'member_moderation_terminate');
    const term = await client.inject({
      method: 'POST',
      url: `/api/v1/p/${p}/members/${memberId}/moderation/terminate`,
      payload: {
        reason_code: 'r14-forgery',
        rationale: 'Terminated by the Panel.',
        ...ESCALATION,
        immediate_termination_reason: IMMEDIATE_REASON,
      },
    });
    expect(term.statusCode).toBe(200);
    await assertPairAgrees('after terminate');
    expect((await history(p, memberId, client)).entries).toHaveLength(2);
  });

  // ── ⭐ REVERT-SANITY — the DB posture, driven from RAW SQL ─────────────────────────────────────

  describe('the table is append-only, and the primary is unmovable (revert-sanity)', () => {
    it('⭐ a SECOND primary row raises 23505 — the partial unique index has teeth', async () => {
      const { p, memberId, actionId } = await suspended();
      const c = await td.pool.connect();
      try {
        await c.query(
          `INSERT INTO member_moderation_grounds
             (moderation_action_id, pariwar_id, member_id, code, is_primary, added_by, added_by_display, added_at)
           VALUES ($1, $2, $3, 'concealment-confirmed', true, $4, 'Raw Writer', now())`,
          [actionId, p, memberId, randomUUID()],
        );
        expect.unreachable('a second primary ground must be rejected by the DB');
      } catch (err) {
        expect((err as { code: string }).code).toBe('23505');
      } finally {
        c.release();
      }
    });

    it('⭐ `twt_app` cannot UPDATE anything but the RTBF note column — 42501', async () => {
      const { p, memberId, actionId } = await suspended();
      const c = await td.pool.connect();
      try {
        // The pool used above is the owner; the GRANT posture binds `twt_app`, which is the role the
        // application actually runs as. SET ROLE proves the grant rather than the connection.
        await c.query('BEGIN');
        await c.query('SET LOCAL ROLE twt_app');
        await c.query(`SELECT set_config('app.pariwar_id', $1, true)`, [p]);

        // ⚠ EACH PROBE NEEDS ITS OWN SAVEPOINT. A failed statement aborts the whole transaction, so
        // without one the SECOND probe reports `25P02` ("current transaction is aborted") and the
        // test would be asserting Postgres's error-recovery behaviour rather than the grant
        // ([[project_domain_limit_clamp_and_savepoint_retry]] — the same raw-SAVEPOINT need).
        async function denialCodeOf(sql: string): Promise<string | null> {
          await c.query('SAVEPOINT probe');
          try {
            await c.query(sql, [memberId]);
            await c.query('RELEASE SAVEPOINT probe');
            return null;
          } catch (err) {
            await c.query('ROLLBACK TO SAVEPOINT probe');
            return (err as { code: string }).code;
          }
        }

        // ⛔ "Never UPDATEd, never DELETEd" is a GRANT, not a convention — a code-level rule a raw
        // SQL writer could ignore would not be append-only at all.
        expect(
          await denialCodeOf(
            `UPDATE member_moderation_grounds SET code = 'concealment-confirmed' WHERE member_id = $1`,
          ),
        ).toBe('42501');
        expect(
          await denialCodeOf(`DELETE FROM member_moderation_grounds WHERE member_id = $1`),
        ).toBe('42501');

        // The ONE permitted UPDATE — the RTBF note scrub (AC11) — is allowed.
        await c.query(`UPDATE member_moderation_grounds SET note_ciphertext = NULL WHERE member_id = $1`, [memberId]);
        expect(actionId).toBeTruthy();
      } finally {
        await c.query('ROLLBACK').catch(() => undefined);
        c.release();
      }
    });
  });
});
