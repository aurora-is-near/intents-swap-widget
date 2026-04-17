import { Fragment } from 'react';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { ChevronLeftW700 as ChevronLeft } from '@material-symbols-svg/react-rounded/icons/chevron-left';
import { AnimatePresence, motion } from 'framer-motion';

import { ChainItem } from './ChainItem';
import { Hr } from '@/components/Hr';
import { AllNetworksIcon } from '@/components/AllNetworksIcon';
import { useChains } from '@/hooks/useChains';
import { useTheme } from '@/hooks/useTheme';
import { notReachable } from '@/utils/notReachable';
import { useTypedTranslation } from '@/localisation';
import { CHAIN_ICONS, NEAR_INTENTS_ICON, UNKNOWN_ICON } from '@/icons';
import { getThemeCssVariables } from '@/theme/getThemeCssVariables';
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
  const theme = useTheme();
  const themeCssVariables = getThemeCssVariables(theme);

  const chains = useChains(variant);

  const hasIntentsAccountMenuItem = chainsFilter.intents !== 'none';
  const numberOfItems = chains.length + (hasIntentsAccountMenuItem ? 1 : 0);

  if (numberOfItems < 2) {
    return null;
  }

  return (
    <Menu>
      {({ open, close }) => (
        <div>
          <MenuButton as={Fragment}>
            {({ open: isOpen }) => (
              <div className="py-sw-sm pr-sw-md pl-sw-lg gap-sw-xs flex h-[36px] cursor-pointer items-center rounded-sw-md bg-sw-gray-800 hover:bg-sw-gray-700">
                <span className="text-sw-label-md text-sw-gray-50">
                  {t('chain.more.label', 'More')}
                </span>

                {isOpen ? (
                  <ChevronLeft
                    size={18}
                    className="text-sw-gray-50 rotate-90"
                  />
                ) : (
                  <ChevronLeft
                    size={18}
                    className="text-sw-gray-50 -rotate-90"
                  />
                )}
              </div>
            )}
          </MenuButton>

          <AnimatePresence>
            {open && (
              <MenuItems
                static
                anchor={{ to: 'bottom end', gap: 8, padding: 32 }}
                style={themeCssVariables}
                className="sw hide-scrollbar overflow-y-auto z-10 max-h-[400px] min-w-[200px] rounded-sw-lg bg-sw-gray-800 shadow-[0_6px_48px_0_rgba(36,38,45,0.3)] ring-1 ring-inset ring-sw-gray-700 outline-none">
                <motion.div
                  animate={{ opacity: 1, scale: 1 }}
                  initial={{ opacity: 0, scale: 0.95 }}
                  className="flex w-full flex-col gap-sw-xxs p-sw-md">
                  {chains.length > 1 && (
                    <MenuItem>
                      {({ focus }) => (
                        <ChainItem
                          chain="all"
                          label="All networks"
                          isSelected={selected === 'all'}
                          isFocused={focus}
                          icon={<AllNetworksIcon />}
                          iconClassName="bg-sw-gray-50"
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
                          label="Near Intents"
                          isSelected={selected === 'intents'}
                          isFocused={focus}
                          icon={NEAR_INTENTS_ICON}
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
                            icon={CHAIN_ICONS[chain.id] ?? UNKNOWN_ICON}
                            isSelected={selected === chain.id}
                            isFocused={focus}
                            onMsg={(msg) => {
                              switch (msg.type) {
                                case 'on_click_chain':
                                  close();
                                  onMsg(msg);
                                  break;
                                default:
                                  notReachable(msg.type, {
                                    throwError: false,
                                  });
                              }
                            }}
                          />
                        )}
                      </MenuItem>
                    );
                  })}
                </motion.div>
              </MenuItems>
            )}
          </AnimatePresence>
        </div>
      )}
    </Menu>
  );
};
