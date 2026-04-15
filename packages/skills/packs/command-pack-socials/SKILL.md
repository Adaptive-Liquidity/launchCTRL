---
slug: command-pack-socials
name: Social Commands Pack
version: 1.0.0
description: >
  Generates a complete set of Telegram bot command responses for social links,
  buy links, chart links, website, docs, and community navigation commands.
  Works with Rose Bot notes or any bot that supports custom commands.
author: LaunchCtrl
tags:
  - commands
  - socials
  - rose
  - links
requiredIntegrations: []
conflictsWith: []
compatibleCategories: all
minSecurityProfile: low
minAutomationProfile: minimal
safetyRules: []
configSchema:
  - key: twitterUrl
    label: Twitter/X URL
    type: string
    required: false
  - key: websiteUrl
    label: Website URL
    type: string
    required: false
  - key: dexscreenerUrl
    label: Chart URL (DexScreener / DEXTools)
    type: string
    required: false
  - key: telegramUrl
    label: Main Telegram Group URL
    type: string
    required: false
  - key: docsUrl
    label: Documentation URL
    type: string
    required: false
---

# Social Commands Pack

Generates command response content for all standard Telegram community commands.

## Commands Generated

- `/twitter` or `/x` — Twitter/X link
- `/website` — Project website
- `/chart` — DEX chart link
- `/buy` — How to buy instructions
- `/ca` or `/contract` — Contract address
- `/tg` — Telegram group link
- `/docs` — Documentation
- `/socials` — All links in one

## Usage with Rose Bot

These are generated as Rose Bot `/save` notes. Format:
```
/save twitter {content}
```

Members can then use `/twitter` to retrieve the saved note.
