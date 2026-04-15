import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import type { AuthInitResult, AuthCompleteResult } from './types.js';
import { getLogger } from '@launchctrl/lib';

const logger = getLogger();

// Temporary in-memory store for pending auth sessions (phone → client mapping)
// In production this should be Redis with a short TTL
const pendingClients = new Map<string, { client: TelegramClient; phoneCodeHash: string }>();

export async function initAuth(opts: {
  phoneNumber: string;
  apiId: number;
  apiHash: string;
}): Promise<AuthInitResult> {
  const session = new StringSession('');
  const client = new TelegramClient(session, opts.apiId, opts.apiHash, {
    connectionRetries: 3,
    useWSS: false,
  });

  await client.connect();

  const result = await client.invoke(
    new (await import('telegram/tl/functions/auth/index.js')).SendCode({
      phoneNumber: opts.phoneNumber,
      apiId: opts.apiId,
      apiHash: opts.apiHash,
      settings: new (await import('telegram/tl/types/index.js')).CodeSettings({}),
    })
  );

  const phoneCodeHash = (result as any).phoneCodeHash as string;
  const sessionId = `pending:${opts.phoneNumber}:${Date.now()}`;

  // Store pending client keyed by phone number (one active auth per phone)
  pendingClients.set(opts.phoneNumber, { client, phoneCodeHash });

  logger.info({ phoneNumber: opts.phoneNumber.slice(0, 4) + '****' }, 'Auth initiated');

  return { phoneCodeHash, sessionId };
}

export async function completeAuth(opts: {
  phoneNumber: string;
  phoneCode: string;
  phoneCodeHash: string;
}): Promise<AuthCompleteResult> {
  const pending = pendingClients.get(opts.phoneNumber);
  if (!pending) throw new Error('No pending auth session for this phone number. Please initiate auth again.');

  const { client } = pending;

  try {
    await client.invoke(
      new (await import('telegram/tl/functions/auth/index.js')).SignIn({
        phoneNumber: opts.phoneNumber,
        phoneCodeHash: opts.phoneCodeHash,
        phoneCode: opts.phoneCode,
      })
    );

    const me = await client.getMe();
    const sessionString = (client.session as StringSession).save();

    pendingClients.delete(opts.phoneNumber);

    return {
      sessionString,
      userId: String((me as any).id),
      username: (me as any).username ?? null,
    };
  } catch (error) {
    // Handle 2FA case
    if (String(error).includes('SESSION_PASSWORD_NEEDED')) {
      throw new Error('TWO_FACTOR_REQUIRED');
    }
    throw error;
  } finally {
    await client.disconnect();
  }
}

export async function complete2FA(opts: {
  phoneNumber: string;
  password: string;
}): Promise<AuthCompleteResult> {
  const pending = pendingClients.get(opts.phoneNumber);
  if (!pending) throw new Error('No pending auth session for this phone number.');

  const { client } = pending;

  // Use GramJS password auth
  const me = await client.signInWithPassword(
    { apiId: 0, apiHash: '' }, // credentials already set on client
    {
      password: async () => opts.password,
      onError: async (err) => { throw err; },
    }
  );

  const sessionString = (client.session as StringSession).save();
  pendingClients.delete(opts.phoneNumber);

  return {
    sessionString,
    userId: String((me as any).id),
    username: (me as any).username ?? null,
  };
}

export function clearPendingAuth(phoneNumber: string): void {
  const pending = pendingClients.get(phoneNumber);
  if (pending) {
    pending.client.disconnect().catch(() => {});
    pendingClients.delete(phoneNumber);
  }
}
