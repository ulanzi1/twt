// Versioned feature-flag registry — Story 10.8 (Task 2; AC1/AC3).
//
// The Story 10.1 `helpdesk_routing_policy_versions` registry applied to flags. A FLIP INSERTs a new
// version row; prior rows are NEVER mutated except the `superseded_by_version` forward-pointer. NO
// HTTP, NO auth (those live at the Task 7 admin routes); runs on the CALLER's transaction; the typed
// `FlagVersionConflictError` is the 409 seam.
//
// ── The default v1 document is CODE DATA (the DEFAULT_ROUTING_POLICY / defaultRoleBundles trick) ───
// Every registered flag has a code-constant default that owns VERSION 1. Persisted rows therefore
// start at version 2, so `(pariwar_id, flag_key, version)` is an UNAMBIGUOUS replay pin with no
// extra version-id column. This also means a flag ALWAYS resolves: a flag with no rows anywhere
// still evaluates (to its code default), so no consumer needs a "flag not found" branch.
//
// ── Three-tier precedence: per-Pariwar override ≻ global row ≻ code default ────────────────────────
// `flagVersionInForce(db, flagKey, pariwarId, at)` walks that order. The middle tier is what the
// nullable `pariwar_id` buys: a trustee can flip a flag for EVERY tenant with one global row, and
// any single Pariwar can still override it. (10.1's registry has only two tiers — its default is
// code data and there is no cross-tenant row.)
//
// ── The effective WINDOW lives here, not in the evaluator (AC2) ────────────────────────────────────
// `effective_from <= at < effective_until` is resolved by THIS lookup. `evaluateFlag` never sees a
// window and never reads a clock — the `resolveRoute` / `computeTicketSlaDueDates` time-split. Move
// the window into the evaluator and replay determinism is gone.

import { and, desc, eq, isNull, lte, or, sql } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { FeatureFlagVersionId, PariwarId, UserId } from '../ids/index.js';
import { clampLimit } from '../pagination.js';
import {
  COHORT_DIMENSIONS,
  COHORT_OPERATORS,
  FEATURE_FLAG_STATES,
  featureFlagVersions,
  type CohortDefinitionJson,
  type FeatureFlagState,
  type FeatureFlagVersionRow,
} from '../schema/feature_flag_versions.js';
import { allowlistedFlagKeys, loadCapabilityBar } from './capability-bar.js';
import {
  FlagEffectiveFromOutOfOrderError,
  FlagKeyNotAllowlistedError,
  FlagVersionConflictError,
  FlagVersionInvalidError,
} from './errors.js';
import type { FlagDocument } from './types.js';

/** The code default's version number. Persisted rows start at this + 1 (see the header). */
export const DEFAULT_FLAG_VERSION = 1;

/** A registered flag's code-constant default — the v1 document plus its lifecycle metadata. */
export interface FlagDefault {
  state: FeatureFlagState;
  cohortDefinition: CohortDefinitionJson;
  fallbackDefault: boolean;
  /** Lifecycle accountability (architecture.md:220-221 + :4094-4098) — a DESK/team, never a person. */
  owner: string;
  /** The expected-retirement signal the quarterly inventory audit reads. ISO date string. */
  deadBy: string;
  /** One-line statement of the behaviour this flag toggles — mirrors its capability-bar entry. */
  description: string;
}

/**
 * The registered flag set (AC4's "no secret flags" universe) + their v1 defaults — CODE DATA.
 *
 * ⚠ EVERY key here MUST have a matching `allow` entry in `governance_boundary.yaml`; the Task 4 gate
 * leg (a) asserts that both ways, so adding a key here without admitting it to the capability bar
 * FAILS CI. That is the mechanism behind "the bar cannot be silently expanded" (AC6).
 *
 * ⚠ Every default is `state: 'off'` with `fallbackDefault` set to the behaviour that is correct when
 * the flag subsystem tells you nothing. A flag's arrival must never itself change behaviour — the
 * flip is the event, not the deploy.
 *
 * Seeded per Decision 9: only behaviours with a named owner and a real consumer. Note the epic's
 * third example, "beta UX patterns", is DELIBERATELY ABSENT — it appears exactly once in the whole
 * corpus with no FR/AR/UX-spec backing, and an allowlist entry for an undefined behaviour cannot be
 * gate-checked; admitting it would normalise the silent expansion this story exists to prevent.
 */
export const FLAG_DEFAULTS: Readonly<Record<string, FlagDefault>> = {
  // FR-2 — the DigiLocker hard-mandatory cutover. THE canonical use case, wired end-to-end in Task 9.
  // fallbackDefault TRUE = the manual fallback stays AVAILABLE when the flag says nothing: the
  // hard-mandatory cutover must be an explicit, audited, per-cohort act, never a silent default.
  kyc_manual_fallback: {
    state: 'off',
    cohortDefinition: { clauses: [] },
    fallbackDefault: true,
    owner: 'kyc-desk',
    // The FR-2 cutover is a near-term Epic 10 priority — a shorter horizon than the other three
    // flags below, reviewed at year-end regardless of cutover status. Each flag's date reflects its
    // own retirement expectation deliberately, not a shared placeholder.
    deadBy: '2026-12-31',
    description:
      'When enabled for a cohort, DigiLocker KYC becomes hard-mandatory: the manual-fallback CTA is hidden (FR-2).',
  },
  // AR-43 — alternative KYC provider selection. Seam declared; the provider registry reads it.
  kyc_provider_selection: {
    state: 'off',
    cohortDefinition: { clauses: [] },
    fallbackDefault: false,
    owner: 'kyc-desk',
    // No forcing deadline (this is standing infrastructure, not a one-shot cutover) — a six-month
    // standing-review horizon.
    deadBy: '2027-06-30',
    description:
      'When enabled for a cohort, KYC provider selection is taken from the flag rather than the static config default (AR-43).',
  },
  // AR-18 — WhatsApp cost-optimization toggle. Recorded-but-UNWIRED (Decision 8): its consumer also
  // needs a per-Pariwar admin form (architecture.md:2082-2095), which is its own surface/story.
  wa_cost_optimization: {
    state: 'off',
    cohortDefinition: { clauses: [] },
    fallbackDefault: false,
    owner: 'channels-desk',
    // Review at Q1 close whether the per-Pariwar admin surface story has landed; if not, re-set.
    deadBy: '2027-03-31',
    description:
      'When enabled for a cohort, WhatsApp cost-optimization routing is active (AR-18). NOT WIRED in Story 10.8 — the consumer still returns its fail-safe default.',
  },
  // FR-73 — Telegram mirror. Recorded-but-UNWIRED (Decision 8).
  telegram_mirror: {
    state: 'off',
    cohortDefinition: { clauses: [] },
    fallbackDefault: false,
    owner: 'channels-desk',
    // Same unwired-seam review posture as wa_cost_optimization, offset a month so the two unwired
    // seams get independent reviews rather than being re-triaged as a pair by coincidence of date.
    deadBy: '2027-04-30',
    description:
      'When enabled for a cohort, notifications are mirrored to Telegram (FR-73). NOT WIRED in Story 10.8 — the consumer still returns its fail-safe default.',
  },
};

/** Every registered flag key. The inventory universe AC4's no-secret-flags property is asserted over. */
export const FLAG_KEYS: readonly string[] = Object.freeze(Object.keys(FLAG_DEFAULTS).sort());

/** True iff `flagKey` is a registered flag. */
export function isRegisteredFlag(flagKey: string): boolean {
  return Object.prototype.hasOwnProperty.call(FLAG_DEFAULTS, flagKey);
}

/**
 * A fresh COPY of a flag's code-default document (never the shared module constant), so a caller
 * that mutates it before persisting — an admin cloning-then-editing the default — cannot corrupt
 * the seed. The `defaultRoutingPolicy()` / `seedRoles()` return-a-copy discipline. Returns `null`
 * for an unregistered key.
 */
export function defaultFlagDocument(flagKey: string): FlagDocument | null {
  const def = FLAG_DEFAULTS[flagKey];
  if (!def) return null;
  return {
    flagKey,
    pariwarId: null,
    version: DEFAULT_FLAG_VERSION,
    state: def.state,
    // Deep-copied: clauses hold a `values` ARRAY, so a one-level `{...c}` would still share it.
    cohortDefinition: { clauses: def.cohortDefinition.clauses.map((c) => ({ ...c, values: [...c.values] })) },
    fallbackDefault: def.fallbackDefault,
  };
}

/** The resolved in-force flag — the document + where it came from (the inventory's provenance column). */
export interface FlagInForce {
  document: FlagDocument;
  /** `'override'` = this Pariwar's row, `'global'` = the cross-tenant row, `'default'` = code data. */
  source: 'override' | 'global' | 'default';
  /** The row's effective window (null for the code default, which is always in force). */
  effectiveFrom: Date | null;
  effectiveUntil: Date | null;
  /** Lifecycle + attribution surfaced for the AC4 inventory (null on the code-default tier). */
  owner: string;
  deadBy: string | null;
  rationale: string | null;
  actorWhoFlipped: string | null;
}

/** The single-row lookup bound — a fixed, non-caller-supplied limit, still routed through
 *  `clampLimit` because the domain-accessor-invariants gate reads a bare/named `.limit()` as
 *  unclamped regardless of its provenance (the exact Story 10.7 miss). */
const FLAG_LOOKUP_LIMIT = 1;

/**
 * Resolve the flag version IN FORCE for `(flagKey, pariwarId)` at instant `at` (AC1).
 *
 * Precedence: this Pariwar's latest in-window override ≻ the latest in-window GLOBAL row ≻ the code
 * default. "In window" = `effective_from <= at` AND (`effective_until` IS NULL OR `effective_until`
 * > at) — a half-open interval, so a version whose `effective_until` equals `at` has already ended
 * (no instant is ever covered by two consecutive versions).
 *
 * Runs on the caller's (scoped) transaction. Under RLS a tenant sees its own overrides plus the
 * global rows — which is exactly the two tiers this function needs, and precisely why the SELECT
 * policy carries its `OR pariwar_id IS NULL` leg.
 *
 * Returns `null` only for an UNREGISTERED flag key; a registered flag always resolves.
 */
export async function flagVersionInForce(
  db: Db,
  flagKey: string,
  pariwarId: PariwarId | null,
  at: Date,
): Promise<FlagInForce | null> {
  const def = FLAG_DEFAULTS[flagKey];
  if (!def) return null;

  const inWindow = and(
    eq(featureFlagVersions.flagKey, flagKey),
    lte(featureFlagVersions.effectiveFrom, at),
    or(
      isNull(featureFlagVersions.effectiveUntil),
      sql`${featureFlagVersions.effectiveUntil} > ${at}`,
    ),
  );

  const toInForce = (row: FeatureFlagVersionRow, source: 'override' | 'global'): FlagInForce => ({
    document: {
      flagKey: row.flagKey,
      pariwarId: row.pariwarId,
      version: row.version,
      state: row.state,
      cohortDefinition: row.cohortDefinition,
      fallbackDefault: row.fallbackDefault,
    },
    source,
    effectiveFrom: row.effectiveFrom,
    effectiveUntil: row.effectiveUntil,
    owner: row.owner,
    deadBy: row.deadBy.toISOString().slice(0, 10),
    rationale: row.rationale,
    actorWhoFlipped: row.actorWhoFlipped,
  });

  // Tier 1 — this Pariwar's own override.
  if (pariwarId !== null) {
    const overrideRows = await db
      .select()
      .from(featureFlagVersions)
      .where(and(inWindow, eq(featureFlagVersions.pariwarId, pariwarId)))
      .orderBy(desc(featureFlagVersions.effectiveFrom), desc(featureFlagVersions.version))
      .limit(clampLimit(FLAG_LOOKUP_LIMIT, { default: FLAG_LOOKUP_LIMIT, cap: FLAG_LOOKUP_LIMIT }));
    const row = overrideRows[0];
    if (row) return toInForce(row, 'override');
  }

  // Tier 2 — the cross-tenant GLOBAL row.
  const globalRows = await db
    .select()
    .from(featureFlagVersions)
    .where(and(inWindow, isNull(featureFlagVersions.pariwarId)))
    .orderBy(desc(featureFlagVersions.effectiveFrom), desc(featureFlagVersions.version))
    .limit(clampLimit(FLAG_LOOKUP_LIMIT, { default: FLAG_LOOKUP_LIMIT, cap: FLAG_LOOKUP_LIMIT }));
  const globalRow = globalRows[0];
  if (globalRow) return toInForce(globalRow, 'global');

  // Tier 3 — the code default. A registered flag ALWAYS resolves.
  return {
    document: defaultFlagDocument(flagKey)!,
    source: 'default',
    effectiveFrom: null,
    effectiveUntil: null,
    owner: def.owner,
    deadBy: def.deadBy,
    rationale: null,
    actorWhoFlipped: null,
  };
}

/**
 * Reconstruct the exact flag document for a `(flagKey, pariwarId, version)` — the replay/audit path
 * (AC1 "historical flag states are queryable for past evaluations"). Version
 * {@link DEFAULT_FLAG_VERSION} is ALWAYS the code default; any higher version is a persisted row.
 * Returns `null` if the key is unregistered or that version does not exist for that scope.
 */
export async function flagVersionForVersion(
  db: Db,
  flagKey: string,
  pariwarId: PariwarId | null,
  version: number,
): Promise<FlagDocument | null> {
  if (!isRegisteredFlag(flagKey)) return null;
  if (version === DEFAULT_FLAG_VERSION) return defaultFlagDocument(flagKey);

  const rows = await db
    .select()
    .from(featureFlagVersions)
    .where(
      and(
        eq(featureFlagVersions.flagKey, flagKey),
        eq(featureFlagVersions.version, version),
        pariwarId === null
          ? isNull(featureFlagVersions.pariwarId)
          : eq(featureFlagVersions.pariwarId, pariwarId),
      ),
    )
    .limit(clampLimit(FLAG_LOOKUP_LIMIT, { default: FLAG_LOOKUP_LIMIT, cap: FLAG_LOOKUP_LIMIT }));

  const row = rows[0];
  if (!row) return null;
  return {
    flagKey: row.flagKey,
    pariwarId: row.pariwarId,
    version: row.version,
    state: row.state,
    cohortDefinition: row.cohortDefinition,
    fallbackDefault: row.fallbackDefault,
  };
}

export interface CreateFlagVersionInput {
  flagKey: string;
  /** NULL publishes/updates the GLOBAL row (a service-pool path — RLS blocks it under tenant scope). */
  pariwarId: PariwarId | null;
  state: FeatureFlagState;
  cohortDefinition: CohortDefinitionJson;
  fallbackDefault: boolean;
  owner: string;
  deadBy: Date;
  /** REQUIRED, bounded, non-empty — FR-58C: "flag changes audit-logged with actor + rationale". */
  rationale: string;
  /** The version's effective instant. Defaults to DB now(). */
  effectiveFrom?: Date;
  /** Optional window end; null = open-ended (superseded by the next version instead). */
  effectiveUntil?: Date | null;
  /** WHO flipped it, or null for system/seed. */
  actorWhoFlipped?: UserId | null;
  /** The audit anchor for the write (the Story 2.4 pre-generate pattern). The audit LINE itself is
   *  the CALLER's obligation (the Task 7 admin route) — the narrow-write posture. */
  auditId?: string | null;
  /** Optional caller-supplied row id (defaults to DB gen_random_uuid()). */
  id?: FeatureFlagVersionId;
}

/** Max length of the rationale — bounded so it stays a governance note, never a free-text PII sink. */
export const MAX_RATIONALE_LENGTH = 500;
/** Max length of the owner label — a desk/team name, never a person. */
const MAX_OWNER_LENGTH = 64;
/** Sanity ceiling on a cohort definition — a bounded predicate, not a rule engine. */
const MAX_COHORT_CLAUSES = 20;
const MAX_CLAUSE_VALUES = 200;

/** True iff `err` (or its wrapped cause) is a Postgres unique-violation (23505). */
function isUniqueViolation(err: unknown): boolean {
  const direct = (err as { code?: string }).code;
  const cause = (err as { cause?: { code?: string } }).cause?.code;
  return direct === '23505' || cause === '23505';
}

/**
 * Validate a caller-authored flag version BEFORE it is persisted (the `validateRoutingPolicyRules`
 * posture — a malformed document must surface to the admin who authored it, not to a member whose
 * request it silently mis-gated). Collects EVERY reason so one round-trip fixes the form.
 *
 * @throws FlagVersionInvalidError
 */
export function validateFlagVersionInput(input: CreateFlagVersionInput): void {
  const reasons: string[] = [];

  if (!isRegisteredFlag(input.flagKey)) {
    reasons.push(`flag_key '${input.flagKey}' is not a registered flag`);
  }
  if (!(FEATURE_FLAG_STATES as readonly string[]).includes(input.state)) {
    reasons.push(`state '${input.state}' is not a valid feature-flag state`);
  }
  if (input.rationale.trim().length === 0) {
    reasons.push('rationale must be non-empty (FR-58C requires actor + rationale on every flag change)');
  }
  if (input.rationale.length > MAX_RATIONALE_LENGTH) {
    reasons.push(`rationale must be at most ${String(MAX_RATIONALE_LENGTH)} characters`);
  }
  if (input.owner.trim().length === 0) {
    reasons.push('owner must be non-empty (lifecycle accountability — architecture.md:4094-4098)');
  }
  if (input.owner.length > MAX_OWNER_LENGTH) {
    reasons.push(`owner must be at most ${String(MAX_OWNER_LENGTH)} characters`);
  }

  const clauses = input.cohortDefinition.clauses;
  if (clauses.length > MAX_COHORT_CLAUSES) {
    reasons.push(`cohort_definition.clauses must have at most ${String(MAX_COHORT_CLAUSES)} clauses`);
  }
  for (const [i, clause] of clauses.entries()) {
    if (!(COHORT_DIMENSIONS as readonly string[]).includes(clause.dimension)) {
      reasons.push(`clause[${String(i)}].dimension '${clause.dimension}' is not a valid cohort dimension`);
    }
    if (!(COHORT_OPERATORS as readonly string[]).includes(clause.op)) {
      reasons.push(`clause[${String(i)}].op '${clause.op}' is not a valid cohort operator`);
    }
    if (clause.values.length === 0) {
      reasons.push(`clause[${String(i)}].values must be non-empty`);
    }
    if (clause.values.length > MAX_CLAUSE_VALUES) {
      reasons.push(`clause[${String(i)}].values must have at most ${String(MAX_CLAUSE_VALUES)} values`);
    }
    if (clause.op === 'eq' && clause.values.length !== 1) {
      reasons.push(`clause[${String(i)}].op 'eq' requires exactly one value (use 'in' for a set)`);
    }
  }

  if (input.effectiveUntil && input.effectiveFrom && input.effectiveUntil <= input.effectiveFrom) {
    reasons.push('effective_until must be strictly after effective_from');
  }

  if (reasons.length > 0) throw new FlagVersionInvalidError(reasons);
}

/**
 * Publish the next version of a flag for a scope (AC1/AC3) — the FLIP. Validates the document,
 * INSERTs a new version row (`version = max(existing, DEFAULT) + 1`, so the first persisted version
 * is 2) and points the PRIOR latest row's `superseded_by_version` forward — all in the caller's
 * transaction. NEVER mutates a prior row's document (immutability by construction; migration 0087's
 * trigger is the DB-level backstop). Serves BOTH the first-flip and every subsequent flip
 * (append-only versioning makes them identical).
 *
 * The `auditId` is a PRE-GENERATED anchor stamped on the row; writing the audit LINE is the
 * CALLER's obligation (the narrow-write posture — see Task 7's route).
 *
 * @throws FlagVersionInvalidError on a malformed document.
 * @throws FlagEffectiveFromOutOfOrderError if `effectiveFrom` precedes the scope's latest version.
 * @throws FlagVersionConflictError on a racing duplicate `(pariwar_id, flag_key, version)` (409 seam).
 */
export async function createFlagVersion(
  db: Db,
  input: CreateFlagVersionInput,
): Promise<FeatureFlagVersionRow> {
  validateFlagVersionInput(input);

  // The runtime backstop errors.ts's `FlagKeyNotAllowlistedError` documents: the CI gate
  // (scripts/governance-boundary) pins FLAG_DEFAULTS ≡ governance_boundary.yaml at BUILD time, but
  // that alone cannot stop a flag key from being added to FLAG_DEFAULTS and admitted at RUNTIME by
  // an un-reviewed deploy of a stale bar. Re-checking here, on the write path, means the bar cannot
  // be bypassed even if the gate were ever skipped or its result stale.
  if (!allowlistedFlagKeys(loadCapabilityBar()).includes(input.flagKey)) {
    throw new FlagKeyNotAllowlistedError(input.flagKey);
  }

  const scopePredicate =
    input.pariwarId === null
      ? isNull(featureFlagVersions.pariwarId)
      : eq(featureFlagVersions.pariwarId, input.pariwarId);

  // The scope's current latest version + its effectiveFrom (null → none yet). The next version
  // continues past BOTH the code default's version and any existing persisted row.
  const priorRows = await db
    .select({
      version: featureFlagVersions.version,
      effectiveFrom: featureFlagVersions.effectiveFrom,
    })
    .from(featureFlagVersions)
    .where(and(eq(featureFlagVersions.flagKey, input.flagKey), scopePredicate))
    .orderBy(desc(featureFlagVersions.version))
    .limit(clampLimit(FLAG_LOOKUP_LIMIT, { default: FLAG_LOOKUP_LIMIT, cap: FLAG_LOOKUP_LIMIT }));
  const priorRow = priorRows[0];
  const priorVersion = priorRow?.version ?? null;
  const nextVersion = Math.max(priorVersion ?? 0, DEFAULT_FLAG_VERSION) + 1;

  // DB-authoritative "now" (never the application server's clock, which is subject to skew across
  // instances) — both the default `effectiveFrom` and the reference instant for the order check.
  //
  // ⚠ `db.execute()` returns RAW driver rows, NOT drizzle-decoded ones: `now()` comes back as a
  // STRING (e.g. '2026-07-31 11:05:45.901628+00'), never a Date. Typing it `<{ now: Date }>` and
  // using it directly compiles fine and then fails at RUNTIME inside drizzle's timestamp encoder
  // (`value.toISOString is not a function`) — but ONLY on the path where the caller omits
  // `effectiveFrom`, which is why a test suite that always passes it would never catch this.
  // Coerce explicitly. (The same latent pattern exists in `helpdesk/registry.ts`'s
  // `createRoutingPolicyVersion` — recorded in deferred-work.md rather than changed here.)
  const nowResult = await db.execute<{ now: string | Date }>(sql`select now() as now`);
  const rawNow = nowResult.rows[0]?.now;
  const dbNow = rawNow instanceof Date ? rawNow : rawNow ? new Date(rawNow) : new Date();
  const effectiveFrom = input.effectiveFrom ?? dbNow;

  // Re-check effective_until against the RESOLVED effectiveFrom — `validateFlagVersionInput` only
  // catches this when the caller supplies BOTH fields explicitly; it runs before `effectiveFrom` is
  // defaulted above, so an omitted `effectiveFrom` would otherwise let an already-inert window
  // (effective_until <= the real effective_from) through silently.
  if (input.effectiveUntil && input.effectiveUntil <= effectiveFrom) {
    throw new FlagVersionInvalidError(['effective_until must be strictly after the resolved effective_from']);
  }

  // Reject a flip whose effectiveFrom precedes the scope's latest version — keeps the creation-order
  // supersession chain consistent with window-based resolution.
  if (priorRow && effectiveFrom.getTime() < priorRow.effectiveFrom.getTime()) {
    throw new FlagEffectiveFromOutOfOrderError(input.flagKey, effectiveFrom, priorRow.effectiveFrom);
  }

  let inserted: FeatureFlagVersionRow | undefined;
  try {
    const rows = await db
      .insert(featureFlagVersions)
      .values({
        id: input.id ?? undefined,
        flagKey: input.flagKey,
        pariwarId: input.pariwarId,
        version: nextVersion,
        cohortDefinition: input.cohortDefinition,
        state: input.state,
        fallbackDefault: input.fallbackDefault,
        owner: input.owner,
        deadBy: input.deadBy,
        auditId: input.auditId ?? null,
        effectiveFrom,
        effectiveUntil: input.effectiveUntil ?? null,
        actorWhoFlipped: input.actorWhoFlipped ?? null,
        rationale: input.rationale,
      })
      .returning();
    inserted = rows[0];
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new FlagVersionConflictError(input.flagKey, input.pariwarId, nextVersion);
    }
    throw err;
  }
  if (!inserted) {
    // Under RLS a missing scope silently filters the INSERT to 0 rows — surface it rather than
    // return a phantom (the addPoolName / createRoutingPolicyVersion precedent).
    throw new Error(
      '[createFlagVersion] INSERT returned no row — check the tx has app.pariwar_id scope set (or that a global-row write is running on the service pool)',
    );
  }

  // Point the prior latest row forward (the ONLY legitimately-mutable column). A scope with no prior
  // row (its first flip, version 2) has nothing to point — the default is code data, not a row.
  if (priorVersion !== null) {
    await db
      .update(featureFlagVersions)
      .set({ supersededByVersion: nextVersion })
      .where(
        and(
          eq(featureFlagVersions.flagKey, input.flagKey),
          scopePredicate,
          eq(featureFlagVersions.version, priorVersion),
        ),
      );
  }

  return inserted;
}
