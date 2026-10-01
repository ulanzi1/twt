// The `-273` §7 highlight — Story 6.19c (AC14, `-226` cl.5). Shown to all three roles on a claim the Super Admin
// approved WITHOUT a current passing name check: "Approved despite a name mismatch" when the recorded verdict was
// `does_not_match`, else "Approved without a current passing name check". The server derives it from the approval
// record and the check's RECORDED state — ⛔ this component compares nothing and is shown ⛔ no name.

import type { ApprovalNameHighlight } from '@twt/contracts';
import type { ReactElement } from 'react';

import { correctionClosureEn as t } from './i18n-en.js';

export function ApprovalNameHighlightBadge({ highlight }: { highlight: ApprovalNameHighlight | null }): ReactElement | null {
  if (highlight === null) return null;
  return (
    <span
      data-testid="approval-name-highlight"
      data-highlight={highlight}
      className="rounded bg-status-warn-bg px-1.5 py-0.5 text-xs text-status-warn-fg"
    >
      {t.highlight[highlight]}
    </span>
  );
}
