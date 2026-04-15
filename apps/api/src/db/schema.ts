import {
  pgTable,
  text,
  integer,
  bigint,
  boolean,
  timestamp,
  jsonb,
  varchar,
  index,
  uniqueIndex,
  pgEnum,
} from 'drizzle-orm/pg-core';

// ── Enums ──────────────────────────────────────────────────

export const workspaceRoleEnum = pgEnum('workspace_role', ['owner', 'admin', 'member', 'viewer']);
export const telegramEntityTypeEnum = pgEnum('telegram_entity_type', ['group', 'supergroup', 'channel', 'bot']);
export const integrationStatusEnum = pgEnum('integration_status', ['pending', 'connected', 'error', 'disconnected']);
export const runStatusEnum = pgEnum('run_status', ['idle', 'dry_run', 'running', 'completed', 'failed', 'cancelled']);
export const stepStatusEnum = pgEnum('step_status', ['pending', 'running', 'completed', 'failed', 'skipped', 'awaiting_manual']);
export const riskLevelEnum = pgEnum('risk_level', ['low', 'medium', 'high', 'critical']);
export const skillRunStatusEnum = pgEnum('skill_run_status', ['pending', 'running', 'completed', 'failed']);

// ── Users ──────────────────────────────────────────────────

export const users = pgTable(
  'users',
  {
    id: text('id').primaryKey(),
    telegramUserId: bigint('telegram_user_id', { mode: 'number' }).notNull().unique(),
    telegramUsername: varchar('telegram_username', { length: 64 }),
    telegramFirstName: varchar('telegram_first_name', { length: 256 }).notNull(),
    telegramLastName: varchar('telegram_last_name', { length: 256 }),
    telegramPhotoUrl: text('telegram_photo_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    telegramIdx: uniqueIndex('users_telegram_user_id_idx').on(t.telegramUserId),
  }),
);

// ── Sessions ───────────────────────────────────────────────

export const sessions = pgTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    token: text('token').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    userAgent: text('user_agent'),
    ipAddress: varchar('ip_address', { length: 64 }),
  },
  (t) => ({
    tokenIdx: uniqueIndex('sessions_token_idx').on(t.token),
    userIdx: index('sessions_user_id_idx').on(t.userId),
  }),
);

// ── Workspaces ─────────────────────────────────────────────

export const workspaces = pgTable(
  'workspaces',
  {
    id: text('id').primaryKey(),
    name: varchar('name', { length: 128 }).notNull(),
    slug: varchar('slug', { length: 64 }).notNull().unique(),
    description: text('description'),
    ownerId: text('owner_id').notNull().references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    slugIdx: uniqueIndex('workspaces_slug_idx').on(t.slug),
    ownerIdx: index('workspaces_owner_id_idx').on(t.ownerId),
  }),
);

export const workspaceMembers = pgTable(
  'workspace_members',
  {
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    role: workspaceRoleEnum('role').notNull().default('member'),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: uniqueIndex('workspace_members_pk').on(t.workspaceId, t.userId),
  }),
);

// ── Telegram Entities ──────────────────────────────────────

export const telegramEntities = pgTable(
  'telegram_entities',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    telegramChatId: bigint('telegram_chat_id', { mode: 'number' }),
    telegramUsername: varchar('telegram_username', { length: 64 }),
    displayName: varchar('display_name', { length: 256 }).notNull(),
    entityType: telegramEntityTypeEnum('entity_type').notNull(),
    description: text('description'),
    memberCount: integer('member_count'),
    addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    workspaceIdx: index('telegram_entities_workspace_id_idx').on(t.workspaceId),
  }),
);

// ── Integrations ───────────────────────────────────────────

export const integrations = pgTable(
  'integrations',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    slug: varchar('slug', { length: 64 }).notNull(),
    displayName: varchar('display_name', { length: 128 }).notNull(),
    status: integrationStatusEnum('status').notNull().default('pending'),
    configMetadata: jsonb('config_metadata').notNull().default('{}'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    workspaceIdx: index('integrations_workspace_id_idx').on(t.workspaceId),
    uniqueSlug: uniqueIndex('integrations_workspace_slug_idx').on(t.workspaceId, t.slug),
  }),
);

// ── Plans ──────────────────────────────────────────────────

export const plans = pgTable(
  'plans',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    answers: jsonb('answers').notNull(),
    recommendedStack: jsonb('recommended_stack').notNull().default('[]'),
    steps: jsonb('steps').notNull().default('[]'),
    assetSpecs: jsonb('asset_specs').notNull().default('[]'),
    risks: jsonb('risks').notNull().default('[]'),
    permissions: jsonb('permissions').notNull().default('[]'),
    estimatedTotalMinutes: integer('estimated_total_minutes').notNull().default(0),
    manualStepCount: integer('manual_step_count').notNull().default(0),
    autoStepCount: integer('auto_step_count').notNull().default(0),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    approvedBy: text('approved_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    workspaceIdx: index('plans_workspace_id_idx').on(t.workspaceId),
  }),
);

// ── Execution Runs ─────────────────────────────────────────

export const executionRuns = pgTable(
  'execution_runs',
  {
    id: text('id').primaryKey(),
    planId: text('plan_id').notNull().references(() => plans.id),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    isDryRun: boolean('is_dry_run').notNull().default(true),
    status: runStatusEnum('status').notNull().default('idle'),
    stepResults: jsonb('step_results').notNull().default('[]'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    failedAt: timestamp('failed_at', { withTimezone: true }),
    triggeredBy: text('triggered_by').notNull().references(() => users.id),
    notes: text('notes'),
  },
  (t) => ({
    workspaceIdx: index('execution_runs_workspace_id_idx').on(t.workspaceId),
    planIdx: index('execution_runs_plan_id_idx').on(t.planId),
  }),
);

// ── Generated Assets ───────────────────────────────────────

export const generatedAssets = pgTable(
  'generated_assets',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    runId: text('run_id').references(() => executionRuns.id),
    assetType: varchar('asset_type', { length: 64 }).notNull(),
    name: varchar('name', { length: 256 }).notNull(),
    content: text('content').notNull(),
    variables: jsonb('variables').notNull().default('{}'),
    tone: varchar('tone', { length: 32 }).notNull(),
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    workspaceIdx: index('generated_assets_workspace_id_idx').on(t.workspaceId),
  }),
);

// ── Skill Runs ─────────────────────────────────────────────

export const skillRuns = pgTable(
  'skill_runs',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
    skillSlug: varchar('skill_slug', { length: 64 }).notNull(),
    planId: text('plan_id').references(() => plans.id),
    config: jsonb('config').notNull().default('{}'),
    output: jsonb('output').notNull().default('{}'),
    status: skillRunStatusEnum('status').notNull().default('pending'),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    error: text('error'),
  },
);

// ── Audit Events ───────────────────────────────────────────

export const auditEvents = pgTable(
  'audit_events',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id').references(() => workspaces.id),
    userId: text('user_id').notNull().references(() => users.id),
    action: varchar('action', { length: 128 }).notNull(),
    resourceType: varchar('resource_type', { length: 64 }).notNull(),
    resourceId: text('resource_id'),
    metadata: jsonb('metadata').notNull().default('{}'),
    riskLevel: riskLevelEnum('risk_level').notNull().default('low'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    workspaceIdx: index('audit_events_workspace_id_idx').on(t.workspaceId),
    userIdx: index('audit_events_user_id_idx').on(t.userId),
    actionIdx: index('audit_events_action_idx').on(t.action),
  }),
);

// ── Feature Flags ──────────────────────────────────────────

export const featureFlags = pgTable(
  'feature_flags',
  {
    id: text('id').primaryKey(),
    key: varchar('key', { length: 128 }).notNull().unique(),
    enabled: boolean('enabled').notNull().default(false),
    description: text('description'),
    metadata: jsonb('metadata').notNull().default('{}'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    updatedBy: text('updated_by').references(() => users.id),
  },
);

// ── Type inference ─────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type InsertSession = typeof sessions.$inferInsert;
export type Workspace = typeof workspaces.$inferSelect;
export type InsertWorkspace = typeof workspaces.$inferInsert;
export type WorkspaceMember = typeof workspaceMembers.$inferSelect;
export type TelegramEntity = typeof telegramEntities.$inferSelect;
export type Integration = typeof integrations.$inferSelect;
export type Plan = typeof plans.$inferSelect;
export type ExecutionRun = typeof executionRuns.$inferSelect;
export type GeneratedAsset = typeof generatedAssets.$inferSelect;
export type AuditEvent = typeof auditEvents.$inferSelect;
export type FeatureFlag = typeof featureFlags.$inferSelect;
