import type { ToneProfileDefinition } from './index.js';
import type { AssetType } from '@launchctrl/types';

const templates: Partial<Record<AssetType, string>> = {
  welcome_message: `Welcome to {PROJECT_NAME} ({TICKER}), {first}.\n\nQuick start:\n→ /rules — community guidelines\n→ /ca — contract address\n→ /chart — live data\n→ /docs — documentation\n\nSignal > noise.`,
  rules_message: `{PROJECT_NAME} Community Guidelines\n\n[1] Stay on-topic. Off-topic in #off-topic.\n[2] No promotional content for other projects.\n[3] Claims require sources. Speculation is labeled as such.\n[4] No spam, flood, or duplicate messages.\n[5] No phishing or malicious links.\n[6] Moderator rulings are not up for debate in main chat.\n\nViolations → warnings → mute → ban.`,
  buy_command_reply: `{TICKER} acquisition:\n\nDEX: {BUY_LINK}\nCA: \`{CONTRACT_ADDRESS}\`\nPair data: {CHART_URL}\n\nVerify contract before transacting. DYOR.`,
  social_command_reply: `{PROJECT_NAME} ({TICKER}) — Official Links\n\nTwitter: {TWITTER_URL}\nWebsite: {WEBSITE_URL}\nDocs: {DOCS_URL}`,
  faq_note: `{PROJECT_NAME} ({TICKER}) — Technical FAQ\n\nContract: \`{CONTRACT_ADDRESS}\`\nNetwork: {PLATFORM}\nChart: {CHART_URL}\nDocs: {DOCS_URL}\n\nAll links verified. Cross-reference before use.`,
  announcement_template: `[{PROJECT_NAME}] Update — {TICKER}\n\n{INCIDENT_SUMMARY}\n\nDetails: {RESOLUTION_DETAILS}`,
  crisis_mode_message: `[{PROJECT_NAME}] Incident Active\n\nStatus: Investigating\nImpact: {FUD_CLAIM_RESPONSE}\nActions: {ACTION_ITEMS}\n\nNext update: {ETA}`,
  raid_mode_message: `[{PROJECT_NAME}] Anti-Flood Active\n\nCoordinated inbound attack detected. Message restrictions applied.\nAutomatic mitigation running.\nETA to restore: {ETA}`,
  support_instructions: `{PROJECT_NAME} support channel: [Group]\n\nFor bugs: include version, steps to reproduce, expected vs actual.\nFor general questions: search the docs first → {DOCS_URL}\n\nNo direct messages. All support is public and auditable.`,
};

export const technicalTone: ToneProfileDefinition = {
  id: 'technical',
  name: 'Technical / Credible',
  description: 'Data-forward, precise, developer and builder focused',
  voiceNotes: [
    'Precise language, no fluff',
    'Use → for lists',
    'Structured format',
    'Reference data where possible',
    'No hype language',
  ],
  getTemplate: (assetType: AssetType) => templates[assetType] ?? null,
};
