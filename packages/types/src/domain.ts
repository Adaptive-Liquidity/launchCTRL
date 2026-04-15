// Core domain entity types shared across all packages

export type UserId = string & { readonly _brand: 'UserId' };
export type WorkspaceId = string & { readonly _brand: 'WorkspaceId' };
export type EntityId = string & { readonly _brand: 'EntityId' };
export type IntegrationId = string & { readonly _brand: 'IntegrationId' };
export type SkillPackId = string & { readonly _brand: 'SkillPackId' };
export type PlanId = string & { readonly _brand: 'PlanId' };
export type RunId = string & { readonly _brand: 'RunId' };
export type AssetId = string & { readonly _brand: 'AssetId' };
export type AuditEventId = string & { readonly _brand: 'AuditEventId' };

export type TelegramUserId = number;
export type TelegramChatId = number;

export interface User {
  id: UserId;
  telegramUserId: TelegramUserId;
  telegramUsername: string | null;
  telegramFirstName: string;
  telegramLastName: string | null;
  telegramPhotoUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface Workspace {
  id: WorkspaceId;
  name: string;
  slug: string;
  description: string | null;
  ownerId: UserId;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceMember {
  workspaceId: WorkspaceId;
  userId: UserId;
  role: WorkspaceRole;
  joinedAt: Date;
}

export type TelegramEntityType = 'group' | 'supergroup' | 'channel' | 'bot';

export interface TelegramEntity {
  id: EntityId;
  workspaceId: WorkspaceId;
  telegramChatId: TelegramChatId | null;
  telegramUsername: string | null;
  displayName: string;
  entityType: TelegramEntityType;
  description: string | null;
  memberCount: number | null;
  addedAt: Date;
  updatedAt: Date;
}

export type IntegrationSlug =
  | 'rose'
  | 'combot'
  | 'safeguard'
  | 'controllerbot'
  | 'chainfuel'
  | 'teleme'
  | 'buybot'
  | 'alertbot';

export type IntegrationStatus = 'pending' | 'connected' | 'error' | 'disconnected';

export interface Integration {
  id: IntegrationId;
  workspaceId: WorkspaceId;
  slug: IntegrationSlug;
  displayName: string;
  status: IntegrationStatus;
  configMetadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface SkillPackMeta {
  id: SkillPackId;
  slug: string;
  name: string;
  description: string;
  version: string;
  tags: string[];
  requiredIntegrations: IntegrationSlug[];
  conflictsWith: string[];
}

export type AssetType =
  | 'welcome_message'
  | 'rules_message'
  | 'anti_spam_notice'
  | 'ban_message'
  | 'appeal_message'
  | 'faq_note'
  | 'social_command_reply'
  | 'link_command_reply'
  | 'buy_command_reply'
  | 'announcement_template'
  | 'raid_mode_message'
  | 'crisis_mode_message'
  | 'support_instructions'
  | 'custom';

export interface GeneratedAsset {
  id: AssetId;
  workspaceId: WorkspaceId;
  runId: RunId | null;
  assetType: AssetType;
  name: string;
  content: string;
  variables: Record<string, string>;
  tone: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export type AuditAction =
  | 'workspace.created'
  | 'workspace.updated'
  | 'entity.added'
  | 'entity.removed'
  | 'integration.connected'
  | 'integration.disconnected'
  | 'plan.created'
  | 'plan.approved'
  | 'run.started'
  | 'run.completed'
  | 'run.failed'
  | 'asset.generated'
  | 'asset.updated'
  | 'asset.deleted'
  | 'skill.loaded'
  | 'flag.toggled';

export interface AuditEvent {
  id: AuditEventId;
  workspaceId: WorkspaceId | null;
  userId: UserId;
  action: AuditAction;
  resourceType: string;
  resourceId: string | null;
  metadata: Record<string, unknown>;
  riskLevel: 'low' | 'medium' | 'high';
  createdAt: Date;
}
