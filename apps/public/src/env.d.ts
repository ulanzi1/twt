/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

// Vite `?raw` imports of YAML — Story 11a.2 (Task 2, Trap 3).
//
// `astro/client` types `?raw` for its own asset globs but not for a `.yaml` deep
// path out of a workspace package, so the FR-74 matrix import needs this. It is
// what makes the matrix's BYTES ship inside `dist/server/entry.mjs` instead of
// being read from a workspace path that the standalone Docker image does not copy.
declare module '*.yaml?raw' {
  const content: string;
  export default content;
}
