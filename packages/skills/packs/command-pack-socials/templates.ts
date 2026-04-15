import type { SkillTemplate } from '@launchctrl/types';

export const templates: SkillTemplate[] = [
  {
    id: 'command-twitter-degen',
    assetType: 'social_command_reply',
    toneProfile: 'degen',
    template: `🐦 {PROJECT_NAME} on Twitter/X\n\n{TWITTER_URL}\n\nFollow for alpha and updates 👀`,
    variables: ['PROJECT_NAME', 'TWITTER_URL'],
  },
  {
    id: 'command-chart-degen',
    assetType: 'link_command_reply',
    toneProfile: 'degen',
    template: `📊 {PROJECT_NAME} ({TICKER}) Chart\n\n{CHART_URL}\n\nLook at those candles 🕯️`,
    variables: ['PROJECT_NAME', 'TICKER', 'CHART_URL'],
  },
  {
    id: 'command-buy-degen',
    assetType: 'buy_command_reply',
    toneProfile: 'degen',
    template: `💰 How to Buy {PROJECT_NAME} ({TICKER})\n\n1️⃣ Get SOL on any exchange\n2️⃣ Transfer to your Solana wallet (Phantom, Backpack, etc.)\n3️⃣ Buy on: {CHART_URL}\n\nCA: \`{CONTRACT_ADDRESS}\`\n\nDYOR. NFA. WAGMI 🚀`,
    variables: ['PROJECT_NAME', 'TICKER', 'CHART_URL', 'CONTRACT_ADDRESS'],
  },
  {
    id: 'command-socials-all',
    assetType: 'social_command_reply',
    toneProfile: 'all',
    template: `🌐 {PROJECT_NAME} Official Links\n\n🐦 Twitter: {TWITTER_URL}\n🌍 Website: {WEBSITE_URL}\n📊 Chart: {CHART_URL}\n💬 Telegram: {TELEGRAM_URL}\n📚 Docs: {DOCS_URL}\n\n⚠️ Only trust links from pinned messages`,
    variables: ['PROJECT_NAME', 'TWITTER_URL', 'WEBSITE_URL', 'CHART_URL', 'TELEGRAM_URL', 'DOCS_URL'],
  },
  {
    id: 'command-ca',
    assetType: 'link_command_reply',
    toneProfile: 'all',
    template: `📋 {PROJECT_NAME} Contract Address\n\n\`{CONTRACT_ADDRESS}\`\n\n⚠️ Always verify from official sources. We will never DM you the CA.`,
    variables: ['PROJECT_NAME', 'CONTRACT_ADDRESS'],
  },
];
