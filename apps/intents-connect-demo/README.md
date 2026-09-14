# Intents Connect demo

Run `yarn workspace intents-connect-demo dev` from the repository root, then open
[the demo](http://localhost:3000). The tabs include Hydrex, Aave, Polymarket, and Solana.

## Buy Solana assets

The Solana tab buys ORCA or KMNO into the connected wallet's **Connect Solana
intermediary**, not into the connected wallet itself. The source selector still
uses supported 1Click assets. Only cross-chain exact-input purchases are offered;
both connected-wallet transfers and external/QR deposits use the same recipe.

Copy `.env.example` to `.env.local` and configure `JUPITER_API_KEY`, then restart
the demo. Vite's local `/api/jupiter/swap/v2/build` proxy attaches the key on the
server. Never put that key in a `VITE_` variable. The `/api/solana-rpc` proxy uses
`SOLANA_RPC_URL` and permits account reads only. Both proxies work with `dev` and
`preview`; static deployments need hosted equivalents configured through
`VITE_JUPITER_BUILD_URL` and `VITE_SOLANA_RPC_URL`.

1. Connect an origin wallet and choose a supported asset on another chain.
2. Select ORCA or KMNO and press **Get quote**. Connect previews the bridge and
   fees; the SDK subtracts Connect's separately reported Solana fee and Jupiter
   builds at the remaining USDC amount. The card shows the
   final token estimate/minimum and the network fee in USDC. Other fees and USD
   value are shown as unavailable. Quotes expire after 30 seconds, without
   background refreshes. The 1% allowance is split into 0.25% bridge slippage,
   a 0.25% USDC margin for movement before signing, and 0.5% Jupiter slippage.
   Estimates and minimums use the reduced Jupiter input; unused USDC remains
   visible in the balances panel. A falling dry quote can rebuild the unsigned
   instructions twice before asking for a new quote.
3. **Buy** refreshes the preview. A lower minimum requires another click accepting
   the new quote. The SDK then creates and validates the real execution, signs,
   funds, and polls to settlement, keeping the committed instructions fixed.
   If the real guarantee falls below that input despite the margin, signing
   stops. Cancel the unsigned execution to release its lock, then get a new quote.
   `NO_QUOTE` means Connect could not obtain a bridge quote for that request.
   The old review is cleared so another attempt starts with **Get quote**;
   real execution creation is never automatically retried.
4. The balances panel reads the intermediary's ORCA, KMNO, and USDC ATAs through
   RPC. It refreshes on connection, manually, and immediately/four seconds after
   completion or failure. USDC remaining after fees and the fixed swap input is
   listed separately. Existing holdings are loaded again after a page reload.

### Deployment validation

Purchases are available through **Get quote → Buy** once the Jupiter proxy is
configured; there is no separate purchase flag. Deployment checks cover the
complete Connect transaction with its injected payer, nonce, fee, and ATA setup:
Jupiter program compatibility, USDC fee collection/rent, lookup tables, the
1232-byte size limit, and the deployment's compute limit. The local size check
is only a lower bound and a dry fee response does not prove compute feasibility.
This version accepts the Jupiter v6 swap program plus standard idempotent ATA
setup; it rejects other setup/cleanup/extra instructions and foreign signers.

For controlled, wallet-signed purchases of each target in both funding modes,
check the final transaction and intermediary ATA increase, and exercise signature rejection,
fee movement, delayed external deposits, and SDK resume/cancel controls. Never
send a second deposit if the first has already been broadcast. Cancellation
releases a lock; it does not refund funds. Selling, withdrawing, and spending
existing intermediary funds are not part of this demo iteration.

Read-only checks on 2026-09-11 confirmed Solana USDC in both service token lists,
ORCA/KMNO absent from 1Click, and both target mints owned by the standard SPL token
program with six decimals. Live Base USDC → ORCA dry previews also confirmed
Jupiter instruction preparation and Connect's separate Solana fee accounting.
Full transaction execution and funded settlement have **not** been verified
with a wallet-signed purchase.

References: [Jupiter build API](https://developers.jup.ag/docs/api-reference/swap/build),
[ORCA token](https://docs.orca.so/governance/tokenomics),
[KMNO token](https://kamino.com/docs/kmno),
[1Click catalogue](https://1click.chaindefuser.com/v0/tokens).

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
