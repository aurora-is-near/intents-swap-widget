---
icon: eye-slash
---

# Confidential Swaps

Confidential Swaps route your swap through a private shard of NEAR. The origin wallet and the routing trail are hidden from the outside world. The destination transaction settles publicly as normal.

There is no separate API and no new integration. If you have already called the [swap-api-reference](../api-reference/swap-api-reference/ "mention"), you enable confidentiality by enabling confidentiality mode in the quote request.

{% hint style="info" %}
Confidentiality covers only the origin of the assets. See [confidential-intents.md](../confidential-intents.md "mention") for the full scope.
{% endhint %}

{% stepper %}
{% step %}
### **Get your API key**

Navigate to [Widget Studio](https://studio.aurora.dev/) and generate an API key. Confidential Swaps use the same key as your standard swaps.
{% endstep %}

{% step %}
### **Request a confidential quote**

Call the quote endpoint exactly as you do today, then add `confidentiality: "advanced"` to the request body. Everything else stays the same.

```bash
curl -X POST https://intents-api.aurora.dev/api/quote/{$YOUR_API_KEY} \
  -H "Content-Type: application/json" \
  -d '{
    "dry": false,
    "confidentiality": "advanced",
    "swapType": "EXACT_INPUT",
    "amount": "1000000",
    "originAsset": "<originAssetId>",
    "destinationAsset": "<destinationAssetId>",
    "depositType": "ORIGIN_CHAIN",
    "recipient": "<recipientAddress>",
    "recipientType": "DESTINATION_CHAIN",
    "refundTo": "<refundAddress>",
    "refundType": "ORIGIN_CHAIN",
    "slippageTolerance": 100,
    "deadline": "2026-07-06T12:00:00.000Z"
  }'
```

Or in JavaScript:

{% hint style="info" %}
Fetch `originAsset` and `destinationAsset` IDs from [get-supported-tokens.md](../api-reference/swap-api-reference/get-supported-tokens.md "mention"). Never construct them manually.
{% endhint %}

```javascript
const res = await fetch(
  `https://intents-api.aurora.dev/api/quote/${API_KEY}`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      dry: false,
      confidentiality: "advanced",
      swapType: "EXACT_INPUT",
      amount: "1000000",
      originAsset: originAssetId,
      destinationAsset: destinationAssetId,
      depositType: "ORIGIN_CHAIN",
      recipient: recipientAddress,
      recipientType: "DESTINATION_CHAIN",
      refundTo: refundAddress,
      refundType: "ORIGIN_CHAIN",
      slippageTolerance: 100,
      deadline: new Date(Date.now() + 10 * 60_000).toISOString(),
    }),
  }
);

const { quote } = await res.json();
// quote.depositAddress is the confidential deposit address
```
{% endstep %}

{% step %}
### **Deposit and complete the swap**

The response returns a `depositAddress` as usual. Send the origin asset to that address, then poll for status with [get-swap-status.md](../api-reference/swap-api-reference/get-swap-status.md "mention"). The flow is identical to a standard swap.

```javascript
// Notify the API after depositing to speed up processing
await fetch(`https://intents-api.aurora.dev/api/status/${API_KEY}?depositAddress=0x76b4c56085ED136a8744D52bE956396624a730E8`, {
  method: "GET",
});

// Poll until terminal: SUCCESS, FAILED, REFUNDED
```

**That is it**

The only difference from a standard swap is the `confidentiality` mode. Deposit addresses, status polling, refunds, and your configured fees all behave exactly as they do today.
{% endstep %}

{% step %}
### (Optional) Read Confidential Intents balance

Use [authenticate-user-with-signed-data.md](../api-reference/confidential-swaps-api-reference/authenticate-user-with-signed-data.md "mention") to authenticate your account and read your balance using [get-user-token-balances.md](../api-reference/confidential-swaps-api-reference/get-user-token-balances.md "mention").

{% hint style="info" %}
This is related only to your Confidential Intents balances, a private layer of NEAR Intents.
{% endhint %}
{% endstep %}
{% endstepper %}
