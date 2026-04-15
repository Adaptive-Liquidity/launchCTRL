import type { SkillTemplate } from '@launchctrl/types';

export const templates: SkillTemplate[] = [
  {
    id: 'combot-setup-instructions',
    assetType: 'custom',
    toneProfile: 'all',
    template: `Combot Setup for {PROJECT_NAME}\n\n1. Add @combot to your group as admin\n2. Visit https://combot.org/c/{CHAT_ID}\n3. Enable Anti-Spam → CAS Ban List\n4. Set spam sensitivity to {SPAM_LEVEL}/10\n5. Enable Statistics tracking\n6. Configure welcome triggers if needed`,
    variables: ['PROJECT_NAME', 'CHAT_ID', 'SPAM_LEVEL'],
  },
];
