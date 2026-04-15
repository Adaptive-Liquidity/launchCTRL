---
slug: crisis-mode
name: Crisis Mode
version: 1.0.0
description: >
  Pre-built crisis communication templates and group lockdown procedures.
  Activates when your community is under FUD attack, coordinated spam, or
  negative news cycle. Generates calm, authoritative response copy.
author: LaunchCtrl
tags:
  - crisis
  - security
  - communication
  - emergency
requiredIntegrations: []
conflictsWith: []
compatibleCategories: all
minSecurityProfile: balanced
minAutomationProfile: minimal
safetyRules:
  - id: crisis-mode-review-required
    description: Crisis mode templates must always be reviewed before use
    type: soft_warn
    condition: "true"
configSchema:
  - key: lockdownOnActivate
    label: Lock Group on Crisis Activation
    type: boolean
    required: false
    default: false
    description: Whether to automatically restrict all member messages during crisis
---

# Crisis Mode Skill Pack

**Important:** Crisis mode templates are designed to be reviewed and personalized before use. Never deploy crisis communications without human review.

## What This Pack Generates

- Group lockdown announcement
- FUD response template
- Team statement template
- Update coming message
- Resolution announcement template

## When to Use Crisis Mode

- Coordinated FUD attacks on your community
- Negative news cycles requiring official response
- Security incidents (hacks, exploits, phishing)
- Market volatility communications
- Bot/raid attacks requiring group lockdown
