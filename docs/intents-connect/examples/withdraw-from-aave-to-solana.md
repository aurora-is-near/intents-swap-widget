---
icon: gear-complex-code
---

# Withdraw from Aave to Solana

{% hint style="warning" %}
**Pre-release** — The Intents Connect API is currently in development. If you're interested in early access, get in touch with the team.
{% endhint %}

Below is an example flow withdrawing from Aave using a Solana wallet using the Intents Connect API.

You'll need to run a dry execution to get the estimated output amount, estimate costs for the destination chain action, and sign the intent (withdraw from Aave). As a result, you'll withdraw from Aave into your Solana wallet.

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
```javascript
const quote = await fetch(`https://intents-connect-api.aurora.dev/api/v1/executions/${solanaWalletAccount}`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    "dry": true,
    "metadata": {
      "intent": "aave_withdraw",
      "title": "Withdraw from Aave"
    },
    "outOperation": true,
    "quote": {
      "amount": "282174",
      "destinationAsset": "nep141:sol.omft.near",
      "originAsset": "nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near",
      "slippageTolerance": 100
    },
    "steps": [
      {
        "functionSignature": "withdraw(address,uint256,address)",
        "parameters": [
          "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
          "282174",
          "0xFe6EF968D2F7B2e9CCCF92150d96c930C3CC4a4E"
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

* `dry` is used to get a quote estimate
* `metadata` contains information displayed in the UI - it's optional
* `outOperation` means that it's out operations and does not require a deposit
* `quote`
  * `amount` contains the input amount used for the action
  * `destinationAsset` assetId used for the action on the destination chain
  * `originChain` assetId deposited into the deposit account
  * `slippageTolerance` value is basis points, so 100 is 1%
* `steps` are now used, and this is how we defined an action on the destination chain
  * `functionSignature` [function signature](https://docs.soliditylang.org/en/latest/contracts.html#function-signatures-and-selectors-in-libraries) to be called on the EVM chain
  * `parameters` arguments to be passed to the function
  * `to` contact to interact with
  * `value` native value - in case a native token needs to be used
* `type` type of the action

</details>

<details>

<summary>Example response</summary>

The response includes information useful to the frontend and a quote for the second request.

```json
{
    "result": {
        "createdAt": "2026-04-23T18:43:35Z",
        "details": {
            "estimatedTime": "32",
            "intermediaryAddress": "0xFe6EF968D2F7B2e9CCCF92150d96c930C3CC4a4E",
            "networkFee": "5948",
            "serviceFee": "0"
        },
        "metadata": {
            "title": "Withdraw from Aave",
            "intent": "aave_withdraw"
        },
        "quote": {
            "amount": "282174",
            "amountIn": "276226",
            "amountInUsd": "0.2762",
            "amountOut": "3177528",
            "amountOutUsd": "0.2719",
            "deadline": "2026-04-23T18:53:31Z",
            "depositAddress": "0xf9a3a3f6A7d0C235eFc35F1978E3F53c264eeE45",
            "destinationAsset": "nep141:sol.omft.near",
            "minAmountOut": "3145752",
            "originAsset": "nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near",
            "recipient": "BTKcXNp1wSzs9Mp2ejsPrHLr59z5UkEDJgqcWyXGhGc4"
        },
        "status": "OPERATION_PENDING",
        "steps": [
            {
                "to": "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5",
                "functionSignature": "withdraw(address,uint256,address)",
                "parameters": [
                    "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                    "282174",
                    "0xFe6EF968D2F7B2e9CCCF92150d96c930C3CC4a4E"
                ],
                "value": "0"
            },
            {
                "to": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                "functionSignature": "transfer(address,uint256)",
                "parameters": [
                    "0x546252c9a0E974f75892b4c54b7a67B69a0aFf45",
                    "5948"
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
      "intent": "aave_withdraw",
      "title": "Withdraw from Aave"
    },
    "outOperation": true,
    "quote": {
      "amount": "282174",
      "destinationAsset": "nep141:sol.omft.near",
      "originAsset": "nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near",
      "slippageTolerance": 100
    },
    "steps": [
      {
        "functionSignature": "withdraw(address,uint256,address)",
        "parameters": [
          "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
          "282174",
          "0xFe6EF968D2F7B2e9CCCF92150d96c930C3CC4a4E"
        ],
        "to": "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5",
        "value": "0"
      },
      {
        "functionSignature": "transfer(address,uint256)",
        "parameters": [
          "0xf9a3a3f6A7d0C235eFc35F1978E3F53c264eeE45",
          "282174"
        ],
        "to": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
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
* `steps` are now populated with amounts from the quote

</details>

<details>

<summary>Example response</summary>

| Field                          | Description                                                                                                                                  |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `details.payload.payload_json` | Message to be signed by the wallet                                                                                                           |
| `id`                           | Identifier of the execution, needed for tracking                                                                                             |
| `status`                       | Status of the transaction, used for understanding the lifecycle of the execution                                                             |
| `steps`                        | Updated steps were built based on the user's signed input steps. The additional transfer added to the array is used to reimburse the gas fee |

```json
{
    "result": {
        "createdAt": "2026-04-23T18:50:36Z",
        "details": {
            "estimatedTime": "32",
            "intermediaryAddress": "0xFe6EF968D2F7B2e9CCCF92150d96c930C3CC4a4E",
            "messageToSign": "...",
            "networkFee": "7027",
            "payload": {
                "payload_bytes_base64": "...",
                "payload_json": "...",
                "standard": "raw_ed25519"
            },
            "serviceFee": "0",
            "signingStandard": "raw_ed25519"
        },
        "id": "74e0cbfe-def3-47fb-8f1c-469778c6acbc",
        "metadata": {
            "title": "Withdraw from Aave",
            "intent": "aave_withdraw"
        },
        "quote": {
            "amount": "282174",
            "amountIn": "275147",
            "amountInUsd": "0.2751",
            "amountOut": "3173051",
            "amountOutUsd": "0.2714",
            "deadline": "2026-04-23T19:00:32Z",
            "depositAddress": "0xB930Ee99C731E85E7cC8f79cCA38448A3E5Bc5Ad",
            "destinationAsset": "nep141:sol.omft.near",
            "minAmountOut": "3141320",
            "originAsset": "nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near",
            "recipient": "BTKcXNp1wSzs9Mp2ejsPrHLr59z5UkEDJgqcWyXGhGc4"
        },
        "status": "OPERATION_PENDING",
        "steps": [
            {
                "to": "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5",
                "functionSignature": "withdraw(address,uint256,address)",
                "parameters": [
                    "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                    "282174",
                    "0xFe6EF968D2F7B2e9CCCF92150d96c930C3CC4a4E"
                ],
                "value": "0"
            },
            {
                "functionSignature": "transfer(address,uint256)",
                "parameters": [
                    "0xB930Ee99C731E85E7cC8f79cCA38448A3E5Bc5Ad",
                    "282174"
                ],
                "to": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                "value": "0"
            },
            {
                "to": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                "functionSignature": "transfer(address,uint256)",
                "parameters": [
                    "0x546252c9a0E974f75892b4c54b7a67B69a0aFf45",
                    "7027"
                ],
                "value": "0",
                "metadata": {
                    "name": "Fee Transfer",
                    "description": "Gas fee reimbursement"
                }
            }
        ],
        "type": "evm",
        "version": "1.0"
    }
}
```

</details>
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
    "executionId": "74e0cbfe-def3-47fb-8f1c-469778c6acbc",
    "publicKey": "ed25519:BTKcXNp1wSzs9Mp2ejsPrHLr59z5UkEDJgqcWyXGhGc4",
    "signature": "ed25519:466cjq2diW62zHhHik8hQQGLjLTg2drnZCEjBxDnUDZCoN4HmcXv4F4WTe2LqDgJk8Ccaq1rjusA47DeUWKegNy1"
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
    "status": "SIGNING"
  }
}
```

</details>
{% endstep %}

{% step %}
### Monitor the status of the execution

Use [fetch-executions.md](../intents-connect-api-reference/fetch-executions.md "mention") using `id` of the execution

{% tabs %}
{% tab title="JavaScript" %}
```javascript
const response = await fetch(`https://intents-connect-api.aurora.dev/api/v1/executions/BTKcXNp1wSzs9Mp2ejsPrHLr59z5UkEDJgqcWyXGhGc4?id=74e0cbfe-def3-47fb-8f1c-469778c6acbc`);
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
