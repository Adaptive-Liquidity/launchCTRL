import type { IntegrationAdapter, AdapterExecuteResult, AdapterActionInput } from '../base/adapter.interface.js';
import type { PlanStep, ExecutionMode } from '@launchctrl/types';
import type { AdapterCapability } from '../base/capability.types.js';

export class BuyBotAdapterStub implements IntegrationAdapter {
  readonly slug = 'buybot';
  readonly displayName = 'Buy Bot';
  readonly capabilities: AdapterCapability[] = [
    {
      id: 'buy_notifications',
      name: 'Buy Notifications',
      description: 'DEX buy alerts in group chat',
      mode: 'manual_dashboard',
      requiresAdminRights: true,
      notes: 'Configure via your chosen buy bot provider (Maestro, Sigma, custom)',
    },
  ];
  getExecutionMode(_action: string): ExecutionMode { return 'MANUAL_CONFIRMATION_REQUIRED'; }
  async execute(_input: AdapterActionInput): Promise<AdapterExecuteResult> {
    return {
      success: false, output: {}, error: null, requiresManualFollowUp: true,
      manualInstructions: 'Buy bot setup varies by provider. Recommended: @MaestroProBot or @SigmaBot for Solana.',
    };
  }
  canExecute(_action: string, _config: Record<string, unknown>): boolean { return false; }
  describeStep(step: PlanStep): string { return `Buy Bot: ${step.title} (Manual Setup)`; }
}
