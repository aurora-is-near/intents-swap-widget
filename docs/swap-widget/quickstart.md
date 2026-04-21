---
icon: forward-fast
---

# Quickstart

The **Intents Swap Widget** lets you integrate a fully functional, cross-chain swap interface into your application in just a few lines of code.

<figure><img src="../.gitbook/assets/swap-widget-2.png" alt=""><figcaption></figcaption></figure>

1. First, create an account and an [API key](api-keys-and-fees.md) for your integration, and decide on the fee structures.
2. Then, decide on the integration path. You can use our battle-tested widget or integrate directly with the API.

### <i class="fa-box">:box:</i> Widget integration path

You can embed the widget directly into your app using an **iframe** or a **React component**.

{% stepper %}
{% step %}
### Configure the Swap Widget

Navigate to [Widget Studio](https://intents.aurora.dev/), log in with your email and configure the widget using the self-explanatory interface. You can configure settings such as displayed Networks, Tokens, and how the Wallet Connection is handled.

You can also customise the design to match your branding with different Styles, Accents, or Layouts. Reach out to our team for more advanced styling options.
{% endstep %}

{% step %}
### Embed the widget

Click the **Embed in your app** button on the top right of the interface, either through:

* An iframe by using **Generate a new link to embed** section
* Or React component using **Use React code snippet**
{% endstep %}

{% step %}
### (Optional) Use advanced settings of the widget

If you decide to embed a React component, you can use more advanced settings, such as your own wallet connection or use widget hooks. Check the detailed docs on the [Widget Configuration](readme-1-1/).
{% endstep %}
{% endstepper %}

### <i class="fa-gear-api">:gear-api:</i> API integration path

If you don't need to use the widget but just want to integrate with the API, you can use the Swap API directly.

{% stepper %}
{% step %}
### Get supported tokens

[Get supported tokens](../deposit-addresses/swap-api-reference/get-supported-tokens.md) to find the `assetId` values you will need.

{% tabs %}
{% tab title="cURL" %}
```sh
curl "https://intents-api.aurora.dev/api/tokens/${appKey}"
```
{% endtab %}

{% tab title="JavaScript" %}
```javascript
const response = await fetch(`https://intents-api.aurora.dev/api/tokens/${appKey}`);
const tokens = await response.json();
```
{% endtab %}
{% endtabs %}
{% endstep %}

{% step %}
### Request a quote

[Request a quote](../deposit-addresses/swap-api-reference/request-a-quote.md) with your desired parameters

{% tabs %}
{% tab title="cURL" %}
```sh
curl -X POST "https://intents-api.aurora.dev/api/tokens/${appKey}" \
  -H "Content-Type: application/json" \
  -d '{
    "dry": false,
    "swapType": "EXACT_INPUT",
    "slippageTolerance": 100,
    "originAsset": "nep141:wrap.near",
    "depositType": "ORIGIN_CHAIN",
    "destinationAsset": "nep141:arb-0x912ce59144191c1204e64559fe8253a0e49e6548.omft.near",
    "amount": "100000000000000000000000",
    "recipient": "0xYourArbitrumAddress",
    "recipientType": "DESTINATION_CHAIN",
    "refundTo": "your-account.near",
    "refundType": "ORIGIN_CHAIN",
    "deadline": "2025-01-01T00:00:00.000Z"
  }'
```
{% endtab %}

{% tab title="JavaScript" %}
```javascript
const quote = await fetch(`https://intents-api.aurora.dev/api/tokens/${appKey}`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    dry: false,
    swapType: 'EXACT_INPUT',
    slippageTolerance: 100,
    originAsset: 'nep141:wrap.near',
    depositType: 'ORIGIN_CHAIN',
    destinationAsset: 'nep141:arb-0x912ce59144191c1204e64559fe8253a0e49e6548.omft.near',
    amount: '100000000000000000000000',
    recipient: '0xYourArbitrumAddress',
    recipientType: 'DESTINATION_CHAIN',
    refundTo: 'your-account.near',
    refundType: 'ORIGIN_CHAIN',
    deadline: new Date(Date.now() + 3 * 60 * 1000).toISOString()
  })
});
const result = await quote.json();
```
{% endtab %}
{% endtabs %}
{% endstep %}

{% step %}
### Send tokens

Transfer tokens to  `depositAddress` from the quote response. The swap will be processed automatically upon deposit.
{% endstep %}

{% step %}
### Monitor the swap

[Get transaction history](../deposit-addresses/swap-api-reference/get-transactions-history.md) for your account to monitor the status of the swap.

{% tabs %}
{% tab title="cURL" %}
```sh
curl "https://intents-api.aurora.dev/api/transactions/${appKey}?walletAddress=${walletAddress}"
```
{% endtab %}

{% tab title="JavaScript" %}
```javascript
const response = await fetch(`https://intents-api.aurora.dev/api/transactions/${appKey}`);
const tokens = await response.json();
```
{% endtab %}
{% endtabs %}
{% endstep %}
{% endstepper %}

