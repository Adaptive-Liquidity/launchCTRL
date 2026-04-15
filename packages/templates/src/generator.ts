import type { AssetType, ToneProfile } from '@launchctrl/types';
import { renderTemplate, type RenderResult } from './renderer.js';
import { toneProfiles } from './tones/index.js';

export interface GenerateAssetOptions {
  assetType: AssetType;
  tone: ToneProfile;
  variables: Record<string, string>;
  projectName: string;
  customTemplate?: string;
}

export interface GeneratedAsset {
  assetType: AssetType;
  tone: ToneProfile;
  content: string;
  variables: Record<string, string>;
  missingVariables: string[];
}

/**
 * Generates a single asset from tone-aware templates
 */
export function generateAsset(options: GenerateAssetOptions): GeneratedAsset {
  const { assetType, tone, variables, customTemplate } = options;

  const toneProfile = toneProfiles[tone];
  const template = customTemplate ?? toneProfile.getTemplate(assetType);

  if (!template) {
    // Fallback to a generic template
    const fallbackResult = renderTemplate(
      getFallbackTemplate(assetType, tone),
      variables,
    );
    return {
      assetType,
      tone,
      content: fallbackResult.content,
      variables,
      missingVariables: fallbackResult.missingVariables,
    };
  }

  const result: RenderResult = renderTemplate(template, variables);

  return {
    assetType,
    tone,
    content: result.content,
    variables,
    missingVariables: result.missingVariables,
  };
}

function getFallbackTemplate(assetType: AssetType, tone: ToneProfile): string {
  const templates: Partial<Record<AssetType, string>> = {
    welcome_message: `Welcome to {PROJECT_NAME}! Glad to have you here.`,
    rules_message: `{PROJECT_NAME} Community Rules\n\n1. Be respectful\n2. No spam\n3. No scams\n4. Follow moderator instructions`,
    anti_spam_notice: `{PROJECT_NAME}: Anti-spam is active. Violators will be removed.`,
    ban_message: `{USERNAME} has been removed from {PROJECT_NAME}.`,
    faq_note: `{PROJECT_NAME} FAQ — Use /help for more information.`,
    announcement_template: `📢 {PROJECT_NAME} Announcement\n\n[Your content here]`,
    crisis_mode_message: `{PROJECT_NAME} team is addressing an issue. Updates coming soon.`,
    raid_mode_message: `{PROJECT_NAME} is under attack. Messaging temporarily restricted.`,
  };

  return templates[assetType] ?? `${assetType} content for {PROJECT_NAME}`;
}
