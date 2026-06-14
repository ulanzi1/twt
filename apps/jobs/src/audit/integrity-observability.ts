// Observability sink + alerting hook for the audit-integrity job — Story 1.11a
// Task 6 (DD-5, AC-4/AC-5).
//
// AC-4 ("result published to the observability sink") and AC-5 ("an alert fires")
// must NOT hard-wire a vendor: the architecture defers the observability stack to
// Category 5 (§5.6 Cloud Monitoring / Grafana+Loki; the chain-break alert
// threshold is "named in Category 5"). So v1 ships provider-fluid PORTS + a
// structured-log fake (the default) + an env resolver, mirroring Story 1.10's
// `MirrorTarget` + `MIRROR_MODE` fake|live pattern (mirror.ts:38-52,200-212). The
// live Cloud Monitoring / alert-policy adapter is the recorded Category-5
// graduation — there is no live adapter to import yet, so `live` fails loudly.
//
// The published payload IS the persisted verdict row (`AuditIntegrityCheckRow`):
// the sink/alerter observe exactly what was recorded to audit_integrity_checks,
// so log/metric/alert and ledger never drift.

import { schema } from '@twt/domain';

type AuditIntegrityCheckRow = typeof schema.auditIntegrityChecks.$inferSelect;

/** Where a completed integrity-check verdict is published (AC-4). */
export interface IntegrityObservabilitySink {
  /** Publish a completed verdict (pass OR fail) to the observability sink. */
  publish(check: AuditIntegrityCheckRow): Promise<void>;
}

/** Fires when the chain is found broken (AC-5; vendor-fluid per the freeze table). */
export interface IntegrityAlerter {
  /** Raise the chain-integrity alert for a failed verdict. */
  alertChainBroken(check: AuditIntegrityCheckRow): Promise<void>;
}

/** A compact, log/metric-friendly projection of a verdict (no oversized payload). */
function summarize(check: AuditIntegrityCheckRow): Record<string, unknown> {
  return {
    checkId: check.checkId,
    chainValid: check.chainValid,
    rowsVerified: check.rowsVerified,
    startSeq: check.startSeq,
    endSeq: check.endSeq,
    firstBrokenSeq: check.firstBrokenSeq,
    firstBrokenAuditId: check.firstBrokenAuditId,
    verifierActor: check.verifierActor,
    triggerSource: check.triggerSource,
    verifiedAt: check.verifiedAt.toISOString(),
  };
}

// ── Structured-log fake (default — used by the CLI / cron / post-mirror v1) ────

/**
 * The default sink: emits one structured line per verdict. A passing verdict logs
 * at info; a failing one at error (so a console/Loki scrape can alert on level
 * even before the Category-5 metric wiring lands). This is a usable default, not a
 * no-op — the v1 mechanism surfaces verdicts in job logs.
 */
export function createConsoleIntegritySink(): IntegrityObservabilitySink {
  return {
    publish(check): Promise<void> {
      const line = JSON.stringify(summarize(check));
      if (check.chainValid) console.info('[audit-integrity] verdict', line);
      else console.error('[audit-integrity] verdict CHAIN BROKEN', line);
      return Promise.resolve();
    },
  };
}

/**
 * The default alerter: emits a single high-visibility structured error line. The
 * live Cloud Monitoring alert-policy / PagerDuty-equivalent fanout is the
 * Category-5 graduation (DD-5); until then the error-level log is the alert
 * signal a log-based alert policy keys on.
 */
export function createConsoleIntegrityAlerter(): IntegrityAlerter {
  return {
    alertChainBroken(check): Promise<void> {
      console.error(
        '[audit-integrity] ALERT — audit chain integrity check FAILED',
        JSON.stringify(summarize(check)),
      );
      return Promise.resolve();
    },
  };
}

// ── In-memory capturing fakes (tests) ─────────────────────────────────────────

export interface CapturingIntegritySink extends IntegrityObservabilitySink {
  /** Every verdict published, in order (tests). */
  readonly published: ReadonlyArray<AuditIntegrityCheckRow>;
}

export function createCapturingIntegritySink(): CapturingIntegritySink {
  const published: AuditIntegrityCheckRow[] = [];
  return {
    published,
    publish(check): Promise<void> {
      published.push(check);
      return Promise.resolve();
    },
  };
}

export interface CapturingIntegrityAlerter extends IntegrityAlerter {
  /** Every chain-broken alert raised, in order (tests). */
  readonly alerts: ReadonlyArray<AuditIntegrityCheckRow>;
}

export function createCapturingIntegrityAlerter(): CapturingIntegrityAlerter {
  const alerts: AuditIntegrityCheckRow[] = [];
  return {
    alerts,
    alertChainBroken(check): Promise<void> {
      alerts.push(check);
      return Promise.resolve();
    },
  };
}

// ── Env resolution (mirrors resolveMirrorTargetFromEnv / MIRROR_MODE) ──────────

const LIVE_DEFERRED =
  "live observability/alerting is deferred to Category 5 (§5.6 Cloud Monitoring / " +
  'Grafana+Loki). Set INTEGRITY_OBSERVABILITY_MODE=fake (default) for v1.';

/**
 * Resolve the observability sink from INTEGRITY_OBSERVABILITY_MODE (fake|live),
 * mirroring the MIRROR_MODE convention. `fake` (default) = the structured-log
 * sink; `live` throws — the Cloud Monitoring adapter is the Category-5 graduation
 * (no adapter exists yet, so this fails closed rather than silently no-op'ing).
 */
export function resolveIntegritySinkFromEnv(): IntegrityObservabilitySink {
  const mode = process.env['INTEGRITY_OBSERVABILITY_MODE'] ?? 'fake';
  if (mode === 'fake') return createConsoleIntegritySink();
  if (mode === 'live') throw new Error(`[audit-integrity] ${LIVE_DEFERRED}`);
  throw new Error(
    `[audit-integrity] INTEGRITY_OBSERVABILITY_MODE must be 'fake' or 'live', got ${JSON.stringify(mode)}`,
  );
}

/** Resolve the alerter from INTEGRITY_OBSERVABILITY_MODE (fake|live) — see above. */
export function resolveIntegrityAlerterFromEnv(): IntegrityAlerter {
  const mode = process.env['INTEGRITY_OBSERVABILITY_MODE'] ?? 'fake';
  if (mode === 'fake') return createConsoleIntegrityAlerter();
  if (mode === 'live') throw new Error(`[audit-integrity] ${LIVE_DEFERRED}`);
  throw new Error(
    `[audit-integrity] INTEGRITY_OBSERVABILITY_MODE must be 'fake' or 'live', got ${JSON.stringify(mode)}`,
  );
}
