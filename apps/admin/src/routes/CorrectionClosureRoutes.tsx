// The correction CLOSURE's pages — Story 6.19c (AC8c). FIVE routes, one file (each a session gate + one list):
//   · /p/$pariwarId/correction/closures         — the Pariwar Admin's closure decisions (key (3), D27)
//   · /p/$pariwarId/correction/escalations      — the Super Admin's held claims (keys (5), (4)); `?claim=` opens one
//   · /p/$pariwarId/correction/directions       — the named directee's inbox (D18)
//   · /p/$pariwarId/correction/closure-letters  — the District Admin's closure letters (`-274` 2, key (1))
//   · /correction/escalations                   — the Super Admin's TOP-LEVEL entry: a Pariwar picker (a global role
//     reaches a per-Pariwar queue — ⛔ never a cross-tenant read; `deferred-work.md` 6.18 chunk 3)
// ⭐ Every page follows the correction queue's states: the session gate (an expired session goes to sign-in), the
// list's OWN 401 / 403 (a 403 is ⛔ an outage), a failed refetch keeps the list, an empty list says so.

import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import type { ReactElement, ReactNode } from 'react';
import { useEffect, useState } from 'react';

import { ApiError } from '../api/client.js';
import {
  useClosureLettersOwed,
  useClosureQueue,
  useDirectionInbox,
  useEscalatedClosures,
  useProvisionedPariwars,
  useSession,
} from '../api/hooks.js';
import {
  ClosureLettersOwedList,
  DirectionInboxList,
  EscalatedClosureList,
  EscalationDetail,
  PariwarClosureList,
  correctionClosureEn as t,
} from '../modules/correction-closure/index.js';

function SessionGate({ children }: { children: ReactNode }): ReactElement {
  const session = useSession();
  const navigate = useNavigate();
  useEffect(() => {
    if (session.isError) void navigate({ to: '/login' });
  }, [session.isError, navigate]);
  if (session.isLoading) return <p role="status">Checking your session…</p>;
  if (session.isError) return <p role="status">Redirecting to sign in…</p>;
  return <>{children}</>;
}

/** The shared list states (the correction queue's): loading, the list's own 401/403, error, empty, the list. */
function ListStates<T>(props: {
  query: { data: T | undefined; isLoading: boolean; isError: boolean; error: unknown };
  isEmpty: (data: T) => boolean;
  copy: { loading: string; loadError: string; empty: string; forbidden: string };
  testId: string;
  children: (data: T) => ReactNode;
}): ReactElement {
  const navigate = useNavigate();
  const status = props.query.error instanceof ApiError ? props.query.error.status : null;
  useEffect(() => {
    if (status === 401) void navigate({ to: '/login' });
  }, [status, navigate]);
  const data = props.query.data;
  if (props.query.isLoading) return <p role="status" data-testid={`${props.testId}-loading`}>{props.copy.loading}</p>;
  if (data === undefined && status === 403) return <p role="alert" data-testid={`${props.testId}-forbidden`}>{props.copy.forbidden}</p>;
  if (data === undefined) return <p role="alert" data-testid={`${props.testId}-error`}>{props.copy.loadError}</p>;
  return (
    <>
      {props.query.isError ? <p role="alert">{status === 403 ? props.copy.forbidden : props.copy.loadError}</p> : null}
      {props.isEmpty(data) ? <p role="status" data-testid={`${props.testId}-empty`}>{props.copy.empty}</p> : props.children(data)}
    </>
  );
}

// ── The Pariwar Admin ───────────────────────────────────────────────────────────────────────────────────────────

function ClosuresView(): ReactElement {
  const { pariwarId } = useParams({ from: '/p/$pariwarId/correction/closures' });
  const q = useClosureQueue(pariwarId);
  return (
    <main className="mx-auto max-w-4xl p-4">
      <h1 className="text-lg font-semibold">{t.strip.heading}</h1>
      <p className="mt-1 text-sm text-slate-600">{t.strip.intro}</p>
      <ListStates query={q} isEmpty={(d) => d.items.length === 0} copy={t.strip} testId="closure-queue">
        {(d) => <PariwarClosureList pariwarId={pariwarId} items={d.items} />}
      </ListStates>
    </main>
  );
}

export function CorrectionClosuresRoute(): ReactElement {
  return (
    <SessionGate>
      <ClosuresView />
    </SessionGate>
  );
}

// ── The Super Admin ─────────────────────────────────────────────────────────────────────────────────────────────

function EscalationsView(): ReactElement {
  const { pariwarId } = useParams({ from: '/p/$pariwarId/correction/escalations' });
  const search = useSearch({ strict: false }) as { claim?: string };
  const navigate = useNavigate();
  const q = useEscalatedClosures(pariwarId);
  const open = typeof search.claim === 'string' ? search.claim : null;
  return (
    <main className="mx-auto max-w-4xl p-4">
      <h1 className="text-lg font-semibold">{t.escalation.heading}</h1>
      <p className="mt-1 text-sm text-slate-600">{t.escalation.intro}</p>
      <ListStates query={q} isEmpty={(d) => d.items.length === 0} copy={t.escalation} testId="escalations">
        {(d) => (
          <EscalatedClosureList
            items={d.items}
            onOpen={(claimCaseId) =>
              void navigate({ to: '/p/$pariwarId/correction/escalations', params: { pariwarId }, search: { claim: claimCaseId } } as never)
            }
          />
        )}
      </ListStates>
      {open !== null ? <EscalationDetail pariwarId={pariwarId} claimCaseId={open} /> : null}
    </main>
  );
}

export function CorrectionEscalationsRoute(): ReactElement {
  return (
    <SessionGate>
      <EscalationsView />
    </SessionGate>
  );
}

/** The global role's top-level entry: pick a Pariwar, then its held claims. */
function EscalationsPickerView(): ReactElement {
  const navigate = useNavigate();
  const pariwars = useProvisionedPariwars();
  const [typed, setTyped] = useState('');
  const go = (pariwarId: string) => void navigate({ to: '/p/$pariwarId/correction/escalations', params: { pariwarId } } as never);
  // The provisioned Pariwars (a `super_admin` holds `pariwar.provision`); a typed id is the fallback when the list cannot load.
  const items = (pariwars.data ?? []).map((p) => ({ id: p.passport.pariwarId as string, name: p.passport.displayNameEn }));
  return (
    <main className="mx-auto max-w-xl p-4">
      <h1 className="text-lg font-semibold">{t.escalation.heading}</h1>
      <p className="mt-1 text-sm">{t.escalation.pickPariwar}</p>
      {items.length > 0 ? (
        <ul className="mt-2 space-y-1" data-testid="escalations-pariwar-picker">
          {items.map((p) => (
            <li key={p.id}>
              <button type="button" className="underline" onClick={() => go(p.id)}>
                {p.name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <label className="mt-3 flex flex-col text-sm">
        {t.escalation.pariwarId}
        <input value={typed} onChange={(e) => setTyped(e.target.value)} data-testid="escalations-pariwar-id" />
      </label>
      <button
        type="button"
        className="mt-1 rounded border px-3 py-1 text-sm"
        disabled={!/^[0-9a-f-]{36}$/i.test(typed.trim())}
        onClick={() => go(typed.trim())}
      >
        {t.escalation.open}
      </button>
    </main>
  );
}

export function EscalationsPickerRoute(): ReactElement {
  return (
    <SessionGate>
      <EscalationsPickerView />
    </SessionGate>
  );
}

// ── The directee ────────────────────────────────────────────────────────────────────────────────────────────────

function DirectionsView(): ReactElement {
  const { pariwarId } = useParams({ from: '/p/$pariwarId/correction/directions' });
  const q = useDirectionInbox(pariwarId);
  return (
    <main className="mx-auto max-w-4xl p-4">
      <h1 className="text-lg font-semibold">{t.inbox.heading}</h1>
      <p className="mt-1 text-sm text-slate-600">{t.inbox.intro}</p>
      <ListStates query={q} isEmpty={(d) => d.items.length === 0} copy={{ ...t.inbox, forbidden: t.errors.forbidden }} testId="direction-inbox">
        {(d) => <DirectionInboxList pariwarId={pariwarId} items={d.items} />}
      </ListStates>
    </main>
  );
}

export function CorrectionDirectionsRoute(): ReactElement {
  return (
    <SessionGate>
      <DirectionsView />
    </SessionGate>
  );
}

// ── The District Admin's closure letters ───────────────────────────────────────────────────────────────────────

function ClosureLettersView(): ReactElement {
  const { pariwarId } = useParams({ from: '/p/$pariwarId/correction/closure-letters' });
  const q = useClosureLettersOwed(pariwarId);
  return (
    <main className="mx-auto max-w-4xl p-4">
      <h1 className="text-lg font-semibold">{t.letters.heading}</h1>
      <p className="mt-1 text-sm text-slate-600">{t.letters.intro}</p>
      <ListStates query={q} isEmpty={(d) => d.items.length === 0} copy={{ ...t.letters, forbidden: t.errors.forbidden }} testId="closure-letters">
        {(d) => <ClosureLettersOwedList pariwarId={pariwarId} items={d.items} />}
      </ListStates>
    </main>
  );
}

export function ClosureLettersRoute(): ReactElement {
  return (
    <SessionGate>
      <ClosureLettersView />
    </SessionGate>
  );
}
