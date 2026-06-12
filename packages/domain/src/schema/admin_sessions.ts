// `admin_sessions` — the server-side @fastify/session store table (Story 1.9, AC-3).
//
// GLOBAL (carve-out family, R2) — a session is keyed by the human's session id, not
// a Pariwar. express-session-compatible shape (`sid`, `sess`, `expire`) consumed by
// apps/api's PgSessionStore (raw parameterized SQL on the shared pool — Dev Note
// "Fastify session store"; connect-pg-simple avoided per fastify/help #604).
// Server-side revocation = DELETE the row (§2.4); the FR-56 suspension cascade
// deletes every row where `user_id` matches the suspended admin (indexed, FK-enforced).
//
// `user_id` is nullable — sessions exist before auth (unauthenticated visitors);
// PgSessionStore.set() writes it when present in the session payload post-login.
// ON DELETE CASCADE means deleting a users row auto-revokes all their sessions.

import { index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import type { UserId } from '../ids/index.js';
import { users } from './users.js';

export const adminSessions = pgTable(
  'admin_sessions',
  {
    // The session id (the cookie value's signed payload). PK.
    sid: text('sid').primaryKey(),

    // The serialized session object (cookie meta + auth state: userId, elevatedUntil…).
    sess: jsonb('sess').notNull(),

    // Absolute expiry the GET path filters on (idle/rolling expiry; §2.4).
    expire: timestamp('expire', { withTimezone: true, mode: 'date' }).notNull(),

    // Nullable FK → users.id — NULL for pre-auth sessions; set on login.
    // Indexed for the FR-56 suspension DELETE; ON DELETE CASCADE auto-revokes on user delete.
    userId: uuid('user_id')
      .$type<UserId>()
      .references(() => users.id, { onDelete: 'cascade' }),
  },
  (t) => [
    index('admin_sessions_expire_idx').on(t.expire),
    index('admin_sessions_user_id_idx').on(t.userId),
  ],
);

export type AdminSessionRow = typeof adminSessions.$inferSelect;
export type AdminSessionInsert = typeof adminSessions.$inferInsert;
