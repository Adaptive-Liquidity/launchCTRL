# LaunchCtrl Monetization Strategy

**Version:** 1.0.0  
**Last Updated:** 2026-01  
**Owner:** Product / Growth  
**Classification:** INTERNAL

---

## Business Model: Usage-Based SaaS

LaunchCtrl is sold as a subscription product with usage metering. The billing unit is **workspace activity** — plan generations, asset creation, and advanced execution modes — rather than seats. This aligns pricing with value delivered (more launches = more billing) and keeps the free tier genuinely useful for individual operators.

---

## Subscription Tiers

### Free Tier

**For:** Individual token community operators exploring LaunchCtrl before committing.

| Feature | Limit |
|---------|-------|
| Workspaces | 1 |
| Plan generations / month | 3 |
| Execution modes | COPY_PASTE and MANUAL_CONFIRMATION_REQUIRED only |
| Generated assets / month | 5 |
| Team members | 1 (solo only) |
| API access | No |
| Audit log export | No |
| Support | Community (GitHub Discussions) |
| SLA | None |
| WILD features | None |

**Rationale:** 3 plan generations/month is enough for a user to run one real launch and see the product's full value. The asset limit (5) is intentionally low — users will hit it naturally after one full launch sequence and understand exactly why upgrading is worth it.

---

### Pro Tier — $49/month or $399/year (~32% savings)

**For:** Active community operators running regular launches, project teams, small agencies.

| Feature | Limit |
|---------|-------|
| Workspaces | Unlimited |
| Plan generations / month | Unlimited |
| Execution modes | All modes including AUTO (when not DRY_RUN) |
| Generated assets / month | Unlimited |
| Team members per workspace | 3 |
| API access | Yes (100 req/min, same as UI limit) |
| Audit log export | Yes (CSV/JSON, last 90 days) |
| Support | Priority (48h response) |
| SLA | None (best effort) |
| WILD features | `wild.ai.copy` (if add-on purchased) |

**Annual pricing note:** $399/year = $33.25/month effective. Recommend surfacing this as "Save $189/year" in the billing UI.

---

### Agency Tier — $199/month or $1,599/year (~33% savings)

**For:** Launch agencies, KOL management firms, multi-project operators who manage launches for others.

| Feature | Limit |
|---------|-------|
| Workspaces | Unlimited |
| Plan generations / month | Unlimited |
| Execution modes | All modes |
| Generated assets / month | Unlimited |
| Team members per workspace | 10 |
| API access | Yes (500 req/min) |
| Audit log export | Yes (CSV/JSON, full history) |
| White-label Mini App | Yes (custom branding on request) |
| Custom skill pack development | Yes (1 custom skill pack/quarter included) |
| Support | Dedicated onboarding + Slack/Telegram direct channel |
| SLA | 99.9% uptime commitment (monthly credit if breached) |
| WILD features | All available WILD features when launched |

**White-label note:** White-label replaces LaunchCtrl logo/name with the agency's brand in the Telegram Mini App. Implemented via workspace-level `branding` config in the DB. No separate deployment required for initial implementation.

---

## WILD Add-Ons (When Features Launch)

These are optional, purchasable additions to any paid tier.

### AI Copy Generation — $19/month

- 1,000 LLM-powered copy generation requests/month
- Overage: $0.02 per request above 1,000 (metered via Stripe)
- Available on: Pro and Agency tiers
- Technology: OpenAI GPT-4o / Anthropic Claude 3.5 (user-transparent)
- Flag: `wild.ai.copy`

### On-Chain Automation — TBD

- Pricing model: service fee + gas cost pass-through
- Proposed structure: $0.50 flat fee per on-chain transaction + actual SOL gas cost (passed through at cost, no markup)
- Available on: Agency tier only
- Requires: HSM signing infrastructure (costs scale with transaction volume)
- Flag: `wild.onchain.signing`
- Status: Pricing TBD pending infrastructure cost analysis

---

## Revenue Projections (Conservative Scenario)

Assumptions: Product launches Q2 2026. Growth driven primarily by organic community discovery and content marketing.

### Year 1 Targets

| Segment | Count | MRR | ARR |
|---------|-------|-----|-----|
| Pro (monthly) | 120 users | $5,880 | $70,560 |
| Pro (annual, amortized) | 80 users | $2,660 | $31,920 |
| Agency (monthly) | 12 users | $2,388 | $28,656 |
| Agency (annual, amortized) | 8 users | $1,066 | $12,792 |
| AI Copy add-on | 50 users | $950 | $11,400 |
| **Total** | **270 paid users** | **~$12,944 MRR** | **~$155,328 ARR** |

**Note:** These are internal planning targets, not guarantees. The crypto/token launch market is highly seasonal — expect Q1 and Q4 peaks aligned with market cycles.

### Year 2 Targets (with WILD features partially shipped)

| Segment | Count | MRR |
|---------|-------|-----|
| Pro | 400 users | $19,600 |
| Agency | 40 users | $7,960 |
| Add-ons | 150 users | ~$3,000 |
| **Total** | ~590 paid | **~$30,560 MRR** |

### Unit Economics

| Metric | Value |
|--------|-------|
| Target customer acquisition cost (CAC) | <$50 |
| Pro tier LTV (24-month average) | $1,176 |
| Agency tier LTV (24-month average) | $4,776 |
| LTV:CAC ratio target | >10:1 (Pro), >50:1 (Agency) |
| Gross margin estimate | ~85% (SaaS infra costs are low at this scale) |

---

## Implementation: Billing Architecture

### Stripe Integration

LaunchCtrl uses Stripe Billing for subscription management:

```
User upgrades plan
→ POST /api/v1/billing/create-checkout-session
  { priceId: 'price_pro_monthly' }
→ Stripe Checkout Session created
→ User redirected to Stripe-hosted checkout page
→ Payment completes
→ Stripe sends webhook: checkout.session.completed
→ LaunchCtrl webhook handler: POST /webhooks/stripe
  → Validates Stripe-Signature header
  → Upserts subscription record in DB
  → Sets workspace.subscription_tier = 'pro'
  → Enables appropriate feature flags for workspace
```

### Stripe Product Catalog Structure

```
Products:
  LaunchCtrl Pro (monthly)    → price_pro_monthly    ($49/month)
  LaunchCtrl Pro (annual)     → price_pro_annual     ($399/year)
  LaunchCtrl Agency (monthly) → price_agency_monthly ($199/month)
  LaunchCtrl Agency (annual)  → price_agency_annual  ($1,599/year)
  AI Copy Add-on              → price_ai_copy        ($19/month)

Meters (for usage-based add-ons):
  on_chain_transactions       → $0.50/transaction (future)
  llm_overage_requests        → $0.02/request above 1,000
```

### Usage Metering

Track usage in the `workspace_usage` table:

```sql
CREATE TABLE workspace_usage (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id),
  billing_period  DATE NOT NULL,  -- first day of billing month
  plan_generations INTEGER NOT NULL DEFAULT 0,
  asset_count      INTEGER NOT NULL DEFAULT 0,
  llm_tokens_used  BIGINT NOT NULL DEFAULT 0,
  on_chain_txns    INTEGER NOT NULL DEFAULT 0,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id, billing_period)
);
```

Usage incremented atomically:
```sql
INSERT INTO workspace_usage (workspace_id, billing_period, plan_generations)
VALUES ($1, date_trunc('month', NOW())::DATE, 1)
ON CONFLICT (workspace_id, billing_period)
DO UPDATE SET 
  plan_generations = workspace_usage.plan_generations + 1,
  updated_at = NOW();
```

### Feature Gating

Every quota-limited operation checks before executing:

```typescript
// packages/api/src/lib/quota.ts
export async function checkQuota(
  workspaceId: string,
  resource: 'plan_generations' | 'asset_count',
): Promise<void> {
  const tier = await getWorkspaceTier(workspaceId);
  const limits = TIER_LIMITS[tier];
  
  if (limits[resource] === Infinity) return; // unlimited tier
  
  const usage = await getWorkspaceUsage(workspaceId, currentBillingPeriod());
  if (usage[resource] >= limits[resource]) {
    throw new QuotaExceededError(resource, limits[resource], tier);
  }
}

// Usage in plan creation route:
await checkQuota(workspaceId, 'plan_generations');
const plan = await createPlan(workspaceId, params);
await incrementUsage(workspaceId, 'plan_generations');
```

### Subscription Sync Webhook Handler

```typescript
// packages/api/src/webhooks/stripe.ts
app.post('/webhooks/stripe', async (ctx) => {
  const sig = ctx.req.header('stripe-signature');
  const body = await ctx.req.text();
  
  // Validate signature (throws if invalid)
  const event = stripe.webhooks.constructEvent(
    body, sig, process.env.STRIPE_WEBHOOK_SECRET!
  );
  
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutComplete(event.data.object);
      break;
    case 'customer.subscription.updated':
      await syncSubscriptionTier(event.data.object);
      break;
    case 'customer.subscription.deleted':
      await downgradeToFree(event.data.object.metadata.workspaceId);
      break;
    case 'invoice.payment_failed':
      await handlePaymentFailure(event.data.object);
      break;
  }
  
  return ctx.json({ received: true });
});
```

---

## Distribution Strategy

### Primary Channel: Telegram Ecosystem

LaunchCtrl is a Telegram Mini App — it belongs in the Telegram ecosystem.

- **Telegram Bot Directory:** Submit bot to `@BotFather` directory listing. Optimize bot description for "token launch", "community setup", "crypto launch".
- **Telegram Mini App Store (when available):** List in official Telegram app store with screenshots and demo.
- **Crypto Telegram Groups:** Engage authentically in pump.fun, Solana token, and crypto launch Telegram communities. Product-led growth: "I used LaunchCtrl to set up my launch in 10 minutes" posts from real users.

### Secondary Channel: crypto Twitter/X

The Solana/memecoin launch community lives on Twitter/X.

- **Demo content:** Short-form videos showing full launch sequence (plan → execute → launch) in under 5 minutes.
- **"How to launch your token community" tutorial thread:** SEO-equivalent for crypto Twitter.
- **KOL partnerships:** Early access for 5-10 crypto launch KOLs who regularly launch tokens and would use the product authentically.

### Tertiary Channel: pump.fun and Solana Community Platforms

- **pump.fun Discord:** Relevant launch tools discussion channels.
- **Solana Foundation ecosystem listings:** Developer tool directory.
- **GitHub:** Open-source skill pack templates to drive developer distribution and community contributions.

### Content Marketing

Three content pillars:
1. **Educational:** "How to launch a token community the right way" (not promotion, genuine value)
2. **Product showcase:** Before/after: manual launch setup vs. LaunchCtrl (time, mistakes avoided)
3. **Community:** Skill pack showcase — user-contributed templates for different community types (meme, utility, DeFi, etc.)

### Viral Mechanics

- **Launch badges:** Communities that use LaunchCtrl can show "Launched with LaunchCtrl" in their group description (optional, user-initiated).
- **Skill pack marketplace (future):** Users can publish and share skill packs. Popular packs drive discovery.
- **Audit trail sharing:** Workspace admins can generate a shareable "launch proof" — a public, read-only view of their launch execution log. Demonstrates professionalism to their community.

---

## Competitive Positioning

### vs. Manual Setup

| Dimension | Manual | LaunchCtrl |
|-----------|--------|-----------|
| Time to configure Rose Bot | 30-60 min (docs + trial/error) | 5 min (pre-configured skill pack) |
| Risk of configuration error | High | Low (validated templates) |
| Consistency across launches | Low | High (same playbook every time) |
| Audit trail | None | Full execution log |
| Collaboration | None (single operator) | Workspace with team members |

**Positioning statement:** "LaunchCtrl is the difference between a chaotic launch day and one you've already run 10 times."

### vs. Other Launch Tools

Existing tools in the space either:
1. Promise automation they can't deliver (no real Rose Bot API)
2. Require wallet connections and handle private keys
3. Are Discord-first and don't work with Telegram communities

LaunchCtrl's competitive advantages:
- **Honest:** We say COPY_PASTE when it's COPY_PASTE. No fake automation.
- **Security-first:** No wallet custody, no private keys. Explicitly documented in product copy.
- **Telegram-native:** Mini App lives inside Telegram — no context switching.
- **Skill pack ecosystem:** Extensible, community-driven playbook system.
- **Full audit trail:** Every action logged. Shareable proof of professional launch.

### Moat

1. **Skill pack ecosystem:** As users contribute and share skill packs, LaunchCtrl becomes the knowledge base for token community launch operations. This is defensible against new entrants who have no ecosystem.
2. **Audit trail and history:** Users who have used LaunchCtrl for multiple launches have a history and templates calibrated to their community type. Switching cost increases with each launch.
3. **Agency relationships:** Agencies that build their launch playbook on LaunchCtrl are extremely sticky — switching means rebuilding playbooks elsewhere.
4. **WILD when it ships:** On-chain automation (when stable) is a powerful differentiator. First-mover advantage if shipped before competitors.

---

## Pricing Philosophy

**Why $49 for Pro?** In the Solana launch community, a single successful launch can be worth thousands of dollars in community fees, launch services, and token appreciation. $49/month has a <1 hour payback if the product saves one full day of manual setup per month. The price is justified by productivity ROI alone, before any risk-reduction benefits.

**Why not freemium with seat limits?** Seat limits punish growth. Usage-based limits (plan generations, assets) align directly with product activity — busy operators pay more, idle accounts don't.

**Why annual discount?** 32-33% discount for annual plans is standard SaaS. More importantly, annual subscribers have lower churn risk and provide revenue predictability for infrastructure planning.

**Transparency on WILD pricing:** WILD add-ons are priced to cover real infrastructure costs (LLM API costs, HSM fees) with a margin. We do not inflate WILD pricing as a punitive "premium feature" surcharge — the price reflects the cost of delivering the feature.
