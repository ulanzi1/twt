// Survey/Poll authoring console (Story 10.15, Task 8) — the pariwar-scoped admin surface.
//
// Composes: a derived-display-state-filtered list, the create/edit editor (`SurveyEditor`), the
// aggregate results dashboard (`SurveyResults`), and the status-gated publish / close actions.
// `pariwarId` is a prop (from the route) so the page is testable without a router.
//
// Closest precedent: `apps/admin/src/modules/banners/` (authored copy + a window + a publish
// workflow). ⛔ Do NOT cross-wire with it or with `news-blog` ([[feedback_story_validate_footguns]]
// UI-misattribution trap) — the three consoles look similar and share nothing.
//
// ── The footguns the 10.5/10.9 reviews found, avoided here explicitly ────────────────────────
//   1. a date input must never reach `new Date('')` — `toIsoOrNull` early-returns on empty/invalid;
//   2. Save must load the SERVER's response back into the editor (it may have normalised a field);
//   3. Cancel must abort the in-flight mutation — a `generation` guard, since `.reset()` clears
//      mutation STATUS but not the in-flight promise.
//
// ⚠ A survey is ADVISORY (LBD-1). The page states that where an admin can see it, and the word
// `quorum` appears nowhere in this module.

import type { SurveyResponse, SurveyDisplayState } from '@twt/contracts';
import { SURVEY_DISPLAY_STATES } from '@twt/contracts';
import type { ReactElement } from 'react';
import { useMemo, useRef, useState } from 'react';

import { ApiError, SURVEY_LIST_PAGE_SIZE } from '../../api/client.js';
import {
  useCloseSurvey,
  useCreateSurvey,
  usePublishSurvey,
  useSurveyAggregate,
  useSurveyFreeText,
  useSurveys,
  useUpdateSurvey,
} from '../../api/hooks.js';
import { SurveyEditor, emptyEditor, type EditorState } from './SurveyEditor.js';
import { SurveyResults } from './SurveyResults.js';
import {
  canClose,
  canPublish,
  displayStateClasses,
  displayStateLabel,
  editableFields,
  surveyErrorGuidance,
  type SurveyStatus,
} from './derive.js';
import { resolveEn as t } from './i18n-en.js';

export interface SurveysPageProps {
  pariwarId: string;
  /** Injected clock — keeps derivations deterministic in tests (AC2's `now` rule). */
  now?: Date;
}

/**
 * `datetime-local` → ISO, or null. NEVER constructs `new Date('')` (which is Invalid Date and throws
 * on `.toISOString()`) — the 10.5-reviewed date footgun.
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

function loadIntoEditor(row: SurveyResponse): EditorState {
  return {
    title: row.title ?? '',
    body: row.body ?? '',
    titleHi: row.title_hi ?? '',
    bodyHi: row.body_hi ?? '',
    questions: row.questions,
    audienceScope: row.audience_scope,
    audienceScopeValue: row.audience_scope_value ?? '',
    validFrom: toLocalInput(row.valid_from),
    validUntil: toLocalInput(row.valid_until),
    responseThreshold: row.response_threshold === null ? '' : String(row.response_threshold),
  };
}

function ErrorBanner({ error }: { error: unknown }): ReactElement | null {
  if (!error) return null;
  const code = error instanceof ApiError ? error.code : 'unknown';
  const message = error instanceof Error ? error.message : 'Something went wrong.';
  const guidance = surveyErrorGuidance(code);
  return (
    <div
      role="alert"
      data-testid="survey-error"
      data-code={code}
      className="rounded border-l-4 border-status-fail-border bg-status-fail-bg p-3 text-status-fail-fg"
    >
      <p className="font-semibold">{message}</p>
      {guidance && <p className="mt-1 text-sm">{guidance}</p>}
    </div>
  );
}

export function SurveysPage({ pariwarId, now }: SurveysPageProps): ReactElement {
  // [Review][Patch] — code review of 10-15-survey-poll (2026-08-17): typed as the actual union (plus
  // `''` for "all") rather than plain `string` — see the matching `client.ts`/`hooks.ts` fix.
  const [stateFilter, setStateFilter] = useState<SurveyDisplayState | ''>('');
  const [offset, setOffset] = useState(0);
  const surveys = useSurveys(pariwarId, stateFilter || undefined, offset);
  const create = useCreateSurvey(pariwarId);
  const update = useUpdateSurvey(pariwarId);
  const publish = usePublishSurvey(pariwarId);
  const closeSurvey = useCloseSurvey(pariwarId);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  // [Review][Patch] — code review of 10-15-survey-poll (2026-08-17): `selected` used to be DERIVED
  // PURELY from `items.find(...)` — the current page's rows. Changing `stateFilter`/`offset` while
  // the editor is open (both remain interactive — the list is never hidden or disabled during an
  // edit) can drop the open survey out of the current page, silently flipping `selected` to `null`
  // while `editing` stays `true`. `save()` branches on `selected` to decide UPDATE vs CREATE, so this
  // turned an admin's edit into an unwanted duplicate CREATE with no error, no warning. Caching the
  // row here (refreshed on open/save-success, cleared on cancel/new) keeps `selected` correct
  // regardless of what the list is currently showing.
  const [openedSurvey, setOpenedSurvey] = useState<SurveyResponse | null>(null);
  const [editing, setEditing] = useState(false);
  const [editor, setEditor] = useState<EditorState>(emptyEditor);
  const [openFreeTextQuestion, setOpenFreeTextQuestion] = useState<string | null>(null);
  // [Review][Patch] — code review of 10-15-survey-poll (2026-08-17): replaces the old
  // `create.error ?? update.error ?? publish.error ?? closeSurvey.error` derivation, which (a) never
  // reset `publish`/`closeSurvey` on Cancel/New/opening a different survey — a failed publish on one
  // row left a permanent banner that outlived it — and (b) used fixed `??` precedence, so a NEWER
  // publish/close failure was hidden behind an OLDER unset-but-still-truthy create/update error.
  // Also carries pure client-side validation failures (empty window, bad threshold — see `save()`)
  // that never reach a mutation at all.
  const [actionError, setActionError] = useState<unknown>(null);

  // Bumped on every Cancel/New so an in-flight create/save resolving AFTER the admin backed out does
  // not reopen the editor with stale server data — `.reset()` clears mutation STATUS, not the promise.
  const generation = useRef(0);

  // A stable clock for one render pass — a fresh `new Date()` per derivation would let two parts of
  // the same frame disagree about `now`. ⚠ [Review][Patch] — code review of 10-15-survey-poll
  // (2026-08-17): NOT currently consumed — `display_state` on each row is SERVER-derived (see the
  // list render below), so this component does no client-side date derivation of its own. Kept (not
  // removed) because `now` is a public prop other tests already inject for determinism symmetry with
  // sibling pages; wire it to a future client-side derivation if one is added here, rather than
  // reading this comment as proof one already exists.
  const clock = useMemo(() => now ?? new Date(), [now]);
  void clock;

  const items = useMemo(() => surveys.data?.items ?? [], [surveys.data]);
  const selected = items.find((s) => s.survey_id === selectedId) ?? openedSurvey;

  // ⚠ Both gated on `selectedId` — the free-text read writes a `survey.responses_viewed` audit line
  // server-side, so firing it speculatively would record an admin as having viewed responses they
  // never asked to see.
  // [Review][Patch] — code review of 10-15-survey-poll (2026-08-17): the aggregate read is ALSO
  // gated off for a `draft` — a survey that has never been published has no responses, so opening a
  // brand-new draft used to fire a GET that only ever wastes a request or surfaces a spurious error
  // state for a survey nobody has answered yet.
  const aggregateSurveyId = selected && selected.status !== 'draft' ? selectedId : null;
  const aggregate = useSurveyAggregate(pariwarId, aggregateSurveyId);
  const freeText = useSurveyFreeText(pariwarId, selectedId, openFreeTextQuestion);

  const startNew = (): void => {
    generation.current += 1;
    setSelectedId(null);
    setOpenedSurvey(null);
    setEditor(emptyEditor);
    setEditing(true);
    setOpenFreeTextQuestion(null);
    setActionError(null);
    create.reset();
    update.reset();
    publish.reset();
    closeSurvey.reset();
  };

  const cancel = (): void => {
    generation.current += 1;
    setEditing(false);
    setOpenedSurvey(null);
    setEditor(emptyEditor);
    setActionError(null);
    create.reset();
    update.reset();
  };

  const openSurvey = (row: SurveyResponse): void => {
    generation.current += 1;
    setSelectedId(row.survey_id);
    setOpenedSurvey(row);
    setEditor(loadIntoEditor(row));
    setEditing(true);
    setOpenFreeTextQuestion(null);
    setActionError(null);
    publish.reset();
    closeSurvey.reset();
  };

  const save = (): void => {
    const gen = generation.current;
    setActionError(null);
    const validFrom = toIsoOrNull(editor.validFrom);
    const validUntil = toIsoOrNull(editor.validUntil);
    // [Review][Patch] — code review of 10-15-survey-poll (2026-08-17): used to silently `return` here
    // with zero feedback — Save read as a broken button rather than a validation failure.
    if (!validFrom || !validUntil) {
      setActionError(new Error(t('survey.error.windowRequired')));
      return;
    }
    let threshold: number | null = null;
    if (editor.responseThreshold.trim() !== '') {
      const n = Number(editor.responseThreshold);
      // [Review][Patch] — code review of 10-15-survey-poll (2026-08-17): `Number('abc')` is `NaN`,
      // which `JSON.stringify` silently drops to `null` — a mistyped threshold was persisted as "no
      // threshold" with no error and no indication the input was discarded.
      if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) {
        setActionError(new Error(t('survey.error.thresholdInvalid')));
        return;
      }
      threshold = n;
    }
    // [Review][Patch] — code review of 10-15-survey-poll (2026-08-17): `audience_scope_value` is now
    // ALWAYS sent explicitly (`null` when the scope doesn't use one) instead of omitted for a non-
    // `state` scope — an omitted key left a STALE value on the stored row from a prior `state` scope,
    // which the server's own merged-state guard now rejects, making this edit unreachable otherwise.
    const audienceScopeValue = editor.audienceScope === 'state' ? editor.audienceScopeValue : null;

    if (selected) {
      // ⭐ On a PUBLISHED survey send ONLY `valid_until` — the LBD-5 freeze. Sending the whole row
      // back would 409 on every frozen field even when nothing changed, because the server compares
      // REQUESTED KEYS rather than resulting values (a deliberate choice: diff-based tolerance would
      // let a whole-row PUT silently "succeed" at editing a published questionnaire).
      const patch =
        editableFields(selected.status as SurveyStatus) === 'valid-until-only'
          ? { valid_until: validUntil }
          : {
              title: editor.title,
              body: editor.body,
              title_hi: editor.titleHi,
              body_hi: editor.bodyHi,
              questions: editor.questions,
              audience_scope: editor.audienceScope,
              audience_scope_value: audienceScopeValue,
              valid_from: validFrom,
              valid_until: validUntil,
              response_threshold: threshold,
            };
      update.mutate(
        { surveyId: selected.survey_id, patch },
        {
          onSuccess: (updated) => {
            if (generation.current !== gen) return; // the admin backed out mid-flight.
            setOpenedSurvey(updated); // keep the `selected` cache (see its doc block) in sync too.
            setEditor(loadIntoEditor(updated)); // reload the SERVER's row — it may have normalised.
          },
          onError: (err) => setActionError(err),
        },
      );
      return;
    }

    create.mutate(
      {
        title: editor.title,
        body: editor.body,
        title_hi: editor.titleHi,
        body_hi: editor.bodyHi,
        questions: editor.questions,
        audience_scope: editor.audienceScope,
        audience_scope_value: audienceScopeValue,
        valid_from: validFrom,
        valid_until: validUntil,
        response_threshold: threshold,
      },
      {
        onSuccess: (created) => {
          if (generation.current !== gen) return;
          setSelectedId(created.survey_id);
          setOpenedSurvey(created); // populates the `selected` cache (see its doc block above).
          setEditor(loadIntoEditor(created));
        },
        onError: (err) => setActionError(err),
      },
    );
  };

  return (
    <div data-testid="surveys-page">
      <h1>{t('survey.title')}</h1>
      <p>{t('survey.subtitle')}</p>
      {/* ⭐ LBD-1, on the console's own front page. */}
      <p data-testid="surveys-advisory-notice">{t('survey.advisoryNotice')}</p>

      <ErrorBanner error={actionError} />

      <div>
        <label>
          <span>{t('survey.filter.all')}</span>
          <select
            value={stateFilter}
            onChange={(e) => {
              // Safe: the only values a native <select> can produce here are `''` and the
              // `SURVEY_DISPLAY_STATES` this same element renders as its <option>s.
              setStateFilter(e.target.value as SurveyDisplayState | '');
              setOffset(0);
            }}
            data-testid="survey-state-filter"
          >
            <option value="">{t('survey.filter.all')}</option>
            {SURVEY_DISPLAY_STATES.map((s) => (
              <option key={s} value={s}>
                {displayStateLabel(s)}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={startNew} data-testid="survey-new">
          {t('survey.new')}
        </button>
      </div>

      {surveys.isError && <p role="alert" data-testid="surveys-list-error">{t('survey.list.error')}</p>}
      {!surveys.isLoading && !surveys.isError && items.length === 0 && (
        <p data-testid="surveys-list-empty">{t('survey.list.empty')}</p>
      )}

      <ul data-testid="surveys-list">
        {items.map((row) => (
          <li key={row.survey_id} data-testid={`survey-row-${row.survey_id}`}>
            <button type="button" onClick={() => openSurvey(row)}>
              {row.title ?? row.survey_id}
            </button>
            <span className={displayStateClasses(row.display_state as SurveyDisplayState)}>
              {displayStateLabel(row.display_state as SurveyDisplayState)}
            </span>
            {canPublish(row.status as SurveyStatus) && (
              <button
                type="button"
                // [Review][Patch] — code review of 10-15-survey-poll (2026-08-17): disabled while
                // in flight (a double-click fired duplicate publish requests) and now sets
                // `actionError` explicitly on failure via `onError`, instead of relying on the old
                // fixed `??` precedence that could hide it behind a stale create/update error.
                disabled={publish.isPending}
                onClick={() => publish.mutate(row.survey_id, { onError: (err) => setActionError(err) })}
                data-testid={`survey-publish-${row.survey_id}`}
              >
                {t('survey.action.publish')}
              </button>
            )}
            {canClose(row.status as SurveyStatus) && (
              <button
                type="button"
                disabled={closeSurvey.isPending}
                onClick={() => closeSurvey.mutate(row.survey_id, { onError: (err) => setActionError(err) })}
                data-testid={`survey-close-${row.survey_id}`}
              >
                {t('survey.action.close')}
              </button>
            )}
          </li>
        ))}
      </ul>

      <div>
        <button
          type="button"
          disabled={offset === 0}
          onClick={() => setOffset(Math.max(0, offset - SURVEY_LIST_PAGE_SIZE))}
        >
          {t('survey.page.prev')}
        </button>
        <button
          type="button"
          disabled={surveys.data?.next_offset == null}
          onClick={() => setOffset(surveys.data?.next_offset ?? offset)}
        >
          {t('survey.page.next')}
        </button>
      </div>

      {editing && (
        <section data-testid="survey-editor-panel">
          <SurveyEditor
            editor={editor}
            onChange={setEditor}
            status={selected ? (selected.status as SurveyStatus) : null}
          />
          <p className="text-sm">{t('survey.hint.author')}</p>
          <p className="text-sm">{t('survey.hint.oneResponse')}</p>
          <button
            type="button"
            onClick={save}
            // [Review][Patch] — code review of 10-15-survey-poll (2026-08-17): disabled while a
            // create/update is in flight (a double-click fired duplicate requests), AND for a
            // `closed` (terminal) survey — every INPUT is already disabled there (`allDisabled` in
            // `SurveyEditor`, per its own stated design: "an editor that accepts input it KNOWS will
            // be rejected is a worse explanation than a disabled field"), so the action button
            // should read the same way rather than staying clickable over an effectively no-op patch.
            disabled={
              create.isPending ||
              update.isPending ||
              (selected != null && editableFields(selected.status as SurveyStatus) === 'none')
            }
            data-testid="survey-save"
          >
            {selected ? t('survey.action.save') : t('survey.action.create')}
          </button>
          <button type="button" onClick={cancel} data-testid="survey-cancel">
            {t('survey.action.cancel')}
          </button>
        </section>
      )}

      {selected && (
        <SurveyResults
          questions={selected.questions}
          aggregate={aggregate.data}
          isLoading={aggregate.isLoading}
          isError={aggregate.isError}
          freeText={{ questionId: openFreeTextQuestion, data: freeText.data, isLoading: freeText.isLoading }}
          onToggleFreeText={setOpenFreeTextQuestion}
        />
      )}
    </div>
  );
}
