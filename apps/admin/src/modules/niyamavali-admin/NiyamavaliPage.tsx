// Niyamavali amendment-workflow page (Story 2.4, AC1/AC4) — the trustee surface.
//
// Composes the five AC1 capabilities: (a) create / (b) edit draft, (c) preview the
// diff, (d) submit for review → non-author sign-off, (e) publish. The publish/sign-off
// 409s are surfaced with the resolution path (AC4) via `publishErrorGuidance`.
//
// `pariwarId` is a prop (from the route) so the page is testable without a router. The
// clause-payload content authored here is member-visible (destined for the 2.5 public
// render) — the admin CHROME is English-primary (Story 2.1 surface classification).

import type { ReactElement } from 'react';
import { useState } from 'react';

import { ApiError } from '../../api/client.js';
import {
  useCreateDraft,
  useDraftDiff,
  useNiyamavaliClauses,
  useNiyamavaliDrafts,
  usePublishDraft,
  useSignoffDraft,
  useSubmitForReview,
  useUpdateDraft,
} from '../../api/hooks.js';
import { DiffPanel } from './DiffPanel.js';
import { DraftForm } from './DraftForm.js';
import {
  awaitsSignoff,
  draftStatusLabel,
  isEditable,
  isPublishable,
  publishErrorGuidance,
} from './derive.js';

export interface NiyamavaliPageProps {
  pariwarId: string;
}

/** Surface an ApiError (or unknown) as a guided, non-author-friendly message (AC4). */
function ErrorBanner({ error }: { error: unknown }): ReactElement | null {
  if (!error) return null;
  const code = error instanceof ApiError ? error.code : 'unknown';
  const message = error instanceof Error ? error.message : 'Something went wrong.';
  const guidance = publishErrorGuidance(code);
  return (
    <div
      role="alert"
      data-testid="workflow-error"
      data-code={code}
      className="rounded border-l-4 border-status-fail-border bg-status-fail-bg p-3 text-status-fail-fg"
    >
      <p className="font-semibold">{message}</p>
      {guidance && <p className="mt-1 text-sm">{guidance}</p>}
    </div>
  );
}

export function NiyamavaliPage({ pariwarId }: NiyamavaliPageProps): ReactElement {
  const clauses = useNiyamavaliClauses(pariwarId);
  const drafts = useNiyamavaliDrafts(pariwarId);
  const createDraft = useCreateDraft(pariwarId);
  const updateDraft = useUpdateDraft(pariwarId);
  const submit = useSubmitForReview(pariwarId);
  const signoff = useSignoffDraft(pariwarId);
  const publish = usePublishDraft(pariwarId);

  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const diff = useDraftDiff(pariwarId, selectedDraftId);

  const editingDraft = drafts.data?.find((d) => d.draftId === editingDraftId) ?? null;
  const workflowError =
    publish.error ?? signoff.error ?? submit.error ?? updateDraft.error ?? createDraft.error;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-lg font-semibold">Niyamavali — amendment workflow</h1>
        <p className="text-sm opacity-70">
          Author, review, and publish clause amendments. Publishing is audit-logged and requires a
          non-author tone-review sign-off.
        </p>
      </header>

      <ErrorBanner error={workflowError} />

      <section aria-label="Author" className="rounded border p-4">
        <DraftForm
          pending={createDraft.isPending || updateDraft.isPending}
          editingDraft={editingDraft}
          onSubmit={(body) => createDraft.mutate(body)}
          onUpdate={(patch) => {
            if (!editingDraft) return;
            updateDraft.mutate(
              { draftId: editingDraft.draftId, patch },
              { onSuccess: () => setEditingDraftId(null) },
            );
          }}
          onCancelEdit={() => setEditingDraftId(null)}
        />
      </section>

      <section aria-label="Drafts" className="rounded border p-4">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide opacity-70">Drafts</h2>
        {drafts.isLoading ? (
          <p role="status">Loading drafts…</p>
        ) : (drafts.data?.length ?? 0) === 0 ? (
          <p className="text-sm opacity-70">No drafts yet.</p>
        ) : (
          <ul className="flex flex-col gap-2" data-testid="draft-list">
            {drafts.data!.map((d) => (
              <li
                key={d.draftId}
                className="flex flex-wrap items-center gap-2 rounded border px-3 py-2"
              >
                <span className="font-mono text-sm">{d.clauseId}</span>
                <span className="rounded bg-black/5 px-2 py-0.5 text-xs">
                  {draftStatusLabel(d.status)}
                </span>
                <span className="text-xs opacity-60">{d.operation}</span>
                <span className="ml-auto flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded border px-2 py-1 text-sm"
                    onClick={() => setSelectedDraftId(d.draftId)}
                  >
                    Preview diff
                  </button>
                  {isEditable(d.status) && (
                    <button
                      type="button"
                      className="rounded border px-2 py-1 text-sm"
                      disabled={updateDraft.isPending}
                      onClick={() => setEditingDraftId(d.draftId)}
                    >
                      Edit
                    </button>
                  )}
                  {d.status === 'draft' && (
                    <button
                      type="button"
                      className="rounded border px-2 py-1 text-sm"
                      disabled={submit.isPending}
                      onClick={() => submit.mutate(d.draftId)}
                    >
                      Submit for review
                    </button>
                  )}
                  {awaitsSignoff(d.status) && (
                    <button
                      type="button"
                      className="rounded border px-2 py-1 text-sm"
                      disabled={signoff.isPending}
                      onClick={() => signoff.mutate(d.draftId)}
                      title="Only a non-author reviewer may sign off"
                    >
                      Sign off (reviewer)
                    </button>
                  )}
                  <button
                    type="button"
                    className="rounded bg-black px-2 py-1 text-sm text-white disabled:opacity-50"
                    disabled={publish.isPending || !isPublishable(d.status)}
                    onClick={() => publish.mutate(d.draftId)}
                  >
                    Publish
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}

        {selectedDraftId && (
          <div className="mt-4 rounded border p-3" data-testid="selected-diff">
            {diff.isLoading ? (
              <p role="status">Loading diff…</p>
            ) : diff.data ? (
              <DiffPanel diff={diff.data} />
            ) : (
              <p role="status">No diff available.</p>
            )}
          </div>
        )}
      </section>

      <section aria-label="Registry" className="rounded border p-4">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide opacity-70">
          Published registry
        </h2>
        {clauses.isLoading ? (
          <p role="status">Loading clauses…</p>
        ) : (clauses.data?.length ?? 0) === 0 ? (
          <p className="text-sm opacity-70">No published clauses yet.</p>
        ) : (
          <ul className="flex flex-col gap-1" data-testid="clause-list">
            {clauses.data!.map((c) => (
              <li key={c.clauseVersionId} className="flex items-center gap-2 text-sm">
                <span className="font-mono">{c.clauseId}</span>
                <span className="opacity-60">v{c.version}</span>
                {c.deprecatedAt && <span className="text-xs text-status-warn-fg">deprecated</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
