// Planner output types

import type { IntegrationSlug, AssetType } from './domain.js';
import type { WizardAnswers } from './wizard.js';

export type ExecutionMode = 'AUTO' | 'ONE_CLICK' | 'COPY_PASTE' | 'MANUAL_CONFIRMATION_REQUIRED';

export type StepStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'awaiting_manual';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface RiskNotice {
  level: RiskLevel;
  title: string;
  description: string;
  mitigation?: string;
}

export interface PermissionRequirement {
  resource: string;
  required: string;
  why: string;
  isGranted?: boolean;
}

export interface PlanStep {
  id: string;
  sequence: number;
  title: string;
  description: string;
  executionMode: ExecutionMode;
  integration: IntegrationSlug | 'system' | 'telegram_api';
  action: string;
  payload: Record<string, unknown>;
  manualInstructions?: string;
  copyContent?: string;
  deepLinkUrl?: string;
  risks: RiskNotice[];
  permissions: PermissionRequirement[];
  compensatingAction?: string;
  idempotencyKey: string;
  estimatedDurationSeconds: number;
}

export interface GeneratedAssetSpec {
  assetType: AssetType;
  name: string;
  tone: string;
  variables: Record<string, string>;
  skillPackId: string;
}

export interface Plan {
  id: string;
  workspaceId: string;
  answers: WizardAnswers;
  recommendedStack: IntegrationSlug[];
  steps: PlanStep[];
  assetSpecs: GeneratedAssetSpec[];
  risks: RiskNotice[];
  permissions: PermissionRequirement[];
  estimatedTotalMinutes: number;
  manualStepCount: number;
  autoStepCount: number;
  createdAt: Date;
}
