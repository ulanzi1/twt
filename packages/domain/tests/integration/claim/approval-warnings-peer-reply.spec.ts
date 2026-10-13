// Story 6.27b — the two NEIGHBOUR warning kinds at the DOMAIN, on real rows (Task 1.8; AC2; PM9; Traps 2, 3, 4). Each
// test in its own rolled-back transaction under a FRESH Pariwar; the answers are saved through the REAL writer
// (`savePeerAnswer`, the shared `_peer-reply-fixtures.ts`).
//   · `peer_says_not_died` for a live `not_died` (⛔ no certificate needed) — ⛔ `died` / `not_sure`;
//   · `peer_death_date_differs` ⇔ the live window misses the CURRENT accepted review's index — ±1 across a leap day, a
//     year end and a month end is ⛔ a warning, ±2 is; *"I don't know the date"*, ⛔ no certificate ⇒ ⛔ none;
//   · an edit ⇒ a NEW key; a dependant supersede (`has_died` → `not_sure`) ⇒ the date key gone; a refile ⛔ never
//     inherits a neighbour key (`-261` C3); a re-review from equal to differing RAISES a key (BF13);
//   · both readers agree (keys, kinds AND `peerAnswerFlags`), also past one 500-id slice;
//   · the ONE rule reaches it: the District Admin's approval over a neighbour key needs a reason (AC3's domain leg).
// ⚠ INDEX TRAP (Trap 3): the first test proves an EQUAL date yields ⛔ no key — else every `differs` leg passes for the
// wrong reason.

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { addCalendarDays } from '../../../src/cycle-calendar/holiday-resolver.js';
import {
  ApprovalWarningReasonRequiredError,
  adjudicateClaim,
  readClaimApprovalWarnings,
  readClaimApprovalWarningsBulk,
} from '../../../src/claim/index.js';
import { claimId as toClaimId, pariwarId as toPariwarId, type ClaimId, type PariwarId } from '../../../src/ids/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import {
  driveClaimTo,
  enterAppScope,
  fixtureCurrentAcceptedDate,
  seedAcceptedDeathCertificate,
  seedNomineeNameCheck,
} from '../_helpers.js';
import { attachTextedPings, liveAnswerId, savePeerFixtureAnswer, type TextedPing } from './_peer-reply-fixtures.js';

const DA = 'd6d6d6d6-0000-4000-8000-000000000001';

type Client = ReturnType<typeof getTx>['client'];
type Tx = ReturnType<typeof getTx>['tx'];
interface Ctx {
  client: Client;
  tx: Tx;
  pid: PariwarId;
  cid: ClaimId;
  mid: string;
  pings: TextedPing[];
}

/** A claim under a FRESH Pariwar — approvable fixtures (`verifier_review`, an accepted certificate) unless `bare` (then
 *  `verification_in_progress` with ⛔ no certificate) — and `pings` texted neighbours. */
async function claim(opts: { bare?: boolean; pings?: number; mid?: string; pid?: PariwarId } = {}): Promise<Ctx> {
  const { client, tx } = getTx();
  const pid = opts.pid ?? toPariwarId(randomUUID());
  await enterAppScope(client, pid);
  const cid = toClaimId(randomUUID());
  const mid = opts.mid ?? randomUUID();
  await driveClaimTo(client, pid, cid, mid, opts.bare ? 'verification_in_progress' : 'verifier_review');
  if (!opts.bare) await seedNomineeNameCheck(client, pid, cid, {});
  await client.query('RESET ROLE');
  const pings = await attachTextedPings(client, pid, cid, mid, opts.pings ?? 1);
  await enterAppScope(client, pid);
  return { client, tx, pid, cid, mid, pings };
}

const warnings = (ctx: Ctx) => readClaimApprovalWarnings(ctx.tx, ctx.pid, ctx.cid);
const peerKeys = async (ctx: Ctx) => (await warnings(ctx)).keys.filter((k) => k.startsWith('peer_'));
const acceptedDate = async (ctx: Ctx) => (await fixtureCurrentAcceptedDate(ctx.client, ctx.pid, ctx.cid))!;
const save = (ctx: Ctx, key: string, value: { codes: string[] } | { date: string }, ping = 0) =>
  savePeerFixtureAnswer(ctx.client, ctx.pid, ctx.pings[ping]!, key, value);
const answerId = async (ctx: Ctx, key: string, ping = 0) =>
  (await liveAnswerId(ctx.client, ctx.pid, ctx.cid, ctx.pings[ping]!.pingId, key))!.toLowerCase();

/** A neighbour says the member died on `date`. */
async function dated(ctx: Ctx, date: string, ping = 0): Promise<string> {
  await save(ctx, 'has_died', { codes: ['died'] }, ping);
  await save(ctx, 'death_date', { date }, ping);
  return answerId(ctx, 'death_date', ping);
}

/** Trap 2 — both readers derive the SAME keys, kinds and per-answer flags. */
async function expectParity(ctx: Ctx, padding: readonly ClaimId[] = []): Promise<void> {
  const single = await warnings(ctx);
  const bulk = (await readClaimApprovalWarningsBulk(ctx.tx, ctx.pid, [...padding, ctx.cid])).get(ctx.cid.toLowerCase())!;
  expect(bulk.keys).toEqual(single.keys);
  expect(bulk.kinds).toEqual(single.kinds);
  expect([...bulk.peerAnswerFlags.entries()].sort()).toEqual([...single.peerAnswerFlags.entries()].sort());
}

describe.skipIf(!hasDatabase)('Story 6.27b — the neighbour warnings at the domain (:5433)', { timeout: 30000 }, () => {
  setupLiveDb();

  it('⚠ INDEX TRAP FIRST — a date EQUAL to the accepted certificate\'s yields ⛔ no key (and its flag is `false`)', async () => {
    const ctx = await claim();
    const id = await dated(ctx, await acceptedDate(ctx));
    const w = await warnings(ctx);
    expect(w.keys.filter((k) => k.startsWith('peer_'))).toEqual([]);
    expect(w.peerAnswerFlags.get(id)).toBe(false);
    // `has_died = died` is selected too (a warning question) and carries ⛔ no key.
    expect(w.peerAnswerFlags.get(await answerId(ctx, 'has_died'))).toBe(false);
    await expectParity(ctx);
  });

  it('`not_died` ⇒ `peer_says_not_died:<answer_id>` (flag `true`), with ⛔ no certificate needed; `died` / `not_sure` ⇒ ⛔ none', async () => {
    const bare = await claim({ bare: true, pings: 3 });
    await save(bare, 'has_died', { codes: ['not_died'] }, 0);
    await save(bare, 'has_died', { codes: ['died'] }, 1);
    await save(bare, 'has_died', { codes: ['not_sure'] }, 2);
    const id = await answerId(bare, 'has_died', 0);
    const w = await warnings(bare);
    expect(w.keys).toEqual([`peer_says_not_died:${id}`]);
    expect(w.kinds).toEqual(['peer_says_not_died']);
    expect(w.peerAnswerFlags.get(id)).toBe(true);
    expect(w.peerAnswerFlags.get(await answerId(bare, 'has_died', 1))).toBe(false);
    expect(w.peerAnswerFlags.get(await answerId(bare, 'has_died', 2))).toBe(false);
    await expectParity(bare);
  });

  it('the date: ±1 is ⛔ a warning, ±2 is — around the accepted date', async () => {
    const ctx = await claim({ pings: 4 });
    const d = await acceptedDate(ctx);
    const minus1 = await dated(ctx, addCalendarDays(d, -1), 0);
    const plus1 = await dated(ctx, addCalendarDays(d, 1), 1);
    const minus2 = await dated(ctx, addCalendarDays(d, -2), 2);
    const plus2 = await dated(ctx, addCalendarDays(d, 2), 3);
    const w = await warnings(ctx);
    const expected = [`peer_death_date_differs:${minus2}`, `peer_death_date_differs:${plus2}`].sort();
    expect(w.keys.filter((k) => k.startsWith('peer_'))).toEqual(expected);
    expect(w.peerAnswerFlags.get(minus1)).toBe(false);
    expect(w.peerAnswerFlags.get(plus1)).toBe(false);
    expect(w.peerAnswerFlags.get(minus2)).toBe(true);
    expect(w.peerAnswerFlags.get(plus2)).toBe(true);
    await expectParity(ctx);
  });

  for (const [cert, near, far] of [
    ['2024-02-29', '2024-03-01', '2024-03-02'],
    ['2025-12-31', '2026-01-01', '2026-01-02'],
    ['2026-04-30', '2026-05-01', '2026-05-02'],
  ] as const) {
    it(`across an edge — certificate ${cert}: ${near} is ⛔ a warning, ${far} is`, async () => {
      const ctx = await claim({ pings: 2 });
      await seedAcceptedDeathCertificate(ctx.client, { pariwarId: ctx.pid, claimCaseId: ctx.cid, date: cert });
      expect(await acceptedDate(ctx)).toBe(cert);
      const nearId = await dated(ctx, near, 0);
      const farId = await dated(ctx, far, 1);
      const w = await warnings(ctx);
      expect(w.keys.filter((k) => k.startsWith('peer_'))).toEqual([`peer_death_date_differs:${farId}`]);
      expect(w.peerAnswerFlags.get(nearId)).toBe(false);
      await expectParity(ctx);
    });
  }

  it('"I don\'t know the date" ⇒ ⛔ no key; a dated answer on a claim with ⛔ accepted certificate ⇒ ⛔ no key', async () => {
    const ctx = await claim();
    await save(ctx, 'has_died', { codes: ['died'] });
    await save(ctx, 'death_date', { codes: ['unknown'] });
    expect(await peerKeys(ctx)).toEqual([]);
    expect((await warnings(ctx)).peerAnswerFlags.get(await answerId(ctx, 'death_date'))).toBe(false);

    const bare = await claim({ bare: true });
    const id = await dated(bare, '2026-01-01');
    const w = await warnings(bare);
    expect(w.keys).toEqual([]);
    expect(w.peerAnswerFlags.get(id)).toBe(false);
    await expectParity(bare);
  });

  it('an EDIT ⇒ the old key gone and a NEW key (a changed answer is a new key)', async () => {
    const ctx = await claim();
    const d = await acceptedDate(ctx);
    const first = await dated(ctx, addCalendarDays(d, -5));
    expect(await peerKeys(ctx)).toEqual([`peer_death_date_differs:${first}`]);
    await save(ctx, 'death_date', { date: addCalendarDays(d, -6) });
    const second = await answerId(ctx, 'death_date');
    expect(second).not.toBe(first);
    expect(await peerKeys(ctx)).toEqual([`peer_death_date_differs:${second}`]);
    await expectParity(ctx);
  });

  it('a DEPENDANT supersede — `has_died` → `not_sure` removes the date ⇒ its key is gone (⛔ no live successor)', async () => {
    const ctx = await claim();
    const id = await dated(ctx, addCalendarDays(await acceptedDate(ctx), -3));
    expect(await peerKeys(ctx)).toEqual([`peer_death_date_differs:${id}`]);
    await save(ctx, 'has_died', { codes: ['not_sure'] });
    expect(await liveAnswerId(ctx.client, ctx.pid, ctx.cid, ctx.pings[0]!.pingId, 'death_date')).toBeNull();
    expect(await peerKeys(ctx)).toEqual([]);
    expect((await warnings(ctx)).peerAnswerFlags.has(id)).toBe(false);
  });

  it('`-261` C3 — a refile ⛔ never inherits a neighbour key from its source claim\'s answers', async () => {
    const first = await claim({ bare: true });
    await save(first, 'has_died', { codes: ['not_died'] });
    expect((await peerKeys(first)).length).toBe(1);
    // A SECOND claim of the SAME death, same Pariwar, ⛔ no answers of its own.
    const cid2 = toClaimId(randomUUID());
    await driveClaimTo(first.client, first.pid, cid2, first.mid, 'verification_in_progress');
    const second = await readClaimApprovalWarnings(first.tx, first.pid, cid2);
    expect(second.keys.filter((k) => k.startsWith('peer_'))).toEqual([]);
    expect(second.peerAnswerFlags.size).toBe(0);
  });

  it('BF13 — a re-review that moves the accepted date from EQUAL to differing RAISES the key; to ANOTHER differing date keeps it', async () => {
    const ctx = await claim();
    const d = await acceptedDate(ctx);
    const id = await dated(ctx, d);
    expect(await peerKeys(ctx)).toEqual([]);
    await seedAcceptedDeathCertificate(ctx.client, { pariwarId: ctx.pid, claimCaseId: ctx.cid, date: addCalendarDays(d, -4) });
    expect(await peerKeys(ctx)).toEqual([`peer_death_date_differs:${id}`]);
    await seedAcceptedDeathCertificate(ctx.client, { pariwarId: ctx.pid, claimCaseId: ctx.cid, date: addCalendarDays(d, -9) });
    expect(await peerKeys(ctx)).toEqual([`peer_death_date_differs:${id}`]);
    await expectParity(ctx);
  });

  it('both readers agree PAST one 500-id slice (the claim read in the second slice)', async () => {
    const ctx = await claim({ pings: 2 });
    await save(ctx, 'has_died', { codes: ['not_died'] }, 0);
    await dated(ctx, addCalendarDays(await acceptedDate(ctx), -2), 1);
    const padding = Array.from({ length: 500 }, () => toClaimId(randomUUID()));
    await expectParity(ctx, padding);
    expect((await peerKeys(ctx)).length).toBe(2);
  });

  it('AC3 (domain leg) — the District Admin\'s approval over a neighbour key needs a reason; with the generic it passes', async () => {
    const ctx = await claim();
    await save(ctx, 'has_died', { codes: ['not_died'] });
    const approve = (warningReasonCode: string | null) =>
      adjudicateClaim(ctx.client, {
        claimCaseId: ctx.cid, pariwarId: ctx.pid, outcome: 'approved', reasonCode: 'r5_d_natural_death',
        rationaleCiphertext: 'enc:v1:why', warningReasonCode, actorId: DA, actorDisplay: 'Anita (District Admin)', actor: 'operator',
      });
    await ctx.client.query('SAVEPOINT refused');
    await expect(approve(null)).rejects.toSatisfy(
      (e: unknown) => e instanceof ApprovalWarningReasonRequiredError && [...e.kinds].join() === 'peer_says_not_died',
    );
    await ctx.client.query('ROLLBACK TO SAVEPOINT refused');
    await expect(approve('warnings_reviewed')).resolves.toBeDefined();
  });
});
