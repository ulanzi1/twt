// `admin_sessions` — the server-side @fastify/session store table (Story 1.9, AC-3).
//
// GLOBAL (carve-out family, R2) — a session is keyed by the human's session id, not
// a Pariwar. express-session-compatible shape (`sid`, `sess`, `expire`) consumed by
// apps/api's PgSessionStore (raw parameterized SQL on the shared pool — Dev Note
// "Fastify session store"; connect-pg-simple avoided per fastify/help #604).
// Server-side revocation = DELETE the row (§2.4); the FR-56 suspension cascade
// deletes every row whose `sess->>'userId'` matches the suspended admin.

import { index, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const adminSessions = pgTable(
  'admin_sessions',
  {
    // The session id (the cookie value's signed payload). PK.
    sid: text('sid').primaryKey(),

    // The serialized session object (cookie meta + auth state: userId, elevatedUntil…).
    sess: jsonb('sess').notNull(),

    // Absolute expiry the GET path filters on (idle/rolling expiry; §2.4).
    expire: timestamp('expire', { withTimezone: true, mode: 'date' }).notNull(),
  },
  (t) => [
    // Supports the expiry sweep / range scans.
    index('admin_sessions_expire_idx').on(t.expire),
  ],
);

export type AdminSessionRow = typeof adminSessions.$inferSelect;
export type AdminSessionInsert = typeof adminSessions.$inferInsert;
