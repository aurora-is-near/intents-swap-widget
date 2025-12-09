import { Fragment, useMemo } from 'react';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { AnimatePresence, motion } from 'framer-motion';
import * as Icons from 'lucide-react';

import { ChainItem } from './ChainItem';
import { AllNetworksIcon } from './AllNetworksIcon';
import { useConfig } from '@/config';
import { Hr } from '@/components/Hr';
import { Icon } from '@/components/Icon';
import { useChains } from '@/hooks/useChains';
import { CHAINS_LIST } from '@/constants/chains';
import { notReachable } from '@/utils/notReachable';
import { useTypedTranslation } from '@/localisation';
import type { Chains, ChainsFilter } from '@/types/chain';

type Msg = { type: 'on_click_chain'; chain: 'all' | 'intents' | Chains };

type Props = {
  variant: 'source' | 'target';
  chainsFilter: ChainsFilter;
  selected: 'all' | 'intents' | Chains;
  onMsg: (msg: Msg) => void;
};

const commonIconProps = {
  radius: 10,
  noLoadedBg: true,
  variant: 'light' as const,
};

export const ChainsDropdown = ({
  variant,
  selected,
  chainsFilter,
  onMsg,
}: Props) => {
  const { t } = useTypedTranslation();

  const chains = useChains(variant);
  const { appIcon, appName, showIntentTokens } = useConfig();
  const selectedChain = useMemo(
    () => chains.find((item) => item.id === selected),
    [chains, selected],
  );

  const hasIntentsAccountMenuItem = chainsFilter.intents !== 'none';

  return (
    <Menu>
      {({ open, close }) => (
        <div>
          <MenuButton as={Fragment}>
            {({ open: isOpen }) => (
              <div className="py-sw-sm px-sw-md gap-sw-md flex h-[40px] cursor-pointer items-center rounded-sw-md bg-sw-gray-600 hover:bg-sw-gray-500">
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
                          label={appName}
                        />
                      ) : null;
                    default:
                      return !selectedChain ? (
                        <Icon
                          {...commonIconProps}
                          icon={<AllNetworksIcon />}
                          label={t('chain.all.label', 'All networks')}
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
                className="hide-scrollbar gap-sw-xxs p-sw-md z-10 flex max-h-[400px] min-w-[200px] flex-col rounded-sw-lg bg-sw-gray-900 shadow-lg ring-1 ring-inset ring-sw-gray-600 outline-none">
                {chains.length > 1 && (
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
                )}

                {hasIntentsAccountMenuItem && (
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

                {!!chains.length &&
                  !!(chains.length > 1 || hasIntentsAccountMenuItem) && (
                    <Hr className="shrink-0 my-sw-sm" />
                  )}

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
