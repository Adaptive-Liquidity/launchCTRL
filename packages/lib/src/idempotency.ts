import { createHash } from 'crypto';

/**
 * Generates a deterministic idempotency key from a set of inputs.
 * Same inputs always produce the same key, enabling safe retries.
 */
export function generateIdempotencyKey(...parts: (string | number | boolean | null | undefined)[]): string {
  const serialized = parts.map((p) => String(p ?? '')).join(':');
  return createHash('sha256').update(serialized).digest('hex').slice(0, 32);
}

/**
 * Generates a random idempotency key (for non-deterministic operations)
 */
export function generateRandomIdempotencyKey(): string {
  const { randomBytes } = require('crypto') as typeof import('crypto');
  return randomBytes(16).toString('hex');
}
