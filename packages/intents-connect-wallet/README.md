# @aurora-is-near/intents-connect-wallet

Chain wallets for [`@aurora-is-near/intents-connect`](../intents-connect):
deposit transfers and wallet connection, **one subpath per chain**.

Ported from `intents-swap-widget-evm/-solana/-stellar`, the widget's
`useMakeNEARFtTransferCall` hook, and `intents-swap-widget-standalone` — with no
dependency on the widget.

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
| `./stellar` | Stellar transfer + `decodePublicKey` | `@stellar/stellar-sdk` |
| `./near` | NEAR deposit transfer | — (plain `fetch`) |
| `./connect` | modal, presets, coordinator | `react`, `@headlessui/react` |
| `./connect/appkit` | EVM + Solana connectors | `@reown/*`, `@solana/wallet-adapter-*`, `viem` |
| `./connect/near` | NEAR connector | `@hot-labs/near-connect` |
| `./connect/stellar` | Stellar connector | `@creit.tech/stellar-wallets-kit`, `@stellar/stellar-sdk` |

Install only what you use — e.g. EVM with our modal:

```bash
yarn add @aurora-is-near/intents-connect @aurora-is-near/intents-connect-wallet \
         viem react @headlessui/react @reown/appkit @reown/appkit-adapter-ethers
```

## Transfers

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
