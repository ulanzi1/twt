// Module read accessors — Story 12.1 (QE12; AC8). Every read takes an EXPLICIT `pariwarId` (defense in
// depth alongside RLS — the `contribution/read.ts` convention). ⛔ Shelf read: which members SEE a module is
// Story 12.3's predicate (C1, C9).
//
// ⚠ ADMIN SHAPE. `getModule` / `listModulesForPariwar` return the WHOLE row — including
// `lead_handoff_url`, `lead_handoff_signing_key_secret_name` and `audit_id`. They serve the authoring and
// operator surfaces (12.2) and the lead route's own checks; ⛔ serialise one to a member. The member-facing
// shelf read (12.3) FIELD-PICKS what a member may see (checklist family 6; carried item C9).

import { and, asc, desc, eq, getTableColumns, ne, sql } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { ModuleId, PariwarId } from '../ids/index.js';
import { clampLimit } from '../pagination.js';
import { eventsLog } from '../schema/events_log.js';
import {
  marketplaceModules,
  type MarketplaceModule,
  type MarketplaceModuleState,
} from '../schema/marketplace_modules.js';
import { replayModuleState } from './state.js';

/** `listModulesForPariwar`'s default page size. */
export const LIST_MODULES_DEFAULT_LIMIT = 50;
/** `listModulesForPariwar`'s hard cap (forced pagination — family (a)). */
export const LIST_MODULES_MAX_LIMIT = 200;

/** One module row in this Pariwar, or null. ⚠ ADMIN SHAPE — every column; ⛔ serialise it to a member (see the file header). */
export async function getModule(db: Db, pariwarId: PariwarId, moduleId: ModuleId): Promise<MarketplaceModule | null> {
  const rows = await db
    .select()
    .from(marketplaceModules)
    .where(and(eq(marketplaceModules.pariwarId, pariwarId), eq(marketplaceModules.moduleId, moduleId)))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * A page of this Pariwar's modules, newest first (`created_at DESC, module_id DESC` — the id breaks ties
 * deterministically), optionally of one state. The page size is `clampLimit`-ed INLINE (TR5: the
 * domain-accessor-invariants gate rejects `.limit(NAMED_CONST)`). ⚠ ADMIN SHAPE — whole rows; ⛔ serialise them to a member.
 */
export async function listModulesForPariwar(
  db: Db,
  pariwarId: PariwarId,
  opts: { state?: MarketplaceModuleState; limit?: number } = {},
): Promise<MarketplaceModule[]> {
  const where =
    opts.state === undefined
      ? eq(marketplaceModules.pariwarId, pariwarId)
      : and(eq(marketplaceModules.pariwarId, pariwarId), eq(marketplaceModules.currentState, opts.state));
  return db
    .select()
    .from(marketplaceModules)
    .where(where)
    .orderBy(desc(marketplaceModules.createdAt), desc(marketplaceModules.moduleId))
    .limit(clampLimit(opts.limit, { default: LIST_MODULES_DEFAULT_LIMIT, cap: LIST_MODULES_MAX_LIMIT }));
}

/**
 * The module's lifecycle STATE as of `at` — the `member/read.ts` `getMemberStateAt` shape plus an explicit
 * `pariwar_id` predicate. Non-nullable like the member shape: a module with no event at or before `at` (or
 * none at all) replays to the pre-genesis `draft`, so a caller that needs existence checks `getModule` first.
 *
 * ⚠ It replays the longest PREFIX of the stream, in `event_version` order, whose events all have
 * `occurred_at <= at` — ⛔ every event that individually satisfies `occurred_at <= at`. `occurred_at` is
 * `now()`, the TRANSACTION START (TR4), so a transaction that began first but won the row lock second appends
 * the HIGHER version with the LOWER timestamp; filtering on the timestamp alone would replay {v1, v3} and skip
 * v2 — a state the module never had. The prefix always is a state it did have.
 *
 * ⚠ `module.lead_submitted` is left out of the read: a lead is a same-state event (`active → active`), so it
 * cannot change the answer, and an uncapped module accumulates one per lead. What remains is at most the
 * genesis plus one event per transition (four today; `module.restored` in 12.6 adds more) — a small stream.
 *
 * ⚠ CLOCK DOMAIN: `occurred_at` is DB time; an `at` taken from the APP clock can disagree with it by the
 * skew between them (the `getCurrentMemberState` caveat). Pass a DB-sourced instant when it matters.
 */
export async function getModuleStateAt(
  db: Db,
  pariwarId: PariwarId,
  moduleId: ModuleId,
  at: Date,
): Promise<MarketplaceModuleState> {
  // `afterAt` is compared IN THE DATABASE: `occurred_at` carries microseconds and a JS `Date` only milliseconds,
  // so cutting the prefix in JS would treat an event stamped a few µs after `at` as being at `at`.
  const rows = await db
    .select({ ...getTableColumns(eventsLog), afterAt: sql<boolean>`${eventsLog.occurredAt} > ${at.toISOString()}::timestamptz` })
    .from(eventsLog)
    .where(
      and(
        eq(eventsLog.streamId, moduleId),
        eq(eventsLog.pariwarId, pariwarId),
        ne(eventsLog.eventType, 'module.lead_submitted'),
      ),
    )
    .orderBy(asc(eventsLog.eventVersion));
  const firstAfter = rows.findIndex((row) => row.afterAt);
  return replayModuleState(firstAfter === -1 ? rows : rows.slice(0, firstAfter));
}
