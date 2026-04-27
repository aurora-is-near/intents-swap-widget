---
icon: gear-complex-api
---

# API integration

Intents API allows you to perform cross-chain deposits across all [supported-chains-and-assets.md](../supported-chains-and-assets.md "mention").

You'll need to reference supported assets by their IDs, then request a quote that generates a deposited address to which the requested funds need to be transferred. After that, the swap will be processed, and the destination asset will land in the recipient's account.

{% hint style="info" %}
You need to [create an API key](../../swap-widget/api-keys-and-fees.md) to interact with the API.
{% endhint %}

{% stepper %}
{% step %}
### Get supported tokens

Use [get-supported-tokens.md](../api-reference/get-supported-tokens.md "mention") to find the `assetId` values you will need.

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

<details>

<summary>Explanation</summary>

The response includes tokens with their `assetId` in this format:

* NEAR tokens: `nep141:wrap.near`
* Bridged tokens: `nep141:eth-0xdac17f958d2ee523a2206206994597c13d831ec7.omft.near`

```json
[
  {
    "assetId": "nep141:wrap.near",
    "decimals": 24,
    "blockchain": "near",
    "symbol": "wNEAR",
    "price": 1.1,
    "priceUpdatedAt": "2026-02-27T15:18:30.437Z",
    "contractAddress": "wrap.near"
  },
  {
    "assetId": "nep141:eth.omft.near",
    "decimals": 18,
    "blockchain": "eth",
    "symbol": "ETH",
    "price": 1947.28,
    "priceUpdatedAt": "2026-02-27T15:25:30.527Z",
    "contractAddress": null
  },
  {
    "assetId": "nep141:btc.omft.near",
    "decimals": 8,
    "blockchain": "btc",
    "symbol": "BTC",
    "price": 66093,
    "priceUpdatedAt": "2026-02-27T15:25:30.527Z",
    "contractAddress": null
  }
]
```

</details>
{% endstep %}

{% step %}
### Request a quote

Use [request-a-quote.md](../api-reference/request-a-quote.md "mention") with your desired parameters

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

<details>

<summary>Key parameters</summary>

| Parameter           | Description                                                                          |
| ------------------- | ------------------------------------------------------------------------------------ |
| `dry`               | `true` to validate parameters and **get a quote without executing the swap**         |
| `swapType`          | `EXACT_INPUT` (specify input amount) or `EXACT_OUTPUT` (specify output amount)       |
| `slippageTolerance` | Maximum acceptable slippage in basis points (100 = 1%)                               |
| `originAsset`       | Source token `assetId` from the tokens endpoint                                      |
| `depositType`       | `ORIGIN_CHAIN` (deposit on source chain) or `INTENTS` (already in Verifier contract) |
| `destinationAsset`  | Target token `assetId` from the tokens endpoint                                      |
| `amount`            | Amount in smallest unit (wei, yoctoNEAR, etc.)                                       |
| `recipient`         | Address to receive swapped tokens                                                    |
| `recipientType`     | `DESTINATION_CHAIN` (native address) or `INTENTS` (NEAR Intents account)             |
| `refundTo`          | Address for refunds if swap fails                                                    |
| `refundType`        | `ORIGIN_CHAIN` or `INTENTS`                                                          |
| `deadline`          | Quote expiration timestamp in ISO format                                             |

</details>
{% endstep %}

{% step %}
### Send tokens

Transfer tokens to  `depositAddress` from the quote response. The swap will be processed automatically upon deposit.

Save the deposit address and your transaction hash for tracking.
{% endstep %}

{% step %}
### Monitor the swap

Use [get-transactions-history.md](../api-reference/get-transactions-history.md "mention") for your account to monitor the status of the swap.

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

<details>

<summary>Example response</summary>

```json
{
    "data": [
        {
            "originAsset": "nep141:wrap.near",
            "destinationAsset": "nep141:sol-0xaad74c68eecfc9f8c5bdcea614f6167048c795ef.omdep.near",
            "depositAddress": "42518b0fae0ba57ab1c671d05f0f27b78a9f9393850def062dea189299103930",
            "depositMemo": null,
            "depositAddressAndMemo": "42518b0fae0ba57ab1c671d05f0f27b78a9f9393850def062dea189299103930",
            "recipient": "your-account.near",
            "status": "SUCCESS",
            "createdAt": "2026-04-08T15:29:12.274Z",
            "createdAtTimestamp": 1775662152,
            "intentHashes": "3GvvNb1ujKyZzfBYigzNykJsWuHUu1BHftpR6xfYMkX4",
            "referral": "aurora-widget-widget-studio-user",
            "amountInFormatted": "2.0",
            "amountOutFormatted": "406.722426",
            "appFees": [
                {
                    "fee": 20,
                    "recipient": "widget_collect.sputnik-dao.near"
                }
            ],
            "nearTxHashes": [
                "224p1YPQaBicpGXj2Gz2PthGDaXukNzhGAGkGLen26ze",
                "2mJ9Yid2fvCubFY1QLBxUGc28mzfrjFXAJWVUvhtZ7cB"
            ],
            "originChainTxHashes": [],
            "destinationChainTxHashes": [],
            "amountIn": "2000000000000000000000000",
            "amountInUsd": "2.7000",
            "amountOut": "407031063",
            "amountOutUsd": "2.6869",
            "refundTo": "your-account.near",
            "senders": [],
            "refundReason": null,
            "refundFeeFormatted": "0",
            "refundFee": "0"
        },
    ]
}
```

</details>

<details>

<summary>Status response</summary>

| Status               | Description                                   |
| -------------------- | --------------------------------------------- |
| `PENDING_DEPOSIT`    | Awaiting your token deposit                   |
| `KNOWN_DEPOSIT_TX`   | Deposit transaction detected                  |
| `PROCESSING`         | Swap being executed                           |
| `SUCCESS`            | Tokens delivered to destination address       |
| `INCOMPLETE_DEPOSIT` | Deposit below required amount                 |
| `REFUNDED`           | Swap failed, funds returned to refund address |
| `FAILED`             | Swap encountered an error                     |

</details>
{% endstep %}
{% endstepper %}

