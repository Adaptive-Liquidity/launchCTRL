---
slug: rose-core
name: Rose Core
version: 1.0.0
description: >
  Core Rose Bot configuration pack. Sets up welcome messages, rules, anti-flood,
  captcha, and basic moderation for Telegram groups. Generates all required
  commands and copy for a complete Rose setup.
author: LaunchCtrl
tags:
  - rose
  - moderation
  - core
  - welcome
requiredIntegrations:
  - rose
conflictsWith: []
compatibleCategories: all
minSecurityProfile: low
minAutomationProfile: minimal
safetyRules:
  - id: no_ban_without_reason
    description: Ban commands must always include a reason
    type: soft_warn
    condition: "action == 'ban' && !payload.reason"
  - id: no_unrestricted_links
    description: Enabling link permissions on high-security profiles is flagged
    type: soft_warn
    condition: "securityProfile != 'low' && config.allowLinks == true"
configSchema:
  - key: botUsername
    label: Rose Bot Username
    type: string
    required: false
    default: MissRose_bot
    description: The @username of the Rose bot in your group
  - key: welcomeEnabled
    label: Enable Welcome Messages
    type: boolean
    required: false
    default: true
  - key: captchaEnabled
    label: Enable Captcha
    type: boolean
    required: false
    default: false
  - key: antiFloodThreshold
    label: Anti-Flood Message Limit
    type: number
    required: false
    default: 5
    description: Number of messages in quick succession before action is taken
---

# Rose Core Skill Pack

Rose Bot is one of the most capable Telegram group management bots available. This pack configures a complete baseline setup.

## What This Pack Does

- Generates a Rose-compatible welcome message
- Generates `/setrules` content
- Generates anti-spam command sequence
- Generates anti-flood configuration commands
- Generates captcha enable/disable commands
- Generates clean service commands
- Creates a copy-paste setup bundle

## Execution Modes

**With Userbot Agent (AUTO):** When you connect a Telegram account during workspace setup, LaunchCtrl sends all Rose commands automatically. Your account must be a group admin.

**Without Userbot Agent (COPY_PASTE):** LaunchCtrl generates the exact commands for you to paste.

## Generated Commands

All commands should be sent in the group chat by an administrator.

## Rose Bot Permissions Required

When adding Rose to your group, grant these admin permissions:
- ✅ Delete messages
- ✅ Ban users
- ✅ Pin messages
- ✅ Invite users via link
- ✅ Add new admins (optional, for Rose admin system)

## References

- Rose Bot: https://t.me/MissRose_bot
- Rose documentation: https://missrose.org/guide/
