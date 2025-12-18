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
import { notReachable } from '@/utils/notReachable';
import { useTypedTranslation } from '@/localisation';
import { ASSET_ICONS, UNKNOWN_ICON } from '@/icons';
import type { Chains, ChainsFilter } from '@/types/chain';

type Msg = { type: 'on_click_chain'; chain: 'all' | 'intents' | Chains };

type Props = {
  variant: 'source' | 'target';
  chainsFilter: ChainsFilter;
  selected: 'all' | 'intents' | Chains;
  onMsg: (msg: Msg) => void;
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
              <div className="py-sw-sm px-sw-md gap-sw-md flex h-[40px] cursor-pointer items-center rounded-sw-md bg-sw-gray-800 hover:bg-sw-gray-700">
                {(() => {
                  switch (selected) {
                    case 'all':
                      return (
                        <Icon
                          radius={10}
                          icon={<AllNetworksIcon />}
                          label="All networks"
                        />
                      );
                    case 'intents':
                      return showIntentTokens ? (
                        <Icon radius={10} icon={appIcon} label={appName} />
                      ) : null;
                    default:
                      return !selectedChain ? (
                        <Icon
                          radius={10}
                          icon={<AllNetworksIcon />}
                          label={t('chain.all.label', 'All networks')}
                        />
                      ) : (
                        <Icon
                          radius={10}
                          label={selectedChain.label}
                          icon={ASSET_ICONS[selected] ?? UNKNOWN_ICON}
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
                className="hide-scrollbar gap-sw-xxs p-sw-md z-10 flex max-h-[400px] min-w-[200px] flex-col rounded-sw-lg bg-sw-gray-800 shadow-[0_6px_48px_0_rgba(36,38,45,0.3)] ring-1 ring-inset ring-sw-gray-700 outline-none">
                {chains.length > 1 && (
                  <MenuItem>
                    {({ focus }) => (
                      <ChainItem
                        chain="all"
                        label="All networks"
                        isSelected={selected === 'all'}
                        isFocused={focus}
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
                    )}
                  </MenuItem>
                )}

                {hasIntentsAccountMenuItem && (
                  <MenuItem>
                    {({ focus }) => (
                      <ChainItem
                        chain="intents"
                        label={appName}
                        isSelected={selected === 'intents'}
                        isFocused={focus}
                        icon={appIcon ?? UNKNOWN_ICON}
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
                    )}
                  </MenuItem>
                )}

                {!!chains.length &&
                  !!(chains.length > 1 || hasIntentsAccountMenuItem) && (
                    <Hr className="shrink-0 my-sw-sm bg-sw-gray-700" />
                  )}

                {chains.map((chain) => {
                  return (
                    <MenuItem key={chain.id}>
                      {({ focus }) => (
                        <ChainItem
                          chain={chain.id}
                          label={chain.label}
                          icon={ASSET_ICONS[chain.id] ?? UNKNOWN_ICON}
                          isSelected={selected === chain.id}
                          isFocused={focus}
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
                      )}
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
