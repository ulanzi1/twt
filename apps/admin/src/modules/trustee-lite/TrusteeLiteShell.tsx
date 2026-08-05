// `<TrusteeLiteShell>` — the pure presentational trustee worklist (Story 10.11, Task 5; AC7/AC9).
//
// PURE (no hooks / router / fetch) so every state is render-testable in isolation; the container
// (`<TrusteeLitePage>`) wires the data. Precedent: the shipped helpdesk / verifier console shells.
//
// ── The FOUR distinguishable section states (AC9) ─────────────────────────────────────────────
//   1. POPULATED            — rows render.
//   2. GENUINELY EMPTY      — "nothing here is waiting on you". The caller MAY see this section.
//   3. NOT PERMITTED        — the section key is ABSENT from the response; a distinct rendering, and
//                             never the same as (2). Collapsing them would tell a trustee "there are
//                             no R9 cases" when the truth is "you cannot see R9 cases".
//   4. DETECTION UNAVAILABLE — violator flags only: the check cannot run at all. Distinct from (2) for
//                             the same reason, and the most consequential of the four to get right —
//                             an empty violator list reads as a false all-clear.
//
// Empty / loading / error / not-permitted are rendered OUTSIDE the row list, never as a row inside it
// ([[project_fabric_flatlist_empty_populated_crash]] — admin is web rather than React Native, so the
// New-Architecture crash itself does not apply, but the structural rule that produced that fix does:
// a list renders rows and only rows).
//
// ── The undated group is LABELLED, not just ordered (AC2/AC9) ─────────────────────────────────
// The server orders dated rows before undated ones. The shell inserts a visible "Items with no
// deadline" divider at the boundary so the two-tier order is legible rather than mysterious — a
// trustee should never have to infer why row 4 sorts above row 5.

import type { TrusteeLiteResponse, TrusteeSignalRow, ViolatorFlagsSection } from '@twt/contracts';
import type { ReactElement } from 'react';
import { Fragment } from 'react';

import { trusteeCrossLink } from './crossLinks.js';
import { producerLabel, resolveEn } from './i18n-en.js';

/** The six row-bearing sections, in the order they render (mirrors the domain's declared order). */
export const TRUSTEE_ROW_SECTIONS = [
  'cycle_freeze',
  'r9_voting',
  'concealment',
  'appeal',
  'reconciliation',
  'moderation',
] as const;
export type TrusteeRowSection = (typeof TRUSTEE_ROW_SECTIONS)[number];

export interface TrusteeLiteShellProps {
  pariwarId: string;
  /** The server response; `undefined` while loading or on error. */
  data?: TrusteeLiteResponse;
  loading: boolean;
  error?: string;
  onRetry?: () => void;
  /** Navigate to a cross-link target. */
  onNavigate: (href: string) => void;
}

/** Whole-day/hour/minute rendering of a waiting duration. Never "only N days left" (a tone rule). */
function formatAge(ageMs: number | null): string {
  if (ageMs === null) return resolveEn('trustee.age.unknown');
  const minutes = Math.floor(ageMs / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function severityLabel(severity: TrusteeSignalRow['severity']): string {
  if (severity === null) return resolveEn('trustee.severity.none');
  return resolveEn(`trustee.severity.${severity}`);
}

function severityToneClass(severity: TrusteeSignalRow['severity']): string {
  if (severity === 'breached') return 'font-semibold text-status-fail-fg';
  if (severity === 'due_soon') return 'font-medium text-gray-800';
  return 'text-gray-500';
}

function SignalRow({
  pariwarId,
  row,
  onNavigate,
}: {
  pariwarId: string;
  row: TrusteeSignalRow;
  onNavigate: (href: string) => void;
}): ReactElement {
  const link = trusteeCrossLink(pariwarId, row);
  return (
    <tr className="border-b align-top" data-testid={`trustee-row-${row.source_key}`}>
      <td className="px-3 py-2 text-sm">{row.label}</td>
      <td className="px-3 py-2 text-sm text-gray-600" data-testid="trustee-age">
        {formatAge(row.age_ms)}
      </td>
      <td className="px-3 py-2 text-sm" data-testid="trustee-deadline">
        {row.deadline_at === null ? (
          // AC2 — an EXPLICIT affordance. Never a blank cell (which reads as "due now") and never a
          // fabricated date.
          <span className="text-gray-500 italic">{resolveEn('trustee.deadline.none')}</span>
        ) : (
          <span title={row.deadline_at}>{new Date(row.deadline_at).toLocaleString()}</span>
        )}
      </td>
      <td className={`px-3 py-2 text-sm ${severityToneClass(row.severity)}`} data-testid="trustee-severity">
        {severityLabel(row.severity)}
      </td>
      <td className="px-3 py-2 text-sm">
        {link.href === null ? (
          <span className="text-gray-400" title={resolveEn('trustee.link.unavailable')}>
            {link.label}
          </span>
        ) : (
          <button
            type="button"
            className="underline"
            data-testid={`trustee-link-${row.source_key}`}
            onClick={() => onNavigate(link.href!)}
          >
            {link.label}
          </button>
        )}
      </td>
    </tr>
  );
}

function RowSection({
  pariwarId,
  section,
  rows,
  onNavigate,
}: {
  pariwarId: string;
  section: TrusteeRowSection;
  /** `undefined` ≡ NOT PERMITTED (the key was absent from the response) — never the same as `[]`. */
  rows: TrusteeSignalRow[] | undefined;
  onNavigate: (href: string) => void;
}): ReactElement {
  const heading = resolveEn(`trustee.section.${section}`);

  // State 3 — not permitted. Rendered OUTSIDE any list.
  if (rows === undefined) {
    return (
      <section aria-label={heading} data-testid={`trustee-section-${section}`} data-state="not-permitted">
        <h2 className="text-base font-semibold">{heading}</h2>
        <p className="mt-1 text-sm text-gray-500">{resolveEn('trustee.state.notPermitted')}</p>
      </section>
    );
  }

  // State 2 — genuinely empty. Also outside any list.
  if (rows.length === 0) {
    return (
      <section aria-label={heading} data-testid={`trustee-section-${section}`} data-state="empty">
        <h2 className="text-base font-semibold">{heading}</h2>
        <p className="mt-1 text-sm text-gray-600">{resolveEn('trustee.state.empty')}</p>
      </section>
    );
  }

  // State 1 — populated. The list mounts only here, and it renders rows and only rows.
  const firstUndated = rows.findIndex((row) => row.deadline_at === null);
  return (
    <section aria-label={heading} data-testid={`trustee-section-${section}`} data-state="populated">
      <h2 className="text-base font-semibold">{heading}</h2>
      <table className="mt-2 w-full table-auto border-collapse">
        <thead>
          <tr className="border-b text-left text-xs uppercase text-gray-500">
            <th className="px-3 py-2">{resolveEn('trustee.col.item')}</th>
            <th className="px-3 py-2">{resolveEn('trustee.col.age')}</th>
            <th className="px-3 py-2">{resolveEn('trustee.col.deadline')}</th>
            <th className="px-3 py-2">{resolveEn('trustee.col.severity')}</th>
            <th className="px-3 py-2">{resolveEn('trustee.col.link')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <Fragment key={row.source_key}>
              {index === firstUndated && firstUndated > 0 && (
                <tr data-testid={`trustee-undated-divider-${section}`}>
                  <td colSpan={5} className="px-3 pt-3 text-xs uppercase text-gray-400">
                    {resolveEn('trustee.group.undated')}
                  </td>
                </tr>
              )}
              <SignalRow pariwarId={pariwarId} row={row} onNavigate={onNavigate} />
            </Fragment>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function ViolatorSection({
  pariwarId,
  section,
  onNavigate,
}: {
  pariwarId: string;
  /** `undefined` ≡ NOT PERMITTED; the discriminated union covers the other three states. */
  section: ViolatorFlagsSection | undefined;
  onNavigate: (href: string) => void;
}): ReactElement {
  const heading = resolveEn('trustee.section.violator_flag');

  if (section === undefined) {
    return (
      <section aria-label={heading} data-testid="trustee-section-violator_flag" data-state="not-permitted">
        <h2 className="text-base font-semibold">{heading}</h2>
        <p className="mt-1 text-sm text-gray-500">{resolveEn('trustee.state.notPermitted')}</p>
      </section>
    );
  }

  // State 4 — DETECTION UNAVAILABLE. The most important of the four to render distinctly: an empty
  // list here would read as "no members are in violation", which is a false all-clear.
  if (section.status === 'detection_unavailable') {
    return (
      <section
        aria-label={heading}
        data-testid="trustee-section-violator_flag"
        data-state="detection-unavailable"
      >
        <h2 className="text-base font-semibold">{heading}</h2>
        <p className="mt-1 text-sm font-medium">{resolveEn('trustee.violator.unavailable.title')}</p>
        <p className="mt-1 text-sm text-gray-600" data-testid="trustee-violator-unavailable-body">
          {resolveEn('trustee.violator.unavailable.body').replace('{producer}', producerLabel(section.producer))}
        </p>
      </section>
    );
  }

  if (section.members.length === 0) {
    return (
      <section aria-label={heading} data-testid="trustee-section-violator_flag" data-state="empty">
        <h2 className="text-base font-semibold">{heading}</h2>
        <p className="mt-1 text-sm text-gray-600">{resolveEn('trustee.violator.empty')}</p>
      </section>
    );
  }

  // The member-record link is COLD (AC4/AC7) — the same `member_record` cross-link every moderation
  // row uses, with no reason code and no pre-selected action.
  const memberHref = trusteeCrossLink(pariwarId, { cross_link_kind: 'member_record', claim_case_id: null }).href;

  return (
    <section aria-label={heading} data-testid="trustee-section-violator_flag" data-state="populated">
      <h2 className="text-base font-semibold">{heading}</h2>
      <p className="mt-1 text-sm text-gray-600">{resolveEn('trustee.violator.intro')}</p>
      <ul className="mt-2 flex flex-col gap-3">
        {section.members.map((member) => (
          <li key={member.member_id} className="rounded border p-3" data-testid={`trustee-violator-${member.member_id}`}>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm">
                {resolveEn('trustee.violator.member')}: {member.member_id}
              </span>
              {memberHref !== null && (
                <button
                  type="button"
                  className="text-sm underline"
                  data-testid={`trustee-violator-link-${member.member_id}`}
                  onClick={() => onNavigate(memberHref)}
                >
                  {resolveEn('trustee.violator.link')}
                </button>
              )}
            </div>
            <ul className="mt-2 flex flex-col gap-2">
              {member.flags.map((flag) => (
                <li key={flag.clause_id} className="text-sm">
                  <div>
                    {resolveEn('trustee.violator.clause')}: <code>{flag.clause_id}</code> — {flag.clause_label}
                  </div>
                  <div className="text-gray-600">
                    {resolveEn('trustee.violator.holdingSince')}:{' '}
                    {flag.holding_since === null ? (
                      <span className="italic">{resolveEn('trustee.violator.holdingSince.unknown')}</span>
                    ) : (
                      new Date(flag.holding_since).toLocaleDateString()
                    )}
                  </div>
                  <div className="text-gray-600">
                    {resolveEn('trustee.violator.facts')}:{' '}
                    {flag.facts_establishing.length === 0 ? (
                      <span className="italic">{resolveEn('trustee.violator.facts.none')}</span>
                    ) : (
                      flag.facts_establishing.map((fact) => `${fact.key}=${String(fact.value)}`).join(', ')
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function TrusteeLiteShell(props: TrusteeLiteShellProps): ReactElement {
  const { pariwarId, data, loading, error, onRetry, onNavigate } = props;

  // Loading + error render OUTSIDE every list — the sections mount only once there is data.
  if (loading) {
    return (
      <p role="status" data-testid="trustee-loading">
        {resolveEn('trustee.loading')}
      </p>
    );
  }
  if (error !== undefined || data === undefined) {
    return (
      <div role="alert" data-testid="trustee-error" className="flex flex-col items-start gap-2">
        <p>{error ?? resolveEn('trustee.error')}</p>
        {onRetry && (
          <button type="button" className="rounded border px-3 py-1 text-sm" onClick={onRetry}>
            {resolveEn('trustee.retry')}
          </button>
        )}
      </div>
    );
  }

  return (
    <section aria-label={resolveEn('trustee.title')} className="flex flex-col gap-6">
      <header>
        <h1 className="text-lg font-bold">{resolveEn('trustee.title')}</h1>
        <p className="mt-1 text-sm text-gray-600">{resolveEn('trustee.subtitle')}</p>
        <p className="mt-1 text-xs text-gray-500">
          {resolveEn('trustee.evaluatedAt')} {new Date(data.evaluated_at).toLocaleString()}
        </p>
      </header>

      {TRUSTEE_ROW_SECTIONS.map((section) => (
        <RowSection
          key={section}
          pariwarId={pariwarId}
          section={section}
          rows={data[section]}
          onNavigate={onNavigate}
        />
      ))}

      <ViolatorSection pariwarId={pariwarId} section={data.violator_flags} onNavigate={onNavigate} />
    </section>
  );
}
