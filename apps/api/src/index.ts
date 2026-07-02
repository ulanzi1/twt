// apps/api entry point + boot guard (AC-5, Task 1.5).
//
// Re-exports `buildServer` (the test surface imports it from here or server.ts)
// and, when run directly (`node dist/index.js` / `tsx src/index.ts`), wires
// production deps and listens. The boot guard prevents `main()` from running when
// the module is imported (e.g. by tests).

import 'dotenv/config';
import { pathToFileURL } from 'node:url';

import { loadConfig } from './config.js';
import { createDeps } from './deps.js';
import { buildServer } from './server.js';

export { buildServer } from './server.js';
export type { AppDeps } from './context.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const deps = await createDeps(config);
  // End the service pool only when it is a DISTINCT pool (prod SERVICE_DATABASE_URL);
  // in dev/CI it aliases deps.pool, so ending it once via deps.pool suffices.
  const endPools = async (): Promise<void> => {
    // Drain the send-only data-export queue client (Story 3.11) before the pools.
    await deps.dataExportQueue.close?.().catch(() => undefined);
    await deps.pool.end().catch(() => undefined);
    if (deps.servicePool !== deps.pool) {
      await deps.servicePool.end().catch(() => undefined);
    }
  };

  let app;
  try {
    app = await buildServer(deps);
  } catch (err) {
    await endPools();
    throw err;
  }

  let closing = false;
  const close = async (): Promise<void> => {
    if (closing) return;
    closing = true;
    await app.close();
    await endPools();
  };
  process.on('SIGTERM', () => void close().then(() => process.exit(0)));
  process.on('SIGINT', () => void close().then(() => process.exit(0)));

  await app.listen({ port: config.port, host: '0.0.0.0' });
}

// Run only when executed as the entry module, never when imported (tests).
const invokedDirectly =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  main().catch((err: unknown) => {
    console.error('[api] fatal boot error:', err);
    process.exit(1);
  });
}
