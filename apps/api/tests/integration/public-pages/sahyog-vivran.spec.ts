// The PUBLIC per-claim Sahyog Vivran route — live-DB integration (Story 11b.3, Task 3; AC1, AC3, AC5, AC6).
//
// Drives `GET /api/v1/p/:pariwarId/public-pages/sahyog-vivran/:driveToken` through
// `app.inject` against real Postgres.
//
// ⭐⭐ THE LOAD-BEARING FAMILY IS THE **NEGATIVE** ONE: this route returns ⛔ NO person, ⛔ NO
// ciphertext, ⛔ NO internal identifier and ⛔ NO rupee figure — which is the property the D6(b) split
// bought, and the reason the surface needs ⛔ no Panel ruling of its own.
//
// Families:
//   · the response shape — ⛔ NOTHING on the wire but the ten classified fields.
//   · ⭐ 404 COLLAPSES every "nothing to show" case — ⭐ FOUR of them since 11b.10: an unknown
//     ADDRESS · a `spawned` pool · a switched-off Pariwar · and a REAL drive addressed with a WRONG
//     or ABSENT token. ⛔ Byte-identical. ⚠ AMENDED, ⛔ not deleted: the ground used to be *"because
//     `P-YYYY-MM-###` is SEQUENTIAL"* — the sequential identifier is ⛔ no longer the address, so the
//     ground is now the fourth case, which is what stops the TOKEN itself becoming testable.
//   · ⭐ D4(b): `live` + `closed` + `settled` render, and the vocabulary is the PUBLIC one.
//   · ⭐ AC3: the confirmed count is canonical-events-only, and yellow can NEVER reach it.
//   · ⭐ AC5: the appeal lineage is derived AT REQUEST TIME (D12(a) — ⛔ no queue, ⛔ no consumer),
//     and carries ⛔ no rationale and ⛔ no reviewer.

import { randomUUID } from 'node:crypto';

import { PublicSahyogVivranResponse } from '@twt/contracts';
import { claim as claimDomain, encryption, ids, member as memberDomain, schema } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { createTestApp, hasDatabase, teardown, type TestApp } from '../_setup.js';

// ⭐⭐ STORY 11b.10 — THE ROUTE IS ADDRESSED BY THE DRIVE'S **OPAQUE PUBLIC TOKEN**, ⛔ never by
// `P-YYYY-MM-###`. The parameter is named `driveToken` and there is EXACTLY ONE address form.
const ROUTE = (pariwarId: string, driveToken: string): string =>
  `/api/v1/p/${pariwarId}/public-pages/sahyog-vivran/${encodeURIComponent(driveToken)}`;

/**
 * The FIXTURE'S token for a seeded drive.
 *
 * ⛔⛔ A TEST CONVENTION AND ⛔ NOTHING ELSE — it is derived from the canonical identifier ONLY so a
 * test can address the drive it just seeded without threading a return value through thirty call
 * sites. ⭐ The PRODUCTION mint is 128 bits of CSPRNG entropy and is derivable from ⛔ NOTHING
 * (D2, `pool/public-token.ts`). ⛔ Do not read this helper as evidence that tokens are derived.
 */
const tokenFor = (canonicalIdentifier: string): string => `tok-${canonicalIdentifier}`;

interface SeedSpec {
  canonicalIdentifier: string;
  /**
   * ⭐ The drive's PUBLIC ADDRESS token (Story 11b.10). Defaults to {@link tokenFor} — override only
   * when a test needs two drives whose identifiers collide, or an address it will deliberately miss.
   */
  publicToken?: string;
  poolState?: 'spawned' | 'live' | 'closed' | 'settled';
  district?: string;
  /** How many `contribution.confirmed` events to seed for the pool. */
  confirmed?: number;
  /** How many of those confirmations to walk back with a compensating reversal. */
  reversed?: number;
  /** Seed a YELLOW `contribution.utr-attested` event — ⛔ it must NEVER reach the count. */
  attested?: number;
  /** Seed a `claim.reversed` event on the claim's own stream. */
  appeal?: { stage: 1 | 2 | 3; category: string };
  /** Seed N `member_pool_assignments` rows — the EXPECTED side of the outcome. */
  assigned?: number;
  /**
   * ⭐ Seed a real Tier-1 encrypted KYC name for the claim subject. Present on purpose in the
   * DEFAULT fixture: this route must return ⛔ NOTHING derived from it, and a fixture with no
   * ciphertext at all could not prove that.
   */
  legalName?: string;
  /**
   * ⭐ Story 11b.3a — seed the claim's nominee bank accounts (Tier-1 ciphertext, encrypted the way
   * the real write path does). ⛔ Omitted = the 6.8 AC3 "never collected" absence signal.
   */
  nomineeBank?: readonly {
    rank: 1 | 2;
    holder: string;
    account: string;
    ifsc: string;
    vpa?: string;
    bankName: string;
    branch?: string;
  }[];
  /**
   * ⭐ Story 11b.3a — the Pariwar's masking window. ⛔ Omitted = ⛔ NO SCHEDULE ROW, which is
   * `D8-default` FAIL-OPEN (`2026-09-02-179` cl.1) and is the DEFAULT for every Pariwar until the
   * Trust acts — so the default fixture exercises the fail-open path, ⛔ not a configured one.
   */
  masking?: { mode: 'after_days'; maskAfterDays: number } | { mode: 'permanent' };
  /** How long ago the drive emitted `pool.closed`. Default 2 days. */
  closedDaysAgo?: number;
  /**
   * ⭐ Emit a `pool.settled` event this many days ago, IN ADDITION to `pool.closed`.
   *
   * ⚠ Exists for ONE regression (second-pass review, 2026-09-03): a drive that closed long ago and
   * settled recently. `DRIVE_CLOSED_AT` takes the LATEST such event, so reading masking from it made
   * a late settlement RESET the window and re-publish details that were already masked.
   */
  settledDaysAgo?: number;
}

async function seedDrive(t: TestApp, spec: SeedSpec): Promise<{ pariwarId: string }> {
  const pariwarId = randomUUID();
  const scopeTx = await openScopeTx(t.deps, pariwarId);
  try {
    const pid = ids.pariwarId(pariwarId);
    const memberId = randomUUID();
    const claimCaseId = randomUUID();
    const poolId = randomUUID();

    await scopeTx.client.query(
      `INSERT INTO members (member_id, pariwar_id, state, state_event_version)
       VALUES ($1, $2, 'active', 1)`,
      [memberId, pariwarId],
    );
    if (spec.legalName !== undefined) {
      await scopeTx.tx.insert(schema.memberKycProfiles).values({
        memberId: ids.memberId(memberId),
        pariwarId: pid,
        nameCiphertext: await encryption.encryptKycField(
          spec.legalName,
          pariwarId,
          t.deps.encryption,
        ),
        dobCiphertext: await encryption.encryptKycField('1970-01-15', pariwarId, t.deps.encryption),
        verificationStrength: 'aadhaar_kyc',
        source: 'digilocker',
      });
    }
    if (spec.district !== undefined) {
      await scopeTx.client.query(
        `INSERT INTO member_postings (posting_id, member_id, pariwar_id, district, is_retirement, created_at)
         VALUES ($1, $2, $3, $4, false, now() - interval '10 days')`,
        [randomUUID(), memberId, pariwarId, spec.district],
      );
    }

    await scopeTx.client.query("SET LOCAL app.claim_state_writer = 'on'");
    await scopeTx.client.query(
      `INSERT INTO claims (claim_case_id, pariwar_id, deceased_member_id, intake_channels,
                           current_state, state_event_version)
       VALUES ($1, $2, $3, ARRAY['member_app']::claim_intake_channel[], 'approved', 1)`,
      [claimCaseId, pariwarId, memberId],
    );
    await scopeTx.client.query("SET LOCAL app.claim_state_writer = 'off'");

    await scopeTx.client.query("SET LOCAL app.pool_state_writer = 'on'");
    await scopeTx.client.query(
      // ⚠ `public_token` (Story 11b.10) is NOT NULL with a GLOBAL unique index. ⭐ It is ALSO the
      // route parameter now — `spec.publicToken` is what the tests address the drive by, and the
      // canonical identifier below is seeded only so the page can still RENDER it (Trap 3: retained
      // and displayed, ⛔ never addressable).
      `INSERT INTO pools (pool_id, pariwar_id, cycle_id, claim_case_id, pool_index,
                          pool_canonical_identifier, support_category, benefit_mechanism,
                          fixed_amount, current_state, state_event_version, public_token)
       VALUES ($1, $2, $3, $4, 0, $5, 'death_support', 'pool', 100, $6, 1, $7)`,
      [
        poolId,
        pariwarId,
        randomUUID(),
        claimCaseId,
        spec.canonicalIdentifier,
        spec.poolState ?? 'closed',
        spec.publicToken ?? tokenFor(spec.canonicalIdentifier),
      ],
    );
    await scopeTx.client.query("SET LOCAL app.pool_state_writer = 'off'");

    // The close/settle instant the surface reads (AC3's settlement-state source).
    if ((spec.poolState ?? 'closed') !== 'live' && (spec.poolState ?? 'closed') !== 'spawned') {
      await scopeTx.client.query(
        `INSERT INTO events_log (stream_id, event_type, payload, event_version, pariwar_id, occurred_at)
         VALUES ($1, 'pool.closed', '{}'::jsonb, 1, $2, now() - ($3 || ' days')::interval)`,
        [poolId, pariwarId, String(spec.closedDaysAgo ?? 2)],
      );
      // ⭐ The LATER settle event, when the fixture asks for one. Its whole purpose is to be NEWER
      // than the close event, so `DRIVE_CLOSED_AT` (latest) and `DRIVE_MASKING_FROM` (earliest)
      // disagree — which is exactly the condition the un-masking defect needed.
      if (spec.settledDaysAgo !== undefined) {
        await scopeTx.client.query(
          `INSERT INTO events_log (stream_id, event_type, payload, event_version, pariwar_id, occurred_at)
           VALUES ($1, 'pool.settled', '{}'::jsonb, 2, $2, now() - ($3 || ' days')::interval)`,
          [poolId, pariwarId, String(spec.settledDaysAgo)],
        );
      }
    }

    for (let i = 0; i < (spec.assigned ?? 0); i += 1) {
      const other = randomUUID();
      await scopeTx.client.query(
        `INSERT INTO members (member_id, pariwar_id, state, state_event_version)
         VALUES ($1, $2, 'active', 1)`,
        [other, pariwarId],
      );
      // ⚠ The PK is `(pool_id, member_id)` — there is no `assignment_id` column.
      await scopeTx.client.query(
        `INSERT INTO member_pool_assignments (pariwar_id, pool_id, member_id, cycle_id, assigned_at)
         VALUES ($1, $2, $3, $4, now())`,
        [pariwarId, poolId, other, randomUUID()],
      );
    }

    const alertStream = randomUUID();
    let version = 1;
    const confirmedEventIds: string[] = [];
    for (let i = 0; i < (spec.confirmed ?? 0); i += 1) {
      const eventId = randomUUID();
      confirmedEventIds.push(eventId);
      await scopeTx.client.query(
        `INSERT INTO events_log (event_id, stream_id, event_type, payload, event_version, pariwar_id, occurred_at)
         VALUES ($1, $2, 'contribution.confirmed', $3::jsonb, $4, $5, now() - interval '3 days')`,
        [eventId, alertStream, JSON.stringify({ poolId, memberId: randomUUID() }), version, pariwarId],
      );
      version += 1;
    }
    for (let i = 0; i < (spec.reversed ?? 0); i += 1) {
      await scopeTx.client.query(
        `INSERT INTO events_log (stream_id, event_type, payload, event_version, pariwar_id, occurred_at)
         VALUES ($1, 'reconciliation.confirmation-reversed', $2::jsonb, $3, $4, now() - interval '2 days')`,
        [
          alertStream,
          JSON.stringify({ poolId, reversedConfirmedEventId: confirmedEventIds[i] }),
          version,
          pariwarId,
        ],
      );
      version += 1;
    }
    // ⛔ YELLOW. Seeded on purpose: it must be structurally unable to reach the confirmed count.
    for (let i = 0; i < (spec.attested ?? 0); i += 1) {
      await scopeTx.client.query(
        `INSERT INTO events_log (stream_id, event_type, payload, event_version, pariwar_id, occurred_at)
         VALUES ($1, 'contribution.utr-attested', $2::jsonb, $3, $4, now() - interval '3 days')`,
        // ⚠ A UNIQUE `tr` per event: `contribution_utr_attested_tr_uq` enforces the Story 8.7
        // idempotency reference, so a repeated literal 23505s the seed rather than the assertion.
        [
          alertStream,
          JSON.stringify({ poolId, memberId: randomUUID(), tr: `TR-${randomUUID().slice(0, 12)}` }),
          version,
          pariwarId,
        ],
      );
      version += 1;
    }

    // ⭐ Story 11b.3a — the nominee bank accounts, encrypted under the SAME field class the real
    // write path uses (`claim_nominee_bank`). ⛔ Not a plaintext shortcut: the route DECRYPTS, so a
    // fixture that stored plaintext would prove the decrypt path works when it does not.
    for (const acct of spec.nomineeBank ?? []) {
      const enc = (v: string) =>
        encryption
          .encryptTier1(
            Buffer.from(v, 'utf-8'),
            { pariwarId, fieldClass: 'claim_nominee_bank' },
            t.deps.encryption.kms,
            t.deps.encryption.kekRef,
          )
          .then((ct) => encryption.serializeEnvelope(ct));
      await scopeTx.tx.insert(schema.claimNomineeBankAccounts).values({
        claimCaseId: ids.claimId(claimCaseId),
        pariwarId: pid,
        accountRank: acct.rank,
        accountHolderNameCiphertext: await enc(acct.holder),
        accountNumberCiphertext: await enc(acct.account),
        ifscCiphertext: await enc(acct.ifsc),
        vpaCiphertext: acct.vpa === undefined ? null : await enc(acct.vpa),
        bankName: acct.bankName,
        branch: acct.branch ?? null,
        ifscValidated: true,
      });
    }

    // ⭐ Story 11b.3a — the masking window. ⚠ Written through the GOVERNED accessor, ⛔ not a raw
    // insert: a raw insert would bypass the rationale/anchor/grant checks the ruling requires, so
    // the fixture would not exercise the path an operator actually takes.
    if (spec.masking !== undefined) {
      await claimDomain.setNomineeBankMaskingSchedule(scopeTx.tx, {
        pariwarId: pid,
        setting: spec.masking,
        // ⚠ Well in the past so the window is IN FORCE at request time.
        effectiveFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        changedByActor: null,
        changedByDisplay: null,
        rationale: 'test fixture — the per-Pariwar nominee-bank masking window',
        auditId: randomUUID(),
      });
    }

    if (spec.appeal !== undefined) {
      await scopeTx.client.query(
        `INSERT INTO events_log (stream_id, event_type, payload, event_version, pariwar_id, occurred_at)
         VALUES ($1, 'claim.reversed', $2::jsonb, 7, $3, now() - interval '5 days')`,
        [
          claimCaseId,
          JSON.stringify({
            reversed_at_stage: spec.appeal.stage,
            disposition_category: spec.appeal.category,
          }),
          pariwarId,
        ],
      );
    }

    await closeScopeTx(scopeTx, true);
  } catch (err) {
    await closeScopeTx(scopeTx, false);
    throw err;
  }
  return { pariwarId };
}

async function setPublicationEnabled(t: TestApp, pariwarId: string, enabled: boolean): Promise<void> {
  const scopeTx = await openScopeTx(t.deps, pariwarId);
  try {
    await memberDomain.setDirectoryPublicationEnabled(scopeTx.tx, {
      pariwarId: ids.pariwarId(pariwarId),
      enabled,
      changedByActor: null,
      changedByDisplay: null,
      rationale: 'test fixture — the per-Pariwar public-surface kill switch',
      auditId: randomUUID(),
    });
    await closeScopeTx(scopeTx, true);
  } catch (err) {
    await closeScopeTx(scopeTx, false);
    throw err;
  }
}

describe.skipIf(!hasDatabase)('public Sahyog Vivran route (:5433)', { timeout: 30000 }, () => {
  it('⭐⭐ returns ONLY the ten classified fields — ⛔ no person, no ciphertext, no internal id', async () => {
    const t = await createTestApp();
    try {
      const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
      const { pariwarId } = await seedDrive(t, {
        canonicalIdentifier: id,
        district: 'Lucknow',
        confirmed: 3,
        assigned: 4,
        // ⭐ A REAL Tier-1 ciphertext exists for this claim's subject, and the route must return
        // NOTHING derived from it. A fixture with no KYC row could not prove that.
        legalName: 'Rajesh Kumar Sharma',
      });

      const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, tokenFor(id)) });
      expect(res.statusCode).toBe(200);
      const body = res.json() as { drive: Record<string, unknown> };

      // ⭐ THE EXACT KEY SET, ⛔ not a sample.
      expect(Object.keys(body.drive).sort()).toEqual([
        'appealReversal',
        'closedAt',
        'confirmedContributionCount',
        'district',
        'driveStatus',
        'fundingOutcome',
        // ⭐ Story 11b.3a. ⚠ Present on EVERY response, `[]` when the claim's bank details were
        // never collected — ⛔ never conditionally omitted, which would make the key set vary by
        // fixture and let a missing field pass unnoticed.
        'nomineeBankAccounts',
        'poolCanonicalIdentifier',
        'poolLetterCode',
      ]);

      // ⭐ THE PROPERTY, not a restatement: parse the WHOLE wire response through the real
      // `.strict()` contract, which fails on ANY extra or renamed field anywhere in the shape.
      expect(() => PublicSahyogVivranResponse.parse(res.json())).not.toThrow();

      // ⛔⛔ AND THE RAW BODY CARRIES NO PERSON AND NO INTERNAL IDENTIFIER, under ANY key.
      const raw = res.body;
      for (const forbidden of [
        'Rajesh',
        'Sharma',
        'enc:v1:',
        'memberId',
        'member_id',
        'deceasedMemberId',
        'claimCaseId',
        'claim_case_id',
        'poolId',
        'pool_id',
      ]) {
        expect(raw).not.toContain(forbidden);
      }
      // ⛔ AND NO RUPEE FIGURE — D1(b) moved the amount to 11b.3b; D1(c) is REFUSED.
      for (const forbidden of ['amountRaised', 'fixedAmount', 'rosterSize', '₹']) {
        expect(raw).not.toContain(forbidden);
      }
      // ⛔ AND NO CONTRIBUTION STATUS KEY — the AC4 shape, on the wire.
      expect(raw).not.toContain('"status"');
    } finally {
      await teardown(t);
    }
  });

  describe('⭐⭐ 404 COLLAPSES every "nothing to show" case — ⛔ byte-identical', () => {
    it('an UNKNOWN address → 404 with an EMPTY body', async () => {
      const t = await createTestApp();
      try {
        // ⚠ BOTH identifiers are RANDOM per run (Story 11b.10): `public_token` carries a GLOBAL
        // unique index, so a literal seed identifier would make the fixture's token collide with
        // itself on the second run of this suite against a persistent database.
        const seeded = `P-2026-09-${randomUUID().slice(0, 6)}`;
        const missing = `P-2026-09-${randomUUID().slice(0, 6)}`;
        const { pariwarId } = await seedDrive(t, { canonicalIdentifier: seeded });
        const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, tokenFor(missing)) });
        expect(res.statusCode).toBe(404);
        expect(res.body).toBe('');
      } finally {
        await teardown(t);
      }
    });

    // ═══════════════════════════════════════════════════════════════════════════════════════════
    // ⭐⭐ STORY 11b.10 (AC1) — THE **FOURTH** COLLAPSED CASE, AND THE ONE ADDRESS FORM
    // ═══════════════════════════════════════════════════════════════════════════════════════════

    it('⭐ a REAL drive with a WRONG token → a 404 BYTE-IDENTICAL to the unknown-address one', async () => {
      // ⛔⛔ THE ENUMERATION ORACLE THIS FORBIDS: if "real drive, wrong token" answered differently
      // from "no such drive" — a 403, a distinct code, ANY difference in body or status — an
      // attacker could test guessed addresses and learn which ones NAME SOMETHING, which is exactly
      // the capability the token was introduced to remove. ⭐ Asserted as an EQUALITY between two
      // live responses, ⛔ not as two independent "is it 404?" checks: the second form would pass
      // even if the bodies or headers diverged.
      const t = await createTestApp();
      try {
        const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
        const { pariwarId } = await seedDrive(t, { canonicalIdentifier: id });
        // The drive is genuinely there and genuinely visible at its real address.
        expect(
          (await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, tokenFor(id)) })).statusCode,
        ).toBe(200);

        // ⭐⛔ THE "WRONG TOKEN" ARM USES THE DRIVE'S **REAL CANONICAL IDENTIFIER** (review
        // 2026-09-04), ⛔ not a second random string. Both arms previously carried tokens that
        // existed NOWHERE, which made them the SAME case and the equality close to tautological.
        // ⭐ `P-YYYY-MM-###` is the one wrong address an attacker actually has: it is the drive's
        // real name in the operational vocabulary, it is SEQUENTIAL, and it was this route's address
        // until 11b.10. ⇒ *"a string that names a real drive"* vs *"a string that names nothing"* is
        // the contrast that would expose an oracle, and it is now the contrast under test.
        const wrongToken = await t.app.inject({
          method: 'GET',
          url: ROUTE(pariwarId, id),
        });
        const noSuchDrive = await t.app.inject({
          method: 'GET',
          url: ROUTE(pariwarId, `tok-P-2026-09-${randomUUID().slice(0, 6)}`),
        });

        expect(wrongToken.statusCode).toBe(404);
        expect(wrongToken.statusCode).toBe(noSuchDrive.statusCode);
        expect(wrongToken.body).toBe('');
        expect(wrongToken.body).toBe(noSuchDrive.body);
        // ⭐ HEADERS TOO — the comment above promises "body or headers". Compare the full header set
        // minus the per-response volatile ones, so a future divergence (a distinct `content-type`,
        // an `x-robots-tag` on one path but not the other, a `cache-control` split) is caught here
        // and ⛔ not only a status/body one.
        //
        // ⚠⛔ `x-ratelimit-*` IS STRIPPED, AND ⛔ NOT BECAUSE IT IS UNIMPORTANT — it is stripped
        // because it is a PER-REQUEST COUNTER. `@fastify/rate-limit` decrements
        // `x-ratelimit-remaining` on every request against the same key (all injects here share
        // `127.0.0.1`), so two SEQUENTIAL responses can ⛔ never carry equal values and a deep-equal
        // over it fails for a reason that has ⛔ nothing to do with the oracle this test guards.
        // ⭐⭐ THE SECURITY PROPERTY IT CARRIES IS ⛔ NOT DROPPED — it is asserted SEPARATELY below:
        // if the two refusal paths consumed DIFFERENT rate-limit budget, THAT difference would
        // itself be the enumeration oracle. Equal consumption is the real invariant; equal counter
        // VALUES was never it. (Review 2026-09-04 — the deep-equal as first written could not pass.)
        const stableHeaders = (h: Record<string, unknown>): Record<string, unknown> => {
          const rest = { ...h };
          delete rest.date;
          delete rest['keep-alive'];
          delete rest['request-id'];
          delete rest['x-request-id'];
          delete rest['x-ratelimit-limit'];
          delete rest['x-ratelimit-remaining'];
          delete rest['x-ratelimit-reset'];
          return rest;
        };
        expect(stableHeaders(wrongToken.headers)).toEqual(stableHeaders(noSuchDrive.headers));
        // ⭐⛔ EQUAL BUDGET CONSUMPTION — the half of the header comparison that actually bounds the
        // oracle. Both refusals are ordinary requests on the same key, issued back to back, so the
        // second must sit EXACTLY one unit below the first. ⛔ A path that charged a different
        // amount for "real drive, wrong token" than for "no such drive" would leak which addresses
        // name something, through the rate-limit headers rather than through the body.
        const remainingOf = (h: Record<string, unknown>): number =>
          Number(h['x-ratelimit-remaining']);
        expect(remainingOf(wrongToken.headers) - remainingOf(noSuchDrive.headers)).toBe(1);
        expect(wrongToken.headers['x-ratelimit-limit']).toBe(
          noSuchDrive.headers['x-ratelimit-limit'],
        );
      } finally {
        await teardown(t);
      }
    });

    it('⛔ the BARE `P-YYYY-MM-###` is NOT independently addressable — it 404s like anything else', async () => {
      // ⛔⛔ TRAP 3: a route accepting EITHER the token OR the bare identifier has ⛔ not closed the
      // walk — it has added a lock beside an open door. ⭐ This is the assertion that would fail the
      // moment somebody adds an `OR pool_canonical_identifier = …` arm "for old links".
      const t = await createTestApp();
      try {
        const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
        const { pariwarId } = await seedDrive(t, { canonicalIdentifier: id });

        const byIdentifier = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, id) });
        expect(byIdentifier.statusCode).toBe(404);
        expect(byIdentifier.body).toBe('');
      } finally {
        await teardown(t);
      }
    });

    it('⭐ the identifier is RETAINED and RENDERED in the body — ⛔ retired as an ADDRESS, ⛔ not as a FIELD', async () => {
      // `2026-09-03-184` cl.2: `P-YYYY-MM-###` stays the operational/audit key and the page shows it.
      // ⛔ Trap 3 forbids it being ADDRESSABLE, ⛔ not DISPLAYED — deleting it would be a different
      // defect, and this asserts the story did not commit it.
      const t = await createTestApp();
      try {
        const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
        const { pariwarId } = await seedDrive(t, { canonicalIdentifier: id });
        const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, tokenFor(id)) });
        expect(res.statusCode).toBe(200);
        expect(PublicSahyogVivranResponse.parse(res.json()).drive.poolCanonicalIdentifier).toBe(id);
      } finally {
        await teardown(t);
      }
    });

    it('a `spawned` pool → the SAME 404 — it exists, but not at this surface’s predicate', async () => {
      // ⛔ `spawned` is ABSENT from `SAHYOG_VIVRAN_VISIBLE_POOL_STATES` deliberately: a pool that has
      // not opened for contributions has no drive to tell.
      const t = await createTestApp();
      try {
        const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
        const { pariwarId } = await seedDrive(t, {
          canonicalIdentifier: id,
          poolState: 'spawned',
        });
        const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, tokenFor(id)) });
        expect(res.statusCode).toBe(404);
        expect(res.body).toBe('');
      } finally {
        await teardown(t);
      }
    });

    it('a SWITCHED-OFF Pariwar → the SAME 404, INDISTINGUISHABLE from an absent drive', async () => {
      // ⭐ THE ANTI-ENUMERATION PROPERTY: a pulled Pariwar must not be a NEW ORACLE. The kill switch
      // is an EMERGENCY control that defaults to ENABLED — ⛔ never a launch gate.
      const t = await createTestApp();
      try {
        const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
        const { pariwarId } = await seedDrive(t, { canonicalIdentifier: id });
        expect((await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, tokenFor(id)) })).statusCode).toBe(200);

        await setPublicationEnabled(t, pariwarId, false);
        const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, tokenFor(id)) });
        expect(res.statusCode).toBe(404);
        expect(res.body).toBe('');
      } finally {
        await teardown(t);
      }
    });

    it('a drive in ANOTHER Pariwar → the SAME 404 (tenant isolation, not an error)', async () => {
      const t = await createTestApp();
      try {
        const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
        await seedDrive(t, { canonicalIdentifier: id });
        const other = await seedDrive(t, { canonicalIdentifier: `P-2026-09-${randomUUID().slice(0, 6)}` });
        const res = await t.app.inject({ method: 'GET', url: ROUTE(other.pariwarId, tokenFor(id)) });
        expect(res.statusCode).toBe(404);
        expect(res.body).toBe('');
      } finally {
        await teardown(t);
      }
    });
  });

  describe('⭐ D4(b) — `live` + `closed` + `settled` render, in the PUBLIC vocabulary', () => {
    for (const [state, expected] of [
      ['live', 'collecting'],
      ['closed', 'active'],
      ['settled', 'archive'],
    ] as const) {
      it(`a \`${state}\` pool renders as \`${expected}\` — ⛔ never the internal word`, async () => {
        const t = await createTestApp();
        try {
          const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
          const { pariwarId } = await seedDrive(t, { canonicalIdentifier: id, poolState: state });
          const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, tokenFor(id)) });
          expect(res.statusCode).toBe(200);
          const body = res.json() as { drive: Record<string, unknown> };
          expect(body.drive['driveStatus']).toBe(expected);
          // ⛔ `2026-08-21-144` cl.8 — the internal lifecycle word must never cross the boundary.
          expect(res.body).not.toContain(`"${state}"`);
        } finally {
          await teardown(t);
        }
      });
    }

    it('⭐ a `live` drive renders NO close date and NO outcome — ⛔ never an estimate (AC3)', async () => {
      const t = await createTestApp();
      try {
        const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
        const { pariwarId } = await seedDrive(t, {
          canonicalIdentifier: id,
          poolState: 'live',
          confirmed: 2,
          assigned: 5,
        });
        const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, tokenFor(id)) });
        const body = res.json() as { drive: Record<string, unknown> };
        expect(body.drive['closedAt']).toBeNull();
        // ⛔ NOT `under_funded` — a drive still collecting has no close to frame, and classifying it
        // would be the projected-final-outcome AC3 forbids.
        expect(body.drive['fundingOutcome']).toBeNull();
        // ⭐ The count IS rendered — it is the one figure that is true mid-drive.
        expect(body.drive['confirmedContributionCount']).toBe(2);
      } finally {
        await teardown(t);
      }
    });
  });

  describe('⭐⭐ AC3 — the confirmed count is CANONICAL EVENTS ONLY', () => {
    it('⛔ a YELLOW `contribution.utr-attested` event NEVER reaches the count', async () => {
      // Yellow is a member's CLAIM that they paid — intent, ⛔ not confirmed money. The guard is
      // STRUCTURAL: the count's event type is hard-filtered with no parameter that could admit one.
      const t = await createTestApp();
      try {
        const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
        const { pariwarId } = await seedDrive(t, {
          canonicalIdentifier: id,
          confirmed: 2,
          attested: 5,
          assigned: 10,
        });
        const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, tokenFor(id)) });
        const body = res.json() as { drive: Record<string, unknown> };
        expect(body.drive['confirmedContributionCount']).toBe(2);
      } finally {
        await teardown(t);
      }
    });

    it('⭐ a REVERSED confirmation is COMPENSATED out of the count', async () => {
      const t = await createTestApp();
      try {
        const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
        const { pariwarId } = await seedDrive(t, {
          canonicalIdentifier: id,
          confirmed: 3,
          reversed: 1,
          assigned: 10,
        });
        const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, tokenFor(id)) });
        const body = res.json() as { drive: Record<string, unknown> };
        expect(body.drive['confirmedContributionCount']).toBe(2);
      } finally {
        await teardown(t);
      }
    });

    it('⭐⭐ ZERO assignees ⇒ NO outcome at all — ⛔ never a vacuous `fully_funded`', async () => {
      // ⚠ `classifyCycleOutcome` compares `deliveredTotal >= expectedTotal`, and at `0 >= 0` that is
      // VACUOUSLY TRUE ⇒ it returned `fully_funded` for a drive that collected nothing, published
      // beside "0 confirmed" (the 11b.1 review finding). The case is resolved BEFORE the call.
      const t = await createTestApp();
      try {
        const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
        const { pariwarId } = await seedDrive(t, {
          canonicalIdentifier: id,
          confirmed: 0,
          assigned: 0,
        });
        const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, tokenFor(id)) });
        const body = res.json() as { drive: Record<string, unknown> };
        expect(body.drive['confirmedContributionCount']).toBe(0);
        expect(body.drive['fundingOutcome']).toBeNull();
      } finally {
        await teardown(t);
      }
    });

    it('a fully-delivered closed drive classifies `fully_funded`', async () => {
      const t = await createTestApp();
      try {
        const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
        const { pariwarId } = await seedDrive(t, {
          canonicalIdentifier: id,
          confirmed: 4,
          assigned: 4,
        });
        const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, tokenFor(id)) });
        const body = res.json() as { drive: Record<string, unknown> };
        expect(body.drive['fundingOutcome']).toBe('fully_funded');
        // ⛔ AND NO TARGET, EXPECTED TOTAL OR PERCENTAGE LEAVES WITH IT — the enum is opaque.
        expect(res.body).not.toContain('expectedTotal');
        expect(res.body).not.toContain('deliveredTotal');
      } finally {
        await teardown(t);
      }
    });
  });

  describe('⭐⭐ AC5 — the appeal lineage, DERIVED AT REQUEST TIME (D12(a))', () => {
    it('renders the stage, the BOUNDED disposition tag and the reversal instant', async () => {
      const t = await createTestApp();
      try {
        const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
        const { pariwarId } = await seedDrive(t, {
          canonicalIdentifier: id,
          appeal: { stage: 2, category: 'procedural_correction' },
        });
        const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, tokenFor(id)) });
        const body = res.json() as {
          drive: { appealReversal: Record<string, unknown> | null };
        };
        expect(body.drive.appealReversal).not.toBeNull();
        expect(body.drive.appealReversal!['reversedAtStage']).toBe(2);
        expect(body.drive.appealReversal!['dispositionCategory']).toBe('procedural_correction');
        expect(typeof body.drive.appealReversal!['reversedAt']).toBe('string');
        // ⛔⛔ AND NOTHING ELSE. The rationale TEXT and the REVIEWER IDENTITY live on the
        // `claim.appeal_stageN_reviewed` DECISION event's Tier-1 metadata row and are NEVER public.
        expect(Object.keys(body.drive.appealReversal!).sort()).toEqual([
          'dispositionCategory',
          'reversedAt',
          'reversedAtStage',
        ]);
      } finally {
        await teardown(t);
      }
    });

    it('⛔ renders NOTHING when the claim was never reversed — ⛔ no "not reversed" marker', async () => {
      const t = await createTestApp();
      try {
        const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
        const { pariwarId } = await seedDrive(t, { canonicalIdentifier: id });
        const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, tokenFor(id)) });
        const body = res.json() as { drive: Record<string, unknown> };
        expect(body.drive['appealReversal']).toBeNull();
      } finally {
        await teardown(t);
      }
    });

    it('⛔⛔ an UNRECOGNISED disposition tag drops the WHOLE lineage — ⛔ never renders raw', async () => {
      // ⭐ THE ONE THAT MATTERS MOST: the tag is the only thing about an appeal's substance that may
      // ever be public, and an unbounded value here is how FREE TEXT would reach a public page. The
      // bound is enforced in the domain read, so a malformed payload yields NO lineage — ⛔ not half
      // of one, and ⛔ not an echoed string.
      const t = await createTestApp();
      try {
        const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
        const { pariwarId } = await seedDrive(t, {
          canonicalIdentifier: id,
          appeal: { stage: 2, category: 'the verifier admitted he had misread the ration card' },
        });
        const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, tokenFor(id)) });
        expect(res.statusCode).toBe(200);
        const body = res.json() as { drive: Record<string, unknown> };
        expect(body.drive['appealReversal']).toBeNull();
        expect(res.body).not.toContain('ration card');
      } finally {
        await teardown(t);
      }
    });
  });

  describe('⭐ AC6 — the route is UNAUTHENTICATED and its query surface is EMPTY', () => {
    it('answers 200 with NO session, no cookie and no Authorization header', async () => {
      const t = await createTestApp();
      try {
        const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
        const { pariwarId } = await seedDrive(t, { canonicalIdentifier: id });
        const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, tokenFor(id)) });
        expect(res.statusCode).toBe(200);
      } finally {
        await teardown(t);
      }
    });

    it('⛔ ANY query parameter is a 400 — `?format=csv` is a refusal, ⛔ not a no-op', async () => {
      // ⭐ The EMPTY `.strict()` query schema is precisely why controls 2 and 3 are structurally N/A
      // (D11(a)): there is no `page` for the horizon to bound and no `limit` for the cap to bound.
      const t = await createTestApp();
      try {
        const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
        const { pariwarId } = await seedDrive(t, { canonicalIdentifier: id });
        for (const q of ['format=csv', 'page=2', 'limit=50', 'all=1', 'name=Sharma']) {
          const res = await t.app.inject({ method: 'GET', url: `${ROUTE(pariwarId, tokenFor(id))}?${q}` });
          expect(res.statusCode).toBe(400);
        }
      } finally {
        await teardown(t);
      }
    });

    it('⛔ a malformed Pariwar id is a 400 at the schema boundary', async () => {
      const t = await createTestApp();
      try {
        const res = await t.app.inject({
          method: 'GET',
          url: '/api/v1/p/not-a-uuid/public-pages/sahyog-vivran/P-2026-09-001',
        });
        expect(res.statusCode).toBe(400);
      } finally {
        await teardown(t);
      }
    });

    it('⭐ the global X-Robots-Tag hook covers this route (control 3 of the three)', async () => {
      const t = await createTestApp();
      try {
        const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
        const { pariwarId } = await seedDrive(t, { canonicalIdentifier: id });
        const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, tokenFor(id)) });
        expect(String(res.headers['x-robots-tag'])).toMatch(/noindex/);
      } finally {
        await teardown(t);
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // ⭐⭐ STORY 11b.11 — THE NOMINEE BLOCK AFTER THE WITHDRAWAL, END TO END THROUGH THE REAL DECRYPT
  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // ⛔ These run through `app.inject` against real Postgres and the real KMS-backed envelope crypto,
  // ⛔ never against a stub: the whole subject is what the WIRE carries after a decrypt, and a
  // stubbed decrypt would prove nothing.
  //
  // ⭐⭐ **WHAT THIS BLOCK ASSERTED UNTIL 11b.11, AND WHY IT CHANGED — recorded, ⛔ not deleted.**
  // Story 11b.3a's suite pinned the ruled MASKING LADDER on the public wire: a `live` drive rendering
  // the complete details for both equal accounts; `D8-default` FAIL-OPEN leaving a `closed` drive in
  // full with no schedule row; `after_days: 0` reducing a `closed` and a `settled` drive to
  // `accountNumberLast4` + bank/branch/IFSC with the FULL NUMBER absent from the RAW BODY;
  // `after_days: 30` not yet masking a drive closed two days ago; `permanent` masking even a `live`
  // one (cl.10(d)'s terminal rung); a LATE `pool.settled` ⛔ NOT un-masking an already-masked drive;
  // and one Pariwar's window ⛔ not governing another's.
  //
  // ⭐ `2026-09-04-190` **cl.1** (Trustee-ratified — Dhiraj Rahul, Kalpana Bharti) and
  // `2026-09-04-191` **cl.1** withdraw ALL FIVE coordinates from `public`, and `-190` **cl.2** keeps
  // the nominee's name. ⇒ ⛔ there is no longer a projection for the ladder to select, so assertions
  // ABOUT that selection cannot be restated here — the thing they described is gone from this
  // surface. ⭐ What replaces them is **STRICTLY STRONGER**: the same schedule fixtures are still
  // seeded and driven, and every configuration must now produce the SAME response.
  // ⛔⛔ **MASKING WAS ⛔ NOT DELETED, AND ITS OWN TESTS ARE UNTOUCHED BY THIS STORY** (`-190` cl.4):
  // `packages/domain/tests/claim/nominee-bank-masking.test.ts`,
  // `packages/domain/tests/integration/claim/nominee-bank-masking-schedule.spec.ts` and
  // `apps/api/tests/integration/nominee-bank-masking/admin.spec.ts` all still exercise the predicate,
  // the schedule and the admin knob. ⚠ What the machinery has is ⛔ NO PUBLIC CONSUMER.
  describe('the nominee block (`2026-09-04-190` cl.1-2, `2026-09-04-191` cl.1)', () => {
    const ACCOUNTS = [
      {
        rank: 1 as const,
        holder: 'Sunita Devi',
        account: '50100123456789',
        ifsc: 'SBIN0001234',
        bankName: 'State Bank of India',
        branch: 'Vaishali',
        // ⭐ A REAL VPA on account #1, on purpose. `2026-09-04-191` cl.5 verified UPI-ID collection is
        // BUILT and POPULATED (Story 8.13 / migration 0080; 11 of 558 accounts carry one) ⇒ seeding
        // `undefined` everywhere would make "the VPA is not on the wire" pass VACUOUSLY.
        vpa: 'sunita@upi',
      },
      {
        rank: 2 as const,
        holder: 'Sunita Devi',
        account: '00987654321012',
        ifsc: 'BARB0VJVAIS',
        bankName: 'Bank of Baroda',
      },
    ];

    /** Every coordinate seeded above, as it would appear in a leaked body. */
    const WITHDRAWN_VALUES = [
      '50100123456789',
      '00987654321012',
      'SBIN0001234',
      'BARB0VJVAIS',
      'State Bank of India',
      'Bank of Baroda',
      'Vaishali',
      'sunita@upi',
      // ⛔ [Review] Quoted, ⛔ not a bare digit run: checked against the RAW body (below), so a
      // bare '6789' risks a false failure on an unrelated 4-digit fragment elsewhere in the JSON
      // (an id, a timestamp). Quoting pins it to "the last-4 projection surfaces as its own JSON
      // string value", which is what the masked arm actually used to emit.
      '"6789"', // the last-4 projection the masked arm used to carry
    ];

    /** The keys the wire must ⛔ never carry again — ABSENT, ⛔ not `null`. */
    const WITHDRAWN_KEYS = [
      'accountNumber',
      'accountNumberLast4',
      'ifsc',
      'vpa',
      'bankName',
      'branch',
      'masked',
    ];

    const assertWithdrawn = (res: { body: string; json: () => unknown }): void => {
      const body = res.json() as { drive: { nomineeBankAccounts: Record<string, unknown>[] } };
      for (const account of body.drive.nomineeBankAccounts) {
        // ⛔⛔ ABSENT, ⛔ NOT NULL. `.strict()` on the contract is what makes populating one of these
        // a PARSE ERROR rather than an ignored extra field — the discipline `2026-08-28-165`
        // established for the old masked arm, applied to the whole shape.
        for (const key of WITHDRAWN_KEYS) expect(key in account).toBe(false);
        expect(Object.keys(account).sort()).toEqual(['accountHolderName', 'accountRank']);
      }
      // ⛔⛔ AND AGAINST THE RAW SERIALIZED BODY, ⛔ not merely the parsed fields: a field-level check
      // passes while the value sits under some other key.
      for (const forbidden of WITHDRAWN_VALUES) expect(res.body).not.toContain(forbidden);
      // ⭐ The response still parses through the REAL `.strict()` contract.
      expect(() => PublicSahyogVivranResponse.parse(res.json())).not.toThrow();
    };

    it('⭐⭐ AC1/AC2 — a LIVE drive renders the NAME for both equal accounts, and ⛔ NOTHING ELSE', async () => {
      const t = await createTestApp();
      try {
        const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
        const { pariwarId } = await seedDrive(t, {
          canonicalIdentifier: id,
          poolState: 'live',
          nomineeBank: ACCOUNTS,
        });
        const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, tokenFor(id)) });
        expect(res.statusCode).toBe(200);
        const body = res.json() as { drive: { nomineeBankAccounts: Record<string, unknown>[] } };
        const accounts = body.drive.nomineeBankAccounts;

        // ⭐ EXACTLY TWO, in substrate order — an ORDER, ⛔ not a ranking.
        expect(accounts.map((a) => a['accountRank'])).toEqual([1, 2]);
        // ⭐ THE DECRYPT ACTUALLY HAPPENED — the name is real plaintext off a real envelope, which is
        // what `-190` cl.2 keeps public. ⛔ A test that only checked absence would pass on a handler
        // that returned nothing at all.
        expect(accounts[0]).toEqual({ accountRank: 1, accountHolderName: 'Sunita Devi' });
        expect(accounts[1]).toEqual({ accountRank: 2, accountHolderName: 'Sunita Devi' });
        assertWithdrawn(res);
      } finally {
        await teardown(t);
      }
    });

    it('⭐⭐ AC1 — NO SCHEDULE ROW (`D8-default` FAIL-OPEN) still carries ⛔ NO coordinates', async () => {
      // ⚠⛔ THIS IS THE CASE THE WITHDRAWAL EXISTS FOR. FAIL-OPEN is the default for EVERY Pariwar
      // until the Trust acts (`2026-09-02-179` cl.1), so before 11b.11 a `closed` drive published the
      // complete account number by default. ⭐ `D8-default` is UNCHANGED (AC7) — what changed is that
      // this surface no longer has a masking decision for it to govern.
      const t = await createTestApp();
      try {
        const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
        const { pariwarId } = await seedDrive(t, {
          canonicalIdentifier: id,
          poolState: 'closed',
          nomineeBank: ACCOUNTS,
        });
        const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, tokenFor(id)) });
        expect(res.statusCode).toBe(200);
        assertWithdrawn(res);
      } finally {
        await teardown(t);
      }
    });

    it('⭐⭐ AC3 — a MASKED drive still carries the NOMINEE NAME (`2026-09-04-191` cl.2)', async () => {
      // ⛔⛔ **THE REGRESSION THIS TEST EXISTS TO PREVENT: an EMPTY bank block.** The masked arm used
      // to DROP `accountHolderName`, because `2026-08-28-160` cl.10(e) is a RETENTION list and a
      // retention list is exhaustive. ⇒ with the coordinates withdrawn, that arm would have rendered
      // ⛔ NOTHING AT ALL. `2026-09-04-191` **cl.2** rules the masked projection RETAINS the name,
      // which AMENDS THE READING of cl.10(e) — that list was written when the masked view still
      // carried account coordinates and therefore had something else to retain. ⛔ cl.10(e) is ⛔ not
      // restated as if it had always said this.
      // ⚠ `after_days: 0` on a `closed` drive is the configuration that USED to mask; it is seeded
      // here deliberately, so this asserts the ruled outcome holds under the very setting that would
      // once have emptied the block.
      const t = await createTestApp();
      try {
        const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
        const { pariwarId } = await seedDrive(t, {
          canonicalIdentifier: id,
          poolState: 'closed',
          nomineeBank: ACCOUNTS,
          masking: { mode: 'after_days', maskAfterDays: 0 },
        });
        const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, tokenFor(id)) });
        expect(res.statusCode).toBe(200);
        const body = res.json() as { drive: { nomineeBankAccounts: Record<string, unknown>[] } };
        // ⭐ THE NAME IS PRESENT — ⛔ not null, ⛔ not an empty block.
        expect(body.drive.nomineeBankAccounts.map((a) => a['accountHolderName'])).toEqual([
          'Sunita Devi',
          'Sunita Devi',
        ]);
        assertWithdrawn(res);
      } finally {
        await teardown(t);
      }
    });

    it('⭐⭐ AC1 — the response is IDENTICAL under EVERY masking configuration', async () => {
      // ⭐⭐ THE ASSERTION THAT REPLACES THE WHOLE LADDER, and it is strictly stronger than the cases
      // it replaces: rather than pinning what each rung projects, it pins that the rung ⛔ NO LONGER
      // SELECTS ANYTHING on this surface. ⇒ a future change that re-points the masking predicate at
      // the public read fails HERE, loudly, instead of quietly re-introducing a projection.
      // ⚠ Includes `permanent` on a `live` drive — cl.10(d)'s terminal rung, the one configuration
      // that reached a still-collecting campaign — and a `settled` drive, the state where masking
      // mattered most.
      const t = await createTestApp();
      try {
        const configs = [
          { poolState: 'live' as const, masking: undefined },
          { poolState: 'live' as const, masking: { mode: 'permanent' as const } },
          { poolState: 'closed' as const, masking: undefined },
          {
            poolState: 'closed' as const,
            masking: { mode: 'after_days' as const, maskAfterDays: 0 },
          },
          {
            poolState: 'closed' as const,
            masking: { mode: 'after_days' as const, maskAfterDays: 30 },
          },
          {
            poolState: 'settled' as const,
            masking: { mode: 'after_days' as const, maskAfterDays: 0 },
          },
        ];
        const shapes: string[] = [];
        for (const config of configs) {
          const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
          const { pariwarId } = await seedDrive(t, {
            canonicalIdentifier: id,
            poolState: config.poolState,
            nomineeBank: ACCOUNTS,
            ...(config.masking === undefined ? {} : { masking: config.masking }),
          });
          const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, tokenFor(id)) });
          expect(res.statusCode).toBe(200);
          assertWithdrawn(res);
          const body = res.json() as { drive: { nomineeBankAccounts: unknown[] } };
          shapes.push(JSON.stringify(body.drive.nomineeBankAccounts));
        }
        // ⛔ MEMBERSHIP AND EXPLICIT VALUES, ⛔ never a count over a shared fixture.
        expect(new Set(shapes).size).toBe(1);
        expect(shapes[0]).toBe(
          JSON.stringify([
            { accountRank: 1, accountHolderName: 'Sunita Devi' },
            { accountRank: 2, accountHolderName: 'Sunita Devi' },
          ]),
        );
      } finally {
        await teardown(t);
      }
    });

    it('⭐ a claim whose bank details were NEVER COLLECTED returns `[]`, ⛔ not an error', async () => {
      // ⚠ 6.8's AC3 absence signal. ⛔ Never a throw, ⛔ never a 404, and the page renders NOTHING —
      // ⛔ no "not recorded" marker, which would announce the omission.
      const t = await createTestApp();
      try {
        const id = `P-2026-09-${randomUUID().slice(0, 6)}`;
        const { pariwarId } = await seedDrive(t, { canonicalIdentifier: id, poolState: 'closed' });
        const res = await t.app.inject({ method: 'GET', url: ROUTE(pariwarId, tokenFor(id)) });
        expect(res.statusCode).toBe(200);
        const body = res.json() as { drive: { nomineeBankAccounts: unknown[] } };
        expect(body.drive.nomineeBankAccounts).toEqual([]);
      } finally {
        await teardown(t);
      }
    });
  });
});