import { useState } from 'react';

import { CHAINS } from '@aurora-is-near/intents-swap-widget';
import type { Token } from '@aurora-is-near/intents-swap-widget';
import { cn } from '@aurora-is-near/intents-swap-widget/utils';

import { Icon } from '../../components/Icon';

const ChainIcon = ({ token, size }: { token: Token; size: number }) => (
  <span
    aria-hidden="true"
    style={{ width: size, height: size }}
    className="flex shrink-0 overflow-hidden rounded-full">
    {CHAINS.find((chain) => chain.id === token.blockchain)?.icon ?? null}
  </span>
);

type Props = {
  /** The asset on each network it can be sent to. */
  options: Token[];
  selected: Token | undefined;
  onSelect: (token: Token) => void;
};

/** "Use network": which chain the sent asset arrives on. */
export const NetworkSelect = ({ options, selected, onSelect }: Props) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex shrink-0 flex-col gap-sw-md">
      <span
        id="network-label"
        className="px-sw-xs text-sw-label-sm text-sw-gray-200">
        Use network
      </span>
      <button
        type="button"
        aria-labelledby="network-label"
        aria-expanded={isOpen}
        disabled={!options.length}
        onClick={() => setIsOpen((open) => !open)}
        className="flex items-center gap-sw-md rounded-sw-lg bg-sw-gray-900 px-sw-xl py-sw-lg text-left hover:bg-sw-gray-800 disabled:opacity-60">
        {selected ? (
          <>
            <ChainIcon token={selected} size={24} />
            <span className="text-sw-label-lg text-sw-gray-50">
              {selected.chainName}
            </span>
          </>
        ) : (
          <span className="text-sw-label-lg text-sw-gray-300">
            {options.length ? 'Choose a network' : 'No networks for this token'}
          </span>
        )}
        <span
          className={cn(
            'ml-auto text-sw-gray-200 transition-transform',
            isOpen && 'rotate-180',
          )}>
          <Icon name="chevronDown" />
        </span>
      </button>

      {isOpen ? (
        <div
          role="listbox"
          aria-labelledby="network-label"
          className="flex flex-col gap-sw-xs rounded-sw-lg bg-sw-gray-900 p-sw-md">
          {options.map((token) => {
            const isSelected = token.blockchain === selected?.blockchain;

            return (
              <button
                key={token.blockchain}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onSelect(token);
                  setIsOpen(false);
                }}
                className={cn(
                  'flex items-center gap-sw-md rounded-sw-md px-sw-md py-sw-md text-left hover:bg-sw-gray-800',
                  isSelected && 'bg-sw-gray-800',
                )}>
                <ChainIcon token={token} size={22} />
                <span className="grow text-sw-label-md text-sw-gray-50">
                  {token.chainName}
                </span>
                {isSelected ? (
                  <span className="text-sw-accent-300">
                    <Icon name="check" size={16} />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};
