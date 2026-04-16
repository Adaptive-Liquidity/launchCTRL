import { loadEnv } from '@launchctrl/config';
import { getDb, schema } from './index.js';
import { nanoid } from 'nanoid';

async function main() {
  loadEnv();
  const db = getDb();

  console.log('Seeding database...');

  // Seed a demo user
  const userId = nanoid();
  await db.insert(schema.users).values({
    id: userId,
    telegramUserId: 123456789,
    telegramUsername: 'demo_user',
    telegramFirstName: 'Demo',
    telegramLastName: 'User',
  }).onConflictDoNothing();

  // Seed a demo workspace
  const workspaceId = nanoid();
  await db.insert(schema.workspaces).values({
    id: workspaceId,
    name: 'Demo Workspace',
    slug: 'demo-workspace',
    description: 'Demo workspace for development',
    ownerId: userId,
  }).onConflictDoNothing();

  // Add owner as member
  await db.insert(schema.workspaceMembers).values({
    workspaceId,
    userId,
    role: 'owner',
  }).onConflictDoNothing();

  // Seed feature flags
  const flags = [
    { id: nanoid(), key: 'wild_mode', enabled: false, description: 'Enable WILD phase features' },
    { id: nanoid(), key: 'advanced_automation', enabled: false, description: 'Enable advanced automation features' },
    { id: nanoid(), key: 'combot_api', enabled: false, description: 'Enable Combot API integration' },
  ];

  for (const flag of flags) {
    await db.insert(schema.featureFlags).values(flag).onConflictDoNothing();
  }

  // Seed demo telegram entity
  await db.insert(schema.telegramEntities).values({
    id: nanoid(),
    workspaceId,
    displayName: 'My Token Community',
    entityType: 'supergroup',
    description: 'Main community group',
    memberCount: 0,
  }).onConflictDoNothing();

  console.log('Seed complete.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
