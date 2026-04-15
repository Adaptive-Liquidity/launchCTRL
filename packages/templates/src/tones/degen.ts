import type { ToneProfileDefinition } from './index.js';
import type { AssetType } from '@launchctrl/types';

const templates: Partial<Record<AssetType, string>> = {
  welcome_message: `🚀 Welcome to {PROJECT_NAME}, {first}!\n\nYou made it fren. This is the alpha.\n\nTicker: {TICKER}\n📋 Rules: /rules\n📊 Chart: {CHART_URL}\n\nLFG 🔥`,
  rules_message: `📋 {PROJECT_NAME} Rules — Read or get banned, simple\n\n1. No shilling or promo\n2. No FUD without receipts\n3. No spam (yes, this means you)\n4. No scam links ever\n5. Respect everyone, even the bears\n6. Mods have final say. No crying.\n\nBreak the rules once = warn. Twice = ban. Scammers = instant permanent ban. ✌️`,
  anti_spam_notice: `⚠️ Anti-spam is hot in {PROJECT_NAME}. Keep it clean or get the boot.`,
  ban_message: `🚫 {USERNAME} got yeeted from {PROJECT_NAME}.\nReason: {BAN_REASON}\nBye 👋`,
  appeal_message: `Think you were wrongly banned from {PROJECT_NAME}? DM a mod with your side of the story. We're fair, but we're not dumb.`,
  faq_note: `❓ FAQ — {PROJECT_NAME} ({TICKER})\n\nCA: \`{CONTRACT_ADDRESS}\`\nChart: {CHART_URL}\nBuy: {BUY_LINK}\nTwitter: {TWITTER_URL}\n\n⚠️ DYOR. NFA. We're degens not advisors.`,
  social_command_reply: `🐦 {PROJECT_NAME} Official Twitter\n{TWITTER_URL}\n\nFollow for alpha 👀`,
  buy_command_reply: `💰 How to Buy {PROJECT_NAME} ({TICKER})\n\n1. Get SOL\n2. Use your wallet (Phantom etc)\n3. Buy at: {BUY_LINK}\nCA: \`{CONTRACT_ADDRESS}\`\n\nNFA DYOR WAGMI`,
  link_command_reply: `🔗 {PROJECT_NAME} Links\n\nWebsite: {WEBSITE_URL}\nChart: {CHART_URL}\nTG: {TELEGRAM_URL}`,
  announcement_template: `🚨 {PROJECT_NAME} ANNOUNCEMENT 🚨\n\n[Your update here]\n\nTicker: {TICKER} | CA: \`{CONTRACT_ADDRESS}\``,
  crisis_mode_message: `📌 {PROJECT_NAME} Team Update\n\nWe're aware and we're on it. No panic needed.\n\nUpdate coming shortly. Only trust this channel.\n\n— {PROJECT_NAME} Team`,
  raid_mode_message: `⚠️ RAID DETECTED — {PROJECT_NAME}\n\nLocking up for a sec. Bots getting banned. Hold tight frens.\n\n— Mods 🛡️`,
  support_instructions: `💬 Need help with {PROJECT_NAME}?\n\nPost in the group and a mod will assist. We don't DM first. Ever.\n\nIf someone DMs you claiming to be support — it's a scam. Report them.`,
};

export const degenTone: ToneProfileDefinition = {
  id: 'degen',
  name: 'Degen / Meme-Aware',
  description: 'High energy, crypto-native language with meme awareness',
  voiceNotes: [
    'Use crypto slang naturally (fren, LFG, WAGMI, DYOR, NFA)',
    'High energy but not chaotic',
    'Emoji-forward but not excessive',
    'Self-aware humor is fine',
    'No fake hype or financial promises',
  ],
  getTemplate: (assetType: AssetType) => templates[assetType] ?? null,
};
