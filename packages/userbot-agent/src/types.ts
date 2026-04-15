export interface UserbotSession {
  id: string;           // nanoid
  workspaceId: string;
  phoneNumber: string;  // stored for display only, never logged
  sessionString: string; // encrypted GramJS session string
  isActive: boolean;
  createdAt: Date;
  lastUsedAt: Date | null;
}

export interface AuthInitResult {
  phoneCodeHash: string;  // needed to complete auth
  sessionId: string;      // pending session ID stored temporarily
}

export interface AuthCompleteResult {
  sessionString: string;  // encrypted session string to persist
  userId: string;         // Telegram user ID of authenticated account
  username: string | null;
}

export interface CommandResult {
  success: boolean;
  messageId: number | null;
  error: string | null;
  dryRun: boolean;
}

export interface SendCommandOptions {
  groupId: string;       // Telegram group/channel ID (numeric string or @username)
  command: string;       // The full command text e.g. "/setwelcome Hello {first}!"
  dryRun?: boolean;
  delayMs?: number;      // Optional delay between commands for rate limiting
}

export interface SendCommandBatchOptions {
  groupId: string;
  commands: string[];
  dryRun?: boolean;
  delayBetweenMs?: number; // Default 1500ms to avoid Rose rate limits
}
