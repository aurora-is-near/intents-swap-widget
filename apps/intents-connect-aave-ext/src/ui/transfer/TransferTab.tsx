import { Button, truncateMiddle } from '../ui';

/** Two arrows, there and back: a transfer. */
export const TransferIcon = () => (
  <svg
    width={14}
    height={14}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden>
    <path d="M7 7h12l-3-3" />
    <path d="M17 17H5l3 3" />
  </svg>
);

/** How many network names the tab spells out before "and N more". */
const NAMED = 5;

const networkList = (networks: readonly string[]) =>
  networks.length > NAMED
    ? `${networks.slice(0, NAMED).join(', ')} and ${networks.length - NAMED} more`
    : networks.join(', ');

/**
 * The wallet screen's Transfer tab: pay by sending to a deposit address,
 * from an exchange or any wallet. A wallet on the sending network signs
 * once (the dApp's own wallet for EVM networks).
 */
export const TransferTab = ({
  networks,
  dappName,
  dappWallet,
  onStart,
}: {
  /** Network names, most used first; empty while they load. */
  networks: readonly string[];
  dappName: string;
  /** The dApp's EVM wallet, when detection sees it. */
  dappWallet?: { name: string; address: string };
  onStart: () => void;
}) => (
  <div className="flex flex-col gap-4">
    <div className="flex flex-col gap-2 rounded-card bg-surface-raised p-4 shadow-box">
      <p className="font-medium">Send from an exchange or any wallet</p>
      <p className="text-text-secondary">
        {networks.length
          ? `On ${networkList(networks)}. You get an address and a QR code to send to.`
          : 'You get an address and a QR code to send to.'}
      </p>
      <p className="text-text-secondary">
        {dappWallet
          ? `You sign once with a wallet on that network: ${dappWallet.name} · ${truncateMiddle(dappWallet.address)}, the wallet on ${dappName}, for EVM networks.`
          : 'You sign once with a wallet on that network.'}{' '}
        A refund goes back to that wallet.
      </p>
    </div>
    <Button variant="primary" className="w-full" onClick={onStart}>
      Choose what to send
    </Button>
  </div>
);
