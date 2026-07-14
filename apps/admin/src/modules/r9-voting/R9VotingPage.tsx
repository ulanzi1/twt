// R9 special-case voting page — Story 6.14 (Task 9; AC1/AC8). The [SURFACE] demoable.
//
// The R9 panel shell: the voting queue (claims 6.13 routed to R9), a selectable per-case panel
// (<R9CasePanel>), and a "R9 votes by Trustee" review lookup (AC8). `pariwarId` is a prop (from the route)
// so the page is testable without a router. NO client-side grant gate — claim.r9_vote is a per-Pariwar
// grant, so the REAL boundary is the server's requirePermissionHook (+ requireStepUp on finalize); a
// non-holder sees the API 403/404 surfaced here.

import type { ReactElement } from 'react';
import { useState } from 'react';

import { errorMessage } from '../../api/client.js';
import { useR9Queue, useR9VotesByTrustee } from '../../api/hooks.js';
import { R9CasePanel } from './R9CasePanel.js';

export interface R9VotingPageProps {
  pariwarId: string;
}

/** A loose (case-insensitive) UUID-shape check — a client-side nicety mirroring the contract's
 *  `z.string().uuid()` on `actorId`; the server remains the authoritative validator. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function R9VotingPage({ pariwarId }: R9VotingPageProps): ReactElement {
  const queue = useR9Queue(pariwarId);
  const [selected, setSelected] = useState<string | null>(null);

  // Votes-by-trustee lookup.
  const [actorInput, setActorInput] = useState('');
  const [actorQuery, setActorQuery] = useState<string | null>(null);
  const votes = useR9VotesByTrustee(pariwarId, actorQuery);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-lg font-semibold">R9 special-case voting</h1>
        <p className="text-sm opacity-70">
          Claims routed to R9 for special-case panel voting (suicide / murder / multiple deaths / nominee
          accused). Open a panel, cast votes against the applicable rule, and finalize the outcome — a
          step-up-attested action. An approved outcome rejoins the ordinary cycle-freeze commit.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <section aria-label="R9 voting queue" className="rounded border p-4">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide opacity-70">
            Queue ({queue.data?.items.length ?? 0})
          </h2>
          {queue.isLoading ? (
            <p role="status">Loading queue…</p>
          ) : queue.isError ? (
            <p role="alert" className="text-status-fail-fg">{errorMessage(queue.error)}</p>
          ) : (queue.data?.items.length ?? 0) === 0 ? (
            <p className="text-sm opacity-60">No claims routed to R9 voting.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {queue.data!.items.map((i) => (
                <li key={i.claim_case_id}>
                  <button
                    type="button"
                    className={`w-full rounded border p-2 text-left text-xs ${
                      selected === i.claim_case_id ? 'border-black' : 'opacity-80'
                    }`}
                    onClick={() => setSelected(i.claim_case_id)}
                  >
                    <div className="font-mono">{i.claim_case_id}</div>
                    <div className="opacity-70">
                      deceased member <code>{i.deceased_member_id}</code>
                    </div>
                    <div className="opacity-70">
                      routed by {i.routing_actor_display}
                      {i.routing_reason_code ? ` (${i.routing_reason_code})` : ''} ·{' '}
                      {i.session_open ? 'session open' : 'no session'}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div>
          {selected ? (
            // Keyed by claimCaseId — remounts the panel (fresh form state) on every queue-selection change
            // rather than reusing the instance and leaking rationale/roster/step-up state across claims.
            <R9CasePanel key={selected} pariwarId={pariwarId} claimCaseId={selected} />
          ) : (
            <p className="rounded border p-4 text-sm opacity-60">Select a claim from the queue to open its panel.</p>
          )}
        </div>
      </div>

      <section aria-label="R9 votes by trustee" className="rounded border p-4">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide opacity-70">R9 votes by trustee</h2>
        <p className="mb-2 text-xs opacity-60">
          Every R9 vote an actor cast in the last 180 days (live and revised/cancelled), each bound to its
          session, panel, and rule version.
        </p>
        <div className="mb-2 flex items-end gap-2">
          <label className="flex flex-col text-xs">
            <span className="opacity-70">Trustee actor id</span>
            <input
              className="rounded border px-2 py-1 font-mono text-xs"
              value={actorInput}
              onChange={(e) => setActorInput(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="rounded border px-3 py-1 text-sm disabled:opacity-50"
            disabled={!UUID_RE.test(actorInput.trim())}
            onClick={() => setActorQuery(actorInput.trim())}
          >
            Look up
          </button>
        </div>
        {actorQuery === null ? (
          <p className="text-sm opacity-60">Enter an actor id and look up.</p>
        ) : votes.isLoading ? (
          <p role="status">Loading…</p>
        ) : votes.isError ? (
          <p role="alert" className="text-status-fail-fg">{errorMessage(votes.error)}</p>
        ) : votes.data ? (
          votes.data.votes.length === 0 ? (
            <p className="text-sm opacity-60">No R9 votes in the window.</p>
          ) : (
            <ul className="flex flex-col gap-1 text-xs">
              {votes.data.votes.map((v) => (
                <li key={v.vote_id} className="rounded border p-2">
                  <strong>{v.vote}</strong> on <code>{v.rule_code}</code> ({v.voting_requirement}){' '}
                  <span className="opacity-50">({new Date(v.cast_at).toLocaleString()})</span>
                  {v.superseded_at ? <span className="text-status-warn-fg"> · superseded</span> : null}
                  <div className="opacity-70">
                    claim <code>{v.claim_case_id}</code> · clause <code>{v.clause_id}</code> · outcome{' '}
                    {v.session_outcome ?? 'open'} · clause version <code className="opacity-60">{v.clause_version_id}</code>
                  </div>
                  <div className="opacity-70">panel: {v.panel_actor_ids.join(', ')}</div>
                  <div className="opacity-70">{v.rationale}</div>
                </li>
              ))}
            </ul>
          )
        ) : null}
      </section>
    </div>
  );
}
