// KYC module barrel — Story 3.3a.
//
// Wires the KYC provider abstraction as IMPORTABLE units (no route registration in 3.3a —
// PRIMITIVE, no surface; `registerKycModule` + server.ts wiring + HTTP routes land in
// 3.3b). Exports: the provider registry + FR-58C swap seam, the request context type, the
// fixture provider (the config-absent fallback), and the DigiLocker provider's public API
// (factory + transport factory + cert-refresh + staleness policy).
//
// Consumers import the `KycProvider` PORT from `@twt/contracts`; this barrel exposes the
// app-layer construction surface (registry, builders, deps shapes) — never the DigiLocker
// transport libs, which stay fenced inside providers/digilocker/.

export type { KycProviderContext } from './context.js';
export * from './provider-registry.js';
export { fixtureKycProvider } from './providers/fixture.js';
export {
  type CertStalenessAlarm,
  type DigiLockerProviderConfig,
  type DigiLockerProviderDeps,
  type DigiLockerTransport,
  type DigiLockerCertFetcher,
  type FetchedIssuerCert,
  type RefreshCertsResult,
  type CertStaleness,
  CERT_STALENESS_HARD_LIMIT_MS,
  CERT_STALENESS_WITHIN_BUDGET_MS,
  DIGILOCKER_PROVIDER_KEY,
  createDigiLockerProvider,
  createHttpDigiLockerTransport,
  evaluateCertStaleness,
  refreshDigiLockerCerts,
} from './providers/digilocker/index.js';
