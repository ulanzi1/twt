// Story 11b.4 (AC6, Task 5.5) — ⛔ no module in the memorial flow can import an LLM / AI SDK: the dependency maps of every
// package the flow touches carry ⛔ none. Green on write today; the planted-violation leg proves the checker has teeth.
// (A v2 AI feature — help writing, translation — would be an explicit family opt-in with its own Panel question; ⛔ built.)

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

const PACKAGES = [
  'apps/api',
  'apps/admin',
  'apps/mobile',
  'packages/domain',
  'packages/ui',
  'packages/contracts',
  'packages/api-client',
  'packages/platform-adapters',
  'packages/i18n',
] as const;

/** An AI SDK name: exact names, or a scope / prefix family. */
function isAiDependency(name: string): boolean {
  return (
    name === 'openai' ||
    name === 'ai' ||
    name === '@google/generative-ai' ||
    name === '@google/genai' ||
    name.startsWith('@anthropic-ai/') ||
    name.startsWith('@ai-sdk/') ||
    name.startsWith('langchain') ||
    name.startsWith('@langchain/')
  );
}

function aiDependenciesOf(pkg: Record<string, unknown>): string[] {
  const out: string[] = [];
  for (const field of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
    const map = pkg[field];
    if (map && typeof map === 'object') out.push(...Object.keys(map).filter(isAiDependency));
  }
  return out;
}

describe('AC6 — ⛔ AI SDK in any package the memorial flow touches', () => {
  it.each(PACKAGES)('%s', (dir) => {
    const pkg = JSON.parse(readFileSync(path.join(repoRoot, dir, 'package.json'), 'utf-8')) as Record<string, unknown>;
    expect(aiDependenciesOf(pkg)).toEqual([]);
  });

  it('the checker has teeth (planted violations)', () => {
    const planted = {
      dependencies: { '@anthropic-ai/sdk': '1', openai: '4', zod: '3' },
      devDependencies: { '@ai-sdk/openai': '1', langchain: '0', ai: '3' },
      peerDependencies: { '@google/genai': '1', '@google/generative-ai': '1' },
    };
    expect(aiDependenciesOf(planted).sort()).toEqual(
      ['@ai-sdk/openai', '@anthropic-ai/sdk', '@google/genai', '@google/generative-ai', 'ai', 'langchain', 'openai'].sort(),
    );
    expect(isAiDependency('aide')).toBe(false);
  });
});
