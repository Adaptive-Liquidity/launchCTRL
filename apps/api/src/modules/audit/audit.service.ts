import { nanoid } from 'nanoid';
import { getDb, schema } from '../../db/index.js';

export async function writeAuditEvent(opts: {
  userId: string;
  workspaceId?: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  metadata: Record<string, unknown>;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}) {
  const db = getDb();
  await db.insert(schema.auditEvents).values({
    id: nanoid(),
    userId: opts.userId,
    workspaceId: opts.workspaceId,
    action: opts.action,
    resourceType: opts.resourceType,
    resourceId: opts.resourceId,
    metadata: opts.metadata,
    riskLevel: opts.riskLevel,
  });
}
