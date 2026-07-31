// Feature-flag inventory console (Story 10.8, Task 8) — the pariwar-scoped admin surface.
//
// MINIMAL by design (the 10.3/10.4/10.5/10.7 console precedent): the COMPLETE flag inventory as a
// table, and a flip form. No canary dashboards, no rollout-percentage sliders, no graphs — the state
// machine plus a scope-narrowing cohort predicate IS the v1 mechanism. `pariwarId` is a prop (from
// the route) so the page is testable without a router.
//
// ── THIS PAGE IS WHY "NO SECRET FLAGS" IS TRUE (prd.md:892, AC4) ──────────────────────────────────
// A flag store with no inventory surface cannot satisfy "no secret flags", however correct the store
// is: an operator with no way to see the flags cannot know what is live. This table is the
// requirement, not a convenience. It renders EVERY flag the server returns and has no filter, no
// search, and no "show advanced" toggle — the completeness is the server's (it iterates the code
// registry), and this page must not reintroduce a way to hide a row.
//
// The real security boundary is the server: [adminSession, scope, requirePermission]. `feature_flag.view`
// gates the reads and the NARROWER `feature_flag.flip` gates the write, so a viewer without flip
// authority (an `auditor`) sees the full inventory and gets a 403 on submit — surfaced as an error,
// not hidden, because hiding it would misrepresent what exists.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';

import type { FeatureFlagEntry, FeatureFlagFlipBody } from '../../api/client.js';
import { flipFeatureFlag, listFeatureFlagVersions, listPariwarFeatureFlags } from '../../api/client.js';

const STATES: readonly FeatureFlagFlipBody['state'][] = ['off', 'canary', 'rollout', 'full', 'rolled_back'];

/** Plain-language gloss on each state — an operator flipping production behaviour should not have to
 *  infer semantics from an enum name. */
const STATE_HELP: Readonly<Record<string, string>> = {
  off: 'Not serving. The flag is inert; consumers use their own default.',
  canary: 'Serving only to members matched by the cohort below.',
  rollout: 'Serving only to members matched by the cohort below (a widened canary).',
  full: 'Serving to everyone in this Pariwar. The cohort is ignored.',
  rolled_back: 'Not serving — deliberately reverted. Distinct from "off" so the history shows a rollback.',
};

/** Where the effective value came from — the AC4 provenance column. */
const SOURCE_LABEL: Readonly<Record<string, string>> = {
  override: 'This Pariwar',
  global: 'Global',
  default: 'Code default',
};

function summariseCohort(entry: FeatureFlagEntry): string {
  const clauses = entry.cohort_definition.clauses;
  if (clauses.length === 0) return 'Everyone (no cohort narrowing)';
  return clauses.map((c) => `${c.dimension} ${c.op} [${c.values.join(', ')}]`).join('  OR  ');
}

function formatWindow(entry: FeatureFlagEntry): string {
  if (!entry.effective_from) return '—';
  const from = entry.effective_from.slice(0, 10);
  return entry.effective_until ? `${from} → ${entry.effective_until.slice(0, 10)}` : `${from} → open`;
}

export function FeatureFlagsPage({ pariwarId }: { pariwarId: string }): ReactElement {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<FeatureFlagEntry | null>(null);
  const [state, setState] = useState<FeatureFlagFlipBody['state']>('off');
  const [owner, setOwner] = useState('');
  const [deadBy, setDeadBy] = useState('');
  const [rationale, setRationale] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [flipped, setFlipped] = useState<string | null>(null);
  const [historyFor, setHistoryFor] = useState<string | null>(null);
  // Set right before a Cancel click while a flip is still in flight — the underlying fetch cannot
  // be aborted (no AbortController threaded through the client yet), but the callback checks this
  // so a late response never surfaces a success/error banner for a flip the operator already
  // dismissed. Cleared at the start of every fresh submit.
  const cancelledRef = useRef(false);

  const inventory = useQuery({
    queryKey: ['feature-flags', pariwarId],
    queryFn: () => listPariwarFeatureFlags(pariwarId),
  });

  const history = useQuery({
    queryKey: ['feature-flags', pariwarId, historyFor, 'versions'],
    queryFn: () => listFeatureFlagVersions(pariwarId, historyFor!),
    enabled: historyFor !== null,
  });

  const flags = inventory.data?.flags ?? [];

  // Lost-update guard: if the inventory refetches (a poll, or another admin's flip invalidating the
  // query) while this form is open, the held snapshot's cohort/fallback_default could be stale by
  // the time submit fires, silently overwriting a concurrent change. Close the form instead of
  // letting that happen quietly.
  useEffect(() => {
    if (!selected) return;
    const current = flags.find((f) => f.flag_key === selected.flag_key);
    if (current && current.flag_version !== selected.flag_version) {
      setSelected(null);
      setError('This flag changed elsewhere while the form was open — please re-open it and try again.');
    }
    // Only re-run when the inventory data itself changes; `selected`/`flags` are read, not depended
    // on, so opening/closing the form doesn't retrigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inventory.data]);

  const flip = useMutation({
    mutationFn: () => {
      const entry = selected!;
      const body: FeatureFlagFlipBody = {
        state,
        // v1 carries the existing cohort forward unchanged — this console flips STATE. Editing a
        // cohort predicate is a structured-rule edit that deserves its own reviewed surface rather
        // than a free-text box that can silently mis-target a rollout.
        cohort_definition: entry.cohort_definition,
        fallback_default: entry.fallback_default,
        owner,
        dead_by: deadBy,
        rationale,
      };
      return flipFeatureFlag(pariwarId, entry.flag_key, body);
    },
    onSuccess: (res) => {
      if (cancelledRef.current) {
        cancelledRef.current = false;
        return;
      }
      setError(null);
      setFlipped(`${res.flag_key} → ${res.state} (version ${String(res.version)})`);
      setSelected(null);
      setRationale('');
      void queryClient.invalidateQueries({ queryKey: ['feature-flags', pariwarId] });
    },
    onError: (err: unknown) => {
      if (cancelledRef.current) {
        cancelledRef.current = false;
        return;
      }
      setFlipped(null);
      setError(err instanceof Error ? err.message : 'Flip failed');
    },
  });

  return (
    <section aria-labelledby="feature-flags-heading">
      <h1 id="feature-flags-heading">Feature flags</h1>
      <p>
        Every feature flag registered in this system, and how it currently resolves for this Pariwar.
        This list is complete — there are no hidden or internal flags. Every change is recorded in the
        tamper-evident audit log with who made it and why.
      </p>

      {inventory.isLoading ? <p>Loading the flag inventory…</p> : null}
      {inventory.isError ? <p role="alert">Could not load the flag inventory.</p> : null}
      {flipped ? <p role="status">Flipped: {flipped}</p> : null}
      {error ? <p role="alert">{error}</p> : null}

      {flags.length > 0 ? (
        <table>
          <caption>Effective feature flags ({flags.length})</caption>
          <thead>
            <tr>
              <th scope="col">Flag</th>
              <th scope="col">State</th>
              <th scope="col">Set by</th>
              <th scope="col">Cohort</th>
              <th scope="col">Owner</th>
              <th scope="col">Retire by</th>
              <th scope="col">Effective</th>
              <th scope="col">Last change</th>
              <th scope="col">Action</th>
            </tr>
          </thead>
          <tbody>
            {flags.map((f) => (
              <tr key={f.flag_key}>
                <th scope="row">
                  {f.flag_key}
                  <br />
                  <small>{f.description}</small>
                </th>
                <td>
                  {f.state} <small>(v{f.flag_version})</small>
                </td>
                <td>{SOURCE_LABEL[f.source] ?? f.source}</td>
                <td>{summariseCohort(f)}</td>
                <td>{f.owner}</td>
                <td>{f.dead_by ?? '—'}</td>
                <td>{formatWindow(f)}</td>
                <td>
                  {/* FR-58C: actor + rationale on every change. The code-default tier was never
                      flipped by anyone, so both are legitimately absent there. */}
                  {f.rationale ? (
                    <>
                      {f.rationale}
                      <br />
                      <small>by {f.last_flip_actor ?? 'unknown'}</small>
                    </>
                  ) : (
                    '—'
                  )}
                </td>
                <td>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(f);
                      setState(f.state);
                      setOwner(f.owner);
                      setDeadBy(f.dead_by ?? '');
                      setRationale('');
                      setError(null);
                      setFlipped(null);
                    }}
                  >
                    Change…
                  </button>{' '}
                  <button
                    type="button"
                    onClick={() => setHistoryFor(historyFor === f.flag_key ? null : f.flag_key)}
                  >
                    {historyFor === f.flag_key ? 'Hide history' : 'History…'}
                  </button>
                  {historyFor === f.flag_key ? (
                    <div role="region" aria-label={`Version history for ${f.flag_key}`}>
                      {history.isLoading ? <p>Loading history…</p> : null}
                      {history.isError ? <p role="alert">Could not load version history.</p> : null}
                      {history.data && history.data.versions.length === 0 ? (
                        <p>
                          <small>No persisted versions yet — this flag is still on its code default.</small>
                        </p>
                      ) : null}
                      {history.data && history.data.versions.length > 0 ? (
                        <table>
                          <caption>
                            <small>{f.flag_key} — version history (newest first)</small>
                          </caption>
                          <thead>
                            <tr>
                              <th scope="col">Version</th>
                              <th scope="col">Scope</th>
                              <th scope="col">State</th>
                              <th scope="col">Effective</th>
                              <th scope="col">By</th>
                              <th scope="col">Rationale</th>
                            </tr>
                          </thead>
                          <tbody>
                            {history.data.versions.map((v) => (
                              <tr key={`${v.pariwar_id ?? 'global'}-v${String(v.version)}`}>
                                <td>v{v.version}</td>
                                <td>{v.pariwar_id ? 'This Pariwar' : 'Global'}</td>
                                <td>{v.state}</td>
                                <td>
                                  {v.effective_from.slice(0, 10)}
                                  {v.effective_until ? ` → ${v.effective_until.slice(0, 10)}` : ' → open'}
                                </td>
                                <td>{v.actor_who_flipped ?? 'unknown'}</td>
                                <td>{v.rationale}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : null}
                    </div>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      {selected ? (
        <form
          aria-labelledby="flip-heading"
          onSubmit={(e) => {
            e.preventDefault();
            cancelledRef.current = false;
            flip.mutate();
          }}
        >
          <h2 id="flip-heading">Change “{selected.flag_key}” for this Pariwar</h2>
          <p>
            This creates a new version. Earlier versions are never edited, so the full history stays
            available for review.
          </p>

          <label>
            New state
            <select value={state} onChange={(e) => setState(e.target.value as FeatureFlagFlipBody['state'])}>
              {STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <p>
            <small>{STATE_HELP[state]}</small>
          </p>

          <label>
            Owner (desk/team, not a person)
            <input type="text" value={owner} onChange={(e) => setOwner(e.target.value)} maxLength={64} required />
          </label>

          <label>
            Retire by (ISO date — the quarterly inventory audit reads this)
            <input
              type="date"
              value={deadBy}
              onChange={(e) => setDeadBy(e.target.value)}
              required
            />
          </label>

          <label>
            Reason for this change (required)
            <textarea
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              maxLength={500}
              required
              // Required in the markup AND on the wire AND in the domain. FR-58C makes the rationale
              // part of the audit record, and an optional one would be empty on exactly the hurried
              // flips that most need explaining.
            />
          </label>

          <button
            type="submit"
            disabled={
              flip.isPending ||
              rationale.trim().length === 0 ||
              owner.trim().length === 0 ||
              !/^\d{4}-\d{2}-\d{2}$/.test(deadBy)
            }
          >
            {flip.isPending ? 'Saving…' : 'Apply change'}
          </button>
          <button
            type="button"
            onClick={() => {
              if (flip.isPending) cancelledRef.current = true;
              setSelected(null);
            }}
          >
            Cancel
          </button>
        </form>
      ) : null}
    </section>
  );
}
