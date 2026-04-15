// Wizard flow types — the guided setup questionnaire

export type LaunchPlatform =
  | 'pumpfun'
  | 'raydium'
  | 'orca'
  | 'solana_general'
  | 'ethereum'
  | 'base'
  | 'other';

export type CommunityCategory =
  | 'token'
  | 'meme_token'
  | 'utility_token'
  | 'nft'
  | 'infra'
  | 'general_community'
  | 'private_alpha'
  | 'dao'
  | 'other';

export type SecurityProfile = 'low' | 'balanced' | 'hard' | 'extreme';

export type AutomationProfile = 'minimal' | 'standard' | 'aggressive_safe';

export type ToneProfile = 'premium' | 'degen' | 'technical' | 'formal' | 'hybrid';

export type IntegrationChoice =
  | 'rose'
  | 'combot'
  | 'safeguard'
  | 'controllerbot'
  | 'chainfuel'
  | 'buybot'
  | 'alertbot';

export interface WizardAnswers {
  // Step 1: Launch basics
  launchName: string;
  launchTicker?: string;
  launchDescription: string;

  // Step 2: Platform
  platform: LaunchPlatform;
  contractAddress?: string;
  websiteUrl?: string;
  twitterUrl?: string;
  telegramUrl?: string;

  // Step 3: Category
  category: CommunityCategory;

  // Step 4: Security
  securityProfile: SecurityProfile;

  // Step 5: Automation
  automationProfile: AutomationProfile;

  // Step 6: Integrations
  integrations: IntegrationChoice[];

  // Step 7: Tone
  toneProfile: ToneProfile;

  // Step 8: Assets requested
  generateWelcome: boolean;
  generateRules: boolean;
  generateFaq: boolean;
  generateCommands: boolean;
  generateAnnouncements: boolean;
  generateCrisisMode: boolean;
  generateRaidMode: boolean;
}

export interface WizardStep {
  id: string;
  title: string;
  description: string;
  fieldKey: keyof WizardAnswers | null;
  type: 'single_choice' | 'multi_choice' | 'text' | 'toggle_group' | 'review';
  options?: WizardOption[];
  required: boolean;
  condition?: (answers: Partial<WizardAnswers>) => boolean;
}

export interface WizardOption {
  value: string;
  label: string;
  description?: string;
  icon?: string;
  recommended?: boolean;
}

export const WIZARD_STEPS: WizardStep[] = [
  {
    id: 'launch_basics',
    title: "What are you launching?",
    description: "Tell us about your project so we can tailor everything perfectly.",
    fieldKey: null,
    type: 'text',
    required: true,
  },
  {
    id: 'platform',
    title: "Where are you launching?",
    description: "Choose your primary launch platform.",
    fieldKey: 'platform',
    type: 'single_choice',
    required: true,
    options: [
      { value: 'pumpfun', label: 'pump.fun', description: 'Solana meme token launchpad', recommended: true },
      { value: 'raydium', label: 'Raydium', description: 'Solana DEX / AMM' },
      { value: 'orca', label: 'Orca', description: 'Solana concentrated liquidity' },
      { value: 'solana_general', label: 'Solana (General)', description: 'Other Solana protocols' },
      { value: 'ethereum', label: 'Ethereum', description: 'EVM mainnet' },
      { value: 'base', label: 'Base', description: 'Coinbase L2' },
      { value: 'other', label: 'Other', description: 'Something else' },
    ],
  },
  {
    id: 'category',
    title: "What category best fits your community?",
    description: "This shapes your security defaults and automation stack.",
    fieldKey: 'category',
    type: 'single_choice',
    required: true,
    options: [
      { value: 'token', label: 'Token Project', description: 'Standard token with utility or governance' },
      { value: 'meme_token', label: 'Meme Token', description: 'Community-driven, high energy, fast-moving', recommended: true },
      { value: 'utility_token', label: 'Utility Token', description: 'Token with product/protocol utility' },
      { value: 'nft', label: 'NFT Project', description: 'NFT collection or marketplace' },
      { value: 'infra', label: 'Infrastructure', description: 'Protocol, tooling, or dev infrastructure' },
      { value: 'general_community', label: 'General Community', description: 'Non-token community or DAO' },
      { value: 'private_alpha', label: 'Private Alpha', description: 'Invite-only, high-security community' },
      { value: 'dao', label: 'DAO', description: 'Decentralized autonomous organization' },
      { value: 'other', label: 'Other', description: 'Something else' },
    ],
  },
  {
    id: 'security',
    title: "How strict should security be?",
    description: "Controls anti-spam aggressiveness, verification requirements, and access controls.",
    fieldKey: 'securityProfile',
    type: 'single_choice',
    required: true,
    options: [
      { value: 'low', label: 'Low', description: 'Open and welcoming. Minimal friction.' },
      { value: 'balanced', label: 'Balanced', description: 'Standard protection. Good for most projects.', recommended: true },
      { value: 'hard', label: 'Hard', description: 'Aggressive anti-spam. Captcha and verification gates.' },
      { value: 'extreme', label: 'Extreme', description: 'Maximum lockdown. Invite-only with manual approval.' },
    ],
  },
  {
    id: 'automation',
    title: "How much automation do you want?",
    description: "Controls bot activity, scheduled messages, and community management intensity.",
    fieldKey: 'automationProfile',
    type: 'single_choice',
    required: true,
    options: [
      { value: 'minimal', label: 'Minimal', description: 'Just the essentials. You run things manually.' },
      { value: 'standard', label: 'Standard', description: 'Welcome messages, anti-spam, basic moderation.', recommended: true },
      { value: 'aggressive_safe', label: 'Aggressive (Safe)', description: 'Full automation stack, still ethical and non-deceptive.' },
    ],
  },
  {
    id: 'integrations',
    title: "Which bots and services do you want?",
    description: "Select the tools you want configured for your community.",
    fieldKey: 'integrations',
    type: 'multi_choice',
    required: false,
    options: [
      { value: 'rose', label: 'Rose Bot', description: 'Moderation, notes, filters, welcome', recommended: true },
      { value: 'combot', label: 'Combot', description: 'Analytics, moderation, anti-spam', recommended: true },
      { value: 'safeguard', label: 'Safeguard', description: 'Advanced spam protection' },
      { value: 'controllerbot', label: 'ControllerBot', description: 'Channel management' },
      { value: 'buybot', label: 'Buy Bot', description: 'DEX buy notifications' },
      { value: 'alertbot', label: 'Alert Bot', description: 'Price and volume alerts' },
    ],
  },
  {
    id: 'tone',
    title: "What tone should your community copy have?",
    description: "Defines the voice for all generated messages, commands, and templates.",
    fieldKey: 'toneProfile',
    type: 'single_choice',
    required: true,
    options: [
      { value: 'degen', label: 'Degen / Meme-Aware', description: 'High energy, crypto-native, fun', recommended: true },
      { value: 'premium', label: 'Premium / Polished', description: 'Elegant, professional, sophisticated' },
      { value: 'technical', label: 'Technical / Credible', description: 'Data-forward, precise, builder-focused' },
      { value: 'formal', label: 'Formal / Institutional', description: 'Corporate-appropriate, measured' },
      { value: 'hybrid', label: 'Hybrid', description: 'Balanced blend of professional and crypto-native' },
    ],
  },
  {
    id: 'assets',
    title: "What should we generate for you?",
    description: "Select all asset types you want created.",
    fieldKey: null,
    type: 'toggle_group',
    required: false,
  },
];
