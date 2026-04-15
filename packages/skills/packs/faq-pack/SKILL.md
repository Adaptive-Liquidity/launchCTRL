---
slug: faq-pack
name: FAQ Pack
version: 1.0.0
description: >
  Generates a comprehensive FAQ document, Rose Bot FAQ notes, and pinned FAQ
  message templates for your community. Covers common questions about buying,
  the contract address, the team, tokenomics, and security.
author: LaunchCtrl
tags:
  - faq
  - copy
  - documentation
  - rose
requiredIntegrations: []
conflictsWith: []
compatibleCategories: all
minSecurityProfile: low
minAutomationProfile: minimal
safetyRules:
  - id: no-financial-advice
    description: FAQ copy must not constitute financial advice
    type: soft_warn
    condition: "true"
configSchema:
  - key: includeTokenomics
    label: Include Tokenomics FAQ
    type: boolean
    required: false
    default: true
  - key: includeTeamFaq
    label: Include Team FAQ
    type: boolean
    required: false
    default: false
  - key: includeSecurityFaq
    label: Include Security / Scam FAQ
    type: boolean
    required: false
    default: true
---

# FAQ Pack

Generates structured FAQ content ready for pinning in your community or loading as Rose Bot notes.

## What Gets Generated

- Full FAQ document (pinnable message format)
- Individual FAQ items as Rose Bot `/save` notes
- Anti-scam FAQ section
- Tokenomics FAQ (if enabled)

## Disclaimer

All FAQ content should be reviewed and customized. This pack generates starter content based on your project details — you know your community best.
