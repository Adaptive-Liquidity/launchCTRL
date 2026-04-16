import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // Railway injects PORT; services fall back to their own defaults
  PORT: z.coerce.number().optional(),

  // API
  API_PORT: z.coerce.number().optional(),
  API_HOST: z.string().default('0.0.0.0'),

  // Bot
  BOT_PORT: z.coerce.number().optional(),
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  TELEGRAM_BOT_WEBHOOK_SECRET: z.string().optional(),
  TELEGRAM_MINI_APP_URL: z.string().url().optional(),

  // Database
  DATABASE_URL: z.string().min(1),

  // Redis
  REDIS_URL: z.string().min(1),

  // Auth
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRY: z.string().default('7d'),
  SESSION_COOKIE_NAME: z.string().default('lc_session'),

  // Telegram init data
  TELEGRAM_INIT_DATA_MAX_AGE_SECONDS: z.coerce.number().default(86400),

  // Encryption
  ENCRYPTION_KEY: z.string().length(64),

  // Rate limiting
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),

  // Observability
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  TELEMETRY_ENABLED: z.coerce.boolean().default(false),
  SENTRY_DSN: z.string().optional(),

  // Feature flags
  FEATURE_WILD_MODE: z.coerce.boolean().default(false),
  FEATURE_ADVANCED_AUTOMATION: z.coerce.boolean().default(false),

  // Admin
  ADMIN_SECRET: z.string().min(16).optional(),
});

export type Env = z.infer<typeof EnvSchema>;

let _env: Env | null = null;

export function loadEnv(): Env {
  if (_env) return _env;

  const result = EnvSchema.safeParse(process.env);

  if (!result.success) {
    const issues = result.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  const data = result.data;
  data.API_PORT = data.API_PORT ?? data.PORT ?? 3001;
  data.BOT_PORT = data.BOT_PORT ?? data.PORT ?? 3002;

  _env = data;
  return _env;
}

export function getEnv(): Env {
  if (!_env) throw new Error('Environment not loaded. Call loadEnv() first.');
  return _env;
}
