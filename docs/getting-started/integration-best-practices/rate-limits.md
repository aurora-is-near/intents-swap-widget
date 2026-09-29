---
icon: gauge-max
---

# Rate Limits

Aurora Intents API endpoints are rate-limited to keep the service responsive for every integrator. Limits are applied **per API key, per endpoint**. Exhausting the quota on one endpoint does not affect your calls to any other endpoint.

#### Limits

| Window     | Maximum requests |
| ---------- | ---------------- |
| 10 seconds | 100              |
| 1 hour     | 2000             |

Both windows are enforced simultaneously. Windows are fixed and aligned to the clock: the 10-second window resets every 10 seconds, and the hourly window resets at the top of each hour.

{% hint style="warning" %}
**Rejected requests count toward the hourly limit.** A request rejected due to the 10-second limit still counts as one of your 2000 hourly requests. A retry loop that ignores `Retry-After` can exhaust the hourly quota in minutes.
{% endhint %}

Each API key has its own counters. If you run several integrations, use a separate API key for each one so that one integration cannot exhaust the quota of another. See api-keys-and-fees.md.

#### What happens when you exceed a limit

The API responds with HTTP status **`429 Too Many Requests`** and a `Retry-After` header. The header value is the number of seconds until the window resets and your requests are accepted again. Because windows are aligned to the clock, this value is at most 10 seconds when you hit the 10-second limit, and up to a full hour (3600 seconds) when you hit the hourly limit.

```http
HTTP/2 429
Content-Type: application/json
Retry-After: 7

{
  "message": "Rate limit exceeded",
  "error": "Too Many Requests",
  "statusCode": 429
}
```

Rejected requests are not processed. A rejected quote request does not create a quote, and a rejected status request has no effect on the swap.

The `Retry-After` value counts down while the block is active. Requests you send during the block are rejected and do not extend it, so the first request after the countdown reaches zero is accepted.

#### Handling `429` in your integration

{% stepper %}
{% step %}
#### Honour `Retry-After`

Read the header and wait at least that many seconds before retrying. Do not retry in a tight loop. Every rejected retry is wasted and still counts toward your hourly quota.
{% endstep %}

{% step %}
#### Back off on repeated failures

If a retry is rejected again, double the wait and add a small random delay so that many clients do not retry at the same moment.
{% endstep %}

{% step %}
#### Cache the token list

The supported tokens list changes rarely. Fetch it once at startup and refresh it every few minutes rather than on every user action.
{% endstep %}

{% step %}
#### Poll status at a sensible interval

When waiting for a swap to settle, poll get-swap-status.md every 5 to 10 seconds. Polling faster does not speed up settlement. One swap polled every second uses 3,600 requests per hour, almost twice the hourly quota, on its own.
{% endstep %}

{% step %}
#### Request quotes on user intent, not on every keystroke

Debounce amount inputs on your side so that a quote is requested once the user has finished typing. If you refresh quotes automatically, keep the interval at 10 seconds or more.
{% endstep %}
{% endstepper %}

**Example: a fetch wrapper that respects `Retry-After`**

```javascript
async function fetchWithRetry(url, options = {}, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await fetch(url, options);

    if (res.status !== 429 || attempt === maxAttempts) {
      return res;
    }

    const retryAfter = Number(res.headers.get('Retry-After')) || 1;
    const jitter = Math.random() * 500;
    await new Promise((r) => setTimeout(r, retryAfter * 1000 + jitter));
  }
}

const res = await fetchWithRetry(
  `https://intents-api.aurora.dev/api/quote/${API_KEY}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(quoteRequest),
  },
);
```

#### Need a higher limit?

If your integration needs more than the default quota, reach out through [contact](emailto:contact@aurora.dev) with your API key and expected request volume.
