import { formatAddress } from '@/utils/formatAddress';

import { useConnectWallet } from '../../hooks/useConnectWallet';
import { useWallet } from '../../hooks/useWallet';

/**
 * Connects through the wallet modal when disconnected. Connected, it shows a
 * green dot and the shortened address, and a click disconnects.
 */
export function WalletButton() {
  const { address, isConnected, disconnect } = useWallet();
  const connectWallet = useConnectWallet();

  if (isConnected && address) {
    const label = formatAddress(address);

    return (
      <button
        aria-label={`Wallet ${label} connected. Click to disconnect`}
        className="inline-flex cursor-pointer items-center gap-2 rounded-12 border-1.5 border-solid border-bd2 bg-sf px-4 py-2.5 font-[inherit] text-15 font-semibold leading-font text-ink hover:border-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink focus-visible:outline-solid mobile:px-3 mobile:py-2 mobile:text-14"
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
    <button
      className="inline-flex cursor-pointer items-center gap-2 rounded-12 border-1.5 border-solid border-bd2 bg-sf px-4 py-2.5 font-[inherit] text-15 font-semibold leading-font text-ink hover:border-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink focus-visible:outline-solid mobile:px-3 mobile:py-2 mobile:text-14"
      onClick={connectWallet}
      type="button">
      Connect wallet
    </button>
  );
}
