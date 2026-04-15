import type { WizardAnswers } from '@launchctrl/types';

export interface NormalizedIntake {
  answers: WizardAnswers;
  resolvedPlatformLabel: string;
  resolvedCategoryLabel: string;
  isMemeProject: boolean;
  isHighSecurity: boolean;
  isHighAutomation: boolean;
  hasPumpFun: boolean;
  requestedIntegrationSlugs: string[];
}

export function normalizeIntake(answers: WizardAnswers): NormalizedIntake {
  const PLATFORM_LABELS: Record<string, string> = {
    pumpfun: 'pump.fun',
    raydium: 'Raydium',
    orca: 'Orca',
    solana_general: 'Solana',
    ethereum: 'Ethereum',
    base: 'Base',
    other: 'Other',
  };

  const CATEGORY_LABELS: Record<string, string> = {
    token: 'Token Project',
    meme_token: 'Meme Token',
    utility_token: 'Utility Token',
    nft: 'NFT Project',
    infra: 'Infrastructure',
    general_community: 'General Community',
    private_alpha: 'Private Alpha',
    dao: 'DAO',
    other: 'Other',
  };

  return {
    answers,
    resolvedPlatformLabel: PLATFORM_LABELS[answers.platform] ?? answers.platform,
    resolvedCategoryLabel: CATEGORY_LABELS[answers.category] ?? answers.category,
    isMemeProject: answers.category === 'meme_token' || answers.platform === 'pumpfun',
    isHighSecurity: answers.securityProfile === 'hard' || answers.securityProfile === 'extreme',
    isHighAutomation: answers.automationProfile === 'aggressive_safe',
    hasPumpFun: answers.platform === 'pumpfun',
    requestedIntegrationSlugs: answers.integrations,
  };
}
