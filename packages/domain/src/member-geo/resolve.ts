// Member→geo attribution — Story 1.19 (Task 2; AC1, AC2, AC7).
//
// ⭐ THE CAPABILITY THIS SUPPLIES, AND THE ONE IT DOES NOT. Story 1.18's geo tree answers
// *"is Patna in Bihar"*. It can never answer *"which members are in Patna"* — audience SELECTION and
// authorization CONTAINMENT are different capabilities that merely share the word "geo". This module
// is the missing half: it reads the member's own district and LIFTS it through the tree.
//
// ── ⭐ THE RESOLUTION MATRIX — READ THIS BEFORE ASSUMING FOUR LEVELS (D5) ───────────────────────
// ⛔ NOTHING here implies a member resolves to all four levels. Each is independently typed-absent.
//
//   | level      | available when                                                                   |
//   |------------|----------------------------------------------------------------------------------|
//   | `pariwar`  | **always** — it IS `members.pariwar_id`, the tenancy key                          |
//   | `district` | the member has ≥1 `member_postings` row                                          |
//   | `state`    | ⋯ **and** the in-force tree contains that district **and** an ancestor at `state` |
//   | `block`    | ⛔ **NEVER** — a posting supplies a DISTRICT, ancestry walks UP, and `block` sits |
//   |            | BELOW district. No tree, however complete, can populate it. Only a new member     |
//   |            | ATTRIBUTE could, and that is not this story.                                     |
//
// A Pariwar publishing only districts yields no `state` and no `block`, and that is a FIRST-CLASS
// ANSWER, NOT A DEGRADED ONE. A member with NO posting row resolves to NO geo, and every consumer
// reads that as *"in no geo audience"* — ⛔ FAIL-CLOSED, never "in all".
//
// ── ⛔ NO NORMALIZATION. BYTE-IDENTICAL COMPARISON, DELIBERATELY ────────────────────────────────
// District values are compared strictly — case-SENSITIVE, untrimmed — because `geo-tree/resolver.ts`
// made exactly this commitment for exactly this reason (`:20-31`). If this module case-folded while
// the tree did not, then within ONE REQUEST `Bihar ⊇ patna` would resolve while `Patna ⊇ patna`
// would not. Pick one rule and apply it to both, or to neither. This picks "neither".
//
// ── ⚠ THE D3 DIVERGENCE FROM `getMemberPostingLatest`, STATED SO IT READS AS DELIBERATE ────────
// The repo has TWO newest-posting readers and they DISAGREE on tie-break:
//   · `member/posting.ts:117-129` `getMemberPostingLatest` — `ORDER BY created_at DESC` ONLY.
//   · `claim/peer-mesh-read.ts:83-88` — `ORDER BY created_at DESC, posting_id DESC`.
// This module adopts the PEER-MESH form (Decision `2026-08-13-103`, D3). Two rows can share
// `created_at` (same-transaction inserts, `defaultNow()` resolution), and a nondeterministic audience
// is a nondeterministic TEST. ⛔ `getMemberPostingLatest` is NOT "fixed" here — it serves Story 3.9's
// panel summary and Epic 4's retirement anchor, a different blast radius. The divergence is
// commented at BOTH sites.
//
// ── ⛔ THE TREE IS THE CALLER'S TO LOAD ─────────────────────────────────────────────────────────
// `geoTree.loadGeoTree` runs ONCE per request/job, exactly as `scope-resolution/index.ts:71` does it.
// ⛔ NEVER load the tree per member — that is the N+1 AC7 forbids, and it is the reason this function
// takes an already-loaded `tree` rather than a `Db` handle for it.

import { and, desc, eq, lte } from 'drizzle-orm';

import type { Db } from '../db.js';
import { type LoadedGeoTree, nodeKey, parseNodeKey } from '../geo-tree/resolver.js';
import type { MemberId, PariwarId } from '../ids/index.js';
import { memberPostings } from '../schema/member_postings.js';
import { geoAbsent, geoPresent, type MemberGeoNode } from './types.js';

/**
 * Read a member's CURRENT posting district as of `at` — the newest `member_postings` row by
 * `created_at DESC, posting_id DESC` (D3). Returns `null` when the member has no posting row.
 *
 * `at` bounds the read so the answer is AS-OF correct and deterministic rather than
 * "whatever the row set looks like at query time" — the injected-clock discipline
 * `banners/read.ts:6-7` already requires, and the guard against the DATE-BOMB class where a pinned
 * query instant read against a clock-defaulted seed fails on a DATE, not a diff
 * ([[project_known_livedb_test_failures]] #12).
 */
export async function getMemberCurrentDistrict(
  db: Db,
  pariwarId: PariwarId,
  memberId: MemberId,
  at: Date,
): Promise<string | null> {
  // ⭐ The ordering is done in SQL, not in TS, so this single-member read and the `state` fan-out's
  // correlated subquery resolve ties through the SAME comparator — Postgres `uuid` byte order. A TS
  // string compare over UUIDs would agree today (lowercase canonical hex sorts identically) but
  // would be a second, silently-divergent implementation of the tie-break D3 exists to fix.
  //
  // `.limit(1)` is a LITERAL, not a caller-supplied bound, so the domain-accessor-invariants gate's
  // dynamic-`.limit()` clamp does not apply ([[project_domain_limit_clamp_and_savepoint_retry]] —
  // the gate clamps every DYNAMIC limit; it does not require one to exist).
  const rows = await db
    .select({ district: memberPostings.district })
    .from(memberPostings)
    .where(
      and(
        eq(memberPostings.pariwarId, pariwarId),
        eq(memberPostings.memberId, memberId),
        lte(memberPostings.createdAt, at),
      ),
    )
    .orderBy(desc(memberPostings.createdAt), desc(memberPostings.postingId))
    .limit(1);

  return rows[0]?.district ?? null;
}

/**
 * ⭐ THE PURE HALF (AC1, AC2) — lift a district through an in-force tree into a full
 * {@link MemberGeoNode}. No DB, no clock, no I/O, so the whole absence matrix is testable DB-free.
 *
 * Every ancestor the tree cannot supply is TYPED-ABSENT with the reason that actually applies —
 * ⛔ never guessed, ⛔ never null-collapsed:
 *
 *   · `district === null`                   → `no-posting-row`   (and `state` inherits it)
 *   · `tree === null`                       → `no-tree-published`
 *   · the district is not a node in the tree → `node-not-in-tree`
 *   · the district IS a node but nothing above it sits at `state` → `no-ancestor-at-dimension`
 *   · `block`, unconditionally              → `no-member-attribute` (D5 — permanent)
 *
 * ⛔ There is deliberately NO code default geography anywhere in this system (ADR-0038): a wrong
 * tree silently GRANTS; an absent tree merely DENIES. A district whose state is unknown is
 * `no-ancestor-at-dimension` — never a lookup in some Indian-geography constant.
 */
export function liftDistrictThroughTree(
  pariwarId: PariwarId,
  district: string | null,
  tree: LoadedGeoTree | null,
): MemberGeoNode {
  // `pariwar` is ALWAYS available — it is the tenancy key, answered before any tree is consulted
  // (the same short-circuit `rbac/scope.ts:236` applies to a pariwar-dimension grant).
  const pariwar = geoPresent(pariwarId);
  // ⛔ PERMANENT (D5). Stated unconditionally so no future edit can make it look tree-dependent.
  const block = geoAbsent('no-member-attribute');

  if (district === null) {
    return { pariwar, state: geoAbsent('no-posting-row'), district: geoAbsent('no-posting-row'), block };
  }
  if (tree === null) {
    return { pariwar, state: geoAbsent('no-tree-published'), district: geoPresent(district), block };
  }

  const state = ancestorAtDimension(tree, 'district', district, 'state');
  return { pariwar, state, district: geoPresent(district), block };
}

/**
 * Walk UP from `(fromDimension, fromValue)` and return the nearest ancestor sitting at
 * `targetDimension`, as a typed level. PURE.
 *
 * ⛔ Reuses `geoTree.nodeKey` / `geoTree.parseNodeKey` rather than re-encoding the delimiter — that
 * file is the SINGLE key authority, and a second copy of the delimiter is precisely the drift Story
 * 1.18's code review removed when it unified two key functions.
 *
 * The step bound mirrors `createGeoTreeResolver`'s: a RUNTIME hang guard against a historical
 * document persisted by an older validator, not a substitute for write-time cycle rejection. Hitting
 * it fails closed, like every other uncertain path here.
 */
function ancestorAtDimension(
  tree: LoadedGeoTree,
  fromDimension: string,
  fromValue: string,
  targetDimension: string,
): MemberGeoNode['state'] {
  const startKey = nodeKey(fromDimension, fromValue);
  if (!tree.parents.has(startKey)) return geoAbsent('node-not-in-tree');

  let cursor = tree.parents.get(startKey) ?? null;
  for (let steps = 0; steps < tree.parents.size; steps += 1) {
    if (cursor == null) break; // reached a root without meeting the target dimension
    const parsed = parseNodeKey(cursor);
    if (parsed?.dimension === targetDimension) return geoPresent(parsed.value);
    cursor = tree.parents.get(cursor) ?? null;
  }
  // The district IS in the tree, but nothing above it sits at the target dimension — a
  // district-only tree is a REAL Pariwar shape, and this is its first-class answer.
  return geoAbsent('no-ancestor-at-dimension');
}

/**
 * ⭐ THE PRIMITIVE (AC1). Resolve one member's geography: their current district, lifted through the
 * caller's already-loaded in-force tree.
 *
 * ⛔ `tree` is the CALLER's to load, once (`geoTree.loadGeoTree`) — never per member. Passing `null`
 * is a first-class input meaning *"this Pariwar has published no tree"*, and yields a district-only
 * answer whose `state` is `no-tree-published`. AC2: `state` comes ONLY from the published tree, so a
 * Pariwar with no tree denies EXACTLY as it does today.
 */
export async function resolveMemberGeoNode(
  db: Db,
  pariwarId: PariwarId,
  memberId: MemberId,
  tree: LoadedGeoTree | null,
  now: Date,
): Promise<MemberGeoNode> {
  const district = await getMemberCurrentDistrict(db, pariwarId, memberId, now);
  return liftDistrictThroughTree(pariwarId, district, tree);
}

/**
 * ⭐ The AUDIENCE-SELECTION direction (AC7, D7 step 1): every district value in the tree that sits
 * BENEATH `stateValue`. PURE, computed IN MEMORY from the already-loaded tree.
 *
 * ⛔ There is nothing to join to in SQL — the tree is a JSONB DOCUMENT, not a table. The document is
 * bounded by `MAX_NODES = 5000` (`geo-tree/document.ts:29`), so a full pass is cheap and runs once
 * per dispatch, not per member.
 *
 * ⚠ Returns the EMPTY array both when the tree has no such state and when the state has no districts
 * beneath it. The caller must treat an empty set as *"no audience"* and ⛔ must NEVER fall back to
 * `members-all` — that would turn a targeting mistake into a Pariwar-wide broadcast.
 *
 * Comparison is byte-identical (see the module header): a district that differs only by case is a
 * DIFFERENT node, exactly as the tree itself would judge it.
 */
export function districtsBeneathState(tree: LoadedGeoTree | null, stateValue: string): string[] {
  if (tree === null) return [];
  const stateKey = nodeKey('state', stateValue);
  if (!tree.parents.has(stateKey)) return [];

  const districts: string[] = [];
  for (const key of tree.parents.keys()) {
    const parsed = parseNodeKey(key);
    if (parsed?.dimension !== 'district') continue;
    // Walk up from this district; it qualifies iff it reaches the state node.
    let cursor = tree.parents.get(key) ?? null;
    for (let steps = 0; steps < tree.parents.size; steps += 1) {
      if (cursor == null) break;
      if (cursor === stateKey) {
        districts.push(parsed.value);
        break;
      }
      cursor = tree.parents.get(cursor) ?? null;
    }
  }
  return districts;
}
