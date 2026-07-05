// Validity-cache observability — Story 4.8 (Task 5; AC2).
//
// Every conservative-recompute FALLBACK is recorded with its reason, and a sustained fallback rate above a
// threshold fires an alert. Framework-agnostic (the service has no Fastify logger): the caller injects a
// `ValidityCacheObserver`; apps/api wires one over `request.log` + a shared `FallbackRateMonitor`. Aligns
// with §1.12 query-observability — operation name, reason, `pariwarId`, duration; NEVER PII/payload.
//
// A fallback is NOT an error — it is the load-bearing correctness path (serve fresh, never stale). We
// record it so a SUSTAINED elevated rate (cache backend degraded, broadcast lag, clock anomaly) is
// visible to operators, per AC2's "a sustained fallback rate above a threshold fires an alert."

/**
 * Why the cache path degraded to direct recomputation (AC2). Only the two reasons this mechanism can
 * actually produce (code-review 2026-07-05): D2-A's synchronous epoch bump makes AC2a "broadcast delayed"
 * structurally unreachable; D4-A's conservative whole-cohort bump never attempts scope narrowing, so
 * AC2b's "cohort ambiguous" decision point never exists; the TTL check runs DB-side (§1.10/§1.11), so
 * AC2d's app-clock skew never enters the read path. If a future mechanism reintroduces one of those
 * windows (e.g. an async broadcast model), add its reason back then — not before it is reachable.
 */
export type ValidityCacheFallbackReason =
  | 'backend_error' // the cache table / epoch lookup / a query threw (AC2c "cache backend degraded")
  | 'scope_low_confidence'; // cheap key could not be resolved with confidence (AC2b)

/** The cache-path outcome for one validity read. */
export type ValidityCacheOutcome =
  | { kind: 'hit' }
  | { kind: 'miss' } // cache empty / expired → recompute + populate (the normal cold path)
  | { kind: 'poisoned' } // hit whose stored hash disagreed with the payload → recompute + overwrite
  | { kind: 'fallback'; reason: ValidityCacheFallbackReason }; // AC2 conservative-recompute fallback

export interface ValidityCacheEvent {
  outcome: ValidityCacheOutcome;
  /** Tenant (non-PII) — for per-Pariwar rate attribution. */
  pariwarId: string;
  /** Total cache-path wall time for the read (ms). */
  durationMs: number;
}

/** The injected observer. A no-op by default; apps/api supplies a logging + rate-monitoring one. */
export interface ValidityCacheObserver {
  onCacheEvent(event: ValidityCacheEvent): void;
  /**
   * A best-effort cache WRITE failed and was swallowed — the request already holds the correct recomputed
   * payload, so this NEVER surfaces to the caller (the "cache writes are non-blocking to success"
   * invariant). Optional: apps/api logs it; absent → silently swallowed.
   */
  onCacheWriteError?(err: unknown, pariwarId: string): void;
}

/** A no-op observer (the service default when the caller injects none). */
export const NOOP_CACHE_OBSERVER: ValidityCacheObserver = { onCacheEvent: () => undefined };

export interface FallbackRateMonitorOptions {
  /** Sliding window width in ms (default 10 min — AC2's "10-min window"). */
  windowMs?: number;
  /** Fallback fraction (of all reads) above which the alert fires (default 0.05 = 5% — AC2). */
  threshold?: number;
  /** Minimum reads in-window before the rate is meaningful (avoids a 1/1 spike alerting). */
  minSamples?: number;
  /** Fired (at most once per crossing) when the sustained rate exceeds the threshold. The transport is a
   *  documented hook — the real metrics/alert sink is a tracked ops CR ([Category-5]); this evaluates the
   *  threshold and emits the signal. */
  onAlert?: (snapshot: FallbackRateSnapshot) => void;
  /** Injected clock (architecture forbids a bare `new Date()` in library paths). Defaults to wall clock. */
  now?: () => number;
}

export interface FallbackRateSnapshot {
  windowMs: number;
  total: number;
  fallbacks: number;
  rate: number;
  threshold: number;
}

/**
 * A bounded sliding-window fallback-rate monitor (AC2). Records each read's outcome, evaluates the
 * fallback fraction over the window, and fires `onAlert` when it first crosses the threshold (re-arming
 * once it drops back under). This is the threshold-evaluation logic + the alert hook; wiring it to a real
 * metrics sink is a tracked CR. Cheap + allocation-light (a ring of timestamps, pruned on record).
 */
export class FallbackRateMonitor {
  private readonly windowMs: number;
  private readonly threshold: number;
  private readonly minSamples: number;
  private readonly onAlert?: (snapshot: FallbackRateSnapshot) => void;
  private readonly now: () => number;
  /** Timestamps of ALL reads in-window. */
  private readonly reads: number[] = [];
  /** Timestamps of FALLBACK reads in-window. */
  private readonly fallbacks: number[] = [];
  /** Latched so we alert on a crossing, not on every event above the line. */
  private alerting = false;

  constructor(options: FallbackRateMonitorOptions = {}) {
    this.windowMs = options.windowMs ?? 10 * 60 * 1000;
    this.threshold = options.threshold ?? 0.05;
    this.minSamples = options.minSamples ?? 20;
    this.onAlert = options.onAlert;
    this.now = options.now ?? (() => Date.now());
  }

  /**
   * Record one read; if it was a fallback, count it. Evaluates the rate and, on the FIRST crossing above
   * the threshold (re-arming once it drops back under), fires `onAlert` AND returns the snapshot — so a
   * caller with only a request-scoped logger can emit the alert line without an app-level logger. Returns
   * `null` when no crossing occurred on this record.
   */
  record(outcome: ValidityCacheOutcome): FallbackRateSnapshot | null {
    const t = this.now();
    this.prune(t);
    this.reads.push(t);
    if (outcome.kind === 'fallback') this.fallbacks.push(t);

    const snapshot = this.snapshotAt(t);
    if (snapshot.total < this.minSamples) return null;
    if (snapshot.rate > this.threshold) {
      if (!this.alerting) {
        this.alerting = true;
        this.onAlert?.(snapshot);
        return snapshot;
      }
      return null;
    }
    this.alerting = false; // re-arm once we drop back under the line
    return null;
  }

  /** Current window snapshot (for a metrics scrape / test assertion). */
  snapshot(): FallbackRateSnapshot {
    const t = this.now();
    this.prune(t);
    return this.snapshotAt(t);
  }

  private snapshotAt(t: number): FallbackRateSnapshot {
    void t;
    const total = this.reads.length;
    const fallbacks = this.fallbacks.length;
    return {
      windowMs: this.windowMs,
      total,
      fallbacks,
      rate: total === 0 ? 0 : fallbacks / total,
      threshold: this.threshold,
    };
  }

  private prune(t: number): void {
    const cutoff = t - this.windowMs;
    while (this.reads.length > 0 && this.reads[0]! < cutoff) this.reads.shift();
    while (this.fallbacks.length > 0 && this.fallbacks[0]! < cutoff) this.fallbacks.shift();
  }
}
