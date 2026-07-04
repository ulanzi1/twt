// `<MemberStatusPanel>` — admin variant (Story 4.7, Task 5; AC1 + AC3).
//
// Renders the SHARED framework-agnostic view-model (`@twt/ui` `buildMemberStatusViewModel`, variant
// 'admin') with Radix/Tailwind. The panel does NOT re-derive eligibility — it renders whatever the pure
// presenter produced from the canonical FR-12A payload (so the admin + member panels can never drift).
// The admin variant ADDS the identity header (from the search result) + the full provenance audit-trace
// (the rule-by-rule explanations). Accessibility (AC3): the panel is a labelled region, sections are an
// ordered labelled list, statuses are text (not colour-only), and the appeal CTA is reachable from
// every failure state.

import { buildMemberStatusViewModel } from '@twt/ui';
import type { MemberSearchResultItem, MemberValidityPayloadDto } from '@twt/contracts';
import type { ReactElement } from 'react';

import { resolveEn, statusClass } from './i18n-en.js';

export interface MemberStatusPanelProps {
  payload: MemberValidityPayloadDto;
  /** The selected search result — supplies the identity header the payload does not carry (admin only). */
  identity?: MemberSearchResultItem;
}

export function MemberStatusPanel({ payload, identity }: MemberStatusPanelProps): ReactElement {
  const vm = buildMemberStatusViewModel(payload, { variant: 'admin' });

  return (
    <section aria-label="Member status panel" data-testid="member-status-panel" className="flex flex-col gap-5">
      {/* Identity header — admin only; suppressed for the member variant (AC2a). */}
      {identity && !vm.identitySuppressed && (
        <header className="rounded border p-4" data-testid="identity-header">
          <h2 className="text-lg font-bold">{identity.name ?? 'Name unavailable'}</h2>
          <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            <dt className="opacity-60">Member ID</dt>
            <dd><code>{identity.memberId}</code></dd>
            <dt className="opacity-60">Mobile</dt>
            <dd>{identity.maskedMobile ?? '—'}</dd>
            <dt className="opacity-60">Aadhaar (masked)</dt>
            <dd>{identity.aadhaarMasked ?? '—'}</dd>
            <dt className="opacity-60">KYC</dt>
            <dd>{identity.verificationStrength ?? 'unverified'}</dd>
          </dl>
        </header>
      )}

      {/* Headline status + validity window. */}
      <header className="flex flex-wrap items-center justify-between gap-2">
        <span
          data-testid="headline-status"
          className={`rounded border px-3 py-1 text-sm font-semibold ${statusClass(
            vm.sections[0]?.status ?? 'info',
          )}`}
        >
          {resolveEn(vm.headlineKey)}
        </span>
        {vm.validityWindow.validThrough && (
          <span className="text-sm opacity-70">
            Valid through {new Date(vm.validityWindow.validThrough).toLocaleDateString()}
          </span>
        )}
      </header>

      {/* Sections (a)–(g) as an ordered, labelled list (AC1 + AC3). */}
      <ol aria-label="Status sections" className="flex flex-col gap-3">
        {vm.sections
          .filter((s) => s.id !== 'headline' && s.visible)
          .map((s) => (
            <li key={s.id} className="rounded border p-3" data-testid={`section-${s.id}`}>
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">{resolveEn(s.titleKey)}</h3>
                <span className={`rounded border px-2 py-0.5 text-xs ${statusClass(s.status)}`}>
                  {s.status}
                </span>
              </div>
              <ul className="mt-1 flex flex-col gap-0.5 text-sm">
                {s.detailKeys.map((k) => (
                  <li key={k}>{resolveEn(k)}</li>
                ))}
              </ul>
              {/* Lock-in deep-link to the policy clause (AC1c). */}
              {s.id === 'lock-in' && typeof s.data['clauseId'] === 'string' && (
                <p className="mt-1 text-xs">
                  <a className="underline" href={`#/niyamavali/${String(s.data['clauseId'])}`}>
                    Policy clause: {String(s.data['clauseId'])}
                  </a>
                </p>
              )}
            </li>
          ))}
      </ol>

      {/* Rule-by-rule provenance audit-trace (admin variant — full prose, not codes). */}
      {vm.ruleExplanations.length > 0 && (
        <section aria-label="Rule provenance" data-testid="rule-provenance" className="rounded border p-3">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide opacity-70">
            Rule provenance
          </h3>
          <ol className="flex flex-col gap-1 text-sm">
            {vm.ruleExplanations.map((r) => (
              <li key={`${r.clauseId}:${r.clauseVersionId}`}>
                <span className="opacity-70">{r.outcome}</span> — {resolveEn(r.explanationKey)}{' '}
                <code className="text-xs opacity-60">({r.clauseId})</code>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Appeal CTA — reachable from every failure state (UX + a11y). */}
      {vm.showAppealCta && (
        <div>
          <button
            type="button"
            data-testid="appeal-cta"
            className="rounded border border-status-fail-border px-4 py-2 text-sm font-medium text-status-fail-fg"
          >
            Raise an appeal / review
          </button>
        </div>
      )}
    </section>
  );
}
