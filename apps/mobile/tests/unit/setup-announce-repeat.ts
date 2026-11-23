// Story 3.15b (DL6) — reset the per-text announcement counter (`lib/announce-repeat.ts`) before EVERY test. vitest isolates
// modules per FILE, not per test, so without this a text sent in one `it` would carry a trailing no-break space in the next.
// ⛔ Import `react-native` (or `lib/announce.ts`) here: this file runs before each test file's `vi.mock`, and would load the
// real module first.

import { beforeEach } from 'vitest'

import { resetAnnouncementRepeats } from '../../lib/announce-repeat'

beforeEach(() => {
  resetAnnouncementRepeats()
})
