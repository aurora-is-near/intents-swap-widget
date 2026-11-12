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
src/background.ts  the toolbar button: opens the modal on any site
src/page/      app.aave.com adapter: the button, the account (wagmi.store), the market,
               and the theme hints (AAVE_THEME)
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
4. Pin the extension (the puzzle icon in the toolbar): its icon opens the
   modal on the current tab, on Aave or on any other site.

After a rebuild, click the extension's reload icon in `chrome://extensions`,
then reload the tab.

### Previewing it on other sites

Click the toolbar icon on any site to see the modal in that site's look.
The extension only runs where you click (`activeTab`): it asks for no
site access, and nothing runs on sites you don't. A reload removes it.

Off app.aave.com it's a **theme preview**:
- it reads the site's theme with no Aave hints (no MUI selectors, no
  12 px card pin), as a new site's adapter would start;
- Aave's default market, for a placeholder account (`0x…dEaD`), so every
  screen shows: wallets, assets, the form with a live quote;
- it never supplies: the Supply button shows a notice instead.
- no EVM phones in the Phone tab: the WalletConnect project allows
  app.aave.com only, so its relay refuses other sites (TON's QR stays).

Chrome's own pages (`chrome://`, the Web Store) can't be scripted; the
icon shows "!" there. A site whose Content Security Policy blocks
connections to the Intents Connect API (or inline styles) shows the modal
without balances and quotes (or unstyled).

### Tuning the theme

The modal takes its look from the page it runs on, and the theme inspector
shows how. The toolbar icon opens it along with the modal;
so do `?aurora-theme=inspect` in the page's URL and
`auroraIntents.theme.inspect()` in the console. It lists where each value
came from, lets you change them live, checks text contrast, and copies the
result as a config for the site's adapter (`AAVE_THEME` in
`src/page/aave.ts`). It's in every build (`build` and `dev`).

## Wallets

The modal pays from any wallet the page can see: EVM wallets (EIP-6963),
Solana wallets (Wallet Standard) and NEAR extension wallets, found by the
SDK's `./detect` without prompting, Stellar wallets (Freighter, xBull, LOBSTR
and Hana, from `./detect/stellar`), TRON wallets (TronLink, from
`./detect/tron`), TON wallet extensions (from `./detect/ton`), or a phone by
QR code: EVM over WalletConnect, TON over TON Connect. The wallet screen's
tabs are **Browser · Phone · Transfer**.

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
- TON pays from TON or USDT over TON Connect, with a session for extensions
  and another for phones, so pairing a phone doesn't drop the extension. A
  wallet has to share its public key and sign text (Tonkeeper and
  MyTonWallet do). MAX keeps 0.1 TON; a USDT deposit attaches 0.05 TON for
  fees, most of which comes back, and the form warns below 0.1 TON.
- **The TON Connect manifest** (name, icon, dApp url) lives in its own public
  repo, [aurora-is-near/ton-connect-manifest](https://github.com/aurora-is-near/ton-connect-manifest),
  served from `raw.githubusercontent.com` (`VITE_TONCONNECT_MANIFEST_URL`
  overrides it). Wallets fetch it when connecting, phones included.
- `@ton/core` uses Node's global `Buffer`: the build gives each `@ton/*`
  module the `buffer` package's (`vite.config.ts`), and Aave's page gets no
  `window.Buffer`.
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
- **When the Aave step fails** (a reserve at its supply cap, a price move),
  the funds stay with the paying wallet's Aurora account on the market's
  chain. The progress screen says so and shows what waits, and so does the
  assets screen after a reload: **Supply it** supplies it in place, without
  a bridge, for the network fee.
- **On the page:** while the modal is closed, the Supply with Aurora button
  shows the supply's status ("Supplying…", "Sign in your wallet",
  "Supplied", "Supply failed"). A notice in the corner says when it ended,
  with **View** to reopen it.
- **Aave refreshes** when a supply lands: the extension finds Aave's React
  Query client (in React's fiber tree, as it exposes none) and invalidates
  its active queries, then once more 6 s later, so Your supplies updates
  without waiting for Aave's next poll.

## Paying from anywhere (Transfer)

The **Transfer** tab supplies from funds the page can't see: on an exchange,
or in a wallet outside this browser. The user picks what to send, a wallet
signs once, and the modal shows an address and a QR code to send to.

- **What can be sent:** the service's own list of origins (164 tokens on 18
  networks today), less TON and Stellar, which it refuses in this mode: 157
  tokens on 16 networks, named as exchanges name them (ERC-20, BEP-20,
  TRC-20, Arbitrum One…). Bitcoin, XRP and the like aren't origins yet; the
  list picks them up when the service does.
- **Who signs:** a wallet on the network the funds are sent on, since the
  service refunds to its address there, never to the exchange. Aave's own
  wallet signs for EVM networks; Solana, TRON and NEAR need a browser wallet
  of that family (picked silently when it shares an account, else
  connected). A network with none here is listed but can't be picked.
- **The form:** no balance or MAX; a note on the network, exchange fees and
  minimum withdrawals, and who signs. "Sign to get the deposit address".
- **The deposit:** a QR code of the plain address, the exact amount, the
  network, the token's contract, the memo when there is one, and 30 minutes
  to send it. The modal (and Aave's button) follows it: closing it is fine,
  and reopening, even after a reload, lands back on it with no prompt.
- **Running late:** past the deadline it says so ("Don't send now"); a
  deposit sent late is still picked up. **Start over** cancels it (one
  signature): only if nothing was sent.
- **Cancel** while waiting, likewise only if nothing was sent.
- What happens to a wrong amount, or funds sent after a cancel, isn't
  documented by the service yet.

## Paying from an intents account

A wallet with a NEAR Intents account (EVM, Solana, NEAR) gets three tabs
under the asset search: **Wallet**, **Intents** and **Confidential**
(Solana: no Confidential, which the intents API doesn't open sessions for
yet). TRON, Stellar and TON wallets get none: a supply can't be paid from
them.

- **Intents:** the account's public balances, read when the tab opens (no
  prompt). Tokens 1Click doesn't list read "Not supported yet".
- **Confidential:** hidden until the user presses **Authorize**: one
  signature, which moves nothing, then the private balances. The session
  lives in the page's memory, so a reload asks again; **Forget this
  session** ends it.
- **Supplying from either:** two signatures.
  1. The move: a 1Click swap from the intents account to the wallet's
     Aurora account on the market's chain, paid out as the reserve's
     token. A move out of a private balance is public.
  2. The supply, once it arrives.

  MAX is the whole balance (there's no gas to keep). The form prices both
  legs: a dry quote of the move, then a dry run of the supply on what it
  delivers at least.
- **Progress:** Prepare, Move, Supply, Done. Closing the modal is fine:
  the wallet asks for the second signature when the funds arrive. After a
  reload, a move in progress is followed again with no prompt, and it stops
  at **Supply it**. A declined supply leaves the funds waiting there, with
  **Supply it**. A refund puts them back in the intents account.
- **On the page and in History:** the button shows "Moving funds…",
  "Finish your supply", "Supplied" or "Refunded". History lists it as
  "10 USDC → USDC · Intents account".

## History

The clock in the modal's header lists past supplies to Aave from every
wallet the page shows an account for, newest first: what was paid, into
what, when, from which wallet, and how it ended. One opens with its
amounts, the supply transaction and the execution id; an unfinished one
opens on its progress screen (switching to its wallet first). Runs other
apps made with the same wallets aren't listed: only those carrying the
recipe's intent, `aave_supply`.

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
