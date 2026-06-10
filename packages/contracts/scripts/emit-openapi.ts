// packages/contracts/scripts/emit-openapi.ts
//
// Build-time OpenAPI 3.1 spec emission from the Zod schemas in packages/contracts/.
// Per architecture §3.2 line 1862-1865: "Generator output committed to the
// repository (openapi/v1.yaml or equivalent). CI verifies that re-running the
// generator produces byte-identical output."
//
// At Story 1.4 the only registered endpoint is the toy _common/health contract;
// substantive endpoints land at Story 1.9+ when apps/api/ substantively populates.
// The script's job at Story 1.4 is to STRUCTURALLY PROVE the pipeline.

import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import {
  OpenAPIRegistry,
  OpenApiGeneratorV31,
  extendZodWithOpenApi,
} from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import * as yaml from 'yaml';

extendZodWithOpenApi(z);

import { HealthResponse } from '../src/_common/health.js';
import { ErrorResponse } from '../src/_common/errors.js';

const registry = new OpenAPIRegistry();

registry.register('HealthResponse', HealthResponse);
registry.register('ErrorResponse', ErrorResponse);

registry.registerPath({
  method: 'get',
  path: '/api/v1/_meta/health',
  summary: 'Service health probe',
  description:
    'Substrate-proof endpoint authored at Story 1.4. ' +
    'Production /_meta/health lives at apps/api/ per Story 1.9+.',
  tags: ['_meta'],
  responses: {
    200: {
      description: 'Service is reachable',
      content: { 'application/json': { schema: HealthResponse } },
    },
    503: {
      description: 'Service is degraded',
      content: { 'application/json': { schema: ErrorResponse } },
    },
  },
});

const generator = new OpenApiGeneratorV31(registry.definitions);

const doc = generator.generateDocument({
  openapi: '3.1.0',
  info: {
    title: 'TWT API v1',
    version: '0.0.0-substrate',
    description:
      'TWT API contract surface — generated from Zod schemas in packages/contracts/. ' +
      'Story 1.4 substrate; substantive routes land at apps/api/ Stories 1.9+.',
  },
  servers: [{ url: 'https://twt.local/api/v1', description: 'placeholder' }],
});

const yamlOutput = yaml.stringify(doc, {
  // Deterministic emission: yaml package preserves insertion order; the
  // generator's order is fixed by registration sequence. lineWidth: 0 disables
  // line-wrapping so re-runs in different terminal widths produce byte-identical
  // output.
  lineWidth: 0,
});

const here = path.dirname(fileURLToPath(import.meta.url));
const target = path.resolve(here, '../../../openapi/v1.yaml');

fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, yamlOutput, { encoding: 'utf8' });

console.log(`✓ openapi/v1.yaml written (${yamlOutput.length} bytes)`);
