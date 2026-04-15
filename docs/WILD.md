# LaunchCtrl WILD Phase — Future Deep Automation

**Version:** 1.0.0  
**Last Updated:** 2026-01  
**Owner:** Product Engineering  
**Classification:** INTERNAL  
**Status:** SPECULATIVE — no WILD features are shipped or enabled by default

---

## What WILD Means

**SHARP** is LaunchCtrl's honest core: it does what it says, nothing more. Every SHARP action either produces copy for the user to paste manually (`COPY_PASTE` mode) or asks the user to explicitly confirm a real action (`MANUAL_CONFIRMATION_REQUIRED`). SHARP ships.

**WILD** is the future automation layer. WILD features replace manual steps with deep, direct automation: API calls, on-chain transactions, social broadcasts, AI generation. WILD features are only possible when the underlying platforms provide stable, documented APIs — and some may never be possible given platform constraints.

### WILD Principles

1. **Architecturally isolated.** WILD code lives in separate packages (`@launchctrl/wild-*`) or separate services. It never bleeds into SHARP core paths.
2. **Feature-flagged at every boundary.** Every WILD execution path is gated by a DB-driven feature flag. The flag defaults to `enabled=false`. WILD code is dead code until deliberately activated.
3. **Honest about platform realities.** If a platform has no public API, the WILD feature is explicitly marked as speculative and cannot ship. No fake automation.
4. **Explicit user consent for irreversible actions.** Any WILD action that cannot be undone (on-chain transaction, sent message) requires a multi-step confirmation flow — not a single button click.
5. **No hidden dependencies.** WILD features declare their external dependencies (API keys, OAuth scopes, wallet credentials) and fail loudly if not configured — they do not silently fall back to SHARP without telling the user.

### WILD Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SHARP CORE                                     │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  Plan Engine  →  Skill Packs  →  Asset Generator  →  Execution API  │  │
│  │                                                                      │  │
│  │  All paths: COPY_PASTE | MANUAL_CONFIRMATION_REQUIRED                │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                    │                                        │
│                    Feature Flag Gate (DB: feature_flags)                   │
└────────────────────────────────────┼───────────────────────────────────────┘
                                     │
          ┌──────────────────────────┼───────────────────────────────────┐
          │                          │                                   │
          ▼                          ▼                                   ▼
┌──────────────────┐    ┌────────────────────────┐    ┌──────────────────────┐
│  WILD Satellite  │    │  WILD Satellite         │    │  WILD Satellite      │
│                  │    │                         │    │                      │
│  wild.rose.      │    │  wild.onchain.signing   │    │  wild.social.        │
│  automation      │    │                         │    │  broadcast           │
│                  │    │  @launchctrl/           │    │                      │
│  RoseAutomated   │    │  wallet-signer          │    │  SocialBroadcast     │
│  Adapter         │    │  (isolated process)     │    │  Service             │
│  [SPECULATIVE]   │    │                         │    │                      │
└──────────────────┘    └────────────────────────┘    └──────────────────────┘
          │                          │                                   │
          ▼                          ▼                                   ▼
┌──────────────────┐    ┌────────────────────────┐    ┌──────────────────────┐
│  WILD Satellite  │    │  WILD Satellite         │    │                      │
│                  │    │                         │    │                      │
│  wild.ai.copy    │    │  wild.analytics.        │    │  (future satellites) │
│                  │    │  userbot                │    │                      │
│  @launchctrl/    │    │                         │    │                      │
│  ai-copy         │    │  @launchctrl/           │    │                      │
│                  │    │  userbot-agent          │    │                      │
│                  │    │  (separate process)     │    │                      │
└──────────────────┘    └────────────────────────┘    └──────────────────────┘
```

---

## WILD Feature 1: Rose Bot Deep Automation

### Current State (SHARP)

Rose Bot is a widely used Telegram moderation and community management bot. LaunchCtrl's SHARP integration produces Rose Bot commands as formatted text blocks that the user copies and pastes manually into their Telegram group. This is intentional and honest: Rose Bot has no public, documented API for third-party automation as of 2026.

Every SHARP Rose step displays:
```
MODE: COPY_PASTE
⚠️  MANUAL_CONFIRMATION_REQUIRED — paste the following into your group:
/filter add "shill" Delete  
```

### What WILD Would Require

For automated Rose Bot execution to be possible, one of the following would need to exist:
1. An official Rose Bot REST or gRPC API with authentication tokens
2. A documented Telegram Bot-to-Bot API (does not exist in the Telegram platform)
3. A UserBot (MTProto) approach — sending commands as a real user account (high ToS risk, see Risk Register)

None of these exist as stable, documented options in 2026. **This feature is fully speculative.**

### Feature Flag

```
Flag key:    wild.rose.automation
Default:     enabled=false
Status:      UNSHIPPABLE (no upstream API)
```

### Architecture (Speculative)

When (if) Rose Bot publishes an official API, the implementation would slot in as a drop-in adapter behind the existing `IRoseAdapter` interface:

```typescript
// packages/api/src/adapters/rose/interface.ts
export interface IRoseAdapter {
  /**
   * Apply a word filter to a Telegram group.
   * In SHARP: returns a formatted COPY_PASTE string.
   * In WILD: calls Rose API directly.
   */
  applyFilter(params: {
    groupId: string;
    pattern: string;
    action: 'Delete' | 'Warn' | 'Mute' | 'Ban';
    duration?: string;
  }): Promise<RoseAdapterResult>;

  /**
   * Set welcome message for a group.
   */
  setWelcomeMessage(params: {
    groupId: string;
    message: string;
    buttons?: InlineButtonDef[];
  }): Promise<RoseAdapterResult>;

  /**
   * Enable or disable anti-flood settings.
   */
  setFloodProtection(params: {
    groupId: string;
    maxMessages: number;
    windowSeconds: number;
    action: 'Mute' | 'Kick' | 'Ban';
  }): Promise<RoseAdapterResult>;

  /**
   * Add users to a group admin list with specified permissions.
   */
  promoteAdmin(params: {
    groupId: string;
    userId: string;
    permissions: RoseAdminPermissions;
  }): Promise<RoseAdapterResult>;
}

export interface RoseAdapterResult {
  mode: 'COPY_PASTE' | 'AUTOMATED';
  // In COPY_PASTE mode: the text to display to user
  copyText?: string;
  // In AUTOMATED mode: confirmation of action taken
  actionId?: string;
  // Audit trail for both modes
  auditData: Record<string, unknown>;
}

// Speculative: only exists if Rose Bot publishes an official API
export class RoseAutomatedAdapter implements IRoseAdapter {
  private readonly apiBaseUrl = 'https://api.rose.bot/v1'; // hypothetical
  private readonly apiToken: string;

  constructor(config: { apiToken: string }) {
    this.apiToken = config.apiToken;
  }

  async applyFilter(params: Parameters<IRoseAdapter['applyFilter']>[0]) {
    // Would call: POST https://api.rose.bot/v1/groups/{groupId}/filters
    // With: Authorization: Bearer {apiToken}
    throw new Error(
      'RoseAutomatedAdapter: Rose Bot has no public API as of 2026. ' +
      'This class must not be instantiated. ' +
      'Check https://docs.rose.bot for official API announcements.'
    );
  }
  // ... other methods similarly blocked
}
```

### Honest Note

This feature **cannot ship** until Rose Bot publishes official API documentation with authentication, rate limits, and ToS for third-party integration. The architecture is designed so that when that day comes, swapping in `RoseAutomatedAdapter` behind the feature flag requires no changes to SHARP core logic. Until then, the adapter throws on instantiation and the feature flag stays `false`.

---

## WILD Feature 2: On-Chain Action Automation

### Overview

On-chain automation allows LaunchCtrl to submit Solana transactions on the user's behalf: creating tokens via pump.fun, adding liquidity, and updating token metadata. This is a significant capability expansion with corresponding security requirements.

### Feature Flag

```
Flag key:    wild.onchain.signing
Default:     enabled=false
Tier:        Agency + explicit opt-in only
```

### Architecture

On-chain signing lives in a **completely isolated package** that is never imported by the main API:

```
packages/
  wild-wallet-signer/          ← separate package, separate process
    src/
      index.ts                 ← IPC/gRPC server entry point
      solana/
        connection.ts          ← RPC endpoint configuration
        transaction-builder.ts ← build unsigned transactions
        signing-strategies/
          hsm.ts               ← Hardware Security Module signing
          mpc.ts               ← Multi-Party Computation signing
      operations/
        create-token.ts        ← pump.fun token creation
        add-liquidity.ts       ← pump.fun liquidity
        update-metadata.ts     ← token metadata on-chain
      consent/
        transaction-preview.ts ← human-readable transaction summary
        confirmation-flow.ts   ← multi-step user consent
```

**The main API communicates with `wild-wallet-signer` over a local IPC socket or gRPC — private keys never leave the signer process.**

### Security Requirements — Non-Negotiable

1. **No private key in app memory.** Private keys must be in HSM (Hardware Security Module) or MPC (Multi-Party Computation) — never in application memory as a raw string or Buffer.
2. **No private key in database.** Never. Not encrypted, not hashed. The signer is the sole holder of key material.
3. **Multi-step consent for every transaction.** The flow is:
   - Step 1: User requests action (e.g., "create token")
   - Step 2: System builds unsigned transaction, displays full preview
   - Step 3: User reviews: transaction type, fee estimate, SOL amount, destination
   - Step 4: User explicitly confirms with a secondary action (e.g., PIN or re-authentication)
   - Step 5: Transaction signed and submitted
   - Step 6: Transaction signature returned, audit logged
4. **Audit every transaction.** Every signed transaction includes: user ID, workspace ID, Solana signature, block height, estimated fee, action type, and ISO timestamp. Stored in `on_chain_audit` table (separate from main `audit_events`).
5. **Hard limits.** Per-workspace daily SOL spending cap, configurable per workspace (default: 1 SOL/day). Transactions exceeding cap are rejected even with user confirmation.

### Supported Operations

| Operation | Chain | Program | User Consent Required |
|-----------|-------|---------|----------------------|
| Create token | Solana | pump.fun | Yes — full transaction preview |
| Add liquidity | Solana | pump.fun | Yes — amount + fee preview |
| Update token metadata | Solana | Metaplex | Yes — metadata diff preview |

### What It Does NOT Do

- Does NOT auto-submit without user confirmation (ever)
- Does NOT store private keys (anywhere)
- Does NOT support arbitrary SPL token operations (scope-limited)
- Does NOT auto-retry failed transactions without user re-confirmation

### What It Requires to Ship

- [ ] HSM vendor selected and integrated (AWS CloudHSM, YubiHSM, or similar)
- [ ] OR MPC signing library audited and integrated
- [ ] Consent UI implemented in Mini App
- [ ] Per-workspace spending cap UI and enforcement
- [ ] On-chain audit table and query API
- [ ] Legal review: custody implications in applicable jurisdictions
- [ ] Security audit of `wild-wallet-signer` package

---

## WILD Feature 3: Cross-Platform Social Automation

### Overview

`SocialBroadcastService` enables LaunchCtrl to post coordinated launch announcements across Twitter/X and set up Discord servers as part of a launch sequence — currently these are COPY_PASTE steps.

### Feature Flag

```
Flag key:    wild.social.broadcast
Default:     enabled=false
Tier:        Pro and above
```

### Architecture

```typescript
// packages/api/src/wild/social/SocialBroadcastService.ts
export interface ISocialPlatformAdapter {
  postAnnouncement(content: SocialContent): Promise<PostResult>;
  getPostStatus(postId: string): Promise<PostStatus>;
  revokeAuth(): Promise<void>;
}

// Platform adapters
export class TwitterXAdapter implements ISocialPlatformAdapter { ... }
export class DiscordAdapter implements ISocialPlatformAdapter { ... }

export class SocialBroadcastService {
  private adapters: Map<SocialPlatform, ISocialPlatformAdapter>;

  async broadcast(workspaceId: string, content: SocialContent, platforms: SocialPlatform[]) {
    // Check feature flag
    if (!await this.flags.isEnabled('wild.social.broadcast', workspaceId)) {
      throw new FeatureDisabledError('wild.social.broadcast');
    }
    // Fan out to platform adapters via per-platform queues
    return Promise.allSettled(
      platforms.map(p => this.queuePlatformPost(p, content))
    );
  }
}
```

### Authentication

- OAuth 2.0 PKCE flow for Twitter/X — access tokens stored encrypted in `integration_configs`
- Discord bot token (user-provided) — stored encrypted in `integration_configs`
- Tokens stored via same AES-256-GCM encryption as other integration configs
- Tokens never appear in logs or API responses
- Token refresh handled automatically; re-auth prompted on expiry

### Rate Limit Handling

Each platform has different rate limits — the broadcast service uses platform-specific BullMQ queues with platform-aware retry delays:

| Platform | Post rate limit | Retry strategy |
|----------|----------------|----------------|
| Twitter/X | 300 tweets/3h (Basic API) | Exponential backoff, honour `x-rate-limit-reset` header |
| Discord | 5 requests/5s per channel | Fixed 1s delay between channel posts |

### What It Requires to Ship

- [ ] Twitter/X API v2 OAuth 2.0 flow implemented in Mini App
- [ ] Discord OAuth or bot token onboarding flow
- [ ] Per-platform job queues with rate-limit-aware scheduling
- [ ] UI for configuring which platforms to include in a launch sequence
- [ ] Platform ToS review: confirm automated posting is permitted for use case

---

## WILD Feature 4: AI-Powered Copy Generation

### Overview

Replaces LaunchCtrl's template-based copy generator with an LLM backend for premium tiers. The template system remains the fallback — AI is an enhancement, not a replacement.

### Feature Flag

```
Flag key:    wild.ai.copy
Default:     enabled=false
Tier:        Pro add-on ($19/month)
```

### Architecture

```
packages/
  wild-ai-copy/
    src/
      providers/
        openai.ts         ← GPT-4o via OpenAI API
        anthropic.ts      ← Claude 3.5 via Anthropic API
      prompts/
        announcement.ts   ← structured prompts for announcement copy
        twitter.ts        ← Twitter/X thread prompts
        discord.ts        ← Discord channel description prompts
      fallback/
        template-bridge.ts ← wraps template system as ISendCopyResult
      budget/
        tracker.ts        ← per-workspace LLM call budget enforcement
```

```typescript
export class AICopyGenerator {
  async generate(params: CopyGenerationParams): Promise<GeneratedCopy> {
    // 1. Check feature flag
    if (!await this.flags.isEnabled('wild.ai.copy', params.workspaceId)) {
      return this.fallback.generate(params);
    }
    // 2. Check workspace LLM budget
    const budget = await this.budget.check(params.workspaceId);
    if (budget.remaining <= 0) {
      this.logger.warn({ workspaceId: params.workspaceId }, 'LLM budget exhausted, falling back to templates');
      return this.fallback.generate(params);
    }
    // 3. Select provider (OpenAI preferred, Anthropic fallback)
    const provider = await this.selectProvider();
    try {
      const result = await provider.generate(this.buildPrompt(params));
      await this.budget.deduct(params.workspaceId, result.tokensUsed);
      return result;
    } catch (err) {
      // 4. Always fall back to templates on LLM error — never fail the user
      this.logger.error({ err }, 'LLM generation failed, falling back to templates');
      return this.fallback.generate(params);
    }
  }
}
```

### Fallback Guarantee

If the LLM is unavailable (API error, rate limit, budget exhausted), the system **silently falls back to the template engine** and logs the fallback. The user sees their copy generated — they are notified that AI generation was unavailable only if they explicitly need to know (e.g., in audit log, not in primary UX flow).

### Rate Limiting

- Per-workspace monthly token budget: 200,000 tokens (configurable per subscription)
- Per-request token cap: 4,000 tokens output max
- Metered in `workspace_usage` table: `llm_tokens_used` column

### What It Requires to Ship

- [ ] OpenAI API key stored in `integration_configs` (encrypted) — not a global key
- [ ] Per-workspace budget tracking implementation
- [ ] Prompt engineering for each copy type (tested against 20+ token launch scenarios)
- [ ] A/B test: AI copy quality vs. template quality before public launch

---

## WILD Feature 5: Real-Time Telegram Analytics

### Overview

Aggregates engagement data from Telegram groups (message volume, member growth, reaction rates) using the Telegram MTProto UserBot API. This is fundamentally different from the Bot API — it requires a real user account, not a bot.

### Feature Flag

```
Flag key:    wild.analytics.userbot
Default:     enabled=false
Tier:        Agency only
Status:      HIGH RISK — see Risk Register
```

### Architecture

**Critical: userbot must be a completely separate service with separate credentials.**

```
services/
  launchctrl-api/          ← main API (knows nothing about userbot)
  launchctrl-userbot/      ← separate process, separate repository, separate deploy
    src/
      mtproto/
        client.ts          ← GramJS or Telethon-based MTProto client
        auth.ts            ← phone number + 2FA flow (user-initiated)
      collectors/
        message-stats.ts   ← message volume aggregator
        member-growth.ts   ← join/leave events
        reaction-tracker.ts ← reaction counts on pinned messages
      vault/
        credentials.ts     ← userbot session stored in SEPARATE VAULT
      api/
        grpc-server.ts     ← analytics gRPC server (called by main API)
```

**Data flow:**
```
[Telegram MTProto] → [userbot-agent service] → [analytics gRPC] → [main API] → [Mini App]
```

The main LaunchCtrl database **never** stores userbot session credentials. The userbot service has its own credential store (separate HashiCorp Vault or encrypted flat file).

### Security Requirements

1. **User-provided credentials.** The user (workspace admin) provides their own Telegram account phone number + 2FA code. LaunchCtrl never asks for or stores Telegram account passwords.
2. **Session string stored separately.** The Telegram session string (equivalent to "logged in as user X") is stored in a vault that is not accessible to the main API.
3. **Scope limitation.** The userbot is added to the monitored groups with the minimum read-only access required. It does not post messages, does not modify group settings.
4. **Explicit consent flow.** User sees exactly which groups will be monitored and what data will be collected before confirming setup.

### Honest Note

This feature requires the user to provide their own Telegram account credentials to LaunchCtrl's userbot service. This carries inherent ToS risk (Telegram's Terms of Service restrict automated use of personal accounts) and personal risk (the account could be flagged or banned if Telegram detects automated access patterns). This must be clearly disclosed to users before they connect a personal account. Agency-tier legal review required before shipping.

### What It Requires to Ship

- [ ] Separate vault service for userbot credentials
- [ ] Legal review: Telegram ToS compliance assessment
- [ ] User consent + disclosure UI (with specific data use statement)
- [ ] Rate-limiting MTProto requests to stay within Telegram's undocumented flood limits
- [ ] Group-level user consent model (is the workspace admin authorized to monitor this group?)

---

## Feature Flag Architecture

### Database Schema

```sql
-- Already exists in LaunchCtrl schema
CREATE TABLE feature_flags (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT UNIQUE NOT NULL,          -- e.g. 'wild.rose.automation'
  enabled     BOOLEAN NOT NULL DEFAULT FALSE,
  rollout_pct INTEGER NOT NULL DEFAULT 0,    -- 0-100, for canary rollouts
  description TEXT,
  metadata    JSONB DEFAULT '{}',            -- arbitrary config per flag
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Workspace-level overrides (for per-workspace rollouts)
CREATE TABLE feature_flag_overrides (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key     TEXT NOT NULL REFERENCES feature_flags(key),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  enabled      BOOLEAN NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(flag_key, workspace_id)
);
```

### Flag Naming Convention

```
{phase}.{domain}.{feature}

phase:   sharp | wild
domain:  rose | onchain | social | ai | analytics
feature: automation | signing | broadcast | copy | userbot

Examples:
  wild.rose.automation
  wild.onchain.signing
  wild.social.broadcast
  wild.ai.copy
  wild.analytics.userbot
```

### Flag Check API

```typescript
// Server-side flag check (authoritative)
export async function isFeatureEnabled(
  flagKey: string,
  workspaceId?: string,
  userId?: string
): Promise<boolean> {
  // 1. Check env override (dev/staging only)
  if (process.env.FORCE_WILD_FLAGS?.split(',').includes(flagKey)) {
    if (process.env.NODE_ENV === 'production') {
      logger.error({ flagKey }, 'FORCE_WILD_FLAGS used in production — ignoring');
      // Do NOT honour FORCE_WILD_FLAGS in production
    } else {
      return true;
    }
  }

  // 2. Check workspace-level override
  if (workspaceId) {
    const override = await db.featureFlagOverride.findUnique({
      where: { flag_key_workspace_id: { flag_key: flagKey, workspace_id: workspaceId } },
    });
    if (override !== null) return override.enabled;
  }

  // 3. Check global flag + rollout percentage
  const flag = await db.featureFlag.findUnique({ where: { key: flagKey } });
  if (!flag || !flag.enabled) return false;
  if (flag.rollout_pct >= 100) return true;
  if (flag.rollout_pct <= 0) return false;

  // 4. Deterministic rollout based on workspace/user hash
  const seed = workspaceId ?? userId ?? 'global';
  const hash = createHash('sha256').update(`${flagKey}:${seed}`).digest();
  const bucket = hash.readUInt8(0) % 100; // 0-99
  return bucket < flag.rollout_pct;
}
```

### Client API

```
GET /api/v1/flags
Authorization: Bearer <token>

Response:
{
  "flags": {
    "wild.rose.automation": false,
    "wild.onchain.signing": false,
    "wild.social.broadcast": false,
    "wild.ai.copy": true,        // if workspace has Pro + AI add-on
    "wild.analytics.userbot": false
  }
}
```

The Mini App reads flags once on load and caches for the session. WILD UI elements are hidden (not just disabled) when their flag is `false`.

### Admin Override (Non-Production Only)

```bash
# .env (development/staging only)
FORCE_WILD_FLAGS=wild.ai.copy,wild.social.broadcast

# Ignored entirely if NODE_ENV=production
```

---

## WILD Risk Register

| Feature | Privacy Risk | Platform ToS Risk | Security Risk | Complexity | Overall |
|---------|-------------|------------------|--------------|------------|---------|
| **wild.rose.automation** | L — no new data access | H — no public API; any approach likely ToS violation | M — depends on API security | M | H |
| **wild.onchain.signing** | L — no PII beyond wallet addresses | L — on-chain transactions are intended use | H — private key material, irreversible transactions | H | H |
| **wild.social.broadcast** | M — posting on user behalf | M — auto-posting may violate platform ToS at scale | M — OAuth token security | M | M |
| **wild.ai.copy** | L — copy content, no PII to LLM by default | L — LLM API is intended use | L — API key security only | L | L |
| **wild.analytics.userbot** | H — real user account access to group messages | H — MTProto personal account automation is Telegram ToS gray area | H — session string = full account access | H | H |

**Risk levels:** H = High, M = Medium, L = Low

### Feature Readiness Assessment

| Feature | Can Ship? | Blocker |
|---------|-----------|---------|
| wild.ai.copy | ✓ Yes | Prompt engineering + budget tracking implementation |
| wild.social.broadcast | ✓ Yes (with caveats) | Platform OAuth flows + ToS review |
| wild.onchain.signing | Conditional | HSM/MPC integration + legal review |
| wild.rose.automation | ✗ No | Rose Bot has no public API |
| wild.analytics.userbot | Conditional | Telegram ToS review + separate vault infrastructure |
