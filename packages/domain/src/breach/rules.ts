// Story 14.3 (decisions `2026-11-20-467` DL4, DL6 and `2026-11-20-471`) — the WRITE rules of the breach register, pure and pg-free.
//
// WHY THEY LIVE HERE AS WELL AS IN CONTRACTS. The full derived view (status, flags, overdue, the latest assessment) is ONE function,
// `deriveBreachIncidentView` in `@twt/contracts` — the API and the admin page share it. But `@twt/contracts` depends on
// `@twt/domain`, never the reverse, so the domain's in-lock backstop cannot call it. The append path needs three facts under the lock —
// "is this incident closed?", "when is the Board report due right now?" and "may this withdrawal be appended?" — and these answer them.
// A contracts test (which MAY import the domain) pins both equal to the contracts derivation on shared fixtures, so the two can
// never drift silently. Nothing else about an incident is derived in the domain.

/** DPDP Rules 2025, Rule 7(2)(b): the detailed report is due "within seventy-two hours of becoming aware of the breach". */
export const BREACH_BOARD_REPORT_WINDOW_MS = 72 * 60 * 60 * 1000;

/** The part of an entry the rules read. Entries are always passed in `entry_seq` order. */
export interface BreachRuleEntry {
  /** A withdrawal names its target by it (decision `2026-11-20-471`). REQUIRED: without it a withdrawal could be silently
   * ignored and the due time drift from the contracts derivation. */
  readonly entryId: string;
  readonly kind: string;
  readonly payload: Readonly<Record<string, unknown>>;
}

/** An incident is closed once it has a `closed` entry; nothing may be appended after it. */
export function isBreachIncidentClosed(entries: readonly BreachRuleEntry[]): boolean {
  return entries.some((e) => e.kind === 'closed');
}

/** `grantedUntil` of a `board_extension_recorded` payload as a Date, or null when it is absent or unparseable. */
export function breachExtensionGrantedUntil(payload: Readonly<Record<string, unknown>>): Date | null {
  const raw = payload['grantedUntil'];
  if (typeof raw !== 'string') return null;
  const ms = Date.parse(raw);
  return Number.isNaN(ms) ? null : new Date(ms);
}

/** The ids of the extensions a `board_extension_withdrawn` entry has withdrawn (lower-cased). */
function withdrawnExtensionIds(entries: readonly BreachRuleEntry[]): Set<string> {
  const ids = new Set<string>();
  for (const e of entries) {
    if (e.kind !== 'board_extension_withdrawn') continue;
    const target = e.payload['withdrawsEntryId'];
    if (typeof target === 'string') ids.add(target.toLowerCase());
  }
  return ids;
}

/**
 * Why a `board_extension_withdrawn` naming `targetEntryId` would be refused, or null when it may be appended (decision
 * `2026-11-20-471`): the target must be an entry of THIS incident (it is among `entries`), a `board_extension_recorded`, and not
 * already withdrawn.
 */
export function breachWithdrawalRefusal(
  entries: readonly BreachRuleEntry[],
  targetEntryId: unknown,
): 'not_an_extension' | 'already_withdrawn' | null {
  if (typeof targetEntryId !== 'string') return 'not_an_extension';
  const id = targetEntryId.toLowerCase();
  const target = entries.find((e) => e.entryId.toLowerCase() === id);
  if (!target || target.kind !== 'board_extension_recorded') return 'not_an_extension';
  return withdrawnExtensionIds(entries).has(id) ? 'already_withdrawn' : null;
}

/**
 * When the Board's detailed report is due: the LATEST recorded extension that was NOT withdrawn (entries are in `entry_seq`
 * order, and each extension must be later than the due time it replaces), else awareness + 72 hours.
 */
export function breachBoardReportDueAt(becameAwareAt: Date, entries: readonly BreachRuleEntry[]): Date {
  const withdrawn = withdrawnExtensionIds(entries);
  let due = new Date(becameAwareAt.getTime() + BREACH_BOARD_REPORT_WINDOW_MS);
  for (const e of entries) {
    if (e.kind !== 'board_extension_recorded') continue;
    if (withdrawn.has(e.entryId.toLowerCase())) continue;
    const until = breachExtensionGrantedUntil(e.payload);
    if (until) due = until;
  }
  return due;
}
