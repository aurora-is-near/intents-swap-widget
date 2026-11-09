---
icon: road-circle-exclamation
---

# Handling Incidents

{% hint style="info" %}
You can see ongoing incidents under the [Incidents](https://portal.intents.aurora.dev/incidents) page in [client-portal.md](../client-portal.md "mention").
{% endhint %}

NEAR Intents Shield pauses affected deposits, withdrawals, or both when an incident is reported on a supported chain or asset. Swaps that route through the affected operation can also become unavailable until the incident is resolved. This guide explains how to use the ongoing incidents endpoint and reflect its state in a swap UI.

{% stepper %}
{% step %}
#### Fetch ongoing incidents

Call `GET /api/incidents/{apiKey}` when the swap UI loads, refresh it periodically while the UI is open, and check again before requesting a quote or presenting deposit instructions. Use the same API key as the rest of your Swap API integration.

```http
GET https://intents-api.aurora.dev/api/incidents/{apiKey}
```

The response contains the current Shield availability state and any **maintenance windows in progress**:

* `status: "operational"` means there are no active incidents in this response. Check `maintenance` separately; maintenance can still be in progress.
* `status: "incidents"` means `incidents` contains the current active incidents.
* `maintenance` contains maintenance windows that are **currently in progress**, or an empty array. It is not a calendar of future maintenance.

See [get-ongoing-incidents.md](../../api-reference/swap-api-reference/get-ongoing-incidents.md "mention") for the endpoint reference.
{% endstep %}

{% step %}
#### Determine which swaps are affected

Each incident identifies the affected scope and direction:

| Field               | Meaning                                                                                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `scopeType`         | Type of affected resource, such as `chain` or `token`.                                                                                                       |
| `scopeValue`        | Chain identifier (for example, `aleo` or `stellar`) or full token/asset ID. Match against canonical identifiers, not display names.                          |
| `direction`         | `deposit` for incoming funds, `withdraw` for outgoing funds, or `*` for both. If missing or unknown, treat the affected scope as unavailable until verified. |
| `publicDescription` | Optional user-facing explanation. It can be `null`.                                                                                                          |

For a swap, the **origin** chain/asset uses the deposit direction and the **destination** chain/asset uses the withdraw direction. A `*` incident affects both. Also account for known intermediate routes when your integration exposes them; a swap may be blocked by Shield even when its visible origin and destination do not match an incident.

Use the actual asset IDs from `GET /api/tokens/{apiKey}` and your supported-chain mapping. Do not infer a chain solely by splitting a NEP-141 asset ID.
{% endstep %}

{% step %}
#### Update the swap interface

Prevent users from starting newly affected swaps, while keeping unaffected routes available:

* Mark affected chains and assets as temporarily unavailable in selectors, or disable affected deposit/withdrawal choices as appropriate.
* Disable **Get quote** or **Continue** for a blocked pair and show a clear explanation: **"Swaps involving this chain or asset are temporarily unavailable."**
* If only one direction is affected, do not automatically disable the opposite direction. For example, a Stellar `deposit` incident blocks swaps **from** Stellar, not necessarily swaps **to** Stellar.
* Show active incidents in a visible status section. Include the affected chain/asset, affected direction, optional `publicDescription`, and opened time when supplied.
* If the API returns an active token incident, apply it to that token even if the main incident list visually emphasises chains. Do not silently omit token-specific restrictions.

Recheck availability when the user changes assets or chains and immediately before creating a new quote. A UI check is advisory; handle quote API rejections as the authoritative result for the requested route.
{% endstep %}

{% step %}
#### Keep existing swaps and incident state updated

Continue polling `GET /api/status/{apiKey}?depositAddress=...` for swaps that already have a deposit address or have received funds. An incident does **not** by itself mean a swap has failed or been refunded. Keep showing the actual swap status until the Swap API reports a terminal state.

Refresh the incidents endpoint after the user returns to the UI and during an active session. When an incident disappears from a successful, fresh response, re-enable its previously blocked options only if no other incident or maintenance window still applies; request a fresh quote rather than reusing an expired one.

If the incidents request fails, do not interpret the error as `operational`. Show **"Availability could not be verified"**, retain the last known warning where appropriate, and retry. As a conservative integration policy, avoid starting a new swap if you cannot verify whether its route is available.
{% endstep %}
{% endstepper %}

### Example API response

This example is based on an observed response. The API's published schema guarantees the scope fields but permits additional incident metadata, so handle fields such as `id` and `createdAt` as optional.

```json
{
  "status": "incidents",
  "incidents": [
    {
      "scopeType": "chain",
      "scopeValue": "aleo",
      "direction": "*",
      "publicDescription": null,
      "id": "bcf64b91-a2db-402d-b63d-4746eefa3970",
      "status": "active",
      "createdAt": "2026-11-09T17:56:09.915Z"
    },
    {
      "scopeType": "chain",
      "scopeValue": "stellar",
      "direction": "deposit",
      "publicDescription": null,
      "id": "f3258a84-8547-4dd2-9b5c-982304397620",
      "status": "active",
      "createdAt": "2026-11-05T21:26:44.638Z"
    },
    {
      "scopeType": "token",
      "scopeValue": "nep141:sol-0x4629c2e57ccb57f0a21e04f5b5449ef251932cec.omdep.near",
      "direction": "*",
      "publicDescription": null,
      "id": "272f0bb0-6a3a-4734-82fe-24e58e62a527",
      "status": "active",
      "createdAt": "2026-09-11T17:56:17.855Z"
    }
  ],
  "maintenance": []
}
```

The actual response may include other incident fields such as `description`, `resolveDescription`, `resolvedBy`, `metadata`, `updatedAt`, and `resolvedAt`. Do **not** display internal `description` or other internal metadata as a public explanation; use `publicDescription` when available.

### UI behaviour for this response

| Active incident          | Effect on new swaps                                                                                 | Example UI treatment                                 |
| ------------------------ | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Aleo chain, `*`          | Block deposits **from** Aleo and withdrawals **to** Aleo.                                           | **Aleo · Deposits and withdrawals paused**           |
| Stellar chain, `deposit` | Block deposits **from** Stellar. Withdrawals **to** Stellar are not blocked by this incident alone. | **Stellar · Deposits paused**                        |
| Specific token, `*`      | Block swaps that deposit or withdraw the exact affected token.                                      | **Affected token · Deposits and withdrawals paused** |

For an **Ongoing Incidents** section, render one entry per incident (including token-level entries), with a readable chain/asset name and **Opened** time if `createdAt` is available. Convert ISO timestamps to the user's local timezone. If `publicDescription` is `null`, use a generic message; do not show an empty description or invent a cause or resolution time.

When `incidents` is empty (or `status` is `operational`), show an operational state for incidents. A fresh `maintenance: []` means **no maintenance currently in progress**. It does _not_ establish that no maintenance is scheduled for the future, so avoid the label **"No scheduled maintenance"** unless you have another schedule source.

### Maintenance windows

Maintenance uses the same availability concept but is returned separately in `maintenance`. Each active window includes:

* `name` and `description`: public-facing maintenance information.
* `scopes`: one or more `{ "scopeType": "chain", "scopeValue": "..." }`-style targets. A `scopeValue` of `*` represents all resources in that scope.
* `direction`: `deposit`, `withdraw`, or `*`.
* `startsAt` and `finishesAt`: ISO 8601 window timestamps.

Apply the same origin/deposit and destination/withdraw matching to maintenance scopes, combine maintenance restrictions with active incidents, and use `startsAt` and `finishesAt` only for maintenance messaging. Display dates in the user's local timezone. The endpoint only returns windows **in progress**; do not use it to build an upcoming-maintenance schedule.

### Error handling

The endpoint documents `200` for a successful response, `400` for a Shield API error, `401` for an invalid or expired API key, and `500` when the Shield Incident API cannot be reached. An unsuccessful response does **not** prove an incident has ended. Do not re-enable a blocked route solely because polling failed.

Before executing a swap, also follow the normal [swap-lifecycle.md](../../intents-swap/swap-lifecycle.md "mention"): request a fresh quote, track the swap by its deposit address, and rely on the status endpoint for success, failure, and refunds.
