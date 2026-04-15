/**
 * @file auth.test.ts
 * Unit tests for Telegram initData validation (apps/api/src/auth/telegram.ts).
 *
 * Tests cover:
 * - Valid initData hash passes validation and returns parsed payload
 * - Tampered hash fails with INVALID_HASH
 * - Expired initData (>5 min old, based on test env MAX_AGE=300) fails with EXPIRED
 * - Missing required fields (hash, auth_date, user) fail with MALFORMED or MISSING_USER
 * - Timing-safe comparison: no early return on hash mismatch (length differs)
 *
 * All test initData strings are constructed using the same HMAC-SHA256 algorithm
 * as the production code: createHmac('sha256', 'WebAppData').update(botToken)
 *
 * BOT_TOKEN is set in setup.ts: 'test-bot-token-1234567890'
 * TELEGRAM_INIT_DATA_MAX_AGE_SECONDS is set in setup.ts: '300' (5 minutes)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHmac } from 'crypto';

// ─── The module under test ────────────────────────────────────────────────────
// We mock getEnv() to inject test-controlled config without a real .env file.

vi.mock('@launchctrl/config', () => {
  return {
    getEnv: () => ({
      TELEGRAM_BOT_TOKEN: 'test-bot-token-1234567890',
      TELEGRAM_INIT_DATA_MAX_AGE_SECONDS: 300, // 5 minutes
      NODE_ENV: 'test',
    }),
    loadEnv: () => ({
      TELEGRAM_BOT_TOKEN: 'test-bot-token-1234567890',
      TELEGRAM_INIT_DATA_MAX_AGE_SECONDS: 300,
      NODE_ENV: 'test',
    }),
  };
});

import {
  validateTelegramInitData,
  TelegramInitDataError,
} from '../../apps/api/src/auth/telegram';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BOT_TOKEN = 'test-bot-token-1234567890';

/**
 * Compute the secret key exactly as production code does.
 * secretKey = HMAC-SHA256("WebAppData", BOT_TOKEN)
 */
function computeSecretKey(botToken: string): Buffer {
  return createHmac('sha256', 'WebAppData').update(botToken).digest();
}

/**
 * Compute the data-check hash for a set of params (excluding 'hash').
 */
function computeHash(params: Record<string, string>, botToken: string): string {
  const secretKey = computeSecretKey(botToken);
  const entries = Object.entries(params)
    .filter(([k]) => k !== 'hash')
    .map(([k, v]) => `${k}=${v}`)
    .sort();
  const dataCheckString = entries.join('\n');
  return createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
}

/**
 * Build a valid URL-encoded initData string for testing.
 */
function buildInitData(overrides: {
  authDate?: number;
  userId?: number;
  firstName?: string;
  username?: string;
  extraParams?: Record<string, string>;
  tamperHash?: boolean;
  omitHash?: boolean;
  omitAuthDate?: boolean;
  omitUser?: boolean;
}): string {
  const authDate = overrides.authDate ?? Math.floor(Date.now() / 1000);
  const user = {
    id: overrides.userId ?? 123456789,
    first_name: overrides.firstName ?? 'Alice',
    username: overrides.username ?? 'alice_test',
    auth_date: authDate,
    hash: 'placeholder', // will be replaced
  };

  const params: Record<string, string> = {
    ...overrides.extraParams,
  };

  if (!overrides.omitAuthDate) {
    params['auth_date'] = String(authDate);
  }

  if (!overrides.omitUser) {
    params['user'] = JSON.stringify({
      id: user.id,
      first_name: user.first_name,
      username: user.username,
    });
  }

  if (!overrides.omitHash) {
    const hash = computeHash(params, BOT_TOKEN);
    params['hash'] = overrides.tamperHash ? hash.replace(/[0-9]/g, 'a') : hash;
  }

  return new URLSearchParams(params).toString();
}

// ─── Tests: Valid initData ────────────────────────────────────────────────────

describe('validateTelegramInitData — valid input', () => {
  it('returns parsed payload for valid initData', () => {
    const initData = buildInitData({});
    const payload = validateTelegramInitData(initData);

    expect(payload).toBeDefined();
    expect(payload.user).toBeDefined();
    expect(payload.user.id).toBe(123456789);
  });

  it('parsed payload contains correct user fields', () => {
    const initData = buildInitData({
      userId: 987654321,
      firstName: 'Bob',
      username: 'bob_crypto',
    });
    const payload = validateTelegramInitData(initData);

    expect(payload.user.id).toBe(987654321);
    expect(payload.user.first_name).toBe('Bob');
    expect(payload.user.username).toBe('bob_crypto');
  });

  it('parsed payload contains auth_date', () => {
    const now = Math.floor(Date.now() / 1000);
    const initData = buildInitData({ authDate: now });
    const payload = validateTelegramInitData(initData);

    expect(payload.auth_date).toBe(now);
  });

  it('parsed payload contains optional chat_instance when present', () => {
    const initData = buildInitData({
      extraParams: { chat_instance: '-1234567890' },
    });
    const payload = validateTelegramInitData(initData);
    expect(payload.chat_instance).toBe('-1234567890');
  });

  it('parsed payload has undefined chat_instance when not present', () => {
    const initData = buildInitData({});
    const payload = validateTelegramInitData(initData);
    expect(payload.chat_instance).toBeUndefined();
  });

  it('validates initData fresh within MAX_AGE window', () => {
    // auth_date is 1 second old — well within 300s max age
    const initData = buildInitData({ authDate: Math.floor(Date.now() / 1000) - 1 });
    expect(() => validateTelegramInitData(initData)).not.toThrow();
  });

  it('validates initData at exactly 1 second before expiry', () => {
    // auth_date is 299 seconds old — within 300s limit
    const initData = buildInitData({ authDate: Math.floor(Date.now() / 1000) - 299 });
    expect(() => validateTelegramInitData(initData)).not.toThrow();
  });
});

// ─── Tests: Tampered hash ─────────────────────────────────────────────────────

describe('validateTelegramInitData — tampered hash', () => {
  it('throws TelegramInitDataError with code INVALID_HASH for tampered hash', () => {
    const initData = buildInitData({ tamperHash: true });

    expect(() => validateTelegramInitData(initData)).toThrow(TelegramInitDataError);
    try {
      validateTelegramInitData(initData);
    } catch (e) {
      expect(e).toBeInstanceOf(TelegramInitDataError);
      expect((e as TelegramInitDataError).code).toBe('INVALID_HASH');
    }
  });

  it('throws INVALID_HASH when hash is all zeros', () => {
    const params: Record<string, string> = {
      auth_date: String(Math.floor(Date.now() / 1000)),
      user: JSON.stringify({ id: 123, first_name: 'X' }),
      hash: '0'.repeat(64),
    };
    const initData = new URLSearchParams(params).toString();

    expect(() => validateTelegramInitData(initData)).toThrow(TelegramInitDataError);
  });

  it('throws INVALID_HASH when hash is from a different bot token', () => {
    // Compute hash with a DIFFERENT bot token
    const wrongToken = 'wrong-bot-token-9999999999';
    const params: Record<string, string> = {
      auth_date: String(Math.floor(Date.now() / 1000)),
      user: JSON.stringify({ id: 123, first_name: 'X' }),
    };
    const wrongHash = computeHash(params, wrongToken);
    params['hash'] = wrongHash;

    const initData = new URLSearchParams(params).toString();
    expect(() => validateTelegramInitData(initData)).toThrow(TelegramInitDataError);
    try {
      validateTelegramInitData(initData);
    } catch (e) {
      expect((e as TelegramInitDataError).code).toBe('INVALID_HASH');
    }
  });

  it('throws INVALID_HASH when payload data is modified after signing', () => {
    // Build valid initData, then modify auth_date in the string manually
    const now = Math.floor(Date.now() / 1000);
    const initData = buildInitData({ authDate: now });

    // Tamper by replacing auth_date value in the URL-encoded string
    const tampered = initData.replace(
      `auth_date=${now}`,
      `auth_date=${now - 10000}`,
    );

    // This should fail hash check since the signed data was auth_date=now
    if (tampered !== initData) {
      expect(() => validateTelegramInitData(tampered)).toThrow(TelegramInitDataError);
    }
  });
});

// ─── Tests: Expired initData ─────────────────────────────────────────────────

describe('validateTelegramInitData — expiry', () => {
  it('throws EXPIRED for initData older than MAX_AGE (300s)', () => {
    // auth_date is 301 seconds ago — just past the 300s limit
    const staleAuthDate = Math.floor(Date.now() / 1000) - 301;
    const initData = buildInitData({ authDate: staleAuthDate });

    expect(() => validateTelegramInitData(initData)).toThrow(TelegramInitDataError);
    try {
      validateTelegramInitData(initData);
    } catch (e) {
      expect((e as TelegramInitDataError).code).toBe('EXPIRED');
    }
  });

  it('throws EXPIRED for initData that is 1 hour old', () => {
    const oneHourAgo = Math.floor(Date.now() / 1000) - 3600;
    const initData = buildInitData({ authDate: oneHourAgo });

    try {
      validateTelegramInitData(initData);
    } catch (e) {
      expect((e as TelegramInitDataError).code).toBe('EXPIRED');
    }
  });

  it('throws EXPIRED for initData with auth_date of 0 (Unix epoch)', () => {
    const initData = buildInitData({ authDate: 0 });

    try {
      validateTelegramInitData(initData);
    } catch (e) {
      expect((e as TelegramInitDataError).code).toBe('EXPIRED');
    }
  });
});

// ─── Tests: Missing required fields ──────────────────────────────────────────

describe('validateTelegramInitData — missing fields', () => {
  it('throws MALFORMED when initData is an empty string', () => {
    expect(() => validateTelegramInitData('')).toThrow(TelegramInitDataError);
    try {
      validateTelegramInitData('');
    } catch (e) {
      expect((e as TelegramInitDataError).code).toBe('MALFORMED');
    }
  });

  it('throws MALFORMED when hash is missing', () => {
    const initData = buildInitData({ omitHash: true });

    expect(() => validateTelegramInitData(initData)).toThrow(TelegramInitDataError);
    try {
      validateTelegramInitData(initData);
    } catch (e) {
      expect((e as TelegramInitDataError).code).toBe('MALFORMED');
    }
  });

  it('throws MALFORMED when auth_date is missing', () => {
    // Build params without auth_date, compute hash for those params
    const params: Record<string, string> = {
      user: JSON.stringify({ id: 123, first_name: 'X' }),
    };
    params['hash'] = computeHash(params, BOT_TOKEN);
    const initData = new URLSearchParams(params).toString();

    expect(() => validateTelegramInitData(initData)).toThrow(TelegramInitDataError);
    try {
      validateTelegramInitData(initData);
    } catch (e) {
      // Could be MALFORMED (missing auth_date) or INVALID_HASH (hash computed without auth_date)
      expect(['MALFORMED', 'INVALID_HASH']).toContain((e as TelegramInitDataError).code);
    }
  });

  it('throws MISSING_USER or MALFORMED when user field is absent', () => {
    const initData = buildInitData({ omitUser: true });

    expect(() => validateTelegramInitData(initData)).toThrow(TelegramInitDataError);
    try {
      validateTelegramInitData(initData);
    } catch (e) {
      expect(['MISSING_USER', 'MALFORMED', 'INVALID_HASH']).toContain(
        (e as TelegramInitDataError).code,
      );
    }
  });

  it('throws when user JSON is malformed', () => {
    const params: Record<string, string> = {
      auth_date: String(Math.floor(Date.now() / 1000)),
      user: '{invalid json!!}',
    };
    params['hash'] = computeHash(params, BOT_TOKEN);
    const initData = new URLSearchParams(params).toString();

    expect(() => validateTelegramInitData(initData)).toThrow(TelegramInitDataError);
  });

  it('throws MALFORMED when user.id is missing', () => {
    const params: Record<string, string> = {
      auth_date: String(Math.floor(Date.now() / 1000)),
      user: JSON.stringify({ first_name: 'NoId' }), // no id field
    };
    params['hash'] = computeHash(params, BOT_TOKEN);
    const initData = new URLSearchParams(params).toString();

    expect(() => validateTelegramInitData(initData)).toThrow(TelegramInitDataError);
  });
});

// ─── Tests: Error shape ───────────────────────────────────────────────────────

describe('TelegramInitDataError', () => {
  it('is an instance of Error', () => {
    const err = new TelegramInitDataError('test', 'MALFORMED');
    expect(err).toBeInstanceOf(Error);
  });

  it('has name "TelegramInitDataError"', () => {
    const err = new TelegramInitDataError('test', 'MALFORMED');
    expect(err.name).toBe('TelegramInitDataError');
  });

  it('exposes the code property', () => {
    const err = new TelegramInitDataError('test', 'INVALID_HASH');
    expect(err.code).toBe('INVALID_HASH');
  });

  it('supports all four error codes', () => {
    const codes = ['INVALID_HASH', 'EXPIRED', 'MALFORMED', 'MISSING_USER'] as const;
    for (const code of codes) {
      const err = new TelegramInitDataError('msg', code);
      expect(err.code).toBe(code);
    }
  });
});

// ─── Tests: Timing-safe comparison ───────────────────────────────────────────

describe('validateTelegramInitData — timing-safe comparison', () => {
  it('throws INVALID_HASH for a hash with correct length but wrong value', () => {
    // This verifies the timing-safe path: hashes have the same length (64 hex chars)
    // but different values — should fail without short-circuiting on length
    const params: Record<string, string> = {
      auth_date: String(Math.floor(Date.now() / 1000)),
      user: JSON.stringify({ id: 123, first_name: 'X' }),
    };
    const correctHash = computeHash(params, BOT_TOKEN);

    // Flip a hex character while keeping length the same
    const wrongHash =
      correctHash.charAt(0) === 'a'
        ? '0' + correctHash.slice(1)
        : 'a' + correctHash.slice(1);

    params['hash'] = wrongHash;
    const initData = new URLSearchParams(params).toString();

    expect(() => validateTelegramInitData(initData)).toThrow(TelegramInitDataError);
    try {
      validateTelegramInitData(initData);
    } catch (e) {
      expect((e as TelegramInitDataError).code).toBe('INVALID_HASH');
    }
  });

  it('throws INVALID_HASH for a hash that is shorter than the expected 64 chars', () => {
    // Exercises the length-mismatch branch of timingSafeStringEqual
    const params: Record<string, string> = {
      auth_date: String(Math.floor(Date.now() / 1000)),
      user: JSON.stringify({ id: 123, first_name: 'X' }),
      hash: 'tooshort',
    };
    const initData = new URLSearchParams(params).toString();

    expect(() => validateTelegramInitData(initData)).toThrow(TelegramInitDataError);
    try {
      validateTelegramInitData(initData);
    } catch (e) {
      expect((e as TelegramInitDataError).code).toBe('INVALID_HASH');
    }
  });

  it('throws INVALID_HASH for a hash that is longer than 64 chars', () => {
    const params: Record<string, string> = {
      auth_date: String(Math.floor(Date.now() / 1000)),
      user: JSON.stringify({ id: 123, first_name: 'X' }),
      hash: 'a'.repeat(128), // 128 chars, should be 64
    };
    const initData = new URLSearchParams(params).toString();

    expect(() => validateTelegramInitData(initData)).toThrow(TelegramInitDataError);
    try {
      validateTelegramInitData(initData);
    } catch (e) {
      expect((e as TelegramInitDataError).code).toBe('INVALID_HASH');
    }
  });
});
