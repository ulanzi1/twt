// Banner/Popup authoring console (Story 10.9, Task 6) — the pariwar-scoped admin surface.
//
// Composes: a derived-display-state-filtered list, a create/edit editor (bilingual copy, audience,
// display mode, dismissible, display-once, severity, and the visibility window), a LIVE PREVIEW of
// the member render that visually distinguishes `scheduled` from `live`, the AC5 VISIBILITY VERDICT,
// and the status-gated publish / retract actions. `pariwarId` is a prop (from the route) so the page
// is testable without a router.
//
// Closest precedent: `apps/admin/src/modules/news-blog/` (authored copy + a publish workflow). Do
// NOT cross-wire with it ([[project_story_validate_footguns]] UI-misattribution trap) — the two
// consoles look similar and share nothing.
//
// ── Three footguns the 10.5 review found, avoided here explicitly ────────────────────────────
//   1. a date input must never reach `new Date('')` — `toIsoOrNull` early-returns on empty/invalid;
//   2. Save must load the SERVER's response back into the editor (the server may have bumped
//      `revision` or normalised a field) — `loadIntoEditor(updated)`;
//   3. Cancel must abort the in-flight mutation — `reset()` on every mutation, then clear the editor.

import type { BannerResponse } from '@twt/contracts';
import {
  BANNER_AUDIENCE_SCOPES,
  BANNER_DISPLAY_MODES,
  BANNER_DISPLAY_STATES,
  BANNER_SEVERITIES,
  deriveBannerDisplayState,
  type BannerAudienceScope,
  type BannerDisplayMode,
  type BannerSeverity,
} from '@twt/contracts';
import type { ReactElement, ReactNode } from 'react';
import { useMemo, useRef, useState } from 'react';

import { ApiError } from '../../api/client.js';
import {
  useBanners,
  useCreateBanner,
  usePublishBanner,
  useRetractBanner,
  useUpdateBanner,
} from '../../api/hooks.js';
import {
  UNSAVED_DRAFT_ID,
  bannerErrorGuidance,
  canPublish,
  canRetract,
  displayStateLabel,
  forcesDismissible,
  isEditable,
  isTargetableAudience,
  previewClasses,
  visibilityVerdict,
  type BannerDisplayState,
  type BannerStatus,
} from './derive.js';
import { resolveEn as t } from './i18n-en.js';

export interface BannersPageProps {
  pariwarId: string;
  /** Injected clock — keeps the derived preview + verdict deterministic in tests (AC2's `now` rule). */
  now?: Date;
}

interface EditorState {
  title: string;
  body: string;
  titleHi: string;
  bodyHi: string;
  audienceScope: BannerAudienceScope;
  audienceScopeValue: string;
  validFrom: string;
  validUntil: string;
  // The CONTRACT enums, not `string` — the precedence comparator is total only over the real
  // vocabulary, and the select's `onChange` is the one place a bad value could enter.
  displayMode: BannerDisplayMode;
  dismissible: boolean;
  displayOncePerMember: boolean;
  severity: BannerSeverity;
}

const emptyEditor: EditorState = {
  title: '',
  body: '',
  titleHi: '',
  bodyHi: '',
  audienceScope: 'members-all',
  audienceScopeValue: '',
  validFrom: '',
  validUntil: '',
  displayMode: 'banner',
  dismissible: true,
  displayOncePerMember: false,
  severity: 'info',
};

/**
 * `datetime-local` → ISO, or null. NEVER constructs `new Date('')` (which is Invalid Date and
 * serialises to a throw on `.toISOString()`) — the 10.5-reviewed date footgun.
 */
function toIsoOrNull(local: string): string | null {
  if (!local || local.trim() === '') return null;
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** ISO → the `datetime-local` value shape (`YYYY-MM-DDTHH:mm`), or ''. */
function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function ErrorBanner({ error }: { error: unknown }): ReactElement | null {
  if (!error) return null;
  const code = error instanceof ApiError ? error.code : 'unknown';
  const message = error instanceof Error ? error.message : 'Something went wrong.';
  const guidance = bannerErrorGuidance(code);
  return (
    <div
      role="alert"
      data-testid="banner-error"
      data-code={code}
      className="rounded border-l-4 border-status-fail-border bg-status-fail-bg p-3 text-status-fail-fg"
    >
      <p className="font-semibold">{message}</p>
      {guidance && <p className="mt-1 text-sm">{guidance}</p>}
    </div>
  );
}

export function BannersPage({ pariwarId, now }: BannersPageProps): ReactElement {
  const [stateFilter, setStateFilter] = useState<string>('');
  const [offset, setOffset] = useState(0);
  const banners = useBanners(pariwarId, stateFilter || undefined, offset);
  const create = useCreateBanner(pariwarId);
  const update = useUpdateBanner(pariwarId);
  const publish = usePublishBanner(pariwarId);
  const retract = useRetractBanner(pariwarId);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorState>(emptyEditor);

  // Bumped on every Cancel/New so an in-flight onCreate/onSave that resolves AFTER the admin backed
  // out does not reopen the editor with stale server data — `.reset()` clears mutation STATUS, not
  // the in-flight promise, so this guard is the actual "abort" the header comment promises.
  const generation = useRef(0);

  // A stable clock for one render pass — a fresh `new Date()` per derivation would let the preview
  // and the verdict disagree about `now` within a single frame.
  const clock = useMemo(() => now ?? new Date(), [now]);

  // Memoised so the `liveBanners` memo below has a stable dependency — a fresh `?? []` literal each
  // render would invalidate it every time and re-run the verdict on every keystroke.
  const items = useMemo(() => banners.data?.items ?? [], [banners.data]);
  const selected = items.find((b) => b.banner_id === selectedId) ?? null;

  const actionError = create.error ?? update.error ?? publish.error ?? retract.error;

  // Everything currently LIVE, minus the banner being edited (a banner never competes with itself).
  const liveBanners = useMemo(
    () => items.filter((b) => b.display_state === 'live' && b.banner_id !== selectedId),
    [items, selectedId],
  );

  const validFromIso = toIsoOrNull(editor.validFrom);
  const validUntilIso = toIsoOrNull(editor.validUntil);
  const windowValid = validFromIso != null && validUntilIso != null && validUntilIso > validFromIso;

  // The AC5 verdict: computed by the SAME pure resolver the server uses, with this draft spliced
  // into the live set as if published. Null when there is nothing to compare against.
  const verdict = useMemo(() => {
    if (!validFromIso || !validUntilIso) return null;
    return visibilityVerdict(
      {
        bannerId: selected?.banner_id ?? UNSAVED_DRAFT_ID,
        title: editor.title,
        severity: editor.severity,
        displayMode: editor.displayMode,
        validFrom: new Date(validFromIso),
        validUntil: new Date(validUntilIso),
      },
      liveBanners,
      clock,
    );
  }, [selected, editor, validFromIso, validUntilIso, liveBanners, clock]);

  // The preview's display state. For a SAVED banner it is the server's own derivation (the server's
  // clock is the authority). For an UNSAVED draft it is what the state WOULD be if published now —
  // computed by the SAME `deriveBannerDisplayState` the server calls, never a hand-rolled ternary,
  // so "scheduled vs live" is visible before committing and cannot disagree with the server after.
  const previewState: BannerDisplayState = selected
    ? (selected.display_state as BannerDisplayState)
    : !validFromIso || !validUntilIso
      ? 'draft'
      : deriveBannerDisplayState(
          { status: 'published', validFrom: new Date(validFromIso), validUntil: new Date(validUntilIso) },
          clock,
        );

  /** Clears every mutation's error/status — used both on row-select and after a successful write, so
   * a stale error from a DIFFERENT banner (or the just-succeeded mutation itself) never lingers. */
  function resetMutations(): void {
    create.reset();
    update.reset();
    publish.reset();
    retract.reset();
  }

  function loadIntoEditor(b: BannerResponse): void {
    generation.current += 1;
    resetMutations();
    setSelectedId(b.banner_id);
    setEditor({
      title: b.title ?? '',
      body: b.body ?? '',
      titleHi: b.title_hi ?? '',
      bodyHi: b.body_hi ?? '',
      audienceScope: b.audience_scope,
      audienceScopeValue: b.audience_scope_value ?? '',
      validFrom: toLocalInput(b.valid_from),
      validUntil: toLocalInput(b.valid_until),
      displayMode: b.display_mode,
      dismissible: b.dismissible,
      displayOncePerMember: b.display_once_per_member,
      severity: b.severity,
    });
  }

  /**
   * Clear the editor (the 10.5-reviewed Cancel footgun). Bumps `generation` so an `onCreate`/`onSave`
   * still awaiting its `mutateAsync` from BEFORE this Cancel discards its result instead of reopening
   * the editor — `.reset()` alone only clears mutation status, it cannot cancel the in-flight promise.
   */
  function resetEditor(): void {
    generation.current += 1;
    resetMutations();
    setSelectedId(null);
    setEditor(emptyEditor);
  }

  function editorToBody() {
    return {
      title: editor.title || null,
      body: editor.body || null,
      title_hi: editor.titleHi || null,
      body_hi: editor.bodyHi || null,
      audience_scope: editor.audienceScope,
      audience_scope_value: editor.audienceScopeValue || null,
      display_mode: editor.displayMode,
      // AC4 mirrored in the UI: a popup is forced dismissible. The server 422 is the real boundary.
      dismissible: forcesDismissible(editor.displayMode) ? true : editor.dismissible,
      display_once_per_member: editor.displayOncePerMember,
      severity: editor.severity,
    };
  }

  async function onCreate(): Promise<void> {
    if (!validFromIso || !validUntilIso) return;
    const startedAt = generation.current;
    const created = await create.mutateAsync({
      ...editorToBody(),
      valid_from: validFromIso,
      valid_until: validUntilIso,
    });
    // Cancel/New (or selecting a different row) bumped `generation` while this was in flight — the
    // admin already backed out, so do not reopen the editor with the just-created row.
    if (generation.current !== startedAt) return;
    // Load the SERVER's response back — it is the authority on the stored row.
    loadIntoEditor(created);
  }

  async function onSave(): Promise<void> {
    if (!selected || !validFromIso || !validUntilIso) return;
    const startedAt = generation.current;
    const updated = await update.mutateAsync({
      bannerId: selected.banner_id,
      patch: { ...editorToBody(), valid_from: validFromIso, valid_until: validUntilIso },
    });
    if (generation.current !== startedAt) return;
    loadIntoEditor(updated);
  }

  const previewTitle = editor.title || '(untitled)';
  const previewBody = editor.body;
  const popupForced = forcesDismissible(editor.displayMode);
  const effectiveDismissible = popupForced ? true : editor.dismissible;

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4" data-testid="banners-page">
      <header>
        <h1 className="text-xl font-semibold">{t('banner.title')}</h1>
        <p className="text-sm text-gray-600">{t('banner.subtitle')}</p>
      </header>

      <ErrorBanner error={actionError} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* ── List ─────────────────────────────────────────── */}
        <section aria-label="banners" className="space-y-2">
          <div className="flex items-center gap-2">
            <label htmlFor="banner-state-filter" className="text-sm">
              Filter
            </label>
            <select
              id="banner-state-filter"
              data-testid="banner-state-filter"
              value={stateFilter}
              onChange={(e) => {
                setStateFilter(e.target.value);
                setOffset(0);
              }}
              className="rounded border px-2 py-1 text-sm"
            >
              <option value="">{t('banner.filter.all')}</option>
              {BANNER_DISPLAY_STATES.map((s) => (
                <option key={s} value={s}>
                  {displayStateLabel(s)}
                </option>
              ))}
            </select>
            <button
              type="button"
              data-testid="banner-new"
              className="ml-auto rounded bg-gray-800 px-3 py-1 text-sm text-white"
              onClick={resetEditor}
            >
              {t('banner.new')}
            </button>
          </div>

          {banners.isLoading && <p className="text-sm text-gray-500">Loading…</p>}
          {banners.isError && (
            <p className="text-sm text-status-fail-fg" data-testid="banner-list-error">
              {t('banner.list.error')}
            </p>
          )}
          {!banners.isLoading && !banners.isError && items.length === 0 && (
            <p className="text-sm text-gray-500" data-testid="banner-empty">
              {t('banner.list.empty')}
            </p>
          )}
          <ul className="divide-y rounded border" data-testid="banner-list">
            {items.map((b) => (
              <li key={b.banner_id}>
                <button
                  type="button"
                  data-testid={`banner-item-${b.banner_id}`}
                  onClick={() => loadIntoEditor(b)}
                  className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                    b.banner_id === selectedId ? 'bg-gray-100' : ''
                  }`}
                >
                  <span className="truncate">{b.title || '(untitled)'}</span>
                  <span className="shrink-0 text-xs text-gray-500">{b.display_mode}</span>
                  <span className="shrink-0 text-xs text-gray-500">{b.severity}</span>
                  <span
                    className="shrink-0 rounded bg-gray-200 px-2 py-0.5 text-xs"
                    data-testid={`banner-state-${b.banner_id}`}
                  >
                    {displayStateLabel(b.display_state as BannerDisplayState)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {/* AC1's "paginated" requirement — offset-based, driven by the server's `next_offset`. */}
          <div className="flex items-center justify-between gap-2 text-sm">
            <button
              type="button"
              data-testid="banner-page-prev"
              disabled={offset === 0}
              onClick={() => setOffset((o) => Math.max(0, o - 50))}
              className="rounded border px-2 py-1 disabled:opacity-50"
            >
              {t('banner.page.prev')}
            </button>
            <button
              type="button"
              data-testid="banner-page-next"
              disabled={!banners.data?.next_offset}
              onClick={() => {
                if (banners.data?.next_offset != null) setOffset(banners.data.next_offset);
              }}
              className="rounded border px-2 py-1 disabled:opacity-50"
            >
              {t('banner.page.next')}
            </button>
          </div>
        </section>

        {/* ── Editor + preview + actions ───────────────────── */}
        <section aria-label="editor" className="space-y-3">
          {selected && (
            <p className="text-sm">
              State:{' '}
              <strong data-testid="banner-selected-state">
                {displayStateLabel(selected.display_state as BannerDisplayState)}
              </strong>
              {selected.revision > 1 && (
                <span className="ml-2 text-xs text-gray-500" data-testid="banner-revision">
                  revision {selected.revision}
                </span>
              )}
            </p>
          )}

          <p className="text-xs text-amber-700" data-testid="banner-bilingual-hint">
            {t('banner.hint.bilingual')}
          </p>
          {selected?.status === 'published' && (
            <p className="text-xs text-amber-700" data-testid="banner-revision-hint">
              {t('banner.hint.revision')}
            </p>
          )}

          <fieldset
            disabled={selected != null && !isEditable(selected.status as BannerStatus)}
            className="space-y-2"
          >
            <Field label={t('banner.field.title')} testid="banner-title">
              <input
                className="w-full rounded border px-2 py-1"
                value={editor.title}
                onChange={(e) => setEditor((s) => ({ ...s, title: e.target.value }))}
              />
            </Field>
            <Field label={t('banner.field.body')} testid="banner-body">
              <textarea
                className="w-full rounded border px-2 py-1"
                rows={3}
                value={editor.body}
                onChange={(e) => setEditor((s) => ({ ...s, body: e.target.value }))}
              />
            </Field>
            <Field label={t('banner.field.titleHi')} testid="banner-title-hi">
              <input
                className="w-full rounded border px-2 py-1"
                value={editor.titleHi}
                onChange={(e) => setEditor((s) => ({ ...s, titleHi: e.target.value }))}
              />
            </Field>
            <Field label={t('banner.field.bodyHi')} testid="banner-body-hi">
              <textarea
                className="w-full rounded border px-2 py-1"
                rows={3}
                value={editor.bodyHi}
                onChange={(e) => setEditor((s) => ({ ...s, bodyHi: e.target.value }))}
              />
            </Field>

            <Field label={t('banner.field.audience')} testid="banner-audience">
              <select
                data-testid="banner-audience-select"
                className="w-full rounded border px-2 py-1"
                value={editor.audienceScope}
                onChange={(e) => {
                  const audienceScope = e.target.value as BannerAudienceScope;
                  setEditor((s) => ({
                    ...s,
                    audienceScope,
                    // A targetable scope (public/members-all) has no discriminator — clear any value
                    // left over from a previous state/role/cohort selection so it is never silently
                    // submitted alongside an unrelated scope.
                    audienceScopeValue: isTargetableAudience(audienceScope) ? '' : s.audienceScopeValue,
                  }));
                }}
              >
                {BANNER_AUDIENCE_SCOPES.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </Field>
            {/* Decision 4 — say out loud that this audience reaches nobody yet. */}
            {!isTargetableAudience(editor.audienceScope) && (
              <p className="text-xs text-amber-700" data-testid="banner-not-targetable">
                {t('banner.hint.notTargetable')}
              </p>
            )}
            {!isTargetableAudience(editor.audienceScope) && (
              <Field label={t('banner.field.audienceValue')} testid="banner-audience-value">
                <input
                  className="w-full rounded border px-2 py-1"
                  value={editor.audienceScopeValue}
                  onChange={(e) => setEditor((s) => ({ ...s, audienceScopeValue: e.target.value }))}
                />
              </Field>
            )}

            <div className="grid grid-cols-2 gap-2">
              <Field label={t('banner.field.validFrom')} testid="banner-valid-from">
                <input
                  type="datetime-local"
                  data-testid="banner-valid-from-input"
                  className="w-full rounded border px-2 py-1"
                  value={editor.validFrom}
                  onChange={(e) => setEditor((s) => ({ ...s, validFrom: e.target.value }))}
                />
              </Field>
              <Field label={t('banner.field.validUntil')} testid="banner-valid-until">
                <input
                  type="datetime-local"
                  data-testid="banner-valid-until-input"
                  className="w-full rounded border px-2 py-1"
                  value={editor.validUntil}
                  onChange={(e) => setEditor((s) => ({ ...s, validUntil: e.target.value }))}
                />
              </Field>
            </div>
            {validFromIso != null && validUntilIso != null && !windowValid && (
              <p className="text-xs text-status-fail-fg" data-testid="banner-window-invalid">
                {bannerErrorGuidance('banner.window_invalid')}
              </p>
            )}

            <div className="grid grid-cols-2 gap-2">
              <Field label={t('banner.field.displayMode')} testid="banner-display-mode">
                <select
                  data-testid="banner-display-mode-select"
                  className="w-full rounded border px-2 py-1"
                  value={editor.displayMode}
                  onChange={(e) => setEditor((s) => ({ ...s, displayMode: e.target.value as BannerDisplayMode }))}
                >
                  {BANNER_DISPLAY_MODES.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t('banner.field.severity')} testid="banner-severity">
                <select
                  data-testid="banner-severity-select"
                  className="w-full rounded border px-2 py-1"
                  value={editor.severity}
                  onChange={(e) => setEditor((s) => ({ ...s, severity: e.target.value as BannerSeverity }))}
                >
                  {BANNER_SEVERITIES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                data-testid="banner-dismissible"
                checked={effectiveDismissible}
                // AC4 in the UI: a popup's dismissible toggle is FORCED ON and disabled. The server
                // 422 + the DB CHECK are the real boundary; this just stops the admin trying.
                disabled={popupForced}
                onChange={(e) => setEditor((s) => ({ ...s, dismissible: e.target.checked }))}
              />
              {t('banner.field.dismissible')}
            </label>
            <p className="text-xs text-gray-600" data-testid="banner-dismissible-hint">
              {popupForced ? t('banner.hint.popupDismissible') : t('banner.hint.nonDismissibleBanner')}
            </p>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                data-testid="banner-display-once"
                checked={editor.displayOncePerMember}
                onChange={(e) => setEditor((s) => ({ ...s, displayOncePerMember: e.target.checked }))}
              />
              {t('banner.field.displayOnce')}
            </label>
          </fieldset>

          {/* ── Live preview of the member render (AC1) ─────── */}
          <div className="space-y-1" data-testid="banner-preview">
            <h2 className="text-sm font-medium">{t('banner.preview.heading')}</h2>
            <div
              className={previewClasses(editor.severity, previewState)}
              data-testid="banner-preview-surface"
              data-display-state={previewState}
              data-severity={editor.severity}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{previewTitle}</p>
                  {previewBody && <p className="text-sm">{previewBody}</p>}
                </div>
                {effectiveDismissible && (
                  <span className="shrink-0 text-xs underline" data-testid="banner-preview-dismiss">
                    {t('banner.preview.dismiss')}
                  </span>
                )}
              </div>
            </div>
            {previewState === 'scheduled' && validFromIso && (
              <p className="text-xs text-gray-600" data-testid="banner-preview-scheduled-note">
                {t('banner.preview.scheduledNote')} {new Date(validFromIso).toLocaleString()}
              </p>
            )}
          </div>

          {/* ── AC5 visibility verdict ──────────────────────── */}
          {verdict && (
            <div className="space-y-2 rounded border p-3" data-testid="banner-verdict">
              <h2 className="text-sm font-medium">{t('banner.verdict.heading')}</h2>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs text-gray-500">
                    <th className="pr-2" scope="col" />
                    <th className="pr-2" scope="col">
                      {t('banner.verdict.columnSeverity')}
                    </th>
                    <th className="pr-2" scope="col">
                      {t('banner.verdict.columnTitle')}
                    </th>
                    <th scope="col">{t('banner.verdict.columnVerdict')}</th>
                  </tr>
                </thead>
                <tbody>
                  {verdict.rows.map((row) => (
                    <tr key={row.label} data-testid={`banner-verdict-row-${row.label === 'This draft' ? 'draft' : 'winner'}`}>
                      <th scope="row" className="pr-2 font-semibold">
                        {row.label}
                      </th>
                      <td className="pr-2">{row.severity}</td>
                      <td className="pr-2 truncate">{row.title}</td>
                      <td
                        className={row.verdict === 'Visible' ? 'font-semibold' : 'font-semibold text-status-fail-fg'}
                        data-testid={`banner-verdict-${row.label === 'This draft' ? 'draft' : 'winner'}`}
                      >
                        {row.verdict}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {verdict.draftHidden && (
                <div className="space-y-1 text-sm" data-testid="banner-verdict-warning">
                  <p className="font-semibold text-status-fail-fg">{verdict.consequence}</p>
                  <p className="text-xs text-gray-600">{verdict.decidingRule}</p>
                  <p className="text-xs text-gray-600">
                    {verdict.visibleFrom
                      ? `${t('banner.verdict.visibleFrom')} ${new Date(verdict.visibleFrom).toLocaleString()}.`
                      : t('banner.verdict.neverVisible')}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Actions ─────────────────────────────────────── */}
          <div className="flex flex-wrap gap-2">
            {!selected && (
              <ActionButton testid="banner-create" onClick={onCreate} disabled={!windowValid} pending={create.isPending}>
                {t('banner.action.create')}
              </ActionButton>
            )}
            {selected && isEditable(selected.status as BannerStatus) && (
              <ActionButton testid="banner-save" onClick={onSave} disabled={!windowValid} pending={update.isPending}>
                {t('banner.action.save')}
              </ActionButton>
            )}
            {selected && canPublish(selected.status as BannerStatus) && (
              <ActionButton
                testid="banner-publish"
                onClick={() => publish.mutateAsync(selected.banner_id)}
                pending={publish.isPending}
              >
                {t('banner.action.publish')}
              </ActionButton>
            )}
            {selected && canRetract(selected.status as BannerStatus) && (
              <ActionButton
                testid="banner-retract"
                onClick={() => retract.mutateAsync(selected.banner_id)}
                pending={retract.isPending}
              >
                {t('banner.action.retract')}
              </ActionButton>
            )}
            <button
              type="button"
              data-testid="banner-cancel"
              className="rounded border px-3 py-1 text-sm"
              onClick={resetEditor}
            >
              {t('banner.action.cancel')}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({ label, testid, children }: { label: string; testid: string; children: ReactElement }): ReactElement {
  return (
    <label className="block text-sm" data-testid={`${testid}-field`}>
      <span className="mb-0.5 block font-medium">{label}</span>
      {children}
    </label>
  );
}

function ActionButton({
  testid,
  onClick,
  pending,
  disabled,
  children,
}: {
  testid: string;
  onClick: () => Promise<unknown> | void;
  pending?: boolean;
  disabled?: boolean;
  children: ReactNode;
}): ReactElement {
  return (
    <button
      type="button"
      data-testid={testid}
      disabled={pending === true || disabled === true}
      onClick={() => {
        void Promise.resolve(onClick()).catch(() => {
          /* surfaced by the mutation error banner */
        });
      }}
      className="rounded bg-blue-600 px-3 py-1 text-sm text-white disabled:opacity-50"
    >
      {children}
    </button>
  );
}
