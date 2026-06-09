// Canonical-JSON serializer per architecture line 898-902 + RFC 8785 JCS.
//
// A SINGLE canonicalizer for every hash producer / verifier in the system:
//   - Story 1.3 events package replay determinism (this file's own tests).
//   - Story 1.10 audit log hash-chain (prev_hash + this_hash computation).
//   - Story 7.x  Pool Engine snapshot integrity hash (snapshot-hash writers).
//   - Story 1.11a audit-log integrity-check job (chain verification).
//
// ADR-0004-canonical-json captures the algorithm + the deferred library swap
// path. Choice rationale: hand-rolled RFC 8785 JCS subset for v1 (~30 lines,
// no transitive-dep cost, bounded payload shapes); ADR-0004 forward-path
// commits to a library swap when the subset bites (floats > 15 sig digits,
// BigInt, surrogate-pair pathologies).

export type CanonicalJsonValue =
  | null
  | boolean
  | number
  | string
  | CanonicalJsonValue[]
  | { [k: string]: CanonicalJsonValue };

export function canonicalJsonStringify(value: unknown): string {
  if (typeof value === 'bigint') {
    throw new TypeError(
      'canonicalJsonStringify: BigInt is not representable in JSON (RFC 8785)',
    );
  }
  if (value === undefined) {
    throw new TypeError(
      'canonicalJsonStringify: undefined is not representable in JSON',
    );
  }
  if (value instanceof Date) {
    throw new TypeError(
      'canonicalJsonStringify: Date is not representable in JSON — convert to ISO string first',
    );
  }
  return canonicalize(value as CanonicalJsonValue);
}

function canonicalize(value: CanonicalJsonValue): string {
  if (value === null) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new TypeError(
        'canonicalJsonStringify: non-finite numbers (NaN / Infinity) are not representable in JSON',
      );
    }
    return canonicalNumber(value);
  }
  // RFC 8259 string-escaping. JSON.stringify on a primitive string is
  // safe + RFC-compliant; it never emits trailing commas or whitespace.
  if (typeof value === 'string') return JSON.stringify(value);

  if (Array.isArray(value)) {
    return '[' + value.map((v) => canonicalize(v)).join(',') + ']';
  }

  // Object: sort keys lexicographically by UTF-16 code unit order per
  // RFC 8785 §3.2.3 — Array.prototype.sort default comparator does exactly
  // this for strings.
  const keys = Object.keys(value).sort();
  return (
    '{' +
    keys
      .map((k) => JSON.stringify(k) + ':' + canonicalize(value[k] as CanonicalJsonValue))
      .join(',') +
    '}'
  );
}

function canonicalNumber(n: number): string {
  // RFC 8785 §3.2.2 — IEEE 754 double-precision → shortest round-trippable
  // decimal. ECMAScript's Number → String uses the shortest-form algorithm
  // (ECMA-262 §7.1.12.1) which matches RFC 8785 for the integer + finite-
  // decimal ranges relevant to TWT v1 event payloads (currency amounts as
  // paise integers, counters, ISO timestamp strings). If a future payload
  // needs canonical-JSON for high-precision floats, swap to the canonicalize
  // npm package per ADR-0004 forward-path.
  if (Object.is(n, -0)) return '0'; // -0 and 0 are the same JSON number.
  return String(n);
}
