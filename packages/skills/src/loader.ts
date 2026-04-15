import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import type { SkillPackSchema, LoadedSkillPack, SkillTemplate } from '@launchctrl/types';
import { getLogger } from '@launchctrl/lib';
import { validateSkillSchema } from './validator.js';

const logger = getLogger();

const PACKS_DIR = path.resolve(__dirname, '..', 'packs');

export async function loadSkillPack(slug: string): Promise<LoadedSkillPack> {
  const packDir = path.join(PACKS_DIR, slug);
  const skillFile = path.join(packDir, 'SKILL.md');

  if (!fs.existsSync(skillFile)) {
    throw new Error(`Skill pack not found: ${slug} (expected at ${skillFile})`);
  }

  const raw = fs.readFileSync(skillFile, 'utf8');
  const { data: frontmatter, content } = matter(raw);

  const meta = frontmatter as SkillPackSchema;
  const validationResult = validateSkillSchema(meta);

  if (!validationResult.valid) {
    logger.warn({ slug, errors: validationResult.errors }, 'Skill pack has validation errors');
  }

  // Load templates from the pack's templates module if it exists
  let templates: SkillTemplate[] = [];
  const templatesFile = path.join(packDir, 'templates.ts');
  if (fs.existsSync(templatesFile)) {
    try {
      // In production build, templates.js is the compiled output
      const templatesModule = await import(path.join(packDir, '..', '..', 'dist', 'packs', slug, 'templates.js'));
      templates = (templatesModule.templates as SkillTemplate[]) ?? [];
    } catch {
      logger.debug({ slug }, 'No compiled templates found for skill pack');
    }
  }

  return {
    meta: {
      ...meta,
      slug,
    },
    config: {},
    templates,
    valid: validationResult.valid,
    errors: validationResult.errors,
  };
}

export async function loadAllSkillPacks(): Promise<LoadedSkillPack[]> {
  if (!fs.existsSync(PACKS_DIR)) {
    logger.warn({ PACKS_DIR }, 'Skills packs directory does not exist');
    return [];
  }

  const slugs = fs
    .readdirSync(PACKS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  const packs = await Promise.allSettled(slugs.map((slug) => loadSkillPack(slug)));

  return packs
    .map((result, i) => {
      if (result.status === 'fulfilled') return result.value;
      logger.error({ slug: slugs[i], error: result.reason }, 'Failed to load skill pack');
      return null;
    })
    .filter((p): p is LoadedSkillPack => p !== null);
}
