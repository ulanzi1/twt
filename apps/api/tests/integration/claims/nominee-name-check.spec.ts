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

import { claim, cycleCalendar, ids, nominee } from '@twt/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { AppDeps } from '../../../src/context.js';
import * as service from '../../../src/modules/auth/admin/admin-auth.service.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { buildServer } from '../../../src/server.js';
import { buildTestDeps, hasDatabase, makeClient, type TestDeps } from '../_setup.js';
import { ensureAcceptedDeathCertificate, seedNomineeNameCheck } from '../_nominee-name-check-fixture.js';
import { encryptNomineeBankField } from '../../../src/modules/claims/nominee-bank-crypto.js';
import { encryptNomineeField } from '../../../src/modules/nominee/nominee-crypto.js';
import { encryptTrusteeRationale } from '../../../src/modules/claims/state-trustee-decision-crypto.js';
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
      // ⭐ Story 6.20 (AC5, T16) — the names read shows the declaration IN FORCE AT THE DEATH, which
      // exists only once a District Admin has DETERMINED it. Seeded here through the REAL writer as a
      // "no discards" determination over whatever versions `seedNominee` wrote (none ⇒ an EMPTY
      // determination, which reads back as `declared_nominees: []`).
      const pid = ids.pariwarId(pariwarId);
      const versions = await nominee.listNomineeDeclarationVersions(scopeTx.tx, pid, deceasedMemberId);
      const head = (rank: number) =>
        versions.filter((v) => v.rank === rank).reduce<number | null>((m, v) => Math.max(m ?? 0, v.versionNo), null);
      // Story 6.21a (D12(c)) — the determination's date must be the current ACCEPTED certificate's (D8).
      const tomorrow = cycleCalendar.addCalendarDays(cycleCalendar.istDateOf(new Date()), 1);
      const deathCertificateReviewId = await ensureAcceptedDeathCertificate(deps, scopeTx, pariwarId, claimCaseId, { date: tomorrow });
      await claim.recordNomineeDetermination(scopeTx.client, {
        claimCaseId,
        pariwarId: pid,
        deathCertificateReviewId,
        certificateDateCheck: 'match',
        certificateDate: tomorrow,
        certificateDateCiphertext: 'enc:v1:certificate-date',
        noteCiphertext: 'enc:v1:determination-note',
        marks: versions.map((v) => ({ versionId: v.versionId, mark: 'stands' as const })),
        watermark: { rank1: head(1), rank2: head(2) },
        expectedLiveDeterminationId: null,
        actorId: randomUUID(),
        actorDisplay: 'Anita (District Admin)',
        actor: 'operator',
      });
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
      // ⭐ Story 6.20 (D1, T16) — and its VERSION, as a declare writes it. A projection row with no
      // version fails CLOSED; the names read resolves the effective set by version id.
      await c.query(
        `INSERT INTO member_nominee_versions
           (member_id, pariwar_id, rank, version_no, declaration_id, kind, source, name_ciphertext,
            relationship, mobile_ciphertext, address_ciphertext, split_pct, recorded_at, effective_at)
         SELECT $1, $2, $3, COALESCE(MAX(version_no), 0) + 1, gen_random_uuid(), 'declared', 'member', $4,
                $7, $5, $6, $8, '2026-01-05T06:00:00Z', '2026-01-05T06:00:00Z'
           FROM member_nominee_versions WHERE member_id = $1 AND rank = $3`,
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
    /** ⭐ AC7 — the filer's note on rank 1 (`-226` cl.2). Omitted ⇒ the column stays NULL, which is
     *  what every caller before 2026-09-22 got, and why the note-DECRYPT branch had ⛔ no test. */
    note1?: string,
    /** ⭐ AC9 — a REAL encrypted VPA. The Dev Record claimed the never-echo set was asserted against
     *  real plaintexts; `vpa_ciphertext` was ABSENT from this INSERT entirely, so
     *  `not.toContain('vpa')` was a KEY-NAME check and ⛔ never a plaintext one. */
    vpa1?: string,
  ): Promise<void> {
    const [h1, h2, acct, ifsc, n1, v1] = await Promise.all([
      encryptNomineeBankField(holder1, pariwarId, deps.encryption),
      encryptNomineeBankField(holder2, pariwarId, deps.encryption),
      encryptNomineeBankField('999888777666', pariwarId, deps.encryption),
      encryptNomineeBankField('SBIN0009999', pariwarId, deps.encryption),
      note1 === undefined ? Promise.resolve(null) : encryptNomineeBankField(note1, pariwarId, deps.encryption),
      vpa1 === undefined ? Promise.resolve(null) : encryptNomineeBankField(vpa1, pariwarId, deps.encryption),
    ]);
    const c = await td.pool.connect();
    try {
      await c.query(`DELETE FROM claim_nominee_bank_accounts WHERE claim_case_id = $1`, [claimCaseId]);
      await c.query(
        `INSERT INTO claim_nominee_bank_accounts
           (claim_case_id, pariwar_id, account_rank, account_holder_name_ciphertext,
            account_number_ciphertext, ifsc_ciphertext, name_difference_note_ciphertext,
            vpa_ciphertext, bank_name, ifsc_validated)
         VALUES ($1,$2,1,$3,$5,$6,$7,$8,'State Bank of India',true),
                ($1,$2,2,$4,$5,$6,NULL,NULL,'HDFC Bank',true)`,
        [claimCaseId, pariwarId, h1, h2, acct, ifsc, n1, v1],
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
      await seedNominee(pariwarId, memberId, 2, 'Ravi Kumar', 'son', 25);
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

    it('⭐ AC5 — the names and `nominee_declared_at` come from the EFFECTIVE (as-at-death) declaration, ⛔ never the current projection (code review 2026-09-24b)', async () => {
      const pariwarId = randomUUID();
      const district = `D-${randomUUID().slice(0, 8)}`;
      const { client, userId } = await authenticate();
      await grant(userId, pariwarId, 'district_admin', 'district', district);
      const memberId = await seedDeceasedMember(pariwarId, district);
      await seedNominee(pariwarId, memberId, 1, 'Asha Devi', 'spouse', 100); // v1 — effective 2026-01-05
      const claimCaseId = await seedClaim(pariwarId, memberId);
      // A POST-death v2 lands in the projection AND the history — the current rows now name someone else.
      const lateName = await encryptNomineeField('Mohan Lal', pariwarId, deps.encryption);
      const c = await td.pool.connect();
      try {
        await c.query(`UPDATE member_nominees SET name_ciphertext = $2, relationship = 'son' WHERE member_id = $1 AND rank = 1`, [memberId, lateName]);
        await c.query(
          `INSERT INTO member_nominee_versions
             (member_id, pariwar_id, rank, version_no, declaration_id, kind, source, name_ciphertext, relationship,
              mobile_ciphertext, address_ciphertext, split_pct, recorded_at, effective_at)
           SELECT member_id, pariwar_id, 1, 2, gen_random_uuid(), 'declared', 'member', $2, 'son',
                  mobile_ciphertext, address_ciphertext, 100, '2026-06-10T06:00:00Z', '2026-06-10T06:00:00Z'
             FROM member_nominee_versions WHERE member_id = $1 AND rank = 1 AND version_no = 1`,
          [memberId, lateName],
        );
      } finally {
        c.release();
      }
      // The District Admin redetermines against a May certificate: v1 stands, the June v2 is discarded.
      const scopeTx = await openScopeTx(deps, pariwarId);
      try {
        const pid = ids.pariwarId(pariwarId);
        const cid = ids.claimId(claimCaseId);
        const versions = await nominee.listNomineeDeclarationVersions(scopeTx.tx, pid, memberId);
        const live = await claim.getLiveNomineeDetermination(scopeTx.tx, pid, cid);
        // Story 6.21a (D12(c)) — the May certificate is RE-REVIEWED accepted with its own date first (D8).
        const deathCertificateReviewId = await ensureAcceptedDeathCertificate(deps, scopeTx, pariwarId, claimCaseId, { date: '2026-05-01' });
        await claim.recordNomineeDetermination(scopeTx.client, {
          claimCaseId: cid,
          pariwarId: pid,
          deathCertificateReviewId,
          certificateDateCheck: 'match',
          certificateDate: '2026-05-01',
          certificateDateCiphertext: 'enc:v1:certificate-date',
          noteCiphertext: 'enc:v1:determination-note',
          marks: versions.map((v) => ({ versionId: v.versionId, mark: v.versionNo === 1 ? ('stands' as const) : ('discarded' as const) })),
          watermark: { rank1: 2, rank2: null },
          expectedLiveDeterminationId: live!.row.determinationId,
          actorId: randomUUID(),
          actorDisplay: 'Anita (District Admin)',
          actor: 'operator',
        });
        await closeScopeTx(scopeTx, true);
      } catch (err) {
        await closeScopeTx(scopeTx, false);
        throw err;
      }
      await client.inject({ method: 'POST', url: '/api/v1/auth/scope', payload: { pariwarId } });
      const body = (await client.inject({ method: 'GET', url: url(pariwarId, claimCaseId) })).json() as {
        declared_nominees: { rank: number; relationship: string; nominee_name: { state: string; value?: string } }[];
        nominee_declared_at: string | null;
      };
      expect(body.declared_nominees.map((n) => [n.rank, n.relationship, n.nominee_name])).toEqual([
        [1, 'spouse', { state: 'readable', value: 'Asha Devi' }],
      ]);
      // ⭐ The EFFECTIVE version's instant — ⛔ not merely non-null, and ⛔ not the June change's.
      expect(body.nominee_declared_at).toBe('2026-01-05T06:00:00.000Z');
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

  // ── AC3 — THE 409 BOUNDARY, which had ⛔ no HTTP coverage at all ────────────────────────────
  //
  // ⚠⚠ AND THE TWO 400 TESTS ABOVE WERE PARTLY VACUOUS, which is the sharper half of this finding.
  // Both call `seedNomineeNameCheck` first — so by the time they POST, the claim already has two
  // accounts and a recorded check. ⇒ they never showed the 400 firing BEFORE the 409 path; a
  // handler that answered 409 for everything would still have failed them, but a handler whose
  // validation ran in the wrong ORDER would have passed. ⭐ The `expect(400)` is also a bare status
  // — `assertCode` below pins the CODE, because a 400 from the router's schema and a 400 from the
  // AC3 rule are ⛔ not the same answer and only one of them is what these tests claim to prove.

  /** POST a check, with every field defaulted to a VALID one so each test varies exactly one. */
  const postCheck = async (
    client: Client,
    pariwarId: string,
    claimCaseId: string,
    override: Record<string, unknown> = {},
  ) => {
    const read = await client.inject({ method: 'GET', url: url(pariwarId, claimCaseId) });
    const body = read.json() as {
      nominee_declaration_token: string;
      accounts: { account_rank: number; account_updated_at: string }[];
    };
    return client.inject({
      method: 'POST',
      url: url(pariwarId, claimCaseId),
      payload: {
        nominee_declaration_token: body.nominee_declaration_token,
        accounts: body.accounts.map((a) => ({
          account_rank: a.account_rank,
          account_updated_at: a.account_updated_at,
          verdict: 'matches' as const,
        })),
        ...override,
      },
    });
  };

  /**
   * Assert the status AND the error code — ⛔ never the status alone.
   *
   * ⚠ The envelope is `{ error: { code, message, request_id } }`, ⛔ not a bare `{ code }`. My first
   * draft read `body.code`, which is `undefined` for EVERY response — so the assertion would have
   * failed uniformly and, had I written `toBeDefined()` instead, passed uniformly. Read off a real
   * response, ⛔ not guessed.
   */
  const assertCode = (res: { statusCode: number; body: string }, status: number, code: string): void => {
    expect(res.statusCode, res.body).toBe(status);
    expect((JSON.parse(res.body) as { error?: { code?: string } }).error?.code, res.body).toBe(code);
  };

  it('⭐⭐ AC3 — when a 400 AND a 409 condition BOTH hold, the answer is the 400 (validation runs first)', async () => {
    // ⚠⚠ THIS IS THE ORDERING PROOF THE OTHER 400 TESTS ⛔ CANNOT GIVE. They seed a valid claim, so
    // ⛔ only one condition is ever true and a handler that answered 409 for everything would still
    // have failed them — but a handler whose validation ran in the WRONG ORDER would have passed.
    // ⭐ Here BOTH are true at once: the payload is invalid (a clerical difference with ⛔ no
    // reason) AND the token is stale. Fastify validates BEFORE the preHandler chain and before the
    // handler, so the caller must be told what is wrong with their REQUEST, ⛔ not handed a
    // conflict about state they cannot see.
    const { client, pariwarId, claimCaseId } = await setup('district_admin');
    await seedNomineeNameCheck(deps, pariwarId, claimCaseId);
    const read = await client.inject({ method: 'GET', url: url(pariwarId, claimCaseId) });
    const body = read.json() as { accounts: { account_rank: number; account_updated_at: string }[] };

    const res = await client.inject({
      method: 'POST',
      url: url(pariwarId, claimCaseId),
      payload: {
        nominee_declaration_token: 'deadbeefdeadbeefdeadbeefdeadbeef', // ⇒ would be a 409 …
        accounts: body.accounts.map((a) => ({
          account_rank: a.account_rank,
          account_updated_at: a.account_updated_at,
          verdict: 'clerical_difference', // … and this is a 400, with ⛔ no `clerical_reason`.
        })),
      },
    });
    // ⚠ `assertCode`, ⛔ not a bare status (code review 2026-09-22) — this test's own docstring
    // warns against exactly that a few lines above, and this test skipped it: an unrelated 400
    // (a different validation failure entirely) would satisfy a bare `.toBe(400)` without proving
    // the schema-level rule fired FIRST, which is the ordering claim the test's title makes.
    assertCode(res, 400, 'request.validation');

    // ⛔ NON-VACUITY, BOTH WAYS: each condition really does produce its own status on its own.
    const only409 = await postCheck(client, pariwarId, claimCaseId, {
      nominee_declaration_token: 'deadbeefdeadbeefdeadbeefdeadbeef',
    });
    expect(only409.statusCode).toBe(409);
  });

  it('⚠ AC3 — a STALE declaration token is a 409, ⛔ not a 400 or a silent overwrite', async () => {
    // ⭐ The token is derived from the member's nominee rows. A token that no longer matches means
    // the nominees were RE-DECLARED since the District Admin read the two lists — so the verdict
    // they are about to record is about names that are no longer the ones on file.
    const { client, pariwarId, claimCaseId } = await setup('district_admin');
    await seedNomineeNameCheck(deps, pariwarId, claimCaseId);
    const res = await postCheck(client, pariwarId, claimCaseId, {
      nominee_declaration_token: 'deadbeefdeadbeefdeadbeefdeadbeef',
    });
    assertCode(res, 409, 'nominee_name_check.stale');
  });

  it('⚠ AC3 — a STALE `account_updated_at` is a 409 (the D5 chain, over HTTP)', async () => {
    const { client, pariwarId, claimCaseId } = await setup('district_admin');
    await seedNomineeNameCheck(deps, pariwarId, claimCaseId);
    const read = await client.inject({ method: 'GET', url: url(pariwarId, claimCaseId) });
    const body = read.json() as {
      nominee_declaration_token: string;
      accounts: { account_rank: number; account_updated_at: string }[];
    };
    const res = await client.inject({
      method: 'POST',
      url: url(pariwarId, claimCaseId),
      payload: {
        nominee_declaration_token: body.nominee_declaration_token,
        accounts: body.accounts.map((a) => ({
          account_rank: a.account_rank,
          // One hour earlier — the stamp a screen read before somebody else edited the account.
          account_updated_at: new Date(Date.parse(a.account_updated_at) - 3_600_000).toISOString(),
          verdict: 'matches' as const,
        })),
      },
    });
    assertCode(res, 409, 'nominee_name_check.stale');
  });

  it('⚠ AC3 — a claim with ⛔ NO accounts is a 409, and it is a WAIT rather than a refusal (cl.7)', async () => {
    // ⚠⚠ ⛔ NO `seedNomineeNameCheck` HERE — that is the point. Every other POST test in this file
    // seeds the accounts first, so the accounts-required guard was ⛔ never the thing under test.
    const { client, pariwarId, claimCaseId } = await setup('district_admin');
    const res = await client.inject({
      method: 'POST',
      url: url(pariwarId, claimCaseId),
      payload: {
        nominee_declaration_token: 'whatever',
        accounts: [
          { account_rank: 1, account_updated_at: new Date().toISOString(), verdict: 'matches' },
          { account_rank: 2, account_updated_at: new Date().toISOString(), verdict: 'matches' },
        ],
      },
    });
    assertCode(res, 409, 'nominee_name_check.bank_details_required');
  });

  it('⚠ AC3 — DUPLICATE ranks are a 400 at the CONTRACT, before the handler runs', async () => {
    const { client, pariwarId, claimCaseId } = await setup('district_admin');
    await seedNomineeNameCheck(deps, pariwarId, claimCaseId);
    const read = await client.inject({ method: 'GET', url: url(pariwarId, claimCaseId) });
    const body = read.json() as {
      nominee_declaration_token: string;
      accounts: { account_rank: number; account_updated_at: string }[];
    };
    const first = body.accounts[0]!;
    const res = await client.inject({
      method: 'POST',
      url: url(pariwarId, claimCaseId),
      payload: {
        nominee_declaration_token: body.nominee_declaration_token,
        // ⭐ Rank 1 TWICE — two verdicts for one account and none for the other. A check that
        // recorded this would be a judgement about an account nobody looked at.
        accounts: [
          { account_rank: first.account_rank, account_updated_at: first.account_updated_at, verdict: 'matches' },
          { account_rank: first.account_rank, account_updated_at: first.account_updated_at, verdict: 'matches' },
        ],
      },
    });
    // ⚠ `assertCode`, ⛔ not a bare status (code review 2026-09-22) — matches the file's own stated
    // discipline; an unrelated 400 would otherwise satisfy this without proving the duplicate-rank
    // rule specifically fired.
    assertCode(res, 400, 'request.validation');
  });

  it('⭐⭐ AC3/cl.5 — `does_not_match` is a 201 and the claim state does ⛔ NOT move', async () => {
    // ⭐⭐ THE RULING, OVER HTTP. `-226` cl.5: the system NEVER acts on a mismatch. The most likely
    // way to breach it is a well-meaning handler that denies or escalates on `does_not_match` — so
    // this asserts the write SUCCEEDS, the verdict is recorded as given, and the claim is exactly
    // where it was. A 4xx here would be the system acting.
    const { client, pariwarId, claimCaseId } = await setup('district_admin');
    await seedNomineeNameCheck(deps, pariwarId, claimCaseId);
    const read = await client.inject({ method: 'GET', url: url(pariwarId, claimCaseId) });
    const body = read.json() as {
      nominee_declaration_token: string;
      accounts: { account_rank: number; account_updated_at: string }[];
    };
    const res = await client.inject({
      method: 'POST',
      url: url(pariwarId, claimCaseId),
      payload: {
        nominee_declaration_token: body.nominee_declaration_token,
        accounts: body.accounts.map((a, i) => ({
          account_rank: a.account_rank,
          account_updated_at: a.account_updated_at,
          verdict: i === 0 ? ('matches' as const) : ('does_not_match' as const),
        })),
      },
    });
    expect(res.statusCode, res.body).toBe(201);
    const out = res.json() as {
      claim_state: string;
      current_check: { passing: boolean; accounts: { verdict: string }[] };
    };
    expect(out.claim_state, 'the claim MOVED on a mismatch — `-226` cl.5 forbids it').toBe('verifier_review');
    expect(out.current_check.passing).toBe(false);
    expect(out.current_check.accounts.map((a) => a.verdict)).toEqual(['matches', 'does_not_match']);

    // ⭐ And the claim really is still there on a FRESH read — ⛔ not just in the write's echo.
    const after = await client.inject({ method: 'GET', url: url(pariwarId, claimCaseId) });
    expect((after.json() as { claim_state: string }).claim_state).toBe('verifier_review');
  });

  it("⭐⭐ AC7 — the filer's NOTE comes BACK on the AC2 read, and ⛔ NOT in the audit line", async () => {
    // ⚠⚠ THE HANDLER'S NOTE-DECRYPT BRANCH HAD ⛔ NO TEST AT ANY LAYER (code review 2026-09-22):
    // every fixture passed `nameDifferenceNoteCiphertext: null` and `seedAccountsWithNames` never
    // set the column, so the branch that decrypts it had ⛔ never run. ⭐ Paired with the WRITE half
    // in `nominee-bank-helpline.spec.ts` (*"the NOTE survives POST → ciphertext"*), which ⛔ cannot
    // do the read because its seed creates a member with ⛔ no posting district.
    //
    // ⭐ THE NOTE IS THE ONE NAMED EXCEPTION to nominee-bank.ts's "never echo" rule (`-226` cl.2) —
    // so it must come BACK to the District Admin, and it must ⛔ NOT ride the audit trail. Both.
    const NOTE = 'the bank shortened her name to A. Devi';
    const { client, pariwarId, claimCaseId } = await setup('district_admin');
    await seedAccountsWithNames(pariwarId, claimCaseId, 'A. Devi', 'Ravi Kumar', NOTE);
    td.auditSink.events.length = 0;

    const res = await client.inject({ method: 'GET', url: url(pariwarId, claimCaseId) });
    expect(res.statusCode, res.body).toBe(200);
    const packet = res.json() as {
      accounts: Array<{ account_rank: number; name_difference_note: { state: string; value?: string } | null }>;
    };

    const rank1 = packet.accounts.find((a) => a.account_rank === 1);
    expect(rank1?.name_difference_note?.state, 'the note did not decrypt').toBe('readable');
    expect(rank1?.name_difference_note?.value).toBe(NOTE);
    // ⭐ PER-ACCOUNT, ⛔ not per-claim: rank 2 carries `null`, ⛔ not an empty-string "readable".
    expect(packet.accounts.find((a) => a.account_rank === 2)?.name_difference_note).toBeNull();

    // ⭐ AND ⛔ NOT IN THE AUDIT TRAIL — a permitted disclosure to a named reader is ⛔ not a thing
    // to scatter into logs. This is the same rule the holder name lives under, and the AC9 test
    // below asserts the holder-name half.
    expect(JSON.stringify(td.auditSink.events)).not.toContain('shortened');
  });

  it('⭐ AC7 — an UNREADABLE note is its own state, ⛔ never a blank and ⛔ never a crash', async () => {
    // ⚠ A corrupt envelope must ⛔ not take the whole read down, and must ⛔ not silently render as
    // "no note" — which would tell the District Admin the filer explained nothing when they did.
    const { client, pariwarId, claimCaseId } = await setup('district_admin');
    await seedAccountsWithNames(pariwarId, claimCaseId, 'A. Devi', 'Ravi Kumar', 'whatever');
    const c = await td.pool.connect();
    try {
      await c.query(
        `UPDATE claim_nominee_bank_accounts SET name_difference_note_ciphertext = 'enc:v1:not-a-real-envelope'
          WHERE claim_case_id = $1 AND account_rank = 1`,
        [claimCaseId],
      );
    } finally {
      c.release();
    }

    const res = await client.inject({ method: 'GET', url: url(pariwarId, claimCaseId) });
    expect(res.statusCode, res.body).toBe(200);
    const packet = res.json() as {
      accounts: Array<{ account_rank: number; name_difference_note: { state: string } | null }>;
    };
    expect(packet.accounts.find((a) => a.account_rank === 1)?.name_difference_note?.state).toBe('unreadable');
    // ⭐ The HOLDER NAME on the same row still reads — one corrupt field ⛔ does not poison the row.
    expect(res.body).toContain('A. Devi');
  });

  it('⚠⚠ AC9 — ⛔ NO plaintext reaches the audit trail: names, note, VPA, account, IFSC, mobile, address', async () => {
    // ⚠⚠ THIS TEST WAS VACUOUS AND ITS OWN CLOSURE NOTE OVERCLAIMED IT (code review 2026-09-22).
    // It seeded through `seedNomineeNameCheck`, whose accounts hold the literal `'enc:v1:holder-N'`
    // — ⛔ NOT decryptable envelopes. So the GET decrypted them to `unreadable`, ⭐ **no plaintext
    // name ever existed in the process**, and `not.toContain('holder-1')` / `'enc:v1'` ⛔ cannot
    // fail: an audit sink logging the decrypted holder name, the nominee name or the note would
    // have passed it. The `vpa` and `address` checks were worse — ⛔ neither column was ever
    // populated, so both were KEY-NAME checks wearing a plaintext check's clothes.
    //
    // ⭐ EVERY VALUE BELOW IS A REAL ENVELOPE the handler genuinely DECRYPTS, and each is a
    // distinctive string that ⛔ cannot appear by coincidence. The point of AC9 is that a surface
    // which legitimately decrypts PII must ⛔ not let it escape sideways into the audit trail.
    const PT = {
      holder1: 'Zareena Mukhopadhyay',
      holder2: 'Yashwant Chattopadhyay',
      nominee: 'Xiomara Venkataraghavan',
      note: 'the bank shortened her name',
      vpa: 'zareena.m@examplebank',
      account: '999888777666',
      ifsc: 'SBIN0009999',
      mobile: '9876543210',
      address: 'Nariman Point',
    } as const;

    const pariwarId = randomUUID();
    const district = `D-${randomUUID().slice(0, 8)}`;
    const { client, userId } = await authenticate();
    await grant(userId, pariwarId, 'district_admin', 'district', district);
    const memberId = await seedDeceasedMember(pariwarId, district);
    await seedNominee(pariwarId, memberId, 1, PT.nominee);
    const claimCaseId = await seedClaim(pariwarId, memberId);
    await seedAccountsWithNames(pariwarId, claimCaseId, PT.holder1, PT.holder2, PT.note, PT.vpa);
    await client.inject({ method: 'POST', url: '/api/v1/auth/scope', payload: { pariwarId } });

    td.auditSink.events.length = 0;
    const read = await client.inject({ method: 'GET', url: url(pariwarId, claimCaseId) });
    expect(read.statusCode, read.body).toBe(200);

    // ⭐⭐ NON-VACUITY, AND IT IS THE WHOLE POINT: the handler really DID decrypt them. Without
    // this the assertions below would be satisfied by a read that failed to decrypt anything —
    // which is exactly the state this test shipped in.
    expect(read.body, 'the holder name did not decrypt — the audit assertions would be vacuous').toContain(PT.holder1);
    expect(read.body).toContain(PT.holder2);
    expect(read.body).toContain(PT.nominee);
    expect(read.body).toContain(PT.note);

    // ⭐ AND ⛔ NONE OF IT IS IN THE AUDIT TRAIL — including the four the read legitimately carries.
    const dump = JSON.stringify(td.auditSink.events);
    expect(td.auditSink.ofType('admin_nominee_name_check.read').length).toBeGreaterThanOrEqual(1);
    for (const [label, value] of Object.entries(PT)) {
      expect(dump, `the audit trail carries the ${label} plaintext`).not.toContain(value);
    }
    // ⛔ …and ⛔ no raw envelope either: an audit line carrying ciphertext is still carrying PII.
    expect(dump).not.toContain('enc:v1');

    // ⭐ THE RESPONSE ITSELF still refuses the four AC2 names — absent, ⛔ not merely un-logged.
    expect(read.body).not.toContain(PT.account);
    expect(read.body).not.toContain(PT.ifsc);
    expect(read.body).not.toContain(PT.vpa);
    expect(read.body).not.toContain(PT.mobile);
    expect(read.body).not.toContain(PT.address);
  });

  it('⚠⚠ AC9 — the WRITE path leaks nothing either: the POST\'s own audit lines are scanned', async () => {
    // ⚠ The old test reset the sink before the GET only and ⛔ never scanned the POST's lines
    // (`admin_claim.nominee_name_checked`). A write that echoed a holder name into its audit line
    // would have gone unnoticed — and the write is the call that carries a HUMAN JUDGEMENT about
    // those names, so it is the likelier place for a well-meaning author to log them "for context".
    //
    // ⚠⚠ 2026-09-22 (code review): the title claims parity with the GET test's full PII list, but
    // `PT` used to carry only `holder1`/`nominee`/`note` — omitting `holder2`, `account`, `ifsc`,
    // `vpa`, `mobile`, `address` — so a leak of e.g. the account number into the write-path audit
    // line would have gone undetected despite the title's implied parity. Widened to match, reusing
    // the SAME fixture shape the GET test above already established (`seedAccountsWithNames`'s
    // hardcoded account/IFSC, `seedNominee`'s hardcoded mobile/address).
    const PT = {
      holder1: 'Zareena Mukhopadhyay',
      holder2: 'Yashwant Chattopadhyay',
      nominee: 'Xiomara Venkataraghavan',
      note: 'the bank shortened her name',
      vpa: 'zareena.m@examplebank',
      account: '999888777666',
      ifsc: 'SBIN0009999',
      mobile: '9876543210',
      address: 'Nariman Point',
    } as const;
    const pariwarId = randomUUID();
    const district = `D-${randomUUID().slice(0, 8)}`;
    const { client, userId } = await authenticate();
    await grant(userId, pariwarId, 'district_admin', 'district', district);
    const memberId = await seedDeceasedMember(pariwarId, district);
    await seedNominee(pariwarId, memberId, 1, PT.nominee);
    const claimCaseId = await seedClaim(pariwarId, memberId);
    await seedAccountsWithNames(pariwarId, claimCaseId, PT.holder1, PT.holder2, PT.note, PT.vpa);
    await client.inject({ method: 'POST', url: '/api/v1/auth/scope', payload: { pariwarId } });

    const read = await client.inject({ method: 'GET', url: url(pariwarId, claimCaseId) });
    const body = read.json() as {
      nominee_declaration_token: string;
      accounts: { account_rank: number; account_updated_at: string }[];
    };
    td.auditSink.events.length = 0;
    const res = await client.inject({
      method: 'POST',
      url: url(pariwarId, claimCaseId),
      payload: {
        nominee_declaration_token: body.nominee_declaration_token,
        accounts: body.accounts.map((a, i) => ({
          account_rank: a.account_rank,
          account_updated_at: a.account_updated_at,
          verdict: i === 0 ? ('clerical_difference' as const) : ('matches' as const),
          ...(i === 0 ? { clerical_reason: 'bank_shortened_name' as const } : {}),
        })),
      },
    });
    expect(res.statusCode, res.body).toBe(201);

    // ⛔ NON-VACUITY: the write really did emit an audit line, so "nothing in it" is a property of
    // the line and ⛔ not of an empty sink.
    expect(td.auditSink.events.length, 'the POST emitted no audit line at all').toBeGreaterThan(0);
    const dump = JSON.stringify(td.auditSink.events);
    for (const [label, value] of Object.entries(PT)) {
      expect(dump, `the POST's audit trail carries the ${label} plaintext`).not.toContain(value);
    }
    expect(dump).not.toContain('enc:v1');
    // ⭐ But it DOES carry the non-PII verdict provenance — an audit line that recorded nothing
    // would satisfy every assertion above and be useless.
    expect(dump).toContain('bank_shortened_name');
  });

  // ── AC3/D3 — ATTRIBUTION: a check nobody is named on is ⛔ not attribution ──────────────────
  //
  // ⚠⚠ AND THE OLD 201 HAPPY PATH COULD ⛔ NOT TELL WHETHER THE POST WROTE ANYTHING. It called
  // `seedNomineeNameCheck` first — which records a PASSING `matches` — then POSTed `matches` and
  // asserted `passing === true`. ⇒ a no-op handler, or one that returned the pre-existing check,
  // satisfied every assertion. The tests below use a claim with ⛔ NO seeded check and a DISTINCT
  // verdict, and assert a NEW event plus a persisted re-GET.

  it('⭐⭐ D3 — the POST writes a NEW check, attributed to a NAMED human, and it PERSISTS', async () => {
    const pariwarId = randomUUID();
    const district = `D-${randomUUID().slice(0, 8)}`;
    const { client, userId } = await authenticate('Anita Kumari (District Admin)');
    await grant(userId, pariwarId, 'district_admin', 'district', district);
    const memberId = await seedDeceasedMember(pariwarId, district);
    await seedNominee(pariwarId, memberId, 1, 'Asha Devi');
    const claimCaseId = await seedClaim(pariwarId, memberId);
    await seedAccountsWithNames(pariwarId, claimCaseId, 'A. Devi', 'Ravi Kumar');
    await client.inject({ method: 'POST', url: '/api/v1/auth/scope', payload: { pariwarId } });

    // ⛔ NO check exists yet — asserted, ⛔ not assumed.
    const before = await client.inject({ method: 'GET', url: url(pariwarId, claimCaseId) });
    expect((before.json() as { current_check: unknown }).current_check).toBeNull();
    const body = before.json() as {
      nominee_declaration_token: string;
      accounts: { account_rank: number; account_updated_at: string }[];
    };

    const res = await client.inject({
      method: 'POST',
      url: url(pariwarId, claimCaseId),
      payload: {
        nominee_declaration_token: body.nominee_declaration_token,
        accounts: body.accounts.map((a, i) => ({
          account_rank: a.account_rank,
          account_updated_at: a.account_updated_at,
          // ⭐ A DISTINCT verdict — ⛔ not the `matches` a seed would have left behind.
          verdict: i === 0 ? ('clerical_difference' as const) : ('matches' as const),
          ...(i === 0 ? { clerical_reason: 'married_name' as const } : {}),
        })),
      },
    });
    expect(res.statusCode, res.body).toBe(201);

    // ⭐⭐ D3 — ATTRIBUTED TO A NAMED HUMAN. A check recorded against `''` looks like attribution
    // and is ⛔ not; the whole premise of this surface is that a NAMED person read two names.
    const after = await client.inject({ method: 'GET', url: url(pariwarId, claimCaseId) });
    const check = (after.json() as { current_check: { checked_by_actor_display: string; accounts: { verdict: string; clerical_reason: string | null }[] } }).current_check;
    expect(check, 'the check did not persist — the POST wrote nothing').not.toBeNull();
    expect(check.checked_by_actor_display, 'the check is attributed to nobody').toBe('Anita Kumari (District Admin)');
    expect(check.checked_by_actor_display.trim()).not.toBe('');
    // ⭐ …and it is THIS verdict, ⛔ not a `matches` left by some other writer.
    expect(check.accounts.map((a) => a.verdict)).toEqual(['clerical_difference', 'matches']);
    expect(check.accounts[0]!.clerical_reason).toBe('married_name');

    // ⭐ Exactly ONE event — ⛔ not zero (a no-op) and ⛔ not two (a double write).
    const events = await td.pool.query<{ n: string }>(
      `SELECT count(*)::text AS n FROM events_log WHERE stream_id = $1 AND event_type = 'claim.nominee_name_checked'`,
      [claimCaseId],
    );
    expect(Number(events.rows[0]!.n)).toBe(1);
  });

  it('⚠⚠ D3 — an admin with ⛔ NO display name CANNOT record a check', async () => {
    // ⚠ The model is `verifier-decision.spec.ts`'s *"NULL display_name BLOCKS every verb"*. D3 made
    // the display name REQUIRED in the payload; before that it was always `''` and ⛔ no check was
    // ever attributed to anybody. ⭐ The block must be at the BOUNDARY — a missing name is an
    // account-configuration problem, and letting it through would write an unattributable judgement
    // that ⛔ cannot be repaired afterwards.
    const pariwarId = randomUUID();
    const district = `D-${randomUUID().slice(0, 8)}`;
    const { client, userId } = await authenticate(null); // ⛔ no display name
    await grant(userId, pariwarId, 'district_admin', 'district', district);
    const memberId = await seedDeceasedMember(pariwarId, district);
    const claimCaseId = await seedClaim(pariwarId, memberId);
    await seedAccountsWithNames(pariwarId, claimCaseId, 'A. Devi', 'Ravi Kumar');
    await client.inject({ method: 'POST', url: '/api/v1/auth/scope', payload: { pariwarId } });

    const read = await client.inject({ method: 'GET', url: url(pariwarId, claimCaseId) });
    const body = read.json() as {
      nominee_declaration_token: string;
      accounts: { account_rank: number; account_updated_at: string }[];
    };
    const res = await client.inject({
      method: 'POST',
      url: url(pariwarId, claimCaseId),
      payload: {
        nominee_declaration_token: body.nominee_declaration_token,
        accounts: body.accounts.map((a) => ({
          account_rank: a.account_rank,
          account_updated_at: a.account_updated_at,
          verdict: 'matches' as const,
        })),
      },
    });
    // ⭐ THE EXACT ANSWER, ⛔ not a set of plausible ones: `409 admin.display_name_missing`, the
    // same code `verifier-decision` uses. A status-set assertion would have passed for a 403 from
    // the permission chain — a completely different failure that happens to also be a refusal.
    assertCode(res, 409, 'admin.display_name_missing');

    // ⭐ And ⛔ NOTHING was written — a refusal that still recorded would be the worst outcome.
    const events = await td.pool.query<{ n: string }>(
      `SELECT count(*)::text AS n FROM events_log WHERE stream_id = $1 AND event_type = 'claim.nominee_name_checked'`,
      [claimCaseId],
    );
    expect(Number(events.rows[0]!.n)).toBe(0);
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

    it('⛔⛔ a District Admin who ALSO holds a KEY-LESS Pariwar-wide role sees ⛔ NO other district (2026-09-23b)', async () => {
      // ⚠ THE LEAK: the row filter was raw `scopeContains` over EVERY grant, so an `auditor` grant
      // at `pariwar` (a role WITHOUT `claim.view_nominee_name_check`) admitted every district's rows
      // — and their decrypted return notes. The single-role test above cannot see this.
      const pariwarId = randomUUID();
      const districtX = `DX-${randomUUID().slice(0, 8)}`;
      const districtY = `DY-${randomUUID().slice(0, 8)}`;
      const memberY = await seedDeceasedMember(pariwarId, districtY);
      const claimY = await seedClaim(pariwarId, memberY);
      await seedNomineeNameCheck(deps, pariwarId, claimY, {
        verdicts: ['matches', 'does_not_match'] as const,
      });

      const daX = await authenticate();
      await grant(daX.userId, pariwarId, 'district_admin', 'district', districtX);
      await grant(daX.userId, pariwarId, 'auditor', 'pariwar', pariwarId);
      await daX.client.inject({ method: 'POST', url: '/api/v1/auth/scope', payload: { pariwarId } });
      const res = await daX.client.inject({ method: 'GET', url: queueUrl(pariwarId) });
      expect(res.statusCode).toBe(200);
      const got = (res.json() as { items: { claim_case_id: string }[] }).items.map((i) => i.claim_case_id);
      expect(got, "a key-less wider grant must not widen the queue").not.toContain(claimY);

      // ⭐ POSITIVE CONTROL — a Pariwar-wide role that DOES carry the key sees it.
      const pa = await authenticate();
      await grant(pa.userId, pariwarId, 'pariwar_admin', 'pariwar', pariwarId);
      await pa.client.inject({ method: 'POST', url: '/api/v1/auth/scope', payload: { pariwarId } });
      const resPa = await pa.client.inject({ method: 'GET', url: queueUrl(pariwarId) });
      const gotPa = (resPa.json() as { items: { claim_case_id: string }[] }).items.map((i) => i.claim_case_id);
      expect(gotPa).toContain(claimY);
    });

    it('⭐ each DECRYPTED return note leaves its OWN claim-locating audit line — ⛔ never the note (BigDev 2026-09-23b, option 1)', async () => {
      const pariwarId = randomUUID();
      const district = `D-${randomUUID().slice(0, 8)}`;
      const memberId = await seedDeceasedMember(pariwarId, district);
      const claimCaseId = await seedClaim(pariwarId, memberId);
      // Drive to `verifier_approved`, check it, and have a Pariwar Admin RETURN it with a real note.
      const pa = await authenticate('Kalpana (Pariwar Admin)');
      const NOTE = `the holder name ${randomUUID().slice(0, 8)} is not the declared nominee`;
      {
        const scopeTx = await openScopeTx(deps, pariwarId);
        try {
          await claim.projectClaimState(scopeTx.client, {
            claimCaseId: ids.claimId(claimCaseId),
            pariwarId: ids.pariwarId(pariwarId),
            deceasedMemberId: memberId,
            intakeChannels: ['helpline'],
            claimantActorId: null,
            eventType: 'claim.verifier_approved' as never,
            payload: { from_state: 'verifier_review', to_state: 'verifier_approved', trigger: 'seed', actor: 'system' },
            actorId: null,
          });
          await closeScopeTx(scopeTx, true);
        } catch (err) {
          await closeScopeTx(scopeTx, false);
          throw err;
        }
      }
      await seedNomineeNameCheck(deps, pariwarId, claimCaseId);
      {
        const scopeTx = await openScopeTx(deps, pariwarId);
        try {
          await claim.returnToDistrictAdmin(scopeTx.client, {
            claimCaseId: ids.claimId(claimCaseId),
            pariwarId: ids.pariwarId(pariwarId),
            reasonCode: 'other',
            rationaleCiphertext: await encryptTrusteeRationale(NOTE, pariwarId, deps.encryption),
            actorId: pa.userId,
            actorDisplay: 'Kalpana (Pariwar Admin)',
            actor: 'trustee',
          });
          await closeScopeTx(scopeTx, true);
        } catch (err) {
          await closeScopeTx(scopeTx, false);
          throw err;
        }
      }

      const da = await authenticate();
      await grant(da.userId, pariwarId, 'district_admin', 'district', district);
      await da.client.inject({ method: 'POST', url: '/api/v1/auth/scope', payload: { pariwarId } });
      td.auditSink.events.length = 0;
      const res = await da.client.inject({ method: 'GET', url: queueUrl(pariwarId) });
      expect(res.statusCode).toBe(200);
      // ⭐ NON-VACUITY: the note really was decrypted and shown.
      expect(res.body).toContain(NOTE);

      const lines = td.auditSink.ofType('admin_nominee_name_check.queue_note_read');
      expect(lines).toHaveLength(1);
      expect(lines[0]?.resourceLocator).toBe(`claim:${claimCaseId.toLowerCase()}`);
      expect(td.auditSink.ofType('admin_nominee_name_check.queue_read')).toHaveLength(1);
      // ⛔ The note itself rides NO audit line.
      expect(JSON.stringify(td.auditSink.events)).not.toContain(NOTE);
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

    it('⭐⭐ POSITIVE CONTROL — the IDENTICAL POST shape succeeds for the tenant that owns the claim', async () => {
      // ⚠⚠ ADDED 2026-09-22 (code review). The GET positive control above does NOT cover the POST
      // denial two tests up — a route that 404s for EVERY caller (broken for everyone, not just the
      // wrong tenant) would satisfy that denial test just as well as one that correctly discriminates
      // by tenant. Same shape as the denial test's payload, only the token/stamps are REAL (read off
      // a live GET first) and the caller is the rightful tenant.
      const pariwarId = randomUUID();
      const district = `D-${randomUUID().slice(0, 8)}`;
      const memberId = await seedDeceasedMember(pariwarId, district);
      const claimCaseId = await seedClaim(pariwarId, memberId);
      await seedNomineeNameCheck(deps, pariwarId, claimCaseId);

      const { client, userId } = await authenticate();
      await grant(userId, pariwarId, 'district_admin', 'district', district);
      await client.inject({ method: 'POST', url: '/api/v1/auth/scope', payload: { pariwarId } });

      const res = await postCheck(client, pariwarId, claimCaseId);
      expect(res.statusCode, res.body).toBe(201);
    });
  });
});
