import { encrypt, decrypt } from '@launchctrl/lib';
import { getLogger } from '@launchctrl/lib';

const logger = getLogger();

const getEncryptionKey = () => {
  const key = process.env['ENCRYPTION_KEY'];
  if (!key) throw new Error('ENCRYPTION_KEY env var is required');
  return key;
};

/**
 * Encrypts a raw GramJS session string for storage in the database.
 * Uses AES-256-GCM from @launchctrl/lib.
 */
export function encryptSession(rawSessionString: string): string {
  return encrypt(rawSessionString, getEncryptionKey());
}

/**
 * Decrypts a stored session string for use with GramJS.
 */
export function decryptSession(encryptedSessionString: string): string {
  return decrypt(encryptedSessionString, getEncryptionKey());
}

/**
 * Validates that a session string looks like a valid GramJS StringSession.
 * StringSession strings are base64-encoded and typically >100 chars.
 */
export function isValidSessionString(s: string): boolean {
  if (!s || s.length < 100) return false;
  try {
    atob(s.replace(/-/g, '+').replace(/_/g, '/'));
    return true;
  } catch {
    return false;
  }
}
