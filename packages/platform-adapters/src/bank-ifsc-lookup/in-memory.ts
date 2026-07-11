// In-memory `BankIfscLookup` — Story 6.8 (Task 1, D4).
//
// The stub adapter for v1 + tests (no real IFSC vendor). A small fixture map of well-known
// Indian bank branches + a per-instance cache; an unknown or malformed IFSC returns `null` (the
// same not-found signal a real adapter gives). Mirrors the fake-adapter discipline every
// injectable seam in the stack provides (the in-memory ClaimDocumentStorage / fake KMS pattern).
//
// The cache makes `lookup` cache-first (AC2 "cached … before submission"): a repeated IFSC skips
// the fixture scan. It is per-instance + unbounded-but-tiny (the fixture is the only source), so
// there is no eviction concern — a real adapter would own a real cache with a TTL.

import { type BankIfscLookup, type BankIfscRecord, isValidIfscFormat } from './port.js';

/** A handful of real IFSC prefixes → bank/branch, enough for demos + deterministic tests. Keyed
 *  by the FULL IFSC (uppercased). Extend freely — the stub is not the product. */
const FIXTURE: Readonly<Record<string, BankIfscRecord>> = {
  SBIN0000001: { bankName: 'State Bank of India', branch: 'Nariman Point, Mumbai' },
  HDFC0000001: { bankName: 'HDFC Bank', branch: 'Sandoz House, Worli, Mumbai' },
  ICIC0000001: { bankName: 'ICICI Bank', branch: 'Backbay Reclamation, Mumbai' },
  PUNB0234500: { bankName: 'Punjab National Bank', branch: 'Bhikaji Cama Place, New Delhi' },
  UTIB0000005: { bankName: 'Axis Bank', branch: 'Chandigarh Sector 17' },
  BARB0DBGHAT: { bankName: 'Bank of Baroda', branch: 'Ghatlodia, Ahmedabad' },
  CNRB0001912: { bankName: 'Canara Bank', branch: 'Jayanagar, Bengaluru' },
  KKBK0000261: { bankName: 'Kotak Mahindra Bank', branch: 'MG Road, Bengaluru' },
};

export interface InMemoryBankIfscLookup extends BankIfscLookup {
  /** Test introspection / seeding: add or override a fixture entry (keyed by uppercased IFSC). */
  seed(ifsc: string, record: BankIfscRecord): void;
}

/**
 * Construct an in-memory `BankIfscLookup`. `lookup` uppercases + format-checks the input, serves
 * from the per-instance cache when warm, else resolves from the fixture (caching the result,
 * including a `null` miss so a repeated unknown IFSC does not re-scan). Malformed input → `null`.
 */
export function createInMemoryBankIfscLookup(): InMemoryBankIfscLookup {
  const fixture = new Map<string, BankIfscRecord>(Object.entries(FIXTURE));
  const cache = new Map<string, BankIfscRecord | null>();

  return {
    seed(ifsc, record) {
      fixture.set(ifsc.toUpperCase(), record);
      cache.delete(ifsc.toUpperCase());
    },
    async lookup(ifsc) {
      const key = ifsc.toUpperCase();
      if (!isValidIfscFormat(key)) return null;
      const cached = cache.get(key);
      if (cached !== undefined) return cached;
      const resolved = fixture.get(key) ?? null;
      cache.set(key, resolved);
      return resolved;
    },
  };
}
