// The member's chosen app language — Story 6.35 (Task 1.2; LS1 (a), LS2, I1; Decision 2026-10-23-387).
//
// ⭐ I1 — ⛔ nothing is recorded that the member did not choose. `setMemberLanguage` is the ONLY writer of
// `members.preferred_locale` / `preferred_locale_set_at`, and its ONLY caller is `PUT /api/v1/member/language`, which the app
// calls ONLY after an explicit change. ⛔ first-launch write, ⛔ device inference, ⛔ "adopt the Pariwar default", ⛔ backfill.
//
// `getMemberLanguage` / `setMemberLanguage` run on the CALLER's scoped `Db` (the API's `openScopeTx`, `twt_app` under RLS) and open
// ⛔ transaction. The predicates name `pariwar_id` explicitly anyway (the `custom-fields/member-write.ts` precedent) — ⛔ reliance on
// RLS alone. `readMemberTextLanguages` (Story 5.11b) is the THIRD function: a set-based READ run in the jobs pool's pariwar scope.
// The senders' read of the choice is `claim/peer-mesh-request.ts` `resolvePeerRequestLocale` (the jobs pool bypasses RLS).

import { and, eq, sql } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { MemberId, PariwarId } from '../ids/index.js';
import { members } from '../schema/members.js';
import { pariwarPassport } from '../schema/pariwar_passport.js';

/** The two app languages (the `locale` pg enum — `schema/pariwar_passport.ts`). */
export type MemberLanguage = 'hi' | 'en';

export interface MemberLanguageState {
  /** The member's own recorded choice — `null` until their first explicit change. */
  readonly chosenLocale: MemberLanguage | null;
  /** The Pariwar's default (`pariwar_passport.locale_default`) — informational; the app does ⛔ display it (LS4 (b)). */
  readonly pariwarDefaultLocale: MemberLanguage;
}

/** The Pariwar has ⛔ passport row — a data fault (the API answers 503). */
export class MemberLanguagePassportMissingError extends Error {
  public readonly name = 'MemberLanguagePassportMissingError';
  public constructor(pariwarId: PariwarId) {
    super(`[member-language] Pariwar ${pariwarId} has no passport (no default language)`);
  }
}

/** ⛔ `members` row for this member in this Pariwar (the API answers 409). */
export class MemberLanguageMemberMissingError extends Error {
  public readonly name = 'MemberLanguageMemberMissingError';
  public constructor(memberId: MemberId) {
    super(`[member-language] member ${memberId} has no row in this Pariwar`);
  }
}

function asLanguage(v: unknown): MemberLanguage | null {
  return v === 'hi' || v === 'en' ? v : null;
}

/**
 * The member's choice and their Pariwar's default.
 * @throws MemberLanguagePassportMissingError  ⛔ passport row
 * @throws MemberLanguageMemberMissingError  ⛔ member row in this Pariwar
 */
export async function getMemberLanguage(
  db: Db,
  input: { readonly pariwarId: PariwarId; readonly memberId: MemberId },
): Promise<MemberLanguageState> {
  const passport = await db
    .select({ localeDefault: pariwarPassport.localeDefault })
    .from(pariwarPassport)
    .where(eq(pariwarPassport.pariwarId, input.pariwarId))
    .limit(1);
  const pariwarDefaultLocale = asLanguage(passport[0]?.localeDefault);
  if (pariwarDefaultLocale === null) throw new MemberLanguagePassportMissingError(input.pariwarId);
  const rows = await db
    .select({ preferredLocale: members.preferredLocale })
    .from(members)
    .where(and(eq(members.memberId, input.memberId), eq(members.pariwarId, input.pariwarId)))
    .limit(1);
  if (rows.length === 0) throw new MemberLanguageMemberMissingError(input.memberId);
  return { chosenLocale: asLanguage(rows[0]?.preferredLocale), pariwarDefaultLocale };
}

/**
 * Records the member's explicit choice. Writes ONLY when the value CHANGES (`IS DISTINCT FROM`) — a repeat of the same choice
 * is ⛔ write: `preferred_locale_set_at` keeps the time of the change, and `changed: false` tells the caller ⛔ to audit.
 * @throws MemberLanguagePassportMissingError  ⛔ passport row (read first — the response carries the default)
 * @throws MemberLanguageMemberMissingError  ⛔ member row in this Pariwar
 */
export async function setMemberLanguage(
  db: Db,
  input: { readonly pariwarId: PariwarId; readonly memberId: MemberId; readonly locale: MemberLanguage },
): Promise<MemberLanguageState & { readonly changed: boolean }> {
  const before = await getMemberLanguage(db, input);
  const updated = await db
    .update(members)
    .set({ preferredLocale: input.locale, preferredLocaleSetAt: sql`now()`, updatedAt: sql`now()` })
    .where(
      and(
        eq(members.memberId, input.memberId),
        eq(members.pariwarId, input.pariwarId),
        sql`${members.preferredLocale} IS DISTINCT FROM ${input.locale}::locale`,
      ),
    )
    .returning({ memberId: members.memberId });
  return { chosenLocale: input.locale, pariwarDefaultLocale: before.pariwarDefaultLocale, changed: updated.length > 0 };
}

/**
 * ⭐ Story 5.11b (FS5 (a), `2026-10-25-404`) — the language each of a Pariwar's members gets their contribution TEXT in: their own
 * choice, else the Pariwar's default — for a whole member list in ONE set-based query (the POOL_BATCH child runs it inside its
 * pool-identity scope: ⛔ extra connection, ⛔ a query per member). A listed member with ⛔ `members` row gets the Pariwar's default
 * (a DELIBERATE departure from `resolvePeerRequestLocale`, which throws). ⛔ Passport row ⇒ `null` (the caller omits every text
 * and alarms once — ⛔ a guess). ⚠ The `WHERE pp.pariwar_id` is REQUIRED: `pariwar_passport`'s SELECT policy is `USING (true)` and
 * the jobs pool bypasses RLS — an unfiltered `CROSS JOIN` would yield members × every Pariwar. `members`' key is `member_id`.
 */
export async function readMemberTextLanguages(
  db: Db,
  input: { readonly pariwarId: PariwarId; readonly memberIds: readonly string[] },
): Promise<ReadonlyMap<string, MemberLanguage> | null> {
  if (input.memberIds.length === 0) return new Map();
  const result = await db.execute<{ member_id: string; locale: string | null }>(sql`
    SELECT u.id::text AS member_id, COALESCE(m.preferred_locale, pp.locale_default)::text AS locale
      FROM unnest(${`{${input.memberIds.join(',')}}`}::uuid[]) AS u(id)
     CROSS JOIN pariwar_passport pp
      LEFT JOIN members m ON m.pariwar_id = pp.pariwar_id AND m.member_id = u.id
     WHERE pp.pariwar_id = ${input.pariwarId}
  `);
  const rows = result.rows ?? [];
  if (rows.length === 0) return null;
  const out = new Map<string, MemberLanguage>();
  for (const r of rows) {
    const locale = asLanguage(r.locale);
    if (locale !== null) out.set(r.member_id.toLowerCase(), locale);
  }
  return out;
}
