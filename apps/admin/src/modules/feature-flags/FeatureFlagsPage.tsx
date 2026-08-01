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
import { ApiError, flipFeatureFlag, listFeatureFlagVersions, listPariwarFeatureFlags } from '../../api/client.js';

/**
 * The AC7 staged-rollout ladder, mirrored from the domain's `LEGAL_FLAG_STATE_TRANSITIONS`.
 *
 * ⚠ Review Pass 4. The form used to offer all five states unconditionally, so from a flag's shipped
 * `off` state three of the five options were an instant 409 and a fourth was a 400 — the console
 * could not perform a single legal flip of any flag, which is its entire purpose. Deriving the
 * options from the ladder means the form can never construct a transition the server refuses.
 *
 * Identity transitions are legal in every state: re-publishing the same state is how an operator
 * updates `owner`/`dead_by`/`rationale` without changing behaviour.
 */
const LEGAL_NEXT_STATES: Readonly<Record<string, readonly FeatureFlagFlipBody['state'][]>> = {
  off: ['off', 'canary'],
  canary: ['canary', 'rollout', 'rolled_back'],
  rollout: ['rollout', 'full', 'rolled_back'],
  full: ['full', 'rolled_back'],
  rolled_back: ['rolled_back', 'off', 'canary'],
};

/** Why a state is or is not offered — shown beside the picker so the ladder is legible, not magic. */
/**
 * Turn a server rejection into something an operator can act on (Review Pass 4).
 *
 * Every failure used to render `err.message` — so the five codes this story introduced (an illegal
 * ladder step, a concurrent-flip race, a key not admitted to the capability bar, an in-flight
 * idempotent retry, and the two capability-bar 503s) all surfaced as opaque text, and an operator
 * hitting a 409 had no way to know whether to retry, re-read, or escalate.
 */
function describeFlipError(err: unknown): string {
  const code = err instanceof ApiError ? err.code : undefined;
  switch (code) {
    case 'feature_flag.illegal_state_transition':
      return 'That is not a legal next step for this flag. Re-open the form to see the current state — the flag may have moved since you opened it.';
    case 'feature_flag.version_conflict':
      return 'Another admin flipped this flag while your form was open. Re-open it, re-read the current state, and decide again.';
    case 'feature_flag.not_allowlisted':
      return 'This flag key is not admitted to the governance capability bar on this deployment. It cannot be flipped until it is attested (governance_boundary.yaml).';
    case 'feature_flag.idempotency_in_progress':
      return 'An identical flip is already in progress. Wait a moment and re-check the inventory before retrying.';
    case 'feature_flag.capability_bar_unavailable':
    case 'feature_flag.capability_bar_invalid':
      return 'The governance capability bar is unavailable or invalid on this deployment, so no flag can be flipped. This is a deployment fault — contact the platform team.';
    case 'admin.display_name_missing':
      return 'Your admin account has no display name recorded, and a flag flip is permanently attributed. Set a display name before flipping.';
    default:
      if (err instanceof ApiError && err.status === 403) {
        return 'You do not have permission to flip feature flags in this Pariwar (feature_flag.flip is required).';
      }
      return err instanceof Error ? err.message : 'Flip failed';
  }
}

const LADDER_NOTE =
  'Only the next legal steps are listed: a flag advances off → canary → rollout → full without ' +
  'skipping a rung, and can be rolled back from any serving state.';

/** Plain-language gloss on each state — an operator flipping production behaviour should not have to
 *  infer semantics from an enum name. */
const STATE_HELP: Readonly<Record<string, string>> = {
  // ⚠ NOT "inert" (corrected in Review Pass 4). Once ANY row exists for a scope, the flag governs
  // that scope — `off` is a decided "the cutover is not active", which for kyc_manual_fallback means
  // the manual fallback IS available, even on a deployment whose config disabled it. The config
  // default applies only when no row exists at all.
  off: 'Not serving — a decided "off", not an absence. Once set, this overrides the deployment default.',
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
  // ⚠ Holds the flag key of a CANCELLED in-flight flip, not a bare boolean (Review Pass 4). As a
  // shared boolean it was reset at every submit, so cancelling flip A and then submitting flip B
  // made A's late callback run against B's session and attribute A's result to a flip the operator
  // had abandoned. Keyed, a late callback can only ever silence its OWN flag.
  const cancelledForRef = useRef<string | null>(null);
  // Minted when the form OPENS and held until it closes, so a retried submit of the same decision
  // carries the same key (Review Pass 4).
  const idempotencyKeyRef = useRef<string | null>(null);

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
    // ⚠ Compare `source` as well as `flag_version` (Review Pass 4). Override and global are
    // INDEPENDENT counters that both start at 2, so a form opened on a `global` entry at v2 did not
    // trip when a per-Pariwar OVERRIDE v2 was published under it — and submit then overwrote the new
    // override using the stale global snapshot's cohort, the exact lost update this guard exists to
    // prevent.
    if (current && (current.flag_version !== selected.flag_version || current.source !== selected.source)) {
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
      // One key per OPEN FORM, not per submit: a retry of the same operator decision must reuse it,
      // which is exactly what makes a timed-out-and-retried flip idempotent rather than duplicating.
      return flipFeatureFlag(pariwarId, entry.flag_key, body, idempotencyKeyRef.current ?? crypto.randomUUID());
    },
    onSuccess: (res) => {
      // ⚠ INVALIDATE FIRST, unconditionally (Review Pass 4). The early return used to skip the
      // invalidation too, so a flip the operator cancelled — but which had already COMMITTED
      // server-side, since the fetch is not aborted — left the table showing pre-flip state until a
      // manual reload. Cancelling suppresses the BANNER, never the refresh: the server's state is
      // the truth regardless of what the operator did with the form.
      void queryClient.invalidateQueries({ queryKey: ['feature-flags', pariwarId] });
      if (cancelledForRef.current === res.flag_key) {
        cancelledForRef.current = null;
        return;
      }
      setError(null);
      setFlipped(`${res.flag_key} → ${res.state} (version ${String(res.version)})`);
      setSelected(null);
      setRationale('');
      void queryClient.invalidateQueries({ queryKey: ['feature-flags', pariwarId] });
    },
    onError: (err: unknown) => {
      // A failed flip wrote nothing, so no invalidation is owed — but the cache may still be stale
      // relative to whatever CAUSED the failure (a concurrent flip), so refresh anyway.
      void queryClient.invalidateQueries({ queryKey: ['feature-flags', pariwarId] });
      if (cancelledForRef.current !== null) {
        cancelledForRef.current = null;
        return;
      }
      setFlipped(null);
      setError(describeFlipError(err));
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
      {inventory.isError ? (
        <p role="alert">
          {/* A 403 on the READ was indistinguishable from an outage (Review Pass 4) — a viewer
              lacking feature_flag.view could not tell "not allowed" from "the flag store is down". */}
          {inventory.error instanceof ApiError && inventory.error.status === 403
            ? 'You do not have permission to view feature flags in this Pariwar (feature_flag.view is required).'
            : 'Could not load the flag inventory.'}
        </p>
      ) : null}
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
                  {/* ⚠ The actor is rendered INDEPENDENTLY of the rationale (Review Pass 4): it used
                      to be nested inside this ternary, so a row with an actor but no rationale hid
                      the actor entirely. And it renders the display-name SNAPSHOT — the field
                      migration 0089 exists to supply — falling back to "not recorded" rather than
                      substituting a UUID no human can resolve. */}
                  {f.rationale ?? '—'}
                  {f.last_flip_actor === null ? null : (
                    <>
                      <br />
                      <small>by {f.last_flip_actor_display ?? 'not recorded'}</small>
                    </>
                  )}
                </td>
                <td>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(f);
                      idempotencyKeyRef.current = crypto.randomUUID();
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
                        <>
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
                        {history.data.has_more ? (
                          <p role="status">
                            {/* Pass 2 added `has_more` so a clipped history could not be mistaken
                                for a complete one — and the console, the very consumer it was added
                                for, ignored it (Review Pass 4). No cursor exists yet; saying so
                                plainly is the honest surface. */}
                            <small>
                              Older versions exist beyond this page and are not shown — this history
                              is truncated. Paging is not available yet.
                            </small>
                          </p>
                        ) : null}
                      </>
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
            cancelledForRef.current = null;
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
              {(LEGAL_NEXT_STATES[selected.state] ?? [selected.state]).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <p>
            <small>{STATE_HELP[state]}</small>
            <br />
            <small>{LADDER_NOTE}</small>
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
              if (flip.isPending) cancelledForRef.current = selected.flag_key;
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
