// News/Blog authoring console (Story 10.5, Task 7) — the pariwar-scoped admin surface.
//
// Composes the authoring workflow: a status-filtered post list, a create/edit draft editor
// (title/body + Hindi, audience + selector, channels, schedule), and the status-gated actions
// (submit → approve(+sign-off) → schedule / publish). The author≠reviewer identity rule is enforced
// server-side (403); the editor surfaces it as a hint. `pariwarId` is a prop (from the route) so the
// page is testable without a router. Closest precedent: `niyamavali-admin` (authored copy + review/
// publish workflow); do NOT cross it with an unrelated module ([[project_story_validate_footguns]]).

import { NEWS_AUDIENCE_SCOPES, NEWS_CHANNELS, NEWS_POST_STATUSES } from '@twt/contracts';
import type { NewsPostResponse } from '@twt/contracts';
import type { ReactElement } from 'react';
import { useState } from 'react';

import { ApiError } from '../../api/client.js';
import {
  useApproveNewsPost,
  useCreateNewsDraft,
  useNewsPosts,
  usePublishNewsPost,
  useScheduleNewsPost,
  useSubmitNewsPost,
  useUpdateNewsDraft,
} from '../../api/hooks.js';
import {
  canApprove,
  canPublish,
  canSchedule,
  canSubmit,
  isEditable,
  newsErrorGuidance,
  requiresHindi,
  statusLabel,
  type NewsPostStatus,
} from './derive.js';
import { resolveEn as t } from './i18n-en.js';

export interface NewsPageProps {
  pariwarId: string;
}

interface EditorState {
  title: string;
  bodyMarkdown: string;
  titleHi: string;
  bodyMarkdownHi: string;
  audienceScope: string;
  audienceScopeValue: string;
  channels: string[];
  scheduledPublishAt: string;
}

const emptyEditor: EditorState = {
  title: '',
  bodyMarkdown: '',
  titleHi: '',
  bodyMarkdownHi: '',
  audienceScope: 'members-all',
  audienceScopeValue: '',
  channels: ['push'],
  scheduledPublishAt: '',
};

function ErrorBanner({ error }: { error: unknown }): ReactElement | null {
  if (!error) return null;
  const code = error instanceof ApiError ? error.code : 'unknown';
  const message = error instanceof Error ? error.message : 'Something went wrong.';
  const guidance = newsErrorGuidance(code);
  return (
    <div
      role="alert"
      data-testid="news-error"
      data-code={code}
      className="rounded border-l-4 border-status-fail-border bg-status-fail-bg p-3 text-status-fail-fg"
    >
      <p className="font-semibold">{message}</p>
      {guidance && <p className="mt-1 text-sm">{guidance}</p>}
    </div>
  );
}

export function NewsPage({ pariwarId }: NewsPageProps): ReactElement {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const posts = useNewsPosts(pariwarId, statusFilter || undefined);
  const create = useCreateNewsDraft(pariwarId);
  const update = useUpdateNewsDraft(pariwarId);
  const submit = useSubmitNewsPost(pariwarId);
  const approve = useApproveNewsPost(pariwarId);
  const schedule = useScheduleNewsPost(pariwarId);
  const publish = usePublishNewsPost(pariwarId);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorState>(emptyEditor);
  const [reviewerId, setReviewerId] = useState<string>('');

  const items = posts.data?.items ?? [];
  const selected = items.find((p) => p.post_id === selectedId) ?? null;

  const actionError =
    create.error ?? update.error ?? submit.error ?? approve.error ?? schedule.error ?? publish.error;

  function loadIntoEditor(p: NewsPostResponse): void {
    setSelectedId(p.post_id);
    setEditor({
      title: p.title,
      bodyMarkdown: p.body_markdown,
      titleHi: p.title_hi ?? '',
      bodyMarkdownHi: p.body_markdown_hi ?? '',
      audienceScope: p.audience_scope,
      audienceScopeValue: p.audience_scope_value ?? '',
      channels: p.channels,
      scheduledPublishAt: p.scheduled_publish_at ?? '',
    });
  }

  function editorToBody() {
    return {
      title: editor.title,
      body_markdown: editor.bodyMarkdown,
      title_hi: editor.titleHi || null,
      body_markdown_hi: editor.bodyMarkdownHi || null,
      audience_scope: editor.audienceScope as (typeof NEWS_AUDIENCE_SCOPES)[number],
      audience_scope_value: editor.audienceScopeValue || null,
      channels: editor.channels as (typeof NEWS_CHANNELS)[number][],
      scheduled_publish_at: editor.scheduledPublishAt || null,
    };
  }

  async function onCreate(): Promise<void> {
    const created = await create.mutateAsync(editorToBody());
    loadIntoEditor(created);
  }

  async function onSave(): Promise<void> {
    if (!selected) return;
    const updated = await update.mutateAsync({ postId: selected.post_id, patch: editorToBody() });
    loadIntoEditor(updated);
  }

  async function onSchedule(): Promise<void> {
    if (!selected || editor.scheduledPublishAt === '') return;
    await schedule.mutateAsync({ postId: selected.post_id, scheduledPublishAt: new Date(editor.scheduledPublishAt).toISOString() });
  }

  function toggleChannel(ch: string): void {
    setEditor((e) => ({
      ...e,
      channels: e.channels.includes(ch) ? e.channels.filter((c) => c !== ch) : [...e.channels, ch],
    }));
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4" data-testid="news-page">
      <header>
        <h1 className="text-xl font-semibold">{t('news.title')}</h1>
        <p className="text-sm text-gray-600">{t('news.subtitle')}</p>
      </header>

      <ErrorBanner error={actionError} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* ── List ─────────────────────────────────────────── */}
        <section aria-label="posts" className="space-y-2">
          <div className="flex items-center gap-2">
            <label htmlFor="news-status-filter" className="text-sm">
              Filter
            </label>
            <select
              id="news-status-filter"
              data-testid="news-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded border px-2 py-1 text-sm"
            >
              <option value="">{t('news.filter.all')}</option>
              {NEWS_POST_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {statusLabel(s as NewsPostStatus)}
                </option>
              ))}
            </select>
            <button
              type="button"
              data-testid="news-new"
              className="ml-auto rounded bg-gray-800 px-3 py-1 text-sm text-white"
              onClick={() => {
                setSelectedId(null);
                setEditor(emptyEditor);
              }}
            >
              {t('news.new')}
            </button>
          </div>

          {posts.isLoading && <p className="text-sm text-gray-500">Loading…</p>}
          {!posts.isLoading && items.length === 0 && (
            <p className="text-sm text-gray-500" data-testid="news-empty">
              {t('news.list.empty')}
            </p>
          )}
          <ul className="divide-y rounded border" data-testid="news-list">
            {items.map((p) => (
              <li key={p.post_id}>
                <button
                  type="button"
                  data-testid={`news-item-${p.post_id}`}
                  onClick={() => loadIntoEditor(p)}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                    p.post_id === selectedId ? 'bg-gray-100' : ''
                  }`}
                >
                  <span className="truncate">{p.title || '(untitled)'}</span>
                  <span className="ml-2 shrink-0 rounded bg-gray-200 px-2 py-0.5 text-xs" data-testid={`news-status-${p.post_id}`}>
                    {statusLabel(p.status as NewsPostStatus)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        {/* ── Editor + actions ─────────────────────────────── */}
        <section aria-label="editor" className="space-y-3">
          {selected && (
            <p className="text-sm">
              Status: <strong data-testid="news-selected-status">{statusLabel(selected.status as NewsPostStatus)}</strong>
            </p>
          )}
          {requiresHindi(editor.audienceScope) && (
            <p className="text-xs text-amber-700" data-testid="news-bilingual-hint">
              {t('news.hint.bilingual')}
            </p>
          )}

          <fieldset disabled={selected != null && !isEditable(selected.status as NewsPostStatus)} className="space-y-2">
            <Field label={t('news.field.title')} testid="news-title">
              <input className="w-full rounded border px-2 py-1" value={editor.title} onChange={(e) => setEditor((s) => ({ ...s, title: e.target.value }))} />
            </Field>
            <Field label={t('news.field.body')} testid="news-body">
              <textarea className="w-full rounded border px-2 py-1" rows={4} value={editor.bodyMarkdown} onChange={(e) => setEditor((s) => ({ ...s, bodyMarkdown: e.target.value }))} />
            </Field>
            <Field label={t('news.field.titleHi')} testid="news-title-hi">
              <input className="w-full rounded border px-2 py-1" value={editor.titleHi} onChange={(e) => setEditor((s) => ({ ...s, titleHi: e.target.value }))} />
            </Field>
            <Field label={t('news.field.bodyHi')} testid="news-body-hi">
              <textarea className="w-full rounded border px-2 py-1" rows={3} value={editor.bodyMarkdownHi} onChange={(e) => setEditor((s) => ({ ...s, bodyMarkdownHi: e.target.value }))} />
            </Field>
            <Field label={t('news.field.audience')} testid="news-audience">
              <select className="w-full rounded border px-2 py-1" value={editor.audienceScope} onChange={(e) => setEditor((s) => ({ ...s, audienceScope: e.target.value }))}>
                {NEWS_AUDIENCE_SCOPES.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </Field>
            {['state', 'role', 'cohort'].includes(editor.audienceScope) && (
              <Field label={t('news.field.audienceValue')} testid="news-audience-value">
                <input className="w-full rounded border px-2 py-1" value={editor.audienceScopeValue} onChange={(e) => setEditor((s) => ({ ...s, audienceScopeValue: e.target.value }))} />
              </Field>
            )}
            <fieldset className="space-y-1">
              <legend className="text-sm font-medium">{t('news.field.channels')}</legend>
              <div className="flex flex-wrap gap-3">
                {NEWS_CHANNELS.map((ch) => (
                  <label key={ch} className="flex items-center gap-1 text-sm">
                    <input type="checkbox" data-testid={`news-channel-${ch}`} checked={editor.channels.includes(ch)} onChange={() => toggleChannel(ch)} />
                    {ch}
                  </label>
                ))}
              </div>
            </fieldset>
          </fieldset>

          <div className="flex flex-wrap gap-2">
            {!selected && (
              <ActionButton testid="news-create" onClick={onCreate} pending={create.isPending}>
                {t('news.action.create')}
              </ActionButton>
            )}
            {selected && isEditable(selected.status as NewsPostStatus) && (
              <ActionButton testid="news-save" onClick={onSave} pending={update.isPending}>
                {t('news.action.save')}
              </ActionButton>
            )}
          </div>

          {/* Status-gated workflow actions */}
          {selected && (
            <div className="space-y-2 rounded border p-3">
              {canSubmit(selected.status as NewsPostStatus) && (
                <div className="flex items-end gap-2">
                  <Field label={t('news.field.reviewer')} testid="news-reviewer">
                    <input className="w-full rounded border px-2 py-1" placeholder="reviewer user id" value={reviewerId} onChange={(e) => setReviewerId(e.target.value)} />
                  </Field>
                  <ActionButton testid="news-submit" onClick={() => submit.mutateAsync({ postId: selected.post_id, reviewerId })} pending={submit.isPending}>
                    {t('news.action.submit')}
                  </ActionButton>
                </div>
              )}
              {canApprove(selected.status as NewsPostStatus) && (
                <ActionButton testid="news-approve" onClick={() => approve.mutateAsync(selected.post_id)} pending={approve.isPending}>
                  {t('news.action.approve')}
                </ActionButton>
              )}
              {canSchedule(selected.status as NewsPostStatus) && (
                <div className="flex items-end gap-2">
                  <Field label={t('news.field.schedule')} testid="news-schedule-at">
                    <input type="datetime-local" required className="rounded border px-2 py-1" value={editor.scheduledPublishAt} onChange={(e) => setEditor((s) => ({ ...s, scheduledPublishAt: e.target.value }))} />
                  </Field>
                  <ActionButton testid="news-schedule" onClick={onSchedule} pending={schedule.isPending || editor.scheduledPublishAt === ''}>
                    {t('news.action.schedule')}
                  </ActionButton>
                </div>
              )}
              {canPublish(selected.status as NewsPostStatus) && (
                <ActionButton testid="news-publish" onClick={() => publish.mutateAsync(selected.post_id)} pending={publish.isPending}>
                  {t('news.action.publish')}
                </ActionButton>
              )}
            </div>
          )}
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
  children,
}: {
  testid: string;
  onClick: () => Promise<unknown> | void;
  pending?: boolean;
  children: React.ReactNode;
}): ReactElement {
  return (
    <button
      type="button"
      data-testid={testid}
      disabled={pending}
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
