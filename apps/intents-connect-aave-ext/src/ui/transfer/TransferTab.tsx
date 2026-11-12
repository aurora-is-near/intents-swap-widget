import { ChainIcon } from '../assets/ChainIcon';
import { chainLabel } from '../assets/tokens';
import { Steps } from '../Steps';
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

/** How many network icons a row shows before "+N". */
const ICONS_SHOWN = 8;
/** How many network names a sentence spells out before "and more". */
const NAMED = 3;

/** A row of overlapping network icons, then "+N" for the rest. */
const NetworkIcons = ({ chains }: { chains: readonly string[] }) => (
  <span aria-hidden="true" className="inline-flex items-center">
    {chains.slice(0, ICONS_SHOWN).map((chain, index) => (
      <span
        key={chain}
        className={
          index
            ? '-ml-1 rounded-full ring-2 ring-surface-raised'
            : 'rounded-full'
        }>
        <ChainIcon chain={chain} size={18} />
      </span>
    ))}
    {chains.length > ICONS_SHOWN ? (
      <span className="ml-1.5 text-xs text-text-muted">
        +{chains.length - ICONS_SHOWN}
      </span>
    ) : null}
  </span>
);

const named = (chains: readonly string[]) =>
  chains.length > NAMED
    ? `${chains.slice(0, NAMED).map(chainLabel).join(', ')} and more`
    : chains.map(chainLabel).join(', ');

/**
 * The wallet screen's Transfer tab: pay by sending to a deposit address,
 * from an exchange or any wallet, in three steps. A wallet on the sending
 * network signs once: the dApp's own wallet for EVM networks.
 */
export const TransferTab = ({
  networks,
  dappName,
  dappWallet,
  onStart,
}: {
  /** Chain ids, most used first; empty while they load. */
  networks: readonly string[];
  dappName: string;
  /** The dApp's EVM wallet, when detection sees it. */
  dappWallet?: { name: string; address: string };
  onStart: () => void;
}) => {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 rounded-card bg-surface-raised p-4 shadow-box">
        <p className="font-medium">Send from an exchange or any wallet</p>
        <Steps
          label="How paying by transfer works"
          steps={[
            {
              id: 'pick',
              title: 'Pick a token and its network',
              detail: networks.length ? (
                <div className="flex flex-col gap-1.5">
                  <NetworkIcons chains={networks} />
                  <span>
                    {networks.length} networks: {named(networks)}.
                  </span>
                </div>
              ) : undefined,
            },
            {
              id: 'sign',
              title: 'Sign once',
              detail: dappWallet
                ? `On EVM networks, ${dappWallet.name} · ${truncateMiddle(dappWallet.address)}. On others, their own wallet.`
                : `On EVM networks, your ${dappName} wallet. On others, their own wallet.`,
            },
            {
              id: 'send',
              title: 'Send to the address or QR code',
              detail:
                'From an exchange or any wallet. A refund goes back to the wallet that signed.',
            },
          ]}
        />
      </div>
      <Button variant="primary" className="w-full" onClick={onStart}>
        Choose what to send
      </Button>
    </div>
  );
};
