// @fastify/cookie registration (AC-3 — session prerequisite).
//
// @fastify/session requires @fastify/cookie registered first (it reads/writes the
// session-id cookie through it). Kept in its own plugin dir per the §3 tree.

import fastifyCookie from '@fastify/cookie';
import type { FastifyInstance } from 'fastify';

export async function registerCookie(app: FastifyInstance): Promise<void> {
  await app.register(fastifyCookie);
}
