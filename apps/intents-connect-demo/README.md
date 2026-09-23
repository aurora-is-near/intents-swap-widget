# Intents Connect demo

Run `yarn workspace intents-connect-demo dev` from the repository root, then open
[the demo](http://localhost:3000). The tabs include Hydrex, Aave, Polymarket, and Solana.

## Buy Solana assets

The Solana tab buys one of ten Solana assets that 1Click does not list — JitoSOL,
BNSOL, JUP, JLP, RENDER, BP, JupSOL, USDe, PYTH or RAY — into the connected
wallet's **Connect Solana intermediary**, not into the connected wallet itself. The source selector still
uses supported 1Click assets, including Solana ones: a Solana-origin source is a
same-chain bridge (SOL → USDC on Solana) that Connect quotes and settles like any
other, though it costs noticeably more than a direct DEX swap. Only exact-input
purchases are offered; both connected-wallet transfers and external/QR deposits
use the same recipe.

Copy `.env.example` to `.env.local` and configure `JUPITER_API_KEY`, then restart
the demo. The `/api/jupiter/swap/v2/build` proxy attaches the key on the server.
Never put that key in a `VITE_` variable. The `/api/solana-rpc` proxy uses
`SOLANA_RPC_URL` and permits account reads only. Locally both routes are served
by the Vite middleware in `solanaProxy.ts` (`dev` and `preview`); on Vercel they
are served by the functions in `api/`, which call the same handlers. Set
`JUPITER_API_KEY` and optionally `SOLANA_RPC_URL` in the Vercel project
environment. Other static hosts need equivalent proxies configured through
`VITE_JUPITER_BUILD_URL` and `VITE_SOLANA_RPC_URL`.

1. Connect an origin wallet and choose a supported source asset.
2. Select the asset to buy and press **Get quote**. Connect previews the bridge and
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
4. The balances panel reads the intermediary's ATAs for every buyable asset and
   USDC through RPC. It refreshes on connection, manually, and immediately/four seconds after
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
releases a lock; it does not refund funds.

## Sell and withdraw

Each row of the balances panel has one action. Both are **steps-only**
executions (`runSteps` / `previewSteps` in the SDK): the Connect account
already holds the asset, so there is no bridge quote and no deposit — one
signature, then Connect's relayer runs the instructions.

- **Sell** (any bought asset): Jupiter swaps the row's whole balance into USDC inside
  the same Connect account. The fee is taken from the USDC the swap produces,
  so the panel shows the estimated and minimum USDC and the fee, and refuses a
  sale whose guaranteed output would not cover the fee.
- **Withdraw** (USDC): a plain SPL `transferChecked` of the whole USDC balance,
  less Connect's fee, to a Solana wallet address you enter (prefilled with the
  connected wallet when it is a Solana wallet; token accounts and other
  off-curve addresses are rejected). The SDK measures the fee with a dry
  create, then transfers `balance − fee`.

**Get quote** previews (dry creates only), the quote is valid for 30 seconds,
and **Confirm** previews again and commits the prepared instructions unless
the guaranteed USDC fell — then it asks you to accept the refreshed figure.
Only one row can be in review at a time, and nothing can start while the buy
card is running (the Connect account has one in-flight execution at a time).
A real create whose fee outgrows the preview stops before signing and offers
**Cancel** to release the lock. A `503` means Connect had no free Solana
durable-nonce account; retry shortly.

Dry steps-only creates against an empty Connect account returned no
`networkFee` in testing (the simulation has nothing to spend). A withdrawal
needs the figure to size the transfer and stops with "Connect could not
estimate the fee"; a sale proceeds and shows the fee as unavailable, since the
service appends its fee transfer either way. Withdrawing to a wallet with no
USDC account yet warns that the account's rent falls on the Connect account.

Read-only checks on 2026-09-22 confirmed Solana USDC in both service token lists,
all ten target assets absent from 1Click, and every target mint owned by the
standard SPL token program with the configured decimals. Live USDC → target
Jupiter builds under the demo's routing constraints (`restrictIntermediateTokens`,
`maxAccounts=24`) passed instruction preparation for all ten; the larger ones
route in two hops with up to 44 accounts, so the deployment's transaction size
check is the final gate. Token-2022 assets such as PUMP, PYUSD and USDG were
excluded because the demo supports the standard token program only. Funded,
wallet-signed purchases have **not** been verified for these assets.

References: [Jupiter build API](https://developers.jup.ag/docs/api-reference/swap/build),
[Jupiter verified token list](https://lite-api.jup.ag/tokens/v2/tag?query=verified),
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
