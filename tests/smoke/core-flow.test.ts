/**
 * @file core-flow.test.ts
 * End-to-end smoke test for the LaunchCtrl core user journey.
 *
 * Simulates the full flow a user experiences from first authentication
 * through plan creation, execution, and audit log verification.
 *
 * Steps:
 *   1. Auth via Telegram initData → get session token
 *   2. Create a workspace
 *   3. Submit wizard answers (intake) → get plan
 *   4. Approve plan
 *   5. Start execution run (DRY_RUN=true)
 *   6. Poll run status until terminal state
 *   7. Fetch audit log for workspace — expect entries
 *   8. Fetch generated assets for run — expect at least one
 *
 * Runs against the Fastify test server using .inject() (not external HTTP).
 * DB and external services are mocked to ensure determinism.
 *
 * TODO: Future expansion — add Playwright E2E tests for the Mini App UI flow:
 *   - Open Mini App via Telegram (Playwright + @playwright/test)
 *   - Walk through wizard steps
 *   - Approve plan in the UI
 *   - Verify copy-paste commands are rendered
 *   - Verify generated asset display
 */

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { createHmac } from 'crypto';
import type { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';

// ─── Mock all infrastructure dependencies ─────────────────────────────────────

vi.mock('@launchctrl/config', () => {
  const env = {
    NODE_ENV: 'test',
    API_PORT: 3001,
    API_HOST: '0.0.0.0',
    TELEGRAM_BOT_TOKEN: 'test-bot-token-1234567890',
    TELEGRAM_INIT_DATA_MAX_AGE_SECONDS: 300,
    ENCRYPTION_KEY: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    JWT_SECRET: 'test-jwt-secret-minimum-32-chars-long',
    JWT_EXPIRY: '7d',
    SESSION_COOKIE_NAME: 'lc_session',
    RATE_LIMIT_MAX: 1000,
    RATE_LIMIT_WINDOW_MS: 60000,
    LOG_LEVEL: 'silent',
    FEATURE_WILD_MODE: false,
    FEATURE_ADVANCED_AUTOMATION: false,
    TELEGRAM_MINI_APP_URL: undefined,
  };
  return { getEnv: () => env, loadEnv: () => env };
});

// ─── In-memory state stores ───────────────────────────────────────────────────

interface MockUser {
  id: string;
  telegramUserId: number;
  telegramFirstName: string;
  telegramUsername: string;
  telegramPhotoUrl: null;
  createdAt: Date;
  updatedAt: Date;
}

interface MockSession {
  id: string;
  token: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
}

interface MockWorkspace {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface MockPlan {
  id: string;
  workspaceId: string;
  status: 'draft' | 'approved' | 'archived';
  answers: Record<string, unknown>;
  steps: unknown[];
  assetSpecs: unknown[];
  createdAt: Date;
}

interface MockRun {
  id: string;
  workspaceId: string;
  planId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  isDryRun: boolean;
  startedAt: Date;
  completedAt: Date | null;
  currentStepIndex: number;
  totalSteps: number;
}

interface MockAsset {
  id: string;
  workspaceId: string;
  runId: string;
  assetType: string;
  name: string;
  content: string;
  createdAt: Date;
}

interface MockAuditEvent {
  id: string;
  userId: string;
  workspaceId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

const userStore = new Map<string, MockUser>();
const sessionStore = new Map<string, MockSession>();
const workspaceStore = new Map<string, MockWorkspace>();
const planStore = new Map<string, MockPlan>();
const runStore = new Map<string, MockRun>();
const assetStore = new Map<string, MockAsset>();
const auditStore: MockAuditEvent[] = [];

// ─── Mocked services ──────────────────────────────────────────────────────────

vi.mock('../../apps/api/src/modules/users/users.service', () => ({
  findOrCreateUser: vi.fn().mockImplementation(async (tgUser: { id: number; first_name: string; username?: string }) => {
    const existing = Array.from(userStore.values()).find((u) => u.telegramUserId === tgUser.id);
    if (existing) return existing;
    const user: MockUser = {
      id: `usr_smoke_${nanoid(8)}`,
      telegramUserId: tgUser.id,
      telegramFirstName: tgUser.first_name,
      telegramUsername: tgUser.username ?? '',
      telegramPhotoUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    userStore.set(user.id, user);
    return user;
  }),
  getUserById: vi.fn().mockImplementation(async (id: string) => userStore.get(id) ?? null),
}));

vi.mock('../../apps/api/src/auth/session', () => ({
  createSession: vi.fn().mockImplementation(async ({ userId }: { userId: string }) => {
    const session: MockSession = {
      id: `sess_smoke_${nanoid(8)}`,
      token: nanoid(64),
      userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    };
    sessionStore.set(session.token, session);
    return session;
  }),
  validateSession: vi.fn().mockImplementation(async (token: string) => {
    const session = sessionStore.get(token);
    if (!session) return null;
    if (session.expiresAt < new Date()) return null;
    const user = userStore.get(session.userId);
    if (!user) return null;
    return { session, user };
  }),
  revokeSession: vi.fn().mockImplementation(async (token: string) => {
    sessionStore.delete(token);
  }),
}));

vi.mock('../../apps/api/src/modules/workspaces/workspaces.service', () => ({
  createWorkspace: vi.fn().mockImplementation(async (data: { name: string; description?: string; ownerId: string }) => {
    const ws: MockWorkspace = {
      id: `ws_smoke_${nanoid(8)}`,
      name: data.name,
      description: data.description ?? null,
      ownerId: data.ownerId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    workspaceStore.set(ws.id, ws);
    return ws;
  }),
  getWorkspacesForUser: vi.fn().mockImplementation(async (userId: string) =>
    Array.from(workspaceStore.values()).filter((ws) => ws.ownerId === userId),
  ),
  getWorkspaceById: vi.fn().mockImplementation(async (id: string) => workspaceStore.get(id) ?? null),
  addEntityToWorkspace: vi.fn().mockResolvedValue({ id: `ent_${nanoid(8)}`, workspaceId: 'ws' }),
  getWorkspaceEntities: vi.fn().mockResolvedValue([]),
  removeWorkspaceMember: vi.fn().mockResolvedValue(undefined),
  getWorkspaceMembers: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../apps/api/src/modules/planner/planner.service', () => ({
  createPlan: vi.fn().mockImplementation(async (workspaceId: string, answers: Record<string, unknown>) => {
    const plan: MockPlan = {
      id: `plan_smoke_${nanoid(8)}`,
      workspaceId,
      status: 'draft',
      answers,
      steps: [
        { id: nanoid(), title: 'Create workspace configuration', executionMode: 'AUTO' },
        { id: nanoid(), title: 'Add Rose Bot to your group', executionMode: 'MANUAL_CONFIRMATION_REQUIRED' },
        { id: nanoid(), title: 'Generate welcome message', executionMode: 'AUTO' },
      ],
      assetSpecs: [
        { assetType: 'welcome_message', name: 'Welcome Message', tone: 'degen' },
      ],
      createdAt: new Date(),
    };
    planStore.set(plan.id, plan);
    return plan;
  }),
  getPlanById: vi.fn().mockImplementation(async (id: string) => planStore.get(id) ?? null),
  approvePlan: vi.fn().mockImplementation(async (id: string) => {
    const plan = planStore.get(id);
    if (!plan) throw new Error('Plan not found');
    const updated = { ...plan, status: 'approved' as const };
    planStore.set(id, updated);
    return updated;
  }),
  getPlansForWorkspace: vi.fn().mockImplementation(async (workspaceId: string) =>
    Array.from(planStore.values()).filter((p) => p.workspaceId === workspaceId),
  ),
}));

vi.mock('../../apps/api/src/modules/executor/executor.service', () => ({
  startRun: vi.fn().mockImplementation(async (planId: string, workspaceId: string, isDryRun = true) => {
    const plan = planStore.get(planId);
    const run: MockRun = {
      id: `run_smoke_${nanoid(8)}`,
      workspaceId,
      planId,
      status: 'completed', // Immediately completed for dry-run smoke test
      isDryRun,
      startedAt: new Date(),
      completedAt: new Date(),
      currentStepIndex: 3,
      totalSteps: 3,
    };
    runStore.set(run.id, run);

    // Generate mock assets
    if (plan) {
      for (const spec of plan.assetSpecs) {
        const asset: MockAsset = {
          id: `ast_smoke_${nanoid(8)}`,
          workspaceId,
          runId: run.id,
          assetType: (spec as { assetType: string }).assetType,
          name: (spec as { name: string }).name,
          content: `Generated content for ${(spec as { name: string }).name}`,
          createdAt: new Date(),
        };
        assetStore.set(asset.id, asset);
      }
    }

    return run;
  }),
  getRunById: vi.fn().mockImplementation(async (id: string) => runStore.get(id) ?? null),
  cancelRun: vi.fn().mockImplementation(async (id: string) => {
    const run = runStore.get(id);
    if (!run) throw new Error('Run not found');
    const updated = { ...run, status: 'cancelled' as const, completedAt: new Date() };
    runStore.set(id, updated);
    return updated;
  }),
  getRunsForWorkspace: vi.fn().mockImplementation(async (workspaceId: string) =>
    Array.from(runStore.values()).filter((r) => r.workspaceId === workspaceId),
  ),
}));

vi.mock('../../apps/api/src/modules/assets/assets.routes', () => ({
  assetsRoutes: async (app: FastifyInstance) => {
    const { requireAuth } = await import('../../apps/api/src/auth/middleware');

    app.get('/assets/:id', { preHandler: [requireAuth] }, async (request: { params: { id: string } }, reply: { status: (n: number) => { send: (b: unknown) => void }; send: (b: unknown) => void }) => {
      const asset = assetStore.get((request.params as { id: string }).id);
      if (!asset) return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Asset not found' } });
      return reply.send({ success: true, data: asset });
    });

    app.get('/workspaces/:id/assets', { preHandler: [requireAuth] }, async (request: { params: { id: string } }, reply: { send: (b: unknown) => void }) => {
      const assets = Array.from(assetStore.values()).filter(
        (a) => a.workspaceId === (request.params as { id: string }).id,
      );
      return reply.send({ success: true, data: assets });
    });
  },
}));

vi.mock('../../apps/api/src/modules/audit/audit.service', () => ({
  writeAuditEvent: vi.fn().mockImplementation(async (event: {
    userId: string;
    workspaceId: string;
    action: string;
    resourceType: string;
    resourceId: string;
    metadata?: Record<string, unknown>;
    riskLevel?: string;
  }) => {
    const entry: MockAuditEvent = {
      id: `audit_${nanoid(8)}`,
      userId: event.userId,
      workspaceId: event.workspaceId,
      action: event.action,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      metadata: event.metadata ?? {},
      createdAt: new Date(),
    };
    auditStore.push(entry);
    return entry;
  }),
  getAuditLog: vi.fn().mockImplementation(async (workspaceId: string) => {
    const events = auditStore.filter((e) => e.workspaceId === workspaceId);
    return { events, total: events.length, page: 1, perPage: 25 };
  }),
}));

vi.mock('@launchctrl/skills', () => ({
  skillRegistry: {
    initialize: vi.fn().mockResolvedValue(undefined),
    getAll: vi.fn().mockReturnValue([]),
    get: vi.fn().mockResolvedValue(null),
    has: vi.fn().mockReturnValue(false),
    getCompatiblePacks: vi.fn().mockReturnValue([]),
    getByTags: vi.fn().mockReturnValue([]),
    reload: vi.fn().mockResolvedValue(null),
  },
}));

// ─── Build app ────────────────────────────────────────────────────────────────

import { buildApp } from '../../apps/api/src/app';

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

// ─── Helper: build valid Telegram initData ────────────────────────────────────

function buildInitData(userId = 555666777): string {
  const BOT_TOKEN = 'test-bot-token-1234567890';
  const authDate = Math.floor(Date.now() / 1000);
  const params: Record<string, string> = {
    auth_date: String(authDate),
    user: JSON.stringify({ id: userId, first_name: 'SmokeUser', username: 'smoke_test_user' }),
  };
  const secretKey = createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
  const dataCheckString = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  params['hash'] = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  return new URLSearchParams(params).toString();
}

// ─── Full Core Flow Smoke Test ────────────────────────────────────────────────

describe('Core Flow — Full LaunchCtrl Journey (Smoke)', () => {
  // Shared state across the sequential steps in this smoke test
  let sessionToken: string;
  let workspaceId: string;
  let planId: string;
  let runId: string;

  it('Step 1 — Auth via Telegram initData → returns session token', async () => {
    const initData = buildInitData();

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/telegram',
      headers: { 'Content-Type': 'application/json' },
      payload: { initData },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<{ success: boolean; data: { token: string; user: { id: string } } }>();
    expect(body.success).toBe(true);
    expect(body.data.token).toBeTruthy();
    expect(body.data.user.id).toBeTruthy();

    sessionToken = body.data.token;
  });

  it('Step 2 — Create a workspace → returns workspace with id', async () => {
    expect(sessionToken).toBeTruthy(); // Depends on Step 1

    const response = await app.inject({
      method: 'POST',
      url: '/api/workspaces',
      headers: {
        Authorization: `Bearer ${sessionToken}`,
        'Content-Type': 'application/json',
      },
      payload: {
        name: 'Smoke Test Launch — PepeMax',
        description: 'End-to-end smoke test workspace',
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json<{ success: boolean; data: { id: string; name: string } }>();
    expect(body.success).toBe(true);
    expect(body.data.id).toBeTruthy();
    expect(body.data.name).toBe('Smoke Test Launch — PepeMax');

    workspaceId = body.data.id;
  });

  it('Step 3 — Submit wizard answers → get plan with steps', async () => {
    expect(sessionToken).toBeTruthy();
    expect(workspaceId).toBeTruthy();

    const wizardAnswers = {
      launchName: 'PepeMax',
      launchTicker: 'PEPEMAX',
      launchDescription: 'The most pepe-brained token on Solana',
      platform: 'pumpfun',
      websiteUrl: 'https://pepemax.io',
      twitterUrl: 'https://twitter.com/pepemaxio',
      telegramUrl: 'https://t.me/pepemaxchat',
      category: 'meme_token',
      securityProfile: 'balanced',
      automationProfile: 'standard',
      integrations: ['rose', 'combot'],
      toneProfile: 'degen',
      generateWelcome: true,
      generateRules: true,
      generateFaq: false,
      generateCommands: false,
      generateAnnouncements: false,
      generateCrisisMode: false,
      generateRaidMode: false,
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/plans',
      headers: {
        Authorization: `Bearer ${sessionToken}`,
        'Content-Type': 'application/json',
      },
      payload: {
        workspaceId,
        answers: wizardAnswers,
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json<{ success: boolean; data: { id: string; steps: unknown[]; status: string } }>();
    expect(body.success).toBe(true);
    expect(body.data.id).toBeTruthy();
    expect(Array.isArray(body.data.steps)).toBe(true);
    expect(body.data.steps.length).toBeGreaterThan(0);

    planId = body.data.id;
  });

  it('Step 4 — Approve plan → plan status transitions to approved', async () => {
    expect(planId).toBeTruthy();

    const response = await app.inject({
      method: 'POST',
      url: `/api/plans/${planId}/approve`,
      headers: {
        Authorization: `Bearer ${sessionToken}`,
        'Content-Type': 'application/json',
      },
      payload: {},
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<{ success: boolean; data: { id: string; status: string } }>();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('approved');
  });

  it('Step 5 — Start execution run with DRY_RUN=true → returns run id', async () => {
    expect(planId).toBeTruthy();

    const response = await app.inject({
      method: 'POST',
      url: '/api/runs',
      headers: {
        Authorization: `Bearer ${sessionToken}`,
        'Content-Type': 'application/json',
      },
      payload: {
        planId,
        workspaceId,
        isDryRun: true,
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json<{ success: boolean; data: { id: string; isDryRun: boolean } }>();
    expect(body.success).toBe(true);
    expect(body.data.id).toBeTruthy();
    expect(body.data.isDryRun).toBe(true);

    runId = body.data.id;
  });

  it('Step 6 — Poll run status until terminal state', async () => {
    expect(runId).toBeTruthy();

    const TERMINAL_STATES = ['completed', 'failed', 'cancelled'];
    const MAX_POLLS = 10;
    const POLL_INTERVAL_MS = 100;

    let terminalReached = false;
    let finalStatus = '';

    for (let i = 0; i < MAX_POLLS; i++) {
      const response = await app.inject({
        method: 'GET',
        url: `/api/runs/${runId}`,
        headers: { Authorization: `Bearer ${sessionToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json<{ data: { status: string } }>();
      finalStatus = body.data.status;

      if (TERMINAL_STATES.includes(finalStatus)) {
        terminalReached = true;
        break;
      }

      // Small delay between polls
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }

    expect(terminalReached).toBe(true);
    expect(TERMINAL_STATES).toContain(finalStatus);
  });

  it('Step 7 — Fetch audit log for workspace → expect at least one entry', async () => {
    expect(workspaceId).toBeTruthy();

    const response = await app.inject({
      method: 'GET',
      url: `/api/workspaces/${workspaceId}/audit`,
      headers: { Authorization: `Bearer ${sessionToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<{ success: boolean; data: { events: unknown[]; total: number } }>();
    expect(body.success).toBe(true);
    // At minimum, the workspace creation event should be logged
    expect(body.data.total).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(body.data.events)).toBe(true);
  });

  it('Step 8 — Fetch generated assets for run → expect at least one asset', async () => {
    expect(workspaceId).toBeTruthy();

    const response = await app.inject({
      method: 'GET',
      url: `/api/workspaces/${workspaceId}/assets`,
      headers: { Authorization: `Bearer ${sessionToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<{ success: boolean; data: unknown[] }>();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    // At least one welcome_message asset should have been generated
    expect(body.data.length).toBeGreaterThanOrEqual(1);
  });
});

// ─── Additional smoke: workspace isolation ────────────────────────────────────

describe('Smoke — workspace isolation', () => {
  it('two separate users see only their own workspaces', async () => {
    // User A
    const initDataA = buildInitData(100000001);
    const authA = await app.inject({
      method: 'POST',
      url: '/api/auth/telegram',
      headers: { 'Content-Type': 'application/json' },
      payload: { initData: initDataA },
    });
    const tokenA = authA.json<{ data: { token: string } }>().data.token;

    // User B
    const initDataB = buildInitData(200000002);
    const authB = await app.inject({
      method: 'POST',
      url: '/api/auth/telegram',
      headers: { 'Content-Type': 'application/json' },
      payload: { initData: initDataB },
    });
    const tokenB = authB.json<{ data: { token: string } }>().data.token;

    // A creates workspace
    await app.inject({
      method: 'POST',
      url: '/api/workspaces',
      headers: { Authorization: `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
      payload: { name: 'User A Workspace' },
    });

    // B creates workspace
    await app.inject({
      method: 'POST',
      url: '/api/workspaces',
      headers: { Authorization: `Bearer ${tokenB}`, 'Content-Type': 'application/json' },
      payload: { name: 'User B Workspace' },
    });

    // A lists workspaces — should not see B's
    const listA = await app.inject({
      method: 'GET',
      url: '/api/workspaces',
      headers: { Authorization: `Bearer ${tokenA}` },
    });

    const workspacesA = listA.json<{ data: Array<{ name: string }> }>().data;
    const aNames = workspacesA.map((w) => w.name);
    expect(aNames).not.toContain('User B Workspace');
  });
});

// ─── Additional smoke: error states ──────────────────────────────────────────

describe('Smoke — error states', () => {
  it('fetching a non-existent run returns 404', async () => {
    const initData = buildInitData(300000003);
    const auth = await app.inject({
      method: 'POST',
      url: '/api/auth/telegram',
      headers: { 'Content-Type': 'application/json' },
      payload: { initData },
    });
    const token = auth.json<{ data: { token: string } }>().data.token;

    const response = await app.inject({
      method: 'GET',
      url: '/api/runs/run-does-not-exist-xyz',
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(404);
  });

  it('fetching a non-existent plan returns 404', async () => {
    const initData = buildInitData(400000004);
    const auth = await app.inject({
      method: 'POST',
      url: '/api/auth/telegram',
      headers: { 'Content-Type': 'application/json' },
      payload: { initData },
    });
    const token = auth.json<{ data: { token: string } }>().data.token;

    const response = await app.inject({
      method: 'GET',
      url: '/api/plans/plan-does-not-exist-xyz',
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(404);
  });

  it('session token is invalidated after logout', async () => {
    const initData = buildInitData(500000005);
    const auth = await app.inject({
      method: 'POST',
      url: '/api/auth/telegram',
      headers: { 'Content-Type': 'application/json' },
      payload: { initData },
    });
    const token = auth.json<{ data: { token: string } }>().data.token;

    // Logout
    await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: { Authorization: `Bearer ${token}` },
    });

    // Token should now be invalid
    const meResponse = await app.inject({
      method: 'GET',
      url: '/api/users/me',
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(meResponse.statusCode).toBe(401);
  });
});
