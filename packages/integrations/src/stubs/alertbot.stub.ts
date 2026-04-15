import type { IntegrationAdapter, AdapterExecuteResult, AdapterActionInput } from '../base/adapter.interface.js';
import type { PlanStep, ExecutionMode } from '@launchctrl/types';
import type { AdapterCapability } from '../base/capability.types.js';

export class AlertBotAdapterStub implements IntegrationAdapter {
  readonly slug = 'alertbot';
  readonly displayName = 'Alert Bot';
  readonly capabilities: AdapterCapability[] = [];
  getExecutionMode(_action: string): ExecutionMode { return 'MANUAL_CONFIRMATION_REQUIRED'; }
  async execute(_input: AdapterActionInput): Promise<AdapterExecuteResult> {
    return { success: false, output: {}, error: null, requiresManualFollowUp: true };
  }
  canExecute(_action: string, _config: Record<string, unknown>): boolean { return false; }
  describeStep(step: PlanStep): string { return `Alert Bot: ${step.title}`; }
}
