import { nanoid } from 'nanoid';
import { getDb, schema } from '../db/index.js';
import { getEnv } from '@launchctrl/config';
import { eq, and, gt, isNull } from 'drizzle-orm';

export interface CreateSessionOptions {
  userId: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface SessionRecord {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
}

export async function createSession(opts: CreateSessionOptions): Promise<SessionRecord> {
  const db = getDb();
  const env = getEnv();

  const token = nanoid(64);
  const expiryDays = parseInt(env.JWT_EXPIRY.replace('d', ''), 10) || 7;
  const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

  const session = await db
    .insert(schema.sessions)
    .values({
      id: nanoid(),
      userId: opts.userId,
      token,
      expiresAt,
      userAgent: opts.userAgent,
      ipAddress: opts.ipAddress,
    })
    .returning()
    .then((rows) => rows[0]);

  if (!session) throw new Error('Failed to create session');

  return {
    id: session.id,
    userId: session.userId,
    token: session.token,
    expiresAt: session.expiresAt,
  };
}

export async function getSessionByToken(token: string): Promise<SessionRecord | null> {
  const db = getDb();
  const now = new Date();

  const session = await db
    .select()
    .from(schema.sessions)
    .where(
      and(
        eq(schema.sessions.token, token),
        gt(schema.sessions.expiresAt, now),
        isNull(schema.sessions.revokedAt),
      ),
    )
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!session) return null;

  // Update last used
  await db
    .update(schema.sessions)
    .set({ lastUsedAt: now })
    .where(eq(schema.sessions.id, session.id));

  return {
    id: session.id,
    userId: session.userId,
    token: session.token,
    expiresAt: session.expiresAt,
  };
}

export async function revokeSession(token: string): Promise<void> {
  const db = getDb();
  await db
    .update(schema.sessions)
    .set({ revokedAt: new Date() })
    .where(eq(schema.sessions.token, token));
}

export async function revokeAllUserSessions(userId: string): Promise<void> {
  const db = getDb();
  await db
    .update(schema.sessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(schema.sessions.userId, userId), isNull(schema.sessions.revokedAt)));
}
