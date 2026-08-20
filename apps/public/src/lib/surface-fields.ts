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
  /** The two-label public pill: `active` | `lock-in`. */
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
