import { Copy, ExternalLink, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Highlight, themes } from 'prism-react-renderer';
import { Button } from '../uikit/Button';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SAMPLE_CODE = `import { WidgetDeposit } from '@aurora-is-near/intents-swap-widget';

export function App() {
  const handleTransfer = async (args, type) => {
    // Handle transfer logic
  };

  return (
    <WidgetDeposit
      isLoading={false}
      providers={[]}
      makeTransfer={(args) => handleTransfer(args, 'deposit')}
      onMsg={async (msg) => {
        console.log('Widget message:', msg);
      }}
    />
  );
}`;

export function ExportModal({ isOpen, onClose }: ExportModalProps) {
  const [copyCodeFeedback, setCopyCodeFeedback] = useState(false);
  const [copyLinkFeedback, setCopyLinkFeedback] = useState(false);

  // Prevent scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';

      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen]);

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(SAMPLE_CODE);
    setCopyCodeFeedback(true);
    setTimeout(() => setCopyCodeFeedback(false), 2000);
  };

  const handleCopyConfigLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopyLinkFeedback(true);
    setTimeout(() => setCopyLinkFeedback(false), 2000);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed z-50 w-full h-full top-[0px] left-[0px]">
      <div
        className="flex items-center justify-center w-full h-full"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.70)',
          backdropFilter: 'blur(4px)',
        }}
        onClick={onClose}>
        <div
          className="relative z-50 mx-4 w-full max-w-[512px] rounded-csw-lg bg-csw-gray-900 overflow-hidden flex flex-col border border-csw-gray-800"
          onClick={(e) => e.stopPropagation()}>
          <div className="bg-csw-gray-900 px-csw-2xl pt-csw-2xl pb-csw-xl flex items-start justify-between gap-csw-lg border-b border-csw-gray-800 flex-shrink-0">
            <div className="flex flex-col gap-csw-md flex-1">
              <h2 className="font-semibold text-base leading-4 tracking-[-0.4px] text-csw-gray-50">
                Export code
              </h2>
              <div className="flex flex-col gap-0.5">
                <p className="font-medium text-sm leading-5 tracking-[-0.4px] text-csw-gray-200">
                  Learn more about how to install the code snippet in our
                </p>
                <a
                  href="https://docs.defuse.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm leading-4 tracking-[-0.4px] text-csw-accent-500 font-semibold underline hover:text-csw-accent-400 transition-colors">
                  developer quick guide
                  <ExternalLink className="w-[16px] h-[16px] ml-csw-xs" />
                </a>
              </div>
            </div>
            <button
              onClick={onClose}
              className="bg-csw-gray-950 p-csw-md rounded-csw-md hover:bg-csw-gray-800 transition-colors flex-shrink-0 cursor-pointer">
              <X className="w-csw-lg h-csw-lg text-csw-gray-50" />
            </button>
          </div>

          <div className="bg-csw-gray-800 px-csw-2xl py-csw-lg border-b border-csw-gray-800 flex-shrink-0">
            <p className="font-semibold text-sm leading-4 tracking-[-0.4px] text-csw-gray-50">
              React
            </p>
          </div>

          <div className="bg-csw-gray-900 flex-1 overflow-y-auto flex-shrink-0 h-[380px]">
            <div className="bg-csw-gray-950 px-csw-2xl py-csw-lg rounded-csw-md m-csw-lg h-full overflow-auto">
              <Highlight
                theme={themes.dracula}
                code={SAMPLE_CODE}
                language="tsx">
                {({ tokens, getLineProps, getTokenProps }) => (
                  <pre className="font-normal text-sm leading-[1.3em] text-csw-gray-50 m-0 p-0 table w-full">
                    {tokens.map((line, i) => {
                      const {
                        style: lineStyle,
                        className: lineClassName,
                        ...lineOtherProps
                      } = getLineProps({
                        line,
                      });

                      return (
                        <div
                          key={i}
                          className={`table-row ${lineClassName || ''}`}
                          style={lineStyle as React.CSSProperties}
                          {...lineOtherProps}>
                          <span className="table-cell text-right pr-csw-lg select-none opacity-50 text-csw-gray-400">
                            {i + 1}
                          </span>
                          <span className="table-cell">
                            {line.map((token, key) => {
                              const {
                                style: tokenStyle,
                                className: tokenClassName,
                                ...tokenOtherProps
                              } = getTokenProps({ token });

                              return (
                                <span
                                  key={key}
                                  className={tokenClassName || ''}
                                  style={tokenStyle as React.CSSProperties}
                                  {...tokenOtherProps}
                                />
                              );
                            })}
                          </span>
                        </div>
                      );
                    })}
                  </pre>
                )}
              </Highlight>
            </div>
          </div>

          <div className="bg-csw-gray-900 border-t border-csw-gray-800 px-csw-2xl py-csw-2xl flex flex-col gap-csw-lg flex-shrink-0">
            <Button
              variant="primary"
              size="sm"
              fluid
              icon={Copy}
              onClick={handleCopyCode}>
              {copyCodeFeedback ? 'Copied!' : 'Copy code'}
            </Button>
            <Button
              variant="outlined"
              size="sm"
              fluid
              icon={Copy}
              onClick={handleCopyConfigLink}>
              {copyLinkFeedback ? 'Copied!' : 'Copy configuration link'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
