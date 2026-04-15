# Integrations Guide

## Adapter Interface

Every integration in LaunchCtrl is implemented as an adapter that conforms to the `IAdapter` interface (`packages/integrations/src/base/adapter.interface.ts`).

```typescript
export interface IAdapter {
  /**
   * Returns the set of capabilities this adapter supports.
   * The planner uses this to determine execution modes.
   */
  getCapabilities(): AdapterCapability[];

  /**
   * Execute a plan step. Called by the executor service.
   * Must be idempotent — safe to call multiple times with the same step.
   *
   * @throws AdapterError if the step cannot be executed
   */
  executeStep(step: PlanStep, context: ExecutionContext): Promise<StepResult>;

  /**
   * Generate copy-paste instructions for a step that requires human action.
   * Always safe to call — never makes external API requests.
   */
  generateCopyPasteInstructions(step: PlanStep): CopyPasteBundle;

  /**
   * Validate the adapter's configuration before use.
   * Returns validation errors if config is incomplete or invalid.
   */
  validateConfig(config: Record<string, unknown>): ValidationResult;
}
```

---

## Capability Types

Adapters declare their capabilities using `AdapterCapability` values:

```typescript
export type AdapterCapability =
  | 'READ_CONFIG'                    // Can read current configuration from the integration
  | 'WRITE_CONFIG'                   // Can write configuration programmatically via API
  | 'EXECUTE_COMMAND'                // Can execute commands via API
  | 'GENERATE_INSTRUCTIONS'          // Can generate human-readable instructions (always available)
```

The planner uses declared capabilities to assign execution modes:

| Adapter Capabilities | Assigned Execution Mode |
|---------------------|------------------------|
| `GENERATE_INSTRUCTIONS` only | `COPY_PASTE` or `MANUAL_CONFIRMATION_REQUIRED` |
| `EXECUTE_COMMAND` | `ONE_CLICK` (when safe) or `AUTO` |
| `WRITE_CONFIG` + `READ_CONFIG` | `ONE_CLICK` or `AUTO` depending on risk level |

---

## Rose Adapter

**File**: `packages/integrations/src/rose/rose.adapter.ts`

**Capabilities**: `GENERATE_INSTRUCTIONS` only

The Rose adapter is the most commonly invoked adapter in LaunchCtrl. It generates exact Rose Bot commands for the user to paste into their Telegram group.

### What It Does

The Rose adapter:
1. Receives a `PlanStep` with action, payload, and configuration
2. Uses `RoseGenerator` (`rose.generator.ts`) to produce the correct command text
3. Returns a `CopyPasteBundle` containing the command and usage instructions

### What It Does NOT Do

- **No API calls.** Rose Bot (`@MissRose_bot`) does not have a public API that allows external services to send commands. If any tool claims to configure Rose Bot automatically via API, it is not truthful.
- **No Telegram client session.** The adapter never authenticates as a Telegram user or bot to send messages.
- **No stored credentials.** There are no Rose Bot credentials to store.

### Generated Output

For a typical `rose.set_welcome` step, the adapter produces:
```
/setwelcome Welcome to {first}! 🎉

You've joined {chat_name}.

Please read the rules and enjoy the community!
```

For `rose.configure_filters` with `securityProfile: 'hard'`:
```
/antiflood 3
/cleanservice on
/welcomemute on
/blacklistdelete on
/setfloodaction ban
/welcome on
/antiarabic off
```

### How to Use

Users receive these commands via the Mini App interface. Each command has a one-click copy button. The user opens Telegram, goes to their group, pastes the command, and taps Send.

---

## Combot Adapter

**File**: `packages/integrations/src/combot/combot.adapter.ts`

**Capabilities**: `GENERATE_INSTRUCTIONS` only

The Combot adapter generates step-by-step dashboard configuration instructions. All Combot steps are `MANUAL_CONFIRMATION_REQUIRED`.

### What It Does

1. Receives a step with `action = 'combot.configure_antispam'` or similar
2. Generates a numbered list of dashboard navigation steps
3. Pre-fills recommended values based on the workspace's security profile
4. Returns instructions as a `CopyPasteBundle` with `instructionsType: 'dashboard_steps'`

### Sample Output

For `combot.configure_antispam` with `securityProfile: 'hard'`:
```
1. Go to https://combot.org/c/YOUR_CHAT_ID
2. Click the "Anti-Spam" tab
3. Set Spam Level to: High (7)
4. Enable: CAS ban
5. Enable: Block forwarded messages from channels
6. Enable: New account restrictions (accounts under 7 days old)
7. Click Save
```

### MANUAL_CONFIRMATION_REQUIRED Behavior

Because Combot has no external API for these settings, the adapter cannot verify that the user completed the steps. The step is marked `MANUAL_CONFIRMATION_REQUIRED`, meaning:

1. LaunchCtrl presents the instructions
2. The user follows them in the Combot dashboard
3. The user taps "Mark as Done" in the LaunchCtrl UI
4. The step is recorded as `completed (user-confirmed)` in the audit log

The `(user-confirmed)` qualifier in the audit log makes it clear that completion is self-reported, not API-verified.

---

## Stub Adapters

The following adapters are stub implementations — they are registered in the integration registry but have limited or no functionality in the current release. They are included to reserve the integration slot and allow future implementation.

### `safeguard.stub.ts` — Safeguard Bot

**Status**: Stub — instructions generation only

Safeguard provides advanced Telegram group verification and spam protection. The stub generates setup instructions for manually adding Safeguard to a group and configuring its basic settings.

**Planned capabilities**: Automated configuration via Safeguard's API (WILD roadmap).

### `controllerbot.stub.ts` — ControllerBot

**Status**: Stub — placeholder

ControllerBot is used for channel post management. The stub provides minimal documentation about adding ControllerBot to a channel.

**Planned capabilities**: Channel post scheduling and management via API (WILD roadmap).

### `buybot.stub.ts` — Buy Bot

**Status**: Stub — instructions generation

Buy Bot provides DEX purchase notifications in Telegram groups. The stub generates instructions for adding a buy bot and configuring tracking parameters.

**Planned capabilities**: Automated configuration via buy bot APIs where available (WILD roadmap).

### `alertbot.stub.ts` — Alert Bot

**Status**: Stub — placeholder

Alert Bot sends price and volume alerts to Telegram groups. The stub provides documentation for manual setup.

**Planned capabilities**: Integration with price alert APIs (WILD roadmap).

### `chainfuel.stub.ts` — ChainFuel

**Status**: Stub — placeholder

ChainFuel provides engagement and community management features. The stub registers the integration slot.

**Planned capabilities**: ChainFuel API integration (WILD roadmap).

### `teleme.stub.ts` — Teleme

**Status**: Stub — placeholder

Teleme provides Telegram community analytics. The stub registers the integration slot.

**Planned capabilities**: Teleme analytics API integration (WILD roadmap).

---

## How to Add a New Integration Adapter

### Step 1: Create the adapter directory

```bash
mkdir packages/integrations/src/myadapter
```

### Step 2: Define types

```typescript
// packages/integrations/src/myadapter/myadapter.types.ts

export interface MyAdapterConfig {
  apiKey?: string;
  chatId?: string;
}

export interface MyAdapterStepPayload {
  action: string;
  parameters: Record<string, unknown>;
}
```

### Step 3: Implement the adapter

```typescript
// packages/integrations/src/myadapter/myadapter.adapter.ts

import type { IAdapter, AdapterCapability } from '../base/adapter.interface.js';
import type { PlanStep, StepResult, CopyPasteBundle } from '@launchctrl/types';

export class MyAdapter implements IAdapter {
  constructor(private readonly config: MyAdapterConfig = {}) {}

  getCapabilities(): AdapterCapability[] {
    // Honest declaration — if you have no API, return only GENERATE_INSTRUCTIONS
    return ['GENERATE_INSTRUCTIONS'];
  }

  async executeStep(step: PlanStep, context: ExecutionContext): Promise<StepResult> {
    // For GENERATE_INSTRUCTIONS-only adapters, this should generate instructions
    // rather than making API calls
    const bundle = this.generateCopyPasteInstructions(step);
    return {
      success: true,
      output: bundle,
      stepId: step.id,
    };
  }

  generateCopyPasteInstructions(step: PlanStep): CopyPasteBundle {
    return {
      title: step.title,
      instructions: `Follow these steps for ${step.action}...`,
      copyableContent: undefined,
      instructionsType: 'dashboard_steps',
    };
  }

  validateConfig(config: Record<string, unknown>): ValidationResult {
    return { valid: true, errors: [] };
  }
}
```

### Step 4: Register in the index

```typescript
// packages/integrations/src/index.ts — add export

export { MyAdapter } from './myadapter/myadapter.adapter.js';
```

### Step 5: Add to integration registry

Register the adapter in the executor service's adapter map so the executor knows which class to instantiate for a given `integration` slug.

```typescript
// apps/api/src/modules/executor/executor.service.ts

import { MyAdapter } from '@launchctrl/integrations';

const ADAPTER_MAP: Record<string, IAdapter> = {
  // ...existing adapters...
  myadapter: new MyAdapter(),
};
```

---

## Security Considerations for Adapters

### Credential Storage

If your adapter requires API credentials (API keys, tokens):
- Store credentials encrypted in the `integrations` table using AES-256 (`ENCRYPTION_KEY`)
- Never log credentials — the logger in `@launchctrl/lib` has a sensitive-field filter
- Never include credentials in audit log metadata
- Validate that credentials are present in `validateConfig()` before any API call

### Capability Honesty

**Do not declare capabilities your adapter doesn't have.** If your integration has no API, declare only `GENERATE_INSTRUCTIONS`. The planner assigns execution modes based on declared capabilities. Declaring `EXECUTE_COMMAND` when you can't execute commands will result in steps that appear as `AUTO` or `ONE_CLICK` but silently fail.

### Idempotency

`executeStep()` must be idempotent. The executor may retry a step on failure. Use the step's `idempotencyKey` to prevent duplicate operations:

```typescript
async executeStep(step: PlanStep): Promise<StepResult> {
  // Check if already executed
  const existing = await this.checkIdempotency(step.idempotencyKey);
  if (existing) return existing;

  // Execute the operation...
  const result = await this.performOperation(step);

  // Record idempotency
  await this.recordIdempotency(step.idempotencyKey, result);

  return result;
}
```

### DRY_RUN Compliance

Check `context.isDryRun` before making any external API calls:

```typescript
async executeStep(step: PlanStep, context: ExecutionContext): Promise<StepResult> {
  if (context.isDryRun) {
    // Return a simulated success without making real API calls
    return { success: true, output: { dryRun: true }, stepId: step.id };
  }

  // Real execution...
}
```
