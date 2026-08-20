// Post-build page-weight manifest emitter (Story 2.5, Task 8; AC6b).
// ⭐ PER-ROUTE RESTRUCTURE — Story 11a.2 (Task 8; AC6), ruling D5(a).
//
// Emits `dist/page-weight.json` — the manifest the friction-budget gate reads
// (`friction-budget.yaml` surface `member-public-web`). Measures the STATIC client
// transfer Astro produces under `dist/client/`:
//   · js_bundle_bytes  — total bytes of client JS (0 with no hydrated islands).
//   · page_weight_bytes — total bytes of ALL static client assets (CSS + JS + …),
//                         i.e. what a visitor downloads beyond the dynamic HTML.
//   · routes           — ⭐ NEW: the same bytes ATTRIBUTED PER ROUTE.
// CSS is extracted (astro.config `inlineStylesheets: 'never'`) so it is counted here.
//
// ── ⚠ SAY WHICH ONE THIS IS: ATTRIBUTION, ⛔ NOT PER-ROUTE MEASUREMENT ───────
// The deferral this discharges asked to *"restructure to `routes: { '/niyamavali':
// <bytes> }`"*. That is what ships. ⛔ But be precise about what the number means:
//
//   · It attributes STATIC CLIENT ASSETS to the route whose component emitted them.
//     It is ⛔ NOT a measurement of each route's DYNAMIC HTML response, which is the
//     larger part of what a visitor actually downloads on an SSR surface. That
//     remains unmeasured here, and the live critical-render-path timing that would
//     capture it is the separately-deferred Lighthouse metric.
//   · SHARED chunks (`PublicShell.css`, imported by every page) are attributed to
//     EVERY route that uses them. ⇒ ⛔ the per-route figures DO NOT SUM to
//     `page_weight_bytes`; summing them double-counts the shared bytes. `shared_bytes`
//     is reported separately so the overlap is visible rather than hidden.
//   · The route↔asset join is by Astro's own chunk NAMING (a page's chunk carries the
//     page's basename). ⚠ That is a convention, not a contract: if Astro changes its
//     chunk naming, assets fall into `unattributed_bytes` — which is reported, ⛔ not
//     silently folded into a route or dropped.
//
// ⛔ THE GATE STILL EVALUATES THE AGGREGATE. `evaluateMetric` looks up
// `manifest[metric.id]`, a flat top-level read, so `js_bundle_bytes` and
// `page_weight_bytes` remain the gated numbers. The `routes` block is ATTRIBUTION FOR
// REVIEW — it is emitted, not enforced. ⚠ Saying so plainly matters: a per-route
// block that looked enforced but was not would be exactly the vacuous-green defect
// this epic keeps finding.
import { existsSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const clientDir = join(appRoot, 'dist', 'client');
const pagesDir = join(appRoot, 'src', 'pages');

/** Recursively collect `{ path, size }` for every file under `dir`. */
function walk(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    else out.push({ path: p, size: s.size });
  }
  return out;
}

/**
 * Enumerate shipped routes → the chunk basename Astro derives from the page file.
 * Mirrors `pageRouteFromPath` in the pii-scrape gate (Astro file-based routing), so
 * the two never disagree about what a route is called.
 */
function shippedRoutes(dir, prefix = '') {
  const routes = new Map();
  if (!existsSync(dir)) return routes;
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      for (const [r, b] of shippedRoutes(p, prefix === '' ? name : `${prefix}/${name}`)) {
        routes.set(r, b);
      }
    } else if (name.endsWith('.astro')) {
      const stem = name.replace(/\.astro$/, '');
      const rel = prefix === '' ? stem : `${prefix}/${stem}`;
      const segments = rel.split('/');
      if (segments[segments.length - 1] === 'index') segments.pop();
      const route = segments.length === 0 ? '/' : `/${segments.join('/')}`;
      // Astro sanitises `[postId]` → `_postId_` in emitted chunk names.
      routes.set(route, stem.replace(/[[\]]/g, '_'));
    }
  }
  return routes;
}

const files = walk(clientDir);
const bytesOf = (fs) => fs.reduce((sum, f) => sum + f.size, 0);
const isJs = (f) => f.path.endsWith('.js');

const jsBundleBytes = bytesOf(files.filter(isJs));
const pageWeightBytes = bytesOf(files);

// ── Per-route attribution ────────────────────────────────────────────────────
const routeBasenames = shippedRoutes(pagesDir);
const basenames = new Set(routeBasenames.values());

/** An asset belongs to a page when its chunk name starts with that page's basename. */
const chunkName = (f) => (f.path.split('/').pop() ?? '').split('.')[0];
const ownedBy = (f) => {
  const name = chunkName(f);
  return basenames.has(name) ? name : null;
};

const sharedFiles = files.filter((f) => ownedBy(f) === null);
// `PublicShell` is a real shared component chunk; anything else unowned is a chunk
// whose name we could not join — reported separately rather than assumed shared.
const isKnownShared = (f) => chunkName(f) === 'PublicShell';
const knownShared = sharedFiles.filter(isKnownShared);
const unattributed = sharedFiles.filter((f) => !isKnownShared(f));

const routes = {};
for (const [route, basename] of [...routeBasenames].sort()) {
  const own = files.filter((f) => ownedBy(f) === basename);
  routes[route] = {
    own_bytes: bytesOf(own),
    shared_bytes: bytesOf(knownShared),
    page_weight_bytes: bytesOf(own) + bytesOf(knownShared),
    js_bundle_bytes: bytesOf(own.filter(isJs)) + bytesOf(knownShared.filter(isJs)),
  };
}

const manifest = {
  // ⛔ The GATED numbers. Flat top-level keys, because `evaluateMetric` reads
  // `manifest[metric.id]`. Do not nest these.
  js_bundle_bytes: jsBundleBytes,
  page_weight_bytes: pageWeightBytes,
  // ⚠ ATTRIBUTION ONLY — emitted for review, ⛔ not enforced. See the header.
  routes,
  shared_bytes: bytesOf(knownShared),
  unattributed_bytes: bytesOf(unattributed),
};

const outPath = join(appRoot, 'dist', 'page-weight.json');
writeFileSync(outPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(
  `[page-weight] aggregate js=${jsBundleBytes} total=${pageWeightBytes}; ` +
    `${Object.keys(routes).length} route(s) attributed, shared=${manifest.shared_bytes}, ` +
    `unattributed=${manifest.unattributed_bytes} → ${outPath}`,
);
