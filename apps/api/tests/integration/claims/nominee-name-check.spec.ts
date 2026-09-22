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

  /**
   * @param displayName  pass `null` to build the NO-DISPLAY-NAME actor (D3 blocks them).
   *
   * ⚠⚠ A DISPLAY NAME IS NOW PART OF BEING A VALID CHECKER (code review 2026-09-20, D3 = option
   * A). This helper used to create the account with an email and a password only, so the "happy
   * path" 201 was recorded with `''` attribution — which is exactly the defect D3 fixed: the whole
   * design rests on *a NAMED HUMAN read the two names*, and an unattributable check looks like
   * attribution without being it. Every actor here is now named, and the un-named case is its own
   * test below.
   */
  async function authenticate(
    displayName: string | null = 'Anita (District Admin)',
  ): Promise<{ client: Client; userId: string }> {
    const email = `nnc-${randomUUID()}@example.test`;
    const password = 'CorrectHorseBatteryStaple9';
    const userId = await service.createAdminAccount(deps, { email, password });
    createdUserIds.push(userId);
    if (displayName !== null) await service.setAdminDisplayName(deps, userId, displayName);
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
    const [ciphertext, mobile, address] = await Promise.all([
      encryptNomineeField(name, pariwarId, deps.encryption),
      // `mobile_ciphertext` is NOT NULL on the table. ⭐ The AC2 read must never surface it, which is
      // exactly why seeding a real one here is worth the trouble: the never-echo assertions below
      // would pass vacuously against a null column.
      encryptNomineeField('9876543210', pariwarId, deps.encryption),
      // ⚠⚠ AND `address_ciphertext` IS NULLABLE, WHICH MADE HALF THAT CLAIM FALSE (code review
      // 2026-09-22). The comment above said the never-echo assertions were "not vacuous" — true of
      // the mobile, ⛔ NOT of the address, which was ⛔ never seeded at all. So
      // `expect(res.body).not.toContain('address')` was passing against a NULL column and could
      // ⛔ never have failed. AC2 names the address explicitly, so it is seeded for real now.
      encryptNomineeField('14 Nariman Point, Mumbai 400021', pariwarId, deps.encryption),
    ]);
    const c = await td.pool.connect();
    try {
      await c.query(
        `INSERT INTO member_nominees (member_id, pariwar_id, rank, name_ciphertext, mobile_ciphertext, address_ciphertext, relationship, split_pct, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())`,
        [memberId, pariwarId, rank, ciphertext, mobile, address, relationship, splitPct],
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
      // ⭐ POSITIVE CONTROL — the name IS returned, so "the rest is absent" is a DENIAL and ⛔ not
      // an empty response.
      expect(res.body).toContain('Asha Devi');
      // ⭐ The two PLAINTEXTS AC2 names, both now really on the row (see `seedNominee`).
      expect(res.body).not.toContain('9876543210');
      expect(res.body).not.toContain('Nariman Point');
      // ⛔ …and neither FIELD NAME appears either, so the read cannot be widened to carry them
      // under a null or a masked value.
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

  // ── AC11 — the District Admin's CORRECTION QUEUE ────────────────────────────────
  //
  // ⭐⭐ THE FIRST TEST HERE EXISTS BECAUSE THE ROUTE HAD A REAL BUG THAT REASONING HAD MISSED.
  // The gate was written as "stash the caller's district, or `null` for a pariwar-ceiling holder",
  // on the reasoning that a pariwar grant contains every geo target so it would pass anyway. It
  // does not: `scopeContains` fails an UNRESOLVED target CLOSED before it ever looks at the grant,
  // so a `null` district target was a 403 for `pariwar_admin` and `super_admin` alike — i.e. the
  // two roles most likely to be looking at a Pariwar-wide queue. Found by running the predicate,
  // ⛔ not by reading it ([[feedback_negative_claims_checkable_in_repo]]).
  describe('AC11 — the correction queue', () => {
    const queueUrl = (p: string) => `/api/v1/p/${p}/admin/claims/under-correction`;

    it('⭐ BOTH a district-scoped AND a pariwar-ceiling caller can read the queue', async () => {
      const pariwarId = randomUUID();
      const district = `D-${randomUUID().slice(0, 8)}`;

      const da = await authenticate();
      await grant(da.userId, pariwarId, 'district_admin', 'district', district);
      await da.client.inject({ method: 'POST', url: '/api/v1/auth/scope', payload: { pariwarId } });
      const daRes = await da.client.inject({ method: 'GET', url: queueUrl(pariwarId) });
      expect(daRes.statusCode, 'a district_admin must reach their own queue').toBe(200);

      // ⚠ THE REGRESSION GUARD. A pariwar_admin holds a PARIWAR-dimension grant and has no single
      // district, so a fixed `district` gate refuses them outright.
      const pa = await authenticate();
      await grant(pa.userId, pariwarId, 'pariwar_admin', 'pariwar', pariwarId);
      await pa.client.inject({ method: 'POST', url: '/api/v1/auth/scope', payload: { pariwarId } });
      const paRes = await pa.client.inject({ method: 'GET', url: queueUrl(pariwarId) });
      expect(paRes.statusCode, 'a pariwar_admin must reach the Pariwar-wide queue').toBe(200);
    });

    it('⛔ a role holding NEITHER key is refused (403) — the gate is a real question', async () => {
      const pariwarId = randomUUID();
      const other = await authenticate();
      // `state_trustee` gets NEITHER of this story's keys (AC1).
      await grant(other.userId, pariwarId, 'state_trustee', 'pariwar', pariwarId);
      await other.client.inject({ method: 'POST', url: '/api/v1/auth/scope', payload: { pariwarId } });
      const res = await other.client.inject({ method: 'GET', url: queueUrl(pariwarId) });
      expect(res.statusCode).toBe(403);
    });

    it('⛔ an UNAUTHENTICATED caller is refused — 401, a single code, ⛔ not a range', async () => {
      const client = makeClient(app);
      const res = await client.inject({ method: 'GET', url: queueUrl(randomUUID()) });
      expect(res.statusCode).toBe(401);
    });

    it('⛔ the queue is BOUNDED — an out-of-range limit is a 400 before the handler runs', async () => {
      const pariwarId = randomUUID();
      const da = await authenticate();
      await grant(da.userId, pariwarId, 'district_admin', 'district', `D-${randomUUID().slice(0, 8)}`);
      await da.client.inject({ method: 'POST', url: '/api/v1/auth/scope', payload: { pariwarId } });
      expect((await da.client.inject({ method: 'GET', url: `${queueUrl(pariwarId)}?limit=99999` })).statusCode).toBe(400);
      expect((await da.client.inject({ method: 'GET', url: `${queueUrl(pariwarId)}?limit=all` })).statusCode).toBe(400);
      // A valid in-range limit passes validation.
      expect((await da.client.inject({ method: 'GET', url: `${queueUrl(pariwarId)}?limit=5` })).statusCode).toBe(200);
    });

    it('⛔ checklist family 3 — a district_admin for district X sees ⛔ NO claim from district Y', async () => {
      const pariwarId = randomUUID();
      const districtX = `DX-${randomUUID().slice(0, 8)}`;
      const districtY = `DY-${randomUUID().slice(0, 8)}`;

      // A claim in district Y, sent back by its District Admin's own `does_not_match` check.
      const memberY = await seedDeceasedMember(pariwarId, districtY);
      const claimY = await seedClaim(pariwarId, memberY);
      await seedNomineeNameCheck(deps, pariwarId, claimY, {
        verdicts: ['matches', 'does_not_match'] as const,
      });

      const daX = await authenticate();
      await grant(daX.userId, pariwarId, 'district_admin', 'district', districtX);
      await daX.client.inject({ method: 'POST', url: '/api/v1/auth/scope', payload: { pariwarId } });
      const res = await daX.client.inject({ method: 'GET', url: queueUrl(pariwarId) });
      expect(res.statusCode).toBe(200);
      const ids_ = (res.json() as { items: { claim_case_id: string }[] }).items.map((i) => i.claim_case_id);
      expect(ids_, "district X must not see district Y's claim").not.toContain(claimY);

      // ⭐ THE POSITIVE CONTROL — without it this would pass just as happily if the queue were
      // empty for everyone, or the route returned `[]` unconditionally.
      const daY = await authenticate();
      await grant(daY.userId, pariwarId, 'district_admin', 'district', districtY);
      await daY.client.inject({ method: 'POST', url: '/api/v1/auth/scope', payload: { pariwarId } });
      const resY = await daY.client.inject({ method: 'GET', url: queueUrl(pariwarId) });
      const idsY = (resY.json() as { items: { claim_case_id: string }[] }).items.map((i) => i.claim_case_id);
      expect(idsY, "district Y's OWN District Admin must see it").toContain(claimY);
    });

    it('⛔ the queue carries ⛔ NO holder name and ⛔ NO nominee name (Trap 4)', async () => {
      const pariwarId = randomUUID();
      const district = `D-${randomUUID().slice(0, 8)}`;
      const memberId = await seedDeceasedMember(pariwarId, district);
      const claimCaseId = await seedClaim(pariwarId, memberId);
      await seedNomineeNameCheck(deps, pariwarId, claimCaseId, {
        verdicts: ['matches', 'does_not_match'] as const,
      });
      const da = await authenticate();
      await grant(da.userId, pariwarId, 'district_admin', 'district', district);
      await da.client.inject({ method: 'POST', url: '/api/v1/auth/scope', payload: { pariwarId } });

      const res = await da.client.inject({ method: 'GET', url: queueUrl(pariwarId) });
      expect(res.statusCode).toBe(200);
      const body = JSON.stringify(res.json());
      // The DTO has no field that could carry one — this pins that it does not grow one.
      for (const forbidden of ['holder_name', 'nominee_name', 'account_number', 'ifsc', 'name_difference_note']) {
        expect(body, `the queue exposed ${forbidden}`).not.toContain(forbidden);
      }
    });
  });
  // ── Checklist family 3, THE API LEG — cross-PARIWAR (tenant) denial ──────────────────────
  //
  // ⚠⚠ The family-3 test above is cross-DISTRICT inside ONE Pariwar. That proves the scope
  // resolver narrows a district admin to their own district; it proves ⛔ NOTHING about tenancy,
  // because both districts live in the same Pariwar and the same RLS scope. `grep -c PARIWAR_B`
  // over this whole spec returned **0** before this block: ⛔ no test had ever sent a session
  // scoped to one Pariwar at another Pariwar's claim.
  //
  // ⭐ THE SHAPE THAT MATTERS is the realistic bug, ⛔ not the obvious one: a real caller holds a
  // genuine grant and a genuine session — just for the WRONG tenant — and puts the other tenant's
  // id in the URL. Every route below is asserted against exactly that.
  describe('checklist family 3 (API) — a session scoped to Pariwar B cannot reach Pariwar A', () => {
    const crossQueueUrl = (p: string) => `/api/v1/p/${p}/admin/claims/under-correction`;

    /**
     * ⭐⭐ 404, ⛔ NOT 403 — AND THAT IS THE POINT, ⛔ not a compromise.
     *
     * The first draft of these tests asserted **403** and FAILED. The code was right and the test
     * was wrong: `middleware/scope-resolution` documents the contract in terms — *"0 rows → 404
     * (Pariwar doesn't exist OR no membership; **the two collapse, by design, to 'not found'**)"*.
     * A 403 would confirm the Pariwar EXISTS, turning every route into an enumeration oracle for
     * tenant ids; the same header notes a malformed id 404s for the identical reason.
     *
     * ⇒ so this asserts the SECURITY PROPERTY, ⛔ not merely the number: the status is exactly 404,
     * and the body carries ⛔ nothing that could distinguish "no such Pariwar" from "not yours".
     */
    function expectNotFoundNotForbidden(res: { statusCode: number; body: string }): void {
      // ⭐ A SINGLE code, ⛔ not a range — a range would pass whether the caller was stopped by
      // authz or merely lost, and those are different guarantees.
      expect(res.statusCode).toBe(404);
      expect(res.statusCode, 'a 403 here would confirm the Pariwar exists — an enumeration oracle').not.toBe(403);
      for (const leak of ['membership', 'grant', 'forbidden', 'permission', 'role']) {
        expect(res.body.toLowerCase(), `the 404 body leaked '${leak}' — it must not say WHY`).not.toContain(leak);
      }
    }

    /** A claim in Pariwar A, plus a fully-authenticated district_admin scoped to Pariwar B. */
    async function aClaimInA_andASessionInB(): Promise<{
      intruder: Client;
      owner: Client;
      pariwarA: string;
      pariwarB: string;
      claimInA: string;
    }> {
      const pariwarA = randomUUID();
      const pariwarB = randomUUID();
      const district = `D-${randomUUID().slice(0, 8)}`;

      const memberA = await seedDeceasedMember(pariwarA, district);
      const claimInA = await seedClaim(pariwarA, memberA);

      // ⭐ A REAL district_admin — but of Pariwar B. Same role, same dimension, wrong tenant.
      const { client, userId } = await authenticate();
      await grant(userId, pariwarB, 'district_admin', 'district', district);
      await client.inject({ method: 'POST', url: '/api/v1/auth/scope', payload: { pariwarId: pariwarB } });

      // ⭐⭐ AND the legitimate owner of the SAME claim, so every denial below can be paired with
      // the IDENTICAL call succeeding. Without this the 404s prove only that something is
      // unreachable — ⛔ not that it is unreachable BECAUSE of the tenant.
      const owner = await authenticate();
      await grant(owner.userId, pariwarA, 'district_admin', 'district', district);
      await owner.client.inject({ method: 'POST', url: '/api/v1/auth/scope', payload: { pariwarId: pariwarA } });

      return { intruder: client, owner: owner.client, pariwarA, pariwarB, claimInA };
    }

    it("⛔ GET the name check — a Pariwar B session is refused at Pariwar A's claim", async () => {
      const { intruder, owner, pariwarA, claimInA } = await aClaimInA_andASessionInB();
      expectNotFoundNotForbidden(await intruder.inject({ method: 'GET', url: url(pariwarA, claimInA) }));
      // ⭐ THE SAME URL, for the tenant that owns it.
      expect((await owner.inject({ method: 'GET', url: url(pariwarA, claimInA) })).statusCode).toBe(200);
    });

    it("⛔ POST the name check — a Pariwar B session cannot RECORD against Pariwar A's claim", async () => {
      const { intruder, pariwarA, claimInA } = await aClaimInA_andASessionInB();
      // ⚠ Structurally VALID body: Fastify runs validation BEFORE preHandler, so a malformed
      // payload would 400 before the authz check and pass this test for the wrong reason.
      const res = await intruder.inject({
        method: 'POST',
        url: url(pariwarA, claimInA),
        payload: {
          nominee_declaration_token: 'tok',
          accounts: [1, 2].map((rank) => ({
            account_rank: rank,
            account_updated_at: '2026-09-20T10:00:00.000Z',
            verdict: 'matches',
          })),
        },
      });
      expectNotFoundNotForbidden(res);
    });

    it("⛔ the correction QUEUE — a Pariwar B session cannot list Pariwar A's queue", async () => {
      const { intruder, owner, pariwarA } = await aClaimInA_andASessionInB();
      expectNotFoundNotForbidden(await intruder.inject({ method: 'GET', url: crossQueueUrl(pariwarA) }));
      expect((await owner.inject({ method: 'GET', url: crossQueueUrl(pariwarA) })).statusCode).toBe(200);
    });

    it('⭐⭐ POSITIVE CONTROL — the SAME calls succeed for the tenant that owns the claim', async () => {
      // ⚠⚠ WITHOUT THIS the three denials above are worthless: a typo in the URL helper, a broken
      // fixture, or a route that 403s for everybody would satisfy all three just as happily.
      // Same helpers, same shapes — only the tenant is right.
      const pariwarId = randomUUID();
      const district = `D-${randomUUID().slice(0, 8)}`;
      const memberId = await seedDeceasedMember(pariwarId, district);
      const claimCaseId = await seedClaim(pariwarId, memberId);

      const { client, userId } = await authenticate();
      await grant(userId, pariwarId, 'district_admin', 'district', district);
      await client.inject({ method: 'POST', url: '/api/v1/auth/scope', payload: { pariwarId } });

      expect((await client.inject({ method: 'GET', url: url(pariwarId, claimCaseId) })).statusCode).toBe(200);
      expect((await client.inject({ method: 'GET', url: crossQueueUrl(pariwarId) })).statusCode).toBe(200);
    });
  });
});
