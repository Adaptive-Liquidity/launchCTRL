import type { IntegrationAdapter, AdapterExecuteResult, AdapterActionInput } from '../base/adapter.interface.js';
import type { PlanStep, ExecutionMode } from '@launchctrl/types';
import type { AdapterCapability } from '../base/capability.types.js';

/**
 * Safeguard Bot adapter stub.
 * Full implementation pending — Safeguard API research required.
 */
export class SafeguardAdapterStub implements IntegrationAdapter {
  readonly slug = 'safeguard';
  readonly displayName = 'Safeguard';
  readonly capabilities: AdapterCapability[] = [
    {
      id: 'captcha_verification',
      name: 'Captcha Verification',
      description: 'Advanced captcha for new members',
      mode: 'manual_dashboard',
      requiresAdminRights: true,
    },
    {
      id: 'cas_integration',
      name: 'CAS Integration',
      description: 'Combot Anti-Spam list integration',
      mode: 'manual_dashboard',
      requiresAdminRights: true,
    },
  ];

  getExecutionMode(_action: string): ExecutionMode {
    return 'MANUAL_CONFIRMATION_REQUIRED';
  }

  async execute(_input: AdapterActionInput): Promise<AdapterExecuteResult> {
    return {
      success: false,
      output: {},
      error: 'Safeguard adapter is not yet fully implemented. Manual setup required.',
      requiresManualFollowUp: true,
      manualInstructions: 'Visit https://t.me/SafeguardRobot and follow the setup wizard for your group.',
    };
  }

  canExecute(_action: string, _config: Record<string, unknown>): boolean {
    return false; // Not yet implemented
  }

  describeStep(step: PlanStep): string {
    return `Safeguard: ${step.title} (Manual — Not Yet Automated)`;
  }
}
