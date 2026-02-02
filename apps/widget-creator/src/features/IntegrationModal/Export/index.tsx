import { useEffect, useState } from 'react';
import { Highlight, themes } from 'prism-react-renderer';
import { useLogin, usePrivy } from '@privy-io/react-auth';
import { AddW700 as Add } from '@material-symbols-svg/react-rounded/icons/add';
import { ContentCopyW700 as ContentCopy } from '@material-symbols-svg/react-rounded/icons/content-copy';
import { OpenInNewW700 as OpenInNew } from '@material-symbols-svg/react-rounded/icons/open-in-new';
import { LinkW700 as Link } from '@material-symbols-svg/react-rounded/icons/link';
import { Button as UIButton } from '@headlessui/react';

import { ApiKeySelect, Header } from '../components';

import { Button } from '@/uikit/Button';
import { useApiKeys } from '@/api/hooks';
import { useCreator } from '@/hooks/useCreatorConfig';
import { useWidgetConfig } from '@/hooks/useWidgetConfig';
import { useThemeConfig } from '@/hooks/useThemeConfig';
import { InfoBanner } from '@/components/InfoBanner';
import type { ApiKey } from '@/api/types';

const applyIndent = (code: string, spaces: number): string => {
  const pad = ' '.repeat(spaces);

  return code
    .split('\n')
    .map((line, index) => {
      if (!index) {
        return line;
      }

      return line ? pad + line : line;
    })
    .join('\n');
};

const stringifyAsJS = (value: unknown, indent: number): string => {
  const json = JSON.stringify(value, null, 2);

  // Remove quotes from valid JS identifiers
  const cleanJson = json.replace(/"([a-zA-Z_$][a-zA-Z0-9_$]*)":/g, '$1:');

  return applyIndent(cleanJson, indent);
};

type Props = {
  onClickApiKeys: () => void;
};

const useApiKeysState = () => {
  const { authenticated } = usePrivy();
  const { data: apiKeys, status } = useApiKeys();

  if (!authenticated) {
    return { state: 'unauthenticated' as const };
  }

  if (status === 'success') {
    if (apiKeys.length === 0) {
      return { state: 'no-api-keys' as const };
    }

    return {
      state: 'has-api-keys' as const,
      apiKeys: apiKeys as [ApiKey, ...ApiKey[]],
    };
  }

  return { state: status };
};

export const Export = ({ onClickApiKeys }: Props) => {
  const { login } = useLogin();
  const { dispatch, state } = useCreator();

  const apiKeysState = useApiKeysState();
  const { refetch: refetchApiKeys } = useApiKeys();

  const { widgetConfig } = useWidgetConfig();
  const { themeConfig } = useThemeConfig();

  const [copyCodeFeedback, setCopyCodeFeedback] = useState(false);
  const [copyLinkFeedback, setCopyLinkFeedback] = useState(false);

  const sampleCode = `import { WidgetSwap } from '@aurora-is-near/intents-swap-widget';

export function App() {
  return (
    <Widget
      config={${stringifyAsJS(widgetConfig, 6)}}
      theme={${stringifyAsJS(themeConfig, 6)}}
    />
  );
}`;

  const handleAppKeySelect = (appKey: string) => {
    dispatch({ type: 'SET_APP_KEY', payload: appKey });
  };

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(sampleCode);
    setCopyCodeFeedback(true);
    setTimeout(() => setCopyCodeFeedback(false), 2000);
  };

  const handleCopyConfigLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopyLinkFeedback(true);
    setTimeout(() => setCopyLinkFeedback(false), 2000);
  };

  useEffect(() => {
    if (apiKeysState.state === 'has-api-keys') {
      handleAppKeySelect(apiKeysState.apiKeys[0].widgetAppKey);
    }
  }, [apiKeysState.state]);

  return (
    <>
      <div className="px-csw-2xl pt-csw-2xl pb-csw-xl flex items-start justify-between gap-csw-lg border-b border-csw-gray-900">
        <Header
          title="Embed code"
          description={
            <>
              Add the Intents Widget to your app using an API key.
              <br className="hidden sm:block" />
              Your API key controls configuration, fees, and reporting for your
              integration.
            </>
          }
          warning={
            <>
              For more details, check out{' '}
              <a
                href="https://aurora-labs.gitbook.io/intents-swap-widget"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-csw-xxs underline">
                Developer Quick Start
                <OpenInNew size={12} className="ml-csw-xs -mb-[3px]" />
              </a>
            </>
          }
        />
      </div>

      <div className="flex flex-col gap-csw-2xl mt-csw-2xl">
        {(() => {
          switch (apiKeysState.state) {
            case 'unauthenticated':
              return (
                <InfoBanner
                  action="Log in"
                  title="API key required"
                  description="Log in to create an API key to activate the widget."
                  onClick={login}
                />
              );
            case 'no-api-keys':
              return (
                <InfoBanner
                  action="Go to API Keys"
                  title="API key required"
                  description="Create an API key to activate the widget, configure fees and track usage."
                  onClick={onClickApiKeys}
                />
              );
            case 'error':
              return (
                <InfoBanner
                  state="error"
                  action="Try again"
                  title="Unable to load API keys"
                  description="We couldn't load your API keys. Please try again."
                  onClick={refetchApiKeys}
                />
              );

            case 'has-api-keys': {
              const apiKeySelected = state.appKey ?? apiKeysState.apiKeys[0];

              return (
                <div className="flex flex-col gap-csw-md">
                  <header className="flex items-center justify-between">
                    <span className="text-csw-label-md text-csw-gray-50">
                      API key
                    </span>
                    <UIButton
                      className="flex items-center gap-csw-xs cursor-pointer transition-colors group"
                      onClick={onClickApiKeys}>
                      <Add
                        size={18}
                        className="text-csw-gray-300 group-hover:text-csw-gray-50 transition-colors"
                      />
                      <span className="text-csw-label-md text-csw-gray-300 group-hover:text-csw-gray-50 transition-colors">
                        Create API key
                      </span>
                    </UIButton>
                  </header>

                  {apiKeySelected ? (
                    <ApiKeySelect
                      keys={apiKeysState.apiKeys.map(
                        (apiKey) => apiKey.widgetAppKey,
                      )}
                      selected={apiKeySelected}
                      onChange={handleAppKeySelect}
                    />
                  ) : (
                    <div className="w-full rounded-csw-md bg-csw-gray-800 h-[44px] animate-pulse" />
                  )}
                </div>
              );
            }

            case 'pending':
            default:
              return <InfoBanner.Skeleton />;
          }
        })()}

        <div className="overflow-y-auto flex-shrink-1 min-h-[380px] pb-csw-2xl w-full">
          <div className="bg-csw-gray-900 px-csw-2xl py-csw-md rounded-csw-md h-full overflow-auto max-h-[50dvh]">
            <span className="text-csw-label-md text-csw-gray-50">React</span>
            <hr className="border-csw-gray-800 my-csw-md pb-csw-lg" />
            <Highlight theme={themes.dracula} code={sampleCode} language="tsx">
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
      </div>

      <div className="border-t border-csw-gray-900 py-csw-2xl flex items-center gap-csw-lg">
        <Button
          variant="primary"
          detail="dimmed"
          size="sm"
          fluid
          icon={Link}
          className="w-full"
          onClick={handleCopyConfigLink}>
          {copyLinkFeedback ? 'Copied!' : 'Copy config link'}
        </Button>
        <Button
          variant="primary"
          detail="accent"
          size="sm"
          fluid
          icon={ContentCopy}
          className="w-full"
          onClick={handleCopyCode}>
          {copyCodeFeedback ? 'Copied!' : 'Copy code'}
        </Button>
      </div>
    </>
  );
};
