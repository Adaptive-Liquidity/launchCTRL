import { getMissingVariables } from './variables.js';

export interface RenderOptions {
  strict?: boolean; // If true, throws on missing variables
  fallback?: string; // String to use for missing variables (default: keep placeholder)
}

export interface RenderResult {
  content: string;
  missingVariables: string[];
  hasWarnings: boolean;
}

/**
 * Renders a template string by replacing all {VARIABLE} placeholders.
 * Telegram-specific variables like {first}, {last}, {username}, {chat_name}
 * are Rose Bot built-ins and are intentionally left in the output.
 */
export function renderTemplate(
  template: string,
  variables: Record<string, string>,
  options: RenderOptions = {},
): RenderResult {
  // Rose Bot built-in variables — never replace these
  const ROSE_BUILTINS = new Set([
    'first', 'last', 'fullname', 'username', 'mention', 'id',
    'chatname', 'chat_name', 'chat_id',
  ]);

  const missing = getMissingVariables(template, variables).filter(
    (v) => !ROSE_BUILTINS.has(v.toLowerCase()),
  );

  if (options.strict && missing.length > 0) {
    throw new Error(`Missing template variables: ${missing.join(', ')}`);
  }

  let content = template;

  // Replace provided variables
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = new RegExp(`\\{${key}\\}`, 'g');
    content = content.replace(placeholder, value);
  }

  // Handle missing variables
  if (missing.length > 0 && options.fallback !== undefined) {
    for (const key of missing) {
      const placeholder = new RegExp(`\\{${key}\\}`, 'g');
      content = content.replace(placeholder, options.fallback);
    }
  }

  return {
    content,
    missingVariables: missing,
    hasWarnings: missing.length > 0,
  };
}

/**
 * Renders a template for preview with placeholder highlights
 */
export function renderPreview(template: string, variables: Record<string, string>): string {
  const result = renderTemplate(template, variables, { fallback: undefined });

  // For preview, wrap remaining placeholders in markers for UI highlighting
  return result.content.replace(/\{([A-Z_]+)\}/g, '[[[$1]]]');
}
