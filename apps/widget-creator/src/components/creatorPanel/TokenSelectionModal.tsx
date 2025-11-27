import { useEffect, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { OutlinedButton } from '../../uikit/Button';
import { isTokenAvailable, TokenType, useTokens } from '../../hooks/useTokens';
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
  const allTokens = useTokens();
  const { state, dispatch } = useCreator();

  const selectedTokens = state.selectedTokenSymbols || [];

  const onTokensChange = (tokens: string[]) => {
    dispatch({ type: 'SET_SELECTED_TOKEN_SYMBOLS', payload: tokens });
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

  const handleSelectAll = () => {
    onTokensChange(availableFilteredTokens.map((t: TokenType) => t.symbol));
  };

  const handleDeselectAll = () => {
    onTokensChange([]);
  };

  if (!isOpen) {
    return null;
  }

  const allSelected = selectedTokens.length === availableFilteredTokens.length;

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
          className="relative z-50 mx-4 w-full max-w-[456px] rounded-csw-lg bg-csw-gray-900 shadow-lg overflow-hidden flex flex-col max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}>
          <div className="border-b border-csw-gray-800 px-csw-2xl pt-csw-2xl pb-csw-xl flex items-start justify-between gap-csw-lg flex-shrink-0">
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

          <div className="px-csw-2xl py-csw-lg border-b border-csw-gray-800 flex-shrink-0">
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

          <div className="flex-1 overflow-y-auto hide-scrollbar">
            {popularAvailable.length > 0 && (
              <div className="px-csw-2xl py-csw-lg border-b border-csw-gray-800">
                <div className="flex items-center justify-between mb-csw-lg">
                  <p className="font-semibold text-sm leading-4 tracking-[-0.4px] text-csw-gray-200">
                    Popular tokens
                  </p>
                  <OutlinedButton
                    fluid
                    size="sm"
                    onClick={allSelected ? handleDeselectAll : handleSelectAll}>
                    {allSelected ? 'Deselect all' : 'Select all'}
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

            <div className="px-csw-2xl py-csw-lg">
              {(otherAvailable.length > 0 ||
                unavailableFilteredTokens.length > 0) && (
                <p className="font-semibold text-sm leading-4 tracking-[-0.4px] text-csw-gray-200 mb-csw-lg">
                  {popularAvailable.length > 0 ? 'Other tokens' : 'All tokens'}
                </p>
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
