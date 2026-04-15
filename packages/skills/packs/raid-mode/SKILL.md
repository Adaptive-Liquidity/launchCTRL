---
slug: raid-mode
name: Raid Mode
version: 1.0.0
description: >
  Anti-raid protection templates and procedures. Generates lockdown commands,
  raid warning messages, and cooldown procedures for when your community
  is targeted by coordinated bot attacks or troll raids.
author: LaunchCtrl
tags:
  - raid
  - security
  - anti-bot
  - protection
requiredIntegrations:
  - rose
conflictsWith: []
compatibleCategories: all
minSecurityProfile: balanced
minAutomationProfile: minimal
safetyRules:
  - id: raid-mode-temporary
    description: Raid mode should be temporary. Remember to disable after the threat passes.
    type: soft_warn
    condition: "true"
configSchema:
  - key: raidSlowMode
    label: Slow Mode Duration (seconds)
    type: number
    required: false
    default: 60
  - key: banOnRaid
    label: Auto-ban during raids (requires Rose with appropriate perms)
    type: boolean
    required: false
    default: false
---

# Raid Mode Skill Pack

Generates anti-raid procedures and messaging for when your community is under a coordinated bot/troll attack.

## Generated Assets

- Raid detection announcement
- Lockdown command sequence (Rose Bot)
- Raid resolution announcement

## Important Notes

- Raid mode is temporary — remember to disable it
- The lockdown commands restrict ALL member messages temporarily
- Rose Bot slow mode is the primary defense tool here
