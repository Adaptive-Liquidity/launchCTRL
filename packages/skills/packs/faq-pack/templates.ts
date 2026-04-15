import type { SkillTemplate } from '@launchctrl/types';

export const templates: SkillTemplate[] = [
  {
    id: 'faq-full-degen',
    assetType: 'faq_note',
    toneProfile: 'degen',
    template: `📋 {PROJECT_NAME} FAQ\n\n❓ What is {PROJECT_NAME}?\n{PROJECT_DESCRIPTION}\n\n❓ What's the ticker?\n${'${TICKER}'} — on {PLATFORM}\n\n❓ Contract address?\n\`{CONTRACT_ADDRESS}\`\n\n❓ Where to buy?\n{BUY_LINK}\n\n❓ Where's the chart?\n{CHART_URL}\n\n❓ Who made this?\n Community-driven project. DYOR.\n\n❓ Is this safe?\n⚠️ Crypto is risky. Never invest more than you can lose. We're not your financial advisor.\n\n❓ How do I know links are legit?\nOnly trust pinned messages. Never trust DMs.\n\n📌 Keep this pinned for newcomers.`,
    variables: [
      'PROJECT_NAME', 'PROJECT_DESCRIPTION', 'TICKER', 'PLATFORM',
      'CONTRACT_ADDRESS', 'BUY_LINK', 'CHART_URL',
    ],
  },
  {
    id: 'faq-security-section',
    assetType: 'faq_note',
    toneProfile: 'all',
    template: `🔐 {PROJECT_NAME} Security FAQ\n\n🚫 The team will NEVER:\n• DM you first asking for funds\n• Ask for your seed phrase or private key\n• Promise guaranteed returns\n• Ask you to "verify your wallet"\n\n✅ Always:\n• Verify links from pinned messages only\n• Check the official channel for announcements\n• Report suspicious DMs to admins\n\nIf it seems too good to be true — it is.`,
    variables: ['PROJECT_NAME'],
  },
];
