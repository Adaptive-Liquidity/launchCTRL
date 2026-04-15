import type { ToneProfileDefinition } from './index.js';
import type { AssetType } from '@launchctrl/types';

const templates: Partial<Record<AssetType, string>> = {
  welcome_message: `Welcome to {PROJECT_NAME}, {first}.\n\nWe're building something worth your attention. Take a moment to review our guidelines and make yourself at home.\n\nTicker: {TICKER}`,
  rules_message: `{PROJECT_NAME} — Community Standards\n\n1. Treat all members with respect\n2. No unsolicited promotional content\n3. No misleading information or speculation presented as fact\n4. No external links without moderator approval\n5. No impersonation of team or community figures\n6. Moderator decisions are final and not subject to public debate\n\nRepeated violations result in permanent removal.`,
  anti_spam_notice: `{PROJECT_NAME} maintains strict anti-spam standards. Violations result in immediate action.`,
  ban_message: `{USERNAME} has been removed from {PROJECT_NAME}.\nReason: {BAN_REASON}`,
  faq_note: `{PROJECT_NAME} — Frequently Asked Questions\n\nTicker: {TICKER}\nContract: {CONTRACT_ADDRESS}\nChart: {CHART_URL}\nWebsite: {WEBSITE_URL}\n\nFor further questions, contact a moderator.`,
  social_command_reply: `{PROJECT_NAME} on Twitter/X\n{TWITTER_URL}`,
  buy_command_reply: `How to acquire {TICKER}\n\n{BUY_LINK}\nContract: {CONTRACT_ADDRESS}\n\nPlease conduct your own due diligence before purchasing any digital asset.`,
  announcement_template: `{PROJECT_NAME} — Official Update\n\n[Content here]\n\n{PROJECT_NAME} Team`,
  crisis_mode_message: `{PROJECT_NAME} — Official Statement\n\nThe team is aware of the current situation and is actively addressing it. An official update will follow shortly.\n\nPlease rely only on announcements from this channel.\n\n— {PROJECT_NAME} Team`,
  raid_mode_message: `{PROJECT_NAME} — Temporary Restriction\n\nDue to unusual activity, messaging has been temporarily restricted. This measure is precautionary and will be lifted once the situation is resolved.\n\n— Moderation Team`,
  support_instructions: `For support with {PROJECT_NAME}, please post your question in the community group. A team member will respond promptly.\n\nImportant: Our team never initiates direct messages. If you receive an unsolicited DM claiming to represent {PROJECT_NAME}, please report it immediately.`,
};

export const premiumTone: ToneProfileDefinition = {
  id: 'premium',
  name: 'Premium / Polished',
  description: 'Elegant, professional, and sophisticated',
  voiceNotes: [
    'Measured, confident tone',
    'No slang or crypto jargon',
    'Minimal emoji use',
    'Clean formatting',
    'Understated authority',
  ],
  getTemplate: (assetType: AssetType) => templates[assetType] ?? null,
};
