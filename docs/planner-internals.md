# Planner Pipeline Internals

The LaunchCtrl planner converts wizard answers into a fully-specified execution bundle. The pipeline has five stages, each a pure function (no database calls, no I/O). This makes the pipeline fast, deterministic, and easily testable.

All five stages live in `packages/domain/src/planner/`.

---

## Stage 1: `normalizeIntake`

**File**: `packages/domain/src/planner/intake.ts`

**Input**: `WizardAnswers` (raw wizard form submission)

**Output**: `NormalizedIntake`

```typescript
export interface NormalizedIntake {
  answers: WizardAnswers;            // Reference to original answers
  resolvedPlatformLabel: string;     // Human-readable: "pump.fun", "Raydium", etc.
  resolvedCategoryLabel: string;     // Human-readable: "Meme Token", "DAO", etc.
  isMemeProject: boolean;            // true if category=meme_token OR platform=pumpfun
  isHighSecurity: boolean;           // true if securityProfile is "hard" or "extreme"
  isHighAutomation: boolean;         // true if automationProfile is "aggressive_safe"
  hasPumpFun: boolean;               // true if platform is "pumpfun"
  requestedIntegrationSlugs: string[]; // Direct copy of answers.integrations
}
```

**What it does**:

1. Maps `platform` codes to display labels using a lookup table (`pumpfun` → `pump.fun`, `ethereum` → `Ethereum`, etc.)
2. Maps `category` codes to display labels (`meme_token` → `Meme Token`, `dao` → `DAO`, etc.)
3. Computes boolean flags used downstream to avoid repeating the same conditional logic in every stage
4. Falls back to the raw value if no label is found (future-proofs new categories)

**Why it exists**: Downstream stages should not repeat `answers.platform === 'pumpfun' || answers.category === 'meme_token'` — that logic lives in one place in `normalizeIntake`.

---

## Stage 2: `selectStack`

**File**: `packages/domain/src/planner/stack-selector.ts`

**Input**: `NormalizedIntake`

**Output**: `StackRecommendation`

```typescript
export interface StackRecommendation {
  required: IntegrationSlug[];      // Must be included — security/config demands it
  recommended: IntegrationSlug[];   // Strong recommendation — user would benefit
  optional: IntegrationSlug[];      // Available — user can include if desired
  excluded: IntegrationSlug[];      // Explicitly excluded — would conflict
  rationale: string[];              // Human-readable reasons for each decision
}
```

**Selection rules**:

| Condition | Result |
|-----------|--------|
| `isHighSecurity` OR `isHighAutomation` | Rose → `required` |
| Standard profile | Rose → `recommended` |
| Not `private_alpha` category | Combot → `recommended` |
| Token category + `isHighAutomation` | BuyBot → `recommended` |
| Token category + standard automation | BuyBot → `optional` |
| `isHighSecurity` | Safeguard → `recommended` |
| `isHighAutomation` | AlertBot → `optional` |
| Always | ControllerBot → `optional` |

**Category-based filtering**:
- Non-token categories (dao, infra, general_community) do not receive BuyBot recommendations
- `private_alpha` projects do not receive Combot recommendations (dashboard would be public)

**Conflict detection**:
The `excluded` array is reserved for cases where two integrations would directly conflict. Currently, the production conflict model is simple; the `validatePlanSteps` stage handles the Rose + Safeguard captcha conflict case as a warning rather than an exclusion.

---

## Stage 3: `generatePlanSteps`

**File**: `packages/domain/src/planner/step-generator.ts`

**Input**: `NormalizedIntake`, `StackRecommendation`

**Output**: `PlanStep[]`

### Step Schema

Every generated step conforms to `PlanStep`:

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique nanoid identifier |
| `sequence` | `number` | 1-based ordering index |
| `title` | `string` | Human-readable step name |
| `description` | `string` | What this step does and why |
| `executionMode` | `ExecutionMode` | AUTO, ONE_CLICK, COPY_PASTE, or MANUAL_CONFIRMATION_REQUIRED |
| `integration` | `IntegrationSlug \| 'system' \| 'telegram_api'` | Which integration handles this step |
| `action` | `string` | Dotted action identifier (e.g. `rose.set_welcome`) |
| `payload` | `Record<string, unknown>` | Configuration data for the action |
| `manualInstructions` | `string?` | Human-readable step-by-step instructions |
| `copyContent` | `string?` | Pre-generated text for the user to copy |
| `deepLinkUrl` | `string?` | Direct link to the relevant page (e.g. Combot dashboard) |
| `risks` | `RiskNotice[]` | Warnings about potential issues |
| `permissions` | `PermissionRequirement[]` | What the user needs to grant |
| `compensatingAction` | `string?` | How to undo this step if needed |
| `idempotencyKey` | `string` | SHA-256-based key for dedup |
| `estimatedDurationSeconds` | `number` | Human time estimate |

### Execution Mode Assignment Rules

| Step Type | Mode | Rationale |
|-----------|------|-----------|
| `workspace.configure` | AUTO | Internal DB write only |
| `rose.add_to_group` | MANUAL_CONFIRMATION_REQUIRED | Requires human to grant Telegram admin permissions |
| `rose.set_welcome` | COPY_PASTE | Rose command, human must paste in group |
| `rose.enable_captcha` | COPY_PASTE | Rose command, human must paste in group |
| `rose.configure_filters` | COPY_PASTE | Rose command sequence, human must paste |
| `rose.set_rules` | COPY_PASTE | Rose command, human must paste |
| `combot.add_to_group` | MANUAL_CONFIRMATION_REQUIRED | Requires Telegram admin grant + dashboard login |
| `combot.configure_antispam` | MANUAL_CONFIRMATION_REQUIRED | Combot dashboard configuration |
| `asset.generate` | AUTO | Template rendering — no external calls |
| `asset.generate_batch` | AUTO | Template rendering — no external calls |

### Idempotency Keys

Each step gets an idempotency key derived from:
```
SHA-256(launchName + action + integration + sequenceNumber)
```

This ensures that if a plan is regenerated for the same project with the same inputs, the same steps get the same idempotency keys — preventing duplicate work in the executor.

### Conditional Steps

Steps are only added when their conditions are met:
- Captcha step: only when `isHighSecurity = true`
- Rules step: only when `answers.generateRules = true`
- Asset generation steps: only when the corresponding `generate*` flag is `true`
- Combot steps: only when combot is in `stack.required` or `stack.recommended`

---

## Stage 4: `validatePlanSteps`

**File**: `packages/domain/src/planner/conflict-validator.ts`

**Input**: `PlanStep[]`

**Output**: `ValidationResult`

```typescript
export interface ValidationResult {
  valid: boolean;
  errors: string[];     // Hard failures — plan cannot be approved
  warnings: string[];   // Soft issues — user should be aware
  risks: RiskNotice[];  // Aggregated risk notices from conflicting steps
}
```

### Validation Rules

**Error conditions** (set `valid = false`):
1. **Duplicate actions** — the same `action` string appears in multiple steps. This indicates a planner bug or a double-call.
2. **Manual steps without instructions** — any `COPY_PASTE` or `MANUAL_CONFIRMATION_REQUIRED` step that has neither `manualInstructions` nor `copyContent` set. These steps would be unusable.

**Warning conditions** (advisory only, `valid` remains `true`):
1. **Rose + Safeguard captcha conflict** — both integrations in the step set. Both handle new member verification; having both can create a double-challenge UX where new members are asked to complete two separate captchas.
   - Warning message: explains the conflict
   - Risk notice: `level: 'medium'` with mitigation advice (disable captcha in one)

### Dependency Ordering

The validator does not enforce step ordering — that responsibility belongs to the step generator, which assigns `sequence` values in the correct order during generation. The validator only checks for semantic conflicts.

**Future validation rules** (planned):
- `rose-hardening` requires `rose-core` steps to be present
- High-security Combot config requires Combot base setup to be confirmed first
- Token projects need at minimum one moderation bot

---

## Stage 5: `renderExecutionBundle`

**File**: `packages/domain/src/planner/bundle-renderer.ts`

**Input**: `workspaceId: string`, `NormalizedIntake`, `StackRecommendation`, `PlanStep[]`

**Output**: `Plan`

### Bundle Structure

```typescript
export interface Plan {
  id: string;                        // Unique plan ID (nanoid)
  workspaceId: string;               // Owning workspace
  answers: WizardAnswers;            // Original wizard submission (for reference)
  recommendedStack: IntegrationSlug[]; // Union of required + recommended
  steps: PlanStep[];                 // All steps in sequence order
  assetSpecs: GeneratedAssetSpec[];  // What assets need to be generated
  risks: RiskNotice[];               // Aggregated risks from all steps
  permissions: PermissionRequirement[]; // Aggregated permissions needed
  estimatedTotalMinutes: number;     // Ceiling of total step seconds / 60
  manualStepCount: number;           // Steps requiring human action
  autoStepCount: number;             // Steps that execute automatically
  createdAt: Date;                   // Plan creation timestamp
}
```

### Asset Spec Generation

For each enabled `generate*` flag, the bundle renderer creates a `GeneratedAssetSpec`:

```typescript
export interface GeneratedAssetSpec {
  assetType: AssetType;             // welcome_message, rules_message, faq_note, etc.
  name: string;                     // Display name for the asset
  tone: string;                     // Tone profile from wizard answers
  variables: Record<string, string>; // Pre-filled variables for the template renderer
  skillPackId: string;              // Which skill pack owns this template
}
```

Asset spec to skill pack mapping:

| Asset Type | Skill Pack |
|------------|-----------|
| `welcome_message` | `welcome-copy-studio` |
| `rules_message` | `rose-core` |
| `faq_note` | `faq-pack` |
| `social_command_reply` | `command-pack-socials` |
| `buy_command_reply` | `command-pack-socials` |
| `link_command_reply` | `command-pack-socials` |
| `crisis_mode_message` | `crisis-mode` |
| `raid_mode_message` | `raid-mode` |

---

## How DRY_RUN Affects Execution

The planner pipeline itself is unaffected by `isDryRun`. The flag is passed to `ExecutorService.startRun()` and affects only the executor:

| Behavior | isDryRun=true | isDryRun=false |
|---------|---------------|----------------|
| Generate all assets | ✓ | ✓ |
| Generate all instructions | ✓ | ✓ |
| Write audit events | ✓ (marked dryRun) | ✓ (live) |
| Execute AUTO system steps (DB writes) | ✓ | ✓ |
| Make external API calls | ✗ (skipped) | ✓ (if API available) |
| Mark MANUAL steps awaiting confirmation | ✓ (test mode) | ✓ (live) |

---

## How the Executor Processes Each Step Type

### AUTO Steps

```
ExecutorService receives AUTO step
  ├── Check idempotency key (skip if already completed in this run)
  ├── Execute the action:
  │     - workspace.configure → update workspace metadata in DB
  │     - asset.generate     → call TemplateRenderer, save to generated_assets
  │     - asset.generate_batch → multiple TemplateRenderer calls
  ├── Update step status → 'completed'
  └── Write audit_event: { action: step.action, status: 'completed' }
```

### COPY_PASTE Steps

```
ExecutorService receives COPY_PASTE step
  ├── Retrieve copyContent (already in step.copyContent from planner)
  ├── Save to generated_assets table:
  │     { assetType: 'copy_paste_command', content: step.copyContent }
  ├── Update step status → 'awaiting_manual'
  ├── Notify user via WebSocket/polling that step is ready
  └── Write audit_event: { action: step.action, status: 'awaiting_manual' }

User confirms step (marks as done in UI):
  ├── Update step status → 'completed' (user self-reported)
  └── Write audit_event: { action: step.action + '.confirmed', actor: userId }
```

### MANUAL_CONFIRMATION_REQUIRED Steps

```
ExecutorService receives MANUAL_CONFIRMATION_REQUIRED step
  ├── Retrieve manualInstructions from step
  ├── Save instructions to generated_assets table
  ├── Update step status → 'awaiting_manual'
  ├── Notify user that manual action is needed
  └── Write audit_event: { action: step.action, status: 'awaiting_manual' }

User works through instructions and confirms:
  ├── Update step status → 'completed' (user self-reported)
  └── Write audit_event: { action: step.action + '.confirmed', actor: userId }
```

Neither COPY_PASTE nor MANUAL_CONFIRMATION_REQUIRED steps are ever marked `completed` automatically. Only user confirmation advances them. This is a core SHARP safety guarantee.
