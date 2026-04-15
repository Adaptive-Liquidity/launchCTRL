import type { SkillTemplate } from '@launchctrl/types';

export const templates: SkillTemplate[] = [
  {
    id: 'pumpfun-welcome-degen',
    assetType: 'welcome_message',
    toneProfile: 'degen',
    template: `🚀 {PROJECT_NAME} (${'${TICKER}'}) — Welcome fren!\n\nYou made it early. Don't fumble this bag 🫡\n\n📋 Read the rules\n📊 Chart: {DEXSCREENER_URL}\n💊 CA: \`{CONTRACT_ADDRESS}\`\n\nLFG 🔥`,
    variables: ['PROJECT_NAME', 'TICKER', 'DEXSCREENER_URL', 'CONTRACT_ADDRESS'],
  },
  {
    id: 'pumpfun-announcement',
    assetType: 'announcement_template',
    toneProfile: 'degen',
    template: `🚨 {PROJECT_NAME} IS LIVE 🚨\n\n${'${TICKER}'} just launched on pump.fun\n\n💊 CA: \`{CONTRACT_ADDRESS}\`\n📊 Chart: {DEXSCREENER_URL}\n🐦 Twitter: {TWITTER_URL}\n\nGet in early or watch from the sidelines 👀`,
    variables: ['PROJECT_NAME', 'TICKER', 'CONTRACT_ADDRESS', 'DEXSCREENER_URL', 'TWITTER_URL'],
  },
  {
    id: 'pumpfun-graduation-template',
    assetType: 'announcement_template',
    toneProfile: 'degen',
    template: `🎓 WE GRADUATED 🎓\n\n{PROJECT_NAME} (${'${TICKER}'}) has hit the bonding curve and is now live on Raydium!\n\n📊 Chart: {DEXSCREENER_URL}\n💧 Raydium Pool: [View on Raydium]\n\nThis is just the beginning. 🚀`,
    variables: ['PROJECT_NAME', 'TICKER', 'DEXSCREENER_URL'],
  },
  {
    id: 'pumpfun-anti-fud',
    assetType: 'custom',
    toneProfile: 'degen',
    template: `📌 Official FUD Response\n\n{PROJECT_NAME} is a community-driven project on pump.fun.\n\n⚠️ We will never:\n- DM you first asking for funds\n- Promise guaranteed returns\n- Ask for your wallet seed phrase\n\n✅ Always verify links from pinned messages only.\n\nStay safe. Don't get rekt. 🫡`,
    variables: ['PROJECT_NAME'],
  },
];
