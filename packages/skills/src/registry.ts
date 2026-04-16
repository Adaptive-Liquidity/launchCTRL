import type { LoadedSkillPack } from '@launchctrl/types';
import { loadAllSkillPacks, loadSkillPack } from './loader.js';
import { getLogger } from '@launchctrl/lib';

const logger = getLogger();

class SkillRegistry {
  private packs: Map<string, LoadedSkillPack> = new Map();
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    const packs = await loadAllSkillPacks();
    for (const pack of packs) {
      this.packs.set(pack.meta.slug, pack);
    }
    this.initialized = true;
    logger.info({ count: this.packs.size }, 'Skill registry initialized');
  }

  async get(slug: string): Promise<LoadedSkillPack | null> {
    if (this.packs.has(slug)) {
      return this.packs.get(slug) ?? null;
    }
    // Try loading on-demand
    try {
      const pack = await loadSkillPack(slug);
      this.packs.set(slug, pack);
      return pack;
    } catch {
      return null;
    }
  }

  getAll(): LoadedSkillPack[] {
    return Array.from(this.packs.values());
  }

  has(slug: string): boolean {
    return this.packs.has(slug);
  }

  async reload(slug: string): Promise<LoadedSkillPack | null> {
    const pack = await loadSkillPack(slug).catch(() => null);
    if (pack) {
      this.packs.set(slug, pack);
    }
    return pack;
  }

  getByTags(tags: string[]): LoadedSkillPack[] {
    return Array.from(this.packs.values()).filter((p) =>
      tags.some((tag) => p.meta.tags.includes(tag)),
    );
  }

  getCompatiblePacks(category: string, securityProfile: string, automationProfile: string): LoadedSkillPack[] {
    return Array.from(this.packs.values()).filter((p) => {
      const catOk =
        p.meta.compatibleCategories === 'all' || p.meta.compatibleCategories.includes(category as never);

      const securityOrder = ['low', 'balanced', 'hard', 'extreme'];
      const minSecIdx = securityOrder.indexOf(p.meta.minSecurityProfile);
      const curSecIdx = securityOrder.indexOf(securityProfile);
      const secOk = curSecIdx >= minSecIdx;

      const autoOrder = ['minimal', 'standard', 'aggressive_safe'];
      const minAutoIdx = autoOrder.indexOf(p.meta.minAutomationProfile);
      const curAutoIdx = autoOrder.indexOf(automationProfile);
      const autoOk = curAutoIdx >= minAutoIdx;

      return catOk && secOk && autoOk;
    });
  }
}

export const skillRegistry = new SkillRegistry();
