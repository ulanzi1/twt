// DigiLocker issuer-certificate refresh — Story 3.3a (Task 3; AC7), RELOCATED to
// @twt/domain in Story 3.3b (R6).
//
// `refreshDigiLockerCerts()` fetches the current issuer public certificate(s) and upserts
// them into the GLOBAL `digilocker_public_certs` cache (the `upsertDigiLockerCert` accessor).
// It parses the X.509 `notAfter`/`notBefore`/`subject` with Node's built-in `X509Certificate`
// and bumps `fetched_at` (resetting the staleness clock for the two-window budget). The fetcher
// is injected so tests never hit the live government API.
//
// ── Why this lives in @twt/domain (Story 3.3b R6 resolution) ──────────────────────────
// It only ever used `@twt/domain` (`upsertDigiLockerCert`) + `node:crypto` — NEVER the
// gate-fenced DigiLocker transport (xml-crypto / @xmldom/xmldom / xpath). The 3.3b daily
// cert-refresh CRON lives in `apps/jobs`, which depends on `@twt/domain` but NOT `apps/api`
// (and CAN'T — apps/api already depends on @twt/jobs, so a reverse edge would cycle the build
// graph; R6's "recommended" cross-app import is therefore infeasible). Relocating this gate-safe
// primitive HERE lets BOTH apps/api (the provider) and apps/jobs (the cron) reuse the SAME
// function with no cycle and no transport spread (freeze row 13 honored — the transport never
// leaves apps/api/src/modules/kyc/providers/digilocker/).

import { X509Certificate } from 'node:crypto';

import type { Db } from '../db.js';
import { upsertDigiLockerCert } from './write.js';

/** One issuer cert fetched from the source (keyId optional → derived from the fingerprint). */
export interface FetchedIssuerCert {
  /** The issuer key identifier; defaults to the cert SHA-256 fingerprint when absent. */
  keyId?: string;
  /** The PEM-encoded X.509 certificate. */
  pem: string;
}

/** The cert-source seam — injected so tests use a deterministic fetcher (no live API). */
export interface DigiLockerCertFetcher {
  fetchIssuerCerts(): Promise<FetchedIssuerCert[]>;
}

export interface RefreshCertsResult {
  /** How many certs were upserted into the cache. */
  refreshed: number;
  /** The key ids upserted (diagnostic; never the PEM). */
  keyIds: string[];
}

/**
 * Refresh the issuer-cert cache (AC7). For each fetched cert: parse the X.509 validity +
 * subject, then upsert (insert-or-update on `key_id`, bumping `fetched_at`). GLOBAL — runs
 * with no tenant scope. A malformed PEM throws (the caller alarms; a refresh failure leaves
 * the prior cached cert in place within the staleness budget — §2.8 "not fail-closed on
 * refresh failure"). `fetchedAt` defaults to the injected clock for deterministic tests.
 */
export async function refreshDigiLockerCerts(
  db: Db,
  fetcher: DigiLockerCertFetcher,
  opts: { now?: () => Date } = {},
): Promise<RefreshCertsResult> {
  const now = opts.now ?? (() => new Date());
  const fetched = await fetcher.fetchIssuerCerts();
  const keyIds: string[] = [];

  // Phase 1: parse ALL certs before any DB writes — a malformed PEM throws here, leaving
  // the existing cache fully intact (no partial refresh where cert N wrote but cert N+1 is
  // malformed). This is the two-phase atomicity guard (P6 review finding).
  const parsed = fetched.map((cert) => {
    const x509 = new X509Certificate(cert.pem); // throws on a malformed PEM
    return { pem: cert.pem, keyId: cert.keyId ?? x509.fingerprint256, x509 };
  });

  // Phase 2: write all parsed certs. No nested db.transaction() here — callers that need
  // atomic batch writes are responsible for wrapping at the pool level. Nesting a drizzle
  // transaction inside an already-open pg.PoolClient transaction causes a spurious COMMIT
  // that defeats the caller's ROLLBACK (breaks withProvider test-isolation discipline).
  for (const { pem, keyId, x509 } of parsed) {
    await upsertDigiLockerCert(db, {
      keyId,
      pem,
      notAfter: new Date(x509.validTo),
      notBefore: new Date(x509.validFrom),
      subject: x509.subject,
      fetchedAt: now(),
    });
    keyIds.push(keyId);
  }

  return { refreshed: keyIds.length, keyIds };
}
