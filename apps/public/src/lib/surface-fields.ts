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
