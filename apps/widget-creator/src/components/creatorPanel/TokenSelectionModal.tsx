import { useEffect, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { OutlinedButton } from '../../uikit/Button';
import {
  isTokenAvailable,
  TokenType,
  useTokensGroupedBySymbol,
} from '../../hooks/useTokens';
import { useCreator } from '../../hooks/useCreatorConfig';
import { TokenRow } from './TokenRow';

interface TokenSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Sample popular token symbols
const POPULAR_TOKENS: string[] = [
  'ETH',
  'BTC',
  'SOL',
  'USDC',
  'USDT',
  'NEAR',
  'AURORA',
];

export function TokenSelectionModal({
  isOpen,
  onClose,
}: TokenSelectionModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const allTokens = useTokensGroupedBySymbol();
  const { state, dispatch } = useCreator();

  const selectedTokens = state.selectedTokenSymbols || [];

  const onTokensChange = (tokens: string[]) => {
    dispatch({ type: 'SET_SELECTED_TOKEN_SYMBOLS', payload: tokens });

    if (
      state.defaultSellToken?.symbol &&
      !tokens.includes(state.defaultSellToken.symbol)
    ) {
      dispatch({ type: 'SET_DEFAULT_SELL_TOKEN', payload: null });
    }

    if (
      state.defaultBuyToken?.symbol &&
      !tokens.includes(state.defaultBuyToken.symbol)
    ) {
      dispatch({ type: 'SET_DEFAULT_BUY_TOKEN', payload: null });
    }
  };

  // Prevent scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflowY = 'hidden';

      return () => {
        document.body.style.overflowY = 'unset';
      };
    }
  }, [isOpen]);

  // Filter tokens based on search and deduplicate by symbol
  const filteredTokens = useMemo(() => {
    return allTokens.filter((token: TokenType) => {
      return token.symbol.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [searchQuery, allTokens]);

  // Separate available and unavailable tokens
  const availableFilteredTokens = filteredTokens.filter((token: TokenType) =>
    isTokenAvailable(token, state.selectedNetworks),
  );

  const unavailableFilteredTokens = filteredTokens.filter(
    (token: TokenType) => !isTokenAvailable(token, state.selectedNetworks),
  );

  // Separate popular and other tokens
  const popularAvailable = availableFilteredTokens.filter((token: TokenType) =>
    POPULAR_TOKENS.includes(token.symbol),
  );

  const otherAvailable = availableFilteredTokens.filter(
    (token: TokenType) => !POPULAR_TOKENS.includes(token.symbol),
  );

  const handleToggleToken = (tokenId: string) => {
    if (selectedTokens.includes(tokenId)) {
      onTokensChange(selectedTokens.filter((id) => id !== tokenId));
    } else {
      onTokensChange([...selectedTokens, tokenId]);
    }
  };

  const handleSelectAllPopular = () => {
    const currentPopularSelected = popularAvailable
      .filter((t: TokenType) => selectedTokens.includes(t.symbol))
      .map((t: TokenType) => t.symbol);

    const allPopularSymbols = popularAvailable.map((t: TokenType) => t.symbol);
    const newTokens = selectedTokens.filter(
      (t) => !allPopularSymbols.includes(t),
    );

    if (currentPopularSelected.length === popularAvailable.length) {
      // Deselect all popular tokens
      onTokensChange(newTokens);
    } else {
      // Select all popular tokens
      onTokensChange([...newTokens, ...allPopularSymbols]);
    }
  };

  const handleSelectAllOther = () => {
    const currentOtherSelected = otherAvailable
      .filter((t: TokenType) => selectedTokens.includes(t.symbol))
      .map((t: TokenType) => t.symbol);

    const allOtherSymbols = otherAvailable.map((t: TokenType) => t.symbol);
    const newTokens = selectedTokens.filter(
      (t) => !allOtherSymbols.includes(t),
    );

    if (currentOtherSelected.length === otherAvailable.length) {
      // Deselect all other tokens
      onTokensChange(newTokens);
    } else {
      // Select all other tokens
      onTokensChange([...newTokens, ...allOtherSymbols]);
    }
  };

  if (!isOpen) {
    return null;
  }

  const allPopularSelected =
    popularAvailable.length > 0 &&
    popularAvailable.every((t: TokenType) => selectedTokens.includes(t.symbol));

  const allOtherSelected =
    otherAvailable.length > 0 &&
    otherAvailable.every((t: TokenType) => selectedTokens.includes(t.symbol));

  return (
    <div className="z-50 w-full h-full fixed top-[0px] right-[0px]">
      <div
        className="w-full h-full flex items-center justify-center"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.70)',
          backdropFilter: 'blur(4px)',
        }}
        onClick={onClose}>
        <div
          className="relative z-50 mx-4 w-full max-w-[456px] rounded-csw-lg bg-csw-gray-900 shadow-lg overflow-hidden flex flex-col max-h-[90vh] px-csw-2xl py-csw-2xl gap-csw-2xl"
          onClick={(e) => e.stopPropagation()}>
          <div className="flex items-start justify-between gap-csw-lg flex-shrink-0">
            <div className="flex flex-col gap-csw-md flex-1">
              <h2 className="font-semibold text-base leading-4 tracking-[-0.4px] text-csw-gray-50">
                {selectedTokens.length} tokens selected
              </h2>
              <p className="font-medium text-sm leading-5 tracking-[-0.4px] text-csw-gray-200">
                Selected tokens apply to all chosen networks.
              </p>
            </div>
            <button
              onClick={onClose}
              className="bg-csw-gray-950 p-csw-md rounded-csw-md hover:bg-csw-gray-800 transition-colors flex-shrink-0 cursor-pointer">
              <X className="w-csw-lg h-csw-lg text-csw-gray-50" />
            </button>
          </div>

          <div className="flex-shrink-0">
            <div className="flex gap-csw-md items-center bg-csw-gray-800 px-csw-lg py-csw-md rounded-csw-md">
              <Search className="w-csw-lg h-csw-lg text-csw-gray-300 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search token"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-csw-gray-50 placeholder-csw-gray-300 outline-none flex-1 font-medium text-sm leading-4"
              />
            </div>
          </div>

          <div className="bg-csw-gray-800 h-[1px]" />

          <div className="flex-1 overflow-y-auto hide-scrollbar flex flex-col gap-csw-2xl">
            {popularAvailable.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-csw-lg">
                  <p className="font-semibold text-sm leading-4 tracking-[-0.4px] text-csw-gray-200">
                    Popular tokens
                  </p>
                  <OutlinedButton
                    fluid
                    size="sm"
                    onClick={handleSelectAllPopular}>
                    {allPopularSelected ? 'Deselect all' : 'Select all'}
                  </OutlinedButton>
                </div>

                <div className="flex flex-col gap-csw-md">
                  {popularAvailable.map((token: TokenType) => (
                    <TokenRow
                      key={token.symbol}
                      token={token}
                      isSelected={selectedTokens.includes(token.symbol)}
                      onToggle={() => handleToggleToken(token.symbol)}
                      isDisabled={false}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="bg-csw-gray-800 h-[1px]" />

            <div>
              {(otherAvailable.length > 0 ||
                unavailableFilteredTokens.length > 0) && (
                <>
                  <div className="flex items-center justify-between mb-csw-lg">
                    <p className="font-semibold text-sm leading-4 tracking-[-0.4px] text-csw-gray-200">
                      {popularAvailable.length > 0
                        ? 'Other tokens'
                        : 'All tokens'}
                    </p>
                    {(otherAvailable.length > 0 ||
                      unavailableFilteredTokens.length > 0) && (
                      <OutlinedButton
                        fluid
                        size="sm"
                        onClick={handleSelectAllOther}>
                        {allOtherSelected ? 'Deselect all' : 'Select all'}
                      </OutlinedButton>
                    )}
                  </div>
                </>
              )}

              <div className="flex flex-col gap-csw-md">
                {otherAvailable.map((token: TokenType) => (
                  <TokenRow
                    key={token.symbol}
                    token={token}
                    isSelected={selectedTokens.includes(token.symbol)}
                    onToggle={() => handleToggleToken(token.symbol)}
                    isDisabled={false}
                  />
                ))}

                {unavailableFilteredTokens.map((token: TokenType) => (
                  <TokenRow
                    key={token.symbol}
                    token={token}
                    isSelected={selectedTokens.includes(token.symbol)}
                    onToggle={() => {}}
                    isDisabled={true}
                  />
                ))}
              </div>
            </div>

            {filteredTokens.length === 0 && (
              <div className="flex items-center justify-center py-csw-3xl px-csw-2xl">
                <p className="text-csw-gray-300 text-sm">No tokens found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
