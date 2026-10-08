import { createPortal } from 'react-dom';

import { Button } from '@aurora-is-near/intents-swap-widget';
import { cn } from '@aurora-is-near/intents-swap-widget/utils';

import { Icon } from '../../components/Icon';
import { Screen } from '../../components/Screen';
import type { WalletOption } from './walletOptions';

type Props<T extends WalletOption> = {
  title: string;
  /** Under the title, what picking does. */
  description?: string;
  options: T[];
  selectedId?: string;
  onSelect: (option: T) => void;
  onClose: () => void;
  /** Offers connecting another wallet, at the bottom. */
  onConnect?: () => void;
};

/**
 * One of the account's wallets (or the account itself), as a whole screen
 * over the current one, like the token picker. In a portal: the widget's
 * container would otherwise be the fixed position's frame.
 */
export const WalletPicker = <T extends WalletOption>({
  title,
  description,
  options,
  selectedId,
  onSelect,
  onClose,
  onConnect,
}: Props<T>) =>
  createPortal(
    <div className="sw fixed inset-[0px] z-10">
      <Screen
        title={title}
        onBack={onClose}
        footer={
          onConnect ? (
            <Button variant="outlined" size="lg" onClick={onConnect}>
              Connect another wallet
            </Button>
          ) : null
        }>
        {description ? (
          <p className="m-0 px-sw-xs text-sw-body-sm text-sw-gray-300">
            {description}
          </p>
        ) : null}
        <ul className="m-0 flex flex-col p-0" role="listbox" aria-label={title}>
          {options.map((option) => {
            const isSelected = option.id === selectedId;

            return (
              <li key={option.id} className="list-none">
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => onSelect(option)}
                  className={cn(
                    'flex w-full items-center gap-sw-lg rounded-sw-md p-sw-lg text-left hover:bg-sw-gray-900',
                    isSelected && 'bg-sw-gray-900',
                  )}>
                  {option.icon}
                  <span className="flex min-w-[0px] grow flex-col gap-sw-xs">
                    <span className="truncate text-sw-label-md text-sw-gray-50">
                      {option.name}
                    </span>
                    <span className="truncate text-sw-label-sm text-sw-gray-300">
                      {option.detail}
                    </span>
                  </span>
                  {isSelected ? (
                    <span className="text-sw-accent-300">
                      <Icon name="check" size={18} />
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </Screen>
    </div>,
    document.body,
  );
