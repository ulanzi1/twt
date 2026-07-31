// The capability-bar loader — Story 10.8 (Task 3; AC5/AC6).
//
// Parses + structurally validates the repo-root `governance_boundary.yaml`: the closed allowlist of
// behaviours a feature flag is permitted to toggle. LOUD-THROWING throughout, in the
// `parseFr100Config` / `parseBankAllowlist` style.
//
// ⚠ WHY LOUD MATTERS MORE HERE THAN USUAL. A governance artifact that silently degrades to "no
// entries" is worse than one that is absent: every conformance check would then pass VACUOUSLY, and
// the gate would report green while enforcing nothing. So a malformed bar is a hard throw at load —
// never a default, never a partial parse, never a skipped entry.
//
// This module is the RUNTIME half. The build-time half is the `governance-boundary` CI gate
// (scripts/governance-boundary/), which reads the same file with this same parser. Sharing the
// parser is deliberate: a gate that validated the bar differently from the runtime could pass on a
// document the runtime then rejects (or, far worse, vice-versa).

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parse as parseYaml } from 'yaml';

import { CapabilityBarInvalidError } from './errors.js';

/** The behaviour kinds an `allow` entry may declare. Mirrors the YAML's own `kinds` list, which the
 *  parser cross-checks — the tuple here is the code authority, the YAML list is the documented one. */
export const CAPABILITY_BAR_KINDS = ['member_flow', 'provider_selection', 'channel_routing'] as const;
export type CapabilityBarKind = (typeof CAPABILITY_BAR_KINDS)[number];

/** One allowlisted flag-toggleable behaviour. `artifact` IS the flag key. */
export interface CapabilityBarEntry {
  kind: CapabilityBarKind;
  artifact: string;
  rationale: string;
  adr: string;
}

/** One prohibited governance root — a module tree a flag read may never reach inside (leg b). */
export interface ProhibitedRoot {
  root: string;
  prohibition: string;
}

export interface CapabilityBar {
  version: number;
  count: number;
  kinds: readonly string[];
  allow: readonly CapabilityBarEntry[];
  prohibited: readonly ProhibitedRoot[];
}

/**
 * Behaviours frozen by the Architectural Freeze Boundaries table (epics.md:510-543), keyed by the
 * substring that would appear in an `artifact` naming one. Prohibition (e) — "a flag must never
 * alter an architectural freeze table row" — is enforced HERE, at admission, rather than by a source
 * scan: there is no import to scan for, because the violation is in what the bar CLAIMS a flag may
 * toggle. Rejecting it at parse time means the offending entry can never reach the registry at all.
 *
 * ⚠ These are the freeze rows a plausible flag might actually try to name. It is deliberately a
 * substring blacklist over `artifact`, not an attempt to mechanically police all 15 rows — the
 * trustee attestation is the real control, and this is the mechanical backstop that catches the
 * obvious cases with the freeze row cited.
 */
const FROZEN_BEHAVIOUR_MARKERS: ReadonlyArray<{ marker: string; row: string }> = [
  { marker: 'pool_assignment', row: 'freeze row 1 (Pool Engine deterministic assignment model)' },
  { marker: 'member_lifecycle', row: 'freeze row 2 (event-derived member lifecycle state, §1.14)' },
  { marker: 'rls', row: 'freeze row 3 (PostgreSQL RLS multi-tenant isolation model)' },
  { marker: 'tenant_isolation', row: 'freeze row 3 (PostgreSQL RLS multi-tenant isolation model)' },
  { marker: 'audit_mirror', row: 'freeze row 5 (audit log mirror immutability property)' },
  { marker: 'audit_log', row: 'freeze row 5 (audit log mirror immutability property)' },
  { marker: 'pool_bound', row: 'freeze row 7 (pool-bound contribution semantics)' },
  { marker: 'rbac', row: 'freeze row 9 (RBAC permission-key + scope-dimension model)' },
  { marker: 'permission', row: 'freeze row 9 (RBAC permission-key + scope-dimension model)' },
  { marker: 'i18n', row: 'freeze row 10 (centralized i18n + tone-guide bilingual surface contract)' },
  { marker: 'bilingual', row: 'freeze row 10 (centralized i18n + tone-guide bilingual surface contract)' },
  { marker: 'hindi', row: 'freeze row 10 (centralized i18n + tone-guide bilingual surface contract)' },
  { marker: 'validity', row: 'freeze row 11 (Member Validity Service freshness invariant ≤ 60s)' },
  { marker: 'benefit_mechanism', row: 'freeze row 12 (benefit_mechanism discriminator enum)' },
  { marker: 'consent', row: 'Story 2.7 / DPDPA consent — prohibition (b), not a toggleable behaviour' },
];

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Parse + structurally validate `governance_boundary.yaml`. Collects EVERY problem before throwing,
 * so one round-trip fixes the document.
 *
 * @throws CapabilityBarInvalidError
 */
export function parseCapabilityBar(raw: string): CapabilityBar {
  const reasons: string[] = [];
  const doc: unknown = parseYaml(raw);

  if (!isObject(doc)) {
    throw new CapabilityBarInvalidError(['top-level must be a mapping']);
  }
  if (typeof doc.version !== 'number') reasons.push('`version` must be a number');
  if (typeof doc.count !== 'number') reasons.push('`count` must be a number');

  // `kinds` is documentation-of-record; the code tuple is the authority. Cross-check them so the two
  // cannot drift — a YAML that documents a kind the parser does not accept would mislead an author
  // into writing an entry that then fails for a reason the file itself told them was fine.
  const kindsRaw = doc.kinds;
  if (!Array.isArray(kindsRaw)) {
    reasons.push('`kinds` must be a list');
  } else {
    for (const k of kindsRaw) {
      if (typeof k !== 'string' || !(CAPABILITY_BAR_KINDS as readonly string[]).includes(k)) {
        reasons.push(
          `kinds: ${JSON.stringify(k)} is not a known capability-bar kind (${CAPABILITY_BAR_KINDS.join(' | ')})`,
        );
      }
    }
  }

  const allowRaw = doc.allow;
  if (!Array.isArray(allowRaw)) {
    throw new CapabilityBarInvalidError([...reasons, '`allow` must be a list']);
  }

  const seen = new Set<string>();
  const allow: CapabilityBarEntry[] = [];
  for (const [i, e] of allowRaw.entries()) {
    if (!isObject(e)) {
      reasons.push(`allow[${String(i)}] must be a mapping`);
      continue;
    }
    if (typeof e.kind !== 'string' || !(CAPABILITY_BAR_KINDS as readonly string[]).includes(e.kind)) {
      reasons.push(`allow[${String(i)}].kind must be one of ${CAPABILITY_BAR_KINDS.join(' | ')}`);
    }
    if (typeof e.artifact !== 'string' || e.artifact.length === 0) {
      reasons.push(`allow[${String(i)}].artifact must be a non-empty string (the flag key)`);
    }
    // rationale + adr are REQUIRED here, unlike fr-100-non-add.yaml where they are optional. AC6:
    // "additions to the capability bar require trustee-attested PRs with explicit rationale."
    // An entry without a rationale is an unattested expansion of the bar.
    if (typeof e.rationale !== 'string' || e.rationale.trim().length === 0) {
      reasons.push(`allow[${String(i)}].rationale must be a non-empty string (AC6 — attestation)`);
    }
    if (typeof e.adr !== 'string' || e.adr.trim().length === 0) {
      reasons.push(`allow[${String(i)}].adr must be a non-empty string (the attesting ADR)`);
    }

    if (typeof e.artifact === 'string') {
      const artifact = e.artifact;
      if (seen.has(artifact)) reasons.push(`allow: duplicate artifact '${artifact}'`);
      seen.add(artifact);

      // Prohibition (e) — reject a frozen-table behaviour, citing the freeze row.
      const frozen = FROZEN_BEHAVIOUR_MARKERS.find((f) => artifact.includes(f.marker));
      if (frozen) {
        reasons.push(
          `allow: artifact '${artifact}' names an architecturally FROZEN behaviour — ${frozen.row}. ` +
            'A frozen property changes by ADR or trustee-ratified Sprint Change Proposal, never by a ' +
            'feature-flag flip (epics.md:510-543).',
        );
      }
    }

    if (
      typeof e.kind === 'string' &&
      typeof e.artifact === 'string' &&
      typeof e.rationale === 'string' &&
      typeof e.adr === 'string'
    ) {
      allow.push({
        kind: e.kind as CapabilityBarKind,
        artifact: e.artifact,
        rationale: e.rationale,
        adr: e.adr,
      });
    }
  }

  const prohibitedRaw = doc.prohibited;
  if (!Array.isArray(prohibitedRaw)) {
    throw new CapabilityBarInvalidError([...reasons, '`prohibited` must be a list']);
  }
  const prohibited: ProhibitedRoot[] = [];
  for (const [i, p] of prohibitedRaw.entries()) {
    if (!isObject(p)) {
      reasons.push(`prohibited[${String(i)}] must be a mapping`);
      continue;
    }
    if (typeof p.root !== 'string' || p.root.length === 0) {
      reasons.push(`prohibited[${String(i)}].root must be a non-empty string`);
      continue;
    }
    if (p.root.startsWith('/') || p.root.split('/').includes('..')) {
      reasons.push(`prohibited[${String(i)}].root must be a repo-relative path with no traversal ('${p.root}')`);
      continue;
    }
    if (typeof p.prohibition !== 'string' || p.prohibition.trim().length === 0) {
      reasons.push(`prohibited[${String(i)}].prohibition must be a non-empty string`);
      continue;
    }
    prohibited.push({ root: p.root, prohibition: p.prohibition });
  }
  // A bar with no prohibited roots would make leg (b) scan nothing and pass vacuously — the exact
  // failure mode this file's header warns about. Refuse to load it.
  if (prohibited.length === 0) {
    reasons.push('`prohibited` must declare at least one root — an empty list makes gate leg (b) vacuous');
  }

  // The revert-sanity cross-check (the bank-allowlist trick): silently dropping an entry, or adding
  // one without bumping `count`, fails here.
  if (typeof doc.count === 'number' && allow.length !== doc.count) {
    reasons.push(`count (${String(doc.count)}) !== allow.length (${String(allow.length)})`);
  }

  if (reasons.length > 0) throw new CapabilityBarInvalidError(reasons);

  return {
    version: doc.version as number,
    count: doc.count as number,
    kinds: kindsRaw as string[],
    allow,
    prohibited,
  };
}

/** Absolute path to the repo-root `governance_boundary.yaml`. */
export function capabilityBarPath(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  // src/feature-flags/ → src/ → packages/domain/ → packages/ → repo root
  return join(here, '..', '..', '..', '..', 'governance_boundary.yaml');
}

/** Load + parse the repo-root capability bar. Throws `CapabilityBarInvalidError` on any problem. */
export function loadCapabilityBar(): CapabilityBar {
  return parseCapabilityBar(readFileSync(capabilityBarPath(), 'utf8'));
}

/** The set of flag keys the bar admits. */
export function allowlistedFlagKeys(bar: CapabilityBar): string[] {
  return bar.allow.map((e) => e.artifact).sort();
}
