// Daily DigiLocker cert-refresh cron — Story 3.3b (Task 7; AC5.2).
//
// Pure part: the config-gated env fetcher (no source configured → harmless no-op). Live-DB
// part (:5433): the worker invokes the relocated @twt/domain `refreshDigiLockerCerts`
// primitive, upserts into the GLOBAL `digilocker_public_certs` cache, and BUMPS `fetched_at`
// (the staleness clock) on re-run — and is NOT fail-closed on a fetcher failure (§2.8).

import { randomUUID } from 'node:crypto';

import { bindScopedDb, createDb, kyc, type Db } from '@twt/domain';
import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  createEnvCertFetcher,
  runDigiLockerCertRefresh,
} from '../src/digilocker-cert-refresh.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);

// A valid self-signed X.509 (CN=TWT Test DigiLocker Issuer, notAfter 2046) — refreshDigiLockerCerts
// parses it with node:crypto X509Certificate (throws on a malformed PEM).
const TEST_CERT_PEM = `-----BEGIN CERTIFICATE-----
MIIDUTCCAjmgAwIBAgIUZd09IOoJkuUvQleYANUB9hRJkKEwDQYJKoZIhvcNAQEL
BQAwODEjMCEGA1UEAwwaVFdUIFRlc3QgRGlnaUxvY2tlciBJc3N1ZXIxETAPBgNV
BAoMCFRXVCBUZXN0MB4XDTI2MDYyNjA3NTAxMVoXDTQ2MDYyMTA3NTAxMVowODEj
MCEGA1UEAwwaVFdUIFRlc3QgRGlnaUxvY2tlciBJc3N1ZXIxETAPBgNVBAoMCFRX
VCBUZXN0MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAow5P78SFzxuw
pm0FO5AXpY8NSDdOd+44bOYvDhhKN+W9+7WbWwsh0JeB2ol8sNARreSKlstlv+MK
9gZHYPYsRiYqf9U/SJ/dPn5IUGMJwa3Isny+uObKrNId7OcSoDZpPlLTQBUG16BU
1Nok2K2W2URsWRy7z4F8I6KUQRf+LPPkHgWAY6yyXC3cWpzz9AGSbZsvVom6RQaA
7rRz+C2sFwq918ohrrnMggPeDjG9TwlVOKPmAdNfE7WRyVWITxcH4/aDxULJkZSW
oJEDGbphlkE+X1MFbGRmvJy1SZa/MGmZ/37yQ5kKyIfqqe3pOuADahwg0+Kq3pUh
Vf0rgnymSwIDAQABo1MwUTAdBgNVHQ4EFgQUj8fS17gF68h3yB7tQ2HAemawSSAw
HwYDVR0jBBgwFoAUj8fS17gF68h3yB7tQ2HAemawSSAwDwYDVR0TAQH/BAUwAwEB
/zANBgkqhkiG9w0BAQsFAAOCAQEARnK2+fEDJB8R0j2q23nWlGDtef9J7XnNup9u
kjbVzVsNsJRqXSiqZYx2EiPGNitY28/WG4mo9EoREQr+3G17C8SvxKGh+sinL9P7
24Z03DzOGjqUDIZ8DITUZcnogU7WBlpB2GuyNcgNr7C3gAomoZPVUQtd4g83I1j+
S2SU7ZJAODFK7tm70YMF106CrCc5f4HLVDBIsL8Lvk00a3K3rW9waSf5da2ZKv4G
SKExH6j/jnVx5XCL+7u7RnvNvl08Gt7YkIJOHiIhUl6BOLWTMsJQYE5xEvHh1dyk
3Qf9idCx/VvGTWwdrgljc13SnYyvD2qUwuKhvnhe+YzMZP+hnw==
-----END CERTIFICATE-----`;

describe('createEnvCertFetcher (config-gated)', () => {
  it('returns [] when no cert source is configured (harmless no-op)', async () => {
    const fetcher = createEnvCertFetcher({});
    expect(await fetcher.fetchIssuerCerts()).toEqual([]);
  });

  it('returns the inline PEM when DIGILOCKER_ISSUER_CERT_PEM is set', async () => {
    const fetcher = createEnvCertFetcher({
      DIGILOCKER_ISSUER_CERT_PEM: TEST_CERT_PEM,
      DIGILOCKER_ISSUER_CERT_KEY_ID: 'pinned-key',
    });
    expect(await fetcher.fetchIssuerCerts()).toEqual([{ keyId: 'pinned-key', pem: TEST_CERT_PEM }]);
  });
});

describe('runDigiLockerCertRefresh — not fail-closed (§2.8)', () => {
  it('alarms + returns null on a fetcher failure (leaves the cache untouched)', async () => {
    const alarms: string[] = [];
    const result = await runDigiLockerCertRefresh({
      db: {} as Db, // never reached — the fetcher throws first
      fetcher: {
        async fetchIssuerCerts() {
          throw new Error('source unreachable');
        },
      },
      onAlarm: (m) => alarms.push(m),
    });
    expect(result).toBeNull();
    expect(alarms.some((a) => a.includes('FAILED'))).toBe(true);
  });
});

describe.skipIf(!hasDatabase)('runDigiLockerCertRefresh — live DB (:5433)', () => {
  let pool: pg.Pool;

  beforeAll(() => {
    pool = createDb(DATABASE_URL!, { max: 2, ssl: false }).pool;
  });
  afterAll(() => pool.end());

  it('upserts the cert into the GLOBAL cache and BUMPS fetched_at on re-run', async () => {
    // Run inside a tx that ROLLS BACK — the cert cache is GLOBAL, so a committed test cert
    // would pollute the apps/api staleness suite (listActiveCerts reads the newest active
    // cert across the whole cache). The withProvider-rollback discipline, applied here.
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const db: Db = bindScopedDb(client);
      const keyId = `test-key-${randomUUID()}`;
      const fetcher = {
        async fetchIssuerCerts() {
          return [{ keyId, pem: TEST_CERT_PEM }];
        },
      };

      const t1 = new Date('2026-06-01T00:00:00Z');
      const r1 = await runDigiLockerCertRefresh({ db, fetcher, now: () => t1 });
      expect(r1).toEqual({ refreshed: 1, keyIds: [keyId] });

      const cert1 = await kyc.getActiveCertByKeyId(db, keyId);
      expect(cert1?.pem).toBe(TEST_CERT_PEM);
      expect(cert1?.notAfter).not.toBeNull(); // parsed from the X.509
      expect(cert1?.fetchedAt.getTime()).toBe(t1.getTime());

      // A later refresh bumps fetched_at (the staleness clock the budget reads).
      const t2 = new Date('2026-06-08T00:00:00Z');
      await runDigiLockerCertRefresh({ db, fetcher, now: () => t2 });
      const cert2 = await kyc.getActiveCertByKeyId(db, keyId);
      expect(cert2?.fetchedAt.getTime()).toBe(t2.getTime());
      expect(cert2!.fetchedAt.getTime()).toBeGreaterThan(cert1!.fetchedAt.getTime());
    } finally {
      await client.query('ROLLBACK');
      client.release();
    }
  });
});
