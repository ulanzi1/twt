// Which open visits on the ground-inspection page hold answers to the family's questions that are ⛔ saved yet — and which
// are being completed (Story 6.32, code review R1; IQ8 (A) "never lose what was typed to a momentary drop").
//
//   · The PANEL reports its visit as unsaved while a save is in flight, queued or failed (and ⛔ unsaved on unmount); it
//     locks its inputs while its visit is being COMPLETED, so ⛔ an answer is sent after the visit closes.
//   · The PAGE refuses to load another claim while any visit is unsaved (the cards would unmount and drop the queue).
//   · The completion WAITS for its visit's saves before it goes out, and offers to complete WITHOUT them — completing is
//     always possible, with ZERO answers too (I1: ⛔ an answer is ever required, ⛔ the completion's readiness reads this).
// ⛔ Browser storage (TR13) — this is in-memory React state only.

import type { ReactElement, ReactNode } from 'react';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';

export interface UnsavedAnswers {
  /** The visits (`groundInspectionId`) with answers ⛔ saved yet. */
  readonly unsaved: ReadonlySet<string>;
  /** The visits whose completion is in flight. */
  readonly completing: ReadonlySet<string>;
  readonly reportUnsaved: (groundInspectionId: string, unsaved: boolean) => void;
  readonly reportCompleting: (groundInspectionId: string, completing: boolean) => void;
}

const EMPTY: ReadonlySet<string> = new Set();
/** Outside a provider (a panel rendered alone): nothing is tracked. */
const NONE: UnsavedAnswers = { unsaved: EMPTY, completing: EMPTY, reportUnsaved: () => {}, reportCompleting: () => {} };

const UnsavedAnswersContext = createContext<UnsavedAnswers>(NONE);

export function useUnsavedAnswers(): UnsavedAnswers {
  return useContext(UnsavedAnswersContext);
}

/** A set with `id` in or out — the SAME set when nothing changes (⛔ a re-render when the same state is said twice). */
function toggled(set: ReadonlySet<string>, id: string, on: boolean): ReadonlySet<string> {
  if (set.has(id) === on) return set;
  const next = new Set(set);
  if (on) next.add(id);
  else next.delete(id);
  return next;
}

export function UnsavedAnswersProvider({ children }: { children: (value: UnsavedAnswers) => ReactNode }): ReactElement {
  const [unsaved, setUnsaved] = useState<ReadonlySet<string>>(EMPTY);
  const [completing, setCompleting] = useState<ReadonlySet<string>>(EMPTY);
  const reportUnsaved = useCallback((id: string, on: boolean) => setUnsaved((s) => toggled(s, id, on)), []);
  const reportCompleting = useCallback((id: string, on: boolean) => setCompleting((s) => toggled(s, id, on)), []);
  const value = useMemo(() => ({ unsaved, completing, reportUnsaved, reportCompleting }), [unsaved, completing, reportUnsaved, reportCompleting]);
  return <UnsavedAnswersContext.Provider value={value}>{children(value)}</UnsavedAnswersContext.Provider>;
}
