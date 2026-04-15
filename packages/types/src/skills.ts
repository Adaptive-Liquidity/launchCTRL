// Skill pack system types

import type { IntegrationSlug } from './domain.js';
import type { SecurityProfile, AutomationProfile, ToneProfile, CommunityCategory } from './wizard.js';

export interface SkillPackSchema {
  slug: string;
  name: string;
  version: string;
  description: string;
  author: string;
  tags: string[];
  requiredIntegrations: IntegrationSlug[];
  conflictsWith: string[];
  compatibleCategories: CommunityCategory[] | 'all';
  minSecurityProfile: SecurityProfile;
  minAutomationProfile: AutomationProfile;
  safetyRules: SafetyRule[];
  configSchema: SkillConfigField[];
}

export interface SafetyRule {
  id: string;
  description: string;
  type: 'hard_block' | 'soft_warn';
  condition: string; // JSON logic expression string
}

export interface SkillConfigField {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'multiselect';
  required: boolean;
  default?: unknown;
  options?: Array<{ value: string; label: string }>;
  description?: string;
}

export interface LoadedSkillPack {
  meta: SkillPackSchema;
  config: Record<string, unknown>;
  templates: SkillTemplate[];
  valid: boolean;
  errors: string[];
}

export interface SkillTemplate {
  id: string;
  assetType: string;
  toneProfile: ToneProfile | 'all';
  template: string;
  variables: string[];
}

export interface SkillRunRecord {
  id: string;
  workspaceId: string;
  skillSlug: string;
  planId: string | null;
  config: Record<string, unknown>;
  output: Record<string, unknown>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: Date;
  completedAt: Date | null;
  error: string | null;
}
