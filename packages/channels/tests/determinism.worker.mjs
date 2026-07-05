// Determinism-replay WORKER shim — Story 5.1 (Task 6; the AC5 P0 gate, real OS thread).
//
// Plain JS (NOT TS) on purpose: Node 22's native type-stripping loads a `.ts` worker but does NOT remap
// `.js`→`.ts` for its nested imports, and a bare `--import tsx` in worker execArgv does not register tsx's
// resolve hook. So this runs as plain JS, registers tsx AT RUNTIME (which DOES install the resolve hook),
// then dynamic-imports the type-checked TS run body (determinism-runner.ts). A REAL OS worker thread —
// genuine cross-thread scheduling the gate depends on. Mirrors packages/validity-service.

import { register } from 'tsx/esm/api';
import { parentPort } from 'node:worker_threads';

register();

const { runBatch } = await import('./determinism-runner.ts');

parentPort.on('message', (msg) => {
  const hashes = runBatch(msg.runs);
  parentPort.postMessage(hashes);
});
