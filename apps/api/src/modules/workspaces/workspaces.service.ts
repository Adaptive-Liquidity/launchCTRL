import { nanoid } from 'nanoid';
import { getDb, schema } from '../../db/index.js';
import { eq } from 'drizzle-orm';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 64)
    + '-' + nanoid(6);
}

export async function createWorkspace(opts: {
  name: string;
  description?: string;
  ownerId: string;
}) {
  const db = getDb();
  const id = nanoid();
  const slug = slugify(opts.name);

  const workspace = await db
    .insert(schema.workspaces)
    .values({
      id,
      name: opts.name,
      slug,
      description: opts.description,
      ownerId: opts.ownerId,
    })
    .returning()
    .then((r) => r[0]);

  if (!workspace) throw new Error('Failed to create workspace');

  // Add owner as member
  await db.insert(schema.workspaceMembers).values({
    workspaceId: id,
    userId: opts.ownerId,
    role: 'owner',
  });

  return workspace;
}

export async function getWorkspacesForUser(userId: string) {
  const db = getDb();
  const members = await db
    .select({ workspace: schema.workspaces, role: schema.workspaceMembers.role })
    .from(schema.workspaceMembers)
    .innerJoin(schema.workspaces, eq(schema.workspaceMembers.workspaceId, schema.workspaces.id))
    .where(eq(schema.workspaceMembers.userId, userId));

  return members.map((m) => ({ ...m.workspace, role: m.role }));
}

export async function getWorkspaceById(id: string) {
  const db = getDb();
  return db.select().from(schema.workspaces).where(eq(schema.workspaces.id, id)).limit(1).then((r) => r[0] ?? null);
}

export async function addEntityToWorkspace(opts: {
  workspaceId: string;
  displayName: string;
  entityType: 'group' | 'supergroup' | 'channel' | 'bot';
  telegramChatId?: number;
  telegramUsername?: string;
  description?: string;
}) {
  const db = getDb();
  const entity = await db
    .insert(schema.telegramEntities)
    .values({
      id: nanoid(),
      ...opts,
    })
    .returning()
    .then((r) => r[0]);

  return entity;
}

export async function getWorkspaceEntities(workspaceId: string) {
  const db = getDb();
  return db
    .select()
    .from(schema.telegramEntities)
    .where(eq(schema.telegramEntities.workspaceId, workspaceId));
}
