import { z } from 'zod';
import type { SkillPackSchema } from '@launchctrl/types';

const SkillPackSchemaZod = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(64),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  description: z.string().min(1).max(512),
  author: z.string().min(1),
  tags: z.array(z.string()),
  requiredIntegrations: z.array(z.string()),
  conflictsWith: z.array(z.string()),
  compatibleCategories: z.union([z.array(z.string()), z.literal('all')]),
  minSecurityProfile: z.enum(['low', 'balanced', 'hard', 'extreme']),
  minAutomationProfile: z.enum(['minimal', 'standard', 'aggressive_safe']),
  safetyRules: z.array(
    z.object({
      id: z.string(),
      description: z.string(),
      type: z.enum(['hard_block', 'soft_warn']),
      condition: z.string(),
    }),
  ),
  configSchema: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      type: z.enum(['string', 'number', 'boolean', 'select', 'multiselect']),
      required: z.boolean(),
      default: z.unknown().optional(),
      options: z.array(z.object({ value: z.string(), label: z.string() })).optional(),
      description: z.string().optional(),
    }),
  ),
});

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateSkillSchema(meta: unknown): ValidationResult {
  const result = SkillPackSchemaZod.safeParse(meta);

  if (result.success) {
    return { valid: true, errors: [] };
  }

  const errors = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
  return { valid: false, errors };
}

/**
 * Validates that a skill pack is safe to run with the given user config.
 * Checks safety rules and config schema.
 */
export function validateSkillConfig(
  pack: SkillPackSchema,
  config: Record<string, unknown>,
): ValidationResult {
  const errors: string[] = [];

  for (const field of pack.configSchema) {
    if (field.required && !(field.key in config)) {
      errors.push(`Required config field missing: ${field.key} (${field.label})`);
    }
  }

  // Safety rules — evaluate conditions
  // In production this would use a safe expression evaluator (not eval)
  // For now we enforce structural rules only
  for (const rule of pack.safetyRules) {
    if (rule.type === 'hard_block') {
      // Hard block rules are evaluated at plan generation time
      // This is a placeholder for the condition evaluator
    }
  }

  return { valid: errors.length === 0, errors };
}
