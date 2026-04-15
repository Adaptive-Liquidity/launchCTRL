/**
 * @file api.test.ts
 * Integration tests for the Fastify API (apps/api).
 *
 * Tests real HTTP via Fastify's .inject() method against a test server instance.
 * No external PostgreSQL or Redis connections required — the DB and session
 * services are mocked below to allow isolated API contract testing.
 *
 * Tests cover:
 * - GET /health → 200 { status: 'ok' }
 * - POST /api/auth/telegram with valid initData → returns session token
 * - POST /api/auth/telegram with invalid initData → 401
 * - GET /api/users/me without auth → 401
 * - GET /api/users/me with valid session → returns user object
 * - GET /api/skills with valid session → returns array of skill pack summaries
 */

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { createHmac } from 'crypto';
import type { FastifyInstance } from 'fastify';

// ─── Mock heavy infrastructure dependencies ───────────────────────────────────

// Config — inject test values without needing a .env file
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
  return {
    getEnv: () => env,
    loadEnv: () => env,
  };
});

// DB — avoid real Postgres connection
vi.mock('../../apps/api/src/db/index', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
    execute: vi.fn().mockResolvedValue([]),
    limit: vi.fn().mockReturnThis(),
  },
}));

// Users service — return test user data
const TEST_USER = {
  id: 'usr_test_001',
  telegramUserId: 123456789,
  telegramFirstName: 'Alice',
  telegramLastName: 'Test',
  telegramUsername: 'alice_test',
  telegramPhotoUrl: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

vi.mock('../../apps/api/src/modules/users/users.service', () => ({
  findOrCreateUser: vi.fn().mockResolvedValue(TEST_USER),
  getUserById: vi.fn().mockResolvedValue(TEST_USER),
}));

// Session service — use test tokens
const TEST_SESSION_TOKEN = 'test-session-token-64-chars-aaaabbbbccccddddeeeeffffgggghhhh';
const TEST_SESSION = {
  id: 'sess_test_001',
  token: TEST_SESSION_TOKEN,
  userId: TEST_USER.id,
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
  createdAt: new Date(),
};

vi.mock('../../apps/api/src/auth/session', () => ({
  createSession: vi.fn().mockResolvedValue(TEST_SESSION),
  validateSession: vi.fn().mockImplementation(async (token: string) => {
    if (token === TEST_SESSION_TOKEN) {
      return { session: TEST_SESSION, user: TEST_USER };
    }
    return null;
  }),
  revokeSession: vi.fn().mockResolvedValue(undefined),
}));

// Skills registry — use real registry but skip actual file loading
vi.mock('@launchctrl/skills', () => {
  const mockPacks = [
    {
      meta: {
        slug: 'rose-core',
        name: 'Rose Core',
        description: 'Core Rose Bot configuration pack.',
        version: '1.0.0',
        tags: ['rose', 'moderation'],
        requiredIntegrations: ['rose'],
        compatibleCategories: 'all',
        minSecurityProfile: 'low',
        minAutomationProfile: 'minimal',
        safetyRules: [],
        configSchema: [],
      },
      valid: true,
      errors: [],
      templates: [],
      config: {},
    },
    {
      meta: {
        slug: 'combot-analytics',
        name: 'Combot Analytics',
        description: 'Combot analytics and anti-spam configuration pack.',
        version: '1.0.0',
        tags: ['combot', 'analytics'],
        requiredIntegrations: ['combot'],
        compatibleCategories: 'all',
        minSecurityProfile: 'low',
        minAutomationProfile: 'minimal',
        safetyRules: [],
        configSchema: [],
      },
      valid: true,
      errors: [],
      templates: [],
      config: {},
    },
  ];

  return {
    skillRegistry: {
      initialize: vi.fn().mockResolvedValue(undefined),
      getAll: vi.fn().mockReturnValue(mockPacks),
      get: vi.fn().mockImplementation(async (slug: string) => {
        return mockPacks.find((p) => p.meta.slug === slug) ?? null;
      }),
      has: vi.fn().mockReturnValue(true),
      getCompatiblePacks: vi.fn().mockReturnValue(mockPacks),
      getByTags: vi.fn().mockReturnValue(mockPacks),
      reload: vi.fn().mockResolvedValue(null),
    },
  };
});

// Audit service
vi.mock('../../apps/api/src/modules/audit/audit.service', () => ({
  writeAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

// ─── Build the app ────────────────────────────────────────────────────────────

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

function buildValidInitData(overrides: { authDate?: number } = {}): string {
  const BOT_TOKEN = 'test-bot-token-1234567890';
  const authDate = overrides.authDate ?? Math.floor(Date.now() / 1000);

  const params: Record<string, string> = {
    auth_date: String(authDate),
    user: JSON.stringify({
      id: 123456789,
      first_name: 'Alice',
      username: 'alice_test',
    }),
  };

  const secretKey = createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
  const dataCheckString = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  params['hash'] = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  return new URLSearchParams(params).toString();
}

// ─── Health check ─────────────────────────────────────────────────────────────

describe('GET /health', () => {
  it('returns 200 with status: ok', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<{ status: string }>();
    expect(body.status).toBe('ok');
  });

  it('response includes a timestamp', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' });
    const body = response.json<{ status: string; timestamp: string }>();
    expect(body.timestamp).toBeTruthy();
    expect(new Date(body.timestamp).getTime()).not.toBeNaN();
  });

  it('does not require authentication', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
      // No Authorization header
    });
    expect(response.statusCode).toBe(200);
  });
});

// ─── POST /api/auth/telegram ─────────────────────────────────────────────────

describe('POST /api/auth/telegram', () => {
  it('returns 200 with session token for valid initData', async () => {
    const initData = buildValidInitData();

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/telegram',
      headers: { 'Content-Type': 'application/json' },
      payload: { initData },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<{ success: boolean; data: { token: string } }>();
    expect(body.success).toBe(true);
    expect(body.data.token).toBeTruthy();
    expect(typeof body.data.token).toBe('string');
  });

  it('response includes user object', async () => {
    const initData = buildValidInitData();

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/telegram',
      headers: { 'Content-Type': 'application/json' },
      payload: { initData },
    });

    const body = response.json<{ data: { user: { id: string } } }>();
    expect(body.data.user).toBeDefined();
    expect(body.data.user.id).toBe(TEST_USER.id);
  });

  it('response includes expiresAt timestamp', async () => {
    const initData = buildValidInitData();
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/telegram',
      headers: { 'Content-Type': 'application/json' },
      payload: { initData },
    });

    const body = response.json<{ data: { expiresAt: string } }>();
    expect(body.data.expiresAt).toBeTruthy();
    expect(new Date(body.data.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it('returns 401 for tampered initData hash', async () => {
    const params = {
      auth_date: String(Math.floor(Date.now() / 1000)),
      user: JSON.stringify({ id: 123, first_name: 'X' }),
      hash: 'a'.repeat(64), // wrong hash
    };
    const initData = new URLSearchParams(params).toString();

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/telegram',
      headers: { 'Content-Type': 'application/json' },
      payload: { initData },
    });

    expect(response.statusCode).toBe(401);
    const body = response.json<{ success: boolean; error: { code: string } }>();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INVALID_HASH');
  });

  it('returns 401 for expired initData', async () => {
    const staleAuthDate = Math.floor(Date.now() / 1000) - 86400; // 24 hours ago
    const initData = buildValidInitData({ authDate: staleAuthDate });

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/telegram',
      headers: { 'Content-Type': 'application/json' },
      payload: { initData },
    });

    expect(response.statusCode).toBe(401);
    const body = response.json<{ error: { code: string } }>();
    expect(body.error.code).toBe('EXPIRED');
  });

  it('returns 400 when initData field is missing', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/telegram',
      headers: { 'Content-Type': 'application/json' },
      payload: {},
    });

    expect(response.statusCode).toBe(400);
    const body = response.json<{ success: boolean; error: { code: string } }>();
    expect(body.success).toBe(false);
  });

  it('returns 400 when request body is empty', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/telegram',
      headers: { 'Content-Type': 'application/json' },
      payload: null,
    });

    expect(response.statusCode).toBeGreaterThanOrEqual(400);
  });
});

// ─── GET /api/users/me ───────────────────────────────────────────────────────

describe('GET /api/users/me', () => {
  it('returns 401 without Authorization header', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/users/me',
      // No auth header
    });

    expect(response.statusCode).toBe(401);
  });

  it('returns 401 with invalid Bearer token', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/users/me',
      headers: { Authorization: 'Bearer invalid-token-xyz' },
    });

    expect(response.statusCode).toBe(401);
  });

  it('returns 401 with malformed Authorization header', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/users/me',
      headers: { Authorization: 'NotBearer something' },
    });

    expect(response.statusCode).toBe(401);
  });

  it('returns 200 with user object for valid session token', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/users/me',
      headers: { Authorization: `Bearer ${TEST_SESSION_TOKEN}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<{ success: boolean; data: { id: string } }>();
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
  });
});

// ─── GET /api/skills ─────────────────────────────────────────────────────────

describe('GET /api/skills', () => {
  it('returns 401 without Authorization header', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/skills',
    });
    expect(response.statusCode).toBe(401);
  });

  it('returns 200 with array of skill packs for authenticated user', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/skills',
      headers: { Authorization: `Bearer ${TEST_SESSION_TOKEN}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<{ success: boolean; data: unknown[] }>();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
  });

  it('returned skills have required fields', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/skills',
      headers: { Authorization: `Bearer ${TEST_SESSION_TOKEN}` },
    });

    const body = response.json<{
      data: Array<{ slug: string; name: string; version: string; tags: string[] }>;
    }>();

    for (const skill of body.data) {
      expect(skill.slug).toBeTruthy();
      expect(skill.name).toBeTruthy();
      expect(skill.version).toBeTruthy();
      expect(Array.isArray(skill.tags)).toBe(true);
    }
  });

  it('GET /api/skills/rose-core returns the specific skill pack', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/skills/rose-core',
      headers: { Authorization: `Bearer ${TEST_SESSION_TOKEN}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<{ data: { meta: { slug: string } } }>();
    expect(body.data.meta.slug).toBe('rose-core');
  });

  it('GET /api/skills/nonexistent returns 404', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/skills/does-not-exist-xyz',
      headers: { Authorization: `Bearer ${TEST_SESSION_TOKEN}` },
    });

    expect(response.statusCode).toBe(404);
    const body = response.json<{ error: { code: string } }>();
    expect(body.error.code).toBe('NOT_FOUND');
  });
});

// ─── POST /api/auth/logout ───────────────────────────────────────────────────

describe('POST /api/auth/logout', () => {
  it('returns 200 when called with a valid Bearer token', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: { Authorization: `Bearer ${TEST_SESSION_TOKEN}` },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<{ success: boolean }>();
    expect(body.success).toBe(true);
  });

  it('returns 200 even when called without a token (graceful)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
    });

    // Logout should be idempotent — no auth required
    expect(response.statusCode).toBe(200);
  });
});
