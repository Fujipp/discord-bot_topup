# Roblox Group Payout – System Context (for AI Agent)

## 0. Overview

This document describes how our system will integrate with **Roblox Groups v1 (Legacy) API** to perform **Robux payouts from a group**.

We will build:
- A backend service (HTTP API) that talks to Roblox.
- Optionally a Discord Bot / Web UI that calls our backend.
- Business rules for validation, logging, and safety.

The main external dependency is the **Roblox Groups v1 API**, hosted at `https://groups.roblox.com` (legacy, not Open Cloud).

---

## 1. External API: Roblox Groups v1 (Legacy)

Host: `https://groups.roblox.com` :contentReference[oaicite:0]{index=0}  

### 1.1 Check payout eligibility

**Endpoint**

```http
GET /v1/groups/{groupId}/payout-restriction


Purpose

Returns whether a group is allowed to use the payout feature or if there are restrictions.

Use this BEFORE making payouts to guard against forbidden states (e.g., disabled feature, permissions issue).

Responses (summary) 

Legacy Groups v1

200 OK → returns GroupPayoutRestrictionResponse (e.g., flags describing if payouts are allowed).

400 → “Group is invalid or does not exist.”

401 → “Authorization has been denied for this request.”

403 → “You don't have permission to view this group's payouts.”

Agent should:

Implement a thin wrapper function like getGroupPayoutRestriction(groupId) and use it for health checks / admin diagnostics.

1.2 Get current payout configuration (percentages)

Endpoint

GET /v1/groups/{groupId}/payouts


Purpose

Fetches the list of payout percentages configured for the group (recurring payouts / percentages per member/role). 

Legacy Groups v1

Responses (summary) 

Legacy Groups v1

200 OK → returns ApiArrayResponse[GroupPayoutResponse] (list of payout entries).

400 → invalid group.

401 → unauthorized.

403 → no permission to view payouts.

We do not strictly need this for one-time payouts, but it’s useful for:

Admin UI showing the current payout setup.

Consistency checks with our system’s own rules.

1.3 Make one-time payout (core endpoint)

Endpoint

POST /v1/groups/{groupId}/payouts
Content-Type: application/json


Purpose

Perform one-time Robux payout from a group to one or multiple recipients. 

Legacy Groups v1

Request body schema (conceptual)

{
  "PayoutType": "FixedAmount" | "Percentage",
  "Recipients": [
    {
      "recipientId": 123456789,
      "recipientType": "User",
      "amount": 100
    }
  ]
}


Notes:

PayoutType:

"FixedAmount" → amount is Robux amount per recipient.

"Percentage" → amount is a percentage.

Recipients:

recipientId: Roblox user ID.

recipientType: "User" (groups payouts to users).

amount: number representing either fixed Robux or percentage, depending on PayoutType.

Responses and errors (important) 

Legacy Groups v1

200 OK

Payout succeeded.

Response type: ApiEmptyResponseModel (no payload, success only).

400:

1: Group is invalid or does not exist.

12: Insufficient Robux funds.

24: Invalid payout type.

25: The amount is invalid.

26: Too many recipients.

401:

0: Authorization has been denied for this request.

403:

0: Token Validation Failed

23: Insufficient permissions to complete the request.

28: Group has paid out too recently. Please wait and try again.

35: 2-Step Verification is required to make further transactions.

503:

22: The feature is disabled.

The Agent should:

Map these error codes to clear internal error enums and log them.

Implement retries with backoff only for transient errors (e.g., 503).

For business rule violations (insufficient funds, invalid amount, too many recipients), return a user-friendly message.

2. Authentication Model (High-level)

Roblox Groups v1 API is legacy web API and expects authenticated requests similar to the Roblox website.

Implementation guideline for the Agent:

Use .ROBLOSECURITY cookie for the group owner / privileged account.

Include CSRF token header when required:

Typical pattern: first request fails with 403 and a x-csrf-token header, then retry with that token.

All calls must be done over HTTPS.

For security:

.ROBLOSECURITY MUST NOT be exposed to clients (Discord users, frontend, etc.).

Store secrets in environment variables on the backend only, e.g.:

ROBLOX_SECURITY_COOKIE="..."
ROBLOX_GROUP_ID="1234567"
ROBLOX_MIN_PAYOUT=1
ROBLOX_MAX_PAYOUT=10000


Agent should generate code that never logs the cookie, and masks it in error logs.

3. Our Backend Service Contract

We will create our own internal HTTP API; Agents should treat this as the main interface for bots / UIs.

3.1 Base Assumptions

Backend is stateless HTTP (e.g., Node.js, Python, or Spring Boot).

Uses environment variables for Roblox credentials.

Has centralized logger and (optional) database for payout logs.

3.2 Example API design
3.2.1 Create payout
POST /api/roblox/payout
Content-Type: application/json
Authorization: Bearer <internal-token | discord-signed-request>


Request body

{
  "robloxUserId": 123456789,
  "amount": 100,
  "payoutType": "FixedAmount",
  "reason": "Topup reward from Discord",
  "requestedBy": "discord:123456789012345678",
  "dryRun": false
}


Behavior

Validate input:

amount >= ROBLOX_MIN_PAYOUT

amount <= ROBLOX_MAX_PAYOUT

payoutType allowed by config (e.g., only "FixedAmount" for now).

Optional: check rate limit / cooldown per user/group.

Call Roblox:

POST /v1/groups/{groupId}/payouts with constructed PayoutRequest.

Log to database or storage:

Time, robloxUserId, amount, status, error code (if fail), requestedBy.

Return result:

Response (success)

{
  "success": true,
  "robloxGroupId": 1234567,
  "robloxUserId": 123456789,
  "amount": 100,
  "payoutType": "FixedAmount",
  "robloxStatus": 200
}


Response (error)

{
  "success": false,
  "errorCode": "ROBLOX_INSUFFICIENT_FUNDS",
  "httpStatus": 400,
  "robloxRawMessage": "12: Insufficient Robux funds."
}


Agent should:

Map Roblox messages → internal error codes like:

ROBLOX_GROUP_INVALID, ROBLOX_INSUFFICIENT_FUNDS,

ROBLOX_TOO_MANY_RECIPIENTS, ROBLOX_PAYOUT_RATE_LIMIT,

ROBLOX_2FA_REQUIRED, ROBLOX_FEATURE_DISABLED, etc.

3.2.2 Get payout health / restriction
GET /api/roblox/payout/health


Backend behavior:

Call Roblox:

GET /v1/groups/{groupId}/payout-restriction

Return simplified status:

{
  "groupId": 1234567,
  "canPayout": true,
  "rawRestriction": { "...": "..." }
}


Used for:

Admin dashboard / debug.

Monitoring.

3.2.3 (Optional) List payout config
GET /api/roblox/payout/config


Backend behavior:

Call Roblox:

GET /v1/groups/{groupId}/payouts

Return normalized structure for UI display.

4. Business Rules & Safety

Agent should enforce or keep in mind:

No direct Roblox API from untrusted clients

Only backend talks to groups.roblox.com.

Discord Bot, Web UI, etc. must call our backend.

Limits

Configurable min/max payout per transaction.

Optional daily/hourly budget for group payouts.

Optional per-user limit (e.g., max X Robux/day per robloxUserId).

Logging

Every payout attempt logged:

timestamp, robloxUserId, groupId, amount, status, errorCode, requestedBy, reason.

Useful for audits, disputes, and anti-abuse.

Idempotency

Consider using an idempotency key in our API:

Header Idempotency-Key: <uuid>

If same key is re-sent, do not execute payout twice.

Error handling

For 400 and 403 codes from Roblox, no retry (logical / permission errors).

For 503, allow limited retries with backoff.

Always surface human-readable reason in internal logs, but keep user-facing messages friendly and short.

5. Integration with Discord Bot (Example)

This section describes the intended interaction pattern between a Discord bot and the backend.

5.1 Flow for /payout command

User runs /payout <robloxUserId> <amount> in Discord.

Bot validates basic input (amount > 0 etc.).

Bot calls our backend:

POST /api/roblox/payout
Authorization: Bearer <BOT_BACKEND_TOKEN>
Body: {
  "robloxUserId": <from command>,
  "amount": <from command>,
  "payoutType": "FixedAmount",
  "reason": "Manual payout from Discord command",
  "requestedBy": "discord:<discordUserId>",
  "dryRun": false
}


Backend talks to Roblox and returns result.

Bot replies with an embed such as:

✅ Success: amount, user, tx id (if available).

❌ Failed: short error (e.g., “Insufficient group funds”, “Group payout is rate-limited, try again later”).

6. Agent To-Do / Code Generation Hints

When writing or modifying code, the Agent should:

Create a RobloxClient / RobloxGroupPayoutService with methods:

makeOneTimePayout(groupId, payload)

getGroupPayoutRestriction(groupId)

getGroupPayoutConfig(groupId)

Always read groupId and authentication secrets from environment or config files.

Centralize:

Error mapping from Roblox’s messages to our internal enums.

Logging and metrics (e.g., number of payouts, failure rate).

Target languages (depending on project):

Node.js (TypeScript) – using axios or node-fetch.

Python – using requests or httpx.

Java / Spring Boot – using WebClient / RestTemplate.

The Agent MUST keep the external API contract compatible with the Roblox Groups v1 documentation:

Host: https://groups.roblox.com

Paths:

GET /v1/groups/{groupId}/payout-restriction

GET /v1/groups/{groupId}/payouts

POST /v1/groups/{groupId}/payouts 