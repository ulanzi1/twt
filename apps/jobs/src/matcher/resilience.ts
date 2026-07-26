// AR-45 external-call resilience (jobs-side port) — Story 9.4 (Task 5; AC8).
//
// A FAITHFUL PORT of the Story 9.3 `apps/api/src/modules/reconciliation/resilience.ts` `ResilientCall` — NOT
// a re-invention (Task 5: "reuse the 9.3 ResilientCall, or a jobs-side port of it; do NOT re-invent"). apps/
// jobs cannot import apps/api (no app→app edge), so the shape is duplicated here verbatim. Now that a SECOND
// consumer exists (the matcher's `BankStatementStorage.getBytes` blob fetch), this is the point at which
// extraction to a shared `@twt/*` util becomes justified ([[feedback_no_premature_package]] — a real
// cross-package reuse now exists); a follow-up may hoist both copies. Until then this port keeps the seam
// wired at the matcher's one external boundary with identical retry/timeout/breaker semantics.
//
// The matcher's ONE external call is the object-storage blob fetch for re-parse. A storage outage must defer
// the match to the next tick (the cron is self-healing), audit-logged, NEVER crash the worker or corrupt a
// partial confirmation.

/** Raised when the storage dependency is unavailable after retries, or its breaker is open. */
export class StorageUnavailableError extends Error {
  public readonly name = 'StorageUnavailableError';
  public constructor(
    public readonly dependency: string,
    public readonly kind: 'circuit_open' | 'exhausted',
    options?: { cause?: unknown },
  ) {
    super(`[${dependency}] unavailable (${kind})`, options);
  }
}

export interface ResilienceOptions {
  readonly attempts?: number;
  readonly baseDelayMs?: number;
  readonly timeoutMs?: number;
  readonly breakerThreshold?: number;
  readonly breakerCooldownMs?: number;
  readonly now?: () => number;
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

/** A bug (bad argument / null-deref) — retrying burns the budget on something that will never succeed. */
function isRetryable(err: unknown): boolean {
  return !(err instanceof TypeError || err instanceof RangeError);
}

/**
 * A resilient invoker for ONE external dependency — retry-with-backoff + per-attempt timeout + a
 * circuit-breaker whose state persists across `.run(...)` calls. Construct ONE per dependency at wiring time.
 * Pure/injectable (clock + sleep) so the retry/breaker behaviour is unit-testable without real timers.
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

  public async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.isOpen) {
      throw new StorageUnavailableError(this.dependency, 'circuit_open');
    }

    let lastErr: unknown;
    for (let attempt = 1; attempt <= this.opts.attempts; attempt += 1) {
      try {
        const result = await withTimeout(fn, this.opts.timeoutMs);
        this.consecutiveFailures = 0;
        return result;
      } catch (err) {
        lastErr = err;
        if (!isRetryable(err)) break;
        if (attempt < this.opts.attempts) {
          await this.sleep(this.opts.baseDelayMs * 2 ** (attempt - 1));
        }
      }
    }

    this.consecutiveFailures += 1;
    if (this.consecutiveFailures >= this.opts.breakerThreshold) {
      this.openUntil = this.now() + this.opts.breakerCooldownMs;
    }
    throw new StorageUnavailableError(this.dependency, 'exhausted', { cause: lastErr });
  }
}
