// scripts/schema-diff/lib.ts
//
// Pure, importable logic for the schema-diff PR CI gate (Story 1.16c, FR-100
// Non-Add Guard). Everything here is side-effect-free and unit-tested with
// fixtures (lib.test.ts); the impure orchestration (glob, fs reads,
// process.exit) lives in check.ts — mirroring the testable-pure-core style of
// the sibling scripts/friction-budget/{lib.ts,check.ts}.
//
// FR-100 commits a forward-compat NON-ADD discipline (architecture §1.13 Hook 2
// L1149-1163; PRD §4.15 FR-100 L1253): v1 ships ZERO payout-destination surface
// so the v2/v3 Durghatana Sahayata activation is a GREENFIELD addition, never a
// column/index add to a v1 table. This gate is an INVARIANT SCAN of current repo
// state — it asserts that none of the four forbidden artifact kinds (table,
// column, endpoint, Zod schema) exist — NOT a git-diff against a base ref. See
// README.md → "invariant scan, not git-diff".
//
// The four scanners are pure: each takes already-read file contents / parsed
// JSON + the parsed registry and returns Finding[]. check.ts resolves the four
// precision-scoped artifact roots, reads them, and runs the scanners.

import { parse as parseYaml } from 'yaml';

// ─────────────────────────────────────────────────────────────────────────────
// Registry — fr-100-non-add.yaml pattern config (AC-1)
// ─────────────────────────────────────────────────────────────────────────────

/** The four forbidden patterns the gate enforces. */
export interface Fr100Patterns {
  /** Exact forbidden table name (`payout_destinations`). */
  forbiddenTable: string;
  /** Forbidden column-name prefix (`payout_destination` → `payout_destination*`). */
  forbiddenColumn: string;
  /** Forbidden route-path prefix (`/payout-destinations` → `/payout-destinations*`). */
  forbiddenEndpoint: string;
  /** Forbidden Zod-export substring (`PayoutDestination` → `*PayoutDestination*`). */
  forbiddenZod: string;
}

/**
 * One allowlist entry (empty at v1). v2 introducing the greenfield
 * payout-destination surface adds `{ kind, artifact, rationale, adr }` entries —
 * each with a rationale + a trustee-attested ADR ref per Story 14.7.
 */
export interface AllowEntry {
  kind: FindingKind;
  artifact: string;
  rationale?: string;
  adr?: string;
}

export interface Fr100Config {
  version: number;
  patterns: Fr100Patterns;
  allow: AllowEntry[];
}

export type FindingKind = 'table' | 'column' | 'endpoint' | 'zod';

const ALLOW_KINDS: readonly FindingKind[] = ['table', 'column', 'endpoint', 'zod'];

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Parse + structurally validate fr-100-non-add.yaml. Throws Error with a precise
 * message on any malformed entry — a malformed registry must fail the gate
 * loudly, never be silently skipped (mirrors parseFrictionBudgetYaml).
 */
export function parseFr100Config(raw: string): Fr100Config {
  const doc: unknown = parseYaml(raw);
  if (!isObject(doc)) throw new Error('fr-100-non-add.yaml: top-level must be a mapping');

  if (typeof doc.version !== 'number') {
    throw new Error('fr-100-non-add.yaml: `version` must be a number');
  }
  if (!isObject(doc.patterns)) {
    throw new Error('fr-100-non-add.yaml: `patterns` must be a mapping');
  }

  const p = doc.patterns;
  const patternKeys = [
    'forbidden_table',
    'forbidden_column',
    'forbidden_endpoint',
    'forbidden_zod',
  ] as const;
  for (const key of patternKeys) {
    const value = p[key];
    if (typeof value !== 'string' || value.length === 0) {
      throw new Error(`fr-100-non-add.yaml: patterns.${key} must be a non-empty string`);
    }
  }

  const allowRaw = doc.allow;
  if (allowRaw !== undefined && !Array.isArray(allowRaw)) {
    throw new Error('fr-100-non-add.yaml: `allow` must be a list');
  }
  const allow: AllowEntry[] = (Array.isArray(allowRaw) ? allowRaw : []).map((e, i) => {
    if (!isObject(e)) {
      throw new Error(`fr-100-non-add.yaml: allow[${i}] must be a mapping`);
    }
    if (typeof e.kind !== 'string' || !(ALLOW_KINDS as readonly string[]).includes(e.kind)) {
      throw new Error(
        `fr-100-non-add.yaml: allow[${i}].kind must be one of ${ALLOW_KINDS.join(' | ')}`,
      );
    }
    if (typeof e.artifact !== 'string' || e.artifact.length === 0) {
      throw new Error(`fr-100-non-add.yaml: allow[${i}].artifact must be a non-empty string`);
    }
    return {
      kind: e.kind as FindingKind,
      artifact: e.artifact,
      rationale: typeof e.rationale === 'string' ? e.rationale : undefined,
      adr: typeof e.adr === 'string' ? e.adr : undefined,
    };
  });

  return {
    version: doc.version,
    patterns: {
      forbiddenTable: p.forbidden_table as string,
      forbiddenColumn: p.forbidden_column as string,
      forbiddenEndpoint: p.forbidden_endpoint as string,
      forbiddenZod: p.forbidden_zod as string,
    },
    allow,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Findings
// ─────────────────────────────────────────────────────────────────────────────

/** A forbidden-pattern hit. The gate prints kind + artifact + location + pattern. */
export interface Finding {
  kind: FindingKind;
  /** The matched artifact (table / column / route-literal / export name). */
  artifact: string;
  /** Where it was found: file (+ line / migration) pointer. */
  location: string;
  /** The configured pattern it violated. */
  pattern: string;
}

/** True if `artifact` of `kind` is on the registry allowlist (v2 greenfield admit). */
function isAllowed(kind: FindingKind, artifact: string, config: Fr100Config): boolean {
  return config.allow.some((e) => e.kind === kind && e.artifact === artifact);
}

/** A migration file's raw DDL. */
export interface SqlFile {
  path: string;
  text: string;
}

/** A TypeScript source file's contents. */
export interface TsFile {
  path: string;
  text: string;
}

/** Escape a string for safe interpolation into a RegExp. */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Enumerate `tables` from a parsed drizzle snapshot as `[key, name]` pairs. */
function snapshotTables(snapshot: unknown): { key: string; name: string; table: unknown }[] {
  if (!isObject(snapshot) || !isObject(snapshot.tables)) return [];
  return Object.entries(snapshot.tables).map(([key, table]) => {
    const name =
      isObject(table) && typeof table.name === 'string'
        ? table.name
        : (key.split('.').pop() ?? key);
    return { key, name, table };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Scanner (a) — Tables (AC-2a)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Any table named exactly `forbidden_table` (`payout_destinations`) is a finding.
 * Scans the cumulative drizzle snapshot (structured, authoritative) AND the raw
 * migration DDL (belt-and-suspenders — catches a hand-written migration not
 * reflected in a snapshot, and yields the precise migration-file pointer).
 */
export function scanTables(snapshot: unknown, sqlFiles: SqlFile[], config: Fr100Config): Finding[] {
  const target = config.patterns.forbiddenTable;
  const findings: Finding[] = [];

  for (const { name } of snapshotTables(snapshot)) {
    if (name === target && !isAllowed('table', name, config)) {
      findings.push({
        kind: 'table',
        artifact: name,
        location: 'drizzle snapshot (packages/domain/migrations/meta/<latest>_snapshot.json)',
        pattern: `forbidden_table=${target}`,
      });
    }
  }

  // Raw DDL: CREATE TABLE [IF NOT EXISTS] [schema.]payout_destinations
  const createRe = new RegExp(
    `CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?(?:"?\\w+"?\\.)?"?${escapeRegExp(target)}"?`,
    'i',
  );
  for (const file of sqlFiles) {
    const lines = file.text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (createRe.test(lines[i]) && !isAllowed('table', target, config)) {
        findings.push({
          kind: 'table',
          artifact: target,
          location: `${file.path}:${i + 1}`,
          pattern: `forbidden_table=${target}`,
        });
      }
    }
  }

  return findings;
}

// ─────────────────────────────────────────────────────────────────────────────
// Scanner (b) — Columns (AC-2b)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Any column whose name matches `forbidden_column*` (prefix `payout_destination`)
 * on any table is a finding. Scans the snapshot columns (structured) AND raw DDL.
 * The exact table name (`payout_destinations`) is NOT a column finding — it is
 * owned by scanTables — so a raw-DDL token equal to `forbidden_table` is skipped.
 */
/**
 * SQL keywords that turn a single-quoted literal from a VALUE into executable DDL. Used to keep the
 * dynamic-DDL vector covered when literals are otherwise masked — see {@link scannableDdl}.
 */
const DYNAMIC_DDL_RE = /\b(add\s+column|create\s+table|alter\s+table|rename\s+to)\b/i;

/** Blank the CONTENTS of each single-quoted run, keeping length so reported positions do not shift.
 *  Doubled quotes ('') are SQL's escape for a literal quote and stay inside the run. */
function maskSqlLiterals(line: string): string {
  return line.replace(/'(?:[^']|'')*'/g, (m) => `'${' '.repeat(Math.max(0, m.length - 2))}'`);
}

/**
 * Return the part of a DDL line in which an IDENTIFIER may legitimately appear: the line with its
 * `--` comment removed and its single-quoted string literals blanked out.
 *
 * ⚠ WHY THIS EXISTS (Story 10.12). Neither a comment nor a single-quoted literal can be a column
 * name, but the raw-DDL scan below is a plain regex over the whole line and could not tell them from
 * an identifier. That produced a false positive with a genuinely absurd shape: migration 0095's
 * `pariwar_custom_field_definitions_frozen_key_ck` is a CHECK constraint that FORBIDS a custom field
 * named `payout_destination*`, and its explanatory comment says so — so the FR-100 gate flagged that
 * prohibition, twice, as if it were a payout-destination column. The gate was reporting its own
 * enforcement as a violation of itself.
 *
 * The wrong fixes, and why each was rejected: adding an `allow` entry to `fr-100-non-add.yaml` would
 * DECLARE a payout-destination artifact permitted — the opposite of the truth, and it would need a
 * trustee-attested ADR for a thing that does not exist. Renaming the constraint would not help; the
 * pattern is in the CHECK's body by necessity. Dropping the DB mirror would remove the layer
 * migration 0088's doctrine exists to require. Not mentioning the pattern in the comment would make
 * the most load-bearing constraint in the migration unexplained.
 *
 * ⚠ THIS DOES NOT WEAKEN THE GATE, and it is the same doctrine the sibling gates already apply
 * (`member-state-invariant` is AST-based precisely so "a `.limit(` substring in a comment/string
 * never matches"). A literal carrying DDL keywords — `EXECUTE 'ALTER TABLE … ADD COLUMN
 * payout_destination_id …'` — is still scanned in full, see {@link DYNAMIC_DDL_RE}. So the only
 * matches removed are ones that cannot create a column. (The gate has never parsed SQL, so an
 * identifier assembled by concatenation was already outside its reach; that pre-existing limit is
 * unchanged.)
 */
export function scannableDdl(line: string): string {
  // Find the comment start on the LITERAL-MASKED line, so a `--` inside a string is not mistaken for
  // one; then truncate both forms at the same index.
  const masked = maskSqlLiterals(line);
  const commentAt = masked.indexOf('--');
  const codeMasked = commentAt === -1 ? masked : masked.slice(0, commentAt);
  const codeRaw = commentAt === -1 ? line : line.slice(0, commentAt);
  // Dynamic DDL keeps its literals: that is where a real column name could hide.
  return DYNAMIC_DDL_RE.test(codeRaw) ? codeRaw : codeMasked;
}

export function scanColumns(
  snapshot: unknown,
  sqlFiles: SqlFile[],
  config: Fr100Config,
): Finding[] {
  const prefix = config.patterns.forbiddenColumn;
  const tableName = config.patterns.forbiddenTable;
  const findings: Finding[] = [];

  for (const { name: tName, table } of snapshotTables(snapshot)) {
    if (!isObject(table) || !isObject(table.columns)) continue;
    for (const colName of Object.keys(table.columns)) {
      if (colName.startsWith(prefix) && !isAllowed('column', colName, config)) {
        findings.push({
          kind: 'column',
          artifact: `${tName}.${colName}`,
          location: 'drizzle snapshot (packages/domain/migrations/meta/<latest>_snapshot.json)',
          pattern: `forbidden_column=${prefix}*`,
        });
      }
    }
  }

  // Raw DDL: any identifier starting with the prefix that is NOT the plural table
  // name (that hit belongs to scanTables). Catches `payout_destination_id` etc.
  const tokenRe = new RegExp(`\\b${escapeRegExp(prefix)}\\w*`, 'gi');
  for (const file of sqlFiles) {
    const lines = file.text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const seen = new Set<string>();
      for (const match of scannableDdl(lines[i]).matchAll(tokenRe)) {
        const token = match[0];
        if (token.toLowerCase() === tableName) continue; // the table itself → scanTables owns it
        if (seen.has(token)) continue;
        seen.add(token);
        if (!isAllowed('column', token, config)) {
          findings.push({
            kind: 'column',
            artifact: token,
            location: `${file.path}:${i + 1}`,
            pattern: `forbidden_column=${prefix}*`,
          });
        }
      }
    }
  }

  return findings;
}

// ─────────────────────────────────────────────────────────────────────────────
// Scanner (c) — Endpoints (AC-2c)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Any route-path string literal matching `forbidden_endpoint*`
 * (`/payout-destinations*`) in an apps/api source file is a finding. A static
 * per-line scan of quoted path literals — no Fastify boot (keeps the gate pure
 * and boot-free; the runtime getCollectedRoutes alternative needs a built server).
 */
export function scanEndpoints(tsFiles: TsFile[], config: Fr100Config): Finding[] {
  const prefix = config.patterns.forbiddenEndpoint;
  const findings: Finding[] = [];

  // A quoted string literal (', ", or `) containing the forbidden path prefix.
  const literalRe = new RegExp(`['"\`]([^'"\`]*${escapeRegExp(prefix)}[^'"\`]*)['"\`]`, 'g');
  for (const file of tsFiles) {
    const lines = file.text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const seen = new Set<string>();
      for (const match of lines[i].matchAll(literalRe)) {
        const literal = match[1];
        if (seen.has(literal)) continue;
        seen.add(literal);
        if (!isAllowed('endpoint', literal, config)) {
          findings.push({
            kind: 'endpoint',
            artifact: literal,
            location: `${file.path}:${i + 1}`,
            pattern: `forbidden_endpoint=${prefix}*`,
          });
        }
      }
    }
  }

  return findings;
}

// ─────────────────────────────────────────────────────────────────────────────
// Scanner (d) — Zod schemas (AC-2d)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Any exported identifier whose name contains `forbidden_zod`
 * (`*PayoutDestination*`) in a packages/contracts source file is a finding. A
 * static export-name scan over declaration-form exports
 * (`export const|type|interface|class|function|enum X`).
 */
export function scanZodSchemas(tsFiles: TsFile[], config: Fr100Config): Finding[] {
  const needle = config.patterns.forbiddenZod;
  const findings: Finding[] = [];

  const exportRe = /export\s+(?:const|type|interface|class|function|enum)\s+([A-Za-z0-9_$]+)/g;
  for (const file of tsFiles) {
    const lines = file.text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const seen = new Set<string>();
      for (const match of lines[i].matchAll(exportRe)) {
        const name = match[1];
        if (!name.includes(needle)) continue;
        if (seen.has(name)) continue;
        seen.add(name);
        if (!isAllowed('zod', name, config)) {
          findings.push({
            kind: 'zod',
            artifact: name,
            location: `${file.path}:${i + 1}`,
            pattern: `forbidden_zod=*${needle}*`,
          });
        }
      }
    }
  }

  return findings;
}

// ─────────────────────────────────────────────────────────────────────────────
// Reporting
// ─────────────────────────────────────────────────────────────────────────────

/** One-line structured pointer for a finding (kind + artifact + location + pattern). */
export function formatFinding(f: Finding): string {
  return `[${f.kind}] ${f.artifact} — ${f.location} (violates ${f.pattern})`;
}
