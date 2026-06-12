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
  const app = await buildServer(deps);

  const close = async (): Promise<void> => {
    await app.close();
    await deps.pool.end().catch(() => undefined);
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
