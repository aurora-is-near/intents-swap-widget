---
icon: gear-complex-code
---

# Deposit into Aave from Solana

{% hint style="warning" %}
**Pre-release** — The Intents Connect API is currently in development. If you're interested in early access, get in touch with the team.
{% endhint %}

Below is an example flow depositing into Aave using a Solana wallet using the Intents Connect API.

You'll need to reference supported assets by their IDs, then run a dry execution to get the estimated output amount, and estimate costs for the destination chain action, signing the intent (deposit to Aave), and the transfer transaction to move SOL from the Solana wallet. As a result, you'll have deposited Aave into an intermediary account associated with your Solana wallet.

{% hint style="info" %}
You need to [create an API key](../../swap-widget/api-keys-and-fees.md) to interact with the API.
{% endhint %}

{% stepper %}
{% step %}
### Get supported tokens

Use [get-supported-tokens.md](../../intents-deposits/api-reference/get-supported-tokens.md "mention") to find the `assetId` values you will need. You'll need to use Intents API for that.

{% tabs %}
{% tab title="JavaScript" %}
```javascript
const response = await fetch(`https://intents-api.aurora.dev/api/tokens/${appKey}`);
const tokens = await response.json();
```
{% endtab %}
{% endtabs %}

<details>

<summary>Response explanation</summary>

The response includes tokens with their `assetId` in this format:

* SOL tokens: `nep141:sol.omft.near`
* USDC on Base: `nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near`

```json
[
  {
    "assetId": "nep141:sol.omft.near",
    "decimals": 9,
    "blockchain": "sol",
    "symbol": "SOL",
    "price": 84.79,
    "priceUpdatedAt": "2026-04-23T17:44:00.452Z"
  },
  {
    "assetId": "nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near",
    "decimals": 6,
    "blockchain": "base",
    "symbol": "USDC",
    "price": 0.999706,
    "priceUpdatedAt": "2026-04-23T17:44:00.452Z",
    "contractAddress": "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913"
  }
]
```

</details>
{% endstep %}

{% step %}
### Get the estimated output amount

Use [request-an-execution.md](../intents-connect-api-reference/request-an-execution.md "mention") with `dry: true` to get an estimated output amount

{% tabs %}
{% tab title="JavaScript" %}
<pre class="language-javascript"><code class="lang-javascript">const quote = await fetch(`https://intents-connect-api.aurora.dev/api/v1/executions/${solanaWalletAccount}`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    "dry": true,
    "metadata": {
      "intent": "aave_supply",
      "title": "Supply to Aave"
    },
    "quote": {
      "amount": "3000000",
      "destinationAsset": "nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near",
      "originAsset": "nep141:sol.omft.near",
      "slippageTolerance": 100
<strong>    },
</strong>    "steps": [],
    "type": "evm"
  })
});
const result = await quote.json();
</code></pre>
{% endtab %}
{% endtabs %}

<details>

<summary>Request data explanation</summary>

* `dry` is used to get a quote estimate
* `metadata` contains information displayed in the UI - it's optional
* `quote`
  * `amount` contains the input amount used for the action
  * `destinationAsset` assetId used for the action on the destination chain
  * `originChain` assetId deposited into the deposit account
  * `slippageTolerance` value is basis points, so 100 is 1%
* `steps` not used in the initial dry run
* `type` type of the action

</details>

<details>

<summary>Example response</summary>

The response includes information useful to the frontend, as well as a quote to be used in the second request.

```json
{
    "result": {
        "createdAt": "2026-04-23T17:39:30Z",
        "details": {
            "estimatedTime": "22",
            "intermediaryAddress": "0xFe6EF968D2F7B2e9CCCF92150d96c930C3CC4a4E",
            "networkFee": "1782",
            "serviceFee": "0"
        },
        "metadata": {
            "title": "Supply to Aave",
            "intent": "aave_supply"
        },
        "quote": {
            "amount": "3000000",
            "amountIn": "3000000",
            "amountInUsd": "0.2553",
            "amountOut": "247838",
            "amountOutUsd": "0.2496",
            "deadline": "2026-04-23T17:49:27Z",
            "destinationAsset": "nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near",
            "minAmountOut": "245341",
            "originAsset": "nep141:sol.omft.near",
            "recipient": "0xFe6EF968D2F7B2e9CCCF92150d96c930C3CC4a4E"
        },
        "status": "CREATED",
        "steps": [],
        "type": "evm"
    }
}
```

</details>
{% endstep %}

{% step %}
### Populate the steps with the output amount

Use [request-an-execution.md](../intents-connect-api-reference/request-an-execution.md "mention") with `dry: false` to get actual execution details. Include steps this time.

{% tabs %}
{% tab title="JavaScript" %}
```javascript
const quote = await fetch(`https://intents-connect-api.aurora.dev/api/v1/executions/${solanaWalletAccount}`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    "dry": false,
    "metadata": {
      "intent": "aave_supply",
      "title": "Supply to Aave"
    },
    "quote": {
      "amount": "3000000",
      "destinationAsset": "nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near",
      "originAsset": "nep141:sol.omft.near",
      "slippageTolerance": 100
    },
    "steps": [
      {
        "functionSignature": "approve(address,uint256)",
        "parameters": [
          "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5",
          "245341"
        ],
        "to": "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
        "value": "0"
      },
      {
        "functionSignature": "supply(address,uint256,address,uint16)",
        "parameters": [
          "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
          "245341",
          "0xFe6EF968D2F7B2e9CCCF92150d96c930C3CC4a4E",
          "0"
        ],
        "to": "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5",
        "value": "0"
      }
    ],
    "type": "evm"
  })
});
const result = await quote.json();
```
{% endtab %}
{% endtabs %}

<details>

<summary>Request data explanation</summary>

* `dry` is not true anymore, because we're sending an actual request
* `steps` are now used, and this is how we defined an action on the destination chain
  * `functionSignature` [function signature](https://docs.soliditylang.org/en/latest/contracts.html#function-signatures-and-selectors-in-libraries) to be called on the EVM chain
  * `parameters` arguments to be passed to the function
  * `to` contact to interact with
  * `value` native value - in case a native token needs to be used

</details>

<details>

<summary>Example response</summary>

| Field                          | Description                                                                                                                                  |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `details.payload.payload_json` | Message to be signed by the wallet                                                                                                           |
| `id`                           | Identifier of the execution, needed for tracking                                                                                             |
| `quote.depositAddress`         | Deposit account to which the transfer needs to be done                                                                                       |
| `status`                       | Status of the transaction, used for understanding the lifecycle of the execution                                                             |
| `steps`                        | Updated steps were built based on the user's signed input steps. The additional transfer added to the array is used to reimburse the gas fee |

<pre class="language-json"><code class="lang-json"><strong>{
</strong>    "result": {
        "createdAt": "2026-04-23T18:03:10Z",
        "details": {
            "estimatedTime": "22",
            "intermediaryAddress": "0xFe6EF968D2F7B2e9CCCF92150d96c930C3CC4a4E",
            "messageToSign": "...",
            "networkFee": "6709",
            "payload": {
                "payload_bytes_base64": "...",
                "payload_json": "...",
                "standard": "raw_ed25519"
            },
            "serviceFee": "0",
            "signingStandard": "raw_ed25519"
        },
        "id": "4a4c4312-d887-4d35-962a-b70ee11dbfe9",
        "metadata": {
            "title": "Supply to Aave",
            "intent": "aave_supply"
        },
        "quote": {
            "amount": "3000000",
            "amountIn": "3000000",
            "amountInUsd": "0.2561",
            "amountOut": "244626",
            "amountOutUsd": "0.2513",
            "deadline": "2026-04-23T18:13:07Z",
            "depositAddress": "GihMearJBmF4J8WHBimyARHuUoGbfBiP1YMmCZXqAcVm",
            "destinationAsset": "nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near",
            "minAmountOut": "242112",
            "originAsset": "nep141:sol.omft.near",
            "recipient": "0xFe6EF968D2F7B2e9CCCF92150d96c930C3CC4a4E"
        },
        "status": "CREATED",
        "steps": [
            {
                "to": "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
                "functionSignature": "approve(address,uint256)",
                "parameters": [
                    "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5",
                    "240613"
                ],
                "value": "0"
            },
            {
                "to": "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5",
                "functionSignature": "supply(address,uint256,address,uint16)",
                "parameters": [
                    "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
                    "240613",
                    "0xFe6EF968D2F7B2e9CCCF92150d96c930C3CC4a4E",
                    "0"
                ],
                "value": "0"
            },
            {
                "to": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                "functionSignature": "transfer(address,uint256)",
                "parameters": [
                    "0x546252c9a0E974f75892b4c54b7a67B69a0aFf45",
                    "6709"
                ],
                "value": "0",
                "metadata": {
                    "name": "Fee Transfer",
                    "description": "Gas fee reimbursement"
                }
            }
        ],
        "type": "evm"
    }
}
</code></pre>

</details>
{% endstep %}

{% step %}
### Sign the message

`details.payload.payload_json` needs to be signed by the Solana wallet so it can be submitted in the next step.
{% endstep %}

{% step %}
### Submit the digest

Use [submit-digest.md](../intents-connect-api-reference/submit-digest.md "mention") to submit the signed message. This will allow executing batched transactions on the destination chain.

{% tabs %}
{% tab title="JavaScript" %}
```javascript
const quote = await fetch(`https://intents-connect-api.aurora.dev/api/v1/executions/${solanaWalletAccount}/submit`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    "executionId": "92a10832-d36b-46c6-807d-7f28469c2a94",
    "publicKey": "ed25519:BTKcXNp1wSzs9Mp2ejsPrHLr59z5UkEDJgqcWyXGhGc4",
    "signature": "ed25519:5VUXRtVgS6bq3Wn64YdCt5NSPfA1Ni5zqiLFsSScyq6Dj53pbNEcwKcp7t1aRqw8zWCoN7coMLBUmatmwLAEvndP"
  })
});
const result = await quote.json();
```
{% endtab %}
{% endtabs %}

<details>

<summary>Request data explanation</summary>

* `executionId` ID of the execution
* `publicKey` public key of the wallet
* `signature` signed message signature

</details>

<details>

<summary>Example response</summary>

```json
{
  "result": {
    "status": "SIGNED_PENDING_DEPOSIT"
  }
}
```

</details>
{% endstep %}

{% step %}
### Deposit into the deposit account

Now, deposit exactly `quote.amount` into `quote.depositAddress` so the swap can execute.
{% endstep %}

{% step %}
### Monitor the status of the execution

Use [fetch-executions.md](../intents-connect-api-reference/fetch-executions.md "mention") using `id` of the execution

{% tabs %}
{% tab title="JavaScript" %}
```javascript
const response = await fetch(`https://intents-connect-api.aurora.dev/api/v1/executions/BTKcXNp1wSzs9Mp2ejsPrHLr59z5UkEDJgqcWyXGhGc4?id=92a10832-d36b-46c6-807d-7f28469c2a94`);
const tokens = await response.json();
```
{% endtab %}
{% endtabs %}

<details>

<summary>Response explanation</summary>

The response will contain the entire execution object, but look out for `status` the field that indicates the lifecycle of the execution. `SUCCESS` means the execution is fully processed.

</details>
{% endstep %}
{% endstepper %}

