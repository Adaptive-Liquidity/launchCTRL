import { nanoid } from 'nanoid';
import { getDb, schema } from '../../db/index.js';
import { eq, and, desc } from 'drizzle-orm';
import { getAdapter } from '@launchctrl/integrations';
import { generateAsset } from '@launchctrl/templates';
import type { PlanStep, StepResult } from '@launchctrl/types';
import { writeAuditEvent } from '../audit/audit.service.js';
import { getLogger } from '@launchctrl/lib';

const logger = getLogger();

export async function startExecutionRun(opts: {
  planId: string;
  workspaceId: string;
  userId: string;
  isDryRun: boolean;
}) {
  const db = getDb();

  // Load the plan
  const plan = await db
    .select()
    .from(schema.plans)
    .where(eq(schema.plans.id, opts.planId))
    .limit(1)
    .then((r) => r[0] ?? null);

  if (!plan) throw new Error(`Plan not found: ${opts.planId}`);

  // Create the run record
  const runId = nanoid();
  const run = await db
    .insert(schema.executionRuns)
    .values({
      id: runId,
      planId: opts.planId,
      workspaceId: opts.workspaceId,
      isDryRun: opts.isDryRun,
      status: 'running',
      stepResults: [],
      startedAt: new Date(),
      triggeredBy: opts.userId,
    })
    .returning()
    .then((r) => r[0]);

  if (!run) throw new Error('Failed to create execution run');

  await writeAuditEvent({
    userId: opts.userId,
    workspaceId: opts.workspaceId,
    action: 'run.started',
    resourceType: 'execution_run',
    resourceId: runId,
    metadata: { isDryRun: opts.isDryRun, planId: opts.planId },
    riskLevel: opts.isDryRun ? 'low' : 'medium',
  });

  // Execute steps
  const steps = plan.steps as PlanStep[];
  const stepResults: StepResult[] = [];

  for (const step of steps) {
    const result = await executeStep(step, opts.isDryRun, opts.workspaceId);
    stepResults.push(result);

    // Update run record after each step
    await db
      .update(schema.executionRuns)
      .set({ stepResults })
      .where(eq(schema.executionRuns.id, runId));
  }

  // Generate assets from asset specs
  const assetSpecs = plan.assetSpecs as Array<{
    assetType: string;
    name: string;
    tone: string;
    variables: Record<string, string>;
    skillPackId: string;
  }>;

  for (const spec of assetSpecs) {
    try {
      const generated = generateAsset({
        assetType: spec.assetType as any,
        tone: spec.tone as any,
        variables: spec.variables,
        projectName: spec.variables['PROJECT_NAME'] ?? 'Unknown',
      });

      await db.insert(schema.generatedAssets).values({
        id: nanoid(),
        workspaceId: opts.workspaceId,
        runId,
        assetType: spec.assetType,
        name: spec.name,
        content: generated.content,
        variables: spec.variables,
        tone: spec.tone,
      });
    } catch (error) {
      logger.error({ error, spec }, 'Failed to generate asset');
    }
  }

  // Determine final status
  const hasFailures = stepResults.some((r) => r.status === 'failed');
  const finalStatus = hasFailures ? 'failed' : 'completed';

  await db
    .update(schema.executionRuns)
    .set({
      status: finalStatus,
      stepResults,
      completedAt: new Date(),
      ...(hasFailures ? { failedAt: new Date() } : {}),
    })
    .where(eq(schema.executionRuns.id, runId));

  await writeAuditEvent({
    userId: opts.userId,
    workspaceId: opts.workspaceId,
    action: hasFailures ? 'run.failed' : 'run.completed',
    resourceType: 'execution_run',
    resourceId: runId,
    metadata: { stepCount: steps.length, failureCount: stepResults.filter((r) => r.status === 'failed').length },
    riskLevel: hasFailures ? 'high' : 'low',
  });

  return { runId, status: finalStatus, stepResults };
}

async function executeStep(step: PlanStep, isDryRun: boolean, workspaceId: string): Promise<StepResult> {
  const startedAt = new Date();

  try {
    // Load userbot session if available for this workspace (Rose adapter)
    let userbotContext: Record<string, unknown> = {};
    if (step.integration === 'rose') {
      const db = getDb();
      const userbotSession = await db.select()
        .from(schema.integrations)
        .where(and(
          eq(schema.integrations.workspaceId, workspaceId),
          eq(schema.integrations.type, 'userbot'),
          eq(schema.integrations.isActive, true),
        ))
        .limit(1)
        .then(r => r[0] ?? null);

      if (userbotSession) {
        const config = userbotSession.config as { encryptedSession?: string };
        if (config.encryptedSession) {
          userbotContext = {
            encryptedUserbotSession: config.encryptedSession,
            groupId: step.payload?.['groupId'] ?? step.payload?.['chatId'],
          };
        }
      }
    }

    // For non-AUTO steps: check whether a userbot session upgrades the mode
    const hasUserbotSession = Object.keys(userbotContext).length > 0;
    const adapter = getAdapter(step.integration);

    if (step.executionMode !== 'AUTO') {
      // If this step was planned as COPY_PASTE and we now have a userbot session,
      // re-evaluate the effective mode so it can run as AUTO
      const effectiveMode = adapter
        ? adapter.getExecutionMode(step.action, { hasUserbotSession })
        : step.executionMode;

      if (effectiveMode !== 'AUTO') {
        // Non-AUTO steps are not executed — they produce manual instructions
        return {
          stepId: step.id,
          status: 'awaiting_manual',
          startedAt,
          completedAt: new Date(),
          output: {
            mode: step.executionMode,
            copyContent: step.copyContent,
            manualInstructions: step.manualInstructions,
          },
          error: null,
          retryCount: 0,
          idempotencyKey: step.idempotencyKey,
        };
      }
      // effectiveMode is AUTO (userbot session present) — fall through to execute
    }

    // AUTO steps — execute via adapter (or simulate in dry run)
    if (!adapter) {
      return {
        stepId: step.id,
        status: 'completed',
        startedAt,
        completedAt: new Date(),
        output: { message: `System step completed: ${step.action}`, dryRun: isDryRun },
        error: null,
        retryCount: 0,
        idempotencyKey: step.idempotencyKey,
      };
    }

    const result = await adapter.execute({
      action: step.action,
      payload: step.payload,
      workspaceId,
      dryRun: isDryRun,
      idempotencyKey: step.idempotencyKey,
      context: userbotContext,
    });

    return {
      stepId: step.id,
      status: result.success ? 'completed' : 'failed',
      startedAt,
      completedAt: new Date(),
      output: result.output,
      error: result.error,
      retryCount: 0,
      idempotencyKey: step.idempotencyKey,
    };
  } catch (error) {
    return {
      stepId: step.id,
      status: 'failed',
      startedAt,
      completedAt: new Date(),
      output: {},
      error: String(error),
      retryCount: 0,
      idempotencyKey: step.idempotencyKey,
    };
  }
}

export async function getRunById(runId: string) {
  const db = getDb();
  return db
    .select()
    .from(schema.executionRuns)
    .where(eq(schema.executionRuns.id, runId))
    .limit(1)
    .then((r) => r[0] ?? null);
}

export async function getRunsForWorkspace(workspaceId: string) {
  const db = getDb();
  return db
    .select()
    .from(schema.executionRuns)
    .where(eq(schema.executionRuns.workspaceId, workspaceId))
    .orderBy(desc(schema.executionRuns.startedAt));
}
