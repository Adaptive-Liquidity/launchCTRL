/**
 * Template variable system.
 * Variables are wrapped in {VARIABLE_NAME} and replaced at render time.
 */

export interface TemplateVariableMap {
  PROJECT_NAME: string;
  TICKER: string;
  PLATFORM: string;
  CONTRACT_ADDRESS: string;
  CHART_URL: string;
  BUY_LINK: string;
  TWITTER_URL: string;
  WEBSITE_URL: string;
  TELEGRAM_URL: string;
  DOCS_URL: string;
  DEXSCREENER_URL: string;
  USERNAME: string;
  BAN_REASON: string;
  ETA: string;
  BANNED_COUNT: string;
  CHAT_ID: string;
  SPAM_LEVEL: string;
  SLOW_MODE_SECONDS: string;
  PROJECT_DESCRIPTION: string;
  FUD_CLAIM_RESPONSE: string;
  ACTION_ITEMS: string;
  INCIDENT_SUMMARY: string;
  RESOLUTION_DETAILS: string;
}

export type TemplateVariable = keyof TemplateVariableMap;

export const VARIABLE_DESCRIPTIONS: Record<TemplateVariable, string> = {
  PROJECT_NAME: 'Your project or community name',
  TICKER: 'Token ticker symbol (e.g. $PEPE)',
  PLATFORM: 'Launch platform (e.g. pump.fun)',
  CONTRACT_ADDRESS: 'Token contract address',
  CHART_URL: 'Link to price chart (DexScreener, DEXTools, etc.)',
  BUY_LINK: 'Direct link to buy the token',
  TWITTER_URL: 'Twitter/X profile URL',
  WEBSITE_URL: 'Project website URL',
  TELEGRAM_URL: 'Main Telegram group URL',
  DOCS_URL: 'Documentation URL',
  DEXSCREENER_URL: 'DexScreener chart URL',
  USERNAME: 'Telegram username of the target user',
  BAN_REASON: 'Reason for ban action',
  ETA: 'Estimated time of resolution',
  BANNED_COUNT: 'Number of accounts banned',
  CHAT_ID: 'Telegram chat/group ID',
  SPAM_LEVEL: 'Spam sensitivity level number',
  SLOW_MODE_SECONDS: 'Slow mode duration in seconds',
  PROJECT_DESCRIPTION: 'Short description of the project',
  FUD_CLAIM_RESPONSE: 'Response to specific FUD claim',
  ACTION_ITEMS: 'List of actions being taken',
  INCIDENT_SUMMARY: 'Summary of the incident',
  RESOLUTION_DETAILS: 'How the incident was resolved',
};

/**
 * Extracts all variable names from a template string
 */
export function extractVariables(template: string): string[] {
  const matches = template.match(/\{([A-Z_]+)\}/g) ?? [];
  return [...new Set(matches.map((m) => m.slice(1, -1)))];
}

/**
 * Returns missing variables for a given template
 */
export function getMissingVariables(
  template: string,
  provided: Record<string, string>,
): string[] {
  const required = extractVariables(template);
  return required.filter((v) => !provided[v] || provided[v].trim() === '');
}
