import { useState } from 'react';
import { ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import type { TokenResponse } from '@defuse-protocol/one-click-sdk-typescript';
import { useTokens } from '../../hooks/useTokens';
import { useChains } from '../../hooks/useChains';

interface TokenWithChainSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectToken?: (
    token: TokenResponse & { icon: string | undefined },
    selectedChain: string,
  ) => void;
}

export function TokenWithChainSelector({
  isOpen,
  onClose,
  onSelectToken,
}: TokenWithChainSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChain, setSelectedChain] = useState<string>('all');
  const [isChainDropdownOpen, setIsChainDropdownOpen] = useState(false);

  const allTokens = useTokens();
  const allChains = useChains();

  if (!isOpen) {
    return null;
  }

  const selectedChainData = allChains.find((c) => c.id === selectedChain);

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
          {/* Header */}
          <div className="px-csw-2xl pt-csw-2xl">
            <header className="py-csw-md flex items-center justify-between">
              <h2 className="font-semibold text-base leading-4 tracking-[-0.4px] text-csw-gray-50">
                Select token
              </h2>
              <button
                onClick={onClose}
                className="flex cursor-pointer items-center justify-center text-csw-gray-100 transition-colors hover:text-csw-gray-50">
                <X size={22} />
              </button>
            </header>
          </div>

          {/* Search and Chain Selector */}
          <div className="px-csw-2xl gap-csw-xl flex items-center">
            {/* Search Input */}
            <div className="relative flex-1">
              <div className="px-csw-lg py-csw-lg rounded-csw-md ring-transparent ring-1 ring-inset bg-csw-gray-800 hover:bg-csw-gray-700 transition-colors flex items-center justify-between">
                <Search size={16} className="mr-csw-md text-csw-gray-100" />
                <input
                  type="text"
                  placeholder="Search or paste address"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="text-sm font-medium leading-4 mr-auto w-full outline-none bg-transparent text-csw-gray-50 placeholder-csw-gray-300"
                  autoFocus
                />
                {searchQuery ? (
                  <button
                    type="button"
                    className="cursor-pointer text-csw-gray-100 transition-opacity hover:text-csw-gray-50"
                    onClick={() => setSearchQuery('')}>
                    <X className="h-csw-xl w-csw-xl" />
                  </button>
                ) : null}
              </div>
            </div>

            {/* Chain Dropdown */}
            {allChains.length > 1 && (
              <div className="relative">
                <div
                  onClick={() => setIsChainDropdownOpen(!isChainDropdownOpen)}
                  className="py-csw-sm px-csw-md gap-csw-md flex h-[40px] cursor-pointer items-center rounded-csw-md bg-csw-gray-600 hover:bg-csw-gray-500">
                  {selectedChain === 'all' ? (
                    <div className="flex items-center gap-csw-md">
                      <div className="w-[20px] h-[20px] rounded-[10px] bg-csw-gray-500 flex items-center justify-center">
                        <div className="w-[12px] h-[12px] rounded-full border-2 border-csw-gray-100" />
                      </div>
                      <span className="font-medium text-sm leading-4 text-csw-gray-50">
                        All networks
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-csw-md">
                      <div className="w-[20px] h-[20px] rounded-[10px] bg-csw-gray-700 flex items-center justify-center overflow-hidden">
                        <img
                          src={selectedChainData?.icon}
                          alt={selectedChainData?.label}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="font-medium text-sm leading-4 text-csw-gray-50">
                        {selectedChainData?.label}
                      </span>
                    </div>
                  )}
                  {isChainDropdownOpen ? (
                    <ChevronUp size={18} className="text-csw-gray-50" />
                  ) : (
                    <ChevronDown size={18} className="text-csw-gray-50" />
                  )}
                </div>

                {/* Dropdown Menu */}
                {isChainDropdownOpen && (
                  <div
                    className="absolute top-full right-0 mt-csw-sm gap-csw-xxs p-csw-md z-10 flex max-h-[400px] min-w-[200px] flex-col rounded-csw-lg bg-csw-gray-900 shadow-lg ring-1 ring-inset ring-csw-gray-600"
                    style={{ marginTop: '8px' }}>
                    <button
                      onClick={() => {
                        setSelectedChain('all');
                        setIsChainDropdownOpen(false);
                      }}
                      className={`gap-csw-md px-csw-md py-csw-sm rounded-csw-sm flex items-center hover:bg-csw-gray-600 transition-colors ${
                        selectedChain === 'all' ? 'bg-csw-gray-600' : ''
                      }`}>
                      <div className="w-[20px] h-[20px] rounded-[10px] bg-csw-gray-500 flex items-center justify-center flex-shrink-0">
                        <div className="w-[12px] h-[12px] rounded-full border-2 border-csw-gray-100" />
                      </div>
                      <span className="font-medium text-sm leading-4 text-csw-gray-50">
                        All networks
                      </span>
                    </button>
                    {allChains.map((chain) => (
                      <button
                        key={chain.id}
                        onClick={() => {
                          setSelectedChain(chain.id);
                          setIsChainDropdownOpen(false);
                        }}
                        className={`gap-csw-md px-csw-md py-csw-sm rounded-csw-sm flex items-center hover:bg-csw-gray-600 transition-colors ${
                          selectedChain === chain.id ? 'bg-csw-gray-600' : ''
                        }`}>
                        <div className="w-[20px] h-[20px] rounded-[10px] bg-csw-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                          <img
                            src={chain.icon}
                            alt={chain.label}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span className="font-medium text-sm leading-4 text-csw-gray-50">
                          {chain.label}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Token List */}
          <div
            className="flex-1 overflow-y-auto hide-scrollbar px-csw-2xl"
            style={{ maxHeight: '450px', minHeight: '200px' }}>
            <div className="flex flex-col">
              {allTokens.length > 0 ? (
                allTokens.map((token) => (
                  <div
                    key={token.assetId}
                    onClick={() => {
                      onSelectToken?.(token, selectedChain);
                      onClose();
                    }}
                    className="gap-csw-lg p-csw-lg flex cursor-pointer justify-between rounded-csw-md transition-colors hover:bg-csw-gray-600">
                    {/* Token Icon */}
                    <div className="relative flex-shrink-0">
                      {token.icon ? (
                        <img
                          src={token.icon}
                          alt={token.symbol}
                          className="w-[24px] h-[24px] rounded-full"
                        />
                      ) : (
                        <div className="w-[24px] h-[24px] rounded-full bg-csw-gray-700" />
                      )}
                    </div>

                    {/* Token Info */}
                    <div className="gap-csw-sm mr-auto flex flex-col">
                      <span className="font-medium text-sm leading-4 text-csw-gray-50">
                        {token.symbol}
                      </span>
                      <div className="flex items-center gap-csw-xs">
                        <span className="font-medium text-sm leading-4 text-csw-gray-100">
                          {token.symbol}
                        </span>
                        <span className="font-medium text-sm leading-4 text-csw-gray-200">
                          on{' '}
                          {(() => {
                            const chain = allChains.find(
                              (c) => c.id === token.blockchain,
                            );

                            return chain?.label ?? token.blockchain;
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center py-csw-3xl">
                  <p className="text-csw-gray-300 text-sm">
                    No tokens available
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
