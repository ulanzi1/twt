// Pool naming service — Story 7.2 (Tasks 1/2/3/4; AC1–AC4).
//
// The pool's DUAL IDENTITY, in one place:
//   · the CANONICAL identifier `P-YYYY-MM-###` — the source of truth, used by audit,
//     system queries, regulator exports, and error messages (never a member surface);
//   · the member-facing DISPLAY shortform — a letter code derived from `pool_index`
//     (A, B, … Z, AA, AB …), optionally overlaid by a per-Pariwar curated name.
// [Source: PRD §11 + ux-design-specification.md §11 Pool Identifier Rule + epics 7.2]
//
// ── Stable mapping: identity is fixed at spawn and NEVER remapped mid-cycle ────
// Both halves are deterministic functions of values frozen at spawn: the canonical
// identifier is allocated once and persisted (`pools.pool_canonical_identifier`,
// Story 7.1); the letter code is a pure function of `pools.pool_index`, which never
// changes for a pool's life. Nothing here reads the clock or any mutable state, so a
// pool's display + audit identity are replay-reproducible forever. A member who learns
// "I am in Pool F" this cycle sees Pool F for that pool's whole life. Renaming or
// re-indexing a live pool is therefore NOT a supported operation — it would break the
// member's mental anchor AND the audit trail's identifier stability.
//
// ── Presentation-only: the letter code stores NOTHING ─────────────────────────
// The letter code is derived on read. It is deliberately NOT a column and NOT an event
// payload field — the frozen `pool.spawned` payload (Story 7.1) carries only
// `pool_canonical_identifier`, and 7.2 does not touch it. A stored letter code could
// drift from `pool_index`; a derived one structurally cannot.
//
// ── Category-agnostic (AC4) ───────────────────────────────────────────────────
// Nothing here branches on a pool's support category. Naming is identical for every
// category the enum carries now or later — which is exactly why the v2 `_daan` families
// need no change to this file. The pool-support-category-invariant gate scans this file
// (its SCAN_DIRS walks `packages/domain/src/pool` recursively).
//
// ── Split: PURE formatting/derivation here; the transactional allocator below ──
// The pure half (letter code, formatter, resolver) is DB-free and unit-tested directly.
// The IO half (`allocateCanonicalIdentifierRange`) runs on the CALLER's transaction —
// the pool/project.ts + validity-cache/epoch.ts discipline: never open your own
// transaction, the caller owns the boundary.

import { sql } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { PariwarId } from '../ids/index.js';
import { poolCanonicalCounters } from '../schema/pool_canonical_counters.js';

// ── Letter code (AC2) ─────────────────────────────────────────────────────────

/** Thrown when `poolLetterCode` is handed something that is not a 0-based index.
 *  Typed + explicit — never silently coerce, a coerced index would mislabel a pool. */
export class PoolLetterCodeRangeError extends Error {
  public readonly name = 'PoolLetterCodeRangeError';
  public constructor(public readonly received: number) {
    super(`pool index must be a non-negative integer, received ${String(received)}`);
  }
}

/** Thrown when `poolIndexFromLetterCode` is handed a string that is not a run of `A`-`Z`. */
export class PoolLetterCodeDecodeError extends Error {
  public readonly name = 'PoolLetterCodeDecodeError';
  public constructor(public readonly received: string) {
    super(`letter code must be one or more of A-Z, received ${JSON.stringify(received)}`);
  }
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * The member-facing shortform for a pool: a BIJECTIVE base-26 ("spreadsheet column")
 * encoding of the 0-based `pool_index`.
 *
 *   0 → A   25 → Z   26 → AA   27 → AB   51 → AZ   52 → BA   701 → ZZ   702 → AAA
 *
 * ⚠ The N > 26 trap (epic AC + adversarial review): the obvious
 * `String.fromCharCode(65 + poolIndex)` passes every test up to 25 and then silently
 * emits `[`, `\`, `]` — TSCT's real-world A–T list topped out at 20 pools and never hit
 * it. Bijective base-26 has no "zero digit" (there is no column between Z and AA), hence
 * the `n -= 1` before each digit — a plain base-26 conversion would emit `@A` at 26.
 *
 * Pure + total + deterministic: no clock, no IO, no module state.
 */
export function poolLetterCode(poolIndex: number): string {
  if (!Number.isInteger(poolIndex) || poolIndex < 0) {
    throw new PoolLetterCodeRangeError(poolIndex);
  }
  let n = poolIndex + 1; // shift to the 1-based numbering bijective base-26 needs
  let code = '';
  while (n > 0) {
    n -= 1; // no zero digit: borrow before every digit
    code = LETTERS[n % 26]! + code;
    n = Math.floor(n / 26);
  }
  return code;
}

/**
 * The inverse of {@link poolLetterCode} — a member-facing letter code back to its 0-based
 * `pool_index`. Bijective base-26, so every non-empty run of `A`–`Z` decodes to exactly one index.
 *
 *   A → 0   Z → 25   AA → 26   AB → 27   AZ → 51   BA → 52   ZZ → 701   AAA → 702
 *
 * Case-insensitive by convention at call sites (Sahyog Drive search, AC3/D2(a)) — this function
 * itself expects upper-case and leaves normalization to the caller.
 */
export function poolIndexFromLetterCode(code: string): number {
  if (!/^[A-Z]+$/.test(code)) {
    throw new PoolLetterCodeDecodeError(code);
  }
  let n = 0;
  for (let i = 0; i < code.length; i += 1) {
    n = n * 26 + (code.charCodeAt(i) - 64); // 'A' → 1, ..., 'Z' → 26
  }
  return n - 1; // shift back to 0-based
}

// ── Canonical identifier: the pure formatter (AC1) ────────────────────────────

/** Thrown when the canonical-identifier inputs or format string are out of contract. */
export class PoolCanonicalIdentifierFormatError extends Error {
  public readonly name = 'PoolCanonicalIdentifierFormatError';
  public constructor(detail: string) {
    super(`pool canonical identifier format error: ${detail}`);
  }
}

/**
 * The default canonical-identifier grammar. Format is PER-PARIWAR CONFIGURABLE (UX §11);
 * v1 implements only this default and TWT-Bihar passes it. It is threaded as a PARAMETER
 * rather than hardcoded at the three call sites so a future tenant overrides it with no
 * engine change (the multi-tenant theme-layer discipline).
 */
export const DEFAULT_POOL_CANONICAL_IDENTIFIER_FORMAT = 'P-YYYY-MM-###';

/** The freeze-month + sequence a canonical identifier is built from. */
export interface PoolCanonicalIdentifierParts {
  /** The cycle-freeze YEAR (4-digit). Supplied by the caller — this service never reads
   *  the clock (determinism / replay). */
  year: number;
  /** The cycle-freeze MONTH, 1-based (1 = January). */
  month: number;
  /** The per-(pariwar, YYYY-MM) monotonic sequence; 1 = the first pool that month. */
  sequence: number;
}

/**
 * `format` must contain each of `YYYY`, `MM`, `###` EXACTLY ONCE. A repeated token (e.g. a
 * typo'd override with two `YYYY`s) would otherwise pass a bare `.includes()` check and
 * then only get its FIRST occurrence substituted (`replaceAll` fills every occurrence with
 * the SAME value, which is not what a repeated token in a grammar string means) — better to
 * reject the format outright than emit an identifier with a literal leftover token in it.
 * Called BEFORE any DB write that the format's caller triggers (see
 * `allocateCanonicalIdentifierRange`), so a bad override never burns a sequence.
 */
function assertValidCanonicalIdentifierFormat(format: string): void {
  for (const token of ['YYYY', 'MM', '###'] as const) {
    const occurrences = format.split(token).length - 1;
    if (occurrences !== 1) {
      throw new PoolCanonicalIdentifierFormatError(
        `format '${format}' must contain the '${token}' token exactly once, found ${String(occurrences)}`,
      );
    }
  }
}

/**
 * Render `P-YYYY-MM-###` (or a per-Pariwar override) from its parts. The ONE place the
 * grammar exists.
 *
 * `###` is a MINIMUM width, not a ceiling: sequence 1000 renders `1000`, never `000` or a
 * truncation. A Pariwar spawning > 999 pools in a month is implausible today, but a
 * silently-wrapped identifier would collide on the 7.1 unique index and corrupt audit.
 *
 * Latin numerals throughout (Story 1.17: operational identifiers are Latin, never
 * Devanagari — this is a machine key, not member-facing copy).
 */
export function formatPoolCanonicalIdentifier(
  parts: PoolCanonicalIdentifierParts,
  format: string = DEFAULT_POOL_CANONICAL_IDENTIFIER_FORMAT,
): string {
  const { year, month, sequence } = parts;
  if (!Number.isInteger(year) || year < 0) {
    throw new PoolCanonicalIdentifierFormatError(`year must be a non-negative integer, got ${String(year)}`);
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new PoolCanonicalIdentifierFormatError(`month must be an integer 1-12, got ${String(month)}`);
  }
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new PoolCanonicalIdentifierFormatError(
      `sequence must be a positive integer (1 = first pool of the month), got ${String(sequence)}`,
    );
  }
  assertValidCanonicalIdentifierFormat(format);
  return format
    .replace('YYYY', String(year).padStart(4, '0'))
    .replace('MM', String(month).padStart(2, '0'))
    .replace('###', String(sequence).padStart(3, '0'));
}

// ── The dual-representation resolver (AC3) ────────────────────────────────────

/** The identity fields the resolver needs — structurally satisfied by a `PoolRow`
 *  (Story 7.1), so callers pass the row itself. Narrow on purpose: the resolver must not
 *  be able to branch on lifecycle state, category, or amount. */
export interface PoolIdentityFields {
  poolIndex: number;
  poolCanonicalIdentifier: string;
}

export interface ResolvePoolDisplayOptions {
  /**
   * The curated per-Pariwar name for THIS pool, when the Pariwar has populated its
   * `pool_names` registry (see `reserveNames`). Omitted/blank → the letter code.
   *
   * ⚠ TWT-Bihar launch configuration: its registry is EMPTY BY DESIGN (the UX amendment
   * vetoed the culture-name overlay), so this is always absent and every pool displays
   * its letter code. That fallback is a COMMITTED, TESTED launch behavior (AC3/AC5) —
   * not an incidental default. See tests/pool/naming.test.ts + the live-DB spec.
   */
  pariwarCultureName?: string | undefined;
}

/**
 * The MEMBER-facing display shortform for a pool. Letter code by default; a curated
 * registry name when the Pariwar supplies one.
 *
 * Never returns blank/null, and never returns the canonical identifier: a member surface
 * showing `P-2026-05-001` would leak the audit key into the one place UX §11 reserves for
 * the simple shortform. A whitespace-only curated name is treated as absent (a trustee
 * typo must degrade to the letter code, not to an invisible pool label).
 */
export function resolvePoolDisplay(pool: PoolIdentityFields, opts: ResolvePoolDisplayOptions = {}): string {
  const curated = opts.pariwarCultureName?.trim();
  if (curated !== undefined && curated !== '') return curated;
  return poolLetterCode(pool.poolIndex);
}

/**
 * The AUDIT/system/regulator/error identifier for a pool — always the canonical
 * `P-YYYY-MM-###`, never the shortform. Letter codes are per-cycle and repeat across
 * cycles (every cycle has a Pool A); only the canonical identifier is globally
 * unambiguous, which is what an audit trail or a regulator export needs.
 */
export function poolAuditIdentifier(pool: PoolIdentityFields): string {
  return pool.poolCanonicalIdentifier;
}

// ── The transactional allocator (AC1) ─────────────────────────────────────────

/** Thrown when the allocated identifier collides with an existing row on the Story 7.1
 *  unique index `pools_pariwar_canonical_identifier_uq`. The counter table makes this
 *  unreachable under normal operation; it is the structural backstop, surfaced typed so
 *  the Story 7.3 spawn saga can retry rather than crash on an opaque `23505`. */
export class PoolCanonicalIdentifierCollisionError extends Error {
  public readonly name = 'PoolCanonicalIdentifierCollisionError';
  public constructor(
    public readonly pariwarId: string,
    public readonly identifier: string,
  ) {
    super(`pool canonical identifier '${identifier}' already exists for pariwar ${pariwarId}`);
  }
}

/** The unique index the 7.1 schema declares — the allocator's correctness backstop.
 *  Keep IN SYNC with schema/pools.ts. */
export const POOL_CANONICAL_IDENTIFIER_CONSTRAINT = 'pools_pariwar_canonical_identifier_uq';

/** True iff `err` is the `pools_pariwar_canonical_identifier_uq` unique-violation.
 *  Reads the SQLSTATE off `err.cause` (drizzle wraps the pg error) — the
 *  [[project_domain_limit_clamp_and_savepoint_retry]] idiom, mirroring pool/errors.ts. */
export function isPoolCanonicalIdentifierConflict(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const causeRaw = (err as { cause?: unknown }).cause;
  const candidate = causeRaw !== undefined && causeRaw !== null ? causeRaw : err;
  if (typeof candidate !== 'object' || candidate === null) return false;
  const obj = candidate as { code?: unknown; constraint?: unknown };
  return obj.code === '23505' && obj.constraint === POOL_CANONICAL_IDENTIFIER_CONSTRAINT;
}

/** The most identifiers one allocation call may reserve — mirrors `reserveNames`'
 *  `MAX_POOL_NAME_RESERVATION` cap for the same "how many pools this cycle" shape. A cycle
 *  spawns one pool per approved claim; a caller asking for more than this is a bug, not a
 *  real cycle, and an unbounded `count` would both burn an unbounded counter range and
 *  build an unbounded array synchronously. */
export const MAX_CANONICAL_IDENTIFIER_ALLOCATION = 500;

export interface AllocateCanonicalIdentifierRangeInput {
  pariwarId: PariwarId;
  /** The CYCLE-FREEZE month this range belongs to (from `cycle_freeze_commits` — the
   *  Story 7.3 handoff). Caller-supplied: the allocator never reads the clock, so a
   *  replay of the same freeze reproduces the same identifiers. */
  freezeMonth: { year: number; month: number };
  /** How many contiguous identifiers to allocate (7.3's parent job spawns N pools). Must be
   *  in `[1, MAX_CANONICAL_IDENTIFIER_ALLOCATION]`. */
  count: number;
  /** Per-Pariwar grammar override; TWT-Bihar uses the default. */
  format?: string;
}

/**
 * Allocate `count` CONTIGUOUS canonical identifiers for one (Pariwar, freeze-month), in
 * the CALLER's transaction. Returns them in sequence order — `result[i]` is the
 * identifier for the cycle's pool at index `i`.
 *
 * ── Why a counter table and not `MAX(sequence)` off `pools` ───────────────────
 * The counter is a dedicated per-(pariwar, period) row bumped with a single atomic
 * `INSERT … ON CONFLICT DO UPDATE … RETURNING`, the `cohort_invalidation_epochs`
 * precedent (AC1 names it). A concurrent allocator blocks on that row's lock until the
 * first COMMITs, then reads the bumped value — so both get DISJOINT ranges and neither
 * fails. Deriving the counter from `MAX()` over `pools` instead would: (1) not serialize
 * — `FOR UPDATE` locks only rows that already exist, so two allocators against an empty
 * month both read NULL, both pick 001, and one dies on the unique index; (2) require
 * parsing the sequence back out of a per-Pariwar-CONFIGURABLE format string, coupling the
 * counter to the grammar; and (3) recycle sequence numbers if a pool row were ever
 * removed. The unique index remains the backstop, not the mechanism.
 *
 * Runs on the caller's `tx` (Story 7.3 spawns the whole cycle in ONE transaction): if the
 * spawn rolls back, the counter bump rolls back with it — no gaps. Never opens its own
 * transaction (`db.transaction()` would commit the caller's work early —
 * [[project_domain_limit_clamp_and_savepoint_retry]]).
 *
 * @throws PoolCanonicalIdentifierFormatError on invalid `count` / freeze month / `format`.
 */
export async function allocateCanonicalIdentifierRange(
  tx: Db,
  input: AllocateCanonicalIdentifierRangeInput,
): Promise<string[]> {
  const { pariwarId, freezeMonth, count, format } = input;
  if (!Number.isInteger(count) || count < 1 || count > MAX_CANONICAL_IDENTIFIER_ALLOCATION) {
    throw new PoolCanonicalIdentifierFormatError(
      `count must be an integer in [1, ${String(MAX_CANONICAL_IDENTIFIER_ALLOCATION)}], got ${String(count)}`,
    );
  }
  // Validate the month AND the format BEFORE touching the DB, so a bad input (or a bad
  // per-Pariwar override) never bumps the counter — a caught format error must not burn
  // sequence numbers that a retry would then skip.
  const period = poolCounterPeriod(freezeMonth);
  assertValidCanonicalIdentifierFormat(format ?? DEFAULT_POOL_CANONICAL_IDENTIFIER_FORMAT);

  // Atomic bump-and-return: reserve [next_sequence, next_sequence + count) for this tx.
  const rows = await tx
    .insert(poolCanonicalCounters)
    .values({ pariwarId, period, nextSequence: 1 + count })
    .onConflictDoUpdate({
      target: [poolCanonicalCounters.pariwarId, poolCanonicalCounters.period],
      set: {
        nextSequence: sql`${poolCanonicalCounters.nextSequence} + ${count}`,
        updatedAt: sql`now()`,
      },
    })
    .returning({ nextSequence: poolCanonicalCounters.nextSequence });

  const nextSequence = rows[0]?.nextSequence;
  if (nextSequence === undefined) {
    // Under RLS a missing scope silently filters the UPSERT to 0 rows. Surface it loudly
    // rather than hand back identifiers that were never durably reserved (the
    // bumpCohortEpoch precedent).
    throw new Error(
      '[allocateCanonicalIdentifierRange] UPSERT returned no row — check the transaction has app.pariwar_id scope set',
    );
  }

  // The row now holds the NEXT free sequence; this call owns the `count` below it.
  const firstSequence = nextSequence - count;
  return Array.from({ length: count }, (_, i) =>
    formatPoolCanonicalIdentifier(
      { year: freezeMonth.year, month: freezeMonth.month, sequence: firstSequence + i },
      format,
    ),
  );
}

/**
 * The counter's partition key: `YYYY-MM` of the freeze month.
 *
 * DECIDED (story Task 2/3): the `###` sequence resets PER (pariwar, YYYY-MM) — the UX
 * reference example `P-2026-05-001` shows `001` as the first pool of that month, which is
 * only true under a monthly reset. The alternative (a continuous per-Pariwar counter) is
 * flagged in the Dev Agent Record for BigDev.
 */
export function poolCounterPeriod(freezeMonth: { year: number; month: number }): string {
  const { year, month } = freezeMonth;
  if (!Number.isInteger(year) || year < 0) {
    throw new PoolCanonicalIdentifierFormatError(`year must be a non-negative integer, got ${String(year)}`);
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new PoolCanonicalIdentifierFormatError(`month must be an integer 1-12, got ${String(month)}`);
  }
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`;
}
