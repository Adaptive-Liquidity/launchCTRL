import type { SkillTemplate } from '@launchctrl/types';

export const templates: SkillTemplate[] = [
  {
    id: 'raid-mode-activate',
    assetType: 'raid_mode_message',
    toneProfile: 'all',
    template: `⚠️ RAID MODE ACTIVATED — {PROJECT_NAME}\n\nWe are currently under a coordinated bot attack. Messaging has been temporarily restricted.\n\nLegitimate members: sit tight. We're cleaning this up.\n\nEstimated resolution: {ETA}\n\n— {PROJECT_NAME} Moderation Team`,
    variables: ['PROJECT_NAME', 'ETA'],
  },
  {
    id: 'raid-mode-commands',
    assetType: 'custom',
    toneProfile: 'all',
    template: `# Rose Raid Mode Commands\n# Enable:\n/slowmode {SLOW_MODE_SECONDS}\n/lock\n\n# Disable (when raid is over):\n/unlock\n/slowmode 0`,
    variables: ['SLOW_MODE_SECONDS'],
  },
  {
    id: 'raid-mode-deactivate',
    assetType: 'raid_mode_message',
    toneProfile: 'all',
    template: `✅ Raid Mode Cleared — {PROJECT_NAME}\n\nThe attack has been repelled. Group messaging is now restored.\n\nThank you for your patience. {BANNED_COUNT} accounts were removed.\n\n— {PROJECT_NAME} Moderation Team`,
    variables: ['PROJECT_NAME', 'BANNED_COUNT'],
  },
];
