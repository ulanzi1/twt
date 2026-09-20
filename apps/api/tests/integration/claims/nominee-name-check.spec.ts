// Nominee name-check surface E2E (live DB :5433) — Story 6.18 (AC1, AC2, AC3, AC11).
//
// Drives GET/POST …/admin/claims/:claimCaseId/nominee-name-check through the REAL admin guard chain
// via a cookie-threading client. Asserts the HTTP-layer behaviours the story pins:
//   · the AUTHORIZATION SPLIT (AC1) — the READ key and the CHECK key are DIFFERENT keys with
//     DIFFERENT holders, which is the whole reason two were minted. A `verifier` may look and may
//     ⛔ NOT record; a `district_admin` may do both.
//   · the 400 boundary (AC3) — a clerical difference without a selected reason, and a reason on a
//     verdict that forbids one.
//   · the DISTRICT ADMIN's view of a return (AC11) — the Pariwar Admin's note reaches the person who
//     has to act on it, and the derived `resubmitted` flag tracks the real predicate.
//
// ⚠ Own-committing seed writes; fresh random pariwarId per test; events_log append-only
// ([[project_live_db_test_gotchas]]).

import { randomUUID } from 'node:crypto';

import { claim, ids } from '@twt/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { AppDeps } from '../../../src/context.js';
import * as service from '../../../src/modules/auth/admin/admin-auth.service.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { buildServer } from '../../../src/server.js';
import { buildTestDeps, hasDatabase, makeClient, type TestDeps } from '../_setup.js';
import { seedNomineeNameCheck } from '../_nominee-name-check-fixture.js';
import { encryptNomineeBankField } from '../../../src/modules/claims/nominee-bank-crypto.js';
import { encryptNomineeField } from '../../../src/modules/nominee/nominee-crypto.js';
import { FakeWebAuthnProvider } from '../_webauthn-fake.js';

type Client = ReturnType<typeof makeClient>;

describe.skipIf(!hasDatabase)('Nominee name-check surface — E2E (:5433)', () => {
  let td: TestDeps;
  let deps: AppDeps;
  let app: Awaited<ReturnType<typeof buildServer>>;
  let fakeWebauthn: FakeWebAuthnProvider;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    if (!hasDatabase) return;
    fakeWebauthn = new FakeWebAuthnProvider();
    td = await buildTestDeps({ webauthn: fakeWebauthn });
    deps = td.deps;
    app = await buildServer(deps);
    await app.ready();
  });

  afterAll(async () => {
    if (!hasDatabase) return;
    await app.close();
    const c = await td.pool.connect();
    try {
      if (createdUserIds.length > 0) {
        await c.query(`DELETE FROM admin_sessions WHERE sess ->> 'userId' = ANY($1)`, [createdUserIds]);
        await c.query(`DELETE FROM role_grants WHERE user_id = ANY($1)`, [createdUserIds]);
        await c.query(`DELETE FROM users WHERE id = ANY($1)`, [createdUserIds]);
      }
    } finally {
      c.release();
    }
    await td.pool.end();
  });

  async function authenticate(): Promise<{ client: Client; userId: string }> {
    const email = `nnc-${randomUUID()}@example.test`;
    const password = 'CorrectHorseBatteryStaple9';
    const userId = await service.createAdminAccount(deps, { email, password });
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

  async function grant(userId: string, pariwarId: string, role: string, dim: string, value: string | null): Promise<void> {
    const c = await td.pool.connect();
    try {
      await c.query(
        `INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value) VALUES ($1, $2, $3, $4, $5)`,
        [userId, pariwarId, role, dim, value],
      );
    } finally {
      c.release();
    }
  }

  /** A deceased member with a posting district (the server derives the authz district from it). */
  async function seedDeceasedMember(pariwarId: string, district: string): Promise<ids.MemberId> {
    const memberId = randomUUID();
    const c = await td.pool.connect();
    try {
      await c.query(
        `INSERT INTO members (member_id, pariwar_id, state, state_event_version, created_at, updated_at)
         VALUES ($1, $2, 'active', 0, now(), now())`,
        [memberId, pariwarId],
      );
      await c.query(
        `INSERT INTO member_postings (member_id, pariwar_id, district, is_retirement, created_at)
         VALUES ($1, $2, $3, false, now())`,
        [memberId, pariwarId, district],
      );
    } finally {
      c.release();
    }
    return ids.memberId(memberId);
  }

  /** Drive a claim to `verifier_review` through the projector (state is projector-only). */
  async function seedClaim(pariwarId: string, deceasedMemberId: ids.MemberId): Promise<string> {
    const claimCaseId = ids.claimId(randomUUID());
    const scopeTx = await openScopeTx(deps, pariwarId);
    const emit = (from: string | null, to: string, eventType: string, extra: Record<string, unknown> = {}) =>
      claim.projectClaimState(scopeTx.client, {
        claimCaseId,
        pariwarId: ids.pariwarId(pariwarId),
        deceasedMemberId,
        intakeChannels: ['helpline'],
        claimantActorId: null,
        eventType: eventType as never,
        payload: { from_state: from, to_state: to, trigger: 'seed', actor: 'system', ...extra },
        actorId: null,
      });
    try {
      await emit(null, 'intake_pending', 'claim.intake_initiated', {
        deceased_member_id: String(deceasedMemberId),
        intake_channel: 'helpline',
        claimant_actor_id: null,
      });
      await emit('intake_pending', 'intake_converged', 'claim.intake_converged');
      await emit('intake_converged', 'documents_pending', 'claim.documents_received');
      await emit('documents_pending', 'verification_in_progress', 'claim.peer_mesh_pinged', {
        selected_member_ids: [randomUUID()],
        metric_id: 'district_cohort_v1',
        metric_version: 1,
      });
      await emit('verification_in_progress', 'verifier_review', 'claim.verifier_reviewing');
      await closeScopeTx(scopeTx, true);
    } catch (err) {
      await closeScopeTx(scopeTx, false);
      throw err;
    }
    return String(claimCaseId);
  }


  /** Seed a declared nominee with an ENCRYPTED name (Tier-1, the real envelope). */
  async function seedNominee(
    pariwarId: string,
    memberId: ids.MemberId,
    rank: number,
    name: string,
    relationship = 'spouse',
    splitPct = 100,
  ): Promise<void> {
    const [ciphertext, mobile] = await Promise.all([
      encryptNomineeField(name, pariwarId, deps.encryption),
      // `mobile_ciphertext` is NOT NULL on the table. ⭐ The AC2 read must never surface it, which is
      // exactly why seeding a real one here is worth the trouble: the never-echo assertions below
      // would pass vacuously against a null column.
      encryptNomineeField('9876543210', pariwarId, deps.encryption),
    ]);
    const c = await td.pool.connect();
    try {
      await c.query(
        `INSERT INTO member_nominees (member_id, pariwar_id, rank, name_ciphertext, mobile_ciphertext, relationship, split_pct, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, now())`,
        [memberId, pariwarId, rank, ciphertext, mobile, relationship, splitPct],
      );
    } finally {
      c.release();
    }
  }

  /** Seed two bank accounts with a REAL encrypted holder name + a raw-marker account number/IFSC. */
  async function seedAccountsWithNames(
    pariwarId: string,
    claimCaseId: string,
    holder1: string,
    holder2: string,
  ): Promise<void> {
    const [h1, h2, acct, ifsc] = await Promise.all([
      encryptNomineeBankField(holder1, pariwarId, deps.encryption),
      encryptNomineeBankField(holder2, pariwarId, deps.encryption),
      encryptNomineeBankField('999888777666', pariwarId, deps.encryption),
      encryptNomineeBankField('SBIN0009999', pariwarId, deps.encryption),
    ]);
    const c = await td.pool.connect();
    try {
      await c.query(`DELETE FROM claim_nominee_bank_accounts WHERE claim_case_id = $1`, [claimCaseId]);
      await c.query(
        `INSERT INTO claim_nominee_bank_accounts
           (claim_case_id, pariwar_id, account_rank, account_holder_name_ciphertext,
            account_number_ciphertext, ifsc_ciphertext, bank_name, ifsc_validated)
         VALUES ($1,$2,1,$3,$5,$6,'State Bank of India',true),
                ($1,$2,2,$4,$5,$6,'HDFC Bank',true)`,
        [claimCaseId, pariwarId, h1, h2, acct, ifsc],
      );
    } finally {
      c.release();
    }
  }

  const url = (p: string, c: string) => `/api/v1/p/${p}/admin/claims/${c}/nominee-name-check`;

  async function setup(role: string): Promise<{ client: Client; pariwarId: string; claimCaseId: string }> {
    const pariwarId = randomUUID();
    const district = `D-${randomUUID().slice(0, 8)}`;
    const { client, userId } = await authenticate();
    await grant(userId, pariwarId, role, 'district', district);
    const memberId = await seedDeceasedMember(pariwarId, district);
    const claimCaseId = await seedClaim(pariwarId, memberId);
    await client.inject({ method: 'POST', url: '/api/v1/auth/scope', payload: { pariwarId } });
    return { client, pariwarId, claimCaseId };
  }

  // ── AC1 — the two keys are genuinely two ─────────────────────────────────────────────────
  it('⭐ AC1 — a district_admin may READ the names', async () => {
    const { client, pariwarId, claimCaseId } = await setup('district_admin');
    const res = await client.inject({ method: 'GET', url: url(pariwarId, claimCaseId) });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ claim_case_id: claimCaseId, accounts_complete: false });
  });

  it('⭐⭐ AC1 — a VERIFIER may READ but may ⛔ NOT RECORD: the read/write split is the whole point', async () => {
    const { client, pariwarId, claimCaseId } = await setup('verifier');

    // They hold `claim.view_nominee_name_check` — cl.1's "everyone accountable must be able to see".
    const read = await client.inject({ method: 'GET', url: url(pariwarId, claimCaseId) });
    expect(read.statusCode).toBe(200);

    // ⛔ But NOT `claim.check_nominee_name` — `-226` cl.3 names the District Admin as the reviewer.
    // If this ever returns anything but 403, the two keys have collapsed into one.
    //
    // ⚠ THE BODY MUST BE STRUCTURALLY VALID to reach the permission hook at all: Fastify's lifecycle
    // is validation → preHandler, so a malformed payload 400s BEFORE the authz check and would make
    // this test pass for entirely the wrong reason.
    const body = read.json() as {
      nominee_declaration_token: string;
      accounts: { account_rank: number; account_updated_at: string }[];
    };
    const write = await client.inject({
      method: 'POST',
      url: url(pariwarId, claimCaseId),
      payload: {
        nominee_declaration_token: body.nominee_declaration_token || 'tok',
        accounts: [1, 2].map((rank) => ({
          account_rank: rank,
          account_updated_at: body.accounts[rank - 1]?.account_updated_at ?? '2026-09-20T10:00:00.000Z',
          verdict: 'matches',
        })),
      },
    });
    expect(write.statusCode).toBe(403);
  });

  it('⛔ AC1 — a role holding NEITHER key is refused the read', async () => {
    const { client, pariwarId, claimCaseId } = await setup('block_admin');
    const res = await client.inject({ method: 'GET', url: url(pariwarId, claimCaseId) });
    expect(res.statusCode).toBe(403);
  });

  it('⛔ an unauthenticated caller is refused (human-actor gated)', async () => {
    const { pariwarId, claimCaseId } = await setup('district_admin');
    const anon = makeClient(app);
    const res = await anon.inject({ method: 'GET', url: url(pariwarId, claimCaseId) });
    expect([401, 403]).toContain(res.statusCode);
  });

  // ── AC2 — the read's shape, its absences and its silences ────────────────────────────────
  describe('AC2 — the two names, and everything the read must NOT carry', () => {
    it('⛔⛔ NEVER echoes the account number, the raw IFSC or a VPA — only the NAME', async () => {
      const { client, pariwarId, claimCaseId } = await setup('district_admin');
      await seedAccountsWithNames(pariwarId, claimCaseId, 'A. Devi', 'Ravi Kumar');

      const res = await client.inject({ method: 'GET', url: url(pariwarId, claimCaseId) });
      expect(res.statusCode).toBe(200);
      const dump = res.body;

      // ⭐ The names ARE there — this is the ONE named exception to nominee-bank.ts's rule.
      expect(dump).toContain('A. Devi');
      expect(dump).toContain('Ravi Kumar');
      // ⛔ And the rest of the account is NOT. These are the plaintexts seeded above; if the read
      // ever widens to "the account", this is what catches it.
      expect(dump).not.toContain('999888777666');
      expect(dump).not.toContain('SBIN0009999');
      expect(dump).not.toContain('vpa');
      expect(dump).not.toContain('account_number');
      expect(dump).not.toContain('ifsc');
    });

    it("⛔ NEVER echoes the nominee's mobile or address — AC2 names them explicitly", async () => {
      const pariwarId = randomUUID();
      const district = `D-${randomUUID().slice(0, 8)}`;
      const { client, userId } = await authenticate();
      await grant(userId, pariwarId, 'district_admin', 'district', district);
      const memberId = await seedDeceasedMember(pariwarId, district);
      // The helper seeds a REAL encrypted mobile, so this assertion is not vacuous.
      await seedNominee(pariwarId, memberId, 1, 'Asha Devi');
      const claimCaseId = await seedClaim(pariwarId, memberId);
      await client.inject({ method: 'POST', url: '/api/v1/auth/scope', payload: { pariwarId } });

      const res = await client.inject({ method: 'GET', url: url(pariwarId, claimCaseId) });
      expect(res.body).toContain('Asha Devi');
      expect(res.body).not.toContain('9876543210');
      expect(res.body).not.toContain('mobile');
      expect(res.body).not.toContain('address');
    });

    it('⭐ AC1 — a pariwar_admin and a helpline_operator may BOTH read (cl.1 and cl.4)', async () => {
      // ⭐ Their scopeCeiling is `pariwar` and this key is checked at `district` — the asymmetry runs
      // ONE way, so a pariwar grant satisfies a district check (`scope.ts:288`). If this ever 403s,
      // the two grants are inert and cl.1's duty is undischargeable for the operator who carries it.
      for (const role of ['pariwar_admin', 'helpline_operator']) {
        const pariwarId = randomUUID();
        const district = `D-${randomUUID().slice(0, 8)}`;
        const { client, userId } = await authenticate();
        await grant(userId, pariwarId, role, 'pariwar', pariwarId);
        const memberId = await seedDeceasedMember(pariwarId, district);
        const claimCaseId = await seedClaim(pariwarId, memberId);
        await client.inject({ method: 'POST', url: '/api/v1/auth/scope', payload: { pariwarId } });

        const read = await client.inject({ method: 'GET', url: url(pariwarId, claimCaseId) });
        expect(read.statusCode, `${role} could not READ the names`).toBe(200);

        // ⛔ But NEITHER may record the verdict — `-226` cl.3 names the District Admin alone.
        const write = await client.inject({
          method: 'POST',
          url: url(pariwarId, claimCaseId),
          payload: {
            nominee_declaration_token: 'tok',
            accounts: [1, 2].map((rank) => ({
              account_rank: rank,
              account_updated_at: '2026-09-20T10:00:00.000Z',
              verdict: 'matches',
            })),
          },
        });
        expect(write.statusCode, `${role} was able to RECORD a verdict`).toBe(403);
      }
    });

    it('⭐ shows BOTH declared nominees with their relationship + split', async () => {
      const pariwarId = randomUUID();
      const district = `D-${randomUUID().slice(0, 8)}`;
      const { client, userId } = await authenticate();
      await grant(userId, pariwarId, 'district_admin', 'district', district);
      const memberId = await seedDeceasedMember(pariwarId, district);
      await seedNominee(pariwarId, memberId, 1, 'Asha Devi', 'spouse', 75);
      await seedNominee(pariwarId, memberId, 2, 'Ravi Kumar', 'child', 25);
      const claimCaseId = await seedClaim(pariwarId, memberId);
      await client.inject({ method: 'POST', url: '/api/v1/auth/scope', payload: { pariwarId } });

      const body = (await client.inject({ method: 'GET', url: url(pariwarId, claimCaseId) })).json() as {
        declared_nominees: { rank: number; relationship: string; split_pct: number; nominee_name: { state: string; value?: string } }[];
        nominee_declared_at: string | null;
      };
      expect(body.declared_nominees).toHaveLength(2);
      expect(body.declared_nominees[0]).toMatchObject({ rank: 1, relationship: 'spouse', split_pct: 75 });
      expect(body.declared_nominees[0]!.nominee_name).toEqual({ state: 'readable', value: 'Asha Devi' });
      expect(body.nominee_declared_at).not.toBeNull();
    });

    it('says ZERO nominees explicitly — an empty list, and a NULL declared-at (AC2)', async () => {
      const { client, pariwarId, claimCaseId } = await setup('district_admin');
      const body = (await client.inject({ method: 'GET', url: url(pariwarId, claimCaseId) })).json() as {
        declared_nominees: unknown[];
        nominee_declared_at: string | null;
      };
      expect(body.declared_nominees).toEqual([]);
      expect(body.nominee_declared_at).toBeNull();
    });

    it('⭐ an RTBF-anonymized nominee reads as `anonymized`, ⛔ NEVER as the literal "[anonymized]"', async () => {
      const pariwarId = randomUUID();
      const district = `D-${randomUUID().slice(0, 8)}`;
      const { client, userId } = await authenticate();
      await grant(userId, pariwarId, 'district_admin', 'district', district);
      const memberId = await seedDeceasedMember(pariwarId, district);
      // `member/anonymize.ts` writes the sentinel ENCRYPTED — it decrypts fine and is NOT a name.
      await seedNominee(pariwarId, memberId, 1, '[anonymized]');
      const claimCaseId = await seedClaim(pariwarId, memberId);
      await client.inject({ method: 'POST', url: '/api/v1/auth/scope', payload: { pariwarId } });

      const res = await client.inject({ method: 'GET', url: url(pariwarId, claimCaseId) });
      const body = res.json() as { declared_nominees: { nominee_name: { state: string } }[] };
      expect(body.declared_nominees[0]!.nominee_name).toEqual({ state: 'anonymized' });
      // ⛔ The sentinel must never reach the wire as a name a District Admin could read as a person.
      expect(res.body).not.toContain('[anonymized]');
    });

    it('⭐ a CORRUPT envelope reads as `unreadable` — a distinct state, ⛔ never a blank or a sentinel', async () => {
      const { client, pariwarId, claimCaseId } = await setup('district_admin');
      const c = await td.pool.connect();
      try {
        await c.query(
          `INSERT INTO claim_nominee_bank_accounts
             (claim_case_id, pariwar_id, account_rank, account_holder_name_ciphertext,
              account_number_ciphertext, ifsc_ciphertext, bank_name, ifsc_validated)
           VALUES ($1,$2,1,'not-a-parseable-envelope','x','y','State Bank of India',true)`,
          [claimCaseId, pariwarId],
        );
      } finally {
        c.release();
      }
      const body = (await client.inject({ method: 'GET', url: url(pariwarId, claimCaseId) })).json() as {
        accounts: { holder_name: { state: string } }[];
      };
      expect(body.accounts[0]!.holder_name).toEqual({ state: 'unreadable' });
    });

    it('⭐⭐ AC12 — a Devanagari name PLANTED IN THE DB still reads back (the gate is INPUT-only)', async () => {
      // ⛔ The boundary now refuses a non-Latin name, so this row can only be created directly —
      // which is exactly the situation of every name captured BEFORE this story shipped. There is
      // ⛔ no backfill, and that only works because the gate never runs on output.
      const pariwarId = randomUUID();
      const district = `D-${randomUUID().slice(0, 8)}`;
      const { client, userId } = await authenticate();
      await grant(userId, pariwarId, 'district_admin', 'district', district);
      const memberId = await seedDeceasedMember(pariwarId, district);
      await seedNominee(pariwarId, memberId, 1, 'आशा देवी');
      const claimCaseId = await seedClaim(pariwarId, memberId);
      await seedAccountsWithNames(pariwarId, claimCaseId, 'आशा देवी', 'रवि कुमार');
      await client.inject({ method: 'POST', url: '/api/v1/auth/scope', payload: { pariwarId } });

      const res = await client.inject({ method: 'GET', url: url(pariwarId, claimCaseId) });
      // ⭐ 200, not 500 — a Latin gate on the OUTPUT schema would have made this a serializer error.
      expect(res.statusCode).toBe(200);
      const body = res.json() as {
        accounts: { holder_name: { state: string; value?: string } }[];
        declared_nominees: { nominee_name: { state: string; value?: string } }[];
      };
      expect(body.accounts[0]!.holder_name).toEqual({ state: 'readable', value: 'आशा देवी' });
      expect(body.declared_nominees[0]!.nominee_name).toEqual({ state: 'readable', value: 'आशा देवी' });
    });

    it('⭐⭐ the AI-6-3 DECOY: claim A never carries claim B\'s accounts, even with the SAME deceased', async () => {
      // Bank rows key on `claim_case_id`; nominee rows key on `deceased_member_id`. So two claims for
      // ONE deceased member SHARE their nominees and must ⛔ NEVER share their accounts — the exact
      // shape the verifier-console decoy test exists to catch, applied to this read.
      const pariwarId = randomUUID();
      const district = `D-${randomUUID().slice(0, 8)}`;
      const { client, userId } = await authenticate();
      await grant(userId, pariwarId, 'district_admin', 'district', district);
      const memberId = await seedDeceasedMember(pariwarId, district);
      await seedNominee(pariwarId, memberId, 1, 'Asha Devi');
      const claimA = await seedClaim(pariwarId, memberId);
      const claimB = await seedClaim(pariwarId, memberId);
      await seedAccountsWithNames(pariwarId, claimA, 'CLAIM-A-HOLDER-1', 'CLAIM-A-HOLDER-2');
      await seedAccountsWithNames(pariwarId, claimB, 'CLAIM-B-HOLDER-1', 'CLAIM-B-HOLDER-2');
      await client.inject({ method: 'POST', url: '/api/v1/auth/scope', payload: { pariwarId } });

      const a = await client.inject({ method: 'GET', url: url(pariwarId, claimA) });
      expect(a.body).toContain('CLAIM-A-HOLDER-1');
      // ⛔ The decoy's accounts must be entirely absent.
      expect(a.body).not.toContain('CLAIM-B-HOLDER');
      // ⭐ But the NOMINEES are legitimately shared — they belong to the deceased, not the claim.
      expect(a.body).toContain('Asha Devi');
    });
  });

  // ── AC3 — the 400 boundary, both directions ──────────────────────────────────────────────
  it('⛔ AC3/cl.5 — a clerical difference WITHOUT a selected reason is a 400', async () => {
    const { client, pariwarId, claimCaseId } = await setup('district_admin');
    await seedNomineeNameCheck(deps, pariwarId, claimCaseId);
    const read = await client.inject({ method: 'GET', url: url(pariwarId, claimCaseId) });
    const body = read.json() as { nominee_declaration_token: string; accounts: { account_rank: number; account_updated_at: string }[] };

    const res = await client.inject({
      method: 'POST',
      url: url(pariwarId, claimCaseId),
      payload: {
        nominee_declaration_token: body.nominee_declaration_token,
        accounts: body.accounts.map((a) => ({
          account_rank: a.account_rank,
          account_updated_at: a.account_updated_at,
          verdict: 'clerical_difference',
        })),
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it('⛔ AC3 — a reason on a verdict that FORBIDS one is also a 400 (the rule runs both ways)', async () => {
    const { client, pariwarId, claimCaseId } = await setup('district_admin');
    await seedNomineeNameCheck(deps, pariwarId, claimCaseId);
    const read = await client.inject({ method: 'GET', url: url(pariwarId, claimCaseId) });
    const body = read.json() as { nominee_declaration_token: string; accounts: { account_rank: number; account_updated_at: string }[] };

    const res = await client.inject({
      method: 'POST',
      url: url(pariwarId, claimCaseId),
      payload: {
        nominee_declaration_token: body.nominee_declaration_token,
        accounts: body.accounts.map((a) => ({
          account_rank: a.account_rank,
          account_updated_at: a.account_updated_at,
          verdict: 'matches',
          // ⭐ A reason here would put a "difference" on the record for a claim the District Admin
          // said had none — and AC8's highlight reads exactly that field.
          clerical_reason: 'initial',
        })),
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it('⭐ AC3 — a district_admin records the check, and the response carries it back', async () => {
    const { client, pariwarId, claimCaseId } = await setup('district_admin');
    await seedNomineeNameCheck(deps, pariwarId, claimCaseId);
    const read = await client.inject({ method: 'GET', url: url(pariwarId, claimCaseId) });
    const body = read.json() as { nominee_declaration_token: string; accounts: { account_rank: number; account_updated_at: string }[] };

    const res = await client.inject({
      method: 'POST',
      url: url(pariwarId, claimCaseId),
      payload: {
        nominee_declaration_token: body.nominee_declaration_token,
        accounts: body.accounts.map((a) => ({
          account_rank: a.account_rank,
          account_updated_at: a.account_updated_at,
          verdict: 'matches',
        })),
      },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ claim_case_id: claimCaseId, claim_state: 'verifier_review' });
    expect((res.json() as { current_check: { passing: boolean } }).current_check.passing).toBe(true);
  });

  it('⛔⛔ AC9 — the audited read line carries NO name and NO note', async () => {
    const { client, pariwarId, claimCaseId } = await setup('district_admin');
    await seedNomineeNameCheck(deps, pariwarId, claimCaseId);
    td.auditSink.events.length = 0;
    await client.inject({ method: 'GET', url: url(pariwarId, claimCaseId) });

    const lines = td.auditSink.ofType('admin_nominee_name_check.read');
    expect(lines.length).toBeGreaterThanOrEqual(1);
    const dump = JSON.stringify(td.auditSink.events);
    // The fixture's holder names are `enc:v1:holder-N` sentinels — none may appear.
    expect(dump).not.toContain('holder-1');
    expect(dump).not.toContain('holder-2');
    expect(dump).not.toContain('enc:v1');
  });
});
