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

module.exports = config;
