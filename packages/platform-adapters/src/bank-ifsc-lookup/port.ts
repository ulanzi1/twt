// `BankIfscLookup` port + the RBI IFSC format regex — Story 6.8 (Task 1, AC2, D4).
//
// The abstraction-first seam for IFSC pre-validation (the 6.5 `OcrProvider` precedent — a PORT
// with a stub v1 implementation, and NO real-vendor CI boundary gate until a real vendor lands).
// A valid IFSC resolves to its `{ bankName, branch }` (public, non-PII, IFSC-derived — Tier-3
// plaintext, D6); an unknown/malformed IFSC resolves to `null` (a dignified "we couldn't recognize
// that IFSC" — the route maps null → Pattern-4 copy, never a raw error).
//
// ── Where this lives (Task 1, verified) ───────────────────────────────────────────────
// Bundled interface + adapters under `packages/platform-adapters/src/bank-ifsc-lookup/` — the
// `ClaimDocumentStorage` shape (co-located in platform-adapters), NOT the `OcrProvider` split
// (whose concrete impl is job-colocated in apps/jobs because a background job is its sole
// consumer). `BankIfscLookup`'s consumers are apps/api routes (member + helpline), so it homes
// here so apps/api imports one instance. NO real-vendor adapter yet (a bundled IFSC dataset or a
// public IFSC API is a future seam).

/** The public, non-PII, IFSC-derived facts a lookup returns (Tier-3 plaintext, D6). */
export interface BankIfscRecord {
  bankName: string;
  branch: string;
}

/**
 * Resolve an IFSC to its bank/branch, cache-first. Returns `null` for an IFSC that is malformed
 * or has no matching branch (the route maps `null` → a dignified Pattern-4 rejection). The format
 * regex (`IFSC_REGEX`) is the caller's first gate; the port is free to re-check.
 */
export interface BankIfscLookup {
  lookup(ifsc: string): Promise<BankIfscRecord | null>;
}

/**
 * The RBI IFSC shape — SINGLE SOURCE OF TRUTH (Task 1). 4-letter bank code + a literal `0` +
 * a 6-char alphanumeric branch code. Used server-side (the route re-asserts it before the port
 * call); the `@twt/contracts` DTO RE-DECLARES the same pattern as a wire constant (contracts must
 * not depend on platform-adapters — the ground-inspection wire-enum re-declaration precedent).
 */
export const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

/** True iff `ifsc` matches the RBI IFSC format (a cheap pre-check before a lookup). */
export function isValidIfscFormat(ifsc: string): boolean {
  return IFSC_REGEX.test(ifsc);
}
