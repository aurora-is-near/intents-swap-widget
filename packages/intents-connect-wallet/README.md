# @aurora-is-near/intents-connect-wallet

Chain wallets for [`@aurora-is-near/intents-connect`](../intents-connect):
deposit transfers and wallet connection, **one subpath per chain**.

Ported from `intents-swap-widget-evm/-solana/-stellar`, the widget's
`useMakeNEARFtTransferCall` hook, and `intents-swap-widget-standalone` — with no
dependency on the widget.

📖 **Docs:** [Wallet integrations](https://docs.intents.aurora.dev/intents-connect/intents-connect-sdk/wallet-integrations) · [Intents Connect SDK](https://docs.intents.aurora.dev/intents-connect/intents-connect-sdk)

## Why subpaths

Every chain SDK is an **optional peer dependency**, reachable only through its
own subpath. That matters more than it sounds: `@creit.tech/stellar-wallets-kit`
alone installs a ~160M closure (it bundles its own WalletConnect, Reown and viem
copies), so an EVM-only integration must not be made to install it.

| Subpath | Purpose | Optional peers |
|---|---|---|
| `.` | shared transfer types, no deps | — |
| `./evm` | EVM deposit transfer | `viem` |
| `./solana` | Solana deposit transfer | `@solana/web3.js`, `@solana/spl-token` |
| `./stellar` | Stellar transfer, `decodePublicKey`, `toStellarWalletConnector` | `@stellar/stellar-sdk` |
| `./near` | NEAR deposit transfer | — (plain `fetch`) |
| `./tron` | TRON deposit transfer, `toTronWalletConnector` | — (the wallet's own `tronWeb`) |
| `./connect` | modal, presets, coordinator | `react`, `@headlessui/react` |
| `./connect/appkit` | EVM + Solana connectors | `@reown/*`, `@solana/wallet-adapter-*`, `viem` |
| `./connect/near` | NEAR connector | `@hot-labs/near-connect` |
| `./connect/stellar` | Stellar connector | `@creit.tech/stellar-wallets-kit`, `@stellar/stellar-sdk` |
| `./connect/walletconnect` | headless WalletConnect (EVM mobile, QR) | `@walletconnect/universal-provider` |
| `./detect` | wallets already connected to the page | — |
| `./detect/react` | `useDetectedWallets` | `react` |
| `./detect/connector` | `toWalletConnector` for any detected wallet | `viem`, `@solana/web3.js`, `@solana/spl-token` |
| `./detect/stellar` | Stellar wallets for detection (`stellarWallets`) | `@creit.tech/stellar-wallets-kit`, `@stellar/stellar-sdk` |
| `./detect/tron` | TRON wallets for detection (`tronWallets`) | — |

Install only what you use — e.g. EVM with our modal:

```bash
yarn add @aurora-is-near/intents-connect @aurora-is-near/intents-connect-wallet \
         viem react @headlessui/react @reown/appkit @reown/appkit-adapter-ethers
```

## Transfers

A NEAR deposit of native NEAR (no `tokenAddress`) is wrapped on the way: one
transaction to `wrap.near` registers the payer if needed (refunded otherwise),
wraps the amount and sends it as wNEAR, since 1Click only takes wNEAR. Quote
it as wNEAR (`toQuoteAssetId` in core).

```ts
import { evm } from '@aurora-is-near/intents-connect-wallet/evm';

createExecutionRunner({
  api,
  wallet,
  plugins: { evm },
  pluginOptions: { provider: window.ethereum },
});
```

## Connection

`./connect` is **chain-agnostic**: the coordinator takes connectors as arguments
rather than importing them, and the modal renders whatever options it is handed.
The widget's `useWalletSelector` imported all three chains directly, which is why
it could never be split.

```tsx
import {
  WalletSelectorModal,
  useWalletSelector,
  EVM_SOLANA_WALLET_OPTION,
  NEAR_WALLET_OPTION,
} from '@aurora-is-near/intents-connect-wallet/connect';
import {
  AppKitProvider,
  useAppKitConnector,
} from '@aurora-is-near/intents-connect-wallet/connect/appkit';
import { useNearConnector } from '@aurora-is-near/intents-connect-wallet/connect/near';

function Wallets({ children }) {
  const evmSolana = useAppKitConnector();
  const near = useNearConnector();
  const selector = useWalletSelector([evmSolana, near]);

  return (
    <>
      <IntentsConnectProvider api={api} wallet={toWalletConnector(selector)}>
        {children}
      </IntentsConnectProvider>
      <WalletSelectorModal
        open={selector.isOpen}
        onClose={selector.close}
        options={[EVM_SOLANA_WALLET_OPTION, NEAR_WALLET_OPTION]}
        onSelect={selector.select}
      />
    </>
  );
}
```

Wrap the tree in `<AppKitProvider>` when using `./connect/appkit`.

Each connector carries the runner-facing members (`signingStandard`,
`getPublicKey`, `getChainId`, `decodePublicKey`, `getProviders`), so the
adapter to `intents-connect`'s `WalletConnector` is a thin projection of
`selector.connected`:

```ts
const toWalletConnector = (selector: WalletSelectorState) => {
  const { connected } = selector;

  if (!connected?.signingStandard) return null;

  return {
    id: connected.id,
    name: connected.id,
    chains: [],
    signingStandard: connected.signingStandard,
    connect: async () => connected.connect(),
    disconnect: async () => connected.disconnect(),
    getAddress: () => connected.address,
    getPublicKey: connected.getPublicKey,
    getChainId: connected.getChainId,
    decodePublicKey: connected.decodePublicKey,
    getProviders: () => connected.getProviders?.() ?? {},
  };
};
```

Connections are **mutually exclusive**: an execution is bound to one origin
wallet, since both the signing standard and the intermediary address follow from
it. `select()` disconnects the others first.

### Mobile wallets by QR, headless

`./connect/walletconnect` pairs an EVM mobile wallet over WalletConnect v2
without any modal. You render the pairing URI as a QR yourself. The session
persists in the browser, so `getPeer()` restores it after a reload without UI.

```ts
import {
  createWalletConnectClient,
  PAIRING_TTL_MS,
  toWalletConnectConnector,
} from '@aurora-is-near/intents-connect-wallet/connect/walletconnect';

const walletConnect = createWalletConnectClient({
  projectId, // your WalletConnect Cloud project; defaults to Aurora's
  metadata: { name: 'My app', url: location.origin },
});

// On "Connect with phone": render `uri` as a QR; abortPairing() after PAIRING_TTL_MS.
const peer = await walletConnect.pair((uri) => showQr(uri));
const connector = toWalletConnectConnector(walletConnect, peer);
```

Chain switches stay local to the provider (the session covers every EVM chain
the engine routes). A transfer on a chain the phone wallet did not approve fails
in the wallet. `onSessionEnd` reports a session the wallet ended from its side.

Pass `storagePrefix` when the page may run WalletConnect itself, as a script
injected into a dapp does. WalletConnect shares one Core per prefix through
`globalThis`, so without one the client would reuse the page's Core (its
project and its sessions) and write to the same storage keys.

## Detection

`./detect` finds wallets injected into the page — EVM over EIP-6963, Solana
over the Wallet Standard, NEAR over near-connect's injection protocol — and the
accounts they already share with the site, without prompting. Ported from the
Chrome extensions' page bridge, minus the extension plumbing; unlike it, every
listener is removed on `destroy()`.

```ts
import {
  createWalletDetector,
  pickConnectedWallet,
} from '@aurora-is-near/intents-connect-wallet/detect';
import { toEvmWalletConnector } from '@aurora-is-near/intents-connect-wallet/evm';

const detector = createWalletDetector();
detector.subscribe(() => {
  const detected = pickConnectedWallet(detector.getSnapshot().wallets, ['evm']);
  const { connector } = detected?.family === 'evm'
    ? toEvmWalletConnector(detected)
    : { connector: null };
});
```

Detection never prompts, and only calls a wallet when that is safe:

- **EVM** is read with `eth_accounts`, which never prompts.
- **Solana** is read from `wallet.accounts`.
- **NEAR and Solana wallets the user connected here** are restored silently:
  `getAccounts`, or `connect({ silent: true })` once per page.
- **No other wallet is called.** Some open their UI even when asked to stay
  silent (HOT, the Solflare Snap), or answer an account read with a sign-in.

`connectDetectedWallet(wallet)` is the one call that prompts. Run it from a
user gesture, then `refresh()`. It records the wallet in localStorage
(`intents-connect.connectedWallets`).

`disconnectDetectedWallet(wallet)` forgets it again and asks the wallet to
revoke the connection, where it can. `pickConnectedWallet` skips a wallet the
user disconnected, even one that still shares an account.

Each chain subpath has the adapter for its family — `toEvmWalletConnector`,
`toSolanaWalletConnector` (plus `standardWalletToSolanaProvider`) and
`toNearWalletConnector`, which also accepts `./connect/near` state for the
sandboxed wallets detection cannot see. They return
`{ connector, unsupportedReason? }` rather than throwing.

Other families plug in from their own subpaths, so `./detect` never pulls
their chain SDK: pass their sources to `createWalletDetector({ sources })` or
`useDetectedWallets({ sources })`. A plug-in wallet carries its own
`connect`, `disconnect` and `toConnector` (`PluggableWallet`), which
`connectDetectedWallet`, `disconnectDetectedWallet` and `toWalletConnector`
call; its options go under its family name. A source keeps the same wallet
objects while nothing changed, since the detector compares them by identity.
`rememberWalletAddress` / `getRememberedAddress` let a source restore a wallet
that can't share its address silently; disconnecting clears it.

### Stellar

`./detect/stellar`'s `stellarWallets()` is such a source, over the
stellar-wallets-kit modules for Freighter, xBull, LOBSTR and Hana. Albedo and
Rabet are left out: they can't sign a message.

```ts
import { stellarWallets } from '@aurora-is-near/intents-connect-wallet/detect/stellar';

// Create it once: the detector registry is keyed by source ids.
const sources = [stellarWallets()];
const { wallets } = useDetectedWallets({ sources });
```

- **Availability** is checked once per detector and cached. A wallet that
  isn't installed is never listed; its check waits at least 2.5 s, since some
  extensions answer late. xBull is listed only with its extension: its web
  wallet opens a popup per request, which the browser blocks once the
  payment's signature and transfer come seconds after the click.
- **Freighter** is restored silently (`getAddress({ skipRequestAccess: true })`).
  The others ask on every address read, so they are restored from the address
  remembered when the user connected them.
- **Signing** passes the account to the wallet (Hana needs it) and checks the
  result locally (`isSep53Signature`) before it's submitted. A wallet that signed
  with another account, or not as SEP-53 requires, fails with a named error and
  nothing is sent.
- **Its options** go under `stellar`: `{ stellar: { rpcEndpoints } }` for the
  transfer's Soroban RPC. Balances come from Horizon, through
  `intents-connect`'s `rpcs.stellar`.

### TRON

`./detect/tron`'s `tronWallets()` lists the wallets announced over TIP-6963
(TronLink), or `window.tron` when none is. It needs no dependencies.

- **Its own `tronWeb`.** Each wallet signs and sends with its provider's
  `tronWeb`, never the global `window.tronWeb`, which other wallets
  overwrite. That `tronWeb` exists only once the user connected the site, so
  the account is read from it without a prompt.
- **Connecting** calls `eth_requestAccounts`. TronLink can't revoke a site, so
  disconnecting only forgets it here.
- **Signing** is `tip191` (`signMessageV2`), checked against the account with
  `verifyMessageV2` before it's submitted.
- **The deposit** sends TRX with `sendTrx` or a TRC-20 with
  `transfer(address,uint256)` (a 100 TRX fee limit), and follows it into a
  block. It refuses a wallet on a test network, and a memo. A transfer
  broadcast but not seen in time still returns its hash: failing would offer
  a second one.
- **Rejections.** TronLink rejects with the bare string "Confirmation declined
  by user"; it's rethrown as an Error with code 4001.

`./detect/connector`'s `toWalletConnector(detected, { evm?, sol?, near?, stellar? })`
picks the adapter by family and hands it that family's options (e.g.
`{ sol: { rpcUrl } }`). It pulls every family's transfer code, so it needs
the peers of `./evm` and `./solana`.

## Deviations from the widget

- **AppKit takes config instead of widget constants.** `Theme` collapsed to
  `themeMode`, and `CHAIN_IDS_MAP`/`DEFAULT_RPCS` became an optional
  `rpcOverrides` map that falls back to each chain's public RPC from viem.
  `projectId` is now a prop — it defaults to Aurora's, but register your own.
- **`ethers` is gone.** It was imported for one type, which `intents-connect`
  already provides.
- **Solana's RPC is configurable.** The widget hardcoded an Alchemy URL built
  from an `alchemyApiKey`; pass `rpcUrl` or a `connection` instead.
- **NEAR uses `ft_transfer`, not `ft_transfer_call`,** and does not swallow user
  rejection. See the notes in `src/near/makeTransfer.ts`.


## Solana execution instructions

The `/solana` entry point also prepares instructions for an
`intents-connect` `SolanaRecipe`. Use the concrete intermediary address to derive
accounts; the converter substitutes `{INTERMEDIARY}` in account metadata.

```ts
import {
  createSolanaRecipientAta,
  prepareSolanaSteps,
} from '@aurora-is-near/intents-connect-wallet/solana';

const recipientAta = createSolanaRecipientAta({ intermediary, recipient, mint });
// Request swap instructions that pay recipientAta.address.
const prepared = prepareSolanaSteps(
  [recipientAta.instruction, ...swapInstructions],
  { intermediary, addressLookupTables },
);
// Return prepared from SolanaRecipe.buildSteps.
```

The recipient helper creates a standard SPL ATA idempotently. The converter
preserves instruction bytes, account order, duplicate accounts, and lookup-table
order; it rejects foreign signers and omits compute-budget instructions supplied
by Connect. Supply action instructions only, excluding provider tips and
nonce/fee infrastructure. These helpers perform no network requests or signing.
