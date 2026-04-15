import { vi } from 'vitest';

// ─── Environment ─────────────────────────────────────────────────────────────
process.env.NODE_ENV = 'test';
process.env.BOT_TOKEN = 'test-bot-token-1234567890';
process.env.TELEGRAM_BOT_TOKEN = 'test-bot-token-1234567890';
process.env.ENCRYPTION_KEY = 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
process.env.SESSION_SECRET = 'test-session-secret-for-testing-only';
process.env.JWT_SECRET = 'test-jwt-secret-minimum-32-chars-long-for-testing';
process.env.DATABASE_URL = 'postgresql://launchctrl:launchctrl@localhost:5432/launchctrl_test';
process.env.REDIS_URL = 'redis://localhost:6379/1';
process.env.TELEGRAM_INIT_DATA_MAX_AGE_SECONDS = '300';
process.env.RATE_LIMIT_MAX = '1000';
process.env.RATE_LIMIT_WINDOW_MS = '60000';
process.env.LOG_LEVEL = 'silent';

// ─── Silence pino logger during tests ────────────────────────────────────────
vi.mock('pino', () => {
  const silent = {
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    child: () => silent,
  };
  const pino = vi.fn(() => silent);
  (pino as unknown as Record<string, unknown>).default = pino;
  return { default: pino };
});

// ─── Silence @launchctrl/lib logger ──────────────────────────────────────────
vi.mock('@launchctrl/lib', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@launchctrl/lib')>();
  const silentLogger = {
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    child: () => silentLogger,
  };
  return {
    ...actual,
    getLogger: () => silentLogger,
    createLogger: () => silentLogger,
  };
});
