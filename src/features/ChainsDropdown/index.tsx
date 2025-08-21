import { Fragment, useMemo } from 'react';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { AnimatePresence, motion } from 'framer-motion';
import * as Icons from 'lucide-react';

import { Hr } from '@/components/Hr';
import { Icon } from '@/components/Icon';
import { useChains } from '@/hooks/useChains';
import { CHAINS_LIST } from '@/constants/chains';
import { notReachable } from '@/utils/notReachable';
import type { Chains, DefaultChainsFilter } from '@/types/chain';

import { ChainItem } from './ChainItem';
import { CalyxIcon } from './CalyxIcon';
import { AllNetworksIcon } from './AllNetworksIcon';

type Msg = { type: 'on_click_chain'; chain: 'all' | 'calyx' | Chains };

type Props = {
  chainsFilter: DefaultChainsFilter;
  selected: 'all' | 'calyx' | Chains;
  onMsg: (msg: Msg) => void;
};

const commonIconProps = {
  radius: 10,
  noLoadedBg: true,
  variant: 'light' as const,
};

export const ChainsDropdown = ({ selected, chainsFilter, onMsg }: Props) => {
  const chains = useChains();
  const selectedChain = useMemo(
    () => chains.find((item) => item.id === selected),
    [chains, selected],
  );

  return (
    <Menu>
      {({ open, close }) => (
        <div>
          <MenuButton as={Fragment}>
            {({ open }) => (
              <div className="py-ds-sm px-ds-md gap-ds-md flex h-[42px] cursor-pointer items-center rounded-md bg-gray-500">
                {(() => {
                  switch (selected) {
                    case 'all':
                      return (
                        <Icon
                          {...commonIconProps}
                          icon={<AllNetworksIcon />}
                          label="All networks"
                        />
                      );
                    case 'calyx':
                      return (
                        <Icon
                          {...commonIconProps}
                          icon={<CalyxIcon />}
                          label="Calyx account"
                        />
                      );
                    default:
                      return !selectedChain ? (
                        <Icon
                          {...commonIconProps}
                          icon={<AllNetworksIcon />}
                          label="All networks"
                        />
                      ) : (
                        <Icon
                          {...commonIconProps}
                          label={selectedChain.label}
                          icon={CHAINS_LIST[selected].icon}
                        />
                      );
                  }
                })()}

                {open ? (
                  <Icons.ChevronUp size={18} className="text-gray-50" />
                ) : (
                  <Icons.ChevronDown size={18} className="text-gray-50" />
                )}
              </div>
            )}
          </MenuButton>

          <AnimatePresence>
            {open && (
              <MenuItems
                static
                as={motion.div}
                animate={{ opacity: 1, scale: 1 }}
                initial={{ opacity: 0, scale: 0.95 }}
                anchor={{ to: 'bottom end', gap: 8, padding: 32 }}
                className="hide-scrollbar gap-ds-md p-ds-md z-10 flex max-h-[400px] min-w-[200px] flex-col rounded-lg bg-gray-900 shadow-lg ring-1 ring-gray-600 outline-none">
                <MenuItem>
                  <ChainItem
                    chain="all"
                    label="All networks"
                    isSelected={selected === 'all'}
                    icon={<AllNetworksIcon />}
                    onMsg={(msg) => {
                      switch (msg.type) {
                        case 'on_click_chain':
                          close();
                          onMsg(msg);
                          break;
                        default:
                          notReachable(msg.type, { throwError: false });
                      }
                    }}
                  />
                </MenuItem>

                {chainsFilter.calyx !== 'none' && (
                  <MenuItem>
                    <ChainItem
                      chain="calyx"
                      label="Calyx account"
                      isSelected={selected === 'calyx'}
                      icon={<CalyxIcon />}
                      onMsg={(msg) => {
                        switch (msg.type) {
                          case 'on_click_chain':
                            close();
                            onMsg(msg);
                            break;
                          default:
                            notReachable(msg.type, { throwError: false });
                        }
                      }}
                    />
                  </MenuItem>
                )}

                {chains.length > 0 && <Hr className="shrink-0" />}
                {chains.map((chain) => {
                  return (
                    <MenuItem key={chain.id}>
                      <ChainItem
                        chain={chain.id}
                        label={chain.label}
                        icon={CHAINS_LIST[chain.id].icon}
                        isSelected={selected === chain.id}
                        onMsg={(msg) => {
                          switch (msg.type) {
                            case 'on_click_chain':
                              close();
                              onMsg(msg);
                              break;
                            default:
                              notReachable(msg.type, { throwError: false });
                          }
                        }}
                      />
                    </MenuItem>
                  );
                })}
              </MenuItems>
            )}
          </AnimatePresence>
        </div>
      )}
    </Menu>
  );
};
