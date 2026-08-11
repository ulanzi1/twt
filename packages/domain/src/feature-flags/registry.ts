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

import { and, desc, eq, isNull, lte, sql } from 'drizzle-orm';

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
  FlagStateTransitionError,
  FlagVersionConflictError,
  FlagVersionDuplicateIdError,
  FlagVersionInvalidError,
} from './errors.js';
import type { FlagDocument } from './types.js';

/** The code default's version number. Persisted rows start at this + 1 (see the header). */
export const DEFAULT_FLAG_VERSION = 1;

/**
 * The AC7 legal-transition map — the staged-rollout ladder, ENFORCED (Review Pass 2).
 *
 * AC7 requires the five-state set to ship "with its legal-transition map". Shipping the states
 * without the map made the staging discipline purely advisory: `off → full` in one flip skipped the
 * canary stage the whole mechanism exists to provide, `rolled_back → full` re-enabled a flag that had
 * been rolled back without re-canarying it, and `rolled_back` was accepted on a flag that had never
 * launched.
 *
 * ⚠ IDENTITY TRANSITIONS ARE LEGAL IN EVERY STATE, deliberately: re-publishing the SAME state is how
 * an operator edits a cohort (narrowing a canary is a new version at `canary`). Remove the identity
 * arms and cohort editing breaks entirely.
 *
 * Rollback is always reachable from any state that ever served — but NOT from `off`, because
 * "rolled back" must mean something happened. A `rolled_back` flag re-enters only at `off` or
 * `canary`, never straight to `rollout`/`full`: whatever caused the rollback has to re-earn its way
 * up the ladder.
 */
export const LEGAL_FLAG_STATE_TRANSITIONS: Readonly<
  Record<FeatureFlagState, readonly FeatureFlagState[]>
> = Object.freeze({
  off: Object.freeze(['off', 'canary']),
  canary: Object.freeze(['canary', 'rollout', 'rolled_back']),
  rollout: Object.freeze(['rollout', 'full', 'rolled_back']),
  full: Object.freeze(['full', 'rolled_back']),
  rolled_back: Object.freeze(['rolled_back', 'off', 'canary']),
}) as Readonly<Record<FeatureFlagState, readonly FeatureFlagState[]>>;

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
  //
  // ⚠ READ THE POLARITY CAREFULLY — it was inverted until Review Pass 2. This flag is named for the
  // CUTOVER, not for the fallback, so `fallbackDefault` answers "is the hard-mandatory cutover
  // active?" — NOT "is the manual fallback available?". The two are opposites, and conflating them is
  // exactly the mistake that shipped:
  //
  //   fallbackDefault: false  →  evaluateFlag returns enabled=false  ("cutover NOT active")
  //                           →  manual-fallback-seam.ts returns !enabled = TRUE
  //                           →  the manual fallback CTA stays AVAILABLE.   ← the safe degraded path
  //
  // With `true` the same trace ends at `!true` = false = CTA HIDDEN = KYC hard-mandatory, i.e. an
  // unevaluable cohort rule on a persisted row would LOCK MEMBERS OUT OF JOINING — the precise
  // outcome this comment, the seam's header, and the capability-bar attestation all claim is
  // impossible. `false` is what makes those three claims true.
  //
  // (The no-row path is separately safe: the seam short-circuits to `config.digilocker
  // .manualFallbackEnabled` when the resolution source is `null`/`default`, so this constant governs
  // only the malformed-rule path on a row that actually exists.)
  kyc_manual_fallback: {
    state: 'off',
    cohortDefinition: { clauses: [] },
    fallbackDefault: false,
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
  // ── Story 10.23 — the restoration-discipline imposition writer's ROLLOUT KILL SWITCH (AC14) ────
  //
  // ⛔⛔ THIS IS NOT AN ORDINARY ROLLOUT TOGGLE. READ BEFORE FLIPPING IT. ⛔⛔
  //
  // **FLIPPING THIS FLAG WITHOUT THE DISCHARGING TRUSTEE PANEL DECISION IS A GOVERNANCE VIOLATION,
  // NOT A CONFIGURATION CHANGE.**
  //
  // What it gates: whether the apps/jobs restoration-discipline job WRITES. Enabled, an automatic
  // process removes members' coverage with no human in the loop, on the §3.1 R7 ladder's verdict.
  // Disabled (the default), the job performs its read-only scan exactly as it does today and skips
  // the imposition step entirely.
  //
  // ── Why it exists, and why default-OFF is part of the ACCEPTANCE CRITERION ──────────────────────
  // Escalation 6 (Story 10.23) is an UNDISCHARGED GOVERNANCE GAP: R7(D)'s `catch_up_required` and
  // R7(E)/(F)'s `complete_all` define their restoration packages entirely in terms of paying a
  // CLOSED cycle, and no authorized catch-up process exists — contribution flows only to an OPEN
  // cycle (Story 7.6, fenced by 8.10). So enabling this puts members into a coverage-removing period
  // whose stated completion condition **no workflow in the system can satisfy**, and the
  // already-shipped disclosure copy tells them otherwise.
  //
  //   ⛔ **DISCHARGE INVARIANT (preserved verbatim, NOT reopened):** *the completion condition of
  //      every restoration package Story 10.23 imposes must be satisfiable through a ratified system
  //      workflow.*
  //
  // Decision `2026-08-07-088` clauses 4–5 moved where that invariant BINDS — from story closure
  // alone to **the flag flip**, where the harm actually begins. Merging with the flag off is
  // permitted; enabling it is not, until the property holds.
  //
  // ── ⛔ WHO MAY ENABLE IT (Decision `2026-08-07-089`) ─────────────────────────────────────────────
  // The **Trustee Panel EXCLUSIVELY**, through a formal `.decision-log.md` entry. **You do not hold
  // that authority, and neither does Operations** — they own *how* a flip is executed, never
  // *whether* it may occur. A ticket, a config-PR approval, a deployment sign-off or a verbal
  // go-ahead is **not** an authorization and does not become one retroactively. **If there is no
  // Decision entry, the flag is not authorized.** Enabling it in a non-production environment
  // confers NO authority to enable it in production.
  //
  // ⚠ `fallbackDefault: false` = "do not impose". Default-off must be the behaviour of the ABSENT
  // configuration, not a value that happens to be seeded off — so every degraded path (no version in
  // force, malformed cohort rule, lookup error) lands on "the writer does nothing".
  restoration_discipline_imposition: {
    state: 'off',
    cohortDefinition: { clauses: [] },
    fallbackDefault: false,
    owner: 'trustee-panel',
    // ⚠ NOT a retirement horizon like the flags around it. This flag retires when Escalation 6's
    // discharge invariant holds and the writer becomes unconditional — or never, if the Panel
    // prefers to keep a standing kill switch on an automatic coverage-removing process. Reviewed at
    // the Epic 10 close either way.
    deadBy: '2027-06-30',
    description:
      'When enabled for a cohort, the apps/jobs restoration-discipline job WRITES §3.1 R7 lock-in impositions, automatically removing coverage with no human in the loop (Story 10.23, FR-8). DEFAULT OFF. Enabling requires an explicit Trustee Panel decision that discharges Escalation 6 (Decision 2026-08-07-088 clauses 4-5; 2026-08-07-089) — flipping it without that decision is a GOVERNANCE VIOLATION, not a configuration change.',
  },
  // ── Story 10.19 — the TERMINATION-ACCESS block's ROLLOUT GATE (Q6 option (b), sub-choice (b-i)) ──
  //
  // ⛔⛔ THIS IS THE FIRST FLAG THAT CONDITIONS AUTHENTICATION. READ BEFORE FLIPPING IT. ⛔⛔
  //
  // **FLIPPING THIS FLAG BEFORE STORY 10.21 LANDS IS A GOVERNANCE VIOLATION, NOT A CONFIGURATION
  // CHANGE.**
  //
  // What it gates: whether a member carrying a `terminated` MODERATION OVERLAY is denied issuance of
  // a member session. Enabled, OTP verification still SUCCEEDS and the member's identity is verified
  // — what is denied is authorization to ESTABLISH A MEMBER SESSION, and a structured termination
  // response is returned instead (Decision `2026-08-10-098` clause 3). Disabled (the default), the
  // login and refresh paths behave exactly as they do today and a terminated member still signs in.
  //
  //   ⛔ **DO NOT describe this as "login fails" / "login succeeds but returns 403".** Decision
  //      `2026-08-10-098` clause 3 rules that vocabulary out: it collapses identity verification
  //      (which SUCCEEDS) with authorization to establish a session (which is DENIED). The HTTP
  //      status is a transport detail; the domain semantics are not.
  //
  // ── ⚠ WHY THE CAPABILITY-BAR ADMISSION WAS ITSELF A GOVERNANCE ACT ──────────────────────────────
  // `apps/api/src/modules/auth/` is NOT among `governance_boundary.yaml`'s prohibited roots — not
  // because it was cleared, but because no story had ever proposed a flag there. Leg (b)'s source
  // scan therefore passes on this flag, and A PASSING SCAN PROVES THE ROOT IS UNLISTED, NOT THAT THE
  // BEHAVIOUR IS ADMISSIBLE. The bar was extended into authentication BY RULING — Decision
  // `2026-08-10-097` clause 7(i), ratified-as-written by `2026-08-10-098` clause 2 — and that
  // extension is the decision, not a side effect of a green gate. Do not cite the gate as authority.
  //
  // ── ⚠ THE POLARITY, TRACED RATHER THAN ASSERTED (Decision `097` clause 7(ii)) ────────────────────
  // `fallbackDefault: false` means "DO NOT deny session issuance". Trace it: a degraded path — no
  // version in force, a malformed cohort rule, a lookup error — yields `false`, the consumer reads
  // `false` as "the block is not active", and the member RECEIVES A NORMAL SESSION.
  //
  //   ⇒ **THIS SAFEGUARD FAILS OPEN.** That is the opposite of what "fail-safe" usually means at an
  //     auth gate, and it is DELIBERATE and RATIFIED: default-OFF must be the behaviour of the ABSENT
  //     configuration (Q6 (b-i)), so a terminated member retaining access is the correct degraded
  //     outcome until the Panel authorises the flip. It is also the status quo, so no degraded path
  //     is a regression.
  //
  // ⚠ The tracing above is required, not decorative. The `kyc_manual_fallback` attestation asserted
  // the opposite of its own code through THREE review passes because a polarity was stated instead of
  // followed through to its outcome. If you edit this constant, re-trace it to the member.
  //
  // ── ⚠ NAMED FOR THE OVERLAY, NOT THE LIFECYCLE (Decision `097` clause 7(iii)) ────────────────────
  // `parseCapabilityBar` rejects any artifact whose name contains `member_lifecycle` (freeze row 2).
  // This gate reads the MODERATION OVERLAY and never `members.state`; the key is named for what it
  // reads. Renaming it toward lifecycle vocabulary would be rejected at parse time AND would be
  // factually wrong.
  //
  // ── ⛔ WHO MAY ENABLE IT (Decision `2026-08-10-097` clause 6, sub-choice (b-i)) ──────────────────
  // The **Trustee Panel EXCLUSIVELY**, through a formal `.decision-log.md` entry, and **not before
  // Story 10.21 lands** — the off-portal DPDPA route. Until it exists, enabling this leaves a
  // terminated member with NO route to their statutory rights: the Niyamavali §8.4 promise that those
  // rights are exercised "through an identity-verified administrative process" would have no process
  // behind it. ⛔ The flip is NOT gated on the identity-collision control (sub-choice (b-ii) was NOT
  // ratified) — see `deferred-work.md`: once enabled, this ends ONE ACCOUNT'S access, and a
  // terminated member who obtains a second mobile number re-registers unimpeded. The Panel ruled
  // (b-i) knowing that.
  termination_access_block: {
    state: 'off',
    cohortDefinition: { clauses: [] },
    fallbackDefault: false,
    owner: 'trustee-panel',
    // ⚠ NOT a retirement horizon. This flag retires when Story 10.21 has landed, the Panel has
    // authorised the flip, and the block becomes unconditional — or it stays as a standing kill
    // switch on the one control that ends member access. Reviewed at the Epic 10 close either way.
    deadBy: '2027-06-30',
    // ⚠ KEEP THIS UNDER 512 CHARS. It is published on the wire and `FeatureFlagInventoryResponse`
    // caps `description` at `z.string().max(512)` — an overrun fails serialization for the WHOLE
    // inventory, blanking EVERY flag on the admin console, not just this one (the `safeCohort`
    // header above records the same class of outage). The full account lives in the block above.
    description:
      'When enabled for a cohort, a member carrying a `terminated` moderation overlay is DENIED issuance of a member session on the login and refresh paths; identity verification still succeeds and a structured termination response is returned (Story 10.19, Niyamavali §8.4). DEFAULT OFF and FAILS OPEN — every degraded path yields a normal session. Enabling needs a Trustee Panel decision AND Story 10.21 landed (Decision 2026-08-10-097, b-i); flipping it earlier is a GOVERNANCE VIOLATION, not a config change.',
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
 * A registered flag's code-default STATE — the state a scope's FIRST persisted version transitions
 * FROM under {@link LEGAL_FLAG_STATE_TRANSITIONS}. Every seeded default is `off` (a flag's arrival
 * must never itself change behaviour), so in practice the first flip may only go to `off` or
 * `canary`. Falls back to `off` for an unregistered key; the caller has already rejected those.
 */
function defaultState(flagKey: string): FeatureFlagState {
  return FLAG_DEFAULTS[flagKey]?.state ?? 'off';
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
  /** The flipping admin's display name, snapshot at flip time. Null on pre-0089 rows and defaults. */
  actorDisplay: string | null;
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

  // ── HOW A VERSION IS SELECTED, AND WHY THE WINDOW IS NOT IN THE PREDICATE (Review Pass 2) ────────
  //
  // Select the NEWEST version whose `effective_from <= at` — the chain head as of `at` — and then
  // decide on THAT row's window. Deliberately NOT "the newest row still inside its window", which is
  // what this used to be, because that let a superseded version RESURRECT: v2 `{from: Jan 1, until:
  // NULL, state: 'full'}` superseded by v3 `{from: Jun 1, until: Jul 1, state: 'rolled_back'}`
  // silently reverted to `full` on Jul 1 — the pre-rollback state — because v3 dropped out of its
  // window and v2 was still technically "in window". An expired head means NOTHING PERSISTED
  // GOVERNS, not "try the previous version": whatever caused a bounded rollback must not silently
  // undo itself, and falling through to the code default is the safe answer.
  //
  // ⚠ And NOT `isNull(superseded_by_version)` either, which was the obvious-looking fix and is wrong:
  // it would break point-in-time REPLAY outright. Every historical row is superseded by definition,
  // so excluding them makes `flagVersionInForce(at = some past instant)` return the code default
  // instead of the version that actually decided — destroying AC1's "historical flag states are
  // queryable for past evaluations", which is the whole reason these rows are immutable.
  //
  // Versions are published forward in time (`effectiveFrom` may not precede the prior version's, and
  // may not be in the future), so ordering by `version` desc and by `effective_from` desc agree; the
  // chain is linear and "highest version with effective_from <= at" is unambiguous.
  const atOrBefore = and(
    eq(featureFlagVersions.flagKey, flagKey),
    lte(featureFlagVersions.effectiveFrom, at),
  );

  /** True iff this row's own window has CLOSED by `at` (half-open: `effective_until` is exclusive). */
  const windowClosed = (row: FeatureFlagVersionRow): boolean =>
    row.effectiveUntil !== null && row.effectiveUntil.getTime() <= at.getTime();

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
    actorDisplay: row.actorDisplay,
  });

  // Tier 1 — this Pariwar's own override. An override whose window has CLOSED does not fall back to
  // an older override; it falls through to the global tier, exactly as "no override" would.
  if (pariwarId !== null) {
    const overrideRows = await db
      .select()
      .from(featureFlagVersions)
      .where(and(atOrBefore, eq(featureFlagVersions.pariwarId, pariwarId)))
      .orderBy(desc(featureFlagVersions.version))
      .limit(clampLimit(FLAG_LOOKUP_LIMIT, { default: FLAG_LOOKUP_LIMIT, cap: FLAG_LOOKUP_LIMIT }));
    const row = overrideRows[0];
    if (row && !windowClosed(row)) return toInForce(row, 'override');
  }

  // Tier 2 — the cross-tenant GLOBAL row.
  const globalRows = await db
    .select()
    .from(featureFlagVersions)
    .where(and(atOrBefore, isNull(featureFlagVersions.pariwarId)))
    .orderBy(desc(featureFlagVersions.version))
    .limit(clampLimit(FLAG_LOOKUP_LIMIT, { default: FLAG_LOOKUP_LIMIT, cap: FLAG_LOOKUP_LIMIT }));
  const globalRow = globalRows[0];
  if (globalRow && !windowClosed(globalRow)) return toInForce(globalRow, 'global');

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
    actorDisplay: null,
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
  // ⚠ The short-circuit below returns the code default WITHOUT querying, so a persisted row at
  // version 1 (or 0, or negative) would make this replay path disagree with `flagVersionInForce` —
  // which filters on window and scope only and would happily return such a row as the governing one.
  // The `(pariwar_id, flag_key, version)` replay pin would then resolve to a different document than
  // the one that actually decided. Migration 0088's `CHECK (version >= 2)` makes those rows
  // impossible at the DB level; this guard keeps the function honest for anything below the default.
  if (version < DEFAULT_FLAG_VERSION) return null;
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
  /**
   * WHO flipped it. `null` means a system/seed write and must be passed EXPLICITLY.
   *
   * ⚠ REQUIRED, not optional (Review Pass 2). FR-58C is "flag changes audit-logged with actor +
   * rationale"; `rationale` was required and validated while the actor could simply be forgotten,
   * landing `actor_who_flipped = NULL` on a real admin flip — unfixable afterwards, because the 0087
   * append-only trigger makes the row immutable. Making it a required property turns that omission
   * into a COMPILE error at every call site, which is the only guard that costs nothing at runtime
   * and cannot be skipped. A deliberate system write still says so, in writing.
   */
  actorWhoFlipped: UserId | null;
  /**
   * The flipping admin's `users.display_name`, SNAPSHOT at flip time (Review Pass 3). Required and
   * explicit for the same reason as `actorWhoFlipped`: the caller must state it, including stating
   * `null` for a system/seed write. The API layer already resolves this value and already blocks the
   * flip when it is missing — it simply used to discard it, leaving the permanent record as a bare
   * UUID that stops resolving once the account is renamed or removed.
   */
  actorDisplay: string | null;
  /** The audit anchor for the write (the Story 2.4 pre-generate pattern). The audit LINE itself is
   *  the CALLER's obligation (the Task 7 admin route) — the narrow-write posture. Required for the
   *  same reason as `actorWhoFlipped`: pass `null` explicitly for a write with no audit anchor. */
  auditId: string | null;
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
 * WHICH unique constraint a 23505 violated. Read from `constraint` first (Postgres sets it), falling
 * back to sniffing `detail`, which names the colliding columns when the constraint name is absent.
 *
 * ⚠ Why this matters (Review Pass 2): every 23505 used to be reported as a VERSION conflict, so a
 * caller-supplied `id` colliding on the primary key produced a `FlagVersionConflictError` whose
 * advice — "re-read the latest version and retry" — re-sends the same `id` and reproduces the
 * identical 409 forever. An idempotency replay was being misdiagnosed as a concurrency loss.
 */
function uniqueViolationTarget(err: unknown): 'id' | 'version' | 'unknown' {
  const e = err as { constraint?: string; detail?: string; cause?: { constraint?: string; detail?: string } };
  const constraint = e.constraint ?? e.cause?.constraint ?? '';
  const detail = e.detail ?? e.cause?.detail ?? '';
  if (constraint.endsWith('_pkey') || /\(id\)/.test(detail)) return 'id';
  if (constraint.includes('scope_key_version') || /\(pariwar_id, flag_key, version\)/.test(detail)) {
    return 'version';
  }
  // An unrecognised constraint must NOT be silently reported as a version race — the caller would
  // retry forever. Fall through to rethrowing the raw error instead.
  return 'unknown';
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

  const rawClauses: unknown = input.cohortDefinition?.clauses;
  if (!Array.isArray(rawClauses)) {
    // Mirrors the evaluator's shape guard. Without this the validator itself threw a bare TypeError
    // on `clauses.length`, so a structurally-broken document produced an untyped 500 at the write
    // boundary instead of the 400 every other malformed input gets.
    reasons.push('cohort_definition.clauses must be an array');
    throw new FlagVersionInvalidError(reasons);
  }
  const clauses = rawClauses as CohortDefinitionJson['clauses'];
  if (clauses.length > MAX_COHORT_CLAUSES) {
    reasons.push(`cohort_definition.clauses must have at most ${String(MAX_COHORT_CLAUSES)} clauses`);
  }
  // ⚠ NO STAGED-COHORT REJECTION HERE (removed in Review Pass 4 — it was added in Pass 2).
  // An empty clause list on `canary`/`rollout` is LEGAL and means "serving nobody yet"; the safety
  // property lives in `evaluateFlag`, which resolves an empty cohort to `enabled: false`. Rejecting
  // it at write time made the state unreachable from the admin console (which forwards the existing
  // empty cohort and has no cohort editor), so no flag could be flipped from the console at all.
  // Do NOT reinstate the rejection without first giving the console a cohort editor.
  for (const [i, clause] of clauses.entries()) {
    if (!(COHORT_DIMENSIONS as readonly string[]).includes(clause.dimension)) {
      reasons.push(`clause[${String(i)}].dimension '${clause.dimension}' is not a valid cohort dimension`);
    }
    if (!(COHORT_OPERATORS as readonly string[]).includes(clause.op)) {
      reasons.push(`clause[${String(i)}].op '${clause.op}' is not a valid cohort operator`);
    }
    if (clause === null || typeof clause !== 'object' || !Array.isArray(clause.values)) {
      reasons.push(`clause[${String(i)}].values must be an array of strings`);
      continue;
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
      state: featureFlagVersions.state,
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

  // ⚠ A FLIP TAKES EFFECT IMMEDIATELY — no future-dating (Review Pass 2, and the twin of the
  // `isNull(supersededByVersion)` predicate in `flagVersionInForce`).
  //
  // Future-dated versions deadlocked the rollback path outright: the order guard below compares
  // against the HIGHEST-VERSION row, so a version scheduled for next year made every subsequent flip
  // throw `FlagEffectiveFromOutOfOrderError` until that date arrived — including the audited
  // `rolled_back` flip that Decision 6 names as the ENTIRE shipped rollback mechanism. The scheduled
  // row could not be amended (the 0087 append-only trigger) or deleted (no DELETE grant), so the only
  // exit was a superuser write against production.
  //
  // Scheduling is dropped rather than repaired: no AC commits to it, nothing in the repo authors it,
  // and keeping it would require a cancel path for pending versions plus a supersession rule that
  // distinguishes "superseded by a row already in force" from "superseded by a row that has not
  // started yet". Recorded as a deliberate narrowing in the Dev Agent Record.
  if (effectiveFrom.getTime() > dbNow.getTime()) {
    throw new FlagVersionInvalidError([
      'effective_from cannot be in the future — a flip takes effect immediately (scheduled flips are ' +
        'not supported; publish the version at the moment it should take effect)',
    ]);
  }

  // Reject a flip whose effectiveFrom precedes the scope's latest version — keeps the creation-order
  // supersession chain consistent with window-based resolution. (With future-dating rejected above
  // this is now trivially satisfiable by any caller that omits `effectiveFrom`, but an explicitly
  // back-dated `effectiveFrom` is still a real input and still has to be refused.)
  if (priorRow && effectiveFrom.getTime() < priorRow.effectiveFrom.getTime()) {
    throw new FlagEffectiveFromOutOfOrderError(input.flagKey, effectiveFrom, priorRow.effectiveFrom);
  }

  // The AC7 staged-rollout ladder (Review Pass 2). The prior row's state was already being read one
  // query above and simply never compared. The FIRST version for a scope transitions from the code
  // default's state, which is `off` for every registered flag — so `rolled_back` as a flag's
  // first-ever version is refused here too ("rolled back" has to mean something happened).
  const priorState: FeatureFlagState = priorRow?.state ?? defaultState(input.flagKey);
  const permitted = LEGAL_FLAG_STATE_TRANSITIONS[priorState];
  if (!permitted.includes(input.state)) {
    throw new FlagStateTransitionError(input.flagKey, priorState, input.state, permitted);
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
        actorDisplay: input.actorDisplay ?? null,
        rationale: input.rationale,
      })
      .returning();
    inserted = rows[0];
  } catch (err) {
    if (isUniqueViolation(err)) {
      // Distinguish WHICH uniqueness was violated — the two have different recoveries and the
      // version-conflict advice actively misleads on an id collision (Review Pass 2).
      const target = uniqueViolationTarget(err);
      if (target === 'version') {
        throw new FlagVersionConflictError(input.flagKey, input.pariwarId, nextVersion);
      }
      if (target === 'id' && input.id) {
        throw new FlagVersionDuplicateIdError(input.flagKey, input.id);
      }
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
