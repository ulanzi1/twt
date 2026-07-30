// Pure CSV serializer — Story 10.6 (Task 3; AC2, AC6).
//
// There is no existing CSV *writer* in the repo (data-export emits JSON/ZIP; bank-parsers only
// *reads* inbound CSVs) — this is the first. RFC-4180 quoting, stable column order (union of keys,
// first-seen), `\r\n` line endings. DB-free; the harness returns the resulting string synchronously
// — durable/async persistence + signed download URLs are Story 10.7's concern (Scope Boundary).
//
// Also neutralizes spreadsheet-formula-injection (OWASP CSV Injection) — this is the first CSV
// writer in the repo, feeding preview/error CSVs that operators routinely open in Excel/Sheets,
// populated from loosely-typed `target_set` item data and operation-supplied `csvRow` content
// (Review Findings, Story 10.6).

/** Leading characters that a spreadsheet application may interpret as a formula/DDE trigger
 *  (OWASP CSV Injection: `=` `+` `-` `@`, plus tab/CR). */
const FORMULA_TRIGGER_CHARS = new Set(['=', '+', '-', '@', '\t', '\r']);

/** Prefix a field with `'` when its FIRST character could trigger spreadsheet formula evaluation
 *  — the standard OWASP mitigation (most spreadsheet apps treat a leading `'` as a literal-text
 *  marker). Applied before RFC-4180 quoting so the prefix is itself just ordinary field content. */
function neutralizeFormulaInjection(value: string): string {
  return FORMULA_TRIGGER_CHARS.has(value.charAt(0)) ? `'${value}` : value;
}

/** Quote a field iff it contains a comma, a double quote, or a newline (RFC 4180 §2.5-2.7); an
 *  interior `"` is escaped by doubling it. */
function quoteField(rawValue: string): string {
  const value = neutralizeFormulaInjection(rawValue);
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Serialize rows into a CSV string with a header row. Column order is the union of every row's
 * keys in FIRST-SEEN order (stable across heterogeneous rows — e.g. an operation whose `csvRow`
 * varies its keys per item). An empty `rows` array produces an empty string (no header) — there is
 * nothing to describe a header for, and a header-only CSV would misleadingly imply zero-matching
 * rows rather than "not applicable" (e.g. a dry-run with no failures has no error CSV to render).
 */
export function toCsv(rows: readonly Record<string, string>[]): string {
  if (rows.length === 0) return '';

  const columns: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) {
        seen.add(key);
        columns.push(key);
      }
    }
  }

  const lines = [columns.map(quoteField).join(',')];
  for (const row of rows) {
    lines.push(columns.map((col) => quoteField(row[col] ?? '')).join(','));
  }
  return lines.join('\r\n') + '\r\n';
}
