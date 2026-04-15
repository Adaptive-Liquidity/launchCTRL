import type { AssetType, ToneProfile } from '@launchctrl/types';
import { premiumTone } from './premium.js';
import { degenTone } from './degen.js';
import { technicalTone } from './technical.js';
import { formalTone } from './formal.js';
import { hybridTone } from './hybrid.js';

export interface ToneProfileDefinition {
  id: ToneProfile;
  name: string;
  description: string;
  voiceNotes: string[];
  getTemplate: (assetType: AssetType) => string | null;
}

export const toneProfiles: Record<ToneProfile, ToneProfileDefinition> = {
  premium: premiumTone,
  degen: degenTone,
  technical: technicalTone,
  formal: formalTone,
  hybrid: hybridTone,
};
