import type { PlanStep, ExecutionMode } from '@launchctrl/types';
import type { AdapterCapability } from './capability.types.js';

export interface AdapterExecuteResult {
  success: boolean;
  output: Record<string, unknown>;
  error: string | null;
  requiresManualFollowUp: boolean;
  manualInstructions?: string;
  copyContent?: string;
}

export interface AdapterActionInput {
  action: string;
  payload: Record<string, unknown>;
  workspaceId: string;
  dryRun: boolean;
  idempotencyKey: string;
  context?: Record<string, unknown>;
}

export interface IntegrationAdapter {
  readonly slug: string;
  readonly displayName: string;
  readonly capabilities: AdapterCapability[];

  /**
   * Returns the effective execution mode for a given action.
   * This is honest about what can actually be automated.
   */
  getExecutionMode(action: string, context?: { hasUserbotSession?: boolean }): ExecutionMode;

  /**
   * Executes or simulates an action.
   * For COPY_PASTE/MANUAL actions, returns the content/instructions without doing anything.
   */
  execute(input: AdapterActionInput): Promise<AdapterExecuteResult>;

  /**
   * Validates that required config/credentials are present for this action.
   */
  canExecute(action: string, config: Record<string, unknown>): boolean;

  /**
   * Returns a human-readable description of what this adapter does for a step.
   */
  describeStep(step: PlanStep): string;
}
