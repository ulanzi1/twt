// Headless-Chromium `ContributionNotePdfRenderer` adapter — Story 8.7 (Task 2; AC2).
//
// The ONE place the render engine lives. The port (`@twt/contracts`
// `ContributionNotePdfRenderer`) is engine-neutral; everything Chromium-shaped is confined here, the
// `claim-document-storage/gcs.ts` precedent. If the container weight later becomes a deployment
// problem, this file moves to a jobs-side render service and neither the resolver, the route, nor the
// template changes.
//
// ── Why Chromium and not a pure-JS PDF library (D1) ────────────────────────────────────────────────
// AC2 asks for TWO things at once, and the combination eliminates every popular choice:
//   · `pdfkit` / `pdfmake` / `@react-pdf/renderer` embed fonts via fontkit but perform NO complex-script
//     shaping — no Devanagari GSUB reordering, no GPOS mark positioning. Matras attach to the wrong
//     base, conjuncts fail to form, and `ि` renders AFTER its consonant instead of before. They do not
//     ERROR; they silently render wrong Hindi that passes every Latin smoke test. None emit a structure
//     tree either, so the tagged-PDF leg fails too.
//   · `pdf-lib` does no shaping at all and has no tagged-PDF support.
//   · `harfbuzzjs` (WASM) + `pdf-lib` shapes correctly but needs a hand-built structure tree — a large
//     amount of bespoke PDF-internals code for one artifact.
//   · Headless Chromium runs HarfBuzz (correct Devanagari) AND exports tagged PDF (`tagged: true`,
//     default since Puppeteer v11). The template is then plain HTML/CSS — reviewable, i18n-able,
//     styleable against the design tokens.
//
// ── `puppeteer-core`, NOT `puppeteer` (an implementation refinement of D1) ─────────────────────────
// `puppeteer` downloads a ~170 MB glibc Chromium at install time. The apps/api Dockerfile builds on
// `node:22-alpine` (musl), where that bundled binary DOES NOT RUN — and the download would tax every
// `pnpm install` and CI cache besides. `puppeteer-core` brings no binary: the deployable image installs
// the distro `chromium` package and points `executablePath` at it. Same engine, same D1 reasoning; only
// the delivery of the binary differs. `executablePath` is injectable so tests/dev can point at a local
// Chrome.
//
// ── Fonts: the failure that passes every test and ships tofu (D5) ──────────────────────────────────
// A slim headless-Chromium container has NO Devanagari font. Every unit test passes (the fake renderer
// returns fake bytes), the route returns a valid PDF, and the member downloads a document where every
// Hindi glyph is `▯` — while the Latin numerals look perfect, which is what makes it easy to miss.
// The defence is NOT in this adapter: the TEMPLATE inlines its own vendored face as a data URI, so the
// document carries its font and a font-less container cannot produce tofu. This adapter's job is only
// to (a) never fetch from the network and (b) wait for fonts to be ready before printing.
//
// ── Operational guards (Task 2) — a PDF render is orders of magnitude more expensive than any other
//    member read in this app ───────────────────────────────────────────────────────────────────────
// ONE lazily-created browser reused across renders, restarted on crash; a hard per-render timeout; a
// concurrency cap (excess renders queue rather than fork N browsers); an output byte cap.

import type {
  ContributionNotePdfRenderOptions,
  ContributionNotePdfRenderer,
} from '@twt/contracts';
import type { Browser, LaunchOptions } from 'puppeteer-core';

/** Default per-render wall-clock ceiling. A hung browser must fail the request, not the process. */
const DEFAULT_TIMEOUT_MS = 15_000;

/**
 * Default output ceiling (8 MiB). A one-page certificate with an inlined ~220 KB font subset lands
 * around a few hundred KB; this bounds a pathological render without constraining a legitimate one.
 */
const DEFAULT_MAX_BYTES = 8 * 1024 * 1024;

/**
 * Default simultaneous renders. Chromium pages are memory-hungry; beyond a handful the box thrashes.
 * Excess renders QUEUE (bounded wait via the per-render timeout), they do not spawn more browsers.
 */
const DEFAULT_MAX_CONCURRENT_RENDERS = 2;

/**
 * The distro Chromium path on the Alpine/Debian images the deployable containers build from. Overridden
 * per-environment by `executablePath` (dev/macOS points at a local Chrome). Deliberately NOT a
 * puppeteer-managed download — see the header.
 */
const DEFAULT_EXECUTABLE_PATH = '/usr/bin/chromium-browser';

/** Reject with `message` if `promise` has not settled within `ms` — clears its timer either way. */
function raceTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err: unknown) => {
        clearTimeout(timer);
        reject(err instanceof Error ? err : new Error(String(err)));
      },
    );
  });
}

export interface ChromiumContributionNotePdfRendererOpts {
  /** Chromium binary path. Defaults to the distro path in the deployable image. */
  readonly executablePath?: string;
  /** Per-render wall-clock ceiling (ms). Overridable per render via the port options. */
  readonly timeoutMs?: number;
  /** Output byte ceiling. Overridable per render via the port options. */
  readonly maxBytes?: number;
  /** Simultaneous renders before queueing. */
  readonly maxConcurrentRenders?: number;
  /** Extra Chromium flags (container sandboxing varies by platform). */
  readonly launchArgs?: readonly string[];
}

/** The renderer plus its lifecycle handle (the browser must be closable on shutdown). */
export interface ChromiumContributionNotePdfRenderer extends ContributionNotePdfRenderer {
  /** Close the shared browser (graceful shutdown). Safe to call when none was ever launched. */
  close(): Promise<void>;
}

/**
 * Build the headless-Chromium renderer. The browser is created LAZILY on the first render (so an API
 * instance that never serves a Note never pays for a browser) and reused across renders, with
 * crash-restart: a disconnected browser is discarded and relaunched on the next call.
 */
export function createChromiumContributionNotePdfRenderer(
  opts: ChromiumContributionNotePdfRendererOpts = {},
): ChromiumContributionNotePdfRenderer {
  const executablePath = opts.executablePath ?? DEFAULT_EXECUTABLE_PATH;
  const defaultTimeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const defaultMaxBytes = opts.maxBytes ?? DEFAULT_MAX_BYTES;
  const maxConcurrent = Math.max(1, opts.maxConcurrentRenders ?? DEFAULT_MAX_CONCURRENT_RENDERS);

  let browser: Browser | null = null;
  let launching: Promise<Browser> | null = null;
  let active = 0;
  const waiters: Array<() => void> = [];

  /**
   * Acquire one of `maxConcurrent` render slots, bounded by `timeoutMs`. Without this bound a queued
   * render waits INDEFINITELY behind a stuck one (a hung `document.fonts.ready` or a stalled
   * `puppeteer.launch()`), permanently starving every other member's Note request on a 2-slot pool.
   */
  async function acquireSlot(timeoutMs: number): Promise<void> {
    if (active < maxConcurrent) {
      active += 1;
      return;
    }
    await new Promise<void>((resolve, reject) => {
      const waiter = (): void => {
        clearTimeout(timer);
        resolve();
      };
      const timer = setTimeout(() => {
        const idx = waiters.indexOf(waiter);
        if (idx !== -1) waiters.splice(idx, 1);
        reject(new Error(`[contribution-note-pdf] render queue wait exceeded ${timeoutMs}ms`));
      }, timeoutMs);
      waiters.push(waiter);
    });
    active += 1;
  }

  function releaseSlot(): void {
    active -= 1;
    const next = waiters.shift();
    if (next) next();
  }

  async function getBrowser(): Promise<Browser> {
    // Crash-restart: a browser that died (OOM kill, container signal) must not poison every later render.
    if (browser !== null && browser.connected) return browser;
    browser = null;
    if (launching === null) {
      const launchOptions: LaunchOptions = {
        executablePath,
        headless: true,
        args: [
          // Container-standard hardening/compat flags. `--no-sandbox` is required in the unprivileged
          // container; the page only ever loads our OWN fully-inlined HTML (no network, no remote
          // origin, no member-supplied markup), so the sandbox is not the boundary doing the work here.
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          ...(opts.launchArgs ?? []),
        ],
      };
      // Imported lazily so merely importing this module (e.g. from the package barrel in a test that
      // uses the FAKE renderer) never loads the engine.
      launching = import('puppeteer-core')
        .then((puppeteer) => puppeteer.default.launch(launchOptions))
        .finally(() => {
          launching = null;
        });
    }
    browser = await launching;
    return browser;
  }

  return {
    async render(html: string, renderOpts: ContributionNotePdfRenderOptions): Promise<Uint8Array> {
      const timeoutMs = renderOpts.timeoutMs ?? defaultTimeoutMs;
      const maxBytes = renderOpts.maxBytes ?? defaultMaxBytes;

      await acquireSlot(timeoutMs);
      try {
        const b = await getBrowser();
        const page = await b.newPage();
        try {
          page.setDefaultTimeout(timeoutMs);
          // OFFLINE BY CONSTRUCTION (D5): the template is fully self-contained (CSS + fonts inlined), so
          // ANY outbound request is a bug — a remote font would silently substitute in dev and tofu in
          // prod. Abort every non-inline request rather than letting one succeed by accident.
          await page.setRequestInterception(true);
          page.on('request', (req) => {
            const url = req.url();
            if (url.startsWith('data:') || url.startsWith('about:') || url.startsWith('blob:')) {
              void req.continue();
            } else {
              void req.abort();
            }
          });

          await page.setContent(html, { waitUntil: 'load', timeout: timeoutMs });
          // Wait for the inlined @font-face to be parsed + ready BEFORE printing. Without this the first
          // render of a cold page can lay out against a fallback metric.
          // Passed as a STRING expression, not a closure: this package has no `dom` lib (it is a
          // server-side adapter), so `document` is deliberately not a compile-time name here. Puppeteer
          // awaits the returned promise in the page context either way.
          // `page.evaluate` has no built-in timeout (unlike `setContent`/`page.pdf` above) — a
          // font-load stall would otherwise hang past `timeoutMs` while still holding a concurrency slot.
          await raceTimeout(
            page.evaluate('document.fonts.ready'),
            timeoutMs,
            '[contribution-note-pdf] fonts.ready wait timed out',
          );

          const buffer = await page.pdf({
            format: 'a4',
            printBackground: true,
            // AC2: emit the structure tree so a screen reader reads the document in logical order.
            tagged: true,
            // The template owns its own page margins (the certificate register needs full-bleed rules).
            margin: { top: '0', right: '0', bottom: '0', left: '0' },
            timeout: timeoutMs,
          });

          const bytes = new Uint8Array(buffer);
          if (bytes.byteLength > maxBytes) {
            throw new Error(
              `[contribution-note-pdf] render exceeded the byte cap (${bytes.byteLength} > ${maxBytes})`,
            );
          }
          if (bytes.byteLength === 0) {
            // Never hand the route an empty body — a blank artifact is worse than an error (Task 4).
            throw new Error('[contribution-note-pdf] renderer produced an empty document');
          }
          return bytes;
        } finally {
          await page.close().catch(() => {
            // A page that already died with the browser cannot be closed — not worth failing the render.
          });
        }
      } finally {
        releaseSlot();
      }
    },

    async close(): Promise<void> {
      const b = browser;
      browser = null;
      if (b) await b.close().catch(() => undefined);
    },
  };
}
