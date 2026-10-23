// The `workplace_named_v1` snapshot — AS RECORDED BEFORE THE CUT (Story 6.36, Task 3; AC5, AC6; 6.36a SW20–SW23, I8).
// Live DB; per-test ROLLBACK; a fresh Pariwar (and its own workplace list) per test; seeds as the superuser.
//
// ⚠ The same-tx `now()` trap: every row here carries an EXPLICIT recorded time (`created_at`, `asked_at`,
// `responded_at`, `ended_at`, the claim's `created_at`) placed relative to the cut, so ⛔ comparison in these legs
// reads a transaction-start clock — the ordering under test is the ordering written. The one writer that stamps its
// own clock (`removeKnownPerson`, `clock_timestamp()`) is followed by a claim filed at THAT instant, read back.
//
//   · the cut: a posting the family records on the filing day ⇒ ignored (with a previous workplace it would have made
//     count); a friend's posting at the school on the filing day ⇒ ignored; 10 days before ⇒ counted, ranked after the
//     settled colleagues;
//   · SW21: the 90-day boundary (89 ⇒ counts, 90 ⇒ ⛔); A → B → "isn't listed" → B; an unconfirmed "isn't listed";
//     a confirmed B (through `insertMemberPosting` with `exceptRequestId`); a retirement; retiring twice; district-only;
//   · the named people: removed on the filing day before the claim ⇒ counted; the day before ⇒ ⛔; declined / withdrew /
//     asked-then-removed ⇒ ⛔; erased after the cut ⇒ ⛔ selected (SW23);
//   · the staff line: five ways in, four ways ⛔;
//   · SW23 (AC6): each exclusion; renewal grace ⛔ asked (colleague and named); a NULL claimant; a suspension stays eligible;
//     the filer of ANY claim for the death ⛔ asked (`2026-10-16-340` call 2) — another death's filer still is;
//   · the anchor (RF1 C): the cut AND the anchor claim whose id salts the ranking (`-340` call 1) — the anchor id only;
//     the ranking by it is the engine's test (`peer-mesh-grouped.test.ts`) and the job's refile leg;
//   · ONE leg under `twt_app` (RLS on) still sees the colleagues and the named people, and resolves the anchor THROUGH
//     both policies it depends on (`claims`, `claim_nominee_findings` — an innocence finding visible only through the
//     latter moves the anchor).
//   · ⭐ Story 6.36d (`2026-10-23-386` ND2 / ND7; AC1, AC3, AC7, AC9 — M1, M16): the nominee conjunct takes the indexes as INPUT,
//     so these legs pass the seeded member's own `idx-…` string (TR8 — the conjunct is what is tested; the real hash is the
//     function's unit test and the jobs legs'); the staff line's third disjunct (a nominee version in the 90 days).

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { addCalendarDays } from '../../../src/cycle-calendar/holiday-resolver.js';
import { selectPeerMeshGrouped } from '../../../src/claim/peer-mesh.js';
import { resolvePeerMeshMetric } from '../../../src/claim/peer-mesh-metric-registry.js';
import {
  getPeerMeshGroupedSnapshot,
  peerMeshFilingCut,
  resolvePeerMeshFilingCut,
  type PeerMeshFilingCut,
  type PeerMeshGroupedSnapshot,
} from '../../../src/claim/peer-mesh-read.js';
import {
  claimId as toClaimId,
  knownPersonLinkId,
  memberId as toMemberId,
  pariwarId as toPariwarId,
  workplaceId as toWorkplaceId,
  workplaceRequestId as toWorkplaceRequestId,
  type MemberId,
} from '../../../src/ids/index.js';
import { peerMeshNomineeLinkedMembersAsOf } from '../../../src/claim/peer-mesh-nominees.js';
import { removeKnownPerson } from '../../../src/member/known-people.js';
import { listNomineeDeclarationVersions } from '../../../src/nominee/declaration-history.js';
import { listNomineeLinksOfVersions } from '../../../src/nominee/member-links.js';
import { insertMemberPosting } from '../../../src/member/posting.js';
import { memberModerationActions } from '../../../src/schema/member_moderation_actions.js';
import type { MemberLifecycleState } from '../../../src/schema/members.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { enterAppScope, seedMember } from '../_helpers.js';
import { seedWorkplaceList } from '../member/_workplace-fixtures.js';

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

/** The claim is filed at 11:30 IST on this date (06:00 UTC); the cut is 00:00 IST that day. */
const FILING_DATE = '2026-10-16';
const FILED_AT = new Date('2026-10-16T06:00:00.000Z');
const CUT = peerMeshFilingCut(FILED_AT);
/** An instant `d` days before the cut (negative ⇒ after it — e.g. `-0.05` is ~01:10 IST on the filing day). */
const before = (d: number, cut: PeerMeshFilingCut = CUT) => new Date(cut.cut.getTime() - d * DAY);
const daysBack = (d: number) => addCalendarDays(FILING_DATE, -d);

interface World {
  p: string;
  A: string;
  B: string;
  C: string;
}

async function world(): Promise<World> {
  const { client } = getTx();
  const list = await seedWorkplaceList(client, {
    districts: ['Patna'],
    workplaces: [
      { name: 'A', district: 'Patna' },
      { name: 'B', district: 'Patna' },
      { name: 'C', district: 'Patna', kind: 'office' },
    ],
  });
  return { p: list.pariwarId, A: list.ids.A!, B: list.ids.B!, C: list.ids.C! };
}

/** A member (default `active`) with an identity row. */
async function member(p: string, state: MemberLifecycleState = 'active', identity = true): Promise<MemberId> {
  const { tx, client } = getTx();
  const id = await seedMember(tx, p, { state });
  if (identity) {
    await client.query(
      `INSERT INTO member_identities (member_id, pariwar_id, mobile_ciphertext, mobile_blind_index) VALUES ($1, $2, 'enc:v1:x', $3)`,
      [id, p, `idx-${randomUUID()}`],
    );
  }
  return toMemberId(id);
}

interface PostOpts {
  workplace?: string;
  notListed?: boolean;
  retirement?: boolean;
  startedOn?: string | null;
  at: Date;
}

/** A raw posting with an explicit recorded time. */
async function post(p: string, m: string, o: PostOpts): Promise<void> {
  const { client } = getTx();
  let requestId: string | null = null;
  if (o.notListed) {
    const r = await client.query<{ request_id: string }>(
      `INSERT INTO workplace_requests (pariwar_id, member_id, district, typed_name, started_on, created_at)
       VALUES ($1, $2, 'Patna', 'Unlisted school', $3, $4) RETURNING request_id`,
      [p, m, o.startedOn ?? daysBack(10), o.at],
    );
    requestId = r.rows[0]!.request_id;
  }
  await client.query(
    `INSERT INTO member_postings (member_id, pariwar_id, district, is_retirement, workplace_id, workplace_request_id, started_on, created_at)
     VALUES ($1, $2, 'Patna', $3, $4, $5, $6, $7)`,
    [m, p, o.retirement ?? false, o.workplace ?? null, requestId, o.startedOn === undefined ? '2010-01-01' : o.startedOn, o.at],
  );
}

/** A colleague at `w` since long ago (recorded 400 days before ⇒ settled). */
async function colleague(p: string, w: string, o: { state?: MemberLifecycleState; at?: Date; identity?: boolean } = {}): Promise<MemberId> {
  const m = await member(p, o.state ?? 'active', o.identity ?? true);
  await post(p, m, { workplace: w, startedOn: '2015-06-01', at: o.at ?? before(400) });
  return m;
}

/** A claim naming `deceased`, filed at `createdAt`, as the superuser (the state-writer guard on for the one INSERT). */
async function fileClaim(
  p: string,
  deceased: string,
  o: { claimant?: string | null; createdAt?: Date; state?: string; id?: string; channel?: 'member_app' | 'helpline' | 'trustee_initiated' } = {},
): Promise<string> {
  const { client } = getTx();
  const id = o.id ?? randomUUID();
  await client.query(`SET LOCAL app.claim_state_writer = 'on'`);
  await client.query(
    `INSERT INTO claims (claim_case_id, pariwar_id, deceased_member_id, claimant_actor_id, intake_channels, current_state, state_event_version, created_at)
     VALUES ($1, $2, $3, $4, ARRAY[$7]::claim_intake_channel[], $5, 1, $6)`,
    [id, p, deceased, o.claimant ?? null, o.state ?? 'documents_pending', o.createdAt ?? FILED_AT, o.channel ?? 'member_app'],
  );
  await client.query(`SET LOCAL app.claim_state_writer = 'off'`);
  return id;
}

/** An intake attempt for `deceased`'s death filed by `claimant` (`2026-10-16-341`) — as the superuser. */
async function attempt(p: string, deceased: string, claimant: string | null, status: 'pending' | 'converged' | 'overridden_separate', channel = 'member_app'): Promise<void> {
  const { client } = getTx();
  await client.query(
    `INSERT INTO intake_attempts (intake_attempt_id, pariwar_id, deceased_member_id, intake_channel, claimant_actor_id, attempt_status)
     VALUES (gen_random_uuid(), $1, $2, $3::claim_intake_channel, $4, $5::intake_attempt_status)`,
    [p, deceased, channel, claimant, status],
  );
}

/** A link with explicit dates (days before the cut; `null` ⇒ NULL). */
async function link(
  p: string,
  namer: string,
  named: string,
  state: string,
  d: { asked: number; responded?: number | null; ended?: number | null },
): Promise<string> {
  const { client } = getTx();
  const id = randomUUID();
  const t = (x: number | null | undefined) => (x === null || x === undefined ? null : before(x));
  await client.query(
    `INSERT INTO member_known_people (link_id, pariwar_id, namer_member_id, named_member_id, found_by, state, asked_at, responded_at, ended_at)
     VALUES ($1, $2, $3, $4, 'contacts', $5, $6, $7, $8)`,
    [id, p, namer, named, state, t(d.asked), t(d.responded), t(d.ended)],
  );
  return id;
}

async function snapshot(
  p: string,
  deceased: MemberId,
  o: { cut?: PeerMeshFilingCut; nominees?: readonly string[]; linked?: readonly MemberId[] } = {},
): Promise<PeerMeshGroupedSnapshot> {
  const { tx } = getTx();
  return getPeerMeshGroupedSnapshot(tx, {
    pariwarId: toPariwarId(p),
    deceasedMemberId: deceased,
    cut: o.cut ?? CUT,
    nomineeMatch: { mobileIndexes: o.nominees ?? [], memberIds: o.linked ?? [] },
  });
}

/** Story 6.36d — the seeded member's login blind index (a fake `idx-…` string — TR8). */
async function loginIndex(m: string): Promise<string> {
  const r = await getTx().client.query<{ i: string }>(`SELECT mobile_blind_index AS i FROM member_identities WHERE member_id = $1`, [m]);
  return r.rows[0]!.i;
}

/** Story 6.36d (ND7) — a `declared` nominee version of `deceased` recorded at `at` (fake ciphertexts — ⛔ decrypted here). */
async function nomineeVersion(p: string, deceased: string, at: Date, rank: 1 | 2 = 1, versionNo = 1): Promise<string> {
  const r = await getTx().client.query<{ version_id: string }>(
    `INSERT INTO member_nominee_versions (member_id, pariwar_id, rank, version_no, declaration_id, kind, source, name_ciphertext,
                                          relationship, mobile_ciphertext, split_pct, recorded_at, effective_at)
     VALUES ($1, $2, $3, $4, gen_random_uuid(), 'declared', 'member', 'enc:v1:n', 'spouse', 'enc:v1:m', 100, $5, $5)
     RETURNING version_id`,
    [deceased, p, rank, versionNo, at],
  );
  return r.rows[0]!.version_id;
}

/**
 * Story 6.36e — a nominee MEMBER LINK on `versionId`, as the table owner (the declare writes it in production). `answer` /
 * `ended` / `erased` let a leg FORGE the rows a real save or erasure would leave (each leg's name says when it is forged).
 */
async function nomineeLink(
  p: string,
  declarer: string,
  versionId: string,
  nominee: string,
  o: { rank?: 1 | 2; answer?: 'confirmed' | 'not_me'; respondedAt?: Date; askedAt?: Date; end?: { at: Date; reason: 'redeclared' | 'removed_by_declarer' | 'erased' }; carriedFrom?: string } = {},
): Promise<string> {
  const r = await getTx().client.query<{ link_id: string }>(
    `INSERT INTO member_nominee_links (pariwar_id, declarer_member_id, version_id, rank, nominee_member_id, found_by, carried_from_link_id,
                                       state, answer, asked_at, responded_at, ended_at, end_reason)
     VALUES ($1, $2, $3, $4, $5, 'contacts', $6, $7, $8, $9, $10, $11, $12) RETURNING link_id`,
    [
      p, declarer, versionId, o.rank ?? 1, nominee, o.carriedFrom ?? null,
      o.end === undefined ? 'live' : o.end.reason === 'erased' ? 'erased' : 'ended',
      o.answer ?? null, o.askedAt ?? before(200), o.answer === undefined ? null : (o.respondedAt ?? before(150)),
      o.end?.at ?? null, o.end?.reason ?? null,
    ],
  );
  return r.rows[0]!.link_id;
}

/** Story 6.36e — the marked members as of the cut, through the REAL reads `peerMeshNomineeMatch` makes (⛔ its KMS half). */
async function linkedAsOf(p: string, deceased: MemberId, cut: PeerMeshFilingCut = CUT): Promise<MemberId[]> {
  const { tx } = getTx();
  const versions = await listNomineeDeclarationVersions(tx, toPariwarId(p), deceased);
  const links = await listNomineeLinksOfVersions(tx, toPariwarId(p), versions.map((v) => v.versionId));
  return peerMeshNomineeLinkedMembersAsOf(versions, links, cut.cut);
}

const ids = (s: PeerMeshGroupedSnapshot, group?: string) =>
  s.candidates.filter((c) => group === undefined || c.group === group).map((c) => c.memberId).sort();
const sorted = (...ms: string[]) => [...ms].sort();

function rank(anchorClaimCaseId: string, s: PeerMeshGroupedSnapshot) {
  const metric = resolvePeerMeshMetric('workplace_named_v1');
  if (metric.kind !== 'grouped') throw new Error('grouped');
  return selectPeerMeshGrouped({ anchorClaimCaseId, candidates: s.candidates, metric });
}

describe.skipIf(!hasDatabase)('Story 6.36 — the workplace_named_v1 snapshot (AC5, AC6)', { timeout: 20000 }, () => {
  setupLiveDb();

  describe('the cut (SW20)', () => {
    it('the family\'s filing-day posting is ignored (it would have made A count as the previous workplace); a friend\'s filing-day posting at the school is ignored; 10 days before ⇒ counted, ranked after every settled colleague', async () => {
      const w = await world();
      const dead = await member(w.p);
      await post(w.p, dead, { workplace: w.A, startedOn: '2012-01-01', at: before(900) });
      await post(w.p, dead, { workplace: w.B, startedOn: FILING_DATE, at: before(-0.05) }); // the family, on the filing day
      const c1 = await colleague(w.p, w.A);
      const c2 = await colleague(w.p, w.A);
      const atB = await colleague(w.p, w.B);
      const lateFriend = await colleague(w.p, w.A, { at: before(-0.1) });
      const recentFriend = await colleague(w.p, w.A, { at: before(10) });
      const claim = await fileClaim(w.p, dead);
      const s = await snapshot(w.p, dead);
      expect(s.workplace.currentWorkplaceId).toBe(w.A);
      expect(s.workplace.previousWorkplaceCounted).toBe(false);
      expect(ids(s)).toEqual(sorted(c1, c2, recentFriend));
      expect(ids(s)).not.toContain(atB);
      expect(ids(s)).not.toContain(lateFriend);
      expect(s.candidates.find((c) => c.memberId === recentFriend)?.settled).toBe(false);
      expect(s.candidates.find((c) => c.memberId === c1)?.settled).toBe(true);
      const r = rank(claim, s);
      expect(r.rankedMemberIds[2]).toBe(recentFriend);
      expect(s.recentChangeBeforeFiling).toBe(false);
    });

    it('a candidate whose LATEST posting before the cut is elsewhere is ⛔ a colleague; one who moved TO the school after the cut is ⛔ either', async () => {
      const w = await world();
      const dead = await member(w.p);
      await post(w.p, dead, { workplace: w.A, at: before(900) });
      const left = await colleague(w.p, w.A, { at: before(500) });
      await post(w.p, left, { workplace: w.C, startedOn: daysBack(30), at: before(30) });
      const stays = await colleague(w.p, w.A);
      await post(w.p, stays, { workplace: w.C, startedOn: FILING_DATE, at: before(-0.2) }); // after the cut ⇒ ignored
      await fileClaim(w.p, dead);
      const s = await snapshot(w.p, dead);
      expect(ids(s)).toEqual([stays]);
    });
  });

  describe('the previous workplace (SW21)', () => {
    async function transfer(startedDaysBack: number) {
      const w = await world();
      const dead = await member(w.p);
      await post(w.p, dead, { workplace: w.A, startedOn: '2012-01-01', at: before(900) });
      await post(w.p, dead, { workplace: w.B, startedOn: daysBack(startedDaysBack), at: before(startedDaysBack) });
      const atA = await colleague(w.p, w.A);
      const atB = await colleague(w.p, w.B);
      await fileClaim(w.p, dead);
      return { w, s: await snapshot(w.p, dead), atA, atB };
    }

    it('89 days ⇒ the previous workplace counts (its people are workplace_previous); 90 ⇒ ⛔', async () => {
      const in89 = await transfer(89);
      expect(in89.s.workplace).toMatchObject({ currentWorkplaceId: in89.w.B, previousWorkplaceId: in89.w.A, previousWorkplaceCounted: true });
      expect(ids(in89.s, 'workplace_previous')).toEqual([in89.atA]);
      expect(ids(in89.s, 'workplace_current')).toEqual([in89.atB]);
      const in90 = await transfer(90);
      expect(in90.s.workplace).toMatchObject({ currentWorkplaceId: in90.w.B, previousWorkplaceId: in90.w.A, previousWorkplaceCounted: false });
      expect(ids(in90.s)).toEqual([in90.atB]);
    });

    it('A → B (started 120 days before) → "isn\'t listed" → B (20 days before) ⇒ the previous does ⛔ count', async () => {
      const w = await world();
      const dead = await member(w.p);
      await post(w.p, dead, { workplace: w.A, at: before(900) });
      await post(w.p, dead, { workplace: w.B, startedOn: daysBack(120), at: before(120) });
      await post(w.p, dead, { notListed: true, startedOn: daysBack(60), at: before(60) });
      await post(w.p, dead, { workplace: w.B, startedOn: daysBack(20), at: before(20) });
      const atA = await colleague(w.p, w.A);
      const atB = await colleague(w.p, w.B);
      await fileClaim(w.p, dead);
      const s = await snapshot(w.p, dead);
      expect(s.workplace.previousWorkplaceCounted).toBe(false);
      expect(ids(s)).toEqual([atB]);
      expect(ids(s)).not.toContain(atA);
      expect(s.recentChangeBeforeFiling).toBe(true); // the latest posting was recorded 20 days before
    });

    it('A → an unconfirmed "isn\'t listed" 20 days before ⇒ ⛔ current workplace; A counts as the previous one', async () => {
      const w = await world();
      const dead = await member(w.p);
      await post(w.p, dead, { workplace: w.A, at: before(900) });
      await post(w.p, dead, { notListed: true, startedOn: daysBack(20), at: before(20) });
      const atA = await colleague(w.p, w.A);
      await fileClaim(w.p, dead);
      const s = await snapshot(w.p, dead);
      expect(s.workplace).toMatchObject({ currentWorkplaceId: null, previousWorkplaceId: w.A, previousWorkplaceCounted: true });
      expect(ids(s, 'workplace_previous')).toEqual([atA]);
    });

    it('school A → "isn\'t listed" → confirmed school B 60 days before (through insertMemberPosting + exceptRequestId) ⇒ A\'s colleagues count and rank first', async () => {
      const { tx, client } = getTx();
      const w = await world();
      const dead = await member(w.p);
      // This leg's claim is filed 60 days AFTER the writer's own clock, so the writer's `now()` is 60 days before the cut.
      const { rows } = await client.query<{ now: Date }>(`SELECT now() AS now`);
      const filedAt = new Date(rows[0]!.now.getTime() + 60 * DAY + HOUR);
      const cut = peerMeshFilingCut(filedAt);
      const startedOn = addCalendarDays(cut.filingDate, -62);
      await post(w.p, dead, { workplace: w.A, at: before(900, cut) });
      const req = await client.query<{ request_id: string }>(
        `INSERT INTO workplace_requests (pariwar_id, member_id, district, typed_name, started_on, created_at)
         VALUES ($1, $2, 'Patna', 'Unlisted school', $3, $4) RETURNING request_id`,
        [w.p, dead, startedOn, before(63, cut)],
      );
      const requestId = req.rows[0]!.request_id;
      await client.query(
        `INSERT INTO member_postings (member_id, pariwar_id, district, workplace_request_id, started_on, created_at) VALUES ($1, $2, 'Patna', $3, $4, $5)`,
        [dead, w.p, requestId, startedOn, before(63, cut)],
      );
      await insertMemberPosting(tx, {
        memberId: dead,
        pariwarId: toPariwarId(w.p),
        district: 'Patna',
        workplaceId: toWorkplaceId(w.B),
        startedOn,
        exceptRequestId: toWorkplaceRequestId(requestId),
      });
      const atA = await colleague(w.p, w.A, { at: before(400, cut) });
      const atB1 = await colleague(w.p, w.B, { at: before(400, cut) });
      const atB2 = await colleague(w.p, w.B, { at: before(400, cut) });
      const claim = await fileClaim(w.p, dead, { createdAt: filedAt });
      const s = await snapshot(w.p, dead, { cut });
      expect(s.workplace).toMatchObject({ currentWorkplaceId: w.B, previousWorkplaceId: w.A, previousWorkplaceCounted: true });
      const r = rank(claim, s);
      expect(r.source).toBe('workplace');
      expect(r.rankedMemberIds[0]).toBe(atA);
      expect(sorted(...r.rankedMemberIds.slice(1))).toEqual(sorted(atB1, atB2));
    });

    it('a retirement 30 days before ⇒ the previous counts and ⛔ current; retiring twice ⛔ re-arms', async () => {
      const w = await world();
      const dead = await member(w.p);
      await post(w.p, dead, { workplace: w.A, at: before(900) });
      await post(w.p, dead, { retirement: true, startedOn: daysBack(30), at: before(30) });
      const atA = await colleague(w.p, w.A);
      await fileClaim(w.p, dead);
      const once = await snapshot(w.p, dead);
      expect(once.workplace).toMatchObject({ currentWorkplaceId: null, previousWorkplaceId: w.A, previousWorkplaceCounted: true });
      expect(ids(once, 'workplace_previous')).toEqual([atA]);

      const w2 = await world();
      const dead2 = await member(w2.p);
      await post(w2.p, dead2, { workplace: w2.A, at: before(900) });
      await post(w2.p, dead2, { retirement: true, startedOn: daysBack(400), at: before(400) });
      await post(w2.p, dead2, { retirement: true, startedOn: daysBack(10), at: before(10) });
      await colleague(w2.p, w2.A);
      await fileClaim(w2.p, dead2);
      const twice = await snapshot(w2.p, dead2);
      expect(twice.workplace.previousWorkplaceCounted).toBe(false);
      expect(twice.candidates).toEqual([]);
    });

    it('a deceased whose only rows are district-only ⇒ ⛔ workplace group (named people, or nobody)', async () => {
      const w = await world();
      const dead = await member(w.p);
      await post(w.p, dead, { startedOn: null, at: before(900) });
      await post(w.p, dead, { startedOn: null, at: before(300) });
      await colleague(w.p, w.A);
      const named = await member(w.p);
      await link(w.p, dead, named, 'accepted', { asked: 200, responded: 199 });
      await fileClaim(w.p, dead);
      const s = await snapshot(w.p, dead);
      expect(s.workplace).toMatchObject({ currentWorkplaceId: null, previousWorkplaceId: null, previousWorkplaceCounted: false });
      expect(s.candidates).toEqual([{ memberId: named, group: 'named', settled: false }]);
    });
  });

  describe('the named people (SW17, SW20)', () => {
    it('removed through removeKnownPerson on the filing day BEFORE the claim ⇒ still counted; removed the day before ⇒ ⛔', async () => {
      const { tx, client } = getTx();
      const w = await world();
      const dead = await member(w.p);
      const keep = await member(w.p);
      const goneYesterday = await member(w.p);
      // The removal stamps `clock_timestamp()` — so this leg's "filing day" is TODAY, and the claim is filed at that instant.
      const linkId = randomUUID();
      await client.query(
        `INSERT INTO member_known_people (link_id, pariwar_id, namer_member_id, named_member_id, found_by, state, asked_at, responded_at)
         VALUES ($1, $2, $3, $4, 'contacts', 'accepted', now() - interval '200 days', now() - interval '199 days')`,
        [linkId, w.p, dead, keep],
      );
      const r = await removeKnownPerson(tx, { pariwarId: toPariwarId(w.p), namerMemberId: dead, linkId: knownPersonLinkId(linkId) });
      expect(r.kind).toBe('done');
      const ended = (await client.query<{ ended_at: Date }>(`SELECT ended_at FROM member_known_people WHERE link_id = $1`, [linkId])).rows[0]!.ended_at;
      const cut = peerMeshFilingCut(ended);
      await client.query(
        `INSERT INTO member_known_people (link_id, pariwar_id, namer_member_id, named_member_id, found_by, state, asked_at, responded_at, ended_at)
         VALUES (gen_random_uuid(), $1, $2, $3, 'contacts', 'removed', $4, $5, $6)`,
        [w.p, dead, goneYesterday, before(200, cut), before(199, cut), before(0.5, cut)],
      );
      await fileClaim(w.p, dead, { createdAt: ended });
      const s = await snapshot(w.p, dead, { cut });
      expect(ids(s)).toEqual([keep]);
    });

    it('a decline, a withdrawal (whenever — even after the cut), an asked-then-removed and an asked-then-erased link ⛔ count; an accepted one does', async () => {
      const w = await world();
      const dead = await member(w.p);
      const people: MemberId[] = [];
      for (let i = 0; i < 7; i += 1) people.push(await member(w.p));
      const [accepted, declined, withdrewAfter, withdrewBefore, askedRemoved, askedErased, stillAsked] = people;
      // (the backstop counts LIVE links: two live here — the accepted one and the open ask)
      await link(w.p, dead, accepted!, 'accepted', { asked: 100, responded: 99 });
      await link(w.p, dead, declined!, 'declined', { asked: 100, responded: 99, ended: 99 });
      await link(w.p, dead, withdrewAfter!, 'withdrawn', { asked: 100, responded: 99, ended: -0.5 });
      await link(w.p, dead, withdrewBefore!, 'withdrawn', { asked: 100, responded: 99, ended: 50 });
      await link(w.p, dead, askedRemoved!, 'removed', { asked: 100, ended: -0.5 });
      await link(w.p, dead, askedErased!, 'erased', { asked: 100, ended: -0.5 });
      await link(w.p, dead, stillAsked!, 'asked', { asked: 5 });
      await fileClaim(w.p, dead);
      const s = await snapshot(w.p, dead);
      expect(ids(s)).toEqual([accepted]);
    });

    it('accepted AFTER the cut ⛔ counts; removed / erased AFTER the cut (accepted before) still counts — but an erased member is ⛔ asked (SW23)', async () => {
      const { client } = getTx();
      const w = await world();
      const dead = await member(w.p);
      const late = await member(w.p);
      const removedAfter = await member(w.p);
      const erased = await member(w.p, 'anonymized');
      await link(w.p, dead, late, 'accepted', { asked: 1, responded: -0.2 });
      await link(w.p, dead, removedAfter, 'removed', { asked: 100, responded: 99, ended: -0.2 });
      await link(w.p, dead, erased, 'erased', { asked: 100, responded: 99, ended: -0.2 });
      await fileClaim(w.p, dead);
      const s = await snapshot(w.p, dead);
      expect(ids(s)).toEqual([removedAfter]);
      expect((await client.query(`SELECT 1 FROM member_known_people WHERE named_member_id = $1`, [erased])).rows).toHaveLength(1);
    });

    it('a named person who is ALSO a colleague is kept ONCE, in the workplace group', async () => {
      const w = await world();
      const dead = await member(w.p);
      await post(w.p, dead, { workplace: w.A, at: before(900) });
      const both = await colleague(w.p, w.A);
      await link(w.p, dead, both, 'accepted', { asked: 100, responded: 99 });
      await fileClaim(w.p, dead);
      const s = await snapshot(w.p, dead);
      expect(s.candidates).toEqual([{ memberId: both, group: 'workplace_current', settled: true }]);
    });
  });

  describe('the staff line — recent_change_before_filing (SW20; `-331` SC1 A)', () => {
    /** A deceased with an OLD posting (so only the change under test can set the flag). */
    async function deceasedWithOldPosting() {
      const w = await world();
      const dead = await member(w.p);
      await post(w.p, dead, { workplace: w.A, at: before(900) });
      return { w, dead };
    }

    it('baseline: nothing recent ⇒ false', async () => {
      const { w, dead } = await deceasedWithOldPosting();
      await link(w.p, dead, await member(w.p), 'accepted', { asked: 200, responded: 199 });
      await fileClaim(w.p, dead);
      expect((await snapshot(w.p, dead)).recentChangeBeforeFiling).toBe(false);
    });

    it('true for: a transfer recorded 20 days before; an ask removed 10 days before; a withdrawal 10 days before; an accepted person erased 10 days before; an acceptance 10 days before', async () => {
      const cases: ((w: World, dead: MemberId) => Promise<void>)[] = [
        async (w, dead) => post(w.p, dead, { workplace: w.B, startedOn: daysBack(20), at: before(20) }),
        async (w, dead) => void (await link(w.p, dead, await member(w.p), 'removed', { asked: 15, ended: 10 })),
        async (w, dead) => void (await link(w.p, dead, await member(w.p), 'withdrawn', { asked: 125, responded: 120, ended: 10 })),
        async (w, dead) => void (await link(w.p, dead, await member(w.p), 'erased', { asked: 125, responded: 120, ended: 10 })),
        async (w, dead) => void (await link(w.p, dead, await member(w.p), 'accepted', { asked: 12, responded: 10 })),
      ];
      for (const [i, seed] of cases.entries()) {
        const { w, dead } = await deceasedWithOldPosting();
        await seed(w, dead);
        await fileClaim(w.p, dead);
        expect((await snapshot(w.p, dead)).recentChangeBeforeFiling, `case ${i}`).toBe(true);
      }
    });

    it('exactly 90 days before the cut is INSIDE the window; a change on the filing day is ⛔ (after the cut)', async () => {
      const a = await deceasedWithOldPosting();
      await post(a.w.p, a.dead, { workplace: a.w.B, startedOn: daysBack(90), at: before(90) });
      await fileClaim(a.w.p, a.dead);
      expect((await snapshot(a.w.p, a.dead)).recentChangeBeforeFiling).toBe(true);
      const b = await deceasedWithOldPosting();
      await link(b.w.p, b.dead, await member(b.w.p), 'accepted', { asked: 2, responded: -0.1 });
      await fileClaim(b.w.p, b.dead);
      expect((await snapshot(b.w.p, b.dead)).recentChangeBeforeFiling).toBe(false);
    });

    it('⛔ true for: a decline, an unanswered ask erased, an ask made (still asked) — each 10 days before — or a lapse', async () => {
      const { client } = getTx();
      const cases: ((w: World, dead: MemberId) => Promise<void>)[] = [
        async (w, dead) => void (await link(w.p, dead, await member(w.p), 'declined', { asked: 12, responded: 10, ended: 10 })),
        async (w, dead) => void (await link(w.p, dead, await member(w.p), 'erased', { asked: 12, ended: 10 })),
        async (w, dead) => void (await link(w.p, dead, await member(w.p), 'asked', { asked: 10 })),
        async (w, dead) => {
          // asked 40 days before ⇒ the lapse CHECK dates its end asked_at + 30 days = 10 days before
          await client.query(
            `INSERT INTO member_known_people (link_id, pariwar_id, namer_member_id, named_member_id, found_by, state, asked_at, ended_at)
             VALUES (gen_random_uuid(), $1, $2, $3, 'contacts', 'lapsed', $4::timestamptz, $4::timestamptz + interval '30 days')`,
            [w.p, dead, await member(w.p), before(40)],
          );
        },
      ];
      for (const [i, seed] of cases.entries()) {
        const { w, dead } = await deceasedWithOldPosting();
        await seed(w, dead);
        await fileClaim(w.p, dead);
        expect((await snapshot(w.p, dead)).recentChangeBeforeFiling, `case ${i}`).toBe(false);
      }
    });
  });

  describe('SW23 — the ONE eligibility predicate (AC6)', () => {
    it('each exclusion: not active (incl. renewal grace), named by a claim (any state), ⛔ identity row, the claimant; a suspension stays eligible', async () => {
      const { tx } = getTx();
      const w = await world();
      const dead = await member(w.p);
      await post(w.p, dead, { workplace: w.A, at: before(900) });
      const ok = await colleague(w.p, w.A);
      const suspended = await colleague(w.p, w.A);
      await tx.insert(memberModerationActions).values({
        memberId: suspended,
        pariwarId: toPariwarId(w.p),
        action: 'suspend',
        reasonCode: 'r7-contribution-discipline',
        decisionNoteCiphertext: 'enc:v1:seed',
        actorId: randomUUID(),
        actorDisplay: 'Seed Trustee',
        actedAt: before(5),
      });
      const excluded: string[] = [];
      for (const state of ['pending-kyc', 'pending-fee', 'pending-valid', 'lock-in', 'active-in-grace', 'lapsed-unpaid', 'withdrawn', 'anonymized'] as const) {
        excluded.push(await colleague(w.p, w.A, { state }));
      }
      const otherDead = await colleague(w.p, w.A);
      await fileClaim(w.p, otherDead, { state: 'closed' }); // a claim in ANY state names them
      excluded.push(otherDead);
      excluded.push(await colleague(w.p, w.A, { identity: false }));
      const claimant = await colleague(w.p, w.A);
      excluded.push(claimant);
      await fileClaim(w.p, dead, { claimant });
      const s = await snapshot(w.p, dead);
      expect(ids(s)).toEqual(sorted(ok, suspended));
      for (const x of excluded) expect(ids(s)).not.toContain(x);
      expect(ids(s)).not.toContain(dead);
    });

    it('a NULL claimant excludes nobody; an active-in-grace accepted named person is ⛔ asked', async () => {
      const w = await world();
      const dead = await member(w.p);
      const graceNamed = await member(w.p, 'active-in-grace');
      const activeNamed = await member(w.p);
      await link(w.p, dead, graceNamed, 'accepted', { asked: 100, responded: 99 });
      await link(w.p, dead, activeNamed, 'accepted', { asked: 100, responded: 99 });
      await fileClaim(w.p, dead, { claimant: null });
      const s = await snapshot(w.p, dead);
      expect(ids(s)).toEqual([activeNamed]);
    });

    it('`-340` call 2: the filer of ANY claim for this death — an earlier refused one, an innocence-lifted one — is ⛔ asked; another death\'s filer still is', async () => {
      const w = await world();
      const dead = await member(w.p);
      await post(w.p, dead, { workplace: w.A, at: before(900) });
      const ok = await colleague(w.p, w.A);
      const earlierFiler = await colleague(w.p, w.A);
      const otherDeathFiler = await colleague(w.p, w.A);
      const liftedFiler = await colleague(w.p, w.A);
      const lifted = await fileClaim(w.p, dead, { claimant: liftedFiler, createdAt: new Date('2025-06-01T06:00:00.000Z'), state: 'denied' });
      await getTx().client.query(
        `INSERT INTO claim_nominee_findings (finding_id, claim_case_id, pariwar_id, kind, recorded_by_actor_id, recorded_by_display)
         VALUES (gen_random_uuid(), $1, $2, 'member_found_innocent', 'seed', 'Seed Investigator')`,
        [lifted, w.p],
      ); // a false report the member was found innocent of: it lifts the CUT, but its filer asserted a death ⇒ still ⛔ asked
      await fileClaim(w.p, dead, { claimant: earlierFiler, createdAt: new Date('2026-03-01T06:00:00.000Z'), state: 'denied' });
      await fileClaim(w.p, await member(w.p), { claimant: otherDeathFiler }); // they filed for SOMEONE ELSE's death
      await fileClaim(w.p, dead, { claimant: null }); // the refile — by the helpline, ⛔ claimant
      const s = await snapshot(w.p, dead);
      expect(ids(s)).toEqual(sorted(ok, otherDeathFiler));
      expect(ids(s)).not.toContain(earlierFiler);
      expect(ids(s)).not.toContain(liftedFiler);
    });

    it('`-341`: the filer of ANY intake attempt for this death — pending, merged (converged) or overridden — is ⛔ asked; an attempt for another death, or with ⛔ filer, excludes nobody', async () => {
      const w = await world();
      const dead = await member(w.p);
      await post(w.p, dead, { workplace: w.A, at: before(900) });
      const ok = await colleague(w.p, w.A);
      const pending = await colleague(w.p, w.A);
      const merged = await colleague(w.p, w.A);
      const overridden = await colleague(w.p, w.A);
      const otherDeath = await colleague(w.p, w.A);
      await fileClaim(w.p, dead, { claimant: null, channel: 'helpline' }); // the helpline's claim — ⛔ claimant
      // each as the ICP would leave it beside a helpline claim: a member's app filing still pending; a trustee filing
      // merged; a member's filing an operator split off (its own claim aside — the attempt row is what is read here)
      await attempt(w.p, dead, pending, 'pending', 'member_app');
      await attempt(w.p, dead, merged, 'converged', 'trustee_initiated');
      await attempt(w.p, dead, overridden, 'overridden_separate', 'member_app');
      await attempt(w.p, dead, null, 'converged', 'trustee_initiated');
      await attempt(w.p, await member(w.p), otherDeath, 'pending');
      const s = await snapshot(w.p, dead);
      expect(ids(s)).toEqual(sorted(ok, otherDeath));
    });
  });

  describe('Story 6.36d — a member\'s nominees are ⛔ among the five (ND2; AC1, AC3)', () => {
    it('M1 — a colleague signing in with a nominee number is ⛔ a candidate; the others stay; an EMPTY list excludes nobody (valid SQL)', async () => {
      const w = await world();
      const dead = await member(w.p);
      await post(w.p, dead, { workplace: w.A, at: before(900) });
      const ok = await colleague(w.p, w.A);
      const nominee = await colleague(w.p, w.A);
      await fileClaim(w.p, dead);
      // TR5 — `= ANY('{}'::text[])` renders and is false ⇒ NOT EXISTS true ⇒ nobody excluded.
      expect(ids(await snapshot(w.p, dead, { nominees: [] }))).toEqual(sorted(ok, nominee));
      const s = await snapshot(w.p, dead, { nominees: [await loginIndex(nominee)] });
      expect(ids(s)).toEqual([ok]);
      // an index nobody signs in with (a non-member nominee) excludes nobody
      expect(ids(await snapshot(w.p, dead, { nominees: [`idx-${randomUUID()}`] }))).toEqual(sorted(ok, nominee));
    });

    it('a nominee in the NAMED group is ⛔ a candidate; a workplace group emptied ONLY by the exclusion falls through to the named group (G15)', async () => {
      const w = await world();
      const dead = await member(w.p);
      await post(w.p, dead, { workplace: w.A, at: before(900) });
      const onlyColleague = await colleague(w.p, w.A);
      const named = await member(w.p);
      const namedNominee = await member(w.p);
      await link(w.p, dead, named, 'accepted', { asked: 100, responded: 99 });
      await link(w.p, dead, namedNominee, 'accepted', { asked: 100, responded: 99 });
      await fileClaim(w.p, dead);
      const s = await snapshot(w.p, dead, { nominees: [await loginIndex(onlyColleague), await loginIndex(namedNominee)] });
      expect(s.candidates).toEqual([{ memberId: named, group: 'named', settled: false }]);
      const r = rank(randomUUID(), s);
      expect(r.selectedMemberIds).toEqual([named]);
    });

    it('the five stay five: six colleagues, one a nominee ⇒ five asked, the nominee ⛔ among them or in the ranking', async () => {
      const w = await world();
      const dead = await member(w.p);
      await post(w.p, dead, { workplace: w.A, at: before(900) });
      const six: MemberId[] = [];
      for (let i = 0; i < 6; i += 1) six.push(await colleague(w.p, w.A));
      const nominee = six[2]!;
      await fileClaim(w.p, dead);
      const r = rank(randomUUID(), await snapshot(w.p, dead, { nominees: [await loginIndex(nominee)] }));
      expect(r.selectedMemberIds).toHaveLength(5);
      expect(r.selectedMemberIds).not.toContain(nominee);
      expect(r.rankedMemberIds ?? []).not.toContain(nominee);
    });

    it('a member of ANOTHER Pariwar holding the same index is unaffected (coverage-only — the match is per Pariwar)', async () => {
      const w = await world();
      const other = await world();
      const dead = await member(w.p);
      await post(w.p, dead, { workplace: w.A, at: before(900) });
      const c = await colleague(w.p, w.A);
      const elsewhere = await member(other.p);
      const shared = await loginIndex(elsewhere);
      // the same login index in this Pariwar's colleague would be a different person; here the colleague's index differs
      await fileClaim(w.p, dead);
      expect(ids(await snapshot(w.p, dead, { nominees: [shared] }))).toEqual([c]);
    });
  });

  describe('Story 6.36e — a MARKED nominee is ⛔ among the five, matched by ACCOUNT (NE7; `-396` Q1 A; AC6)', () => {
    /** A deceased posted at A, two colleagues there; the declaration version recorded `at`. */
    async function scene(at = before(200)) {
      const w = await world();
      const dead = await member(w.p);
      await post(w.p, dead, { workplace: w.A, at: before(900) });
      const ok = await colleague(w.p, w.A);
      const nominee = await colleague(w.p, w.A);
      const v1 = await nomineeVersion(w.p, dead, at);
      return { w, dead, ok, nominee, v1 };
    }

    it('a marked colleague whose login number is ⛔ the declared one is ⛔ a candidate; EMPTY lists exclude nobody (valid SQL)', async () => {
      const s = await scene();
      await nomineeLink(s.w.p, s.dead, s.v1, s.nominee);
      await fileClaim(s.w.p, s.dead);
      // TR5 — `= ANY('{}'::uuid[])` renders and is false.
      expect(ids(await snapshot(s.w.p, s.dead, { nominees: [], linked: [] }))).toEqual(sorted(s.ok, s.nominee));
      const linked = await linkedAsOf(s.w.p, s.dead);
      expect(linked).toEqual([s.nominee]);
      // the declared number is someone else's (`idx-…` — nobody signs in with it): the ACCOUNT alone keeps them out
      expect(ids(await snapshot(s.w.p, s.dead, { nominees: [`idx-${randomUUID()}`], linked }))).toEqual([s.ok]);
    });

    it('a `not_me` answer given BEFORE the cut still excludes (Q1 A — the mark counts whatever they answer)', async () => {
      const s = await scene();
      await nomineeLink(s.w.p, s.dead, s.v1, s.nominee, { answer: 'not_me', respondedAt: before(100) });
      await fileClaim(s.w.p, s.dead);
      expect(await linkedAsOf(s.w.p, s.dead)).toEqual([s.nominee]);
      expect(ids(await snapshot(s.w.p, s.dead, { linked: await linkedAsOf(s.w.p, s.dead) }))).toEqual([s.ok]);
    });

    it('a link on a version RECORDED AFTER the cut is ⛔ excluded (V15 — the version decides)', async () => {
      const s = await scene(before(-0.05));
      await nomineeLink(s.w.p, s.dead, s.v1, s.nominee, { askedAt: before(-0.05) });
      await fileClaim(s.w.p, s.dead);
      expect(await linkedAsOf(s.w.p, s.dead)).toEqual([]);
      expect(ids(await snapshot(s.w.p, s.dead, { linked: await linkedAsOf(s.w.p, s.dead) }))).toEqual(sorted(s.ok, s.nominee));
    });

    it('a link ENDED before the cut is ⛔ excluded — FORGED: an `erased` row ended before the cut while the nominee stays `active` (a real erasure anonymises one party, which the predicate already excludes)', async () => {
      const s = await scene();
      await nomineeLink(s.w.p, s.dead, s.v1, s.nominee, { end: { at: before(5), reason: 'erased' } });
      await fileClaim(s.w.p, s.dead);
      expect(await linkedAsOf(s.w.p, s.dead)).toEqual([]);
      // ended ON or after the cut — it still stood at the cut, so it counts
      const t = await scene();
      await nomineeLink(t.w.p, t.dead, t.v1, t.nominee, { end: { at: before(-0.05), reason: 'erased' } });
      await fileClaim(t.w.p, t.dead);
      expect(await linkedAsOf(t.w.p, t.dead)).toEqual([t.nominee]);
    });

    it('a link on a version ⛔ projected at the cut (re-declared WITHOUT the mark) is ⛔ excluded; a CARRIED link on the projected version is', async () => {
      const s = await scene(before(300));
      await nomineeLink(s.w.p, s.dead, s.v1, s.nominee, { askedAt: before(300), end: { at: before(200), reason: 'removed_by_declarer' } });
      await nomineeVersion(s.w.p, s.dead, before(200), 1, 2);
      await fileClaim(s.w.p, s.dead);
      expect(await linkedAsOf(s.w.p, s.dead)).toEqual([]);

      const t = await scene(before(300));
      const kept = await nomineeLink(t.w.p, t.dead, t.v1, t.nominee, { askedAt: before(300), end: { at: before(200), reason: 'redeclared' } });
      const v2 = await nomineeVersion(t.w.p, t.dead, before(200), 1, 2);
      await nomineeLink(t.w.p, t.dead, v2, t.nominee, { askedAt: before(300), carriedFrom: kept });
      await fileClaim(t.w.p, t.dead);
      expect(await linkedAsOf(t.w.p, t.dead)).toEqual([t.nominee]);
      expect(ids(await snapshot(t.w.p, t.dead, { linked: await linkedAsOf(t.w.p, t.dead) }))).toEqual([t.ok]);
    });

    it('the staff line (AC7, Q1 A): an ANSWER inside the window does ⛔ set it; a linked re-save inside it does', async () => {
      const s = await scene(before(100));
      await nomineeLink(s.w.p, s.dead, s.v1, s.nominee, { askedAt: before(100), answer: 'confirmed', respondedAt: before(10) });
      await fileClaim(s.w.p, s.dead);
      expect((await snapshot(s.w.p, s.dead)).recentChangeBeforeFiling).toBe(false);

      const t = await scene(before(100));
      const old = await nomineeLink(t.w.p, t.dead, t.v1, t.nominee, { askedAt: before(100), end: { at: before(10), reason: 'redeclared' } });
      const v2 = await nomineeVersion(t.w.p, t.dead, before(10), 1, 2);
      await nomineeLink(t.w.p, t.dead, v2, t.nominee, { askedAt: before(100), carriedFrom: old });
      await fileClaim(t.w.p, t.dead);
      expect((await snapshot(t.w.p, t.dead)).recentChangeBeforeFiling).toBe(true);
    });
  });

  describe('Story 6.36d — the staff line covers nominee changes (ND7; `-384` Q2 A; AC7)', () => {
    async function deceasedWithOldPosting() {
      const w = await world();
      const dead = await member(w.p);
      await post(w.p, dead, { workplace: w.A, at: before(900) });
      return { w, dead };
    }

    it('M16 — a nominee version recorded 10 days before the cut sets the line; 100 days before, or on the filing day, does ⛔', async () => {
      const inside = await deceasedWithOldPosting();
      await nomineeVersion(inside.w.p, inside.dead, before(10));
      await fileClaim(inside.w.p, inside.dead);
      expect((await snapshot(inside.w.p, inside.dead)).recentChangeBeforeFiling).toBe(true);

      const old = await deceasedWithOldPosting();
      await nomineeVersion(old.w.p, old.dead, before(100));
      await fileClaim(old.w.p, old.dead);
      expect((await snapshot(old.w.p, old.dead)).recentChangeBeforeFiling).toBe(false);

      const filingDay = await deceasedWithOldPosting();
      await nomineeVersion(filingDay.w.p, filingDay.dead, before(-0.05));
      await fileClaim(filingDay.w.p, filingDay.dead);
      expect((await snapshot(filingDay.w.p, filingDay.dead)).recentChangeBeforeFiling).toBe(false);
    });

    it('exactly 90 days before the cut is INSIDE the window', async () => {
      const { w, dead } = await deceasedWithOldPosting();
      await nomineeVersion(w.p, dead, before(90));
      await fileClaim(w.p, dead);
      expect((await snapshot(w.p, dead)).recentChangeBeforeFiling).toBe(true);
    });
  });

  describe('the anchor — RF1 C (`2026-10-16-339`): the death\'s FIRST filing, unless an innocence finding lifts a claim', () => {
    /** An innocence finding (`-238`) on `claimCaseId`, as the superuser (its producer, row 6-22, is unbuilt). */
    async function foundInnocent(p: string, claimCaseId: string): Promise<void> {
      const { client } = getTx();
      await client.query(
        `INSERT INTO claim_nominee_findings (finding_id, claim_case_id, pariwar_id, kind, recorded_by_actor_id, recorded_by_display)
         VALUES (gen_random_uuid(), $1, $2, 'member_found_innocent', 'seed', 'Seed Investigator')`,
        [claimCaseId, p],
      );
    }
    const anchor = async (p: string, dead: MemberId, claimCaseId: string, claimCreatedAt = FILED_AT) => {
      const { tx } = getTx();
      return resolvePeerMeshFilingCut(tx, { pariwarId: toPariwarId(p), deceasedMemberId: dead, claimCaseId: toClaimId(claimCaseId), claimCreatedAt });
    };
    const EARLIER = new Date('2026-03-01T06:00:00.000Z'); // 2026-03-01 IST
    const EARLIEST = new Date('2025-06-01T06:00:00.000Z'); // 2025-06-01 IST

    it('ONE claim ⇒ its own filing day, and it is the anchor claim', async () => {
      const w = await world();
      const dead = await member(w.p);
      const only = await fileClaim(w.p, dead);
      const a = await anchor(w.p, dead, only);
      expect(a.filingDate).toBe(FILING_DATE);
      expect(a.anchorClaimCaseId).toBe(only);
    });

    it('an earlier claim for the same death — in ANY state (refused, closed) — anchors every later one', async () => {
      for (const state of ['denied', 'closed']) {
        const w = await world();
        const dead = await member(w.p);
        const first = await fileClaim(w.p, dead, { createdAt: EARLIER, state });
        const refile = await fileClaim(w.p, dead);
        const a = await anchor(w.p, dead, refile);
        expect(a.filingDate, state).toBe('2026-03-01');
        expect(a.anchorClaimCaseId, state).toBe(first); // `-340` call 1 — the refile ranks by the first claim
      }
    });

    it('two claims filed at the SAME instant: the anchor is the lower claim id (deterministic)', async () => {
      const w = await world();
      const dead = await member(w.p);
      // inserted FIRST with the HIGHER id, so heap order and the tie-break disagree — only `ORDER BY …, claim_case_id` picks y
      await fileClaim(w.p, dead, { createdAt: EARLIER, state: 'denied', id: 'ffffffff-ffff-4fff-bfff-ffffffffffff' });
      const y = await fileClaim(w.p, dead, { createdAt: EARLIER, state: 'closed', id: '00000000-0000-4000-8000-000000000001' });
      const refile = await fileClaim(w.p, dead);
      expect((await anchor(w.p, dead, refile)).anchorClaimCaseId).toBe(y);
    });

    it('an innocence finding lifts THAT claim: the next filing counts (and with every earlier one lifted, the claim\'s own)', async () => {
      const w = await world();
      const dead = await member(w.p);
      const falseReport = await fileClaim(w.p, dead, { createdAt: EARLIEST, state: 'denied' });
      await foundInnocent(w.p, falseReport);
      const second = await fileClaim(w.p, dead, { createdAt: EARLIER, state: 'closed' });
      const third = await fileClaim(w.p, dead);
      let a = await anchor(w.p, dead, third);
      expect(a.filingDate).toBe('2026-03-01');
      expect(a.anchorClaimCaseId).toBe(second);
      await foundInnocent(w.p, second);
      a = await anchor(w.p, dead, third);
      expect(a.filingDate).toBe(FILING_DATE);
      expect(a.anchorClaimCaseId).toBe(third);
    });

    it('the claim being selected for is ITSELF lifted (every claim lifted — defensive): its own filing and its own id', async () => {
      const w = await world();
      const dead = await member(w.p);
      const only = await fileClaim(w.p, dead);
      await foundInnocent(w.p, only);
      const a = await anchor(w.p, dead, only);
      expect(a.filingDate).toBe(FILING_DATE);
      expect(a.anchorClaimCaseId).toBe(only);
    });

    it('a `nominee_disqualified` finding ⛔ lifts a claim; another member\'s or another Pariwar\'s claims ⛔ count', async () => {
      const { client } = getTx();
      const w = await world();
      const dead = await member(w.p);
      const earlier = await fileClaim(w.p, dead, { createdAt: EARLIER, state: 'denied' });
      await client.query(
        `INSERT INTO claim_nominee_findings (finding_id, claim_case_id, pariwar_id, kind, rank, recorded_by_actor_id, recorded_by_display)
         VALUES (gen_random_uuid(), $1, $2, 'nominee_disqualified', 1, 'seed', 'Seed Investigator')`,
        [earlier, w.p],
      );
      const now = await fileClaim(w.p, dead);
      expect((await anchor(w.p, dead, now)).filingDate).toBe('2026-03-01');

      const w2 = await world();
      const dead2 = await member(w2.p);
      await fileClaim(w2.p, await member(w2.p), { createdAt: EARLIEST }); // another member's death
      await fileClaim(w.p, dead2, { createdAt: EARLIEST }); // the same member id filed under ANOTHER Pariwar (a stray row)
      const own = await fileClaim(w2.p, dead2);
      const a2 = await anchor(w2.p, dead2, own);
      expect(a2.filingDate).toBe(FILING_DATE);
      expect(a2.anchorClaimCaseId).toBe(own);
    });

    it('the snapshot moves with the anchor: a transfer recorded BETWEEN the two filings ⛔ counts', async () => {
      const w = await world();
      const dead = await member(w.p);
      await post(w.p, dead, { workplace: w.A, at: before(900) });
      await post(w.p, dead, { workplace: w.B, startedOn: daysBack(60), at: before(60) }); // after 2026-03-01, before today
      const atA = await colleague(w.p, w.A);
      await colleague(w.p, w.B);
      await fileClaim(w.p, dead, { createdAt: EARLIER, state: 'denied' });
      const refile = await fileClaim(w.p, dead);
      const cut = await anchor(w.p, dead, refile);
      const s = await snapshot(w.p, dead, { cut });
      expect(s.workplace.currentWorkplaceId).toBe(w.A);
      expect(ids(s)).toEqual([atA]);
    });
  });

  it('under twt_app (RLS on) the anchor resolves and the snapshot still sees the colleagues and the named people (the policies are Pariwar-wide)', async () => {
    const { client, tx } = getTx();
    const w = await world();
    const dead = await member(w.p);
    await post(w.p, dead, { workplace: w.A, at: before(900) });
    const c1 = await colleague(w.p, w.A);
    const n1 = await member(w.p);
    await link(w.p, dead, n1, 'accepted', { asked: 100, responded: 99 });
    // the anchor reads `claims` AND `claim_nominee_findings`: the EARLIEST claim is lifted by an innocence finding, so the
    // anchor is the next one. A lost `claims` grant throws; a lost / fail-closed `claims` policy hides both ⇒ the refile
    // anchors itself; a lost / fail-closed findings policy hides the finding ⇒ the lifted claim anchors — each assertion
    // below fails on one of them.
    const lifted = await fileClaim(w.p, dead, { createdAt: new Date('2025-06-01T06:00:00.000Z'), state: 'denied' });
    await client.query(
      `INSERT INTO claim_nominee_findings (finding_id, claim_case_id, pariwar_id, kind, recorded_by_actor_id, recorded_by_display)
       VALUES (gen_random_uuid(), $1, $2, 'member_found_innocent', 'seed', 'Seed Investigator')`,
      [lifted, w.p],
    );
    const first = await fileClaim(w.p, dead, { createdAt: new Date('2026-03-01T06:00:00.000Z'), state: 'denied' });
    const refile = await fileClaim(w.p, dead);
    // a colleague whose filing was merged (`-341`): a lost / fail-closed `intake_attempts` policy would let them be asked
    await attempt(w.p, dead, await colleague(w.p, w.A), 'converged');
    await enterAppScope(client, w.p);
    const a = await resolvePeerMeshFilingCut(tx, {
      pariwarId: toPariwarId(w.p),
      deceasedMemberId: dead,
      claimCaseId: toClaimId(refile),
      claimCreatedAt: FILED_AT,
    });
    expect(a.anchorClaimCaseId).toBe(first);
    expect(a.filingDate).toBe('2026-03-01');
    const s = await snapshot(w.p, dead);
    expect(s.candidates).toEqual([
      { memberId: c1, group: 'workplace_current', settled: true },
      { memberId: n1, group: 'named', settled: false },
    ]);
  });
});
