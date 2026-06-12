# ADR-0004: Canonical-JSON serialization — RFC 8785 JCS hand-rolled subset

> **Status:** drafted
> **Date:** 2026-06-09
> **Author:** Solo Builder (BigDev), discharging architecture §1.5 line 898-902 + the latent §Deferred Decisions slot that emerged with the first hash-chain consumer at Story 1.3 closure.
> **Ratifying trustees:** _pending Trustee Panel session_
> **Supersedes:** (none)
> **Superseded by:** (none)

## Context

Architecture §1.5 line 898-902 commits the **property**:

> A single canonical-JSON specification is committed in an ADR — one library,
> one version across all consumers of the `packages/events/` hash chain. All
> hash producers and verifiers — Pool Engine snapshot writers, audit-log
> writers, integrity-check job — use the same canonicalizer. Divergent
> canonicalization is a build-time error.

The hash-chain consumers known at this ADR's commit:

- **Story 1.3 `packages/events`** — event log replay determinism (AR-57). This
  ADR's first consumer is the events package itself: `replayState` produces
  byte-deterministic state only if event payloads are serialized identically
  on every read-and-hash boundary. (At Story 1.3 the canonical-JSON serializer
  is consumed only by callers that hash payloads; the events_log table
  itself stores JSONB and is hash-agnostic.)
- **Story 1.10 audit log hash-chain (FR-47 + AR-9 + AR-10)** — `prev_audit_hash`
  + `audit_hash` computation across every audit-log entry; tamper-evident
  with off-site mirror at 6h cadence per architecture §1.5.
- **Story 1.11a audit-log integrity-check job** — verifies the chain on a
  scheduled cadence + on demand; consumes the same serializer the writers used.
- **Story 7.x Pool Engine snapshot integrity hash** — architecture §1.6
  line 904-934; the snapshot-of-membership-at-freeze that Pool Engine
  determinism rests on.

Architecture commits the **property** (one canonicalizer, no divergence). This
ADR records the **control** — the specific algorithm + implementation choice +
the forward-path commitment per `[[feedback_architecture_vs_adr_boundary]]`.

## Decision

**Adopt RFC 8785 JSON Canonicalization Scheme (JCS) as the canonical-JSON
algorithm.** Implement a **hand-rolled subset** at `packages/events/src/canonical-json.ts`
sufficient for v1 payload shapes; commit the forward-path to a battle-tested
library if the subset bites at any downstream Story boundary.

### Algorithm — RFC 8785 JCS

The serializer produces deterministic JSON bytes via these rules (RFC 8785 §3):

1. **Object keys** sorted lexicographically by UTF-16 code unit order
   (RFC 8785 §3.2.3). JavaScript's `Array.prototype.sort()` default comparator
   does exactly this for strings.
2. **Array order preserved** — arrays are ordered structures, not sets.
3. **String escaping** per RFC 8259. `JSON.stringify` on a primitive string
   is RFC-compliant.
4. **Number representation** per RFC 8785 §3.2.2 — IEEE 754 double-precision
   in shortest round-trippable decimal form. ECMAScript's
   `Number → String` (§7.1.12.1) matches RFC 8785 for the integer + finite-
   decimal ranges relevant to v1 TWT payloads (paise integers, version
   counters, ISO timestamp strings).
5. **`-0` normalizes to `0`** — `-0` and `0` are the same JSON number.
6. **No whitespace** between tokens. No insignificant zeros. No alternate escapes.
7. **Non-finite numbers** (NaN, ±Infinity) raise `TypeError` — RFC 8259
   forbids them at the JSON spec layer.

### Implementation — hand-rolled, ~30 lines

Authored at `packages/events/src/canonical-json.ts`. Tests at
`packages/events/tests/canonical-json.test.ts` cover key-order independence,
escaping, numeric normalization, and round-trip equivalence.

> **Amendment — Story 1.10 (DD-1, 2026-06-12):** the implementation **moved** to
> `packages/domain/src/canonical-json.ts` and is now the SINGLE canonicalizer
> home. The audit-log hash chain (`audit_log_entries` writer + `verifyChainSegment`)
> and its domain-level producers (`KmsProvider.auditHook`, `runAsCrossTenant`)
> must call the canonicalizer from inside `@twt/domain`; since `@twt/events`
> already depends on `@twt/domain`, keeping it in `@twt/events` would be a layering
> inversion + a turbo task-graph cycle (D13-1.5). Consumers now import
> `canonicalJsonStringify` from `@twt/domain`; **`@twt/events` re-exports it via a
> thin shim at `packages/events/src/canonical-json.ts`** so its public surface +
> tests are unchanged. The authoritative test suite is co-located at
> `packages/domain/tests/canonical-json.test.ts`. There remains exactly ONE
> definition in the repo (`encryption/canonical-context.ts` defines the scoped
> `encryptionContextAad` AAD helper, not a second `canonicalJsonStringify`).

## Alternatives considered

1. **`canonicalize` npm package** — well-maintained, exact RFC 8785 conformance,
   ~3 KB minified, no transitive deps. The closest off-the-shelf alternative.
   Rejected at v1 in favor of in-tree implementation because:
   - The subset is ~30 lines of vetted, tested TS — small enough that the
     "library" risk surface (supply chain, version drift, transitive deps
     creeping in across major bumps) outweighs the build-time cost.
   - v1 TWT event payloads are bounded shapes — paise integers, ISO timestamp
     strings, UUIDs, booleans, nulls, nested objects. No floats with > 15
     significant digits; no BigInt; no surrogate-pair pathologies. The subset
     covers 100% of v1 payload shapes by construction.
   - Per Story 1.2 D12-1.2 dep-pin discipline + architecture's "one library,
     one version" commitment, the dependency surface is treated as a
     committed cost; in-tree code is treated as a maintainable cost.
2. **`json-stable-stringify`** — popular sorted-keys library. Rejected
   because it does NOT conform to RFC 8785 exactly for some edge cases
   (number representation differs). Adopting it would create a future
   divergence-risk against the architecture's "one canonicalizer" property.
3. **`fast-json-stable-stringify`** — sorted-keys, no JCS conformance
   commitment. Rejected for the same reason as `json-stable-stringify`.

## Constraints

The hand-rolled subset is bounded by what v1 payload shapes require. Specifically:

- **Floats**: ECMAScript's `Number → String` matches RFC 8785 for finite
  decimal ranges through ~15 significant digits. v1 payloads use paise
  integers, not floats; if a future payload introduces a high-precision
  decimal (e.g., interest rate to 8 decimal places), revisit.
- **BigInt**: not supported by `JSON.stringify` (throws) and explicitly not
  representable in JSON per RFC 8259. The subset throws on BigInt by
  inheritance; if a future payload needs `bigint` semantics, the consumer
  is responsible for stringifying it before passing.
- **Surrogate-pair code points** beyond UTF-16 BMP: `JSON.stringify` on
  strings handles this correctly per ECMAScript §24.5.2 — the subset
  inherits that behavior. No additional logic required at v1 scale.

## Forward path

If any of the above constraints bite at a downstream Story boundary:

1. Swap the hand-rolled implementation in `packages/events/src/canonical-json.ts`
   to a call into the `canonicalize` npm package.
2. The public `canonicalJsonStringify` API does not change — only the body.
3. Add a property-test against RFC 8785 reference vectors as the gate.
4. Re-run all hash-chain consumers' integrity tests (Story 1.10 audit-log,
   Story 1.11a integrity-check job, Story 7.x Pool Engine snapshot) to
   verify byte-equivalence before-and-after the swap. Any pre-existing
   hash chain remains valid only if the swap is byte-equivalent at the
   payloads in flight; otherwise the swap is a hard cut at a version
   boundary documented in the audit log.
5. ADR-0004 supersession marker added; new ADR records the swap + the
   payload-shape that triggered it.

## Authoring location

`packages/events/src/canonical-json.ts` — packaged with the events workspace
because the first hash producer is the events package itself. Hash consumers
that live in `packages/domain/` (audit-log writers, Story 1.10) or
`packages/events/` (Pool Engine snapshot writers, Story 7.x) import
`canonicalJsonStringify` from `@twt/events`.

Cross-consumer dependency rule (architecture §1.5 line 898-902): the build is
required to fail if any workspace re-implements the algorithm OR pulls in a
second canonicalization library. Story 1.16c committed the substantive
forbidden-pattern asserts that police this discipline. Story 1.3 commits the
substrate; Story 1.16c commits the test that catches divergence.

## Status lifecycle

- **drafted** at Story 1.3 closure — substantive author-commit; rationale on file.
- **under-trustee-review** post-Story-1.3-review — set when the Story 1.3 PR
  merges to main; tracked at `docs/knowledge-transfer/adr-index.md`.
- **ratified** per Trustee Panel session — light-touch ratification because
  the choice is reversible at any Story boundary (the public API does not
  change across the implementation swap).
- **superseded** if a future ADR commits a different algorithm or
  implementation choice. The supersession marker records the trigger
  (constraint bit; new payload shape) + the migration plan (byte-equivalent
  swap OR hard-cut with audit-log boundary).

## Per [[feedback_closure_language_precision]] posture

- **Algorithm + implementation choice = Closed by [edit]** at Story 1.3 commit:
  `packages/events/src/canonical-json.ts` exists; 10 unit tests pass; the
  hash-producer consumers wire up at Stories 1.10 + 7.x with this ADR
  cited as the source-of-truth.
- **Trustee Panel ratification = Resolved via explicit deferral**, tracked at
  `docs/knowledge-transfer/adr-index.md` Status row-count table; expected
  ratification at next Trustee Panel session.
- **Substantive integrity-check + tamper-evidence wiring = deferred**, owned
  by Story 1.10 (audit-log) + Story 1.11a (integrity-check job) + Story 7.x
  (Pool Engine snapshot). Story 1.3 ships the serializer; these Stories
  ship the consumers.

## References

- Architecture §1.5 line 898-902 — canonical-JSON property + "one library, one version".
- Architecture §1.6 line 904-934 — Pool Engine snapshot hash consumer.
- Architecture §Cross-Cutting #4 — Determinism & replay.
- AR-8 (epics line 263) — packages/events immutability.
- AR-9 / AR-10 — audit log hash chain + tamper evidence.
- AR-57 — Pool Engine assignment determinism + replay.
- AR-58 — Idempotency keyed store.
- ADR-0003-datastore-engine — Story 1.2 precedent for ADR Status flow.
- RFC 8785 — JSON Canonicalization Scheme (JCS).
- RFC 8259 — The JavaScript Object Notation (JSON) Data Interchange Format.
- ECMA-262 §7.1.12.1 — Number-to-String algorithm.
- `canonicalize` npm package — https://www.npmjs.com/package/canonicalize (reference RFC 8785 implementation).
- Story 1.3 `_bmad-output/implementation-artifacts/1-3-packages-events-event-log-primitive.md`.
- Story 1.3 `packages/events/src/canonical-json.ts` — implementation.
- Story 1.3 `packages/events/tests/canonical-json.test.ts` — RFC 8785 conformance tests.
