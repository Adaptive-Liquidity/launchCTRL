import type { SkillTemplate } from '@launchctrl/types';

export const templates: SkillTemplate[] = [
  {
    id: 'welcome-studio-degen-full',
    assetType: 'welcome_message',
    toneProfile: 'degen',
    template: `👋 Welcome to {PROJECT_NAME}, {first}!\n\nYou're in the right place at the right time 🫡\n\n📌 Read the rules: /rules\n📊 Chart: {CHART_URL}\n💬 Be respectful, have fun, and don't get banned\n\n{PROJECT_NAME} — {TICKER} 🚀`,
    variables: ['PROJECT_NAME', 'TICKER', 'CHART_URL'],
  },
  {
    id: 'welcome-studio-premium-full',
    assetType: 'welcome_message',
    toneProfile: 'premium',
    template: `Welcome to {PROJECT_NAME}, {first}.\n\nThank you for joining our community. We're building something meaningful here.\n\nTo get started:\n• Review our community guidelines: /rules\n• Introduce yourself in #introductions\n• Ask questions anytime\n\nWe're glad you're here.`,
    variables: ['PROJECT_NAME'],
  },
  {
    id: 'welcome-studio-technical-full',
    assetType: 'welcome_message',
    toneProfile: 'technical',
    template: `Welcome to {PROJECT_NAME} ({TICKER}), {first}.\n\nQuick orientation:\n→ /rules — community guidelines\n→ /docs — technical documentation  \n→ /ca — contract address\n→ /chart — live price data\n\nSignal > noise. Let's build.`,
    variables: ['PROJECT_NAME', 'TICKER'],
  },
];
