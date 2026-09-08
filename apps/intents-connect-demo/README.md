# Intents Connect demo

Run `yarn workspace intents-connect-demo dev` from the repository root, then open
[the demo](http://localhost:3000). The tabs include Hydrex, Aave, and Polymarket.

## Aave on Monad

The Aave tab bridges the selected source asset to native USDC on Monad mainnet
(chain ID 143), approves the Aave V3 Pool, and calls
`supply(USDC, amount, userAddress, 0)`. The amount comes from the execution SDK
after fees. The connected EVM wallet receives the aTokens directly. Both the
connected-wallet transfer and external deposit-address modes use the same recipe.

This example supplies USDC to the Aave lending protocol. It does not deposit the
AAVE governance token. There is no borrow or withdrawal action in the demo.

The positions panel discovers all current Monad reserves through Aave's protocol
data provider. It shows the wallet's supplied balances (including accrued
interest), debt, collateral status, and supply APY excluding incentives. Reads
use the same block, and failed RPC calls display an error. Positions refresh on
connection, manually, and immediately and four seconds after a successful deposit.

Contract addresses are pinned in `src/aave/constants.ts` and were verified on
2026-09-08 against the [Aave address book](https://github.com/bgd-labs/aave-address-book/blob/main/src/ts/AaveV3Monad.ts).
The USDC destination asset ID comes from the [1Click token catalogue](https://1click.chaindefuser.com/v0/tokens)
and is also listed by the demo execution service. The position reader uses the
official [IPoolDataProvider interface](https://github.com/aave-dao/aave-v3-origin/blob/main/src/contracts/interfaces/IPoolDataProvider.sol).

## Checks

```sh
yarn workspace intents-connect-demo test
yarn workspace intents-connect-demo typecheck
yarn workspace intents-connect-demo lint
yarn workspace intents-connect-demo build
```

Tests cover the supply recipient and fee placeholder, source-token units and
deposit modes, reserve balances and decimal handling, RPC failures, wallet gating,
and refresh after settlement. A funded end-to-end deposit requires a connected
wallet and a transaction signature.
