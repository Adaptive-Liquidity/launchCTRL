import { nanoid } from 'nanoid';
import { getDb, schema } from '../../db/index.js';
import { eq } from 'drizzle-orm';
import type { TelegramUser } from '../../auth/telegram.js';

export async function findOrCreateUser(telegramUser: TelegramUser) {
  const db = getDb();

  const existing = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.telegramUserId, telegramUser.id))
    .limit(1)
    .then((r) => r[0] ?? null);

  if (existing) {
    // Update profile info
    const updated = await db
      .update(schema.users)
      .set({
        telegramFirstName: telegramUser.first_name,
        telegramLastName: telegramUser.last_name,
        telegramUsername: telegramUser.username,
        telegramPhotoUrl: telegramUser.photo_url,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, existing.id))
      .returning()
      .then((r) => r[0] ?? existing);
    return updated;
  }

  const user = await db
    .insert(schema.users)
    .values({
      id: nanoid(),
      telegramUserId: telegramUser.id,
      telegramFirstName: telegramUser.first_name,
      telegramLastName: telegramUser.last_name,
      telegramUsername: telegramUser.username,
      telegramPhotoUrl: telegramUser.photo_url,
    })
    .returning()
    .then((r) => r[0]);

  if (!user) throw new Error('Failed to create user');
  return user;
}
