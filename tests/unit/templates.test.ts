/**
 * @file templates.test.ts
 * Unit tests for the template renderer (packages/templates).
 *
 * Tests cover:
 * - renderTemplate() substitutes all {VARIABLE} placeholders
 * - renderTemplate() throws in strict mode when variables are missing
 * - renderTemplate() applies fallback string for missing variables
 * - generateAsset() returns correct tone variant (degen vs premium)
 * - Tone profiles exist for all 5 tones: degen, premium, technical, formal, hybrid
 * - Rose Bot built-in variables ({first}, {username}, etc.) are NOT replaced
 */

import { describe, it, expect } from 'vitest';
import { renderTemplate, renderPreview } from '@launchctrl/templates';
import { generateAsset } from '@launchctrl/templates';
import { toneProfiles } from '../../packages/templates/src/tones/index';

// ─── renderTemplate ───────────────────────────────────────────────────────────

describe('renderTemplate — variable substitution', () => {
  it('substitutes a single {VARIABLE} placeholder', () => {
    const result = renderTemplate('Hello {PROJECT_NAME}!', { PROJECT_NAME: 'PepeMax' });
    expect(result.content).toBe('Hello PepeMax!');
    expect(result.missingVariables).toHaveLength(0);
    expect(result.hasWarnings).toBe(false);
  });

  it('substitutes multiple different {VARIABLE} placeholders', () => {
    const result = renderTemplate(
      '{PROJECT_NAME} ({TICKER}) — Launch on {PLATFORM}',
      { PROJECT_NAME: 'PepeMax', TICKER: 'PEPEMAX', PLATFORM: 'pump.fun' },
    );
    expect(result.content).toBe('PepeMax (PEPEMAX) — Launch on pump.fun');
    expect(result.missingVariables).toHaveLength(0);
  });

  it('substitutes the same {VARIABLE} multiple times', () => {
    const result = renderTemplate(
      '{PROJECT_NAME} is {PROJECT_NAME}. Join {PROJECT_NAME} today.',
      { PROJECT_NAME: 'CoinX' },
    );
    expect(result.content).toBe('CoinX is CoinX. Join CoinX today.');
  });

  it('handles empty string variable values', () => {
    const result = renderTemplate('CA: {CONTRACT_ADDRESS}', { CONTRACT_ADDRESS: '' });
    expect(result.content).toBe('CA: ');
    expect(result.missingVariables).toHaveLength(0);
  });

  it('handles templates with no variables', () => {
    const result = renderTemplate('No variables here.', {});
    expect(result.content).toBe('No variables here.');
    expect(result.missingVariables).toHaveLength(0);
    expect(result.hasWarnings).toBe(false);
  });

  it('leaves unused provided variables harmlessly ignored', () => {
    const result = renderTemplate(
      'Hello {PROJECT_NAME}',
      { PROJECT_NAME: 'Alpha', UNUSED_VAR: 'ignored' },
    );
    expect(result.content).toBe('Hello Alpha');
  });
});

describe('renderTemplate — missing variables', () => {
  it('reports missing variables in missingVariables array', () => {
    const result = renderTemplate(
      'Buy {PROJECT_NAME} on {EXCHANGE}',
      { PROJECT_NAME: 'PepeMax' },
    );
    expect(result.missingVariables).toContain('EXCHANGE');
    expect(result.hasWarnings).toBe(true);
  });

  it('keeps original placeholder when variable is missing (default behavior)', () => {
    const result = renderTemplate(
      'Price: {PRICE_USD}',
      {},
    );
    expect(result.content).toBe('Price: {PRICE_USD}');
    expect(result.missingVariables).toContain('PRICE_USD');
  });

  it('applies fallback string when options.fallback is provided', () => {
    const result = renderTemplate(
      'Price: {PRICE_USD}',
      {},
      { fallback: '[UNKNOWN]' },
    );
    expect(result.content).toBe('Price: [UNKNOWN]');
    expect(result.missingVariables).toContain('PRICE_USD');
  });

  it('applies empty string fallback correctly', () => {
    const result = renderTemplate(
      'Ticker: {TICKER}',
      {},
      { fallback: '' },
    );
    expect(result.content).toBe('Ticker: ');
  });

  it('throws in strict mode when variables are missing', () => {
    expect(() =>
      renderTemplate(
        'Hello {PROJECT_NAME} from {UNKNOWN_VAR}',
        { PROJECT_NAME: 'X' },
        { strict: true },
      )
    ).toThrow(/Missing template variables/);
  });

  it('throws in strict mode naming all missing variables', () => {
    expect(() =>
      renderTemplate(
        '{A} {B} {C}',
        {},
        { strict: true },
      )
    ).toThrow(/A.*B.*C|B.*C.*A|A.*C.*B/);
  });

  it('does NOT throw in strict mode when all variables are provided', () => {
    expect(() =>
      renderTemplate(
        '{PROJECT_NAME} {TICKER}',
        { PROJECT_NAME: 'X', TICKER: 'Y' },
        { strict: true },
      )
    ).not.toThrow();
  });
});

describe('renderTemplate — Rose Bot built-in variable preservation', () => {
  const ROSE_BUILTINS = ['first', 'last', 'fullname', 'username', 'mention', 'id', 'chatname', 'chat_name', 'chat_id'];

  it.each(ROSE_BUILTINS)('does not replace Rose built-in {%s}', (builtin) => {
    const template = `Hello {${builtin}}! Welcome to {PROJECT_NAME}.`;
    const result = renderTemplate(template, { PROJECT_NAME: 'PepeMax' });

    // Rose built-in should remain unreplaced
    expect(result.content).toContain(`{${builtin}}`);
    // PROJECT_NAME should be replaced
    expect(result.content).toContain('PepeMax');
    // Rose built-ins should NOT appear in missingVariables
    expect(result.missingVariables).not.toContain(builtin);
  });

  it('preserves {first} built-in in a full welcome template', () => {
    const template = `🚀 Welcome to {PROJECT_NAME}, {first}!\n\nTicker: {TICKER}`;
    const result = renderTemplate(template, { PROJECT_NAME: 'PepeMax', TICKER: 'PEPEMAX' });

    expect(result.content).toContain('{first}');
    expect(result.content).toContain('PepeMax');
    expect(result.content).toContain('PEPEMAX');
    expect(result.missingVariables).not.toContain('first');
  });
});

// ─── renderPreview ────────────────────────────────────────────────────────────

describe('renderPreview', () => {
  it('substitutes known variables and marks remaining ones with [[[...]]]', () => {
    const result = renderPreview(
      '{PROJECT_NAME} price: {PRICE}',
      { PROJECT_NAME: 'CoinX' },
    );
    expect(result).toBe('CoinX price: [[[PRICE]]]');
  });

  it('substitutes all known variables without markers when none are missing', () => {
    const result = renderPreview(
      '{PROJECT_NAME}',
      { PROJECT_NAME: 'Alpha' },
    );
    expect(result).toBe('Alpha');
    expect(result).not.toContain('[[[');
  });
});

// ─── generateAsset / tone profiles ───────────────────────────────────────────

describe('toneProfiles — existence and shape', () => {
  const EXPECTED_TONES = ['degen', 'premium', 'technical', 'formal', 'hybrid'] as const;

  it('exports exactly the 5 expected tone profiles', () => {
    const keys = Object.keys(toneProfiles);
    expect(keys.sort()).toEqual([...EXPECTED_TONES].sort());
  });

  it.each(EXPECTED_TONES)('%s tone has an id field matching its key', (tone) => {
    expect(toneProfiles[tone].id).toBe(tone);
  });

  it.each(EXPECTED_TONES)('%s tone has a non-empty name', (tone) => {
    expect(toneProfiles[tone].name).toBeTruthy();
    expect(typeof toneProfiles[tone].name).toBe('string');
  });

  it.each(EXPECTED_TONES)('%s tone has a description', (tone) => {
    expect(toneProfiles[tone].description).toBeTruthy();
    expect(typeof toneProfiles[tone].description).toBe('string');
  });

  it.each(EXPECTED_TONES)('%s tone has a non-empty voiceNotes array', (tone) => {
    expect(Array.isArray(toneProfiles[tone].voiceNotes)).toBe(true);
    expect(toneProfiles[tone].voiceNotes.length).toBeGreaterThan(0);
  });

  it.each(EXPECTED_TONES)('%s tone has a getTemplate function', (tone) => {
    expect(typeof toneProfiles[tone].getTemplate).toBe('function');
  });

  it.each(EXPECTED_TONES)('%s tone.getTemplate("welcome_message") returns a string or null', (tone) => {
    const result = toneProfiles[tone].getTemplate('welcome_message');
    expect(result === null || typeof result === 'string').toBe(true);
  });

  it.each(EXPECTED_TONES)('%s tone.getTemplate returns null for unknown asset type', (tone) => {
    const result = toneProfiles[tone].getTemplate('nonexistent_asset_type' as never);
    expect(result).toBeNull();
  });
});

describe('generateAsset — tone-aware generation', () => {
  it('generates a welcome_message asset with degen tone', () => {
    const asset = generateAsset({
      assetType: 'welcome_message',
      tone: 'degen',
      variables: { PROJECT_NAME: 'PepeMax', TICKER: 'PEPEMAX' },
      projectName: 'PepeMax',
    });

    expect(asset.assetType).toBe('welcome_message');
    expect(asset.tone).toBe('degen');
    expect(typeof asset.content).toBe('string');
    expect(asset.content.length).toBeGreaterThan(0);
  });

  it('generates a welcome_message asset with premium tone', () => {
    const asset = generateAsset({
      assetType: 'welcome_message',
      tone: 'premium',
      variables: { PROJECT_NAME: 'VaultProtocol', TICKER: 'VAULT' },
      projectName: 'VaultProtocol',
    });

    expect(asset.assetType).toBe('welcome_message');
    expect(asset.tone).toBe('premium');
    expect(asset.content.length).toBeGreaterThan(0);
  });

  it('degen and premium welcome messages for same project differ in content', () => {
    const vars = { PROJECT_NAME: 'CryptoX', TICKER: 'CRX' };

    const degen = generateAsset({ assetType: 'welcome_message', tone: 'degen', variables: vars, projectName: 'CryptoX' });
    const premium = generateAsset({ assetType: 'welcome_message', tone: 'premium', variables: vars, projectName: 'CryptoX' });

    // Different tones should produce different content
    expect(degen.content).not.toBe(premium.content);
  });

  it('substitutes PROJECT_NAME in generated asset', () => {
    const asset = generateAsset({
      assetType: 'welcome_message',
      tone: 'degen',
      variables: { PROJECT_NAME: 'MoonCoin' },
      projectName: 'MoonCoin',
    });

    // After substitution, the project name should appear in content
    // (or the template has {first} which is a Rose built-in and kept as-is)
    expect(asset.content).toContain('MoonCoin');
  });

  it('generates rules_message with formal tone', () => {
    const asset = generateAsset({
      assetType: 'rules_message',
      tone: 'formal',
      variables: { PROJECT_NAME: 'EnterpriseCoin' },
      projectName: 'EnterpriseCoin',
    });

    expect(asset.assetType).toBe('rules_message');
    expect(asset.tone).toBe('formal');
    expect(asset.content.length).toBeGreaterThan(0);
  });

  it('generates crisis_mode_message with technical tone', () => {
    const asset = generateAsset({
      assetType: 'crisis_mode_message',
      tone: 'technical',
      variables: { PROJECT_NAME: 'BuilderDAO' },
      projectName: 'BuilderDAO',
    });

    expect(asset.content.length).toBeGreaterThan(0);
  });

  it('generates with custom template when provided', () => {
    const customTemplate = 'Custom: {PROJECT_NAME} is live!';
    const asset = generateAsset({
      assetType: 'welcome_message',
      tone: 'degen',
      variables: { PROJECT_NAME: 'TestToken' },
      projectName: 'TestToken',
      customTemplate,
    });

    expect(asset.content).toBe('Custom: TestToken is live!');
  });

  it('returns missingVariables array', () => {
    const asset = generateAsset({
      assetType: 'welcome_message',
      tone: 'degen',
      variables: {}, // no variables provided
      projectName: '',
    });

    expect(Array.isArray(asset.missingVariables)).toBe(true);
  });

  it('returns GeneratedAsset with all required fields', () => {
    const asset = generateAsset({
      assetType: 'faq_note',
      tone: 'hybrid',
      variables: { PROJECT_NAME: 'HybridCoin', TICKER: 'HYB' },
      projectName: 'HybridCoin',
    });

    expect(asset).toHaveProperty('assetType');
    expect(asset).toHaveProperty('tone');
    expect(asset).toHaveProperty('content');
    expect(asset).toHaveProperty('variables');
    expect(asset).toHaveProperty('missingVariables');
  });

  it.each(['degen', 'premium', 'technical', 'formal', 'hybrid'] as const)(
    'generates buy_command_reply with %s tone',
    (tone) => {
      const asset = generateAsset({
        assetType: 'buy_command_reply',
        tone,
        variables: {
          PROJECT_NAME: 'TestCoin',
          TICKER: 'TEST',
          BUY_LINK: 'https://jup.ag',
          CONTRACT_ADDRESS: 'TestXXXXXXXX',
        },
        projectName: 'TestCoin',
      });
      expect(asset.content.length).toBeGreaterThan(0);
    },
  );
});
