---
slug: rose-hardening
name: Rose Hardening
version: 1.0.0
description: >
  Advanced Rose Bot hardening pack for high-security communities. Configures
  strict anti-spam, anti-flood, link blocking, CAS bans, and bot account filtering.
  Requires rose-core as a dependency.
author: LaunchCtrl
tags:
  - rose
  - security
  - hardening
  - anti-spam
requiredIntegrations:
  - rose
conflictsWith: []
compatibleCategories: all
minSecurityProfile: balanced
minAutomationProfile: minimal
safetyRules:
  - id: extreme-lockdown-warning
    description: Extreme security profiles may block legitimate users. Monitor join rate.
    type: soft_warn
    condition: "securityProfile == 'extreme'"
  - id: no-link-permission-on-hard
    description: Allowing links on hard/extreme security profiles is strongly discouraged
    type: hard_block
    condition: "securityProfile == 'extreme' && config.allowLinks == true"
configSchema:
  - key: blockForwardedMessages
    label: Block Forwarded Messages
    type: boolean
    required: false
    default: true
  - key: blockLinks
    label: Block External Links
    type: boolean
    required: false
    default: true
  - key: blockBotAccounts
    label: Block Bot Accounts from Joining
    type: boolean
    required: false
    default: true
  - key: muteOnJoin
    label: Mute New Members Until Verification
    type: boolean
    required: false
    default: false
---

# Rose Hardening Skill Pack

This pack applies aggressive security hardening using Rose Bot commands. It should be applied after rose-core.

## What This Pack Does

- Blocks forwarded messages from external channels
- Blocks external links in messages
- Configures strict anti-flood settings
- Generates CAS ban integration commands
- Configures new member mute until verification
- Sets kick/ban thresholds

## Execution Mode

All steps are COPY_PASTE — you send the commands in your group.

## Warning

Hardening reduces attack surface but increases join friction. Monitor your community health metrics after applying.
