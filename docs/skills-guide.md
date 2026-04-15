# Skills Guide

## What Is a Skill Pack?

A **skill pack** is a self-contained module that defines one aspect of a Telegram community launch configuration. Each skill pack provides:

1. **`SKILL.md`** — The skill definition file. YAML frontmatter contains the pack's metadata schema. The Markdown body provides human-readable documentation for the skill.
2. **`schema.ts`** — TypeScript types and Zod schemas for this skill's configuration inputs.
3. **`templates.ts`** — Copy templates keyed by asset type, optionally tone-aware.

Skill packs live in `packages/skills/packs/<slug>/`.

---

## SKILL.md Frontmatter Schema

Every `SKILL.md` file must have a valid YAML frontmatter block. The schema:

```yaml
---
# Required
slug: rose-core                     # Unique identifier (lowercase, hyphen-separated)
name: Rose Core                     # Display name
version: 1.0.0                      # Semantic version
description: >                      # Multi-line description
  Detailed description of what
  this skill pack does.
author: LaunchCtrl                  # Pack author

# Categorization
tags:                               # Array of searchable tags
  - rose
  - moderation
  - core

# Integration requirements
requiredIntegrations:               # Integrations this pack needs
  - rose
conflictsWith: []                   # Slugs of incompatible packs

# Compatibility filtering
compatibleCategories: all           # 'all' or an array of CommunityCategory values
minSecurityProfile: low             # Minimum: low | balanced | hard | extreme
minAutomationProfile: minimal       # Minimum: minimal | standard | aggressive_safe

# Safety rules
safetyRules:
  - id: no_ban_without_reason
    description: Ban commands must include a reason
    type: soft_warn                 # soft_warn | hard_block
    condition: "action == 'ban' && !payload.reason"  # JSON Logic expression

# Config schema
configSchema:
  - key: welcomeEnabled
    label: Enable Welcome Messages
    type: boolean                   # string | number | boolean | select | multiselect
    required: false
    default: true
    description: Optional field description
    options:                        # Required for select/multiselect types
      - value: option_value
        label: Option Label
---
```

### Field Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `slug` | `string` | Yes | Unique ID used in code and URLs |
| `name` | `string` | Yes | Human-readable display name |
| `version` | `string` | Yes | Semantic version (`major.minor.patch`) |
| `description` | `string` | Yes | What this pack does |
| `author` | `string` | Yes | Author name or organization |
| `tags` | `string[]` | Yes | Searchable tags |
| `requiredIntegrations` | `IntegrationSlug[]` | Yes | Integrations needed (can be empty array) |
| `conflictsWith` | `string[]` | Yes | Slugs of packs that cannot coexist |
| `compatibleCategories` | `CommunityCategory[] \| 'all'` | Yes | Which project categories this applies to |
| `minSecurityProfile` | `SecurityProfile` | Yes | Minimum security level required |
| `minAutomationProfile` | `AutomationProfile` | Yes | Minimum automation level required |
| `safetyRules` | `SafetyRule[]` | Yes | Pack-specific safety validation rules |
| `configSchema` | `SkillConfigField[]` | Yes | User-configurable options for this pack |

---

## How to Create a Custom Skill Pack

### Step 1: Create the directory

```bash
mkdir packages/skills/packs/my-custom-pack
```

### Step 2: Write `SKILL.md`

```yaml
---
slug: my-custom-pack
name: My Custom Pack
version: 1.0.0
description: >
  Description of what this pack does.
author: YourName
tags:
  - custom
requiredIntegrations: []
conflictsWith: []
compatibleCategories: all
minSecurityProfile: low
minAutomationProfile: minimal
safetyRules: []
configSchema:
  - key: enabled
    label: Enable Pack
    type: boolean
    required: false
    default: true
---

# My Custom Pack

Documentation for your skill pack.
```

### Step 3: Write `schema.ts`

```typescript
import { z } from 'zod';

export const MyCustomPackConfigSchema = z.object({
  enabled: z.boolean().default(true),
});

export type MyCustomPackConfig = z.infer<typeof MyCustomPackConfigSchema>;
```

### Step 4: Write `templates.ts`

```typescript
import type { SkillTemplate } from '@launchctrl/types';

export const templates: SkillTemplate[] = [
  {
    id: 'my-custom-welcome',
    assetType: 'welcome_message',
    toneProfile: 'all',
    template: 'Welcome to {PROJECT_NAME}! We are glad you are here.',
    variables: ['PROJECT_NAME'],
  },
];
```

### Step 5: Register (automatic)

The `SkillRegistry` discovers packs by scanning the `packs/` directory. No manual registration is needed — as long as your `SKILL.md` file has valid frontmatter, it will be loaded on the next `skillRegistry.initialize()` call.

---

## How SkillRegistry Works

The `SkillRegistry` is a singleton exported from `packages/skills/src/registry.ts`.

### `initialize()`

```typescript
await skillRegistry.initialize();
```

- Reads all directories in `packages/skills/packs/`
- For each directory: reads `SKILL.md`, parses YAML frontmatter with `gray-matter`
- Validates each pack against the `SkillPackSchema`
- Loads compiled templates from the build output if available
- Stores all packs in an internal `Map<string, LoadedSkillPack>`
- Safe to call multiple times — returns immediately if already initialized

### `get(slug: string): Promise<LoadedSkillPack | null>`

Returns the pack with the given slug, or `null` if not found. Attempts on-demand loading if the pack was not loaded during `initialize()`.

### `getAll(): LoadedSkillPack[]`

Returns all loaded packs as an array.

### `has(slug: string): boolean`

Returns `true` if the pack is in the registry (synchronous).

### `getCompatiblePacks(category, securityProfile, automationProfile): LoadedSkillPack[]`

Filters packs to those compatible with the given parameters:

1. **Category check**: `pack.meta.compatibleCategories === 'all'` or the category is in the array
2. **Security check**: current security profile index ≥ pack's `minSecurityProfile` index
   - Order: `low(0) < balanced(1) < hard(2) < extreme(3)`
3. **Automation check**: current automation profile index ≥ pack's `minAutomationProfile` index
   - Order: `minimal(0) < standard(1) < aggressive_safe(2)`

### `getByTags(tags: string[]): LoadedSkillPack[]`

Returns packs where at least one of the given tags matches a pack's `tags` array.

### `reload(slug: string): Promise<LoadedSkillPack | null>`

Force-reloads a single pack from disk (useful for hot-reload in development).

---

## All 9 Built-In Skill Packs

### `rose-core`

**Category**: Moderation | **Min Security**: low | **Min Automation**: minimal

The foundational Rose Bot configuration pack. Every project that uses Rose Bot starts here.

Generates:
- Welcome message command (`/setwelcome`)
- Anti-flood configuration (`/antiflood`)
- Clean service commands (`/cleanservice`)
- Welcome mute commands (`/welcomemute`)
- Basic filter configuration
- Captcha enable/disable commands (conditional)

All steps are `COPY_PASTE` or `MANUAL_CONFIRMATION_REQUIRED`. Rose has no API.

---

### `rose-hardening`

**Category**: Security | **Min Security**: balanced | **Min Automation**: minimal

Advanced Rose Bot hardening for higher-security communities. Requires `rose-core` to be run first.

Generates:
- Block forwarded messages commands
- Block external links commands
- Strict anti-flood thresholds
- New member mute configuration
- CAS ban integration commands
- Channel protection commands

Safety rules include a `hard_block` that prevents enabling links when security profile is `extreme`.

---

### `combot-analytics`

**Category**: Analytics | **Min Security**: low | **Min Automation**: minimal

Combot configuration guidance for analytics and anti-spam.

Generates:
- Step-by-step Combot dashboard onboarding instructions
- CAS (Combot Anti-Spam) ban list configuration steps
- Anti-spam level setting instructions (calibrated to security profile)
- Statistics dashboard setup guidance

All steps are `MANUAL_CONFIRMATION_REQUIRED` — Combot configuration requires dashboard access.

---

### `pumpfun-launch`

**Category**: Token Launch | **Min Security**: low | **Min Automation**: minimal

pump.fun-specific community launch operations.

Generates:
- pump.fun community setup checklist
- Announcement templates for launch day
- Buy command templates with pump.fun-specific formatting
- CA (contract address) pinned message template
- Raid coordination guidance

---

### `command-pack-socials`

**Category**: Community | **Min Security**: low | **Min Automation**: minimal

Social command responses for community bots.

Generates:
- `/twitter` command response template
- `/website` command response template
- `/chart` command response template
- `/buy` command response template
- `/links` aggregated command response

All templates are tone-aware (degen/premium/technical/formal/hybrid).

---

### `welcome-copy-studio`

**Category**: Onboarding | **Min Security**: low | **Min Automation**: minimal

Specialized welcome message and onboarding copy generation.

Generates:
- Full welcome message (Rose Bot format with built-in variables)
- Rules introduction message
- Pinned onboarding guide
- New member DM template (for manual outreach)

Templates are highly tone-aware — degen and premium tones produce very different output.

---

### `crisis-mode`

**Category**: Emergency | **Min Security**: low | **Min Automation**: minimal

Emergency moderation procedure templates for FUD attacks, coordinated spam, or exploit situations.

Generates:
- Group lockdown announcement
- "We are aware and working on it" template
- Slow-mode enable/disable instructions
- FUD deflection messaging
- Recovery announcement template

Steps include risk notices reminding operators that crisis messaging is high-visibility and should be used carefully.

---

### `raid-mode`

**Category**: Anti-Raid | **Min Security**: low | **Min Automation**: minimal

Anti-raid configuration and response templates.

Generates:
- Raid alert message template
- Anti-raid lockdown instructions (Rose Bot commands)
- Slow-mode configuration commands
- Post-raid restoration procedure
- Raid debrief announcement

---

### `faq-pack`

**Category**: Community | **Min Security**: low | **Min Automation**: minimal

FAQ and help command generation.

Generates:
- `/faq` command response with standard questions
- Contract address pinned note
- `/ca` command response template
- `/help` command index

---

## Security Profiles

Security profiles control what skill packs are available and what Rose Bot configurations are generated.

| Profile | `minSecurityProfile` access | Characteristics |
|---------|---------------------------|-----------------|
| `SAFE` (low) | All packs | Open community, minimal friction, no captcha |
| `STANDARD` (balanced) | balanced+ packs | Anti-spam active, standard moderation |
| `ADVANCED` (hard) | hard+ packs | Captcha required, strict anti-flood, link blocking |
| `RESTRICTED` (extreme) | extreme packs | Maximum lockdown, manual invite approval, all protections |

---

## Automation Profiles

Automation profiles control how many automated features are enabled and which skill packs are available.

| Profile | `minAutomationProfile` access | Characteristics |
|---------|------------------------------|-----------------|
| `MANUAL` (minimal) | All packs | You run things manually, bot is passive |
| `COPY_PASTE_ONLY` (standard) | standard+ packs | Bot configured by copy-paste, moderate automation |
| `SEMI_AUTO` (aggressive_safe) | All packs | Full automation stack, still ethical and honest |
| `FULL_AUTO` | WILD — not yet available | Reserved for future API-capable integrations |

LaunchCtrl does not currently support `FULL_AUTO` for any real integration. It is a WILD roadmap item. Any tool that claims `FULL_AUTO` for Rose Bot is not telling the truth.
