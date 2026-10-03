// The named directee's INBOX — Story 6.19c (AC14, D18, AC8c). The caller's own unanswered directions from the Super
// Admin, each with a response form (REQUIRED text). A response is a RECORD — ⛔ never a decision; it stays allowed after
// the claim is decided (`-273` §6), and the page says which. The server checks the identity (the actor IS the named
// directee) — a 403 reads "your access does not cover this".

import type { DirectionInboxResponse, StaffNoteDto } from '@twt/contracts';
import type { ReactElement } from 'react';
import { useId, useState } from 'react';

import { useRespondToClosureDirection } from '../../api/hooks.js';
import { closureErrorText } from './errors.js';
import { correctionClosureEn as t } from './i18n-en.js';

const n = t.inbox;

function Text({ note }: { note: StaffNoteDto }): ReactElement {
  return <>{note.state === 'readable' ? note.value : '—'}</>;
}

function ResponseForm({ pariwarId, item }: { pariwarId: string; item: DirectionInboxResponse['items'][number] }): ReactElement {
  const respond = useRespondToClosureDirection(pariwarId);
  const [response, setResponse] = useState('');
  const [missing, setMissing] = useState(false);
  const id = useId();
  return (
    <div className="mt-1 flex flex-col gap-1">
      <label className="flex flex-col">
        {n.response}
        <textarea value={response} onChange={(e) => setResponse(e.target.value)} aria-describedby={missing ? id : undefined} data-testid="direction-response" />
      </label>
      {missing ? (
        <p role="alert" id={id}>
          {t.column.noteRequired}
        </p>
      ) : null}
      <button
        type="button"
        className="self-start rounded border px-3 py-1"
        disabled={respond.isPending}
        data-testid="direction-response-submit"
        onClick={() => {
          if (response.trim() === '') return setMissing(true);
          setMissing(false);
          void respond
            .mutateAsync({ claimCaseId: item.claim_case_id, directionId: item.direction.direction_id, response })
            .catch(() => undefined);
        }}
      >
        {n.submit}
      </button>
      {respond.isSuccess ? <p role="status">{n.responded}</p> : null}
      {respond.isError ? <p role="alert">{closureErrorText(respond.error)}</p> : null}
    </div>
  );
}

export function DirectionInboxList({ pariwarId, items }: { pariwarId: string; items: DirectionInboxResponse['items'] }): ReactElement {
  return (
    <ul className="mt-4 space-y-3" data-testid="direction-inbox">
      {items.map((item) => (
        <li key={item.direction.direction_id} className="rounded border p-3 text-sm" data-testid={`direction-inbox-item-${item.direction.direction_id}`}>
          <p>
            <code className="font-mono text-xs">{item.short_reference}</code> · {item.direction.created_by} · {item.direction.created_at}
          </p>
          <p className="mt-1">
            <Text note={item.direction.text} />
          </p>
          {/* Code review patch (2026-10-02) — `role="status"`: still_held → decided is a silent background-refetch
              transition a non-actor viewer should be told about. */}
          <p role="status" className="text-xs opacity-80">{item.still_held ? n.stillHeld : n.decided}</p>
          <ResponseForm pariwarId={pariwarId} item={item} />
        </li>
      ))}
    </ul>
  );
}
