// AR-45 external-call resilience — Story 9.3 (Task 4; AC4).
//
// The bank-statement upload pipeline makes external calls at TWO boundaries: the object-storage
// `put`/`signedReadUrl` (GCS) and the virus-scan (`StatementScanner`). AR-45 requires each such call to be
// wrapped with retry-with-backoff (3× exp), an enforced timeout, and a circuit-breaker; every failure is
// audit-logged (the audit line is added by the caller, which knows the actor/pariwar context). A storage
// or scanner outage must degrade to a dignified retry-or-defer, NEVER a 500 wall (the handler maps a
// `StorageUnavailableError` → a 503-style dignified body).
//
// ── Not resilience theatre (the story's Task-4 caveat) ──────────────────────────────────────────────
// In tests + local dev the adapters are IN-PROCESS fakes, so a wrapped call succeeds on the first attempt
// and the retry/timeout/breaker code never fires — no overhead, no theatre. But the seam is wired at the
// REAL external boundary, so the GCS / future-AV-vendor path is genuinely covered: a failing fake adapter
// (throws N times, or always) drives the retry counts + the breaker open in the unit tests. That is where
// the seam earns its keep ([[feedback_gate_scope_semantic_coverage]] — a green pass over the happy path
// proves nothing; the teeth are the failing-adapter vectors).

/** Raised when an external dependency is unavailable after retries, or its breaker is open. The handler
 *  maps this to a dignified "try again in a little while / we'll hold your place" response, never a 500. */
export class StorageUnavailableError extends Error {
  public readonly name = 'StorageUnavailableError';
  public constructor(
    /** The dependency name (`bank-statement-storage`, `statement-scanner`) — for the audit line. */
    public readonly dependency: string,
    /** `circuit_open` (fast-failed) or `exhausted` (retries spent). */
    public readonly kind: 'circuit_open' | 'exhausted',
    options?: { cause?: unknown },
  ) {
    super(`[${dependency}] unavailable (${kind})`, options);
  }
}

export interface ResilienceOptions {
  /** Total attempts (1 initial + retries). AR-45 "3× exp" ⇒ 3. */
  readonly attempts?: number;
  /** Base backoff in ms; attempt k waits `baseDelayMs * 2^(k-1)` (exp). */
  readonly baseDelayMs?: number;
  /** Per-attempt timeout in ms; a call that outlives it counts as a failed attempt. */
  readonly timeoutMs?: number;
  /** Consecutive failures that OPEN the breaker (subsequent calls fast-fail until cooldown). */
  readonly breakerThreshold?: number;
  /** How long the breaker stays open before allowing a probe (ms). */
  readonly breakerCooldownMs?: number;
  /** Injectable clock (ms since epoch) — tests advance it to cross the cooldown. */
  readonly now?: () => number;
  /** Injectable sleep — tests pass a no-op so backoff does not burn real time. */
  readonly sleep?: (ms: number) => Promise<void>;
}

const DEFAULTS = {
  attempts: 3,
  baseDelayMs: 50,
  timeoutMs: 5_000,
  breakerThreshold: 5,
  breakerCooldownMs: 30_000,
} as const;

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Race a promise-returning fn against a timeout; a timeout rejects (counts as a failed attempt). `fn()`
 * itself is NOT cancelled on a timeout (it may still resolve/reject later) — its result is discarded, but
 * a `.catch()` is attached so a late rejection never surfaces as an unhandled promise rejection.
 */
async function withTimeout<T>(fn: () => Promise<T>, timeoutMs: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const call = fn();
  call.catch(() => {
    /* the timeout branch already decided this attempt failed; a late settle is discarded, not unhandled */
  });
  try {
    return await Promise.race([
      call,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`timed out after ${timeoutMs}ms`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Errors that indicate a programming bug (a bad argument, a null-deref) rather than an external
 *  dependency hiccup — retrying these burns the full backoff budget on something that will never
 *  succeed, and can incorrectly trip the breaker for unrelated future requests. */
function isRetryable(err: unknown): boolean {
  return !(err instanceof TypeError || err instanceof RangeError);
}

/**
 * A resilient invoker for ONE external dependency — retry-with-backoff + per-attempt timeout + a
 * circuit-breaker whose state persists across `.run(...)` calls. Construct ONE per dependency (its own
 * breaker state) at module wiring time. Pure/injectable (clock + sleep) so the retry/breaker behaviour is
 * unit-testable without real timers or a real outage.
 */
export class ResilientCall {
  private readonly opts: Required<Omit<ResilienceOptions, 'now' | 'sleep'>>;
  private readonly now: () => number;
  private readonly sleep: (ms: number) => Promise<void>;
  private consecutiveFailures = 0;
  private openUntil = 0;

  public constructor(
    public readonly dependency: string,
    options: ResilienceOptions = {},
  ) {
    this.opts = {
      attempts: options.attempts ?? DEFAULTS.attempts,
      baseDelayMs: options.baseDelayMs ?? DEFAULTS.baseDelayMs,
      timeoutMs: options.timeoutMs ?? DEFAULTS.timeoutMs,
      breakerThreshold: options.breakerThreshold ?? DEFAULTS.breakerThreshold,
      breakerCooldownMs: options.breakerCooldownMs ?? DEFAULTS.breakerCooldownMs,
    };
    this.now = options.now ?? Date.now;
    this.sleep = options.sleep ?? defaultSleep;
  }

  /** True when the breaker is currently open (calls fast-fail). Exposed for tests/assertions. */
  public get isOpen(): boolean {
    return this.now() < this.openUntil;
  }

  /**
   * Run `fn` with retry + timeout + breaker. Resolves its value on success (resetting the failure count).
   * Throws `StorageUnavailableError` when the breaker is open (fast-fail) or the retry budget is exhausted;
   * the original error is attached as `.cause`.
   */
  public async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.isOpen) {
      throw new StorageUnavailableError(this.dependency, 'circuit_open');
    }

    let lastErr: unknown;
    for (let attempt = 1; attempt <= this.opts.attempts; attempt += 1) {
      try {
        const result = await withTimeout(fn, this.opts.timeoutMs);
        this.consecutiveFailures = 0; // a success closes/keeps-closed the breaker
        return result;
      } catch (err) {
        lastErr = err;
        if (!isRetryable(err)) break; // a bug, not a flaky dependency — retrying cannot help
        if (attempt < this.opts.attempts) {
          await this.sleep(this.opts.baseDelayMs * 2 ** (attempt - 1));
        }
      }
    }

    // Retries exhausted — count it and maybe trip the breaker.
    this.consecutiveFailures += 1;
    if (this.consecutiveFailures >= this.opts.breakerThreshold) {
      this.openUntil = this.now() + this.opts.breakerCooldownMs;
    }
    throw new StorageUnavailableError(this.dependency, 'exhausted', { cause: lastErr });
  }
}
