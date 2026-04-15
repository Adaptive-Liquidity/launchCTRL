import type { SkillTemplate } from '@launchctrl/types';

export const templates: SkillTemplate[] = [
  {
    id: 'rose-hardening-commands',
    assetType: 'custom',
    toneProfile: 'all',
    template: `/blacklistdelete on\n/welcomemute on\n/antiflood 3\n/setfloodaction ban\n/cleanservice on\n/rmcmd on\n/antiflood on`,
    variables: [],
  },
];
