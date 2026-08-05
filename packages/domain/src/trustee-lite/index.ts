// `@twt/domain/trustee-lite` barrel — Story 10.11 (Task 1).
//
// The PURE core of the Trustee-Lite aggregator: one normalized row shape over six heterogeneous
// sources, the two-tier order, the per-source-optional severity, and the detection-only R7 violator
// arm. DB-free and clock-injected throughout — no file in this namespace imports `Db`.

export * from './types.js';
export * from './signals.js';
export * from './violator-flags.js';
