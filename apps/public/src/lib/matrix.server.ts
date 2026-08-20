// The RUNTIME half of the FR-74 matrix — Story 11a.2 (Task 2; AC1, Trap 3).
//
// ── ⭐ WHY THIS FILE EXISTS AT ALL: one matrix, two readers ──────────────────
// The gate (`packages/contracts/scripts/check-pii-scrape.ts`) and the live-render
// spec both read `public-vs-private-matrix.yaml` FROM DISK by relative path. That
// works in CI, where the workspace exists. ⛔ It does NOT work in the deployed
// shell: `astro.config.mjs` bundles every `@twt/*` package via `vite.ssr.noExternal`
// precisely because "the standalone Docker image copies `dist/`, not the workspace
// symlinks" — and the `.yaml` is not in `dist/`. A relative `fs.readFileSync` from
// `dist/server/entry.mjs` would resolve to nothing, at runtime, in production.
//
// So the bytes are INLINED at build time via a Vite `?raw` import. The deep path
// resolves because `@twt/contracts` declares no `exports` map. What ships in the
// server entry is the committed file's own text.
//
// ── ⛔ AND WHY BYTE-IDENTITY IS ASSERTED, NOT ASSUMED ────────────────────────
// A renderer enforcing a STALE COPY of the matrix while the gate checks the real
// one is a silent divergence — invisible to both, because each would be internally
// consistent. `tests/matrix.server.test.ts` asserts the runtime-loaded text is
// byte-identical to the committed file, so the two readers can never enforce
// different matrices.
//
// ── ⛔ NO EMPTY FALLBACK, EVER ───────────────────────────────────────────────
// `parsePublicVsPrivateMatrix` returns `null` for an empty document. This module
// THROWS on that, and on a malformed parse it lets the parser's own throw escape.
// A `?? { surfaces: [] }` fallback here would make every `<MatrixField>` verdict
// `unknown_surface` — which is fail-CLOSED and therefore invisible: the page would
// render nothing at all and look merely empty. That degradation is exactly what
// Story 11a.1 deleted from the live-render spec; ⛔ do not reintroduce it.
//
// PURE apart from the module-level parse: no fs, no db, no env, no clock.
import {
  getVisibility,
  parsePublicVsPrivateMatrix,
  type PublicVsPrivateMatrix,
  type ViewerContext,
  type VisibilityVerdict,
} from '@twt/contracts';
// The `?raw` suffix is a Vite virtual specifier; its type lives in `src/env.d.ts`.
import matrixRaw from '@twt/contracts/public-pages/public-vs-private-matrix.yaml?raw';

/** The committed matrix text as inlined into the server bundle. Exported for the identity test. */
export const MATRIX_SOURCE: string = matrixRaw;

/**
 * Parse the inlined matrix ONCE per process.
 *
 * Module-scope so the YAML parse is not repeated per request or per field — a
 * page rendering N fields must not parse the matrix N times.
 */
function parseOnce(): PublicVsPrivateMatrix {
  const parsed = parsePublicVsPrivateMatrix(MATRIX_SOURCE);
  if (parsed === null) {
    throw new Error(
      'public-vs-private-matrix.yaml parsed to the empty-document sentinel at RUNTIME. The ' +
        'matrix has been populated since Story 11a.1, so an empty parse means it was emptied, ' +
        'corrupted, or not inlined into the server bundle. ⛔ It must never degrade to "no ' +
        'surfaces": every field would then silently render nothing and the page would look ' +
        'merely empty rather than broken.',
    );
  }
  return parsed;
}

/** The single runtime matrix instance. ⛔ The gate reads the same bytes (asserted by test). */
export const RUNTIME_MATRIX: PublicVsPrivateMatrix = parseOnce();

/**
 * Ask the ONE canonical engine whether this viewer may see this field here.
 *
 * ⛔ A thin delegation ON PURPOSE. It exists so `.astro` files have a typed entry
 * point that cannot drift, ⛔ NOT to add logic: it must never compare tiers, never
 * import `TIER_RANK`, and never carry a second copy of the viewer ceiling. Story
 * 11a.1 collapsed the repo to exactly one copy of the tier ordering; a second one
 * here would be a divergence that type-checks.
 */
export function visibilityOf(
  surfaceId: string,
  fieldId: string,
  viewerContext: ViewerContext,
): VisibilityVerdict {
  return getVisibility(RUNTIME_MATRIX, surfaceId, fieldId, viewerContext);
}

/**
 * The COMPLETE render decision for one `<MatrixField>`, as a pure value.
 *
 * ⭐ The decision lives here, ⛔ not in the `.astro` file, because `.astro`
 * components are not unit-testable in this repo — which is exactly why the house
 * convention puts all display logic in pure `.ts` and keeps the component a thin
 * wrapper. That convention is what lets AC1's hardest assertion be written at all:
 * *a not-visible verdict renders NOTHING*. A decision buried in a template could
 * only be asserted about; here it can be asserted.
 *
 * Returns `null` for "render nothing at all" — ⛔ never a placeholder, never an
 * empty element, never a comment naming the omitted field. An omission that
 * announces itself is an enumeration signal.
 *
 * ⚠ A visible field with no value also returns `null`. That is a DIFFERENT nothing
 * from a withheld one and the `verdict` distinguishes them; the DOM does not, and
 * must not.
 */
export function matrixFieldOutput(
  surfaceId: string,
  fieldId: string,
  viewerContext: ViewerContext,
  value: string | number | null | undefined,
): { verdict: VisibilityVerdict; output: string | null } {
  const verdict = visibilityOf(surfaceId, fieldId, viewerContext);
  return { verdict, output: outputForVerdict(verdict, value) };
}

/**
 * The value-half of the render decision, split out so the ABOVE-CEILING negative
 * control can be planted HONESTLY.
 *
 * ⚠ Why this split is not gratuitous: every field the committed matrix declares
 * today is tier `public`, so a control that asks the REAL matrix for an
 * above-ceiling field is VACUOUS — it would prove nothing, and go on proving
 * nothing silently. Exposing this function lets that control feed a PLANTED verdict
 * (from `getVisibility` over a planted matrix) through the SAME code path the
 * component uses, instead of restating the rule inside the test.
 *
 * ⛔ `visible: false` ⇒ `null`, with no exceptions and no placeholder.
 */
export function outputForVerdict(
  verdict: VisibilityVerdict,
  value: string | number | null | undefined,
): string | null {
  if (!verdict.visible) return null;
  if (value === null || value === undefined) return null;
  const text = String(value);
  return text === '' ? null : text;
}
