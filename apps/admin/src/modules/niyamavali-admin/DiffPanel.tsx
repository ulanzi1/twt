// Diff-preview panel (AC1c) — presentational. Renders BOTH the rendered-content diff
// (display-field before/after rows) AND the structured-payload diff (key-path
// added/removed/changed). Pure props in → no hooks/router, so it renders standalone
// in tests (the audit-integrity StatusBanner precedent).

import type { DiffPreviewResponse } from '@twt/contracts';
import type { ReactElement } from 'react';

export interface DiffPanelProps {
  diff: DiffPreviewResponse;
}

function valueCell(value: string | null): ReactElement {
  if (value === null) return <span className="opacity-40">—</span>;
  return <span>{value}</span>;
}

export function DiffPanel({ diff }: DiffPanelProps): ReactElement {
  const { renderedDiff, structuredDiff } = diff;
  const changedCount = renderedDiff.filter((r) => r.changed).length;

  return (
    <section aria-label="Diff preview" data-testid="diff-panel" className="flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide opacity-70">
          Rendered content ({changedCount} changed)
        </h3>
        {renderedDiff.length === 0 ? (
          <p className="text-sm opacity-70">No display fields to compare.</p>
        ) : (
          <table className="w-full text-sm" data-testid="rendered-diff">
            <thead>
              <tr className="text-left opacity-70">
                <th className="py-1 pr-3">Field</th>
                <th className="py-1 pr-3">Before</th>
                <th className="py-1">After</th>
              </tr>
            </thead>
            <tbody>
              {renderedDiff.map((row) => (
                <tr
                  key={row.field}
                  data-testid={`diff-row-${row.field}`}
                  data-changed={row.changed ? 'true' : 'false'}
                  className={row.changed ? 'bg-status-warn-bg' : undefined}
                >
                  <td className="py-1 pr-3 font-mono">{row.field}</td>
                  <td className="py-1 pr-3">{valueCell(row.before)}</td>
                  <td className="py-1">{valueCell(row.after)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <details data-testid="structured-diff">
        <summary className="cursor-pointer text-sm font-semibold uppercase tracking-wide opacity-70">
          Structured payload diff
        </summary>
        <pre className="mt-2 overflow-x-auto rounded bg-black/5 p-2 text-xs">
          {JSON.stringify(structuredDiff, null, 2)}
        </pre>
      </details>
    </section>
  );
}
