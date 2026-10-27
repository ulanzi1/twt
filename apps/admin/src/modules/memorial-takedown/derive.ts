// Pure helpers for the take-down screens (Story 11b.4a, Task 9.2 — AC11). ⛔ No React, ⛔ no fetch: what the drive screen says,
// derived from the server's drive view, so it is testable and the page carries ⛔ no copy logic of its own.

import type { MemorialTakedownDriveResponse, MemorialTakedownRequestView } from '@twt/contracts';

import { resolveEn as t } from './i18n-en.js';

/**
 * The operator's smaller-fix script, in order (AC11 / AC14 — `-393` M4): the offer, the branch the chain is in (MP8 (b)), and
 * who sends a new version (the CURRENT nominee — named when they are ⛔ not the nominee who asked). `[]` when ⛔ nothing is shown.
 */
export function operatorScript(drive: Pick<MemorialTakedownDriveResponse, 'smallerFix' | 'currentNominee'>): string[] {
  if (drive.smallerFix === null) return [];
  const lines = [t('takedown.script.intro'), t(`takedown.script.${drive.smallerFix}`)];
  const c = drive.currentNominee;
  if (c !== null) {
    lines.push(
      c.isNomineeToCallBack || c.name === null
        ? t('takedown.script.currentNominee')
        : t('takedown.script.currentNomineeOther').replace('{name}', c.name),
    );
  }
  return lines;
}

/** One request's status line: open (with "overdue"), or its outcome — "decided after the due date" when it was (AC7). */
export function requestStatus(r: MemorialTakedownRequestView): string {
  if (r.outcome === null) return r.overdue ? `${t('takedown.requests.open')} · ${t('takedown.open.overdue')}` : t('takedown.requests.open');
  const label = t(`takedown.outcome.${r.outcome.outcome}`);
  return r.outcome.decidedAfterDue ? `${label} · ${t('takedown.requests.decidedLate')}` : label;
}

/** The request still open on the drive, if any (the server allows ONE at a time). */
export function openRequestOf(drive: Pick<MemorialTakedownDriveResponse, 'requests'>): MemorialTakedownRequestView | null {
  return drive.requests.find((r) => r.outcome === null) ?? null;
}

/** `<input type="datetime-local">`'s value for `d`, in the browser's local time. */
export function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
