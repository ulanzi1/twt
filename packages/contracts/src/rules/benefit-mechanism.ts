// packages/contracts/src/rules/benefit-mechanism.ts
//
// Transport contract for the FR-7 / FR-100 `benefit_mechanism` discriminator
// (Story 1.16d; architecture §1.13 Hook 1, L1133-1147). This is the FORWARD-COMPAT
// type: Epic 2's Story 2.3 imports it for the `clause_versions.benefit_mechanism`
// enum NOT-NULL column (rather than re-defining the enum), and it is the
// "`reserve` value exists in the type definition but tags zero v1 rules" guarantee
// that Story 14.5 (epics L4324) verifies.
//
// The enum width is exactly two:
//   pool    — crowdfunded daan / Pool-Engine benefits (death-support today;
//             Jivandan / Kanyadan / Retirementdaan later). v1 ships ONLY pool.
//   reserve — trust-paid assistance (Durghatana Sahayata + future reserve-funded
//             benefits). Ships in the enum NOW so v2/v3 rules add WITHOUT
//             re-tagging existing v1 rules (architecture L1143-1145).
//
// A plain `z.enum` — NOT registered via `.openapi()` — so it does not perturb the
// emitter surface (openapi/v1.yaml stays byte-identical; verified via
// `contracts:check-openapi-determinism`, the 1.16b precedent for adding a Zod
// schema + barrel export). The repo-global `benefit-mechanism` CI gate
// (scripts/benefit-mechanism/) dynamic-imports this module and asserts its
// `.options` equal the `benefit-mechanism.yaml` `mechanisms` list — so the config
// and this enum can never drift (Story 1.16d check (b), teeth now).

import { z } from 'zod';

/**
 * The FR-7 / FR-100 benefit-mechanism discriminator carried by every Niyamavali
 * rule record. `pool` = crowdfunded daan; `reserve` = trust-paid assistance. v1
 * ships only `pool`-tagged rules; `reserve` exists so Durghatana Sahayata rules
 * add at v2 without re-tagging existing rules.
 */
export const BenefitMechanism = z.enum(['pool', 'reserve']);
export type BenefitMechanismValue = z.output<typeof BenefitMechanism>;
