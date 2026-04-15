# LaunchCtrl SHARP Philosophy

## What SHARP Means

**SHARP** stands for **S**ecure, **H**onest, **A**ccountable, **R**eal, **P**roduction-ready.

It is the guiding design principle for every feature in LaunchCtrl. In a space rife with tools that over-promise, fake automation capabilities, or hide dangerous behaviors behind slick UIs, SHARP is a commitment to the opposite: total transparency about what a tool actually does.

A feature is SHARP when:
- It does what it says it does — nothing more, nothing less
- Its limitations are clearly communicated to the user before they commit
- It never performs irreversible actions without explicit human confirmation
- It produces an audit trail that can be reviewed and challenged
- A developer can read the source code and understand exactly what happened

A feature is WILD when it's on the roadmap but not yet honest to ship as automatic — it needs more caution, more testing, or more safety review. WILD features are always gated behind `FEATURE_WILD_MODE=true` and never presented to users as fully functional.

---

## The Execution Mode Taxonomy

Every step in a LaunchCtrl execution plan is tagged with exactly one execution mode. This tag is displayed to the user before they approve the plan and again during execution.

### `AUTO`

**Definition**: LaunchCtrl executes this step entirely programmatically with no human intervention required.

**Criteria for AUTO**:
- The action has no external side effects that can't be reversed
- The system has verified credentials/permissions before execution
- The operation is idempotent (safe to retry)
- No third-party bot or dashboard login is required

**Examples**:
- Creating or updating workspace metadata in the LaunchCtrl database
- Generating a welcome message using the template renderer
- Building a community rules document
- Computing the recommended integration stack from wizard answers
- Writing an audit log entry

**User experience**: The step completes automatically. The user sees a green checkmark. They can inspect the output but don't need to do anything.

---

### `ONE_CLICK`

**Definition**: LaunchCtrl prepares the full request and the user confirms it with a single tap. The system then executes on behalf of the user.

**Criteria for ONE_CLICK**:
- LaunchCtrl has valid API credentials for the target service
- The action is reversible or the user has been clearly warned it isn't
- The full request content is shown to the user before they confirm

**Examples** (future WILD targets):
- Pushing a pre-configured Rose Bot filter through a future public API
- Updating a Combot setting through an official integration endpoint

**Current status**: No LaunchCtrl integrations currently qualify for ONE_CLICK because Rose Bot and Combot do not expose suitable public APIs. All such steps are COPY_PASTE or MANUAL_CONFIRMATION_REQUIRED.

**User experience**: User reviews the prepared action, taps "Execute", LaunchCtrl sends the API call, confirms success.

---

### `COPY_PASTE`

**Definition**: LaunchCtrl generates the exact text the user needs to execute (a command, a message, a config block) and presents it for one-click copy. The user pastes it into the target application.

**Criteria for COPY_PASTE**:
- The required text is fully determined by LaunchCtrl based on the user's configuration
- No customization is needed before pasting
- The target application accepts text commands sent by a human admin

**Examples**:
- Rose Bot command sequences: `/captcha on`, `/antiflood 5`, `/setwelcome ...`
- Complete Rose Bot welcome message templates
- Anti-spam filter commands
- Generated community rules to paste via `/setrules`
- Social command templates for `/twitter`, `/buy`, `/chart`

**User experience**: The user sees the command with a copy button. They open Telegram, navigate to their group, and paste. LaunchCtrl tracks whether they've confirmed the step is done.

**Honest limitation**: LaunchCtrl cannot verify that the user actually sent the command. "Confirmation" is a checkbox on the honor system. The audit log records the user's confirmation, not verified execution.

---

### `MANUAL_CONFIRMATION_REQUIRED`

**Definition**: LaunchCtrl cannot automate this step at all. It generates step-by-step human-readable instructions. The user must navigate to an external dashboard or perform actions that no API supports, then confirm they've done it.

**Criteria for MANUAL_CONFIRMATION_REQUIRED**:
- The target service has no suitable API endpoint
- The action requires a human to log in to a web dashboard
- The action involves a trust boundary that should not be crossed automatically (e.g., granting admin permissions)

**Examples**:
- Adding @MissRose_bot or @combot as an admin in Telegram
- Configuring Combot anti-spam levels via combot.org dashboard
- Granting specific Telegram group admin permissions
- Setting up Combot CAS ban integration via the web UI
- Approving a new admin in a Telegram group

**User experience**: The user sees numbered, step-by-step instructions. They follow them manually. A "Mark as Done" button updates the step status in LaunchCtrl. The audit log records that the user self-reported completion.

---

## Rose Bot: The Reality

Rose Bot (`@MissRose_bot`) is one of the most powerful Telegram moderation bots available. LaunchCtrl uses Rose extensively — but it's critical to understand exactly what that means.

### What LaunchCtrl Does

- Analyzes your project configuration (security profile, category, tone)
- Generates the **exact Rose Bot commands** you need to paste
- Presents commands in the correct order with explanations
- Tracks whether you've sent each command
- Generates Rose-compatible welcome messages, rules, and filter configurations

### What LaunchCtrl Does NOT Do

- **LaunchCtrl never sends commands to Rose Bot on your behalf.** Rose Bot has no public API that allows external services to configure it. Every configuration change must be made by a human administrator sending commands in the group chat.
- **LaunchCtrl never adds itself as a group admin.** Group admin rights are granted by the group owner to Rose Bot directly.
- **LaunchCtrl never reads your group messages.** It has no message access.

Every Rose Bot step is either `COPY_PASTE` (you paste the command) or `MANUAL_CONFIRMATION_REQUIRED` (you follow UI steps). This is the honest truth, stated plainly.

---

## Combot: The Reality

Combot (`@combot`) is a popular Telegram analytics and moderation service. Its configuration is managed via the combot.org web dashboard.

### What LaunchCtrl Does

- Recommends Combot configuration values appropriate for your security profile
- Generates step-by-step instructions for configuring the Combot dashboard
- Tracks whether you've confirmed each dashboard step
- Integrates Combot analytics recommendations into your plan

### What LaunchCtrl Does NOT Do

- **LaunchCtrl cannot configure Combot programmatically.** Combot's dashboard configuration does not expose a suitable API for external services.
- All Combot steps are `MANUAL_CONFIRMATION_REQUIRED`.

---

## Wallet Safety

LaunchCtrl will never, under any circumstances:
- Ask for your wallet private key or seed phrase
- Store wallet credentials of any kind
- Execute token transactions or on-chain operations
- Pretend to have wallet or DeFi capabilities

LaunchCtrl is a **community management tool**, not a DeFi platform. It helps you configure your Telegram group. It has no knowledge of your wallet address, holdings, or transaction history.

---

## DRY_RUN Mode

All execution runs default to `isDryRun: true`.

**What DRY_RUN does**:
- Processes the entire plan exactly as if it were live
- Generates all assets, instructions, and copy content
- Writes full audit log entries marked with `dryRun: true`
- Does **not** make any real API calls to external services
- Does **not** skip any COPY_PASTE or MANUAL steps — they still appear in the output

**Why it's the default**:
DRY_RUN gives you the full plan output — all generated content, all commands, all instructions — without commitment. Review everything before you set `isDryRun: false`.

**How to disable**:
```json
POST /api/runs
{
  "planId": "plan_xxx",
  "workspaceId": "ws_xxx",
  "isDryRun": false
}
```

Even with `isDryRun: false`, the AUTO steps that can be executed by LaunchCtrl are limited to internal operations (database writes, asset generation). External service steps remain COPY_PASTE or MANUAL.

---

## Audit Log

Every significant action in LaunchCtrl is written to the `audit_events` table:

| Field | Description |
|-------|-------------|
| `id` | Unique event ID |
| `userId` | Actor who performed the action |
| `workspaceId` | Workspace context |
| `action` | Dotted action string (e.g. `plan.created`, `step.confirmed`) |
| `resourceType` | Type of affected resource (plan, run, asset, workspace) |
| `resourceId` | ID of the affected resource |
| `metadata` | Additional structured context (step title, run status, etc.) |
| `riskLevel` | `low`, `medium`, `high`, or `critical` |
| `createdAt` | UTC timestamp |
| `dryRun` | Whether this event occurred in dry-run mode |

The audit log is **append-only by design**. No update or delete operations are permitted on `audit_events`. It represents a tamper-evident record of what happened in the workspace.

---

## Anti-Patterns Explicitly Rejected

LaunchCtrl's design explicitly rejects the following patterns commonly found in Telegram launch tools:

| Anti-Pattern | Why It's Rejected |
|---|---|
| **"Automated Rose Bot setup"** | Rose has no API. Any tool claiming full automation is lying. |
| **Fake verification bots** | Creating bots that falsely claim to "verify" users for social proof is a dark pattern. |
| **Wallet custody for "auto-buy" features** | Holding user private keys or seed phrases creates catastrophic security risk and is not a launch management function. |
| **Fake engagement/member counts** | Bot members, fake activity, or inflated metrics are scams, not features. |
| **Hiding execution mode** | Every step tells you exactly how it executes. No hidden API calls. |
| **One-click claims without API support** | If there's no API, there's no one-click. |
| **Irreversible actions without confirmation** | Every consequential action requires explicit user approval. |
| **Phishing-adjacent UX** | LaunchCtrl never asks you to log in to a third-party service through an embedded frame or asks for dashboard credentials. |

These are not aspirational statements. They are enforced at the architectural level: the adapter interface requires every integration to declare its execution mode, and the planner pipeline assigns modes based on verified integration capabilities.
