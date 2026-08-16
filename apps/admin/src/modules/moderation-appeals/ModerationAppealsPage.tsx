// The Trustee Panel's moderation-appeal console — Story 10.22 (AC5, AC6).
//
// Niyamavali §8.8, ratified by Decision `2026-08-15-121`.
//
// ── ⭐ WHY THIS PAGE EXISTS AT ALL ──────────────────────────────────────────────────────────────
// `trustee_panel` holds EXACTLY `[member.moderate, member.restore_terminated,
// member.decide_moderation_appeal]` and NO helpdesk capability whatsoever, and helpdesk
// `routed_to_role` is advisory and inert. There is therefore no operator queue on which a filed
// appeal could ever surface to the Panel. A record + a decide endpoint reachable only by direct link
// would be a technically complete appeal that nobody can find — the helpdesk-is-not-a-queue defect in
// a new costume (D6). THIS LIST is the discoverability.
//
// ── ⛔ WHAT THIS PAGE DOES NOT DO ───────────────────────────────────────────────────────────────
// It does not restore anyone. §8.8 makes an allowed appeal DIRECT that the act be undone; the restore
// is a subsequent, separately-attributed act through the moderation console, carrying its own reason
// code, its own Decision Note and the Panel-exclusive `member.restore_terminated` check. When an
// outcome is `allowed` this page says so and links to the member's moderation surface — it never
// performs the restore, and the lineage `moderation action → appeal → restore` stays readable from
// either end.
//
// ⚠ Holding the key is not sufficient to determine any given appeal. §8.8's different-individual
// requirement is enforced server-side as a 409, and this page renders that refusal as what it is —
// "you took part in this decision" — never as a permissions error.

import { useState, type ReactElement } from 'react';

import {
  useDecideModerationAppeal,
  useModerationAppeal,
  useModerationAppeals,
  useRequestModerationAppealStepUp,
} from '../../api/hooks.js';

export interface ModerationAppealsPageProps {
  pariwarId: string;
}

export function ModerationAppealsPage({ pariwarId }: ModerationAppealsPageProps): ReactElement {
  const list = useModerationAppeals(pariwarId);
  const [selected, setSelected] = useState<string | null>(null);
  const detail = useModerationAppeal(pariwarId, selected);
  const decide = useDecideModerationAppeal(pariwarId);
  const stepUp = useRequestModerationAppealStepUp();
  const [outcome, setOutcome] = useState<'upheld' | 'allowed'>('upheld');
  const [reasoned, setReasoned] = useState('');

  // The three genuinely different refusals, told apart. ⛔ Never collapsed into "something failed".
  const err = decide.error as { code?: string; status?: number } | null;
  const needsStepUp = err?.code === 'auth.step_up_required';
  const excluded = err?.code === 'member_moderation.appeal_adjudicator_excluded';
  const alreadyDecided = err?.code === 'member_moderation.appeal_already_decided';
  // [Review 2026-08-16] Any OTHER failure (400 validation, 404, 500, network) previously rendered
  // NONE of the three alerts above and left the trustee with no feedback at all.
  const unrecognizedError = decide.isError && !needsStepUp && !excluded && !alreadyDecided;

  return (
    <section aria-label="Moderation appeals" data-testid="moderation-appeals" className="flex flex-col gap-5">
      <header>
        <h1 className="text-xl font-bold">Moderation appeals (Niyamavali §8.8)</h1>
        <p className="text-sm opacity-70">
          Open appeals in this Pariwar, oldest first. An appeal must be heard by a Panel member who
          took no part in the decision being appealed.
        </p>
      </header>

      {list.isLoading && <p role="status">Loading appeals…</p>}
      {list.isError && <p role="status">Could not load appeals.</p>}
      {list.data && list.data.items.length === 0 && (
        <p role="status" data-testid="appeals-empty">
          No open appeals.
        </p>
      )}

      {list.data && list.data.items.length > 0 && (
        <table className="w-full text-sm" data-testid="appeals-table">
          <caption className="sr-only">Open moderation appeals</caption>
          <thead>
            <tr>
              <th scope="col" className="text-left">Filed</th>
              <th scope="col" className="text-left">Member</th>
              <th scope="col" className="text-left">Decision appealed</th>
              <th scope="col" className="text-left">Filed via</th>
              <th scope="col" className="text-left" />
            </tr>
          </thead>
          <tbody>
            {list.data.items.map((a) => (
              <tr key={a.appeal_id} data-testid={`appeal-row-${a.appeal_id}`}>
                <td>{new Date(a.filed_at).toLocaleDateString()}</td>
                <td><code>{a.member_id}</code></td>
                <td><code>{a.moderation_action_id}</code></td>
                {/* `helpline` means an operator recorded it — the member's own act, taken by phone. */}
                <td>{a.filed_via === 'helpline' ? 'Helpline' : 'Member app'}</td>
                <td>
                  <button type="button" onClick={() => setSelected(a.appeal_id)}>
                    Open
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selected && (
        <section aria-label="Appeal detail" data-testid="appeal-detail" className="rounded border p-4">
          {detail.isLoading && <p role="status">Loading…</p>}
          {detail.isError && <p role="status">Could not load this appeal.</p>}
          {detail.data && (
            <>
              <h2 className="font-bold">The member&rsquo;s grounds</h2>
              {/* null = a corrupt or rotated envelope, per-row. A KMS outage answers 503 instead, so
                  this never reads as "the member appealed and said nothing". */}
              <p data-testid="appeal-grounds">
                {detail.data.grounds ?? 'The stored grounds could not be read.'}
              </p>

              <h2 className="mt-4 font-bold">Your determination</h2>
              <fieldset>
                <legend className="sr-only">Outcome</legend>
                <label>
                  <input
                    type="radio"
                    name="outcome"
                    checked={outcome === 'upheld'}
                    onChange={() => setOutcome('upheld')}
                  />{' '}
                  Uphold the decision
                </label>
                <label className="ml-4">
                  <input
                    type="radio"
                    name="outcome"
                    checked={outcome === 'allowed'}
                    onChange={() => setOutcome('allowed')}
                  />{' '}
                  Allow the appeal
                </label>
              </fieldset>
              {/* ⛔ Stated on the form, not discovered afterwards. */}
              {outcome === 'allowed' && (
                <p className="text-sm opacity-70" data-testid="allowed-directs-notice">
                  Allowing the appeal <strong>directs</strong> that the decision be undone. It does not
                  undo it — a trustee must then record the restoration on the member&rsquo;s moderation
                  page, with its own reason and decision note.
                </p>
              )}

              <label className="mt-3 block">
                Your reasons (recorded on the appeal)
                <textarea
                  className="mt-1 w-full rounded border p-2"
                  rows={6}
                  value={reasoned}
                  onChange={(e) => setReasoned(e.target.value)}
                />
              </label>

              {needsStepUp && (
                <p role="alert" data-testid="appeal-step-up">
                  This action needs a fresh verification.{' '}
                  <button type="button" onClick={() => stepUp.mutate()}>
                    Send me a code
                  </button>
                </p>
              )}
              {/* ⛔ NOT a permissions error, and it must never read as one. */}
              {excluded && (
                <p role="alert" data-testid="appeal-excluded">
                  You took part in the decision being appealed, so you cannot hear this appeal
                  (Niyamavali §8.8). Another Panel member must determine it.
                </p>
              )}
              {alreadyDecided && (
                <p role="alert" data-testid="appeal-already-decided">
                  This appeal has already been determined. A recorded determination cannot be changed.
                </p>
              )}
              {unrecognizedError && (
                <p role="alert" data-testid="appeal-decide-error">
                  Could not record this determination. Please try again.
                </p>
              )}

              <button
                type="button"
                className="mt-3 rounded border px-4 py-2"
                disabled={decide.isPending || reasoned.trim().length < 20}
                onClick={() =>
                  decide.mutate({ appealId: selected, body: { outcome, reasoned_outcome: reasoned.trim() } })
                }
              >
                Record determination
              </button>

              {decide.data && (
                <p role="status" data-testid="appeal-decided">
                  Recorded. {decide.data.directs_restore ? (
                    <>
                      This appeal <strong>directs a restoration</strong>.{' '}
                      <a href={`/p/${pariwarId}/members?member=${encodeURIComponent(detail.data.appeal.member_id)}`}>
                        Go to the member&rsquo;s moderation page to record it.
                      </a>
                    </>
                  ) : (
                    'The decision stands.'
                  )}
                </p>
              )}
            </>
          )}
        </section>
      )}
    </section>
  );
}
