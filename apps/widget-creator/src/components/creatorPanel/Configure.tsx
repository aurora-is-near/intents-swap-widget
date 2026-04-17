import { Edit, ExternalLink } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import {
  ASSET_ICONS,
  CHAINS,
  Chains,
  Icon,
} from '@aurora-is-near/intents-swap-widget';
import { Button, OutlinedButton } from '../../uikit/Button';
import { TextInput } from '../../uikit/TextInput';
import { ConfigSection } from '../../uikit/ConfigSection';
import { TokenTag } from '../../uikit/TokenTag';
import { useCreator } from '../../hooks/useCreatorConfig';
import { RadioButton } from '../../uikit/RadioButton';
import { Toggle } from '../../uikit/Toggle';
import { TokenSelectionModal } from './TokenSelectionModal';
import { TokenWithChainSelector } from './TokenWithChainSelectorModal';
import {
  isTokenAvailable,
  useTokensGroupedBySymbol,
} from '../../hooks/useTokens';
import { getUrlBooleanParam } from '../../utils/get-url-param';
import { getSelectableTokenSymbols } from '../../utils/tokenSelection';
import { IntegrationModal } from '../../features/IntegrationModal';
import type { TokenType } from '../../hooks/useTokens';
import { SelectATokenText } from './SelectATokenText';

import { useApiKeys, useCurrentWidgetConfig } from '@/api/hooks';
import { InfoBanner } from '@/components/InfoBanner';

export function Configure() {
  const wereInitialTokensSet = useRef(false);
  const { state, dispatch } = useCreator();
  const { authenticated } = usePrivy();

  const depositModeLive = getUrlBooleanParam('depositMode');

  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isTokenSelectorOpen, setIsTokenSelectorOpen] = useState(false);
  const [tokenSelectorType, setTokenSelectorType] = useState<'sell' | 'buy'>(
    'sell',
  );

  const allTokens = useTokensGroupedBySymbol();
  const allTokenSymbols = allTokens.map((token) => token.symbol);
  const selectedTokenCount = getSelectableTokenSymbols(
    state.selectedTokenSymbols,
  ).length;

  const { data: apiKeys } = useApiKeys();
  const { data: currentWidgetConfig, status: currentWidgetConfigStatus } =
    useCurrentWidgetConfig();

  // Once the tokens have loaded, select them all initially
  useEffect(() => {
    if (wereInitialTokensSet.current || !allTokenSymbols.length) {
      return;
    }

    if (state.selectedTokenSymbols.length > 0) {
      wereInitialTokensSet.current = true;

      return;
    }

    if (authenticated && currentWidgetConfigStatus === 'pending') {
      return;
    }

    if (authenticated && currentWidgetConfigStatus === 'success') {
      wereInitialTokensSet.current = true;

      if (currentWidgetConfig?.config.allowedTokensList?.length) {
        return;
      }
    }

    wereInitialTokensSet.current = true;
    dispatch({
      type: 'SET_SELECTED_TOKEN_SYMBOLS',
      payload: allTokenSymbols,
    });
  }, [
    allTokenSymbols,
    authenticated,
    currentWidgetConfig,
    currentWidgetConfigStatus,
    dispatch,
    state.selectedTokenSymbols.length,
  ]);

  const handleNetworksChange = (newNetworks: Chains[]) => {
    dispatch({ type: 'SET_SELECTED_NETWORKS', payload: newNetworks });

    // Auto-select tokens that are available for the chosen networks
    const availableTokens = allTokens.filter((token) =>
      isTokenAvailable(token, newNetworks),
    );

    const availableTokenSymbols = availableTokens.map(
      (token: TokenType) => token.symbol,
    );

    dispatch({
      type: 'SET_SELECTED_TOKEN_SYMBOLS',
      payload: availableTokenSymbols,
    });
  };

  return (
    <>
      <TokenSelectionModal
        isOpen={isTokenModalOpen}
        onClose={() => setIsTokenModalOpen(false)}
      />
      <TokenWithChainSelector
        isOpen={isTokenSelectorOpen}
        onClose={() => setIsTokenSelectorOpen(false)}
        onSelectToken={(token, blockchain) => {
          if (!token || !blockchain) {
            return;
          }

          if (tokenSelectorType === 'sell') {
            dispatch({
              type: 'SET_DEFAULT_SELL_TOKEN',
              payload: { symbol: token.symbol, blockchain },
            });
          } else {
            dispatch({
              type: 'SET_DEFAULT_BUY_TOKEN',
              payload: { symbol: token.symbol, blockchain },
            });
          }
        }}
      />
      <div className="flex flex-col gap-csw-2xl">
        {depositModeLive && (
          <ConfigSection title="Widget mode">
            <div className="space-y-csw-2md">
              <RadioButton
                label="Swap"
                description="Full featured swap widget with swap, deposit and withdraw capabilities."
                isSelected={state.widgetMode === 'swap'}
                onChange={() =>
                  dispatch({ type: 'SET_WIDGET_MODE', payload: 'swap' })
                }
              />
              <RadioButton
                label="Deposit"
                description="Deposit from connected wallet or with QR code to any asset on any account."
                isSelected={state.widgetMode === 'deposit'}
                onChange={() =>
                  dispatch({ type: 'SET_WIDGET_MODE', payload: 'deposit' })
                }
              />
              {state.widgetMode === 'deposit' && (
                <>
                  <div className="my-csw-2xl border-t border-csw-gray-800" />
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm leading-4 tracking-[-0.4px] text-csw-gray-200">
                      Deposit asset
                    </p>
                    {(() => {
                      const buyToken = allTokens.find(
                        (token: TokenType) =>
                          token.symbol === state.defaultBuyToken?.symbol,
                      );

                      const buyTokenChain = CHAINS.find(
                        (chain) =>
                          chain.id === state.defaultBuyToken?.blockchain,
                      );

                      const buyTokenSymbol =
                        buyToken?.symbol.toLowerCase() === 'wnear'
                          ? 'NEAR'
                          : buyToken?.symbol;

                      return (
                        <div
                          onClick={() => {
                            setTokenSelectorType('buy');
                            setIsTokenSelectorOpen(true);
                          }}
                          className="cursor-pointer">
                          {state.defaultBuyToken?.symbol ? (
                            <TokenTag
                              tokenIcon={
                                <div>
                                  {buyToken?.icon ? (
                                    <Icon
                                      className="text-csw-gray-100 bg-csw-gray-600"
                                      icon={buyToken.icon}
                                      label={buyToken.symbol}
                                      size={24}
                                    />
                                  ) : (
                                    <div className="w-[28px] h-[28px] rounded-full">
                                      {
                                        ASSET_ICONS[
                                          buyToken?.symbol.toLowerCase() ?? ''
                                        ]
                                      }
                                    </div>
                                  )}
                                  {buyTokenChain && (
                                    <div className="absolute bottom-[0px] right-[0px] w-[12px] h-[12px] rounded-[4px] border-2 border-csw-gray-900 bg-white">
                                      {buyTokenChain.icon}
                                    </div>
                                  )}
                                </div>
                              }
                              tokenSymbol={
                                buyTokenSymbol ?? state.defaultBuyToken.symbol
                              }
                            />
                          ) : (
                            <SelectATokenText />
                          )}
                        </div>
                      );
                    })()}
                  </div>
                  <TextInput
                    value={state.depositModeReceiverAddress}
                    placeholder="Receiver address"
                    onChange={(value) => {
                      dispatch({
                        type: 'SET_DEPOSIT_MODE_RECEIVER_ADDRESS',
                        payload: value,
                      });
                    }}
                  />
                  <InfoBanner
                    title="Check receiver address"
                    description="Make sure your receiver address is on the same network as the selected token. Otherwise, users may lose funds."
                  />
                </>
              )}
            </div>
          </ConfigSection>
        )}

        <ConfigSection title="Networks">
          <div className="space-y-csw-xl">
            <div className="flex gap-csw-md items-center">
              <div className="p-csw-2md rounded-[10px] flex-1 flex-grow w-full bg-csw-gray-800 text-csw-gray-50">
                <p className="font-semibold text-sm leading-4 tracking-[-0.4px]">
                  {state.selectedNetworks.length} network
                  {state.selectedNetworks.length !== 1 ? 's' : ''} selected
                </p>
              </div>
              <OutlinedButton
                size="sm"
                fluid
                onClick={() => {
                  const allSelected =
                    state.selectedNetworks.length === CHAINS.length;

                  const newNetworks = allSelected
                    ? []
                    : CHAINS.map((chain) => chain.id) || [];

                  handleNetworksChange(newNetworks);
                }}>
                {state.selectedNetworks.length === CHAINS.length
                  ? 'Deselect all'
                  : 'Select all'}
              </OutlinedButton>
            </div>
            <div className="flex flex-wrap gap-csw-md">
              {CHAINS.map((chain) => (
                <button
                  key={chain.id}
                  onClick={() => {
                    const isSelected = state.selectedNetworks?.includes(
                      chain.id,
                    );

                    const newNetworks = isSelected
                      ? state.selectedNetworks.filter(
                          (n: string) => n !== chain.id,
                        )
                      : [...(state.selectedNetworks || []), chain.id];

                    handleNetworksChange(newNetworks);
                  }}
                  className={`flex items-center justify-center w-csw-5xl h-csw-5xl rounded-csw-md transition-all bg-csw-gray-800 ${
                    state.selectedNetworks?.includes(chain.id)
                      ? 'border-2 border-csw-accent-600'
                      : 'border-2 border-csw-gray-700 hover:border-csw-gray-600'
                  }`}>
                  {<div className="w-[28px] h-[28px]">{chain.icon}</div>}
                </button>
              ))}
            </div>
          </div>
        </ConfigSection>

        <ConfigSection title="Tokens">
          <div className="space-y-csw-2xl">
            <div className="space-y-csw-sm font-medium text-csw-gray-200">
              <p className="text-sm leading-5 tracking-[-0.4px]">
                Selected tokens apply to all chosen networks
                {state.accountAbstractionMode === 'enabled' &&
                  ' and to the swap tab only'}
                .
              </p>
              <a
                href="https://docs.intents.aurora.dev/configuration"
                target="_blank"
                className="flex items-center gap-csw-xs text-sm leading-4 tracking-[-0.4px] font-semibold underline text-csw-gray-300 hover:text-csw-gray-300">
                <span>Check docs for more granularity</span>
                <ExternalLink className="w-csw-xl h-csw-xl text-csw-gray-300 font-semibold" />
              </a>
            </div>

            <div className="flex gap-csw-2md items-center">
              <div className="p-csw-2md rounded-[10px] flex-1 flex-grow w-full bg-csw-gray-800 text-csw-gray-50">
                <p className="font-semibold text-sm leading-4 tracking-[-0.4px]">
                  {selectedTokenCount} token
                  {selectedTokenCount !== 1 ? 's' : ''} selected
                </p>
              </div>
              <OutlinedButton
                size="sm"
                fluid
                onClick={() => setIsTokenModalOpen(true)}>
                <Edit className="w-csw-xl h-csw-xl" />
                Edit
              </OutlinedButton>
            </div>

            <div className="border-t border-csw-gray-800" />

            <div className="space-y-csw-xl">
              <Toggle
                label="Set default sell token"
                isEnabled={state.enableSellToken}
                onChange={(enabled) =>
                  dispatch({ type: 'SET_ENABLE_SELL_TOKEN', payload: enabled })
                }
              />
              {state.enableSellToken && (
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm leading-4 tracking-[-0.4px] text-csw-gray-200">
                    Default sell token
                  </p>
                  {(() => {
                    const sellToken = allTokens.find(
                      (token: TokenType) =>
                        token.symbol === state.defaultSellToken?.symbol,
                    );

                    const sellTokenChain = CHAINS.find(
                      (chain) =>
                        chain.id === state.defaultSellToken?.blockchain,
                    );

                    const sellTokenSymbol =
                      sellToken?.symbol.toLowerCase() === 'wnear'
                        ? 'NEAR'
                        : sellToken?.symbol;

                    return (
                      <div
                        onClick={() => {
                          setTokenSelectorType('sell');
                          setIsTokenSelectorOpen(true);
                        }}
                        className="cursor-pointer">
                        {state.defaultSellToken?.symbol ? (
                          <TokenTag
                            tokenIcon={
                              <div>
                                {sellToken?.icon ? (
                                  <Icon
                                    className="text-csw-gray-100 bg-csw-gray-600"
                                    icon={sellToken.icon}
                                    label={sellToken.symbol}
                                    size={24}
                                  />
                                ) : (
                                  <div className="w-[28px] h-[28px] rounded-full">
                                    {
                                      ASSET_ICONS[
                                        sellToken?.symbol.toLowerCase() ?? ''
                                      ]
                                    }
                                  </div>
                                )}
                                {sellTokenChain && (
                                  <div className="absolute bottom-[0px] right-[0px] w-[12px] h-[12px] rounded-[4px] border-2 border-csw-gray-900 bg-white">
                                    {sellTokenChain.icon}
                                  </div>
                                )}
                              </div>
                            }
                            tokenSymbol={
                              sellTokenSymbol ?? state.defaultSellToken.symbol
                            }
                          />
                        ) : (
                          <SelectATokenText />
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {state.widgetMode === 'swap' && (
              <>
                <div className="border-t border-csw-gray-800" />
                <div className="space-y-csw-xl">
                  <Toggle
                    label="Set default buy token"
                    isEnabled={state.enableBuyToken}
                    onChange={(enabled) =>
                      dispatch({
                        type: 'SET_ENABLE_BUY_TOKEN',
                        payload: enabled,
                      })
                    }
                  />

                  {state.enableBuyToken && (
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-sm leading-4 tracking-[-0.4px] text-csw-gray-200">
                        Default buy token
                      </p>
                      {(() => {
                        const buyToken = allTokens.find(
                          (token: TokenType) =>
                            token.symbol === state.defaultBuyToken?.symbol,
                        );

                        const buyTokenChain = CHAINS.find(
                          (chain) =>
                            chain.id === state.defaultBuyToken?.blockchain,
                        );

                        const buyTokenSymbol =
                          buyToken?.symbol.toLowerCase() === 'wnear'
                            ? 'NEAR'
                            : buyToken?.symbol;

                        return (
                          <div
                            onClick={() => {
                              setTokenSelectorType('buy');
                              setIsTokenSelectorOpen(true);
                            }}
                            className="cursor-pointer">
                            {state.defaultBuyToken?.symbol ? (
                              <TokenTag
                                tokenIcon={
                                  buyToken?.icon ? (
                                    <div>
                                      <img
                                        src={buyToken.icon}
                                        alt={buyToken.symbol}
                                        className="size-full rounded-full"
                                      />
                                      {buyTokenChain && (
                                        <div className="absolute bottom-[0px] right-[0px] w-[12px] h-[12px] rounded-[4px] border-2 border-csw-gray-900 bg-white">
                                          {buyTokenChain.icon}
                                        </div>
                                      )}
                                    </div>
                                  ) : undefined
                                }
                                tokenSymbol={
                                  buyTokenSymbol ?? state.defaultBuyToken.symbol
                                }
                              />
                            ) : (
                              <SelectATokenText />
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </ConfigSection>

        <ConfigSection title="Wallet connection">
          <div className="space-y-csw-2md">
            <RadioButton
              label="Standalone"
              description="Use the built-in wallet connector."
              isSelected={state.userAuthMode === 'standalone'}
              onChange={() =>
                dispatch({ type: 'SET_USER_AUTH_MODE', payload: 'standalone' })
              }
            />
            <RadioButton
              label="Dapp"
              description="Use your own wallet connector. Some networks may not be supported."
              isSelected={state.userAuthMode === 'dapp'}
              onChange={() =>
                dispatch({ type: 'SET_USER_AUTH_MODE', payload: 'dapp' })
              }
            />
          </div>
        </ConfigSection>

        <ConfigSection title="Account abstraction">
          <div className="space-y-csw-2md">
            <RadioButton
              label="Enabled"
              description={
                <span className="space-y-1.5">
                  Users can deposit to or withdraw from their chain abstracted
                  intents balance in addition to using their connected wallet
                  balances.
                  <a
                    href="https://docs.near-intents.org/near-intents/market-makers/verifier/account-abstraction"
                    target="_blank"
                    className="flex items-center gap-csw-xs text-sm leading-4 tracking-[-0.4px] text-gray-300 underline hover:text-gray-300">
                    <span>Learn more</span>
                    <ExternalLink className="w-csw-xl h-csw-xl" />
                  </a>
                </span>
              }
              isSelected={state.accountAbstractionMode === 'enabled'}
              onChange={() =>
                dispatch({
                  type: 'SET_ACCOUNT_ABSTRACTION_MODE',
                  payload: 'enabled',
                })
              }
            />
            <RadioButton
              label="Disabled"
              description="Users can only use assets in their connected wallet."
              isSelected={state.accountAbstractionMode === 'disabled'}
              onChange={() =>
                dispatch({
                  type: 'SET_ACCOUNT_ABSTRACTION_MODE',
                  payload: 'disabled',
                })
              }
            />
          </div>
        </ConfigSection>

        <ConfigSection title="Fee collection">
          <div className="space-y-csw-xl text-csw-gray-200">
            <Toggle
              label="Enable custom fees"
              isEnabled={state.enableCustomFees || !!apiKeys?.length}
              onChange={(enabled) =>
                dispatch({ type: 'SET_ENABLE_CUSTOM_FEES', payload: enabled })
              }
            />

            {(state.enableCustomFees || !!apiKeys?.length) && (
              <Button
                fluid
                size="sm"
                variant="outlined"
                className="w-full"
                onClick={() => setIsExportModalOpen(true)}>
                <Edit className="w-csw-xl h-csw-xl" />
                Edit fees
              </Button>
            )}
          </div>
        </ConfigSection>
      </div>

      <IntegrationModal
        selectedTab="api-keys"
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
    </>
  );
}
