// The Trust's announcement channels — the "Posts" list (Story 5.14, Task 6; AC2; `2026-10-29-417` FS4 (a), as amended by `-419`
// item 6).
//
// Each pool opening and each cycle's last day of the last 15 days, with its Telegram state, WHY it is in that state (`-419` item 6 (c) —
// the recorded reason, in plain words) and — ONLY while the switch is on — the exact bilingual words to post to the WhatsApp Channel by
// hand, with a Copy button. Whether a WhatsApp post was made is ⛔ recorded (FS4 (a)'s accepted gap). The words come from the server
// (rebuilt at read — ⛔ stored anywhere); the page ALSO hides them while the switch is off (review G2-P12), so a stale or wrong payload
// can never put words on screen for a Pariwar that has not switched the channels on.

import { ANNOUNCEMENT_POST_TG_REASON_REGEX } from '@twt/contracts';
import type {
  ANNOUNCEMENT_POST_REASON_CODES,
  AnnouncementPostEntry,
  AnnouncementPostReason,
  AnnouncementPostTelegramState,
  AnnouncementPostsResponse,
} from '@twt/contracts';
import { useEffect, useRef, useState, type ReactElement } from 'react';

/** Review FD-P9 — how long "Copied" stays on the button before it is a plain "Copy" again ("Copy failed" stays until the next press). */
export const COPY_OUTCOME_MS = 2000;

/** What each Telegram state means to the admin. The reason (below) says why, for the states that need one. */
export const TELEGRAM_STATE_LABEL: Record<AnnouncementPostTelegramState, string> = {
  posted: 'Posted to Telegram',
  deferred: 'Waiting — Telegram asked us to slow down',
  refused: 'Not posted',
  unknown: 'May have posted — check the channel',
  skipped: 'Not posted',
  attempting: 'Posting now',
  not_attempted: 'Not attempted',
};

/**
 * `-419` item 6 (c) — the recorded reason (`-418` §3's `detail` vocabulary) in short, plain admin English. ⛔ A name: the reason is a
 * code from a fixed list (a Telegram error is its three-digit number).
 */
export const POST_REASON_LABEL: Record<(typeof ANNOUNCEMENT_POST_REASON_CODES)[number], string> = {
  tg_429: 'Telegram asked us to slow down',
  tg_429_expired: 'Telegram kept asking us to wait, so the post was given up',
  secret_unresolved: "The bot's token could not be read",
  identity_unavailable: "The deceased member's name could not be read",
  switch_off: 'The channels were switched off',
  no_chat_id: 'No Telegram channel id was set',
  bot_not_configured: "This Pariwar's Telegram bot is not set up",
  stale: 'Too late to post — the moment had passed',
  timeout_or_network: 'Telegram did not answer in time',
  http_5xx: 'Telegram had a server error',
  no_message_id: 'Telegram did not confirm the post',
  stale_lease: 'The attempt did not finish',
  unclassified: 'Telegram gave an unexpected answer',
};

/** The reason's words; a Telegram refusal names its error number. */
export function reasonLabel(reason: AnnouncementPostReason): string {
  if (Object.prototype.hasOwnProperty.call(POST_REASON_LABEL, reason)) return POST_REASON_LABEL[reason as keyof typeof POST_REASON_LABEL];
  if (ANNOUNCEMENT_POST_TG_REASON_REGEX.test(reason)) return `Telegram refused it (error ${reason.slice(3)})`;
  return 'No reason recorded';
}

/** The states whose label alone does not say why (a `deferred` row's label already does). */
const STATES_WITH_REASON: ReadonlySet<AnnouncementPostTelegramState> = new Set(['refused', 'skipped', 'unknown']);

function CopyButton({ text, testId }: { text: string; testId: string }): ReactElement {
  // Review FD-P9 / FD2-R1 — an outcome records the text it was pressed FOR and is shown only while that is still the text on screen
  // (derived, ⛔ an effect: no render shows "Copied" for words that were never copied). It is cleared first on every press and EVERY
  // outcome — including a missing clipboard or a synchronous throw — lands asynchronously, so a repeat press always passes through an
  // empty live region and is announced again. "Copied" fades; a failure stays (its words are the admin's only instruction on that path).
  const [outcome, setOutcome] = useState<{ readonly forText: string; readonly kind: 'copied' | 'failed' } | null>(null);
  const state: 'idle' | 'copied' | 'failed' = outcome !== null && outcome.forText === text ? outcome.kind : 'idle';
  const alive = useRef(true);
  const fade = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (fade.current !== null) clearTimeout(fade.current);
    };
  }, []);
  const settle = (forText: string, kind: 'copied' | 'failed'): void => {
    if (!alive.current) return; // the write settled after the row went away
    if (fade.current !== null) clearTimeout(fade.current);
    setOutcome({ forText, kind });
    fade.current = kind === 'copied' ? setTimeout(() => setOutcome(null), COPY_OUTCOME_MS) : null;
  };
  const press = (): void => {
    const pressed = text;
    setOutcome(null);
    // Review G2-P9 — `navigator.clipboard` is absent outside a secure context (and `writeText` can throw synchronously):
    // every failure lands on "Copy failed", ⛔ an uncaught throw.
    let write: Promise<unknown>;
    try {
      const clipboard = typeof navigator === 'undefined' ? undefined : navigator.clipboard;
      write =
        clipboard === undefined || typeof clipboard.writeText !== 'function'
          ? Promise.reject(new Error('no clipboard'))
          : Promise.resolve(clipboard.writeText(pressed));
    } catch (err) {
      write = Promise.reject(err);
    }
    void write.then(
      () => settle(pressed, 'copied'),
      () => settle(pressed, 'failed'),
    );
  };
  return (
    <div className="flex items-center gap-2">
      <button type="button" className="rounded border px-2 py-1 text-xs" data-testid={testId} onClick={press}>
        {state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy failed — select the text' : 'Copy'}
      </button>
      {/* Review G2-P10 — the outcome is ANNOUNCED (a polite live region that exists before it changes). */}
      <span role="status" aria-live="polite" className="sr-only">
        {state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy failed — select the text' : ''}
      </span>
    </div>
  );
}

function subjectOf(p: AnnouncementPostEntry): string {
  if (p.occasion === 'last_day') return `Last day — ${p.lastDate ?? ''}`;
  return p.poolLabel === null ? 'A pool opened (its label could not be read)' : `Pool ${p.poolLabel} opened`;
}

export function AnnouncementPostsList({ data }: { data: AnnouncementPostsResponse }): ReactElement {
  if (data.posts.length === 0) return <p className="text-sm opacity-70">No pool openings or last days in the last 15 days.</p>;
  return (
    <div className="flex flex-col gap-3" data-testid="announcement-posts">
      {!data.enabled && <p className="text-sm opacity-70">The channels are off — switch them on to see the words to post to the WhatsApp Channel.</p>}
      <ul className="flex flex-col gap-3">
        {data.posts.map((p) => {
          // G2-P12 — the switch decides on the page too: ⛔ words or Copy while it is off, whatever the payload carries.
          const words = data.enabled ? p.words : null;
          const reason = p.reason !== null && STATES_WITH_REASON.has(p.telegramState) ? reasonLabel(p.reason) : null;
          return (
            <li key={`${p.occasion}:${p.subjectId}`} className="rounded border p-3" data-testid="announcement-post">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="font-medium">{subjectOf(p)}</span>
                <span className="opacity-70">
                  {TELEGRAM_STATE_LABEL[p.telegramState]}
                  {reason !== null && <span data-testid="announcement-post-reason"> — {reason}</span>}
                </span>
              </div>
              {words !== null && (
                <div className="mt-2 flex flex-col gap-2">
                  <pre className="whitespace-pre-wrap rounded bg-black/5 p-2 text-sm">{words}</pre>
                  <CopyButton text={words} testId={`copy-${p.occasion}-${p.subjectId}`} />
                </div>
              )}
              {data.enabled && words === null && !p.wordsUnavailable && (
                <p className="mt-2 text-sm opacity-70">No words to post — this cycle is not open.</p>
              )}
              {data.enabled && p.wordsUnavailable && (
                <p role="alert" className="mt-2 text-sm text-status-fail-fg">
                  The words for this post could not be built — the name or the pool&apos;s label could not be read. Try again later.
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
