// Application-wide constants

export const APP_NAME = 'LaunchCtrl';
export const APP_VERSION = '0.1.0';

// JWT
export const JWT_ALGORITHM = 'HS256' as const;

// Security profiles
export const SECURITY_PROFILE_CONFIGS = {
  low: {
    captchaRequired: false,
    minAccountAge: 0,
    antiSpamLevel: 1,
    allowForwards: true,
    allowLinks: true,
    slowMode: 0,
  },
  balanced: {
    captchaRequired: true,
    minAccountAge: 7,
    antiSpamLevel: 3,
    allowForwards: true,
    allowLinks: false,
    slowMode: 3,
  },
  hard: {
    captchaRequired: true,
    minAccountAge: 30,
    antiSpamLevel: 7,
    allowForwards: false,
    allowLinks: false,
    slowMode: 10,
  },
  extreme: {
    captchaRequired: true,
    minAccountAge: 90,
    antiSpamLevel: 10,
    allowForwards: false,
    allowLinks: false,
    slowMode: 30,
  },
} as const;

// Automation profiles
export const AUTOMATION_PROFILE_CONFIGS = {
  minimal: {
    welcomeMessages: true,
    scheduledPosts: false,
    buyAlerts: false,
    priceAlerts: false,
    autoModeration: false,
    antiRaidMode: false,
  },
  standard: {
    welcomeMessages: true,
    scheduledPosts: false,
    buyAlerts: true,
    priceAlerts: false,
    autoModeration: true,
    antiRaidMode: true,
  },
  aggressive_safe: {
    welcomeMessages: true,
    scheduledPosts: true,
    buyAlerts: true,
    priceAlerts: true,
    autoModeration: true,
    antiRaidMode: true,
  },
} as const;

// Skill system
export const SKILL_PACKS_DIR = 'packs';
export const SKILL_FILE_NAME = 'SKILL.md';
export const MAX_SKILLS_PER_RUN = 12;

// Execution
export const DRY_RUN_DEFAULT = true;
export const MAX_RETRY_ATTEMPTS = 3;
export const RETRY_BACKOFF_MS = [1000, 3000, 9000] as const;

// Queue
export const QUEUE_NAMES = {
  PLANNER: 'planner',
  EXECUTOR: 'executor',
  NOTIFICATIONS: 'notifications',
} as const;

// Rate limiting
export const RATE_LIMIT_CONFIGS = {
  auth: { max: 10, window: 60000 },
  api: { max: 100, window: 60000 },
  planner: { max: 20, window: 60000 },
  executor: { max: 5, window: 60000 },
} as const;
