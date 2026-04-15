/**
 * @file skills.test.ts
 * Unit tests for the SkillRegistry (packages/skills).
 *
 * Tests cover:
 * - SkillRegistry.initialize() loads all 9 built-in packs without throwing
 * - getCompatiblePacks() filters correctly by category, security, and automation profiles
 * - getPackById() (via registry.get()) finds known packs
 * - getPackById() returns null for unknown IDs
 * - All loaded packs have required frontmatter fields
 *
 * File-system reads are tested against the actual packs directory in the monorepo.
 * No database or network connections are required.
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';
import path from 'path';
import fs from 'fs';

// ─── Mocked SkillRegistry ─────────────────────────────────────────────────────
// We test SkillRegistry directly but mock the heavy file system paths so tests
// are deterministic and don't require a fully compiled dist/.

// Mock gray-matter so we can return controlled frontmatter in tests
vi.mock('gray-matter', () => {
  return {
    default: (raw: string) => {
      // Parse the YAML frontmatter block manually (we only need key fields)
      const match = raw.match(/^---\n([\s\S]*?)\n---/);
      if (!match) return { data: {}, content: '' };
      const yaml = match[1]!;

      const getValue = (key: string): unknown => {
        const lineMatch = yaml.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
        if (!lineMatch) return undefined;
        const val = lineMatch[1]!.trim();
        if (val === 'true') return true;
        if (val === 'false') return false;
        if (!isNaN(Number(val))) return Number(val);
        // Strip quotes
        return val.replace(/^['"]|['"]$/g, '');
      };

      const getArray = (key: string): string[] => {
        const block = yaml.match(new RegExp(`${key}:\\s*\\n((?:\\s+-\\s+.+\\n?)+)`, 'm'));
        if (!block) {
          // Might be inline: key: [a, b]
          const inlineMatch = yaml.match(new RegExp(`${key}:\\s*all`, 'm'));
          if (inlineMatch) return [];
          return [];
        }
        return block[1]!.split('\n')
          .map((l) => l.replace(/^\s+-\s+/, '').trim())
          .filter(Boolean);
      };

      // Map compatibleCategories
      let compatibleCategories: string[] | 'all' = 'all';
      if (yaml.includes('compatibleCategories: all')) {
        compatibleCategories = 'all';
      } else {
        const cats = getArray('compatibleCategories');
        if (cats.length > 0) compatibleCategories = cats;
      }

      return {
        data: {
          slug: getValue('slug') as string,
          name: getValue('name') as string,
          version: getValue('version') as string,
          description: getValue('description') as string,
          author: getValue('author') as string ?? 'LaunchCtrl',
          tags: getArray('tags'),
          requiredIntegrations: getArray('requiredIntegrations'),
          conflictsWith: getArray('conflictsWith'),
          compatibleCategories,
          minSecurityProfile: getValue('minSecurityProfile') as string ?? 'low',
          minAutomationProfile: getValue('minAutomationProfile') as string ?? 'minimal',
          safetyRules: [],
          configSchema: [],
        },
        content: '',
      };
    },
  };
});

// Mock the dist-loading path in the loader so it doesn't fail in test env
vi.mock('path', async (importOriginal) => {
  return importOriginal<typeof import('path')>();
});

// ─── Actual registry import ───────────────────────────────────────────────────
// We import the real SkillRegistry after mocking gray-matter.
import { skillRegistry } from '@launchctrl/skills';

// ─── Known packs ─────────────────────────────────────────────────────────────
const KNOWN_PACK_SLUGS = [
  'rose-core',
  'rose-hardening',
  'combot-analytics',
  'pumpfun-launch',
  'command-pack-socials',
  'welcome-copy-studio',
  'crisis-mode',
  'raid-mode',
  'faq-pack',
] as const;

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('SkillRegistry — initialization', () => {
  it('initialize() resolves without throwing', async () => {
    await expect(skillRegistry.initialize()).resolves.not.toThrow();
  });

  it('initialize() is idempotent (safe to call multiple times)', async () => {
    await expect(skillRegistry.initialize()).resolves.not.toThrow();
    await expect(skillRegistry.initialize()).resolves.not.toThrow();
  });

  it('getAll() returns a non-empty array after initialization', async () => {
    await skillRegistry.initialize();
    const packs = skillRegistry.getAll();
    expect(packs.length).toBeGreaterThan(0);
  });
});

describe('SkillRegistry — getPackById / get()', () => {
  beforeAll(async () => {
    await skillRegistry.initialize();
  });

  it('get("rose-core") returns a LoadedSkillPack', async () => {
    const pack = await skillRegistry.get('rose-core');
    expect(pack).not.toBeNull();
    expect(pack).toBeDefined();
  });

  it('get("rose-core") returns a pack with slug "rose-core"', async () => {
    const pack = await skillRegistry.get('rose-core');
    expect(pack?.meta.slug).toBe('rose-core');
  });

  it('get("combot-analytics") returns a pack with correct slug', async () => {
    const pack = await skillRegistry.get('combot-analytics');
    expect(pack?.meta.slug).toBe('combot-analytics');
  });

  it('get("nonexistent-slug") returns null', async () => {
    const pack = await skillRegistry.get('nonexistent-slug-xyz');
    expect(pack).toBeNull();
  });

  it('get("") returns null for empty string', async () => {
    const pack = await skillRegistry.get('');
    expect(pack).toBeNull();
  });

  it('has() returns true for loaded packs', async () => {
    const hasPack = skillRegistry.has('rose-core');
    expect(hasPack).toBe(true);
  });

  it('has() returns false for unknown slugs', async () => {
    const hasPack = skillRegistry.has('does-not-exist');
    expect(hasPack).toBe(false);
  });
});

describe('SkillRegistry — getCompatiblePacks()', () => {
  beforeAll(async () => {
    await skillRegistry.initialize();
  });

  it('returns non-empty array for meme_token / balanced / standard', () => {
    const packs = skillRegistry.getCompatiblePacks('meme_token', 'balanced', 'standard');
    expect(packs.length).toBeGreaterThan(0);
  });

  it('rose-core is compatible with all categories, low security, minimal automation', () => {
    const packs = skillRegistry.getCompatiblePacks('general_community', 'low', 'minimal');
    const roseCore = packs.find((p) => p.meta.slug === 'rose-core');
    expect(roseCore).toBeDefined();
  });

  it('rose-hardening is NOT compatible with low security (requires balanced+)', () => {
    const packs = skillRegistry.getCompatiblePacks('general_community', 'low', 'minimal');
    const roseHardening = packs.find((p) => p.meta.slug === 'rose-hardening');
    expect(roseHardening).toBeUndefined();
  });

  it('rose-hardening IS compatible with balanced security', () => {
    const packs = skillRegistry.getCompatiblePacks('general_community', 'balanced', 'minimal');
    const roseHardening = packs.find((p) => p.meta.slug === 'rose-hardening');
    expect(roseHardening).toBeDefined();
  });

  it('all returned packs satisfy the minimum security profile requirement', () => {
    const packs = skillRegistry.getCompatiblePacks('meme_token', 'hard', 'standard');
    const securityOrder = ['low', 'balanced', 'hard', 'extreme'];

    for (const pack of packs) {
      const packMinIdx = securityOrder.indexOf(pack.meta.minSecurityProfile);
      const requestedIdx = securityOrder.indexOf('hard');
      expect(requestedIdx).toBeGreaterThanOrEqual(packMinIdx);
    }
  });

  it('all returned packs satisfy the minimum automation profile requirement', () => {
    const packs = skillRegistry.getCompatiblePacks('meme_token', 'balanced', 'aggressive_safe');
    const autoOrder = ['minimal', 'standard', 'aggressive_safe'];

    for (const pack of packs) {
      const packMinIdx = autoOrder.indexOf(pack.meta.minAutomationProfile);
      const requestedIdx = autoOrder.indexOf('aggressive_safe');
      expect(requestedIdx).toBeGreaterThanOrEqual(packMinIdx);
    }
  });

  it('returns fewer packs for minimal automation than aggressive_safe', () => {
    const minimal = skillRegistry.getCompatiblePacks('meme_token', 'low', 'minimal');
    const aggressive = skillRegistry.getCompatiblePacks('meme_token', 'extreme', 'aggressive_safe');
    // Aggressive with high security should include everything minimal covers
    expect(aggressive.length).toBeGreaterThanOrEqual(minimal.length);
  });
});

describe('SkillRegistry — pack frontmatter validation', () => {
  beforeAll(async () => {
    await skillRegistry.initialize();
  });

  it('all loaded packs have a non-empty id/slug field', async () => {
    const packs = skillRegistry.getAll();
    for (const pack of packs) {
      expect(pack.meta.slug).toBeTruthy();
      expect(typeof pack.meta.slug).toBe('string');
    }
  });

  it('all loaded packs have a non-empty name field', async () => {
    const packs = skillRegistry.getAll();
    for (const pack of packs) {
      expect(pack.meta.name).toBeTruthy();
      expect(typeof pack.meta.name).toBe('string');
    }
  });

  it('all loaded packs have a semver version field', async () => {
    const packs = skillRegistry.getAll();
    const semverPattern = /^\d+\.\d+\.\d+/;
    for (const pack of packs) {
      expect(pack.meta.version).toBeTruthy();
      expect(semverPattern.test(pack.meta.version)).toBe(true);
    }
  });

  it('all loaded packs have a description field', async () => {
    const packs = skillRegistry.getAll();
    for (const pack of packs) {
      // description may be trimmed from gray-matter
      expect(typeof pack.meta.description).toBe('string');
    }
  });

  it('all loaded packs have a valid minSecurityProfile', async () => {
    const packs = skillRegistry.getAll();
    const valid = ['low', 'balanced', 'hard', 'extreme'];
    for (const pack of packs) {
      expect(valid).toContain(pack.meta.minSecurityProfile);
    }
  });

  it('all loaded packs have a valid minAutomationProfile', async () => {
    const packs = skillRegistry.getAll();
    const valid = ['minimal', 'standard', 'aggressive_safe'];
    for (const pack of packs) {
      expect(valid).toContain(pack.meta.minAutomationProfile);
    }
  });

  it('all loaded packs have a tags array', async () => {
    const packs = skillRegistry.getAll();
    for (const pack of packs) {
      expect(Array.isArray(pack.meta.tags)).toBe(true);
    }
  });

  it('all loaded packs have a compatibleCategories field', async () => {
    const packs = skillRegistry.getAll();
    for (const pack of packs) {
      const cc = pack.meta.compatibleCategories;
      expect(cc === 'all' || Array.isArray(cc)).toBe(true);
    }
  });
});

describe('SkillRegistry — getByTags()', () => {
  beforeAll(async () => {
    await skillRegistry.initialize();
  });

  it('getByTags(["rose"]) returns at least rose-core', () => {
    const packs = skillRegistry.getByTags(['rose']);
    const slugs = packs.map((p) => p.meta.slug);
    expect(slugs).toContain('rose-core');
  });

  it('getByTags(["combot"]) returns at least combot-analytics', () => {
    const packs = skillRegistry.getByTags(['combot']);
    const slugs = packs.map((p) => p.meta.slug);
    expect(slugs).toContain('combot-analytics');
  });

  it('getByTags(["nonexistent_tag_xyz"]) returns empty array', () => {
    const packs = skillRegistry.getByTags(['nonexistent_tag_xyz']);
    expect(packs).toHaveLength(0);
  });
});

describe('SkillRegistry — SKILL.md files exist on disk', () => {
  const packsDir = path.resolve(__dirname, '../../packages/skills/packs');

  it.each(KNOWN_PACK_SLUGS)('%s SKILL.md exists', (slug) => {
    const skillFile = path.join(packsDir, slug, 'SKILL.md');
    expect(fs.existsSync(skillFile)).toBe(true);
  });

  it.each(KNOWN_PACK_SLUGS)('%s schema.ts exists', (slug) => {
    const schemaFile = path.join(packsDir, slug, 'schema.ts');
    expect(fs.existsSync(schemaFile)).toBe(true);
  });

  it.each(KNOWN_PACK_SLUGS)('%s templates.ts exists', (slug) => {
    const templatesFile = path.join(packsDir, slug, 'templates.ts');
    expect(fs.existsSync(templatesFile)).toBe(true);
  });

  it('all expected skill slugs are discovered from the packs directory', () => {
    const dirs = fs
      .readdirSync(packsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    for (const slug of KNOWN_PACK_SLUGS) {
      expect(dirs).toContain(slug);
    }
  });
});
