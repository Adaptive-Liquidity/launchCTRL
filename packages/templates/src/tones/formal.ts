import type { ToneProfileDefinition } from './index.js';
import type { AssetType } from '@launchctrl/types';

const templates: Partial<Record<AssetType, string>> = {
  welcome_message: `Dear {first},\n\nWelcome to the official {PROJECT_NAME} community. We are pleased to have you join us.\n\nPlease review our community guidelines before participating. Should you have any questions, our moderation team is available to assist.`,
  rules_message: `{PROJECT_NAME} — Official Community Guidelines\n\nArticle 1: Respectful Conduct\nAll members are expected to engage with courtesy and professionalism at all times.\n\nArticle 2: Prohibited Content\nPromotional material for external projects, misleading statements, spam, and unauthorized link sharing are strictly prohibited.\n\nArticle 3: Compliance\nMembers found in violation of these guidelines will receive a formal warning. Repeated violations will result in removal from the community.\n\nThese guidelines are subject to change. Members are responsible for staying informed.`,
  announcement_template: `Official Communication — {PROJECT_NAME}\nDate: [DATE]\n\nDear Community,\n\n[Content here]\n\nYours sincerely,\n{PROJECT_NAME} Management`,
  crisis_mode_message: `Official Notice — {PROJECT_NAME}\n\nThe {PROJECT_NAME} leadership team wishes to formally address the matter currently under discussion. We are conducting a full review and will issue an official statement at the earliest opportunity.\n\nWe ask that all members refrain from speculation until the official statement is released.\n\nThank you for your patience and understanding.\n\n— {PROJECT_NAME} Management`,
  support_instructions: `For formal support inquiries regarding {PROJECT_NAME}, please direct your questions to the community moderation team via the official channel.\n\nPlease note that {PROJECT_NAME} representatives will never initiate unsolicited private communications.`,
};

export const formalTone: ToneProfileDefinition = {
  id: 'formal',
  name: 'Formal / Institutional',
  description: 'Corporate-appropriate, measured, and professional',
  voiceNotes: [
    'Formal register throughout',
    'No contractions',
    'No crypto slang',
    'Structured paragraphs',
    'Measured and authoritative',
  ],
  getTemplate: (assetType: AssetType) => templates[assetType] ?? null,
};
