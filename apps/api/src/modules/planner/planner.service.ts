import { normalizeIntake, selectStack, generatePlanSteps, validatePlanSteps, renderExecutionBundle } from '@launchctrl/domain';
import { getDb, schema } from '../../db/index.js';
import type { WizardAnswers } from '@launchctrl/types';
import { writeAuditEvent } from '../audit/audit.service.js';
import { eq, desc } from 'drizzle-orm';

export async function createPlan(opts: {
  workspaceId: string;
  userId: string;
  answers: WizardAnswers;
}) {
  const { workspaceId, userId, answers } = opts;

  // Run the planner pipeline
  const intake = normalizeIntake(answers);
  const stack = selectStack(intake);
  const steps = generatePlanSteps(intake, stack);
  const validation = validatePlanSteps(steps);

  // If there are hard errors, still create the plan but flag it
  const plan = renderExecutionBundle(workspaceId, intake, stack, steps);

  // Persist the plan
  const db = getDb();
  const saved = await db
    .insert(schema.plans)
    .values({
      id: plan.id,
      workspaceId: plan.workspaceId,
      answers: plan.answers,
      recommendedStack: plan.recommendedStack,
      steps: plan.steps,
      assetSpecs: plan.assetSpecs,
      risks: plan.risks,
      permissions: plan.permissions,
      estimatedTotalMinutes: plan.estimatedTotalMinutes,
      manualStepCount: plan.manualStepCount,
      autoStepCount: plan.autoStepCount,
    })
    .returning()
    .then((r) => r[0]);

  await writeAuditEvent({
    userId,
    workspaceId,
    action: 'plan.created',
    resourceType: 'plan',
    resourceId: plan.id,
    metadata: {
      stepCount: steps.length,
      autoSteps: plan.autoStepCount,
      manualSteps: plan.manualStepCount,
      estimatedMinutes: plan.estimatedTotalMinutes,
      validationErrors: validation.errors,
    },
    riskLevel: 'low',
  });

  return { plan: saved, validation };
}

export async function getPlansForWorkspace(workspaceId: string) {
  const db = getDb();
  return db
    .select()
    .from(schema.plans)
    .where(eq(schema.plans.workspaceId, workspaceId))
    .orderBy(desc(schema.plans.createdAt));
}

export async function getPlanById(planId: string) {
  const db = getDb();
  return db
    .select()
    .from(schema.plans)
    .where(eq(schema.plans.id, planId))
    .limit(1)
    .then((r) => r[0] ?? null);
}

export async function approvePlan(opts: {
  planId: string;
  userId: string;
  workspaceId: string;
}) {
  const db = getDb();
  const plan = await db
    .update(schema.plans)
    .set({ approvedAt: new Date(), approvedBy: opts.userId })
    .where(eq(schema.plans.id, opts.planId))
    .returning()
    .then((r) => r[0]);

  await writeAuditEvent({
    userId: opts.userId,
    workspaceId: opts.workspaceId,
    action: 'plan.approved',
    resourceType: 'plan',
    resourceId: opts.planId,
    metadata: {},
    riskLevel: 'medium',
  });

  return plan;
}
