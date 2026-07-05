// packages/channels/src/freeze.ts
//
// The alert-payload immutability-after-dispatch invariant — Story 5.1 (AC4). This is Epic 4's "pure
// function of immutable input" discipline transferred to a new domain: once `dispatch(alert)` is called
// the payload is PERMANENTLY immutable (`Object.freeze` cannot be undone — "after dispatch" means
// forever, not just for the dispatch cycle; a 5.6 retry wrapper must build a NEW alert, never amend a
// dispatched one), enforced at TWO layers:
//   (a) TYPE — `DeepReadonly<Alert>` so renderer signatures cannot even express a mutation.
//   (b) RUNTIME — `deepFreeze` recursively `Object.freeze`s the payload before any renderer runs.
//
// No `deepFreeze` existed in the repo, so this creates it (the reuse-map "create it" entry).
//
// ── Strict-mode guarantee ─────────────────────────────────────────────────────────────────────────────
// This module (and the whole package) is an ES module → ALWAYS strict mode. In strict mode an assignment
// to a frozen property THROWS a `TypeError` (in sloppy mode it would be a silent no-op). The dispatcher
// relies on this: a renderer that attempts to mutate the frozen payload throws, the dispatcher catches it,
// and writes the P0 `alert.immutability_violation` audit line (see dispatch.ts + isFrozenMutationError).

/** Deeply-readonly mapped type — every nested property (through arrays) becomes `readonly`. */
export type DeepReadonly<T> = T extends (infer U)[]
  ? ReadonlyArray<DeepReadonly<U>>
  : T extends readonly (infer U)[]
    ? ReadonlyArray<DeepReadonly<U>>
    : T extends object
      ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
      : T;

/**
 * Recursively `Object.freeze` a value and return it typed `DeepReadonly<T>`. ALWAYS descends into
 * children, even when a node is already frozen — a shallow-frozen root (`Object.freeze(alert)` by a
 * caller) must not smuggle mutable nested objects past the guard (the review-found AC4 hole). Idempotent;
 * cycles are handled via a visited set (frozen-ness can no longer serve as the visited marker). Only
 * objects and arrays are descended — primitives and `null` are returned as-is.
 */
export function deepFreeze<T>(value: T): DeepReadonly<T> {
  freezeRecursive(value, new WeakSet());
  return value as DeepReadonly<T>;
}

function freezeRecursive(value: unknown, seen: WeakSet<object>): void {
  if (value === null || typeof value !== 'object' || seen.has(value)) return;
  seen.add(value);
  if (!Object.isFrozen(value)) Object.freeze(value);
  for (const key of Object.keys(value)) {
    freezeRecursive((value as Record<string, unknown>)[key], seen);
  }
}

/**
 * True when an error is the strict-mode "mutation of a frozen object" signal — assignment, property
 * addition, `delete`, or `Object.defineProperty` on a deep-frozen alert (the AC4 P0 violation). Matched on
 * the `TypeError` message shape emitted by V8 (and other engines) so the dispatcher can distinguish a
 * genuine immutability violation from an unrelated renderer bug. ⚠ String-matching engine messages is
 * inherently brittle (an engine wording change silently declassifies violations; an unrelated TypeError
 * containing "read only" false-positives) — revisit if a structural signal ever becomes available.
 */
export function isFrozenMutationError(err: unknown): boolean {
  if (!(err instanceof TypeError)) return false;
  const msg = err.message.toLowerCase();
  return (
    msg.includes('read only') ||
    msg.includes('read-only') ||
    msg.includes('readonly') ||
    msg.includes('not extensible') ||
    msg.includes('cannot add property') ||
    msg.includes('object is not extensible') ||
    // `delete frozen.x` → "Cannot delete property 'x' of #<Object>" (V8)
    msg.includes('cannot delete property') ||
    // `Object.defineProperty(frozen, ...)` → "Cannot redefine property: x" (V8)
    msg.includes('cannot redefine property')
  );
}
