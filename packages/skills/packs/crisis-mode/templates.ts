import type { SkillTemplate } from '@launchctrl/types';

export const templates: SkillTemplate[] = [
  {
    id: 'crisis-lockdown-announcement',
    assetType: 'crisis_mode_message',
    toneProfile: 'all',
    template: `📌 IMPORTANT — {PROJECT_NAME} Team\n\nWe are currently addressing a situation and have temporarily restricted messaging.\n\nWe will post an update shortly. Please be patient.\n\nOfficial updates only from this channel. Do not trust DMs claiming to be from the team.\n\n— {PROJECT_NAME} Team`,
    variables: ['PROJECT_NAME'],
  },
  {
    id: 'crisis-fud-response',
    assetType: 'crisis_mode_message',
    toneProfile: 'all',
    template: `📌 Official Statement — {PROJECT_NAME}\n\nWe are aware of circulating information regarding {PROJECT_NAME}. We want to address this directly:\n\n{FUD_CLAIM_RESPONSE}\n\nOur commitment to the community remains unchanged. Here's what we're doing:\n\n{ACTION_ITEMS}\n\nThank you for your continued support.\n\n— {PROJECT_NAME} Team`,
    variables: ['PROJECT_NAME', 'FUD_CLAIM_RESPONSE', 'ACTION_ITEMS'],
  },
  {
    id: 'crisis-resolution',
    assetType: 'crisis_mode_message',
    toneProfile: 'all',
    template: `✅ Update — {PROJECT_NAME}\n\nThe situation has been resolved. Here's what happened and what we did:\n\n{INCIDENT_SUMMARY}\n\n{RESOLUTION_DETAILS}\n\nGroup messaging has been restored. Thank you for your patience.\n\n— {PROJECT_NAME} Team`,
    variables: ['PROJECT_NAME', 'INCIDENT_SUMMARY', 'RESOLUTION_DETAILS'],
  },
];
