// Story 3.13 code review R5-P1 / R5-P2 — ONE focus rule for the identity-check pages: when the element staff had focused inside
// the page is TAKEN AWAY by a render (a row that left the list on a re-read, a press or a form that went with the data, a list
// swapped for its error line), focus moves to the page's own target — ⛔ to `<body>`. It is keyed to WHERE FOCUS IS, ⛔ to a
// remembered read time (round 5: a press-time `dataUpdatedAt` settled early on any read that landed mid-press, settled at once on
// a queue already in error, and pulled focus off whatever staff had moved to). Focus that is on ANY live element — another row,
// "Previous", a form field, the console's navigation — is ⛔ moved.

import type { RefObject } from 'react';
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

export interface FocusRescue {
  /** Move focus to `el` (a page-chosen target) — remembered as placed by the page, ⛔ by staff. */
  readonly place: (el: HTMLElement | null) => void;
  /** Focus is nowhere staff put it: on the body, on an element no longer in the page, or where this page last PLACED it. */
  readonly isAdrift: () => boolean;
}

/**
 * `rootRef` — the page (only focus INSIDE it is watched). `target` — where focus goes when the focused element was removed, asked
 * at that moment (the first that exists: e.g. the list, else the error line, else the heading). Runs after EVERY commit, before
 * the page's own effects, so an effect that moves focus on purpose (the saved line, a refusal) still has the last word.
 */
export function useFocusRescue(rootRef: RefObject<HTMLElement | null>, target: () => HTMLElement | null): FocusRescue {
  // The element that last took focus inside the page (by staff or placed here), or `null` once focus went outside it.
  const last = useRef<Element | null>(null);
  // The element THIS hook (or the page through `place`) last focused — `null` again as soon as staff move focus themselves.
  const placed = useRef<Element | null>(null);
  const placing = useRef(false);

  useEffect(() => {
    const onFocusIn = (e: FocusEvent): void => {
      const el = e.target instanceof Element ? e.target : null;
      if (!placing.current) placed.current = null;
      last.current = el !== null && rootRef.current?.contains(el) === true ? el : null;
    };
    document.addEventListener('focusin', onFocusIn);
    return () => document.removeEventListener('focusin', onFocusIn);
  }, [rootRef]);

  const place = useCallback((el: HTMLElement | null): void => {
    if (el === null) return;
    placing.current = true;
    try {
      el.focus();
    } finally {
      placing.current = false;
    }
    placed.current = el;
    last.current = el;
  }, []);

  const isAdrift = useCallback((): boolean => {
    const a = document.activeElement;
    return a === null || a === document.body || !a.isConnected || (placed.current !== null && a === placed.current);
  }, []);

  // ⚠ No dependency list: every commit is checked (a re-read, a refusal, a page swap — whatever removed the element).
  useLayoutEffect(() => {
    const prev = last.current;
    if (prev === null || prev.isConnected) return;
    const a = document.activeElement;
    // Focus is on a live element (staff moved on, or the page placed it): ⛔ moved.
    if (a !== null && a !== document.body && a.isConnected) {
      last.current = rootRef.current?.contains(a) === true ? a : null;
      return;
    }
    const el = target();
    if (el === null) {
      last.current = null;
      return;
    }
    place(el);
  });

  return { place, isAdrift };
}
