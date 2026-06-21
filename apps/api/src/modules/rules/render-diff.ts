// Rendered-content diff (AC1c) — pure display-field rendering. Story 2.4.
//
// The payload is OPAQUE (freeze row 14 — Epic 4 owns rule semantics), so this is a
// DISPLAY-FIELD rendering, NOT a rule interpretation: for each top-level key present
// in either the prior-published or the draft payload, emit a readable before/after
// string row. Primitives render as their string form; objects/arrays render as
// compact JSON (the readable key:value fallback per Dev Notes §"Diff preview"). The
// authoritative bilingual display contract crystallizes at Story 2.5's public render
// — this is deliberately pragmatic, not over-built. Deterministic (keys sorted).

import type { RenderedDiffRow } from '@twt/contracts';
import type { schema } from '@twt/domain';

type ClausePayload = schema.ClausePayload;

/** Render a single payload value to a readable display string (null when absent). */
function renderValue(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  // Objects / arrays: compact JSON fallback (still display-shaped, not interpreted).
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/**
 * Build the field-aligned rendered diff between the prior-published payload (`{}` for
 * a create) and the draft payload. One row per top-level key present on either side,
 * sorted by field name for stable output.
 */
export function renderDisplayDiff(prev: ClausePayload, next: ClausePayload): RenderedDiffRow[] {
  const keys = [...new Set([...Object.keys(prev), ...Object.keys(next)])].sort();
  return keys.map((field) => {
    const before = renderValue(prev[field]);
    const after = renderValue(next[field]);
    return { field, before, after, changed: before !== after };
  });
}
