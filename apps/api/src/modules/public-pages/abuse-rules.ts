// Story 11a.3 — anti-enumeration DETECTION for the public Member Directory (Task 9; AC6.4).
//
// The impure half of the rules substrate: read the committed file, keep the sliding-window
// counters, evaluate every ACTIVE rule on every directory request, and emit a §1.5 audit line when
// one breaches. The pure half — the schema and the loud parse — lives in `@twt/contracts`
// (`public-pages/abuse-rules.ts`), mirroring the pure-`gate.ts` / impure-`check-pii-scrape.ts`
// split this repo already uses.
//
// ── ⭐ THE RULES FILE IS READ, NOT DECORATIVE ───────────────────────────────────────────────────
// `2026-08-20-143` cl.4 (D4(a)) ruled that the rules file AND its enforcement ship together, and
// rejected option (c) — "rules file only" — in those terms: a committed governance artifact that
// nothing reads is the vacuous-green defect Story 11a.1 existed to remove.
//
// ── ⛔ WHAT THIS DOES NOT DO, AND MUST NOT BE DESCRIBED AS DOING ────────────────────────────────
//   · ⛔ It does NOT block. The `limits.search` rate limit is the ENFORCEMENT; this is the SIGNAL.
//     A rule firing serves the request normally (hence its 200 status mapping).
//   · ⛔ The audit line it emits is a COUNTER, NOT A FORENSIC RECORD. No column stores query
//     context — `authEventToAuditInput` hashes `context` into `request_payload_hash` — so the rule
//     id and a coarse, non-PII shape are pushed into `resource_locator`, and the event type into
//     `action`. ⛔ Never write a comment claiming the line carries the query.
//   · ⛔ The counters are IN-MEMORY AND PER-INSTANCE (§1.4 records no Redis), exactly like the
//     rate-limit store. The effective threshold is `threshold × instanceCount`.
//   · ⛔ A warm edge hides scraper traffic from this entirely (D5(a) kept `edge_cacheable`).
// All four are written at length in the rules file's own README section, which is the artifact a
// future abuse-rule author actually opens.
//
// ── ⚠ THE KEY ─────────────────────────────────────────────────────────────────────────────────
// `request.ip`, which under `trustProxy: true` reads the `X-Forwarded-For` chain — so the SSR proxy
// forwarding `Astro.clientAddress` is what makes this per-VISITOR rather than per-PROXY. ⛔ Without
// that forwarding every visitor on earth shares one bucket, and neither this nor the rate limit
// means anything.
//
// ⚠ AND IT IS TRUSTWORTHY ONLY BEHIND THE SSR HOP. A caller reaching `apps/api` DIRECTLY can set
// the header themselves; restricting that is an INFRA control (network ACL / mTLS), deferred
// (`2026-08-20-143` cl.9).
// ⭐ WHAT IS NO LONGER TRUE — `2026-08-21-145` cl.2. This paragraph used to say the key was simply
// "caller-supplied". It was worse than that: `apps/public` APPENDED the visitor address to the
// browser's own inbound chain, and `trustProxy: true` reads the LEFTMOST entry — so a scraper going
// THROUGH the legitimate hop chose its own key with one header and got a fresh counter window per
// request. ⛔ No infra control could have seen it. `apps/public` now forwards ONLY
// `Astro.clientAddress` and discards the inbound chain.

import {
  parseDirectoryAbuseRules,
  type DirectoryAbuseRule,
  type DirectoryAbuseRules,
} from '@twt/contracts';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

import type { AppDeps } from '../../context.js';

/**
 * Where the committed rules file lives, resolved through the package rather than a `../../..` walk.
 *
 * ⭐ EXPORTED so the unit suite guards THIS resolution, ⛔ not a second copy of it. The test used to
 * rebuild the same `createRequire` walk itself, so the two could drift and the real one could break
 * while the test stayed green — and a failure here takes down `buildServer()`, i.e. EVERY route in
 * the API, not just the directory.
 */
export function resolveRulesPath(): string {
  const require = createRequire(import.meta.url);
  // `@twt/contracts`'s package.json anchors the package root; the yaml sits beside the matrix.
  const pkgJson = require.resolve('@twt/contracts/package.json');
  return join(dirname(pkgJson), 'public-pages', 'directory-abuse-rules.yaml');
}

/**
 * Read + parse the committed rules file. ⛔ THROWS on a missing or malformed file.
 *
 * ⭐ Called ONCE at handler construction (wiring time), ⛔ never per request. That placement is the
 * point: a malformed governance artifact must fail the process loudly at boot, where it is
 * impossible to miss — ⛔ not degrade to "no rules" on the request path, where the flagship public
 * surface would quietly lose every anti-enumeration signal while CI stayed green.
 */
export function loadDirectoryAbuseRules(path = resolveRulesPath()): DirectoryAbuseRules {
  let raw: string;
  try {
    raw = readFileSync(path, 'utf-8');
  } catch (err) {
    throw new Error(
      `directory-abuse-rules.yaml could not be read at ${path} — ${err instanceof Error ? err.message : String(err)}. ` +
        `⛔ The public Member Directory must not serve without its anti-enumeration rules loaded.`,
    );
  }
  return parseDirectoryAbuseRules(raw);
}

/** One directory request, reduced to the non-PII facts the detectors count. */
/**
 * Which public surface a signal came from.
 *
 * ⭐⛔ REQUIRED, AND IT PARTITIONS THE COUNTER STATE (Review finding, 2026-08-27). Until Story
 * 11b.1 this evaluator had exactly ONE caller, so `key: request.ip` alone was a sufficient
 * identity. It now has TWO, and every window field — `hits`, `pages`, `deepestPage`,
 * `transitions`, and the per-rule `emitted` dedupe — was being SHARED between them. Three
 * consequences, all live:
 *   1. ⛔ A visitor legitimately paging `/members` and then `/sahyog` accumulated ONE merged rate
 *      and could trip `rapid_pagination` — a false positive that dilutes the only abuse signal
 *      this surface has.
 *   2. ⛔ A scraper could SPLIT a walk across the two routes to stay under a per-key threshold
 *      that was calibrated for one.
 *   3. ⛔ The `EMIT_DEDUPE_MS` window is keyed `(key, ruleId)`, so a `/members` crawl that emitted
 *      a line SUPPRESSED the `/sahyog` line for the next 60 seconds entirely.
 * ⚠ The abuse-rules YAML already recognised the per-surface problem — but only for the INACTIVE
 * `district_query_volume` rule. The reasoning applies with equal force to the three ACTIVE ones.
 */
export type DirectorySurface = 'member-directory' | 'sahyog-drive';

export interface DirectoryRequestSignal {
  /** The visitor key — `request.ip` under `trustProxy`. ⚠ Trustworthy only behind the SSR hop. */
  key: string;
  /**
   * ⭐ WHICH SURFACE. ⛔ REQUIRED — see {@link DirectorySurface}. It partitions the counter windows
   * AND it is what makes an emitted line say which page was actually crawled: every line used to
   * read `directory:…` regardless of origin, so an operator could ⛔ not tell the two apart.
   */
  surface: DirectorySurface;
  /**
   * The Pariwar whose directory was requested.
   * ⭐ REQUIRED. Omitting it wrote every abuse line under the nil GLOBAL pariwar
   * (`00000000-…`), so a Pariwar-scoped audit reader (Story 1.10) never saw them and two Pariwars
   * crawled at once were indistinguishable. ⛔ Never let this fall back to a sentinel.
   */
  pariwarId: string;
  /** The request trace, so an abuse line joins the rest of that request's trail. `null` if absent. */
  traceId: string | null;
  page: number;
  limit: number;
  at: Date;
}

interface KeyWindow {
  /** Epoch-ms of each request in the window (pruned on read). */
  hits: number[];
  /** page → last-seen epoch-ms, for the distinct-page detector. */
  pages: Map<number, number>;
  /** The deepest page reached, with the epoch-ms it was reached at. */
  deepestPage: number;
  deepestAt: number;
  /**
   * The page requested LAST, and epoch-ms of each page-to-page TRANSITION in the window.
   * ⭐ A transition is recorded only when the requested page CHANGES — so refreshing one page N
   * times contributes ⛔ nothing here (that is `high_volume_lookups`' job), and jumping directly to
   * a deep page contributes exactly one. This is what makes `page_transitions` a RATE.
   */
  lastPage: number | null;
  transitions: number[];
  /** ⛔ ruleId → epoch-ms of the last emission, so one crawler does not emit a line per request. */
  emitted: Map<string, number>;
}

/**
 * The bound on how many visitor keys are tracked. ⛔ Load-bearing, not tuning: an unbounded Map
 * keyed on a CALLER-SUPPLIED value is a memory-exhaustion primitive handed to the exact adversary
 * this module is watching for. When the cap is hit the coldest keys are evicted.
 */
const MAX_TRACKED_KEYS = 10_000;

/** Emit at most one line per (key, rule) per this interval. Mirrors the rate limiter's dedupe. */
const EMIT_DEDUPE_MS = 60_000;

/**
 * Render a number for the audit `resource_locator`, in a shape its guard accepts.
 *
 * ⛔ `NaN` and `Infinity` stringify with CAPITALS, which the sink's lowercase locator-shape
 * allowlist rejects — and a rejected locator falls back to `user:anonymous`, taking the rule id
 * with it. `na` keeps the line triageable and is honest about the input.
 */
function locatorNum(n: number): string {
  return Number.isSafeInteger(n) ? String(n) : 'na';
}

/** The longest window any rule can declare — the horizon past which state is always prunable. */
function maxWindowMs(rules: DirectoryAbuseRules): number {
  return Math.max(
    ...rules.rules
      .filter((r: DirectoryAbuseRule) => r.status === 'active')
      .map((r: DirectoryAbuseRule) => (r.window_seconds ?? 0) * 1000),
    EMIT_DEDUPE_MS,
  );
}

const windows = new Map<string, KeyWindow>();

/** ⛔ TEST SEAM ONLY — the counters are process-global, so a suite must be able to start clean. */
export function __resetDirectoryAbuseCounters(): void {
  windows.clear();
}

/**
 * Evaluate every ACTIVE rule against this request and emit an audit line for each breach.
 *
 * ⛔ Never throws into the request path: a detection surface that could 500 the page it watches
 * would be a worse outage than the abuse it detects.
 *
 * @returns the ids of the rules that fired — for tests and for the caller's own logging. ⛔ The
 *          caller must NOT branch on this to block: the rate limit is the enforcement.
 */
export function evaluateDirectoryAbuse(
  deps: AppDeps,
  rules: DirectoryAbuseRules,
  signal: DirectoryRequestSignal,
): string[] {
  try {
    const now = signal.at.getTime();
    const horizon = maxWindowMs(rules);

    // ⭐ THE COUNTER IDENTITY IS (SURFACE, VISITOR), ⛔ NOT VISITOR ALONE — see
    // {@link DirectorySurface}. ⛔ Never collapse this back to `signal.key`: two surfaces sharing
    // one window merge their rates, let a scraper split a walk under the threshold, and let one
    // surface's emit suppress the other's through the 60s dedupe.
    const windowKey = `${signal.surface} ${signal.key}`;

    let win = windows.get(windowKey);
    if (win === undefined) {
      if (windows.size >= MAX_TRACKED_KEYS) evictColdest(now, horizon);
      win = {
        hits: [],
        pages: new Map(),
        deepestPage: 0,
        deepestAt: 0,
        lastPage: null,
        transitions: [],
        emitted: new Map(),
      };
      windows.set(windowKey, win);
    }

    win.hits.push(now);
    win.pages.set(signal.page, now);
    // ⚠ Recorded BEFORE `lastPage` is updated, and only on an actual change of page.
    if (win.lastPage !== null && win.lastPage !== signal.page) win.transitions.push(now);
    win.lastPage = signal.page;
    if (signal.page >= win.deepestPage || now - win.deepestAt > horizon) {
      win.deepestPage = signal.page;
      win.deepestAt = now;
    }
    prune(win, now, horizon);

    const fired: string[] = [];
    for (const rule of rules.rules) {
      // ⛔ `no_subject_yet` rules are DECLARED but never evaluated — see the file's own
      // `no_subject_reason`. Evaluating one would be inventing a predicate nobody ruled.
      if (rule.status !== 'active') continue;
      const windowMs = (rule.window_seconds ?? 0) * 1000;
      const threshold = rule.threshold ?? Number.POSITIVE_INFINITY;

      // ⛔ `district_query_volume` yields `null`, NOT a number: the schema admits that detector only
      // on a `no_subject_yet` rule (already skipped above), and there is no district parameter on
      // this surface to count. Kept as an explicit arm rather than a throw so the future filter
      // story finds an obvious place to implement it — see the file's `activation_trigger`.
      const observed: number | null =
        rule.detects === 'request_volume'
          ? win.hits.filter((t) => now - t <= windowMs).length
          : rule.detects === 'distinct_pages'
            ? [...win.pages.values()].filter((t) => now - t <= windowMs).length
            : rule.detects === 'page_depth'
              ? now - win.deepestAt <= windowMs
                ? win.deepestPage
                : 0
              : rule.detects === 'page_transitions'
                ? win.transitions.filter((t) => now - t <= windowMs).length
                : null;

      if (observed === null || observed < threshold) continue;

      const last = win.emitted.get(rule.id);
      if (last !== undefined && now - last < EMIT_DEDUPE_MS) continue;
      fired.push(rule.id);

      deps.auditSink.emit({
        type: rules.audit_action,
        // ⛔ Always null here — every visitor to this surface is unauthenticated. There is no
        // account to name, and none to suspend (`2026-08-20-143` cl.12).
        actorId: null,
        // ⭐ THE TENANT AND THE TRACE SURVIVE IN THEIR OWN COLUMNS — ⛔ they are NOT part of the
        // hashed context. Omitting them wrote every line under the nil GLOBAL pariwar with a null
        // trace, invisible to the Story 1.10 Pariwar-scoped audit reader (`2026-08-21-145`).
        pariwarId: signal.pariwarId,
        // ⚠ `?? undefined` — the sink's field is optional, and `null` is not assignable to it.
        traceId: signal.traceId ?? undefined,
        // ⭐ THE ONLY OTHER TRIAGE SIGNAL THAT SURVIVES THE ROW. The rule id + a coarse, NON-PII
        // shape (page number and page size — nothing a member typed, nothing a member owns).
        // ⛔ `context` below is HASHED away; do not rely on it and do not put anything there that
        // matters. See `2026-08-20-143` cl.10.
        // ⚠ `locatorNum`, ⛔ not raw interpolation. `${Number.NaN}` renders as `NaN` — UPPERCASE —
        // which the sink's locator-shape guard rejects, so the whole locator fell back to
        // `user:anonymous` and DISCARDED the rule id: the one triage field Trap 8's entire argument
        // is built to preserve, lost exactly when the input was strange enough to be interesting.
        // ⚠ THE SURFACE LEADS THE LOCATOR (Review finding, 2026-08-27). Every line previously read
        // `directory:…` whichever surface fired it, so an operator reading an abuse line could
        // ⛔ not tell whether the Member Directory or the Sahyog Drive had been crawled — on the
        // one triage field Trap 8's whole argument exists to preserve.
        resourceLocator: `${signal.surface}:${rule.id}:p${locatorNum(signal.page)}:l${locatorNum(signal.limit)}`,
        context: { observed, threshold, detects: rule.detects },
        at: signal.at,
      });
      // ⚠ Marked emitted AFTER the audit write, not before: `AuthAuditSink.emit` is contractually
      // "never throws" (every implementation, including the console default, honors it), but a
      // detector this close to an adversarial input is exactly the wrong place to lean on that
      // contract holding forever. If a future sink ever violates it, the outer catch below still
      // wins the request, but this rule's dedupe window won't have been spent on an emit that never
      // landed.
      win.emitted.set(rule.id, now);
    }
    return fired;
  } catch (err) {
    // ⛔ A detection failure must never break the page it watches — this stays fail-open.
    // ⚠ But fail-open silently is indistinguishable from "nothing to detect": log it, so a genuine
    // regression in the detector leaves a trail instead of a quiet, permanent loss of signal.
    console.error(
      '[directory-abuse-rules] evaluateDirectoryAbuse failed — abuse detection degraded for this request',
      err,
    );
    return [];
  }
}

function prune(win: KeyWindow, now: number, horizon: number): void {
  win.hits = win.hits.filter((t) => now - t <= horizon);
  win.transitions = win.transitions.filter((t) => now - t <= horizon);
  for (const [page, t] of win.pages) if (now - t > horizon) win.pages.delete(page);
  for (const [id, t] of win.emitted) if (now - t > EMIT_DEDUPE_MS * 2) win.emitted.delete(id);
}

/** Drop keys with no activity inside the horizon; if none are cold, drop the oldest half. */
function evictColdest(now: number, horizon: number): void {
  const lastSeen = (w: KeyWindow): number => Math.max(w.deepestAt, ...w.hits, 0);
  const entries = [...windows.entries()];
  let evicted = 0;
  for (const [key, w] of entries) {
    if (now - lastSeen(w) > horizon) {
      windows.delete(key);
      evicted += 1;
    }
  }
  if (evicted > 0) return;
  entries
    .sort((a, b) => lastSeen(a[1]) - lastSeen(b[1]))
    .slice(0, Math.ceil(entries.length / 2))
    .forEach(([key]) => windows.delete(key));
}
