// Post-build page-weight manifest emitter (Story 2.5, Task 8; AC6b).
//
// Emits `dist/page-weight.json` — the manifest the friction-budget gate reads
// (`friction-budget.yaml` surface `member-public-web`). Measures the STATIC client
// transfer Astro produces under `dist/client/`:
//   · js_bundle_bytes  — total bytes of client JS (0 with no hydrated islands).
//   · page_weight_bytes — total bytes of ALL static client assets (CSS + JS + …),
//                         i.e. what a visitor downloads beyond the dynamic HTML.
// CSS is extracted (astro.config `inlineStylesheets: 'never'`) so it is counted here.
// The dynamic-HTML weight + live critical-render-path timing on the canonical device
// is the EXPLICITLY DEFERRED Lighthouse metric (friction-budget.yaml deferred_metrics).
import { existsSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const clientDir = join(appRoot, 'dist', 'client');

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

const files = walk(clientDir);
const jsBundleBytes = files
  .filter((f) => f.path.endsWith('.js'))
  .reduce((sum, f) => sum + f.size, 0);
const pageWeightBytes = files.reduce((sum, f) => sum + f.size, 0);

const manifest = { js_bundle_bytes: jsBundleBytes, page_weight_bytes: pageWeightBytes };
const outPath = join(appRoot, 'dist', 'page-weight.json');
writeFileSync(outPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`[page-weight] ${JSON.stringify(manifest)} → ${outPath}`);
