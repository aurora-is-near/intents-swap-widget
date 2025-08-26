import { Fragment, useMemo } from 'react';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { AnimatePresence, motion } from 'framer-motion';
import * as Icons from 'lucide-react';

import { useConfig } from '@/config';
import { Hr } from '@/components/Hr';
import { Icon } from '@/components/Icon';
import { useChains } from '@/hooks/useChains';
import { CHAINS_LIST } from '@/constants/chains';
import { notReachable } from '@/utils/notReachable';
import type { Chains, DefaultChainsFilter } from '@/types/chain';

import { ChainItem } from './ChainItem';
import { AllNetworksIcon } from './AllNetworksIcon';

type Msg = { type: 'on_click_chain'; chain: 'all' | 'intents' | Chains };

type Props = {
  chainsFilter: DefaultChainsFilter;
  selected: 'all' | 'intents' | Chains;
  onMsg: (msg: Msg) => void;
};

const commonIconProps = {
  radius: 10,
  noLoadedBg: true,
  variant: 'light' as const,
};

export const ChainsDropdown = ({ selected, chainsFilter, onMsg }: Props) => {
  const chains = useChains();
  const { appIcon, appName, showIntentTokens } = useConfig();
  const selectedChain = useMemo(
    () => chains.find((item) => item.id === selected),
    [chains, selected],
  );

  return (
    <Menu>
      {({ open, close }) => (
        <div>
          <MenuButton as={Fragment}>
            {({ open: isOpen }) => (
              <div className="py-sw-sm px-sw-md gap-sw-md flex h-[42px] cursor-pointer items-center rounded-sw-md bg-sw-gray-500">
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
                    case 'intents':
                      return showIntentTokens ? (
                        <Icon
                          {...commonIconProps}
                          icon={appIcon}
                          label={`${appName} account`}
                        />
                      ) : null;
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

                {isOpen ? (
                  <Icons.ChevronUp size={18} className="text-sw-gray-50" />
                ) : (
                  <Icons.ChevronDown size={18} className="text-sw-gray-50" />
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
                className="hide-scrollbar gap-sw-md p-sw-md z-10 flex max-h-[400px] min-w-[200px] flex-col rounded-sw-lg bg-sw-gray-900 shadow-lg border border-sw-gray-600 outline-none">
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

                {chainsFilter.intents !== 'none' && (
                  <MenuItem>
                    <ChainItem
                      chain="intents"
                      label={`${appName} account`}
                      isSelected={selected === 'intents'}
                      icon={appIcon}
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
