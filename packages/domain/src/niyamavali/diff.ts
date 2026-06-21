// Structured payload diff — Story 2.3 (Task 6, AC4). Pure + deterministic.
//
// Produces the `niyamavali_amendments.diff_document` (AmendmentDiffDocument):
// a key-path diff between a clause's prior and new `payload`. Uses a recursive
// descent that walks both objects together so that type transitions (e.g.
// object → null) are recorded as a single leaf `changed` entry at the parent
// path rather than being split across spurious added/removed sub-paths (P10).
//
// Path segments are joined by `.`. Literal dots in key names are escaped as
// `\\.` so `{'a.b':1}` → path `a\\.b` is unambiguous from nested `{a:{b:1}}`
// → path `a.b` (P9). The diff is deterministic because keys are visited in
// sorted order and values are compared via canonicalJsonStringify (RFC 8785
// JCS), the same canonicalizer the audit hash-chain uses (DD-1 / ADR-0004).
//
// Opaqueness (freeze row 14): the diff is STRUCTURAL — it never interprets a
// rule. Nested plain objects are recursed into (dot-path keys); arrays and
// primitives are treated as leaf values compared by canonical JSON.

import { canonicalJsonStringify } from '../canonical-json.js';
import type { AmendmentDiffDocument } from '../schema/niyamavali_amendments.js';
import type { ClausePayload } from '../schema/clause_versions.js';

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Canonical-JSON equality (deterministic, order-insensitive for nested objects). */
function jsonEqual(a: unknown, b: unknown): boolean {
  return canonicalJsonStringify(a) === canonicalJsonStringify(b);
}

/**
 * Escape literal dots in a key segment so the path separator `.` is
 * unambiguous: key `a.b` → segment `a\\.b`; nested path `a → b` → `a.b`.
 */
function escapeSeg(key: string): string {
  return key.replace(/\./g, '\\.');
}

function buildPath(prefix: string, key: string): string {
  const seg = escapeSeg(key);
  return prefix === '' ? seg : `${prefix}.${seg}`;
}

/**
 * Recursive diff: walks prev and next together, key-by-key (sorted). When
 * both values are plain objects, recurses; otherwise treats the value as a
 * leaf. This correctly handles object → null / null → object / object →
 * scalar transitions as a single `changed` entry at the parent path, rather
 * than spuriously splitting them across added/removed sub-paths.
 */
function diffObjects(
  prev: Record<string, unknown>,
  next: Record<string, unknown>,
  prefix: string,
  added: Record<string, unknown>,
  removed: Record<string, unknown>,
  changed: Record<string, { from: unknown; to: unknown }>,
): void {
  const allKeys = [...new Set([...Object.keys(prev), ...Object.keys(next)])].sort();
  for (const key of allKeys) {
    const path = buildPath(prefix, key);
    const inPrev = key in prev;
    const inNext = key in next;
    if (inPrev && !inNext) {
      removed[path] = prev[key];
    } else if (!inPrev && inNext) {
      added[path] = next[key];
    } else {
      const pv = prev[key];
      const nv = next[key];
      if (isPlainObject(pv) && isPlainObject(nv)) {
        diffObjects(pv, nv, path, added, removed, changed);
      } else if (!jsonEqual(pv, nv)) {
        changed[path] = { from: pv, to: nv };
      }
    }
  }
}

/**
 * Compute the structured key-path diff between `prev` and `next` payloads.
 * `added`   — paths present in `next` but not `prev`        (→ new value)
 * `removed` — paths present in `prev` but not `next`        (→ prior value)
 * `changed` — paths present in both whose value differs     (→ { from, to })
 * All three maps carry keys in sorted path order (deterministic output).
 *
 * Path notation: `.` separates nesting levels; literal `.` in a key name is
 * escaped as `\\.` to prevent ambiguity.
 */
export function computePayloadDiff(
  prev: ClausePayload,
  next: ClausePayload,
): AmendmentDiffDocument {
  const added: Record<string, unknown> = {};
  const removed: Record<string, unknown> = {};
  const changed: Record<string, { from: unknown; to: unknown }> = {};
  diffObjects(prev, next, '', added, removed, changed);
  return { added, removed, changed };
}
