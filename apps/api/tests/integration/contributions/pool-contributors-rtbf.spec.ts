// Contributor-list RTBF erasure — E2E (live DB :5433). Story 11b.2a (Task 5; AC1/AC2/AC6/AC8, D5).
//
// ⭐⭐ WHAT THIS FILE PROVES, AND WHY IT HAD TO BE AN INTEGRATION TEST.
// The defect it guards is only reachable through the REAL anonymization: RTBF does ⛔ not null
// `name_ciphertext` — `member/anonymize.ts` writes an ENCRYPTED `'[anonymized]'` sentinel, so the
// decrypt SUCCEEDS, `splitFirstNameLastInitial` yields a non-empty `firstName`, all three of the
// loop's fail-soft guards pass, and the internal sentinel renders VERBATIM where a name belongs.
// A stubbed `resolveMemberDisplayName` or a DB-free fixture cannot reproduce that chain — the whole
// bug lives in the gap between "the column is not null" and "the plaintext is not a name". So the
// fixture drives `anonymizeMember` for real, against real Postgres, on a member who HAS a confirmed
// contribution in the pool under test (Trap 4's second half: exercise the variant, don't just compile
// against it).
//
// ⛔ NOT in `tests/unit/pool-contributors.test.ts`. That file exists, is DB-free, and extending it
// would force exactly the stub AC6 forbids.
//
// ── The two axes, and why the assertions look like a contradiction but are not ──────────────────────
//     Contribution state: CONFIRMED   ·   Public representation: OMITTED
// D3-aggregate rules that an RTBF'd contributor STILL COUNTS toward `confirmedCount` and every
// aggregate representing confirmed historical transactions. So after an erasure `confirmed[]` shrinks
// by one while `pending` is BYTE-IDENTICAL. ⛔ A test asserting `rows.length === confirmedCount` would
// encode the WRONG model and must never be written here.
//
// ⚠ `integration-tests` concurrency is 1 and is LOAD-BEARING — never raise it. Assert MEMBERSHIP and
// explicit values, never global counts ([[project_live_db_test_gotchas]]).

import { randomUUID } from 'node:crypto';

import { alert as alertDomain, encryption, ids, member as memberDomain, pool as poolDomain, schema } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import { signAccessToken } from '../../../src/modules/auth/member/tokens.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { createTestApp, hasDatabase, teardown, type TestApp } from '../_setup.js';

const ACCESS_TTL_MS = 15 * 60 * 1000;
const URL = '/api/v1/member/pool-contributors';
type Json = Record<string, unknown>;

/** The `member.rtbf_anonymized` sentinel, spelled out here so the leak assertion is literal. */
const ANONYMIZED_SENTINEL = '[anonymized]';

const audit = (from: string | null, to: string, trigger: string, actor: 'member' | 'system', extra: Json = {}): Json => ({
  from_state: from,
  to_state: to,
  trigger,
  actor,
  ...extra,
});

interface SeededMember {
  readonly memberId: string;
  readonly legalName: string;
  readonly firstName: string;
  readonly lastInitial: string;
}

interface Fixture {
  readonly pariwarId: string;
  readonly requester: string;
  readonly poolId: string;
  readonly cycleId: string;
  /** Every member with a `contribution.confirmed` event in this pool, in seed order. */
  readonly contributors: readonly SeededMember[];
  readonly rosterSize: number;
}

/**
 * Seed a live cycle with ONE pool, a frozen roster, and `contribution.confirmed` events for the named
 * contributors — everything `resolveContributorList` reads, driven through the real projector and the
 * real schema. Committed (the request handler opens its OWN scope tx and must see these rows).
 */
async function seedPoolWithConfirmedContributors(
  t: TestApp,
  opts: { contributorNames: readonly string[]; rosterPadding?: number },
): Promise<Fixture> {
  const pariwarId = randomUUID();
  const cycleId = randomUUID();
  const claimCaseId = randomUUID();
  const poolId = randomUUID();
  const requester = randomUUID();
  const pid = ids.pariwarId(pariwarId);

  const scopeTx = await openScopeTx(t.deps, pariwarId);
  try {
    const project = (memberId: string, eventType: string, payload: Json) =>
      memberDomain.projectMemberState(scopeTx.client, {
        memberId: ids.memberId(memberId),
        pariwarId: pid,
        eventType: eventType as Parameters<typeof memberDomain.projectMemberState>[1]['eventType'],
        actorId: memberId,
        payload,
      });

    /** Drive a member's stream to `active` — the lifecycle the contributor surface assumes. */
    const driveToActive = async (memberId: string): Promise<void> => {
      await project(memberId, 'member.signup_initiated', audit(null, 'pending-kyc', 'signup', 'member'));
      await project(memberId, 'member.kyc_completed', audit('pending-kyc', 'pending-fee', 'kyc', 'member'));
      await project(
        memberId,
        'member.vyawastha_shulk_paid',
        audit('pending-fee', 'lock-in', 'fee_paid', 'member', { utr: 'UTR123', amount_inr: 110 }),
      );
      await project(
        memberId,
        'member.lock_in_expired',
        audit('lock-in', 'active', 'lock_in_expired', 'system', { kyc_verified: true }),
      );
    };

    await driveToActive(requester);

    const contributors: SeededMember[] = [];
    for (const legalName of opts.contributorNames) {
      const memberId = randomUUID();
      await driveToActive(memberId);
      // The Tier-1 KYC name — the ONLY place a contributor's name exists, and what the boundary
      // decrypts. Written through the real encryption path so `anonymizeMember` can really overwrite it.
      await scopeTx.tx.insert(schema.memberKycProfiles).values({
        memberId: ids.memberId(memberId),
        pariwarId: pid,
        nameCiphertext: await encryption.encryptKycField(legalName, pariwarId, t.deps.encryption),
        dobCiphertext: await encryption.encryptKycField('1990-01-15', pariwarId, t.deps.encryption),
        photoCiphertext: null,
        aadhaarMaskedId: 'XXXX1234',
        verificationStrength: 'aadhaar_kyc',
        source: 'digilocker',
      });
      const [first = '', last = ''] = legalName.split(' ');
      contributors.push({ memberId, legalName, firstName: first, lastInitial: last.slice(0, 1) });
    }

    // The frozen roster: every contributor plus the requester plus any padding (members who have NOT
    // confirmed — they are what `pending` counts).
    const rosterMemberIds = [
      requester,
      ...contributors.map((c) => c.memberId),
      ...Array.from({ length: opts.rosterPadding ?? 0 }, () => randomUUID()),
    ];

    // The cycle's freeze commit — the window anchor `resolveMemberLivePool` requires.
    await scopeTx.client.query(
      `INSERT INTO cycle_freeze_commits (commit_id, pariwar_id, actor_id, actor_display, committed_claim_ids, committed_at)
       VALUES ($1, $2, $3, $4, $5, now())`,
      [cycleId, pariwarId, requester, 'Test Trustee', [claimCaseId]],
    );

    // The claim the pool is raised for, then the pool itself, then the snapshot that IS the roster.
    await stateWriter(scopeTx.client, 'claim', 'on');
    await scopeTx.tx.insert(schema.claims).values({
      claimCaseId: ids.claimId(claimCaseId),
      pariwarId: pid,
      deceasedMemberId: ids.memberId(randomUUID()),
      claimantActorId: null,
      intakeChannels: ['member_app'],
      currentState: 'intake_pending',
      stateEventVersion: 1,
    });
    await stateWriter(scopeTx.client, 'claim', 'off');

    await stateWriter(scopeTx.client, 'pool', 'on');
    await scopeTx.tx.insert(schema.pools).values({
      poolId: ids.poolId(poolId),
      pariwarId: pid,
      cycleId: ids.cycleFreezeCommitId(cycleId),
      claimCaseId: ids.claimId(claimCaseId),
      poolIndex: 0,
      poolCanonicalIdentifier: `P-2026-07-${poolId.slice(0, 3)}`,
      supportCategory: 'death_support',
      benefitMechanism: 'pool',
      fixedAmount: 500,
      currentState: 'spawned',
      stateEventVersion: 1,
    });
    await stateWriter(scopeTx.client, 'pool', 'off');

    const snapshot = poolDomain.serializePoolSnapshot({
      poolId,
      pariwarId,
      cycleId,
      poolIndex: 0,
      supportCategory: 'death_support',
      benefitMechanism: 'pool',
      fixedAmount: 500,
      currentState: 'spawned',
      memberAssignments: rosterMemberIds.map((member_id) => ({ member_id })),
    });
    await scopeTx.tx.insert(schema.poolSnapshots).values({
      poolId: ids.poolId(poolId),
      pariwarId: pid,
      formatVersion: snapshot.format_version,
      schemaVersion: snapshot.schema_version,
      integrityHash: snapshot.integrity_hash,
      stateEventVersion: 1,
      snapshot,
    });

    // The live alert — 1:1 with the cycle. `current_state='live'` is what opens the surface.
    await stateWriter(scopeTx.client, 'alert', 'on');
    await scopeTx.tx.insert(schema.alerts).values({
      alertId: alertDomain.deriveAlertId(cycleId),
      cycleId: ids.cycleFreezeCommitId(cycleId),
      pariwarId: pid,
      poolCount: 1,
      currentState: 'live',
      stateEventVersion: 3,
      createdByActor: requester,
    });
    await stateWriter(scopeTx.client, 'alert', 'off');

    // The CONFIRMED contributions themselves — the Epic-9 matcher's forward payload contract
    // ({ poolId, memberId } on the POOL stream). Seeded directly rather than driven through the
    // matcher: this spec is about what the BOUNDARY does with a confirmed set, not about how the set
    // is produced, and the matcher would need a whole bank-statement fixture to say the same thing.
    let poolStreamVersion = 0;
    for (const c of contributors) {
      poolStreamVersion += 1;
      await scopeTx.tx.insert(schema.eventsLog).values({
        streamId: poolId,
        eventType: 'contribution.confirmed',
        payload: { poolId, memberId: c.memberId },
        eventVersion: poolStreamVersion,
        actorId: null,
        pariwarId: pid,
      });
    }

    await closeScopeTx(scopeTx, true);
    return { pariwarId, requester, poolId, cycleId, contributors, rosterSize: rosterMemberIds.length };
  } catch (err) {
    await closeScopeTx(scopeTx, false);
    throw err;
  }
}

/**
 * The projector-only tables (`claims` / `pools` / `alerts`) carry a state-writer guard: only the
 * projector may write `current_state`. A fixture that seeds them directly must open the guard and
 * close it again — leaving it open would let the rest of the transaction bypass the invariant.
 */
async function stateWriter(
  client: { query: (sql: string) => Promise<unknown> },
  table: 'claim' | 'pool' | 'alert',
  mode: 'on' | 'off',
): Promise<void> {
  await client.query(`SET LOCAL app.${table}_state_writer = '${mode}'`);
}

/**
 * Drive a REAL RTBF anonymization of `memberId` — `anonymizeMember` (which overwrites the KYC name
 * with an ENCRYPTED sentinel, ⛔ never NULL) plus the `member.rtbf_anonymized` projection.
 * ⛔ Deliberately NOT a hand-set `members.state = 'anonymized'`: the state the boundary reads comes
 * from the event REPLAY, so a projection-only fixture would prove nothing about the real path.
 */
async function reallyAnonymize(t: TestApp, pariwarId: string, memberId: string): Promise<void> {
  const scopeTx = await openScopeTx(t.deps, pariwarId);
  try {
    const mid = ids.memberId(memberId);
    const pid = ids.pariwarId(pariwarId);
    await memberDomain.projectMemberState(scopeTx.client, {
      memberId: mid,
      pariwarId: pid,
      eventType: 'member.withdrawal_completed',
      actorId: memberId,
      payload: audit('active', 'withdrawn', 'voluntary_withdrawal', 'member'),
    });
    await memberDomain.anonymizeMember(scopeTx.tx, t.deps.encryption, { memberId: mid, pariwarId: pid });
    await memberDomain.projectMemberState(scopeTx.client, {
      memberId: mid,
      pariwarId: pid,
      eventType: 'member.rtbf_anonymized',
      actorId: memberId,
      payload: audit('withdrawn', 'anonymized', 'rtbf_request', 'member'),
    });
    await closeScopeTx(scopeTx, true);
  } catch (err) {
    await closeScopeTx(scopeTx, false);
    throw err;
  }
}

function token(t: TestApp, memberId: string, pariwarId: string): string {
  return signAccessToken(t.app, { memberId, pariwarId, deviceId: 'test-device' }, ACCESS_TTL_MS);
}

/** Fetch the contributor list, returning BOTH the parsed body and the RAW serialized JSON. */
async function fetchList(t: TestApp, f: Fixture): Promise<{ status: number; body: Json; raw: string }> {
  const res = await t.app.inject({
    method: 'GET',
    url: URL,
    headers: {
      origin: 'http://localhost:3001',
      authorization: `Bearer ${token(t, f.requester, f.pariwarId)}`,
    },
  });
  return { status: res.statusCode, body: res.json() as Json, raw: res.body };
}

describe.skipIf(!hasDatabase)('pool-contributors — RTBF erasure (:5433)', { timeout: 30000 }, () => {
  it('AC1/AC6: the erased contributor is ABSENT from the wire — no marker, no placeholder, no sentinel', async () => {
    const t = await createTestApp();
    try {
      const f = await seedPoolWithConfirmedContributors(t, {
        contributorNames: ['Rajesh Sharma', 'Asha Devi', 'Vikram Singh'],
      });
      const erased = f.contributors[1]!;

      const before = await fetchList(t, f);
      expect(before.status).toBe(200);
      expect(before.body['assigned']).toBe(true);
      const rowsBefore = before.body['confirmed'] as Array<Json>;
      expect(rowsBefore).toHaveLength(3);
      // The fixture genuinely EXERCISES the variant: the member about to be erased is really on the
      // list first, so a green result after the erasure cannot be vacuous.
      expect(rowsBefore).toContainEqual({ firstName: 'Asha', lastInitial: 'D' });

      await reallyAnonymize(t, f.pariwarId, erased.memberId);

      const after = await fetchList(t, f);
      expect(after.status).toBe(200);
      const rowsAfter = after.body['confirmed'] as Array<Json>;

      // (1) GONE — not renamed, not marked, not left as a placeholder someone can point at.
      expect(rowsAfter).toHaveLength(2);
      expect(rowsAfter).not.toContainEqual({ firstName: 'Asha', lastInitial: 'D' });
      expect(rowsAfter.some((r) => r['firstName'] === 'Asha')).toBe(false);

      // (2) THE SENTINEL APPEARS NOWHERE IN THE SERIALIZED RESPONSE. Asserted on the raw JSON, not a
      //     parsed field, so a leak through ANY new field is caught — this is the exact string the
      //     defect rendered to members in both locales.
      expect(after.raw).not.toContain(ANONYMIZED_SENTINEL);
      expect(after.raw).not.toContain('anonymized');
      expect(after.raw).not.toContain('anonymousMember');

      // (3) THE PEERS ARE UNTOUCHED — same names, same order, nothing shifted or dropped.
      expect(rowsAfter).toEqual([
        { firstName: 'Rajesh', lastInitial: 'S' },
        { firstName: 'Vikram', lastInitial: 'S' },
      ]);
    } finally {
      await teardown(t);
    }
  });

  it('AC6 / D3-aggregate: `rows` drops by one while `pending` is BYTE-IDENTICAL — the divergence IS the model', async () => {
    const t = await createTestApp();
    try {
      // Roster 6 = requester + 3 contributors + 2 who have not confirmed.
      const f = await seedPoolWithConfirmedContributors(t, {
        contributorNames: ['Rajesh Sharma', 'Asha Devi', 'Vikram Singh'],
        rosterPadding: 2,
      });

      const before = await fetchList(t, f);
      const pendingBefore = before.body['pending'];
      expect((before.body['confirmed'] as unknown[])).toHaveLength(3);

      await reallyAnonymize(t, f.pariwarId, f.contributors[1]!.memberId);

      const after = await fetchList(t, f);
      // ⭐ Contribution state CONFIRMED · Public representation OMITTED. The erased member still counts.
      // ⛔ A `rows.length === confirmedCount` assertion would encode the WRONG model — do not add one.
      expect((after.body['confirmed'] as unknown[])).toHaveLength(2);
      expect(after.body['pending']).toEqual(pendingBefore);
      // Spelled out so a regression that "reconciles" the two axes fails with a readable diff:
      // pending = rosterSize(6) − confirmedCount(3) = 3, and confirmedCount is the PRE-omission set.
      expect(after.body['pending']).toEqual({ count: 3, percentage: 50 });
    } finally {
      await teardown(t);
    }
  });

  it('AC8 / D7(c): the DROP-TO-ZERO case — `confirmed` is [] while `pending` still reports the rest', async () => {
    const t = await createTestApp();
    try {
      // The exact shape that rendered the contradiction: a pool of 3 whose ONLY confirmed
      // contributor is RTBF'd. Roster = requester + 1 contributor + 1 padding = 3.
      const f = await seedPoolWithConfirmedContributors(t, {
        contributorNames: ['Asha Devi'],
        rosterPadding: 1,
      });
      expect(f.rosterSize).toBe(3);

      await reallyAnonymize(t, f.pariwarId, f.contributors[0]!.memberId);
      const after = await fetchList(t, f);

      expect(after.body['confirmed']).toEqual([]);
      // rosterSize(3) − confirmedCount(1) = 2. The erased member STILL COUNTS as confirmed, so
      // `pending` is 2 and NOT 3 — the aggregate never understates confirmation.
      expect(after.body['pending']).toEqual({ count: 2, percentage: 67 });

      // ⛔⛔ AND THE ABSENCE OF A REASON FIELD IS ASSERTED EXPLICITLY. `.strict()` would reject one,
      // but a later "helpful" addition must fail HERE, loudly: a server-emitted reason field breaks
      // every read on every stale client (no OTA; the SDK parses with its BUNDLED schema and
      // MMKV-persists the result) — the hazard D5 dissolved, resurrected in full.
      const keys = Object.keys(after.body).sort();
      expect(keys).toEqual(['assigned', 'confirmed', 'pending', 'pool']);
      expect(after.raw).not.toContain('omittedCount');
      expect(after.raw).not.toContain('hasHiddenContributors');
      expect(after.raw).not.toContain('rowKey');
      expect(after.raw).not.toContain('"kind"');
    } finally {
      await teardown(t);
    }
  });

  it('AC2: the erasure is decided by the event REPLAY, so it holds for a member whose stream says so', async () => {
    const t = await createTestApp();
    try {
      const f = await seedPoolWithConfirmedContributors(t, {
        contributorNames: ['Rajesh Sharma', 'Asha Devi'],
      });
      await reallyAnonymize(t, f.pariwarId, f.contributors[1]!.memberId);

      // The clock-domain guard, end to end: `member.rtbf_anonymized` carries a DB-generated
      // `occurred_at` that is LATER than the app clock this request injects. A resolver bounded by
      // `lte(occurred_at, now)` would miss the event, resolve the member `active`, and render "Asha".
      // This request runs on the injected test clock, so the row's presence would prove the bug.
      const after = await fetchList(t, f);
      expect(after.raw).not.toContain('Asha');
      expect(after.body['confirmed']).toEqual([{ firstName: 'Rajesh', lastInitial: 'S' }]);
    } finally {
      await teardown(t);
    }
  });
});
