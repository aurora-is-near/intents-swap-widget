import { useIntentsConnectWallet } from '@aurora-is-near/intents-connect-wallet/connect/appkit';

import { formatAddress } from '@/utils/formatAddress';

import { useConnectWallet } from '../../hooks/useConnectWallet';

/**
 * The `.wal` button (Web-Borrow-NotConnected.dc.html line 21, 640px block
 * line 113): `sf` fill, 1.5px `bd2` border (ink on hover), radius 12,
 * padding 10px 16px, 15px / 600, gap 8; padding 8px 12px and 14px at ≤640px.
 */
const WALLET_BUTTON =
  'inline-flex cursor-pointer items-center gap-2 rounded-12 border-1.5 border-solid border-bd2 bg-sf px-4 py-2.5 font-[inherit] text-15 font-semibold leading-font text-ink hover:border-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink focus-visible:outline-solid mobile:px-3 mobile:py-2 mobile:text-14';

/**
 * Connects through the AppKit modal when disconnected. Connected, it shows a
 * green dot and the shortened address, and a click disconnects.
 */
export function WalletButton() {
  const { address, isConnected, disconnect } = useIntentsConnectWallet();
  const connectWallet = useConnectWallet();

  if (isConnected && address) {
    const label = formatAddress(address);

    return (
      <button
        aria-label={`Wallet ${label} connected. Click to disconnect`}
        className={WALLET_BUTTON}
        onClick={() => {
          // A failed disconnect leaves the button connected, which shows it.
          Promise.resolve(disconnect()).catch(() => {});
        }}
        type="button">
        {/* The artboard's dot is #5E9E12 in both themes; no kit token holds it. */}
        <span
          aria-hidden="true"
          className="inline-block h-2 w-2 rounded-full bg-live"
        />
        <span>{label}</span>
      </button>
    );
  }

  return (
    <button className={WALLET_BUTTON} onClick={connectWallet} type="button">
      Connect wallet
    </button>
  );
}
