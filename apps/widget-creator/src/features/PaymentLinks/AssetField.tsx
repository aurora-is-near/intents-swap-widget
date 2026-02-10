import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  CHAINS,
  TinyNumber,
  TokensModal,
  useMergedBalance,
  WidgetConfigProvider,
} from '@aurora-is-near/intents-swap-widget';
import '@aurora-is-near/intents-swap-widget/styles.css';
import type { Token } from '@aurora-is-near/intents-swap-widget';

import { useWidgetConfig } from '@/hooks/useWidgetConfig';
import { getChainName } from '@/utils/get-chain-name';

const ALCHEMY_API_KEY = 'CiIIxly0Hi8oQYcQvzgsI';
const MODAL_Z = 50;

type AssetValue = {
  symbol: string;
  blockchain: string;
  icon?: string;
};

type Props = {
  value?: AssetValue;
  state?: 'normal' | 'error';
  onChange: (value: AssetValue) => void;
};

/** Renders balance for a token — must be inside WidgetConfigProvider */
const BalanceLabel = ({ token }: { token: Token }) => {
  const { mergedBalance } = useMergedBalance();
  const key = token.isIntent ? `intent-${token.assetId}` : token.assetId;
  const balance = mergedBalance[key];

  if (balance === undefined) return null;

  return (
    <span className="text-xs text-csw-gray-300 sw">
      Balance:{' '}
      <TinyNumber decimals={token.decimals} value={`${balance}`} />
    </span>
  );
};

export const AssetField = ({ value, state = 'normal', onChange }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const { widgetConfig } = useWidgetConfig();

  // Lock body scroll and boost headlessui portal z-index when modal is open.
  // The portal root is created lazily by Headless UI when a Menu first renders,
  // so we use a MutationObserver to catch it whenever it appears.
  useEffect(() => {
    if (!isOpen) return;

    document.body.style.overflow = 'hidden';

    const PORTAL_ID = 'headlessui-portal-root';
    const portalZ = String(MODAL_Z + 10);

    const applyPortalStyles = (el: HTMLElement) => {
      el.style.position = 'relative';
      el.style.zIndex = portalZ;
    };

    const clearPortalStyles = (el: HTMLElement) => {
      el.style.position = '';
      el.style.zIndex = '';
    };

    // Apply immediately if portal already exists
    const existing = document.getElementById(PORTAL_ID);
    if (existing) applyPortalStyles(existing);

    // Watch for the portal being added dynamically
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLElement) {
            if (node.id === PORTAL_ID) {
              applyPortalStyles(node);
            } else {
              const nested = node.querySelector<HTMLElement>(`#${PORTAL_ID}`);
              if (nested) applyPortalStyles(nested);
            }
          }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      document.body.style.overflow = '';
      observer.disconnect();
      const portal = document.getElementById(PORTAL_ID);
      if (portal) clearPortalStyles(portal);
    };
  }, [isOpen]);

  const handleSelect = (token: Token) => {
    setSelectedToken(token);
    onChange({
      symbol: token.symbol,
      blockchain: token.blockchain,
      icon: token.icon,
    });
    setIsOpen(false);
  };

  const chainData = value?.blockchain
    ? CHAINS.find((c) => c.id === value.blockchain)
    : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`flex items-center gap-csw-md px-csw-lg py-csw-md rounded-csw-md cursor-pointer w-full transition-colors ${
          state === 'error'
            ? 'bg-csw-status-error/20'
            : 'bg-csw-gray-800 hover:bg-csw-gray-700'
        }`}>
        {value?.symbol ? (
          <div className="flex items-center gap-csw-md">
            <div className="relative">
              {value.icon ? (
                <img
                  src={value.icon}
                  alt={value.symbol}
                  className="w-[24px] h-[24px] rounded-full"
                />
              ) : (
                <div className="w-[24px] h-[24px] rounded-full bg-csw-gray-700" />
              )}
              {chainData && (
                <div className="absolute -right-[2px] -bottom-[2px] w-[12px] h-[12px] rounded-[4px] border border-[#444650]">
                  {chainData.icon}
                </div>
              )}
            </div>
            <span className="font-medium text-sm text-csw-gray-50">
              {value.symbol}
            </span>
            {value.blockchain && (
              <span className="text-xs text-csw-gray-300">
                on {getChainName(value.blockchain)}
              </span>
            )}
          </div>
        ) : (
          <span
            className={`font-medium text-sm ${state === 'error' ? 'text-csw-status-error' : 'text-csw-gray-300'}`}>
            Select asset
          </span>
        )}
        <ChevronDown
          size={16}
          className={`ml-auto ${state === 'error' ? 'text-csw-status-error' : 'text-csw-gray-300'}`}
        />
      </button>

      {/* Backdrop — outside WidgetConfigProvider so widget CSS resets don't affect it */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: MODAL_Z,
            backgroundColor: 'rgba(0, 0, 0, 0.70)',
            backdropFilter: 'blur(4px)',
          }}
        />
      )}

      {/* WidgetConfigProvider stays mounted so balances load in the background */}
      <WidgetConfigProvider
        config={{
          ...widgetConfig,
          alchemyApiKey: ALCHEMY_API_KEY,
        }}>
        {selectedToken && <BalanceLabel token={selectedToken} />}
        {isOpen && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: MODAL_Z + 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}>
            <div
              className="mx-4 w-full max-w-[456px] max-h-[90vh] sw"
              style={{ pointerEvents: 'auto' }}>
              <TokensModal
                variant="source"
                groupTokens
                showBalances
                showChainsSelector
                chainsFilter={{ intents: 'all', external: 'all' }}
                onMsg={(msg) => {
                  switch (msg.type) {
                    case 'on_select_token':
                      handleSelect(msg.token);
                      break;
                    case 'on_dismiss_tokens_modal':
                      setIsOpen(false);
                      break;
                  }
                }}
              />
            </div>
          </div>
        )}
      </WidgetConfigProvider>
    </>
  );
};
