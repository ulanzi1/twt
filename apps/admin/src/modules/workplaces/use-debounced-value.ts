// The workplace pages' search debounce (Story 6.36c, code review round 2) — each keystroke used to fire its own list GET,
// so every keystroke wrote an `admin_workplace.list_read` audit line and flashed "Searching…". The value settles
// `SEARCH_DEBOUNCE_MS` after the LAST change; the input itself stays immediate (it shows the raw text).
// ⛔ A shared helper: the admin app has ⛔ other debounced search yet (memory: no premature package).

import { useEffect, useState } from 'react';

export const SEARCH_DEBOUNCE_MS = 300;

export function useDebouncedValue<T>(value: T, ms: number = SEARCH_DEBOUNCE_MS): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return settled;
}
