import { ExternalLink, Edit } from 'lucide-react';
import { ConfigSection } from '../../uikit/ConfigSection';
import { useCreator } from '../../hooks/useCreatorConfig';
import { RadioButton } from '../../uikit/RadioButton';
import { Toggle } from '../../uikit/Toggle';
import { OutlinedButton } from '@aurora-is-near/intents-swap-widget';
export function Configure() {
  const { state, dispatch } = useCreator();

  return (
    <div className="flex flex-col gap-sw-2xl">
      {/* User authentication */}
      <ConfigSection title="User authentication">
        <div className="space-y-sw-2md">
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

      {/* Account abstraction */}
      <ConfigSection title="Account abstraction">
        <div className="space-y-sw-2md">
          <RadioButton
            label="Enabled"
            description={
              <div className="space-y-1.5">
                <p>
                  Users can deposit to or withdraw from their chain abstracted
                  intents balance in addition to using their connected wallet
                  balances.
                </p>
                <a
                  href="#"
                  className="flex items-center gap-1 text-sm leading-4 tracking-[-0.4px] text-gray-300 underline hover:text-gray-300">
                  <span>Learn more</span>
                  <ExternalLink className="w-sw-xl h-sw-xl" />
                </a>
              </div>
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

      {/* Networks */}
      <ConfigSection title="Networks">
        <div className="space-y-2.5">
          <div className="flex gap-2.5 items-center">
            <div className="bg-[rgba(213,183,255,0.1)] px-2.5 py-2.5 rounded-[10px] flex-1">
              <p className="font-semibold text-sm leading-4 tracking-[-0.4px] text-[#d5b7ff]">
                {state.selectedNetworksCount} networks selected
              </p>
            </div>
            <OutlinedButton size="md">
              Deselect all
            </OutlinedButton>
          </div>
          <p className="text-xs leading-4 tracking-[-0.4px] text-gray-300">
            Selected networks apply to all chosen networks.
          </p>
        </div>
      </ConfigSection>

      {/* Tokens */}
      <ConfigSection title="Tokens">
        <div className="space-y-5">
          <div className="space-y-2.5">
            <p className="text-sm leading-5 tracking-[-0.4px] text-gray-300">
              Selected tokens apply to all chosen networks.
            </p>
            <a
              href="#"
              className="flex items-center gap-1 text-sm leading-4 tracking-[-0.4px] text-gray-300 underline hover:text-gray-300">
              <span>Check docs for more granularity</span>
              <ExternalLink className="w-sw-xl h-sw-xl" />
            </a>
          </div>

          <div className="flex gap-2.5 items-center">
            <div className="bg-[rgba(213,183,255,0.1)] px-2.5 py-2.5 rounded-[10px] flex-1">
              <p className="font-semibold text-sm leading-4 tracking-[-0.4px] text-[#d5b7ff]">
                {state.selectedTokensCount} tokens selected
              </p>
            </div>
            <OutlinedButton size="md">
              <Edit className="w-sw-xl h-sw-xl" />
              Edit
            </OutlinedButton>
          </div>

          <div className="border-t border-[#caccd3]" />

          {/* Set default sell token */}
          <div className="space-y-3">
            <Toggle
              label="Set default sell token"
              isEnabled={state.enableSellToken}
              onChange={(enabled) =>
                dispatch({ type: 'SET_ENABLE_SELL_TOKEN', payload: enabled })
              }
            />

            <Toggle
              label="Auto-select top balance token"
              isEnabled={state.autoSelectTopBalanceToken}
              onChange={(enabled) =>
                dispatch({
                  type: 'SET_AUTO_SELECT_TOP_BALANCE_TOKEN',
                  payload: enabled,
                })
              }
            />

            {state.enableSellToken && (
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm leading-4 tracking-[-0.4px] text-gray-300">
                  Default sell token
                </p>
                <div className="bg-sw-gray-800 px-2 py-1 rounded-sw-md flex items-center gap-1.5">
                  <div className="w-7 h-7 bg-gray-400 rounded-md flex-shrink-0" />
                  <p className="font-semibold text-sm leading-4 tracking-[-0.4px] text-sw-gray-950">
                    {state.defaultSellToken}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-[#caccd3]" />

          {/* Set default buy token */}
          <div className="space-y-3">
            <Toggle
              label="Set default buy token"
              isEnabled={state.enableBuyToken}
              onChange={(enabled) =>
                dispatch({ type: 'SET_ENABLE_BUY_TOKEN', payload: enabled })
              }
            />

            {state.enableBuyToken && (
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm leading-4 tracking-[-0.4px] text-[#41444f]">
                  Default buy token
                </p>
                <div className="bg-[#caccd3] px-2 py-1 rounded-[10px] flex items-center gap-1.5">
                  <div className="w-7 h-7 bg-blue-400 rounded-md flex-shrink-0" />
                  <p className="font-semibold text-sm leading-4 tracking-[-0.4px] text-[#24262d]">
                    {state.defaultBuyToken}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </ConfigSection>

      {/* Fee collection */}
      <ConfigSection title="Fee collection">
        <div className="space-y-4">
          <Toggle
            label="Enable custom fees"
            isEnabled={state.enableCustomFees}
            onChange={(enabled) =>
              dispatch({ type: 'SET_ENABLE_CUSTOM_FEES', payload: enabled })
            }
          />

          {state.enableCustomFees && (
            <>
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm leading-4 tracking-[-0.4px] text-[#41444f]">
                  Fee percentage (max 1%)
                </p>
                <div className="bg-[#caccd3] px-2.5 py-2.5 rounded-[10px]">
                  <input
                    type="text"
                    value={state.feePercentage}
                    onChange={(e) =>
                      dispatch({
                        type: 'SET_FEE_PERCENTAGE',
                        payload: e.target.value,
                      })
                    }
                    className="bg-transparent w-10 font-semibold text-sm leading-4 tracking-[-0.4px] text-[#24262d] outline-none text-center"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <p className="font-semibold text-sm leading-4 tracking-[-0.4px] text-[#41444f]">
                  Collector address (Intents account)
                </p>
                <div className="bg-[#caccd3] px-3 py-3 rounded-[10px] flex items-center justify-between">
                  <p className="font-semibold text-sm leading-4 tracking-[-0.4px] text-[#24262d] truncate">
                    {state.collectorAddress}
                  </p>
                  <button className="text-[#41444f] hover:text-[#24262d]">
                    ✕
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </ConfigSection>
    </div>
  );
}
