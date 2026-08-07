// The three architecturally-frozen JSONB hard-limit classes — Story 10.12 (Task 3; AC5).
//
// ── WHAT IS FROZEN AND WHAT IS NOT ─────────────────────────────────────────────────────────────────
// Architecture §1.7 (architecture.md:973-991) says, verbatim:
//
//     "The EXISTENCE of these three limit classes is architecturally frozen"
//     "The SPECIFIC NUMERIC VALUES … are operational policy under Trustee-Panel review"
//
// So: the classes below may not be removed by a story. Their NUMBERS may be changed by the Trustee
// Panel without an architecture amendment, on the same footing as the FR-15 fixed contribution amount
// and the FR-8 lock-in days.
//
// ── THE REVIEW PATH (the FR-15 / FR-8 precedent), stated because AC5 requires it stated ────────────
// A change to any value here is an OPERATIONAL POLICY change, and takes the FR-15/FR-8 route:
//   1. A trustee raises the proposed value with its operating rationale (what query, what payload,
//      what growth observation prompted it).
//   2. The Trustee Panel ratifies it as a decision-log entry.
//   3. The constant changes in a PR citing that decision, with its one-line justification updated
//      below. There is no ADR and no architecture amendment — those are for the CLASSES, not values.
//
// The implementation-readiness report (implementation-readiness-report-2026-05-28.md:702) recommended
// exactly this: "Story 10.12 should reference this policy review mechanism in its AC". That
// recommendation was applied to §1.7 and NEVER APPLIED TO THE EPIC — this module is where it lands.
//
// ── ⚠ THE HONEST COVERAGE ADMISSION — READ BEFORE ASSUMING THESE BIND ANYTHING ─────────────────────
// §1.7 says these limits bind "every JSONB write path … no code path bypasses them."
//
// THEY CURRENTLY BIND NONE OF THE REPO'S ~20 OTHER JSONB COLUMNS. Not `events_log.payload`, not
// `clause_versions.payload`, not `cohort_definition`, not `policy_document`, not `member_scope_context`
// — none of them. This story enforces all four on ITS OWN write paths (definition publish + member
// custom-fields write) and lands this module as the DESTINATION for the rest. It does not retro-fit
// them: that is a pre-existing, repo-wide gap far larger than one story, recorded as ESCALATION 3 in
// `deferred-work.md`.
//
// Do not read the existence of this module as coverage. If you are adding a JSONB write path, import
// these and enforce them — that is how the gap closes, one path at a time.

/**
 * Max JSON payload per `members.custom_fields` write, in bytes (limit class 1).
 *
 * v1 = 8 KiB. Chosen against the §1.7 use cases (an alternate ID number, a school block code, a cadre
 * grade): 32 definitions of a few dozen bytes each is well under 4 KiB, so 8 KiB leaves generous room
 * for `string_array` fields while staying far below the ~2 KiB TOAST threshold multiplier at which a
 * row starts paying out-of-line storage on every read. A tenant that needs more than 8 KiB per member
 * is storing a document, which is not what this substrate is.
 */
export const CUSTOM_FIELDS_MAX_PAYLOAD_BYTES = 8192;

/**
 * Max nesting depth of a custom-fields payload (limit class 2).
 *
 * v1 = 3. The envelope itself is depth 1 (`{...}`), `values` is depth 2, and a `string_array`'s
 * elements are depth 3. So 3 is exactly "the v1 vocabulary and not one level more" — nested objects
 * are a deferred narrowing (§1.7 permits "small bounded objects"; v1 ships flat scalars + bounded
 * string arrays), and this number is what makes that narrowing enforced rather than merely intended.
 */
export const CUSTOM_FIELDS_MAX_NESTING_DEPTH = 3;

/**
 * Per-Pariwar GIN index growth ceiling, in bytes (limit class 3).
 *
 * v1 = 256 MiB. ⚠ THIS IS AN OBSERVED SIGNAL, NOT A WRITE-TIME CHECK. See {@link ginIndexBytes}: it is
 * read from `pg_relation_size` and surfaced for AR-31 observability. Checking an index's SIZE on every
 * row write would put a catalog read on a hot path to enforce a bound that moves in aggregate, not
 * per row — which is why §1.7's "write-rate limit when approached" is a separate mechanism, and one
 * this story does NOT build (ESCALATION 3).
 *
 * 256 MiB is a per-Pariwar alarm threshold, not a hard stop: a `jsonb_ops` GIN index over 8 KiB
 * payloads across a large Pariwar's membership is expected in the tens of MiB, so crossing this means
 * something changed in kind (a mis-declared array field, a runaway import) and wants a human looking.
 */
export const CUSTOM_FIELDS_GIN_INDEX_BUDGET_BYTES = 256 * 1024 * 1024;

/**
 * Max in-force custom-field definitions per Pariwar, per host entity (the §1.7 cardinality bound).
 *
 * v1 = 32. Enough for every §1.7 use case several times over; small enough that the admin list stays
 * a page a human reads rather than a search problem, and small enough that the per-write validation
 * loop and the GIN index both stay cheap. Retired definitions do not count — retirement is how a
 * Pariwar makes room.
 */
export const CUSTOM_FIELD_DEFINITIONS_MAX_PER_PARIWAR = 32;

/**
 * Max length of a single `string` value or a `string_array` element, and the ceiling a definition's
 * own `max_length` may declare.
 *
 * Not one of the three §1.7 frozen classes — a plain sanity bound on the vocabulary, kept here so
 * every number a tenant write is measured against lives in one file.
 */
export const CUSTOM_FIELD_MAX_STRING_LENGTH = 512;

/** Max elements in a `string_array` value, and the ceiling a definition's `max_items` may declare. */
export const CUSTOM_FIELD_MAX_ARRAY_ITEMS = 32;

/** Max entries in an `enum` definition's `enum_values` list. */
export const CUSTOM_FIELD_MAX_ENUM_VALUES = 64;

/** Max length of a `field_key`. Bounded because it is a JSONB key on a hot table and a GIN index term. */
export const CUSTOM_FIELD_MAX_KEY_LENGTH = 64;

/** Max length of a label (either language). A field name, never a paragraph. */
export const CUSTOM_FIELD_MAX_LABEL_LENGTH = 120;

/**
 * The byte size of a payload as Postgres will store it — `Buffer.byteLength` over the canonical JSON
 * form, not `JSON.stringify(...).length`, because a Hindi label or a Devanagari value is 3 bytes per
 * character in UTF-8 and a `.length` check would silently permit roughly three times the intended
 * payload for exactly the tenants most likely to author one.
 */
export function payloadByteLength(payload: unknown): number {
  return Buffer.byteLength(JSON.stringify(payload) ?? '', 'utf8');
}

/**
 * The maximum nesting depth of a JSON value. A scalar is depth 0; `{}` / `[]` are depth 1.
 *
 * Iterative rather than recursive on purpose: this runs on tenant-supplied input, and a deeply nested
 * payload must fail the DEPTH CHECK rather than the call stack. A recursive walker would throw
 * `RangeError: Maximum call stack size exceeded` — an untyped 500 — on precisely the input this
 * function exists to reject with a typed error.
 */
export function jsonDepth(value: unknown): number {
  let maxDepth = 0;
  const stack: Array<{ node: unknown; depth: number }> = [{ node: value, depth: 0 }];
  while (stack.length > 0) {
    const { node, depth } = stack.pop()!;
    if (depth > maxDepth) maxDepth = depth;
    // Bail out well past the limit — a pathological payload should not be fully walked just to be
    // told it is too deep.
    if (maxDepth > CUSTOM_FIELDS_MAX_NESTING_DEPTH * 4) return maxDepth;
    if (Array.isArray(node)) {
      for (const child of node) stack.push({ node: child, depth: depth + 1 });
    } else if (typeof node === 'object' && node !== null) {
      for (const child of Object.values(node)) stack.push({ node: child, depth: depth + 1 });
    }
  }
  return maxDepth;
}
