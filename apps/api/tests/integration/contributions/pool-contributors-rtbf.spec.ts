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
//
// ⚠⛔ SUPERSEDED 2026-09-19 by Story 11b.21 / `-222` (`#decision-2026-09-19-224`) — "Public
// representation: OMITTED" above now reads "the NAME is withheld, the ROW is KEPT": an erased
// contributor is `{ name: null }` IN POSITION, so `confirmed.length` equals the confirmed set and
// `pending` is still byte-identical (`-169` cl.6). The row is `{ name }`, MODE-RESOLVED (`-224` D3);
// under the default `full_name` a clean legal name is its own wire value. ⭐ The Story 11b.21 legs at
// the end of this file cover the mode flip, dirty names, the mononym, the five-cause byte-identity, the
// one-decrypt-per-row cost (D7) and the two fault classes (D4).

import { randomUUID } from 'node:crypto';

import {
  alert as alertDomain,
  encryption,
  ids,
  kyc,
  member as memberDomain,
  pool as poolDomain,
  schema,
} from '@twt/domain';
import { describe, expect, it, vi } from 'vitest';

import { signAccessToken } from '../../../src/modules/auth/member/tokens.js';
import { normalisePublicName } from '../../../src/modules/kyc/name-render.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { createTestApp, hasDatabase, teardown, type TestApp } from '../_setup.js';

// ⭐ Story 11b.21 — two PASS-THROUGH instruments on `@twt/domain` (the `public-pages/sahyog-vivran.spec.ts`
// model): a switchable fault on the KYC-profile read (the route's ONE per-row DB statement, `-224` D4),
// and a call counter on the batched lifecycle read the route must ⛔ no longer make (`-224` D7).
// ⚠ Why a module mock: the fault must hit the read the HANDLER makes, on its own scope tx, and a real
// DB fault cannot be aimed at one row of one request from outside.
const domainProbe = vi.hoisted(() => ({
  profileFailOnCall: null as number | null,
  profileCalls: 0,
  profileError: new Error('Connection terminated unexpectedly'),
  stateBatchCalls: 0,
}));
vi.mock('@twt/domain', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@twt/domain')>();
  return {
    ...actual,
    kyc: {
      ...actual.kyc,
      getMemberKycProfile: async (
        ...args: Parameters<typeof actual.kyc.getMemberKycProfile>
      ): ReturnType<typeof actual.kyc.getMemberKycProfile> => {
        domainProbe.profileCalls += 1;
        if (domainProbe.profileFailOnCall === domainProbe.profileCalls) throw domainProbe.profileError;
        return actual.kyc.getMemberKycProfile(...args);
      },
    },
    member: {
      ...actual.member,
      getCurrentMemberStates: async (
        ...args: Parameters<typeof actual.member.getCurrentMemberStates>
      ): ReturnType<typeof actual.member.getCurrentMemberStates> => {
        domainProbe.stateBatchCalls += 1;
        return actual.member.getCurrentMemberStates(...args);
      },
    },
  };
});

const ACCESS_TTL_MS = 15 * 60 * 1000;
const URL = '/api/v1/member/pool-contributors';
type Json = Record<string, unknown>;

/** The `member.rtbf_anonymized` sentinel, spelled out here so the leak assertion is literal. */
// ⭐ IMPORTED, ⛔ NOT re-typed. It used to be a hand-written `'[anonymized]'` literal ("spelled out here
// so the leak assertion is literal") — ⚠ which is the EXACT drift class this story's own AC3 forbids, in
// the one test that proves the leak is closed. `bounded-decrypt.ts`'s header argues at length that
// "sharing ONLY the constant while re-implementing the helper" is the danger; here the CONSTANT was the
// re-typed half. ⛔ Change `ANONYMIZED_SENTINEL` in @twt/domain with the literal in place and both
// `not.toContain(...)` assertions pass VACUOUSLY against a string that is no longer the sentinel — a
// green leak test over a live leak. Caught at the combined review (2026-09-01).
const ANONYMIZED_SENTINEL = memberDomain.ANONYMIZED_SENTINEL;

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
}

/**
 * One contributor to seed. ⭐ Story 11b.21 — modelled on `public-pages/sahyog-vivran.spec.ts`:
 *  · `corrupt: true` encrypts the name under a DIFFERENT (random) Pariwar's context ⇒ a real envelope
 *    whose AAD no longer matches ⇒ KMS rejects it (INVALID_ARGUMENT) — a per-envelope fault;
 *  · `noProfile: true` writes ⛔ no KYC row at all — the lawful-absence cause.
 */
type ContributorSeed = string | { readonly name: string; readonly corrupt?: boolean; readonly noProfile?: boolean };

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
  opts: { contributorNames: readonly ContributorSeed[]; rosterPadding?: number },
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
    for (const seed of opts.contributorNames) {
      const { name: legalName, corrupt = false, noProfile = false } =
        typeof seed === 'string' ? { name: seed } : seed;
      const memberId = randomUUID();
      await driveToActive(memberId);
      if (noProfile) {
        contributors.push({ memberId, legalName });
        continue;
      }
      // The Tier-1 KYC name — the ONLY place a contributor's name exists, and what the boundary
      // decrypts. Written through the real encryption path so `anonymizeMember` can really overwrite it.
      await scopeTx.tx.insert(schema.memberKycProfiles).values({
        memberId: ids.memberId(memberId),
        pariwarId: pid,
        nameCiphertext: await encryption.encryptKycField(
          legalName,
          corrupt ? randomUUID() : pariwarId,
          t.deps.encryption,
        ),
        dobCiphertext: await encryption.encryptKycField('1990-01-15', pariwarId, t.deps.encryption),
        photoCiphertext: null,
        aadhaarMaskedId: 'XXXX1234',
        verificationStrength: 'aadhaar_kyc',
        source: 'digilocker',
      });
      // Was: `firstName`/`lastInitial` derived with the production `splitFirstNameLastInitial` — the
      // Story 8.3 shielded form. Story 11b.21 (`-224` D3): under the default `full_name` mode a clean
      // legal name is its own wire value, so the legal name IS the expectation (explicit, ⛔ not re-derived).
      contributors.push({ memberId, legalName });
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
      // Story 11b.10 — the public address (NOT NULL, GLOBAL unique index). Minted per row.
      publicToken: poolDomain.mintPoolPublicToken(),
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
 * ⭐⭐ THE TOCTOU END-STATE, REPRODUCED DETERMINISTICALLY — ⛔ not a timing race.
 *
 * Overwrites the Tier-1 KYC name with the ENCRYPTED `[anonymized]` sentinel via the real
 * `anonymizeMember`, and ⛔ deliberately does NOT append `member.rtbf_anonymized`. The member's
 * event replay therefore still resolves `active` while the ciphertext is already erased — which is
 * EXACTLY what the handler observes when an RTBF commits between its state read and its ciphertext
 * read (the two take different snapshots under this transaction's READ COMMITTED isolation).
 *
 * ⛔ This is ⛔ NOT a claim that production ever leaves a member in this state — `anonymizeMember`
 *    and the projection share one transaction (`anonymize.ts:125`). It is a way to put the boundary
 *    in front of the same INPUT the race produces, without racing. A sleep-and-hope test would be
 *    flaky and would still only cover one interleaving.
 */
async function anonymizeCiphertextOnly(t: TestApp, pariwarId: string, memberId: string): Promise<void> {
  const scopeTx = await openScopeTx(t.deps, pariwarId);
  try {
    await memberDomain.anonymizeMember(scopeTx.tx, t.deps.encryption, {
      memberId: ids.memberId(memberId),
      pariwarId: ids.pariwarId(pariwarId),
    });
    await closeScopeTx(scopeTx, true);
  } catch (err) {
    await closeScopeTx(scopeTx, false);
    throw err;
  }
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
  // Was: "the erased contributor is ABSENT from the wire — no marker, no placeholder" — inverted by
  // `-222` cl.1 (Story 11b.21): the row is KEPT in position as `{ name: null }`; still no sentinel, no cause.
  it('AC1/AC6: the erased contributor is `{ name: null }` IN POSITION — no name, no cause, no sentinel', async () => {
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
      expect(rowsBefore).toContainEqual({ name: 'Asha Devi' });

      await reallyAnonymize(t, f.pariwarId, erased.memberId);

      const after = await fetchList(t, f);
      expect(after.status).toBe(200);
      const rowsAfter = after.body['confirmed'] as Array<Json>;

      // (1) Was: "GONE — `toHaveLength(2)`, not left as a placeholder". Now (`-222` cl.1): the NAME is
      //     gone and the ROW stays, in the producer's position, as a bare `{ name: null }`.
      expect(rowsAfter).toHaveLength(3);
      expect(rowsAfter[1]).toEqual({ name: null });
      expect(after.raw).not.toContain('Asha');

      // (2) THE SENTINEL APPEARS NOWHERE IN THE SERIALIZED RESPONSE. Asserted on the raw JSON, not a
      //     parsed field, so a leak through ANY new field is caught — this is the exact string the
      //     defect rendered to members in both locales.
      expect(after.raw).not.toContain(ANONYMIZED_SENTINEL);
      expect(after.raw).not.toContain('anonymized');
      expect(after.raw).not.toContain('anonymousMember');

      // (3) THE PEERS ARE UNTOUCHED — the same rows, nothing shifted in content or dropped.
      // ⚠⛔ ASSERTED AS A SET, ⛔ NOT A SEQUENCE, AND THE REASON IS A REAL PROPERTY OF THE READ, not
      // test convenience: `listConfirmedContributorsForPool` carries ⛔ NO `ORDER BY` (verified —
      // `packages/domain/src/contribution/read.ts`), so row order is whatever Postgres returns and is
      // NOT stable across runs. A `toEqual([...])` here passes alone and fails in the full suite.
      // ⚠ ANNOTATED 2026-09-19 (Story 11b.21): ⛔ no longer true — the read has been ORDERED since
      //   Story 11b.3 (earliest live confirmation's `event_version`, `member_id` final tie-break), so
      //   this file now asserts SEQUENCES (the position of the `null` row is the property under test).
      // ⭐ The property this story COULD have broken — that the bounded-concurrency batch preserves its
      // INPUT order rather than completion order — is proven where it is actually decidable, in
      // `tests/unit/bounded-decrypt.test.ts` under deliberately reversed latency. Filed as a standing
      // finding in deferred-work.md; ⛔ not fixed here (an ORDER BY on the domain read is out of diff).
      // Was: `toHaveLength(2)` + two `toContainEqual` on the shielded form.
      expect(rowsAfter).toEqual([{ name: 'Rajesh Sharma' }, { name: null }, { name: 'Vikram Singh' }]);
    } finally {
      await teardown(t);
    }
  });

  // Was: "`rows` drops by one while `pending` is BYTE-IDENTICAL" — inverted by `-222` cl.1 (Story 11b.21):
  // no row drops; `pending` is still byte-identical (`-169` cl.6).
  it('AC6 / D3-aggregate: the erased row is KEPT and `pending` is BYTE-IDENTICAL', async () => {
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
      // ⚠ SUPERSEDED 2026-09-19 (Story 11b.21 / `-222`): the NAME is omitted, the row is kept ⇒ the
      //   row count now EQUALS the confirmed set. Was: `toHaveLength(2)`.
      expect((after.body['confirmed'] as unknown[])).toHaveLength(3);
      expect(after.body['pending']).toEqual(pendingBefore);
      // Spelled out so a regression that "reconciles" the two axes fails with a readable diff:
      // pending = rosterSize(6) − confirmedCount(3) = 3, and confirmedCount is the PRE-omission set.
      expect(after.body['pending']).toEqual({ count: 3, percentage: 50 });
    } finally {
      await teardown(t);
    }
  });

  // Was: "the DROP-TO-ZERO case — `confirmed` is []" — inverted by `-222` cl.1 (Story 11b.21): the one
  // erased contributor is ONE `{ name: null }` row.
  it('AC8 / D7(c): the former DROP-TO-ZERO case — `confirmed` is ONE unnamed row while `pending` still reports the rest', async () => {
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

      expect(after.body['confirmed']).toEqual([{ name: null }]);
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

      // ⚠ Review fix (2026-08-30): this docstring previously claimed the request "runs on the
      // injected test clock" — it does not; no clock is skewed anywhere in this file. Investigated
      // adding a genuine end-to-end clock-skew case (bump the written `member.rtbf_anonymized` row's
      // `occurred_at` into the future) and found it currently BLOCKED, not merely undone: `events_log`
      // is append-only by grant (`twt_app` has no UPDATE — "permission denied for table events_log",
      // verified live against :5433) and `ProjectMemberStateInput` has no `occurredAt` override (the
      // schema's own comment: "test clock injection lands with Story 1.10 audit-log + downstream
      // stories" — i.e. not yet built). Filed to deferred-work.md as a decision for that future
      // clock-injection substrate rather than faked here. What THIS test actually proves: the erasure
      // is read off the REAL event stream via `projectMemberState`/`anonymizeMember`, not a stub — the
      // no-`occurred_at`-bound property itself is proven structurally, at the SQL-shape level, by
      // `packages/domain/tests/member/batched-member-states.test.ts`'s "THE CLOCK DOMAIN" suite.
      const after = await fetchList(t, f);
      expect(after.raw).not.toContain('Asha');
      // Was: `[{ firstName: 'Rajesh', lastInitial: 'S' }]` ("A single surviving row"). Now the erased row
      // is kept, unnamed, in position (`-222` cl.1), and the survivor carries the full-name form.
      expect(after.body['confirmed']).toEqual([{ name: 'Rajesh Sharma' }, { name: null }]);
    } finally {
      await teardown(t);
    }
  });

  // ── The TOCTOU class (second review pass, 2026-08-30) ────────────────────────────────────────────
  // Load-bearing-invariant family 2. The first review pass named this race as the justification for a
  // per-row state re-check, and left the property asserted NOWHERE: the tests above anonymize BETWEEN
  // two complete requests, never mid-request, and the unit test stubbed the re-check to a constant.
  // The re-check has since been removed — it was the construction Trap 1 rejects by name, AND it did
  // not close the window, because the state read and the ciphertext read take different snapshots.
  // The guarantee now lives on the DECRYPTED PLAINTEXT, which is snapshot-independent; this is the
  // test that proves it, on the real path, with no timing dependence.
  it('AC1 (TOCTOU): a stale state read can NEVER put the `[anonymized]` sentinel on the wire', async () => {
    const t = await createTestApp();
    try {
      const f = await seedPoolWithConfirmedContributors(t, {
        contributorNames: ['Rajesh Sharma', 'Asha Devi'],
      });
      const erased = f.contributors[1]!;
      const survivor = f.contributors[0]!;

      // Captured BEFORE, so the aggregate assertion below compares against the real value rather
      // than a hand-computed literal that would rot with the fixture.
      const before = await fetchList(t, f);
      expect(before.body['confirmed']).toHaveLength(2);
      const pendingBefore = before.body['pending'];

      // Erase the CIPHERTEXT ONLY. The replay still resolves this member `active`, so the batched
      // state read — and any per-row re-check that might be re-added later — says "representable"
      // and schedules the decrypt. This is precisely the input the race produces.
      await anonymizeCiphertextOnly(t, f.pariwarId, erased.memberId);

      // ⭐⭐ THE PREMISE, ASSERTED — ⛔ not assumed. Without this the test could pass for the WRONG
      //    REASON: if the replay ever resolved this member `anonymized`, the PRE-FILTER at step (6a)
      //    [⚠ deleted by Story 11b.21, `-224` D7 — the sentinel is now the ONLY erasure check, so this
      //    premise is kept as a pin on `anonymizeMember`'s contract rather than on a filter]
      //    would omit the row and the sentinel guard would ⛔ never be exercised, leaving a green test
      //    that no longer covers the thing it is named after. `anonymizeMember` documents that it
      //    "does NOT touch `members.state` or the event stream" — this pins that contract from the
      //    consumer side, so a future change that starts writing state fails HERE, loudly, instead of
      //    silently hollowing out the only TOCTOU coverage in the suite.
      const probe = await openScopeTx(t.deps, f.pariwarId);
      try {
        const stateNow = await memberDomain.getCurrentMemberState(probe.tx, ids.memberId(erased.memberId));
        expect(stateNow).not.toBe('anonymized');
      } finally {
        await closeScopeTx(probe, false);
      }

      const after = await fetchList(t, f);
      expect(after.status).toBe(200);

      // ⭐ THE ASSERTION THAT WOULD HAVE FAILED BEFORE THIS FIX. `decryptKycField` SUCCEEDS here —
      //   the sentinel is validly encrypted — and `splitFirstNameLastInitial('[anonymized]')` returns
      //   a NON-EMPTY `firstName`, so the empty-name guard does not catch it. Without the sentinel
      //   check the row renders as a contributor literally named "[anonymized]".
      expect(after.raw).not.toContain('[anonymized]');
      expect(after.raw).not.toContain(erased.legalName);
      const rows = after.body['confirmed'] as readonly Record<string, unknown>[];
      expect(rows.some((r) => r['name'] === '[anonymized]')).toBe(false);

      // Was: "the row is OMITTED, ⛔ not blanked and ⛔ not replaced by a marker — D5, one layer later"
      //   (`toHaveLength(1)`). Inverted by `-222` cl.1/cl.3 (Story 11b.21): the row is `{ name: null }`
      //   IN POSITION — the placeholder is rendered by the client from the ruled key, ⛔ never the wire.
      expect(rows).toEqual([{ name: survivor.legalName }, { name: null }]);

      // ⛔ AND NO AGGREGATE MOVED (D3-aggregate): the erased member's contribution is still CONFIRMED,
      //   only its public representation is gone. `pending` must be byte-identical to the un-erased
      //   run — the divergence between `rows.length` and the confirmed set IS the ruled model.
      expect(after.body['pending']).toEqual(pendingBefore);
    } finally {
      await teardown(t);
    }
  });

  // ── Story 11b.21 (`#decision-2026-09-19-224`) ───────────────────────────────────────────────────
  describe('Story 11b.21 — name-form parity and the unnamed row', () => {
    /** Flip the Pariwar's stored presentation mode — the `member-name-form-parity.spec.ts` model. */
    async function setMode(t: TestApp, pariwarId: string, mode: 'full_name' | 'shielded_name'): Promise<void> {
      const scopeTx = await openScopeTx(t.deps, pariwarId);
      try {
        await kyc.setPublicNamePresentationMode(scopeTx.tx, {
          pariwarId: ids.pariwarId(pariwarId),
          mode,
          changedByActor: null,
          changedByDisplay: null,
          rationale: 'test fixture — the member name form follows the stored mode (-189 cl.3, -181)',
          auditId: randomUUID(),
        });
        await closeScopeTx(scopeTx, true);
      } catch (err) {
        await closeScopeTx(scopeTx, false);
        throw err;
      }
    }

    /** What the PUBLIC Sahyog Vivran route emits for a stored name — its own two functions, called. */
    const publicForm = (mode: 'full_name' | 'shielded_name', stored: string): string | null =>
      normalisePublicName(kyc.resolvePublicMemberName(mode, stored));

    it('AC1: the member row is MODE-RESOLVED — flipping the stored mode changes the rendered form, at parity with public', async () => {
      const t = await createTestApp();
      try {
        const stored = [
          'Rajesh Kumar Sharma',
          'Rajesh \u200bSharma', // a zero-width space inside the stored name
          'Sunita .', // a punctuation-only second token
          'Ravi', // a mononym
          '\u200b\u2060\ufeff', // invisible-only
          '\u202e\u2066', // bidi-only
        ];
        const f = await seedPoolWithConfirmedContributors(t, { contributorNames: stored });

        // ⭐ The DEFAULT mode (`full_name`, no row written) — the full name, cleaned.
        const full = (await fetchList(t, f)).body['confirmed'];
        expect(full).toEqual([
          { name: 'Rajesh Kumar Sharma' },
          { name: 'Rajesh Sharma' },
          { name: 'Sunita' },
          { name: 'Ravi' },
          { name: null },
          { name: null },
        ]);

        await setMode(t, f.pariwarId, 'shielded_name');
        const shielded = (await fetchList(t, f)).body['confirmed'];
        // ⭐ The rendered form CHANGES with the stored mode — the only test that catches a hard-coded
        // literal. The dirty `"Rajesh \u200bSharma"` gives the public string `"Rajesh S."` (Trap 4:
        // without the token cleaning the member got `"Rajesh \u200b."`, LESS than public). A mononym
        // is SHOWN (`-224` D3, an extension of `-181`) — the one place the member sees MORE.
        expect(shielded).toEqual([
          { name: 'Rajesh S.' },
          { name: 'Rajesh S.' },
          { name: 'Sunita' },
          { name: 'Ravi' },
          { name: null },
          { name: null },
        ]);

        // ⭐⭐ PARITY, by CALLING the public route's own functions (⛔ never transcribed): under every
        // mode, every stored name, the member form EQUALS the public form — except where the public
        // form is withheld (the shielded mononym arm), where the member sees the name.
        for (const [mode, rows] of [
          ['full_name', full],
          ['shielded_name', shielded],
        ] as const) {
          stored.forEach((name, i) => {
            const member = (rows as Array<{ name: string | null }>)[i]!.name;
            const pub = publicForm(mode, name);
            if (pub !== null) expect(member, `${mode} / row ${i}`).toBe(pub);
          });
        }
        expect(publicForm('shielded_name', 'Ravi')).toBeNull();
        expect(publicForm('shielded_name', 'Sunita .')).toBeNull();
      } finally {
        await teardown(t);
      }
    });

    it('AC2: every confirmed row is KEPT, in producer order, and the five withheld causes are byte-identical', async () => {
      const t = await createTestApp();
      try {
        const f = await seedPoolWithConfirmedContributors(t, {
          contributorNames: [
            'Anita Verma', // C1
            'Asha Devi', // C2 — RTBF-erased below
            { name: 'Bhavesh Patel', noProfile: true }, // C3 — no KYC profile row
            { name: 'Chandra Iyer', corrupt: true }, // C4 — a corrupt envelope
            'Vikram Singh', // C5
          ],
          rosterPadding: 2,
        });
        const before = await fetchList(t, f);
        await reallyAnonymize(t, f.pariwarId, f.contributors[1]!.memberId);

        domainProbe.stateBatchCalls = 0;
        const after = await fetchList(t, f);
        expect(after.status).toBe(200);
        const rows = after.body['confirmed'] as Array<Json>;
        expect(rows).toEqual([{ name: 'Anita Verma' }, { name: null }, { name: null }, { name: null }, { name: 'Vikram Singh' }]);

        // ⭐ BYTE-IDENTICAL on the wire — ⛔ no field, key or ordering difference tells erasure, no
        // profile and a failed decrypt apart (`-222` cl.2).
        const serialized = rows.slice(1, 4).map((r) => JSON.stringify(r));
        expect(new Set(serialized).size).toBe(1);
        expect(after.raw).not.toContain('Asha');
        expect(after.raw).not.toContain('Bhavesh');
        expect(after.raw).not.toContain('Chandra');
        expect(after.raw).not.toContain(ANONYMIZED_SENTINEL);

        // `-224` D7: ⛔ no lifecycle read on this path — the erasure is caught at the plaintext.
        expect(domainProbe.stateBatchCalls).toBe(0);
        // `-169` cl.6: `pending` byte-identical, from `confirmed.length` (roster 8 − 5 confirmed = 3).
        expect(after.body['pending']).toEqual(before.body['pending']);
        expect(after.body['pending']).toEqual({ count: 3, percentage: 38 });
        expect(Object.keys(after.body).sort()).toEqual(['assigned', 'confirmed', 'pending', 'pool']);
      } finally {
        await teardown(t);
      }
    });

    it('AC2/AC7 (D7): an erased row and a corrupt row each cost EXACTLY ONE `decryptDek` — a named row does too', async () => {
      // ⚠ Measured per pool of ONE contributor, so the count is the row's own cost and nothing else.
      // ⚠ Residual, recorded ⛔ not closed: a no-profile row costs ZERO (11b-3b sixth pass; now this route too).
      const cases: Array<{ seed: ContributorSeed; erase?: boolean; expected: number }> = [
        { seed: 'Anita Verma', expected: 1 },
        { seed: 'Asha Devi', erase: true, expected: 1 },
        { seed: { name: 'Chandra Iyer', corrupt: true }, expected: 1 },
        { seed: { name: 'Bhavesh Patel', noProfile: true }, expected: 0 },
      ];
      const t = await createTestApp();
      try {
        for (const c of cases) {
          const f = await seedPoolWithConfirmedContributors(t, { contributorNames: [c.seed] });
          if (c.erase) await reallyAnonymize(t, f.pariwarId, f.contributors[0]!.memberId);
          const decryptDek = vi.spyOn(t.deps.encryption.kms, 'decryptDek');
          try {
            const res = await fetchList(t, f);
            expect(res.body['assigned']).toBe(true);
            expect(decryptDek, JSON.stringify(c.seed)).toHaveBeenCalledTimes(c.expected);
          } finally {
            decryptDek.mockRestore();
          }
        }
      } finally {
        await teardown(t);
      }
    });

    it('AC7 (D4): a KMS OUTAGE on ONE row of MANY self-suppresses the list — ⛔ never a list of placeholders', async () => {
      const t = await createTestApp();
      try {
        const f = await seedPoolWithConfirmedContributors(t, {
          contributorNames: ['Anita Verma', 'Bhavesh Patel', 'Vikram Singh'],
        });
        vi.spyOn(t.deps.encryption.kms, 'decryptDek').mockRejectedValueOnce(
          Object.assign(new Error('14 UNAVAILABLE: kms'), { code: 14 }),
        );
        const res = await fetchList(t, f);
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ assigned: false });
      } finally {
        vi.restoreAllMocks();
        await teardown(t);
      }
    });

    it('AC7 (D4): a STATUS-LESS profile-read failure self-suppresses the list — ⛔ never a null row', async () => {
      const t = await createTestApp();
      try {
        const f = await seedPoolWithConfirmedContributors(t, {
          contributorNames: ['Anita Verma', 'Bhavesh Patel'],
        });
        domainProbe.profileCalls = 0;
        domainProbe.profileFailOnCall = 2;
        const res = await fetchList(t, f);
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ assigned: false });
        expect(res.raw).not.toContain('Anita');
      } finally {
        domainProbe.profileFailOnCall = null;
        await teardown(t);
      }
    });

    it('AC7 (D4): a per-envelope rejection (INVALID_ARGUMENT) is that row\'s `{ name: null }` — the others render', async () => {
      const t = await createTestApp();
      try {
        const f = await seedPoolWithConfirmedContributors(t, {
          contributorNames: ['Anita Verma', 'Vikram Singh'],
        });
        vi.spyOn(t.deps.encryption.kms, 'decryptDek').mockRejectedValueOnce(
          Object.assign(new Error('3 INVALID_ARGUMENT: bad envelope'), { code: 3 }),
        );
        const res = await fetchList(t, f);
        const rows = res.body['confirmed'] as Array<Json>;
        expect(rows).toHaveLength(2);
        expect(rows.filter((r) => r['name'] === null)).toHaveLength(1);
      } finally {
        vi.restoreAllMocks();
        await teardown(t);
      }
    });
  });
});
