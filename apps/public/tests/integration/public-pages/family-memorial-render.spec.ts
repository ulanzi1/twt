// Story 11b.4a — the family memorial on the RENDERED public page, and its photo endpoint, against the BUILT server (Task 6.5;
// AC3, AC4, AC5; Traps 8, 9, 12, 16).
//
// ⭐ WHY A BUILT SERVER, ⛔ a component harness: `apps/public` has ⛔ no `.astro` render harness (this Vitest's Vite cannot load
// Astro 6's plugins), and the story owes a BUILT-IMAGE proof anyway — dev mode and unit tests both pass where only the built
// image fails (Trap 16). ⇒ `beforeAll` builds the app ONCE (Astro's programmatic `build()`, into its own `outDir` so a concurrent
// `astro build` of `dist/` is ⛔ never raced), starts `dist/server/entry.mjs` against a STUB API, and every assertion below is on
// the real HTML / the real response.
// The page reads the Pariwar passport (branding) from Postgres ⇒ skips when DATABASE_URL is unset, like every live spec.
// Story 11b.5 (AC3, AC11 (5)–(6); `2026-10-29-420` MV4 / MV5): the frame is now `<PortraitFrame>`, its border the
// `border-funeral-frame` token — the frame regex reads the token form; the section's two `data-field`s and its h2 < figure < p
// order are pinned here; and a photo whose description was left out still carries an (empty) `alt`.

import { spawn, type ChildProcess } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { createServer, type IncomingHttpHeaders, type Server } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const hasDatabase = Boolean(process.env['DATABASE_URL']);
const appRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

const RLO = '\u202e';
const FSI = '\u2068';
const PDI = '\u2069';
const WORDS = ['माँ हमेशा मुस्कुराती थीं।  वे सबकी\nमदद करती थीं।', `${FSI}English with ${RLO}an override${PDI} kept as sent.`];
const ALT = 'माँ बगीचे में';
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0xff, 0xd9]);

/** One drive, as the API serves it; `familyMemorial` is switched by the test (the state the stub answers with). */
function body(familyMemorial: unknown) {
  return {
    drive: {
      poolLetterCode: 'C',
      poolCanonicalIdentifier: 'P-2026-10-001',
      driveStatus: 'closed',
      closedAt: '2026-10-01T10:00:00.000Z',
      district: 'Lucknow',
      deceasedMemberName: null,
      confirmedContributionCount: 12,
      amountRaisedInr: 6000,
      fundingOutcome: 'fully_funded',
      appealReversal: null,
      nomineeBankAccounts: [],
      familyMemorial,
    },
    items: [{ name: 'Sunita Devi' }],
    page: 1,
    limit: 50,
    total: 1,
  };
}

let memorialState: unknown = null;
let photoUpstream: 'ok' | '400' | '404' | '500' = 'ok';
const photoRequests: { url: string; headers: IncomingHttpHeaders }[] = [];

describe.skipIf(!hasDatabase)('Story 11b.4a — the family memorial on the BUILT public page (real HTML)', { timeout: 120_000 }, () => {
  let stub: Server;
  let child: ChildProcess;
  let outDir: string;
  let origin: string;

  beforeAll(async () => {
    stub = createServer((req, res) => {
      const url = req.url ?? '';
      if (url.includes('/memorial-photo')) {
        photoRequests.push({ url, headers: req.headers });
        if (photoUpstream === '404') {
          res.writeHead(404);
          return res.end();
        }
        if (photoUpstream === '400') {
          res.writeHead(400, { 'content-type': 'application/json' });
          return res.end('{}');
        }
        if (photoUpstream === '500') {
          res.writeHead(500, { 'content-type': 'application/json' });
          return res.end('{}');
        }
        // ⚠ An upstream header the endpoint must ⛔ NOT forward (it builds its own).
        res.writeHead(200, { 'content-type': 'image/jpeg', 'x-upstream-only': 'leak', 'cache-control': 'private, no-cache' });
        return res.end(JPEG);
      }
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(body(memorialState)));
    });
    await new Promise<void>((r) => stub.listen(0, '127.0.0.1', () => r()));
    const stubOrigin = `http://127.0.0.1:${(stub.address() as { port: number }).port}`;

    // ⚠ Under the app's own `node_modules/.cache` (git-ignored): the built entry resolves its packages by walking UP from its own
    // path, so an outDir under the OS temp dir cannot find them.
    const cacheDir = join(appRoot, 'node_modules', '.cache');
    mkdirSync(cacheDir, { recursive: true });
    outDir = mkdtempSync(join(cacheDir, 'render-proof-'));
    const { build } = await import('astro');
    await build({ root: appRoot, outDir, logLevel: 'error' });

    const port = 4400 + Math.floor(Math.random() * 400);
    child = spawn('node', [join(outDir, 'server', 'entry.mjs')], {
      cwd: appRoot,
      env: { ...process.env, PUBLIC_API_ORIGIN: stubOrigin, HOST: '127.0.0.1', PORT: String(port), NODE_ENV: 'production' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stderr = '';
    child.stderr?.on('data', (d: Buffer) => (stderr += d.toString()));
    origin = `http://127.0.0.1:${port}`;
    let ready = false;
    for (let i = 0; i < 80 && !ready; i += 1) {
      try {
        ready = (await fetch(`${origin}/sahyog-vivran/probe`)).status < 500;
      } catch {
        ready = false;
      }
      // ⭐ Back off on a 5xx too — a server that answers 500 while it boots would otherwise burn all 80 tries in a tight loop.
      if (!ready) await new Promise((r) => setTimeout(r, 250));
    }
    // ⛔ Fail LOUD — a server that never came up must ⛔ not read as six unrelated failures.
    if (!ready) throw new Error(`the built server did not come up at ${origin}: ${stderr.slice(0, 2000)}`);
  }, 120_000);

  afterAll(async () => {
    child?.kill();
    await new Promise<void>((r) => (stub ? stub.close(() => r()) : r()));
    if (outDir) rmSync(outDir, { recursive: true, force: true });
  });

  const page = async (token = 'tok-A') => {
    const res = await fetch(`${origin}/sahyog-vivran/${token}?lang=en`);
    return { status: res.status, html: await res.text() };
  };
  const headOf = (html: string) => html.slice(0, html.indexOf('</head>'));
  const bodyOf = (html: string) => html.slice(html.indexOf('<body'));

  it('⭐ AC3 — the section renders after the facts and before the contributors: pre-wrap, `dir="auto"`, ⛔ `lang`, the words AS GIVEN, the framed photo with the family\'s description', async () => {
    memorialState = { words: WORDS, photo: { altText: ALT } };
    const { status, html } = await page();
    expect(status).toBe(200);
    const b = bodyOf(html);
    const sectionAt = b.indexOf('aria-labelledby="sv-family-memorial-heading"');
    // ⚠ PRESENCE FIRST: `indexOf` is -1 for an absent marker, and `slice(-1)` / `-1 < n` both PASS vacuously on it.
    expect(sectionAt, 'the memorial section is on the page').toBeGreaterThan(-1);
    const section = b.slice(sectionAt);
    expect(section.length).toBeLessThan(b.length);
    expect(b).toContain('In the family&#39;s words');
    // ⭐ The ORDER: the facts group, THEN the memorial, THEN the contributor list.
    const at = { facts: b.indexOf('Drive details'), memorial: b.indexOf('sv-family-memorial-heading'), contributors: b.indexOf('sv-contributors-heading') };
    for (const [name, i] of Object.entries(at)) expect(i, `the ${name} marker is on the page`).toBeGreaterThan(-1);
    expect(at.facts).toBeLessThan(at.memorial);
    expect(at.memorial).toBeLessThan(at.contributors);
    // ⭐ Each paragraph: `dir="auto"`, `white-space: pre-wrap`, the text as given (the double space, the single newline, the
    // isolates and the override — ⛔ escaped into markup, ⛔ collapsed, ⛔ re-ordered).
    const paragraphs = [...section.matchAll(/<p([^>]*)>([\s\S]*?)<\/p>/g)].slice(0, 2);
    expect(paragraphs).toHaveLength(2);
    for (const [, attrs, text] of paragraphs) {
      expect(attrs).toContain('dir="auto"');
      expect(attrs).toContain('white-space: pre-wrap');
      expect(attrs).not.toMatch(/\blang=/);
      expect(WORDS).toContain(text);
    }
    // ⭐ The photo: the page's OWN route, lazy, async, the description as given, inside the nested frame.
    expect(section).toMatch(
      /<figure[^>]*>\s*<div[^>]*border: var\(--border-funeral-frame\) solid var\(--color-ink-primary\); padding: 6pt;[^>]*>\s*<div[^>]*aspect-ratio: 4 \/ 5[^>]*>\s*<img/,
    );
    const img = /<img([^>]*)>/.exec(section)![1]!;
    expect(img).toContain('src="/sahyog-vivran/tok-A/memorial-photo"');
    expect(img).toContain(`alt="${ALT}"`);
    expect(img).toContain('loading="lazy"');
    expect(img).toContain('decoding="async"');
    // ⭐ Story 11b.5 (AC3) — the matrix field ids stay on the section and the figure, and the heading leads the photo and the words.
    const sectionTag = /<section[^>]*aria-labelledby="sv-family-memorial-heading"[^>]*>/.exec(b)?.[0];
    expect(sectionTag, 'the <section> opening tag').toBeTruthy();
    expect(sectionTag).toContain('data-field="family_memorial_words"');
    const figureTag = /<figure[^>]*>/.exec(section)?.[0];
    expect(figureTag, 'the <figure> opening tag').toBeTruthy();
    expect(figureTag).toContain('data-field="family_memorial_photo"');
    const order = { h2: section.indexOf('<h2'), figure: section.indexOf('<figure'), p: section.indexOf('<p') };
    for (const [name, i] of Object.entries(order)) expect(i, `the section's <${name}>`).toBeGreaterThan(-1);
    expect(order.h2).toBeLessThan(order.figure);
    expect(order.figure).toBeLessThan(order.p);
  });

  it('⭐ Story 11b.5 AC1 — a photo whose description was LEFT OUT still renders an `alt` (empty: Astro emits it bare), ⛔ never no `alt` at all', async () => {
    memorialState = { words: WORDS, photo: { altText: '' } };
    const { html } = await page();
    memorialState = null;
    const b = bodyOf(html);
    const sectionAt = b.indexOf('aria-labelledby="sv-family-memorial-heading"');
    expect(sectionAt, 'the memorial section is on the page').toBeGreaterThan(-1);
    const img = /<img[^>]*>/.exec(b.slice(sectionAt))?.[0];
    expect(img, 'the framed photo').toBeTruthy();
    expect(img).toContain('src="/sahyog-vivran/tok-A/memorial-photo"');
    expect(img).toMatch(/\salt(?:=""|[\s>/])/);
  });

  it('⭐ AC3 / `-411` item 3 — ⛔ NO marker of a part left out: ⛔ the copy, ⛔ the key, ⛔ an element or class names one', async () => {
    memorialState = { words: WORDS, photo: { altText: ALT } };
    const { html } = await page();
    expect(bodyOf(html)).toContain('माँ हमेशा मुस्कुराती थीं।'); // non-vacuity: the section is there
    for (const marker of ['render.omitted', 'left out by the Trust', 'छोड़ा गया', 'omitted', 'removed', 'taken down', 'redact']) {
      expect(html.toLowerCase(), marker).not.toContain(marker.toLowerCase());
    }
  });

  it('⭐ Trap 12 — ⛔ nothing of the memorial reaches `<head>` (⛔ title, ⛔ description, ⛔ Open Graph, ⛔ og:image) — after asserting the BODY carries the words and the photo URL', async () => {
    memorialState = { words: WORDS, photo: { altText: ALT } };
    const { html } = await page();
    const b = bodyOf(html);
    expect(b).toContain(WORDS[0]);
    expect(b).toContain('/sahyog-vivran/tok-A/memorial-photo');
    const h = headOf(html);
    expect(h.length).toBeGreaterThan(0);
    for (const leak of ['माँ', 'मुस्कुराती', ALT, 'memorial-photo', 'override']) expect(h, leak).not.toContain(leak);
    expect(h).not.toMatch(/og:image/);
  });

  it('⭐⭐ AC5 — ⛔ no trace: the page with its memorial TAKEN DOWN is BYTE-IDENTICAL to the page before any memorial was written (the middle render carries the section)', async () => {
    memorialState = null;
    const before = await page();
    memorialState = { words: WORDS, photo: { altText: ALT } };
    const middle = await page();
    memorialState = null;
    const after = await page();
    expect(middle.html).toContain('sv-family-memorial-heading');
    expect(before.html).not.toContain('sv-family-memorial-heading');
    expect(after.status).toBe(before.status);
    expect(after.html).toBe(before.html);
  });

  it('⭐ R22 / Trap 9 — a memorial with NOTHING in it (`words: []`, no photo) draws ⛔ no heading — and the section IS drawn the moment it holds words', async () => {
    memorialState = { words: WORDS, photo: null };
    const withWords = await page();
    expect(withWords.html).toContain('sv-family-memorial-heading'); // non-vacuity: the same request shape DOES draw it
    memorialState = { words: [], photo: null };
    const empty = await page();
    memorialState = null;
    expect(empty.status).toBe(200);
    expect(empty.html).not.toContain('sv-family-memorial-heading');
    expect(empty.html).not.toContain('In the family&#39;s words');
  });

  it('⭐ AC4 — the photo endpoint: `image/jpeg`, the page\'s cache posture, nosniff; its OWN headers (⛔ the upstream\'s); ⛔ the query string, ⛔ the cookie', async () => {
    photoUpstream = 'ok';
    photoRequests.length = 0;
    const res = await fetch(`${origin}/sahyog-vivran/tok-A/memorial-photo?v=99&lang=en`, { headers: { cookie: 'sid=secret', 'x-custom': 'nope' } });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/jpeg');
    expect(res.headers.get('cache-control')).toBe('public, max-age=60, s-maxage=300');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('x-upstream-only')).toBeNull();
    expect(res.headers.get('set-cookie')).toBeNull();
    expect(Buffer.from(await res.arrayBuffer())).toEqual(JPEG);
    expect(photoRequests).toHaveLength(1);
    expect(photoRequests[0]!.url).toMatch(/\/public-pages\/sahyog-vivran\/tok-A\/memorial-photo$/);
    expect(photoRequests[0]!.headers['cookie']).toBeUndefined();
    expect(photoRequests[0]!.headers['x-custom']).toBeUndefined();
  });

  it('⭐ Trap 9 — an upstream 404 is an EMPTY 404 with the page\'s cache posture (whatever the reason); an upstream fault is 503 + no-store', async () => {
    photoUpstream = '404';
    const nf = await fetch(`${origin}/sahyog-vivran/tok-A/memorial-photo`);
    expect(nf.status).toBe(404);
    expect(await nf.text()).toBe('');
    expect(nf.headers.get('cache-control')).toBe('public, max-age=60, s-maxage=300');
    // RT5 / RU1 — a token the route's param refuses is the SAME empty 404, decided HERE (⛔ upstream call) …
    photoRequests.length = 0;
    const bad = await fetch(`${origin}/sahyog-vivran/${'x'.repeat(65)}/memorial-photo`);
    expect(bad.status).toBe(404);
    expect(await bad.text()).toBe('');
    expect(bad.headers.get('cache-control')).toBe('public, max-age=60, s-maxage=300');
    expect(photoRequests).toHaveLength(0);
    // … and an upstream 400 on a valid token is an OUTAGE (a misconfiguration), ⛔ a cached "no such photo".
    photoUpstream = '400';
    const misconfigured = await fetch(`${origin}/sahyog-vivran/tok-A/memorial-photo`);
    expect(misconfigured.status).toBe(503);
    expect(misconfigured.headers.get('cache-control')).toBe('no-store');
    photoUpstream = '500';
    const down = await fetch(`${origin}/sahyog-vivran/tok-A/memorial-photo`);
    expect(down.status).toBe(503);
    expect(down.headers.get('cache-control')).toBe('no-store');
    photoUpstream = 'ok';
  });
});
