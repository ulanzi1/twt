// Measured-validation framework — the STRONGER-THAN-HASH replay proof (AI-6-2 / AI-4-2; "replay proves
// more than same-hash", BigDev 2026-07-17).
//
// The pure-hash gate (`determinism.test.ts`) answers "is the digest stable?" — but two real failure modes
// slip past it: (1) a NON-HASHED field diverges while the hashed subset stays constant (the hash's field
// coverage is assumed, never proven), and (2) a DEGENERATE/constant hash (a bug returning a fixed string)
// passes the single-distinct-value assertion VACUOUSLY. `assertReplayStable` closes both — the
// semantic-coverage discipline ([[feedback_gate_scope_semantic_coverage]]) applied to determinism: a green
// that proves nothing is not a green.
//
// Contract: same input → identical payload AND identical hash; different input → different hash.
//   (a) full canonical-payload DEEP EQUALITY across replays  — proves coverage (any diverging field, even
//       one the hash omits, fails the payload compare)
//   (b) exactly ONE distinct hash across replays              — the classic replay invariant
//   (c) a perturbed input yields a DIFFERENT hash             — proves the digest is a real function of the
//       varying state, not a vacuous constant
//
// Story 7.9 inherits the SAME two-part proof for pool assignment: full assignment-map deep equality +
// `cycle_id` discrimination, NOT a bare `hash(member_id+cycle_id)%N` digest match.

import { canonicalJsonStringify, type CanonicalJsonValue } from '@twt/domain';

/** One replay observation: the FULL canonical payload object AND its digest. */
export interface ReplaySample {
  payload: unknown;
  hash: string;
}

export interface AssertReplayStableInput {
  /** K ≥ 2 replays of the SAME seeded input — must be byte-identical AND single-hash. */
  replays: readonly ReplaySample[];
  /**
   * A replay of a DELIBERATELY PERTURBED input (different member_state / instant / clause). Its hash MUST
   * differ from the stable replay hash — proving the digest covers the varying fields (no vacuous constant).
   * Optional only so a caller can stage it separately; a full proof supplies it.
   */
  perturbed?: ReplaySample;
  /** Expected digest format (default: 64-hex sha256). Guards against an empty/degenerate hash string. */
  hashPattern?: RegExp;
}

const SHA256_HEX = /^[0-9a-f]{64}$/;

/** Canonicalise a payload for order-insensitive deep equality (same basis the payload hash uses). */
function canonical(payload: unknown): string {
  try {
    return canonicalJsonStringify(payload as CanonicalJsonValue);
  } catch (err) {
    throw new Error(
      `[assertReplayStable] payload is not canonicalizable: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

/**
 * Assert the full replay-stability contract (a)+(b)+(c). THROWS a descriptive Error on ANY violation, so
 * a stable-but-incomplete hash, a degenerate constant hash, OR a diverging non-hashed field each FAILS.
 * On success returns the single stable hash.
 */
export function assertReplayStable(input: AssertReplayStableInput): string {
  const { replays } = input;
  const pattern = input.hashPattern ?? SHA256_HEX;
  if (replays.length < 2) {
    throw new Error(`[assertReplayStable] need ≥2 replays to prove stability, got ${replays.length}`);
  }

  // (b) exactly ONE distinct hash, and it is a well-formed digest (not '' / a degenerate constant shape).
  const distinctHashes = new Set(replays.map((r) => r.hash));
  if (distinctHashes.size !== 1) {
    throw new Error(
      `[assertReplayStable] non-deterministic hash: ${distinctHashes.size} distinct values across ${replays.length} replays — ${JSON.stringify([...distinctHashes].slice(0, 4))}`,
    );
  }
  const stableHash = replays[0]!.hash;
  if (!pattern.test(stableHash)) {
    throw new Error(`[assertReplayStable] malformed/degenerate hash ${JSON.stringify(stableHash)} (expected ${pattern})`);
  }

  // (a) full canonical-payload DEEP EQUALITY — the whole object, not just its digest. Catches a diverging
  //     field the hash happens NOT to cover (a stable hash is necessary but NOT sufficient).
  const canonical0 = canonical(replays[0]!.payload);
  for (let i = 1; i < replays.length; i++) {
    if (canonical(replays[i]!.payload) !== canonical0) {
      throw new Error(
        `[assertReplayStable] payload DIVERGED at replay ${i} despite a stable hash — the digest does not cover a varying field (hash field-coverage gap).`,
      );
    }
  }

  // (c) discrimination: a perturbed input MUST change the hash (proves the digest is a real function of
  //     the varying state, not a vacuous constant that would also pass (a)+(b)). This check is
  //     TWO-DIRECTIONAL: it also verifies the perturbation actually changed the PAYLOAD — a caller
  //     passing an accidentally-unperturbed payload whose hash happens to differ is a non-deterministic-
  //     hash BUG (not valid discrimination), and must fail loudly rather than being reported as a pass.
  if (input.perturbed) {
    const perturbedCanonical = canonical(input.perturbed.payload);
    const perturbedPayloadUnchanged = perturbedCanonical === canonical0;
    if (perturbedPayloadUnchanged) {
      if (input.perturbed.hash !== stableHash) {
        throw new Error(
          `[assertReplayStable] non-deterministic hash on an UNCHANGED payload: the "perturbed" input canonicalised IDENTICALLY to the stable replay but produced a different hash (${JSON.stringify(input.perturbed.hash)} vs ${JSON.stringify(stableHash)}) — this is a hash-stability bug, not discrimination.`,
        );
      }
    } else if (input.perturbed.hash === stableHash) {
      throw new Error(
        `[assertReplayStable] VACUOUS hash: a perturbed input (payload DIFFERS) produced the SAME hash ${stableHash} — the digest is not discriminating (degenerate/constant hash).`,
      );
    }
    if (!pattern.test(input.perturbed.hash)) {
      throw new Error(`[assertReplayStable] malformed perturbed hash ${JSON.stringify(input.perturbed.hash)}`);
    }
  }

  return stableHash;
}
