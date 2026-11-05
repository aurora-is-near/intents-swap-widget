# Aurora Intents for Aave (dev extension)

An internal Chrome extension, not for customers. It adds **Supply with
Aurora** to app.aave.com's "Assets to supply" header. The button opens a modal
that lets a user pay from any wallet, on any chain, into the Aave position of
the account connected on the page, through Intents Connect.

It stands in for a real integration. `src/ui/` is the future UI package:
everything it knows about the page and about Aave comes in through props
(see [src/ui/README.md](src/ui/README.md)).

```
src/content/   MAIN-world entry: the button and the modal host
src/page/      app.aave.com adapter: the button, the account (wagmi.store), the market
src/aave/      Aave logic: markets, reserves (viem), the supply recipe
src/config.ts  Intents Connect clients, the WalletConnect client, keys
src/ui/        the modal, rendered in a shadow root
```

## Run it

Copy `.env.example` to `.env.local` and set `VITE_INTENTS_API_KEY` (and,
optionally, `VITE_ALCHEMY_API_KEY`). Vite reads it when a build starts, so
restart `dev` after changing it.

```bash
# Node 22, from the repo root
yarn workspace intents-connect-aave-ext build   # or `dev` to rebuild on change
```

Then, in Chrome:

1. Open `chrome://extensions` and turn on **Developer mode**.
2. Click **Load unpacked** and choose `apps/intents-connect-aave-ext/dist`.
3. Open https://app.aave.com and connect a wallet. The button shows up in
   the "Assets to supply" header.

After a rebuild, click the extension's reload icon in `chrome://extensions`,
then reload the Aave tab.

## Wallets

The modal pays from any wallet the page can see: EVM wallets (EIP-6963),
Solana wallets (Wallet Standard) and NEAR extension wallets, found by the
SDK's `./detect` without prompting, Stellar wallets (Freighter, xBull, LOBSTR
and Hana, from `./detect/stellar`), TRON wallets (TronLink, from
`./detect/tron`), or a phone over WalletConnect.

- A wallet that already shares an account with app.aave.com (usually the one
  Aave uses) is picked without a prompt. Any other asks to connect first.
- The choice is remembered (`aurora-intents.wallet` in localStorage).
- **Disconnect** on an EVM wallet only stops using it here. Revoking its
  permission would also disconnect Aave. Solana, NEAR and Stellar wallets
  are asked to disconnect.
- Freighter shares its account silently. xBull, LOBSTR and Hana ask on every
  read, so after the first connect the modal remembers their address. xBull
  is listed only with its extension installed: its web wallet's popups would
  be blocked mid-supply.
- Stellar pays from XLM. Stellar USDC is listed but its supply fails until
  the service creates its executions in memo mode.
- TRON pays from TRX or USDT, through the wallet's own `tronWeb`. TronLink
  can't revoke a site, so **Disconnect** only stops using it here. MAX keeps
  2 TRX: the transfer's bandwidth and activating the fresh deposit address
  (1.1 TRX). A USDT deposit burns about 13 TRX for energy unless the account
  has staked energy; the form says so, and warns below 15 TRX.
- Phone pairing uses a dev Reown project with `app.aave.com` on its allowed
  domains (override with `VITE_WALLETCONNECT_PROJECT_ID`), so Aurora's
  shared project doesn't need it. The client runs under its own storage
  prefix (`aurora-intents`), apart from Aave's own WalletConnect.

## Supplying

- **Markets.** Core, Prime, Base, Arbitrum, Polygon and Monad: the Aave
  markets on chains Intents Connect delivers to. Others get "isn't supported
  yet". The modal also blocks a market none of whose reserves it can deliver.
- **Reserves.** Read from each market's AaveProtocolDataProvider: active, not
  paused or frozen, with the supply APY. A reserve at its supply cap is listed
  but can't be chosen. The form offers those whose token Intents Connect can
  deliver (`useSupportedTokens`).
- **Recipe.** The intermediary approves the Pool and calls
  `supply(asset, amount, onBehalfOf, 0)`, with `onBehalfOf` the account
  connected on Aave. The wrapped native reserve (WETH, or WPOL on Polygon) is
  supplied as the native token through Aave's WrappedTokenGatewayV3
  (`depositETH`), because the bridge has liquidity for native ETH and none
  for Base WETH.
- **Quote.** A live dry preview (`useQuotePreview`) of exactly what would
  run: the minimum supplied, the network fee and the time. It refreshes
  every 30 s.

## Running a supply

Supply runs exactly the previewed plan on the same runner: sign the
execution, confirm the deposit transfer, then the bridge delivers and the
intermediary supplies. The progress screen follows it: Prepare, Sign,
Deposit, Supply, Done. It shows the amounts, the deposit and
supply transactions (with explorer links) and the execution id.

- Close the modal at any point: the supply carries on, and reopening shows it.
- **After a reload** (or for a wallet with a supply already going), opening
  the modal finds the wallet's in-flight execution (`useWalletExecutions`):
  - Past the deposit, it is followed at once; that prompts nothing.
  - Still needing a signature or a deposit, it waits for **Resume** or
    **Cancel**, so the wallet never pops up unasked. **Pay from another
    wallet** leaves it for later.
- **Resume / Cancel** when another execution from the wallet holds the lock;
  **Retry transfer / Cancel** when the deposit transfer was rejected or failed.
- Failures read plainly: declined in the wallet, not enough funds, the price
  moved, the network or service is unreachable. A supply the service is slow
  on can be **kept following**.
- An EVM deposit switches the wallet to the asset's chain. When it's the
  wallet Aave uses, Aave's network switches too.

## Troubleshooting

- **No button.** It only shows on the dashboard with a wallet connected (Aave
  renders "Assets to supply" only then). Reload the extension, then the tab.
- **Balances or quotes fail and the console says `VITE_INTENTS_API_KEY is not
  set`.** The build had no `.env.local`: add it and rebuild (restart `dev`).
- **The QR code doesn't load.** The WalletConnect project must list the page's
  origin among its allowed domains.
- **"Amount too small".** The destination chain's gas would eat it. Ethereum
  markets need several dollars; the others, cents.
- **A supply is stuck.** Its execution id is on the progress screen; the
  service's status for it is at
  `https://intents-connect-alpha-api.aurora.dev/api/v1/executions/<wallet>?id=<id>`.
