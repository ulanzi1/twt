// The `<ContributionList>` i18n REF catalogue — Story 11b.2 (Task 1; AC2 / D12-refscope(a)). ONE iterable
// record of `{ key, namespace }` pairs, NOT loose consts: the AC2 test is only writable against an iterable
// export — against loose consts it enumerates by hand and is vacuous by construction.
//
// ── REUSE ONLY. NOTHING IS MINTED HERE, AND NO NAMESPACE IS CREATED ─────────────────────────────────────
// All ten `contributor_list.*` keys already ship, bilingually, at
// `packages/i18n/locales/{en,hi}/contribution.json:30-39`, and the `contribution` namespace is already
// registered at all three `catalog.ts` sites AND already globbed (`microcopy.yaml:317-318`). A namespace that
// is not in `copy_globs` is unscanned copy that still passes every check (`microcopy.yaml:350-352`).
//
// ── WHY ALL TEN, WHEN THIS ROW PRESENTER EMITS EXACTLY ONE ──────────────────────────────────────────────
// The NINE list-level keys have no emitter here — Trap 1 forbids a list presenter — but they WILL be consumed
// by Story 11b.2b, and a bare key there is this module's crash one story later. 11b.2b's AC6 de-duplicates
// against this record BY NAME and writes no second one (D12-refscope(a)).
//
// ⛔ `member.anonymousMember` is DELIBERATELY ABSENT. 11b.2a's D6(a) removed it: with an RTBF'd contributor's
// row omitted entirely (11b.2a's D5), nothing in this module can render it. Its own deletion question belongs
// to 11b.2a's Task 6, NOT here.
//
// ⚠ `pendingStrip` / `pendingStripA11y` are the AGGREGATE signal (pool-contributor-list.ts:59-65), NOT a
// per-row identity field. AC4's banned-token ban is scoped to the ROW TYPES' flattened key sets and NEVER to
// a copy key — do not delete a required ref to make a scan pass.

import type { ContributionListI18nRef } from './view-model.js';

/**
 * Every `contributor_list.*` key this module and its render layers resolve, each carrying the namespace it
 * resolves in. ⚠ The render layer calls `t(ref.key, params, { namespace: ref.namespace })` — the namespace is
 * the THIRD argument (`resolver.ts:53`); passing it second lands it in the params slot, falls back to
 * `'common'`, and THROWS on every call.
 */
export const CONTRIBUTION_LIST_I18N_REFS = {
  confirmedHeader: { key: 'contributor_list.confirmed_header', namespace: 'contribution' },
  empty: { key: 'contributor_list.empty', namespace: 'contribution' },
  noPool: { key: 'contributor_list.no_pool', namespace: 'contribution' },
  pendingStrip: { key: 'contributor_list.pending_strip', namespace: 'contribution' },
  pendingStripA11y: { key: 'contributor_list.pending_strip_a11y', namespace: 'contribution' },
  rowA11y: { key: 'contributor_list.row_a11y', namespace: 'contribution' },
  title: { key: 'contributor_list.title', namespace: 'contribution' },
  viewCta: { key: 'contributor_list.view_cta', namespace: 'contribution' },
  viewCtaA11y: { key: 'contributor_list.view_cta_a11y', namespace: 'contribution' },
  viewCtaHint: { key: 'contributor_list.view_cta_hint', namespace: 'contribution' },
} as const satisfies Record<string, ContributionListI18nRef>;
