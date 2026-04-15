---
slug: combot-analytics
name: Combot Analytics
version: 1.0.0
description: >
  Combot analytics and anti-spam configuration pack. Sets up Combot for
  community statistics tracking, anti-spam filtering, and member activity
  monitoring via the Combot dashboard.
author: LaunchCtrl
tags:
  - combot
  - analytics
  - anti-spam
  - moderation
requiredIntegrations:
  - combot
conflictsWith: []
compatibleCategories: all
minSecurityProfile: low
minAutomationProfile: minimal
safetyRules:
  - id: combot-cas-recommended
    description: CAS (Combot Anti-Spam) ban list is strongly recommended
    type: soft_warn
    condition: "config.enableCasBan == false"
configSchema:
  - key: enableCasBan
    label: Enable CAS Ban List
    type: boolean
    required: false
    default: true
    description: Automatically bans accounts listed in the Combot Anti-Spam database
  - key: antiSpamLevel
    label: Anti-Spam Level (1-10)
    type: number
    required: false
    default: 5
  - key: trackStats
    label: Enable Community Statistics
    type: boolean
    required: false
    default: true
---

# Combot Analytics Skill Pack

Combot provides community analytics, anti-spam, and moderation for Telegram groups.

## What This Pack Does

- Generates Combot onboarding instructions
- Configures CAS (Combot Anti-Spam) integration
- Sets anti-spam sensitivity level
- Enables community statistics dashboard

## Important: Dashboard Required

Most Combot configuration must be done through the Combot web dashboard at https://combot.org.
LaunchCtrl generates the step-by-step instructions for each configuration item.

## What LaunchCtrl Can Do

- Generate the exact dashboard configuration steps
- Pre-fill recommended settings based on your security profile
- Track whether you've confirmed each step

## Combot Permissions Required

- Delete messages
- Ban users
- Read messages (for statistics)
