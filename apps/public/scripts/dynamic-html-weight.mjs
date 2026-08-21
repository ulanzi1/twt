// ⭐ DYNAMIC SSR HTML WEIGHT — Story 11a.3 (Task 10; AC8), Decision `2026-08-20-143` cl.6 (D6(a)).
//
// ── ⭐ WHAT THIS MEASURES, AND WHY IT IS A DIFFERENT QUANTITY ───────────────────────────────────
// `page-weight.mjs` attributes STATIC CLIENT ASSETS (CSS + JS under `dist/client/`) per route. Its
// own header says, in terms, that it is ⛔ NOT a measurement of each route's DYNAMIC HTML response
// — *"the larger part of what a visitor actually downloads on an SSR surface"* — and that the
// dynamic part *"remains unmeasured here"*.
//
// ⭐ THIS SCRIPT MEASURES THAT MISSING HALF, for the one route where it actually varies with data:
// the real HTML bytes `/members` emits, at a FULL PAGE AT THE FR-91 CAP.
//
// ⛔⛔ THE TWO NUMBERS MUST NEVER BE SUMMED OR COMPARED. They are different quantities measured in
// different ways: one is a build-time attribution of files a browser caches across navigations, the
// other is a per-request response body that is re-sent every time and grows with the roster. Adding
// them would produce a figure describing nothing. The manifest below therefore lands in its OWN
// file with its OWN key names — ⛔ it is deliberately NOT merged into `page-weight.json`, where a
// future reader would inevitably total the columns.
//
// ── HOW IT IS MEASURED, HONESTLY ───────────────────────────────────────────────────────────────
// The REAL built standalone server is booted and a REAL request is made. The only substitution is
// the upstream: `PUBLIC_API_ORIGIN` points at a local stub returning a full page of synthetic rows
// at the cap. ⚠ So this measures the SHELL + THE ROW MARKUP faithfully; it does ⛔ NOT measure
// database or network latency, and it is ⛔ NOT a timing metric. The device-throttled Lighthouse
// harness that WOULD capture timing stays deferred (D6(a)) — ⛔ say which one you built.
//
// ⚠ REQUIRES `DATABASE_URL`: the page reads the Pariwar passport for branding, exactly as it does
// in production. That read is part of the real render, so it is exercised rather than stubbed —
// stubbing it would understate the shell.
//
// Usage: `DATABASE_URL=… pnpm --filter @twt/public build && node scripts/dynamic-html-weight.mjs`

import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

/** The FR-91 page-size cap. ⛔ Imported meaning, not a re-typed literal — see the assert below. */
const CAP = 50;

/** A synthetic page. Names/districts sized like realistic Indian records, ⛔ not "aaa". */
function stubPage(limit) {
  const items = Array.from({ length: limit }, (_, i) => ({
    name: `Rajesh Kumar Sharma ${String(i).padStart(2, '0')}`,
    district: ['Lucknow', 'Kanpur', 'Gorakhpur', 'Muzaffarpur'][i % 4],
    // ⛔ THE PUBLIC WIRE TOKEN, ⛔ never the internal `lock-in` (`2026-08-21-144` cl.4).
    // ⚠ This stub used to emit `lock-in`, which `isDirectoryResponse` REJECTS — so the fetch
    // resolved to `bad_response`, the page rendered the outage state with zero rows, and this
    // script's own "the stub was not consumed" guard threw on EVERY run. ⛔ Nothing in CI runs this
    // script, so nothing reported that the AC8 measurement deliverable could not execute at all.
    status: i % 7 === 0 ? 'waiting-period' : 'active',
  }));
  return { items, page: 1, limit, total: 5000 };
}

const stub = createServer((req, res) => {
  // ⚠ HONOURS `limit`. An earlier draft ignored it and returned a full page for every request, which
  // silently made the single-row BASELINE render 50 rows too — and reported a marginal cost of
  // 0 B/row. A measurement harness that cannot vary its input measures nothing.
  const limit = Number(new URL(req.url, 'http://x').searchParams.get('limit') ?? CAP);
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify(stubPage(Math.max(1, Math.min(limit, CAP)))));
});

async function listen(server) {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return `http://127.0.0.1:${server.address().port}`;
}

async function waitFor(url, attempts = 60) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await fetch(url);
      if (res.status < 500) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`server did not become ready at ${url}`);
}

const stubOrigin = await listen(stub);
const port = 4331;

const child = spawn('node', ['./dist/server/entry.mjs'], {
  cwd: appRoot,
  env: { ...process.env, PUBLIC_API_ORIGIN: stubOrigin, HOST: '127.0.0.1', PORT: String(port) },
  stdio: ['ignore', 'pipe', 'pipe'],
});
child.stderr.on('data', (d) => process.stderr.write(`[ssr] ${d}`));

let manifest;
try {
  await waitFor(`http://127.0.0.1:${port}/members`);

  const measure = async (path) => {
    const res = await fetch(`http://127.0.0.1:${port}${path}`);
    const html = await res.text();
    return { status: res.statusCode ?? res.status, bytes: Buffer.byteLength(html, 'utf-8'), html };
  };

  const full = await measure(`/members?limit=${CAP}`);
  const empty = await measure('/members?limit=1');

  // ⛔ FAIL LOUD IF THE MEASUREMENT IS NOT MEASURING THE THING. A page that 500'd, or that rendered
  // the outage state, would still produce a plausible byte count — and a number that describes the
  // wrong page is worse than no number.
  if (full.status !== 200) throw new Error(`/members returned ${full.status}, not 200`);
  if (!full.html.includes('Rajesh Kumar Sharma')) {
    throw new Error('the measured HTML contains no member rows — the stub was not consumed');
  }
  // ⚠ Count by the DATA-FIELD marker `<MatrixField>` emits, ⛔ not by `<tr>`: Astro appends scoped
  // style classes to elements, so a bare `<tr>` literal matches nothing in the real output. Counting
  // `data-field="member_name"` also asserts the value came THROUGH the component rather than being
  // interpolated directly — which is AC5's actual requirement.
  const rowCount = (full.html.match(/data-field="member_name"/g) ?? []).length;
  if (rowCount !== CAP) {
    throw new Error(`expected ${CAP} rendered rows at the cap, measured ${rowCount}`);
  }

  manifest = {
    _README:
      'DYNAMIC SSR HTML bytes. ⛔ A DIFFERENT QUANTITY from dist/page-weight.json, which attributes ' +
      'STATIC CLIENT ASSETS. ⛔ NEVER sum or compare the two: one is a cached build artifact, the ' +
      'other is a per-request response body that grows with the roster. Emitted for review; ⛔ NOT ' +
      'gated (Story 11a.3, D6(a)). ⛔ NOT a timing metric — the device-throttled Lighthouse harness ' +
      'that would measure timing remains deferred.',
    measured_at_page_size: CAP,
    routes: {
      '/members': {
        dynamic_html_bytes_at_cap: full.bytes,
        dynamic_html_bytes_single_row: empty.bytes,
        // The marginal cost of a directory row — the number that actually scales with the roster.
        bytes_per_row: Math.round((full.bytes - empty.bytes) / (CAP - 1)),
        rendered_rows: rowCount,
      },
    },
  };

  const out = join(appRoot, 'dist', 'dynamic-html-weight.json');
  writeFileSync(out, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(
    `[dynamic-html] /members at the cap (${CAP} rows) = ${full.bytes} bytes; ` +
      `single row = ${empty.bytes}; marginal = ${manifest.routes['/members'].bytes_per_row} B/row → ${out}`,
  );
  console.log(
    '[dynamic-html] ⛔ NOT comparable with dist/page-weight.json (static client assets). Different quantity.',
  );
} finally {
  child.kill('SIGTERM');
  stub.close();
}
