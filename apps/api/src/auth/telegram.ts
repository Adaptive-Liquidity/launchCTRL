import { createHmac } from 'crypto';
import { getEnv } from '@launchctrl/config';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

export interface TelegramInitDataPayload {
  user: TelegramUser;
  chat_instance?: string;
  chat_type?: string;
  start_param?: string;
  auth_date: number;
}

export class TelegramInitDataError extends Error {
  constructor(
    message: string,
    public readonly code: 'INVALID_HASH' | 'EXPIRED' | 'MALFORMED' | 'MISSING_USER',
  ) {
    super(message);
    this.name = 'TelegramInitDataError';
  }
}

/**
 * Validates Telegram Mini App initData server-side.
 *
 * Security: This validation MUST happen server-side only.
 * Never trust initData validated on the client.
 *
 * Follows official Telegram documentation:
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function validateTelegramInitData(initData: string): TelegramInitDataPayload {
  const env = getEnv();

  if (!initData || typeof initData !== 'string') {
    throw new TelegramInitDataError('initData is required', 'MALFORMED');
  }

  // Parse the initData query string
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(initData);
  } catch {
    throw new TelegramInitDataError('initData is not valid URL-encoded data', 'MALFORMED');
  }

  const hash = params.get('hash');
  if (!hash) {
    throw new TelegramInitDataError('hash parameter is missing from initData', 'MALFORMED');
  }

  // Build the data-check string (all params except hash, sorted alphabetically)
  const entries: string[] = [];
  for (const [key, value] of params.entries()) {
    if (key !== 'hash') {
      entries.push(`${key}=${value}`);
    }
  }
  entries.sort();
  const dataCheckString = entries.join('\n');

  // Compute HMAC-SHA256 of bot token using literal string "WebAppData" as key
  const secretKey = createHmac('sha256', 'WebAppData')
    .update(env.TELEGRAM_BOT_TOKEN)
    .digest();

  const computedHash = createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  // Timing-safe comparison
  if (!timingSafeStringEqual(computedHash, hash)) {
    throw new TelegramInitDataError('initData hash is invalid', 'INVALID_HASH');
  }

  // Check auth_date freshness
  const authDateStr = params.get('auth_date');
  if (!authDateStr) {
    throw new TelegramInitDataError('auth_date is missing', 'MALFORMED');
  }

  const authDate = parseInt(authDateStr, 10);
  const now = Math.floor(Date.now() / 1000);
  const age = now - authDate;

  if (age > env.TELEGRAM_INIT_DATA_MAX_AGE_SECONDS) {
    throw new TelegramInitDataError(
      `initData is expired (age: ${age}s, max: ${env.TELEGRAM_INIT_DATA_MAX_AGE_SECONDS}s)`,
      'EXPIRED',
    );
  }

  // Parse user object
  const userStr = params.get('user');
  if (!userStr) {
    throw new TelegramInitDataError('user data is missing from initData', 'MISSING_USER');
  }

  let user: TelegramUser;
  try {
    user = JSON.parse(userStr) as TelegramUser;
  } catch {
    throw new TelegramInitDataError('user data is not valid JSON', 'MALFORMED');
  }

  if (!user.id || typeof user.id !== 'number') {
    throw new TelegramInitDataError('user.id is missing or invalid', 'MALFORMED');
  }

  return {
    user,
    chat_instance: params.get('chat_instance') ?? undefined,
    chat_type: params.get('chat_type') ?? undefined,
    start_param: params.get('start_param') ?? undefined,
    auth_date: authDate,
  };
}

function timingSafeStringEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still do a dummy comparison to prevent length-based timing attacks
    let diff = 0;
    for (let i = 0; i < a.length; i++) {
      diff |= (a.charCodeAt(i) ^ (b.charCodeAt(i % b.length) ?? 0));
    }
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= (a.charCodeAt(i) ^ b.charCodeAt(i));
  }
  return diff === 0;
}
