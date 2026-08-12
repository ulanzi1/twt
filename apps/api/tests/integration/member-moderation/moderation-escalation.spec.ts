// The moderation RECORD MODEL, end to end — Story 10.20 (Task 5; AC4, AC6, AC7). (:5433)
//
// Migration 0099 split one conflated field into a record that can be RECONSTRUCTED and TESTED. This
// spec proves the three separable parts actually behave that way against real Postgres:
//
//   · AC6 — the two-part escalation justification is MANDATORY on `terminate`, each part is
//     separately answerable, part (a) may not merely restate part (b), and neither may appear on a
//     suspend/restore. Each refusal is its own typed 422 naming what failed.
//   · AC6 — the parts land as TWO distinct Tier-1 ciphertexts, and each decrypts to the plaintext
//     that was sent (which is also what proves they were not concatenated or cross-assigned).
//   · AC4 — evidence references are structurally incapable of carrying prose, at BOTH the transport
//     boundary and the database.
//   · AC7 — the `r7a_restorations_used_snapshot` is the DERIVED fact, and `NULL` means *unknown*.
//   · ⭐ REVERT-SANITY on every DB gate. A gate that has never been SEEN to fail has not been shown
//     to have teeth ([[feedback_gate_scope_semantic_coverage]]) — so each constraint is driven from
//     RAW SQL, bypassing every layer of TypeScript above it, and asserted to raise its own SQLSTATE.
//
// ⚠ Own-committing seed writes; fresh random pariwarId + memberId per test
// ([[project_live_db_test_gotchas]]).

import { randomUUID } from 'node:crypto';

import { ids, member as memberDomain } from '@twt/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { AppDeps } from '../../../src/context.js';
import * as service from '../../../src/modules/auth/admin/admin-auth.service.js';
import { decryptModerationRationale } from '../../../src/modules/member-moderation/moderation-crypto.js';
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

const INADEQUACY =
  'Suspension would not protect the Trust: the member retains the access that was misused, and the restoration path it preserves is futile while the forged records stand.';
const PROPORTIONALITY =
  'Termination fits the conduct because the forgery was deliberate, repeated across three cycles, and aimed at the claim-verification process itself.';

describe.skipIf(!hasDatabase)('moderation record model — escalation, evidence, snapshot (:5433)', () => {
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
        // ⛔ `events_log` and `members` are deliberately NOT deleted — `events_log` is append-only
        // and its trigger refuses a DELETE outright ("corrections emit a new event", AR-8). The
        // sibling spec cleans exactly these two tables for the same reason.
        await c.query(`DELETE FROM member_moderation_actions WHERE pariwar_id = ANY($1)`, [createdPariwars]);
      }
    } finally {
      c.release();
    }
    await td.pool.end();
  });

  async function authenticate(opts: { displayName?: string } = {}): Promise<{ client: Client; userId: string }> {
    const email = `mod-record-${randomUUID()}@example.test`;
    const password = 'CorrectHorseBatteryStaple9';
    const userId = await service.createAdminAccount(deps, {
      email,
      password,
      ...(opts.displayName != null ? { displayName: opts.displayName } : {}),
    });
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

  async function grant(userId: string, pariwarId: string, role: string): Promise<void> {
    const c = await td.pool.connect();
    try {
      // ⚠ `pariwarId` is bound TWICE, as $2 and $4, deliberately: referencing one parameter in two
      // positions whose column types differ raises "inconsistent types deduced for parameter $2"
      // (the same trap Task 4's raw seeds hit).
      await c.query(
        `INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value) VALUES ($1, $2, $3, 'pariwar', $4)`,
        [userId, pariwarId, role, pariwarId],
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

  /** A tenant + an active member + an elevated pariwar_admin, ALREADY SUSPENDED (terminate's floor). */
  async function suspended(): Promise<{ p: string; memberId: string; client: Client }> {
    const p = randomUUID();
    createdPariwars.push(p);
    const memberId = await seedActiveMember(p);
    const a = await authenticate({ displayName: 'Trustee One' });
    await grant(a.userId, p, 'pariwar_admin');
    await elevate(a.client, 'member_moderation_suspend');
    const res = await a.client.inject({
      method: 'POST',
      url: `/api/v1/p/${p}/members/${memberId}/moderation/suspend`,
      payload: { reason_code: 'r14-forgery', rationale: 'Suspended pending investigation.' },
    });
    expect(res.statusCode).toBe(200);
    return { p, memberId, client: a.client };
  }

  /**
   * ⚠ These terminations take the IMMEDIATE-TERMINATION EXCEPTION (Story 10.20, AC8), because this
   * spec suspends and terminates seconds apart and a 7-day dwell now governs the ORDINARY path. The
   * exception is a legitimate route the Panel preserved (Q4.1), not a test-only bypass — it is
   * available where the authorised actor RECORDS THE REASON, which is what this default does.
   * The dwell itself is pinned in `moderation-dwell.spec.ts` against the real seeded clause.
   */
  const IMMEDIATE_REASON =
    'The forged documents are still circulating and each day of delay exposes further claims to the same fraud.';

  async function terminate(p: string, memberId: string, client: Client, extra: Json = {}) {
    await elevate(client, 'member_moderation_terminate');
    return client.inject({
      method: 'POST',
      url: `/api/v1/p/${p}/members/${memberId}/moderation/terminate`,
      payload: {
        reason_code: 'r14-forgery',
        rationale: 'Terminated by the Panel.',
        immediate_termination_reason: IMMEDIATE_REASON,
        ...extra,
      },
    });
  }

  async function actionRow(memberId: string): Promise<Record<string, unknown>> {
    const c = await td.pool.connect();
    try {
      const r = await c.query(
        `SELECT escalation_inadequacy_ciphertext, escalation_proportionality_ciphertext,
                immediate_termination_reason_ciphertext, evidence_refs,
                r7a_restorations_used_snapshot, dwell_policy_version
           FROM member_moderation_actions
          WHERE member_id = $1 AND action = 'terminate'`,
        [memberId],
      );
      return r.rows[0] as Record<string, unknown>;
    } finally {
      c.release();
    }
  }

  const errCode = (res: { json: () => unknown }) => (res.json() as { error: { code: string } }).error.code;

  // ── AC6 — the two-part escalation justification ───────────────────────────────────────────────

  it('AC6: a termination WITHOUT the escalation parts is a 422 naming the missing part, and writes nothing', async () => {
    const { p, memberId, client } = await suspended();
    const res = await terminate(p, memberId, client);
    expect(res.statusCode).toBe(422);
    expect(errCode(res)).toBe('member_moderation.escalation_required');
    expect((res.json() as { error: { details: { part: string } } }).error.details.part).toBe('inadequacy');

    // Fail-CLOSED: the member is still merely suspended and no terminate row exists.
    const hist = await client.inject({ method: 'GET', url: `/api/v1/p/${p}/members/${memberId}/moderation` });
    expect((hist.json() as { current_status: string }).current_status).toBe('suspended');
    expect(await actionRow(memberId)).toBeUndefined();
  });

  it('AC6: each part is required INDEPENDENTLY — supplying only (a) names (b)', async () => {
    const { p, memberId, client } = await suspended();
    const res = await terminate(p, memberId, client, { escalation_inadequacy: INADEQUACY });
    expect(res.statusCode).toBe(422);
    expect((res.json() as { error: { details: { part: string } } }).error.details.part).toBe('proportionality');
  });

  it('⭐ AC6: part (a) RESTATING part (b) is a typed 422 — the check no CHECK constraint could make', async () => {
    const { p, memberId, client } = await suspended();
    const res = await terminate(p, memberId, client, {
      escalation_inadequacy: PROPORTIONALITY,
      escalation_proportionality: PROPORTIONALITY,
    });
    expect(res.statusCode).toBe(422);
    expect(errCode(res)).toBe('member_moderation.escalation_restatement');
  });

  it('AC6: the substance floor rejects "n/a" — a floor, not a quality test', async () => {
    const { p, memberId, client } = await suspended();
    const res = await terminate(p, memberId, client, {
      escalation_inadequacy: 'n/a',
      escalation_proportionality: PROPORTIONALITY,
    });
    expect(res.statusCode).toBe(422);
    expect(errCode(res)).toBe('member_moderation.escalation_required');
    expect((res.json() as { error: { details: { reason: string } } }).error.details.reason).toBe('too_short');
  });

  it('AC6: an escalation part on a SUSPEND is a typed 422 — the iff bites both ways', async () => {
    const p = randomUUID();
    createdPariwars.push(p);
    const memberId = await seedActiveMember(p);
    const a = await authenticate({ displayName: 'Trustee One' });
    await grant(a.userId, p, 'pariwar_admin');
    await elevate(a.client, 'member_moderation_suspend');
    const res = await a.client.inject({
      method: 'POST',
      url: `/api/v1/p/${p}/members/${memberId}/moderation/suspend`,
      payload: { reason_code: 'r14-forgery', rationale: 'Suspended.', escalation_inadequacy: INADEQUACY },
    });
    expect(res.statusCode).toBe(422);
    expect(errCode(res)).toBe('member_moderation.escalation_not_applicable');
  });

  it('⭐ AC6: a valid termination stores TWO DISTINCT ciphertexts, each decrypting to its OWN part', async () => {
    const { p, memberId, client } = await suspended();
    const res = await terminate(p, memberId, client, {
      escalation_inadequacy: INADEQUACY,
      escalation_proportionality: PROPORTIONALITY,
    });
    expect(res.statusCode).toBe(200);

    const row = await actionRow(memberId);
    const a = row['escalation_inadequacy_ciphertext'] as string;
    const b = row['escalation_proportionality_ciphertext'] as string;
    expect(a).toBeTruthy();
    expect(b).toBeTruthy();
    // ⚠ Distinct CIPHERTEXTS prove nothing on their own — envelope encryption is non-deterministic,
    // so even the same plaintext would differ. The PLAINTEXT round-trip is the real assertion: it is
    // what rules out concatenation into one field and cross-assignment between the two.
    expect(await decryptModerationRationale(a, p, deps.encryption)).toBe(INADEQUACY);
    expect(await decryptModerationRationale(b, p, deps.encryption)).toBe(PROPORTIONALITY);
  });

  // ── AC4 — evidence references ─────────────────────────────────────────────────────────────────

  it('AC4: prose evidence is rejected at the transport boundary (400), never truncated', async () => {
    const { p, memberId, client } = await suspended();
    const res = await terminate(p, memberId, client, {
      escalation_inadequacy: INADEQUACY,
      escalation_proportionality: PROPORTIONALITY,
      evidence_refs: [{ kind: 'complaint', ref: 'the member submitted a forged ration card' }],
    });
    expect(res.statusCode).toBe(400);
    expect(await actionRow(memberId)).toBeUndefined();
  });

  it('AC4: well-formed references are stored verbatim as an array', async () => {
    const { p, memberId, client } = await suspended();
    const refs = [
      { kind: 'complaint', ref: 'CMP-2026-0001' },
      { kind: 'document', ref: 'doc/2026/07_31.pdf' },
    ];
    const res = await terminate(p, memberId, client, {
      escalation_inadequacy: INADEQUACY,
      escalation_proportionality: PROPORTIONALITY,
      evidence_refs: refs,
    });
    expect(res.statusCode).toBe(200);
    expect((await actionRow(memberId))['evidence_refs']).toEqual(refs);
  });

  it('AC4: evidence is OPTIONAL and defaults to an empty array, never NULL', async () => {
    const { p, memberId, client } = await suspended();
    expect(
      (await terminate(p, memberId, client, {
        escalation_inadequacy: INADEQUACY,
        escalation_proportionality: PROPORTIONALITY,
      })).statusCode,
    ).toBe(200);
    expect((await actionRow(memberId))['evidence_refs']).toEqual([]);
  });

  // ── AC7 — the restoration-exhaustion snapshot ─────────────────────────────────────────────────

  it('⭐ AC7: the snapshot is NULL — *unknown* — on a Pariwar with no resolved R7(A) threshold, NEVER 0', async () => {
    const { p, memberId, client } = await suspended();
    expect(
      (await terminate(p, memberId, client, {
        escalation_inadequacy: INADEQUACY,
        escalation_proportionality: PROPORTIONALITY,
      })).statusCode,
    ).toBe(200);
    const row = await actionRow(memberId);
    // ⛔ THE POINT OF THIS ASSERTION: `0` here would let "restorations exhausted" read as "never
    // restored" on exactly the Pariwars where the threshold was never provisioned — the
    // false-all-clear D1-B forbids. `null` is the honest answer and must survive to the column.
    expect(row['r7a_restorations_used_snapshot']).toBeNull();
    // AC5 item 7: the two non-PII columns; `dwell_policy_version` is Task 6's to populate.
    expect(row).toHaveProperty('dwell_policy_version');
  });

  it('AC7/Q5(b) REJECTED: an unresolved projection never REFUSES the decision — the terminate still 200s', async () => {
    const { p, memberId, client } = await suspended();
    // The same Pariwar as above: no restoration-discipline registry clause, so the fact is unknown.
    // A hard block below the threshold (Q5 option (b)) would have made this a 4xx. It was PUT AND
    // REJECTED — a projection may not refuse an authorised Panel decision (D6).
    expect(
      (await terminate(p, memberId, client, {
        escalation_inadequacy: INADEQUACY,
        escalation_proportionality: PROPORTIONALITY,
      })).statusCode,
    ).toBe(200);
  });

  // ── ⭐ REVERT-SANITY — the DB gates, driven from RAW SQL past every TypeScript layer ───────────

  describe('the database constraints have teeth (revert-sanity)', () => {
    /** Insert a moderation row directly, bypassing the route, the domain and the contracts. */
    async function rawInsert(cols: Record<string, unknown>): Promise<{ code: string } | null> {
      const p = randomUUID();
      createdPariwars.push(p);
      const memberId = await seedActiveMember(p);
      const base: Record<string, unknown> = {
        member_id: memberId,
        pariwar_id: p,
        action: 'terminate',
        reason_code: 'r14-forgery',
        decision_note_ciphertext: 'enc:v1:whatever',
        actor_id: randomUUID(),
        actor_display: 'Raw Writer',
        rejoin_permitted_at: new Date(),
        acted_at: new Date(),
        ...cols,
      };
      const keys = Object.keys(base);
      const c = await td.pool.connect();
      try {
        await c.query(
          `INSERT INTO member_moderation_actions (${keys.join(', ')})
           VALUES (${keys.map((_, i) => `$${i + 1}`).join(', ')})`,
          keys.map((k) => base[k]),
        );
        return null;
      } catch (err) {
        return { code: (err as { code: string }).code };
      } finally {
        c.release();
      }
    }

    it('⭐ escalation_iff_terminate: a raw `terminate` missing both parts raises 23514', async () => {
      expect(await rawInsert({})).toEqual({ code: '23514' });
    });

    it('⭐ escalation_iff_terminate bites BOTH ways: a raw `suspend` CARRYING a part raises 23514', async () => {
      expect(
        await rawInsert({
          action: 'suspend',
          rejoin_permitted_at: null,
          escalation_inadequacy_ciphertext: 'enc:v1:a',
          escalation_proportionality_ciphertext: 'enc:v1:b',
        }),
      ).toEqual({ code: '23514' });
    });

    it('a raw `terminate` carrying only ONE part still raises 23514 — both, or neither', async () => {
      expect(await rawInsert({ escalation_inadequacy_ciphertext: 'enc:v1:a' })).toEqual({ code: '23514' });
    });

    it('a raw `terminate` carrying BOTH parts is ACCEPTED — the constraint permits the legal shape', async () => {
      expect(
        await rawInsert({
          escalation_inadequacy_ciphertext: 'enc:v1:a',
          escalation_proportionality_ciphertext: 'enc:v1:b',
        }),
      ).toBeNull();
    });

    /** The three evidence CHECKs, each driven to its own rejection (AC4). */
    async function rawEvidence(value: unknown): Promise<{ code: string } | null> {
      return rawInsert({
        escalation_inadequacy_ciphertext: 'enc:v1:a',
        escalation_proportionality_ciphertext: 'enc:v1:b',
        evidence_refs: JSON.stringify(value),
      });
    }

    it('⭐ AC4: the per-entry SHAPE check is the half that closes free-text evidence', async () => {
      // Each of these satisfies array-ness AND the cap — which is exactly why the shape CHECK has to
      // exist. A raw-SQL writer with only those two constraints could store prose.
      for (const bad of [
        [{ kind: 'complaint', ref: 'a full sentence of prose about the member' }], // prose ref
        [{ kind: 'anything', ref: 'CMP-1' }], // unknown kind
        [{ kind: 'complaint', ref: 'CMP-1', note: 'prose' }], // third key
        [{ kind: 'complaint' }], // missing ref
        ['CMP-1'], // non-object entry
        [{ kind: 'complaint', ref: 'A'.repeat(65) }], // over the length bound
      ]) {
        expect(await rawEvidence(bad), JSON.stringify(bad)).toEqual({ code: '23514' });
      }
    });

    it('AC4: array-ness and the cap are SEPARATE inline CHECKs — a non-array and an over-cap list each raise 23514', async () => {
      // ⚠ The non-array case is the one that raised 22023 (a runtime "cannot get array length of a
      // non-array") before the cap CHECK was guarded — a runtime error, not a constraint violation.
      // Postgres does not guarantee `AND` short-circuits, so the guard is load-bearing, not tidy.
      expect(await rawEvidence({ kind: 'complaint', ref: 'CMP-1' })).toEqual({ code: '23514' });
      expect(
        await rawEvidence(Array.from({ length: 11 }, (_, i) => ({ kind: 'complaint', ref: `CMP-${i}` }))),
      ).toEqual({ code: '23514' });
    });

    it('AC4: the legal shapes are ACCEPTED — `[]` and a real reference list', async () => {
      expect(await rawEvidence([])).toBeNull();
      expect(await rawEvidence([{ kind: 'helpdesk-ticket', ref: 'HD-2026-0007' }])).toBeNull();
    });
  });
});
