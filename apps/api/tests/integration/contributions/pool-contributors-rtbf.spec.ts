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
import { splitFirstNameLastInitial } from '../../../src/modules/member-pool/name.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { createTestApp, hasDatabase, teardown, type TestApp } from '../_setup.js';

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
      // ⭐ Derived with the PRODUCTION splitter, ⛔ never a second hand-rolled `split(' ')` (second
      //   review pass): a fixture that re-implements the logic under test can agree with a broken
      //   implementation. These fields are the assertion source for the sentinel test below.
      const { firstName, lastInitial } = splitFirstNameLastInitial(legalName);
      contributors.push({ memberId, legalName, firstName, lastInitial });
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

      // (3) THE PEERS ARE UNTOUCHED — the same rows, nothing shifted in content or dropped.
      // ⚠⛔ ASSERTED AS A SET, ⛔ NOT A SEQUENCE, AND THE REASON IS A REAL PROPERTY OF THE READ, not
      // test convenience: `listConfirmedContributorsForPool` carries ⛔ NO `ORDER BY` (verified —
      // `packages/domain/src/contribution/read.ts`), so row order is whatever Postgres returns and is
      // NOT stable across runs. A `toEqual([...])` here passes alone and fails in the full suite.
      // ⭐ The property this story COULD have broken — that the bounded-concurrency batch preserves its
      // INPUT order rather than completion order — is proven where it is actually decidable, in
      // `tests/unit/bounded-decrypt.test.ts` under deliberately reversed latency. Filed as a standing
      // finding in deferred-work.md; ⛔ not fixed here (an ORDER BY on the domain read is out of diff).
      expect(rowsAfter).toHaveLength(2);
      expect(rowsAfter).toContainEqual({ firstName: 'Rajesh', lastInitial: 'S' });
      expect(rowsAfter).toContainEqual({ firstName: 'Vikram', lastInitial: 'S' });
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
      // A single surviving row, so this one IS order-free by construction.
      expect(after.body['confirmed']).toEqual([{ firstName: 'Rajesh', lastInitial: 'S' }]);
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
      expect(rows.some((r) => r['firstName'] === '[anonymized]')).toBe(false);
      expect(rows).not.toContainEqual({ firstName: erased.firstName, lastInitial: erased.lastInitial });

      // ⛔ And the row is OMITTED, ⛔ not blanked and ⛔ not replaced by a marker — D5, one layer
      //   later. The unaffected contributor is untouched, so this is an omission and not a collapse.
      expect(rows).toContainEqual({ firstName: survivor.firstName, lastInitial: survivor.lastInitial });
      expect(rows).toHaveLength(1);

      // ⛔ AND NO AGGREGATE MOVED (D3-aggregate): the erased member's contribution is still CONFIRMED,
      //   only its public representation is gone. `pending` must be byte-identical to the un-erased
      //   run — the divergence between `rows.length` and the confirmed set IS the ruled model.
      expect(after.body['pending']).toEqual(pendingBefore);
    } finally {
      await teardown(t);
    }
  });
});
