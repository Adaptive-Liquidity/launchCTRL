---
slug: welcome-copy-studio
name: Welcome Copy Studio
version: 1.0.0
description: >
  Advanced welcome message generation studio. Creates onboarding copy,
  new member instructions, pinned post templates, and first-message
  impressions for any community type and tone.
author: LaunchCtrl
tags:
  - welcome
  - copy
  - onboarding
  - new-member
requiredIntegrations: []
conflictsWith: []
compatibleCategories: all
minSecurityProfile: low
minAutomationProfile: minimal
safetyRules: []
configSchema:
  - key: includeRulesLink
    label: Include Rules Link in Welcome
    type: boolean
    required: false
    default: true
  - key: includeChartLink
    label: Include Chart Link in Welcome
    type: boolean
    required: false
    default: false
  - key: includeContractAddress
    label: Include Contract Address in Welcome
    type: boolean
    required: false
    default: false
---

# Welcome Copy Studio

Generates polished welcome messages for every tone profile. Messages are designed to:
- Make first impressions count
- Orient new members quickly
- Drive engagement without being spammy
- Comply with Telegram's anti-spam guidelines
