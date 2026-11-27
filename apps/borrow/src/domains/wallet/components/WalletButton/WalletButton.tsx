import { Button } from '@aurora-is-near/ui-kit';
import { Popover } from '@base-ui/react/popover';

import { formatAddress } from '@/utils/formatAddress';

import { useConnectWallet } from '../../hooks/useConnectWallet';
import { useWallet } from '../../hooks/useWallet';

/**
 * The connected wallet: a green dot and the shortened address. A click opens
 * a popover that asks before disconnecting, with a danger Disconnect and a
 * Cancel; Escape or a click outside closes it too.
 */
function ConnectedWallet({
  label,
  disconnect,
}: {
  label: string;
  disconnect: () => unknown;
}) {
  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label={`Wallet ${label} connected`}
        className="inline-flex cursor-pointer items-center gap-2 rounded-12 border-1.5 border-solid border-bd2 bg-sf px-4 py-2.5 font-[inherit] text-15 font-semibold leading-font text-ink hover:border-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink focus-visible:outline-solid data-popup-open:border-ink mobile:px-3 mobile:py-2 mobile:text-14">
        {/* The artboard's dot is #5E9E12 in both themes; no kit token holds it. */}
        <span
          aria-hidden="true"
          className="inline-block h-2 w-2 rounded-full bg-live"
        />
        <span>{label}</span>
      </Popover.Trigger>
      <Popover.Portal>
        {/* 8px under the button, its right edge on the button's. */}
        <Popover.Positioner align="end" side="bottom" sideOffset={8}>
          {/* The kit's popup look (TokenSelect's `.panel`): `sf`, 1.5px ink
              border, radius 18, the popup shadow. It scales out of the
              button, 200ms in and 150ms out; under reduced motion it only
              fades. */}
          <Popover.Popup className="box-border w-72 max-w-(--available-width) origin-(--transform-origin) rounded-18 border-1.5 border-solid border-ink bg-sf p-4 font-sans leading-font text-ink shadow-popup outline-none transition-[opacity,scale] duration-200 ease-out data-ending-style:scale-95 data-ending-style:opacity-0 data-ending-style:duration-150 data-starting-style:scale-95 data-starting-style:opacity-0 motion-reduce:data-ending-style:scale-100 motion-reduce:data-starting-style:scale-100">
            <Popover.Title className="m-0 text-16 font-bold">
              Disconnect wallet?
            </Popover.Title>
            <Popover.Description className="mt-1 mb-0 text-14/normal text-mut">
              {label} will be disconnected from Borrow.
            </Popover.Description>
            <div className="mt-4 flex items-center justify-end gap-4">
              <Popover.Close render={<Button variant="link" />}>
                Cancel
              </Popover.Close>
              <Popover.Close
                render={<Button size="md" variant="danger" />}
                onClick={() => {
                  // A failed disconnect leaves the button connected, which
                  // shows it.
                  Promise.resolve(disconnect()).catch(() => {});
                }}>
                Disconnect
              </Popover.Close>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

/**
 * Connects through the wallet modal when disconnected. Connected, it shows a
 * green dot and the shortened address, and a click asks before
 * disconnecting.
 */
export function WalletButton() {
  const { address, isConnected, disconnect } = useWallet();
  const connectWallet = useConnectWallet();

  if (isConnected && address) {
    return (
      <ConnectedWallet disconnect={disconnect} label={formatAddress(address)} />
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
