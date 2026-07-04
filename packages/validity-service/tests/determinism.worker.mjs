// Determinism-replay WORKER shim — Story 4.6 (Task 6; the AC2 P0 gate, real OS thread).
//
// Plain JS (NOT TS) on purpose: Node 22's native type-stripping loads a `.ts` worker but does NOT remap
// `.js`→`.ts` for its nested imports, and a bare `--import tsx` in worker execArgv does not register
// tsx's resolve hook. So this runs as plain JS, registers tsx AT RUNTIME (which DOES install the resolve
// hook), then dynamic-imports the type-checked TS run body (determinism-runner.ts). This is a REAL OS
// worker thread (D4-A) — genuine cross-thread scheduling nondeterminism the gate depends on.

import { register } from 'tsx/esm/api';
import { parentPort } from 'node:worker_threads';

register();

const { runBatch } = await import('./determinism-runner.ts');

parentPort.on('message', async (msg) => {
  const hashes = await runBatch(msg.runs, msg.baseSeed);
  parentPort.postMessage(hashes);
});
