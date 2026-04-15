// Execution run types

import type { StepStatus, RiskNotice } from './planner.js';

export type RunStatus = 'idle' | 'dry_run' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface StepResult {
  stepId: string;
  status: StepStatus;
  startedAt: Date | null;
  completedAt: Date | null;
  output: Record<string, unknown> | null;
  error: string | null;
  manualConfirmedBy?: string;
  retryCount: number;
  idempotencyKey: string;
}

export interface ExecutionRun {
  id: string;
  planId: string;
  workspaceId: string;
  isDryRun: boolean;
  status: RunStatus;
  stepResults: StepResult[];
  startedAt: Date | null;
  completedAt: Date | null;
  failedAt: Date | null;
  triggeredBy: string;
  notes: string | null;
}

export interface ExecutionBundle {
  plan: import('./planner.js').Plan;
  run: ExecutionRun;
  manualItems: ManualItem[];
}

export interface ManualItem {
  stepId: string;
  title: string;
  instructions: string;
  copyContent?: string;
  deepLinkUrl?: string;
  completed: boolean;
}
