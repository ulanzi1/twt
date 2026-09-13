// ⭐⭐ THE MEMBER'S VIEW OF **ONE** DRIVE — live-DB integration. Story 11b.17 (Task 6; AC1-AC5, AC7).
//
// ── ⛔ WHAT NOTHING CHEAPER CAN PROVE ────────────────────────────────────────────────────────────
// Three of this story's load-bearing properties are about **the database**, ⛔ not about a function:
//   1. **AC3's cross-Pariwar boundary** — `-199` confirmed scope **(i)**, so this is the story's
//      ⛔ ONLY remaining boundary and therefore the load-bearing one. ⭐ It is enforced by three
//      layers that only exist together at runtime: ⛔ no `:pariwarId` on the route (the scope comes
//      from the SESSION), an explicit `pariwar_id` predicate, and **RLS FORCE** on
//      `claim_nominee_bank_accounts`. ⛔ A mocked test cannot see RLS.
//   2. **The लक्ष्य gate** — `resolveDriveTargetVisibility`'s absent-row default is FAIL-CLOSED
//      (`-190` cl.7(b)), and *"absent row"* is a fact about Postgres.
//   3. **AC5's audit unit** — ⭐ **EXACTLY ONE line per DETAIL OPEN**, over the real decrypt path.
//
// ── ⚠⛔⛔ AC3 IS **TWO** TESTS, ⛔ NEVER ONE ─────────────────────────────────────────────────────
// The story carried two MUTUALLY UNSATISFIABLE subtasks until 2026-09-13 — *"the coordinate keys are
// ABSENT"* (which needs a **200 body**) and *"another Pariwar's drive is unreachable"* (which means
// there is **no body**) — on the AC it calls load-bearing.
// ⭐ **THE RESOLVED SHAPE IS A 404**, and it is proven here. ⇒
//   **(a)** a member of ANOTHER Pariwar requesting this drive gets **404** — ⭐ HERE, live;
//   **(b)** the CONTRACT's coordinate keys are structurally **ABSENT, ⛔ never `null`** — ⭐ asserted
//       against the **SCHEMA**, in `member-drive-detail-contract.test.ts`, ⛔ not against a body.
// ⚠⛔⛔ **⛔ NEVER `expect(body).not.toHaveProperty('accountNumber')` AGAINST A 404** — ⭐ that passes
// **VACUOUSLY** on a 500, an empty body, or a typo'd id
// ([[feedback_gate_scope_semantic_coverage]]).
//
// ── ⚠ HOUSE RULES ──────────────────────────────────────────────────────────────────────────────
// `integration-tests` concurrency is **1** and is **LOAD-BEARING** — ⛔ never raise it. Assert
// **MEMBERSHIP and EXPLICIT VALUES**, ⛔ never counts over the shared fixture
// ([[project_live_db_test_gotchas]], [[project_ci_local_concurrency_oversubscription]]).

import { randomUUID } from 'node:crypto';

import {
  alert as alertDomain,
  encryption,
  ids,
  member as memberDomain,
  pool as poolDomain,
  schema,
} from '@twt/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { signAccessToken } from '../../../src/modules/auth/member/tokens.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { createTestApp, hasDatabase, teardown, type TestApp } from '../_setup.js';

const ACCESS_TTL_MS = 15 * 60 * 1000;
const DETAIL = (driveToken: string): string =>
  `/api/v1/member/drive-detail/${encodeURIComponent(driveToken)}`;

/** ⭐ The audit action AC5 writes — ⛔ EXACTLY ONE per detail open. */
const AUDIT_TYPE = 'member_drive_detail.coordinates_viewed';

/** The two accounts' plaintexts. ⚠ DIFFERENT per account on EVERY field that can be — which is the
 *  whole ground `-213` cl.1 gives for rendering both (the holder name is *"the SAME nominee"* twice,
 *  but the account number and IFSC ⛔ DIFFER, so the second decrypt returns information the first
 *  does ⛔ not carry). ⭐ Deliberately DIFFERING holder names too: `#decision-2026-09-13-215` records
 *  that as a **LEGITIMATE STATE** (⛔ no FK, ⛔ no `nominee_rank`, ⛔ no match rule) ⇒ the surface must
 *  **SURFACE BOTH AND PICK NEITHER**. */
const ACCOUNTS = [
  {
    rank: 1 as const,
    holder: 'Sunita Devi',
    account: '50100234567890',
    ifsc: 'HDFC0001234',
    bankName: 'HDFC Bank',
    branch: 'Patna Main',
    vpa: 'sunita@upi',
  },
  {
    rank: 2 as const,
    holder: 'Sunita Kumari Devi',
    account: '91230987654321',
    ifsc: 'SBIN0005678',
    bankName: 'State Bank of India',
    // ⚠ `branch` is GENUINELY NULLABLE ⇒ an absent branch is an ORDINARY ABSENT OPTIONAL, ⛔ not a
    // fault. ⭐ Seeded null HERE so the "omit the row, never a placeholder" rule is exercised on a
    // real row rather than asserted about a type.
    branch: null,
    vpa: undefined,
  },
];

const STORED_LEGAL_NAME = 'Rajesh Kumar Sharma';

interface Fixture {
  readonly pariwarId: string;
  readonly requester: string;
  readonly deceasedMemberId: string;
  readonly poolId: string;
  readonly publicToken: string;
  readonly canonicalIdentifier: string;
}

const audit = (
  from: string | null,
  to: string,
  trigger: string,
  actor: 'member' | 'system',
): Record<string, unknown> => ({ from_state: from, to_state: to, trigger, actor });

/**
 * Seed ONE Pariwar with ONE drive carrying TWO nominee bank accounts.
 *
 * @param poolState the pool's INTERNAL state (`live` | `closed` | `settled`) — ⚠⛔ a **POOL STATE**,
 *   ⛔ never a wire token. The wire calls `settled` **`verified`**, and a comparison written against
 *   `settled` on the wire side matches ⛔ **nothing**.
 * @param confirmed how many `contribution.confirmed` events to seed.
 * @param assigned how many `member_pool_assignments` rows — the DENOMINATOR of both the meter and
 *   लक्ष्य. ⚠ Zero assignees resolves the target to **SILENCE**, so a fixture without this makes
 *   every target assertion vacuous.
 */
async function seedDrive(
  t: TestApp,
  opts: {
    poolState: 'live' | 'closed' | 'settled';
    confirmed: number;
    assigned: number;
    accounts?: typeof ACCOUNTS;
    legalName?: string | null;
  },
): Promise<Fixture> {
  const pariwarId = randomUUID();
  const pid = ids.pariwarId(pariwarId);
  const cycleId = randomUUID();
  const claimCaseId = randomUUID();
  const poolId = randomUUID();
  const requester = randomUUID();
  const deceasedMemberId = randomUUID();
  const publicToken = poolDomain.mintPoolPublicToken();
  const canonicalIdentifier = `P-2026-09-${poolId.slice(0, 6)}`;

  const scopeTx = await openScopeTx(t.deps, pariwarId);
  try {
    const project = (memberId: string, eventType: string, payload: Record<string, unknown>) =>
      memberDomain.projectMemberState(scopeTx.client, {
        memberId: ids.memberId(memberId),
        pariwarId: pid,
        eventType: eventType as Parameters<typeof memberDomain.projectMemberState>[1]['eventType'],
        actorId: memberId,
        payload,
      });
    await project(requester, 'member.signup_initiated', audit(null, 'pending-kyc', 'signup', 'member'));
    await project(requester, 'member.kyc_completed', audit('pending-kyc', 'pending-fee', 'kyc', 'member'));
    await project(requester, 'member.vyawastha_shulk_paid', {
      ...audit('pending-fee', 'lock-in', 'fee_paid', 'member'),
      utr: 'UTR123',
      amount_inr: 110,
    });
    await project(requester, 'member.lock_in_expired', {
      ...audit('lock-in', 'active', 'lock_in_expired', 'system'),
      kyc_verified: true,
    });

    await scopeTx.client.query(
      `INSERT INTO members (member_id, pariwar_id, state, state_event_version) VALUES ($1, $2, 'active', 1)`,
      [deceasedMemberId, pariwarId],
    );
    if (opts.legalName !== null) {
      await scopeTx.tx.insert(schema.memberKycProfiles).values({
        memberId: ids.memberId(deceasedMemberId),
        pariwarId: pid,
        nameCiphertext: await encryption.encryptKycField(
          opts.legalName ?? STORED_LEGAL_NAME,
          pariwarId,
          t.deps.encryption,
        ),
        dobCiphertext: await encryption.encryptKycField('1970-01-15', pariwarId, t.deps.encryption),
        photoCiphertext: null,
        aadhaarMaskedId: 'XXXX1234',
        verificationStrength: 'aadhaar_kyc',
        source: 'digilocker',
      });
    }

    await scopeTx.client.query(
      `INSERT INTO cycle_freeze_commits (commit_id, pariwar_id, actor_id, actor_display, committed_claim_ids, committed_at)
       VALUES ($1, $2, $3, $4, $5, now())`,
      [cycleId, pariwarId, requester, 'Test Trustee', [claimCaseId]],
    );

    await scopeTx.client.query("SET LOCAL app.claim_state_writer = 'on'");
    await scopeTx.client.query(
      `INSERT INTO claims (claim_case_id, pariwar_id, deceased_member_id, intake_channels,
                           current_state, state_event_version)
       VALUES ($1, $2, $3, ARRAY['member_app']::claim_intake_channel[], 'approved', 1)`,
      [claimCaseId, pariwarId, deceasedMemberId],
    );
    await scopeTx.client.query("SET LOCAL app.claim_state_writer = 'off'");

    await scopeTx.client.query("SET LOCAL app.pool_state_writer = 'on'");
    await scopeTx.tx.insert(schema.pools).values({
      poolId: ids.poolId(poolId),
      pariwarId: pid,
      cycleId: ids.cycleFreezeCommitId(cycleId),
      claimCaseId: ids.claimId(claimCaseId),
      poolIndex: 0,
      poolCanonicalIdentifier: canonicalIdentifier,
      supportCategory: 'death_support',
      benefitMechanism: 'pool',
      fixedAmount: 500,
      currentState: opts.poolState,
      stateEventVersion: 1,
      publicToken,
    });
    await scopeTx.client.query("SET LOCAL app.pool_state_writer = 'off'");

    await scopeTx.client.query("SET LOCAL app.alert_state_writer = 'on'");
    await scopeTx.tx.insert(schema.alerts).values({
      alertId: alertDomain.deriveAlertId(cycleId),
      cycleId: ids.cycleFreezeCommitId(cycleId),
      pariwarId: pid,
      poolCount: 1,
      currentState: 'live',
      stateEventVersion: 3,
      createdByActor: requester,
    });
    await scopeTx.client.query("SET LOCAL app.alert_state_writer = 'off'");

    // ⭐ THE ROSTER — the DENOMINATOR of both the meter and लक्ष्य. ⚠⛔ `INSERT … SELECT … WHERE`
    // inserts NOTHING and reports ⛔ NO ERROR when the SELECT matches nothing ⇒ ⭐ assert it wrote,
    // or every assertion resting on it is vacuous (the 11b-15 THIRD-pass lesson).
    for (let i = 0; i < opts.assigned; i += 1) {
      const memberId = i === 0 ? requester : randomUUID();
      if (i > 0) {
        await scopeTx.client.query(
          `INSERT INTO members (member_id, pariwar_id, state, state_event_version) VALUES ($1, $2, 'active', 1)`,
          [memberId, pariwarId],
        );
      }
      const inserted = await scopeTx.client.query(
        `INSERT INTO member_pool_assignments (pool_id, member_id, pariwar_id, cycle_id, assigned_at)
         SELECT $1, $2, $3, cycle_id, now() FROM pools WHERE pool_id = $1`,
        [poolId, memberId, pariwarId],
      );
      if (inserted.rowCount !== 1) {
        throw new Error(
          `seedDrive: roster insert wrote ${String(inserted.rowCount)} rows, expected 1 — the seed is vacuous`,
        );
      }
    }

    const alertStream = randomUUID();
    for (let i = 0; i < opts.confirmed; i += 1) {
      await scopeTx.client.query(
        `INSERT INTO events_log (event_id, stream_id, event_type, payload, event_version, pariwar_id, occurred_at)
         VALUES ($1, $2, 'contribution.confirmed', $3::jsonb, $4, $5, now() - interval '3 days')`,
        [randomUUID(), alertStream, JSON.stringify({ poolId, memberId: randomUUID() }), i + 1, pariwarId],
      );
    }

    // ⭐⭐ THE COORDINATES — Tier-1 ciphertext, encrypted through the REAL envelope under the
    // `claim_nominee_bank` field class, exactly as `claims`' own write path does. ⛔ A plaintext
    // fixture would prove nothing about the decrypt this surface performs.
    const enc = (v: string): Promise<string> =>
      encryption
        .encryptTier1(
          Buffer.from(v, 'utf-8'),
          { pariwarId, fieldClass: 'claim_nominee_bank' },
          t.deps.encryption.kms,
          t.deps.encryption.kekRef,
        )
        .then((ct) => encryption.serializeEnvelope(ct));
    for (const acct of opts.accounts ?? ACCOUNTS) {
      await scopeTx.tx.insert(schema.claimNomineeBankAccounts).values({
        claimCaseId: ids.claimId(claimCaseId),
        pariwarId: pid,
        accountRank: acct.rank,
        accountHolderNameCiphertext: await enc(acct.holder),
        accountNumberCiphertext: await enc(acct.account),
        ifscCiphertext: await enc(acct.ifsc),
        // ⭐ SEEDED ON PURPOSE — so the "⛔ no `vpa` reaches this wire" assertion is NON-VACUOUS.
        // ⛔ A fixture with no VPA would pass that assertion while proving ⛔ nothing.
        vpaCiphertext: acct.vpa === undefined ? null : await enc(acct.vpa),
        bankName: acct.bankName,
        branch: acct.branch,
        ifscValidated: true,
      });
    }

    await closeScopeTx(scopeTx, true);
    return { pariwarId, requester, deceasedMemberId, poolId, publicToken, canonicalIdentifier };
  } catch (err) {
    await closeScopeTx(scopeTx, false);
    throw err;
  }
}

/** Flip the Pariwar's MEMBER reveal switch through the GOVERNED write path — ⛔ never a raw UPDATE. */
async function revealTargetToMembers(t: TestApp, pariwarId: string): Promise<void> {
  const scopeTx = await openScopeTx(t.deps, pariwarId);
  try {
    await poolDomain.setDriveTargetVisibility(scopeTx.tx, {
      pariwarId: ids.pariwarId(pariwarId),
      // ⚠⛔ MEMBER-ON / PUBLIC-OFF is a RULED-LEGITIMATE state — `-190` cl.7(c) authorises the axes
      // SEPARATELY, and the DB CHECK only forbids the reverse (public-on while member-off), which is
      // what makes `-189` cl.3 hold either way.
      visibility: { revealToMembers: true, revealToPublic: false },
      changedByActor: null,
      changedByDisplay: null,
      rationale: 'test fixture — the MEMBER reveal axis (`-211` cl.2)',
      auditId: randomUUID(),
      now: new Date(),
    });
    await closeScopeTx(scopeTx, true);
  } catch (err) {
    await closeScopeTx(scopeTx, false);
    throw err;
  }
}

function bearer(t: TestApp, memberId: string, pariwarId: string): string {
  return `Bearer ${signAccessToken(t.app, { memberId, pariwarId, deviceId: 'test-device' }, ACCESS_TTL_MS)}`;
}

interface DetailBody {
  poolLetterCode: string;
  poolCanonicalIdentifier: string;
  publicToken: string;
  deceasedMemberName: string | null;
  nomineeName: string | null;
  status: string;
  closedAt: string | null;
  district: string | null;
  confirmedContributionCount: number;
  confirmedPercentage: number | null;
  driveTargetInr?: number;
  amountRaisedInr: number;
  fundingOutcome: string | null;
  nomineeAccounts: Array<{
    rank: number;
    accountHolderName: string;
    accountNumber: string;
    ifsc: string;
    bankName: string;
    branch: string | null;
  }>;
}

describe.skipIf(!hasDatabase)('⭐⭐ 11b.17 — the member drive DETAIL, live', () => {
  let t: TestApp;
  /** ⭐ AC5's SIZING — MEASURED on the real decrypt path by the audit test, asserted by the next one. */
  let measuredDecrypts = -1;
  let measuredAuditLines = -1;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(async () => {
    await teardown(t);
  });

  it('⭐⭐ AC4 — BOTH accounts render, FIVE fields each, UNMASKED and COMPLETE', async () => {
    const f = await seedDrive(t, { poolState: 'live', confirmed: 3, assigned: 10 });
    const res = await t.app.inject({
      method: 'GET',
      url: DETAIL(f.publicToken),
      headers: { authorization: bearer(t, f.requester, f.pariwarId) },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as DetailBody;

    // ⚠ MEMBERSHIP and EXPLICIT VALUES over the shared fixture — ⛔ never a count over a global set.
    // ⭐ Here the count IS of this drive's OWN accounts (bounded at two by the composite PK), so it is
    // a property of the row, ⛔ not of the database.
    expect(body.nomineeAccounts.map((a) => a.rank).sort()).toEqual([1, 2]);

    for (const seeded of ACCOUNTS) {
      const got = body.nomineeAccounts.find((a) => a.rank === seeded.rank);
      expect(got, `account #${String(seeded.rank)} is MISSING — rendering one would be incomplete by construction (-213 cl.1)`).toBeDefined();
      // ⭐⭐ UNMASKED AND COMPLETE (Trap 4). ⛔ Not a last-4, ⛔ not a partial, ⛔ not a placeholder —
      // *"a masked account# cannot be transferred to"*.
      expect(got!.accountNumber).toBe(seeded.account);
      expect(got!.ifsc).toBe(seeded.ifsc);
      expect(got!.accountHolderName).toBe(seeded.holder);
      expect(got!.bankName).toBe(seeded.bankName);
      expect(got!.branch).toBe(seeded.branch);
    }

    // ⭐⭐ TWO DIFFERING HOLDER NAMES ARE A **LEGITIMATE STATE** (`#decision-2026-09-13-215`), and the
    // surface **SURFACES BOTH AND PICKS NEITHER** (`-213` cl.2). ⛔ It encodes ⛔ no assumption either
    // way — ⭐ asserted, because a well-meaning "de-duplicate the nominee" refactor is exactly the
    // change this rule exists to stop.
    const holders = body.nomineeAccounts.map((a) => a.accountHolderName);
    expect(new Set(holders).size).toBe(2);
    expect(holders).toContain(ACCOUNTS[0]!.holder);
    expect(holders).toContain(ACCOUNTS[1]!.holder);

    // ⛔⛔ AND ⛔ NO `vpa` REACHES THIS WIRE, ON ⛔ ANY DRIVE, IN ⛔ ANY STAGE (D3(D), `-212` cl.2).
    // ⭐ NON-VACUOUS: account #1's VPA IS seeded above, so this would FAIL the moment the key appeared.
    const raw = res.body;
    expect(raw).not.toContain('sunita@upi');
    expect(raw.toLowerCase()).not.toContain('"vpa"');
    expect(raw.toLowerCase()).not.toContain('vpapresent');
  });

  it('⛔⛔ AC3(a) — a member of ANOTHER Pariwar gets 404, ⛔ not 403 and ⛔ not a 200 with absent keys', async () => {
    // ⭐⭐ THE STORY'S ⛔ ONLY REMAINING BOUNDARY, AND THEREFORE THE LOAD-BEARING ONE. `-199` confirmed
    // scope **(i)** — the member's OWN Pariwar; cross-tenant **(ii)** was ⛔ NOT meant.
    const mine = await seedDrive(t, { poolState: 'live', confirmed: 1, assigned: 5 });
    const theirs = await seedDrive(t, { poolState: 'live', confirmed: 1, assigned: 5 });

    const res = await t.app.inject({
      method: 'GET',
      url: DETAIL(theirs.publicToken),
      headers: { authorization: bearer(t, mine.requester, mine.pariwarId) },
    });

    // ⛔⛔ **404, ⛔ NOT 403.** A 403 would CONFIRM the address names something in another tenant —
    // ⭐ it is itself the enumeration oracle the opaque token exists to close, and it is exactly the
    // "improvement" a later reader is most likely to make.
    expect(res.statusCode).toBe(404);

    // ⚠⛔⛔ ⛔ **DO ⛔ NOT ASSERT `not.toHaveProperty('accountNumber')` HERE** — ⭐ that passes VACUOUSLY
    // on a 500, an empty body, or a typo'd id. ⇒ the assertion that carries weight is that the
    // COORDINATE VALUES themselves are absent from the RAW body, checked against a 404 we have already
    // pinned by status code.
    expect(res.body).not.toContain(ACCOUNTS[0]!.account);
    expect(res.body).not.toContain(ACCOUNTS[0]!.ifsc);
    expect(res.body).not.toContain(ACCOUNTS[0]!.holder);

    // ⭐⭐ AND THE SAME TOKEN RESOLVES FOR ITS OWN PARIWAR — ⛔ without this the 404 above could come
    // from a broken fixture rather than from the boundary ([[feedback_gate_scope_semantic_coverage]]).
    const own = await t.app.inject({
      method: 'GET',
      url: DETAIL(theirs.publicToken),
      headers: { authorization: bearer(t, theirs.requester, theirs.pariwarId) },
    });
    expect(own.statusCode).toBe(200);
  });

  it('⛔ AC1 — a WRONG token 404s through the SAME path as a non-existent drive', async () => {
    // ⭐ *"Real drive, wrong token"* answering differently from *"no such drive"* would confirm which
    // addresses name something. ⛔ Structurally guaranteed (the token is in the WHERE clause), and
    // ⭐ asserted so a later "improvement" to a distinct error is caught.
    const f = await seedDrive(t, { poolState: 'live', confirmed: 1, assigned: 5 });
    const wrong = await t.app.inject({
      method: 'GET',
      url: DETAIL(poolDomain.mintPoolPublicToken()),
      headers: { authorization: bearer(t, f.requester, f.pariwarId) },
    });
    expect(wrong.statusCode).toBe(404);

    // ⛔⛔ AND THE CANONICAL IDENTIFIER IS ⛔ NOT AN ADDRESS (`-184` (B)) — ⭐ the walk `P-YYYY-MM-###`
    // would open is exactly what the opaque token closed, and on THIS surface it reaches five
    // decrypted Tier-1 fields per account.
    const byIdentifier = await t.app.inject({
      method: 'GET',
      url: DETAIL(f.canonicalIdentifier),
      headers: { authorization: bearer(t, f.requester, f.pariwarId) },
    });
    expect(byIdentifier.statusCode).toBe(404);
  });

  it('⛔⛔ AC2 — the लक्ष्य GATE is FAIL-CLOSED: ⛔ no reveal row ⇒ the key is ABSENT, ⛔ not null', async () => {
    // ⭐⭐ ⛔ NO Pariwar has a `pariwar_drive_target_visibility` row ⇒ ⛔ NOTHING renders on the day this
    // ships — ⭐ that is **CORRECT**, ⛔ never a bug to "fix" (`-190` cl.7(b), fail-closed).
    // ⚠⛔ NON-VACUITY: the roster IS seeded (10 assignees × ₹500), so the target would be ₹5,000 if the
    // switch were on. ⇒ its absence is the GATE, ⛔ not a pool with no expectation.
    const f = await seedDrive(t, { poolState: 'live', confirmed: 3, assigned: 10 });
    const res = await t.app.inject({
      method: 'GET',
      url: DETAIL(f.publicToken),
      headers: { authorization: bearer(t, f.requester, f.pariwarId) },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as Record<string, unknown>;
    // ⭐ **ABSENT**, ⛔ never `null` — the 11b.11 shape (`-205` cl.9). ⚠ The two are different wire
    // facts and only one of them is the ruled one.
    expect(Object.prototype.hasOwnProperty.call(body, 'driveTargetInr')).toBe(false);

    // ⭐⭐ AND WITH THE SWITCH ON IT APPEARS — ⛔ without this half the assertion above would pass on a
    // surface that never renders the figure at all ([[feedback_gate_scope_semantic_coverage]]).
    await revealTargetToMembers(t, f.pariwarId);
    const after = await t.app.inject({
      method: 'GET',
      url: DETAIL(f.publicToken),
      headers: { authorization: bearer(t, f.requester, f.pariwarId) },
    });
    const afterBody = after.json() as DetailBody;
    // ⭐ DERIVED: `assignedCount × fixed_amount` = 10 × 500. ⛔ There is ⛔ no setter (`-204` cl.2).
    expect(afterBody.driveTargetInr).toBe(5000);
  });

  it('⛔⛔ AC2 / D2(B) — लक्ष्य is ABSENT on the ARCHIVED stages even with the switch ON', async () => {
    // ⭐ Trustee-ratified `2026-09-10-212` **cl.1**: the detail renders the figure on a **`live`**
    // drive ⛔ ONLY.
    // ⚠⛔⛔ **SAY WHICH SIDE OF THE BOUNDARY THE ASSERTION IS ON.** The fixture is seeded with the
    // **POOL STATE** `settled`; the **WIRE TOKEN** it arrives as is **`verified`**. ⛔ An assertion
    // written against `settled` on the wire matches ⛔ NOTHING.
    const f = await seedDrive(t, { poolState: 'settled', confirmed: 4, assigned: 10 });
    await revealTargetToMembers(t, f.pariwarId);
    const res = await t.app.inject({
      method: 'GET',
      url: DETAIL(f.publicToken),
      headers: { authorization: bearer(t, f.requester, f.pariwarId) },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as Record<string, unknown>;
    expect(body['status']).toBe('verified');
    expect(Object.prototype.hasOwnProperty.call(body, 'driveTargetInr')).toBe(false);
    // ⭐ And the meter is `null` off-`live` (`-207` cl.1) — ⛔ `null` here, ⛔ not absent: the two
    // fields have DIFFERENT ruled shapes and ⛔ neither may be "aligned" to the other.
    expect(body['confirmedPercentage']).toBeNull();
  });

  it('⭐⭐ AC5 — EXACTLY ONE audit line per DETAIL OPEN, ⛔ not one per coordinate read', async () => {
    const f = await seedDrive(t, { poolState: 'live', confirmed: 2, assigned: 8 });
    const before = t.auditSink.ofType(AUDIT_TYPE).length;

    // ⭐⭐ THE INVISIBLE HALF, MEASURED. `envelope.ts` fires `auditHook('decryptDek', …)` on EVERY
    // `decryptTier1` with ⛔ NO DEK cache, and in production `createKmsAuditHook` routes each one into
    // the SAME global-chain writer. ⚠ The fake provider carries ⛔ no hook, so it is installed HERE —
    // ⭐ counting the REAL decrypts this request performs, ⛔ not an estimate of them.
    const priorHook = t.deps.encryption.kms.auditHook;
    let decrypts = 0;
    t.deps.encryption.kms.auditHook = (op, kekRef, ctx): void => {
      if (op === 'decryptDek') decrypts += 1;
      priorHook?.(op, kekRef, ctx);
    };

    const res = await t.app.inject({
      method: 'GET',
      url: DETAIL(f.publicToken),
      headers: { authorization: bearer(t, f.requester, f.pariwarId) },
    });
    t.deps.encryption.kms.auditHook = priorHook;
    expect(res.statusCode).toBe(200);

    const written = t.auditSink.ofType(AUDIT_TYPE).slice(before);
    // ⭐⭐ **ONE.** ⛔ Not ten (AC4 renders FIVE coordinates × TWO accounts), ⛔ not two, ⛔ not zero.
    // ⚠ A per-coordinate rule would take the deployment-wide `pg_advisory_xact_lock` ten times on the
    // ordinary browsing path.
    expect(written).toHaveLength(1);

    const line = written[0]!;
    // ⭐ ATTRIBUTED — ⚠⛔ a **NAMED DEPARTURE** from the anonymous public precedent
    // (`writeAppealReversalDisclosureAudit` writes `actorId: null` and says *"⛔ do not widen this to
    // log every request"*). ⛔ Both axes are argued at AC5, ⛔ not claimed as inheritance.
    expect(line.actorId).toBe(f.requester);
    expect(line.pariwarId).toBe(f.pariwarId);
    // ⭐ It names the DRIVE by its CANONICAL IDENTIFIER.
    expect(line.context?.['pool_canonical_identifier']).toBe(f.canonicalIdentifier);
    expect(line.context?.['nominee_accounts']).toBe(2);

    // ⛔⛔ AND ⛔ NEVER THE PUBLIC TOKEN — a token there *"would additionally write a live public
    // ADDRESS into the durable audit chain"*. ⚠ AC8 deliberately puts that same token on a member's
    // SCREEN; the rule fenced here is *"⛔ not in the DURABLE AUDIT CHAIN"*, ⛔ not *"⛔ nowhere"*.
    const serialized = JSON.stringify(line);
    expect(serialized).not.toContain(f.publicToken);
    // ⛔⛔ AND ⛔ NEVER A DECRYPTED COORDINATE, IN ANY FIELD, EVER.
    for (const acct of ACCOUNTS) {
      expect(serialized).not.toContain(acct.account);
      expect(serialized).not.toContain(acct.ifsc);
      expect(serialized).not.toContain(acct.holder);
    }

    // ⭐ Handed to the SIZING assertion below — ⛔ measured here, on the one open that already ran, so
    // the two figures describe the SAME request rather than two.
    measuredDecrypts = decrypts;
    measuredAuditLines = written.length;
  });

  it('⭐ AC11 — the ERASURE SENTINEL ⛔ NEVER renders: the DRIVE stays, the NAME goes', async () => {
    // ⚠⛔⛔ `anonymizeMember` overwrites `name_ciphertext` **IN PLACE** with an *encrypted*
    // `[anonymized]` sentinel and **RETAINS** the row ⇒ the decrypt **SUCCEEDS** and the sentinel
    // would render VERBATIM where a family name belongs. ⛔ ⛔ NEITHER arm of
    // `resolveMemberFacingDeceasedName` filters it, and `.trim() || null` does ⛔ not catch it either.
    // ⚠⛔ **THE REMEDY DIVERGES BY SURFACE AND ⛔ MUST NOT BE "ALIGNED"**: `pool-contributors` OMITS
    // the row; here the erased member ⭐ **IS** the drive, so the DRIVE STAYS and the NAME GOES.
    const f = await seedDrive(t, {
      poolState: 'live',
      confirmed: 1,
      assigned: 5,
      legalName: memberDomain.ANONYMIZED_SENTINEL,
    });
    const res = await t.app.inject({
      method: 'GET',
      url: DETAIL(f.publicToken),
      headers: { authorization: bearer(t, f.requester, f.pariwarId) },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as DetailBody;
    // ⭐ THE NAME GOES.
    expect(body.deceasedMemberName).toBeNull();
    expect(res.body).not.toContain(memberDomain.ANONYMIZED_SENTINEL);
    // ⭐⭐ AND THE DRIVE STAYS — ⛔ omitting it would hide a WHOLE DRIVE from every member of the
    // Pariwar. ⚠ This is the half a mechanical copy of the contributor-list remedy would break.
    expect(body.poolCanonicalIdentifier).toBe(f.canonicalIdentifier);
    expect(body.nomineeAccounts).toHaveLength(2);
  });

  it('⭐ AC2 — a drive with ⛔ NO collected bank details renders `[]`, ⛔ never a throw', async () => {
    // ⭐ `[]` is 6.8 AC3's first-class ABSENCE SIGNAL — the claim's bank details were ⛔ never
    // collected. ⛔ Never a 500, ⛔ never a placeholder row of empty fields.
    const f = await seedDrive(t, { poolState: 'live', confirmed: 0, assigned: 5, accounts: [] });
    const res = await t.app.inject({
      method: 'GET',
      url: DETAIL(f.publicToken),
      headers: { authorization: bearer(t, f.requester, f.pariwarId) },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as DetailBody;
    expect(body.nomineeAccounts).toEqual([]);
    expect(body.nomineeName).toBeNull();
  });

  it('⭐⭐ AC5 — THE WRITE VOLUME, SIZED BEFORE SHIPPING (`-199` Consequence 2), ⛔ not assumed', () => {
    // ⚠⛔⛔ **`-199` Consequence 2 SAYS THE CHAIN *"takes a write on every detail open"* — SINGULAR —
    // AND THAT IS ⛔ WRONG IN THE STORY'S FAVOUR.** ⭐ The real shape, traced to code:
    //   · `packages/domain/src/encryption/envelope.ts` fires `auditHook('decryptDek', …)` on **EVERY**
    //     `decryptTier1`, and there is ⛔ **NO DEK cache** — each ciphertext embeds its own DEK.
    //   · `createKmsAuditHook` (`apps/api/src/audit/audit-log-sink.ts`) routes each one into the
    //     **SAME** global-chain writer, `writeAuditEntry`.
    //   · `writeAuditEntry` (`packages/domain/src/audit/write.ts`) holds
    //     `pg_advisory_xact_lock(AUDIT_CHAIN_LOCK_KEY)` — ⛔ **ONE fixed key, deployment-wide,
    //     cross-tenant** — across BEGIN → lock → tail read → `SELECT now()` → INSERT → COMMIT:
    //     **5-6 sequential round trips per line**. ⭐ The cost is the **SERIALIZATION**, ⛔ not the query.
    //
    // ⭐⭐ **THE FIGURE BELOW IS MEASURED, FROM A REAL OPEN OVER A REAL DECRYPT PATH** — ⛔ not a
    // recomputation of the estimate. ⚠ It is asserted as an EXACT count so that a future change adding
    // a decrypt (a fourth coordinate, a third account, a second name) FAILS HERE and is sized
    // deliberately, rather than silently multiplying a deployment-wide lock on a browsing path.
    //
    // ⭐⭐ **AND THE DISPOSITION IS FIXED IN ADVANCE, ⛔ NOT LEFT TO TASTE:** whatever the number, it is
    // ⛔ **NOT** a blocker and ⛔ **NOT** a reason to drop a decrypt or the KMS hook. ⚠⛔ That hook is
    // the **FR-47** record of *which key opened which field*; removing it to buy throughput would
    // trade a **crypto audit obligation** for latency.
    // ⭐⭐ **AND IT IS ⛔ NOT NEW — story E ALREADY DOES THIS, SHIPPED.** Its list decrypts TWO names
    // **PER ROW**, so routine browsing ALREADY takes the deployment-wide lock today. ⇒ this is a
    // **PRE-EXISTING condition this surface AMPLIFIES**, ⛔ not a defect it introduces — ⭐ though it IS
    // the first surface where a Tier-1 READ is the ordinary path. ⚠ ⛔ Neither AC5 nor `-199` had
    // noticed that, and the honest comparison baseline is therefore ⛔ **not zero**.
    // ⭐ Recorded against `deferred-work.md`'s repo-wide item, ⛔ not filed as a per-surface patch.
    expect(measuredDecrypts, 'the Tier-1 DECRYPT count for ONE detail open').toBe(7);
    expect(measuredAuditLines, "AC5's OWN line — exactly one per DETAIL OPEN").toBe(1);
    // ⇒ ⭐ **8 global-lock acquisitions per detail open** — the ≈8 end of the range AC5 records
    // (`-213` cl.1 rules BOTH accounts in), ⛔ not the ≈5, and ⛔ not the ≈17 a per-coordinate audit
    // rule would have produced (AC4 renders FIVE coordinates × TWO accounts = TEN reads).
    // ⚠⛔ **SEVEN OF THE EIGHT ARE INVISIBLE** — emitted by the crypto layer, ⛔ not by this story's
    // code — which is precisely why they had to be MEASURED rather than read off the handler.
    expect(measuredDecrypts + measuredAuditLines).toBe(8);
  });

  it('⭐ AC9 — the ZERO-DAY drive: the percentage is ⛔ NOT suppressed at zero', async () => {
    // ⚠⛔ ⛔ NOT suppressed — the public meter renders at 0 too, so hiding it here would put the member
    // BELOW the public and break `-189` cl.3 in the OTHER direction.
    const f = await seedDrive(t, { poolState: 'live', confirmed: 0, assigned: 10 });
    const res = await t.app.inject({
      method: 'GET',
      url: DETAIL(f.publicToken),
      headers: { authorization: bearer(t, f.requester, f.pariwarId) },
    });
    const body = res.json() as DetailBody;
    expect(body.confirmedContributionCount).toBe(0);
    expect(body.confirmedPercentage).toBe(0);
    expect(body.amountRaisedInr).toBe(0);
  });
});
