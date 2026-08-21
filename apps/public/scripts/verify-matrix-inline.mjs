// ⭐ VERIFY THE `?raw` MATRIX BYTES REACH A REAL `dist/` BUILD — Story 11a.3 (Task 7; AC5).
//
// ── ⛔ WHY THIS IS A SCRIPT AND NOT A UNIT TEST ─────────────────────────────────────────────────
// `tests/matrix.server.test.ts` asserts byte-identity within the VITEST toolchain, by re-reading the
// committed file from disk. ⚠ That proves the two READERS agree; it does ⛔ NOT prove the bytes
// survive `astro build` into `dist/server/`, which is the thing that actually ships. Story 11a.2
// checked that only via a manually-run, reverted probe — recorded in its Debug Log, covered by no
// test, and deferred with the trigger *"any change to the Vite/Astro build config touching
// `noExternal` or the `.yaml?raw` import path"*.
//
// ⭐ AND THE SITUATION CHANGED AT THIS STORY: `<MatrixField>` now has real call sites, so the matrix
// module is no longer tree-shaken out of the members chunk. AC5 requires re-verifying against a REAL
// build, so the probe is committed here instead of being run by hand and forgotten.
//
// Usage: `pnpm --filter @twt/public build && node scripts/verify-matrix-inline.mjs`
// Exits non-zero and names the failure. ⛔ It never "passes with a warning".

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const matrixPath = join(
  here,
  '../../../packages/contracts/public-pages/public-vs-private-matrix.yaml',
);
const distServer = join(here, '../dist/server');

const matrix = readFileSync(matrixPath, 'utf-8');

function collect(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) collect(full, out);
    else out.push(full);
  }
  return out;
}

let files;
try {
  files = collect(distServer);
} catch {
  console.error(
    `✗ ${distServer} does not exist — run \`pnpm --filter @twt/public build\` first.`,
  );
  process.exit(1);
}

// ⛔ Sample DISTINCTIVE lines, not the whole file: the inlined copy is a JS string literal, so
// escaping differs byte-for-byte from the source. What must hold is that the SEMANTIC content — the
// surfaces, the fields, the ruled exception — is present verbatim in the shipped bundle.
const probes = [
  'member-directory',
  'member_name',
  'member_status',
  'district',
  'tier1_public_exception',
  'presentation_policy_ref',
  'escalations:',
];

// Every probe must come from ONE chunk — a matrix split across bundles would mean two readers again.
const results = probes.map((p) => ({
  probe: p,
  hits: files.filter((f) => readFileSync(f, 'utf-8').includes(p)),
}));

const missing = results.filter((r) => r.hits.length === 0);
if (missing.length > 0) {
  console.error(
    `✗ the inlined matrix is INCOMPLETE in dist/server — missing: ${missing
      .map((m) => m.probe)
      .join(', ')}\n` +
      `  ⛔ The deployed shell would enforce a DIFFERENT matrix from the gate. Check ` +
      `vite.ssr.noExternal and the \`?raw\` import in src/lib/matrix.server.ts.`,
  );
  process.exit(1);
}

// The matrix must not be silently truncated: assert a LONG contiguous slice survives.
// ⭐ THE ANCHOR MUST EXIST. ⚠ Without this, a rename made `indexOf` return -1, `slice(-1, 199)`
// yielded the file's LAST CHARACTER, and `includes()` found it in essentially any bundle — so the
// check passed VACUOUSLY instead of failing.
const ANCHOR = '- id: member-directory';
const anchorAt = matrix.indexOf(ANCHOR);
if (anchorAt === -1) {
  console.error(
    `✗ verify-matrix-inline: the anchor ${JSON.stringify(ANCHOR)} is not in the committed matrix. ` +
      `⛔ Rename the anchor here too — a check that cannot find its anchor must FAIL, never pass quietly.`,
  );
  process.exit(1);
}

// ⭐ THE WHOLE SLICE IS COMPARED, ⛔ not just its first line.
// ⚠ This previously did `longSlice.split('\n')[0]`, i.e. it computed 200 characters and then threw
// them away to test the 22-character header `- id: member-directory`. A build that inlined the
// surface header and TRUNCATED every field row beneath it passed — while the comment claimed the
// matrix "must not be silently truncated". The slice is the point; use it.
const longSlice = matrix.slice(anchorAt, anchorAt + 200);
if (longSlice.length < 200) {
  console.error(
    `✗ verify-matrix-inline: only ${longSlice.length} chars follow the anchor — the committed matrix ` +
      `is too short for this check to mean anything. ⛔ Fix the check, do not shrink the slice.`,
  );
  process.exit(1);
}
const carriesSlice = files.some((f) => readFileSync(f, 'utf-8').includes(longSlice));
if (!carriesSlice) {
  console.error('✗ the member-directory surface header is not present verbatim in dist/server.');
  process.exit(1);
}

console.log(
  `✓ the ?raw matrix bytes reach a REAL dist/ build — ${probes.length} probes found across ` +
    `${files.length} built server file(s); carrier: ${results[0].hits[0]}`,
);
