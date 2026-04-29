---
icon: gear-complex-code
tags:
  - coming-soon
---

# Withdraw from Aave to Solana

{% hint style="warning" %}
**Pre-release** — The Intents Connect API is currently in development. If you're interested in early access, get in touch with the team.
{% endhint %}

Below is an example flow withdrawing from Aave using a Solana wallet using the Intents Connect API.

You'll need to run an execution to get the estimated output amount, estimate costs for the destination chain action, and sign the intent (withdraw from Aave). As a result, you'll withdraw from Aave into your Solana wallet.

{% stepper %}
{% step %}
### List supported tokens

Use [list-supported-tokens.md](../intents-connect-api-reference/list-supported-tokens.md "mention") to find the `assetId` values you will need. You'll need to use the Intents API for that.

{% tabs %}
{% tab title="JavaScript" %}
```javascript
const response = await fetch(`https://intents-connect-alpha-api.aurora.dev/api/v1/supported_tokens`);
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
### Request an execution

Use [request-an-execution.md](../intents-connect-api-reference/request-an-execution.md "mention") endpoint.

{% tabs %}
{% tab title="JavaScript" %}
```javascript
const response = await fetch(`https://intents-connect-alpha-api.aurora.dev/api/v1/executions/${solanaWalletAccount}`, {
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
      "amount": "197373",
      "destinationAsset": "nep141:sol.omft.near",
      "originAsset": "nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near",
      "slippageTolerance": 100
    },
    "steps": [
      {
        "functionSignature": "withdraw(address,uint256,address)",
        "parameters": [
          "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
          "197373",
          "0xFe6EF968D2F7B2e9CCCF92150d96c930C3CC4a4E"
        ],
        "to": "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5",
        "value": "0"
      },
      {
        "functionSignature": "transfer(address,uint256)",
        "parameters": [
          "{DEPOSIT_ADDRESS}",
          "197373"
        ],
        "to": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        "value": "0"
      }
    ],
    "type": "evm"
  });
});
const execution = await response.json();
```
{% endtab %}
{% endtabs %}

<details>

<summary>Request data explanation</summary>

* `dry` is false, unless we want to get just the estimates
* `metadata` contains information displayed in the UI - it's optional
* `outOperation` means that it's outbound operations and does not require a deposit
* `quote`
  * `amount` contains the input amount used for the action
  * `destinationAsset` assetId used for the action on the destination chain
  * `originChain` assetId deposited into the deposit account
  * `slippageTolerance` value is basis points, so 100 is 1%
* `steps` is used to define an operation on the destination chain
  * `functionSignature` [function signature](https://docs.soliditylang.org/en/latest/contracts.html#function-signatures-and-selectors-in-libraries) to be called on the EVM chain
  * `parameters` arguments to be passed to the function
    * Notice `{DEPOSIT_ADDRESS}`, which is a placeholder for the deposit account generated during quoting
  * `to` contact to interact with
  * `value` native value - in case a native token needs to be used
* `type` type of the action

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
        "createdAt": "2026-04-27T17:53:45Z",
        "details": {
            "estimatedTime": "32",
            "intermediaryAddress": "0xFe6EF968D2F7B2e9CCCF92150d96c930C3CC4a4E",
            "messageSigned": false,
            "messageToSign": "<REDACTED>",
            "networkFee": "6952",
            "payload": {
                "payload_bytes_base64": "<REDACTED>",
                "payload_json": "<REDACTED>",
                "standard": "raw_ed25519"
            },
            "serviceFee": "0",
            "signingStandard": "raw_ed25519"
        },
        "id": "eb4c80e8-e491-42da-87d9-f5879d91b7f6",
        "metadata": {
            "title": "Withdraw from Aave",
            "url": "https://last-mile-fe-check.vercel.app/withdraw",
            "intent": "aave_withdraw"
        },
        "quote": {
            "amount": "197373",
            "amountIn": "190421",
            "amountInUsd": "0.1904",
            "amountOut": "2214445",
            "amountOutUsd": "0.1871",
            "deadline": "2026-04-27T18:03:38Z",
            "depositAddress": "0x52dF3dE8e121332635ef319e4af9cCb98fd74a6f",
            "destinationAsset": "nep141:sol.omft.near",
            "minAmountOut": "2192300",
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
                    "197373",
                    "0xFe6EF968D2F7B2e9CCCF92150d96c930C3CC4a4E"
                ],
                "value": "0"
            },
            {
                "functionSignature": "transfer(address,uint256)",
                "parameters": [
                    "0x52dF3dE8e121332635ef319e4af9cCb98fd74a6f",
                    "190421"
                ],
                "to": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                "value": "0"
            },
            {
                "to": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                "functionSignature": "transfer(address,uint256)",
                "parameters": [
                    "0x546252c9a0E974f75892b4c54b7a67B69a0aFf45",
                    "6952"
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
const response = await fetch(`https://intents-connect-alpha-api.aurora.dev/api/v1/executions/${solanaWalletAccount}/submit`, {
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
const execution = await response.json();
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
const response = await fetch(`https://intents-connect-alpha-api.aurora.dev/api/v1/executions/BTKcXNp1wSzs9Mp2ejsPrHLr59z5UkEDJgqcWyXGhGc4?id=74e0cbfe-def3-47fb-8f1c-469778c6acbc`);
const execution = await response.json();
```
{% endtab %}
{% endtabs %}

<details>

<summary>Response explanation</summary>

The response will contain the entire execution object, but look out for `status` the field that indicates the lifecycle of the execution. `SUCCESS` means the execution is fully processed.

</details>
{% endstep %}
{% endstepper %}
