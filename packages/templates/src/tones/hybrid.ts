import type { ToneProfileDefinition } from './index.js';
import type { AssetType } from '@launchctrl/types';

const templates: Partial<Record<AssetType, string>> = {
  welcome_message: `Hey {first}, welcome to {PROJECT_NAME} 👋\n\nGlad you found us. We're building something real here — professional team, strong community.\n\nTicker: {TICKER}\n\nRead the rules, check the chart, and jump in. We're friendly.`,
  rules_message: `{PROJECT_NAME} Community Rules\n\nWe keep this place quality. Here's how:\n\n✓ Respect every member — no exceptions\n✓ No shilling other projects\n✓ Keep FUD grounded in facts\n✓ No spam or flooding\n✓ No scam links or impersonation\n✓ English in main chat\n\nBreaking rules = warning → mute → ban\nScammers skip straight to permanent ban.\n\nLet's keep this community worth being in. 🙌`,
  buy_command_reply: `How to Buy {PROJECT_NAME} ({TICKER})\n\n1. Get SOL on a major exchange\n2. Transfer to Phantom, Backpack, or similar\n3. Swap at: {BUY_LINK}\n\nCA: \`{CONTRACT_ADDRESS}\`\nChart: {CHART_URL}\n\nDo your research — we believe in this project, but make your own call.`,
  announcement_template: `📣 {PROJECT_NAME} Update\n\n[Content here]\n\n— The {PROJECT_NAME} Team`,
  crisis_mode_message: `📌 From the {PROJECT_NAME} Team\n\nWe're aware of what's being discussed and we're taking it seriously. An update is coming shortly.\n\nPlease rely only on official posts from this channel. If something sounds off — it probably is.\n\n— {PROJECT_NAME} Team`,
  social_command_reply: `{PROJECT_NAME} Official Links 🔗\n\n🐦 Twitter: {TWITTER_URL}\n🌐 Website: {WEBSITE_URL}\n📊 Chart: {CHART_URL}\n💬 Telegram: {TELEGRAM_URL}`,
};

export const hybridTone: ToneProfileDefinition = {
  id: 'hybrid',
  name: 'Hybrid / Launch-Optimized',
  description: 'Balance of professional credibility and crypto-native energy',
  voiceNotes: [
    'Confident but approachable',
    'Mix of professional structure with casual warmth',
    'Light emoji use',
    'No excessive slang but crypto-aware',
    'Trustworthy and grounded',
  ],
  getTemplate: (assetType: AssetType) => templates[assetType] ?? null,
};
