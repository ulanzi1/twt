// Learn more https://docs.expo.io/guides/customizing-metro
// Monorepo-aware Metro config per https://docs.expo.dev/guides/monorepos/ —
// watchFolders covers the workspace root so Metro picks up workspace packages;
// nodeModulesPaths resolves through both the local app and the workspace-root
// node_modules pnpm hoists shared deps to. The apps/mobile/README.md line 1
// anticipated this change at Story 0.14 prototype-build time.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

config.resolver.disableHierarchicalLookup = true;

// Workspace packages are TypeScript source (their `exports` point at `./src/*.ts`)
// and use NodeNext-style relative imports that carry a `.js` extension (e.g.
// `import { DEFAULT_LOCALE } from './locale.js'` in @twt/i18n). Metro's default
// resolver appends source extensions to the literal specifier (`locale.js.ts`)
// rather than substituting them, so it can't map `./locale.js` -> `locale.ts`.
// Fall back to the `.ts`/`.tsx` sibling only when the `.js` specifier itself does
// not resolve — real `.js` files in node_modules are unaffected.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    (moduleName.startsWith('./') || moduleName.startsWith('../')) &&
    moduleName.endsWith('.js')
  ) {
    try {
      return context.resolveRequest(context, moduleName, platform);
    } catch {
      const base = moduleName.slice(0, -'.js'.length);
      for (const ext of ['.ts', '.tsx']) {
        try {
          return context.resolveRequest(context, base + ext, platform);
        } catch {
          // try the next candidate extension
        }
      }
      // No TS sibling either — re-run so Metro throws its original error.
      return context.resolveRequest(context, moduleName, platform);
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
