# Borrow on Aave V3

Version 1 bridges any asset into collateral on Base or Arbitrum, supplies it to Aave V3 for the wallet's intermediary, borrows USDC or USDT at the variable rate against it, and sends the borrowed tokens to a recipient. The intermediary owns the Aave position: it holds the collateral and the debt.

## Inputs

| Input | Type | Meaning |
|---|---|---|
| `chain` | `base` or `arb`, required | The Aave V3 market. It picks the Pool, the WETH gateway and the token tables below. |
| `borrowAsset` | `USDC` or `USDT`, required | The token to borrow, from the chain's borrow table. |
| `collateral` | `ETH` or `cbBTC`, required | The token the bridge delivers and the intermediary supplies, from the chain's collateral table. |
| `borrowAmount` | positive decimal string, required | Atomic units of the borrowed token, used as given. USDC and USDT have six decimals, so `"1000000"` is 1. See [Sizing `borrowAmount`](#sizing-borrowamount). |
| `recipient` | EVM address, required | Receives the borrowed tokens on `chain`. |
| `amount` | positive decimal string, required | With `originAsset`: origin-asset atomic units to bridge. Without it: collateral atomic units the intermediary already holds. |
| `originAsset` | 1Click asset ID, optional | The asset to bridge from. Present selects bridge-in, absent selects steps-only. |
| `slippageTolerance` | integer 0 to 10000, default 100 | Bridge slippage in basis points (100 is 1%). An explicit zero is rejected on bridge-in, because execution creation reads 0 bps as 100 bps. |
| `deadline` | date-time, optional | Copied to `quote.deadline`. The execution API supplies its default when omitted. |
| `dry` | boolean, default `false` | Request a fee preview at creation. |
| `publicKey` | string, default `""` | The origin wallet's `ed25519:<base58>` public key, copied to the body when set. Origins such as TON need it at creation. |

## The rule

`chain` picks the Pool and the gateway. `borrowAsset` picks the borrowed token from that chain's borrow table, and `collateral` picks the delivered and supplied token from that chain's collateral table. A symbol the chain's table lacks is rejected with HTTP 400, naming the symbols that chain has:

```json
{"error": "invalid action input: USDT cannot be borrowed on Base. Choose one of: USDC."}
```

### Base

Pool `0xA238Dd80C259a72e81d7e4664a9801593F98d1c5`, WETH gateway `0xa0d9C1E9E48Ca30c8d8C3B5D69FF5dc1f6DFfC24`.

| Table | Symbol | Token | Decimals | 1Click asset ID |
|---|---|---|---|---|
| Borrow | `USDC` | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` | 6 | `nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near` |
| Collateral | `ETH` | native, supplied as WETH `0x4200000000000000000000000000000000000006` through the gateway | 18 | `nep141:base.omft.near` |
| Collateral | `cbBTC` | `0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf` | 8 | `nep141:base-0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf.omft.near` |

### Arbitrum

Pool `0x794a61358D6845594F94dc1DB02A252b5b4814aD`, WETH gateway `0x5283BEcEd7ADF6D003225C13896E536f2D4264FF`.

| Table | Symbol | Token | Decimals | 1Click asset ID |
|---|---|---|---|---|
| Borrow | `USDC` | native USDC `0xaf88d065e77c8cC2239327C5EDb3A432268e5831` | 6 | `nep141:arb-0xaf88d065e77c8cc2239327c5edb3a432268e5831.omft.near` |
| Borrow | `USDT` | USDT0 `0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9` | 6 | `nep141:arb-0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9.omft.near` |
| Collateral | `ETH` | native, supplied as WETH `0x82aF49447D8a07e3bd95BD0d56f35241523fBab1` through the gateway | 18 | `nep141:arb.omft.near` |

Addresses come from `@bgd-labs/aave-address-book` 4.44.22 (`AaveV3Base`, `AaveV3Arbitrum`; Arbitrum's USDC is the book's `USDCn`, not bridged USDC.e). Asset IDs come from the 1Click token list. Left out:

- USDT on Base: Aave V3 on Base has no USDT reserve.
- WBTC on Arbitrum: an Aave reserve, but 1Click does not deliver it.
- USDC as collateral: Aave gives it an LTV of 0 on both chains, so it backs no borrow. USDC stays borrowable.
- WETH as its own collateral: 1Click quotes no liquidity into WETH on Base or Arbitrum. `ETH` covers the same Aave reserve: it is delivered native and supplied as WETH through the gateway.

## The steps

ERC-20 collateral is approved to the Pool and supplied with `supply(asset, amount, {INTERMEDIARY}, 0)`. `ETH` is sent to the gateway's `depositETH(pool, {INTERMEDIARY}, 0)` as the call's `value`. Then the Pool's `borrow(asset, borrowAmount, 2, 0, {INTERMEDIARY})` borrows at the variable rate on the intermediary's account, and `transfer(recipient, borrowAmount)` sends the borrowed tokens on. Every step carries `metadata` with a `name` and a `description`.

The collateral amount is `{MIN_AMOUNT_OUT}` on bridge-in (the guaranteed bridge output after fees) and the literal `amount` on steps-only. The execution's `metadata` is `{"intent": "aave_borrow", "title": "Borrow <borrowed> against <collateral> on Aave <Base|Arbitrum>"}`.

## Origin asset

`originAsset` is copied to `quote.originAsset` unchecked. Any 1Click asset ID resolves; an ID 1Click does not know, or a pair it cannot route, fails when the execution is created, not at resolution. Check the origin asset against `GET /api/v1/supported_tokens` before resolving if you need an early error.

## Sizing `borrowAmount`

The action does no on-chain reads and no LTV maths: `borrowAmount` is a literal the caller sizes. The collateral the bridge delivers is only known from a quote, so size it in two passes:

1. Resolve with `dry: true` and any valid `borrowAmount`, such as `"1"`, and submit it to `POST /api/v1/executions/{wallet}`. Read `result.quote.minAmountOut` from the response: the collateral, in its atomic units, that the steps are guaranteed to receive after the network fee.
2. Value that collateral in the borrowed token with a price you trust, apply the reserve's LTV and a safety margin, and convert to the borrowed token's atomic units.
3. Resolve again with that `borrowAmount` and `dry: false`, and create the execution.

A borrow above what the collateral supports reverts on chain after the collateral has been supplied, so leave headroom below the LTV. A preview is a quote, not a commitment: re-read `minAmountOut` from the creation response.

## Fees

The action adds no fee step. The 0.30% Borrow fee is the API key's fee configuration, which the service applies when the execution is created with that key. The service also appends its own network-fee transfer. Neither appears in the resolved body: read both from the dry run's response rather than computing them.

## Endpoints

- Bridge-in (`originAsset` set): the body carries `quote` and `outOperation: false`. Submit `result.execution` verbatim to `POST /api/v1/executions/{wallet}` with an `x-api-key`. Creation fills `{INTERMEDIARY}` from the wallet and `{MIN_AMOUNT_OUT}` from the quote.
- Steps-only (`originAsset` omitted): the body carries a top-level `destinationAsset` (the collateral) and no `quote`. Submit it to `POST /api/v1/executions/{wallet}/steps`. The intermediary must already hold `amount` of the collateral.

## Example

From [the ETH bridge-in fixture](tests/base_bridge_in_eth.json): bridge SOL into ETH on Base, supply it as WETH through the gateway, and borrow 2,000 USDC, as a dry preview. `POST /api/v1/actions/aave-v3-borrow/resolve` with:

```json
{
  "version": 1,
  "inputs": {
    "chain": "base",
    "borrowAsset": "USDC",
    "collateral": "ETH",
    "borrowAmount": "2000000000",
    "recipient": "0x2222222222222222222222222222222222222222",
    "amount": "5000000000",
    "originAsset": "nep141:sol.omft.near",
    "slippageTolerance": 50,
    "deadline": "2026-12-01T00:00:00Z",
    "dry": true
  }
}
```

returns `executionChain: "base"` and this `result.execution`:

```json
{
  "version": "1.0",
  "type": "evm",
  "outOperation": false,
  "dry": true,
  "metadata": {
    "intent": "aave_borrow",
    "title": "Borrow USDC against ETH on Aave Base"
  },
  "quote": {
    "originAsset": "nep141:sol.omft.near",
    "destinationAsset": "nep141:base.omft.near",
    "amount": "5000000000",
    "swapType": "EXACT_INPUT",
    "slippageTolerance": 50,
    "deadline": "2026-12-01T00:00:00Z"
  },
  "steps": [
    {
      "to": "0xa0d9C1E9E48Ca30c8d8C3B5D69FF5dc1f6DFfC24",
      "functionSignature": "depositETH(address,address,uint16)",
      "parameters": [
        "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5",
        "{INTERMEDIARY}",
        "0"
      ],
      "value": "{MIN_AMOUNT_OUT}",
      "metadata": {
        "name": "Supply ETH",
        "description": "Supply ETH to Aave V3 as collateral through the WETH gateway"
      }
    },
    {
      "to": "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5",
      "functionSignature": "borrow(address,uint256,uint256,uint16,address)",
      "parameters": [
        "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        "2000000000",
        "2",
        "0",
        "{INTERMEDIARY}"
      ],
      "value": "0",
      "metadata": {
        "name": "Borrow USDC",
        "description": "Borrow USDC from Aave V3 at the variable rate against the collateral"
      }
    },
    {
      "to": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      "functionSignature": "transfer(address,uint256)",
      "parameters": [
        "0x2222222222222222222222222222222222222222",
        "2000000000"
      ],
      "value": "0",
      "metadata": {
        "name": "Send USDC",
        "description": "Send the borrowed USDC to the recipient"
      }
    }
  ]
}
```

The other fixtures cover [cbBTC steps-only](tests/steps_only.json), [USDT0 against ETH on Arbitrum](tests/arb_usdt_against_eth.json) and the rejected inputs, among them [WETH as collateral](tests/weth_collateral.json).
