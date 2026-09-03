// Field-id derivation for the FR-74 tier-leak snapshots — Story 11a.1 (Task 6; AC2, ruling D3(a)).
//
// ── Why this exists ──────────────────────────────────────────────────────────
// Before this story the tier-leak leg was VACUOUS: `evaluateSnapshot` only runs
// the leak rules when a snapshot carries `fields`, and no snapshot ever did.
// Arming it needs a field-id set per surface, and where that set COMES FROM is
// the whole question — a set that restates the render drifts from it, and a leg
// fed a stale set is worse than no leg, because the green check then certifies
// an invariant nobody is enforcing.
//
// D3(a) ruled: derive it from the render model's OWN KEYS. To render a field you
// must first put it in the model, so the coupling is structural rather than
// remembered, and a newly-added field shows up in the snapshot by itself — where
// it fails closed as `unclassified` until it is classified in the matrix.
//
// ── ⚠ What this does NOT see (confessed, per the 10.12 fence's style) ────────
// A field rendered from a variable that never enters the render model is NOT
// seen by this derivation. The `.astro` frontmatter could compute a value
// inline and interpolate it into the template without it ever appearing as a
// model key. That soft spot is real and is the accepted cost of D3(a) over an
// AST scan of the templates (D3(b), rejected as substantially more machinery for
// surfaces that already have clean typed models). It is bounded by the house
// convention these pages already follow — ALL display logic lives in the pure
// `.ts` render module and the `.astro` file is a thin wrapper (the Astro
// component-test carve-out) — so a field bypassing the model is already a
// convention violation before it is a gate evasion.
//
// ── ⚠ camelCase ↔ snake_case: EXPLICIT, never mechanical ─────────────────────
// Render models are camelCase; matrix field ids are snake_case. This module does
// NOT convert between them by convention. A mechanical converter would invent a
// plausible id for a key nobody classified — turning "an unclassified field
// slipped into the render" (which the matrix would catch) into "the gate made up
// a name for it" (which nothing catches). Every key is mapped by hand or the
// derivation THROWS.

/**
 * The per-surface mapping from a render model's own key to its matrix field id.
 * `null` declares a key that is carried in the model but NOT rendered as a
 * visible field — a claim a reader can check against the template.
 */
export type FieldIdMapping<T> = Readonly<Record<keyof T & string, string | null>>;

/**
 * Derive a surface's matrix field-id set from a render model instance.
 *
 * BIDIRECTIONAL and fail-closed, for the same reason the route-coverage leg is:
 *   · a model key with no mapping entry THROWS — a field was added to the render
 *     and never classified;
 *   · a mapping entry with no model key THROWS — the classification no longer
 *     describes the render.
 * Neither half can move alone. ⛔ Silently ignoring either direction would let
 * the derivation go stale while continuing to report a confident field set.
 *
 * Returns sorted + deduplicated ids so a snapshot is deterministic (two models
 * with the same fields produce byte-identical sets regardless of key order).
 *
 * PURE: no fs, no db, no clock; the model is not mutated.
 */
export function deriveFieldIds<T extends object>(
  model: T,
  // Loose at the type boundary ON PURPOSE: the bidirectional RUNTIME check below is
  // the guarantee, and it must remain reachable. A `FieldIdMapping<T>`-typed
  // parameter would make both drift directions un-constructible in TS — which
  // sounds stronger but is weaker: models arrive from `.astro` frontmatter and
  // domain rows where the compile-time shape is exactly what goes stale, and the
  // negative controls proving the check fires could not be written at all.
  // Declarations still annotate their tables as `FieldIdMapping<T>` for editor help.
  mapping: Readonly<Record<string, string | null>>,
): string[] {
  const modelKeys = Object.keys(model);
  const mappedKeys = Object.keys(mapping);

  const unmapped = modelKeys.filter((k) => !Object.prototype.hasOwnProperty.call(mapping, k));
  if (unmapped.length > 0) {
    throw new Error(
      `deriveFieldIds: render-model key(s) with no declared matrix field id: ${unmapped.join(', ')}. ` +
        `Every key a render model exposes must be classified — declare its snake_case field id ` +
        `(and its tier in public-vs-private-matrix.yaml), or map it to null if it is not rendered. ` +
        `⛔ Do not guess an id: an unclassified rendered field is exactly what the FR-74 gate exists to catch.`,
    );
  }

  const stale = mappedKeys.filter((k) => !Object.prototype.hasOwnProperty.call(model, k));
  if (stale.length > 0) {
    throw new Error(
      `deriveFieldIds: mapping declares key(s) the render model does not have: ${stale.join(', ')}. ` +
        `The mapping has drifted from the render — remove the stale entr${stale.length === 1 ? 'y' : 'ies'} ` +
        `(and consider whether the matrix still needs the field).`,
    );
  }

  const ids = modelKeys
    .map((k) => mapping[k as keyof T & string])
    .filter((id): id is string => id !== null);
  return [...new Set(ids)].sort();
}

// ─────────────────────────────────────────────────────────────────────────────
// /members — the Member Directory surface. Story 11a.2 (Task 6; AC4).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * One rendered directory row — the display shape, ⛔ not the wire shape and ⛔ not a domain row.
 *
 * ⚠ Its keys are camelCase and its matrix ids are snake_case, mapped BY HAND in
 * {@link MEMBERS_FIELD_IDS} (see the camelCase↔snake_case note at the top of this file).
 */
export interface MemberDirectoryRow {
  /** The presentation-resolved name — `full_name` or `shielded_name`, decided server-side. */
  readonly memberName: string;
  /** Latest posting district, RAW. `null` when the member has no posting row. */
  readonly district: string | null;
  /** The two-label public pill: `active` | `waiting-period` (`2026-08-21-144` cl.4). */
  readonly memberStatus: string;
}

/**
 * The `/members` render model AS IT SHIPS AT STORY 11a.3.
 *
 * ⭐ IT NOW CARRIES REAL MEMBER DATA, AND THAT IS THE WHOLE POINT OF THIS STORY. ⚠ This supersedes
 * the 11a.2 doc-block here, which declared the surface's tier-leak leg **ARMED BUT EMPTY** — TRUE
 * THEN, ⛔ FALSE NOW. `membersSurfaceFieldIds(model)` returns a NON-EMPTY set, so `evaluateSnapshot`
 * actually evaluates the leak rules on the flagship public surface, and a planted
 * `authenticated_member`-tier or UNDECLARED field at `public` FAILS a run that previously passed.
 * ⭐ That is the discharge of `2026-08-19-136` cl.4, which made an operative leg LAUNCH-BLOCKING
 * for the Member Directory.
 *
 * ⛔ THE `authenticated_member` TIER IS NOT RENDERED HERE, and it is not an oversight: it has NO
 * VIEWER (`2026-08-20-143` cl.7). Members are token-bearer, a browser sends no `Authorization`
 * header, there is no `apps/member-web/`, and `apps/mobile` has no directory screen — so the
 * authenticated column of the epic's own table is structurally unbuildable at this story and is
 * routed onto 11a.2's fragment-mechanism deferral. ⛔ Do not add fields "ready for" it.
 *
 * ⚠ ADDING A MEMBER ATTRIBUTE TO THIS INTERFACE IS A MATRIX ACT. `deriveFieldIds` throws in BOTH
 * directions, so a new key with no mapping entry — or a mapping entry with no key — fails the
 * build. ⭐ That is the mechanism WORKING, ⛔ not an obstacle to route around, and ⛔ never a reason
 * to add a mechanical camelCase→snake_case converter (which would invent an id nobody classified).
 */
export interface MembersRenderModel {
  /** True when the directory has rows to show on THIS page. */
  readonly hasMembers: boolean;
  /** 1-based current page, echoed into the pagination controls. */
  readonly page: number;
  /** Rows per page, already validated against the FR-91 cap. */
  readonly limit: number;
  /**
   * ⚠ TRUE WHEN THE API COULD NOT BE REACHED — an OUTAGE, ⛔ never "no members".
   * The two states must never render as one another: an outage that looks like an empty membership
   * is a false statement about the trust.
   */
  readonly apiUnavailable: boolean;
  /**
   * ⚠ TRUE when this page is EMPTY but the roster is NOT — the visitor asked for a page number
   * past the real last page. Code-review finding (2026-08-21): `!hasMembers` alone conflates this
   * with a genuinely unpublished/empty directory, rendering the SAME "not published yet" copy for
   * both. A valid, in-horizon page past the end is a materially different situation from "this
   * trust has no members" and deserves its own copy, for the same reason `apiUnavailable` is not
   * folded into `!hasMembers` above: an outage that looks like an empty membership is a false
   * statement about the trust, and so is "not published yet" on a roster that plainly has members.
   */
  readonly pastEnd: boolean;
  /** The rows on this page. ⭐ The member attributes below are what the tier-leak leg now sees. */
  readonly rows: readonly MemberDirectoryRow[];
}

/**
 * ⭐ NO LONGER ALL-`null` — THREE KEYS NOW CARRY REAL MATRIX FIELD IDS.
 *
 * `null` still declares "carried in the model but NOT rendered as a classified field", and it is
 * correct for exactly the non-attribute keys: `hasMembers` / `apiUnavailable` select between blocks
 * of fixed i18n copy, `page`/`limit` drive the pagination controls, and `rows` is the CONTAINER —
 * its per-row attributes are what carry ids, not the array itself.
 *
 * ⛔ Every id below is declared in `public-vs-private-matrix.yaml` for the `member-directory`
 * surface. ⛔ Do not add an entry here without adding the row there — `deriveFieldIds` fails the
 * build in both directions precisely so the two cannot drift.
 */
export const MEMBERS_FIELD_IDS: FieldIdMapping<MembersRenderModel> = {
  hasMembers: null,
  page: null,
  limit: null,
  apiUnavailable: null,
  pastEnd: null,
  rows: null,
};

/**
 * The per-ROW mapping. ⚠ Split from {@link MEMBERS_FIELD_IDS} because the model nests: `rows` is a
 * container key with no tier of its own, and its element attributes are the classified fields.
 * ⛔ Folding the two together would either classify the array (meaningless) or leave the attributes
 * outside the derivation (the vacuous set this story exists to eliminate).
 */
export const MEMBER_DIRECTORY_ROW_FIELD_IDS: FieldIdMapping<MemberDirectoryRow> = {
  memberName: 'member_name',
  district: 'district',
  memberStatus: 'member_status',
};

/**
 * Derive the `/members` snapshot field set.
 *
 * ⭐ NON-EMPTY AS OF STORY 11a.3 — `district`, `member_name`, `member_status`. ⚠ The row attributes
 * are derived from a REPRESENTATIVE row shape, not from `rows[0]`: a page that happens to be empty
 * must still declare the fields the surface RENDERS, or the leg would go vacuous again on exactly
 * the pages where nobody would notice.
 */
export function membersSurfaceFieldIds(model: MembersRenderModel): string[] {
  const shell = deriveFieldIds(model, MEMBERS_FIELD_IDS);
  const rowIds = deriveFieldIds(MEMBER_DIRECTORY_ROW_SHAPE, MEMBER_DIRECTORY_ROW_FIELD_IDS);
  return [...new Set([...shell, ...rowIds])].sort();
}

/**
 * The representative row shape the derivation runs against.
 *
 * ⛔ NOT a fixture and ⛔ not test data — it is the structural declaration of which attributes a
 * directory row renders, and it is what keeps the field set independent of whether a given page
 * happens to have rows on it. Its VALUES are never rendered; only its KEYS are read.
 */
const MEMBER_DIRECTORY_ROW_SHAPE: MemberDirectoryRow = {
  memberName: '',
  district: null,
  memberStatus: '',
};

// ─────────────────────────────────────────────────────────────────────────────
// /sahyog — the Sahyog Drive pool index. Story 11b.1 (Task 3; AC7).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * One rendered drive row — the display shape, ⛔ not the wire shape and ⛔ not a domain row.
 *
 * ⚠ Its keys are camelCase and its matrix ids are snake_case, mapped BY HAND in
 * {@link SAHYOG_DRIVE_ROW_FIELD_IDS} (see the camelCase↔snake_case note at the top of this file).
 */
export interface SahyogDriveRow {
  /**
   * ⭐ THE DECEASED MEMBER'S NAME — `null` when the family has not consented, has REVOKED, or the
   * name is unresolvable. ⚠ ALL THREE ARE THE SAME VALUE ON PURPOSE, and the template renders
   * NOTHING for a null: ⛔ no placeholder, ⛔ no empty span, ⛔ no comment naming the omitted field.
   * *An omission that announces itself is an enumeration signal.*
   *
   * ⛔ NULL NEVER REMOVES THE ROW. Every other key below renders regardless — consent decides
   * whether a drive is NAMED, ⛔ never whether it EXISTS.
   *
   * ⚠ It is STILL a classified field when null: the field id below is what the tier-leak leg reads,
   * and a field that is sometimes absent is not an unclassified one.
   */
  readonly deceasedMemberName: string | null;
  /** The pool's letter code (Story 7.2's dual identifier) — a label for a COLLECTION. */
  readonly poolLetterCode: string;
  /** `P-YYYY-MM-###`. */
  readonly poolCanonicalIdentifier: string;
  /**
   * ⭐⭐ THE LINK TO THIS DRIVE'S OWN PAGE — Story 11b.10 (AC3). Built from the drive's OPAQUE
   * PUBLIC TOKEN, ⛔ never from `poolCanonicalIdentifier` above (which is no longer addressable).
   *
   * ⚠⛔ WHAT SHIPPING THIS DOES, IN PROSE SO A REVIEWER MEETS IT HERE AND ⛔ NOT IN A DIFF (D3,
   * Trap 2): **every listed drive becomes ONE CLICK from four Tier-1 fields under `D8-default`
   * FAIL-OPEN.** Before it, the index LISTED drives and ⛔ never LINKED to them.
   */
  readonly driveHref: string;
  /**
   * The drive link's ACCESSIBLE NAME — ⛔ never a bare "click here" (family 13). It names WHICH
   * drive the link opens, so N rows announce N distinct destinations.
   *
   * ⚠ Mapped to `null` in {@link SAHYOG_DRIVE_ROW_FIELD_IDS}: it is an ACCESSIBILITY ANNOTATION on
   * the field below it, ⛔ not a classified attribute of the drive. Its content is fixed i18n copy
   * with the (already-classified) drive code interpolated — declaring it a second time would
   * classify the same fact twice under two ids.
   */
  readonly driveLinkA11yLabel: string;
  /** `active` | `archive`, already localised. ⛔ The internal lifecycle word never reaches here. */
  readonly driveStatus: string;
  /** The close/settle instant, already formatted. `null` ⇒ the "not recorded" copy. */
  readonly driveClosedAt: string | null;
  /** Latest posting district, RAW. `null` ⇒ the "not recorded" copy. */
  readonly district: string | null;
  /** Confirmed contributions, already formatted. ⛔ A count, ⛔ never a sum and ⛔ never a score. */
  readonly confirmedContributionCount: string;
  /** Pool-Reality #2 framing copy. ⛔ Contains NO target, percentage or shortfall, by construction. */
  readonly closeOfCycleFraming: string;
}

/**
 * The `/sahyog` render model.
 *
 * ⚠ ADDING A FIELD TO THIS INTERFACE IS A MATRIX ACT. `deriveFieldIds` throws in BOTH directions,
 * so a new key with no mapping entry — or a mapping entry with no key — fails the build. ⭐ That is
 * the mechanism WORKING, ⛔ not an obstacle to route around.
 *
 * ⛔ THE `authenticated_member` TIER IS NOT RENDERED HERE and has NO VIEWER — members are
 * token-bearer, no browser surface holds the member token, and `2026-08-23-154` disposition (c)
 * DEFERRED the authenticated tier onto that trigger. ⛔ Do not add fields "ready for" it.
 */
export interface SahyogDriveRenderModel {
  /** True when this page has drives to show. */
  readonly hasDrives: boolean;
  /** 1-based current page, echoed into the pagination controls. */
  readonly page: number;
  /** Rows per page, already validated against the FR-91 cap. */
  readonly limit: number;
  /**
   * ⚠ TRUE WHEN THE API COULD NOT BE REACHED — an OUTAGE, ⛔ never "no drives".
   * ⭐ On THIS surface the conflation is at its most damaging: the page exists so a stranger can
   * check whether this trust actually moves money, so rendering "no drives" during an upstream
   * blip is the single most misleading thing it could say.
   */
  readonly apiUnavailable: boolean;
  /** ⚠ TRUE when this page is EMPTY but the index is NOT — a page number past the real last page. */
  readonly pastEnd: boolean;
  /** ⚠ TRUE when a filter is active — so "no drives" can say "none MATCH" rather than "none exist". */
  readonly filtered: boolean;
  /** The rows on this page. */
  readonly rows: readonly SahyogDriveRow[];
}

/**
 * `null` declares "carried in the model but ⛔ NOT rendered as a classified field", and it is
 * correct for exactly the non-attribute keys: the booleans select between blocks of fixed i18n
 * copy, `page`/`limit` drive the pagination controls, and `rows` is the CONTAINER — its per-row
 * attributes carry the ids, not the array itself.
 */
export const SAHYOG_DRIVE_FIELD_IDS: FieldIdMapping<SahyogDriveRenderModel> = {
  hasDrives: null,
  page: null,
  limit: null,
  apiUnavailable: null,
  pastEnd: null,
  filtered: null,
  rows: null,
};

/**
 * The per-ROW mapping. ⛔ Every id below is declared in `public-vs-private-matrix.yaml` for the
 * `sahyog-drive` surface — ⛔ do not add an entry here without adding the row there.
 */
export const SAHYOG_DRIVE_ROW_FIELD_IDS: FieldIdMapping<SahyogDriveRow> = {
  deceasedMemberName: 'deceased_member_name',
  poolLetterCode: 'pool_letter_code',
  poolCanonicalIdentifier: 'pool_canonical_identifier',
  // ⭐ Story 11b.10 — the drive link. `pii_tier: 3`: an ADDRESS, ⛔ not a person and ⛔ not derived
  // from one ⇒ it needs ⛔ no `tier1_public_exception` and ⛔ no `RULED_TIER1_PUBLIC_EXCEPTIONS`
  // entry (adding to that map "IS A RULING, NEVER A CODE CHANGE" — ⛔ do not touch it).
  driveHref: 'drive_href',
  // ⛔ An a11y ANNOTATION on `drive_href`, ⛔ not a field of its own — see the interface's doc-block.
  driveLinkA11yLabel: null,
  driveStatus: 'drive_status',
  driveClosedAt: 'drive_closed_at',
  district: 'district',
  confirmedContributionCount: 'confirmed_contribution_count',
  closeOfCycleFraming: 'close_of_cycle_framing',
};

/**
 * The representative row shape the derivation runs against.
 *
 * ⛔ NOT a fixture and ⛔ not test data — it is the structural declaration of which attributes a
 * drive row renders, and it is what keeps the field set independent of whether a given page happens
 * to have rows on it.
 *
 * ⭐⚠ `deceasedMemberName` IS DECLARED HERE EVEN THOUGH IT IS OFTEN NULL, AND THAT IS THE POINT.
 * Deriving row ids from `rows[0]` would make the surface's classified field set depend on whether
 * the first family on the page happened to consent — so a page of entirely unconsented drives would
 * silently declare a SMALLER field set and the tier-leak leg would go partly vacuous on exactly the
 * pages nobody would look at. ⛔ The field a surface CAN render is what gets classified, ⛔ never
 * the field it happens to be rendering right now.
 */
const SAHYOG_DRIVE_ROW_SHAPE: SahyogDriveRow = {
  deceasedMemberName: null,
  poolLetterCode: '',
  poolCanonicalIdentifier: '',
  driveHref: '',
  driveLinkA11yLabel: '',
  driveStatus: '',
  driveClosedAt: null,
  district: null,
  confirmedContributionCount: '',
  closeOfCycleFraming: '',
};

/**
 * Derive the `/sahyog` snapshot field set.
 *
 * ⭐ NON-EMPTY FROM THE FIRST COMMIT — the tier-leak leg is OPERATIVE on this surface, ⛔ not
 * armed-but-empty. A planted `authenticated_member`-tier or UNDECLARED field at `public` FAILS a
 * run that previously passed, which is the only thing that makes a green scan mean anything.
 */
export function sahyogDriveSurfaceFieldIds(model: SahyogDriveRenderModel): string[] {
  const shell = deriveFieldIds(model, SAHYOG_DRIVE_FIELD_IDS);
  const rowIds = deriveFieldIds(SAHYOG_DRIVE_ROW_SHAPE, SAHYOG_DRIVE_ROW_FIELD_IDS);
  return [...new Set([...shell, ...rowIds])].sort();
}

// ─────────────────────────────────────────────────────────────────────────────
// /sahyog-vivran/[poolCanonicalIdentifier] — ONE drive's own page. Story 11b.3 (Task 1; AC2).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The `/sahyog-vivran/[poolCanonicalIdentifier]` render model.
 *
 * ⭐⭐ IT NAMES ⛔ NOBODY, AND THAT IS THE SPLIT'S LOAD-BEARING PROPERTY, ⛔ not an omission
 * (`2026-09-02-182` cl.2, D6(b)). ⛔ No key below carries a person's name — ⛔ not the deceased
 * member's, ⛔ not a contributor's, ⛔ not a verifier's, ⛔ not a nominee's — so every matrix field
 * this model derives is `pii_tier: 3` and the surface declares ⛔ ZERO Tier-1 fields at `public`.
 * ⇒ it needs ⛔ no `tier1_public_exception`, ⛔ no `RULED_TIER1_PUBLIC_EXCEPTIONS` entry and
 * ⛔ no Panel ruling, so ⛔ nothing outside this repository can block it.
 *
 * ⚠⛔ ADDING A KEY HERE IS A MATRIX ACT, and on THIS surface it is more than that: a key carrying
 * a person's name would make the emptiness above false and must arrive WITH its cited ruling and
 * its allowlist entry, in the SAME commit (11b.3a's four nominee-bank pairs, `2026-08-28-165`
 * cl.1/cl.3; 11b.3b's two names, `2026-09-02-173` / `-174`). `deriveFieldIds` throws in BOTH
 * directions, and `tests/surface-fields.test.ts` asserts the Tier-1-at-`public` count is 0 — ⛔ that
 * assertion is a COUNT FOR THIS STORY, ⛔ not a permanent ceiling, and each sibling owes it an
 * update.
 *
 * ⛔ THE `authenticated_member` TIER IS NOT RENDERED HERE AND HAS NO VIEWER. Members are
 * token-bearer, no browser surface holds the member token, and SD-2 is RE-PURPOSED onto the
 * POST-campaign masking state (`2026-08-28-164` A2) — ⛔ not dissolved, and the post-masking
 * authenticated presentation is a separate future decision. ⛔ Do not add fields "ready for" it,
 * and ⛔ do not add an `isAuthenticated` flag to this model.
 *
 * ⛔ AND THERE IS NO RUPEE FIGURE. D1(b) ruled the SHIPPED `amountRaisedInr` producer CONSUMED —
 * but it lives behind the `@twt/ui` fence this story does not lift, so the amount lands at
 * **11b.3b**. ⛔ Re-deriving `confirmedCount × fixedAmount` here is D1(c), REFUSED, and a second
 * multiplication anywhere in this app is the defect.
 */
export interface SahyogVivranRenderModel {
  /**
   * ⚠ TRUE WHEN THE API COULD NOT BE REACHED — an OUTAGE, ⛔ never "this drive does not exist".
   * ⭐ On a per-claim page the conflation is at its sharpest: a 404 for a drive that DOES exist
   * tells a visitor the trust has no record of it.
   */
  readonly apiUnavailable: boolean;
  /**
   * ⚠ TRUE while the drive is still COLLECTING (`pools.current_state = 'live'`, admitted by D4(b)).
   * ⭐ It selects AC3's honest copy — *"final outcome will appear after reconciliation settles"* —
   * ⛔ never an estimate, ⛔ never a projection, ⛔ never an "X% confirmed so far" frame.
   */
  readonly isCollecting: boolean;
  /** ⚠ TRUE when the claim reached this drive BY APPEAL — selects the AC5 lineage block. */
  readonly wasReversedByAppeal: boolean;
  /**
   * The drive's letter code — ⛔ NEVER the Pariwar's curated registry name. `resolveCuratedPoolName`
   * re-derives the curated name via `reserveNames`, which RESERVES rows: a write path an
   * unauthenticated GET may not trigger. Mirrors `/sahyog` exactly.
   */
  readonly poolLetterCode: string;
  /** `P-YYYY-MM-###` — and on this surface also the route parameter. */
  readonly poolCanonicalIdentifier: string;
  /** `collecting` | `active` | `archive`, already localised. ⛔ The internal word never reaches here. */
  readonly driveStatus: string;
  /** The close/settle instant, already formatted. `null` ⇒ render NOTHING (still collecting). */
  readonly driveClosedAt: string | null;
  /** The deceased member's latest posting district, RAW. `null` ⇒ the "not recorded" copy. */
  readonly district: string | null;
  /** Confirmed contributions, already formatted. ⛔ A count, ⛔ never a sum and ⛔ never a score. */
  readonly confirmedContributionCount: string;
  /**
   * Pool-Reality #2 framing copy. `null` in TWO cases and the page then says NOTHING: the drive is
   * still collecting, or ⛔ no expectation was ever set (zero assignees).
   * ⛔ Contains NO target, percentage or shortfall, by construction.
   */
  readonly closeOfCycleFraming: string | null;
  /** `1` | `2` | `3` as display copy. `null` when the claim was never reversed. */
  readonly appealReversalStage: string | null;
  /** The bounded NON-PII disposition tag, already localised. ⛔ Never rationale, ⛔ never a person. */
  readonly appealDispositionCategory: string | null;
  /** The reversal instant, already formatted. `null` when there was no reversal. */
  readonly appealReversalAt: string | null;
  /**
   * ⭐ THE NOMINEE BANK ACCOUNTS — Story 11b.3a. At most TWO, ordered `#1` then `#2`, and that is an
   * ORDER, ⛔ not a ranking: they are EQUAL payment destinations.
   *
   * ⚠ `[]` when the claim's bank details were never collected, and the page renders NOTHING —
   * ⛔ no *"not recorded"* marker. ⭐ The CLASSIFIED FIELD SET does ⛔ not shrink when this is empty:
   * the per-row ids are derived from a representative shape, ⛔ never from `nomineeAccounts[0]`.
   */
  readonly nomineeAccounts: readonly SahyogVivranNomineeAccountRow[];
}

/**
 * ⭐ ONE RENDERED NOMINEE BANK ACCOUNT — Story 11b.3a (AC2, AC4, AC7).
 *
 * The DISPLAY shape, ⛔ not the wire shape and ⛔ not a domain row. Every value has already been
 * decrypted and — when the Pariwar's window has elapsed — REDUCED at the `apps/api` boundary, so
 * ⛔ nothing here decrypts and ⛔ nothing here masks: by the time a value reaches this shape the
 * projection is already the ruled one (AC4 — *"the full value never crosses the wire once masked"*).
 *
 * ⛔⛔ THE TWO ACCOUNTS ARE **EQUAL PAYMENT DESTINATIONS**. `accountRank` is row IDENTITY — ⛔ not a
 * priority, ⛔ not a nominee rank, ⛔ not a split, ⛔ not routing (Story 9.9's re-scope). It is
 * mapped to `null` below because it is ⛔ not a rendered field: it keys the list, and rendering
 * *"Account 1"* / *"Account 2"* as a classified value would put an ordering that implies preference
 * onto the page.
 *
 * ⚠⛔ `accountHolderName` IS ⛔ NOT LABELLED "NOMINEE" — 6.8's D1 removed that linkage deliberately
 * ([[project_nominee_bank_disbursement_channel]]). ⛔ Do not rename it or label it so in the copy.
 */
export interface SahyogVivranNomineeAccountRow {
  /** ⛔ NOT a classified field — row identity only. See the doc-block. */
  readonly accountRank: number;
  /** ⚠ TRUE when the Pariwar's masking window has elapsed — selects the reduced copy block. */
  readonly isMasked: boolean;
  /** Tier-3 plaintext. ⛔ Nothing was decrypted for it. */
  readonly nomineeBankName: string;
  /** Tier-3 plaintext. `null` ⇒ render NOTHING. */
  readonly nomineeBranch: string | null;
  /** ⚠ THE ACCOUNT HOLDER. `null` when masked (⛔ absent from cl.10(e)'s retention list) or on a
   * failed decrypt. `null` ⇒ render NOTHING — ⛔ no placeholder. */
  readonly nomineeAccountHolderName: string | null;
  /**
   * The account number AS THE RULED PROJECTION ALREADY MADE IT — the FULL value while the drive is
   * within its window, and the LAST FOUR DIGITS ALONE once masked (already framed by the localised
   * copy, so assistive tech announces ONE coherent field rather than reading a truncated string
   * digit by digit — AC4/AC7). ⛔ This module never truncates: the reduction happened at the API.
   */
  readonly nomineeAccountNumber: string | null;
  /** RETAINED in the masked projection (cl.10(e)). `null` ⇒ render NOTHING. */
  readonly nomineeIfsc: string | null;
  /** ⚠ NULL for every nominee today (Story 8.4's absent seam) and null whenever masked. ⛔ Render
   * NOTHING — ⛔ no "not provided" marker, which would be an enumeration signal. */
  readonly nomineeVpa: string | null;
}

/**
 * `null` declares "carried in the model but ⛔ NOT rendered as a classified field", and it is
 * correct for exactly the three booleans (they select between blocks of fixed i18n copy) and for
 * `nomineeAccounts`, which is the CONTAINER — its per-row attributes carry the ids, ⛔ not the array.
 *
 * ⛔ Every id below is declared in `public-vs-private-matrix.yaml` for the `sahyog-vivran` surface
 * — ⛔ do not add an entry here without adding the row there.
 *
 * ⚠ THIS PAGE STILL RENDERS ⛔ NO PAGED LIST, and 11b.3a does ⛔ not change that: the nominee
 * accounts are AT MOST TWO by the substrate's composite PK, so there is nothing to page, nothing to
 * filter and nothing to walk. ⇒ the matrix still declares `paginated: false` and `parsePageParams()`
 * is still never called. ⭐ **11b.3b adds the contributor list** — that is what flips `paginated` to
 * `true` in the matrix AND in `routes.ts`'s written defence AND in the `login-wall.spec.ts` allowlist
 * entry (D11(a)). ⛔ Do not read the per-row mapping below as that flip having happened.
 */
export const SAHYOG_VIVRAN_FIELD_IDS: FieldIdMapping<SahyogVivranRenderModel> = {
  apiUnavailable: null,
  isCollecting: null,
  wasReversedByAppeal: null,
  poolLetterCode: 'pool_letter_code',
  poolCanonicalIdentifier: 'pool_canonical_identifier',
  driveStatus: 'drive_status',
  driveClosedAt: 'drive_closed_at',
  district: 'district',
  confirmedContributionCount: 'confirmed_contribution_count',
  closeOfCycleFraming: 'close_of_cycle_framing',
  appealReversalStage: 'appeal_reversal_stage',
  appealDispositionCategory: 'appeal_disposition_category',
  appealReversalAt: 'appeal_reversal_at',
  nomineeAccounts: null,
};

/**
 * The per-ROW mapping for the nominee bank accounts — Story 11b.3a.
 *
 * ⚠ Split from {@link SAHYOG_VIVRAN_FIELD_IDS} for the reason the directory's is: `nomineeAccounts`
 * is a container key with no tier of its own, and its element attributes are the classified fields.
 * ⛔ Folding the two together would either classify the array (meaningless) or leave FOUR Tier-1
 * fields outside the derivation — which is the vacuous set this leg exists to eliminate, on the one
 * surface where it would matter most.
 */
export const SAHYOG_VIVRAN_NOMINEE_ACCOUNT_FIELD_IDS: FieldIdMapping<SahyogVivranNomineeAccountRow> =
  {
    // ⛔ Row identity, ⛔ not a rendered value — see the interface's doc-block.
    accountRank: null,
    // Selects the masked vs. full copy block; the values it selects between are classified below.
    isMasked: null,
    nomineeBankName: 'nominee_bank_name',
    nomineeBranch: 'nominee_branch',
    nomineeAccountHolderName: 'nominee_account_holder_name',
    nomineeAccountNumber: 'nominee_account_number',
    nomineeIfsc: 'nominee_ifsc',
    nomineeVpa: 'nominee_vpa',
  };

/**
 * The representative account shape the derivation runs against.
 *
 * ⛔ NOT a fixture and ⛔ not test data — it is the structural declaration of which attributes an
 * account row renders, and it is what keeps the field set independent of whether a given drive
 * happens to have bank details collected. Its VALUES are never rendered; only its KEYS are read.
 *
 * ⭐⭐ THIS IS THE LOAD-BEARING PART ON THIS SURFACE. Deriving from `accounts[0]` would make the
 * classified set SHRINK on every drive with no bank details — and on every MASKED drive, where the
 * wire's masked arm carries no `accountHolderName` key at all. ⇒ four Tier-1 declarations would go
 * unasserted on exactly the pages nobody would check, which is the vacuous-leg defect, per request.
 */
const SAHYOG_VIVRAN_NOMINEE_ACCOUNT_SHAPE: SahyogVivranNomineeAccountRow = {
  accountRank: 1,
  isMasked: false,
  nomineeBankName: '',
  nomineeBranch: null,
  nomineeAccountHolderName: null,
  nomineeAccountNumber: null,
  nomineeIfsc: null,
  nomineeVpa: null,
};

/**
 * Derive the `/sahyog-vivran` snapshot field set.
 *
 * ⭐ NON-EMPTY FROM THIS SURFACE'S FIRST COMMIT — ⛔ not armed-but-empty. `evaluateSnapshot` only
 * runs the leak rules when a snapshot carries `fields`, so a leg fed an empty set is a green check
 * certifying an invariant nobody enforces. A planted `authenticated_member`-tier or UNDECLARED
 * field at `public` FAILS a run that previously passed, which is the only thing that makes a green
 * scan mean anything ([[feedback_gate_scope_semantic_coverage]]).
 *
 * ⚠ The top-level fields are derived from the model INSTANCE (every classified field is a top-level
 * key, present whether or not it is null); the nominee-account attributes from a REPRESENTATIVE
 * SHAPE, so a drive with no bank details — or a masked one — still declares them. See
 * {@link SAHYOG_VIVRAN_NOMINEE_ACCOUNT_SHAPE} for why that distinction is load-bearing here.
 */
export function sahyogVivranSurfaceFieldIds(model: SahyogVivranRenderModel): string[] {
  const shell = deriveFieldIds(model, SAHYOG_VIVRAN_FIELD_IDS);
  const accountIds = deriveFieldIds(
    SAHYOG_VIVRAN_NOMINEE_ACCOUNT_SHAPE,
    SAHYOG_VIVRAN_NOMINEE_ACCOUNT_FIELD_IDS,
  );
  return [...new Set([...shell, ...accountIds])].sort();
}
