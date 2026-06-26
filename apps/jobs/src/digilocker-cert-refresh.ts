// Daily DigiLocker issuer-certificate refresh cron — Story 3.3b (Task 5; AC5.2 /
// ADR-0026 Category-5).
//
// Registers a daily pg-boss cron that invokes `kyc.refreshDigiLockerCerts()` (the 3.3a
// primitive, RELOCATED to @twt/domain in 3.3b R6) — fetching the current issuer cert(s) and
// upserting them into the GLOBAL `digilocker_public_certs` cache, BUMPING `fetched_at` so the
// two-window staleness budget (within-budget 7d trust+alarm / hard-limit 30d fail-closed)
// means something. Mirrors the IDEMPOTENCY_VACUUM cron in boot.ts (createQueue → work →
// schedule in IST).
//
// ── R6 boundary resolution ────────────────────────────────────────────────────────────
// The cron home is apps/jobs; the refresh primitive lives in @twt/domain (apps/jobs already
// depends on it). It is NEVER imported from apps/api — apps/api already depends on @twt/jobs,
// so the reverse edge would CYCLE the build graph (R6's "recommended" cross-app import is
// infeasible). The DigiLocker TRANSPORT (xml-crypto/@xmldom/xmldom/xpath) is never imported
// here — only the gate-safe @twt/domain primitive (node:crypto X.509) + a plain HTTPS fetcher.
//
// ── Not fail-closed on refresh failure (§2.8) ─────────────────────────────────────────
// A fetch/parse failure leaves the last-good cached cert in place within the staleness
// budget — it logs + alarms (a console stub; the observability transport is a later epic),
// never throws out of the worker (which would auto-retry and spam). The hard-limit
// fail-closed is enforced at VERIFY time by the provider (3.3a), not here.

import { kyc, type Db } from '@twt/domain';
import { QUEUE_NAMES, type QueueClient, type Job } from '@twt/queue';

/** Default daily cadence (IST) — operations policy, overridable via env. */
export const DEFAULT_CERT_REFRESH_CRON = '30 2 * * *'; // 02:30 IST daily
export const CERT_REFRESH_TZ = 'Asia/Kolkata';

export interface CertRefreshDeps {
  readonly db: Db;
  readonly fetcher: kyc.DigiLockerCertFetcher;
  /** Injectable clock (deterministic tests). */
  readonly now?: () => Date;
  /** Within-budget / failure alarm sink — a console stub by default (later-epic transport). */
  readonly onAlarm?: (message: string) => void;
}

/**
 * The worker body: invoke `refreshDigiLockerCerts` and surface the outcome. NOT fail-closed
 * (§2.8) — on failure it alarms + returns null (the last-good cert stays trusted within
 * budget), never throwing out of the worker. Returns the refresh result on success.
 */
export async function runDigiLockerCertRefresh(
  deps: CertRefreshDeps,
): Promise<kyc.RefreshCertsResult | null> {
  const alarm = deps.onAlarm ?? ((m: string): void => console.warn(m));
  try {
    const result = await kyc.refreshDigiLockerCerts(
      deps.db,
      deps.fetcher,
      deps.now ? { now: deps.now } : {},
    );
    console.info('[jobs] digilocker-cert-refresh', JSON.stringify(result));
    if (result.refreshed === 0) {
      // No cert source configured (or none returned) → the cache is unchanged; the staleness
      // budget keeps ticking. Surface it so a silently-empty refresh is observable.
      alarm('[jobs] digilocker-cert-refresh: 0 certs refreshed (no source configured?)');
    }
    return result;
  } catch (err) {
    const e = err as Error & { code?: string };
    alarm(
      `[jobs] digilocker-cert-refresh FAILED (not fail-closed; last-good cert trusted within ` +
        `budget — ADR-0026 §2.8): ${e?.code ?? 'NO_CODE'} ${e?.message ?? String(err)}`,
    );
    return null;
  }
}

/**
 * Config-gated cert fetcher. Resolves a single PINNED issuer cert from env:
 *   · `DIGILOCKER_ISSUER_CERT_PEM` — the PEM inline (the pinned-trust-anchor path), OR
 *   · `DIGILOCKER_ISSUER_CERT_URL` — an https URL the cert PEM is GET from.
 * Absent both → returns [] (a harmless no-op: dev/CI never hit a live source; the cron runs
 * and `runDigiLockerCertRefresh` alarms the empty refresh). Uses Node-22 global `fetch` — NOT
 * the gate-fenced DigiLocker OAuth/XML transport.
 */
export function createEnvCertFetcher(
  env: NodeJS.ProcessEnv = process.env,
): kyc.DigiLockerCertFetcher {
  const pem = env['DIGILOCKER_ISSUER_CERT_PEM'];
  const url = env['DIGILOCKER_ISSUER_CERT_URL'];
  const keyId = env['DIGILOCKER_ISSUER_CERT_KEY_ID'];
  return {
    async fetchIssuerCerts() {
      if (pem && pem.trim()) {
        return [keyId ? { keyId, pem } : { pem }];
      }
      if (url && url.trim()) {
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`cert source ${url} returned ${res.status}`);
        }
        const MAX_CERT_BYTES = 256 * 1024; // 256 KB — an issuer cert is typically < 8 KB
        const buf = await res.arrayBuffer();
        if (buf.byteLength > MAX_CERT_BYTES) {
          throw new Error(
            `cert source ${url} response too large (${buf.byteLength} bytes > ${MAX_CERT_BYTES} limit)`,
          );
        }
        const fetchedPem = Buffer.from(buf).toString('utf-8');
        return [keyId ? { keyId, pem: fetchedPem } : { pem: fetchedPem }];
      }
      return [];
    },
  };
}

/**
 * Register the daily cert-refresh queue + worker + cron on the pg-boss client. Mirrors the
 * IDEMPOTENCY_VACUUM registration in boot.ts.
 */
export async function registerDigiLockerCertRefreshCron(
  boss: QueueClient,
  deps: CertRefreshDeps,
  opts: { cron?: string; tz?: string } = {},
): Promise<void> {
  const cron = opts.cron ?? DEFAULT_CERT_REFRESH_CRON;
  const tz = opts.tz ?? CERT_REFRESH_TZ;
  await boss.createQueue(QUEUE_NAMES.DIGILOCKER_CERT_REFRESH);
  await boss.work(QUEUE_NAMES.DIGILOCKER_CERT_REFRESH, async (jobs: Job[]) => {
    const result = await runDigiLockerCertRefresh(deps);
    return { jobs: jobs.length, refreshed: result?.refreshed ?? 0 };
  });
  await boss.schedule(QUEUE_NAMES.DIGILOCKER_CERT_REFRESH, cron, {}, { tz });
}
