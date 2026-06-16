// scripts/benefit-mechanism/lib.ts
//
// Pure, importable logic for the benefit-mechanism CI gate (Story 1.16d, FR-100
// / FR-7 Hook 1 — the enum-tag guard). Everything here is side-effect-free and
// unit-tested with fixtures (lib.test.ts); the impure orchestration (glob, fs
// reads, the dynamic enum import, process.exit) lives in check.ts — mirroring the
// testable-pure-core split of the sibling scripts/schema-diff/{lib.ts,check.ts}.
//
// FR-100 Hook 1 (architecture §1.13 L1133-1147; PRD §4.15 FR-100; FR-7) commits a
// forward-compat ENUM-TAG discipline: every Niyamavali rule record carries a
// `benefit_mechanism: 'pool' | 'reserve'` discriminator, and v1 rules only ever
// use `pool` (reserve exists so Durghatana Sahayata v2/v3 rules add WITHOUT
// re-tagging existing v1 rules). This is the SIBLING of 1.16c's Hook 2 (non-add):
// Hook 2 asserts ZERO forbidden artifacts exist; Hook 1 (here) asserts EVERY rule
// record carries a valid tag.
//
// Three pure checks, each takes already-read content / parsed JSON + the parsed
// config and returns Finding[]:
//   (a) validateRuleRecords  — rule-record tag scan (no-op until Epic 2 seeds rules)
//   (b) checkEnumDefinition  — enum-definition cross-check (TEETH NOW)
//   (c) scanRuleTableColumns — rule-table schema-column check (no-op until Story 2.3)
// plus the structured extractors (extractFromSqlInserts / extractFromJsonSeed)
// that turn migration / seed / fixture content into RuleRecord[] for check (a).

import { parse as parseYaml } from 'yaml';

// ─────────────────────────────────────────────────────────────────────────────
// Config — benefit-mechanism.yaml (AC-1)
// ─────────────────────────────────────────────────────────────────────────────

/** Where rule records will live. Only the globs are empty at v1; `tables` is set from day one. */
export interface RuleSources {
  /** Registry table(s) the schema-column check (c) enforces the tag column on (`clause_versions`). */
  tables: string[];
  /** Globs for seed rule records (empty at v1; Epic 2 / Story 2.3 populates). */
  seedGlobs: string[];
  /** Globs for rule fixtures (empty at v1; Epic 2 populates). */
  fixtureGlobs: string[];
}

export interface BenefitMechanismConfig {
  version: number;
  /** The full enum width (`pool | reserve`) — must match the shipped BenefitMechanism z.enum. */
  mechanisms: string[];
  /** The BENEFIT_MECHANISM_V1_ONLY build flag, as a versioned/reviewable field. */
  v1Only: boolean;
  /** The values an insert may carry while `v1Only` (`pool`). */
  v1Permitted: string[];
  ruleSources: RuleSources;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

const KNOWN_TOP_LEVEL_KEYS = new Set([
  'version',
  'mechanisms',
  'v1_only',
  'v1_permitted',
  'rule_sources',
]);

/** Validate a value is a list of non-empty strings, returning it (throws on malformed). */
function asStringList(value: unknown, label: string): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`benefit-mechanism.yaml: \`${label}\` must be a list`);
  }
  return value.map((v, i) => {
    if (typeof v !== 'string' || v.length === 0) {
      throw new Error(`benefit-mechanism.yaml: ${label}[${i}] must be a non-empty string`);
    }
    return v;
  });
}

/**
 * Parse + structurally validate benefit-mechanism.yaml. Throws Error with a
 * precise message on any malformed entry — a malformed registry must fail the
 * gate loudly, never be silently skipped (mirrors parseFr100Config /
 * parseFrictionBudgetYaml). Validates that every `v1_permitted` value is one of
 * `mechanisms` (a v1_permitted value outside the enum is incoherent).
 */
export function parseBenefitMechanismConfig(raw: string): BenefitMechanismConfig {
  const doc: unknown = parseYaml(raw);
  if (!isObject(doc)) throw new Error('benefit-mechanism.yaml: top-level must be a mapping');

  for (const key of Object.keys(doc)) {
    if (!KNOWN_TOP_LEVEL_KEYS.has(key)) {
      throw new Error(
        `benefit-mechanism.yaml: unknown key '${key}' ` +
          `(allowed: ${[...KNOWN_TOP_LEVEL_KEYS].join(', ')})`,
      );
    }
  }

  if (typeof doc.version !== 'number') {
    throw new Error('benefit-mechanism.yaml: `version` must be a number');
  }

  const mechanisms = asStringList(doc.mechanisms, 'mechanisms');
  if (mechanisms.length === 0) {
    throw new Error('benefit-mechanism.yaml: `mechanisms` must be a non-empty list');
  }

  if (typeof doc.v1_only !== 'boolean') {
    throw new Error('benefit-mechanism.yaml: `v1_only` must be a boolean');
  }

  const v1Permitted = asStringList(doc.v1_permitted, 'v1_permitted');
  for (const value of v1Permitted) {
    if (!mechanisms.includes(value)) {
      throw new Error(
        `benefit-mechanism.yaml: v1_permitted value '${value}' is not one of mechanisms ` +
          `(${mechanisms.join(' | ')})`,
      );
    }
  }

  if (doc.v1_only && v1Permitted.length === 0) {
    throw new Error(
      'benefit-mechanism.yaml: `v1_permitted` must be non-empty when `v1_only` is true ' +
        '(an empty v1_permitted forbids every rule value including `pool`)',
    );
  }

  const rsRaw = doc.rule_sources;
  if (rsRaw !== undefined && !isObject(rsRaw)) {
    throw new Error('benefit-mechanism.yaml: `rule_sources` must be a mapping');
  }
  const rs = isObject(rsRaw) ? rsRaw : {};
  const ruleSources: RuleSources = {
    tables: rs.tables === undefined ? [] : asStringList(rs.tables, 'rule_sources.tables'),
    seedGlobs:
      rs.seed_globs === undefined ? [] : asStringList(rs.seed_globs, 'rule_sources.seed_globs'),
    fixtureGlobs:
      rs.fixture_globs === undefined
        ? []
        : asStringList(rs.fixture_globs, 'rule_sources.fixture_globs'),
  };

  return {
    version: doc.version,
    mechanisms,
    v1Only: doc.v1_only,
    v1Permitted,
    ruleSources,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Findings
// ─────────────────────────────────────────────────────────────────────────────

export type FindingKind = 'rule-tag' | 'enum-drift' | 'schema-column';

/** A gate finding. The gate prints kind + offending artifact + location + detail. */
export interface Finding {
  kind: FindingKind;
  /** The offending rule id / enum name / rule table. */
  artifact: string;
  /** Where it was found: file (+ line) / source pointer. */
  location: string;
  /** What it violated (which rule / which invariant). */
  detail: string;
}

/** One-line structured pointer for a finding (kind + artifact + location + detail). */
export function formatFinding(f: Finding): string {
  return `[${f.kind}] ${f.artifact} — ${f.location} (${f.detail})`;
}

// ─────────────────────────────────────────────────────────────────────────────
// RuleRecord — the shared seam between extractors, validators, and Epic 2's
// seed-loader / registry tests (Story 2.3 imports this to reuse validateRuleRecords).
// ─────────────────────────────────────────────────────────────────────────────

export interface RuleRecord {
  /** Clause/rule identifier — named in findings (e.g. 'R5', or a DB primary key). */
  id: string;
  benefit_mechanism?: unknown;
  /** Repo-relative source file path — included in the finding message. */
  _source: string;
  /** 1-based line number within _source, if available. */
  _line?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Check (a) — rule-record tag scan (AC-2a). No-op at v1 (no rule records exist).
// ─────────────────────────────────────────────────────────────────────────────

function recordLocation(record: RuleRecord): string {
  return record._line != null ? `${record._source}:${record._line}` : record._source;
}

/**
 * Validate one rule record against the config: (i) it carries `benefit_mechanism`;
 * (ii) the value is one of `mechanisms`; (iii) if `v1Only`, the value is one of
 * `v1Permitted`. Each violation is a Finding that NAMES the offending rule.
 */
export function validateRuleRecord(record: RuleRecord, config: BenefitMechanismConfig): Finding[] {
  const location = recordLocation(record);
  const v = record.benefit_mechanism;

  // (i) carries a tag
  if (v === undefined || v === null) {
    return [
      {
        kind: 'rule-tag',
        artifact: record.id,
        location,
        detail: 'rule record is missing the required benefit_mechanism tag (FR-100 Hook 1)',
      },
    ];
  }
  if (typeof v !== 'string') {
    return [
      {
        kind: 'rule-tag',
        artifact: record.id,
        location,
        detail: `benefit_mechanism must be a string, got ${typeof v}`,
      },
    ];
  }

  // (ii) one of mechanisms
  if (!config.mechanisms.includes(v)) {
    return [
      {
        kind: 'rule-tag',
        artifact: record.id,
        location,
        detail: `benefit_mechanism='${v}' is not one of ${config.mechanisms.join(' | ')}`,
      },
    ];
  }

  // (iii) while v1_only, one of v1_permitted
  if (config.v1Only && !config.v1Permitted.includes(v)) {
    return [
      {
        kind: 'rule-tag',
        artifact: record.id,
        location,
        detail:
          `benefit_mechanism='${v}' is not permitted while v1_only ` +
          `(v1 ships only ${config.v1Permitted.join(' | ')}; '${v}' rules are a greenfield v2 addition)`,
      },
    ];
  }

  return [];
}

/** Orchestrate check (a) over a set of rule records. Importable by Epic 2's seed-loader. */
export function validateRuleRecords(
  records: RuleRecord[],
  config: BenefitMechanismConfig,
): Finding[] {
  return records.flatMap((r) => validateRuleRecord(r, config));
}

// ─────────────────────────────────────────────────────────────────────────────
// Check (b) — enum-definition cross-check (AC-2b). TEETH NOW (non-vacuous v1).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * True iff `options` and `config.mechanisms` are the same SET (sorted compare —
 * ordering differences in either source are not false positives). Extracted as a
 * pure helper so it is unit-testable with in-test string arrays (no import).
 */
export function enumMatchesMechanisms(options: string[], config: BenefitMechanismConfig): boolean {
  const a = [...options].sort();
  const b = [...config.mechanisms].sort();
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

/**
 * Assert the shipped `BenefitMechanism` z.enum declares EXACTLY the config's
 * `mechanisms`. Uses a DYNAMIC IMPORT of the real enum and reads its `.options`
 * off the ZodEnum instance (format-insensitive — cannot drift from the runtime
 * type, unlike source-text regex). The import is internal, so the signature takes
 * only `config`. This is the gate's non-vacuous v1 assertion (green-WITH-teeth).
 */
export async function checkEnumDefinition(config: BenefitMechanismConfig): Promise<Finding[]> {
  const mod = (await import('../../packages/contracts/src/rules/benefit-mechanism.ts')) as {
    BenefitMechanism?: { options: readonly string[] };
  };
  if (!mod.BenefitMechanism || !Array.isArray(mod.BenefitMechanism.options)) {
    return [
      {
        kind: 'enum-drift',
        artifact: 'BenefitMechanism',
        location: 'packages/contracts/src/rules/benefit-mechanism.ts',
        detail: 'BenefitMechanism export not found or has no .options array (enum renamed or removed)',
      },
    ];
  }
  const options = [...mod.BenefitMechanism.options];
  if (enumMatchesMechanisms(options, config)) return [];
  return [
    {
      kind: 'enum-drift',
      artifact: 'BenefitMechanism',
      location: 'packages/contracts/src/rules/benefit-mechanism.ts',
      detail:
        `shipped enum options [${[...options].sort().join(', ')}] do not match ` +
        `benefit-mechanism.yaml mechanisms [${[...config.mechanisms].sort().join(', ')}]`,
    },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// Check (c) — rule-table schema-column check (AC-2c). No-op until Story 2.3.
// ─────────────────────────────────────────────────────────────────────────────

/** Enumerate `tables` from a parsed drizzle snapshot as `{ name, table }` pairs. */
function snapshotTables(snapshot: unknown): { name: string; table: unknown }[] {
  if (!isObject(snapshot) || !isObject(snapshot.tables)) return [];
  return Object.entries(snapshot.tables).map(([key, table]) => {
    const name =
      isObject(table) && typeof table.name === 'string'
        ? table.name
        : (key.split('.').pop() ?? key);
    return { name, table };
  });
}

/** True iff the snapshot `table` object declares a column named `benefit_mechanism`. */
function tableHasBenefitMechanismColumn(table: unknown): boolean {
  if (!isObject(table) || !isObject(table.columns)) return false;
  return Object.entries(table.columns).some(([colKey, col]) => {
    // Handle plain 'benefit_mechanism' and schema-qualified 'public.benefit_mechanism'
    if (colKey === 'benefit_mechanism' || colKey.endsWith('.benefit_mechanism')) return true;
    return isObject(col) && col.name === 'benefit_mechanism';
  });
}

/**
 * When a declared `rule_sources.tables` table appears in the latest drizzle
 * snapshot, assert it carries the `benefit_mechanism` column (the Story 2.3
 * NOT-NULL enum). An absent table → no finding (no-op until Story 2.3 lands it).
 */
export function scanRuleTableColumns(snapshot: unknown, config: BenefitMechanismConfig): Finding[] {
  const tables = snapshotTables(snapshot);
  const findings: Finding[] = [];
  for (const target of config.ruleSources.tables) {
    const targetLower = target.toLowerCase();
    const found = tables.find((t) => t.name.toLowerCase() === targetLower);
    if (!found) continue; // table not yet in the snapshot → no-op (Story 2.3 not landed)
    if (!tableHasBenefitMechanismColumn(found.table)) {
      findings.push({
        kind: 'schema-column',
        artifact: target,
        location: 'drizzle snapshot (packages/domain/migrations/meta/<latest>_snapshot.json)',
        detail: `rule table '${target}' is missing the required benefit_mechanism column (FR-100 Hook 1)`,
      });
    }
  }
  return findings;
}

// ─────────────────────────────────────────────────────────────────────────────
// Structured rule-record extractors (AC-2). No-op at v1 (no rule sources exist).
// ─────────────────────────────────────────────────────────────────────────────

/** A migration / fixture SQL file's raw DDL+DML. */
export interface SqlFile {
  path: string;
  text: string;
}

/** A JSON seed / fixture file's raw text. */
export interface JsonSeedFile {
  path: string;
  text: string;
}

/** Column names whose value is used as the rule record id, in priority order. */
const ID_COLUMNS = ['rule_id', 'clause_id', 'clause_version_id', 'code', 'id'];

/** Split a SQL column list on top-level commas (column names do not contain commas). */
function splitSqlList(list: string): string[] {
  return list.split(',').map((s) => s.trim());
}

/** Strip a SQL identifier of surrounding double quotes / backticks. */
function stripIdent(token: string): string {
  return token.replace(/^["`]|["`]$/g, '').trim();
}

/** 1-based line number of `index` within `text`. */
function lineOf(text: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index && i < text.length; i++) {
    if (text[i] === '\n') line++;
  }
  return line;
}

/**
 * Parse a SQL VALUES tuple starting at `start` (must point to `(`).
 * Handles string literals with embedded `)` characters and SQL `''` escape
 * sequences. Returns the unquoted/raw column values and the index after the
 * closing `)`, or null if the tuple is malformed / unterminated.
 */
function parseSqlValueTuple(
  text: string,
  start: number,
): { values: string[]; end: number } | null {
  if (start >= text.length || text[start] !== '(') return null;
  const values: string[] = [];
  let i = start + 1;
  let current = '';
  let depth = 1;

  while (i < text.length) {
    const ch = text[i];
    if (ch === "'") {
      // SQL string literal — consume until unescaped closing quote; '' = escaped '
      i++;
      let str = '';
      while (i < text.length) {
        if (text[i] === "'" && text[i + 1] === "'") {
          str += "'";
          i += 2;
        } else if (text[i] === "'") {
          i++;
          break;
        } else {
          str += text[i++];
        }
      }
      current = str;
    } else if (ch === ',' && depth === 1) {
      values.push(current.trim());
      current = '';
      i++;
    } else if (ch === '(') {
      depth++;
      current += ch;
      i++;
    } else if (ch === ')') {
      depth--;
      if (depth === 0) {
        values.push(current.trim());
        i++;
        return { values, end: i };
      }
      current += ch;
      i++;
    } else {
      current += ch;
      i++;
    }
  }
  return null; // unclosed tuple — malformed SQL
}

/**
 * Extract rule records from `INSERT INTO <ruletable> (cols) VALUES (vals)` rows in
 * migration / fixture SQL. Handles:
 *   - optional schema prefix (`public.clause_versions`, `"public"."clause_versions"`)
 *   - multi-row VALUES: `VALUES (r1), (r2), ...`
 *   - string literals with embedded `)` or commas via a proper tuple tokeniser
 *   - multi-line INSERT statements
 * Only tables in `config.ruleSources.tables` are scanned. At v1 there are no
 * inserts into the rule table → finds nothing (no-op).
 */
export function extractFromSqlInserts(
  sqlFiles: SqlFile[],
  config: BenefitMechanismConfig,
): RuleRecord[] {
  const ruleTables = new Set(config.ruleSources.tables.map((t) => t.toLowerCase()));
  if (ruleTables.size === 0) return [];

  // Match INSERT INTO [schema.]table (cols).
  // Schema prefix is optional and stripped; table name is captured in group 1.
  // The 'si' flags give case-insensitive + dotAll (for \s across newlines — already
  // matched by \s, but dotAll future-proofs any '.' metachar additions).
  const headerRe = /INSERT\s+INTO\s+(?:"?\w+"?\.)?"?(\w+)"?\s*\(([^)]+)\)/gis;
  const records: RuleRecord[] = [];

  for (const file of sqlFiles) {
    for (const m of file.text.matchAll(headerRe)) {
      const table = m[1].toLowerCase();
      if (!ruleTables.has(table)) continue;

      const cols = splitSqlList(m[2]).map((c) => stripIdent(c).toLowerCase());
      let pos = (m.index ?? 0) + m[0].length;

      // Locate the VALUES keyword immediately after the column list.
      const valuesMatch = /\bVALUES\s*/i.exec(file.text.slice(pos));
      if (!valuesMatch) continue;
      pos += valuesMatch.index! + valuesMatch[0].length;

      // Parse each VALUES tuple row; a single INSERT may have multiple: (r1), (r2), ...
      while (pos < file.text.length) {
        const wsLen = file.text.slice(pos).match(/^\s*/)![0].length;
        pos += wsLen;

        const tupleResult = parseSqlValueTuple(file.text, pos);
        if (!tupleResult) break;

        const { values: vals, end } = tupleResult;
        const line = lineOf(file.text, m.index ?? 0);

        const bmIdx = cols.indexOf('benefit_mechanism');
        const benefit_mechanism =
          bmIdx >= 0 && bmIdx < vals.length ? vals[bmIdx] : undefined;

        let id: string | undefined;
        for (const idCol of ID_COLUMNS) {
          const idx = cols.indexOf(idCol);
          if (idx >= 0 && idx < vals.length && vals[idx]) {
            id = vals[idx];
            break;
          }
        }

        records.push({
          id: id ?? `${table}@${file.path}:${line}`,
          benefit_mechanism,
          _source: file.path,
          _line: line,
        });

        pos = end;
        // Advance past comma separator between tuple rows.
        const commaMatch = file.text.slice(pos).match(/^\s*,\s*/);
        if (commaMatch) {
          pos += commaMatch[0].length;
        } else {
          break;
        }
      }
    }
  }

  return records;
}

/** Pick an id-like field off a parsed JSON record object. */
function pickJsonId(obj: Record<string, unknown>, fallback: string): string {
  for (const key of ID_COLUMNS) {
    const v = obj[key];
    if (typeof v === 'string' && v.length > 0) return v;
    if (typeof v === 'number') return String(v);
  }
  return fallback;
}

/** Flatten a parsed JSON document into candidate rule-record objects. */
function jsonCandidates(doc: unknown): Record<string, unknown>[] {
  if (Array.isArray(doc)) return doc.filter(isObject);
  if (!isObject(doc)) return [];
  // A single record object (carries the tag or an id-like key)…
  if ('benefit_mechanism' in doc || ID_COLUMNS.some((k) => k in doc)) return [doc];
  // …otherwise a wrapper object: take object elements of its array-valued fields.
  return Object.values(doc)
    .filter(Array.isArray)
    .flatMap((arr) => (arr as unknown[]).filter(isObject));
}

/**
 * Extract rule records from JSON seed / fixture files. Each candidate record
 * yields a RuleRecord carrying whatever `benefit_mechanism` it declares (undefined
 * if absent → check (a) flags the missing tag). At v1 the seed/fixture globs are
 * empty → this is never called with content (no-op).
 */
export function extractFromJsonSeed(
  jsonFiles: JsonSeedFile[],
  _config: BenefitMechanismConfig,
): RuleRecord[] {
  const records: RuleRecord[] = [];
  for (const file of jsonFiles) {
    let doc: unknown;
    try {
      doc = JSON.parse(file.text);
    } catch (err) {
      throw new Error(
        `benefit-mechanism: failed to parse JSON seed ${file.path}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    const candidates = jsonCandidates(doc);
    candidates.forEach((obj, i) => {
      records.push({
        id: pickJsonId(obj, `${file.path}#${i}`),
        benefit_mechanism: obj.benefit_mechanism,
        _source: file.path,
      });
    });
  }
  return records;
}
