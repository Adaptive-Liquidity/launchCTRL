# LaunchCtrl API Reference

## Overview

- **Base URL**: `http://localhost:3001` (development)
- **Content-Type**: `application/json`
- **Authentication**: Bearer token via `Authorization` header
- **API Version**: `v1` (prefixed on most routes: `/api/v1/...`)

---

## Authentication

### Obtaining a Session Token

All authenticated endpoints require a Bearer token obtained via `POST /api/auth/telegram`.

```http
Authorization: Bearer <64-char-session-token>
```

Tokens are 64-character nanoid strings. They do not expire by time alone — each session has an explicit `expiresAt` set to 7 days from creation. Sessions can be revoked early via `DELETE /auth/session`.

### Rate Limits

| Scope | Limit |
|-------|-------|
| All authenticated routes | 100 requests / 60 seconds per user |
| Auth endpoints (`/api/auth/*`) | 20 requests / 60 seconds per IP |

Rate limit exceeded response: `429 Too Many Requests` with `{ error: { code: "RATE_LIMITED", message: "..." } }`

### Response Envelope

All API responses use a consistent envelope:

**Success:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": { }
  }
}
```

---

## Auth

### `POST /api/auth/telegram`

Validate Telegram Mini App `initData` and create a new session.

**Auth required**: No

**Request body:**
```json
{
  "initData": "auth_date=1234567890&user=%7B%22id%22%3A123%7D&hash=abc..."
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `initData` | `string` | Yes | URL-encoded Telegram initData string from `window.Telegram.WebApp.initData` |

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "token": "nanoid64characterstringhere...",
    "user": {
      "id": "usr_abc123",
      "telegramUserId": 123456789,
      "telegramFirstName": "Alice",
      "telegramUsername": "alice_test",
      "telegramPhotoUrl": null
    },
    "expiresAt": "2024-12-31T23:59:59.000Z"
  }
}
```

**Error responses:**
| Status | Code | Reason |
|--------|------|--------|
| `400` | `MISSING_INIT_DATA` | `initData` field not present in body |
| `401` | `INVALID_HASH` | HMAC-SHA256 hash does not match |
| `401` | `EXPIRED` | `auth_date` is older than `TELEGRAM_INIT_DATA_MAX_AGE_SECONDS` |
| `401` | `MALFORMED` | `initData` is not valid URL-encoded data |
| `401` | `MISSING_USER` | `user` parameter missing from `initData` |

---

### `POST /api/auth/logout`

Revoke the current session token.

**Auth required**: No (graceful if called without token)

**Request body**: Empty

**Response `200 OK`:**
```json
{
  "success": true,
  "data": null
}
```

---

## Users

### `GET /api/users/me`

Get the current authenticated user's profile.

**Auth required**: Yes

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "id": "usr_abc123",
    "telegramUserId": 123456789,
    "telegramFirstName": "Alice",
    "telegramLastName": "Smith",
    "telegramUsername": "alice_test",
    "telegramPhotoUrl": "https://t.me/i/userpic/...",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error responses:**
| Status | Code | Reason |
|--------|------|--------|
| `401` | `UNAUTHORIZED` | Missing or invalid session token |

---

## Workspaces

### `GET /api/workspaces`

List all workspaces the current user is a member of.

**Auth required**: Yes

**Response `200 OK`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "ws_abc123",
      "name": "PepeMax Launch",
      "description": "Setup workspace for PepeMax token",
      "ownerId": "usr_abc123",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### `POST /api/workspaces`

Create a new workspace.

**Auth required**: Yes

**Request body:**
```json
{
  "name": "My Token Launch",
  "description": "Optional description"
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `name` | `string` | Yes | 1–128 characters |
| `description` | `string` | No | Max 512 characters |

**Response `201 Created`:**
```json
{
  "success": true,
  "data": {
    "id": "ws_abc123",
    "name": "My Token Launch",
    "description": "Optional description",
    "ownerId": "usr_abc123",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error responses:**
| Status | Code | Reason |
|--------|------|--------|
| `400` | `VALIDATION_ERROR` | Invalid name or description |
| `401` | `UNAUTHORIZED` | Not authenticated |

---

### `GET /api/workspaces/:id`

Get a workspace by ID.

**Auth required**: Yes

**Path params**: `id` — workspace ID

**Response `200 OK`:** Same shape as workspace object above.

**Error responses:**
| Status | Code | Reason |
|--------|------|--------|
| `404` | `NOT_FOUND` | Workspace does not exist |
| `401` | `UNAUTHORIZED` | Not authenticated |

---

### `PATCH /api/workspaces/:id`

Update a workspace's name or description.

**Auth required**: Yes (owner or editor role)

**Request body:**
```json
{
  "name": "Updated Name",
  "description": "Updated description"
}
```

**Response `200 OK`:** Updated workspace object.

---

### `POST /api/workspaces/:id/entities`

Add a Telegram entity (group, channel, or bot) to the workspace.

**Auth required**: Yes

**Request body:**
```json
{
  "displayName": "PepeMax Main Group",
  "entityType": "supergroup",
  "telegramChatId": -1001234567890,
  "telegramUsername": "pepemaxchat",
  "description": "The main community group"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `displayName` | `string` | Yes | Human-readable name for this entity |
| `entityType` | `enum` | Yes | `group`, `supergroup`, `channel`, or `bot` |
| `telegramChatId` | `number` | No | Numeric Telegram chat ID |
| `telegramUsername` | `string` | No | Telegram @username (without @) |
| `description` | `string` | No | Optional notes |

**Response `201 Created`:** Created entity object.

---

### `DELETE /api/workspaces/:id/entities/:entityId`

Remove a Telegram entity from the workspace.

**Auth required**: Yes (owner or editor)

**Response `200 OK`:**
```json
{ "success": true, "data": null }
```

---

### `GET /api/workspaces/:id/members`

List all members of the workspace.

**Auth required**: Yes

**Response `200 OK`:**
```json
{
  "success": true,
  "data": [
    {
      "userId": "usr_abc123",
      "role": "owner",
      "joinedAt": "2024-01-01T00:00:00.000Z",
      "user": {
        "telegramFirstName": "Alice",
        "telegramUsername": "alice_test"
      }
    }
  ]
}
```

---

### `DELETE /api/workspaces/:id/members/:userId`

Remove a member from the workspace.

**Auth required**: Yes (owner only)

**Response `200 OK`:**
```json
{ "success": true, "data": null }
```

---

## Planner

### `POST /api/plans`

Create a new execution plan from wizard answers.

**Auth required**: Yes

**Request body:**
```json
{
  "workspaceId": "ws_abc123",
  "answers": {
    "launchName": "PepeMax",
    "launchTicker": "PEPEMAX",
    "launchDescription": "The most pepe-brained token on Solana",
    "platform": "pumpfun",
    "contractAddress": "PePeMaxXxXxXx...",
    "websiteUrl": "https://pepemax.io",
    "twitterUrl": "https://twitter.com/pepemaxio",
    "telegramUrl": "https://t.me/pepemaxchat",
    "category": "meme_token",
    "securityProfile": "balanced",
    "automationProfile": "standard",
    "integrations": ["rose", "combot"],
    "toneProfile": "degen",
    "generateWelcome": true,
    "generateRules": true,
    "generateFaq": false,
    "generateCommands": true,
    "generateAnnouncements": false,
    "generateCrisisMode": false,
    "generateRaidMode": false
  }
}
```

**Response `201 Created`:**
```json
{
  "success": true,
  "data": {
    "id": "plan_abc123",
    "workspaceId": "ws_abc123",
    "status": "draft",
    "steps": [
      {
        "id": "step_abc",
        "sequence": 1,
        "title": "Create workspace configuration",
        "executionMode": "AUTO",
        "integration": "system",
        "action": "workspace.configure",
        "estimatedDurationSeconds": 2
      }
    ],
    "assetSpecs": [...],
    "risks": [],
    "permissions": [],
    "estimatedTotalMinutes": 12,
    "autoStepCount": 4,
    "manualStepCount": 6,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### `GET /api/plans/:id`

Get a plan with its full step list and asset specs.

**Auth required**: Yes

**Response `200 OK`:** Full plan object (same shape as create response).

**Error responses:**
| Status | Code | Reason |
|--------|------|--------|
| `404` | `NOT_FOUND` | Plan does not exist |

---

### `POST /api/plans/:id/approve`

Approve a plan for execution. A plan must be in `draft` status to be approved.

**Auth required**: Yes (owner or editor)

**Request body**: Empty `{}`

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "id": "plan_abc123",
    "status": "approved",
    ...
  }
}
```

**Error responses:**
| Status | Code | Reason |
|--------|------|--------|
| `400` | `INVALID_STATUS` | Plan is not in `draft` status |
| `404` | `NOT_FOUND` | Plan does not exist |

---

### `GET /api/workspaces/:id/plans`

List all plans for a workspace.

**Auth required**: Yes

**Query params:**
| Param | Type | Description |
|-------|------|-------------|
| `status` | `string` | Filter by status: `draft`, `approved`, `archived` |
| `page` | `number` | Page number (default: 1) |
| `perPage` | `number` | Results per page (default: 25, max: 100) |

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "plans": [...],
    "total": 3,
    "page": 1,
    "perPage": 25
  }
}
```

---

## Executor

### `POST /api/runs`

Start an execution run for an approved plan.

**Auth required**: Yes (owner or editor)

**Request body:**
```json
{
  "planId": "plan_abc123",
  "workspaceId": "ws_abc123",
  "isDryRun": true
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `planId` | `string` | Yes | ID of an `approved` plan |
| `workspaceId` | `string` | Yes | Must match the plan's workspace |
| `isDryRun` | `boolean` | No | Default: `true`. Set to `false` for live execution |

**Response `201 Created`:**
```json
{
  "success": true,
  "data": {
    "id": "run_abc123",
    "workspaceId": "ws_abc123",
    "planId": "plan_abc123",
    "status": "running",
    "isDryRun": true,
    "startedAt": "2024-01-01T00:00:00.000Z",
    "completedAt": null,
    "currentStepIndex": 0,
    "totalSteps": 10
  }
}
```

**Error responses:**
| Status | Code | Reason |
|--------|------|--------|
| `400` | `PLAN_NOT_APPROVED` | Plan is not in `approved` status |
| `400` | `WORKSPACE_MISMATCH` | `workspaceId` does not match plan's workspace |
| `404` | `NOT_FOUND` | Plan does not exist |

---

### `GET /api/runs/:id`

Get the current status of an execution run.

**Auth required**: Yes

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "id": "run_abc123",
    "status": "completed",
    "isDryRun": true,
    "startedAt": "2024-01-01T00:00:00.000Z",
    "completedAt": "2024-01-01T00:05:30.000Z",
    "currentStepIndex": 10,
    "totalSteps": 10,
    "stepResults": [
      {
        "stepId": "step_abc",
        "status": "completed",
        "executionMode": "AUTO",
        "completedAt": "2024-01-01T00:00:01.000Z"
      }
    ]
  }
}
```

Terminal run statuses: `completed`, `failed`, `cancelled`

---

### `POST /api/runs/:id/cancel`

Cancel an in-progress run.

**Auth required**: Yes (owner or editor)

**Request body**: Empty `{}`

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "id": "run_abc123",
    "status": "cancelled",
    "completedAt": "2024-01-01T00:03:00.000Z"
  }
}
```

---

### `GET /api/workspaces/:id/runs`

List all execution runs for a workspace.

**Auth required**: Yes

**Query params:**
| Param | Type | Description |
|-------|------|-------------|
| `status` | `string` | Filter: `pending`, `running`, `completed`, `failed`, `cancelled` |
| `isDryRun` | `boolean` | Filter by dry run flag |

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "runs": [...],
    "total": 5,
    "page": 1,
    "perPage": 25
  }
}
```

---

## Assets

### `GET /api/workspaces/:id/assets`

List all generated assets for a workspace.

**Auth required**: Yes

**Query params:**
| Param | Type | Description |
|-------|------|-------------|
| `runId` | `string` | Filter assets by run |
| `assetType` | `string` | Filter by asset type |

**Response `200 OK`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "ast_abc123",
      "workspaceId": "ws_abc123",
      "runId": "run_abc123",
      "assetType": "welcome_message",
      "name": "PepeMax — Welcome Message",
      "content": "🚀 Welcome to PepeMax, {first}!\n\n...",
      "tone": "degen",
      "variables": { "PROJECT_NAME": "PepeMax", "TICKER": "PEPEMAX" },
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### `GET /api/assets/:id`

Get the full content of a generated asset.

**Auth required**: Yes

**Response `200 OK`:** Single asset object (same shape as list item above).

**Error responses:**
| Status | Code | Reason |
|--------|------|--------|
| `404` | `NOT_FOUND` | Asset does not exist |

---

### `PATCH /api/assets/:id`

Update a generated asset's content (user edits).

**Auth required**: Yes (owner or editor)

**Request body:**
```json
{
  "content": "Updated asset content here...",
  "name": "Optional updated name"
}
```

**Response `200 OK`:** Updated asset object.

---

## Audit Log

### `GET /api/workspaces/:id/audit`

Get the paginated audit log for a workspace.

**Auth required**: Yes

**Query params:**
| Param | Type | Description |
|-------|------|-------------|
| `page` | `number` | Page number (default: 1) |
| `perPage` | `number` | Results per page (default: 25, max: 100) |
| `action` | `string` | Filter by action string (e.g. `workspace.created`) |
| `userId` | `string` | Filter by actor user ID |
| `from` | `string` | ISO 8601 start datetime |
| `to` | `string` | ISO 8601 end datetime |

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "events": [
      {
        "id": "audit_abc123",
        "userId": "usr_abc123",
        "workspaceId": "ws_abc123",
        "action": "workspace.created",
        "resourceType": "workspace",
        "resourceId": "ws_abc123",
        "metadata": { "name": "PepeMax Launch" },
        "riskLevel": "low",
        "dryRun": false,
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "total": 42,
    "page": 1,
    "perPage": 25
  }
}
```

---

## Skills

### `GET /api/skills`

List all available skill packs.

**Auth required**: Yes

**Response `200 OK`:**
```json
{
  "success": true,
  "data": [
    {
      "slug": "rose-core",
      "name": "Rose Core",
      "description": "Core Rose Bot configuration pack.",
      "version": "1.0.0",
      "tags": ["rose", "moderation", "core"],
      "requiredIntegrations": ["rose"],
      "valid": true,
      "errors": []
    }
  ]
}
```

---

### `GET /api/skills/:slug`

Get the full details of a skill pack, including config schema and templates.

**Auth required**: Yes

**Path params**: `slug` — skill pack slug (e.g. `rose-core`)

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "meta": {
      "slug": "rose-core",
      "name": "Rose Core",
      "version": "1.0.0",
      "description": "...",
      "tags": ["rose", "moderation"],
      "requiredIntegrations": ["rose"],
      "conflictsWith": [],
      "compatibleCategories": "all",
      "minSecurityProfile": "low",
      "minAutomationProfile": "minimal",
      "safetyRules": [...],
      "configSchema": [...]
    },
    "valid": true,
    "errors": [],
    "templates": [...]
  }
}
```

**Error responses:**
| Status | Code | Reason |
|--------|------|--------|
| `404` | `NOT_FOUND` | Skill pack with this slug not found |

---

## Error Code Reference

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid session token |
| `FORBIDDEN` | 403 | Authenticated but insufficient permissions |
| `NOT_FOUND` | 404 | Resource does not exist |
| `VALIDATION_ERROR` | 400 | Request body fails schema validation |
| `INVALID_HASH` | 401 | Telegram initData hash mismatch |
| `EXPIRED` | 401 | Telegram initData auth_date is too old |
| `MALFORMED` | 401 | Telegram initData is not valid URL-encoded data |
| `MISSING_USER` | 401 | Telegram initData has no `user` field |
| `MISSING_INIT_DATA` | 400 | `initData` not in request body |
| `PLAN_NOT_APPROVED` | 400 | Attempting to run a plan that is not approved |
| `WORKSPACE_MISMATCH` | 400 | planId does not belong to the specified workspaceId |
| `INVALID_STATUS` | 400 | Resource is in wrong status for the requested operation |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unexpected server error |
