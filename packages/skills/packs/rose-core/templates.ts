import type { SkillTemplate } from '@launchctrl/types';

export const templates: SkillTemplate[] = [
  {
    id: 'rose-core-welcome-degen',
    assetType: 'welcome_message',
    toneProfile: 'degen',
    template: `🚀 Welcome to {PROJECT_NAME}, {first}!\n\nYou're early. Read the rules, vibe with the community, and let's go 🔥\n\nTicker: {TICKER}\n\n👇 Rules below — read them fren`,
    variables: ['PROJECT_NAME', 'TICKER'],
  },
  {
    id: 'rose-core-welcome-premium',
    assetType: 'welcome_message',
    toneProfile: 'premium',
    template: `Welcome to {PROJECT_NAME}, {first}.\n\nWe're glad you're here. Please take a moment to review our community guidelines.\n\nTicker: {TICKER}`,
    variables: ['PROJECT_NAME', 'TICKER'],
  },
  {
    id: 'rose-core-welcome-technical',
    assetType: 'welcome_message',
    toneProfile: 'technical',
    template: `Welcome to {PROJECT_NAME} ({TICKER}), {first}.\n\nPlease review the pinned resources and community guidelines before posting. Technical questions belong in #support.`,
    variables: ['PROJECT_NAME', 'TICKER'],
  },
  {
    id: 'rose-core-welcome-formal',
    assetType: 'welcome_message',
    toneProfile: 'formal',
    template: `Welcome, {first}.\n\nThank you for joining the official {PROJECT_NAME} community. Please read the community rules before participating.`,
    variables: ['PROJECT_NAME'],
  },
  {
    id: 'rose-core-welcome-hybrid',
    assetType: 'welcome_message',
    toneProfile: 'hybrid',
    template: `Hey {first}, welcome to {PROJECT_NAME} 👋\n\nGlad to have you here. We keep it professional but the vibes are good.\n\nTicker: {TICKER}\n\nRead the rules and dive in!`,
    variables: ['PROJECT_NAME', 'TICKER'],
  },
  {
    id: 'rose-core-rules-degen',
    assetType: 'rules_message',
    toneProfile: 'degen',
    template: `📋 {PROJECT_NAME} Rules\n\n1. No shilling other projects\n2. No FUD without facts\n3. No spam or flood\n4. No scam links or impersonation\n5. Treat everyone with respect (even when they're wrong)\n6. No fake wallet screenshots\n7. English only in main chat\n8. Mods have final say. GG\n\nBreak the rules = ban. No appeals for scammers. ✌️`,
    variables: ['PROJECT_NAME'],
  },
  {
    id: 'rose-core-rules-premium',
    assetType: 'rules_message',
    toneProfile: 'premium',
    template: `Community Guidelines — {PROJECT_NAME}\n\n1. Respect all members at all times\n2. No promotional content for external projects\n3. No misleading information or FUD\n4. No spam, flood, or off-topic content\n5. No phishing links or wallet addresses\n6. Impersonation of team members is prohibited\n7. All communications in English in the main channel\n8. Moderator decisions are final\n\nViolations may result in warnings, mutes, or permanent removal.`,
    variables: ['PROJECT_NAME'],
  },
  {
    id: 'rose-core-ban-message',
    assetType: 'ban_message',
    toneProfile: 'all',
    template: `🚫 {USERNAME} has been removed from {PROJECT_NAME} for violating community rules.\n\nReason: {BAN_REASON}`,
    variables: ['USERNAME', 'PROJECT_NAME', 'BAN_REASON'],
  },
];
