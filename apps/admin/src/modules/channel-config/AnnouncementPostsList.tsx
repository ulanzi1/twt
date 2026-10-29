// The Trust's announcement channels — the "Posts" list (Story 5.14, Task 6; AC2; `2026-10-29-417` FS4 (a)).
//
// Each pool opening and each cycle's last day of the last 15 days, with its Telegram state and — ONLY while the switch is on — the
// exact bilingual words to post to the WhatsApp Channel by hand, with a Copy button. Whether a WhatsApp post was made is ⛔ recorded
// (FS4 (a)'s accepted gap). The words come from the server (rebuilt at read — ⛔ stored anywhere).

import type { AnnouncementPostEntry, AnnouncementPostTelegramState, AnnouncementPostsResponse } from '@twt/contracts';
import { useState, type ReactElement } from 'react';

/** What each Telegram state means to the admin. */
export const TELEGRAM_STATE_LABEL: Record<AnnouncementPostTelegramState, string> = {
  posted: 'Posted to Telegram',
  deferred: 'Waiting — Telegram asked us to slow down',
  refused: 'Telegram refused it',
  unknown: 'May have posted — check the channel',
  skipped: 'Not posted (the channels were off or not set up)',
  attempting: 'Posting now',
  not_attempted: 'Not attempted',
};

function CopyButton({ text, testId }: { text: string; testId: string }): ReactElement {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  return (
    <button
      type="button"
      className="rounded border px-2 py-1 text-xs"
      data-testid={testId}
      onClick={() => {
        navigator.clipboard.writeText(text).then(
          () => setState('copied'),
          () => setState('failed'),
        );
      }}
    >
      {state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy failed — select the text' : 'Copy'}
    </button>
  );
}

function subjectOf(p: AnnouncementPostEntry): string {
  return p.occasion === 'pool_open' ? `Pool ${p.poolLabel ?? ''} opened` : `Last day — ${p.lastDate ?? ''}`;
}

export function AnnouncementPostsList({ data }: { data: AnnouncementPostsResponse }): ReactElement {
  if (data.posts.length === 0) return <p className="text-sm opacity-70">No pool openings or last days in the last 15 days.</p>;
  return (
    <div className="flex flex-col gap-3" data-testid="announcement-posts">
      {!data.enabled && <p className="text-sm opacity-70">The channels are off — switch them on to see the words to post to the WhatsApp Channel.</p>}
      <ul className="flex flex-col gap-3">
        {data.posts.map((p) => (
          <li key={`${p.occasion}:${p.subjectId}`} className="rounded border p-3" data-testid="announcement-post">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="font-medium">{subjectOf(p)}</span>
              <span className="opacity-70">{TELEGRAM_STATE_LABEL[p.telegramState]}</span>
            </div>
            {p.words !== null && (
              <div className="mt-2 flex flex-col gap-2">
                <pre className="whitespace-pre-wrap rounded bg-black/5 p-2 text-sm">{p.words}</pre>
                <CopyButton text={p.words} testId={`copy-${p.occasion}-${p.subjectId}`} />
              </div>
            )}
            {p.wordsUnavailable && <p role="alert" className="mt-2 text-sm text-status-fail-fg">The words for this post could not be built — the name could not be read. Try again later.</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
