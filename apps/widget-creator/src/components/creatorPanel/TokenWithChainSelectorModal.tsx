import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Search, Target, X } from 'lucide-react';
import type { TokenResponse } from '@defuse-protocol/one-click-sdk-typescript';
import { CHAINS } from '@aurora-is-near/intents-swap-widget';
import { useTokens } from '../../hooks/useTokens';

interface TokenWithChainSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectToken: (
    token: (TokenResponse & { icon: string | undefined }) | undefined,
    selectedChain: string | null | undefined,
  ) => void;
}

export function TokenWithChainSelector({
  isOpen,
  onClose,
  onSelectToken,
}: TokenWithChainSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChain, setSelectedChain] = useState<string | null>();
  const [isChainDropdownOpen, setIsChainDropdownOpen] = useState(false);

  const allTokens = useTokens();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';

      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const selectedChainData = CHAINS.find((c) => c.id === selectedChain);

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
          className="relative z-50 mx-4 w-full max-w-[456px] h-[670px] rounded-csw-lg bg-csw-gray-900 shadow-lg overflow-hidden flex flex-col max-h-[90vh] mx-[10px]"
          onClick={(e) => e.stopPropagation()}>
          <div className="px-csw-2xl pt-csw-2xl">
            <header className="py-csw-md flex items-center justify-between mb-[14px]">
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

          <div className="px-csw-2xl gap-csw-xl flex items-center">
            <div className="relative flex-1">
              <div className="px-csw-lg py-csw-lg rounded-csw-md ring-transparent ring-1 ring-inset bg-csw-gray-800 hover:bg-csw-gray-700 transition-colors flex items-center justify-between">
                <Search size={16} className="mr-csw-md text-csw-gray-100" />
                <input
                  type="text"
                  placeholder="Search or paste address"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="text-sm font-medium leading-4 mr-auto w-full outline-none bg-transparent text-csw-gray-50 placeholder-csw-gray-300"
                  autoFocus={false}
                />
                {searchQuery ? (
                  <button
                    type="button"
                    className="cursor-pointer text-csw-gray-200 transition-opacity hover:text-csw-gray-50"
                    onClick={() => setSearchQuery('')}>
                    <X className="h-csw-xl w-csw-xl" />
                  </button>
                ) : null}
              </div>
            </div>

            <div className="relative">
              <div
                onClick={() => setIsChainDropdownOpen(!isChainDropdownOpen)}
                className="py-csw-sm px-csw-md gap-csw-md flex h-[40px] cursor-pointer items-center rounded-csw-md bg-csw-gray-800 hover:bg-csw-gray-600">
                {!selectedChainData ? (
                  <div className="flex items-center gap-csw-md">
                    <div className="w-[28px] h-[28px] rounded-[10px] bg-[#CDC0AA] flex items-center justify-center">
                      <Target className="w-[14px] h-[14px]" />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-csw-md">
                    <div className="w-[28px] h-[28px] rounded-[10px] bg-csw-gray-700 flex items-center justify-center overflow-hidden">
                      <div className="w-full h-full object-cover">
                        {selectedChainData.icon}
                      </div>
                    </div>
                  </div>
                )}
                {isChainDropdownOpen ? (
                  <ChevronUp size={18} className="text-csw-gray-50" />
                ) : (
                  <ChevronDown size={18} className="text-csw-gray-50" />
                )}
              </div>

              {isChainDropdownOpen && (
                <div className="absolute top-full right-[0px] mt-csw-sm gap-csw-xxs z-[10] flex max-h-[400px] min-w-[200px] flex-col rounded-csw-lg bg-[#31343D] border border-[#444650] overflow-y-auto hide-scrollbar mt-[12px]">
                  <div className="p-csw-sm flex gap-[2px] flex-col">
                    <button
                      onClick={() => {
                        setSelectedChain(null);
                        setIsChainDropdownOpen(false);
                      }}
                      className={`gap-csw-md px-csw-md py-csw-sm rounded-csw-sm flex items-center hover:bg-csw-gray-700 transition-colors cursor-pointer ${
                        !selectedChain ? 'bg-csw-gray-600' : ''
                      }`}>
                      <div className="w-[28px] h-[28px] rounded-[10px] bg-[#CDC0AA] flex items-center justify-center">
                        <Target className="w-[14px] h-[14px]" />
                      </div>
                      <span className="font-medium text-sm leading-4 text-csw-gray-50">
                        All networks
                      </span>
                    </button>
                    {CHAINS.map((chain) => (
                      <button
                        key={chain.id}
                        onClick={() => {
                          setSelectedChain(chain.id);
                          setIsChainDropdownOpen(false);
                        }}
                        className={`gap-csw-md px-csw-md py-csw-sm rounded-csw-sm flex items-center hover:bg-csw-gray-700 transition-colors cursor-pointer ${
                          selectedChain === chain.id ? 'bg-csw-gray-700' : ''
                        }`}>
                        <div className="w-[28px] h-[28px] rounded-[10px] bg-csw-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                          <div className="w-full h-full object-cover">
                            {chain.icon}
                          </div>
                        </div>
                        <span className="font-medium text-sm text-csw-gray-50 text-start">
                          {chain.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto hide-scrollbar px-csw-2xl max-h-[450px] min-h-[200px] mt-[20px]">
            <div className="flex flex-col">
              {allTokens.length > 0 ? (
                allTokens
                  .filter((token) => {
                    if (selectedChain) {
                      return String(token.blockchain) === selectedChain;
                    }

                    return true;
                  })
                  .filter((token) => {
                    if (searchQuery) {
                      return token.symbol
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase());
                    }

                    return true;
                  })
                  .map((token) => (
                    <div
                      key={token.assetId}
                      onClick={() => {
                        onSelectToken(token, token.blockchain);
                        onClose();
                      }}
                      className="gap-[6px] px-[12px] py-[10px] flex cursor-pointer items-center rounded-csw-md transition-colors hover:bg-csw-gray-700">
                      {/* Token Icon */}
                      <div className="relative h-full">
                        {token.icon ? (
                          <img
                            src={token.icon}
                            alt={token.symbol}
                            className="w-[28px] h-[28px] rounded-full"
                          />
                        ) : (
                          <div className="w-[28px] h-[28px] rounded-full bg-csw-gray-700" />
                        )}
                        {(() => {
                          const chain = CHAINS.find(
                            (c) => c.id === token.blockchain,
                          );

                          return chain ? (
                            <div className="absolute right-[0px] bottom-[0px] w-[12px] h-[12px] rounded-[4px] border border-[#444650]">
                              {chain.icon}
                            </div>
                          ) : null;
                        })()}
                      </div>

                      <div className="gap-[6px] mr-auto flex flex-col">
                        <p className="text-sm text-csw-gray-50">
                          {(() => {
                            const chain = CHAINS.find(
                              (c) => c.id === token.blockchain,
                            );

                            return chain?.label ?? token.blockchain;
                          })()}
                        </p>
                        <p className="text-sm text-csw-gray-200 text-[12px]">
                          {token.symbol}
                        </p>
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
